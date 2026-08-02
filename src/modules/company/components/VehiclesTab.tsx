import React, { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabase";
import { CheckCircle2, Search, X, Eye, Plus, ChevronLeft, ChevronRight, Edit2, FileSpreadsheet, FileText } from "lucide-react";
import VehicleDetailsModal from "@/src/modules/company/components/VehicleDetailsModal";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";
import { exportVehiclesToExcel, exportVehiclesToPDF } from "@/src/utils/exportVehicleCatalog";
import { logSystemAudit } from "@/src/lib/systemAuditService";

interface VehiclesTabProps {
  branchId?: string;
}

export default function VehiclesTab({ branchId }: VehiclesTabProps = {}) {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [trailers, setTrailers] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [modalities, setModalities] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [formType, setFormType] = useState<"vehicle" | "trailer">("vehicle");
  const [currentVehicleIndex, setCurrentVehicleIndex] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isTrailerFormOpen, setIsTrailerFormOpen] = useState(false);

  const [assetTypeFilter, setAssetTypeFilter] = useState<string>("all");

  const [itemForm, setItemForm] = useState<any>({
    id: "", plate: "", model: "", type: "", requires_trailer: false, modality_id: "", branch_id: "",
    asset_type: "VEHICLE", control_unit: "KM", hour_meter_initial: 0, hour_meter_current: 0,
    renavam: "", chassi: "", manufacture_year: "", model_year: "", crv_number: "", fuel_type: "", color: "", antt: "", insurance_id: "",
    photo_front_url: "", photo_right_url: "", photo_left_url: "", photo_rear_url: "",
    doc_crlv_url: "", doc_antt_url: "", doc_insurance_url: "",
  });

  const [insurances, setInsurances] = useState<any[]>([]);
  const [dbError, setDbError] = useState(false);
  
  const [photoFrontFile, setPhotoFrontFile] = useState<File | null>(null);
  const [photoRightFile, setPhotoRightFile] = useState<File | null>(null);
  const [photoLeftFile, setPhotoLeftFile] = useState<File | null>(null);
  const [photoRearFile, setPhotoRearFile] = useState<File | null>(null);
  const [docCrlvFile, setDocCrlvFile] = useState<File | null>(null);
  const [docAnttFile, setDocAnttFile] = useState<File | null>(null);
  const [docInsuranceFile, setDocInsuranceFile] = useState<File | null>(null);

  const [trailerForm, setTrailerForm] = useState({ id: "", plate: "" });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vRes, tRes, typesRes, modelsRes, modRes, insurancesRes, branchesRes] = await Promise.all([
        supabase.from("vehicles").select("*, vehicle_modalities(name)").eq("company_id", user?.company_id).order("plate"),
        supabase.from("trailers").select("*").eq("company_id", user?.company_id).order("plate"),
        supabase.from("vehicle_types").select("*").eq("company_id", user?.company_id).order("name"),
        supabase.from("vehicle_models").select("*").eq("company_id", user?.company_id).order("name"),
        supabase.from("vehicle_modalities").select("*").eq("company_id", user?.company_id).order("name"),
        supabase.from("insurances").select("*").eq("company_id", user?.company_id).order("name"),
        supabase.from("branches").select("*").eq("company_id", user?.company_id).order("name"),
      ]);
      setVehicles(vRes.data || []);
      setTrailers(tRes.data || []);
      setTypes(typesRes.data || []);
      setModels(modelsRes.data || []);
      setModalities(modRes.data || []);
      setBranches(branchesRes.data || []);
      if (insurancesRes.error && insurancesRes.error.code !== '42P01') { console.error(insurancesRes.error); } else if (insurancesRes.data) { setInsurances(insurancesRes.data); }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const checkVehicleLimit = async (): Promise<boolean> => {
    if (!user?.company_id) return true;
    try {
      const { data: company, error: companyErr } = await supabase.from('companies').select('max_vehicles').eq('id', user.company_id).single();
      if (companyErr || !company) return true;
      const { count, error: countErr } = await supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq("company_id", user?.company_id).eq('active', true);
      if (countErr) return true;
      const limit = company.max_vehicles || 10;
      if ((count || 0) >= limit) {
        alert(`Limite de veículos do seu plano atingido (${limit} veículos). Entre em contato para fazer um upgrade.`);
        return false;
      }
      return true;
    } catch (e) {
      return true;
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let isAllowed = true;
      if (!itemForm.id) {
         isAllowed = await checkVehicleLimit();
      }
      if (!isAllowed) {
        setSaving(false);
        return;
      }

      const uploadFile = async (file: File | null, existingUrl: string) => {
        if (!file) return existingUrl;
        const ext = file.name.split('.').pop();
        const fileName = `${user?.company_id}_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        const { data, error } = await supabase.storage.from("vehicles-docs").upload(fileName, file);
        if (error) {
          if (error.message.includes("Bucket not found")) setDbError(true);
          return existingUrl;
        }
        return data.path;
      };

      const payload = {
        plate: itemForm.plate, model: itemForm.model, type: itemForm.type, requires_trailer: itemForm.requires_trailer,
        modality_id: itemForm.modality_id || null, branch_id: itemForm.branch_id || null, renavam: itemForm.renavam || null, chassi: itemForm.chassi || null, manufacture_year: itemForm.manufacture_year || null,
        model_year: itemForm.model_year || null, crv_number: itemForm.crv_number || null, fuel_type: itemForm.fuel_type || null,
        color: itemForm.color || null, antt: itemForm.antt || null, insurance_id: itemForm.insurance_id || null,
        asset_type: itemForm.asset_type || "VEHICLE",
        control_unit: itemForm.control_unit || "KM",
        hour_meter_initial: Number(itemForm.hour_meter_initial || 0),
        hour_meter_current: Number(itemForm.hour_meter_current || itemForm.hour_meter_initial || 0),
        hour_meter: Number(itemForm.hour_meter_current || itemForm.hour_meter_initial || 0),
        company_id: user?.company_id,
        photo_front_url: await uploadFile(photoFrontFile, itemForm.photo_front_url),
        photo_right_url: await uploadFile(photoRightFile, itemForm.photo_right_url),
        photo_left_url: await uploadFile(photoLeftFile, itemForm.photo_left_url),
        photo_rear_url: await uploadFile(photoRearFile, itemForm.photo_rear_url),
        doc_crlv_url: await uploadFile(docCrlvFile, itemForm.doc_crlv_url),
        doc_antt_url: await uploadFile(docAnttFile, itemForm.doc_antt_url),
        doc_insurance_url: await uploadFile(docInsuranceFile, itemForm.doc_insurance_url),
      };

      if (itemForm.id) {
        const { error } = await supabase.from(formType === "trailer" ? "trailers" : "vehicles").update(payload).eq("id", itemForm.id);
        if (error) throw error;
        logSystemAudit({
          company_id: user?.company_id,
          module: "Ativos",
          entity: formType === "trailer" ? "trailers" : "vehicles",
          entity_id: itemForm.id,
          action: "EDITAR",
          new_value: payload,
          reason: `Ativo/Veículo [${payload.plate}] editado.`,
        });
      } else {
        const { data: inserted, error } = await supabase.from(formType === "trailer" ? "trailers" : "vehicles").insert([payload]).select("id").maybeSingle();
        if (error) throw error;
        logSystemAudit({
          company_id: user?.company_id,
          module: "Ativos",
          entity: formType === "trailer" ? "trailers" : "vehicles",
          entity_id: inserted?.id,
          action: "CRIAR",
          new_value: payload,
          reason: `Novo Ativo/Veículo [${payload.plate}] cadastrado.`,
        });
      }

      setItemForm({ id: "", plate: "", model: "", type: "", requires_trailer: false, modality_id: "", renavam: "", chassi: "", manufacture_year: "", model_year: "", crv_number: "", fuel_type: "", color: "", antt: "", insurance_id: "", photo_front_url: "", photo_right_url: "", photo_left_url: "", photo_rear_url: "", doc_crlv_url: "", doc_antt_url: "", doc_insurance_url: "" });
      setPhotoFrontFile(null); setPhotoRightFile(null); setPhotoLeftFile(null); setPhotoRearFile(null);
      setDocCrlvFile(null); setDocAnttFile(null); setDocInsuranceFile(null);
      setIsFormOpen(false);
      fetchData();
    } catch (error: any) {
      if (error.code === '42703') {
        alert(`Campos de ${formType === "trailer" ? "reboques" : "veículos"} desatualizados no banco. Por favor adicione as colunas necessárias à tabela ${formType === "trailer" ? "trailers" : "vehicles"}.`);
        setDbError(true);
      } else {
        alert("Erro: " + error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (table: string, id: string, currentStatus: boolean) => {
    if (!window.confirm(`Deseja ${currentStatus ? "desabilitar" : "habilitar"} este registro?`)) return;
    try {
      if (table === "vehicles" && !currentStatus) {
        const isAllowed = await checkVehicleLimit();
        if (!isAllowed) return;
      }
      const { error } = await supabase.from(table).update({ active: !currentStatus }).eq("id", id);
      if (error) throw error;
      logSystemAudit({
        company_id: user?.company_id,
        module: "Ativos",
        entity: table,
        entity_id: id,
        action: currentStatus ? "EXCLUIR" : "RESTAURAR",
        old_value: { active: currentStatus },
        new_value: { active: !currentStatus },
        reason: `Ativo ID [${id}] na tabela [${table}] foi ${currentStatus ? "desabilitado (excluído)" : "reativado (restaurado)"}.`,
      });
      fetchData();
    } catch (error: any) {
      alert("Erro ao alterar status: " + error.message);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-text-muted font-bold text-xs">Carregando veículos...</div>;
  }

  
  const combinedItems = [
    ...vehicles.map(v => ({ ...v, itemType: 'vehicle' })),
    ...trailers.map(t => ({ ...t, itemType: 'trailer' }))
  ];

  const filteredItems = combinedItems.filter((item) => {
    if (branchId && item.branch_id !== branchId) return false;
    const matchesSearch = 
      item.plate?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.chassi?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.itemType === 'vehicle' && item.model?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) return false;
    if (assetTypeFilter !== "all") {
      const type = item.asset_type || "VEHICLE";
      if (type !== assetTypeFilter) return false;
    }
    return true;
  });

  const currentItem = filteredItems[currentVehicleIndex] || null;

  return (
    <>
      <div className={`flex flex-col gap-6 ${selectedVehicle ? 'print:hidden' : ''}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"/>
              <input type="text" placeholder="Filtrar placa, modelo ou chassi..." className="h-10 pl-9 pr-4 bg-app-bg rounded-xl text-[11px] font-bold text-text-main outline-none focus:ring-1 focus:ring-primary w-full sm:w-56 border border-app-border" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentVehicleIndex(0); }}/>
            </div>
            <select
              value={assetTypeFilter}
              onChange={(e) => { setAssetTypeFilter(e.target.value); setCurrentVehicleIndex(0); }}
              className="h-10 px-3 bg-app-bg rounded-xl text-[11px] font-bold text-text-main border border-app-border focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="all">Todos os Ativos</option>
              <option value="VEHICLE">🚚 Veículos</option>
              <option value="MACHINE">🚜 Máquinas</option>
              <option value="EQUIPMENT">⚙️ Equipamentos</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => exportVehiclesToExcel(filteredItems)}
              className="px-3.5 py-2 bg-emerald-50 border border-emerald-200/80 text-emerald-700 hover:bg-emerald-100 text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm"
              title="Exportar catálogo em Excel (.xlsx)"
            >
              <FileSpreadsheet size={14} /> Excel
            </button>
            <button
              type="button"
              onClick={() => exportVehiclesToPDF(filteredItems)}
              className="px-3.5 py-2 bg-rose-50 border border-rose-200/80 text-rose-700 hover:bg-rose-100 text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm"
              title="Exportar catálogo em PDF"
            >
              <FileText size={14} /> PDF
            </button>
            <button onClick={() => { setFormType("vehicle"); setItemForm({ id: "", plate: "", model: "", type: "", requires_trailer: false, modality_id: "", asset_type: "VEHICLE", control_unit: "KM", hour_meter_initial: 0, hour_meter_current: 0, renavam: "", chassi: "", manufacture_year: "", model_year: "", crv_number: "", fuel_type: "", color: "", antt: "", insurance_id: "", photo_front_url: "", photo_right_url: "", photo_left_url: "", photo_rear_url: "", doc_crlv_url: "", doc_antt_url: "", doc_insurance_url: "" }); setIsFormOpen(true); }} className="flex-1 sm:flex-none px-4 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 hover:bg-opacity-90 transition-all shadow-sm">
              <Plus size={14}/> Novo Ativo / Veículo
            </button>
            <button onClick={() => { setFormType("trailer"); setItemForm({ id: "", plate: "", model: "", type: "", requires_trailer: false, modality_id: "", asset_type: "VEHICLE", control_unit: "KM", hour_meter_initial: 0, hour_meter_current: 0, renavam: "", chassi: "", manufacture_year: "", model_year: "", crv_number: "", fuel_type: "", color: "", antt: "", insurance_id: "", photo_front_url: "", photo_right_url: "", photo_left_url: "", photo_rear_url: "", doc_crlv_url: "", doc_antt_url: "", doc_insurance_url: "" }); setIsFormOpen(true); }} className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-all shadow-sm">
              <Plus size={14}/> Reboque
            </button>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-text-muted font-bold text-xs bg-app-bg rounded-2xl border border-app-border">
            Nenhum veículo ou reboque encontrado para este filtro.
          </div>
        ) : (
          <div className="relative bento-card p-6 flex flex-col gap-6 group">
            {filteredItems.length > 1 && (
              <>
                <button onClick={() => setCurrentVehicleIndex(prev => (prev === 0 ? filteredItems.length - 1 : prev - 1))} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-app-border rounded-full flex items-center justify-center shadow-sm text-text-muted hover:text-primary z-10 hover:scale-105 transition-all">
                  <ChevronLeft size={20}/>
                </button>
                <button onClick={() => setCurrentVehicleIndex(prev => (prev === filteredItems.length - 1 ? 0 : prev + 1))} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white border border-app-border rounded-full flex items-center justify-center shadow-sm text-text-muted hover:text-primary z-10 hover:scale-105 transition-all">
                  <ChevronRight size={20}/>
                </button>
              </>
            )}

            <div className="flex flex-col md:flex-row gap-8 px-4 md:px-10">
              <div className="w-full md:w-1/3 space-y-4">
                <div className="aspect-square bg-slate-100 rounded-2xl border border-app-border overflow-hidden flex items-center justify-center">
                  {currentItem.photo_front_url ? (
                    <img src={((currentItem.photo_front_url)?.startsWith('http') ? (currentItem.photo_front_url) : supabase.storage.from('vehicles-docs').getPublicUrl(currentItem.photo_front_url).data.publicUrl)} alt="Frontal" className="w-full h-full object-cover"/>
                  ) : (
                    <div className="text-center p-6 text-slate-400">
                      <div className="w-16 h-16 bg-slate-200 rounded-full mx-auto mb-3 flex items-center justify-center">
                        <CheckCircle2 size={24} className="opacity-50"/>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider block">
                        {currentItem.itemType === 'vehicle' ? "Sem foto principal" : "Reboque (Sem Foto)"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {['photo_right_url', 'photo_left_url', 'photo_rear_url'].map((k, i) => (
                      <div key={i} className="aspect-square bg-slate-50 border border-app-border rounded-xl flex items-center justify-center overflow-hidden">
                        {currentItem[k] ? (
                          <img src={((currentItem[k])?.startsWith('http') ? (currentItem[k]) : supabase.storage.from('vehicles-docs').getPublicUrl(currentItem[k]).data.publicUrl)} className="w-full h-full object-cover"/>
                        ) : (
                          <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest text-center px-1">Sem<br/>Foto</span>
                        )}
                      </div>
                    ))}
                  </div>
              </div>

              <div className="w-full md:w-2/3 flex flex-col justify-between">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-4xl font-black text-text-main font-mono tracking-tight mb-2">{currentItem.plate}</h2>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-200">
                        {currentItem.asset_type === 'MACHINE' ? '🚜 Máquina' : currentItem.asset_type === 'EQUIPMENT' ? '⚙️ Equipamento' : '🚚 Veículo'}
                      </span>
                      {currentItem.itemType === 'trailer' && (
                        <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200">
                          Reboque
                        </span>
                      )}
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${currentItem.active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {currentItem.active !== false ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-app-border">
                      <div>
                        <span className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Modelo</span>
                        <span className="text-sm font-black text-text-main uppercase">{currentItem.model || "N/I"}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Unidade Controle</span>
                        <span className="text-sm font-black text-indigo-700 uppercase">{currentItem.control_unit === 'HOURS' ? 'Horímetro (Horas)' : currentItem.control_unit === 'BOTH' ? 'KM & Horímetro' : 'Quilometragem (KM)'}</span>
                      </div>
                      {(currentItem.control_unit === 'HOURS' || currentItem.control_unit === 'BOTH' || Number(currentItem.hour_meter_current || currentItem.hour_meter || 0) > 0) && (
                        <div>
                          <span className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Horímetro Atual</span>
                          <span className="text-sm font-black text-indigo-900 font-mono">{Number(currentItem.hour_meter_current || currentItem.hour_meter || 0).toLocaleString("pt-BR")} hrs</span>
                        </div>
                      )}
                      <div>
                        <span className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Ano Mod/Fab</span>
                        <span className="text-sm font-black text-text-main uppercase">{currentItem.model_year || "-"} / {currentItem.manufacture_year || "-"}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Combustível</span>
                        <span className="text-sm font-black text-text-main uppercase">{currentItem.fuel_type || "N/I"}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Renavam</span>
                        <span className="text-sm font-black text-text-main font-mono">{currentItem.renavam || "N/I"}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Chassi</span>
                        <span className="text-sm font-black text-text-main font-mono uppercase">{currentItem.chassi || "N/I"}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Tipo</span>
                        <span className="text-sm font-black text-text-main uppercase">{types.find((t) => t.id === currentItem.type)?.name || currentItem.type || "N/I"}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Modalidade</span>
                        <span className="text-sm font-black text-text-main uppercase">{modalities.find((m) => m.id === currentItem.modality_id)?.name || "N/I"}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Filial</span>
                        <span className="text-sm font-black text-blue-600 uppercase">{branches.find((b) => b.id === currentItem.branch_id)?.name || "N/I"}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Cor Predominante</span>
                        <span className="text-sm font-black text-text-main uppercase">{currentItem.color || "N/I"}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">ANTT</span>
                        <span className="text-sm font-black text-text-main uppercase">{currentItem.antt || "N/I"}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Seguradora</span>
                        <span className="text-sm font-black text-text-main uppercase">{insurances.find((i) => i.id === currentItem.insurance_id)?.name || "N/I"}</span>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-app-border">
                      <h4 className="text-[10px] font-black uppercase text-text-muted tracking-wider mb-3">Documentos Anexados (PDF/Fotos)</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentItem.doc_crlv_url && (
                          <a href={((currentItem.doc_crlv_url)?.startsWith('http') ? (currentItem.doc_crlv_url) : supabase.storage.from('vehicles-docs').getPublicUrl(currentItem.doc_crlv_url).data.publicUrl)} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:text-primary hover:border-primary/30 transition-colors">📄 CRLV</a>
                        )}
                        {currentItem.doc_antt_url && (
                          <a href={((currentItem.doc_antt_url)?.startsWith('http') ? (currentItem.doc_antt_url) : supabase.storage.from('vehicles-docs').getPublicUrl(currentItem.doc_antt_url).data.publicUrl)} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:text-primary hover:border-primary/30 transition-colors">📄 ANTT</a>
                        )}
                        {currentItem.doc_insurance_url && (
                          <a href={((currentItem.doc_insurance_url)?.startsWith('http') ? (currentItem.doc_insurance_url) : supabase.storage.from('vehicles-docs').getPublicUrl(currentItem.doc_insurance_url).data.publicUrl)} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:text-primary hover:border-primary/30 transition-colors">📄 Apólice Seguro</a>
                        )}
                        {!currentItem.doc_crlv_url && !currentItem.doc_antt_url && !currentItem.doc_insurance_url && (
                          <span className="text-[10px] text-slate-400 italic">Nenhum documento anexado</span>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-app-border">
                      <h4 className="text-[10px] font-black uppercase text-text-muted tracking-wider mb-3">Galeria do Veículo</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        {currentItem.photo_front_url && (
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-400 text-center block">Frontal</span>
                            <a href={((currentItem.photo_front_url)?.startsWith('http') ? (currentItem.photo_front_url) : supabase.storage.from('vehicles-docs').getPublicUrl(currentItem.photo_front_url).data.publicUrl)} target="_blank" rel="noreferrer">
                              <img src={((currentItem.photo_front_url)?.startsWith('http') ? (currentItem.photo_front_url) : supabase.storage.from('vehicles-docs').getPublicUrl(currentItem.photo_front_url).data.publicUrl)} alt="Frontal" className="w-full h-16 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition-opacity" />
                            </a>
                          </div>
                        )}
                        {currentItem.photo_right_url && (
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-400 text-center block">Lateral Direita</span>
                            <a href={((currentItem.photo_right_url)?.startsWith('http') ? (currentItem.photo_right_url) : supabase.storage.from('vehicles-docs').getPublicUrl(currentItem.photo_right_url).data.publicUrl)} target="_blank" rel="noreferrer">
                              <img src={((currentItem.photo_right_url)?.startsWith('http') ? (currentItem.photo_right_url) : supabase.storage.from('vehicles-docs').getPublicUrl(currentItem.photo_right_url).data.publicUrl)} alt="Direita" className="w-full h-16 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition-opacity" />
                            </a>
                          </div>
                        )}
                        {currentItem.photo_left_url && (
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-400 text-center block">Lateral Esquerda</span>
                            <a href={((currentItem.photo_left_url)?.startsWith('http') ? (currentItem.photo_left_url) : supabase.storage.from('vehicles-docs').getPublicUrl(currentItem.photo_left_url).data.publicUrl)} target="_blank" rel="noreferrer">
                              <img src={((currentItem.photo_left_url)?.startsWith('http') ? (currentItem.photo_left_url) : supabase.storage.from('vehicles-docs').getPublicUrl(currentItem.photo_left_url).data.publicUrl)} alt="Esquerda" className="w-full h-16 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition-opacity" />
                            </a>
                          </div>
                        )}
                        {currentItem.photo_rear_url && (
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-400 text-center block">Traseira</span>
                            <a href={((currentItem.photo_rear_url)?.startsWith('http') ? (currentItem.photo_rear_url) : supabase.storage.from('vehicles-docs').getPublicUrl(currentItem.photo_rear_url).data.publicUrl)} target="_blank" rel="noreferrer">
                              <img src={((currentItem.photo_rear_url)?.startsWith('http') ? (currentItem.photo_rear_url) : supabase.storage.from('vehicles-docs').getPublicUrl(currentItem.photo_rear_url).data.publicUrl)} alt="Traseira" className="w-full h-16 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition-opacity" />
                            </a>
                          </div>
                        )}
                        {!currentItem.photo_front_url && !currentItem.photo_right_url && !currentItem.photo_left_url && !currentItem.photo_rear_url && (
                          <span className="text-[10px] text-slate-400 italic col-span-4">Nenhuma foto anexada</span>
                        )}
                      </div>
                    </div>
                </div>

                <div className="flex gap-3 pt-6 border-t border-app-border mt-6">
                  {currentItem.itemType === 'vehicle' && (
                    <button onClick={() => setSelectedVehicle(currentItem)} className="flex-1 h-12 bg-app-bg border border-app-border hover:bg-slate-50 text-text-main font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-colors">
                      <Eye size={16}/> Ver Tudo
                    </button>
                  )}
                  <button onClick={() => { 
                    setFormType(currentItem.itemType); setItemForm({ ...currentItem, photo_front_url: currentItem.photo_front_url || "", photo_right_url: currentItem.photo_right_url || "", photo_left_url: currentItem.photo_left_url || "", photo_rear_url: currentItem.photo_rear_url || "", doc_crlv_url: currentItem.doc_crlv_url || "", doc_antt_url: currentItem.doc_antt_url || "", doc_insurance_url: currentItem.doc_insurance_url || "" }); setIsFormOpen(true);
                  }} className={`${currentItem.itemType === 'vehicle' ? 'flex-1' : 'w-full'} h-12 bg-app-bg border border-app-border hover:bg-slate-50 text-text-main font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-colors`}>
                    <Edit2 size={16}/> Editar
                  </button>
                  <button onClick={() => toggleStatus(currentItem.itemType === 'vehicle' ? "vehicles" : "trailers", currentItem.id, currentItem.active !== false)} className={`w-12 h-12 flex items-center justify-center rounded-xl transition-colors ${currentItem.active !== false ? "bg-red-50 text-danger hover:bg-red-100" : "bg-green-50 text-success hover:bg-green-100"}`} title={currentItem.active !== false ? "Desabilitar" : "Habilitar"}>
                    {currentItem.active !== false ? <X size={18}/> : <CheckCircle2 size={18}/>}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase text-slate-300 tracking-widest">
              {currentVehicleIndex + 1} de {filteredItems.length}
            </div>
          </div>
        )}

      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsFormOpen(false)}/>
          <div className="relative bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl p-6 sm:p-8 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-text-main uppercase tracking-tight">
                {itemForm.id ? `Editar ${formType === "trailer" ? "Reboque" : "Veículo"}` : `Novo ${formType === "trailer" ? "Reboque" : "Veículo"}`}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 rounded-full hover:bg-rose-100 hover:text-rose-600 transition-colors">
                <X size={16}/>
              </button>
            </div>
            
            <form onSubmit={handleSaveItem} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Placa</label>
                  <input required className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-[11px] font-bold outline-none focus:border-primary" placeholder="ABC-1234" value={itemForm.plate} onChange={(e) => setItemForm({ ...itemForm, plate: e.target.value.toUpperCase() })}/>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Modelo (Marca / Descrição)</label>
                  <input required className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-[11px] font-bold outline-none focus:border-primary" placeholder="Ex: Scania R450" value={itemForm.model} onChange={(e) => setItemForm({ ...itemForm, model: e.target.value })}/>
                </div>
              </div>

              {formType === "vehicle" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-indigo-900 uppercase tracking-widest flex items-center gap-1.5">
                      Tipo de Ativo (Classificação)
                    </label>
                    <select
                      className="w-full h-11 px-4 rounded-xl border border-indigo-200 bg-white text-[11px] font-bold outline-none focus:border-primary text-slate-800"
                      value={itemForm.asset_type || "VEHICLE"}
                      onChange={(e) => setItemForm({ ...itemForm, asset_type: e.target.value })}
                    >
                      <option value="VEHICLE">🚚 VEHICLE - Veículo (Rodoviário / Urbano)</option>
                      <option value="MACHINE">🚜 MACHINE - Máquina (Trator, Escavadeira, Pá Carregadeira)</option>
                      <option value="EQUIPMENT">⚙️ EQUIPMENT - Equipamento (Gerador, Empilhadeira, Compressores)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-indigo-900 uppercase tracking-widest flex items-center gap-1.5">
                      Unidade de Controle Principal
                    </label>
                    <select
                      className="w-full h-11 px-4 rounded-xl border border-indigo-200 bg-white text-[11px] font-bold outline-none focus:border-primary text-slate-800"
                      value={itemForm.control_unit || "KM"}
                      onChange={(e) => setItemForm({ ...itemForm, control_unit: e.target.value })}
                    >
                      <option value="KM">KM - Quilometragem</option>
                      <option value="HOURS">HOURS - Horímetro (Horas de Uso)</option>
                      <option value="BOTH">BOTH - Ambos (Quilometragem e Horímetro)</option>
                    </select>
                  </div>

                  {(itemForm.control_unit === "HOURS" || itemForm.control_unit === "BOTH" || itemForm.asset_type === "MACHINE" || itemForm.asset_type === "EQUIPMENT") && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">Horímetro Inicial (Horas)</label>
                        <input
                          type="number"
                          step="0.1"
                          className="w-full h-11 px-4 rounded-xl border border-indigo-200 bg-white text-[11px] font-bold outline-none focus:border-primary font-mono text-slate-800"
                          value={itemForm.hour_meter_initial || 0}
                          onChange={(e) => setItemForm({ ...itemForm, hour_meter_initial: parseFloat(e.target.value) || 0 })}
                          placeholder="Ex: 0"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">Horímetro Atual (Horas)</label>
                        <input
                          type="number"
                          step="0.1"
                          className="w-full h-11 px-4 rounded-xl border border-indigo-200 bg-white text-[11px] font-bold outline-none focus:border-primary font-mono text-slate-800"
                          value={itemForm.hour_meter_current || itemForm.hour_meter || itemForm.hour_meter_initial || 0}
                          onChange={(e) => setItemForm({ ...itemForm, hour_meter_current: parseFloat(e.target.value) || 0 })}
                          placeholder="Ex: 1200"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Tipo de Veículo</label>
                  <select required className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-[11px] font-bold outline-none focus:border-primary" value={itemForm.type} onChange={(e) => setItemForm({ ...itemForm, type: e.target.value })}>
                    <option value="">Selecione...</option>
                    {types.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Modalidade do Veículo</label>
                  <select className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-[11px] font-bold outline-none focus:border-primary" value={itemForm.modality_id} onChange={(e) => setItemForm({ ...itemForm, modality_id: e.target.value })}>
                    <option value="">Nenhuma / Geral</option>
                    {modalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Filial Atribuída</label>
                  <select className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-[11px] font-bold outline-none focus:border-primary" value={itemForm.branch_id || ""} onChange={(e) => setItemForm({ ...itemForm, branch_id: e.target.value })}>
                    <option value="">Selecione uma Filial (Opcional)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name} {b.code ? `(${b.code})` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Renavam</label>
                  <input type="text" className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-[11px] font-bold outline-none focus:border-primary font-mono" value={itemForm.renavam || ""} onChange={(e) => setItemForm({...itemForm, renavam: e.target.value})} placeholder="Renavam"/>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Chassi</label>
                  <input type="text" className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-[11px] font-bold outline-none focus:border-primary font-mono uppercase" value={itemForm.chassi || ""} onChange={(e) => setItemForm({...itemForm, chassi: e.target.value.toUpperCase()})} placeholder="Número do Chassi"/>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Ano de Fabricação</label>
                  <input type="text" className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-[11px] font-bold outline-none focus:border-primary" value={itemForm.manufacture_year} onChange={(e) => setItemForm({...itemForm, manufacture_year: e.target.value})} placeholder="Ex: 2020"/>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Ano Modelo</label>
                  <input type="text" className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-[11px] font-bold outline-none focus:border-primary" value={itemForm.model_year} onChange={(e) => setItemForm({...itemForm, model_year: e.target.value})} placeholder="Ex: 2021"/>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Número do CRV</label>
                  <input type="text" className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-[11px] font-bold outline-none focus:border-primary" value={itemForm.crv_number} onChange={(e) => setItemForm({...itemForm, crv_number: e.target.value})} placeholder="CRV"/>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Tipo Combustível</label>
                  <input type="text" className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-[11px] font-bold outline-none focus:border-primary" value={itemForm.fuel_type} onChange={(e) => setItemForm({...itemForm, fuel_type: e.target.value})} placeholder="Ex: Diesel"/>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Cor Predominante</label>
                  <input type="text" className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-[11px] font-bold outline-none focus:border-primary" value={itemForm.color} onChange={(e) => setItemForm({...itemForm, color: e.target.value})} placeholder="Ex: Branco"/>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Seguradora</label>
                  <select className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-[11px] font-bold outline-none focus:border-primary" value={itemForm.insurance_id} onChange={(e) => setItemForm({...itemForm, insurance_id: e.target.value})}>
                    <option value="">Selecione a Seguradora</option>
                    {insurances.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">ANTT</label>
                  <input type="text" className="w-full h-11 px-4 rounded-xl border border-app-border bg-app-bg text-[11px] font-bold outline-none focus:border-primary" value={itemForm.antt} onChange={(e) => setItemForm({...itemForm, antt: e.target.value})} placeholder="Número ANTT"/>
                </div>
              </div>

              {formType === 'vehicle' && (<div className="flex items-center gap-3 pt-2">
                <input type="checkbox" id="reqTrailer" className="w-4 h-4 rounded border-app-border text-primary focus:ring-primary" checked={itemForm.requires_trailer} onChange={(e) => setItemForm({ ...itemForm, requires_trailer: e.target.checked })}/>
                <label htmlFor="reqTrailer" className="text-xs font-bold text-text-main cursor-pointer select-none">
                  Requer Reboque no Checklist
                </label>
              </div>)}

              <div className="space-y-4 pt-2">
                <h3 className="text-[12px] font-bold text-text-main">Fotos (Opcional)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center"><label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Frontal</label>{itemForm.photo_front_url && <a href={itemForm.photo_front_url} target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md hover:bg-emerald-100 transition-colors">Ver Atual</a>}</div>
                    <input type="file" accept="image/*" onChange={(e) => setPhotoFrontFile(e.target.files?.[0] || null)} className="w-full text-[10px]"/>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center"><label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Lateral Direita</label>{itemForm.photo_right_url && <a href={itemForm.photo_right_url} target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md hover:bg-emerald-100 transition-colors">Ver Atual</a>}</div>
                    <input type="file" accept="image/*" onChange={(e) => setPhotoRightFile(e.target.files?.[0] || null)} className="w-full text-[10px]"/>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center"><label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Lateral Esquerda</label>{itemForm.photo_left_url && <a href={itemForm.photo_left_url} target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md hover:bg-emerald-100 transition-colors">Ver Atual</a>}</div>
                    <input type="file" accept="image/*" onChange={(e) => setPhotoLeftFile(e.target.files?.[0] || null)} className="w-full text-[10px]"/>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center"><label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Traseira</label>{itemForm.photo_rear_url && <a href={itemForm.photo_rear_url} target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md hover:bg-emerald-100 transition-colors">Ver Atual</a>}</div>
                    <input type="file" accept="image/*" onChange={(e) => setPhotoRearFile(e.target.files?.[0] || null)} className="w-full text-[10px]"/>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2 border-b border-app-border pb-4">
                <h3 className="text-[12px] font-bold text-text-main">Documentos (PDF/Opcional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center"><label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Documento CRLV</label>{itemForm.doc_crlv_url && <a href={itemForm.doc_crlv_url} target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md hover:bg-emerald-100 transition-colors">Ver Atual</a>}</div>
                    <input type="file" accept=".pdf,image/*" onChange={(e) => setDocCrlvFile(e.target.files?.[0] || null)} className="w-full text-[10px]"/>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center"><label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Documento ANTT</label>{itemForm.doc_antt_url && <a href={itemForm.doc_antt_url} target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md hover:bg-emerald-100 transition-colors">Ver Atual</a>}</div>
                    <input type="file" accept=".pdf,image/*" onChange={(e) => setDocAnttFile(e.target.files?.[0] || null)} className="w-full text-[10px]"/>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center"><label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Apólice Seguro</label>{itemForm.doc_insurance_url && <a href={itemForm.doc_insurance_url} target="_blank" rel="noopener noreferrer" className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded-md hover:bg-emerald-100 transition-colors">Ver Atual</a>}</div>
                    <input type="file" accept=".pdf,image/*" onChange={(e) => setDocInsuranceFile(e.target.files?.[0] || null)} className="w-full text-[10px]"/>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 h-12 bg-app-bg text-text-main border border-app-border font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-zinc-100 transition-all shadow-sm">
                  Cancelar
                </button>
                <button disabled={saving} className="flex-1 h-12 bg-primary text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:opacity-90 transition-all shadow-sm disabled:opacity-50">
                  {saving ? "Aguarde..." : `Salvar ${formType === "trailer" ? "Reboque" : "Veículo"}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedVehicle && (
        <VehicleDetailsModal
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
        />
      )}
    </>
  );
}