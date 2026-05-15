const fs = require('fs');
const path = require('path');

async function testGenLangWithProject() {
  const credsPath = path.join(process.env.HOME, '.gemini/oauth_creds.json');
  if (!fs.existsSync(credsPath)) return;
  const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
  const token = creds.access_token;
  
  const projectId = 'gen-lang-client-0690571941';
  console.log(`Testing Generative Language API with project ${projectId}...`);

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-goog-user-project': projectId
      },
      body: JSON.stringify({
        content: {
          parts: [{ text: 'Hola mundo' }]
        }
      })
    });

    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

testGenLangWithProject();
