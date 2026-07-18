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
    <div className="flex flex-col gap-6 w-full">
      <div className="flex justify-between items-center px-1 mb-2">
        <h2 className="text-2xl font-extrabold text-text-main tracking-tight">Meus Veículos</h2>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div className="relative w-full sm:w-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"/>
          <input 
            type="text" 
            placeholder="Filtrar placa ou modelo..." 
            className="h-10 pl-9 pr-4 bg-app-bg rounded-xl text-[11px] font-bold text-text-main outline-none focus:ring-1 focus:ring-primary w-full sm:w-80 border border-app-border" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="p-12 text-center text-text-muted font-bold text-xs bg-app-bg rounded-2xl border border-app-border">
          Nenhum veículo ou reboque encontrado para este filtro.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredItems.map((item, index) => (
            <div key={item.id} className="bento-card p-6 flex flex-col gap-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col gap-4">
                <div className="aspect-video w-full rounded-2xl bg-slate-100 border border-app-border overflow-hidden flex items-center justify-center shrink-0">
                  {item.photo_front_url ? (
                    <img src={supabase.storage.from("vehicle-docs").getPublicUrl(item.photo_front_url).data.publicUrl} alt="Veículo" className="w-full h-full object-cover"/>
                  ) : (
                    <div className="text-center p-6 text-slate-400 flex flex-col items-center">
                      <div className="w-12 h-12 bg-slate-200 rounded-full mb-2 flex items-center justify-center">
                        <span className="opacity-50 font-bold text-xs">FOTO</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="text-lg font-black text-text-main uppercase tracking-tight truncate">
                      {item.plate}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-blue-100 text-blue-600 shrink-0">
                      {item.itemType === 'vehicle' ? 'Veículo' : 'Reboque'}
                    </span>
                  </div>
                  
                  {item.itemType === 'vehicle' && (
                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-app-border">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Modelo</span>
                        <span className="text-[10px] font-bold text-text-main truncate block" title={item.model}>{item.model || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Cor</span>
                        <span className="text-[10px] font-bold text-text-main">{item.color || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Ano Mod/Fab</span>
                        <span className="text-[10px] font-bold text-text-main">{item.model_year || '-'}/{item.manufacture_year || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Renavam</span>
                        <span className="text-[10px] font-bold text-text-main">{item.renavam || '-'}</span>
                      </div>
                    </div>
                  )}
                  {item.itemType === 'vehicle' && (
                    <div className="mt-6 pt-4 border-t border-app-border">
                      <button onClick={() => setSelectedVehicle(item)} className="w-full h-10 bg-app-bg border border-app-border hover:bg-slate-50 text-text-main font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 transition-colors">
                        <Eye size={16}/> Ver Tudo
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {selectedVehicle && (
        <VehicleDetailsModal
          vehicle={selectedVehicle}
          type={types.find((t) => t.id === selectedVehicle.type)}
          model={models.find((m) => m.id === selectedVehicle.model)}
          modality={modalities.find((m) => m.id === selectedVehicle.modality_id)}
          insurance={insurances.find((i) => i.id === selectedVehicle.insurance_id)}
          onClose={() => setSelectedVehicle(null)}
        />
      )}
    </div>
  );
}
