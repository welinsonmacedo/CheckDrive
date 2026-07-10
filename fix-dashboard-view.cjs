const fs = require('fs');
let file = 'src/modules/company/components/InfractionsTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /<\/div>\s*<\/div>\s*\{inf\.attachment_url && \(/g;
content = content.replace(regex, '</div>\n                        {inf.attachment_url && (');

fs.writeFileSync(file, content);
console.log('Fixed dashboard view structure via regex again');
