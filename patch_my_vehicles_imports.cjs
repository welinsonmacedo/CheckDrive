const fs = require('fs');
const file = 'src/modules/driver/pages/MyVehicles.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/import \{ CheckCircle2, Search, X, Eye, Plus, ChevronLeft, ChevronRight, Edit2 \} from "lucide-react";/, 'import { CheckCircle2, Search, Eye, ChevronLeft, ChevronRight } from "lucide-react";');

fs.writeFileSync(file, code);
