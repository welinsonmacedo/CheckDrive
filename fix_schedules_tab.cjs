const fs = require('fs');
const file = 'src/modules/company/components/SchedulesTab.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  ') : (\n            {/* Mobile View */}',
  ') : (\n          <>\n            {/* Mobile View */}'
);

code = code.replace(
  '                {filteredSchedules.map((sch) => {\n                  const hasChecklist',
  '              </tbody>\n            </table></div>\n          </>\n          )}\n        </div>' // wait, the end needs to close the fragment! Let me check where the table closes.
);
fs.writeFileSync(file, code);
