const fs = require('fs');
const file = 'src/modules/company/components/ReportsTab.tsx';
let code = fs.readFileSync(file, 'utf8');

const target1 = `      let mappedData = data.map((d) => {
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

      mappedData = groupResolvedIssues(mappedData);

      const stats = {
        total: mappedData.length,
        pending: mappedData.filter((d) => d.status === "pending").length,
        resolved: mappedData.filter((d) => d.status === "resolved").length,
        mostCommon: [] as any[],
      };

      const defectCounts: Record<string, number> = {};
      mappedData.forEach((d) => {
        defectCounts[d.item_title] = (defectCounts[d.item_title] || 0) + 1;
      });`;

const replacement1 = `      let mappedData = data.map((d) => {
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

      // Calculate stats on individual defects
      const stats = {
        total: mappedData.length,
        pending: mappedData.filter((d) => d.status === "pending").length,
        resolved: mappedData.filter((d) => d.status === "resolved").length,
        mostCommon: [] as any[],
      };

      const defectCounts: Record<string, number> = {};
      mappedData.forEach((d) => {
        defectCounts[d.item_title] = (defectCounts[d.item_title] || 0) + 1;
      });`;

code = code.replace(target1, replacement1);
fs.writeFileSync(file, code);
