export const useToastMessages = () => {
  const toast = useToast()

  const showSuccessToast = (title: string, description: string) => {
    toast.add({
      title,
      description,
      color: 'green',
      icon: 'i-heroicons-check-circle',
      timeout: 4000,
    })
  }

  const showErrorToast = (title: string, description: string) => {
    toast.add({
      title,
      description,
      color: 'red',
      icon: 'i-heroicons-exclamation-circle',
      timeout: 5000,
    })
  }

  const showInfoToast = (title: string, description: string) => {
    toast.add({
      title,
      description,
      color: 'blue',
      icon: 'i-heroicons-information-circle',
      timeout: 4000,
    })
  }

  const showWarningToast = (title: string, description: string) => {
    toast.add({
      title,
      description,
      color: 'yellow',
      icon: 'i-heroicons-exclamation-triangle',
      timeout: 4000,
    })
  }

  // Mensajes específicos para conversaciones
  const conversationDeleted = () => {
    showSuccessToast(
      '🗑️ Conversación eliminada',
      'La conversación se ha eliminado correctamente y has sido redirigido al inicio.'
    )
  }

  const conversationDeleteError = () => {
    showErrorToast(
      '❌ Error al eliminar',
      'No se pudo eliminar la conversación. Por favor, intenta de nuevo.'
    )
  }

  const conversationDeleteUnexpectedError = () => {
    showErrorToast(
      '⚠️ Error inesperado',
      'Ocurrió un error inesperado al eliminar la conversación.'
    )
  }

  return {
    showSuccessToast,
    showErrorToast,
    showInfoToast,
    showWarningToast,
    conversationDeleted,
    conversationDeleteError,
    conversationDeleteUnexpectedError,
  }
}
