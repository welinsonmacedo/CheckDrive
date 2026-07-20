const fs = require('fs');
const file = 'src/modules/company/components/ReportsTab.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetFunc = 'const fetchResolvedIssuesReport = async () => {';
const nextFunc = 'const fetchFleetAgeReport = async () => {';

let startIndex = code.indexOf(targetFunc);
let endIndex = code.indexOf(nextFunc);

if (startIndex !== -1 && endIndex !== -1) {
  let funcCode = code.substring(startIndex, endIndex);
  
  funcCode = funcCode.replace(
    'const resolvedData = data.filter(d => d.status === "resolved");',
    `const resolvedData = data.filter(d => {
        const notesStr = String(d.resolution_notes || "").toLowerCase();
        const isAutoResolved = notesStr.includes("automaticamente pelo check list");
        return d.status === "resolved" && !isAutoResolved;
      });`
  );
  
  code = code.substring(0, startIndex) + funcCode + code.substring(endIndex);
  fs.writeFileSync(file, code);
  console.log('Fixed auto resolved issues filtering');
}
