const fs = require('fs');
const file = 'src/modules/company/components/MaintenanceTab.tsx';
let code = fs.readFileSync(file, 'utf8');

const target1 = `  async function handleBulkDelete() {`;
const replacement1 = `  function handleBulkResolve() {
    if (selectedRows.length === 0) return;

    const idsToResolve = [];
    const grouped_issues = [];

    selectedRows.forEach((rowId) => {
      const row = issues.find((i) => i.id === rowId);
      if (row && row.grouped_issues && row.grouped_issues.length > 0) {
        idsToResolve.push(...row.grouped_issues.map((gi) => gi.id));
        grouped_issues.push(...row.grouped_issues);
      } else if (row) {
        idsToResolve.push(row.id);
        grouped_issues.push(row);
      }
    });

    const firstRow = issues.find((i) => i.id === selectedRows[0]) || grouped_issues[0];

    const fakeIssue = {
      ...firstRow,
      id: "bulk_resolve",
      item_title: \`Resolução em Lote (\${selectedRows.length} itens principais)\`,
      grouped_ids: idsToResolve,
      grouped_issues: grouped_issues,
      auto_alert_id: null,
      auto_alerts: null,
      status: "pending", // force pending so it default to resolved tab
    };

    openResolveModal(fakeIssue, "resolve");
  }

  async function handleBulkDelete() {`;

const target2 = `                    <Trash2 size={14} />
                    Excluir ({selectedRows.length})
                  </button>
                )}`;
const replacement2 = `                    <Trash2 size={14} />
                    Excluir ({selectedRows.length})
                  </button>
                  <button
                    onClick={handleBulkResolve}
                    className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors uppercase tracking-wider"
                  >
                    <Wrench size={14} />
                    Resolver Selecionadas ({selectedRows.length})
                  </button>
                )}`;

if (code.includes(target1) && code.includes(target2)) {
  code = code.replace(target1, replacement1);
  code = code.replace(target2, replacement2);
  fs.writeFileSync(file, code);
  console.log('patched bulk resolve');
} else {
  console.log('targets not found');
}
