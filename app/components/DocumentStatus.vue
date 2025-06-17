<script setup lang="ts">
import type { DocumentStatus } from '~/types'

const loading = ref(false)
const repairing = ref(false)
const migrating = ref(false)
const settingUp = ref(false)
const debugging = ref(false)
const status = ref<DocumentStatus | null>(null)
const error = ref<string | null>(null)
const debugInfo = ref<unknown>(null)
const repairingDocuments = ref<Set<string>>(new Set())
const documentProgress = ref<Map<string, { message: string; progress: number }>>(new Map())

async function checkDocumentStatus() {
  loading.value = true
  error.value = null

  try {
    const data = await $fetch<DocumentStatus>('/api/documents/status')
    status.value = data
  }
  catch (err) {
    console.error('Error al verificar estado de documentos:', err)
    error.value = err instanceof Error ? err.message : 'Error desconocido'
  }
  finally {
    loading.value = false
  }
}

async function repairDocuments() {
  repairing.value = true
  error.value = null

  try {
    const result = await $fetch<{ message: string }>('/api/documents/repair', {
      method: 'POST',
    })

    // Actualizar el estado después de la reparación
    await checkDocumentStatus()

    // Mostrar notificación de éxito
    const toast = useToast()
    toast.add({
      title: 'Reparación completada',
      description: result.message,
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
  }
  catch (err) {
    console.error('Error al reparar documentos:', err)
    error.value = err instanceof Error ? err.message : 'Error al reparar documentos'

    // Mostrar notificación de error
    const toast = useToast()
    toast.add({
      title: 'Error en reparación',
      description: error.value,
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
  finally {
    repairing.value = false
  }
}

async function migrateDocuments() {
  migrating.value = true
  error.value = null

  try {
    const result = await $fetch<{ message: string }>('/api/documents/migrate', {
      method: 'POST',
    })

    // Actualizar el estado después de la migración
    await checkDocumentStatus()

    // Mostrar notificación de éxito
    const toast = useToast()
    toast.add({
      title: 'Migración completada',
      description: result.message,
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
  }
  catch (err) {
    console.error('Error al migrar documentos:', err)
    error.value = err instanceof Error ? err.message : 'Error al migrar documentos'

    // Mostrar notificación de error
    const toast = useToast()
    toast.add({
      title: 'Error en migración',
      description: error.value,
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
  finally {
    migrating.value = false
  }
}

async function setupDatabase() {
  settingUp.value = true
  error.value = null

  try {
    const result = await $fetch<{ message: string, success: boolean }>('/api/documents/setup', {
      method: 'POST',
    })

    // Actualizar el estado después de la configuración
    await checkDocumentStatus()

    // Mostrar notificación de éxito
    const toast = useToast()
    toast.add({
      title: result.success ? 'Configuración completada' : 'Configuración con advertencias',
      description: result.message,
      color: result.success ? 'success' : 'warning',
      icon: result.success ? 'i-heroicons-check-circle' : 'i-heroicons-exclamation-triangle',
    })
  }
  catch (err) {
    console.error('Error al configurar base de datos:', err)
    error.value = err instanceof Error ? err.message : 'Error al configurar base de datos'

    // Mostrar notificación de error
    const toast = useToast()
    toast.add({
      title: 'Error en configuración',
      description: error.value,
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
  finally {
    settingUp.value = false
  }
}

async function _debugSystem() {
  debugging.value = true
  error.value = null

  try {
    const result = await $fetch('/api/documents/debug')
    debugInfo.value = result

    // Mostrar notificación de éxito
    const toast = useToast()
    toast.add({
      title: 'Diagnóstico completado',
      description: 'Se ha obtenido información de diagnóstico del sistema',
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
  }
  catch (err) {
    console.error('Error en diagnóstico:', err)
    error.value = err instanceof Error ? err.message : 'Error en diagnóstico'

    // Mostrar notificación de error
    const toast = useToast()
    toast.add({
      title: 'Error en diagnóstico',
      description: error.value,
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
  finally {
    debugging.value = false
  }
}

async function testQuery() {
  try {
    // Obtener el sessionId actual (puedes ajustar esto según tu lógica)
    const sessionId = 'default' // O el sessionId real

    const result = await $fetch('/api/query-test', {
      method: 'POST',
      body: {
        query: '¿Qué documentos tienes disponibles?',
        sessionId,
      },
    })

    console.log('Resultado de prueba de consulta:', result)

    // Mostrar notificación de éxito
    const toast = useToast()
    toast.add({
      title: 'Prueba de consulta completada',
      description: 'Consulta ejecutada correctamente. Revisa la consola para ver los detalles.',
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
  }
  catch (err) {
    console.error('Error en prueba de consulta:', err)
    // Mostrar notificación de error
    const toast = useToast()
    toast.add({
      title: 'Error en prueba de consulta',
      description: err instanceof Error ? err.message : 'Error desconocido',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
}

async function repairSingleDocument(documentId: string) {
  repairingDocuments.value.add(documentId)
  error.value = null
  documentProgress.value.set(documentId, { message: 'Iniciando reparación...', progress: 0 })

  try {
    // Simular progreso básico
    documentProgress.value.set(documentId, { message: 'Procesando documento...', progress: 25 })
    
    const response = await $fetch('/api/documents/repair', {
      method: 'POST',
      body: { documentId },
    })

    // Simular progreso durante el procesamiento
    documentProgress.value.set(documentId, { message: 'Generando embeddings...', progress: 75 })

    // Actualizar el estado después de la reparación
    await checkDocumentStatus()

    // Completar progreso
    documentProgress.value.set(documentId, { message: 'Completado', progress: 100 })

    const toast = useToast()
    toast.add({
      title: 'Documento reprocesado',
      description: response.message || 'Reparación completada',
      color: 'success',
      icon: 'i-heroicons-check-circle',
    })
  }
  catch (err) {
    console.error('Error al reprocesar documento:', err)
    error.value = err instanceof Error ? err.message : 'Error al reprocesar documento'

    const toast = useToast()
    toast.add({
      title: 'Error en reprocesamiento',
      description: error.value,
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  }
  finally {
    // Limpiar progreso después de un breve delay para que se vea completado
    setTimeout(() => {
      repairingDocuments.value.delete(documentId)
      documentProgress.value.delete(documentId)
    }, 1000)
  }
}

// Verificar estado al montar el componente
onMounted(() => {
  checkDocumentStatus()
})
</script>

<template>
  <UCard>
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Estado de Documentos
      </h3>
      <UButton
        icon="i-heroicons-arrow-path"
        size="sm"
        :loading="loading"
        @click="checkDocumentStatus"
      >
        Actualizar
      </UButton>
    </div>

    <div v-if="error" class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
      <p class="text-red-700 dark:text-red-300 text-sm">
        {{ error }}
      </p>
    </div>

    <div v-if="status" class="space-y-4">
      <!-- Estadísticas generales -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {{ status.statistics.totalDocuments }}
          </div>
          <div class="text-xs text-blue-700 dark:text-blue-300">
            Documentos
          </div>
        </div>
        <div class="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div class="text-2xl font-bold text-green-600 dark:text-green-400">
            {{ status.statistics.totalChunks }}
          </div>
          <div class="text-xs text-green-700 dark:text-green-300">
            Chunks
          </div>
        </div>
        <div class="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {{ status.statistics.totalVectors }}
          </div>
          <div class="text-xs text-purple-700 dark:text-purple-300">
            Vectores
          </div>
        </div>
        <div class="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <div class="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {{ status.statistics.averageChunksPerDocument }}
          </div>
          <div class="text-xs text-orange-700 dark:text-orange-300">
            Chunks/Doc
          </div>
        </div>
      </div>

      <!-- Diagnóstico -->
      <UCard>
        <h4 class="font-medium text-gray-900 dark:text-gray-100 mb-3">
          Diagnóstico del Sistema
        </h4>
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <UIcon
              :name="status.diagnostics.hasDocuments ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
              :class="status.diagnostics.hasDocuments ? 'text-green-500' : 'text-red-500'"
            />
            <span class="text-sm">
              Documentos disponibles
            </span>
          </div>
          <div class="flex items-center gap-2">
            <UIcon
              :name="status.diagnostics.hasChunks ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
              :class="status.diagnostics.hasChunks ? 'text-green-500' : 'text-red-500'"
            />
            <span class="text-sm">
              Chunks procesados
            </span>
          </div>
          <div class="flex items-center gap-2">
            <UIcon
              :name="status.diagnostics.hasVectors ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
              :class="status.diagnostics.hasVectors ? 'text-green-500' : 'text-red-500'"
            />
            <span class="text-sm">
              Vectores generados
            </span>
          </div>
          <div class="flex items-center gap-2">
            <UIcon
              :name="status.diagnostics.isProperlyVectorized ? 'i-heroicons-check-circle' : 'i-heroicons-exclamation-triangle'"
              :class="status.diagnostics.isProperlyVectorized ? 'text-green-500' : 'text-yellow-500'"
            />
            <span class="text-sm">
              Sistema listo para consultas
            </span>
          </div>
        </div>
      </UCard>

      <!-- Documentos de muestra -->
      <UCard v-if="status.sampleDocuments.length > 0">
        <h4 class="font-medium text-gray-900 dark:text-gray-100 mb-3">
          Documentos de Muestra
        </h4>
        <div class="space-y-2">
          <div
            v-for="doc in status.sampleDocuments"
            :key="doc.id"
            class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
          >
            <div class="flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {{ doc.name }}
              </p>
              <!-- Barra de progreso para documentos en reparación -->
              <div v-if="repairingDocuments.has(doc.id) && documentProgress.has(doc.id)" class="mt-2">
                <div class="flex items-center gap-2 mb-1">
                  <div class="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      :style="{ width: `${documentProgress.get(doc.id)?.progress || 0}%` }"
                    />
                  </div>
                  <span class="text-xs text-gray-600 dark:text-gray-400">
                    {{ Math.round(documentProgress.get(doc.id)?.progress || 0) }}%
                  </span>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ documentProgress.get(doc.id)?.message }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-600 dark:text-gray-400">
                {{ doc.chunksCount }} chunks
              </span>
              <UIcon
                :name="doc.chunksCount > 0 ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                :class="doc.chunksCount > 0 ? 'text-green-500' : 'text-red-500'"
                class="w-4 h-4"
              />
              <!-- Botón de reprocesamiento para documentos con 0 chunks -->
              <UButton
                v-if="doc.chunksCount === 0"
                icon="i-heroicons-wrench-screwdriver"
                color="warning"
                size="xs"
                :loading="repairingDocuments.has(doc.id)"
                :disabled="repairingDocuments.has(doc.id)"
                @click="repairSingleDocument(doc.id)"
              >
                {{ repairingDocuments.has(doc.id) ? 'Reparando...' : 'Reparar' }}
              </UButton>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Recomendaciones -->
      <div v-if="!status.diagnostics.isProperlyVectorized" class="border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
        <h4 class="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
          ⚠️ Problemas Detectados
        </h4>
        <ul class="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 mb-4">
          <li v-if="!status.diagnostics.hasDocuments">
            • No hay documentos subidos. Sube algunos documentos PDF para comenzar.
          </li>
          <li v-if="status.diagnostics.hasDocuments && !status.diagnostics.hasChunks">
            • Los documentos no han sido procesados correctamente. Intenta subirlos nuevamente.
          </li>
          <li v-if="status.diagnostics.hasChunks && !status.diagnostics.hasVectors">
            • Los chunks no han sido vectorizados. Esto puede indicar un problema con el servicio de IA.
          </li>
        </ul>

        <!-- Botón de reparación -->
        <div v-if="status.diagnostics.hasDocuments && (!status.diagnostics.hasChunks || !status.diagnostics.hasVectors)" class="flex gap-2">
          <UButton
            icon="i-heroicons-wrench-screwdriver"
            color="warning"
            size="sm"
            :loading="repairing"
            @click="repairDocuments"
          >
            {{ repairing ? 'Reparando...' : 'Reparar Documentos' }}
          </UButton>
          <UButton
            icon="i-heroicons-arrow-path"
            color="neutral"
            size="sm"
            :loading="loading"
            @click="checkDocumentStatus"
          >
            Actualizar
          </UButton>
        </div>

        <!-- Botón de migración para documentos sin user_id -->
        <div class="flex gap-2 mt-2">
          <UButton
            icon="i-heroicons-arrow-up-circle"
            color="primary"
            size="sm"
            :loading="migrating"
            @click="migrateDocuments"
          >
            {{ migrating ? 'Migrando...' : 'Migrar Documentos' }}
          </UButton>
          <UButton
            icon="i-heroicons-cog-6-tooth"
            color="secondary"
            size="sm"
            :loading="settingUp"
            @click="setupDatabase"
          >
            {{ settingUp ? 'Configurando...' : 'Configurar BD' }}
          </UButton>
          <UButton
            icon="i-heroicons-magnifying-glass"
            color="info"
            size="sm"
            @click="testQuery"
          >
            Probar Consulta
          </UButton>
        </div>
      </div>
    </div>
  </UCard>
</template>
