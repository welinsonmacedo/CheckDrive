import React, { useState, useEffect } from "react";
import { X, Check } from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";

export function SupplierModal({
  show,
  onClose,
  onSaved,
  supplierToEdit,
}: {
  show: boolean;
  onClose: () => void;
  onSaved: () => void;
  supplierToEdit?: any | null;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: "",
    cnpj_cpf: "",
    contact_name: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    if (show) {
      if (supplierToEdit) {
        setForm({
          name: supplierToEdit.name || "",
          cnpj_cpf: supplierToEdit.cnpj_cpf || "",
          contact_name: supplierToEdit.contact_name || "",
          phone: supplierToEdit.phone || "",
          email: supplierToEdit.email || "",
        });
      } else {
        setForm({ name: "", cnpj_cpf: "", contact_name: "", phone: "", email: "" });
      }
    }
  }, [show, supplierToEdit]);

  if (!show) return null;

  const handleSave = async () => {
    try {
      const payload = {
        ...form,
        company_id: (user as any)?.company_id,
      };

      if (supplierToEdit && supplierToEdit.id) {
        await supabase
          .from("inventory_suppliers")
          .update(payload)
          .eq("id", supplierToEdit.id);
      } else {
        await supabase.from("inventory_suppliers").insert(payload);
      }
      onSaved();
    } catch (e) {
      alert("Erro ao salvar fornecedor.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-app-border flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-text-main">
            {supplierToEdit ? "Editar Fornecedor" : "Novo Fornecedor"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-text-muted hover:bg-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase mb-1">
              Nome Fantasia / Razão Social
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-slate-50 border border-app-border rounded-lg h-10 px-3 text-sm font-medium text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase mb-1">
              CNPJ / CPF
            </label>
            <input
              type="text"
              value={form.cnpj_cpf}
              onChange={(e) => setForm({ ...form, cnpj_cpf: e.target.value })}
              className="w-full bg-slate-50 border border-app-border rounded-lg h-10 px-3 text-sm font-medium text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-text-muted uppercase mb-1">
              Nome do Contato
            </label>
            <input
              type="text"
              value={form.contact_name}
              onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
              className="w-full bg-slate-50 border border-app-border rounded-lg h-10 px-3 text-sm font-medium text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                Telefone
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-slate-50 border border-app-border rounded-lg h-10 px-3 text-sm font-medium text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                E-mail
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-slate-50 border border-app-border rounded-lg h-10 px-3 text-sm font-medium text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-app-border shrink-0">
          <button
            onClick={handleSave}
            disabled={!form.name}
            className="w-full h-11 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            <Check size={18} /> Salvar Fornecedor
          </button>
        </div>
      </div>
    </div>
  );
}
