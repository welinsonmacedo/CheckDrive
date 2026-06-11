import React, { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabase";
import { Plug, Save, MessageSquare, Trash2, Plus, AlertCircle } from "lucide-react";

export default function IntegrationsTab() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Evolution API Settings
  const [evolutionForm, setEvolutionForm] = useState({
    id: "",
    url: "",
    api_key: "",
    instance_name: "",
  });

  // Rules
  const [rules, setRules] = useState<any[]>([]);
  const [autoAlerts, setAutoAlerts] = useState<any[]>([]);
  
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    id: "",
    auto_alert_id: "",
    phone_numbers: "",
    message: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Check if table exists by trying to select
      const { data: evData, error: evError } = await supabase.from("integration_evolution_api").select("*").limit(1);
      if (evError) throw evError;

      if (evData && evData.length > 0) {
        setEvolutionForm({
          id: evData[0].id,
          url: evData[0].url || "",
          api_key: evData[0].api_key || "",
          instance_name: evData[0].instance_name || "",
        });
      }

      const { data: rulesData, error: rulesError } = await supabase.from("integration_whatsapp_rules").select(`
        *,
        auto_alerts(title)
      `);
      if (rulesError) throw rulesError;
      setRules(rulesData || []);

      const { data: alertsData } = await supabase.from("auto_alerts").select("id, title");
      setAutoAlerts(alertsData || []);

    } catch (error: any) {
      if (error.message?.includes('relation "integration_evolution_api" does not exist') || error.message?.includes('does not exist')) {
        setErrorMsg("As tabelas de integração não existem.");
      } else {
        console.error("Error fetching integrations:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const saveEvolutionConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        company_id: user?.company_id,
        url: evolutionForm.url,
        api_key: evolutionForm.api_key,
        instance_name: evolutionForm.instance_name,
      };

      if (evolutionForm.id) {
        await supabase.from("integration_evolution_api").update(payload).eq("id", evolutionForm.id);
      } else {
        await supabase.from("integration_evolution_api").insert([payload]);
      }
      alert("Configuração da Evolution API salva com sucesso!");
      fetchData();
    } catch (error: any) {
      alert("Erro ao salvar configuração: " + error.message);
    }
  };

  const saveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleForm.auto_alert_id || !ruleForm.phone_numbers || !ruleForm.message) {
      return alert("Preencha todos os campos da regra.");
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        company_id: user?.company_id,
        auto_alert_id: ruleForm.auto_alert_id,
        phone_numbers: ruleForm.phone_numbers,
        message: ruleForm.message,
      };

      if (ruleForm.id) {
        await supabase.from("integration_whatsapp_rules").update(payload).eq("id", ruleForm.id);
      } else {
        await supabase.from("integration_whatsapp_rules").insert([payload]);
      }
      setShowRuleForm(false);
      setRuleForm({ id: "", auto_alert_id: "", phone_numbers: "", message: "" });
      fetchData();
    } catch (error: any) {
      alert("Erro ao salvar regra: " + error.message);
    }
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Excluir esta regra?")) return;
    try {
      await supabase.from("integration_whatsapp_rules").delete().eq("id", id);
      fetchData();
    } catch (error: any) {
      alert("Erro ao excluir: " + error.message);
    }
  };

  if (loading) return <div className="p-8 text-center text-zinc-500">Carregando...</div>;

  if (errorMsg) {
    return (
      <div className="bg-white p-6 rounded-3xl border border-app-border shadow-sm">
        <h3 className="text-sm font-black text-danger uppercase tracking-tight mb-2 flex items-center gap-2">
          <AlertCircle size={18} /> Instalação Necessária!
        </h3>
        <p className="text-sm text-zinc-600 mb-4">Para usar as integrações de WhatsApp, as tabelas precisam ser criadas. Copie e cole o código SQL abaixo no Editor de SQL do seu painel Supabase.</p>
        <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl overflow-x-auto text-xs font-mono text-zinc-600">
          <pre>
{`-- 1. Criar tabela de configuração da Evolution API
CREATE TABLE IF NOT EXISTS integration_evolution_api (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id),
    url TEXT NOT NULL,
    api_key TEXT NOT NULL,
    instance_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE integration_evolution_api ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage integration_evolution_api"
ON public.integration_evolution_api FOR ALL TO authenticated
USING (company_id = get_default_company_id())
WITH CHECK (company_id = get_default_company_id());

-- 2. Criar tabela de regras do WhatsApp
CREATE TABLE IF NOT EXISTS integration_whatsapp_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id),
    auto_alert_id UUID REFERENCES public.auto_alerts(id) ON DELETE CASCADE,
    phone_numbers TEXT NOT NULL, -- números separados por vírgula
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE integration_whatsapp_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage integration_whatsapp_rules"
ON public.integration_whatsapp_rules FOR ALL TO authenticated
USING (company_id = get_default_company_id())
WITH CHECK (company_id = get_default_company_id());
`}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Evolution Configuration */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-800 border-b border-zinc-100 pb-4 mb-6 flex items-center gap-2">
          <Plug size={16} className="text-primary" />
          Configuração da API (Evolution API)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">URL da API</label>
            <input type="text" placeholder="https://api.evolution..." className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" value={evolutionForm.url} onChange={(e) => setEvolutionForm({...evolutionForm, url: e.target.value})} />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">API Key Global</label>
            <input type="password" placeholder="Insira a API Key" className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" value={evolutionForm.api_key} onChange={(e) => setEvolutionForm({...evolutionForm, api_key: e.target.value})} />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Nome da Instância</label>
            <input type="text" placeholder="Ex: FrotaZap" className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" value={evolutionForm.instance_name} onChange={(e) => setEvolutionForm({...evolutionForm, instance_name: e.target.value})} />
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={saveEvolutionConfig} className="px-6 h-10 bg-primary text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg hover:shadow-primary/20 transition-all flex items-center gap-2">
            <Save size={14} /> Salvar API
          </button>
        </div>
      </div>

      {/* WhatsApp Rules */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
        <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-800 flex items-center gap-2">
            <MessageSquare size={16} className="text-green-600" />
            Alertas via WhatsApp
          </h3>
          <button onClick={() => { setShowRuleForm(true); setRuleForm({ id: "", auto_alert_id: "", phone_numbers: "", message: "" }); }} className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-all">
            <Plus size={16} />
          </button>
        </div>

        {showRuleForm && (
          <div className="mb-6 p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
             <h4 className="text-[10px] font-black uppercase text-zinc-500 mb-4">{ruleForm.id ? "Editar Regra" : "Nova Regra"}</h4>
             <form onSubmit={saveRule} className="space-y-4">
                <div>
                   <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Vincular a qual alerta criado?</label>
                   <select className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none" value={ruleForm.auto_alert_id} onChange={(e) => setRuleForm({...ruleForm, auto_alert_id: e.target.value})}>
                     <option value="">Selecione um alerta...</option>
                     {autoAlerts.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Números de Telefone (Separados por vírgula)</label>
                   <input type="text" placeholder="Ex: 5511999999999, 5511888888888" className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" value={ruleForm.phone_numbers} onChange={(e) => setRuleForm({...ruleForm, phone_numbers: e.target.value})} />
                </div>
                <div>
                   <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">Mensagem (Pode usar variaveis como {"{"}{"{"}veiculo{"}"}{"}"}, {"{"}{"{"}km{"}"}{"}"})</label>
                   <textarea rows={3} placeholder="Atenção! Alerta disparado para o veículo {{veiculo}}..." className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary" value={ruleForm.message} onChange={(e) => setRuleForm({...ruleForm, message: e.target.value})} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                   <button type="button" onClick={() => setShowRuleForm(false)} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">Cancelar</button>
                   <button type="submit" className="px-6 py-2 bg-primary text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow shadow-primary/20">Salvar Regra</button>
                </div>
             </form>
          </div>
        )}

        {rules.length === 0 ? (
          <div className="text-center py-6 text-sm text-zinc-500 border border-dashed border-zinc-200 rounded-xl">
             Nenhuma regra de mensagem cadastrada.
          </div>
        ) : (
          <div className="space-y-3">
             {rules.map(rule => (
                <div key={rule.id} className="p-4 rounded-xl border border-zinc-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                   <div>
                      <div className="flex items-center gap-2 mb-1">
                         <span className="text-[10px] font-black bg-blue-100 text-blue-800 px-2 py-0.5 rounded uppercase tracking-widest">Alerta: {rule.auto_alerts?.title || "Desconhecido"}</span>
                      </div>
                      <p className="text-xs text-zinc-500 mb-1"><strong className="text-zinc-700">Para:</strong> {rule.phone_numbers}</p>
                      <p className="text-sm font-medium text-zinc-800 bg-zinc-50 p-2 rounded-lg border border-zinc-100 mt-2 line-clamp-2">{rule.message}</p>
                   </div>
                   <div className="flex gap-2 self-end md:self-auto shrink-0">
                      <button onClick={() => { setRuleForm({ id: rule.id, auto_alert_id: rule.auto_alert_id, phone_numbers: rule.phone_numbers, message: rule.message }); setShowRuleForm(true); }} className="p-2 text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
                         Atualizar
                      </button>
                      <button onClick={() => deleteRule(rule.id)} className="p-2 text-danger bg-danger/10 rounded-lg hover:bg-danger/20 transition-colors">
                         <Trash2 size={16} />
                      </button>
                   </div>
                </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
}
