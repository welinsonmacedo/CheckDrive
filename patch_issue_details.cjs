const fs = require('fs');
const file = 'src/modules/company/components/IssueDetailsModal.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = `                  {(issue.resolution_nfs || issue.resolution_nf) && (
                    <div className="pt-6 mt-6 border-t border-zinc-100 print:border-zinc-900">
                      <span className="text-xs text-zinc-900 uppercase font-black tracking-widest block mb-4 flex items-center gap-2">
                        <Receipt size={16} /> Custos e Comprovantes
                      </span>
                      
                      {parsedNfs.length > 0 ? (
                        <div className="space-y-4">
                          {parsedNfs.map((nf: any, idx: number) => {
                            const nfSum = nf.items?.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 1) * (Number(item.unit_price) || 0), 0) || 0;
                            return (
                              <div key={idx} className="bg-white border-2 border-zinc-100 rounded-xl overflow-hidden print:border-zinc-300">
                                <div className="bg-zinc-50 px-4 py-3 border-b border-zinc-100 flex justify-between items-center print:bg-white print:border-zinc-300">
                                  <div className="flex items-center gap-2 font-black text-zinc-900">
                                    <Receipt size={14} className="text-zinc-400" />
                                    <span>NF: {nf.nf_number || "S/N"}</span>
                                  </div>`;

const replacement = `                  {(issue.resolution_nfs || issue.resolution_nf) && (
                    <div className="pt-6 mt-6 border-t border-zinc-100 print:border-zinc-900">
                      <span className="text-xs text-zinc-900 uppercase font-black tracking-widest block mb-4 flex items-center gap-2">
                        <Receipt size={16} /> Custos e Comprovantes
                      </span>
                      
                      {parsedNfs.length > 0 ? (
                        <div className="space-y-4">
                          {parsedNfs.map((nf: any, idx: number) => {
                            const isStock = nf.is_stock || (nf.nf_number || "").includes("Estoque");
                            const nfSum = nf.items?.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 1) * (Number(item.unit_price) || 0), 0) || 0;
                            return (
                              <div key={idx} className={\`bg-white border-2 \${isStock ? 'border-blue-100' : 'border-zinc-100'} rounded-xl overflow-hidden print:border-zinc-300\`}>
                                <div className={\`\${isStock ? 'bg-blue-50/50' : 'bg-zinc-50'} px-4 py-3 border-b \${isStock ? 'border-blue-100' : 'border-zinc-100'} flex justify-between items-center print:bg-white print:border-zinc-300\`}>
                                  <div className={\`flex items-center gap-2 font-black \${isStock ? 'text-blue-900' : 'text-zinc-900'}\`}>
                                    {isStock ? <Package size={14} className="text-blue-500" /> : <Receipt size={14} className="text-zinc-400" />}
                                    <span>{isStock ? "Peças do Estoque" : \`NF: \${nf.nf_number || "S/N"}\`}</span>
                                  </div>`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  // Also add import for Package if not there
  if (!code.includes("Package")) {
    code = code.replace(/import {([^}]+)} from "lucide-react";/, 'import { $1, Package } from "lucide-react";');
  }
  fs.writeFileSync(file, code);
  console.log('patched issue details');
} else {
  console.log('target not found');
}
