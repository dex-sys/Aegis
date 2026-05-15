/**
 * Proyecto Aegis - RAG-Augmented Inference Engine
 * Goal: Generate report using LONG-TERM memory via Full Text Search.
 */

const { Client } = require('pg');
const { execSync } = require('child_process');
const fs = require('fs');
const { retrieveContext, formatContextForPrompt } = require('./lib/retriever');

const dbClient = new Client({ connectionString: process.env.DATABASE_URL });

async function runRAGInference() {
  await dbClient.connect();
  const targetDate = new Date().toISOString().split('T')[0];
  const promptFile = `rag_prompt_${Date.now()}.txt`;

  try {
    console.log('--- Aegis RAG Inference Job Started ---');

    // 1. Obtener Telemetría Actual (Short-term context)
    const [biometrics, activity, nutrition, mental] = await Promise.all([
      dbClient.query('SELECT * FROM metrics_biometric ORDER BY timestamp DESC LIMIT 5'),
      dbClient.query('SELECT * FROM activity_logs ORDER BY start_time DESC LIMIT 5'),
      dbClient.query('SELECT SUM(kcal) as kcal FROM nutrition_logs WHERE timestamp > NOW() - INTERVAL \'24 hours\''),
      dbClient.query('SELECT * FROM metrics_mental_health ORDER BY timestamp DESC LIMIT 1')
    ]);

    const stateSummary = `Usuario con Readiness bajo, carga de Judo reciente y estrés nivel ${mental.rows[0]?.stress_level || 5}.`;

    // 2. RECUPERAR MEMORIA SEMÁNTICA (RAG)
    // Extraemos keywords tácticas para la búsqueda
    const searchTerms = "fatiga estrés judo recuperación hombro sueño"; 
    const ragContext = await retrieveContext(searchTerms, 3);
    const formattedRAG = formatContextForPrompt(ragContext);

    // 3. Preparar el Prompt Vitaminado
    const context = {
      target_date: targetDate,
      current_metrics: {
        biometrics: biometrics.rows,
        activity: activity.rows,
        nutrition_24h: nutrition.rows[0],
        mental: mental.rows[0]
      }
    };

    const prompt = `
Actúa como un Sports Scientist experto en Quantitative Self.
Genera el reporte "Estado de Combate" para el día ${targetDate}.

TELEMETRÍA ACTUAL (Últimas horas):
${JSON.stringify(context, null, 2)}

${formattedRAG}

INSTRUCCIONES:
1. Analiza los datos actuales cruzándolos con el CONTEXTO SEMÁNTICO RECUPERADO (RAG).
2. Si el RAG muestra patrones históricos similares, úsalos para validar tus recomendaciones.
3. Prioriza protocolos científicos mencionados en el RAG.

IMPORTANTE: Responde ÚNICAMENTE en JSON:
{
  "readiness_score": float,
  "fatigue_level": "Low|Moderate|High|Critical",
  "recommendation_summary": "string (máx 3 frases)",
  "rationale": "Justificación técnica citando patrones históricos si aplica",
  "protocol_applied": "string"
}
`;

    fs.writeFileSync(promptFile, prompt);

    // 4. Ejecutar Gemini CLI
    const GEMINI_CMD = '/usr/local/bin/gemini';
    const geminiOutput = execSync(`cat ${promptFile} | ${GEMINI_CMD} --skip-trust --prompt ""`).toString();
    
    console.log('--- AI Response with RAG ---');
    console.log(geminiOutput);

  } catch (err) {
    console.error('RAG Inference Error:', err);
  } finally {
    if (fs.existsSync(promptFile)) fs.unlinkSync(promptFile);
    await dbClient.end();
  }
}

runRAGInference();
