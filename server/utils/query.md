# Documentación de Funciones de Búsqueda

## performReciprocalRankFusion

```typescript
function performReciprocalRankFusion(
  fullTextResults: DocumentChunk[],
  vectorResults: VectorizeMatches[],
): { id: string, score: number }[]
```

### Descripción

Esta función implementa el algoritmo de Fusión de Clasificación Recíproca (Reciprocal Rank Fusion) para combinar resultados de búsqueda provenientes de diferentes fuentes. En nuestra aplicación, fusiona los resultados de la búsqueda de texto completo en PostgreSQL con los resultados de la búsqueda vectorial en Supabase Vector.

### Parámetros

- `fullTextResults`: Array de objetos `DocumentChunk` que representan los resultados de la búsqueda de texto completo.
- `vectorResults`: Array de objetos `VectorizeMatches` que representan los resultados de la búsqueda vectorial.

### Retorno

- Array de objetos con propiedades `id` (identificador del documento) y `score` (puntuación de relevancia), ordenados por puntuación descendente.

### Funcionamiento

1. Utiliza una constante `k=60` para controlar la influencia de la posición en el ranking.
2. Para cada documento en cada lista de resultados, calcula una puntuación usando la fórmula `1 / (k + posición)`.
3. Si un documento aparece en múltiples listas, suma sus puntuaciones.
4. Ordena los documentos por puntuación descendente para obtener la lista final fusionada.

### Ejemplo de uso

```typescript
const mergedResults = performReciprocalRankFusion(fullTextSearchResults, vectorIndexResults);
const topResults = mergedResults.slice(0, 10); // Obtener los 10 mejores resultados
```

### Notas

- La constante `k` puede ajustarse según sea necesario para dar más o menos peso a la posición en el ranking.
- Este método es particularmente efectivo cuando se combinan sistemas de búsqueda complementarios.