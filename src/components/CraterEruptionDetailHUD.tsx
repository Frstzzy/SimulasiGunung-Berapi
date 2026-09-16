/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Flame,
  Zap,
  CloudRain,
  Ruler,
  Wind,
  ShieldAlert,
  Eye,
  Activity,
  ChevronDown,
  ChevronUp,
  Thermometer,
  Compass,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { PlumeParams, CameraPreset3D } from '../types';

interface CraterEruptionDetailHUDProps {
  plume: PlumeParams;
  onApplyCameraPreset: (preset: CameraPreset3D) => void;
  activeCameraPreset: CameraPreset3D;
  showVolcanicLightning: boolean;
  onToggleVolcanicLightning: () => void;
  showAshRain: boolean;
  onToggleAshRain: () => void;
  showAltitudeGauge: boolean;
  onToggleAltitudeGauge: () => void;
  showPyroclasticFlow: boolean;
  onTogglePyroclasticFlow: () => void;
  showHazardZones: boolean;
  onToggleHazardZones: () => void;
}

export const CraterEruptionDetailHUD: React.FC<CraterEruptionDetailHUDProps> = ({
  plume,
  onApplyCameraPreset,
  activeCameraPreset,
  showVolcanicLightning,
  onToggleVolcanicLightning,
  showAshRain,
  onToggleAshRain,
  showAltitudeGauge,
  onToggleAltitudeGauge,
  showPyroclasticFlow,
  onTogglePyroclasticFlow,
  showHazardZones,
  onToggleHazardZones,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [activeSubTab, setActiveSubTab] = useState<'telemetry' | 'ash_impact' | 'anatomy'>('telemetry');

  // Scientific estimations based on column height and emission rate
  const columnAltitudeMdpl = 157 + plume.columnHeight;
  // Mass Eruption Rate (MER) empirical approximation (Mastin et al., 2009: MER = 140 * H^2.3)
  const massEruptionRateKgS = Math.round(140 * Math.pow(plume.columnHeight / 1000, 2.3) * (plume.emissionRate / 5));
  // FLIR Thermal Anomaly estimation
  const craterTempC = Math.min(1050, 720 + Math.round((plume.emissionRate / 10) * 260));
  // Magma overpressure estimation (MPa)
  const overpressureMPa = (10.5 + (plume.columnHeight / 4000) * 8.5).toFixed(1);
  // Estimated ash accumulation at neighboring islands
  const windFactor = (plume.windDirection >= 135 && plume.windDirection <= 225) ? 1.8 : 0.7;
  const rakataAshCm = ((plume.columnHeight / 300) * windFactor * 0.9).toFixed(1);
  const sertungAshCm = ((plume.columnHeight / 360) * (2 - windFactor) * 0.8).toFixed(1);
  const panjangAshCm = ((plume.columnHeight / 420) * 0.8).toFixed(1);

  return (
    <div className="bg-black/90 backdrop-blur-xl rounded-2xl border border-zinc-800 text-xs text-zinc-200 shadow-2xl overflow-hidden transition-all duration-300">
      {/* HUD Header */}
      <div className="p-3 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
            <Flame className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-[12px]">Peta Kawah & Erupsi 3D</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-red-950/80 text-red-400 border border-red-800/80 uppercase font-semibold">
                Erupsi Aktif
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 font-mono">
              Anak Krakatau • 6.102°S, 105.423°E
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
          title={isExpanded ? 'Sembunyikan Panel' : 'Buka Detail Erupsi'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="p-3 space-y-3">
          {/* Quick Camera Navigation for Crater Inspection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400 font-medium flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-zinc-300" />
                Inspeksi Kawah:
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">Preset Kamera</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => onApplyCameraPreset('crater')}
                className={`px-2.5 py-1.5 rounded-xl text-left font-medium transition-all flex items-center gap-1.5 border text-[11px] ${
                  activeCameraPreset === 'crater'
                    ? 'bg-orange-500 text-black font-bold border-orange-400 shadow-md'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <span>🔍</span>
                <span>Zoom Kawah Dekat</span>
              </button>
              <button
                onClick={() => onApplyCameraPreset('rim')}
                className={`px-2.5 py-1.5 rounded-xl text-left font-medium transition-all flex items-center gap-1.5 border text-[11px] ${
                  activeCameraPreset === 'rim'
                    ? 'bg-amber-400 text-black font-bold border-amber-300 shadow-md'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <span>🌋</span>
                <span>Bibir Kawah 157m</span>
              </button>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-850">
            <button
              onClick={() => setActiveSubTab('telemetry')}
              className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-semibold transition-all ${
                activeSubTab === 'telemetry'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Fisika Kawah
            </button>
            <button
              onClick={() => setActiveSubTab('ash_impact')}
              className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-semibold transition-all ${
                activeSubTab === 'ash_impact'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Dampak Abu
            </button>
            <button
              onClick={() => setActiveSubTab('anatomy')}
              className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-semibold transition-all ${
                activeSubTab === 'anatomy'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Anatomi 2018
            </button>
          </div>

          {/* TAB 1: TELEMETRI FISIKA KAWAH */}
          {activeSubTab === 'telemetry' && (
            <div className="space-y-2 text-[11px]">
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-850">
                  <span className="text-[9px] text-zinc-400 block font-sans">Ketinggian Kolom Asap</span>
                  <span className="text-sm font-bold text-orange-400">{plume.columnHeight.toLocaleString()} m</span>
                  <span className="text-[9px] text-zinc-500 block">({columnAltitudeMdpl.toLocaleString()} mdpl)</span>
                </div>
                <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-850">
                  <span className="text-[9px] text-zinc-400 block font-sans">Suhu Kawah (FLIR IR)</span>
                  <span className="text-sm font-bold text-red-400">{craterTempC}°C</span>
                  <span className="text-[9px] text-zinc-500 block">Anomali Termal Tinggi</span>
                </div>
                <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-850">
                  <span className="text-[9px] text-zinc-400 block font-sans">Laju Erupsi Massa (MER)</span>
                  <span className="text-sm font-bold text-cyan-400">{massEruptionRateKgS.toLocaleString()} kg/s</span>
                  <span className="text-[9px] text-zinc-500 block">Mastin Equation</span>
                </div>
                <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-850">
                  <span className="text-[9px] text-zinc-400 block font-sans">Tekanan Magma</span>
                  <span className="text-sm font-bold text-amber-400">{overpressureMPa} MPa</span>
                  <span className="text-[9px] text-zinc-500 block">Overpressure Vent</span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-zinc-950 border border-zinc-850 flex items-center justify-between text-[10px]">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  Tipe Erupsi:
                </span>
                <span className="font-semibold text-white bg-zinc-850 px-2 py-0.5 rounded border border-zinc-700">
                  {plume.columnHeight > 2500 ? 'Sub-Plinian / Vulkanian' : 'Strombolian / Vulkanian'}
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: DAMPAK SEBARAN ABU DI KEPULAUAN KRAKATAU */}
          {activeSubTab === 'ash_impact' && (
            <div className="space-y-2 text-[11px]">
              <span className="text-[10px] text-zinc-400 block">
                Estimasi tebal endapan tefra abu vulkanik di pulau-pulau sekitar:
              </span>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between bg-zinc-950 p-2 rounded-xl border border-zinc-850">
                  <div>
                    <span className="font-semibold text-white block">Pulau Rakata</span>
                    <span className="text-[9px] text-zinc-400">Jarak 4.5 km ke arah Selatan</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-orange-400 text-xs">{rakataAshCm} cm</span>
                    <span className="text-[9px] text-zinc-500 block">Hujan Lapili</span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-zinc-950 p-2 rounded-xl border border-zinc-850">
                  <div>
                    <span className="font-semibold text-white block">Pulau Sertung</span>
                    <span className="text-[9px] text-zinc-400">Jarak 3.5 km ke arah Barat Laut</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-amber-400 text-xs">{sertungAshCm} cm</span>
                    <span className="text-[9px] text-zinc-500 block">Abu Kasar</span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-zinc-950 p-2 rounded-xl border border-zinc-850">
                  <div>
                    <span className="font-semibold text-white block">Pulau Panjang</span>
                    <span className="text-[9px] text-zinc-400">Jarak 3.2 km ke arah Timur Laut</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-yellow-400 text-xs">{panjangAshCm} cm</span>
                    <span className="text-[9px] text-zinc-500 block">Abu Halus</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ANATOMI KAWAH & SESAR LONGSORAN 2018 */}
          {activeSubTab === 'anatomy' && (
            <div className="space-y-2 text-[10px] text-zinc-300">
              <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-850 space-y-1">
                <span className="font-bold text-red-400 block text-[11px]">⚠️ Amfiteater Kolaps 2018</span>
                <p className="leading-relaxed text-zinc-400">
                  Lereng barat daya memiliki sesar patahan terjal berbentuk tapal kuda bekas longsornya 0.22 km³ batuan ke dasar laut yang memicu tsunami 2018.
                </p>
              </div>

              <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-850 space-y-1">
                <span className="font-bold text-cyan-400 block text-[11px]">♨️ Laguna Kawah Asam (Toska)</span>
                <p className="leading-relaxed text-zinc-400">
                  Air laut masuk ke cekungan kawah pasca-runtuhan membentuk danau hidrotermal bersuhu 65°C, pH &lt; 1.5, dan memicu letusan freatomagmatik.
                </p>
              </div>

              <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-850 space-y-1">
                <span className="font-bold text-amber-400 block text-[11px]">🌋 Pusat Kepundan Magma</span>
                <p className="leading-relaxed text-zinc-400">
                  Vent aktif berdiameter 45m di ketinggian 157 mdpl, menyemburkan lava pijar strombolian dan gas sulfur dioksida secara konstan.
                </p>
              </div>
            </div>
          )}

          {/* VISUAL EFFECT & ERUPTION DETAIL TOGGLES */}
          <div className="pt-2 border-t border-zinc-800 space-y-1.5">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Efek Asap, Abu & Detail 3D:
            </span>

            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              {/* Petir Vulkanik */}
              <button
                onClick={onToggleVolcanicLightning}
                className={`p-2 rounded-xl flex items-center justify-between border transition-all ${
                  showVolcanicLightning
                    ? 'bg-indigo-950/70 border-indigo-500/60 text-indigo-200'
                    : 'bg-zinc-950 border-zinc-850 text-zinc-500'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Zap className={`w-3.5 h-3.5 ${showVolcanicLightning ? 'text-indigo-400 animate-pulse' : 'text-zinc-600'}`} />
                  <span className="font-medium">Petir Vulkanik</span>
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${showVolcanicLightning ? 'bg-indigo-900/60 text-indigo-300' : 'bg-zinc-900 text-zinc-600'}`}>
                  {showVolcanicLightning ? 'ON' : 'OFF'}
                </span>
              </button>

              {/* Hujan Abu Jatuh */}
              <button
                onClick={onToggleAshRain}
                className={`p-2 rounded-xl flex items-center justify-between border transition-all ${
                  showAshRain
                    ? 'bg-zinc-800/80 border-zinc-600 text-zinc-200'
                    : 'bg-zinc-950 border-zinc-850 text-zinc-500'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <CloudRain className={`w-3.5 h-3.5 ${showAshRain ? 'text-zinc-300' : 'text-zinc-600'}`} />
                  <span className="font-medium">Hujan Abu</span>
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${showAshRain ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-600'}`}>
                  {showAshRain ? 'ON' : 'OFF'}
                </span>
              </button>

              {/* Penggaris Ketinggian 3D */}
              <button
                onClick={onToggleAltitudeGauge}
                className={`p-2 rounded-xl flex items-center justify-between border transition-all ${
                  showAltitudeGauge
                    ? 'bg-cyan-950/70 border-cyan-500/60 text-cyan-200'
                    : 'bg-zinc-950 border-zinc-850 text-zinc-500'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Ruler className={`w-3.5 h-3.5 ${showAltitudeGauge ? 'text-cyan-400' : 'text-zinc-600'}`} />
                  <span className="font-medium">Penggaris 3D</span>
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${showAltitudeGauge ? 'bg-cyan-900/60 text-cyan-300' : 'bg-zinc-900 text-zinc-600'}`}>
                  {showAltitudeGauge ? 'ON' : 'OFF'}
                </span>
              </button>

              {/* Awan Panas Guguran (PDC) */}
              <button
                onClick={onTogglePyroclasticFlow}
                className={`p-2 rounded-xl flex items-center justify-between border transition-all ${
                  showPyroclasticFlow
                    ? 'bg-orange-950/70 border-orange-500/60 text-orange-200'
                    : 'bg-zinc-950 border-zinc-850 text-zinc-500'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Flame className={`w-3.5 h-3.5 ${showPyroclasticFlow ? 'text-orange-400' : 'text-zinc-600'}`} />
                  <span className="font-medium">Awan Panas</span>
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${showPyroclasticFlow ? 'bg-orange-900/60 text-orange-300' : 'bg-zinc-900 text-zinc-600'}`}>
                  {showPyroclasticFlow ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>

            {/* Zona Bahaya Kawah 1.5 km */}
            <button
              onClick={onToggleHazardZones}
              className={`w-full p-2 rounded-xl flex items-center justify-between border transition-all text-[11px] ${
                showHazardZones
                  ? 'bg-red-950/60 border-red-500/50 text-red-200'
                  : 'bg-zinc-950 border-zinc-850 text-zinc-500'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <ShieldAlert className={`w-3.5 h-3.5 ${showHazardZones ? 'text-red-400' : 'text-zinc-600'}`} />
                <span className="font-medium">Perimeter Steril Kawah (Radius 1.5 km KRB III)</span>
              </span>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${showHazardZones ? 'bg-red-900/60 text-red-300' : 'bg-zinc-900 text-zinc-600'}`}>
                {showHazardZones ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
