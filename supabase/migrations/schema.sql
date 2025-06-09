-- Crear tabla para documentos
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  size integer NOT NULL,
  text_content text,
  session_id text NOT NULL,
  storage_url text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Crear tabla para chunks de documentos
CREATE TABLE IF NOT EXISTS document_chunks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  text text NOT NULL,
  session_id text NOT NULL,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now()
);

-- Crear tabla para vectores de documentos
CREATE TABLE IF NOT EXISTS document_vectors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  embedding vector(1024),
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Crear índice para búsqueda de vectores
CREATE INDEX IF NOT EXISTS document_vectors_embedding_idx ON document_vectors
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);