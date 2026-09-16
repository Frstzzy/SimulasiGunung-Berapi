/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * SideElevationCanvas - Visualisasi Penampang Elevasi 2D & Atmosfer
 * Memadukan komputasi fisika gerak peluru numerik Runge-Kutta 4 (RK4),
 * dinamika kolom abu vulkanik, profil topografi pulau-pulau Selat Sunda,
 * koridor ketinggian penerbangan (Flight Levels), telemetri cuaca,
 * serta modul dampak wilayah dan skenario resmi BMKG (identik dengan peta satelit).
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Crosshair,
  Wind,
  Layers,
  Plane,
  Radio,
  Sliders,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Flame,
  FileText,
  X,
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  Info,
  Maximize2,
  Compass,
  Clock,
  Eye,
  Mountain
} from 'lucide-react';
import { BallisticParams, PlumeParams, ProjectileState, KrakatauWeather } from '../types';
import {
  computeTrajectory,
  computeIdealParabola,
  stepRK4,
  getRockProperties,
  computeTrajectory3D,
  computeBallisticShower,
  ShowerBomb
} from '../physics/ballistics';
import { volcanicAudio } from '../physics/audio';
import {
  REGIONAL_INFRASTRUCTURES,
  FlightLevelKey,
  FLIGHT_LEVEL_MAP,
  RegionalInfrastructure
} from '../data/regionalInfrastructureData';
import { RegionalImpactChecker } from './RegionalImpactChecker';
import { WeatherWidget } from './WeatherWidget';
import {
  BMKG_AFFECTED_AREAS,
  BMKG_SIGMET_SCENARIOS,
  BmkgSigmetScenario
} from '../data/bmkgData';
import {
  COASTAL_HAZARD_NODES,
  evaluateNodePlumeImpact
} from '../data/hazardHeatmapData';
import {
  calculateVolcanicAerosols,
  evaluateRegionalAerosolStations
} from '../physics/aerosol';
import { AshDispersalDetailModal } from './AshDispersalDetailModal';
import { VolcanicEjectaDetailModal } from './VolcanicEjectaDetailModal';
import { BmkgAdvisoryModal } from './BmkgAdvisoryModal';

export interface SideElevationCanvasProps {
  ballistic: BallisticParams;
  plume: PlumeParams;
  triggerCount: number;
  onUpdateWind?: (speed: number, direction: number) => void;
  onUpdateBallistic?: (params: Partial<BallisticParams>) => void;
  onUpdatePlume?: (params: Partial<PlumeParams>) => void;
  weather?: KrakatauWeather | null;
  isLoadingWeather?: boolean;
  onRefreshWeather?: () => void;
  isAutoSyncWeather?: boolean;
  onToggleAutoSyncWeather?: () => void;
  onOpenWeatherModal?: () => void;
  onOpenAerosolModal?: () => void;
  onOpenEjectaDetail?: () => void;
  onOpenAshDetail?: () => void;
  onOpenBmkg?: () => void;
}

interface SmokePuff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  color: string;
}

interface SplashParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

// Landmark transect points along Sunda Strait (Distance from G. Anak Krakatau)
interface TransectLandmark {
  id: string;
  name: string;
  distMeters: number;
  peakElevation: number; // m
  widthMeters: number;
  desc: string;
  type: 'crater' | 'caldera' | 'island' | 'coast';
}

const TRANSECT_LANDMARKS: TransectLandmark[] = [
  {
    id: 'krakatau',
    name: 'G. Anak Krakatau',
    distMeters: 0,
    peakElevation: 157,
    widthMeters: 1800,
    desc: 'Kerucut vulkanik aktif pasca-kolaps 2018 di dalam kaldera.',
    type: 'crater',
  },
  {
    id: 'panjang',
    name: 'P. Panjang',
    distMeters: 3200,
    peakElevation: 132,
    widthMeters: 1200,
    desc: 'Tebing kaldera timur laut pembatas kaldera purba.',
    type: 'caldera',
  },
  {
    id: 'rakata',
    name: 'P. Rakata',
    distMeters: 5600,
    peakElevation: 813,
    widthMeters: 3000,
    desc: 'Sisa kerucut purba 1883 dengan dinding tebing vertikal 800m.',
    type: 'caldera',
  },
  {
    id: 'sebesi',
    name: 'P. Sebesi',
    distMeters: 18500,
    peakElevation: 844,
    widthMeters: 4500,
    desc: 'Pulau berpenghuni terdekat (±2.800 jiwa), titik evakuasi utama.',
    type: 'island',
  },
  {
    id: 'coastal_banten',
    name: 'Pesisir Banten (Anyer)',
    distMeters: 45000,
    peakElevation: 120,
    widthMeters: 8000,
    desc: 'Garis pantai padat penduduk Banten & kawasan industri Selat Sunda.',
    type: 'coast',
  },
];

type DrawerType = 'impact' | 'aerosol' | 'layers' | 'weather' | 'analysis' | 'bmkg' | null;
type ViewFocusMode = 'crater' | 'caldera' | 'sunda' | 'atmosphere';

export const SideElevationCanvas: React.FC<SideElevationCanvasProps> = ({
  ballistic,
  plume,
  triggerCount,
  onUpdateWind,
  onUpdateBallistic,
  onUpdatePlume,
  weather,
  isLoadingWeather,
  onRefreshWeather,
  isAutoSyncWeather,
  onToggleAutoSyncWeather,
  onOpenWeatherModal,
  onOpenAerosolModal,
  onOpenEjectaDetail,
  onOpenAshDetail,
  onOpenBmkg,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Viewport transformation: scale (meters to pixels), offset
  const [scale, setScale] = useState<number>(0.12); // pixels per meter
  const [originX, setOriginX] = useState<number>(180);
  const [originY, setOriginY] = useState<number>(450);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [probePos, setProbePos] = useState<{ x: number; y: number } | null>(null);

  // View focus preset
  const [viewFocus, setViewFocus] = useState<ViewFocusMode>('crater');

  // Flight Level & Drawer
  const [selectedFlightLevel, setSelectedFlightLevel] = useState<FlightLevelKey>('ALL');
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>(null);
  const [showHazardHeatmap, setShowHazardHeatmap] = useState<boolean>(false);
  const [showSo2Layer, setShowSo2Layer] = useState<boolean>(false);
  const [activeBmkgScenarioId, setActiveBmkgScenarioId] = useState<string | null>(null);

  // Layer Toggles
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [showIdealParabola, setShowIdealParabola] = useState<boolean>(true);
  const [showSmokePlume, setShowSmokePlume] = useState<boolean>(true);
  const [showLandmarks, setShowLandmarks] = useState<boolean>(true);
  const [showFlightLevelBands, setShowFlightLevelBands] = useState<boolean>(true);
  const [showKrbBoundary, setShowKrbBoundary] = useState<boolean>(true);

  // Animation Dock Dual Tabs (Ballistics & Smoke)
  const [activeAnimTab, setActiveAnimTab] = useState<'ballistic' | 'smoke'>('ballistic');

  // Ballistic scrubber & animation
  const [ballisticTime, setBallisticTime] = useState<number>(0);
  const [isBallisticPlaying, setIsBallisticPlaying] = useState<boolean>(true);
  const [ballisticSpeed, setBallisticSpeed] = useState<number>(1.0);

  // Smoke plume time scrubber & animation
  const [simTimeMinutes, setSimTimeMinutes] = useState<number>(30);
  const [isSmokePlaying, setIsSmokePlaying] = useState<boolean>(false);
  const [smokeSpeed, setSmokeSpeed] = useState<number>(1.0);

  // Internal Modals
  const [isInternalEjectaModalOpen, setIsInternalEjectaModalOpen] = useState<boolean>(false);
  const [isInternalAshModalOpen, setIsInternalAshModalOpen] = useState<boolean>(false);
  const [isInternalBmkgModalOpen, setIsInternalBmkgModalOpen] = useState<boolean>(false);

  // Physics simulation entities for live particle animation
  const projectilesRef = useRef<ProjectileState[]>([]);
  const smokePuffsRef = useRef<SmokePuff[]>([]);
  const splashesRef = useRef<SplashParticle[]>([]);
  const lastTimeRef = useRef<number>(performance.now());
  const nextPuffTimeRef = useRef<number>(0);

  // Multi-projectile ballistic shower computation
  const ballisticShower = useMemo(() => {
    return computeBallisticShower(
      ballistic,
      ballistic.launchAzimuth ?? 90,
      plume.windSpeed,
      plume.windDirection,
      ballistic.projectileCount ?? 6,
      ballistic.dispersionMode ?? 'focused'
    );
  }, [ballistic, plume.windSpeed, plume.windDirection]);

  // Primary trajectory calculation
  const primaryTrajectory = useMemo(() => {
    return computeTrajectory(ballistic, ballistic.enableAirDrag);
  }, [ballistic]);

  const idealParabola = useMemo(() => {
    return computeIdealParabola(ballistic);
  }, [ballistic]);

  const totalFlightTime = Math.max(1, primaryTrajectory.flightTime);

  // Aerosol calculations
  const aerosolMetrics = useMemo(() => {
    return calculateVolcanicAerosols({
      so2EmissionRateTonsPerDay: Math.max(100, plume.emissionRate * 120),
      relativeHumidityPct: weather?.humidity || 80,
      uvRadiationIndex: 8,
      plumeHeightM: plume.columnHeight,
      windSpeedMs: plume.windSpeed,
      windDirectionDeg: plume.windDirection,
      elapsedHours: Math.max(0.1, simTimeMinutes / 60),
    });
  }, [plume.emissionRate, plume.columnHeight, plume.windSpeed, plume.windDirection, weather?.humidity, simTimeMinutes]);

  // Handle Resize Observer
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      canvasRef.current.width = rect.width;
      canvasRef.current.height = rect.height;
      setOriginY(rect.height - 90);
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Quick Camera Focus Presets
  const applyViewFocus = useCallback((mode: ViewFocusMode) => {
    setViewFocus(mode);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const height = canvas.height;

    if (mode === 'crater') {
      // Zoom in on crater vent (0 to 1.5 km)
      setScale(0.24);
      setOriginX(180);
      setOriginY(height - 90);
    } else if (mode === 'caldera') {
      // View Anak Krakatau + Rakata cliff (0 to 7 km)
      setScale(0.11);
      setOriginX(140);
      setOriginY(height - 90);
    } else if (mode === 'sunda') {
      // Full transect across Sunda Strait (0 to 25 km)
      setScale(0.04);
      setOriginX(80);
      setOriginY(height - 90);
    } else if (mode === 'atmosphere') {
      // Full vertical atmosphere column (0 to 16 km altitude)
      setScale(0.045);
      setOriginX(120);
      setOriginY(height - 70);
    }
  }, []);

  // Reset view to default
  const resetView = useCallback(() => {
    applyViewFocus('crater');
  }, [applyViewFocus]);

  // Launch a new batch of volcanic bombs on trigger
  const launchEruption = useCallback(() => {
    volcanicAudio.playEruptionBlast(1.0);
    setBallisticTime(0);
    setIsBallisticPlaying(true);

    const count = ballistic.projectileCount || 7;
    const newProjectiles: ProjectileState[] = [];
    const colors = ['#f97316', '#ef4444', '#f59e0b', '#fbbf24', '#e11d48', '#ffffff'];

    for (let i = 0; i < count; i++) {
      const speedVar = i === 0 ? 1 : 0.85 + Math.random() * 0.3;
      const angleVar = i === 0 ? 0 : (Math.random() - 0.5) * 16;
      const diameterVar = i === 0 ? ballistic.rockDiameter : ballistic.rockDiameter * (0.4 + Math.random() * 0.9);

      const rad = ((ballistic.launchAngle + angleVar) * Math.PI) / 180;
      const v0 = ballistic.initialVelocity * speedVar;
      const vx = v0 * Math.cos(rad);
      const vy = v0 * Math.sin(rad);

      const { mass, radius } = getRockProperties(diameterVar, ballistic.rockDensity);

      newProjectiles.push({
        id: Date.now() + i,
        x: (Math.random() - 0.5) * 20,
        y: ballistic.ventElevation,
        vx,
        vy,
        radius,
        mass,
        time: 0,
        trail: [{ x: 0, y: ballistic.ventElevation }],
        landed: false,
        color: colors[i % colors.length],
      });
    }

    projectilesRef.current = newProjectiles;

    // Burst of smoke puffs at vent
    for (let s = 0; s < 40; s++) {
      const angle = Math.PI * 0.3 + Math.random() * (Math.PI * 0.4);
      const speed = 20 + Math.random() * 70;
      smokePuffsRef.current.push({
        x: (Math.random() - 0.5) * 30,
        y: ballistic.ventElevation + Math.random() * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 15 + Math.random() * 30,
        maxRadius: 60 + Math.random() * 80,
        opacity: 0.85,
        color: Math.random() > 0.3 ? '#334155' : '#1e293b',
      });
    }
  }, [ballistic]);

  // Trigger when parent signals
  useEffect(() => {
    if (triggerCount > 0) {
      launchEruption();
    }
  }, [triggerCount, launchEruption]);

  // Apply BMKG scenario
  const handleApplyBmkgScenario = (scenario: BmkgSigmetScenario) => {
    setActiveBmkgScenarioId(scenario.id);
    const windFromDirection = (scenario.driftDirectionDeg + 180) % 360;
    if (onUpdateWind) {
      onUpdateWind(scenario.windSpeedMs, windFromDirection);
    }
    if (onUpdatePlume) {
      onUpdatePlume({
        columnHeight: scenario.columnHeightMeters,
        windSpeed: scenario.windSpeedMs,
        windDirection: windFromDirection,
      });
    }
  };

  // Ballistic playback ticker
  useEffect(() => {
    if (!isBallisticPlaying) return;
    let animId: number;
    let lastTs = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTs) / 1000;
      lastTs = now;

      setBallisticTime((prev) => {
        const next = prev + dt * ballisticSpeed;
        if (next >= totalFlightTime) {
          return totalFlightTime;
        }
        return next;
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isBallisticPlaying, ballisticSpeed, totalFlightTime]);

  // Smoke plume playback ticker (simulated minutes)
  useEffect(() => {
    if (!isSmokePlaying) return;
    let animId: number;
    let lastTs = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTs) / 1000;
      lastTs = now;

      setSimTimeMinutes((prev) => {
        const next = prev + dt * smokeSpeed * 2.5; // ~2.5 simulated minutes per sec
        if (next >= 240) return 240;
        return next;
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isSmokePlaying, smokeSpeed]);

  // Main 2D Canvas Animation & Drawing Loop
  useEffect(() => {
    let animId: number;

    const render = (time: number) => {
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = time;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // Coordinate converter helpers
      const toScreenX = (mX: number) => originX + mX * scale;
      const toScreenY = (mY: number) => originY - mY * scale;
      const fromScreenX = (sX: number) => (sX - originX) / scale;
      const fromScreenY = (sY: number) => (originY - sY) / scale;

      // Physics update: Continuous rising plume from crater
      if (showSmokePlume && time > nextPuffTimeRef.current) {
        nextPuffTimeRef.current = time + 130 / (plume.emissionRate || 1);
        const driftAngle = (plume.windDirection * Math.PI) / 180;
        const windDriftX = Math.sin(driftAngle) * plume.windSpeed * 0.6;

        smokePuffsRef.current.push({
          x: (Math.random() - 0.5) * 40,
          y: ballistic.ventElevation + 10,
          vx: windDriftX * 0.2 + (Math.random() - 0.5) * 10,
          vy: 40 + (plume.columnHeight / 100) * (0.8 + Math.random() * 0.4),
          radius: 20 + Math.random() * 15,
          maxRadius: 100 + plume.columnHeight / 35,
          opacity: 0.65,
          color: Math.random() > 0.4 ? '#475569' : '#1e293b',
        });
      }

      // Update smoke puffs
      for (let i = smokePuffsRef.current.length - 1; i >= 0; i--) {
        const puff = smokePuffsRef.current[i];
        puff.vy *= 0.985;
        if (puff.y > ballistic.ventElevation + plume.columnHeight * 0.75) {
          // Umbrella expansion & horizontal wind drift
          puff.vx += (plume.windSpeed * 0.85 - puff.vx) * 0.05;
          puff.vy *= 0.94;
        } else {
          puff.vx += (plume.windSpeed * 0.4 - puff.vx) * 0.02;
        }

        puff.x += puff.vx * dt;
        puff.y += puff.vy * dt;
        puff.radius = Math.min(puff.maxRadius, puff.radius + 15 * dt);
        puff.opacity -= 0.04 * dt;

        if (puff.opacity <= 0.01 || puff.x > 50000 || puff.y > 20000) {
          smokePuffsRef.current.splice(i, 1);
        }
      }

      // Update projectiles
      const simSubSteps = 4;
      const subDt = dt / simSubSteps;

      for (const proj of projectilesRef.current) {
        if (proj.landed) continue;

        for (let step = 0; step < simSubSteps; step++) {
          const area = Math.PI * proj.radius * proj.radius;
          const next = stepRK4(
            proj.x,
            proj.y,
            proj.vx,
            proj.vy,
            subDt,
            proj.mass,
            area,
            ballistic.dragCoefficient,
            ballistic.gravity,
            ballistic.enableAirDrag
          );

          proj.x = next.x;
          proj.y = next.y;
          proj.vx = next.vx;
          proj.vy = next.vy;
          proj.time += subDt;

          // Check landing at sea level y = 0
          if (proj.y <= 0) {
            proj.y = 0;
            proj.landed = true;
            proj.landingX = proj.x;
            proj.landingTime = proj.time;
            proj.impactVelocity = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);
            proj.impactEnergy = 0.5 * proj.mass * proj.impactVelocity * proj.impactVelocity;

            volcanicAudio.playImpactSplash();

            // Spawn water splash particles
            for (let sp = 0; sp < 25; sp++) {
              const spAngle = Math.PI * 0.2 + Math.random() * Math.PI * 0.6;
              const spSpeed = 15 + Math.random() * 45;
              splashesRef.current.push({
                x: proj.x,
                y: 0,
                vx: Math.cos(spAngle) * spSpeed * (Math.random() > 0.5 ? 1 : -1),
                vy: Math.sin(spAngle) * spSpeed,
                life: 0,
                maxLife: 1.0 + Math.random() * 0.5,
                size: 2 + Math.random() * 4,
              });
            }
            break;
          }
        }

        // Trail sampling
        const lastPoint = proj.trail[proj.trail.length - 1];
        if (!lastPoint || Math.hypot(proj.x - lastPoint.x, proj.y - lastPoint.y) > 15) {
          proj.trail.push({ x: proj.x, y: proj.y });
          if (proj.trail.length > 250) proj.trail.shift();
        }
      }

      // Update splash particles
      for (let sp = splashesRef.current.length - 1; sp >= 0; sp--) {
        const s = splashesRef.current[sp];
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy -= ballistic.gravity * 3.5 * dt;
        s.life += dt;
        if (s.life >= s.maxLife || (s.y < 0 && s.life > 0.1)) {
          splashesRef.current.splice(sp, 1);
        }
      }

      // ----------------------------------------------------
      // DRAWING PHASE
      // ----------------------------------------------------

      // 1. Sky & Atmospheric Background Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, originY);
      skyGrad.addColorStop(0, '#060911'); // Upper stratosphere
      skyGrad.addColorStop(0.35, '#0b1329'); // Mid-troposphere
      skyGrad.addColorStop(0.7, '#152238'); // Lower boundary layer
      skyGrad.addColorStop(1, '#1e293b'); // Sea level horizon
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Flight Level Altitude Bands
      if (showFlightLevelBands) {
        const flList: { key: FlightLevelKey; minM: number; maxM: number; color: string; label: string }[] = [
          { key: 'SFC-FL100', minM: 0, maxM: 3048, color: 'rgba(56, 189, 248, 0.07)', label: 'SFC - FL100 (0 - 3.000m)' },
          { key: 'FL100-FL250', minM: 3048, maxM: 7620, color: 'rgba(251, 191, 36, 0.08)', label: 'FL100 - FL250 (3.000 - 7.600m)' },
          { key: 'FL250-FL450', minM: 7620, maxM: 13716, color: 'rgba(239, 68, 68, 0.08)', label: 'FL250 - FL450 (7.600 - 13.700m)' },
        ];

        flList.forEach((fl) => {
          const isSelected = selectedFlightLevel === 'ALL' || selectedFlightLevel === fl.key;
          const yTop = toScreenY(fl.maxM);
          const yBottom = toScreenY(fl.minM);
          const bandHeight = yBottom - yTop;

          if (yBottom > 0 && yTop < height) {
            ctx.fillStyle = isSelected ? fl.color : 'rgba(255, 255, 255, 0.02)';
            ctx.fillRect(0, yTop, width, bandHeight);

            // Top boundary line of flight band
            ctx.strokeStyle = isSelected ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.06)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(0, yTop);
            ctx.lineTo(width, yTop);
            ctx.stroke();
            ctx.setLineDash([]);

            // Label
            ctx.fillStyle = isSelected ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.3)';
            ctx.font = '10px JetBrains Mono, monospace';
            ctx.fillText(`✈ ${fl.label}`, 24, yTop + 14);
          }
        });
      }

      // 3. Grid Lines & Altitude Metric Axis
      ctx.lineWidth = 1;
      const meterStepY = scale > 0.15 ? 100 : scale > 0.06 ? 500 : 1000;
      const startMeterY = Math.max(0, Math.floor(fromScreenY(height) / meterStepY) * meterStepY);
      const endMeterY = Math.ceil(fromScreenY(0) / meterStepY) * meterStepY;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.fillStyle = '#64748b';
      ctx.font = '9px JetBrains Mono, monospace';

      for (let m = startMeterY; m <= endMeterY; m += meterStepY) {
        const sy = toScreenY(m);
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
        ctx.stroke();

        if (sy > 15 && sy < height - 15) {
          ctx.fillText(`${m}m`, 8, sy - 3);
        }
      }

      // Distance Metric Axis along Horizontal
      const meterStepX = scale > 0.15 ? 200 : scale > 0.06 ? 1000 : 2500;
      const startMeterX = Math.floor(fromScreenX(0) / meterStepX) * meterStepX;
      const endMeterX = Math.ceil(fromScreenX(width) / meterStepX) * meterStepX;

      for (let mx = startMeterX; mx <= endMeterX; mx += meterStepX) {
        const sx = toScreenX(mx);
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, height);
        ctx.stroke();

        if (sx > 40 && sx < width - 40) {
          const km = (mx / 1000).toFixed(1);
          ctx.fillText(`${km}km`, sx + 4, originY + 16);
        }
      }

      // 4. Official 5 km KRB III Exclusion Zone Vertical Boundary
      if (showKrbBoundary) {
        const krb5kmX = toScreenX(5000);
        if (krb5kmX > 0 && krb5kmX < width) {
          // Warning vertical stripe
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(krb5kmX, 0);
          ctx.lineTo(krb5kmX, originY);
          ctx.stroke();
          ctx.setLineDash([]);

          // Badge
          ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
          ctx.fillRect(krb5kmX - 45, 50, 90, 20);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('RADIUS KRB III 5KM', krb5kmX, 63);
          ctx.textAlign = 'left';
        }
      }

      // 5. Transect Island Topography (Anak Krakatau, Rakata, Sebesi, Banten)
      if (showLandmarks) {
        TRANSECT_LANDMARKS.forEach((lm) => {
          const cx = toScreenX(lm.distMeters);
          const w = lm.widthMeters * scale;
          const peakH = lm.peakElevation * scale;
          const leftX = cx - w / 2;
          const rightX = cx + w / 2;

          ctx.beginPath();
          ctx.moveTo(leftX, originY);

          if (lm.id === 'krakatau') {
            // Volcanic cone with crater vent
            const craterHalfW = 120 * scale;
            const shoulderY = originY - peakH;
            const ventFloorY = originY - (lm.peakElevation - 40) * scale;

            ctx.lineTo(cx - craterHalfW * 2, shoulderY);
            ctx.lineTo(cx - craterHalfW, shoulderY + 8);
            ctx.lineTo(cx, ventFloorY);
            ctx.lineTo(cx + craterHalfW, shoulderY + 8);
            ctx.lineTo(cx + craterHalfW * 2, shoulderY);
          } else if (lm.id === 'rakata') {
            // Towering cliff wall facing northwest caldera
            ctx.lineTo(cx - w * 0.1, originY - peakH);
            ctx.lineTo(cx + w * 0.1, originY - peakH * 0.95);
          } else {
            // General volcanic / island mountain slope
            ctx.lineTo(cx, originY - peakH);
          }

          ctx.lineTo(rightX, originY);
          ctx.closePath();

          // Mountain gradient
          const mtGrad = ctx.createLinearGradient(0, originY - peakH, 0, originY);
          if (lm.id === 'krakatau') {
            mtGrad.addColorStop(0, '#1c1917');
            mtGrad.addColorStop(0.5, '#292524');
            mtGrad.addColorStop(1, '#0c0a09');
          } else {
            mtGrad.addColorStop(0, '#1e293b');
            mtGrad.addColorStop(0.6, '#0f172a');
            mtGrad.addColorStop(1, '#090d16');
          }

          ctx.fillStyle = mtGrad;
          ctx.fill();

          ctx.strokeStyle = lm.id === 'krakatau' ? '#f97316' : '#475569';
          ctx.lineWidth = lm.id === 'krakatau' ? 1.5 : 1;
          ctx.stroke();

          // Landmark Label
          if (cx > -100 && cx < width + 100) {
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText(`${lm.name}`, cx - 25, originY - peakH - 10);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '9px JetBrains Mono, monospace';
            ctx.fillText(`${lm.peakElevation} mdpl`, cx - 25, originY - peakH - 1);
          }
        });
      }

      // 6. Sea Level Ocean & Waves
      const oceanGrad = ctx.createLinearGradient(0, originY, 0, height);
      oceanGrad.addColorStop(0, '#0369a1');
      oceanGrad.addColorStop(0.3, '#0c4a6e');
      oceanGrad.addColorStop(1, '#021e33');
      ctx.fillStyle = oceanGrad;
      ctx.fillRect(0, originY, width, height - originY);

      // Sea surface shimmering line
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, originY);
      ctx.lineTo(width, originY);
      ctx.stroke();

      // Sea depth marker
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillText('Muka Laut (y = 0 mdpl)', 12, originY + 14);

      // 7. Render Smoke Plume & Umbrella Clouds
      if (showSmokePlume) {
        for (const puff of smokePuffsRef.current) {
          const sx = toScreenX(puff.x);
          const sy = toScreenY(puff.y);
          const sRadius = puff.radius * scale;

          if (sx + sRadius > 0 && sx - sRadius < width && sy + sRadius > 0 && sy - sRadius < height) {
            ctx.beginPath();
            ctx.arc(sx, sy, Math.max(3, sRadius), 0, Math.PI * 2);
            ctx.fillStyle = puff.color;
            ctx.globalAlpha = puff.opacity * 0.7;
            ctx.fill();
          }
        }
        ctx.globalAlpha = 1.0;

        // Plume Column Height Envelope & Umbrella Spread Indicator
        const ventSX = toScreenX(0);
        const colTopSY = toScreenY(ballistic.ventElevation + plume.columnHeight);
        const umbrellaRadiusM = Math.min(12000, 2000 + (plume.columnHeight / 1000) * 800);
        const umbrellaLeftSX = toScreenX(-umbrellaRadiusM * 0.4);
        const umbrellaRightSX = toScreenX(umbrellaRadiusM * 1.5);

        // Umbrella horizontal spread
        ctx.fillStyle = 'rgba(100, 116, 139, 0.15)';
        ctx.beginPath();
        ctx.ellipse(
          (umbrellaLeftSX + umbrellaRightSX) / 2,
          colTopSY,
          (umbrellaRightSX - umbrellaLeftSX) / 2,
          40 * scale * 25,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();

        // Column Top Line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(umbrellaLeftSX, colTopSY);
        ctx.lineTo(umbrellaRightSX, colTopSY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px JetBrains Mono, monospace';
        ctx.fillText(`▲ Puncak Kolom: ${(plume.columnHeight / 1000).toFixed(1)} km (${plume.columnHeight}m)`, ventSX + 15, colTopSY - 6);
      }

      // 8. Vacuum Trajectory (Parabola Ideal)
      if (showIdealParabola && idealParabola?.points && idealParabola.points.length > 1) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        idealParabola.points.forEach((pt, i) => {
          const sx = toScreenX(pt.x);
          const sy = toScreenY(pt.y);
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 9. Multi-Projectile Ballistic Arcs (RK4)
      ballisticShower?.forEach((bomb, bIdx) => {
        const pts = bomb?.traj?.points;
        if (!pts || pts.length < 2) return;

        // Draw trajectory arc line
        ctx.strokeStyle = bomb.color;
        ctx.lineWidth = bIdx === 0 ? 2 : 1;
        ctx.beginPath();

        pts.forEach((p, i) => {
          const sx = toScreenX(p.x);
          const sy = toScreenY(p.y);
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        });
        ctx.stroke();

        // Landing Impact Point
        const landingPt = pts[pts.length - 1];
        if (landingPt && landingPt.y <= 0) {
          const impactSX = toScreenX(landingPt.x);
          const impactSY = toScreenY(0);

          ctx.fillStyle = bomb.color;
          ctx.beginPath();
          ctx.arc(impactSX, impactSY, bIdx === 0 ? 4 : 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 10. Real-time Animated Projectile along Trajectory
      if (primaryTrajectory?.points && primaryTrajectory.points.length > 0) {
        let activeIdx = primaryTrajectory.points.findIndex((p) => p.t >= ballisticTime);
        if (activeIdx === -1) activeIdx = primaryTrajectory.points.length - 1;
        const curPt = primaryTrajectory.points[activeIdx];

        const curSX = toScreenX(curPt.x);
        const curSY = toScreenY(curPt.y);

        // Projectile Glow
        ctx.shadowColor = '#f97316';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(curSX, curSY, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(curSX, curSY, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 11. Kinematic Force Vectors at Projectile (v, Fd, g)
        if (showVectors && curPt.y > 0) {
          const vel = curPt.speed;
          const angle = Math.atan2(curPt.vy, curPt.vx);

          // Velocity vector v (White)
          const vLen = Math.min(60, vel * 0.2);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(curSX, curSY);
          ctx.lineTo(curSX + Math.cos(angle) * vLen, curSY - Math.sin(angle) * vLen);
          ctx.stroke();

          // Drag force Fd (Red / opposing velocity)
          const area = Math.PI * Math.pow(ballistic.rockDiameter / 2, 2);
          const rho = 1.225 * Math.exp(-curPt.y / 8500);
          const fdMag = 0.5 * rho * ballistic.dragCoefficient * area * vel * vel;
          const fdLen = Math.min(45, (fdMag / (ballistic.rockDensity * 0.05)) * 0.05 + 15);

          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(curSX, curSY);
          ctx.lineTo(curSX - Math.cos(angle) * fdLen, curSY + Math.sin(angle) * fdLen);
          ctx.stroke();

          // Gravity g (downwards)
          ctx.strokeStyle = '#eab308';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(curSX, curSY);
          ctx.lineTo(curSX, curSY + 30);
          ctx.stroke();
        }
      }

      // 12. Splash Particles
      for (const s of splashesRef.current) {
        ctx.fillStyle = 'rgba(186, 230, 253, 0.8)';
        ctx.beginPath();
        ctx.arc(toScreenX(s.x), toScreenY(s.y), s.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // 13. Interactive Hover Probe
      if (probePos) {
        const probeMetersX = fromScreenX(probePos.x);
        const probeMetersY = fromScreenY(probePos.y);

        if (probeMetersY >= 0) {
          // Crosshair lines
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 3]);
          ctx.beginPath();
          ctx.moveTo(probePos.x, 0);
          ctx.lineTo(probePos.x, height);
          ctx.moveTo(0, probePos.y);
          ctx.lineTo(width, probePos.y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Standard atmosphere calculations
          const presHpa = 1013.25 * Math.exp(-probeMetersY / 8500);
          const tempC = 28 - (probeMetersY / 1000) * 6.5;

          // Tooltip card
          const tipX = Math.min(probePos.x + 15, width - 210);
          const tipY = Math.min(probePos.y - 65, height - 90);

          ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1;
          ctx.fillRect(tipX, tipY, 195, 62);
          ctx.strokeRect(tipX, tipY, 195, 62);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px JetBrains Mono, monospace';
          ctx.fillText(`X: ${(probeMetersX / 1000).toFixed(2)} km | Y: ${probeMetersY.toFixed(0)} mdpl`, tipX + 8, tipY + 16);

          ctx.fillStyle = '#94a3b8';
          ctx.font = '9px JetBrains Mono, monospace';
          ctx.fillText(`Tekanan: ${presHpa.toFixed(1)} hPa | Suhu: ${tempC.toFixed(1)}°C`, tipX + 8, tipY + 32);

          const isInsideKrb = Math.abs(probeMetersX) <= 5000;
          ctx.fillStyle = isInsideKrb ? '#f87171' : '#34d399';
          ctx.fillText(isInsideKrb ? 'Zona KRB III (Bahaya Ekstrem)' : 'Luar Radius Bahaya 5 km', tipX + 8, tipY + 48);
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    scale,
    originX,
    originY,
    ballistic,
    plume,
    showVectors,
    showIdealParabola,
    showSmokePlume,
    showLandmarks,
    showFlightLevelBands,
    showKrbBoundary,
    selectedFlightLevel,
    probePos,
    ballisticTime,
    ballisticShower,
    primaryTrajectory,
    idealParabola,
  ]);

  // Pan interaction
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setPanStart({ x: e.clientX - originX, y: e.clientY - originY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setOriginX(e.clientX - panStart.x);
      setOriginY(e.clientY - panStart.y);
    }
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setProbePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleMouseUp = () => setIsPanning(false);
  const handleMouseLeave = () => {
    setIsPanning(false);
    setProbePos(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setScale((prev) => Math.min(Math.max(prev * zoomFactor, 0.015), 0.6));
  };

  // Telemetry values for dock
  const curBallisticPt = useMemo(() => {
    const pts = primaryTrajectory?.points || [];
    if (!pts.length) return { t: 0, x: 0, y: 0, speed: 0, vx: 0, vy: 0 };
    let idx = pts.findIndex((p) => p.t >= ballisticTime);
    if (idx === -1) idx = pts.length - 1;
    return pts[idx];
  }, [primaryTrajectory, ballisticTime]);

  const simHours = Math.floor(simTimeMinutes / 60);
  const simMins = Math.floor(simTimeMinutes % 60);
  const simTimeDisplay = simHours > 0 ? `T+${simHours}j ${simMins}m` : `T+${simMins}m`;

  return (
    <div
      ref={containerRef}
      className="relative w-full min-h-[720px] h-[780px] bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl select-none group font-sans"
    >
      {/* 2D HTML5 Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        className="w-full h-full cursor-crosshair z-0"
      />

      {/* TOP NAVIGATION BAR: Focus shortcuts, Flight Level selector, Quick Actions */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Quick View Presets & Zoom */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 bg-black/92 backdrop-blur-xl px-2.5 py-1.5 rounded-xl border border-zinc-800 shadow-xl text-xs">
          <span className="text-[10px] font-mono text-zinc-400 font-semibold mr-1 hidden sm:inline">
            Fokus 2D:
          </span>

          <button
            onClick={() => applyViewFocus('crater')}
            className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all border ${
              viewFocus === 'crater'
                ? 'bg-white text-black font-bold border-white shadow-sm'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            title="Perbesar ke kawah aktif G. Anak Krakatau"
          >
            🌋 Kawah
          </button>

          <button
            onClick={() => applyViewFocus('caldera')}
            className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all border ${
              viewFocus === 'caldera'
                ? 'bg-white text-black font-bold border-white shadow-sm'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            title="Tinjauan Kaldera Purba & Tebing Rakata (0 - 7 km)"
          >
            🏝️ Kaldera
          </button>

          <button
            onClick={() => applyViewFocus('sunda')}
            className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all border ${
              viewFocus === 'sunda'
                ? 'bg-white text-black font-bold border-white shadow-sm'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            title="Penampang Lintang Selat Sunda hingga P. Sebesi & Banten (0 - 30 km)"
          >
            🌊 Selat Sunda
          </button>

          <button
            onClick={() => applyViewFocus('atmosphere')}
            className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all border ${
              viewFocus === 'atmosphere'
                ? 'bg-white text-black font-bold border-white shadow-sm'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            title="Kolom Vertikal Atmosfer & Koridor Penerbangan (0 - 16 km)"
          >
            ✈️ Atmosfer
          </button>

          <div className="h-3.5 w-px bg-zinc-800 mx-1" />

          <button
            onClick={() => setScale((s) => Math.min(s * 1.25, 0.6))}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setScale((s) => Math.max(s * 0.8, 0.015))}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={resetView}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white transition-colors"
            title="Reset Posisi & Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Flight Level Selector & Action Buttons */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 bg-black/92 backdrop-blur-xl px-2.5 py-1.5 rounded-xl border border-zinc-800 shadow-xl text-xs">
          {/* Flight Level Selector */}
          <div className="flex items-center gap-1 bg-zinc-900/90 rounded-lg p-0.5 border border-zinc-800">
            <span className="text-[10px] text-zinc-400 font-mono px-1.5 flex items-center gap-1">
              <Plane className="w-3 h-3 text-sky-400" />
              <span className="hidden xl:inline">Level:</span>
            </span>
            {(['ALL', 'SFC-FL100', 'FL100-FL250', 'FL250-FL450'] as FlightLevelKey[]).map((flKey) => (
              <button
                key={flKey}
                onClick={() => setSelectedFlightLevel(flKey)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                  selectedFlightLevel === flKey
                    ? 'bg-sky-500 text-black font-bold shadow'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                }`}
                title={flKey === 'ALL' ? 'Tampilkan seluruh koridor' : FLIGHT_LEVEL_MAP[flKey].label}
              >
                {flKey === 'ALL' ? 'Semua' : flKey}
              </button>
            ))}
          </div>

          <div className="h-3.5 w-px bg-zinc-800 mx-0.5 hidden sm:block" />

          {/* Quick Toggle: Aerosol & SO2 Gas Plume */}
          <button
            onClick={() => {
              if (!showSo2Layer) setShowSo2Layer(true);
              setActiveDrawer(activeDrawer === 'aerosol' ? null : 'aerosol');
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all border ${
              activeDrawer === 'aerosol'
                ? 'bg-sky-400 text-black border-sky-300 font-bold shadow-md shadow-sky-500/20'
                : showSo2Layer
                ? 'bg-sky-950/80 text-sky-300 border-sky-500/60 shadow-sm'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
            title="Analisis & Simulasi Aerosol Sulfat (H2SO4) & Oksidasi SO2"
          >
            <span>🧪</span>
            <span className="hidden md:inline">Aerosol & SO₂</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[8.5px] font-mono font-bold ${
                showSo2Layer ? 'bg-sky-400 text-black' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {showSo2Layer ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Quick Toggle: Heatmap Bahaya Pesisir */}
          <button
            onClick={() => setShowHazardHeatmap(!showHazardHeatmap)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all border ${
              showHazardHeatmap
                ? 'bg-amber-400 text-black border-amber-300 font-bold shadow-md'
                : 'bg-zinc-900 text-amber-300 border-amber-500/40 hover:bg-amber-950/40 hover:text-white'
            }`}
            title="Overlay kepadatan penduduk & bahaya pesisir Selat Sunda"
          >
            <span>👥</span>
            <span className="hidden md:inline">Heatmap Bahaya</span>
            <span className="md:hidden">Heatmap</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                showHazardHeatmap ? 'bg-black text-amber-300' : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {showHazardHeatmap ? 'ON' : 'OFF'}
            </span>
          </button>

          <div className="h-3.5 w-px bg-zinc-800 mx-0.5" />

          {/* Cek Bandara & Kota Button */}
          <button
            onClick={() => setActiveDrawer(activeDrawer === 'impact' ? null : 'impact')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all border ${
              activeDrawer === 'impact'
                ? 'bg-amber-400 text-black border-amber-300 shadow-md shadow-amber-500/20'
                : 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/50 hover:from-amber-500/30 hover:to-orange-500/30 hover:text-white'
            }`}
            title="Evaluasi dampak ke Bandara (CGK, TKG), Pelabuhan, & Kota di Banten dan Lampung"
          >
            <span>📍</span>
            <span>Cek Bandara & Kota</span>
          </button>

          {/* Cuaca & Angin Button */}
          <button
            onClick={() => setActiveDrawer(activeDrawer === 'weather' ? null : 'weather')}
            className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all border ${
              activeDrawer === 'weather'
                ? 'bg-sky-500 text-black border-sky-400 font-bold shadow-md'
                : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-white hover:border-zinc-700'
            }`}
            title="Kondisi cuaca & angin real-time Gunung Anak Krakatau"
          >
            <Wind className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-mono text-white">
              {weather ? `${weather.wind.speedMs} m/s` : `${plume.windSpeed} m/s`}
            </span>
          </button>

          {/* Lapisan Panel Button */}
          <button
            onClick={() =>
              setActiveDrawer(
                activeDrawer &&
                  activeDrawer !== 'impact' &&
                  activeDrawer !== 'weather' &&
                  activeDrawer !== 'aerosol'
                  ? null
                  : 'layers'
              )
            }
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-all border ${
              activeDrawer &&
              activeDrawer !== 'impact' &&
              activeDrawer !== 'weather' &&
              activeDrawer !== 'aerosol'
                ? 'bg-zinc-200 text-black border-white font-bold'
                : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-white hover:border-zinc-700'
            }`}
            title="Buka panel kendali lapisan elevasi dan analisis radius"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lapisan</span>
          </button>
        </div>
      </div>

      {/* RIGHT SLIDE-OUT DRAWER: Clean, Single Container identical to Satellite Map */}
      {activeDrawer && (
        <div className="absolute top-16 right-3 bottom-20 w-80 sm:w-96 bg-black/95 backdrop-blur-2xl border border-zinc-800 rounded-2xl shadow-2xl z-25 flex flex-col pointer-events-auto overflow-hidden animate-in fade-in slide-in-from-right-2 duration-200">
          {/* Drawer Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-zinc-800 p-2 bg-zinc-950/80">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveDrawer('impact')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  activeDrawer === 'impact'
                    ? 'bg-amber-400 text-black font-bold shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                📍 Wilayah
              </button>
              <button
                onClick={() => setActiveDrawer('aerosol')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  activeDrawer === 'aerosol'
                    ? 'bg-sky-400 text-black font-bold shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                🧪 Aerosol
              </button>
              <button
                onClick={() => setActiveDrawer('layers')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  activeDrawer === 'layers'
                    ? 'bg-zinc-800 text-white font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                🎛️ Lapisan
              </button>
              <button
                onClick={() => setActiveDrawer('weather')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  activeDrawer === 'weather'
                    ? 'bg-sky-500 text-black font-bold shadow'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                🌤️ Cuaca
              </button>
              <button
                onClick={() => setActiveDrawer('analysis')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  activeDrawer === 'analysis'
                    ? 'bg-zinc-800 text-white font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                📊 Radius
              </button>
              <button
                onClick={() => setActiveDrawer('bmkg')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  activeDrawer === 'bmkg'
                    ? 'bg-zinc-800 text-white font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                🏛️ BMKG
              </button>
            </div>
            <button
              onClick={() => setActiveDrawer(null)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ml-1"
              title="Tutup Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans text-zinc-300">
            {/* TAB 1: REGIONAL INFRASTRUCTURE IMPACT */}
            {activeDrawer === 'impact' && (
              <RegionalImpactChecker
                plume={plume}
                ballistic={ballistic}
                selectedFlightLevel={selectedFlightLevel}
                onSelectFlightLevel={setSelectedFlightLevel}
              />
            )}

            {/* TAB 2: AEROSOL & SO2 DISPERSION */}
            {activeDrawer === 'aerosol' && (
              <div className="space-y-3">
                <div className="pb-2 border-b border-zinc-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <span>🧪</span>
                      <span>Dispersi Aerosol & Gas SO₂</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 text-[10px] font-mono">
                      H₂SO₄ Microphysics
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                    Pemodelan kinetika oksidasi sulfur dioksida menjadi aerosol sulfat sekunder di atmosfer bebas.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block font-mono">Laju Oksidasi SO₂</span>
                    <strong className="text-white text-sm font-mono">{(aerosolMetrics.oxidationRatePctPerHour * 100).toFixed(2)}%</strong>
                    <span className="text-[9px] text-zinc-500 block">per jam</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800">
                    <span className="text-[10px] text-zinc-400 block font-mono">Aerosol H₂SO₄</span>
                    <strong className="text-sky-300 text-sm font-mono">{aerosolMetrics.cumulativeSulfateMassTons.toFixed(1)}</strong>
                    <span className="text-[9px] text-zinc-500 block">ton sulfat</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-1.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-400">Puncak Optical Depth (AOD):</span>
                    <strong className="text-amber-300 font-mono">{aerosolMetrics.peakAod550.toFixed(3)}</strong>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-400">Kategori Kekeruhan Udara:</span>
                    <span className="text-amber-400 font-medium font-mono">{aerosolMetrics.aodCategory}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (onOpenAerosolModal) onOpenAerosolModal();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg"
                >
                  <span>🧪</span>
                  <span>Buka Simulator Aerosol Lengkap</span>
                </button>
              </div>
            )}

            {/* TAB 3: LAYER CONTROLS */}
            {activeDrawer === 'layers' && (
              <div className="space-y-4">
                <div className="pb-1 border-b border-zinc-800">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-white" />
                    Kendali Lapisan Penampang Elevasi
                  </span>
                </div>

                <div className="space-y-2.5">
                  <label className="flex items-center justify-between p-2 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer">
                    <span className="text-zinc-200">Vektor Kinematik RK4 (v, Fd, g)</span>
                    <input
                      type="checkbox"
                      checked={showVectors}
                      onChange={(e) => setShowVectors(e.target.checked)}
                      className="w-4 h-4 rounded text-white accent-white"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer">
                    <span className="text-zinc-200">Parabola Vakum (Tanpa Drag)</span>
                    <input
                      type="checkbox"
                      checked={showIdealParabola}
                      onChange={(e) => setShowIdealParabola(e.target.checked)}
                      className="w-4 h-4 rounded text-white accent-white"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer">
                    <span className="text-zinc-200">Kolom & Payung Asap Vulkanik</span>
                    <input
                      type="checkbox"
                      checked={showSmokePlume}
                      onChange={(e) => setShowSmokePlume(e.target.checked)}
                      className="w-4 h-4 rounded text-white accent-white"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer">
                    <span className="text-zinc-200">Topografi Landmark (Rakata, Sebesi)</span>
                    <input
                      type="checkbox"
                      checked={showLandmarks}
                      onChange={(e) => setShowLandmarks(e.target.checked)}
                      className="w-4 h-4 rounded text-white accent-white"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer">
                    <span className="text-zinc-200">Batas Zona Steril KRB III 5 km</span>
                    <input
                      type="checkbox"
                      checked={showKrbBoundary}
                      onChange={(e) => setShowKrbBoundary(e.target.checked)}
                      className="w-4 h-4 rounded text-white accent-white"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2 rounded-xl bg-zinc-900 border border-zinc-800 cursor-pointer">
                    <span className="text-zinc-200">Koridor Penerbangan (Flight Levels)</span>
                    <input
                      type="checkbox"
                      checked={showFlightLevelBands}
                      onChange={(e) => setShowFlightLevelBands(e.target.checked)}
                      className="w-4 h-4 rounded text-white accent-white"
                    />
                  </label>
                </div>

                {/* Multi-projectile Bomb Configuration */}
                <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2">
                  <span className="text-xs font-bold text-white block">Jumlah Lontaran Bom Piroklastik:</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[1, 6, 12].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => {
                          if (onUpdateBallistic) onUpdateBallistic({ projectileCount: cnt });
                        }}
                        className={`py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          (ballistic.projectileCount ?? 6) === cnt
                            ? 'bg-amber-500 text-black font-bold border-amber-400'
                            : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white'
                        }`}
                      >
                        {cnt === 1 ? '1 Batu' : `${cnt} Bom`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: WEATHER & WIND SOUNDING */}
            {activeDrawer === 'weather' && (
              <div className="space-y-3">
                <WeatherWidget
                  weather={weather || null}
                  isLoading={Boolean(isLoadingWeather)}
                  onRefresh={onRefreshWeather || (() => {})}
                  onApplyWind={(speed, dir) => onUpdateWind && onUpdateWind(speed, dir)}
                  currentSimWindSpeed={plume.windSpeed}
                  currentSimWindDirection={plume.windDirection}
                  isAutoSync={isAutoSyncWeather}
                  onToggleAutoSync={onToggleAutoSyncWeather}
                  variant="drawer"
                />

                {onOpenWeatherModal && (
                  <button
                    onClick={onOpenWeatherModal}
                    className="w-full py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors border border-zinc-750"
                  >
                    <span>🌤️</span>
                    <span>Buka Telemetri Cuaca Lengkap</span>
                  </button>
                )}
              </div>
            )}

            {/* TAB 5: RADIUS & BALLISTIC ANALYSIS */}
            {activeDrawer === 'analysis' && (
              <div className="space-y-3">
                <div className="pb-1 border-b border-zinc-800">
                  <span className="font-bold text-white text-xs flex items-center gap-1.5">
                    <span>📊</span>
                    <span>Analisis Radius & Jangkauan Balistik</span>
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Jangkauan Horizontal Bom:</span>
                    <strong className="text-amber-400 font-mono">
                      {(primaryTrajectory.maxRange / 1000).toFixed(2)} km
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Tinggi Puncak Lemparan:</span>
                    <strong className="text-white font-mono">{primaryTrajectory.maxAltitude.toFixed(0)} m</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Waktu Terbang Total:</span>
                    <strong className="text-white font-mono">{primaryTrajectory.flightTime.toFixed(1)} s</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Kecepatan Impak Permukaan:</span>
                    <strong className="text-red-400 font-mono">
                      {primaryTrajectory.impactSpeed.toFixed(1)} m/s ({(primaryTrajectory.impactSpeed * 3.6).toFixed(0)} km/j)
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800">
                  <button
                    onClick={() => {
                      if (onOpenEjectaDetail) onOpenEjectaDetail();
                      else setIsInternalEjectaModalOpen(true);
                    }}
                    className="p-2 rounded-xl text-[10.5px] font-semibold flex items-center justify-center gap-1.5 transition-all border border-amber-500/40 bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 hover:text-white"
                  >
                    <span>💥</span>
                    <span>Telemetri Bom</span>
                  </button>

                  <button
                    onClick={() => {
                      if (onOpenAshDetail) onOpenAshDetail();
                      else setIsInternalAshModalOpen(true);
                    }}
                    className="p-2 rounded-xl text-[10.5px] font-semibold flex items-center justify-center gap-1.5 transition-all border border-purple-500/40 bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 hover:text-white"
                  >
                    <span>☁️</span>
                    <span>Matriks Abu</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 6: BMKG SCENARIO & ETA */}
            {activeDrawer === 'bmkg' && (
              <div className="space-y-3">
                <div className="font-semibold text-zinc-200 flex items-center justify-between pb-1 border-b border-zinc-800">
                  <span className="font-bold text-white text-[12px] flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-white" />
                    Pusat Data BMKG & SIGMET
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-zinc-400 text-[10px] font-sans block">Pilih Skenario BMKG:</span>
                  <div className="space-y-1">
                    {BMKG_SIGMET_SCENARIOS.map((scenario) => {
                      const isActive = activeBmkgScenarioId === scenario.id;
                      return (
                        <button
                          key={scenario.id}
                          onClick={() => handleApplyBmkgScenario(scenario)}
                          className={`w-full text-left px-2.5 py-2 rounded-xl text-[11px] font-mono transition-all border flex items-center justify-between ${
                            isActive
                              ? 'bg-white text-black font-bold border-white shadow-md'
                              : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-white hover:bg-zinc-850'
                          }`}
                        >
                          <span>{scenario.title.split(' (')[0]}</span>
                          <span className="text-[10px] opacity-75">
                            {scenario.driftDirectionDeg}° / {scenario.windSpeedMs} m/s
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (onOpenBmkg) onOpenBmkg();
                    else setIsInternalBmkgModalOpen(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg"
                >
                  <Radio className="w-3.5 h-3.5 text-black" />
                  <span>Buka Buletin Lengkap & Sounding</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOTTOM FLOATING DOCK: Interactive Animation Scrubber & Telemetry Bar */}
      <div className="absolute bottom-3 left-3 right-3 z-20 pointer-events-auto bg-black/92 backdrop-blur-2xl border border-zinc-800 rounded-2xl shadow-2xl p-3 sm:p-4 text-xs font-sans text-zinc-200">
        {/* Dock Tab Selector */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveAnimTab('ballistic')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                activeAnimTab === 'ballistic'
                  ? 'bg-amber-400 text-black border-amber-300 shadow-md'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              <span>💥</span>
              <span>Animasi Lemparan Bom (Balistik RK4)</span>
            </button>

            <button
              onClick={() => setActiveAnimTab('smoke')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                activeAnimTab === 'smoke'
                  ? 'bg-white text-black border-white shadow-md'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              <span>☁️</span>
              <span>Animasi Kolom Asap & Dispersi Abu</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-3 text-[11px] font-mono text-zinc-400">
            <span>
              Angin: <strong className="text-white">{plume.windSpeed} m/s</strong> ({plume.windDirection}°)
            </span>
            <span className="text-zinc-700">•</span>
            <span>
              Tinggi Kolom: <strong className="text-white">{(plume.columnHeight / 1000).toFixed(1)} km</strong>
            </span>
          </div>
        </div>

        {/* TAB 1: BALLISTIC ANIMATION DOCK */}
        {activeAnimTab === 'ballistic' && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setBallisticTime(0);
                    setIsBallisticPlaying(true);
                  }}
                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs transition-colors"
                  title="Ulangi dari Awal (t = 0)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setIsBallisticPlaying(!isBallisticPlaying)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border shadow ${
                    isBallisticPlaying
                      ? 'bg-amber-400 text-black border-amber-300 hover:bg-amber-300'
                      : 'bg-zinc-850 text-white border-zinc-700 hover:bg-zinc-750'
                  }`}
                >
                  {isBallisticPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Jeda</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Putar</span>
                    </>
                  )}
                </button>

                <div className="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
                  {[0.5, 1.0, 2.0, 4.0].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setBallisticSpeed(spd)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                        ballisticSpeed === spd ? 'bg-amber-500 text-black font-bold' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time Telemetry readouts */}
              <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-300">
                <span>
                  Waktu: <strong className="text-white">{ballisticTime.toFixed(1)}s</strong> / {totalFlightTime.toFixed(1)}s
                </span>
                <span className="text-zinc-600">|</span>
                <span>
                  Tinggi Bom: <strong className="text-amber-400">{curBallisticPt.y.toFixed(0)}m</strong>
                </span>
                <span className="text-zinc-600">|</span>
                <span>
                  Jarak: <strong className="text-white">{(curBallisticPt.x / 1000).toFixed(2)} km</strong>
                </span>
                <span className="text-zinc-600">|</span>
                <span>
                  Kecepatan: <strong className="text-red-400">{curBallisticPt.speed.toFixed(0)} m/s</strong>
                </span>
              </div>
            </div>

            {/* Time Scrubber Slider */}
            <div className="space-y-1">
              <input
                type="range"
                min={0}
                max={totalFlightTime}
                step={0.05}
                value={ballisticTime}
                onChange={(e) => {
                  setBallisticTime(Number(e.target.value));
                  setIsBallisticPlaying(false);
                }}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                <span>🌋 Kawah G. Anak Krakatau (0s)</span>
                <span className="text-white font-bold">
                  {ballisticTime >= totalFlightTime
                    ? `💥 Benturan di Titik Jatuh (${(primaryTrajectory.maxRange / 1000).toFixed(2)} km)!`
                    : `Kecepatan: ${curBallisticPt.speed.toFixed(0)} m/s`}
                </span>
                <span>Mendarat ({totalFlightTime.toFixed(1)}s)</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SMOKE & ASH ANIMATION DOCK */}
        {activeAnimTab === 'smoke' && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSimTimeMinutes(0)}
                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs transition-colors"
                  title="Reset ke Momen Erupsi (T+0)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setSimTimeMinutes((prev) => Math.max(0, prev - 15))}
                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs transition-colors"
                  title="Mundur 15 Menit"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setIsSmokePlaying(!isSmokePlaying)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors border shadow ${
                    isSmokePlaying
                      ? 'bg-white text-black border-white hover:bg-zinc-200'
                      : 'bg-zinc-850 text-white border-zinc-700 hover:bg-zinc-750'
                  }`}
                >
                  {isSmokePlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Jeda</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Putar</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setSimTimeMinutes((prev) => Math.min(240, prev + 15))}
                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs transition-colors"
                  title="Maju 15 Menit"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
                  {[0.5, 1.0, 2.0, 5.0].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setSmokeSpeed(spd)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                        smokeSpeed === spd ? 'bg-white text-black font-bold' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Ash Telemetry readouts */}
              <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-300">
                <span>
                  Waktu Erupsi: <strong className="text-white">{simTimeDisplay}</strong>
                </span>
                <span className="text-zinc-600">|</span>
                <span>
                  Jangkauan Front: <strong className="text-amber-400">{Math.min(120, (plume.windSpeed * 3.6 * (simTimeMinutes / 60))).toFixed(1)} km</strong>
                </span>
                <span className="text-zinc-600">|</span>
                <span>
                  Radius Payung: <strong className="text-white">{(2.5 + (plume.columnHeight / 1000) * 0.8).toFixed(1)} km</strong>
                </span>
              </div>
            </div>

            {/* Scrubber slider for ash dispersal time */}
            <div className="space-y-1">
              <input
                type="range"
                min={0}
                max={240}
                step={1}
                value={simTimeMinutes}
                onChange={(e) => {
                  setSimTimeMinutes(Number(e.target.value));
                  setIsSmokePlaying(false);
                }}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-400">
                <span>T+0m (Awal Letusan)</span>
                <span className="text-white font-bold">Waktu Simulasi: {simTimeDisplay}</span>
                <span>T+240m (4 Jam Pasca-Letusan)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Internal Modals for Fallback */}
      <VolcanicEjectaDetailModal
        isOpen={isInternalEjectaModalOpen}
        onClose={() => setIsInternalEjectaModalOpen(false)}
        ballistic={ballistic}
        plume={plume}
      />

      <AshDispersalDetailModal
        isOpen={isInternalAshModalOpen}
        onClose={() => setIsInternalAshModalOpen(false)}
        plume={plume}
        ballistic={ballistic}
      />

      <BmkgAdvisoryModal
        isOpen={isInternalBmkgModalOpen}
        onClose={() => setIsInternalBmkgModalOpen(false)}
        currentPlume={plume}
        onApplyBmkgScenario={handleApplyBmkgScenario}
      />
    </div>
  );
};
