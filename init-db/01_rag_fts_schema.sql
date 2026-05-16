-- Aegis RAG - Search-based Memory Schema
-- Optimized for PostgreSQL Full Text Search (FTS)

-- 1. Knowledge Base (Static Literature)
CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_source VARCHAR(255),
    raw_text TEXT NOT NULL,
    search_vector tsvector, -- For FTS
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Semantic Memory (Personal Patterns)
CREATE TABLE IF NOT EXISTS user_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_date TIMESTAMPTZ NOT NULL,
    narrative_summary TEXT NOT NULL,
    search_vector tsvector, -- For FTS
    context_type VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for Fast Text Search
CREATE INDEX idx_knowledge_search ON knowledge_base USING GIN (search_vector);
CREATE INDEX idx_user_memory_search ON user_memory USING GIN (search_vector);

-- Trigger to automatically update search vectors
CREATE OR REPLACE FUNCTION update_search_vector() RETURNS trigger AS $$
BEGIN
    IF TG_TABLE_NAME = 'knowledge_base' THEN
        new.search_vector := to_tsvector('spanish', coalesce(new.raw_text, ''));
    ELSIF TG_TABLE_NAME = 'user_memory' THEN
        new.search_vector := to_tsvector('spanish', coalesce(new.narrative_summary, ''));
    END IF;
    RETURN new;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_knowledge_search_update BEFORE INSERT OR UPDATE ON knowledge_base
FOR EACH ROW EXECUTE FUNCTION update_search_vector();

CREATE TRIGGER trg_user_memory_search_update BEFORE INSERT OR UPDATE ON user_memory
FOR EACH ROW EXECUTE FUNCTION update_search_vector();
