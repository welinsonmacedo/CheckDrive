import React, { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";
import {
  Building2,
  Save,
  Phone,
  MapPin,
  Image as ImageIcon,
  FileText,
  AlertTriangle,
  Upload,
  CheckCircle,
} from "lucide-react";

export default function CompanySettingsSection() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [company, setCompany] = useState({
    id: "",
    name: "",
    document: "",
    address: "",
    phone: "",
    logo_url: "",
  });

  const fetchCompanyData = async () => {
    setLoading(true);
    setSqlError(null);
    try {
      let companyId = user?.company_id;

      if (!companyId) {
        // Fallback: fetch first company from the list
        const { data: firstComp } = await supabase
          .from("companies")
          .select("*")
          .limit(1)
          .maybeSingle();
        if (firstComp) {
          companyId = firstComp.id;
        }
      }

      if (companyId) {
        const { data, error } = await supabase
          .from("companies")
          .select("*")
          .eq("id", companyId)
          .single();

        if (error) throw error;

        if (data) {
          setCompany({
            id: data.id || "",
            name: data.name || "",
            document: data.document || "",
            address: data.address || "",
            phone: data.phone || "",
            logo_url: data.logo_url || "",
          });
        }
      }
    } catch (err: any) {
      console.error("Erro ao carregar dados da empresa:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyData();
  }, [user]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!user?.id) {
        alert("Erro: Usuário não identificado para realizar o upload.");
        return;
      }

      setUploading(true);
      const fileExt = file.name && file.name.includes(".") ? file.name.split(".").pop() : "jpg";
      // Upload under user.id/ prefix to respect 'avatars' RLS policy: (storage.foldername(name))[1] = auth.uid()::text
      const filePath = `${user.id}/company-logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      setCompany((prev) => ({ ...prev, logo_url: publicUrl }));
    } catch (error: any) {
      alert("Erro ao fazer upload da logo: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.name) {
      alert("O nome da empresa é obrigatório.");
      return;
    }

    setSaving(true);
    setSqlError(null);

    try {
      const payload = {
        name: company.name,
        document: company.document || null,
        address: company.address || null,
        phone: company.phone || null,
        logo_url: company.logo_url || null,
      };

      if (company.id) {
        const { error } = await supabase
          .from("companies")
          .update(payload)
          .eq("id", company.id);

        if (error) throw error;
        alert("Dados da empresa salvos com sucesso.");
      } else {
        // Create new company if none exists
        const { data, error } = await supabase
          .from("companies")
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setCompany((prev) => ({ ...prev, id: data.id }));
        }
        alert("Empresa cadastrada com sucesso.");
      }
    } catch (error: any) {
      console.error("Erro ao salvar empresa:", error);
      if (
        error.message &&
        (error.message.includes("Could not find the 'address'") ||
          error.message.includes('column "address" of relation "companies" does not exist') ||
          error.message.includes("Could not find the 'logo_url'") ||
          error.message.includes('column "logo_url" of relation "companies" does not exist') ||
          error.message.includes("Could not find the 'phone'") ||
          error.message.includes('column "phone" of relation "companies" does not exist'))
      ) {
        setSqlError("database_migration_needed");
      } else {
        alert("Erro ao salvar: " + error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-zinc-200 rounded w-1/4"></div>
        <div className="h-10 bg-zinc-200 rounded"></div>
        <div className="h-10 bg-zinc-200 rounded"></div>
        <div className="h-10 bg-zinc-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-sm space-y-6">
      <div className="border-b border-zinc-100 pb-4 mb-6 flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-800 flex items-center gap-2">
          <Building2 size={18} className="text-primary" />
          Dados Cadastrais da Empresa
        </h3>
      </div>

      {sqlError === "database_migration_needed" && (
        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                Atualização de Banco de Dados Necessária
              </h4>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                As colunas de endereço, logo e telefone não existem na tabela de empresas. Copie e cole o SQL abaixo no painel de SQL do Supabase para adicioná-las:
              </p>
              <div className="mt-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl overflow-x-auto text-xs font-mono text-zinc-300">
                <pre>
{`ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;`}
                </pre>
              </div>
              <button
                type="button"
                onClick={() => setSqlError(null)}
                className="mt-4 px-4 py-2 bg-white hover:bg-zinc-50 border border-amber-200 text-amber-900 rounded-lg text-xs font-bold transition-colors"
              >
                Entendi, tentar novamente
              </button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Logo Upload & Preview */}
          <div className="md:col-span-2 flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
            <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-zinc-200 bg-white flex items-center justify-center overflow-hidden shrink-0 relative group">
              {company.logo_url ? (
                <>
                  <img
                    src={company.logo_url}
                    alt="Logo da Empresa"
                    className="w-full h-full object-contain p-2"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold cursor-pointer">
                    Alterar
                  </div>
                </>
              ) : (
                <ImageIcon size={24} className="text-zinc-400" />
              )}
            </div>

            <div className="flex-1 space-y-2">
              <h4 className="text-sm font-bold text-zinc-800">Logo da Empresa</h4>
              <p className="text-xs text-zinc-500 leading-relaxed max-w-md">
                Faça o upload da imagem da logomarca da sua empresa. Formatos recomendados: PNG ou JPG com fundo transparente ou branco.
              </p>

              <div className="flex flex-wrap gap-2 pt-2">
                <label className="px-4 py-2 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-xl text-xs font-bold cursor-pointer transition-colors inline-flex items-center gap-2 shadow-sm">
                  <Upload size={14} className="text-zinc-500" />
                  {uploading ? "Carregando..." : "Escolher Imagem"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
                {company.logo_url && (
                  <button
                    type="button"
                    onClick={() => setCompany((prev) => ({ ...prev, logo_url: "" }))}
                    className="px-4 py-2 bg-transparent hover:bg-red-50 text-red-600 rounded-xl text-xs font-bold transition-colors"
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Nome da Empresa */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
              <Building2 size={12} className="text-zinc-400" />
              Razão Social / Nome da Empresa
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Transportadora Solução Ltda"
              value={company.name}
              onChange={(e) => setCompany((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full h-12 px-4 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-bold text-zinc-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* CNPJ */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
              <FileText size={12} className="text-zinc-400" />
              CNPJ
            </label>
            <input
              type="text"
              placeholder="00.000.000/0000-00"
              value={company.document}
              onChange={(e) => setCompany((prev) => ({ ...prev, document: e.target.value }))}
              className="w-full h-12 px-4 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-bold text-zinc-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Telefone */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
              <Phone size={12} className="text-zinc-400" />
              Telefone de Contato
            </label>
            <input
              type="text"
              placeholder="(00) 00000-0000"
              value={company.phone}
              onChange={(e) => setCompany((prev) => ({ ...prev, phone: e.target.value }))}
              className="w-full h-12 px-4 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-bold text-zinc-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* Endereço */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
              <MapPin size={12} className="text-zinc-400" />
              Endereço Completo
            </label>
            <input
              type="text"
              placeholder="Rua, Número, Bairro, Cidade - UF"
              value={company.address}
              onChange={(e) => setCompany((prev) => ({ ...prev, address: e.target.value }))}
              className="w-full h-12 px-4 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-bold text-zinc-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          {/* URL direta do logo (opcional) */}
          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
              <ImageIcon size={12} className="text-zinc-400" />
              URL Direta do Logo (Opcional)
            </label>
            <input
              type="url"
              placeholder="https://exemplo.com/logo.png"
              value={company.logo_url}
              onChange={(e) => setCompany((prev) => ({ ...prev, logo_url: e.target.value }))}
              className="w-full h-12 px-4 rounded-xl border border-zinc-200 bg-zinc-50 text-sm font-bold text-zinc-800 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-8 h-12 bg-primary text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-xl shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save size={16} />
            {saving ? "Salvando..." : "Salvar Dados da Empresa"}
          </button>
        </div>
      </form>
    </div>
  );
}
