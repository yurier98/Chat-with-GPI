<script setup lang="ts">
// Elimino la importación de User porque ya no se usa
// import type { User } from '@supabase/supabase-js'

const items = [
  {
    label: 'Documentos',
    icon: 'i-lucide-file-text',
    slot: 'documents' as const,
  },
  {
    label: 'Conversaciones',
    icon: 'i-lucide-message-circle',
    slot: 'conversations' as const,
  },
]

const toast = useToast()

// Usuario autenticado
const user = useSupabaseUser()
const { auth } = useSupabaseClient()

// Composable para manejar documentos
const { deleteDocument, loadUserDocuments, loading: documentsLoading } = useDocumentsManager()

// Composable para manejar conversaciones
const { createConversation } = useConversations()

// files
const documents = useDocuments()

interface AuthStatus {
  authenticated: boolean
  error?: string
}

const ensureUserAndLoadDocuments = async () => {
  // Espera a que la sesión esté lista (máx 2 segundos)
  let tries = 0
  while (!user.value && tries < 10) {
    await new Promise(res => setTimeout(res, 200))
    tries++
  }
  if (user.value && user.value.id) {
    console.log('Usuario autenticado, cargando documentos...')
    try {
      await loadUserDocuments()
    } catch (error) {
      console.error('Error al cargar documentos:', error)
      if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 401) {
        console.log('Sesión expirada, redirigiendo al login...')
        await auth.signOut()
        navigateTo('/login')
      }
    }
  } else {
    console.log('Usuario no autenticado o incompleto, limpiando documentos...')
    documents.value = []
  }
}

onMounted(() => {
  ensureUserAndLoadDocuments()
})

// Verificar sesión al montar el componente
onMounted(async () => {
  // Esperar un poco para que la sesión se establezca
  await nextTick()

  console.log('Estado inicial del usuario:', user.value)

  // Probar el endpoint de autenticación
  try {
    const authStatus = await $fetch<AuthStatus>('/api/auth/status')
    console.log('Estado de autenticación del servidor:', authStatus)

    if (!authStatus.authenticated) {
      console.log('Servidor reporta usuario no autenticado:', authStatus.error)
      navigateTo('/login')
      return
    }
  }
  catch (error) {
    console.error('Error al verificar autenticación:', error)
  }

  if (!user.value) {
    console.log('No hay usuario autenticado al montar el componente')
    // Verificar si hay una sesión válida
    const { data: { session }, error } = await auth.getSession()
    console.log('Sesión obtenida:', session, 'Error:', error)

    if (!session) {
      console.log('No hay sesión válida, redirigiendo al login')
      navigateTo('/login')
    }
    else {
      console.log('Hay sesión pero no usuario, esperando...')
      // Esperar un poco más para que el usuario se establezca
      setTimeout(async () => {
        if (!user.value) {
          console.log('Usuario aún no establecido, redirigiendo al login')
          navigateTo('/login')
        }
      }, 2000)
    }
  }
  else {
    console.log('Usuario autenticado encontrado:', user.value.email)
  }
})

// Función para cerrar sesión
async function logout() {
  try {
    await auth.signOut()
    toast.add({
      title: 'Sesión cerrada',
      description: 'Has cerrado sesión correctamente',
      color: 'info',
      icon: 'i-heroicons-information-circle',
    })
    navigateTo('/login')
  }
  catch (err) {
    console.error('Error al cerrar sesión:', err)
    toast.add({
      title: 'Error',
      description: 'No se pudo cerrar sesión',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
}

async function handleDeleteDocument(documentId: string) {
  try {
    await deleteDocument(documentId)
  }
  catch (err) {
    // El error ya se maneja en el composable
    console.error('Error al eliminar documento:', err)
  }
}

// Funciones para manejar conversaciones
async function handleNewConversation() {
  console.log('Creating new conversation...')
  const conversation = await createConversation()
  if (conversation) {
    console.log('New conversation created:', conversation.id)
    // Navegar a la nueva conversación
    await navigateTo(`/chat/${conversation.id}`)
  }
}

async function handleSelectConversation(conversationId: string) {
  console.log('Selecting conversation:', conversationId)
  // Navegar a la página de detalles de la conversación
  await navigateTo(`/chat/${conversationId}`)
  console.log('Navigated to conversation:', conversationId)
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Contenido principal con UTabs -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <UTabs :items="items" class="gap-4 w-full h-full p-3">
        <template #documents>
          <div class="flex flex-col h-full">
            <!-- FileUploader fijo en la parte superior -->
            <div class="flex-shrink-0 p-4">
              <FileUploader />
            </div>

            <!-- DocumentList con scroll -->
            <div class="flex-1 px-0 overflow-hidden">
              <!-- Indicador de carga -->
              <div v-if="documentsLoading" class="flex items-center justify-center h-full">
                <UCard class="w-full max-w-sm">
                  <div class="flex items-center gap-3">
                    <UIcon name="i-heroicons-arrow-path" class="w-5 h-5 animate-spin text-primary" />
                    <div>
                      <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Cargando documentos...
                      </p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        Obteniendo tu lista de documentos
                      </p>
                    </div>
                  </div>
                </UCard>
              </div>

              <!-- Lista de documentos -->
              <DocumentList
                v-else
                :documents="documents"
                max-height="calc(100vh - 500px)"
                @delete-document="handleDeleteDocument"
              />
            </div>
          </div>
        </template>

        <template #conversations>
          <ConversationList
            @new-conversation="handleNewConversation"
            @select-conversation="handleSelectConversation"
          />
        </template>
      </UTabs>
    </div>

    <!-- Footer fijo con información del usuario -->
    <div class="flex-shrink-0">
      <USeparator />
      <div class="p-2">
        <div class="flex flex-col gap-2">
          <div v-if="user" class="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 hover:dark:bg-zinc-800">
            <UAvatar
              v-if="user.user_metadata?.avatar_url"
              :src="user.user_metadata?.avatar_url"
              size="sm"
            />
            <div class="flex flex-col overflow-hidden">
              <p class="text-xs font-medium truncate">
                {{ user.user_metadata?.full_name || user.email }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                {{ user.email }}
              </p>
            </div>
            <UTooltip text="Cerrar sesión">
              <UButton
                icon="i-heroicons-arrow-right-on-rectangle"
                color="neutral"
                variant="ghost"
                class="ml-auto cursor-pointer"
                @click="logout"
              />
            </UTooltip>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
