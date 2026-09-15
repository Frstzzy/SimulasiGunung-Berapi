/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  Flame,
  Activity,
  Compass,
  Wind,
  ShieldAlert,
  Layers,
  Crosshair,
  TrendingUp,
  Waves,
  Zap,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { BallisticParams, PlumeParams } from '../types';
import { computeBallisticShower, ShowerBomb } from '../physics/ballistics';

interface VolcanicEjectaDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ballistic: BallisticParams;
  plume: PlumeParams;
  onUpdateBallistic?: (partial: Partial<BallisticParams>) => void;
}

export const VolcanicEjectaDetailModal: React.FC<VolcanicEjectaDetailModalProps> = ({
  isOpen,
  onClose,
  ballistic,
  plume,
  onUpdateBallistic,
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'impact' | 'physics' | 'safety'>('inventory');
  const [selectedBombId, setSelectedBombId] = useState<number | null>(null);

  const primaryAzimuth = ballistic.launchAzimuth ?? 90;
  const projectileCount = ballistic.projectileCount ?? 7;
  const dispersionMode = ballistic.dispersionMode ?? 'focused';

  // Compute multi-bomb shower
  const shower = useMemo(() => {
    return computeBallisticShower(
      ballistic,
      primaryAzimuth,
      plume.windSpeed,
      plume.windDirection,
      projectileCount,
      dispersionMode
    );
  }, [ballistic, primaryAzimuth, plume.windSpeed, plume.windDirection, projectileCount, dispersionMode]);

  // Ensure a selected bomb exists
  const activeBomb: ShowerBomb = useMemo(() => {
    if (selectedBombId !== null) {
      const found = shower.find((b) => b.id === selectedBombId);
      if (found) return found;
    }
    return shower[0] || ({} as ShowerBomb);
  }, [shower, selectedBombId]);

  if (!isOpen) return null;

  // Aggregate metrics
  const maxRangeMeters = Math.max(...shower.map((b) => b.traj.maxRange));
  const maxRangeKm = maxRangeMeters / 1000;
  const maxAltitudeMeters = Math.max(...shower.map((b) => b.traj.maxAltitude));
  const totalImpactEnergyMJ = shower.reduce((acc, b) => acc + b.traj.impactEnergy / 1e6, 0);
  const totalMassKg = shower.reduce((acc, b) => acc + b.rockMassKg, 0);
  const anyBreached5km = shower.some((b) => b.traj.maxRange >= 5000);

  // Helper for compass point
  const getCompassDirection = (deg: number): string => {
    const norm = ((deg % 360) + 360) % 360;
    const pts = ['U', 'TL', 'T', 'TG', 'S', 'BD', 'B', 'BL'];
    const idx = Math.round(norm / 45) % 8;
    return pts[idx];
  };

  // Helper to describe bomb type from diameter
  const getBombType = (diameterM: number, index: number): { name: string; desc: string } => {
    if (index === 0) return { name: 'Bom Magmatik Primer', desc: 'Blok vesikular andesit dari pusat kubah lava kawah' };
    if (diameterM >= 0.8) return { name: 'Bom Kerak Roti (Breadcrust)', desc: 'Ekspansi gas internal saat pendinginan cepat di udara' };
    if (diameterM >= 0.4) return { name: 'Bom Spindle (Fusiform)', desc: 'Pilin memanjang akibat rotasi aerodinamik saat plastis' };
    if (diameterM >= 0.15) return { name: 'Blok Litik Bersudut', desc: 'Serpihan dinding kaldera yang terfragmentasi ledakan' };
    return { name: 'Lapili Kasar (Coarse Scoria)', desc: 'Fragmen berpori kaya gas dengan kecepatan terminal tinggi' };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-200 font-sans">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center shadow-lg">
              <Flame className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Detail Lemparan Proyektil & Katalog Bom Vulkanik
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-white border border-zinc-700">
                  {shower.length} Proyektil
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Karakteristik Fragmentasi Piroklastik, Kinematika 3D RK4, dan Dampak Benturan Kaldera Krakatau
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QUICK STATS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-5 py-2.5 bg-black border-b border-zinc-850 font-mono text-[11px]">
          <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
            <span className="text-zinc-400 text-[10px] block">Jangkauan Terjauh (Rₘₐₓ)</span>
            <span className="text-white font-bold text-sm">
              {maxRangeKm.toFixed(2)} km <span className="text-[10px] text-zinc-400">({maxRangeMeters.toFixed(0)} m)</span>
            </span>
          </div>
          <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
            <span className="text-zinc-400 text-[10px] block">Ketinggian Puncak (Apogee)</span>
            <span className="text-white font-bold text-sm">
              {maxAltitudeMeters.toFixed(0)} m <span className="text-[10px] text-zinc-400">dpl</span>
            </span>
          </div>
          <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
            <span className="text-zinc-400 text-[10px] block">Total Energi Benturan (Σ Ek)</span>
            <span className="text-amber-400 font-bold text-sm">
              {totalImpactEnergyMJ.toFixed(1)} MJ <span className="text-[10px] text-zinc-400">({(totalImpactEnergyMJ / 4.184).toFixed(1)} kg TNT)</span>
            </span>
          </div>
          <div className="p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80">
            <span className="text-zinc-400 text-[10px] block">Status Radius Steril PVMBG (5 km)</span>
            <span className={`font-bold text-sm flex items-center gap-1 ${anyBreached5km ? 'text-red-400' : 'text-emerald-400'}`}>
              {anyBreached5km ? '⚠️ Menembus 5 km' : '✓ Di Dalam 5 km'}
            </span>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex border-b border-zinc-800 bg-zinc-950 px-5 gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'inventory', label: '1. Katalog & Telemetri Proyektil', icon: Layers },
            { id: 'impact', label: '2. Kawah Impak & Gelombang Air', icon: Waves },
            { id: 'physics', label: '3. Fisika RK4 & Drag Aerodinamis', icon: Activity },
            { id: 'safety', label: '4. Zonasi Bahaya PVMBG & Mitigasi', icon: ShieldAlert },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
                  isSelected
                    ? 'border-white text-white font-bold bg-zinc-900/60'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/30'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* MODAL CONTENT CONTAINER */}
        <div className="p-5 sm:p-6 overflow-y-auto max-h-[64vh] space-y-6 text-xs sm:text-sm">
          {/* TAB 1: INVENTORY & TELEMETRY TABLE */}
          {activeTab === 'inventory' && (
            <div className="space-y-5">
              {/* Quick Shower Parameter Adjuster */}
              {onUpdateBallistic && (
                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                      Konfigurasi Lontaran:
                    </span>
                    <div className="flex items-center gap-1">
                      {[3, 5, 7, 10, 12].map((cnt) => (
                        <button
                          key={cnt}
                          onClick={() => onUpdateBallistic({ projectileCount: cnt })}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-all ${
                            projectileCount === cnt
                              ? 'bg-white text-black font-bold border-white'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                          }`}
                        >
                          {cnt} Bom
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 text-[11px]">Mode Sebaran:</span>
                    <button
                      onClick={() => onUpdateBallistic({ dispersionMode: 'focused' })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                        dispersionMode === 'focused'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      🎯 Kerucut Terarah (±35°)
                    </button>
                    <button
                      onClick={() => onUpdateBallistic({ dispersionMode: 'radial' })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                        dispersionMode === 'radial'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      🔄 Radial 360°
                    </button>
                  </div>
                </div>
              )}

              {/* Data Table */}
              <div className="overflow-x-auto rounded-xl border border-zinc-800">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-zinc-900 text-zinc-300 font-mono text-[11px] border-b border-zinc-800">
                    <tr>
                      <th className="p-3">ID & Tipe</th>
                      <th className="p-3">Diameter & Massa</th>
                      <th className="p-3">Elevasi & Azimut</th>
                      <th className="p-3">Kecepatan Awal (v₀)</th>
                      <th className="p-3">Puncak (Apogee)</th>
                      <th className="p-3">Waktu Terbang</th>
                      <th className="p-3">Jarak Jatuh (R)</th>
                      <th className="p-3">V. Impak</th>
                      <th className="p-3">Energi Impak</th>
                      <th className="p-3">Status KRB</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850 font-mono text-[11px] text-zinc-300">
                    {shower.map((bomb, idx) => {
                      const isSelected = activeBomb.id === bomb.id;
                      const typeInfo = getBombType(bomb.rockDiameter, idx);
                      const isBreached = bomb.traj.maxRange >= 5000;
                      const energyMJ = bomb.traj.impactEnergy / 1e6;

                      return (
                        <tr
                          key={bomb.id}
                          onClick={() => setSelectedBombId(bomb.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-zinc-800/80 text-white font-semibold'
                              : 'bg-zinc-950/60 hover:bg-zinc-900/60'
                          }`}
                        >
                          <td className="p-3 font-sans">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-white/50 shadow-sm"
                                style={{ backgroundColor: bomb.color }}
                              />
                              <div>
                                <span className="font-bold text-white block">
                                  #{idx + 1} {typeInfo.name.split(' ')[0]}
                                </span>
                                <span className="text-[9px] text-zinc-400 font-mono block">
                                  {typeInfo.name}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="text-white font-bold">{(bomb.rockDiameter * 100).toFixed(0)} cm</span>
                            <span className="text-zinc-400 block text-[10px]">{bomb.rockMassKg.toFixed(1)} kg</span>
                          </td>
                          <td className="p-3">
                            <span className="text-zinc-200">{bomb.launchAngle.toFixed(1)}°</span>
                            <span className="text-zinc-400 block text-[10px]">
                              {bomb.launchAzimuth.toFixed(0)}° ({getCompassDirection(bomb.launchAzimuth)})
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="text-white font-bold">{bomb.initialVelocity.toFixed(0)} m/s</span>
                            <span className="text-zinc-400 block text-[10px]">
                              {((bomb.initialVelocity * 3.6)).toFixed(0)} km/j
                            </span>
                          </td>
                          <td className="p-3 text-white">
                            {bomb.traj.maxAltitude.toFixed(0)} m
                          </td>
                          <td className="p-3 text-zinc-300">
                            {bomb.traj.flightTime.toFixed(1)} dtk
                          </td>
                          <td className="p-3">
                            <span className="text-white font-bold">{(bomb.traj.maxRange / 1000).toFixed(2)} km</span>
                            <span className="text-zinc-400 block text-[10px]">{bomb.traj.maxRange.toFixed(0)} m</span>
                          </td>
                          <td className="p-3 text-zinc-300">
                            {bomb.traj.impactSpeed.toFixed(0)} m/s
                          </td>
                          <td className="p-3">
                            <span className="text-amber-400 font-bold">{energyMJ.toFixed(2)} MJ</span>
                            <span className="text-zinc-400 block text-[10px]">
                              {(energyMJ / 4.184).toFixed(2)} kg TNT
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isBreached
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              }`}
                            >
                              {isBreached ? '⚠️ >5 km' : '✓ Aman'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Selected Bomb Trajectory Curve Profile */}
              {activeBomb.traj && (
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white"
                        style={{ backgroundColor: activeBomb.color }}
                      />
                      <h4 className="font-bold text-white text-sm">
                        Profil Lintasan Proyektil Terpilih: {activeBomb.label} ({(activeBomb.rockDiameter * 100).toFixed(0)} cm • {activeBomb.rockMassKg.toFixed(1)} kg)
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-400">
                      Elevasi: {activeBomb.launchAngle.toFixed(1)}° | Azimut: {activeBomb.launchAzimuth.toFixed(0)}° ({getCompassDirection(activeBomb.launchAzimuth)})
                    </span>
                  </div>

                  {/* SVG Trajectory Visualization */}
                  <div className="h-44 w-full bg-black rounded-lg border border-zinc-800/80 p-2 relative flex flex-col justify-end">
                    <svg className="w-full h-full overflow-visible">
                      {/* Grid Lines */}
                      <line x1="0%" y1="25%" x2="100%" y2="25%" stroke="#27272a" strokeDasharray="3 3" />
                      <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="#27272a" strokeDasharray="3 3" />
                      <line x1="0%" y1="75%" x2="100%" y2="75%" stroke="#27272a" strokeDasharray="3 3" />
                      
                      {/* 5 km danger boundary marker */}
                      {maxRangeMeters > 0 && (
                        <g>
                          <line
                            x1={`${Math.min(98, (5000 / (maxRangeMeters * 1.15)) * 100)}%`}
                            y1="0"
                            x2={`${Math.min(98, (5000 / (maxRangeMeters * 1.15)) * 100)}%`}
                            y2="100%"
                            stroke="#ef4444"
                            strokeWidth="1.5"
                            strokeDasharray="4 4"
                          />
                          <text
                            x={`${Math.min(96, (5000 / (maxRangeMeters * 1.15)) * 100)}%`}
                            y="18"
                            fill="#ef4444"
                            fontSize="9"
                            fontFamily="monospace"
                            textAnchor="end"
                          >
                            Batas 5 km PVMBG
                          </text>
                        </g>
                      )}

                      {/* Trajectory Polyline */}
                      {(() => {
                        const pts = activeBomb.traj.points;
                        if (!pts || pts.length === 0) return null;
                        const maxR = Math.max(100, maxRangeMeters * 1.15);
                        const maxA = Math.max(100, maxAltitudeMeters * 1.2);

                        const pathData = pts
                          .map((p, i) => {
                            const r = Math.hypot(p.x, p.z);
                            const svgX = (r / maxR) * 100;
                            const svgY = 100 - (p.y / maxA) * 100;
                            return `${i === 0 ? 'M' : 'L'} ${svgX}% ${svgY}%`;
                          })
                          .join(' ');

                        return (
                          <>
                            <path
                              d={pathData}
                              fill="none"
                              stroke={activeBomb.color}
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />
                            {/* Crater launch point */}
                            <circle cx="0%" cy={`${100 - (157 / maxA) * 100}%`} r="4" fill="#ffffff" />
                            {/* Impact point */}
                            {pts.length > 0 && (
                              <circle
                                cx={`${(activeBomb.traj.maxRange / maxR) * 100}%`}
                                cy="100%"
                                r="5"
                                fill="#ef4444"
                              />
                            )}
                          </>
                        );
                      })()}
                    </svg>

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono pt-1">
                      <span>Kawah Vent (157 mdpl)</span>
                      <span>Puncak Apogee: {activeBomb.traj.maxAltitude.toFixed(0)} m</span>
                      <span>Titik Jatuh: {(activeBomb.traj.maxRange / 1000).toFixed(2)} km</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: IMPACT CRATERING & LOCAL TSUNAMI RISK */}
          {activeTab === 'impact' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                <h4 className="font-bold text-white font-sans text-sm flex items-center gap-2">
                  <Waves className="w-4 h-4 text-sky-400" />
                  Mekanika Benturan Piroklastik ke Air Laut Kaldera Krakatau
                </h4>
                <p className="text-zinc-300 font-sans leading-relaxed text-xs">
                  Karena Gunung Anak Krakatau dikelilingi langsung oleh perairan laut kaldera Selat Sunda dengan kedalaman 10 – 120 meter, mayoritas bom vulkanik dan bongkah piroklastik jatuh langsung ke permukaan laut (<em>marine impact</em>). Benturan ini menghasilkan fenomena hidrodinamik ekstrem:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
                <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2">
                  <span className="text-amber-400 font-bold text-xs flex items-center gap-1.5">
                    <span>💥</span> Kawah Air Transien (Transient Cavity)
                  </span>
                  <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                    Energi benturan sebesar <strong>{(activeBomb.traj.impactEnergy / 1e6).toFixed(2)} MJ</strong> membuka rongga air sementara dengan estimasi diameter:
                  </p>
                  <div className="p-2 bg-black rounded border border-zinc-800 text-center font-bold text-white">
                    {"D_kawah ≈ 0.05 × (E_k)^(0.28) ≈ " + (0.05 * Math.pow(activeBomb.traj.impactEnergy, 0.28)).toFixed(1) + " meter"}
                  </div>
                  <p className="text-[10px] text-zinc-400 font-sans">
                    Rongga air runtuh kembali dalam beberapa detik, memicu semburan jet air vertikal (<em>Worthington jet</em>) setinggi 10 – 40 meter.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2">
                  <span className="text-sky-400 font-bold text-xs flex items-center gap-1.5">
                    <span>🌊</span> Pemicu Gelombang Kejut & Tsunami Mikro
                  </span>
                  <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                    Saat shower berisi puluhan bom vulkanik berbobot total <strong>{totalMassKg.toFixed(0)} kg</strong> menghantam laut secara serentak, terbentuk riak gelombang kejut radial yang menyebar dengan kecepatan <strong>v = √(g·h) ≈ 15 – 30 m/s</strong> (50 – 100 km/j).
                  </p>
                  <p className="text-[10px] text-zinc-400 font-sans">
                    Gelombang ini berbahaya bagi perahu nelayan tradisional, kapal survei vulkanologi, dan instalasi pantai di Pulau Sertung dan Pulau Panjang.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2">
                  <span className="text-red-400 font-bold text-xs flex items-center gap-1.5">
                    <span>🌋</span> Erupsi Freatomagmatik Sekunder
                  </span>
                  <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                    Bom vulkanik pijar yang bersuhu <strong>700°C – 1.050°C</strong> memicu ledakan uap air laut sekunder (<em>steam explosion</em>) saat terendam, menyemburkan kabut uap panas dan aerosol asam klorida (HCl).
                  </p>
                  <p className="text-[10px] text-zinc-400 font-sans">
                    Proses pendinginan kejut (*thermal shock*) menyebabkan bom pecah berkeping-keping menjadi serpihan abu tajam berukuran lapili dan pasir hitam.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RK4 PHYSICS & AERODYNAMIC DRAG */}
          {activeTab === 'physics' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                <h4 className="font-bold text-white font-sans text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Persamaan Diferensial Gerak Trajektori 3D (Metode RK4)
                </h4>
                <p className="text-zinc-300 font-sans leading-relaxed text-xs">
                  Lintasan setiap bom vulkanik diselesaikan secara numerik menggunakan metode <strong>Runge-Kutta Orde 4 (RK4)</strong> dengan langkah waktu dt = 0.05 detik, memperhitungkan percepatan gravitasi bumi dan gaya gesek aerodinamis atmosfer non-linear:
                </p>
                <div className="p-3 bg-black rounded-lg border border-zinc-800 text-amber-300 font-bold text-center">
                  {"m · (d²r / dt²) = m · g - (1/2) · ρ_udara(y) · C_d · A · |v - v_angin| · (v - v_angin)"}
                </div>
                <div className="text-[11px] text-zinc-400 space-y-1.5">
                  <div>• <strong>m</strong>: Massa bom vulkanik ({activeBomb.rockMassKg.toFixed(1)} kg) berdasarkan densitas {ballistic.rockDensity} kg/m³</div>
                  <div>• <strong>A</strong>: Luas penampang lintang efektif (π · r² = {(Math.PI * Math.pow(activeBomb.rockDiameter / 2, 2)).toFixed(3)} m²)</div>
                  <div>• <strong>C_d</strong>: Koefisien hambat aerodinamik ({ballistic.dragCoefficient} untuk fragmen batuan bersudut tak teratur)</div>
                  <div>• <strong>ρ_udara(y)</strong>: Densitas udara barometrik atmosfer = ρ₀ · exp(-y / 8500m)</div>
                  <div>• <strong>v_angin</strong>: Vektor kecepatan angin 3D ({plume.windSpeed} m/s dari arah {plume.windDirection}°)</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                <h4 className="font-bold text-white font-sans text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-sky-400" />
                  Mengapa Hambatan Udara Sangat Membatasi Jangkauan?
                </h4>
                <p className="text-zinc-300 font-sans leading-relaxed text-xs">
                  Dalam ruang hampa ideal (<em>parabola tanpa gesekan udara</em>), jangkauan bom dengan kecepatan v₀ = {ballistic.initialVelocity} m/s pada sudut 45° dapat mencapai <strong>{(Math.pow(ballistic.initialVelocity, 2) / 9.81 / 1000).toFixed(2)} km</strong>. Namun karena gaya gesek udara sebanding dengan kuadrat kecepatan (v²), jangkauan riil terpangkas drastis menjadi <strong>{(activeBomb.traj.maxRange / 1000).toFixed(2)} km</strong> (berkurang ~{(100 - (activeBomb.traj.maxRange / (Math.pow(ballistic.initialVelocity, 2) / 9.81)) * 100).toFixed(0)}%).
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: SAFETY & MITIGATION */}
          {activeTab === 'safety' && (
            <div className="space-y-4 font-sans text-xs">
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  Rasional Ilmiah Radius Steril 5.0 km PVMBG
                </div>
                <p className="text-zinc-300 leading-relaxed text-xs">
                  Pusat Vulkanologi dan Mitigasi Bencana Geologi (PVMBG) menetapkan zona steril <strong>Radius 5 km</strong> dari kawah aktif Gunung Anak Krakatau untuk Status Level III (Siaga). Berdasarkan hasil simulasi ini:
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">Jangkauan Fragmen Berat (Bom & Blok):</strong>
                    <span className="text-zinc-400 text-[11px] leading-relaxed block">
                      Bom vulkanik berdiameter &gt; 20 cm memiliki momentum tinggi yang mampu menjangkau radius 1.5 – 3.8 km dari kawah, melintasi seluruh daratan pulau Anak Krakatau dan perairan sekitarnya.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">Ancaman terhadap Pulau Sertung & Pulau Panjang:</strong>
                    <span className="text-zinc-400 text-[11px] leading-relaxed block">
                      Jarak pulau tetangga (P. Sertung 3.2 km, P. Panjang 2.8 km, P. Rakata 4.5 km) berada tepat di ambang batas jangkauan bom balistik saat kecepatan lontaran mencapai &gt; 200 m/s. Kawasan ini mutlak tidak aman untuk aktivitas manusia.
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block">Keselamatan Pulau Sebesi (19 km):</strong>
                    <span className="text-zinc-400 text-[11px] leading-relaxed block">
                      Pulau Sebesi yang berpenghuni berada di luar jangkauan balistik bom batuan ({maxRangeKm.toFixed(1)} km &lt; 19 km). Namun, bahaya utama bagi Pulau Sebesi adalah <strong>hujan abu vulkanik lebat, lapili halus, dan potensi tsunami runtuhan lereng</strong>.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="flex flex-wrap items-center justify-between px-5 py-3 border-t border-zinc-800 bg-zinc-900/80 text-xs">
          <div className="flex items-center gap-2 text-zinc-400 font-mono text-[11px]">
            <span>Densitas Batuan: <strong className="text-white">{ballistic.rockDensity} kg/m³</strong></span>
            <span>•</span>
            <span>Koefisien Drag: <strong className="text-white">{ballistic.dragCoefficient}</strong></span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white text-black font-semibold hover:bg-zinc-200 transition-colors shadow-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
