const fs = require('fs');

let content = fs.readFileSync('src/modules/company/components/ReportsTab.tsx', 'utf8');

const fetchIssuesReplacement = `
      // 2. Fetch from checklist_issues
      const { data: issuesData, error: errIssues } = await supabase
        .from("checklist_issues")
        .select(\`*, vehicles(plate), trailers(plate)\`)
        .in("status", ["resolved", "waiting"])
        .gte("updated_at", \`\${startDate}T00:00:00Z\`)
        .lte("updated_at", \`\${endDate}T23:59:59Z\`);

      if (errIssues) throw errIssues;

      const combinedPurchases: any[] = [];

      // Process stock transactions
      (stockTransactions || []).forEach((t: any) => {
        combinedPurchases.push({
          id: \`stock-\${t.id}\`,
          date: t.created_at,
          nf_number: t.nf_number || "S/N",
          origin: "stock",
          item_name: t.inventory_items?.name || t.item_id,
          quantity: t.quantity,
          unit_price: t.unit_price,
          total_price: t.total_price || t.quantity * t.unit_price,
          context: "Compra para Estoque",
        });
      });

      // Process issues
      (issuesData || []).forEach((i: any) => {
        const vehicleInfo =
          i.vehicles?.plate || i.trailers?.plate || "Sem Placa";
          
        let nfs = [];
        try {
          if (i.resolution_nfs) {
            nfs = typeof i.resolution_nfs === 'string' ? JSON.parse(i.resolution_nfs) : i.resolution_nfs;
          } else if (i.resolution_nf) {
            nfs = typeof i.resolution_nf === 'string' ? JSON.parse(i.resolution_nf) : i.resolution_nf;
          }
        } catch (e) {
          console.error("Error parsing NFs in report", e);
        }
        
        if (!Array.isArray(nfs)) nfs = [];

        nfs.forEach((nf: any) => {
          const items = Array.isArray(nf.items) ? nf.items : [];
          items.forEach((item: any, idx: number) => {
            combinedPurchases.push({
              id: \`issue-\${i.id}-\${nf.nf_number || "sn"}-\${item.name || idx}\`,
`;

content = content.replace(
  /\/\/ 2\. Fetch from checklist_issues[\s\S]*?id: `issue-\$\{i\.id\}-\$\{nf\.nf_number\}-\$\{item\.name\}`\,/m,
  fetchIssuesReplacement
);

fs.writeFileSync('src/modules/company/components/ReportsTab.tsx', content);
console.log("Updated purchases logic.");
