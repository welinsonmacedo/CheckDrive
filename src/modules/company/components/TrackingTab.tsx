import React from "react";
import { useTracking } from "../monitoring/hooks/useTracking";
import { MonitoringMap } from "../monitoring/components/MonitoringMap";
import { DriverSidebar } from "../monitoring/components/DriverSidebar";
import { TrackingDashboard } from "../monitoring/components/TrackingDashboard";
import { RefreshCw, Radio } from "lucide-react";

export default function TrackingTab() {
  const [activeSidebarTab, setActiveSidebarTab] = React.useState<"drivers" | "events" | "trips">("drivers");

  const {
    loading,
    driverStates,
    selectedDriverId,
    setSelectedDriverId,
    selectedDriverState,
    selectedTripMetrics,
    loadingTrip,
    tripsHistory,
    loadingTripsHistory,
    isPlaybackPlaying,
    setIsPlaybackPlaying,
    playbackIndex,
    setPlaybackIndex,
    playbackSpeed,
    setPlaybackSpeed,
    showHeatmap,
    setShowHeatmap,
    showClusters,
    setShowClusters,
    filters,
    setFilters,
    alerts,
    setAlerts,
    dashboardMetrics,
    refetch,
  } = useTracking();

  if (loading) {
    return (
      <div className="w-full h-[calc(100vh-100px)] bg-slate-950 flex flex-col items-center justify-center text-white rounded-3xl border border-slate-800 p-8">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/40 flex items-center justify-center mb-4 animate-bounce">
          <Radio size={24} className="animate-pulse" />
        </div>
        <h2 className="text-lg font-black tracking-wide">Conectando ao Supabase Realtime...</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-sm text-center">
          Carregando posições GPS e frota da empresa em tempo real.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-110px)] sm:h-[calc(100vh-90px)] min-h-[500px] sm:min-h-[600px] bg-slate-950 rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-800/80 shadow-2xl flex flex-col md:flex-row">
      {/* LEFT FLOATING SIDEBAR / MOBILE BOTTOM SHEET */}
      <DriverSidebar
        driverStates={driverStates}
        selectedDriverId={selectedDriverId}
        selectedDriverState={selectedDriverState}
        selectedTripMetrics={selectedTripMetrics}
        loadingTrip={loadingTrip}
        tripsHistory={tripsHistory}
        loadingTripsHistory={loadingTripsHistory}
        onSelectDriver={(id) => setSelectedDriverId(id)}
        filters={filters}
        onFilterChange={setFilters}
        alerts={alerts}
        onDismissAlert={(id) => setAlerts((prev) => prev.filter((a) => a.id !== id))}
        activeSidebarTab={activeSidebarTab}
        onSidebarTabChange={setActiveSidebarTab}
        isPlaybackPlaying={isPlaybackPlaying}
        onTogglePlay={() => setIsPlaybackPlaying(!isPlaybackPlaying)}
        playbackIndex={playbackIndex}
        onSeek={setPlaybackIndex}
        playbackSpeed={playbackSpeed}
        onChangeSpeed={setPlaybackSpeed}
        onResetPlayback={() => {
          setIsPlaybackPlaying(false);
          setPlaybackIndex(0);
        }}
      />

      {/* RIGHT MAIN MAP AREA */}
      <div className="relative flex-1 h-full w-full overflow-hidden">
        {/* TOP FLOATING DASHBOARD & ALERTS BAR */}
        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 right-2 sm:right-3 z-20 pointer-events-auto max-w-7xl mx-auto">
          <TrackingDashboard
            metrics={dashboardMetrics}
            alerts={alerts}
            showHeatmap={showHeatmap}
            onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
            showClusters={showClusters}
            onToggleClusters={() => setShowClusters(!showClusters)}
            onDismissAlert={(id) => setAlerts((prev) => prev.filter((a) => a.id !== id))}
            onOpenEventsTab={() => setActiveSidebarTab("events")}
          />
        </div>

        {/* MAP COMPONENT */}
        <MonitoringMap
          driverStates={driverStates}
          selectedDriverId={selectedDriverId}
          onSelectDriver={(id) => setSelectedDriverId(id)}
          selectedTripMetrics={selectedTripMetrics}
          isPlaybackPlaying={isPlaybackPlaying}
          playbackIndex={playbackIndex}
          showHeatmap={showHeatmap}
          showClusters={showClusters}
        />

        {/* REFRESH BUTTON - Positioned safely above mobile drawer bar */}
        <div className="absolute bottom-20 md:bottom-4 right-3 md:right-16 z-20">
          <button
            onClick={() => refetch()}
            className="p-2.5 sm:p-3 rounded-2xl bg-slate-900/90 text-slate-300 hover:text-white border border-slate-700/80 shadow-xl backdrop-blur-md transition hover:scale-105 active:scale-95 flex items-center gap-2 text-xs font-bold"
            title="Recarregar dados"
          >
            <RefreshCw size={14} className="shrink-0" />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
