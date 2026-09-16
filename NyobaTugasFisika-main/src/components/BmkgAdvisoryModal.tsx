/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Komponen Modal & Dashboard Komprehensif:
 * Data Resmi BMKG & Rincian Daerah Terdampak Sebaran Abu Vulkanik Selat Sunda
 */

import React, { useState } from 'react';
import {
  ShieldAlert,
  Wind,
  Layers,
  FileText,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Send,
  Download,
  Copy,
  Check,
  Search,
  Users,
  Compass,
  Radio,
  ExternalLink,
  ChevronRight,
  Info,
  X,
  Gauge
} from 'lucide-react';
import {
  BMKG_AFFECTED_AREAS,
  BMKG_UPPER_AIR_PROFILE,
  BMKG_SIGMET_SCENARIOS,
  BmkgAffectedArea,
  BmkgSigmetScenario,
  generateRawBmkgSigmetText,
} from '../data/bmkgData';
import { PlumeParams, BallisticParams } from '../types';

function getCardinalFromDegree(deg: number): string {
  const directions = ['U', 'TL', 'T', 'TG', 'S', 'BD', 'B', 'BL'];
  const index = Math.round(((deg % 360) + 360) % 360 / 45) % 8;
  return directions[index];
}

interface BmkgAdvisoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlume: PlumeParams;
  onApplyBmkgScenario?: (scenario: BmkgSigmetScenario) => void;
  onFocusAreaOnMap?: (coords: [number, number], zoom: number) => void;
}

export const BmkgAdvisoryModal: React.FC<BmkgAdvisoryModalProps> = ({
  isOpen,
  onClose,
  currentPlume,
  onApplyBmkgScenario,
  onFocusAreaOnMap,
}) => {
  const [activeTab, setActiveTab] = useState<'areas' | 'sigmet' | 'upperair' | 'sop'>('areas');
  const [selectedProvinceFilter, setSelectedProvinceFilter] = useState<'all' | 'Banten' | 'Lampung' | 'Selat Sunda / Perairan Internasional'>('all');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAreaId, setSelectedAreaId] = useState<string>(BMKG_AFFECTED_AREAS[1].id); // Default: P. Sebesi
  const [activeScenarioId, setActiveScenarioId] = useState<string>(BMKG_SIGMET_SCENARIOS[1].id); // Default: West Monsoon
  const [copiedText, setCopiedText] = useState<boolean>(false);

  if (!isOpen) return null;

  const activeScenario = BMKG_SIGMET_SCENARIOS.find((s) => s.id === activeScenarioId) || BMKG_SIGMET_SCENARIOS[0];
  const selectedArea = BMKG_AFFECTED_AREAS.find((a) => a.id === selectedAreaId) || BMKG_AFFECTED_AREAS[0];

  // Filtered areas
  const filteredAreas = BMKG_AFFECTED_AREAS.filter((area) => {
    const matchesProvince = selectedProvinceFilter === 'all' || area.province === selectedProvinceFilter;
    const matchesRisk = selectedRiskFilter === 'all' || area.defaultRiskLevel === selectedRiskFilter;
    const matchesSearch =
      area.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      area.regency.toLowerCase().includes(searchQuery.toLowerCase()) ||
      area.criticalAssets.some((asset) => asset.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesProvince && matchesRisk && matchesSearch;
  });

  const rawSigmetText = generateRawBmkgSigmetText(activeScenario);

  const handleCopySigmet = () => {
    navigator.clipboard.writeText(rawSigmetText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleApply = (scenario: BmkgSigmetScenario) => {
    if (onApplyBmkgScenario) {
      onApplyBmkgScenario(scenario);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200 font-sans">
      <div className="relative w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-black/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center font-bold text-sm shadow-md">
              <Radio className="w-5 h-5 text-black animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Pusat Data BMKG & Daerah Terdampak
                </h3>
                <span className="bg-zinc-800 text-zinc-300 font-mono text-[10px] px-2 py-0.5 rounded border border-zinc-700">
                  BMKG Aviation & PVMBG Feeds
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Data resmi buletin SIGMET, profil atmosfer lapisan atas, dan registri risiko kawasan Selat Sunda
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors"
            title="Tutup Modal Data BMKG"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-5 py-2.5 bg-zinc-900/60 border-b border-zinc-800 overflow-x-auto no-scrollbar text-xs">
          <button
            onClick={() => setActiveTab('areas')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'areas'
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Daftar Daerah Terdampak ({BMKG_AFFECTED_AREAS.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('sigmet')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'sigmet'
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Buletin SIGMET & VONA BMKG</span>
          </button>

          <button
            onClick={() => setActiveTab('upperair')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'upperair'
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Wind className="w-3.5 h-3.5" />
            <span>Profil Angin Upper-Air Sounding</span>
          </button>

          <button
            onClick={() => setActiveTab('sop')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'sop'
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Protokol Mitigasi BPBD / BMKG</span>
          </button>
        </div>

        {/* Tab 1: DAFTAR DAERAH TERDAMPAK */}
        {activeTab === 'areas' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/80 p-3 rounded-xl border border-zinc-850">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Cari nama daerah, kabupaten, atau aset kritis..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-black rounded-lg border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                />
              </div>

              {/* Province Filter Pills */}
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-zinc-400 mr-1 hidden sm:inline">Wilayah:</span>
                {(['all', 'Banten', 'Lampung', 'Selat Sunda / Perairan Internasional'] as const).map((prov) => (
                  <button
                    key={prov}
                    onClick={() => setSelectedProvinceFilter(prov)}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      selectedProvinceFilter === prov
                        ? 'bg-zinc-700 text-white font-bold'
                        : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-850'
                    }`}
                  >
                    {prov === 'all' ? 'Semua' : prov === 'Selat Sunda / Perairan Internasional' ? 'Selat Sunda' : prov}
                  </button>
                ))}
              </div>

              {/* Risk Level Filter Pills */}
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-zinc-400 mr-1 hidden sm:inline">Risiko:</span>
                {['all', 'KRITIS', 'TINGGI', 'SEDANG', 'WASPADA'].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setSelectedRiskFilter(lvl)}
                    className={`px-2 py-1 rounded-md font-mono text-[10px] transition-colors ${
                      selectedRiskFilter === lvl
                        ? 'bg-white text-black font-bold'
                        : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-850'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Split Master-Detail Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left Column: Area Cards List */}
              <div className="lg:col-span-5 space-y-2 max-h-[480px] overflow-y-auto pr-1 no-scrollbar">
                {filteredAreas.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 text-xs bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800">
                    Tidak ada daerah yang cocok dengan filter pencarian Anda.
                  </div>
                ) : (
                  filteredAreas.map((area) => {
                    const isSelected = area.id === selectedAreaId;
                    return (
                      <div
                        key={area.id}
                        onClick={() => setSelectedAreaId(area.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                          isSelected
                            ? 'bg-zinc-900 border-white text-white shadow-lg'
                            : 'bg-zinc-950/70 border-zinc-850 text-zinc-300 hover:bg-zinc-900/60 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-xs leading-snug">{area.name}</h4>
                            <p className="text-[11px] text-zinc-400 mt-0.5">{area.regency}</p>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold whitespace-nowrap border ${
                              area.defaultRiskLevel === 'KRITIS'
                                ? 'bg-zinc-800 text-white border-zinc-600'
                                : area.defaultRiskLevel === 'TINGGI'
                                ? 'bg-zinc-900 text-zinc-200 border-zinc-700'
                                : 'bg-zinc-950 text-zinc-400 border-zinc-850'
                            }`}
                          >
                            {area.defaultRiskLevel}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-2 text-[10px] font-mono text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Compass className="w-3 h-3 text-zinc-500" />
                            {area.distKm} km ({area.bearingCardinal})
                          </span>
                          <span>•</span>
                          <span>ETA Abu: ~{area.ashFallProfile.typicalArrivalMinutes}m</span>
                          <span>•</span>
                          <span className="truncate">{area.hazardZone.split(' ')[0]}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right Column: Deep Dive Detail Card for Selected Area */}
              <div className="lg:col-span-7 bg-zinc-900/60 rounded-2xl border border-zinc-800 p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-zinc-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-white font-mono text-[10px] font-bold border border-zinc-700">
                        {selectedArea.hazardZone}
                      </span>
                      <span className="text-zinc-500 text-xs">•</span>
                      <span className="text-zinc-400 text-xs">{selectedArea.province}</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                      {selectedArea.name}
                    </h3>
                    <p className="text-xs text-zinc-400 font-mono">
                      {selectedArea.regency} | Koordinat: {selectedArea.coords[0].toFixed(3)}° LS, {selectedArea.coords[1].toFixed(3)}° BT
                    </p>
                  </div>

                  {onFocusAreaOnMap && (
                    <button
                      onClick={() => onFocusAreaOnMap(selectedArea.coords, 12)}
                      className="px-3 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-bold transition-colors flex items-center gap-1.5 shadow"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Lihat di Peta Satelit</span>
                    </button>
                  )}
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-black/60 border border-zinc-850">
                    <span className="text-zinc-500 block text-[10px]">JARAK KE KAWAH</span>
                    <strong className="text-white text-sm block mt-0.5">{selectedArea.distKm} km</strong>
                    <span className="text-zinc-400 text-[10px]">{selectedArea.bearingCardinal} ({selectedArea.bearingDeg}°)</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/60 border border-zinc-850">
                    <span className="text-zinc-500 block text-[10px]">ESTIMASI TIBA (ETA)</span>
                    <strong className="text-white text-sm block mt-0.5">~{selectedArea.ashFallProfile.typicalArrivalMinutes} Menit</strong>
                    <span className="text-zinc-400 text-[10px]">Kecepatan angin 8-12 m/s</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/60 border border-zinc-850">
                    <span className="text-zinc-500 block text-[10px]">POPULASI / AKTIVITAS</span>
                    <strong className="text-white text-xs block mt-0.5 truncate">{selectedArea.population}</strong>
                    <span className="text-zinc-400 text-[10px]">Masyarakat pesisir</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-black/60 border border-zinc-850">
                    <span className="text-zinc-500 block text-[10px]">KUALITAS UDARA (AQI)</span>
                    <strong className="text-white text-xs block mt-0.5 truncate">{selectedArea.ashFallProfile.airQualityIndex}</strong>
                    <span className="text-zinc-400 text-[10px]">Partikel Silika PM10</span>
                  </div>
                </div>

                {/* Ash Fall Profile */}
                <div className="p-3 rounded-xl bg-black/40 border border-zinc-850 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-200">
                    <Layers className="w-4 h-4 text-zinc-400" />
                    <span>Profil Bahaya Endapan Abu (*Isopach*) & Penurunan Jarak Pandang</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-zinc-400 text-[11px] block">Potensi Ketebalan Abu:</span>
                      <span className="text-white font-mono font-semibold text-xs">{selectedArea.ashFallProfile.potentialThickness}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 text-[11px] block">Penurunan Jarak Pandang (Visibilitas):</span>
                      <span className="text-white font-mono font-semibold text-xs">{selectedArea.ashFallProfile.visibilityDrop}</span>
                    </div>
                  </div>
                </div>

                {/* Critical Assets */}
                <div className="space-y-1.5">
                  <h5 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Aset Kritis & Sektor Vital Terdampak</span>
                  </h5>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedArea.criticalAssets.map((asset, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300">
                        {asset}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Mitigation & BPBD Standard Operating Procedures */}
                <div className="space-y-1.5">
                  <h5 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Protokol Mitigasi Rekomendasi BMKG & BPBD</span>
                  </h5>
                  <ul className="space-y-1 text-xs text-zinc-300 list-disc list-inside">
                    {selectedArea.mitigationProtocols.map((p, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: BULETIN SIGMET & VONA BMKG */}
        {activeTab === 'sigmet' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {BMKG_SIGMET_SCENARIOS.map((sc) => {
                const isCurrent = sc.id === activeScenarioId;
                return (
                  <button
                    key={sc.id}
                    onClick={() => setActiveScenarioId(sc.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isCurrent
                        ? 'bg-zinc-900 border-white text-white shadow-md'
                        : 'bg-zinc-950/60 border-zinc-850 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">
                        {sc.code}
                      </span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                        sc.vonaStatus === 'RED' ? 'bg-zinc-800 text-white' : 'bg-zinc-900 text-zinc-300'
                      }`}>
                        VONA {sc.vonaStatus}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-zinc-200 line-clamp-2 mt-1">{sc.title}</h4>
                    <div className="mt-2 text-[10px] font-mono text-zinc-400 space-y-0.5">
                      <div>Kolom: {sc.columnHeightMeters}m ({sc.flightLevelRange})</div>
                      <div>Angin: {sc.windSpeedMs} m/s ({sc.driftDirectionDeg}°)</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Scenario Breakdown Card */}
            <div className="bg-zinc-900/60 rounded-2xl border border-zinc-800 p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-white text-black font-bold font-mono text-[10px] rounded">
                      {activeScenario.code}
                    </span>
                    <span className="text-zinc-500">•</span>
                    <span className="text-xs text-zinc-400 font-mono">{activeScenario.fir}</span>
                    <span className="text-zinc-500">•</span>
                    <span className="text-xs text-zinc-400 font-mono">Terbit: {activeScenario.issueDate}</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                    {activeScenario.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApply(activeScenario)}
                    className="px-3.5 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg"
                    title="Muat parameter angin dan ketinggian kolom BMKG ke simulator aktif"
                  >
                    <Gauge className="w-3.5 h-3.5" />
                    <span>Terapkan ke Simulator</span>
                  </button>
                </div>
              </div>

              {/* Summary text */}
              <p className="text-xs text-zinc-300 leading-relaxed">
                {activeScenario.summary}
              </p>

              {/* SIGMET Raw Format Box (ICAO Meteorological Standard) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Format Teks Buletin SIGMET ICAO Standar BMKG</span>
                  </span>
                  <button
                    onClick={handleCopySigmet}
                    className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-mono flex items-center gap-1 transition-colors"
                  >
                    {copiedText ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3 text-zinc-400" />}
                    <span>{copiedText ? 'Tersalin!' : 'Salin Buletin'}</span>
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-black border border-zinc-800 text-[11px] font-mono text-zinc-300 overflow-x-auto whitespace-pre leading-relaxed selection:bg-zinc-800">
                  {rawSigmetText}
                </pre>
              </div>

              {/* Poligon Koordinat Titik Sudut */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-zinc-300 block">
                  Titik Koordinat Poligon Sebaran Abu BMKG:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[10px]">
                  {activeScenario.polygonCoords.map(([lat, lng], i) => (
                    <div key={i} className="p-2 rounded bg-zinc-950 border border-zinc-850 flex items-center justify-between">
                      <span className="text-zinc-500">Vertex {i + 1}:</span>
                      <strong className="text-zinc-200">{lat.toFixed(3)}° LS, {lng.toFixed(3)}° BT</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: PROFIL ANGIN LAPISAN ATAS (UPPER-AIR SOUNDING) */}
        {activeTab === 'upperair' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
              <div className="flex items-center gap-2">
                <Wind className="w-5 h-5 text-white" />
                <h4 className="text-sm font-bold text-white">
                  Profil Angin Multi-Ketinggian (Radiosonde / Upper-Air Sounding BMKG)
                </h4>
              </div>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Di atmosfer Selat Sunda, arah dan kecepatan angin berubah drastis sesuai level ketinggian (*vertical wind shear*).
                Abu vulkanik berbutir kasar (lapili) umumnya terbawa oleh angin permukaan (SFC - FL050), sedangkan abu halus dan gas belerang ($SO_2$) meluncur bersama jetstream di lapisan troposfer atas (FL180 - FL390).
              </p>
            </div>

            {/* Sounding Data Table */}
            <div className="rounded-xl border border-zinc-800 overflow-hidden bg-black">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 text-[10px] uppercase">
                  <tr>
                    <th className="p-3">Tekanan (hPa)</th>
                    <th className="p-3">Ketinggian</th>
                    <th className="p-3">Flight Level</th>
                    <th className="p-3">Arah Angin</th>
                    <th className="p-3">Kecepatan</th>
                    <th className="p-3">Suhu Udara</th>
                    <th className="p-3">Perilaku Partikel Abu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {BMKG_UPPER_AIR_PROFILE.map((snd) => (
                    <tr key={snd.levelHpa} className="hover:bg-zinc-900/60 transition-colors">
                      <td className="p-3 font-bold text-white">{snd.levelHpa} hPa</td>
                      <td className="p-3 text-zinc-300">{snd.altitudeMeters} m</td>
                      <td className="p-3 font-semibold text-zinc-200">{snd.flightLevel}</td>
                      <td className="p-3 text-zinc-300">{snd.windDirectionDeg}° ({getCardinalFromDegree(snd.windDirectionDeg)})</td>
                      <td className="p-3 text-white font-bold">{snd.windSpeedMs} m/s ({snd.windSpeedKnots} kt)</td>
                      <td className="p-3 text-zinc-400">{snd.tempCelsius}°C</td>
                      <td className="p-3 font-sans text-zinc-400 text-[11px]">{snd.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Atmospheric Wind Shear Visual Bars */}
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-850 space-y-2.5">
              <span className="text-xs font-bold text-zinc-300 block">
                Gradien Kecepatan Angin Horisontal Berdasarkan Ketinggian (m/s):
              </span>
              <div className="space-y-2">
                {BMKG_UPPER_AIR_PROFILE.map((snd) => {
                  const percentage = Math.round((snd.windSpeedMs / 35) * 100);
                  return (
                    <div key={snd.levelHpa} className="flex items-center gap-3 text-[11px] font-mono">
                      <span className="w-24 text-zinc-400 text-right">{snd.flightLevel} ({snd.altitudeMeters}m)</span>
                      <div className="flex-1 bg-zinc-950 h-3.5 rounded-full overflow-hidden border border-zinc-800 p-0.5">
                        <div
                          className="h-full bg-white rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-16 font-bold text-white text-right">{snd.windSpeedMs} m/s</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: PROTOKOL MITIGASI BPBD & BMKG */}
        {activeTab === 'sop' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-white" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wide">1. Sektor Maritim & ASDP</h4>
                </div>
                <ul className="text-xs text-zinc-300 space-y-1.5 list-disc list-inside leading-relaxed">
                  <li>Kapal feri penyeberangan Bakauheni - Merak menyalakan radar pita-X dan lampu kabut intensitas tinggi.</li>
                  <li>Jika visibilitas alur laut di bawah 200 meter, Kepala Syahbandar Distrik Navigasi Merak menghentikan sementara pergerakan kapal (*temporary harbor clearance hold*).</li>
                  <li>Nelayan tradisional dilarang berlayar dalam radius 5 km (KRB III).</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-white" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wide">2. Sektor Penerbangan (Aviasi)</h4>
                </div>
                <ul className="text-xs text-zinc-300 space-y-1.5 list-disc list-inside leading-relaxed">
                  <li>Penerbitan NOTAM / ASHTAM penutupan ruang udara Selat Sunda koridor W45.</li>
                  <li>Seluruh pesawat komersial dilarang melintas di bawah FL200 pada koordinat poligon SIGMET aktif.</li>
                  <li>Pemeriksaan endapan abu vulkanik pada bilah kompresor pesawat saat transit di Bandara Soekarno-Hatta (CGK).</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-white" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wide">3. Masyarakat Pesisir & Pulau</h4>
                </div>
                <ul className="text-xs text-zinc-300 space-y-1.5 list-disc list-inside leading-relaxed">
                  <li>Gunakan masker N95 atau kain basah ganda untuk menyaring partikel debu silika kristalin berbahaya (&lt; 2.5 µm).</li>
                  <li>Gunakan kacamata pelindung (goggles), hindari penggunaan lensa kontak saat hujan abu.</li>
                  <li>Tutup penampungan air minum dan bersihkan atap rumah dari timbunan abu tebal untuk mencegah atap ambruk.</li>
                </ul>
              </div>
            </div>

            {/* Emergency Contacts & Response Hub */}
            <div className="p-4 rounded-xl bg-black border border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5 font-mono">
                <span className="text-zinc-400 block text-[10px]">PUSAT KOMANDO KESIAPSIAGAAN (CALL CENTER DARURAT)</span>
                <span className="text-white font-bold">BPBD Banten: (0254) 8493112 • BPBD Lampung Selatan: (0727) 321113 • BMKG Call Center: 196</span>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-colors"
              >
                Kembali ke Peta Simulasi
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-zinc-850 bg-black/90 flex flex-wrap items-center justify-between text-[11px] text-zinc-500 font-mono">
          <div className="flex items-center gap-2">
            <span>Sumber: BMKG Aviation Meteorology Center & PVMBG Badan Geologi</span>
          </div>
          <div>
            <span>Sistem Koordinat WGS84 • Pemodelan Dispersi Gauss & Adveksi Atmosfer</span>
          </div>
        </div>
      </div>
    </div>
  );
};
