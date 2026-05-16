const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec, execSync } = require('child_process');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dropzone = process.env.DROPZONE_PATH || '/app/dropzone';
    // Asegurarse de que el directorio existe
    if (!fs.existsSync(dropzone)) {
      fs.mkdirSync(dropzone, { recursive: true });
    }
    cb(null, dropzone);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  limits: { fileSize: 200 * 1024 * 1024 }, // Límite de 200MB para XMLs grandes
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.xml' || path.extname(file.originalname).toLowerCase() === '.json' || path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Formato de archivo no soportado. Use XML, JSON o CSV.'));
    }
  },
  storage: storage 
});

app.use(cors());
app.use(express.json());

// Helper para disparar inferencia
const triggerInference = () => {
  console.log('Triggering AI Inference via Dropzone...');
  const triggerPath = path.join(process.env.DROPZONE_PATH || '/app/dropzone', '.trigger');
  fs.writeFileSync(triggerPath, '');
};

// Endpoint: Upload Health Data
app.post('/api/upload', upload.single('healthData'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se ha subido ningún archivo.' });
  }
  res.json({ 
    message: 'Archivo recibido y en cola para procesamiento.',
    filename: req.file.filename 
  });
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(cors());
app.use(express.json());

// Endpoint: Biometric Battery (HRV + Sleep + Readiness)
app.get('/api/metrics/battery', async (req, res) => {
  try {
    const latestInference = await pool.query('SELECT readiness_score, inference_metadata FROM inference_results ORDER BY target_date DESC LIMIT 1');
    const latestMetrics = await pool.query(`
      SELECT 
        hrv_ms,
        (
          LEAST(40, (SUM(sleep_duration_seconds + sleep_rem_seconds + sleep_deep_seconds + sleep_light_seconds) / 25200.0) * 40) +
          LEAST(25, (SUM(sleep_deep_seconds)::FLOAT / NULLIF(SUM(sleep_duration_seconds + sleep_rem_seconds + sleep_deep_seconds + sleep_light_seconds), 0) / 0.20) * 25) +
          LEAST(25, (SUM(sleep_rem_seconds)::FLOAT / NULLIF(SUM(sleep_duration_seconds + sleep_rem_seconds + sleep_deep_seconds + sleep_light_seconds), 0) / 0.20) * 25) +
          GREATEST(0, 10 - (SUM(sleep_awake_seconds)::FLOAT / NULLIF(SUM(sleep_duration_seconds + sleep_rem_seconds + sleep_deep_seconds + sleep_light_seconds + sleep_awake_seconds), 0) * 100))
        )::INTEGER as sleep_score
      FROM metrics_biometric
      WHERE timestamp > NOW() - INTERVAL '24 hours'
      GROUP BY hrv_ms
      ORDER BY hrv_ms DESC LIMIT 1
    `);

    const hrvBaselineRes = await pool.query('SELECT AVG(hrv_ms) as baseline FROM metrics_biometric WHERE timestamp > NOW() - INTERVAL '7 days'');
    
    const readiness = latestInference.rows[0]?.readiness_score || 0.5;
    const sleep = latestMetrics.rows[0]?.sleep_score || 70;
    const hrv = latestMetrics.rows[0]?.hrv_ms || 50;
    const baseline = hrvBaselineRes.rows[0]?.baseline || 50;

    // Algoritmo de Batería Aegis:
    // 40% Readiness + 30% Calidad Sueño + 30% HRV vs Baseline
    const hrvFactor = Math.min(1.2, hrv / baseline);
    const batteryLevel = Math.round(
      (readiness * 40) + 
      (sleep * 0.3) + 
      (Math.min(100, (hrvFactor * 100) * 0.3))
    );

    res.json({
      level: Math.min(100, Math.max(0, batteryLevel)),
      factors: {
        readiness: Math.round(readiness * 100),
        sleep_score: sleep,
        hrv_status: hrvFactor > 1.1 ? 'optimal' : hrvFactor > 0.9 ? 'stable' : 'low'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Latest Inference
app.get('/api/inference/latest', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inference_results ORDER BY target_date DESC LIMIT 1');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: System Status
app.get('/api/status', async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM system_status WHERE key = 'ingestion_state'");
    res.json(result.rows[0] || { value: 'unknown' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Inference Trend
app.get('/api/inference/trend', async (req, res) => {
  try {
    const result = await pool.query('SELECT target_date, readiness_score FROM inference_results ORDER BY target_date ASC LIMIT 30');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Biometric Trends
app.get('/api/metrics/biometric/trend', async (req, res) => {
  try {
    // Usamos una lógica de "Día Subjetivo":
    // El sueño y biométricos de recuperación se desplazan 6h para que la noche completa cuente en el día que despiertas.
    // Los pasos se mantienen en el día natural (calendario).
    const result = await pool.query(`
      SELECT 
        date_group as date,
        AVG(rhr_bpm) as rhr,
        AVG(hrv_ms) as hrv,
        SUM(step_count)::INT as steps,
        (SUM(sleep_duration_seconds) / 3600.0)::FLOAT as sleep_hours,
        (SUM(sleep_rem_seconds) / 3600.0)::FLOAT as sleep_rem,
        (SUM(sleep_deep_seconds) / 3600.0)::FLOAT as sleep_deep,
        (SUM(sleep_light_seconds) / 3600.0)::FLOAT as sleep_light,
        (SUM(sleep_awake_seconds) / 3600.0)::FLOAT as sleep_awake,
        -- Algoritmo de Calidad de Sueño Aegis (0-100)
        CASE 
          WHEN SUM(sleep_duration_seconds + sleep_rem_seconds + sleep_deep_seconds + sleep_light_seconds) = 0 THEN NULL
          ELSE (
            LEAST(40, (SUM(sleep_duration_seconds + sleep_rem_seconds + sleep_deep_seconds + sleep_light_seconds) / 25200.0) * 40) + -- Duración (40 pts si >7h)
            LEAST(25, (SUM(sleep_deep_seconds)::FLOAT / NULLIF(SUM(sleep_duration_seconds + sleep_rem_seconds + sleep_deep_seconds + sleep_light_seconds), 0) / 0.20) * 25) + -- Profundo (25 pts si >20%)
            LEAST(25, (SUM(sleep_rem_seconds)::FLOAT / NULLIF(SUM(sleep_duration_seconds + sleep_rem_seconds + sleep_deep_seconds + sleep_light_seconds), 0) / 0.20) * 25) + -- REM (25 pts si >20%)
            GREATEST(0, 10 - (SUM(sleep_awake_seconds)::FLOAT / NULLIF(SUM(sleep_duration_seconds + sleep_rem_seconds + sleep_deep_seconds + sleep_light_seconds + sleep_awake_seconds), 0) * 100)) -- Eficiencia/Awake (10 pts)
          )::INTEGER
        END as sleep_score
      FROM (
        SELECT 
          CASE 
            WHEN step_count IS NOT NULL AND sleep_duration_seconds IS NULL THEN DATE(timestamp)
            ELSE DATE(timestamp + interval '6 hours')
          END as date_group,
          rhr_bpm, hrv_ms, step_count, 
          sleep_duration_seconds, sleep_rem_seconds, sleep_deep_seconds, sleep_light_seconds, sleep_awake_seconds
        FROM metrics_biometric
      ) as adjusted_metrics
      GROUP BY date_group
      ORDER BY date_group DESC 
      LIMIT 30
    `);
    res.json(result.rows.reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Mental Health Trends
app.get('/api/metrics/mental/trend', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM metrics_mental_health ORDER BY timestamp ASC LIMIT 30');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Fatigue Trend (ACWR) - Prediction Focus
app.get('/api/metrics/fatigue/trend', async (req, res) => {
  try {
    const query = `
      WITH daily_base_load AS (
          SELECT 
              date_group,
              SUM(load) as base_load
          FROM (
              SELECT 
                  DATE(start_time) as date_group,
                  COALESCE((context_metadata->>'duration_minutes')::INT, 60) * COALESCE(cognitive_load_rpe, 5) as load
              FROM activity_logs
              UNION ALL
              SELECT 
                  DATE(timestamp) as date_group,
                  step_count / 100.0 as load
              FROM metrics_biometric
              WHERE step_count IS NOT NULL
          ) t
          GROUP BY date_group
      ),
      daily_modifiers AS (
          SELECT 
              date_group,
              AVG(sleep_mult) as sleep_mult,
              AVG(stress_mult) as stress_mult
          FROM (
              SELECT 
                DATE(timestamp + interval '6 hours') as date_group,
                CASE 
                  WHEN (sleep_duration_seconds / 3600.0) < 6 THEN 1.4
                  WHEN (sleep_duration_seconds / 3600.0) < 7 THEN 1.2
                  WHEN (sleep_duration_seconds / 3600.0) > 8.5 THEN 0.9
                  ELSE 1.0
                END as sleep_mult,
                1.0 as stress_mult
              FROM metrics_biometric
              WHERE sleep_duration_seconds IS NOT NULL
              UNION ALL
              SELECT 
                DATE(timestamp) as date_group,
                1.0 as sleep_mult,
                CASE 
                  WHEN stress_level >= 8 THEN 1.5
                  WHEN stress_level >= 6 THEN 1.2
                  WHEN stress_level <= 3 THEN 0.9
                  ELSE 1.0
                END as stress_mult
              FROM metrics_mental_health
          ) m
          GROUP BY date_group
      ),
      past_load AS (
          SELECT 
              dbl.date_group as date,
              dbl.base_load * COALESCE(dm.sleep_mult, 1.0) * COALESCE(dm.stress_mult, 1.0) as total_load
          FROM daily_base_load dbl
          LEFT JOIN daily_modifiers dm ON dbl.date_group = dm.date_group
      ),
      avg_recent_load AS (
          SELECT COALESCE(AVG(total_load), 0) as avg_load
          FROM past_load
          WHERE date >= CURRENT_DATE - INTERVAL '14 days'
      ),
      future_dates AS (
          SELECT generate_series(
              CURRENT_DATE, 
              (CURRENT_DATE + INTERVAL '14 days')::DATE, 
              '1 day'::interval
          )::DATE as date
      ),
      combined_load AS (
          SELECT date, total_load, false as is_predicted FROM past_load
          UNION ALL
          SELECT fd.date, arl.avg_load as total_load, true as is_predicted 
          FROM future_dates fd, avg_recent_load arl
          WHERE fd.date NOT IN (SELECT date FROM past_load)
      ),
      moving_averages AS (
          SELECT 
              date,
              total_load,
              is_predicted,
              AVG(total_load) OVER (ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) as acute_workload,
              AVG(total_load) OVER (ORDER BY date ROWS BETWEEN 27 PRECEDING AND CURRENT ROW) as chronic_workload
          FROM combined_load
      )
      SELECT 
          date,
          ROUND(acute_workload::numeric, 2) as acute_workload,
          ROUND(chronic_workload::numeric, 2) as chronic_workload,
          CASE 
              WHEN chronic_workload > 0 THEN ROUND((acute_workload / chronic_workload)::numeric, 2)
              ELSE 1.0
          END as acwr,
          is_predicted
      FROM moving_averages
      WHERE date >= CURRENT_DATE
      ORDER BY date ASC;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Nutrition Logs
app.get('/api/nutrition', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM nutrition_logs ORDER BY timestamp DESC LIMIT 20');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Create Nutrition Log
app.post('/api/nutrition', async (req, res) => {
  const { raw_text } = req.body;
  try {
    const query = "INSERT INTO nutrition_logs (raw_text) VALUES ($1) RETURNING *";
    const result = await pool.query(query, [raw_text]);
    const newLog = result.rows[0];
    res.status(201).json(newLog);

    // Disparar Parser de Nutrición vía Dropzone
    console.log(`Triggering Nutrition Parser via Dropzone for ID: ${newLog.id}`);
    const mealTriggerPath = path.join(process.env.DROPZONE_PATH || '/app/dropzone', `${newLog.id}.meal`);
    fs.writeFileSync(mealTriggerPath, newLog.id);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Nutrition Tactical Advice
app.get('/api/nutrition/advice', async (req, res) => {
  try {
    console.log('Generating tactical nutrition advice...');
    exec('docker exec aegis-inference node /app/get_nutrition_advice.js', (error, stdout, stderr) => {
      if (error) {
        console.error('Advice Error:', error);
        return res.status(500).json({ error: 'Failed to generate advice' });
      }
      try {
        const advice = JSON.parse(stdout);
        res.json(advice);
      } catch (parseErr) {
        res.status(500).json({ error: 'Failed to parse AI response' });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Delete Nutrition Log
app.delete('/api/nutrition/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM nutrition_logs WHERE id = $1', [id]);
    res.json({ success: true, message: 'Registro de comida eliminado.' });
    triggerInference(); // Recalcular estado tras borrar
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CAPA DE PLANIFICACIÓN (Misión del Día) ---

// Endpoint: Generate Day Plan
app.post('/api/plan/generate', async (req, res) => {
  const { raw_briefing } = req.body;
  const targetDate = new Date().toISOString().split('T')[0];
  try {
    // 1. Guardar o actualizar el briefing
    const query = `
      INSERT INTO daily_plans (target_date, raw_briefing, status)
      VALUES ($1, $2, 'processing')
      ON CONFLICT (target_date) DO UPDATE SET raw_briefing = EXCLUDED.raw_briefing, status = 'processing'
      RETURNING *
    `;
    const result = await pool.query(query, [targetDate, raw_briefing]);
    const plan = result.rows[0];

    // 2. Disparar el generador de IA
    console.log('Triggering AI Day Plan Generator...');
    exec('docker exec aegis-inference node /app/generate_plan.js', (error, stdout, stderr) => {
      if (error) {
        console.error('Plan Generation Trigger Error:', error);
      } else {
        console.log('Plan Generation Triggered Successfully');
      }
    });

    res.status(202).json({ message: 'Planificación en proceso...', plan_id: plan.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Get Today's Plan and Tasks
app.get('/api/plan/today', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const planResult = await pool.query('SELECT * FROM daily_plans WHERE target_date = $1', [today]);
    if (planResult.rows.length === 0) {
      return res.json({ plan: null, tasks: [] });
    }
    const plan = planResult.rows[0];
    const tasksResult = await pool.query('SELECT * FROM plan_tasks WHERE plan_id = $1 ORDER BY scheduled_time ASC', [plan.id]);
    res.json({ plan, tasks: tasksResult.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Toggle Task Completion
app.patch('/api/plan/tasks/:id/complete', async (req, res) => {
  const { id } = req.params;
  const { is_completed } = req.body;
  try {
    const result = await pool.query(
      'UPDATE plan_tasks SET is_completed = $1 WHERE id = $2 RETURNING *',
      [is_completed, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tarea no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Update Task RPE Score
app.patch('/api/plan/tasks/:id/rpe', async (req, res) => {
  const { id } = req.params;
  const { rpe_score } = req.body;
  try {
    await pool.query('UPDATE plan_tasks SET rpe_score = $1 WHERE id = $2', [rpe_score, id]);
    res.json({ success: true, message: 'RPE registrado correctamente.' });
    triggerInference();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Supplements Logs
app.get('/api/supplements', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM user_inputs WHERE category = 'supplement' AND timestamp > CURRENT_DATE ORDER BY timestamp DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Create Supplement Log
app.post('/api/supplements', async (req, res) => {
  const { item_name, amount, unit } = req.body;
  try {
    const query = `
      INSERT INTO user_inputs (timestamp, category, item_name, amount, unit)
      VALUES (NOW(), 'supplement', $1, $2, $3)
      RETURNING *
    `;
    const result = await pool.query(query, [item_name, amount, unit]);
    res.status(201).json(result.rows[0]);
    triggerInference();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Create Mental Health Record
app.post('/api/metrics/mental', async (req, res) => {
  const { mood_score, stress_level, anxiety_level, motivation_score, subjective_notes } = req.body;
  try {
    const query = `
      INSERT INTO metrics_mental_health (timestamp, mood_score, stress_level, anxiety_level, motivation_score, subjective_notes)
      VALUES (NOW(), $1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [mood_score, stress_level, anxiety_level, motivation_score, subjective_notes];
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
    triggerInference();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Activity Logs
app.get('/api/activities', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM activity_logs ORDER BY start_time DESC LIMIT 10');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Get System Alerts
app.get('/api/alerts', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM system_alerts WHERE is_read = FALSE ORDER BY timestamp DESC LIMIT 10');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Mark Alert as Read
app.post('/api/alerts/:id/read', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE system_alerts SET is_read = TRUE WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Create Activity Log (Manual)
app.post('/api/activities', async (req, res) => {
  const { start_time, activity_type, cognitive_load_rpe, context_metadata } = req.body;
  try {
    const query = `
      INSERT INTO activity_logs (start_time, activity_type, cognitive_load_rpe, context_metadata)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [
      start_time || new Date(),
      activity_type || 'judo',
      cognitive_load_rpe,
      JSON.stringify(context_metadata || {})
    ];
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
    triggerInference();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- CAPA DE ENTRENAMIENTO (Entrenador Personal) ---

// Endpoint: Get Judoka Profile
app.get('/api/coach/profile', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM judoka_profile LIMIT 1');
    if (result.rows.length === 0) {
      return res.json({ profile: null });
    }
    res.json({ profile: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Create or Update Judoka Profile
app.post('/api/coach/profile', async (req, res) => {
  const { belt_rank, weight_category, preferred_style, injury_history, goals } = req.body;
  console.log('Received profile update request:', { belt_rank, weight_category });
  try {
    // Intentar obtener el ID del perfil existente (solo permitimos uno por ahora)
    const checkProfile = await pool.query('SELECT id FROM judoka_profile LIMIT 1');
    let query;
    let values;

    if (checkProfile.rows.length > 0) {
      // Actualizar existente
      query = `
        UPDATE judoka_profile SET 
          belt_rank = $1, weight_category = $2, preferred_style = $3, injury_history = $4, goals = $5, updated_at = NOW()
        WHERE id = $6 RETURNING *
      `;
      values = [belt_rank, weight_category, preferred_style, injury_history, goals, checkProfile.rows[0].id];
    } else {
      // Insertar nuevo
      query = `
        INSERT INTO judoka_profile (belt_rank, weight_category, preferred_style, injury_history, goals)
        VALUES ($1, $2, $3, $4, $5) RETURNING *
      `;
      values = [belt_rank, weight_category, preferred_style, injury_history, goals];
    }

    const result = await pool.query(query, values);
    console.log('Profile saved successfully:', result.rows[0].id);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Database error in /coach/profile:', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Get Techniques
app.get('/api/coach/techniques', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM judoka_techniques ORDER BY category, name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Add Technique
app.post('/api/coach/techniques', async (req, res) => {
  const { name, category, mastery_level, is_tokui_waza } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO judoka_techniques (name, category, mastery_level, is_tokui_waza) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, category, mastery_level || 1, is_tokui_waza || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Update Technique Mastery
app.patch('/api/coach/techniques/:id', async (req, res) => {
  const { id } = req.params;
  const { mastery_level } = req.body;
  try {
    const result = await pool.query(
      'UPDATE judoka_techniques SET mastery_level = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [mastery_level, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Técnica no encontrada' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Delete Technique
app.delete('/api/coach/techniques/:id', async (req, res) => {
  const { id } = req.params;
  console.log('Attempting to delete technique:', id);
  try {
    const result = await pool.query('DELETE FROM judoka_techniques WHERE id = $1', [id]);
    console.log('Delete result rowCount:', result.rowCount);
    res.json({ success: true, id, message: 'Técnica eliminada correctamente.' });
  } catch (err) {
    console.error('Error deleting technique:', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Get Coaching Recommendation (Persistent)
app.get('/api/coach/recommendation', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const cachedRec = await pool.query('SELECT * FROM coach_recommendations WHERE target_date = $1', [today]);
    if (cachedRec.rows.length > 0) {
      return res.json(cachedRec.rows[0]);
    }
    res.json(null);
  } catch (err) {
    console.error('Error fetching cached recommendation:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Trigger AI Coach Generation
app.post('/api/coach/recommendation/generate', async (req, res) => {
  try {
    const profileRes = await pool.query('SELECT id FROM judoka_profile LIMIT 1');
    if (profileRes.rows.length === 0) {
      return res.status(400).json({ error: 'Debes completar tu perfil de Judoka primero.' });
    }

    console.log('Manually triggering AI Coach Engine...');
    exec('docker exec aegis-inference node /app/get_coach_advice.js', (error, stdout, stderr) => {
      if (error) {
        console.error('Generation Error:', error);
        return res.status(500).json({ error: 'Failed to generate recommendation' });
      }
      
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          res.json(JSON.parse(jsonMatch[0]));
        } catch (parseErr) {
          res.status(500).json({ error: 'Failed to parse AI response' });
        }
      } else {
        res.status(500).json({ error: 'AI Engine failed to return valid JSON' });
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Delete Activity Log
app.delete('/api/activities/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM activity_logs WHERE id = $1', [id]);
    res.json({ success: true, message: 'Actividad eliminada correctamente.' });
    triggerInference();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Get Randori Feedback for today
app.get('/api/coach/feedback/today', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  try {
    const result = await pool.query('SELECT * FROM judo_randori_feedback WHERE target_date = $1', [today]);
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint: Save Randori Feedback
app.post('/api/coach/feedback', async (req, res) => {
  const { tachi_waza_success, ne_waza_success, notes } = req.body;
  const today = new Date().toISOString().split('T')[0];
  try {
    const query = `
      INSERT INTO judo_randori_feedback (target_date, tachi_waza_success, ne_waza_success, notes)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (target_date) DO UPDATE SET 
        tachi_waza_success = EXCLUDED.tachi_waza_success,
        ne_waza_success = EXCLUDED.ne_waza_success,
        notes = EXCLUDED.notes
      RETURNING *
    `;
    const result = await pool.query(query, [today, tachi_waza_success, ne_waza_success, notes]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Aegis API Server running on port ${port}`);
  });
}

module.exports = { app, pool };
