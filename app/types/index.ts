export type { RoleScopedChatInput } from '@cloudflare/workers-types'

// typescript didn't narrow so had to specify undefined for all properties which existed somewhere in the union

export type QueryStreamResponse = {
  message: 'Rewriting message to queries...'

  queries: undefined
  relevantContext: undefined
  response: undefined
  p: undefined
  error: undefined
} | {
  message: 'Querying vector index and full text search...'
  queries: string[]

  relevantContext: undefined
  response: undefined
  p: undefined
  error: undefined
} | {
  message: 'Found relevant documents, generating response...'
  relevantContext: { text: string }[]

  queries: undefined
  response: undefined
  p: undefined
  error: undefined
} | {
  response: string
  p: string

  message: undefined
  error: undefined
  queries: undefined
  relevantContext: undefined
} | {
  message: string

  queries: undefined
  relevantContext: undefined
  response: undefined
  p: undefined
  error: undefined
} | {
  error: string

  message: undefined
  queries: undefined
  relevantContext: undefined
  response: undefined
  p: undefined
}

export type UploadStreamResponse = {
  message: string // Embedding... (0.00%)
  progress: number

  chunks: undefined
  error: undefined
} | {
  message: 'Extrayendo texto del PDF'

  progress: undefined
  chunks: undefined
  error: undefined
} | {
  message: 'Dividiendo el texto en trozos'

  progress: undefined
  chunks: undefined
  error: undefined
} | {
  message: 'Insertando vectores'
  chunks: number

  error: undefined
} | {
  error: string

  message: undefined
  progress: undefined
  chunks: undefined
}

export interface Document {
  name: string
  size: number
  chunks: number | null
  progress?: string
}

// Definiciones de tipos para DocumentChunk y VectorizeMatches
interface DocumentChunk {
  id: string;
  text: string;
  session_id: string;
  document_id: string;
}

interface VectorizeMatches {
  matches: Array<{
    id: string;
    score: number;
  }>;
}

declare global {
  function hubAI(): {
    run: (model: string, params: any) => Promise<any>;
  };
}

export const quickChats = [
  {
    label: '¿Cómo se describe la gestión de la integración del proyecto?',
    icon: 'i-heroicons-squares-2x2',
  },
  {
    label: '¿Qué metodologías de gestión del alcance se mencionan?',
    icon: 'i-heroicons-document-text',
  },
  {
    label: '¿Cómo se aborda la gestión del tiempo y cronograma?',
    icon: 'i-heroicons-clock',
  },
  {
    label: '¿Qué estrategias de gestión de costos se detallan?',
    icon: 'i-heroicons-currency-dollar',
  },
  {
    label: '¿Cómo se maneja la gestión de la calidad en el proyecto?',
    icon: 'i-heroicons-check-circle',
  },
  {
    label: '¿Qué aspectos de la gestión de recursos humanos se cubren?',
    icon: 'i-heroicons-users',
  },

]