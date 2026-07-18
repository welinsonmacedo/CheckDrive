const fs = require('fs');
const file = 'src/modules/company/pages/AdminDashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

// Add Menu to lucide-react imports if not there
if (!code.includes('Menu,')) {
    code = code.replace(/import \{/, 'import { Menu,');
}

// Add state for mobile menu
code = code.replace(
  'const [notifCount, setNotifCount] = useState(0);',
  'const [notifCount, setNotifCount] = useState(0);\n  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);'
);

// Close menu on tab click
code = code.replace(
  /const setActiveTab = \(tab: string\) => \{/,
  'const setActiveTab = (tab: string) => {\n    setIsMobileMenuOpen(false);'
);

// Add mobile header and modify sidebar classes
const targetRenderStart = `<div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50 print:h-auto print:overflow-visible flex-col md:flex-row relative">
      {/* Spacer for sidebar to avoid layout shift */}
      <div className="hidden md:block w-20 flex-shrink-0" />`;

const replacementRenderStart = `<div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50 print:h-auto print:overflow-visible flex-col md:flex-row relative">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200 z-40 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
            {companyData?.name?.charAt(0) || 'C'}
          </div>
          <span className="font-bold text-gray-900 truncate max-w-[200px]">{companyData?.name || 'Painel'}</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Spacer for sidebar to avoid layout shift */}
      <div className="hidden md:block w-20 flex-shrink-0" />`;

code = code.replace(targetRenderStart, replacementRenderStart);

// Update aside classes
const targetAside = `<aside className="group w-full md:absolute md:left-0 md:top-0 md:bottom-0 md:w-20 md:hover:w-72 flex-shrink-0 bg-white/95 backdrop-blur-xl border-r border-gray-200/50 shadow-2xl flex flex-col print:hidden transition-[width] duration-300 z-50 overflow-x-hidden overflow-y-auto md:overflow-y-hidden">`;

const replacementAside = `<aside className={\`group absolute md:absolute top-[73px] md:top-0 left-0 bottom-0 md:w-20 md:hover:w-72 flex-shrink-0 bg-white/95 backdrop-blur-xl border-r border-gray-200/50 shadow-2xl flex flex-col print:hidden transition-all duration-300 z-50 overflow-x-hidden overflow-y-auto md:overflow-y-hidden \${isMobileMenuOpen ? 'w-full translate-x-0' : 'w-full -translate-x-full md:translate-x-0'}\`}>`;

code = code.replace(targetAside, replacementAside);

fs.writeFileSync(file, code);
