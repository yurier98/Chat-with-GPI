<script setup lang="ts">
import type { User } from '@supabase/supabase-js'

definePageMeta({ layout: 'auth' })

const user = useSupabaseUser()
const { auth } = useSupabaseClient()

const login = async () => {
  try {
    const { error } = await auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/confirm`,
      },
    })
    if (error) {
      console.error('Error logging in:', error.message)
    }
  } catch (error) {
    console.error('Error during login:', error)
  }
}

// Redirigir si el usuario ya está autenticado
onMounted(() => {
  if (user.value) {
    navigateTo('/')
  }
})

// Observar cambios en el estado del usuario
watch(user, (newUser: User | null) => {
  if (newUser) {
    navigateTo('/')
  }
}, { immediate: true })
</script>

<template>
  <div class="p-4 flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
    <UCard class="text-center p-3 shadow-lg">
      <h1 class="text-3xl font-bold mb-6 text-gray-800 dark:text-gray-100">
        Inicia sesión para continuar
      </h1>
      <div v-if="!user">
        <p class="mb-4 text-gray-600 dark:text-gray-300">
          Por favor, inicia sesión con tu cuenta de Google.
        </p>
        <UButton
          label="Iniciar sesión con Google"
          icon="i-simple-icons-google"
          color="primary"
          size="lg"
          class="w-full justify-center"
          @click="login"
        />
      </div>
      <div v-else>
        <p class="text-lg text-gray-700 dark:text-gray-200">
          Redireccionando...
        </p>
      </div>
    </UCard>
  </div>
</template>

