import { streamText } from 'ai'
import { processUserQuery } from '../../utils/query'
import { serverSupabaseClient } from '#supabase/server'

// Modelo personalizado que usa nuestro processUserQuery
const customModel = {
  modelId: '@cf/meta/llama-3.1-8b-instruct',
  provider: 'custom' as const,

  async doStream({ messages, event }: { messages: any[], event: any }) {
    let fullResponse = ''
    let capturedSources: any[] = []

    // Función para capturar la respuesta del processUserQuery
    const captureResponse = async (data: any) => {
      if (data.response !== undefined) {
        fullResponse = data.response
      }
      if (data.sources) {
        capturedSources = data.sources
      }
    }

    try {
      // Procesar la consulta usando nuestro sistema existente
      await processUserQuery(
        event,
        { messages },
        captureResponse,
      )

      return {
        stream: (async function* () {
          // Simular streaming enviando la respuesta en chunks
          const chunkSize = 20
          for (let i = 0; i < fullResponse.length; i += chunkSize) {
            const chunk = fullResponse.slice(i, i + chunkSize)
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
              completionTokens: fullResponse.length,
              totalTokens: fullResponse.length,
            },
          }
        })(),
        sources: capturedSources,
        fullResponse,
      }
    }
    catch (error) {
      return {
        stream: (async function* () {
          yield {
            type: 'error' as const,
            error: error as Error,
          }
        })(),
        sources: [],
        fullResponse: '',
      }
    }
  },
}

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
        title: messages[messages.length - 1].content.slice(0, 50) + '...',
      }])
      .select()
      .single()

    if (convError) {
      console.error('Error creating conversation:', convError)
    }
    else {
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
        metadata: {},
      }])
  }

  // Variables para capturar datos del modelo personalizado
  let capturedSources: any[] = []
  let fullResponse = ''

  // Usar streamText con nuestro modelo personalizado
  return streamText({
    model: {
      ...customModel,
      async doStream({ messages: msgs }: { messages: any[] }) {
        const result = await customModel.doStream({ messages: msgs, event })
        capturedSources = result.sources
        fullResponse = result.fullResponse
        return result
      },
    },
    messages,
    onFinish: async (result) => {
      // Guardar la respuesta del asistente
      if (result.text && currentConversationId) {
        const metadata = {
          sources: capturedSources,
          timestamp: new Date().toISOString(),
          model: model || '@cf/meta/llama-3.1-8b-instruct',
        }

        await supabase
          .from('conversation_messages')
          .insert([{
            conversation_id: currentConversationId,
            role: 'assistant',
            content: result.text,
            metadata: metadata,
          }])
      }

      // Actualizar título si es el primer mensaje
      if (messages.length === 1 && currentConversationId) {
        const title = lastUserMessage.content.slice(0, 50) + '...'
        await supabase
          .from('conversations')
          .update({ title })
          .eq('id', currentConversationId)

        setHeader(event, 'X-Chat-Title', title)
      }
    },
  })
})
