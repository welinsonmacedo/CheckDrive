import React, { useState, useEffect } from "react";
import {
  X,
  Check,
  Building2,
  MapPin,
  Users,
  Tag,
  Search,
  Compass,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  Phone,
  Mail,
  Briefcase,
} from "lucide-react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/modules/shared/contexts/AuthContext";

export interface SupplierContact {
  id: string;
  name: string;
  department: string;
  phone: string;
  email: string;
}

export const PRESET_SUPPLIER_CATEGORIES = [
  "Baterias",
  "Pneus",
  "Peças & Reposição",
  "Combustível & Arla",
  "Óleos & Lubrificantes",
  "Filtros",
  "Serviços & Manutenção",
  "Elétrica & Módulos",
  "Carrocerias & Implementos",
  "Lavagem & Estética",
  "Acessórios & EPIs",
  "Rastreamento & Telemetria",
  "Funilaria & Pintura",
  "Guincho & Socorro",
];

export const DEPARTMENT_OPTIONS = [
  "Financeiro",
  "Vendas",
  "Comercial",
  "Suporte / Pós-Venda",
  "Logística & Entrega",
  "Gerência / Diretoria",
  "Técnico / Oficina",
  "Outro",
];

async function geocodeAddress(
  cep: string,
  number: string,
  address: string,
  city: string,
  state: string
) {
  const cleanCep = cep.replace(/\D/g, "");
  const numStr = number.trim();
  const cleanStreet = address
    .replace(/(?:quadra|qd\.?|lote|lt\.?|bloco|bl\.?|apto|apt\.?)\s*\d+/gi, "")
    .replace(/(?:nº|n°|num|número|no\.?)\s*\d+/gi, "")
    .replace(/,\s*,/g, ",")
    .trim()
    .replace(/^,|,$/g, "");

  // 1. Nominatim Structured
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
          return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // 2. Nominatim Freeform
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
          return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
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

  return null;
}

export function SupplierModal({
  show,
  onClose,
  onSaved,
  supplierToEdit,
}: {
  show: boolean;
  onClose: () => void;
  onSaved: () => void;
  supplierToEdit?: any | null;
}) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"dados" | "endereco" | "contatos" | "categorias">("dados");

  const [form, setForm] = useState({
    name: "",
    cnpj_cpf: "",
    // Legacy primary
    contact_name: "",
    phone: "",
    email: "",
    // Address & Geolocation
    cep: "",
    address: "",
    number: "",
    bairro: "",
    city: "",
    state: "",
    latitude: "" as string | number,
    longitude: "" as string | number,
    // Multiple contacts
    contacts: [] as SupplierContact[],
    // Categories
    categories: [] as string[],
  });

  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");

  useEffect(() => {
    if (show) {
      if (supplierToEdit) {
        // Parse contacts
        let parsedContacts: SupplierContact[] = [];
        if (Array.isArray(supplierToEdit.contacts)) {
          parsedContacts = supplierToEdit.contacts;
        } else if (typeof supplierToEdit.contacts === "string" && supplierToEdit.contacts.trim()) {
          try {
            parsedContacts = JSON.parse(supplierToEdit.contacts);
          } catch (e) {
            parsedContacts = [];
          }
        }

        if (!parsedContacts || parsedContacts.length === 0) {
          if (supplierToEdit.contact_name || supplierToEdit.phone || supplierToEdit.email) {
            parsedContacts = [
              {
                id: "c1",
                name: supplierToEdit.contact_name || "",
                department: "Comercial / Geral",
                phone: supplierToEdit.phone || "",
                email: supplierToEdit.email || "",
              },
            ];
          } else {
            parsedContacts = [{ id: "c1", name: "", department: "Vendas", phone: "", email: "" }];
          }
        }

        // Parse categories
        let parsedCategories: string[] = [];
        if (Array.isArray(supplierToEdit.categories)) {
          parsedCategories = supplierToEdit.categories;
        } else if (typeof supplierToEdit.categories === "string" && supplierToEdit.categories.trim()) {
          try {
            const json = JSON.parse(supplierToEdit.categories);
            if (Array.isArray(json)) parsedCategories = json;
            else parsedCategories = supplierToEdit.categories.split(",").map((s: string) => s.trim());
          } catch (e) {
            parsedCategories = supplierToEdit.categories.split(",").map((s: string) => s.trim());
          }
        }

        setForm({
          name: supplierToEdit.name || "",
          cnpj_cpf: supplierToEdit.cnpj_cpf || "",
          contact_name: supplierToEdit.contact_name || "",
          phone: supplierToEdit.phone || "",
          email: supplierToEdit.email || "",
          cep: supplierToEdit.cep || "",
          address: supplierToEdit.address || supplierToEdit.location || "",
          number: supplierToEdit.number || "",
          bairro: supplierToEdit.bairro || "",
          city: supplierToEdit.city || "",
          state: supplierToEdit.state || "",
          latitude: supplierToEdit.latitude ?? supplierToEdit.lat ?? "",
          longitude: supplierToEdit.longitude ?? supplierToEdit.lng ?? "",
          contacts: parsedContacts,
          categories: parsedCategories,
        });
      } else {
        setForm({
          name: "",
          cnpj_cpf: "",
          contact_name: "",
          phone: "",
          email: "",
          cep: "",
          address: "",
          number: "",
          bairro: "",
          city: "",
          state: "",
          latitude: "",
          longitude: "",
          contacts: [{ id: "c1", name: "", department: "Vendas", phone: "", email: "" }],
          categories: [],
        });
      }
      setActiveTab("dados");
    }
  }, [show, supplierToEdit]);

  if (!show) return null;

  // CEP Lookup
  const handleCepSearch = async (cepVal?: string) => {
    const rawCep = cepVal !== undefined ? cepVal : form.cep;
    const cleanCep = rawCep.replace(/\D/g, "");
    if (cleanCep.length !== 8) return;

    setIsSearchingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        const newCity = data.localidade || form.city;
        const newState = data.uf || form.state;
        const newAddress = data.logradouro || form.address;
        const newBairro = data.bairro || form.bairro;

        const coords = await geocodeAddress(cleanCep, form.number, newAddress, newCity, newState);

        setForm((prev) => ({
          ...prev,
          cep: rawCep,
          city: newCity,
          state: newState,
          address: newAddress,
          bairro: newBairro,
          latitude: coords?.lat ?? prev.latitude,
          longitude: coords?.lng ?? prev.longitude,
        }));
      }
    } catch (err) {
      console.error("Erro ao consultar CEP:", err);
    } finally {
      setIsSearchingCep(false);
    }
  };

  // Recalculate Geocode Coordinates manually
  const handleGeocodeManual = async () => {
    setIsGeocoding(true);
    try {
      const coords = await geocodeAddress(form.cep, form.number, form.address, form.city, form.state);
      if (coords) {
        setForm((prev) => ({
          ...prev,
          latitude: coords.lat,
          longitude: coords.lng,
        }));
      } else {
        alert("Não foi possível determinar as coordenadas GPS exatas. Insira latitude/longitude manualmente se preferir.");
      }
    } catch (e) {
      console.error("Erro no geocodificador:", e);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Contact list helpers
  const handleAddContact = () => {
    setForm((prev) => ({
      ...prev,
      contacts: [
        ...prev.contacts,
        {
          id: `c_${Date.now()}`,
          name: "",
          department: "Vendas",
          phone: "",
          email: "",
        },
      ],
    }));
  };

  const handleRemoveContact = (id: string) => {
    setForm((prev) => ({
      ...prev,
      contacts: prev.contacts.filter((c) => c.id !== id),
    }));
  };

  const handleUpdateContact = (id: string, field: keyof SupplierContact, value: string) => {
    setForm((prev) => ({
      ...prev,
      contacts: prev.contacts.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    }));
  };

  // Category helpers
  const handleToggleCategory = (cat: string) => {
    setForm((prev) => {
      const exists = prev.categories.includes(cat);
      if (exists) {
        return { ...prev, categories: prev.categories.filter((c) => c !== cat) };
      } else {
        return { ...prev, categories: [...prev.categories, cat] };
      }
    });
  };

  const handleAddCustomCategory = () => {
    const val = customCategoryInput.trim();
    if (!val) return;
    if (!form.categories.includes(val)) {
      setForm((prev) => ({ ...prev, categories: [...prev.categories, val] }));
    }
    setCustomCategoryInput("");
  };

  // Save handler with resilient payload mapping
  const handleSave = async () => {
    if (!form.name.trim()) return;

    setIsSaving(true);
    try {
      const validContacts = form.contacts.filter(
        (c) => c.name.trim() || c.phone.trim() || c.email.trim()
      );

      const primaryContact = validContacts[0] || {
        name: form.contact_name,
        phone: form.phone,
        email: form.email,
      };

      const basePayload: any = {
        name: form.name.trim(),
        cnpj_cpf: form.cnpj_cpf.trim(),
        contact_name: primaryContact.name || form.contact_name || "",
        phone: primaryContact.phone || form.phone || "",
        email: primaryContact.email || form.email || "",
        cep: form.cep.trim(),
        address: form.address.trim(),
        location: form.address.trim(),
        number: form.number.trim(),
        bairro: form.bairro.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        latitude:
          form.latitude !== "" && form.latitude !== null && !isNaN(Number(form.latitude))
            ? parseFloat(String(form.latitude))
            : null,
        longitude:
          form.longitude !== "" && form.longitude !== null && !isNaN(Number(form.longitude))
            ? parseFloat(String(form.longitude))
            : null,
        contacts: validContacts,
        categories: form.categories,
        company_id: (user as any)?.company_id,
      };

      let payload = { ...basePayload };
      let saveError: any = null;
      let attempts = 0;

      while (attempts < 6) {
        attempts++;
        const res =
          supplierToEdit && supplierToEdit.id
            ? await supabase.from("inventory_suppliers").update(payload).eq("id", supplierToEdit.id)
            : await supabase.from("inventory_suppliers").insert(payload);

        if (!res.error) {
          saveError = null;
          break;
        }

        saveError = res.error;
        const errMsg = res.error.message || "";

        // If a column doesn't exist in Supabase schema, remove it and retry
        const matchCol = errMsg.match(/column "(.*?)" of relation "inventory_suppliers" does not exist/);
        if (matchCol && matchCol[1]) {
          delete payload[matchCol[1]];
          continue;
        }

        // Stringify JSON fields if table column is TEXT
        if (errMsg.includes("contacts") && typeof payload.contacts !== "string") {
          payload.contacts = JSON.stringify(validContacts);
          continue;
        }
        if (errMsg.includes("categories") && typeof payload.categories !== "string") {
          payload.categories = JSON.stringify(form.categories);
          continue;
        }

        break;
      }

      if (saveError) {
        console.error("Erro ao salvar fornecedor:", saveError);
        alert(`Erro ao salvar fornecedor: ${saveError.message}`);
      } else {
        onSaved();
      }
    } catch (err: any) {
      console.error("Erro ao processar dados:", err);
      alert("Erro inesperado ao salvar fornecedor.");
    } finally {
      setIsSaving(false);
    }
  };

  const hasGps = form.latitude !== "" && form.longitude !== "" && form.latitude !== null && form.longitude !== null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl flex flex-col max-h-[92vh] shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                {supplierToEdit ? "Editar Fornecedor" : "Novo Fornecedor"}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Cadastro de endereço com GPS, contatos e categorias
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/80 flex items-center justify-center text-slate-500 hover:bg-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 p-1 gap-1 text-xs font-bold overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("dados")}
            className={`flex-1 min-w-[110px] py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === "dados"
                ? "bg-white text-indigo-700 shadow-sm border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Building2 size={15} />
            <span>1. Dados Gerais</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("endereco")}
            className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === "endereco"
                ? "bg-white text-indigo-700 shadow-sm border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MapPin size={15} />
            <span>2. CEP & GPS</span>
            {hasGps && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("contatos")}
            className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === "contatos"
                ? "bg-white text-indigo-700 shadow-sm border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users size={15} />
            <span>3. Contatos ({form.contacts.filter((c) => c.name.trim() || c.phone.trim()).length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("categorias")}
            className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === "categorias"
                ? "bg-white text-indigo-700 shadow-sm border border-slate-200/80"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Tag size={15} />
            <span>4. Categorias ({form.categories.length})</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: DADOS GERAIS */}
          {activeTab === "dados" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nome Fantasia / Razão Social <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Auto Peças e Baterias Silva Ltda"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl h-10 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  CNPJ / CPF
                </label>
                <input
                  type="text"
                  value={form.cnpj_cpf}
                  onChange={(e) => setForm({ ...form, cnpj_cpf: e.target.value })}
                  placeholder="00.000.000/0001-00"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl h-10 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
                />
              </div>

              <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-2xl flex items-start gap-3">
                <Building2 size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-950 space-y-1">
                  <p className="font-bold">Informações Adicionais</p>
                  <p className="text-indigo-800 leading-relaxed">
                    Você pode cadastrar múltiplos contatos (Financeiro, Vendas, etc.), a localização GPS com CEP e as categorias de itens que este fornecedor atende.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ENDEREÇO & GEOLOCALIZAÇÃO */}
          {activeTab === "endereco" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    CEP
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={form.cep}
                      onChange={(e) => setForm({ ...form, cep: e.target.value })}
                      onBlur={() => handleCepSearch()}
                      placeholder="00000-000"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl h-10 pl-3 pr-9 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleCepSearch()}
                      disabled={isSearchingCep}
                      title="Buscar CEP no ViaCEP"
                      className="absolute right-2 top-2 text-indigo-600 hover:text-indigo-800 p-1"
                    >
                      {isSearchingCep ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Endereço / Logradouro
                  </label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="Rua, Avenida, Rodovia..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl h-10 px-3 text-sm font-medium text-slate-900 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Número
                  </label>
                  <input
                    type="text"
                    value={form.number}
                    onChange={(e) => setForm({ ...form, number: e.target.value })}
                    placeholder="100, Km 45, S/N"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl h-10 px-3 text-sm font-medium text-slate-900 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={form.bairro}
                    onChange={(e) => setForm({ ...form, bairro: e.target.value })}
                    placeholder="Centro, Industrial..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl h-10 px-3 text-sm font-medium text-slate-900 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Cidade / UF
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="Cidade"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl h-10 px-3 text-sm font-medium text-slate-900 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                    <input
                      type="text"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
                      placeholder="UF"
                      maxLength={2}
                      className="w-16 bg-slate-50 border border-slate-300 rounded-xl h-10 px-2 text-center text-sm font-bold text-slate-900 outline-none focus:border-indigo-500 focus:bg-white uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* GPS Coordinates Section */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Compass size={18} className="text-cyan-400" />
                    <span className="text-xs font-black uppercase text-slate-200">
                      Coordenadas de Localização (GPS)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleGeocodeManual}
                    disabled={isGeocoding}
                    className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {isGeocoding ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <MapPin size={14} />
                    )}
                    <span>Obter Coordenadas</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Latitude
                    </label>
                    <input
                      type="text"
                      value={form.latitude}
                      onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                      placeholder="-23.55052"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl h-9 px-3 text-xs font-mono font-bold text-cyan-300 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Longitude
                    </label>
                    <input
                      type="text"
                      value={form.longitude}
                      onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                      placeholder="-46.63330"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl h-9 px-3 text-xs font-mono font-bold text-cyan-300 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                </div>

                {hasGps && (
                  <div className="pt-2 flex justify-end">
                    <a
                      href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-cyan-300 hover:text-cyan-200 font-bold underline"
                    >
                      <span>Visualizar no Google Maps</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MÚLTIPLOS CONTATOS */}
          {activeTab === "contatos" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase">
                    Lista de Contatos do Fornecedor
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Cadastre Ana no Financeiro, Pedro nas Vendas, etc.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddContact}
                  className="bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus size={14} /> Novo Contato
                </button>
              </div>

              <div className="space-y-3">
                {form.contacts.map((contact, index) => (
                  <div
                    key={contact.id || index}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                        <Users size={14} className="text-indigo-600" /> Contato #{index + 1}
                      </span>
                      {form.contacts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveContact(contact.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition"
                          title="Remover Contato"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Nome do Contato
                        </label>
                        <input
                          type="text"
                          value={contact.name}
                          onChange={(e) => handleUpdateContact(contact.id, "name", e.target.value)}
                          placeholder="Ex: Ana Souza"
                          className="w-full bg-white border border-slate-300 rounded-xl h-9 px-3 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                          Setor / Departamento
                        </label>
                        <select
                          value={contact.department}
                          onChange={(e) =>
                            handleUpdateContact(contact.id, "department", e.target.value)
                          }
                          className="w-full bg-white border border-slate-300 rounded-xl h-9 px-3 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500"
                        >
                          {DEPARTMENT_OPTIONS.map((dep) => (
                            <option key={dep} value={dep}>
                              {dep}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
                          <Phone size={11} /> Telefone / WhatsApp
                        </label>
                        <input
                          type="text"
                          value={contact.phone}
                          onChange={(e) => handleUpdateContact(contact.id, "phone", e.target.value)}
                          placeholder="(11) 98888-7777"
                          className="w-full bg-white border border-slate-300 rounded-xl h-9 px-3 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
                          <Mail size={11} /> E-mail
                        </label>
                        <input
                          type="email"
                          value={contact.email}
                          onChange={(e) => handleUpdateContact(contact.id, "email", e.target.value)}
                          placeholder="ana.financeiro@empresa.com"
                          className="w-full bg-white border border-slate-300 rounded-xl h-9 px-3 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: CATEGORIAS ATENDIDAS */}
          {activeTab === "categorias" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase mb-1">
                  Categorias de Itens / Serviços Atendidos
                </h3>
                <p className="text-[11px] text-slate-500">
                  Selecione os produtos ou serviços que este fornecedor fornece para a frota:
                </p>
              </div>

              {/* Preset category chips */}
              <div className="flex flex-wrap gap-2">
                {PRESET_SUPPLIER_CATEGORIES.map((cat) => {
                  const selected = form.categories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleToggleCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer ${
                        selected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <Tag size={13} />
                      <span>{cat}</span>
                      {selected && <Check size={13} className="shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Custom category input */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Adicionar Outra Categoria Personalizada
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomCategory();
                      }
                    }}
                    placeholder="Ex: Tacógrafos, Extintores..."
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl h-10 px-3 text-xs font-semibold text-slate-900 outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomCategory}
                    className="bg-slate-800 hover:bg-slate-900 text-white px-4 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus size={15} /> Adicionar
                  </button>
                </div>
              </div>

              {/* Selected summary */}
              {form.categories.length > 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <span className="text-xs font-bold text-emerald-900 block mb-2">
                    Categorias Selecionadas ({form.categories.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {form.categories.map((cat) => (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold"
                      >
                        <span>{cat}</span>
                        <button
                          type="button"
                          onClick={() => handleToggleCategory(cat)}
                          className="hover:text-emerald-200 ml-0.5"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-medium hidden sm:block">
            {form.name ? (
              <span className="text-indigo-900 font-bold truncate max-w-[200px] inline-block">
                {form.name}
              </span>
            ) : (
              "Preencha a Razão Social para salvar"
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial h-10 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!form.name.trim() || isSaving}
              className="flex-1 sm:flex-initial h-10 px-5 bg-indigo-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 hover:bg-indigo-700 transition disabled:opacity-50 shadow-md cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Salvar Fornecedor</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

