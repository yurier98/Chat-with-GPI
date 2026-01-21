import type { Document } from '~/types'

// Tipo extendido para documentos con información de chunks
interface DocumentWithChunks extends Document {
  chunks?: number
}

/**
 * Composable para manejar la carga y gestión de documentos del usuario
 */
export const useDocumentsManager = () => {
  const documents = useDocuments()
  const loading = ref(false)
  const error = ref<string | null>(null)
  const toast = useToast()

  /**
   * Carga todos los documentos del usuario autenticado desde Supabase
   */
  const loadUserDocuments = async () => {
    // Solo establecer loading si no hay documentos cargados
    if (documents.value.length === 0) {
      loading.value = true
    }
    error.value = null

    try {
      const data = await $fetch<DocumentWithChunks[]>('/api/documents')

      // Convertir los documentos al formato esperado por el componente
      const formattedDocuments: DocumentWithChunks[] = data.map((doc: DocumentWithChunks) => ({
        id: doc.id,
        name: doc.name,
        size: doc.size,
        text_content: doc.text_content,
        storage_url: doc.storage_url,
        user_id: doc.user_id,
        created_at: doc.created_at,
        chunks: doc.chunks || 0,
      }))

      documents.value = formattedDocuments
    }
    catch (err: any) {
      console.error('Error al cargar documentos:', err)

      // Manejar errores de autenticación específicamente
      if (err?.statusCode === 401) {
        error.value = 'Sesión expirada. Por favor, inicia sesión nuevamente.'
        // Limpiar documentos si hay error de autenticación
        documents.value = []
        throw err // Re-lanzar para que el componente padre lo maneje
      }
      else {
        error.value = err instanceof Error ? err.message : 'Error desconocido al cargar documentos'
      }
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Elimina un documento específico
   */
  const deleteDocument = async (documentId: string) => {
    try {
      const result = await $fetch<{ documentName: string }>(`/api/documents/${documentId}`, {
        method: 'DELETE',
      })

      // Remover el documento del estado local
      documents.value = documents.value.filter(doc => doc.id !== documentId)

      // Mostrar notificación de éxito
      toast.add({
        title: 'Documento eliminado',
        description: result.documentName,
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })

      return result
    }
    catch (err) {
      console.error('Error al eliminar documento:', err)
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar documento'
      error.value = errorMessage

      // Mostrar notificación de error
      toast.add({
        title: 'Error',
        description: errorMessage,
        color: 'error',
        icon: 'i-heroicons-exclamation-circle',
      })

      throw err
    }
  }

  /**
   * Actualiza la lista de documentos (útil después de subir un nuevo documento)
   */
  const refreshDocuments = () => {
    return loadUserDocuments()
  }

  return {
    documents: readonly(documents),
    loading: readonly(loading),
    error: readonly(error),
    loadUserDocuments,
    deleteDocument,
    refreshDocuments,
  }
}
