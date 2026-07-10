const fs = require('fs');
let file = 'src/modules/company/components/InfractionsTab.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 99999 }}',
  '            key="attachment-modal"\n            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 99999 }}'
);

fs.writeFileSync(file, content);
console.log('Fixed AnimatePresence key');
