const fs = require('fs');
const path = require('path');

async function enableGenLangApi() {
  const credsPath = path.join(process.env.HOME, '.gemini/oauth_creds.json');
  if (!fs.existsSync(credsPath)) return;
  const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
  const token = creds.access_token;
  
  const projectId = 'gen-lang-client-0690571941';
  console.log(`Enabling Generative Language API in project ${projectId}...`);

  const response = await fetch(`https://serviceusage.googleapis.com/v1/projects/${projectId}/services/generativelanguage.googleapis.com:enable`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

enableGenLangApi();
