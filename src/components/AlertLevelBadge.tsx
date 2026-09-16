/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, Flame, Info, ExternalLink, Compass, X } from 'lucide-react';
import { BallisticParams, PlumeParams, EruptionPresetId } from '../types';

export type AlertLevelNumber = 'I' | 'II' | 'III' | 'IV';
export type AlertLevelName = 'Normal' | 'Waspada' | 'Siaga' | 'Awas';
export type VonaCode = 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';

export interface AlertLevelInfo {
  levelNumber: AlertLevelNumber;
  name: AlertLevelName;
  vonaCode: VonaCode;
  exclusionRadiusKm: number;
  exclusionRadiusText: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  dotColor: string;
  pingColor: string;
  accentBg: string;
  summary: string;
  threatDescription: string;
  actionGuidance: string;
}

/**
 * Dynamically computes Indonesian PVMBG (Pusat Vulkanologi dan Mitigasi Bencana Geologi)
 * volcano alert level based on physical eruption parameters and column height.
 */
export function getAlertLevelInfo(
  ballistic: BallisticParams,
  plume: PlumeParams,
  presetId?: EruptionPresetId
): AlertLevelInfo {
  const colHeight = plume.columnHeight;
  const v0 = ballistic.initialVelocity;

  // Explicit preset mapping if provided
  if (presetId === 'paroxysmal2018') {
    return {
      levelNumber: 'IV',
      name: 'Awas',
      vonaCode: 'RED',
      exclusionRadiusKm: 7,
      exclusionRadiusText: '7 - 10 km',
      badgeBg: 'bg-red-950/80',
      badgeBorder: 'border-red-500/60',
      badgeText: 'text-red-300',
      dotColor: 'bg-red-500',
      pingColor: 'bg-red-400',
      accentBg: 'from-red-500/20 to-orange-500/10',
      summary: 'Erupsi Paroksismal / Krisis Ekstrem',
      threatDescription: 'Kolaps kaldera / letusan sub-plinian dengan ancaman tsunami Selat Sunda dan lontaran bom berdaya hancur tinggi.',
      actionGuidance: 'Evakuasi segera seluruh pulau dalam kaldera dan radius 7-10 km. Siaga peringatan dini tsunami pesisir Banten & Lampung.',
    };
  }

  // Dynamic evaluation by physics metrics
  if (colHeight >= 6000 || v0 >= 260) {
    return {
      levelNumber: 'IV',
      name: 'Awas',
      vonaCode: 'RED',
      exclusionRadiusKm: 7,
      exclusionRadiusText: '7 - 10 km',
      badgeBg: 'bg-red-950/80',
      badgeBorder: 'border-red-500/60',
      badgeText: 'text-red-300',
      dotColor: 'bg-red-500',
      pingColor: 'bg-red-400',
      accentBg: 'from-red-500/20 to-orange-500/10',
      summary: 'Erupsi Paroksismal / Krisis Ekstrem',
      threatDescription: 'Kolom abu menjulang tinggi menembus lapisan troposfer atas, lontaran material pijar masif melintasi perairan kaldera.',
      actionGuidance: 'Masyarakat dan wisatawan dilarang beraktivitas dalam radius 7-10 km dari kawah aktif. Siaga jalur penyeberangan feri dan penerbangan.',
    };
  }

  if (colHeight >= 2500 || v0 >= 160 || presetId === 'vulcanian' || presetId === 'strombolian') {
    return {
      levelNumber: 'III',
      name: 'Siaga',
      vonaCode: 'ORANGE',
      exclusionRadiusKm: 5,
      exclusionRadiusText: '5 km',
      badgeBg: 'bg-orange-950/80',
      badgeBorder: 'border-orange-500/60',
      badgeText: 'text-orange-300',
      dotColor: 'bg-orange-500',
      pingColor: 'bg-orange-400',
      accentBg: 'from-orange-500/20 to-amber-500/10',
      summary: 'Erupsi Eksplosif Aktif (Siaga)',
      threatDescription: 'Letusan abu tebal kontinyu, lontaran bom vulkanik dan batu pijar mencapai lereng serta perairan sekeliling pulau.',
      actionGuidance: 'Masyarakat/wisatawan dilarang mendekati Gunung Anak Krakatau atau beraktivitas dalam radius 5 km dari kawah aktif (Rekomendasi Resmi PVMBG).',
    };
  }

  if (colHeight >= 1000 || v0 >= 90) {
    return {
      levelNumber: 'II',
      name: 'Waspada',
      vonaCode: 'YELLOW',
      exclusionRadiusKm: 3,
      exclusionRadiusText: '2 - 3 km',
      badgeBg: 'bg-yellow-950/80',
      badgeBorder: 'border-yellow-500/60',
      badgeText: 'text-yellow-300',
      dotColor: 'bg-yellow-400',
      pingColor: 'bg-yellow-300',
      accentBg: 'from-yellow-500/20 to-zinc-900',
      summary: 'Peningkatan Aktivitas Vulkanik (Waspada)',
      threatDescription: 'Peningkatan gempa vulkanik dan letusan abu sporadis. Lontaran material pijar terbatas di sekitar kawah.',
      actionGuidance: 'Dilarang mendekati kawah aktif dalam radius 2 - 3 km.',
    };
  }

  return {
    levelNumber: 'I',
    name: 'Normal',
    vonaCode: 'GREEN',
    exclusionRadiusKm: 1.5,
    exclusionRadiusText: '1 - 2 km',
    badgeBg: 'bg-emerald-950/80',
    badgeBorder: 'border-emerald-500/60',
    badgeText: 'text-emerald-300',
    dotColor: 'bg-emerald-500',
    pingColor: 'bg-emerald-400',
    accentBg: 'from-emerald-500/20 to-zinc-900',
    summary: 'Aktivitas Dasar Tenang (Normal)',
    threatDescription: 'Tidak teramati erupsi signifikan, hembusan asap solfatara/fumarol bertekanan lemah.',
    actionGuidance: 'Aman di luar radius 1-2 km dari kawah aktif.',
  };
}

interface AlertLevelBadgeProps {
  ballistic: BallisticParams;
  plume: PlumeParams;
  selectedPreset?: EruptionPresetId;
  onFocusSafetyZone?: (radiusKm: number) => void;
  onOpenBmkgModal?: () => void;
  className?: string;
}

export const AlertLevelBadge: React.FC<AlertLevelBadgeProps> = ({
  ballistic,
  plume,
  selectedPreset,
  onFocusSafetyZone,
  onOpenBmkgModal,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const info = useMemo(() => {
    return getAlertLevelInfo(ballistic, plume, selectedPreset);
  }, [ballistic, plume, selectedPreset]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} ref={popoverRef}>
      {/* Primary Pill Button */}
      <button
        type="button"
        id="pvmbg-alert-level-badge-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={`Status Erupsi PVMBG: Level ${info.levelNumber} (${info.name})`}
        className={`pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur-xl shadow-xl transition-all select-none hover:scale-[1.02] active:scale-[0.98] ${info.badgeBg} ${info.badgeBorder} ${info.badgeText}`}
        title="Klik untuk membuka Ringkasan Situasi & Rekomendasi Radius Steril PVMBG"
      >
        {/* Pulsing Live Status Dot */}
        <div className="relative flex items-center justify-center w-2.5 h-2.5">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${info.pingColor}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${info.dotColor}`} />
        </div>

        {/* Level Tag & Indonesian Term */}
        <div className="flex items-center gap-1.5 text-xs font-mono font-bold tracking-wide">
          <span className="text-white font-extrabold">LEVEL {info.levelNumber}</span>
          <span className="opacity-60">•</span>
          <span className="uppercase">{info.name}</span>
        </div>

        {/* Danger Radius Quick Pill */}
        <div className="hidden sm:flex items-center gap-1 bg-black/60 px-1.5 py-0.5 rounded-md border border-white/10 text-[10px] font-mono text-zinc-300">
          <span className="text-zinc-500">Radius:</span>
          <strong className="text-white font-bold">{info.exclusionRadiusText}</strong>
        </div>

        {/* Aviation VONA Tag */}
        <div
          className={`hidden md:inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-extrabold uppercase border ${
            info.vonaCode === 'RED'
              ? 'bg-red-600 text-white border-red-400'
              : info.vonaCode === 'ORANGE'
              ? 'bg-orange-500 text-black border-orange-300'
              : info.vonaCode === 'YELLOW'
              ? 'bg-yellow-400 text-black border-yellow-200'
              : 'bg-emerald-500 text-black border-emerald-300'
          }`}
        >
          VONA {info.vonaCode}
        </div>

        {/* Dropdown Chevron Indicator */}
        <span className="text-[10px] opacity-70 ml-0.5">{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Situational Awareness Detail Popover */}
      {isOpen && (
        <div
          className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-zinc-950/95 backdrop-blur-2xl border border-zinc-800 rounded-2xl shadow-2xl z-50 p-4 text-xs font-sans text-zinc-200 animate-in fade-in zoom-in-95 duration-150 pointer-events-auto"
          role="dialog"
          aria-labelledby="alert-badge-title"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-zinc-850 pb-3 mb-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${info.badgeBg} ${info.badgeBorder} ${info.badgeText}`}>
                  PVMBG LEVEL {info.levelNumber}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                    info.vonaCode === 'RED'
                      ? 'bg-red-600 text-white'
                      : info.vonaCode === 'ORANGE'
                      ? 'bg-orange-500 text-black'
                      : info.vonaCode === 'YELLOW'
                      ? 'bg-yellow-400 text-black'
                      : 'bg-emerald-500 text-black'
                  }`}
                >
                  VONA: {info.vonaCode}
                </span>
              </div>
              <h4 id="alert-badge-title" className="font-bold text-sm text-white pt-1">
                Status {info.name} ({info.summary})
              </h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Tutup Ringkasan"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Key Simulation Physical Telemetry */}
          <div className="grid grid-cols-2 gap-2 bg-zinc-900/90 p-2.5 rounded-xl border border-zinc-800/80 mb-3 font-mono text-[11px]">
            <div>
              <span className="text-zinc-500 block text-[10px]">Tinggi Kolom Abu</span>
              <strong className="text-white font-bold">
                {(plume.columnHeight / 1000).toFixed(1)} km <span className="text-zinc-400 text-[9px]">({plume.columnHeight}m)</span>
              </strong>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px]">Kecepatan Awal Lontaran</span>
              <strong className="text-amber-400 font-bold">
                {ballistic.initialVelocity} m/s <span className="text-zinc-400 text-[9px]">({(ballistic.initialVelocity * 3.6).toFixed(0)} km/j)</span>
              </strong>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px]">Radius Steril PVMBG</span>
              <strong className="text-red-400 font-bold">{info.exclusionRadiusText}</strong>
            </div>
            <div>
              <span className="text-zinc-500 block text-[10px]">Laju Emisi</span>
              <strong className="text-sky-300 font-bold">Skala {plume.emissionRate}/10</strong>
            </div>
          </div>

          {/* Description of Threats */}
          <div className="space-y-2 mb-3 text-[11px] leading-relaxed">
            <div className="flex items-start gap-2 bg-zinc-900/50 p-2 rounded-lg border border-zinc-850">
              <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
              <p className="text-zinc-300">{info.threatDescription}</p>
            </div>

            <div className="flex items-start gap-2 bg-zinc-900/50 p-2 rounded-lg border border-zinc-850">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-zinc-300">
                <strong className="text-white">Rekomendasi Keselamatan: </strong>
                {info.actionGuidance}
              </p>
            </div>
          </div>

          {/* Quick Actions Footer */}
          <div className="flex items-center gap-2 pt-2 border-t border-zinc-850">
            {onFocusSafetyZone && (
              <button
                type="button"
                onClick={() => {
                  onFocusSafetyZone(info.exclusionRadiusKm);
                  setIsOpen(false);
                }}
                className="flex-1 py-1.5 px-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-[11px] transition-colors flex items-center justify-center gap-1.5 border border-zinc-700"
              >
                <Compass className="w-3.5 h-3.5 text-orange-400" />
                <span>Lihat Radius {info.exclusionRadiusText}</span>
              </button>
            )}

            {onOpenBmkgModal && (
              <button
                type="button"
                onClick={() => {
                  onOpenBmkgModal();
                  setIsOpen(false);
                }}
                className="py-1.5 px-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-[11px] transition-colors flex items-center justify-center gap-1 border border-amber-500/40"
              >
                <span>Buletin BMKG</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
