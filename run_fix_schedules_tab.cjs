const fs = require('fs');
const file = 'src/modules/company/components/SchedulesTab.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  ') : (\n                        {/* Mobile View */}',
  ') : (\n          <>\n            {/* Mobile View */}'
);

code = code.replace(
  '            </table></div>\n          )}',
  '            </table></div>\n          </>\n          )}'
);

fs.writeFileSync(file, code);
