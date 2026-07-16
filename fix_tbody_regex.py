import re

with open('src/modules/company/components/AveragesTab.tsx', 'r') as f:
    c = f.read()

pattern = r"(\s*)\)\}\n(\s*)<\/td>\n(\s*)<td className=\"py-3 px-4 font-mono text-xs text-left\">\n(\s*)\{editingId === row\.id \? \("

replacement = r"""\1)}
\2</td>
\3<td className="py-3 px-4 font-mono text-sm text-zinc-400 text-left">
\4{(() => {
\4  let routeStr = "-";
\4  if (row.schedules?.routes) {
\4    routeStr = row.schedules.routes.destination ? `${row.schedules.routes.origin} - ${row.schedules.routes.destination}` : row.schedules.routes.origin;
\4  } else if (row.notes && row.notes.includes("Rota: ")) {
\4    routeStr = row.notes.split("Rota: ")[1].split("\\n")[0];
\4  }
\4  return routeStr;
\4})()}
\3</td>
\3<td className="py-3 px-4 font-mono text-xs text-left">
\4{editingId === row.id ? ("""

# Replace only the first occurrence after full_name!
# Actually, let's just make sure we replace the one right after full_name.
parts = c.split("row.profiles?.full_name?.split(' ')[0] || '-'")
if len(parts) > 1:
    parts[1] = re.sub(pattern, replacement, parts[1], count=1)
    c = "row.profiles?.full_name?.split(' ')[0] || '-'".join(parts)
    print("Replaced!")
else:
    print("Not found full_name!")

with open('src/modules/company/components/AveragesTab.tsx', 'w') as f:
    f.write(c)
