import type { Conversation, ConversationMessage, ConversationWithMessages } from '~/types'

export const useConversations = () => {
  const conversations = ref<Conversation[]>([])
  const currentConversation = useState<ConversationWithMessages | null>('currentConversation', () => null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const supabase = useSupabaseClient()

  // Cargar todas las conversaciones del usuario
  const loadConversations = async () => {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false })

      if (fetchError) throw fetchError

      conversations.value = data || []
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Error al cargar conversaciones'
      console.error('Error loading conversations:', err)
    }
    finally {
      loading.value = false
    }
  }

  // Crear una nueva conversación
  const createConversation = async (title?: string): Promise<Conversation | null> => {
    loading.value = true
    error.value = null

    try {
      // Ensure title is string or null, as Conversation expects
      const insertTitle = title || null
      const { data, error: createError } = await supabase
        .from('conversations')
        .insert([{ title: insertTitle } as Conversation]) // Explicitly cast
        .select()
        .single()

      if (createError) throw createError

      conversations.value.unshift(data)
      return data
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Error al crear conversación'
      console.error('Error creating conversation:', err)
      return null
    }
    finally {
      loading.value = false
    }
  }

  // Cargar una conversación específica con sus mensajes
  const loadConversation = async (conversationId: string): Promise<ConversationWithMessages | null> => {
    loading.value = true
    error.value = null

    try {
      // Llama a tu endpoint que trae la conversación y sus mensajes
      const data = await $fetch<ConversationWithMessages>(`/api/conversations/${conversationId}`)
      currentConversation.value = data
      return data
    }
    catch (err) {
      console.error('Error loading conversation:', err)
      error.value = err instanceof Error ? err.message : 'Error desconocido'
      currentConversation.value = null
      return null
    }
    finally {
      loading.value = false
    }
  }

  // Agregar un mensaje a la conversación actual
  const addMessage = async (role: 'user' | 'assistant' | 'system', content: string, metadata?: Record<string, any>): Promise<ConversationMessage | null> => {
    if (!currentConversation.value) return null

    loading.value = true
    error.value = null

    try {
      const { data, error: addError } = await supabase
        .from('conversation_messages')
        .insert([{
          conversation_id: currentConversation.value.id,
          role,
          content,
          metadata: metadata || {},
        } as ConversationMessage]) // Explicitly cast
        .select()
        .single()

      if (addError) throw addError

      // Actualizar la conversación actual
      currentConversation.value.messages.push(data)

      // Actualizar la lista de conversaciones
      const convIndex = conversations.value.findIndex(c => c.id === currentConversation.value!.id)
      if (convIndex !== -1) {
        const existingConv = conversations.value[convIndex]
        if (existingConv) {
          conversations.value[convIndex] = {
            ...existingConv, // Spread existingConv to ensure proper type
            updated_at: data.created_at,
          } as Conversation // Explicitly cast the result back to Conversation
        }
        // Mover la conversación al principio
        const convToMove = conversations.value.splice(convIndex, 1)[0]
        if (convToMove) {
          conversations.value.unshift(convToMove)
        }
      }

      return data
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Error al agregar mensaje'
      console.error('Error adding message:', err)
      return null
    }
    finally {
      loading.value = false
    }
  }

  // Vincular documentos a la conversación actual
  const linkDocuments = async (documentIds: string[]): Promise<boolean> => {
    if (!currentConversation.value || documentIds.length === 0) return false

    loading.value = true
    error.value = null

    try {
      const links = documentIds.map(documentId => ({
        conversation_id: currentConversation.value!.id,
        document_id: documentId,
      }))

      const { error: linkError } = await supabase
        .from('conversation_documents')
        .insert(links as ConversationDocument[]) // Explicitly cast

      if (linkError) throw linkError

      return true
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Error al vincular documentos'
      console.error('Error linking documents:', err)
      return false
    }
    finally {
      loading.value = false
    }
  }

  // Eliminar una conversación
  const deleteConversation = async (conversationId: string, redirectToHome: boolean = false): Promise<boolean> => {
    loading.value = true
    error.value = null

    try {
      await $fetch(`/api/conversations/${conversationId}`, {
        method: 'DELETE'
      })

      // Remover de la lista local
      conversations.value = conversations.value.filter(c => c.id !== conversationId)

      // Si es la conversación actual, limpiarla y redirigir si se solicita
      if (currentConversation.value?.id === conversationId) {
        currentConversation.value = null

        // Redirigir al inicio si se está eliminando la conversación actual
        if (redirectToHome) {
          await navigateTo('/')
        }
      }

      return true
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Error al eliminar conversación'
      console.error('Error deleting conversation:', err)
      return false
    }
    finally {
      loading.value = false
    }
  }

  // Actualizar el título de una conversación
  const updateConversationTitle = async (conversationId: string, title: string): Promise<boolean> => {
    loading.value = true
    error.value = null

    try {
      const { error: updateError } = await supabase
        .from('conversations')
        .update({ title } as Partial<Conversation>) // Use Partial and explicitly cast
        .eq('id', conversationId)

      if (updateError) throw updateError

      // Actualizar en la lista local
      const convIndex = conversations.value.findIndex(c => c.id === conversationId)
      if (convIndex !== -1) {
        // Ensure conversations.value[convIndex] is not undefined before modifying
        if (conversations.value[convIndex]) {
          conversations.value[convIndex].title = title
        }
      }

      // Actualizar la conversación actual si es la misma
      if (currentConversation.value?.id === conversationId) {
        currentConversation.value.title = title
      }

      return true
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Error al actualizar título'
      console.error('Error updating conversation title:', err)
      return false
    }
    finally {
      loading.value = false
    }
  }

  return {
    conversations: readonly(conversations),
    currentConversation: readonly(currentConversation),
    loading: readonly(loading),
    error: readonly(error),
    loadConversations,
    createConversation,
    loadConversation,
    addMessage,
    linkDocuments,
    deleteConversation,
    updateConversationTitle,
  }
}
