const fs = require('fs');
const file = 'src/modules/company/components/FuelTab.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/\submissions.length > 0 \? \(\s*\{\/\*\ Mobile View \*\/\}/g, 'submissions.length > 0 ? (<>{/* Mobile View */}');
code = code.replace(/<\/table>\s*<\/div>\s*<\/div>\s*<\/div>\s*\)\;/g, '</table></div></></div></div>);');

fs.writeFileSync(file, code);
