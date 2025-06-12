/**
 * Composable que proporciona un array de sesiones de ejemplo predefinidas.
 * Cada sesión incluye un ID único, nombre de documento, tamaño, número de chunks y preguntas de ejemplo asociadas.
 *
 * @returns {Array<Object>} Un array de objetos, donde cada objeto representa una sesión de ejemplo.
 * @returns {string} return.id - El ID único de la sesión de ejemplo.
 * @returns {string} return.name - El nombre del documento asociado a la sesión.
 * @returns {number} return.size - El tamaño del documento en MB.
 * @returns {number} return.chunks - El número de chunks en los que se dividió el documento.
 * @returns {string[]} return.questions - Un array de preguntas de ejemplo relacionadas con el documento.
 */
export const useExampleSessions = () => ([
  {
    id: '3aa8c534-2d63-4221-bde2-0e3e2b39cfd9',
    name: 'Cloudflare-Inc-NET-US-Q2-2024-Earnings-Call-1-August-2024-5_00-PM-ET.pdf',
    size: 0.311,
    chunks: 226,
    questions: [
      'What was the revenue growth rate in Q2?',
      'What are the example questions that the document answers?',
      'What were the key performance indicators for the quarter?',
      'What are the key outcomes from this call?',
    ],
  },
])

/**
 * Composable que determina si la sesión actual es una de las sesiones de ejemplo.
 * Utiliza `useExampleSessions` para obtener las sesiones de ejemplo y `useSessionId` para obtener el ID de la sesión actual.
 *
 * @returns {ComputedRef<boolean>} Una referencia computada que es `true` si la sesión actual es una sesión de ejemplo, `false` en caso contrario.
 */
export const useIsExampleSession = () => {
  const exampleSessionIds = useExampleSessions()
  const sessionId = useSessionId()
  return computed(() => exampleSessionIds.some(({ id }) => id === sessionId.value))
}
