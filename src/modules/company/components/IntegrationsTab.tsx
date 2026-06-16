import React, { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabase";
import {
  Plug,
  Save,
  MessageSquare,
  Trash2,
  Plus,
  AlertCircle,
  Send,
  CheckCircle2,
  XCircle,
  Check,
} from "lucide-react";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";

export default function IntegrationsTab() {
  const { user } = useAuth();
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
  const [ruleForm, setRuleForm] = useState<{
    id: string;
    ids: string[];
    auto_alert_ids: string[];
    phone_numbers: string;
    message: string;
  }>({
    id: "",
    ids: [],
    auto_alert_ids: [],
    phone_numbers: "",
    message: "",
  });

  const [qrCode, setQrCode] = useState<string | null>(null);
  const [instanceStatus, setInstanceStatus] = useState<string | null>(null);
  const [fetchingQrCode, setFetchingQrCode] = useState(false);

  const [connectionOnline, setConnectionOnline] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    if (user?.company_id) {
      fetchData();
    }
  }, [user?.company_id]);

  useEffect(() => {
    if (
      evolutionForm.url &&
      evolutionForm.api_key &&
      evolutionForm.instance_name
    ) {
      checkSilentConnectionState();
    }
  }, [evolutionForm.url, evolutionForm.api_key, evolutionForm.instance_name]);

  const checkSilentConnectionState = async () => {
    try {
      const url = `${evolutionForm.url.replace(/\/$/, "")}/instance/connectionState/${evolutionForm.instance_name}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          apikey: evolutionForm.api_key,
          "Authorization": `Bearer ${evolutionForm.api_key}`,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();
        const state =
          data.instance?.state || data.state || data.instance?.status;
        setConnectionOnline(
          state === "open" || state === "CONNECTED" || state === "connecting",
        );
      } else {
        setConnectionOnline(false);
      }
    } catch (e) {
      setConnectionOnline(false);
    }
  };

  const fetchData = async () => {
    if (!user?.company_id) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      // Check if table exists by trying to select
      const { data: evData, error: evError } = await supabase
        .from("integration_evolution_api")
        .select("*")
        .eq("company_id", user.company_id)
        .limit(1);
      if (evError) throw evError;

      if (evData && evData.length > 0) {
        setEvolutionForm({
          id: evData[0].id,
          url: evData[0].url || "",
          api_key: evData[0].api_key || "",
          instance_name: evData[0].instance_name || "",
        });
      }

      const { data: rulesData, error: rulesError } = await supabase
        .from("integration_whatsapp_rules")
        .select(
          `
        *,
        auto_alerts(title)
      `,
        )
        .eq("company_id", user.company_id);
      if (rulesError) throw rulesError;
      setRules(rulesData || []);

      const { data: alertsData } = await supabase
        .from("auto_alerts")
        .select("id, title");
      setAutoAlerts(alertsData || []);
    } catch (error: any) {
      if (
        error?.code === "PGRST205" ||
        error.message?.includes(
          'relation "integration_evolution_api" does not exist',
        ) ||
        error.message?.includes("does not exist") ||
        error.message?.includes("schema cache")
      ) {
        setErrorMsg("As tabelas de integração não existem.");
      } else {
        console.error("Error fetching integrations:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchInstanceStatus = async () => {
    if (
      !evolutionForm.url ||
      !evolutionForm.api_key ||
      !evolutionForm.instance_name
    ) {
      return alert("Preencha as configurações da API primeiro.");
    }

    setFetchingQrCode(true);
    setInstanceStatus(null);
    setQrCode(null);
    try {
      // 1. Tentar criar a instância (se já existir, a API normalmente retorna erro que podemos ignorar e prosseguir para conectar)
      const createUrl = `${evolutionForm.url.replace(/\/$/, "")}/instance/create`;
      await fetch(createUrl, {
        method: "POST",
        headers: {
          apikey: evolutionForm.api_key,
          "Authorization": `Bearer ${evolutionForm.api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instanceName: evolutionForm.instance_name,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
        }),
      }).catch(() => {}); // Ignorar falha de rede na criação, tentaremos conectar de qualquer forma

      // 2. Buscar o status de conexão (que retorna o base64 se estiver pendente)
      const url = `${evolutionForm.url.replace(/\/$/, "")}/instance/connect/${evolutionForm.instance_name}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          apikey: evolutionForm.api_key,
          "Authorization": `Bearer ${evolutionForm.api_key}`,
          "Content-Type": "application/json",
        },
      });

      const textResponse = await response.text();
      let data;
      try {
        data = JSON.parse(textResponse);
      } catch (err) {
        setInstanceStatus(
          `Erro: Resposta inválida da API (recebido: ${textResponse.substring(0, 50)}...). Verifique se a URL informada está correta.`,
        );
        setFetchingQrCode(false);
        return;
      }

      if (response.ok) {
        if (data.base64) {
          setQrCode(data.base64);
          setInstanceStatus("QR Code Gerado. Escaneie no WhatsApp.");
        } else if (
          data.instance?.state === "open" ||
          data.instance?.status === "open" ||
          data.state === "open" ||
          data.instance?.state === "CONNECTED"
        ) {
          setInstanceStatus("Instância já conectada.");
          setConnectionOnline(true);
        } else {
          setInstanceStatus(
            `Status: ${data.instance?.state || data.state || data.instance?.status || "Aguardando"}`,
          );
        }
      } else {
        setInstanceStatus(
          `Erro: ${data.response?.message || data.message || "Falha ao conectar"}`,
        );
        setConnectionOnline(false);
      }
    } catch (error: any) {
      setInstanceStatus(`Erro: ${error.message}`);
      setConnectionOnline(false);
    } finally {
      setFetchingQrCode(false);
    }
  };

  const saveEvolutionConfig = async () => {
    try {
      const payload = {
        company_id: user?.company_id,
        url: evolutionForm.url,
        api_key: evolutionForm.api_key,
        instance_name: evolutionForm.instance_name,
      };

      let error;
      if (evolutionForm.id) {
        const res = await supabase
          .from("integration_evolution_api")
          .update(payload)
          .eq("id", evolutionForm.id);
        error = res.error;
      } else {
        const res = await supabase
          .from("integration_evolution_api")
          .insert([payload]);
        error = res.error;
      }

      if (error) throw error;

      alert("Configuração da Evolution API salva com sucesso!");
      fetchData();
    } catch (error: any) {
      alert("Erro ao salvar configuração: " + error.message);
    }
  };

  const saveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      ruleForm.auto_alert_ids.length === 0 ||
      !ruleForm.phone_numbers ||
      !ruleForm.message
    ) {
      return alert("Preencha todos os campos e selecione pelo menos um alerta.");
    }
    try {
      if (ruleForm.ids && ruleForm.ids.length > 0) {
        // Delete all previously grouped rules first to start fresh
        const { error: deleteError } = await supabase
          .from("integration_whatsapp_rules")
          .delete()
          .in("id", ruleForm.ids);
        if (deleteError) throw deleteError;
      }

      // Prepare payload with a row for each alert ID
      const payloads = ruleForm.auto_alert_ids.map((alertId) => ({
        company_id: user?.company_id,
        auto_alert_id: alertId,
        phone_numbers: ruleForm.phone_numbers,
        message: ruleForm.message,
      }));

      const { error: insertError } = await supabase
        .from("integration_whatsapp_rules")
        .insert(payloads);

      if (insertError) throw insertError;

      setShowRuleForm(false);
      setRuleForm({
        id: "",
        ids: [],
        auto_alert_ids: [],
        phone_numbers: "",
        message: "",
      });
      fetchData();
    } catch (error: any) {
      alert("Erro ao salvar regra: " + error.message);
    }
  };

  const deleteRule = async (ids: string[]) => {
    if (!confirm("Excluir esta regra de mensagem e todos os seus vínculos de alerta?")) return;
    try {
      await supabase.from("integration_whatsapp_rules").delete().in("id", ids);
      fetchData();
    } catch (error: any) {
      alert("Erro ao excluir: " + error.message);
    }
  };

  const sendTestMessage = async (rule: any) => {
    if (
      !evolutionForm.url ||
      !evolutionForm.api_key ||
      !evolutionForm.instance_name
    ) {
      return alert("Configure e salve a Evolution API primeiro.");
    }

    if (connectionOnline === false) {
      return alert(
        "A instância parece estar offline. Verifique a conexão do QR Code antes de enviar mensagens.",
      );
    }

    try {
      let message = rule.message || "";
      message = message.replace(/\{\{veiculo\}\}/g, "VEÍCULO DE TESTE");
      message = message.replace(/\{\{veiculo_placa\}\}/g, "ABC-1234");
      message = message.replace(/\{\{km\}\}/g, "100000");
      message = message.replace(/\{\{km_atual\}\}/g, "100000");
      message = message.replace(/\{\{km_aviso\}\}/g, "105000");
      message = message.replace(/\{\{km_manutencao\}\}/g, "110000");
      message = message.replace(
        /\{\{alerta\}\}/g,
        "Alerta de Teste do Sistema",
      );
      message = `[TESTE DE INTEGRAÇÃO]\n${message}`;

      const numbersStr = rule.phone_numbers || "";
      const numbers = numbersStr
        .split(",")
        .map((n: string) => {
          let cleaned = n.trim().replace(/\D/g, "");
          if (cleaned.length === 10 || cleaned.length === 11) {
            cleaned = "55" + cleaned;
          }
          return cleaned;
        })
        .filter((n: string) => !!n);

      if (numbers.length === 0) {
        return alert("Nenhum número de telefone válido encontrado.");
      }

      const endpoint = `${evolutionForm.url.replace(/\/$/, "")}/message/sendText/${evolutionForm.instance_name}`;

      for (const phone of numbers) {
        const payload = {
          number: phone,
          textMessage: { text: message },
          text: message,
          options: { delay: 1200 },
        };

        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": evolutionForm.api_key,
            "Authorization": `Bearer ${evolutionForm.api_key}`
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Erro API: ${response.status} ${errText}`);
        }
      }
      
      alert(
        "Mensagem de teste enviada com sucesso para " +
          numbers.length +
          " número(s)!",
      );
    } catch (e: any) {
      alert("Falha ao enviar mensagem de teste: " + e.message);
    }
  };

  if (loading)
    return <div className="p-8 text-center text-zinc-500">Carregando...</div>;

  if (errorMsg) {
    return (
      <div className="bg-white p-6 rounded-3xl border border-app-border shadow-sm">
        <h3 className="text-sm font-black text-danger uppercase tracking-tight mb-2 flex items-center gap-2">
          <AlertCircle size={18} /> Instalação Necessária!
        </h3>
        <p className="text-sm text-zinc-600 mb-4">
          Para usar as integrações de WhatsApp, as tabelas precisam ser criadas.
          Copie e cole o código SQL abaixo no Editor de SQL do seu painel
          Supabase.
        </p>
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
      <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm relative">
        <div className="absolute top-6 right-6">
          {connectionOnline === true && (
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
              <CheckCircle2 size={14} /> WhatsApp Conectado
            </div>
          )}
          {connectionOnline === false && (
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-danger bg-danger/10 px-3 py-1.5 rounded-full">
              <XCircle size={14} /> WhatsApp Desconectado
            </div>
          )}
        </div>
        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-800 border-b border-zinc-100 pb-4 mb-6 flex items-center gap-2">
          <Plug size={16} className="text-primary" />
          Configuração da API (Evolution API)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">
              URL da API
            </label>
            <input
              type="text"
              placeholder="https://api.evolution..."
              className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              value={evolutionForm.url}
              onChange={(e) =>
                setEvolutionForm({ ...evolutionForm, url: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">
              API Key Global
            </label>
            <input
              type="password"
              placeholder="Insira a API Key"
              className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              value={evolutionForm.api_key}
              onChange={(e) =>
                setEvolutionForm({ ...evolutionForm, api_key: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">
              Nome da Instância
            </label>
            <input
              type="text"
              placeholder="Ex: FrotaZap"
              className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              value={evolutionForm.instance_name}
              onChange={(e) =>
                setEvolutionForm({
                  ...evolutionForm,
                  instance_name: e.target.value,
                })
              }
            />
          </div>
        </div>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mt-6 border-t border-zinc-100 pt-6">
          <div className="flex-1">
            {instanceStatus && (
              <div className="mb-4 text-sm p-3 rounded-lg bg-zinc-50 border border-zinc-200">
                <strong className="font-medium text-zinc-700">Status:</strong>{" "}
                <span className="text-zinc-600">{instanceStatus}</span>
              </div>
            )}

            {qrCode && (
              <div className="mt-4 flex flex-col items-start gap-2">
                <p className="text-xs font-medium text-zinc-500">
                  Escaneie o QR Code abaixo com o seu WhatsApp:
                </p>
                <div className="p-2 bg-white rounded-xl shadow-sm border border-zinc-200 inline-block">
                  <img
                    src={qrCode}
                    alt="WhatsApp Login QR Code"
                    className="w-64 h-64 object-contain"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={fetchInstanceStatus}
              disabled={fetchingQrCode}
              className="px-6 h-10 bg-zinc-800 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg hover:shadow-zinc-800/20 transition-all flex items-center gap-2 disabled:opacity-70"
            >
              {fetchingQrCode
                ? "Buscando..."
                : "Gerar QR Code / Testar Conexão"}
            </button>
            <button
              onClick={saveEvolutionConfig}
              className="px-6 h-10 bg-primary text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg hover:shadow-primary/20 transition-all flex items-center gap-2"
            >
              <Save size={14} /> Salvar API
            </button>
          </div>
        </div>
      </div>

      {/* WhatsApp Rules */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
        <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-zinc-800 flex items-center gap-2">
            <MessageSquare size={16} className="text-green-600" />
            Alertas via WhatsApp
          </h3>
          <button
            onClick={() => {
              setShowRuleForm(true);
              setRuleForm({
                id: "",
                ids: [],
                auto_alert_ids: [],
                phone_numbers: "",
                message: "",
              });
            }}
            className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-all"
          >
            <Plus size={16} />
          </button>
        </div>

        {showRuleForm && (
          <div className="mb-6 p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
            <h4 className="text-[10px] font-black uppercase text-zinc-500 mb-4">
              {ruleForm.id ? "Editar Regra" : "Nova Regra"}
            </h4>
            <form onSubmit={saveRule} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-2">
                  Vincular a qual(is) alerta(s) criado(s)? (Selecione um ou mais)
                </label>
                {autoAlerts.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic">Nenhum alerta automático cadastrado.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-3 bg-app-bg border border-app-border rounded-xl max-h-48 overflow-y-auto">
                    {autoAlerts.map((a) => {
                      const isSelected = ruleForm.auto_alert_ids.includes(a.id);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => {
                            const updated = isSelected
                              ? ruleForm.auto_alert_ids.filter((id) => id !== a.id)
                              : [...ruleForm.auto_alert_ids, a.id];
                            setRuleForm({ ...ruleForm, auto_alert_ids: updated });
                          }}
                          className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left text-xs font-semibold select-none transition-all ${
                            isSelected
                              ? "bg-primary/5 border-primary text-primary"
                              : "bg-white border-zinc-200 text-zinc-650 hover:bg-zinc-50"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                            isSelected ? "bg-primary border-primary text-white" : "border-zinc-300 bg-white"
                          }`}>
                            {isSelected && <Check size={11} className="stroke-[3]" />}
                          </div>
                          <span className="truncate">{a.title}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="flex gap-2.5 mt-2">
                  <button
                    type="button"
                    onClick={() => setRuleForm({ ...ruleForm, auto_alert_ids: autoAlerts.map(a => a.id) })}
                    className="text-[9px] font-bold text-primary hover:underline"
                  >
                    Selecionar Todos
                  </button>
                  <span className="text-[9px] text-zinc-300">|</span>
                  <button
                    type="button"
                    onClick={() => setRuleForm({ ...ruleForm, auto_alert_ids: [] })}
                    className="text-[9px] font-bold text-zinc-500 hover:underline"
                  >
                    Limpar Seleção
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">
                  Números de Telefone (Separados por vírgula)
                </label>
                <input
                  type="text"
                  placeholder="Ex: 5511999999999, 5511888888888"
                  className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  value={ruleForm.phone_numbers}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, phone_numbers: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">
                  Mensagem (Variáveis: {"{"}{"{"}veiculo_placa{"}"}{"}"}, {"{"}{"{"}km_atual{"}"}{"}"}, {"{"}{"{"}km_aviso{"}"}{"}"}, {"{"}{"{"}km_manutencao{"}"}{"}"})
                </label>
                <textarea
                  rows={3}
                  placeholder="Atenção! Manutenção do veículo {{veiculo_placa}} se aproxima. KM Atual: {{km_atual}}. Aviso em: {{km_aviso}}. Limite: {{km_manutencao}}."
                  className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  value={ruleForm.message}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, message: e.target.value })
                  }
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRuleForm(false)}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow shadow-primary/20"
                >
                  Salvar Regra
                </button>
              </div>
            </form>
          </div>
        )}

        {(() => {
          const groupedRulesMap = new Map<string, any>();
          rules.forEach((rule) => {
            const key = `${rule.phone_numbers || ""}:::${rule.message || ""}`;
            if (!groupedRulesMap.has(key)) {
              groupedRulesMap.set(key, {
                id: rule.id,
                ids: [rule.id],
                auto_alert_ids: [rule.auto_alert_id],
                alert_titles: [rule.auto_alerts?.title || "Desconhecido"],
                phone_numbers: rule.phone_numbers,
                message: rule.message,
                created_at: rule.created_at,
              });
            } else {
              const existing = groupedRulesMap.get(key);
              existing.ids.push(rule.id);
              if (!existing.auto_alert_ids.includes(rule.auto_alert_id)) {
                existing.auto_alert_ids.push(rule.auto_alert_id);
              }
              const title = rule.auto_alerts?.title || "Desconhecido";
              if (!existing.alert_titles.includes(title)) {
                existing.alert_titles.push(title);
              }
            }
          });
          const groupedRules = Array.from(groupedRulesMap.values());

          if (groupedRules.length === 0) {
            return (
              <div className="text-center py-6 text-sm text-zinc-500 border border-dashed border-zinc-200 rounded-xl">
                Nenhuma regra de mensagem cadastrada.
              </div>
            );
          }

          return (
            <div className="space-y-3">
              {groupedRules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-4 rounded-xl border border-zinc-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 mb-2">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mr-1">
                        Alertas Vinculados:
                      </span>
                      {rule.alert_titles.map((title: string, index: number) => (
                        <span key={index} className="text-[9px] font-black bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {title}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-zinc-500 mb-1">
                      <strong className="text-zinc-700">Para:</strong>{" "}
                      {rule.phone_numbers}
                    </p>
                    <p className="text-sm font-medium text-zinc-800 bg-zinc-50 p-2.5 rounded-lg border border-zinc-100 mt-2 whitespace-pre-wrap leading-relaxed">
                      {rule.message}
                    </p>
                  </div>
                  <div className="flex gap-2 self-end md:self-auto shrink-0">
                    <button
                      onClick={() => sendTestMessage(rule)}
                      title="Enviar Mensagem de Teste"
                      className="p-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <Send size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setRuleForm({
                          id: rule.id,
                          ids: rule.ids,
                          auto_alert_ids: rule.auto_alert_ids,
                          phone_numbers: rule.phone_numbers || "",
                          message: rule.message || "",
                        });
                        setShowRuleForm(true);
                      }}
                      className="p-2 text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors"
                    >
                      Atualizar
                    </button>
                    <button
                      onClick={() => deleteRule(rule.ids)}
                      className="p-2 text-danger bg-danger/10 rounded-lg hover:bg-danger/20 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
