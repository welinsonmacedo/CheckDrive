const fs = require('fs');
const file = 'src/modules/company/components/ReportsTab.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  '} else if (activeReport === "fleet_age" || activeReport === "resolved_issues") {\n      fetchFleetAgeReport();\n    }',
  '} else if (activeReport === "fleet_age") {\n      fetchFleetAgeReport();\n    } else if (activeReport === "resolved_issues") {\n      fetchResolvedIssuesReport();\n    }'
);

fs.writeFileSync(file, code);
console.log('Fixed useEffect');
