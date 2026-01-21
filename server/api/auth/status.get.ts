import { serverSupabaseClient } from '#supabase/server'

/**
 * Endpoint de prueba para verificar el estado de autenticación
 */
export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  
  try {
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('Error de autenticación:', authError)
      return {
        authenticated: false,
        error: authError.message,
        user: null,
      }
    }
    
    if (!user) {
      return {
        authenticated: false,
        error: 'Usuario no autenticado',
        user: null,
      }
    }
    
    return {
      authenticated: true,
      error: null,
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
      },
    }
  } catch (error) {
    console.error('Error general en verificación de autenticación:', error)
    return {
      authenticated: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      user: null,
    }
  }
}) 