const fs = require('fs');
const file = 'src/modules/company/components/VehiclesTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// Let's add visual indicators for existing uploads
const replacements = [
  {
    target: `<label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Frontal</label>`,
    replacement: `<div className="flex justify-between items-center"><label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Frontal</label>{itemForm.photo_front_url && <span className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md">Enviado</span>}</div>`
  },
  {
    target: `<label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Lateral Direita</label>`,
    replacement: `<div className="flex justify-between items-center"><label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Lateral Direita</label>{itemForm.photo_right_url && <span className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md">Enviado</span>}</div>`
  },
  {
    target: `<label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Lateral Esquerda</label>`,
    replacement: `<div className="flex justify-between items-center"><label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Lateral Esquerda</label>{itemForm.photo_left_url && <span className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md">Enviado</span>}</div>`
  },
  {
    target: `<label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Traseira</label>`,
    replacement: `<div className="flex justify-between items-center"><label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Traseira</label>{itemForm.photo_rear_url && <span className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md">Enviado</span>}</div>`
  },
  {
    target: `<label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Documento CRLV</label>`,
    replacement: `<div className="flex justify-between items-center"><label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Documento CRLV</label>{itemForm.doc_crlv_url && <span className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md">Enviado</span>}</div>`
  },
  {
    target: `<label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Documento ANTT</label>`,
    replacement: `<div className="flex justify-between items-center"><label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Documento ANTT</label>{itemForm.doc_antt_url && <span className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md">Enviado</span>}</div>`
  },
  {
    target: `<label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Apólice Seguro</label>`,
    replacement: `<div className="flex justify-between items-center"><label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Apólice Seguro</label>{itemForm.doc_insurance_url && <span className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md">Enviado</span>}</div>`
  }
];

let replaced = 0;
for (const r of replacements) {
  if (content.includes(r.target)) {
    content = content.replace(r.target, r.replacement);
    replaced++;
  } else {
    console.log("Could not find:", r.target);
  }
}

fs.writeFileSync(file, content);
console.log("Patched " + replaced + " items in VehiclesTab.tsx");
