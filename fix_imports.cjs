const fs = require('fs');
let code = fs.readFileSync('src/modules/company/components/InfractionsTab.tsx', 'utf8');

code = code.replace(
  /} from "lucide-react";/,
  '  CheckCircle,\n  XCircle,\n} from "lucide-react";'
);

fs.writeFileSync('src/modules/company/components/InfractionsTab.tsx', code);
