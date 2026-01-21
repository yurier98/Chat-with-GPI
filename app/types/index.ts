export type { RoleScopedChatInput } from '@cloudflare/workers-types'

// typescript didn't narrow so had to specify undefined for all properties which existed somewhere in the union

export interface QueryStreamResponse {
  message?: string
  queries?: string[]
  relevantContext?: Array<{
    text: string
    documentName?: string
    documentId?: string
  }>
  response?: string
  p?: string
  error?: string
  conversationId?: string
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

// Tipos principales alineados con el esquema de BD optimizado

export interface Document {
  id: string // uuid
  name: string
  text_content: string | null
  size: number
  storage_url: string
  user_id: string // uuid
  created_at: string // timestamp with time zone
}

export interface DocumentChunk {
  id: string // uuid
  document_id: string // uuid
  text: string
  created_at: string // timestamp with time zone
}

export interface DocumentVector {
  id: string // uuid
  document_id: string // uuid
  chunk_id: string // uuid
  embedding: number[] // vector(1024)
  metadata: Record<string, unknown> // jsonb
  created_at: string // timestamp with time zone
}

export interface VectorizeMatches {
  matches: Array<{
    id: string
    score: number
  }>
}

export interface Conversation {
  id: string // uuid
  user_id: string // uuid
  title: string | null
  created_at: string // timestamp with time zone
  updated_at: string // timestamp with time zone
}

export interface MessageSource {
  chunkId: string
  documentId: string | null
  documentName: string
  text: string
}

export interface ConversationMessage {
  id: string // uuid
  conversation_id: string // uuid
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata: {
    sources?: MessageSource[]
    timestamp?: string
    model?: string
    [key: string]: unknown
  } // jsonb
  created_at: string // timestamp with time zone
}

export interface ConversationDocument {
  id: string // uuid
  conversation_id: string // uuid
  document_id: string // uuid (cambiado de text a uuid)
  created_at: string // timestamp with time zone
}

export interface ConversationWithMessages extends Conversation {
  messages: ConversationMessage[]
  documents: Document[]
}

// Tipos adicionales para la vista user_documents
export interface UserDocument extends Document {
  chunks_count: number
  vectors_count: number
}

// Tipos para la función match_document_vectors
export interface VectorMatch {
  chunk_id: string // uuid
  document_id: string // uuid
  text: string
  similarity: number
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
export interface DocumentStatus {
  status: string
  statistics: {
    totalDocuments: number
    totalChunks: number
    totalVectors: number
    averageChunksPerDocument: number
    averageVectorsPerDocument: number
  }
  sampleDocuments: Array<{
    id: string
    name: string
    status: string
    chunksCount: number
    vectorsCount: number
  }>
  diagnostics: {
    hasDocuments: boolean
    hasChunks: boolean
    hasVectors: boolean
    isProperlyVectorized: boolean
    potentialIssues: string[]
  }
}

export const examplePrompts = [
  {
    name: 'Estructura del documento',
    icon: 'i-heroicons-document-text',
    questions: [
      'Write a short story about a time traveler.',
      'Help me write a professional email.',
      'Create a poem about nature.',
    ],
  },
  {
    name: 'Metodología de gestión',
    icon: 'i-heroicons-squares-2x2',
    questions: [
      'Qué metodología de gestión de proyectos se emplea en el proyecto?',
      'La metodología definida en el proyecto esta bien descrita y fundamentada en el uso, respetando los principios de la propia metodología?',
      'Exite alguna contradicción de lo que esta descrito del proyecto con lo que plantea la metodología seleccionada.',
    ],
  },
  {
    name: 'Planificación',
    icon: 'i-heroicons-clock',
    questions: [
      'Help me debug this JavaScript function.',
      'Explain the difference between REST and GraphQL.',
      'Show me how to create a responsive CSS layout.',
    ],
  },
  {
    name: 'Recursos humanos',
    icon: 'i-heroicons-users',
    questions: [
      'Help me debug this JavaScript function.',
      'Explain the difference between REST and GraphQL.',
      'Show me how to create a responsive CSS layout.',
    ],
  },
  {
    name: 'Costos',
    icon: 'i-heroicons-currency-dollar',
    questions: [
      'What are some recipes for a beginner cook?',
      'Suggest some travel destinations for a solo trip.',
      'What are some interesting science facts?',
    ],
  },
  {
    name: 'Calidad',
    icon: 'i-heroicons-check-circle',
    questions: [
      'Compare Python vs JavaScript for web development.',
      'What\'s the difference between iPhone and Android?',
      'Compare electric cars vs gasoline cars.',
    ],
  },
]
