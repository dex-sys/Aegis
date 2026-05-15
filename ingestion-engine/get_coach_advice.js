/**
 * Proyecto Aegis - AI Judo Coach Engine
 * Goal: Generate technical focus for Randori based on biometrics + judoka profile
 */

const { Client } = require('pg');
const { execSync } = require('child_process');
const fs = require('fs');

const dbClient = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function getCoachAdvice() {
  await dbClient.connect();
  const targetDate = new Date().toISOString().split('T')[0];

  const promptFile = `coach_prompt_${Date.now()}.txt`;

  try {
    // 1. Obtener Perfil, Contexto y Feedback Reciente
    const [profileRes, inferenceRes, techRes, feedbackRes] = await Promise.all([
      dbClient.query('SELECT * FROM judoka_profile LIMIT 1'),
      dbClient.query('SELECT readiness_score, fatigue_level, recommendation_summary, inference_metadata FROM inference_results ORDER BY target_date DESC LIMIT 1'),
      dbClient.query('SELECT name, category, mastery_level, is_tokui_waza FROM judoka_techniques'),
      dbClient.query('SELECT * FROM judo_randori_feedback ORDER BY target_date DESC LIMIT 5')
    ]);

    if (profileRes.rows.length === 0) throw new Error('No judoka profile found');
    
    const profile = profileRes.rows[0];
    const systemContext = inferenceRes.rows[0] || {};
    const techniques = techRes.rows;
    const recentFeedback = feedbackRes.rows;

    // 2. Preparar el Prompt para Gemini
    const prompt = `
Actúa como un Entrenador Olímpico de Judo y Analista Táctico de Datos.
Tu misión es diseñar el foco técnico (micro-misión) para la sesión de Randori de hoy, optimizando la progresión hacia el próximo Dan y minimizando el riesgo de lesión.

PERFIL DEL JUDOKA:
- Grado: ${profile.belt_rank}
- Categoría: ${profile.weight_category}
- Estilo/Tokui-Waza: ${profile.preferred_style}
- Lesiones Históricas: ${profile.injury_history}
- Objetivos: ${profile.goals}

ESTADO DE SISTEMA:
- Readiness (0-1): ${systemContext.readiness_score}
- ACWR (Fatiga): ${systemContext.inference_metadata?.fatigue_engine?.acwr_ratio || 'N/A'}
- Estado: ${systemContext.recommendation_summary}

HISTORIAL DE RENDIMIENTO (Últimos Randoris):
${recentFeedback.map(f => `- Fecha: ${f.target_date.toISOString().split('T')[0]}, Tachi-waza: ${f.tachi_waza_success ? 'ÉXITO' : 'FALLO'}, Ne-waza: ${f.ne_waza_success ? 'ÉXITO' : 'FALLO'}, Notas: ${f.notes}`).join('\n') || 'Sin registros recientes.'}

ARSENAL TÉCNICO DISPONIBLE:
${techniques.map(t => `- ${t.name} (Nivel ${t.mastery_level}/5${t.is_tokui_waza ? ', Tokui-Waza' : ''})`).join('\n')}

DIRECTRICES TÁCTICAS:
1. Modulación por Fatiga: Si el ACWR es >1.3 o el Readiness es bajo (<0.5), el foco debe ser conservador, defensivo (ej. Kumikata, desplazamientos, control) o de bajo impacto articular, respetando el historial de lesiones.
2. Bucle de Feedback: Si falló en Tachi-waza recientemente, asigna una técnica correctiva o una variante preparatoria de su Tokui-Waza. Si tuvo éxito, aumenta la complejidad de los encadenamientos (Renraku-waza).
3. Especificidad: Las recomendaciones deben ser técnicas de Judo precisas y medibles en un Randori, no conceptos abstractos.

CRÍTICO: Devuelve ÚNICAMENTE un objeto JSON válido, sin bloques de código Markdown (\`\`\`json).
{
  "tachi_waza_focus": "string (máx 10 palabras, específico y accionable)",
  "ne_waza_focus": "string (máx 10 palabras, específico y accionable)",
  "rationale": "Explicación táctica justificando el foco según la biometría actual y el feedback anterior"
}
`;

    fs.writeFileSync(promptFile, prompt);

    // 3. Ejecutar Gemini
    const GEMINI_CMD = '/usr/local/bin/gemini';
    let geminiOutput = execSync(`cat ${promptFile} | ${GEMINI_CMD} --prompt ""`).toString();

    const jsonMatch = geminiOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No valid JSON in AI output');

    const aiResponse = JSON.parse(jsonMatch[0]);

    // Añadir datos de contexto para la UI
    aiResponse.readiness = systemContext.readiness_score || 0.5;
    aiResponse.acwr = systemContext.inference_metadata?.fatigue_engine?.acwr_ratio || 1.0;

    // 4. PERSISTIR EN BASE DE DATOS
    await dbClient.query(`
      INSERT INTO coach_recommendations (target_date, tachi_waza_focus, ne_waza_focus, rationale, readiness, acwr)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (target_date) DO UPDATE SET 
        tachi_waza_focus = EXCLUDED.tachi_waza_focus,
        ne_waza_focus = EXCLUDED.ne_waza_focus,
        rationale = EXCLUDED.rationale,
        readiness = EXCLUDED.readiness,
        acwr = EXCLUDED.acwr,
        created_at = NOW()
    `, [targetDate, aiResponse.tachi_waza_focus, aiResponse.ne_waza_focus, aiResponse.rationale, aiResponse.readiness, aiResponse.acwr]);

    // 5. Devolver resultado (esto lo leerá la API)
    console.log(JSON.stringify(aiResponse));

  } catch (err) {
    console.error('Coach Engine Error:', err);
    // Fallback básico
    console.log(JSON.stringify({
      tachi_waza_focus: "Uchi-komi de perfeccionamiento",
      ne_waza_focus: "Movilidad en suelo",
      rationale: "Error consultando inteligencia táctica. Usando protocolo base."
    }));
  } finally {
    if (fs.existsSync(promptFile)) fs.unlinkSync(promptFile);
    await dbClient.end();
  }
}

getCoachAdvice();
