const fs = require('fs');
const file = 'src/modules/company/components/MaintenanceTab.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = `      // Get origin NFs for stock items
      const stockGroupsByOriginNf: Record<string, any> = {};
      for (const item of resolveStockItems) {
        if (!item.item_id || !item.quantity) continue;
        let originNf = "S/N";
        let originNfKey = "";
        const { data: txs } = await supabase
          .from("inventory_transactions")
          .select("nf_number, nf_key")
          .eq("item_id", item.item_id)
          .eq("type", "in")
          .order("created_at", { ascending: false })
          .limit(1);
        if (txs && txs.length > 0) {
          originNf = txs[0].nf_number || "S/N";
          originNfKey = txs[0].nf_key || "";
        }
        const groupKey = originNf;
        if (!stockGroupsByOriginNf[groupKey]) {
          stockGroupsByOriginNf[groupKey] = {
            id: \`pseudo-nf-\${Date.now()}-\${Math.random()}\`,
            nf_number: \`Estoque - Origem NF: \${originNf}\`,
            nf_key: originNfKey,
            items: [],
          };
        }
        stockGroupsByOriginNf[groupKey].items.push({
          ...item,
          name: \`\${item.name} (Uso do Estoque)\`,
        });
      }
      validResolveNfs.push(...Object.values(stockGroupsByOriginNf));`;

const replacement = `      if (resolveStockItems.length > 0) {
        validResolveNfs.push({
          id: \`stock-usage-\${Date.now()}\`,
          is_stock: true,
          nf_number: "Itens de Estoque",
          nf_key: "",
          items: resolveStockItems.filter((i: any) => i.item_id && i.quantity),
        });
      }`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code);
  console.log('patched pseudo nf');
} else {
  console.log('target not found');
}
