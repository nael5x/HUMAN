import React from 'react';
import { ShieldCheck, X } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg border border-neutral-800 bg-[#06080e] p-6 text-neutral-300 font-mono text-xs space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2 text-white font-bold tracking-widest uppercase">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>DATA PRIVACY & LOCAL PROCESSING</span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-white transition-colors cursor-pointer p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 leading-relaxed text-neutral-400">
          <p>
            <strong className="text-white">1. Local Execution:</strong> Camera frames and motion telemetry are analyzed in-memory directly on your device. No video, raw landmarks, or photos are ever uploaded, transmitted, or stored on external servers.
          </p>
          <p>
            <strong className="text-white">2. No Facial Recognition:</strong> The system utilizes local geometric mesh points for expression synthesis only. It cannot identify individuals, gender, age, or identity.
          </p>
          <p>
            <strong className="text-white">3. Memory Destruction:</strong> The video buffer used in the optical reflection scene resides exclusively in temporary RAM and is permanently purged immediately upon scene conclusion.
          </p>
          <p>
            <strong className="text-white">4. Cinematic Simulation:</strong> All classifications, scores, and verification outcomes are artistic narrative devices for entertainment and experiential reflection.
          </p>
        </div>

        <div className="pt-2 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-white tracking-widest uppercase text-[11px] cursor-pointer"
          >
            ACKNOWLEDGE
          </button>
        </div>
      </div>
    </div>
  );
};
