const http = require('https');
require('dotenv').config();
const options = {
  hostname: process.env.VITE_SUPABASE_URL.replace('https://', ''),
  path: '/rest/v1/',
  method: 'GET',
  headers: {
    'apikey': process.env.VITE_SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + process.env.VITE_SUPABASE_ANON_KEY
  }
};
const req = http.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const spec = JSON.parse(body);
    const table = spec.definitions.checklist_issues;
    console.log(Object.keys(table.properties));
  });
});
req.end();
