const fs = require('fs');
const path = require('path');

async function testVertexEmbedding() {
  const credsPath = path.join(process.env.HOME, '.gemini/oauth_creds.json');
  if (!fs.existsSync(credsPath)) return;
  const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
  const token = creds.access_token;
  
  const projectIds = ['gen-lang-client-0690571941', 'gen-lang-client-0721874556'];

  for (const projectId of projectIds) {
    console.log(`Testing Project: ${projectId}`);
    try {
      const response = await fetch(`https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/text-embedding-004:predict`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          instances: [{ content: 'Hola mundo' }]
        })
      });

      const data = await response.json();
      if (data.predictions) {
        console.log(`Success with project ${projectId}! Embedding length:`, data.predictions[0].embeddings.values.length);
        return;
      } else {
        console.error(`Error with project ${projectId}:`, JSON.stringify(data, null, 2));
      }
    } catch (err) {
      console.error(`Fetch error for project ${projectId}:`, err.message);
    }
  }
}

testVertexEmbedding();
