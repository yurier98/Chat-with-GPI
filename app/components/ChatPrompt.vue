<script setup lang="ts">
import type { SelectItem } from '@nuxt/ui'

defineProps<{ 
  loading: boolean
}>()

const { model } = useLLM()

const availableModels = ref([
  {
    label: 'Gemini 2.5 Pro',
    value: 'backlog',
    icon: 'i-simple-icons-googlegemini',
  },
  {
    label: 'GPT-4o',
    value: 'todo',
    icon: 'i-simple-icons-openai',
  },
  {
    label: 'Claude 3.5 Sonnet',
    value: 'in_progress',
    icon: 'i-simple-icons-anthropic',
  },
  {
    label: 'Llama 4',
    value: 'done',
    icon: 'i-simple-icons-ollama',
  },
] satisfies SelectItem[])
const value = ref(availableModels.value[0]?.value)

const icon = computed(() => availableModels.value.find((item: any) => item.value === value.value)?.icon)

const emit = defineEmits(['message'])

const message = ref('')

// Preguntas frecuentes
const frequentQuestions = [
  {
    icon: 'i-lucide-file-text',
    title: 'Resumen del documento',
    question: '¿Puedes hacer un resumen de este documento?',
  },
  {
    icon: 'i-lucide-search',
    title: 'Buscar información específica',
    question: '¿Qué dice el documento sobre [tema específico]?',
  },
  {
    icon: 'i-lucide-list-checks',
    title: 'Lista de puntos clave',
    question: '¿Cuáles son los puntos clave de este documento?',

  },
  {
    icon: 'i-lucide-help-circle',
    title: 'Explicar concepto',
    question: '¿Puedes explicar [concepto] mencionado en el documento?',
  },
  {
    icon: 'i-lucide-compare',
    title: 'Comparar secciones',
    question: '¿Cómo se relacionan las secciones [A] y [B] del documento?',
  },
  {
    icon: 'i-lucide-lightbulb',
    title: 'Generar ideas',
    question: '¿Qué ideas o recomendaciones surgen de este documento?',
  },
]

// Función para seleccionar una pregunta
function selectQuestion(question: string) {
  message.value = question
  // Enviar automáticamente la pregunta
  emit('message', question, value.value)
  message.value = ''
}

function sendMessage() {
  if (!message.value.trim()) return
  emit('message', message.value, value.value)
  message.value = ''
}
</script>

<template>
  <div class="w-full absolute sticky bottom-0 [view-transition-name:chat-prompt] z-10 inset-x-0 flex flex-col items-center p-4">
    <form class="relative flex flex-col items-stretch gap-2 py-2 w-full rounded-2xl backdrop-blur bg-elevated/50 ring ring-default" @submit.prevent="sendMessage">
      <div class="relative inline-flex items-start w-full">
        <UTextarea
          v-model="message"
          :placeholder="`Pregunta algo de tu documento aquí...`"
          :rows="1"
          variant="none"
          autoresize
          size="xl"
          class="w-full rounded-md  px-2.5 py-1 gap-1"
          :ui="{ base: 'overflow-hidden' }"
          :disabled="loading"
          @keydown.enter.prevent="sendMessage"
        />
      </div>
      <div class="flex justify-between items-center px-2 gap-2">
        <ModelSelect />
        <div class="flex items-center gap-2">
          <!-- Popover de preguntas frecuentes -->
          <UPopover mode="hover" >
            <UButton
              icon="i-lucide-lightbulb"
              color="neutral"
              variant="ghost"
              size="sm"
              class="rounded-full"
              :disabled="loading"
            />

            <template #content>
              <div class="w-80 p-4">
                <div class="flex items-center gap-2 mb-4">
                  <UIcon name="i-lucide-lightbulb" class="size-5 text-yellow-500" />
                  <h3 class="font-semibold text-gray-900 dark:text-gray-100">
                    Preguntas frecuentes
                  </h3>
                </div>

                <div class="space-y-3">
                  <div
                    v-for="(item, index) in frequentQuestions"
                    :key="index"
                    class="group p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                    @click="selectQuestion(item.question)"
                  >
                    <div class="flex items-start gap-2">
                      <div class="flex-shrink-0 mt-0.5">
                        <UIcon :name="item.icon" class="size-4 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {{ item.title }}
                        </h4>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {{ item.question }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    Haz clic en cualquier pregunta para usarla como punto de partida
                  </p>
                </div>
              </div>
            </template>
          </UPopover>

          <BtnUploader />
          <UButton
            type="submit"
            icon="i-lucide:arrow-up"
            size="sm"
            class="rounded-full"
            :disabled="loading || !message.trim()"
          />
        </div>
      </div>
    </form>
  </div>
</template>
