const fs = require('fs');
let content = fs.readFileSync('src/modules/company/components/InventoryTab.tsx', 'utf8');

const regex = /let supplier_id = "";[\s\S]*?setShowNfModal\(true\);/m;

const replacement = `let supplier_id = "";
        if (supplierCnpj) {
          const rawCnpj = supplierCnpj.replace(/\\D/g, "");
          const existingSupplier = suppliers.find(s => s.cnpj_cpf.replace(/\\D/g, "") === rawCnpj);
          if (existingSupplier) {
             supplier_id = existingSupplier.id;
          } else {
             const { data: newSupp } = await supabase.from('inventory_suppliers').insert({
               company_id: user?.company_id,
               name: supplierName || "Fornecedor (XML)",
               cnpj_cpf: rawCnpj
             }).select().single();
             if (newSupp) {
               supplier_id = newSupp.id;
               setSuppliers(prev => [...prev, newSupp]);
             }
          }
        }

        const detNodes = xml.getElementsByTagName("det");
        const importedItems = [];
        const newItemsList = [];
        
        for (let i = 0; i < detNodes.length; i++) {
           const det = detNodes[i];
           const prod = det.getElementsByTagName("prod")[0];
           if (prod) {
             const cProd = prod.getElementsByTagName("cProd")[0]?.textContent || "";
             const xProd = prod.getElementsByTagName("xProd")[0]?.textContent || "";
             const qCom = parseFloat(prod.getElementsByTagName("qCom")[0]?.textContent || "0");
             const vUnCom = parseFloat(prod.getElementsByTagName("vUnCom")[0]?.textContent || "0");
             
             let item_id = "";
             const existingItem = items.find(it => it.sku === cProd || it.name.toLowerCase() === xProd.toLowerCase()) || newItemsList.find((it: any) => it.sku === cProd || it.name.toLowerCase() === xProd.toLowerCase());
             
             if (existingItem) {
               item_id = existingItem.id;
             } else {
               const { data: newItem } = await supabase.from('inventory_items').insert({
                 company_id: user?.company_id,
                 name: xProd || "Produto Desconhecido",
                 sku: cProd,
                 current_quantity: 0,
                 min_quantity: 0
               }).select().single();
               
               if (newItem) {
                 item_id = newItem.id;
                 newItemsList.push(newItem);
               }
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
        
        if (newItemsList.length > 0) {
          setItems(prev => [...prev, ...newItemsList]);
        }

        setNfForm({
          id: "",
          nf_number,
          nf_key,
          supplier_id,
          date,
          notes: "Importado de XML - Fornecedor: " + supplierName,
          items: importedItems.length > 0 ? importedItems : [{ item_id: "", quantity: 1, unit_price: 0 as any }]
        });
        
        setShowNfModal(true);`;

content = content.replace(regex, replacement);

fs.writeFileSync('src/modules/company/components/InventoryTab.tsx', content);
