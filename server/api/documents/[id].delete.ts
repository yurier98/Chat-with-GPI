import { serverSupabaseClient } from '#supabase/server'

/**
 * Elimina un documento específico del usuario autenticado.
 * También elimina todos los chunks y vectores asociados al documento.
 */
export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  
  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw createError({ statusCode: 401, message: 'Usuario no autenticado' })
  }

  const documentId = getRouterParam(event, 'id')
  if (!documentId) {
    throw createError({ statusCode: 400, message: 'ID de documento requerido' })
  }

  try {
    // Verificar que el documento pertenece al usuario
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('id, name, storage_url, user_id')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (documentError || !document) {
      throw createError({ statusCode: 404, message: 'Documento no encontrado' })
    }

    // Eliminar vectores asociados al documento
    const { error: vectorsError } = await supabase
      .from('document_vectors')
      .delete()
      .eq('document_id', documentId)

    if (vectorsError) {
      console.error('Error al eliminar vectores:', vectorsError)
    }

    // Eliminar chunks asociados al documento
    const { error: chunksError } = await supabase
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId)

    if (chunksError) {
      console.error('Error al eliminar chunks:', chunksError)
    }

    // Eliminar el documento
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId)

    if (deleteError) {
      throw createError({ statusCode: 500, message: 'Error al eliminar documento' })
    }

    // Intentar eliminar el archivo del storage (opcional)
    if (document.storage_url) {
      try {
        // Extraer la ruta del archivo de la URL
        const urlParts = document.storage_url.split('/')
        const filePath = urlParts.slice(-3).join('/') // Obtener los últimos 3 segmentos
        
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([filePath])

        if (storageError) {
          console.warn('No se pudo eliminar el archivo del storage:', storageError)
        }
      } catch (storageError) {
        console.warn('Error al eliminar archivo del storage:', storageError)
      }
    }

    return { 
      success: true, 
      message: 'Documento eliminado correctamente',
      documentName: document.name
    }
  } catch (error) {
    console.error('Error al eliminar documento:', error)
    throw createError({ 
      statusCode: 500, 
      message: 'Error interno del servidor al eliminar documento' 
    })
  }
}) 