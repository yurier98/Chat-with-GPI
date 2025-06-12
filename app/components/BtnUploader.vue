<template>
  <UPopover mode="hover">
        <UButton
        icon="i-lucide:paperclip"
        color="neutral"
        variant="ghost"
        class="rounded-full"
        @click="open"
  />
    <template #content>
                <ul class="gap-2 px-2.5 py-2 text-xs">
                    <li>Cantidad de archivos: Hasta 5 archivos a la vez</li>
                    <li>Tamaño de archivo: Hasta 8MB por archivo</li>
                    <li>Recuento total de palabras: Hasta 100K palabras</li>
                    <li>Tipos de archivo: pdf</li>
                </ul>
    </template>
  </UPopover>
</template>

<script lang="ts" setup>
import type { UploadStreamResponse } from '~/types'

const emit = defineEmits<{
  (e: 'documentUploaded', document: { name: string; size: number; chunks: number | null }): void
  (e: 'uploadError', error: { fileName: string; message: string }): void
}>()

const toast = useToast()
const documents = useDocuments()

// click to upload
const { open, onChange, reset } = useFileDialog({
  accept: 'application/pdf',
})
onChange((files: File[] | FileList | null) => uploadFile(files))

async function uploadFile(files: File[] | FileList | null) {
  if (!files) return
  if (props.isExampleSession) {
    return toast.add({
      title: 'Sesión de ejemplo',
      description: 'No se pueden subir archivos a sesiones de ejemplo. Recarga la página para iniciar una nueva sesión.',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }

  for (const file of files) {
    const form = new FormData()
    form.append('file', file)
    form.append('sessionId', props.sessionId)

    documents.value.push({
      name: file.name,
      size: (Math.round((file.size / 1024 / 1024) * 1000) / 1000), // truncate up to 3 decimal places
      chunks: null,
      progress: 'Iniciando subida...',
    })
    const document = documents.value.find((doc: { name: string }) => doc.name === file.name)

    try {
      const response = useStream<UploadStreamResponse>('/api/upload', form)()
      for await (const chunk of response) {
        if (chunk.message) document!.progress = chunk.message
        if (chunk.chunks) document!.chunks = chunk.chunks
        if (chunk.error) throw new Error(chunk.error)
      }

      if (document) {
        delete document.progress // remove progress when done
        emit('documentUploaded', {
          name: document.name,
          size: document.size,
          chunks: document.chunks,
        })
      }

      toast.add({
        id: file.name,
        title: 'Archivo subido correctamente',
        description: file.name,
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })
    }
    catch (error) {
      toast.add({
        id: file.name,
        title: 'Error al subir archivo',
        // @ts-expect-error unknown error type
        description: `Ocurrió un error al subir ${file.name}. ${error?.message}`,
        color: 'error',
        icon: 'i-heroicons-exclamation-circle',
      })
      documents.value = documents.value.filter((doc: { name: string }) => doc.name !== file.name)
      emit('uploadError', {
        fileName: file.name,
        // @ts-expect-error unknown error type
        message: error?.message || 'Error desconocido',
      })
    }
  }
  reset()
}

</script>

<style>

</style>