import type { RoleScopedChatInput } from '@cloudflare/workers-types'
import { serverSupabaseClient } from '#supabase/server'
import { SYSTEM_PROMPT, QUERY_PROMPT } from './prompts'
import type { H3Event } from 'h3'

// Definiciones de tipos para DocumentChunk y VectorizeMatches
interface DocumentChunk {
  id: string;
  text: string;
  session_id: string;
  document_id: string;
}

interface VectorizeMatches {
  matches: Array<{
    id: string;
    score: number;
  }>;
}

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
    .slice(1, 6)

  return queries
}

type DocumentChunkResult = DocumentChunk & { rank: number }

async function searchDocumentChunks(supabase: any, searchTerms: string[], sessionId: string) {
  const results: DocumentChunkResult[] = []

  for (const term of searchTerms.filter(Boolean)) {
    const { data, error } = await supabase
      .from('document_chunks')
      .select('*')
      .ilike('text', `%${term}%`)
      .eq('session_id', sessionId)
      .limit(5)

    if (error) throw error
    results.push(...data.map((row: DocumentChunk) => ({ ...row, rank: 1 })))
  }
  return results.slice(0, 10)
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
 * @param {string} sessionId - El ID de la sesión, utilizado para filtrar los resultados de la búsqueda por sesión.
 * @returns {Promise<Array<{ matches: Array<{ id: string; score: number }> }>>} Un array de promesas, donde cada promesa resuelve a un objeto con una propiedad `matches`. `matches` es un array de objetos, cada uno con un `id` (chunk_id) y un `score` (similitud).
 */
async function queryVectorIndex(supabase: any, queries: string[], sessionId: string) {
  // Genera los embeddings para las queries (puedes seguir usando tu modelo preferido)
  const queryVectors = await Promise.all(
    queries.map(q => hubAI().run('@cf/baai/bge-large-en-v1.5', { text: [q] })),
  )

  // Para cada embedding, busca los chunks más similares en Supabase
  const allResults = await Promise.all(
    queryVectors.map(async (qv) => {
      const { data, error } = await supabase.rpc('match_document_vectors', {
        query_embedding: qv.data[0],
        match_count: 5,
        session_id: sessionId,
      })
      if (error) throw error
      // Adaptar el formato para que sea compatible con el resto del código
      return {
        matches: data.map((row: any) => ({
          id: row.chunk_id,
          score: row.similarity,
        })),
      }
    }),
  )

  return allResults
}

async function getRelevantDocuments(supabase: any, ids: string[]) {
  const { data, error } = await supabase
    .from('document_chunks')
    .select('text, id')
    .in('id', ids)
  if (error) throw error
  return data
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
  { sessionId, messages }: { sessionId: string, messages: RoleScopedChatInput[] },
  streamResponse: (message: object) => Promise<void>
) {
  const supabase = await serverSupabaseClient(event)
  messages.unshift({ role: 'system', content: SYSTEM_PROMPT })
  const lastMessage = messages[messages.length - 1]
  const query = lastMessage.content

  await streamResponse({ message: 'Reescritura de mensaje a consultas...' })

  const queries = await rewriteToQueries(query)
  const queryingVectorIndexMsg = {
    message: 'Consulta de índice vectorial y búsqueda de texto completo...',
    queries,
  }
  await streamResponse(queryingVectorIndexMsg)

  const [fullTextSearchResults, vectorIndexResults] = await Promise.all([
    searchDocumentChunks(supabase, queries, sessionId),
    queryVectorIndex(supabase, queries, sessionId),
  ])

  // Perform reciprocal rank fusion on fullTextSearchResults and vectorIndexResults
  // Sort in descending order because higher scores are better in reciprocal rank fusion
  const mergedResults = performReciprocalRankFusion(fullTextSearchResults, vectorIndexResults).sort(
    (a, b) => b.score - a.score,
  )

  const relevantDocs = await getRelevantDocuments(supabase, mergedResults.map(r => r.id).slice(0, 10))

  const relevantTexts = relevantDocs
    .map((doc: { text: string }, index: number) => `[${index + 1}]: ${doc.text}`)
    .join('\n\n')

  const relevantDocsMsg = {
    message: 'Encontrar documentos relevantes, generar respuesta...',
    relevantContext: relevantDocs,
    queries,
  }
  await streamResponse(relevantDocsMsg)

  messages.push({
    role: 'assistant',
    content: `Las siguientes consultas fueron realizadas:\n${queries.join(
      '\n',
    )}\n\nContexto relevante de los documentos adjuntos:\n${relevantTexts}`,
  })

  return { messages }
}
