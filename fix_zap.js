import fs from 'fs';

let content = fs.readFileSync('src/lib/whatsappIntegration.ts', 'utf8');

content = content.replace('body: JSON.stringify(payload),', 'body: JSON.stringify(payload),\n            keepalive: true,');

fs.writeFileSync('src/lib/whatsappIntegration.ts', content);
