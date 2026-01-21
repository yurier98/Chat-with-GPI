<script lang="ts" setup>
import { examplePrompts } from '~/types'

const emit = defineEmits<{ (e: 'message', question: string): void }>()

const selectedPrompt = ref<typeof examplePrompts[0] | null>(null)

const selectPrompt = (prompt: typeof examplePrompts[0]) => {
  selectedPrompt.value = prompt
}

function sendMessage(question: string) {
  emit('message', question)
}
</script>

<template>
  <!-- Show example prompts or questions based on selection -->
  <Transition name="pop">
    <div
      v-if="!selectedPrompt"
      class="flex justify-center flex-wrap mx-w-full mx-auto gap-3"
    >
      <UButton
        v-for="prompt in examplePrompts"
        :key="prompt.name"
        :label="prompt.name"
        :icon="prompt.icon"
        color="neutral"
        variant="outline"
        class="rounded-full cursor-pointer"
        @click="selectPrompt(prompt)"
      />
    </div>
  </Transition>

  <!-- Show questions for selected prompt -->

  <Transition name="pop">
    <div
      v-if="selectedPrompt"
      class="space-y-4 ring ring-neutral-300/80 dark:ring-neutral-200/20 bg-neutral-100/70 dark:bg-neutral-800/40 rounded-xl p-4"
    >
      <div class="flex items-center justify-between mb-4">
        <h3
          class="font-medium text-neutral-600 dark:text-neutral-300 flex items-center gap-2"
        >
          <UIcon :name="selectedPrompt.icon" class="text-lg" />
          {{ selectedPrompt.name }}
        </h3>
        <UButton
          icon="i-carbon:close"
          variant="ghost"
          size="md"
          color="neutral"
          class="text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          @click="selectedPrompt = null"
        />
      </div>

      <div class="space-y-3">
        <UButton
          v-for="question in selectedPrompt.questions"
          :key="question"
          :label="question"
          icon="i-proicons:search"
          size="lg"
          color="neutral"
          variant="outline"
          class="w-full cursor-pointer"
          @click="sendMessage(question)"
        />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.appear-enter-active,
.appear-leave-active {
transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.appear-enter-from,
.apear-leave-to {
transform: scale(0.85);
opacity: 0;
}
.pop-enter-active,
.pop-leave-active {
transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.pop-enter-from,
.pop-leave-to {
transform: scale(0.85);
opacity: 0;
}

/* Agregar estas clases a los elementos */
.fade-enter-active,
.fade-leave-active {
transition: opacity 0.3s ease-in-out;
}
</style>
