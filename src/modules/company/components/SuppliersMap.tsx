import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import {
  Building2,
  MapPin,
  Building,
  Phone,
  Mail,
  Users,
  Tag,
  Search,
  Compass,
  ExternalLink,
  Layers,
  Filter,
  Check,
  Edit2,
  X,
  Maximize2,
  Minimize2,
  Navigation,
} from "lucide-react";

export interface SupplierData {
  id: string;
  company_id?: string;
  name: string;
  cnpj_cpf?: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  cep?: string;
  address?: string;
  location?: string;
  number?: string;
  bairro?: string;
  city?: string;
  state?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  contacts?: any;
  categories?: any;
}

export interface BranchData {
  id: string;
  company_id?: string;
  name: string;
  cnpj?: string;
  cep?: string;
  number?: string;
  location?: string;
  city?: string;
  state?: string;
  phone?: string;
  manager?: string;
  active?: boolean;
  lat?: number | string | null;
  lng?: number | string | null;
}

interface SuppliersMapProps {
  suppliers: SupplierData[];
  branches: BranchData[];
  onEditSupplier?: (supplier: SupplierData) => void;
  className?: string;
}

const STATE_CAPITALS: Record<string, { lat: number; lng: number }> = {
  GO: { lat: -16.6869, lng: -49.2648 },
  SP: { lat: -23.5505, lng: -46.6333 },
  RJ: { lat: -22.9068, lng: -43.1729 },
  DF: { lat: -15.7975, lng: -47.8919 },
  MG: { lat: -19.9167, lng: -43.9345 },
  BA: { lat: -12.9777, lng: -38.5016 },
  PR: { lat: -25.4284, lng: -49.2733 },
  CE: { lat: -3.7319, lng: -38.5267 },
  AM: { lat: -3.119, lng: -60.0217 },
  RS: { lat: -30.0346, lng: -51.2177 },
  PE: { lat: -8.0476, lng: -34.877 },
  PA: { lat: -1.4558, lng: -48.4902 },
  ES: { lat: -20.3155, lng: -40.3128 },
  MS: { lat: -20.4697, lng: -54.6201 },
  MT: { lat: -15.601, lng: -56.0979 },
  SC: { lat: -27.5954, lng: -48.548 },
  PB: { lat: -7.1195, lng: -34.845 },
  AL: { lat: -9.6658, lng: -35.735 },
  RN: { lat: -5.7945, lng: -35.211 },
  TO: { lat: -10.2491, lng: -48.3243 },
  PI: { lat: -5.092, lng: -42.8038 },
  SE: { lat: -10.9472, lng: -37.0731 },
  RR: { lat: 2.8235, lng: -60.6758 },
  AP: { lat: 0.035, lng: -51.0705 },
  RO: { lat: -8.7619, lng: -63.9039 },
  AC: { lat: -9.9754, lng: -67.8249 },
  MA: { lat: -2.5307, lng: -44.3068 },
};

const MAJOR_CITIES: Record<string, { lat: number; lng: number }> = {
  goiânia: { lat: -16.6869, lng: -49.2648 },
  anápolis: { lat: -16.3267, lng: -48.9534 },
  "aparecida de goiânia": { lat: -16.8231, lng: -49.2439 },
  "rio verde": { lat: -17.7925, lng: -50.9189 },
  itumbiara: { lat: -18.4194, lng: -49.2153 },
  "são paulo": { lat: -23.5505, lng: -46.6333 },
  campinas: { lat: -22.9099, lng: -47.0626 },
  santos: { lat: -23.9608, lng: -46.3339 },
  "ribeirão preto": { lat: -21.1704, lng: -47.8103 },
  "são josé dos campos": { lat: -23.1896, lng: -45.8841 },
  sorocaba: { lat: -23.5015, lng: -47.4581 },
  uberlândia: { lat: -18.9186, lng: -48.2772 },
  "juiz de fora": { lat: -21.7662, lng: -43.3503 },
  "montes claros": { lat: -16.7281, lng: -43.8578 },
  maringá: { lat: -23.4209, lng: -51.9331 },
  londrina: { lat: -23.3045, lng: -51.1696 },
  cascavel: { lat: -24.9578, lng: -53.4595 },
  joinville: { lat: -26.3044, lng: -48.8464 },
  blumenau: { lat: -26.9194, lng: -49.0661 },
  chapecó: { lat: -27.1004, lng: -52.6152 },
  "caxias do sul": { lat: -29.1681, lng: -51.1794 },
  pelotas: { lat: -31.7654, lng: -52.3376 },
  "feira de santana": { lat: -12.2664, lng: -38.9663 },
  "vitória da conquista": { lat: -14.8661, lng: -40.8394 },
  caruaru: { lat: -8.2828, lng: -35.9761 },
  petrolina: { lat: -9.3891, lng: -40.5028 },
};

function getSupplierCoords(supplier: SupplierData, index: number): { lat: number; lng: number } {
  const latVal = supplier.latitude;
  const lngVal = supplier.longitude;

  if (latVal !== undefined && latVal !== null && lngVal !== undefined && lngVal !== null) {
    const latNum = typeof latVal === "string" ? parseFloat(latVal) : Number(latVal);
    const lngNum = typeof lngVal === "string" ? parseFloat(lngVal) : Number(lngVal);
    if (!isNaN(latNum) && !isNaN(lngNum) && isFinite(latNum) && isFinite(lngNum) && (latNum !== 0 || lngNum !== 0)) {
      return { lat: latNum, lng: lngNum };
    }
  }

  const cityKey = (supplier.city || "").toLowerCase().trim();
  const stateKey = (supplier.state || "").toUpperCase().trim();

  let baseCoords = { lat: -15.7975, lng: -47.8919 }; // Default Brasilia

  if (cityKey && MAJOR_CITIES[cityKey]) {
    baseCoords = MAJOR_CITIES[cityKey];
  } else if (stateKey && STATE_CAPITALS[stateKey]) {
    baseCoords = STATE_CAPITALS[stateKey];
  }

  // Offset deterministic for stacked markers
  const angle = (index * 137.5 * Math.PI) / 180;
  const radius = index === 0 ? 0 : 0.012 + (index % 6) * 0.007;
  return {
    lat: baseCoords.lat + Math.sin(angle) * radius,
    lng: baseCoords.lng + Math.cos(angle) * radius,
  };
}

function getBranchCoords(branch: BranchData, index: number): { lat: number; lng: number } {
  const latVal = branch.lat;
  const lngVal = branch.lng;

  if (latVal !== undefined && latVal !== null && lngVal !== undefined && lngVal !== null) {
    const latNum = typeof latVal === "string" ? parseFloat(latVal) : Number(latVal);
    const lngNum = typeof lngVal === "string" ? parseFloat(lngVal) : Number(lngVal);
    if (!isNaN(latNum) && !isNaN(lngNum) && isFinite(latNum) && isFinite(lngNum) && (latNum !== 0 || lngNum !== 0)) {
      return { lat: latNum, lng: lngNum };
    }
  }

  const cityKey = (branch.city || "").toLowerCase().trim();
  const stateKey = (branch.state || "").toUpperCase().trim();

  let baseCoords = { lat: -15.7975, lng: -47.8919 };

  if (cityKey && MAJOR_CITIES[cityKey]) {
    baseCoords = MAJOR_CITIES[cityKey];
  } else if (stateKey && STATE_CAPITALS[stateKey]) {
    baseCoords = STATE_CAPITALS[stateKey];
  }

  const angle = (index * 137.5 * Math.PI) / 180;
  const radius = index === 0 ? 0 : 0.01 + (index % 4) * 0.006;
  return {
    lat: baseCoords.lat + Math.sin(angle) * radius,
    lng: baseCoords.lng + Math.cos(angle) * radius,
  };
}

// Distance helper
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Custom Marker Icons
function createSupplierMarkerIcon(supplier: SupplierData, isSelected: boolean = false): L.DivIcon {
  const color = isSelected ? "#4f46e5" : "#6366f1"; // Indigo
  const bgBadge = isSelected ? "#312e81" : "#1e1b4b";

  let categoriesList: string[] = [];
  if (Array.isArray(supplier.categories)) {
    categoriesList = supplier.categories;
  } else if (typeof supplier.categories === "string" && supplier.categories.trim()) {
    try {
      const parsed = JSON.parse(supplier.categories);
      if (Array.isArray(parsed)) categoriesList = parsed;
    } catch (e) {
      categoriesList = supplier.categories.split(",").map((s) => s.trim());
    }
  }

  const firstCat = categoriesList[0] || "Fornecedor";

  const html = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
      <div style="
        background: ${bgBadge};
        color: #ffffff;
        font-size: 11px;
        font-weight: 800;
        padding: 3px 8px;
        border-radius: 8px;
        border: 1.5px solid ${color};
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
        margin-bottom: 4px;
        font-family: system-ui, -apple-system, sans-serif;
        display: flex;
        align-items: center;
        gap: 4px;
      ">
        <span style="display: inline-block; width: 6px; height: 6px; border-radius: 9999px; background-color: #818cf8;"></span>
        ${supplier.name}
        <span style="font-size: 9px; opacity: 0.8; font-weight: 600; padding-left: 2px;">(${firstCat})</span>
      </div>

      <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
        <div style="
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          background-color: ${color};
          opacity: 0.25;
          animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
        <div style="
          position: relative;
          width: 30px;
          height: 30px;
          border-radius: 9999px;
          background: #ffffff;
          border: 3px solid ${color};
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 14px rgba(0,0,0,0.25);
        ">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
            <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
            <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
            <path d="M10 6h4"/>
            <path d="M10 10h4"/>
            <path d="M10 14h4"/>
            <path d="M10 18h4"/>
          </svg>
        </div>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-supplier-marker",
    iconSize: [160, 60],
    iconAnchor: [80, 56],
    popupAnchor: [0, -56],
  });
}

function createBranchMarkerIcon(branch: BranchData, isSelected: boolean = false): L.DivIcon {
  const color = isSelected ? "#d97706" : "#f59e0b"; // Amber/Gold
  const bgBadge = isSelected ? "#78350f" : "#451a03";

  const html = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
      <div style="
        background: ${bgBadge};
        color: #ffffff;
        font-size: 11px;
        font-weight: 800;
        padding: 3px 8px;
        border-radius: 8px;
        border: 1.5px solid ${color};
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
        margin-bottom: 4px;
        font-family: system-ui, -apple-system, sans-serif;
        display: flex;
        align-items: center;
        gap: 4px;
      ">
        <span style="display: inline-block; width: 6px; height: 6px; border-radius: 9999px; background-color: #fbbf24;"></span>
        FILIAL: ${branch.name}
      </div>

      <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
        <div style="
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          background-color: ${color};
          opacity: 0.25;
          animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
        <div style="
          position: relative;
          width: 30px;
          height: 30px;
          border-radius: 9999px;
          background: #ffffff;
          border: 3px solid ${color};
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 14px rgba(0,0,0,0.25);
        ">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
            <path d="M9 22v-4h6v4"/>
            <path d="M8 6h.01"/>
            <path d="M16 6h.01"/>
            <path d="M12 6h.01"/>
            <path d="M12 10h.01"/>
            <path d="M12 14h.01"/>
            <path d="M16 10h.01"/>
            <path d="M16 14h.01"/>
            <path d="M8 10h.01"/>
            <path d="M8 14h.01"/>
          </svg>
        </div>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-branch-marker",
    iconSize: [160, 60],
    iconAnchor: [80, 56],
    popupAnchor: [0, -56],
  });
}

export default function SuppliersMap({
  suppliers,
  branches,
  onEditSupplier,
  className = "",
}: SuppliersMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  const [selectedCategory, setSelectedCategory] = useState<string>("TODAS");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showSuppliers, setShowSuppliers] = useState<boolean>(true);
  const [showBranches, setShowBranches] = useState<boolean>(true);
  const [mapTileStyle, setMapTileStyle] = useState<"standard" | "satellite">("standard");
  const [selectedItem, setSelectedItem] = useState<{ type: "supplier" | "branch"; data: any; coords: { lat: number; lng: number } } | null>(null);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Extract all unique categories present in suppliers
  const allCategories = React.useMemo(() => {
    const catsSet = new Set<string>();
    suppliers.forEach((sup) => {
      let list: string[] = [];
      if (Array.isArray(sup.categories)) {
        list = sup.categories;
      } else if (typeof sup.categories === "string" && sup.categories.trim()) {
        try {
          const json = JSON.parse(sup.categories);
          if (Array.isArray(json)) list = json;
          else list = sup.categories.split(",").map((s) => s.trim());
        } catch (e) {
          list = sup.categories.split(",").map((s) => s.trim());
        }
      }
      list.forEach((c) => {
        if (c && c.trim()) catsSet.add(c.trim());
      });
    });
    return Array.from(catsSet).sort();
  }, [suppliers]);

  // Filtered suppliers
  const filteredSuppliers = React.useMemo(() => {
    if (!showSuppliers) return [];
    return suppliers.filter((sup) => {
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const nameMatch = sup.name?.toLowerCase().includes(term);
        const cnpjMatch = sup.cnpj_cpf?.toLowerCase().includes(term);
        const cityMatch =
          sup.city?.toLowerCase().includes(term) ||
          sup.address?.toLowerCase().includes(term) ||
          sup.location?.toLowerCase().includes(term);

        if (!nameMatch && !cnpjMatch && !cityMatch) return false;
      }

      // Category filter
      if (selectedCategory !== "TODAS") {
        let list: string[] = [];
        if (Array.isArray(sup.categories)) {
          list = sup.categories;
        } else if (typeof sup.categories === "string" && sup.categories.trim()) {
          try {
            const json = JSON.parse(sup.categories);
            if (Array.isArray(json)) list = json;
            else list = sup.categories.split(",").map((s) => s.trim());
          } catch (e) {
            list = sup.categories.split(",").map((s) => s.trim());
          }
        }
        if (!list.includes(selectedCategory)) return false;
      }

      return true;
    });
  }, [suppliers, showSuppliers, selectedCategory, searchTerm]);

  // Filtered branches
  const filteredBranches = React.useMemo(() => {
    if (!showBranches) return [];
    if (!searchTerm.trim()) return branches;
    const term = searchTerm.toLowerCase().trim();
    return branches.filter((b) => {
      return (
        b.name?.toLowerCase().includes(term) ||
        b.city?.toLowerCase().includes(term) ||
        b.location?.toLowerCase().includes(term) ||
        b.cnpj?.toLowerCase().includes(term)
      );
    });
  }, [branches, showBranches, searchTerm]);

  // Initialize & Update Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialMap = L.map(mapContainerRef.current, {
        center: [-15.7975, -47.8919], // Brasilia
        zoom: 5,
        zoomControl: false,
      });

      L.control.zoom({ position: "bottomright" }).addTo(initialMap);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(initialMap);

      mapInstanceRef.current = initialMap;
    }

    const map = mapInstanceRef.current;

    // Update tile layer if changed
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    if (mapTileStyle === "satellite") {
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
          maxZoom: 18,
        }
      ).addTo(map);
    } else {
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
    }

    // Clear previous markers
    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    const bounds = L.latLngBounds([]);

    // Add Branches
    filteredBranches.forEach((branch, idx) => {
      const coords = getBranchCoords(branch, idx);
      bounds.extend([coords.lat, coords.lng]);

      const isSelected = selectedItem?.type === "branch" && selectedItem.data.id === branch.id;
      const icon = createBranchMarkerIcon(branch, isSelected);

      const marker = L.marker([coords.lat, coords.lng], { icon }).addTo(map);

      marker.on("click", () => {
        setSelectedItem({ type: "branch", data: branch, coords });
        map.flyTo([coords.lat, coords.lng], 13, { duration: 1.2 });
      });

      markersRef.current[`branch_${branch.id}`] = marker;
    });

    // Add Suppliers
    filteredSuppliers.forEach((supplier, idx) => {
      const coords = getSupplierCoords(supplier, idx);
      bounds.extend([coords.lat, coords.lng]);

      const isSelected = selectedItem?.type === "supplier" && selectedItem.data.id === supplier.id;
      const icon = createSupplierMarkerIcon(supplier, isSelected);

      const marker = L.marker([coords.lat, coords.lng], { icon }).addTo(map);

      marker.on("click", () => {
        setSelectedItem({ type: "supplier", data: supplier, coords });
        map.flyTo([coords.lat, coords.lng], 13, { duration: 1.2 });
      });

      markersRef.current[`supplier_${supplier.id}`] = marker;
    });

    // Fit bounds if we have points
    if (bounds.isValid() && (filteredBranches.length > 0 || filteredSuppliers.length > 0)) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [filteredSuppliers, filteredBranches, mapTileStyle, selectedCategory]);

  // Focus single item
  const handleFocusItem = (type: "supplier" | "branch", item: any, index: number) => {
    const coords = type === "supplier" ? getSupplierCoords(item, index) : getBranchCoords(item, index);
    setSelectedItem({ type, data: item, coords });
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([coords.lat, coords.lng], 14, { duration: 1.2 });
    }
  };

  // Find distance to closest filial
  const getNearestBranchInfo = (supplierCoords: { lat: number; lng: number }) => {
    if (!branches || branches.length === 0) return null;
    let closest: { branch: BranchData; distKm: number } | null = null;

    branches.forEach((b, idx) => {
      const bCoords = getBranchCoords(b, idx);
      const dist = calculateDistanceKm(supplierCoords.lat, supplierCoords.lng, bCoords.lat, bCoords.lng);
      if (!closest || dist < closest.distKm) {
        closest = { branch: b, distKm: dist };
      }
    });

    return closest;
  };

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-xl flex flex-col md:flex-row transition-all duration-300 ${
        isExpanded ? "fixed inset-2 z-[9999] h-[calc(100vh-16px)]" : "h-[650px]"
      } ${className}`}
    >
      {/* Sidebar Controls & List */}
      <div className="w-full md:w-80 bg-slate-950 text-slate-100 flex flex-col shrink-0 border-b md:border-b-0 md:border-r border-slate-800 z-10 max-h-[300px] md:max-h-none overflow-hidden">
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-slate-800 bg-slate-900/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="text-indigo-400 shrink-0" size={18} />
              <h2 className="text-xs font-black text-white uppercase tracking-wider">
                Mapa de Fornecedores & Filiais
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title={isExpanded ? "Minimizar" : "Expandir Mapa"}
            >
              {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 text-slate-500" size={14} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar fornecedor, cidade, filial..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl h-8 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-2 text-slate-500 hover:text-slate-300"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
              <Filter size={11} className="text-indigo-400" /> Filtrar por Categoria
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl h-8 px-2 text-xs font-bold text-indigo-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="TODAS">TODAS AS CATEGORIAS ({suppliers.length})</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Layer Checkboxes */}
          <div className="flex items-center gap-3 pt-1 text-[11px] font-bold">
            <label className="flex items-center gap-1.5 cursor-pointer text-indigo-300 hover:text-white transition">
              <input
                type="checkbox"
                checked={showSuppliers}
                onChange={(e) => setShowSuppliers(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0"
              />
              <span>Fornecedores ({filteredSuppliers.length})</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-amber-300 hover:text-white transition">
              <input
                type="checkbox"
                checked={showBranches}
                onChange={(e) => setShowBranches(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0"
              />
              <span>Filiais ({filteredBranches.length})</span>
            </label>
          </div>
        </div>

        {/* List Items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {/* Filiais section */}
          {showBranches && filteredBranches.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider px-2 block">
                Filiais ({filteredBranches.length})
              </span>
              {filteredBranches.map((branch, idx) => {
                const isSelected = selectedItem?.type === "branch" && selectedItem.data.id === branch.id;
                return (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => handleFocusItem("branch", branch, idx)}
                    className={`w-full text-left p-2 rounded-xl transition flex items-start gap-2 text-xs border ${
                      isSelected
                        ? "bg-amber-950/60 border-amber-500/80 text-white"
                        : "bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/80"
                    }`}
                  >
                    <Building size={14} className="text-amber-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold truncate text-slate-100">{branch.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {branch.city || "Cidade N/A"} {branch.state ? `- ${branch.state}` : ""}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Suppliers section */}
          {showSuppliers && (
            <div className="space-y-1 pt-1">
              <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider px-2 block">
                Fornecedores ({filteredSuppliers.length})
              </span>
              {filteredSuppliers.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl">
                  Nenhum fornecedor encontrado nesta categoria
                </div>
              ) : (
                filteredSuppliers.map((supplier, idx) => {
                  const isSelected = selectedItem?.type === "supplier" && selectedItem.data.id === supplier.id;
                  
                  let cats: string[] = [];
                  if (Array.isArray(supplier.categories)) cats = supplier.categories;
                  else if (typeof supplier.categories === "string" && supplier.categories.trim()) {
                    try {
                      cats = JSON.parse(supplier.categories);
                    } catch (e) {
                      cats = supplier.categories.split(",").map((s) => s.trim());
                    }
                  }

                  return (
                    <button
                      key={supplier.id}
                      type="button"
                      onClick={() => handleFocusItem("supplier", supplier, idx)}
                      className={`w-full text-left p-2 rounded-xl transition flex items-start gap-2 text-xs border ${
                        isSelected
                          ? "bg-indigo-950/80 border-indigo-500 text-white"
                          : "bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/80"
                      }`}
                    >
                      <Building2 size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-bold truncate text-slate-100">{supplier.name}</p>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">
                          {supplier.city || "Cidade N/A"} {supplier.state ? `- ${supplier.state}` : ""}
                        </p>
                        {cats.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {cats.slice(0, 2).map((c, i) => (
                              <span
                                key={i}
                                className="text-[9px] bg-indigo-950 text-indigo-300 border border-indigo-800/60 px-1.5 py-0.2 rounded font-semibold"
                              >
                                {c}
                              </span>
                            ))}
                            {cats.length > 2 && (
                              <span className="text-[9px] text-slate-500 font-semibold">
                                +{cats.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Map Canvas */}
      <div className="relative flex-1 h-full min-h-[350px]">
        {/* Tile Toggle Control */}
        <div className="absolute top-3 right-3 z-[400] flex items-center gap-1 bg-slate-900/90 border border-slate-700 backdrop-blur-md rounded-xl p-1 shadow-lg text-[10px] font-bold text-white">
          <button
            type="button"
            onClick={() => setMapTileStyle("standard")}
            className={`px-2 py-1 rounded-lg transition ${
              mapTileStyle === "standard" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Padrão
          </button>
          <button
            type="button"
            onClick={() => setMapTileStyle("satellite")}
            className={`px-2 py-1 rounded-lg transition ${
              mapTileStyle === "satellite" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Satélite
          </button>
        </div>

        {/* Map Container */}
        <div ref={mapContainerRef} className="w-full h-full bg-slate-900" />

        {/* Selected Item Drawer / Card Overlay */}
        {selectedItem && (
          <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-96 z-[450] bg-slate-900/95 border border-slate-700/80 backdrop-blur-md text-white rounded-2xl p-4 shadow-2xl space-y-3 max-h-[380px] overflow-y-auto animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-start justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                {selectedItem.type === "supplier" ? (
                  <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
                    <Building2 size={16} />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-amber-600/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
                    <Building size={16} />
                  </div>
                )}
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    {selectedItem.type === "supplier" ? "Fornecedor" : "Filial da Empresa"}
                  </span>
                  <h3 className="text-sm font-extrabold text-white leading-tight">
                    {selectedItem.data.name}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Address */}
            <div className="space-y-1 text-xs text-slate-300">
              <div className="flex items-start gap-1.5">
                <MapPin size={14} className="text-rose-400 shrink-0 mt-0.5" />
                <span>
                  {[
                    selectedItem.data.address || selectedItem.data.location,
                    selectedItem.data.number ? `nº ${selectedItem.data.number}` : "",
                    selectedItem.data.bairro,
                    selectedItem.data.city && selectedItem.data.state
                      ? `${selectedItem.data.city} - ${selectedItem.data.state}`
                      : selectedItem.data.city || selectedItem.data.state,
                    selectedItem.data.cep ? `CEP: ${selectedItem.data.cep}` : "",
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </div>
            </div>

            {/* Distance to Nearest Filial if Supplier */}
            {selectedItem.type === "supplier" && (() => {
              const nearest = getNearestBranchInfo(selectedItem.coords);
              if (!nearest) return null;
              return (
                <div className="p-2 bg-indigo-950/60 border border-indigo-800/60 rounded-xl flex items-center justify-between text-xs text-indigo-200">
                  <div className="flex items-center gap-1.5">
                    <Navigation size={13} className="text-indigo-400" />
                    <span>Próximo da Filial <strong>{nearest.branch.name}</strong></span>
                  </div>
                  <span className="font-mono font-bold text-indigo-300">{nearest.distKm} km</span>
                </div>
              );
            })()}

            {/* Categories if Supplier */}
            {selectedItem.type === "supplier" && (() => {
              let catsList: string[] = [];
              if (Array.isArray(selectedItem.data.categories)) catsList = selectedItem.data.categories;
              else if (typeof selectedItem.data.categories === "string" && selectedItem.data.categories.trim()) {
                try {
                  catsList = JSON.parse(selectedItem.data.categories);
                } catch (e) {
                  catsList = selectedItem.data.categories.split(",").map((s) => s.trim());
                }
              }
              if (catsList.length === 0) return null;
              return (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <Tag size={11} /> Categorias Atendidas
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {catsList.map((c, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-bold bg-indigo-900/80 text-indigo-200 border border-indigo-700/60 px-2 py-0.5 rounded-md"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Contacts list */}
            {selectedItem.type === "supplier" && (() => {
              let cList: any[] = [];
              if (Array.isArray(selectedItem.data.contacts)) cList = selectedItem.data.contacts;
              else if (typeof selectedItem.data.contacts === "string" && selectedItem.data.contacts.trim()) {
                try {
                  cList = JSON.parse(selectedItem.data.contacts);
                } catch (e) {}
              }
              if (cList.length === 0 && (selectedItem.data.contact_name || selectedItem.data.phone || selectedItem.data.email)) {
                cList = [
                  {
                    name: selectedItem.data.contact_name,
                    department: "Geral",
                    phone: selectedItem.data.phone,
                    email: selectedItem.data.email,
                  },
                ];
              }
              if (cList.length === 0) return null;
              return (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    <Users size={11} /> Contatos ({cList.length})
                  </span>
                  <div className="space-y-1">
                    {cList.map((ct, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-xs space-y-0.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200">{ct.name || "Contato"}</span>
                          {ct.department && (
                            <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-bold uppercase">
                              {ct.department}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                          {ct.phone && (
                            <a
                              href={`tel:${ct.phone.replace(/\D/g, "")}`}
                              className="text-indigo-400 hover:underline flex items-center gap-1 font-mono"
                            >
                              <Phone size={10} /> {ct.phone}
                            </a>
                          )}
                          {ct.email && (
                            <a
                              href={`mailto:${ct.email}`}
                              className="text-slate-400 hover:underline flex items-center gap-1 truncate"
                            >
                              <Mail size={10} /> {ct.email}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Actions */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
              <a
                href={`https://www.google.com/maps?q=${selectedItem.coords.lat},${selectedItem.coords.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition"
              >
                <span>Google Maps</span>
                <ExternalLink size={12} />
              </a>

              {selectedItem.type === "supplier" && onEditSupplier && (
                <button
                  type="button"
                  onClick={() => {
                    onEditSupplier(selectedItem.data);
                  }}
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition shadow-sm"
                >
                  <Edit2 size={12} />
                  <span>Editar Fornecedor</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
