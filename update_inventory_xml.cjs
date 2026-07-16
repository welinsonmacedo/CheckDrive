const fs = require('fs');
let content = fs.readFileSync('src/modules/company/components/InventoryTab.tsx', 'utf8');

// Add Upload to lucide-react imports
content = content.replace(
  'import { Package, Truck, FileText, Plus, Search, Edit2, Trash2, X, Check, FileCheck, Layers } from "lucide-react";',
  'import { Package, Truck, FileText, Plus, Search, Edit2, Trash2, X, Check, FileCheck, Layers, Upload } from "lucide-react";'
);

// We need a ref for the file input
content = content.replace(
  'const [loading, setLoading] = useState(true);',
  `const [loading, setLoading] = useState(true);
  const fileInputRef = React.useRef<HTMLInputElement>(null);`
);

// Add the handleImportXML function
const importFunc = `
  const handleImportXML = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "text/xml");

        const getNfeField = (tag: string) => xml.getElementsByTagName(tag)[0]?.textContent || "";

        const nf_number = getNfeField("nNF");
        let nf_key = getNfeField("chNFe");
        if (!nf_key) {
           const infNFe = xml.getElementsByTagName("infNFe")[0];
           if (infNFe) {
             const id = infNFe.getAttribute("Id");
             if (id && id.startsWith("NFe")) nf_key = id.substring(3);
           }
        }
        
        const dhEmi = getNfeField("dhEmi");
        let date = "";
        if (dhEmi) {
           date = dhEmi.substring(0, 10);
        }

        const emitNode = xml.getElementsByTagName("emit")[0];
        let supplierCnpj = "";
        let supplierName = "";
        if (emitNode) {
          supplierCnpj = emitNode.getElementsByTagName("CNPJ")[0]?.textContent || "";
          supplierName = emitNode.getElementsByTagName("xNome")[0]?.textContent || "";
        }

        let supplier_id = "";
        if (supplierCnpj) {
          const rawCnpj = supplierCnpj.replace(/\\D/g, "");
          const existingSupplier = suppliers.find(s => s.cnpj_cpf.replace(/\\D/g, "") === rawCnpj);
          if (existingSupplier) {
             supplier_id = existingSupplier.id;
          }
        }

        const detNodes = xml.getElementsByTagName("det");
        const importedItems = [];
        
        for (let i = 0; i < detNodes.length; i++) {
           const det = detNodes[i];
           const prod = det.getElementsByTagName("prod")[0];
           if (prod) {
             const cProd = prod.getElementsByTagName("cProd")[0]?.textContent || "";
             const xProd = prod.getElementsByTagName("xProd")[0]?.textContent || "";
             const qCom = parseFloat(prod.getElementsByTagName("qCom")[0]?.textContent || "0");
             const vUnCom = parseFloat(prod.getElementsByTagName("vUnCom")[0]?.textContent || "0");
             
             let item_id = "";
             const existingItem = items.find(it => it.sku === cProd || it.name.toLowerCase() === xProd.toLowerCase());
             if (existingItem) {
               item_id = existingItem.id;
             }
             
             importedItems.push({
                item_id,
                quantity: qCom,
                unit_price: vUnCom,
                _importedName: xProd,
                _importedSku: cProd
             });
           }
        }

        setNfForm({
          id: "",
          nf_number,
          nf_key,
          supplier_id,
          date,
          notes: "Importado de XML - Fornecedor: " + supplierName,
          items: importedItems.length > 0 ? importedItems : [{ item_id: "", quantity: 1, unit_price: 0 }]
        });
        
        setShowNfModal(true);

      } catch (err) {
        console.error(err);
        alert("Erro ao ler o arquivo XML da NF.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };
`;

content = content.replace(
  'const handleSaveItem = async () => {',
  importFunc + '\n  const handleSaveItem = async () => {'
);

// Add the import button near "Lançar Entrada"
content = content.replace(
  '<button\n                onClick={() => {\n                  setNfForm({ id: "", nf_number: "", nf_key: "", supplier_id: "", date: "", notes: "", items: [{ item_id: "", quantity: 1, unit_price: 0 }] });\n                  setShowNfModal(true);\n                }}\n                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary-dark cursor-pointer"\n              >\n                <Plus size={16} /> Lançar Entrada\n              </button>',
  `<div className="flex items-center gap-3">
                <input type="file" accept=".xml" className="hidden" ref={fileInputRef} onChange={handleImportXML} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-zinc-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-zinc-700 cursor-pointer"
                >
                  <Upload size={16} /> Importar XML
                </button>
                <button
                  onClick={() => {
                    setNfForm({ id: "", nf_number: "", nf_key: "", supplier_id: "", date: "", notes: "", items: [{ item_id: "", quantity: 1, unit_price: 0 }] });
                    setShowNfModal(true);
                  }}
                  className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary-dark cursor-pointer"
                >
                  <Plus size={16} /> Lançar Entrada
                </button>
              </div>`
);

// Render the _importedName in the select or nearby to help user map the item
content = content.replace(
  '<label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase">Produto</label>',
  '<label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase">Produto {(it as any)._importedName ? `(XML: ${(it as any)._importedName})` : ""}</label>'
);

fs.writeFileSync('src/modules/company/components/InventoryTab.tsx', content);
