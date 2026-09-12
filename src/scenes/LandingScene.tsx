import React, { useEffect, useState } from 'react';
import { sound } from '../audio/AudioEngine';
import { ChallengePayload } from '../utils/ChallengeMode';
import { userMemory } from '../memory/UserMemory';

interface LandingSceneProps {
  onStart: () => void;
  challenge: ChallengePayload | null;
  seed: number;
  onOpenPrivacy?: () => void;
  onOpenAbout?: () => void;
}

export const LandingScene: React.FC<LandingSceneProps> = ({
  onStart,
  challenge,
  seed,
  onOpenPrivacy,
  onOpenAbout,
}) => {
  const [phase, setPhase] = useState<number>(0);
  const userMem = userMemory.getMemory();
  const isReturning = userMem.visitCount > 0;

  // Determine optional returning subtitle based on seed
  const returningSubtext = (() => {
    if (!isReturning) return null;
    const variant = Math.abs(seed) % 4;
    if (variant === 0 && userMem.previousMachineId) {
      return `${userMem.previousMachineId}?`;
    }
    if (variant === 1) {
      return 'Subject recognized.';
    }
    if (variant === 2) {
      return "We've met before.";
    }
    return null;
  })();

  useEffect(() => {
    // Stepped reveal sequence
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 1200);
    const t3 = setTimeout(() => setPhase(3), 2000);

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
        {/* Challenge Banner if entering via a challenge link */}
        {challenge && (
          <div
            className={`transition-all duration-700 ease-out border border-amber-900/60 bg-amber-950/30 px-5 py-3 rounded-sm text-left max-w-md w-full shadow-[0_0_20px_rgba(245,158,11,0.08)] ${
              phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            <div className="text-[11px] font-mono tracking-widest text-amber-500 uppercase">
              CHALLENGE INITIATED
            </div>
            <div className="text-white font-mono text-sm sm:text-base font-bold mt-0.5">
              {challenge.challengerModelId} challenged you.
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-amber-900/40 text-xs font-mono text-neutral-300">
              <span>RECORDED SCORE:</span>
              <span className="font-bold text-amber-400">{challenge.challengerHumanity}% HUMAN</span>
            </div>
            <div className="text-[11px] font-mono text-neutral-400 mt-1 italic">
              Can you do better?
            </div>
          </div>
        )}

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
          className={`transition-all duration-1000 ease-out transform space-y-2 ${
            phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          <p className="text-lg sm:text-xl md:text-2xl text-neutral-400 font-mono tracking-widest lowercase">
            you say you are.
          </p>

          {returningSubtext && !challenge && (
            <p className="text-xs sm:text-sm text-neutral-500 font-mono tracking-widest italic animate-fadeIn">
              "{returningSubtext}"
            </p>
          )}
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
            className="group relative px-10 py-4 bg-transparent border border-neutral-700 hover:border-white text-white font-mono text-base tracking-[0.25em] transition-all duration-300 hover:bg-white hover:text-black cursor-pointer shadow-[0_0_20px_rgba(255,255,255,0.05)] active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            <span className="relative z-10 font-bold">PROVE IT</span>
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        {/* Bottom Subtext & Links */}
        <div
          className={`pt-10 space-y-3 transition-all duration-1000 ease-out ${
            phase >= 3 ? 'opacity-80' : 'opacity-0'
          }`}
        >
          <p className="text-[10px] sm:text-xs text-neutral-600 font-mono tracking-[0.3em] uppercase">
            IDENTITY VERIFICATION SYSTEM
          </p>
          <div className="flex items-center justify-center gap-4 text-[11px] font-mono text-neutral-500">
            {onOpenPrivacy && (
              <button
                onClick={onOpenPrivacy}
                className="hover:text-neutral-300 transition-colors uppercase cursor-pointer"
              >
                PRIVACY PROTOCOL
              </button>
            )}
            {onOpenPrivacy && onOpenAbout && <span className="text-neutral-700">•</span>}
            {onOpenAbout && (
              <button
                onClick={onOpenAbout}
                className="hover:text-neutral-300 transition-colors uppercase cursor-pointer"
              >
                ABOUT
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

