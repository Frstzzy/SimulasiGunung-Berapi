/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { KrakatauWeather, AtmosphericWindLevel, WeatherForecastPoint } from '../types';

export const KRAKATAU_COORDINATES = {
  lat: -6.1021,
  lon: 105.423,
  name: 'Gunung Anak Krakatau, Selat Sunda',
  elevationM: 157,
};

const COMPASS_POINTS: { [key: number]: string } = {
  0: 'Utara (N)',
  45: 'Timur Laut (NE)',
  90: 'Timur (E)',
  135: 'Tenggara (SE)',
  180: 'Selatan (S)',
  225: 'Barat Daya (SW)',
  270: 'Barat (W)',
  315: 'Barat Laut (NW)',
  360: 'Utara (N)',
};

export function getCompassCardinal(deg: number): string {
  const norm = ((deg % 360) + 360) % 360;
  const closest = Object.keys(COMPASS_POINTS)
    .map(Number)
    .reduce((prev, curr) => (Math.abs(curr - norm) < Math.abs(prev - norm) ? curr : prev));
  return COMPASS_POINTS[closest] || `${norm}°`;
}

export function getWeatherConditionDescription(code: number): string {
  if (code === 0) return 'Langit Cerah';
  if (code === 1) return 'Cerah Berawan';
  if (code === 2) return 'Sebagian Berawan';
  if (code === 3) return 'Berawan Tebal';
  if (code === 45 || code === 48) return 'Berkabut Asap / Laut';
  if (code >= 51 && code <= 55) return 'Gerimis Halus';
  if (code >= 61 && code <= 65) return 'Hujan Tropis';
  if (code >= 80 && code <= 82) return 'Hujan Deras Selat Sunda';
  if (code >= 95) return 'Badai Petir Tropis';
  return 'Berawan';
}

export function getFallbackKrakatauWeather(): KrakatauWeather {
  const now = new Date();
  const timeDisplay = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return {
    timestamp: now.toISOString(),
    lastUpdated: `${timeDisplay} WIB`,
    source: 'Sensor Baseline (Simulasi)',
    stationName: 'Stasiun Meteorologi Selat Sunda - Anak Krakatau (BMKG/WMO)',
    coordinates: {
      lat: KRAKATAU_COORDINATES.lat,
      lon: KRAKATAU_COORDINATES.lon,
      elevationM: 157,
    },
    temperatureC: 28.5,
    apparentTempC: 32.0,
    relativeHumidity: 78,
    pressureHpa: 1011.5,
    weatherCondition: 'Cerah Berawan (Monsun Tropis)',
    weatherCode: 2,
    surface: {
      tempC: 28.5,
      humidityPct: 78,
    },
    wind: {
      speedMs: 5.8,
      speedKmh: 20.9,
      directionDeg: 120,
      driftDirectionDeg: 300,
      directionCardinal: 'Tenggara (SE)',
      gustMs: 8.5,
    },
    atmosphericLevels: [
      {
        levelId: 'surface',
        name: 'Permukaan Laut (10m)',
        altitudeM: 10,
        pressureHpa: 1012,
        speedMs: 5.8,
        speedKmh: 20.9,
        directionDeg: 120,
        directionCardinal: 'Tenggara (SE)',
        recommendedFor: 'Emisi gas fumarola & lapili dekat kawah',
      },
      {
        levelId: '850hpa',
        name: 'Lapisan 850 hPa (~1.500m)',
        altitudeM: 1500,
        pressureHpa: 850,
        speedMs: 7.2,
        speedKmh: 25.9,
        directionDeg: 115,
        directionCardinal: 'Timur-Tenggara (ESE)',
        recommendedFor: 'Erupsi Strombolian & Letusan Abu Rendah',
      },
      {
        levelId: '700hpa',
        name: 'Lapisan 700 hPa (~3.000m)',
        altitudeM: 3000,
        pressureHpa: 700,
        speedMs: 9.6,
        speedKmh: 34.6,
        directionDeg: 100,
        directionCardinal: 'Timur (E)',
        recommendedFor: 'Erupsi Vulkanian Sedang (Standar SIGMET BMKG)',
      },
      {
        levelId: '500hpa',
        name: 'Lapisan 500 hPa (~5.500m)',
        altitudeM: 5500,
        pressureHpa: 500,
        speedMs: 14.4,
        speedKmh: 51.8,
        directionDeg: 85,
        directionCardinal: 'Timur Laut (ENE)',
        recommendedFor: 'Erupsi Sub-Plinian Paroksismal & Aviasi Jetstream',
      },
    ],
    forecast: Array.from({ length: 6 }).map((_, i) => {
      const fTime = new Date(now.getTime() + (i + 1) * 2 * 3600 * 1000);
      const hourStr = fTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      return {
        timeIso: fTime.toISOString(),
        timeLabel: `${hourStr} WIB`,
        tempC: 28.5 + Math.round(Math.sin(i) * 1.5 * 10) / 10,
        speedMs: 5.8 + Math.round(Math.cos(i) * 1.2 * 10) / 10,
        speedKmh: Math.round((5.8 + Math.cos(i) * 1.2) * 3.6 * 10) / 10,
        directionDeg: Math.round((120 + i * 5) % 360),
        directionCardinal: getCompassCardinal(Math.round((120 + i * 5) % 360)),
      };
    }),
  };
}

/**
 * Fetch real-time weather from the /api/weather endpoint,
 * with fallback to client-side direct Open-Meteo query if server route is unreachable.
 */
export async function fetchKrakatauWeather(): Promise<KrakatauWeather> {
  // 1. Try internal backend API proxy first (which hides API keys & aggregates OpenWeatherMap / Open-Meteo)
  try {
    const res = await fetch('/api/weather', {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data: KrakatauWeather = await res.json();
      if (data && data.wind) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Backend /api/weather unavailable, attempting direct Open-Meteo fallback:', err);
  }

  // 2. Direct client-side fetch from open public Open-Meteo endpoint (no API key required)
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${KRAKATAU_COORDINATES.lat}&longitude=${KRAKATAU_COORDINATES.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=wind_speed_10m,wind_direction_10m,wind_speed_850hPa,wind_direction_850hPa,wind_speed_700hPa,wind_direction_700hPa,wind_speed_500hPa,wind_direction_500hPa,temperature_2m&wind_speed_unit=ms&timezone=Asia%2FJakarta&forecast_days=2`;

    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      const curr = data.current || {};
      const hourly = data.hourly || {};

      const tempC = Number(curr.temperature_2m ?? 28);
      const windSpeedMs = Number(curr.wind_speed_10m ?? 5.5);
      const windDirectionDeg = Math.round(Number(curr.wind_direction_10m ?? 120));
      const windGustMs = Number(curr.wind_gusts_10m ?? windSpeedMs * 1.3);

      const now = new Date();
      const timeDisplay = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      // Upper air
      const times: string[] = hourly.time || [];
      const currIso = curr.time || now.toISOString();
      let currIdx = times.findIndex((t) => t >= currIso);
      if (currIdx === -1) currIdx = 0;

      const speed850 = Number(hourly.wind_speed_850hPa?.[currIdx] ?? windSpeedMs * 1.25);
      const dir850 = Math.round(Number(hourly.wind_direction_850hPa?.[currIdx] ?? windDirectionDeg));

      const speed700 = Number(hourly.wind_speed_700hPa?.[currIdx] ?? windSpeedMs * 1.6);
      const dir700 = Math.round(Number(hourly.wind_direction_700hPa?.[currIdx] ?? (windDirectionDeg - 15 + 360) % 360));

      const speed500 = Number(hourly.wind_speed_500hPa?.[currIdx] ?? windSpeedMs * 2.2);
      const dir500 = Math.round(Number(hourly.wind_direction_500hPa?.[currIdx] ?? (windDirectionDeg - 30 + 360) % 360));

      const forecast: WeatherForecastPoint[] = [];
      for (let step = 1; step <= 6; step++) {
        const idx = currIdx + step * 2;
        if (idx < times.length) {
          const tIso = times[idx];
          const dObj = new Date(tIso);
          const hourLabel = dObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          const spd = Number(hourly.wind_speed_10m?.[idx] ?? windSpeedMs);
          const dir = Math.round(Number(hourly.wind_direction_10m?.[idx] ?? windDirectionDeg));
          forecast.push({
            timeIso: tIso,
            timeLabel: `${hourLabel} WIB`,
            tempC: Math.round(Number(hourly.temperature_2m?.[idx] ?? tempC) * 10) / 10,
            speedMs: Math.round(spd * 10) / 10,
            speedKmh: Math.round(spd * 3.6 * 10) / 10,
            directionDeg: dir,
            directionCardinal: getCompassCardinal(dir),
          });
        }
      }

      return {
        timestamp: now.toISOString(),
        lastUpdated: `${timeDisplay} WIB`,
        source: 'Open-Meteo',
        stationName: 'Stasiun Meteorologi Selat Sunda - Anak Krakatau (BMKG/WMO)',
        coordinates: {
          lat: KRAKATAU_COORDINATES.lat,
          lon: KRAKATAU_COORDINATES.lon,
          elevationM: 157,
        },
        temperatureC: Math.round(tempC * 10) / 10,
        apparentTempC: Math.round(Number(curr.apparent_temperature ?? tempC) * 10) / 10,
        relativeHumidity: Math.round(Number(curr.relative_humidity_2m ?? 75)),
        pressureHpa: Math.round(Number(curr.surface_pressure ?? 1012)),
        weatherCondition: getWeatherConditionDescription(curr.weather_code ?? 1),
        weatherCode: curr.weather_code ?? 1,
        surface: {
          tempC: Math.round(tempC * 10) / 10,
          humidityPct: Math.round(Number(curr.relative_humidity_2m ?? 75)),
        },
        wind: {
          speedMs: Math.round(windSpeedMs * 10) / 10,
          speedKmh: Math.round(windSpeedMs * 3.6 * 10) / 10,
          directionDeg: windDirectionDeg,
          driftDirectionDeg: (windDirectionDeg + 180) % 360,
          directionCardinal: getCompassCardinal(windDirectionDeg),
          gustMs: Math.round(windGustMs * 10) / 10,
        },
        atmosphericLevels: [
          {
            levelId: 'surface',
            name: 'Permukaan Laut (10m)',
            altitudeM: 10,
            pressureHpa: 1012,
            speedMs: Math.round(windSpeedMs * 10) / 10,
            speedKmh: Math.round(windSpeedMs * 3.6 * 10) / 10,
            directionDeg: windDirectionDeg,
            directionCardinal: getCompassCardinal(windDirectionDeg),
            recommendedFor: 'Emisi gas fumarola & lapili permukaan',
          },
          {
            levelId: '850hpa',
            name: 'Lapisan 850 hPa (~1.500m)',
            altitudeM: 1500,
            pressureHpa: 850,
            speedMs: Math.round(speed850 * 10) / 10,
            speedKmh: Math.round(speed850 * 3.6 * 10) / 10,
            directionDeg: dir850,
            directionCardinal: getCompassCardinal(dir850),
            recommendedFor: 'Erupsi Strombolian & Kolom Rendah',
          },
          {
            levelId: '700hpa',
            name: 'Lapisan 700 hPa (~3.000m)',
            altitudeM: 3000,
            pressureHpa: 700,
            speedMs: Math.round(speed700 * 10) / 10,
            speedKmh: Math.round(speed700 * 3.6 * 10) / 10,
            directionDeg: dir700,
            directionCardinal: getCompassCardinal(dir700),
            recommendedFor: 'Erupsi Vulkanian Sedang (SIGMET BMKG)',
          },
          {
            levelId: '500hpa',
            name: 'Lapisan 500 hPa (~5.500m)',
            altitudeM: 5500,
            pressureHpa: 500,
            speedMs: Math.round(speed500 * 10) / 10,
            speedKmh: Math.round(speed500 * 3.6 * 10) / 10,
            directionDeg: dir500,
            directionCardinal: getCompassCardinal(dir500),
            recommendedFor: 'Erupsi Paroksismal & Koridor Aviasi',
          },
        ],
        forecast,
      };
    }
  } catch (err) {
    console.warn('Direct Open-Meteo fetch failed, using calibrated fallback:', err);
  }

  // 3. Fallback baseline
  return getFallbackKrakatauWeather();
}
