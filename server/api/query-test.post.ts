import { serverSupabaseClient } from '#supabase/server'
import { processUserQuery } from '../utils/query'

export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)
  
  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw createError({ statusCode: 401, message: 'Usuario no autenticado' })
  }

  try {
    const body = await readBody(event)
    const { query, sessionId } = body

    if (!query || !sessionId) {
      throw createError({ statusCode: 400, message: 'Query y sessionId son requeridos' })
    }

    // Crear un stream de eventos simple para la prueba
    const eventStream = createEventStream(event)
    const streamResponse = (data: object) => eventStream.push(JSON.stringify(data))

    // Procesar la consulta
    const result = await processUserQuery(event, {
      sessionId,
      messages: [{ role: 'user', content: query }]
    }, streamResponse)

    await eventStream.close()
    return result
  } catch (error) {
    console.error('Error en prueba de consulta:', error)
    throw createError({ 
      statusCode: 500, 
      message: 'Error interno del servidor en prueba de consulta' 
    })
  }
}) 