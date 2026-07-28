const fs = require('fs');
let code = fs.readFileSync('src/modules/company/components/InfractionsTab.tsx', 'utf8');

const toggleBtnDesktop = `
                            <button onClick={() => handleToggleStatus(inf)} className={\`p-2 rounded-lg transition-colors \${inf.status === 'paid' ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-500 hover:bg-emerald-50'}\`} title={inf.status === 'paid' ? 'Marcar como Pendente' : 'Marcar como Resolvida'}>
                              {inf.status === 'paid' ? <XCircle size={18} /> : <CheckCircle size={18} />}
                            </button>
`;

code = code.replace(
  /<button\n\s*onClick=\{\(\) => setPrintInfraction\(inf\)\}/,
  toggleBtnDesktop + '                            <button\n                              onClick={() => setPrintInfraction(inf)}'
);

fs.writeFileSync('src/modules/company/components/InfractionsTab.tsx', code);
