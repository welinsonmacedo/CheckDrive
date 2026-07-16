const fs = require('fs');
let content = fs.readFileSync('src/modules/company/components/SchedulesTab.tsx', 'utf8');

content = content.replace(
  /\{sch\.profiles\?\.email\?\.endsWith\('@noemail\.local'\) && \(/g,
  '{sch.profiles?.email && !sch.profiles.email.endsWith(\'@noemail.local\') && ('
);

fs.writeFileSync('src/modules/company/components/SchedulesTab.tsx', content);
