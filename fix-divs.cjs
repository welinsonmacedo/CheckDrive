const fs = require('fs');
let file = 'src/modules/company/components/InfractionsTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `                        </div>
                        </div>
                        {inf.attachment_url && (
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onViewAttachment(inf.attachment_url); }}
                            className="mt-2 p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center justify-end w-fit self-end self-end sm:self-end"
                            title="Ver Anexos"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                      </div>`;

const replaceStr = `                        </div>

                        {inf.attachment_url && (
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onViewAttachment(inf.attachment_url); }}
                            className="mt-2 p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center justify-end w-fit self-end self-end sm:self-end"
                            title="Ver Anexos"
                          >
                            <Eye size={16} />
                          </button>
                        )}`;

content = content.replace(targetStr, replaceStr);
fs.writeFileSync(file, content);
console.log('Fixed divs');
