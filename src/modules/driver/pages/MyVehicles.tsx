import React, { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabase";
import { CheckCircle2, Search, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import VehicleDetailsModal from "@/src/modules/company/components/VehicleDetailsModal";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";

export default function MyVehicles() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [trailers, setTrailers] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [modalities, setModalities] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [formType, setFormType] = useState<"vehicle" | "trailer">("vehicle");
  const [currentVehicleIndex, setCurrentVehicleIndex] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isTrailerFormOpen, setIsTrailerFormOpen] = useState(false);

  const [itemForm, setItemForm] = useState<any>({
    id: "", plate: "", model: "", type: "", requires_trailer: false, modality_id: "",
    renavam: "", manufacture_year: "", model_year: "", crv_number: "", fuel_type: "", color: "", antt: "", insurance_id: "",
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
      const [vRes, tRes, typesRes, modelsRes, modRes, insurancesRes] = await Promise.all([
        supabase.from("vehicles").select("*, vehicle_modalities(name)").eq("company_id", user?.company_id).order("plate"),
        supabase.from("trailers").select("*").eq("company_id", user?.company_id).order("plate"),
        supabase.from("vehicle_types").select("*").eq("company_id", user?.company_id).order("name"),
        supabase.from("vehicle_models").select("*").eq("company_id", user?.company_id).order("name"),
        supabase.from("vehicle_modalities").select("*").eq("company_id", user?.company_id).order("name"),
        supabase.from("insurances").select("*").eq("company_id", user?.company_id).order("name"),
      ]);
      setVehicles(vRes.data || []);
      setTrailers(tRes.data || []);
      setTypes(typesRes.data || []);
      setModels(modelsRes.data || []);
      setModalities(modRes.data || []);
      if (insurancesRes.error && insurancesRes.error.code !== '42P01') { console.error(insurancesRes.error); } else if (insurancesRes.data) { setInsurances(insurancesRes.data); }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.company_id) fetchData();
  }, [user?.company_id]);

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
        modality_id: itemForm.modality_id || null, renavam: itemForm.renavam || null, manufacture_year: itemForm.manufacture_year || null,
        model_year: itemForm.model_year || null, crv_number: itemForm.crv_number || null, fuel_type: itemForm.fuel_type || null,
        color: itemForm.color || null, antt: itemForm.antt || null, insurance_id: itemForm.insurance_id || null,
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
      } else {
        const { error } = await supabase.from(formType === "trailer" ? "trailers" : "vehicles").insert([payload]);
        if (error) throw error;
      }

      setItemForm({ id: "", plate: "", model: "", type: "", requires_trailer: false, modality_id: "", renavam: "", manufacture_year: "", model_year: "", crv_number: "", fuel_type: "", color: "", antt: "", insurance_id: "", photo_front_url: "", photo_right_url: "", photo_left_url: "", photo_rear_url: "", doc_crlv_url: "", doc_antt_url: "", doc_insurance_url: "" });
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

  const filteredItems = combinedItems.filter((item) => 
    item.plate?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.itemType === 'vehicle' && item.model?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const currentItem = filteredItems[currentVehicleIndex] || null;

  return (
    <>
      <div className={`flex flex-col gap-6 ${selectedVehicle ? 'print:hidden' : ''}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full sm:w-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"/>
            <input type="text" placeholder="Filtrar placa ou modelo..." className="h-10 pl-9 pr-4 bg-app-bg rounded-xl text-[11px] font-bold text-text-main outline-none focus:ring-1 focus:ring-primary w-full sm:w-64 border border-app-border" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentVehicleIndex(0); }}/>
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
                    <img src={supabase.storage.from("vehicles-docs").getPublicUrl(currentItem.photo_front_url).data.publicUrl} alt="Frontal" className="w-full h-full object-cover"/>
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

                <div className="grid grid-cols-3 gap-2">
                    {['photo_right_url', 'photo_left_url', 'photo_rear_url'].map((k, i) => (
                      <div key={i} className="aspect-square bg-slate-50 border border-app-border rounded-xl flex items-center justify-center overflow-hidden">
                        {currentItem[k] ? (
                          <img src={supabase.storage.from("vehicles-docs").getPublicUrl(currentItem[k]).data.publicUrl} className="w-full h-full object-cover"/>
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
                    {currentItem.itemType === 'trailer' && (
                      <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest mr-2 border border-slate-200">
                        Reboque
                      </span>
                    )}
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${currentItem.active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {currentItem.active !== false ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-4 border-t border-app-border">
                      <div>
                        <span className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Modelo</span>
                        <span className="text-sm font-black text-text-main uppercase">{currentItem.model || "N/I"}</span>
                      </div>
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
                        <span className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Tipo</span>
                        <span className="text-sm font-black text-text-main uppercase">{types.find((t) => t.id === currentItem.type)?.name || currentItem.type || "N/I"}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Modalidade</span>
                        <span className="text-sm font-black text-text-main uppercase">{modalities.find((m) => m.id === currentItem.modality_id)?.name || "N/I"}</span>
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
                          <a href={supabase.storage.from('vehicles-docs').getPublicUrl(currentItem.doc_crlv_url).data.publicUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:text-primary hover:border-primary/30 transition-colors">📄 CRLV</a>
                        )}
                        {currentItem.doc_antt_url && (
                          <a href={supabase.storage.from('vehicles-docs').getPublicUrl(currentItem.doc_antt_url).data.publicUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:text-primary hover:border-primary/30 transition-colors">📄 ANTT</a>
                        )}
                        {currentItem.doc_insurance_url && (
                          <a href={supabase.storage.from('vehicles-docs').getPublicUrl(currentItem.doc_insurance_url).data.publicUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:text-primary hover:border-primary/30 transition-colors">📄 Apólice Seguro</a>
                        )}
                        {!currentItem.doc_crlv_url && !currentItem.doc_antt_url && !currentItem.doc_insurance_url && (
                          <span className="text-[10px] text-slate-400 italic">Nenhum documento anexado</span>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-app-border">
                      <h4 className="text-[10px] font-black uppercase text-text-muted tracking-wider mb-3">Galeria do Veículo</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {currentItem.photo_front_url && (
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-400 text-center block">Frontal</span>
                            <a href={supabase.storage.from('vehicles-docs').getPublicUrl(currentItem.photo_front_url).data.publicUrl} target="_blank" rel="noreferrer">
                              <img src={supabase.storage.from('vehicles-docs').getPublicUrl(currentItem.photo_front_url).data.publicUrl} alt="Frontal" className="w-full h-16 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition-opacity" />
                            </a>
                          </div>
                        )}
                        {currentItem.photo_right_url && (
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-400 text-center block">Lateral Direita</span>
                            <a href={supabase.storage.from('vehicles-docs').getPublicUrl(currentItem.photo_right_url).data.publicUrl} target="_blank" rel="noreferrer">
                              <img src={supabase.storage.from('vehicles-docs').getPublicUrl(currentItem.photo_right_url).data.publicUrl} alt="Direita" className="w-full h-16 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition-opacity" />
                            </a>
                          </div>
                        )}
                        {currentItem.photo_left_url && (
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-400 text-center block">Lateral Esquerda</span>
                            <a href={supabase.storage.from('vehicles-docs').getPublicUrl(currentItem.photo_left_url).data.publicUrl} target="_blank" rel="noreferrer">
                              <img src={supabase.storage.from('vehicles-docs').getPublicUrl(currentItem.photo_left_url).data.publicUrl} alt="Esquerda" className="w-full h-16 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition-opacity" />
                            </a>
                          </div>
                        )}
                        {currentItem.photo_rear_url && (
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-400 text-center block">Traseira</span>
                            <a href={supabase.storage.from('vehicles-docs').getPublicUrl(currentItem.photo_rear_url).data.publicUrl} target="_blank" rel="noreferrer">
                              <img src={supabase.storage.from('vehicles-docs').getPublicUrl(currentItem.photo_rear_url).data.publicUrl} alt="Traseira" className="w-full h-16 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition-opacity" />
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
                </div>
              </div>
            </div>
            
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase text-slate-300 tracking-widest">
              {currentVehicleIndex + 1} de {filteredItems.length}
            </div>
          </div>
        )}

      </div>


      {selectedVehicle && (
        <VehicleDetailsModal
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
        />
      )}
    </>
  );
}