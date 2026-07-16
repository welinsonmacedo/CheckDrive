const fs = require('fs');
let content = fs.readFileSync('src/modules/company/components/SchedulesTab.tsx', 'utf8');

const regex = /\{sch\.profiles\?\.email && !sch\.profiles\.email\.endsWith\('@noemail\.local'\) && \(\s*<button\s*onClick=\{\(\) => \{\s*const email = sch\.profiles\.email;\s*const pwd = "Pw@"/g;

content = content.replace(regex, '{sch.profiles?.email && sch.profiles.email.endsWith(\'@noemail.local\') && (\\n                          <button\\n                            onClick={() => {\\n                              const email = sch.profiles.email;\\n                              const pwd = "Pw@"');

fs.writeFileSync('src/modules/company/components/SchedulesTab.tsx', content);
