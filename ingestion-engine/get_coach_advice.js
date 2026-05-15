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
Actúa como un Entrenador Olímpico de Judo y experto en Preparación Física.
Tu misión es dar el FOCO TÉCNICO para la sesión de hoy basándote en el perfil del judoka, su estado fisiológico y su rendimiento reciente.

PERFIL DEL JUDOKA:
- Grado: ${profile.belt_rank}
- Categoría: ${profile.weight_category}
- Estilo/Tokui-Waza: ${profile.preferred_style}
- Lesiones: ${profile.injury_history}
- Objetivos: ${profile.goals}

CONTEXTO FISIOLÓGICO:
- Readiness Score: ${systemContext.readiness_score} (0-1)
- Estado: ${systemContext.recommendation_summary}
- Fatiga ACWR: ${systemContext.inference_metadata?.fatigue_engine?.acwr_ratio || 'N/A'}

RENDIMIENTO RECIENTE (Feedback de Randori):
${recentFeedback.map(f => `- Fecha: ${f.target_date.toISOString().split('T')[0]}, Pie: ${f.tachi_waza_success ? 'LOGRADO' : 'FALLIDO'}, Suelo: ${f.ne_waza_success ? 'LOGRADO' : 'FALLIDO'}, Notas: ${f.notes}`).join('\n') || 'Sin registros recientes.'}

TÉCNICAS CONOCIDAS:
${techniques.map(t => `- ${t.name} (${t.category}, Nivel ${t.mastery_level}/5${t.is_tokui_waza ? ', Tokui-Waza' : ''})`).join('\n')}

INSTRUCCIONES:
1. Analiza el Readiness. 
2. Considera las lesiones.
3. AJUSTA SEGÚN FEEDBACK: Si falló en los últimos focos, sugiere algo más sencillo o un enfoque correctivo. Si tuvo éxito, aumenta la complejidad.
4. Genera un razonamiento breve que conecte los datos con la decisión.

IMPORTANTE: Responde ÚNICAMENTE en formato JSON válido:
{
  "tachi_waza_focus": "string (máx 10 palabras)",
  "ne_waza_focus": "string (máx 10 palabras)",
  "rationale": "explicación técnica vinculada a biometría y feedback reciente"
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
