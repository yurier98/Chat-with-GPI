<script setup lang="ts">
interface Document {
  name: string
  size: number
  chunks: number | null
  progress?: string
}

interface Props {
  documents: Document[]
  exampleSessions?: Array<{
    id: string
    name: string
  }>
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'setExampleSession', id: string): void
  (e: 'deleteDocument', documentName: string): void
}>()

function setExampleSession(exampleSessionId: string) {
  emit('setExampleSession', exampleSessionId)
}

function handleDeleteDocument(documentName: string) {
  emit('deleteDocument', documentName)
}
</script>

<template>
  <div class="space-y-2 overflow-y-auto flex flex-col">
    <h2 class="mb-2 text-lg font-semibold text-primary">
      Documentos subidos
    </h2>
    <div v-for="(document, i) in documents" :key="document.name" class="py-1 group">
      <div class="flex items-start justify-between">
        <div class="flex-1 min-w-0">
          <p class="font-medium text-sm mb-1 truncate text-zinc-700 dark:text-zinc-300">
            {{ document.name }}
          </p>
          <p class="text-zinc-500 text-xs">
            {{ document.size }} MB
            <template v-if="document.chunks">
              &#x2022; {{ document.chunks }} chunks
            </template>
          </p>
          <div v-if="document.progress" class="mt-0.5 flex items-center px-1.5 gap-2">
            <LoadingIcon class="size-2" />
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
          class="opacity-0 group-hover:opacity-100 transition-opacity"
          @click="handleDeleteDocument(document.name)"
        />
      </div>

      <USeparator v-if="i < documents.length - 1" class="mt-3" />
    </div>

    <p v-if="!documents.length" class="text-zinc-700 dark:text-zinc-300">
      No hay documentos subidos
    </p>

    <template v-if="!documents.length && exampleSessions">
      <p class="mt-3">
        Prueba un documento de ejemplo:
      </p>
      <ul class="space-y-2 text-xs truncate cursor-pointer text-blue-500">
        <li
          v-for="example in exampleSessions"
          :key="example.id"
          @click="setExampleSession(example.id)"
        >
          {{ example.name }}
        </li>
      </ul>
    </template>
  </div>
</template>
