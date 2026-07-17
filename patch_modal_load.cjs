const fs = require('fs');
const file = 'src/modules/company/components/MaintenanceTab.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = `    if (Array.isArray(loadedNfs) && loadedNfs.length > 0) {
      setResolveNfs(loadedNfs);
    } else {
      setResolveNfs([
        {
          id: Date.now().toString(),
          nf_number: "",
          nf_key: "",
          items: [
            {
              id: \`item-\${Date.now()}\`,
              item_id: "",
              name: "",
              quantity: 1,
              unit_price: 0,
            },
          ],
        },
      ]);
    }
    setResolveStockItems([]);`;

const replacement = `    if (Array.isArray(loadedNfs) && loadedNfs.length > 0) {
      const actualNfs = loadedNfs.filter((n: any) => !n.is_stock && !(n.nf_number || "").includes("Estoque - Origem NF"));
      const stockGroups = loadedNfs.filter((n: any) => n.is_stock || (n.nf_number || "").includes("Estoque - Origem NF"));
      
      if (actualNfs.length > 0) {
        setResolveNfs(actualNfs);
      } else {
        setResolveNfs([{ id: Date.now().toString(), nf_number: "", nf_key: "", items: [{ id: \`item-\${Date.now()}\`, item_id: "", name: "", quantity: 1, unit_price: 0 }] }]);
      }
      
      const loadedStock = [];
      for (const sg of stockGroups) {
        if (sg.items) {
          loadedStock.push(...sg.items.map((i: any) => ({ ...i, name: i.name.replace(" (Uso do Estoque)", "") })));
        }
      }
      setResolveStockItems(loadedStock);
    } else {
      setResolveNfs([{ id: Date.now().toString(), nf_number: "", nf_key: "", items: [{ id: \`item-\${Date.now()}\`, item_id: "", name: "", quantity: 1, unit_price: 0 }] }]);
      setResolveStockItems([]);
    }`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code);
  console.log('patched modal load');
} else {
  console.log('target not found');
}
