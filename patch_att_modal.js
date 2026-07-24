import fs from 'fs';
const file = 'src/modules/company/components/AttachmentViewModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `            <a
              href={attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
            >
              Abrir Original em Nova Guia
            </a>`;
const replaceStr = `            <div className="flex gap-2">
              <a
                href={attachmentUrl}
                download
                className="px-6 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors flex items-center gap-2"
              >
                📥 Download
              </a>
              <a
                href={attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                Abrir Original em Nova Guia
              </a>
            </div>`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replaceStr);
  fs.writeFileSync(file, content);
  console.log("Successfully patched attachment modal.");
} else {
  console.log("Could not find target string.");
}
