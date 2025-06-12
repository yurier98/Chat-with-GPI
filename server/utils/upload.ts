import { getDocumentProxy, extractText } from 'unpdf'
import { supabase } from '../utils/supabaseClient'

/**
 * Extrae texto de un archivo PDF dado.
 *
 * @param {File} file - El archivo PDF a procesar.
 * @returns {Promise<string>} Una promesa que resuelve con el contenido de texto extraído del PDF.
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  const result = await extractText(pdf, { mergePages: true })
  return Array.isArray(result.text) ? result.text.join(' ') : result.text
}

/**
 * Sube un archivo PDF al almacenamiento de Supabase.
 *
 * @param {File} file - El archivo PDF a subir.
 * @param {string} sessionId - El ID de la sesión para organizar los archivos en el almacenamiento.
 * @returns {Promise<string>} Una promesa que resuelve con la URL pública del archivo subido.
 */
export async function uploadPDF(file: File, sessionId: string): Promise<string> {
  const fileName = `${Date.now()}-${file.name}`
  const filePath = `${sessionId}/${fileName}`

  const { data, error } = await supabase.storage
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
 * @param {string} sessionId - El ID de la sesión asociada al documento.
 * @param {string} storageUrl - La URL de almacenamiento del documento.
 * @returns {Promise<Array<{ insertedId: string }>>} Una promesa que resuelve con un array que contiene el ID del documento insertado.
 */
export async function insertDocument(file: File, textContent: string, sessionId: string, storageUrl: string) {
  const row = {
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    text_content: textContent,
    session_id: sessionId,
    storage_url: storageUrl,
  }
  const { data, error } = await supabase.from('documents').insert(row).select('id')
  if (error) throw error
  return [{ insertedId: data[0].id }]
}

/**
 * Procesa chunks de texto, genera sus embeddings e los inserta junto con los chunks en las tablas de Supabase.
 *
 * @param {string[]} chunks - Un array de strings, donde cada string es un chunk de texto a procesar.
 * @param {string} sessionId - El ID de la sesión a la que pertenecen los chunks.
 * @param {string} documentId - El ID del documento al que pertenecen los chunks.
 * @param {(message: object) => Promise<void>} streamResponse - Una función para enviar actualizaciones de progreso al cliente.
 * @returns {Promise<void>} Una promesa que resuelve una vez que todos los chunks y sus vectores han sido procesados e insertados.
 */
export async function processVectors(
  chunks: string[],
  sessionId: string,
  documentId: string,
  streamResponse: (message: object) => Promise<void>,
) {
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
      const { data: chunkInsertResults, error: chunkError } = await supabase
        .from('document_chunks')
        .insert(
          chunkBatch.map(chunk => ({
            id: crypto.randomUUID(),
            text: chunk,
            session_id: sessionId,
            document_id: documentId,
          }))
        )
        .select('id')
      if (chunkError) throw chunkError
      const chunkIds = chunkInsertResults.map(result => result.id)

      // Insertar los vectores en Supabase
      await Promise.all(
        embeddingBatch.map((embedding, i) =>
          supabase.from('document_vectors').insert({
            document_id: documentId,
            embedding,
            metadata: {
              sessionId,
              documentId,
              chunkId: chunkIds[i],
              text: chunkBatch[i],
            },
          })
        )
      )

      progress += (chunkBatch.length / chunks.length) * 100
      await streamResponse({
        message: `Embedding... (${progress.toFixed(2)}%)`,
        progress,
      })
    }),
  )
}
