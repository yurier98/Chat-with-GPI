-- Esquema optimizado para eliminar redundancias y mejorar la estructura
-- Fecha: 2025-01-03

-- 1. Tabla de documentos (sin session_id innecesario)
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  text_content text,
  size integer NOT NULL,
  storage_url text NOT NULL,
  user_id uuid NOT NULL, -- Solo aquí, no redundante
  created_at timestamp with time zone DEFAULT now(),
  
  -- Índices para optimizar consultas
  CONSTRAINT documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Tabla de chunks (sin redundancia de user_id)
CREATE TABLE IF NOT EXISTS document_chunks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id uuid NOT NULL,
  text text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  
  -- Relación con documentos
  CONSTRAINT document_chunks_document_id_fkey FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- 3. Tabla de vectores (con chunk_id para relación directa)
CREATE TABLE IF NOT EXISTS document_vectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL,
  chunk_id uuid NOT NULL,
  embedding vector(1024) NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  
  -- Relaciones
  CONSTRAINT document_vectors_document_id_fkey FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  CONSTRAINT document_vectors_chunk_id_fkey FOREIGN KEY (chunk_id) REFERENCES document_chunks(id) ON DELETE CASCADE
);

-- 4. Tabla de conversaciones (sin cambios)
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  title text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 5. Tabla de mensajes (sin cambios)
CREATE TABLE IF NOT EXISTS conversation_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT conversation_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- 6. Tabla de relación conversación-documentos (optimizada)
CREATE TABLE IF NOT EXISTS conversation_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL,
  document_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  
  -- Relaciones
  CONSTRAINT conversation_documents_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT conversation_documents_document_id_fkey FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Restricción única para evitar duplicados
  UNIQUE(conversation_id, document_id)
);

-- 7. Índices para optimizar consultas (sin session_id)
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_created_at ON document_chunks(created_at);

CREATE INDEX IF NOT EXISTS idx_document_vectors_document_id ON document_vectors(document_id);
CREATE INDEX IF NOT EXISTS idx_document_vectors_chunk_id ON document_vectors(chunk_id);
CREATE INDEX IF NOT EXISTS idx_document_vectors_embedding ON document_vectors USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id ON conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_created_at ON conversation_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_conversation_documents_conversation_id ON conversation_documents(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_documents_document_id ON conversation_documents(document_id);

-- 8. Función para actualizar updated_at en conversaciones
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_conversation_updated_at_trigger ON conversations;
CREATE TRIGGER update_conversation_updated_at_trigger
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_updated_at();

-- 10. Función optimizada para búsqueda vectorial
CREATE OR REPLACE FUNCTION match_document_vectors(
  query_embedding vector(1024),
  match_count int DEFAULT 5,
  user_id uuid DEFAULT auth.uid()
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  text text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id as chunk_id,
    d.id as document_id,
    dc.text,
    1 - (dv.embedding <=> query_embedding) as similarity
  FROM document_vectors dv
  JOIN document_chunks dc ON dc.id = dv.chunk_id
  JOIN documents d ON d.id = dv.document_id
  WHERE d.user_id = match_document_vectors.user_id
  ORDER BY dv.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 11. Habilitar RLS en todas las tablas
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_documents ENABLE ROW LEVEL SECURITY;

-- 12. Políticas RLS para documents
DROP POLICY IF EXISTS "Users can only see their own documents" ON documents;
CREATE POLICY "Users can only see their own documents" ON documents
    FOR ALL USING (auth.uid() = user_id);

-- 13. Políticas RLS para document_chunks (basadas en document_id)
DROP POLICY IF EXISTS "Users can only see chunks from their documents" ON document_chunks;
CREATE POLICY "Users can only see chunks from their documents" ON document_chunks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM documents 
            WHERE documents.id = document_chunks.document_id 
            AND documents.user_id = auth.uid()
        )
    );

-- 14. Políticas RLS para document_vectors (basadas en document_id)
DROP POLICY IF EXISTS "Users can only see vectors from their documents" ON document_vectors;
CREATE POLICY "Users can only see vectors from their documents" ON document_vectors
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM documents 
            WHERE documents.id = document_vectors.document_id 
            AND documents.user_id = auth.uid()
        )
    );

-- 15. Políticas RLS para conversations
DROP POLICY IF EXISTS "Users can only see their own conversations" ON conversations;
CREATE POLICY "Users can only see their own conversations" ON conversations
    FOR ALL USING (auth.uid() = user_id);

-- 16. Políticas RLS para conversation_messages
DROP POLICY IF EXISTS "Users can only see messages from their conversations" ON conversation_messages;
CREATE POLICY "Users can only see messages from their conversations" ON conversation_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = conversation_messages.conversation_id 
            AND conversations.user_id = auth.uid()
        )
    );

-- 17. Políticas RLS para conversation_documents
DROP POLICY IF EXISTS "Users can only see conversation-document relationships" ON conversation_documents;
CREATE POLICY "Users can only see conversation-document relationships" ON conversation_documents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = conversation_documents.conversation_id 
            AND conversations.user_id = auth.uid()
        )
    );

-- 18. Vista para facilitar consultas de documentos por usuario
CREATE OR REPLACE VIEW user_documents AS
SELECT 
    d.id,
    d.name,
    d.size,
    d.text_content,
    d.storage_url,
    d.user_id,
    d.created_at,
    COUNT(dc.id) as chunks_count,
    COUNT(dv.id) as vectors_count
FROM documents d
LEFT JOIN document_chunks dc ON d.id = dc.document_id
LEFT JOIN document_vectors dv ON d.id = dv.document_id
WHERE d.user_id = auth.uid()
GROUP BY d.id, d.name, d.size, d.text_content, d.storage_url, d.user_id, d.created_at;

-- 19. Comentarios para documentar la estructura
COMMENT ON TABLE documents IS 'Documentos subidos por los usuarios';
COMMENT ON COLUMN documents.user_id IS 'ID del usuario propietario del documento';

COMMENT ON TABLE document_chunks IS 'Fragmentos de texto extraídos de los documentos';
COMMENT ON COLUMN document_chunks.document_id IS 'Referencia al documento padre';

COMMENT ON TABLE document_vectors IS 'Embeddings vectoriales para búsqueda semántica';
COMMENT ON COLUMN document_vectors.chunk_id IS 'Referencia al chunk de texto';
COMMENT ON COLUMN document_vectors.embedding IS 'Vector de embedding de 1024 dimensiones';

COMMENT ON TABLE conversations IS 'Conversaciones de chat de los usuarios';
COMMENT ON TABLE conversation_messages IS 'Mensajes individuales en las conversaciones';
COMMENT ON TABLE conversation_documents IS 'Relación muchos a muchos entre conversaciones y documentos'; 