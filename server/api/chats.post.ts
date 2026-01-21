import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'

const schema = z.object({
  input: z.string().min(1, 'El mensaje no puede estar vacío'),
})

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)

  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw createError({ statusCode: 401, message: 'Usuario no autenticado' })
  }

  const body = await readBody(event)
  const { input } = schema.parse(body)

  try {
    // Crear nueva conversación
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert([{
        user_id: user.id,
        title: input.slice(0, 50) + '...',
      }])
      .select()
      .single()

    if (convError) {
      console.error('Error creating conversation:', convError)
      throw createError({ statusCode: 500, message: 'Error al crear la conversación' })
    }

    // Guardar el mensaje inicial del usuario
    const { error: msgError } = await supabase
      .from('conversation_messages')
      .insert([{
        conversation_id: conversation.id,
        role: 'user',
        content: input,
        metadata: {},
      }])

    if (msgError) {
      console.error('Error saving user message:', msgError)
      // No lanzar error aquí, la conversación ya se creó
    }

    return {
      id: conversation.id,
      title: conversation.title,
    }
  }
  catch (error) {
    console.error('Error in chats endpoint:', error)
    if (error instanceof z.ZodError) {
      throw createError({ statusCode: 400, message: 'Datos inválidos' })
    }
    throw createError({ statusCode: 500, message: 'Error interno del servidor' })
  }
}) 