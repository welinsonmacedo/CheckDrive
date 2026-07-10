const fs = require('fs');

const files = [
  'src/modules/company/components/ReportsTab.tsx',
  'src/components/admin/ReportsTab.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(
      'const [schedulesData, setSchedulesData] = useState<any[]>([]);',
      'const [schedulesData, setSchedulesData] = useState<any[]>([]);\n  const [schedulesSearchTerm, setSchedulesSearchTerm] = useState("");'
    );
    fs.writeFileSync(file, content);
  }
}
console.log("States added.");
