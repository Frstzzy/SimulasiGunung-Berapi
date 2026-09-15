/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Map,
  Compass,
  Wind,
  Layers,
  Globe,
  Radio,
  Cpu,
  Database,
  CheckCircle2,
  ExternalLink,
  Code,
  ArrowRight,
  Shield,
  Zap,
  ChevronRight,
  Server,
  CloudRain
} from 'lucide-react';

interface RealWorldMapRoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RealWorldMapRoadmapModal: React.FC<RealWorldMapRoadmapModalProps> = ({ isOpen, onClose }) => {
  const [activeStep, setActiveStep] = useState<number>(1);

  if (!isOpen) return null;

  const steps = [
    {
      id: 1,
      title: '1. Basemap Geospasial & Sistem Proyeksi Koordinat',
      badge: 'GIS & Tile Server',
      desc: 'Menggantikan canvas buatan manual dengan engine peta geospasial bereferensi koordinat bumi nyata (WGS 84 / EPSG:4326).',
      details: [
        {
          label: 'Library Engine Peta',
          value: 'MapLibre GL JS, Leaflet, atau Google Maps Platform JS API',
          note: 'Mendukung rendering vector tiles 60 FPS, rotasi azimuth, pitch 3D, dan interaktivitas pan/zoom tak terbatas.'
        },
        {
          label: 'Layer Citra Satelit Nyata',
          value: 'Copernicus Sentinel-2, Landsat-8/9, atau Google Maps Satellite',
          note: 'Menampilkan citra riil gugusan Pulau Kaldera Krakatau (Rakata, Sertung, Panjang) dan pesisir Selat Sunda.'
        },
        {
          label: 'Koordinat Episentrum Riil',
          value: 'Lintang: -6.1021° LS, Bujur: 105.4230° BT (Kawah Aktif Anak Krakatau)',
          note: 'Semua jarak komputasi dihitung menggunakan rumus Haversine / Geodesic WGS-84.'
        }
      ],
      codeSnippet: `// Inisialisasi Map nyata berbasis Web Mercator
const map = new maplibregl.Map({
  container: 'map-container',
  style: 'https://api.maptiler.com/maps/hybrid/style.json?key=YOUR_KEY',
  center: [105.4230, -6.1021], // Koordinat G. Anak Krakatau
  zoom: 11,
  pitch: 45,
});`
    },
    {
      id: 2,
      title: '2. Data Elevasi & Batimetri Nyata (DEMNAS & BATNAS)',
      badge: 'Terrain & Bathymetry',
      desc: 'Mengintegrasikan data ketinggian daratan dan kedalaman laut Selat Sunda beresolusi tinggi.',
      details: [
        {
          label: 'Data Topografi Darat',
          value: 'DEMNAS (Badan Informasi Geospasial / BIG) resolusi 0.27-detik (~8 meter)',
          note: 'Model morfologi presisi dinding kaldera Rakata (813m), kaldera runtuhan 2018, dan perbukitan Rajabasa.'
        },
        {
          label: 'Data Batimetri Dasar Laut',
          value: 'BATNAS BIG (kedalaman laut Selat Sunda hingga 180 meter)',
          note: 'Krusial untuk memprediksi propagasi gelombang tsunami vulkanik dan zona penumpukan endapan piroklastik.'
        },
        {
          label: 'Format Data',
          value: 'GeoTIFF / Cloud Optimized GeoTIFF (COG) atau Mapbox RGB Terrain Tiles',
          note: 'Dapat diakses real-time oleh shader WebGL/Three.js untuk displacement peta 3D nyata.'
        }
      ],
      codeSnippet: `// Menambahkan Mesh Terain 3D Nyata di Selat Sunda
map.addSource('sunda-dem', {
  type: 'raster-dem',
  url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
  tileSize: 512,
  maxzoom: 14
});
map.setTerrain({ source: 'sunda-dem', exaggeration: 1.5 });`
    },
    {
      id: 3,
      title: '3. Integrasi Data Cuaca & Angin Real-Time (Live Feed)',
      badge: 'Live Atmospheric API',
      desc: 'Menghubungkan aplikasi ke feed cuaca satelit & radiosonde otomatis untuk mengetahui kecepatan dan arah angin saat ini.',
      details: [
        {
          label: 'Sumber Data BMKG',
          value: 'Open Data Cuaca Maritim BMKG & Radar Cuaca Cengkareng / Lampung',
          note: 'Data kecepatan angin permukaan laut Selat Sunda, kelembapan, suhu, dan tekanan udara terkini.'
        },
        {
          label: 'Profil Angin Lapisan Atas (Upper-Air)',
          value: 'NOAA Global Forecast System (GFS) / ECMWF ERA5 via Open-Meteo API',
          note: 'Penting karena arah angin pada ketinggian 1.000m, 3.000m, dan 10.000m (FL330) sering kali berbeda drastis (wind shear).'
        },
        {
          label: 'Pembaruan Otomatis',
          value: 'Polling setiap 15-30 menit atau webhook server-side proxy',
          note: 'Memastikan simulasi sebaran abu otomatis mengikuti kondisi riil saat pengguna membuka aplikasi.'
        }
      ],
      codeSnippet: `// Mengambil profil angin vertikal Selat Sunda dari API
async function fetchRealWindProfile() {
  const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-6.10&longitude=105.42&hourly=windspeed_10m,winddirection_10m,windspeed_850hPa,winddirection_850hPa');
  const data = await res.json();
  return {
    surfaceWind: { speed: data.hourly.windspeed_10m[0], dir: data.hourly.winddirection_10m[0] },
    upperWind: { speed: data.hourly.windspeed_850hPa[0], dir: data.hourly.winddirection_850hPa[0] }
  };
}`
    },
    {
      id: 4,
      title: '4. Pemodelan Dispersi Abu Vulkanik Ilmiah (HYSPLIT / PUFF)',
      badge: 'Atmospheric Physics Engine',
      desc: 'Meningkatkan algoritma partikel menjadi model adveksi-difusi turbulen berbasis partikel Lagrange standar dunia.',
      details: [
        {
          label: 'Standar Industri',
          value: 'Model HYSPLIT (NOAA ARL), FALL3D (Barcelona Supercomputing Center), atau Ash3D (USGS)',
          note: 'Standar resmi yang dipakai oleh VAAC (Volcanic Ash Advisory Center) Darwin untuk Selat Sunda.'
        },
        {
          label: 'Distribusi Ukuran Partikel (Grain Size)',
          value: 'Spektrum butir abu: Lapili (>2 mm), Abu Kasar (64 µm - 2 mm), Abu Halus (<64 µm)',
          note: 'Laju pengendapan (settling velocity) dihitung berdasarkan Hukum Stokes dan koefisien turbulensi atmosfer.'
        },
        {
          label: 'Keluaran Prediksi',
          value: 'Peta Kontur Isopach Tebal Abu (mm/jam) dan Konsentrasi Massa Udara (mg/m³)',
          note: 'Dapat langsung disinkronkan dengan ambang batas keselamatan mesin pesawat terbang ICAO (2.0 mg/m³).'
        }
      ],
      codeSnippet: `// Pipeline komputasi Adveksi-Difusi Partikel Abu Vulkanik
class RealWorldAshSolver {
  step(particle, dt, windField) {
    // 1. Adveksi oleh medan angin 3D (u, v, w)
    const [u, v, w] = windField.sample(particle.lat, particle.lon, particle.alt);
    // 2. Kecepatan jatuh gravitasi terminal (Stokes / Ganser)
    const vSettling = this.computeSettlingVelocity(particle.diameter, particle.density, particle.alt);
    
    particle.lon += (u * dt) / (111320 * Math.cos(particle.lat * Math.PI / 180));
    particle.lat += (v * dt) / 110540;
    particle.alt += (w - vSettling) * dt;
  }
}`
    },
    {
      id: 5,
      title: '5. Layer Infrastruktur & Kependudukan Nyata (GeoJSON)',
      badge: 'Risk & Impact Assessment',
      desc: 'Menempatkan garis batas fasilitas vital dan konsentrasi masyarakat nyata di pesisir Banten dan Lampung.',
      details: [
        {
          label: 'Jalur Pelayaran ALKI I',
          value: 'Data resmi Pusat Hidro-Oseanografi TNI AL (Pushidrosal)',
          note: 'Memprediksi kapal kargo, tanker minyak, dan kapal feri rute Bakauheni - Merak yang berada dalam zona bahaya.'
        },
        {
          label: 'Koridor Penerbangan Udara',
          value: 'Rute AirNav Indonesia (W45, W18, rute internasional Soekarno-Hatta CGK)',
          note: 'Memberikan peringatan otomatis ketinggian kolom erupsi terhadap Flight Level (FL100 - FL350).'
        },
        {
          label: 'Permukiman & Kawasan Strategis',
          value: 'Kecamatan Rajabasa, Kalianda, Anyer, Carita, dan Kawasan Industri Cilegon',
          note: 'Menghitung estimasi waktu tiba abu (Estimated Time of Arrival - ETA) dan populasi terdampak.'
        }
      ],
      codeSnippet: `// Menambahkan GeoJSON Jalur Pelayaran & Wilayah Rawan
map.addSource('shipping-lanes', {
  type: 'geojson',
  data: '/data/alki-1-sunda-strait.geojson'
});
map.addLayer({
  id: 'alki-lane',
  type: 'line',
  source: 'shipping-lanes',
  paint: { 'line-color': '#ffffff', 'line-dasharray': [3, 2] }
});`
    },
    {
      id: 6,
      title: '6. Integrasi Telemetri MAGMA Indonesia (PVMBG) & VONA',
      badge: 'Volcanic Alert Feed',
      desc: 'Menghubungkan sistem dengan laporan resmi Pos Pengamatan Gunung Api Pasauran (Banten) dan Hargopeni (Lampung).',
      details: [
        {
          label: 'Tingkat Aktivitas (Level)',
          value: 'Level I (Normal), Level II (Waspada), Level III (Siaga), Level IV (Awas)',
          note: 'Otomatis menyesuaikan radius steril KRB (1 km, 3 km, atau 5 km).'
        },
        {
          label: 'VONA (Volcano Observatory Notice for Aviation)',
          value: 'Kode Warna: GREEN, YELLOW, ORANGE, RED',
          note: 'Laporan resmi ketinggian kolom abu aktual yang teramati secara visual dan instrumen seismik.'
        },
        {
          label: 'Data Seismisitas & Tiltmeter',
          value: 'Jumlah gempa letusan, hembusan, vulkanik dangkal/dalam per hari',
          note: 'Memberikan indikasi probabilitas lontaran bom lava sebelum erupsi terjadi.'
        }
      ],
      codeSnippet: `// Mengambil status rilis resmi MAGMA Indonesia
async function fetchKrakatauStatus() {
  const res = await fetch('https://magma.esdm.go.id/api/v1/press-release/krakatau');
  const alertData = await res.json();
  return {
    statusLevel: alertData.level, // 'SIAGA (LEVEL III)'
    recommendationRadiusKm: alertData.radius_km, // 5.0 km
    vonaCode: alertData.vona_color // 'ORANGE'
  };
}`
    }
  ];

  const current = steps.find((s) => s.id === activeStep) || steps[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-800/80 bg-zinc-900/60 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center font-bold shadow-md shadow-white/10 flex-shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  Langkah Transformasi ke Peta Nyata Dunia (GIS Live Predictive)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  Roadmap Teknis
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Panduan komprehensif merubah kanvas 2D menjadi sistem pemantau dan prediksi kondisi riil Selat Sunda
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white text-xs font-semibold transition-all"
          >
            Tutup (ESC)
          </button>
        </div>

        {/* Modal Body: Steps Navigation + Step Details */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left: Step List */}
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-zinc-800 bg-zinc-950/80 p-3 space-y-1.5 overflow-y-auto">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider px-2 block mb-2">
              6 Pilar Utama Integrasi:
            </span>
            {steps.map((step) => {
              const isSelected = step.id === activeStep;
              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all border flex items-start justify-between gap-2 text-xs ${
                    isSelected
                      ? 'bg-white text-black font-semibold border-white shadow-sm'
                      : 'bg-zinc-900/40 text-zinc-300 border-zinc-800/80 hover:bg-zinc-900 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className={`text-[10px] font-mono block ${isSelected ? 'text-zinc-600' : 'text-zinc-400'}`}>
                      Tahap {step.id}
                    </span>
                    <span className="font-medium line-clamp-1">{step.title.replace(/^\d+\.\s*/, '')}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 mt-1 flex-shrink-0 ${isSelected ? 'text-black' : 'text-zinc-500'}`} />
                </button>
              );
            })}

            {/* Quick summary box */}
            <div className="mt-4 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 text-[11px] text-zinc-400 space-y-2">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                Kesiapan Modul Saat Ini:
              </span>
              <p className="leading-relaxed">
                Aplikasi ini telah memiliki algoritma fisika <strong>RK4</strong> dan formulasi <strong>Gaussian Plume</strong> yang siap dipasangkan langsung dengan koordinat dan API data di samping.
              </p>
            </div>
          </div>

          {/* Right: Step Detailed Content */}
          <div className="flex-1 p-5 md:p-6 overflow-y-auto space-y-6 bg-black">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white text-black">
                  {current.badge}
                </span>
                <span className="text-xs font-mono text-zinc-400">Langkah {current.id} dari {steps.length}</span>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {current.title}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-300 mt-1 leading-relaxed">
                {current.desc}
              </p>
            </div>

            {/* Detail Checklist Cards */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Spesifikasi & Komponen yang Diperlukan:
              </h4>
              <div className="grid grid-cols-1 gap-2.5">
                {current.details.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-all space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        {item.label}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-400">{item.value}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 pl-3 leading-relaxed">
                      {item.note}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Code / Architecture Snippet */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-400 flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-white" />
                  Contoh Potongan Kode Implementasi
                </span>
                <span className="text-[10px] font-mono text-zinc-500">TypeScript / Map Engine</span>
              </div>
              <pre className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-300 overflow-x-auto leading-relaxed selection:bg-zinc-800">
                {current.codeSnippet}
              </pre>
            </div>

            {/* Next / Prev Navigation */}
            <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
              <button
                disabled={activeStep === 1}
                onClick={() => setActiveStep((s) => Math.max(1, s - 1))}
                className="px-3.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-700 disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold transition-all"
              >
                ← Tahap Sebelumnya
              </button>
              <button
                disabled={activeStep === steps.length}
                onClick={() => setActiveStep((s) => Math.min(steps.length, s + 1))}
                className="px-4 py-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <span>Tahap Berikutnya</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-white" />
            <span>Target Arsitektur: <strong>Full-Stack Real-Time GIS (Vite + MapLibre/Leaflet + Open-Meteo & BMKG Feed)</strong></span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-all"
          >
            Mengerti, Kembali ke Aplikasi
          </button>
        </div>

      </div>
    </div>
  );
};
