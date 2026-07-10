const fs = require('fs');
let file = 'src/modules/company/components/InfractionsTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldStr = `      {selectedAttachment && createPortal(
        <AnimatePresence>
          <motion.div`;

const newStr = `      <AnimatePresence>
        {selectedAttachment && (
          <motion.div`;

const oldEnd = `          </motion.div>
        </AnimatePresence>,
        document.body
      )}`;

const newEnd = `          </motion.div>
        )}
      </AnimatePresence>`;

content = content.replace(oldStr, newStr).replace(oldEnd, newEnd);
fs.writeFileSync(file, content);
console.log('Reverted portal');
