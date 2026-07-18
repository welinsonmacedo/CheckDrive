// components/admin/ChecklistDetailsModal.tsx
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  ClipboardCheck,
  Eye,
  EyeOff,
  Image as ImageIcon,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ZoomIn,
  ZoomOut,
  Download,
  AlertOctagon,
  Fuel,
  Printer,
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from '@/src/modules/shared/contexts/AuthContext';
import { useState, useEffect } from "react";
import AddressFromCoordinates from "@/src/components/common/AddressFromCoordinates";
import PrintHeader from "./PrintHeader";

interface ChecklistDetailsModalProps {
  selectedSub: any | null;
  onClose: () => void;
}

export default function ChecklistDetailsModal({
  selectedSub,
  onClose,
}: ChecklistDetailsModalProps) {
  const { user } = useAuth();

  useEffect(() => {
    if (selectedSub) {
      document.body.classList.add("modal-open-for-print");
    }
    return () => {
      document.body.classList.remove("modal-open-for-print");
    };
  }, [selectedSub]);

  const [loadPhotos, setLoadPhotos] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [zoom, setZoom] = useState(1);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [defectItems, setDefectItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [manualPenalties, setManualPenalties] = useState<any[]>([]);
  const [showPenaltyForm, setShowPenaltyForm] = useState(false);
  const [selectedPenaltyId, setSelectedPenaltyId] = useState("");
  const [applyingPenalty, setApplyingPenalty] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);

  useEffect(() => {
    const fetchPenalties = async () => {
      try {
        const { data, error } = await supabase.from("manual_penalties").select("*").eq("company_id", user?.company_id)
          .order("name");
        if (!error && data) {
          setManualPenalties(data);
        }
      } catch (err) {}
    };
    fetchPenalties();
  }, []);

  useEffect(() => {
    if (selectedSub) {
      fetchIssuesFromSubmission();
    }
  }, [selectedSub]);

  // Buscar os issues relacionados a este submission - mesma lógica do MaintenanceTab
  async function fetchIssuesFromSubmission() {
    if (!selectedSub) return;

    setLoading(true);
    try {
      console.log("Buscando issues para o submission:", selectedSub.id);

      const { data: issuesData, error } = await supabase.from("checklist_issues").select("*").eq("company_id", user?.company_id)
        .eq("submission_id", selectedSub.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar issues:", error);
        setDefectItems([]);
        setLoading(false);
        return;
      }

      console.log("Issues encontradas:", issuesData);

      if (issuesData && issuesData.length > 0) {
        // Buscar informações do veículo, reboque e motorista
        const vehicleIds = [
          ...new Set(issuesData.map((i: any) => i.vehicle_id).filter(Boolean)),
        ];
        const trailerIds = [
          ...new Set(issuesData.map((i: any) => i.trailer_id).filter(Boolean)),
        ];
        const driverIds = [
          ...new Set(issuesData.map((i: any) => i.driver_id).filter(Boolean)),
        ];

        const { data: vehicles } = await supabase.from("vehicles").select("id, plate, model").eq("company_id", user?.company_id)
          .in("id", vehicleIds);

        const { data: trailers } = await supabase.from("trailers").select("id, plate, model").eq("company_id", user?.company_id)
          .in("id", trailerIds);

        const { data: drivers } = await supabase.from("profiles").select("id, full_name").eq("company_id", user?.company_id)
          .in("id", driverIds);

        const issuesWithRelations = issuesData.map((issue: any) => ({
          ...issue,
          vehicles: vehicles?.find((v) => v.id === issue.vehicle_id),
          trailers: trailers?.find((t) => t.id === issue.trailer_id),
          profiles: drivers?.find((d) => d.id === issue.driver_id),
        }));

        // Deduplicate issues by item_title, description, and photo_url
        const seen = new Set<string>();
        const uniqueIssues: any[] = [];
        issuesWithRelations.forEach((issue: any) => {
          const key = `${issue.item_title.trim()}||${(issue.description || "").trim()}||${issue.photo_url || ""}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueIssues.push(issue);
          }
        });

        setDefectItems(uniqueIssues);

        // Expandir o primeiro item automaticamente
        if (uniqueIssues.length > 0 && expandedItems.length === 0) {
          setExpandedItems([uniqueIssues[0].id]);
        }
      } else {
        // Se não encontrar issues, tenta extrair dos details (fallback)
        console.log("Nenhuma issue encontrada, tentando fallback para details");
        extractDefectsFromDetails();
      }
    } catch (error) {
      console.error("Erro:", error);
      extractDefectsFromDetails();
    } finally {
      setLoading(false);
    }
  }

  // Fallback: extrair defeitos dos details (caso não exista na tabela checklist_issues)
  function extractDefectsFromDetails() {
    const items: any[] = [];

    if (selectedSub?.details?.itemValues) {
      for (const [itemId, val] of Object.entries(
        selectedSub.details.itemValues,
      )) {
        if (val === "defect" || val === "defeito") {
          const rawDefectInfo = selectedSub.details.defects?.[itemId];

          // Handle string structure, old single object and new array of objects
          let subDefects: any[] = [];
          if (typeof rawDefectInfo === "string") {
            subDefects = [{ description: rawDefectInfo, photoUrl: null }];
          } else if (Array.isArray(rawDefectInfo)) {
            subDefects = rawDefectInfo;
          } else if (rawDefectInfo) {
            subDefects = [rawDefectInfo];
          } else {
            subDefects = [
              {
                description: "Nenhuma descrição fornecida",
                photoUrl: null,
              },
            ];
          }

          subDefects.forEach((defectInfo: any, index: number) => {
            const titleSuffix = subDefects.length > 1 ? ` (${index + 1})` : "";
            items.push({
              id: `${itemId}_${index}`,
              item_title:
                (selectedSub.details.itemTitles?.[itemId] || `Item ${itemId}`) +
                titleSuffix,
              description:
                typeof defectInfo === "string"
                  ? defectInfo
                  : defectInfo?.description || "Nenhuma descrição fornecida",
              photo_url: defectInfo?.photoUrl || defectInfo?.photo_url || null,
              vehicles: selectedSub.vehicles,
              trailers: selectedSub.trailers,
              profiles: selectedSub.profiles,
              created_at: selectedSub.created_at,
            });
          });
        }
      }
    }

    // Deduplicate items in fallback extraction count as well
    const seen = new Set<string>();
    const uniqueItems: any[] = [];
    items.forEach((item: any) => {
      const key = `${item.item_title.trim()}||${(item.description || "").trim()}||${item.photo_url || ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueItems.push(item);
      }
    });

    setDefectItems(uniqueItems);
    if (uniqueItems.length > 0 && expandedItems.length === 0) {
      setExpandedItems([uniqueItems[0].id]);
    }
  }

  const handleApplyManualPenalty = async () => {
    if (!selectedPenaltyId) return;
    const penalty = manualPenalties.find((p) => p.id === selectedPenaltyId);
    if (!penalty || !selectedSub.driver_id) return;

    setApplyingPenalty(true);
    try {
      // 1. Get current performance
      const { data: perf } = await supabase
        .from("driver_performance")
        .select("score")
        .eq("driver_id", selectedSub.driver_id)
        .maybeSingle();

      const { data: profileArgs } = await supabase.from("profiles").select("score_profiles(base_value)")
        .eq("company_id", user?.company_id)
        .eq("id", selectedSub.driver_id)
        .maybeSingle();

      const sp: any = profileArgs?.score_profiles;
      const defaultScore = Number(sp?.base_value || 1000);
      const newScore = (perf?.score || defaultScore) - penalty.points;

      // 2. Upsert performance
      const { error: perfError } = await supabase
        .from("driver_performance")
        .upsert({
          driver_id: selectedSub.driver_id,
          score: newScore,
          updated_at: new Date().toISOString(),
        });
      if (perfError) throw perfError;

      const routeStr = selectedSub.routes
        ? `${selectedSub.routes.origin} ➔ ${selectedSub.routes.destination}`
        : "Rota não definida";
      const vehicleStr = selectedSub.vehicles
        ? selectedSub.vehicles.plate
        : "Sem veículo";

      // 3. Create audit log
      const { error: auditError } = await supabase.from("audit_logs").insert({
        driver_id: selectedSub.driver_id,
        type: "manual",
        amount: penalty.points,
        reason: `Penalidade Manual (Checklist ${selectedSub.id?.split("-")[0]}): ${penalty.name}. Rota: ${routeStr}. Veículo: ${vehicleStr}.`,
      });
      if (auditError) throw auditError;

      alert("Penalidade aplicada com sucesso!");
      setShowPenaltyForm(false);
      setSelectedPenaltyId("");
    } catch (error: any) {
      alert("Erro ao aplicar penalidade: " + error.message);
    } finally {
      setApplyingPenalty(false);
    }
  };

  if (!selectedSub) return null;

  const getPhotoUrl = (path: string) => {
    if (!path) return null;
    const { data } = supabase.storage
      .from("checklist-photos")
      .getPublicUrl(path);
    return data.publicUrl;
  };

  const openImageModal = (issue: any) => {
    if (!issue?.photo_url) return;

    const publicUrl = supabase.storage
      .from("checklist-photos")
      .getPublicUrl(issue.photo_url).data.publicUrl;

    setSelectedImage(publicUrl);
    setSelectedIssue(issue);
    setZoom(1);
  };

  const downloadImage = async () => {
    if (!selectedImage || !selectedIssue) return;

    const response = await fetch(selectedImage);
    const blob = await response.blob();

    const plate = selectedIssue.vehicles?.plate || "veiculo";
    const date = new Date(selectedIssue.created_at)
      .toLocaleDateString("pt-BR")
      .replace(/\//g, "-");
    const fileName = `${plate}_${selectedIssue.item_title}_${date}.jpg`;

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
  };

  const hasDefects = defectItems.length > 0;
  const hasPhotos =
    selectedSub.photos && Object.keys(selectedSub.photos).length > 0;
  const photosCount = hasPhotos ? Object.keys(selectedSub.photos).length : 0;

  const handleLoadPhotos = async () => {
    setLoadingPhotos(true);
    setTimeout(() => {
      setLoadPhotos(true);
      setLoadingPhotos(false);
    }, 500);
  };

  const titleToId: Record<string, string> = {};
  if (selectedSub?.details?.itemTitles) {
    for (const [id, title] of Object.entries(selectedSub.details.itemTitles)) {
      titleToId[(title as string).toLowerCase().trim()] = id;
    }
  }

  const modalContent = (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:static print:p-0 print:bg-white print:backdrop-blur-none print:items-start print:overflow-visible"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl print:static print:max-h-none print:shadow-none print:w-full print:max-w-none print:rounded-none print:overflow-visible"
        >
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white sticky top-0 z-10 print:hidden">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                <ClipboardCheck size={18} className="text-primary" />
                Detalhes do Checklist
                {selectedSub.details?.is_edited && (
                  <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-600 rounded text-[9px] font-black uppercase tracking-widest">
                    Editado
                  </span>
                )}
              </h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase">
                Nº {selectedSub.id?.split("-")[0]} •{" "}
                {new Date(
                  selectedSub.details?.adjusted_date || selectedSub.created_at,
                ).toLocaleString()}
                {selectedSub.details?.is_edited &&
                  ` • Editado em ${new Date(selectedSub.details.edited_at).toLocaleString()}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.print()}
                className="h-10 px-4 bg-white border border-gray-200 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-colors shadow-sm print:hidden"
              >
                <Printer size={16} />
                Imprimir
              </button>
              {selectedSub.driver_id && (
                <div className="relative">
                  <button
                    onClick={() => {
                      if (manualPenalties.length === 0) {
                        alert(
                          'Nenhuma penalidade manual cadastrada. Vá em "Configurações > Penalidades Manuais" para cadastrar.',
                        );
                        return;
                      }
                      setShowPenaltyForm(!showPenaltyForm);
                    }}
                    className={`h-10 px-4 border rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${manualPenalties.length > 0 ? "bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100" : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"}`}
                  >
                    <AlertOctagon size={16} />
                    Aplicar Penalidade
                  </button>
                  {showPenaltyForm && manualPenalties.length > 0 && (
                    <div className="absolute right-0 top-12 w-72 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-20">
                      <h4 className="text-[10px] font-black text-gray-800 uppercase mb-3">
                        Penalidade Manual
                      </h4>
                      <div className="space-y-3">
                        <select
                          className="w-full h-10 px-3 rounded-lg border border-gray-200 text-[11px] font-bold outline-none focus:border-primary"
                          value={selectedPenaltyId}
                          onChange={(e) => setSelectedPenaltyId(e.target.value)}
                        >
                          <option value="">Selecione...</option>
                          {manualPenalties.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (-{p.points} pts)
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleApplyManualPenalty}
                          disabled={!selectedPenaltyId || applyingPenalty}
                          className="w-full h-10 bg-orange-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                        >
                          {applyingPenalty ? "Aplicando..." : "Confirmar"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={onClose}
                className="h-10 w-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm hover:bg-gray-50 hover:shadow-md transition-all"
              >
                <X size={18} className="text-gray-400" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-10 print:overflow-visible print:p-0 print:block">
            <PrintHeader />
            {/* Header Impressão */}
            <div className="hidden print:block mb-8 border-b-2 border-zinc-200 pb-6 mt-4">
              <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2 mb-2">
                <ClipboardCheck className="text-primary" size={28} />
                Detalhes do Checklist {selectedSub.id?.split("-")[0]}
              </h1>
              <p className="text-sm font-bold text-zinc-500 tracking-widest uppercase">
                {new Date(
                  selectedSub.details?.adjusted_date || selectedSub.created_at,
                ).toLocaleString()}
              </p>
            </div>
            {/* Informações básicas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Motorista
                </span>
                <p className="text-sm font-black text-gray-800">
                  {selectedSub.profiles?.full_name || "N/A"}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Veículo / Placa
                </span>
                <p className="text-sm font-black text-gray-800">
                  {selectedSub.vehicles?.plate || "N/A"}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Status / KM
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                      selectedSub.status === "concluded" ||
                      selectedSub.status === "com_defeitos" ||
                      selectedSub.status === "concluido"
                        ? "bg-green-50 text-green-600 border border-green-100"
                        : "bg-red-50 text-red-600 border border-red-100"
                    }`}
                  >
                    {selectedSub.status}
                  </span>
                  <span className="text-sm font-mono font-bold text-gray-700">
                    {selectedSub.odometer !== null &&
                    selectedSub.odometer !== undefined
                      ? `${selectedSub.odometer} KM`
                      : "N/A"}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Localização
                </span>
                {selectedSub.latitude && selectedSub.longitude ? (
                  <button
                    onClick={() => setShowMapModal(true)}
                    className="flex items-center gap-1.5 text-sm font-black text-primary hover:text-primary-hover hover:underline print:pointer-events-none print:text-gray-800 print:no-underline"
                  >
                    Ver no Mapa
                  </button>
                ) : (
                  <p className="text-sm font-bold text-gray-400">
                    Não registrada
                  </p>
                )}
              </div>
            </div>

            {/* Defeitos Encontrados ou Abastecimento */}
            {selectedSub.type === "fuel" ||
            selectedSub.type === "Abastecimento" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Fuel size={14} className="text-primary" />
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Litragem Registrada
                    </h4>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  {selectedSub.details?.itemValues &&
                  Object.keys(selectedSub.details.itemValues).length > 0 ? (
                    Object.keys(selectedSub.details.itemValues).map(
                      (itemId) => {
                        const title =
                          selectedSub.details.itemTitles?.[itemId] || "Item";
                        const value = selectedSub.details.itemValues[itemId];
                        if (!value) return null;
                        const displayValue = value === "defect" ? "N/A" : value;
                        let oldDisplayValue = null;

                        if (
                          selectedSub?.details?.is_edited &&
                          selectedSub.details.edit_history &&
                          selectedSub.details.edit_history.length > 0
                        ) {
                          const oldVal =
                            selectedSub.details.edit_history[0]
                              .previous_items?.[itemId];
                          if (oldVal && oldVal !== value) {
                            oldDisplayValue =
                              oldVal === "defect" ? "N/A" : oldVal;
                          }
                        }

                        return (
                          <div
                            key={itemId}
                            className="flex flex-col bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 min-w-[120px]"
                          >
                            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                              {title}
                            </span>
                            {oldDisplayValue ? (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm font-bold text-gray-400 line-through">
                                  {oldDisplayValue}
                                </span>
                                <span className="text-xs text-gray-400">➔</span>
                                <span className="text-lg font-bold text-primary">
                                  {displayValue}
                                </span>
                              </div>
                            ) : (
                              <span className="text-lg font-bold text-primary mt-1">
                                {displayValue}
                              </span>
                            )}
                          </div>
                        );
                      },
                    )
                  ) : (
                    <>
                      {selectedSub.details?.manual_liters !== undefined && (
                        <div className="flex flex-col bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 min-w-[120px]">
                          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                            Litragem
                          </span>
                          <span className="text-lg font-bold text-primary mt-1">
                            {selectedSub.details.manual_liters} L
                          </span>
                        </div>
                      )}
                      {(selectedSub.latitude && selectedSub.longitude) ||
                      selectedSub.details?.location ? (
                        <div className="flex flex-col bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 min-w-[120px] max-w-[300px]">
                          <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                            Posto/Local
                          </span>
                          <span className="text-lg font-bold text-primary mt-1 truncate">
                            <AddressFromCoordinates
                              latitude={selectedSub.latitude}
                              longitude={selectedSub.longitude}
                              fallback={selectedSub.details?.location}
                            />
                          </span>
                        </div>
                      ) : null}
                      {!selectedSub.details?.manual_liters &&
                        !selectedSub.details?.location &&
                        !selectedSub.latitude && (
                          <span className="text-[10px] text-text-muted italic p-4">
                            Sem detalhes adicionais
                          </span>
                        )}
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={14} className="text-red-500" />
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Defeitos Encontrados
                    </h4>
                    <span className="text-[9px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                      {defectItems.length}{" "}
                      {defectItems.length === 1 ? "defeito" : "defeitos"}
                    </span>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
                      <span className="text-xs text-gray-500">
                        Carregando defeitos...
                      </span>
                    </div>
                  </div>
                ) : !hasDefects ? (
                  <div className="text-center py-8 bg-green-50 rounded-xl border border-green-100">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <ClipboardCheck size={24} className="text-green-600" />
                      </div>
                      <p className="text-sm font-medium text-green-700">
                        Nenhum defeito encontrado!
                      </p>
                      <p className="text-xs text-green-600">
                        Todos os itens do checklist estão normais.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {defectItems.map((item) => {
                      const isExpanded = expandedItems.includes(item.id);
                      const imageUrl = item.photo_url
                        ? getPhotoUrl(item.photo_url)
                        : null;

                      let originalDescription = null;
                      const baseTitle = item.item_title
                        .replace(/\s\(\d+\)$/, "")
                        .toLowerCase()
                        .trim();
                      const itemId = titleToId[baseTitle];

                      if (
                        itemId &&
                        selectedSub?.details?.is_edited &&
                        selectedSub.details.edit_history &&
                        selectedSub.details.edit_history.length > 0
                      ) {
                        const history = selectedSub.details.edit_history;
                        const firstEdit = history[0];
                        if (
                          firstEdit?.previous_defects &&
                          firstEdit.previous_defects[itemId]
                        ) {
                          let defIndex = 0;
                          const match = item.item_title.match(/\((\d+)\)$/);
                          if (match) {
                            defIndex = parseInt(match[1]) - 1;
                          }
                          const prevDefectsRaw =
                            firstEdit.previous_defects[itemId];
                          let prevDefectsArray: any[] = [];
                          if (typeof prevDefectsRaw === "string") {
                            prevDefectsArray = [
                              { description: prevDefectsRaw },
                            ];
                          } else if (Array.isArray(prevDefectsRaw)) {
                            prevDefectsArray = prevDefectsRaw;
                          } else if (prevDefectsRaw) {
                            prevDefectsArray = [prevDefectsRaw];
                          }

                          if (prevDefectsArray && prevDefectsArray[defIndex]) {
                            const defObj = prevDefectsArray[defIndex];
                            originalDescription =
                              typeof defObj === "string"
                                ? defObj
                                : defObj?.description || null;
                          }
                        }
                      }

                      return (
                        <div
                          key={item.id}
                          className="flex flex-col p-4 rounded-xl bg-red-50/30 border border-red-200 print:break-inside-avoid"
                        >
                          <div
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() => {
                              setExpandedItems((prev) =>
                                prev.includes(item.id)
                                  ? prev.filter((i) => i !== item.id)
                                  : [...prev, item.id],
                              );
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-800">
                                {item.item_title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-red-100 text-red-700">
                                DEFEITO
                              </span>
                              {isExpanded ? (
                                <ChevronUp size={16} className="print:hidden" />
                              ) : (
                                <ChevronDown
                                  size={16}
                                  className="print:hidden"
                                />
                              )}
                            </div>
                          </div>

                          <div
                            className={`mt-4 pt-4 border-t border-red-200 ${isExpanded ? "block" : "hidden print:block"}`}
                          >
                            <div className="space-y-4 mb-4">
                              {originalDescription !== null && (
                                <div className="space-y-2 opacity-60">
                                  <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                                    Descrição Anterior:
                                  </span>
                                  <div className="p-3 rounded-lg bg-gray-100 border border-gray-200">
                                    <p className="text-xs font-medium text-gray-500 line-through">
                                      {originalDescription ||
                                        "Nenhuma descrição fornecida"}
                                    </p>
                                  </div>
                                </div>
                              )}
                              <div className="space-y-2">
                                <span className="text-[10px] font-bold text-red-600 uppercase">
                                  {originalDescription !== null
                                    ? "Nova Descrição Reportada:"
                                    : "Descrição Reportada:"}
                                </span>
                                <div
                                  className={`p-3 rounded-lg ${item.description ? "bg-white border border-red-100 shadow-sm" : "bg-gray-50 border border-gray-100"}`}
                                >
                                  <p
                                    className={`text-xs font-medium ${item.description ? "text-gray-800" : "text-gray-400 italic"}`}
                                  >
                                    {item.description ||
                                      "Nenhuma descrição fornecida"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Foto do defeito */}
                            {imageUrl && (
                              <div className="space-y-2">
                                <span className="text-[10px] font-bold text-red-600 uppercase">
                                  Foto do Defeito:
                                </span>
                                <div className="flex gap-2">
                                  <img
                                    src={imageUrl}
                                    className="w-32 h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 hover:shadow-md transition-all border border-red-200"
                                    onClick={() => openImageModal(item)}
                                    alt="Defeito"
                                    onError={(e) => {
                                      console.error(
                                        "Erro ao carregar imagem:",
                                        e,
                                      );
                                      e.currentTarget.src =
                                        "https://placehold.co/400x300/e2e8f0/94a3b8?text=Erro";
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Histórico de Edições */}
            {selectedSub.details?.edit_history &&
              selectedSub.details.edit_history.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Histórico de Edições Manuais
                    </h4>
                    <span className="text-[9px] font-bold bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                      {selectedSub.details.edit_history.length} edições
                    </span>
                  </div>

                  <div className="space-y-3">
                    {selectedSub.details.edit_history.map(
                      (history: any, idx: number) => {
                        const changedItems = Object.keys(
                          history.new_items || {},
                        ).filter(
                          (k) =>
                            history.new_items[k] !==
                            history.previous_items?.[k],
                        );
                        const kmChanged =
                          history.new_odometer !== history.previous_odometer;

                        return (
                          <div
                            key={idx}
                            className="bg-orange-50/50 border border-orange-100 rounded-xl p-4 space-y-3"
                          >
                            <div className="flex justify-between items-center pb-2 border-b border-orange-100/50">
                              <span className="text-xs font-black text-orange-800">
                                Edição {idx + 1}
                              </span>
                              <span className="text-[9px] font-bold text-orange-600/70">
                                {new Date(history.edited_at).toLocaleString()}
                              </span>
                            </div>

                            {kmChanged && (
                              <div className="flex items-center gap-4 text-xs font-medium text-gray-600">
                                <span className="w-20 font-bold text-[10px] text-gray-400 uppercase tracking-widest">
                                  KM:
                                </span>
                                <span className="line-through opacity-70">
                                  {history.previous_odometer || "N/A"}
                                </span>
                                <span>→</span>
                                <span className="font-bold text-orange-600">
                                  {history.new_odometer}
                                </span>
                              </div>
                            )}

                            {changedItems.length > 0 && (
                              <div className="space-y-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                  Itens Alterados:
                                </span>
                                {changedItems.map((itemId) => {
                                  const title =
                                    selectedSub.details.itemTitles?.[itemId] ||
                                    `Item ${itemId}`;
                                  const oldVal =
                                    history.previous_items?.[itemId] || "N/A";
                                  const newVal =
                                    history.new_items?.[itemId] || "N/A";
                                  return (
                                    <div
                                      key={itemId}
                                      className="flex gap-4 items-center text-xs text-gray-600 bg-white p-2 rounded-lg border border-orange-100/50"
                                    >
                                      <span className="flex-1 font-bold text-gray-800">
                                        {title}
                                      </span>
                                      <div className="flex items-center gap-2">
                                        <span className="line-through opacity-70 uppercase text-[9px] font-bold">
                                          {oldVal}
                                        </span>
                                        <span>→</span>
                                        <span className="font-bold text-orange-600 uppercase text-[9px]">
                                          {newVal}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {!kmChanged && changedItems.length === 0 && (
                              <span className="text-xs text-gray-400 italic">
                                Nenhuma mudança identificável registrada.
                              </span>
                            )}
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              )}

            {/* Botão para carregar fotos do veículo */}
            {hasPhotos && !loadPhotos && (
              <div className="flex justify-center print:hidden">
                <button
                  onClick={handleLoadPhotos}
                  disabled={loadingPhotos}
                  className="flex items-center gap-2 text-xs font-bold bg-primary text-white px-4 py-2 rounded-xl shadow-sm hover:bg-primary/80 transition-colors disabled:opacity-50"
                >
                  {loadingPhotos ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Carregando fotos...
                    </>
                  ) : (
                    <>
                      <Eye size={14} />
                      Carregar Fotos do Veículo ({photosCount} fotos)
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Fotos de Inspeção do Veículo */}
            {hasPhotos && loadPhotos && (
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Fotos do Veículo
                    </h4>
                    <span className="text-[9px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {photosCount} {photosCount === 1 ? "foto" : "fotos"}
                    </span>
                  </div>
                  <button
                    onClick={() => setLoadPhotos(false)}
                    className="flex items-center gap-1.5 text-[10px] font-bold bg-gray-100 text-gray-600 px-3 py-1.5 rounded-xl hover:bg-gray-200 transition-colors print:hidden"
                  >
                    <EyeOff size={12} />
                    Ocultar Imagens
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(selectedSub.photos).map(([pos, url]: any) => {
                    const photoUrl = getPhotoUrl(url);
                    const fakeIssue = {
                      photo_url: url,
                      item_title: `Foto ${pos}`,
                      vehicles: selectedSub.vehicles,
                      created_at: selectedSub.created_at,
                      description: null,
                    };
                    return (
                      <div key={pos} className="space-y-2">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center block">
                          {selectedSub.type === "fuel" ||
                          selectedSub.type === "Abastecimento"
                            ? pos === "front"
                              ? "Tacógrafo"
                              : pos === "receipt"
                                ? "Cupom Fiscal"
                                : pos
                            : pos === "front"
                              ? "Dianteira"
                              : pos === "back"
                                ? "Traseira"
                                : pos === "left"
                                  ? "Lateral Esquerda"
                                  : pos === "right"
                                    ? "Lateral Direita"
                                    : pos}
                        </span>
                        <div
                          className="aspect-[4/3] rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => openImageModal(fakeIssue)}
                        >
                          <img
                            src={photoUrl}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                            alt={`Foto ${pos}`}
                            onError={(e) => {
                              console.error(`Erro ao carregar foto ${pos}:`, e);
                              e.currentTarget.src =
                                "https://placehold.co/400x300/e2e8f0/94a3b8?text=Erro";
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Modal de Imagem Ampliada - Igual ao MaintenanceTab */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center"
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

            {selectedIssue && (
              <div className="absolute bottom-4 left-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 text-white">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-bold">
                      {selectedIssue.vehicles?.plate ||
                        selectedSub.vehicles?.plate}
                    </span>
                    <span className="mx-2">•</span>
                    <span>{selectedIssue.item_title}</span>
                  </div>
                  <div className="text-xs">
                    {new Date(
                      selectedIssue.created_at || selectedSub.created_at,
                    ).toLocaleString()}
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

      {/* Map Modal */}
      {showMapModal && selectedSub?.latitude && selectedSub?.longitude && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 pb-20 sm:pb-6">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowMapModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[70vh]"
          >
            <div className="p-4 border-b border-app-border flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg text-text-main">
                  Localização no Mapa
                </h3>
                <p className="text-xs text-text-muted">
                  Latitude: {selectedSub.latitude}, Longitude:{" "}
                  {selectedSub.longitude}
                </p>
              </div>
              <button
                onClick={() => setShowMapModal(false)}
                className="p-2 hover:bg-zinc-100 rounded-xl transition-colors text-text-muted hover:text-text-main"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 w-full h-full bg-zinc-100">
              <iframe
                src={`https://maps.google.com/maps?q=${selectedSub.latitude},${selectedSub.longitude}&z=15&output=embed`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={true}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Google Maps"
              ></iframe>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
