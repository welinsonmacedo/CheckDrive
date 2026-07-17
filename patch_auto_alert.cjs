const fs = require('fs');
const file = 'src/modules/company/components/MaintenanceTab.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = `    const fakeIssue = {
      ...firstRow,
      id: "bulk_resolve",
      item_title: \`Resolução em Lote (\${selectedRows.length} itens principais)\`,
      grouped_ids: idsToResolve,
      grouped_issues: grouped_issues,
      auto_alert_id: null,
      auto_alerts: null,
      status: "pending", // force pending so it default to resolved tab
    };

    openResolveModal(fakeIssue, "resolve");`;

const replacement = `    let issueToOpen;
    if (selectedRows.length === 1 && !firstRow.grouped_issues) {
      // Just one normal issue
      issueToOpen = firstRow;
    } else {
      issueToOpen = {
        ...firstRow,
        id: "bulk_resolve",
        item_title: \`Resolução em Lote (\${selectedRows.length} pendências)\`,
        grouped_ids: idsToResolve,
        grouped_issues: grouped_issues,
        auto_alert_id: null, // Bulk resolve doesn't support calibrating multiple alerts at once
        auto_alerts: null,
        status: "pending",
      };
    }

    openResolveModal(issueToOpen, "resolve");`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code);
  console.log('patched bulk alert');
} else {
  console.log('target not found');
}
