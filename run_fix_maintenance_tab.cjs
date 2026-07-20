const fs = require('fs');
const file = 'src/modules/company/components/MaintenanceTab.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  ') : (\n                        {/* Mobile View */}',
  ') : (\n          <>\n            {/* Mobile View */}'
);

code = code.replace(
  '              </table>\n            </div>\n          )}',
  '              </table>\n            </div>\n          </>\n          )}'
);

fs.writeFileSync(file, code);
