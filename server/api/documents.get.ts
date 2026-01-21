import { serverSupabaseClient } from '#supabase/server'

/**
 * Obtiene todos los documentos del usuario autenticado desde Supabase.
 * Incluye información sobre el número de chunks para cada documento.
 */
export default defineEventHandler(async (event) => {
  try {
    const supabase = await serverSupabaseClient(event)

    // Verificar autenticación con mejor manejo de errores
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('Auth check - user:', user?.id, 'error:', authError?.message)

    if (authError) {
      console.error('Authentication failed:', authError.message)
      throw createError({
        statusCode: 401,
        statusMessage: 'Auth session missing!',
        message: authError.message,
      })
    }

    if (!user) {
      console.error('No user found')
      throw createError({
        statusCode: 401,
        statusMessage: 'Usuario no autenticado',
        message: 'No user session found',
      })
    }

    console.log('Loading documents for user:', user.id)

    // Obtener documentos del usuario usando el campo user_id
    const { data: documents, error } = await supabase
      .from('documents')
      .select(`
        id,
        name,
        size,
        text_content,
        storage_url,
        user_id,
        created_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    console.log('Documents query result:', { count: documents?.length, error })

    if (error) {
      throw createError({ statusCode: 500, message: 'Error al obtener documentos' })
    }

    // Para cada documento del usuario, obtener el número de chunks
    const documentsWithChunks = await Promise.all(
      (documents || []).map(async (document: any) => {
        const { count: chunksCount, error: chunksError } = await supabase
          .from('document_chunks')
          .select('*', { count: 'exact', head: true })
          .eq('document_id', document.id)

        if (chunksError) {
          console.error(`Error al obtener chunks para documento ${document.id}:`, chunksError)
          return {
            id: document.id,
            name: document.name,
            size: document.size,
            chunks: 0,
            text_content: document.text_content,
            storage_url: document.storage_url,
            user_id: document.user_id,
            created_at: document.created_at,
          }
        }

        const documentData = {
          id: document.id,
          name: document.name,
          size: document.size,
          text_content: document.text_content,
          storage_url: document.storage_url,
          user_id: document.user_id,
          created_at: document.created_at,
        }

        return {
          ...documentData,
          chunks: chunksCount || 0,
        }
      }),
    )

    return documentsWithChunks
  }
  catch (error: any) {
    console.error('Error al cargar documentos:', error)

    // Si ya es un error de autenticación, re-lanzarlo
    if (error.statusCode === 401) {
      throw error
    }

    // Para otros errores, crear un error 500
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Error interno del servidor al cargar documentos',
    })
  }
})
