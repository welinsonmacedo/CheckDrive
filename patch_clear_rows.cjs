const fs = require('fs');
const file = 'src/modules/company/components/MaintenanceTab.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = `      setResolvingIssueId(null);
      setResolvingIssueData(null);
      setSelectedIdsToResolve([]);`;

const replacement = `      setResolvingIssueId(null);
      setResolvingIssueData(null);
      setSelectedIdsToResolve([]);
      setSelectedRows([]);`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code);
  console.log('patched clear rows');
} else {
  console.log('target not found');
}
