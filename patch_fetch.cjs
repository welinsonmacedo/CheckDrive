const fs = require('fs');
const file = 'src/modules/company/components/SchedulesTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `        .gte("start_at", localStart.toISOString())
        .lte("start_at", localEnd.toISOString())`;

const replacement = `        .lte("start_at", localEnd.toISOString())
        .gte("end_at", localStart.toISOString())`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content);
  console.log("Patched successfully");
} else {
  console.log("Target not found");
}
