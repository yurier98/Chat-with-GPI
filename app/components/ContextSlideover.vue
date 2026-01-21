<script setup lang="ts">
const props = defineProps<{
  queries: string[]
  relevantContext: Array<{
    text: string
    documentName?: string
    documentId?: string
  }>
  isProvided: boolean
}>()

// El componente está listo para mostrar el contexto
</script>

<template>
  <!-- Mostrar siempre para debug -->
  <USlideover title="Fuentes y contexto de la respuesta">
    <UButton
      icon="i-lucide-file-text"
      label="Ver fuente"
      size="sm"
      color="neutral"
      variant="ghost"
      class="rounded-full"
    >
      Ver fuentes
    </UButton>

    <template #body>
      <div class="space-y-6">
        <!-- Sección de Queries Semánticas -->
        <div v-if="props.queries && props.queries.length > 0">
          <h3 class="font-semibold text-md mb-3 flex items-center gap-2">
            🔍 Consultas de búsqueda generadas
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            El asistente generó estas consultas para buscar información relevante en tus documentos:
          </p>
          <div class="space-y-2">
            <div
              v-for="(query, index) in props.queries"
              :key="index"
              class="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
            >
              <p class="text-sm text-blue-800 dark:text-blue-200 font-medium">
                {{ query }}
              </p>
            </div>
          </div>
        </div>

        <!-- Separador -->
        <USeparator v-if="props.queries?.length > 0 && props.relevantContext?.length > 0" />

        <!-- Sección de Fuentes Encontradas -->
        <div>
          <h3 class="font-semibold text-md mb-3 flex items-center gap-2">
            📚 Fuentes utilizadas para generar la respuesta
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Fragmentos de documentos encontrados que se utilizaron para generar la respuesta:
          </p>

          <!-- Mensaje cuando no hay contexto -->
          <div v-if="!props.relevantContext || props.relevantContext.length === 0" class="text-center py-8">
            <UIcon name="i-heroicons-document-magnifying-glass" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p class="text-gray-500 dark:text-gray-400">
              No se encontraron fuentes relevantes para esta respuesta.
            </p>
          </div>

          <!-- Fuentes encontradas -->
          <div v-if="props.relevantContext && props.relevantContext.length > 0" class="space-y-4">
            <UCard
              v-for="(context, i) in props.relevantContext"
              :key="i"
              :ui="{ body: ['p-4 sm:p-3'], header: ['p-4 sm:p-3'] }"
            >
              <template #header>
                <span class="text-sm font-semibold">
                  📄 {{ context.documentName || 'Documento desconocido' }}
                </span>
              </template>
              <!-- Contenido del fragmento -->
              <div class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {{ context.text || 'Sin texto disponible' }}
              </div>
            </UCard>
          </div>
        </div>

        <!-- Mensaje cuando no hay ni queries ni contexto -->
        <div v-if="(!props.queries || props.queries.length === 0) && (!props.relevantContext || props.relevantContext.length === 0)" class="text-center py-8">
          <UIcon name="i-heroicons-question-mark-circle" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p class="text-gray-500 dark:text-gray-400">
            No hay información de contexto disponible para esta respuesta.
          </p>
        </div>
      </div>
    </template>
  </USlideover>
</template>
