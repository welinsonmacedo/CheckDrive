const fs = require('fs');

function patchFile(filepath) {
  if (!fs.existsSync(filepath)) return;
  let content = fs.readFileSync(filepath, 'utf8');

  // Add state
  if (!content.includes('const [syncDriverId, setSyncDriverId]')) {
    content = content.replace(
      "const [syncEndDate, setSyncEndDate] = useState('');",
      "const [syncEndDate, setSyncEndDate] = useState('');\n  const [syncDriverId, setSyncDriverId] = useState('');"
    );
  }

  // Update handleOpenSyncModal
  content = content.replace(
    'setSyncEndDate(endDate || \'\');',
    'setSyncEndDate(endDate || \'\');\n    setSyncDriverId(filterDriver || \'\');'
  );

  // Update confirmSyncHistory
  if (!content.includes('if (syncDriverId && item.driver_id !== syncDriverId) include = false;')) {
    content = content.replace(
      'if (d > e) include = false;\n         }',
      'if (d > e) include = false;\n         }\n         if (syncDriverId && item.driver_id !== syncDriverId) include = false;'
    );
  }

  // Add UI to the sync modal
  const driverSelectHtml = `
              <div className="flex flex-col text-left">
                <label className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-1">Motorista (Opcional)</label>
                <select
                  value={syncDriverId}
                  onChange={(e) => setSyncDriverId(e.target.value)}
                  className="bg-app-bg border border-app-border rounded-xl px-3 py-2 text-xs font-semibold text-text-main focus:outline-none focus:border-primary"
                >
                  <option value="">Todos</option>
                  {uniqueDrivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>`;

  if (!content.includes('Motorista (Opcional)')) {
    content = content.replace(
      '</div>\n            </div>\n\n            <div className="flex justify-end gap-2">',
      '</div>\n' + driverSelectHtml + '\n            </div>\n\n            <div className="flex justify-end gap-2">'
    );
  }

  fs.writeFileSync(filepath, content);
  console.log('Patched ' + filepath);
}

patchFile('src/modules/company/components/AveragesTab.tsx');
patchFile('src/components/admin/AveragesTab.tsx');
