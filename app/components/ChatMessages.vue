<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue'
import { ref, watch, nextTick, onMounted } from 'vue'
import { useElementBounding, useEventListener, watchThrottled, useClipboard } from '@vueuse/core'

// Tipos para los mensajes (compatible con @ai-sdk/vue)
interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'data'
  content: string
}

interface ChatMessagesProps {
  messages?: Message[]
  status?: 'ready' | 'submitted' | 'streaming' | 'error'
  shouldAutoScroll?: boolean
  shouldScrollToBottom?: boolean
  autoScroll?: boolean
  spacingOffset?: number
  class?: any
  relevantContext?: { isProvided: boolean, context: any[] }
  queries?: string[]
  informativeMessage?: string
}

const props = withDefaults(defineProps<ChatMessagesProps>(), {
  autoScroll: true,
  shouldAutoScroll: true,
  shouldScrollToBottom: true,
  spacingOffset: 0,
})

const clipboard = useClipboard()
const toast = useToast()
const copied = ref(false)

const el = ref<HTMLElement | null>(null)
const parent = ref<HTMLElement | null>(null)
const messagesRefs = ref(new Map<string, HTMLElement>())

const showAutoScroll = ref(false)
const lastMessageHeight = ref(0)
const lastMessageSubmitted = ref(false)

function copy(message: Message) {
  clipboard.copy(message.content)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 2000)
  toast.add({
    title: 'Copiado al portapapeles',
    icon: 'i-lucide-check',
    color: 'success',
  })
}

function registerMessageRef(id: string, element: Element | ComponentPublicInstance | null) {
  let elInstance: HTMLElement | null = null

  if (element) {
    // Si es un ComponentPublicInstance, obtener el $el
    if ('$el' in element) {
      elInstance = element.$el
    }
    // Si es un Element directo
    else if (element instanceof HTMLElement) {
      elInstance = element
    }
  }

  if (elInstance) {
    messagesRefs.value.set(id, elInstance)
  }
}

function scrollToMessage(id: string) {
  const element = messagesRefs.value.get(id)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function scrollToBottom(smooth: boolean = true) {
  if (!el.value) {
    return
  }

  const scrollElement = el.value

  if (smooth) {
    scrollElement.scrollTo({
      top: scrollElement.scrollHeight,
      behavior: 'smooth',
    })
  }
  else {
    scrollElement.scrollTop = scrollElement.scrollHeight
  }
}

// Auto-scroll cuando hay streaming o cambian los mensajes
watchThrottled([() => props.messages, () => props.status], ([messages, status]) => {
  if (status === 'streaming' || status === 'submitted') {
    if (props.shouldAutoScroll) {
      requestAnimationFrame(() => nextTick(() => {
        scrollToBottom(true)
        // Verificar posición después del scroll
        setTimeout(checkScrollPosition, 100)
      }))
    }
    else {
      checkScrollPosition()
    }
  }
}, { throttle: 50, leading: true })

// También hacer scroll cuando se agregan nuevos mensajes
watch(() => props.messages?.length, () => {
  if (props.shouldAutoScroll) {
    nextTick(() => {
      scrollToBottom(true)
      // Verificar posición después del scroll
      setTimeout(checkScrollPosition, 100)
    })
  }
}, { flush: 'post' })

watch(() => props.status, (status) => {
  if (status !== 'submitted') {
    return
  }

  const lastMessage = props.messages?.[props.messages.length - 1]
  if (!lastMessage || lastMessage.role !== 'user') {
    return
  }

  nextTick(() => {
    lastMessageSubmitted.value = true
    updateLastMessageHeight()
    nextTick(() => {
      scrollToMessage(lastMessage.id)
    })
  })
})

function checkScrollPosition() {
  if (!el.value) {
    return
  }

  const scrollElement = el.value
  const scrollPosition = scrollElement.scrollTop + scrollElement.clientHeight
  const scrollHeight = scrollElement.scrollHeight
  const threshold = 50 // Reducido para que sea más sensible
  const isAtBottom = (scrollHeight - scrollPosition) < threshold

  showAutoScroll.value = !isAtBottom
}

function onAutoScrollClick() {
  scrollToBottom()
}

function getScrollParent(node: HTMLElement | null): HTMLElement {
  if (!node) {
    return document.documentElement
  }

  const overflowRegex = /auto|scroll/

  let current: HTMLElement | null = node
  while (current && current !== document.body && current !== document.documentElement) {
    const style = window.getComputedStyle(current)
    if (overflowRegex.test(style.overflowY)) {
      return current
    }

    current = current.parentElement
  }

  return document.documentElement
}

function updateLastMessageHeight() {
  if (!el.value || !parent.value || !props.messages?.length || !lastMessageSubmitted.value) {
    return
  }

  const { height: parentHeight } = useElementBounding(parent.value)

  const lastMessage = props.messages.findLast(m => m.role === 'user')
  if (!lastMessage) {
    return
  }

  const lastMessageEl = messagesRefs.value.get(lastMessage.id)
  if (!lastMessageEl) {
    return
  }

  let spacingOffset = props.spacingOffset || 0
  const elComputedStyle = window.getComputedStyle(el.value)
  const parentComputedStyle = window.getComputedStyle(parent.value)

  spacingOffset += Number.parseFloat(elComputedStyle.rowGap) || Number.parseFloat(elComputedStyle.gap) || 0
  spacingOffset += Number.parseFloat(parentComputedStyle.paddingTop) || 0
  spacingOffset += Number.parseFloat(parentComputedStyle.paddingBottom) || 0

  lastMessageHeight.value = Math.max(parentHeight.value - lastMessageEl.offsetHeight - spacingOffset, 0)
}

onMounted(() => {
  // Usar el elemento actual como contenedor de scroll
  parent.value = el.value
  if (!el.value) {
    return
  }

  if (props.shouldScrollToBottom) {
    nextTick(() => scrollToBottom(false))
  }
  else {
    checkScrollPosition()
  }

  useEventListener(el.value, 'scroll', checkScrollPosition)
  useEventListener(window, 'resize', () => nextTick(updateLastMessageHeight))
})
</script>

<template>
  <div class="relative h-full">
    <!-- Área de mensajes con scroll -->
    <div
      ref="el"
      :data-status="status"
      class="flex flex-col gap-4 p-4 h-full overflow-y-auto scroll-smooth max-w-2xl mx-auto"
      :style="{ '--last-message-height': `${lastMessageHeight}px` }"
    >
      <!-- Mensajes -->
      <template
        v-for="(message, index) in messages"
        :key="message.id || `temp-${index}-${message.role}-${message.content?.substring(0, 10)}`"
      >
        <!-- Mensaje del usuario -->
        <div v-if="message.role === 'user'" class="flex items-center self-end bg-zinc-200 dark:bg-zinc-900 rounded-xl px-3 py-1 max-w-[80%]">
          <p>{{ message.content }}</p>
        </div>

        <!-- Mensaje del asistente -->
        <div
          v-else-if="message.role === 'assistant'"
          :ref="el => registerMessageRef(message.id, el)"
          class="flex flex-col items-start relative max-w-[90%] w-full"
        >
          <!-- Contenedor del mensaje del asistente con icono -->
          <div class="flex items-start gap-3 w-full">
            <!-- Icono del bot -->
            <div class="flex-shrink-0 mt-1">
              <div class="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <UIcon name="i-lucide-bot" class="w-4 h-4 text-primary" />
              </div>
            </div>
            <!-- Mensaje del asistente -->
            <div class="flex-1 min-w-0">
              <AssistantMessage
                :content="message.content"
                class="py-3"
              />
              <!-- Botones alineados con el mensaje del asistente -->
              <div class="flex justify-start items-start w-full gap-2">
                <UButton
                  :icon="copied ? 'i-lucide-copy-check' : 'i-lucide-copy'"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  class="rounded-full"
                  @click="copy(message)"
                />
                <ContextSlideover
                  v-if="relevantContext?.isProvided && relevantContext.context.length > 0"
                  :queries="queries || []"
                  :relevant-context="relevantContext.context.map(ctx => ({
                    text: ctx.content || ctx.text || '',
                    documentName: ctx.document_name || ctx.documentName || 'Documento desconocido',
                    documentId: ctx.document_id || ctx.documentId,
                  }))"
                  :is-provided="relevantContext.isProvided"
                />
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Indicador de carga cuando está enviando -->
      <div
        v-if="status === 'submitted'"
        class="flex items-start gap-3 w-full max-w-[90%]"
      >
        <!-- Icono del bot -->
        <div class="flex-shrink-0 mt-1">
          <div class="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <UIcon name="i-lucide-bot" class="w-4 h-4 text-primary" />
          </div>
        </div>
        <!-- Indicador de escritura -->
        <div class="flex-1 min-w-0 py-3">
          <div class="flex gap-1 items-center">
            <div class="flex gap-1">
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms" />
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms" />
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms" />
            </div>
            <span class="text-sm text-gray-500 ml-2">Escribiendo...</span>
          </div>
        </div>
      </div>

      <!-- Mensaje informativo del estado del proceso -->
      <div class="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-10">
        <div v-if="informativeMessage" class="flex gap-1.5 items-center px-4 py-2">
          <LoadingIcon class="size-4 text-blue-600" />
          <p class="text-sm text-blue-700 dark:text-blue-300">
            {{ informativeMessage }}
          </p>
        </div>
      </div>
    </div>

    <!-- Botón de auto-scroll fijo en la parte inferior del componente -->
    <Transition
      enter-active-class="transition-all duration-200"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition-all duration-200"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="showAutoScroll && autoScroll"
        class="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10"
      >
        <UButton
          icon="i-lucide-arrow-down"
          color="neutral"
          variant="outline"
          size="sm"
          class="rounded-full shadow-lg"
          @click="onAutoScrollClick"
        />
      </div>
    </Transition>
  </div>
</template>
