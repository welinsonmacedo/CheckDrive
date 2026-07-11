const fs = require('fs');
let file = 'src/modules/company/components/MaintenanceTab.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'const [resolveType, setResolveType] = useState<"preventiva" | "corretiva" | "">("");',
  'const [resolveType, setResolveType] = useState<"preventiva" | "corretiva" | "">("");\n  const [resolveStartDate, setResolveStartDate] = useState("");\n  const [resolveEndDate, setResolveEndDate] = useState("");'
);

// Add to open modal initialization
content = content.replace(
  'setResolveType(issue.resolution_type || "");',
  'setResolveType(issue.resolution_type || "");\n    setResolveStartDate(issue.maintenance_start_date ? issue.maintenance_start_date.split("T")[0] : "");\n    setResolveEndDate(issue.maintenance_end_date ? issue.maintenance_end_date.split("T")[0] : "");'
);

// Add to revert modal
content = content.replace(
  'resolution_type: null,',
  'resolution_type: null,\n          maintenance_start_date: null,\n          maintenance_end_date: null,'
);

// Add to payload
content = content.replace(/resolution_type: resolveType \|\| null,/g, 'resolution_type: resolveType || null,\n                maintenance_start_date: resolveStartDate || null,\n                maintenance_end_date: resolveEndDate || null,');

fs.writeFileSync(file, content);
console.log('Added state and payloads');
