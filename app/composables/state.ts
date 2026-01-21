import type { RoleScopedChatInput } from '@cloudflare/workers-types'
import type { Document } from '~/types'

export const useDocuments = () => useState<Document[]>('documents', () => [])

export const useMessages = () => useState<RoleScopedChatInput[]>('messages', () => [])

export const useQueries = () => useState<string[]>('queries', () => [])
export const useRelevantContext = () => useState<{
  isProvided: boolean
  context: Array<{
    text: string
    documentName?: string
    documentId?: string
  }>
}>('relevantContext', () => ({ isProvided: false, context: [] }))

export const useInformativeMessage = () => useState<string>('informativeMessage', () => '')

export const useSidebarDrawer = () => useState<boolean>('sidebarDrawer', () => false)
