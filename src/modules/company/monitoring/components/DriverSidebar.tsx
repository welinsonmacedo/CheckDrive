import React, { useState } from "react";
import {
  Search,
  Users,
  Truck,
  MapPin,
  Clock,
  Gauge,
  Navigation,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Filter,
  CheckCircle2,
  Calendar,
  Zap,
  Activity,
  Play,
  X,
  Radio,
  SlidersHorizontal,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import {
  DriverState,
  TripMetrics,
  FilterOptions,
  DriverOnlineStatus,
  AlertItem,
} from "../types";
import { TrackingPlaybackControls } from "./TrackingPlaybackControls";
import { formatDriverName, formatRelativeTime } from "../services/trackingService";

interface DriverSidebarProps {
  driverStates: DriverState[];
  selectedDriverId: string | null;
  selectedDriverState: DriverState | null;
  selectedTripMetrics: TripMetrics | null;
  loadingTrip: boolean;
  tripsHistory?: TripMetrics[];
  loadingTripsHistory?: boolean;
  onSelectDriver: (driverId: string | null) => void;
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  alerts?: AlertItem[];
  onDismissAlert?: (id: string) => void;
  activeSidebarTab?: "drivers" | "events" | "trips";
  onSidebarTabChange?: (tab: "drivers" | "events" | "trips") => void;

  // Playback props
  isPlaybackPlaying: boolean;
  onTogglePlay: () => void;
  playbackIndex: number;
  onSeek: (index: number) => void;
  playbackSpeed: 1 | 2 | 4 | 8;
  onChangeSpeed: (speed: 1 | 2 | 4 | 8) => void;
  onResetPlayback: () => void;
}

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return "0 min";
  const minutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const remMin = minutes % 60;
  if (hours > 0) return `${hours}h ${remMin}min`;
  return `${minutes} min`;
}

export const DriverSidebar: React.FC<DriverSidebarProps> = ({
  driverStates,
  selectedDriverId,
  selectedDriverState,
  selectedTripMetrics,
  loadingTrip,
  tripsHistory = [],
  loadingTripsHistory = false,
  onSelectDriver,
  filters,
  onFilterChange,
  alerts = [],
  onDismissAlert,
  activeSidebarTab = "drivers",
  onSidebarTabChange,
  isPlaybackPlaying,
  onTogglePlay,
  playbackIndex,
  onSeek,
  playbackSpeed,
  onChangeSpeed,
  onResetPlayback,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [internalTab, setInternalTab] = useState<"drivers" | "events" | "trips">("drivers");
  const [eventsSearchTerm, setEventsSearchTerm] = useState("");
  const [eventsFilterType, setEventsFilterType] = useState<"all" | "speed" | "other">("all");

  const currentTab = onSidebarTabChange ? activeSidebarTab : internalTab;
  const setTab = (t: "drivers" | "events" | "trips") => {
    if (onSidebarTabChange) onSidebarTabChange(t);
    setInternalTab(t);
  };

  // Auto-expand mobile drawer if a driver is selected from the map
  React.useEffect(() => {
    if (selectedDriverId) {
      setIsMobileExpanded(true);
    }
  }, [selectedDriverId]);

  // Filter alerts for the events tab
  const filteredEvents = alerts.filter((al) => {
    if (eventsFilterType === "speed" && al.type !== "high_speed") return false;
    if (eventsFilterType === "other" && al.type === "high_speed") return false;
    if (eventsSearchTerm) {
      const term = eventsSearchTerm.toLowerCase();
      const matchName = al.driverName?.toLowerCase().includes(term);
      const matchPlate = al.vehiclePlate?.toLowerCase().includes(term);
      const matchType = al.vehicleType?.toLowerCase().includes(term);
      return matchName || matchPlate || matchType;
    }
    return true;
  });

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-30 md:relative md:inset-auto md:z-10 flex flex-col bg-slate-900/95 backdrop-blur-2xl border-t md:border-t-0 md:border-r border-slate-800 text-white shadow-2xl transition-all duration-300 rounded-t-3xl md:rounded-none overflow-hidden ${
        // Desktop sizing
        isCollapsed ? "md:w-14" : "md:w-96"
      } ${
        // Mobile sizing
        isMobileExpanded ? "h-[80vh] md:h-full" : "h-16 md:h-full"
      } w-full`}
    >
      {/* Mobile Drag Handle */}
      <div
        onClick={() => setIsMobileExpanded(!isMobileExpanded)}
        className="md:hidden w-full pt-2 pb-1 px-4 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800/40 shrink-0 select-none"
      >
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mb-1" />
        {!isMobileExpanded && (
          <div className="w-full flex items-center justify-between text-xs py-0.5">
            <div className="flex items-center gap-2 truncate">
              <Users size={15} className="text-blue-400 shrink-0" />
              <span className="font-bold text-white text-xs truncate">
                Motoristas ({driverStates.length})
              </span>
              {selectedDriverState && (
                <span className="text-[10px] bg-blue-600/30 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold truncate">
                  {formatDriverName(selectedDriverState.driver?.full_name)}
                </span>
              )}
            </div>
            <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1 shrink-0">
              Ver Painel ▲
            </span>
          </div>
        )}
      </div>

      {/* Desktop Toggle Collapse Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden md:flex absolute -right-3.5 top-6 z-50 w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:text-white items-center justify-center shadow-lg transition"
        title={isCollapsed ? "Expandir painel" : "Recolher painel"}
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Desktop Collapsed view icon column */}
      {isCollapsed ? (
        <div className="hidden md:flex flex-col items-center py-6 gap-6 text-slate-400">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
            <Radio size={20} className="animate-pulse" />
          </div>
          <button
            onClick={() => {
              setTab("drivers");
              setIsCollapsed(false);
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white"
            title="Motoristas"
          >
            <Users size={18} />
          </button>
          <button
            onClick={() => {
              setTab("events");
              setIsCollapsed(false);
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white relative"
            title="Eventos e Alertas"
          >
            <AlertTriangle size={18} className={alerts.length > 0 ? "text-rose-400" : ""} />
            {alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                {alerts.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setTab("trips");
              setIsCollapsed(false);
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white"
            title="Trajetos"
          >
            <Navigation size={18} />
          </button>
        </div>
      ) : (
        /* Expanded full panel (Always visible on desktop when not collapsed, visible on mobile when expanded) */
        <div className={`flex flex-col h-full overflow-hidden ${!isMobileExpanded ? "hidden md:flex" : "flex"}`}>
          {/* Header */}
          <div className="p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30 shrink-0">
                <Radio size={18} className="animate-pulse" />
              </div>
              <div>
                <h1 className="text-sm font-black text-white tracking-wide leading-tight">
                  Monitoramento Vivo
                </h1>
                <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium">
                  Frota e Motoristas em Tempo Real
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowFiltersModal(!showFiltersModal)}
                className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition ${
                  filters.status !== "all" || filters.date !== new Date().toISOString().split("T")[0]
                    ? "bg-blue-600/20 border-blue-500/50 text-blue-300 font-bold"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                }`}
                title="Filtros"
              >
                <SlidersHorizontal size={14} />
              </button>

              {/* Mobile collapse button */}
              <button
                onClick={() => setIsMobileExpanded(false)}
                className="md:hidden p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"
                title="Fechar painel"
              >
                <ChevronDown size={16} />
              </button>
            </div>
          </div>

          {/* TAB SWITCHER: Motoristas | Eventos */}
          <div className="grid grid-cols-3 gap-1.5 p-2 bg-slate-950/80 border-b border-slate-800 shrink-0">
            <button
              onClick={() => setTab("drivers")}
              className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition ${
                currentTab === "drivers"
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <Users size={14} />
              <span>Motoristas ({driverStates.length})</span>
            </button>

            <button
              onClick={() => setTab("events")}
              className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition relative ${
                currentTab === "events"
                  ? "bg-rose-600 text-white shadow-lg shadow-rose-600/20"
                  : "bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <AlertTriangle size={14} className={alerts.length > 0 ? "text-amber-300 animate-pulse" : ""} />
              <span>Eventos</span>
              {alerts.length > 0 && (
                <span className={`ml-1 px-1.5 py-0.2 text-[10px] rounded-full font-black ${
                  currentTab === "events" ? "bg-white text-rose-700" : "bg-rose-500 text-white"
                }`}>
                  {alerts.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setTab("trips")}
              className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition ${
                currentTab === "trips"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                  : "bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <Navigation size={14} />
              <span className="truncate">Trajetos</span>
            </button>
          </div>

          {/* RENDER CONTENT ACCORDING TO ACTIVE TAB */}
          {currentTab === "drivers" ? (
            <>
              {/* Search & Quick Status Filters */}
              <div className="p-3 border-b border-slate-800/80 space-y-2.5 shrink-0">
                {/* Search Input */}
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={filters.searchTerm}
                    onChange={(e) => onFilterChange({ ...filters, searchTerm: e.target.value })}
                    placeholder="Buscar por motorista ou placa..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                  />
                  {filters.searchTerm && (
                    <button
                      onClick={() => onFilterChange({ ...filters, searchTerm: "" })}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {/* Status Pills */}
                <div className="grid grid-cols-4 gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/50 text-[11px] font-bold">
                  {[
                    { id: "all", label: "Todos" },
                    { id: "moving", label: "🟢 Mover" },
                    { id: "stopped", label: "🔴 Parado" },
                    { id: "offline", label: "⚪ Off" },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => onFilterChange({ ...filters, status: st.id as any })}
                      className={`py-1.5 rounded-lg text-center transition ${
                        filters.status === st.id
                          ? "bg-blue-600 text-white shadow-md"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

          {/* Expanded Filters Popover */}
          {showFiltersModal && (
            <div className="p-3 bg-slate-850 border-b border-slate-800 space-y-2 text-xs animate-fadeIn">
              <div className="flex items-center justify-between text-slate-300 font-bold mb-1">
                <span>Filtros Avançados</span>
                <button
                  onClick={() =>
                    onFilterChange({
                      searchTerm: "",
                      driverId: "all",
                      vehicleId: "all",
                      status: "all",
                      date: new Date().toISOString().split("T")[0],
                      tripId: "all",
                    })
                  }
                  className="text-blue-400 hover:underline text-[11px]"
                >
                  Limpar
                </button>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-semibold block mb-1">
                  Data da Viagem/Histórico:
                </label>
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) => onFilterChange({ ...filters, date: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                />
              </div>
            </div>
          )}

          {/* MAIN CONTENT AREA: Driver List OR Driver History Details */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {selectedDriverState ? (
              /* DETAIL VIEW FOR SELECTED DRIVER */
              <div className="space-y-3 animate-fadeIn">
                {/* Back Button */}
                <button
                  onClick={() => onSelectDriver(null)}
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-bold py-1"
                >
                  <ChevronLeft size={16} /> Voltar para a lista de motoristas
                </button>

                {/* Driver Card Header */}
                <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black text-base flex items-center justify-center border border-blue-400/30 shadow-md overflow-hidden">
                        {selectedDriverState.driver?.avatar_url ? (
                          <img
                            src={selectedDriverState.driver.avatar_url}
                            alt={selectedDriverState.driver.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (selectedDriverState.driver?.full_name || "M").charAt(0)
                        )}
                      </div>
                      <div>
                        <h2 className="text-sm font-black text-white leading-tight">
                          {formatDriverName(selectedDriverState.driver?.full_name)}
                        </h2>
                        
                        <span className="text-xs text-slate-400 font-medium line-clamp-2 leading-snug block mt-0.5">
                          {selectedDriverState.vehicle
                            ? `${selectedDriverState.vehicle.model || "Veículo"} (${selectedDriverState.vehicle.plate})`
                            : "Sem veículo atribuído"}
                          {selectedDriverState.route_name ? ` • ${selectedDriverState.route_name}` : ""}
                        </span>

                      </div>
                    </div>

                    {/* Status Badge */}
                    <div
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${
                        selectedDriverState.status === "moving"
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : selectedDriverState.status === "stopped"
                          ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                          : "bg-slate-700 text-slate-300 border-slate-600"
                      }`}
                    >
                      {selectedDriverState.status === "moving"
                        ? "🟢 Em Movimento"
                        : selectedDriverState.status === "stopped"
                        ? (selectedDriverState.is_on_break ? "🟠 No Intervalo" : "🔴 Parado")
                        : (selectedDriverState.is_on_break ? "🟠 Offline (Intervalo)" : "⚪ Offline")}
                    </div>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-700/60">
                    <div className="bg-slate-900/60 p-2 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-semibold">
                        Velocidade Atual
                      </span>
                      <strong className="text-sm text-emerald-400 font-extrabold">
                        {selectedDriverState.speedKmh} km/h
                      </strong>
                    </div>

                    <div className="bg-slate-900/60 p-2 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-semibold">
                        Último Sinal
                      </span>
                      <strong className="text-xs text-slate-200 font-bold">
                        {selectedDriverState.lastUpdateAgo}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* TRIP METRICS & PLAYBACK */}
                <div className="space-y-2 pt-1">
                  <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Navigation size={14} className="text-blue-400" /> Métricas da Viagem
                  </h3>

                  {loadingTrip ? (
                    <div className="p-6 text-center text-xs text-slate-400 bg-slate-800/50 rounded-2xl border border-slate-800 animate-pulse">
                      Carregando rota e histórico da viagem...
                    </div>
                  ) : !selectedTripMetrics ? (
                    <div className="p-4 text-center text-xs text-slate-400 bg-slate-800/50 rounded-2xl border border-slate-800">
                      Nenhuma posição registrada para esta data/viagem.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Trip Stats Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
                          <span className="text-[10px] text-slate-400 block">Tempo em Movimento</span>
                          <strong className="text-emerald-400 font-extrabold">
                            {formatDuration(selectedTripMetrics.movingTimeMs)}
                          </strong>
                        </div>

                        <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
                          <span className="text-[10px] text-slate-400 block">Tempo Parado</span>
                          <strong className="text-rose-400 font-extrabold">
                            {formatDuration(selectedTripMetrics.stoppedTimeMs)}
                          </strong>
                        </div>

                        <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
                          <span className="text-[10px] text-slate-400 block">Velocidade Média</span>
                          <strong className="text-cyan-300 font-extrabold">
                            {selectedTripMetrics.avgSpeedKmh} km/h
                          </strong>
                        </div>

                        <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
                          <span className="text-[10px] text-slate-400 block">Maior Velocidade</span>
                          <strong className="text-amber-400 font-extrabold">
                            {selectedTripMetrics.maxSpeedKmh} km/h
                          </strong>
                        </div>

                        <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50 col-span-2">
                          <span className="text-[10px] text-slate-400 block">
                            Total de Posições Rastreadas
                          </span>
                          <strong className="text-white font-black text-sm">
                            {selectedTripMetrics.totalPositions} registros
                          </strong>
                        </div>
                      </div>

                      {/* PLAYBACK COMPONENT */}
                      <div className="pt-2">
                        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          ▶ Reproduzir Viagem (Playback)
                        </h4>
                        <TrackingPlaybackControls
                          tripMetrics={selectedTripMetrics}
                          isPlaybackPlaying={isPlaybackPlaying}
                          onTogglePlay={onTogglePlay}
                          playbackIndex={playbackIndex}
                          onSeek={onSeek}
                          playbackSpeed={playbackSpeed}
                          onChangeSpeed={onChangeSpeed}
                          onReset={onResetPlayback}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* DRIVER LIST VIEW */
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1">
                  <span>MOTORISTAS ({driverStates.length})</span>
                  <span>STATUS / VELOCIDADE</span>
                </div>

                {driverStates.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-slate-800/40 rounded-2xl border border-slate-800">
                    Nenhum motorista encontrado para os filtros selecionados.
                  </div>
                ) : (
                  driverStates.map((ds) => {
                    const isSelected = ds.driver_id === selectedDriverId;
                    return (
                      <div
                        key={ds.driver_id}
                        onClick={() => onSelectDriver(ds.driver_id)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/10"
                            : "bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600"
                        }`}
                      >
                        {/* Driver & Vehicle details */}
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-slate-700 text-white font-extrabold flex items-center justify-center overflow-hidden border border-slate-600">
                              {ds.driver?.avatar_url ? (
                                <img
                                  src={ds.driver.avatar_url}
                                  alt={ds.driver.full_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                (ds.driver?.full_name || "M").charAt(0)
                              )}
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${
                                ds.status === "moving"
                                  ? "bg-emerald-400 animate-pulse"
                                  : ds.status === "stopped"
                                  ? "bg-rose-500"
                                  : "bg-slate-400"
                              }`}
                            />
                          </div>

                          <div className="overflow-hidden">
                            <h4 className="text-xs font-bold text-white truncate">
                              {formatDriverName(ds.driver?.full_name)}
                            </h4>
                            
                            <p className="text-[11px] text-slate-400 truncate">
                              {ds.vehicle
                                ? `${ds.vehicle.model || ""} • ${ds.vehicle.plate}`
                                : "Sem Veículo"}
                              {ds.route_name ? ` | Rota: ${ds.route_name}` : ""}
                            </p>

                            <span className="text-[10px] text-slate-500 font-mono block">
                              {ds.lastUpdateAgo}
                            </span>
                          </div>
                        </div>

                        {/* Speed & status indicator */}
                        <div className="text-right shrink-0">
                          <div
                            className={`text-xs font-black ${
                              ds.status === "moving"
                                ? "text-emerald-400"
                                : ds.status === "stopped"
                                ? "text-rose-400"
                                : "text-slate-400"
                            }`}
                          >
                            {ds.speedKmh > 0 ? `${ds.speedKmh} km/h` : (ds.is_on_break ? "Intervalo" : "Parado")}
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold block">
                            {ds.status === "moving"
                              ? "Em Movimento"
                              : ds.status === "stopped"
                              ? (ds.is_on_break ? "Intervalo" : "Parado")
                              : (ds.is_on_break ? "Off/Intervalo" : "Offline")}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
          </>

          ) : currentTab === "trips" ? (
            /* TAB 3: HISTÓRICO DE TRAJETOS */
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <div className="bg-gradient-to-r from-purple-950/60 to-slate-900 border border-purple-800/40 rounded-2xl p-3 space-y-1 text-xs">
                <div className="flex items-center gap-2 text-purple-400 font-black">
                  <Navigation size={16} />
                  <span>Histórico de Trajetos</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Lista de trajetos já realizados. Filtre pela data clicando no botão de filtros acima.
                </p>
              </div>

              <div className="space-y-2 pb-20">
                {loadingTripsHistory ? (
                  <div className="p-8 text-center text-slate-400">
                    <Radio size={24} className="animate-pulse mx-auto mb-2 opacity-50" />
                    <p className="text-[11px]">Carregando trajetos...</p>
                  </div>
                ) : !tripsHistory || tripsHistory.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-slate-800/30 rounded-2xl border border-slate-700/50">
                    <p className="text-[11px]">Nenhum trajeto encontrado para a data {filters.date}.</p>
                  </div>
                ) : (
                  tripsHistory.map((trip) => (
                    <div 
                      key={trip.trip_id}
                      className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-2xl hover:bg-slate-800 transition cursor-pointer"
                      onClick={() => {
                        onSelectDriver(trip.driver_id);
                        if (onFilterChange) onFilterChange({ ...filters, tripId: trip.trip_id });
                        setTab("drivers");
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 text-white font-bold text-sm">
                          <Users size={14} className="text-blue-400" />
                          <span>{driverStates.find(d => d.driver_id === trip.driver_id)?.driver?.full_name || "Motorista"}</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                          {trip.totalPositions} pts
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400">Início</span>
                          <span className="text-xs font-medium text-slate-200">
                            {new Date(trip.firstPositionAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] text-slate-400">Fim</span>
                          <span className="text-xs font-medium text-slate-200">
                            {new Date(trip.lastPositionAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400">Movimento</span>
                          <span className="text-xs font-bold text-emerald-400">
                            {formatDuration(trip.movingTimeMs)}
                          </span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] text-slate-400">Parado</span>
                          <span className="text-xs font-bold text-rose-400">
                            {formatDuration(trip.stoppedTimeMs)}
                          </span>
                        </div>
                        
                        <div className="flex flex-col col-span-2 mt-1 pt-2 border-t border-slate-700/50">
                          <span className="text-[10px] text-slate-400">Velocidade Máxima</span>
                          <span className="text-xs font-bold text-amber-400">{trip.maxSpeedKmh} km/h</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          ) : (
            /* TAB 2: EVENTOS E EXCESSO DE VELOCIDADE */
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {/* Speed Rules Info Box */}
              <div className="bg-gradient-to-r from-rose-950/60 to-slate-900 border border-rose-800/40 rounded-2xl p-3 space-y-1 text-xs">
                <div className="flex items-center gap-2 text-rose-400 font-black">
                  <ShieldAlert size={16} />
                  <span>Aba de Eventos e Telemetria</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Monitoramento em tempo real de infrações comparadas com o limite de velocidade cadastrado no tipo do veículo.
                </p>
              </div>

              {/* Search & Sub-filters for Events */}
              <div className="space-y-2">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={eventsSearchTerm}
                    onChange={(e) => setEventsSearchTerm(e.target.value)}
                    placeholder="Buscar motorista, placa ou tipo..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-rose-500 transition"
                  />
                  {eventsSearchTerm && (
                    <button
                      onClick={() => setEventsSearchTerm("")}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/50 text-[11px] font-bold">
                  <button
                    onClick={() => setEventsFilterType("all")}
                    className={`py-1.5 rounded-lg text-center transition ${
                      eventsFilterType === "all" ? "bg-rose-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Todos ({alerts.length})
                  </button>
                  <button
                    onClick={() => setEventsFilterType("speed")}
                    className={`py-1.5 rounded-lg text-center transition ${
                      eventsFilterType === "speed" ? "bg-rose-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    🚨 Vel. ({alerts.filter((a) => a.type === "high_speed").length})
                  </button>
                  <button
                    onClick={() => setEventsFilterType("other")}
                    className={`py-1.5 rounded-lg text-center transition ${
                      eventsFilterType === "other" ? "bg-rose-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    ⚠️ Outros
                  </button>
                </div>
              </div>

              {/* Events Cards List */}
              {filteredEvents.length > 0 ? (
                filteredEvents.map((al) => (
                  <div
                    key={al.id}
                    className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-3.5 space-y-2.5 hover:border-rose-500/50 transition shadow-lg"
                  >
                    {/* Event Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold shrink-0">
                          <AlertTriangle size={16} />
                        </div>
                        <div>
                          <span className="text-xs font-black text-rose-400 uppercase tracking-wide block">
                            {al.type === "high_speed" ? "Excesso de Velocidade" : "Alerta GPS / Monitoramento"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {formatRelativeTime(al.timestamp)} ({new Date(al.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                          </span>
                        </div>
                      </div>
                      {onDismissAlert && (
                        <button
                          onClick={() => onDismissAlert(al.id)}
                          className="text-slate-500 hover:text-slate-200 p-1"
                          title="Descartar evento"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Driver & Vehicle Box */}
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-white block font-bold text-xs">{formatDriverName(al.driverName)}</strong>
                        <span className="text-slate-400 text-[11px]">
                          Placa: <strong className="text-slate-200">{al.vehiclePlate}</strong> {al.vehicleModel ? `• ${al.vehicleModel}` : ""}
                        </span>
                      </div>
                      {al.vehicleType && (
                        <span className="bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                          {al.vehicleType}
                        </span>
                      )}
                    </div>

                    {/* Speed Comparison Block */}
                    {al.speedKmh !== undefined && al.maxSpeedKmh !== undefined && (
                      <div className="bg-gradient-to-r from-rose-950/80 to-slate-900 border border-rose-800/50 p-2.5 rounded-xl text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-rose-300/80 block font-semibold">Velocidade Atingida</span>
                            <strong className="text-rose-400 font-black text-sm">{al.speedKmh} km/h</strong>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block font-semibold">
                              Limite Cadastrado {al.vehicleType ? `(${al.vehicleType})` : ""}
                            </span>
                            <strong className="text-emerald-400 font-black text-sm">{al.maxSpeedKmh} km/h</strong>
                          </div>
                        </div>

                        {al.speedKmh > al.maxSpeedKmh && (
                          <div className="text-[10px] font-bold text-amber-300 text-center bg-rose-900/40 py-1 rounded-lg border border-rose-800/40">
                            Excesso de +{al.speedKmh - al.maxSpeedKmh} km/h acima do limite permitido!
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="pt-0.5 flex items-center justify-end">
                      <button
                        onClick={() => {
                          onSelectDriver(al.driver_id);
                          setTab("drivers");
                        }}
                        className="px-3 py-1.5 rounded-xl bg-blue-600/20 text-blue-300 hover:bg-blue-600 hover:text-white border border-blue-500/40 text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <Navigation size={13} />
                        <span>Ver Motorista no Mapa</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-800/40 rounded-2xl border border-slate-800/80 space-y-2">
                  <CheckCircle2 size={36} className="mx-auto text-emerald-400 mb-1" />
                  <strong className="text-white text-sm block">Nenhum evento registrado</strong>
                  <p className="text-slate-400 max-w-xs mx-auto text-[11px] leading-relaxed">
                    Nenhum excesso de velocidade detectado. A frota está trafegando dentro dos limites de velocidade configurados para cada tipo de veículo!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
