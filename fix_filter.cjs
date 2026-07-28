const fs = require('fs');
let code = fs.readFileSync('src/modules/company/components/MaintenanceTab.tsx', 'utf8');

code = code.replace(
  'return issue.status === activeTab;',
  'return issue.status?.toLowerCase().trim() === activeTab;'
);

code = code.replace(
  'const pendingCount = issues.filter((i) => i.status === "pending").length;',
  'const pendingCount = issues.filter((i) => i.status?.toLowerCase().trim() === "pending").length;'
);

code = code.replace(
  'const waitingCount = issues.filter((i) => i.status === "waiting").length;',
  'const waitingCount = issues.filter((i) => i.status?.toLowerCase().trim() === "waiting").length;'
);

code = code.replace(
  'const waitingNfCount = issues.filter((i) => i.status === "resolved" && i.resolution_notes?.startsWith("[AGUARDANDO_NF]")).length;',
  'const waitingNfCount = issues.filter((i) => i.status?.toLowerCase().trim() === "resolved" && i.resolution_notes?.startsWith("[AGUARDANDO_NF]")).length;'
);

code = code.replace(
  'const resolvedCount = issues.filter((i) => i.status === "resolved" && !i.resolution_notes?.startsWith("[AGUARDANDO_NF]") && !i.resolution_notes?.toLowerCase().includes("normal no checklist")).length;',
  'const resolvedCount = issues.filter((i) => i.status?.toLowerCase().trim() === "resolved" && !i.resolution_notes?.startsWith("[AGUARDANDO_NF]") && !i.resolution_notes?.toLowerCase().includes("normal no checklist")).length;'
);

fs.writeFileSync('src/modules/company/components/MaintenanceTab.tsx', code);
