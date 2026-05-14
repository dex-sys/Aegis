/**
 * Proyecto Aegis - Nutrition Advice Engine
 * Goal: Generate real-time tactical nutrition and supplement recommendations
 */

const { Client } = require('pg');
const { execSync } = require('child_process');
const fs = require('fs');

const dbClient = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function getAdvice() {
  await dbClient.connect();

  const promptFile = `advice_prompt_${Date.now()}.txt`;

  try {
    // 1. Obtener totales nutricionales de hoy
    const nutritionResult = await dbClient.query(`
      SELECT 
        SUM(kcal) as total_kcal,
        SUM(protein_g) as total_protein,
        SUM(carbs_g) as total_carbs,
        SUM(fats_g) as total_fats
      FROM nutrition_logs 
      WHERE timestamp > CURRENT_DATE
    `);

    // 2. Obtener suplementos de hoy
    const supplementResult = await dbClient.query(`
      SELECT item_name, amount, unit
      FROM user_inputs
      WHERE category = 'supplement' AND timestamp > CURRENT_DATE
    `);

    // 3. Obtener contexto fisiológico (Readiness reciente)
    const inferenceResult = await dbClient.query(`
      SELECT readiness_score, fatigue_level, recommendation_summary, inference_metadata
      FROM inference_results
      ORDER BY target_date DESC LIMIT 1
    `);

    const context = {
      currentTime: new Date().toLocaleTimeString(),
      todayNutrition: nutritionResult.rows[0],
      todaySupplements: supplementResult.rows,
      readiness: inferenceResult.rows[0],
      fatigue_metrics: inferenceResult.rows[0]?.inference_metadata?.fatigue_engine || {}
    };

    // 4. Preparar el Prompt
    const prompt = `
Actúa como un Lead Nutritionist y experto en Biohacking.
Basándote en los datos del usuario para el día de hoy y la hora actual, genera una recomendación táctica de comida y suplementación.

CONTEXTO ACTUAL:
- Hora: ${context.currentTime}
- Nutrición hoy: ${JSON.stringify(context.todayNutrition)}
- Suplementos hoy: ${JSON.stringify(context.todaySupplements)}
- Estado General: ${JSON.stringify(context.readiness)}
- Métricas de Fatiga (ACWR): ${JSON.stringify(context.fatigue_metrics)}

TAREAS:
1. Analiza el balance calórico y proteico actual vs la carga de entrenamiento (Fatiga/ACWR).
2. Si el ACWR es alto (>1.5), prioriza nutrientes antiinflamatorios y mayor proteína para reparación muscular.
3. Basado en la hora, sugiere qué debería ser su próxima comida.
4. Basado en su suplementación y la carga actual, sugiere qué tomar ahora.

IMPORTANTE: Responde ÚNICAMENTE en formato JSON válido con la siguiente estructura:
{
  "food_recommendation": "string corto y directo",
  "supplement_recommendation": "string corto y directo",
  "rationale": "explicación técnica breve"
}
`;

    fs.writeFileSync(promptFile, prompt);

    // 5. Ejecutar Gemini
    const GEMINI_CMD = '/usr/local/bin/gemini';
    const geminiOutput = execSync(`cat ${promptFile} | ${GEMINI_CMD} --prompt ""`).toString();
    
    const jsonMatch = geminiOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No valid JSON found in AI output');
    
    process.stdout.write(jsonMatch[0]);

  } catch (err) {
    console.error('Advice Error:', err);
    process.stdout.write(JSON.stringify({ 
      food_recommendation: "Error al generar recomendación", 
      supplement_recommendation: "Reintente en unos momentos",
      rationale: err.message
    }));
  } finally {
    if (fs.existsSync(promptFile)) {
      fs.unlinkSync(promptFile);
    }
    await dbClient.end();
  }
}

getAdvice();
