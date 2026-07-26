import React, { useState } from "react";
import {
  Users,
  Wifi,
  Navigation,
  Gauge,
  Zap,
  Clock,
  AlertTriangle,
  Flame,
  Layers,
  ChevronDown,
  X,
  Radio,
} from "lucide-react";
import { DashboardMetrics, AlertItem } from "../types";
import { formatRelativeTime } from "../services/trackingService";

interface TrackingDashboardProps {
  metrics: DashboardMetrics;
  alerts: AlertItem[];
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  showClusters: boolean;
  onToggleClusters: () => void;
  onDismissAlert: (id: string) => void;
  onOpenEventsTab?: () => void;
}

export const TrackingDashboard: React.FC<TrackingDashboardProps> = ({
  metrics,
  alerts,
  showHeatmap,
  onToggleHeatmap,
  showClusters,
  onToggleClusters,
  onDismissAlert,
  onOpenEventsTab,
}) => {
  const [showAlertsList, setShowAlertsList] = useState(false);

  const lastUpdateRelative = metrics.lastUpdateAt
    ? formatRelativeTime(metrics.lastUpdateAt)
    : "Sem dados";

  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Top Floating Glass Bar */}
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-2 sm:p-2.5 shadow-2xl flex items-center justify-between gap-2 text-white overflow-hidden">
        {/* Indicators Grid - Horizontally scrollable on mobile */}
        <div className="flex items-center gap-1.5 sm:gap-3 text-xs overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-0.5 shrink">
          {/* Online Drivers */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-800/80 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-slate-700/50 shrink-0">
            <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-500"></span>
            </span>
            <div>
              <span className="text-[9px] sm:text-[10px] text-slate-400 block font-medium leading-none">Mover</span>
              <strong className="text-emerald-400 text-xs sm:text-sm font-black">{metrics.onlineDrivers}</strong>
            </div>
          </div>

          {/* Stopped Drivers */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-800/80 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-slate-700/50 shrink-0">
            <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-rose-500"></span>
            <div>
              <span className="text-[9px] sm:text-[10px] text-slate-400 block font-medium leading-none">Parados</span>
              <strong className="text-rose-400 text-xs sm:text-sm font-black">{metrics.stoppedDrivers}</strong>
            </div>
          </div>

          {/* Active Trips */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-800/80 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-slate-700/50 shrink-0">
            <Navigation size={13} className="text-blue-400 shrink-0" />
            <div>
              <span className="text-[9px] sm:text-[10px] text-slate-400 block font-medium leading-none">Viagens</span>
              <strong className="text-blue-400 text-xs sm:text-sm font-black">{metrics.activeTrips}</strong>
            </div>
          </div>

          {/* Average Speed */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-800/80 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-slate-700/50 shrink-0">
            <Gauge size={13} className="text-cyan-400 shrink-0" />
            <div>
              <span className="text-[9px] sm:text-[10px] text-slate-400 block font-medium leading-none">Vel. Média</span>
              <strong className="text-slate-200 text-xs sm:text-sm font-black">{metrics.avgSpeedKmh} km/h</strong>
            </div>
          </div>

          {/* Max Speed */}
          <div className="hidden xs:flex items-center gap-1.5 sm:gap-2 bg-slate-800/80 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-slate-700/50 shrink-0">
            <Zap size={13} className="text-amber-400 shrink-0" />
            <div>
              <span className="text-[9px] sm:text-[10px] text-slate-400 block font-medium leading-none">Maior Vel.</span>
              <strong className="text-amber-400 text-xs sm:text-sm font-black">{metrics.maxSpeedKmh} km/h</strong>
            </div>
          </div>

          {/* Last Update */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-800/80 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-slate-700/50 shrink-0">
            <Radio size={13} className="text-emerald-400 animate-pulse shrink-0" />
            <div>
              <span className="text-[9px] sm:text-[10px] text-slate-400 block font-medium leading-none">Último Sinal</span>
              <strong className="text-slate-300 text-[11px] sm:text-xs font-bold">{lastUpdateRelative}</strong>
            </div>
          </div>
        </div>

        {/* Toggles & Alerts */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Heatmap Toggle */}
          <button
            onClick={onToggleHeatmap}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition border ${
              showHeatmap
                ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
            }`}
            title="Alternar Mapa de Calor"
          >
            <Flame size={13} className={showHeatmap ? "text-rose-400" : ""} />
            <span className="hidden lg:inline text-[11px]">Calor</span>
          </button>

          {/* Alerts Trigger */}
          <button
            onClick={() => setShowAlertsList(!showAlertsList)}
            className={`relative px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition border ${
              alerts.length > 0
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/10"
                : "bg-slate-800 text-slate-400 border-slate-700"
            }`}
          >
            <AlertTriangle size={13} className={alerts.length > 0 ? "text-amber-400 animate-bounce" : ""} />
            <span className="hidden sm:inline text-[11px]">Alertas</span>
            {alerts.length > 0 && (
              <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full">
                {alerts.length}
              </span>
            )}
            <ChevronDown size={12} />
          </button>
        </div>
      </div>

      {/* Expanded Alerts Popover */}
      {showAlertsList && (
        <div className="bg-slate-900/95 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-3 shadow-2xl text-white space-y-2 animate-fadeIn max-h-60 overflow-y-auto">
          <div className="flex items-center justify-between text-xs font-bold border-b border-slate-800 pb-2">
            <span className="text-amber-400 flex items-center gap-1.5">
              <AlertTriangle size={14} /> Alertas Detectados em Tempo Real ({alerts.length})
            </span>
            <button onClick={() => setShowAlertsList(false)} className="text-slate-400 hover:text-white">
              <X size={14} />
            </button>
          </div>

          {alerts.length === 0 ? (
            <p className="text-xs text-slate-400 py-2 text-center">Nenhum alerta pendente no momento. Frota operando normalmente!</p>
          ) : (
            <div className="space-y-1.5">
              {alerts.map((al) => (
                <div
                  key={al.id}
                  className="flex items-start justify-between gap-2 p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-white font-bold">{al.driverName}</strong>
                      <span className="text-slate-400 font-mono text-[11px] bg-slate-900 px-1.5 py-0.5 rounded">
                        {al.vehiclePlate}
                      </span>
                    </div>
                    <p className="text-amber-300 text-[11px] mt-0.5">{al.message}</p>
                  </div>
                  <button
                    onClick={() => onDismissAlert(al.id)}
                    className="text-slate-500 hover:text-slate-300 p-1"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              {onOpenEventsTab && (
                <button
                  onClick={() => {
                    setShowAlertsList(false);
                    onOpenEventsTab();
                  }}
                  className="w-full py-1.5 mt-2 bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 text-rose-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                >
                  <span>Ver Todos na Aba de Eventos ➔</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
