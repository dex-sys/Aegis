/**
 * Aegis RAG - Retriever Library
 * Handles semantic search across knowledge and user memory.
 */

const { Client } = require('pg');

async function getEmbedding(text) {
  // TODO: Replace with real embedding call (e.g., text-embedding-004)
  return Array(768).fill(0).map(() => Math.random() * 2 - 1);
}

async function retrieveContext(query, limit = 3) {
  const dbClient = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    await dbClient.connect();
    const queryVector = await getEmbedding(query);

    // 1. Search in Expert Knowledge
    const knowledgeRes = await dbClient.query(`
      SELECT raw_text, content_source, (embedding <=> $1::vector) as distance
      FROM knowledge_embeddings
      ORDER BY distance ASC
      LIMIT $2
    `, [JSON.stringify(queryVector), limit]);

    // 2. Search in User Semantic Memory
    const memoryRes = await dbClient.query(`
      SELECT narrative_summary, event_date, (embedding <=> $1::vector) as distance
      FROM user_semantic_memory
      ORDER BY distance ASC
      LIMIT $2
    `, [JSON.stringify(queryVector), limit]);

    return {
      knowledge: knowledgeRes.rows,
      memory: memoryRes.rows
    };
  } finally {
    await dbClient.end();
  }
}

function formatContextForPrompt(context) {
  let output = "\n--- CONTEXTO SEMÁNTICO RECUPERADO (RAG) ---\n";
  
  if (context.knowledge.length > 0) {
    output += "\nCONOCIMIENTO EXPERTO:\n";
    context.knowledge.forEach(k => {
      output += `- [Fuente: ${k.content_source}] ${k.raw_text}\n`;
    });
  }

  if (context.memory.length > 0) {
    output += "\nPATRONES HISTÓRICOS PERSONALES:\n";
    context.memory.forEach(m => {
      const date = new Date(m.event_date).toLocaleDateString('es-ES');
      output += `- [Fecha: ${date}] ${m.narrative_summary}\n`;
    });
  }

  output += "-------------------------------------------\n";
  return output;
}

module.exports = {
  retrieveContext,
  formatContextForPrompt
};
