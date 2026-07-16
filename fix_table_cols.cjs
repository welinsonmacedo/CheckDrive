const fs = require('fs');

let content = fs.readFileSync('src/modules/company/components/AveragesTab.tsx', 'utf8');

// 1. Table header
if (!content.includes('<th className="py-3 px-4 text-left">Rota</th>')) {
  content = content.replace(
    '<th className="py-3 px-4 text-left">Motorista</th>',
    '<th className="py-3 px-4 text-left">Motorista</th>\\n                    <th className="py-3 px-4 text-left">Rota</th>'
  );
}

// 2. Table body row
const rowCode = `
                        <td className="py-3 px-4 font-mono text-sm text-zinc-400 text-left">
                          {(() => {
                            let routeStr = "-";
                            if (row.schedules?.routes) {
                              routeStr = row.schedules.routes.destination ? \`\${row.schedules.routes.origin} - \${row.schedules.routes.destination}\` : row.schedules.routes.origin;
                            } else if (row.notes && row.notes.includes("Rota: ")) {
                              routeStr = row.notes.split("Rota: ")[1].split("\\n")[0];
                            }
                            return routeStr;
                          })()}
                        </td>`;

if (!content.includes('let routeStr = "-";')) {
  content = content.replace(
    '                          )}\\n                        </td>\\n                        <td className="py-3 px-4 font-mono text-xs text-left">\\n                          {editingId === row.id ? (',
    '                          )}\\n                        </td>' + rowCode + '\\n                        <td className="py-3 px-4 font-mono text-xs text-left">\\n                          {editingId === row.id ? ('
  );
}

fs.writeFileSync('src/modules/company/components/AveragesTab.tsx', content);
