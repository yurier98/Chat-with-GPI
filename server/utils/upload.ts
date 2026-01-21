import type { H3Event } from 'h3'
import { getDocumentProxy, extractText } from 'unpdf'
import { serverSupabaseClient } from '#supabase/server'
import type { Document, DocumentChunk, DocumentVector } from '~/types'

/**
 * Extrae texto de un archivo PDF usando unpdf.
 *
 * @param {File} file - El archivo PDF del cual extraer texto.
 * @returns {Promise<string>} Una promesa que resuelve con el texto extraído del PDF.
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const document = await getDocumentProxy(new Uint8Array(arrayBuffer))
    const result = await extractText(document, { mergePages: true })
    return Array.isArray(result.text) ? result.text.join(' ') : result.text
  } catch (error) {
    console.error('Error extrayendo texto del PDF:', error)
    throw new Error('No se pudo extraer texto del archivo PDF')
  }
}

/**
 * Sube un archivo PDF al almacenamiento de Supabase.
 *
 * @param {File} file - El archivo PDF a subir.
 * @param {H3Event} event - El evento H3 para obtener el cliente de Supabase autenticado.
 * @returns {Promise<string>} Una promesa que resuelve con la URL pública del archivo subido.
 */
export async function uploadPDF(file: File, event: H3Event): Promise<string> {
  const supabase = await serverSupabaseClient(event)
  
  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Usuario no autenticado')
  }

  // Sanitizar el nombre del archivo: eliminar espacios y caracteres especiales
  const sanitizedName = file.name
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Reemplazar caracteres especiales con guiones bajos
    .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
  const fileName = `${Date.now()}-${sanitizedName}`
  // Usar solo el ID del usuario en la ruta del archivo
  const filePath = `${user.id}/${fileName}`

  const { error } = await supabase.storage
    .from('documents')
    .upload(filePath, file, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (error)
    throw error

  // Obtener la URL pública del archivo
  const { data: { publicUrl } } = supabase.storage
    .from('documents')
    .getPublicUrl(filePath)

  return publicUrl
}

/**
 * Inserta una entrada de documento en la tabla `documents` de Supabase.
 *
 * @param {File} file - El objeto File del documento.
 * @param {string} textContent - El contenido de texto extraído del documento.
 * @param {string} storageUrl - La URL de almacenamiento del documento.
 * @param {H3Event} event - El evento H3 para obtener el cliente de Supabase autenticado.
 * @returns {Promise<Array<{ insertedId: string }>>} Una promesa que resuelve con un array que contiene el ID del documento insertado.
 */
export async function insertDocument(
  file: File,
  textContent: string,
  storageUrl: string,
  event: H3Event,
) {
  const supabase = await serverSupabaseClient<{
    documents: Document
    document_chunks: DocumentChunk
    document_vectors: DocumentVector
  }>(event)
  
  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Usuario no autenticado')
  }

  const row: Document = {
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    text_content: textContent,
    storage_url: storageUrl,
    user_id: user.id,
  }

  const { data, error } = await supabase
    .from('documents')
    .insert([row])
    .select('id')
    .single()

  if (error) throw error
  return [{ insertedId: data.id }]
}

/**
 * Procesa chunks de texto, genera sus embeddings e los inserta junto con los chunks en las tablas de Supabase.
 *
 * @param {string[]} chunks - Un array de strings, donde cada string es un chunk de texto a procesar.
 * @param {string} documentId - El ID del documento al que pertenecen los chunks.
 * @param {(message: object) => Promise<void>} streamResponse - Una función para enviar actualizaciones de progreso al cliente.
 * @param {H3Event} event - El evento H3 para obtener el cliente de Supabase autenticado.
 * @returns {Promise<void>} Una promesa que resuelve una vez que todos los chunks y sus vectores han sido procesados e insertados.
 */
export async function processVectors(
  chunks: string[],
  documentId: string,
  streamResponse: (message: object) => Promise<void>,
  event: H3Event,
) {
  const supabase = await serverSupabaseClient<{
    documents: Document
    document_chunks: DocumentChunk
    document_vectors: DocumentVector
  }>(event)
  
  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Usuario no autenticado')
  }

  const chunkSize = 10
  let progress = 0

  await Promise.all(
    Array.from({ length: Math.ceil(chunks.length / chunkSize) }, async (_, index) => {
      const start = index * chunkSize
      const chunkBatch = chunks.slice(start, start + chunkSize)

      // Generate embeddings for the current batch
      const embeddingResult = await hubAI().run('@cf/baai/bge-large-en-v1.5', {
        text: chunkBatch,
      })
      const embeddingBatch: number[][] = embeddingResult.data

      // Insert chunks into the database
      const chunksToInsert: DocumentChunk[] = chunkBatch.map(chunk => ({
        id: crypto.randomUUID(),
        text: chunk,
        document_id: documentId,
      }))

      const { data: chunkInsertResults, error: chunkError } = await supabase
        .from('document_chunks')
        .insert(chunksToInsert)
        .select('id')

      if (chunkError) throw chunkError
      const chunkIds = chunkInsertResults.map(result => result.id)

      // Insertar los vectores en Supabase
      const vectorsToInsert: DocumentVector[] = embeddingBatch.map((embedding, i) => ({
        document_id: documentId,
        chunk_id: chunkIds[i],
        embedding,
        metadata: {
          documentId,
          chunkId: chunkIds[i],
          text: chunkBatch[i],
          userId: user.id,
        },
      }))

      await Promise.all(
        vectorsToInsert.map(vector =>
          supabase.from('document_vectors').insert(vector),
        ),
      )

      progress += (chunkBatch.length / chunks.length) * 100
      await streamResponse({
        message: `Embedding... (${progress.toFixed(2)}%)`,
        progress,
      })
    }),
  )
}
