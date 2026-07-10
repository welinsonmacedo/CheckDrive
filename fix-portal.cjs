const fs = require('fs');
let file = 'src/modules/company/components/InfractionsTab.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '      {/* Modal Ver Anexo */}\n      {createPortal(\n        <AnimatePresence>',
  '      {/* Modal Ver Anexo */}\n      <AnimatePresence>'
);

content = content.replace(
  '        )}\n        </AnimatePresence>,\n        document.body\n      )}\n    </div>\n  );\n}',
  '        )}\n      </AnimatePresence>\n    </div>\n  );\n}'
);

content = content.replace(
  'className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"',
  'className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 999999 }}'
);

fs.writeFileSync(file, content);
console.log('Removed portal and set zIndex 999999');
