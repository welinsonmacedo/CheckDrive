const fs = require('fs');
const file = 'src/modules/company/components/SchedulesTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `      const { data: conflicts, error: conflictError } = await supabase
        .from("schedules")
        .select("id")
        .eq("company_id", user?.company_id || user?.id)
        .or(orConditions.join(","))
        .lt("start_at", dataToInsert.end_at)
        .gt("end_at", dataToInsert.start_at);`;

const replacement = `      const { data: conflicts, error: conflictError } = await supabase
        .from("schedules")
        .select("id")
        .eq("company_id", user?.company_id || user?.id)
        .is("end_checklist_id", null)
        .or(orConditions.join(","))
        .lt("start_at", dataToInsert.end_at)
        .gt("end_at", dataToInsert.start_at);`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content);
  console.log("Patched successfully");
} else {
  console.log("Target not found");
}
