<script setup lang="ts">
// Título de la página
useHead({
  title: 'Estado de Documentos - Chat con GPI',
})
</script>

<template>
  <div class="min-h-screen bg-zinc-50 dark:bg-zinc-950">
    <!-- Header -->
    <div class="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center">
            <UButton
              icon="i-heroicons-arrow-left"
              color="neutral"
              variant="ghost"
              @click="navigateTo('/')"
            />
            <h1 class="ml-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
              Estado de Documentos
            </h1>
          </div>
        </div>
      </div>
    </div>

    <!-- Contenido -->
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <DocumentStatus />
    </div>
  </div>
</template> 