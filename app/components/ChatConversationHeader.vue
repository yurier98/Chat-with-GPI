<script setup lang="ts">
interface Props {
  conversationId?: string
  conversationTitle?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  showDrawer: []
  deleteConversation: [conversationId: string]
}>()
</script>

<template>
  <div class="flex items-center justify-between px-4 h-14 shrink-0">
    <div class="flex items-center gap-x-4">
      <UButton
        icon="i-heroicons-arrow-left"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="navigateTo('/')"
      />
      <div class="flex flex-col">
        <h2 class="text-lg text-zinc-900 dark:text-white font-semibold">
          {{ conversationTitle || 'Conversación' }}
        </h2>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          GPI Assistant
        </p>
      </div>
    </div>

    <div class="flex items-center gap-x-2">
      <!-- Botón de eliminar conversación -->
      <UButton
        v-if="conversationId"
        icon="i-heroicons-trash"
        color="neutral"
        variant="ghost"
        size="sm"
      />

      <ColorMode />

      <UButton
        icon="i-simple-icons-github"
        color="neutral"
        variant="ghost"
        size="sm"
        to="https://github.com/yurier98/chat-pdf-gpi"
        target="_blank"
      />
      <UButton
        icon="i-heroicons-bars-3"
        color="neutral"
        variant="ghost"
        size="sm"
        class="md:hidden"
        @click="emit('showDrawer')"
      />
    </div>
  </div>
</template>
