/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  Wind,
  CloudRain,
  Flame,
  Layers,
  Clock,
  Compass,
  AlertTriangle,
  ShieldAlert,
  Activity,
  CheckCircle2,
  FileText,
  Plane,
  Ship,
  Sparkles,
  Info
} from 'lucide-react';
import { PlumeParams, BallisticParams } from '../types';

interface AshDispersalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  plume?: PlumeParams;
  ballistic?: BallisticParams;
}

const defaultPlume: PlumeParams = {
  columnHeight: 3000,
  emissionRate: 5,
  windSpeed: 8,
  windDirection: 225,
  particleSize: 'medium',
  stabilityClass: 'D',
};

const defaultBallistic: BallisticParams = {
  initialVelocity: 180,
  launchAngle: 65,
  launchAzimuth: 45,
  rockDiameter: 0.35,
  rockDensity: 2500,
  dragCoefficient: 0.47,
  enableAirDrag: true,
  ventElevation: 157,
  gravity: 9.81,
};

export const AshDispersalDetailModal: React.FC<AshDispersalDetailModalProps> = ({
  isOpen,
  onClose,
  plume = defaultPlume,
  ballistic = defaultBallistic,
}) => {
  const [activeTab, setActiveTab] = useState<'phases' | 'fractions' | 'physics' | 'mitigation'>('phases');

  if (!isOpen) return null;

  const currentPlume = plume || defaultPlume;
  const currentBallistic = ballistic || defaultBallistic;

  // Key calculations with defensive fallbacks
  const windSpeed = currentPlume.windSpeed ?? 8;
  const columnHeight = currentPlume.columnHeight ?? 3000;
  const windDirection = currentPlume.windDirection ?? 225;

  const windSpeedKmh = windSpeed * 3.6;
  const umbrellaRadiusKm = Math.min(12, Math.max(0.8, (columnHeight / 1000) * 0.52));
  const maxPlumeReachKm = Math.min(85, Math.max(12, (columnHeight / 1000) * 9.5 + windSpeed * 2.2));
  const driftAngleDeg = (windDirection + 180) % 360;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-auto text-zinc-200 font-sans">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white text-black font-bold">
              <CloudRain className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base sm:text-lg">
                  Detail Radius & Dinamika Sebaran Abu Vulkanik Pasca-Erupsi
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                  Carey-Sparks & Gauss Plume
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Model Komputasi Atmosfer, Fraksinasi Partikel Tephra, dan Garis Waktu Pasca Letusan Anak Krakatau
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/50 px-4 sm:px-6 gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'phases', label: '1. Fase Pasca-Erupsi (Timeline)', icon: Clock },
            { id: 'fractions', label: '2. Fraksinasi Partikel Abu', icon: Layers },
            { id: 'physics', label: '3. Rumus & Model Fisika', icon: Activity },
            { id: 'mitigation', label: '4. Mitigasi & Keselamatan', icon: ShieldAlert },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all whitespace-nowrap ${
                  isSelected
                    ? 'border-white text-white font-bold bg-zinc-900'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto space-y-6 text-xs sm:text-sm">
          {/* TAB 1: FASE PASCA ERUPSI */}
          {activeTab === 'phases' && (
            <div className="space-y-5">
              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-start gap-3">
                <Info className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                <div className="text-xs text-zinc-300 leading-relaxed">
                  Setelah kawah meledak, abu vulkanik terlepas dan mengalami <strong>4 fase evolusi dinamis</strong> di atmosfer, mulai dari pelepasan bertekanan tinggi di kawah hingga transportasi ratusan kilometer melintasi perairan Selat Sunda.
                </div>
              </div>

              {/* Timeline Cards */}
              <div className="space-y-3 font-sans">
                {/* Stage 1 */}
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-white text-black font-bold text-xs flex items-center justify-center font-mono">
                        1
                      </span>
                      <h4 className="font-bold text-white text-sm">
                        Fase Semburan Gas & Balistik (T + 0 hingga 15 Detik)
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      Gas-Thrust Stage
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Dekompresi magma menghasilkan semburan supersonik gas $H_2O$, $CO_2$, $SO_2$, bersama bom vulkanik dan fragmen batu apung berkecepatan <strong>{ballistic.initialVelocity} m/s</strong>. Material padat terberat langsung terlontar secara balistik ke radius <strong>{(ballistic.rockDiameter * 100).toFixed(0)} cm – 3.2 km</strong> di sekitar kawah kaldera.
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-[11px] font-mono pt-1 text-zinc-400">
                    <div>Radius Bahaya: <strong className="text-white">0 – 3.2 km</strong></div>
                    <div>Kecepatan Vent: <strong className="text-white">{ballistic.initialVelocity} m/s</strong></div>
                    <div>Produk: <strong className="text-white">Bom Pijar & Balistik</strong></div>
                  </div>
                </div>

                {/* Stage 2 */}
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-white text-black font-bold text-xs flex items-center justify-center font-mono">
                        2
                      </span>
                      <h4 className="font-bold text-white text-sm">
                        Fase Penaikan Konvektif Termal (T + 15 Detik hingga 10 Menit)
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      Convective Plume Stage
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Udara ambien dingin masuk ke dalam kolom panas dan mengalami ekspansi termal hebat. Kolom abu membubung vertikal dengan daya apung termal (<em>thermal buoyancy</em>) menuju ketinggian <strong>{plume.columnHeight.toLocaleString()} mdpl</strong> (FL{Math.round((plume.columnHeight + 157) * 0.0328)}).
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-[11px] font-mono pt-1 text-zinc-400">
                    <div>Puncak Kolom: <strong className="text-white">{plume.columnHeight.toLocaleString()} m</strong></div>
                    <div>Kecepatan Naik: <strong className="text-white">15 – 45 m/s</strong></div>
                    <div>Hujan Awal: <strong className="text-white">Lapili & Skoria Kaldera</strong></div>
                  </div>
                </div>

                {/* Stage 3 */}
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-white text-black font-bold text-xs flex items-center justify-center font-mono">
                        3
                      </span>
                      <h4 className="font-bold text-white text-sm">
                        Fase Tudung Payung Asap & NBL (T + 10 hingga 30 Menit)
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      Umbrella Cloud Stage
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Pada lapisan <em>Neutral Buoyancy Level</em> (NBL setinggi ~{(columnHeight * 0.75).toFixed(0)} m), densitas gas abu sama dengan densitas atmosfer sekitarnya. Abu berhenti naik dan mengalir radial ke segala arah membentuk tudung jamur raksasa dengan radius payung <strong>{umbrellaRadiusKm.toFixed(2)} km</strong> di atas perairan Selat Sunda.
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-[11px] font-mono pt-1 text-zinc-400">
                    <div>Radius Payung: <strong className="text-white">{umbrellaRadiusKm.toFixed(2)} km</strong></div>
                    <div>Tinggi NBL: <strong className="text-white">~{(columnHeight * 0.75).toFixed(0)} m</strong></div>
                    <div>Pola Aliran: <strong className="text-white">Radial Simetris 360°</strong></div>
                  </div>
                </div>

                {/* Stage 4 */}
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-white text-black font-bold text-xs flex items-center justify-center font-mono">
                        4
                      </span>
                      <h4 className="font-bold text-white text-sm">
                        Fase Adveksi Angin & Dispersi Gauss (T + 30 Menit hingga Berhari-hari)
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      Advection & Deposition Stage
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Angin troposfer Selat Sunda ({windSpeed} m/s = {windSpeedKmh.toFixed(1)} km/j arah {windDirection}°) menghanyutkan awan abu ke arah <strong>{driftAngleDeg}°</strong>. Abu terlepas dan berdifusi lateral membentuk konus elips sejauh <strong>{maxPlumeReachKm.toFixed(1)} km</strong>, mencemari jalur pelayaran ALKI I, Pulau Sebesi, dan pesisir Banten/Lampung.
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-[11px] font-mono pt-1 text-zinc-400">
                    <div>Jangkauan Abu: <strong className="text-white">0 – {maxPlumeReachKm.toFixed(1)} km</strong></div>
                    <div>Arah Hanyutan: <strong className="text-white">{driftAngleDeg}° ({windSpeedKmh.toFixed(1)} km/j)</strong></div>
                    <div>Dampak: <strong className="text-white">Pesisir & Udara ALKI I</strong></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FRAKSINASI PARTIKEL ABU */}
          {activeTab === 'fractions' && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-300">
                Abu vulkanik bukanlah abu kayu sisa pembakaran, melainkan <strong>serpihan kaca silika ($SiO_2$), kristal mineral tajam, dan fragmen batuan beku</strong>. Kecepatan jatuh partikel ditentukan oleh Hukum Stokes berdasarkan ukuran butirnya:
              </p>

              <div className="overflow-x-auto rounded-xl border border-zinc-800">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-zinc-900 text-zinc-200 font-mono text-[11px] border-b border-zinc-800">
                    <tr>
                      <th className="p-3">Fraksi Partikel</th>
                      <th className="p-3">Ukuran Butir</th>
                      <th className="p-3">Kecepatan Jatuh (vₛ)</th>
                      <th className="p-3">Radius Sebaran</th>
                      <th className="p-3">Waktu Mengendap</th>
                      <th className="p-3">Bahaya Utama</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850 text-zinc-300 font-mono text-[11px]">
                    <tr className="bg-zinc-950/60 hover:bg-zinc-900/50">
                      <td className="p-3 font-sans font-bold text-amber-300">
                        Bom & Blok Vulkanik
                      </td>
                      <td className="p-3">&gt; 64 mm</td>
                      <td className="p-3">&gt; 30 m/s</td>
                      <td className="p-3">0 – 3.5 km</td>
                      <td className="p-3">10 – 45 detik</td>
                      <td className="p-3 font-sans text-zinc-400">Benturan destruktif, luka bakar, gelombang tsunami kawah</td>
                    </tr>
                    <tr className="bg-zinc-950/60 hover:bg-zinc-900/50">
                      <td className="p-3 font-sans font-bold text-amber-200">
                        Lapili & Batu Apung
                      </td>
                      <td className="p-3">2 – 64 mm</td>
                      <td className="p-3">5 – 15 m/s</td>
                      <td className="p-3">0 – 8 km</td>
                      <td className="p-3">1 – 15 menit</td>
                      <td className="p-3 font-sans text-zinc-400">Hujan kerikil panas, atap jebol, perahu nelayan rusak</td>
                    </tr>
                    <tr className="bg-zinc-950/60 hover:bg-zinc-900/50">
                      <td className="p-3 font-sans font-bold text-white">
                        Abu Kasar (Coarse Ash)
                      </td>
                      <td className="p-3">0.063 – 2 mm</td>
                      <td className="p-3">0.2 – 3 m/s</td>
                      <td className="p-3">5 – 30 km</td>
                      <td className="p-3">15 – 90 menit</td>
                      <td className="p-3 font-sans text-zinc-400">Menutup P. Sebesi & Selat Sunda, mesin kapal macet, air tercemar</td>
                    </tr>
                    <tr className="bg-zinc-950/60 hover:bg-zinc-900/50">
                      <td className="p-3 font-sans font-bold text-zinc-200">
                        Abu Halus (Fine Ash)
                      </td>
                      <td className="p-3">&lt; 0.063 mm (PM10)</td>
                      <td className="p-3">0.005 – 0.1 m/s</td>
                      <td className="p-3">20 – 120+ km</td>
                      <td className="p-3">2 – 24 jam</td>
                      <td className="p-3 font-sans text-zinc-400">ISPA akut, silikosis, jarak pandang &lt; 50m, turbin pesawat mati</td>
                    </tr>
                    <tr className="bg-zinc-950/60 hover:bg-zinc-900/50">
                      <td className="p-3 font-sans font-bold text-zinc-400">
                        Aerosol SO₂ & Asam
                      </td>
                      <td className="p-3">&lt; 2.5 μm (PM2.5)</td>
                      <td className="p-3">&lt; 0.001 m/s</td>
                      <td className="p-3">100 – 1000+ km</td>
                      <td className="p-3">Hari – Minggu</td>
                      <td className="p-3 font-sans text-zinc-400">Hujan asam korosif, penipisan ozon lokal, kabut vulkanik regional</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Deposit Isopach Info */}
              <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2">
                <h5 className="font-bold text-white text-xs flex items-center gap-1.5 font-mono">
                  <span>📐</span> Peta Ketebalan Endapan Abu (Isopach Contours)
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 font-mono text-[11px]">
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                    <span className="text-white font-bold block mb-1">Zona &gt; 10 cm (Kritis)</span>
                    <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">
                      Kaldera Anak Krakatau, P. Sertung, P. Panjang. Beban atap mencapai &gt; 100 kg/m² saat basah (atap roboh).
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                    <span className="text-zinc-300 font-bold block mb-1">Zona 1 – 10 cm (Bahaya)</span>
                    <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">
                      Pulau Sebesi & ALKI I. Gangguan kelistrikan akibat hubungan singkat, air minum terkontaminasi asam.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                    <span className="text-zinc-400 font-bold block mb-1">Zona &lt; 1 cm (Waspada)</span>
                    <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">
                      Pesisir Banten & Lampung. Debu melayang di udara, iritasi mata, gangguan lalu lintas jalan raya & penerbangan.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RUMUS & MODEL FISIKA */}
          {activeTab === 'physics' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                <h4 className="font-bold text-white font-sans text-sm flex items-center gap-2">
                  <span>🔬</span> 1. Hukum Stokes untuk Kecepatan Pengendapan Partikel
                </h4>
                <p className="text-zinc-300 font-sans leading-relaxed text-xs">
                  Kecepatan terminal jatuh partikel abu di udara diam dihitung berdasarkan kesetimbangan gaya gravitasi dan hambatan viskos udara:
                </p>
                <div className="p-3 bg-black rounded-lg border border-zinc-800 text-amber-300 font-bold text-center">
                  {"v_s = (2 / 9) · [ (ρ_p - ρ_udara) · g · r² ] / μ_udara"}
                </div>
                <div className="text-[11px] text-zinc-400 space-y-1">
                  <div>• ρ_p: Densitas partikel abu vulkanik (≈ 2.200 kg/m³)</div>
                  <div>• ρ_udara: Densitas udara permukaan (≈ 1.225 kg/m³)</div>
                  <div>• r: Radius butir partikel abu (meter)</div>
                  <div>• μ_udara: Viskositas dinamik udara (1.81 × 10⁻⁵ Pa·s)</div>
                  <div>• g: Percepatan gravitasi bumi (9.81 m/s²)</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                <h4 className="font-bold text-white font-sans text-sm flex items-center gap-2">
                  <span>☁️</span> 2. Model Payung Asap Vulkanik (Carey & Sparks 1986)
                </h4>
                <p className="text-zinc-300 font-sans leading-relaxed text-xs">
                  Ekspansi radial tudung payung pada level kesetimbangan daya apung (<em>Neutral Buoyancy Level</em>) mengikuti fungsi laju emisi massa magma dan waktu:
                </p>
                <div className="p-3 bg-black rounded-lg border border-zinc-800 text-white font-bold text-center">
                  {"R_u(t) = [ (3 · λ · Q · t) / (2π) ]^(1/3) ≈ 0.52 × H_kolom"}
                </div>
                <p className="text-[11px] text-zinc-400 font-sans">
                  Untuk kolom erupsi setinggi {columnHeight} m, radius payung kawah aktif menghasilkan jangkauan radial sebesar <strong>{umbrellaRadiusKm.toFixed(2)} km</strong>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                <h4 className="font-bold text-white font-sans text-sm flex items-center gap-2">
                  <span>💨</span> 3. Model Dispersi Gauss & Adveksi Atmosfer Pasquill-Gifford
                </h4>
                <p className="text-zinc-300 font-sans leading-relaxed text-xs">
                  Konsentrasi massa abu C(x, y, z) di bawah angin (downwind distance x, crosswind y) dihitung dengan:
                </p>
                <div className="p-3 bg-black rounded-lg border border-zinc-800 text-zinc-200 font-bold text-center">
                  {"C(x, y, 0) = [ Q / (π · u · σ_y(x) · σ_z(x)) ] · exp(-y² / (2σ_y²)) · exp(-H_eff² / (2σ_z²))"}
                </div>
                <div className="text-[11px] text-zinc-400 space-y-1">
                  <div>• σ_y(x) = 68 · x^0.894 (Koefisien dispersi lateral pada stabilitas kelas D Selat Sunda)</div>
                  <div>• σ_z(x) = 33.2 · x^0.725 (Koefisien dispersi vertikal)</div>
                  <div>• u: Kecepatan angin efektif horizontal ({windSpeed} m/s)</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MITIGASI & PROTOKOL */}
          {activeTab === 'mitigation' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Protocol 1 */}
                <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-white" />
                    <span>Perlindungan Pernapasan & Mata</span>
                  </div>
                  <ul className="text-xs text-zinc-300 space-y-1 list-disc list-inside">
                    <li>Gunakan masker standar <strong>N95 / KF94</strong>. Masker kain biasa tidak mampu menyaring debu kristalin &lt; PM10.</li>
                    <li>Gunakan kacamata pelindung (<em>safety goggles</em>). Lepas lensa kontak untuk mencegah goresan kornea.</li>
                    <li>Segera cuci mata dengan air bersih mengalir jika terkena abu.</li>
                  </ul>
                </div>

                {/* Protocol 2 */}
                <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <Ship className="w-4 h-4 text-white" />
                    <span>Protokol Pelayaran ALKI I</span>
                  </div>
                  <ul className="text-xs text-zinc-300 space-y-1 list-disc list-inside">
                    <li>Nakhoda kapal tanker & kargo wajib menyalakan radar navigasi dan lampu kabut penuh jika jarak pandang &lt; 500 m.</li>
                    <li>Tutup rapat katup ventilasi udara kamar mesin untuk mencegah abu menyumbat saringan oli dan pendingin piston.</li>
                    <li>Jaga jarak aman minimal <strong>5.0 km (Zona Steril KRB III)</strong> dari kawah Anak Krakatau.</li>
                  </ul>
                </div>

                {/* Protocol 3 */}
                <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <Plane className="w-4 h-4 text-white" />
                    <span>Peringatan Penerbangan (VONA)</span>
                  </div>
                  <ul className="text-xs text-zinc-300 space-y-1 list-disc list-inside">
                    <li>Status VONA: <strong>{columnHeight >= 5000 ? 'RED (Bahaya Kritis)' : columnHeight >= 2000 ? 'ORANGE' : 'YELLOW'}</strong>.</li>
                    <li>Partikel abu silika meleleh pada suhu &gt; 1100°C di dalam ruang bakar turbin jet, membentuk lapisan kaca yang mematikan mesin (<em>engine flameout</em>).</li>
                    <li>Rute penerbangan W45 di Selat Sunda dialihkan jika kolom menembus Flight Level 200.</li>
                  </ul>
                </div>

                {/* Protocol 4 */}
                <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800 space-y-2">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-white" />
                    <span>Evakuasi Pulau Sebesi & Pesisir</span>
                  </div>
                  <ul className="text-xs text-zinc-300 space-y-1 list-disc list-inside">
                    <li>Pulau Sebesi berjarak 18.5 km, merupakan permukiman terdekat. Siagakan kapal evakuasi ASDP di dermaga Tejang.</li>
                    <li>Tutup rapat tandon air minum masyarakat agar tidak teracuni ion fluorida dan sulfat terlarut dari abu.</li>
                    <li>Bersihkan atap rumah secara bertahap saat abu mulai menumpuk &gt; 5 cm untuk mencegah keruntuhan struktur.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-900/90 border-t border-zinc-800 flex items-center justify-between">
          <div className="text-[11px] font-mono text-zinc-400">
            Sumber Data: Pusat Vulkanologi dan Mitigasi Bencana Geologi (PVMBG) & VAAC Darwin
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-colors shadow-sm"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
