/**
 * Aegis Chat Handler
 * Goal: specialized logic for open-ended queries with full context
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function handleAegisChat(pool, userMessage) {
  console.log('--- Aegis Chat Request ---');
  
  // 1. Fetch Complete Context (similar to inference.js but for immediate chat)
  const [activities, biometrics, mental, nutrition] = await Promise.all([
    pool.query('SELECT * FROM activity_logs ORDER BY start_time DESC LIMIT 20'),
    pool.query(`
      SELECT date_group as date, AVG(rhr_bpm) as rhr, AVG(hrv_ms) as hrv, SUM(step_count) as steps,
      (SUM(sleep_duration_seconds)/3600.0) as sleep_hours, (SUM(sleep_rem_seconds)/3600.0) as rem,
      (SUM(sleep_deep_seconds)/3600.0) as deep
      FROM (
        SELECT CASE WHEN step_count IS NOT NULL AND sleep_duration_seconds IS NULL THEN DATE(timestamp) ELSE DATE(timestamp + interval '6 hours') END as date_group,
        rhr_bpm, hrv_ms, step_count, sleep_duration_seconds, sleep_rem_seconds, sleep_deep_seconds
        FROM metrics_biometric WHERE timestamp > NOW() - INTERVAL '14 days'
      ) t GROUP BY date_group ORDER BY date_group DESC
    `),
    pool.query('SELECT * FROM metrics_mental_health ORDER BY timestamp DESC LIMIT 10'),
    pool.query('SELECT * FROM nutrition_logs ORDER BY timestamp DESC LIMIT 10')
  ]);

  const context = {
    recent_activities: activities.rows,
    biometric_trends: biometrics.rows,
    mental_health: mental.rows,
    recent_nutrition: nutrition.rows,
    current_time: new Date().toISOString()
  };

  // 2. Prepare Prompt
  const prompt = `
Actúa como Aegis, una IA de grado militar especializada en optimización del rendimiento humano y fisiología del combate.
Tienes acceso a todos los datos del usuario. Tu tono debe ser táctico, directo, profesional y basado en evidencia.

DATOS DEL USUARIO:
${JSON.stringify(context, null, 2)}

CONSULTA DEL USUARIO:
"${userMessage}"

INSTRUCCIONES:
1. Analiza los datos biométricos, nutrición y actividad para responder.
2. Si los datos sugieren fatiga alta y el usuario pregunta por entrenar, sé precavido.
3. Sé conciso pero extremadamente preciso.
4. Responde en Español.
5. NO uses bloques de código, responde con texto plano formateado con markdown (negritas, listas).
`;

  const promptPath = path.join('/tmp', `chat_prompt_${Date.now()}.txt`);
  fs.writeFileSync(promptPath, prompt);

  try {
    const GEMINI_CMD = '/usr/local/bin/gemini';
    const response = execSync(`cat ${promptPath} | ${GEMINI_CMD} --prompt ""`).toString();
    fs.unlinkSync(promptPath);
    return response;
  } catch (err) {
    console.error('Chat Error:', err);
    return "Error de enlace con el núcleo de Aegis. Inténtalo de nuevo.";
  }
}

module.exports = { handleAegisChat };
