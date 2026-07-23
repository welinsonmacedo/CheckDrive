const fs = require('fs');
const file = 'src/modules/company/components/SchedulesTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const target1 = `      // Conflict validation: Check for overlapping schedules for the same driver, vehicle, or trailer
      const orConditions = [
        \`driver_id.eq.\${dataToInsert.driver_id}\`
      ];
      if (dataToInsert.vehicle_id) {
        orConditions.push(\`vehicle_id.eq.\${dataToInsert.vehicle_id}\`);
      }
      if (dataToInsert.trailer_id) {
        orConditions.push(\`trailer_id.eq.\${dataToInsert.trailer_id}\`);
      }

      const { data: conflicts, error: conflictError } = await supabase
        .from("schedules")
        .select("id")
        .eq("company_id", user?.company_id || user?.id)
        .is("end_checklist_id", null)
        .or(orConditions.join(","))
        .lt("start_at", dataToInsert.end_at)
        .gt("end_at", dataToInsert.start_at);`;

const replacement1 = `      // Conflict validation: Check for overlapping schedules for the EXACT SAME driver AND vehicle
      let conflictQuery = supabase
        .from("schedules")
        .select("id")
        .eq("company_id", user?.company_id || user?.id)
        .is("end_checklist_id", null)
        .eq("driver_id", dataToInsert.driver_id)
        .eq("vehicle_id", dataToInsert.vehicle_id)
        .lt("start_at", dataToInsert.end_at)
        .gt("end_at", dataToInsert.start_at);

      if (dataToInsert.trailer_id) {
        conflictQuery = conflictQuery.eq("trailer_id", dataToInsert.trailer_id);
      }

      const { data: conflicts, error: conflictError } = await conflictQuery;`;

const target2 = `alert("Conflito de escala! Já existe uma escala agendada para este motorista, veículo ou carreta neste intervalo de horário.");`;
const replacement2 = `alert("Conflito de escala! Já existe uma escala agendada para este mesmo motorista e veículo neste intervalo de horário.");`;

if (content.includes(target1)) {
  content = content.replace(target1, replacement1);
  content = content.replace(target2, replacement2);
  fs.writeFileSync(file, content);
  console.log("Patched successfully");
} else {
  console.log("Target not found");
}
