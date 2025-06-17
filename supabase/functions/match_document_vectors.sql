CREATE OR REPLACE FUNCTION match_document_vectors(
  query_embedding vector,
  match_count int,
  user_id uuid
)
RETURNS TABLE (
  chunk_id uuid,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (dv.metadata->>'chunkId')::uuid as chunk_id,
    1 - (dv.embedding <=> query_embedding) as similarity
  FROM 
    document_vectors dv
  WHERE 
    dv.metadata->>'userId' = user_id::text
  ORDER BY 
    dv.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;