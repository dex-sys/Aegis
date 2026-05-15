/**
 * Aegis RAG - Knowledge Ingester
 * Reads expert documents and populates the knowledge_embeddings table.
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const dbClient = new Client({
  connectionString: process.env.DATABASE_URL,
});

// Placeholder for real embedding
async function getEmbedding(text) {
  // Simulate 768-dim vector
  return Array(768).fill(0).map(() => Math.random() * 2 - 1);
}

async function ingestKnowledge() {
  await dbClient.connect();
  console.log('--- Knowledge Ingestion Started ---');

  const knowledgeDir = path.join(__dirname, 'data/knowledge');
  // Fallback para local vs docker
  const finalDir = fs.existsSync(knowledgeDir) ? knowledgeDir : path.join(__dirname, '../data/knowledge');
  
  if (!fs.existsSync(finalDir)) {
    console.error(`Knowledge directory not found at: ${knowledgeDir} or ${path.join(__dirname, '../data/knowledge')}`);
    await dbClient.end();
    return;
  }

  const files = fs.readdirSync(finalDir).filter(f => f.endsWith('.txt') || f.endsWith('.md'));

  for (const file of files) {
    const filePath = path.join(knowledgeDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Split content into chunks (paragraphs for now)
    const chunks = content.split('\n\n').filter(c => c.trim().length > 20);

    for (const chunk of chunks) {
      await dbClient.query(`
        INSERT INTO knowledge_base (content_source, raw_text, metadata)
        VALUES ($1, $2, $3)
      `, [file, chunk.trim(), JSON.stringify({ file: file })]);
      console.log(`Ingested chunk from ${file}`);
    }
  }

  console.log('--- Ingestion Completed ---');
  await dbClient.end();
}

ingestKnowledge();
