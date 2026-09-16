/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Komponen Cek Dampak Wilayah & Bandara (Mengadopsi indikator 'abu.cikoytew.my.id')
 * Memungkinkan pengguna memeriksa status ancaman abu vulkanik dan gas SO2
 * pada bandara komersial (CGK, TKG), pelabuhan feri (Merak, Bakauheni), serta kota-kota strategis.
 */

import React, { useState } from 'react';
import {
  Search,
  Plane,
  Anchor,
  Building2,
  Factory,
  Compass,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wind,
  ShieldAlert,
  Flame,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import {
  REGIONAL_INFRASTRUCTURES,
  RegionalInfrastructure,
  InfrastructureImpactStatus,
  evaluateInfrastructureImpact,
  FlightLevelKey
} from '../data/regionalInfrastructureData';
import { PlumeParams } from '../types';

interface RegionalImpactCheckerProps {
  plume: PlumeParams;
  forecastHours: number;
  selectedFlightLevel: FlightLevelKey;
  onFocusLocation: (coords: [number, number], zoom: number) => void;
  selectedLocationId?: string | null;
}

export const RegionalImpactChecker: React.FC<RegionalImpactCheckerProps> = ({
  plume,
  forecastHours,
  selectedFlightLevel,
  onFocusLocation,
  selectedLocationId,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Evaluasi seluruh infrastruktur
  const evaluatedItems: InfrastructureImpactStatus[] = REGIONAL_INFRASTRUCTURES.map((item) =>
    evaluateInfrastructureImpact(item, plume, forecastHours, selectedFlightLevel)
  );

  // Filter berdasarkan search query dan tipe
  const filtered = evaluatedItems.filter((entry) => {
    const matchesSearch =
      entry.item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.item.province.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'ALL' || entry.item.type === filterType;
    return matchesSearch && matchesType;
  });

  // Urutkan: KRITIS duluan, lalu WASPADA, MONITOR, AMAN
  const severityOrder: Record<string, number> = { KRITIS: 0, WASPADA: 1, MONITOR: 2, AMAN: 3 };
  filtered.sort((a, b) => severityOrder[a.threatLevel] - severityOrder[b.threatLevel] || a.item.distKm - b.item.distKm);

  // Hitung ringkasan
  const criticalCount = evaluatedItems.filter((e) => e.threatLevel === 'KRITIS').length;
  const warningCount = evaluatedItems.filter((e) => e.threatLevel === 'WASPADA').length;
  const safeCount = evaluatedItems.filter((e) => e.threatLevel === 'AMAN').length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'airport':
        return <Plane className="w-3.5 h-3.5 text-sky-400" />;
      case 'seaport':
        return <Anchor className="w-3.5 h-3.5 text-cyan-400" />;
      case 'city':
        return <Building2 className="w-3.5 h-3.5 text-amber-400" />;
      case 'industry':
        return <Factory className="w-3.5 h-3.5 text-orange-400" />;
      default:
        return <Compass className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  const getBadgeStyle = (level: string) => {
    switch (level) {
      case 'KRITIS':
        return 'bg-red-950/80 text-red-300 border-red-500/50 shadow-red-950/50';
      case 'WASPADA':
        return 'bg-amber-950/80 text-amber-300 border-amber-500/50';
      case 'MONITOR':
        return 'bg-sky-950/80 text-sky-300 border-sky-500/50';
      default:
        return 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <div className="space-y-3 font-sans text-xs">
      {/* Header Summary Banner (Ala Cikoytew) */}
      <div className="p-3 rounded-xl bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border border-zinc-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-zinc-200 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Prakiraan Dampak Wilayah ({forecastHours} Jam)</span>
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
            Angin: {plume.windSpeed} m/s
          </span>
        </div>

        {/* Status Counters */}
        <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[10px]">
          <div className="p-1.5 rounded-lg bg-red-950/40 border border-red-800/40">
            <span className="text-red-400 font-bold text-sm block">{criticalCount}</span>
            <span className="text-[9px] text-zinc-400">Kritis (Terdampak)</span>
          </div>
          <div className="p-1.5 rounded-lg bg-amber-950/40 border border-amber-800/40">
            <span className="text-amber-400 font-bold text-sm block">{warningCount}</span>
            <span className="text-[9px] text-zinc-400">Waspada Koridor</span>
          </div>
          <div className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40">
            <span className="text-emerald-400 font-bold text-sm block">{safeCount}</span>
            <span className="text-[9px] text-zinc-400">Aman Terkendali</span>
          </div>
        </div>

        <p className="text-[9.5px] text-zinc-400 leading-relaxed">
          Pengecekan otomatis ruang udara bandara (ICAO), pelabuhan penyeberangan Selat Sunda, dan kota besar berdasarkan hembusan awan abu dan gas SO₂.
        </p>
      </div>

      {/* Search Bar & Quick Chips */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari bandara, pelabuhan, atau kota (cth: CGK, Merak, Cilegon)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-zinc-900/90 border border-zinc-800 rounded-xl text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-400/80 text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5 text-[10px]">
          {[
            { id: 'ALL', label: 'Semua' },
            { id: 'airport', label: '✈️ Bandara' },
            { id: 'seaport', label: '⚓ Pelabuhan' },
            { id: 'city', label: '🏙️ Kota' },
            { id: 'tourism', label: '🏖️ Wisata' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterType(cat.id)}
              className={`px-2 py-0.5 rounded-lg whitespace-nowrap border transition-all ${
                filterType === cat.id
                  ? 'bg-zinc-200 text-black border-white font-bold'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* List of Evaluated Locations */}
      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-0.5 no-scrollbar">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-zinc-500 text-xs bg-zinc-900/40 rounded-xl border border-zinc-850">
            Tidak ada lokasi yang cocok dengan pencarian "{searchQuery}"
          </div>
        ) : (
          filtered.map((entry) => {
            const isSelected = selectedLocationId === entry.item.id;
            return (
              <div
                key={entry.item.id}
                className={`p-2.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-zinc-900 border-amber-400/80 ring-1 ring-amber-400/30'
                    : 'bg-zinc-950/70 border-zinc-800/80 hover:bg-zinc-900/60 hover:border-zinc-700'
                }`}
              >
                {/* Title and Badge */}
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-start gap-1.5">
                    <span className="mt-0.5 p-1 rounded-lg bg-zinc-900 border border-zinc-800">
                      {getTypeIcon(entry.item.type)}
                    </span>
                    <div>
                      <div className="font-semibold text-zinc-100 text-[11.5px] flex items-center gap-1.5">
                        <span>{entry.item.name}</span>
                      </div>
                      <div className="text-[9.5px] text-zinc-400 flex items-center gap-1">
                        <span className="font-mono text-zinc-300 font-bold">{entry.item.code}</span>
                        <span>•</span>
                        <span>{entry.item.province}</span>
                      </div>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold font-mono border ${getBadgeStyle(entry.threatLevel)}`}>
                    {entry.threatLevel}
                  </span>
                </div>

                {/* Distance and ETA metrics */}
                <div className="mt-2 grid grid-cols-3 gap-1 p-1.5 rounded-lg bg-zinc-900/80 border border-zinc-850 text-[9.5px] font-mono">
                  <div>
                    <span className="text-zinc-500 block text-[8.5px]">Jarak Kawah:</span>
                    <strong className="text-zinc-200">{entry.item.distKm} km</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[8.5px]">Arah Azimuth:</span>
                    <strong className="text-zinc-200">{entry.item.bearingDeg}° ({entry.item.bearingCardinal})</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[8.5px]">Estimasi Tiba (ETA):</span>
                    <strong className={entry.inPlumeCone ? 'text-amber-300' : 'text-zinc-400'}>
                      {entry.inPlumeCone ? `T+${entry.etaHours} Jam` : '–'}
                    </strong>
                  </div>
                </div>

                {/* Gas SO2 and Ash Thickness when in plume */}
                {entry.inPlumeCone && (
                  <div className="mt-1.5 flex items-center justify-between text-[9px] font-mono px-2 py-1 rounded bg-amber-950/20 border border-amber-500/20 text-amber-200">
                    <span className="flex items-center gap-1">
                      <span>☁️ Tebal Abu:</span>
                      <strong className="text-white">~{entry.estimatedAshThicknessMm} mm</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <span>🧪 Gas SO₂:</span>
                      <strong className="text-purple-300">{entry.estimatedSo2Du} DU</strong>
                    </span>
                  </div>
                )}

                {/* Recommendation Note */}
                <p className="mt-1.5 text-[9px] text-zinc-400 leading-snug">
                  {entry.recommendation}
                </p>

                {/* Focus Button */}
                <div className="mt-2 pt-1.5 border-t border-zinc-850 flex items-center justify-between">
                  <span className="text-[8.5px] text-zinc-400 truncate max-w-[180px]">
                    {entry.item.populationOrCapacity}
                  </span>
                  <button
                    type="button"
                    onClick={() => onFocusLocation(entry.item.coords, 12)}
                    className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-[9.5px] font-medium transition-colors flex items-center gap-1"
                  >
                    <span>Fokus di Peta</span>
                    <ChevronRight className="w-3 h-3 text-zinc-400" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
