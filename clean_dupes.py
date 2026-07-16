import re
with open('src/modules/company/components/AveragesTab.tsx', 'r') as f:
    c = f.read()
c = re.sub(r'routeSelectId: \'\',\n\s*routeSelectId: \'\',', r'routeSelectId: \'\',', c)
with open('src/modules/company/components/AveragesTab.tsx', 'w') as f:
    f.write(c)
