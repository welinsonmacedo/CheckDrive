const fs = require('fs');
let content = fs.readFileSync('src/modules/company/components/VehiclesTab.tsx', 'utf8');

// We will find `const handleSaveTrailer` and delete it up to the next `const toggleStatus`
const startIdx = content.indexOf('const handleSaveTrailer = async (e: React.FormEvent) => {');
const endIdx = content.indexOf('const toggleStatus = async (table: string, id: string, currentStatus: boolean) => {');
if (startIdx !== -1 && endIdx !== -1) {
  content = content.slice(0, startIdx) + content.slice(endIdx);
  fs.writeFileSync('src/modules/company/components/VehiclesTab.tsx', content);
  console.log("Removed handleSaveTrailer");
} else {
  console.log("Could not find start or end index");
}
