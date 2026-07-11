const fs = require('fs');

let file = 'src/modules/company/components/MaintenanceTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const resolveTarget = `                              <input
                                type="text"
                                list="issue-categories"
                                placeholder="Ex: Elétrica, Mecânica, Pneus..."
                                className="w-full px-4 py-3 border border-zinc-200 rounded-2xl hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium text-zinc-800 transition-all shadow-sm"
                                value={resolveCategory}
                                onChange={(e) => setResolveCategory(e.target.value)}
                              />
                              <datalist id="issue-categories">
                                {Array.from(new Set([
                                  ...issues.map((i) => i.item_category).filter(Boolean),
                                  ...checklistItemsList.map((i) => i.title ? i.title.split('::')[0] : '').filter(Boolean)
                                ])).map((cat: any) => (
                                  <option key={cat} value={cat} />
                                ))}
                              </datalist>`;

const resolveReplace = `                              <select
                                multiple
                                size={5}
                                className="w-full px-4 py-3 border border-zinc-200 rounded-2xl hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium text-zinc-800 transition-all shadow-sm bg-white"
                                value={resolveCategory ? resolveCategory.split(', ') : []}
                                onChange={(e) => {
                                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                                  setResolveCategory(selected.join(', '));
                                }}
                              >
                                {Array.from(new Set(checklistItemsList.map((i) => i.title ? i.title.split('::')[0] : '').filter(Boolean))).sort().map((cat: any) => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                              <p className="text-[10px] text-zinc-500 mt-1">
                                Segure Ctrl (Windows) ou Cmd (Mac) para selecionar múltiplas categorias.
                              </p>`;

content = content.replace(resolveTarget, resolveReplace);

const addTarget = `                            <input
                              type="text"
                              list="inventory-categories"
                              placeholder="Categoria"
                              className="bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              value={newItemCategory}
                              onChange={(e) =>
                                setNewItemCategory(e.target.value)
                              }
                            />
                            <datalist id="inventory-categories">
                              {Array.from(new Set([
                                ...inventoryItems.map((i) => i.category).filter(Boolean),
                                ...checklistItemsList.map((i) => i.title ? i.title.split('::')[0] : '').filter(Boolean)
                              ])).map((cat: any) => (
                                <option key={cat} value={cat} />
                              ))}
                            </datalist>`;

const addReplace = `                            <select
                              multiple
                              size={3}
                              className="bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              value={newItemCategory ? newItemCategory.split(', ') : []}
                              onChange={(e) => {
                                const selected = Array.from(e.target.selectedOptions, option => option.value);
                                setNewItemCategory(selected.join(', '));
                              }}
                            >
                              {Array.from(new Set(checklistItemsList.map((i) => i.title ? i.title.split('::')[0] : '').filter(Boolean))).sort().map((cat: any) => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>`;

content = content.replace(addTarget, addReplace);
fs.writeFileSync(file, content);

let invFile = 'src/modules/company/components/InventoryTab.tsx';
let invContent = fs.readFileSync(invFile, 'utf8');

const invTarget = `                  <input
                    type="text"
                    list="inventory-tab-categories"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    value={itemForm.category}
                    onChange={(e) => setItemForm({...itemForm, category: e.target.value})}
                  />
                  <datalist id="inventory-tab-categories">
                    {Array.from(new Set([
                      ...items.map(i => i.category).filter(Boolean),
                      ...checklistItems.map(i => i.title ? i.title.split('::')[0] : '').filter(Boolean)
                    ])).map((cat: any) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>`;

const invReplace = `                  <select
                    multiple
                    size={4}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                    value={itemForm.category ? itemForm.category.split(', ') : []}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setItemForm({...itemForm, category: selected.join(', ')});
                    }}
                  >
                    {Array.from(new Set(checklistItems.map((i) => i.title ? i.title.split('::')[0] : '').filter(Boolean))).sort().map((cat: any) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Segure Ctrl (Windows) ou Cmd (Mac) para selecionar mais de uma.
                  </p>`;

invContent = invContent.replace(invTarget, invReplace);
fs.writeFileSync(invFile, invContent);

console.log('Fixed categories to select multiple');
