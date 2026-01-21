<template>
  <UPopover mode="hover">
    <UButton
      icon="i-lucide:paperclip"
      size="sm"
      color="neutral"
      variant="ghost"
      class="rounded-full cursor-pointer"
      @click="open()"
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
import type { UploadStreamResponse, Document } from '~/types'

const emit = defineEmits<{
  (e: 'documentUploaded', document: { name: string, size: number, chunks: number | null }): void
  (e: 'uploadError', error: { fileName: string, message: string }): void
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

  for (const file of files) {
    const form = new FormData()
    form.append('file', file)

    // Encontrar el índice de un documento existente con el mismo nombre
    const existingDocIndex = documents.value.findIndex((doc: Document) => doc.name === file.name)
    let documentToUpdate: Document

    if (existingDocIndex !== -1) {
      // Si el documento existe, actualiza su estado de progreso
      const currentDoc = documents.value[existingDocIndex]
      documentToUpdate = {
        ...currentDoc,
        progress: 'Iniciando subida...',
        chunks: null, // Reiniciar chunks si se vuelve a subir o procesar
      }
      documents.value[existingDocIndex] = documentToUpdate // Reemplazar el objeto para asegurar la reactividad
    } else {
      // Si el documento no existe, añade uno nuevo
      documentToUpdate = {
        id: crypto.randomUUID(), // Generar un ID único para el documento
        name: file.name,
        size: (Math.round((file.size / 1024 / 1024) * 1000) / 1000), // truncar hasta 3 decimales
        chunks: null,
        progress: 'Iniciando subida...',
      }
      documents.value.push(documentToUpdate)
    }

    // Una pequeña salvaguarda, aunque 'documentToUpdate' siempre debería estar definido ahora
    if (!documentToUpdate) {
      toast.add({
        title: 'Error interno',
        description: 'No se pudo inicializar el documento para la subida.',
        color: 'error',
        icon: 'i-heroicons-exclamation-circle',
      })
      continue
    }

    try {
      const response = useStream<UploadStreamResponse>('/api/upload', form)()
      for await (const chunk of response) {
        // Encontrar el índice de nuevo usando el ID para asegurar que se actualiza el documento correcto
        const currentDocIndex = documents.value.findIndex((doc: Document) => doc.id === documentToUpdate.id)
        if (currentDocIndex !== -1) {
          const doc = documents.value[currentDocIndex]
          documents.value[currentDocIndex] = {
            ...doc,
            progress: chunk.message || doc.progress,
            chunks: chunk.chunks || doc.chunks,
          }
        }

        if (chunk.error) throw new Error(chunk.error)
      }

      // Al finalizar, actualiza el documento con su estado final
      const finalDocIndex = documents.value.findIndex((doc: Document) => doc.id === documentToUpdate.id)
      if (finalDocIndex !== -1) {
        const finalDoc = documents.value[finalDocIndex]
        documents.value[finalDocIndex] = {
          ...finalDoc,
          progress: undefined, // Eliminar el estado de progreso
        }
        emit('documentUploaded', {
          name: finalDoc.name,
          size: finalDoc.size,
          chunks: finalDoc.chunks,
        })
      }

      toast.add({
        id: file.name,
        title: 'Archivo subido correctamente',
        description: file.name,
        color: 'success',
        icon: 'i-heroicons-check-circle',
      })
    } catch (error) {
      toast.add({
        id: file.name,
        title: 'Error al subir archivo',
        // @ts-expect-error unknown error type
        description: `Ocurrió un error al subir ${file.name}. ${error?.message}`,
        color: 'error',
        icon: 'i-heroicons-exclamation-circle',
      })
      // Si hay un error, elimina el documento de la lista
      documents.value = documents.value.filter((doc: Document) => doc.id !== documentToUpdate.id)
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
