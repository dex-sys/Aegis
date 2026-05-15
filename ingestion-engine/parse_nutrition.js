/**
 * Proyecto Aegis - Nutrition Parser
 * Goal: Convert raw food text into structured macros using gemini-cli
 */

const { Client } = require('pg');
const { execSync } = require('child_process');
const fs = require('fs');

const dbClient = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function parseNutrition(logId) {
  if (!logId) {
    console.error('No log ID provided');
    process.exit(1);
  }

  await dbClient.connect();
  console.log(`--- Nutrition Parsing Started for ID: ${logId} ---`);

  const promptFile = `nutrition_prompt_${logId}.txt`;

  try {
    // 1. Obtener el texto crudo
    const result = await dbClient.query('SELECT raw_text FROM nutrition_logs WHERE id = $1', [logId]);
    if (result.rows.length === 0) throw new Error('Log not found');

    const rawText = result.rows[0].raw_text;

    // 2. Preparar el Prompt
    const prompt = `
Actúa como un experto en Nutrición y Ciencia de los Alimentos.
Tu tarea es analizar la siguiente descripción de una comida y extraer los macronutrientes aproximados.

TEXTO DE LA COMIDA:
"${rawText}"

TAREAS:
1. Identifica los ingredientes y sus cantidades.
2. Calcula el total aproximado de: Calorías (kcal), Proteínas (g), Carbohidratos (g) y Grasas (g).
3. Devuelve una lista de los alimentos detectados.

IMPORTANTE: Responde ÚNICAMENTE en formato JSON válido con la siguiente estructura:
{
  "kcal": integer,
  "protein_g": integer,
  "carbs_g": integer,
  "fats_g": integer,
  "items": ["item1", "item2", ...]
}
`;

    fs.writeFileSync(promptFile, prompt);

    // 3. Ejecutar Gemini CLI
    console.log('Consulting Gemini AI for Nutrition...');
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

    let nutrition;
    try {
      nutrition = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error('Failed to parse JSON match:', jsonMatch[0]);
      throw parseErr;
    }

    console.log('Nutrition Data Extracted:', nutrition);

    // 4. Actualizar la base de datos
    const updateQuery = `
      UPDATE nutrition_logs 
      SET kcal = $1, protein_g = $2, carbs_g = $3, fats_g = $4, parsed_items = $5, status = 'processed'
      WHERE id = $6
    `;

    await dbClient.query(updateQuery, [
      nutrition.kcal || 0,
      nutrition.protein_g || 0,
      nutrition.carbs_g || 0,
      nutrition.fats_g || 0,
      JSON.stringify(nutrition.items || []),
      logId
    ]);

    console.log(`--- Nutrition log ${logId} successfully processed ---`);

    // 5. Trigger Inferencia General (Opcional, pero recomendado para actualizar Readiness)
    console.log('Triggering General Inference...');
    try {
      execSync('node inference.js');
    } catch (infErr) {
      console.error('General Inference Error (non-fatal for nutrition):', infErr.message);
    }

  } catch (err) {
    console.error('Nutrition Parsing Error:', err);
    await dbClient.query('UPDATE nutrition_logs SET status = $1 WHERE id = $2', ['error', logId]);
  } finally {
    if (fs.existsSync(promptFile)) {
      fs.unlinkSync(promptFile);
    }
    await dbClient.end();
  }
}

// Ejecutar si se pasa el ID como argumento
const targetId = process.argv[2];
parseNutrition(targetId);
