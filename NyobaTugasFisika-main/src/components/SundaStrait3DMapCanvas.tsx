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
} from 'lucide-react';
import { BallisticParams, PlumeParams, CameraPreset3D, LightingMode3D } from '../types';
import { computeTrajectory3D } from '../physics/ballistics';
import { GEOLOGICAL_LANDMARKS, GeologicalLandmark3D } from '../data/landmarks';
import { Map3DZoomBar } from './Map3DZoomBar';
import { LandmarkDetailModal } from './LandmarkDetailModal';
import { AshDispersalControlCard } from './AshDispersalControlCard';

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

  // Zoom & Geological Controls
  const [zoomDistance, setZoomDistance] = useState<number>(1100);
  const [scrollSensitivity, setScrollSensitivity] = useState<'fine' | 'normal' | 'fast'>('normal');
  const [showGeologicalLabels, setShowGeologicalLabels] = useState<boolean>(true);
  const [selectedLandmark, setSelectedLandmark] = useState<GeologicalLandmark3D | null>(null);
  const [landmarkScreenPositions, setLandmarkScreenPositions] = useState<LandmarkScreenPos[]>([]);

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
  const ashFootprintMeshRef = useRef<THREE.Mesh | null>(null);
  const fumaroleParticlesRef = useRef<{ mesh: THREE.InstancedMesh; data: any[] } | null>(null);
  const bombShowerRef = useRef<any[]>([]);
  const splashRingsRef = useRef<any[]>([]);
  const shipMeshRef = useRef<THREE.Group | null>(null);

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
    const particleCount = 260;
    const pSphereGeo = new THREE.SphereGeometry(1, 8, 8);
    const pSphereMat = new THREE.MeshStandardMaterial({
      color: 0x4b5563,
      roughness: 0.95,
      transparent: true,
      opacity: 0.62,
    });
    const plumeInstanced = new THREE.InstancedMesh(pSphereGeo, pSphereMat, particleCount);
    scene.add(plumeInstanced);

    const plumeData = [];
    const windRadInit = (plume.windDirection * Math.PI) / 180;
    const initDirX = Math.sin(windRadInit);
    const initDirZ = -Math.cos(windRadInit);

    for (let i = 0; i < particleCount; i++) {
      const initialProgress = i / particleCount;
      const initialDist = initialProgress * Math.min(42000, 8000 + plume.windSpeed * 1400);

      const isDrift = initialProgress > 0.22;
      const isUmbrella = initialProgress > 0.12 && !isDrift;

      plumeData.push({
        x: isDrift ? initDirX * initialDist + (Math.random() - 0.5) * (initialDist * 0.35 + 80) : (Math.random() - 0.5) * 40,
        y: isDrift ? Math.max(80, 157 + plume.columnHeight * (1 - initialProgress * 0.4) - Math.random() * 300) : 157 + Math.random() * 80,
        z: isDrift ? initDirZ * initialDist + (Math.random() - 0.5) * (initialDist * 0.35 + 80) : (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 8,
        vy: 20 + Math.random() * 28,
        vz: (Math.random() - 0.5) * 8,
        turbX: (Math.random() - 0.5) * 25,
        turbZ: (Math.random() - 0.5) * 25,
        settlingRate: 15 + Math.random() * 25,
        scale: 18 + initialProgress * 420 + Math.random() * 30,
        life: Math.random(),
        age: initialProgress * 20,
        maxLife: 22 + Math.random() * 12,
        phase: isDrift ? 'drift' : isUmbrella ? 'umbrella' : 'column',
        radialSpeed: 15 + Math.random() * 25,
        radialAngle: Math.random() * Math.PI * 2,
      });
    }
    plumeParticlesRef.current = { mesh: plumeInstanced, data: plumeData };

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

            dummyObj.position.set(p.x, p.y, p.z);
            dummyObj.scale.set(p.scale, p.scale, p.scale);
            dummyObj.updateMatrix();
            mesh.setMatrixAt(i, dummyObj.matrix);
          }
          mesh.instanceMatrix.needsUpdate = true;
        }
      }

      // 5b. Animate Real-Time Surface Ash Fallout Footprint Mesh
      if (ashFootprintMeshRef.current) {
        ashFootprintMeshRef.current.visible = showAshFootprint;
        if (showAshFootprint) {
          const windRad = (plume.windDirection * Math.PI) / 180;
          // Rotate footprint fan to match wind direction (0° North = -Z, 90° East = +X, 180° South = +Z, 270° West = -X)
          ashFootprintMeshRef.current.rotation.y = -windRad;
          // Scale length with wind speed (up to 45km reach)
          const scaleDist = Math.max(0.4, Math.min(2.0, (10000 + plume.windSpeed * 1500) / 25000));
          ashFootprintMeshRef.current.scale.set(scaleDist * 0.9, 1, scaleDist);
        }
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
  }, [autoRotate, cameraPreset, lightingMode, plume, showGeologicalLabels, showAshCloud3D, showAshFootprint]);

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

      {/* TOP LEFT: Quick Preset Camera Toolbar, Azimuth, and Ash Dispersal Control Card */}
      <div className="absolute top-4 left-4 flex flex-col gap-2.5 z-10 max-w-xs max-h-[calc(100%-2rem)] overflow-y-auto pr-1 scrollbar-none">
        <div className="bg-black/90 backdrop-blur-xl p-3.5 rounded-2xl border border-zinc-800 text-xs text-zinc-200 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-2 text-white">
              <Eye className="w-4 h-4 text-white" />
              Kamera Peta 3D
            </span>
            <span className="text-[10px] font-mono text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-750">
              Selat Sunda
            </span>
          </div>

          {/* Preset Buttons */}
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            {[
              { id: 'krakatau', label: '🌋 Kawah Anak Krakatau' },
              { id: 'orbit', label: '🛰️ Orbit Selat Sunda' },
              { id: 'anyer', label: '🌅 Tampak Banten' },
              { id: 'kalianda', label: '⛰️ Tampak Lampung' },
              { id: 'ship', label: '🚢 Kapal ALKI I' },
              { id: 'follow', label: '🎯 Ikuti Bom Vulkanik' },
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

        {/* REAL-TIME VOLCANIC ASH DISPERSAL SIMULATION CARD */}
        <AshDispersalControlCard
          plume={plume}
          onUpdateWind={onUpdateWind}
          showAshCloud3D={showAshCloud3D}
          onToggleAshCloud3D={() => setShowAshCloud3D(!showAshCloud3D)}
          showAshFootprint={showAshFootprint}
          onToggleAshFootprint={() => setShowAshFootprint(!showAshFootprint)}
          downwindReachKm={downwindReachKm}
        />
      </div>

      {/* TOP RIGHT: Real-time Telemetry & INTEGRATED ZOOM BAR */}
      <div className="absolute top-4 right-4 flex flex-col gap-2.5 z-10 w-72 sm:w-80">
        {/* Real-time 3D Telemetry HUD */}
        <div className="bg-black/90 backdrop-blur-xl p-3.5 rounded-2xl border border-zinc-800 text-xs text-zinc-200 shadow-2xl space-y-2">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="font-bold flex items-center gap-1.5 text-white">
              <Flame className="w-4 h-4 text-white animate-pulse" />
              Telemetri Bom Vulkanik 3D
            </span>
            <span className="text-[10px] font-mono text-zinc-400">
              t = {activeTelemetry.flightTime}s
            </span>
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
                  activeTelemetry.bombDist >= 5000 ? 'text-white' : 'text-zinc-300'
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
                className="text-[11px] font-bold text-zinc-200"
              >
                {activeTelemetry.landed ? '🌊 Air Laut' : '🚀 Di Udara'}
              </span>
            </div>
          </div>

          {activeTelemetry.bombDist >= 5000 && (
            <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center gap-2 text-[11px] text-white">
              <AlertOctagon className="w-4 h-4 text-white flex-shrink-0" />
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
            Layer Visualisasi 3D:
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
                Awan Abu Vulkanik 3D ({plume.windSpeed} m/s)
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

      {/* BOTTOM LEFT: Quick Compass, Island Legend & Live Ash Dispersal Status */}
      <div className="absolute bottom-4 left-4 bg-black/90 backdrop-blur-xl p-3 rounded-2xl border border-zinc-800 text-xs text-zinc-300 shadow-2xl flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-[11px]">
          <Compass className="w-4 h-4 text-white" />
          <span className="font-bold text-white">Detail Geologi & Abu:</span>
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
            💨 Abu Vulkanik: {plume.windSpeed} m/s ({plume.windDirection}°)
          </span>
        </div>
      </div>

      {/* BOTTOM RIGHT: Drag / Mouse Hints & Quick Scroll Status */}
      <div className="absolute bottom-4 right-4 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-800 text-[10px] text-zinc-400 font-mono pointer-events-none hidden sm:flex items-center gap-2">
        <span>Scroll: Zoom In / Out</span>
        <span>•</span>
        <span>Klik Kiri: Orbit 3D</span>
        <span>•</span>
        <span>Klik Dobel: Dekati Titik</span>
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
