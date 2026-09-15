import React, { useState } from 'react';
import { Play, Pause, RotateCcw, ChevronUp, ChevronDown, Radio, FileText, Info } from 'lucide-react';
import { PlumeParams } from '../types';

interface MapSimulationDockProps {
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  simTimeMinutes: number;
  setSimTimeMinutes: (v: number) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (v: number) => void;
  simCurrentFrontKm: string;
  simCurrentUmbrellaKm: string;
  simCoveredLandmarks: Array<{
    id: string;
    name: string;
    type: string;
    distKm: number;
  }>;
  onOpenDetailModal: () => void;
  onOpenBmkgModal: () => void;
  simHours: number;
  simMins: number;
  activeBmkgScenario?: any;
  plume: PlumeParams;
}

export const MapSimulationDock: React.FC<MapSimulationDockProps> = ({
  isPlaying,
  setIsPlaying,
  simTimeMinutes,
  setSimTimeMinutes,
  playbackSpeed,
  setPlaybackSpeed,
  simCurrentFrontKm,
  simCurrentUmbrellaKm,
  simCoveredLandmarks,
  onOpenDetailModal,
  onOpenBmkgModal,
  simHours,
  simMins,
  activeBmkgScenario,
  plume,
}) => {
  const [showExtendedDock, setShowExtendedDock] = useState(false);

  return (
    <div className="absolute bottom-3 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-[94%] sm:max-w-3xl z-20 pointer-events-auto font-sans">
      <div className="bg-black/95 backdrop-blur-2xl border border-zinc-800 rounded-2xl p-3 shadow-2xl space-y-2.5 transition-all">
        {/* Top Header Row: Title, Live Clock, Playback Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white tracking-wide">
                Simulasi Sebaran Abu
              </span>
              <span className="bg-zinc-800 text-zinc-200 font-mono font-bold text-[10px] px-2 py-0.5 rounded-full border border-zinc-700">
                {simHours > 0 ? `T + ${simHours}j ${simMins}m` : `T + ${simMins}m`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Speed multipliers */}
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
              {[1, 2, 5].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    playbackSpeed === speed
                      ? 'bg-white text-black font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            {/* Play/Pause Button */}
            <button
              id="sim-play-btn"
              onClick={() => setIsPlaying((prev) => !prev)}
              className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold transition-all shadow-md ${
                isPlaying
                  ? 'bg-amber-400 hover:bg-amber-300 text-black'
                  : 'bg-white hover:bg-zinc-200 text-black'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'Jeda' : 'Putar'}</span>
            </button>

            {/* Reset Button */}
            <button
              id="sim-reset-btn"
              onClick={() => {
                setSimTimeMinutes(0);
                setIsPlaying(false);
              }}
              className="p-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
              title="Reset ke T=0 (Saat Letusan Terjadi)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Details toggle */}
            <button
              id="sim-expand-btn"
              onClick={() => setShowExtendedDock(!showExtendedDock)}
              className="p-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
              title={showExtendedDock ? 'Sembunyikan Detail Telemetri' : 'Buka Detail Telemetri'}
            >
              {showExtendedDock ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Timeline Slider Bar */}
        <div className="space-y-1">
          <div className="relative flex items-center">
            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={simTimeMinutes}
              onChange={(e) => {
                setSimTimeMinutes(Number(e.target.value));
                setIsPlaying(false);
              }}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white hover:accent-zinc-200 transition-all"
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 px-0.5">
            <span>T+0 (Letusan)</span>
            <span className="text-zinc-500">T+1 Jam</span>
            <span className="text-zinc-500">T+2 Jam</span>
            <span className="text-zinc-500">T+4 Jam</span>
            <span>T+6 Jam Pasca Erupsi</span>
          </div>
        </div>

        {/* Real-time Telemetry Indicators */}
        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-850 text-center font-mono">
          <div className="bg-zinc-900/90 py-1.5 px-2 rounded-xl border border-zinc-800">
            <span className="text-[9px] text-zinc-400 block font-sans">Front Terdepan</span>
            <span className="text-xs font-bold text-white">{simCurrentFrontKm} km</span>
          </div>
          <div className="bg-zinc-900/90 py-1.5 px-2 rounded-xl border border-zinc-800">
            <span className="text-[9px] text-zinc-400 block font-sans">Payung Kawah</span>
            <span className="text-xs font-bold text-white">{simCurrentUmbrellaKm} km</span>
          </div>
          <div className="bg-zinc-900/90 py-1.5 px-2 rounded-xl border border-zinc-800">
            <span className="text-[9px] text-zinc-400 block font-sans">Daerah Tertutup</span>
            <span className={`text-xs font-bold ${simCoveredLandmarks.length > 0 ? 'text-amber-400' : 'text-zinc-400'}`}>
              {simCoveredLandmarks.length} Lokasi
            </span>
          </div>
        </div>

        {/* Collapsible Extended Detail Section */}
        {showExtendedDock && (
          <div className="pt-2 border-t border-zinc-800 space-y-2 text-xs">
            {/* Impacted landmark badges */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-zinc-400 block">
                DAERAH DI DALAM SELUBUNG ABU (PADA T + {simHours > 0 ? `${simHours}j ` : ''}{simMins}m):
              </span>
              {simCoveredLandmarks.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
                  {simCoveredLandmarks.map((lm) => (
                    <span
                      key={lm.id}
                      className="px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 text-[10px] font-mono flex items-center gap-1"
                    >
                      <span className="text-amber-400">⚠️</span>
                      <span className="font-sans font-medium">{lm.name}</span>
                      <span className="text-zinc-400">({lm.distKm} km)</span>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-zinc-500 font-sans italic">
                  Belum ada daratan utama atau jalur pelayaran yang tertutup abu pada menit ini.
                </div>
              )}
            </div>

            {/* Weather & Active Scenario Parameters */}
            <div className="bg-zinc-900/70 p-2 rounded-xl border border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
              <div>
                <span className="text-zinc-400 block font-sans">Angin BMKG:</span>
                <span className="text-white font-bold">{plume.windSpeed} m/s ({(plume.windSpeed * 3.6).toFixed(0)} km/h)</span>
              </div>
              <div>
                <span className="text-zinc-400 block font-sans">Arah Tiupan:</span>
                <span className="text-white font-bold">{plume.windDirection}°</span>
              </div>
              <div>
                <span className="text-zinc-400 block font-sans">Tinggi Kolom:</span>
                <span className="text-white font-bold">{plume.columnHeight} m</span>
              </div>
              <div>
                <span className="text-zinc-400 block font-sans">Skenario:</span>
                <span className="text-white font-bold truncate block">{activeBmkgScenario?.title?.split('(')[0] || 'Standar'}</span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={onOpenBmkgModal}
                className="flex-1 py-1.5 px-2 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors shadow"
              >
                <Radio className="w-3.5 h-3.5 text-black" />
                <span>Pusat Data BMKG & Dampak Wilayah</span>
              </button>
              <button
                onClick={onOpenDetailModal}
                className="flex-1 py-1.5 px-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-medium text-[11px] flex items-center justify-center gap-1.5 transition-colors border border-zinc-800"
              >
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                <span>Panduan Mitigasi & Fisika Sebaran</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
