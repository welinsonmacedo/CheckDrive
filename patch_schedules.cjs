const fs = require('fs');
let content = fs.readFileSync('src/modules/company/components/SchedulesTab.tsx', 'utf8');

content = content.replace(
  'import { Search, MessageCircle, RefreshCw } from "lucide-react";',
  'import { Search, MessageCircle, RefreshCw, Plus, X } from "lucide-react";'
);

content = content.replace(
  'const [filterDate, setFilterDate] = useState(',
  'const [isFormOpen, setIsFormOpen] = useState(false);\n  const [filterDate, setFilterDate] = useState('
);

content = content.replace(
  'const handleEdit = (sch: any) => {\n    setScheduleForm(',
  'const handleEdit = (sch: any) => {\n    setIsFormOpen(true);\n    setScheduleForm('
);

content = content.replace(
  'fetchData();\n    } catch (error: any) {',
  'setIsFormOpen(false);\n      fetchData();\n    } catch (error: any) {'
);

content = content.replace(
  '<div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">',
  '<div className="grid grid-cols-1 gap-6 items-start">'
);

content = content.replace(
  '<div className="xl:col-span-8 bento-card !p-0">',
  '<div className="bento-card !p-0">'
);

// Add the "+ Nova Escala" button
content = content.replace(
  '<RefreshCw size={14} />\n                Vincular APP\n              </button>',
  '<RefreshCw size={14} />\n                Vincular APP\n              </button>\n              <button\n                type="button"\n                onClick={() => { setScheduleForm({ id: "", driver_id: "", vehicle_id: "", trailer_id: "", route_id: "", start_at: "", end_at: "", bait1_id: "", bait2_id: "", bait3_id: "", requires_fueling: true }); setIsFormOpen(true); }}\n                className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors shadow-sm"\n              >\n                <Plus size={14} />\n                Nova Escala\n              </button>'
);

// We need to move the form block to a modal.
// Let's identify the start and end of the form block.
