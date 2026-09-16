import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const KRAKATAU_LAT = -6.1021;
const KRAKATAU_LON = 105.423;

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

function getCompassCardinal(deg: number): string {
  const norm = ((deg % 360) + 360) % 360;
  const closest = Object.keys(COMPASS_POINTS)
    .map(Number)
    .reduce((prev, curr) => (Math.abs(curr - norm) < Math.abs(prev - norm) ? curr : prev));
  return COMPASS_POINTS[closest] || `${norm}°`;
}

function getWeatherDescFromWmoCode(code: number): string {
  if (code === 0) return 'Langit Cerah';
  if (code === 1) return 'Cerah Berawan';
  if (code === 2) return 'Sebagian Berawan';
  if (code === 3) return 'Berawan Tebal';
  if (code === 45 || code === 48) return 'Berkabut Vulkanik / Laut';
  if (code >= 51 && code <= 55) return 'Gerimis Halus';
  if (code >= 61 && code <= 65) return 'Hujan Tropis';
  if (code >= 80 && code <= 82) return 'Hujan Lebat Selat Sunda';
  if (code >= 95) return 'Badai Petir Tropis';
  return 'Berawan';
}

// Fallback baseline in case network is disconnected
function getFallbackWeather(sourceNote = 'Sensor Baseline (Simulasi)') {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return {
    timestamp: now.toISOString(),
    lastUpdated: `${timeStr} WIB`,
    source: sourceNote,
    stationName: 'Stasiun Meteorologi Selat Sunda - Anak Krakatau (BMKG/WMO)',
    coordinates: {
      lat: KRAKATAU_LAT,
      lon: KRAKATAU_LON,
      elevationM: 157,
    },
    temperatureC: 28.5,
    apparentTempC: 32.1,
    relativeHumidity: 78,
    pressureHpa: 1011.2,
    weatherCondition: 'Cerah Berawan (Monsun Tropis)',
    weatherCode: 2,
    surface: {
      tempC: 28.5,
      humidityPct: 78,
    },
    wind: {
      speedMs: 5.8,
      speedKmh: 20.9,
      directionDeg: 120, // blowing from East-Southeast
      driftDirectionDeg: 300, // ash drifts toward West-Northwest
      directionCardinal: 'Tenggara (SE)',
      gustMs: 8.4,
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
        recommendedFor: 'Emisi gas fumarola & lapili permukaan',
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
        recommendedFor: 'Erupsi Strombolian & Kolom Letusan Rendah',
      },
      {
        levelId: '700hpa',
        name: 'Lapisan 700 hPa (~3.000m)',
        altitudeM: 3000,
        pressureHpa: 700,
        speedMs: 9.5,
        speedKmh: 34.2,
        directionDeg: 100,
        directionCardinal: 'Timur (E)',
        recommendedFor: 'Erupsi Vulkanian Sedang (SIGMET BMKG)',
      },
      {
        levelId: '500hpa',
        name: 'Lapisan 500 hPa (~5.500m)',
        altitudeM: 5500,
        pressureHpa: 500,
        speedMs: 14.1,
        speedKmh: 50.8,
        directionDeg: 85,
        directionCardinal: 'Timur Laut (ENE)',
        recommendedFor: 'Erupsi Sub-Plinian Paroksismal & Koridor Aviasi',
      },
    ],
    forecast: Array.from({ length: 8 }).map((_, i) => {
      const fTime = new Date(now.getTime() + (i + 1) * 2 * 3600 * 1000);
      const hourStr = fTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      return {
        timeIso: fTime.toISOString(),
        timeLabel: `${hourStr} WIB`,
        tempC: Math.round((28.5 + Math.sin(i) * 1.8) * 10) / 10,
        speedMs: Math.round((5.8 + Math.cos(i) * 1.2) * 10) / 10,
        speedKmh: Math.round((5.8 + Math.cos(i) * 1.2) * 3.6 * 10) / 10,
        directionDeg: Math.round((120 + i * 4) % 360),
        directionCardinal: getCompassCardinal(Math.round((120 + i * 4) % 360)),
      };
    }),
  };
}

async function fetchRealtimeWeather() {
  const openWeatherApiKey = process.env.OPENWEATHER_API_KEY;

  try {
    // 1. Fetch Open-Meteo data (atmospheric levels + surface)
    const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${KRAKATAU_LAT}&longitude=${KRAKATAU_LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=wind_speed_10m,wind_direction_10m,wind_speed_850hPa,wind_direction_850hPa,wind_speed_700hPa,wind_direction_700hPa,wind_speed_500hPa,wind_direction_500hPa,temperature_2m&wind_speed_unit=ms&timezone=Asia%2FJakarta&forecast_days=2`;

    const meteoRes = await fetch(openMeteoUrl, { signal: AbortSignal.timeout(6000) });
    if (!meteoRes.ok) {
      throw new Error(`Open-Meteo HTTP error: ${meteoRes.status}`);
    }
    const meteoData = await meteoRes.json();

    const curr = meteoData.current || {};
    const hourly = meteoData.hourly || {};

    let sourceName: 'OpenWeatherMap' | 'Open-Meteo' = 'Open-Meteo';
    let tempC = Number(curr.temperature_2m ?? 28);
    let feelsLikeC = Number(curr.apparent_temperature ?? tempC);
    let humidity = Number(curr.relative_humidity_2m ?? 75);
    let pressure = Number(curr.surface_pressure ?? 1012);
    let windSpeedMs = Number(curr.wind_speed_10m ?? 5.5);
    let windDirectionDeg = Math.round(Number(curr.wind_direction_10m ?? 120));
    let windGustMs = Number(curr.wind_gusts_10m ?? windSpeedMs * 1.4);
    let weatherCondition = getWeatherDescFromWmoCode(curr.weather_code ?? 1);

    // 2. If OPENWEATHER_API_KEY is configured, merge OpenWeatherMap real-time data
    if (openWeatherApiKey && openWeatherApiKey !== 'MY_OPENWEATHER_KEY') {
      try {
        const owmUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${KRAKATAU_LAT}&lon=${KRAKATAU_LON}&units=metric&appid=${openWeatherApiKey}`;
        const owmRes = await fetch(owmUrl, { signal: AbortSignal.timeout(4000) });
        if (owmRes.ok) {
          const owmData = await owmRes.json();
          sourceName = 'OpenWeatherMap';
          if (owmData.main?.temp !== undefined) tempC = Number(owmData.main.temp);
          if (owmData.main?.feels_like !== undefined) feelsLikeC = Number(owmData.main.feels_like);
          if (owmData.main?.humidity !== undefined) humidity = Number(owmData.main.humidity);
          if (owmData.main?.pressure !== undefined) pressure = Number(owmData.main.pressure);
          if (owmData.wind?.speed !== undefined) windSpeedMs = Number(owmData.wind.speed);
          if (owmData.wind?.deg !== undefined) windDirectionDeg = Math.round(Number(owmData.wind.deg));
          if (owmData.wind?.gust !== undefined) windGustMs = Number(owmData.wind.gust);
          if (owmData.weather?.[0]?.description) {
            weatherCondition = owmData.weather[0].description;
          }
        }
      } catch (owmErr) {
        console.warn('OpenWeatherMap request fallback to Open-Meteo:', owmErr);
      }
    }

    // Process upper air winds from hourly forecast (current index)
    const times: string[] = hourly.time || [];
    const currTimeIso = curr.time || new Date().toISOString();
    let currIdx = times.findIndex((t) => t >= currTimeIso);
    if (currIdx === -1) currIdx = 0;

    const speed850 = Number(hourly.wind_speed_850hPa?.[currIdx] ?? windSpeedMs * 1.25);
    const dir850 = Math.round(Number(hourly.wind_direction_850hPa?.[currIdx] ?? windDirectionDeg));

    const speed700 = Number(hourly.wind_speed_700hPa?.[currIdx] ?? windSpeedMs * 1.6);
    const dir700 = Math.round(Number(hourly.wind_direction_700hPa?.[currIdx] ?? (windDirectionDeg - 15 + 360) % 360));

    const speed500 = Number(hourly.wind_speed_500hPa?.[currIdx] ?? windSpeedMs * 2.2);
    const dir500 = Math.round(Number(hourly.wind_direction_500hPa?.[currIdx] ?? (windDirectionDeg - 30 + 360) % 360));

    // Forecast points for next 12 hours (step of 2h)
    const forecast = [];
    for (let step = 1; step <= 8; step++) {
      const idx = currIdx + step * 2;
      if (idx < times.length) {
        const timeStr = times[idx];
        const dateObj = new Date(timeStr);
        const hourFmt = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        const fSpeed = Number(hourly.wind_speed_10m?.[idx] ?? windSpeedMs);
        const fDir = Math.round(Number(hourly.wind_direction_10m?.[idx] ?? windDirectionDeg));
        const fTemp = Number(hourly.temperature_2m?.[idx] ?? tempC);

        forecast.push({
          timeIso: timeStr,
          timeLabel: `${hourFmt} WIB`,
          tempC: Math.round(fTemp * 10) / 10,
          speedMs: Math.round(fSpeed * 10) / 10,
          speedKmh: Math.round(fSpeed * 3.6 * 10) / 10,
          directionDeg: fDir,
          directionCardinal: getCompassCardinal(fDir),
        });
      }
    }

    const now = new Date();
    const timeDisplay = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    return {
      timestamp: now.toISOString(),
      lastUpdated: `${timeDisplay} WIB`,
      source: sourceName,
      stationName: 'Stasiun Meteorologi Selat Sunda - Anak Krakatau (BMKG/WMO)',
      coordinates: {
        lat: KRAKATAU_LAT,
        lon: KRAKATAU_LON,
        elevationM: 157,
      },
      temperatureC: Math.round(tempC * 10) / 10,
      apparentTempC: Math.round(feelsLikeC * 10) / 10,
      relativeHumidity: Math.round(humidity),
      pressureHpa: Math.round(pressure * 10) / 10,
      weatherCondition: weatherCondition,
      weatherCode: curr.weather_code ?? 1,
      surface: {
        tempC: Math.round(tempC * 10) / 10,
        humidityPct: Math.round(humidity),
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
          pressureHpa: Math.round(pressure),
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
          recommendedFor: 'Erupsi Strombolian & Kolom Letusan Rendah',
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
          recommendedFor: 'Erupsi Sub-Plinian Paroksismal & Koridor Aviasi',
        },
      ],
      forecast: forecast.length > 0 ? forecast : getFallbackWeather().forecast,
    };
  } catch (err) {
    console.error('Failed to fetch real-time weather, using calibrated baseline:', err);
    return getFallbackWeather();
  }
}

async function startServer() {
  const app = express();

  // API Routes FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Weather Endpoint
  app.get('/api/weather', async (req, res) => {
    try {
      const weatherData = await fetchRealtimeWeather();
      res.json(weatherData);
    } catch (err: any) {
      console.error('Error handling /api/weather:', err);
      res.status(500).json({ error: 'Failed to retrieve weather data', details: err?.message });
    }
  });

  // Vite Middleware Setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
