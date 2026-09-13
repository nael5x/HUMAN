import React, { useState } from 'react';
import { ShieldCheck, Info, X } from 'lucide-react';

interface InfoModalProps {
  isOpen: boolean;
  initialTab?: 'privacy' | 'about';
  onClose: () => void;
}

export const PrivacyModal: React.FC<InfoModalProps> = ({ isOpen, initialTab = 'privacy', onClose }) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'about'>(initialTab);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg border border-neutral-800 bg-[#06080e] p-6 text-neutral-300 font-mono text-xs space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('privacy')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] uppercase tracking-wider transition-colors cursor-pointer border ${
                activeTab === 'privacy'
                  ? 'border-neutral-500 bg-neutral-800 text-white font-bold'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Privacy</span>
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] uppercase tracking-wider transition-colors cursor-pointer border ${
                activeTab === 'about'
                  ? 'border-neutral-500 bg-neutral-800 text-white font-bold'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span>About</span>
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-white transition-colors cursor-pointer p-1"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {activeTab === 'privacy' ? (
          <div className="space-y-3 leading-relaxed text-neutral-400">
            <p>
              <strong className="text-white">1. Local Execution Only:</strong> Camera frames and motion telemetry are analyzed in-memory directly on your device. No video, audio, biometric landmarks, or photos are ever uploaded, transmitted, or stored on external servers.
            </p>
            <p>
              <strong className="text-white">2. Zero Facial Recognition:</strong> The system utilizes local geometric mesh points for expression synthesis only. It cannot identify individuals, gender, age, or identity.
            </p>
            <p>
              <strong className="text-white">3. Transient Video Purge:</strong> The video buffer used in the reflection scene resides exclusively in temporary browser RAM and is immediately purged upon scene completion.
            </p>
            <p>
              <strong className="text-white">4. Purely Client-Side Storage:</strong> Only lightweight non-sensitive metadata (such as visit counter and secret discovery flags) is stored locally via your browser's localStorage.
            </p>
          </div>
        ) : (
          <div className="space-y-3 leading-relaxed text-neutral-400">
            <p className="text-neutral-200 font-semibold">
              HUMAN? is an experimental interactive web experience exploring prediction, behavior, imitation, and machine identity.
            </p>
            <p>
              By observing subtle micro-timings, motor kinematics, and decision latencies, the experience reflects how algorithmic models construct behavioral archetypes from human input.
            </p>
            <p className="border-l-2 border-neutral-700 pl-3 italic text-neutral-500 text-[11px]">
              Disclaimer: This is a fictional artistic work and psychological fiction. All scores, classifications, behavioral labels, and diagnostic commentary are artistic narrative devices, not real medical or psychological evaluations.
            </p>
          </div>
        )}

        <div className="pt-2 border-t border-neutral-800 flex justify-between items-center text-[10px] text-neutral-500">
          <span>HUMAN? ARCHITECTURE V2</span>
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
