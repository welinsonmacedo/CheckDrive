const fs = require('fs');
const file = 'src/modules/company/components/ReportsTab.tsx';
let code = fs.readFileSync(file, 'utf8');

const target1 = `      const groupedArray = Object.keys(grouped).map(plate => {
        const issues = grouped[plate];
        
        const groupedIssues: Record<string, any> = {};
        issues.forEach(iss => {
          // Identify repeated defects by title and description
          const key = \`\${iss.item_title}::\${(iss.description || "").trim().toLowerCase()}\`;
          if (!groupedIssues[key]) {
             groupedIssues[key] = { ...iss, repeatCount: 1 };
          } else {
             groupedIssues[key].repeatCount += 1;
          }
        });
        
        return {
          plate,
          issues: Object.values(groupedIssues),
          count: issues.length
        };
      }).sort((a, b) => b.count - a.count);`;

const replacement1 = `      const groupedArray = Object.keys(grouped).map(plate => {
        const issues = grouped[plate];
        
        const groupedIssues: Record<string, any> = {};
        issues.forEach(iss => {
          // Identify repeated defects by title ONLY
          const key = iss.item_title;
          if (!groupedIssues[key]) {
             groupedIssues[key] = { ...iss, repeatCount: 1 };
          } else {
             groupedIssues[key].repeatCount += 1;
             const currentDesc = groupedIssues[key].description || "";
             const newDesc = iss.description || "";
             if (newDesc && !currentDesc.includes(newDesc)) {
                groupedIssues[key].description = currentDesc ? \`\${currentDesc} | \${newDesc}\` : newDesc;
             }
          }
        });
        
        return {
          plate,
          issues: Object.values(groupedIssues),
          count: issues.length
        };
      }).sort((a, b) => b.count - a.count);`;

code = code.replace(target1, replacement1);
fs.writeFileSync(file, code);
