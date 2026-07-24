const fs = require('fs');
const file = 'src/modules/company/components/SchedulesTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `      if (dataToInsert.trailer_id) {
        conflictQuery = conflictQuery.eq("trailer_id", dataToInsert.trailer_id);
      }`;

const replacement = ``;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content);
  console.log("Patched successfully");
} else {
  console.log("Target not found");
}
