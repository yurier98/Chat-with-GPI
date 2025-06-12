import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

// Asegúrate de que las variables de entorno estén definidas
if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable')
}
if (!supabaseKey) {
  throw new Error('Missing SUPABASE_SERVICE_KEY environment variable')
}

export const supabase = createClient(supabaseUrl as string, supabaseKey as string)
