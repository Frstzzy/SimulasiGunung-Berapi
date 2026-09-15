/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { BallisticParams, PlumeParams, ProjectileState } from '../types';
import { computeTrajectory, computeIdealParabola, stepRK4, getRockProperties } from '../physics/ballistics';
import { volcanicAudio } from '../physics/audio';
import { ZoomIn, ZoomOut, RotateCcw, Crosshair, Wind } from 'lucide-react';

interface SideElevationCanvasProps {
  ballistic: BallisticParams;
  plume: PlumeParams;
  triggerCount: number;
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

export const SideElevationCanvas: React.FC<SideElevationCanvasProps> = ({
  ballistic,
  plume,
  triggerCount,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Viewport transformation: scale (meters to pixels), offset
  const [scale, setScale] = useState<number>(0.12); // pixels per meter
  const [originX, setOriginX] = useState<number>(180);
  const [originY, setOriginY] = useState<number>(450);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [showIdealParabola, setShowIdealParabola] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [probePos, setProbePos] = useState<{ x: number; y: number } | null>(null);

  // Simulation entities
  const projectilesRef = useRef<ProjectileState[]>([]);
  const smokePuffsRef = useRef<SmokePuff[]>([]);
  const splashesRef = useRef<SplashParticle[]>([]);
  const lastTimeRef = useRef<number>(performance.now());
  const nextPuffTimeRef = useRef<number>(0);

  // Resize observer
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      canvasRef.current.width = rect.width;
      canvasRef.current.height = rect.height;
      setOriginY(rect.height - 80);
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Launch a new batch of volcanic bombs on trigger
  const launchEruption = useCallback(() => {
    volcanicAudio.playEruptionBlast(1.0);
    const count = 7; // Eject primary bomb + 6 surrounding bombs
    const newProjectiles: ProjectileState[] = [];

    const colors = ['#f97316', '#ef4444', '#f59e0b', '#fbbf24', '#e11d48'];

    for (let i = 0; i < count; i++) {
      // Small variation in speed, angle, and size to simulate realistic explosive fragmentation
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
        x: (Math.random() - 0.5) * 20, // slightly off-center inside vent
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

    projectilesRef.current = [...projectilesRef.current.slice(-15), ...newProjectiles];

    // Burst of smoke puffs at vent
    for (let s = 0; s < 45; s++) {
      const angle = (Math.PI * 0.3) + Math.random() * (Math.PI * 0.4);
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

  // Main animation / physics loop
  useEffect(() => {
    let animId: number;

    const render = (time: number) => {
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1) * playbackSpeed;
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

      // Physics update if not paused
      if (!isPaused && dt > 0) {
        // Continuous plume rising from crater
        if (time > nextPuffTimeRef.current) {
          nextPuffTimeRef.current = time + 140 / (plume.emissionRate || 1);
          // Spawn plume puff
          const driftAngle = (plume.windDirection * Math.PI) / 180;
          const windDriftX = Math.sin(driftAngle) * plume.windSpeed * 0.6;

          smokePuffsRef.current.push({
            x: (Math.random() - 0.5) * 40,
            y: ballistic.ventElevation + 10,
            vx: windDriftX * 0.2 + (Math.random() - 0.5) * 10,
            vy: 40 + (plume.columnHeight / 100) * (0.8 + Math.random() * 0.4),
            radius: 20 + Math.random() * 15,
            maxRadius: 100 + (plume.columnHeight / 35),
            opacity: 0.65,
            color: Math.random() > 0.4 ? '#475569' : '#1e293b',
          });
        }

        // Update smoke puffs
        for (let i = smokePuffsRef.current.length - 1; i >= 0; i--) {
          const puff = smokePuffsRef.current[i];
          // Plume dynamics: vertical buoyancy decels as it reaches column height, wind shear carries it horizontally
          const heightFraction = Math.max(0, (puff.y - ballistic.ventElevation) / plume.columnHeight);
          puff.vy *= 0.985;
          if (puff.y > ballistic.ventElevation + plume.columnHeight * 0.8) {
            // Umbrella expansion & horizontal wind drift
            puff.vx += (plume.windSpeed * 0.8 - puff.vx) * 0.05;
            puff.vy *= 0.95;
          } else {
            puff.vx += (plume.windSpeed * 0.4 - puff.vx) * 0.02;
          }

          puff.x += puff.vx * dt;
          puff.y += puff.vy * dt;
          puff.radius = Math.min(puff.maxRadius, puff.radius + 15 * dt);
          puff.opacity -= 0.05 * dt;

          if (puff.opacity <= 0.01 || puff.x > 35000 || puff.y > 10000) {
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
      }

      // ----------------------------------------------------
      // DRAWING PHASE
      // ----------------------------------------------------

      // 1. Sky background gradient (dusk / volcanic atmosphere)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, originY);
      skyGrad.addColorStop(0, '#090d16');
      skyGrad.addColorStop(0.6, '#0f172a');
      skyGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Metric Grid lines & Altitude labels
      ctx.lineWidth = 1;
      const gridIntervalMeters = scale < 0.08 ? 1000 : 500;

      // Vertical altitude lines
      for (let yM = 0; yM <= 8000; yM += gridIntervalMeters) {
        const sy = toScreenY(yM);
        if (sy < 0 || sy > height) continue;
        ctx.strokeStyle = yM === 0 ? '#38bdf8' : 'rgba(148, 163, 184, 0.12)';
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
        ctx.stroke();

        ctx.fillStyle = yM === 0 ? '#38bdf8' : 'rgba(148, 163, 184, 0.5)';
        ctx.font = '10px monospace';
        ctx.fillText(`${yM}m ${yM === 0 ? '(Permukaan Laut)' : ''}`, 10, sy - 4);
      }

      // Horizontal range lines
      for (let xM = -2000; xM <= 25000; xM += gridIntervalMeters) {
        const sx = toScreenX(xM);
        if (sx < 0 || sx > width) continue;
        ctx.strokeStyle = xM === 0 ? 'rgba(249, 115, 22, 0.4)' : 'rgba(148, 163, 184, 0.08)';
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, height);
        ctx.stroke();

        if (xM % (gridIntervalMeters * 2) === 0 && xM >= 0) {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
          ctx.font = '10px monospace';
          ctx.fillText(`${(xM / 1000).toFixed(1)} km`, sx + 4, toScreenY(0) + 14);
        }
      }

      // 3. Danger Zone III marker (5 km PVMBG radius)
      const danger5kmSx = toScreenX(5000);
      ctx.strokeStyle = '#ef4444';
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(danger5kmSx, 0);
      ctx.lineTo(danger5kmSx, height);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('Batas Bahaya KRB III (Radius 5.0 Km PVMBG)', danger5kmSx + 6, 28);

      // 4. Sunda Strait Sea (Permukaan Laut & Batimetri Kaldera)
      const seaGrad = ctx.createLinearGradient(0, toScreenY(0), 0, height);
      seaGrad.addColorStop(0, 'rgba(14, 116, 144, 0.85)');
      seaGrad.addColorStop(1, 'rgba(2, 44, 75, 0.98)');
      ctx.fillStyle = seaGrad;
      ctx.fillRect(0, toScreenY(0), width, height - toScreenY(0));

      // Sea wave highlights
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, toScreenY(0));
      for (let xPx = 0; xPx <= width; xPx += 40) {
        ctx.lineTo(xPx, toScreenY(0) + Math.sin(xPx * 0.05 + time * 0.003) * 2);
      }
      ctx.stroke();

      // 5. Anak Krakatau Volcanic Cone (Topografi Lereng & Kawah 157 mdpl)
      ctx.beginPath();
      // Underwater slope to the left
      ctx.moveTo(toScreenX(-1400), toScreenY(-120));
      ctx.lineTo(toScreenX(-800), toScreenY(0));
      ctx.lineTo(toScreenX(-200), toScreenY(157)); // crater rim west
      ctx.lineTo(toScreenX(0), toScreenY(130)); // crater floor / vent
      ctx.lineTo(toScreenX(220), toScreenY(157)); // crater rim east
      ctx.lineTo(toScreenX(850), toScreenY(0)); // sea line east
      ctx.lineTo(toScreenX(1500), toScreenY(-140)); // underwater slope east
      ctx.lineTo(toScreenX(-1400), toScreenY(-140));
      ctx.closePath();

      const volcanoGrad = ctx.createLinearGradient(0, toScreenY(157), 0, toScreenY(-140));
      volcanoGrad.addColorStop(0, '#292524');
      volcanoGrad.addColorStop(0.5, '#1c1917');
      volcanoGrad.addColorStop(1, '#0c0a09');
      ctx.fillStyle = volcanoGrad;
      ctx.fill();
      ctx.strokeStyle = '#57534e';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Magma chamber glow inside vent
      const ventSx = toScreenX(0);
      const ventSy = toScreenY(130);
      const ventGlow = ctx.createRadialGradient(ventSx, ventSy, 5, ventSx, ventSy, 45);
      ventGlow.addColorStop(0, 'rgba(239, 68, 68, 0.9)');
      ventGlow.addColorStop(0.5, 'rgba(249, 115, 22, 0.6)');
      ventGlow.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = ventGlow;
      ctx.beginPath();
      ctx.arc(ventSx, ventSy, 45, 0, Math.PI * 2);
      ctx.fill();

      // Label on volcano
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('Kawah Anak Krakatau (157 mdpl)', ventSx - 85, ventSy + 32);

      // 6. Plume / Smoke Puffs (convective ash column & umbrella cloud)
      for (const puff of smokePuffsRef.current) {
        const px = toScreenX(puff.x);
        const py = toScreenY(puff.y);
        const pr = puff.radius * scale;

        ctx.fillStyle = puff.color;
        ctx.globalAlpha = Math.max(0, puff.opacity);
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;

      // 7. Trajectory prediction lines
      // Compute predicted trajectories
      const realTraj = computeTrajectory(ballistic, ballistic.enableAirDrag);
      const idealTraj = computeIdealParabola(ballistic);

      // Ideal Parabola (without drag)
      if (showIdealParabola) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        const rad = (ballistic.launchAngle * Math.PI) / 180;
        const v0 = ballistic.initialVelocity;
        const g = ballistic.gravity;
        const y0 = ballistic.ventElevation;
        const vx = v0 * Math.cos(rad);
        const vy = v0 * Math.sin(rad);

        for (let t = 0; t <= idealTraj.flightTime; t += 0.1) {
          const ix = vx * t;
          const iy = y0 + vy * t - 0.5 * g * t * t;
          const isx = toScreenX(ix);
          const isy = toScreenY(iy);
          if (t === 0) ctx.moveTo(isx, isy);
          else ctx.lineTo(isx, isy);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Ideal landing flag
        const idealLandSx = toScreenX(idealTraj.maxRange);
        ctx.fillStyle = '#38bdf8';
        ctx.font = '10px monospace';
        ctx.fillText(`Ideal (Vakum): ${(idealTraj.maxRange / 1000).toFixed(2)} km`, idealLandSx - 35, toScreenY(0) - 10);
      }

      // Real Drag Predicted Trajectory
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < realTraj.points.length; i++) {
        const pt = realTraj.points[i];
        const psx = toScreenX(pt.x);
        const psy = toScreenY(pt.y);
        if (i === 0) ctx.moveTo(psx, psy);
        else ctx.lineTo(psx, psy);
      }
      ctx.stroke();

      // Real drag impact point marker
      const realLandSx = toScreenX(realTraj.maxRange);
      ctx.fillStyle = '#f97316';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`Fisika Nyata (Drag): ${(realTraj.maxRange / 1000).toFixed(2)} km`, realLandSx + 6, toScreenY(0) - 12);
      ctx.beginPath();
      ctx.arc(realLandSx, toScreenY(0), 4, 0, Math.PI * 2);
      ctx.fill();

      // 8. Active flying projectiles & trails
      for (const proj of projectilesRef.current) {
        // Draw hot pyroclastic trail
        if (proj.trail.length > 1) {
          ctx.strokeStyle = proj.color;
          ctx.lineWidth = Math.max(1, proj.radius * scale * 1.2);
          ctx.beginPath();
          for (let i = 0; i < proj.trail.length; i++) {
            const tx = toScreenX(proj.trail[i].x);
            const ty = toScreenY(proj.trail[i].y);
            if (i === 0) ctx.moveTo(tx, ty);
            else ctx.lineTo(tx, ty);
          }
          ctx.stroke();
        }

        if (!proj.landed) {
          const psx = toScreenX(proj.x);
          const psy = toScreenY(proj.y);
          const rPx = Math.max(3.5, proj.radius * scale * 4);

          // Glowing volcanic bomb
          const bombGrad = ctx.createRadialGradient(psx, psy, 1, psx, psy, rPx * 2);
          bombGrad.addColorStop(0, '#ffffff');
          bombGrad.addColorStop(0.3, proj.color);
          bombGrad.addColorStop(0.8, '#b91c1c');
          bombGrad.addColorStop(1, 'rgba(185, 28, 28, 0)');
          ctx.fillStyle = bombGrad;
          ctx.beginPath();
          ctx.arc(psx, psy, rPx * 2, 0, Math.PI * 2);
          ctx.fill();

          // Core rock
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(psx, psy, rPx * 0.7, 0, Math.PI * 2);
          ctx.fill();

          // Kinematic Vectors
          if (showVectors) {
            const speed = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);
            if (speed > 1) {
              // 1. Velocity vector (green arrow)
              const vLen = 35;
              const vxEnd = psx + (proj.vx / speed) * vLen;
              const vyEnd = psy - (proj.vy / speed) * vLen; // invert Y for screen
              ctx.strokeStyle = '#22c55e';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(psx, psy);
              ctx.lineTo(vxEnd, vyEnd);
              ctx.stroke();

              // 2. Drag force deceleration vector (opposite to velocity, yellow arrow)
              if (ballistic.enableAirDrag) {
                const dragLen = 22;
                const dxEnd = psx - (proj.vx / speed) * dragLen;
                const dyEnd = psy + (proj.vy / speed) * dragLen;
                ctx.strokeStyle = '#eab308';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(psx, psy);
                ctx.lineTo(dxEnd, dyEnd);
                ctx.stroke();
              }

              // 3. Gravity vector (downwards, cyan arrow)
              ctx.strokeStyle = '#06b6d4';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(psx, psy);
              ctx.lineTo(psx, psy + 24);
              ctx.stroke();
            }
          }
        }
      }

      // 9. Splash particles
      for (const sp of splashesRef.current) {
        const sx = toScreenX(sp.x);
        const sy = toScreenY(sp.y);
        ctx.fillStyle = 'rgba(224, 242, 254, 0.9)';
        ctx.beginPath();
        ctx.arc(sx, sy, sp.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // 10. Probe cursor crosshair
      if (probePos) {
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.8)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(probePos.x, 0);
        ctx.lineTo(probePos.x, height);
        ctx.moveTo(0, probePos.y);
        ctx.lineTo(width, probePos.y);
        ctx.stroke();
        ctx.setLineDash([]);

        const meterX = (probePos.x - originX) / scale;
        const meterY = (originY - probePos.y) / scale;

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(probePos.x + 8, probePos.y - 32, 130, 24);
        ctx.strokeStyle = '#f43f5e';
        ctx.strokeRect(probePos.x + 8, probePos.y - 32, 130, 24);

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText(`X: ${(meterX / 1000).toFixed(2)} km`, probePos.x + 14, probePos.y - 20);
        ctx.fillText(`Y: ${meterY.toFixed(0)} m`, probePos.x + 14, probePos.y - 10);
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
    playbackSpeed,
    isPaused,
    probePos,
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

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
    setProbePos(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setScale((prev) => Math.min(Math.max(prev * zoomFactor, 0.02), 0.6));
  };

  const resetView = () => {
    setScale(0.12);
    setOriginX(180);
    if (containerRef.current) {
      setOriginY(containerRef.current.clientHeight - 80);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-[580px] bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl select-none group">
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        className="w-full h-full cursor-crosshair"
      />

      {/* Floating Canvas Controls Overlay (Top Left) */}
      <div className="absolute top-4 left-4 bg-black/90 backdrop-blur-xl px-3 py-2 rounded-2xl border border-zinc-800 text-xs text-zinc-200 shadow-2xl flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setScale((s) => Math.min(s * 1.25, 0.6))}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:text-white text-zinc-300 transition-colors"
            title="Perbesar (Zoom In)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setScale((s) => Math.max(s * 0.8, 0.02))}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:text-white text-zinc-300 transition-colors"
            title="Perkecil (Zoom Out)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetView}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:text-white text-zinc-300 transition-colors"
            title="Pusatkan Tampilan"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-4 w-px bg-zinc-800" />

        {/* Speed selectors */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-zinc-400 font-medium">Laju:</span>
          {[0.2, 0.5, 1.0, 2.0].map((spd) => (
            <button
              key={spd}
              onClick={() => setPlaybackSpeed(spd)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition-all border ${
                playbackSpeed === spd
                  ? 'bg-white text-black font-bold border-white shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border-zinc-800'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-zinc-800" />

        <button
          onClick={() => setIsPaused(!isPaused)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
            isPaused
              ? 'bg-white text-black border-white'
              : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700'
          }`}
        >
          {isPaused ? 'Resume' : 'Pause'}
        </button>
      </div>

      {/* Vector & Legend Toggle Overlay (Top Right) */}
      <div className="absolute top-4 right-4 bg-black/90 backdrop-blur-xl p-3.5 rounded-2xl border border-zinc-800 text-xs text-zinc-200 shadow-2xl flex flex-col gap-2.5 max-w-xs">
        <div className="font-semibold text-zinc-200 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-bold text-white">
            <Crosshair className="w-3.5 h-3.5 text-white" />
            Layer Vektor & Trajektori
          </span>
        </div>

        <label className="flex items-center gap-2 text-[11px] cursor-pointer text-zinc-300 hover:text-white">
          <input
            type="checkbox"
            checked={showVectors}
            onChange={(e) => setShowVectors(e.target.checked)}
            className="rounded border-zinc-750 text-white focus:ring-0"
          />
          <span>Vektor Kinematik (v, Fd, g)</span>
        </label>

        <label className="flex items-center gap-2 text-[11px] cursor-pointer text-zinc-300 hover:text-white">
          <input
            type="checkbox"
            checked={showIdealParabola}
            onChange={(e) => setShowIdealParabola(e.target.checked)}
            className="rounded border-zinc-750 text-white focus:ring-0"
          />
          <span>Parabola Vakum (Tanpa Drag)</span>
        </label>

        <div className="mt-1 pt-2.5 border-t border-zinc-800 text-[10px] space-y-1.5 text-zinc-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-white" />
            <span className="text-zinc-200">Vektor Kecepatan (v)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-zinc-400" />
            <span>Gaya Hambat Udara (Fd)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-zinc-500" />
            <span>Percepatan Gravitasi (g)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-zinc-300" />
            <span>Trayektori RK4 Nyata</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full border border-white bg-black" />
            <span>Batas Steril 5 km KRB III</span>
          </div>
        </div>
      </div>

      {/* Atmospheric Info Tag (Bottom Left) */}
      <div className="absolute bottom-4 left-4 bg-black/90 backdrop-blur-xl px-3.5 py-2 rounded-xl border border-zinc-800 text-[11px] text-zinc-300 flex items-center gap-2.5 font-mono shadow-xl">
        <Wind className="w-3.5 h-3.5 text-white" />
        <span>Angin: <span className="text-white font-semibold">{plume.windSpeed} m/s</span> ({plume.windDirection}°)</span>
        <span className="text-zinc-700">•</span>
        <span>Drag Cd: <span className="text-white font-semibold">{ballistic.dragCoefficient}</span></span>
        <span className="text-zinc-700">•</span>
        <span>Densitas: <span className="text-white font-semibold">{ballistic.rockDensity}</span> kg/m³</span>
      </div>
    </div>
  );
};
