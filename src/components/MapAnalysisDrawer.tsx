import React, { useState } from 'react';
import { Flame, X, Compass, MapPin, AlertTriangle } from 'lucide-react';
import { PlumeParams, BallisticParams } from '../types';

interface MapAnalysisDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  radiusMetrics: {
    maxBallisticKm: number;
    bombEnergyTonsTNT: number;
    bombImpactVelMs: number;
    umbrellaRadiusKm: number;
    maxPlumeReachKm: number;
    impactedList: Array<{
      id: string;
      name: string;
      type: string;
      distKm: number;
      bearingDeg: number;
      inBallistic: boolean;
      inPlume: boolean;
    }>;
  };
  plume: PlumeParams;
  ballistic: BallisticParams;
  cursorInfo: {
    lat: number;
    lng: number;
    distKm: number;
    bearingDeg: number;
    zone: string;
  } | null;
}

export const MapAnalysisDrawer: React.FC<MapAnalysisDrawerProps> = ({
  isOpen,
  onClose,
  radiusMetrics,
  plume,
  ballistic,
  cursorInfo,
}) => {
  const [activeTab, setActiveTab] = useState<'hazards' | 'landmarks' | 'cursor'>('hazards');

  if (!isOpen) return null;

  return (
    <div className="absolute top-16 right-3.5 z-20 w-80 sm:w-96 max-h-[calc(100%-80px)] overflow-y-auto no-scrollbar bg-black/95 backdrop-blur-2xl border border-zinc-800 rounded-2xl shadow-2xl p-3.5 text-xs text-zinc-200 font-sans pointer-events-auto space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-white" />
          <span className="font-bold text-white text-[13px]">
            Gambaran Radius Bahaya Erupsi
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title="Tutup Panel Analisis"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center p-0.5 bg-zinc-900 rounded-xl border border-zinc-800">
        <button
          onClick={() => setActiveTab('hazards')}
          className={`flex-1 py-1 text-center rounded-lg font-medium text-[11px] transition-all ${
            activeTab === 'hazards'
              ? 'bg-white text-black font-bold shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          💣 Bom & Abu
        </button>
        <button
          onClick={() => setActiveTab('landmarks')}
          className={`flex-1 py-1 text-center rounded-lg font-medium text-[11px] transition-all ${
            activeTab === 'landmarks'
              ? 'bg-white text-black font-bold shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          📍 Wilayah ({radiusMetrics.impactedList.filter(l => l.inBallistic || l.inPlume).length})
        </button>
        <button
          onClick={() => setActiveTab('cursor')}
          className={`flex-1 py-1 text-center rounded-lg font-medium text-[11px] transition-all ${
            activeTab === 'cursor'
              ? 'bg-white text-black font-bold shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          📐 Ukur
        </button>
      </div>

      {/* Tab Content: Hazards */}
      {activeTab === 'hazards' && (
        <div className="space-y-3">
          {/* SECTION A: RADIUS LEMPARAN PROYEKTIL */}
          <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                <span>💣</span> Radius Lemparan Proyektil (Bom)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                Balistik 3D
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                <span className="text-[9px] text-zinc-400 block font-sans">Jangkauan Maksimal</span>
                <span className="text-base font-bold text-amber-400">
                  {radiusMetrics.maxBallisticKm.toFixed(2)} km
                </span>
              </div>
              <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                <span className="text-[9px] text-zinc-400 block font-sans">Energi Kinetik Kawah</span>
                <span className="text-base font-bold text-white">
                  {radiusMetrics.bombEnergyTonsTNT.toFixed(1)} t TNT
                </span>
              </div>
            </div>

            <div className="text-[10px] text-zinc-300 space-y-1 bg-zinc-900/60 p-2 rounded-lg border border-zinc-850">
              <div className="flex justify-between">
                <span className="text-zinc-400">Kecepatan Lontar (V0):</span>
                <span className="font-mono font-bold text-white">{ballistic.ejectionVelocity} m/s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Kecepatan Tumbuk Tanah:</span>
                <span className="font-mono font-bold text-white">{radiusMetrics.bombImpactVelMs.toFixed(0)} m/s ({((radiusMetrics.bombImpactVelMs * 3.6)).toFixed(0)} km/h)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Massa Bom Vulkanik:</span>
                <span className="font-mono font-bold text-white">{ballistic.bombMass} kg ({ballistic.bombDiameter} cm)</span>
              </div>
            </div>
          </div>

          {/* SECTION B: SEBARAN ABU VULKANIK */}
          <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-700/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <span>💨</span> Radius Sebaran Abu Vulkanik
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">
                Plume Gauss
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                <span className="text-[9px] text-zinc-400 block font-sans">Payung Asap Kawah</span>
                <span className="text-base font-bold text-white">
                  {radiusMetrics.umbrellaRadiusKm.toFixed(2)} km
                </span>
              </div>
              <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                <span className="text-[9px] text-zinc-400 block font-sans">Jangkauan Abu Utama</span>
                <span className="text-base font-bold text-white">
                  {radiusMetrics.maxPlumeReachKm.toFixed(1)} km
                </span>
              </div>
            </div>

            <div className="text-[10px] text-zinc-300 space-y-1 bg-zinc-900/60 p-2 rounded-lg border border-zinc-850">
              <div className="flex justify-between">
                <span className="text-zinc-400">Tinggi Kolom Erupsi:</span>
                <span className="font-mono font-bold text-white">{plume.columnHeight} m ({((plume.columnHeight / 1000) * 3280.84).toFixed(0)} ft)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Kecepatan Angin Pembawa:</span>
                <span className="font-mono font-bold text-white">{plume.windSpeed} m/s ({(plume.windSpeed * 3.6).toFixed(1)} km/h)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Arah Sebaran Angin:</span>
                <span className="font-mono font-bold text-white">{plume.windDirection}° ({plume.windDirection >= 225 && plume.windDirection <= 315 ? 'Menuju Banten / Timur' : plume.windDirection >= 45 && plume.windDirection <= 135 ? 'Menuju Samudra Hindia' : 'Arah Selat Sunda'})</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Landmarks & Regions */}
      {activeTab === 'landmarks' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>Daftar Titik Geografis Kritis</span>
            <span>Jarak & Status</span>
          </div>
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 no-scrollbar font-mono text-[11px]">
            {radiusMetrics.impactedList.map((lm) => (
              <div
                key={lm.id}
                className={`p-2 rounded-lg flex items-center justify-between border transition-all ${
                  lm.inBallistic
                    ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                    : lm.inPlume
                    ? 'bg-zinc-900 border-zinc-700 text-white'
                    : 'bg-zinc-900/40 border-zinc-800 text-zinc-400'
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-sans font-bold text-white text-[11px] flex items-center gap-1">
                    {lm.name}
                    {lm.inBallistic && <AlertTriangle className="w-3 h-3 text-amber-400 inline" />}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {lm.distKm} km • {lm.bearingDeg}°
                  </span>
                </div>
                <div>
                  {lm.inBallistic ? (
                    <span className="px-2 py-0.5 rounded bg-amber-500/30 text-amber-300 font-bold text-[10px]">
                      💣 Bom
                    </span>
                  ) : lm.inPlume ? (
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 text-[10px]">
                      💨 Abu
                    </span>
                  ) : (
                    <span className="text-zinc-600 text-[10px]">Aman</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content: Cursor & Measurement */}
      {activeTab === 'cursor' && (
        <div className="space-y-3 font-mono text-xs">
          <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-white font-sans text-xs">
              <Compass className="w-4 h-4 text-white" />
              <span>Pengukuran Geodesik Kursor</span>
            </div>
            {cursorInfo ? (
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-zinc-400 font-sans">Jarak dari Kawah:</span>
                  <span className="font-bold text-white">{cursorInfo.distKm} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 font-sans">Sudut Azimuth:</span>
                  <span className="font-bold text-white">{cursorInfo.bearingDeg}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400 font-sans">Koordinat GPS:</span>
                  <span className="text-zinc-300">{cursorInfo.lat.toFixed(4)}, {cursorInfo.lng.toFixed(4)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-zinc-800">
                  <span className="text-zinc-400 font-sans">Zona Bahaya:</span>
                  <span className="font-bold text-amber-300">{cursorInfo.zone}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-zinc-500 text-[11px] font-sans">
                Arahkan kursor atau sentuh peta untuk membaca jarak langsung dari kawah aktif.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
