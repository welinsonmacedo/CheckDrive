const fs = require('fs');
let content = fs.readFileSync('src/modules/company/components/SchedulesTab.tsx', 'utf8');

const regex = /\{sch\.profiles\?\.email && !sch\.profiles\.email\.endsWith\('@noemail\.local'\) && \(\s*<button\s*onClick=\{\(\) => setSelectedPrintSchedule\(sch\)\}/g;

content = content.replace(regex, "{sch.profiles?.email && sch.profiles.email.endsWith('@noemail.local') && (\\n                          <button\\n                            onClick={() => setSelectedPrintSchedule(sch)}");

fs.writeFileSync('src/modules/company/components/SchedulesTab.tsx', content);
