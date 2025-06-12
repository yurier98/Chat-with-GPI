<script setup lang="ts">
import type { SelectItem } from '@nuxt/ui'

defineProps<{ loading: boolean }>()

const availableModels = ref([
  {
    label: 'Gemini 2.5 Pro',
    value: 'backlog',
    icon: 'i-simple-icons-googlegemini'
  },
  {
    label: 'GPT-4o',
    value: 'todo',
    icon: 'i-simple-icons-openai'
  },
  {
    label: 'Claude 3.5 Sonnet',
    value: 'in_progress',
    icon: 'i-simple-icons-anthropic'
  },
  {
    label: 'Llama 4',
    value: 'done',
    icon: 'i-simple-icons-ollama'
  }
] satisfies SelectItem[])
const value = ref(availableModels.value[0]?.value)

const icon = computed(() => availableModels.value.find(item => item.value === value.value)?.icon)

const emit = defineEmits(['message'])

const message = ref('')

function sendMessage() {
  if (!message.value.trim()) return
  emit('message', message.value, value.value)
  message.value = ''
}
</script>

<template>
  <form class="relative flex flex-col items-stretch gap-2 px-2.5 py-2 w-full rounded-2xl backdrop-blur bg-elevated/50 ring ring-default" @submit.prevent="sendMessage">
    <div class="relative inline-flex items-start w-full">
      <UTextarea
        v-model="message"
        :placeholder="`Escribe tu mensaje aquí...`"
        :rows="1"
        autoresize
        variant="subtle"
        class="w-full rounded-md border-0  px-2.5 py-1.5 gap-1.5"
        :ui="{ base: 'overflow-hidden', textarea: 'min-h-[30px]' }"
        @keydown.enter.prevent="sendMessage"
        :disabled="loading"
      />
      <UButton
        type="submit"
        icon="i-lucide:arrow-up"
        size="sm"
        color="neutral"
        class="rounded-full absolute top-2 right-2"
        :loading="loading"
        :disabled="loading || !message.trim()"
      />
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <USelect
        v-model="value"
        :items="availableModels"
        value-key="value"
        :icon="icon" 
        trailing-icon="i-lucide:chevron-down"
        variant="ghost"
      />  
      <BtnUploader/> 
    </div>
  </form>
</template>
