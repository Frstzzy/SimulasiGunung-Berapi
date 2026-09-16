/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * IntroModal - Layar Pembuka / Intro Interaktif Platform SimKratoa
 * Memberikan pengantar komprehensif mengenai kapabilitas komputasi fisika,
 * peta 3D kawah, pemodelan sebaran abu, data meteorologi, dan protokol mitigasi.
 */

import React, { useState } from 'react';
import {
  Flame,
  Globe,
  Compass,
  FileText,
  Play,
  X,
  Sparkles,
  Wind,
  ShieldAlert,
  ChevronRight,
  Activity,
  Layers,
  Info,
  Check
} from 'lucide-react';
import { EruptionPresetId } from '../types';
import { ERUPTION_PRESETS } from '../data/presets';

interface IntroModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPreset: EruptionPresetId;
  onSelectPreset: (id: EruptionPresetId) => void;
  onStartSimulation: () => void;
}

export const IntroModal: React.FC<IntroModalProps> = ({
  isOpen,
  onClose,
  selectedPreset,
  onSelectPreset,
  onStartSimulation,
}) => {
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleStart = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('simkratoa_intro_seen', 'true');
      } catch (e) {
        // Safe fallback
      }
    }
    onStartSimulation();
    onClose();
  };

  return (
    <div
      id="intro-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl overflow-y-auto animate-in fade-in duration-300"
      onClick={onClose}
    >
      {/* Background Volcanic Atmospheric Ambient Light */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-red-600/15 blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-10 left-1/3 w-[500px] h-[350px] bg-amber-600/10 blur-[100px] pointer-events-none -z-10" />

      <div
        id="intro-modal-card"
        className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden my-auto text-zinc-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-red-600 via-amber-500 to-white" />

        {/* Close button */}
        <button
          id="close-intro-btn"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 transition-all z-20"
          title="Tutup Intro"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Header */}
        <div className="p-6 sm:p-8 pb-4 relative overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-red-950/80 text-red-300 border border-red-800 tracking-wider uppercase shadow-sm">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              STATUS: SIAGA (LEVEL III)
            </span>
            <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900/80 border border-zinc-800 px-3 py-1 rounded-full">
              Selat Sunda • 06°06'07" LS, 105°25'23" BT
            </span>
            <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900/80 border border-zinc-800 px-3 py-1 rounded-full">
              Puncak: 157 mdpl
            </span>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white text-black flex items-center justify-center shadow-xl shadow-white/10 shrink-0 mt-1">
              <Flame className="w-8 h-8 text-black fill-black" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-baseline gap-3">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-sans">
                  SimKratoa
                </h1>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-750 text-zinc-300">
                  v2.5 • Multi-Physics
                </span>
              </div>
              <p className="text-sm sm:text-base text-zinc-300 font-medium">
                Platform Simulasi Komputasi Fisika Erupsi Gunung Anak Krakatau & Mitigasi Risiko Selat Sunda
              </p>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
                Simulasikan gerak balistik proyektil piroklastik, dinamika kolom abu vulkanik berdasar integrasi Runge-Kutta 4 (RK4), pemodelan dispersi atmosferik Gaussian, kondisi cuaca riil, serta matriks keterpaparan wilayah pesisir Banten dan Lampung.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Grid / 4 Pillars */}
        <div className="px-6 sm:px-8 py-4">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-zinc-400" />
            Modul Utama Simulasi:
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Feature 1 */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/90 hover:border-zinc-700 transition-all space-y-1.5">
              <div className="flex items-center gap-2 text-white font-semibold">
                <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-200">
                  <Globe className="w-4 h-4 text-emerald-400" />
                </div>
                <span>Peta Satelit Georeferensi (Leaflet)</span>
              </div>
              <p className="text-zinc-400 text-[11.5px] leading-normal">
                Visualisasi spasial pulau-pulau kaldera (Rakata, Sertung, Panjang), radius bahaya KRB III 5 km, jalur internasional ALKI I, dan kerucut sebaran abu vulkanik.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/90 hover:border-zinc-700 transition-all space-y-1.5">
              <div className="flex items-center gap-2 text-white font-semibold">
                <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-200">
                  <Compass className="w-4 h-4 text-amber-400" />
                </div>
                <span>Peta 3D Kawah & Efek Erupsi (Three.js)</span>
              </div>
              <p className="text-zinc-400 text-[11.5px] leading-normal">
                Morfologi kaldera realistis, luncuran bom balistik dengan hambatan udara aerodinamis, semburan kolom asap volumetrik, awan panas PDC, dan kilatan petir vulkanik.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/90 hover:border-zinc-700 transition-all space-y-1.5">
              <div className="flex items-center gap-2 text-white font-semibold">
                <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-200">
                  <Wind className="w-4 h-4 text-sky-400" />
                </div>
                <span>Telemetri Cuaca & Dispersi Angin</span>
              </div>
              <p className="text-zinc-400 text-[11.5px] leading-normal">
                Sinkronisasi angin nyata stasiun cuaca Selat Sunda, arah hanyutan (*drift vector*), serta estimasi laju semburan massa (*Mass Eruption Rate* Mastin 2009).
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/90 hover:border-zinc-700 transition-all space-y-1.5">
              <div className="flex items-center gap-2 text-white font-semibold">
                <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-200">
                  <FileText className="w-4 h-4 text-red-400" />
                </div>
                <span>Analisis Daerah Terdampak & Ekspor PDF</span>
              </div>
              <p className="text-zinc-400 text-[11.5px] leading-normal">
                Estimasi waktu tiba abu (ETA) di Anyer, Carita, Sebesi, Kalianda, Bakauheni, dan Merak, serta cetak laporan resmi berformat PDF A4 dalam satu klik.
              </p>
            </div>
          </div>
        </div>

        {/* Preset Selector on Intro */}
        <div className="px-6 sm:px-8 py-3 bg-zinc-900/30 border-t border-zinc-850">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-white" />
              Pilih Skenario Awal untuk Memulai:
            </span>
            <span className="text-[11px] text-zinc-500 hidden sm:inline">
              Dapat diubah kapan saja di bilah navigasi
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ERUPTION_PRESETS.map((p) => {
              const isSelected = selectedPreset === p.id;
              return (
                <button
                  key={p.id}
                  id={`intro-preset-${p.id}-btn`}
                  onClick={() => onSelectPreset(p.id)}
                  className={`p-2.5 rounded-xl text-left border transition-all relative ${
                    isSelected
                      ? 'bg-white text-black font-semibold border-white shadow-md'
                      : 'bg-zinc-900/70 text-zinc-400 border-zinc-800 hover:bg-zinc-850 hover:text-white hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs truncate block">{p.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-black shrink-0" />}
                  </div>
                  <span className={`text-[10px] block mt-0.5 truncate ${isSelected ? 'text-zinc-700' : 'text-zinc-500'}`}>
                    {p.subtitle}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="p-6 sm:p-8 pt-4 bg-zinc-950 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none order-2 sm:order-1">
            <input
              id="dont-show-intro-again-checkbox"
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-white accent-white focus:ring-0 focus:ring-offset-0"
            />
            <span>Jangan tampilkan otomatis saat memuat ulang</span>
          </label>

          <div className="flex items-center gap-2.5 w-full sm:w-auto order-1 sm:order-2">
            <button
              id="skip-intro-btn"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white text-xs font-medium border border-zinc-800 transition-colors"
            >
              Langsung ke Peta
            </button>

            <button
              id="start-simulation-intro-btn"
              onClick={handleStart}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold shadow-xl shadow-white/10 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Play className="w-4 h-4 fill-black text-black" />
              <span>Mulai Simulasi SimKratoa</span>
              <ChevronRight className="w-4 h-4 text-black" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
