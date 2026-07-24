import fs from 'fs';
const file = 'src/modules/company/components/VehicleDetailsModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `      // Fetch Submissions`;
const replacementStr = `      // Fetch Alerts
      const { data: alertsData } = await supabase
        .from("auto_alerts")
        .select("*")
        .eq("company_id", user?.company_id)
        .eq("target_type", "vehicle")
        .eq("target_vehicle_id", vehicle.id)
        .order("created_at", { ascending: false });
      
      setAlerts(alertsData || []);

      // Fetch Submissions`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(file, content);
  console.log("Successfully patched fetch.");
} else {
  console.log("Could not find target string.");
}
