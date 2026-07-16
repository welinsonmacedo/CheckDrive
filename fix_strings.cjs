const fs = require('fs');

let content = fs.readFileSync('src/modules/company/components/AveragesTab.tsx', 'utf8');
content = content.replace(/'Rota: ' \+ routes\.find\(r => r\.id === editData\.routeSelectId\)\?\.origin \+ \(routes\.find\(r => r\.id === editData\.routeSelectId\)\?\.destination \? ' - ' \+ routes\.find\(r => r\.id === editData\.routeSelectId\)\?\.destination : ''\) \+ '[\s\S]*?Informação manual' : 'Informação manual'/g,
    "editData.routeSelectId ? `Rota: ${routes.find(r => r.id === editData.routeSelectId)?.origin}${routes.find(r => r.id === editData.routeSelectId)?.destination ? ' - ' + routes.find(r => r.id === editData.routeSelectId)?.destination : ''}\\nInformação manual` : 'Informação manual'"
);

content = content.replace(/'Rota: ' \+ routes\.find\(r => r\.id === addFormData\.routeSelectId\)\?\.origin \+ \(routes\.find\(r => r\.id === addFormData\.routeSelectId\)\?\.destination \? ' - ' \+ routes\.find\(r => r\.id === addFormData\.routeSelectId\)\?\.destination : ''\) \+ '[\s\S]*?Informação manual' : 'Informação manual'/g,
    "addFormData.routeSelectId ? `Rota: ${routes.find(r => r.id === addFormData.routeSelectId)?.origin}${routes.find(r => r.id === addFormData.routeSelectId)?.destination ? ' - ' + routes.find(r => r.id === addFormData.routeSelectId)?.destination : ''}\\nInformação manual` : 'Informação manual'"
);

fs.writeFileSync('src/modules/company/components/AveragesTab.tsx', content);
