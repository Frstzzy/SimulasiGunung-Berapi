/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EruptionPreset } from '../types';

export const ERUPTION_PRESETS: EruptionPreset[] = [
  {
    id: 'strombolian',
    name: 'Strombolian Rutin (2022–2023)',
    subtitle: 'Lontaran Pijar Skala Kecil - Sedang',
    description:
      'Tipe erupsi yang sering teramati di Gunung Anak Krakatau. Letusan ritmis menghasilkan lontaran batuan pijar dan bom vulkanik dalam radius 1–2 km dari kawah aktif.',
    ballistic: {
      initialVelocity: 130, // m/s
      launchAngle: 72, // degrees
      launchAzimuth: 140, // degrees (SE)
      rockDiameter: 0.35, // 35 cm volcanic bomb
      rockDensity: 2500, // kg/m^3 (andesit basaltik)
      dragCoefficient: 0.65, // batuan kasar bersudut
      enableAirDrag: true,
      ventElevation: 157, // elevasi kawah Anak Krakatau
      gravity: 9.81,
      projectileCount: 6,
      dispersionMode: 'focused',
    },
    plume: {
      columnHeight: 800, // meter di atas puncak
      emissionRate: 3.5,
      windSpeed: 6.5, // m/s
      windDirection: 60, // Angin bertiup dari Timur Laut (menuju Barat Daya)
      particleSize: 'medium',
      stabilityClass: 'D',
    },
    dangerRadiusKm: 5,
  },
  {
    id: 'vulcanian',
    name: 'Vulkanian Eksplosif',
    subtitle: 'Kolom Abu Tebal & Dentuman Kuat',
    description:
      'Erupsi eksplosif akibat akumulasi tekanan gas magma andesitik. Lontaran bom vulkanik masif terlempar hingga radius 3–4 km, membahayakan kapal di Selat Sunda.',
    ballistic: {
      initialVelocity: 215, // m/s
      launchAngle: 65,
      launchAzimuth: 220,
      rockDiameter: 0.65, // 65 cm
      rockDensity: 2600,
      dragCoefficient: 0.7,
      enableAirDrag: true,
      ventElevation: 157,
      gravity: 9.81,
      projectileCount: 8,
      dispersionMode: 'focused',
    },
    plume: {
      columnHeight: 2200,
      emissionRate: 7.0,
      windSpeed: 10.0,
      windDirection: 90, // Angin dari Timur (menuju Barat ke arah Selat Sunda tengah)
      particleSize: 'fine',
      stabilityClass: 'C',
    },
    dangerRadiusKm: 5,
  },
  {
    id: 'surtseyan2018',
    name: 'Kasus 22 Des 2018 (Freatomagmatik)',
    subtitle: 'Interaksi Magma-Air Laut & Kolaps Lereng',
    description:
      'Peristiwa bersejarah letusan freatomagmatik berkelanjutan dengan kolom abu hitam pekat hingga 3.000 meter. Angin muson mengarahkan abu ke Barat Daya, disertai kolaps lereng 64 hektar.',
    ballistic: {
      initialVelocity: 185,
      launchAngle: 58,
      launchAzimuth: 235, // Arah kolaps barat daya
      rockDiameter: 0.5,
      rockDensity: 2450,
      dragCoefficient: 0.75,
      enableAirDrag: true,
      ventElevation: 157,
      gravity: 9.81,
      projectileCount: 10,
      dispersionMode: 'radial',
    },
    plume: {
      columnHeight: 3000,
      emissionRate: 9.0,
      windSpeed: 14.0, // Angin kencang muson
      windDirection: 45, // Angin dari Timur Laut mengarah ke Barat Daya (Samudra Hindia)
      particleSize: 'medium',
      stabilityClass: 'D',
    },
    dangerRadiusKm: 5,
  },
  {
    id: 'subplinian',
    name: 'Simulasi Paroksismal Maksimal',
    subtitle: 'Skenario Uji Batas Bahaya KRB III (5 Km)',
    description:
      'Skenario simulasi untuk menguji jangkauan proyektil ketika kecepatan lontaran mendekati kecepatan suara di udara (~300 m/s), mengevaluasi apakah bom vulkanik dapat menembus zona bahaya 5 km.',
    ballistic: {
      initialVelocity: 310,
      launchAngle: 50, // Sudut optimal untuk jangkauan maksimum dengan hambatan udara
      launchAzimuth: 80, // Mengarah ke timur (jalur kapal ALKI I)
      rockDiameter: 0.8,
      rockDensity: 2700,
      dragCoefficient: 0.6,
      enableAirDrag: true,
      ventElevation: 157,
      gravity: 9.81,
      projectileCount: 16,
      dispersionMode: 'radial',
    },
    plume: {
      columnHeight: 4500,
      emissionRate: 10.0,
      windSpeed: 16.0,
      windDirection: 270, // Angin dari Barat (mengarah ke Pesisir Anyer & Banten)
      particleSize: 'fine',
      stabilityClass: 'B',
    },
    dangerRadiusKm: 5,
  },
  {
    id: 'krakatau1883',
    name: 'Krakatau 1883 (Kataklismik VEI 6)',
    subtitle: 'Letusan Kolosal Bersejarah & Tsunami Selat Sunda',
    description:
      'Rekonstruksi letusan dahsyat 26–27 Agustus 1883 yang meruntuhkan kaldera purba Krakatau. Dentuman terdengar hingga 4.800 km, kolom letusan plinian mencapai stratosfer setinggi 25 km, serta melontarkan bom vulkanik masif berdiameter lebih dari 1 meter yang mengubah topografi Selat Sunda.',
    ballistic: {
      initialVelocity: 420, // m/s (dekompresi magma supersaturasi gas)
      launchAngle: 48,
      launchAzimuth: 240, // Lontaran masif ke arah barat daya
      rockDiameter: 1.2, // 1.2 m bom vulkanik
      rockDensity: 2400, // kg/m^3
      dragCoefficient: 0.7,
      enableAirDrag: true,
      ventElevation: 813, // Ketinggian puncak Rakata sebelum runtuh
      gravity: 9.81,
      projectileCount: 20,
      dispersionMode: 'radial',
    },
    plume: {
      columnHeight: 25000, // 25 km menembus stratosfer
      emissionRate: 10.0,
      windSpeed: 22.0, // Angin lapisan tinggi
      windDirection: 75, // Dari Timur Laut ke Barat Daya
      particleSize: 'fine',
      stabilityClass: 'A',
    },
    dangerRadiusKm: 25, // Radius terdampak total 25 km
  },
];
