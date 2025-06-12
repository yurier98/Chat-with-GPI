<script setup lang="ts">
import type { QueryStreamResponse } from '~/types'
import { quickChats } from '~/types'

const sessionId = useState<string>('sessionId', () => crypto.randomUUID())
const informativeMessage = useInformativeMessage()
const messages = useMessages()
const documents = useDocuments()
const queries = useQueries()
const relevantContext = useRelevantContext()
const isDrawerOpen = ref(false)

const toast = useToast()

async function sendMessage(message: string, selectedModel: string) {
  messages.value.push({ role: 'user', content: message })
  relevantContext.value.isProvided = false
  relevantContext.value.context = []

  const response = useStream<QueryStreamResponse>('/api/query', {
    messages: messages.value,
    sessionId: sessionId.value,
    model: selectedModel,
  })()

  let responseAdded = false
  for await (const chunk of response) {
    if (chunk.message) {
      informativeMessage.value = chunk.message
    }

    if (chunk.queries) {
      queries.value = chunk.queries
    }

    if (chunk.relevantContext) {
      relevantContext.value.context = chunk.relevantContext.map(context => context.text)
      relevantContext.value.isProvided = true
    }

    if (chunk.error) {
      informativeMessage.value = chunk.error
      toast.add({
        title: 'Error',
        description: chunk.error,
        color: 'error',
      })
    }

    if (chunk.response) {
      informativeMessage.value = ''

      if (!responseAdded) {
        messages.value.push({
          role: 'assistant',
          content: chunk.response,
        })
        responseAdded = true
      }
      else {
        messages.value[messages.value.length - 1]!.content += chunk.response
      }
    }
  }
}

const uploadedFiles = computed(() => documents.value.filter(doc => !doc.progress))
const isChatEnabled = computed(() => informativeMessage.value === '' && !!uploadedFiles.value.length)

const isExampleSession = useIsExampleSession()
const exampleSessions = useExampleSessions()
const exampleSession = computed(() => exampleSessions.find(session => session.id === sessionId.value))
</script>

<template>
  <div class="h-dvh flex flex-col md:flex-row max-h-dvh">
    <USlideover
      v-model:open="isDrawerOpen"
      :ui="{ content: 'md:hidden' }"
    >
      <template #content>
        <SideBar @hide-drawer="isDrawerOpen = false" />
      </template>
    </USlideover>

    <div class="hidden md:block max-w-xs w-full">
      <SideBar />
    </div>

    <USeparator orientation="vertical" class="hidden md:block" />

    <div class="w-full h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 ">
      <ChatHeader @show-drawer="isDrawerOpen = true" />
      <USeparator />

      <div class="overflow-y-auto h-full">
        <UContainer class="w-full h-full flex flex-col max-h-full max-w-3xl relative">
          <ChatMessages v-show="!(isExampleSession && !messages.length)" :messages="messages" />

          <!-- Example questions -->
          <div v-if="isExampleSession && !messages.length" class="grid h-full p-6 place-items-center">
            <div class="flex-1 flex flex-col justify-center gap-4 sm:gap-6 py-8">
              <h1 class="text-3xl sm:text-4xl text-highlighted font-bold">
                ¿Cómo puedo ayudarte hoy?
              </h1>
              <div class="flex flex-wrap gap-2">
              <UButton
                v-for="quickChat in quickChats"
                :key="quickChat.label"
                :icon="quickChat.icon"
                :label="quickChat.label"
                size="sm"
                color="neutral"
                variant="outline"
                class="rounded-full cursor-pointer"
                @click="sendMessage(quickChat.label)"
              />
            </div>
            </div>
          </div>

          <ChatInput class="w-full absolute bottom-0 inset-x-0" :loading="!isChatEnabled" @message="sendMessage" />
          <div class="w-full absolute bottom-0 inset-x-0 flex flex-col items-center p-4">
            <ChatPrompt :loading="!isChatEnabled" @message="sendMessage" />
          </div>
        </UContainer>
      </div>
    </div>
  </div>
</template>
