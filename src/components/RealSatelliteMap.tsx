/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';

// Safeguard Leaflet against undefined DOM elements to prevent:
// Uncaught TypeError: Cannot read properties of undefined (reading '_leaflet_pos')
if (typeof window !== 'undefined' && L && L.DomUtil) {
  const origGetPos = L.DomUtil.getPosition;
  L.DomUtil.getPosition = function (el: any) {
    if (!el) return new L.Point(0, 0);
    try {
      return origGetPos ? origGetPos.call(L.DomUtil, el) : (el._leaflet_pos || new L.Point(0, 0));
    } catch {
      return new L.Point(0, 0);
    }
  };

  const origSetPos = L.DomUtil.setPosition;
  L.DomUtil.setPosition = function (el: any, point: any) {
    if (!el) return;
    try {
      if (origSetPos) origSetPos.call(L.DomUtil, el, point);
      else el._leaflet_pos = point;
    } catch {
      if (el) el._leaflet_pos = point;
    }
  };
}

// Safely clear layers with popup unbinding to prevent dangling animation race conditions
function safeClearLayers(group: L.LayerGroup | null) {
  if (!group) return;
  try {
    group.eachLayer((layer: any) => {
      try {
        if (typeof layer.closePopup === 'function') layer.closePopup();
        if (typeof layer.unbindPopup === 'function') layer.unbindPopup();
      } catch {}
    });
    group.clearLayers();
  } catch (err) {
    console.warn('safeClearLayers error:', err);
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
  BarChart3,
} from 'lucide-react';
import { BallisticParams, PlumeParams } from '../types';
import { computeTrajectory3D, computeTrajectory } from '../physics/ballistics';
import { AshDispersalDetailModal } from './AshDispersalDetailModal';
import {
  BMKG_AFFECTED_AREAS,
  BMKG_SIGMET_SCENARIOS,
  BmkgSigmetScenario,
} from '../data/bmkgData';
import { BmkgAdvisoryModal } from './BmkgAdvisoryModal';
import { MapTopBar } from './MapTopBar';
import { MapAnalysisDrawer } from './MapAnalysisDrawer';
import { MapSimulationDock } from './MapSimulationDock';

interface RealSatelliteMapProps {
  ballistic: BallisticParams;
  plume: PlumeParams;
  onUpdateWind?: (speed: number, direction: number) => void;
  onUpdateBallistic?: (params: Partial<BallisticParams>) => void;
  onUpdatePlume?: (params: Partial<PlumeParams>) => void;
}

// Vent coordinate: Gunung Anak Krakatau Crater (WGS84)
export const CRATER_COORDS: [number, number] = [-6.1021, 105.4230];

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
export type TileProvider = 'satellite' | 'dark' | 'osm' | 'ocean';

const CARTO_API_KEY =
  (import.meta.env.VITE_CARTO_API_KEY as string) || 'cb1_3j79_1_fe907188dc90c137acaeb241';

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

  // States
  const [selectedTile, setSelectedTile] = useState<TileProvider>('dark');
  const [showMaxBallisticRadius, setShowMaxBallisticRadius] = useState<boolean>(true);
  const [showActiveTrajectory, setShowActiveTrajectory] = useState<boolean>(true);
  const [showUmbrellaCloud, setShowUmbrellaCloud] = useState<boolean>(true);
  const [showAshPlumeCones, setShowAshPlumeCones] = useState<boolean>(true);
  const [showRadiusLabels, setShowRadiusLabels] = useState<boolean>(true);
  const [showKRBZones, setShowKRBZones] = useState<boolean>(true);
  const [showLandmarks, setShowLandmarks] = useState<boolean>(true);
  const [showShipping, setShowShipping] = useState<boolean>(true);

  // BMKG Official Layer & Affected Areas States
  const [showBmkgSigmet, setShowBmkgSigmet] = useState<boolean>(true);
  const [showBmkgAshDeposit, setShowBmkgAshDeposit] = useState<boolean>(true);
  const [showBmkgAffectedAreas, setShowBmkgAffectedAreas] = useState<boolean>(true);
  const [isBmkgModalOpen, setIsBmkgModalOpen] = useState<boolean>(false);
  const [activeBmkgScenarioId, setActiveBmkgScenarioId] = useState<string>('sigmet-west-monsoon');

  // Post-Eruption Ash Dispersion Simulation States
  const [simTimeMinutes, setSimTimeMinutes] = useState<number>(35);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(5);
  const [showIsochrones, setShowIsochrones] = useState<boolean>(true);
  const [showAshPuffs, setShowAshPuffs] = useState<boolean>(true);
  const [showSimDock, setShowSimDock] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [activeSimTab, setActiveSimTab] = useState<'timeline' | 'eta' | 'deposit'>('timeline');

  // UI Drawer & Popover States
  const [showOverviewCard, setShowOverviewCard] = useState<boolean>(false);
  const [isLayersOpen, setIsLayersOpen] = useState<boolean>(false);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [isBasemapOpen, setIsBasemapOpen] = useState<boolean>(false);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState<'summary' | 'areas' | 'measure'>('summary');

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

    // 2. Active Ballistic Trajectory
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

    // 3. Smoke Plume Umbrella Cloud Radius (Carey & Sparks 1986)
    // Vertical column spreads radially at Neutral Buoyancy Level (NBL)
    const umbrellaRadiusKm = Math.min(12, Math.max(0.8, (plume.columnHeight / 1000) * 0.52));
    const umbrellaRadiusMeters = umbrellaRadiusKm * 1000;

    // 4. Ash Plume Downwind Dispersal Reach & Zones
    // Wind blows from plume.windDirection, so ash drifts toward (windDirection + 180)
    const driftAngleDeg = (plume.windDirection + 180) % 360;
    const maxPlumeReachKm = Math.min(
      85,
      Math.max(12, (plume.columnHeight / 1000) * 9.5 + plume.windSpeed * 2.2)
    );
    const zone1ReachKm = maxPlumeReachKm * 0.22; // Near zone: heavy lapili & dense ash
    const zone2ReachKm = maxPlumeReachKm * 0.55; // Mid zone: moderate ashfall
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
    hazardGroupRef.current = L.layerGroup().addTo(map);
    plumeGroupRef.current = L.layerGroup().addTo(map);
    simulationGroupRef.current = L.layerGroup().addTo(map);
    ballisticGroupRef.current = L.layerGroup().addTo(map);
    landmarkGroupRef.current = L.layerGroup().addTo(map);
    shippingGroupRef.current = L.layerGroup().addTo(map);
    bmkgGroupRef.current = L.layerGroup().addTo(map);

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

      // Close open UI popovers on map click for clean interaction
      setIsLayersOpen(false);
      setIsCameraOpen(false);
      setIsBasemapOpen(false);
    });

    mapInstanceRef.current = map;

    const invalidateTimer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    return () => {
      clearTimeout(invalidateTimer);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.eachLayer((layer: any) => {
            try {
              if (typeof layer.closePopup === 'function') layer.closePopup();
            } catch {}
          });
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }
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
    safeClearLayers(group);

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
    safeClearLayers(group);

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

    // B. ACTIVE BALLISTIC TRAJECTORY & TOUCHDOWN IMPACT POINT
    if (showActiveTrajectory && activeTraj.points.length >= 2) {
      const pts = activeTraj.points;
      const latLngs: [number, number][] = pts.map((p) => {
        const deltaLat = -p.z / 111139; // -Z is North, +Z is South
        const deltaLon = p.x / (111139 * Math.cos((CRATER_COORDS[0] * Math.PI) / 180));
        return [CRATER_COORDS[0] + deltaLat, CRATER_COORDS[1] + deltaLon];
      });

      // Trajectory Line
      const trajPolyline = L.polyline(latLngs, {
        color: '#ffffff',
        weight: 3,
        opacity: 0.95,
        dashArray: '6, 4',
      });
      group.addLayer(trajPolyline);

      // Impact Point
      const lastPt = pts[pts.length - 1];
      const impactCoords = latLngs[latLngs.length - 1];
      const flightTime = lastPt.t;
      const impactSpeed = lastPt.speed;
      const mass = (4 / 3) * Math.PI * Math.pow(ballistic.rockDiameter / 2, 3) * ballistic.rockDensity;
      const energyMJ = (0.5 * mass * impactSpeed * impactSpeed) / 1e6;

      // Blast Ring
      const blastCircle = L.circle(impactCoords, {
        radius: Math.max(40, ballistic.rockDiameter * 90),
        color: '#ffffff',
        weight: 2,
        fillColor: '#ffffff',
        fillOpacity: 0.6,
      });
      group.addLayer(blastCircle);

      // Impact Marker Pin
      const impactIcon = L.divIcon({
        className: 'custom-impact-pin',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer">
            <div class="w-6 h-6 rounded-full bg-white animate-ping opacity-70"></div>
            <div class="w-4 h-4 rounded-full bg-white border-2 border-black absolute shadow-xl"></div>
            ${
              showRadiusLabels
                ? `
              <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/95 text-white font-mono text-[9px] px-2 py-0.5 rounded border border-zinc-700 whitespace-nowrap shadow-lg pointer-events-none">
                💥 Benturan: ${activeDistanceKm.toFixed(2)} km (${flightTime.toFixed(1)}s)
              </div>
            `
                : ''
            }
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const impactMarker = L.marker(impactCoords, { icon: impactIcon });
      impactMarker.bindPopup(`
        <div class="p-2.5 text-xs font-sans text-zinc-100 min-w-[210px]">
          <div class="font-bold text-white text-sm flex items-center gap-1.5 border-b border-zinc-800 pb-1.5 mb-1.5">
            💥 Titik Benturan Proyektil Aktif
          </div>
          <div class="space-y-1 font-mono text-[11px] text-zinc-300">
            <div>Jarak dari Kawah: <strong class="text-white">${activeDistanceKm.toFixed(2)} km</strong></div>
            <div>Sudut Elevasi: <strong class="text-white">${ballistic.launchAngle}°</strong></div>
            <div>Azimut Lontaran: <strong class="text-white">${ballistic.launchAzimuth ?? 90}°</strong></div>
            <div>Waktu Terbang: <strong class="text-white">${flightTime.toFixed(1)} detik</strong></div>
            <div>Kecepatan Bentur: <strong class="text-white">${impactSpeed.toFixed(0)} m/s</strong> (${(impactSpeed * 3.6).toFixed(0)} km/j)</div>
            <div>Energi Benturan: <strong class="text-white">${energyMJ.toFixed(2)} MJ</strong></div>
            <div class="pt-1 mt-1 border-t border-zinc-800 text-[10px]">
              ${activeDistanceKm >= 5.0 ? '<span class="text-red-400 font-bold">⚠️ Menembus Radius Steril 5 km!</span>' : '<span class="text-emerald-400 font-semibold">✓ Di Dalam Kaldera Krakatau</span>'}
            </div>
          </div>
        </div>
      `);
      group.addLayer(impactMarker);
    }
  }, [radiusMetrics, showMaxBallisticRadius, showActiveTrajectory, showRadiusLabels, ballistic]);

  // 5. Render Smoke & Ash Plume Radii (Umbrella Cloud & 3 Dispersion Bands)
  useEffect(() => {
    const group = plumeGroupRef.current;
    if (!group) return;
    safeClearLayers(group);

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
    }
  }, [radiusMetrics, showUmbrellaCloud, showAshPlumeCones, showRadiusLabels, plume]);

  // 5.1 Post-Eruption Ash Simulation Loop (Playback Timer)
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSimTimeMinutes((prev) => {
        const step = simSpeed * 0.35;
        const next = prev + step;
        if (next >= 360) {
          return 0; // loops back to eruption moment
        }
        return Number(next.toFixed(1));
      });
    }, 150);
    return () => clearInterval(interval);
  }, [isPlaying, simSpeed]);

  // 5.2 Dynamic Post-Eruption Plume Evolution, Animated Puffs & Isochrones
  useEffect(() => {
    const group = simulationGroupRef.current;
    if (!group) return;
    safeClearLayers(group);

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
            <div class="w-6 h-6 rounded-full bg-white/40 animate-ping absolute"></div>
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
    safeClearLayers(group);

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
                ? 'bg-amber-400 border-2 border-black animate-pulse'
                : isReachedNow
                ? 'bg-white border-2 border-black animate-ping'
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
    safeClearLayers(group);

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
    safeClearLayers(group);

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

  const activeLayersCount = [
    showMaxBallisticRadius,
    showActiveTrajectory,
    showUmbrellaCloud,
    showAshPlumeCones,
    showRadiusLabels,
    showKRBZones,
    showIsochrones,
    showAshPuffs,
    showLandmarks,
    showShipping,
    showBmkgSigmet,
    showBmkgAshDeposit,
    showBmkgAffectedAreas,
  ].filter(Boolean).length;

  return (
    <div className="relative w-full min-h-[720px] h-[780px] rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl bg-black select-none group font-sans">
      {/* Leaflet DOM Mounting Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* 1. TOP UNIFIED BAR: Clean, responsive, non-overlapping controls */}
      <MapTopBar
        selectedTile={selectedTile}
        setSelectedTile={setSelectedTile}
        isBasemapOpen={isBasemapOpen}
        setIsBasemapOpen={setIsBasemapOpen}
        activeBmkgScenarioId={activeBmkgScenarioId}
        onSelectBmkgScenario={handleApplyBmkgScenario}
        onOpenBmkgModal={() => setIsBmkgModalOpen(true)}
        isCameraOpen={isCameraOpen}
        setIsCameraOpen={setIsCameraOpen}
        onFlyTo={handleFlyTo}
        isLayersOpen={isLayersOpen}
        setIsLayersOpen={setIsLayersOpen}
        activeLayersCount={activeLayersCount}
        showMaxBallisticRadius={showMaxBallisticRadius}
        setShowMaxBallisticRadius={setShowMaxBallisticRadius}
        showActiveTrajectory={showActiveTrajectory}
        setShowActiveTrajectory={setShowActiveTrajectory}
        showKRBZones={showKRBZones}
        setShowKRBZones={setShowKRBZones}
        showUmbrellaCloud={showUmbrellaCloud}
        setShowUmbrellaCloud={setShowUmbrellaCloud}
        showAshPlumeCones={showAshPlumeCones}
        setShowAshPlumeCones={setShowAshPlumeCones}
        showIsochrones={showIsochrones}
        setShowIsochrones={setShowIsochrones}
        showAshPuffs={showAshPuffs}
        setShowAshPuffs={setShowAshPuffs}
        showBmkgSigmet={showBmkgSigmet}
        setShowBmkgSigmet={setShowBmkgSigmet}
        showBmkgAshDeposit={showBmkgAshDeposit}
        setShowBmkgAshDeposit={setShowBmkgAshDeposit}
        showLandmarks={showLandmarks}
        setShowLandmarks={setShowLandmarks}
        showShipping={showShipping}
        setShowShipping={setShowShipping}
        showRadiusLabels={showRadiusLabels}
        setShowRadiusLabels={setShowRadiusLabels}
        onOpenDetailModal={() => setIsDetailModalOpen(true)}
        showOverviewCard={showOverviewCard}
        setShowOverviewCard={setShowOverviewCard}
        maxBallisticKm={radiusMetrics.maxBallisticKm}
      />

      {/* 2. RIGHT DRAWER: Hazard analysis, landmarks, geodesic measurements */}
      <MapAnalysisDrawer
        isOpen={showOverviewCard}
        onClose={() => setShowOverviewCard(false)}
        radiusMetrics={radiusMetrics}
        plume={plume}
        ballistic={ballistic}
        cursorInfo={cursorInfo}
      />

      {/* 3. BOTTOM DOCK: Clean, non-intrusive post-eruption ash simulation player */}
      <MapSimulationDock
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        simTimeMinutes={simTimeMinutes}
        setSimTimeMinutes={setSimTimeMinutes}
        playbackSpeed={simSpeed}
        setPlaybackSpeed={setSimSpeed}
        simCurrentFrontKm={simCurrentFrontKm}
        simCurrentUmbrellaKm={simCurrentUmbrellaKm}
        simCoveredLandmarks={simCoveredLandmarks}
        onOpenDetailModal={() => setIsDetailModalOpen(true)}
        onOpenBmkgModal={() => setIsBmkgModalOpen(true)}
        simHours={simHours}
        simMins={simMins}
        activeBmkgScenario={BMKG_SIGMET_SCENARIOS.find((s) => s.id === activeBmkgScenarioId)}
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
