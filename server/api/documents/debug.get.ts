import { serverSupabaseClient } from '#supabase/server'

/**
 * Endpoint de diagnóstico para verificar el estado de documentos, chunks y vectores
 */
export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  
  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw createError({ statusCode: 401, message: 'Usuario no autenticado' })
  }

  try {
    // Obtener estadísticas de documentos
    const { data: documents, error: documentsError } = await supabase
      .from('documents')
      .select('id, name, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (documentsError) {
      console.error('Error obteniendo documentos:', documentsError)
    }

    // Obtener estadísticas de chunks
    const { data: chunks, error: chunksError } = await supabase
      .from('document_chunks')
      .select('id, document_id, text')
      .limit(5)

    if (chunksError) {
      console.error('Error obteniendo chunks:', chunksError)
    }

    // Obtener estadísticas de vectores
    const { data: vectors, error: vectorsError } = await supabase
      .from('document_vectors')
      .select('id, metadata')
      .limit(5)

    if (vectorsError) {
      console.error('Error obteniendo vectores:', vectorsError)
    }

    // Verificar función RPC
    let rpcTest = null
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('match_document_vectors', {
        query_embedding: new Array(1024).fill(0.1), // Vector de prueba
        match_count: 1,
        user_id: user.id
      })
      
      if (rpcError) {
        console.error('Error en función RPC:', rpcError)
        rpcTest = { error: rpcError.message }
      } else {
        rpcTest = { success: true, data: rpcData }
      }
    } catch (rpcTestError) {
      console.error('Error probando función RPC:', rpcTestError)
      rpcTest = { error: rpcTestError instanceof Error ? rpcTestError.message : 'Error desconocido' }
    }

    return {
      documents: {
        count: documents?.length || 0,
        sample: documents?.slice(0, 3) || [],
        error: documentsError?.message
      },
      chunks: {
        count: chunks?.length || 0,
        sample: chunks?.slice(0, 3) || [],
        error: chunksError?.message
      },
      vectors: {
        count: vectors?.length || 0,
        sample: vectors?.slice(0, 3) || [],
        error: vectorsError?.message
      },
      rpcTest,
      user: {
        id: user.id,
        email: user.email
      }
    }
  } catch (error) {
    console.error('Error en diagnóstico:', error)
    throw createError({ 
      statusCode: 500, 
      message: 'Error interno del servidor en diagnóstico' 
    })
  }
}) 