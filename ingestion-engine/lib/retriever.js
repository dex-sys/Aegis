/**
 * Aegis RAG - Retriever Library (FTS Mode)
 * Handles relevant context retrieval using PostgreSQL Full Text Search.
 */

const { Client } = require('pg');

/**
 * Retrieves relevant context based on search terms.
 * query: String with keywords (e.g., "fatiga hombro estrés")
 */
async function retrieveContext(query, limit = 3) {
  const dbClient = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    await dbClient.connect();
    
    // websearch_to_tsquery is much more robust than manual join(' | ')
    const searchFunction = 'websearch_to_tsquery';

    // 1. Search in Expert Knowledge
    const knowledgeRes = await dbClient.query(`
      SELECT raw_text, content_source, ts_rank(search_vector, ${searchFunction}('spanish', $1)) as rank
      FROM knowledge_base
      WHERE search_vector @@ ${searchFunction}('spanish', $1)
      ORDER BY rank DESC
      LIMIT $2
    `, [query, limit]);

    // 2. Search in User Memory
    const memoryRes = await dbClient.query(`
      SELECT narrative_summary, event_date, ts_rank(search_vector, ${searchFunction}('spanish', $1)) as rank
      FROM user_memory
      WHERE search_vector @@ ${searchFunction}('spanish', $1)
      ORDER BY rank DESC
      LIMIT $2
    `, [query, limit]);

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
