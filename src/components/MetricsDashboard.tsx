/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BallisticParams, PlumeParams } from '../types';
import { calculateSimulationStats } from '../physics/ballistics';
import { ShieldAlert, CheckCircle2, Zap, Clock, ArrowUpRight, PlaneTakeoff } from 'lucide-react';

interface MetricsDashboardProps {
  ballistic: BallisticParams;
  plume: PlumeParams;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ ballistic, plume }) => {
  const stats = calculateSimulationStats(ballistic);

  const rangeReductionPercent =
    stats.maxRangeIdeal > 0
      ? (((stats.maxRangeIdeal - stats.maxRangeWithDrag) / stats.maxRangeIdeal) * 100).toFixed(1)
      : '0';

  // VONA Color Code based on plume height
  const vonaCode =
    plume.columnHeight > 3000
      ? { badge: 'bg-white text-black font-bold border border-white', text: 'KODE MERAH / BAHAYA' }
      : plume.columnHeight > 1500
      ? { badge: 'bg-zinc-800 text-zinc-100 border border-zinc-700', text: 'ORANGE / WASPADA' }
      : { badge: 'bg-zinc-900 text-zinc-300 border border-zinc-800', text: 'KUNING / NORMAL' };

  const energyMJ = (stats.impactEnergyJoules / 1e6).toFixed(2);
  const tntEquivalentKg = (stats.impactEnergyJoules / 4.184e6).toFixed(2);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. Jangkauan Horizontal Maksimum */}
      <div className="relative group bg-zinc-950 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-4 transition-all shadow-md flex flex-col justify-between overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-white/60 via-zinc-500/20 to-transparent" />
        
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="flex items-center gap-1.5 font-medium text-zinc-200">
            <ArrowUpRight className="w-4 h-4 text-white" />
            Jangkauan Balistik (X)
          </span>
          <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
            RK4 Drag
          </span>
        </div>

        <div className="my-2.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white">
              {(stats.maxRangeWithDrag / 1000).toFixed(2)}
            </span>
            <span className="text-xs font-semibold text-zinc-400 uppercase">km</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] font-mono">
            <span className="text-zinc-400">Vakum: {(stats.maxRangeIdeal / 1000).toFixed(2)} km</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-zinc-900 text-zinc-200 border border-zinc-700">
              -{rangeReductionPercent}%
            </span>
          </div>
        </div>

        <div className="text-[11px] text-zinc-400 border-t border-zinc-850 pt-2 flex items-center justify-between">
          <span>Hambatan Udara:</span>
          <span className="font-mono text-white font-medium">{ballistic.enableAirDrag ? 'Aktif (Cd)' : 'Off'}</span>
        </div>
      </div>

      {/* 2. Ketinggian Maksimum & Waktu Terbang */}
      <div className="relative group bg-zinc-950 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-4 transition-all shadow-md flex flex-col justify-between overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-white/60 via-zinc-500/20 to-transparent" />

        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="flex items-center gap-1.5 font-medium text-zinc-200">
            <Clock className="w-4 h-4 text-white" />
            Apogee & Durasi
          </span>
          <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
            Puncak
          </span>
        </div>

        <div className="my-2.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white">
              {stats.maxAltitudeWithDrag.toFixed(0)}
            </span>
            <span className="text-xs font-semibold text-zinc-400 uppercase">meter</span>
          </div>
          <div className="text-[11px] text-zinc-300 font-mono mt-1 flex items-center gap-1.5">
            <span className="text-white font-medium">{stats.flightTimeWithDrag.toFixed(1)} detik</span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-400">{stats.impactSpeedWithDrag.toFixed(0)} m/s</span>
          </div>
        </div>

        <div className="text-[11px] text-zinc-400 border-t border-zinc-850 pt-2 flex items-center justify-between">
          <span>Ketinggian Kawah:</span>
          <span className="font-mono text-white font-medium">{ballistic.ventElevation} mdpl</span>
        </div>
      </div>

      {/* 3. Energi Kinetik Benturan Bom Vulkanik */}
      <div className="relative group bg-zinc-950 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-4 transition-all shadow-md flex flex-col justify-between overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-white/60 via-zinc-500/20 to-transparent" />

        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="flex items-center gap-1.5 font-medium text-zinc-200">
            <Zap className="w-4 h-4 text-white" />
            Energi Benturan (Ek)
          </span>
          <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800">
            ½mv²
          </span>
        </div>

        <div className="my-2.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white">
              {energyMJ}
            </span>
            <span className="text-xs font-semibold text-zinc-400 uppercase">MJ</span>
          </div>
          <div className="text-[11px] text-zinc-300 font-mono mt-1">
            Ekuivalen: <span className="text-white font-semibold">{tntEquivalentKg} kg</span> TNT
          </div>
        </div>

        <div className="text-[11px] text-zinc-400 border-t border-zinc-850 pt-2 flex items-center justify-between">
          <span>Massa Batuan:</span>
          <span className="font-mono text-white font-medium">{((Math.PI / 6) * Math.pow(ballistic.rockDiameter, 3) * ballistic.rockDensity).toFixed(1)} kg</span>
        </div>
      </div>

      {/* 4. Status Zona Bahaya PVMBG & VONA */}
      <div className="relative group bg-zinc-950 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-4 transition-all shadow-md flex flex-col justify-between overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-white/60 via-zinc-500/20 to-transparent" />

        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="flex items-center gap-1.5 font-medium text-zinc-200">
            <PlaneTakeoff className="w-4 h-4 text-white" />
            VONA & KRB III
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${vonaCode.badge}`}>
            {vonaCode.text.split('/')[0]}
          </span>
        </div>

        <div className="my-2.5">
          {stats.safeDistanceExceeded ? (
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <ShieldAlert className="w-5 h-5 text-white flex-shrink-0" />
              <span>Menembus Batas 5 km</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-zinc-300 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-white flex-shrink-0" />
              <span>Di Dalam Batas 5 km</span>
            </div>
          )}
          <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1">
            {stats.safeDistanceExceeded
              ? 'Lontaran mencapai alur pelayaran Selat Sunda'
              : 'Jatuhan dalam zona isolasi kaldera'}
          </p>
        </div>

        <div className="text-[11px] text-zinc-400 border-t border-zinc-850 pt-2 flex items-center justify-between font-mono">
          <span>Kolom: {plume.columnHeight}m</span>
          <span>Angin: {plume.windSpeed}m/s</span>
        </div>
      </div>
    </div>
  );
};
