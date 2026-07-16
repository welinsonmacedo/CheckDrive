const fs = require('fs');
let content = fs.readFileSync('src/modules/company/components/SchedulesTab.tsx', 'utf8');

content = content.replace(
  "{sch.profiles?.email && !sch.profiles.email.endsWith('@noemail.local') && (\\n                          <button\\n                            onClick={() => setSelectedPrintSchedule(sch)}\\n                            className=\\\"text-blue-500 hover:underline text-[10px] font-bold ml-3\\\"\\n                            title=\\\"Gerar ficha de operação com QR Code\\\"",
  "{sch.profiles?.email && sch.profiles.email.endsWith('@noemail.local') && (\\n                          <button\\n                            onClick={() => setSelectedPrintSchedule(sch)}\\n                            className=\\\"text-blue-500 hover:underline text-[10px] font-bold ml-3\\\"\\n                            title=\\\"Gerar ficha de operação com QR Code\\\""
);

fs.writeFileSync('src/modules/company/components/SchedulesTab.tsx', content);
