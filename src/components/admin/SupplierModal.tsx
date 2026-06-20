import React from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export function SupplierModal({
  show,
  onClose,
  onSaved,
  supplierToEdit,
}: {
  show: boolean;
  onClose: () => void;
  onSaved: () => void;
  supplierToEdit: any | null;
}) {
  const { user } = useAuth();
  const [form, setForm] = React.useState({
    id: "",
    name: "",
    cnpj_cpf: "",
    contact_name: "",
    phone: "",
    email: ""
  });

  React.useEffect(() => {
    if (supplierToEdit) {
      setForm({
        id: supplierToEdit.id || "",
        name: supplierToEdit.name || "",
        cnpj_cpf: supplierToEdit.cnpj_cpf || "",
        contact_name: supplierToEdit.contact_name || "",
        phone: supplierToEdit.phone || "",
        email: supplierToEdit.email || ""
      });
    } else {
      setForm({ id: "", name: "", cnpj_cpf: "", contact_name: "", phone: "", email: "" });
    }
  }, [supplierToEdit, show]);

  const handleSave = async () => {
    try {
      let company_id = null;
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();
      
      if (profile) company_id = profile.company_id;

      const payload: any = {
        name: form.name.trim(),
        cnpj_cpf: form.cnpj_cpf.trim(),
        contact_name: form.contact_name.trim(),
        phone: form.phone.trim(),
        email: form.email?.trim() || ""
      };

      if (!form.id && company_id) {
        payload.company_id = company_id;
      }

      if (form.id) {
        const { error } = await supabase.from("inventory_suppliers").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("inventory_suppliers").insert(payload);
        if (error) throw error;
      }

      onSaved();
    } catch (e: any) {
      console.error(e);
      alert("Erro ao salvar fornecedor.");
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-zinc-200 flex justify-between items-center">
          <h3 className="font-bold text-lg text-zinc-800">{form.id ? "Editar Fornecedor" : "Novo Fornecedor"}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-800 cursor-pointer"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">Razão Social / Nome *</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary font-semibold"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">CNPJ / CPF</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
              value={form.cnpj_cpf}
              onChange={(e) => setForm({ ...form, cnpj_cpf: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1">Pessoa de Contato</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
              value={form.contact_name}
              onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Telefone</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">Email</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-zinc-200 flex justify-end gap-2 bg-zinc-50">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-200 rounded-lg cursor-pointer">Cancelar</button>
          <button onClick={handleSave} disabled={!form.name.trim()} className="px-4 py-2 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 cursor-pointer">Salvar</button>
        </div>
      </div>
    </div>
  );
}
