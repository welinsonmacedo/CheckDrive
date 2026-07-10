const fs = require('fs');
let file = 'src/modules/company/components/InfractionsTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const newBtn = `                            {inf.attachment_url && (
                              <button
                                onClick={() => setSelectedAttachment(inf.attachment_url)}
                                className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Ver Anexos"
                              >
                                <Eye size={18} />
                              </button>
                            )}
                            <button
                              onClick={() => setPrintInfraction(inf)}`;

content = content.replace(
  '<button\n                              onClick={() => setPrintInfraction(inf)}',
  newBtn
);

fs.writeFileSync(file, content);
console.log('Button patched');
