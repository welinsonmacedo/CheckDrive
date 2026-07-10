const fs = require('fs');
let file = 'src/modules/company/components/InfractionsTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add import
content = content.replace(
  'import DriverSummaryPrintModal from "./DriverSummaryPrintModal";',
  'import DriverSummaryPrintModal from "./DriverSummaryPrintModal";\nimport AttachmentViewModal from "./AttachmentViewModal";'
);

// 2. Replace the entire inline modal with the component
const startStr = '      {/* Modal Ver Anexo */}';
const endStr = '    </div>\n  );\n}';

const newStr = `      {/* Modal Ver Anexo */}
      {selectedAttachment && (
        <AttachmentViewModal
          attachmentUrl={selectedAttachment}
          onClose={() => setSelectedAttachment(null)}
        />
      )}
    </div>
  );
}`;

const startIndex = content.indexOf(startStr);
const endIndex = content.lastIndexOf(endStr) + endStr.length;

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + newStr;
}

fs.writeFileSync(file, content);
console.log('Replaced inline modal with AttachmentViewModal');
