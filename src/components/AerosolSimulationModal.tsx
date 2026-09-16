/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Komponen Simulasi & Visualisasi Animasi Dinamika Aerosol Vulkanik
 * Menghitung konversi fotokimia SO2 -> H2SO4, AOD 550nm, Radiative Forcing,
 * konsentrasi PM2.5/PM10, serta menyajikan canvas animasi aliran aerosol.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Wind,
  Sun,
  Droplets,
  Activity,
  ShieldAlert,
  Info,
  Play,
  Pause,
  RotateCcw,
  Eye,
  Thermometer,
  Layers
} from 'lucide-react';
import { PlumeParams, KrakatauWeather } from '../types';
import {
  AerosolSimulationParams,
  calculateVolcanicAerosols,
  evaluateRegionalAerosolStations,
  StationAerosolEvaluation
} from '../physics/aerosol';

interface AerosolSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  plume: PlumeParams;
  weather?: KrakatauWeather | null;
}

interface AerosolParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  type: 'so2' | 'sulfate' | 'pm25';
  alpha: number;
  life: number;
  maxLife: number;
  phase: number;
}

export const AerosolSimulationModal: React.FC<AerosolSimulationModalProps> = ({
  isOpen,
  onClose,
  plume,
  weather,
}) => {
  // Input parameters state
  const [so2TonsPerDay, setSo2TonsPerDay] = useState<number>(() => {
    // Estimasi awal emisi SO2 proporsional terhadap laju letusan dan tinggi kolom
    return Math.round((plume.columnHeight / 1000) * 1250 * (plume.emissionRate / 5));
  });
  const [relativeHumidity, setRelativeHumidity] = useState<number>(weather ? weather.humidity : 78);
  const [uvIndex, setUvIndex] = useState<number>(weather ? weather.uvIndex : 8);
  const [elapsedHours, setElapsedHours] = useState<number>(6);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [selectedStationId, setSelectedStationId] = useState<string>('sta-anyer');

  // Sinkronisasi dengan perubahan prop plume
  useEffect(() => {
    setSo2TonsPerDay(Math.round((plume.columnHeight / 1000) * 1250 * (plume.emissionRate / 5)));
  }, [plume.columnHeight, plume.emissionRate]);

  useEffect(() => {
    if (weather) {
      setRelativeHumidity(weather.humidity);
      setUvIndex(weather.uvIndex);
    }
  }, [weather]);

  // Perhitungan Fisika Aerosol
  const simParams: AerosolSimulationParams = useMemo(() => ({
    so2EmissionRateTonsPerDay: so2TonsPerDay,
    relativeHumidityPct: relativeHumidity,
    uvRadiationIndex: uvIndex,
    plumeHeightM: plume.columnHeight,
    windSpeedMs: plume.windSpeed,
    windDirectionDeg: plume.windDirection,
    elapsedHours,
  }), [so2TonsPerDay, relativeHumidity, uvIndex, plume.columnHeight, plume.windSpeed, plume.windDirection, elapsedHours]);

  const metrics = useMemo(() => calculateVolcanicAerosols(simParams), [simParams]);
  const stationEvaluations: StationAerosolEvaluation[] = useMemo(
    () => evaluateRegionalAerosolStations(simParams, metrics),
    [simParams, metrics]
  );

  // Canvas Animasi Aerosol Microphysics
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<AerosolParticle[]>([]);
  const animFrameIdRef = useRef<number | null>(null);

  // Inisialisasi & Loop Animasi Partikel Aerosol
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset partikel
    const particles: AerosolParticle[] = [];
    const count = 180;
    const width = canvas.width;
    const height = canvas.height;

    for (let i = 0; i < count; i++) {
      const isConverted = Math.random() < (metrics.oxidationRatePctPerHour * elapsedHours) / 100;
      particles.push({
        x: Math.random() * width,
        y: height * 0.4 + (Math.random() - 0.5) * height * 0.45,
        vx: (plume.windSpeed * 0.6 + Math.random() * 1.2) * (width / 500),
        vy: (Math.random() - 0.5) * 0.8,
        radius: 1.5 + Math.random() * 3.5,
        type: isConverted ? 'sulfate' : Math.random() < 0.3 ? 'pm25' : 'so2',
        alpha: 0.2 + Math.random() * 0.7,
        life: Math.random() * 100,
        maxLife: 100 + Math.random() * 150,
        phase: Math.random() * Math.PI * 2,
      });
    }
    particlesRef.current = particles;

    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      // 1. Latar Gradien Atmosfer
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#040b17'); // Stratosfer / Upper Tropo
      grad.addColorStop(0.5, '#0b192e'); // Free Troposphere
      grad.addColorStop(1, '#020617'); // Marine Boundary Layer
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Garis ketinggian atmosfer
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      // Tropopause (16.5 km)
      const yTropo = height * 0.18;
      ctx.beginPath();
      ctx.moveTo(0, yTropo);
      ctx.lineTo(width, yTropo);
      ctx.stroke();

      // Boundary Layer (2.0 km)
      const yBoundary = height * 0.75;
      ctx.beginPath();
      ctx.moveTo(0, yBoundary);
      ctx.lineTo(width, yBoundary);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label layer atmosfer
      ctx.font = '9px monospace';
      ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.fillText('STRATOSFER (>16.5 km)', 12, yTropo - 5);
      ctx.fillText('TROPOSFER BEBAS (2 - 16 km)', 12, (yTropo + yBoundary) / 2);
      ctx.fillText('LAPISAN BATAS LAUT (0 - 2 km)', 12, yBoundary + 14);

      // 2. Kawah Krakatau (Sumber Emisi) di sisi kiri
      const ventX = 45;
      const ventY = yBoundary + 10;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(ventX, ventY, 6, 0, Math.PI * 2);
      ctx.fill();

      // Efek pancaran kawah
      const glowGrad = ctx.createRadialGradient(ventX, ventY, 2, ventX, ventY, 28);
      glowGrad.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
      glowGrad.addColorStop(0.5, 'rgba(249, 115, 22, 0.3)');
      glowGrad.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(ventX, ventY, 28, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('Kawah Anak Krakatau', 10, ventY + 22);

      // 3. Render & Update Partikel Aerosol
      const currentParticles = particlesRef.current;
      const windFactor = Math.max(0.4, plume.windSpeed / 10);

      currentParticles.forEach((p) => {
        if (isPlaying) {
          p.x += p.vx * windFactor * (dt * 45);
          p.y += Math.sin(time * 0.002 + p.phase) * 0.5 + p.vy * (dt * 15);
          p.life += dt * 30;

          // Siklus hidup & respawn di kawah
          if (p.x > width + 10 || p.life > p.maxLife) {
            p.x = ventX + (Math.random() - 0.5) * 10;
            p.y = ventY - Math.random() * (height * 0.55);
            p.life = 0;
            const isConverted = Math.random() < (metrics.oxidationRatePctPerHour * elapsedHours) / 100;
            p.type = isConverted ? 'sulfate' : Math.random() < 0.25 ? 'pm25' : 'so2';
          }
        }

        // Tentukan warna berdasarkan jenis partikel aerosol
        let fillCol = 'rgba(245, 158, 11, 0.7)'; // Kuning: Gas SO2 prekursor
        if (p.type === 'sulfate') {
          // Biru cerah / Cyan keputihan: Droplet H2SO4 hidrat (Mie Scattering)
          fillCol = 'rgba(56, 189, 248, 0.85)';
        } else if (p.type === 'pm25') {
          // Ungu / Magenta: PM2.5 halus
          fillCol = 'rgba(216, 180, 254, 0.8)';
        }

        // Gambar droplet aerosol dengan efek pendar
        ctx.fillStyle = fillCol;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Aura hamburan radiasi matahari untuk droplet sulfat
        if (p.type === 'sulfate' && p.radius > 2.5) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 4. Legenda Tipe Partikel dalam Canvas
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(width - 230, 10, 220, 68);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.strokeRect(width - 230, 10, 220, 68);

      ctx.font = 'bold 9px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('SPEKTRUM AEROSOL MIKROFISIKA:', width - 220, 24);

      // Dot 1: SO2 Gas
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(width - 215, 36, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '8.5px monospace';
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText('Gas SO₂ (Prekursor Reaktif)', width - 204, 39);

      // Dot 2: H2SO4 Droplet
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(width - 215, 50, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText('Droplet Sulfat H₂SO₄ (Hamburan)', width - 204, 53);

      // Dot 3: PM2.5
      ctx.fillStyle = '#d8b4fe';
      ctx.beginPath();
      ctx.arc(width - 215, 64, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText('Partikulat Halus PM2.5', width - 204, 67);

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isOpen, isPlaying, metrics, elapsedHours, plume.windSpeed, plume.columnHeight]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/90 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 text-lg">
              🧪
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Kalkulator & Simulasi Dinamika Aerosol Vulkanik
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950 text-sky-300 border border-sky-800">
                  SO₂ → H₂SO₄ • AOD 550nm
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Pemodelan konversi fotokimia, radiative forcing, penurunan suhu bumi lokal, dan konsentrasi PM2.5/PM10
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all border border-zinc-700"
            title="Tutup Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-zinc-200 text-xs">
          {/* 1. Live Interactive Animation Canvas */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                <span className="font-bold text-zinc-100 text-xs sm:text-sm">
                  Animasi Aliran Partikel Aerosol & Profil Lapisan Atmosfer
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  (Mie Scattering & Adveksi Angin)
                </span>
              </div>

              {/* Controls Play/Pause & Reset */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                    isPlaying
                      ? 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700'
                      : 'bg-emerald-500 text-black border-emerald-400 font-bold shadow'
                  }`}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-black" />}
                  <span>{isPlaying ? 'Jeda' : 'Lanjut'}</span>
                </button>

                <button
                  onClick={() => setElapsedHours(1)}
                  className="p-1 px-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs flex items-center gap-1"
                  title="Reset Waktu"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset T+1j</span>
                </button>
              </div>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-zinc-800 shadow-inner bg-black">
              <canvas
                ref={canvasRef}
                width={880}
                height={230}
                className="w-full h-[220px] sm:h-[250px] block"
              />

              {/* Telemetry Overlay in Canvas */}
              <div className="absolute bottom-2.5 left-3 flex flex-wrap items-center gap-2 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-800 text-[11px] font-mono">
                <span className="text-zinc-400">Horizon Proyeksi: <strong className="text-sky-300">T+{elapsedHours} Jam</strong></span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-400">Kecepatan Angin: <strong className="text-white">{plume.windSpeed} m/s</strong></span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-400">Radiasi UV: <strong className="text-amber-300">{uvIndex} Index</strong></span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-400">RH: <strong className="text-emerald-300">{relativeHumidity}%</strong></span>
              </div>
            </div>
          </div>

          {/* 2. Interactive Sliders Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800/80">
            {/* Slider 1: Emisi SO2 */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-400 font-medium">Laju Emisi SO₂ Gas:</span>
                <span className="font-mono font-bold text-amber-300">{so2TonsPerDay.toLocaleString()} ton/hari</span>
              </div>
              <input
                type="range"
                min={200}
                max={25000}
                step={200}
                value={so2TonsPerDay}
                onChange={(e) => setSo2TonsPerDay(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
              <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
                <span>200 (Ringan)</span>
                <span>25.000 (Plinian)</span>
              </div>
            </div>

            {/* Slider 2: Kelembaban Relatif */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-400 font-medium flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-sky-400" />
                  Kelembaban (RH):
                </span>
                <span className="font-mono font-bold text-sky-300">{relativeHumidity}%</span>
              </div>
              <input
                type="range"
                min={40}
                max={98}
                step={1}
                value={relativeHumidity}
                onChange={(e) => setRelativeHumidity(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
              <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
                <span>40% (Kering)</span>
                <span>98% (Sangat Lembab)</span>
              </div>
            </div>

            {/* Slider 3: Radiasi UV Matahari */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-400 font-medium flex items-center gap-1">
                  <Sun className="w-3 h-3 text-yellow-400" />
                  Indeks UV Matahari:
                </span>
                <span className="font-mono font-bold text-yellow-300">{uvIndex} UV</span>
              </div>
              <input
                type="range"
                min={1}
                max={12}
                step={1}
                value={uvIndex}
                onChange={(e) => setUvIndex(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-yellow-400"
              />
              <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
                <span>1 (Malam/Mendung)</span>
                <span>12 (Terik Siang)</span>
              </div>
            </div>

            {/* Slider 4: Waktu Pasca Erupsi */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-400 font-medium">Waktu Pasca Erupsi:</span>
                <span className="font-mono font-bold text-emerald-300">T+{elapsedHours} Jam</span>
              </div>
              <input
                type="range"
                min={1}
                max={36}
                step={1}
                value={elapsedHours}
                onChange={(e) => setElapsedHours(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
              <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
                <span>T+1 Jam</span>
                <span>T+36 Jam</span>
              </div>
            </div>
          </div>

          {/* 3. Kartu Hasil Perhitungan Kuantitatif Fisika Aerosol */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Konversi Kimiawi SO2 -> H2SO4 */}
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  Laju Oksidasi SO₂
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60">
                  Fotokimia
                </span>
              </div>
              <div>
                <div className="text-lg font-bold font-mono text-white">
                  {metrics.oxidationRatePctPerHour} <span className="text-xs text-zinc-400 font-sans">%/jam</span>
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  Produksi sulfat: <strong className="text-amber-300">{metrics.sulfateProductionKgPerHour.toLocaleString()} kg/jam</strong>
                </div>
              </div>
              <div className="text-[9.5px] text-zinc-400 pt-1.5 border-t border-zinc-800 font-mono">
                Akumulasi Sulfat: <span className="text-white font-bold">{metrics.cumulativeSulfateMassTons} ton</span> (T+{elapsedHours}j)
              </div>
            </div>

            {/* Card 2: Aerosol Optical Depth (AOD 550) */}
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-sky-400" />
                  AOD Puncak (τ₅₅₀)
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                  metrics.aodCategory === 'Ekstrem' || metrics.aodCategory === 'Pekat'
                    ? 'bg-red-950 text-red-300 border border-red-800'
                    : 'bg-sky-950 text-sky-300 border border-sky-800'
                }`}>
                  {metrics.aodCategory}
                </span>
              </div>
              <div>
                <div className="text-lg font-bold font-mono text-sky-300">
                  {metrics.peakAod550} <span className="text-xs text-zinc-400 font-sans">τ</span>
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  Reduksi radiasi surya: <strong className="text-white">{metrics.solarRadiationAttenuationPct}%</strong>
                </div>
              </div>
              <div className="text-[9.5px] text-zinc-400 pt-1.5 border-t border-zinc-800 font-mono">
                Transmisi cahaya: <span className="text-sky-200">{(100 - metrics.solarRadiationAttenuationPct).toFixed(1)}%</span>
              </div>
            </div>

            {/* Card 3: Radiative Forcing & Pendinginan Suhu */}
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5">
                  <Thermometer className="w-3.5 h-3.5 text-emerald-400" />
                  Radiative Forcing
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                  Pendinginan
                </span>
              </div>
              <div>
                <div className="text-lg font-bold font-mono text-emerald-400">
                  {metrics.radiativeForcingWm2} <span className="text-xs text-zinc-400 font-sans">W/m²</span>
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  Anomali Suhu Lokal: <strong className="text-emerald-300">-{metrics.surfaceCoolingDeltaC} °C</strong>
                </div>
              </div>
              <div className="text-[9.5px] text-zinc-400 pt-1.5 border-t border-zinc-800 font-mono">
                Efek Albedo Sulfat: <span className="text-white font-bold">Hamburan Balik Surya</span>
              </div>
            </div>

            {/* Card 4: Waktu Tinggal & Pengendapan Stokes */}
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  Waktu Tinggal Atmosfer
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/60">
                  {metrics.stratosphericInjection ? 'Stratosfer' : 'Troposfer'}
                </span>
              </div>
              <div>
                <div className="text-lg font-bold font-mono text-purple-300">
                  {metrics.atmosphericResidenceDays} <span className="text-xs text-zinc-400 font-sans">hari</span>
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  Radius partikel: <strong className="text-white">{metrics.meanRadiusMicrons} μm</strong>
                </div>
              </div>
              <div className="text-[9.5px] text-zinc-400 pt-1.5 border-t border-zinc-800 font-mono">
                Kecepatan Stokes: <span className="text-purple-200">{(metrics.stokesSettlingVelocityMps * 1000).toFixed(3)} mm/s</span>
              </div>
            </div>
          </div>

          {/* 4. Tabel Dampak Aerosol & Kualitas Udara ke Stasiun Pesisir */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-zinc-100 text-xs sm:text-sm">
                  Evaluasi Paparan Aerosol & Partikulat (PM2.5 / PM10) di Stasiun Pesisir
                </h3>
              </div>
              <span className="text-[11px] text-zinc-400 font-mono">
                Angin dari {plume.windDirection}° ({plume.windSpeed} m/s)
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900 border-b border-zinc-800 text-[10.5px] text-zinc-400 uppercase font-mono">
                  <tr>
                    <th className="py-2.5 px-3">Lokasi / Stasiun</th>
                    <th className="py-2.5 px-3">Jarak & Arah</th>
                    <th className="py-2.5 px-3">Status Angin</th>
                    <th className="py-2.5 px-3">PM2.5 (μg/m³)</th>
                    <th className="py-2.5 px-3">AOD (τ₅₅₀)</th>
                    <th className="py-2.5 px-3">Visibilitas</th>
                    <th className="py-2.5 px-3">Indeks ISPU</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 font-mono">
                  {stationEvaluations.map((ev) => {
                    const isSelected = selectedStationId === ev.station.id;
                    return (
                      <tr
                        key={ev.station.id}
                        onClick={() => setSelectedStationId(ev.station.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-zinc-850' : 'hover:bg-zinc-900/60'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-sans font-semibold text-white flex items-center gap-1.5">
                          <span>{ev.inPlumePath ? '⚠️' : '📍'}</span>
                          <span>{ev.station.name}</span>
                          <span className="text-[9.5px] text-zinc-400 font-mono">({ev.station.province})</span>
                        </td>
                        <td className="py-2.5 px-3 text-zinc-300">
                          {ev.station.distKm} km • {ev.station.bearingCardinal}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          {ev.inPlumePath ? (
                            <span className="text-amber-400 font-semibold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                              Jalur Plume (T+{ev.etaHours}j)
                            </span>
                          ) : (
                            <span className="text-emerald-400">Di luar jalur</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-white">
                          <span className={ev.pm25UgM3 > 55 ? 'text-amber-300' : 'text-zinc-200'}>
                            {ev.pm25UgM3}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-sky-300">
                          {ev.aod550}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-300">
                          {ev.visibilityKm} km
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
                            ev.ispuCategory === 'BERBAHAYA'
                              ? 'bg-red-950 text-red-300 border border-red-800'
                              : ev.ispuCategory === 'SANGAT TIDAK SEHAT'
                              ? 'bg-purple-950 text-purple-300 border border-purple-800'
                              : ev.ispuCategory === 'TIDAK SEHAT'
                              ? 'bg-orange-950 text-orange-300 border border-orange-800'
                              : ev.ispuCategory === 'SEDANG'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}>
                            {ev.ispuCategory}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Detail Rekomendasi Stasiun Terpilih */}
          {selectedStationId && (
            <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-1.5">
              {(() => {
                const found = stationEvaluations.find((s) => s.station.id === selectedStationId);
                if (!found) return null;
                return (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-white flex items-center gap-2">
                        <span>Saran Mitigasi untuk {found.station.name}</span>
                        <span className="text-[10px] font-mono text-zinc-400">
                          (Populasi: {found.station.population})
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-400">
                        Deviasi Angin: {found.angularDevDeg}°
                      </span>
                    </div>
                    <p className="text-zinc-300 leading-relaxed text-[11px]">
                      {found.healthAdvisory}
                    </p>
                  </div>
                );
              })()}
            </div>
          )}

          {/* 6. Ringkasan Fisika & Formulasi Referensi */}
          <div className="p-3.5 rounded-xl bg-black border border-zinc-800 text-[10.5px] text-zinc-400 font-mono space-y-1">
            <div className="font-bold text-zinc-300 font-sans flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-sky-400" />
              Dasar Teori & Formulasi Fisika Komputasi:
            </div>
            <p>1. Konversi Fotokimia: SO₂ + OH• → HOSO₂ → H₂SO₄ (laju k = k_base · f(UV) · f(RH)). Rasio massa molar: 1.88x.</p>
            <p>2. Hamburan Mie & AOD: τ₅₅₀ = β_mass · C_col (β_mass = 4.8 m²/g untuk droplet sulfat hidrat sub-mikron).</p>
            <p>3. Radiative Forcing: ΔF ≈ -28.5 · τ₅₅₀ W/m², dengan estimasi penurunan suhu lokal ΔT = λ · |ΔF| (λ ≈ 0.085 K/(W/m²)).</p>
          </div>
        </div>
      </div>
    </div>
  );
};
