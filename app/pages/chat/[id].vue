<script setup lang="ts">
const route = useRoute()
const toast = useToast()
const isDrawerOpen = ref(false)

// Estados para información adicional
const informativeMessage = ref('')
const queries = ref<string[]>([])
const relevantContext = ref<{ isProvided: boolean, context: any[] }>({ isProvided: false, context: [] })

// Cargar datos iniciales del chat
const { data: chat } = await useFetch(`/api/conversations/${route.params.id}`, {
  cache: 'force-cache',
})

if (!chat.value) {
  throw createError({ statusCode: 404, statusMessage: 'Chat not found', fatal: true })
}

// Estados para el chat manual (sin @ai-sdk/vue por problemas de compatibilidad)
const messages = ref(chat.value.messages.map((message: any) => ({
  id: message.id,
  content: message.content,
  role: message.role,
})))

const input = ref('')
const status = ref<'ready' | 'submitted' | 'streaming' | 'error'>('ready')
const error = ref<Error | null>(null)

// Función para manejar el envío de mensajes
async function handleSubmit() {
  if (!input.value.trim()) return

  const userMessage = {
    id: `user-${Date.now()}`,
    role: 'user' as const,
    content: input.value,
  }

  const assistantMessage = {
    id: `assistant-${Date.now()}`,
    role: 'assistant' as const,
    content: '',
  }

  // Agregar mensajes a la UI
  messages.value.push(userMessage, assistantMessage)

  const messageContent = input.value
  input.value = ''
  status.value = 'submitted'

  // Limpiar estados previos
  informativeMessage.value = ''
  queries.value = []
  relevantContext.value = { isProvided: false, context: [] }

  try {
    status.value = 'streaming'

    const response = await fetch('/api/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [...messages.value.slice(0, -1)], // Todos menos el asistente vacío
        model: '@cf/meta/llama-3.1-8b-instruct',
        conversationId: chat.value.id,
      }),
    })

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No se pudo obtener el reader del stream')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))

            if (data.message) informativeMessage.value = data.message
            if (data.queries) queries.value = data.queries
            if (data.relevantContext) {
              relevantContext.value = { isProvided: true, context: data.relevantContext }
            }
            if (data.responseChunk !== undefined) {
              // Actualizar el último mensaje del asistente con streaming incremental
              const lastIndex = messages.value.length - 1
              if (messages.value[lastIndex]?.role === 'assistant') {
                messages.value[lastIndex] = {
                  ...messages.value[lastIndex],
                  content: data.responseChunk,
                }
              }
            }
            if (data.response !== undefined) {
              // Fallback para respuesta completa (compatibilidad)
              const lastIndex = messages.value.length - 1
              if (messages.value[lastIndex]?.role === 'assistant') {
                messages.value[lastIndex] = {
                  ...messages.value[lastIndex],
                  content: data.response,
                }
              }
            }
            if (data.error) {
              throw new Error(data.error)
            }
            if (data.completed) {
              break
            }
          }
          catch (e) {
            console.warn('Error parsing SSE data:', e)
          }
        }
      }
    }

    informativeMessage.value = ''
    status.value = 'ready'
  }
  catch (err) {
    console.error('Error al enviar mensaje:', err)
    error.value = err as Error
    status.value = 'error'

    // Remover el mensaje del asistente vacío en caso de error
    if (messages.value[messages.value.length - 1]?.role === 'assistant'
      && messages.value[messages.value.length - 1]?.content === '') {
      messages.value.pop()
    }

    toast.add({
      title: 'Error',
      description: 'No se pudo procesar tu consulta. Por favor, intenta de nuevo.',
      color: 'error',
    })
  }
}

function reload() {
  // Recargar la página para obtener mensajes actualizados
  window.location.reload()
}

// Función para manejar reload con parámetros correctos
function handleReload() {
  reload()
}

// Función para manejar el envío de mensajes desde ChatPrompt
function handleMessage(message: string, _selectedModel: string) {
  input.value = message
  handleSubmit()
}
</script>

<template>
  <div class="h-dvh flex flex-col md:flex-row max-h-dvh">
    <div class="w-full h-full flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <ChatConversationHeader
        :conversation-id="chat?.id"
        :conversation-title="chat?.title"
        @show-drawer="isDrawerOpen = true"
      />
      <USeparator />

      <div class="flex-1 overflow-hidden">
        <UContainer class="w-full h-full flex flex-col max-h-full max-w-3xl">
          <!-- Mensajes del chat -->
          <div class="flex-1 flex flex-col min-h-0">
            <ChatMessages
              :messages="messages"
              :status="status"
              :should-auto-scroll="true"
              :should-scroll-to-bottom="true"
              :auto-scroll="true"
              :relevant-context="relevantContext"
              :queries="queries"
              :informative-message="informativeMessage"
              class="flex-1 min-h-0"
            />
          </div>

          <!-- Estado de error -->
          <div v-if="error" class="flex flex-col items-center justify-center p-8 text-center h-full">
            <UIcon name="i-heroicons-exclamation-triangle" class="size-12 text-red-500 mb-4" />
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Error en la conversación
            </h3>
            <p class="text-sm text-gray-500 mb-4">
              {{ error.message }}
            </p>
            <UButton
              color="primary"
              @click="handleReload"
            >
              Reintentar
            </UButton>
          </div>

          <!-- Estado vacío -->
          <div v-if="!error && messages.length === 0" class="flex flex-col items-center justify-center p-8 text-center h-full">
            <UIcon name="i-lucide-message-circle" class="size-12 text-gray-400 mb-4" />
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Conversación vacía
            </h3>
            <p class="text-sm text-gray-500 mb-4">
              Envía un mensaje para comenzar la conversación.
            </p>
          </div>
        </UContainer>
      </div>

      <UContainer class="max-w-3xl mx-auto flex flex-col items-center">
        <ChatPrompt
          v-model="input"
          :loading="status === 'streaming'"
          @message="handleMessage"
        />
        <p class="text-zinc-500 text-xs text-center w-full mb-2">
          ChatGPI puede cometer errores. Considera verificar la información importante.
        </p>
      </UContainer>
    </div>
  </div>
</template>
