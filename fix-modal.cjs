const fs = require('fs');
let file = 'src/modules/company/components/InfractionsTab.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '{selectedAttachment.toLowerCase().includes(".pdf") ? (',
  '{(typeof selectedAttachment === "string" && selectedAttachment.toLowerCase().includes(".pdf")) ? ('
);

// Remove the createPortal if it's there
// Make sure we use a simple createPortal
content = content.replace(
  '      {/* Modal Ver Anexo */}\n      <AnimatePresence>',
  '      {/* Modal Ver Anexo */}\n      {createPortal(\n        <AnimatePresence>'
);

content = content.replace(
  '        )}\n      </AnimatePresence>\n    </div>\n  );\n}',
  '        )}\n        </AnimatePresence>,\n        document.body\n      )}\n    </div>\n  );\n}'
);

fs.writeFileSync(file, content);
console.log('Fixed potential toLowerCase error and added createPortal correctly');
