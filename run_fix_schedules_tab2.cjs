const fs = require('fs');
const file = 'src/modules/company/components/SchedulesTab.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  ') : (                        {/* Mobile View */}',
  ') : (          <>\n            {/* Mobile View */}'
);

code = code.replace(
  '            </table></div>          )}',
  '            </table></div>          </>\n          )}'
);

fs.writeFileSync(file, code);
