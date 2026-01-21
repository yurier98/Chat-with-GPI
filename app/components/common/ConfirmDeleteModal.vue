<script setup lang="ts">
const props = defineProps<{
  show: boolean
  title?: string
  message: string
}>()
const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const close = () => emit('cancel')
const confirm = () => emit('confirm')
</script>

<template>
  <UModal :model-value="props.show" @close="close" prevent-close>
    <div class="p-6 flex flex-col items-center">
      <div class="i-lucide-alert-triangle text-4xl text-red-500 mb-2" />
      <h3 class="text-lg font-semibold mb-2 text-center">
        {{ props.title || '¿Eliminar conversación?' }}
      </h3>
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-6 text-center">
        {{ props.message }}
      </p>
      <div class="flex gap-3 justify-center w-full">
        <UButton color="error" @click="confirm">
          Eliminar
        </UButton>
        <UButton color="neutral" variant="outline" @click="close">
          Cancelar
        </UButton>
      </div>
    </div>
  </UModal>
</template>
