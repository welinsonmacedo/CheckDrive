// components/admin/ChecklistDetailsModal.tsx
import { motion, AnimatePresence } from 'motion/react';
import { X, ClipboardCheck, Eye, EyeOff, Image as ImageIcon, AlertCircle, ChevronDown, ChevronUp, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useState, useEffect } from 'react';

interface ChecklistDetailsModalProps {
  selectedSub: any | null;
  onClose: () => void;
}

export default function ChecklistDetailsModal({ selectedSub, onClose }: ChecklistDetailsModalProps) {
  const [loadPhotos, setLoadPhotos] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<any | null>(null);
  const [zoom, setZoom] = useState(1);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [defectItems, setDefectItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
      console.log('Buscando issues para o submission:', selectedSub.id);
      
      const { data: issuesData, error } = await supabase
        .from("checklist_issues")
        .select("*")
        .eq("submission_id", selectedSub.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error('Erro ao buscar issues:', error);
        setDefectItems([]);
        setLoading(false);
        return;
      }

      console.log('Issues encontradas:', issuesData);

      if (issuesData && issuesData.length > 0) {
        // Buscar informações do veículo e motorista
        const vehicleIds = [...new Set(issuesData.map((i: any) => i.vehicle_id))];
        const driverIds = [...new Set(issuesData.map((i: any) => i.driver_id))];

        const { data: vehicles } = await supabase
          .from("vehicles")
          .select("id, plate, model")
          .in("id", vehicleIds);

        const { data: drivers } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", driverIds);

        const issuesWithRelations = issuesData.map((issue: any) => ({
          ...issue,
          vehicles: vehicles?.find(v => v.id === issue.vehicle_id),
          profiles: drivers?.find(d => d.id === issue.driver_id)
        }));

        setDefectItems(issuesWithRelations);
        
        // Expandir o primeiro item automaticamente
        if (issuesWithRelations.length > 0 && expandedItems.length === 0) {
          setExpandedItems([issuesWithRelations[0].id]);
        }
      } else {
        // Se não encontrar issues, tenta extrair dos details (fallback)
        console.log('Nenhuma issue encontrada, tentando fallback para details');
        extractDefectsFromDetails();
      }
      
    } catch (error) {
      console.error('Erro:', error);
      extractDefectsFromDetails();
    } finally {
      setLoading(false);
    }
  }

  // Fallback: extrair defeitos dos details (caso não exista na tabela checklist_issues)
  function extractDefectsFromDetails() {
    const items = [];
    
    if (selectedSub?.details?.itemValues) {
      for (const [itemId, val] of Object.entries(selectedSub.details.itemValues)) {
        if (val === 'defect' || val === 'defeito') {
          const defectInfo = selectedSub.details.defects?.[itemId];
          items.push({
            id: itemId,
            item_title: selectedSub.details.itemTitles?.[itemId] || `Item ${itemId}`,
            description: defectInfo?.description || 'Nenhuma descrição fornecida',
            photo_url: defectInfo?.photoUrl || null,
            vehicles: selectedSub.vehicles,
            profiles: selectedSub.profiles,
            created_at: selectedSub.created_at
          });
        }
      }
    }
    
    setDefectItems(items);
    if (items.length > 0 && expandedItems.length === 0) {
      setExpandedItems([items[0].id]);
    }
  }

  if (!selectedSub) return null;

  const getPhotoUrl = (path: string) => {
    if (!path) return null;
    const { data } = supabase.storage.from('checklist-photos').getPublicUrl(path);
    return data.publicUrl;
  };

  const openImageModal = (issue: any) => {
    if (!issue?.photo_url) return;
    
    const publicUrl = supabase
      .storage
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
    const date = new Date(selectedIssue.created_at).toLocaleDateString("pt-BR").replace(/\//g, "-");
    const fileName = `${plate}_${selectedIssue.item_title}_${date}.jpg`;
    
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
  };

  const hasDefects = defectItems.length > 0;
  const hasPhotos = selectedSub.photos && Object.keys(selectedSub.photos).length > 0;
  const photosCount = hasPhotos ? Object.keys(selectedSub.photos).length : 0;

  const handleLoadPhotos = async () => {
    setLoadingPhotos(true);
    setTimeout(() => {
      setLoadPhotos(true);
      setLoadingPhotos(false);
    }, 500);
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl"
        >
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white sticky top-0 z-10">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                <ClipboardCheck size={18} className="text-primary" />
                Detalhes do Checklist
              </h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase">
                Nº {selectedSub.id?.split('-')[0]} • {new Date(selectedSub.created_at).toLocaleString()}
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="h-10 w-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center shadow-sm hover:bg-gray-50 hover:shadow-md transition-all"
            >
              <X size={18} className="text-gray-400" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 space-y-10">
            {/* Informações básicas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Motorista</span>
                <p className="text-sm font-black text-gray-800">{selectedSub.profiles?.full_name || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Veículo / Placa</span>
                <p className="text-sm font-black text-gray-800">{selectedSub.vehicles?.plate || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status / KM</span>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                    selectedSub.status === 'concluded' 
                      ? 'bg-green-50 text-green-600 border border-green-100' 
                      : 'bg-red-50 text-red-600 border border-red-100'
                  }`}>
                    {selectedSub.status === 'concluded' ? 'Concluído' : 'Pendente'}
                  </span>
                  <span className="text-sm font-mono font-bold text-gray-700">
                    {selectedSub.odometer !== null && selectedSub.odometer !== undefined ? `${selectedSub.odometer} KM` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Defeitos Encontrados */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} className="text-red-500" />
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Defeitos Encontrados
                  </h4>
                  <span className="text-[9px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                    {defectItems.length} {defectItems.length === 1 ? 'defeito' : 'defeitos'}
                  </span>
                </div>
              </div>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
                    <span className="text-xs text-gray-500">Carregando defeitos...</span>
                  </div>
                </div>
              ) : !hasDefects ? (
                <div className="text-center py-8 bg-green-50 rounded-xl border border-green-100">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <ClipboardCheck size={24} className="text-green-600" />
                    </div>
                    <p className="text-sm font-medium text-green-700">Nenhum defeito encontrado!</p>
                    <p className="text-xs text-green-600">Todos os itens do checklist estão normais.</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {defectItems.map((item) => {
                    const isExpanded = expandedItems.includes(item.id);
                    const imageUrl = item.photo_url ? getPhotoUrl(item.photo_url) : null;
                    
                    return (
                      <div key={item.id} className="flex flex-col p-4 rounded-xl bg-red-50/30 border border-red-200">
                        <div 
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => {
                            setExpandedItems(prev => 
                              prev.includes(item.id) 
                                ? prev.filter(i => i !== item.id)
                                : [...prev, item.id]
                            );
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-800">{item.item_title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-red-100 text-red-700">
                              DEFEITO
                            </span>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>
                        
                        {isExpanded && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t border-red-200"
                          >
                            {/* Descrição */}
                            <div className="space-y-2 mb-4">
                              <span className="text-[10px] font-bold text-red-600 uppercase">Descrição Reportada:</span>
                              <div className={`p-3 rounded-lg ${item.description ? 'bg-white' : 'bg-gray-50'}`}>
                                <p className={`text-xs font-medium ${item.description ? 'text-gray-600' : 'text-gray-400 italic'}`}>
                                  {item.description || 'Nenhuma descrição fornecida'}
                                </p>
                              </div>
                            </div>
                            
                            {/* Foto do defeito */}
                            {imageUrl ? (
                              <div className="space-y-2">
                                <span className="text-[10px] font-bold text-red-600 uppercase">Foto do Defeito:</span>
                                <div className="flex gap-2">
                                  <img
                                    src={imageUrl}
                                    className="w-32 h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 hover:shadow-md transition-all border border-red-200"
                                    onClick={() => openImageModal(item)}
                                    alt="Defeito"
                                    onError={(e) => {
                                      console.error('Erro ao carregar imagem:', e);
                                      e.currentTarget.src = 'https://placehold.co/400x300/e2e8f0/94a3b8?text=Erro';
                                    }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase">Foto do Defeito:</span>
                                <div className="w-32 h-32 rounded-lg bg-gray-100 flex flex-col items-center justify-center gap-1 border border-gray-200">
                                  <ImageIcon size={24} className="text-gray-400" />
                                  <span className="text-[9px] text-gray-400">Nenhuma foto anexada</span>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Botão para carregar fotos do veículo */}
            {hasPhotos && !loadPhotos && (
              <div className="flex justify-center">
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
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fotos do Veículo</h4>
                    <span className="text-[9px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {photosCount} {photosCount === 1 ? 'foto' : 'fotos'}
                    </span>
                  </div>
                  <button 
                    onClick={() => setLoadPhotos(false)}
                    className="flex items-center gap-1.5 text-[10px] font-bold bg-gray-100 text-gray-600 px-3 py-1.5 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    <EyeOff size={12} />
                    Ocultar Imagens
                  </button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(selectedSub.photos).map(([pos, url]: any) => {
                    const photoUrl = getPhotoUrl(url);
                    const fakeIssue = {
                      photo_url: url,
                      item_title: `Foto ${pos}`,
                      vehicles: selectedSub.vehicles,
                      created_at: selectedSub.created_at,
                      description: null
                    };
                    return (
                      <div key={pos} className="space-y-2">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center block">
                          {pos === 'front' ? 'Dianteira' : 
                           pos === 'back' ? 'Traseira' :
                           pos === 'left' ? 'Lateral Esquerda' :
                           pos === 'right' ? 'Lateral Direita' : pos}
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
                              e.currentTarget.src = 'https://placehold.co/400x300/e2e8f0/94a3b8?text=Erro';
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
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-5xl" onClick={(e) => e.stopPropagation()}>
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
                    <span className="font-bold">{selectedIssue.vehicles?.plate || selectedSub.vehicles?.plate}</span>
                    <span className="mx-2">•</span>
                    <span>{selectedIssue.item_title}</span>
                  </div>
                  <div className="text-xs">
                    {new Date(selectedIssue.created_at || selectedSub.created_at).toLocaleString()}
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
                <ZoomIn size={18}/>
              </button>
              <button
                onClick={() => setZoom(Math.max(1, zoom - 0.2))}
                className="bg-white p-2 rounded-lg hover:bg-gray-100 transition-colors shadow-md"
              >
                <ZoomOut size={18}/>
              </button>
              <button
                onClick={downloadImage}
                className="bg-white p-2 rounded-lg hover:bg-gray-100 transition-colors shadow-md"
              >
                <Download size={18}/>
              </button>
              <button
                onClick={() => setSelectedImage(null)}
                className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors shadow-md"
              >
                <X size={18}/>
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}