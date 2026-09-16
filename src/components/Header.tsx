/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Flame,
  Mountain,
  Compass,
  BookOpen,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Globe,
  Radio,
  Sparkles,
  Wind,
  FileText,
  ChevronDown,
  Layers,
  CloudLightning,
  Atom,
  ShieldAlert
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
  const [isAnalysisMenuOpen, setIsAnalysisMenuOpen] = useState(false);

  const is1883 = selectedPreset === 'krakatau1883';
  const isAwas = is1883 || selectedPreset === 'subplinian';

  return (
    <header className="bg-black/95 backdrop-blur-xl border-b border-zinc-800 text-zinc-100 sticky top-0 z-30 transition-all">
      {/* 1. Sleek Top Bar with Mulai Simulasi SimKratoa at Top-Left Corner */}
      <div className="border-b border-zinc-850 bg-zinc-950/80 px-3 sm:px-6 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Top-Left: Mulai Simulasi SimKratoa & Station Telemetry */}
          <div className="flex items-center gap-3">
            {onOpenIntro && (
              <button
                id="top-start-simkratoa-btn"
                onClick={onOpenIntro}
                className="px-3 py-1 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-extrabold shadow-sm flex items-center gap-1.5 transition-all active:scale-95 border border-white shrink-0 cursor-pointer"
                title="Buka Panduan & Mulai Simulasi SimKratoa"
              >
                <Play className="w-3.5 h-3.5 fill-black text-black" />
                <span>Mulai Simulasi SimKratoa</span>
              </button>
            )}

            <div className="hidden sm:flex items-center gap-2 text-[11px] text-zinc-400">
              <span className="flex items-center gap-1.5 font-medium text-zinc-300">
                <span className={`w-2 h-2 rounded-full ${isAwas ? 'bg-red-500 animate-ping' : 'bg-amber-400 animate-pulse'}`} />
                Pos Pengamatan G. Anak Krakatau
              </span>
              <span className="text-zinc-700">•</span>
              <span className="font-mono text-[10px] text-zinc-400">
                Selat Sunda (157 mdpl)
              </span>
            </div>
          </div>

          {/* Right: Consolidated Essential Utilities */}
          <div className="flex items-center gap-2">
            {/* Real-time Weather Badge */}
            {onOpenWeather && (
              <button
                id="weather-header-btn"
                onClick={onOpenWeather}
                className="px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 text-[11px] font-medium"
                title="Lihat Data Cuaca & Angin Real-Time Stasiun Selat Sunda"
              >
                <Wind className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-mono">
                  {weather ? `${weather.wind.speedMs} m/s ${weather.wind.directionCardinal.split(' ')[0]}` : 'Cuaca'}
                </span>
              </button>
            )}

            {/* Consolidated Analysis Dropdown */}
            <div className="relative">
              <button
                id="analysis-menu-btn"
                onClick={() => setIsAnalysisMenuOpen(!isAnalysisMenuOpen)}
                className="px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 text-[11px] font-medium"
                title="Modul Analisis Sains & Data Bencana"
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Modul Analisis</span>
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              </button>

              {isAnalysisMenuOpen && (
                <div
                  className="absolute right-0 mt-1.5 w-52 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                  onMouseLeave={() => setIsAnalysisMenuOpen(false)}
                >
                  {onOpenBmkg && (
                    <button
                      onClick={() => {
                        onOpenBmkg();
                        setIsAnalysisMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 flex items-center gap-2 transition-all"
                    >
                      <Radio className="w-3.5 h-3.5 text-amber-400" />
                      <div>
                        <div className="font-medium">Data Resmi BMKG</div>
                        <div className="text-[10px] text-zinc-500">Peringatan SIGMET & 10 Daerah</div>
                      </div>
                    </button>
                  )}
                  {onOpenAshDetail && (
                    <button
                      onClick={() => {
                        onOpenAshDetail();
                        setIsAnalysisMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 flex items-center gap-2 transition-all"
                    >
                      <CloudLightning className="w-3.5 h-3.5 text-zinc-300" />
                      <div>
                        <div className="font-medium">Sebaran Abu Isopach</div>
                        <div className="text-[10px] text-zinc-500">Ketebalan & radius dispersi</div>
                      </div>
                    </button>
                  )}
                  {onOpenEjectaDetail && (
                    <button
                      onClick={() => {
                        onOpenEjectaDetail();
                        setIsAnalysisMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 flex items-center gap-2 transition-all"
                    >
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      <div>
                        <div className="font-medium">Bom Balistik</div>
                        <div className="text-[10px] text-zinc-500">Trajektori & energi benturan</div>
                      </div>
                    </button>
                  )}
                  {onOpenAerosol && (
                    <button
                      onClick={() => {
                        onOpenAerosol();
                        setIsAnalysisMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 flex items-center gap-2 transition-all"
                    >
                      <Atom className="w-3.5 h-3.5 text-sky-400" />
                      <div>
                        <div className="font-medium">Aerosol & Gas SO₂</div>
                        <div className="text-[10px] text-zinc-500">Reaksi atmosfer & iklim</div>
                      </div>
                    </button>
                  )}
                  {onOpenRoadmap && (
                    <button
                      onClick={() => {
                        onOpenRoadmap();
                        setIsAnalysisMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 flex items-center gap-2 transition-all"
                    >
                      <Globe className="w-3.5 h-3.5 text-emerald-400" />
                      <div>
                        <div className="font-medium">Integrasi Peta & Data</div>
                        <div className="text-[10px] text-zinc-500">Arsitektur data geospasial</div>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Export PDF Button */}
            {onOpenExportPdf && (
              <button
                id="export-pdf-header-btn"
                onClick={onOpenExportPdf}
                className="px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-900/90 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-all flex items-center gap-1.5 text-[11px] font-medium"
                title="Cetak Laporan PDF Resmi (A4)"
              >
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                <span className="hidden sm:inline">PDF</span>
              </button>
            )}

            {/* Audio Toggle Button */}
            <button
              id="mute-sound-btn"
              onClick={onToggleMute}
              className={`p-1 px-2 rounded-lg border transition-all flex items-center gap-1 text-[11px] ${
                isMuted
                  ? 'border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-white hover:border-zinc-700'
                  : 'border-white/30 bg-white text-black font-semibold hover:bg-zinc-200'
              }`}
              title={isMuted ? 'Nyalakan Suara Erupsi' : 'Bisukan Suara'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-zinc-400" /> : <Volume2 className="w-3.5 h-3.5 text-black" />}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Navigation Bar with Perfected Top-Left Start Layout */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* TOP LEFT BRAND & START ACTION GROUP */}
        <div className="flex items-center justify-between md:justify-start gap-3">
          {/* Brand Identity & Status */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-amber-950/80 via-red-950/60 to-zinc-900 border border-amber-500/40 flex items-center justify-center shadow-md shadow-amber-950/40 relative overflow-hidden group">
              <Mountain className="w-5 h-5 text-amber-400 stroke-[2.2] fill-amber-500/20 group-hover:scale-110 transition-transform" />
              <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500 animate-ping opacity-75" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-1">
                  <span>SimKratoa</span>
                </h1>

                {/* Single, non-duplicated Alert Status Badge */}
                <span
                  className={`text-[10px] uppercase font-mono px-2 py-0.5 font-bold rounded-md flex items-center gap-1 border ${
                    is1883
                      ? 'bg-rose-950/90 border-rose-700 text-rose-200'
                      : isAwas
                      ? 'bg-red-950/90 border-red-700 text-red-200'
                      : 'bg-zinc-900 border-zinc-700 text-amber-300'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isAwas ? 'bg-red-500 animate-ping' : 'bg-amber-400'}`} />
                  {is1883 ? 'AWAS (IV) • 1883' : isAwas ? 'AWAS (IV)' : 'SIAGA (III)'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                Simulasi Fisika Erupsi & Mitigasi Selat Sunda
              </p>
            </div>
          </div>

          {/* INTEGRATED START & GUIDE BUTTONS AT TOP-LEFT */}
          <div className="flex items-center gap-1.5">
            {/* Primary Mulai Simulasi Button */}
            {onOpenIntro && (
              <button
                id="intro-header-btn"
                onClick={onOpenIntro}
                className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold shadow-md shadow-white/10 flex items-center gap-1.5 transition-all active:scale-95 border border-white"
                title="Buka Panduan & Mulai Simulasi SimKratoa"
              >
                <Play className="w-3.5 h-3.5 fill-black text-black" />
                <span>Mulai Simulasi</span>
              </button>
            )}

            {/* Direct Eruption Trigger */}
            <button
              id="launch-eruption-btn"
              onClick={onTriggerEruption}
              className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all active:scale-95"
              title="Mulai Lontaran Erupsi Vulkanik Sekarang (Tekan Space)"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Erupsi</span>
              <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[9px] font-mono font-normal bg-zinc-800 text-zinc-300 rounded border border-zinc-700/80">Space</kbd>
            </button>

            {/* Reset Button */}
            <button
              id="reset-simulation-btn"
              onClick={onReset}
              className="p-1.5 sm:p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all"
              title="Reset Parameter Simulasi"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* View Segmented Tabs */}
        <nav aria-label="Mode Simulasi" className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 self-start md:self-auto overflow-x-auto no-scrollbar gap-0.5">
          <button
            id="tab-satellite-btn"
            onClick={() => setActiveTab('satellite')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'satellite'
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
            title="Peta Satelit Interaktif (Tekan 1)"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Peta Satelit</span>
            <kbd className={`text-[9px] font-mono px-1 py-0.2 rounded ${activeTab === 'satellite' ? 'bg-zinc-200 text-zinc-800' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'}`}>1</kbd>
          </button>

          <button
            id="tab-map3d-btn"
            onClick={() => setActiveTab('map3d')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'map3d'
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
            title="Peta 3D Interaktif (Tekan 2)"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Peta 3D</span>
            <kbd className={`text-[9px] font-mono px-1 py-0.2 rounded ${activeTab === 'map3d' ? 'bg-zinc-200 text-zinc-800' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'}`}>2</kbd>
          </button>

          <button
            id="tab-elevation-btn"
            onClick={() => setActiveTab('elevation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'elevation'
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
            title="Penampang Elevasi 2D & Atmosfer (Tekan 3)"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Elevasi 2D</span>
            <kbd className={`text-[9px] font-mono px-1 py-0.2 rounded ${activeTab === 'elevation' ? 'bg-zinc-200 text-zinc-800' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'}`}>3</kbd>
          </button>

          <button
            id="tab-theory-btn"
            onClick={() => setActiveTab('theory')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'theory'
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
            title="Fisika Komputasi & Penurunan Rumus (Tekan 4)"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Fisika & Teori</span>
            <kbd className={`text-[9px] font-mono px-1 py-0.2 rounded ${activeTab === 'theory' ? 'bg-zinc-200 text-zinc-800' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'}`}>4</kbd>
          </button>
        </nav>
      </div>

      {/* 3. Preset Scenario Selector Strip - with 1883 Special Highlighting */}
      <div className="border-t border-zinc-800/80 bg-zinc-950/90 px-4 py-1.5">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-semibold text-zinc-400 whitespace-nowrap uppercase tracking-wider flex items-center gap-1">
            <Radio className="w-3 h-3 text-zinc-400" />
            Skenario:
          </span>
          <div className="flex items-center gap-1.5">
            {ERUPTION_PRESETS.map((p) => {
              const isSelected = selectedPreset === p.id;
              const isHistorical1883 = p.id === 'krakatau1883';

              return (
                <button
                  key={p.id}
                  id={`preset-${p.id}-btn`}
                  onClick={() => onSelectPreset(p.id)}
                  className={`px-3 py-1 rounded-lg whitespace-nowrap transition-all text-[11px] font-medium border flex items-center gap-1.5 ${
                    isSelected
                      ? isHistorical1883
                        ? 'bg-rose-600 text-white font-bold border-rose-500 shadow-md shadow-rose-900/30'
                        : 'bg-white text-black font-bold border-white shadow-sm'
                      : isHistorical1883
                      ? 'bg-rose-950/40 text-rose-300 border-rose-800/70 hover:bg-rose-900/60 hover:text-white'
                      : 'bg-zinc-900/70 text-zinc-400 border-zinc-800 hover:bg-zinc-850 hover:text-white hover:border-zinc-700'
                  }`}
                  title={p.description}
                >
                  {isHistorical1883 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                  )}
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
};

