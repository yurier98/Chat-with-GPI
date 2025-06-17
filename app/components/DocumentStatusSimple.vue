<script setup lang="ts">
// Componente simple que solo muestra información básica
// y un enlace a la página de estado completa
</script>

<template>
  <div class="p-4 w-50">
    <div class="text-center">
      <UIcon name="i-heroicons-information-circle" class="w-8 h-8 text-blue-500 mx-auto mb-3" />
      <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Estado de Documentos
      </h3>
      <p class="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Verifica el estado de tus documentos, chunks y vectores
      </p>

      <UButton
        label="Ver estado completo"
        color="primary"
        class="w-full"
        @click="navigateTo('/documents-status')"
      />
    </div>
  </div>
</template> 