/**
 * Tipos relacionados con documentos y procesamiento de documentos
 */

export type Document = {
  id: string
  name: string
  size: number
  text_content: string
  storage_url: string
  user_id: string
  created_at: string
}

export type DocumentChunk = {
  id: string
  document_id: string
  text: string
  created_at: string
}

export type DocumentVector = {
  id: string
  document_id: string
  chunk_id: string
  embedding: number[]
  metadata: {
    documentId: string
    chunkId: string
    text: string
    userId: string
  }
  created_at: string
}

export interface DocumentChunkResult extends DocumentChunk {
  rank: number
}

export interface VectorizeMatches {
  matches: Array<{
    id: string
    score: number
  }>
}

// Tipos para el estado de documentos
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

// Tipos para resultados de reparación
export interface RepairResult {
  documentId: string
  documentName: string
  status: 'repaired' | 'metadata_updated' | 'error'
  chunksCount?: number
  vectorsGenerated?: boolean
  error?: string
}

export interface RepairResponse {
  message: string
  repaired: number
  total: number
  results: RepairResult[]
} 