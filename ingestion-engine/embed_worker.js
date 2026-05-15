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
  console.log('--- RAG Memory Worker Started (FTS Mode) ---');

  try {
    // 1. Process Activity Logs
    const activities = await dbClient.query(`
      SELECT a.* FROM activity_logs a
      LEFT JOIN user_memory m ON a.id::text = m.metadata->>'source_id'
      WHERE m.id IS NULL
    `);
    
    for (const act of activities.rows) {
      const narrative = synthesizeActivity(act);
      await dbClient.query(`
        INSERT INTO user_memory (event_date, narrative_summary, context_type, metadata)
        VALUES ($1, $2, $3, $4)
      `, [act.start_time, narrative, 'activity', JSON.stringify({ source_id: act.id, table: 'activity_logs' })]);
      console.log(`Synced memory for activity ${act.id}`);
    }

    // 2. Process Nutrition Logs
    const nutrition = await dbClient.query(`
      SELECT n.* FROM nutrition_logs n
      LEFT JOIN user_memory m ON n.id::text = m.metadata->>'source_id'
      WHERE n.status = 'processed' AND m.id IS NULL
    `);

    for (const nut of nutrition.rows) {
      const narrative = synthesizeNutrition(nut);
      await dbClient.query(`
        INSERT INTO user_memory (event_date, narrative_summary, context_type, metadata)
        VALUES ($1, $2, $3, $4)
      `, [nut.timestamp, narrative, 'nutrition', JSON.stringify({ source_id: nut.id, table: 'nutrition_logs' })]);
      console.log(`Synced memory for nutrition ${nut.id}`);
    }

    // 3. Process Randori Feedback
    const randori = await dbClient.query(`
      SELECT r.* FROM judo_randori_feedback r
      LEFT JOIN user_memory m ON r.id::text = m.metadata->>'source_id'
      WHERE m.id IS NULL
    `);

    for (const ran of randori.rows) {
      const narrative = synthesizeRandori(ran);
      await dbClient.query(`
        INSERT INTO user_memory (event_date, narrative_summary, context_type, metadata)
        VALUES ($1, $2, $3, $4)
      `, [ran.target_date, narrative, 'randori', JSON.stringify({ source_id: ran.id, table: 'judo_randori_feedback' })]);
      console.log(`Synced memory for randori ${ran.id}`);
    }

    console.log('--- Sync Completed ---');
  } catch (err) {
    console.error('Embedding Worker Error:', err);
  } finally {
    await dbClient.end();
  }
}

processUnsyncedLogs();
