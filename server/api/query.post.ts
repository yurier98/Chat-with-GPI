// original: https://github.com/RafalWilinski/cloudflare-rag/blob/2f4341bcf462c8f86001b601e59e60c25b1a6ea8/functions/api/stream.ts
import { consola } from 'consola'
import { z } from 'zod'
import { processUserQuery } from '../utils/query'
import type { RoleScopedChatInput } from '@cloudflare/workers-types'
import { serverSupabaseClient } from '#supabase/server'

const schema = z.object({
  messages: z.array(
    z.object({
      role: z.union([z.literal('system'), z.literal('user'), z.literal('assistant'), z.literal('tool')]),
      content: z.string(),
    }),
  ),
})

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)

  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw createError({ statusCode: 401, message: 'Usuario no autenticado' })
  }

  const body = await readBody(event)
  const { messages, model, conversationId } = body

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw createError({ statusCode: 400, message: 'Mensajes requeridos' })
  }

  // Crear o cargar conversación
  let currentConversationId = conversationId
  if (!currentConversationId) {
    // Crear nueva conversación
    const { data: newConversation, error: convError } = await supabase
      .from('conversations')
      .insert([{ 
        user_id: user.id,
        title: messages[messages.length - 1].content.slice(0, 50) + '...'
      }])
      .select()
      .single()

    if (convError) {
      console.error('Error creating conversation:', convError)
    } else {
      currentConversationId = newConversation.id
    }
  }

  // Guardar mensajes del usuario en la conversación
  const lastUserMessage = messages[messages.length - 1]
  if (currentConversationId && lastUserMessage.role === 'user') {
    await supabase
      .from('conversation_messages')
      .insert([{
        conversation_id: currentConversationId,
        role: 'user',
        content: lastUserMessage.content,
        metadata: {}
      }])
  }

  // Crear event stream
  const eventStream = createEventStream(event)
  const streamResponse = async (data: object) => {
    try {
      await eventStream.push(JSON.stringify(data))
    } catch (e) {
      console.error('Error pushing to event stream:', e)
    }
  }

  event.waitUntil((async () => {
    try {
      // Procesar la consulta con el historial completo
      const { messages: processedMessages, sources } = await processUserQuery(
        event,
        { messages },
        streamResponse
      )

      // Obtener la respuesta del asistente
      const assistantMessage = processedMessages.find(msg => msg.role === 'assistant')
      if (assistantMessage && currentConversationId) {
        // Preparar metadata con las fuentes utilizadas
        const metadata = {
          sources: sources || [],
          timestamp: new Date().toISOString(),
          model: '@cf/meta/llama-3.1-8b-instruct'
        }

        // Guardar respuesta del asistente con las fuentes en metadata
        await supabase
          .from('conversation_messages')
          .insert([{
            conversation_id: currentConversationId,
            role: 'assistant',
            content: assistantMessage.content,
            metadata: metadata
          }])
      }

      // Enviar el ID de conversación
      await streamResponse({ 
        conversationId: currentConversationId,
        completed: true
      })
    } catch (error) {
      console.error('Error in query stream:', error)
      await streamResponse({ 
        error: 'Error procesando la consulta',
        conversationId: currentConversationId 
      })
    } finally {
      await eventStream.close()
    }
  })())

  return eventStream.send()
})
