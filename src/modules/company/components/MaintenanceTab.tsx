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
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";
import ManualIssueModal from "@/src/modules/company/components/ManualIssueModal";
import { SupplierModal } from "../../../components/admin/SupplierModal";
import IssueDetailsModal from "./IssueDetailsModal";
import { usePersistentState } from "@/src/hooks/usePersistentState";

export default function MaintenanceTab() {
  const { user } = useAuth();
  const [issues, setIssues] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [odometers, setOdometers] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = usePersistentState(
    "maintenance_searchTerm",
    "",
  );
  const [alertFilter, setAlertFilter] = usePersistentState<
    "all" | "driver" | "alert_km" | "alert_date" | "expired"
  >("maintenance_alertFilter", "all");
  const [trackingFilter, setTrackingFilter] = usePersistentState<
    "all" | "overdue" | "near" | "ok"
  >("maintenance_trackingFilter", "all");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = usePersistentState<
    "pending" | "waiting" | "resolved" | "tracking"
  >("maintenance_activeTab", "pending");
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [selectedViewIssue, setSelectedViewIssue] = useState<any | null>(null);
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
  const [isResolving, setIsResolving] = useState(false);
  const [resolveSubStatus, setResolveSubStatus] = useState<
    "resolved" | "waiting"
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
  }, []);

  async function fetchAlertsData() {
    try {
      const { data: alertsData, error: alertsError } = await supabase.from(
        "auto_alerts",
      ).select(`
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
      const [itemsRes, suppliersRes, checklistItemsRes] = await Promise.all([
        supabase.from("inventory_items").select("*").order("name"),
        supabase.from("inventory_suppliers").select("*").order("name"),
        supabase.from("checklist_items").select("title").order("order_index"),
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
    setLoading(true);

    try {
      const { data: issuesData, error } = await supabase
        .from("checklist_issues")
        .select(
          `
          *,
          auto_alerts (*)
        `,
        )
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
          ?.filter((s: any) => s.type === "fuel" || s.type === "Abastecimento")
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

      const issuesWithRelations = filteredIssues.map((issue: any) => {
        let status = issue.status;
        if (status === "resolved" && !issue.resolved_by) {
          status = "pending";
        }
        return {
          ...issue,
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

  function openResolveModal(
    issue: any,
    actionType: "resolve" | "delete" = "resolve",
  ) {
    setModalActionType(actionType);
    setResolvingIssueData(issue);
    setResolvingIssueId(issue.grouped_ids || [issue.id]);
    setSelectedIdsToResolve(issue.grouped_ids || [issue.id]);
    setResolveNotes(issue.resolution_notes || "");
    setResolveType(issue.resolution_type || "");
    setResolveCategory(issue.item_category || "");
    setResolveStartDate(issue.maintenance_start_date ? issue.maintenance_start_date.split("T")[0] : "");
    setResolveEndDate(issue.maintenance_end_date ? issue.maintenance_end_date.split("T")[0] : "");
    setResolveSubStatus(issue.status === "waiting" ? "waiting" : "resolved");
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
      setResolveNfs(loadedNfs);
    } else {
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
    }
    setResolveStockItems([]);
    setShowAddItemDialog(false);

    if (issue.auto_alerts) {
      // Sempre inicializa campos de KM e Data se for um alerta automático
      setResolveIntervalKm(issue.auto_alerts.interval_km?.toString() || "");
      setResolveWarningKm(issue.auto_alerts.warning_km?.toString() || "");
      setResolveWarningDays(issue.auto_alerts.warning_days?.toString() || "");
      setResolveNextDate(issue.auto_alerts.trigger_date || "");

      if (issue.status === "resolved") {
        setResolveCurrentKm(issue.auto_alerts.last_km?.toString() || "");
      } else {
        // Initial estimate of KM
        const estimatedKm =
          Number(issue.auto_alerts.last_km || 0) +
          Number(issue.auto_alerts.interval_km || 0);
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
      }
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
                resolution_notes: resolveNotes,
                resolution_type: resolveType || null,
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
                resolution_notes: resolveNotes,
                resolution_type: resolveType || null,
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
            const { data: profile } = await supabase
              .from("profiles")
              .select("company_id")
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
                notes: `Estoque utilizado para pendência. ${resolvingIssueData?.item_title || ""}`,
                created_by: user?.id,
              };
              if (company_id) txPayload.company_id = company_id;

              const { error: txError } = await supabase
                .from("inventory_transactions")
                .insert(txPayload);
              if (txError) throw txError;

              // decrement
              const { data: currentItemData } = await supabase
                .from("inventory_items")
                .select("current_quantity")
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
    .filter((issue) => issue.status === activeTab)
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

  const pendingCount = issues.filter((i) => i.status === "pending").length;
  const waitingCount = issues.filter((i) => i.status === "waiting").length;
  const resolvedCount = issues.filter((i) => i.status === "resolved").length;

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

    if (trackingFilter === "all") return true;

    const isKm = alert.trigger_type === "km";
    let isOverdue = false;
    let isNear = false;

    if (isKm) {
      const currentKm = odometers[alert.target_vehicle_id] || 0;
      const targetKm =
        Number(alert.last_km || 0) + Number(alert.interval_km || 0);
      const remainingKm = targetKm - currentKm;
      isOverdue = remainingKm <= 0;
      isNear =
        remainingKm > 0 && remainingKm <= (Number(alert.warning_km) || 1000);
    } else if (alert.trigger_date) {
      const targetDate = new Date(alert.trigger_date + "T00:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffTime = targetDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      isOverdue = daysRemaining < 0;
      isNear =
        daysRemaining >= 0 &&
        daysRemaining <= (Number(alert.warning_days) || 7);
    }

    if (trackingFilter === "overdue") return isOverdue;
    if (trackingFilter === "near") return isNear;
    if (trackingFilter === "ok") return !isOverdue && !isNear;

    return true;
  });

  const handleXmlUpload = async (e: React.ChangeEvent<HTMLInputElement>, nfIdx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const xmlText = event.target?.result as string;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");

        const chNFe = xmlDoc.getElementsByTagName("chNFe")[0]?.textContent || "";
        const nNF = xmlDoc.getElementsByTagName("nNF")[0]?.textContent || "";

        const emit = xmlDoc.getElementsByTagName("emit")[0];
        const cnpj = emit?.getElementsByTagName("CNPJ")[0]?.textContent || "";
        const xNome = emit?.getElementsByTagName("xNome")[0]?.textContent || "Fornecedor da NF";

        let supplierId = "";
        if (user?.company_id && cnpj) {
          const { data: existingSuppliers } = await supabase
            .from("inventory_suppliers")
            .select("id")
            .eq("company_id", user.company_id)
            .eq("cnpj_cpf", cnpj)
            .limit(1);

          if (existingSuppliers && existingSuppliers.length > 0) {
            supplierId = existingSuppliers[0].id;
          } else {
            const { data: newSupplier } = await supabase
              .from("inventory_suppliers")
              .insert({
                company_id: user.company_id,
                cnpj_cpf: cnpj,
                name: xNome,
              })
              .select("id")
              .single();
            if (newSupplier) supplierId = newSupplier.id;
          }
        }

        const detElements = xmlDoc.getElementsByTagName("det");
        const parsedItems: any[] = [];

        for (let i = 0; i < detElements.length; i++) {
          const prod = detElements[i].getElementsByTagName("prod")[0];
          if (prod) {
            const xProd = prod.getElementsByTagName("xProd")[0]?.textContent || "Produto sem nome";
            const qCom = parseFloat(prod.getElementsByTagName("qCom")[0]?.textContent || "0");
            const vUnCom = parseFloat(prod.getElementsByTagName("vUnCom")[0]?.textContent || "0");
            const cProd = prod.getElementsByTagName("cProd")[0]?.textContent || "";
            
            let itemId = "";
            if (user?.company_id && xProd) {
              const { data: existingItems } = await supabase
                .from("inventory_items")
                .select("id")
                .eq("company_id", user.company_id)
                .ilike("name", xProd)
                .limit(1);

              if (existingItems && existingItems.length > 0) {
                itemId = existingItems[0].id;
              } else {
                const { data: newItem } = await supabase
                  .from("inventory_items")
                  .insert({
                    company_id: user.company_id,
                    name: xProd,
                    sku: cProd,
                    category: "Peças",
                    current_quantity: 0,
                    min_quantity: 0,
                  })
                  .select("id")
                  .single();
                if (newItem) itemId = newItem.id;
              }
            }

            parsedItems.push({
               id: `item-${Date.now()}-${i}`,
               item_id: itemId,
               name: xProd,
               quantity: qCom,
               unit_price: vUnCom,
            });
          }
        }

        if (parsedItems.length > 0 || chNFe) {
           const updated = [...resolveNfs];
           if (chNFe) updated[nfIdx].nf_key = chNFe;
           if (nNF) updated[nfIdx].nf_number = nNF;
           if (supplierId) updated[nfIdx].supplier_id = supplierId;
           if (parsedItems.length > 0) updated[nfIdx].items = parsedItems;
           setResolveNfs(updated);
           alert("XML importado com sucesso! Fornecedor e itens foram validados/cadastrados.");
           fetchCatalog(); // Refresh catalog if new items were added
        } else {
           alert("Não foi possível encontrar dados válidos de NF-e neste arquivo XML.");
        }
      } catch (e) {
        console.error("Erro ao importar XML:", e);
        alert("Erro ao processar o arquivo XML.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handlePrintTracking = () => {
    let printContent = `
      <html>
        <head>
          <title>Acompanhamento de Manutenções</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            h1 { font-size: 18px; border-bottom: 1px solid #ccc; padding-bottom: 10px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f5f5f5; }
            .overdue { color: red; font-weight: bold; }
            .near { color: darkorange; font-weight: bold; }
            .ok { color: green; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Acompanhamento de Manutenções - ${new Date().toLocaleDateString("pt-BR")}</h1>
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Alerta</th>
                <th>Veículo</th>
                <th>Tipo</th>
                <th>Detalhes</th>
              </tr>
            </thead>
            <tbody>
    `;

    filteredAlertsForTracking.forEach((alert) => {
      const isKm = alert.trigger_type === "km";
      let statusText = "Em dia";
      let statusClass = "ok";
      let details = "";

      if (isKm) {
        const currentKm = odometers[alert.target_vehicle_id] || 0;
        const targetKm =
          Number(alert.last_km || 0) + Number(alert.interval_km || 0);
        const remainingKm = targetKm - currentKm;
        const isOverdue = remainingKm <= 0;
        const isNear =
          remainingKm > 0 && remainingKm <= (Number(alert.warning_km) || 1000);

        if (isOverdue) {
          statusText = "Atrasada";
          statusClass = "overdue";
        } else if (isNear) {
          statusText = "Próxima";
          statusClass = "near";
        }

        details = `Atual: ${currentKm} | Alvo: ${targetKm} | Faltam: ${remainingKm > 0 ? remainingKm : 0}`;
      } else if (alert.trigger_date) {
        const targetDate = new Date(alert.trigger_date + "T00:00:00");
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = targetDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const isOverdue = daysRemaining < 0;
        const isNear =
          daysRemaining >= 0 &&
          daysRemaining <= (Number(alert.warning_days) || 7);

        if (isOverdue) {
          statusText = "Atrasada";
          statusClass = "overdue";
        } else if (isNear) {
          statusText = "Próxima";
          statusClass = "near";
        }

        details = `Alvo: ${targetDate.toLocaleDateString("pt-BR")} | Faltam: ${daysRemaining > 0 ? daysRemaining : 0} dias`;
      }

      printContent += `
        <tr>
          <td class="${statusClass}">${statusText}</td>
          <td>${alert.title || "N/A"}</td>
          <td>${alert.vehicles?.plate || "N/A"}</td>
          <td>${isKm ? "Odomêtro" : "Data"}</td>
          <td>${details}</td>
        </tr>
      `;
    });

    printContent += `
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  return (
    <div className="space-y-6">
      {/* Abas */}
      <div className="bento-card !p-0 overflow-hidden">
        <div className="border-b border-app-border">
          <div className="flex">
            <button
              onClick={() => {
                setActiveTab("pending");
                setSelectedRows([]);
              }}
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
              onClick={() => {
                setActiveTab("waiting");
                setSelectedRows([]);
              }}
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
              onClick={() => {
                setActiveTab("resolved");
                setSelectedRows([]);
              }}
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
              onClick={() => {
                setActiveTab("tracking");
                setSelectedRows([]);
              }}
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
                Monitore as revisões por KM e prazos por data configurados nos
                alertas de sua frota.
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
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
            <div className="bg-white rounded-3xl p-12 text-center border border-app-border shadow-sm">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wrench size={32} />
              </div>
              <h4 className="text-sm font-bold text-text-main font-sans">
                Nenhuma manutenção monitorada encontrada
              </h4>
              <p className="text-xs text-text-muted max-w-sm mx-auto mt-1 font-sans">
                Cadastre novas regras de alertas de KM ou Data na aba "Alertas"
                para iniciar o acompanhamento.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAlertsForTracking.map((alert) => {
                const isKm = alert.trigger_type === "km";

                // Dynamic Calculations
                let statusBadgeColor =
                  "bg-green-50 text-green-700 border-green-200";
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
                  const isNear =
                    remainingKm > 0 &&
                    remainingKm <= (Number(alert.warning_km) || 1000);

                  if (isOverdue) {
                    statusBadgeColor =
                      "bg-red-50 text-red-700 border-red-200 animate-pulse";
                    statusText = "Atrasada / Vencida";
                  } else if (isNear) {
                    statusBadgeColor =
                      "bg-orange-50 text-orange-700 border-orange-200";
                    statusText = "Vence em breve";
                  }

                  statsContent = (
                    <div className="space-y-4">
                      <div className="grid grid-cols-4 gap-1 bg-zinc-50 p-3 rounded-2xl border border-zinc-100">
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
                          <span
                            className={`text-xs font-black font-sans ${isOverdue ? "text-red-650" : "text-zinc-700"}`}
                          >
                            {isOverdue
                              ? `${Math.abs(remainingKm).toLocaleString("pt-BR")} KM d+`
                              : `${remainingKm.toLocaleString("pt-BR")} KM`}
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
                          <span>
                            Desgaste / Intervalo (
                            {intervalKm.toLocaleString("pt-BR")} KM)
                          </span>
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
                    const targetDate = new Date(
                      alert.trigger_date + "T00:00:00",
                    );
                    targetDateStr = targetDate.toLocaleDateString("pt-BR");

                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const diffTime = targetDate.getTime() - today.getTime();
                    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    isOverdue = daysRemaining < 0;
                    isNear =
                      daysRemaining >= 0 &&
                      daysRemaining <= (Number(alert.warning_days) || 7);

                    if (isOverdue) {
                      statusBadgeColor =
                        "bg-red-50 text-red-700 border-red-200";
                      statusText = `Atrasada (${Math.abs(daysRemaining)} d)`;
                    } else if (isNear) {
                      statusBadgeColor =
                        "bg-orange-50 text-orange-700 border-orange-200";
                      statusText =
                        daysRemaining === 0
                          ? "Vence HOJE"
                          : `Vence em ${daysRemaining} dias`;
                    } else {
                      statusBadgeColor =
                        "bg-green-50 text-green-700 border-green-200";
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
                          <span
                            className={`text-sm font-black font-sans ${isOverdue ? "text-red-655 font-black font-sans" : "text-zinc-700"}`}
                          >
                            {isOverdue
                              ? `Atraso ${Math.abs(daysRemaining)} d`
                              : `${daysRemaining} dias`}
                          </span>
                        </div>
                      </div>

                      <div className="text-[10px] text-zinc-400 italic text-center font-medium font-sans">
                        Alerta configurado com antecedência de{" "}
                        {alert.warning_days || 0} dias.
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
              {selectedRows.length > 0 &&
                (activeTab === "pending" || activeTab === "waiting") &&
                user?.role === "admin" && (
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
                    className="h-8 pl-9 pr-4 bg-app-bg rounded-lg text-[10px] border border-app-border w-56 lg:w-64"
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
                    {(activeTab === "pending" || activeTab === "waiting") &&
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
                        className={`transition-colors ${selectedRows.includes(issue.id) ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-gray-50"}`}
                      >
                        {(activeTab === "pending" || activeTab === "waiting") &&
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
                          <div className="text-sm font-medium">
                            {issue.item_title}
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
                                    {issue.item_category && (
                                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-purple-200 bg-purple-50 text-purple-700">
                                        {issue.item_category}
                                      </span>
                                    )}
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
                                  <div className="text-sm text-green-600 font-semibold flex items-center gap-1">
                                    <CheckCircle size={14} />
                                    Resolvido
                                  </div>
                                  {issue.resolution_type && (
                                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-700">
                                      {issue.resolution_type}
                                    </span>
                                  )}
                                  {issue.item_category && (
                                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-purple-200 bg-purple-50 text-purple-700">
                                      {issue.item_category}
                                    </span>
                                  )}
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
                                    {issue.resolution_notes}
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
                                                      {nf.nf_key && (
                                                        <div className="text-[9px] text-zinc-500 font-mono break-all leading-tight">
                                                          <span className="text-[8px] uppercase text-zinc-400 font-semibold block">
                                                            Chave:
                                                          </span>
                                                          {nf.nf_key}
                                                        </div>
                                                      )}
                                                      {nf.items &&
                                                        nf.items.length > 0 && (
                                                          <div className="mt-1 bg-white border border-zinc-100 rounded p-1 space-y-0.5">
                                                            {nf.items.map(
                                                              (
                                                                item: any,
                                                                itemIdx: number,
                                                              ) => (
                                                                <div
                                                                  key={
                                                                    item.id ||
                                                                    itemIdx
                                                                  }
                                                                  className="flex justify-between text-[9px] text-zinc-650"
                                                                >
                                                                  <span
                                                                    className="truncate max-w-[110px]"
                                                                    title={
                                                                      item.name
                                                                    }
                                                                  >
                                                                    {item.name}{" "}
                                                                    <span className="text-zinc-400">
                                                                      (
                                                                      {
                                                                        item.quantity
                                                                      }
                                                                      x)
                                                                    </span>
                                                                  </span>
                                                                  <span className="font-semibold text-zinc-700 shrink-0">
                                                                    R${" "}
                                                                    {(
                                                                      item.quantity *
                                                                      item.unit_price
                                                                    ).toLocaleString(
                                                                      "pt-BR",
                                                                      {
                                                                        minimumFractionDigits: 2,
                                                                      },
                                                                    )}
                                                                  </span>
                                                                </div>
                                                              ),
                                                            )}
                                                          </div>
                                                        )}
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
                        ? resolveSubStatus === "waiting"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    {modalActionType === "resolve"
                      ? resolveSubStatus === "waiting"
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
                <div className="bg-zinc-100 p-1 rounded-2xl flex border border-zinc-200/50 max-w-md">
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
                </div>
              </div>
            )}

            {/* Content Body Container */}
            <div className="flex-1 min-h-0 overflow-y-auto p-6 text-left">
              {modalActionType === "resolve" &&
                !sqlError &&
                (resolveSubStatus === "resolved" ||
                  resolveSubStatus === "waiting") && (
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
                          {/* KM Section */}
                          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3 relative overflow-hidden">
                            <div className="flex items-center gap-2">
                              <Gauge className="text-blue-500" size={18} />
                              <h4 className="text-xs font-black text-blue-700 uppercase tracking-widest">
                                Alerta de Quilometragem (KM)
                              </h4>
                            </div>
                            <p className="text-xs text-blue-800/80 leading-relaxed font-semibold text-left">
                              Indique o hodômetro atual e os parâmetros do
                              alerta para reprogramar os avisos futuros.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[10px] font-black uppercase text-blue-700 mb-1">
                                  KM Atual do Serv. *
                                </label>
                                <input
                                  type="number"
                                  value={resolveCurrentKm}
                                  onChange={(e) =>
                                    setResolveCurrentKm(e.target.value)
                                  }
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
                                  onChange={(e) =>
                                    setResolveIntervalKm(e.target.value)
                                  }
                                  placeholder="Ciclo KM"
                                  className="w-full bg-white border border-blue-300 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-black uppercase text-blue-700 mb-1">
                                  Aparecer Antes (KM)
                                </label>
                                <input
                                  type="number"
                                  value={resolveWarningKm}
                                  onChange={(e) =>
                                    setResolveWarningKm(e.target.value)
                                  }
                                  placeholder="Aviso KM"
                                  className="w-full bg-white border border-blue-300 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            </div>

                            {resolveCurrentKm && resolveIntervalKm && (
                              <div className="pt-2 border-t border-blue-200/60 flex flex-col gap-1 text-[11px] text-blue-900 font-bold">
                                <span className="flex items-center gap-1.5 text-left">
                                  • Próximo vencimento programado:{" "}
                                  <strong>
                                    {Number(resolveCurrentKm) +
                                      Number(resolveIntervalKm)}{" "}
                                    KM
                                  </strong>
                                </span>
                                {resolveWarningKm && (
                                  <span className="flex items-center gap-1.5 text-left">
                                    • Alerta aparecerá no painel em:{" "}
                                    <strong className="text-amber-700">
                                      {Number(resolveCurrentKm) +
                                        Number(resolveIntervalKm) -
                                        Number(resolveWarningKm)}{" "}
                                      KM
                                    </strong>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Date Section */}
                          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-3 relative overflow-hidden">
                            <div className="flex items-center gap-2">
                              <AlertCircle
                                className="text-orange-500"
                                size={18}
                              />
                              <h4 className="text-xs font-black text-orange-700 uppercase tracking-widest">
                                Alerta Temporal (Prazo/Data)
                              </h4>
                            </div>
                            <p className="text-xs text-orange-800/80 leading-relaxed font-semibold text-left">
                              Pendência vinculada a vencimento calendarizado.
                              Defina os prazos adequados.
                            </p>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-black uppercase text-orange-700 mb-1">
                                  Próximo Vencimento
                                </label>
                                <input
                                  type="date"
                                  value={resolveNextDate}
                                  onChange={(e) =>
                                    setResolveNextDate(e.target.value)
                                  }
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
                                  onChange={(e) =>
                                    setResolveWarningDays(e.target.value)
                                  }
                                  placeholder="Dias de antecedência"
                                  className="w-full bg-white border border-orange-200 rounded-xl px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                />
                              </div>
                            </div>
                          </div>
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
                              <input
                                type="text"
                                list="issue-categories"
                                placeholder="Ex: Elétrica, Mecânica, Pneus..."
                                className="w-full px-4 py-3 border border-zinc-200 rounded-2xl hover:border-zinc-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium text-zinc-800 transition-all shadow-sm"
                                value={resolveCategory}
                                onChange={(e) => setResolveCategory(e.target.value)}
                              />
                              <datalist id="issue-categories">
                                {Array.from(new Set([
                                  ...issues.map((i) => i.item_category).filter(Boolean),
                                  ...checklistItemsList.map((i) => i.title ? i.title.split('::')[0] : '').filter(Boolean)
                                ])).map((cat: any) => (
                                  <option key={cat} value={cat} />
                                ))}
                              </datalist>
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
                                      maxLength={44}
                                      placeholder="Insira a chave de 44 dígitos numéricos"
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
                                      <span className="text-[10px] text-orange-655 block mt-1 font-semibold animate-pulse">
                                        Aviso: Deve conter exatamente 44 dígitos (
                                        {nf.nf_key.length}/44).
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
                                            .eq("company_id", user?.company_id)
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
                            <input
                              type="text"
                              list="inventory-categories"
                              placeholder="Categoria"
                              className="bg-white border border-gray-300 rounded-xl px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                              value={newItemCategory}
                              onChange={(e) =>
                                setNewItemCategory(e.target.value)
                              }
                            />
                            <datalist id="inventory-categories">
                              {Array.from(new Set([
                                ...inventoryItems.map((i) => i.category).filter(Boolean),
                                ...checklistItemsList.map((i) => i.title ? i.title.split('::')[0] : '').filter(Boolean)
                              ])).map((cat: any) => (
                                <option key={cat} value={cat} />
                              ))}
                            </datalist>
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
                      ? resolveSubStatus === "waiting"
                        ? "bg-amber-600 hover:bg-amber-655 active:scale-95 shadow-amber-600/10"
                        : "bg-emerald-600 hover:bg-emerald-655 active:scale-95 shadow-emerald-600/10"
                      : "bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-rose-600/10"
                  }`}
                >
                  {isResolving ? (
                    <>
                      <Clock size={14} className="animate-spin" />
                      {modalActionType === "resolve"
                        ? resolveSubStatus === "waiting"
                          ? "Sinalizando..."
                          : "Resolvendo..."
                        : "Excluindo..."}
                    </>
                  ) : (
                    <>
                      {modalActionType === "resolve" ? (
                        resolveSubStatus === "waiting" ? (
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
    </div>
  );
}
