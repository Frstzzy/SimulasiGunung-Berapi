/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { BallisticParams, PlumeParams, EruptionPresetId, AppTab } from './types';
import { ERUPTION_PRESETS } from './data/presets';
import { volcanicAudio } from './physics/audio';
import { Header } from './components/Header';
import { RealSatelliteMap } from './components/RealSatelliteMap';
import { SundaStrait3DMapCanvas } from './components/SundaStrait3DMapCanvas';
import { SideElevationCanvas } from './components/SideElevationCanvas';
import { ControlPanel } from './components/ControlPanel';
import { MetricsDashboard } from './components/MetricsDashboard';
import { PhysicsTheoryModal } from './components/PhysicsTheoryModal';
import { BmkgAdvisoryModal } from './components/BmkgAdvisoryModal';
import { BmkgSigmetScenario } from './data/bmkgData';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('satellite');
  const [selectedPreset, setSelectedPreset] = useState<EruptionPresetId>('strombolian');
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [triggerCount, setTriggerCount] = useState<number>(1);
  const [isBmkgModalOpen, setIsBmkgModalOpen] = useState<boolean>(false);

  // Active simulation parameters initialized from first preset
  const defaultPreset = ERUPTION_PRESETS[0];
  const [ballistic, setBallistic] = useState<BallisticParams>(defaultPreset.ballistic);
  const [plume, setPlume] = useState<PlumeParams>(defaultPreset.plume);

  const handleSelectPreset = useCallback((presetId: EruptionPresetId) => {
    const found = ERUPTION_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setSelectedPreset(presetId);
      setBallistic(found.ballistic);
      setPlume(found.plume);
      setTriggerCount((c) => c + 1);
    }
  }, []);

  const handleApplyBmkgScenario = useCallback((scenario: BmkgSigmetScenario) => {
    setPlume((prev) => ({
      ...prev,
      columnHeight: scenario.columnHeightMeters,
      windSpeed: scenario.windSpeedMs,
      // Wind blows FROM (driftDirection + 180) so ash drifts TOWARDS driftDirectionDeg
      windDirection: (scenario.driftDirectionDeg + 180) % 360,
    }));
    setActiveTab('satellite');
    setTriggerCount((c) => c + 1);
  }, []);

  const handleUpdateBallistic = useCallback((partial: Partial<BallisticParams>) => {
    setBallistic((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleUpdatePlume = useCallback((partial: Partial<PlumeParams>) => {
    setPlume((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleUpdateWind = useCallback((speed: number, direction: number) => {
    setPlume((prev) => ({ ...prev, windSpeed: speed, windDirection: direction }));
  }, []);

  const handleTriggerEruption = useCallback(() => {
    setTriggerCount((c) => c + 1);
  }, []);

  const handleReset = useCallback(() => {
    const preset = ERUPTION_PRESETS.find((p) => p.id === selectedPreset) || ERUPTION_PRESETS[0];
    setBallistic(preset.ballistic);
    setPlume(preset.plume);
    setTriggerCount((c) => c + 1);
  }, [selectedPreset]);

  const handleToggleMute = useCallback(() => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    volcanicAudio.setMuted(nextState);
    if (!nextState) {
      volcanicAudio.playEruptionBlast(0.6);
    }
  }, [isMuted]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-white selection:text-black relative overflow-x-hidden">
      {/* Subtle atmospheric ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-zinc-900/30 blur-3xl pointer-events-none -z-10" />

      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onTriggerEruption={handleTriggerEruption}
        onReset={handleReset}
        selectedPreset={selectedPreset}
        onSelectPreset={handleSelectPreset}
        onOpenRoadmap={() => setActiveTab('theory')}
        onOpenBmkg={() => setIsBmkgModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Real-time physical metrics bar */}
        <MetricsDashboard ballistic={ballistic} plume={plume} />

        {/* Primary Workspace View */}
        {activeTab === 'satellite' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <RealSatelliteMap
              ballistic={ballistic}
              plume={plume}
              onUpdateWind={handleUpdateWind}
              onUpdateBallistic={handleUpdateBallistic}
              onUpdatePlume={handleUpdatePlume}
            />
            <ControlPanel
              ballistic={ballistic}
              plume={plume}
              onUpdateBallistic={handleUpdateBallistic}
              onUpdatePlume={handleUpdatePlume}
              onTriggerEruption={handleTriggerEruption}
            />
          </div>
        )}

        {activeTab === 'map3d' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <SundaStrait3DMapCanvas
              ballistic={ballistic}
              plume={plume}
              triggerCount={triggerCount}
              onUpdateWind={handleUpdateWind}
              onUpdateBallistic={handleUpdateBallistic}
            />
            <ControlPanel
              ballistic={ballistic}
              plume={plume}
              onUpdateBallistic={handleUpdateBallistic}
              onUpdatePlume={handleUpdatePlume}
              onTriggerEruption={handleTriggerEruption}
            />
          </div>
        )}

        {activeTab === 'elevation' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <SideElevationCanvas
              ballistic={ballistic}
              plume={plume}
              triggerCount={triggerCount}
            />
            <ControlPanel
              ballistic={ballistic}
              plume={plume}
              onUpdateBallistic={handleUpdateBallistic}
              onUpdatePlume={handleUpdatePlume}
              onTriggerEruption={handleTriggerEruption}
            />
          </div>
        )}

        {activeTab === 'theory' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <PhysicsTheoryModal />
          </div>
        )}
      </main>

      {/* Scientific Footer */}
      <footer className="bg-black border-t border-zinc-800/80 py-5 px-4 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white" />
            <span className="font-semibold text-zinc-200">Simulasi Fisika Komputasi Vulkanik</span>
            <span className="text-zinc-700">•</span>
            <span className="text-zinc-400">Studi Kasus G. Anak Krakatau (Selat Sunda)</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-500">
            <span>RK4 ODE + Gaussian Plume Dispersion</span>
            <span>•</span>
            <span>PVMBG / BMKG Data Ref</span>
          </div>
        </div>
      </footer>

      {/* Global BMKG Official Data & Affected Areas Modal */}
      <BmkgAdvisoryModal
        isOpen={isBmkgModalOpen}
        onClose={() => setIsBmkgModalOpen(false)}
        currentPlume={plume}
        onApplyBmkgScenario={handleApplyBmkgScenario}
        onFocusAreaOnMap={() => {
          setActiveTab('satellite');
          setIsBmkgModalOpen(false);
        }}
      />
    </div>
  );
}
