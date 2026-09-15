/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Dataset Resmi & Referensi Operasional BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)
 * Serta PVMBG (Pusat Vulkanologi dan Mitigasi Bencana Geologi)
 * Studi Kasus: Sebaran Abu Vulkanik Gunung Anak Krakatau & Daerah Terdampak di Selat Sunda
 */

export interface BmkgAffectedArea {
  id: string;
  name: string;
  regency: string; // Kabupaten / Kota
  province: 'Banten' | 'Lampung' | 'Selat Sunda / Perairan Internasional';
  coords: [number, number]; // [lat, lng]
  distKm: number; // Jarak garis lurus dari kawah Anak Krakatau
  bearingDeg: number; // Sudut azimuth mata angin dari kawah
  bearingCardinal: string;
  hazardZone: 'KRB III (Bahaya Tinggi)' | 'KRB II (Waspada)' | 'KRB I (Perhatian)';
  defaultRiskLevel: 'KRITIS' | 'TINGGI' | 'SEDANG' | 'WASPADA';
  population: string;
  criticalAssets: string[];
  ashFallProfile: {
    potentialThickness: string;
    typicalArrivalMinutes: number; // Kecepatan rata-rata adveksi
    airQualityIndex: 'Berbahaya (Hazardous)' | 'Sangat Tidak Sehat' | 'Tidak Sehat' | 'Sedang';
    visibilityDrop: string;
  };
  impactSectors: string[];
  mitigationProtocols: string[];
}

export interface BmkgUpperAirSounding {
  levelHpa: number;
  altitudeMeters: number;
  flightLevel: string;
  windDirectionDeg: number;
  windSpeedMs: number;
  windSpeedKnots: number;
  tempCelsius: number;
  dewPointCelsius: number;
  description: string;
}

export interface BmkgSigmetScenario {
  id: string;
  code: string; // e.g. WIIF SIGMET 04
  title: string;
  issueDate: string;
  fir: string; // Jakarta FIR (WIIF)
  volcanoName: string;
  columnHeightMeters: number;
  flightLevelRange: string;
  driftDirectionDeg: number; // Arah pergerakan awan abu
  driftCardinal: string;
  windSpeedMs: number;
  windSpeedKnots: number;
  polygonCoords: [number, number][]; // Poligon SIGMET ICAO resmi
  summary: string;
  affectedCounties: string[];
  vonaStatus: 'RED' | 'ORANGE' | 'YELLOW';
}

/**
 * Daftar Wilayah/Daerah Terdampak di Selat Sunda (Lampung & Banten)
 * Berdasarkan KRB Badan Geologi & Peringatan Dini BMKG
 */
export const BMKG_AFFECTED_AREAS: BmkgAffectedArea[] = [
  {
    id: 'kaldera-krakatau',
    name: 'Kompleks Kaldera Krakatau (P. Rakata, Sertung, Panjang)',
    regency: 'Lampung Selatan (Kawasan Konservasi)',
    province: 'Lampung',
    coords: [-6.120, 105.423],
    distKm: 3.5,
    bearingDeg: 140,
    bearingCardinal: 'Tenggara',
    hazardZone: 'KRB III (Bahaya Tinggi)',
    defaultRiskLevel: 'KRITIS',
    population: '0 jiwa (Steril, Cagar Alam Laut)',
    criticalAssets: [
      'Pos Stasiun Seismik & AWS Kawah',
      'Cagar Alam Warisan Dunia UNESCO',
      'Habitat Satwa Pelopor Kaldera',
    ],
    ashFallProfile: {
      potentialThickness: '> 100 mm (Endapan Piroklastik Masif & Bom Vulkanik)',
      typicalArrivalMinutes: 2,
      airQualityIndex: 'Berbahaya (Hazardous)',
      visibilityDrop: '< 20 meter (Nol Mutlak)',
    },
    impactSectors: ['Konservasi Alam', 'Stasiun Riset Vulkanologi', 'Perairan Kaldera'],
    mitigationProtocols: [
      'Radius steril 5.0 km tanpa toleransi bagi semua pihak.',
      'Larangan mutlak pendaratan perahu wisata, riset, atau nelayan.',
      'Evakuasi darurat instrumen observasi jika terjadi peningkatan kegempaan tremor overscale.',
    ],
  },
  {
    id: 'pulau-sebesi',
    name: 'Pulau Sebesi (Desa Tejang & Bangkunat)',
    regency: 'Kab. Lampung Selatan (Kec. Rajabasa)',
    province: 'Lampung',
    coords: [-5.952, 105.498],
    distKm: 18.5,
    bearingDeg: 26,
    bearingCardinal: 'Utara-Timur Laut',
    hazardZone: 'KRB II (Waspada)',
    defaultRiskLevel: 'TINGGI',
    population: '± 2.814 jiwa',
    criticalAssets: [
      'Dermaga Rakyat Tejang Sebesi',
      'Pembangkit Listrik PLTS Komunal',
      'Sumber Air Mata Pegunungan Sebesi',
      'Sekolah Dasar & Puskesmas Pembantu',
    ],
    ashFallProfile: {
      potentialThickness: '15 – 50 mm (Hujan Abu Kasus Berat + Lapili Halus)',
      typicalArrivalMinutes: 32,
      airQualityIndex: 'Berbahaya (Hazardous)',
      visibilityDrop: '< 100 meter',
    },
    impactSectors: ['Pemukiman Penduduk', 'Perikanan Tangkap', 'Sumber Air Minum', 'Kelistrikan Surya'],
    mitigationProtocols: [
      'Siagakan armada kapal evakuasi ASDP / Polairud di Pelabuhan Canti Rajabasa.',
      'Tutup rapat tandon penampungan air tawar untuk mencegah keracunan asam belerang/fluorida.',
      'Distribusi masker standar N95 dan kacamata pelindung (goggles) ke seluruh warga.',
      'Pembersihan berkala atap genting/seng agar tidak runtuh akibat beban akumulasi abu basah.',
    ],
  },
  {
    id: 'pulau-sebuku',
    name: 'Pulau Sebuku & Pulau Rimau',
    regency: 'Kab. Lampung Selatan (Kec. Rajabasa)',
    province: 'Lampung',
    coords: [-5.885, 105.525],
    distKm: 28.2,
    bearingDeg: 22,
    bearingCardinal: 'Utara-Timur Laut',
    hazardZone: 'KRB II (Waspada)',
    defaultRiskLevel: 'SEDANG',
    population: '± 450 jiwa (Pondok kebun & nelayan bagan)',
    criticalAssets: [
      'Bagan Ikan Apung Nelayan',
      'Area Konservasi Terumbu Karang',
      'Dermaga Tradisional Nelayan',
    ],
    ashFallProfile: {
      potentialThickness: '5 – 15 mm (Abu Sedang)',
      typicalArrivalMinutes: 50,
      airQualityIndex: 'Sangat Tidak Sehat',
      visibilityDrop: '< 300 meter',
    },
    impactSectors: ['Perikanan Bagan', 'Perkebunan Kelapa'],
    mitigationProtocols: [
      'Larangan melaut di sektor selatan Pulau Sebuku.',
      'Evakuasi mandiri ke daratan utama Pulau Sumatra jika kolom letusan melebihi FL250.',
    ],
  },
  {
    id: 'alki-selat-sunda',
    name: 'Alur Laut Kepulauan Indonesia I (ALKI I Selat Sunda)',
    regency: 'Perairan Internasional Selat Sunda',
    province: 'Selat Sunda / Perairan Internasional',
    coords: [-6.050, 105.620],
    distKm: 19.8,
    bearingDeg: 82,
    bearingCardinal: 'Timur',
    hazardZone: 'KRB II (Waspada)',
    defaultRiskLevel: 'TINGGI',
    population: '60 – 90 kapal kargo/tanker internasional per hari',
    criticalAssets: [
      'Jalur Maritim Strategis Internasional ALKI I',
      'Rambu Suar Navigasi Karang Berlayar',
      'Jaringan Kabel Komunikasi Bawah Laut Internasional',
    ],
    ashFallProfile: {
      potentialThickness: 'Endapan Abu Laut Mengapung & Batu Apung (Pumice Raft)',
      typicalArrivalMinutes: 28,
      airQualityIndex: 'Sangat Tidak Sehat',
      visibilityDrop: '< 150 meter',
    },
    impactSectors: ['Navigasi Pelayaran Internasional', 'Radar & Sensor Maritim', 'Mesin Kapal (Water Cooling Intake)'],
    mitigationProtocols: [
      'BMKG & Distrik Navigasi Merak merilis Navigational Warning (NAVWARN / NOTAM maritim).',
      'Kapal berbobot besar diimbau mengalihkan rute melalui Selat Lombok/Makassar bila visibilitas < 500m.',
      'Pembersihan filter hisap pendingin mesin kapal (sea-chest filter) dari gumpalan abu mengapung.',
    ],
  },
  {
    id: 'anyer-cinangka',
    name: 'Kawasan Wisata & Pesisir Anyer – Cinangka',
    regency: 'Kab. Serang',
    province: 'Banten',
    coords: [-6.050, 105.920],
    distKm: 55.3,
    bearingDeg: 84,
    bearingCardinal: 'Timur',
    hazardZone: 'KRB I (Perhatian)',
    defaultRiskLevel: 'SEDANG',
    population: '± 98.400 jiwa + ribuan wisatawan akhir pekan',
    criticalAssets: [
      'Jalan Raya Nasional Anyer-Sirih',
      'Kompleks Perhotelan & Resort Tepi Pantai',
      'Menara Mercusuar Cikoneng Titik Nol Anyer-Panarukan',
      'Tempat Pelelangan Ikan (TPI) Karangantu & Anyer',
    ],
    ashFallProfile: {
      potentialThickness: '1 – 8 mm (Abu Vulkanik Halus / Debu Silika PM10)',
      typicalArrivalMinutes: 95,
      airQualityIndex: 'Tidak Sehat',
      visibilityDrop: '500 – 1.000 meter',
    },
    impactSectors: ['Sektor Pariwisata', 'Transportasi Darat', 'Kesehatan Saluran Pernafasan (ISPA)'],
    mitigationProtocols: [
      'Pemberian masker bedah/N95 oleh BPBD Kabupaten Serang.',
      'Imbauan pengendara sepeda motor mengurangi kecepatan akibat jalan licin berdebu.',
      'Penutupan sementara aktivitas wisata pantai terbuka selama hujan abu berlangsung.',
    ],
  },
  {
    id: 'carita-labuan',
    name: 'Pesisir Carita, Labuan & Panimbang',
    regency: 'Kab. Pandeglang',
    province: 'Banten',
    coords: [-6.300, 105.830],
    distKm: 49.5,
    bearingDeg: 116,
    bearingCardinal: 'Tenggara',
    hazardZone: 'KRB I (Perhatian)',
    defaultRiskLevel: 'SEDANG',
    population: '± 152.000 jiwa',
    criticalAssets: [
      'Pelabuhan Perikanan Nusantara Labuan',
      'PLTU Banten 2 Labuan (2 x 300 MW)',
      'Kawasan Sentra Pengolahan Ikan Asin',
    ],
    ashFallProfile: {
      potentialThickness: '2 – 10 mm (Abu Halus hingga Sedang)',
      typicalArrivalMinutes: 80,
      airQualityIndex: 'Tidak Sehat',
      visibilityDrop: '400 – 800 meter',
    },
    impactSectors: ['Pembangkitan Energi Listrik (PLTU)', 'Perikanan Tangkap', 'Pertanian Padi Sawah'],
    mitigationProtocols: [
      'PLTU Labuan mengaktifkan filter udara intake turbin darurat guna mencegah abrasi sudu turbin.',
      'Lindungi tambak garam dan kolam penampungan ikan dari paparan belerang asam.',
      'Edukasi warga tentang bahaya menggosok mata bila kemasukan partikel abu kaca vulkanik tajam.',
    ],
  },
  {
    id: 'kalianda-rajabasa',
    name: 'Kawasan Kalianda & Pesisir Kaki G. Rajabasa',
    regency: 'Kab. Lampung Selatan',
    province: 'Lampung',
    coords: [-5.740, 105.620],
    distKm: 45.9,
    bearingDeg: 28,
    bearingCardinal: 'Utara-Timur Laut',
    hazardZone: 'KRB I (Perhatian)',
    defaultRiskLevel: 'SEDANG',
    population: '± 112.500 jiwa',
    criticalAssets: [
      'RSUD Bob Bazar Kalianda',
      'Pusat Pemerintahan Pemkab Lampung Selatan',
      'Jalan Tol Trans-Sumatra (Ruas Bakauheni-Terbanggi Besar KM 25-40)',
      'Dermaga Canti & Bom Kalianda',
    ],
    ashFallProfile: {
      potentialThickness: '1 – 6 mm (Abu Halus)',
      typicalArrivalMinutes: 75,
      airQualityIndex: 'Tidak Sehat',
      visibilityDrop: '600 – 1.200 meter',
    },
    impactSectors: ['Jalan Tol Trans-Sumatra', 'Layanan Medis Rujukan', 'Perkebunan Kopi & Karet'],
    mitigationProtocols: [
      'Pemasangan Variable Message Sign (VMS) di Jalan Tol peringatan jarak pandang terbatas & jalan licin.',
      'Kesiapsiagaan ruang isolasi paru RSUD Bob Bazar terhadap lonjakan pasien bronkitis & asma.',
    ],
  },
  {
    id: 'pelabuhan-bakauheni',
    name: 'Pelabuhan Penyeberangan Utama Bakauheni',
    regency: 'Kab. Lampung Selatan (Kec. Bakauheni)',
    province: 'Lampung',
    coords: [-5.867, 105.750],
    distKm: 44.8,
    bearingDeg: 54,
    bearingCardinal: 'Timur Laut',
    hazardZone: 'KRB I (Perhatian)',
    defaultRiskLevel: 'WASPADA',
    population: '30.000 – 50.000 penumpang & 9.000 truk logistik per hari',
    criticalAssets: [
      'Dermaga Eksekutif & Reguler 1 – 7 ASDP',
      'Titik Pangkal Jalan Tol Trans-Sumatra (KM 00)',
      'Menara Pengawas VTS (Vessel Traffic Service) Bakauheni',
    ],
    ashFallProfile: {
      potentialThickness: '0.5 – 4 mm (Hujan Abu Tipis hingga Sedang)',
      typicalArrivalMinutes: 72,
      airQualityIndex: 'Tidak Sehat',
      visibilityDrop: '800 – 1.500 meter',
    },
    impactSectors: ['Logistik Nasional Sembako Jawa-Sumatra', 'Operasional Kapal Feri Ro-Ro ASDP'],
    mitigationProtocols: [
      'BPTD dan ASDP menerapkan skema delay keberangkatan feri jika visibilitas alur masuk < 500m.',
      'Penyemprotan rutin jalur dek kapal feri dengan air tawar guna menghilangkan debu vulkanik korosif.',
    ],
  },
  {
    id: 'merak-cilegon',
    name: 'Pelabuhan Merak & Kawasan Industri Berat Cilegon',
    regency: 'Kota Cilegon',
    province: 'Banten',
    coords: [-5.930, 106.000],
    distKm: 64.2,
    bearingDeg: 72,
    bearingCardinal: 'Timur-Timur Laut',
    hazardZone: 'KRB I (Perhatian)',
    defaultRiskLevel: 'WASPADA',
    population: '± 445.000 jiwa + Kompleks Industri Petrokimia Nasional',
    criticalAssets: [
      'Pelabuhan Penyeberangan Merak (Dermaga 1–7)',
      'PLTU Suralaya Unit 1–8 (3.400 MW)',
      'Pabrik Baja Krakatau Steel & Kawasan Petrokimia Cilegon',
    ],
    ashFallProfile: {
      potentialThickness: '0.2 – 2 mm (Debu Vulkanik Halus PM2.5 / PM10)',
      typicalArrivalMinutes: 110,
      airQualityIndex: 'Sedang',
      visibilityDrop: '1.200 – 2.500 meter',
    },
    impactSectors: ['Pembangkitan Listrik Jawa-Bali', 'Industri Kimia Berbahaya', 'Penyeberangan Feri'],
    mitigationProtocols: [
      'PLN Transmisi Jawa Bagian Barat melakukan inspeksi isolator gardu induk terhadap risiko lecutan listrik (flashover).',
      'Pembersihan filter udara kompresor industri petrokimia secara berkala.',
    ],
  },
  {
    id: 'ruang-udara-w45',
    name: 'Koridor Udara Internasional W45 / ATS Routes Selat Sunda',
    regency: 'Ruang Udara Jakarta FIR (FL050 – FL350)',
    province: 'Selat Sunda / Perairan Internasional',
    coords: [-6.102, 105.423],
    distKm: 0,
    bearingDeg: 0,
    bearingCardinal: 'Pusat Kawah Vertikal',
    hazardZone: 'KRB III (Bahaya Tinggi)',
    defaultRiskLevel: 'KRITIS',
    population: '120+ penerbangan komersial domestik & internasional per hari',
    criticalAssets: [
      'Rute Udara Penghubung Bandara Soekarno-Hatta (CGK) menuju Sumatra / Singapura / Eropa',
      'Ruang Udara Terminal Control Area (TMA) Jakarta',
    ],
    ashFallProfile: {
      potentialThickness: 'Konsentrasi Partikel Abu Silika > 2.0 mg/m³ di Udara',
      typicalArrivalMinutes: 0,
      airQualityIndex: 'Berbahaya (Hazardous)',
      visibilityDrop: 'Nol di Dalam Awan',
    },
    impactSectors: ['Keselamatan Maskapai Aviasi', 'Mesin Turbin Jet (Risiko Engine Flameout)'],
    mitigationProtocols: [
      'AirNav Indonesia menerbitkan NOTAM penutupan airway W45 dan pengalihan ke rute alternatif W11 / W17.',
      'BMKG & VAAC Darwin memutakhirkan Volcanic Ash Advisory setiap 3 jam sekali.',
    ],
  },
];

/**
 * Data Profil Angin Lapisan Atas (Upper-Air Sounding / Radiosonde) BMKG
 * Pengukuran Stasiun Meteorologi Kelas I Cengkareng / Radin Inten II Lampung
 */
export const BMKG_UPPER_AIR_PROFILE: BmkgUpperAirSounding[] = [
  {
    levelHpa: 1000,
    altitudeMeters: 10,
    flightLevel: 'Surface (SFC)',
    windDirectionDeg: 220,
    windSpeedMs: 5.5,
    windSpeedKnots: 11,
    tempCelsius: 30.2,
    dewPointCelsius: 24.8,
    description: 'Lapisan batas permukaan Selat Sunda, angin laut monsun bertiup ke timur laut.',
  },
  {
    levelHpa: 925,
    altitudeMeters: 750,
    flightLevel: 'FL025',
    windDirectionDeg: 230,
    windSpeedMs: 7.8,
    windSpeedKnots: 15,
    tempCelsius: 24.6,
    dewPointCelsius: 20.1,
    description: 'Lapisan dasar kolom letusan; material lapili kasar mulai terbawa ke arah timur-timur laut.',
  },
  {
    levelHpa: 850,
    altitudeMeters: 1500,
    flightLevel: 'FL050',
    windDirectionDeg: 240,
    windSpeedMs: 9.8,
    windSpeedKnots: 19,
    tempCelsius: 19.4,
    dewPointCelsius: 15.2,
    description: 'Batas bawah lintasan abu vulkanik menuju Pulau Sebesi dan pesisir Banten barat.',
  },
  {
    levelHpa: 700,
    altitudeMeters: 3000,
    flightLevel: 'FL100',
    windDirectionDeg: 255,
    windSpeedMs: 13.5,
    windSpeedKnots: 26,
    tempCelsius: 10.2,
    dewPointCelsius: 4.1,
    description: 'Ketinggian puncak erupsi sedang (Tipe Vulkanian). Abu menjangkau jalur ALKI I dan Anyer.',
  },
  {
    levelHpa: 500,
    altitudeMeters: 5500,
    flightLevel: 'FL180',
    windDirectionDeg: 270,
    windSpeedMs: 18.0,
    windSpeedKnots: 35,
    tempCelsius: -6.4,
    dewPointCelsius: -14.0,
    description: 'Troposfer tengah; jetstream monsun barat intensif membawa abu vulkanik ke Serang & Tangerang.',
  },
  {
    levelHpa: 300,
    altitudeMeters: 9200,
    flightLevel: 'FL300',
    windDirectionDeg: 285,
    windSpeedMs: 25.2,
    windSpeedKnots: 49,
    tempCelsius: -32.5,
    dewPointCelsius: -41.2,
    description: 'Jalur jelajah pesawat jet komersial rute internasional; abu berisiko tinggi mematikan mesin.',
  },
  {
    levelHpa: 200,
    altitudeMeters: 12000,
    flightLevel: 'FL390',
    windDirectionDeg: 290,
    windSpeedMs: 32.0,
    windSpeedKnots: 62,
    tempCelsius: -54.0,
    dewPointCelsius: -65.0,
    description: 'Lapisan tropopause; aerosol sulfat SO2 menyebar luas secara global.',
  },
];

/**
 * Koleksi Skenario Resmi SIGMET & Advisory BMKG / VAAC Darwin
 */
export const BMKG_SIGMET_SCENARIOS: BmkgSigmetScenario[] = [
  {
    id: 'sigmet-east-monsoon',
    code: 'WIIF SIGMET 02',
    title: 'Skenario Muson Timur (Angin Kuat ke Barat Daya / Samudra Hindia)',
    issueDate: '08:30 UTC',
    fir: 'WIIF JAKARTA FIR',
    volcanoName: 'ANAK KRAKATAU (262000)',
    columnHeightMeters: 3000,
    flightLevelRange: 'SFC/FL100',
    driftDirectionDeg: 230, // Hanyut ke 230° (Barat Daya)
    driftCardinal: 'Barat Daya',
    windSpeedMs: 8.5,
    windSpeedKnots: 17,
    polygonCoords: [
      [-6.05, 105.42],
      [-6.08, 105.48],
      [-6.35, 105.35],
      [-6.65, 105.10],
      [-6.55, 104.90],
      [-6.18, 105.25],
    ],
    summary: 'Awan abu vulkanik bergerak ke arah Barat Daya menuju perairan Samudra Hindia, menjauhi pemukiman padat di Pulau Jawa. Wilayah Selat Sunda bagian barat berstatus waspada tinggi bagi pelayaran.',
    affectedCounties: ['Perairan Samudra Hindia', 'Tanjung Lesung (Pesisir Selatan)', 'ALKI I Sektor Selatan'],
    vonaStatus: 'ORANGE',
  },
  {
    id: 'sigmet-west-monsoon',
    code: 'WIIF SIGMET 05',
    title: 'Skenario Muson Barat (Hanyut ke Timur Laut / Banten, Anyer, Cilegon & Merak)',
    issueDate: '14:15 UTC',
    fir: 'WIIF JAKARTA FIR',
    volcanoName: 'ANAK KRAKATAU (262000)',
    columnHeightMeters: 4500,
    flightLevelRange: 'SFC/FL150',
    driftDirectionDeg: 65, // Hanyut ke 65° (Timur Laut)
    driftCardinal: 'Timur Laut',
    windSpeedMs: 11.5,
    windSpeedKnots: 22,
    polygonCoords: [
      [-6.15, 105.40],
      [-6.08, 105.43],
      [-5.92, 105.80],
      [-5.85, 106.05],
      [-6.10, 106.08],
      [-6.25, 105.65],
    ],
    summary: 'Awan abu tebal terdorong angin kencang monsun barat langsung mengarah ke pesisir wisata Anyer, Pelabuhan Merak, dan kompleks industri Cilegon. Potensi hujan abu pekat di daratan Provinsi Banten.',
    affectedCounties: ['Anyer', 'Cinangka', 'Kota Cilegon', 'Pelabuhan Merak', 'ALKI I'],
    vonaStatus: 'RED',
  },
  {
    id: 'sigmet-north-threat',
    code: 'WIIF SIGMET 08',
    title: 'Skenario Angin Selatan (Ancaman Kritis Pulau Sebesi & Lampung Selatan)',
    issueDate: '03:45 UTC',
    fir: 'WIIF JAKARTA FIR',
    volcanoName: 'ANAK KRAKATAU (262000)',
    columnHeightMeters: 3800,
    flightLevelRange: 'SFC/FL120',
    driftDirectionDeg: 15, // Hanyut ke 15° (Utara-Timur Laut)
    driftCardinal: 'Utara-Timur Laut',
    windSpeedMs: 9.2,
    windSpeedKnots: 18,
    polygonCoords: [
      [-6.13, 105.40],
      [-6.11, 105.46],
      [-5.85, 105.58],
      [-5.68, 105.65],
      [-5.70, 105.50],
      [-5.95, 105.42],
    ],
    summary: 'Awan abu langsung menyapu Pulau Sebesi yang berpenghuni 2.800 jiwa dan pesisir Kalianda, Lampung Selatan. Status siaga evakuasi pulau terisolir diaktifkan oleh BPBD Lampung.',
    affectedCounties: ['Pulau Sebesi', 'Pulau Sebuku', 'Kalianda', 'Kec. Rajabasa', 'Bakauheni'],
    vonaStatus: 'RED',
  },
  {
    id: 'sigmet-historic-2018',
    code: 'WIIF SIGMET ARSIP 2018',
    title: 'Skenario Erupsi Paroksismal & Kolaps Tubuh 22 Des 2018 (Arsip Historis)',
    issueDate: '21:03 WIB',
    fir: 'WIIF JAKARTA FIR',
    volcanoName: 'ANAK KRAKATAU (262000)',
    columnHeightMeters: 8000,
    flightLevelRange: 'SFC/FL260',
    driftDirectionDeg: 125, // Hanyut ke 125° (Tenggara)
    driftCardinal: 'Tenggara',
    windSpeedMs: 16.0,
    windSpeedKnots: 31,
    polygonCoords: [
      [-6.08, 105.40],
      [-6.05, 105.47],
      [-6.25, 105.78],
      [-6.55, 105.95],
      [-6.70, 105.70],
      [-6.32, 105.35],
    ],
    summary: 'Peristiwa kolaps lereng barat daya seluas 64 hektare yang memicu tsunami Selat Sunda dan letusan freatomagmatik hebat dengan lontaran abu menembus FL260 ke arah tenggara (Carita & Labuan).',
    affectedCounties: ['Carita', 'Labuan', 'Panimbang', 'Tanjung Lesung', 'Selat Sunda'],
    vonaStatus: 'RED',
  },
];

/**
 * Format teks raw buletin SIGMET ICAO standar yang dipancarkan BMKG Aviation
 */
export function generateRawBmkgSigmetText(scenario: BmkgSigmetScenario): string {
  return `WIIF SIGMET ${scenario.code.replace('WIIF SIGMET ', '')} VALID 130600/131200 WIII-
WIIF JAKARTA FIR VA ERUPTION MT ANAK KRAKATAU PSN S0606 E10525
VA CLD OBS AT ${scenario.issueDate.replace(':', '')}Z WI ${scenario.polygonCoords
    .map(([lat, lng]) => {
      const latStr = `S${String(Math.abs(Math.round(lat * 100))).padStart(4, '0')}`;
      const lngStr = `E${String(Math.round(lng * 100)).padStart(5, '0')}`;
      return `${latStr} ${lngStr}`;
    })
    .join(' - ')} ${scenario.flightLevelRange} MOV ${getCardinalFromDegree(scenario.driftDirectionDeg)} ${scenario.windSpeedKnots}KT
FCST 1200Z VA CLD APRX SAME AREA.
REMARKS: VONA ${scenario.vonaStatus} ISSUED BY PVMBG. RADAR CENGKARENG & HIMAWARI-9 RGB ASH CONFIRMED.`;
}

function getCardinalFromDegree(deg: number): string {
  const cardinals = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(deg / 22.5) % 16;
  return cardinals[index];
}
