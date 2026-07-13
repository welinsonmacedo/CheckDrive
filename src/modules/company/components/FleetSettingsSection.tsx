import React, { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from '@/src/modules/shared/contexts/AuthContext';
import { Truck, Plus, Trash2, Edit2, Layers } from "lucide-react";

export default function FleetSettingsSection() {
  const { user } = useAuth();

  const [activeInternalTab, setActiveInternalTab] = useState<
    "modalities" | "types" | "models"
  >("types");
  const [types, setTypes] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [modalities, setModalities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Type form
  const [typeForm, setTypeForm] = useState({
    id: "",
    name: "",
    max_speed: "",
    ideal_consumption: "",
  });
  const [showTypeForm, setShowTypeForm] = useState(false);

  // Model form
  const [modelForm, setModelForm] = useState({ id: "", type_id: "", name: "" });
  const [showModelForm, setShowModelForm] = useState(false);

  // Modality form
  const [modalityForm, setModalityForm] = useState({ id: "", name: "" });
  const [showModalityForm, setShowModalityForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [typesRes, modelsRes, modalitiesRes] = await Promise.all([
        supabase.from("vehicle_types").select("*").eq("company_id", user?.company_id).order("name"),
        supabase.from("vehicle_models").select("*, vehicle_types(name)")
          .eq("company_id", user?.company_id)
          .order("name"),
        supabase.from("vehicle_modalities").select("*").eq("company_id", user?.company_id).order("name"),
      ]);
      setTypes(typesRes.data || []);
      setModels(modelsRes.data || []);
      setModalities(modalitiesRes.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: typeForm.name,
        max_speed: Number(typeForm.max_speed),
        ideal_consumption: Number(typeForm.ideal_consumption),
      };

      if (typeForm.id) {
        await supabase
          .from("vehicle_types")
          .update(payload)
          .eq("id", typeForm.id);
      } else {
        await supabase.from("vehicle_types").insert(payload);
      }
      setTypeForm({ id: "", name: "", max_speed: "", ideal_consumption: "" });
      setShowTypeForm(false);
      fetchData();
    } catch (error: any) {
      alert("Erro: " + error.message);
    }
  };

  const handleDeleteType = async (id: string) => {
    if (!confirm("Excluir este tipo?")) return;
    try {
      await supabase.from("vehicle_types").delete().eq("id", id);
      fetchData();
    } catch (error: any) {
      alert("Erro: " + error.message);
    }
  };

  const handleSaveModel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: modelForm.name,
        type_id: modelForm.type_id,
      };

      if (modelForm.id) {
        await supabase
          .from("vehicle_models")
          .update(payload)
          .eq("id", modelForm.id);
      } else {
        await supabase.from("vehicle_models").insert(payload);
      }
      setModelForm({ id: "", type_id: "", name: "" });
      setShowModelForm(false);
      fetchData();
    } catch (error: any) {
      alert("Erro: " + error.message);
    }
  };

  const handleDeleteModel = async (id: string) => {
    if (!confirm("Excluir este modelo?")) return;
    try {
      await supabase.from("vehicle_models").delete().eq("id", id);
      fetchData();
    } catch (error: any) {
      alert("Erro: " + error.message);
    }
  };

  const handleSaveModality = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { name: modalityForm.name };
      if (modalityForm.id) {
        await supabase
          .from("vehicle_modalities")
          .update(payload)
          .eq("id", modalityForm.id);
      } else {
        await supabase.from("vehicle_modalities").insert(payload);
      }
      setModalityForm({ id: "", name: "" });
      setShowModalityForm(false);
      fetchData();
    } catch (error: any) {
      alert("Erro: " + error.message);
    }
  };

  const handleDeleteModality = async (id: string) => {
    if (!confirm("Excluir esta modalidade?")) return;
    try {
      await supabase.from("vehicle_modalities").delete().eq("id", id);
      fetchData();
    } catch (error: any) {
      alert("Erro: " + error.message);
    }
  };

  if (loading)
    return (
      <div className="animate-pulse flex space-x-4">
        <div className="flex-1 space-y-4 py-1">
          <div className="h-4 bg-zinc-200 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-zinc-200 rounded"></div>
          </div>
        </div>
      </div>
    );

  return (
    <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
      {/* Header com Tabs */}
      <div className="border-b border-app-border bg-zinc-50/50 p-4">
        <div className="flex bg-zinc-200/50 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveInternalTab("types")}
            className={`px-6 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
              activeInternalTab === "types"
                ? "bg-white shadow-sm text-primary"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            Tipos
          </button>
          <button
            onClick={() => setActiveInternalTab("models")}
            className={`px-6 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
              activeInternalTab === "models"
                ? "bg-white shadow-sm text-primary"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            Modelos
          </button>
          <button
            onClick={() => setActiveInternalTab("modalities")}
            className={`px-6 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
              activeInternalTab === "modalities"
                ? "bg-white shadow-sm text-primary"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            Modalidades
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeInternalTab === "modalities" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
              <div>
                <h4 className="text-sm font-bold text-zinc-800 flex items-center gap-2">
                  <Layers size={16} className="text-primary" />
                  Restrições e Tipologias
                </h4>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                  Configure modalidades de placa
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModalityForm(!showModalityForm)}
                className="px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-primary-hover transition-colors shadow-sm"
              >
                <Plus size={14} /> Adicionar
              </button>
            </div>

            {showModalityForm && (
              <form
                onSubmit={handleSaveModality}
                className="bg-white p-5 rounded-2xl border border-primary/20 shadow-sm space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Nome da Modalidade
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Bitrem, RodoCaçamba, etc"
                    className="w-full sm:w-1/2 h-12 px-4 rounded-xl border border-zinc-200 font-bold text-sm bg-zinc-50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    value={modalityForm.name}
                    onChange={(e) =>
                      setModalityForm({ ...modalityForm, name: e.target.value })
                    }
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-sm hover:bg-primary-hover"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModalityForm(false);
                      setModalityForm({ id: "", name: "" });
                    }}
                    className="px-6 py-2.5 bg-zinc-100 text-zinc-600 text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-zinc-200"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-hidden border border-zinc-200 rounded-2xl bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="px-5 py-3 font-bold text-zinc-500 uppercase tracking-widest text-[10px]">
                      Modalidade
                    </th>
                    <th className="px-5 py-3 font-bold text-zinc-500 uppercase tracking-widest text-[10px] text-right">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {modalities.map((m) => (
                    <tr
                      key={m.id}
                      className="hover:bg-zinc-50/80 transition-colors"
                    >
                      <td className="px-5 py-3.5 font-bold text-zinc-800">
                        {m.name}
                      </td>
                      <td className="px-5 py-3.5 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setModalityForm({ id: m.id, name: m.name });
                            setShowModalityForm(true);
                          }}
                          className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteModality(m.id)}
                          className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {modalities.length === 0 && (
                    <tr>
                      <td
                        colSpan={2}
                        className="px-5 py-8 text-center text-zinc-500 font-medium text-sm"
                      >
                        Nenhuma modalidade cadastrada
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeInternalTab === "types" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
              <div>
                <h4 className="text-sm font-bold text-zinc-800 flex items-center gap-2">
                  <Truck size={16} className="text-primary" />
                  Tipos de Veículo
                </h4>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                  Gerencie carrocerias e categorias
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTypeForm(!showTypeForm)}
                className="px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-primary-hover transition-colors shadow-sm"
              >
                <Plus size={14} /> Adicionar
              </button>
            </div>

            {showTypeForm && (
              <form
                onSubmit={handleSaveType}
                className="bg-white p-5 rounded-2xl border border-primary/20 shadow-sm space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      Nome do Tipo
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Cavalo Mecânico"
                      className="w-full h-12 px-4 rounded-xl border border-zinc-200 font-bold text-sm bg-zinc-50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      value={typeForm.name}
                      onChange={(e) =>
                        setTypeForm({ ...typeForm, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      Velocidade Máx. (km/h)
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="Ex: 80"
                      className="w-full h-12 px-4 rounded-xl border border-zinc-200 font-bold text-sm bg-zinc-50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      value={typeForm.max_speed}
                      onChange={(e) =>
                        setTypeForm({ ...typeForm, max_speed: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      Média Ideal (km/L)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      placeholder="Ex: 3.5"
                      className="w-full h-12 px-4 rounded-xl border border-zinc-200 font-bold text-sm bg-zinc-50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      value={typeForm.ideal_consumption}
                      onChange={(e) =>
                        setTypeForm({
                          ...typeForm,
                          ideal_consumption: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-sm hover:bg-primary-hover"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTypeForm(false);
                      setTypeForm({
                        id: "",
                        name: "",
                        max_speed: "",
                        ideal_consumption: "",
                      });
                    }}
                    className="px-6 py-2.5 bg-zinc-100 text-zinc-600 text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-zinc-200"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-hidden border border-zinc-200 rounded-2xl bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="px-5 py-3 font-bold text-zinc-500 uppercase tracking-widest text-[10px]">
                      Tipo
                    </th>
                    <th className="px-5 py-3 font-bold text-zinc-500 uppercase tracking-widest text-[10px]">
                      Velocidade Máx.
                    </th>
                    <th className="px-5 py-3 font-bold text-zinc-500 uppercase tracking-widest text-[10px]">
                      Média Ideal
                    </th>
                    <th className="px-5 py-3 font-bold text-zinc-500 uppercase tracking-widest text-[10px] text-right">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {types.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-zinc-50/80 transition-colors"
                    >
                      <td className="px-5 py-3.5 font-bold text-zinc-800">
                        {t.name}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-zinc-500">
                        {t.max_speed} km/h
                      </td>
                      <td className="px-5 py-3.5 font-medium text-zinc-500">
                        {t.ideal_consumption} km/L
                      </td>
                      <td className="px-5 py-3.5 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setTypeForm({
                              id: t.id,
                              name: t.name,
                              max_speed: t.max_speed?.toString() || "",
                              ideal_consumption:
                                t.ideal_consumption?.toString() || "",
                            });
                            setShowTypeForm(true);
                          }}
                          className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteType(t.id)}
                          className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {types.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-8 text-center text-zinc-500 font-medium text-sm"
                      >
                        Nenhum tipo cadastrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeInternalTab === "models" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
              <div>
                <h4 className="text-sm font-bold text-zinc-800 flex items-center gap-2">
                  <Truck size={16} className="text-primary" />
                  Modelos por Tipo
                </h4>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                  Modelos específicos de cada categoria
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModelForm(!showModelForm)}
                className="px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-primary-hover transition-colors shadow-sm"
              >
                <Plus size={14} /> Adicionar
              </button>
            </div>

            {showModelForm && (
              <form
                onSubmit={handleSaveModel}
                className="bg-white p-5 rounded-2xl border border-primary/20 shadow-sm space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      Tipo Associado
                    </label>
                    <select
                      required
                      className="w-full h-12 px-4 rounded-xl border border-zinc-200 font-bold text-sm bg-zinc-50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      value={modelForm.type_id}
                      onChange={(e) =>
                        setModelForm({ ...modelForm, type_id: e.target.value })
                      }
                    >
                      <option value="">Selecione o tipo</option>
                      {types.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      Nome do Modelo
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Volvo FH 540"
                      className="w-full h-12 px-4 rounded-xl border border-zinc-200 font-bold text-sm bg-zinc-50 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      value={modelForm.name}
                      onChange={(e) =>
                        setModelForm({ ...modelForm, name: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-primary text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-sm hover:bg-primary-hover"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModelForm(false);
                      setModelForm({ id: "", type_id: "", name: "" });
                    }}
                    className="px-6 py-2.5 bg-zinc-100 text-zinc-600 text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-zinc-200"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            <div className="overflow-hidden border border-zinc-200 rounded-2xl bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr>
                    <th className="px-5 py-3 font-bold text-zinc-500 uppercase tracking-widest text-[10px]">
                      Modelo
                    </th>
                    <th className="px-5 py-3 font-bold text-zinc-500 uppercase tracking-widest text-[10px]">
                      Tipo Associado
                    </th>
                    <th className="px-5 py-3 font-bold text-zinc-500 uppercase tracking-widest text-[10px] text-right">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {models.map((m) => (
                    <tr
                      key={m.id}
                      className="hover:bg-zinc-50/80 transition-colors"
                    >
                      <td className="px-5 py-3.5 font-bold text-zinc-800">
                        {m.name}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-zinc-500">
                        {m.vehicle_types?.name}
                      </td>
                      <td className="px-5 py-3.5 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setModelForm({
                              id: m.id,
                              type_id: m.type_id,
                              name: m.name,
                            });
                            setShowModelForm(true);
                          }}
                          className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteModel(m.id)}
                          className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {models.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-5 py-8 text-center text-zinc-500 font-medium text-sm"
                      >
                        Nenhum modelo cadastrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
