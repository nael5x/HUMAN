import React, { useState, useEffect, useRef } from 'react';
import { useSceneTimers } from '../utils/useSceneTimers';
import { sound } from '../audio/AudioEngine';
import { director } from '../director/ExperienceDirector';
import { sessionMemory, MemoryTestMetrics } from '../memory/SessionMemory';

interface MemoryTestSceneProps {
  seed: number;
  onComplete: (metrics: MemoryTestMetrics) => void;
}

// 8 distinct geometric glyphs
const GLYPHS = [
  // 0: Interlocking diamond triangle
  (
    <svg viewBox="0 0 64 64" className="w-12 h-12 stroke-current fill-none stroke-[2]">
      <polygon points="32,8 56,48 8,48" />
      <polygon points="32,24 44,44 20,44" />
      <circle cx="32" cy="38" r="2" className="fill-current" />
    </svg>
  ),
  // 1: Hexagonal reticle
  (
    <svg viewBox="0 0 64 64" className="w-12 h-12 stroke-current fill-none stroke-[2]">
      <polygon points="32,10 52,22 52,42 32,54 12,42 12,22" />
      <line x1="32" y1="10" x2="32" y2="54" strokeDasharray="3,3" />
      <circle cx="32" cy="32" r="6" />
    </svg>
  ),
  // 2: Dual crescent aperture
  (
    <svg viewBox="0 0 64 64" className="w-12 h-12 stroke-current fill-none stroke-[2]">
      <circle cx="32" cy="32" r="20" />
      <path d="M22,18 C38,18 38,46 22,46" />
      <path d="M42,18 C26,18 26,46 42,46" />
    </svg>
  ),
  // 3: Quadrant cipher cross
  (
    <svg viewBox="0 0 64 64" className="w-12 h-12 stroke-current fill-none stroke-[2]">
      <rect x="16" y="16" width="32" height="32" />
      <line x1="16" y1="16" x2="48" y2="48" />
      <line x1="48" y1="16" x2="16" y2="48" />
      <circle cx="32" cy="16" r="3" className="fill-current" />
    </svg>
  ),
  // 4: Triple chevron prism
  (
    <svg viewBox="0 0 64 64" className="w-12 h-12 stroke-current fill-none stroke-[2]">
      <polyline points="14,20 32,32 50,20" />
      <polyline points="14,32 32,44 50,32" />
      <circle cx="32" cy="18" r="2.5" className="fill-current" />
    </svg>
  ),
  // 5: Concentric partitioned rings
  (
    <svg viewBox="0 0 64 64" className="w-12 h-12 stroke-current fill-none stroke-[2]">
      <circle cx="32" cy="32" r="22" />
      <circle cx="32" cy="32" r="12" />
      <line x1="32" y1="10" x2="32" y2="20" />
      <line x1="32" y1="44" x2="32" y2="54" />
      <line x1="10" y1="32" x2="20" y2="32" />
      <line x1="44" y1="32" x2="54" y2="32" />
    </svg>
  ),
  // 6: Oblique nexus
  (
    <svg viewBox="0 0 64 64" className="w-12 h-12 stroke-current fill-none stroke-[2]">
      <rect x="20" y="20" width="24" height="24" transform="rotate(45 32 32)" />
      <circle cx="32" cy="32" r="3" className="fill-current" />
      <line x1="32" y1="8" x2="32" y2="56" strokeDasharray="2,2" />
    </svg>
  ),
  // 7: Asymmetric orbital branch
  (
    <svg viewBox="0 0 64 64" className="w-12 h-12 stroke-current fill-none stroke-[2]">
      <circle cx="24" cy="32" r="12" />
      <circle cx="42" cy="24" r="6" />
      <circle cx="42" cy="40" r="4" />
      <line x1="24" y1="32" x2="42" y2="24" />
      <line x1="24" y1="32" x2="42" y2="40" />
    </svg>
  ),
];

export const MemoryTestScene: React.FC<MemoryTestSceneProps> = ({ seed, onComplete }) => {
  const { setSceneTimeout, setSceneInterval } = useSceneTimers();
  // Pick 5 symbols to show
  const [shownSequence] = useState<number[]>(() => {
    const indices = [0, 1, 2, 3, 4, 5, 6, 7];
    const rotated = [...indices].sort((a, b) => ((a + seed * 3) % 7) - ((b + seed * 3) % 7));
    return rotated.slice(0, 5);
  });

  // Target to identify: one from shownSequence (e.g. index 2)
  const [targetIndex] = useState<number>(() => shownSequence[2]);

  // Choices: 1 target + 3 foils
  const [choices] = useState<number[]>(() => {
    const foils = [0, 1, 2, 3, 4, 5, 6, 7].filter((i) => !shownSequence.includes(i));
    const all = [targetIndex, ...foils.slice(0, 3)];
    // deterministic shuffle
    return all.sort((a, b) => ((a * 7 + seed) % 5) - ((b * 7 + seed) % 5));
  });

  const [phase, setPhase] = useState<'MEMORIZE' | 'MASK' | 'TEST' | 'CONFIRMING' | 'ACCEPTED'>('MEMORIZE');
  const [countdown, setCountdown] = useState<number>(3);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [feedbackStage, setFeedbackStage] = useState<number>(0);

  const testStartTimeRef = useRef<number>(0);
  const hoverSwitchesRef = useRef<number>(0);
  const lastHoverRef = useRef<number | null>(null);
  const hoverStartRef = useRef<number>(0);
  const maxHoverHesitationRef = useRef<number>(0);

  useEffect(() => {
    director.setNarrativeState('OBSERVING', 0.28);
    sound.playScanPulse();

    // 2.8s display countdown
    const timer = setSceneInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setPhase('MASK');
          sound.playScanPulse();

          // Brief scanline mask transition
          setSceneTimeout(() => {
            setPhase('TEST');
            testStartTimeRef.current = performance.now();
            sound.playClick(1400);
          }, 650);

          return 0;
        }
        return prev - 1;
      });
    }, 900);

    return () => clearInterval(timer);
  }, []);

  const handleHover = (choiceIdx: number) => {
    if (phase !== 'TEST') return;
    const now = performance.now();

    if (lastHoverRef.current !== null && lastHoverRef.current !== choiceIdx) {
      hoverSwitchesRef.current++;
      sessionMemory.recordDecisionSwitch();
      const dwell = now - hoverStartRef.current;
      if (dwell > maxHoverHesitationRef.current) {
        maxHoverHesitationRef.current = dwell;
      }
    }
    lastHoverRef.current = choiceIdx;
    hoverStartRef.current = now;
    sound.playClick(900);
  };

  const handleSelect = (choiceIdx: number) => {
    if (phase !== 'TEST' || selectedChoice !== null) return;
    const now = performance.now();
    const responseTime = Math.round(now - testStartTimeRef.current);
    setSelectedChoice(choiceIdx);
    setPhase('CONFIRMING');
    sound.playAcceptedTick();

    const isCorrect = choiceIdx === targetIndex;

    const metrics: MemoryTestMetrics = {
      targetSymbolIndex: targetIndex,
      selectedSymbolIndex: choiceIdx,
      isCorrect,
      responseTimeMs: responseTime,
      hoverSwitches: hoverSwitchesRef.current,
      confidenceHesitationMs: Math.round(maxHoverHesitationRef.current),
    };

    sessionMemory.recordMemoryTest(metrics);

    // Narrative timing steps
    setFeedbackStage(1); // "Choice recorded."

    setSceneTimeout(() => {
      setFeedbackStage(2); // "Are you certain?"
      sound.playScanPulse();
    }, 1200);

    setSceneTimeout(() => {
      setFeedbackStage(3); // "Memory confidence recorded."
      sound.playClick(1300);
    }, 2500);

    setSceneTimeout(() => {
      setFeedbackStage(4); // "PATTERN SYNCHRONIZED"
      setPhase('ACCEPTED');
      sound.playAcceptedTick();
    }, 3600);

    setSceneTimeout(() => {
      onComplete(metrics);
    }, 4800);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between p-6 sm:p-10 select-none bg-[#020306] text-neutral-300 font-mono">
      {/* Top Header */}
      <div className="border-b border-neutral-800/80 pb-4 flex flex-col sm:flex-row justify-between sm:items-center">
        <div>
          <div className="text-xs text-neutral-500 tracking-widest uppercase">TEST 05 // WORKING MEMORY</div>
          <div className="text-xs text-neutral-400 mt-0.5">VISUAL ENCODING STABILITY</div>
        </div>
        {phase === 'MEMORIZE' && (
          <div className="text-xs text-amber-400/90 font-mono tracking-wider mt-2 sm:mt-0 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            MEMORIZE: {countdown}s
          </div>
        )}
      </div>

      {/* Main Interactive Stage */}
      <div className="flex-1 flex flex-col items-center justify-center my-6 text-center max-w-2xl mx-auto w-full">
        {/* PHASE 1: MEMORIZE */}
        {phase === 'MEMORIZE' && (
          <div className="space-y-8 animate-fadeIn w-full">
            <div className="space-y-1">
              <h2 className="text-lg sm:text-xl font-bold tracking-wider text-white uppercase">
                OBSERVE THE CIPHER ARRAY
              </h2>
              <p className="text-xs text-neutral-500">Hold the sequence in working memory.</p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 py-6">
              {shownSequence.map((glyphIdx, i) => (
                <div
                  key={i}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded border border-neutral-700 bg-neutral-900/60 flex items-center justify-center text-neutral-200 shadow-md animate-fadeIn"
                  style={{ animationDelay: `${i * 90}ms` }}
                >
                  {GLYPHS[glyphIdx]}
                </div>
              ))}
            </div>

            <div className="text-xs text-neutral-500 tracking-widest uppercase">
              SCANNING VISUAL CORTEX RETENTION...
            </div>
          </div>
        )}

        {/* PHASE 2: MASK TRANSITION */}
        {phase === 'MASK' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-48 h-1 bg-neutral-800 overflow-hidden relative">
              <div className="absolute inset-0 bg-white animate-pulse" />
            </div>
            <div className="text-xs text-neutral-500 tracking-widest">MASKING SENSORY BUFFER...</div>
          </div>
        )}

        {/* PHASE 3 & 4: TEST & CONFIRMING */}
        {(phase === 'TEST' || phase === 'CONFIRMING' || phase === 'ACCEPTED') && (
          <div className="space-y-8 animate-fadeIn w-full">
            {selectedChoice === null ? (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2
                    className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    WHICH ONE DID YOU SEE?
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-500">
                    Select the pattern present in the original array.
                  </p>
                </div>

                {/* 4 Choices */}
                <div className="grid grid-cols-2 gap-4 sm:gap-6 max-w-md mx-auto pt-4">
                  {choices.map((glyphIdx, i) => (
                    <button
                      key={i}
                      id={`memory-choice-${i}`}
                      onPointerEnter={() => handleHover(glyphIdx)}
                      onClick={() => handleSelect(glyphIdx)}
                      className="aspect-square border border-neutral-800 rounded bg-neutral-950/70 hover:border-white hover:bg-neutral-900 flex flex-col items-center justify-center p-4 transition-all duration-200 cursor-pointer active:scale-95 group text-neutral-300 hover:text-white"
                    >
                      <div className="scale-110 sm:scale-125 transition-transform group-hover:scale-130">
                        {GLYPHS[glyphIdx]}
                      </div>
                      <div className="mt-3 text-[10px] text-neutral-600 group-hover:text-neutral-400 uppercase tracking-widest">
                        [SELECT]
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-md mx-auto animate-fadeIn">
                <div className="flex justify-center py-2">
                  <div className="w-20 h-20 rounded border border-emerald-500/60 bg-emerald-950/20 flex items-center justify-center text-emerald-300 shadow-[0_0_25px_rgba(52,211,153,0.2)]">
                    {GLYPHS[selectedChoice]}
                  </div>
                </div>

                {feedbackStage >= 1 && (
                  <div className="text-xs text-neutral-400 tracking-wider animate-fadeIn">
                    Pattern encoded. Latency registered.
                  </div>
                )}

                {feedbackStage >= 2 && (
                  <div className="text-lg sm:text-xl text-white font-mono tracking-wider font-semibold animate-fadeIn">
                    "Are you certain?"
                  </div>
                )}

                {feedbackStage >= 3 && (
                  <div className="text-sm text-neutral-400 italic tracking-wider animate-fadeIn">
                    Memory confidence recorded.
                  </div>
                )}

                {feedbackStage >= 4 && (
                  <div className="text-emerald-400 font-mono text-sm tracking-widest font-bold pt-3 animate-fadeIn flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    COGNITIVE RETENTION LOGGED
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Instructions */}
      <div className="border-t border-neutral-800/80 pt-3 text-center text-xs text-neutral-600">
        Sensory persistence and retroactive confidence calibration.
      </div>
    </div>
  );
};
