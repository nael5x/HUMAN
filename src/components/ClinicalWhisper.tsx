import React, { useEffect, useState } from 'react';
import { hiddenBehaviors, WhisperEvent } from '../behavior/HiddenBehaviorEvents';

export const ClinicalWhisper: React.FC = () => {
  const [whisper, setWhisper] = useState<WhisperEvent | null>(null);

  useEffect(() => {
    return hiddenBehaviors.subscribe((w) => {
      setWhisper(w);
    });
  }, []);

  if (!whisper) return null;

  const toneClasses =
    whisper.tone === 'warning'
      ? 'text-red-400 border-red-900/60 bg-red-950/40 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
      : whisper.tone === 'curious'
      ? 'text-amber-300/90 border-amber-800/40 bg-black/80 shadow-[0_0_15px_rgba(251,191,36,0.1)]'
      : 'text-neutral-300 border-neutral-700/60 bg-black/85 shadow-[0_0_15px_rgba(255,255,255,0.06)]';

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 animate-fadeIn">
      <div
        className={`px-4 py-1.5 rounded-sm border font-mono text-xs sm:text-sm tracking-widest backdrop-blur-md flex items-center gap-2.5 ${toneClasses}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse opacity-80" />
        <span className="italic font-medium">"{whisper.text}"</span>
      </div>
    </div>
  );
};
