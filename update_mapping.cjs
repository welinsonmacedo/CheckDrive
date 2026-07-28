const fs = require('fs');
let code = fs.readFileSync('src/modules/company/components/MaintenanceTab.tsx', 'utf8');

const mapStr = `
        const checklistItem = checklistItemsRes?.data?.find(ci => ci.title === issue.item_title);
        const mappedPriority = checklistItem?.priority || "Medio";
        
        return {
          ...issue,
          priority: mappedPriority,
`;

code = code.replace(
  /return \{\n\s*\.\.\.issue,/,
  mapStr
);

fs.writeFileSync('src/modules/company/components/MaintenanceTab.tsx', code);
