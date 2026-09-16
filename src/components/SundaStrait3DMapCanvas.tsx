/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import {
  Compass,
  AlertOctagon,
  Eye,
  Sun,
  Sunset,
  Moon,
  Rotate3d,
  Layers,
  Flame,
  Navigation,
  MapPin,
  Mountain,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { BallisticParams, PlumeParams, CameraPreset3D, LightingMode3D } from '../types';
import { computeTrajectory3D } from '../physics/ballistics';
import { GEOLOGICAL_LANDMARKS, GeologicalLandmark3D } from '../data/landmarks';
import { Map3DZoomBar } from './Map3DZoomBar';
import { LandmarkDetailModal } from './LandmarkDetailModal';
import { AshDispersalControlCard } from './AshDispersalControlCard';
import { CraterEruptionDetailHUD } from './CraterEruptionDetailHUD';

interface SundaStrait3DMapCanvasProps {
  ballistic: BallisticParams;
  plume: PlumeParams;
  triggerCount: number;
  onUpdateWind?: (speed: number, direction: number) => void;
  onUpdateBallistic?: (partial: Partial<BallisticParams>) => void;
}

interface LandmarkScreenPos {
  id: string;
  landmark: GeologicalLandmark3D;
  x: number;
  y: number;
  visible: boolean;
}

export const SundaStrait3DMapCanvas: React.FC<SundaStrait3DMapCanvasProps> = ({
  ballistic,
  plume,
  triggerCount,
  onUpdateWind,
  onUpdateBallistic,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // UI Interactive States
  const [cameraPreset, setCameraPreset] = useState<CameraPreset3D>('krakatau');
  const [lightingMode, setLightingMode] = useState<LightingMode3D>('sunset');
  const [showVacuumTrajectory, setShowVacuumTrajectory] = useState<boolean>(true);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [launchAzimuth, setLaunchAzimuth] = useState<number>(ballistic.launchAzimuth ?? 140);

  // Volcanic Ash Dispersal Real-Time Simulation States
  const [showAshCloud3D, setShowAshCloud3D] = useState<boolean>(true);
  const [showAshFootprint, setShowAshFootprint] = useState<boolean>(true);

  // Volcanic Ash Smoke & Crater Eruption Detail Toggles
  const [showVolcanicLightning, setShowVolcanicLightning] = useState<boolean>(true);
  const [showAshRain, setShowAshRain] = useState<boolean>(true);
  const [showAltitudeGauge, setShowAltitudeGauge] = useState<boolean>(true);
  const [showPyroclasticFlow, setShowPyroclasticFlow] = useState<boolean>(true);
  const [showHazardZones, setShowHazardZones] = useState<boolean>(true);
  const [showCraterHud, setShowCraterHud] = useState<boolean>(true);

  // Zoom & Geological Controls
  const [zoomDistance, setZoomDistance] = useState<number>(1100);
  const [scrollSensitivity, setScrollSensitivity] = useState<'fine' | 'normal' | 'fast'>('normal');
  const [showGeologicalLabels, setShowGeologicalLabels] = useState<boolean>(true);
  const [selectedLandmark, setSelectedLandmark] = useState<GeologicalLandmark3D | null>(null);
  const [landmarkScreenPositions, setLandmarkScreenPositions] = useState<LandmarkScreenPos[]>([]);

  // UI Panel Collapse & Tab States for Cleaner View
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState<boolean>(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(true);
  const [leftTab, setLeftTab] = useState<'camera' | 'ash'>('camera');

  // Live telemetry overlay
  const [activeTelemetry, setActiveTelemetry] = useState({
    bombAlt: 157,
    bombDist: 0,
    bombSpeed: ballistic.initialVelocity,
    flightTime: 0,
    landed: false,
    impactSpeed: 0,
  });

  // Scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Dynamic mesh references
  const trajLineRealRef = useRef<THREE.Line | null>(null);
  const trajLineIdealRef = useRef<THREE.Line | null>(null);
  const mainBombRef = useRef<THREE.Mesh | null>(null);
  const bombLightRef = useRef<THREE.PointLight | null>(null);
  const ventLightRef = useRef<THREE.PointLight | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const oceanMeshRef = useRef<THREE.Mesh | null>(null);
  const plumeParticlesRef = useRef<{ mesh: THREE.InstancedMesh; data: any[] } | null>(null);
  const ashRainParticlesRef = useRef<{ mesh: THREE.InstancedMesh; data: any[] } | null>(null);
  const lightningMeshRef = useRef<THREE.Line | null>(null);
  const lightningLightRef = useRef<THREE.PointLight | null>(null);
  const pyroclasticParticlesRef = useRef<{ mesh: THREE.InstancedMesh; data: any[] } | null>(null);
  const altitudeGaugeGroupRef = useRef<THREE.Group | null>(null);
  const hazardRingsGroupRef = useRef<THREE.Group | null>(null);
  const ashFootprintMeshRef = useRef<THREE.Mesh | null>(null);
  const fumaroleParticlesRef = useRef<{ mesh: THREE.InstancedMesh; data: any[] } | null>(null);
  const bombShowerRef = useRef<any[]>([]);
  const splashRingsRef = useRef<any[]>([]);
  const shipMeshRef = useRef<THREE.Group | null>(null);
  const lightningCooldownRef = useRef<number>(1.8);

  // Real-time calculated downwind reach in kilometers
  const downwindReachKm = Math.min(65, 8 + (plume.windSpeed * 3.6) * 0.45);

  // Orbit camera state with target lerping for smooth zoom & transitions
  const orbitRef = useRef({
    target: new THREE.Vector3(0, 157, 0),
    destTarget: new THREE.Vector3(0, 157, 0),
    radius: 1100,
    targetRadius: 1100,
    theta: 0.8,
    targetTheta: 0.8,
    phi: 1.15,
    targetPhi: 1.15,
    isDragging: false,
    isPanning: false,
    lastMouseX: 0,
    lastMouseY: 0,
  });

  // Simulation time
  const simTimeRef = useRef<number>(0);
  const trajectoryDataRef = useRef<any>(null);

  // Handle camera preset positioning
  const applyCameraPreset = useCallback((preset: CameraPreset3D) => {
    setCameraPreset(preset);
    const orbit = orbitRef.current;

    switch (preset) {
      case 'crater': // Close-up into active vent and magma lake
        orbit.destTarget.set(0, 110, 0);
        orbit.targetRadius = 380;
        orbit.targetTheta = 0.65;
        orbit.targetPhi = 0.95;
        break;

      case 'rim': // Overlook from 157 mdpl crater rim
        orbit.destTarget.set(0, 157, 0);
        orbit.targetRadius = 650;
        orbit.targetTheta = 1.35;
        orbit.targetPhi = 1.15;
        break;

      case 'krakatau': // Close-up on Anak Krakatau crater
        orbit.destTarget.set(0, 157, 0);
        orbit.targetRadius = 1100;
        orbit.targetTheta = 0.8;
        orbit.targetPhi = 1.15;
        break;

      case 'orbit': // High orbital view of Sunda Strait
        orbit.destTarget.set(0, 200, 0);
        orbit.targetRadius = 18000;
        orbit.targetTheta = 1.2;
        orbit.targetPhi = 0.55;
        break;

      case 'anyer': // View from Banten / Anyer coastline (~40km East)
        orbit.destTarget.set(0, 500, 0);
        orbit.targetRadius = 32000;
        orbit.targetTheta = Math.PI / 2 + 0.1;
        orbit.targetPhi = 1.48;
        break;

      case 'kalianda': // View from Lampung / Kalianda (~35km NW)
        orbit.destTarget.set(0, 400, 0);
        orbit.targetRadius = 28000;
        orbit.targetTheta = -Math.PI / 2 - 0.5;
        orbit.targetPhi = 1.45;
        break;

      case 'ship': // View from ALKI I shipping lane
        orbit.destTarget.set(0, 250, 0);
        orbit.targetRadius = 6500;
        orbit.targetTheta = 0.15;
        orbit.targetPhi = 1.49;
        break;

      case 'follow': // Follow volcanic bomb
        break;
    }
  }, []);

  // Update launch azimuth
  const handleAzimuthChange = (newAzimuth: number) => {
    setLaunchAzimuth(newAzimuth);
    if (onUpdateBallistic) {
      onUpdateBallistic({ launchAzimuth: newAzimuth });
    }
  };

  // Zoom control helpers
  const handleZoomIn = () => {
    orbitRef.current.targetRadius = Math.max(250, orbitRef.current.targetRadius * 0.72);
  };

  const handleZoomOut = () => {
    orbitRef.current.targetRadius = Math.min(50000, orbitRef.current.targetRadius * 1.38);
  };

  const handleResetZoom = () => {
    orbitRef.current.destTarget.set(0, 157, 0);
    orbitRef.current.targetRadius = 1100;
    orbitRef.current.targetTheta = 0.8;
    orbitRef.current.targetPhi = 1.15;
    setCameraPreset('krakatau');
  };

  const handleSliderChange = (newDistance: number) => {
    orbitRef.current.targetRadius = newDistance;
  };

  const handleSelectDistancePreset = (distance: number) => {
    orbitRef.current.targetRadius = distance;
  };

  // Focus directly on a landmark
  const handleFocusLandmark = (landmark: GeologicalLandmark3D) => {
    const orbit = orbitRef.current;
    orbit.destTarget.set(
      landmark.targetCamera.target.x,
      landmark.targetCamera.target.y,
      landmark.targetCamera.target.z
    );
    orbit.targetRadius = landmark.targetCamera.distance;
    orbit.targetPhi = landmark.targetCamera.phi;
    orbit.targetTheta = landmark.targetCamera.theta;
  };

  // -------------------------------------------------------------
  // INITIALIZE THREE.JS SCENE
  // -------------------------------------------------------------
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Sky & Fog
    scene.background = new THREE.Color(0x0c1424);
    const fog = new THREE.FogExp2(0x0c1424, 0.00004);
    scene.fog = fog;

    // 2. Camera with high-range precision
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 160000);
    camera.position.set(350, 400, 700);
    camera.lookAt(0, 157, 0);
    cameraRef.current = camera;

    // 3. Renderer with Logarithmic Depth Buffer to eliminate z-fighting and broken geometry tearing
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: true,
      precision: 'highp',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    rendererRef.current = renderer;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xd9e4f5, 0.4);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const sunLight = new THREE.DirectionalLight(0xfff3db, 1.3);
    sunLight.position.set(8000, 12000, 6000);
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // Magma crater vent point light
    const ventLight = new THREE.PointLight(0xff4500, 4.0, 3000, 1.2);
    ventLight.position.set(0, 155, 0);
    scene.add(ventLight);
    ventLightRef.current = ventLight;

    // Volcanic bomb follower light
    const bombLight = new THREE.PointLight(0xff6600, 2.0, 800);
    bombLight.position.set(0, 157, 0);
    scene.add(bombLight);
    bombLightRef.current = bombLight;

    // -----------------------------------------------------------
    // GEOGRAPHIC TERRAIN & LANDFORMS (SELAT SUNDA)
    // -----------------------------------------------------------

    // A. Ocean Surface (Selat Sunda)
    const oceanGeo = new THREE.PlaneGeometry(80000, 80000, 64, 64);
    oceanGeo.rotateX(-Math.PI / 2);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x09223b,
      roughness: 0.25,
      metalness: 0.2,
      flatShading: false,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    oceanMesh.position.y = 0;
    scene.add(oceanMesh);
    oceanMeshRef.current = oceanMesh;

    // Shallow Reef / Hydrothermal Lagoon ring around Anak Krakatau
    const reefGeo = new THREE.RingGeometry(850, 2000, 64);
    reefGeo.rotateX(-Math.PI / 2);
    const reefMat = new THREE.MeshBasicMaterial({
      color: 0x0e7490,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const reefMesh = new THREE.Mesh(reefGeo, reefMat);
    reefMesh.position.y = 0.8;
    scene.add(reefMesh);

    // 2018 Submarine Debris Avalanche Apron (Southwest underwater fan)
    const debrisFanGeo = new THREE.RingGeometry(900, 2800, 32, 4, -2.6, 1.7);
    debrisFanGeo.rotateX(-Math.PI / 2);
    const debrisFanMat = new THREE.MeshBasicMaterial({
      color: 0x0891b2,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const debrisFanMesh = new THREE.Mesh(debrisFanGeo, debrisFanMat);
    debrisFanMesh.position.y = 0.6;
    scene.add(debrisFanMesh);

    // -----------------------------------------------------------
    // B. GUNUNG ANAK KRAKATAU (HIGH-FIDELITY SMOOTH GEOLOGICAL MESH)
    // -----------------------------------------------------------
    const akGroup = new THREE.Group();

    // High-resolution open cone: 128 radial segments x 48 concentric layers (openEnded avoids cap distortion)
    const akGeo = new THREE.CylinderGeometry(22, 1220, 157, 128, 48, true);
    const akPos = akGeo.attributes.position;
    const vertexCount = akPos.count;
    const colors = new Float32Array(vertexCount * 3);

    for (let i = 0; i < vertexCount; i++) {
      let x = akPos.getX(i);
      let z = akPos.getZ(i);

      const r = Math.hypot(x, z);
      const angle = Math.atan2(z, x); // azimuthal angle [-PI, PI]

      // Natural Stratovolcano concave slope profile
      const normR = Math.max(0, Math.min(1.0, (r - 22) / 1198));
      let elev = 157 * Math.pow(Math.max(0, 1.0 - normR), 1.62);

      // Southwestern Breached Crater (2018 Flank Collapse Horseshoe Amphitheater)
      // Azimuth angle centered at -1.72 rad (~SW)
      const centerAngle = -1.72;
      const angleDist = Math.abs(angle - centerAngle);
      if (angleDist < 0.95) {
        // Smooth cosine falloff into the collapsed amphitheater
        const collapseGouge = Math.cos((angleDist / 0.95) * (Math.PI / 2));
        const depthFactor = 0.18 + 0.82 * (1.0 - collapseGouge * 0.86);
        elev *= depthFactor;

        // Inside the breached floor near sea level
        if (r < 480) {
          elev = Math.min(elev, 24 + (r / 480) * 22);
        }
      }

      // Smooth Radial Lava Flow Ridges & Andesite Ribs
      const lavaRibs = Math.sin(angle * 7 + 0.3) * Math.cos(angle * 2) * 5.0 * (1.0 - normR) * Math.sin(normR * Math.PI);
      elev += lavaRibs;

      // Ensure coastline touches sea level with zero gap
      if (normR >= 0.98) {
        elev = 0;
      }

      const y = Math.max(0, elev);
      akPos.setXYZ(i, x, y, z);

      // Smooth Geological Vertex Coloring
      let cR = 0.16;
      let cG = 0.16;
      let cB = 0.17;

      if (y < 6) {
        // Volcanic black sand shoreline beach
        cR = 0.08;
        cG = 0.09;
        cB = 0.12;
      } else if (angleDist < 0.95 && y > 18 && y < 110) {
        // Exposed 2018 fault scarp cliff: oxidized reddish-brown breccia
        const blend = Math.sin((angleDist / 0.95) * Math.PI);
        cR = 0.42 * blend + 0.18 * (1 - blend);
        cG = 0.16 * blend + 0.15 * (1 - blend);
        cB = 0.12 * blend + 0.16 * (1 - blend);
      } else if (y >= 135 && r < 180) {
        // Sulfur yellow and ochre deposits around active crater rim
        cR = 0.92;
        cG = 0.74;
        cB = 0.08;
      } else if (y >= 75) {
        // Upper cone dark tephra and andesite blocks
        cR = 0.22;
        cG = 0.21;
        cB = 0.22;
      } else {
        // Flank lava flow ridges (charcoal andesite vs grey ash)
        const isRidge = lavaRibs > 0;
        if (isRidge) {
          cR = 0.13;
          cG = 0.13;
          cB = 0.14;
        } else {
          cR = 0.25;
          cG = 0.26;
          cB = 0.29;
        }
      }

      colors[i * 3] = cR;
      colors[i * 3 + 1] = cG;
      colors[i * 3 + 2] = cB;
    }

    akGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    akGeo.computeVertexNormals();

    const akMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.06,
      flatShading: false, // SMOOTH SHADING (NO JAGGED FACETS)
    });
    const akMesh = new THREE.Mesh(akGeo, akMat);
    akGroup.add(akMesh);

    // Inner crater funnel wall descending to magma lake
    const innerVentGeo = new THREE.CylinderGeometry(22, 54, 98, 48, 8, true);
    innerVentGeo.computeVertexNormals();
    const innerVentMat = new THREE.MeshStandardMaterial({
      color: 0x221a15,
      roughness: 0.95,
      metalness: 0.1,
      flatShading: false,
    });
    const innerVentMesh = new THREE.Mesh(innerVentGeo, innerVentMat);
    innerVentMesh.position.set(0, 100, 0);
    akGroup.add(innerVentMesh);

    // Active Molten Magma Reservoir inside Central Vent
    const magmaGeo = new THREE.CircleGeometry(60, 32);
    magmaGeo.rotateX(-Math.PI / 2);
    const magmaMat = new THREE.MeshBasicMaterial({
      color: 0xff3b00,
    });
    const magmaMesh = new THREE.Mesh(magmaGeo, magmaMat);
    magmaMesh.position.set(0, 52, 0);
    akGroup.add(magmaMesh);

    // Active Inner Spatter Cone Ring
    const spatterGeo = new THREE.CylinderGeometry(25, 60, 20, 32, 2, true);
    const spatterMat = new THREE.MeshStandardMaterial({
      color: 0x450a0a,
      roughness: 0.9,
      flatShading: false,
    });
    const spatterMesh = new THREE.Mesh(spatterGeo, spatterMat);
    spatterMesh.position.set(0, 50, 0);
    akGroup.add(spatterMesh);

    // Hydrothermal Acid Lagoon (Danau Kawah Hijau Toska in breached basin)
    const acidLakeGeo = new THREE.CircleGeometry(85, 32);
    acidLakeGeo.rotateX(-Math.PI / 2);
    const acidLakeMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4, // vibrant turquoise cyan
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85,
    });
    const acidLakeMesh = new THREE.Mesh(acidLakeGeo, acidLakeMat);
    acidLakeMesh.position.set(-130, 15, -150);
    akGroup.add(acidLakeMesh);

    // Sulfur Yellow mineral crust ring around acid lake
    const sulfurRingGeo = new THREE.RingGeometry(85, 115, 32);
    sulfurRingGeo.rotateX(-Math.PI / 2);
    const sulfurRingMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.95,
      flatShading: false,
    });
    const sulfurRingMesh = new THREE.Mesh(sulfurRingGeo, sulfurRingMat);
    sulfurRingMesh.position.set(-130, 15.5, -150);
    akGroup.add(sulfurRingMesh);

    scene.add(akGroup);

    // -----------------------------------------------------------
    // SOLFATARA & FUMAROLE STEAM SYSTEM (CRATER VAPOR)
    // -----------------------------------------------------------
    const fCount = 72;
    const fGeo = new THREE.SphereGeometry(1, 6, 6);
    const fMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a, // sulfur light yellow/white
      roughness: 1.0,
      transparent: true,
      opacity: 0.45,
    });
    const fInstanced = new THREE.InstancedMesh(fGeo, fMat, fCount);
    scene.add(fInstanced);

    // 8 distinct fumarole vent sources
    const ventLocs = [
      { x: 30, y: 155, z: 25 },
      { x: -45, y: 150, z: 20 },
      { x: -100, y: 85, z: -85 },
      { x: -140, y: 20, z: -155 },
      { x: 65, y: 145, z: -35 },
      { x: 10, y: 157, z: -55 },
      { x: -35, y: 100, z: -125 },
      { x: 80, y: 120, z: 50 },
    ];

    const fumaroleData = [];
    for (let i = 0; i < fCount; i++) {
      const v = ventLocs[i % ventLocs.length];
      fumaroleData.push({
        originX: v.x,
        originY: v.y,
        originZ: v.z,
        x: v.x + (Math.random() - 0.5) * 8,
        y: v.y + Math.random() * 20,
        z: v.z + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 4,
        vy: 5 + Math.random() * 12,
        vz: (Math.random() - 0.5) * 4,
        scale: 4 + Math.random() * 8,
        maxLife: 1.0,
        life: Math.random(),
      });
    }
    fumaroleParticlesRef.current = { mesh: fInstanced, data: fumaroleData };

    // -----------------------------------------------------------
    // C. PULAU RAKATA (Towering 813m Caldera Wall & Jungle)
    // -----------------------------------------------------------
    const rakataGeo = new THREE.ConeGeometry(1900, 813, 48, 24, true);
    const rkPos = rakataGeo.attributes.position;
    for (let i = 0; i < rkPos.count; i++) {
      let x = rkPos.getX(i);
      let y = rkPos.getY(i) + 406.5;
      let z = rkPos.getZ(i);

      // Northern face facing Anak Krakatau is the sheer vertical 1883 caldera cliff
      if (z < 0) {
        y *= 0.35;
      }
      rkPos.setXYZ(i, x, Math.max(0, y), z);
    }
    rakataGeo.computeVertexNormals();

    const rakataMat = new THREE.MeshStandardMaterial({
      color: 0x14532d, // lush tropical jungle
      roughness: 0.85,
      flatShading: false,
    });
    const rakataMesh = new THREE.Mesh(rakataGeo, rakataMat);
    rakataMesh.position.set(600, 0, 4200);
    scene.add(rakataMesh);

    // D. Pulau Sertung (West-Northwest: X ~ -3200, Z ~ -1600, Alt: 182m)
    const sertungGeo = new THREE.CylinderGeometry(400, 1100, 182, 32);
    sertungGeo.scale(1.8, 1, 0.7);
    sertungGeo.computeVertexNormals();
    const sertungMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a24,
      roughness: 0.9,
      flatShading: false,
    });
    const sertungMesh = new THREE.Mesh(sertungGeo, sertungMat);
    sertungMesh.position.set(-3200, 91, -1600);
    sertungMesh.rotation.y = 0.5;
    scene.add(sertungMesh);

    // E. Pulau Panjang (Northeast: X ~ +3100, Z ~ -1100, Alt: 142m)
    const panjangGeo = new THREE.CylinderGeometry(300, 950, 142, 32);
    panjangGeo.scale(1.4, 1, 0.6);
    panjangGeo.computeVertexNormals();
    const panjangMat = new THREE.MeshStandardMaterial({
      color: 0x1c3822,
      roughness: 0.9,
      flatShading: false,
    });
    const panjangMesh = new THREE.Mesh(panjangGeo, panjangMat);
    panjangMesh.position.set(3100, 71, -1100);
    panjangMesh.rotation.y = -0.4;
    scene.add(panjangMesh);

    // F. Pulau Sebesi (15 km North: X ~ +1000, Z ~ -15500, Alt: 844m)
    const sebesiGeo = new THREE.ConeGeometry(2400, 844, 32);
    sebesiGeo.computeVertexNormals();
    const sebesiMat = new THREE.MeshStandardMaterial({
      color: 0x133820,
      roughness: 0.9,
      flatShading: false,
    });
    const sebesiMesh = new THREE.Mesh(sebesiGeo, sebesiMat);
    sebesiMesh.position.set(1000, 422, -15500);
    scene.add(sebesiMesh);

    // G. Distant Coastlines (Banten & Lampung)
    const bantenGeo = new THREE.BoxGeometry(6000, 600, 45000);
    const coastMat = new THREE.MeshStandardMaterial({
      color: 0x0f2e1b,
      roughness: 0.95,
    });
    const bantenMesh = new THREE.Mesh(bantenGeo, coastMat);
    bantenMesh.position.set(42000, 300, 5000);
    scene.add(bantenMesh);

    const lampungGeo = new THREE.BoxGeometry(45000, 700, 6000);
    const lampungMesh = new THREE.Mesh(lampungGeo, coastMat);
    lampungMesh.position.set(-5000, 350, -38000);
    scene.add(lampungMesh);

    const rajabasaGeo = new THREE.ConeGeometry(4000, 1281, 32);
    const rajabasaMesh = new THREE.Mesh(rajabasaGeo, coastMat);
    rajabasaMesh.position.set(-15000, 640, -36000);
    scene.add(rajabasaMesh);

    // -----------------------------------------------------------
    // RISK ZONES & HAZARD BOUNDARIES (KRB)
    // -----------------------------------------------------------
    const krbGroup = new THREE.Group();

    // KRB III (5.0 km) - Danger Zone
    const krb3Geo = new THREE.RingGeometry(4960, 5040, 64);
    krb3Geo.rotateX(-Math.PI / 2);
    const krb3Mat = new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const krb3Mesh = new THREE.Mesh(krb3Geo, krb3Mat);
    krb3Mesh.position.y = 4;
    krbGroup.add(krb3Mesh);

    // KRB II (7.5 km)
    const krb2Geo = new THREE.RingGeometry(7460, 7540, 64);
    krb2Geo.rotateX(-Math.PI / 2);
    const krb2Mat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    const krb2Mesh = new THREE.Mesh(krb2Geo, krb2Mat);
    krb2Mesh.position.y = 3;
    krbGroup.add(krb2Mesh);

    // KRB I (15.0 km)
    const krb1Geo = new THREE.RingGeometry(14950, 15050, 64);
    krb1Geo.rotateX(-Math.PI / 2);
    const krb1Mat = new THREE.MeshBasicMaterial({
      color: 0xeab308,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5,
    });
    const krb1Mesh = new THREE.Mesh(krb1Geo, krb1Mat);
    krb1Mesh.position.y = 2;
    krbGroup.add(krb1Mesh);

    scene.add(krbGroup);

    // -----------------------------------------------------------
    // MARITIME & AVIATION INFRASTRUCTURE
    // -----------------------------------------------------------
    const lanePts = [
      new THREE.Vector3(7000, 5, -28000),
      new THREE.Vector3(8000, 5, -10000),
      new THREE.Vector3(9500, 5, 5000),
      new THREE.Vector3(12000, 5, 25000),
    ];
    const laneCurve = new THREE.CatmullRomCurve3(lanePts);
    const laneGeo = new THREE.TubeGeometry(laneCurve, 32, 20, 8, false);
    const laneMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.6,
    });
    const laneMesh = new THREE.Mesh(laneGeo, laneMat);
    scene.add(laneMesh);

    // Container Ship navigating ALKI I
    const shipGroup = new THREE.Group();
    const hullGeo = new THREE.BoxGeometry(60, 20, 240);
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x991b1b });
    const hull = new THREE.Mesh(hullGeo, hullMat);
    hull.position.y = 8;
    shipGroup.add(hull);

    const deckGeo = new THREE.BoxGeometry(45, 15, 160);
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.set(0, 22, -20);
    shipGroup.add(deck);

    const towerGeo = new THREE.BoxGeometry(40, 25, 30);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.set(0, 30, 80);
    shipGroup.add(tower);

    shipGroup.position.set(9000, 0, 2000);
    shipGroup.rotation.y = -Math.PI / 12;
    scene.add(shipGroup);
    shipMeshRef.current = shipGroup;

    // Flight Corridor W45
    const airPts = [
      new THREE.Vector3(-15000, 7500, -25000),
      new THREE.Vector3(0, 8000, -5000),
      new THREE.Vector3(15000, 8500, 20000),
    ];
    const airCurve = new THREE.CatmullRomCurve3(airPts);
    const airGeo = new THREE.TubeGeometry(airCurve, 24, 15, 6, false);
    const airMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.5,
    });
    const airMesh = new THREE.Mesh(airGeo, airMat);
    scene.add(airMesh);

    // -----------------------------------------------------------
    // TRAJECTORY LINES & VOLCANIC BOMB MESH
    // -----------------------------------------------------------
    const bombGeo = new THREE.DodecahedronGeometry(12, 1);
    const bombMat = new THREE.MeshStandardMaterial({
      color: 0xff3b00,
      emissive: 0xff4500,
      emissiveIntensity: 1.8,
      roughness: 0.4,
    });
    const mainBomb = new THREE.Mesh(bombGeo, bombMat);
    mainBomb.position.set(0, 157, 0);
    scene.add(mainBomb);
    mainBombRef.current = mainBomb;

    const trajLineMat = new THREE.LineBasicMaterial({
      color: 0xf97316,
      linewidth: 3,
    });
    const dummyGeo = new THREE.BufferGeometry();
    const trajLine = new THREE.Line(dummyGeo, trajLineMat);
    scene.add(trajLine);
    trajLineRealRef.current = trajLine;

    const trajIdealMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 80,
      gapSize: 40,
    });
    const trajIdeal = new THREE.Line(new THREE.BufferGeometry(), trajIdealMat);
    scene.add(trajIdeal);
    trajLineIdealRef.current = trajIdeal;

    // -----------------------------------------------------------
    // 3D VOLCANIC ASH PLUME & ADVECTION-DISPERSION SYSTEM
    // -----------------------------------------------------------
    const particleCount = 420;
    const pSphereGeo = new THREE.SphereGeometry(1, 8, 8);
    const pSphereMat = new THREE.MeshStandardMaterial({
      roughness: 0.96,
      metalness: 0.05,
      transparent: true,
      opacity: 0.75,
      vertexColors: false,
    });
    const plumeInstanced = new THREE.InstancedMesh(pSphereGeo, pSphereMat, particleCount);
    plumeInstanced.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(particleCount * 3), 3);
    for (let i = 0; i < particleCount; i++) {
      plumeInstanced.setColorAt(i, new THREE.Color(0x3f3f46));
    }
    if (plumeInstanced.instanceColor) plumeInstanced.instanceColor.needsUpdate = true;
    scene.add(plumeInstanced);

    const plumeData = [];
    const windRadInit = (plume.windDirection * Math.PI) / 180;
    const initDirX = Math.sin(windRadInit);
    const initDirZ = -Math.cos(windRadInit);

    for (let i = 0; i < particleCount; i++) {
      const initialProgress = i / particleCount;
      const initialDist = initialProgress * Math.min(45000, 8000 + plume.windSpeed * 1500);

      const isDrift = initialProgress > 0.22;
      const isUmbrella = initialProgress > 0.11 && !isDrift;

      plumeData.push({
        x: isDrift ? initDirX * initialDist + (Math.random() - 0.5) * (initialDist * 0.35 + 90) : (Math.random() - 0.5) * 45,
        y: isDrift ? Math.max(80, 157 + plume.columnHeight * (1 - initialProgress * 0.4) - Math.random() * 300) : 157 + Math.random() * 80,
        z: isDrift ? initDirZ * initialDist + (Math.random() - 0.5) * (initialDist * 0.35 + 90) : (Math.random() - 0.5) * 45,
        vx: (Math.random() - 0.5) * 9,
        vy: 22 + Math.random() * 32,
        vz: (Math.random() - 0.5) * 9,
        turbX: (Math.random() - 0.5) * 28,
        turbZ: (Math.random() - 0.5) * 28,
        settlingRate: 14 + Math.random() * 26,
        scale: 18 + initialProgress * 440 + Math.random() * 35,
        life: Math.random(),
        age: initialProgress * 22,
        maxLife: 24 + Math.random() * 14,
        phase: isDrift ? 'drift' : isUmbrella ? 'umbrella' : 'column',
        radialSpeed: 16 + Math.random() * 28,
        radialAngle: Math.random() * Math.PI * 2,
      });
    }
    plumeParticlesRef.current = { mesh: plumeInstanced, data: plumeData };

    // -----------------------------------------------------------
    // VOLCANIC ASH FALLOUT / RAIN CURTAINS (GRAVITATIONAL SETTLING)
    // -----------------------------------------------------------
    const ashRainCount = 220;
    const ashRainGeo = new THREE.SphereGeometry(1, 4, 4);
    const ashRainMat = new THREE.MeshBasicMaterial({
      color: 0x333238,
      transparent: true,
      opacity: 0.65,
    });
    const ashRainInstanced = new THREE.InstancedMesh(ashRainGeo, ashRainMat, ashRainCount);
    scene.add(ashRainInstanced);

    const ashRainData = [];
    for (let i = 0; i < ashRainCount; i++) {
      const pDist = Math.random() * Math.min(38000, 6000 + plume.windSpeed * 1300);
      ashRainData.push({
        x: initDirX * pDist + (Math.random() - 0.5) * (pDist * 0.4 + 120),
        y: Math.random() * (157 + plume.columnHeight * 0.85),
        z: initDirZ * pDist + (Math.random() - 0.5) * (pDist * 0.4 + 120),
        fallSpeed: 18 + Math.random() * 36,
        driftX: (Math.random() - 0.5) * 12,
        driftZ: (Math.random() - 0.5) * 12,
        scale: 3.5 + Math.random() * 5.5,
      });
    }
    ashRainParticlesRef.current = { mesh: ashRainInstanced, data: ashRainData };

    // -----------------------------------------------------------
    // VOLCANIC LIGHTNING FLASH SYSTEM IN ASH CLOUD
    // -----------------------------------------------------------
    const lightningMat = new THREE.LineBasicMaterial({
      color: 0xc7d2fe,
      transparent: true,
      opacity: 0,
      linewidth: 2,
    });
    const lightningLine = new THREE.Line(new THREE.BufferGeometry(), lightningMat);
    scene.add(lightningLine);
    lightningMeshRef.current = lightningLine;

    const lightningLight = new THREE.PointLight(0xa5b4fc, 0, 5000, 1.4);
    lightningLight.position.set(0, 500, 0);
    scene.add(lightningLight);
    lightningLightRef.current = lightningLight;

    // -----------------------------------------------------------
    // PYROCLASTIC DENSITY CURRENTS (AWAN PANAS GUGURAN ON FLANKS)
    // -----------------------------------------------------------
    const pdcCount = 80;
    const pdcGeo = new THREE.SphereGeometry(1, 6, 6);
    const pdcMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.95,
      transparent: true,
      opacity: 0.7,
    });
    const pdcInstanced = new THREE.InstancedMesh(pdcGeo, pdcMat, pdcCount);
    scene.add(pdcInstanced);

    const pdcData = [];
    // Paths down the southwestern breached scarp and eastern flank to sea level
    for (let i = 0; i < pdcCount; i++) {
      const isSouthwest = i % 2 === 0;
      pdcData.push({
        startX: (Math.random() - 0.5) * 20,
        startY: 155,
        startZ: (Math.random() - 0.5) * 20,
        endX: isSouthwest ? -350 - Math.random() * 200 : 380 + Math.random() * 180,
        endY: 0,
        endZ: isSouthwest ? -300 - Math.random() * 200 : 250 + Math.random() * 200,
        progress: Math.random(),
        speed: 0.2 + Math.random() * 0.25,
        initScale: 6 + Math.random() * 8,
        scale: 6,
        x: 0,
        y: 155,
        z: 0,
      });
    }
    pyroclasticParticlesRef.current = { mesh: pdcInstanced, data: pdcData };

    // -----------------------------------------------------------
    // 3D VERTICAL ALTITUDE GAUGE (MISTAR KETINGGIAN ERUPSI 3D)
    // -----------------------------------------------------------
    const altGaugeGroup = new THREE.Group();
    altGaugeGroup.position.set(-160, 0, 0);

    // Vertical translucent cyan mast
    const mastGeo = new THREE.CylinderGeometry(1.8, 1.8, 4800, 8);
    mastGeo.translate(0, 2400, 0);
    const mastMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.5,
    });
    const mastMesh = new THREE.Mesh(mastGeo, mastMat);
    altGaugeGroup.add(mastMesh);

    // Altitude tick marks every 500m up to 4500m
    for (let h = 500; h <= 4500; h += 500) {
      const isMajor = h % 1000 === 0;
      const tickGeo = new THREE.BoxGeometry(isMajor ? 60 : 35, 2.5, 2.5);
      const tickMat = new THREE.MeshBasicMaterial({
        color: isMajor ? 0xffffff : 0x38bdf8,
        transparent: true,
        opacity: isMajor ? 0.9 : 0.65,
      });
      const tick = new THREE.Mesh(tickGeo, tickMat);
      tick.position.set(isMajor ? 30 : 18, h, 0);
      altGaugeGroup.add(tick);
    }
    scene.add(altGaugeGroup);
    altitudeGaugeGroupRef.current = altGaugeGroup;

    // -----------------------------------------------------------
    // 3D CRATER HAZARD PERIMETER RINGS (RADIUS STERIL KRB III)
    // -----------------------------------------------------------
    const hazardGroup = new THREE.Group();

    // 1.5 km Exclusion Zone at Sea Level (Red glowing perimeter)
    const hazardRingGeo = new THREE.RingGeometry(1485, 1515, 64);
    hazardRingGeo.rotateX(-Math.PI / 2);
    const hazardRingMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    const hazardRingMesh = new THREE.Mesh(hazardRingGeo, hazardRingMat);
    hazardRingMesh.position.y = 1.8;
    hazardGroup.add(hazardRingMesh);

    // Crater Rim 500m Perimeter at 157 mdpl (Yellow/Orange ring)
    const rimRingGeo = new THREE.RingGeometry(490, 508, 48);
    rimRingGeo.rotateX(-Math.PI / 2);
    const rimRingMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    const rimRingMesh = new THREE.Mesh(rimRingGeo, rimRingMat);
    rimRingMesh.position.y = 120;
    hazardGroup.add(rimRingMesh);

    // Active Vent Glowing Thermal Edge
    const ventRimGeo = new THREE.RingGeometry(25, 34, 32);
    ventRimGeo.rotateX(-Math.PI / 2);
    const ventRimMat = new THREE.MeshBasicMaterial({
      color: 0xff4500,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const ventRimMesh = new THREE.Mesh(ventRimGeo, ventRimMat);
    ventRimMesh.position.set(0, 157.2, 0);
    hazardGroup.add(ventRimMesh);

    scene.add(hazardGroup);
    hazardRingsGroupRef.current = hazardGroup;

    // -----------------------------------------------------------
    // DYNAMIC SURFACE ASH FALLOUT FOOTPRINT (ISOPACH DEPOSITION FAN)
    // -----------------------------------------------------------
    const fpAngle = 0.82;
    const fpGeo = new THREE.CircleGeometry(25000, 36, -fpAngle / 2, fpAngle);
    fpGeo.rotateX(-Math.PI / 2);
    fpGeo.rotateY(-Math.PI / 2);

    const fpPos = fpGeo.attributes.position;
    const fpColors = new Float32Array(fpPos.count * 3);
    for (let i = 0; i < fpPos.count; i++) {
      const x = fpPos.getX(i);
      const z = fpPos.getZ(i);
      const r = Math.hypot(x, z);

      if (r < 5000) {
        // Heavy Ash Fall (>10 mm)
        fpColors[i * 3] = 0.85;
        fpColors[i * 3 + 1] = 0.25;
        fpColors[i * 3 + 2] = 0.2;
      } else if (r < 14000) {
        // Moderate Ash Fall (1 - 10 mm)
        fpColors[i * 3] = 0.95;
        fpColors[i * 3 + 1] = 0.6;
        fpColors[i * 3 + 2] = 0.15;
      } else {
        // Light Ash & Aerosol (<1 mm)
        fpColors[i * 3] = 0.55;
        fpColors[i * 3 + 1] = 0.65;
        fpColors[i * 3 + 2] = 0.75;
      }
    }
    fpGeo.setAttribute('color', new THREE.BufferAttribute(fpColors, 3));

    const fpMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const fpMesh = new THREE.Mesh(fpGeo, fpMat);
    fpMesh.position.set(0, 1.4, 0);
    scene.add(fpMesh);
    ashFootprintMeshRef.current = fpMesh;

    // -----------------------------------------------------------
    // RESIZE OBSERVER & CLEANUP
    // -----------------------------------------------------------
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    applyCameraPreset('krakatau');

    return () => {
      resizeObserver.disconnect();
      renderer.dispose();
      scene.clear();
    };
  }, []);

  // -------------------------------------------------------------
  // UPDATE TRAJECTORY WHEN PARAMETERS CHANGE
  // -------------------------------------------------------------
  useEffect(() => {
    if (!sceneRef.current) return;

    const currentAzimuth = ballistic.launchAzimuth ?? launchAzimuth;

    // 1. Real Trajectory with air resistance
    const realTraj = computeTrajectory3D(
      ballistic,
      currentAzimuth,
      plume.windSpeed,
      plume.windDirection,
      ballistic.enableAirDrag
    );
    trajectoryDataRef.current = realTraj;

    if (trajLineRealRef.current) {
      const pts = realTraj.points.map((p) => new THREE.Vector3(p.x, p.y, p.z));
      trajLineRealRef.current.geometry.dispose();
      trajLineRealRef.current.geometry = new THREE.BufferGeometry().setFromPoints(pts);
    }

    // 2. Ideal Trajectory (vacuum parabola)
    const idealTraj = computeTrajectory3D(
      ballistic,
      currentAzimuth,
      plume.windSpeed,
      plume.windDirection,
      false
    );

    if (trajLineIdealRef.current) {
      const pts = idealTraj.points.map((p) => new THREE.Vector3(p.x, p.y, p.z));
      trajLineIdealRef.current.geometry.dispose();
      trajLineIdealRef.current.geometry = new THREE.BufferGeometry().setFromPoints(pts);
      trajLineIdealRef.current.computeLineDistances();
      trajLineIdealRef.current.visible = showVacuumTrajectory;
    }

    // Spawn volcanic shower bursts
    const shower = [];
    for (let i = 0; i < 18; i++) {
      const spreadAngle = (Math.random() - 0.5) * 18;
      const spreadAzimuth = currentAzimuth + (Math.random() - 0.5) * 45;
      const speedFactor = 0.65 + Math.random() * 0.45;

      const subTraj = computeTrajectory3D(
        {
          ...ballistic,
          launchAngle: Math.max(30, Math.min(85, ballistic.launchAngle + spreadAngle)),
          initialVelocity: ballistic.initialVelocity * speedFactor,
          rockDiameter: Math.max(0.1, ballistic.rockDiameter * (0.3 + Math.random() * 0.7)),
        },
        spreadAzimuth,
        plume.windSpeed,
        plume.windDirection,
        true
      );

      shower.push({
        traj: subTraj,
        timeOffset: Math.random() * 0.5,
      });
    }
    bombShowerRef.current = shower;
    simTimeRef.current = 0;
  }, [ballistic, plume, launchAzimuth, triggerCount, showVacuumTrajectory]);

  // -------------------------------------------------------------
  // LIGHTING & ATMOSPHERE UPDATE
  // -------------------------------------------------------------
  useEffect(() => {
    if (!sceneRef.current || !sunLightRef.current || !ambientLightRef.current) return;

    switch (lightingMode) {
      case 'day':
        sceneRef.current.background = new THREE.Color(0x87ceeb);
        if (sceneRef.current.fog) (sceneRef.current.fog as THREE.FogExp2).color.set(0x87ceeb);
        sunLightRef.current.color.set(0xfffbeb);
        sunLightRef.current.intensity = 1.6;
        ambientLightRef.current.color.set(0xe0f2fe);
        ambientLightRef.current.intensity = 0.6;
        break;

      case 'sunset':
        sceneRef.current.background = new THREE.Color(0x1a0f1d);
        if (sceneRef.current.fog) (sceneRef.current.fog as THREE.FogExp2).color.set(0x1a0f1d);
        sunLightRef.current.color.set(0xf97316);
        sunLightRef.current.intensity = 1.3;
        ambientLightRef.current.color.set(0xfda4af);
        ambientLightRef.current.intensity = 0.35;
        break;

      case 'night':
        sceneRef.current.background = new THREE.Color(0x030712);
        if (sceneRef.current.fog) (sceneRef.current.fog as THREE.FogExp2).color.set(0x030712);
        sunLightRef.current.color.set(0x38bdf8);
        sunLightRef.current.intensity = 0.25;
        ambientLightRef.current.color.set(0x1e293b);
        ambientLightRef.current.intensity = 0.2;
        break;
    }
  }, [lightingMode]);

  // -------------------------------------------------------------
  // ANIMATION & RENDER LOOP
  // -------------------------------------------------------------
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    const dummyObj = new THREE.Object3D();
    let frameCount = 0;

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (time - lastTime) / 1000);
      lastTime = time;
      frameCount++;

      const orbit = orbitRef.current;

      // 1. Smooth Camera Target & Orbit Lerp
      if (autoRotate && !orbit.isDragging) {
        orbit.targetTheta += 0.14 * dt;
      }

      // Smooth camera interpolation for buttery smooth rotation and zoom
      orbit.target.lerp(orbit.destTarget, 0.12);
      orbit.radius = THREE.MathUtils.lerp(orbit.radius, orbit.targetRadius, 0.16);
      orbit.theta = THREE.MathUtils.lerp(orbit.theta, orbit.targetTheta, 0.2);
      orbit.phi = THREE.MathUtils.lerp(orbit.phi, orbit.targetPhi, 0.2);

      // Constrain polar angle
      orbit.phi = Math.max(0.08, Math.min(Math.PI / 2 - 0.02, orbit.phi));
      orbit.targetPhi = Math.max(0.08, Math.min(Math.PI / 2 - 0.02, orbit.targetPhi));

      // Throttled update of zoom state in React UI
      if (frameCount % 6 === 0) {
        setZoomDistance(Math.round(orbit.radius));
      }

      // Camera Position in Cartesian coordinates
      if (cameraRef.current) {
        const camX = orbit.target.x + orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta);
        const camY = orbit.target.y + orbit.radius * Math.cos(orbit.phi);
        const camZ = orbit.target.z + orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta);

        cameraRef.current.position.set(camX, camY, camZ);
        cameraRef.current.lookAt(orbit.target);

        // Project 3D Geological Landmark Pins to Screen Coordinates
        if (showGeologicalLabels && containerRef.current && frameCount % 3 === 0) {
          const w = containerRef.current.clientWidth;
          const h = containerRef.current.clientHeight;

          const screenPositions: LandmarkScreenPos[] = GEOLOGICAL_LANDMARKS.map((lm) => {
            const p = new THREE.Vector3(lm.position.x, lm.position.y, lm.position.z);
            p.project(cameraRef.current!);
            const visible = p.z < 1.0;
            const sx = (p.x * 0.5 + 0.5) * w;
            const sy = (-(p.y * 0.5) + 0.5) * h;

            return {
              id: lm.id,
              landmark: lm,
              x: Math.round(sx),
              y: Math.round(sy),
              visible: visible && sx >= 30 && sx <= w - 30 && sy >= 40 && sy <= h - 40,
            };
          });

          setLandmarkScreenPositions(screenPositions);
        }
      }

      // 2. Advance Trajectory Simulation Time
      simTimeRef.current += dt;
      const t = simTimeRef.current;
      const traj = trajectoryDataRef.current;

      if (traj && traj.points && traj.points.length > 0) {
        const points = traj.points;
        const ptIndex = points.findIndex((p: any) => p.t >= t);

        if (ptIndex !== -1) {
          const pt = points[ptIndex];
          if (mainBombRef.current) {
            mainBombRef.current.position.set(pt.x, pt.y, pt.z);
            mainBombRef.current.visible = true;
            mainBombRef.current.rotation.x += 4 * dt;
            mainBombRef.current.rotation.y += 3 * dt;
          }

          if (bombLightRef.current) {
            bombLightRef.current.position.set(pt.x, pt.y, pt.z);
          }

          if (cameraPreset === 'follow' && cameraRef.current) {
            orbit.destTarget.set(pt.x, pt.y, pt.z);
            orbit.targetRadius = 450;
          }

          setActiveTelemetry({
            bombAlt: Math.round(pt.y),
            bombDist: Math.round(Math.hypot(pt.x, pt.z)),
            bombSpeed: Math.round(pt.speed),
            flightTime: parseFloat(t.toFixed(1)),
            landed: false,
            impactSpeed: Math.round(traj.impactSpeed),
          });
        } else {
          // Landed in ocean
          if (mainBombRef.current) {
            const lastPt = points[points.length - 1];
            mainBombRef.current.position.set(lastPt.x, 0, lastPt.z);
            mainBombRef.current.visible = false;
          }
          setActiveTelemetry((prev) => ({
            ...prev,
            landed: true,
          }));
        }
      }

      // 3. Animate Volcanic Crater Vent Light Pulse
      if (ventLightRef.current) {
        const pulse = Math.sin(time * 0.005) * 0.5 + 0.5;
        ventLightRef.current.intensity = (lightingMode === 'night' ? 6.5 : 3.8) + pulse * 2.5;
      }

      // 4. Animate Fumarole & Solfatara Steam Plumes
      if (fumaroleParticlesRef.current) {
        const { mesh, data } = fumaroleParticlesRef.current;
        const windRad = (plume.windDirection * Math.PI) / 180;
        const wx = -plume.windSpeed * Math.sin(windRad) * 1.5;
        const wz = plume.windSpeed * Math.cos(windRad) * 1.5;

        for (let i = 0; i < data.length; i++) {
          const f = data[i];
          f.y += f.vy * dt;
          f.x += (wx + f.vx) * dt;
          f.z += (wz + f.vz) * dt;
          f.scale += dt * 8;
          f.life += dt * 0.5;

          if (f.life > f.maxLife || f.y > f.originY + 120) {
            f.life = 0;
            f.x = f.originX + (Math.random() - 0.5) * 6;
            f.y = f.originY + Math.random() * 5;
            f.z = f.originZ + (Math.random() - 0.5) * 6;
            f.scale = 3 + Math.random() * 5;
          }

          dummyObj.position.set(f.x, f.y, f.z);
          dummyObj.scale.set(f.scale, f.scale, f.scale);
          dummyObj.updateMatrix();
          mesh.setMatrixAt(i, dummyObj.matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
      }

      // 5. Animate Real-Time Volcanic Ash Plume (Convective Column, Umbrella Cloud, and Selat Sunda Downwind Dispersion)
      if (plumeParticlesRef.current) {
        const { mesh, data } = plumeParticlesRef.current;
        mesh.visible = showAshCloud3D;

        if (showAshCloud3D) {
          const windRad = (plume.windDirection * Math.PI) / 180;
          // Three.js coordinates: +X is East, -X is West, -Z is North, +Z is South
          // If wind blows towards windDirection:
          const windDirX = Math.sin(windRad);
          const windDirZ = -Math.cos(windRad);
          const windVelocity = plume.windSpeed;
          const maxH = plume.columnHeight;

          for (let i = 0; i < data.length; i++) {
            const p = data[i];
            p.age += dt;

            if (p.phase === 'column') {
              // Convective column ascent above crater
              p.y += p.vy * dt * 12;
              p.x += p.vx * dt;
              p.z += p.vz * dt;
              p.scale += dt * 14;

              // Transition to umbrella cloud as it nears maximum column height
              if (p.y >= 157 + maxH * 0.72) {
                p.phase = 'umbrella';
                p.radialSpeed = 16 + Math.random() * 26;
                p.radialAngle = Math.random() * Math.PI * 2;
              }
            } else if (p.phase === 'umbrella') {
              // Umbrella cloud radial boiling & expansion at neutral buoyancy level
              p.x += Math.cos(p.radialAngle) * p.radialSpeed * dt;
              p.z += Math.sin(p.radialAngle) * p.radialSpeed * dt;
              p.scale += dt * 18;

              // Transition to downwind drift
              if (p.scale > 110 || p.age > 3.5) {
                p.phase = 'drift';
              }
            } else {
              // Drift phase: carried downwind across the Sunda Strait map!
              const travelSpeed = windVelocity * 28; // calibrated for fluid visual continuous flow
              p.x += windDirX * travelSpeed * dt + p.turbX * dt;
              p.z += windDirZ * travelSpeed * dt + p.turbZ * dt;

              // Slow gravitational settling
              p.y = Math.max(25, p.y - p.settlingRate * dt);

              // Gaussian puff expansion with distance
              p.scale += dt * (10 + windVelocity * 0.35);

              // Downwind distance check
              const distFromVent = Math.hypot(p.x, p.z);
              if (distFromVent > 48000 || p.age > p.maxLife || p.scale > 850) {
                // Recycle particle at crater vent
                p.x = (Math.random() - 0.5) * 35;
                p.y = 157 + Math.random() * 25;
                p.z = (Math.random() - 0.5) * 35;
                p.scale = 16 + Math.random() * 20;
                p.vx = (Math.random() - 0.5) * 8;
                p.vz = (Math.random() - 0.5) * 8;
                p.vy = 22 + Math.random() * 26;
                p.phase = 'column';
                p.age = 0;
              }
            }

            // Realistic Multi-Phase Volcanic Smoke & Ash Color Gradation
            if (p.phase === 'column') {
              if (p.y < 280) {
                // Incandescent vent gas thrust jet
                const hot = Math.max(0, (280 - p.y) / 123);
                mesh.setColorAt(i, new THREE.Color(0.95 * hot + 0.18 * (1 - hot), 0.32 * hot + 0.16 * (1 - hot), 0.08 * hot + 0.16 * (1 - hot)));
              } else {
                // Heavy dark andesitic ash
                mesh.setColorAt(i, new THREE.Color(0.18, 0.18, 0.19));
              }
            } else if (p.phase === 'umbrella') {
              // Silicate ash umbrella cloud
              mesh.setColorAt(i, new THREE.Color(0.28, 0.27, 0.29));
            } else {
              // Downwind drift: fading into sulfate aerosol haze
              const driftProgress = Math.min(1.0, Math.hypot(p.x, p.z) / 35000);
              mesh.setColorAt(i, new THREE.Color(0.32 + driftProgress * 0.24, 0.33 + driftProgress * 0.26, 0.36 + driftProgress * 0.3));
            }

            dummyObj.position.set(p.x, p.y, p.z);
            dummyObj.scale.set(p.scale, p.scale, p.scale);
            dummyObj.updateMatrix();
            mesh.setMatrixAt(i, dummyObj.matrix);
          }
          mesh.instanceMatrix.needsUpdate = true;
          if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        }
      }

      // 5b. Animate Real-Time Surface Ash Fallout Footprint Mesh
      if (ashFootprintMeshRef.current) {
        ashFootprintMeshRef.current.visible = showAshFootprint;
        if (showAshFootprint) {
          const windRad = (plume.windDirection * Math.PI) / 180;
          ashFootprintMeshRef.current.rotation.y = -windRad;
          const scaleDist = Math.max(0.4, Math.min(2.0, (10000 + plume.windSpeed * 1500) / 25000));
          ashFootprintMeshRef.current.scale.set(scaleDist * 0.9, 1, scaleDist);
        }
      }

      // 5c. Animate Volcanic Ash Rain (Falling Ash Curtains)
      if (ashRainParticlesRef.current) {
        const { mesh, data } = ashRainParticlesRef.current;
        mesh.visible = showAshRain && showAshCloud3D;
        if (showAshRain && showAshCloud3D) {
          const windRad = (plume.windDirection * Math.PI) / 180;
          const windDirX = Math.sin(windRad);
          const windDirZ = -Math.cos(windRad);
          const windVelocity = plume.windSpeed;

          for (let i = 0; i < data.length; i++) {
            const r = data[i];
            r.y -= r.fallSpeed * dt;
            r.x += (windDirX * windVelocity * 24 + r.driftX) * dt;
            r.z += (windDirZ * windVelocity * 24 + r.driftZ) * dt;

            if (r.y <= 2) {
              const pDist = Math.random() * Math.min(38000, 6000 + windVelocity * 1300);
              r.x = windDirX * pDist + (Math.random() - 0.5) * (pDist * 0.4 + 120);
              r.y = 157 + plume.columnHeight * (0.55 + Math.random() * 0.45);
              r.z = windDirZ * pDist + (Math.random() - 0.5) * (pDist * 0.4 + 120);
            }

            dummyObj.position.set(r.x, r.y, r.z);
            dummyObj.scale.set(r.scale, r.scale, r.scale);
            dummyObj.updateMatrix();
            mesh.setMatrixAt(i, dummyObj.matrix);
          }
          mesh.instanceMatrix.needsUpdate = true;
        }
      }

      // 5d. Animate Volcanic Lightning in Ash Plume
      if (lightningMeshRef.current && lightningLightRef.current) {
        const mesh = lightningMeshRef.current;
        const light = lightningLightRef.current;
        if (!showVolcanicLightning || !showAshCloud3D) {
          mesh.visible = false;
          light.intensity = 0;
        } else {
          lightningCooldownRef.current -= dt;
          if (lightningCooldownRef.current <= 0) {
            lightningCooldownRef.current = 1.6 + Math.random() * 2.4;
            mesh.visible = true;

            const pts: THREE.Vector3[] = [];
            let lx = (Math.random() - 0.5) * 55;
            let ly = 240 + Math.random() * Math.min(plume.columnHeight * 0.8, 2200);
            let lz = (Math.random() - 0.5) * 55;
            pts.push(new THREE.Vector3(lx, ly, lz));

            const segs = 8 + Math.floor(Math.random() * 5);
            const segStepY = ly / segs;
            for (let s = 0; s < segs; s++) {
              lx += (Math.random() - 0.5) * 65;
              ly -= segStepY * (0.8 + Math.random() * 0.4);
              lz += (Math.random() - 0.5) * 65;
              pts.push(new THREE.Vector3(lx, Math.max(160, ly), lz));
            }

            mesh.geometry.dispose();
            mesh.geometry = new THREE.BufferGeometry().setFromPoints(pts);
            (mesh.material as THREE.LineBasicMaterial).opacity = 1.0;

            light.position.set(lx, pts[0].y * 0.65, lz);
            light.intensity = 22.0;
          } else {
            const mat = mesh.material as THREE.LineBasicMaterial;
            mat.opacity = Math.max(0, mat.opacity - dt * 4.8);
            light.intensity = Math.max(0, light.intensity - dt * 85);
            if (mat.opacity <= 0.05) {
              mesh.visible = false;
            }
          }
        }
      }

      // 5e. Animate Pyroclastic Density Current Avalanches (Awan Panas Guguran)
      if (pyroclasticParticlesRef.current) {
        const { mesh, data } = pyroclasticParticlesRef.current;
        mesh.visible = showPyroclasticFlow;
        if (showPyroclasticFlow) {
          for (let i = 0; i < data.length; i++) {
            const p = data[i];
            p.progress += dt * p.speed;
            if (p.progress >= 1.0) {
              p.progress = 0;
              p.scale = p.initScale;
            }
            p.x = p.startX + (p.endX - p.startX) * p.progress + (Math.random() - 0.5) * (p.progress * 30);
            p.z = p.startZ + (p.endZ - p.startZ) * p.progress + (Math.random() - 0.5) * (p.progress * 30);
            p.y = Math.max(0, p.startY + (p.endY - p.startY) * Math.pow(p.progress, 0.75) + Math.sin(p.progress * Math.PI) * (p.progress * 15));
            p.scale = p.initScale + p.progress * 32;

            dummyObj.position.set(p.x, p.y, p.z);
            dummyObj.scale.set(p.scale, p.scale, p.scale);
            dummyObj.updateMatrix();
            mesh.setMatrixAt(i, dummyObj.matrix);
          }
          mesh.instanceMatrix.needsUpdate = true;
        }
      }

      // 5f. Altitude Gauge & Hazard Rings Visibility
      if (altitudeGaugeGroupRef.current) {
        altitudeGaugeGroupRef.current.visible = showAltitudeGauge;
      }
      if (hazardRingsGroupRef.current) {
        hazardRingsGroupRef.current.visible = showHazardZones;
      }

      // 6. Animate Cargo Ship along ALKI I
      if (shipMeshRef.current) {
        shipMeshRef.current.position.z += 12 * dt;
        if (shipMeshRef.current.position.z > 22000) {
          shipMeshRef.current.position.z = -22000;
        }
      }

      // Render scene
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [
    autoRotate,
    cameraPreset,
    lightingMode,
    plume,
    showGeologicalLabels,
    showAshCloud3D,
    showAshFootprint,
    showVolcanicLightning,
    showAshRain,
    showAltitudeGauge,
    showPyroclasticFlow,
    showHazardZones,
  ]);

  // -------------------------------------------------------------
  // MOUSE & TOUCH ORBIT / ZOOM CONTROLS
  // -------------------------------------------------------------
  const handleMouseDown = (e: React.MouseEvent) => {
    orbitRef.current.isDragging = true;
    orbitRef.current.isPanning = e.button === 2; // right click = pan
    orbitRef.current.lastMouseX = e.clientX;
    orbitRef.current.lastMouseY = e.clientY;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const orbit = orbitRef.current;
    if (!orbit.isDragging) return;

    const dx = e.clientX - orbit.lastMouseX;
    const dy = e.clientY - orbit.lastMouseY;
    orbit.lastMouseX = e.clientX;
    orbit.lastMouseY = e.clientY;

    if (orbit.isPanning) {
      const factor = orbit.radius * 0.001;
      orbit.destTarget.x -= dx * factor * Math.cos(orbit.theta);
      orbit.destTarget.z += dx * factor * Math.sin(orbit.theta);
      orbit.destTarget.y += dy * factor;
    } else {
      orbit.targetTheta -= dx * 0.006;
      orbit.targetPhi -= dy * 0.006;
    }
  };

  const handleMouseUp = () => {
    orbitRef.current.isDragging = false;
    orbitRef.current.isPanning = false;
  };

  // INTEGRATED WHEEL ZOOM WITH SMOOTH DAMPENING & SENSITIVITY
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Sensitivity factor based on user selection
    const speedFactor =
      scrollSensitivity === 'fine' ? 0.0006 : scrollSensitivity === 'fast' ? 0.0022 : 0.0012;

    const zoomDelta = e.deltaY * speedFactor;
    const newTarget = Math.max(250, Math.min(50000, orbitRef.current.targetRadius * (1 + zoomDelta)));
    orbitRef.current.targetRadius = newTarget;
  };

  // Double-click to zoom in 2x
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    orbitRef.current.targetRadius = Math.max(250, orbitRef.current.targetRadius * 0.55);
  };

  // Touch Support for Mobile & Tablets
  const lastTouchDistRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      orbitRef.current.isDragging = true;
      orbitRef.current.isPanning = false;
      orbitRef.current.lastMouseX = e.touches[0].clientX;
      orbitRef.current.lastMouseY = e.touches[0].clientY;
      lastTouchDistRef.current = null;
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDistRef.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && orbitRef.current.isDragging) {
      const dx = e.touches[0].clientX - orbitRef.current.lastMouseX;
      const dy = e.touches[0].clientY - orbitRef.current.lastMouseY;
      orbitRef.current.lastMouseX = e.touches[0].clientX;
      orbitRef.current.lastMouseY = e.touches[0].clientY;

      orbitRef.current.targetTheta -= dx * 0.006;
      orbitRef.current.targetPhi -= dy * 0.006;
    } else if (e.touches.length === 2 && lastTouchDistRef.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = lastTouchDistRef.current / dist;
      orbitRef.current.targetRadius = Math.max(250, Math.min(50000, orbitRef.current.targetRadius * ratio));
      lastTouchDistRef.current = dist;
    }
  };

  const handleTouchEnd = () => {
    orbitRef.current.isDragging = false;
    lastTouchDistRef.current = null;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[620px] sm:h-[720px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl select-none touch-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* 3D GEOLOGICAL LANDMARK INTERACTIVE PINS */}
      {showGeologicalLabels &&
        landmarkScreenPositions.map(
          (pos) =>
            pos.visible && (
              <div
                key={pos.id}
                style={{
                  transform: `translate(${pos.x}px, ${pos.y}px) translate(-50%, -100%)`,
                }}
                className="absolute top-0 left-0 pointer-events-auto z-20 group"
              >
                <button
                  onClick={() => {
                    setSelectedLandmark(pos.landmark);
                    handleFocusLandmark(pos.landmark);
                  }}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-950/90 hover:bg-slate-900 border border-white/20 hover:border-cyan-400 shadow-xl backdrop-blur-md text-[11px] font-medium text-white transition-all transform hover:scale-110 active:scale-95"
                >
                  <span className="text-xs">{pos.landmark.icon}</span>
                  <span className="font-semibold whitespace-nowrap">{pos.landmark.name}</span>
                </button>
                {/* Pointer pin needle */}
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-cyan-400 mx-auto" />
              </div>
            )
        )}

      {/* TOP CENTER: 3D CRATER ERUPTION DETAIL & TELEMETRY HUD */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
        <CraterEruptionDetailHUD
          plume={plume}
          onSelectPreset={applyCameraPreset}
          showLightning={showVolcanicLightning}
          onToggleLightning={() => setShowVolcanicLightning(!showVolcanicLightning)}
          showAshRain={showAshRain}
          onToggleAshRain={() => setShowAshRain(!showAshRain)}
          showAltitudeGauge={showAltitudeGauge}
          onToggleAltitudeGauge={() => setShowAltitudeGauge(!showAltitudeGauge)}
          showPyroclasticFlow={showPyroclasticFlow}
          onTogglePyroclasticFlow={() => setShowPyroclasticFlow(!showPyroclasticFlow)}
          showHazardZones={showHazardZones}
          onToggleHazardZones={() => setShowHazardZones(!showHazardZones)}
        />
      </div>

      {/* TOP LEFT: Quick Preset Camera Toolbar, Azimuth, and Ash Dispersal Control Card */}
      <div className="absolute top-4 left-4 z-10 max-w-xs pointer-events-auto">
        {!isLeftPanelOpen ? (
          <button
            onClick={() => setIsLeftPanelOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/90 hover:bg-zinc-900 border border-zinc-800 text-xs font-semibold text-white shadow-2xl backdrop-blur-xl transition-all"
            title="Buka Panel Kamera & Dispersi"
          >
            <Eye className="w-4 h-4 text-white" />
            <span>Kamera & Abu 3D</span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
          </button>
        ) : (
          <div className="flex flex-col gap-2.5 max-h-[calc(100vh-8rem)] overflow-y-auto pr-1 scrollbar-none animate-in fade-in slide-in-from-left-2 duration-200">
            {/* Top Navigation Switcher (Kamera vs Dispersi Abu) */}
            <div className="bg-black/92 backdrop-blur-xl p-2 rounded-2xl border border-zinc-800 shadow-2xl flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setLeftTab('camera')}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                    leftTab === 'camera'
                      ? 'bg-white text-black font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Kamera & Azimut</span>
                </button>
                <button
                  onClick={() => setLeftTab('ash')}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                    leftTab === 'ash'
                      ? 'bg-white text-black font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <span>☁️</span>
                  <span>Dispersi Abu</span>
                </button>
              </div>

              <button
                onClick={() => setIsLeftPanelOpen(false)}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                title="Ciutkan Panel"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {leftTab === 'camera' ? (
              <>
                <div className="bg-black/90 backdrop-blur-xl p-3.5 rounded-2xl border border-zinc-800 text-xs text-zinc-200 shadow-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-2 text-white">
                      <Eye className="w-4 h-4 text-white" />
                      Preset Kamera 3D
                    </span>
                    <span className="text-[10px] font-mono text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-750">
                      Selat Sunda
                    </span>
                  </div>

                  {/* Preset Buttons */}
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    {[
                      { id: 'crater', label: '🌋 Kawah Dekat' },
                      { id: 'rim', label: '⛰️ Bibir Kawah 157m' },
                      { id: 'krakatau', label: '🏝️ Anak Krakatau' },
                      { id: 'orbit', label: '🛰️ Orbit Selat Sunda' },
                      { id: 'anyer', label: '🌅 Tampak Banten' },
                      { id: 'kalianda', label: '⛰️ Tampak Lampung' },
                      { id: 'ship', label: '🚢 Kapal ALKI I' },
                      { id: 'follow', label: '🎯 Ikuti Bom' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        onClick={() => applyCameraPreset(p.id as CameraPreset3D)}
                        className={`px-2.5 py-1.5 rounded-xl text-left font-medium transition-all border ${
                          cameraPreset === p.id
                            ? 'bg-white text-black font-bold border-white shadow-sm'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-850 hover:border-zinc-700'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Lighting Mode Selector */}
                  <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400 font-medium">Waktu / Atmosfer:</span>
                    <div className="flex items-center gap-1 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800">
                      <button
                        onClick={() => setLightingMode('day')}
                        className={`p-1.5 rounded-md transition-all ${
                          lightingMode === 'day' ? 'bg-white text-black font-bold' : 'text-zinc-400 hover:text-white'
                        }`}
                        title="Siang Hari"
                      >
                        <Sun className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setLightingMode('sunset')}
                        className={`p-1.5 rounded-md transition-all ${
                          lightingMode === 'sunset' ? 'bg-white text-black font-bold' : 'text-zinc-400 hover:text-white'
                        }`}
                        title="Senja Magma"
                      >
                        <Sunset className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setLightingMode('night')}
                        className={`p-1.5 rounded-md transition-all ${
                          lightingMode === 'night' ? 'bg-white text-black font-bold' : 'text-zinc-400 hover:text-white'
                        }`}
                        title="Malam Erupsi"
                      >
                        <Moon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3D Launch Azimuth Dial */}
                <div className="bg-black/90 backdrop-blur-xl p-3 rounded-2xl border border-zinc-800 text-xs text-zinc-200 shadow-2xl space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-white" />
                      Azimut Lontaran 3D:
                    </span>
                    <span className="font-mono font-bold text-white bg-zinc-900 px-2 py-0.5 rounded border border-zinc-700">
                      {launchAzimuth}° (
                      {launchAzimuth >= 315 || launchAzimuth < 45
                        ? 'U'
                        : launchAzimuth < 135
                        ? 'T'
                        : launchAzimuth < 225
                        ? 'S'
                        : 'B'}
                      )
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={359}
                    step={5}
                    value={launchAzimuth}
                    onChange={(e) => handleAzimuthChange(Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-800 rounded-lg cursor-pointer accent-white"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-zinc-500">
                    <span>0° (U)</span>
                    <span>90° (T/Jawa)</span>
                    <span>180° (S/Rakata)</span>
                    <span>270° (B/Smtr)</span>
                  </div>
                </div>
              </>
            ) : (
              /* REAL-TIME VOLCANIC ASH DISPERSAL SIMULATION CARD */
              <AshDispersalControlCard
                plume={plume}
                onUpdateWind={onUpdateWind}
                showAshCloud3D={showAshCloud3D}
                onToggleAshCloud3D={() => setShowAshCloud3D(!showAshCloud3D)}
                showAshFootprint={showAshFootprint}
                onToggleAshFootprint={() => setShowAshFootprint(!showAshFootprint)}
                downwindReachKm={downwindReachKm}
              />
            )}
          </div>
        )}
      </div>

      {/* TOP RIGHT: Real-time Telemetry & INTEGRATED ZOOM BAR */}
      <div className="absolute top-4 right-4 z-10 w-72 sm:w-80 pointer-events-auto">
        {!isRightPanelOpen ? (
          <div className="flex justify-end">
            <button
              onClick={() => setIsRightPanelOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/90 hover:bg-zinc-900 border border-zinc-800 text-xs font-semibold text-white shadow-2xl backdrop-blur-xl transition-all"
              title="Buka Panel Telemetri & Zoom"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-zinc-400" />
              <Mountain className="w-4 h-4 text-amber-400 stroke-[2.2] fill-amber-500/20" />
              <span>Telemetri & Lapisan</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 max-h-[calc(100vh-8rem)] overflow-y-auto pr-0.5 scrollbar-none animate-in fade-in slide-in-from-right-2 duration-200">
            {/* Real-time 3D Telemetry HUD */}
            <div className="bg-black/90 backdrop-blur-xl p-3.5 rounded-2xl border border-zinc-800 text-xs text-zinc-200 shadow-2xl space-y-2">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="font-bold flex items-center gap-1.5 text-white">
                  <Mountain className="w-4 h-4 text-amber-400 stroke-[2.2] fill-amber-500/20" />
                  Telemetri Bom Vulkanik 3D
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                    t = {activeTelemetry.flightTime}s
                  </span>
                  <button
                    onClick={() => setIsRightPanelOpen(false)}
                    className="p-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                    title="Ciutkan Panel"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-850">
                  <span className="text-[10px] text-zinc-400 block font-sans">Ketinggian (Y)</span>
                  <span className="text-sm font-bold text-white">{activeTelemetry.bombAlt} m</span>
                </div>
                <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-850">
                  <span className="text-[10px] text-zinc-400 block font-sans">Jarak Vent (XZ)</span>
                  <span
                    className={`text-sm font-bold ${
                      activeTelemetry.bombDist >= 5000 ? 'text-amber-400' : 'text-zinc-200'
                    }`}
                  >
                    {(activeTelemetry.bombDist / 1000).toFixed(2)} km
                  </span>
                </div>
                <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-850">
                  <span className="text-[10px] text-zinc-400 block font-sans">Kecepatan</span>
                  <span className="text-sm font-bold text-white">{activeTelemetry.bombSpeed} m/s</span>
                </div>
                <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-850">
                  <span className="text-[10px] text-zinc-400 block font-sans">Status Benturan</span>
                  <span
                    className={`text-[11px] font-bold ${
                      activeTelemetry.landed ? 'text-sky-300' : 'text-amber-300'
                    }`}
                  >
                    {activeTelemetry.landed ? '🌊 Air Laut' : '🚀 Melayang'}
                  </span>
                </div>
              </div>

              {activeTelemetry.bombDist >= 5000 && (
                <div className="p-2 rounded-xl bg-red-950/80 border border-red-800/80 flex items-center gap-2 text-[11px] text-red-200">
                  <AlertOctagon className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>Bom menembus zona steril KRB III (5.0 km)!</span>
                </div>
              )}
            </div>

            {/* INTEGRATED ZOOM CONTROL BAR (ZOOM IN / OUT / SLIDER / PRESETS) */}
            <Map3DZoomBar
              zoomDistance={zoomDistance}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetZoom={handleResetZoom}
              onSliderChange={handleSliderChange}
              scrollSensitivity={scrollSensitivity}
              onChangeSensitivity={setScrollSensitivity}
              onSelectDistancePreset={handleSelectDistancePreset}
              showGeologicalLabels={showGeologicalLabels}
              onToggleGeologicalLabels={() => setShowGeologicalLabels(!showGeologicalLabels)}
            />

            {/* Layer Toggles */}
            <div className="bg-black/90 backdrop-blur-xl p-3 rounded-2xl border border-zinc-800 text-xs text-zinc-300 shadow-2xl space-y-2">
              <span className="font-semibold text-white flex items-center gap-1.5 text-[11px]">
                <Layers className="w-3.5 h-3.5 text-white" />
                Lapisan Visualisasi 3D:
              </span>
              <div className="space-y-1.5 text-[11px]">
                <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={showAshCloud3D}
                    onChange={(e) => setShowAshCloud3D(e.target.checked)}
                    className="rounded border-zinc-700 text-white focus:ring-0"
                  />
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
                    Kolom & Payung Abu ({plume.windSpeed} m/s)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={showAshRain}
                    onChange={(e) => setShowAshRain(e.target.checked)}
                    className="rounded border-zinc-700 text-white focus:ring-0"
                  />
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-500" />
                    Hujan Abu Vulkanik & Tirai Jatuhan
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={showVolcanicLightning}
                    onChange={(e) => setShowVolcanicLightning(e.target.checked)}
                    className="rounded border-zinc-700 text-white focus:ring-0"
                  />
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                    Petir Vulkanik Awan Abu
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={showPyroclasticFlow}
                    onChange={(e) => setShowPyroclasticFlow(e.target.checked)}
                    className="rounded border-zinc-700 text-white focus:ring-0"
                  />
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                    Awan Panas Guguran (PDC) Lereng
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={showHazardZones}
                    onChange={(e) => setShowHazardZones(e.target.checked)}
                    className="rounded border-zinc-700 text-white focus:ring-0"
                  />
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    Radius Bahaya 1.5 km (KRB III)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={showAltitudeGauge}
                    onChange={(e) => setShowAltitudeGauge(e.target.checked)}
                    className="rounded border-zinc-700 text-white focus:ring-0"
                  />
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                    Mistar Ketinggian Erupsi 3D
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={showAshFootprint}
                    onChange={(e) => setShowAshFootprint(e.target.checked)}
                    className="rounded border-zinc-700 text-white focus:ring-0"
                  />
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-white/70" />
                    Isopach Sebaran Abu Laut (~{downwindReachKm.toFixed(0)} km)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={showVacuumTrajectory}
                    onChange={(e) => setShowVacuumTrajectory(e.target.checked)}
                    className="rounded border-zinc-700 text-white focus:ring-0"
                  />
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-0.5 bg-zinc-400" />
                    Parabola Vakum (Garis Putus)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer hover:text-white">
                  <input
                    type="checkbox"
                    checked={autoRotate}
                    onChange={(e) => setAutoRotate(e.target.checked)}
                    className="rounded border-zinc-700 text-white focus:ring-0"
                  />
                  <span className="flex items-center gap-1.5">
                    <Rotate3d className="w-3.5 h-3.5 text-white" />
                    Putar Kamera Otomatis
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM LEFT: Quick Compass, Island Legend & Live Ash Dispersal Status */}
      <div className="absolute bottom-4 left-4 bg-black/90 backdrop-blur-xl p-2.5 sm:p-3 rounded-2xl border border-zinc-800 text-xs text-zinc-300 shadow-2xl flex flex-wrap items-center gap-2.5 sm:gap-3 pointer-events-auto">
        <div className="flex items-center gap-1.5 text-[11px]">
          <Mountain className="w-4 h-4 text-amber-400 stroke-[2.2] fill-amber-500/20" />
          <span className="font-bold text-white">Geologi & Abu:</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="flex items-center gap-1 text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-white" /> Kawah (157m)
          </span>
          <span className="flex items-center gap-1 text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-zinc-400" /> Sesar 2018
          </span>
          <span className="flex items-center gap-1 text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-zinc-500" /> Laguna Toska
          </span>
          <span className="flex items-center gap-1 text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-zinc-300" /> P. Rakata (813m)
          </span>
          <span className="hidden md:flex items-center gap-1 text-white bg-zinc-900 px-2 py-0.5 rounded border border-zinc-700">
            💨 Abu: {plume.windSpeed} m/s ({plume.windDirection}°)
          </span>
        </div>
      </div>

      {/* BOTTOM RIGHT: Drag / Mouse Hints & Quick Scroll Status */}
      <div className="absolute bottom-4 right-4 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-800 text-[10px] text-zinc-400 font-mono pointer-events-none hidden sm:flex items-center gap-2 shadow-lg">
        <span>🖱️ Putar: Klik + Geser</span>
        <span>•</span>
        <span>🔍 Zoom: Scroll / Cubit</span>
        <span>•</span>
        <span>📌 Pin: Fokus Lokasi</span>
      </div>

      {/* GEOLOGICAL LANDMARK DETAIL MODAL */}
      <LandmarkDetailModal
        landmark={selectedLandmark}
        onClose={() => setSelectedLandmark(null)}
        onFocusLandmark={(lm) => handleFocusLandmark(lm)}
      />
    </div>
  );
};
