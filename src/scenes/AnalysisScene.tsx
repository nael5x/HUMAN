import React, { useState, useEffect, useRef } from 'react';
import { useSceneTimers } from '../utils/useSceneTimers';
import { sound } from '../audio/AudioEngine';

interface AnalysisSceneProps {
  humanityScore: number;
  onGlitchTriggered: () => void;
}

export const AnalysisScene: React.FC<AnalysisSceneProps> = ({
  humanityScore,
  onGlitchTriggered,
}) => {
  const { setSceneTimeout } = useSceneTimers();
  const [progress, setProgress] = useState<number>(0);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isInterrupted, setIsInterrupted] = useState<boolean>(false);
  const [interruptionStage, setInterruptionStage] = useState<number>(0);

  useEffect(() => {
    sound.setAmbienceTension(0.28);
    // Stepped calculation sequence matching spec: 19% -> 41% -> 67% -> 84% -> final
    const displayScore = humanityScore || 94.8;
    const steps = [
      { p: 19, delay: 350 },
      { p: 41, delay: 950 },
      { p: 67, delay: 1700 },
      { p: 84, delay: 2500 },
      { p: displayScore, delay: 3400 },
    ];

    const timeouts: number[] = [];

    steps.forEach((step, idx) => {
      const t = setSceneTimeout(() => {
        setProgress(step.p);
        if (idx === steps.length - 1) {
          setIsVerified(true);
          sound.playAcceptedTick();
        } else {
          sound.playScanPulse();
        }
      }, step.delay);
      timeouts.push(t);
    });

    return () => timeouts.forEach((t) => clearTimeout(t));
  }, [humanityScore]);

  const handleCompleteSession = () => {
    if (isInterrupted) return;
    setIsInterrupted(true);
    sound.playClick(800);
    sound.setAmbienceTension(0.58);

    // Dramatic brief pause: do nothing for a moment
    setSceneTimeout(() => {
      setInterruptionStage(1); // "..."
    }, 1200);

    setSceneTimeout(() => {
      setInterruptionStage(2); // Minor glitch
      sound.playGlitch(0.25);
      sound.playWarningPulse();
    }, 2400);

    setSceneTimeout(() => {
      setInterruptionStage(3); // "ADDITIONAL SAMPLE REQUIRED"
      sound.playWarningPulse();
    }, 3600);

    setSceneTimeout(() => {
      setInterruptionStage(4); // "VISUAL TRAINING REQUIRED"
    }, 4600);

    setSceneTimeout(() => {
      onGlitchTriggered();
    }, 6200);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between p-6 sm:p-10 select-none bg-[#020306] text-neutral-300 font-mono">
      {/* Top Header */}
      <div className="border-b border-neutral-800/80 pb-4">
        <div className="text-xs text-neutral-500 tracking-widest uppercase">EVALUATION SUMMARY // CORE ANALYSIS</div>
        <div className="text-xs text-neutral-600 mt-0.5">BEHAVIORAL PROBABILITY MATRIX</div>
      </div>

      {/* Main Analysis Display */}
      <div className="flex-1 flex flex-col items-center justify-center my-6 text-center max-w-lg mx-auto w-full">
        {!isInterrupted ? (
          <div className="space-y-6 w-full">
            {!isVerified ? (
              <div className="space-y-4 animate-fadeIn">
                <div className="text-xs sm:text-sm text-neutral-400 font-mono tracking-widest uppercase">
                  CALCULATING HUMAN PROBABILITY
                </div>

                <div className="text-6xl sm:text-8xl font-black text-white font-mono tracking-tight">
                  {progress}%
                </div>

                <div className="w-full bg-neutral-900 border border-neutral-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-neutral-400 transition-all duration-500 ease-out"
                    style={{ width: `${Math.min(100, progress)}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-8 animate-fadeIn">
                {/* Verified Badge - First Green in Experience */}
                <div className="inline-block px-5 py-2 border-2 border-emerald-500/90 bg-emerald-950/40 text-emerald-400 font-bold tracking-[0.25em] text-sm uppercase rounded shadow-[0_0_25px_rgba(16,185,129,0.25)]">
                  HUMAN VERIFIED
                </div>

                <div className="space-y-1">
                  <h1
                    className="text-5xl sm:text-7xl font-extrabold text-white tracking-tight"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {humanityScore}% HUMAN
                  </h1>
                  <p className="text-neutral-400 font-mono text-sm tracking-widest uppercase">
                    SESSION HUMANITY CONFIDENCE
                  </p>
                </div>

                <div className="pt-4">
                  <button
                    id="btn-complete-session"
                    onClick={handleCompleteSession}
                    className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold text-sm tracking-[0.2em] transition-all duration-200 cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.35)] active:scale-95 uppercase"
                  >
                    COMPLETE SESSION
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Interruption Glitch Sequence */
          <div className="space-y-5 max-w-md w-full animate-fadeIn">
            {interruptionStage === 1 && (
              <div className="text-neutral-500 font-mono text-2xl tracking-widest animate-pulse">
                ...
              </div>
            )}

            {interruptionStage >= 2 && (
              <div className="space-y-4">
                <div className="text-red-400 font-mono text-xs sm:text-sm tracking-widest uppercase font-bold border border-red-500/40 bg-red-950/30 py-2.5 px-3">
                  [SYSTEM OVERRIDE] ADDITIONAL SAMPLE REQUIRED
                </div>

                {interruptionStage >= 4 && (
                  <div
                    className="text-xl sm:text-3xl font-black text-white tracking-widest uppercase font-mono animate-fadeIn pt-2"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    VISUAL TRAINING REQUIRED
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Instructions */}
      <div className="border-t border-neutral-800/80 pt-3 text-center text-xs text-neutral-600">
        {isInterrupted
          ? 'System exception logged. Disengaging verification protocol.'
          : "Confidence score synthesized from this session's fictional H-model baseline."}
      </div>
    </div>
  );
};
