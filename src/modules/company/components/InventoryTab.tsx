import React, { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";
import {
  Package,
  Truck,
  FileText,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Check,
  FileCheck,
  Layers,
  Upload,
  Eye,
  MapPin,
  Users,
  Tag,
  Phone,
  Mail,
  ExternalLink,
  Compass,
  Building2,
} from "lucide-react";
import { SupplierModal } from "./SupplierModal";

export default function InventoryTab() {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<"items" | "suppliers" | "nfs">("items");
  const [itemsFilter, setItemsFilter] = useState<"registered" | "in_stock" | "out_of_stock" | "used">("registered");
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Data states
  const [items, setItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showNfModal, setShowNfModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);

  // Forms
  const [itemForm, setItemForm] = useState({ id: "", sku: "", name: "", category: "", min_quantity: 0, current_quantity: 0 });
  const [supplierForm, setSupplierForm] = useState({ id: "", name: "", cnpj_cpf: "", contact_name: "", phone: "", email: "" });
  const [nfForm, setNfForm] = useState({ id: "", nf_number: "", nf_key: "", supplier_id: "", date: "", notes: "", items: [{ item_id: "", quantity: 1, unit_price: 0 as any }] });
  const [checklistItems, setChecklistItems] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setSqlError(null);
    try {
      // Intentionally request from a table that might not exist to catch error
      const { error: checkErr } = await supabase.from("inventory_items").select("id").eq("company_id", user?.company_id).limit(1);
      
      if (checkErr && checkErr.message.includes('does not exist')) {
        setSqlError("missing_tables");
        setLoading(false);
        return;
      }

      const [itemsRes, suppliersRes, transRes] = await Promise.all([
        supabase.from("inventory_items").select("*").eq("company_id", user?.company_id).order("name"),
        supabase.from("inventory_suppliers").select("*").eq("company_id", user?.company_id).order("name"),
        supabase.from("inventory_transactions").select(`*, inventory_items(name), inventory_suppliers(name)`).eq("company_id", user?.company_id).order("created_at", { ascending: false })
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

  
  const handleImportXML = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "text/xml");

        const getNfeField = (tag: string) => xml.getElementsByTagName(tag)[0]?.textContent || "";

        const nf_number = getNfeField("nNF");
        let nf_key = getNfeField("chNFe");
        if (!nf_key) {
           const infNFe = xml.getElementsByTagName("infNFe")[0];
           if (infNFe) {
             const id = infNFe.getAttribute("Id");
             if (id && id.startsWith("NFe")) nf_key = id.substring(3);
           }
        }
        
        const dhEmi = getNfeField("dhEmi");
        let date = "";
        if (dhEmi) {
           date = dhEmi.substring(0, 10);
        }

        const emitNode = xml.getElementsByTagName("emit")[0];
        let supplierCnpj = "";
        let supplierName = "";
        if (emitNode) {
          supplierCnpj = emitNode.getElementsByTagName("CNPJ")[0]?.textContent || "";
          supplierName = emitNode.getElementsByTagName("xNome")[0]?.textContent || "";
        }

        let supplier_id = "";
        if (supplierCnpj) {
          const rawCnpj = supplierCnpj.replace(/\D/g, "");
          const existingSupplier = suppliers.find(s => s.cnpj_cpf.replace(/\D/g, "") === rawCnpj);
          if (existingSupplier) {
             supplier_id = existingSupplier.id;
          } else {
             const { data: newSupp } = await supabase.from('inventory_suppliers').insert({
               company_id: user?.company_id,
               name: supplierName || "Fornecedor (XML)",
               cnpj_cpf: rawCnpj
             }).select().single();
             if (newSupp) {
               supplier_id = newSupp.id;
               setSuppliers(prev => [...prev, newSupp]);
             }
          }
        }

        const detNodes = xml.getElementsByTagName("det");
        const importedItems = [];
        const newItemsList = [];
        
        for (let i = 0; i < detNodes.length; i++) {
           const det = detNodes[i];
           const prod = det.getElementsByTagName("prod")[0];
           if (prod) {
             const cProd = prod.getElementsByTagName("cProd")[0]?.textContent || "";
             const xProd = prod.getElementsByTagName("xProd")[0]?.textContent || "";
             const qCom = parseFloat(prod.getElementsByTagName("qCom")[0]?.textContent || "0");
             const vUnCom = parseFloat(prod.getElementsByTagName("vUnCom")[0]?.textContent || "0");
             
             let item_id = "";
             const existingItem = items.find(it => it.sku === cProd || it.name.toLowerCase() === xProd.toLowerCase()) || newItemsList.find((it: any) => it.sku === cProd || it.name.toLowerCase() === xProd.toLowerCase());
             
             if (existingItem) {
               item_id = existingItem.id;
             } else {
               const { data: newItem } = await supabase.from('inventory_items').insert({
                 company_id: user?.company_id,
                 name: xProd || "Produto Desconhecido",
                 sku: cProd,
                 current_quantity: 0,
                 min_quantity: 0
               }).select().single();
               
               if (newItem) {
                 item_id = newItem.id;
                 newItemsList.push(newItem);
               }
             }
             
             importedItems.push({
                item_id,
                quantity: qCom,
                unit_price: vUnCom,
                _importedName: xProd,
                _importedSku: cProd
             });
           }
        }
        
        if (newItemsList.length > 0) {
          setItems(prev => [...prev, ...newItemsList]);
        }

        setNfForm({
          id: "",
          nf_number,
          nf_key,
          supplier_id,
          date,
          notes: "Importado de XML - Fornecedor: " + supplierName,
          items: importedItems.length > 0 ? importedItems : [{ item_id: "", quantity: 1, unit_price: 0 as any }]
        });
        
        setShowNfModal(true);

      } catch (err) {
        console.error(err);
        alert("Erro ao ler o arquivo XML da NF.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const handleSaveItem = async () => {
    try {
      let company_id = null;
      if (!itemForm.id) {
        const { data: profile } = await supabase.from("profiles").select("company_id").eq("company_id", user?.company_id)
          .eq("id", user?.id)
          .single();
        if (profile) company_id = profile.company_id;
      }

      const payload: any = {
        name: itemForm.name,
        sku: itemForm.sku,
        category: itemForm.category,
        min_quantity: Number(itemForm.min_quantity),
        current_quantity: Number(itemForm.current_quantity)
      };

      if (!itemForm.id && company_id) {
        payload.company_id = company_id;
      }

      if (itemForm.id) {
        const { error } = await supabase.from("inventory_items").update(payload).eq("id", itemForm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("inventory_items").insert(payload);
        if (error) throw error;
      }
      setShowItemModal(false);
      fetchData();
    } catch (e: any) {
      console.error(e);
      alert(`Erro ao salvar produto: ${e.message || 'Desconhecido'}`);
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
      let company_id = null;
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("company_id", user?.company_id)
        .eq("id", user?.id)
        .single();
      if (profile) company_id = profile.company_id;

      // Entradas (Inbound) logic
      for (const it of nfForm.items) {
        if (!it.item_id) continue;
        const total = Number(it.quantity) * Number(it.unit_price);
        
        const txPayload: any = {
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
        };
        if (company_id) txPayload.company_id = company_id;

        // Insert transaction
        const { error: txError } = await supabase.from("inventory_transactions").insert(txPayload);
        if (txError) throw txError;

        // Update item stock
        const targetItem = items.find(i => i.id === it.item_id);
        if (targetItem) {
          const newQty = Number(targetItem.current_quantity) + Number(it.quantity);
          // calculate average cost
          const oldTotalValue = Number(targetItem.current_quantity) * Number(targetItem.average_cost || 0);
          const newAvgCost = (oldTotalValue + total) / newQty;
          
          const { error: updateError } = await supabase.from("inventory_items").update({ 
            current_quantity: newQty,
            average_cost: newAvgCost
          }).eq("id", it.item_id);
          if (updateError) throw updateError;
        }
      }
      setShowNfModal(false);
      fetchData();
    } catch (e: any) {
      console.error(e);
      alert(`Erro ao salvar NF: ${e.message || 'Desconhecido'}`);
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
  cep TEXT,
  address TEXT,
  location TEXT,
  number TEXT,
  bairro TEXT,
  city TEXT,
  state TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  contacts JSONB,
  categories JSONB,
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
);

-- Habilitar RLS e criar políticas
ALTER TABLE public.inventory_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all actions for company users (suppliers)" ON public.inventory_suppliers
  FOR ALL USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow all actions for company users (items)" ON public.inventory_items
  FOR ALL USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Allow all actions for company users (transactions)" ON public.inventory_transactions
  FOR ALL USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
`}</pre>
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
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-bold text-zinc-800">Catálogo de Produtos</h2>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex gap-2 bg-white p-1 rounded-lg border border-zinc-200">
                <button
                  onClick={() => setItemsFilter("registered")}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${itemsFilter === "registered" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"}`}
                >
                  Produtos Cadastrados
                </button>
                <button
                  onClick={() => setItemsFilter("in_stock")}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${itemsFilter === "in_stock" ? "bg-green-600 text-white" : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"}`}
                >
                  Com Estoque
                </button>
                <button
                  onClick={() => setItemsFilter("out_of_stock")}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${itemsFilter === "out_of_stock" ? "bg-red-500 text-white" : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"}`}
                >
                  Sem Estoque
                </button>
                <button
                  onClick={() => setItemsFilter("used")}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${itemsFilter === "used" ? "bg-blue-600 text-white" : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100"}`}
                >
                  Produtos Usados
                </button>
              </div>
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
              <div className="overflow-x-auto w-full"><table className="w-full text-left whitespace-nowrap">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-xs font-black text-zinc-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Produto</th>
                    <th className="px-6 py-3">Código/SKU</th>
                    <th className="px-6 py-3">Categoria</th>
                    <th className="px-6 py-3">{itemsFilter === "used" ? "Qtd. Usada" : "Estoque"}</th>
                    <th className="px-6 py-3 text-right">Custo Médio</th>
                    <th className="px-6 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  
                  {items.filter(item => {
                    if (itemsFilter === "registered") return true;
                    
                    if (itemsFilter === "in_stock" || itemsFilter === "out_of_stock") {
                      const hasInTx = transactions.some(tx => tx.item_id === item.id && tx.type === 'in');
                      if (!hasInTx) return false;
                      if (itemsFilter === "in_stock") return item.current_quantity > 0;
                      if (itemsFilter === "out_of_stock") return item.current_quantity <= 0;
                    }
                    
                    if (itemsFilter === "used") {
                      const hasOutTx = transactions.some(tx => tx.item_id === item.id && tx.type === 'out');
                      return hasOutTx;
                    }
                    
                    return true;
                  }).map(item => (
                    <tr key={item.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-3 text-sm font-semibold text-zinc-900">{item.name}</td>
                      <td className="px-6 py-3 text-xs text-zinc-500">{item.sku || '-'}</td>
                      <td className="px-6 py-3 text-xs text-zinc-500">{item.category || '-'}</td>
                      <td className="px-6 py-3 text-sm font-bold text-zinc-900">
                        {itemsFilter === "used" ? Math.abs(transactions.filter(tx => tx.item_id === item.id && tx.type === 'out').reduce((acc, tx) => acc + Number(tx.quantity), 0)) : item.current_quantity}{' '}
                        {itemsFilter !== "used" && item.current_quantity <= item.min_quantity && (
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
                
                  {items.filter(item => {
                    if (itemsFilter === "registered") return true;
                    
                    if (itemsFilter === "in_stock" || itemsFilter === "out_of_stock") {
                      const hasInTx = transactions.some(tx => tx.item_id === item.id && tx.type === 'in');
                      if (!hasInTx) return false;
                      if (itemsFilter === "in_stock") return item.current_quantity > 0;
                      if (itemsFilter === "out_of_stock") return item.current_quantity <= 0;
                    }
                    
                    if (itemsFilter === "used") {
                      const hasOutTx = transactions.some(tx => tx.item_id === item.id && tx.type === 'out');
                      return hasOutTx;
                    }
                    
                    return true;
                  }).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-6 text-center text-zinc-500 text-sm">Nenhum produto encontrado.</td>
                    </tr>
                  )}
                </tbody>
              </table></div>
            </div>
          </div>
        )}

        {activeSubTab === "suppliers" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-zinc-800">Fornecedores</h2>
                <p className="text-xs text-zinc-500">
                  Gerencie fornecedores com localização GPS, contatos por departamento e categorias atendidas.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-2.5 text-zinc-400" />
                  <input
                    type="text"
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                    placeholder="Buscar fornecedor, CNPJ, categoria..."
                    className="pl-9 pr-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-medium text-zinc-800 w-full sm:w-64 focus:outline-none focus:border-primary"
                  />
                </div>
                <button
                  onClick={() => {
                    setSupplierForm({ id: "", name: "", cnpj_cpf: "", contact_name: "", phone: "", email: "" });
                    setShowSupplierModal(true);
                  }}
                  className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-primary-dark cursor-pointer shrink-0"
                >
                  <Plus size={16} /> Novo Fornecedor
                </button>
              </div>
            </div>

            {/* Supplier Cards List */}
            {suppliers.filter((s) => {
              if (!supplierSearch.trim()) return true;
              const term = supplierSearch.toLowerCase().trim();
              const nameMatch = s.name?.toLowerCase().includes(term);
              const cnpjMatch = s.cnpj_cpf?.toLowerCase().includes(term);
              const cityMatch =
                s.city?.toLowerCase().includes(term) ||
                s.address?.toLowerCase().includes(term) ||
                s.location?.toLowerCase().includes(term);

              let cStr = "";
              if (Array.isArray(s.contacts)) cStr = JSON.stringify(s.contacts).toLowerCase();
              else if (typeof s.contacts === "string") cStr = s.contacts.toLowerCase();
              const contactMatch = (s.contact_name?.toLowerCase().includes(term)) || cStr.includes(term);

              let catStr = "";
              if (Array.isArray(s.categories)) catStr = JSON.stringify(s.categories).toLowerCase();
              else if (typeof s.categories === "string") catStr = s.categories.toLowerCase();
              const catMatch = catStr.includes(term);

              return nameMatch || cnpjMatch || cityMatch || contactMatch || catMatch;
            }).length === 0 ? (
              <div className="p-8 text-center bg-white border border-zinc-200 rounded-2xl">
                <Building2 className="w-10 h-10 text-zinc-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-zinc-700">Nenhum fornecedor encontrado</p>
                <p className="text-xs text-zinc-400 mt-1">
                  Clique em "Novo Fornecedor" para realizar o cadastro.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {suppliers
                  .filter((s) => {
                    if (!supplierSearch.trim()) return true;
                    const term = supplierSearch.toLowerCase().trim();
                    const nameMatch = s.name?.toLowerCase().includes(term);
                    const cnpjMatch = s.cnpj_cpf?.toLowerCase().includes(term);
                    const cityMatch =
                      s.city?.toLowerCase().includes(term) ||
                      s.address?.toLowerCase().includes(term) ||
                      s.location?.toLowerCase().includes(term);

                    let cStr = "";
                    if (Array.isArray(s.contacts)) cStr = JSON.stringify(s.contacts).toLowerCase();
                    else if (typeof s.contacts === "string") cStr = s.contacts.toLowerCase();
                    const contactMatch = (s.contact_name?.toLowerCase().includes(term)) || cStr.includes(term);

                    let catStr = "";
                    if (Array.isArray(s.categories)) catStr = JSON.stringify(s.categories).toLowerCase();
                    else if (typeof s.categories === "string") catStr = s.categories.toLowerCase();
                    const catMatch = catStr.includes(term);

                    return nameMatch || cnpjMatch || cityMatch || contactMatch || catMatch;
                  })
                  .map((sup) => {
                    // Parse contacts
                    let contactsList: any[] = [];
                    if (Array.isArray(sup.contacts)) {
                      contactsList = sup.contacts;
                    } else if (typeof sup.contacts === "string" && sup.contacts.trim()) {
                      try {
                        contactsList = JSON.parse(sup.contacts);
                      } catch (e) {}
                    }
                    if (
                      contactsList.length === 0 &&
                      (sup.contact_name || sup.phone || sup.email)
                    ) {
                      contactsList = [
                        {
                          name: sup.contact_name,
                          department: "Geral",
                          phone: sup.phone,
                          email: sup.email,
                        },
                      ];
                    }

                    // Parse categories
                    let categoriesList: string[] = [];
                    if (Array.isArray(sup.categories)) {
                      categoriesList = sup.categories;
                    } else if (typeof sup.categories === "string" && sup.categories.trim()) {
                      try {
                        const json = JSON.parse(sup.categories);
                        if (Array.isArray(json)) categoriesList = json;
                        else categoriesList = sup.categories.split(",").map((x: string) => x.trim());
                      } catch (e) {
                        categoriesList = sup.categories.split(",").map((x: string) => x.trim());
                      }
                    }

                    const streetAddr = sup.address || sup.location;
                    const fullAddr = [
                      streetAddr,
                      sup.number ? `nº ${sup.number}` : "",
                      sup.bairro,
                      sup.city && sup.state ? `${sup.city} - ${sup.state}` : sup.city || sup.state,
                      sup.cep ? `CEP: ${sup.cep}` : "",
                    ]
                      .filter(Boolean)
                      .join(", ");

                    const lat = sup.latitude ?? sup.lat;
                    const lng = sup.longitude ?? sup.lng;
                    const hasGps = lat !== null && lng !== null && lat !== undefined && lng !== undefined && lat !== "" && lng !== "";

                    return (
                      <div
                        key={sup.id}
                        className="bg-white border border-zinc-200 rounded-2xl p-4 sm:p-5 hover:shadow-md transition-shadow flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h3 className="font-extrabold text-zinc-900 text-sm leading-tight">
                                {sup.name}
                              </h3>
                              <p className="text-[11px] font-mono text-zinc-500 font-medium">
                                CNPJ/CPF: {sup.cnpj_cpf || "-"}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                setSupplierForm(sup);
                                setShowSupplierModal(true);
                              }}
                              className="text-zinc-400 hover:text-primary p-1 rounded-lg hover:bg-zinc-100 transition shrink-0 cursor-pointer"
                              title="Editar Fornecedor"
                            >
                              <Edit2 size={15} />
                            </button>
                          </div>

                          {/* Categories Badges */}
                          {categoriesList.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {categoriesList.map((cat, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-md"
                                >
                                  <Tag size={10} />
                                  <span>{cat}</span>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Address & GPS */}
                          {(fullAddr || hasGps) && (
                            <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-100 space-y-1 text-xs">
                              {fullAddr && (
                                <div className="flex items-start gap-1.5 text-zinc-700 font-medium text-[11px]">
                                  <MapPin size={13} className="text-rose-500 shrink-0 mt-0.5" />
                                  <span className="line-clamp-2">{fullAddr}</span>
                                </div>
                              )}
                              {hasGps && (
                                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-zinc-500 pt-1 border-t border-zinc-200/60">
                                  <span>
                                    GPS: {Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}
                                  </span>
                                  <a
                                    href={`https://www.google.com/maps?q=${lat},${lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 font-sans font-bold"
                                  >
                                    <span>Mapa</span>
                                    <ExternalLink size={10} />
                                  </a>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Multiple Contacts */}
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1">
                              <Users size={11} /> Contatos ({contactsList.length})
                            </span>
                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                              {contactsList.map((c, i) => (
                                <div
                                  key={i}
                                  className="text-xs bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-0.5"
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-zinc-800 text-[11px]">
                                      {c.name || "Contato"}
                                    </span>
                                    {c.department && (
                                      <span className="bg-slate-200 text-slate-700 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">
                                        {c.department}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-2 text-[11px] text-zinc-600 font-medium pt-0.5">
                                    {c.phone && (
                                      <a
                                        href={`tel:${c.phone.replace(/\D/g, "")}`}
                                        className="flex items-center gap-1 text-indigo-600 hover:underline"
                                      >
                                        <Phone size={10} /> {c.phone}
                                      </a>
                                    )}
                                    {c.email && (
                                      <a
                                        href={`mailto:${c.email}`}
                                        className="flex items-center gap-1 text-zinc-500 hover:underline truncate max-w-[180px]"
                                      >
                                        <Mail size={10} /> {c.email}
                                      </a>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {activeSubTab === "nfs" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-zinc-800">Registro de Entradas (NFs)</h2>
              <div className="flex items-center gap-3">
                <input type="file" accept=".xml" className="hidden" ref={fileInputRef} onChange={handleImportXML} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-zinc-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-zinc-700 cursor-pointer"
                >
                  <Upload size={16} /> Importar XML
                </button>
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
            </div>
            <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
              <div className="overflow-x-auto w-full"><table className="w-full text-left whitespace-nowrap">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-xs font-black text-zinc-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Data/Hora</th>
                    <th className="px-6 py-3">Item</th>
                    <th className="px-6 py-3">Fornecedor</th>
                    <th className="px-6 py-3">NF-e</th>
                    <th className="px-6 py-3 text-right">Qtd.</th>
                    <th className="px-6 py-3 text-right">Preço Unit.</th>
                    <th className="px-6 py-3 text-right">Total</th>
                    <th className="px-6 py-3 text-center w-16">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {transactions.filter(t => t.type === 'in').map(t => (
                    <tr key={t.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-3 text-xs font-medium text-zinc-600">{new Date(t.created_at).toLocaleString('pt-BR')}</td>
                      <td className="px-6 py-3 text-sm font-bold text-zinc-900">{t.inventory_items?.name || '-'}</td>
                      <td className="px-6 py-3 text-xs text-zinc-600">{t.inventory_suppliers?.name || '-'}</td>
                      <td className="px-6 py-3 text-xs text-zinc-500">
                        {t.nf_number ? <span className="font-bold text-zinc-800">NF: {t.nf_number}</span> : '-'}<br/>
                        {t.date ? <span className="text-[10px]">Emi: {new Date(t.date).toLocaleDateString('pt-BR')}</span> : ''}
                        {t.nf_key ? <div className="text-[9px] truncate max-w-[150px]" title={t.nf_key}>{t.nf_key}</div> : ''}
                      </td>
                      <td className="px-6 py-3 text-sm font-bold text-green-600 text-right">+{t.quantity}</td>
                      <td className="px-6 py-3 text-sm text-zinc-700 text-right">R$ {(Number(t.unit_price) || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                      <td className="px-6 py-3 text-sm font-bold text-zinc-900 text-right">R$ {(Number(t.total_price) || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                      <td className="px-6 py-3 text-center">
                        <button onClick={() => setSelectedTx(t)} className="p-1 text-zinc-400 hover:text-primary transition-colors cursor-pointer" title="Visualizar Detalhes">
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-6 text-center text-zinc-500 text-sm">Nenhuma entrada registrada.</td>
                    </tr>
                  )}
                </tbody>
              </table></div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {itemForm.category && itemForm.category.split(', ').filter(Boolean).map(cat => (
                        <span key={cat} className="text-xs font-bold px-2 py-1 bg-purple-100 text-purple-700 rounded-md flex items-center gap-1">
                          {cat}
                          <button type="button" onClick={() => {
                            setItemForm({...itemForm, category: itemForm.category.split(', ').filter(c => c !== cat).join(', ')});
                          }} className="text-purple-900 hover:text-red-600"><X size={12} /></button>
                        </span>
                      ))}
                    </div>
                    <select
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary bg-white"
                      value=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        const current = itemForm.category ? itemForm.category.split(', ').filter(Boolean) : [];
                        if (!current.includes(val)) {
                          setItemForm({...itemForm, category: [...current, val].join(', ')});
                        }
                      }}
                    >
                      <option value="">Selecione para adicionar...</option>
                      {Array.from(new Set(checklistItems.map((i) => i.title ? i.title.split('::')[0] : '').filter(Boolean))).sort().map((cat: any) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase">Produto {(it as any)._importedName ? `(XML: ${(it as any)._importedName})` : ""}</label>
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


      {/* Visualizar Transação */}
      {selectedTx && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-zinc-200 flex justify-between items-center">
              <h3 className="font-bold text-lg text-zinc-800">Detalhes da Entrada</h3>
              <button onClick={() => setSelectedTx(null)} className="text-zinc-500 hover:text-zinc-800 cursor-pointer"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase">Data/Hora</label>
                  <p className="text-sm text-zinc-900">{new Date(selectedTx.created_at).toLocaleString('pt-BR')}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase">Tipo</label>
                  <p className="text-sm font-bold text-green-600">Entrada</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase">Produto</label>
                <p className="text-sm font-bold text-zinc-900">{selectedTx.inventory_items?.name || '-'}</p>
              </div>

              {selectedTx.inventory_suppliers?.name && (
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase">Fornecedor</label>
                  <p className="text-sm text-zinc-900">{selectedTx.inventory_suppliers?.name}</p>
                </div>
              )}

              {selectedTx.nf_number && (
                <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase">Nota Fiscal</label>
                      <p className="text-sm font-bold text-zinc-900">{selectedTx.nf_number}</p>
                    </div>
                    {selectedTx.date && (
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase">Emissão</label>
                        <p className="text-sm text-zinc-900">{new Date(selectedTx.date).toLocaleDateString('pt-BR')}</p>
                      </div>
                    )}
                  </div>
                  {selectedTx.nf_key && (
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase">Chave de Acesso</label>
                      <p className="text-xs font-mono text-zinc-700 break-all">{selectedTx.nf_key}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-4 border-t border-zinc-200 pt-4 mt-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase">Quantidade</label>
                  <p className="text-base font-bold text-green-600">+{selectedTx.quantity}</p>
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase">Custo Unitário</label>
                  <p className="text-sm text-zinc-700">R$ {(Number(selectedTx.unit_price) || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                </div>
                <div className="flex-1 text-right">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase">Custo Total</label>
                  <p className="text-base font-black text-zinc-900">R$ {(Number(selectedTx.total_price) || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
                </div>
              </div>

              {selectedTx.notes && (
                <div className="pt-2">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Observações</label>
                  <p className="text-sm text-zinc-700 bg-zinc-50 p-2 rounded border border-zinc-200">{selectedTx.notes}</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex justify-end">
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 bg-zinc-200 text-zinc-800 rounded-lg text-sm font-bold hover:bg-zinc-300 transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
