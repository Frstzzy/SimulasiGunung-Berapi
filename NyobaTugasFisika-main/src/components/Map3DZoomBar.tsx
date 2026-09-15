/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  Crosshair,
  MapPin,
} from 'lucide-react';

interface Map3DZoomBarProps {
  zoomDistance: number; // in meters (250 to 50000)
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onSliderChange: (newDistance: number) => void;
  scrollSensitivity: 'fine' | 'normal' | 'fast';
  onChangeSensitivity: (s: 'fine' | 'normal' | 'fast') => void;
  onSelectDistancePreset: (dist: number) => void;
  showGeologicalLabels: boolean;
  onToggleGeologicalLabels: () => void;
}

// Convert radius distance (250 - 50000) to 0-100 logarithmic slider percentage
function distanceToSliderPercent(dist: number): number {
  const minLog = Math.log(250);
  const maxLog = Math.log(50000);
  const curLog = Math.log(Math.max(250, Math.min(50000, dist)));
  return Math.round(((curLog - minLog) / (maxLog - minLog)) * 100);
}

// Convert 0-100 slider percentage to distance in meters
function sliderPercentToDistance(percent: number): number {
  const minLog = Math.log(250);
  const maxLog = Math.log(50000);
  const curLog = minLog + (percent / 100) * (maxLog - minLog);
  return Math.round(Math.exp(curLog));
}

export const Map3DZoomBar: React.FC<Map3DZoomBarProps> = ({
  zoomDistance,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onSliderChange,
  scrollSensitivity,
  onChangeSensitivity,
  onSelectDistancePreset,
  showGeologicalLabels,
  onToggleGeologicalLabels,
}) => {
  const sliderValue = distanceToSliderPercent(zoomDistance);

  // Perspective categorization label based on distance
  const getPerspectiveLabel = (d: number) => {
    if (d < 750) return { label: 'Mikro Kawah', color: 'text-white', badge: 'bg-white text-black font-bold' };
    if (d < 2200) return { label: 'Anak Krakatau', color: 'text-zinc-200', badge: 'bg-zinc-800 text-white border border-zinc-700' };
    if (d < 8000) return { label: 'Kaldera Purba', color: 'text-zinc-300', badge: 'bg-zinc-850 text-zinc-200 border border-zinc-750' };
    if (d < 20000) return { label: 'Koridor ALKI I', color: 'text-zinc-300', badge: 'bg-zinc-900 text-zinc-300 border border-zinc-800' };
    return { label: 'Orbit Selat Sunda', color: 'text-zinc-400', badge: 'bg-zinc-950 text-zinc-400 border border-zinc-800' };
  };

  const currentPerspective = getPerspectiveLabel(zoomDistance);

  const formattedDistance =
    zoomDistance >= 1000
      ? `${(zoomDistance / 1000).toFixed(zoomDistance >= 10000 ? 1 : 2)} km`
      : `${Math.round(zoomDistance)} m`;

  return (
    <div className="bg-black/95 backdrop-blur-xl p-3 sm:p-3.5 rounded-2xl border border-zinc-800 shadow-2xl space-y-2.5 text-xs text-zinc-200">
      {/* Header: Zoom Title & Real-time Distance Readout */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
        <div className="flex items-center gap-1.5">
          <Crosshair className="w-4 h-4 text-white" />
          <span className="font-bold text-white text-[12px]">Pengaturan Zoom 3D</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${currentPerspective.badge}`}>
            {currentPerspective.label}
          </span>
          <span className="bg-zinc-900 px-2 py-0.5 rounded-lg border border-zinc-750 font-bold text-white">
            {formattedDistance}
          </span>
        </div>
      </div>

      {/* Interactive Range Slider with Zoom In & Zoom Out Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onZoomIn}
          title="Perbesar / Dekatkan Kamera (Zoom In)"
          className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 text-zinc-300 hover:text-white active:scale-95 transition-all shadow"
        >
          <ZoomIn className="w-4 h-4" />
        </button>

        {/* Custom Stylized Slider */}
        <div className="flex-1 relative flex items-center">
          <input
            type="range"
            min="0"
            max="100"
            value={sliderValue}
            onChange={(e) => onSliderChange(sliderPercentToDistance(Number(e.target.value)))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg cursor-pointer accent-white"
            title={`Jarak Kamera: ${formattedDistance}`}
          />
        </div>

        <button
          onClick={onZoomOut}
          title="Perkecil / Jauhkan Kamera (Zoom Out)"
          className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 text-zinc-300 hover:text-white active:scale-95 transition-all shadow"
        >
          <ZoomOut className="w-4 h-4" />
        </button>

        <button
          onClick={onResetZoom}
          title="Reset Zoom ke Kawah Utama (1,1 km)"
          className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 text-zinc-400 hover:text-white active:scale-95 transition-all shadow"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Distance Presets - Monochrome Pills */}
      <div className="grid grid-cols-4 gap-1 text-[10px] font-mono">
        {[
          { label: '500m', title: 'Kawah Mikro', dist: 500 },
          { label: '1.2km', title: 'Anak Krakatau', dist: 1200 },
          { label: '6km', title: 'Kaldera Rakata', dist: 6000 },
          { label: '25km', title: 'Selat Sunda', dist: 25000 },
        ].map((item) => {
          const isSelected = Math.abs(zoomDistance - item.dist) < item.dist * 0.35;
          return (
            <button
              key={item.label}
              onClick={() => onSelectDistancePreset(item.dist)}
              className={`px-1.5 py-1 rounded-lg text-center transition-all border ${
                isSelected
                  ? 'bg-white text-black font-bold border-white shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
              }`}
              title={item.title}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Bottom Row: Scroll Sensitivity & Geological Labels Toggle */}
      <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px]">
        {/* Scroll Wheel Sensitivity */}
        <div className="flex items-center gap-1">
          <span className="text-zinc-400 flex items-center gap-1 text-[10px]">
            <Sliders className="w-3 h-3 text-zinc-500" />
            Scroll:
          </span>
          <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-800 text-[10px]">
            {(['fine', 'normal', 'fast'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => onChangeSensitivity(mode)}
                className={`px-1.5 py-0.5 rounded capitalize transition-all ${
                  scrollSensitivity === mode
                    ? 'bg-white text-black font-bold'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title={`Sensitivitas scroll roda mouse: ${mode}`}
              >
                {mode === 'fine' ? 'Halus' : mode === 'normal' ? 'Normal' : 'Cepat'}
              </button>
            ))}
          </div>
        </div>

        {/* Pin labels toggle */}
        <button
          onClick={onToggleGeologicalLabels}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-medium transition-all ${
            showGeologicalLabels
              ? 'bg-white text-black border-white font-semibold'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
          }`}
          title="Tampilkan / Sembunyikan Pin Label Landmark Geologi"
        >
          <MapPin className="w-3 h-3" />
          <span>Label Pin</span>
        </button>
      </div>
    </div>
  );
};
