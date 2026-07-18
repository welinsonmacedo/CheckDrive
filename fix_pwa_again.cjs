const fs = require('fs');
const file = 'src/modules/company/pages/AdminDashboard.tsx';
let code = fs.readFileSync(file, 'utf8');

// Restore the useEffect
const brokenCode = `    ); // 60 minutes

  if (isMobileDevice && !isPwaInstalled) {
    return (
      <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 mb-6 rounded-3xl overflow-hidden shadow-2xl shadow-primary/20">
          <img src="https://phyodfszatjfdfjtzpmm.supabase.co/storage/v1/object/public/Enterprise/logo.jpeg" alt="Logo" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Instale o App</h1>
        <p className="text-slate-500 mb-10 text-sm max-w-[280px] leading-relaxed">
          Para acessar o Painel Admin pelo celular, adicione o aplicativo à sua tela de início.
        </p>
        
        <div className="w-full max-w-sm space-y-6 text-left bg-slate-50 p-6 rounded-3xl border border-slate-100">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0 mt-0.5">1</div>
            <div>
              <p className="font-bold text-slate-700 text-sm">No Safari (iOS)</p>
              <p className="text-xs text-slate-500 mt-1">Toque no ícone de Compartilhar e depois em "Adicionar à Tela de Início".</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold shrink-0 mt-0.5">2</div>
            <div>
              <p className="font-bold text-slate-700 text-sm">No Chrome (Android)</p>
              <p className="text-xs text-slate-500 mt-1">Toque nos 3 pontinhos e depois em "Instalar aplicativo" ou "Adicionar à Tela Inicial".</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return () => clearInterval(intervalId);
  }, [(user as any)?.company_id]);`;

code = code.replace(brokenCode, `    ); // 60 minutes\n    return () => clearInterval(intervalId);\n  }, [(user as any)?.company_id]);`);

// Now properly inject it before the final return
const pwaCode = `
  if (isMobileDevice && !isPwaInstalled) {
    return (
      <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 mb-6 rounded-3xl overflow-hidden shadow-2xl shadow-primary/20">
          <img src="https://phyodfszatjfdfjtzpmm.supabase.co/storage/v1/object/public/Enterprise/logo.jpeg" alt="Logo" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Instale o App</h1>
        <p className="text-slate-500 mb-10 text-sm max-w-[280px] leading-relaxed">
          Para acessar o Painel Admin pelo celular, adicione o aplicativo à sua tela de início.
        </p>
        
        <div className="w-full max-w-sm space-y-6 text-left bg-slate-50 p-6 rounded-3xl border border-slate-100">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0 mt-0.5">1</div>
            <div>
              <p className="font-bold text-slate-700 text-sm">No Safari (iOS)</p>
              <p className="text-xs text-slate-500 mt-1">Toque no ícone de Compartilhar e depois em "Adicionar à Tela de Início".</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold shrink-0 mt-0.5">2</div>
            <div>
              <p className="font-bold text-slate-700 text-sm">No Chrome (Android)</p>
              <p className="text-xs text-slate-500 mt-1">Toque nos 3 pontinhos e depois em "Instalar aplicativo" ou "Adicionar à Tela Inicial".</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (`;

code = code.replace(/  return \(\n    <div className="flex h-screen/, pwaCode + '\n    <div className="flex h-screen');

fs.writeFileSync(file, code);
console.log('Fixed PWA');
