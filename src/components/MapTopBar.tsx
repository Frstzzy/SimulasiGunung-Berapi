import React from 'react';
import { Eye, ChevronDown, Radio, Crosshair, Layers, BarChart3 } from 'lucide-react';
import { CRATER_COORDS } from './RealSatelliteMap';
import { BMKG_SIGMET_SCENARIOS } from '../data/bmkgData';

export type TileProvider = 'satellite' | 'dark' | 'osm' | 'ocean';

interface MapTopBarProps {
  selectedTile: TileProvider;
  setSelectedTile: (tile: TileProvider) => void;
  isBasemapOpen: boolean;
  setIsBasemapOpen: (open: boolean) => void;
  activeBmkgScenarioId: string;
  onSelectBmkgScenario: (scenario: any) => void;
  onOpenBmkgModal: () => void;
  isCameraOpen: boolean;
  setIsCameraOpen: (open: boolean) => void;
  onFlyTo: (coords: [number, number], zoom: number) => void;
  isLayersOpen: boolean;
  setIsLayersOpen: (open: boolean) => void;
  activeLayersCount: number;
  showMaxBallisticRadius: boolean;
  setShowMaxBallisticRadius: (v: boolean) => void;
  showActiveTrajectory: boolean;
  setShowActiveTrajectory: (v: boolean) => void;
  showKRBZones: boolean;
  setShowKRBZones: (v: boolean) => void;
  showUmbrellaCloud: boolean;
  setShowUmbrellaCloud: (v: boolean) => void;
  showAshPlumeCones: boolean;
  setShowAshPlumeCones: (v: boolean) => void;
  showIsochrones: boolean;
  setShowIsochrones: (v: boolean) => void;
  showAshPuffs: boolean;
  setShowAshPuffs: (v: boolean) => void;
  showBmkgSigmet: boolean;
  setShowBmkgSigmet: (v: boolean) => void;
  showBmkgAshDeposit: boolean;
  setShowBmkgAshDeposit: (v: boolean) => void;
  showLandmarks: boolean;
  setShowLandmarks: (v: boolean) => void;
  showShipping: boolean;
  setShowShipping: (v: boolean) => void;
  showRadiusLabels: boolean;
  setShowRadiusLabels: (v: boolean) => void;
  onOpenDetailModal: () => void;
  showOverviewCard: boolean;
  setShowOverviewCard: (v: boolean | ((prev: boolean) => boolean)) => void;
  maxBallisticKm: number;
}

export const MapTopBar: React.FC<MapTopBarProps> = ({
  selectedTile,
  setSelectedTile,
  isBasemapOpen,
  setIsBasemapOpen,
  activeBmkgScenarioId,
  onSelectBmkgScenario,
  onOpenBmkgModal,
  isCameraOpen,
  setIsCameraOpen,
  onFlyTo,
  isLayersOpen,
  setIsLayersOpen,
  activeLayersCount,
  showMaxBallisticRadius,
  setShowMaxBallisticRadius,
  showActiveTrajectory,
  setShowActiveTrajectory,
  showKRBZones,
  setShowKRBZones,
  showUmbrellaCloud,
  setShowUmbrellaCloud,
  showAshPlumeCones,
  setShowAshPlumeCones,
  showIsochrones,
  setShowIsochrones,
  showAshPuffs,
  setShowAshPuffs,
  showBmkgSigmet,
  setShowBmkgSigmet,
  showBmkgAshDeposit,
  setShowBmkgAshDeposit,
  showLandmarks,
  setShowLandmarks,
  showShipping,
  setShowShipping,
  showRadiusLabels,
  setShowRadiusLabels,
  onOpenDetailModal,
  showOverviewCard,
  setShowOverviewCard,
  maxBallisticKm,
}) => {
  return (
    <div className="absolute top-3.5 left-3.5 right-3.5 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none font-sans">
      {/* Left: Volcano Title Chip & Basemap Switcher */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-2 bg-black/90 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-zinc-800 text-xs shadow-xl">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
          <span className="font-bold text-white text-[12px] hidden sm:inline">G. Anak Krakatau</span>
          <span className="text-zinc-500 hidden sm:inline">•</span>
          <span className="font-mono text-[10px] text-zinc-400">157 mdpl (Selat Sunda)</span>
        </div>

        {/* Basemap Dropdown */}
        <div className="relative">
          <button
            id="basemap-dropdown-btn"
            onClick={() => {
              setIsBasemapOpen(!isBasemapOpen);
              setIsLayersOpen(false);
              setIsCameraOpen(false);
            }}
            className="flex items-center gap-1.5 bg-black/90 backdrop-blur-xl px-2.5 py-1.5 rounded-xl border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-200 hover:text-white shadow-xl transition-all"
            title="Ganti Citra Dasar Peta"
          >
            <Eye className="w-3.5 h-3.5 text-zinc-300" />
            <span className="text-[11px] font-medium hidden md:inline">
              {selectedTile === 'satellite'
                ? '🛰️ Esri Satellite'
                : selectedTile === 'dark'
                ? '🌑 Dark Taktis'
                : selectedTile === 'osm'
                ? '🗺️ Topografi'
                : '🌊 Batimetri'}
            </span>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          {isBasemapOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-48 bg-black/95 backdrop-blur-2xl border border-zinc-800 rounded-xl p-1.5 shadow-2xl z-30 space-y-1">
              <div className="text-[10px] font-mono text-zinc-500 px-2 py-0.5">PILIH CITRA DASAR:</div>
              {(['satellite', 'dark', 'osm', 'ocean'] as TileProvider[]).map((tileKey) => (
                <button
                  key={tileKey}
                  onClick={() => {
                    setSelectedTile(tileKey);
                    setIsBasemapOpen(false);
                  }}
                  className={`w-full px-2 py-1.5 rounded-lg text-left text-[11px] flex items-center justify-between transition-all ${
                    selectedTile === tileKey
                      ? 'bg-white text-black font-bold shadow-sm'
                      : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                  }`}
                >
                  <span>
                    {tileKey === 'satellite'
                      ? '🛰️ Esri Satellite'
                      : tileKey === 'dark'
                      ? '🌑 Dark Taktis'
                      : tileKey === 'osm'
                      ? '🗺️ Topografi OSM'
                      : '🌊 Batimetri Laut'}
                  </span>
                  {selectedTile === tileKey && <span className="text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Center: BMKG Scenarios Pill Bar */}
      <div className="hidden lg:flex items-center gap-1.5 bg-black/90 backdrop-blur-xl px-2.5 py-1 rounded-xl border border-zinc-800 shadow-xl text-xs pointer-events-auto">
        <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
          <Radio className="w-3 h-3 text-white" />
          BMKG:
        </span>
        <div className="flex items-center gap-1">
          {BMKG_SIGMET_SCENARIOS.map((sc) => {
            const isActive = activeBmkgScenarioId === sc.id;
            return (
              <button
                key={sc.id}
                onClick={() => onSelectBmkgScenario(sc)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition-all border ${
                  isActive
                    ? 'bg-white text-black font-bold border-white shadow-sm'
                    : 'bg-zinc-900/80 text-zinc-300 border-zinc-800 hover:text-white hover:bg-zinc-800'
                }`}
                title={`${sc.title} (${sc.driftDirectionDeg}°, ${sc.windSpeedMs} m/s)`}
              >
                {sc.id === 'sigmet-west-monsoon' && '🌧️ Barat'}
                {sc.id === 'sigmet-north-threat' && '⚠️ Sebesi'}
                {sc.id === 'sigmet-east-monsoon' && '🌊 Timur'}
                {sc.id === 'sigmet-historic-2018' && '📜 2018'}
              </button>
            );
          })}
        </div>
        <button
          onClick={onOpenBmkgModal}
          className="ml-1 text-[10px] font-mono text-zinc-400 hover:text-white underline"
          title="Buka Pusat Data BMKG Lengkap"
        >
          Buletin
        </button>
      </div>

      {/* Right: Quick Action Buttons (Kamera, Lapisan, Analisis) */}
      <div className="flex items-center gap-1.5 pointer-events-auto">
        {/* Kamera Focus Dropdown */}
        <div className="relative">
          <button
            id="camera-focus-btn"
            onClick={() => {
              setIsCameraOpen(!isCameraOpen);
              setIsLayersOpen(false);
              setIsBasemapOpen(false);
            }}
            className="flex items-center gap-1.5 bg-black/90 backdrop-blur-xl px-2.5 py-1.5 rounded-xl border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-200 hover:text-white shadow-xl transition-all"
            title="Fokuskan Kamera Wilayah"
          >
            <Crosshair className="w-3.5 h-3.5 text-zinc-300" />
            <span className="text-[11px] font-medium hidden sm:inline">Fokus</span>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          {isCameraOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-52 bg-black/95 backdrop-blur-2xl border border-zinc-800 rounded-xl p-1.5 shadow-2xl z-30 space-y-1">
              <div className="text-[10px] font-mono text-zinc-500 px-2 py-0.5">FOKUS KAMERA:</div>
              <button
                onClick={() => {
                  onFlyTo(CRATER_COORDS, 14);
                  setIsCameraOpen(false);
                }}
                className="w-full px-2 py-1.5 rounded-lg text-left text-[11px] text-zinc-300 hover:bg-zinc-900 hover:text-white flex items-center gap-2"
              >
                <span>🌋</span> Kawah Anak Krakatau
              </button>
              <button
                onClick={() => {
                  onFlyTo(CRATER_COORDS, 12);
                  setIsCameraOpen(false);
                }}
                className="w-full px-2 py-1.5 rounded-lg text-left text-[11px] text-zinc-300 hover:bg-zinc-900 hover:text-white flex items-center gap-2"
              >
                <span>🏝️</span> Kaldera Purba (5 km)
              </button>
              <button
                onClick={() => {
                  onFlyTo([-6.08, 105.65], 10);
                  setIsCameraOpen(false);
                }}
                className="w-full px-2 py-1.5 rounded-lg text-left text-[11px] text-zinc-300 hover:bg-zinc-900 hover:text-white flex items-center gap-2"
              >
                <span>🌊</span> Selat Sunda Penuh
              </button>
              <button
                onClick={() => {
                  onFlyTo([-6.05, 105.88], 11);
                  setIsCameraOpen(false);
                }}
                className="w-full px-2 py-1.5 rounded-lg text-left text-[11px] text-zinc-300 hover:bg-zinc-900 hover:text-white flex items-center gap-2"
              >
                <span>🏖️</span> Pesisir Anyer Banten
              </button>
              <button
                onClick={() => {
                  onFlyTo([-5.95, 105.48], 12);
                  setIsCameraOpen(false);
                }}
                className="w-full px-2 py-1.5 rounded-lg text-left text-[11px] text-zinc-300 hover:bg-zinc-900 hover:text-white flex items-center gap-2"
              >
                <span>🏝️</span> Pulau Sebesi
              </button>
            </div>
          )}
        </div>

        {/* Lapisan Dropdown */}
        <div className="relative">
          <button
            id="layers-toggle-btn"
            onClick={() => {
              setIsLayersOpen(!isLayersOpen);
              setIsCameraOpen(false);
              setIsBasemapOpen(false);
            }}
            className="flex items-center gap-1.5 bg-black/90 backdrop-blur-xl px-2.5 py-1.5 rounded-xl border border-zinc-800 hover:border-zinc-700 text-xs text-zinc-200 hover:text-white shadow-xl transition-all"
            title="Buka Pilihan Layer Peta"
          >
            <Layers className="w-3.5 h-3.5 text-zinc-300" />
            <span className="text-[11px] font-medium hidden sm:inline">Lapisan</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
              {activeLayersCount}
            </span>
            <ChevronDown className="w-3 h-3 text-zinc-400" />
          </button>

          {isLayersOpen && (
            <div className="absolute top-full right-0 mt-1.5 w-72 sm:w-80 max-h-[75vh] overflow-y-auto no-scrollbar bg-black/95 backdrop-blur-2xl border border-zinc-800 rounded-2xl p-3 shadow-2xl z-30 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-white" />
                  Lapisan Peta Satelit
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {activeLayersCount} Aktif
                </span>
              </div>

              {/* Section 1: Bahaya Lontaran */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block font-bold">
                  💣 Bahaya Lontaran & Bom
                </span>
                <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-zinc-900 cursor-pointer text-[11px] text-zinc-300">
                  <span>Radius Bom Maks (360°)</span>
                  <input
                    type="checkbox"
                    checked={showMaxBallisticRadius}
                    onChange={(e) => setShowMaxBallisticRadius(e.target.checked)}
                    className="rounded border-zinc-700 text-white focus:ring-0"
                  />
                </label>
                <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-zinc-900 cursor-pointer text-[11px] text-zinc-300">
                  <span>Trajektori & Titik Jatuh</span>
                  <input
                    type="checkbox"
                    checked={showActiveTrajectory}
                    onChange={(e) => setShowActiveTrajectory(e.target.checked)}
                    className="rounded border-zinc-700 text-white focus:ring-0"
                  />
                </label>
                <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-zinc-900 cursor-pointer text-[11px] text-zinc-300">
                  <span>Perimeter Steril KRB III (5 km)</span>
                  <input
                    type="checkbox"
                    checked={showKRBZones}
                    onChange={(e) => setShowKRBZones(e.target.checked)}
                    className="rounded border-zinc-700 text-white focus:ring-0"
                  />
                </label>
              </div>

              {/* Section 2: Sebaran Asap & Abu */}
              <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                <span className="text-[10px] font-mono text-zinc-300 uppercase tracking-wider block font-bold">
                  💨 Sebaran Asap & Abu
                </span>
                <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-zinc-900 cursor-pointer text-[11px] text-zinc-300">
                  <span>Radius Payung Asap Kawah</span>
                  <input
                    type="checkbox"
                    checked={showUmbrellaCloud}
                    onChange={(e) => setShowUmbrellaCloud(e.target.checked)}
                    className="rounded border-zinc-700 text-white focus:ring-0"
                  />
                </label>
                <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-zinc-900 cursor-pointer text-[11px] text-zinc-300">
                  <span>Konus Sebaran Abu (3 Zona)</span>
                  <input
                    type="checkbox"
                    checked={showAshPlumeCones}
                    onChange={(e) => setShowAshPlumeCones(e.target.checked)}
                    className="rounded border-zinc-700 text-white focus:ring-0"
                  />
                </label>
                <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-zinc-900 cursor-pointer text-[11px] text-zinc-300">
                  <span>Garis Isochrone Waktu (T+15m–6h)</span>
                  <input
                    type="checkbox"
                    checked={showIsochrones}
                    onChange={(e) => setShowIsochrones(e.target.checked)}
                    className="rounded border-zinc-700 text-white focus:ring-0"
                  />
                </label>
                <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-zinc-900 cursor-pointer text-[11px] text-zinc-300">
                  <span>Animasi Partikel Abu</span>
                  <input
                    type="checkbox"
                    checked={showAshPuffs}
                    onChange={(e) => setShowAshPuffs(e.target.checked)}
                    className="rounded border-zinc-700 text-white focus:ring-0"
                  />
                </label>
              </div>

              {/* Section 3: Data BMKG & Landmark */}
              <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block font-bold">
                  🏛️ BMKG & Navigasi
                </span>
                <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-zinc-900 cursor-pointer text-[11px] text-zinc-300">
                  <span>Poligon SIGMET BMKG</span>
                  <input
                    type="checkbox"
                    checked={showBmkgSigmet}
                    onChange={(e) => setShowBmkgSigmet(e.target.checked)}
                    className="rounded border-zinc-700 text-white focus:ring-0"
                  />
                </label>
                <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-zinc-900 cursor-pointer text-[11px] text-zinc-300">
                  <span>Kontur Isopach Endapan</span>
                  <input
                    type="checkbox"
                    checked={showBmkgAshDeposit}
                    onChange={(e) => setShowBmkgAshDeposit(e.target.checked)}
                    className="rounded border-zinc-700 text-white focus:ring-0"
                  />
                </label>
                <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-zinc-900 cursor-pointer text-[11px] text-zinc-300">
                  <span>Titik Daratan & Pulau</span>
                  <input
                    type="checkbox"
                    checked={showLandmarks}
                    onChange={(e) => setShowLandmarks(e.target.checked)}
                    className="rounded border-zinc-700 text-white focus:ring-0"
                  />
                </label>
                <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-zinc-900 cursor-pointer text-[11px] text-zinc-300">
                  <span>Koridor Pelayaran ALKI I</span>
                  <input
                    type="checkbox"
                    checked={showShipping}
                    onChange={(e) => setShowShipping(e.target.checked)}
                    className="rounded border-zinc-700 text-white focus:ring-0"
                  />
                </label>
                <label className="flex items-center justify-between p-1.5 rounded-lg hover:bg-zinc-900 cursor-pointer text-[11px] text-zinc-300">
                  <span>Label Jarak Radius</span>
                  <input
                    type="checkbox"
                    checked={showRadiusLabels}
                    onChange={(e) => setShowRadiusLabels(e.target.checked)}
                    className="rounded border-zinc-700 text-white focus:ring-0"
                  />
                </label>
              </div>

              {/* Footer Buttons */}
              <div className="pt-2 border-t border-zinc-800 flex gap-2">
                <button
                  onClick={() => {
                    onOpenBmkgModal();
                    setIsLayersOpen(false);
                  }}
                  className="flex-1 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-200 font-mono text-center"
                >
                  Pusat Data BMKG
                </button>
                <button
                  onClick={() => {
                    onOpenDetailModal();
                    setIsLayersOpen(false);
                  }}
                  className="flex-1 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-200 font-mono text-center"
                >
                  Panduan Mitigasi
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Analisis Radius Toggle Button */}
        <button
          id="toggle-analysis-card-btn"
          onClick={() => {
            setShowOverviewCard((prev) => !prev);
            setIsLayersOpen(false);
            setIsCameraOpen(false);
            setIsBasemapOpen(false);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-all shadow-xl ${
            showOverviewCard
              ? 'bg-white text-black font-bold border-white'
              : 'bg-black/90 backdrop-blur-xl border-zinc-800 text-zinc-200 hover:text-white hover:border-zinc-700'
          }`}
          title="Buka / Tutup Panel Analisis Radius Bahaya"
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Analisis Radius</span>
          <span
            className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
              showOverviewCard ? 'bg-black text-white' : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
            }`}
          >
            {maxBallisticKm.toFixed(1)} km
          </span>
        </button>
      </div>
    </div>
  );
};
