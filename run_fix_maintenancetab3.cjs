const fs = require('fs');
const file = 'src/modules/company/components/MaintenanceTab.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/\) :\ \(\s*\{\/\*\ Mobile View \*\/\}/g, ') : (<>{/* Mobile View */}');
code = code.replace(/<\/table>\s*<\/div>\s*\)\}/g, '</table></div></>)}');

fs.writeFileSync(file, code);
