const fs = require('fs');
let code = fs.readFileSync('src/modules/company/components/MaintenanceTab.tsx', 'utf8');

// Replace the array of tabs in MaintenanceTab
code = code.replace(
  '{["pending", "waiting", "waiting_nf", "resolved", "maintenance_tracking", "items", "reports"].map((tab) => (',
  '{["pending", "waiting", "waiting_nf", "resolved", "maintenance_tracking"].map((tab) => ('
);

// Also remove the label conditions for items and reports
code = code.replace(
  'tab === "items"\n                      ? "Itens & Preços"\n                      : tab === "reports"\n                        ? "Relatórios / NF"\n                        : "Acompanhamento"}',
  'tab === "maintenance_tracking"\n                      ? "Acompanhamento"\n                      : ""}'
);

fs.writeFileSync('src/modules/company/components/MaintenanceTab.tsx', code);
