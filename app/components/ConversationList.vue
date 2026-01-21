<script setup lang="ts">
import type { Conversation } from '~/types'

const { conversations, loading, error, loadConversations, updateConversationTitle } = useConversations()
const { currentConversation } = useConversations()

const editingTitle = ref<string | null>(null)
const newTitle = ref('')

// Cargar conversaciones al montar el componente
onMounted(() => {
  loadConversations()
})

// Función para editar título
const startEditTitle = (conversation: Conversation) => {
  editingTitle.value = conversation.id
  newTitle.value = conversation.title || ''
}

// Función para guardar título
const saveTitle = async (conversationId: string) => {
  if (newTitle.value.trim()) {
    await updateConversationTitle(conversationId, newTitle.value.trim())
  }
  editingTitle.value = null
  newTitle.value = ''
}

// Función para cancelar edición
const cancelEdit = () => {
  editingTitle.value = null
  newTitle.value = ''
}

// Función para formatear fecha
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

  if (diffInHours < 24) {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  } else if (diffInHours < 168) { // 7 días
    return date.toLocaleDateString('es-ES', { weekday: 'short' })
  } else {
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
  }
}

// Definir emits
const emit = defineEmits<{
  'new-conversation': []
  'select-conversation': [conversationId: string]
}>()
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
      <h2 class="text-lg font-semibold">
        Conversaciones
      </h2>
      <UButton
        icon="i-lucide-plus"
        color="primary"
        variant="ghost"
        size="sm"
        @click="emit('new-conversation')"
      />
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex items-center justify-center p-8">
      <LoadingIcon class="size-6" />
      <span class="ml-2 text-sm text-gray-500">Cargando conversaciones...</span>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="p-4 text-center">
      <p class="text-sm text-red-500">
        {{ error }}
      </p>
      <UButton
        size="sm"
        color="primary"
        variant="outline"
        class="mt-2"
        @click="loadConversations"
      >
        Reintentar
      </UButton>
    </div>

    <!-- Empty state -->
    <div v-else-if="conversations.length === 0" class="flex flex-col items-center justify-center p-8 text-center">
      <div class="i-lucide-message-circle text-4xl text-gray-400 mb-4" />
      <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        No hay conversaciones
      </h3>
      <p class="text-sm text-gray-500 mb-4">
        Comienza una nueva conversación para chatear con tus documentos
      </p>
      <UButton
        color="primary"
        @click="emit('new-conversation')"
      >
        Nueva conversación
      </UButton>
    </div>

    <!-- Conversations list with larger items -->
    <div v-else class="flex-1 overflow-y-auto">
      <div class="p-2 space-y-2">
        <div
          v-for="conversation in conversations"
          :key="conversation.id"
          class="group relative flex items-center p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors border border-transparent"
          :class="{
            'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800': 
              currentConversation?.id === conversation.id
          }"
          @click="emit('select-conversation', conversation.id)"
        >
          <!-- Conversation icon -->
          <div class="flex-shrink-0 mr-3">
            <UIcon name="i-lucide-messages-square" class="size-5" />
          </div>

          <!-- Conversation info -->
          <div class="flex-1 min-w-0">
            <div v-if="editingTitle === conversation.id" class="flex items-center space-x-1">
              <input
                v-model="newTitle"
                type="text"
                class="flex-1 px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                @keyup.enter="saveTitle(conversation.id)"
                @keyup.esc="cancelEdit"
                @blur="saveTitle(conversation.id)"
                ref="titleInput"
              />
            </div>
            <div v-else class="flex items-center space-x-2">
              <h3 class="text-base font-medium text-gray-900 dark:text-gray-100 truncate">
                {{ conversation.title || 'Conversación sin título' }}
              </h3>
              <UButton
                icon="i-lucide-edit-3"
                color="neutral"
                variant="ghost"
                size="xs"
                class="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                @click.stop="startEditTitle(conversation)"
              />
            </div>
            <p class="text-xs text-gray-500 mt-1">
              {{ formatDate(conversation.updated_at) }}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <UButton
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              size="sm"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
