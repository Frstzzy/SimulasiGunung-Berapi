/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Dataset Infrastruktur Vital, Bandara, Pelabuhan, & Kota Strategis
 * Sekitar Selat Sunda, Banten, Lampung, dan Gerbang Jakarta
 * Mengadopsi indikator 'abu.cikoytew.my.id' (Prakiraan 18 Jam, Cek Kota, Flight Level, SO2 Gas)
 */

import { PlumeParams } from '../types';

export type InfrastructureType = 'airport' | 'seaport' | 'city' | 'industry' | 'tourism';
export type FlightLevelKey = 'ALL' | 'SFC-FL100' | 'FL100-FL250' | 'FL250-FL450';

export interface FlightLevelDefinition {
  id: FlightLevelKey;
  label: string;
  altitudeFeet: string;
  altitudeKm: string;
  targetAircraft: string;
  minAltMeters: number;
  maxAltMeters: number;
}

export const FLIGHT_LEVEL_DEFINITIONS: FlightLevelDefinition[] = [
  {
    id: 'ALL',
    label: 'Semua Ketinggian (SFC – FL450)',
    altitudeFeet: '0 – 45.000+ ft',
    altitudeKm: '0 – 14 km',
    targetAircraft: 'Semua Moda Transportasi Udara & Permukaan',
    minAltMeters: 0,
    maxAltMeters: 14000,
  },
  {
    id: 'SFC-FL100',
    label: 'SFC – FL100 (Permukaan – Rendah)',
    altitudeFeet: '0 – 10.000 ft',
    altitudeKm: '0 – 3.0 km',
    targetAircraft: 'Pesawat Perintis, Helikopter SAR, Penduduk Pesisir & Pelayaran',
    minAltMeters: 0,
    maxAltMeters: 3048,
  },
  {
    id: 'FL100-FL250',
    label: 'FL100 – FL250 (Ketinggian Menengah)',
    altitudeFeet: '10.000 – 25.000 ft',
    altitudeKm: '3.0 – 7.6 km',
    targetAircraft: 'Pesawat Turboprop Komersial (ATR-72) & Rute Domestik Jarak Dekat',
    minAltMeters: 3048,
    maxAltMeters: 7620,
  },
  {
    id: 'FL250-FL450',
    label: 'FL250 – FL450 (Jelajah Tinggi / Jet)',
    altitudeFeet: '25.000 – 45.000 ft',
    altitudeKm: '7.6 – 13.7 km',
    targetAircraft: 'Pesawat Jet Komersial (B737, A320, B777, A350) Koridor Internasional',
    minAltMeters: 7620,
    maxAltMeters: 13716,
  },
];

export const FLIGHT_LEVEL_MAP: Record<FlightLevelKey, FlightLevelDefinition> = {
  'ALL': FLIGHT_LEVEL_DEFINITIONS[0],
  'SFC-FL100': FLIGHT_LEVEL_DEFINITIONS[1],
  'FL100-FL250': FLIGHT_LEVEL_DEFINITIONS[2],
  'FL250-FL450': FLIGHT_LEVEL_DEFINITIONS[3],
};

export interface RegionalInfrastructure {
  id: string;
  name: string;
  code: string;
  type: InfrastructureType;
  province: 'Banten' | 'Lampung' | 'DKI Jakarta / Jawa Barat';
  coords: [number, number]; // [lat, lng]
  distKm: number; // Jarak garis lurus dari kawah Anak Krakatau
  bearingDeg: number; // Sudut azimuth mata angin dari kawah
  bearingCardinal: string;
  populationOrCapacity: string;
  description: string;
  flightLevelCorridor?: string;
  operationalAuthority: string;
}

export const REGIONAL_INFRASTRUCTURES: RegionalInfrastructure[] = [
  {
    id: 'cgk-airport',
    name: 'Bandara Internasional Soekarno-Hatta',
    code: 'CGK / WIII',
    type: 'airport',
    province: 'DKI Jakarta / Jawa Barat',
    coords: [-6.1256, 106.6559],
    distKm: 136.5,
    bearingDeg: 81,
    bearingCardinal: 'Timur',
    populationOrCapacity: '> 65 Juta Penumpang/Tahun (Hub Udara Terbesar)',
    description: 'Gerbang utama penerbangan internasional Indonesia. Sangat rentan terhadap penutupan airspace jika sebaran abu mengarah ke Timur (Banten-Jakarta).',
    flightLevelCorridor: 'SFC – FL450 (Terminal Maneuvering Area TMA Jakarta)',
    operationalAuthority: 'PT Angkasa Pura Indonesia / AirNav Indonesia',
  },
  {
    id: 'tkg-airport',
    name: 'Bandara Radin Inten II Lampung',
    code: 'TKG / WILL',
    type: 'airport',
    province: 'Lampung',
    coords: [-5.2424, 105.1788],
    distKm: 104.2,
    bearingDeg: 345,
    bearingCardinal: 'Utara-Barat Laut',
    populationOrCapacity: '± 2.5 Juta Penumpang/Tahun',
    description: 'Bandara komersial utama Provinsi Lampung. Menghubungkan koridor udara Sumatra Selatan dan Jawa Barat.',
    flightLevelCorridor: 'SFC – FL240 (Control Zone Lampung)',
    operationalAuthority: 'UPBU Kementerian Perhubungan',
  },
  {
    id: 'merak-port',
    name: 'Pelabuhan Penyeberangan Merak',
    code: 'PEL-MRK',
    type: 'seaport',
    province: 'Banten',
    coords: [-5.9328, 105.9997],
    distKm: 68.4,
    bearingDeg: 69,
    bearingCardinal: 'Timur-Timur Laut',
    populationOrCapacity: '± 50.000 penumpang & 12.000 kendaraan/hari',
    description: 'Urat nadi logistik dan transportasi laut terpadat Pulau Jawa menuju Pulau Sumatra.',
    flightLevelCorridor: 'Permukaan Laut (SFC)',
    operationalAuthority: 'PT ASDP Indonesia Ferry (Persero)',
  },
  {
    id: 'bakauheni-port',
    name: 'Pelabuhan Penyeberangan Bakauheni',
    code: 'PEL-BKH',
    type: 'seaport',
    province: 'Lampung',
    coords: [-5.8698, 105.7538],
    distKm: 46.2,
    bearingDeg: 42,
    bearingCardinal: 'Timur Laut',
    populationOrCapacity: 'Titik Temu JTTS (Jalan Tol Trans-Sumatera)',
    description: 'Pintu gerbang laut selatan Pulau Sumatra. Sering terpapar hujan abu tipis saat angin bertiup ke Timur Laut.',
    flightLevelCorridor: 'Permukaan Laut (SFC)',
    operationalAuthority: 'PT ASDP Indonesia Ferry (Persero)',
  },
  {
    id: 'cilegon-city',
    name: 'Kota Cilegon & Kawasan Industri Baja',
    code: 'KOTA-CLG',
    type: 'industry',
    province: 'Banten',
    coords: [-6.015, 106.050],
    distKm: 73.0,
    bearingDeg: 72,
    bearingCardinal: 'Timur-Timur Laut',
    populationOrCapacity: '± 450.000 jiwa & Objek Vital Nasional',
    description: 'Pusat industri petrokimia, pembangkit listrik PLTU, dan pabrik baja Krakatau Steel.',
    flightLevelCorridor: 'SFC – FL050',
    operationalAuthority: 'Pemkot Cilegon & BPBD Banten',
  },
  {
    id: 'serang-city',
    name: 'Kota Serang (Ibukota Provinsi Banten)',
    code: 'KOTA-SRG',
    type: 'city',
    province: 'Banten',
    coords: [-6.120, 106.150],
    distKm: 83.5,
    bearingDeg: 81,
    bearingCardinal: 'Timur',
    populationOrCapacity: '± 725.000 jiwa',
    description: 'Pusat administrasi pemerintahan Provinsi Banten dan simpul jalan tol Tangerang-Merak.',
    flightLevelCorridor: 'SFC – FL100',
    operationalAuthority: 'Pemprov Banten',
  },
  {
    id: 'bandar-lampung',
    name: 'Kota Bandar Lampung (Tanjung Karang)',
    code: 'KOTA-TKG',
    type: 'city',
    province: 'Lampung',
    coords: [-5.429, 105.262],
    distKm: 78.6,
    bearingDeg: 345,
    bearingCardinal: 'Utara-Barat Laut',
    populationOrCapacity: '± 1.180.000 jiwa',
    description: 'Metropolis terbesar Provinsi Lampung di ujung Teluk Lampung.',
    flightLevelCorridor: 'SFC – FL100',
    operationalAuthority: 'Pemkot Bandar Lampung',
  },
  {
    id: 'kalianda-town',
    name: 'Kota Kalianda (Kaki G. Rajabasa)',
    code: 'KOTA-KLD',
    type: 'city',
    province: 'Lampung',
    coords: [-5.733, 105.590],
    distKm: 46.8,
    bearingDeg: 18,
    bearingCardinal: 'Utara-Timur Laut',
    populationOrCapacity: '± 95.000 jiwa',
    description: 'Ibukota Kabupaten Lampung Selatan, berhadapan langsung dengan perairan Selat Sunda.',
    flightLevelCorridor: 'SFC – FL050',
    operationalAuthority: 'Pemkab Lampung Selatan',
  },
  {
    id: 'anyer-tourism',
    name: 'Kawasan Wisata Pantai Anyer',
    code: 'WIS-ANY',
    type: 'tourism',
    province: 'Banten',
    coords: [-6.050, 105.915],
    distKm: 58.2,
    bearingDeg: 75,
    bearingCardinal: 'Timur-Timur Laut',
    populationOrCapacity: 'Kawasan Resor Pantai & Hotel',
    description: 'Sentra pariwisata bahari pesisir barat Banten dengan mercusuar Cikoneng.',
    flightLevelCorridor: 'SFC',
    operationalAuthority: 'Dispar Banten & PHRI',
  },
  {
    id: 'carita-tourism',
    name: 'Kawasan Wisata Carita & Labuan',
    code: 'WIS-CRT',
    type: 'tourism',
    province: 'Banten',
    coords: [-6.300, 105.830],
    distKm: 48.6,
    bearingDeg: 105,
    bearingCardinal: 'Timur-Tenggara',
    populationOrCapacity: '± 60.000 jiwa & Wisatawan',
    description: 'Kawasan pantai yang sering menjadi pos pengamatan visual letusan Anak Krakatau.',
    flightLevelCorridor: 'SFC',
    operationalAuthority: 'BPBD Pandeglang & PVMBG',
  },
  {
    id: 'tanjung-lesung',
    name: 'Kawasan Ekonomi Khusus (KEK) Tanjung Lesung',
    code: 'KEK-TLS',
    type: 'tourism',
    province: 'Banten',
    coords: [-6.480, 105.660],
    distKm: 47.5,
    bearingDeg: 146,
    bearingCardinal: 'Tenggara',
    populationOrCapacity: 'Kawasan Pariwisata Terpadu',
    description: 'Semenanjung wisata di barat daya Pandeglang, dekat koridor Taman Nasional Ujung Kulon.',
    flightLevelCorridor: 'SFC',
    operationalAuthority: 'Administrator KEK Tanjung Lesung',
  },
];

export interface InfrastructureImpactStatus {
  item: RegionalInfrastructure;
  inPlumeCone: boolean;
  angularDevDeg: number;
  etaHours: number; // Jam tiba abu
  etaMinutes: number;
  hasArrivedAtForecast: boolean;
  threatLevel: 'KRITIS' | 'WASPADA' | 'MONITOR' | 'AMAN';
  flightSafetyStatus: 'NORMAL' | 'ADVISORY' | 'WARNING' | 'CLOSED_AIRSPACE';
  estimatedAshThicknessMm: number;
  estimatedSo2Du: number; // Dobson Units
  recommendation: string;
}

/**
 * Evaluasi dampak abu dan SO2 pada infrastruktur vital berdasarkan parameter plume dan horizon jam
 */
export function evaluateInfrastructureImpact(
  item: RegionalInfrastructure,
  plume: PlumeParams,
  forecastHours: number, // 0 to 18 jam
  selectedFlightLevel: FlightLevelKey = 'ALL'
): InfrastructureImpactStatus {
  // Arah hembusan awan abu (downwind): (windDirection + 180) % 360
  const driftDirectionDeg = (plume.windDirection + 180) % 360;

  // Deviasi sudut antara posisi kota dan arah angin
  let angularDev = Math.abs(item.bearingDeg - driftDirectionDeg);
  if (angularDev > 180) angularDev = 360 - angularDev;

  // Lebar konus awan bertambah terhadap waktu dan jarak (adveksi + difusi turbulent)
  const baseHalfConeDeg = 24 + Math.min(26, forecastHours * 1.5);
  const inPlumeCone = angularDev <= baseHalfConeDeg;

  // Kecepatan gerak awan (km/jam)
  const windSpeedKmh = Math.max(10, plume.windSpeed * 3.6);
  
  // Waktu tiba abu ke lokasi (jam)
  const etaHours = Number((item.distKm / windSpeedKmh).toFixed(1));
  const etaMinutes = Math.round(etaHours * 60);

  // Apakah pada jam proyeksi saat ini abu sudah sampai ke lokasi
  const hasArrivedAtForecast = forecastHours >= etaHours;

  // Evaluasi Flight Level Filter
  // Ketinggian kolom erupsi (meter)
  const columnHeightM = plume.columnHeight;
  let flightRelevant = true;
  if (selectedFlightLevel === 'SFC-FL100') {
    // Relevan jika ada partikel pada layer 0 - 3048m
    flightRelevant = true;
  } else if (selectedFlightLevel === 'FL100-FL250') {
    flightRelevant = columnHeightM >= 2500;
  } else if (selectedFlightLevel === 'FL250-FL450') {
    flightRelevant = columnHeightM >= 7000;
  }

  // Konsentrasi Gas Belerang SO2 (Dobson Units, DU)
  // Erupsi eksplosif memancarkan SO2 yang melayang jauh mengikuti troposfer
  let estimatedSo2Du = 0;
  let estimatedAshThicknessMm = 0;

  if (inPlumeCone) {
    const distanceFalloff = Math.exp(-0.025 * item.distKm);
    const angularFalloff = Math.exp(-0.5 * Math.pow(angularDev / (baseHalfConeDeg * 0.5), 2));
    const intensity = (plume.columnHeight / 2000) * (plume.emissionRate / 5);

    // SO2 terbawa lebih jauh dari abu padat
    estimatedSo2Du = Math.max(0.5, Number((45 * distanceFalloff * angularFalloff * intensity).toFixed(1)));
    
    // Isopach abu mengendap
    estimatedAshThicknessMm = Math.max(0.05, Number((18 * Math.exp(-0.04 * item.distKm) * angularFalloff * intensity).toFixed(2)));
  }

  // Tentukan Level Ancaman
  let threatLevel: 'KRITIS' | 'WASPADA' | 'MONITOR' | 'AMAN' = 'AMAN';
  let flightSafetyStatus: 'NORMAL' | 'ADVISORY' | 'WARNING' | 'CLOSED_AIRSPACE' = 'NORMAL';
  let recommendation = 'Kondisi ruang udara dan lingkungan darat terpantau aman.';

  if (inPlumeCone && flightRelevant) {
    if (hasArrivedAtForecast) {
      if (item.distKm <= 75 || estimatedAshThicknessMm > 2.0) {
        threatLevel = 'KRITIS';
        flightSafetyStatus = item.type === 'airport' ? 'CLOSED_AIRSPACE' : 'WARNING';
        recommendation = item.type === 'airport'
          ? `Ruang udara terkontaminasi abu vulkanik aktif. Runway ditutup sementara untuk keselamatan mesin jet.`
          : `Wajib mengenakan masker N95, bersihkan instalasi filtrasi udara, waspadai jarak pandang rendah (< 500m).`;
      } else {
        threatLevel = 'WASPADA';
        flightSafetyStatus = 'WARNING';
        recommendation = `Partikel abu halus dan aerosol SO2 mulai memasuki wilayah (${etaHours}j dari letusan). Tingkatkan kesiapsiagaan.`;
      }
    } else {
      // Masih dalam perjalanan (ETA > forecastHours)
      threatLevel = 'WASPADA';
      flightSafetyStatus = 'ADVISORY';
      recommendation = `Arah hembusan mengarah ke kawasan ini. Estimasi abu tiba dalam ${etaHours} jam (pukul T+${etaMinutes}m).`;
    }
  } else if (angularDev <= baseHalfConeDeg + 18) {
    threatLevel = 'MONITOR';
    flightSafetyStatus = 'ADVISORY';
    recommendation = `Berada di dekat tepi batas koridor angin. Waspadai jika terjadi perubahan arah angin mendadak (wind shear).`;
  }

  return {
    item,
    inPlumeCone: inPlumeCone && flightRelevant,
    angularDevDeg: Math.round(angularDev),
    etaHours,
    etaMinutes,
    hasArrivedAtForecast,
    threatLevel,
    flightSafetyStatus,
    estimatedAshThicknessMm,
    estimatedSo2Du,
    recommendation,
  };
}
