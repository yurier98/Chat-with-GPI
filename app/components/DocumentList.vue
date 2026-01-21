<script setup lang="ts">
import type { Document } from '~/types'

// Tipo extendido para documentos con propiedades de UI
interface DocumentWithUI extends Document {
  chunks?: number
  progress?: string
}

interface Props {
  documents: DocumentWithUI[]
  maxHeight?: string
}

const props = withDefaults(defineProps<Props>(), {
  maxHeight: 'calc(100vh - 200px)',
})

const emit = defineEmits<{
  (e: 'deleteDocument', documentId: string): void
}>()

function handleDeleteDocument(documentId: string) {
  emit('deleteDocument', documentId)
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header fijo -->
    <div class="flex-shrink-0 mb-4 px-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-primary">
          Documentos subidos
        </h2>
        <!-- Estado de documentos con popover -->
        <UPopover mode="hover">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-information-circle"
            size="sm"
          />

          <template #content>
            <DocumentStatusSimple />
          </template>
        </UPopover>
      </div>
    </div>

    <!-- Contenedor con scroll -->
    <div
      class="flex-1 overflow-y-auto pr-2"
      :style="{ maxHeight: maxHeight }"
    >
      <div class="space-y-0 px-4">
        <div v-for="(document, i) in documents" :key="document.id" class="group">
          <UTooltip
            arrow
            :content="{
              side: 'right',
            }"
            :text="document.name"
          >
            <div class="flex items-start justify-between p-2 px-4 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <div class="flex-1 min-w-0">
                <p class="font-medium text-sm mb-1 truncate text-zinc-700 dark:text-zinc-300">
                  {{ document.name }}
                </p>
                <p class="text-zinc-500 text-xs">
                  {{ (document.size / (1024 * 1024)).toFixed(2) }} MB
                  <template v-if="document.chunks">
                    &#x2022; {{ document.chunks }} chunks
                  </template>
                </p>
                <div v-if="document.progress" class="mt-1 flex items-center gap-2">
                  <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-primary" />
                  <p class="text-zinc-400 text-xs">
                    {{ document.progress }}
                  </p>
                </div>
              </div>
              <UButton
                v-if="!document.progress"
                icon="i-heroicons-trash"
                color="error"
                variant="ghost"
                size="sm"
                class="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                @click="handleDeleteDocument(document.id)"
              />
            </div>
          </UTooltip>

          <USeparator v-if="i < documents.length - 1" class="mt-0" />
        </div>

        <!-- Estado vacío -->
        <div v-if="!documents.length" class="text-center py-8">
          <div class="flex flex-col items-center gap-3">
            <UIcon 
              name="i-heroicons-document-text" 
              class="w-12 h-12 text-gray-300 dark:text-gray-600" 
            />
            <div>
              <p class="text-gray-500 dark:text-gray-400 text-sm font-medium">
                No hay documentos subidos
              </p>
              <p class="text-gray-400 dark:text-gray-500 text-xs mt-1">
                Sube tu primer documento PDF para comenzar
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Estilos personalizados para el scroll */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgb(161 161 170);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgb(113 113 122);
}

.dark .overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgb(82 82 91);
}

.dark .overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgb(113 113 122);
}
</style>
