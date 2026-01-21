import { serverSupabaseClient } from '#supabase/server'

/**
 * Endpoint de diagnóstico para verificar el estado de conversaciones
 */
export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  
  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw createError({ statusCode: 401, message: 'Usuario no autenticado' })
  }

  try {
    // Obtener todas las conversaciones del usuario
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, title, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (convError) {
      throw createError({ statusCode: 500, message: 'Error al obtener conversaciones' })
    }

    // Para cada conversación, obtener el número de mensajes
    const conversationsWithMessages = await Promise.all(
      (conversations || []).map(async (conv) => {
        const { count: messageCount, error: msgError } = await supabase
          .from('conversation_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)

        const { count: documentCount, error: docError } = await supabase
          .from('conversation_documents')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)

        return {
          id: conv.id,
          title: conv.title,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          messageCount: msgError ? 0 : (messageCount || 0),
          documentCount: docError ? 0 : (documentCount || 0),
          hasMessages: !msgError && (messageCount || 0) > 0,
          hasDocuments: !docError && (documentCount || 0) > 0,
        }
      })
    )

    // Obtener algunos mensajes de ejemplo de la primera conversación
    let sampleMessages = []
    if (conversations && conversations.length > 0) {
      const { data: messages, error: sampleError } = await supabase
        .from('conversation_messages')
        .select('id, role, content, created_at')
        .eq('conversation_id', conversations[0].id)
        .order('created_at', { ascending: true })
        .limit(5)

      if (!sampleError && messages) {
        sampleMessages = messages
      }
    }

    return {
      user: {
        id: user.id,
        email: user.email
      },
      conversations: {
        total: conversations?.length || 0,
        list: conversationsWithMessages,
        sampleMessages
      },
      summary: {
        hasConversations: (conversations?.length || 0) > 0,
        conversationsWithMessages: conversationsWithMessages.filter(c => c.hasMessages).length,
        conversationsWithDocuments: conversationsWithMessages.filter(c => c.hasDocuments).length,
      }
    }
  } catch (error) {
    console.error('Error en diagnóstico de conversaciones:', error)
    throw createError({ 
      statusCode: 500, 
      message: 'Error interno del servidor en diagnóstico' 
    })
  }
}) 