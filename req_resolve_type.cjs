const fs = require('fs');
let file = 'src/modules/company/components/MaintenanceTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `    if (modalActionType === "resolve") {
      if (resolveSubStatus === "resolved") {`;

const replacement = `    if (modalActionType === "resolve") {
      if (resolveSubStatus === "resolved") {
        if (!resolveType) {
          alert("Por favor, selecione se a manutenção foi Preventiva ou Corretiva.");
          return;
        }`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Added required validation');
