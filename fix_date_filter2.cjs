const fs = require('fs');
const file = 'src/modules/company/components/ReportsTab.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetFunc = 'const fetchResolvedIssuesReport = async () => {';
const nextFunc = 'const fetchFleetAgeReport = async () => {';

let startIndex = code.indexOf(targetFunc);
let endIndex = code.indexOf(nextFunc);

if (startIndex !== -1 && endIndex !== -1) {
  let funcCode = code.substring(startIndex, endIndex);
  funcCode = funcCode.replace(/.gte\("created_at", \`\$\{startDate\}T00:00:00Z\`\)/, '.gte("resolved_at", `${startDate}T00:00:00Z`)');
  funcCode = funcCode.replace(/.lte\("created_at", \`\$\{endDate\}T23:59:59Z\`\)/, '.lte("resolved_at", `${endDate}T23:59:59Z`)');
  
  code = code.substring(0, startIndex) + funcCode + code.substring(endIndex);
  fs.writeFileSync(file, code);
  console.log('Fixed date filter for resolved issues');
} else {
  console.log('Could not find functions');
}
