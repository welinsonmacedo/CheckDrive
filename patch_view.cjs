const fs = require('fs');
let content = fs.readFileSync('src/modules/company/components/InventoryTab.tsx', 'utf8');

// 1. Add Eye to imports
content = content.replace(
  'import { Package, Truck, FileText, Plus, Search, Edit2, Trash2, X, Check, FileCheck, Layers, Upload } from "lucide-react";',
  'import { Package, Truck, FileText, Plus, Search, Edit2, Trash2, X, Check, FileCheck, Layers, Upload, Eye } from "lucide-react";'
);

// 2. Add selectedTx state
content = content.replace(
  'const [showNfModal, setShowNfModal] = useState(false);',
  'const [showNfModal, setShowNfModal] = useState(false);\n  const [selectedTx, setSelectedTx] = useState<any>(null);'
);

// 3. Add column to NF table head
content = content.replace(
  '<th className="px-6 py-3 text-right">Total</th>',
  '<th className="px-6 py-3 text-right">Total</th>\n                    <th className="px-6 py-3 text-center w-16">Ações</th>'
);

// 4. Add column to NF table body
content = content.replace(
  '<td className="px-6 py-3 text-sm font-bold text-zinc-900 text-right">R$ {(Number(t.total_price) || 0).toLocaleString(\'pt-BR\', {minimumFractionDigits: 2})}</td>\n                    </tr>',
  `<td className="px-6 py-3 text-sm font-bold text-zinc-900 text-right">R$ {(Number(t.total_price) || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                      <td className="px-6 py-3 text-center">
                        <button onClick={() => setSelectedTx(t)} className="p-1 text-zinc-400 hover:text-primary transition-colors cursor-pointer" title="Visualizar Detalhes">
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>`
);

// 5. Update empty state colSpan
content = content.replace(
  '<td colSpan={7} className="px-6 py-6 text-center text-zinc-500 text-sm">Nenhuma entrada registrada.</td>',
  '<td colSpan={8} className="px-6 py-6 text-center text-zinc-500 text-sm">Nenhuma entrada registrada.</td>'
);

// 6. Add modal at the end (before final closing div)
const txModal = `
      {/* Visualizar Transação */}
      {selectedTx && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-zinc-200 flex justify-between items-center">
              <h3 className="font-bold text-lg text-zinc-800">Detalhes da Entrada</h3>
              <button onClick={() => setSelectedTx(null)} className="text-zinc-500 hover:text-zinc-800 cursor-pointer"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase">Data/Hora</label>
                  <p className="text-sm text-zinc-900">{new Date(selectedTx.created_at).toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase">Tipo</label>
                  <p className="text-sm font-bold text-green-600">Entrada</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase">Produto</label>
                <p className="text-sm font-bold text-zinc-900">{selectedTx.inventory_items?.name || '-'}</p>
              </div>

              {selectedTx.inventory_suppliers?.name && (
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase">Fornecedor</label>
                  <p className="text-sm text-zinc-900">{selectedTx.inventory_suppliers?.name}</p>
                </div>
              )}

              {selectedTx.nf_number && (
                <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase">Nota Fiscal</label>
                      <p className="text-sm font-bold text-zinc-900">{selectedTx.nf_number}</p>
                    </div>
                    {selectedTx.date && (
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase">Emissão</label>
                        <p className="text-sm text-zinc-900">{new Date(selectedTx.date).toLocaleDateString('pt-BR')}</p>
                      </div>
                    )}
                  </div>
                  {selectedTx.nf_key && (
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase">Chave de Acesso</label>
                      <p className="text-xs font-mono text-zinc-700 break-all">{selectedTx.nf_key}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4 border-t border-zinc-200 pt-4 mt-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase">Quantidade</label>
                  <p className="text-base font-bold text-green-600">+{selectedTx.quantity}</p>
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase">Custo Unitário</label>
                  <p className="text-sm text-zinc-700">R$ {(Number(selectedTx.unit_price) || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                </div>
                <div className="flex-1 text-right">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase">Custo Total</label>
                  <p className="text-base font-black text-zinc-900">R$ {(Number(selectedTx.total_price) || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                </div>
              </div>

              {selectedTx.notes && (
                <div className="pt-2">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Observações</label>
                  <p className="text-sm text-zinc-700 bg-zinc-50 p-2 rounded border border-zinc-200">{selectedTx.notes}</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex justify-end">
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 bg-zinc-200 text-zinc-800 rounded-lg text-sm font-bold hover:bg-zinc-300 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace(
  '    </div>\n  );\n}\n',
  txModal + '\n    </div>\n  );\n}\n'
);

fs.writeFileSync('src/modules/company/components/InventoryTab.tsx', content);
