import type { RoleScopedChatInput } from '@cloudflare/workers-types'
import { supabase } from './supabaseClient'

async function rewriteToQueries(content: string): Promise<string[]> {
  const prompt = `Given the following user message, rewrite it into 5 distinct queries that could be used to search for relevant information. Each query should focus on different aspects or potential interpretations of the original message. No questions, just a query maximizing the chance of finding relevant information.

User message: "${content}"

Provide 5 queries, one per line and nothing else:`

  const { response } = await hubAI().run('@cf/meta/llama-3.1-8b-instruct', { prompt }) as { response: string }

  const regex = /^\d+\.\s*"|"$/gm
  const queries = response
    .replace(regex, '')
    .split('\n')
    .filter(query => query.trim() !== '')
    .slice(1, 5)

  return queries
}

type DocumentChunkResult = DocumentChunk & { rank: number }

async function searchDocumentChunks(searchTerms: string[], sessionId: string) {
  const results: DocumentChunkResult[] = []

  for (const term of searchTerms.filter(Boolean)) {
    const { data, error } = await supabase
      .from('document_chunks')
      .select('*')
      .ilike('text', `%${term}%`)
      .eq('session_id', sessionId)
      .limit(5)

    if (error) throw error
    results.push(...data.map((row: any) => ({ ...row, rank: 1 })))
  }
  return results.slice(0, 10)
}

// Helper function to perform reciprocal rank fusion
function performReciprocalRankFusion(
  fullTextResults: DocumentChunk[],
  vectorResults: VectorizeMatches[],
): { id: string, score: number }[] {
  const k = 60 // Constant for fusion, can be adjusted
  const scores: { [id: string]: number } = {}

  // Process full-text search results
  fullTextResults.forEach((result, index) => {
    const score = 1 / (k + index)
    scores[result.id] = (scores[result.id] || 0) + score
  })

  // Process vector search results
  vectorResults.forEach((result) => {
    result.matches.forEach((match, index) => {
      const score = 1 / (k + index)
      scores[match.id] = (scores[match.id] || 0) + score
    })
  })

  // Sort and return fused results
  return Object.entries(scores)
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score)
}

const SYSTEM_MESSAGE = `You are a helpful assistant that answers questions based on the provided context. When giving a response, always include the source of the information in the format [1], [2], [3] etc.`

async function queryVectorIndex(queries: string[], sessionId: string) {
  // Genera los embeddings para las queries (puedes seguir usando tu modelo preferido)
  const queryVectors = await Promise.all(
    queries.map(q => hubAI().run('@cf/baai/bge-large-en-v1.5', { text: [q] })),
  )

  // Para cada embedding, busca los chunks más similares en Supabase
  const allResults = await Promise.all(
    queryVectors.map(async (qv) => {
      const { data, error } = await supabase.rpc('match_document_vectors', {
        query_embedding: qv.data[0],
        match_count: 5,
        session_id: sessionId,
      })
      if (error) throw error
      // Adaptar el formato para que sea compatible con el resto del código
      return {
        matches: data.map((row: any) => ({
          id: row.chunk_id,
          score: row.similarity,
        })),
      }
    }),
  )

  return allResults
}

async function getRelevantDocuments(ids: string[]) {
  const { data, error } = await supabase
    .from('document_chunks')
    .select('text, id')
    .in('id', ids)
  if (error) throw error
  return data
}

export async function processUserQuery({ sessionId, messages }: { sessionId: string, messages: RoleScopedChatInput[] }, streamResponse: (message: object) => Promise<void>) {
  messages.unshift({ role: 'system', content: SYSTEM_MESSAGE })
  const lastMessage = messages[messages.length - 1]
  const query = lastMessage.content

  await streamResponse({ message: 'Rewriting message to queries...' })

  const queries = await rewriteToQueries(query)
  const queryingVectorIndexMsg = {
    message: 'Querying vector index and full text search...',
    queries,
  }
  await streamResponse(queryingVectorIndexMsg)

  const [fullTextSearchResults, vectorIndexResults] = await Promise.all([
    searchDocumentChunks(queries, sessionId),
    queryVectorIndex(queries, sessionId),
  ])

  // Perform reciprocal rank fusion on fullTextSearchResults and vectorIndexResults
  // Sort in descending order because higher scores are better in reciprocal rank fusion
  const mergedResults = performReciprocalRankFusion(fullTextSearchResults, vectorIndexResults).sort(
    (a, b) => b.score - a.score,
  )

  const relevantDocs = await getRelevantDocuments(mergedResults.map(r => r.id).slice(0, 10))

  const relevantTexts = relevantDocs
    .map((doc, index) => `[${index + 1}]: ${doc.text}`)
    .join('\n\n')

  const relevantDocsMsg = {
    message: 'Found relevant documents, generating response...',
    relevantContext: relevantDocs,
    queries,
  }
  await streamResponse(relevantDocsMsg)

  messages.push({
    role: 'assistant',
    content: `The following queries were made:\n${queries.join(
      '\n',
    )}\n\nRelevant context from attached documents:\n${relevantTexts}`,
  })

  return { messages }
}
