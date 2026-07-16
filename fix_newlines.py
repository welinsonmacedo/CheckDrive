with open('src/modules/company/components/AveragesTab.tsx', 'r') as f:
    c = f.read()
c = c.replace('\\n                    <th className="py-3 px-4 text-left">Rota</th>\\n', '\n                    <th className="py-3 px-4 text-left">Rota</th>\n')
with open('src/modules/company/components/AveragesTab.tsx', 'w') as f:
    f.write(c)
