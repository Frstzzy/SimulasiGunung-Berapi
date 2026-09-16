/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Model Fisika Aerosol Vulkanik Gunung Anak Krakatau
 * Menghitung:
 * 1. Oksidasi SO2 menjadi Aerosol Sulfat (H2SO4 - H2O droplets)
 * 2. Aerosol Optical Depth (AOD pada panjang gelombang 550 nm, tau_550)
 * 3. Radiative Forcing (W/m2) dan anomali pendinginan suhu lokal (Delta T)
 * 4. Konsentrasi Partikulat Aerosol Permukaan (PM2.5 & PM10 dalam ug/m3)
 * 5. Dinamika Kecepatan Pengendapan Stokes & Waktu Tinggal di Atmosfer
 */

export interface AerosolSimulationParams {
  so2EmissionRateTonsPerDay: number; // Emisi SO2 gas (ton/hari)
  relativeHumidityPct: number; // Kelembaban relatif atmosfer (%)
  uvRadiationIndex: number; // Indeks radiasi UV matahari (1 - 12)
  plumeHeightM: number; // Ketinggian puncak kolom asap (meter)
  windSpeedMs: number; // Kecepatan angin (m/s)
  windDirectionDeg: number; // Arah angin datang (derajat)
  elapsedHours: number; // Jam simulasi pasca letusan
}

export interface AerosolMetrics {
  // Oksidasi Kimiawi Atmosfer
  oxidationRatePctPerHour: number; // Laju konversi SO2 -> H2SO4 (% / jam)
  sulfateProductionKgPerHour: number; // Produksi massa droplet sulfat per jam
  cumulativeSulfateMassTons: number; // Akumulasi total massa aerosol sulfat (ton)
  massMultiplier: number; // Rasio massa molar (H2SO4 + H2O hidrat) / SO2 (~ 1.53 - 1.85)

  // Sifat Optik & Efek Radiasi
  peakAod550: number; // Aerosol Optical Depth pada 550nm di pusat plume
  aodCategory: 'Jernih' | 'Kabut Tipis' | 'Moderat' | 'Pekat' | 'Ekstrem';
  solarRadiationAttenuationPct: number; // Reduksi radiasi matahari langsung (%)
  radiativeForcingWm2: number; // Radiative forcing atmosfer (W/m2, bernilai negatif = pendinginan)
  surfaceCoolingDeltaC: number; // Estimasi penurunan suhu permukaan lokal (°C)

  // Mikrofisika Partikel Aerosol
  dominantMode: 'Nucleation' | 'Aitken' | 'Accumulation' | 'Coarse';
  meanRadiusMicrons: number; // Radius efektif droplet aerosol (mikrometer)
  stokesSettlingVelocityMps: number; // Kecepatan pengendapan Stokes (m/s)
  atmosphericResidenceDays: number; // Waktu tinggal aerosol di atmosfer (hari)
  stratosphericInjection: boolean; // Apakah aerosol menembus tropopause Selat Sunda (~16.5 km)

  // Kualitas Udara Puncak (Ground Peak)
  peakPm25UgM3: number; // Konsentrasi puncak PM2.5 permukaan (ug/m3)
  peakPm10UgM3: number; // Konsentrasi puncak PM10 permukaan (ug/m3)
  ispuAqiCategory: 'BAIK' | 'SEDANG' | 'TIDAK SEHAT' | 'SANGAT TIDAK SEHAT' | 'BERBAHAYA';
}

export interface RegionalAerosolStation {
  id: string;
  name: string;
  province: string;
  coords: [number, number];
  distKm: number;
  bearingDeg: number;
  bearingCardinal: string;
  population: string;
}

export interface StationAerosolEvaluation {
  station: RegionalAerosolStation;
  inPlumePath: boolean;
  angularDevDeg: number;
  etaHours: number;
  pm25UgM3: number;
  pm10UgM3: number;
  aod550: number;
  visibilityKm: number;
  ispuCategory: 'BAIK' | 'SEDANG' | 'TIDAK SEHAT' | 'SANGAT TIDAK SEHAT' | 'BERBAHAYA';
  healthAdvisory: string;
}

/**
 * Daftar Stasiun Pengamatan & Kawasan Pemukiman Pesisir Selat Sunda
 */
export const AEROSOL_OBSERVATION_STATIONS: RegionalAerosolStation[] = [
  {
    id: 'sta-anyer',
    name: 'Anyer Pesisir',
    province: 'Banten',
    coords: [-6.0500, 105.9200],
    distKm: 55.3,
    bearingDeg: 84,
    bearingCardinal: 'Timur',
    population: '±58.000 jiwa',
  },
  {
    id: 'sta-cilegon',
    name: 'Kawasan Industri Cilegon',
    province: 'Banten',
    coords: [-6.0170, 106.0500],
    distKm: 70.8,
    bearingDeg: 78,
    bearingCardinal: 'Timur-Timur Laut',
    population: '±450.000 jiwa',
  },
  {
    id: 'sta-merak',
    name: 'Pelabuhan Merak',
    province: 'Banten',
    coords: [-5.9320, 105.9980],
    distKm: 65.4,
    bearingDeg: 69,
    bearingCardinal: 'Timur-Timur Laut',
    population: 'Pusat Feri Jawa-Sumatra',
  },
  {
    id: 'sta-carita',
    name: 'Carita & Labuan',
    province: 'Banten',
    coords: [-6.3000, 105.8300],
    distKm: 49.5,
    bearingDeg: 116,
    bearingCardinal: 'Tenggara',
    population: '±75.000 jiwa',
  },
  {
    id: 'sta-bakauheni',
    name: 'Bakauheni Lampung',
    province: 'Lampung',
    coords: [-5.8670, 105.7500],
    distKm: 44.8,
    bearingDeg: 54,
    bearingCardinal: 'Timur Laut',
    population: 'Pintu Gerbang Sumatra',
  },
  {
    id: 'sta-kalianda',
    name: 'Kalianda Lampung Selatan',
    province: 'Lampung',
    coords: [-5.7400, 105.6200],
    distKm: 45.9,
    bearingDeg: 28,
    bearingCardinal: 'Utara-Timur Laut',
    population: '±95.000 jiwa',
  },
  {
    id: 'sta-bandarlampung',
    name: 'Kota Bandar Lampung',
    province: 'Lampung',
    coords: [-5.4297, 105.2625],
    distKm: 81.2,
    bearingDeg: 345,
    bearingCardinal: 'Utara-Barat Laut',
    population: '±1.150.000 jiwa',
  },
  {
    id: 'sta-jakarta',
    name: 'DKI Jakarta / Tangerang',
    province: 'DKI Jakarta',
    coords: [-6.1754, 106.8272],
    distKm: 156.0,
    bearingDeg: 83,
    bearingCardinal: 'Timur',
    population: '>12.000.000 jiwa',
  },
];

/**
 * Menghitung parameter aerosol komprehensif berdasarkan input erupsi dan meteorologi
 */
export function calculateVolcanicAerosols(params: AerosolSimulationParams): AerosolMetrics {
  const {
    so2EmissionRateTonsPerDay,
    relativeHumidityPct,
    uvRadiationIndex,
    plumeHeightM,
    windSpeedMs,
    elapsedHours,
  } = params;

  // 1. Laju Oksidasi Kimiawi Atmosfer (Gas-to-Particle Conversion)
  // Reaksi fotokimia: SO2 + OH* -> H2SO4
  // Dipengaruhi oleh radiasi UV (pembentukan radikal OH) dan kelembaban (fase aqueous/cair)
  const baseRate = 0.012; // 1.2% per jam pada kondisi dasar
  const uvFactor = 0.5 + (uvRadiationIndex / 10) * 0.8; // 0.5 - 1.46
  const rhFactor = 0.8 + Math.pow(relativeHumidityPct / 100, 1.5) * 0.7; // 0.8 - 1.5
  
  // Laju konversi total (% per jam, tipikal 1.5% - 3.8%/jam di iklim tropis Selat Sunda)
  const oxidationRatePctPerHour = Number((baseRate * uvFactor * rhFactor * 100).toFixed(2));
  const kOxidation = oxidationRatePctPerHour / 100; // satuan 1/jam

  // Rasio konversi massa molekul: SO2 (64.06 g/mol) -> H2SO4 (98.08 g/mol) + H2O hidrat (~25% massa)
  // Massa aerosol sulfat hidrat = 1.53 * 1.25 ~= 1.91 x massa SO2 yang teroksidasi
  const massMultiplier = 1.88;

  // Laju emisi SO2 per jam (kg/jam)
  const so2KgPerHour = (so2EmissionRateTonsPerDay * 1000) / 24;

  // Laju produksi aerosol sulfat baru per jam (kg/jam)
  const sulfateProductionKgPerHour = Number((so2KgPerHour * kOxidation * massMultiplier).toFixed(1));

  // Akumulasi massa sulfat setelah elapsedHours
  const effectiveHours = Math.max(0.1, elapsedHours);
  const fractionConverted = 1 - Math.exp(-kOxidation * effectiveHours);
  const totalSo2EmittedTons = (so2EmissionRateTonsPerDay / 24) * effectiveHours;
  const cumulativeSulfateMassTons = Number((totalSo2EmittedTons * fractionConverted * massMultiplier).toFixed(2));

  // 2. Sifat Mikrofisika Partikel
  // Aerosol vulkanik didominasi akumulasi sulfat cair (radius 0.15 - 0.75 um)
  // Semakin lembab atmosfer, partikel bersifat higroskopis dan membesar
  const meanRadiusMicrons = Number((0.25 + (relativeHumidityPct / 100) * 0.35 + Math.min(0.2, effectiveHours * 0.02)).toFixed(3));
  
  let dominantMode: 'Nucleation' | 'Aitken' | 'Accumulation' | 'Coarse' = 'Accumulation';
  if (meanRadiusMicrons < 0.05) dominantMode = 'Nucleation';
  else if (meanRadiusMicrons < 0.1) dominantMode = 'Aitken';
  else if (meanRadiusMicrons <= 1.0) dominantMode = 'Accumulation';
  else dominantMode = 'Coarse';

  // Kecepatan Pengendapan Stokes (Stokes' Terminal Settling Velocity)
  // vs = 2 * r^2 * (rho_p - rho_a) * g / (9 * eta)
  const rMeters = meanRadiusMicrons * 1e-6;
  const rhoParticle = 1650; // Densitas droplet asam sulfat terhidrasi (kg/m3)
  const rhoAir = 1.225; // kg/m3
  const g = 9.81;
  const etaAir = 1.81e-5; // Pa.s
  const stokesSettlingVelocityMps = Number(((2 / 9) * ((rhoParticle - rhoAir) * g * Math.pow(rMeters, 2)) / etaAir).toFixed(7));

  // Tropopause di kawasan khatulistiwa Selat Sunda berada di sekitar 16.500 m
  const stratosphericInjection = plumeHeightM >= 16500;

  // Waktu tinggal di atmosfer (Troposphere: 5-14 hari; Stratosphere: 6-24 bulan)
  const atmosphericResidenceDays = stratosphericInjection
    ? Number((180 + (plumeHeightM - 16500) * 0.05).toFixed(0))
    : Number(Math.max(3, 12 - (relativeHumidityPct / 100) * 5).toFixed(1));

  // 3. Ketebalan Optik Aerosol (AOD pada 550 nm, tau_550)
  // tau = mass_extinction_efficiency * column_mass_density
  // Efisiensi ekstingsi massa spesifik sulfat hidrat: ~ 4.8 m2/g
  const massExtinctionEfficiencyM2g = 4.8;
  const windDilutionFactor = Math.max(1.5, windSpeedMs);
  const plumeColumnDensityGm2 = (so2KgPerHour * 0.001 * (1 + fractionConverted * 0.8)) / (windDilutionFactor * Math.max(500, plumeHeightM * 0.4));
  const peakAod550 = Number(Math.min(5.0, Math.max(0.05, plumeColumnDensityGm2 * massExtinctionEfficiencyM2g * 2.5)).toFixed(2));

  let aodCategory: 'Jernih' | 'Kabut Tipis' | 'Moderat' | 'Pekat' | 'Ekstrem' = 'Jernih';
  if (peakAod550 < 0.15) aodCategory = 'Jernih';
  else if (peakAod550 < 0.45) aodCategory = 'Kabut Tipis';
  else if (peakAod550 < 1.0) aodCategory = 'Moderat';
  else if (peakAod550 < 2.5) aodCategory = 'Pekat';
  else aodCategory = 'Ekstrem';

  // Pelemahan Radiasi Surya Langsung (Hukum Beer-Lambert: I / I0 = exp(-tau))
  const solarTransmission = Math.exp(-peakAod550);
  const solarRadiationAttenuationPct = Number(((1 - solarTransmission) * 100).toFixed(1));

  // Radiative Forcing (W/m2)
  // Delta F ~= - (S0 / 4) * (1 - As)^2 * (2 * T_atm^2) * beta * tau ~= -28 * tau
  const radiativeForcingWm2 = Number((-28.5 * peakAod550).toFixed(1));

  // Estimasi Pendinginan Suhu Permukaan Lokal
  // Delta T = lambda * Delta F (dengan sensitivitas iklim lambda ~ 0.06 - 0.12 K / (W/m2))
  const surfaceCoolingDeltaC = Number((Math.abs(radiativeForcingWm2) * 0.085).toFixed(2));

  // 4. Konsentrasi Puncak Ground PM2.5 & PM10 (ug/m3)
  // Partikel aerosol sulfat sekunder berada dominan pada fraksi halus PM2.5
  const baselinePlumeConcentration = (so2EmissionRateTonsPerDay * 12.5) / (windDilutionFactor * 0.8);
  const peakPm25UgM3 = Number(Math.min(950, Math.max(5, baselinePlumeConcentration * 0.72)).toFixed(1));
  const peakPm10UgM3 = Number(Math.min(1500, peakPm25UgM3 * 1.45).toFixed(1));

  let ispuAqiCategory: 'BAIK' | 'SEDANG' | 'TIDAK SEHAT' | 'SANGAT TIDAK SEHAT' | 'BERBAHAYA' = 'BAIK';
  if (peakPm25UgM3 <= 15) ispuAqiCategory = 'BAIK';
  else if (peakPm25UgM3 <= 55) ispuAqiCategory = 'SEDANG';
  else if (peakPm25UgM3 <= 150) ispuAqiCategory = 'TIDAK SEHAT';
  else if (peakPm25UgM3 <= 250) ispuAqiCategory = 'SANGAT TIDAK SEHAT';
  else ispuAqiCategory = 'BERBAHAYA';

  return {
    oxidationRatePctPerHour,
    sulfateProductionKgPerHour,
    cumulativeSulfateMassTons,
    massMultiplier,
    peakAod550,
    aodCategory,
    solarRadiationAttenuationPct,
    radiativeForcingWm2,
    surfaceCoolingDeltaC,
    dominantMode,
    meanRadiusMicrons,
    stokesSettlingVelocityMps,
    atmosphericResidenceDays,
    stratosphericInjection,
    peakPm25UgM3,
    peakPm10UgM3,
    ispuAqiCategory,
  };
}

/**
 * Mengevaluasi sebaran aerosol ke stasiun-stasiun wilayah pesisir
 */
export function evaluateRegionalAerosolStations(
  params: AerosolSimulationParams,
  metrics: AerosolMetrics
): StationAerosolEvaluation[] {
  // Arah hembusan awan aerosol downwind: (windDirection + 180) % 360
  const driftDeg = (params.windDirectionDeg + 180) % 360;
  const windSpeedKmh = Math.max(10, params.windSpeedMs * 3.6);

  return AEROSOL_OBSERVATION_STATIONS.map((station) => {
    // Hitung deviasi sudut
    let angularDev = Math.abs(station.bearingDeg - driftDeg);
    if (angularDev > 180) angularDev = 360 - angularDev;

    // Lebar kerucut aerosol lebih luas daripada abu padat (karena difusi gas SO2 dan droplet mikro)
    const coneHalfWidthDeg = 36 + Math.min(22, params.elapsedHours * 1.8);
    const inPlumePath = angularDev <= coneHalfWidthDeg;

    // Waktu tiba aerosol (jam)
    const etaHours = Number((station.distKm / windSpeedKmh).toFixed(1));
    const hasArrived = params.elapsedHours >= etaHours;

    let pm25UgM3 = 8.5; // Konsentrasi latar belakang laut tropis
    let pm10UgM3 = 14.0;
    let aod550 = 0.08;
    let visibilityKm = 25.0;
    let ispuCategory: 'BAIK' | 'SEDANG' | 'TIDAK SEHAT' | 'SANGAT TIDAK SEHAT' | 'BERBAHAYA' = 'BAIK';
    let healthAdvisory = 'Kualitas udara sangat baik. Udara pesisir bersih dan aman untuk beraktivitas.';

    if (inPlumePath) {
      // Peluruhan konsentrasi terhadap jarak (dispersi Gaussian transversal + peluruhan eksponensial)
      const distDecay = Math.exp(-0.016 * station.distKm);
      const angleDecay = Math.exp(-0.5 * Math.pow(angularDev / (coneHalfWidthDeg * 0.45), 2));
      const effectiveIntensity = hasArrived ? 1.0 : Math.max(0.1, params.elapsedHours / Math.max(0.1, etaHours));

      const addedPm25 = metrics.peakPm25UgM3 * distDecay * angleDecay * effectiveIntensity;
      pm25UgM3 = Number((8.5 + addedPm25).toFixed(1));
      pm10UgM3 = Number((14.0 + addedPm25 * 1.4).toFixed(1));
      
      const addedAod = metrics.peakAod550 * distDecay * angleDecay * effectiveIntensity;
      aod550 = Number(Math.max(0.08, addedAod).toFixed(2));

      // Visibilitas atmosfer (Hukum Koschmieder: Visibilitas ~= 3.912 / Extinction_Coefficient)
      const extCoeff = 0.02 + aod550 * 0.15;
      visibilityKm = Number(Math.max(0.4, Math.min(25, 3.912 / extCoeff)).toFixed(1));

      if (pm25UgM3 > 250) {
        ispuCategory = 'BERBAHAYA';
        healthAdvisory = 'Bahaya akut aerosol asam sulfat & partikulat vulkanik. Wajib masker respirator (N95/P100), tutup rapat ventilasi ruangan.';
      } else if (pm25UgM3 > 150) {
        ispuCategory = 'SANGAT TIDAK SEHAT';
        healthAdvisory = 'Konsentrasi droplet aerosol sulfat tinggi. Hindari aktivitas luar ruang, iritasi mata dan saluran napas dapat terjadi.';
      } else if (pm25UgM3 > 55) {
        ispuCategory = 'TIDAK SEHAT';
        healthAdvisory = 'Kelompok rentan (anak, lansia, penderita asma) berpotensi mengalami gangguan pernapasan. Disarankan mengenakan masker.';
      } else if (pm25UgM3 > 15) {
        ispuCategory = 'SEDANG';
        healthAdvisory = 'Tampak kabut aerosol tipis (volcanic haze). Kondisi masih dapat ditoleransi oleh masyarakat umum.';
      }
    } else if (angularDev <= coneHalfWidthDeg + 15) {
      ispuCategory = 'SEDANG';
      pm25UgM3 = 18.0;
      pm10UgM3 = 26.0;
      aod550 = 0.18;
      visibilityKm = 18.0;
      healthAdvisory = 'Berada di batas tepi koridor angin. Waspadai jika terjadi perubahan arah angin laut/darat (sea breeze inversion).';
    }

    return {
      station,
      inPlumePath,
      angularDevDeg: Math.round(angularDev),
      etaHours,
      pm25UgM3,
      pm10UgM3,
      aod550,
      visibilityKm,
      ispuCategory,
      healthAdvisory,
    };
  });
}
