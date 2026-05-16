-- Aegis RAG - Vector Storage Schema
-- Enables semantic search and long-term memory

-- 1. Enable Vector Extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Knowledge Base (Static Literature)
CREATE TABLE IF NOT EXISTS knowledge_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_source VARCHAR(255), -- e.g., 'IJF_Manual_2024'
    raw_text TEXT NOT NULL,
    embedding vector(768), -- Optimized for Gemini 'text-embedding-004'
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. User Semantic Memory (Personal Patterns)
CREATE TABLE IF NOT EXISTS user_semantic_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_date TIMESTAMPTZ NOT NULL,
    narrative_summary TEXT NOT NULL,
    embedding vector(768),
    context_type VARCHAR(100), -- 'injury', 'success', 'nutrition_impact'
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for fast vector search (IVFFlat or HNSW)
-- We'll start with a basic Cosine Similarity index
CREATE INDEX ON knowledge_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ON user_semantic_memory USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
