import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  MapPin,
  CheckCircle2,
  X,
  AlertTriangle,
  Phone,
  User,
  Copy,
  Building,
  Check,
  ArrowLeft,
  Truck,
  Users,
  ChevronRight,
  Map,
  LayoutGrid,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import VehiclesTab from "./VehiclesTab";
import DriversTab from "./DriversTab";
import MaintenanceTab from "./MaintenanceTab";
import BranchMap from "./BranchMap";

export interface Branch {
  id: string;
  company_id: string;
  name: string;
  cnpj: string;
  cep: string;
  number?: string;
  location: string; // Localidade / Endereço Completo
  city: string;
  state: string;
  phone?: string;
  manager?: string;
  active: boolean;
  lat?: number;
  lng?: number;
  created_at?: string;
}

function isValidUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "00000000-0000-4000-8000-" + Date.now().toString(16).padStart(12, "0").slice(-12);
}

export default function BranchesTab() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [displayMode, setDisplayMode] = useState<"ambos" | "mapa" | "cards">("ambos");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbError, setDbError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(
    searchParams.get("branch_id") || null
  );

  const [branchTab, setBranchTab] = useState<
    "cadastro" | "veiculos" | "motoristas" | "pendencias"
  >("cadastro");

  const [form, setForm] = useState<{
    id: string;
    name: string;
    cnpj: string;
    cep: string;
    number: string;
    location: string;
    city: string;
    state: string;
    phone: string;
    manager: string;
    active: boolean;
    lat?: number;
    lng?: number;
  }>({
    id: "",
    name: "",
    cnpj: "",
    cep: "",
    number: "",
    location: "",
    city: "",
    state: "",
    phone: "",
    manager: "",
    active: true,
  });

  const companyId = (user as any)?.company_id || (user as any)?.company?.id;

  const storageKey = `checkdrive_branches_${companyId || "default"}`;

  const sqlCreateScript = `-- Script para criar a tabela de Filiais no Supabase
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    name TEXT NOT NULL,
    cnpj TEXT,
    cep TEXT,
    number TEXT,
    location TEXT,
    city TEXT,
    state TEXT,
    phone TEXT,
    manager TEXT,
    active BOOLEAN DEFAULT true,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Desabilitar RLS para permitir acesso amplo ou criar politica
ALTER TABLE public.branches DISABLE ROW LEVEL SECURITY;
`;

  const fetchData = async () => {
    setLoading(true);
    setDbError(false);
    try {
      // Tenta buscar do Supabase
      let query = supabase.from("branches").select("*").order("name");
      if (isValidUUID(companyId)) {
        query = query.eq("company_id", companyId);
      }

      const { data, error } = await query;

      if (error) {
        console.warn("Tabela 'branches' não encontrada ou erro no Supabase:", error.message);
        setDbError(true);
        loadLocalData();
      } else if (data) {
        setBranches(data);
      }
    } catch (err) {
      console.error("Erro ao carregar filiais:", err);
      setDbError(true);
      loadLocalData();
    } finally {
      setLoading(false);
    }
  };

  const loadLocalData = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setBranches(JSON.parse(saved));
      } else {
        const initialMock: Branch[] = [
          {
            id: generateUUID(),
            company_id: isValidUUID(companyId) ? companyId : "2988d70f-3c53-4563-a442-67c20ea40b7a",
            name: "Matriz Principal",
            cnpj: "12.345.678/0001-90",
            cep: "74000-000",
            location: "Av. Principal, nº 1000, Setor Central",
            city: "Goiânia",
            state: "GO",
            phone: "(62) 3200-0000",
            manager: "Gerência Geral",
            active: true,
          },
        ];
        setBranches(initialMock);
        localStorage.setItem(storageKey, JSON.stringify(initialMock));
      }
    } catch (e) {
      console.error("Erro no localStorage:", e);
    }
  };

  const saveLocalData = (newBranches: Branch[]) => {
    setBranches(newBranches);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newBranches));
    } catch (e) {
      console.error("Erro ao salvar localStorage:", e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId]);

  useEffect(() => {
    const urlBranchId = searchParams.get("branch_id");
    if (urlBranchId && urlBranchId !== selectedBranchId) {
      setSelectedBranchId(urlBranchId);
    }
  }, [searchParams]);

  const handleSelectBranch = (id: string | null) => {
    setSelectedBranchId(id);
    setBranchTab("cadastro");
    const newParams = new URLSearchParams(searchParams);
    if (id) {
      newParams.set("branch_id", id);
    } else {
      newParams.delete("branch_id");
    }
    setSearchParams(newParams);
  };

  const geocodeAddress = async (cep: string, number: string, location: string, city: string, state: string) => {
    const cleanCep = cep.replace(/\D/g, "");
    const numStr = number.trim();
    const cleanStreet = location
      .replace(/(?:quadra|qd\.?|lote|lt\.?|bloco|bl\.?|apto|apt\.?)\s*\d+/gi, "")
      .replace(/(?:nº|n°|num|número|no\.?)\s*\d+/gi, "")
      .replace(/,\s*,/g, ",")
      .trim()
      .replace(/^,|,$/g, "");

    // 1. Structured Nominatim Search
    if (cleanStreet || cleanCep) {
      try {
        const params = new URLSearchParams({
          format: "json",
          limit: "1",
          country: "Brazil",
        });

        if (cleanStreet) params.append("street", `${numStr ? numStr + " " : ""}${cleanStreet}`);
        if (city) params.append("city", city);
        if (state) params.append("state", state);
        if (cleanCep.length === 8) params.append("postalcode", cleanCep);

        const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
          headers: { "User-Agent": "SuaLogisticaApp/1.0" },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
            return {
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon),
            };
          }
        }
      } catch (e) {
        // ignore
      }
    }

    // 2. Freeform Nominatim
    if (cleanStreet || city) {
      try {
        const queryStr = [cleanStreet, numStr, city, state, "Brasil"].filter(Boolean).join(", ");
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(queryStr)}`,
          { headers: { "User-Agent": "SuaLogisticaApp/1.0" } }
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
            return {
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon),
            };
          }
        }
      } catch (e) {
        // ignore
      }
    }

    // 3. BrasilAPI CEP
    if (cleanCep.length === 8) {
      try {
        const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`);
        if (res.ok) {
          const data = await res.json();
          if (data.location?.coordinates?.latitude && data.location?.coordinates?.longitude) {
            const lat = parseFloat(data.location.coordinates.latitude);
            const lng = parseFloat(data.location.coordinates.longitude);
            if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
              return { lat, lng };
            }
          }
        }
      } catch (e) {
        // ignore
      }
    }

    // 4. AwesomeAPI CEP
    if (cleanCep.length === 8) {
      try {
        const geoRes = await fetch(`https://cep.awesomeapi.com.br/json/${cleanCep}`);
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          if (geoData.lat && geoData.lng) {
            const lat = parseFloat(geoData.lat);
            const lng = parseFloat(geoData.lng);
            if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
              return { lat, lng };
            }
          }
        }
      } catch (e) {
        // ignore
      }
    }

    return null;
  };

  const handleCepBlur = async () => {
    const cleanCep = form.cep.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          const newCity = data.localidade || form.city;
          const newState = data.uf || form.state;
          const newLocation = data.logradouro
            ? `${data.logradouro}${data.bairro ? `, ${data.bairro}` : ""}`
            : form.location;

          const coords = await geocodeAddress(cleanCep, form.number, newLocation, newCity, newState);

          setForm((prev) => ({
            ...prev,
            city: newCity,
            state: newState,
            location: newLocation,
            lat: coords?.lat ?? prev.lat,
            lng: coords?.lng ?? prev.lng,
          }));
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      }
    }
  };

  const handleOpenAddModal = () => {
    setForm({
      id: "",
      name: "",
      cnpj: "",
      cep: "",
      number: "",
      location: "",
      city: "",
      state: "",
      phone: "",
      manager: "",
      active: true,
      lat: undefined,
      lng: undefined,
    });
    setShowModal(true);
  };

  const handleEdit = (branch: Branch) => {
    setForm({
      id: branch.id,
      name: branch.name || "",
      cnpj: branch.cnpj || "",
      cep: branch.cep || "",
      number: branch.number || "",
      location: branch.location || "",
      city: branch.city || "",
      state: branch.state || "",
      phone: branch.phone || "",
      manager: branch.manager || "",
      active: branch.active !== false,
      lat: branch.lat,
      lng: branch.lng,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return alert("Por favor, informe o nome da filial.");
    setSaving(true);

    let lat = form.lat;
    let lng = form.lng;

    // Automatically attempt geocoding if lat/lng missing
    if (!lat || !lng) {
      const coords = await geocodeAddress(form.cep, form.number, form.location, form.city, form.state);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      }
    }

    const validCompanyId = isValidUUID(companyId) ? companyId : "2988d70f-3c53-4563-a442-67c20ea40b7a";

    const payload = {
      company_id: validCompanyId,
      name: form.name.trim(),
      cnpj: form.cnpj.trim(),
      cep: form.cep.trim(),
      number: form.number.trim(),
      location: form.location.trim(),
      city: form.city.trim(),
      state: form.state.trim().toUpperCase(),
      phone: form.phone.trim(),
      manager: form.manager.trim(),
      active: form.active,
      lat,
      lng,
      updated_at: new Date().toISOString(),
    };

    try {
      if (!dbError) {
        if (form.id && isValidUUID(form.id)) {
          const { error } = await supabase
            .from("branches")
            .update(payload)
            .eq("id", form.id);
          if (error) throw error;
        } else {
          const insertPayload = {
            id: generateUUID(),
            ...payload,
          };
          const { error } = await supabase.from("branches").insert([insertPayload]);
          if (error) throw error;
        }
        await fetchData();
      } else {
        let updated: Branch[] = [];
        if (form.id) {
          updated = branches.map((b) =>
            b.id === form.id ? { ...b, ...payload } : b
          );
        } else {
          const newBranch: Branch = {
            id: generateUUID(),
            ...payload,
            created_at: new Date().toISOString(),
          };
          updated = [newBranch, ...branches];
        }
        saveLocalData(updated);
      }

      setShowModal(false);
      setForm({
        id: "",
        name: "",
        cnpj: "",
        cep: "",
        location: "",
        city: "",
        state: "",
        phone: "",
        manager: "",
        active: true,
      });
      alert("Filial salva com sucesso!");
    } catch (error: any) {
      console.error("Erro ao salvar filial:", error);
      alert("Erro ao salvar no banco. A filial será mantida localmente.");
      let updated: Branch[] = [];
      if (form.id) {
        updated = branches.map((b) =>
          b.id === form.id ? { ...b, ...payload } : b
        );
      } else {
        const newBranch: Branch = {
          id: generateUUID(),
          ...payload,
          created_at: new Date().toISOString(),
        };
        updated = [newBranch, ...branches];
      }
      saveLocalData(updated);
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente remover esta filial?")) return;

    try {
      if (!dbError) {
        const { error } = await supabase.from("branches").delete().eq("id", id);
        if (error) throw error;
        fetchData();
      } else {
        const updated = branches.filter((b) => b.id !== id);
        saveLocalData(updated);
      }
      if (selectedBranchId === id) {
        handleSelectBranch(null);
      }
    } catch (error: any) {
      console.error("Erro ao excluir filial:", error);
      const updated = branches.filter((b) => b.id !== id);
      saveLocalData(updated);
      if (selectedBranchId === id) {
        handleSelectBranch(null);
      }
    }
  };

  const selectedBranch = branches.find((b) => b.id === selectedBranchId);

  const filteredBranches = branches.filter((b) => {
    const term = searchTerm.toLowerCase();
    return (
      (b.name || "").toLowerCase().includes(term) ||
      (b.cnpj || "").toLowerCase().includes(term) ||
      (b.city || "").toLowerCase().includes(term) ||
      (b.location || "").toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 pb-24 md:pb-8">
      {selectedBranch ? (
        /* VISTA DE DETALHES DA FILIAL COM 4 ABAS */
        <div className="space-y-6">
          {/* Header da Filial */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-app-border shadow-sm">
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleSelectBranch(null)}
                className="p-2.5 hover:bg-zinc-100 rounded-2xl text-zinc-600 transition-colors flex items-center gap-1.5 text-xs font-bold font-sans border border-zinc-200"
                title="Voltar para a lista de filiais"
              >
                <ArrowLeft size={18} />
                <span className="hidden sm:inline">Voltar para Filiais</span>
              </button>

              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 shrink-0">
                <Building2 size={26} />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-zinc-900 font-sans">
                    {selectedBranch.name}
                  </h1>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-sans ${
                      selectedBranch.active !== false
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                    }`}
                  >
                    {selectedBranch.active !== false ? "Ativa" : "Inativa"}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 font-sans mt-0.5">
                  {selectedBranch.city ? `${selectedBranch.city}${selectedBranch.state ? ` - ${selectedBranch.state}` : ''}` : 'Filial Selecionada'}
                  {selectedBranch.cnpj ? ` • CNPJ: ${selectedBranch.cnpj}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleEdit(selectedBranch)}
                className="h-10 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-xl transition-all flex items-center gap-2 font-sans border border-zinc-200"
              >
                <Edit2 size={16} />
                Editar Filial
              </button>
            </div>
          </div>

          {/* Abas de Navegação */}
          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-app-border shadow-sm overflow-x-auto">
            <button
              onClick={() => setBranchTab("cadastro")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap font-sans ${
                branchTab === "cadastro"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              <Building2 size={16} />
              1. Cadastro
            </button>

            <button
              onClick={() => setBranchTab("veiculos")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap font-sans ${
                branchTab === "veiculos"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              <Truck size={16} />
              2. Veículos
            </button>

            <button
              onClick={() => setBranchTab("motoristas")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap font-sans ${
                branchTab === "motoristas"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              <Users size={16} />
              3. Motoristas
            </button>

            <button
              onClick={() => setBranchTab("pendencias")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap font-sans ${
                branchTab === "pendencias"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              <AlertTriangle size={16} />
              4. Pendências
            </button>
          </div>

          {/* Conteúdo das Abas */}
          {branchTab === "cadastro" && (
            <div className="bg-white rounded-3xl p-6 border border-app-border shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-zinc-900 font-sans">
                    Informações de Cadastro da Filial
                  </h2>
                  <p className="text-xs text-zinc-500 font-sans">
                    Dados cadastrais, localização e informações gerais da unidade
                  </p>
                </div>

                <button
                  onClick={() => handleEdit(selectedBranch)}
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-2 font-sans"
                >
                  <Edit2 size={16} />
                  Editar Cadastro
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
                {/* Details Grid */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                      Nome da Filial / Unidade
                    </span>
                    <p className="text-sm font-bold text-zinc-800">
                      {selectedBranch.name}
                    </p>
                  </div>

                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                      Código Interno (ID)
                    </span>
                    <p className="text-xs font-mono font-bold text-zinc-700 break-all">
                      {selectedBranch.id}
                    </p>
                  </div>

                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                      CNPJ
                    </span>
                    <p className="text-sm font-bold text-zinc-800">
                      {selectedBranch.cnpj || "Não informado"}
                    </p>
                  </div>

                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                      CEP
                    </span>
                    <p className="text-sm font-bold text-zinc-800">
                      {selectedBranch.cep || "Não informado"}
                    </p>
                  </div>

                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                      Número do Endereço
                    </span>
                    <p className="text-sm font-bold text-zinc-800">
                      {selectedBranch.number || "Não informado"}
                    </p>
                  </div>

                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-1 sm:col-span-2">
                    <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                      Endereço / Bairro / Logradouro
                    </span>
                    <p className="text-sm font-bold text-zinc-800">
                      {selectedBranch.location || "Não informado"}
                    </p>
                  </div>

                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                      Cidade
                    </span>
                    <p className="text-sm font-bold text-zinc-800">
                      {selectedBranch.city || "Não informada"}
                    </p>
                  </div>

                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                      Estado (UF)
                    </span>
                    <p className="text-sm font-bold text-zinc-800">
                      {selectedBranch.state || "Não informado"}
                    </p>
                  </div>

                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                      Status
                    </span>
                    <div>
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          selectedBranch.active !== false
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                        }`}
                      >
                        {selectedBranch.active !== false ? "Ativa" : "Inativa"}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                      Telefone de Contato
                    </span>
                    <p className="text-sm font-bold text-zinc-800">
                      {selectedBranch.phone || "Não informado"}
                    </p>
                  </div>

                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 space-y-1 sm:col-span-2">
                    <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                      Gerente / Responsável
                    </span>
                    <p className="text-sm font-bold text-zinc-800">
                      {selectedBranch.manager || "Não informado"}
                    </p>
                  </div>
                </div>

                {/* Map View of Branch */}
                <div className="lg:col-span-1 flex flex-col space-y-2">
                  <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider px-1">
                    Localização no Mapa
                  </span>
                  <div className="flex-1 min-h-[280px]">
                    <BranchMap
                      branches={[selectedBranch]}
                      selectedBranchId={selectedBranch.id}
                      onSelectBranch={() => {}}
                      className="h-full min-h-[280px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {branchTab === "veiculos" && (
            <VehiclesTab branchId={selectedBranch.id} />
          )}

          {branchTab === "motoristas" && (
            <DriversTab branchId={selectedBranch.id} />
          )}

          {branchTab === "pendencias" && (
            <MaintenanceTab branchId={selectedBranch.id} />
          )}
        </div>
      ) : (
        /* LISTA PRINCIPAL DE FILIAIS */
        <>
          {/* Top Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-app-border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                <Building2 size={26} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-zinc-900 font-sans">
                  Cadastro de Filiais
                </h1>
                <p className="text-xs text-zinc-500 font-sans">
                  Gerencie as unidades, locais de operação e endereços da empresa
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {dbError && (
                <button
                  onClick={() => setShowSqlModal(true)}
                  className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-xl border border-amber-200 transition-colors flex items-center gap-1.5 font-sans"
                >
                  <AlertTriangle size={14} className="text-amber-600" />
                  Criar Tabela no DB
                </button>
              )}

              <button
                onClick={handleOpenAddModal}
                className="h-10 px-5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm font-sans"
              >
                <Plus size={16} />
                Nova Filial
              </button>
            </div>
          </div>

          {/* Database warning banner if missing table */}
          {dbError && (
            <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-amber-900 font-sans">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold">Modo de Operação Local: </span>
                  A tabela <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono">branches</code> ainda não está configurada no Supabase. Os dados estão sendo salvos normalmente nesta sessão.
                </div>
              </div>
              <button
                onClick={() => setShowSqlModal(true)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors shrink-0 font-sans"
              >
                Ver Comando SQL
              </button>
            </div>
          )}

          {/* Search Bar & View Mode Toggle */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white p-2 rounded-2xl border border-app-border shadow-sm">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                placeholder="Buscar por nome da filial, CNPJ, cidade ou endereço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans"
              />
            </div>

            <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl shrink-0 self-end sm:self-auto font-sans">
              <button
                type="button"
                onClick={() => setDisplayMode("ambos")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  displayMode === "ambos"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <Layers size={14} /> Mapa + Cards
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode("mapa")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  displayMode === "mapa"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <Map size={14} /> Mapa
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode("cards")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  displayMode === "cards"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <LayoutGrid size={14} /> Cards
              </button>
            </div>
          </div>

          {/* Interactive Branch Map */}
          {!loading && filteredBranches.length > 0 && displayMode !== "cards" && (
            <div className="animate-fade-in">
              <BranchMap
                branches={filteredBranches}
                selectedBranchId={selectedBranchId}
                onSelectBranch={(id) => handleSelectBranch(id)}
              />
            </div>
          )}

          {/* Branch List */}
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredBranches.length === 0 ? (
            <div className="bg-white border border-dashed border-zinc-200 rounded-3xl p-10 text-center flex flex-col items-center justify-center">
              <div className="p-4 bg-zinc-50 text-zinc-400 rounded-2xl mb-3">
                <Building2 size={36} />
              </div>
              <h3 className="text-sm font-bold text-zinc-800 font-sans">
                Nenhuma filial cadastrada
              </h3>
              <p className="text-xs text-zinc-500 max-w-sm mt-1 mb-4 font-sans">
                {searchTerm
                  ? "Nenhuma filial encontrada para os termos pesquisados."
                  : "Cadastre as unidades e filiais para organizar a frota e operações por localidade."}
              </p>
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors inline-flex items-center gap-2 font-sans"
              >
                <Plus size={16} />
                Cadastrar Primeira Filial
              </button>
            </div>
          ) : displayMode !== "mapa" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBranches.map((branch) => (
                <motion.div
                  key={branch.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => handleSelectBranch(branch.id)}
                  className="bg-white rounded-3xl p-5 border border-app-border shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Building size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-zinc-900 group-hover:text-blue-600 transition-colors font-sans line-clamp-1">
                            {branch.name}
                          </h3>
                          <span className="text-[11px] font-mono text-zinc-500">
                            {branch.cnpj ? `CNPJ: ${branch.cnpj}` : "Sem CNPJ"}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-sans ${
                          branch.active !== false
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                        }`}
                      >
                        {branch.active !== false ? "Ativa" : "Inativa"}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-zinc-100 text-xs text-zinc-600 font-sans">
                      {(branch.city || branch.state) && (
                        <div className="flex items-center gap-2 text-zinc-700 font-medium">
                          <MapPin size={14} className="text-blue-500 shrink-0" />
                          <span>
                            {branch.city}
                            {branch.state ? ` - ${branch.state}` : ""}
                            {branch.cep || branch.number ? ` (CEP: ${branch.cep || 'N/I'}${branch.number ? `, Nº ${branch.number}` : ''})` : ""}
                          </span>
                        </div>
                      )}

                      {branch.location && (
                        <p className="text-[11px] text-zinc-500 pl-5 line-clamp-2">
                          {branch.location}
                        </p>
                      )}

                      {branch.phone && (
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                          <Phone size={13} className="text-zinc-400 shrink-0" />
                          <span>{branch.phone}</span>
                        </div>
                      )}

                      {branch.manager && (
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                          <User size={13} className="text-zinc-400 shrink-0" />
                          <span>Resp: {branch.manager}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectBranch(branch.id);
                      }}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 font-sans"
                    >
                      <Building size={14} />
                      Ver Filial
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(branch);
                        }}
                        className="p-2 text-zinc-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                        title="Editar Filial"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(branch.id);
                        }}
                        className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        title="Excluir Filial"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : null}
        </>
      )}

      {/* Modal Add/Edit Branch */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-app-border space-y-5">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Building2 size={20} />
                </div>
                <h3 className="font-bold text-sm text-zinc-900 font-sans">
                  {form.id ? "Editar Filial" : "Cadastrar Nova Filial"}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-zinc-400 hover:text-zinc-600 rounded-xl hover:bg-zinc-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">
                  Nome da Filial / Unidade *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Matriz Goiânia, Filial São Paulo, Unidade BH"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={form.cnpj}
                    onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                    className="w-full h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">
                    CEP
                  </label>
                  <input
                    type="text"
                    placeholder="74000-000"
                    value={form.cep}
                    onChange={(e) => setForm({ ...form, cep: e.target.value })}
                    onBlur={handleCepBlur}
                    className="w-full h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">
                    Número do Endereço
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 1050 ou S/N"
                    value={form.number}
                    onChange={(e) => setForm({ ...form, number: e.target.value })}
                    className="w-full h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-zinc-700 mb-1">
                    Cidade (Localidade)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Goiânia"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">
                    UF (Estado)
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="GO"
                    value={form.state}
                    onChange={(e) =>
                      setForm({ ...form, state: e.target.value.toUpperCase() })
                    }
                    className="w-full h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">
                  Logradouro / Bairro / Endereço Completo
                </label>
                <input
                  type="text"
                  placeholder="Ex: Av. Anhanguera, Quadra 10, Lote 5 - Setor Oeste"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">
                    Telefone de Contato
                  </label>
                  <input
                    type="text"
                    placeholder="(62) 3000-0000"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-zinc-700 mb-1">
                    Gerente / Responsável
                  </label>
                  <input
                    type="text"
                    placeholder="Nome do gerente"
                    value={form.manager}
                    onChange={(e) =>
                      setForm({ ...form, manager: e.target.value })
                    }
                    className="w-full h-10 px-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Coordinates Section */}
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-800 text-xs flex items-center gap-1.5">
                    📍 Coordenadas Geográficas (Mapa)
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      const coords = await geocodeAddress(form.cep, form.number, form.location, form.city, form.state);
                      if (coords) {
                        setForm((prev) => ({ ...prev, lat: coords.lat, lng: coords.lng }));
                        alert(`Coordenadas localizadas: Lat ${coords.lat.toFixed(5)}, Lng ${coords.lng.toFixed(5)}`);
                      } else {
                        alert("Não foi possível encontrar as coordenadas exatas para esse endereço/CEP.");
                      }
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-sm hover:bg-blue-50 transition-colors"
                  >
                    🔍 Buscar Coordenadas Automáticas
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-zinc-600 mb-0.5 text-[11px]">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Ex: -16.6869"
                      value={form.lat ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, lat: e.target.value ? parseFloat(e.target.value) : undefined })
                      }
                      className="w-full h-9 px-3 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-zinc-600 mb-0.5 text-[11px]">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Ex: -49.2648"
                      value={form.lng ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, lng: e.target.value ? parseFloat(e.target.value) : undefined })
                      }
                      className="w-full h-9 px-3 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="branch_active_chk"
                  checked={form.active}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded border-zinc-300 focus:ring-blue-500"
                />
                <label
                  htmlFor="branch_active_chk"
                  className="text-xs font-semibold text-zinc-700 cursor-pointer"
                >
                  Filial ativa no sistema
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl transition-colors font-sans"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors font-sans flex items-center gap-2"
                >
                  {saving && (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  Salvar Filial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SQL Table Creation Modal */}
      {showSqlModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-app-border space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 size={20} className="text-blue-600" />
                <h3 className="font-bold text-sm text-zinc-900 font-sans">
                  Script SQL para Tabela Filiais
                </h3>
              </div>
              <button
                onClick={() => setShowSqlModal(false)}
                className="p-2 text-zinc-400 hover:text-zinc-600 rounded-xl hover:bg-zinc-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-zinc-600 font-sans">
              Copie o código abaixo e execute no <strong>SQL Editor do Supabase</strong> para habilitar o armazenamento permanente de filiais no banco de dados.
            </p>

            <div className="bg-zinc-900 text-amber-300 p-4 rounded-2xl font-mono text-[11px] overflow-x-auto relative">
              <pre>{sqlCreateScript}</pre>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(sqlCreateScript);
                  setCopiedSql(true);
                  setTimeout(() => setCopiedSql(false), 2500);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs rounded-xl transition-colors flex items-center gap-2 font-sans"
              >
                {copiedSql ? <Check size={16} /> : <Copy size={16} />}
                {copiedSql ? "Copiado!" : "Copiar Comando SQL"}
              </button>

              <button
                onClick={() => setShowSqlModal(false)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs rounded-xl transition-colors font-sans"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
