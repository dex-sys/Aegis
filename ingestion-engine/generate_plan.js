/**
 * Proyecto Aegis - AI Day Plan Generator
 * Goal: Generate an optimized "Misión del Día" based on briefing + physiological context
 */

const { Client } = require('pg');
const { execSync } = require('child_process');
const fs = require('fs');

const dbClient = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function generatePlan() {
  await dbClient.connect();
  const targetDate = new Date().toISOString().split('T')[0];
  console.log(`--- Aegis Day Plan Generation Started for ${targetDate} ---`);

  const promptFile = `plan_prompt_${Date.now()}.txt`;

  try {
    // 1. Obtener el briefing del usuario
    const planResult = await dbClient.query('SELECT id, raw_briefing FROM daily_plans WHERE target_date = $1', [targetDate]);
    if (planResult.rows.length === 0) throw new Error('No briefing found for today');
    
    const { id: planId, raw_briefing } = planResult.rows[0];

    // 2. Obtener Contexto Fisiológico Profundo (Consultas secuenciales para evitar advertencias de pg)
    const inferenceRes = await dbClient.query('SELECT readiness_score, fatigue_level, recommendation_summary, inference_metadata FROM inference_results ORDER BY target_date DESC LIMIT 1');
    const sleepRes = await dbClient.query("SELECT sleep_duration_seconds, sleep_score FROM metrics_biometric WHERE sleep_duration_seconds IS NOT NULL ORDER BY timestamp DESC LIMIT 1");
    const nutritionRes = await dbClient.query("SELECT SUM(kcal) as kcal, SUM(protein_g) as protein FROM nutrition_logs WHERE timestamp > NOW() - INTERVAL '24 hours'");
    const mentalRes = await dbClient.query("SELECT mood_score, stress_level FROM metrics_mental_health ORDER BY timestamp DESC LIMIT 1");

    const systemContext = inferenceRes.rows[0] || {};
    const sleep = sleepRes.rows[0] || {};
    const nutrition = nutritionRes.rows[0] || {};
    const mental = mentalRes.rows[0] || {};

    // 3. Obtener Tareas Pendientes (Últimos 3 días)
    const pendingTasksResult = await dbClient.query(`
      SELECT t.title, t.type, d.target_date
      FROM plan_tasks t
      JOIN daily_plans d ON t.plan_id = d.id
      WHERE t.is_completed = false 
      AND d.target_date >= CURRENT_DATE - INTERVAL '3 days'
      AND d.target_date < CURRENT_DATE
    `);
    const pendingTasks = pendingTasksResult.rows;

    // 4. Preparar el Prompt para Gemini
    const currentTime = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const prompt = `
Actúa como un Lead Operations Strategist y experto en Optimización Humana.
Tu misión es organizar el día del usuario ("Misión del Día") basándote en su briefing, su estado fisiológico actual y tareas pendientes.

CONTEXTO TEMPORAL:
- Fecha: ${targetDate}
- Hora Actual: ${currentTime} (Organiza el día EMPEZANDO desde esta hora, no planifiques tareas en el pasado).

CONTEXTO FISIOLÓGICO DETALLADO:
- Readiness Score: ${systemContext.readiness_score} (0-1)
- Fatiga (ACWR): ${systemContext.inference_metadata?.fatigue_engine?.acwr_ratio || 'N/A'}
- Último Sueño: ${sleep.sleep_duration_seconds ? (sleep.sleep_duration_seconds / 3600).toFixed(1) : 'N/A'}h (Calidad: ${sleep.sleep_score || 'N/A'}/100)
- Nutrición (24h): ${nutrition.kcal || 0} kcal, ${nutrition.protein || 0}g proteína
- Estado Mental: Mood ${mental.mood_score || 'N/A'}/10, Estrés ${mental.stress_level || 'N/A'}/10
- Recomendación General: ${systemContext.recommendation_summary}

BRIEFING DEL USUARIO:
"${raw_briefing}"

TAREAS PENDIENTES DE DÍAS ANTERIORES:
${pendingTasks.length > 0 ? pendingTasks.map(t => `- [${t.type}] ${t.title} (de fecha: ${t.target_date.toISOString().split('T')[0]})`).join('\n') : 'Ninguna'}

TAREAS:
1. Analiza el briefing y extrae las tareas previstas.
2. Analiza las tareas pendientes y decide cuáles son críticas para recuperar hoy (basándote en el Readiness).
3. Organiza las tareas en un timeline lógico. 
   - Usa la Peak Window si el Readiness es alto para tareas cognitivas.
   - Si el ACWR es >1.5, sugiere reducir la intensidad de tareas físicas.
4. Para cada tarea, proporciona un "ai_rationale" (razonamiento táctico) breve que explique por qué se coloca ahí según su fisiología.

IMPORTANTE: Responde ÚNICAMENTE en formato JSON válido con la siguiente estructura:
{
  "tasks": [
    {
      "title": "string",
      "scheduled_time": "HH:MM",
      "type": "cognitive | physical | leisure | admin",
      "ai_rationale": "explicación de 1 frase vinculada a sus datos"
    }
  ]
}
`;

    fs.writeFileSync(promptFile, prompt);

    // 5. Ejecutar Gemini
    console.log('Consulting Gemini AI for Daily Plan...');
    const GEMINI_CMD = '/usr/local/bin/gemini';
    let geminiOutput;
    try {
      geminiOutput = execSync(`cat ${promptFile} | ${GEMINI_CMD} --prompt ""`).toString();
    } catch (execErr) {
      console.error('Error executing Gemini CLI:', execErr.stderr?.toString() || execErr.message);
      throw execErr;
    }

    const jsonMatch = geminiOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Raw Gemini Output:', geminiOutput);
      throw new Error('No valid JSON found in AI output');
    }

    const aiResponse = JSON.parse(jsonMatch[0]);
    console.log(`Generated ${aiResponse.tasks.length} tasks for today.`);

    // 6. Guardar el Plan y las Tareas
    await dbClient.query('BEGIN');

    // Actualizar el JSON del plan y marcar como completado
    await dbClient.query('UPDATE daily_plans SET ai_plan = $1, status = $2 WHERE id = $3', [JSON.stringify(aiResponse), 'completed', planId]);

    // Limpiar tareas previas de hoy
    await dbClient.query('DELETE FROM plan_tasks WHERE plan_id = $1', [planId]);

    // Insertar nuevas tareas
    for (const task of aiResponse.tasks) {
      await dbClient.query(`
        INSERT INTO plan_tasks (plan_id, title, scheduled_time, type, ai_rationale)
        VALUES ($1, $2, $3, $4, $5)
      `, [planId, task.title, task.scheduled_time, task.type, task.ai_rationale]);
    }

    await dbClient.query('COMMIT');
    console.log('--- Day Plan successfully stored ---');

  } catch (err) {
    if (dbClient) {
      try { await dbClient.query('ROLLBACK'); } catch(e) {}
    }
    console.error('Day Plan Generation Error:', err);
    await dbClient.query('UPDATE daily_plans SET status = $1 WHERE target_date = $2', ['error', targetDate]);
  } finally {
    if (fs.existsSync(promptFile)) {
      fs.unlinkSync(promptFile);
    }
    await dbClient.end();
  }
}

generatePlan();
