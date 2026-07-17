const fs = require('fs');
const file = 'src/modules/company/components/MaintenanceTab.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = `              const txPayload: any = {
                item_id: item.item_id,
                type: "out",
                quantity: -Math.abs(Number(item.quantity)),
                unit_price: Number(item.unit_price),
                total_price: total,
                notes: \`Estoque utilizado para pendência. \${resolvingIssueData?.item_title || ""}\`,
                created_by: user?.id,
              };`;

const replacement = `              const txPayload: any = {
                item_id: item.item_id,
                type: "out",
                quantity: -Math.abs(Number(item.quantity)),
                unit_price: Number(item.unit_price),
                total_price: total,
                date: new Date().toISOString(),
                notes: \`Estoque utilizado para pendência. \${resolvingIssueData?.item_title || ""}\`,
                created_by: user?.id,
              };`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code);
  console.log('patched date');
} else {
  console.log('target not found');
}
