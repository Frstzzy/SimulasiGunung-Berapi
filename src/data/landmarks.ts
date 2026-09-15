/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

export interface GeologicalLandmark3D {
  id: string;
  name: string;
  subtitle: string;
  badge: string;
  category: 'crater' | 'collapse' | 'island' | 'maritime';
  position: { x: number; y: number; z: number };
  targetCamera: {
    target: { x: number; y: number; z: number };
    distance: number;
    phi: number;
    theta: number;
  };
  icon: string;
  color: string;
  description: string;
  geologicalHighlights: string[];
}

export const GEOLOGICAL_LANDMARKS: GeologicalLandmark3D[] = [
  {
    id: 'kawah_aktif',
    name: 'Puncak Kawah Aktif',
    subtitle: '157 mdpl • Danau Magma & Fumarola',
    badge: 'Kawah Utama',
    category: 'crater',
    position: { x: 0, y: 157, z: 0 },
    targetCamera: {
      target: { x: 0, y: 157, z: 0 },
      distance: 650,
      phi: 1.05,
      theta: 0.85,
    },
    icon: '🌋',
    color: '#f97316',
    description:
      'Pusat kepundan aktif Gunung Anak Krakatau. Memiliki danau magma bergolak dan celah solfatara bertemperatur 250°C-600°C yang melepaskan gas belerang dioksida (SO2) dan uap air bertekanan tinggi.',
    geologicalHighlights: [
      'Ketinggian pasca-2018: ~157 mdpl (berkurang drastis dari 338 mdpl)',
      'Tipe erupsi: Strombolian & Vulkanian frekuen',
      'Endapan kerak belerang murni di bibir kawah',
    ],
  },
  {
    id: 'kolaps_2018',
    name: 'Amfiteater Kolaps Lereng 2018',
    subtitle: 'Flank Collapse Barat Daya • Sesar Longsoran',
    badge: 'Zona Patahan',
    category: 'collapse',
    position: { x: -380, y: 45, z: -320 },
    targetCamera: {
      target: { x: -300, y: 50, z: -250 },
      distance: 1200,
      phi: 1.25,
      theta: -1.75,
    },
    icon: '⚠️',
    color: '#ef4444',
    description:
      'Dinding sesar terjal berbentuk tapal kuda (horseshoe amphitheater) tempat runtuhnya ~0,22 km³ tubuh barat daya Anak Krakatau ke dasar laut Selat Sunda pada 22 Desember 2018, memicu tsunami dahsyat.',
    geologicalHighlights: [
      'Volume material runtuh: ~220 juta m³ batuan vulkanik',
      'Kejadian membangkitkan tsunami hingga pantai Banten & Lampung',
      'Membentuk lereng bawah laut curam sedalam >200 meter',
    ],
  },
  {
    id: 'danau_hidrotermal',
    name: 'Laguna Asam & Solfatara',
    subtitle: '12 mdpl • Danau Kawah Hijau Toska',
    badge: 'Danau Kawah',
    category: 'crater',
    position: { x: -130, y: 15, z: -150 },
    targetCamera: {
      target: { x: -100, y: 20, z: -120 },
      distance: 580,
      phi: 0.95,
      theta: -1.15,
    },
    icon: '♨️',
    color: '#06b6d4',
    description:
      'Genangan air kawah hidrotermal bersuhu tinggi dan sangat asam (pH < 1.5) akibat reaksi air laut dengan gas magmatik volatil. Permukaan air bergolak dengan semburan uap solfatara belerang.',
    geologicalHighlights: [
      'Warna hijau toska cerah akibat saturasi ion sulfat & besi',
      'Ventilasi fumarola aktif di sekeliling genangan kawah',
      'Interaksi air-magma memicu letusan freatomagmatik/surtseyan',
    ],
  },
  {
    id: 'alur_lava',
    name: 'Alur Lava Andesit Basaltik',
    subtitle: 'Lereng Timur & Tenggara • Aliran Membeku',
    badge: 'Lava Strata',
    category: 'crater',
    position: { x: 340, y: 65, z: 260 },
    targetCamera: {
      target: { x: 280, y: 50, z: 220 },
      distance: 900,
      phi: 1.2,
      theta: 0.65,
    },
    icon: '🪨',
    color: '#a855f7',
    description:
      'Struktur lidah lava andesit basaltik hitam pekat bertekstur kasar membeku (aa lava) dan breksi vulkanik hasil lelehan erupsi efusif 2012–2018 yang memperluas daratan pulau ke arah tenggara.',
    geologicalHighlights: [
      'Komposisi: Andesit basaltik dengan silika ~54%',
      'Ketebalan lapisan lava dingin: 2 - 8 meter',
      'Membentuk tanjung bebatuan kokoh penahan abrasi gelombang laut',
    ],
  },
  {
    id: 'pulau_rakata',
    name: 'Pulau Rakata (813 mdpl)',
    subtitle: 'Tebing Vertikal Kaldera Purba 1883',
    badge: 'Kaldera 1883',
    category: 'island',
    position: { x: 600, y: 813, z: 4200 },
    targetCamera: {
      target: { x: 600, y: 400, z: 4200 },
      distance: 4600,
      phi: 1.35,
      theta: 0.15,
    },
    icon: '⛰️',
    color: '#10b981',
    description:
      'Puncak tertinggi kaldera Krakatau. Sisi utara yang menghadap langsung ke Anak Krakatau adalah tebing vertikal raksasa terbelah yang menyingkap profil interior kerucut vulkanik letusan 1883.',
    geologicalHighlights: [
      'Ketinggian: 813 mdpl, tertutup hutan hujan tropis lebat',
      'Dinding utara: Sisa patahan vertikal kaldera runtuh 1883',
      'Jarak ke kawah aktif: ~4,2 km ke arah Selatan',
    ],
  },
  {
    id: 'pulau_sertung',
    name: 'Pulau Sertung (182 mdpl)',
    subtitle: 'Dinding Kaldera Piroklastik Barat Laut',
    badge: 'Pulau Kaldera',
    category: 'island',
    position: { x: -3200, y: 182, z: -1600 },
    targetCamera: {
      target: { x: -3200, y: 100, z: -1600 },
      distance: 3600,
      phi: 1.35,
      theta: -2.3,
    },
    icon: '🏝️',
    color: '#14b8a6',
    description:
      'Pulau pembatas kaldera barat laut yang tersusun dari endapan abu tebal dan batu apung (pumice) piroklastik berlapispaling tebal dari letusan 1883.',
    geologicalHighlights: [
      'Ketinggian: 182 mdpl, panjang memanjang arah barat daya',
      'Struktur: Lapisan ignimbrit dan endapan tefra masif',
      'Menjadi penahan gelombang dari arah Samudra Hindia',
    ],
  },
  {
    id: 'pulau_panjang',
    name: 'Pulau Panjang (142 mdpl)',
    subtitle: 'Dinding Kaldera Timur Laut',
    badge: 'Pulau Kaldera',
    category: 'island',
    position: { x: 3100, y: 142, z: -1100 },
    targetCamera: {
      target: { x: 3100, y: 80, z: -1100 },
      distance: 3500,
      phi: 1.35,
      theta: 0.95,
    },
    icon: '🏝️',
    color: '#0ea5e9',
    description:
      'Pulau tefra panjang di timur laut yang membatasi kaldera bawah laut tempat lahirnya pulau vulkanik Anak Krakatau dari dasar laut pada tahun 1927.',
    geologicalHighlights: [
      'Ketinggian: 142 mdpl',
      'Komposisi: Breksi vulkanik purba dan endapan tuf',
      'Jarak dari vent kawah: ~3,3 km arah timur laut',
    ],
  },
  {
    id: 'alki_lane',
    name: 'Alur Laut Kepulauan (ALKI I)',
    subtitle: 'Koridor Maritim Internasional Selat Sunda',
    badge: 'Jalur Pelayaran',
    category: 'maritime',
    position: { x: 8800, y: 15, z: 1500 },
    targetCamera: {
      target: { x: 8800, y: 0, z: 1500 },
      distance: 5500,
      phi: 1.42,
      theta: 0.15,
    },
    icon: '🚢',
    color: '#38bdf8',
    description:
      'Jalur lalu lintas kapal niaga internasional (ALKI I) yang melintasi Selat Sunda. Terletak hanya ~9-12 km di timur Anak Krakatau, menjadikannya kawasan berisiko tinggi terhadap lontaran bom vulkanik dan abu tebal.',
    geologicalHighlights: [
      'Jalur kapal kontainer, tanker minyak, dan kapal feri Merak-Bakauheni',
      'Berada di tepi luar radius KRB II (7,5 km) & KRB I (15 km)',
      'Memerlukan Notice to Mariners (NOTAM/NAVTEX) saat erupsi meningkat',
    ],
  },
];
