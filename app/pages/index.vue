<script setup lang="ts">
import { quickChats } from '~/types'

const input = ref('')
const loading = ref(false)
const isDrawerOpen = ref(false)

const toast = useToast()

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 18) return 'Buenas tardes'
  return 'Buenas noches'
})
const user = useSupabaseUser()

async function createChat(prompt: string) {
  input.value = prompt
  loading.value = true

  try {
    const chat = await $fetch('/api/chats', {
      method: 'POST',
      body: { input: prompt },
    }) as { id: string }

    refreshNuxtData('chats')
    navigateTo(`/chat/${chat.id}`)
  }
  catch (error) {
    console.error('Error creating chat:', error)
    toast.add({
      title: 'Error',
      description: 'No se pudo crear la conversación',
      color: 'error',
    })
  }
  finally {
    loading.value = false
  }
}

function handleMessage(message: string, _selectedModel: string) {
  if (!message.trim()) return
  createChat(message)
}
</script>

<template>
  <div class="w-full h-full flex flex-col bg-zinc-50 dark:bg-zinc-950">
    <ChatHeader @show-drawer="isDrawerOpen = true" />
    <USeparator />

    <div class="flex-1 overflow-y-auto">
      <UContainer class="w-full h-full flex flex-col flex-1 justify-center items-center gap-4 px-0">
        <span v-if="user" class="block text-3xl font-light">
          {{ greeting }}, {{ user.user_metadata.name }}</span>
        <h1 class="text-3xl sm:text-4xl text-highlighted font-bold text-center">
          ¿Cómo puedo ayudarte hoy?
        </h1>

        <UContainer class="max-w-3xl mx-auto px-0 ">
          <ChatPrompt
            :loading="loading"
            @message="handleMessage"
          />
          <ExamplePrompts @message="createChat" />
        </UContainer>

        <div class="flex flex-wrap gap-2 justify-center">
          <UButton
            v-for="quickChat in quickChats"
            :key="quickChat.label"
            :icon="quickChat.icon"
            :label="quickChat.label"
            size="sm"
            color="neutral"
            variant="outline"
            class="rounded-full"
            @click="createChat(quickChat.label)"
          />
        </div>
      </UContainer>
    </div>
  </div>
</template>
