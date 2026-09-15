/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlumeParams } from '../types';

/**
 * Air dynamic viscosity at standard atmospheric conditions (Pa*s)
 */
const AIR_VISCOSITY = 1.81e-5;

/**
 * Ash particle grain size definitions in meters
 */
export const ASH_GRAIN_SIZES = {
  fine: 0.00003, // 30 micrometers (stays airborne for days/hundreds of km)
  medium: 0.00025, // 250 micrometers (settles within tens of km)
  coarse: 0.0015, // 1.5 mm (settles within 5-15 km)
};

/**
 * Calculates particle settling velocity using Stokes' Law with Cunningham slip correction
 */
export function calculateSettlingVelocity(grainRadiusMeters: number, ashDensity: number = 2200): number {
  const g = 9.81;
  const rhoAir = 1.225;
  // Stokes' terminal velocity
  const vStokes = (2 / 9) * ((ashDensity - rhoAir) * g * Math.pow(grainRadiusMeters, 2)) / AIR_VISCOSITY;
  // Cap at realistic terminal speeds for medium/large ash
  return Math.min(vStokes, 12);
}

/**
 * Pasquill-Gifford dispersion coefficients (sigma_y and sigma_z)
 * for downwind distance x (in km)
 */
export function getDispersionCoefficients(xKm: number, stability: 'A' | 'B' | 'C' | 'D' | 'E' | 'F') {
  const x = Math.max(0.1, xKm);
  let sy = 0;
  let sz = 0;

  switch (stability) {
    case 'A': // Extremely unstable
      sy = 213 * Math.pow(x, 0.894);
      sz = 440 * Math.pow(x, 1.941);
      break;
    case 'B': // Moderately unstable
      sy = 156 * Math.pow(x, 0.894);
      sz = 106 * Math.pow(x, 1.149);
      break;
    case 'C': // Slightly unstable
      sy = 104 * Math.pow(x, 0.894);
      sz = 61 * Math.pow(x, 0.911);
      break;
    case 'D': // Neutral (typical overcast / coastal sea)
    default:
      sy = 68 * Math.pow(x, 0.894);
      sz = 33.2 * Math.pow(x, 0.725);
      break;
    case 'E': // Slightly stable
      sy = 50.5 * Math.pow(x, 0.894);
      sz = 22.8 * Math.pow(x, 0.678);
      break;
    case 'F': // Moderately stable
      sy = 34 * Math.pow(x, 0.894);
      sz = 14.3 * Math.pow(x, 0.655);
      break;
  }

  return { sigmaY: sy, sigmaZ: sz };
}

/**
 * Computes Gaussian plume concentration at ground level (z = 0)
 * Q: emission rate (arbitrary units or g/s)
 * u: wind speed (m/s)
 * H: effective plume height (m)
 * xKm: downwind distance (km)
 * yMeters: crosswind distance (m)
 */
export function computeGaussianGroundConcentration(
  Q: number,
  u: number,
  H: number,
  xKm: number,
  yMeters: number,
  stability: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
): number {
  if (xKm <= 0.05 || u <= 0.1) return 0;

  const { sigmaY, sigmaZ } = getDispersionCoefficients(xKm, stability);

  const factor = Q / (Math.PI * u * sigmaY * sigmaZ);
  const crosswindExp = Math.exp(-0.5 * Math.pow(yMeters / sigmaY, 2));
  const heightExp = Math.exp(-0.5 * Math.pow(H / sigmaZ, 2));

  return factor * crosswindExp * heightExp;
}

/**
 * Converts meteorological wind direction (degrees FROM which wind blows)
 * into vector (direction TOWARD which ash travels)
 */
export function getPlumeDriftVector(windDirectionDeg: number, windSpeedMs: number) {
  // Meteorological wind: 0 = wind from North (blowing South)
  // Drift angle is opposite: windDirectionDeg + 180
  const driftRad = ((windDirectionDeg + 180) * Math.PI) / 180;
  const dx = Math.sin(driftRad) * windSpeedMs;
  const dy = -Math.cos(driftRad) * windSpeedMs; // negative because screen Y increases downward
  return { dx, dy, driftRad };
}
