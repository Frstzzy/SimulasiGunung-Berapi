/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Dataset & Engine Peta Panas (Heatmap) Kepadatan Penduduk & Bahaya Pesisir Selat Sunda
 * Terintegrasi dengan Model Dispersi Abu Vulkanik & Lontaran Proyektil Gunung Anak Krakatau
 */

import { PlumeParams } from '../types';

export interface CoastalHazardNode {
  id: string;
  name: string;
  subdistrict: string;
  regency: string; // Kabupaten/Kota
  province: 'Banten' | 'Lampung' | 'Selat Sunda';
  coords: [number, number]; // [lat, lng]
  distKm: number; // Jarak dari kawah Anak Krakatau
  bearingDeg: number; // Azimuth dari kawah
  populationTotal: number; // Jumlah total penduduk (jiwa)
  populationDensity: number; // Kepadatan per km²
  coastalElevationM: number; // Ketinggian di atas permukaan laut (mdpl)
  shorelineDistanceM: number; // Jarak dari garis pantai (meter)
  coastalVulnerabilityIndex: number; // 0 - 100 (kerentanan tsunami & gelombang pasang)
  criticalInfrastructure: string[];
  tsunami2018RunupM: number; // Data historis runup tsunami 2018 (meter)
  evacuationCapacity: 'Baik' | 'Sedang' | 'Terbatas' | 'Sangat Terbatas';
  notes: string;
}

export interface NodeEvaluationResult extends CoastalHazardNode {
  // Evaluasi dinamis sebaran abu vulkanik
  inPlumeCone: boolean;
  angularDevDeg: number;
  isopachThicknessMm: number; // Estimasi tebal abu (mm)
  ashConcentrationMgM3: number; // Konsentrasi di udara (mg/m3)
  etaMinutes: number; // Estimasi waktu tiba abu
  plumeRiskScore: number; // 0 - 100
  compositeRiskScore: number; // 0 - 100
  riskCategory: 'KRITIS' | 'TINGGI' | 'SEDANG' | 'RENDAH';
  recommendedAction: string;
}

/**
 * 20 Titik Strategis Pesisir, Kepulauan, dan Pusat Populasi Selat Sunda
 * Meliputi Pesisir Banten (Anyer, Carita, Labuan, Cilegon, Merak, Panimbang, Sumur)
 * dan Pesisir Lampung (Kalianda, Rajabasa, Bakauheni, Ketapang, P. Sebesi, P. Sebuku, P. Sangiang)
 */
export const COASTAL_HAZARD_NODES: CoastalHazardNode[] = [
  // --- KEPULAUAN KALDERA & SEKITARNYA ---
  {
    id: 'node-sebesi',
    name: 'Pulau Sebesi (Desa Tejang & Bangkunat)',
    subdistrict: 'Rajabasa',
    regency: 'Kabupaten Lampung Selatan',
    province: 'Lampung',
    coords: [-5.9520, 105.4980],
    distKm: 18.5,
    bearingDeg: 26,
    populationTotal: 2814,
    populationDensity: 110,
    coastalElevationM: 3.5,
    shorelineDistanceM: 80,
    coastalVulnerabilityIndex: 94,
    criticalInfrastructure: ['Dermaga Rakyat Tejang', 'PLTS Komunal', 'Puskesmas Pembantu'],
    tsunami2018RunupM: 6.8,
    evacuationCapacity: 'Sangat Terbatas',
    notes: 'Pemukiman terdekat berpenduduk permanen dari kaldera Krakatau. Akses laut satu-satunya via Canti.',
  },
  {
    id: 'node-sebuku',
    name: 'Pulau Sebuku & Pulau Rimau',
    subdistrict: 'Rajabasa',
    regency: 'Kabupaten Lampung Selatan',
    province: 'Lampung',
    coords: [-5.8850, 105.5250],
    distKm: 28.2,
    bearingDeg: 22,
    populationTotal: 450,
    populationDensity: 32,
    coastalElevationM: 2.5,
    shorelineDistanceM: 40,
    coastalVulnerabilityIndex: 88,
    criticalInfrastructure: ['Bagan Ikan Apung', 'Dermaga Kayu Tradisional'],
    tsunami2018RunupM: 4.2,
    evacuationCapacity: 'Sangat Terbatas',
    notes: 'Banyak bagan perikanan dan pemukiman musiman nelayan tepi pantai.',
  },
  {
    id: 'node-sangiang',
    name: 'Pulau Sangiang',
    subdistrict: 'Anyer',
    regency: 'Kabupaten Serang',
    province: 'Banten',
    coords: [-5.9550, 105.8550],
    distKm: 51.0,
    bearingDeg: 68,
    populationTotal: 1200,
    populationDensity: 170,
    coastalElevationM: 4.0,
    shorelineDistanceM: 100,
    coastalVulnerabilityIndex: 78,
    criticalInfrastructure: ['Mercusuar Navigasi', 'Taman Wisata Alam Laut'],
    tsunami2018RunupM: 3.5,
    evacuationCapacity: 'Terbatas',
    notes: 'Terletak di tengah jalur ALKI I antara Banten dan Lampung.',
  },

  // --- PESISIR LAMPUNG SELATAN ---
  {
    id: 'node-waimuli',
    name: 'Pesisir Way Muli & Kunjir',
    subdistrict: 'Rajabasa',
    regency: 'Kabupaten Lampung Selatan',
    province: 'Lampung',
    coords: [-5.8450, 105.6250],
    distKm: 32.5,
    bearingDeg: 35,
    populationTotal: 18500,
    populationDensity: 740,
    coastalElevationM: 2.8,
    shorelineDistanceM: 50,
    coastalVulnerabilityIndex: 96,
    criticalInfrastructure: ['Jalan Pesisir Rajabasa', 'TPI Kunjir', 'Sekolah & Masjid'],
    tsunami2018RunupM: 9.2,
    evacuationCapacity: 'Sedang',
    notes: 'Zona terdampak terparah saat tsunami flank collapse 2018 di sisi Lampung. Pemukiman memanjang di bibir pantai.',
  },
  {
    id: 'node-canti',
    name: 'Dermaga Canti & Banding',
    subdistrict: 'Rajabasa',
    regency: 'Kabupaten Lampung Selatan',
    province: 'Lampung',
    coords: [-5.8200, 105.5900],
    distKm: 35.8,
    bearingDeg: 25,
    populationTotal: 22400,
    populationDensity: 920,
    coastalElevationM: 3.2,
    shorelineDistanceM: 60,
    coastalVulnerabilityIndex: 90,
    criticalInfrastructure: ['Dermaga Kapal Canti - Sebesi', 'Sentra Perikanan', 'Puskesmas'],
    tsunami2018RunupM: 7.5,
    evacuationCapacity: 'Sedang',
    notes: 'Hub logistik maritim utama menuju Pulau Sebesi dan Kepulauan Krakatau.',
  },
  {
    id: 'node-kalianda',
    name: 'Kota Kalianda & Dermaga Bom',
    subdistrict: 'Kalianda',
    regency: 'Kabupaten Lampung Selatan',
    province: 'Lampung',
    coords: [-5.7400, 105.6200],
    distKm: 45.9,
    bearingDeg: 28,
    populationTotal: 112500,
    populationDensity: 1850,
    coastalElevationM: 12.0,
    shorelineDistanceM: 200,
    coastalVulnerabilityIndex: 72,
    criticalInfrastructure: ['RSUD Bob Bazar', 'Kantor Bupati Lampung Selatan', 'Dermaga Bom Kalianda'],
    tsunami2018RunupM: 5.0,
    evacuationCapacity: 'Baik',
    notes: 'Pusat ibu kota kabupaten dengan fasilitas rumah sakit rujukan utama dan koordinasi BPBD.',
  },
  {
    id: 'node-bakauheni',
    name: 'Pelabuhan Utama ASDP Bakauheni',
    subdistrict: 'Bakauheni',
    regency: 'Kabupaten Lampung Selatan',
    province: 'Lampung',
    coords: [-5.8670, 105.7500],
    distKm: 44.8,
    bearingDeg: 54,
    populationTotal: 48000,
    populationDensity: 1420,
    coastalElevationM: 5.5,
    shorelineDistanceM: 30,
    coastalVulnerabilityIndex: 82,
    criticalInfrastructure: ['Dermaga Feri 1-7 ASDP', 'Jalan Tol Trans-Sumatra KM 00', 'Menara Siger', 'VTS Bakauheni'],
    tsunami2018RunupM: 4.8,
    evacuationCapacity: 'Baik',
    notes: 'Arteri logistik vital penyeberangan Jawa-Sumatra. Rentan terhadap hujan abu yang mengganggu jarak pandang feri.',
  },
  {
    id: 'node-ketapang',
    name: 'Kecamatan Ketapang & Way Urang',
    subdistrict: 'Ketapang',
    regency: 'Kabupaten Lampung Selatan',
    province: 'Lampung',
    coords: [-5.7800, 105.7200],
    distKm: 46.5,
    bearingDeg: 44,
    populationTotal: 42000,
    populationDensity: 1100,
    coastalElevationM: 6.0,
    shorelineDistanceM: 150,
    coastalVulnerabilityIndex: 70,
    criticalInfrastructure: ['Ruas Jalan Lintas Sumatra', 'Tambak Udang Intensif'],
    tsunami2018RunupM: 3.8,
    evacuationCapacity: 'Baik',
    notes: 'Area agrikultur dan tambak pesisir intensif yang sensitif terhadap abu belerang.',
  },
  {
    id: 'node-tarahan',
    name: 'Kawasan Industri Pesisir Tarahan & Panjang',
    subdistrict: 'Katibung',
    regency: 'Kabupaten Lampung Selatan',
    province: 'Lampung',
    coords: [-5.5200, 105.3500],
    distKm: 72.0,
    bearingDeg: 352,
    populationTotal: 85000,
    populationDensity: 2200,
    coastalElevationM: 8.0,
    shorelineDistanceM: 180,
    coastalVulnerabilityIndex: 58,
    criticalInfrastructure: ['PLTU Tarahan (2 x 100 MW)', 'Pelabuhan Batubara Bukit Asam', 'Depo Pertamina'],
    tsunami2018RunupM: 2.2,
    evacuationCapacity: 'Baik',
    notes: 'Pusat ketenagalistrikan dan dermaga kargo curah Teluk Lampung.',
  },

  // --- PESISIR BANTEN (PANDEGLANG, SERANG, CILEGON) ---
  {
    id: 'node-tanjunglesung',
    name: 'Tanjung Lesung (KEK Pariwisata) & Panimbang',
    subdistrict: 'Panimbang',
    regency: 'Kabupaten Pandeglang',
    province: 'Banten',
    coords: [-6.4800, 105.6600],
    distKm: 43.5,
    bearingDeg: 150,
    populationTotal: 58000,
    populationDensity: 890,
    coastalElevationM: 2.2,
    shorelineDistanceM: 40,
    coastalVulnerabilityIndex: 95,
    criticalInfrastructure: ['Kawasan Ekonomi Khusus (KEK)', 'Resort Pantai', 'Jalan Raya Panimbang'],
    tsunami2018RunupM: 8.5,
    evacuationCapacity: 'Terbatas',
    notes: 'Terdampak gelombang tsunami 2018 yang menewaskan puluhan orang. Kawasan datar terbuka langsung ke Selat Sunda.',
  },
  {
    id: 'node-sumur',
    name: 'Pesisir Sumur & Cigorondong',
    subdistrict: 'Sumur',
    regency: 'Kabupaten Pandeglang',
    province: 'Banten',
    coords: [-6.6600, 105.5700],
    distKm: 61.2,
    bearingDeg: 169,
    populationTotal: 26000,
    populationDensity: 420,
    coastalElevationM: 2.5,
    shorelineDistanceM: 35,
    coastalVulnerabilityIndex: 92,
    criticalInfrastructure: ['Dermaga Perikanan Sumur', 'Pintu Masuk TN Ujung Kulon'],
    tsunami2018RunupM: 7.8,
    evacuationCapacity: 'Sangat Terbatas',
    notes: 'Pesisir selatan yang rentan terisolasi bila jalan satu-satunya terputus genangan atau tertutup abu lebat.',
  },
  {
    id: 'node-labuan',
    name: 'Kota Labuan & Pelabuhan Perikanan PPN',
    subdistrict: 'Labuan',
    regency: 'Kabupaten Pandeglang',
    province: 'Banten',
    coords: [-6.3800, 105.8300],
    distKm: 51.5,
    bearingDeg: 125,
    populationTotal: 64000,
    populationDensity: 3650,
    coastalElevationM: 2.6,
    shorelineDistanceM: 50,
    coastalVulnerabilityIndex: 94,
    criticalInfrastructure: ['Pelabuhan Perikanan Nusantara (PPN)', 'Pasar Induk Labuan', 'PLTU Banten 2 (2x300MW)'],
    tsunami2018RunupM: 6.2,
    evacuationCapacity: 'Sedang',
    notes: 'Kepadatan penduduk tinggi dengan muara sungai yang rentan amplifikasi gelombang tsunami dan penumpukan abu.',
  },
  {
    id: 'node-carita',
    name: 'Pesisir Pantai Wisata Carita',
    subdistrict: 'Carita',
    regency: 'Kabupaten Pandeglang',
    province: 'Banten',
    coords: [-6.2900, 105.8400],
    distKm: 49.0,
    bearingDeg: 114,
    populationTotal: 45000,
    populationDensity: 1350,
    coastalElevationM: 2.2,
    shorelineDistanceM: 30,
    coastalVulnerabilityIndex: 96,
    criticalInfrastructure: ['Hotel & Cottage Wisata Pantai', 'Jalan Raya Labuan-Carita', 'Puskesmas Carita'],
    tsunami2018RunupM: 8.2,
    evacuationCapacity: 'Sedang',
    notes: 'Daerah wisata dengan fluktuasi ribuan pengunjung saat akhir pekan. Jarak jalan raya hanya 15-30m dari pantai.',
  },
  {
    id: 'node-cinangka',
    name: 'Pesisir Cinangka & Pasauran',
    subdistrict: 'Cinangka',
    regency: 'Kabupaten Serang',
    province: 'Banten',
    coords: [-6.1500, 105.8800],
    distKm: 50.8,
    bearingDeg: 96,
    populationTotal: 62000,
    populationDensity: 1650,
    coastalElevationM: 3.5,
    shorelineDistanceM: 60,
    coastalVulnerabilityIndex: 88,
    criticalInfrastructure: ['Pos Pengamatan G. Anak Krakatau Pasauran (PVMBG)', 'Jalan Nasional Anyer-Sirih'],
    tsunami2018RunupM: 6.0,
    evacuationCapacity: 'Baik',
    notes: 'Lokasi pos resmi PVMBG untuk pemantauan seismik visual Gunung Anak Krakatau.',
  },
  {
    id: 'node-anyer',
    name: 'Kawasan Anyer & Titik Nol Cikoneng',
    subdistrict: 'Anyer',
    regency: 'Kabupaten Serang',
    province: 'Banten',
    coords: [-6.0500, 105.9200],
    distKm: 55.3,
    bearingDeg: 84,
    populationTotal: 98400,
    populationDensity: 2450,
    coastalElevationM: 3.0,
    shorelineDistanceM: 40,
    coastalVulnerabilityIndex: 86,
    criticalInfrastructure: ['Mercusuar Cikoneng', 'Kawasan Industri Anyer', 'Sentra Hotel Bintang Anyer'],
    tsunami2018RunupM: 5.5,
    evacuationCapacity: 'Baik',
    notes: 'Kawasan pemukiman padat dan wisata pantai terpopuler di Banten.',
  },
  {
    id: 'node-cilegon',
    name: 'Pusat Kota Industri Cilegon (Krakatau Steel)',
    subdistrict: 'Cilegon',
    regency: 'Kota Cilegon',
    province: 'Banten',
    coords: [-6.0150, 106.0500],
    distKm: 73.0,
    bearingDeg: 76,
    populationTotal: 445000,
    populationDensity: 4100,
    coastalElevationM: 15.0,
    shorelineDistanceM: 1500,
    coastalVulnerabilityIndex: 65,
    criticalInfrastructure: ['Kawasan Industri Baja Krakatau Steel', 'Kawasan Petrokimia Chandra Asri', 'Tol Jakarta-Merak'],
    tsunami2018RunupM: 2.0,
    evacuationCapacity: 'Baik',
    notes: 'Pusat industri berat nasional dan kepadatan populasi tertinggi di sekitar Selat Sunda.',
  },
  {
    id: 'node-merak',
    name: 'Pelabuhan Penyeberangan Merak & Pulomerak',
    subdistrict: 'Pulomerak',
    regency: 'Kota Cilegon',
    province: 'Banten',
    coords: [-5.9300, 106.0000],
    distKm: 64.2,
    bearingDeg: 72,
    populationTotal: 62000,
    populationDensity: 3200,
    coastalElevationM: 4.5,
    shorelineDistanceM: 30,
    coastalVulnerabilityIndex: 84,
    criticalInfrastructure: ['Dermaga Eksekutif & Reguler Merak', 'Terminal Terpadu Merak', 'PLTU Suralaya Unit 1-8 (3.400 MW)'],
    tsunami2018RunupM: 4.5,
    evacuationCapacity: 'Baik',
    notes: 'Gerbang utama arus orang dan barang Jawa-Sumatra serta kompleks pembangkit listrik terbesar di Banten.',
  },
  {
    id: 'node-suralaya',
    name: 'Kompleks Energi Nasional PLTU Suralaya',
    subdistrict: 'Pulomerak',
    regency: 'Kota Cilegon',
    province: 'Banten',
    coords: [-5.8900, 106.0300],
    distKm: 69.5,
    bearingDeg: 68,
    populationTotal: 35000,
    populationDensity: 1950,
    coastalElevationM: 5.0,
    shorelineDistanceM: 50,
    coastalVulnerabilityIndex: 78,
    criticalInfrastructure: ['PLTU Suralaya (Kapasitas >4.000 MW)', 'Dermaga Tongkang Batubara Suralaya'],
    tsunami2018RunupM: 3.2,
    evacuationCapacity: 'Baik',
    notes: 'Memasok ~17% kebutuhan listrik grid interkoneksi Jawa-Madura-Bali (Jamali). Abu vulkanik berisiko mematikan sirkulasi pendingin air laut.',
  },

  // --- MARITIM ALKI I ---
  {
    id: 'node-alki',
    name: 'Koridor Maritim ALKI I (Selat Sunda)',
    subdistrict: 'Selat Sunda Tengah',
    regency: 'Perairan Bebas Selat Sunda',
    province: 'Selat Sunda',
    coords: [-6.0500, 105.6200],
    distKm: 19.8,
    bearingDeg: 82,
    populationTotal: 4500,
    populationDensity: 80,
    coastalElevationM: 0.0,
    shorelineDistanceM: 0,
    coastalVulnerabilityIndex: 90,
    criticalInfrastructure: ['Alur Laut Pelayaran Internasional ALKI I', 'Kabel Bawah Laut Telekomunikasi Jawa-Sumatra'],
    tsunami2018RunupM: 0,
    evacuationCapacity: 'Sedang',
    notes: 'Jalur padat 60-90 kapal kargo, tanker minyak, dan kapal feri per hari. Abu vulkanik menurunkan jarak pandang menjadi <50 meter.',
  },
];

/**
 * Mengevaluasi dampak sebaran abu vulkanik aktif pada setiap node
 * Berdasarkan arah angin, kecepatan angin, tinggi kolom, dan laju erupsi
 */
export function evaluateNodePlumeImpact(
  node: CoastalHazardNode,
  plume: PlumeParams
): NodeEvaluationResult {
  // Arah pergerakan awan abu adalah ke mana angin meniup: (windDirection + 180) % 360
  const driftAngleDeg = (plume.windDirection + 180) % 360;

  // Hitung deviasi sudut antara posisi landmark dan garis tengah drift
  let angularDevDeg = Math.abs(node.bearingDeg - driftAngleDeg);
  if (angularDevDeg > 180) angularDevDeg = 360 - angularDevDeg;

  // Jangkauan maksimum dispersi abu berdasarkan tinggi kolom dan kecepatan angin
  const columnKm = plume.columnHeight / 1000;
  const maxPlumeReachKm = Math.min(
    95,
    Math.max(15, columnKm * 9.5 + plume.windSpeed * 2.2)
  );

  // Lebar kerucut sebaran Gaussian (~28 - 38 derajat tergantung stabilitas atmosfer)
  const halfConeDeg = 32;
  const inPlumeCone = angularDevDeg <= halfConeDeg && node.distKm <= maxPlumeReachKm;

  // Perhitungan Isopach (ketebalan abu jatuh dalam mm) menggunakan model Gaussian Decay empiris
  let isopachThicknessMm = 0;
  let ashConcentrationMgM3 = 0;
  let etaMinutes = 0;
  let plumeRiskScore = 0;

  if (inPlumeCone) {
    // Kecepatan adveksi angin efektif
    const effectiveWindSpeedKmH = Math.max(15, plume.windSpeed * 3.6);
    etaMinutes = Math.round((node.distKm / effectiveWindSpeedKmH) * 60);

    // Inti Gaussian: ketebalan menurun terhadap jarak dan sudut dari sumbu tengah
    const distanceFactor = Math.exp(-0.045 * node.distKm);
    const angularFactor = Math.exp(-0.5 * Math.pow(angularDevDeg / (halfConeDeg * 0.45), 2));
    const emissionFactor = Math.max(0.5, (plume.emissionRate ?? 5) / 5);
    const intensityMultiplier = Math.pow(columnKm / 2, 1.8) * emissionFactor;

    isopachThicknessMm = Math.max(0.1, Number((28 * distanceFactor * angularFactor * intensityMultiplier).toFixed(1)));
    ashConcentrationMgM3 = Math.max(1, Number((180 * distanceFactor * angularFactor * intensityMultiplier).toFixed(0)));

    // Skor risiko sebaran abu (0 - 100)
    plumeRiskScore = Math.min(
      100,
      Math.round(
        (isopachThicknessMm > 25 ? 90 : isopachThicknessMm * 3.6) +
        (angularDevDeg < 10 ? 15 : 5) -
        (node.distKm > 50 ? 10 : 0)
      )
    );
  } else {
    // Di luar jalur utama angin, namun ada difusi lateral tipis jika dekat (< 20 km)
    if (node.distKm < 20) {
      isopachThicknessMm = Number((0.8 * Math.exp(-0.1 * node.distKm)).toFixed(1));
      ashConcentrationMgM3 = 8;
      plumeRiskScore = 15;
    }
  }

  // Hitung Skor Risiko Komposit (gabungan Kepadatan Penduduk, Bahaya Pesisir, dan Paparan Abu Aktif)
  // Bobot: 35% Paparan Abu + 35% Bahaya Pesisir + 30% Kepadatan Populasi
  const popNormScore = Math.min(100, Math.round((node.populationDensity / 4000) * 100));
  const coastalNormScore = node.coastalVulnerabilityIndex;

  let compositeRiskScore = Math.round(
    0.40 * plumeRiskScore +
    0.35 * coastalNormScore +
    0.25 * popNormScore
  );
  if (compositeRiskScore > 100) compositeRiskScore = 100;

  // Kategori risiko
  let riskCategory: 'KRITIS' | 'TINGGI' | 'SEDANG' | 'RENDAH' = 'RENDAH';
  if (compositeRiskScore >= 75) riskCategory = 'KRITIS';
  else if (compositeRiskScore >= 50) riskCategory = 'TINGGI';
  else if (compositeRiskScore >= 28) riskCategory = 'SEDANG';

  // Rekomendasi tindakan spesifik
  let recommendedAction = 'Pantau informasi berkala BMKG & PVMBG.';
  if (inPlumeCone && isopachThicknessMm >= 10) {
    recommendedAction = `SIAGA 1: Kenakan masker N95 & kacamata goggle. Bersihkan atap rumah dari timbunan abu basah sebelum bobot melebihi kapasitas genting (${isopachThicknessMm} mm). Tutup penampungan air tawar.`;
  } else if (inPlumeCone && isopachThicknessMm >= 2) {
    recommendedAction = `WASPADA: Jarak pandang menurun drastis. Pengendara kurangi laju kecepatan di jalan pesisir. Amankan tandon air dan suplai logistik.`;
  } else if (node.coastalVulnerabilityIndex >= 85) {
    recommendedAction = `PERHATIAN: Wilayah berketinggian rendah (< 4 mdpl). Siapkan jalur evakuasi mandiri ke arah perbukitan bila terdengar gemuruh dentuman vulkanik.`;
  }

  return {
    ...node,
    inPlumeCone,
    angularDevDeg,
    isopachThicknessMm,
    ashConcentrationMgM3,
    etaMinutes,
    plumeRiskScore,
    compositeRiskScore,
    riskCategory,
    recommendedAction,
  };
}

/**
 * Helper menghitung total estimasi populasi terdampak di dalam koridor sebaran abu aktif
 */
export function calculateImpactedPopulationSummary(
  nodes: CoastalHazardNode[],
  plume: PlumeParams
) {
  const evaluated = nodes.map((n) => evaluateNodePlumeImpact(n, plume));
  const inPlumeNodes = evaluated.filter((n) => n.inPlumeCone);

  const totalPopInPlume = inPlumeNodes.reduce((acc, n) => acc + n.populationTotal, 0);
  const criticalNodes = evaluated.filter((n) => n.riskCategory === 'KRITIS');
  const highRiskNodes = evaluated.filter((n) => n.riskCategory === 'TINGGI');

  return {
    evaluated,
    inPlumeNodes,
    totalPopInPlume,
    criticalCount: criticalNodes.length,
    highRiskCount: highRiskNodes.length,
  };
}
