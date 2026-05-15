/**
 * Aegis RAG - Embedding Worker
 * Background process to synchronize DB logs with the Vector Store.
 */

const { Client } = require('pg');
const { synthesizeActivity, synthesizeNutrition, synthesizeRandori, synthesizeMental } = require('./lib/narrative');

const dbClient = new Client({
  connectionString: process.env.DATABASE_URL,
});

// Placeholder for embedding function
// We will integrate with Gemini API or a local model
async function getEmbedding(text) {
  // TODO: Implement real embedding logic
  // For now, returning a dummy vector of 768 dimensions
  return Array(768).fill(0).map(() => Math.random() * 2 - 1);
}

async function processUnsyncedLogs() {
  await dbClient.connect();
  console.log('--- RAG Embedding Worker Started ---');

  try {
    // 1. Process Activity Logs
    const activities = await dbClient.query(`
      SELECT a.* FROM activity_logs a
      LEFT JOIN user_semantic_memory m ON a.id::text = m.metadata->>'source_id'
      WHERE m.id IS NULL
    `);
    
    for (const act of activities.rows) {
      const narrative = synthesizeActivity(act);
      const vector = await getEmbedding(narrative);
      await dbClient.query(`
        INSERT INTO user_semantic_memory (event_date, narrative_summary, embedding, context_type, metadata)
        VALUES ($1, $2, $3, $4, $5)
      `, [act.start_time, narrative, vector, 'activity', JSON.stringify({ source_id: act.id, table: 'activity_logs' })]);
      console.log(`Synced activity ${act.id}`);
    }

    // 2. Process Nutrition Logs
    const nutrition = await dbClient.query(`
      SELECT n.* FROM nutrition_logs n
      LEFT JOIN user_semantic_memory m ON n.id::text = m.metadata->>'source_id'
      WHERE n.status = 'processed' AND m.id IS NULL
    `);

    for (const nut of nutrition.rows) {
      const narrative = synthesizeNutrition(nut);
      const vector = await getEmbedding(narrative);
      await dbClient.query(`
        INSERT INTO user_semantic_memory (event_date, narrative_summary, embedding, context_type, metadata)
        VALUES ($1, $2, $3, $4, $5)
      `, [nut.timestamp, narrative, vector, 'nutrition', JSON.stringify({ source_id: nut.id, table: 'nutrition_logs' })]);
      console.log(`Synced nutrition ${nut.id}`);
    }

    // TODO: Add Randori and Mental Health sync

    console.log('--- Sync Completed ---');
  } catch (err) {
    console.error('Embedding Worker Error:', err);
  } finally {
    await dbClient.end();
  }
}

processUnsyncedLogs();
