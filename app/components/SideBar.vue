<script setup lang="ts">
const emit = defineEmits(['hideDrawer'])

const toast = useToast()

// files
const documents = useDocuments()
const isExampleSession = useIsExampleSession()
const exampleSessions = useExampleSessions()
const sessionId = useSessionId()

function setExampleSession(exampleSessionId: string) {
  const { id, ...documentInfo } = exampleSessions.find(example => example.id === exampleSessionId)!
  documents.value.push(documentInfo)
  sessionId.value = exampleSessionId
}

function handleDeleteDocument(documentName: string) {
  if (isExampleSession.value) {
    return toast.add({
      title: 'Sesión de ejemplo',
      description: 'No se pueden eliminar documentos en sesiones de ejemplo.',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }

  documents.value = documents.value.filter((doc: { name: string }) => doc.name !== documentName)
  toast.add({
    title: 'Documento eliminado',
    description: documentName,
    color: 'error',
    icon: 'i-heroicons-trash',
  })
}
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <div class="flex md:hidden items-center justify-between px-4 h-14">
      <div class="flex items-center gap-x-4">
        <h2 class="md:text-lg text-zinc-600 dark:text-zinc-300">
          Documentos
        </h2>
      </div>
      <UButton
        icon="i-heroicons-x-mark-20-solid"
        color="neutral"
        variant="ghost"
        class="md:hidden"
        @click="$emit('hideDrawer')"
      />
    </div>
    <USeparator />
    <div class="p-4 space-y-6 overflow-y-auto flex flex-col">
      <FileUploader
        :session-id="sessionId"
        :is-example-session="isExampleSession"
      />
    </div>

    <div class="px-4 pb-4 flex-1">
      <DocumentList
        :documents="documents"
        :example-sessions="exampleSessions"
        @set-example-session="setExampleSession"
        @delete-document="handleDeleteDocument"
      />
    </div>

    <USeparator />
    <div class="p-2">
      <UButton
        to="https://hub.nuxt.com?utm_source=chat-with-pdf"
        target="_blank"
        variant="link"
        color="neutral"
        size="sm"
      >
        Hosted on NuxtHub
      </UButton>
    </div>
  </div>
</template>
