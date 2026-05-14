-- Proyecto Aegis: Database Schema
-- Focus: High-resolution time-series data for AI performance inference

-- Extensiones útiles para análisis de datos
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. DIMENSIÓN FISIOLÓGICA (Biométricos)
-- Registra el estado interno del organismo.
CREATE TABLE metrics_biometric (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL,
    hrv_ms FLOAT, -- Variabilidad de la Frecuencia Cardíaca (milisegundos)
    rhr_bpm INTEGER, -- Frecuencia Cardíaca en Reposo
    spo2_pct FLOAT, -- Saturación de Oxígeno
    respiratory_rate FLOAT, -- Frecuencia Respiratoria
    body_temp_delta FLOAT, -- Desviación de la temperatura basal (°C)
    skin_conductance_us FLOAT, -- Actividad Electrodérmica (Estrés agudo)
    sleep_score INTEGER, -- 0-100 (Calidad subjetiva/algorítmica)
    sleep_duration_seconds INTEGER,
    sleep_rem_seconds INTEGER,
    sleep_deep_seconds INTEGER,
    sleep_light_seconds INTEGER,
    sleep_awake_seconds INTEGER,
    step_count INTEGER, -- Pasos registrados
    readiness_score_raw FLOAT, -- Puntuación bruta del sensor (si existe)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_timestamp UNIQUE (timestamp)
);

-- 2. DIMENSIÓN COGNITIVA (Rendimiento Intelectual)
-- Registra el output y la eficiencia del cerebro.
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    activity_type VARCHAR(50), -- 'deep_work', 'creative', 'admin', 'learning'
    tasks_completed INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0, -- Errores críticos detectados (bugs, omisiones)
    subjective_focus_score INTEGER, -- 1-10 (Cómo se sintió el usuario)
    cognitive_load_rpe INTEGER, -- 1-10 (Esfuerzo percibido)
    context_metadata JSONB, -- Apps usadas, archivos editados, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. DIMENSIÓN CONDUCTUAL (Inputs Externos/Hábitos)
-- Registra lo que el usuario "introduce" en su sistema.
CREATE TABLE user_inputs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL,
    category VARCHAR(50), -- 'nutrition', 'supplement', 'training', 'meditation', 'social'
    item_name VARCHAR(100), -- 'Caffeine', 'Creatine', 'Leg Day', 'Alcohol'
    amount FLOAT,
    unit VARCHAR(20), -- 'mg', 'ml', 'kcal', 'rpe'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. DIMENSIÓN AMBIENTAL (Contexto Externo)
-- Registra variables que afectan la homeostasis de forma exógena.
CREATE TABLE environmental_context (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL,
    location_label VARCHAR(50), -- 'home_office', 'gym', 'outdoor'
    temp_c FLOAT,
    humidity_pct FLOAT,
    co2_ppm INTEGER, -- Calidad del aire (Crítico para enfoque cognitivo)
    noise_db FLOAT,
    lux_level FLOAT, -- Exposición a luz (Circadiano)
    uv_index FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.5 DIMENSIÓN PSICOLÓGICA (Salud Mental Percibida)
-- Registra el estado mental subjetivo del usuario.
CREATE TABLE metrics_mental_health (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL,
    mood_score INTEGER, -- 1-10
    stress_level INTEGER, -- 1-10
    anxiety_level INTEGER, -- 1-10
    motivation_score INTEGER, -- 1-10
    subjective_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CAPA DE INFERENCIA (Resultados del Sistema)
-- Almacena las conclusiones generadas por el modelo de IA.
CREATE TABLE inference_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_date DATE NOT NULL UNIQUE,
    readiness_score FLOAT, -- 0.0 a 1.0 (Capacidad de carga calculada por Aegis)
    fatigue_level VARCHAR(20), -- 'Low', 'Moderate', 'High', 'Critical'
    cognitive_latency_prediction FLOAT, -- Estimación de retraso en respuesta
    peak_window_start TIME, -- Inicio de ventana de alto rendimiento
    peak_window_end TIME,
    recommendation_summary TEXT, -- "Priorizar recuperación activa"
    protocol_applied TEXT, -- Nombre del protocolo sugerido (ej. 'Damage Control')
    model_version VARCHAR(50),
    inference_metadata JSONB, -- Detalles técnicos de la inferencia
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para optimizar consultas de series temporales
CREATE INDEX idx_biometric_time ON metrics_biometric(timestamp DESC);
CREATE INDEX idx_activity_time ON activity_logs(start_time DESC);
CREATE INDEX idx_inputs_time ON user_inputs(timestamp DESC);
CREATE INDEX idx_mental_time ON metrics_mental_health(timestamp DESC);
CREATE INDEX idx_inference_date ON inference_results(target_date DESC);

-- 6. CAPA DE PLANIFICACIÓN (Misión del Día)
-- Almacena el briefing del usuario y el plan estructurado por la IA.
CREATE TABLE daily_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_date DATE NOT NULL UNIQUE,
    raw_briefing TEXT,
    ai_plan JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tareas individuales generadas para un plan.
CREATE TABLE plan_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID REFERENCES daily_plans(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    scheduled_time TIME,
    type VARCHAR(50), -- 'cognitive', 'physical', 'leisure', 'admin'
    ai_rationale TEXT,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_plan_tasks_plan_id ON plan_tasks(plan_id);
CREATE INDEX idx_daily_plans_date ON daily_plans(target_date);

-- 7. CAPA DE ENTRENAMIENTO (Entrenador Personal)
-- Perfil técnico y físico del Judoka.
CREATE TABLE judoka_profile (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    belt_rank VARCHAR(50),
    weight_category VARCHAR(50),
    preferred_style VARCHAR(100),
    injury_history TEXT,
    goals TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventario de técnicas y niveles de maestría.
CREATE TABLE judoka_techniques (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50), -- 'Tachi-waza', 'Ne-waza'
    mastery_level INTEGER DEFAULT 1, -- 1-5
    is_tokui_waza BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
