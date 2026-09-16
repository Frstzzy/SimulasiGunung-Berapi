/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BallisticParams {
  initialVelocity: number; // m/s (e.g. 50 - 400 m/s)
  launchAngle: number; // degrees from horizontal (e.g. 30° - 85°)
  launchAzimuth?: number; // degrees horizontal azimuth (0° = North, 90° = East, 180° = South, 270° = West)
  rockDiameter: number; // meters (e.g. 0.05m to 2.0m)
  rockDensity: number; // kg/m^3 (andesite ~2500, basalt ~2800, pumice ~900)
  dragCoefficient: number; // Cd (~0.47 for smooth sphere, ~0.6-0.8 for irregular volcanic bomb)
  enableAirDrag: boolean; // toggle air resistance vs ideal parabola
  ventElevation: number; // meters above sea level (Anak Krakatau ~157m)
  gravity: number; // m/s^2 (9.81)
  projectileCount?: number; // Jumlah proyektil (1 = batu tunggal, >1 = hujan bom vulkanik multiproyektil)
  dispersionMode?: 'focused' | 'radial'; // 'focused' = kluster terarah sesuai azimut, 'radial' = pancaran 360° keliling kawah
}

export type CameraPreset3D = 'krakatau' | 'crater' | 'rim' | 'orbit' | 'anyer' | 'kalianda' | 'ship' | 'follow';
export type LightingMode3D = 'day' | 'sunset' | 'night';

export interface PlumeParams {
  columnHeight: number; // meters above crater (e.g. 500 - 4000 m)
  emissionRate: number; // kg/s or relative intensity (1 - 10)
  windSpeed: number; // m/s (e.g. 2 - 25 m/s)
  windDirection: number; // degrees (0° = North, 90° = East, 180° = South, 270° = West)
  particleSize: 'fine' | 'medium' | 'coarse'; // ash grain category
  stabilityClass: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'; // Pasquill-Gifford atmospheric stability
}

export interface ProjectileState {
  id: number;
  x: number; // meters from vent
  y: number; // meters above sea level
  vx: number; // m/s
  vy: number; // m/s
  radius: number; // meters
  mass: number; // kg
  time: number; // seconds elapsed
  trail: { x: number; y: number }[];
  landed: boolean;
  landingX?: number;
  landingTime?: number;
  impactVelocity?: number;
  impactEnergy?: number; // Joules
  color: string;
}

export interface AshParticle {
  x: number; // meters downwind or world X
  y: number; // meters altitude
  z: number; // meters crosswind
  vx: number;
  vy: number;
  vz: number;
  life: number; // 0 to 1
  maxLife: number;
  size: number;
  opacity: number;
  settlingVelocity: number;
}

export interface SimulationStats {
  maxRangeWithDrag: number;
  maxRangeIdeal: number;
  maxAltitudeWithDrag: number;
  maxAltitudeIdeal: number;
  flightTimeWithDrag: number;
  flightTimeIdeal: number;
  impactSpeedWithDrag: number;
  impactEnergyJoules: number;
  safeDistanceExceeded: boolean; // Zone III is 5km radius
}

export type EruptionPresetId = 'strombolian' | 'vulcanian' | 'surtseyan2018' | 'subplinian';

export type AppTab = 'satellite' | 'map3d' | 'elevation' | 'theory';

export interface EruptionPreset {
  id: EruptionPresetId;
  name: string;
  subtitle: string;
  description: string;
  ballistic: BallisticParams;
  plume: PlumeParams;
  dangerRadiusKm: number;
}

export interface AtmosphericWindLevel {
  levelId: 'surface' | '850hpa' | '700hpa' | '500hpa';
  name: string;
  altitudeM: number;
  pressureHpa: number;
  speedMs: number;
  speedKmh: number;
  directionDeg: number;
  directionCardinal: string;
  recommendedFor: string;
}

export interface WeatherForecastPoint {
  timeIso: string;
  timeLabel: string;
  tempC: number;
  speedMs: number;
  speedKmh: number;
  directionDeg: number;
  directionCardinal: string;
}

export interface KrakatauWeather {
  timestamp: string;
  lastUpdated: string;
  source: 'OpenWeatherMap' | 'Open-Meteo' | 'Sensor Baseline (Simulasi)';
  stationName: string;
  coordinates: {
    lat: number;
    lon: number;
    elevationM: number;
  };
  temperatureC: number;
  apparentTempC: number;
  relativeHumidity: number; // %
  pressureHpa: number; // hPa
  weatherCondition: string;
  weatherCode: number;
  surface?: {
    tempC: number;
    humidityPct: number;
  };
  wind: {
    speedMs: number;
    speedKmh: number;
    directionDeg: number; // Meteorological angle (where wind is coming FROM)
    driftDirectionDeg: number; // Dispersion drift angle (where ash blows TOWARDS = directionDeg + 180 % 360)
    directionCardinal: string;
    gustMs: number;
  };
  atmosphericLevels: AtmosphericWindLevel[];
  forecast: WeatherForecastPoint[];
}
