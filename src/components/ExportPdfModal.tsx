/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileText,
  Download,
  ExternalLink,
  X,
  CheckCircle2,
  Wind,
  Flame,
  AlertTriangle,
  Building,
  User,
  FileCheck,
  Compass,
  Radio,
  Clock,
  Sparkles
} from 'lucide-react';
import { BallisticParams, PlumeParams, EruptionPresetId, KrakatauWeather } from '../types';
import { ERUPTION_PRESETS } from '../data/presets';
import {
  calculateDynamicAreaImpacts,
  generateSimulationPdfDoc,
  downloadSimulationPdf,
} from '../services/pdfReportService';

interface ExportPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  ballistic: BallisticParams;
  plume: PlumeParams;
  weather: KrakatauWeather | null;
  selectedPreset: EruptionPresetId;
}

export const ExportPdfModal: React.FC<ExportPdfModalProps> = ({
  isOpen,
  onClose,
  ballistic,
  plume,
  weather,
  selectedPreset,
}) => {
  const [investigatorName, setInvestigatorName] = useState<string>(
    'Analis Vulkanologi & Kebencanaan Selat Sunda'
  );
  const [institution, setInstitution] = useState<string>(
    'Pusat Simulasi Komputasi & Mitigasi Bencana Geologi'
  );
  const [customNotes, setCustomNotes] = useState<string>(
    'Laporan kalkulasi fisika erupsi real-time untuk pemantauan bahaya balistik, plume abu vulkanik, dan kesiapsiagaan maritim Selat Sunda.'
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const currentPreset = ERUPTION_PRESETS.find((p) => p.id === selectedPreset) || ERUPTION_PRESETS[0];
  const impacts = calculateDynamicAreaImpacts(plume);
  const criticalCount = impacts.filter((i) => i.currentRiskLevel === 'KRITIS' || i.currentRiskLevel === 'TINGGI').length;
  const driftDeg = (plume.windDirection + 180) % 360;

  const handleDownload = () => {
    setIsGenerating(true);
    setDownloadSuccess(false);

    try {
      setTimeout(() => {
        const fileName = `SimKratoa_Laporan_${currentPreset.id}_${new Date().toISOString().slice(0, 10)}.pdf`;
        downloadSimulationPdf({
          ballistic,
          plume,
          weather,
          selectedPreset,
          investigatorName,
          institution,
          customNotes,
          fileName,
        });

        setIsGenerating(false);
        setDownloadSuccess(true);
        setTimeout(() => setDownloadSuccess(false), 4000);
      }, 400);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      setIsGenerating(false);
    }
  };

  const handleOpenPreview = () => {
    try {
      const doc = generateSimulationPdfDoc({
        ballistic,
        plume,
        weather,
        selectedPreset,
        investigatorName,
        institution,
        customNotes,
      });
      const blobUrl = doc.output('bloburl');
      window.open(blobUrl, '_blank');
    } catch (err) {
      console.error('Failed to open PDF preview:', err);
    }
  };

  return (
    <div
      id="export-pdf-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="export-pdf-modal-container"
        className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-black p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center shadow-lg shadow-white/5">
              <FileText className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  SimKratoa — Ekspor Laporan PDF
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  Format A4 Formal
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Laporan resmi parameter erupsi, cuaca, dan matriks daerah terdampak
              </p>
            </div>
          </div>
          <button
            id="close-pdf-modal-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto scrollbar-thin">
          {/* Status & Live Preview Card */}
          <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                Data yang Siap Disertakan dalam Laporan:
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-red-950/80 border border-red-800 text-red-300 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                STATUS: SIAGA (LEVEL III)
              </span>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-black/60 border border-zinc-850">
                <span className="text-[10px] text-zinc-400 block">Skenario Erupsi</span>
                <span className="font-bold text-white truncate block">{currentPreset.name}</span>
                <span className="text-[9px] text-zinc-400">{currentPreset.subtitle}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-black/60 border border-zinc-850">
                <span className="text-[10px] text-zinc-400 block">Kolom Abu Vulkanik</span>
                <span className="font-bold text-white truncate block">{plume.columnHeight} m</span>
                <span className="text-[9px] text-zinc-400">Plume {plume.columnHeight + 157} mdpl</span>
              </div>
              <div className="p-2.5 rounded-lg bg-black/60 border border-zinc-850">
                <span className="text-[10px] text-zinc-400 block">Vektor Angin & Hanyutan</span>
                <span className="font-bold text-white truncate block">{plume.windSpeed} m/s ({plume.windDirection}°)</span>
                <span className="text-[9px] text-zinc-400">Drift ke {driftDeg}°</span>
              </div>
              <div className="p-2.5 rounded-lg bg-black/60 border border-zinc-850">
                <span className="text-[10px] text-zinc-400 block">Daerah Berisiko Tinggi</span>
                <span className="font-bold text-amber-400 truncate block">{criticalCount} Wilayah</span>
                <span className="text-[9px] text-zinc-400">Dari total 10 titik pantau</span>
              </div>
            </div>

            {/* Affected Areas Highlight */}
            <div className="text-[11px] text-zinc-300 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-850 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-medium text-zinc-200">
                  Ringkasan Daerah Paling Terdampak Saat Ini:
                </p>
                <p className="text-zinc-400 text-[10.5px]">
                  {impacts
                    .filter((i) => i.currentRiskLevel === 'KRITIS' || i.currentRiskLevel === 'TINGGI')
                    .map((i) => `${i.area.name} (ETA ${i.etaMinutes}m)`)
                    .join(' • ') || 'Awan abu mengarah ke perairan terbuka Selat Sunda.'}
                </p>
              </div>
            </div>
          </div>

          {/* User Customization Inputs */}
          <div className="space-y-3.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-zinc-400" />
              Identitas Pengesahan Laporan (Opsional):
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1 font-medium">
                  Nama Petugas / Analis Lapangan:
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    id="investigator-name-input"
                    type="text"
                    value={investigatorName}
                    onChange={(e) => setInvestigatorName(e.target.value)}
                    placeholder="Contoh: Budi Santoso, S.T."
                    className="w-full pl-8 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1 font-medium">
                  Instansi / Lembaga / Unit:
                </label>
                <div className="relative">
                  <Building className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    id="institution-name-input"
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Contoh: BPBD Banten / Stasiun Pengamatan"
                    className="w-full pl-8 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1 font-medium">
                Catatan Khusus Operasional / Instruksi Lapangan:
              </label>
              <textarea
                id="custom-notes-input"
                rows={2}
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Tambahkan catatan khusus mitigasi, status alur laut, atau instruksi evakuasi..."
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-white transition-colors resize-none"
              />
            </div>
          </div>

          {/* Success Notification */}
          {downloadSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Dokumen PDF berhasil diunduh ke perangkat Anda! Silakan periksa folder Unduhan / Download.
              </span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-zinc-900/90 p-4 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2.5">
          <button
            id="pdf-preview-tab-btn"
            onClick={handleOpenPreview}
            className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 hover:text-white text-xs font-medium border border-zinc-700 transition-colors flex items-center gap-1.5"
            title="Buka pratinjau PDF di tab browser baru"
          >
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
            <span>Pratinjau di Tab Baru</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              id="cancel-pdf-btn"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs font-medium border border-zinc-800 transition-colors"
            >
              Batal
            </button>

            <button
              id="download-pdf-now-btn"
              onClick={handleDownload}
              disabled={isGenerating}
              className="px-5 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-bold shadow-lg shadow-white/10 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-black" />
              <span>{isGenerating ? 'Memproses PDF...' : 'Unduh Laporan PDF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
