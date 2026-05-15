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
Actúa como un Nutricionista Deportivo especializado en Biohacking y Timing Nutricional.
Tu tarea es proveer recomendaciones hiper-específicas de comida y suplementación en tiempo real ("In-the-moment").

TELEMETRÍA ACTUAL:
- Hora Local: ${context.currentTime}
- Ingesta Hoy: ${JSON.stringify(context.todayNutrition)}
- Suplementos Hoy: ${JSON.stringify(context.todaySupplements)}
- Readiness: ${JSON.stringify(context.readiness)}
- Carga Fisiológica (ACWR): ${JSON.stringify(context.fatigue_metrics)}

REGLAS DE OPTIMIZACIÓN:
1. Sincronización Circadiana: Si es tarde (después de las 20:00), no recomiendes estimulantes ni digestiones pesadas; prioriza caseína, magnesio o triptófano. Si es por la mañana, prioriza energía sostenida o hidratación profunda.
2. Compensación de Carga: Si el ACWR es alto (riesgo de inflamación/fatiga) o el Readiness es bajo, recomienda alimentos antiinflamatorios (Omega 3, antioxidantes) y asegura un superávit de proteínas.
3. Precisión Práctica: No digas "consume proteínas y carbohidratos". Di "Un batido de suero (30g) con un plátano y creatina" o "Salmón al horno con boniato".

CRÍTICO: Devuelve ÚNICAMENTE un objeto JSON válido, sin bloques de código Markdown (\`\`\`json).
{
  "food_recommendation": "Alimento o comida específica recomendada (corto y accionable)",
  "supplement_recommendation": "Suplemento o protocolo específico para este momento",
  "rationale": "Explicación biológica vinculando la recomendación con la hora actual y la fatiga"
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
