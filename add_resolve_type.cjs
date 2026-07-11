const fs = require('fs');
let file = 'src/modules/company/components/MaintenanceTab.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'const [resolveNotes, setResolveNotes] = useState("");',
  'const [resolveNotes, setResolveNotes] = useState("");\n  const [resolveType, setResolveType] = useState<"preventiva" | "corretiva" | "">("");'
);

fs.writeFileSync(file, content);
console.log('Added state');
