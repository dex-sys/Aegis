-- Missing tables required by the application code
-- This ensures the DB is consistent with the current JS implementations

CREATE TABLE IF NOT EXISTS system_status (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize status
INSERT INTO system_status (key, value) VALUES ('ingestion_state', 'idle') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS nutrition_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    raw_text TEXT,
    kcal INTEGER,
    protein_g INTEGER,
    carbs_g INTEGER,
    fats_g INTEGER,
    parsed_items JSONB,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processed', 'error'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS judo_randori_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_date DATE NOT NULL,
    tachi_waza_success BOOLEAN,
    ne_waza_success BOOLEAN,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coach_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_date DATE NOT NULL UNIQUE,
    tachi_waza_focus TEXT,
    ne_waza_focus TEXT,
    rationale TEXT,
    readiness FLOAT,
    acwr FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    level VARCHAR(20), -- 'info', 'warning', 'critical'
    category VARCHAR(50),
    message TEXT,
    metadata JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
