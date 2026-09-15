/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Wind,
  CloudRain,
  Compass,
  AlertTriangle,
  Plane,
  Ship,
  ChevronDown,
  ChevronUp,
  Layers,
  MapPin,
} from 'lucide-react';
import { PlumeParams } from '../types';

interface AshDispersalControlCardProps {
  plume: PlumeParams;
  onUpdateWind?: (speed: number, direction: number) => void;
  showAshCloud3D: boolean;
  onToggleAshCloud3D: () => void;
  showAshFootprint: boolean;
  onToggleAshFootprint: () => void;
  downwindReachKm: number;
}

export const AshDispersalControlCard: React.FC<AshDispersalControlCardProps> = ({
  plume,
  onUpdateWind,
  showAshCloud3D,
  onToggleAshCloud3D,
  showAshFootprint,
  onToggleAshFootprint,
  downwindReachKm,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Compute Cardinal Heading from degrees
  const getCardinalDirection = (deg: number): { label: string; name: string } => {
    const normalized = ((deg % 360) + 360) % 360;
    if (normalized >= 337.5 || normalized < 22.5) return { label: 'U', name: 'Utara' };
    if (normalized >= 22.5 && normalized < 67.5) return { label: 'TL', name: 'Timur Laut' };
    if (normalized >= 67.5 && normalized < 112.5) return { label: 'T', name: 'Timur' };
    if (normalized >= 112.5 && normalized < 157.5) return { label: 'TG', name: 'Tenggara' };
    if (normalized >= 157.5 && normalized < 202.5) return { label: 'S', name: 'Selatan' };
    if (normalized >= 202.5 && normalized < 247.5) return { label: 'BD', name: 'Barat Daya' };
    if (normalized >= 247.5 && normalized < 292.5) return { label: 'B', name: 'Barat' };
    return { label: 'BL', name: 'Barat Laut' };
  };

  const cardinal = getCardinalDirection(plume.windDirection);

  // Calculate affected areas based on wind trajectory
  const getAffectedZones = (deg: number, reachKm: number) => {
    const zones: { id: string; name: string; type: 'air' | 'sea' | 'land'; severity: 'high' | 'medium' | 'low'; note: string }[] = [];
    const norm = ((deg % 360) + 360) % 360;

    // ALKI I Shipping Lane (West: 250° - 290°, and South: 160° - 220°)
    if ((norm >= 160 && norm <= 290) && reachKm >= 6) {
      zones.push({
        id: 'alki',
        name: 'Jalur Pelayaran ALKI I',
        type: 'sea',
        severity: 'high',
        note: 'Jarak pandang kapal < 500m, bahaya saringan pendingin mesin',
      });
    }

    // Flight Corridor W45 (Altitude > 4000m and heading NE or SW)
    if (plume.columnHeight >= 3500) {
      zones.push({
        id: 'w45',
        name: 'Rute Penerbangan W45',
        type: 'air',
        severity: plume.columnHeight >= 6000 ? 'high' : 'medium',
        note: `Kolom erupsi ${(plume.columnHeight / 1000).toFixed(1)} km menembus FL${Math.round(plume.columnHeight * 0.0328)}`,
      });
    }

    // Pulau Sebesi (North: 330° - 30°)
    if ((norm >= 330 || norm <= 30) && reachKm >= 14) {
      zones.push({
        id: 'sebesi',
        name: 'P. Sebesi (Permukiman Warga)',
        type: 'land',
        severity: 'high',
        note: 'Paparan abu silika & potensi gangguan pernapasan',
      });
    }

    // Banten Coast / Anyer / Carita (East: 65° - 120°)
    if (norm >= 65 && norm <= 120 && reachKm >= 35) {
      zones.push({
        id: 'banten',
        name: 'Pesisir Banten (Anyer/Carita)',
        type: 'land',
        severity: reachKm >= 42 ? 'high' : 'medium',
        note: 'Potensi hujan abu di kawasan permukiman & wisata',
      });
    }

    // Lampung Coast / Kalianda (Northwest: 295° - 350°)
    if (norm >= 295 && norm <= 350 && reachKm >= 32) {
      zones.push({
        id: 'lampung',
        name: 'Pesisir Lampung (Kalianda)',
        type: 'land',
        severity: 'medium',
        note: 'Potensi abu halus di koridor penyeberangan Bakauheni',
      });
    }

    // Rakata / Sertung (Proximal Caldera: always affected within 5km)
    zones.push({
      id: 'krakatau-sanctuary',
      name: 'Cagar Alam Rakata & Sertung',
      type: 'land',
      severity: 'high',
      note: 'Jatuhan piroklastik proksimal & endapan tebal',
    });

    return zones;
  };

  const affectedZones = getAffectedZones(plume.windDirection, downwindReachKm);
  const flightLevel = Math.round((plume.columnHeight + 157) * 0.0328);
  const vonaColor = plume.columnHeight >= 5000 ? 'RED' : plume.columnHeight >= 2000 ? 'ORANGE' : 'YELLOW';

  const setQuickWind = (speed: number, dir: number) => {
    if (onUpdateWind) {
      onUpdateWind(speed, dir);
    }
  };

  return (
    <div className="bg-black/95 backdrop-blur-xl rounded-2xl border border-zinc-800 text-xs text-zinc-200 shadow-2xl overflow-hidden transition-all">
      {/* Header Bar with Toggle */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-3 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between cursor-pointer hover:bg-zinc-900 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-lg bg-zinc-800 text-white border border-zinc-700">
            <Wind className="w-4 h-4 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-white text-[12px] flex items-center gap-1.5">
              Simulasi Sebaran Abu Vulkanik
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white text-black font-bold">
                REAL-TIME
              </span>
            </h4>
            <p className="text-[10px] text-zinc-400">Model Adveksi Atmosfer & Dispersi Gauss Selat Sunda</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-200">
            <span className="font-bold text-white">{cardinal.label} ({plume.windDirection}°)</span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-300">{plume.windSpeed} m/s</span>
          </div>
          <button className="text-zinc-400 hover:text-white p-0.5">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 space-y-3">
          {/* Key Metrics Grid - Clean Monochrome */}
          <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
            <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-850">
              <span className="text-[10px] text-zinc-400 block font-sans">Ketinggian Kolom</span>
              <span className="text-xs font-bold text-white">
                {plume.columnHeight.toLocaleString()} m
              </span>
              <span className="text-[9px] text-zinc-500 block font-sans mt-0.5">FL{flightLevel}</span>
            </div>

            <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-850">
              <span className="text-[10px] text-zinc-400 block font-sans">Jangkauan Sebaran</span>
              <span className="text-xs font-bold text-white">
                {downwindReachKm.toFixed(1)} km
              </span>
              <span className="text-[9px] text-zinc-500 block font-sans mt-0.5">
                {cardinal.name}
              </span>
            </div>

            <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-850">
              <span className="text-[10px] text-zinc-400 block font-sans">Status VONA</span>
              <span className="text-xs font-bold text-white">
                {vonaColor}
              </span>
              <span className="text-[9px] text-zinc-500 block font-sans mt-0.5">Aviation Code</span>
            </div>
          </div>

          {/* Interactive Wind Vector Sliders */}
          <div className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800 space-y-2.5">
            {/* Wind Direction Control */}
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-zinc-200 font-semibold flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-white" />
                  Arah Tiupan Angin:
                </span>
                <span className="font-mono font-bold text-white bg-zinc-900 px-2 py-0.5 rounded border border-zinc-700 text-[10px]">
                  {plume.windDirection}° ({cardinal.name})
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={359}
                step={5}
                value={plume.windDirection}
                onChange={(e) => onUpdateWind && onUpdateWind(plume.windSpeed, Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[9px] font-mono text-zinc-500 mt-1">
                <span>0° (U)</span>
                <span>90° (T/Jawa)</span>
                <span>180° (S)</span>
                <span>270° (B/Smtr)</span>
              </div>
            </div>

            {/* Wind Speed Control */}
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-zinc-200 font-semibold flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-white" />
                  Kecepatan Angin Selat Sunda:
                </span>
                <span className="font-mono font-bold text-white bg-zinc-900 px-2 py-0.5 rounded border border-zinc-700 text-[10px]">
                  {plume.windSpeed} m/s ({(plume.windSpeed * 3.6).toFixed(1)} km/j)
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={25}
                step={1}
                value={plume.windSpeed}
                onChange={(e) => onUpdateWind && onUpdateWind(Number(e.target.value), plume.windDirection)}
                className="w-full h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Quick Wind Direction Presets - Monochrome buttons */}
            <div className="pt-1.5 border-t border-zinc-850">
              <span className="text-[10px] text-zinc-400 block mb-1 font-medium">
                Pintasan Skenario Angin Musiman:
              </span>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <button
                  onClick={() => setQuickWind(12, 225)}
                  className={`px-2 py-1 rounded-lg text-left transition-all border ${
                    plume.windDirection === 225
                      ? 'bg-white text-black font-bold border-white'
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 text-zinc-300'
                  }`}
                >
                  Muson SW (225°)
                </button>
                <button
                  onClick={() => setQuickWind(14, 90)}
                  className={`px-2 py-1 rounded-lg text-left transition-all border ${
                    plume.windDirection === 90
                      ? 'bg-white text-black font-bold border-white'
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 text-zinc-300'
                  }`}
                >
                  Ke Banten (90°)
                </button>
                <button
                  onClick={() => setQuickWind(10, 315)}
                  className={`px-2 py-1 rounded-lg text-left transition-all border ${
                    plume.windDirection === 315
                      ? 'bg-white text-black font-bold border-white'
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 text-zinc-300'
                  }`}
                >
                  Ke Lampung (315°)
                </button>
                <button
                  onClick={() => setQuickWind(15, 180)}
                  className={`px-2 py-1 rounded-lg text-left transition-all border ${
                    plume.windDirection === 180
                      ? 'bg-white text-black font-bold border-white'
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600 text-zinc-300'
                  }`}
                >
                  ALKI I / Rakata (180°)
                </button>
              </div>
            </div>
          </div>

          {/* Real-Time Impact Assessment Badges - Clean Monochrome Cards */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-zinc-200 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-white" />
                Wilayah Terdampak Abu ({affectedZones.length} Sektor):
              </span>
            </div>
            <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
              {affectedZones.map((zone) => (
                <div
                  key={zone.id}
                  className="p-2 rounded-lg border border-zinc-800 bg-zinc-950 text-[10px] flex items-start justify-between gap-2"
                >
                  <div className="flex items-start gap-1.5">
                    {zone.type === 'air' && <Plane className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0 mt-0.5" />}
                    {zone.type === 'sea' && <Ship className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0 mt-0.5" />}
                    {zone.type === 'land' && <MapPin className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0 mt-0.5" />}
                    <div>
                      <span className="font-semibold text-white block">{zone.name}</span>
                      <span className="text-[9px] text-zinc-400 block">{zone.note}</span>
                    </div>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                      zone.severity === 'high' ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                    }`}
                  >
                    {zone.severity === 'high' ? 'BAHAYA' : 'WASPADA'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Visual Layer Toggles for Ash */}
          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px]">
            <label className="flex items-center gap-2 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={showAshCloud3D}
                onChange={onToggleAshCloud3D}
                className="rounded border-zinc-700 text-white focus:ring-0"
              />
              <span className="flex items-center gap-1.5 text-zinc-300">
                <CloudRain className="w-3.5 h-3.5 text-white" />
                Awan Abu 3D (Atmosfer)
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={showAshFootprint}
                onChange={onToggleAshFootprint}
                className="rounded border-zinc-700 text-white focus:ring-0"
              />
              <span className="flex items-center gap-1.5 text-zinc-300">
                <Layers className="w-3.5 h-3.5 text-white" />
                Jejak Abu Laut (Isopach)
              </span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
