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
  Sparkles,
  Wind,
  FileText,
  Download
} from 'lucide-react';
import { EruptionPresetId, AppTab, KrakatauWeather } from '../types';
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
  weather?: KrakatauWeather | null;
  onOpenWeather?: () => void;
  onOpenEjectaDetail?: () => void;
  onOpenAshDetail?: () => void;
  onOpenAerosol?: () => void;
  onOpenExportPdf?: () => void;
  onOpenIntro?: () => void;
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
  weather,
  onOpenWeather,
  onOpenEjectaDetail,
  onOpenAshDetail,
  onOpenAerosol,
  onOpenExportPdf,
  onOpenIntro,
}) => {
  return (
    <header className="bg-black/95 backdrop-blur-xl border-b border-zinc-800 text-zinc-100 sticky top-0 z-30 transition-all">
      {/* Sleek Top Telemetry Bar */}
      <div className="border-b border-zinc-850 bg-black/90 px-3 sm:px-4 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Left: Status Badges */}
          <div className="flex items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold bg-white text-black border border-white tracking-wide text-[10.5px]">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
              STATUS: SIAGA (LEVEL III)
            </span>
            <span className="text-zinc-700 hidden sm:inline">•</span>
            <span className="text-zinc-400 hidden sm:inline font-medium">
              G. Anak Krakatau (157 mdpl)
            </span>
            <span className="text-zinc-700 hidden lg:inline">•</span>
            <span className="text-zinc-400 hidden lg:inline font-mono text-[10px]">
              06°06'07" LS, 105°25'23" BT
            </span>
            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full hidden md:inline">
              Radius Steril: 5.0 km
            </span>
          </div>

          {/* Right: Quick Scientific Tools Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {/* Intro Walkthrough Button */}
            {onOpenIntro && (
              <button
                id="intro-header-btn"
                onClick={onOpenIntro}
                className="px-2.5 py-1 rounded-lg border border-amber-500/40 bg-amber-950/40 hover:bg-amber-900/60 text-amber-200 hover:text-white transition-all flex items-center gap-1.5 text-[11px] font-semibold shadow-sm whitespace-nowrap"
                title="Buka Layar Intro & Panduan Lengkap SimKratoa"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Intro SimKratoa</span>
              </button>
            )}

            {/* New: Aerosol & SO2 Physics Calculator & Animation */}
            {onOpenAerosol && (
              <button
                id="aerosol-header-btn"
                onClick={onOpenAerosol}
                className="px-2.5 py-1 rounded-lg border border-sky-500/40 bg-sky-950/40 hover:bg-sky-900/60 text-sky-200 hover:text-white transition-all flex items-center gap-1.5 text-[11px] font-semibold shadow-sm whitespace-nowrap"
                title="Buka Kalkulator & Simulasi Dinamika Aerosol Vulkanik (SO2 -> H2SO4, AOD, Radiative Forcing)"
              >
                <span>🧪</span>
                <span>Aerosol & SO₂</span>
              </button>
            )}

            {onOpenWeather && (
              <button
                id="weather-header-btn"
                onClick={onOpenWeather}
                className="px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 hover:text-white transition-all flex items-center gap-1.5 text-[11px] font-medium shadow-sm whitespace-nowrap"
                title="Buka Kondisi Cuaca & Sounding Angin Real-Time Anak Krakatau"
              >
                <Wind className="w-3.5 h-3.5 text-sky-400" />
                <span>{weather ? `${weather.wind.speedMs} m/s (${weather.wind.directionCardinal.split(' ')[0]})` : 'Cuaca'}</span>
              </button>
            )}

            {onOpenBmkg && (
              <button
                id="bmkg-header-btn"
                onClick={onOpenBmkg}
                className="px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 text-[11px] font-medium shadow-sm whitespace-nowrap"
                title="Buka Pusat Data BMKG & Analisis 10 Daerah Terdampak"
              >
                <Radio className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Data BMKG</span>
                <span className="sm:hidden">BMKG</span>
              </button>
            )}

            {onOpenAshDetail && (
              <button
                id="ash-header-btn"
                onClick={onOpenAshDetail}
                className="px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 text-[11px] font-medium shadow-sm whitespace-nowrap"
                title="Buka Matriks Sebaran Abu & Estimasi Ketebalan Isopach"
              >
                <span>☁️</span>
                <span className="hidden sm:inline">Sebaran Abu</span>
                <span className="sm:hidden">Abu</span>
              </button>
            )}

            {onOpenEjectaDetail && (
              <button
                id="ejecta-header-btn"
                onClick={onOpenEjectaDetail}
                className="px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 text-[11px] font-medium shadow-sm whitespace-nowrap"
                title="Buka Katalog Lengkap & Telemetri Lemparan Bom Vulkanik"
              >
                <span>💥</span>
                <span className="hidden sm:inline">Bom Balistik</span>
                <span className="sm:hidden">Bom</span>
              </button>
            )}

            {onOpenExportPdf && (
              <button
                id="export-pdf-header-btn"
                onClick={onOpenExportPdf}
                className="px-2.5 py-1 rounded-lg border border-red-500/40 bg-red-950/40 hover:bg-red-900/60 text-red-200 hover:text-white transition-all flex items-center gap-1.5 text-[11px] font-semibold shadow-sm whitespace-nowrap"
                title="Ekspor Laporan Resmi Simulasi Erupsi ke Format Dokumen PDF (A4)"
              >
                <FileText className="w-3.5 h-3.5 text-red-400" />
                <span>Ekspor PDF</span>
              </button>
            )}

            <button
              id="roadmap-header-btn"
              onClick={onOpenRoadmap}
              className="px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all flex items-center gap-1.5 text-[11px] font-medium whitespace-nowrap"
              title="Langkah integrasi data dan peta dunia nyata"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Peta Nyata</span>
            </button>

            <div className="h-3 w-px bg-zinc-800 mx-0.5 hidden sm:block" />

            {/* Audio Toggle Button */}
            <button
              id="mute-sound-btn"
              onClick={onToggleMute}
              className={`p-1 px-2 rounded-lg border transition-all flex items-center gap-1 text-[11px] whitespace-nowrap ${
                isMuted
                  ? 'border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-white hover:border-zinc-700'
                  : 'border-white/30 bg-white text-black font-semibold hover:bg-zinc-200'
              }`}
              title={isMuted ? 'Aktifkan Suara Erupsi' : 'Bisukan Suara'}
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-zinc-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-black" />
              )}
              <span className="hidden sm:inline">{isMuted ? 'Mute' : 'Sound'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <button
            id="brand-intro-btn"
            onClick={onOpenIntro}
            className="w-10 h-10 rounded-xl bg-white text-black p-0.5 shadow-lg shadow-white/10 flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white"
            title="Buka Layar Intro & Panduan SimKratoa"
          >
            <Flame className="w-5 h-5 text-black fill-black" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                <span>SimKratoa</span>
              </h1>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-red-950/80 border border-red-800 text-red-300 font-bold rounded-md flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                SIAGA (III)
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-md hidden sm:inline-block">
                RK4 • 3D
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Platform Simulasi Fisika Erupsi G. Anak Krakatau & Mitigasi Selat Sunda
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
          {onOpenExportPdf && (
            <button
              id="export-pdf-main-btn"
              onClick={onOpenExportPdf}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-750 hover:bg-zinc-800 hover:border-zinc-600 text-zinc-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
              title="Unduh / Cetak Laporan PDF Resmi Simulasi Erupsi"
            >
              <FileText className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">Laporan</span>
              <span>PDF</span>
            </button>
          )}

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
