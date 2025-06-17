import { serverSupabaseClient } from '#supabase/server'

/**
 * Verifica el estado de los documentos del usuario autenticado.
 * Útil para diagnosticar problemas con la búsqueda y vectorización.
 */
export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  
  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw createError({ statusCode: 401, message: 'Usuario no autenticado' })
  }

  try {
    // Obtener estadísticas de documentos del usuario autenticado
    const { count: documentsCount, error: documentsError } = await supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (documentsError) {
      throw createError({ statusCode: 500, message: 'Error al contar documentos' })
    }

    // Obtener documentos del usuario para calcular chunks y vectores
    const { data: documents, error: userDocsError } = await supabase
      .from('documents')
      .select('id, name')
      .eq('user_id', user.id)

    if (userDocsError) {
      throw createError({ statusCode: 500, message: 'Error al obtener documentos del usuario' })
    }

    const userDocumentIds = documents?.map(doc => doc.id) || []

    // Obtener estadísticas de chunks del usuario
    const { count: chunksCount, error: chunksError } = await supabase
      .from('document_chunks')
      .select('*', { count: 'exact', head: true })
      .in('document_id', userDocumentIds)

    if (chunksError) {
      throw createError({ statusCode: 500, message: 'Error al contar chunks' })
    }

    // Obtener estadísticas de vectores del usuario
    const { count: vectorsCount, error: vectorsError } = await supabase
      .from('document_vectors')
      .select('*', { count: 'exact', head: true })
      .in('document_id', userDocumentIds)

    if (vectorsError) {
      throw createError({ statusCode: 500, message: 'Error al contar vectores' })
    }

    // Obtener algunos documentos de ejemplo del usuario para verificar su estructura
    const { data: sampleDocuments, error: sampleError } = await supabase
      .from('documents')
      .select('id, name')
      .eq('user_id', user.id)
      .limit(3)

    if (sampleError) {
      throw createError({ statusCode: 500, message: 'Error al obtener documentos de muestra' })
    }

    // Verificar si hay chunks para los documentos de muestra
    const chunksInfo = await Promise.all(
      (sampleDocuments || []).map(async (doc) => {
        const { count: docChunks, error: docChunksError } = await supabase
          .from('document_chunks')
          .select('*', { count: 'exact', head: true })
          .eq('document_id', doc.id)

        const documentStatus = {
          id: doc.id,
          name: doc.name,
          status: 'processed',
          chunksCount: docChunksError ? 0 : (docChunks || 0),
          vectorsCount: vectorsCount || 0,
        }

        return documentStatus
      })
    )

    return {
      status: 'ok',
      statistics: {
        totalDocuments: documentsCount || 0,
        totalChunks: chunksCount || 0,
        totalVectors: vectorsCount || 0,
        averageChunksPerDocument: (documentsCount || 0) > 0 ? Math.round((chunksCount || 0) / (documentsCount || 0)) : 0,
        averageVectorsPerDocument: (documentsCount || 0) > 0 ? Math.round((vectorsCount || 0) / (documentsCount || 0)) : 0,
      },
      sampleDocuments: chunksInfo,
      diagnostics: {
        hasDocuments: (documentsCount || 0) > 0,
        hasChunks: (chunksCount || 0) > 0,
        hasVectors: (vectorsCount || 0) > 0,
        isProperlyVectorized: (chunksCount || 0) > 0 && (vectorsCount || 0) > 0,
        potentialIssues: [],
      },
    }
  } catch (error) {
    console.error('Error al verificar estado de documentos:', error)
    throw createError({ 
      statusCode: 500, 
      message: 'Error interno del servidor al verificar estado de documentos' 
    })
  }
}) 