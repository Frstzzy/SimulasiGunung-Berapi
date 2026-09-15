/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Flame,
  Compass,
  BookOpen,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Globe,
  Radio,
  MapPin,
  Sparkles
} from 'lucide-react';
import { EruptionPresetId, AppTab } from '../types';
import { ERUPTION_PRESETS } from '../data/presets';

interface HeaderProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onTriggerEruption: () => void;
  onReset: () => void;
  selectedPreset: EruptionPresetId;
  onSelectPreset: (id: EruptionPresetId) => void;
  onOpenRoadmap: () => void;
  onOpenBmkg?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isMuted,
  onToggleMute,
  onTriggerEruption,
  onReset,
  selectedPreset,
  onSelectPreset,
  onOpenRoadmap,
  onOpenBmkg,
}) => {
  return (
    <header className="bg-black/95 backdrop-blur-xl border-b border-zinc-800 text-zinc-100 sticky top-0 z-30 transition-all">
      {/* Sleek Top Telemetry Bar */}
      <div className="border-b border-zinc-850 bg-black/80 px-4 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 text-[11px]">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold bg-white text-black border border-white tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-black animate-ping" />
              STATUS: SIAGA (LEVEL III)
            </span>
            <span className="text-zinc-700 hidden sm:inline">•</span>
            <span className="text-zinc-400 hidden sm:inline">
              G. Anak Krakatau (157 mdpl)
            </span>
            <span className="text-zinc-700 hidden md:inline">•</span>
            <span className="text-zinc-400 hidden md:inline font-mono">
              06°06'07" LS, 105°25'23" BT
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-mono text-zinc-300 bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 rounded-full">
              Radius Steril: 5.0 km
            </span>
            
            <button
              id="roadmap-header-btn"
              onClick={onOpenRoadmap}
              className="px-2.5 py-1 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-white transition-all flex items-center gap-1.5 text-[11px] font-semibold"
              title="Langkah integrasi data dan peta dunia nyata"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Langkah ke Peta Nyata</span>
              <span className="sm:hidden">Peta Nyata</span>
            </button>

            {onOpenBmkg && (
              <button
                id="bmkg-header-btn"
                onClick={onOpenBmkg}
                className="px-2.5 py-1 rounded-lg border border-zinc-600 bg-zinc-900 hover:bg-zinc-800 text-white transition-all flex items-center gap-1.5 text-[11px] font-semibold shadow-sm"
                title="Buka Pusat Data BMKG & Analisis Daerah Terdampak"
              >
                <Radio className="w-3.5 h-3.5 text-white" />
                <span className="hidden sm:inline">Data BMKG (10 Daerah)</span>
                <span className="sm:hidden">BMKG</span>
              </button>
            )}

            <button
              id="mute-sound-btn"
              onClick={onToggleMute}
              className={`p-1.5 px-2 rounded-lg border transition-all flex items-center gap-1.5 text-[11px] ${
                isMuted
                  ? 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white hover:border-zinc-700'
                  : 'border-white/30 bg-white text-black font-semibold hover:bg-zinc-200'
              }`}
              title={isMuted ? 'Aktifkan Suara Erupsi' : 'Bisukan Suara'}
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-zinc-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-black animate-pulse" />
              )}
              <span className="font-medium">{isMuted ? 'Muted' : 'Audio On'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white text-black p-0.5 shadow-lg shadow-white/5 flex items-center justify-center">
            <Flame className="w-5 h-5 text-black" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                Krakatau Fisika Erupsi
              </h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-md">
                v2.1 • RK4
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Simulasi Dinamika Balistik Vulkanik & Pemodelan Dispersi Asap
            </p>
          </div>
        </div>

        {/* View Segmented Tabs - Pure Black & White Contrast */}
        <nav aria-label="Mode Simulasi" className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 shadow-inner self-start md:self-auto overflow-x-auto no-scrollbar gap-0.5">
          <button
            id="tab-satellite-btn"
            onClick={() => setActiveTab('satellite')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'satellite'
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Peta Satelit (Leaflet)</span>
          </button>

          <button
            id="tab-map3d-btn"
            onClick={() => setActiveTab('map3d')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'map3d'
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Peta 3D Kawah</span>
          </button>

          <button
            id="tab-elevation-btn"
            onClick={() => setActiveTab('elevation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'elevation'
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Elevasi 2D</span>
          </button>

          <button
            id="tab-theory-btn"
            onClick={() => setActiveTab('theory')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'theory'
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Fisika & Kode</span>
          </button>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            id="launch-eruption-btn"
            onClick={onTriggerEruption}
            className="flex-1 md:flex-none px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95 border border-white"
          >
            <Play className="w-3.5 h-3.5 fill-black text-black" />
            <span>Erupsi Sekarang</span>
          </button>

          <button
            id="reset-simulation-btn"
            onClick={onReset}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white transition-all shadow-sm"
            title="Reset Parameter & Simulasi"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preset scenario selector strip - Clean Monochrome */}
      <div className="border-t border-zinc-800 bg-black/50 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center gap-2.5 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-semibold text-zinc-400 whitespace-nowrap uppercase tracking-wider flex items-center gap-1">
            <Radio className="w-3 h-3 text-white" />
            Skenario Letusan:
          </span>
          <div className="flex items-center gap-1.5">
            {ERUPTION_PRESETS.map((p) => {
              const isSelected = selectedPreset === p.id;
              return (
                <button
                  key={p.id}
                  id={`preset-${p.id}-btn`}
                  onClick={() => onSelectPreset(p.id)}
                  className={`px-3 py-1 rounded-full whitespace-nowrap transition-all text-[11px] font-medium border ${
                    isSelected
                      ? 'bg-white text-black font-semibold border-white shadow-sm'
                      : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
};
