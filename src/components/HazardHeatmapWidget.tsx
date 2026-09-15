/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Widget Interaktif Peta Panas (Heatmap) Kepadatan Penduduk & Bahaya Pesisir Selat Sunda
 * Memberikan kontrol visualisasi lapisan, mode analisis, legenda gradien,
 * dan ringkasan komputasi dampak sebaran abu vulkanik pada populasi pesisir.
 */

import React, { useState } from 'react';
import {
  Users,
  Waves,
  Flame,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  Layers,
  MapPin,
  Eye,
  Sliders,
  ShieldAlert,
  Wind
} from 'lucide-react';
import {
  CoastalHazardNode,
  NodeEvaluationResult,
  calculateImpactedPopulationSummary
} from '../data/hazardHeatmapData';
import { PlumeParams } from '../types';

export type HeatmapMode = 'composite' | 'population' | 'coastal';

interface HazardHeatmapWidgetProps {
  isVisible: boolean;
  onToggleVisible: (visible: boolean) => void;
  mode: HeatmapMode;
  onChangeMode: (mode: HeatmapMode) => void;
  opacity: number;
  onChangeOpacity: (opacity: number) => void;
  nodes: CoastalHazardNode[];
  plume: PlumeParams;
  onSelectNode?: (node: NodeEvaluationResult) => void;
  selectedNodeId?: string | null;
}

export const HazardHeatmapWidget: React.FC<HazardHeatmapWidgetProps> = ({
  isVisible,
  onToggleVisible,
  mode,
  onChangeMode,
  opacity,
  onChangeOpacity,
  nodes,
  plume,
  onSelectNode,
  selectedNodeId,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [showRankings, setShowRankings] = useState<boolean>(false);

  // Evaluasi seluruh titik terhadap kondisi sebaran abu saat ini
  const summary = calculateImpactedPopulationSummary(nodes, plume);
  const sortedByRisk = [...summary.evaluated].sort(
    (a, b) => b.compositeRiskScore - a.compositeRiskScore
  );

  return (
    <div className="absolute top-16 right-4 z-20 max-w-sm w-80 font-sans text-xs select-none transition-all">
      {/* Main Container */}
      <div className="bg-zinc-950/95 backdrop-blur-md border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200">
        {/* Header Bar */}
        <div className="px-3.5 py-2.5 bg-zinc-900/90 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                isVisible
                  ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)] animate-pulse'
                  : 'bg-zinc-600'
              }`}
            />
            <span className="font-bold text-zinc-100 text-[12px] flex items-center gap-1.5">
              <span>👥</span>
              <span>Heatmap Bahaya & Populasi</span>
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onToggleVisible(!isVisible)}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                isVisible
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
              }`}
            >
              {isVisible ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
              title={isExpanded ? 'Kecilkan Widget' : 'Buka Detail'}
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Collapsible Content */}
        {isExpanded && (
          <div className="p-3 space-y-3">
            {/* Quick Status Banner */}
            <div className="p-2 rounded-xl bg-gradient-to-r from-red-950/40 via-amber-950/30 to-zinc-900 border border-amber-500/30">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-amber-300 font-semibold uppercase tracking-wider flex items-center gap-1">
                  <Wind className="w-3 h-3 text-amber-400" />
                  Koridor Sebaran Abu Aktif
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-200 font-bold">
                  {summary.inPlumeNodes.length} Titik
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-sm font-extrabold text-white font-mono">
                  {summary.totalPopInPlume.toLocaleString('id-ID')}
                </span>
                <span className="text-[10px] text-zinc-400">Jiwa Terancam Paparan</span>
              </div>
              <div className="mt-1 text-[9.5px] text-zinc-400 leading-tight">
                {summary.criticalCount > 0 ? (
                  <span className="text-red-400 font-semibold">
                    ⚠️ {summary.criticalCount} kawasan dalam status KRITIS (tebal abu {'>'} 5mm / padat pesisir).
                  </span>
                ) : (
                  <span>Sebaran abu mengarah ke sektor laut terbuka / kepadatan rendah.</span>
                )}
              </div>
            </div>

            {/* Mode Selection Tabs */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Pilih Mode Visualisasi Heatmap:
              </span>
              <div className="grid grid-cols-3 gap-1 p-0.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <button
                  type="button"
                  onClick={() => onChangeMode('composite')}
                  className={`py-1.5 px-1 rounded-lg text-[10.5px] font-medium transition-all flex flex-col items-center justify-center gap-0.5 ${
                    mode === 'composite'
                      ? 'bg-amber-500 text-black font-bold shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                  title="Gabungan Kepadatan Penduduk + Bahaya Pesisir + Jalur Abu Aktif"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Dampak Abu</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChangeMode('population')}
                  className={`py-1.5 px-1 rounded-lg text-[10.5px] font-medium transition-all flex flex-col items-center justify-center gap-0.5 ${
                    mode === 'population'
                      ? 'bg-amber-500 text-black font-bold shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                  title="Kepadatan Populasi per km² Pesisir Banten & Lampung"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Kepadatan</span>
                </button>

                <button
                  type="button"
                  onClick={() => onChangeMode('coastal')}
                  className={`py-1.5 px-1 rounded-lg text-[10.5px] font-medium transition-all flex flex-col items-center justify-center gap-0.5 ${
                    mode === 'coastal'
                      ? 'bg-amber-500 text-black font-bold shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                  }`}
                  title="Kerentanan Elevasi Rendah Pesisir & Sejarah Tsunami Selat Sunda"
                >
                  <Waves className="w-3.5 h-3.5" />
                  <span>Bahaya Pesisir</span>
                </button>
              </div>
            </div>

            {/* Opacity Slider */}
            <div className="space-y-1 pt-1 border-t border-zinc-800/80">
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span className="flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-zinc-400" />
                  Transparansi Lapisan:
                </span>
                <span className="font-mono text-zinc-200">{Math.round(opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={opacity}
                onChange={(e) => onChangeOpacity(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Gradient Scale Legend */}
            <div className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-800/60 space-y-1.5">
              <div className="flex items-center justify-between text-[9.5px] font-semibold text-zinc-400">
                <span>Skala Intensitas</span>
                <span className="text-zinc-300">
                  {mode === 'composite'
                    ? 'Risiko Komposit'
                    : mode === 'population'
                    ? 'Kepadatan (jiwa/km²)'
                    : 'Kerentanan Pesisir'}
                </span>
              </div>
              <div className="h-2.5 rounded-full w-full bg-gradient-to-r from-emerald-500 via-yellow-400 via-orange-500 to-red-600 shadow-inner" />
              <div className="flex justify-between text-[8.5px] font-mono text-zinc-400">
                <span>Rendah</span>
                <span>Sedang</span>
                <span>Tinggi</span>
                <span className="text-red-400 font-bold">Kritis/Ekstrem</span>
              </div>
            </div>

            {/* Top Vulnerable Rankings Collapsible */}
            <div className="pt-1 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => setShowRankings(!showRankings)}
                className="w-full py-1.5 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-850 text-zinc-300 font-medium text-[10.5px] flex items-center justify-between border border-zinc-800 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Daftar Kawasan Risiko Tertinggi ({sortedByRisk.length})</span>
                </span>
                {showRankings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {showRankings && (
                <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-0.5 no-scrollbar">
                  {sortedByRisk.slice(0, 7).map((item, idx) => {
                    const isSelected = selectedNodeId === item.id;
                    const badgeColor =
                      item.riskCategory === 'KRITIS'
                        ? 'bg-red-950/80 text-red-300 border-red-500/50'
                        : item.riskCategory === 'TINGGI'
                        ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700';

                    return (
                      <div
                        key={item.id}
                        onClick={() => onSelectNode && onSelectNode(item)}
                        className={`p-2 rounded-lg border text-[10px] cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-amber-950/60 border-amber-400 text-white shadow-md'
                            : 'bg-zinc-900/60 border-zinc-800/90 text-zinc-300 hover:bg-zinc-850 hover:text-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="font-semibold text-zinc-100 flex items-center gap-1">
                            <span className="text-zinc-400 font-mono text-[9px]">#{idx + 1}</span>
                            <span className="truncate max-w-[150px]">{item.name}</span>
                          </div>
                          <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-bold border ${badgeColor}`}>
                            {item.riskCategory}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center justify-between text-[9px] text-zinc-400 font-mono">
                          <span>{item.populationTotal.toLocaleString('id-ID')} jiwa ({item.populationDensity}/km²)</span>
                          <span>{item.distKm.toFixed(1)} km</span>
                        </div>

                        {item.inPlumeCone && (
                          <div className="mt-1 text-[8.5px] text-amber-300 flex items-center justify-between font-mono bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40">
                            <span>Abu: ~{item.isopachThicknessMm} mm</span>
                            <span>ETA: {item.etaMinutes} mnt</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Helper Note */}
            <div className="text-[9px] text-zinc-400 leading-normal bg-zinc-900/40 p-2 rounded-lg border border-zinc-850 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
              <span>
                Klik setiap lingkaran heat spot di peta untuk memeriksa detail elevasi pantai, kepadatan per km², dan status paparan abu vulkanik real-time.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
