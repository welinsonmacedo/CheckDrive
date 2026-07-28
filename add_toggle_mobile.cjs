const fs = require('fs');
let code = fs.readFileSync('src/modules/company/components/InfractionsTab.tsx', 'utf8');

const toggleBtnMobile = `
                      <button onClick={() => handleToggleStatus(inf)} className={\`p-2 rounded-lg \${inf.status === 'paid' ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-500 hover:bg-emerald-50'}\`} title={inf.status === 'paid' ? 'Marcar como Pendente' : 'Marcar como Resolvida'}>
                        {inf.status === 'paid' ? <XCircle size={18} /> : <CheckCircle size={18} />}
                      </button>
`;

code = code.replace(
  /<button onClick=\{\(\) => setPrintInfraction\(inf\)\} className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg" title="Imprimir Recibo">/,
  toggleBtnMobile + '                      <button onClick={() => setPrintInfraction(inf)} className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg" title="Imprimir Recibo">'
);

fs.writeFileSync('src/modules/company/components/InfractionsTab.tsx', code);
