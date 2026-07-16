const fs = require('fs');
let content = fs.readFileSync('src/modules/company/components/SchedulesTab.tsx', 'utf8');

content = content.replace(
  '<SchedulePrintModal schedule={selectedPrintSchedule} onClose={() => setSelectedPrintSchedule(null)} />      )}\n    </div>\n  );\n}',
  '<SchedulePrintModal schedule={selectedPrintSchedule} onClose={() => setSelectedPrintSchedule(null)} />\n    </div>\n  );\n}'
);

content = content.replace(
  '      <SchedulePrintModal\n        schedule={selectedPrintSchedule}\n        onClose={() => setSelectedPrintSchedule(null)}\n      />\n      )}\n    </div>\n  );\n}',
  '      <SchedulePrintModal\n        schedule={selectedPrintSchedule}\n        onClose={() => setSelectedPrintSchedule(null)}\n      />\n    </div>\n  );\n}'
);
// Also just in case, clean up any stray `)}`
content = content.replace(/\n      \)\}\n    <\/div>\n  \);\n\}/g, '\n    </div>\n  );\n}');

fs.writeFileSync('src/modules/company/components/SchedulesTab.tsx', content);
