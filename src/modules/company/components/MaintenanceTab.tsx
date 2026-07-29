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
  Package,
  Printer,
  Edit,
  Upload,
  History,
  Receipt,
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";
import ManualIssueModal from "@/src/modules/company/components/ManualIssueModal";
import { SupplierModal } from "./SupplierModal";
import IssueDetailsModal from "./IssueDetailsModal";
import AlertHistoryModal from "./AlertHistoryModal";
import { usePersistentState } from "@/src/hooks/usePersistentState";
import MaintenanceListPrintModal from "./MaintenanceListPrintModal";
import MaintenanceTrackingPrintModal from "./MaintenanceTrackingPrintModal";

export default function MaintenanceTab() {
  const { user } = useAuth();
  const [issues, setIssues] = useState<any[]>([]);
  const [showIssuesPrintModal, setShowIssuesPrintModal] = useState(false);
  const [showTrackingPrintModal, setShowTrackingPrintModal] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [odometers, setOdometers] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = usePersistentState(
    "maintenance_searchTerm",
    "",
  );
  const [alertFilter, setAlertFilter] = usePersistentState<
    "all" | "driver" | "alert_km" | "alert_date" | "expired"
  >("maintenance_alertFilter", "all");
  const [trackingTypeFilter, setTrackingTypeFilter] = usePersistentState<"all" | "km" | "date" | "hours">("maintenance_trackingTypeFilter", "all");
  const [trackingFilter, setTrackingFilter] = usePersistentState<
    "all" | "overdue" | "near" | "ok"
  >("maintenance_trackingFilter", "all");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = usePersistentState<string>("maintenance_activeTab", "pending");
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [selectedViewIssue, setSelectedViewIssue] = useState<any | null>(null);
  const [selectedAlertForHistory, setSelectedAlertForHistory] = useState<any | null>(null);
  const [zoom, setZoom] = useState(1);

  const [resolvingIssueData, setResolvingIssueData] = useState<any | null>(
    null,
  );
  const [modalActionType, setModalActionType] = useState<"resolve" | "delete">(
    "resolve",
  );
  const [selectedIdsToResolve, setSelectedIdsToResolve] = useState<string[]>(
    [],
  );
  const [resolvingIssueId, setResolvingIssueId] = useState<
    string | string[] | null
  >(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [resolveType, setResolveType] = useState<"preventiva" | "corretiva" | "">("");
  const [resolveCategory, setResolveCategory] = useState("");
  const [resolveStartDate, setResolveStartDate] = useState("");
  const [resolveEndDate, setResolveEndDate] = useState("");
  const [resolveNf, setResolveNf] = useState("");
  const [resolveValue, setResolveValue] = useState("");
  const [resolvePhotos, setResolvePhotos] = useState<File[]>([]);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [resolveNextDate, setResolveNextDate] = useState("");
  const [resolveComments, setResolveComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [resolveWarningDays, setResolveWarningDays] = useState("");
  const [resolveCurrentKm, setResolveCurrentKm] = useState("");
  const [resolveIntervalKm, setResolveIntervalKm] = useState("");
  const [resolveWarningKm, setResolveWarningKm] = useState("");
  const [resolveCurrentHours, setResolveCurrentHours] = useState("");
  const [resolveIntervalHours, setResolveIntervalHours] = useState("");
  const [resolveWarningHours, setResolveWarningHours] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [resolveSubStatus, setResolveSubStatus] = useState<
    "resolved" | "waiting" | "waiting_nf"
  >("resolved");

  const [resolveNfs, setResolveNfs] = useState<any[]>([
    {
      id: "first",
      nf_number: "",
      nf_key: "",
      supplier_id: "",
      items: [
        { id: "first-item", item_id: "", name: "", quantity: 1, unit_price: 0 },
      ],
    },
  ]);
  const [resolveStockItems, setResolveStockItems] = useState<any[]>([]);

  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [inventorySuppliers, setInventorySuppliers] = useState<any[]>([]);
  const [showAddSupplierDialog, setShowAddSupplierDialog] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [newItemSku, setNewItemSku] = useState("");
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [checklistItemsList, setChecklistItemsList] = useState<any[]>([]);

  useEffect(() => {
    fetchIssues();
    fetchCatalog();
    fetchAlertsData();
  }, [(user as any)?.company_id]);

  async function fetchAlertsData() {
    try {
      const companyId = (user as any)?.company_id;
      if (!companyId) return;

      const { data: alertsData, error: alertsError } = await supabase.from(
        "auto_alerts",
      )
        .select(`
          *,
          vehicles (plate, model, hour_meter_current),
          profiles (full_name)
        `)
        .eq("company_id", (user as any)?.company_id);

      if (alertsError) { console.error("ALERTS ERROR:", alertsError); alert("Error fetch alerts: " + JSON.stringify(alertsError)); } if (!alertsError && alertsData) {
        setAlerts(alertsData);
      }

      const { data: submissions, error: subError } = await supabase.from("checklist_submissions").select("vehicle_id, odometer, created_at").eq("company_id", (user as any)?.company_id)
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

  
  const handlePrintIssuesList = () => {
    window.print();
  };

  const handlePrintTracking = () => {
    window.print();
  };


  const getPriorityBadge = (priority?: string) => {
    const p = (priority || "").toLowerCase().trim();
    if (p === "baixa" || p === "leve") return <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1 border border-green-200"><div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.8)]"></div>Leve</span>;
    if (p === "média" || p === "media" || p === "médio" || p === "medio") return <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1 border border-amber-200"><div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.8)]"></div>Médio</span>;
    if (p === "alta" || p === "crítico" || p === "critico") return <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1 border border-red-200"><div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.8)] animate-pulse"></div>Crítico</span>;
    return <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 flex items-center gap-1 border border-zinc-200"><div className="w-2 h-2 rounded-full bg-zinc-400"></div>Padrão</span>;
  // 
    };

  const handleXmlUpload = (e: any, nfIdx: number) => {
    alert("Processamento de XML de NF-e não configurado.");
  };

  async function fetchCatalog() {
    const companyId = (user as any)?.company_id;
    if (!companyId) return;
    try {
      const [itemsRes, suppliersRes, checklistItemsRes] = await Promise.all([
        supabase.from("inventory_items").select("*").eq("company_id", (user as any)?.company_id).eq("company_id", (user as any)?.company_id).order("name"),
        supabase.from("inventory_suppliers").select("*").eq("company_id", (user as any)?.company_id).eq("company_id", (user as any)?.company_id).order("name"),
        supabase.from("checklist_items").select("title, priority").order("order_index"),
      ]);

      if (!itemsRes.error && itemsRes.data) {
        setInventoryItems(itemsRes.data);
      }
      if (!suppliersRes.error && suppliersRes.data) {
        setInventorySuppliers(suppliersRes.data);
      }
      if (!checklistItemsRes.error && checklistItemsRes.data) {
        setChecklistItemsList(checklistItemsRes.data);
      }
    } catch (err) {
      console.warn("Could not load catalog from DB", err);
    }
  }

  async function handleRegisterCatalogItem(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (
      inventoryItems.some(
        (item) => item.name.toLowerCase() === trimmed.toLowerCase(),
      )
    ) {
      alert("Este item já está cadastrado!");
      return;
    }

    try {
      const payload: any = {
        name: trimmed,
        category: newItemCategory.trim(),
        sku: newItemSku.trim(),
        current_quantity: 0,
      };

      if (inventoryItems.length > 0 && inventoryItems[0].company_id) {
        payload.company_id = inventoryItems[0].company_id;
      }

      const { error } = await supabase.from("inventory_items").insert(payload);
      if (!error) {
        await fetchCatalog();
        setNewItemName("");
        setNewItemCategory("");
        setNewItemSku("");
        setShowAddItemDialog(false);
      } else {
        throw error;
      }
    } catch (err: any) {
      console.warn("Could not save registered item to Supabase", err);
      alert(`Erro ao cadastrar peça: ${err.message || "Desconhecido"}`);
    }
  }

  async function fetchIssues() {
    const companyId = (user as any)?.company_id;
    if (!companyId) return;
    setLoading(true);

    try {
      const { data: issuesData, error } = await supabase.from("checklist_issues").select(`
          *,
          auto_alerts (*)
        `)
        .eq("company_id", (user as any)?.company_id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error); alert("Error fetching issues: " + JSON.stringify(error));
        setIssues([]);
        setLoading(false);
        return;
      }

      
      // --- MIGRATION / FALLBACK FOR OLD SUBMISSIONS ---
      const { data: allSubmissions } = await supabase
        .from("checklist_submissions")
        .select("*")
        .eq("company_id", (user as any)?.company_id)
        .neq("type", "fuel")
        .neq("type", "Abastecimento")
        .order("created_at", { ascending: false });
        
      const oldIssues: any[] = [];
      
      if (allSubmissions) {
        allSubmissions.forEach(sub => {
          // Check if this submission already has records in checklist_issues
          const hasMigrated = issuesData?.some((i: any) => i.submission_id === sub.id);
          if (hasMigrated) return;
          
          let responses;
          try {
            responses = typeof sub.responses === 'string' ? JSON.parse(sub.responses) : sub.responses;
          } catch(e) {
            return;
          }
          
          if (responses && responses.defects) {
             Object.entries(responses.defects).forEach(([itemId, defectsList]: [string, any]) => {
                if (Array.isArray(defectsList)) {
                   defectsList.forEach(d => {
                      if (d.description || d.photo) {
                         oldIssues.push({
                           id: `old-${sub.id}-${itemId}-${Math.random()}`,
                           submission_id: sub.id,
                           vehicle_id: sub.vehicle_id,
                           trailer_id: sub.trailer_id,
                           driver_id: sub.driver_id,
                           item_title: itemId,
                           description: d.description,
                           photo_url: d.photo,
                           status: "pending",
                           priority: "Medio",
                           created_at: sub.created_at,
                           company_id: sub.company_id,
                           auto_alerts: null,
                         });
                      }
                   });
                }
             });
          }
        });
      }
      
      const combinedIssuesData = [...(issuesData || []), ...oldIssues];
      
      const submissionIds = [
        ...new Set(combinedIssuesData.map((i: any) => i.submission_id)),
      ].filter(Boolean);


      const { data: submissionsData } = await supabase.from("checklist_submissions").select("id, type").eq("company_id", (user as any)?.company_id)
        .in("id", submissionIds);

      const fuelSubmissionIds =
        submissionsData
          ?.filter((s: any) => s.type === "fuel" || s.type === "Abastecimento")
          .map((s: any) => s.id) || [];

      const filteredIssues = combinedIssuesData.filter(
        (i: any) => !fuelSubmissionIds.includes(i.submission_id),
      );

      const { data: checklistItemsResData } = await supabase.from("checklist_items").select("title, priority").order("order_index");
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
        const { data } = await supabase.from("vehicles").select("id, plate, model").eq("company_id", (user as any)?.company_id)
          .in("id", vehicleIds);
        vehiclesData = data || [];
      }

      let trailersData: any[] = [];
      if (trailerIds.length > 0) {
        const { data } = await supabase.from("trailers").select("id, plate").eq("company_id", (user as any)?.company_id)
          .in("id", trailerIds);
        trailersData = data || [];
      }

      let driversData: any[] = [];
      if (driverIds.length > 0) {
        const { data } = await supabase.from("profiles").select("id, full_name").eq("company_id", (user as any)?.company_id)
          .in("id", driverIds);
        driversData = data || [];
      }

      const issuesWithRelations = filteredIssues.map((issue: any) => {
        let status = issue.status;
        if (status === "resolved" && !issue.resolved_by) {
          status = "pending";
        }
        
        const checklistItem = checklistItemsResData?.find(ci => ci.title === issue.item_title);
        const mappedPriority = checklistItem?.priority || "Medio";
        
        return {
          ...issue,
          priority: mappedPriority,

          status,
          vehicles: vehiclesData.find((v) => v.id === issue.vehicle_id),
          trailers: trailersData.find((t) => t.id === issue.trailer_id),
          profiles: driversData.find((d) => d.id === issue.driver_id),
        };
      });

      // Group identical pending issues
      const groupedIssues: any[] = [];
      const pendingGroups: { [key: string]: any } = {};

      issuesWithRelations.forEach((issue: any) => {
        if (issue.status?.toLowerCase().trim() === "pending") {
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
      console.error(error); alert("Error fetching issues: " + JSON.stringify(error));
    }

    setLoading(false);
  }

  function openResolveModal(
    issue: any,
    actionType: "resolve" | "delete" = "resolve",
  ) {
    const isWaitingNf = issue.resolution_notes?.startsWith("[AGUARDANDO_NF]");
    const cleanNotes = issue.resolution_notes?.replace("[AGUARDANDO_NF] ", "")?.replace("[AGUARDANDO_NF]", "") || "";

    setModalActionType(actionType);
    setResolvingIssueData(issue);
    setResolvingIssueId(issue.grouped_ids || [issue.id]);
    setSelectedIdsToResolve(issue.grouped_ids || [issue.id]);
    setResolveNotes(cleanNotes);
    setResolveType(issue.resolution_type || "");
    setResolveCategory(issue.item_category || "");
    setResolveStartDate(issue.maintenance_start_date ? issue.maintenance_start_date.split("T")[0] : "");
    setResolveEndDate(issue.maintenance_end_date ? issue.maintenance_end_date.split("T")[0] : "");
    setResolveSubStatus(issue.status === "waiting" ? "waiting" : isWaitingNf ? "waiting_nf" : "resolved");
    setResolveNf("");
    setResolveValue(issue.resolution_value?.toString() || "");
    setResolvePhotos([]);
    setResolveComments(issue.resolution_comments || []);
    setNewComment("");
    setSqlError(null);
    setResolveNextDate("");
    setResolveWarningDays("");
    setResolveCurrentKm("");
    setResolveIntervalKm("");
    setResolveWarningKm("");
    setResolveCurrentHours("");
    setResolveIntervalHours("");
    setResolveWarningHours("");

    let loadedNfs = null;
    try {
      if (issue.resolution_nfs) {
        loadedNfs = typeof issue.resolution_nfs === 'string' ? JSON.parse(issue.resolution_nfs) : issue.resolution_nfs;
      } else if (issue.resolution_nf) {
        loadedNfs = typeof issue.resolution_nf === 'string' ? JSON.parse(issue.resolution_nf) : issue.resolution_nf;
      }
    } catch (e) {
      console.error("Error parsing NFs", e);
    }

    if (Array.isArray(loadedNfs) && loadedNfs.length > 0) {
      const actualNfs = loadedNfs.filter((n: any) => !n.is_stock && !(n.nf_number || "").includes("Estoque - Origem NF"));
      const stockGroups = loadedNfs.filter((n: any) => n.is_stock || (n.nf_number || "").includes("Estoque - Origem NF"));
      
      if (actualNfs.length > 0) {
        setResolveNfs(actualNfs);
      } else {
        setResolveNfs([{ id: Date.now().toString(), nf_number: "", nf_key: "", items: [{ id: `item-${Date.now()}`, item_id: "", name: "", quantity: 1, unit_price: 0 }] }]);
      }
      
      const loadedStock = [];
      for (const sg of stockGroups) {
        if (sg.items) {
          loadedStock.push(...sg.items.map((i: any) => ({ ...i, name: i.name.replace(" (Uso do Estoque)", "") })));
        }
      }
      setResolveStockItems(loadedStock);
    } else {
      setResolveNfs([{ id: Date.now().toString(), nf_number: "", nf_key: "", items: [{ id: `item-${Date.now()}`, item_id: "", name: "", quantity: 1, unit_price: 0 }] }]);
      setResolveStockItems([]);
    }
    setShowAddItemDialog(false);

    if (issue.auto_alerts) {
      // Sempre inicializa campos de KM e Data se for um alerta automático
      setResolveIntervalKm(issue.auto_alerts.interval_km?.toString() || "");
      setResolveWarningKm(issue.auto_alerts.warning_km?.toString() || "");
      setResolveIntervalHours(issue.auto_alerts.interval_hours?.toString() || "");
      setResolveWarningHours(issue.auto_alerts.warning_hours?.toString() || "");
      setResolveWarningDays(issue.auto_alerts.warning_days?.toString() || "");
      setResolveNextDate(issue.auto_alerts.trigger_date || "");

      if (issue.status === "resolved") {
        setResolveCurrentKm(issue.auto_alerts.last_km?.toString() || "");
        setResolveCurrentHours(issue.auto_alerts.last_hours?.toString() || "");
      } else {
        // Initial estimate of KM
        const estimatedKm = Number(issue.auto_alerts.last_km || 0) + Number(issue.auto_alerts.interval_km || 0);
        setResolveCurrentKm(estimatedKm.toString());
        const estimatedHours = Number(issue.auto_alerts.last_hours || 0) + Number(issue.auto_alerts.interval_hours || 0);
        setResolveCurrentHours(estimatedHours.toString());

        // Fetch real-time current odometer of the vehicle if available
        if (issue.vehicle_id) {
          supabase.from("checklist_submissions").select("odometer").eq("company_id", (user as any)?.company_id)
            .eq("vehicle_id", issue.vehicle_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .then(({ data }) => {
              if (data && data.length > 0 && data[0].odometer) {
                setResolveCurrentKm(data[0].odometer.toString());
              }
            });
        }
      }
    }
  }

  async function handleOpenResolveForAlert(alertItem: any) {
    try {
      setLoading(true);
      // Check for existing pending issue for this auto_alert_id
      const { data: existingIssues } = await supabase
        .from("checklist_issues")
        .select(`
          *,
          vehicles (id, plate, model),
          auto_alerts (*)
        `)
        .eq("company_id", (user as any)?.company_id || user?.id)
        .eq("auto_alert_id", alertItem.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      let targetIssue = existingIssues && existingIssues.length > 0 ? existingIssues[0] : null;

      if (!targetIssue) {
        const newIssuePayload = {
          company_id: (user as any)?.company_id || user?.id,
          auto_alert_id: alertItem.id,
          vehicle_id: alertItem.target_vehicle_id || null,
          item_title: alertItem.title,
          description: `Manutenção agendada via Alerta Automático: ${alertItem.title}`,
          status: "pending",
          created_at: new Date().toISOString(),
        };

        const { data: created, error } = await supabase
          .from("checklist_issues")
          .insert([newIssuePayload])
          .select(`
            *,
            vehicles (id, plate, model),
            auto_alerts (*)
          `)
          .single();

        if (error) throw error;
        targetIssue = created;
      }

      openResolveModal(targetIssue, "resolve");
    } catch (err: any) {
      alert("Erro ao preparar formulário de baixa: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function confirmModalAction() {
    if (!selectedIdsToResolve || selectedIdsToResolve.length === 0) return;

    if (modalActionType === "delete") {
      if (
        !confirm(
          `Deseja realmente excluir ${selectedIdsToResolve.length} pendência(s) permanentemente?`,
        )
      )
        return;
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
      if (resolveSubStatus === "resolved") {
        if (!resolveType) {
          alert("Por favor, selecione se a manutenção foi Preventiva ou Corretiva.");
          return;
        }
        if (
          resolvingIssueData?.auto_alerts?.trigger_type === "date" &&
          !resolveNextDate
        ) {
          alert(
            "Por favor, informe a próxima data de vencimento para o alerta.",
          );
          return;
        }
        if (
          resolvingIssueData?.auto_alerts?.trigger_type === "km" &&
          !resolveCurrentKm
        ) {
          alert("Por favor, informe o KM da resolução para o alerta.");
          return;
        }
        if (
          resolvingIssueData?.auto_alerts?.trigger_type === "hours" &&
          !resolveCurrentHours
        ) {
          alert("Por favor, informe as Horas de resolução para o alerta.");
          return;
        }
      } else {
        if (!resolveNotes.trim()) {
          alert("Por favor, informe a descrição/motivo do aguardo.");
          return;
        }
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
        const path = `${user?.id || "unknown"}/resolution/${Date.now()}_${i}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("checklist-photos")
          .upload(path, file);
        if (!uploadError) uploadedPhotos.push(path);
      }

      const calculatedValueSumNfs = (Array.isArray(resolveNfs) ? resolveNfs : []).reduce((acc, nf) => {
        const nfItems = Array.isArray(nf.items) ? nf.items : [];
        const nfSum = nfItems.reduce(
          (itemAcc: number, item: any) =>
            itemAcc + Number(item.quantity || 1) * Number(item.unit_price || 0),
          0,
        );
        return acc + nfSum;
      }, 0);
      const calculatedValueSumStock = (Array.isArray(resolveStockItems) ? resolveStockItems : []).reduce((acc, item) => {
        return acc + Number(item.quantity || 1) * Number(item.unit_price || 0);
      }, 0);

      const calculatedValueSum = calculatedValueSumNfs + calculatedValueSumStock;

      const validResolveNfs = resolveNfs.filter(
        (nf) =>
          nf.nf_number?.trim() ||
          nf.nf_key?.trim() ||
          nf.items?.some((i: any) => i.name?.trim()),
      );

      if (resolveStockItems.length > 0) {
        validResolveNfs.push({
          id: `stock-usage-${Date.now()}`,
          is_stock: true,
          nf_number: "Itens de Estoque",
          nf_key: "",
          items: resolveStockItems.filter((i: any) => i.item_id && i.quantity),
        });
      }

      const nfsJSONString = JSON.stringify(validResolveNfs);
      const stockJSONString = JSON.stringify(resolveStockItems);

      let allComments = resolveComments;
      if (newComment.trim()) {
        allComments = [
          ...allComments,
          {
            id: Date.now().toString(),
            text: newComment.trim(),
            created_at: new Date().toISOString(),
            user_name: user?.user_metadata?.name || user?.email || "Admin",
          },
        ];
      }

      let updateError;
      try {
        const updatePayload: any =
          resolveSubStatus === "waiting"
            ? {
                status: "waiting",
                resolution_notes: resolveNotes,
                resolution_type: resolveType || null,
                item_category: resolveCategory || null,
                maintenance_start_date: resolveStartDate || null,
                maintenance_end_date: resolveEndDate || null,
                resolution_comments: allComments,
                resolution_nf: nfsJSONString,
                resolution_nfs:
                  validResolveNfs.length > 0 ? validResolveNfs : null,
                resolution_value: calculatedValueSum,
                ...(uploadedPhotos.length > 0
                  ? { resolution_photos: uploadedPhotos }
                  : {}),
              }
            : {
                status: "resolved",
                resolution_notes: resolveSubStatus === "waiting_nf" ? `[AGUARDANDO_NF] ${resolveNotes}` : resolveNotes,
                resolution_type: resolveType || null,
                item_category: resolveCategory || null,
                maintenance_start_date: resolveStartDate || null,
                maintenance_end_date: resolveEndDate || null,
                resolution_comments: allComments,
                resolution_nf: nfsJSONString,
                resolution_nfs:
                  validResolveNfs.length > 0 ? validResolveNfs : null,
                resolution_value: calculatedValueSum,
                ...(uploadedPhotos.length > 0
                  ? { resolution_photos: uploadedPhotos }
                  : {}),
                resolved_at: new Date().toISOString(),
                resolved_by: user?.id,
              };

        const { error } = await supabase
          .from("checklist_issues")
          .update(updatePayload as any)
          .in("id", selectedIdsToResolve);
        updateError = error;
      } catch (e: any) {
        const updatePayload: any =
          resolveSubStatus === "waiting"
            ? {
                status: "waiting",
                resolution_notes: resolveNotes,
                resolution_type: resolveType || null,
                item_category: resolveCategory || null,
                maintenance_start_date: resolveStartDate || null,
                maintenance_end_date: resolveEndDate || null,
                resolution_comments: allComments,
                resolution_nfs:
                  validResolveNfs.length > 0 ? validResolveNfs : null,
                resolution_value: calculatedValueSum,
                ...(uploadedPhotos.length > 0
                  ? { resolution_photos: uploadedPhotos }
                  : {}),
              }
            : {
                status: "resolved",
                resolution_notes: resolveSubStatus === "waiting_nf" ? `[AGUARDANDO_NF] ${resolveNotes}` : resolveNotes,
                resolution_type: resolveType || null,
                item_category: resolveCategory || null,
                maintenance_start_date: resolveStartDate || null,
                maintenance_end_date: resolveEndDate || null,
                resolution_comments: allComments,
                resolution_nfs:
                  validResolveNfs.length > 0 ? validResolveNfs : null,
                resolution_value: calculatedValueSum,
                ...(uploadedPhotos.length > 0
                  ? { resolution_photos: uploadedPhotos }
                  : {}),
                resolved_at: new Date().toISOString(),
                resolved_by: user?.id,
              };
        const { error } = await supabase
          .from("checklist_issues")
          .update(updatePayload as any)
          .in("id", selectedIdsToResolve);
        updateError = error;
      }

      if (updateError) throw updateError;

      try {
        if (
          resolveSubStatus === "resolved" &&
          resolvingIssueData?.status !== "resolved"
        ) {
          let company_id = inventoryItems[0]?.company_id || null;
          if (!company_id) {
            const { data: profile } = await supabase.from("profiles").select("company_id")
              .eq("id", user?.id)
              .single();
            if (profile) company_id = profile.company_id;
          }

          for (const item of resolveStockItems) {
            if (item.item_id && Number(item.quantity) > 0) {
              const total =
                Number(item.quantity || 1) * Number(item.unit_price || 0);

              const txPayload: any = {
                item_id: item.item_id,
                type: "out",
                quantity: -Math.abs(Number(item.quantity)),
                unit_price: Number(item.unit_price),
                total_price: total,
                date: new Date().toISOString(),
                notes: `Estoque utilizado para pendência. ${resolvingIssueData?.item_title || ""}`,
                created_by: user?.id,
              };
              if (company_id) txPayload.company_id = company_id;

              const { error: txError } = await supabase
                .from("inventory_transactions")
                .insert(txPayload);
              if (txError) throw txError;

              // decrement
              const { data: currentItemData } = await supabase.from("inventory_items").select("current_quantity")
                .eq("id", item.item_id)
                .single();
              if (currentItemData) {
                const { error: upError } = await supabase
                  .from("inventory_items")
                  .update({
                    current_quantity:
                      Number(currentItemData.current_quantity) -
                      Math.abs(Number(item.quantity)),
                  })
                  .eq("id", item.item_id);
                if (upError) throw upError;
              }
            }
          }
          fetchCatalog(); // refresh inventory
        }
      } catch (err: any) {
        console.error("Could not deduct from inventory", err);
        alert(
          `Atenção: A pendência foi solucionada mas houve um erro ao baixar o estoque: ${err.message || ""}`,
        );
      }

      // Update auto_alert if it exists
      if (
        resolveSubStatus === "resolved" &&
        resolvingIssueData?.auto_alert_id
      ) {
        const alertPayload: any = {};

        if (resolveCurrentKm) {
          alertPayload.last_km = Number(resolveCurrentKm);
          alertPayload.interval_km = resolveIntervalKm
            ? Number(resolveIntervalKm)
            : resolvingIssueData.auto_alerts.interval_km;
          alertPayload.warning_km = resolveWarningKm
            ? Number(resolveWarningKm)
            : resolvingIssueData.auto_alerts.warning_km;
        }

        if (resolveCurrentHours) {
          alertPayload.last_hours = Number(resolveCurrentHours);
          alertPayload.interval_hours = resolveIntervalHours
            ? Number(resolveIntervalHours)
            : resolvingIssueData.auto_alerts.interval_hours;
          alertPayload.warning_hours = resolveWarningHours
            ? Number(resolveWarningHours)
            : resolvingIssueData.auto_alerts.warning_hours;
        }

        if (resolveNextDate) {
          alertPayload.trigger_date = resolveNextDate;
          alertPayload.warning_days = resolveWarningDays
            ? Number(resolveWarningDays)
            : resolvingIssueData.auto_alerts.warning_days;
        }

        if (Object.keys(alertPayload).length > 0) {
          await supabase
            .from("auto_alerts")
            .update(alertPayload)
            .eq("id", resolvingIssueData.auto_alert_id);
        }
      }

      setResolvingIssueId(null);
      setResolvingIssueData(null);
      setSelectedIdsToResolve([]);
      setSelectedRows([]);
      setResolveNotes("");
      setResolveNf("");
      setResolveValue("");
      setResolvePhotos([]);
      setResolveNextDate("");
      setResolveWarningDays("");
      setResolveCurrentKm("");
      setResolveIntervalKm("");
      setResolveWarningKm("");
      setResolveNfs([
        {
          id: Date.now().toString(),
          nf_number: "",
          nf_key: "",
          items: [
            {
              id: `item-${Date.now()}`,
              item_id: "",
              name: "",
              quantity: 1,
              unit_price: 0,
            },
          ],
        },
      ]);
      setResolveStockItems([]);
      setSqlError(null);
      fetchIssues();
    } catch (err: any) {
      console.error(err);
      if (
        err.message &&
        (err.message.includes("Could not find the 'resolution_nf' column") ||
          err.message.includes("Could not find the 'item_category' column") ||
          err.message.includes('column "item_category" of relation "checklist_issues" does not exist') ||
          err.message.includes("Could not find the 'resolution_type' column") ||
          err.message.includes('column "resolution_type" of relation "checklist_issues" does not exist') ||
          err.message.includes("Could not find the 'maintenance_start_date' column") ||
          err.message.includes('column "maintenance_start_date" of relation "checklist_issues" does not exist') ||
          err.message.includes(
            'column "resolution_nf" of relation "checklist_issues" does not exist',
          ))
      ) {
        setSqlError("Oops, the database needs updating!");
      } else if (
        err.message &&
        err.message.includes("checklist_issues_status_check")
      ) {
        setSqlError(
          "Oops, the database needs updating exactly for status check!",
        );
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

  function handleBulkResolve() {
    if (selectedRows.length === 0) return;

    const idsToResolve = [];
    const grouped_issues = [];

    selectedRows.forEach((rowId) => {
      const row = issues.find((i) => i.id === rowId);
      if (row && row.grouped_issues && row.grouped_issues.length > 0) {
        idsToResolve.push(...row.grouped_issues.map((gi) => gi.id));
        grouped_issues.push(...row.grouped_issues);
      } else if (row) {
        idsToResolve.push(row.id);
        grouped_issues.push(row);
      }
    });

    const firstRow = issues.find((i) => i.id === selectedRows[0]) || grouped_issues[0];

    let issueToOpen;
    if (selectedRows.length === 1 && !firstRow.grouped_issues) {
      // Just one normal issue
      issueToOpen = firstRow;
    } else {
      issueToOpen = {
        ...firstRow,
        id: "bulk_resolve",
        item_title: `Resolução em Lote (${selectedRows.length} pendências)`,
        grouped_ids: idsToResolve,
        grouped_issues: grouped_issues,
        auto_alert_id: null, // Bulk resolve doesn't support calibrating multiple alerts at once
        auto_alerts: null,
        status: "pending",
      };
    }

    openResolveModal(issueToOpen, "resolve");
  }

  async function handleBulkDelete() {
    if (selectedRows.length === 0) return;
    if (
      !confirm(
        `Deseja realmente excluir ${selectedRows.length} pendências selecionadas permanentemente?`,
      )
    )
      return;

    // gather all underlying ids from the selected row grouped_ids
    const idsToDelete: string[] = [];
    selectedRows.forEach((rowId) => {
      const row = issues.find((i) => i.id === rowId);
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
          resolution_type: null,
          item_category: null,
          maintenance_start_date: null,
          maintenance_end_date: null,
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
    .filter((issue) => {
      // Ocultar itens marcados como normal no checklist (que geraram resolução automática)
      if (issue.status === "resolved" && issue.resolution_notes?.toLowerCase().includes("normal no checklist")) {
        return false;
      }
      if (activeTab === "waiting_nf") {
        return issue.status === "resolved" && issue.resolution_notes?.startsWith("[AGUARDANDO_NF]");
      }
      if (activeTab === "resolved") {
        return issue.status === "resolved" && !issue.resolution_notes?.startsWith("[AGUARDANDO_NF]");
      }
      return issue.status?.toLowerCase().trim() === activeTab;
    })
    .filter((issue) => {
      if (alertFilter === "all") return true;
      if (alertFilter === "driver") return !issue.auto_alert_id;
      if (alertFilter === "alert_km")
        return issue.auto_alerts?.trigger_type === "km";
      if (alertFilter === "alert_date")
        return issue.auto_alerts?.trigger_type === "date";
      if (alertFilter === "expired") {
        if (!issue.auto_alerts) return false;
        if (
          issue.auto_alerts.trigger_type === "date" &&
          issue.auto_alerts.trigger_date
        ) {
          return new Date(issue.auto_alerts.trigger_date) < new Date();
        }
        if (
          issue.auto_alerts.trigger_type === "km" &&
          issue.auto_alerts.interval_km
        ) {
          // Se o odometro atual >= last_km + interval_km
          const lastKm = issue.auto_alerts.last_km || 0;
          const intervalKm = issue.auto_alerts.interval_km || 0;
          const currentKm = odometers[issue.vehicle_id] || lastKm || 0;
          return currentKm >= lastKm + intervalKm;
        }
        return false;
      }
      return true;
    })
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

  const pendingCount = issues.filter((i) => i.status?.toLowerCase().trim() === "pending").length;
  const waitingCount = issues.filter((i) => i.status?.toLowerCase().trim() === "waiting").length;
  const waitingNfCount = issues.filter((i) => i.status?.toLowerCase().trim() === "resolved" && i.resolution_notes?.startsWith("[AGUARDANDO_NF]")).length;
  const resolvedCount = issues.filter((i) => i.status?.toLowerCase().trim() === "resolved" && !i.resolution_notes?.startsWith("[AGUARDANDO_NF]") && !i.resolution_notes?.toLowerCase().includes("normal no checklist")).length;

  const filteredAlertsForTracking = alerts.filter((alert) => {
    const titleMatch = (alert.title || "")
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const vehicleMatch =
      (alert.vehicles?.plate || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (alert.vehicles?.model || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    const driverMatch = (alert.profiles?.full_name || "")
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesSearch = titleMatch || vehicleMatch || driverMatch;

    if (!matchesSearch) return false;

    if (trackingTypeFilter === "km" && alert.trigger_type !== "km") return false;
    if (trackingTypeFilter === "date" && alert.trigger_type !== "date") return false;
    if (trackingTypeFilter === "hours" && alert.trigger_type !== "hours") return false;

    if (trackingFilter === "all") return true;

    const isKm = alert.trigger_type === "km";
    const isHours = alert.trigger_type === "hours";
    let isOverdue = false;
    let isNear = false;

    if (isKm) {
      const currentKm = odometers[alert.target_vehicle_id] || 0;
      const targetKm = Number(alert.last_km || 0) + Number(alert.interval_km || 0);
      const remainingKm = targetKm - currentKm;
      isOverdue = remainingKm <= 0;
      isNear = remainingKm > 0 && remainingKm <= (Number(alert.warning_km) || 1000);
    } else if (isHours) {
      const currentHours = alert.vehicles?.hour_meter_current || 0;
      const targetHours = Number(alert.last_hours || 0) + Number(alert.interval_hours || 0);
      const remainingHours = targetHours - currentHours;
      isOverdue = remainingHours <= 0;
      isNear = remainingHours > 0 && remainingHours <= (Number(alert.warning_hours) || 100);
    } else if (alert.trigger_date) {
      const targetDate = new Date(alert.trigger_date + "T00:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = targetDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      isOverdue = daysRemaining < 0;
      isNear = daysRemaining >= 0 && daysRemaining <= (Number(alert.warning_days) || 7);
    }

    if (trackingFilter === "overdue") return isOverdue;
    if (trackingFilter === "near") return isNear;
    if (trackingFilter === "ok") return !isOverdue && !isNear;

    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-app-border">
        {["pending", "waiting", "waiting_nf", "resolved", "maintenance_tracking"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === tab
                ? "bg-white text-primary border-t border-x border-app-border shadow-sm -mb-[1px]"
                : "text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {tab === "pending"
              ? `Pendentes (${pendingCount})`
              : tab === "waiting"
                ? `Aguardando (${waitingCount})`
                : tab === "waiting_nf"
                  ? `Aguard. NF (${waitingNfCount})`
                  : tab === "resolved"
                    ? `Resolvidas (${resolvedCount})`
                    : tab === "maintenance_tracking"
                      ? "Acompanhamento"
                      : ""}
          </button>
        ))}
      </div>

      {activeTab === "maintenance_tracking" ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-black text-text-main tracking-tight flex items-center gap-2">
                <Gauge className="text-primary" size={24} /> Acompanhamento
              </h2>
              <p className="text-sm text-text-muted mt-1">
                Monitore alertas de manutenção preventiva programados.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white p-4 rounded-2xl border border-zinc-200">
            <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <select
                value={trackingTypeFilter}
                onChange={(e) => setTrackingTypeFilter(e.target.value as any)}
                className="h-9 px-3 bg-app-bg rounded-xl text-xs font-bold text-text-main border border-app-border focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="all">Todos os Tipos</option>
                <option value="km">Por KM</option>
                <option value="date">Por Data</option>
                <option value="hours">Por Horímetro</option>
              </select>

              <select
                value={trackingFilter}
                onChange={(e) => setTrackingFilter(e.target.value as any)}
                className="h-9 px-3 bg-app-bg rounded-xl text-xs font-bold text-text-main border border-app-border focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="all">Todos os Status</option>
                <option value="overdue">Atrasadas / Vencidas</option>
                <option value="near">Próximas do Vencimento</option>
                <option value="ok">Em dia</option>
              </select>

              <button
                onClick={handlePrintTracking}
                className="h-9 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-2"
              >
                <Printer size={14} />
                Imprimir
              </button>

              <div className="relative w-full md:w-64">
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
          </div>

          {filteredAlertsForTracking.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-app-border text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mx-auto text-zinc-300">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <p className="text-zinc-600 font-bold">
                  Nenhuma manutenção monitorada encontrada.
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  Selecione outros filtros ou crie regras na aba "Alertas
                  Automáticos".
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredAlertsForTracking.map((alert) => {
                const isKm = alert.trigger_type === "km";
                const isHours = alert.trigger_type === "hours";

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
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-zinc-50 p-3 rounded-2xl border border-zinc-100">
                        <div className="text-center">
                          <span className="text-[9px] uppercase font-black text-zinc-400 tracking-wider block font-sans">
                            Revisão
                          </span>
                          <span className="text-xs font-bold text-zinc-700 font-sans">
                            {lastKm.toLocaleString("pt-BR")} KM
                          </span>
                        </div>
                        <div className="text-center border-l border-zinc-200 pl-1">
                          <span className="text-[9px] uppercase font-black text-zinc-400 tracking-wider block font-sans">
                            Atual
                          </span>
                          <span className="text-xs font-bold text-zinc-700 font-sans">
                            {currentKm.toLocaleString("pt-BR")} KM
                          </span>
                        </div>
                        <div className="text-center border-l border-zinc-200 pl-1">
                          <span className="text-[9px] uppercase font-black text-zinc-400 tracking-wider block font-sans">
                            Falta
                          </span>
                          <span className={`text-xs font-black font-sans ${isOverdue ? "text-red-650" : "text-zinc-700"}`}>
                            {isOverdue ? `${Math.abs(remainingKm).toLocaleString("pt-BR")} KM d+` : `${remainingKm.toLocaleString("pt-BR")} KM`}
                          </span>
                        </div>
                        <div className="text-center border-l border-zinc-200 pl-1">
                          <span className="text-[9px] uppercase font-black text-zinc-400 tracking-wider block font-sans">
                            Alvo
                          </span>
                          <span className="text-xs font-bold text-primary font-mono">
                            {targetKm.toLocaleString("pt-BR")} KM
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 font-sans">
                          <span>Desgaste / Intervalo ({intervalKm.toLocaleString("pt-BR")} KM)</span>
                          <span>{clampedProgressPct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div className={`h-full transition-all ${isOverdue ? "bg-red-500" : isNear ? "bg-orange-500" : "bg-green-500"}`} style={{ width: `${clampedProgressPct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                } else if (isHours) {
                  const currentHours = alert.vehicles?.hour_meter_current || 0;
                  const intervalHours = Number(alert.interval_hours) || 0;
                  const lastHours = Number(alert.last_hours) || 0;
                  const targetHours = lastHours + intervalHours;
                  const remainingHours = targetHours - currentHours;

                  if (intervalHours > 0) {
                    progressPct = ((currentHours - lastHours) / intervalHours) * 100;
                  }
                  progressPct = Math.max(0, Math.round(progressPct));
                  const clampedProgressPct = Math.min(100, progressPct);

                  const isOverdue = remainingHours <= 0;
                  const isNear = remainingHours > 0 && remainingHours <= (Number(alert.warning_hours) || 100);

                  if (isOverdue) {
                    statusBadgeColor = "bg-red-50 text-red-700 border-red-200 animate-pulse";
                    statusText = "Atrasada / Vencida";
                  } else if (isNear) {
                    statusBadgeColor = "bg-orange-50 text-orange-700 border-orange-200";
                    statusText = "Vence em breve";
                  }

                  statsContent = (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-zinc-50 p-3 rounded-2xl border border-zinc-100">
                        <div className="text-center">
                          <span className="text-[9px] uppercase font-black text-zinc-400 tracking-wider block font-sans">
                            Revisão
                          </span>
                          <span className="text-xs font-bold text-zinc-700 font-sans">
                            {lastHours.toLocaleString("pt-BR")} H
                          </span>
                        </div>
                        <div className="text-center border-l border-zinc-200 pl-1">
                          <span className="text-[9px] uppercase font-black text-zinc-400 tracking-wider block font-sans">
                            Atual
                          </span>
                          <span className="text-xs font-bold text-zinc-700 font-sans">
                            {currentHours.toLocaleString("pt-BR")} H
                          </span>
                        </div>
                        <div className="text-center border-l border-zinc-200 pl-1">
                          <span className="text-[9px] uppercase font-black text-zinc-400 tracking-wider block font-sans">
                            Falta
                          </span>
                          <span className={`text-xs font-black font-sans ${isOverdue ? "text-red-650" : "text-zinc-700"}`}>
                            {isOverdue ? `${Math.abs(remainingHours).toLocaleString("pt-BR")} H d+` : `${remainingHours.toLocaleString("pt-BR")} H`}
                          </span>
                        </div>
                        <div className="text-center border-l border-zinc-200 pl-1">
                          <span className="text-[9px] uppercase font-black text-zinc-400 tracking-wider block font-sans">
                            Alvo
                          </span>
                          <span className="text-xs font-bold text-primary font-mono">
                            {targetHours.toLocaleString("pt-BR")} H
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 font-sans">
                          <span>Desgaste / Intervalo ({intervalHours.toLocaleString("pt-BR")} H)</span>
                          <span>{clampedProgressPct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div className={`h-full transition-all ${isOverdue ? "bg-red-500" : isNear ? "bg-orange-500" : "bg-green-500"}`} style={{ width: `${clampedProgressPct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                } else if (alert.trigger_date) {
                  const targetDate = new Date(alert.trigger_date + "T00:00:00");
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const diffTime = targetDate.getTime() - today.getTime();
                  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  const targetDateStr = targetDate.toLocaleDateString("pt-BR");

                  const isOverdue = daysRemaining < 0;
                  const isNear = daysRemaining >= 0 && daysRemaining <= (Number(alert.warning_days) || 7);

                  if (isOverdue) {
                    statusBadgeColor = "bg-red-50 text-red-700 border-red-200 animate-pulse";
                    statusText = `Atrasada (${Math.abs(daysRemaining)} d)`;
                  } else if (isNear) {
                    statusBadgeColor = "bg-orange-50 text-orange-700 border-orange-200";
                    statusText = daysRemaining === 0 ? "Vence HOJE" : `Vence em ${daysRemaining} dias`;
                  } else {
                    statusBadgeColor = "bg-green-50 text-green-700 border-green-200";
                    statusText = `Vence em ${daysRemaining} dias`;
                  }

                  statsContent = (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 bg-zinc-50 p-3 rounded-2xl border border-zinc-100">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                          <Calendar size={18} />
                        </div>
                        <div className="flex-1">
                          <span className="text-[9px] uppercase font-black text-zinc-400 tracking-wider block font-sans">
                            Agendada Para
                          </span>
                          <span className="text-sm font-bold text-zinc-700 font-sans">
                            {targetDateStr}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] uppercase font-black text-zinc-400 tracking-wider block font-sans">
                            Tempo Restante
                          </span>
                          <span className={`text-sm font-black font-sans ${isOverdue ? "text-red-650" : "text-zinc-700"}`}>
                            {isOverdue ? `${Math.abs(daysRemaining)} dias d+` : `${daysRemaining} dias`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={alert.id}
                    className="bg-white rounded-3xl border border-app-border p-5 shadow-sm space-y-4 hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-650 font-sans">
                              {isKm
                                ? "Quilometragem (KM)"
                                : "Calendário (Data)"}
                            </span>
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wide border px-2 py-0.5 rounded-full font-sans ${statusBadgeColor}`}
                            >
                              {statusText}
                            </span>
                          </div>
                          <h4
                            className="text-sm font-black text-text-main line-clamp-1 font-sans"
                            title={alert.title}
                          >
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
                            <span className="font-bold text-text-main">
                              {alert.vehicles.plate}{" "}
                              {alert.vehicles.model
                                ? `(${alert.vehicles.model})`
                                : ""}
                            </span>
                          </div>
                        )}
                        {alert.profiles && (
                          <div className="flex justify-between font-sans">
                            <span>Motorista:</span>
                            <span className="font-bold text-text-main">
                              {alert.profiles.full_name}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-zinc-100 pt-4 space-y-3">
                      {statsContent}

                      <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
                        <button
                          type="button"
                          onClick={() => setSelectedAlertForHistory(alert)}
                          className="flex-1 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                          title="Ver histórico de manutenções executadas para esta regra"
                        >
                          <History size={14} /> Histórico
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenResolveForAlert(alert)}
                          className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                          title="Registrar manutenção concluída / Dar baixa nesta regra"
                        >
                          <Wrench size={14} /> Registrar Baixa
                        </button>
                      </div>
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
          <div className="p-5 border-b border-app-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              {activeTab === "pending"
                ? "Pendências de Manutenção"
                : activeTab === "waiting"
                  ? "Manutenções em Aguardo"
                  : activeTab === "waiting_nf"
                    ? "Aguardando NF"
                    : "Manutenções Resolvidas"}
            </span>

            <div className="flex items-center gap-4">
              {selectedRows.length > 0 &&
                (activeTab === "pending" || activeTab === "waiting" || activeTab === "waiting_nf") &&
                user?.role === "admin" && (
                  <>
                    <button
                      onClick={handleBulkDelete}
                      className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors uppercase tracking-wider"
                    >
                      <Trash2 size={14} />
                      Excluir ({selectedRows.length})
                    </button>
                    <button
                      onClick={handleBulkResolve}
                      className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors uppercase tracking-wider"
                    >
                      <Wrench size={14} />
                      Resolver Selecionadas ({selectedRows.length})
                    </button>
                  </>
                )}

              <button
                onClick={handlePrintIssuesList}
                title="Imprimir lista de pendências"
                className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors uppercase tracking-wider border border-zinc-200 shadow-sm"
              >
                <Printer size={14} />
                Imprimir Lista
              </button>

              <button
                onClick={() => setIsManualModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors uppercase tracking-wider shadow-sm"
              >
                <Plus size={14} />
                Lançar Nova
              </button>

              <div className="flex items-center gap-2">
                <select
                  value={alertFilter}
                  onChange={(e) => setAlertFilter(e.target.value as any)}
                  className="h-8 px-3 bg-app-bg rounded-lg text-[10px] border border-app-border font-bold text-gray-600 focus:ring-1 focus:ring-primary focus:outline-none uppercase tracking-wider"
                >
                  <option value="all">Todos os Tipos</option>
                  <option value="driver">Relato de Motoristas</option>
                  <option value="alert_km">Alertas de KM</option>
                  <option value="alert_date">Alertas de Data</option>
                  <option value="expired">Atrasados / Vencidos</option>
                </select>

                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                  />

                  <input
                    type="text"
                    placeholder="Filtrar placa, item ou motorista..."
                    className="h-8 pl-9 pr-4 bg-app-bg rounded-lg text-[10px] border border-app-border w-full sm:w-56 lg:w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
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
                      Insira itens em "Aguardando" se precisar aguardar peças ou
                      serviços.
                    </p>
                  </>
                ) : activeTab === "waiting_nf" ? (
                  <>
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                      <Receipt size={32} className="text-blue-500" />
                    </div>
                    <p className="text-sm text-gray-500 font-bold">
                      Nenhuma pendência aguardando NF!
                    </p>
                    <p className="text-xs text-gray-400">
                      As manutenções resolvidas que aguardam nota fiscal aparecerão aqui.
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
          ) : (<>{/* Mobile View */}
            <div className="grid grid-cols-1 gap-4 md:hidden p-4">
              {filteredIssues.map((issue) => {
                const imageUrl = issue.photo_url ? supabase.storage.from("checklist-photos").getPublicUrl(issue.photo_url).data.publicUrl : null;
                const isSelected = selectedRows.includes(issue.id);
                
                return (
                  <div key={issue.id} className={`bg-white rounded-xl border p-4 flex flex-col gap-3 shadow-sm transition-colors overflow-hidden ${isSelected ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-app-border'} `}>
                    <div className="flex justify-between items-start">
                      <div className="flex gap-2 items-start">
                        {(activeTab === "pending" || activeTab === "waiting" || activeTab === "waiting_nf") && user?.role === "admin" && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedRows((prev) => [...prev, issue.id]);
                              else setSelectedRows((prev) => prev.filter((id) => id !== issue.id));
                            }}
                            className="rounded border-gray-300 text-primary mt-1"
                          />
                        )}
                        <div>
                          <div className="font-bold text-zinc-900">{issue.vehicles?.plate || issue.trailers?.plate || "Sem Placa"}</div>
                          <div className="text-xs text-zinc-500">{issue.profiles?.full_name || "N/A"}</div>
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        <div className="text-zinc-900 font-medium">{new Date(issue.created_at).toLocaleDateString()}</div>
                        <div className="text-zinc-500">{new Date(issue.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>

                    <div className="bg-zinc-50 rounded-lg p-3">
                      <div className="text-sm font-bold text-zinc-900 flex items-center">{issue.item_title}{getPriorityBadge(issue.priority)}</div>
                      {issue.description && <div className="text-xs text-zinc-600 mt-1">{issue.description}</div>}
                      
                      {issue.status === "waiting" && issue.resolution_notes && (
                        <div className="mt-2 bg-amber-50 p-2 rounded-lg border border-amber-100">
                          <div className="text-[10px] font-bold text-amber-700 uppercase mb-0.5">Comentário / Tratativa:</div>
                          <div className="text-xs text-amber-900/80 italic">{issue.resolution_notes}</div>
                        </div>
                      )}

                      {issue.status === "resolved" && (
                        issue.resolution_notes?.startsWith("[AGUARDANDO_NF]") ? (
                          <div className="mt-2 bg-blue-50 p-2 rounded-lg border border-blue-100 text-xs">
                            <div className="font-bold text-blue-700">Aguardando NF: {new Date(issue.resolved_at!).toLocaleDateString()}</div>
                            {issue.resolution_value && <div className="text-blue-800 font-medium">Custo: R$ {Number(issue.resolution_value).toFixed(2)}</div>}
                          </div>
                        ) : (
                          <div className="mt-2 bg-green-50 p-2 rounded-lg border border-green-100 text-xs">
                            <div className="font-bold text-green-700">Resolvido: {new Date(issue.resolved_at!).toLocaleDateString()}</div>
                            {issue.resolution_value && <div className="text-green-800 font-medium">Custo: R$ {Number(issue.resolution_value).toFixed(2)}</div>}
                          </div>
                        )
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-zinc-100">
                      <div>
                        {imageUrl ? (
                          <button onClick={() => setSelectedImage(imageUrl)} className="text-xs text-blue-600 font-bold flex items-center gap-1">
                            📷 Ver Foto
                          </button>
                        ) : (
                          <span className="text-xs text-zinc-400">Sem foto</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {activeTab === "resolved" ? (
                          <>
                            <button onClick={() => setSelectedViewIssue(issue)} className="p-2 text-zinc-400 hover:text-zinc-600 rounded-lg">
                              <Printer size={16} />
                            </button>
                            <button onClick={() => setSelectedIssue(issue)} className="px-3 py-1.5 bg-zinc-900 text-white text-[10px] font-black uppercase rounded-lg">
                              Detalhes
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => setSelectedViewIssue(issue)} className="p-2 text-zinc-600 hover:text-zinc-900 bg-zinc-50 rounded-lg border border-zinc-200" title="Imprimir Ficha">
                              <Printer size={16} />
                            </button>
                            <button onClick={() => setSelectedIssue(issue)} className="px-3 py-1.5 bg-primary text-white text-[10px] font-black uppercase rounded-lg">
                              Analisar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left whitespace-nowrap">
                <thead className="bg-app-bg/50">
                  <tr>
                    {(activeTab === "pending" || activeTab === "waiting" || activeTab === "waiting_nf") &&
                      user?.role === "admin" && (
                        <th className="px-5 py-3 w-10">
                          <input
                            type="checkbox"
                            checked={
                              selectedRows.length === filteredIssues.length &&
                              filteredIssues.length > 0
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedRows(
                                  filteredIssues.map((i) => i.id),
                                );
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
                        className={`transition-colors ${selectedRows.includes(issue.id) ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-gray-50"} `}
                      >
                        {(activeTab === "pending" || activeTab === "waiting" || activeTab === "waiting_nf") &&
                          user?.role === "admin" && (
                            <td className="px-5 py-4 w-10">
                              <input
                                type="checkbox"
                                checked={selectedRows.includes(issue.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedRows((prev) => [
                                      ...prev,
                                      issue.id,
                                    ]);
                                  } else {
                                    setSelectedRows((prev) =>
                                      prev.filter((id) => id !== issue.id),
                                    );
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
                          <div className="text-sm font-medium flex items-center">
                            {issue.item_title}
                            {getPriorityBadge(issue.priority)}
                          </div>
                          {issue.description && (
                            <div className="text-xs text-gray-500 mt-1 max-w-xs">
                              {issue.description}
                            </div>
                          )}
                          {issue.status === "waiting" &&
                            issue.resolution_notes && (
                              <div className="mt-2 bg-amber-50 p-2 rounded-lg border border-amber-100 max-w-xs">
                                <div className="text-[10px] font-bold text-amber-700 uppercase mb-0.5">
                                  Comentário / Tratativa:
                                </div>
                                <div className="text-xs text-amber-900/80 italic break-words">
                                  {issue.resolution_notes}
                                </div>
                                {(issue.maintenance_start_date || issue.maintenance_end_date || issue.item_category) && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {issue.item_category && issue.item_category.split(', ').map(cat => (
                                      <span key={cat} className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-purple-200 bg-purple-50 text-purple-700">
                                        {cat}
                                      </span>
                                    ))}
                                    {(issue.maintenance_start_date || issue.maintenance_end_date) && (
                                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-200 bg-amber-100 text-amber-800">
                                      {issue.maintenance_start_date ? new Date(issue.maintenance_start_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '?'} 
                                      {' a '} 
                                      {issue.maintenance_end_date ? new Date(issue.maintenance_end_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '?'}
                                    </span>
                                    )}
                                  </div>
                                )}
                                {issue.resolution_comments &&
                                  issue.resolution_comments.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-amber-200/50">
                                      <span className="text-[9px] font-bold text-amber-800 uppercase block mb-1">
                                        Último andamento:
                                      </span>
                                      <div className="text-xs text-amber-900 italic line-clamp-2">
                                        "
                                        {
                                          issue.resolution_comments[
                                            issue.resolution_comments.length - 1
                                          ].text
                                        }
                                        "
                                      </div>
                                    </div>
                                  )}
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
                              <button
                                onClick={() => setSelectedViewIssue(issue)}
                                title="Imprimir / Ver Detalhes"
                                className="w-8 h-8 flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg transition-colors border border-zinc-200"
                              >
                                <Printer size={16} />
                              </button>
                              {user?.role === "admin" && (
                                <button
                                  onClick={() =>
                                    openResolveModal(issue, "delete")
                                  }
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
                            <div className="flex items-start justify-end gap-2 text-left">
                              <div className="flex justify-end items-center gap-1.5 shrink-0">
                                {user?.role === "admin" && (
                                  <button
                                    onClick={() =>
                                      openResolveModal(issue, "delete")
                                    }
                                    title="Excluir pendência"
                                    className="w-8 h-8 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors border border-red-100"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                                <button
                                  onClick={() => setSelectedViewIssue(issue)}
                                  title="Ver Detalhes / Imprimir"
                                  className="w-8 h-8 flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors border border-blue-100"
                                >
                                  <Eye size={14} />
                                </button>
                                <button
                                  onClick={() => handleRevertIssue(issue)}
                                  title="Voltar para Pendentes"
                                  className="w-8 h-8 flex items-center justify-center bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg transition-colors border border-orange-100"
                                >
                                  <Undo size={14} />
                                </button>
                                <button
                                  onClick={() => openResolveModal(issue)}
                                  className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 text-xs font-bold transition-colors"
                                >
                                  <Clock size={12} />
                                  Editar / Resolver
                                </button>
                              </div>
                            </div>
                          )}

                          {issue.status === "resolved" && (
                            <div className="flex items-start justify-end gap-6 text-left">
                              <div className="flex-1 max-w-[200px]">
                                <div className="flex flex-wrap items-center gap-2">
                                  {issue.resolution_notes?.startsWith("[AGUARDANDO_NF]") ? (
                                    <div className="text-sm text-blue-600 font-semibold flex items-center gap-1">
                                      <Receipt size={14} />
                                      Aguardando NF
                                    </div>
                                  ) : (
                                    <div className="text-sm text-green-600 font-semibold flex items-center gap-1">
                                      <CheckCircle size={14} />
                                      Resolvido
                                    </div>
                                  )}
                                  {issue.resolution_type && (
                                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-700">
                                      {issue.resolution_type}
                                    </span>
                                  )}
                                  {issue.item_category && issue.item_category.split(', ').map(cat => (
                                    <span key={cat} className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-purple-200 bg-purple-50 text-purple-700">
                                      {cat}
                                    </span>
                                  ))}
                                  {(issue.maintenance_start_date || issue.maintenance_end_date) && (
                                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-700">
                                      {issue.maintenance_start_date ? new Date(issue.maintenance_start_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '?'} 
                                      {' a '} 
                                      {issue.maintenance_end_date ? new Date(issue.maintenance_end_date).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '?'}
                                    </span>
                                  )}
                                </div>

                                {issue.resolution_notes && (
                                  <div className="text-text-muted text-xs mt-1">
                                    {issue.resolution_notes.replace("[AGUARDANDO_NF] ", "").replace("[AGUARDANDO_NF]", "")}
                                  </div>
                                )}

                                {(issue.resolution_nfs || issue.resolution_nf) &&
                                  (() => {
                                    try {
                                      let nfs = issue.resolution_nfs;
                                      if (!nfs && typeof issue.resolution_nf === 'string') {
                                        nfs = JSON.parse(issue.resolution_nf);
                                      }
                                      if (typeof nfs === 'string') {
                                        nfs = JSON.parse(nfs);
                                      }
                                      if (Array.isArray(nfs)) {
                                        nfs = nfs.filter(
                                          (nf) =>
                                            nf.nf_number?.trim() ||
                                            nf.nf_key?.trim() ||
                                            nf.items?.some((i: any) =>
                                              i.name?.trim(),
                                            ),
                                        );
                                        if (nfs.length > 0) {
                                          return (
                                            <div className="mt-2 space-y-2 bg-zinc-50 border border-zinc-150 rounded-xl p-2 max-w-[200px]">
                                              <div className="text-[9px] uppercase font-bold text-zinc-400">
                                                Notas Fiscais:
                                              </div>
                                              {nfs.map(
                                                (nf: any, idx: number) => {
                                                  const nfSum =
                                                    nf.items?.reduce(
                                                      (
                                                        curSum: number,
                                                        item: any,
                                                      ) =>
                                                        curSum +
                                                        Number(
                                                          item.quantity || 1,
                                                        ) *
                                                          Number(
                                                            item.unit_price ||
                                                              0,
                                                          ),
                                                      0,
                                                    ) || 0;
                                                  return (
                                                    <div
                                                      key={nf.id || idx}
                                                      className="text-[10px] border-b border-zinc-200 last:border-b-0 pb-1.5 last:pb-0 space-y-0.5"
                                                    >
                                                      <div className="flex justify-between items-center font-bold text-zinc-700">
                                                        <span>
                                                          NF #
                                                          {nf.nf_number ||
                                                            "S/N"}
                                                        </span>
                                                        <span className="text-primary font-black">
                                                          R${" "}
                                                          {nfSum.toLocaleString(
                                                            "pt-BR",
                                                            {
                                                              minimumFractionDigits: 2,
                                                            },
                                                          )}
                                                        </span>
                                                      </div>
                                                      </div>
                                                  );
                                                },
                                              )}
                                            </div>
                                          );
                                        }
                                      }
                                    } catch (e) {
                                      // fallback
                                      if (
                                        issue.resolution_nf.trim() !== "" &&
                                        issue.resolution_nf !== "[]" &&
                                        issue.resolution_nf !==
                                          `[{"nf_number":"","nf_key":"","items":[{"id":"item-1","item_id":"","name":"","quantity":1,"unit_price":0}]}]`
                                      ) {
                                        return (
                                          <div className="text-zinc-600 text-[10px] mt-1 font-bold uppercase tracking-widest">
                                            NF: {issue.resolution_nf}
                                          </div>
                                        );
                                      }
                                    }
                                    return null;
                                  })()}
                                {(!issue.resolution_nf ||
                                  !issue.resolution_nf.startsWith("[")) &&
                                  issue.resolution_value > 0 && (
                                    <div className="text-primary text-[10px] font-black uppercase tracking-widest mt-1">
                                      Valor: R${" "}
                                      {issue.resolution_value.toLocaleString(
                                        "pt-BR",
                                        { minimumFractionDigits: 2 },
                                      )}
                                    </div>
                                  )}
                                {issue.resolution_photos &&
                                  issue.resolution_photos.length > 0 && (
                                    <div className="flex gap-1 mt-2">
                                      {issue.resolution_photos.map(
                                        (pUrl: string, i: number) => (
                                          <button
                                            key={i}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const fullUrl = supabase.storage
                                                .from("checklist-photos")
                                                .getPublicUrl(pUrl)
                                                .data.publicUrl;
                                              setSelectedImage(fullUrl);
                                              setZoom(1);
                                            }}
                                            title="Ver Foto do Serviço"
                                            className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center cursor-pointer border border-gray-200 hover:border-primary overflow-hidden shrink-0"
                                          >
                                            <img
                                              src={
                                                supabase.storage
                                                  .from("checklist-photos")
                                                  .getPublicUrl(pUrl).data
                                                  .publicUrl
                                              }
                                              className="w-full h-full object-cover"
                                              alt="Solução"
                                            />
                                          </button>
                                        ),
                                      )}
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
                                  onClick={() => setSelectedViewIssue(issue)}
                                  title="Ver Detalhes / Imprimir"
                                  className="w-8 h-8 flex items-center justify-center bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors"
                                >
                                  <Eye size={16} />
                                </button>
                                <button
                                  onClick={() => handleRevertIssue(issue)}
                                  title="Reabrir pendência"
                                  className="w-8 h-8 flex items-center justify-center bg-orange-100 hover:bg-orange-200 text-orange-600 rounded-lg transition-colors"
                                >
                                  <Undo size={16} />
                                </button>
                                <button
                                  onClick={() => openResolveModal(issue)}
                                  title="Editar"
                                  className="w-8 h-8 flex items-center justify-center bg-amber-100 hover:bg-amber-200 text-amber-600 rounded-lg transition-colors"
                                >
                                  <Edit size={16} />
                                </button>
                                {user?.role === "admin" && (
                                  <button
                                    onClick={() =>
                                      openResolveModal(issue, "delete")
                                    }
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
          </>
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
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 transition-all duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[92vh] max-h-[92vh] flex flex-col overflow-hidden relative border border-zinc-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-zinc-50/50">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border text-left ${
                      modalActionType === "resolve"
                        ? resolveSubStatus === "waiting_nf"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : resolveSubStatus === "waiting"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    {modalActionType === "resolve"
                      ? resolveSubStatus === "waiting_nf"
                        ? "Aguardando NF"
                        : resolveSubStatus === "waiting"
                        ? "Aguardando Peças / Serviço"
                        : "Solucionar Pendência de Manutenção"
                      : "Excluir Registro de Pendência"}
                  </span>
                  {resolvingIssueData?.vehicles?.plate && (
                    <span className="text-xs bg-zinc-200 text-zinc-700 px-2 py-0.5 rounded font-mono font-bold uppercase">
                      Veículo: {resolvingIssueData.vehicles.plate}
                    </span>
                  )}
                  {resolvingIssueData?.trailers?.plate && (
                    <span className="text-xs bg-zinc-200 text-zinc-700 px-2 py-0.5 rounded font-mono font-bold uppercase">
                      Semirreboque: {resolvingIssueData.trailers.plate}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black text-zinc-900 mt-1 flex items-center gap-2 text-left">
                  {resolvingIssueData?.item_title || "Sem Título"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setResolvingIssueId(null);
                  setResolvingIssueData(null);
                  setSelectedIdsToResolve([]);
                  setSqlError(null);
                }}
                disabled={isResolving}
                className="p-2 text-zinc-400 hover:text-zinc-650 hover:bg-zinc-100 rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Sub Status Switcher (Only for Resolve) */}
            {modalActionType === "resolve" && !sqlError && (
              <div className="px-6 pt-5 shrink-0 text-left">
                <div className="bg-zinc-100 p-1 rounded-2xl flex border border-zinc-200/50 w-full max-w-2xl overflow-x-auto whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => {
                      setResolveSubStatus("resolved");
                    }}
                    className={`flex-1 py-1.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      resolveSubStatus === "resolved"
                        ? "bg-white text-emerald-800 shadow-sm font-black"
                        : "text-zinc-500 hover:text-zinc-805"
                    }`}
                  >
                    <CheckCircle
                      size={15}
                      className={
                        resolveSubStatus === "resolved"
                          ? "text-emerald-500"
                          : ""
                      }
                    />
                    Solucionar / Resolver
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResolveSubStatus("waiting");
                    }}
                    className={`flex-1 py-1.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      resolveSubStatus === "waiting"
                        ? "bg-white text-amber-800 shadow-sm font-black"
                        : "text-zinc-500 hover:text-zinc-805"
                    }`}
                  >
                    <Clock
                      size={15}
                      className={
                        resolveSubStatus === "waiting" ? "text-amber-500" : ""
                      }
                    />
                    Colocar em Aguardo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setResolveSubStatus("waiting_nf");
                    }}
                    className={`flex-1 py-1.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      resolveSubStatus === "waiting_nf"
                        ? "bg-white text-blue-800 shadow-sm font-black"
                        : "text-zinc-500 hover:text-zinc-805"
                    }`}
                  >
                    <Receipt
                      size={15}
                      className={
                        resolveSubStatus === "waiting_nf" ? "text-blue-500" : ""
                      }
                    />
                    Aguardando NF
                  </button>
                </div>
              </div>
            )}

            {/* Content Body Container */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6 text-left">
              {modalActionType === "resolve" &&
                !sqlError &&
                (resolveSubStatus === "resolved" ||
                  resolveSubStatus === "waiting" ||
                  resolveSubStatus === "waiting_nf") && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full min-h-0">
                    {/* Left Column: Context, General Fields and Alert info */}
                    <div className="lg:col-span-6 flex flex-col space-y-6 overflow-y-auto pr-3 min-h-0 text-left">
                      {/* Occurrences Box */}
                      {resolvingIssueData?.grouped_issues &&
                        resolvingIssueData.grouped_issues.length > 1 && (
                          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 space-y-3">
                            <div className="flex justify-between items-center">
                              <label className="block text-xs font-black text-zinc-500 uppercase tracking-wider">
                                Várias ocorrências agrupadas para este defeito:
                              </label>
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
                                className="text-xs text-primary font-bold hover:underline"
                              >
                                {selectedIdsToResolve.length ===
                                resolvingIssueData.grouped_issues.length
                                  ? "Desmarcar todas"
                                  : "Selecionar todas"}
                              </button>
                            </div>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 border border-zinc-200 rounded-xl p-2 bg-white">
                              {resolvingIssueData.grouped_issues.map(
                                (gi: any) => (
                                  <label
                                    key={gi.id}
                                    className="flex items-start gap-3 p-2 hover:bg-zinc-50 rounded-xl cursor-pointer transition-colors"
                                  >
                                    <input
                                      type="checkbox"
                                      className="mt-1 flex-shrink-0 w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                                      checked={selectedIdsToResolve.includes(
                                        gi.id,
                                      )}
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
                                    <div className="flex-1 text-xs text-left">
                                      <div className="font-extrabold text-zinc-900 text-left">
                                        {new Date(gi.created_at).toLocaleString(
                                          "pt-BR",
                                        )}
                                      </div>
                                      {gi.description && (
                                        <div className="text-zinc-600 mt-0.5 font-medium italic text-left">
                                          "{gi.description}"
                                        </div>
                                      )}
                                      {gi.profiles && (
                                        <div className="text-zinc-400 font-bold text-[10px] uppercase mt-0.5 text-left">
                                          Por: {gi.profiles.full_name}
                                        </div>
                                      )}
                                    </div>
                                  </label>
                                ),
                              )}
                            </div>
                          </div>
                        )}

                      {/* Alert Calibration Panel */}
                      {resolvingIssueData?.auto_alert_id && (
                        <div className="space-y-4">
                          {resolvingIssueData.auto_alerts?.trigger_type === "km" && (
                            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3 relative overflow-hidden">
                              <div className="flex items-center gap-2">
                                <Gauge className="text-blue-500" size={18} />
                                <h4 className="text-xs font-black text-blue-700 uppercase tracking-widest">
                                  Alerta de Quilometragem (KM)
                                </h4>
                              </div>
                              <p className="text-xs text-blue-800/80 leading-relaxed font-semibold text-left">
                                Indique o hodômetro atual e os parâmetros do alerta para reprogramar os avisos futuros.
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-[10px] font-black uppercase text-blue-700 mb-1">
                                    KM Atual do Serv. *
                                  </label>
                                  <input
                                    type="number"
                                    value={resolveCurrentKm}
                                    onChange={(e) => setResolveCurrentKm(e.target.value)}
                                    placeholder="Fração/KM"
                                    className="w-full bg-white border border-blue-300 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-black uppercase text-blue-700 mb-1">
                                    Próximo Ciclo (KM)
                                  </label>
                                  <input
                                    type="number"
                                    value={resolveIntervalKm}
                                    onChange={(e) => setResolveIntervalKm(e.target.value)}
                                    placeholder="Ciclo KM"
                                    className="w-full bg-white border border-blue-300 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-black uppercase text-blue-700 mb-1">
                                    Avisar Antes (KM)
                                  </label>
                                  <input
                                    type="number"
                                    value={resolveWarningKm}
                                    onChange={(e) => setResolveWarningKm(e.target.value)}
                                    placeholder="KM antecedência"
                                    className="w-full bg-white border border-blue-300 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                              </div>
                              {resolveCurrentKm && resolveIntervalKm && (
                                <div className="pt-2 border-t border-blue-200/60 flex flex-col gap-1 text-[11px] text-blue-900 font-bold">
                                  <span className="flex items-center gap-1.5 text-left">
                                    • Próximo programado: {Number(resolveCurrentKm) + Number(resolveIntervalKm)} KM
                                  </span>
                                  {resolveWarningKm && (
                                    <span className="flex items-center gap-1.5 text-left text-amber-700">
                                      • Avisará no painel em: {Number(resolveCurrentKm) + Number(resolveIntervalKm) - Number(resolveWarningKm)} KM
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {resolvingIssueData.auto_alerts?.trigger_type === "date" && (
                            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-3 relative overflow-hidden">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="text-orange-500" size={18} />
                                <h4 className="text-xs font-black text-orange-700 uppercase tracking-widest">
                                  Alerta Temporal (Prazo/Data)
                                </h4>
                              </div>
                              <p className="text-xs text-orange-800/80 leading-relaxed font-semibold text-left">
                                Pendência vinculada a vencimento calendarizado. Defina os prazos adequados.
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[10px] font-black uppercase text-orange-700 mb-1">
                                    Próximo Vencimento
                                  </label>
                                  <input
                                    type="date"
                                    value={resolveNextDate}
                                    onChange={(e) => setResolveNextDate(e.target.value)}
                                    className="w-full bg-white border border-orange-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-black uppercase text-orange-700 mb-1">
                                    Notificar com (Dias)
                                  </label>
                                  <input
                                    type="number"
                                    value={resolveWarningDays}
                                    onChange={(e) => setResolveWarningDays(e.target.value)}
                                    placeholder="Dias antecedência"
                                    className="w-full bg-white border border-orange-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {resolvingIssueData.auto_alerts?.trigger_type === "hours" && (
                            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 space-y-3 relative overflow-hidden">
                              <div className="flex items-center gap-2">
                                <Gauge className="text-teal-500" size={18} />
                                <h4 className="text-xs font-black text-teal-700 uppercase tracking-widest">
                                  Alerta de Horímetro (Horas)
                                </h4>
                              </div>
                              <p className="text-xs text-teal-800/80 leading-relaxed font-semibold text-left">
                                Indique o horímetro atual e os parâmetros do alerta.
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-[10px] font-black uppercase text-teal-700 mb-1">
                                    Horas Atuais *
                                  </label>
                                  <input
                                    type="number"
                                    value={resolveCurrentHours}
                                    onChange={(e) => setResolveCurrentHours(e.target.value)}
                                    placeholder="Ex: 5000"
                                    className="w-full bg-white border border-teal-300 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-black uppercase text-teal-700 mb-1">
                                    Ciclo (Horas)
                                  </label>
                                  <input
                                    type="number"
                                    value={resolveIntervalHours}
                                    onChange={(e) => setResolveIntervalHours(e.target.value)}
                                    placeholder="Intervalo"
                                    className="w-full bg-white border border-teal-300 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-black uppercase text-teal-700 mb-1">
                                    Avisar Antes (Horas)
                                  </label>
                                  <input
                                    type="number"
                                    value={resolveWarningHours}
                                    onChange={(e) => setResolveWarningHours(e.target.value)}
                                    placeholder="Aviso"
                                    className="w-full bg-white border border-teal-300 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                  />
                                </div>
                              </div>
                              {resolveCurrentHours && resolveIntervalHours && (
                                <div className="pt-2 border-t border-teal-200/60 flex flex-col gap-1 text-[11px] text-teal-900 font-bold">
                                  <span className="flex items-center gap-1.5 text-left">
                                    • Próximo programado: {Number(resolveCurrentHours) + Number(resolveIntervalHours)} H
                                  </span>
                                  {resolveWarningHours && (
                                    <span className="flex items-center gap-1.5 text-left text-amber-700">
                                      • Avisará em: {Number(resolveCurrentHours) + Number(resolveIntervalHours) - Number(resolveWarningHours)} H
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Photo Uploader */}
                      <div className="text-left">
                        <label className="block text-xs font-extrabold text-zinc-700 mb-2 uppercase tracking-wide">
                          Fotos de Comprovação / Serviço (Opcional)
                        </label>
                        <div className="flex flex-wrap gap-3 mb-2">
                          {resolvePhotos.map((p, i) => (
                            <div
                              key={i}
                              className="relative w-20 h-20 rounded-2xl border border-zinc-200 overflow-hidden shadow-sm group"
                            >
                              <img
                                referrerPolicy="no-referrer"
                                src={URL.createObjectURL(p)}
                                alt="doc"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setResolvePhotos(
                                      resolvePhotos.filter(
                                        (_, idx) => idx !== i,
                                      ),
                                    )
                                  }
                                  className="bg-red-500 text-white rounded-full p-1 hover:scale-110 hover:bg-red-650 transition-all cursor-pointer animate-none"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                          <label className="w-20 h-20 rounded-2xl border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center text-zinc-400 hover:text-primary hover:border-primary cursor-pointer transition-all bg-zinc-50 hover:bg-zinc-100/50">
                            <Camera
                              size={22}
                              className="mb-0.5 text-zinc-400"
                            />
                            <span className="text-[9px] font-bold uppercase tracking-wider">
                              Adicionar
                            </span>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              multiple
                              onChange={(e) => {
                                if (e.target.files) {
                                  const newFiles = Array.from(e.target.files);
                                  setResolvePhotos([
                                    ...resolvePhotos,
                                    ...newFiles,
                                  ]);
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>

                      {/* Operational Notes */}
                      <div className="text-left space-y-4">
                        {resolveSubStatus === "resolved" && (
                          <div>
                            <div className="mb-4">
                              <label className="block text-xs font-extrabold text-zinc-700 mb-2 uppercase tracking-wide">
                                Categoria do Item (Opcional)
                              </label>
                              <div>
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {resolveCategory && resolveCategory.split(', ').filter(Boolean).map(cat => (
                                    <span key={cat} className="text-xs font-bold px-2 py-1 bg-purple-100 text-purple-700 rounded-md flex items-center gap-1">
                                      {cat}
                                      <button type="button" onClick={() => {
                                        setResolveCategory(resolveCategory.split(', ').filter(c => c !== cat).join(', '));
                                      }} className="text-purple-900 hover:text-red-600"><X size={12} /></button>
                                    </span>
                                  ))}
                                </div>
                                <select
                                  className="w-full px-4 py-3 border border-zinc-200 rounded-2xl hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium text-zinc-800 transition-all shadow-sm bg-white"
                                  value=""
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (!val) return;
                                    const current = resolveCategory ? resolveCategory.split(', ').filter(Boolean) : [];
                                    if (!current.includes(val)) {
                                      setResolveCategory([...current, val].join(', '));
                                    }
                                  }}
                                >
                                  <option value="">Selecione para adicionar...</option>
                                  {Array.from(new Set(checklistItemsList.map((i) => i.title ? i.title.split('::')[0] : '').filter(Boolean))).sort().map((cat: any) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <label className="block text-xs font-extrabold text-zinc-700 mb-2 uppercase tracking-wide">
                              Tipo de Manutenção *
                            </label>
                            <div className="flex gap-4">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="resolveType"
                                  value="corretiva"
                                  checked={resolveType === "corretiva"}
                                  onChange={(e) => setResolveType("corretiva")}
                                  className="text-primary focus:ring-primary h-4 w-4"
                                />
                                <span className="text-sm font-semibold text-zinc-800">Corretiva</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="resolveType"
                                  value="preventiva"
                                  checked={resolveType === "preventiva"}
                                  onChange={(e) => setResolveType("preventiva")}
                                  className="text-primary focus:ring-primary h-4 w-4"
                                />
                                <span className="text-sm font-semibold text-zinc-800">Preventiva</span>
                              </label>
                            </div>
                          </div>
                        )}

                        {(resolveSubStatus === "resolved" || resolveSubStatus === "waiting") && (
                          <div className="flex gap-4">
                            <div className="flex-1">
                              <label className="block text-xs font-extrabold text-zinc-700 mb-2 uppercase tracking-wide">
                                Data Início Manutenção
                              </label>
                              <input
                                type="date"
                                className="w-full px-4 py-3 border border-zinc-200 rounded-2xl hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium text-zinc-800 transition-all shadow-sm"
                                value={resolveStartDate}
                                onChange={(e) => setResolveStartDate(e.target.value)}
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs font-extrabold text-zinc-700 mb-2 uppercase tracking-wide">
                                Data Fim Manutenção
                              </label>
                              <input
                                type="date"
                                className="w-full px-4 py-3 border border-zinc-200 rounded-2xl hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium text-zinc-800 transition-all shadow-sm"
                                value={resolveEndDate}
                                onChange={(e) => setResolveEndDate(e.target.value)}
                              />
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-extrabold text-zinc-700 mb-2 uppercase tracking-wide">
                            Observação Principal / Memorando
                          </label>
                          <textarea
                            className="w-full px-4 py-3 border border-zinc-200 rounded-2xl hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium text-zinc-800 transition-all shadow-sm"
                            rows={3}
                            placeholder="Descreva a tratariva principal, orçamentos, peças, etc..."
                            value={resolveNotes}
                            onChange={(e) => setResolveNotes(e.target.value)}
                          />
                        </div>

                        {/* Comments History */}
                        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4">
                          <label className="block text-[11px] font-black text-zinc-600 mb-3 uppercase tracking-wider">
                            Histórico de Comentários / Andamento
                          </label>

                          {resolveComments && resolveComments.length > 0 ? (
                            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto pr-2">
                              {resolveComments.map((comment: any) => (
                                <div
                                  key={comment.id}
                                  className="bg-white border text-left border-zinc-200 p-3 rounded-xl"
                                >
                                  <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-[10px] font-bold text-zinc-800">
                                      {comment.user_name}
                                    </span>
                                    <span className="text-[9px] text-zinc-500 font-medium">
                                      {new Date(
                                        comment.created_at,
                                      ).toLocaleString("pt-BR")}
                                    </span>
                                  </div>
                                  <p className="text-xs text-zinc-700 whitespace-pre-wrap leading-relaxed">
                                    {comment.text}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-4 text-zinc-400 text-xs italic mb-4">
                              Nenhum comentário registrado no histórico.
                            </div>
                          )}

                          <div>
                            <textarea
                              className="w-full px-3 py-2 border border-zinc-200 bg-white rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary text-xs font-medium text-zinc-800 transition-all shadow-sm"
                              rows={2}
                              placeholder="Adicionar novo comentário do andamento..."
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Ledger-style Financial Invoicing & Pieces */}
                    <div className="lg:col-span-6 flex flex-col h-full border-t lg:border-t-0 lg:border-l border-zinc-100 lg:pl-8 min-h-0 text-left">
                      <div className="flex justify-between items-center pb-3 border-b border-zinc-100 text-left">
                        <div className="text-left">
                          <span className="text-xs font-black uppercase text-zinc-900 tracking-wider">
                            Notas Fiscais (NFs) & Peças
                          </span>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            Vincule custos, chaves e notas ao histórico
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setResolveNfs([
                              ...resolveNfs,
                              {
                                id: Date.now().toString(),
                                nf_number: "",
                                nf_key: "",
                                items: [
                                  {
                                    id: `item-${Date.now()}`,
                                    item_id: "",
                                    name: "",
                                    quantity: 1,
                                    unit_price: 0,
                                  },
                                ],
                              },
                            ]);
                          }}
                          className="px-3 py-1.5 bg-primary/5 hover:bg-primary/10 text-xs font-extrabold text-primary rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer border border-primary/10 animate-none"
                        >
                          <Plus size={14} />
                          Nova NF
                        </button>
                      </div>

                      {/* Scrollable invoice stack */}
                      <div className="flex-1 overflow-y-auto space-y-4 pr-2 mt-4 min-h-0">
                        {resolveNfs.map((nf, nfIdx) => {
                          const nfTotal = (Array.isArray(nf.items) ? nf.items : []).reduce(
                            (acc: number, item: any) =>
                              acc +
                              Number(item.quantity || 1) *
                                Number(item.unit_price || 0),
                            0,
                          );
                          return (
                            <div
                              key={nf.id}
                              className="bg-zinc-50/50 border border-zinc-200 rounded-2xl p-4 space-y-4 relative group hover:shadow-md hover:border-zinc-300/80 transition-all duration-200 text-left animate-none"
                            >
                              {resolveNfs.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setResolveNfs(
                                      resolveNfs.filter((n) => n.id !== nf.id),
                                    );
                                  }}
                                  className="absolute top-3 right-3 text-zinc-400 hover:text-red-500 p-1 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Remover Nota Fiscal"
                                >
                                  <X size={16} />
                                </button>
                              )}
                              <div className="text-xs font-bold text-zinc-400 tracking-widest uppercase">
                                Nota Fiscal #{nfIdx + 1}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-[10px] font-black text-zinc-500 mb-1 uppercase tracking-wide">
                                    Fornecedor da NF
                                  </label>
                                  <div className="flex gap-2">
                                    <select
                                      className="flex-1 bg-white px-3 py-2 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                      value={nf.supplier_id || ""}
                                      onChange={(e) => {
                                        const updated = [...resolveNfs];
                                        updated[nfIdx].supplier_id =
                                          e.target.value;
                                        setResolveNfs(updated);
                                      }}
                                    >
                                      <option value="">Selecione...</option>
                                      {inventorySuppliers.map((s) => (
                                        <option key={s.id} value={s.id}>
                                          {s.name}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setShowAddSupplierDialog(true)
                                      }
                                      className="px-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded-xl text-zinc-600 transition-colors"
                                      title="Cadastrar Novo Fornecedor"
                                    >
                                      <Plus size={14} />
                                    </button>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-black text-zinc-500 mb-1 uppercase tracking-wide">
                                    Número da NF
                                  </label>
                                  <input
                                    className="w-full bg-white px-3 py-2 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    type="text"
                                    placeholder="Nº da Nota"
                                    value={nf.nf_number}
                                    onChange={(e) => {
                                      const updated = [...resolveNfs];
                                      updated[nfIdx].nf_number = e.target.value;
                                      setResolveNfs(updated);
                                    }}
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-black text-zinc-500 mb-1 uppercase tracking-wide">
                                    Subtotal da NF
                                  </label>
                                  <div className="w-full px-3 py-2 border border-zinc-200 bg-zinc-100 rounded-xl text-xs font-extrabold text-zinc-700 shadow-inner truncate">
                                    R${" "}
                                    {nfTotal.toLocaleString("pt-BR", {
                                      minimumFractionDigits: 2,
                                    })}
                                  </div>
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10px] font-black text-zinc-500 mb-1 uppercase tracking-wide">
                                  Chave da NF (44 dígitos)
                                </label>
                                <div className="flex gap-2 items-start">
                                  <div className="flex-1">
                                    <input
                                      className="w-full bg-white px-3 py-2 border border-zinc-200 rounded-xl text-xs font-mono text-zinc-700 hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all hover:border-zinc-300"
                                      type="text"
                                      maxLength={100}
                                      placeholder="Insira a chave/número (padrão 44 dígitos)"
                                      value={nf.nf_key}
                                      onChange={(e) => {
                                        const val = e.target.value.replace(
                                          /\D/g,
                                          "",
                                        );
                                        const updated = [...resolveNfs];
                                        updated[nfIdx].nf_key = val;
                                        setResolveNfs(updated);
                                      }}
                                    />
                                    {nf.nf_key && nf.nf_key.length !== 44 && (
                                      <span className="text-[10px] text-orange-655 block mt-1 font-semibold">
                                        Aviso: Chave padrão possui 44 dígitos ({nf.nf_key.length}).
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    disabled={!nf.nf_key || nf.nf_key.length !== 44}
                                    onClick={async () => {
                                      if (nf.nf_key.length === 44) {
                                        const btn = document.getElementById(`btn-fetch-nfe-${nfIdx}`);
                                        if (btn) btn.innerHTML = '<span class="animate-pulse">Buscando...</span>';

                                        try {
                                          const { data: nfeApi, error: apiError } = await supabase
                                            .from("integration_nfe_api")
                                            .select("*")
                                            .eq("company_id", (user as any)?.company_id)
                                            .limit(1);

                                          if (apiError || !nfeApi || nfeApi.length === 0 || !nfeApi[0].api_key) {
                                            alert("A integração da API de NFe não está configurada ou a chave é inválida. Por favor, configure na aba de Integrações (Configurações).");
                                            if (btn) btn.innerHTML = 'Buscar Dados';
                                            return;
                                          }

                                          // Mocking an actual fetch using the selected provider
                                          const providerName = nfeApi[0].provider === "arquivei" ? "Arquivei" : nfeApi[0].provider === "focus" ? "Focus NFe" : "Sieg";
                                          
                                          // Simulate network delay
                                          setTimeout(() => {
                                            const updated = [...resolveNfs];
                                            updated[nfIdx].nf_number = nf.nf_key.substring(25, 34).replace(/^0+/, '') || "12345";
                                            updated[nfIdx].items = [
                                              {
                                                id: `item-${Date.now()}-1`,
                                                item_id: "",
                                                name: "Filtro de Óleo",
                                                quantity: 1,
                                                unit_price: 120.50,
                                              },
                                              {
                                                id: `item-${Date.now()}-2`,
                                                item_id: "",
                                                name: "Óleo Motor 15W40",
                                                quantity: 4,
                                                unit_price: 45.90,
                                              }
                                            ];
                                            setResolveNfs(updated);
                                            alert(`Dados da NFe importados com sucesso via ${providerName}!`);
                                            if (btn) btn.innerHTML = 'Buscar Dados';
                                          }, 1500);

                                        } catch (e) {
                                          console.error(e);
                                          alert("Erro ao conectar com a integração da NFe.");
                                          if (btn) btn.innerHTML = 'Buscar Dados';
                                        }
                                      }
                                    }}
                                    id={`btn-fetch-nfe-${nfIdx}`}
                                    className="bg-primary hover:bg-primary-dark text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                  >
                                    Buscar Dados
                                  </button>
                                  <label className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5">
                                    <Upload size={14} />
                                    Importar XML
                                    <input
                                      type="file"
                                      accept=".xml"
                                      className="hidden"
                                      onChange={(e) => handleXmlUpload(e, nfIdx)}
                                    />
                                  </label>
                                </div>
                              </div>

                              {/* Catalog Piece selector */}
                              <div className="space-y-3 pt-3 border-t border-zinc-200/50">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                                    Itens e Peças Atreladas
                                  </span>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setShowAddItemDialog(true)}
                                      className="text-[10px] font-extrabold text-primary hover:underline cursor-pointer flex items-center gap-0.5"
                                    >
                                      + Cadastrar Peça
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = [...resolveNfs];
                                        updated[nfIdx].items.push({
                                          id: Date.now().toString(),
                                          item_id: "",
                                          name: "",
                                          quantity: 1,
                                          unit_price: 0,
                                        });
                                        setResolveNfs(updated);
                                      }}
                                      className="text-[10px] font-extrabold text-primary hover:underline cursor-pointer flex items-center gap-0.5"
                                    >
                                      + Adicionar Item
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  {nf.items.map(
                                    (item: any, itemIdx: number) => (
                                      <div
                                        key={item.id}
                                        className="grid grid-cols-12 gap-2 items-center bg-white border border-zinc-150 p-2 rounded-xl"
                                      >
                                        <div className="col-span-12 sm:col-span-5">
                                          <select
                                            className="w-full bg-white border border-zinc-200 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                                            value={item.item_id || ""}
                                            onChange={(e) => {
                                              const updated = [...resolveNfs];
                                              const selectedId = e.target.value;
                                              updated[nfIdx].items[
                                                itemIdx
                                              ].item_id = selectedId;

                                              const found = inventoryItems.find(
                                                (i) => i.id === selectedId,
                                              );
                                              if (found) {
                                                updated[nfIdx].items[
                                                  itemIdx
                                                ].name = found.name;
                                              } else {
                                                updated[nfIdx].items[
                                                  itemIdx
                                                ].name = "";
                                              }
                                              setResolveNfs(updated);
                                            }}
                                          >
                                            <option value="">
                                              -- Selecione item/peça --
                                            </option>
                                            {inventoryItems.map((invItem) => (
                                              <option
                                                key={invItem.id}
                                                value={invItem.id}
                                              >
                                                {invItem.name}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                        <div className="col-span-4 sm:col-span-3">
                                          <input
                                            type="number"
                                            min={1}
                                            placeholder="Qtd"
                                            className="w-full border border-zinc-200 rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                                            value={item.quantity || ""}
                                            onChange={(e) => {
                                              const updated = [...resolveNfs];
                                              updated[nfIdx].items[
                                                itemIdx
                                              ].quantity = Number(
                                                e.target.value,
                                              );
                                              setResolveNfs(updated);
                                            }}
                                          />
                                        </div>
                                        <div className="col-span-5 sm:col-span-3">
                                          <input
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="Unit R$"
                                            className="w-full border border-zinc-200 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                                            value={item.unit_price || ""}
                                            onChange={(e) => {
                                              const val =
                                                e.target.value.replace(
                                                  ",",
                                                  ".",
                                                );
                                              if (
                                                val === "" ||
                                                !isNaN(Number(val))
                                              ) {
                                                const updated = [...resolveNfs];
                                                updated[nfIdx].items[
                                                  itemIdx
                                                ].unit_price = val;
                                                setResolveNfs(updated);
                                              }
                                            }}
                                          />
                                        </div>
                                        <div className="col-span-3 sm:col-span-1 flex justify-center">
                                          {nf.items.length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const updated = [...resolveNfs];
                                                updated[nfIdx].items = updated[
                                                  nfIdx
                                                ].items.filter(
                                                  (it) => it.id !== item.id,
                                                );
                                                setResolveNfs(updated);
                                              }}
                                              className="text-zinc-400 hover:text-red-500 hover:bg-neutral-50 p-1 rounded-lg"
                                            >
                                              <X size={14} />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    ),
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="bg-blue-50/50 border border-blue-200 rounded-2xl p-4 mt-4 space-y-3 shrink-0 text-left">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-primary" />
                            <span className="text-xs font-black uppercase text-blue-800 tracking-wider">
                              Peças Utilizadas do Estoque
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setResolveStockItems([
                                ...resolveStockItems,
                                {
                                  id: `stock-${Date.now()}`,
                                  item_id: "",
                                  name: "",
                                  quantity: 1,
                                  unit_price: 0,
                                },
                              ]);
                            }}
                            className="bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-colors cursor-pointer"
                          >
                            + Adicionar Peça
                          </button>
                        </div>
                        <p className="text-[10px] text-blue-600 font-medium">
                          As peças listadas abaixo serão descontadas
                          automaticamente do estoque atual e somadas ao custo
                          final.
                        </p>

                        {resolveStockItems.length > 0 && (
                          <div className="space-y-2 mt-2">
                            {resolveStockItems.map(
                              (item: any, itemIdx: number) => (
                                <div
                                  key={item.id}
                                  className="grid grid-cols-12 gap-2 items-center bg-white border border-blue-100 p-2 rounded-xl shadow-sm"
                                >
                                  <div className="col-span-12 sm:col-span-5">
                                    <select
                                      className="w-full bg-white border border-blue-200 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                                      value={item.item_id || ""}
                                      onChange={(e) => {
                                        const updated = [...resolveStockItems];
                                        const selectedId = e.target.value;
                                        updated[itemIdx].item_id = selectedId;

                                        const found = inventoryItems.find(
                                          (i) => i.id === selectedId,
                                        );
                                        if (found) {
                                          updated[itemIdx].name = found.name;
                                          updated[itemIdx].unit_price =
                                            Number(found.average_cost) || 0; // set avg cost automatically
                                        } else {
                                          updated[itemIdx].name = "";
                                          updated[itemIdx].unit_price = 0;
                                        }
                                        setResolveStockItems(updated);
                                      }}
                                    >
                                      <option value="">
                                        -- Selecione peça do estoque --
                                      </option>
                                      {inventoryItems.map((invItem) => (
                                        <option
                                          key={invItem.id}
                                          value={invItem.id}
                                        >
                                          {invItem.name} (Atual:{" "}
                                          {invItem.current_quantity})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="col-span-4 sm:col-span-3">
                                    <input
                                      type="number"
                                      min={1}
                                      placeholder="Qtd"
                                      className="w-full border border-blue-200 rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-primary font-bold"
                                      value={item.quantity || ""}
                                      onChange={(e) => {
                                        const updated = [...resolveStockItems];
                                        updated[itemIdx].quantity = Number(
                                          e.target.value,
                                        );
                                        setResolveStockItems(updated);
                                      }}
                                    />
                                  </div>
                                  <div className="col-span-5 sm:col-span-3">
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      placeholder="Custo Unit R$"
                                      className="w-full border border-blue-200 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-primary font-bold bg-zinc-50"
                                      value={item.unit_price || ""}
                                      readOnly
                                      title="Custo unitário baseado no custo médio da peça (somente leitura)"
                                    />
                                  </div>
                                  <div className="col-span-3 sm:col-span-1 flex justify-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setResolveStockItems(
                                          resolveStockItems.filter(
                                            (it) => it.id !== item.id,
                                          ),
                                        );
                                      }}
                                      className="text-zinc-400 hover:text-red-500 hover:bg-neutral-50 p-1 rounded-lg"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </div>

                      {/* Supplier registration drawer */}
                      <SupplierModal
                        show={showAddSupplierDialog}
                        onClose={() => setShowAddSupplierDialog(false)}
                        onSaved={() => {
                          setShowAddSupplierDialog(false);
                          fetchCatalog();
                        }}
                        supplierToEdit={null}
                      />

                      {/* Catalog registration drawer (Inline nested overlay) */}
                      {showAddItemDialog && (
                        <div className="mt-3 p-4 bg-orange-50 border border-orange-200 rounded-2xl space-y-2 shrink-0 text-left">
                          <div className="text-xs font-black uppercase text-orange-700 tracking-wider">
                            Cadastrar Nova Peça no Estoque
                          </div>
                          <p className="text-[11px] text-orange-800">
                            O item será cadastrado em seu estoque e ficará
                            disponível para todas as NFs.
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
                            <input
                              type="text"
                              placeholder="Nome * (Ex: Amortecedor Dianteiro)"
                              className="bg-white border border-orange-300 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none font-bold"
                              value={newItemName}
                              onChange={(e) => setNewItemName(e.target.value)}
                            />
                            <input
                              type="text"
                              placeholder="SKU/Código"
                              className="bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              value={newItemSku}
                              onChange={(e) => setNewItemSku(e.target.value)}
                            />
                          <div className="w-full">
                            <div className="flex flex-wrap gap-1 mb-1.5">
                              {newItemCategory && newItemCategory.split(', ').filter(Boolean).map(cat => (
                                <span key={cat} className="text-[10px] font-bold px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded flex items-center gap-1">
                                  {cat}
                                  <button type="button" onClick={() => {
                                    setNewItemCategory(newItemCategory.split(', ').filter(c => c !== cat).join(', '));
                                  }} className="text-purple-900 hover:text-red-600"><X size={10} /></button>
                                </span>
                              ))}
                            </div>
                            <select
                              className="bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none w-full"
                              value=""
                              onChange={(e) => {
                                const val = e.target.value;
                                if (!val) return;
                                const current = newItemCategory ? newItemCategory.split(', ').filter(Boolean) : [];
                                if (!current.includes(val)) {
                                  setNewItemCategory([...current, val].join(', '));
                                }
                              }}
                            >
                              <option value="">Adicionar categoria...</option>
                              {Array.from(new Set(checklistItemsList.map((i) => i.title ? i.title.split('::')[0] : '').filter(Boolean))).sort().map((cat: any) => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>
                          </div>
                          <div className="flex gap-2 justify-end mt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setShowAddItemDialog(false);
                                setNewItemName("");
                                setNewItemCategory("");
                                setNewItemSku("");
                              }}
                              className="px-3 py-1.5 bg-white border border-zinc-200 text-zinc-700 text-xs font-bold rounded-xl shrink-0 cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleRegisterCatalogItem(newItemName)
                              }
                              className="px-4 py-1.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl shrink-0 cursor-pointer"
                            >
                              Salvar Peça
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Grand Total Footer Dashboard panel inside Column 2 */}
                      <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-4 mt-4 flex items-center justify-between shrink-0">
                        <div>
                          <span className="text-[10px] font-black uppercase text-emerald-800 tracking-widest block font-sans">
                            Custo Total (NFs + Estoque)
                          </span>
                          <span className="text-[11px] text-zinc-500">
                            Soma calculada em tempo real
                          </span>
                        </div>
                        <div className="text-2xl font-black text-emerald-700">
                          R${" "}
                          {(
                            (Array.isArray(resolveNfs) ? resolveNfs : []).reduce(
                              (acc, nf) =>
                                acc +
                                (Array.isArray(nf.items) ? nf.items : []).reduce(
                                  (itemAcc: number, item: any) =>
                                    itemAcc +
                                    Number(item.quantity || 1) *
                                      Number(item.unit_price || 0),
                                  0,
                                ),
                              0,
                            ) +
                            (Array.isArray(resolveStockItems) ? resolveStockItems : []).reduce(
                              (acc, item) =>
                                acc +
                                Number(item.quantity || 1) *
                                  Number(item.unit_price || 0),
                              0,
                            )
                          ).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              {/* Exclusion/Delete View */}
              {modalActionType === "delete" && (
                <div className="flex flex-col items-center justify-center p-8 max-w-xl mx-auto h-full text-center space-y-6">
                  <div className="w-16 h-16 bg-red-50 border border-red-205 text-red-600 rounded-full flex items-center justify-center shadow-inner">
                    <Trash2 size={32} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-black text-zinc-900 text-center">
                      Tem certeza que deseja excluir esta pendência?
                    </h3>
                    <p className="text-sm text-zinc-500 text-center">
                      Isto removerá definitivamente{" "}
                      {selectedIdsToResolve.length === 1
                        ? "o registro selecionado"
                        : "os registros selecionados"}{" "}
                      da base de dados física. Esta operação não pode ser
                      desfeita.
                    </p>
                  </div>
                  {resolvingIssueData?.grouped_issues &&
                    resolvingIssueData.grouped_issues.length > 1 && (
                      <div className="w-full text-left bg-zinc-50 border border-zinc-200/80 rounded-2xl p-4 space-y-2">
                        <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest block font-sans text-left">
                          Ocorrências Selecionadas
                        </span>
                        <div className="max-h-36 overflow-y-auto pr-1 space-y-1">
                          {resolvingIssueData.grouped_issues
                            .filter((g: any) =>
                              selectedIdsToResolve.includes(g.id),
                            )
                            .map((gi: any) => (
                              <div
                                key={gi.id}
                                className="text-xs text-zinc-700 py-1 border-b border-zinc-150 last:border-0 font-medium text-left"
                              >
                                <strong>
                                  {new Date(gi.created_at).toLocaleDateString(
                                    "pt-BR",
                                  )}
                                </strong>{" "}
                                - {gi.description || "Sem notas de descrição"}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                </div>
              )}

              {/* SQL Missing columns trigger panel */}
              {modalActionType === "resolve" && sqlError && (
                <div className="bg-zinc-50 p-6 rounded-3xl border border-rose-200 h-full overflow-y-auto space-y-4 text-left">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={24} className="text-red-500" />
                    <h3 className="text-base font-black text-zinc-900 uppercase tracking-tight">
                      Esquema do Banco de Dados Desatualizado
                    </h3>
                  </div>
                  {sqlError ===
                  "Oops, the database needs updating exactly for status check!" ? (
                    <>
                      <p className="text-sm text-zinc-500 leading-relaxed text-left">
                        A funcionalidade de colocar manutenção "Em Aguardo"
                        requer uma atualização na restrição da coluna{" "}
                        <code>status</code> na tabela{" "}
                        <strong>checklist_issues</strong> que permita este novo
                        estado. Copie o script SQL abaixo e aplique-o no editor
                        de SQL do seu painel do Supabase:
                      </p>
                      <div className="p-4 bg-zinc-900 rounded-2xl overflow-x-auto text-xs font-mono text-zinc-200 shadow-xl border border-zinc-800 text-left">
                        <pre>
                          {`-- Atualiza a restrição de status permitidos para incluir 'waiting'
ALTER TABLE checklist_issues DROP CONSTRAINT checklist_issues_status_check;
ALTER TABLE checklist_issues ADD CONSTRAINT checklist_issues_status_check CHECK (status IN ('pending', 'resolved', 'ignored', 'waiting'));`}
                        </pre>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-zinc-500 leading-relaxed text-left">
                        Para habilitar o salvamento unificado de{" "}
                        <strong>
                          Notas Fiscais, Custos de Peças, Comentários e Anexos
                          de Imagens
                        </strong>
                        , é necessário expandir a tabela checklist_issues
                        através do seu console do Supabase. Copie o script SQL
                        abaixo e aplique-o em seu painel:
                      </p>
                      <div className="p-4 bg-zinc-900 rounded-2xl overflow-x-auto text-xs font-mono text-zinc-200 shadow-xl border border-zinc-800 text-left">
                        <pre>
                          {`ALTER TABLE public.checklist_issues 
ADD COLUMN IF NOT EXISTS resolution_nf TEXT,
ADD COLUMN IF NOT EXISTS resolution_value NUMERIC,
ADD COLUMN IF NOT EXISTS resolution_photos JSONB,
ADD COLUMN IF NOT EXISTS resolution_comments JSONB,
ADD COLUMN IF NOT EXISTS resolution_type TEXT CHECK (resolution_type IN ('corretiva', 'preventiva')),
ADD COLUMN IF NOT EXISTS item_category TEXT,
ADD COLUMN IF NOT EXISTS maintenance_start_date DATE,
ADD COLUMN IF NOT EXISTS maintenance_end_date DATE;`}
                        </pre>
                      </div>
                    </>
                  )}
                  <div className="flex gap-3 pt-2 text-left">
                    <button
                      onClick={() => setSqlError(null)}
                      className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-black shadow-lg hover:bg-primary-dark transition-all cursor-pointer"
                    >
                      Voltar e tentar novamente
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Actions Footer */}
            {!sqlError && (
              <div className="flex bg-zinc-50/50 px-6 py-4 justify-end gap-3 rounded-b-3xl border-t border-zinc-100 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setResolvingIssueId(null);
                    setResolvingIssueData(null);
                    setSelectedIdsToResolve([]);
                    setSqlError(null);
                  }}
                  disabled={isResolving}
                  className="px-5 py-2.5 text-xs font-extrabold text-zinc-500 hover:bg-zinc-100 hover:text-zinc-805 rounded-xl transition-all border border-zinc-200 cursor-pointer uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmModalAction}
                  disabled={isResolving || selectedIdsToResolve.length === 0}
                  className={`px-5 py-2.5 text-xs font-black text-white rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-md uppercase tracking-wider ${
                    modalActionType === "resolve"
                      ? resolveSubStatus === "waiting_nf"
                        ? "bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-blue-600/10"
                        : resolveSubStatus === "waiting"
                        ? "bg-amber-600 hover:bg-amber-655 active:scale-95 shadow-amber-600/10"
                        : "bg-emerald-600 hover:bg-emerald-655 active:scale-95 shadow-emerald-600/10"
                      : "bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-rose-600/10"
                  }`}
                >
                  {isResolving ? (
                    <>
                      <Clock size={14} className="animate-spin" />
                      {modalActionType === "resolve"
                        ? resolveSubStatus === "waiting_nf"
                          ? "Marcando..."
                          : resolveSubStatus === "waiting"
                          ? "Sinalizando..."
                          : "Resolvendo..."
                        : "Excluindo..."}
                    </>
                  ) : (
                    <>
                      {modalActionType === "resolve" ? (
                        resolveSubStatus === "waiting_nf" ? (
                          <>
                            <Receipt size={14} />
                            Aguardando NF
                          </>
                        ) : resolveSubStatus === "waiting" ? (
                          <>
                            <Clock size={14} />
                            Salvar Alterações
                          </>
                        ) : (
                          <>
                            <CheckCircle size={14} />
                            Gravar Solução
                          </>
                        )
                      ) : (
                        <>
                          <Trash2 size={14} />
                          Confirmar Exclusão
                        </>
                      )}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedViewIssue && (
        <IssueDetailsModal
          issue={selectedViewIssue}
          onClose={() => setSelectedViewIssue(null)}
        />
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
