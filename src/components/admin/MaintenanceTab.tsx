import React, { useState, useEffect } from "react";
import {
  Search,
  CheckCircle2,
  Download,
  X,
  ZoomIn,
  ZoomOut,
  AlertCircle,
  CheckCircle,
  Plus,
  Eye,
  Undo,
  Trash2,
  Camera,
  Gauge,
  Calendar,
  Clock,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import ManualIssueModal from "./ManualIssueModal";

export default function MaintenanceTab() {
  const { user } = useAuth();
  const [issues, setIssues] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [odometers, setOdometers] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "waiting" | "resolved" | "tracking">("pending");
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [zoom, setZoom] = useState(1);

  const [resolvingIssueData, setResolvingIssueData] = useState<any | null>(
    null,
  );
  const [modalActionType, setModalActionType] = useState<"resolve" | "delete">("resolve");
  const [selectedIdsToResolve, setSelectedIdsToResolve] = useState<string[]>(
    [],
  );
  const [resolvingIssueId, setResolvingIssueId] = useState<
    string | string[] | null
  >(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [resolveSubStatus, setResolveSubStatus] = useState<"resolved" | "waiting">("resolved");
  const [resolveNf, setResolveNf] = useState("");
  const [resolveValue, setResolveValue] = useState("");
  const [resolvePhotos, setResolvePhotos] = useState<File[]>([]);
  const [sqlError, setSqlError] = useState<string | null>(null);

  const [resolveNfs, setResolveNfs] = useState<any[]>([
    {
      id: "first",
      nf_number: "",
      nf_key: "",
      items: [{ id: "first-item", name: "", quantity: 1, unit_price: 0 }]
    }
  ]);

  const DEFAULT_CATALOG_ITEMS = [
    "Pneu Dianteiro",
    "Pneu Traseiro",
    "Pastilha de Freio",
    "Lona de Freio",
    "Troca de Óleo de Motor",
    "Filtro de Óleo",
    "Filtro de Combustível",
    "Filtro de Ar",
    "Mão de Obra Mecânica",
    "Troca de Lâmpada (Farol)",
    "Alinhamento e Balanceamento",
    "Lâmpada de Sinaleira",
    "Líquido de Arrefecimento"
  ];

  const [catalogItems, setCatalogItems] = useState<string[]>(DEFAULT_CATALOG_ITEMS);
  const [newItemName, setNewItemName] = useState("");
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);

  useEffect(() => {
    fetchIssues();
    fetchCatalog();
    fetchAlertsData();
  }, []);

  async function fetchAlertsData() {
    try {
      const { data: alertsData, error: alertsError } = await supabase
        .from("auto_alerts")
        .select(`
          *,
          vehicles (plate, model),
          profiles (full_name)
        `);

      if (!alertsError && alertsData) {
        setAlerts(alertsData);
      }

      const { data: submissions, error: subError } = await supabase
        .from("checklist_submissions")
        .select("vehicle_id, odometer, created_at")
        .order("created_at", { ascending: false });

      if (!subError && submissions) {
        const latestOdometer: Record<string, number> = {};
        submissions.forEach((sub) => {
          if (sub.vehicle_id && !latestOdometer[sub.vehicle_id]) {
            latestOdometer[sub.vehicle_id] = sub.odometer || 0;
          }
        });
        setOdometers(latestOdometer);
      }
    } catch (err) {
      console.warn("Error fetching alerts tracking data:", err);
    }
  }

  async function fetchCatalog() {
    try {
      const { data, error } = await supabase
        .from("maintenance_items_catalog")
        .select("name")
        .order("name");
      
      if (!error && data && data.length > 0) {
        const dbNames = data.map((item: any) => item.name);
        const uniqueNames = Array.from(new Set([...DEFAULT_CATALOG_ITEMS, ...dbNames]));
        setCatalogItems(uniqueNames);
      } else {
        const local = localStorage.getItem("maintenance_catalog_items");
        if (local) {
          setCatalogItems(JSON.parse(local));
        }
      }
    } catch (err) {
      console.warn("Could not load catalog from DB, using defaults:", err);
    }
  }

  async function handleRegisterCatalogItem(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    
    if (catalogItems.some(item => item.toLowerCase() === trimmed.toLowerCase())) {
      alert("Este item já está cadastrado!");
      return;
    }
    
    const updated = [...catalogItems, trimmed].sort();
    setCatalogItems(updated);
    localStorage.setItem("maintenance_catalog_items", JSON.stringify(updated));
    setNewItemName("");
    setShowAddItemDialog(false);
    
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();
        
      if (profile?.company_id) {
        await supabase.from("maintenance_items_catalog").insert({
          company_id: profile.company_id,
          name: trimmed
        });
      }
    } catch (err) {
      console.warn("Could not save registered item to Supabase", err);
    }
  }

  async function fetchIssues() {
    setLoading(true);

    try {
      const { data: issuesData, error } = await supabase
        .from("checklist_issues")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setIssues([]);
        setLoading(false);
        return;
      }

      const submissionIds = [
        ...new Set(issuesData.map((i: any) => i.submission_id)),
      ];

      const { data: submissionsData } = await supabase
        .from("checklist_submissions")
        .select("id, type")
        .in("id", submissionIds);

      const fuelSubmissionIds =
        submissionsData
          ?.filter((s: any) => s.type === "fuel")
          .map((s: any) => s.id) || [];

      const filteredIssues = issuesData.filter(
        (i: any) => !fuelSubmissionIds.includes(i.submission_id),
      );

      const vehicleIds = [
        ...new Set(
          filteredIssues.map((i: any) => i.vehicle_id).filter(Boolean),
        ),
      ];
      const trailerIds = [
        ...new Set(
          filteredIssues.map((i: any) => i.trailer_id).filter(Boolean),
        ),
      ];
      const driverIds = [
        ...new Set(filteredIssues.map((i: any) => i.driver_id).filter(Boolean)),
      ];

      let vehiclesData: any[] = [];
      if (vehicleIds.length > 0) {
        const { data } = await supabase
          .from("vehicles")
          .select("id, plate, model")
          .in("id", vehicleIds);
        vehiclesData = data || [];
      }

      let trailersData: any[] = [];
      if (trailerIds.length > 0) {
        const { data } = await supabase
          .from("trailers")
          .select("id, plate")
          .in("id", trailerIds);
        trailersData = data || [];
      }

      let driversData: any[] = [];
      if (driverIds.length > 0) {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", driverIds);
        driversData = data || [];
      }

      const issuesWithRelations = filteredIssues.map((issue: any) => ({
        ...issue,
        vehicles: vehiclesData.find((v) => v.id === issue.vehicle_id),
        trailers: trailersData.find((t) => t.id === issue.trailer_id),
        profiles: driversData.find((d) => d.id === issue.driver_id),
      }));

      // Group identical pending issues
      const groupedIssues: any[] = [];
      const pendingGroups: { [key: string]: any } = {};

      issuesWithRelations.forEach((issue: any) => {
        if (issue.status === "pending") {
          const key = `${issue.vehicle_id || "none"}-${issue.trailer_id || "none"}-${issue.item_title}`;
          if (pendingGroups[key]) {
            const exist = pendingGroups[key];
            exist.report_count = (exist.report_count || 1) + 1;
            exist.grouped_ids = [
              ...(exist.grouped_ids || [exist.id]),
              issue.id,
            ];
            exist.grouped_issues = [
              ...(exist.grouped_issues || [{ ...exist }]),
              issue,
            ];
            if (
              issue.description &&
              !exist.description?.includes(issue.description)
            ) {
              exist.description = exist.description
                ? `${exist.description} | ${issue.description}`
                : issue.description;
            }
          } else {
            // Preserve the actual report_count from the database!
            // issue.report_count = 1;
            issue.grouped_ids = [issue.id];
            issue.grouped_issues = [{ ...issue }];
            pendingGroups[key] = { ...issue };
          }
        } else {
          // Preserve the actual report_count from the database
          issue.grouped_ids = [issue.id];
          issue.grouped_issues = [issue];
          groupedIssues.push(issue);
        }
      });

      const combinedIssues = [
        ...groupedIssues,
        ...Object.values(pendingGroups),
      ];
      combinedIssues.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setIssues(combinedIssues);
      fetchAlertsData();
    } catch (error) {
      console.error(error);
    }

    setLoading(false);
  }

  function openResolveModal(issue: any, actionType: "resolve" | "delete" = "resolve") {
    setModalActionType(actionType);
    setResolvingIssueData(issue);
    setResolvingIssueId(issue.grouped_ids || [issue.id]);
    setSelectedIdsToResolve(issue.grouped_ids || [issue.id]);
    setResolveNotes(issue.status === "waiting" ? (issue.resolution_notes || "") : "");
    setResolveSubStatus("resolved");
    setResolveNf("");
    setResolveValue("");
    setResolvePhotos([]);
    setSqlError(null);
    setResolveNfs([
      {
        id: Date.now().toString(),
        nf_number: "",
        nf_key: "",
        items: [{ id: `item-${Date.now()}`, name: "", quantity: 1, unit_price: 0 }]
      }
    ]);
    setShowAddItemDialog(false);
  }

  async function confirmModalAction() {
    if (!selectedIdsToResolve || selectedIdsToResolve.length === 0) return;

    if (modalActionType === "delete") {
      if (!confirm(`Deseja realmente excluir ${selectedIdsToResolve.length} pendência(s) permanentemente?`)) return;
      setIsResolving(true);
      try {
        const { error } = await supabase
          .from("checklist_issues")
          .delete()
          .in("id", selectedIdsToResolve);
        if (error) throw error;

        setResolvingIssueId(null);
        setResolvingIssueData(null);
        setSelectedIdsToResolve([]);
        fetchIssues();
      } catch (err) {
        console.error(err);
        alert("Erro ao excluir. Tente novamente.");
      } finally {
        setIsResolving(false);
      }
      return;
    }

    if (modalActionType === "resolve" && resolveSubStatus === "waiting" && !resolveNotes.trim()) {
       alert("Por favor, informe a descrição/motivo do aguardo.");
       return;
    }

    setIsResolving(true);
    setSqlError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const uploadedPhotos: string[] = [];
      if (resolveSubStatus === "resolved") {
        for (let i = 0; i < resolvePhotos.length; i++) {
           const file = resolvePhotos[i];
           const path = `${user?.id || 'unknown'}/resolution/${Date.now()}_${i}.jpg`;
           const { error: uploadError } = await supabase.storage
              .from("checklist-photos")
              .upload(path, file);
           if (!uploadError) uploadedPhotos.push(path);
        }
      }

      const calculatedValueSum = resolveSubStatus === "resolved" ? resolveNfs.reduce((acc, nf) => {
        const nfSum = nf.items.reduce((itemAcc: number, item: any) => itemAcc + (Number(item.quantity || 1) * Number(item.unit_price || 0)), 0);
        return acc + nfSum;
      }, 0) : 0;

      const nfsJSONString = resolveSubStatus === "resolved" ? JSON.stringify(resolveNfs) : null;

      let updateError;
      try {
        const updatePayload: any = resolveSubStatus === "waiting" ? {
          status: "waiting",
          resolution_notes: resolveNotes,
          resolution_nf: null,
          resolution_nfs: null,
          resolution_value: 0,
          resolution_photos: null,
          resolved_at: null,
          resolved_by: null,
        } : {
          status: "resolved",
          resolution_notes: resolveNotes,
          resolution_nf: nfsJSONString,
          resolution_nfs: resolveNfs,
          resolution_value: calculatedValueSum,
          resolution_photos: uploadedPhotos,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        };

        const { error } = await supabase
          .from("checklist_issues")
          .update(updatePayload as any)
          .in("id", selectedIdsToResolve);
        updateError = error;
      } catch (e: any) {
        const updatePayload: any = resolveSubStatus === "waiting" ? {
          status: "waiting",
          resolution_notes: resolveNotes,
          resolution_nf: null,
          resolution_value: 0,
          resolution_photos: null,
          resolved_at: null,
          resolved_by: null,
        } : {
          status: "resolved",
          resolution_notes: resolveNotes,
          resolution_nf: nfsJSONString,
          resolution_value: calculatedValueSum,
          resolution_photos: uploadedPhotos,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        };

        const { error } = await supabase
          .from("checklist_issues")
          .update(updatePayload)
          .in("id", selectedIdsToResolve);
        updateError = error;
      }

      if (updateError) throw updateError;

      setResolvingIssueId(null);
      setResolvingIssueData(null);
      setSelectedIdsToResolve([]);
      setResolveNotes("");
      setResolveNf("");
      setResolveValue("");
      setResolvePhotos([]);
      setResolveNfs([
        {
          id: Date.now().toString(),
          nf_number: "",
          nf_key: "",
          items: [{ id: `item-${Date.now()}`, name: "", quantity: 1, unit_price: 0 }]
        }
      ]);
      setSqlError(null);
      fetchIssues();
    } catch (err) {
      console.error(err);
      alert("Erro ao resolver. Tente novamente.");
    } finally {
      setIsResolving(false);
    }
  }

  async function handleDeleteIssue(issue: any) {
    if (!confirm("Deseja realmente excluir esta pendência permanentemente?"))
      return;
    try {
      const idsToUpdate = issue.grouped_ids || [issue.id];
      const { error } = await supabase
        .from("checklist_issues")
        .delete()
        .in("id", idsToUpdate);
      if (error) throw error;
      fetchIssues();
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir pendência.");
    }
  }

  async function handleBulkDelete() {
    if (selectedRows.length === 0) return;
    if (!confirm(`Deseja realmente excluir ${selectedRows.length} pendências selecionadas permanentemente?`)) return;
    
    // gather all underlying ids from the selected row grouped_ids
    const idsToDelete: string[] = [];
    selectedRows.forEach(rowId => {
       const row = issues.find(i => i.id === rowId);
       if (row && row.grouped_ids) {
          idsToDelete.push(...row.grouped_ids);
       }
    });

    try {
      const { error } = await supabase
        .from("checklist_issues")
        .delete()
        .in("id", idsToDelete);
      if (error) throw error;
      setSelectedRows([]);
      fetchIssues();
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir pendências selecionadas.");
    }
  }

  async function handleRevertIssue(issue: any) {
    if (!confirm("Deseja reabrir esta pendência?")) return;
    try {
      const idsToUpdate = issue.grouped_ids || [issue.id];
      const { error } = await supabase
        .from("checklist_issues")
        .update({
          status: "pending",
          resolution_notes: null,
          resolved_at: null,
          resolved_by: null,
        })
        .in("id", idsToUpdate);
      if (error) throw error;
      fetchIssues();
    } catch (err) {
      console.error(err);
      alert("Erro ao reabrir pendência.");
    }
  }

  function openImageModal(issue: any) {
    if (!issue?.photo_url) return;

    const publicUrl = supabase.storage
      .from("checklist-photos")
      .getPublicUrl(issue.photo_url).data.publicUrl;

    setSelectedImage(publicUrl);
    setSelectedIssue(issue);
    setZoom(1);
  }

  async function downloadImage() {
    if (!selectedImage || !selectedIssue) return;

    const response = await fetch(selectedImage);
    const blob = await response.blob();

    const plate = selectedIssue.vehicles?.plate || "veiculo";

    const date = new Date(selectedIssue.created_at)
      .toLocaleDateString("pt-BR")
      .replace(/\//g, "-");

    const fileName = `${plate}_${date}.jpg`;

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
  }

  // Filtrar issues por status e search
  const filteredIssues = issues
    .filter((issue) => issue.status === activeTab)
    .filter(
      (issue) =>
        issue.vehicles?.plate
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        issue.item_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.profiles?.full_name
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()),
    );

  const pendingCount = issues.filter((i) => i.status === "pending").length;
  const waitingCount = issues.filter((i) => i.status === "waiting").length;
  const resolvedCount = issues.filter((i) => i.status === "resolved").length;

  const filteredAlertsForTracking = alerts.filter((alert) => {
    const titleMatch = (alert.title || "").toLowerCase().includes(searchTerm.toLowerCase());
    const vehicleMatch = (alert.vehicles?.plate || "").toLowerCase().includes(searchTerm.toLowerCase()) || (alert.vehicles?.model || "").toLowerCase().includes(searchTerm.toLowerCase());
    const driverMatch = (alert.profiles?.full_name || "").toLowerCase().includes(searchTerm.toLowerCase());
    return titleMatch || vehicleMatch || driverMatch;
  });

  return (
    <div className="space-y-6">
      {/* Abas */}
      <div className="bento-card !p-0 overflow-hidden">
        <div className="border-b border-app-border">
          <div className="flex">
            <button
              onClick={() => { setActiveTab("pending"); setSelectedRows([]); }}
              className={`flex-1 px-6 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === "pending"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-text-muted hover:text-text-main hover:bg-gray-50"
              }`}
            >
              <AlertCircle size={16} />
              Pendentes
              {pendingCount > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab("waiting"); setSelectedRows([]); }}
              className={`flex-1 px-6 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === "waiting"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-text-muted hover:text-text-main hover:bg-gray-50"
              }`}
            >
              <Clock size={16} />
              Aguardando
              {waitingCount > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-amber-100 text-amber-600 rounded-full font-bold">
                  {waitingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab("resolved"); setSelectedRows([]); }}
              className={`flex-1 px-6 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === "resolved"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-text-muted hover:text-text-main hover:bg-gray-50"
              }`}
            >
              <CheckCircle size={16} />
              Resolvidos
              {resolvedCount > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-green-100 text-green-600 rounded-full font-bold">
                  {resolvedCount}
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab("tracking"); setSelectedRows([]); }}
              className={`flex-1 px-6 py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === "tracking"
                  ? "text-primary border-b-2 border-primary bg-primary/5"
                  : "text-text-muted hover:text-text-main hover:bg-gray-50"
              }`}
            >
              <Wrench size={16} />
              Acompanhamento
              {alerts.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full font-bold font-sans">
                  {alerts.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {activeTab === "tracking" ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-app-border shadow-sm">
            <div>
              <h3 className="text-base font-black text-text-main tracking-tight flex items-center gap-2 font-sans">
                <Wrench size={18} className="text-primary text-blue-600" />
                Acompanhamento de Manutenções
              </h3>
              <p className="text-xs text-text-muted mt-1 font-sans">
                Monitore as revisões por KM e prazos por data configurados nos alertas de sua frota.
              </p>
            </div>
            
            <div className="relative w-full md:w-80">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                placeholder="Filtrar veículo, motorista ou item..."
                className="h-9 w-full pl-9 pr-4 bg-app-bg rounded-xl text-xs border border-app-border focus:ring-1 focus:ring-primary focus:outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {filteredAlertsForTracking.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-app-border shadow-sm">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wrench size={32} />
              </div>
              <h4 className="text-sm font-bold text-text-main font-sans">Nenhuma manutenção monitorada encontrada</h4>
              <p className="text-xs text-text-muted max-w-sm mx-auto mt-1 font-sans">
                Cadastre novas regras de alertas de KM ou Data na aba "Alertas" para iniciar o acompanhamento.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAlertsForTracking.map((alert) => {
                const isKm = alert.trigger_type === "km";
                
                // Dynamic Calculations
                let statusBadgeColor = "bg-green-50 text-green-700 border-green-200";
                let statusText = "Em dia";
                let progressPct = 0;
                let statsContent = null;
                
                if (isKm) {
                  const currentKm = odometers[alert.target_vehicle_id] || 0;
                  const intervalKm = Number(alert.interval_km) || 0;
                  const lastKm = Number(alert.last_km) || 0;
                  const targetKm = lastKm + intervalKm;
                  const remainingKm = targetKm - currentKm;
                  
                  if (intervalKm > 0) {
                    progressPct = ((currentKm - lastKm) / intervalKm) * 100;
                  }
                  progressPct = Math.max(0, Math.round(progressPct));
                  const clampedProgressPct = Math.min(100, progressPct);
                  
                  const isOverdue = remainingKm <= 0;
                  const isNear = remainingKm > 0 && remainingKm <= (Number(alert.warning_km) || 1000);
                  
                  if (isOverdue) {
                    statusBadgeColor = "bg-red-50 text-red-700 border-red-200 animate-pulse";
                    statusText = "Atrasada / Vencida";
                  } else if (isNear) {
                    statusBadgeColor = "bg-orange-50 text-orange-700 border-orange-200";
                    statusText = "Vence em breve";
                  }
                  
                  statsContent = (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-2 bg-zinc-50 p-3 rounded-2xl border border-zinc-100">
                        <div className="text-center">
                          <span className="text-[9px] uppercase font-black text-zinc-400 tracking-wider block font-sans">KM Atual</span>
                          <span className="text-xs font-bold text-zinc-700 font-sans">{currentKm.toLocaleString("pt-BR")} KM</span>
                        </div>
                        <div className="text-center border-x border-zinc-200">
                          <span className="text-[9px] uppercase font-black text-zinc-400 tracking-wider block font-sans">Falta</span>
                          <span className={`text-xs font-black font-sans ${isOverdue ? "text-red-650" : "text-zinc-700"}`}>
                            {isOverdue ? `${Math.abs(remainingKm).toLocaleString("pt-BR")} KM d+` : `${remainingKm.toLocaleString("pt-BR")} KM`}
                          </span>
                        </div>
                        <div className="text-center">
                          <span className="text-[9px] uppercase font-black text-zinc-400 tracking-wider block font-sans">KM Alvo</span>
                          <span className="text-xs font-bold text-primary font-mono">{targetKm.toLocaleString("pt-BR")} KM</span>
                        </div>
                      </div>
                      
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 font-sans">
                          <span>Desgaste / Intervalo ({intervalKm.toLocaleString("pt-BR")} KM)</span>
                          <span>{progressPct}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isOverdue 
                                ? "bg-red-500" 
                                : isNear 
                                ? "bg-orange-500" 
                                : "bg-green-500"
                            }`}
                            style={{ width: `${clampedProgressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  // Date-based Alert
                  let daysRemaining = 0;
                  let targetDateStr = "Não Definida";
                  let isOverdue = false;
                  let isNear = false;
                  
                  if (alert.trigger_date) {
                    const targetDate = new Date(alert.trigger_date + "T00:00:00");
                    targetDateStr = targetDate.toLocaleDateString("pt-BR");
                    
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const diffTime = targetDate.getTime() - today.getTime();
                    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    isOverdue = daysRemaining < 0;
                    isNear = daysRemaining >= 0 && daysRemaining <= (Number(alert.warning_days) || 7);
                    
                    if (isOverdue) {
                      statusBadgeColor = "bg-red-50 text-red-700 border-red-200";
                      statusText = `Atrasada (${Math.abs(daysRemaining)} d)`;
                    } else if (isNear) {
                      statusBadgeColor = "bg-orange-50 text-orange-700 border-orange-200";
                      statusText = daysRemaining === 0 ? "Vence HOJE" : `Vence em ${daysRemaining} dias`;
                    } else {
                      statusBadgeColor = "bg-green-50 text-green-700 border-green-200";
                      statusText = `Vence em ${daysRemaining} dias`;
                    }
                  }
                  
                  statsContent = (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 bg-zinc-50 p-3 rounded-2xl border border-zinc-100">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                          <Calendar size={18} />
                        </div>
                        <div className="flex-1">
                          <span className="text-[9px] uppercase font-black text-zinc-400 tracking-wider block font-sans">Agendada Para</span>
                          <span className="text-sm font-bold text-zinc-700 font-sans">{targetDateStr}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] uppercase font-black text-zinc-400 tracking-wider block font-sans">Tempo Restante</span>
                          <span className={`text-sm font-black font-sans ${isOverdue ? "text-red-555 font-black font-sans" : "text-zinc-700"}`}>
                            {isOverdue ? `Atraso ${Math.abs(daysRemaining)} d` : `${daysRemaining} dias`}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-[10px] text-zinc-400 italic text-center font-medium font-sans">
                        Alerta configurado com antecedência de {alert.warning_days || 0} dias.
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div key={alert.id} className="bg-white rounded-3xl border border-app-border p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-650 font-sans">
                              {isKm ? "Quilometragem (KM)" : "Calendário (Data)"}
                            </span>
                            <span className={`text-[9px] font-bold uppercase tracking-wide border px-2 py-0.5 rounded-full font-sans ${statusBadgeColor}`}>
                              {statusText}
                            </span>
                          </div>
                          <h4 className="text-sm font-black text-text-main line-clamp-1 font-sans" title={alert.title}>
                            {alert.title}
                          </h4>
                        </div>
                        <div className="p-2 bg-primary/5 text-primary rounded-xl shrink-0">
                          {isKm ? <Gauge size={16} /> : <Calendar size={16} />}
                        </div>
                      </div>
                      
                      {/* Targets */}
                      <div className="border-t border-zinc-100 pt-3 space-y-1 text-xs text-text-muted">
                        {alert.vehicles && (
                          <div className="flex justify-between font-sans">
                            <span>Veículo:</span>
                            <span className="font-bold text-text-main">{alert.vehicles.plate} {alert.vehicles.model ? `(${alert.vehicles.model})` : ""}</span>
                          </div>
                        )}
                        {alert.profiles && (
                          <div className="flex justify-between font-sans">
                            <span>Motorista:</span>
                            <span className="font-bold text-text-main">{alert.profiles.full_name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-zinc-100 pt-4">
                      {statsContent}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Lista de Pendências */
        <div className="bento-card !p-0 overflow-hidden">
        <div className="p-5 border-b border-app-border flex items-center justify-between">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
            {activeTab === "pending"
              ? "Pendências de Manutenção"
              : activeTab === "waiting"
                ? "Manutenções em Aguardo"
                : "Manutenções Resolvidas"}
          </span>

          <div className="flex items-center gap-4">
            {selectedRows.length > 0 && (activeTab === "pending" || activeTab === "waiting") && user?.role === "admin" && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors uppercase tracking-wider"
              >
                <Trash2 size={14} />
                Excluir ({selectedRows.length})
              </button>
            )}

            <button
              onClick={() => setIsManualModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors uppercase tracking-wider"
            >
              <Plus size={14} />
              Lançar Nova
            </button>

            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />

              <input
                type="text"
                placeholder="Filtrar placa, item ou motorista..."
                className="h-8 pl-9 pr-4 bg-app-bg rounded-lg text-[10px] border border-app-border w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {filteredIssues.length === 0 && !loading ? (
          <div className="text-center py-12">
            <div className="flex flex-col items-center gap-3">
              {activeTab === "pending" ? (
                <>
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
                    <CheckCircle2 size={32} className="text-green-500" />
                  </div>
                  <p className="text-sm text-gray-500">
                    Nenhuma pendência encontrada!
                  </p>
                  <p className="text-xs text-gray-400">
                    Todas as manutenções estão em dia.
                  </p>
                </>
              ) : activeTab === "waiting" ? (
                <>
                  <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center">
                    <Clock size={32} className="text-amber-500" />
                  </div>
                  <p className="text-sm text-gray-500">
                    Nenhuma pendência em aguardo encontrada!
                  </p>
                  <p className="text-xs text-gray-400">
                    Insira itens em "Aguardando" se precisar aguardar peças ou serviços.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                    <CheckCircle size={32} className="text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">
                    Nenhuma manutenção resolvida encontrada.
                  </p>
                  <p className="text-xs text-gray-400">
                    As manutenções resolvidas aparecerão aqui.
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-app-bg/50">
                <tr>
                  {(activeTab === "pending" || activeTab === "waiting") && user?.role === "admin" && (
                    <th className="px-5 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedRows.length === filteredIssues.length && filteredIssues.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRows(filteredIssues.map(i => i.id));
                          } else {
                            setSelectedRows([]);
                          }
                        }}
                        className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                    </th>
                  )}
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                    Data
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                    Veículo
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                    Motorista
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                    Item
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">
                    Foto
                  </th>
                  <th className="px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest text-right">
                    Ação
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-app-border">
                {filteredIssues.map((issue) => {
                  const imageUrl = issue.photo_url
                    ? supabase.storage
                        .from("checklist-photos")
                        .getPublicUrl(issue.photo_url).data.publicUrl
                    : null;

                  return (
                    <tr
                      key={issue.id}
                      className={`transition-colors ${selectedRows.includes(issue.id) ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-gray-50'}`}
                    >
                      {(activeTab === "pending" || activeTab === "waiting") && user?.role === "admin" && (
                        <td className="px-5 py-4 w-10">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(issue.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRows(prev => [...prev, issue.id]);
                              } else {
                                setSelectedRows(prev => prev.filter(id => id !== issue.id));
                              }
                            }}
                            className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="px-5 py-4 text-xs">
                        {new Date(issue.created_at).toLocaleDateString()}
                        <div className="text-[10px] text-gray-400">
                          {new Date(issue.created_at).toLocaleTimeString()}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-bold text-sm">
                          {issue.vehicles?.plate ||
                            issue.trailers?.plate ||
                            "Sem Placa"}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {issue.vehicles
                            ? issue.vehicles.model
                            : issue.trailers
                              ? "Reboque"
                              : "Carreta/Interno"}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm">
                        {issue.profiles?.full_name || "N/A"}
                      </td>

                      <td className="px-5 py-4">
                        <div className="text-sm font-medium">
                          {issue.item_title}
                        </div>
                        {issue.description && (
                          <div className="text-xs text-gray-500 mt-1 max-w-xs">
                            {issue.description}
                          </div>
                        )}
                        {issue.report_count > 1 && (
                          <div className="mt-2 inline-flex items-center gap-1 bg-red-100 text-red-700 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                            <AlertCircle size={12} />
                            Repetido {issue.report_count}x
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {imageUrl && (
                          <button
                            onClick={() => openImageModal(issue)}
                            title="Ver Foto"
                            className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye size={20} />
                          </button>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {issue.status === "pending" && (
                          <div className="flex justify-end items-center gap-2">
                            {user?.role === "admin" && (
                              <button
                                onClick={() => openResolveModal(issue, 'delete')}
                                title="Excluir pendência"
                                className="w-8 h-8 flex items-center justify-center bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => openResolveModal(issue)}
                              className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg flex items-center gap-1 text-xs font-semibold transition-colors"
                            >
                              <CheckCircle2 size={14} />
                              Resolver
                            </button>
                          </div>
                        )}

                        {issue.status === "waiting" && (
                          <div className="flex items-start justify-end gap-4 text-left">
                            <div className="flex-1 max-w-[200px]">
                              <div className="text-xs text-amber-600 font-bold flex items-center gap-1">
                                <Clock size={12} />
                                Em Aguardo
                              </div>
                              {issue.resolution_notes && (
                                <div className="text-zinc-500 text-[11px] mt-1 italic break-words leading-tight">
                                  "{issue.resolution_notes}"
                                </div>
                              )}
                            </div>
                            <div className="flex justify-end items-center gap-1.5 shrink-0">
                              {user?.role === "admin" && (
                                <button
                                  onClick={() => openResolveModal(issue, 'delete')}
                                  title="Excluir pendência"
                                  className="w-8 h-8 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors border border-red-100"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => handleRevertIssue(issue)}
                                title="Voltar para Pendentes"
                                className="w-8 h-8 flex items-center justify-center bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg transition-colors border border-orange-100"
                              >
                                <Undo size={14} />
                              </button>
                              <button
                                onClick={() => openResolveModal(issue)}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 text-xs font-bold transition-colors"
                              >
                                <CheckCircle2 size={12} />
                                Resolver
                              </button>
                            </div>
                          </div>
                        )}

                        {issue.status === "resolved" && (
                          <div className="flex items-start justify-end gap-6 text-left">
                            <div className="flex-1 max-w-[200px]">
                              <div className="text-sm text-green-600 font-semibold flex items-center gap-1">
                                <CheckCircle size={14} />
                                Resolvido
                              </div>

                              {issue.resolution_notes && (
                                <div className="text-text-muted text-xs mt-1">
                                  {issue.resolution_notes}
                                </div>
                              )}

                              {issue.resolution_nf && (() => {
                                try {
                                  const nfs = JSON.parse(issue.resolution_nf);
                                  if (Array.isArray(nfs)) {
                                    return (
                                      <div className="mt-2 space-y-2 bg-zinc-50 border border-zinc-150 rounded-xl p-2 max-w-[200px]">
                                        <div className="text-[9px] uppercase font-bold text-zinc-400">Notas Fiscais:</div>
                                        {nfs.map((nf: any, idx: number) => {
                                          const nfSum = nf.items?.reduce((curSum: number, item: any) => curSum + (Number(item.quantity || 1) * Number(item.unit_price || 0)), 0) || 0;
                                          return (
                                            <div key={nf.id || idx} className="text-[10px] border-b border-zinc-200 last:border-b-0 pb-1.5 last:pb-0 space-y-0.5">
                                              <div className="flex justify-between items-center font-bold text-zinc-700">
                                                <span>NF #{nf.nf_number || "S/N"}</span>
                                                <span className="text-primary font-black">R$ {nfSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                              </div>
                                              {nf.nf_key && (
                                                <div className="text-[9px] text-zinc-500 font-mono break-all leading-tight">
                                                  <span className="text-[8px] uppercase text-zinc-400 font-semibold block">Chave:</span>
                                                  {nf.nf_key}
                                                </div>
                                              )}
                                              {nf.items && nf.items.length > 0 && (
                                                <div className="mt-1 bg-white border border-zinc-100 rounded p-1 space-y-0.5">
                                                  {nf.items.map((item: any, itemIdx: number) => (
                                                    <div key={item.id || itemIdx} className="flex justify-between text-[9px] text-zinc-650">
                                                      <span className="truncate max-w-[110px]" title={item.name}>{item.name} <span className="text-zinc-400">({item.quantity}x)</span></span>
                                                      <span className="font-semibold text-zinc-700 shrink-0">R$ {(item.quantity * item.unit_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    );
                                  }
                                } catch (e) {
                                  // fallback
                                }
                                return (
                                  <div className="text-zinc-600 text-[10px] mt-1 font-bold uppercase tracking-widest">
                                    NF: {issue.resolution_nf}
                                  </div>
                                );
                              })()}
                              {(!issue.resolution_nf || !issue.resolution_nf.startsWith("[")) && issue.resolution_value > 0 && (
                                <div className="text-primary text-[10px] font-black uppercase tracking-widest mt-1">
                                  Valor: R$ {issue.resolution_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                              )}

                              {issue.resolution_photos && issue.resolution_photos.length > 0 && (
                                <div className="flex gap-1 mt-2">
                                  {issue.resolution_photos.map((pUrl: string, i: number) => (
                                     <button
                                       key={i}
                                       onClick={(e) => {
                                         e.stopPropagation();
                                         const fullUrl = supabase.storage.from("checklist-photos").getPublicUrl(pUrl).data.publicUrl;
                                         setSelectedImage(fullUrl);
                                         setZoom(1);
                                       }}
                                       title="Ver Foto do Serviço"
                                       className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center cursor-pointer border border-gray-200 hover:border-primary overflow-hidden shrink-0"
                                     >
                                        <img src={supabase.storage.from("checklist-photos").getPublicUrl(pUrl).data.publicUrl} className="w-full h-full object-cover" alt="Solução" />
                                     </button>
                                  ))}
                                </div>
                              )}

                              {issue.resolved_at && (
                                <div className="text-[10px] text-gray-400 mt-2">
                                  {new Date(
                                    issue.resolved_at,
                                  ).toLocaleDateString()}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => handleRevertIssue(issue)}
                                title="Reabrir pendência"
                                className="w-8 h-8 flex items-center justify-center bg-orange-100 hover:bg-orange-200 text-orange-600 rounded-lg transition-colors"
                              >
                                <Undo size={16} />
                              </button>
                              {user?.role === "admin" && (
                                <button
                                  onClick={() => openResolveModal(issue, 'delete')}
                                  title="Excluir"
                                  className="w-8 h-8 flex items-center justify-center bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {loading && (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-center py-8 text-sm text-gray-400"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></div>
                        Carregando...
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* Modal de Imagem */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage}
              style={{ transform: `scale(${zoom})` }}
              className="max-h-[80vh] transition-transform duration-200"
              alt="Defeito"
            />

            {/* Info do Issue */}
            {selectedIssue && (
              <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 text-white">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-bold">
                      {selectedIssue.vehicles?.plate ||
                        selectedIssue.trailers?.plate ||
                        "Sem Placa"}
                    </span>
                    <span className="mx-2">•</span>
                    <span>{selectedIssue.item_title}</span>
                    {selectedIssue.report_count > 1 && (
                      <span className="ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">
                        Repetiu {selectedIssue.report_count}x
                      </span>
                    )}
                  </div>
                  <div className="text-xs">
                    {new Date(selectedIssue.created_at).toLocaleString()}
                  </div>
                </div>
                {selectedIssue.description && (
                  <div className="text-xs mt-1 text-gray-300">
                    {selectedIssue.description}
                  </div>
                )}
              </div>
            )}

            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={() => setZoom(zoom + 0.2)}
                className="bg-white p-2 rounded-lg hover:bg-gray-100 transition-colors shadow-md"
              >
                <ZoomIn size={18} />
              </button>

              <button
                onClick={() => setZoom(Math.max(1, zoom - 0.2))}
                className="bg-white p-2 rounded-lg hover:bg-gray-100 transition-colors shadow-md"
              >
                <ZoomOut size={18} />
              </button>

              <button
                onClick={downloadImage}
                className="bg-white p-2 rounded-lg hover:bg-gray-100 transition-colors shadow-md"
              >
                <Download size={18} />
              </button>

              <button
                onClick={() => setSelectedImage(null)}
                className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors shadow-md"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {isManualModalOpen && (
        <ManualIssueModal
          onClose={() => setIsManualModalOpen(false)}
          onSuccess={() => {
            setIsManualModalOpen(false);
            fetchIssues();
          }}
        />
      )}

      {resolvingIssueId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {modalActionType === "resolve" ? "Resolver Pendência" : "Excluir Pendência"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {resolvingIssueData?.item_title}
            </p>
            <div className="space-y-4">
              {resolvingIssueData?.grouped_issues &&
                resolvingIssueData.grouped_issues.length > 1 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {modalActionType === "resolve" ? "Selecione as ocorrências para resolver:" : "Selecione as ocorrências para excluir:"}
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50">
                      {resolvingIssueData.grouped_issues.map((gi: any) => (
                        <label
                          key={gi.id}
                          className="flex items-start gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            className="mt-1 flex-shrink-0 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                            checked={selectedIdsToResolve.includes(gi.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIdsToResolve([
                                  ...selectedIdsToResolve,
                                  gi.id,
                                ]);
                              } else {
                                setSelectedIdsToResolve(
                                  selectedIdsToResolve.filter(
                                    (id) => id !== gi.id,
                                  ),
                                );
                              }
                            }}
                          />
                          <div className="flex-1 text-xs text-gray-700">
                            <div className="font-semibold">
                              {new Date(gi.created_at).toLocaleString()}
                            </div>
                            {gi.description && (
                              <div className="text-gray-500 truncate">
                                {gi.description}
                              </div>
                            )}
                            {gi.profiles && (
                              <div className="text-gray-400">
                                Por: {gi.profiles.full_name}
                              </div>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                    <div className="flex justify-end mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            selectedIdsToResolve.length ===
                            resolvingIssueData.grouped_issues.length
                          ) {
                            setSelectedIdsToResolve([]);
                          } else {
                            setSelectedIdsToResolve(
                              resolvingIssueData.grouped_issues.map(
                                (g: any) => g.id,
                              ),
                            );
                          }
                        }}
                        className="text-xs text-primary font-medium hover:underline"
                      >
                        {selectedIdsToResolve.length ===
                        resolvingIssueData.grouped_issues.length
                          ? "Desmarcar todos"
                          : "Marcar todos"}
                      </button>
                    </div>
                  </div>
                )}

              {modalActionType === "resolve" && !sqlError && (
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 mb-4 flex items-center justify-between gap-4">
                  <span className="text-xs font-bold text-zinc-650 uppercase tracking-wide">Status de Destino:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setResolveSubStatus("resolved")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        resolveSubStatus === "resolved"
                          ? "bg-primary text-white shadow-sm"
                          : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <CheckCircle2 size={14} />
                      Solucionar / Resolver
                    </button>
                    <button
                      type="button"
                      onClick={() => setResolveSubStatus("waiting")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        resolveSubStatus === "waiting"
                          ? "bg-amber-600 text-white shadow-sm"
                          : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <Clock size={14} />
                      Colocar em Aguardo
                    </button>
                  </div>
                </div>
              )}

              {modalActionType === "resolve" && !sqlError && resolveSubStatus === "resolved" && (
                <div className="space-y-4">
                  {/* NF Section */}
                  <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-150">
                      <span className="text-xs font-black uppercase text-zinc-500 tracking-wider">Notas Fiscais (NFs)</span>
                      <button
                        type="button"
                        onClick={() => {
                          setResolveNfs([
                            ...resolveNfs,
                            {
                              id: Date.now().toString(),
                              nf_number: "",
                              nf_key: "",
                              items: [{ id: `item-${Date.now()}`, name: "", quantity: 1, unit_price: 0 }]
                            }
                          ]);
                        }}
                        className="text-xs font-bold text-primary flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Plus size={14} />
                        Nova NF
                      </button>
                    </div>

                    {resolveNfs.map((nf, nfIdx) => {
                      const nfTotal = nf.items.reduce((acc: number, item: any) => acc + (Number(item.quantity || 1) * Number(item.unit_price || 0)), 0);
                      return (
                        <div key={nf.id} className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 space-y-3 relative">
                          {resolveNfs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setResolveNfs(resolveNfs.filter(n => n.id !== nf.id));
                              }}
                              className="absolute top-3 right-3 text-red-500 hover:text-red-700 cursor-pointer"
                              title="Remover NF"
                            >
                              <X size={16} />
                            </button>
                          )}
                          <div className="text-xs font-black uppercase text-zinc-400">Nota Fiscal #{nfIdx + 1}</div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-widest">Número da NF</label>
                              <input
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-medium"
                                type="text"
                                placeholder="Ex: 10452"
                                value={nf.nf_number}
                                onChange={(e) => {
                                  const updated = [...resolveNfs];
                                  updated[nfIdx].nf_number = e.target.value;
                                  setResolveNfs(updated);
                                }}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-widest">Total da NF</label>
                              <div className="w-full px-3 py-1.5 border border-zinc-200 bg-zinc-100 rounded-xl text-xs font-bold text-zinc-700">
                                R$ {nfTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-zinc-500 mb-1 uppercase tracking-widest">Chave da NF (44 dígitos)</label>
                            <input
                              className="w-full px-3 py-1.5 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
                              type="text"
                              maxLength={44}
                              placeholder="44 dígitos numéricos"
                              value={nf.nf_key}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "");
                                const updated = [...resolveNfs];
                                updated[nfIdx].nf_key = val;
                                setResolveNfs(updated);
                              }}
                            />
                            {nf.nf_key && nf.nf_key.length !== 44 && (
                              <span className="text-[9px] text-orange-600 block mt-0.5">Aviso: Deve conter exatamente 44 dígitos ({nf.nf_key.length}/44).</span>
                            )}
                          </div>

                          {/* Items Section inside NF */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black uppercase text-zinc-400">Itens / Peças desta NF</span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setShowAddItemDialog(true)}
                                  className="text-[9px] font-bold text-primary hover:underline cursor-pointer"
                                >
                                  + Cadastrar Peça
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...resolveNfs];
                                    updated[nfIdx].items.push({ id: Date.now().toString(), name: "", quantity: 1, unit_price: 0 });
                                    setResolveNfs(updated);
                                  }}
                                  className="text-[9px] font-bold text-primary hover:underline cursor-pointer"
                                >
                                  + Adicionar Item
                                </button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              {nf.items.map((item: any, itemIdx: number) => (
                                <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-white border border-zinc-150 p-2 rounded-xl relative">
                                  <div className="col-span-11 sm:col-span-5">
                                    <select
                                      className="w-full bg-white border border-gray-300 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                                      value={item.name}
                                      onChange={(e) => {
                                        const updated = [...resolveNfs];
                                        updated[nfIdx].items[itemIdx].name = e.target.value;
                                        setResolveNfs(updated);
                                      }}
                                    >
                                      <option value="">-- Selecione item --</option>
                                      {catalogItems.map(pName => (
                                        <option key={pName} value={pName}>{pName}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="col-span-10 sm:col-span-3">
                                    <input
                                      type="number"
                                      min={1}
                                      placeholder="Qtd"
                                      title="Quantidade"
                                      className="w-full border border-gray-300 rounded-lg px-1.5 py-1 text-xs text-center focus:ring-1 focus:ring-primary focus:outline-none font-medium"
                                      value={item.quantity || ""}
                                      onChange={(e) => {
                                        const updated = [...resolveNfs];
                                        updated[nfIdx].items[itemIdx].quantity = Number(e.target.value);
                                        setResolveNfs(updated);
                                      }}
                                    />
                                  </div>
                                  <div className="col-span-12 sm:col-span-3 font-semibold">
                                    <input
                                      type="number"
                                      step="0.01"
                                      placeholder="Unit R$"
                                      title="Valor Unitário"
                                      className="w-full border border-gray-300 rounded-lg px-1.5 py-1 text-xs text-right focus:ring-1 focus:ring-primary focus:outline-none font-semibold"
                                      value={item.unit_price || ""}
                                      onChange={(e) => {
                                        const updated = [...resolveNfs];
                                        updated[nfIdx].items[itemIdx].unit_price = Number(e.target.value);
                                        setResolveNfs(updated);
                                      }}
                                    />
                                  </div>
                                  <div className="col-span-12 sm:col-span-1 flex justify-end sm:justify-center">
                                    {nf.items.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = [...resolveNfs];
                                          updated[nfIdx].items = updated[nfIdx].items.filter(it => it.id !== item.id);
                                          setResolveNfs(updated);
                                        }}
                                        className="text-red-500 hover:text-red-700 hover:scale-110 shrink-0 p-1 rounded hover:bg-red-50"
                                      >
                                        <X size={14} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Registered item catalog form dialog */}
                  {showAddItemDialog && (
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-2xl space-y-3">
                      <div className="text-xs font-black uppercase text-orange-700 tracking-wider">Cadastrar Nova Peça/Serviço no Catálogo</div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Ex: Amortecedor Dianteiro, Alinhamento"
                          className="flex-1 bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                          value={newItemName}
                          onChange={(e) => setNewItemName(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => handleRegisterCatalogItem(newItemName)}
                          className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-dark cursor-pointer shrink-0"
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowAddItemDialog(false); setNewItemName(""); }}
                          className="px-3 py-1.5 bg-zinc-200 text-zinc-700 text-xs font-bold rounded-xl hover:bg-zinc-300 cursor-pointer shrink-0"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Dynamic General Consolidated Total */}
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-black uppercase text-primary tracking-widest block">Total Consolidado</span>
                      <span className="text-xs text-zinc-500">Soma de todas as Notas Fiscais e Itens</span>
                    </div>
                    <div className="text-xl font-black text-primary">
                      R$ {resolveNfs.reduce((acc, nf) => acc + nf.items.reduce((itemAcc: number, item: any) => itemAcc + (Number(item.quantity || 1) * Number(item.unit_price || 0)), 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Photos Upload of the Service */}
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">
                       Fotos do Serviço (opcional)
                     </label>
                     <div className="flex flex-wrap gap-2 mb-2">
                        {resolvePhotos.map((p, i) => (
                           <div key={i} className="relative w-16 h-16 rounded border border-gray-200 overflow-hidden">
                              <img src={URL.createObjectURL(p)} alt="doc" className="w-full h-full object-cover" />
                              <button onClick={() => setResolvePhotos(resolvePhotos.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5"><X size={10} /></button>
                           </div>
                        ))}
                        <label className="w-16 h-16 rounded border border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:text-primary hover:border-primary cursor-pointer transition-colors bg-gray-50">
                           <Camera size={20} />
                           <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => {
                             if (e.target.files) {
                               const newFiles = Array.from(e.target.files);
                               setResolvePhotos([...resolvePhotos, ...newFiles]);
                             }
                           }} />
                        </label>
                     </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Observações da solução (opcional)
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      rows={3}
                      placeholder="Descreva como a pendência foi resolvida..."
                      value={resolveNotes}
                      onChange={(e) => setResolveNotes(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {modalActionType === "resolve" && !sqlError && resolveSubStatus === "waiting" && (
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <label className="block text-sm font-semibold text-amber-950 mb-1 flex items-center gap-1.5">
                      <Clock size={16} className="text-amber-600" />
                      Motivo / Descrição do Aguardo *
                    </label>
                    <textarea
                      required
                      className="w-full bg-white px-3 py-2 border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent font-medium text-sm text-gray-800"
                      rows={4}
                      placeholder="Descreva o motivo pelo qual esta pendência está em aguardo (ex: aguardando peça do distribuidor, aguardando aprovação de orçamento...)"
                      value={resolveNotes}
                      onChange={(e) => setResolveNotes(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="flex bg-gray-50 -mx-6 -mb-6 px-6 py-4 justify-end gap-3 rounded-b-xl border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setResolvingIssueId(null);
                    setResolvingIssueData(null);
                    setSelectedIdsToResolve([]);
                  }}
                  disabled={isResolving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmModalAction}
                  disabled={isResolving || selectedIdsToResolve.length === 0}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${
                    modalActionType === "resolve"
                      ? resolveSubStatus === "waiting"
                        ? "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500"
                        : "bg-primary hover:bg-primary-dark"
                      : "bg-red-650 hover:bg-red-750"
                  }`}
                >
                  {isResolving ? (
                    modalActionType === "resolve"
                      ? resolveSubStatus === "waiting"
                        ? "Sinalizando..."
                        : "Resolvendo..."
                      : "Excluindo..."
                  ) : (
                    modalActionType === "resolve"
                      ? resolveSubStatus === "waiting"
                        ? "Confirmar Aguardo"
                        : "Confirmar Resolução"
                      : "Confirmar Exclusão"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
