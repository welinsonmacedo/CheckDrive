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
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";
import ManualIssueModal from "@/src/modules/company/components/ManualIssueModal";

export default function MaintenanceTab() {
  const { user } = useAuth();
  const [issues, setIssues] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "resolved">("pending");
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
  const [resolveNf, setResolveNf] = useState("");
  const [resolveValue, setResolveValue] = useState("");
  const [resolvePhotos, setResolvePhotos] = useState<File[]>([]);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [resolveNextDate, setResolveNextDate] = useState("");
  const [resolveWarningDays, setResolveWarningDays] = useState("");
  const [resolveCurrentKm, setResolveCurrentKm] = useState("");
  const [resolveIntervalKm, setResolveIntervalKm] = useState("");
  const [resolveWarningKm, setResolveWarningKm] = useState("");
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    fetchIssues();
  }, []);

  async function fetchIssues() {
    setLoading(true);

    try {
      const { data: issuesData, error } = await supabase
        .from("checklist_issues")
        .select(`
          *,
          auto_alerts (*)
        `)
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
    setResolveNotes("");
    setResolveNf("");
    setResolveValue("");
    setResolvePhotos([]);
    setSqlError(null);
    setResolveNextDate("");
    setResolveWarningDays("");
    setResolveCurrentKm("");
    setResolveIntervalKm("");
    setResolveWarningKm("");

    if (issue.auto_alerts) {
      if (issue.auto_alerts.trigger_type === "km") {
        setResolveIntervalKm(issue.auto_alerts.interval_km?.toString() || "");
        setResolveWarningKm(issue.auto_alerts.warning_km?.toString() || "");
        
        // Initial estimate of KM
        const estimatedKm = Number(issue.auto_alerts.last_km || 0) + Number(issue.auto_alerts.interval_km || 0);
        setResolveCurrentKm(estimatedKm.toString());

        // Fetch real-time current odometer of the vehicle if available
        if (issue.vehicle_id) {
          supabase
            .from("checklist_submissions")
            .select("odometer")
            .eq("vehicle_id", issue.vehicle_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .then(({ data }) => {
              if (data && data.length > 0 && data[0].odometer) {
                setResolveCurrentKm(data[0].odometer.toString());
              }
            });
        }
      } else if (issue.auto_alerts.trigger_type === "date") {
        setResolveWarningDays(issue.auto_alerts.warning_days?.toString() || "");
      }
    }
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

    if (modalActionType === "resolve") {
      if (resolvingIssueData?.auto_alerts?.trigger_type === "date" && !resolveNextDate) {
         alert("Por favor, informe a próxima data de vencimento para o alerta.");
         return;
      }
      if (resolvingIssueData?.auto_alerts?.trigger_type === "km" && !resolveCurrentKm) {
         alert("Por favor, informe o KM da resolução para o alerta.");
         return;
      }
    }

    setIsResolving(true);
    setSqlError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Upload photos if any
      const uploadedPhotos: string[] = [];
      for (let i = 0; i < resolvePhotos.length; i++) {
         const file = resolvePhotos[i];
         const path = `${user?.id || 'unknown'}/resolution/${Date.now()}_${i}.jpg`;
         const { error: uploadError } = await supabase.storage
            .from("checklist-photos")
            .upload(path, file);
         if (!uploadError) uploadedPhotos.push(path);
      }

      const { error: updateError } = await supabase
        .from("checklist_issues")
        .update({
          status: "resolved",
          resolution_notes: resolveNotes,
          resolution_nf: resolveNf,
          resolution_value: resolveValue ? Number(resolveValue) : null,
          resolution_photos: uploadedPhotos,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        })
        .in("id", selectedIdsToResolve);
        
      if (updateError) throw updateError;

      // Check if we need to update a date-based auto_alert
      if (resolvingIssueData?.auto_alerts?.trigger_type === "date" && resolveNextDate) {
         await supabase.from("auto_alerts").update({
            trigger_date: resolveNextDate,
            warning_days: resolveWarningDays ? Number(resolveWarningDays) : resolvingIssueData.auto_alerts.warning_days
         }).eq("id", resolvingIssueData.auto_alert_id);
      }

      // Check if we need to update a km-based auto_alert
      if (resolvingIssueData?.auto_alerts?.trigger_type === "km" && resolveCurrentKm) {
         await supabase.from("auto_alerts").update({
            last_km: Number(resolveCurrentKm),
            interval_km: resolveIntervalKm ? Number(resolveIntervalKm) : resolvingIssueData.auto_alerts.interval_km,
            warning_km: resolveWarningKm ? Number(resolveWarningKm) : resolvingIssueData.auto_alerts.warning_km
         }).eq("id", resolvingIssueData.auto_alert_id);
      }

      setResolvingIssueId(null);
      setResolvingIssueData(null);
      setSelectedIdsToResolve([]);
      setResolveNotes("");
      setResolveNf("");
      setResolveValue("");
      setResolvePhotos([]);
      setResolveNextDate("");
      setResolveWarningDays("");
      setResolveCurrentKm("");
      setResolveIntervalKm("");
      setResolveWarningKm("");
      setSqlError(null);
      fetchIssues();
    } catch (err: any) {
      console.error(err);
      if (err.message && (err.message.includes("Could not find the 'resolution_nf' column") || err.message.includes('column "resolution_nf" of relation "checklist_issues" does not exist'))) {
        setSqlError("Oops, the database needs updating!");
      } else {
        alert("Erro ao resolver. Tente novamente: " + err.message);
      }
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
  const resolvedCount = issues.filter((i) => i.status === "resolved").length;

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
                <span className="ml-1 px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                  {pendingCount}
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
                <span className="ml-1 px-2 py-0.5 text-xs bg-green-100 text-green-600 rounded-full">
                  {resolvedCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Pendências */}
      <div className="bento-card !p-0 overflow-hidden">
        <div className="p-5 border-b border-app-border flex items-center justify-between">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
            {activeTab === "pending"
              ? "Pendências de Manutenção"
              : "Manutenções Resolvidas"}
          </span>

          <div className="flex items-center gap-4">
            {selectedRows.length > 0 && activeTab === "pending" && user?.role === "admin" && (
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
                  {activeTab === "pending" && user?.role === "admin" && (
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
                      {activeTab === "pending" && user?.role === "admin" && (
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
                              
                              {issue.resolution_nf && (
                                <div className="text-zinc-600 text-[10px] mt-1 font-bold uppercase tracking-widest">
                                  NF: {issue.resolution_nf}
                                </div>
                              )}
                              {issue.resolution_value > 0 && (
                                <div className="text-primary text-[10px] font-black uppercase tracking-widest">
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
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
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nota Fiscal (opcional)
                        </label>
                        <input
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          type="text"
                          placeholder="Número da NF"
                          value={resolveNf}
                          onChange={(e) => setResolveNf(e.target.value)}
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Valor (opcional)
                        </label>
                        <input
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          type="number"
                          step="0.01"
                          placeholder="R$ 0,00"
                          value={resolveValue}
                          onChange={(e) => setResolveValue(e.target.value)}
                        />
                     </div>
                  </div>

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

                  {resolvingIssueData?.auto_alerts?.trigger_type === 'km' && (
                    <div className="bg-blue-50 p-4 border border-blue-200 rounded-xl space-y-3 relative overflow-hidden">
                      <div className="flex items-center gap-2 mb-1">
                        <Gauge className="text-blue-500" size={16} />
                        <h4 className="text-xs font-black text-blue-700 uppercase tracking-widest">Alerta Automático (KM)</h4>
                      </div>
                      <p className="text-xs text-blue-800/80 mb-3 block animate-pulse">
                        Este alerta é baseado em quilometragem (KM). Informe o KM real do veículo nesta manutenção para recalcular os próximos avisos.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                         <div>
                           <label className="block text-[10px] font-black uppercase text-blue-700 mb-1">KM do Serviço *</label>
                           <input
                             type="number"
                             value={resolveCurrentKm}
                             onChange={(e) => setResolveCurrentKm(e.target.value)}
                             required
                             placeholder="Ex: 120500"
                             className="w-full bg-white border border-blue-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-bold"
                           />
                         </div>
                         <div>
                           <label className="block text-[10px] font-black uppercase text-blue-700 mb-1">Intervalo KM</label>
                           <input
                             type="number"
                             value={resolveIntervalKm}
                             onChange={(e) => setResolveIntervalKm(e.target.value)}
                             required
                             placeholder="Ex: 10000"
                             className="w-full bg-white border border-blue-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                           />
                         </div>
                         <div>
                           <label className="block text-[10px] font-black uppercase text-blue-700 mb-1">Antecedência (KM)</label>
                           <input
                             type="number"
                             value={resolveWarningKm}
                             onChange={(e) => setResolveWarningKm(e.target.value)}
                             required
                             placeholder="Ex: 1000"
                             className="w-full bg-white border border-blue-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                           />
                         </div>
                      </div>

                      {resolveCurrentKm && resolveIntervalKm && (
                        <div className="pt-2.5 border-t border-blue-200/60 flex flex-col gap-1 text-[11px] text-blue-900 font-bold">
                          <span className="flex items-center gap-1.5">
                            • Próximo vencimento do alerta: <strong className="text-blue-700">{Number(resolveCurrentKm) + Number(resolveIntervalKm)} KM</strong>
                          </span>
                          {resolveWarningKm && (
                            <span className="flex items-center gap-1.5">
                              • Início dos avisos no feed: <strong className="text-amber-700">{Number(resolveCurrentKm) + Number(resolveIntervalKm) - Number(resolveWarningKm)} KM</strong>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {resolvingIssueData?.auto_alerts?.trigger_type === 'date' && (
                    <div className="bg-orange-50 p-4 border border-orange-200 rounded-xl space-y-3 relative overflow-hidden">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="text-orange-500" size={16} />
                        <h4 className="text-xs font-black text-orange-700 uppercase tracking-widest">Alerta Automático (Data)</h4>
                      </div>
                      <p className="text-xs text-orange-800/80 mb-3 block">
                        Esta pendência foi gerada por um alerta. Ao resolvê-la, defina a próxima data de vencimento.
                      </p>
                      
                      <div className="grid grid-cols-2 gap-3">
                         <div>
                           <label className="block text-[10px] font-black uppercase text-orange-700 mb-1">Próxima Data</label>
                           <input
                             type="date"
                             value={resolveNextDate}
                             onChange={(e) => setResolveNextDate(e.target.value)}
                             required
                             className="w-full bg-white border border-orange-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                           />
                         </div>
                         <div>
                           <label className="block text-[10px] font-black uppercase text-orange-700 mb-1">Avisar com (Dias)</label>
                           <input
                             type="number"
                             value={resolveWarningDays}
                             onChange={(e) => setResolveWarningDays(e.target.value)}
                             placeholder={resolvingIssueData.auto_alerts.warning_days?.toString() || "15"}
                             className="w-full bg-white border border-orange-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                           />
                         </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {modalActionType === "resolve" && sqlError && (
                <div className="bg-white p-6 rounded-3xl border border-app-border shadow-sm mb-4">
                   <h3 className="text-sm font-black text-danger uppercase tracking-tight mb-2">Atenção!</h3>
                   <p className="text-sm text-zinc-600 mb-4">Para poder salvar Nota Fiscal, Valor e Fotos da solução, precisamos adicionar as colunas no Supabase. Copie o SQL abaixo e cole no painel do Supabase:</p>
                   <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl overflow-x-auto text-xs font-mono text-zinc-600">
                     <pre>
{`ALTER TABLE public.checklist_issues 
ADD COLUMN IF NOT EXISTS resolution_nf TEXT,
ADD COLUMN IF NOT EXISTS resolution_value NUMERIC,
ADD COLUMN IF NOT EXISTS resolution_photos JSONB;`}
                     </pre>
                   </div>
                   <button onClick={() => setSqlError(null)} className="mt-4 px-4 py-2 bg-zinc-200 text-zinc-700 rounded-lg text-sm font-bold">Voltar e tentar novamente</button>
                </div>
              )}

              <div className="flex bg-gray-50 -mx-6 -mb-6 px-6 py-4 justify-end gap-3 rounded-b-xl border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setResolvingIssueId(null);
                    setResolvingIssueData(null);
                    setSelectedIdsToResolve([]);
                    setSqlError(null);
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
                  className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 ${modalActionType === "resolve" ? "bg-primary hover:bg-primary-dark" : "bg-red-600 hover:bg-red-700"}`}
                >
                  {isResolving ? (modalActionType === "resolve" ? "Resolvendo..." : "Excluindo...") : (modalActionType === "resolve" ? "Confirmar Resolução" : "Confirmar Exclusão")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
