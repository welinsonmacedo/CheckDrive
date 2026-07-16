import re

with open('src/modules/company/components/AveragesTab.tsx', 'r') as f:
    c = f.read()

target = """                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-left">
                          {editingId === row.id ? ("""

replacement = """                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-sm text-zinc-400 text-left">
                          {(() => {
                            let routeStr = "-";
                            if (row.schedules?.routes) {
                              routeStr = row.schedules.routes.destination ? `${row.schedules.routes.origin} - ${row.schedules.routes.destination}` : row.schedules.routes.origin;
                            } else if (row.notes && row.notes.includes("Rota: ")) {
                              routeStr = row.notes.split("Rota: ")[1].split("\\n")[0];
                            }
                            return routeStr;
                          })()}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-left">
                          {editingId === row.id ? ("""

c = c.replace(target, replacement)

with open('src/modules/company/components/AveragesTab.tsx', 'w') as f:
    f.write(c)

