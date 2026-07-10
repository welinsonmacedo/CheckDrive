const fs = require('fs');
let file = 'src/modules/company/components/InfractionsTab.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('z-[100]', 'z-[9999]');

content = content.replace('onClick={() => setSelectedAttachment(inf.attachment_url)}', 'onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedAttachment(inf.attachment_url); }}');

fs.writeFileSync(file, content);
console.log('Fixed button and modal');
