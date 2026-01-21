<script setup lang="ts">
interface Props {
  title?: string
  description?: string
}
const { title, description } = defineProps<Props>()
</script>

<template>
  <div class="flex flex-col items-center justify-center p-8 text-center h-full">
    <UIcon name="i-heroicons-arrow-path" class="size-12 text-primary mb-4 animate-spin" />
    <h3 v-if="title" class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
      {{ title }}
    </h3>
    <p v-if="description" class="text-sm text-gray-500">
      {{ description }}
    </p>
  </div>
</template>
