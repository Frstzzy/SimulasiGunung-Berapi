/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Modul Generator Laporan Ilmiah & Operasional Simulasi Gunung Anak Krakatau
 * Menghasilkan Dokumen PDF Berformat A4 Lengkap dengan Metrik Erupsi, Cuaca,
 * Serta Estimasi Wilayah Terdampak di Selat Sunda (PVMBG / BMKG Reference).
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BallisticParams, PlumeParams, EruptionPresetId, KrakatauWeather } from '../types';
import { ERUPTION_PRESETS } from '../data/presets';
import { BMKG_AFFECTED_AREAS, BmkgAffectedArea } from '../data/bmkgData';

export interface PdfReportOptions {
  ballistic: BallisticParams;
  plume: PlumeParams;
  weather: KrakatauWeather | null;
  selectedPreset: EruptionPresetId;
  investigatorName?: string;
  institution?: string;
  customNotes?: string;
  fileName?: string;
}

export interface DynamicAreaImpact {
  area: BmkgAffectedArea;
  distanceKm: number;
  bearingDeg: number;
  angularDiffDeg: number;
  isDirectlyDownwind: boolean;
  etaMinutes: number;
  estimatedThicknessMm: number;
  currentRiskLevel: 'KRITIS' | 'TINGGI' | 'SEDANG' | 'WASPADA';
  riskColor: [number, number, number];
}

/**
 * Menghitung dampak dinamis abu vulkanik pada tiap wilayah berdasarkan
 * arah dan kecepatan angin serta tinggi kolom erupsi saat ini.
 */
export function calculateDynamicAreaImpacts(
  plume: PlumeParams
): DynamicAreaImpact[] {
  // Arah pergerakan abu (drift direction) = arah asal angin + 180°
  const driftDeg = (plume.windDirection + 180) % 360;
  const windSpeedMs = Math.max(1, plume.windSpeed);

  return BMKG_AFFECTED_AREAS.map((area) => {
    // Selisih sudut antara vektor abu dan posisi wilayah
    let diff = Math.abs(driftDeg - area.bearingDeg);
    if (diff > 180) diff = 360 - diff;

    const isDirectlyDownwind = diff <= 40;
    const isMarginallyDownwind = diff <= 80;

    // Estimasi waktu tempuh abu dalam menit: (jarak * 1000m) / (kecepatan angin m/s * 60s)
    const rawEta = Math.round((area.distKm * 1000) / (windSpeedMs * 60));
    const etaMinutes = Math.max(2, rawEta);

    // Estimasi ketebalan isopach relatif berdasarkan jarak dan deviasi sudut
    let thicknessFactor = Math.max(0, 1 - area.distKm / 75) * Math.cos((diff * Math.PI) / 180);
    if (diff > 85) thicknessFactor = 0;
    const estimatedThicknessMm = Math.round(
      Math.max(0, thicknessFactor * (plume.columnHeight / 800) * (plume.emissionRate * 1.5)) * 10
    ) / 10;

    // Penentuan level risiko dinamis
    let currentRiskLevel: 'KRITIS' | 'TINGGI' | 'SEDANG' | 'WASPADA';
    let riskColor: [number, number, number];

    if (area.distKm <= 5.0) {
      // Radius steril KRB III
      currentRiskLevel = 'KRITIS';
      riskColor = [220, 38, 38]; // Red
    } else if (isDirectlyDownwind && area.distKm <= 35) {
      currentRiskLevel = 'KRITIS';
      riskColor = [220, 38, 38];
    } else if (isDirectlyDownwind || (isMarginallyDownwind && area.distKm <= 30)) {
      currentRiskLevel = 'TINGGI';
      riskColor = [234, 88, 12]; // Orange
    } else if (isMarginallyDownwind || area.distKm <= 25) {
      currentRiskLevel = 'SEDANG';
      riskColor = [202, 138, 4]; // Amber
    } else {
      currentRiskLevel = 'WASPADA';
      riskColor = [71, 85, 105]; // Slate
    }

    return {
      area,
      distanceKm: area.distKm,
      bearingDeg: area.bearingDeg,
      angularDiffDeg: Math.round(diff),
      isDirectlyDownwind,
      etaMinutes,
      estimatedThicknessMm,
      currentRiskLevel,
      riskColor,
    };
  });
}

/**
 * Menghasilkan Dokumen PDF Lengkap Laporan Simulasi Erupsi Anak Krakatau
 */
export function generateSimulationPdfDoc(options: PdfReportOptions): jsPDF {
  const {
    ballistic,
    plume,
    weather,
    selectedPreset,
    investigatorName = 'Operator Vulkanologi & Mitigasi Selat Sunda',
    institution = 'Pusat Simulasi Komputasi Bencana Geologi',
    customNotes = '',
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  const currentPreset = ERUPTION_PRESETS.find((p) => p.id === selectedPreset) || ERUPTION_PRESETS[0];
  const impacts = calculateDynamicAreaImpacts(plume);

  // Estimasi jangkauan balistik komputasi
  const v0 = ballistic.initialVelocity;
  const thetaRad = (ballistic.launchAngle * Math.PI) / 180;
  const g = ballistic.gravity || 9.81;
  const maxRangeIdeal = (v0 * v0 * Math.sin(2 * thetaRad)) / g;
  // Perkiraan empiris dengan hambatan udara aerodinamis (~55-75% dari parabola ideal)
  const maxRangeEstWithDrag = ballistic.enableAirDrag
    ? Math.round(maxRangeIdeal * 0.65)
    : Math.round(maxRangeIdeal);
  const maxAltitudeEst = Math.round((v0 * v0 * Math.sin(thetaRad) * Math.sin(thetaRad)) / (2 * g) * (ballistic.enableAirDrag ? 0.72 : 1.0));
  const flightTimeEst = Math.round(((2 * v0 * Math.sin(thetaRad)) / g) * (ballistic.enableAirDrag ? 0.85 : 1.0));
  
  // Massa Erupsi Berdasarkan Rumus Mastin et al. (2009): Q = 140 * H^2.3
  const columnHkm = plume.columnHeight / 1000;
  const massEruptionRateKgS = Math.round(140 * Math.pow(Math.max(0.5, columnHkm), 2.3));
  const downwindReachKm = Math.min(85, Math.round(8 + (plume.windSpeed * 3.6) * 0.45));
  const driftDeg = (plume.windDirection + 180) % 360;

  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB (UTC+7)`;
  const reportRefId = `GAK-REP/${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(1000 + Math.random() * 9000))}`;

  // =========================================================================
  // HALAMAN 1: HEADER, METADATA, PARAMETER FISIKA & CUACA
  // =========================================================================

  // Top Dark Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 38, 'F');

  // Accent Line (Red & Gold)
  doc.setFillColor(239, 68, 68); // Red
  doc.rect(0, 37, pageWidth * 0.6, 1.2, 'F');
  doc.setFillColor(245, 158, 11); // Amber
  doc.rect(pageWidth * 0.6, 37, pageWidth * 0.4, 1.2, 'F');

  // Header Titles
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('SimKratoa — BULETIN TEKNIS & LAPORAN SIMULASI ERUPSI', margin, 13);

  doc.setFontSize(10.5);
  doc.setTextColor(226, 232, 240); // slate-200
  doc.text('GUNUNG ANAK KRAKATAU — KOMPUTASI FISIKA & MITIGASI SELAT SUNDA', margin, 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('Pemodelan Balistik Numerik RK4 • Dispersi Plume Adveksi Gauss • Estimasi Ancaman Wilayah BMKG', margin, 24);

  // Status Badge in Header
  doc.setFillColor(220, 38, 38); // Red badge
  doc.roundedRect(pageWidth - margin - 52, 9, 52, 14, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('STATUS: SIAGA (LEVEL III)', pageWidth - margin - 26, 15, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('Radius Steril Rekomendasi: 5.0 km', pageWidth - margin - 26, 20, { align: 'center' });

  // Document Metadata Table / Card
  let currentY = 43;

  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(margin, currentY, contentWidth, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('No. Dokumen:', margin + 4, currentY + 6);
  doc.text('Waktu Pembuatan:', margin + 4, currentY + 11);
  doc.text('Objek Geologis:', margin + 4, currentY + 16);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(reportRefId, margin + 28, currentY + 6);
  doc.text(`${dateStr}, ${timeStr}`, margin + 28, currentY + 11);
  doc.text('G. Anak Krakatau (06°06\'07" LS, 105°25\'23" BT) — Elevasi Puncak 157 mdpl', margin + 28, currentY + 16);

  // Right side metadata
  const metaRightX = margin + contentWidth / 2 + 6;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Penyusun / Operator:', metaRightX, currentY + 6);
  doc.text('Instansi / Sistem:', metaRightX, currentY + 11);
  doc.text('Mode Skenario:', metaRightX, currentY + 16);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(investigatorName, metaRightX + 30, currentY + 6);
  doc.text(institution, metaRightX + 30, currentY + 11);
  doc.text(`${currentPreset.name} (${currentPreset.subtitle})`, metaRightX + 30, currentY + 16);

  currentY += 27;

  // -------------------------------------------------------------
  // SEKSI 1: PARAMETER ERUPSI & DINAMIKA BALISTIK
  // -------------------------------------------------------------
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(margin, currentY, 3, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('1. PARAMETER FISIKA ERUPSI & LONTARAN BALISTIK (EJECTA)', margin + 6, currentY + 5.5);
  currentY += 9;

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 46, fillColor: [248, 250, 252] },
      1: { cellWidth: 45 },
      2: { fontStyle: 'bold', cellWidth: 46, fillColor: [248, 250, 252] },
      3: { cellWidth: 45 },
    },
    body: [
      [
        'Kecepatan Awal Lontaran (v0)',
        `${ballistic.initialVelocity} m/s (${Math.round(ballistic.initialVelocity * 3.6)} km/jam)`,
        'Ketinggian Kolom Abu (Plume)',
        `${plume.columnHeight.toLocaleString('id-ID')} m (${plume.columnHeight + 157} mdpl)`,
      ],
      [
        'Sudut Elevasi / Azimut',
        `${ballistic.launchAngle}° elevasi / ${ballistic.launchAzimuth ?? 45}° azimut`,
        'Laju Erupsi Massa (MER)',
        `≈ ${massEruptionRateKgS.toLocaleString('id-ID')} kg/detik (Mastin 2009)`,
      ],
      [
        'Hambatan Udara (Drag Aerodinamis)',
        ballistic.enableAirDrag ? `Aktif (Cd = ${ballistic.dragCoefficient})` : 'Non-aktif (Parabola Hampa Udara)',
        'Kategori Butiran Tefra',
        plume.particleSize === 'fine' ? 'Abu Halus (< 63 µm)' : plume.particleSize === 'medium' ? 'Abu Sedang (63–500 µm)' : 'Lapili / Kasar (> 500 µm)',
      ],
      [
        'Diameter & Massa Bom Vulkanik',
        `Ø ${ballistic.rockDiameter} m • Massa ${( (4/3) * Math.PI * Math.pow(ballistic.rockDiameter/2, 3) * ballistic.rockDensity ).toFixed(1)} kg`,
        'Jangkauan Lontaran Balistik',
        `Maks. ${maxRangeEstWithDrag.toLocaleString('id-ID')} m (${(maxRangeEstWithDrag / 1000).toFixed(2)} km)`,
      ],
      [
        'Waktu Terbang & Titik Puncak',
        `Apogee: ${maxAltitudeEst} m • Waktu: ${flightTimeEst} detik`,
        'Emisi Gas Belerang (SO2)',
        `Intensitas: ${plume.emissionRate}/10 (Est. ~${plume.emissionRate * 1200} ton/hari)`,
      ],
    ],
  });

  currentY = (doc as any).lastAutoTable.finalY + 7;

  // -------------------------------------------------------------
  // SEKSI 2: KONDISI METEOROLOGI & SOUNDING ATMOSFERIK
  // -------------------------------------------------------------
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, currentY, 3, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('2. KONDISI METEOROLOGI & DISPERSI ANGIN SELAT SUNDA', margin + 6, currentY + 5.5);
  currentY += 9;

  const weatherSource = weather?.source || 'Stasiun Cuaca Otomatis Selat Sunda (AWS BMKG)';
  const weatherTemp = weather?.temperatureC !== undefined ? `${weather.temperatureC.toFixed(1)} °C` : '28.5 °C';
  const weatherHumidity = weather?.relativeHumidity !== undefined ? `${weather.relativeHumidity} %` : '78 %';
  const weatherPressure = weather?.pressureHpa !== undefined ? `${weather.pressureHpa} hPa` : '1010.5 hPa';
  const weatherCond = weather?.weatherCondition || 'Berawan Sebagian (Muson Selat Sunda)';

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 46, fillColor: [248, 250, 252] },
      1: { cellWidth: 45 },
      2: { fontStyle: 'bold', cellWidth: 46, fillColor: [248, 250, 252] },
      3: { cellWidth: 45 },
    },
    body: [
      [
        'Kecepatan Angin (v_wind)',
        `${plume.windSpeed} m/s (${Math.round(plume.windSpeed * 1.944)} knot / ${Math.round(plume.windSpeed * 3.6)} km/j)`,
        'Arah Datang Angin',
        `${plume.windDirection}° (${getCardinalIndo(plume.windDirection)})`,
      ],
      [
        'Arah Hanyutan Abu (Ash Drift)',
        `${driftDeg}° (${getCardinalIndo(driftDeg)}) — Trajektori Sebaran`,
        'Jangkauan Sebaran Abu (Downwind)',
        `± ${downwindReachKm} km ke arah ${getCardinalIndo(driftDeg)}`,
      ],
      [
        'Suhu Udara & Tekanan Muka Laut',
        `${weatherTemp} • ${weatherPressure}`,
        'Kelembaban & Kondisi Cuaca',
        `${weatherHumidity} RH • ${weatherCond}`,
      ],
      [
        'Stabilitas Atmosfer (Pasquill)',
        `Kelas ${plume.stabilityClass} (Dispersi Gauss Moderat)`,
        'Sumber Telemetri Cuaca',
        weatherSource,
      ],
    ],
  });

  currentY = (doc as any).lastAutoTable.finalY + 7;

  // Highlight Box: Ringkasan Vektor Sebaran Abu
  doc.setFillColor(254, 243, 199); // amber-100
  doc.setDrawColor(245, 158, 11); // amber-500
  doc.roundedRect(margin, currentY, contentWidth, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(146, 64, 14); // amber-900
  doc.text('IKHTISAR ADVEKSI ABU & ANCAMAN MARITIM REAL-TIME:', margin + 4, currentY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(120, 53, 15);
  const primaryThreatSummary = `Berdasarkan vektor angin saat ini (${plume.windSpeed} m/s dari ${plume.windDirection}°), kolom abu vulkanik setinggi ${plume.columnHeight}m berhembus menuju ${driftDeg}° (${getCardinalIndo(driftDeg)}). Jangkauan abu tebal mencapai radius ${downwindReachKm} km dari kawah. Kapal yang berlayar di jalur ALKI I dan pemukiman pesisir di koridor azimuth ${driftDeg}±35° diimbau siaga terhadap jatuhan abu lebat dan penurunan visibilitas secara drastis.`;
  const splitThreat = doc.splitTextToSize(primaryThreatSummary, contentWidth - 8);
  doc.text(splitThreat, margin + 4, currentY + 9.5);

  // Footer on Page 1
  renderPageFooter(doc, 1, 2, reportRefId);

  // =========================================================================
  // HALAMAN 2: TABEL ESTIMASI 10 DAERAH TERDAMPAK & PROTOKOL MITIGASI
  // =========================================================================
  doc.addPage();
  currentY = 14;

  // Top Title on Page 2
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, currentY, 3, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('3. ESTIMASI MATRIKS 10 DAERAH TERDAMPAK DI SELAT SUNDA', margin + 6, currentY + 5.5);
  currentY += 9;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Perhitungan dinamis berbasis koordinat geografis, jarak lurus, bearing kawah, kecepatan angin, dan deviasi sudut terhadap trajektori abu.',
    margin,
    currentY
  );
  currentY += 3;

  // Tabel Daerah Terdampak
  const tableData = impacts.map((imp, idx) => [
    `${idx + 1}. ${imp.area.name}\n[${imp.area.regency}]`,
    `${imp.distanceKm} km\n${imp.bearingDeg}° (${imp.area.bearingCardinal})`,
    `${imp.angularDiffDeg}°\n${imp.isDirectlyDownwind ? 'Langsung Terpapar' : 'Di Luar Sumbu Utama'}`,
    `${imp.etaMinutes} menit`,
    `${imp.estimatedThicknessMm > 0 ? imp.estimatedThicknessMm + ' mm' : '< 0.1 mm'}\n${imp.area.ashFallProfile.airQualityIndex}`,
    imp.currentRiskLevel,
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
    },
    styles: {
      fontSize: 6.8,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
      valign: 'middle',
    },
    columnStyles: {
      0: { cellWidth: 48, fontStyle: 'bold' },
      1: { cellWidth: 26, halign: 'center' },
      2: { cellWidth: 28, halign: 'center' },
      3: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 32, halign: 'center' },
      5: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
    },
    head: [
      ['Wilayah & Sektor Terdampak', 'Jarak & Arah', 'Deviasi Trajektori', 'Est. Waktu Tiba (ETA)', 'Potensi Tebal & AQI', 'Tingkat Risiko'],
    ],
    body: tableData,
    didParseCell: (data) => {
      // Pewarnaan status risiko pada kolom ke-5 (index 5)
      if (data.section === 'body' && data.column.index === 5) {
        const text = String(data.cell.raw);
        if (text === 'KRITIS') {
          data.cell.styles.textColor = [220, 38, 38]; // Merah
          data.cell.styles.fillColor = [254, 226, 226];
        } else if (text === 'TINGGI') {
          data.cell.styles.textColor = [234, 88, 12]; // Oranye
          data.cell.styles.fillColor = [255, 237, 213];
        } else if (text === 'SEDANG') {
          data.cell.styles.textColor = [161, 98, 7]; // Kuning/Amber
          data.cell.styles.fillColor = [254, 249, 195];
        } else {
          data.cell.styles.textColor = [71, 85, 105]; // Abu-abu
          data.cell.styles.fillColor = [241, 245, 249];
        }
      }
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 7;

  // -------------------------------------------------------------
  // SEKSI 4: PROTOKOL KESELAMATAN & REKOMENDASI KEBENCANAAN
  // -------------------------------------------------------------
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, currentY, 3, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('4. REKOMENDASI MITIGASI & PROTOKOL KESELAMATAN (PVMBG / BMKG / BNPB)', margin + 6, currentY + 5.5);
  currentY += 9;

  const protocolItems = [
    {
      title: 'Zona Eksklusi Steril (KRB III PVMBG):',
      text: 'Masyarakat, wisatawan, dan nelayan dilarang keras mendekati Gunung Anak Krakatau dalam radius 5.0 km dari kawah aktif untuk menghindari ancaman lontaran bom vulkanik, luncuran awan panas, dan gas beracun.',
    },
    {
      title: 'Navigasi Maritim Selat Sunda & Koridor ALKI I:',
      text: 'Nakhoda kapal internasional dan kapal ferry penyeberangan Merak-Bakauheni diwajibkan menyalakan radar navigasi, menyiagakan lampu suar kabut, dan membersihkan filter pendingin mesin (sea-chest) dari gumpalan abu vulkanik mengapung.',
    },
    {
      title: 'Kesehatan Penduduk & Perlindungan Diri:',
      text: 'Masyarakat di wilayah terpapar abu diimbau menggunakan masker standar N95 atau penutup hidung-mulut basah, kacamata pelindung (goggles), serta menutup rapat bak/tandon air minum terbuka guna mencegah iritasi ISPA dan kontaminasi asam.',
    },
    {
      title: 'Kesiapsiagaan Potensi Tsunami Akibat Longsoran Lereng (Flank Collapse):',
      text: 'Mengingat sejarah runtuhnya tubuh Anak Krakatau seluas 64 ha pada 22 Desember 2018, warga pesisir Banten dan Lampung diimbau tetap waspada dan menjauhi garis pantai jika merasakan gempa tremor vulkanik berdurasi panjang atau air laut surut tiba-tiba.',
    },
  ];

  protocolItems.forEach((p) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, currentY, 2, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(15, 23, 42);
    doc.text(p.title, margin + 4, currentY + 3.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(51, 65, 85);
    const splitTxt = doc.splitTextToSize(p.text, contentWidth - 6);
    doc.text(splitTxt, margin + 4, currentY + 6.8);
    currentY += 10.5;
  });

  currentY += 2;

  // Custom Notes / Catatan Tambahan Operator (Jika ada)
  if (customNotes.trim().length > 0) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, currentY, contentWidth, 14, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);
    doc.text('CATATAN KHUSUS OPERATOR / ANALIS LAPANGAN:', margin + 3, currentY + 4);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    const splitNotes = doc.splitTextToSize(customNotes, contentWidth - 6);
    doc.text(splitNotes, margin + 3, currentY + 8);

    currentY += 17;
  }

  // Verification & Sign-off Block
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, currentY + 1, margin + contentWidth, currentY + 1);
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Dokumen ini digenerasi secara komputasional oleh Sistem Simulasi Fisika Erupsi Gunung Anak Krakatau v2.1.', margin, currentY);
  doc.text('Disahkan secara elektronik untuk keperluan simulasi, latihan kesiapsiagaan (table-top exercise), dan riset akademis.', margin, currentY + 3.5);

  const signX = pageWidth - margin - 48;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Analis Penanggung Jawab,', signX, currentY);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(71, 85, 105);
  doc.text('(Tanda Tangan Terverifikasi)', signX, currentY + 4);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(investigatorName, signX, currentY + 8);

  // Footer on Page 2
  renderPageFooter(doc, 2, 2, reportRefId);

  return doc;
}

/**
 * Helper untuk merender footer halaman formal
 */
function renderPageFooter(doc: jsPDF, pageNum: number, totalPages: number, refId: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Ref ID: ${refId} • PVMBG / BMKG Reference Data • Selat Sunda Monitoring`, margin, pageHeight - 6.5);
  doc.text(`Halaman ${pageNum} dari ${totalPages}`, pageWidth - margin, pageHeight - 6.5, { align: 'right' });
}

/**
 * Mengubah derajat ke nama mata angin Bahasa Indonesia
 */
function getCardinalIndo(deg: number): string {
  const directions = [
    'Utara',
    'Utara-Timur Laut',
    'Timur Laut',
    'Timur-Timur Laut',
    'Timur',
    'Timur-Tenggara',
    'Tenggara',
    'Selatan-Tenggara',
    'Selatan',
    'Selatan-Barat Daya',
    'Barat Daya',
    'Barat-Barat Daya',
    'Barat',
    'Barat-Barat Laut',
    'Barat Laut',
    'Utara-Barat Laut',
  ];
  const idx = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
  return directions[idx];
}

/**
 * Mengunduh dokumen PDF secara langsung di peramban
 */
export function downloadSimulationPdf(options: PdfReportOptions): void {
  const doc = generateSimulationPdfDoc(options);
  const safeName = options.fileName || `SimKratoa_Laporan_Erupsi_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(safeName);
}
