import React, { useState, useEffect, useRef } from 'react';
import { sound } from '../audio/AudioEngine';
import { DynamicNarrative } from '../behavior/DynamicNarrative';

interface DecisionTestSceneProps {
  onComplete: (
    choice: 'HELP' | 'ASK' | 'IGNORE' | 'LEAVE',
    latencyMs: number,
    switches: number
  ) => void;
}

export const DecisionTestScene: React.FC<DecisionTestSceneProps> = ({ onComplete }) => {
  const [selectedChoice, setSelectedChoice] = useState<'HELP' | 'ASK' | 'IGNORE' | 'LEAVE' | null>(null);
  const [latency, setLatency] = useState<number>(0);
  const [switches, setSwitches] = useState<number>(0);
  const [feedbackStage, setFeedbackStage] = useState<number>(0);

  const startTimeRef = useRef<number>(Date.now());
  const switchesRef = useRef<number>(0);
  const prevChoiceHoverRef = useRef<string | null>(null);

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  const handleHover = (choice: string) => {
    if (selectedChoice !== null) return;
    if (prevChoiceHoverRef.current && prevChoiceHoverRef.current !== choice) {
      switchesRef.current += 1;
    }
    prevChoiceHoverRef.current = choice;
    sound.playClick(1100);
  };

  const handleSelect = (choice: 'HELP' | 'ASK' | 'IGNORE' | 'LEAVE') => {
    if (selectedChoice !== null) return;
    const now = Date.now();
    const elapsed = now - startTimeRef.current;
    setLatency(elapsed);
    setSwitches(switchesRef.current);
    setSelectedChoice(choice);
    sound.playAcceptedTick();

    setFeedbackStage(1);

    setTimeout(() => {
      setFeedbackStage(2);
      sound.playScanPulse();
    }, 1200);

    setTimeout(() => {
      setFeedbackStage(3);
      sound.playAcceptedTick();
    }, 2400);

    setTimeout(() => {
      onComplete(choice, elapsed, switchesRef.current);
    }, 3900);
  };

  const observation = DynamicNarrative.getDecisionObservation(latency, switches);

  return (
    <div className="min-h-screen w-full flex flex-col justify-between p-6 sm:p-10 select-none bg-[#020306] text-neutral-300 font-mono">
      {/* Top Header */}
      <div className="border-b border-neutral-800/80 pb-4">
        <div className="text-xs text-neutral-500 tracking-widest uppercase">TEST 04 // MORAL INTENT SAMPLE</div>
        <div className="text-xs text-neutral-600 mt-0.5">EMPATHIC LATENCY CAPTURE</div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center my-6 text-center max-w-xl mx-auto w-full">
        {selectedChoice === null ? (
          <div className="space-y-8 w-full">
            {/* Lone abstract figure silhouette visual */}
            <div className="flex justify-center opacity-80 py-2">
              <svg width="48" height="64" viewBox="0 0 24 32" fill="none" className="text-neutral-500">
                <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M6 28V20C6 16.6863 8.68629 14 12 14C15.3137 14 18 16.6863 18 20V28"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="space-y-2">
              <h2
                className="text-2xl sm:text-4xl font-bold tracking-tight text-white uppercase"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                A STRANGER IS CRYING.
              </h2>
              <p className="text-sm sm:text-base text-neutral-400 font-mono tracking-widest">
                What do you do?
              </p>
            </div>

            {/* 4 Choices */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 w-full">
              {(['HELP', 'ASK', 'IGNORE', 'LEAVE'] as const).map((choice) => (
                <button
                  key={choice}
                  id={`btn-decision-${choice.toLowerCase()}`}
                  onPointerEnter={() => handleHover(choice)}
                  onClick={() => handleSelect(choice)}
                  className="py-3.5 px-4 border border-neutral-800 hover:border-white text-neutral-300 hover:text-white bg-neutral-950/60 hover:bg-white/10 font-mono text-sm tracking-widest transition-all duration-200 cursor-pointer rounded-xs"
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-md w-full animate-fadeIn">
            {feedbackStage >= 1 && (
              <div className="space-y-1">
                <div className="text-sm text-neutral-400 font-mono tracking-wider">
                  Response pattern stored: <span className="text-white font-bold">{selectedChoice}</span>
                </div>
                <div className="text-xs text-neutral-500 font-mono">
                  {observation.stat}
                </div>
              </div>
            )}

            {feedbackStage >= 2 && (
              <div className="text-sm text-neutral-300 font-mono italic animate-fadeIn py-1">
                "{observation.note}"
              </div>
            )}

            {feedbackStage >= 3 && (
              <div className="pt-2 text-emerald-400 font-mono text-sm sm:text-base tracking-widest font-bold animate-fadeIn flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                BEHAVIOR MODEL UPDATED.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Instructions */}
      <div className="border-t border-neutral-800/80 pt-3 text-center text-xs text-neutral-600">
        Ethical vector calculation. Subconscious selection stored in behavioral weights.
      </div>
    </div>
  );
};
