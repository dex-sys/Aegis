const fs = require('fs');
const path = require('path');

async function testEmbedding() {
  const credsPath = path.join(process.env.HOME, '.gemini/oauth_creds.json');
  if (!fs.existsSync(credsPath)) {
    console.error('Credentials file not found');
    return;
  }

  const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
  const token = creds.access_token;

  console.log('Using token to call Gemini Embedding API...');

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: {
          parts: [{ text: 'Hola mundo' }]
        }
      })
    });

    const data = await response.json();
    if (data.embedding) {
      console.log('Success! Embedding received. Length:', data.embedding.values.length);
    } else {
      console.error('Error receiving embedding:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

testEmbedding();
