import React, { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";
import { Package, Truck, FileText, Plus, Search, Edit2, Trash2, X, Check, FileCheck, Layers } from "lucide-react";
import { SupplierModal } from "../../../components/admin/SupplierModal";

export default function InventoryTab() {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<"items" | "suppliers" | "nfs">("items");
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Data states
  const [items, setItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showNfModal, setShowNfModal] = useState(false);

  // Forms
  const [itemForm, setItemForm] = useState({ id: "", sku: "", name: "", category: "", min_quantity: 0, current_quantity: 0 });
  const [supplierForm, setSupplierForm] = useState({ id: "", name: "", cnpj_cpf: "", contact_name: "", phone: "", email: "" });
  const [nfForm, setNfForm] = useState({ id: "", nf_number: "", nf_key: "", supplier_id: "", date: "", notes: "", items: [{ item_id: "", quantity: 1, unit_price: 0 as any }] });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setSqlError(null);
    try {
      // Intentionally request from a table that might not exist to catch error
      const { error: checkErr } = await supabase.from("inventory_items").select("id").limit(1);
      
      if (checkErr && checkErr.message.includes('does not exist')) {
        setSqlError("missing_tables");
        setLoading(false);
        return;
      }

      const [itemsRes, suppliersRes, transRes] = await Promise.all([
        supabase.from("inventory_items").select("*").order("name"),
        supabase.from("inventory_suppliers").select("*").order("name"),
        supabase.from("inventory_transactions").select(`*, inventory_items(name), inventory_suppliers(name)`).order("created_at", { ascending: false })
      ]);

      if (itemsRes.error) throw itemsRes.error;
      if (suppliersRes.error) throw suppliersRes.error;
      if (transRes.error) throw transRes.error;

      setItems(itemsRes.data || []);
      setSuppliers(suppliersRes.data || []);
      setTransactions(transRes.data || []);
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("does not exist")) setSqlError("missing_tables");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async () => {
    try {
      const payload = {
        name: itemForm.name,
        sku: itemForm.sku,
        category: itemForm.category,
        min_quantity: Number(itemForm.min_quantity),
        current_quantity: Number(itemForm.current_quantity)
      };

      if (itemForm.id) {
        await supabase.from("inventory_items").update(payload).eq("id", itemForm.id);
      } else {
        await supabase.from("inventory_items").insert(payload);
      }
      setShowItemModal(false);
      fetchData();
    } catch (e) {
      alert("Erro ao salvar produto");
    }
  };

  const handleSaveSupplier = async () => {
    try {
      const payload = {
        name: supplierForm.name,
        cnpj_cpf: supplierForm.cnpj_cpf,
        contact_name: supplierForm.contact_name,
        phone: supplierForm.phone,
        email: supplierForm.email
      };

      if (supplierForm.id) {
        await supabase.from("inventory_suppliers").update(payload).eq("id", supplierForm.id);
      } else {
        await supabase.from("inventory_suppliers").insert(payload);
      }
      setShowSupplierModal(false);
      fetchData();
    } catch (e) {
      alert("Erro ao salvar fornecedor");
    }
  };

  const handleSaveNf = async () => {
    try {
      // Entradas (Inbound) logic
      for (const it of nfForm.items) {
        if (!it.item_id) continue;
        const total = Number(it.quantity) * Number(it.unit_price);
        // Insert transaction
        await supabase.from("inventory_transactions").insert({
          item_id: it.item_id,
          supplier_id: nfForm.supplier_id || null,
          type: "in",
          quantity: it.quantity,
          unit_price: it.unit_price,
          total_price: total,
          nf_number: nfForm.nf_number,
          nf_key: nfForm.nf_key,
          date: nfForm.date || new Date().toISOString(),
          notes: nfForm.notes,
          created_by: user?.id
        });

        // Update item stock
        const targetItem = items.find(i => i.id === it.item_id);
        if (targetItem) {
          const newQty = Number(targetItem.current_quantity) + Number(it.quantity);
          // calculate average cost
          const oldTotalValue = Number(targetItem.current_quantity) * Number(targetItem.average_cost || 0);
          const newAvgCost = (oldTotalValue + total) / newQty;
          
          await supabase.from("inventory_items").update({ 
            current_quantity: newQty,
            average_cost: newAvgCost
          }).eq("id", it.item_id);
        }
      }
      setShowNfModal(false);
      fetchData();
    } catch (e) {
      alert("Erro ao salvar NF");
    }
  };

  if (sqlError) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-white">
        <div className="p-8 space-y-6">
          <div className="text-center p-8 bg-zinc-50 border border-zinc-200 rounded-2xl max-w-2xl mx-auto">
            <Package className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-zinc-800 mb-2">Estrutura de Estoque Não Encontrada</h3>
            <p className="text-sm text-zinc-500 mb-6 px-4">
              Para habilitar o módulo de <strong>Estoque (Produtos, Fornecedores e Notas Fiscais)</strong>, execute o script SQL abaixo no seu painel do Supabase (SQL Editor).
            </p>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-left font-mono text-xs text-zinc-300 overflow-x-auto">
              <pre>{`CREATE TABLE IF NOT EXISTS public.inventory_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cnpj_cpf TEXT,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  company_id UUID REFERENCES public.companies(id)
);

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT,
  name TEXT NOT NULL,
  category TEXT,
  brand TEXT,
  min_quantity NUMERIC DEFAULT 0,
  current_quantity NUMERIC DEFAULT 0,
  average_cost NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  company_id UUID REFERENCES public.companies(id)
);

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.inventory_suppliers(id),
  type TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC,
  total_price NUMERIC,
  nf_number TEXT,
  nf_key TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  company_id UUID REFERENCES public.companies(id)
);`}</pre>
            </div>
            <button
              onClick={fetchData}
              className="mt-6 px-6 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark"
            >
              Já executei o script
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-zinc-200">
        <div className="px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
                <Layers className="w-6 h-6 text-primary" />
                Estoque
              </h1>
              <p className="text-sm text-zinc-500 font-medium">Gestão de peças, produtos, NFs e fornecedores</p>
            </div>
          </div>
        </div>
        <div className="flex px-6 space-x-1 mt-1">
          <button
            onClick={() => setActiveSubTab("items")}
            className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${
              activeSubTab === "items" ? "bg-zinc-100 text-zinc-900 border-b-2 border-primary" : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 border-b-2 border-transparent"
            }`}
          >
            Itens / Produtos
          </button>
          <button
            onClick={() => setActiveSubTab("suppliers")}
            className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${
              activeSubTab === "suppliers" ? "bg-zinc-100 text-zinc-900 border-b-2 border-primary" : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 border-b-2 border-transparent"
            }`}
          >
            Fornecedores
          </button>
          <button
            onClick={() => setActiveSubTab("nfs")}
            className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors ${
              activeSubTab === "nfs" ? "bg-zinc-100 text-zinc-900 border-b-2 border-primary" : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50 border-b-2 border-transparent"
            }`}
          >
            Entradas (NF)
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-zinc-50 p-6">
        {activeSubTab === "items" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-zinc-800">Catálogo de Produtos</h2>
              <button
                onClick={() => {
                  setItemForm({ id: "", sku: "", name: "", category: "", min_quantity: 0, current_quantity: 0 });
                  setShowItemModal(true);
                }}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary-dark cursor-pointer"
              >
                <Plus size={16} /> Novo Item
              </button>
            </div>
            <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-xs font-black text-zinc-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Produto</th>
                    <th className="px-6 py-3">Código/SKU</th>
                    <th className="px-6 py-3">Categoria</th>
                    <th className="px-6 py-3">Estoque</th>
                    <th className="px-6 py-3 text-right">Custo Médio</th>
                    <th className="px-6 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {items.map(item => (
                    <tr key={item.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-3 text-sm font-semibold text-zinc-900">{item.name}</td>
                      <td className="px-6 py-3 text-xs text-zinc-500">{item.sku || '-'}</td>
                      <td className="px-6 py-3 text-xs text-zinc-500">{item.category || '-'}</td>
                      <td className="px-6 py-3 text-sm font-bold text-zinc-900">
                        {item.current_quantity}{' '}
                        {item.current_quantity <= item.min_quantity && (
                          <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold ml-2">BAIXO</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm text-zinc-700 text-right">R$ {(Number(item.average_cost) || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                      <td className="px-6 py-3">
                        <button
                          onClick={() => {
                            setItemForm(item);
                            setShowItemModal(true);
                          }}
                          className="text-zinc-400 hover:text-primary transition-colors cursor-pointer"
                        >
                          <Edit2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-6 text-center text-zinc-500 text-sm">Nenhum produto cadastrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSubTab === "suppliers" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-zinc-800">Fornecedores</h2>
              <button
                onClick={() => {
                  setSupplierForm({ id: "", name: "", cnpj_cpf: "", contact_name: "", phone: "", email: "" });
                  setShowSupplierModal(true);
                }}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary-dark cursor-pointer"
              >
                <Plus size={16} /> Novo Fornecedor
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {suppliers.map(sup => (
                <div key={sup.id} className="bg-white border border-zinc-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-extrabold text-zinc-900 truncate pr-2">{sup.name}</h3>
                    <button
                      onClick={() => {
                        setSupplierForm(sup);
                        setShowSupplierModal(true);
                      }}
                      className="text-zinc-400 hover:text-primary shrink-0 cursor-pointer"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                  <div className="space-y-1.5 text-xs text-zinc-600 font-medium">
                    <p>CNPJ: <span className="text-zinc-900">{sup.cnpj_cpf || '-'}</span></p>
                    <p>Contato: <span className="text-zinc-900">{sup.contact_name || '-'}</span></p>
                    <p>Tel: <span className="text-zinc-900">{sup.phone || '-'}</span></p>
                    <p>Email: <span className="text-zinc-900">{sup.email || '-'}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSubTab === "nfs" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-zinc-800">Registro de Entradas (NFs)</h2>
              <button
                onClick={() => {
                  setNfForm({ id: "", nf_number: "", nf_key: "", supplier_id: "", date: "", notes: "", items: [{ item_id: "", quantity: 1, unit_price: 0 }] });
                  setShowNfModal(true);
                }}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary-dark cursor-pointer"
              >
                <Plus size={16} /> Lançar Entrada
              </button>
            </div>
            <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-xs font-black text-zinc-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Data/Hora</th>
                    <th className="px-6 py-3">Item</th>
                    <th className="px-6 py-3">Fornecedor</th>
                    <th className="px-6 py-3 text-right">Qtd.</th>
                    <th className="px-6 py-3 text-right">Preço Unit.</th>
                    <th className="px-6 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {transactions.map(t => (
                    <tr key={t.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-3 text-xs font-medium text-zinc-600">{new Date(t.created_at).toLocaleString('pt-BR')}</td>
                      <td className="px-6 py-3 text-sm font-bold text-zinc-900">{t.inventory_items?.name || '-'}</td>
                      <td className="px-6 py-3 text-xs text-zinc-600">{t.inventory_suppliers?.name || t.nf_number || '-'}</td>
                      <td className="px-6 py-3 text-sm font-bold text-green-600 text-right">+{t.quantity}</td>
                      <td className="px-6 py-3 text-sm text-zinc-700 text-right">R$ {(Number(t.unit_price) || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                      <td className="px-6 py-3 text-sm font-bold text-zinc-900 text-right">R$ {(Number(t.total_price) || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-6 text-center text-zinc-500 text-sm">Nenhuma entrada registrada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-zinc-200 flex justify-between items-center">
              <h3 className="font-bold text-lg text-zinc-800">{itemForm.id ? "Editar Produto" : "Novo Produto"}</h3>
              <button onClick={() => setShowItemModal(false)} className="text-zinc-500 hover:text-zinc-800 cursor-pointer"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Nome do Produto *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary font-semibold"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({...itemForm, name: e.target.value})}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Código / SKU</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    value={itemForm.sku}
                    onChange={(e) => setItemForm({...itemForm, sku: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Categoria</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    value={itemForm.category}
                    onChange={(e) => setItemForm({...itemForm, category: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Estoque Mínimo</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    value={itemForm.min_quantity}
                    onChange={(e) => setItemForm({...itemForm, min_quantity: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Estoque Atual</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    value={itemForm.current_quantity}
                    onChange={(e) => setItemForm({...itemForm, current_quantity: Number(e.target.value)})}
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-zinc-200 flex justify-end gap-2 bg-zinc-50">
              <button onClick={() => setShowItemModal(false)} className="px-4 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-200 rounded-lg cursor-pointer">Cancelar</button>
              <button onClick={handleSaveItem} disabled={!itemForm.name} className="px-4 py-2 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 cursor-pointer">Salvar</button>
            </div>
          </div>
        </div>
      )}

      <SupplierModal 
        show={showSupplierModal} 
        onClose={() => setShowSupplierModal(false)}
        onSaved={() => {
          setShowSupplierModal(false);
          fetchData();
        }}
        supplierToEdit={supplierForm.id ? supplierForm : null}
      />

      {/* NF Modal */}
      {showNfModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-zinc-200 flex justify-between items-center">
              <h3 className="font-bold text-lg text-zinc-800">Lançar Entrada (NF)</h3>
              <button onClick={() => setShowNfModal(false)} className="text-zinc-500 hover:text-zinc-800 cursor-pointer"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Header NF */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Fornecedor</label>
                  <select
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    value={nfForm.supplier_id}
                    onChange={(e) => setNfForm({...nfForm, supplier_id: e.target.value})}
                  >
                    <option value="">-- Selecione (Opcional) --</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Número NF</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                    value={nfForm.nf_number}
                    onChange={(e) => setNfForm({...nfForm, nf_number: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Chave de Acesso (NF-e)</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary focus:border-primary"
                    value={nfForm.nf_key}
                    onChange={(e) => setNfForm({...nfForm, nf_key: e.target.value.replace(/\D/g, '').slice(0,44)})}
                    placeholder="44 dígitos"
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-black text-zinc-700 uppercase">Itens da Nota</label>
                </div>
                <div className="space-y-3">
                  {nfForm.items.map((it, idx) => (
                    <div key={idx} className="flex flex-wrap sm:flex-nowrap gap-2 items-end bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase">Produto</label>
                        <select
                          className="w-full px-2 py-1.5 border border-zinc-300 rounded-md text-sm font-medium focus:ring-primary"
                          value={it.item_id}
                          onChange={(e) => {
                            const newItems = [...nfForm.items];
                            newItems[idx].item_id = e.target.value;
                            setNfForm({...nfForm, items: newItems});
                          }}
                        >
                          <option value="">-- Selecione --</option>
                          {items.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="w-1/4 min-w-[80px]">
                        <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase">Qtd</label>
                        <input
                          type="number"
                          className="w-full px-2 py-1.5 border border-zinc-300 rounded-md text-sm text-center font-bold focus:ring-primary"
                          value={it.quantity}
                          onChange={(e) => {
                            const newItems = [...nfForm.items];
                            newItems[idx].quantity = Number(e.target.value);
                            setNfForm({...nfForm, items: newItems});
                          }}
                        />
                      </div>
                      <div className="w-1/3 min-w-[100px]">
                        <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase">Custo Unit. (R$)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          className="w-full px-2 py-1.5 border border-zinc-300 rounded-md text-sm text-right focus:ring-primary"
                          value={it.unit_price || ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(',', '.');
                            if (val === '' || !isNaN(Number(val))) {
                              const newItems = [...nfForm.items];
                              newItems[idx].unit_price = val;
                              setNfForm({...nfForm, items: newItems});
                            }
                          }}
                        />
                      </div>
                      {nfForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = nfForm.items.filter((_, i) => i !== idx);
                            setNfForm({...nfForm, items: newItems});
                          }}
                          className="p-1.5 text-zinc-400 hover:text-red-500 rounded bg-white border border-zinc-200 shrink-0 mb-px cursor-pointer"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setNfForm({...nfForm, items: [...nfForm.items, { item_id: "", quantity: 1, unit_price: 0 }]});
                    }}
                    className="text-xs font-bold text-primary hover:underline cursor-pointer"
                  >
                    + Adicionar outro produto
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-zinc-200 flex justify-between items-center gap-4 bg-zinc-50">
              <div className="text-sm font-black text-zinc-800">
                Total: R$ {nfForm.items.reduce((acc, it) => acc + (Number(it.quantity || 0) * Number(it.unit_price || 0)), 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowNfModal(false)} className="px-4 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-200 rounded-lg cursor-pointer">Cancelar</button>
                <button 
                  onClick={handleSaveNf} 
                  disabled={!nfForm.items[0]?.item_id} 
                  className="px-4 py-2 text-sm font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 cursor-pointer"
                >
                  <Check className="inline-block w-4 h-4 mr-1" />
                  Efetivar Entrada
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
