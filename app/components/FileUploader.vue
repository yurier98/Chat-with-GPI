<script setup lang="ts">
// Tipo local para documentos con propiedades de UI
interface DocumentWithUI {
  id: string
  name: string
  size: number
  text_content: string | null
  storage_url: string
  user_id: string
  created_at: string
  progress?: string
  chunks?: number | null
}

interface UploadStreamResponse {
  message?: string
  progress?: number
  chunks?: number
  error?: string
}

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

// drag and drop
const dropZoneRef = ref<HTMLDivElement>()
const { isOverDropZone } = useDropZone(dropZoneRef, {
  onDrop: uploadFile,
  dataTypes: ['application/pdf'],
  multiple: true,
  preventDefaultForUnhandled: true,
})

async function uploadFile(files: File[] | FileList | null) {
  if (!files) return

  for (const file of files) {
    const form = new FormData()
    form.append('file', file)

    console.log('--- Iniciando proceso de subida para archivo:', file.name)
    console.log('Estado actual de documents.value antes de buscar:', JSON.parse(JSON.stringify(documents.value)))

    // Encontrar el índice de un documento existente con el mismo nombre
    const existingDocIndex = documents.value.findIndex((doc: DocumentWithUI) => doc.name === file.name)
    console.log('Resultado de existingDocIndex:', existingDocIndex)
    let documentToProcess: DocumentWithUI

    if (existingDocIndex !== -1) {
      console.log('Documento existente encontrado. Actualizando...')
      // Si el documento existe, actualiza su estado de progreso
      const currentDoc = documents.value[existingDocIndex]
      documentToProcess = {
        ...currentDoc,
        progress: 'Iniciando subida...',
        chunks: null, // Reiniciar chunks si se vuelve a subir o procesar
      }
      // Reemplazar el array completo para asegurar la reactividad
      documents.value = documents.value.map((doc: DocumentWithUI, index: number) =>
        index === existingDocIndex ? documentToProcess : doc,
      )
      console.log('Estado de documents.value después de actualizar existente:', JSON.parse(JSON.stringify(documents.value)))
    }
    else {
      console.log('Documento no encontrado. Añadiendo nuevo...')
      // Si el documento no existe, añade uno nuevo
      documentToProcess = {
        id: crypto.randomUUID(), // Generar un ID único para el documento
        name: file.name,
        size: file.size, // Usar el tamaño real del archivo
        text_content: '', // Inicialmente vacío
        storage_url: '', // Se llenará después de la subida
        user_id: '', // Se llenará después de la autenticación
        created_at: new Date().toISOString(),
        chunks: null,
        progress: 'Iniciando subida...',
      }
      documents.value = [...documents.value, documentToProcess] // Reemplazar el array completo
      console.log('Estado de documents.value después de añadir nuevo:', JSON.parse(JSON.stringify(documents.value)))
    }

    // Una pequeña salvaguarda, aunque 'documentToProcess' siempre debería estar definido ahora
    if (!documentToProcess) {
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
        const currentDocIndex = documents.value.findIndex((doc: DocumentWithUI) => doc.id === documentToProcess.id)
        if (currentDocIndex !== -1) {
          documents.value = documents.value.map((d: DocumentWithUI, index: number) =>
            index === currentDocIndex
              ? {
                  ...d,
                  progress: chunk.message || d.progress,
                  chunks: chunk.chunks || d.chunks,
                }
              : d,
          )
        }

        if (chunk.error) throw new Error(chunk.error)
      }

      // Al finalizar, actualiza el documento con su estado final
      const finalDocIndex = documents.value.findIndex((doc: DocumentWithUI) => doc.id === documentToProcess.id)
      if (finalDocIndex !== -1) {
        const finalDoc = documents.value[finalDocIndex]
        if (finalDoc) {
          documents.value = documents.value.map((doc: DocumentWithUI, index: number) =>
            index === finalDocIndex
              ? {
                  ...doc,
                  progress: undefined, // Eliminar el estado de progreso
                }
              : doc,
          )
          emit('documentUploaded', {
            name: finalDoc.name,
            size: finalDoc.size,
            chunks: finalDoc.chunks || null,
          })
        }
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
      // Si hay un error, elimina el documento de la lista
      documents.value = documents.value.filter((doc: DocumentWithUI) => doc.id !== documentToProcess.id)
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

<template>
  <UCard
    ref="dropZoneRef"
    class="transition-all flex flex-grow mb-2 cursor-pointer hover:ring-primary"
    :class="{ 'ring-primary ring-opacity-50': isOverDropZone }"
    :ui="{ body: 'flex flex-col items-center justify-center' }"
    @click="open"
  >
    <p class="mb-1.5 text-lg font-semibold text-primary">
      Cargar un PDF
    </p>
    <p class="text-zinc-500">
      Arrastre y suelte o haga clic para cargar
    </p>
  </UCard>
</template>
