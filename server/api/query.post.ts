// original: https://github.com/RafalWilinski/cloudflare-rag/blob/2f4341bcf462c8f86001b601e59e60c25b1a6ea8/functions/api/stream.ts
import { consola } from 'consola'
import { z } from 'zod'
import { processUserQuery } from '../utils/query'

const schema = z.object({
  messages: z.array(
    z.object({
      role: z.union([z.literal('system'), z.literal('user'), z.literal('assistant'), z.literal('tool')]),
      content: z.string(),
    }),
  ),
  sessionId: z.string(),
})

export default defineEventHandler(async (event) => {
  const { messages, sessionId } = await readValidatedBody(event, schema.parse)
  const eventStream = createEventStream(event)
  const streamResponse = (data: object) => eventStream.push(JSON.stringify(data))

  event.waitUntil((async () => {
    try {
      const params = await processUserQuery({ messages, sessionId }, streamResponse)
      const result = await hubAI().run('@cf/meta/llama-3.1-8b-instruct', { messages: params.messages, stream: true }) as ReadableStream
      // Verifica si el resultado es iterable
      const asyncIterator = (result as any)[Symbol.asyncIterator]
      if (typeof asyncIterator === 'function') {
        for await (const chunk of result as any) {
          const chunkString = new TextDecoder().decode(chunk).slice(5)
          await eventStream.push(chunkString)
        }
      } else {
        // Si no es iterable, simplemente termina el stream
        await eventStream.close()
      }
    } catch (error) {
      consola.error(error)
      await streamResponse({ error: (error as Error).message })
    } finally {
      await eventStream.close()
    }
  })())

  return eventStream.send()
})
