<script lang="ts" setup>
defineProps<{ loading: boolean }>()

const message = ref('')
const emit = defineEmits<{ message: [message: string] }>()

const sendMessage = () => {
  if (!message.value.trim()) return
  emit('message', message.value)
  message.value = ''
}

const quickChats = [
  {
    label: '¿Cómo se describe la gestión de la integración del proyecto?',
    icon: 'i-heroicons-squares-2x2',
  },
  {
    label: '¿Qué metodologías de gestión del alcance se mencionan?',
    icon: 'i-heroicons-document-text',
  },
  {
    label: '¿Cómo se aborda la gestión del tiempo y cronograma?',
    icon: 'i-heroicons-clock',
  },
  {
    label: '¿Qué estrategias de gestión de costos se detallan?',
    icon: 'i-heroicons-currency-dollar',
  },
  {
    label: '¿Cómo se maneja la gestión de la calidad en el proyecto?',
    icon: 'i-heroicons-check-circle',
  },
  {
    label: '¿Qué aspectos de la gestión de recursos humanos se cubren?',
    icon: 'i-heroicons-users',
  },

]
</script>

<template>
  <UContainer class="flex-1 flex flex-col justify-center gap-4 sm:gap-6 py-8">
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
        class="rounded-full"
        @click="() => { message = quickChat.label; sendMessage() }"
      />
    </div>
  </UContainer>

  <div class="flex items-start p-3.5 relative">
    <UTextarea
      v-model="message"
      placeholder="Ask a question about this document..."
      class="w-full"
      :ui="{ base: ['pr-11'] }"
      :rows="1"
      :maxrows="5"
      :disabled="loading"
      autoresize
      size="xl"
      @keydown.enter.exact.prevent="sendMessage"
      @keydown.enter.shift.exact.prevent="message += '\n'"
    />

    <UButton
      size="sm"
      icon="i-heroicons-arrow-up-20-solid"
      class="absolute top-5 right-5"
      :disabled="loading "
      @click="sendMessage"
    />
  </div>
</template>
