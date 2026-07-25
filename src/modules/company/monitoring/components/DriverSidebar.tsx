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
  Filter,
  CheckCircle2,
  Calendar,
  Zap,
  Activity,
  Play,
  X,
  Radio,
  SlidersHorizontal,
} from "lucide-react";
import {
  DriverState,
  TripMetrics,
  FilterOptions,
  DriverOnlineStatus,
} from "../types";
import { TrackingPlaybackControls } from "./TrackingPlaybackControls";

interface DriverSidebarProps {
  driverStates: DriverState[];
  selectedDriverId: string | null;
  selectedDriverState: DriverState | null;
  selectedTripMetrics: TripMetrics | null;
  loadingTrip: boolean;
  onSelectDriver: (driverId: string | null) => void;
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;

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
  onSelectDriver,
  filters,
  onFilterChange,
  isPlaybackPlaying,
  onTogglePlay,
  playbackIndex,
  onSeek,
  playbackSpeed,
  onChangeSpeed,
  onResetPlayback,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  return (
    <div
      className={`relative h-full transition-all duration-300 ease-in-out z-10 flex flex-col bg-slate-900/95 backdrop-blur-2xl border-r border-slate-800 text-white shadow-2xl ${
        isCollapsed ? "w-14" : "w-full md:w-96"
      }`}
    >
      {/* Toggle Collapse Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3.5 top-6 z-50 w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center shadow-lg transition"
        title={isCollapsed ? "Expandir painel" : "Recolher painel"}
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Collapsed view icon column */}
      {isCollapsed ? (
        <div className="flex flex-col items-center py-6 gap-6 text-slate-400">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
            <Radio size={20} className="animate-pulse" />
          </div>
          <button
            onClick={() => setIsCollapsed(false)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white"
          >
            <Users size={18} />
          </button>
        </div>
      ) : (
        /* Expanded full panel */
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <Radio size={18} className="animate-pulse" />
              </div>
              <div>
                <h1 className="text-sm font-black text-white tracking-wide">Monitoramento Vivo</h1>
                <p className="text-[11px] text-slate-400 font-medium">Frota e Motoristas em Tempo Real</p>
              </div>
            </div>

            <button
              onClick={() => setShowFiltersModal(!showFiltersModal)}
              className={`p-2 rounded-xl border text-xs flex items-center gap-1.5 transition ${
                filters.status !== "all" || filters.date !== new Date().toISOString().split("T")[0]
                  ? "bg-blue-600/20 border-blue-500/50 text-blue-300 font-bold"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
              }`}
            >
              <SlidersHorizontal size={14} />
            </button>
          </div>

          {/* Search & Quick Status Filters */}
          <div className="p-3 border-b border-slate-800/80 space-y-2.5">
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
                          {selectedDriverState.driver?.full_name || "Motorista"}
                        </h2>
                        <span className="text-xs text-slate-400 font-medium">
                          {selectedDriverState.vehicle
                            ? `${selectedDriverState.vehicle.model || "Veículo"} (${selectedDriverState.vehicle.plate})`
                            : "Sem veículo atribuído"}
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
                        ? "🔴 Parado"
                        : "⚪ Offline"}
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
                              {ds.driver?.full_name || "Motorista Sem Nome"}
                            </h4>
                            <p className="text-[11px] text-slate-400 truncate">
                              {ds.vehicle
                                ? `${ds.vehicle.model || ""} • ${ds.vehicle.plate}`
                                : "Sem Veículo"}
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
                            {ds.speedKmh > 0 ? `${ds.speedKmh} km/h` : "Parado"}
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold block">
                            {ds.status === "moving"
                              ? "Em Movimento"
                              : ds.status === "stopped"
                              ? "Parado"
                              : "Offline"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
