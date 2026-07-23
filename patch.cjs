const fs = require('fs');
const file = 'src/modules/company/components/SchedulesTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `      const orConditions = [
        \`driver_id.eq.\${dataToInsert.driver_id}\`,
        \`vehicle_id.eq.\${dataToInsert.vehicle_id}\`
      ];`;

const replacement = `      const orConditions = [
        \`driver_id.eq.\${dataToInsert.driver_id}\`
      ];
      if (dataToInsert.vehicle_id) {
        orConditions.push(\`vehicle_id.eq.\${dataToInsert.vehicle_id}\`);
      }`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content);
  console.log("Patched successfully");
} else {
  console.log("Target not found");
}
