import React, { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabase";
import { motion } from "framer-motion";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";
import { useConfirm } from "@/src/modules/shared/contexts/ConfirmContext";
import { Search, MessageCircle, RefreshCw, Plus, X } from "lucide-react";
import Select from "react-select";
import SchedulePrintModal from "./SchedulePrintModal";

interface SchedulesTabProps {
  onViewChecklist: (checklistId: string) => void;
}

export default function SchedulesTab({ onViewChecklist }: SchedulesTabProps) {
  const { user } = useAuth();
  const { showConfirm } = useConfirm();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [trailers, setTrailers] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [baits, setBaits] = useState<any[]>([]);
  const [selectedPrintSchedule, setSelectedPrintSchedule] = useState<any | null>(null);

  const todayLocal = new Date();
  todayLocal.setMinutes(
    todayLocal.getMinutes() - todayLocal.getTimezoneOffset(),
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filterDate, setFilterDate] = useState(
    todayLocal.toISOString().split("T")[0],
  );
  const [filterOrigin, setFilterOrigin] = useState("");

  const [scheduleForm, setScheduleForm] = useState({
    id: "",
    driver_id: "",
    vehicle_id: "",
    trailer_id: "",
    route_id: "",
    start_at: "",
    end_at: "",
    bait1_id: "",
    bait2_id: "",
    bait3_id: "",
    requires_fueling: true,
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const formatForLabel = (dateString: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleString([], {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  const formatForInput = (dateString: string) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Build local start and end of day to query UTC boundaries correctly
      const localStart = new Date(`${filterDate}T00:00:00`);
      const localEnd = new Date(`${filterDate}T23:59:59.999`);

      const { data } = await supabase.from("schedules").select("*, profiles(*), vehicles(plate, type), trailers(plate), routes(origin, destination, stops), bait1:baits!schedules_bait1_id_fkey(name), bait2:baits!schedules_bait2_id_fkey(name), bait3:baits!schedules_bait3_id_fkey(name)")
        .eq("company_id", user?.company_id)
        .gte("start_at", localStart.toISOString())
        .lte("start_at", localEnd.toISOString())
        .order("start_at", { ascending: false });
      setSchedules(data || []);

      const { data: d } = await supabase.from("profiles").select("*").eq("company_id", user?.company_id)
        .eq("role", "driver");
      setUsers(d || []);
      const { data: v } = await supabase.from("vehicles").select("id, plate, requires_trailer, modality_id").eq("company_id", user?.company_id)
        .eq("active", true);
      setVehicles(v || []);
      const { data: t } = await supabase.from("trailers").select("id, plate").eq("company_id", user?.company_id)
        .eq("active", true);
      setTrailers(t || []);
      const { data: r } = await supabase.from("routes").select("id, origin, destination, stops, distance_km").eq("company_id", user?.company_id)
        .eq("active", true);
      setRoutes(r || []);
      const { data: b } = await supabase.from("baits").select("id, name").eq("company_id", user?.company_id)
        .eq("active", true)
        .order("name");
      setBaits(b || []);
    } catch (error) {
      console.error("Error fetching schedule data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto fix the trigger bug ONCE
    const fixTrigger = async () => {
      try {
        const sql = `
CREATE OR REPLACE FUNCTION public.restrict_schedule_driver_updates()
RETURNS TRIGGER AS $$
DECLARE
  current_role TEXT;
BEGIN
  SELECT role INTO current_role FROM public.profiles WHERE id = auth.uid();
  IF COALESCE(current_role, '') NOT IN ('admin', 'superadmin', 'standard') THEN
    IF NEW.driver_id IS DISTINCT FROM OLD.driver_id OR
       NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id OR
       NEW.trailer_id IS DISTINCT FROM OLD.trailer_id OR
       NEW.route_id IS DISTINCT FROM OLD.route_id OR
       NEW.start_at IS DISTINCT FROM OLD.start_at OR
       NEW.end_at IS DISTINCT FROM OLD.end_at OR
       NEW.bait1_id IS DISTINCT FROM OLD.bait1_id OR
       NEW.bait2_id IS DISTINCT FROM OLD.bait2_id OR
       NEW.bait3_id IS DISTINCT FROM OLD.bait3_id THEN
      RAISE EXCEPTION 'Acesso negado: Motoristas não possuem permissão para repactuar rotas e vinculadores da escala.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
`;
        await supabase.rpc("exec_sql", { sql });
      } catch (err) {}
    };
    fixTrigger();
  }, []);

  useEffect(() => {
    fetchData();
  }, [filterDate]);

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !scheduleForm.driver_id ||
      !scheduleForm.vehicle_id ||
      !scheduleForm.route_id
    ) {
      alert(
        "Por favor, preencha os campos obrigatórios (Motorista, Veículo e Rota).",
      );
      return;
    }

    setSaving(true);
    try {
      // Parse local dates explicitly to avoid browser timezone quirks
      const parseLocal = (localString: string) => {
        const [year, month, day, hour, minute] = localString
          .split(/[-T:]/)
          .map(Number);
        return new Date(year, month - 1, day, hour, minute).toISOString();
      };

      const dataToInsert = {
        driver_id: scheduleForm.driver_id || null,
        vehicle_id: scheduleForm.vehicle_id || null,
        trailer_id: scheduleForm.trailer_id || null,
        route_id: scheduleForm.route_id || null,
        bait1_id: scheduleForm.bait1_id || null,
        bait2_id: scheduleForm.bait2_id || null,
        bait3_id: scheduleForm.bait3_id || null,
        start_at: parseLocal(scheduleForm.start_at),
        end_at: parseLocal(scheduleForm.end_at),
        requires_fueling: scheduleForm.requires_fueling,
      };

      if (scheduleForm.id) {
        const { error } = await supabase
          .from("schedules")
          .update(dataToInsert)
          .eq("id", scheduleForm.id);
        if (error) throw error;
        alert("Escala atualizada!");
      } else {
        const { data: newSchedules, error } = await supabase
          .from("schedules")
          .insert([dataToInsert])
          .select();
        if (error) throw error;

        const newSchedule = newSchedules[0];

        const startBuffer = new Date(dataToInsert.start_at);
        startBuffer.setHours(startBuffer.getHours() - 12);
        const endBuffer = new Date(dataToInsert.end_at);
        endBuffer.setHours(endBuffer.getHours() + 12);

        // Search for any manual checklists for this driver within the schedule timeframe
        let query = supabase.from("checklist_submissions").select("id, type").eq("company_id", user?.company_id)
          .eq("driver_id", dataToInsert.driver_id)
          .gte("created_at", startBuffer.toISOString())
          .lte("created_at", endBuffer.toISOString());

        const { data: checklists } = await query;

        if (checklists && checklists.length > 0) {
          const updateData: any = {};

          for (const c of checklists) {
            if (c.type === "start" && !updateData.start_checklist_id)
              updateData.start_checklist_id = c.id;
            if (c.type === "end" && !updateData.end_checklist_id)
              updateData.end_checklist_id = c.id;
            if ((c.type === "fuel" || c.type === "Abastecimento") && !updateData.fuel_checklist_id)
              updateData.fuel_checklist_id = c.id;
          }

          if (Object.keys(updateData).length > 0) {
            await supabase
              .from("schedules")
              .update(updateData)
              .eq("id", newSchedule.id);
          }
        }

        alert("Escala agendada!");
      }

      setScheduleForm({
        id: "",
        driver_id: "",
        vehicle_id: "",
        trailer_id: "",
        route_id: "",
        start_at: "",
        end_at: "",
        bait1_id: "",
        bait2_id: "",
        bait3_id: "",
        requires_fueling: true,
      });
      setIsFormOpen(false);
      fetchData();
    } catch (error: any) {
      alert("Erro: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id: string, hasChecklist: boolean) => {
    if (hasChecklist) {
      alert("Não é possível excluir uma escala que já tem checklist iniciado.");
      return;
    }
    showConfirm(
      "Tem certeza que deseja excluir esta escala?",
      async () => {
        try {
          await supabase.from("schedules").delete().eq("id", id);
          fetchData();
        } catch (error: any) {
          alert("Erro: " + error.message);
        }
      },
      { isDanger: true },
    );
  };

  const handleSyncAppChecklists = async () => {
    setLoading(true);
    try {
      const targetSchedules = schedules.filter((sch) =>
        filterOrigin ? sch.routes?.origin === filterOrigin : true,
      );

      if (!targetSchedules || targetSchedules.length === 0) {
        alert("Nenhuma escala encontrada no filtro atual para sincronizar.");
        setLoading(false);
        return;
      }

      let syncedCount = 0;

      for (const schedule of targetSchedules) {
        // Broaden the timeframe considerably (±12 horas) for manual checkins
        const startBuffer = new Date(schedule.start_at);
        startBuffer.setHours(startBuffer.getHours() - 12);
        const endBuffer = new Date(schedule.end_at);
        endBuffer.setHours(endBuffer.getHours() + 12);

        // Query unlinked checklists for this schedule's timeframe and driver
        let query = supabase.from("checklist_submissions").select("id, type").eq("company_id", user?.company_id)
          .eq("driver_id", schedule.driver_id)
          .gte("created_at", startBuffer.toISOString())
          .lte("created_at", endBuffer.toISOString());

        const { data: unlinkedChecklists } = await query;

        if (unlinkedChecklists && unlinkedChecklists.length > 0) {
          const scheduleUpdateData: any = {};

          for (const c of unlinkedChecklists) {
            if (
              c.type === "start" &&
              !schedule.start_checklist_id &&
              !scheduleUpdateData.start_checklist_id
            )
              scheduleUpdateData.start_checklist_id = c.id;
            if (
              c.type === "end" &&
              !schedule.end_checklist_id &&
              !scheduleUpdateData.end_checklist_id
            )
              scheduleUpdateData.end_checklist_id = c.id;
            if (
              (c.type === "fuel" || c.type === "Abastecimento") &&
              !schedule.fuel_checklist_id &&
              !scheduleUpdateData.fuel_checklist_id
            )
              scheduleUpdateData.fuel_checklist_id = c.id;

            syncedCount++;
          }

          if (Object.keys(scheduleUpdateData).length > 0) {
            await supabase
              .from("schedules")
              .update(scheduleUpdateData)
              .eq("id", schedule.id);
          }
        }
      }

      alert(
        `Sincronização concluída. ${syncedCount} checklists do APP foram vinculados às escalas correspondentes.`,
      );
      fetchData();
    } catch (error: any) {
      alert("Erro na sincronização: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (sch: any) => {
    setIsFormOpen(true);
    setScheduleForm({
      id: sch.id,
      driver_id: sch.driver_id || "",
      vehicle_id: sch.vehicle_id || "",
      trailer_id: sch.trailer_id || "",
      route_id: sch.route_id || "",
      bait1_id: sch.bait1_id || "",
      bait2_id: sch.bait2_id || "",
      bait3_id: sch.bait3_id || "",
      start_at: formatForInput(sch.start_at),
      end_at: formatForInput(sch.end_at),
      requires_fueling: sch.requires_fueling ?? true,
    });
  };

  if (loading && !schedules.length) {
    return (
      <div className="p-8 text-center text-text-muted font-bold text-xs">
        Carregando Escalas...
      </div>
    );
  }

  const uniqueOrigins = Array.from(new Set(routes.map((r) => r.origin))).sort();
  const filteredSchedules = schedules.filter((sch) =>
    filterOrigin ? sch.routes?.origin === filterOrigin : true,
  );


  const getRouteText = (r: any) => {
    if (!r) return "";
    let text = `${r.origin} → ${r.destination}`;
    if (Array.isArray(r.stops)) {
      const validStops = r.stops.filter((s) => typeof s === 'string' && !s.startsWith("__MODALITY:"));
      if (validStops.length > 0) {
        text = `${r.origin} → ${validStops.join(" → ")} → ${r.destination}`;
      }
    }
    return text;
  };

  const exportToWhatsApp = () => {
    let message = `*ESCALAS - ${new Date(`${filterDate}T12:00:00`).toLocaleDateString()}* - ${filterOrigin || "Todas as Origens"}

`;

    filteredSchedules.forEach((sch, index) => {
      const start = new Date(sch.start_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const end = new Date(sch.end_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      message += `*${index + 1}. MOTORISTA:* ${sch.profiles?.full_name}
`;
      message += `*VEÍCULO:* ${sch.vehicles?.type || "Não definido"}
`;
      message += `*PLACA:* ${sch.vehicles?.plate}${sch.trailers?.plate ? ` | REB: ${sch.trailers.plate}` : ""}
`;
      let routeText = getRouteText(sch.routes);
      message += `*ROTA:* ${routeText}
`;
      message += `*SAÍDA:* ${start}
`;
      message += `*CHEGADA:* ${end}
`;

      const baits = [sch.bait1?.name, sch.bait2?.name, sch.bait3?.name].filter(
        Boolean,
      );
      if (baits.length > 0) {
        message += `*ISCAS:* ${baits.join(", ")}
`;
      }
      message += `
`;
    });

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");
  };

  return (
    <div className="grid grid-cols-1 gap-6 items-start">
      <div className="bento-card !p-0">
        <div className="p-5 border-b border-app-border flex flex-col justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Escalas Agendadas
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSyncAppChecklists}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors shadow-sm"
                title="Vincular checklists do App com as Escalas correspondentes"
              >
                <RefreshCw size={14} />
                Vincular APP
              </button>
              <button
                type="button"
                onClick={() => { setScheduleForm({ id: "", driver_id: "", vehicle_id: "", trailer_id: "", route_id: "", start_at: "", end_at: "", bait1_id: "", bait2_id: "", bait3_id: "", requires_fueling: true }); setIsFormOpen(true); }}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors shadow-sm"
              >
                <Plus size={14} />
                Nova Escala
              </button>
              {filteredSchedules.length > 0 && (
                <button
                  onClick={exportToWhatsApp}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors shadow-sm"
                >
                  <MessageCircle size={14} />
                  WhatsApp
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider hidden sm:inline-block">
                Origem:
              </span>
              <select
                className="h-10 px-3 rounded-lg border border-app-border bg-app-bg text-[11px] font-bold outline-none focus:border-primary transition-all max-w-[150px]"
                value={filterOrigin}
                onChange={(e) => setFilterOrigin(e.target.value)}
              >
                <option value="">Todas</option>
                {uniqueOrigins.map((o) => (
                  <option key={o as string} value={o as string}>
                    {o as string}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider hidden sm:inline-block">
                Data:
              </span>
              <input
                type="date"
                className="h-10 px-3 rounded-lg border border-app-border bg-app-bg text-[11px] font-bold outline-none focus:border-primary transition-all"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />
              <button
                onClick={fetchData}
                className="h-10 px-3 flex items-center justify-center bg-zinc-100 rounded-lg text-text-muted hover:bg-zinc-200 transition-colors"
              >
                <Search size={14} />
              </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto text-left min-h-[300px]">
          {loading ? (
            <div className="p-8 text-center text-text-muted font-bold text-xs">
              Carregando...
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div className="p-8 text-center text-text-muted font-bold text-xs uppercase tracking-widest">
              Nenhuma escala programada para{" "}
              {new Date(`${filterDate}T12:00:00`).toLocaleDateString()}
            </div>
          ) : (
            <div className="overflow-x-auto w-full"><table className="w-full whitespace-nowrap">
              <thead className="bg-app-bg/50">
                <tr>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                    Motorista
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                    Início/Fim
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                    Rota/Placa
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                    Checklists
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {filteredSchedules.map((sch) => {
                  const hasChecklist = !!(
                    sch.start_checklist_id ||
                    sch.end_checklist_id ||
                    sch.fuel_checklist_id
                  );
                  const createdTime = sch.created_at
                    ? new Date(sch.created_at).getTime()
                    : new Date(sch.start_at).getTime();
                  const isWithinOneHour =
                    Date.now() - createdTime <= 60 * 60 * 1000;

                  const canEdit =
                    !hasChecklist &&
                    (user?.role === "admin" || isWithinOneHour);
                  const canDelete = user?.role === "admin" && !hasChecklist;

                  return (
                    <tr key={sch.id} className="hover:bg-app-bg/30">
                      <td className="px-5 py-4">
                        <span className="text-xs font-bold text-text-main">
                          {sch.profiles?.full_name}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[10px] font-medium text-text-muted">
                        {formatForLabel(sch.start_at)}
                        <br />
                        {formatForLabel(sch.end_at)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-[10px] font-bold text-text-main uppercase">
                          {getRouteText(sch.routes)}
                        </div>
                        <div className="text-[9px] font-mono text-text-muted mt-0.5">
                          {sch.vehicles?.plate}
                          {sch.trailers?.plate && (
                            <span className="ml-2 text-primary font-bold">
                              | REB: {sch.trailers.plate}
                            </span>
                          )}
                        </div>
                        {(sch.bait1 || sch.bait2 || sch.bait3) && (
                          <div className="text-[9px] font-bold text-fuchsia-600 mt-1 uppercase">
                            Iscas:{" "}
                            {[sch.bait1?.name, sch.bait2?.name, sch.bait3?.name]
                              .filter(Boolean)
                              .join(", ")}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2 text-center items-center">
                          {sch.start_checklist_id ? (
                            <button
                              onClick={() =>
                                onViewChecklist(sch.start_checklist_id)
                              }
                              className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-green-100 text-green-700 hover:bg-green-200 transition-colors cursor-pointer title"
                              title="Ver Checklist"
                            >
                              Início ✓
                            </button>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-zinc-100 text-zinc-500">
                              Início ✕
                            </span>
                          )}

                          {sch.end_checklist_id ? (
                            <button
                              onClick={() =>
                                onViewChecklist(sch.end_checklist_id)
                              }
                              className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-green-100 text-green-700 hover:bg-green-200 transition-colors cursor-pointer"
                              title="Ver Checklist"
                            >
                              Fim ✓
                            </button>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-zinc-100 text-zinc-500">
                              Fim ✕
                            </span>
                          )}

                          {sch.requires_fueling && (
                            <>
                              {sch.fuel_checklist_id ? (
                                <button
                                  onClick={() =>
                                    onViewChecklist(sch.fuel_checklist_id)
                                  }
                                  className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-blue-100 text-primary hover:bg-blue-200 transition-colors cursor-pointer"
                                  title="Ver Checklist"
                                >
                                  Posto ✓
                                </button>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-zinc-100 text-zinc-500">
                                  Posto ✕
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right flex gap-3 justify-end items-center">
                        {canEdit && (
                          <button
                            onClick={() => handleEdit(sch)}
                            className="text-primary hover:underline text-[10px] font-bold"
                          >
                            Editar
                          </button>
                        )}
                        {sch.profiles?.email && sch.profiles.email.endsWith('@noemail.local') && (
                          <button
                            onClick={() => {
                              const email = sch.profiles.email;
                              const pwd = "Pw@" + btoa(email).replace(/[^a-zA-Z0-9]/g, "").substring(0, 10) + "Xy9";
                              const link = `${window.location.origin}/quick-login?e=${encodeURIComponent(email)}&p=${encodeURIComponent(pwd)}&s=${sch.id}`;
                              navigator.clipboard.writeText(link);
                              
                              const expiresAt = new Date(new Date(sch.start_at).getTime() + 24 * 60 * 60 * 1000);
                              const formatted = expiresAt.toLocaleString('pt-BR');
                              alert(`Link de acesso copiado!

Ele expira em 24h a partir do início da escala:
${formatted}`);
                            }}
                            className="text-orange-500 hover:underline text-[10px] font-bold"
                            title="Gerar link de acesso sem login"
                          >
                            Copiar Link
                          </button>
                        )}
                        {sch.profiles?.email && sch.profiles.email.endsWith('@noemail.local') && (
                          <button
                            onClick={() => setSelectedPrintSchedule(sch)}
                            className="text-blue-500 hover:underline text-[10px] font-bold ml-3"
                            title="Gerar ficha de operação com QR Code"
                          >
                            Gerar Ficha
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => deleteItem(sch.id, hasChecklist)}
                            className="text-danger hover:underline text-[10px] font-bold"
                          >
                            Excluir
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          )}
        </div>
      </div>

      
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-primary uppercase tracking-tight">
                  {scheduleForm.id ? "Editar Escala" : "Nova Escala"}
                </h3>
                <p className="text-[10px] text-text-muted font-bold italic uppercase tracking-wider">
                  {scheduleForm.id
                    ? "Atualize as informações da escala"
                    : "Atribua uma jornada a um motorista"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto">
              <form id="schedule-form" onSubmit={handleSaveSchedule} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                    Motorista
                  </label>
                  <Select
                    className="text-xs font-bold"
                    placeholder="Selecionar motorista..."
                    isClearable
                    options={users
                      .filter((u) => !u.full_name?.endsWith("//INTERNO"))
                      .map((u) => ({ value: u.id, label: u.full_name }))}
                    value={
                      users
                        .filter((u) => !u.full_name?.endsWith("//INTERNO"))
                        .map((u) => ({ value: u.id, label: u.full_name }))
                        .find((o) => o.value === scheduleForm.driver_id) || null
                    }
                    onChange={(selected) =>
                      setScheduleForm({
                        ...scheduleForm,
                        driver_id: selected ? selected.value : "",
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                    Veículo / Cavalo
                  </label>
                  <Select
                    className="text-xs font-bold"
                    placeholder="Selecionar veículo..."
                    isClearable
                    options={vehicles.filter(v => {
                      const drv = users.find(u => u.id === scheduleForm.driver_id);
                      if (!drv || !drv.modality_ids || drv.modality_ids.length === 0) return true;
                      return drv.modality_ids.includes(v.modality_id || "");
                    }).map((v) => ({
                      value: v.id,
                      label: `${v.plate} (${v.type || "N/A"})`,
                    }))}
                    value={
                      vehicles
                        .map((v) => ({
                          value: v.id,
                          label: `${v.plate} (${v.type || "N/A"})`,
                        }))
                        .find((o) => o.value === scheduleForm.vehicle_id) || null
                    }
                    onChange={(selected) => {
                      const selectedVehicle = vehicles.find(
                        (v) => v.id === selected?.value,
                      );
                      setScheduleForm({
                        ...scheduleForm,
                        vehicle_id: selected ? selected.value : "",
                        trailer_id: selectedVehicle?.requires_trailer
                          ? scheduleForm.trailer_id
                          : "",
                      });
                    }}
                  />
                </div>
                {vehicles.find((v) => v.id === scheduleForm.vehicle_id)
                  ?.requires_trailer && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                      Reboque (Obrigatório)
                    </label>
                    <Select
                      className="text-xs font-bold"
                      placeholder="Selecionar reboque..."
                      isClearable
                      options={trailers.map((t) => ({
                        value: t.id,
                        label: `${t.plate} (${t.type || "N/A"})`,
                      }))}
                      value={
                        trailers
                          .map((t) => ({
                            value: t.id,
                            label: `${t.plate} (${t.type || "N/A"})`,
                          }))
                          .find((o) => o.value === scheduleForm.trailer_id) ||
                        null
                      }
                      onChange={(selected) =>
                        setScheduleForm({
                          ...scheduleForm,
                          trailer_id: selected ? selected.value : "",
                        })
                      }
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                    Rota
                  </label>
                  <Select
                    className="text-xs font-bold"
                    placeholder="Selecionar rota..."
                    isClearable
                    options={routes.map((r) => ({
                      value: r.id,
                      label: getRouteText(r),
                    }))}
                    value={
                      routes
                        .map((r) => ({
                          value: r.id,
                          label: getRouteText(r),
                        }))
                        .find((o) => o.value === scheduleForm.route_id) || null
                    }
                    onChange={(selected) =>
                      setScheduleForm({
                        ...scheduleForm,
                        route_id: selected ? selected.value : "",
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                      Data/Hora Início
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={scheduleForm.start_at}
                      onChange={(e) =>
                        setScheduleForm({
                          ...scheduleForm,
                          start_at: e.target.value,
                        })
                      }
                      className="w-full h-10 px-3 rounded-xl border border-app-border bg-app-bg text-xs font-bold outline-none focus:border-primary transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                      Data/Hora Fim
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={scheduleForm.end_at}
                      onChange={(e) =>
                        setScheduleForm({
                          ...scheduleForm,
                          end_at: e.target.value,
                        })
                      }
                      className="w-full h-10 px-3 rounded-xl border border-app-border bg-app-bg text-xs font-bold outline-none focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scheduleForm.requires_fueling}
                      onChange={(e) =>
                        setScheduleForm({
                          ...scheduleForm,
                          requires_fueling: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                    />
                    Exigir Checklist de Abastecimento
                  </label>
                </div>
                
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest block mb-2">
                    Vincular Iscas (Opcional)
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                        Isca 1
                      </label>
                      <Select
                        className="text-[11px] font-bold"
                        placeholder="Nenhuma"
                        isClearable
                        options={baits.filter(b => b.id === scheduleForm.bait1_id || ![scheduleForm.bait2_id, scheduleForm.bait3_id].includes(b.id)).map((b) => ({ value: b.id, label: `${b.name} (${b.identifier || 'S/N'})` }))}
                        value={
                          baits
                            .map((b) => ({
                              value: b.id,
                              label: `${b.name} (${b.identifier || 'S/N'})`,
                            }))
                            .find((o) => o.value === scheduleForm.bait1_id) || null
                        }
                        onChange={(selected) =>
                          setScheduleForm({
                            ...scheduleForm,
                            bait1_id: selected ? selected.value : "",
                          })
                        }
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                        Isca 2
                      </label>
                      <Select
                        className="text-[11px] font-bold"
                        placeholder="Nenhuma"
                        isClearable
                        options={baits.filter(b => b.id === scheduleForm.bait2_id || ![scheduleForm.bait1_id, scheduleForm.bait3_id].includes(b.id)).map((b) => ({ value: b.id, label: `${b.name} (${b.identifier || 'S/N'})` }))}
                        value={
                          baits
                            .map((b) => ({
                              value: b.id,
                              label: `${b.name} (${b.identifier || 'S/N'})`,
                            }))
                            .find((o) => o.value === scheduleForm.bait2_id) || null
                        }
                        onChange={(selected) =>
                          setScheduleForm({
                            ...scheduleForm,
                            bait2_id: selected ? selected.value : "",
                          })
                        }
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                        Isca 3
                      </label>
                      <Select
                        className="text-[11px] font-bold"
                        placeholder="Nenhuma"
                        isClearable
                        options={baits.filter(b => b.id === scheduleForm.bait3_id || ![scheduleForm.bait1_id, scheduleForm.bait2_id].includes(b.id)).map((b) => ({ value: b.id, label: `${b.name} (${b.identifier || 'S/N'})` }))}
                        value={
                          baits
                            .map((b) => ({
                              value: b.id,
                              label: `${b.name} (${b.identifier || 'S/N'})`,
                            }))
                            .find((o) => o.value === scheduleForm.bait3_id) || null
                        }
                        onChange={(selected) =>
                          setScheduleForm({
                            ...scheduleForm,
                            bait3_id: selected ? selected.value : "",
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="schedule-form"
                disabled={saving}
                className="px-4 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center gap-2 hover:bg-opacity-90 transition-all shadow-sm disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>Salvar Escala</>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

<SchedulePrintModal schedule={selectedPrintSchedule} onClose={() => setSelectedPrintSchedule(null)} />
    </div>
  );
}
