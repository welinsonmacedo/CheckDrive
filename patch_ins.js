import fs from 'fs';
const file = 'src/modules/company/components/VehicleDetailsModal.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetState = `  const [insuranceName, setInsuranceName] = useState<string | null>(null);`;
const replaceState = `  const [insurance, setInsurance] = useState<any>(null);`;

const targetFetch = `      // Fetch Insurance Name
      if (vehicle.insurance_id) {
        const { data: insData } = await supabase.from("insurances").select("name").eq("id", vehicle.insurance_id).single();
        if (insData) {
          setInsuranceName(insData.name);
        }
      }`;
const replaceFetch = `      // Fetch Insurance Details
      if (vehicle.insurance_id) {
        const { data: insData } = await supabase.from("insurances").select("*").eq("id", vehicle.insurance_id).single();
        if (insData) {
          setInsurance(insData);
        }
      }`;

if (content.includes(targetState) && content.includes(targetFetch)) {
  content = content.replace(targetState, replaceState);
  content = content.replace(targetFetch, replaceFetch);
  fs.writeFileSync(file, content);
  console.log("Successfully patched insurance state and fetch.");
} else {
  console.log("Could not find target strings.");
}
