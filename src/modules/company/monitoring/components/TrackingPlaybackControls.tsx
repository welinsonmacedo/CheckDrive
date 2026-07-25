import React from "react";
import { Play, Pause, RotateCcw, FastForward, Clock, Gauge } from "lucide-react";
import { TripMetrics } from "../types";
import { parseSpeedKmh } from "../services/trackingService";

interface TrackingPlaybackControlsProps {
  tripMetrics: TripMetrics;
  isPlaybackPlaying: boolean;
  onTogglePlay: () => void;
  playbackIndex: number;
  onSeek: (index: number) => void;
  playbackSpeed: 1 | 2 | 4 | 8;
  onChangeSpeed: (speed: 1 | 2 | 4 | 8) => void;
  onReset: () => void;
}

export const TrackingPlaybackControls: React.FC<TrackingPlaybackControlsProps> = ({
  tripMetrics,
  isPlaybackPlaying,
  onTogglePlay,
  playbackIndex,
  onSeek,
  playbackSpeed,
  onChangeSpeed,
  onReset,
}) => {
  const locations = tripMetrics.locations || [];
  const total = locations.length;
  const currentLoc = locations[playbackIndex] || locations[0];

  const currentSpeed = currentLoc ? parseSpeedKmh(currentLoc.speed) : 0;
  const currentTimestamp = currentLoc
    ? new Date(currentLoc.created_at).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "--:--";

  return (
    <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/60 rounded-2xl p-3 sm:p-4 text-white shadow-2xl space-y-2.5">
      {/* Top info header */}
      <div className="flex items-center justify-between text-[11px] sm:text-xs font-semibold text-slate-300 gap-1 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Clock size={13} className="text-blue-400 shrink-0" />
          <span>{currentTimestamp}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Gauge size={13} className="text-emerald-400 shrink-0" />
          <span className="text-emerald-300 font-bold">{currentSpeed} km/h</span>
        </div>
        <div className="text-slate-400 font-mono text-[10px] sm:text-[11px]">
          {playbackIndex + 1} / {total} posições
        </div>
      </div>

      {/* Timeline Slider */}
      <div className="space-y-1">
        <input
          type="range"
          min={0}
          max={Math.max(0, total - 1)}
          value={playbackIndex}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="w-full h-2.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 touch-pan-x"
        />
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePlay}
            className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 rounded-xl text-xs font-extrabold transition-all shadow-md active:scale-95 ${
              isPlaybackPlaying
                ? "bg-amber-500 hover:bg-amber-600 text-slate-950"
                : "bg-blue-600 hover:bg-blue-500 text-white"
            }`}
          >
            {isPlaybackPlaying ? (
              <>
                <Pause size={14} fill="currentColor" /> Pausar
              </>
            ) : (
              <>
                <Play size={14} fill="currentColor" /> Reproduzir Rota
              </>
            )}
          </button>

          <button
            onClick={onReset}
            title="Reiniciar rota"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95"
          >
            <RotateCcw size={15} />
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700/50">
          <FastForward size={12} className="text-slate-400 ml-1 mr-0.5" />
          {([1, 2, 4, 8] as const).map((spd) => (
            <button
              key={spd}
              onClick={() => onChangeSpeed(spd)}
              className={`px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold transition ${
                playbackSpeed === spd
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
