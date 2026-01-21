import { serverSupabaseClient } from '#supabase/server'
import { processUserQuery } from '../../utils/query'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  const chatId = getRouterParam(event, 'id')

  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw createError({ statusCode: 401, message: 'Usuario no autenticado' })
  }

  if (!chatId) {
    throw createError({ statusCode: 400, message: 'ID de chat requerido' })
  }

  const body = await readBody(event)
  const { messages, model } = body

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw createError({ statusCode: 400, message: 'Mensajes requeridos' })
  }

  // Verificar que el chat pertenece al usuario
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id, user_id')
    .eq('id', chatId)
    .eq('user_id', user.id)
    .single()

  if (convError || !conversation) {
    throw createError({ statusCode: 404, message: 'Conversación no encontrada' })
  }

  // Guardar el mensaje del usuario
  const lastUserMessage = messages[messages.length - 1]
  if (lastUserMessage.role === 'user') {
    await supabase
      .from('conversation_messages')
      .insert([{
        conversation_id: chatId,
        role: 'user',
        content: lastUserMessage.content,
        metadata: {}
      }])
  }

  // Usar streamText de ai-sdk con un modelo personalizado
  const { streamText } = await import('ai')

  // Variables para capturar datos adicionales
  let assistantResponse = ''
  let capturedSources: any[] = []

  // Función para capturar la respuesta del processUserQuery
  const captureResponse = async (data: any) => {
    if (data.response !== undefined) {
      assistantResponse = data.response
    }
    if (data.sources) {
      capturedSources = data.sources
    }
  }

  // Modelo personalizado que usa nuestro processUserQuery
  const customModel = {
    modelId: '@cf/meta/llama-3.1-8b-instruct',
    provider: 'custom' as const,

    async doStream() {
      return {
        stream: (async function* () {
          try {
            // Procesar la consulta usando nuestro sistema existente
            await processUserQuery(
              event,
              { messages },
              captureResponse
            )

            // Simular streaming enviando la respuesta en chunks
            const chunkSize = 20
            for (let i = 0; i < assistantResponse.length; i += chunkSize) {
              const chunk = assistantResponse.slice(i, i + chunkSize)
              yield {
                type: 'text-delta' as const,
                textDelta: chunk,
              }
              // Pequeña pausa para simular streaming real
              await new Promise(resolve => setTimeout(resolve, 30))
            }

            yield {
              type: 'finish' as const,
              finishReason: 'stop' as const,
              usage: {
                promptTokens: 0,
                completionTokens: assistantResponse.length,
                totalTokens: assistantResponse.length,
              },
            }
          } catch (error) {
            yield {
              type: 'error' as const,
              error: error as Error,
            }
          }
        })(),
      }
    },
  }

  // Usar streamText con nuestro modelo personalizado
  return streamText({
    model: customModel,
    messages,
    onFinish: async (result) => {
      // Guardar la respuesta del asistente
      if (result.text) {
        const metadata = {
          sources: capturedSources,
          timestamp: new Date().toISOString(),
          model: model || '@cf/meta/llama-3.1-8b-instruct'
        }

        await supabase
          .from('conversation_messages')
          .insert([{
            conversation_id: chatId,
            role: 'assistant',
            content: result.text,
            metadata: metadata
          }])
      }

      // Actualizar título si es el primer mensaje
      if (messages.length === 1) {
        const title = lastUserMessage.content.slice(0, 50) + '...'
        await supabase
          .from('conversations')
          .update({ title })
          .eq('id', chatId)

        setHeader(event, 'X-Chat-Title', title)
      }
    },
  })
})
