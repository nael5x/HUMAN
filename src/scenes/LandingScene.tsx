import React, { useEffect, useState } from 'react';
import { sound } from '../audio/AudioEngine';

interface LandingSceneProps {
  onStart: () => void;
}

export const LandingScene: React.FC<LandingSceneProps> = ({ onStart }) => {
  const [phase, setPhase] = useState<number>(0);

  useEffect(() => {
    // Elegant stepped reveal of the landing words
    const t1 = setTimeout(() => setPhase(1), 500);
    const t2 = setTimeout(() => setPhase(2), 1400);
    const t3 = setTimeout(() => setPhase(3), 2200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const handleProveIt = () => {
    sound.startAmbience();
    sound.playClick(1400);
    onStart();
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-[#020306] px-6 text-center select-none">
      <div className="max-w-2xl w-full flex flex-col items-center space-y-8">
        
        {/* Step 1: Main Display Title */}
        <div
          className={`transition-all duration-1000 ease-out transform ${
            phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <h1
            className="text-6xl sm:text-8xl md:text-9xl font-black tracking-tighter text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.15)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            HUMAN?
          </h1>
        </div>

        {/* Step 2: Subtitle */}
        <div
          className={`transition-all duration-1000 ease-out transform ${
            phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          <p className="text-lg sm:text-xl md:text-2xl text-neutral-400 font-mono tracking-widest lowercase">
            you say you are.
          </p>
        </div>

        {/* Step 3: Action Button */}
        <div
          className={`pt-6 transition-all duration-1000 ease-out transform ${
            phase >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <button
            id="btn-prove-it"
            onClick={handleProveIt}
            className="group relative px-10 py-4 bg-transparent border border-neutral-700 hover:border-white text-white font-mono text-base tracking-[0.25em] transition-all duration-300 hover:bg-white hover:text-black cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.05)] active:scale-95"
          >
            <span className="relative z-10 font-bold">PROVE IT</span>
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        {/* Bottom Subtext */}
        <div
          className={`pt-12 transition-all duration-1000 ease-out ${
            phase >= 3 ? 'opacity-40' : 'opacity-0'
          }`}
        >
          <p className="text-[10px] sm:text-xs text-neutral-500 font-mono tracking-[0.3em] uppercase">
            IDENTITY VERIFICATION SYSTEM
          </p>
        </div>
      </div>
    </div>
  );
};
