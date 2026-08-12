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

// Category Color Palette & SVG Icons Mapping
export const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; label: string; iconSvg: string }> = {
  "Baterias": {
    bg: "#d97706", // Amber / Gold
    border: "#b45309",
    text: "#ffffff",
    label: "Baterias",
    iconSvg: `<path d="M16 2v2M8 2v2M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z"/><line x1="7" x2="11" y1="13" y2="13"/><line x1="9" x2="9" y1="11" y2="15"/><line x1="13" x2="17" y1="13" y2="13"/>`,
  },
  "Pneus": {
    bg: "#1e293b", // Slate / Dark
    border: "#0f172a",
    text: "#ffffff",
    label: "Pneus",
    iconSvg: `<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v5M12 16v5M3 12h5M16 12h5"/>`,
  },
  "Peças & Reposição": {
    bg: "#2563eb", // Royal Blue
    border: "#1d4ed8",
    text: "#ffffff",
    label: "Peças",
    iconSvg: `<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/>`,
  },
  "Combustível & Arla": {
    bg: "#dc2626", // Red
    border: "#b91c1c",
    text: "#ffffff",
    label: "Combustível",
    iconSvg: `<line x1="3" x2="15" y1="22" y2="22"/><path d="M4 9a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v13H4Z"/><path d="M6 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><line x1="4" x2="14" y1="13" y2="13"/><path d="M14 9a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2v0a2 2 0 0 0 2-2V9"/>`,
  },
  "Óleos & Lubrificantes": {
    bg: "#7c3aed", // Purple
    border: "#6d28d9",
    text: "#ffffff",
    label: "Lubrificantes",
    iconSvg: `<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7Z"/>`,
  },
  "Filtros": {
    bg: "#0284c7", // Sky/Cyan
    border: "#0369a1",
    text: "#ffffff",
    label: "Filtros",
    iconSvg: `<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>`,
  },
  "Serviços & Manutenção": {
    bg: "#059669", // Emerald
    border: "#047857",
    text: "#ffffff",
    label: "Manutenção",
    iconSvg: `<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>`,
  },
  "Elétrica & Módulos": {
    bg: "#ec4899", // Pink
    border: "#be185d",
    text: "#ffffff",
    label: "Elétrica",
    iconSvg: `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>`,
  },
  "Carrocerias & Implementos": {
    bg: "#475569", // Slate
    border: "#334155",
    text: "#ffffff",
    label: "Carrocerias",
    iconSvg: `<rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>`,
  },
  "Lavagem & Estética": {
    bg: "#06b6d4", // Cyan
    border: "#0891b2",
    text: "#ffffff",
    label: "Lavagem",
    iconSvg: `<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>`,
  },
  "Geral": {
    bg: "#4f46e5", // Indigo
    border: "#3730a3",
    text: "#ffffff",
    label: "Geral",
    iconSvg: `<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>`,
  },
};

export function getCategoryStyle(supplier: SupplierData) {
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

  const firstCat = categoriesList[0] || "Geral";
  const norm = firstCat.trim();

  if (CATEGORY_COLORS[norm]) return { catName: norm, ...CATEGORY_COLORS[norm] };

  const lower = norm.toLowerCase();
  if (lower.includes("bateri")) return { catName: "Baterias", ...CATEGORY_COLORS["Baterias"] };
  if (lower.includes("pneu")) return { catName: "Pneus", ...CATEGORY_COLORS["Pneus"] };
  if (lower.includes("peça") || lower.includes("peca")) return { catName: "Peças & Reposição", ...CATEGORY_COLORS["Peças & Reposição"] };
  if (lower.includes("combus") || lower.includes("arla") || lower.includes("posto")) return { catName: "Combustível & Arla", ...CATEGORY_COLORS["Combustível & Arla"] };
  if (lower.includes("óleo") || lower.includes("oleo") || lower.includes("lubrif")) return { catName: "Óleos & Lubrificantes", ...CATEGORY_COLORS["Óleos & Lubrificantes"] };
  if (lower.includes("filtr")) return { catName: "Filtros", ...CATEGORY_COLORS["Filtros"] };
  if (lower.includes("serviç") || lower.includes("servic") || lower.includes("manuten")) return { catName: "Serviços & Manutenção", ...CATEGORY_COLORS["Serviços & Manutenção"] };
  if (lower.includes("elétr") || lower.includes("eletr")) return { catName: "Elétrica & Módulos", ...CATEGORY_COLORS["Elétrica & Módulos"] };
  if (lower.includes("carroc") || lower.includes("implem")) return { catName: "Carrocerias & Implementos", ...CATEGORY_COLORS["Carrocerias & Implementos"] };
  if (lower.includes("lava") || lower.includes("estét")) return { catName: "Lavagem & Estética", ...CATEGORY_COLORS["Lavagem & Estética"] };

  // Fallback palette generator for any unknown category
  const palette = [
    { bg: "#4f46e5", border: "#3730a3" },
    { bg: "#0284c7", border: "#0369a1" },
    { bg: "#0d9488", border: "#0f766e" },
    { bg: "#16a34a", border: "#15803d" },
    { bg: "#d97706", border: "#b45309" },
    { bg: "#e11d48", border: "#be123c" },
    { bg: "#9333ea", border: "#7e22ce" },
  ];
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = norm.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % palette.length;
  return {
    catName: norm,
    bg: palette[idx].bg,
    border: palette[idx].border,
    text: "#ffffff",
    label: norm,
    iconSvg: CATEGORY_COLORS["Geral"].iconSvg,
  };
}

// Custom Marker Icon for Suppliers (Icon ONLY, colored by category)
function createSupplierMarkerIcon(supplier: SupplierData, isSelected: boolean = false): L.DivIcon {
  const style = getCategoryStyle(supplier);
  const size = isSelected ? 42 : 34;
  const borderSize = isSelected ? 4 : 3;
  const shadow = isSelected
    ? `0 0 0 6px ${style.bg}55, 0 8px 22px rgba(0,0,0,0.5)`
    : "0 6px 14px rgba(0,0,0,0.35)";

  const html = `
    <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; cursor: pointer;" title="${supplier.name} (${style.catName})">
      ${isSelected ? `
        <div style="
          position: absolute;
          inset: -6px;
          border-radius: 9999px;
          background-color: ${style.bg};
          opacity: 0.35;
          animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
      ` : ""}
      <div style="
        position: relative;
        width: ${size}px;
        height: ${size}px;
        border-radius: 9999px;
        background: ${style.bg};
        border: ${borderSize}px solid #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: ${shadow};
        transition: transform 0.2s ease;
      ">
        <svg width="${size - 16}" height="${size - 16}" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          ${style.iconSvg}
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-supplier-icon-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

// Custom Marker Icon for Branches (Icon ONLY, Gold/Amber)
function createBranchMarkerIcon(branch: BranchData, isSelected: boolean = false): L.DivIcon {
  const size = isSelected ? 42 : 34;
  const color = "#f59e0b"; // Gold/Amber
  const shadow = isSelected
    ? "0 0 0 6px rgba(251,191,36,0.45), 0 8px 22px rgba(0,0,0,0.5)"
    : "0 6px 14px rgba(0,0,0,0.35)";

  const html = `
    <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; cursor: pointer;" title="Filial: ${branch.name}">
      ${isSelected ? `
        <div style="
          position: absolute;
          inset: -6px;
          border-radius: 9999px;
          background-color: ${color};
          opacity: 0.35;
          animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
      ` : ""}
      <div style="
        position: relative;
        width: ${size}px;
        height: ${size}px;
        border-radius: 9999px;
        background: ${color};
        border: 3px solid #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: ${shadow};
      ">
        <svg width="${size - 16}" height="${size - 16}" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
          <path d="M9 22v-4h6v4"/>
          <path d="M8 6h.01"/>
          <path d="M16 6h.01"/>
          <path d="M12 6h.01"/>
          <path d="M12 10h.01"/>
          <path d="M12 14h.01"/>
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-branch-icon-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
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
                      <div
                        className="w-4 h-4 rounded-full shrink-0 mt-0.5 border border-white/20 flex items-center justify-center text-[8px] font-black"
                        style={{ backgroundColor: getCategoryStyle(supplier).bg }}
                      >
                        <Building2 size={10} className="text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-bold truncate text-slate-100">{supplier.name}</p>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">
                          {supplier.city || "Cidade N/A"} {supplier.state ? `- ${supplier.state}` : ""}
                        </p>
                        {cats.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {cats.slice(0, 2).map((c, i) => {
                              const style = getCategoryStyle({ ...supplier, categories: [c] });
                              return (
                                <span
                                  key={i}
                                  className="text-[9px] px-1.5 py-0.2 rounded font-bold text-white border border-white/10"
                                  style={{ backgroundColor: style.bg }}
                                >
                                  {c}
                                </span>
                              );
                            })}
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
      <div className="relative flex-1 h-full min-h-[380px] flex flex-col">
        {/* Always Visible Category Color Legend Bar */}
        <div className="bg-slate-900/95 border-b border-slate-800 p-2 z-[400] shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-bold text-white">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto scrollbar-thin scrollbar-thumb-slate-700 pb-1 sm:pb-0 pr-2">
            <span className="text-[10px] uppercase tracking-wider text-indigo-400 font-black shrink-0 flex items-center gap-1">
              <Compass size={13} /> Legenda de Cores:
            </span>

            {/* TODAS button */}
            <button
              type="button"
              onClick={() => setSelectedCategory("TODAS")}
              className={`px-2 py-0.5 rounded-lg border text-[10px] font-extrabold transition cursor-pointer shrink-0 ${
                selectedCategory === "TODAS"
                  ? "bg-indigo-600 border-indigo-400 text-white shadow-sm"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
              }`}
            >
              TODAS ({suppliers.length})
            </button>

            {/* Category Badges */}
            {Object.entries(CATEGORY_COLORS).map(([catKey, catVal]) => {
              const isSelected = selectedCategory === catKey;
              return (
                <button
                  key={catKey}
                  type="button"
                  onClick={() => setSelectedCategory(isSelected ? "TODAS" : catKey)}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-bold transition cursor-pointer shrink-0 ${
                    isSelected
                      ? "ring-2 ring-white scale-105 shadow-md"
                      : "opacity-85 hover:opacity-100"
                  }`}
                  style={{
                    backgroundColor: isSelected ? catVal.bg : `${catVal.bg}25`,
                    borderColor: catVal.bg,
                    color: "#ffffff",
                  }}
                  title={`Filtrar por ${catVal.label}`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/40"
                    style={{ backgroundColor: catVal.bg }}
                  />
                  <span>{catVal.label}</span>
                </button>
              );
            })}

            {/* Filiais Badge */}
            <button
              type="button"
              onClick={() => setShowBranches(!showBranches)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-bold transition cursor-pointer shrink-0 ${
                showBranches ? "ring-2 ring-amber-400 opacity-100 shadow-md" : "opacity-50"
              }`}
              style={{ backgroundColor: "#f59e0b33", borderColor: "#f59e0b", color: "#fcd34d" }}
              title="Ativar/Desativar exibição de Filiais"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 border border-white/40" />
              <span>Filiais</span>
            </button>
          </div>

          {/* Map Tile Style Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5 shrink-0 self-end sm:self-auto text-[10px]">
            <button
              type="button"
              onClick={() => setMapTileStyle("standard")}
              className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                mapTileStyle === "standard" ? "bg-indigo-600 text-white font-black" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Padrão
            </button>
            <button
              type="button"
              onClick={() => setMapTileStyle("satellite")}
              className={`px-2 py-0.5 rounded-md transition cursor-pointer ${
                mapTileStyle === "satellite" ? "bg-indigo-600 text-white font-black" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Satélite
            </button>
          </div>
        </div>

        {/* Map Container */}
        <div ref={mapContainerRef} className="w-full flex-1 min-h-[300px] bg-slate-900 relative" />

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
