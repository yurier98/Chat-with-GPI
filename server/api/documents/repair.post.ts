import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { processVectors } from '../../utils/upload'
import { serverSupabaseClient } from '#supabase/server'
import type { Document, DocumentChunk } from '~/types'

/**
 * Repara documentos que no se han vectorizado correctamente.
 * Re-procesa los chunks y genera los vectores faltantes.
 */
export default defineEventHandler(async (event) => {
  const supabase = await serverSupabaseClient(event)

  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw createError({ statusCode: 401, message: 'Usuario no autenticado' })
  }

  const body = await readBody(event)
  const documentIdToRepair = body?.documentId as string | undefined

  try {
    let documentsToRepair: Document[]
    let query = supabase
      .from('documents')
      .select(`
        id,
        name,
        text_content,
        user_id
      `)
      .eq('user_id', user.id)

    if (documentIdToRepair) {
      query = query.eq('id', documentIdToRepair)
    }

    const { data, error: fetchError } = await query

    if (fetchError) {
      throw createError({ statusCode: 500, message: 'Error al obtener documentos para reparar' })
    }

    documentsToRepair = data

    if (!documentsToRepair || documentsToRepair.length === 0) {
      return {
        type: 'complete',
        message: documentIdToRepair
          ? `Documento ${documentIdToRepair} no encontrado o no necesita reparación.`
          : 'No hay documentos para reparar',
        repaired: 0,
        total: 0,
      }
    }

    let repairedCount = 0
    const results = []

    for (const document of documentsToRepair) {
      try {
        console.log(`Procesando documento: ${document.name}`)

        // Verificar si el documento ya tiene chunks
        const { data: chunks, error: chunksError } = await supabase
          .from('document_chunks')
          .select('id, text')
          .eq('document_id', document.id)

        if (chunksError) {
          console.error(`Error verificando chunks para documento ${document.id}:`, chunksError)
          continue
        }

        // Si no tiene chunks, crear nuevos
        let chunksToInsert: DocumentChunk[] = chunks
        if (!chunks || chunks.length === 0) {
          console.log(`Creando chunks para: ${document.name}`)

          const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 500,
            chunkOverlap: 100,
          })

          const textChunks = await splitter.splitText(document.text_content || '')

          // Insertar chunks
          chunksToInsert = textChunks.map(chunk => ({
            id: crypto.randomUUID(),
            text: chunk,
            document_id: document.id,
            created_at: new Date().toISOString(),
          }))

          const { data: insertedChunks, error: insertError } = await supabase
            .from('document_chunks')
            .insert(chunksToInsert)
            .select('id, text')

          if (insertError) {
            console.error(`Error insertando chunks para documento ${document.id}:`, insertError)
            continue
          }
          chunksToInsert = insertedChunks // Usar los chunks insertados para el procesamiento de vectores
        }

        // Verificar si ya tiene vectores
        const { count: vectorCount, error: vectorCountError } = await supabase
          .from('document_vectors')
          .select('*', { count: 'exact', head: true })
          .eq('document_id', document.id)

        if (vectorCountError) {
          console.error(`Error verificando vectores para documento ${document.id}:`, vectorCountError)
          continue
        }

        // Si no tiene vectores o tiene menos vectores que chunks, generar vectores
        if (!vectorCount || vectorCount < chunksToInsert.length) {
          console.log(`Generando embeddings para: ${document.name}`)

          // Usar la función processVectors existente
          await processVectors(
            chunksToInsert.map(c => c.text),
            document.id,
            async (message: any) => {
              console.log(`Embedding progress for ${document.name}:`, message.message, `${message.progress?.toFixed(2)}%`)
            },
            event, // Pasar el evento H3 para autenticación en processVectors
          )

          repairedCount++
          results.push({
            documentId: document.id,
            documentName: document.name,
            status: 'repaired',
            chunksCount: chunksToInsert.length,
            vectorsGenerated: true,
          })

          console.log(`Documento ${document.name} procesado correctamente`)
        }
        else {
          // Lógica existente para verificar y actualizar userId en metadatos
          const { data: existingVectors, error: vectorsError } = await supabase
            .from('document_vectors')
            .select('id, metadata')
            .eq('document_id', document.id)
            .limit(5)

          if (vectorsError) {
            console.error(`Error verificando vectores para documento ${document.id}:`, vectorsError)
          }
          else if (existingVectors && existingVectors.length > 0) {
            const needsUpdate = existingVectors.some(vector =>
              !vector.metadata || !vector.metadata.userId,
            )

            if (needsUpdate) {
              const { error: updateError } = await supabase
                .from('document_vectors')
                .update({
                  metadata: supabase.sql`jsonb_set(metadata, '{userId}', ${user.id}::text::jsonb)`,
                })
                .eq('document_id', document.id)
                .is('metadata->userId', null)

              if (updateError) {
                console.error(`Error actualizando userId en vectores para documento ${document.id}:`, updateError)
              }
              else {
                console.log(`Actualizado userId en vectores para documento ${document.name}`)
                repairedCount++
                results.push({
                  documentId: document.id,
                  documentName: document.name,
                  status: 'metadata_updated',
                  chunksCount: chunksToInsert.length,
                  vectorsGenerated: false,
                })
              }
            }
          }
        }
      }
      catch (error) {
        console.error(`Error procesando documento ${document.id}:`, error)
        results.push({
          documentId: document.id,
          documentName: document.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Error desconocido',
        })
      }
    }

    return {
      type: 'complete',
      message: documentIdToRepair
        ? `Procesamiento para documento ${documentIdToRepair} completado.`
        : `Reparación completada. Documentos reparados: ${repairedCount}/${documentsToRepair.length}`,
      repaired: repairedCount,
      total: documentsToRepair.length,
      results,
    }
  }
  catch (error) {
    console.error('Error general en reparación:', error)
    throw createError({ statusCode: 500, message: `Error en reparación: ${(error as Error).message}` })
  }
})
