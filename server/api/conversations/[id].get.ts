import { serverSupabaseClient } from '#supabase/server'

/**
 * Devuelve una conversación específica con sus mensajes y documentos vinculados
 */
export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  const conversationId = getRouterParam(event, 'id')

  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw createError({ statusCode: 401, message: 'Usuario no autenticado' })
  }

  if (!conversationId) {
    throw createError({ statusCode: 400, message: 'ID de conversación requerido' })
  }

  try {
    // Usar Promise.all para ejecutar consultas en paralelo y optimizar el rendimiento
    const [conversationResult, messagesResult, documentsResult] = await Promise.all([
      // 1. Obtener la conversación y verificar que pertenece al usuario
      supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .single(),

      // 2. Obtener los mensajes de la conversación
      supabase
        .from('conversation_messages')
        .select('id, conversation_id, role, content, metadata, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true }),

      // 3. Obtener documentos vinculados con JOIN optimizado
      supabase
        .from('conversation_documents')
        .select(`
          documents (
            id,
            name,
            text_content,
            size,
            storage_url,
            user_id,
            created_at
          )
        `)
        .eq('conversation_id', conversationId)
    ])

    // Verificar errores de la conversación
    if (conversationResult.error || !conversationResult.data) {
      throw createError({ statusCode: 404, message: 'Conversación no encontrada' })
    }

    // Verificar errores de mensajes
    if (messagesResult.error) {
      throw createError({ statusCode: 500, message: 'Error al obtener mensajes' })
    }

    // Procesar documentos (pueden fallar sin afectar la carga de la conversación)
    const documents = documentsResult.error ? [] :
      (documentsResult.data?.map(item => item.documents).filter(Boolean) || [])

    return {
      ...conversationResult.data,
      messages: messagesResult.data || [],
      documents: documents || [],
    }
  } catch (error) {
    console.error('Error loading conversation:', error)
    throw createError({ statusCode: 500, message: 'Error interno del servidor' })
  }
})
