const fs = require('fs');
const file = 'src/modules/company/components/MaintenanceTab.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = `      const validResolveNfs = resolveNfs.filter(
        (nf) =>
          nf.nf_number?.trim() ||
          nf.nf_key?.trim() ||
          nf.items?.some((i: any) => i.name?.trim()),
      );
      const nfsJSONString = JSON.stringify(validResolveNfs);`;

const replacement = `      const validResolveNfs = resolveNfs.filter(
        (nf) =>
          nf.nf_number?.trim() ||
          nf.nf_key?.trim() ||
          nf.items?.some((i: any) => i.name?.trim()),
      );

      // Get origin NFs for stock items
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
      validResolveNfs.push(...Object.values(stockGroupsByOriginNf));

      const nfsJSONString = JSON.stringify(validResolveNfs);`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code);
  console.log('patched maintenance');
} else {
  console.log('target not found');
}
