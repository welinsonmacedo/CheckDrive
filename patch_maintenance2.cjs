const fs = require('fs');
const file = 'src/modules/company/components/MaintenanceTab.tsx';
let code = fs.readFileSync(file, 'utf8');

const target1 = `            const { data: profile } = await supabase.from("profiles").select("company_id").eq("company_id", (user as any)?.company_id)
              .eq("id", user?.id)
              .single();`;

const replacement1 = `            const { data: profile } = await supabase.from("profiles").select("company_id")
              .eq("id", user?.id)
              .single();`;

const target2 = `              const { data: currentItemData } = await supabase.from("inventory_items").select("current_quantity").eq("company_id", (user as any)?.company_id)
                .eq("id", item.item_id)
                .single();`;

const replacement2 = `              const { data: currentItemData } = await supabase.from("inventory_items").select("current_quantity")
                .eq("id", item.item_id)
                .single();`;

if (code.includes(target1) && code.includes(target2)) {
  code = code.replace(target1, replacement1);
  code = code.replace(target2, replacement2);
  fs.writeFileSync(file, code);
  console.log('patched maintenance bugs');
} else {
  console.log('targets not found');
}
