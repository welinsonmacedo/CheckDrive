const fs = require('fs');

let content = fs.readFileSync('src/modules/company/components/ReportsTab.tsx', 'utf8');

// 1. Update activeReport type
content = content.replace(
  '"defects" | "mileage" | "history" | "purchases" | "schedules"',
  '"defects" | "pending_by_plate" | "mileage" | "history" | "purchases" | "schedules"'
);

// 2. Add pendingByPlateData state
content = content.replace(
  'const [defectsData, setDefectsData] = useState<any[]>([]);',
  'const [defectsData, setDefectsData] = useState<any[]>([]);\n  const [pendingByPlateData, setPendingByPlateData] = useState<any[]>([]);\n  const [pendingByPlateSearchTerm, setPendingByPlateSearchTerm] = useState("");'
);

fs.writeFileSync('src/modules/company/components/ReportsTab.tsx', content);
console.log("Updated state declarations.");
