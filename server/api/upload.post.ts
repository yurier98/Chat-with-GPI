// original: https://github.com/RafalWilinski/cloudflare-rag/blob/2f4341bcf462c8f86001b601e59e60c25b1a6ea8/functions/api/upload.ts

import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { uploadPDF, extractTextFromPDF, insertDocument, processVectors } from '../utils/upload'

export default defineEventHandler(async (event) => {
  const formData = await readFormData(event)
  const sessionId = formData.get('sessionId') as string
  const file = formData.get('file') as File

  if (!sessionId) throw createError({ statusCode: 400, message: 'Falta sessionId' })
  if (!file || !file.size) throw createError({ statusCode: 400, message: 'No se proporcionó ningún archivo' })

  // validación manual del archivo PDF
  if (file.type !== 'application/pdf') {
    throw createError({ statusCode: 400, message: 'Solo se permiten archivos PDF' })
  }
  if (file.size > 8 * 1024 * 1024) {
    throw createError({ statusCode: 400, message: 'El tamaño del archivo debe ser menor que 8 MB' })
  }

  // evitar subir archivos a sesiones de ejemplo
  const exampleSessionIds = useExampleSessions()
  if (exampleSessionIds.some(({ id }) => id === sessionId)) {
    throw createError({ statusCode: 400, message: 'Subir archivos no disponible en sesiones de ejemplo' })
  }

  // crear un stream y devolverlo
  const eventStream = createEventStream(event)
  const streamResponse = (data: object) => eventStream.push(JSON.stringify(data))

  // evitar que el trabajador sea eliminado mientras se procesa
  event.waitUntil((async () => {
    try {
      // subir archivo, extraer texto y insertar documento
      const [storageUrl, textContent] = await Promise.all([
        uploadPDF(file, sessionId),
        extractTextFromPDF(file),
      ])
      await streamResponse({ message: 'Extrayendo texto del PDF' })

      const insertResult = await insertDocument(file, textContent, sessionId, storageUrl)
      const documentId = insertResult[0].insertedId

      // dividir el texto en trozos
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 100,
      })
      const chunks = await splitter.splitText(textContent)
      await streamResponse({ message: 'Dividiendo el texto en trozos' })

      // generar y almacenar vectores para cada trozo
      await processVectors(chunks, sessionId, documentId, streamResponse)
      await streamResponse({ message: 'Insertando vectores', chunks: chunks.length })
    }
    catch (error) {
      await streamResponse({ error: (error as Error).message })
    }
    finally {
      eventStream.close()
    }
  })())

  return eventStream.send()
})
