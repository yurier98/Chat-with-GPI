<script setup lang="ts">
import type { User } from '@supabase/supabase-js'

const user = useSupabaseUser()

// Redirigir al usuario a la página principal después de la autenticación
watch(user, (newUser: User | null) => {
  if (newUser) {
    navigateTo('/')
  }
}, { immediate: true })
</script>

<template>
  <div class="p-4 flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
    <UCard class="text-center p-8 shadow-lg">
      <h1 class="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">
        Confirmando tu sesión...
      </h1>
      <p class="text-lg text-gray-700 dark:text-gray-200">
        Por favor, espera mientras te redirigimos.
      </p>
    </UCard>
  </div>
</template>
