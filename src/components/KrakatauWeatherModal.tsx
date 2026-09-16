/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Wind,
  Compass,
  Thermometer,
  Droplets,
  Gauge,
  Radio,
  Layers,
  RefreshCw,
  Check,
  Globe,
  ArrowRight,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { KrakatauWeather, AtmosphericWindLevel } from '../types';

interface KrakatauWeatherModalProps {
  isOpen: boolean;
  onClose: () => void;
  weather: KrakatauWeather | null;
  isLoading: boolean;
  onRefresh: () => void;
  onApplyWind: (speedMs: number, directionDeg: number, sourceLabel?: string) => void;
  currentSimWindSpeed: number;
  currentSimWindDirection: number;
  onFocusMap?: () => void;
}

export const KrakatauWeatherModal: React.FC<KrakatauWeatherModalProps> = ({
  isOpen,
  onClose,
  weather,
  isLoading,
  onRefresh,
  onApplyWind,
  currentSimWindSpeed,
  currentSimWindDirection,
  onFocusMap,
}) => {
  const [selectedLevelId, setSelectedLevelId] = useState<string>('surface');
  const [appliedFeedback, setAppliedFeedback] = useState<boolean>(false);

  if (!isOpen) return null;

  const activeLevel =
    weather?.atmosphericLevels.find((l) => l.levelId === selectedLevelId) ||
    weather?.atmosphericLevels[0];

  const handleApply = (level?: AtmosphericWindLevel) => {
    const target = level || activeLevel;
    if (target) {
      onApplyWind(target.speedMs, target.directionDeg, target.name);
      setAppliedFeedback(true);
      setTimeout(() => setAppliedFeedback(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden text-zinc-200 text-xs">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-850 flex items-center justify-between bg-black/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Wind className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Stasiun Cuaca & Angin Real-Time GAK
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LIVE SATELLITE
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Gunung Anak Krakatau • Koordinat 06°06'07" LS, 105°25'23" BT • Selat Sunda
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
              title="Perbarui data cuaca"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {weather ? (
            <>
              {/* Telemetry Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                  <span className="text-zinc-400 text-[10px] font-medium block uppercase">
                    Kecepatan Angin
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-white">
                      {weather.wind.speedMs}
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">m/s</span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {weather.wind.speedKmh} km/j • Gust {weather.wind.gustMs} m/s
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                  <span className="text-zinc-400 text-[10px] font-medium block uppercase">
                    Arah Asal Angin
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-white">
                      {weather.wind.directionDeg}°
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 truncate block">
                    {weather.wind.directionCardinal}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                  <span className="text-zinc-400 text-[10px] font-medium block uppercase">
                    Suhu & Kondisi
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-white">
                      {weather.temperatureC}°C
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 truncate block">
                    {weather.weatherCondition}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                  <span className="text-zinc-400 text-[10px] font-medium block uppercase">
                    Tekanan & Lembap
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-white">
                      {weather.pressureHpa}
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">hPa</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    RH: {weather.relativeHumidity}%
                  </span>
                </div>
              </div>

              {/* Physical Dispersion Insight: Wind Direction vs Ash Drift */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/40 border border-zinc-800/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-sky-400" />
                    Hubungan Arah Angin Meteorologi & Dinamika Abu Vulkanik:
                  </span>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Angin bertiup <strong>DARI arah {weather.wind.directionCardinal} ({weather.wind.directionDeg}°)</strong>, sehingga awan debu dan sebaran abu vulkanik didorong <strong>MENUJU {weather.wind.driftDirectionDeg}°</strong> (kebalikan 180°).
                  </p>
                </div>

                <div className="flex-shrink-0 flex items-center gap-2 p-2 rounded-xl bg-black/60 border border-zinc-800 font-mono text-xs">
                  <div className="text-center px-2">
                    <span className="text-[9px] text-zinc-500 block">ANGIN ASAL</span>
                    <strong className="text-white">{weather.wind.directionDeg}°</strong>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-500" />
                  <div className="text-center px-2">
                    <span className="text-[9px] text-zinc-500 block">SEBARAN ABU</span>
                    <strong className="text-amber-400">{weather.wind.driftDirectionDeg}°</strong>
                  </div>
                </div>
              </div>

              {/* Sounding Table: Atmospheric Winds at Column Heights */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-white" />
                    Profil Lapisan Atmosfer (Sounding Vertikal Selat Sunda)
                  </h4>
                  <span className="text-[10px] text-zinc-500 font-mono">Sumber: {weather.source}</span>
                </div>

                <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900/30">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-900/90 border-b border-zinc-800 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                        <th className="p-2.5 sm:p-3">Ketinggian / Level</th>
                        <th className="p-2.5 sm:p-3">Tekanan</th>
                        <th className="p-2.5 sm:p-3">Kecepatan Angin</th>
                        <th className="p-2.5 sm:p-3">Arah Asal</th>
                        <th className="p-2.5 sm:p-3 hidden sm:table-cell">Aplikasi Erupsi</th>
                        <th className="p-2.5 sm:p-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850 font-mono text-[11px]">
                      {weather.atmosphericLevels.map((lvl) => {
                        const isSimMatched =
                          Math.abs(currentSimWindSpeed - lvl.speedMs) < 0.2 &&
                          Math.abs(currentSimWindDirection - lvl.directionDeg) < 2;

                        return (
                          <tr
                            key={lvl.levelId}
                            className={`hover:bg-zinc-900/60 transition-colors ${
                              isSimMatched ? 'bg-sky-950/20' : ''
                            }`}
                          >
                            <td className="p-2.5 sm:p-3 font-semibold text-white">
                              {lvl.name}
                            </td>
                            <td className="p-2.5 sm:p-3 text-zinc-400">
                              {lvl.pressureHpa} hPa
                            </td>
                            <td className="p-2.5 sm:p-3">
                              <span className="text-white font-bold">{lvl.speedMs} m/s</span>{' '}
                              <span className="text-zinc-500 text-[10px]">({lvl.speedKmh} km/j)</span>
                            </td>
                            <td className="p-2.5 sm:p-3 text-zinc-300">
                              {lvl.directionDeg}° ({lvl.directionCardinal})
                            </td>
                            <td className="p-2.5 sm:p-3 text-zinc-400 font-sans text-[10px] hidden sm:table-cell">
                              {lvl.recommendedFor}
                            </td>
                            <td className="p-2.5 sm:p-3 text-right">
                              <button
                                onClick={() => handleApply(lvl)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-sans font-bold transition-all ${
                                  isSimMatched
                                    ? 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                                    : 'bg-white hover:bg-zinc-200 text-black shadow-sm'
                                }`}
                              >
                                {isSimMatched ? 'Aktif' : 'Terapkan'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 12-Hour Wind Forecast Predictions */}
              {weather.forecast && weather.forecast.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                    Prediksi Cuaca & Pergeseran Angin (12-16 Jam Kedepan)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                    {weather.forecast.map((fc, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1 text-center font-mono text-[10px]"
                      >
                        <span className="text-zinc-400 block font-bold">{fc.timeLabel}</span>
                        <div className="text-sm font-bold text-white my-0.5">{fc.speedMs} m/s</div>
                        <span className="text-zinc-400 block">{fc.directionDeg}° ({fc.directionCardinal.split(' ')[0]})</span>
                        <span className="text-zinc-500 block">{fc.tempC}°C</span>
                        <button
                          onClick={() => onApplyWind(fc.speedMs, fc.directionDeg, `Prediksi ${fc.timeLabel}`)}
                          className="mt-1 w-full py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-sans text-[9px] transition-colors"
                        >
                          Pilih
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-zinc-400">
              <p>Sedang menyambungkan ke API cuaca...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-850 bg-black/50 flex flex-wrap items-center justify-between gap-2.5">
          <div className="text-[11px] font-mono text-zinc-400">
            Terakhir Diperbarui: <strong className="text-white">{weather?.lastUpdated || '-'}</strong>
          </div>

          <div className="flex items-center gap-2">
            {onFocusMap && (
              <button
                onClick={() => {
                  onFocusMap();
                  onClose();
                }}
                className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-white text-xs font-semibold transition-colors"
              >
                Buka Peta Satelit
              </button>
            )}

            <button
              onClick={() => handleApply()}
              className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              {appliedFeedback ? (
                <>
                  <Check className="w-4 h-4 text-black stroke-[3]" />
                  <span>Tersinkronisasi!</span>
                </>
              ) : (
                <>
                  <Wind className="w-4 h-4" />
                  <span>Terapkan Kondisi Terkini ke Simulasi</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
