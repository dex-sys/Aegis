/**
 * Aegis RAG - Infrastructure Test
 * Verifies that pgvector is working and cosine similarity queries execute correctly.
 */

const { Client } = require('pg');

const dbClient = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function testVectorDB() {
  try {
    await dbClient.connect();
    console.log('--- Testing Vector Database ---');

    // 1. Insert two similar vectors
    const v1 = Array(768).fill(0).map((_, i) => i === 0 ? 1 : 0); // [1, 0, 0, ...]
    const v2 = Array(768).fill(0).map((_, i) => i === 0 ? 0.9 : 0.1); // [0.9, 0.1, 0, ...]

    await dbClient.query('DELETE FROM knowledge_embeddings WHERE content_source = $1', ['test_source']);
    
    await dbClient.query(`
      INSERT INTO knowledge_embeddings (content_source, raw_text, embedding)
      VALUES ($1, $2, $3)
    `, ['test_source', 'Test vector 1', JSON.stringify(v1)]);

    console.log('Inserted test vector.');

    // 2. Search using v2
    const res = await dbClient.query(`
      SELECT raw_text, (embedding <=> $1::vector) as distance
      FROM knowledge_embeddings
      ORDER BY distance ASC
      LIMIT 1
    `, [JSON.stringify(v2)]);

    if (res.rows.length > 0) {
      console.log(`Success! Closest match: "${res.rows[0].raw_text}" with distance: ${res.rows[0].distance}`);
    } else {
      console.error('No results found.');
    }

  } catch (err) {
    console.error('Vector DB Test Failed:', err.message);
    if (err.message.includes('type "vector" does not exist')) {
      console.log('HINT: The pgvector extension is not enabled in the database.');
    }
  } finally {
    await dbClient.end();
  }
}

testVectorDB();
