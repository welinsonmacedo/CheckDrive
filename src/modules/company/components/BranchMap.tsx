import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { Branch } from "./BranchesTab";
import { Building2, MapPin, Building, Phone, User, ExternalLink, Maximize2, Minimize2, Layers } from "lucide-react";

interface BranchMapProps {
  branches: Branch[];
  selectedBranchId?: string | null;
  onSelectBranch: (branchId: string) => void;
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
  "goiânia": { lat: -16.6869, lng: -49.2648 },
  "anápolis": { lat: -16.3267, lng: -48.9534 },
  "aparecida de goiânia": { lat: -16.8231, lng: -49.2439 },
  "rio verde": { lat: -17.7925, lng: -50.9189 },
  "itumbiara": { lat: -18.4194, lng: -49.2153 },
  "são paulo": { lat: -23.5505, lng: -46.6333 },
  "campinas": { lat: -22.9099, lng: -47.0626 },
  "santos": { lat: -23.9608, lng: -46.3339 },
  "ribeirão preto": { lat: -21.1704, lng: -47.8103 },
  "são josé dos campos": { lat: -23.1896, lng: -45.8841 },
  "sorocaba": { lat: -23.5015, lng: -47.4581 },
  "uberlândia": { lat: -18.9186, lng: -48.2772 },
  "juiz de fora": { lat: -21.7662, lng: -43.3503 },
  "montes claros": { lat: -16.7281, lng: -43.8578 },
  "maringá": { lat: -23.4209, lng: -51.9331 },
  "londrina": { lat: -23.3045, lng: -51.1696 },
  "cascavel": { lat: -24.9578, lng: -53.4595 },
  "joinville": { lat: -26.3044, lng: -48.8464 },
  "blumenau": { lat: -26.9194, lng: -49.0661 },
  "chapecó": { lat: -27.1004, lng: -52.6152 },
  "caxias do sul": { lat: -29.1681, lng: -51.1794 },
  "pelotas": { lat: -31.7654, lng: -52.3376 },
  "feira de santana": { lat: -12.2664, lng: -38.9663 },
  "vitória da conquista": { lat: -14.8661, lng: -40.8394 },
  "caruaru": { lat: -8.2828, lng: -35.9761 },
  "petrolina": { lat: -9.3891, lng: -40.5028 },
  "mossoró": { lat: -5.1878, lng: -37.3442 },
  "imperatriz": { lat: -5.5264, lng: -47.4772 },
  "dourados": { lat: -22.2231, lng: -54.8064 },
  "três lagoas": { lat: -20.7849, lng: -51.7008 },
  "rondonópolis": { lat: -16.4674, lng: -54.6368 },
  "sinop": { lat: -11.8642, lng: -55.5025 },
};

function getBranchCoords(branch: Branch, index: number): { lat: number; lng: number } {
  if (branch.lat && branch.lng) {
    return { lat: branch.lat, lng: branch.lng };
  }

  const cityKey = (branch.city || "").toLowerCase().trim();
  const stateKey = (branch.state || "").toUpperCase().trim();

  let baseCoords = { lat: -15.7975, lng: -47.8919 }; // Default Brasilia

  if (cityKey && MAJOR_CITIES[cityKey]) {
    baseCoords = MAJOR_CITIES[cityKey];
  } else if (stateKey && STATE_CAPITALS[stateKey]) {
    baseCoords = STATE_CAPITALS[stateKey];
  }

  // Create subtle deterministic offset so multiple markers in same city don't completely overlap
  const angle = (index * 137.5 * Math.PI) / 180;
  const radius = (index === 0 ? 0 : 0.015 + (index % 5) * 0.008);
  const offsetLat = Math.sin(angle) * radius;
  const offsetLng = Math.cos(angle) * radius;

  return {
    lat: baseCoords.lat + offsetLat,
    lng: baseCoords.lng + offsetLng,
  };
}

function createBranchMarkerIcon(branch: Branch, isSelected: boolean = false): L.DivIcon {
  const color = isSelected ? "#2563eb" : "#0284c7";
  const bgBadge = isSelected ? "#1e40af" : "#0f172a";

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
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
        margin-bottom: 4px;
        font-family: system-ui, -apple-system, sans-serif;
        pointer-events: auto;
        display: flex;
        align-items: center;
        gap: 4px;
      ">
        <span style="display: inline-block; width: 6px; height: 6px; border-radius: 9999px; background-color: ${branch.active !== false ? '#10b981' : '#f43f5e'};"></span>
        ${branch.name}
      </div>

      <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
        <div style="
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          background-color: ${color};
          opacity: 0.3;
          animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
        <div style="
          position: relative;
          width: 32px;
          height: 32px;
          border-radius: 9999px;
          background: #ffffff;
          border: 3px solid ${color};
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 16px rgba(0,0,0,0.25);
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
            <path d="M9 22v-4h6v4"></path>
            <path d="M8 6h.01"></path>
            <path d="M16 6h.01"></path>
            <path d="M12 6h.01"></path>
            <path d="M12 10h.01"></path>
            <path d="M12 14h.01"></path>
            <path d="M16 10h.01"></path>
            <path d="M16 14h.01"></path>
            <path d="M8 10h.01"></path>
            <path d="M8 14h.01"></path>
          </svg>
        </div>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-branch-marker",
    iconSize: [140, 60],
    iconAnchor: [70, 56],
    popupAnchor: [0, -56],
  });
}

export default function BranchMap({
  branches,
  selectedBranchId,
  onSelectBranch,
  className = "",
}: BranchMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});
  const [mapTileStyle, setMapTileStyle] = useState<"standard" | "satellite">("standard");
  const [isExpanded, setIsExpanded] = useState(false);
  const [cepCoordsMap, setCepCoordsMap] = useState<Record<string, { lat: number; lng: number }>>({});
  const [geocoding, setGeocoding] = useState(false);

  // Asynchronously resolve coordinates for branches by CEP / Address
  useEffect(() => {
    let isMounted = true;

    async function resolveAllBranchCoords() {
      const newCoordsMap: Record<string, { lat: number; lng: number }> = {};
      let needsUpdate = false;

      setGeocoding(true);

      for (let i = 0; i < branches.length; i++) {
        const branch = branches[i];

        // Explicit lat/lng on branch object always takes priority!
        if (branch.lat !== undefined && branch.lng !== undefined && branch.lat !== 0 && branch.lng !== 0) {
          const latNum = typeof branch.lat === "string" ? parseFloat(branch.lat) : branch.lat;
          const lngNum = typeof branch.lng === "string" ? parseFloat(branch.lng) : branch.lng;
          if (!isNaN(latNum) && !isNaN(lngNum)) {
            newCoordsMap[branch.id] = { lat: latNum, lng: lngNum };
            if (!cepCoordsMap[branch.id] || cepCoordsMap[branch.id].lat !== latNum) {
              needsUpdate = true;
            }
            continue;
          }
        }

        if (cepCoordsMap[branch.id]) {
          newCoordsMap[branch.id] = cepCoordsMap[branch.id];
          continue;
        }

        const cleanCep = (branch.cep || "").replace(/\D/g, "");
        const numStr = (branch.number || "").trim();
        const rawLocation = (branch.location || "").trim();

        // Clean street name by removing "Quadra X, Lote Y" noise
        const cleanStreet = rawLocation
          .replace(/(?:quadra|qd\.?|lote|lt\.?|bloco|bl\.?|apto|apt\.?)\s*\d+/gi, "")
          .replace(/(?:nº|n°|num|número|no\.?)\s*\d+/gi, "")
          .replace(/,\s*,/g, ",")
          .trim()
          .replace(/^,|,$/g, "");

        let resolved: { lat: number; lng: number } | null = null;

        // 1. Try Nominatim Structured Search (Street + Number + City + State + Postalcode)
        if (cleanStreet || cleanCep) {
          try {
            const params = new URLSearchParams({
              format: "json",
              limit: "1",
              country: "Brazil",
            });

            if (cleanStreet) params.append("street", `${numStr ? numStr + " " : ""}${cleanStreet}`);
            if (branch.city) params.append("city", branch.city);
            if (branch.state) params.append("state", branch.state);
            if (cleanCep.length === 8) params.append("postalcode", cleanCep);

            const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
              headers: { "User-Agent": "SuaLogisticaApp/1.0" },
            });
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
                resolved = {
                  lat: parseFloat(data[0].lat),
                  lng: parseFloat(data[0].lon),
                };
              }
            }
          } catch (e) {
            // ignore
          }
        }

        // 2. Try Nominatim Freeform Search (Clean Street + Number + City + State)
        if (!resolved && (cleanStreet || branch.city)) {
          try {
            const queryStr = [cleanStreet, numStr, branch.city, branch.state, "Brasil"]
              .filter(Boolean)
              .join(", ");

            const res = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(queryStr)}`,
              { headers: { "User-Agent": "SuaLogisticaApp/1.0" } }
            );
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
                resolved = {
                  lat: parseFloat(data[0].lat),
                  lng: parseFloat(data[0].lon),
                };
              }
            }
          } catch (e) {
            // ignore
          }
        }

        // 3. Try BrasilAPI v2 CEP
        if (!resolved && cleanCep.length === 8) {
          try {
            const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`);
            if (res.ok) {
              const data = await res.json();
              if (data.location?.coordinates?.latitude && data.location?.coordinates?.longitude) {
                const lat = parseFloat(data.location.coordinates.latitude);
                const lng = parseFloat(data.location.coordinates.longitude);
                if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
                  resolved = { lat, lng };
                }
              }
            }
          } catch (e) {
            // ignore
          }
        }

        // 4. Try AwesomeAPI CEP
        if (!resolved && cleanCep.length === 8) {
          try {
            const res = await fetch(`https://cep.awesomeapi.com.br/json/${cleanCep}`);
            if (res.ok) {
              const data = await res.json();
              if (data.lat && data.lng) {
                const lat = parseFloat(data.lat);
                const lng = parseFloat(data.lng);
                if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
                  resolved = { lat, lng };
                }
              }
            }
          } catch (e) {
            // ignore
          }
        }

        // 5. Try Nominatim by City + State
        if (!resolved && (branch.city || branch.state)) {
          try {
            const query = [branch.city, branch.state, "Brasil"].filter(Boolean).join(", ");
            const res = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
              { headers: { "User-Agent": "SuaLogisticaApp/1.0" } }
            );
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
                resolved = {
                  lat: parseFloat(data[0].lat),
                  lng: parseFloat(data[0].lon),
                };
              }
            }
          } catch (e) {
            // ignore
          }
        }

        if (resolved) {
          newCoordsMap[branch.id] = resolved;
          needsUpdate = true;
        } else {
          // Fallback to capital/city offset
          newCoordsMap[branch.id] = getBranchCoords(branch, i);
          needsUpdate = true;
        }
      }

      if (isMounted) {
        if (needsUpdate) {
          setCepCoordsMap((prev) => ({ ...prev, ...newCoordsMap }));
        }
        setGeocoding(false);
      }
    }

    resolveAllBranchCoords();

    return () => {
      isMounted = false;
    };
  }, [branches]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([-15.7975, -47.8919], 4);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Update Tile Layer
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    if (mapTileStyle === "satellite") {
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 18 }
      ).addTo(map);
    } else {
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);
    }

    // Clear old markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    if (branches.length === 0) return;

    const bounds = L.latLngBounds([]);

    branches.forEach((branch, idx) => {
      const coords = cepCoordsMap[branch.id] || getBranchCoords(branch, idx);
      const isSelected = branch.id === selectedBranchId;
      const icon = createBranchMarkerIcon(branch, isSelected);

      const marker = L.marker([coords.lat, coords.lng], { icon }).addTo(map);

      bounds.extend([coords.lat, coords.lng]);

      const popupContent = document.createElement("div");
      popupContent.className = "p-2 min-w-[220px] font-sans text-xs";
      popupContent.innerHTML = `
        <div style="font-family: system-ui, -apple-system, sans-serif;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <span style="font-size: 13px; font-weight: 800; color: #0f172a;">${branch.name}</span>
            <span style="font-size: 9px; font-weight: 800; text-transform: uppercase; padding: 2px 6px; border-radius: 9999px; ${
              branch.active !== false
                ? "background: #ecfdf5; color: #047857;"
                : "background: #f1f5f9; color: #475569;"
            }">${branch.active !== false ? "Ativa" : "Inativa"}</span>
          </div>
          ${
            branch.cnpj
              ? `<div style="font-size: 11px; font-family: monospace; color: #64748b; margin-bottom: 4px;">CNPJ: ${branch.cnpj}</div>`
              : ""
          }
          ${
            branch.cep || branch.number
              ? `<div style="font-size: 11px; font-weight: 700; color: #2563eb; margin-bottom: 6px;">📍 CEP: ${branch.cep || "N/I"} ${
                  branch.number ? `• Nº ${branch.number}` : ""
                }</div>`
              : ""
          }
          <div style="border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 6px; color: #334155;">
            ${
              branch.city || branch.state
                ? `<div style="font-weight: 700; color: #1e293b; margin-bottom: 2px;">🏢 ${branch.city || ""}${
                    branch.state ? ` - ${branch.state}` : ""
                  }</div>`
                : ""
            }
            ${
              branch.location
                ? `<div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">${branch.location}</div>`
                : ""
            }
            ${
              branch.phone
                ? `<div style="font-size: 11px; color: #475569;">📞 ${branch.phone}</div>`
                : ""
            }
            ${
              branch.manager
                ? `<div style="font-size: 11px; color: #475569;">👤 Resp: ${branch.manager}</div>`
                : ""
            }
          </div>
          <button id="btn-view-branch-${branch.id}" style="
            width: 100%;
            margin-top: 10px;
            padding: 8px 12px;
            background: #2563eb;
            color: #ffffff;
            font-weight: 800;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-radius: 10px;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);
          ">
            <span>Entrar no Resumo da Filial</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>
      `;

      marker.bindPopup(popupContent, {
        closeButton: true,
        className: "custom-leaflet-popup",
      });

      marker.on("popupopen", () => {
        const btn = document.getElementById(`btn-view-branch-${branch.id}`);
        if (btn) {
          btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelectBranch(branch.id);
          };
        }
      });

      markersRef.current[branch.id] = marker;
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [branches, selectedBranchId, mapTileStyle, cepCoordsMap]);

  // Invalidate size on container resize / expand
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 300);
    }
  }, [isExpanded]);

  return (
    <div
      className={`relative bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-200 shadow-md transition-all duration-300 font-sans ${
        isExpanded ? "h-[600px]" : "h-80 md:h-96"
      } ${className}`}
    >
      {/* Map Header Overlay */}
      <div className="absolute top-3 left-3 right-3 z-[400] flex items-center justify-between gap-2 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-lg border border-zinc-200/80 flex items-center gap-2.5 pointer-events-auto">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <MapPin size={18} />
          </div>
          <div>
            <h4 className="text-xs font-black text-zinc-900 leading-tight">
              Mapa de Localização das Filiais (por CEP)
            </h4>
            <p className="text-[10px] font-bold text-zinc-500">
              {branches.length} unidade(s) localizada(s) • Clique no marcador para abrir o resumo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-lg border border-zinc-200/80">
          <button
            onClick={() =>
              setMapTileStyle((prev) => (prev === "standard" ? "satellite" : "standard"))
            }
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
              mapTileStyle === "satellite"
                ? "bg-zinc-900 text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
            title="Alternar estilo do mapa"
          >
            <Layers size={13} />
            {mapTileStyle === "satellite" ? "Satélite" : "Mapa Padronizado"}
          </button>

          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl transition-colors cursor-pointer"
            title={isExpanded ? "Reduzir Mapa" : "Expandir Mapa"}
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Map Leaflet Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full z-10 bg-zinc-900" />
    </div>
  );
}
