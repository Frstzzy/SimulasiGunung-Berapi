/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Eye } from 'lucide-react';
import { GeologicalLandmark3D } from '../data/landmarks';

interface LandmarkDetailModalProps {
  landmark: GeologicalLandmark3D | null;
  onClose: () => void;
  onFocusLandmark: (landmark: GeologicalLandmark3D) => void;
}

export const LandmarkDetailModal: React.FC<LandmarkDetailModalProps> = ({
  landmark,
  onClose,
  onFocusLandmark,
}) => {
  if (!landmark) return null;

  return (
    <div className="absolute bottom-16 sm:bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 bg-black/95 backdrop-blur-xl border border-zinc-800 p-4 rounded-2xl shadow-2xl z-30 animate-in fade-in slide-in-from-bottom-3 duration-200 text-zinc-200">
      <div className="flex items-start justify-between gap-2 border-b border-zinc-800 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xl p-1.5 rounded-xl bg-zinc-900 border border-zinc-800">
            {landmark.icon}
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-sm">{landmark.name}</span>
              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full border border-zinc-700 bg-zinc-900 text-zinc-300">
                {landmark.badge}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">{landmark.subtitle}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-zinc-300 leading-relaxed mt-2.5">
        {landmark.description}
      </p>

      {/* Highlights */}
      <div className="mt-3 space-y-1.5 bg-zinc-950 p-2.5 rounded-xl border border-zinc-850">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-mono">
          Fakta Geologis Kunci:
        </span>
        <ul className="space-y-1 text-[11px] text-zinc-300">
          {landmark.geologicalHighlights.map((hl, idx) => (
            <li key={idx} className="flex items-start gap-1.5">
              <span className="text-white font-bold">•</span>
              <span>{hl}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Action Footer */}
      <div className="mt-3 pt-2.5 border-t border-zinc-800 flex items-center justify-between">
        <button
          onClick={() => onFocusLandmark(landmark)}
          className="w-full py-1.5 px-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Fokus & Dekati Sudut Pandang Landmark</span>
        </button>
      </div>
    </div>
  );
};
