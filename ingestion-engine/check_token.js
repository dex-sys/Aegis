const fs = require('fs');
const path = require('path');

async function checkToken() {
  const credsPath = path.join(process.env.HOME, '.gemini/oauth_creds.json');
  if (!fs.existsSync(credsPath)) return;
  const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
  const token = creds.access_token;
  
  const response = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`);
  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

checkToken();
