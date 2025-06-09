import { getDocumentProxy, extractText } from 'unpdf'
import { supabase } from '../utils/supabaseClient'

export async function extractTextFromPDF(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  const result = await extractText(pdf, { mergePages: true })
  return Array.isArray(result.text) ? result.text.join(' ') : result.text
}

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
