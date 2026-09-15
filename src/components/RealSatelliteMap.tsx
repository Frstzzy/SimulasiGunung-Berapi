/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';

// Defensive safeguard against Leaflet race conditions where getPosition is called on detached/unmounted elements
if (typeof window !== 'undefined' && L && (L as any).DomUtil) {
  const domUtil = (L as any).DomUtil;
  if (!domUtil._posSafeguarded) {
    domUtil._posSafeguarded = true;
    const origGetPos = domUtil.getPosition;
    domUtil.getPosition = function (el: any) {
      if (!el || typeof el !== 'object') {
        return new L.Point(0, 0);
      }
      try {
        return origGetPos ? origGetPos.call(domUtil, el) : (el._leaflet_pos || new L.Point(0, 0));
      } catch {
        return new L.Point(0, 0);
      }
    };
    const origSetPos = domUtil.setPosition;
    domUtil.setPosition = function (el: any, point: any) {
      if (!el || typeof el !== 'object') return;
      try {
        if (origSetPos) origSetPos.call(domUtil, el, point);
      } catch {
        // ignore detached DOM errors
      }
    };
  }
}

import {
  Layers,
  Crosshair,
  Compass,
  Wind,
  Flame,
  AlertTriangle,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  MapPin,
  Eye,
  Ruler,
  Anchor,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldAlert,
  Sparkles,
  Radio,
  Sliders,
  Play,
  Pause,
  FastForward,
  SkipBack,
  SkipForward,
  Clock,
  CloudRain,
  FileText,
  X,
  Users,
  Waves,
  Plane,
  Search
} from 'lucide-react';
import { BallisticParams, PlumeParams, KrakatauWeather } from '../types';
import { computeTrajectory3D, computeTrajectory, computeBallisticShower, ShowerBomb } from '../physics/ballistics';
import { AshDispersalDetailModal } from './AshDispersalDetailModal';
import { VolcanicEjectaDetailModal } from './VolcanicEjectaDetailModal';
import {
  BMKG_AFFECTED_AREAS,
  BMKG_SIGMET_SCENARIOS,
  BmkgSigmetScenario,
} from '../data/bmkgData';
import {
  COASTAL_HAZARD_NODES,
  CoastalHazardNode,
  evaluateNodePlumeImpact,
  NodeEvaluationResult
} from '../data/hazardHeatmapData';
import { HazardHeatmapWidget, HeatmapMode } from './HazardHeatmapWidget';
import { BmkgAdvisoryModal } from './BmkgAdvisoryModal';
import { WeatherWidget } from './WeatherWidget';
import {
  REGIONAL_INFRASTRUCTURES,
  FlightLevelKey,
  FLIGHT_LEVEL_MAP,
  evaluateInfrastructureImpact,
  RegionalInfrastructure
} from '../data/regionalInfrastructureData';
import { RegionalImpactChecker } from './RegionalImpactChecker';

interface RealSatelliteMapProps {
  ballistic: BallisticParams;
  plume: PlumeParams;
  onUpdateWind?: (speed: number, direction: number) => void;
  onUpdateBallistic?: (params: Partial<BallisticParams>) => void;
  onUpdatePlume?: (params: Partial<PlumeParams>) => void;
  weather?: KrakatauWeather | null;
  isLoadingWeather?: boolean;
  onRefreshWeather?: () => void;
  isAutoSyncWeather?: boolean;
  onToggleAutoSyncWeather?: () => void;
  onOpenWeatherModal?: () => void;
}

// Vent coordinate: Gunung Anak Krakatau Crater (WGS84)
const CRATER_COORDS: [number, number] = [-6.1021, 105.4230];

interface GeoPoint {
  id: string;
  name: string;
  coords: [number, number];
  type: 'crater' | 'island' | 'coastal' | 'port';
  elevation: string;
  desc: string;
  distKm: number;
  bearingDeg: number;
}

const REAL_LANDMARKS: GeoPoint[] = [
  {
    id: 'vent',
    name: 'G. Anak Krakatau (Kawah)',
    coords: [-6.1021, 105.4230],
    type: 'crater',
    elevation: '157 mdpl',
    desc: 'Pusat erupsi vulkanik aktif pasca-kolaps kaldera 2018.',
    distKm: 0,
    bearingDeg: 0,
  },
  {
    id: 'rakata',
    name: 'P. Rakata',
    coords: [-6.1500, 105.4410],
    type: 'island',
    elevation: '813 mdpl',
    desc: 'Sisa kerucut purba kaldera letusan paroksismal 1883 dengan dinding tebing vertikal.',
    distKm: 5.6,
    bearingDeg: 160,
  },
  {
    id: 'sertung',
    name: 'P. Sertung',
    coords: [-6.0950, 105.3900],
    type: 'island',
    elevation: '182 mdpl',
    desc: 'Pulau pelindung kaldera di barat laut dengan vegetasi rintisan pasca-1883.',
    distKm: 3.7,
    bearingDeg: 282,
  },
  {
    id: 'panjang',
    name: 'P. Panjang (P. Anak)',
    coords: [-6.0890, 105.4490],
    type: 'island',
    elevation: '132 mdpl',
    desc: 'Tebing kaldera di timur laut pembatas kaldera bawah laut Selat Sunda.',
    distKm: 3.2,
    bearingDeg: 62,
  },
  {
    id: 'sebesi',
    name: 'P. Sebesi',
    coords: [-5.9520, 105.4980],
    type: 'island',
    elevation: '844 mdpl',
    desc: 'Pulau berpenghuni terdekat (±2.800 jiwa), titik evakuasi utama saat krisis erupsi.',
    distKm: 18.5,
    bearingDeg: 26,
  },
  {
    id: 'anyer',
    name: 'Anyer, Banten',
    coords: [-6.0500, 105.9200],
    type: 'coastal',
    elevation: '5 mdpl',
    desc: 'Kawasan pesisir wisata dan pemukiman padat Banten, berjarak ~55 km.',
    distKm: 55.3,
    bearingDeg: 84,
  },
  {
    id: 'carita',
    name: 'Carita, Banten',
    coords: [-6.3000, 105.8300],
    type: 'coastal',
    elevation: '7 mdpl',
    desc: 'Pesisir barat Pandeglang, lokasi terdampak tsunami Selat Sunda 2018.',
    distKm: 49.5,
    bearingDeg: 116,
  },
  {
    id: 'bakauheni',
    name: 'Pelabuhan Bakauheni',
    coords: [-5.8670, 105.7500],
    type: 'port',
    elevation: '10 mdpl',
    desc: 'Dermaga feri penyeberangan lintas Jawa-Sumatra (ASDP).',
    distKm: 44.8,
    bearingDeg: 54,
  },
  {
    id: 'kalianda',
    name: 'Kalianda, Lampung',
    coords: [-5.7400, 105.6200],
    type: 'coastal',
    elevation: '12 mdpl',
    desc: 'Ibu kota Kabupaten Lampung Selatan di kaki Gunung Rajabasa.',
    distKm: 45.9,
    bearingDeg: 28,
  },
];

// Shipping lane ALKI I coordinates through Sunda Strait
const ALKI_SHIPPING_LANE: [number, number][] = [
  [-5.55, 105.85],
  [-5.80, 105.73],
  [-6.05, 105.62],
  [-6.30, 105.50],
  [-6.60, 105.35],
];

// Basemap Tile Providers
type TileProvider = 'satellite' | 'dark' | 'osm' | 'ocean';

const CARTO_API_KEY =
  ((import.meta as any).env?.VITE_CARTO_API_KEY as string) || 'cb1_3j79_1_fe907188dc90c137acaeb241';

const TILE_LAYERS: Record<TileProvider, { name: string; url: string; attribution: string; subdomains?: string[] }> = {
  satellite: {
    name: 'Citra Satelit Resolusi Tinggi (Esri World Imagery)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
  },
  dark: {
    name: 'Satelit Taktis Monokrom (CARTO Dark Matter)',
    url: `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`,
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: ['a', 'b', 'c', 'd'],
  },
  osm: {
    name: 'Peta Topografi Daratan (OpenStreetMap)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  ocean: {
    name: 'Batimetri Palung Selat Sunda (Esri Ocean)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, GEBCO, NOAA',
  },
};

/**
 * Calculates geographical coordinates at a given distance (meters) and bearing (degrees)
 * from a center point using local spherical projection.
 */
function getCoordAtBearingAndDist(
  center: [number, number],
  bearingDeg: number,
  distMeters: number
): [number, number] {
  const rad = (bearingDeg * Math.PI) / 180;
  const deltaLat = (distMeters * Math.cos(rad)) / 111139;
  const deltaLon = (distMeters * Math.sin(rad)) / (111139 * Math.cos((center[0] * Math.PI) / 180));
  return [center[0] + deltaLat, center[1] + deltaLon];
}

/**
 * Computes maximum ballistic ejection envelope radius across optimal angles (35°-60°)
 */
function computeMaxBallisticEnvelope(ballistic: BallisticParams): number {
  const testAngles = [35, 40, 42.5, 45, 47.5, 50, 55, 60];
  let maxRangeMeters = 0;
  for (const angle of testAngles) {
    const traj = computeTrajectory({ ...ballistic, launchAngle: angle }, ballistic.enableAirDrag);
    if (traj.maxRange > maxRangeMeters) {
      maxRangeMeters = traj.maxRange;
    }
  }
  return maxRangeMeters;
}

/**
 * Generates an elliptical downwind ash fallout isopach contour based on BMKG wind vectors.
 */
function generateIsopachContour(
  center: [number, number],
  driftAngleDeg: number,
  downwindKm: number,
  upwindKm: number,
  crosswindKm: number,
  steps = 36
): [number, number][] {
  const coords: [number, number][] = [];
  for (let i = 0; i < steps; i++) {
    const angleRad = (i / steps) * 2 * Math.PI;
    const cosVal = Math.cos(angleRad);
    const sinVal = Math.sin(angleRad);

    // Along-axis: downwind (positive cos) vs upwind backflow (negative cos)
    const alongDistKm = cosVal >= 0 ? cosVal * downwindKm : cosVal * upwindKm;
    // Crosswind lateral expansion
    const taper = cosVal >= 0 ? 0.35 + 0.65 * (alongDistKm / Math.max(0.1, downwindKm)) : 0.35;
    const crossDistKm = sinVal * crosswindKm * taper;

    const distMeters = Math.hypot(alongDistKm, crossDistKm) * 1000;
    const localBearingOffset = (Math.atan2(crossDistKm, alongDistKm) * 180) / Math.PI;
    const finalBearing = (driftAngleDeg + localBearingOffset + 360) % 360;

    coords.push(getCoordAtBearingAndDist(center, finalBearing, distMeters));
  }
  return coords;
}

export const RealSatelliteMap: React.FC<RealSatelliteMapProps> = ({
  ballistic,
  plume,
  onUpdateWind,
  onUpdateBallistic,
  onUpdatePlume,
  weather,
  isLoadingWeather,
  onRefreshWeather,
  isAutoSyncWeather,
  onToggleAutoSyncWeather,
  onOpenWeatherModal,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Layer groups
  const hazardGroupRef = useRef<L.LayerGroup | null>(null);
  const ballisticGroupRef = useRef<L.LayerGroup | null>(null);
  const plumeGroupRef = useRef<L.LayerGroup | null>(null);
  const simulationGroupRef = useRef<L.LayerGroup | null>(null);
  const landmarkGroupRef = useRef<L.LayerGroup | null>(null);
  const shippingGroupRef = useRef<L.LayerGroup | null>(null);
  const bmkgGroupRef = useRef<L.LayerGroup | null>(null);
  const ballisticAnimGroupRef = useRef<L.LayerGroup | null>(null);
  const heatmapGroupRef = useRef<L.LayerGroup | null>(null);
  const so2GroupRef = useRef<L.LayerGroup | null>(null);
  const regionalGroupRef = useRef<L.LayerGroup | null>(null);

  // States
  const [selectedTile, setSelectedTile] = useState<TileProvider>('dark');
  const [showMaxBallisticRadius, setShowMaxBallisticRadius] = useState<boolean>(true);
  const [showActiveTrajectory, setShowActiveTrajectory] = useState<boolean>(true);
  const [showUmbrellaCloud, setShowUmbrellaCloud] = useState<boolean>(true);
  const [showAshPlumeCones, setShowAshPlumeCones] = useState<boolean>(true);
  const [showWindVector, setShowWindVector] = useState<boolean>(true);
  const [showRadiusLabels, setShowRadiusLabels] = useState<boolean>(true);
  const [showKRBZones, setShowKRBZones] = useState<boolean>(true);
  const [showLandmarks, setShowLandmarks] = useState<boolean>(true);
  const [showShipping, setShowShipping] = useState<boolean>(true);

  // Flight Level & Atmospheric Gas Indicators (Inspired by abu.cikoytew.my.id)
  const [selectedFlightLevel, setSelectedFlightLevel] = useState<FlightLevelKey>('ALL');
  const [showSo2Layer, setShowSo2Layer] = useState<boolean>(true);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  // Population Density & Coastal Hazard Heatmap States
  const [showHazardHeatmap, setShowHazardHeatmap] = useState<boolean>(true);
  const [heatmapMode, setHeatmapMode] = useState<HeatmapMode>('composite');
  const [heatmapOpacity, setHeatmapOpacity] = useState<number>(0.75);
  const [selectedHeatNodeId, setSelectedHeatNodeId] = useState<string | null>(null);

  // BMKG Official Layer & Affected Areas States
  const [showBmkgSigmet, setShowBmkgSigmet] = useState<boolean>(true);
  const [showBmkgAshDeposit, setShowBmkgAshDeposit] = useState<boolean>(true);
  const [showBmkgAffectedAreas, setShowBmkgAffectedAreas] = useState<boolean>(true);
  const [isBmkgModalOpen, setIsBmkgModalOpen] = useState<boolean>(false);
  const [activeBmkgScenarioId, setActiveBmkgScenarioId] = useState<string>('sigmet-west-monsoon');

  // Specific animation options requested by user
  const [showBallisticAnim, setShowBallisticAnim] = useState<boolean>(false);
  const [isBallisticPlaying, setIsBallisticPlaying] = useState<boolean>(false);
  const [ballisticTime, setBallisticTime] = useState<number>(0);
  const [ballisticSpeed, setBallisticSpeed] = useState<number>(1.0);

  const [showSmokeAnim, setShowSmokeAnim] = useState<boolean>(false);
  const [isSmokePlaying, setIsSmokePlaying] = useState<boolean>(false);
  const [simTimeMinutes, setSimTimeMinutes] = useState<number>(0);
  const [simSpeed, setSimSpeed] = useState<number>(5);
  const [showIsochrones, setShowIsochrones] = useState<boolean>(true);
  const [showAshPuffs, setShowAshPuffs] = useState<boolean>(false); // disabled auto-animation
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isEjectaModalOpen, setIsEjectaModalOpen] = useState<boolean>(false);
  const [activeSimTab, setActiveSimTab] = useState<'timeline' | 'eta' | 'deposit'>('timeline');

  // Unified Drawer & Dock UI states (eliminates colliding cards)
  const [activeDrawer, setActiveDrawer] = useState<'impact' | 'layers' | 'analysis' | 'bmkg' | 'weather' | null>(null);
  const [activeAnimTab, setActiveAnimTab] = useState<'ballistic' | 'smoke'>('ballistic');

  // Cursor inspector state
  const [cursorInfo, setCursorInfo] = useState<{
    lat: number;
    lng: number;
    distKm: number;
    bearingDeg: number;
    zone: string;
  } | null>(null);

  // Measuring ruler tool state
  const [pinnedMeasure, setPinnedMeasure] = useState<{
    coords: [number, number];
    distKm: number;
    bearingDeg: number;
  } | null>(null);
  const measureLineRef = useRef<L.Polyline | null>(null);

  // === Physical Radius Metrics Calculations ===
  const radiusMetrics = useMemo(() => {
    // 1. Max Ballistic Radius Envelope
    const maxBallisticMeters = computeMaxBallisticEnvelope(ballistic);
    const maxBallisticKm = maxBallisticMeters / 1000;

    // 2. Active Ballistic Trajectory & Multi-Projectile Shower
    const azimuth = ballistic.launchAzimuth ?? 90;
    const activeTraj = computeTrajectory3D(
      ballistic,
      azimuth,
      plume.windSpeed,
      plume.windDirection,
      ballistic.enableAirDrag
    );
    const activeLandingPos = activeTraj.landingPos;
    const activeDistanceMeters = activeLandingPos ? Math.hypot(activeLandingPos.x, activeLandingPos.z) : 0;
    const activeDistanceKm = activeDistanceMeters / 1000;

    // Multi-projectile ballistic shower (volcanic bombs & ejecta burst)
    const projectileCount = Math.max(1, Math.min(25, ballistic.projectileCount ?? 1));
    const dispersionMode = ballistic.dispersionMode ?? 'focused';
    const ballisticShower = computeBallisticShower(
      ballistic,
      azimuth,
      plume.windSpeed,
      plume.windDirection,
      projectileCount,
      dispersionMode
    );

    let showerMinDistKm = activeDistanceKm;
    let showerMaxDistKm = activeDistanceKm;
    let showerTotalEnergyMJ = 0;

    ballisticShower.forEach((bomb) => {
      const lp = bomb.traj.landingPos;
      const dKm = lp ? Math.hypot(lp.x, lp.z) / 1000 : 0;
      if (dKm < showerMinDistKm) showerMinDistKm = dKm;
      if (dKm > showerMaxDistKm) showerMaxDistKm = dKm;
      showerTotalEnergyMJ += bomb.traj.impactEnergy / 1e6;
    });

    // 3. Smoke Plume Umbrella Cloud Radius (Carey & Sparks 1986)
    // Vertical column spreads radially at Neutral Buoyancy Level (NBL)
    const umbrellaRadiusKm = Math.min(12, Math.max(0.8, (plume.columnHeight / 1000) * 0.52));
    const umbrellaRadiusMeters = umbrellaRadiusKm * 1000;

    // 4. Ash Plume Downwind Dispersal Reach & Zones (18-Hour Horizon ala abu.cikoytew.my.id)
    // Wind blows from plume.windDirection, so ash drifts toward (windDirection + 180)
    const driftAngleDeg = (plume.windDirection + 180) % 360;
    const maxPlumeReachKm = Math.min(
      380,
      Math.max(20, (plume.columnHeight / 1000) * 12 + (plume.windSpeed * 3.6) * 18)
    );
    const zone1ReachKm = maxPlumeReachKm * 0.18; // Near zone: heavy lapili & dense ash
    const zone2ReachKm = maxPlumeReachKm * 0.45; // Mid zone: moderate ashfall
    const zone3ReachKm = maxPlumeReachKm; // Far zone: fine ash & SO2 aerosols

    // 5. Impacted Landmarks Analysis
    const impactedList = REAL_LANDMARKS.filter((lm) => lm.id !== 'vent').map((lm) => {
      const inBallistic = lm.distKm <= maxBallisticKm;
      // Calculate angular difference between wind drift and landmark bearing
      const angleDiff = Math.abs(((lm.bearingDeg - driftAngleDeg + 180) % 360) - 180);
      const halfSpreadDeg = 28; // plume dispersion cone half-angle
      const inPlume = lm.distKm <= maxPlumeReachKm && angleDiff <= halfSpreadDeg;

      let plumeZoneName: string | null = null;
      if (inPlume) {
        if (lm.distKm <= zone1ReachKm) plumeZoneName = 'Zona I (Abu Pekat & Lapili)';
        else if (lm.distKm <= zone2ReachKm) plumeZoneName = 'Zona II (Abu Sedang)';
        else plumeZoneName = 'Zona III (Abu Halus)';
      }

      return {
        ...lm,
        inBallistic,
        inPlume,
        plumeZoneName,
      };
    });

    // 6. Impacted BMKG Official Areas Analysis (10 Wilayah Terdampak BMKG)
    const bmkgImpactedAreas = BMKG_AFFECTED_AREAS.filter((area) => area.id !== 'kaldera-krakatau').map((area) => {
      const inBallistic = area.distKm <= maxBallisticKm;
      const angleDiff = Math.abs(((area.bearingDeg - driftAngleDeg + 180) % 360) - 180);
      const halfSpreadDeg = 34; // BMKG plume dispersion cone corridor
      const inPlume = area.distKm <= maxPlumeReachKm && angleDiff <= halfSpreadDeg;

      const windSpeedKmh = plume.windSpeed * 3.6;
      const etaMinutes = inPlume && windSpeedKmh > 0 ? Math.round((area.distKm / windSpeedKmh) * 60) : null;
      const hasAshArrived = inPlume && etaMinutes !== null && simTimeMinutes >= etaMinutes;

      let plumeZoneName: string | null = null;
      if (inPlume) {
        if (area.distKm <= zone1ReachKm) plumeZoneName = 'Zona I (>50 mm, Lapili & Abu Pekat)';
        else if (area.distKm <= zone2ReachKm) plumeZoneName = 'Zona II (10–50 mm, Abu Lebat)';
        else if (area.distKm <= zone3ReachKm) plumeZoneName = 'Zona III (1–10 mm, Abu Sedang)';
        else plumeZoneName = 'Zona IV (0.1–1 mm, Abu Tipis)';
      }

      return {
        ...area,
        inBallistic,
        inPlume,
        etaMinutes,
        hasAshArrived,
        plumeZoneName,
      };
    });

    return {
      maxBallisticKm,
      maxBallisticMeters,
      activeDistanceKm,
      activeDistanceMeters,
      activeTraj,
      ballisticShower,
      projectileCount,
      dispersionMode,
      showerMinDistKm,
      showerMaxDistKm,
      showerTotalEnergyMJ,
      umbrellaRadiusKm,
      umbrellaRadiusMeters,
      driftAngleDeg,
      maxPlumeReachKm,
      zone1ReachKm,
      zone2ReachKm,
      zone3ReachKm,
      impactedList,
      bmkgImpactedAreas,
    };
  }, [ballistic, plume, simTimeMinutes]);

  // 1. Initialize Leaflet Map Instance
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: CRATER_COORDS,
      zoom: 12,
      minZoom: 8,
      maxZoom: 18,
      zoomControl: false,
    });

    // Add initial tile layer
    const initialConfig = TILE_LAYERS[selectedTile];
    const initialTile = L.tileLayer(initialConfig.url, {
      attribution: initialConfig.attribution,
      subdomains: initialConfig.subdomains || 'abc',
      maxZoom: 19,
    }).addTo(map);
    tileLayerRef.current = initialTile;

    // Create and add layer groups
    heatmapGroupRef.current = L.layerGroup().addTo(map);
    hazardGroupRef.current = L.layerGroup().addTo(map);
    so2GroupRef.current = L.layerGroup().addTo(map);
    plumeGroupRef.current = L.layerGroup().addTo(map);
    simulationGroupRef.current = L.layerGroup().addTo(map);
    ballisticGroupRef.current = L.layerGroup().addTo(map);
    regionalGroupRef.current = L.layerGroup().addTo(map);
    landmarkGroupRef.current = L.layerGroup().addTo(map);
    shippingGroupRef.current = L.layerGroup().addTo(map);
    bmkgGroupRef.current = L.layerGroup().addTo(map);
    ballisticAnimGroupRef.current = L.layerGroup().addTo(map);

    // Mouse move coordinate inspector
    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      const distMeters = map.distance(CRATER_COORDS, [lat, lng]);
      const distKm = distMeters / 1000;

      const dLon = ((lng - CRATER_COORDS[1]) * Math.PI) / 180;
      const lat1 = (CRATER_COORDS[0] * Math.PI) / 180;
      const lat2 = (lat * Math.PI) / 180;
      const y = Math.sin(dLon) * Math.cos(lat2);
      const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
      const bearingDeg = Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);

      let zone = 'Zona Terbuka Selat Sunda';
      if (distKm <= 1.2) zone = 'Kawah Aktif Anak Krakatau';
      else if (distKm <= 5.0) zone = 'KRB III (Zona Steril Bahaya Lontaran Bom 5 km)';
      else if (distKm <= 7.5) zone = 'KRB II (Bahaya Menengah Hujan Lapili 7.5 km)';
      else if (distKm <= 12.0) zone = 'KRB I (Bahaya Hujan Abu Vulkanik 12 km)';

      setCursorInfo({
        lat: Number(lat.toFixed(5)),
        lng: Number(lng.toFixed(5)),
        distKm: Number(distKm.toFixed(2)),
        bearingDeg,
        zone,
      });
    });

    // Map click for ruler or pin
    map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      const distMeters = map.distance(CRATER_COORDS, [lat, lng]);
      const distKm = distMeters / 1000;

      const dLon = ((lng - CRATER_COORDS[1]) * Math.PI) / 180;
      const lat1 = (CRATER_COORDS[0] * Math.PI) / 180;
      const lat2 = (lat * Math.PI) / 180;
      const y = Math.sin(dLon) * Math.cos(lat2);
      const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
      const bearingDeg = Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);

      setPinnedMeasure({
        coords: [lat, lng],
        distKm: Number(distKm.toFixed(2)),
        bearingDeg,
      });
    });

    mapInstanceRef.current = map;

    const resizeTimer = setTimeout(() => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.invalidateSize();
        } catch {
          // safe catch
        }
      }
    }, 150);

    return () => {
      clearTimeout(resizeTimer);
      try {
        map.remove();
      } catch {
        // safe catch
      }
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Basemap Tile Switching
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    const config = TILE_LAYERS[selectedTile];
    const newTile = L.tileLayer(config.url, {
      attribution: config.attribution,
      subdomains: config.subdomains || 'abc',
      maxZoom: 19,
    }).addTo(mapInstanceRef.current);
    tileLayerRef.current = newTile;
  }, [selectedTile]);

  // 3. Render KRB Hazard Zones (PVMBG Standards)
  useEffect(() => {
    const group = hazardGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!showKRBZones) return;

    // KRB III - 5.0 km (Steril Danger Zone)
    const krb3 = L.circle(CRATER_COORDS, {
      radius: 5000,
      color: '#ef4444',
      weight: 2,
      dashArray: '8, 6',
      fillColor: '#ef4444',
      fillOpacity: 0.12,
    });
    krb3.bindPopup(`
      <div class="p-2 text-xs font-sans text-zinc-100">
        <div class="font-bold text-red-400 text-sm mb-1">⚠️ KRB III: Zona Steril 5.0 km (PVMBG)</div>
        <p class="text-[11px] text-zinc-300">
          Zona bahaya ekstrem yang terancam lontaran batu pijar/bom vulkanik, awan panas, dan gas beracun. Harus dikosongkan total.
        </p>
      </div>
    `);
    group.addLayer(krb3);

    // KRB II - 7.5 km
    const krb2 = L.circle(CRATER_COORDS, {
      radius: 7500,
      color: '#f59e0b',
      weight: 1.2,
      dashArray: '5, 8',
      fillColor: '#f59e0b',
      fillOpacity: 0.05,
    });
    group.addLayer(krb2);

    // KRB I - 12.0 km
    const krb1 = L.circle(CRATER_COORDS, {
      radius: 12000,
      color: '#71717a',
      weight: 1,
      dashArray: '4, 10',
      fillColor: '#71717a',
      fillOpacity: 0.03,
    });
    group.addLayer(krb1);
  }, [showKRBZones]);

  // 4. Render Projectile / Volcanic Bomb Radii & Trajectory
  useEffect(() => {
    const group = ballisticGroupRef.current;
    if (!group) return;
    group.clearLayers();

    const { maxBallisticKm, maxBallisticMeters, activeDistanceKm, activeTraj } = radiusMetrics;

    // A. MAX BALLISTIC THROW ENVELOPE CIRCLE (360° Max Range)
    if (showMaxBallisticRadius) {
      const maxBombCircle = L.circle(CRATER_COORDS, {
        radius: maxBallisticMeters,
        color: '#f59e0b',
        weight: 2.4,
        dashArray: '6, 6',
        fillColor: '#f59e0b',
        fillOpacity: 0.14,
      });

      maxBombCircle.bindPopup(`
        <div class="p-2.5 text-xs font-sans text-zinc-100 min-w-[210px]">
          <div class="font-bold text-amber-400 text-sm flex items-center gap-1.5 border-b border-zinc-800 pb-1 mb-1.5">
            💣 Radius Maksimal Lontaran Bom
          </div>
          <div class="space-y-1 font-mono text-[11px] text-zinc-300">
            <div>Jangkauan Maks: <strong class="text-white">${maxBallisticKm.toFixed(2)} km</strong></div>
            <div>Kecepatan Awal (v₀): <strong class="text-white">${ballistic.initialVelocity} m/s</strong></div>
            <div>Diameter Bom: <strong class="text-white">${(ballistic.rockDiameter * 100).toFixed(0)} cm</strong></div>
            <div>Massa Batuan: <strong class="text-white">${((4 / 3) * Math.PI * Math.pow(ballistic.rockDiameter / 2, 3) * ballistic.rockDensity).toFixed(1)} kg</strong></div>
            <div>Hambatan Udara: <strong class="text-white">${ballistic.enableAirDrag ? 'Aktif (Cd ' + ballistic.dragCoefficient + ')' : 'Non-aktif (Vakum)'}</strong></div>
          </div>
        </div>
      `);
      group.addLayer(maxBombCircle);

      // Label Marker at the North perimeter of the Ballistic Circle
      if (showRadiusLabels) {
        const northEdgeCoord = getCoordAtBearingAndDist(CRATER_COORDS, 0, maxBallisticMeters);
        const ballisticBadgeIcon = L.divIcon({
          className: 'custom-radius-badge',
          html: `
            <div class="bg-amber-500/90 hover:bg-amber-500 text-black font-mono font-bold text-[10px] px-2 py-0.5 rounded-full border border-black shadow-2xl whitespace-nowrap cursor-pointer transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-1">
              <span>💣 Radius Maks Bom: ${maxBallisticKm.toFixed(2)} km</span>
            </div>
          `,
          iconSize: [160, 20],
          iconAnchor: [80, 10],
        });
        const badgeMarker = L.marker(northEdgeCoord, { icon: ballisticBadgeIcon });
        badgeMarker.bindPopup(`
          <div class="p-2 text-xs font-sans text-zinc-100">
            <strong class="text-amber-400">Radius Maksimal Lontaran Bom: ${maxBallisticKm.toFixed(2)} km</strong>
            <p class="text-[10px] text-zinc-300 mt-1">Batas terjauh yang dapat dicapai proyektil batu pijar pada sudut elevasi optimal.</p>
          </div>
        `);
        group.addLayer(badgeMarker);
      }
    }

    // B. ACTIVE BALLISTIC TRAJECTORY & TOUCHDOWN IMPACT POINT(S)
    if (showActiveTrajectory) {
      const shower = radiusMetrics.ballisticShower;
      const isShower = shower.length > 1;

      shower.forEach((bomb, bIdx) => {
        const pts = bomb.traj.points;
        if (!pts || pts.length < 2) return;

        const latLngs: [number, number][] = pts.map((p) => {
          const deltaLat = -p.z / 111139; // -Z is North, +Z is South
          const deltaLon = p.x / (111139 * Math.cos((CRATER_COORDS[0] * Math.PI) / 180));
          return [CRATER_COORDS[0] + deltaLat, CRATER_COORDS[1] + deltaLon];
        });

        const isPrimary = bIdx === 0;
        const color = isPrimary ? (isShower ? '#f97316' : '#ffffff') : bomb.color;

        // Trajectory Line
        const trajPolyline = L.polyline(latLngs, {
          color,
          weight: isPrimary ? 3.5 : 2,
          opacity: isPrimary ? 0.95 : 0.75,
          dashArray: isPrimary ? (isShower ? '5, 3' : '6, 4') : '4, 4',
        });
        group.addLayer(trajPolyline);

        // Impact Point & Physics
        const lastPt = pts[pts.length - 1];
        const impactCoords = latLngs[latLngs.length - 1];
        const flightTime = lastPt.t;
        const impactSpeed = lastPt.speed;
        const bombDistKm = Math.hypot(lastPt.x, lastPt.z) / 1000;
        const mass = bomb.rockMassKg;
        const energyMJ = (0.5 * mass * impactSpeed * impactSpeed) / 1e6;

        // Blast Ring
        const blastCircle = L.circle(impactCoords, {
          radius: Math.max(30, bomb.rockDiameter * (isPrimary ? 80 : 50)),
          color,
          weight: isPrimary ? 2 : 1.5,
          fillColor: color,
          fillOpacity: isPrimary ? 0.55 : 0.35,
        });
        group.addLayer(blastCircle);

        // Impact Marker Pin
        const impactIcon = L.divIcon({
          className: 'custom-impact-pin',
          html: `
            <div class="relative flex items-center justify-center cursor-pointer">
              <div class="w-5 h-5 rounded-full absolute" style="background-color: ${color}; opacity: 0.3;"></div>
              <div class="w-3.5 h-3.5 rounded-full border border-black absolute shadow-xl" style="background-color: ${color};"></div>
              ${
                showRadiusLabels && (isPrimary || !isShower || bIdx % 3 === 0 || bIdx === shower.length - 1)
                  ? `
                <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/95 text-white font-mono text-[9px] px-2 py-0.5 rounded border border-zinc-700 whitespace-nowrap shadow-lg pointer-events-none">
                  💥 ${bomb.label}: ${bombDistKm.toFixed(2)} km (${flightTime.toFixed(1)}s)
                </div>
              `
                  : ''
              }
            </div>
          `,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });

        const impactMarker = L.marker(impactCoords, { icon: impactIcon });
        impactMarker.bindPopup(`
          <div class="p-2.5 text-xs font-sans text-zinc-100 min-w-[220px]">
            <div class="font-bold text-white text-sm flex items-center gap-1.5 border-b border-zinc-800 pb-1.5 mb-1.5">
              <span style="color: ${color}">💥</span> ${isShower ? bomb.label : 'Titik Benturan Proyektil Aktif'}
            </div>
            <div class="space-y-1 font-mono text-[11px] text-zinc-300">
              <div>Jarak dari Kawah: <strong class="text-white">${bombDistKm.toFixed(2)} km</strong></div>
              <div>Diameter & Massa: <strong class="text-white">${(bomb.rockDiameter * 100).toFixed(0)} cm • ${mass.toFixed(1)} kg</strong></div>
              <div>Sudut Elevasi / Azimut: <strong class="text-white">${bomb.launchAngle}° / ${bomb.launchAzimuth}°</strong></div>
              <div>Waktu Terbang: <strong class="text-white">${flightTime.toFixed(1)} detik</strong></div>
              <div>Kecepatan Bentur: <strong class="text-white">${impactSpeed.toFixed(0)} m/s</strong> (${(impactSpeed * 3.6).toFixed(0)} km/j)</div>
              <div>Energi Benturan: <strong class="text-white">${energyMJ.toFixed(2)} MJ</strong></div>
              <div class="pt-1 mt-1 border-t border-zinc-800 text-[10px]">
                ${bombDistKm >= 5.0 ? '<span class="text-red-400 font-bold">⚠️ Menembus Radius Steril 5 km!</span>' : '<span class="text-emerald-400 font-semibold">✓ Di Dalam Kaldera Krakatau</span>'}
              </div>
            </div>
          </div>
        `);
        group.addLayer(impactMarker);
      });
    }
  }, [radiusMetrics, showMaxBallisticRadius, showActiveTrajectory, showRadiusLabels, ballistic]);

  // 5. Render Smoke & Ash Plume Radii (Umbrella Cloud & 3 Dispersion Bands)
  useEffect(() => {
    const group = plumeGroupRef.current;
    if (!group) return;
    group.clearLayers();

    const {
      umbrellaRadiusKm,
      umbrellaRadiusMeters,
      driftAngleDeg,
      maxPlumeReachKm,
      zone1ReachKm,
      zone2ReachKm,
      zone3ReachKm,
    } = radiusMetrics;

    const driftAngleRad = (driftAngleDeg * Math.PI) / 180;

    // A. UMBRELLA CLOUD RADIUS (Radial dispersal around crater)
    if (showUmbrellaCloud) {
      const umbrellaCircle = L.circle(CRATER_COORDS, {
        radius: umbrellaRadiusMeters,
        color: '#ffffff',
        weight: 2,
        dashArray: '4, 4',
        fillColor: '#e4e4e7',
        fillOpacity: 0.22,
      });

      umbrellaCircle.bindPopup(`
        <div class="p-2.5 text-xs font-sans text-zinc-100 min-w-[210px]">
          <div class="font-bold text-white text-sm flex items-center gap-1.5 border-b border-zinc-800 pb-1 mb-1.5">
            ☁️ Radius Payung Asap Vulkanik (Umbrella Cloud)
          </div>
          <div class="space-y-1 font-mono text-[11px] text-zinc-300">
            <div>Radius Payung: <strong class="text-white">${umbrellaRadiusKm.toFixed(2)} km</strong></div>
            <div>Tinggi Kolom Erupsi: <strong class="text-white">${plume.columnHeight} m</strong></div>
            <div>Neutral Buoyancy Level: <strong class="text-white">~${(plume.columnHeight * 0.75).toFixed(0)} m</strong></div>
            <p class="text-[10px] text-zinc-400 font-sans mt-1">
              Gas dan abu panas menyebar radial membentuk tudung jamur di troposfer sebelum dihanyutkan angin.
            </p>
          </div>
        </div>
      `);
      group.addLayer(umbrellaCircle);

      // Label at South-West edge of Umbrella Cloud
      if (showRadiusLabels) {
        const umbrellaBadgeCoord = getCoordAtBearingAndDist(CRATER_COORDS, 225, umbrellaRadiusMeters);
        const umbrellaBadgeIcon = L.divIcon({
          className: 'custom-radius-badge',
          html: `
            <div class="bg-zinc-800/95 hover:bg-zinc-800 text-white font-mono font-semibold text-[10px] px-2 py-0.5 rounded-full border border-zinc-600 shadow-xl whitespace-nowrap cursor-pointer transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-1">
              <span>☁️ Radius Payung Asap: ${umbrellaRadiusKm.toFixed(2)} km</span>
            </div>
          `,
          iconSize: [170, 20],
          iconAnchor: [85, 10],
        });
        const badgeMarker = L.marker(umbrellaBadgeCoord, { icon: umbrellaBadgeIcon });
        badgeMarker.bindPopup(`
          <div class="p-2 text-xs font-sans text-zinc-100">
            <strong>Radius Payung Asap Kawah: ${umbrellaRadiusKm.toFixed(2)} km</strong>
          </div>
        `);
        group.addLayer(badgeMarker);
      }
    }

    // B. ASH PLUME DISPERSION BANDS (Gaussian Plume Envelopes: Zone 1, 2, 3)
    if (showAshPlumeCones) {
      // Helper to generate coordinates of a cone section between rStartKm and rEndKm
      const makePlumeBandCoords = (rStartKm: number, rEndKm: number, widthRatio: number) => {
        const coords: [number, number][] = [];
        const steps = 14;

        // Start Arc (left to right)
        for (let i = 0; i <= steps; i++) {
          const frac = i / steps;
          const crossKm = (frac - 0.5) * 2 * (rStartKm * widthRatio);
          const angle = driftAngleRad + Math.atan2(crossKm, Math.max(0.1, rStartKm));
          const hyp = Math.hypot(rStartKm, crossKm);
          coords.push(getCoordAtBearingAndDist(CRATER_COORDS, (angle * 180) / Math.PI, hyp * 1000));
        }

        // End Arc (right to left)
        for (let i = steps; i >= 0; i--) {
          const frac = i / steps;
          const crossKm = (frac - 0.5) * 2 * (rEndKm * widthRatio);
          const angle = driftAngleRad + Math.atan2(crossKm, Math.max(0.1, rEndKm));
          const hyp = Math.hypot(rEndKm, crossKm);
          coords.push(getCoordAtBearingAndDist(CRATER_COORDS, (angle * 180) / Math.PI, hyp * 1000));
        }

        return coords;
      };

      // Zone 1: Dense Ashfall & Lapili (0 to zone1ReachKm)
      const zone1Coords = makePlumeBandCoords(0.2, zone1ReachKm, 0.42);
      const zone1Poly = L.polygon(zone1Coords, {
        color: '#ffffff',
        weight: 1.5,
        dashArray: '3, 3',
        fillColor: '#ffffff',
        fillOpacity: 0.35,
      });
      zone1Poly.bindPopup(`
        <div class="p-2 text-xs font-sans text-zinc-100">
          <div class="font-bold text-white text-sm mb-1">Zona I: Hujan Abu Sangat Lebat & Lapili</div>
          <div class="text-[11px] text-zinc-300 space-y-1 font-mono">
            <div>Radius Sebaran: <strong>0 – ${zone1ReachKm.toFixed(1)} km</strong></div>
            <div>Ketebalan Abu: <strong>> 5 cm (Bahaya Runtuh Struktur)</strong></div>
            <div>Ukuran Partikel: <strong>> 1 mm (Lapili & Batu Apung)</strong></div>
          </div>
        </div>
      `);
      group.addLayer(zone1Poly);

      // Zone 2: Moderate Ashfall (zone1ReachKm to zone2ReachKm)
      const zone2Coords = makePlumeBandCoords(zone1ReachKm, zone2ReachKm, 0.38);
      const zone2Poly = L.polygon(zone2Coords, {
        color: '#ffffff',
        weight: 1.2,
        dashArray: '4, 4',
        fillColor: '#ffffff',
        fillOpacity: 0.2,
      });
      zone2Poly.bindPopup(`
        <div class="p-2 text-xs font-sans text-zinc-100">
          <div class="font-bold text-white text-sm mb-1">Zona II: Hujan Abu Sedang - Tebal</div>
          <div class="text-[11px] text-zinc-300 space-y-1 font-mono">
            <div>Radius Sebaran: <strong>${zone1ReachKm.toFixed(1)} – ${zone2ReachKm.toFixed(1)} km</strong></div>
            <div>Ketebalan Abu: <strong>1 – 5 cm</strong></div>
            <div>Ukuran Partikel: <strong>0.25 – 1 mm</strong></div>
            <div>Dampak: <strong>Gangguan Maritim & Udara ALKI I</strong></div>
          </div>
        </div>
      `);
      group.addLayer(zone2Poly);

      // Zone 3: Fine Ash & Aerosols (zone2ReachKm to zone3ReachKm)
      const zone3Coords = makePlumeBandCoords(zone2ReachKm, zone3ReachKm, 0.34);
      const zone3Poly = L.polygon(zone3Coords, {
        color: '#ffffff',
        weight: 1,
        dashArray: '5, 5',
        fillColor: '#ffffff',
        fillOpacity: 0.1,
      });
      zone3Poly.bindPopup(`
        <div class="p-2 text-xs font-sans text-zinc-100">
          <div class="font-bold text-white text-sm mb-1">Zona III: Hujan Abu Halus & Aerosol SO₂</div>
          <div class="text-[11px] text-zinc-300 space-y-1 font-mono">
            <div>Radius Sebaran: <strong>${zone2ReachKm.toFixed(1)} – ${zone3ReachKm.toFixed(1)} km</strong></div>
            <div>Ketebalan Abu: <strong>< 1 cm (Kabut Asap Vulkanik)</strong></div>
            <div>Ukuran Partikel: <strong>< 0.063 mm (Debu Pernapasan)</strong></div>
            <div>Dampak: <strong>Pesisir Banten/Lampung & Navigasi Penerbangan</strong></div>
          </div>
        </div>
      `);
      group.addLayer(zone3Poly);

      // Centerline Axis Vector (Plume Drift Trajectory)
      const endPlumeCoord = getCoordAtBearingAndDist(CRATER_COORDS, driftAngleDeg, maxPlumeReachKm * 1000);
      const plumeAxis = L.polyline([CRATER_COORDS, endPlumeCoord], {
        color: '#ffffff',
        weight: 2,
        dashArray: '8, 6',
        opacity: 0.85,
      });
      group.addLayer(plumeAxis);

      // Badge at the Far Tip of the Smoke Plume
      if (showRadiusLabels) {
        const plumeTipBadgeIcon = L.divIcon({
          className: 'custom-radius-badge',
          html: `
            <div class="bg-zinc-900/95 hover:bg-zinc-800 text-white font-mono font-bold text-[10px] px-2.5 py-1 rounded-full border border-zinc-600 shadow-2xl whitespace-nowrap cursor-pointer transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <span>💨 Jangkauan Asap Terjauh: ${maxPlumeReachKm.toFixed(1)} km (${driftAngleDeg}°)</span>
            </div>
          `,
          iconSize: [230, 24],
          iconAnchor: [115, 12],
        });
        const tipMarker = L.marker(endPlumeCoord, { icon: plumeTipBadgeIcon });
        tipMarker.bindPopup(`
          <div class="p-2 text-xs font-sans text-zinc-100">
            <strong>Batas Radius Sebaran Asap Terjauh: ${maxPlumeReachKm.toFixed(1)} km</strong>
            <p class="text-[10px] text-zinc-300 mt-1">Arah Embusan Angin: ${driftAngleDeg}° (Kecepatan ${plume.windSpeed} m/s).</p>
          </div>
        `);
        group.addLayer(tipMarker);
      }

      // Real-Time Wind Vector Arrow (Meteorological Origin to Downwind Dispersion)
      if (showWindVector && plume.windSpeed > 0.1) {
        const windArrowLenKm = Math.min(16, Math.max(6, plume.windSpeed * 1.4));
        // Start slightly upwind of crater
        const windStart = getCoordAtBearingAndDist(CRATER_COORDS, (plume.windDirection + 360) % 360, windArrowLenKm * 400);
        // End downwind of crater
        const windEnd = getCoordAtBearingAndDist(CRATER_COORDS, (driftAngleDeg + 360) % 360, windArrowLenKm * 600);

        const windLine = L.polyline([windStart, windEnd], {
          color: '#38bdf8',
          weight: 3.5,
          opacity: 0.85,
          dashArray: '8, 5',
        });
        group.addLayer(windLine);

        const windBadgeHtml = `
          <div class="bg-sky-950/95 text-sky-200 border border-sky-400/60 px-2 py-0.5 rounded-full font-mono text-[9px] font-bold shadow-2xl flex items-center gap-1 whitespace-nowrap transform -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:bg-sky-900 hover:text-white transition-colors">
            <span>🌬️ Angin: ${plume.windSpeed} m/s (${plume.windDirection}° ➔ ${driftAngleDeg}°)</span>
          </div>
        `;
        const windBadgeIcon = L.divIcon({
          className: 'custom-wind-vector-badge',
          html: windBadgeHtml,
          iconSize: [190, 20],
          iconAnchor: [95, 10],
        });
        const windBadgeMarker = L.marker(windEnd, { icon: windBadgeIcon });
        windBadgeMarker.bindPopup(`
          <div class="p-2 text-xs font-sans text-zinc-100">
            <strong class="text-sky-300">Vektor Angin Real-Time Selat Sunda</strong>
            <div class="text-[11px] text-zinc-300 font-mono mt-1 space-y-0.5">
              <div>Kecepatan: <strong>${plume.windSpeed} m/s (${((plume.windSpeed * 3600) / 1000).toFixed(1)} km/j)</strong></div>
              <div>Arah Datang: <strong>${plume.windDirection}°</strong></div>
              <div>Arah Dorongan Abu: <strong>${driftAngleDeg}°</strong></div>
            </div>
          </div>
        `);
        group.addLayer(windBadgeMarker);
      }
    }
  }, [radiusMetrics, showUmbrellaCloud, showAshPlumeCones, showWindVector, showRadiusLabels, plume]);

  // 4.1 Ballistic Projectile Flight Time Calculation (Max duration across all shower projectiles)
  const totalFlightTime = useMemo(() => {
    const shower = radiusMetrics.ballisticShower;
    if (!shower || shower.length === 0) return 1;
    let maxT = 1;
    for (const b of shower) {
      if (b.traj.flightTime > maxT) maxT = b.traj.flightTime;
    }
    return Math.max(1, maxT);
  }, [radiusMetrics.ballisticShower]);

  // 4.2 Ballistic Projectile Flight Playback Loop
  useEffect(() => {
    if (!showBallisticAnim || !isBallisticPlaying) return;
    let lastTs = performance.now();
    let animId: number;

    const tick = (now: number) => {
      const dt = (now - lastTs) / 1000;
      lastTs = now;

      setBallisticTime((prev) => {
        const next = prev + dt * ballisticSpeed;
        if (next >= totalFlightTime) {
          setIsBallisticPlaying(false);
          return totalFlightTime;
        }
        return next;
      });

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [showBallisticAnim, isBallisticPlaying, ballisticSpeed, totalFlightTime]);

  // 4.3 Render Animated Ballistic Projectile(s) on Map
  useEffect(() => {
    const group = ballisticAnimGroupRef.current;
    if (!group || !mapInstanceRef.current) return;
    try {
      group.clearLayers();
    } catch {
      return;
    }

    if (!showBallisticAnim) return;

    const shower = radiusMetrics.ballisticShower;
    if (!shower || shower.length === 0) return;

    try {
      shower.forEach((bomb, bIdx) => {
        const pts = bomb.traj.points;
        if (!pts || pts.length < 2) return;

        let idx = pts.findIndex((p) => p.t >= ballisticTime);
        if (idx === -1) idx = pts.length - 1;
        const currentPt = pts[idx];

        // Traveled trajectory line
        const traveledLatLngs: [number, number][] = pts.slice(0, idx + 1).map((p) => {
          const deltaLat = -p.z / 111139;
          const deltaLon = p.x / (111139 * Math.cos((CRATER_COORDS[0] * Math.PI) / 180));
          return [CRATER_COORDS[0] + deltaLat, CRATER_COORDS[1] + deltaLon];
        });

        const isPrimary = bIdx === 0;
        const color = isPrimary ? (shower.length > 1 ? '#f97316' : '#ffffff') : bomb.color;

        if (traveledLatLngs.length >= 2) {
          const activeLine = L.polyline(traveledLatLngs, {
            color,
            weight: isPrimary ? 3.5 : 2,
            opacity: 0.85,
          });
          group.addLayer(activeLine);
        }

        const curDeltaLat = -currentPt.z / 111139;
        const curDeltaLon = currentPt.x / (111139 * Math.cos((CRATER_COORDS[0] * Math.PI) / 180));
        const currentCoord: [number, number] = [CRATER_COORDS[0] + curDeltaLat, CRATER_COORDS[1] + curDeltaLon];
        const isLanded = ballisticTime >= bomb.traj.flightTime;

        if (isLanded) {
          // Impact blast ring
          const impactRing = L.circle(currentCoord, {
            radius: Math.max(30, bomb.rockDiameter * (isPrimary ? 90 : 60)),
            color: '#ef4444',
            weight: 2,
            fillColor: color,
            fillOpacity: 0.45,
          });
          group.addLayer(impactRing);

          // Impact Crater Marker
          const craterIcon = L.divIcon({
            className: 'custom-anim-crater-marker',
            html: `
              <div class="relative flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <div class="w-4 h-4 rounded-full border border-white flex items-center justify-center text-[9px] shadow-lg" style="background-color: ${color};">
                  💥
                </div>
              </div>
            `,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          });
          const craterMarker = L.marker(currentCoord, { icon: craterIcon });
          group.addLayer(craterMarker);
        } else {
          // In-Flight Rock / Fireball Marker
          const rockIcon = L.divIcon({
            className: 'custom-anim-rock-marker',
            html: `
              <div class="relative flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                <div class="w-5 h-5 rounded-full border border-white shadow-xl flex items-center justify-center text-[10px]" style="background-color: ${color};">
                  🪨
                </div>
                ${
                  isPrimary || shower.length <= 4
                    ? `
                  <div class="absolute -top-6 bg-black/95 text-white font-mono text-[8px] px-1.5 py-0.5 rounded border border-zinc-700 whitespace-nowrap shadow-lg">
                    ${currentPt.y.toFixed(0)}m • ${currentPt.speed.toFixed(0)}m/s
                  </div>
                `
                    : ''
                }
              </div>
            `,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });

          const rockMarker = L.marker(currentCoord, { icon: rockIcon });
          group.addLayer(rockMarker);
        }
      });
    } catch {
      // safe catch
    }
  }, [showBallisticAnim, ballisticTime, radiusMetrics.ballisticShower, totalFlightTime]);

  // 5.1 Post-Eruption Ash Simulation Loop (Playback Timer: Up to 18 Hours / 1080 Minutes)
  useEffect(() => {
    if (!showSmokeAnim || !isSmokePlaying) return;
    const interval = setInterval(() => {
      setSimTimeMinutes((prev) => {
        const step = simSpeed * 0.5;
        const next = prev + step;
        if (next >= 1080) {
          setIsSmokePlaying(false);
          return 1080;
        }
        return Number(next.toFixed(1));
      });
    }, 100);
    return () => clearInterval(interval);
  }, [showSmokeAnim, isSmokePlaying, simSpeed]);

  // 5.2 Dynamic Post-Eruption Plume Evolution & Isochrones (Only when showSmokeAnim is true)
  useEffect(() => {
    const group = simulationGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!showSmokeAnim) return;

    const {
      driftAngleDeg,
      maxPlumeReachKm,
      zone1ReachKm,
      zone2ReachKm,
      zone3ReachKm,
      umbrellaRadiusKm,
    } = radiusMetrics;

    const driftAngleRad = (driftAngleDeg * Math.PI) / 180;
    const windSpeedKmh = plume.windSpeed * 3.6;

    // Current front reach at elapsed time t (minutes)
    const currentFrontKm = Math.min(
      maxPlumeReachKm,
      Math.max(0.3, windSpeedKmh * (simTimeMinutes / 60))
    );

    // Dynamic umbrella radius (develops within ~12 minutes)
    const currentUmbrellaKm = umbrellaRadiusKm * (1 - Math.exp(-simTimeMinutes / 12));

    // A. Dynamic Expanding Umbrella Cloud
    if (showUmbrellaCloud && currentUmbrellaKm > 0.1) {
      const dynamicUmbrella = L.circle(CRATER_COORDS, {
        radius: currentUmbrellaKm * 1000,
        color: '#ffffff',
        weight: 1.8,
        dashArray: '3, 3',
        fillColor: '#ffffff',
        fillOpacity: Math.min(0.35, 0.12 + (currentUmbrellaKm / umbrellaRadiusKm) * 0.2),
      });
      dynamicUmbrella.bindPopup(`
        <div class="p-2 text-xs font-sans text-zinc-100">
          <strong class="text-white">Payung Asap Vulkanik Dinamis</strong>
          <div class="text-[11px] text-zinc-300 font-mono mt-1">
            Radius Saat Ini: <strong>${currentUmbrellaKm.toFixed(2)} km</strong><br/>
            Waktu Pasca Erupsi: <strong>T + ${Math.floor(simTimeMinutes / 60)}j ${Math.round(simTimeMinutes % 60)}m</strong>
          </div>
        </div>
      `);
      group.addLayer(dynamicUmbrella);
    }

    // B. Dynamic Expanding Plume Body (Zones I, II, III up to currentFrontKm)
    if (showAshPlumeCones && currentFrontKm > 0.4) {
      const buildDynamicPlumeCoords = (rStartKm: number, rEndKm: number, widthRatio: number) => {
        const coords: [number, number][] = [];
        const steps = 14;
        for (let i = 0; i <= steps; i++) {
          const frac = i / steps;
          const crossKm = (frac - 0.5) * 2 * (rStartKm * widthRatio);
          const angle = driftAngleRad + Math.atan2(crossKm, Math.max(0.1, rStartKm));
          const hyp = Math.hypot(rStartKm, crossKm);
          coords.push(getCoordAtBearingAndDist(CRATER_COORDS, (angle * 180) / Math.PI, hyp * 1000));
        }
        for (let i = steps; i >= 0; i--) {
          const frac = i / steps;
          const crossKm = (frac - 0.5) * 2 * (rEndKm * widthRatio);
          const angle = driftAngleRad + Math.atan2(crossKm, Math.max(0.1, rEndKm));
          const hyp = Math.hypot(rEndKm, crossKm);
          coords.push(getCoordAtBearingAndDist(CRATER_COORDS, (angle * 180) / Math.PI, hyp * 1000));
        }
        return coords;
      };

      // Zone 1 Active Plume Segment
      const z1End = Math.min(currentFrontKm, zone1ReachKm);
      if (z1End > 0.2) {
        const z1Coords = buildDynamicPlumeCoords(0.2, z1End, 0.44);
        const z1Poly = L.polygon(z1Coords, {
          color: '#ffffff',
          weight: 2,
          fillColor: '#ffffff',
          fillOpacity: 0.35,
        });
        group.addLayer(z1Poly);
      }

      // Zone 2 Active Plume Segment
      if (currentFrontKm > zone1ReachKm) {
        const z2End = Math.min(currentFrontKm, zone2ReachKm);
        const z2Coords = buildDynamicPlumeCoords(zone1ReachKm, z2End, 0.40);
        const z2Poly = L.polygon(z2Coords, {
          color: '#ffffff',
          weight: 1.5,
          dashArray: '4, 4',
          fillColor: '#ffffff',
          fillOpacity: 0.22,
        });
        group.addLayer(z2Poly);
      }

      // Zone 3 Active Plume Segment
      if (currentFrontKm > zone2ReachKm) {
        const z3End = Math.min(currentFrontKm, maxPlumeReachKm);
        const z3Coords = buildDynamicPlumeCoords(zone2ReachKm, z3End, 0.36);
        const z3Poly = L.polygon(z3Coords, {
          color: '#ffffff',
          weight: 1.2,
          dashArray: '5, 5',
          fillColor: '#ffffff',
          fillOpacity: 0.12,
        });
        group.addLayer(z3Poly);
      }

      // Leading Edge Front Boundary Curve
      const frontArcCoords: [number, number][] = [];
      const arcSteps = 16;
      const frontWidth = currentFrontKm * 0.38;
      for (let i = 0; i <= arcSteps; i++) {
        const frac = i / arcSteps;
        const crossKm = (frac - 0.5) * 2 * frontWidth;
        const angle = driftAngleRad + Math.atan2(crossKm, Math.max(0.1, currentFrontKm));
        const hyp = Math.hypot(currentFrontKm, crossKm);
        frontArcCoords.push(getCoordAtBearingAndDist(CRATER_COORDS, (angle * 180) / Math.PI, hyp * 1000));
      }
      const frontArcLine = L.polyline(frontArcCoords, {
        color: '#ffffff',
        weight: 3.5,
        opacity: 0.95,
      });
      group.addLayer(frontArcLine);

      // Front Flag Marker
      const centerFrontCoord = getCoordAtBearingAndDist(CRATER_COORDS, driftAngleDeg, currentFrontKm * 1000);
      const hours = Math.floor(simTimeMinutes / 60);
      const mins = Math.floor(simTimeMinutes % 60);
      const timeStr = hours > 0 ? `T+${hours}j ${mins}m` : `T+${mins}m`;

      const frontBadgeIcon = L.divIcon({
        className: 'custom-sim-front-pin',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer transform -translate-x-1/2 -translate-y-1/2">
            <div class="w-5 h-5 rounded-full bg-white/20 absolute"></div>
            <div class="w-3.5 h-3.5 rounded-full bg-white border-2 border-black shadow-2xl"></div>
            <div class="absolute -top-7 bg-white text-black font-mono font-bold text-[9px] px-2 py-0.5 rounded-full shadow-2xl border border-black whitespace-nowrap">
              💨 Depan Abu: ${timeStr} (${currentFrontKm.toFixed(1)} km)
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      const frontMarker = L.marker(centerFrontCoord, { icon: frontBadgeIcon });
      frontMarker.bindPopup(`
        <div class="p-2 text-xs font-sans text-zinc-100 min-w-[200px]">
          <div class="font-bold text-white text-sm mb-1">Garis Terdepan Awan Abu Vulkanik</div>
          <div class="text-[11px] text-zinc-300 font-mono space-y-1">
            <div>Waktu Pasca Erupsi: <strong class="text-white">${timeStr}</strong></div>
            <div>Jangkauan dari Kawah: <strong class="text-white">${currentFrontKm.toFixed(1)} km</strong></div>
            <div>Kecepatan Hanyut: <strong class="text-white">${windSpeedKmh.toFixed(1)} km/j (${plume.windSpeed} m/s)</strong></div>
            <div>Arah Tiupan: <strong class="text-white">${driftAngleDeg}°</strong></div>
          </div>
        </div>
      `);
      group.addLayer(frontMarker);
    }

    // C. Dynamic Ash Particle Puffs (Awan Partikel Melayang)
    if (showAshPuffs && currentFrontKm > 0.8) {
      const numPuffs = Math.min(15, Math.max(5, Math.floor(currentFrontKm / 3.5)));
      for (let i = 1; i <= numPuffs; i++) {
        const frac = i / (numPuffs + 1);
        const distKm = currentFrontKm * frac;
        const lateralWobble = Math.sin(simTimeMinutes * 0.15 + i * 1.8) * (distKm * 0.14);
        const angle = driftAngleRad + Math.atan2(lateralWobble, Math.max(0.1, distKm));
        const hyp = Math.hypot(distKm, lateralWobble);
        const puffCoord = getCoordAtBearingAndDist(CRATER_COORDS, (angle * 180) / Math.PI, hyp * 1000);

        const puffRadius = Math.max(250, distKm * 130);
        const puffCircle = L.circle(puffCoord, {
          radius: puffRadius,
          color: '#ffffff',
          weight: 0.8,
          opacity: 0.5,
          fillColor: '#ffffff',
          fillOpacity: 0.15 + Math.sin(i * 1.5 + simTimeMinutes * 0.08) * 0.08,
        });
        group.addLayer(puffCircle);
      }
    }

    // D. Milestone Isochrones (Garis Kemajuan Abu Tiap Jam)
    if (showIsochrones) {
      const milestones = [
        { min: 15, label: 'T+15m', desc: '15 Menit' },
        { min: 30, label: 'T+30m', desc: '30 Menit (P. Sebesi/ALKI I)' },
        { min: 60, label: 'T+1h', desc: '1 Jam' },
        { min: 120, label: 'T+2h', desc: '2 Jam' },
        { min: 240, label: 'T+4h', desc: '4 Jam (Pesisir)' },
        { min: 360, label: 'T+6h', desc: '6 Jam' },
      ];

      milestones.forEach((m) => {
        const isoDistKm = Math.min(maxPlumeReachKm, windSpeedKmh * (m.min / 60));
        if (isoDistKm <= maxPlumeReachKm && isoDistKm >= 1.0) {
          const arcCoords: [number, number][] = [];
          const steps = 14;
          const arcWidth = isoDistKm * 0.38;

          for (let i = 0; i <= steps; i++) {
            const frac = i / steps;
            const crossKm = (frac - 0.5) * 2 * arcWidth;
            const angle = driftAngleRad + Math.atan2(crossKm, Math.max(0.1, isoDistKm));
            const hyp = Math.hypot(isoDistKm, crossKm);
            arcCoords.push(getCoordAtBearingAndDist(CRATER_COORDS, (angle * 180) / Math.PI, hyp * 1000));
          }

          const hasReached = simTimeMinutes >= m.min;

          const isoLine = L.polyline(arcCoords, {
            color: hasReached ? '#ffffff' : '#71717a',
            weight: hasReached ? 2 : 1.2,
            dashArray: hasReached ? '6, 3' : '3, 4',
            opacity: hasReached ? 0.9 : 0.45,
          });
          group.addLayer(isoLine);

          if (showRadiusLabels) {
            const centerArcCoord = getCoordAtBearingAndDist(CRATER_COORDS, driftAngleDeg, isoDistKm * 1000);
            const isoBadgeIcon = L.divIcon({
              className: 'custom-iso-badge',
              html: `
                <div class="px-1.5 py-0.2 rounded font-mono text-[8px] font-bold border shadow-lg whitespace-nowrap transform -translate-x-1/2 -translate-y-1/2 ${
                  hasReached
                    ? 'bg-zinc-800 text-white border-zinc-500'
                    : 'bg-zinc-950/80 text-zinc-500 border-zinc-800'
                }">
                  ${m.label} (${isoDistKm.toFixed(1)} km)
                </div>
              `,
              iconSize: [75, 16],
              iconAnchor: [37, 8],
            });
            const isoBadgeMarker = L.marker(centerArcCoord, { icon: isoBadgeIcon });
            group.addLayer(isoBadgeMarker);
          }
        }
      });
    }
  }, [simTimeMinutes, radiusMetrics, plume, showUmbrellaCloud, showAshPlumeCones, showAshPuffs, showIsochrones, showRadiusLabels]);

  // 6. Real Geographical Landmarks & Proximity Badges
  useEffect(() => {
    const group = landmarkGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!showLandmarks) return;

    const windSpeedKmh = plume.windSpeed * 3.6;
    const currentFrontKm = Math.min(
      radiusMetrics.maxPlumeReachKm,
      Math.max(0.3, windSpeedKmh * (simTimeMinutes / 60))
    );

    radiusMetrics.impactedList.forEach((lm) => {
      const isCrater = lm.type === 'crater';
      const isReachedNow = lm.inPlume && lm.distKm <= currentFrontKm;
      const etaMinutes = lm.inPlume ? (lm.distKm / windSpeedKmh) * 60 : null;

      const pinIcon = L.divIcon({
        className: 'custom-landmark-pin',
        html: `
          <div class="group relative flex items-center justify-center cursor-pointer">
            <div class="w-3.5 h-3.5 rounded-full ${
              lm.inBallistic
                ? 'bg-amber-400 border-2 border-black'
                : isReachedNow
                ? 'bg-red-500 border-2 border-white'
                : lm.inPlume
                ? 'bg-zinc-400 border-2 border-black'
                : 'bg-zinc-900 border-2 border-white'
            } shadow-xl hover:scale-125 transition-transform"></div>

            <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-black/90 text-white font-mono text-[9px] px-1.5 py-0.5 rounded border border-zinc-800 whitespace-nowrap shadow-md pointer-events-none flex items-center gap-1">
              <span>${lm.name}</span>
              ${isReachedNow ? '<span class="text-white font-bold">🚨 ABU</span>' : ''}
            </div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker(lm.coords, { icon: pinIcon });
      marker.bindPopup(`
        <div class="p-2.5 text-xs font-sans text-zinc-100 min-w-[220px]">
          <div class="flex items-center justify-between border-b border-zinc-800 pb-1 mb-1.5">
            <span class="font-bold text-white text-sm">${lm.name}</span>
            <span class="text-[10px] font-mono bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 text-zinc-300">
              ${lm.elevation}
            </span>
          </div>
          <p class="text-[11px] text-zinc-300 leading-relaxed mb-2">${lm.desc}</p>
          <div class="space-y-1 pt-1.5 border-t border-zinc-800 text-[10px] font-mono">
            <div class="flex justify-between text-zinc-400">
              <span>Jarak dari Kawah:</span>
              <strong class="text-white">${lm.distKm} km (${lm.bearingDeg}°)</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-zinc-400">Paparan Bom:</span>
              <span class="${lm.inBallistic ? 'text-amber-400 font-bold' : 'text-zinc-500'}">
                ${lm.inBallistic ? '⚠️ Masuk Radius Bom' : '✓ Di Luar Radius Bom'}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-zinc-400">Paparan Asap:</span>
              <span class="${lm.inPlume ? 'text-white font-bold' : 'text-zinc-500'}">
                ${lm.inPlume ? `⚠️ ${lm.plumeZoneName}` : '✓ Di Luar Konus Asap'}
              </span>
            </div>
            <div class="flex justify-between pt-1 border-t border-zinc-850">
              <span class="text-zinc-400">Status Simulasi T+${Math.round(simTimeMinutes)}m:</span>
              <span class="${isReachedNow ? 'text-white font-bold bg-zinc-800 px-1 rounded' : 'text-zinc-300'}">
                ${isReachedNow ? `🚨 Tertutup Abu (T+${Math.round(etaMinutes ?? 0)}m)` : (etaMinutes ? `⏳ ETA Abu: T+${Math.round(etaMinutes)}m` : '✓ Aman')}
              </span>
            </div>
          </div>
        </div>
      `);
      group.addLayer(marker);
    });

    // Dedicated Crater marker
    const craterIcon = L.divIcon({
      className: 'custom-crater-pin',
      html: `
        <div class="relative flex items-center justify-center cursor-pointer">
          <div class="w-8 h-8 rounded-full bg-white/25 animate-ping absolute"></div>
          <div class="w-6 h-6 rounded-full bg-white border-2 border-black shadow-2xl flex items-center justify-center text-xs font-bold text-black">
            🌋
          </div>
          <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-white text-black font-mono font-bold text-[9px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap">
            G. Anak Krakatau
          </div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    const craterMarker = L.marker(CRATER_COORDS, { icon: craterIcon });
    craterMarker.bindPopup(`
      <div class="p-2 text-xs font-sans text-zinc-100">
        <div class="font-bold text-white text-sm mb-1">🌋 Gunung Anak Krakatau</div>
        <p class="text-[11px] text-zinc-300">Pusat kawah erupsi aktif. Koordinat: 06°06'07"S 105°25'23"E.</p>
      </div>
    `);
    group.addLayer(craterMarker);
  }, [showLandmarks, radiusMetrics, simTimeMinutes, plume]);

  // 7. ALKI I Shipping Corridor
  useEffect(() => {
    const group = shippingGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!showShipping) return;

    const lane = L.polyline(ALKI_SHIPPING_LANE, {
      color: '#a1a1aa',
      weight: 2,
      dashArray: '8, 8',
      opacity: 0.7,
    });
    lane.bindPopup(`
      <div class="p-2 text-xs font-sans text-zinc-100">
        <div class="font-bold text-white text-sm flex items-center gap-1.5 mb-1">
          🚢 Alur Laut Kepulauan Indonesia (ALKI I)
        </div>
        <p class="text-[11px] text-zinc-300">
          Koridor pelayaran tanker & kargo internasional yang melintasi Selat Sunda.
        </p>
      </div>
    `);
    group.addLayer(lane);
  }, [showShipping]);

  // 8. BMKG Official SIGMET Polygon, Ash Fall Isopachs & Affected Areas Layer
  useEffect(() => {
    const group = bmkgGroupRef.current;
    if (!group) return;
    group.clearLayers();

    const activeScenario =
      BMKG_SIGMET_SCENARIOS.find((s) => s.id === activeBmkgScenarioId) || BMKG_SIGMET_SCENARIOS[0];

    // A. BMKG Official SIGMET Polygon (ICAO International Advisory)
    if (showBmkgSigmet && activeScenario.polygonCoords.length >= 3) {
      const sigmetPoly = L.polygon(activeScenario.polygonCoords, {
        color: activeScenario.vonaStatus === 'RED' ? '#ffffff' : '#e4e4e7',
        weight: 2.2,
        dashArray: '8, 6',
        fillColor: '#ffffff',
        fillOpacity: 0.10,
      });

      sigmetPoly.bindPopup(`
        <div class="p-3 text-xs font-sans text-zinc-100 min-w-[280px]">
          <div class="flex items-center justify-between border-b border-zinc-800 pb-1.5 mb-2">
            <span class="font-bold text-white text-sm">Poligon SIGMET BMKG Resmi</span>
            <span class="font-mono text-[10px] bg-zinc-800 text-white px-2 py-0.5 rounded font-bold border border-zinc-700">
              ${activeScenario.code}
            </span>
          </div>
          <h4 class="font-bold text-xs text-zinc-200 mb-1">${activeScenario.title}</h4>
          <p class="text-[11px] text-zinc-400 mb-2 leading-relaxed">${activeScenario.summary}</p>
          <div class="grid grid-cols-2 gap-1.5 text-[10px] font-mono bg-zinc-950 p-2 rounded-lg border border-zinc-850 mb-2">
            <div><span class="text-zinc-500">Lapisan Udara:</span> <strong class="text-white">${activeScenario.flightLevelRange}</strong></div>
            <div><span class="text-zinc-500">Arah Hanyut:</span> <strong class="text-white">${activeScenario.driftDirectionDeg}° (${activeScenario.driftCardinal})</strong></div>
            <div><span class="text-zinc-500">Kecepatan:</span> <strong class="text-white">${activeScenario.windSpeedMs} m/s (${activeScenario.windSpeedKnots} kt)</strong></div>
            <div><span class="text-zinc-500">Status VONA:</span> <strong class="text-white">${activeScenario.vonaStatus}</strong></div>
          </div>
          <p class="text-[10px] text-zinc-400 italic">Berdasarkan buletin resmi BMKG Stasiun Meteorologi Radin Inten II & VAAC Darwin.</p>
        </div>
      `);

      group.addLayer(sigmetPoly);

      // Centroid label badge for SIGMET
      if (showRadiusLabels) {
        const lats = activeScenario.polygonCoords.map((c) => c[0]);
        const lngs = activeScenario.polygonCoords.map((c) => c[1]);
        const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
        const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

        const sigmetBadgeIcon = L.divIcon({
          className: 'custom-sigmet-badge',
          html: `
            <div class="px-2 py-0.5 rounded font-mono text-[9px] font-bold bg-black/95 text-white border border-zinc-600 shadow-2xl whitespace-nowrap transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 cursor-pointer">
              <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              <span>POLIGON SIGMET: ${activeScenario.code} (${activeScenario.flightLevelRange})</span>
            </div>
          `,
          iconSize: [220, 20],
          iconAnchor: [110, 10],
        });
        const sigmetMarker = L.marker([centerLat, centerLng], { icon: sigmetBadgeIcon });
        sigmetMarker.on('click', () => setIsBmkgModalOpen(true));
        group.addLayer(sigmetMarker);
      }
    }

    // B. BMKG Ash Fall Deposition Contours (Peta Kontur Isopach Hujan Abu BMKG)
    if (showBmkgAshDeposit) {
      const driftAngle = activeScenario.driftDirectionDeg;
      const reachKm = radiusMetrics.maxPlumeReachKm;

      // Isopach 1: > 50 mm (Endapan Sangat Tebal & Lapili - Radius Proksimal)
      const iso1Downwind = Math.max(5.5, reachKm * 0.16);
      const iso1Coords = generateIsopachContour(CRATER_COORDS, driftAngle, iso1Downwind, 2.0, 4.2);
      const iso1Poly = L.polygon(iso1Coords, {
        color: '#ffffff',
        weight: 2,
        fillColor: '#ffffff',
        fillOpacity: 0.32,
      });
      iso1Poly.bindPopup(`
        <div class="p-3 text-xs font-sans text-zinc-100 min-w-[270px]">
          <div class="flex items-center justify-between border-b border-zinc-800 pb-1.5 mb-2">
            <span class="font-bold text-white text-sm">Kontur Hujan Abu BMKG: &gt; 50 mm</span>
            <span class="font-mono text-[9px] bg-white text-black font-bold px-2 py-0.5 rounded">Zona Sangat Tebal</span>
          </div>
          <p class="text-[11px] text-zinc-300 leading-relaxed mb-2">
            Endapan piroklastik jatuhan sangat tebal, lapili kasar (2–64 mm), dan debu pekat. Beban struktural atap &gt; 60 kg/m² berisiko meruntuhkan bangunan non-beton.
          </p>
          <div class="grid grid-cols-2 gap-1.5 text-[10px] font-mono bg-zinc-950 p-2 rounded-lg border border-zinc-850">
            <div><span class="text-zinc-500">Jangkauan Koridor:</span> <strong class="text-white">0 – ${iso1Downwind.toFixed(1)} km</strong></div>
            <div><span class="text-zinc-500">Ukuran Butir:</span> <strong class="text-white">&gt; 1 mm (Lapili)</strong></div>
            <div><span class="text-zinc-500">Kualitas Udara:</span> <strong class="text-white">BERBAHAYA (PM10 &gt; 500)</strong></div>
            <div><span class="text-zinc-500">Visibilitas:</span> <strong class="text-white">&lt; 50 meter</strong></div>
          </div>
        </div>
      `);
      group.addLayer(iso1Poly);

      // Isopach 2: 10 – 50 mm (Hujan Abu Lebat - Radius Medial)
      const iso2Downwind = Math.max(14, reachKm * 0.44);
      const iso2Coords = generateIsopachContour(CRATER_COORDS, driftAngle, iso2Downwind, 3.2, 9.5);
      const iso2Poly = L.polygon(iso2Coords, {
        color: '#ffffff',
        weight: 1.5,
        dashArray: '4, 4',
        fillColor: '#ffffff',
        fillOpacity: 0.20,
      });
      iso2Poly.bindPopup(`
        <div class="p-3 text-xs font-sans text-zinc-100 min-w-[270px]">
          <div class="flex items-center justify-between border-b border-zinc-800 pb-1.5 mb-2">
            <span class="font-bold text-white text-sm">Kontur Hujan Abu BMKG: 10 – 50 mm</span>
            <span class="font-mono text-[9px] bg-zinc-200 text-black font-bold px-2 py-0.5 rounded">Zona Lebat</span>
          </div>
          <p class="text-[11px] text-zinc-300 leading-relaxed mb-2">
            Hujan abu vulkanik lebat. Mengakibatkan gangguan total jalur pelayaran ALKI I, penutupan pelabuhan/bandara, dan kontaminasi sumber air terbuka warga.
          </p>
          <div class="grid grid-cols-2 gap-1.5 text-[10px] font-mono bg-zinc-950 p-2 rounded-lg border border-zinc-850">
            <div><span class="text-zinc-500">Jangkauan Koridor:</span> <strong class="text-white">${iso1Downwind.toFixed(1)} – ${iso2Downwind.toFixed(1)} km</strong></div>
            <div><span class="text-zinc-500">Ukuran Butir:</span> <strong class="text-white">0.25 – 1 mm</strong></div>
            <div><span class="text-zinc-500">Kualitas Udara:</span> <strong class="text-white">SANGAT TIDAK SEHAT</strong></div>
            <div><span class="text-zinc-500">Dampak Maritim:</span> <strong class="text-white">Penutupan Alur Pelayaran</strong></div>
          </div>
        </div>
      `);
      group.addLayer(iso2Poly);

      // Isopach 3: 1 – 10 mm (Hujan Abu Sedang - Radius Distal Awal)
      const iso3Downwind = Math.max(28, reachKm * 0.74);
      const iso3Coords = generateIsopachContour(CRATER_COORDS, driftAngle, iso3Downwind, 4.0, 17.5);
      const iso3Poly = L.polygon(iso3Coords, {
        color: '#ffffff',
        weight: 1.2,
        dashArray: '6, 4',
        fillColor: '#ffffff',
        fillOpacity: 0.12,
      });
      iso3Poly.bindPopup(`
        <div class="p-3 text-xs font-sans text-zinc-100 min-w-[270px]">
          <div class="flex items-center justify-between border-b border-zinc-800 pb-1.5 mb-2">
            <span class="font-bold text-white text-sm">Kontur Hujan Abu BMKG: 1 – 10 mm</span>
            <span class="font-mono text-[9px] bg-zinc-700 text-white font-bold px-2 py-0.5 rounded">Zona Sedang</span>
          </div>
          <p class="text-[11px] text-zinc-300 leading-relaxed mb-2">
            Hujan abu vulkanik sedang menutupi atap rumah, jalan raya, dan tanaman perkebunan di pesisir Banten/Lampung. Jalanan menjadi licin saat basah.
          </p>
          <div class="grid grid-cols-2 gap-1.5 text-[10px] font-mono bg-zinc-950 p-2 rounded-lg border border-zinc-850">
            <div><span class="text-zinc-500">Jangkauan Koridor:</span> <strong class="text-white">${iso2Downwind.toFixed(1)} – ${iso3Downwind.toFixed(1)} km</strong></div>
            <div><span class="text-zinc-500">Protokol Warga:</span> <strong class="text-white">Wajib Masker N95/Medis</strong></div>
            <div><span class="text-zinc-500">Kualitas Udara:</span> <strong class="text-white">TIDAK SEHAT (AQI 150-200)</strong></div>
            <div><span class="text-zinc-500">Risiko Listrik:</span> <strong class="text-white">Short-circuit Trafo Gardu</strong></div>
          </div>
        </div>
      `);
      group.addLayer(iso3Poly);

      // Isopach 4: 0.1 – 1 mm (Hujan Abu Tipis / Debu Melayang & Aerosol SO₂)
      const iso4Downwind = reachKm;
      const iso4Coords = generateIsopachContour(CRATER_COORDS, driftAngle, iso4Downwind, 5.0, 25.0);
      const iso4Poly = L.polygon(iso4Coords, {
        color: '#a1a1aa',
        weight: 1.0,
        dashArray: '8, 6',
        fillColor: '#a1a1aa',
        fillOpacity: 0.05,
      });
      iso4Poly.bindPopup(`
        <div class="p-3 text-xs font-sans text-zinc-100 min-w-[270px]">
          <div class="flex items-center justify-between border-b border-zinc-800 pb-1.5 mb-2">
            <span class="font-bold text-white text-sm">Kontur Hujan Abu BMKG: 0.1 – 1 mm</span>
            <span class="font-mono text-[9px] bg-zinc-850 text-zinc-300 font-bold px-2 py-0.5 rounded">Zona Abu Tipis</span>
          </div>
          <p class="text-[11px] text-zinc-300 leading-relaxed mb-2">
            Kabut debu vulkanik halus & aerosol SO₂ melayang di udara. Menyebabkan iritasi selaput mata, batuk, dan peringatan keselamatan bagi jalur penerbangan internasional (W45).
          </p>
          <div class="grid grid-cols-2 gap-1.5 text-[10px] font-mono bg-zinc-950 p-2 rounded-lg border border-zinc-850">
            <div><span class="text-zinc-500">Jangkauan Koridor:</span> <strong class="text-white">${iso3Downwind.toFixed(1)} – ${iso4Downwind.toFixed(1)} km</strong></div>
            <div><span class="text-zinc-500">Dampak Udara:</span> <strong class="text-white">NOTAM / ASHTAM BMKG</strong></div>
            <div><span class="text-zinc-500">Kualitas Udara:</span> <strong class="text-white">SENSITIF - SEDANG</strong></div>
            <div><span class="text-zinc-500">Iritasi:</span> <strong class="text-white">Mata Pedih & Bau Belerang</strong></div>
          </div>
        </div>
      `);
      group.addLayer(iso4Poly);

      // Isopach Boundary Labels along drift centerline
      if (showRadiusLabels) {
        const isoBadges = [
          { distKm: iso1Downwind, text: '🌋 Isopach > 50 mm' },
          { distKm: iso2Downwind, text: '⚠️ Isopach 10–50 mm' },
          { distKm: iso3Downwind, text: '💨 Isopach 1–10 mm' },
          { distKm: iso4Downwind, text: '☁️ Isopach 0.1–1 mm (Ujung Abu)' },
        ];

        isoBadges.forEach((b) => {
          const coord = getCoordAtBearingAndDist(CRATER_COORDS, driftAngle, b.distKm * 1000);
          const badgeIcon = L.divIcon({
            className: 'custom-isopach-label',
            html: `
              <div class="px-2 py-0.5 rounded-full font-mono text-[9px] font-bold bg-zinc-950/90 text-zinc-200 border border-zinc-700 shadow-xl whitespace-nowrap transform -translate-x-1/2 -translate-y-1/2">
                ${b.text} (${b.distKm.toFixed(0)} km)
              </div>
            `,
            iconSize: [160, 18],
            iconAnchor: [80, 9],
          });
          const marker = L.marker(coord, { icon: badgeIcon });
          group.addLayer(marker);
        });
      }
    }

    // C. BMKG Official Affected Areas Pins (10 Daerah Terdampak BMKG dengan Status Dinamis)
    if (showBmkgAffectedAreas) {
      BMKG_AFFECTED_AREAS.forEach((area) => {
        // Skip airspace/crater center duplicate
        if (area.id === 'ruang-udara-w45' || area.id === 'kaldera-krakatau') return;

        const driftAngle = activeScenario.driftDirectionDeg;
        const angleDiff = Math.abs(((area.bearingDeg - driftAngle + 180) % 360) - 180);
        const inPlumeCorridor = angleDiff <= 34 && area.distKm <= radiusMetrics.maxPlumeReachKm;

        const windSpeedKmh = activeScenario.windSpeedMs * 3.6;
        const etaMinutes = inPlumeCorridor ? Math.round((area.distKm / Math.max(1, windSpeedKmh)) * 60) : null;
        const hasAshArrived = inPlumeCorridor && etaMinutes !== null && simTimeMinutes >= etaMinutes;

        const areaPinIcon = L.divIcon({
          className: 'custom-bmkg-area-pin',
          html: `
            <div class="group relative flex items-center justify-center cursor-pointer">
              <div class="w-5 h-5 rounded-full flex items-center justify-center ${
                hasAshArrived
                  ? 'bg-red-500 text-white border-2 border-white animate-bounce shadow-red-500/50'
                  : inPlumeCorridor
                  ? 'bg-amber-400 text-black border-2 border-white animate-pulse'
                  : 'bg-zinc-900 text-zinc-300 border border-zinc-600'
              } shadow-2xl hover:scale-125 transition-transform">
                <span class="text-[9px] font-bold">
                  ${hasAshArrived ? '🚨' : inPlumeCorridor ? '⏳' : '🏛️'}
                </span>
              </div>
              <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/95 text-zinc-100 font-mono text-[9px] px-1.5 py-0.5 rounded border ${
                hasAshArrived
                  ? 'border-red-500 text-white font-bold'
                  : inPlumeCorridor
                  ? 'border-amber-400 text-amber-200'
                  : 'border-zinc-700'
              } whitespace-nowrap shadow-xl pointer-events-none flex items-center gap-1">
                <span>${area.name.split(' (')[0]}</span>
                <span class="text-[8px] opacity-75">
                  ${
                    hasAshArrived
                      ? 'TERPAPAR'
                      : inPlumeCorridor && etaMinutes !== null
                      ? `ETA ${etaMinutes}m`
                      : 'AMAN'
                  }
                </span>
              </div>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const areaMarker = L.marker(area.coords, { icon: areaPinIcon });
        areaMarker.bindPopup(`
          <div class="p-3 text-xs font-sans text-zinc-100 min-w-[280px]">
            <div class="flex items-center justify-between border-b border-zinc-800 pb-1.5 mb-2">
              <div>
                <span class="font-bold text-white text-sm block">${area.name}</span>
                <span class="text-[10px] text-zinc-400 font-mono">${area.regency}</span>
              </div>
              <span class="px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                hasAshArrived
                  ? 'bg-red-950 text-red-300 border border-red-700 animate-pulse'
                  : inPlumeCorridor
                  ? 'bg-amber-950 text-amber-300 border border-amber-700'
                  : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
              }">
                ${hasAshArrived ? '🚨 AKTIF TERPAPAR' : inPlumeCorridor ? '⏳ DALAM KORIDOR' : '✓ DI LUAR JALUR'}
              </span>
            </div>

            <div class="grid grid-cols-2 gap-1.5 text-[10px] font-mono bg-zinc-950 p-2 rounded-lg border border-zinc-850 mb-2">
              <div><span class="text-zinc-500">Jarak Kawah:</span> <strong class="text-white">${area.distKm} km (${area.bearingCardinal})</strong></div>
              <div><span class="text-zinc-500">Populasi Warga:</span> <strong class="text-white">${area.population}</strong></div>
              <div><span class="text-zinc-500">Estimasi Tiba:</span> <strong class="text-white">${
                etaMinutes !== null ? `T+${etaMinutes} Menit` : 'N/A (Aman)'
              }</strong></div>
              <div><span class="text-zinc-500">Kualitas Udara:</span> <strong class="text-white">${area.ashFallProfile.airQualityIndex}</strong></div>
            </div>

            <div class="space-y-1 mb-2 text-[11px] bg-zinc-900/80 p-2 rounded-lg border border-zinc-800">
              <div class="flex items-center justify-between">
                <span class="text-zinc-400 font-bold text-[10px]">Potensi Tebal Endapan Abu:</span>
                <span class="text-white font-mono font-bold text-[10px]">${area.ashFallProfile.potentialThickness}</span>
              </div>
              <p class="text-zinc-300 text-[10px] leading-tight">
                ${
                  hasAshArrived
                    ? `Status T+${Math.round(simTimeMinutes)}m: Hujan abu telah turun di wilayah ini. Segera gunakan masker N95.`
                    : inPlumeCorridor
                    ? `Perkiraan abu tiba dalam ${Math.max(0, (etaMinutes ?? 0) - Math.round(simTimeMinutes))} menit ke depan.`
                    : `Saat ini aman dari sebaran abu utama skenario BMKG (${activeScenario.title.split('(')[0]}).`
                }
              </p>
            </div>

            <div class="border-t border-zinc-800 pt-1.5 space-y-1">
              <span class="text-zinc-400 font-bold block text-[10px]">Aset Kritis & Infrastruktur:</span>
              <div class="flex flex-wrap gap-1">
                ${area.criticalAssets.map((a) => `<span class="bg-zinc-900 border border-zinc-800 text-zinc-300 px-1.5 py-0.2 rounded text-[9px]">${a}</span>`).join('')}
              </div>
            </div>
          </div>
        `);

        group.addLayer(areaMarker);
      });
    }
  }, [showBmkgSigmet, showBmkgAshDeposit, showBmkgAffectedAreas, activeBmkgScenarioId, showRadiusLabels, radiusMetrics, simTimeMinutes]);

  // 8. Interactive Population Density & Coastal Hazard Heatmap Overlay
  useEffect(() => {
    const group = heatmapGroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!showHazardHeatmap) return;

    COASTAL_HAZARD_NODES.forEach((node) => {
      const evaluated = evaluateNodePlumeImpact(node, plume);

      let score = 0;
      let labelMode = '';
      if (heatmapMode === 'composite') {
        score = evaluated.compositeRiskScore;
        labelMode = 'Risiko Dampak Abu';
      } else if (heatmapMode === 'population') {
        score = Math.min(100, Math.round((node.populationDensity / 3500) * 100));
        labelMode = 'Kepadatan Penduduk';
      } else {
        score = node.coastalVulnerabilityIndex;
        labelMode = 'Bahaya Elevasi Pesisir';
      }

      // Color Ramp
      let color = '#10b981'; // Emerald
      let strokeColor = '#059669';
      let riskLabel = 'RENDAH';
      let badgeBg = 'bg-emerald-500 text-white';
      if (score >= 75) {
        color = '#ef4444'; // Red
        strokeColor = '#b91c1c';
        riskLabel = 'KRITIS';
        badgeBg = 'bg-red-500 text-white';
      } else if (score >= 50) {
        color = '#f97316'; // Orange
        strokeColor = '#c2410c';
        riskLabel = 'TINGGI';
        badgeBg = 'bg-orange-500 text-black font-extrabold';
      } else if (score >= 25) {
        color = '#eab308'; // Amber
        strokeColor = '#a16207';
        riskLabel = 'SEDANG';
        badgeBg = 'bg-amber-400 text-black font-extrabold';
      }

      // Multi-layer concentric heat circles for smooth heat spot appearance
      const baseRadiusMeters = 3200 + score * 35;

      // Outer Heat Aura
      const outerRing = L.circle(node.coords, {
        radius: baseRadiusMeters * 1.5,
        color: color,
        weight: 0,
        fillColor: color,
        fillOpacity: 0.10 * heatmapOpacity,
        interactive: false,
      });
      group.addLayer(outerRing);

      // Mid Heat Ring
      const midRing = L.circle(node.coords, {
        radius: baseRadiusMeters * 0.9,
        color: color,
        weight: 0,
        fillColor: color,
        fillOpacity: 0.25 * heatmapOpacity,
        interactive: false,
      });
      group.addLayer(midRing);

      // Core Heat Ring
      const coreRing = L.circle(node.coords, {
        radius: baseRadiusMeters * 0.45,
        color: strokeColor,
        weight: 1.5,
        opacity: 0.75 * heatmapOpacity,
        fillColor: color,
        fillOpacity: 0.55 * heatmapOpacity,
      });
      group.addLayer(coreRing);

      // Center Interactive Node Badge
      const isPlumeThreat = evaluated.inPlumeCone;
      const nodeHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          ${isPlumeThreat ? '<div class="absolute w-8 h-8 rounded-full bg-red-500/40 animate-ping"></div>' : ''}
          <div class="w-5 h-5 rounded-full border-2 border-white shadow-2xl flex items-center justify-center text-[10px] text-white font-bold" style="background-color: ${color};">
            ${heatmapMode === 'population' ? '👥' : heatmapMode === 'coastal' ? '🌊' : (isPlumeThreat ? '⚠️' : '🛡️')}
          </div>
          <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-zinc-950/95 text-white font-mono text-[8.5px] px-2 py-0.5 rounded-full border border-zinc-700 shadow-2xl pointer-events-none group-hover:scale-110 transition-transform flex items-center gap-1 z-10">
            <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${color};"></span>
            <span>${node.name.split(' (')[0]}</span>
            <span class="text-zinc-400">(${score})</span>
          </div>
        </div>
      `;

      const divIcon = L.divIcon({
        className: 'custom-hazard-heat-node',
        html: nodeHtml,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker(node.coords, { icon: divIcon });
      marker.bindPopup(`
        <div class="p-3 text-xs font-sans text-zinc-100 min-w-[280px] max-w-sm">
          <div class="flex items-start justify-between border-b border-zinc-800 pb-2 mb-2">
            <div>
              <div class="font-bold text-white text-sm">${node.name}</div>
              <div class="text-[10.5px] text-zinc-400">${node.subdistrict}, ${node.regency}</div>
            </div>
            <span class="px-2 py-0.5 rounded text-[9.5px] font-bold font-mono shadow ${badgeBg}">
              ${riskLabel} (${score}/100)
            </span>
          </div>

          <div class="grid grid-cols-2 gap-2 text-[10px] font-mono bg-zinc-950 p-2 rounded-xl border border-zinc-850 mb-2">
            <div>
              <span class="text-zinc-500 block">Kepadatan Penduduk:</span>
              <strong class="text-white">${node.populationDensity} jiwa/km²</strong>
              <span class="text-zinc-400 text-[9px] block">Total: ${node.populationTotal.toLocaleString('id-ID')} jiwa</span>
            </div>
            <div>
              <span class="text-zinc-500 block">Elevasi Pantai:</span>
              <strong class="text-white">${node.coastalElevationM} mdpl</strong>
              <span class="text-zinc-400 text-[9px] block">Jarak laut: ${node.shorelineDistanceM}m</span>
            </div>
            <div>
              <span class="text-zinc-500 block">Indeks Kerentanan Pesisir:</span>
              <strong class="text-amber-400">${node.coastalVulnerabilityIndex} / 100</strong>
            </div>
            <div>
              <span class="text-zinc-500 block">Runup Tsunami 2018:</span>
              <strong class="text-red-400">${node.tsunami2018RunupM} meter</strong>
            </div>
          </div>

          <div class="p-2 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1 text-[10px] mb-2">
            <div class="font-semibold text-zinc-200 flex items-center justify-between">
              <span>Paparan Awan Abu Vulkanik:</span>
              <span class="${isPlumeThreat ? 'text-red-400 font-bold' : 'text-emerald-400'}">
                ${isPlumeThreat ? '⚠️ TERPAPAR ANGIN AKTIF' : '✓ Aman dari Jalur Angin'}
              </span>
            </div>
            ${isPlumeThreat ? `
              <div class="flex justify-between font-mono text-zinc-300">
                <span>Estimasi Tebal Isopach:</span>
                <strong class="text-amber-300">${evaluated.isopachThicknessMm} mm</strong>
              </div>
              <div class="flex justify-between font-mono text-zinc-300">
                <span>Waktu Tiba Abu (ETA):</span>
                <strong class="text-white">± ${evaluated.etaMinutes} menit</strong>
              </div>
              <div class="flex justify-between font-mono text-zinc-300">
                <span>Konsentrasi Partikel:</span>
                <strong class="text-white">${evaluated.ashConcentrationMgM3} mg/m³</strong>
              </div>
            ` : `
              <div class="text-[9px] text-zinc-400 italic">
                Arah angin saat ini meniup ke ${radiusMetrics.driftAngleDeg}°, menjauhi kawasan ini.
              </div>
            `}
          </div>

          <div class="text-[9.5px] text-zinc-300 leading-relaxed bg-amber-950/20 p-2 rounded-lg border border-amber-500/20 mb-2">
            <strong class="text-amber-300 block mb-0.5">Rekomendasi Penanganan Bencana:</strong>
            ${evaluated.recommendedAction}
          </div>

          <div class="flex items-center justify-between pt-1 border-t border-zinc-800 text-[9px] text-zinc-400 font-mono">
            <span>Kapasitas Evakuasi: <strong class="text-white">${node.evacuationCapacity}</strong></span>
            <span>Jarak Kawah: <strong class="text-white">${node.distKm.toFixed(1)} km</strong></span>
          </div>
        </div>
      `);

      group.addLayer(marker);
    });
  }, [showHazardHeatmap, heatmapMode, heatmapOpacity, plume, radiusMetrics]);

  // 9. Sulfur Dioxide (SO2) Gas Satellite Plume Layer (Sentinel-5P TROPOMI style)
  useEffect(() => {
    const group = so2GroupRef.current;
    if (!group) return;
    group.clearLayers();

    if (!showSo2Layer) return;

    const { driftAngleDeg, maxPlumeReachKm } = radiusMetrics;
    const driftAngleRad = (driftAngleDeg * Math.PI) / 180;

    // Gas SO2 travels ~25% farther than heavy ash particles and fans wider
    const so2MaxReachKm = Math.min(420, maxPlumeReachKm * 1.25);
    const currentSo2ReachKm = showSmokeAnim
      ? Math.min(so2MaxReachKm, Math.max(1.0, (plume.windSpeed * 3.6) * (simTimeMinutes / 60) * 1.12))
      : so2MaxReachKm;

    if (currentSo2ReachKm < 0.6) return;

    const buildConeCoords = (rStartKm: number, rEndKm: number, widthRatio: number) => {
      const coords: [number, number][] = [];
      const steps = 14;
      for (let i = 0; i <= steps; i++) {
        const frac = i / steps;
        const crossKm = (frac - 0.5) * 2 * (rStartKm * widthRatio);
        const angle = driftAngleRad + Math.atan2(crossKm, Math.max(0.1, rStartKm));
        const hyp = Math.hypot(rStartKm, crossKm);
        coords.push(getCoordAtBearingAndDist(CRATER_COORDS, (angle * 180) / Math.PI, hyp * 1000));
      }
      for (let i = steps; i >= 0; i--) {
        const frac = i / steps;
        const crossKm = (frac - 0.5) * 2 * (rEndKm * widthRatio);
        const angle = driftAngleRad + Math.atan2(crossKm, Math.max(0.1, rEndKm));
        const hyp = Math.hypot(rEndKm, crossKm);
        coords.push(getCoordAtBearingAndDist(CRATER_COORDS, (angle * 180) / Math.PI, hyp * 1000));
      }
      return coords;
    };

    // Outer contour: Low SO2 (> 5 Dobson Units, DU) - Indigo/Violet
    const outerCoords = buildConeCoords(0.4, currentSo2ReachKm, 0.44);
    const outerPoly = L.polygon(outerCoords, {
      color: '#818cf8',
      weight: 1.2,
      dashArray: '4, 4',
      fillColor: '#6366f1',
      fillOpacity: 0.14,
    });
    outerPoly.bindPopup(`
      <div class="p-2.5 text-xs font-sans text-zinc-100 min-w-[240px]">
        <div class="flex items-center justify-between border-b border-zinc-800 pb-1 mb-1.5">
          <span class="font-bold text-indigo-300 text-sm">Awan Gas SO₂ (> 5 DU)</span>
          <span class="text-[9px] font-mono bg-indigo-950 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-700">TROPOMI Advisory</span>
        </div>
        <div class="text-[11px] text-zinc-300 space-y-1">
          <div>Sebaran gas sulfur dioksida halus melayang di atmosfer.</div>
          <div class="font-mono text-[10px] text-zinc-400">Jangkauan: ${currentSo2ReachKm.toFixed(1)} km | Koridor: ${driftAngleDeg}°</div>
          <div class="text-[10px] text-zinc-400">Peringatan ICAO / VAAC Darwin bagi koridor jelajah udara.</div>
        </div>
      </div>
    `);
    group.addLayer(outerPoly);

    // Mid contour: Moderate SO2 (> 20 DU) - Fuchsia
    const midReach = currentSo2ReachKm * 0.62;
    if (midReach > 1.8) {
      const midCoords = buildConeCoords(0.4, midReach, 0.35);
      const midPoly = L.polygon(midCoords, {
        color: '#c026d3',
        weight: 1.5,
        fillColor: '#d946ef',
        fillOpacity: 0.22,
      });
      midPoly.bindPopup(`
        <div class="p-2.5 text-xs font-sans text-zinc-100 min-w-[240px]">
          <div class="flex items-center justify-between border-b border-zinc-800 pb-1 mb-1.5">
            <span class="font-bold text-fuchsia-300 text-sm">Konsentrasi Gas SO₂ Sedang (> 20 DU)</span>
            <span class="text-[9px] font-mono bg-fuchsia-950 text-fuchsia-300 px-1.5 py-0.5 rounded border border-fuchsia-700">Iritasi Pernafasan</span>
          </div>
          <div class="text-[11px] text-zinc-300 space-y-1">
            <div>Tercium bau belerang menyengat, iritasi pada mata dan saluran pernapasan.</div>
            <div class="font-mono text-[10px] text-zinc-400">Jangkauan: ${midReach.toFixed(1)} km</div>
          </div>
        </div>
      `);
      group.addLayer(midPoly);
    }

    // Core zone: High SO2 (> 50 DU) - Magenta/Rose
    const coreReach = currentSo2ReachKm * 0.30;
    if (coreReach > 1.0) {
      const coreCoords = buildConeCoords(0.3, coreReach, 0.25);
      const corePoly = L.polygon(coreCoords, {
        color: '#f43f5e',
        weight: 1.8,
        fillColor: '#e11d48',
        fillOpacity: 0.35,
      });
      corePoly.bindPopup(`
        <div class="p-2.5 text-xs font-sans text-zinc-100 min-w-[240px]">
          <div class="flex items-center justify-between border-b border-zinc-800 pb-1 mb-1.5">
            <span class="font-bold text-rose-300 text-sm">Konsentrasi Gas SO₂ Sangat Pekat (> 50 DU)</span>
            <span class="text-[9px] font-mono bg-rose-950 text-rose-300 px-1.5 py-0.5 rounded border border-rose-700">Bahaya Toksik</span>
          </div>
          <div class="text-[11px] text-zinc-300 space-y-1">
            <div>Zona dekat kawah dengan emisi sulfur dioksida primer tinggi (~1.200 ton/hari).</div>
            <div class="font-mono text-[10px] text-zinc-400">Jangkauan: ${coreReach.toFixed(1)} km</div>
          </div>
        </div>
      `);
      group.addLayer(corePoly);
    }
  }, [showSo2Layer, radiusMetrics, plume, simTimeMinutes, showSmokeAnim]);

  // 10. Regional Infrastructure & Strategic Assets Layer (Airports, Ports, Cities)
  useEffect(() => {
    const group = regionalGroupRef.current;
    if (!group) return;
    group.clearLayers();

    const forecastHours = Math.max(0, Math.round(simTimeMinutes / 60));

    REGIONAL_INFRASTRUCTURES.forEach((infra) => {
      const evalResult = evaluateInfrastructureImpact(infra, plume, forecastHours, selectedFlightLevel);

      let pinColor = '#10b981'; // green (Aman)
      let borderCol = '#059669';
      const statusEmoji = infra.type === 'airport' ? '✈️' : infra.type === 'seaport' ? '⚓' : '🏙️';

      if (evalResult.threatLevel === 'KRITIS') {
        pinColor = '#ef4444';
        borderCol = '#b91c1c';
      } else if (evalResult.threatLevel === 'WASPADA') {
        pinColor = '#f59e0b';
        borderCol = '#d97706';
      }

      const isSelected = selectedLocationId === infra.id;

      const html = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          ${evalResult.threatLevel === 'KRITIS' ? '<div class="absolute w-7 h-7 rounded-full bg-red-500/50 animate-ping"></div>' : ''}
          <div class="w-6 h-6 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-[11px] text-white font-bold transition-transform group-hover:scale-125 ${isSelected ? 'ring-2 ring-amber-400 scale-125' : ''}" style="background-color: ${pinColor}; border-color: ${borderCol};">
            ${statusEmoji}
          </div>
          <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-zinc-950/95 text-white font-mono text-[8.5px] px-1.5 py-0.5 rounded border border-zinc-700 shadow-xl pointer-events-none flex items-center gap-1">
            <span>${infra.code ? infra.code : infra.name.split(' ')[0]}</span>
            <span class="text-[7.5px] px-1 py-0.2 rounded font-bold ${
              evalResult.threatLevel === 'KRITIS' ? 'bg-red-900 text-red-200' :
              evalResult.threatLevel === 'WASPADA' ? 'bg-amber-900 text-amber-200' : 'bg-emerald-900 text-emerald-200'
            }">
              ${evalResult.threatLevel === 'KRITIS' ? 'TERDAMPAK' : evalResult.threatLevel === 'WASPADA' ? 'WASPADA' : 'AMAN'}
            </span>
          </div>
        </div>
      `;

      const markerIcon = L.divIcon({
        className: 'custom-regional-infra-pin',
        html,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker(infra.coords, { icon: markerIcon });
      marker.bindPopup(`
        <div class="p-3 text-xs font-sans text-zinc-100 min-w-[280px]">
          <div class="flex items-center justify-between border-b border-zinc-800 pb-1.5 mb-2">
            <div>
              <div class="font-bold text-white text-sm flex items-center gap-1">
                <span>${statusEmoji}</span>
                <span>${infra.name}</span>
                ${infra.code ? `<span class="font-mono text-zinc-400 text-xs">(${infra.code})</span>` : ''}
              </div>
              <div class="text-[10px] text-zinc-400 font-mono">${infra.province} • ${infra.bearingCardinal} (${infra.bearingDeg}°)</div>
            </div>
            <span class="px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
              evalResult.threatLevel === 'KRITIS'
                ? 'bg-red-950 text-red-300 border border-red-700 animate-pulse'
                : evalResult.threatLevel === 'WASPADA'
                ? 'bg-amber-950 text-amber-300 border border-amber-700'
                : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
            }">
              ${evalResult.threatLevel}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-1.5 text-[10px] font-mono bg-zinc-950 p-2 rounded-lg border border-zinc-850 mb-2">
            <div><span class="text-zinc-500">Jarak Kawah:</span> <strong class="text-white">${infra.distKm} km (${infra.bearingDeg}°)</strong></div>
            <div><span class="text-zinc-500">Estimasi Tiba (ETA):</span> <strong class="text-white">${evalResult.etaHours !== null ? `T+${evalResult.etaHours.toFixed(1)} Jam` : 'Di luar radius'}</strong></div>
            <div><span class="text-zinc-500">Endapan Abu:</span> <strong class="text-white">${evalResult.estimatedAshThicknessMm.toFixed(1)} mm</strong></div>
            <div><span class="text-zinc-500">Konsentrasi SO₂:</span> <strong class="text-white">${evalResult.estimatedSo2Du} DU</strong></div>
          </div>

          <div class="text-[10px] bg-zinc-900/80 p-2 rounded-lg border border-zinc-800 text-zinc-300 mb-2">
            <div class="text-[9.5px] text-zinc-400 font-mono mb-1">Status Operasional Koridor Udara (${selectedFlightLevel}):</div>
            <p class="font-semibold text-white leading-tight">${evalResult.flightSafetyStatus}</p>
          </div>

          <div class="text-[9.5px] text-amber-300/90 leading-relaxed bg-amber-950/20 p-2 rounded-lg border border-amber-500/20">
            <strong class="text-amber-200 block mb-0.5">Saran Mitigasi / NOTAM:</strong>
            ${evalResult.recommendation}
          </div>
        </div>
      `);

      marker.on('click', () => {
        setSelectedLocationId(infra.id);
      });

      group.addLayer(marker);
    });
  }, [plume, simTimeMinutes, selectedFlightLevel, selectedLocationId]);

  const handleApplyBmkgScenario = (scenario: BmkgSigmetScenario) => {
    setActiveBmkgScenarioId(scenario.id);
    // Wind blows from (driftDirectionDeg + 180) so that downwind plume drifts towards driftDirectionDeg
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
    // Fly camera smoothly along the scenario trajectory corridor
    if (mapInstanceRef.current && scenario.polygonCoords.length > 0) {
      const lats = scenario.polygonCoords.map((c) => c[0]);
      const lngs = scenario.polygonCoords.map((c) => c[1]);
      const centerLat = lats.reduce((a, b) => a + b, 0) / lats.length;
      const centerLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
      mapInstanceRef.current.flyTo(
        [(CRATER_COORDS[0] + centerLat) / 2, (CRATER_COORDS[1] + centerLng) / 2],
        10,
        { duration: 1.2 }
      );
    }
  };

  // Measuring ruler line
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (measureLineRef.current) {
      mapInstanceRef.current.removeLayer(measureLineRef.current);
      measureLineRef.current = null;
    }

    if (pinnedMeasure) {
      const line = L.polyline([CRATER_COORDS, pinnedMeasure.coords], {
        color: '#ffffff',
        weight: 2,
        dashArray: '4, 4',
      }).addTo(mapInstanceRef.current);
      measureLineRef.current = line;
    }
  }, [pinnedMeasure]);

  const handleFlyTo = (coords: [number, number], zoom: number) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo(coords, zoom, {
      duration: 1.5,
      easeLinearity: 0.25,
    });
  };

  // Real-time calculations for Post-Eruption Ash Simulation Dock
  const simHours = Math.floor(simTimeMinutes / 60);
  const simMins = Math.floor(simTimeMinutes % 60);
  const simTimeDisplay = simHours > 0 ? `T+${simHours}j ${simMins}m` : `T+${simMins}m`;
  const simWindKmh = (plume.windSpeed * 3.6).toFixed(1);
  const simCurrentFrontKm = Math.min(
    radiusMetrics.maxPlumeReachKm,
    Math.max(0.3, (plume.windSpeed * 3.6) * (simTimeMinutes / 60))
  ).toFixed(1);
  const simCurrentUmbrellaKm = (radiusMetrics.umbrellaRadiusKm * (1 - Math.exp(-simTimeMinutes / 12))).toFixed(2);
  const simCoveredLandmarks = radiusMetrics.impactedList.filter(
    (lm) => lm.inPlume && lm.distKm <= Number(simCurrentFrontKm)
  );

  // Real-time calculations for Ballistic Projectile Animation Dock
  const activeTrajPts = radiusMetrics.activeTraj.points || [];
  const currentBallisticPt = useMemo(() => {
    if (!activeTrajPts.length) return { t: 0, x: 0, y: 0, z: 0, speed: 0, vx: 0, vy: 0, vz: 0 };
    let idx = activeTrajPts.findIndex((p) => p.t >= ballisticTime);
    if (idx === -1) idx = activeTrajPts.length - 1;
    return activeTrajPts[idx];
  }, [activeTrajPts, ballisticTime]);

  const ballisticDistKm = Math.hypot(currentBallisticPt.x, currentBallisticPt.z) / 1000;
  const isBallisticLanded = ballisticTime >= totalFlightTime;
  const rockMassKg = (4 / 3) * Math.PI * Math.pow(ballistic.rockDiameter / 2, 3) * ballistic.rockDensity;
  const currentEnergyMJ = (0.5 * rockMassKg * Math.pow(currentBallisticPt.speed, 2)) / 1e6;

  return (
    <div className="relative w-full min-h-[720px] h-[780px] rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl bg-black select-none group font-sans">
      {/* Leaflet DOM Mounting Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* TOP BAR: Clean, Non-Colliding Navigation & Animation Control Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Basemap Switcher & Quick Camera Shortcuts */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 bg-black/92 backdrop-blur-xl px-2.5 py-1.5 rounded-xl border border-zinc-800 shadow-xl text-xs">
          <span className="text-[10px] font-mono text-zinc-400 font-semibold mr-1 hidden sm:inline">
            Peta:
          </span>
          {(['dark', 'satellite', 'osm', 'ocean'] as TileProvider[]).map((tileKey) => (
            <button
              key={tileKey}
              onClick={() => setSelectedTile(tileKey)}
              className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all border ${
                selectedTile === tileKey
                  ? 'bg-white text-black font-bold border-white shadow-sm'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {tileKey === 'satellite' && '🛰️ Satelit'}
              {tileKey === 'dark' && '🌑 Gelap'}
              {tileKey === 'osm' && '🗺️ Topo'}
              {tileKey === 'ocean' && '🌊 Batimetri'}
            </button>
          ))}

          <div className="h-3.5 w-px bg-zinc-800 mx-1 hidden sm:block" />

          <span className="text-[10px] font-mono text-zinc-400 font-semibold mr-0.5 hidden md:inline">
            Fokus:
          </span>
          <button
            onClick={() => handleFlyTo(CRATER_COORDS, 14)}
            className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-[10px] font-medium"
            title="Fokus ke Kawah Aktif Anak Krakatau"
          >
            🌋 Kawah
          </button>
          <button
            onClick={() => handleFlyTo([-6.102, 105.423], 12)}
            className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-[10px] font-medium"
            title="Fokus ke Kaldera Krakatau"
          >
            🏝️ Kaldera
          </button>
          <button
            onClick={() => handleFlyTo([-6.0, 105.7], 10)}
            className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-[10px] font-medium hidden sm:inline"
            title="Tinjauan Selat Sunda"
          >
            🌊 Selat Sunda
          </button>
          <button
            onClick={() => handleFlyTo([-6.05, 105.9], 11)}
            className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-[10px] font-medium hidden lg:inline"
            title="Pesisir Banten (Anyer)"
          >
            🏖️ Anyer
          </button>
        </div>

        {/* Right: Flight Level Selector, Quick Toggles & Drawer Action Buttons */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 bg-black/92 backdrop-blur-xl px-2.5 py-1.5 rounded-xl border border-zinc-800 shadow-xl text-xs">
          {/* Flight Level (FL) Corridor Selector ala abu.cikoytew.my.id */}
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
                title={`${FLIGHT_LEVEL_MAP[flKey].label} (${FLIGHT_LEVEL_MAP[flKey].altitudeFeet}) - ${FLIGHT_LEVEL_MAP[flKey].targetAircraft}`}
              >
                {flKey === 'ALL' ? 'Semua' : flKey}
              </button>
            ))}
          </div>

          <div className="h-3.5 w-px bg-zinc-800 mx-0.5 hidden sm:block" />

          {/* Quick Toggle: SO2 Gas Satellite Plume */}
          <button
            onClick={() => setShowSo2Layer(!showSo2Layer)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all border ${
              showSo2Layer
                ? 'bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-500/60 shadow-sm'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
            title="Overlay Citra Satelit Gas Belerang SO2 (Sentinel-5P TROPOMI Advisory)"
          >
            <span>🧪</span>
            <span className="hidden md:inline">Gas SO₂</span>
            <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-mono font-bold ${showSo2Layer ? 'bg-fuchsia-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
              {showSo2Layer ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Quick Toggle: Heatmap Bahaya */}
          <button
            id="toggle-hazard-heatmap-btn"
            onClick={() => setShowHazardHeatmap(!showHazardHeatmap)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all border ${
              showHazardHeatmap
                ? 'bg-amber-400 text-black border-amber-300 font-bold shadow-md shadow-amber-500/20'
                : 'bg-zinc-900 text-amber-300 border-amber-500/40 hover:bg-amber-950/40 hover:text-white'
            }`}
            title="Overlay interaktif heatmap kepadatan penduduk & bahaya pesisir Selat Sunda"
          >
            <span>👥</span>
            <span className="hidden md:inline">Heatmap Bahaya</span>
            <span className="md:hidden">Heatmap</span>
            <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${showHazardHeatmap ? 'bg-black text-amber-300' : 'bg-amber-500/20 text-amber-300'}`}>
              {showHazardHeatmap ? 'ON' : 'OFF'}
            </span>
          </button>

          <div className="h-3.5 w-px bg-zinc-800 mx-0.5" />

          {/* Primary Action Button: Cek Bandara & Kota (Direct trigger for RegionalImpactChecker) */}
          <button
            onClick={() => setActiveDrawer(activeDrawer === 'impact' ? null : 'impact')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all border ${
              activeDrawer === 'impact'
                ? 'bg-amber-400 text-black border-amber-300 shadow-md shadow-amber-500/20'
                : 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/50 hover:from-amber-500/30 hover:to-orange-500/30 hover:text-white'
            }`}
            title="Cek evaluasi dampak erupsi ke Bandara Internasional (CGK, TKG), Pelabuhan, dan Kota-kota di Banten & Lampung"
          >
            <span>📍</span>
            <span>Cek Bandara & Kota</span>
          </button>

          {/* Cuaca & Angin Quick Button */}
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
            <span className="font-mono text-white">{weather ? `${weather.wind.speedMs} m/s` : `${plume.windSpeed} m/s`}</span>
          </button>

          {/* Lapisan Peta & Kontrol Panel Button */}
          <button
            onClick={() => setActiveDrawer(activeDrawer && activeDrawer !== 'impact' && activeDrawer !== 'weather' ? null : 'layers')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-all border ${
              activeDrawer && activeDrawer !== 'impact' && activeDrawer !== 'weather'
                ? 'bg-zinc-200 text-black border-white font-bold'
                : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-white hover:border-zinc-700'
            }`}
            title="Buka panel kendali lapisan peta dan analisis radius"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lapisan</span>
          </button>
        </div>
      </div>

      {/* RIGHT SLIDE-OUT DRAWER: Clean, Single Container (No Collisions!) */}
      {activeDrawer && (
        <div className="absolute top-16 right-3 bottom-16 w-80 sm:w-96 bg-black/95 backdrop-blur-2xl border border-zinc-800 rounded-2xl shadow-2xl z-25 flex flex-col pointer-events-auto overflow-hidden animate-in fade-in slide-in-from-right-2 duration-200">
          {/* Drawer Navigation Tabs & Close */}
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
                📍 Cek Dampak Wilayah
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

          {/* Drawer Body with Vertical Scroll */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs text-zinc-200">
            {/* TAB 0: REGIONAL IMPACT CHECKER (Airports, Ports, Cities ala abu.cikoytew.my.id) */}
            {activeDrawer === 'impact' && (
              <div className="space-y-3">
                <RegionalImpactChecker
                  plume={plume}
                  forecastHours={Math.max(0, Math.round(simTimeMinutes / 60))}
                  selectedFlightLevel={selectedFlightLevel}
                  onFocusLocation={(coords, zoom) => {
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.flyTo(coords, zoom, { duration: 1.2 });
                    }
                  }}
                  selectedLocationId={selectedLocationId}
                />
              </div>
            )}

            {/* TAB 1: LAPISAN PETA */}
            {activeDrawer === 'layers' && (
              <div className="space-y-3">
                <div className="font-semibold text-zinc-200 flex items-center justify-between pb-1 border-b border-zinc-800">
                  <span className="font-bold text-white text-[12px] flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-white" />
                    Kendali Lapisan Visualisasi
                  </span>
                </div>

                <div className="space-y-2">
                  {/* SO2 Gas Satellite Plume Control */}
                  <div className="p-2.5 rounded-xl bg-fuchsia-950/20 border border-fuchsia-500/30 space-y-2 mb-2">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={showSo2Layer}
                          onChange={(e) => setShowSo2Layer(e.target.checked)}
                          className="rounded border-fuchsia-500/60 text-fuchsia-500 focus:ring-0"
                        />
                        <span className="text-fuchsia-300 font-bold flex items-center gap-1.5 text-xs">
                          <span>🧪</span>
                          <span>Citra Gas Belerang SO₂ (Sentinel-5P)</span>
                        </span>
                      </div>
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                        showSo2Layer ? 'bg-fuchsia-500/30 text-fuchsia-200' : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        {showSo2Layer ? 'AKTIF' : 'OFF'}
                      </span>
                    </label>
                    <div className="text-[10px] text-zinc-400">
                      Menampilkan konsentrasi gas sulfur dioksida (&gt;5, &gt;20, &gt;50 Dobson Units) pada koridor udara Selat Sunda.
                    </div>
                  </div>
                  {/* Heatmap Overlay Layer Controls */}
                  <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2 mb-2">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={showHazardHeatmap}
                          onChange={(e) => setShowHazardHeatmap(e.target.checked)}
                          className="rounded border-amber-500/60 text-amber-500 focus:ring-0"
                        />
                        <span className="text-amber-300 font-bold flex items-center gap-1.5 text-xs">
                          <span>👥</span>
                          <span>Heatmap Kepadatan & Bahaya Pesisir</span>
                        </span>
                      </div>
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                        showHazardHeatmap ? 'bg-amber-500/30 text-amber-200' : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        {showHazardHeatmap ? 'AKTIF' : 'OFF'}
                      </span>
                    </label>

                    {showHazardHeatmap && (
                      <div className="space-y-2 pt-1.5 border-t border-amber-500/20">
                        <div className="text-[9.5px] text-zinc-400">Mode Analisis Peta Panas:</div>
                        <div className="grid grid-cols-3 gap-1">
                          <button
                            type="button"
                            onClick={() => setHeatmapMode('composite')}
                            className={`px-1.5 py-1 rounded text-[10px] font-medium border transition-colors ${
                              heatmapMode === 'composite'
                                ? 'bg-amber-500 text-black border-amber-400 font-bold'
                                : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:text-white'
                            }`}
                          >
                            🌋 Dampak Abu
                          </button>
                          <button
                            type="button"
                            onClick={() => setHeatmapMode('population')}
                            className={`px-1.5 py-1 rounded text-[10px] font-medium border transition-colors ${
                              heatmapMode === 'population'
                                ? 'bg-amber-500 text-black border-amber-400 font-bold'
                                : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:text-white'
                            }`}
                          >
                            👥 Populasi
                          </button>
                          <button
                            type="button"
                            onClick={() => setHeatmapMode('coastal')}
                            className={`px-1.5 py-1 rounded text-[10px] font-medium border transition-colors ${
                              heatmapMode === 'coastal'
                                ? 'bg-amber-500 text-black border-amber-400 font-bold'
                                : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:text-white'
                            }`}
                          >
                            🌊 Pesisir
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-[9.5px] text-zinc-400 pt-0.5">
                          <span>Opasitas Lapisan:</span>
                          <span className="font-mono text-amber-300">{Math.round(heatmapOpacity * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.2"
                          max="1.0"
                          step="0.05"
                          value={heatmapOpacity}
                          onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
                          className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                        />
                      </div>
                    )}
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={showMaxBallisticRadius}
                      onChange={(e) => setShowMaxBallisticRadius(e.target.checked)}
                      className="rounded border-zinc-700 text-white focus:ring-0"
                    />
                    <span className="text-amber-400 font-medium">💣 Radius Maksimal Bom (Amplop Bahaya)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={showActiveTrajectory}
                      onChange={(e) => setShowActiveTrajectory(e.target.checked)}
                      className="rounded border-zinc-700 text-white focus:ring-0"
                    />
                    <span className="text-white font-medium">🎯 Trayektori Peluru & Titik Benturan</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={showUmbrellaCloud}
                      onChange={(e) => setShowUmbrellaCloud(e.target.checked)}
                      className="rounded border-zinc-700 text-white focus:ring-0"
                    />
                    <span>☁️ Radius Payung Asap (Umbrella Cloud)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={showAshPlumeCones}
                      onChange={(e) => setShowAshPlumeCones(e.target.checked)}
                      className="rounded border-zinc-700 text-white focus:ring-0"
                    />
                    <span>💨 Konus Sebaran 3 Zona (Gaussian Plume)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={showWindVector}
                      onChange={(e) => setShowWindVector(e.target.checked)}
                      className="rounded border-zinc-700 text-sky-400 focus:ring-0"
                    />
                    <span className="text-sky-300">🌬️ Vektor Angin Real-Time (Arah & Kecepatan)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={showKRBZones}
                      onChange={(e) => setShowKRBZones(e.target.checked)}
                      className="rounded border-zinc-700 text-white focus:ring-0"
                    />
                    <span>🛡️ Batas Steril 5 km (KRB III PVMBG)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={showRadiusLabels}
                      onChange={(e) => setShowRadiusLabels(e.target.checked)}
                      className="rounded border-zinc-700 text-white focus:ring-0"
                    />
                    <span>📏 Label Jarak & Metrik Fisika</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={showIsochrones}
                      onChange={(e) => setShowIsochrones(e.target.checked)}
                      className="rounded border-zinc-700 text-white focus:ring-0"
                    />
                    <span>⏱️ Isokron Garis Waktu Erupsi (15m, 30m, 1j)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={showLandmarks}
                      onChange={(e) => setShowLandmarks(e.target.checked)}
                      className="rounded border-zinc-700 text-white focus:ring-0"
                    />
                    <span>📍 Landmark Geografis (Pulau, Pesisir, Selat)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={showShipping}
                      onChange={(e) => setShowShipping(e.target.checked)}
                      className="rounded border-zinc-700 text-white focus:ring-0"
                    />
                    <span>🚢 Koridor Pelayaran Internasional (ALKI I)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={showBmkgAshDeposit}
                      onChange={(e) => setShowBmkgAshDeposit(e.target.checked)}
                      className="rounded border-zinc-700 text-white focus:ring-0"
                    />
                    <span className="text-zinc-300">🌋 Kontur Hujan Abu (Isopach BMKG)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                    <input
                      type="checkbox"
                      checked={showBmkgSigmet}
                      onChange={(e) => setShowBmkgSigmet(e.target.checked)}
                      className="rounded border-zinc-700 text-white focus:ring-0"
                    />
                    <span className="text-zinc-300">📋 Poligon SIGMET ICAO BMKG</span>
                  </label>
                </div>
              </div>
            )}

            {/* TAB 2: ANALISIS RADIUS BAHAYA ERUPSI */}
            {activeDrawer === 'analysis' && (
              <div className="space-y-3">
                <div className="font-semibold text-zinc-200 flex items-center justify-between pb-1 border-b border-zinc-800">
                  <span className="font-bold text-white text-[12px] flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-white" />
                    Analisis Radius Erupsi Real-Time
                  </span>
                </div>

                {/* Section A: Ballistic */}
                <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                      <span>💣</span> Radius Lemparan Bom {radiusMetrics.ballisticShower.length > 1 ? `(${radiusMetrics.ballisticShower.length} Bom)` : 'Vulkanik'}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                      {radiusMetrics.ballisticShower.length > 1 ? `${radiusMetrics.dispersionMode === 'radial' ? 'Pancaran Radial 360°' : 'Hujan Terarah'}` : 'RK4 Drag'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                      <span className="text-[9px] text-zinc-400 block font-sans">Jangkauan Amplop Maks</span>
                      <span className="text-base font-bold text-amber-400">
                        {radiusMetrics.maxBallisticKm.toFixed(2)} km
                      </span>
                    </div>
                    <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                      <span className="text-[9px] text-zinc-400 block font-sans">
                        {radiusMetrics.ballisticShower.length > 1 ? 'Rentang Benturan Shower' : 'Jarak Jatuh Aktif'}
                      </span>
                      <span className="text-base font-bold text-white">
                        {radiusMetrics.ballisticShower.length > 1
                          ? `${radiusMetrics.showerMinDistKm.toFixed(1)} – ${radiusMetrics.showerMaxDistKm.toFixed(1)} km`
                          : `${radiusMetrics.activeDistanceKm.toFixed(2)} km`}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-[10px] font-mono text-zinc-300 pt-1 border-t border-zinc-800">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Kecepatan Lontar (v₀):</span>
                      <strong className="text-white">{ballistic.initialVelocity} m/s ({(ballistic.initialVelocity * 3.6).toFixed(0)} km/j)</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Sudut Elevasi / Azimut:</span>
                      <strong className="text-white">{ballistic.launchAngle}° / {ballistic.launchAzimuth ?? 90}°</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Diameter & Massa Batu Utama:</span>
                      <strong className="text-white">{(ballistic.rockDiameter * 100).toFixed(0)} cm • {rockMassKg.toFixed(0)} kg</strong>
                    </div>
                    {radiusMetrics.ballisticShower.length > 1 && (
                      <div className="flex justify-between text-amber-300 pt-0.5 border-t border-zinc-800/60">
                        <span>Total Energi Kinetik Shower:</span>
                        <strong>{radiusMetrics.showerTotalEnergyMJ.toFixed(2)} MJ</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section B: Smoke & Ash */}
                <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-750 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <span>💨</span> Radius Sebaran Asap & Abu
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-bold">
                      Gaussian Plume
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                    <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                      <span className="text-[9px] text-zinc-400 block font-sans">Jangkauan Terjauh</span>
                      <span className="text-base font-bold text-white">
                        {radiusMetrics.maxPlumeReachKm.toFixed(1)} km
                      </span>
                    </div>
                    <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800">
                      <span className="text-[9px] text-zinc-400 block font-sans">Radius Payung Kawah</span>
                      <span className="text-base font-bold text-zinc-300">
                        {radiusMetrics.umbrellaRadiusKm.toFixed(2)} km
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-[10px] font-mono pt-1 border-t border-zinc-800">
                    <div className="flex justify-between items-center text-zinc-300">
                      <span className="text-zinc-400">Zona I (Pekat/Lapili):</span>
                      <strong>0 – {radiusMetrics.zone1ReachKm.toFixed(1)} km</strong>
                    </div>
                    <div className="flex justify-between items-center text-zinc-300">
                      <span className="text-zinc-400">Zona II (Sedang):</span>
                      <strong>{radiusMetrics.zone1ReachKm.toFixed(1)} – {radiusMetrics.zone2ReachKm.toFixed(1)} km</strong>
                    </div>
                    <div className="flex justify-between items-center text-zinc-300">
                      <span className="text-zinc-400">Zona III (Abu Halus):</span>
                      <strong>{radiusMetrics.zone2ReachKm.toFixed(1)} – {radiusMetrics.zone3ReachKm.toFixed(1)} km</strong>
                    </div>
                    <div className="flex justify-between pt-1 text-[9px] text-zinc-400 font-sans">
                      <span>Arah Angin:</span>
                      <strong className="text-white font-mono">{radiusMetrics.driftAngleDeg}° ({plume.windSpeed} m/s)</strong>
                    </div>
                  </div>
                </div>

                {/* Section C: Impacted Areas */}
                <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-1.5">
                  <span className="text-[10px] font-bold text-zinc-400 block uppercase font-mono">
                    Wilayah Terdampak Radius:
                  </span>
                  <div className="space-y-1 text-[10px] font-mono max-h-32 overflow-y-auto no-scrollbar">
                    {radiusMetrics.impactedList.map((lm) => (
                      <div
                        key={lm.id}
                        className="flex items-center justify-between p-1.5 rounded bg-zinc-950/70 border border-zinc-850"
                      >
                        <span className="text-zinc-200">{lm.name} ({lm.distKm} km)</span>
                        <div className="flex items-center gap-1">
                          {lm.inBallistic && (
                            <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded text-[9px]">
                              Bom
                            </span>
                          )}
                          {lm.inPlume && (
                            <span className="px-1.5 py-0.2 bg-zinc-800 text-white rounded text-[9px]">
                              Abu
                            </span>
                          )}
                          {!lm.inBallistic && !lm.inPlume && (
                            <span className="text-zinc-500 text-[9px]">Aman</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Modal Detail Telemetry Triggers */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800">
                  <button
                    onClick={() => setIsEjectaModalOpen(true)}
                    className="p-2 rounded-xl text-[10.5px] font-semibold flex items-center justify-center gap-1.5 transition-all border border-amber-500/40 bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 hover:text-white"
                    title="Buka Telemetri & Trayektori Lengkap Lemparan Bom"
                  >
                    <span>💥</span>
                    <span>Telemetri Bom</span>
                  </button>
                  <button
                    onClick={() => setIsDetailModalOpen(true)}
                    className="p-2 rounded-xl text-[10.5px] font-semibold flex items-center justify-center gap-1.5 transition-all border border-purple-500/40 bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 hover:text-white"
                    title="Buka Matriks Sebaran Abu & Estimasi Isopach"
                  >
                    <span>☁️</span>
                    <span>Matriks Abu</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: SKENARIO BMKG */}
            {activeDrawer === 'bmkg' && (
              <div className="space-y-3">
                <div className="font-semibold text-zinc-200 flex items-center justify-between pb-1 border-b border-zinc-800">
                  <span className="font-bold text-white text-[12px] flex items-center gap-1.5">
                    <Radio className="w-4 h-4 text-white" />
                    Pusat Data BMKG & SIGMET
                  </span>
                </div>

                {/* Scenario Select */}
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
                          <span className="text-[10px] opacity-75">{scenario.driftDirectionDeg}° / {scenario.windSpeedMs} m/s</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 10 Affected Areas ETA */}
                <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-1.5">
                  <span className="text-[10px] font-bold text-zinc-400 block uppercase font-mono">
                    10 Daerah Terdampak BMKG (ETA):
                  </span>
                  <div className="space-y-1 text-[10px] font-mono max-h-48 overflow-y-auto no-scrollbar">
                    {radiusMetrics.bmkgImpactedAreas.map((area) => (
                      <div
                        key={area.id}
                        className={`flex items-center justify-between p-1.5 rounded transition-colors ${
                          area.hasAshArrived
                            ? 'bg-red-950/40 text-white border border-red-900/50'
                            : area.inPlume
                            ? 'bg-amber-950/30 text-zinc-200 border border-amber-900/40'
                            : 'bg-zinc-950/50 text-zinc-400'
                        }`}
                      >
                        <button
                          onClick={() => handleFlyTo(area.coords, 12)}
                          className="hover:text-white underline truncate text-left font-sans text-[11px]"
                        >
                          {area.name.split(' (')[0]}
                        </button>
                        <span className="text-[9px] font-mono">
                          {area.hasAshArrived ? '🚨 Terpapar' : area.inPlume ? `⏳ ${area.etaMinutes}m` : '✓ Aman'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setIsBmkgModalOpen(true)}
                  className="w-full py-2 px-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg"
                >
                  <Radio className="w-3.5 h-3.5 text-black" />
                  <span>Buka Buletin Lengkap & Sounding</span>
                </button>

                <button
                  onClick={() => setIsDetailModalOpen(true)}
                  className="w-full py-1.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors border border-zinc-750"
                >
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Detail Panduan Mitigasi Abu</span>
                </button>
              </div>
            )}

            {/* TAB 4: CUACA & ANGIN REAL-TIME */}
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
                    className="w-full py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border border-zinc-750 shadow-sm"
                  >
                    <Wind className="w-3.5 h-3.5 text-sky-400" />
                    <span>Buka Sounding Lengkap & Prediksi 24 Jam</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOTTOM CENTER: Dedicated Animation & Simulation Dock (No Collisions!) */}
      <div className="absolute bottom-3 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-[94%] sm:max-w-4xl z-20 pointer-events-auto">
        <div className="bg-black/95 backdrop-blur-2xl border border-zinc-800 rounded-2xl p-3 shadow-2xl space-y-2.5 transition-all text-xs">
          {/* Top Bar of Dock: Animation Selection Tabs & Option Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-850 pb-2">
            {/* Left: Tab Switchers for Ballistic vs Smoke Animation */}
            <div className="flex items-center gap-1 bg-zinc-900/90 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => setActiveAnimTab('ballistic')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeAnimTab === 'ballistic'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>💣 Animasi Lemparan Batu</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                    showBallisticAnim ? 'bg-amber-400 text-black' : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {showBallisticAnim ? 'AKTIF' : 'NONAKTIF'}
                </span>
              </button>

              <button
                onClick={() => setActiveAnimTab('smoke')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeAnimTab === 'smoke'
                    ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>💨 Animasi Asap Vulkanik</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                    showSmokeAnim ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {showSmokeAnim ? 'AKTIF' : 'NONAKTIF'}
                </span>
              </button>
            </div>

            {/* Right: Quick On/Off toggle for currently active tab */}
            <div className="flex items-center gap-2">
              {activeAnimTab === 'ballistic' ? (
                <button
                  onClick={() => {
                    const next = !showBallisticAnim;
                    setShowBallisticAnim(next);
                    if (next) setIsBallisticPlaying(true);
                    else setIsBallisticPlaying(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all border shadow-sm ${
                    showBallisticAnim
                      ? 'bg-amber-500 hover:bg-amber-400 text-black border-amber-400'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-750'
                  }`}
                >
                  <span>{showBallisticAnim ? 'Matikan Animasi Batu' : 'Nyalakan Animasi Batu'}</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    const next = !showSmokeAnim;
                    setShowSmokeAnim(next);
                    if (next) setIsSmokePlaying(true);
                    else setIsSmokePlaying(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all border shadow-sm ${
                    showSmokeAnim
                      ? 'bg-white hover:bg-zinc-200 text-black border-white'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-750'
                  }`}
                >
                  <span>{showSmokeAnim ? 'Matikan Animasi Asap' : 'Nyalakan Animasi Asap'}</span>
                </button>
              )}
            </div>
          </div>

          {/* TAB 1 CONTENT: BALLISTIC ANIMATION CONTROLS */}
          {activeAnimTab === 'ballistic' && (
            <div className="space-y-2.5">
              {!showBallisticAnim ? (
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center space-y-2">
                  <p className="text-zinc-300 text-xs font-medium">
                    Opsi melihat animasi lemparan batu sedang nonaktif. Nyalakan untuk melihat pergerakan proyektil batu pijar secara dinamis di peta satelit.
                  </p>
                  <button
                    onClick={() => {
                      setShowBallisticAnim(true);
                      setIsBallisticPlaying(true);
                    }}
                    className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors shadow-md inline-flex items-center gap-1.5"
                  >
                    <span>Aktifkan Animasi Lemparan Batu</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Playback Controls & Speed */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setBallisticTime(0);
                          setIsBallisticPlaying(true);
                        }}
                        className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs transition-colors"
                        title="Ulangi dari Kawah (t = 0)"
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
                            <span>{isBallisticLanded ? 'Ulangi Lemparan' : 'Putar'}</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
                        {[0.5, 1.0, 2.0, 4.0].map((spd) => (
                          <button
                            key={spd}
                            onClick={() => setBallisticSpeed(spd)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                              ballisticSpeed === spd
                                ? 'bg-amber-500 text-black font-bold'
                                : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            {spd}x
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Quick Telemetry readout */}
                    <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-300">
                      <span>Waktu Terbang: <strong className="text-white">{ballisticTime.toFixed(1)}s</strong> / {totalFlightTime.toFixed(1)}s</span>
                      <span className="text-zinc-600">|</span>
                      <span>Tinggi Bom Utama: <strong className="text-amber-400">{currentBallisticPt.y.toFixed(0)}m</strong></span>
                      <span className="text-zinc-600">|</span>
                      {radiusMetrics.ballisticShower.length > 1 ? (
                        <span>Status: <strong className="text-orange-400">{radiusMetrics.ballisticShower.filter((b) => ballisticTime >= b.traj.flightTime).length} / {radiusMetrics.ballisticShower.length} Mendarat</strong></span>
                      ) : (
                        <span>Jarak: <strong className="text-white">{ballisticDistKm.toFixed(2)} km</strong></span>
                      )}
                    </div>
                  </div>

                  {/* Scrubber Range */}
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
                      <span>🌋 Kawah Krakatau (0s)</span>
                      <span className="text-white font-bold">
                        {radiusMetrics.ballisticShower.length > 1
                          ? `${radiusMetrics.ballisticShower.filter((b) => ballisticTime >= b.traj.flightTime).length} proyektil telah membentur permukaan`
                          : (isBallisticLanded ? '💥 Benturan di Titik Jatuh!' : `Kecepatan: ${currentBallisticPt.speed.toFixed(0)} m/s`)}
                      </span>
                      <span>Semua Mendarat ({totalFlightTime.toFixed(1)}s)</span>
                    </div>
                  </div>

                  {/* Multi-Projectile Quick Selector & Catalog Detail Button */}
                  <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-zinc-400 text-[11px]">Jumlah Bom:</span>
                      {[
                        { count: 1, label: '1 Batu' },
                        { count: 6, label: '6 Bom (Pancaran)' },
                        { count: 12, label: '12 Bom (Shower Masif)' },
                      ].map((item) => (
                        <button
                          key={item.count}
                          type="button"
                          onClick={() => {
                            if (onUpdateBallistic) {
                              onUpdateBallistic({ projectileCount: item.count });
                            }
                            setBallisticTime(0);
                            setIsBallisticPlaying(true);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors border ${
                            (ballistic.projectileCount ?? 1) === item.count
                              ? 'bg-amber-500 text-black font-bold border-amber-400 shadow-sm'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}

                      {onUpdateBallistic && (
                        <button
                          type="button"
                          onClick={() => {
                            const nextMode = ballistic.dispersionMode === 'radial' ? 'focused' : 'radial';
                            onUpdateBallistic({ dispersionMode: nextMode });
                            setBallisticTime(0);
                            setIsBallisticPlaying(true);
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors"
                          title="Ganti mode sebaran sudut lontaran (Kerucut Arah vs Radial 360°)"
                        >
                          Mode: <strong className="text-amber-400">{ballistic.dispersionMode === 'radial' ? 'Radial 360°' : 'Kerucut Sektoral'}</strong>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsEjectaModalOpen(true)}
                      className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-white border border-amber-500/40 font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                      title="Buka Telemetri Lengkap & Katalog Fragmen Batuan"
                    >
                      <span>💥</span>
                      <span>Katalog & Detail Lemparan Bom</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2 CONTENT: SMOKE & ASH ANIMATION CONTROLS */}
          {activeAnimTab === 'smoke' && (
            <div className="space-y-2.5">
              {!showSmokeAnim ? (
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center space-y-2">
                  <p className="text-zinc-300 text-xs font-medium">
                    Opsi melihat animasi asap vulkanik sedang nonaktif. Nyalakan untuk mensimulasikan ekspansi awan abu, payung kawah, dan jangkauan wilayah terdampak pasca erupsi secara dinamis.
                  </p>
                  <button
                    onClick={() => {
                      setShowSmokeAnim(true);
                      setIsSmokePlaying(true);
                    }}
                    className="px-4 py-1.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs transition-colors shadow-md inline-flex items-center gap-1.5"
                  >
                    <span>Aktifkan Animasi Asap Vulkanik</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Playback Controls & Speed */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSimTimeMinutes(0)}
                        title="Reset ke Momen Erupsi (T+0)"
                        className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setSimTimeMinutes((prev) => Math.max(0, prev - 15))}
                        title="Mundur 15 Menit"
                        className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs transition-colors"
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
                            <span>Jeda Simulasi</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Putar Simulasi</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setSimTimeMinutes((prev) => Math.min(1080, prev + 30))}
                        title="Maju 30 Menit"
                        className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs transition-colors"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
                        {[1, 5, 15, 30, 60].map((spd) => (
                          <button
                            key={spd}
                            onClick={() => setSimSpeed(spd)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                              simSpeed === spd
                                ? 'bg-zinc-700 text-white font-bold'
                                : 'text-zinc-400 hover:text-zinc-200'
                            }`}
                          >
                            {spd}x
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-300">
                      <span>Waktu: <strong className="text-white">{simTimeDisplay}</strong></span>
                      <span className="text-zinc-600">|</span>
                      <span>Garis Depan: <strong className="text-white">{simCurrentFrontKm} km</strong></span>
                      <span className="text-zinc-600">|</span>
                      <span>Arah: <strong className="text-white">{radiusMetrics.driftAngleDeg}°</strong></span>
                    </div>
                  </div>

                  {/* Scrubber Range & 18-Hour Milestones (Inspirasi abu.cikoytew.my.id) */}
                  <div className="space-y-1">
                    <input
                      type="range"
                      min={0}
                      max={1080}
                      step={1}
                      value={simTimeMinutes}
                      onChange={(e) => {
                        setSimTimeMinutes(Number(e.target.value));
                        setIsSmokePlaying(false);
                      }}
                      className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white hover:accent-zinc-200"
                    />
                    <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar pt-0.5">
                      {[
                        { min: 0, label: 'T+0 (Kawah)' },
                        { min: 30, label: 'T+30m (P. Sebesi)' },
                        { min: 60, label: 'T+1J (ALKI I)' },
                        { min: 180, label: 'T+3J (Pesisir Anyer/Kalianda)' },
                        { min: 360, label: 'T+6J (Pelabuhan Merak/Bakauheni)' },
                        { min: 720, label: 'T+12J (Bandara Soekarno-Hatta)' },
                        { min: 1080, label: 'T+18J (Batas Prediksi Maksimal)' },
                      ].map((pill) => (
                        <button
                          key={pill.min}
                          onClick={() => setSimTimeMinutes(pill.min)}
                          className={`px-2 py-0.5 rounded text-[9px] font-mono whitespace-nowrap transition-colors border ${
                            Math.abs(simTimeMinutes - pill.min) <= 15
                              ? 'bg-zinc-800 text-white border-zinc-600 font-bold'
                              : 'bg-zinc-950/60 text-zinc-400 border-zinc-850 hover:bg-zinc-900 hover:text-zinc-200'
                          }`}
                        >
                          {pill.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sub-tabs for detailed info */}
                  <div className="pt-2 border-t border-zinc-850 space-y-2">
                    <div className="flex items-center justify-between border-b border-zinc-850 pb-1 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setActiveSimTab('timeline')}
                          className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                            activeSimTab === 'timeline'
                              ? 'bg-zinc-800 text-white border border-zinc-700'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          📊 Telemetri Sebaran Abu
                        </button>
                        <button
                          onClick={() => setActiveSimTab('eta')}
                          className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                            activeSimTab === 'eta'
                              ? 'bg-zinc-800 text-white border border-zinc-700'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          ⏱️ Estimasi Waktu Tiba (ETA)
                        </button>
                        <button
                          onClick={() => setActiveSimTab('deposit')}
                          className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                            activeSimTab === 'deposit'
                              ? 'bg-zinc-800 text-white border border-zinc-700'
                              : 'text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          🌋 Ketebalan Endapan
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsDetailModalOpen(true)}
                        className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 hover:text-white border border-purple-500/40 font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                        title="Buka Matriks Sebaran Abu & Estimasi Ketebalan Isopach"
                      >
                        <span>☁️</span>
                        <span>Detail Sebaran Abu & Isopach</span>
                      </button>
                    </div>

                    {/* Subtab 1: Telemetry */}
                    {activeSimTab === 'timeline' && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
                        <div className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-850">
                          <span className="text-zinc-400 block text-[9px]">Garis Depan Awan:</span>
                          <strong className="text-white text-xs block mt-0.5">{simCurrentFrontKm} km</strong>
                          <span className="text-zinc-400 text-[9px]">Arah {radiusMetrics.driftAngleDeg}°</span>
                        </div>
                        <div className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-850">
                          <span className="text-zinc-400 block text-[9px]">Radius Payung:</span>
                          <strong className="text-white text-xs block mt-0.5">{simCurrentUmbrellaKm} km</strong>
                          <span className="text-zinc-400 text-[9px]">NBL Level</span>
                        </div>
                        <div className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-850">
                          <span className="text-zinc-400 block text-[9px]">Kecepatan Angin:</span>
                          <strong className="text-white text-xs block mt-0.5">{simWindKmh} km/j</strong>
                          <span className="text-zinc-400 text-[9px]">{plume.windSpeed} m/s</span>
                        </div>
                        <div className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-850">
                          <span className="text-zinc-400 block text-[9px]">Status Terpapar:</span>
                          <strong className="text-amber-400 text-xs block mt-0.5">
                            {simCoveredLandmarks.length} Wilayah
                          </strong>
                          <span className="text-zinc-400 text-[9px]">
                            {simCoveredLandmarks.length > 0
                              ? simCoveredLandmarks[simCoveredLandmarks.length - 1].name
                              : 'Area Kawah'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Subtab 2: ETA */}
                    {activeSimTab === 'eta' && (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto no-scrollbar font-mono text-[10px]">
                        {radiusMetrics.bmkgImpactedAreas.map((area) => (
                          <div
                            key={area.id}
                            className={`flex items-center justify-between p-1.5 rounded-lg border ${
                              area.hasAshArrived
                                ? 'bg-red-950/40 border-red-900/50 text-white font-bold'
                                : area.inPlume
                                ? 'bg-amber-950/30 border-amber-900/40 text-zinc-200'
                                : 'bg-zinc-900/50 border-zinc-850 text-zinc-400'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span>{area.name}</span>
                              <span className="text-zinc-500 font-sans text-[9px]">{area.distKm} km ({area.bearingDeg}°)</span>
                            </div>
                            <span className="font-bold">
                              {area.hasAshArrived
                                ? '🚨 Telah Tiba'
                                : area.inPlume
                                ? `⏳ ETA: T+${area.etaMinutes}m`
                                : '✓ Di Luar Lintasan'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Subtab 3: Deposit */}
                    {activeSimTab === 'deposit' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                        <div className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-850 space-y-0.5">
                          <span className="font-bold text-white block">Zona I (&gt;50 mm) - Sangat Tebal</span>
                          <p className="text-zinc-400 text-[9px] font-sans">
                            Pulau Rakata, Sertung, Panjang & kaldera. Kerusakan struktural, hujan lapili berat.
                          </p>
                        </div>
                        <div className="p-2 rounded-xl bg-zinc-900/80 border border-zinc-850 space-y-0.5">
                          <span className="font-bold text-white block">Zona II (10–50 mm) - Tebal</span>
                          <p className="text-zinc-400 text-[9px] font-sans">
                            Pulau Sebesi & ALKI I. Gangguan navigasi laut dan mesin kapal.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Population Density & Coastal Hazard Heatmap Floating Widget */}
      {showHazardHeatmap && (
        <HazardHeatmapWidget
          isVisible={showHazardHeatmap}
          onToggleVisible={setShowHazardHeatmap}
          mode={heatmapMode}
          onChangeMode={setHeatmapMode}
          opacity={heatmapOpacity}
          onChangeOpacity={setHeatmapOpacity}
          nodes={COASTAL_HAZARD_NODES}
          plume={plume}
          onSelectNode={(node) => {
            setSelectedHeatNodeId(node.id);
            if (mapInstanceRef.current) {
              mapInstanceRef.current.flyTo(node.coords, 12, { duration: 1.2 });
            }
          }}
          selectedNodeId={selectedHeatNodeId}
        />
      )}

      {/* Volcanic Ejecta & Ballistic Bombs Detail Modal */}
      <VolcanicEjectaDetailModal
        isOpen={isEjectaModalOpen}
        onClose={() => setIsEjectaModalOpen(false)}
        ballistic={ballistic}
        plume={plume}
      />

      {/* Physics & Educational Ash Dispersal Modal */}
      <AshDispersalDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        plume={plume}
        ballistic={ballistic}
      />

      {/* BMKG Official Data & Affected Areas Modal */}
      <BmkgAdvisoryModal
        isOpen={isBmkgModalOpen}
        onClose={() => setIsBmkgModalOpen(false)}
        currentPlume={plume}
        onApplyBmkgScenario={handleApplyBmkgScenario}
        onFocusAreaOnMap={(coords, zoom) => handleFlyTo(coords, zoom)}
      />
    </div>
  );
};
