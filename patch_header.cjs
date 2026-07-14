const fs = require('fs');
let content = fs.readFileSync('src/modules/company/components/ChecklistSetupTab.tsx', 'utf8');

content = content.replace(/<div className="xl:col-span-8 bento-card !p-0 order-2 xl:order-1">[\s\S]*?<table className="w-full text-left">/, 
`        <div className="xl:col-span-12 bento-card !p-0 order-2 xl:order-1">
          <div className="p-5 border-b border-app-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Itens do Checklist
            </span>
            <button
              onClick={() => {
                setItemForm({ title: '', is_trailer_item: false, selectedTypes: [], appears_in_manual: false, input_type: 'boolean', is_required: true, mask: 'none', is_fuel_liters: false, options: [], newOption: '' });
                setEditingItemIds([]);
                setShowForm(true);
              }}
              className="px-4 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-sm"
            >
              <Plus size={14} /> Novo Item
            </button>
          </div>
          <div className="overflow-x-auto"> 
            <table className="w-full text-left">`);

fs.writeFileSync('src/modules/company/components/ChecklistSetupTab.tsx', content);
