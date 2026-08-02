import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/src/lib/supabase";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  Calendar,
  Navigation,
  CheckCircle2,
  X,
  Search,
  Filter,
  History,
} from "lucide-react";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";
import AlertHistoryModal from "@/src/modules/company/components/AlertHistoryModal";

export default function AlertsTab() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedAlertForHistory, setSelectedAlertForHistory] = useState<any | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [triggerFilter, setTriggerFilter] = useState("all");
  const [targetFilter, setTargetFilter] = useState("all");

  // Form state
  const [form, setForm] = useState({
    id: "",
    title: "",
    trigger_type: "km", // date, km
    target_type: "vehicle", // vehicle, driver
    target_vehicle_id: "",
    target_driver_id: "",
    trigger_date: "",
    warning_days: "",
    interval_km: "",
    last_km: "",
    warning_km: "",
    generate_issue: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const companyId = (user as any)?.company_id || (user as any)?.company?.id;

      // Setup queries
      let vQuery = supabase.from("vehicles").select("id, plate").order("plate");
      let tQuery = supabase.from("trailers").select("id, plate").order("plate");
      if (companyId) {
        vQuery = vQuery.eq("company_id", companyId).eq("active", true);
        tQuery = tQuery.eq("company_id", companyId).eq("active", true);
      }
      let [vRes, tRes] = await Promise.all([vQuery, tQuery]);
      let vData = vRes.data || [];
      let tData = (tRes.data || []).map((t: any) => ({ ...t, plate: `${t.plate} (Reboque)` }));
      const mergedVehicles = [...vData, ...tData].sort((a, b) => (a.plate || "").localeCompare(b.plate || ""));
      setVehicles(mergedVehicles);

      let dQuery = supabase.from("profiles").select("id, full_name").eq("role", "driver");
      if (companyId) dQuery = dQuery.eq("company_id", companyId);
      let { data: dData } = await dQuery;
      if (!dData || dData.length === 0) {
        const { data: allD } = await supabase.from("profiles").select("id, full_name").eq("role", "driver");
        if (allD) dData = allD;
      }
      if (dData) setDrivers(dData);

      let rawAlerts: any[] = [];
      let alertsQuery = supabase.from("auto_alerts").select("*").order("created_at", { ascending: false });
      if (companyId) alertsQuery = alertsQuery.eq("company_id", companyId);

      const { data: plainData, error } = await alertsQuery;

      if (!error && plainData && plainData.length > 0) {
        rawAlerts = plainData;
      } else {
        const { data: allAlerts } = await supabase.from("auto_alerts").select("*").order("created_at", { ascending: false });
        if (allAlerts) rawAlerts = allAlerts;
      }

      // Map vehicles and drivers manually
      const vehicleIds = [...new Set(rawAlerts.map((a) => a.target_vehicle_id || a.vehicle_id).filter(Boolean))];
      const driverIds = [...new Set(rawAlerts.map((a) => a.target_driver_id || a.driver_id).filter(Boolean))];

      let vehiclesMap: Record<string, any> = {};
      let profilesMap: Record<string, any> = {};

      if (vehicleIds.length > 0) {
        const [vListRes, tListRes] = await Promise.all([
          supabase.from("vehicles").select("id, plate").in("id", vehicleIds),
          supabase.from("trailers").select("id, plate").in("id", vehicleIds),
        ]);
        if (vListRes.data) vListRes.data.forEach((v) => { vehiclesMap[v.id] = v; });
        if (tListRes.data) tListRes.data.forEach((t) => { vehiclesMap[t.id] = { ...t, plate: `${t.plate} (Reboque)` }; });
      }

      if (driverIds.length > 0) {
        const { data: pList } = await supabase.from("profiles").select("id, full_name").in("id", driverIds);
        if (pList) pList.forEach((p) => { profilesMap[p.id] = p; });
      }

      const normalized = rawAlerts.map((alert) => {
        const vehId = alert.target_vehicle_id || alert.vehicle_id;
        const drvId = alert.target_driver_id || alert.driver_id;
        return {
          ...alert,
          target_vehicle_id: vehId,
          target_driver_id: drvId,
          vehicles: (alert.vehicles && typeof alert.vehicles === "object" ? alert.vehicles : null) || vehiclesMap[vehId] || null,
          profiles: (alert.profiles && typeof alert.profiles === "object" ? alert.profiles : null) || profilesMap[drvId] || null,
        };
      });

      setAlerts(normalized);
    } catch (error: any) {
      if (
        error.message?.includes("violates row-level security policy") ||
        error.message?.includes('relation "auto_alerts" does not exist') ||
        error.message?.includes("does not exist")
      ) {
        setErrorMsg(
          'Parece que a tabela "auto_alerts" não existe ou as políticas RLS estão ausentes. Execute o script SQL no Supabase para criar a estrutura.',
        );
      } else {
        console.error("Error fetching alerts:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) return alert("Preencha o título.");
    if (form.trigger_type === "date") {
      if (!form.trigger_date || !form.warning_days) {
        return alert("Preencha a data e a antecedência em dias.");
      }
    }
    if (form.trigger_type === "km") {
      if (!form.interval_km || !form.last_km || !form.warning_km) {
        return alert(
          "Preencha os campos de Último KM, Intervalo e Antecedência.",
        );
      }
    }
    if (form.target_type === "vehicle" && !form.target_vehicle_id)
      return alert("Selecione um veículo.");
    if (form.target_type === "driver" && !form.target_driver_id)
      return alert("Selecione um motorista.");

    try {
      const payload = {
        title: form.title,
        trigger_type: form.trigger_type,
        target_type: form.target_type,
        target_vehicle_id:
          form.target_type === "vehicle" ? form.target_vehicle_id : null,
        target_driver_id:
          form.target_type === "driver" ? form.target_driver_id : null,
        trigger_date: form.trigger_type === "date" ? form.trigger_date : null,
        warning_days:
          form.trigger_type === "date" ? Number(form.warning_days) : null,
        interval_km:
          form.trigger_type === "km" ? Number(form.interval_km) : null,
        last_km: form.trigger_type === "km" ? Number(form.last_km) : null,
        warning_km: form.trigger_type === "km" ? Number(form.warning_km) : null,
        generate_issue:
          form.target_type === "vehicle" ? form.generate_issue : false,
        company_id: user?.company_id,
      };

      if (form.id) {
        const { error } = await supabase
          .from("auto_alerts")
          .update(payload)
          .eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("auto_alerts").insert([payload]);
        if (error) throw error;
      }

      setShowForm(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      if (error.message?.includes('relation "auto_alerts" does not exist')) {
        setErrorMsg(
          'A tabela "auto_alerts" não existe. Solicite a criação executando o SQL exibido na tela.',
        );
        setShowForm(false);
      } else {
        alert("Erro ao salvar: " + error.message);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este alerta?")) return;
    try {
      const { error } = await supabase
        .from("auto_alerts")
        .delete()
        .eq("id", id);
      if (error) throw error;
      fetchData();
    } catch (error: any) {
      alert("Erro ao excluir: " + error.message);
    }
  };

  const resetForm = () => {
    setForm({
      id: "",
      title: "",
      trigger_type: "km",
      target_type: "vehicle",
      target_vehicle_id: "",
      target_driver_id: "",
      trigger_date: "",
      warning_days: "",
      interval_km: "",
      last_km: "",
      warning_km: "",
      generate_issue: false,
    });
  };

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch = alert.title
      ?.toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesTrigger =
      triggerFilter === "all" || alert.trigger_type === triggerFilter;
    const matchesTarget =
      targetFilter === "all" || alert.target_type === targetFilter;
    return matchesSearch && matchesTrigger && matchesTarget;
  });

  if (errorMsg) {
    return (
      <div className="bg-white p-6 rounded-3xl border border-app-border shadow-sm">
        <h3 className="text-sm font-black text-danger uppercase tracking-tight mb-2">
          Atenção!
        </h3>
        <p className="text-sm text-zinc-600 mb-4">{errorMsg}</p>
        <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl overflow-x-auto text-xs font-mono text-zinc-600">
          <pre>
            {`-- 1. Criar tabela auto_alerts
CREATE TABLE IF NOT EXISTS auto_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id),
    title TEXT NOT NULL,
    trigger_type TEXT NOT NULL, -- 'date' ou 'km'
    target_type TEXT NOT NULL, -- 'vehicle' ou 'driver'
    target_vehicle_id UUID REFERENCES public.vehicles(id),
    target_driver_id UUID REFERENCES public.profiles(id),
    trigger_date DATE,
    warning_days NUMERIC,
    interval_km NUMERIC,
    last_km NUMERIC,
    warning_km NUMERIC,
    generate_issue BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE auto_alerts ENABLE ROW LEVEL SECURITY;

-- Aplicar Policies
CREATE POLICY "Users can manage auto_alerts for their company"
ON public.auto_alerts FOR ALL TO authenticated
USING (company_id = get_default_company_id())
WITH CHECK (company_id = get_default_company_id());

-- 2. Adicionar coluna na tabela de checklist_issues para ligar à pendência
ALTER TABLE public.checklist_issues ADD COLUMN IF NOT EXISTS auto_alert_id UUID REFERENCES public.auto_alerts(id);

-- 3. Remover quaisquer triggers automáticos de baixa no checklist_submissions
DROP TRIGGER IF EXISTS trigger_auto_reset_alert_on_submission ON public.checklist_submissions;
DROP TRIGGER IF EXISTS trigger_reset_auto_alert ON public.checklist_issues;
DROP FUNCTION IF EXISTS reset_auto_alert_on_resolve();`}
          </pre>
        </div>
        <button
          onClick={() => fetchData()}
          className="mt-6 px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-md hover:bg-primary-hover transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-text-main tracking-tight">
            Regras de Alertas
          </h2>
          <p className="text-sm text-text-muted">
            Programe alertas por data ou intervalo de KM e auto-gere pendências.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-primary-hover transition-colors shrink-0"
        >
          <Plus size={16} /> Novo Alerta
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-2xl border border-app-border shadow-sm">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-zinc-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar regra de alerta..."
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter size={14} className="text-zinc-400" />
            </div>
            <select
              value={triggerFilter}
              onChange={(e) => setTriggerFilter(e.target.value)}
              className="pl-9 pr-8 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none"
            >
              <option value="all">Todos Tipos</option>
              <option value="km">Por KM</option>
              <option value="date">Por Data</option>
            </select>
          </div>
          <select
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value)}
            className="px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="all">Todos Públicos</option>
            <option value="vehicle">Veículos</option>
            <option value="driver">Motoristas</option>
          </select>
        </div>
      </div>

      {showForm &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-6 rounded-3xl border border-app-border shadow-xl w-full max-w-2xl relative my-auto"
            >
              <button
                onClick={() => setShowForm(false)}
                className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              <h3 className="text-lg font-black text-text-main mb-6">
                {form.id ? "Editar Alerta" : "Novo Alerta"}
              </h3>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">
                    Título do Alerta
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                    placeholder="Ex: Troca de Óleo, Renovação CNH..."
                    className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">
                      Tipo de Gatilho
                    </label>
                    <div className="flex bg-app-bg rounded-xl border border-app-border p-1">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, trigger_type: "km" })}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${form.trigger_type === "km" ? "bg-white shadow text-primary" : "text-zinc-500"}`}
                      >
                        KM ou Intervalo
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({ ...form, trigger_type: "date" })
                        }
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${form.trigger_type === "date" ? "bg-white shadow text-primary" : "text-zinc-500"}`}
                      >
                        Por Data
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">
                      Público / Vínculo
                    </label>
                    <div className="flex bg-app-bg rounded-xl border border-app-border p-1">
                      <button
                        type="button"
                        onClick={() =>
                          setForm({ ...form, target_type: "vehicle" })
                        }
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${form.target_type === "vehicle" ? "bg-white shadow text-primary" : "text-zinc-500"}`}
                      >
                        Veículo
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setForm({ ...form, target_type: "driver" })
                        }
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${form.target_type === "driver" ? "bg-white shadow text-primary" : "text-zinc-500"}`}
                      >
                        Motorista
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {form.target_type === "vehicle" ? (
                    <div>
                      <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">
                        Selecione o Veículo
                      </label>
                      <select
                        value={form.target_vehicle_id}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            target_vehicle_id: e.target.value,
                          })
                        }
                        className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      >
                        <option value="">Selecione...</option>
                        {vehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.plate}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">
                        Selecione o Motorista
                      </label>
                      <select
                        value={form.target_driver_id}
                        onChange={(e) =>
                          setForm({ ...form, target_driver_id: e.target.value })
                        }
                        className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      >
                        <option value="">Selecione...</option>
                        {drivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.full_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {form.trigger_type === "km" ? (
                    <>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">
                          Último KM (Ex: 100000)
                        </label>
                        <input
                          type="number"
                          value={form.last_km}
                          onChange={(e) =>
                            setForm({ ...form, last_km: e.target.value })
                          }
                          placeholder="KM atual/última troca"
                          className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">
                          Intervalo KM (Ex: 50000)
                        </label>
                        <input
                          type="number"
                          value={form.interval_km}
                          onChange={(e) =>
                            setForm({ ...form, interval_km: e.target.value })
                          }
                          placeholder="A cada quantos KM?"
                          className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">
                          Antecedência (Ex: 5000)
                        </label>
                        <input
                          type="number"
                          value={form.warning_km}
                          onChange={(e) =>
                            setForm({ ...form, warning_km: e.target.value })
                          }
                          placeholder="Avisar faltando quantos KM?"
                          className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">
                          Data de Vencimento / Próxima data
                        </label>
                        <input
                          type="date"
                          value={form.trigger_date}
                          onChange={(e) =>
                            setForm({ ...form, trigger_date: e.target.value })
                          }
                          className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-zinc-500 mb-1">
                          Antecedência (Ex: 15 dias)
                        </label>
                        <input
                          type="number"
                          value={form.warning_days}
                          onChange={(e) =>
                            setForm({ ...form, warning_days: e.target.value })
                          }
                          placeholder="Avisar faltando quantos dias?"
                          className="w-full bg-app-bg border border-app-border rounded-xl px-4 py-3 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </>
                  )}
                </div>

                {form.target_type === "vehicle" && (
                  <div className="pt-2">
                    <label className="flex items-center gap-3 p-4 border border-indigo-100 bg-indigo-50/50 rounded-xl cursor-pointer">
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={form.generate_issue}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              generate_issue: e.target.checked,
                            })
                          }
                          className="peer sr-only"
                        />
                        <div className="w-10 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-indigo-900">
                          Gerar Pendência Automaticamente
                        </span>
                        <span className="text-xs text-indigo-600/80">
                          Ao atingir a condição, uma pendência (resolvida apenas
                          no painel) aparecerá para o motorista no aplicativo.
                        </span>
                      </div>
                    </label>
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-4 border-t border-app-border mt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-zinc-500 hover:bg-zinc-100 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-md hover:bg-primary-hover transition-colors"
                  >
                    Salvar Alerta
                  </button>
                </div>
              </form>
            </motion.div>
          </div>,
          document.body,
        )}

      {loading ? (
        <div className="py-10 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="space-y-4">
          <div className="bg-app-bg border border-dashed border-app-border rounded-3xl p-8 flex flex-col items-center justify-center text-center">
            <AlertTriangle size={48} className="text-amber-500/80 mb-3" />
            <h3 className="text-base font-bold text-zinc-800 tracking-tight font-sans">
              Nenhum alerta exibido na tela
            </h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-md font-sans">
              Se você possui regras cadastradas diretamente no banco Supabase (ex: 98 alertas) mas elas não estão aparecendo, o Supabase está bloqueando a leitura pelo <strong>Row Level Security (RLS)</strong>.
            </p>

            <div className="mt-4 p-4 bg-zinc-900 text-amber-300 rounded-2xl text-left max-w-xl w-full font-mono text-[11px] overflow-x-auto shadow-inner relative group">
              <p className="text-zinc-400 text-[10px] uppercase font-sans font-bold mb-2">Execute este SQL no Supabase Editor para liberar o acesso:</p>
              <pre className="select-all">
{`ALTER TABLE public.auto_alerts DISABLE ROW LEVEL SECURITY;`}
              </pre>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText("ALTER TABLE public.auto_alerts DISABLE ROW LEVEL SECURITY;");
                  alert("Código SQL copiado! Cole no SQL Editor do Supabase para aplicar.");
                }}
                className="mt-3 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-lg text-xs transition-colors font-sans"
              >
                Copiar Comando SQL RLS
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-white p-5 rounded-3xl border border-app-border shadow-sm flex flex-col group relative"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  {alert.trigger_type === "date" ? (
                    <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500">
                      <Calendar size={14} />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-500">
                      <Navigation size={14} />
                    </div>
                  )}
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    {alert.trigger_type === "date"
                      ? "Por Data"
                      : "Por Odomêtro"}
                  </span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setSelectedAlertForHistory(alert)}
                    className="p-1.5 text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 text-[11px] font-bold"
                    title="Ver Histórico de Manutenções"
                  >
                    <History size={14} /> Histórico
                  </button>
                  <button
                    onClick={() => {
                      setForm({
                        id: alert.id,
                        title: alert.title,
                        trigger_type: alert.trigger_type,
                        target_type: alert.target_type,
                        target_vehicle_id: alert.target_vehicle_id || "",
                        target_driver_id: alert.target_driver_id || "",
                        trigger_date: alert.trigger_date || "",
                        warning_days: alert.warning_days
                          ? alert.warning_days.toString()
                          : "",
                        interval_km: alert.interval_km
                          ? alert.interval_km.toString()
                          : "",
                        last_km: alert.last_km ? alert.last_km.toString() : "",
                        warning_km: alert.warning_km
                          ? alert.warning_km.toString()
                          : "",
                        generate_issue: alert.generate_issue,
                      });
                      setShowForm(true);
                    }}
                    className="p-1.5 text-zinc-400 hover:text-primary transition-colors bg-zinc-50 rounded-lg"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(alert.id)}
                    className="p-1.5 text-zinc-400 hover:text-danger transition-colors bg-zinc-50 rounded-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <h3
                className="text-base font-black text-text-main mb-1 truncate"
                title={alert.title}
              >
                {alert.title}
              </h3>

              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-text-muted bg-app-bg px-2 py-0.5 rounded-md font-medium truncate">
                  {alert.target_type === "vehicle" && alert.vehicles
                    ? `🚗 ${alert.vehicles.plate}`
                    : alert.profiles
                      ? `👤 ${alert.profiles.full_name}`
                      : "Global"}
                </span>
              </div>

              <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-app-border/60">
                {alert.trigger_type === "km" && (
                  <div className="flex flex-col text-xs text-zinc-500 space-y-1">
                    <div className="flex justify-between items-center">
                      <span>Última Execução/KM:</span>
                      <span className="font-mono font-medium text-text-main">
                        {Number(alert.last_km).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Intervalo:</span>
                      <span className="font-mono font-medium text-text-main">
                        a cada{" "}
                        {Number(alert.interval_km).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-orange-50/50 p-1.5 rounded text-orange-700 mt-1">
                      <span className="font-bold">Aviso próximo de:</span>
                      <span className="font-mono font-black">
                        {Number(
                          alert.last_km + alert.interval_km - alert.warning_km,
                        ).toLocaleString("pt-BR")}
                      </span>
                    </div>
                  </div>
                )}
                {alert.trigger_type === "date" && (
                  <div className="flex flex-col text-xs text-zinc-500 space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">Data Alvo/Vencimento:</span>
                      <span className="font-mono font-black text-orange-600">
                        {alert.trigger_date.split("-").reverse().join("/")}
                      </span>
                    </div>
                    {alert.warning_days && (
                      <div className="flex justify-between items-center bg-orange-50/50 p-1.5 rounded text-orange-700 mt-1">
                        <span className="font-bold">
                          Avisar com antecedência de:
                        </span>
                        <span className="font-mono">
                          {alert.warning_days} dias
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {alert.generate_issue && (
                  <div className="flex justify-between items-center text-xs text-indigo-600/80 bg-indigo-50/50 p-2 rounded-lg mt-1 font-bold">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 size={12} /> Auto. Pendência
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedAlertForHistory && (
        <AlertHistoryModal
          isOpen={!!selectedAlertForHistory}
          alert={selectedAlertForHistory}
          onClose={() => setSelectedAlertForHistory(null)}
        />
      )}
    </div>
  );
}
