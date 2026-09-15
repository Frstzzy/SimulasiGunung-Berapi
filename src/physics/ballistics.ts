/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BallisticParams, SimulationStats } from '../types';

/**
 * Sea level air density in kg/m^3
 */
const RHO_0 = 1.225;
/**
 * Atmospheric scale height in meters
 */
const SCALE_HEIGHT = 8500;

/**
 * Calculates air density at a given altitude (y in meters above sea level)
 */
export function getAirDensity(altitudeMeters: number): number {
  if (altitudeMeters <= 0) return RHO_0;
  return RHO_0 * Math.exp(-altitudeMeters / SCALE_HEIGHT);
}

/**
 * Calculates the mass and cross-sectional area of a spherical volcanic bomb
 */
export function getRockProperties(diameter: number, density: number) {
  const radius = diameter / 2;
  const area = Math.PI * radius * radius;
  const volume = (4 / 3) * Math.PI * Math.pow(radius, 3);
  const mass = volume * density;
  return { radius, area, volume, mass };
}

export interface Derivative {
  dx: number;
  dy: number;
  dvx: number;
  dvy: number;
}

/**
 * Computes derivatives for state [x, y, vx, vy]
 */
function evaluateDerivatives(
  y: number,
  vx: number,
  vy: number,
  mass: number,
  area: number,
  dragCoefficient: number,
  gravity: number,
  enableDrag: boolean
): Derivative {
  const speed = Math.sqrt(vx * vx + vy * vy);
  let ax = 0;
  let ay = -gravity;

  if (enableDrag && speed > 1e-6) {
    const rho = getAirDensity(y);
    const dragForce = 0.5 * rho * dragCoefficient * area * speed * speed;
    const dragDecel = dragForce / mass;

    ax -= dragDecel * (vx / speed);
    ay -= dragDecel * (vy / speed);
  }

  return {
    dx: vx,
    dy: vy,
    dvx: ax,
    dvy: ay,
  };
}

/**
 * Runge-Kutta 4th Order (RK4) integration step
 */
export function stepRK4(
  x: number,
  y: number,
  vx: number,
  vy: number,
  dt: number,
  mass: number,
  area: number,
  dragCoefficient: number,
  gravity: number,
  enableDrag: boolean
) {
  // k1
  const k1 = evaluateDerivatives(y, vx, vy, mass, area, dragCoefficient, gravity, enableDrag);

  // k2
  const y2 = y + 0.5 * dt * k1.dy;
  const vx2 = vx + 0.5 * dt * k1.dvx;
  const vy2 = vy + 0.5 * dt * k1.dvy;
  const k2 = evaluateDerivatives(y2, vx2, vy2, mass, area, dragCoefficient, gravity, enableDrag);

  // k3
  const y3 = y + 0.5 * dt * k2.dy;
  const vx3 = vx + 0.5 * dt * k2.dvx;
  const vy3 = vy + 0.5 * dt * k2.dvy;
  const k3 = evaluateDerivatives(y3, vx3, vy3, mass, area, dragCoefficient, gravity, enableDrag);

  // k4
  const y4 = y + dt * k3.dy;
  const vx4 = vx + dt * k3.dvx;
  const vy4 = vy + dt * k3.dvy;
  const k4 = evaluateDerivatives(y4, vx4, vy4, mass, area, dragCoefficient, gravity, enableDrag);

  const nextX = x + (dt / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx);
  const nextY = y + (dt / 6) * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy);
  const nextVx = vx + (dt / 6) * (k1.dvx + 2 * k2.dvx + 2 * k3.dvx + k4.dvx);
  const nextVy = vy + (dt / 6) * (k1.dvy + 2 * k2.dvy + 2 * k3.dvy + k4.dvy);

  return { x: nextX, y: nextY, vx: nextVx, vy: nextVy };
}

export interface Vector3D {
  x: number; // East (+X) / West (-X) in meters
  y: number; // Altitude (+Y) in meters
  z: number; // South (+Z) / North (-Z) in meters
}

export interface TrajectoryPoint3D extends Vector3D {
  t: number;
  speed: number;
}

/**
 * 3D Runge-Kutta 4th Order (RK4) integration step with 3D wind and altitude-dependent drag
 */
export function stepRK4_3D(
  pos: Vector3D,
  vel: Vector3D,
  dt: number,
  mass: number,
  area: number,
  dragCoefficient: number,
  gravity: number,
  windVel: { wx: number; wz: number },
  enableDrag: boolean
) {
  function getAcc(yPos: number, vx: number, vy: number, vz: number) {
    let ax = 0;
    let ay = -gravity;
    let az = 0;

    if (enableDrag) {
      // Relative air velocity
      const relVx = vx - windVel.wx;
      const relVy = vy;
      const relVz = vz - windVel.wz;
      const relSpeed = Math.sqrt(relVx * relVx + relVy * relVy + relVz * relVz);

      if (relSpeed > 1e-5) {
        const rho = getAirDensity(yPos);
        const dragForce = 0.5 * rho * dragCoefficient * area * (relSpeed * relSpeed);
        const dragDecel = dragForce / mass;

        ax -= dragDecel * (relVx / relSpeed);
        ay -= dragDecel * (relVy / relSpeed);
        az -= dragDecel * (relVz / relSpeed);
      }
    }

    return { ax, ay, az };
  }

  // k1
  const a1 = getAcc(pos.y, vel.x, vel.y, vel.z);

  // k2
  const p2y = pos.y + 0.5 * dt * vel.y;
  const v2x = vel.x + 0.5 * dt * a1.ax;
  const v2y = vel.y + 0.5 * dt * a1.ay;
  const v2z = vel.z + 0.5 * dt * a1.az;
  const a2 = getAcc(p2y, v2x, v2y, v2z);

  // k3
  const p3y = pos.y + 0.5 * dt * v2y;
  const v3x = vel.x + 0.5 * dt * a2.ax;
  const v3y = vel.y + 0.5 * dt * a2.ay;
  const v3z = vel.z + 0.5 * dt * a2.az;
  const a3 = getAcc(p3y, v3x, v3y, v3z);

  // k4
  const p4y = pos.y + dt * v3y;
  const v4x = vel.x + dt * a3.ax;
  const v4y = vel.y + dt * a3.ay;
  const v4z = vel.z + dt * a3.az;
  const a4 = getAcc(p4y, v4x, v4y, v4z);

  const nextPos: Vector3D = {
    x: pos.x + (dt / 6) * (vel.x + 2 * v2x + 2 * v3x + v4x),
    y: pos.y + (dt / 6) * (vel.y + 2 * v2y + 2 * v3y + v4y),
    z: pos.z + (dt / 6) * (vel.z + 2 * v2z + 2 * v3z + v4z),
  };

  const nextVel: Vector3D = {
    x: vel.x + (dt / 6) * (a1.ax + 2 * a2.ax + 2 * a3.ax + a4.ax),
    y: vel.y + (dt / 6) * (a1.ay + 2 * a2.ay + 2 * a3.ay + a4.ay),
    z: vel.z + (dt / 6) * (a1.az + 2 * a2.az + 2 * a3.az + a4.az),
  };

  return { pos: nextPos, vel: nextVel };
}

/**
 * Precomputes 3D trajectory in realistic coordinates
 * Azimuth in degrees: 0 = North (-Z), 90 = East (+X), 180 = South (+Z), 270 = West (-X)
 */
export function computeTrajectory3D(
  params: BallisticParams,
  azimuthDeg: number,
  windSpeed: number = 0,
  windDirDeg: number = 0,
  enableDrag: boolean = true
) {
  const elevRad = (params.launchAngle * Math.PI) / 180;
  const azimRad = (azimuthDeg * Math.PI) / 180;

  // Horizontal and vertical velocity components
  const vH = params.initialVelocity * Math.cos(elevRad);
  const vy0 = params.initialVelocity * Math.sin(elevRad);
  // Azimuth 0 = North (-Z), 90 = East (+X)
  const vx0 = vH * Math.sin(azimRad);
  const vz0 = -vH * Math.cos(azimRad);

  // Wind direction: direction wind is blowing toward (meteorological direction + 180)
  const windRad = (windDirDeg * Math.PI) / 180;
  // If wind is from direction D, blowing toward D + 180
  const wx = -windSpeed * Math.sin(windRad);
  const wz = windSpeed * Math.cos(windRad);

  const { mass, area } = getRockProperties(params.rockDiameter, params.rockDensity);

  let pos: Vector3D = { x: 0, y: params.ventElevation, z: 0 };
  let vel: Vector3D = { x: vx0, y: vy0, z: vz0 };
  let t = 0;
  const dt = 0.05;

  const points: TrajectoryPoint3D[] = [
    { ...pos, t: 0, speed: params.initialVelocity },
  ];

  let maxAltitude = pos.y;
  let impactSpeed = 0;

  while (pos.y >= 0 && t < 120 && Math.hypot(pos.x, pos.z) < 50000) {
    const next = stepRK4_3D(
      pos,
      vel,
      dt,
      mass,
      area,
      params.dragCoefficient,
      params.gravity,
      { wx, wz },
      enableDrag
    );

    pos = next.pos;
    vel = next.vel;
    t += dt;

    if (pos.y > maxAltitude) {
      maxAltitude = pos.y;
    }

    const currentSpeed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
    points.push({ ...pos, y: Math.max(0, pos.y), t, speed: currentSpeed });

    if (pos.y <= 0) {
      impactSpeed = currentSpeed;
      break;
    }
  }

  const finalPt = points[points.length - 1];
  const maxRange = finalPt ? Math.hypot(finalPt.x, finalPt.z) : 0;
  const impactEnergy = 0.5 * mass * impactSpeed * impactSpeed;

  return {
    points,
    maxRange,
    maxAltitude,
    flightTime: t,
    impactSpeed,
    impactEnergy,
    landingPos: finalPt,
  };
}

export interface ShowerBomb {
  id: number;
  label: string;
  rockDiameter: number;
  rockMassKg: number;
  launchAngle: number;
  launchAzimuth: number;
  initialVelocity: number;
  color: string;
  traj: ReturnType<typeof computeTrajectory3D>;
}

/**
 * Computes a realistic multi-projectile shower of volcanic ejecta/bombs
 */
export function computeBallisticShower(
  params: BallisticParams,
  primaryAzimuthDeg: number,
  windSpeed: number = 0,
  windDirDeg: number = 0,
  count: number = 7,
  dispersionMode: 'focused' | 'radial' = 'focused'
): ShowerBomb[] {
  const result: ShowerBomb[] = [];
  const palette = [
    '#f97316', // Orange
    '#ef4444', // Red
    '#f59e0b', // Amber
    '#eab308', // Yellow
    '#ec4899', // Pink
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
    '#10b981', // Emerald
    '#f43f5e', // Rose
    '#fb923c', // Tangerine
  ];

  for (let i = 0; i < count; i++) {
    const isPrimary = i === 0;

    let azim = primaryAzimuthDeg;
    let angle = params.launchAngle;
    let v0 = params.initialVelocity;
    let diam = params.rockDiameter;

    if (!isPrimary) {
      if (dispersionMode === 'radial') {
        const step = 360 / Math.max(1, count - 1);
        azim = (primaryAzimuthDeg + i * step + Math.sin(i * 1.7) * 12 + 360) % 360;
      } else {
        // Focused directional cluster within ±35°
        const offset = Math.sin(i * 2.3) * 35;
        azim = (primaryAzimuthDeg + offset + 360) % 360;
      }

      // Natural spread in elevation angle (32° to 82°)
      const angleVar = Math.cos(i * 3.1) * 14;
      angle = Math.max(30, Math.min(85, params.launchAngle + angleVar));

      // Natural spread in initial speed (72% to 118% of v0)
      const vFactor = 0.72 + ((i * 37) % 47) / 100;
      v0 = Math.max(40, params.initialVelocity * vFactor);

      // Natural fragment size variation (lapilli 0.12m to massive bomb)
      const sizeFactor = 0.35 + ((i * 19) % 65) / 50;
      diam = Math.max(0.1, params.rockDiameter * sizeFactor);
    }

    const { mass } = getRockProperties(diam, params.rockDensity);

    const traj = computeTrajectory3D(
      {
        ...params,
        launchAngle: angle,
        initialVelocity: v0,
        rockDiameter: diam,
      },
      azim,
      windSpeed,
      windDirDeg,
      params.enableAirDrag
    );

    result.push({
      id: i,
      label: isPrimary ? 'Bom Utama (Fokus)' : `Fragmen #${i + 1}`,
      rockDiameter: Math.round(diam * 100) / 100,
      rockMassKg: Math.round(mass),
      launchAngle: Math.round(angle * 10) / 10,
      launchAzimuth: Math.round(azim * 10) / 10,
      initialVelocity: Math.round(v0),
      color: palette[i % palette.length],
      traj,
    });
  }

  return result;
}

/**
 * Precomputes full trajectory path with high resolution
 */
export function computeTrajectory(params: BallisticParams, enableDrag: boolean) {
  const rad = (params.launchAngle * Math.PI) / 180;
  const vx0 = params.initialVelocity * Math.cos(rad);
  const vy0 = params.initialVelocity * Math.sin(rad);

  const { mass, area } = getRockProperties(params.rockDiameter, params.rockDensity);

  let x = 0;
  let y = params.ventElevation;
  let vx = vx0;
  let vy = vy0;
  let t = 0;
  const dt = 0.05; // 50ms step for simulation accuracy

  const points: { x: number; y: number; t: number; speed: number }[] = [
    { x, y, t: 0, speed: params.initialVelocity },
  ];

  let maxAltitude = y;
  let impactSpeed = 0;

  while (y >= 0 && t < 120 && x < 50000) {
    const next = stepRK4(
      x,
      y,
      vx,
      vy,
      dt,
      mass,
      area,
      params.dragCoefficient,
      params.gravity,
      enableDrag
    );

    x = next.x;
    y = next.y;
    vx = next.vx;
    vy = next.vy;
    t += dt;

    if (y > maxAltitude) {
      maxAltitude = y;
    }

    const currentSpeed = Math.sqrt(vx * vx + vy * vy);
    points.push({ x, y: Math.max(0, y), t, speed: currentSpeed });

    if (y <= 0) {
      impactSpeed = currentSpeed;
      break;
    }
  }

  const finalPoint = points[points.length - 1];
  const maxRange = finalPoint ? finalPoint.x : 0;
  const flightTime = t;
  const impactEnergy = 0.5 * mass * impactSpeed * impactSpeed;

  return {
    points,
    maxRange,
    maxAltitude,
    flightTime,
    impactSpeed,
    impactEnergy,
    mass,
  };
}

/**
 * Analytical computation for ideal vacuum parabola
 */
export function computeIdealParabola(params: BallisticParams) {
  const rad = (params.launchAngle * Math.PI) / 180;
  const v0 = params.initialVelocity;
  const g = params.gravity;
  const y0 = params.ventElevation;

  const vx = v0 * Math.cos(rad);
  const vy = v0 * Math.sin(rad);

  // Peak time and altitude
  const tPeak = vy / g;
  const maxAltitude = y0 + (vy * vy) / (2 * g);

  // Time of flight to y = 0
  // 0 = y0 + vy*t - 0.5*g*t^2  =>  0.5*g*t^2 - vy*t - y0 = 0
  const discriminant = vy * vy + 2 * g * y0;
  const flightTime = (vy + Math.sqrt(discriminant)) / g;
  const maxRange = vx * flightTime;

  return {
    maxRange,
    maxAltitude,
    flightTime,
  };
}

/**
 * Calculates comparative statistics between real drag and ideal vacuum models
 */
export function calculateSimulationStats(params: BallisticParams): SimulationStats {
  const real = computeTrajectory(params, true);
  const ideal = computeIdealParabola(params);

  return {
    maxRangeWithDrag: real.maxRange,
    maxRangeIdeal: ideal.maxRange,
    maxAltitudeWithDrag: real.maxAltitude,
    maxAltitudeIdeal: ideal.maxAltitude,
    flightTimeWithDrag: real.flightTime,
    flightTimeIdeal: ideal.flightTime,
    impactSpeedWithDrag: real.impactSpeed,
    impactEnergyJoules: real.impactEnergy,
    safeDistanceExceeded: real.maxRange >= 5000, // PVMBG Danger Zone III is 5km
  };
}
