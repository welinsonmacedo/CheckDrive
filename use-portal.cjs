const fs = require('fs');
let file = 'src/modules/company/components/InfractionsTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldModalStart = `      {/* Modal Ver Anexo */}
      <AnimatePresence>
        {selectedAttachment && (
          <motion.div`;

const newModalStart = `      {/* Modal Ver Anexo */}
      {selectedAttachment && createPortal(
        <AnimatePresence>
          <motion.div`;

const oldModalEnd = `          </motion.div>
        )}
      </AnimatePresence>
    </div>`;

const newModalEnd = `          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>`;

content = content.replace(oldModalStart, newModalStart).replace(oldModalEnd, newModalEnd);

fs.writeFileSync(file, content);
console.log('Wrapped modal in portal');
