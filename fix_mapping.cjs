const fs = require('fs');
const file = 'src/modules/company/components/ReportsTab.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetStr = `      let mappedData = data.map((d) => {
        let status = d.status;
        const notesStr = String(d.resolution_notes || "").toLowerCase();
        if (
          status === "resolved" &&
          (!d.resolved_by || notesStr.includes("automaticamente pelo check list"))
        ) {
          status = "pending";
        }
        return { ...d, status };
      });
      
      const resolvedData = mappedData.filter(d => d.status === "resolved");`;

const newStr = `      // Do not convert resolved back to pending for this specific report.
      const resolvedData = data.filter(d => d.status === "resolved");`;

code = code.replace(targetStr, newStr);

fs.writeFileSync(file, code);
console.log('Fixed mapping for resolved issues report');
