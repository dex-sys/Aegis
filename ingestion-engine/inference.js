/**
 * Proyecto Aegis - AI Inference Engine
 * Goal: Generate "Estado de Combate" report using gemini-cli
 */

const { Client } = require('pg');
const { execSync } = require('child_process');
const fs = require('fs');

const dbClient = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function runInference() {
  await dbClient.connect();
  console.log('--- Aegis Inference Job Started ---');

  const promptFile = `current_prompt_${Date.now()}.txt`;

  try {
    // Marcar que la IA está analizando
    await dbClient.query("UPDATE system_status SET value = 'analyzing', updated_at = NOW() WHERE key = 'ingestion_state'");

    // 1. Obtener contexto: Últimas actividades, biometría y SALUD MENTAL
    const activityResult = await dbClient.query('SELECT * FROM activity_logs ORDER BY start_time DESC LIMIT 50');

    // Agregamos métricas agregadas de los últimos 28 días para el Fatigue Engine (ACWR)
    const trendResult = await dbClient.query(`
      SELECT 
        date_group as date,
        AVG(rhr_bpm) as avg_rhr,
        AVG(hrv_ms) as avg_hrv,
        SUM(step_count) as daily_steps,
        (SUM(sleep_duration_seconds) / 3600.0)::FLOAT as sleep_hours,
        SUM(sleep_score) as sleep_score_sum -- Para promediar si hay varios registros
      FROM (
        SELECT 
          CASE 
            WHEN step_count IS NOT NULL AND sleep_duration_seconds IS NULL THEN DATE(timestamp)
            ELSE DATE(timestamp + interval '6 hours')
          END as date_group,
          rhr_bpm, hrv_ms, step_count, 
          sleep_duration_seconds, sleep_score
        FROM metrics_biometric
        WHERE timestamp > NOW() - INTERVAL '35 days'
      ) as adjusted_metrics
      GROUP BY date_group
      ORDER BY date_group DESC
      LIMIT 35
    `);

    // Obtener Tendencia de Salud Mental para el ACWR Holístico
    const mentalTrendResult = await dbClient.query(`
      SELECT 
        DATE(timestamp) as date,
        AVG(stress_level) as avg_stress,
        AVG(mood_score) as avg_mood
      FROM metrics_mental_health
      WHERE timestamp > NOW() - INTERVAL '35 days'
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `);

    // Calcular Fatigue Metrics Holísticas (Carga = ((RPE * Duration) + (Steps / 100)) * SleepModifier * StressModifier)
    const calculateHolisticWorkload = (days) => {
      const now = new Date();
      let totalWeightedLoad = 0;

      for (let i = 0; i < days; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];

        // 1. Carga Base (Actividades + Pasos)
        const dayActivities = activityResult.rows.filter(act => 
          new Date(act.start_time).toISOString().split('T')[0] === dateStr
        );
        const activityLoad = dayActivities.reduce((acc, act) => {
          const duration = act.context_metadata?.duration_minutes || 60;
          const rpe = act.cognitive_load_rpe || 5;
          return acc + (duration * rpe);
        }, 0);

        const dayTrend = trendResult.rows.find(row => 
          new Date(row.date).toISOString().split('T')[0] === dateStr
        );
        const stepLoad = dayTrend ? (parseInt(dayTrend.daily_steps || 0) / 100) : 0;
        
        const baseLoad = activityLoad + stepLoad;

        // 2. Multiplicadores Holísticos
        let sleepMultiplier = 1.0;
        if (dayTrend && dayTrend.sleep_hours > 0) {
          const hours = dayTrend.sleep_hours;
          if (hours < 6) sleepMultiplier = 1.4;
          else if (hours < 7) sleepMultiplier = 1.2;
          else if (hours > 8.5) sleepMultiplier = 0.9; // Recuperación extra
        }

        let stressMultiplier = 1.0;
        const dayMental = mentalTrendResult.rows.find(row => 
          new Date(row.date).toISOString().split('T')[0] === dateStr
        );
        if (dayMental && dayMental.avg_stress) {
          const stress = dayMental.avg_stress;
          if (stress >= 8) stressMultiplier = 1.5;
          else if (stress >= 6) stressMultiplier = 1.2;
          else if (stress <= 3) stressMultiplier = 0.9;
        }

        totalWeightedLoad += (baseLoad * sleepMultiplier * stressMultiplier);
      }

      return totalWeightedLoad;
    };

    const acuteWorkload = calculateHolisticWorkload(7) / 7;
    const chronicWorkload = calculateHolisticWorkload(28) / 28;
    const acwr = chronicWorkload > 0 ? (acuteWorkload / chronicWorkload).toFixed(2) : 1.0;

    const mentalResult = await dbClient.query('SELECT * FROM metrics_mental_health ORDER BY timestamp DESC LIMIT 5');

    // Agregamos nutrición de las últimas 24h
    const nutritionResult = await dbClient.query(`
      SELECT 
        SUM(kcal) as total_kcal,
        SUM(protein_g) as total_protein,
        SUM(carbs_g) as total_carbs,
        SUM(fats_g) as total_fats
      FROM nutrition_logs 
      WHERE timestamp > NOW() - INTERVAL '24 hours'
    `);

    // Calcular densidad de datos de actividad
    const activityDays = new Set(activityResult.rows.map(a => new Date(a.start_time).toISOString().split('T')[0])).size;

    const context = {
      fatigue_engine: {
        acute_workload_7d: Math.round(acuteWorkload),
        chronic_workload_28d: Math.round(chronicWorkload),
        acwr_ratio: acwr, // 0.8-1.3 is the "sweet spot", >1.5 is danger
        description: "Relación entre carga aguda y crónica ponderada por calidad de sueño y estrés mental (ACWR Holístico)."
      },
      recent_activities: activityResult.rows.slice(0, 5),
      biometric_trends_28d: trendResult.rows,
      recent_mental_health: mentalResult.rows,
      nutrition_last_24h: nutritionResult.rows[0],
      system_metadata: {
        total_days_tracked: trendResult.rows.length,
        activity_days_tracked: activityDays,
        is_cold_start: activityDays < 14
      },
      target_date: new Date().toISOString().split('T')[0]
    };

    // 2. Preparar el Prompt
    const prompt = `
Actúa como un Lead Systems Architect y experto en Fisiología del Rendimiento Humano. 
Tu objetivo es generar un reporte de "Estado de Combate" basado en datos biométricos, de actividad, SALUD MENTAL y NUTRICIÓN.

DATOS DE CONTEXTO (Fatigue Engine + Raw Data):
${JSON.stringify(context, null, 2)}

CONFIGURACIÓN DE SEGURIDAD:
- Si "is_cold_start" es true (pocos días de datos), el ACWR de 4.0 es un artefacto matemático. NO des alertas de lesión crítica basándote solo en esto. Sé cauteloso pero prioriza la acumulación de datos.
- Considera que el usuario está empezando a trackear ahora.

TAREAS:
1. Analiza el ACWR (Acute:Chronic Workload Ratio). Si es > 1.5, el riesgo de lesión es alto. Si es < 0.8, hay desentrenamiento.
2. Evalúa la recuperación biométrica (HRV, Sueño) en relación con la carga (Acute Workload).
3. Analiza la Nutrición: ¿Es suficiente la energía (kcal) y proteína para la carga de Judo detectada?
4. Analiza la Salud Mental Percibida (Mood, Stress, Anxiety, Motivation).
5. Genera un Readiness Score de 0.0 a 1.0.
6. Define el Nivel de Fatiga (Low, Moderate, High, Critical).
7. Sugiere una Ventana de Máximo Rendimiento (Peak Window) para hoy.
8. Proporciona un resumen ejecutivo de recomendaciones claras.

IMPORTANTE: Responde ÚNICAMENTE en formato JSON válido con la siguiente estructura:
{
  "readiness_score": float,
  "fatigue_level": "string",
  "peak_window_start": "HH:MM",
  "peak_window_end": "HH:MM",
  "recommendation_summary": "string",
  "protocol_applied": "string",
  "rationale": "Breve explicación técnica"
}
`;

    fs.writeFileSync(promptFile, prompt);

    // 3. Ejecutar Gemini
    console.log('Consulting Gemini AI...');
    const GEMINI_CMD = '/usr/local/bin/gemini';
    let geminiOutput;
    try {
      geminiOutput = execSync(`cat ${promptFile} | ${GEMINI_CMD} --prompt ""`).toString();
    } catch (execErr) {
      console.error('Error executing Gemini CLI:', execErr.stderr?.toString() || execErr.message);
      throw execErr;
    }

    // console.log('Raw AI Output:', geminiOutput); // Descomentar si falla el parseo
    // Intentar limpiar el output de Gemini (a veces incluye bloques de código markdown)
    const jsonMatch = geminiOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Raw Gemini Output:', geminiOutput);
      throw new Error('No valid JSON found in AI output');
    }

    const inference = JSON.parse(jsonMatch[0]);
    console.log('AI Inference Received:', inference.recommendation_summary);

    // 4. Guardar resultados en la DB
    const insertQuery = `
      INSERT INTO inference_results 
      (target_date, readiness_score, fatigue_level, peak_window_start, peak_window_end, recommendation_summary, protocol_applied, inference_metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (target_date) DO UPDATE SET
        readiness_score = EXCLUDED.readiness_score,
        fatigue_level = EXCLUDED.fatigue_level,
        recommendation_summary = EXCLUDED.recommendation_summary,
        inference_metadata = EXCLUDED.inference_metadata;
    `;

    await dbClient.query(insertQuery, [
      context.target_date,
      inference.readiness_score,
      inference.fatigue_level,
      inference.peak_window_start,
      inference.peak_window_end,
      inference.recommendation_summary,
      inference.protocol_applied,
      JSON.stringify({
        rationale: inference.rationale,
        model: 'gemini-cli',
        fatigue_engine: context.fatigue_engine
      })
    ]);

    // 5. Generar Alertas del Sistema
    if (inference.readiness_score < 0.4 || ['High', 'Critical'].includes(inference.fatigue_level) || context.fatigue_engine.acwr_ratio > 1.5) {
      const alertQuery = `
        INSERT INTO system_alerts (level, category, message, metadata)
        VALUES ($1, $2, $3, $4)
      `;
      const level = context.fatigue_engine.acwr_ratio > 1.8 ? 'critical' : 'warning';
      const message = `Alerta de Rendimiento: ${inference.fatigue_level} Fatiga detectada. ACWR: ${context.fatigue_engine.acwr_ratio}. ${inference.recommendation_summary.substring(0, 100)}...`;

      await dbClient.query(alertQuery, [
        level,
        'fatigue',
        message,
        JSON.stringify({ readiness: inference.readiness_score, acwr: context.fatigue_engine.acwr_ratio })
      ]);
      console.log('System Alert Generated!');
    }

    console.log(`--- Report successfully generated for ${context.target_date} ---`);
    await dbClient.query("UPDATE system_status SET value = 'idle', updated_at = NOW() WHERE key = 'ingestion_state'");

  } catch (err) {
    console.error('Inference Error:', err);
    await dbClient.query("UPDATE system_status SET value = 'idle', updated_at = NOW() WHERE key = 'ingestion_state'");
  } finally {
    if (fs.existsSync(promptFile)) {
      fs.unlinkSync(promptFile);
    }
    await dbClient.end();
  }
}

runInference();
