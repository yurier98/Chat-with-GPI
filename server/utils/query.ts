import type { RoleScopedChatInput } from '@cloudflare/workers-types'
import type { H3Event } from 'h3'
import { createError } from 'h3'
import { SYSTEM_PROMPT, QUERY_PROMPT } from './prompts'
import { serverSupabaseClient } from '#supabase/server'
import type { DocumentChunk, DocumentChunkResult, VectorizeMatches } from '~/types'

/**
 * Convierte un mensaje del usuario en múltiples consultas de búsqueda optimizadas
 *
 * @param content - El mensaje del usuario a procesar
 * @returns Un array de consultas generadas por el modelo LLM
 *
 * Esta función:
 * 1. Utiliza un LLM para generar consultas alternativas basadas en el mensaje
 * 2. Procesa la respuesta para extraer las consultas más relevantes
 * 3. Devuelve hasta 5 consultas diferentes para maximizar la recuperación de información
 */
async function rewriteToQueries(content: string): Promise<string[]> {
  const prompt = QUERY_PROMPT(content)
  const { response } = await hubAI().run('@cf/meta/llama-3.1-8b-instruct', { prompt }) as { response: string }

  const regex = /^\d+\.\s*"|"$/gm
  const queries = response
    .replace(regex, '')
    .split('\n')
    .filter(query => query.trim() !== '')
    .slice(0, 5)

  return queries
}

// Función para buscar chunks de documentos usando términos de búsqueda
async function searchDocumentChunks(supabase: any, searchTerms: string[], userId: string) {
  const results: DocumentChunkResult[] = []

  for (const term of searchTerms.filter(Boolean)) {
    const { data, error } = await supabase
      .from('document_chunks')
      .select(`
        *,
        documents!inner(user_id)
      `)
      .ilike('text', `%${term}%`)
      .eq('documents.user_id', userId)
      .limit(5)

    if (error) throw error
    results.push(...data.map((row: DocumentChunk) => ({ ...row, rank: 1 })))
  }
  return results.slice(0, 10)
}

// Función para buscar chunks usando embeddings vectoriales
async function searchDocumentVectors(supabase: any, queryEmbedding: number[], userId: string) {
  try {
    const { data, error } = await supabase.rpc('match_document_vectors', {
      query_embedding: queryEmbedding,
      match_count: 5,
      user_id: userId,
    })

    if (error) {
      console.error('Error en búsqueda vectorial:', error)
      return []
    }

    return data || []
  }
  catch (error) {
    console.error('Error en búsqueda vectorial:', error)
    return []
  }
}

// Función para obtener documentos relevantes basados en IDs de chunks, manteniendo el orden
async function getRelevantDocuments(supabase: any, ids: string[], userId: string) {
  console.log('getRelevantDocuments - IDs recibidos:', ids)
  console.log('getRelevantDocuments - userId:', userId)

  const { data, error } = await supabase
    .from('document_chunks')
    .select(`
      text,
      id,
      documents!inner(
        id,
        name,
        user_id
      )
    `)
    .in('id', ids)
    .eq('documents.user_id', userId)

  if (error) {
    console.error('Error en getRelevantDocuments:', error)
    throw error
  }

  console.log('getRelevantDocuments - documentos encontrados:', data?.length || 0)

  // Mantener el orden de relevancia basado en el orden de los IDs
  const orderedData = ids.map(id => data?.find((chunk: any) => chunk.id === id)).filter(Boolean)

  // Diversificar por documento para asegurar variedad
  const diversifiedData = diversifyChunksByDocument(orderedData, 4)

  // Log para debugging: mostrar qué documentos se están usando
  const documentNames = diversifiedData.map(chunk => chunk.documents?.name).filter(Boolean)
  const uniqueDocuments = [...new Set(documentNames)]
  console.log('Documentos utilizados después de diversificación:', uniqueDocuments)
  console.log('Total de documentos únicos:', uniqueDocuments.length)
  console.log('Distribución final por documento:',
    uniqueDocuments.map(docName => ({
      documento: docName,
      chunks: documentNames.filter(name => name === docName).length,
    })),
  )

  return diversifiedData
}

// Función para diversificar chunks por documento
function diversifyChunksByDocument(chunks: any[], maxPerDocument: number = 4): any[] {
  const documentGroups: { [documentName: string]: any[] } = {}
  const diversifiedChunks: any[] = []

  // Agrupar chunks por documento
  chunks.forEach(chunk => {
    const docName = chunk.documents?.name || 'Documento desconocido'
    if (!documentGroups[docName]) {
      documentGroups[docName] = []
    }
    documentGroups[docName].push(chunk)
  })

  console.log('Documentos encontrados para diversificación:', Object.keys(documentGroups))

  // Tomar chunks de cada documento de forma intercalada
  const documentNames = Object.keys(documentGroups)
  let maxRounds = Math.max(...Object.values(documentGroups).map(group => group.length))

  for (let round = 0; round < maxRounds && diversifiedChunks.length < 15; round++) {
    for (const docName of documentNames) {
      const docChunks = documentGroups[docName]
      const currentDocCount = diversifiedChunks.filter(chunk =>
        chunk.documents?.name === docName
      ).length

      if (round < docChunks.length && currentDocCount < maxPerDocument) {
        diversifiedChunks.push(docChunks[round])
      }

      if (diversifiedChunks.length >= 15) break
    }
  }

  console.log('Chunks diversificados por documento:',
    documentNames.map(docName => ({
      documento: docName,
      chunks: diversifiedChunks.filter(chunk => chunk.documents?.name === docName).length,
    }))
  )

  return diversifiedChunks
}

/**
 * Realiza la fusión de rango recíproco (RRF) en los resultados de búsqueda de texto completo y de búsqueda vectorial.
 * Este método combina y clasifica los resultados de múltiples fuentes de búsqueda para mejorar la relevancia general.
 *
 * @param {DocumentChunk[]} fullTextResults - Un array de objetos que representan los chunks de documentos encontrados por la búsqueda de texto completo. Cada objeto debe tener una propiedad `id`.
 * @param {VectorizeMatches[]} vectorResults - Un array de objetos que contienen los resultados de la búsqueda vectorial. Cada objeto debe tener una propiedad `matches`, que es un array de objetos con `id` y `score`.
 * @returns {Array<{ id: string; score: number }>} Un array de objetos, donde cada objeto tiene un `id` (identificador del chunk) y un `score` (puntuación de fusión de rango recíproco), ordenados en orden descendente por `score`.
 */
function performReciprocalRankFusion(
  fullTextResults: DocumentChunk[],
  vectorResults: VectorizeMatches[],
): { id: string, score: number }[] {
  const k = 60 // Constante para la fusión, puede ajustarse
  const scores: { [id: string]: number } = {}

  // Procesa resultados de búsqueda de texto completo
  fullTextResults.forEach((result, index) => {
    const score = 1 / (k + index)
    scores[result.id] = (scores[result.id] || 0) + score
  })

  // Procesa resultados de búsqueda vectorial
  vectorResults.forEach((result) => {
    result.matches.forEach((match: { id: string, score: number }, index: number) => {
      const score = 1 / (k + index)
      scores[match.id] = (scores[match.id] || 0) + score
    })
  })

  // Ordena y devuelve los resultados fusionados
  return Object.entries(scores)
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score)
}

/**
 * Consulta un índice vectorial en Supabase para encontrar los chunks más similares a las queries dadas.
 *
 * @param {string[]} queries - Un array de strings, donde cada string es una query para la cual se generará un embedding y se buscarán coincidencias.
 * @param {string} userId - El ID del usuario, utilizado para filtrar los resultados por usuario.
 * @returns {Promise<Array<{ matches: Array<{ id: string; score: number }> }>>} Un array de promesas, donde cada promesa resuelve a un objeto con una propiedad `matches`. `matches` es un array de objetos, cada uno con un `id` (chunk_id) y un `score` (similitud).
 */
async function queryVectorIndex(supabase: any, queries: string[], userId: string): Promise<VectorizeMatches[]> {
  try {
    // Genera los embeddings para las queries con manejo de errores
    const queryVectors = await Promise.allSettled(
      queries.map(async (q) => {
        try {
          const result = await hubAI().run('@cf/baai/bge-large-en-v1.5', { text: [q] })
          return result
        }
        catch (error) {
          console.error(`Error generando embedding para query "${q}":`, error)
          return null
        }
      }),
    )

    // Filtra los resultados exitosos
    const successfulVectors = queryVectors
      .map((result, index) => result.status === 'fulfilled' && result.value ? { vector: result.value, query: queries[index] } : null)
      .filter((item): item is { vector: any, query: string } => item !== null)

    if (successfulVectors.length === 0) {
      console.warn('No se pudieron generar embeddings, usando solo búsqueda de texto completo')
      return []
    }

    // Para cada embedding exitoso, busca los chunks más similares en Supabase
    const allResults = await Promise.allSettled(
      successfulVectors.map(async ({ vector, query }) => {
        try {
          const { data, error } = await supabase.rpc('match_document_vectors', {
            query_embedding: vector.data[0],
            match_count: 5,
            user_id: userId,
          })

          if (error) {
            console.error(`Error en búsqueda vectorial para query "${query}":`, error)
            return null
          }

          // Adaptar el formato para que sea compatible con el resto del código
          return {
            matches: data.map((row: any) => ({
              id: row.chunk_id,
              score: row.similarity,
            })),
          }
        }
        catch (error) {
          console.error(`Error procesando búsqueda vectorial para query "${query}":`, error)
          return null
        }
      }),
    )

    // Filtra los resultados exitosos
    return allResults
      .map(result => result.status === 'fulfilled' && result.value ? result.value : null)
      .filter((item): item is VectorizeMatches => item !== null)
  }
  catch (error) {
    console.error('Error general en queryVectorIndex:', error)
    return []
  }
}

/**
 * Búsqueda mejorada de chunks usando FTS de Postgres en Supabase.
 */
async function searchDocumentChunksFTS(
  supabase: any,
  searchTerms: string[],
  userId: string,
): Promise<DocumentChunk[]> {
  const results: DocumentChunk[] = []

  for (const term of searchTerms.filter(Boolean)) {
    // Sanitiza el término para FTS
    const sanitizedTerm = term.replace(/[^\w\s]/g, '').trim()

    // Realiza la búsqueda FTS con ranking
    const { data, error } = await supabase
      .from('document_chunks')
      .select(`
        *,
        ts_rank_cd(to_tsvector('spanish', text), plainto_tsquery('spanish', $1)) AS rank,
        documents!inner(user_id)
      `, { count: 'exact' })
      .textSearch('text', sanitizedTerm, {
        type: 'plain',
        config: 'spanish', // O 'english' según el idioma de tus documentos
      })
      .eq('documents.user_id', userId)
      .order('rank', { ascending: false })
      .limit(5)

    if (error) throw error
    results.push(...(data ?? []))
  }

  // Ordena por rank y limita el total
  return results
    .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))
    .slice(0, 10)
}

/**
 * Procesa la consulta de un usuario realizando una serie de pasos:
 * 1. Reescribe el mensaje del usuario en múltiples queries.
 * 2. Realiza búsquedas de texto completo y de índice vectorial utilizando las queries.
 * 3. Fusiona los resultados de ambas búsquedas utilizando Reciprocal Rank Fusion.
 * 4. Recupera los documentos más relevantes basados en los resultados fusionados.
 * 5. Prepara el contexto relevante y lo añade a los mensajes para la generación de la respuesta.
 *
 * @param {object} params - Los parámetros de la función.
 * @param {string} params.sessionId - El ID de la sesión del usuario.
 * @param {RoleScopedChatInput[]} params.messages - Un array de objetos de mensajes de chat, incluyendo el mensaje actual del usuario.
 * @param {(message: object) => Promise<void>} streamResponse - Una función para enviar actualizaciones de estado y progreso al cliente a través de un stream.
 * @returns {Promise<{ messages: RoleScopedChatInput[] }>} Una promesa que resuelve con un objeto que contiene el array de mensajes actualizado, incluyendo el contexto relevante.
 */
export async function processUserQuery(
  event: H3Event,
  { messages }: { messages: RoleScopedChatInput[] },
  streamResponse: (data: any) => Promise<void>,
) {
  const supabase = await serverSupabaseClient(event)

  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw createError({ statusCode: 401, message: 'Usuario no autenticado' })
  }

  const lastMessage = messages[messages.length - 1]
  const userQuery = lastMessage.content

  try {
    // Enviar respuesta inicial para indicar que estamos procesando
    await streamResponse({
      message: 'Procesando consulta...',
      processing: true,
    })

    // Paso 1: Generar queries semánticas alternativas
    await streamResponse({
      message: 'Generando consultas de búsqueda semántica...',
    })

    const semanticQueries = await rewriteToQueries(userQuery)
    console.log('Queries semánticas generadas:', semanticQueries)

    // Enviar las queries generadas al cliente
    await streamResponse({
      message: 'Buscando en documentos...',
      queries: semanticQueries,
    })

    // Paso 2: Realizar búsquedas usando las queries semánticas
    const allQueries = [userQuery, ...semanticQueries]

    // Búsqueda híbrida: vectorial + texto para todas las queries
    const [vectorResults, textResults] = await Promise.all([
      queryVectorIndex(supabase, allQueries, user.id),
      searchDocumentChunksFTS(supabase, allQueries, user.id),
    ])

    console.log('Resultados vectoriales:', vectorResults.length)
    console.log('Resultados de texto:', textResults.length)

    // Usar Reciprocal Rank Fusion para combinar y ordenar resultados por relevancia
    const fusedResults = performReciprocalRankFusion(textResults, vectorResults)
    console.log('Resultados fusionados:', fusedResults.length)

    // Tomar los top 15 resultados más relevantes para mayor diversidad
    const topChunkIds = fusedResults.slice(0, 15).map(result => result.id)
    console.log('Top chunk IDs seleccionados:', topChunkIds)
    console.log('Scores de relevancia:', fusedResults.slice(0, 15).map(r => ({ id: r.id, score: r.score })))

    const relevantChunks = await getRelevantDocuments(supabase, topChunkIds, user.id)
    const contextText = relevantChunks.map(chunk => chunk.text).join('\n\n')

    // Construir el prompt con contexto
    const systemPrompt = SYSTEM_PROMPT
    const queryPrompt = `Dado el siguiente contexto recuperado:\n\n${contextText}\n\nResponde a la siguiente pregunta: ${userQuery}`

    // Enviar información sobre el contexto encontrado
    await streamResponse({
      message: 'Generando respuesta basada en documentos relevantes...',
      queries: semanticQueries,
      relevantContext: relevantChunks.map((chunk: any) => ({
        content: chunk.text,
        document_name: chunk.documents?.name || 'Documento desconocido',
        document_id: chunk.documents?.id || null,
        similarity: 0.8, // Placeholder, ya que no tenemos el score exacto aquí
      })),
    })

    // Generar respuesta usando el modelo de chat con streaming
    console.log('Llamando al modelo de IA...')

    let aiResponse: { response: string }
    try {
      aiResponse = await hubAI().run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: queryPrompt },
        ],
        stream: false, // Cloudflare AI no soporta streaming nativo, así que simularemos
      }) as { response: string }

      const fullResponse = aiResponse.response
      console.log('Respuesta del modelo recibida, longitud:', fullResponse?.length || 0)

      // Simular streaming enviando la respuesta en chunks
      if (fullResponse) {
        const words = fullResponse.split(' ')
        let currentResponse = ''
        const wordsPerChunk = 5 // Palabras por chunk
        const delayBetweenChunks = 80 // ms entre chunks

        for (let i = 0; i < words.length; i++) {
          currentResponse += (i > 0 ? ' ' : '') + words[i]

          // Enviar chunk cada N palabras o al final
          if (i % wordsPerChunk === 0 || i === words.length - 1) {
            await streamResponse({
              responseChunk: currentResponse,
              isComplete: i === words.length - 1,
            })

            // Pequeña pausa para simular streaming real
            if (i < words.length - 1) {
              await new Promise(resolve => setTimeout(resolve, delayBetweenChunks))
            }
          }
        }
      }
    }
    catch (error) {
      console.error('Error llamando al modelo de IA:', error)
      await streamResponse({
        error: 'Error generando respuesta. Por favor, intenta de nuevo.',
      })
      throw error
    }

    // Obtener la respuesta completa para guardar en la base de datos
    const finalResponse = aiResponse.response

    // Agregar la respuesta del asistente a los mensajes
    const updatedMessages = [
      ...messages,
      { role: 'assistant', content: finalResponse },
    ]

    // Preparar las fuentes utilizadas para guardar en metadata
    const sources = relevantChunks.map((chunk: any) => ({
      chunkId: chunk.id,
      documentId: chunk.documents?.id || null,
      documentName: chunk.documents?.name || 'Documento desconocido',
      text: chunk.text.substring(0, 500) + (chunk.text.length > 500 ? '...' : ''), // Limitar texto para no sobrecargar metadata
    }))

    return {
      messages: updatedMessages,
      sources,
    }
  }
  catch (error) {
    console.error('Error procesando consulta:', error)
    await streamResponse({
      error: 'Error procesando la consulta. Por favor, intenta de nuevo.',
    })
    throw error
  }
}
