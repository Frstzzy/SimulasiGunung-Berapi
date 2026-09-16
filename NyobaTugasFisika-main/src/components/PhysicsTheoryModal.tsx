/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Code, Layers, Compass, Wind, Flame, CheckCircle2, Copy, Check, Cpu } from 'lucide-react';

export const PhysicsTheoryModal: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'architecture' | 'ballistics' | 'plume' | 'krakatau' | 'code'>('architecture');
  const [copiedCode, setCopiedCode] = useState(false);

  const sampleCode = `// Integrasi Numerik Runge-Kutta 4 (RK4) untuk Proyektil Batuan Vulkanik
export function stepRK4(
  x: number, y: number, vx: number, vy: number, dt: number,
  mass: number, area: number, Cd: number, g: number
) {
  function getAcc(yPos: number, vX: number, vY: number) {
    const speed = Math.hypot(vX, vY);
    // Densitas udara menurun seiring ketinggian (Barometric Formula)
    const rhoAir = 1.225 * Math.exp(-yPos / 8500);
    const dragForce = 0.5 * rhoAir * Cd * area * (speed * speed);
    const dragDecel = dragForce / mass;

    return {
      ax: -dragDecel * (vX / speed),
      ay: -g - dragDecel * (vY / speed),
    };
  }

  // 4 Tahap Evaluasi RK4 (k1, k2, k3, k4)
  const a1 = getAcc(y, vx, vy);
  const a2 = getAcc(y + 0.5 * dt * vy, vx + 0.5 * dt * a1.ax, vy + 0.5 * dt * a1.ay);
  const a3 = getAcc(y + 0.5 * dt * (vy + 0.5 * dt * a2.ay), vx + 0.5 * dt * a2.ax, vy + 0.5 * dt * a2.ay);
  const a4 = getAcc(y + dt * (vy + dt * a3.ay), vx + dt * a3.ax, vy + dt * a3.ay);

  return {
    nextX: x + (dt / 6) * (vx + 2 * (vx + 0.5 * dt * a1.ax) + 2 * (vx + 0.5 * dt * a2.ax) + (vx + dt * a3.ax)),
    nextY: y + (dt / 6) * (vy + 2 * (vy + 0.5 * dt * a1.ay) + 2 * (vy + 0.5 * dt * a2.ay) + (vy + dt * a3.ay)),
    nextVx: vx + (dt / 6) * (a1.ax + 2 * a2.ax + 2 * a3.ax + a4.ax),
    nextVy: vy + (dt / 6) * (a1.ay + 2 * a2.ay + 2 * a3.ay + a4.ay),
  };
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sampleCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="bg-black/95 backdrop-blur-xl border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl text-zinc-200">
      {/* Top Banner */}
      <div className="relative bg-zinc-950 p-6 md:p-8 border-b border-zinc-800">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-750 text-white text-xs font-semibold mb-3 tracking-wide">
            <Cpu className="w-3.5 h-3.5" />
            Panduan Rekayasa Perangkat Lunak & Fisika Komputasi
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Bagaimana Membangun Aplikasi Simulasi Erupsi Berbasis Fisika Komputasi
          </h2>
          <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
            Metodologi komputasi numerik gerak peluru non-linear, integrasi RK4, model dispersi atmosfer Gaussian Plume, dan parameter spesifik Gunung Anak Krakatau di Selat Sunda.
          </p>
        </div>

        {/* Sub-tabs ribbon */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'architecture', label: '1. Arsitektur Software', icon: Layers },
            { id: 'ballistics', label: '2. Fisika Balistik (Bom)', icon: Flame },
            { id: 'plume', label: '3. Dispersi Asap & Abu', icon: Wind },
            { id: 'krakatau', label: '4. Studi Kasus Selat Sunda', icon: Compass },
            { id: 'code', label: '5. Implementasi Kode', icon: Code },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeSection === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-white text-black border-white font-bold shadow-sm'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-850'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6 md:p-8 max-w-4xl space-y-6">
        {/* SECTION 1: ARCHITECTURE */}
        {activeSection === 'architecture' && (
          <div className="space-y-6 text-sm">
            <div>
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Layers className="w-5 h-5 text-white" />
                Pendekatan Software Engineering untuk Web App Simulasi Fisika
              </h3>
              <p className="text-zinc-300 leading-relaxed">
                Sebagai developer informatika, membangun aplikasi simulasi fisika di web memerlukan perancangan pipeline komputasi yang efisien agar animasi berjalan mulus di 60 FPS tanpa mengorbankan ketepatan hukum fisika.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 space-y-2">
                <div className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wide">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  Pemisahan Engine Matematika & Layer Rendering
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Modul fisika (<code className="text-white font-mono">ballistics.ts</code> & <code className="text-white font-mono">plume.ts</code>) dirancang sebagai fungsi murni (pure functions) yang tidak bergantung pada DOM. Hal ini memudahkan pengujian unit (unit testing) dan memungkinkan komputasi dialihkan ke <strong>Web Workers</strong> jika jumlah partikel abu ditingkatkan.
                </p>
              </div>

              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 space-y-2">
                <div className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wide">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  Game Loop & Integrasi Waktu Riil
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Menggunakan loop <code className="text-white font-mono">requestAnimationFrame</code> dengan perhitungan delta-time dinamis (<code className="text-white font-mono">dt = (now - lastTime) / 1000</code>). Untuk menghindari instabilitas numerik akibat lag frame browser, diterapkan <em>sub-stepping</em> numerik 4ms.
                </p>
              </div>

              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 space-y-2">
                <div className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wide">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  Dual-Canvas: Elevasi vs GIS Peta Selat Sunda
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Menyediakan dua perspektif komplementer: <strong>Cross-section 2D</strong> untuk meneliti vektor kinematika lontaran vertikal dan <strong>Peta Kartografi Selat Sunda</strong> untuk memantau sebaran abu ke pemukiman warga dan alur kapal ALKI I.
                </p>
              </div>

              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 space-y-2">
                <div className="font-bold text-white flex items-center gap-2 text-xs uppercase tracking-wide">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  Sintesis Audio Web Audio API
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Tanpa mengunduh aset audio eksternal besar, suara ledakan dan gemuruh magma disintesis secara algoritmik menggunakan <em>low-pass filtered noise</em> dan osilator sub-bass frekuensi rendah langsung di browser.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: BALLISTICS */}
        {activeSection === 'ballistics' && (
          <div className="space-y-6 text-sm">
            <div>
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Flame className="w-5 h-5 text-white" />
                Formulasi Fisika Gerak Peluru (Balistik Batuan Pijar)
              </h3>
              <p className="text-zinc-300 leading-relaxed">
                Dalam buku fisika dasar, gerak proyektil sering diasumsikan berada di ruang hampa (parabola Galileo). Namun pada letusan gunung api nyata seperti Anak Krakatau, mengabaikan hambatan udara adalah <strong>kesalahan fatal</strong> karena bom vulkanik terlempar dengan kecepatan tinggi (100–350 m/s).
              </p>
            </div>

            <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-800 space-y-3 font-mono text-xs text-zinc-300 shadow-inner">
              <div className="text-white font-bold font-sans text-sm">
                Persamaan Gaya Hambat Udara (Quadratic Aerodynamic Drag):
              </div>
              <div className="bg-zinc-900 p-3.5 rounded-xl border border-zinc-800 text-center text-white text-sm font-bold">
                Fd = 0.5 × ρ_udara(y) × Cd × A × v²
              </div>
              <div className="space-y-1.5 text-zinc-400 text-[11px]">
                <p>• <strong>ρ_udara(y)</strong> = Densitas atmosfer pada ketinggian y: ρ(y) = 1.225 · e^(-y / 8500) kg/m³</p>
                <p>• <strong>Cd</strong> = Koefisien drag (~0.65 – 0.85 untuk batuan vulkanik bersudut kasar)</p>
                <p>• <strong>A</strong> = Luas penampang batuan = π · (d / 2)²</p>
                <p>• <strong>v</strong> = Kelajuan sesaat batuan = √(vx² + vy²)</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-white text-sm">Persamaan Diferensial Gerak:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 text-white font-semibold">
                  m · ax = - Fd · (vx / v)
                </div>
                <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 text-white font-semibold">
                  m · ay = - m·g - Fd · (vy / v)
                </div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Karena persamaan di atas bersifat non-linear dan tidak memiliki solusi analitis tertutup sederhana, kita menggunakan <strong>Metode Integrasi Numerik Runge-Kutta Orde 4 (RK4)</strong> untuk memperoleh akurasi berorde O(dt⁴).
              </p>
            </div>
          </div>
        )}

        {/* SECTION 3: PLUME */}
        {activeSection === 'plume' && (
          <div className="space-y-6 text-sm">
            <div>
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Wind className="w-5 h-5 text-white" />
                Pemodelan Dispersi Asap & Abu Vulkanik (Gaussian Plume)
              </h3>
              <p className="text-zinc-300 leading-relaxed">
                Asap letusan terdiri dari kolom konvektif yang didorong gaya apung termal (thermal buoyancy) gas panas hingga mencapai ketinggian netral (umbrella cloud), kemudian terbawa oleh angin horizontal (adveksi) dan menyebar akibat turbulensi atmosfer (difusi).
              </p>
            </div>

            <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-800 space-y-3 font-mono text-xs text-zinc-300 shadow-inner">
              <div className="text-white font-bold font-sans text-sm">
                Model Plume Gauss di Permukaan Tanah (z = 0):
              </div>
              <div className="bg-zinc-900 p-3.5 rounded-xl border border-zinc-800 text-center text-white text-xs sm:text-sm overflow-x-auto font-bold">
                C(x,y,0) = [ Q / (π · u · σy · σz) ] · exp(-y² / (2σy²)) · exp(-H² / (2σz²))
              </div>
              <div className="space-y-1.5 text-zinc-400 text-[11px]">
                <p>• <strong>Q</strong> = Laju emisi massa abu dari kawah (kg/s)</p>
                <p>• <strong>u</strong> = Kecepatan rata-rata angin atmosfer (m/s)</p>
                <p>• <strong>H</strong> = Tinggi efektif kolom asap di atas kawah (meter)</p>
                <p>• <strong>σy, σz</strong> = Koefisien dispersi Pasquill-Gifford berdasarkan kelas stabilitas laut</p>
              </div>
            </div>

            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 space-y-2">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider font-mono">
                Kecepatan Pengendapan Gravitasi Abu (Hukum Stokes):
              </h4>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Partikel abu kasar (diameter &gt; 1 mm) mengendap cepat dalam radius 5–15 km dari krakatau, sedangkan abu halus (&lt; 63 µm) dapat melayang ratusan kilometer hingga ke daratan Banten atau Lampung karena memiliki <em>terminal settling velocity</em> yang sangat rendah (0.01 – 0.05 m/s).
              </p>
            </div>
          </div>
        )}

        {/* SECTION 4: KRAKATAU CASE */}
        {activeSection === 'krakatau' && (
          <div className="space-y-6 text-sm">
            <div>
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <Compass className="w-5 h-5 text-white" />
                Spesifikasi Kasus Geografis: Gunung Anak Krakatau di Selat Sunda
              </h3>
              <p className="text-zinc-300 leading-relaxed">
                Gunung Anak Krakatau terletak di Selat Sunda (antara Jawa dan Sumatra) pada koordinat 06°06'07" LS dan 105°25'23" BT. Berikut parameter fisik nyata yang diterapkan dalam model:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 space-y-1.5">
                <span className="text-white font-bold block text-sm">1. Topografi Pasca-Kolaps 2018</span>
                <p className="text-zinc-300 leading-relaxed">
                  Sebelum 22 Desember 2018, tinggi Anak Krakatau mencapai 338 mdpl. Setelah longsoran kaldera (flank collapse 64 hektar) yang memicu tsunami Selat Sunda, tinggi kawah tersisa sekitar <strong>157 meter di atas permukaan laut</strong>.
                </p>
              </div>

              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 space-y-1.5">
                <span className="text-white font-bold block text-sm">2. Karakteristik Batuan Andesit</span>
                <p className="text-zinc-300 leading-relaxed">
                  Batuan beku vulkanik yang dilontarkan didominasi andesit-basaltik dengan massa jenis rata-rata <strong>2.450 – 2.650 kg/m³</strong>, serta fragmen batu apung berongga (pumice) sekitar 900–1.200 kg/m³.
                </p>
              </div>

              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 space-y-1.5">
                <span className="text-white font-bold block text-sm">3. Pola Angin Muson Selat Sunda</span>
                <p className="text-zinc-300 leading-relaxed">
                  • <strong>Muson Barat (Des–Mar):</strong> Angin bertiup ke Timur/Tenggara (mengarah ke Anyer, Carita, Labuan Banten).<br />
                  • <strong>Muson Timur (Jun–Sep):</strong> Angin bertiup ke Barat Daya/Barat (mengarah ke Samudra Hindia atau Lampung).
                </p>
              </div>

              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-850 space-y-1.5">
                <span className="text-white font-bold block text-sm">4. Alur Vital & Zonasi Mitigasi</span>
                <p className="text-zinc-300 leading-relaxed">
                  Selat Sunda dilewati <strong>Alur Laut Kepulauan Indonesia (ALKI I)</strong> untuk lalu lintas kapal kargo internasional, serta koridor udara rute Jakarta-Sumatra (W45), sehingga letusan di atas radius 5 km (KRB III) menjadi dasar penerbitan NOTAM / VONA.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: CODE IMPLEMENTATION */}
        {activeSection === 'code' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Code className="w-4 h-4 text-white" />
                Kode Integrasi Numerik RK4 (TypeScript)
              </h3>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg border border-zinc-750 transition-colors shadow-sm"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                {copiedCode ? 'Tersalin!' : 'Salin Kode'}
              </button>
            </div>

            {/* Code Window Container */}
            <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-black shadow-2xl">
              <div className="bg-zinc-950 px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <span className="ml-2 text-[11px] font-mono text-zinc-400">src/physics/ballistics.ts</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">TypeScript</span>
              </div>
              <pre className="p-5 text-xs font-mono text-zinc-200 overflow-x-auto leading-relaxed max-h-96">
                <code>{sampleCode}</code>
              </pre>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Kode di atas adalah algoritma inti yang digunakan pada simulasi ini. Setiap frame animasi memanggil fungsi RK4 untuk memperbarui posisi proyektil dengan memperhitungkan gaya gravitasi dan hambatan udara kuadratik yang bergantung pada ketinggian atmosfer.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
