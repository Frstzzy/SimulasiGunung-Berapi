/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BallisticParams, PlumeParams, KrakatauWeather } from '../types';
import { Sliders, Flame, Wind, ToggleLeft, ToggleRight, Sparkles, Compass, FileText, Download } from 'lucide-react';

interface ControlPanelProps {
  ballistic: BallisticParams;
  plume: PlumeParams;
  onUpdateBallistic: (partial: Partial<BallisticParams>) => void;
  onUpdatePlume: (partial: Partial<PlumeParams>) => void;
  onTriggerEruption: () => void;
  weather?: KrakatauWeather | null;
  onOpenWeatherModal?: () => void;
  onOpenEjectaDetail?: () => void;
  onOpenAshDetail?: () => void;
  onOpenAerosol?: () => void;
  onOpenExportPdf?: () => void;
}

const COMPASS_POINTS: { [key: number]: string } = {
  0: 'Utara (N)',
  45: 'Timur Laut (NE)',
  90: 'Timur (E)',
  135: 'Tenggara (SE)',
  180: 'Selatan (S)',
  225: 'Barat Daya (SW)',
  270: 'Barat (W)',
  315: 'Barat Laut (NW)',
  360: 'Utara (N)',
};

function getCompassLabel(degrees: number): string {
  const norm = ((degrees % 360) + 360) % 360;
  const closest = Object.keys(COMPASS_POINTS)
    .map(Number)
    .reduce((prev, curr) => (Math.abs(curr - norm) < Math.abs(prev - norm) ? curr : prev));
  return COMPASS_POINTS[closest] || `${norm}°`;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  ballistic,
  plume,
  onUpdateBallistic,
  onUpdatePlume,
  onTriggerEruption,
  weather,
  onOpenWeatherModal,
  onOpenEjectaDetail,
  onOpenAshDetail,
  onOpenAerosol,
  onOpenExportPdf,
}) => {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-2xl text-zinc-200">
      {/* Header bar */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white">
            <Sliders className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">
              Kendali Parameter Fisika & Atmosfer
            </h2>
            <p className="text-[11px] text-zinc-400">
              Modifikasi variabel numerik secara langsung untuk mengamati perubahan dinamika lontaran
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-medium text-zinc-300 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full">
            Satuan Baku SI
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-5">
        {/* LEFT COLUMN: Ballistic / Volcanic Bomb Parameters */}
        <div className="space-y-5">
          <div className="flex items-center justify-between pb-1 border-b border-zinc-850">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                1. Kinematika Bom Vulkanik
              </h3>
            </div>

            {/* Toggle Air Resistance */}
            <button
              id="toggle-air-drag-btn"
              onClick={() => onUpdateBallistic({ enableAirDrag: !ballistic.enableAirDrag })}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold transition-all border ${
                ballistic.enableAirDrag
                  ? 'bg-white text-black border-white shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
              }`}
            >
              {ballistic.enableAirDrag ? (
                <>
                  <ToggleRight className="w-4 h-4 text-black" />
                  <span>Hambatan Udara: ON</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4 text-zinc-400" />
                  <span>Vakum: ON</span>
                </>
              )}
            </button>
          </div>

          {/* Initial Velocity */}
          <div className="space-y-1.5 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="input-velocity" className="font-medium text-zinc-200">Kecepatan Lontaran Awal (v₀)</label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400 font-mono">
                  ({((ballistic.initialVelocity * 3600) / 1000).toFixed(0)} km/h)
                </span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-white font-mono font-bold text-xs border border-zinc-700">
                  {ballistic.initialVelocity} m/s
                </span>
              </div>
            </div>
            <input
              id="input-velocity"
              type="range"
              min="50"
              max="400"
              step="5"
              value={ballistic.initialVelocity}
              onChange={(e) => onUpdateBallistic({ initialVelocity: Number(e.target.value) })}
              className="w-full h-1.5"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>50 m/s (Strombolian)</span>
              <span>200 m/s (Vulkanian)</span>
              <span>400 m/s (Paroksismal)</span>
            </div>
          </div>

          {/* Launch Angle */}
          <div className="space-y-1.5 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="input-angle" className="font-medium text-zinc-200">Sudut Elevasi Lontaran (θ)</label>
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-white font-mono font-bold text-xs border border-zinc-700">
                {ballistic.launchAngle}°
              </span>
            </div>
            <input
              id="input-angle"
              type="range"
              min="20"
              max="85"
              step="1"
              value={ballistic.launchAngle}
              onChange={(e) => onUpdateBallistic({ launchAngle: Number(e.target.value) })}
              className="w-full h-1.5"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>20° (Datar)</span>
              <span>45° (Optimal Vakum)</span>
              <span>85° (Vertikal)</span>
            </div>
          </div>

          {/* Launch Azimuth (3D Compass Direction) */}
          <div className="space-y-1.5 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="input-azimuth" className="font-medium text-zinc-200 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-white" />
                Arah Azimut Lontaran 3D (φ)
              </label>
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-white font-mono font-bold text-xs border border-zinc-700">
                {ballistic.launchAzimuth ?? 140}° ({getCompassLabel(ballistic.launchAzimuth ?? 140)})
              </span>
            </div>
            <input
              id="input-azimuth"
              type="range"
              min="0"
              max="359"
              step="5"
              value={ballistic.launchAzimuth ?? 140}
              onChange={(e) => onUpdateBallistic({ launchAzimuth: Number(e.target.value) })}
              className="w-full h-1.5"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>0° (Utara)</span>
              <span>90° (Timur/Jawa)</span>
              <span>180° (Selatan)</span>
              <span>270° (Barat/Smtr)</span>
            </div>
          </div>

          {/* Rock Diameter & Density */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
              <div className="flex justify-between items-center text-xs">
                <label htmlFor="input-diameter" className="font-medium text-zinc-200">Diameter (d)</label>
                <span className="font-mono text-white font-semibold text-xs">
                  {ballistic.rockDiameter.toFixed(2)} m
                </span>
              </div>
              <input
                id="input-diameter"
                type="range"
                min="0.1"
                max="2.0"
                step="0.05"
                value={ballistic.rockDiameter}
                onChange={(e) => onUpdateBallistic({ rockDiameter: Number(e.target.value) })}
                className="w-full h-1.5"
              />
              <span className="text-[10px] text-zinc-500 block font-mono">
                {ballistic.rockDiameter < 0.25 ? 'Lapili (<25 cm)' : 'Bom Masif (>64 cm)'}
              </span>
            </div>

            <div className="space-y-1.5 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
              <div className="flex justify-between items-center text-xs">
                <label htmlFor="input-density" className="font-medium text-zinc-200">Massa Jenis (ρ)</label>
                <span className="font-mono text-white font-semibold text-xs">
                  {ballistic.rockDensity} kg/m³
                </span>
              </div>
              <input
                id="input-density"
                type="range"
                min="1000"
                max="3000"
                step="50"
                value={ballistic.rockDensity}
                onChange={(e) => onUpdateBallistic({ rockDensity: Number(e.target.value) })}
                className="w-full h-1.5"
              />
              <span className="text-[10px] text-zinc-500 block font-mono">
                {ballistic.rockDensity < 1500 ? 'Batu Apung' : 'Andesit Basalt'}
              </span>
            </div>
          </div>

          {/* Drag Coefficient */}
          <div className="space-y-1.5 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="input-drag-cd" className="font-medium text-zinc-200">Koefisien Hambatan Bentuk (Cd)</label>
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-white font-mono font-bold text-xs border border-zinc-700">
                {ballistic.dragCoefficient.toFixed(2)}
              </span>
            </div>
            <input
              id="input-drag-cd"
              type="range"
              min="0.3"
              max="1.2"
              step="0.05"
              value={ballistic.dragCoefficient}
              onChange={(e) => onUpdateBallistic({ dragCoefficient: Number(e.target.value) })}
              className="w-full h-1.5"
            />
            <p className="text-[10px] text-zinc-500">
              Batuan vulkanik ireguler bersudut tajam memiliki hambatan aerodinamis Cd = 0.65 – 0.85
            </p>
          </div>

          {/* Multi-Projectile Shower & Dispersion Mode */}
          <div className="space-y-3 bg-zinc-900/60 p-3.5 rounded-xl border border-amber-500/20 bg-gradient-to-br from-zinc-900/90 to-amber-950/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🌋</span>
                <label className="font-medium text-zinc-200 text-xs">Mode Lontaran Proyektil</label>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono font-bold text-xs border border-amber-500/30">
                {(ballistic.projectileCount ?? 1) > 1 ? `${ballistic.projectileCount} Bom (Shower)` : '1 Batu Tunggal'}
              </span>
            </div>

            {/* Mode selection buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdateBallistic({ projectileCount: 1 })}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  (ballistic.projectileCount ?? 1) <= 1
                    ? 'bg-amber-500 text-black font-bold border-amber-400 shadow-md'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                🎯 1 Batu Tunggal
              </button>
              <button
                type="button"
                onClick={() => onUpdateBallistic({ projectileCount: Math.max(6, ballistic.projectileCount ?? 6) })}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  (ballistic.projectileCount ?? 1) > 1
                    ? 'bg-amber-500 text-black font-bold border-amber-400 shadow-md'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                }`}
              >
                💥 Pancaran Hujan Bom
              </button>
            </div>

            {/* Slider only visible if multi-projectile active */}
            {(ballistic.projectileCount ?? 1) > 1 && (
              <div className="space-y-2 pt-1 border-t border-zinc-800/80">
                <div className="flex justify-between items-center text-xs">
                  <label htmlFor="input-projectile-count" className="text-zinc-300 text-[11px]">
                    Kepadatan Pancaran (Jumlah Fragmen):
                  </label>
                  <span className="font-mono text-amber-400 font-bold text-xs">
                    {ballistic.projectileCount ?? 6} proyektil
                  </span>
                </div>
                <input
                  id="input-projectile-count"
                  type="range"
                  min="2"
                  max="20"
                  step="1"
                  value={ballistic.projectileCount ?? 6}
                  onChange={(e) => onUpdateBallistic({ projectileCount: Number(e.target.value) })}
                  className="w-full h-1.5 accent-amber-500"
                />

                {/* Pattern Dispersion Mode */}
                <div className="pt-1.5 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-zinc-400">Pola Sebaran:</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => onUpdateBallistic({ dispersionMode: 'focused' })}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                        (ballistic.dispersionMode ?? 'focused') === 'focused'
                          ? 'bg-zinc-200 text-black font-bold border-white'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      Terarah (±35°)
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateBallistic({ dispersionMode: 'radial' })}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                        ballistic.dispersionMode === 'radial'
                          ? 'bg-zinc-200 text-black font-bold border-white'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      Radial 360°
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-zinc-400 leading-relaxed bg-black/40 p-2 rounded-lg border border-zinc-800/60">
                  ℹ️ <strong>Konteks Vulkanologi:</strong> Letusan nyata Anak Krakatau memancarkan fragmen batuan pijar berukuran bervariasi (lapili hingga bom masif) yang terlempar secara serentak ke berbagai sudut dan kecepatan, membentuk sebaran kawah benturan.
                </p>
              </div>
            )}

            {onOpenEjectaDetail && (
              <button
                type="button"
                onClick={onOpenEjectaDetail}
                className="w-full py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-xs border border-amber-500/40 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span>💥</span>
                <span>Katalog & Detail Lemparan Bom Vulkanik</span>
              </button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Plume / Atmospheric Dispersion Parameters */}
        <div className="space-y-5">
          <div className="flex items-center justify-between pb-1 border-b border-zinc-850">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-zinc-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                2. Kolom Letusan & Dispersi Asap
              </h3>
            </div>
            <span className="text-[10px] font-mono text-zinc-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-full">
              Gaussian Plume
            </span>
          </div>

          {/* Plume Column Height */}
          <div className="space-y-1.5 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="input-column-height" className="font-medium text-zinc-200">Tinggi Kolom Erupsi (H)</label>
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-white font-mono font-bold text-xs border border-zinc-700">
                {plume.columnHeight} meter
              </span>
            </div>
            <input
              id="input-column-height"
              type="range"
              min="500"
              max="5000"
              step="100"
              value={plume.columnHeight}
              onChange={(e) => onUpdatePlume({ columnHeight: Number(e.target.value) })}
              className="w-full h-1.5"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>500 m (Emisi Gas)</span>
              <span>2.500 m (Erupsi Sedang)</span>
              <span>5.000 m (Paroksismal)</span>
            </div>
          </div>

          {/* Real-Time Live Weather Synchronization */}
          {weather && (
            <div className="bg-sky-950/30 border border-sky-500/30 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-900/60 border border-sky-400/30 text-sky-300">
                  <Wind className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>Angin Real-Time Terkini:</span>
                    <span className="font-mono text-sky-300 bg-sky-950/80 px-1.5 py-0.2 rounded border border-sky-500/30">
                      {weather.wind.speedMs} m/s ({weather.wind.directionCardinal})
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Sumber: {weather.source} • Suhu: {weather.temperatureC ?? 28}°C • Kelembapan: {weather.relativeHumidity ?? 75}%
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => onUpdatePlume({ windSpeed: weather.wind.speedMs, windDirection: weather.wind.directionDeg })}
                  className="px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-black font-bold text-[11px] transition-colors shadow-sm"
                  title="Terapkan kecepatan dan arah angin saat ini ke simulasi"
                >
                  Terapkan ke Simulasi
                </button>
                {onOpenWeatherModal && (
                  <button
                    type="button"
                    onClick={onOpenWeatherModal}
                    className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] transition-colors border border-zinc-700"
                    title="Buka data sounding atmosfer dan prakiraan 24 jam"
                  >
                    Detail
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Wind Speed */}
          <div className="space-y-1.5 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="input-wind-speed" className="font-medium text-zinc-200">Kecepatan Angin Laut (u)</label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-zinc-400 font-mono">
                  ({((plume.windSpeed * 3600) / 1000).toFixed(1)} km/h)
                </span>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-white font-mono font-bold text-xs border border-zinc-700">
                  {plume.windSpeed} m/s
                </span>
              </div>
            </div>
            <input
              id="input-wind-speed"
              type="range"
              min="0"
              max="25"
              step="0.5"
              value={plume.windSpeed}
              onChange={(e) => onUpdatePlume({ windSpeed: Number(e.target.value) })}
              className="w-full h-1.5"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>0 m/s (Tenang)</span>
              <span>10 m/s (Angin Sedang)</span>
              <span>25 m/s (Badai Laut)</span>
            </div>
          </div>

          {/* Wind Direction */}
          <div className="space-y-1.5 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="input-wind-direction" className="font-medium text-zinc-200">Arah Asal Angin Bertiup</label>
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-white font-mono font-bold text-xs border border-zinc-700 flex items-center gap-1">
                <Compass className="w-3 h-3" />
                {plume.windDirection}° • {getCompassLabel(plume.windDirection)}
              </span>
            </div>
            <input
              id="input-wind-direction"
              type="range"
              min="0"
              max="359"
              step="5"
              value={plume.windDirection}
              onChange={(e) => onUpdatePlume({ windDirection: Number(e.target.value) })}
              className="w-full h-1.5"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>0° (U)</span>
              <span>90° (T)</span>
              <span>180° (S)</span>
              <span>270° (B)</span>
              <span>360°</span>
            </div>
          </div>

          {/* Emission Intensity & Atmospheric Stability */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
              <div className="flex justify-between items-center text-xs">
                <label htmlFor="input-emission-rate" className="font-medium text-zinc-200">Laju Emisi (Q)</label>
                <span className="font-mono text-white font-semibold text-xs">
                  {plume.emissionRate.toFixed(1)}x
                </span>
              </div>
              <input
                id="input-emission-rate"
                type="range"
                min="1"
                max="10"
                step="0.5"
                value={plume.emissionRate}
                onChange={(e) => onUpdatePlume({ emissionRate: Number(e.target.value) })}
                className="w-full h-1.5"
              />
            </div>

            <div className="space-y-1.5 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
              <div className="flex justify-between items-center text-xs">
                <label htmlFor="select-stability" className="font-medium text-zinc-200">Stabilitas Udara</label>
                <span className="font-mono text-white font-semibold text-xs">
                  Kelas {plume.stabilityClass}
                </span>
              </div>
              <select
                id="select-stability"
                value={plume.stabilityClass}
                onChange={(e) => onUpdatePlume({ stabilityClass: e.target.value as PlumeParams['stabilityClass'] })}
                aria-label="Kategori Stabilitas Atmosfer"
                className="w-full bg-zinc-900 border border-zinc-750 rounded-lg text-xs px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-white"
              >
                <option value="B">Kelas B: Sangat Konvektif (Siang Terik)</option>
                <option value="C">Kelas C: Sedang Tidak Stabil</option>
                <option value="D">Kelas D: Netral (Laut Berawan)</option>
                <option value="E">Kelas E: Stabil (Malam Hari)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {onOpenAshDetail && (
                <button
                  type="button"
                  onClick={onOpenAshDetail}
                  className="w-full py-2 px-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 font-medium text-[11px] border border-purple-500/40 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>☁️</span>
                  <span>Matriks Sebaran Abu</span>
                </button>
              )}
              {onOpenAerosol && (
                <button
                  type="button"
                  onClick={onOpenAerosol}
                  className="w-full py-2 px-2.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 font-medium text-[11px] border border-sky-500/40 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>🧪</span>
                  <span>Simulasi Aerosol & SO₂</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-6 pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Sparkles className="w-4 h-4 text-white flex-shrink-0" />
          <span>Metode Integrasi Numerik Runge-Kutta Orde 4 (RK4) dihitung 60 frame per detik</span>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {onOpenExportPdf && (
            <button
              id="export-pdf-panel-btn"
              onClick={onOpenExportPdf}
              className="flex-1 sm:flex-none px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold border border-zinc-750 hover:border-zinc-600 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
              title="Unduh Laporan Resmi Parameter Erupsi & Daerah Terdampak (Format PDF A4)"
            >
              <FileText className="w-4 h-4 text-red-400" />
              <span>Ekspor PDF</span>
            </button>
          )}

          <button
            id="trigger-eruption-panel-btn"
            onClick={onTriggerEruption}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-white hover:bg-zinc-200 text-black rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 border border-white"
          >
            <Flame className="w-4 h-4" />
            <span>Luncurkan Ulang Letusan</span>
          </button>
        </div>
      </div>
    </div>
  );
};
