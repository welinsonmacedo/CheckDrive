const fs = require('fs');
let code = fs.readFileSync('src/modules/company/components/MaintenanceTab.tsx', 'utf8');

code = code.replace(
  /const vehicleIds = \[/,
  'const { data: checklistItemsResData } = await supabase.from("checklist_items").select("title, priority").order("order_index");\n      const vehicleIds = ['
);

code = code.replace(
  /const checklistItem = checklistItemsRes\?\.data\?\.find/,
  'const checklistItem = checklistItemsResData?.find'
);

fs.writeFileSync('src/modules/company/components/MaintenanceTab.tsx', code);
