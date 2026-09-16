/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Wind,
  Compass,
  RefreshCw,
  Thermometer,
  Droplets,
  Gauge,
  ArrowUp,
  Check,
  Layers,
  Sparkles,
  Info,
  Clock,
  Radio,
  CloudSun,
  AlertTriangle
} from 'lucide-react';
import { KrakatauWeather, AtmosphericWindLevel } from '../types';

interface WeatherWidgetProps {
  weather: KrakatauWeather | null;
  isLoading: boolean;
  onRefresh: () => void;
  onApplyWind: (speedMs: number, directionDeg: number, sourceLabel?: string) => void;
  currentSimWindSpeed: number;
  currentSimWindDirection: number;
  isAutoSync?: boolean;
  onToggleAutoSync?: () => void;
  className?: string;
  variant?: 'floating' | 'drawer' | 'card';
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  weather,
  isLoading,
  onRefresh,
  onApplyWind,
  currentSimWindSpeed,
  currentSimWindDirection,
  isAutoSync = false,
  onToggleAutoSync,
  className = '',
  variant = 'card',
}) => {
  const [selectedLevelId, setSelectedLevelId] = useState<string>('surface');
  const [appliedFeedback, setAppliedFeedback] = useState<boolean>(false);

  if (!weather) {
    return (
      <div className={`p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 text-zinc-300 flex items-center justify-between ${className}`}>
        <div className="flex items-center gap-2.5">
          <RefreshCw className="w-4 h-4 text-sky-400 animate-spin" />
          <span className="text-xs">Mengambil data cuaca real-time G. Anak Krakatau...</span>
        </div>
        <button
          onClick={onRefresh}
          className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs border border-zinc-750 text-white"
        >
          Muat Ulang
        </button>
      </div>
    );
  }

  // Active level data
  const activeLevel =
    weather.atmosphericLevels.find((l) => l.levelId === selectedLevelId) ||
    weather.atmosphericLevels[0] || {
      levelId: 'surface',
      name: 'Permukaan (10m)',
      altitudeM: 10,
      pressureHpa: weather.pressureHpa,
      speedMs: weather.wind.speedMs,
      speedKmh: weather.wind.speedKmh,
      directionDeg: weather.wind.directionDeg,
      directionCardinal: weather.wind.directionCardinal,
      recommendedFor: 'Emisi gas fumarola & lapili dekat kawah',
    };

  const isCurrentMatchingSim =
    Math.abs(currentSimWindSpeed - activeLevel.speedMs) < 0.2 &&
    Math.abs(currentSimWindDirection - activeLevel.directionDeg) < 2;

  const handleApply = () => {
    onApplyWind(activeLevel.speedMs, activeLevel.directionDeg, activeLevel.name);
    setAppliedFeedback(true);
    setTimeout(() => setAppliedFeedback(false), 2000);
  };

  return (
    <div
      className={`rounded-2xl border transition-all text-xs font-sans ${
        variant === 'floating'
          ? 'bg-black/95 backdrop-blur-2xl border-zinc-800 shadow-2xl p-3 max-w-sm'
          : variant === 'drawer'
          ? 'bg-zinc-950 border-zinc-800/90 p-3.5 space-y-3'
          : 'bg-zinc-950 border-zinc-800 p-4 space-y-4 shadow-xl'
      } ${className}`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-850 gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
            <Wind className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-white text-xs tracking-tight">
                Cuaca & Angin Real-Time GAK
              </h4>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Koneksi API Real-Time Aktif" />
            </div>
            <span className="text-[10px] text-zinc-400 block font-mono">
              06°06'07" LS, 105°25'23" BT • {weather.stationName.split(' - ')[0]}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
            {weather.source}
          </span>
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors disabled:opacity-50"
            title="Perbarui Data Cuaca Terkini"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Meteorological Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
        {/* Wind Speed & Compass Heading */}
        <div className="col-span-2 p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <span className="text-zinc-400 text-[9px] block font-sans uppercase font-bold tracking-wider">
              Kecepatan Angin (u)
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-white font-mono">{activeLevel.speedMs}</span>
              <span className="text-xs text-zinc-400">m/s</span>
              <span className="text-[10px] text-zinc-500 font-sans">({activeLevel.speedKmh} km/j)</span>
            </div>
            <div className="text-[10px] text-zinc-300 flex items-center gap-1 font-sans">
              <span>Dari {activeLevel.directionCardinal}</span>
              <span className="text-zinc-500">({activeLevel.directionDeg}°)</span>
            </div>
          </div>

          {/* Compass Visual Rose */}
          <div className="relative w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full bg-zinc-950 border border-zinc-750 shadow-inner">
            <span className="absolute top-0.5 text-[8px] font-bold text-zinc-500">U</span>
            <span className="absolute bottom-0.5 text-[8px] font-bold text-zinc-600">S</span>
            <span className="absolute left-1 text-[8px] font-bold text-zinc-600">B</span>
            <span className="absolute right-1 text-[8px] font-bold text-zinc-600">T</span>

            {/* Rotating Arrow Indicator: points towards wind direction */}
            <div
              className="w-full h-full flex items-center justify-center transition-transform duration-700 ease-out"
              style={{ transform: `rotate(${activeLevel.directionDeg}deg)` }}
            >
              <div className="w-0.5 h-7 bg-sky-400 rounded-full relative flex items-start justify-center">
                <div className="w-2 h-2 bg-sky-400 rotate-45 -mt-1 rounded-xs shadow-sm shadow-sky-400/50" />
              </div>
            </div>
          </div>
        </div>

        {/* Temperature & Condition */}
        <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[9px] font-sans font-medium uppercase">Suhu Udara</span>
            <Thermometer className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-base font-bold text-white">
            {weather.temperatureC}°C
          </div>
          <span className="text-[9px] text-zinc-400 truncate block font-sans" title={weather.weatherCondition}>
            {weather.weatherCondition}
          </span>
        </div>

        {/* Pressure & Humidity */}
        <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[9px] font-sans font-medium uppercase">Barometer</span>
            <Gauge className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="text-base font-bold text-white">
            {weather.pressureHpa} <span className="text-[9px] font-normal text-zinc-500">hPa</span>
          </div>
          <span className="text-[9px] text-zinc-400 block font-sans">
            Lembap {weather.relativeHumidity}%
          </span>
        </div>
      </div>

      {/* Atmospheric Vertical Levels (Sounding / Plume Heights) */}
      <div className="space-y-1.5 bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-850">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 font-sans">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            Profil Angin Menurut Ketinggian Kolom Plume:
          </span>
          <span className="text-[9px] text-zinc-500 font-mono">WMO Atmospheric Sounding</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {weather.atmosphericLevels.map((lvl) => {
            const isSelected = lvl.levelId === selectedLevelId;
            return (
              <button
                key={lvl.levelId}
                onClick={() => setSelectedLevelId(lvl.levelId)}
                className={`p-2 rounded-lg text-left transition-all border ${
                  isSelected
                    ? 'bg-zinc-800 text-white border-zinc-600 shadow-sm'
                    : 'bg-zinc-950/60 text-zinc-400 border-zinc-850 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between text-[9px]">
                  <span className="font-semibold text-zinc-300">{lvl.altitudeM}m</span>
                  <span className="font-mono text-zinc-500">{lvl.pressureHpa} hPa</span>
                </div>
                <div className="text-xs font-bold text-white mt-0.5 font-mono">
                  {lvl.speedMs} m/s
                </div>
                <div className="text-[9px] text-zinc-400 font-mono truncate">
                  {lvl.directionDeg}° ({lvl.directionCardinal.split(' ')[0]})
                </div>
              </button>
            );
          })}
        </div>

        <div className="text-[9px] text-zinc-400 font-sans pt-1 flex items-center justify-between">
          <span>Rekomendasi: <strong className="text-zinc-200">{activeLevel.recommendedFor}</strong></span>
          <span className="text-zinc-500 font-mono">Geser Angin: {(activeLevel.speedMs - weather.wind.speedMs).toFixed(1)} m/s</span>
        </div>
      </div>

      {/* Synchronization & Apply Action Bar */}
      <div className="pt-2 border-t border-zinc-850 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {onToggleAutoSync && (
            <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-zinc-300 hover:text-white select-none">
              <input
                type="checkbox"
                checked={isAutoSync}
                onChange={onToggleAutoSync}
                className="rounded border-zinc-700 bg-zinc-900 text-sky-500 focus:ring-0 w-3.5 h-3.5"
              />
              <span className="font-medium">Sinkronisasi Otomatis</span>
            </label>
          )}

          <div className="text-[10px] font-mono text-zinc-400 hidden sm:block">
            Status Sim: <strong className="text-white">{currentSimWindSpeed} m/s</strong>, <strong className="text-white">{currentSimWindDirection}°</strong>
          </div>
        </div>

        <button
          onClick={handleApply}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 border ${
            appliedFeedback
              ? 'bg-emerald-500 text-black border-emerald-400'
              : isCurrentMatchingSim
              ? 'bg-zinc-850 text-zinc-300 border-zinc-700 hover:bg-zinc-800 hover:text-white'
              : 'bg-white hover:bg-zinc-200 text-black border-white'
          }`}
        >
          {appliedFeedback ? (
            <>
              <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
              <span>Tersinkronkan ke Simulasi!</span>
            </>
          ) : (
            <>
              <Wind className="w-3.5 h-3.5" />
              <span>
                {isCurrentMatchingSim
                  ? 'Terapkan Ulang Angin'
                  : `Terapkan Angin (${activeLevel.speedMs} m/s, ${activeLevel.directionDeg}°)`}
              </span>
            </>
          )}
        </button>
      </div>

      {/* 12-Hour Forecast Strip (Future Dispersion Predictions) */}
      {weather.forecast && weather.forecast.length > 0 && (
        <div className="space-y-1.5 pt-1 border-t border-zinc-850/80">
          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block font-sans">
            Prediksi Pergeseran Arah Angin Selat Sunda (12 Jam Kedepan):
          </span>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {weather.forecast.slice(0, 6).map((fc, i) => (
              <button
                key={i}
                onClick={() => onApplyWind(fc.speedMs, fc.directionDeg, `Prediksi ${fc.timeLabel}`)}
                className="flex-shrink-0 p-1.5 rounded-lg bg-zinc-900/60 hover:bg-zinc-850 border border-zinc-800/80 text-left text-[9px] font-mono transition-colors group"
                title={`Terapkan angin prediksi ${fc.timeLabel}: ${fc.speedMs} m/s, ${fc.directionDeg}°`}
              >
                <span className="text-zinc-400 block group-hover:text-white">{fc.timeLabel.split(' ')[0]}</span>
                <span className="font-bold text-white block">{fc.speedMs} m/s</span>
                <span className="text-zinc-400 block truncate">{fc.directionCardinal.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
