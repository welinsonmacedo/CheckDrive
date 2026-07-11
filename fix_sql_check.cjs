const fs = require('fs');
let file = 'src/modules/company/components/MaintenanceTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `      if (
        err.message &&
        (err.message.includes("Could not find the 'resolution_nf' column") ||
          err.message.includes(
            'column "resolution_nf" of relation "checklist_issues" does not exist',
          ))
      ) {`;

const replacement = `      if (
        err.message &&
        (err.message.includes("Could not find the 'resolution_nf' column") ||
          err.message.includes("Could not find the 'resolution_type' column") ||
          err.message.includes('column "resolution_type" of relation "checklist_issues" does not exist') ||
          err.message.includes(
            'column "resolution_nf" of relation "checklist_issues" does not exist',
          ))
      ) {`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
console.log('Fixed SQL check');
