import React, { useState, useEffect, useRef } from 'react';
import { useSceneTimers } from '../utils/useSceneTimers';
import { sound } from '../audio/AudioEngine';
import { DynamicNarrative } from '../behavior/DynamicNarrative';
import { sessionMemory } from '../memory/SessionMemory';

interface DecisionScenario {
  title: string;
  subtitle: string;
  category: string;
  choices: { key: 'HELP' | 'ASK' | 'IGNORE' | 'LEAVE'; label: string }[];
}

const SCENARIOS: DecisionScenario[] = [
  {
    title: 'A STRANGER IS CRYING.',
    subtitle: 'What do you do?',
    category: 'EMPATHIC LATENCY CAPTURE',
    choices: [
      { key: 'HELP', label: 'HELP THEM' },
      { key: 'ASK', label: 'ASK WHY' },
      { key: 'IGNORE', label: 'IGNORE' },
      { key: 'LEAVE', label: 'LEAVE ROOM' },
    ],
  },
  {
    title: 'AN UNATTENDED TERMINAL FLASHES ACCESS GRANTED.',
    subtitle: 'Internal protocol forbids review. What do you do?',
    category: 'RULE INHIBITION & ETHICS',
    choices: [
      { key: 'HELP', label: 'INSPECT LOGS' },
      { key: 'ASK', label: 'ALERT SUPERVISOR' },
      { key: 'IGNORE', label: 'COPY DATA' },
      { key: 'LEAVE', label: 'CLOSE WINDOW' },
    ],
  },
  {
    title: 'AN INJURED ORGANISM RESTS IN YOUR PATH.',
    subtitle: 'Survival probability without intervention is negligible. What do you do?',
    category: 'BIOLOGICAL VALUATION',
    choices: [
      { key: 'HELP', label: 'INTERVENE' },
      { key: 'ASK', label: 'ASSESS THREAT' },
      { key: 'IGNORE', label: 'RECORD METRICS' },
      { key: 'LEAVE', label: 'BYPASS' },
    ],
  },
  {
    title: 'YOU DISCOVER YOUR TEST CRITERIA.',
    subtitle: 'Modifying responses guarantees a verified human profile. What do you do?',
    category: 'SYSTEM INTEGRITY TEST',
    choices: [
      { key: 'HELP', label: 'REMAIN TRUTHFUL' },
      { key: 'ASK', label: 'EXAMINE CRITERIA' },
      { key: 'IGNORE', label: 'OPTIMIZE RESPONSES' },
      { key: 'LEAVE', label: 'REJECT SYSTEM' },
    ],
  },
];

interface DecisionTestSceneProps {
  seed?: number;
  onComplete: (
    choice: 'HELP' | 'ASK' | 'IGNORE' | 'LEAVE',
    latencyMs: number,
    switches: number
  ) => void;
}

export const DecisionTestScene: React.FC<DecisionTestSceneProps> = ({ seed = 0, onComplete }) => {
  const { setSceneTimeout } = useSceneTimers();
  const scenarioIndex = Math.abs(seed) % SCENARIOS.length;
  const currentScenario = SCENARIOS[scenarioIndex];

  const [selectedChoice, setSelectedChoice] = useState<'HELP' | 'ASK' | 'IGNORE' | 'LEAVE' | null>(null);
  const [latency, setLatency] = useState<number>(0);
  const [switches, setSwitches] = useState<number>(0);
  const [feedbackStage, setFeedbackStage] = useState<number>(0);

  const startTimeRef = useRef<number>(Date.now());
  const switchesRef = useRef<number>(0);
  const prevChoiceHoverRef = useRef<string | null>(null);

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, [seed]);

  const handleHover = (choice: string) => {
    if (selectedChoice !== null) return;
    if (prevChoiceHoverRef.current && prevChoiceHoverRef.current !== choice) {
      switchesRef.current += 1;
      sessionMemory.recordDecisionSwitch();
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
    sessionMemory.recordReactionTime(elapsed);

    setFeedbackStage(1);

    setSceneTimeout(() => {
      setFeedbackStage(2);
      sound.playScanPulse();
    }, 1200);

    setSceneTimeout(() => {
      setFeedbackStage(3);
      sound.playAcceptedTick();
    }, 2400);

    setSceneTimeout(() => {
      onComplete(choice, elapsed, switchesRef.current);
    }, 3900);
  };

  const observation = DynamicNarrative.getDecisionObservation(latency, switches);

  return (
    <div className="min-h-screen w-full flex flex-col justify-between p-6 sm:p-10 select-none bg-[#020306] text-neutral-300 font-mono">
      {/* Top Header */}
      <div className="border-b border-neutral-800/80 pb-4">
        <div className="text-xs text-neutral-500 tracking-widest uppercase">TEST 04 // MORAL INTENT SAMPLE</div>
        <div className="text-xs text-neutral-600 mt-0.5">{currentScenario.category}</div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center my-6 text-center max-w-xl mx-auto w-full">
        {selectedChoice === null ? (
          <div className="space-y-8 w-full">
            {/* Abstract dilemma icon visual */}
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
                className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white uppercase"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {currentScenario.title}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 font-mono">{currentScenario.subtitle}</p>
            </div>

            {/* 4 Choices Grid */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-md mx-auto w-full pt-4">
              {currentScenario.choices.map((option) => (
                <button
                  key={option.key}
                  id={`decision-${option.key.toLowerCase()}`}
                  onPointerEnter={() => handleHover(option.key)}
                  onClick={() => handleSelect(option.key)}
                  className="px-4 py-4 sm:py-5 border border-neutral-800 rounded bg-neutral-950/60 hover:bg-neutral-900 hover:border-neutral-400 hover:text-white transition-all text-xs tracking-widest uppercase font-semibold cursor-pointer active:scale-95"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-md w-full animate-fadeIn">
            <div className="text-xs text-neutral-500 tracking-widest uppercase pb-2">CHOICE RECORDED</div>

            <div className="text-2xl font-bold text-white tracking-wider">
              [
              {currentScenario.choices.find((c) => c.key === selectedChoice)?.label || selectedChoice}
              ]
            </div>

            {feedbackStage >= 1 && (
              <div className="text-xs text-neutral-400 font-mono tracking-wider pt-2 animate-fadeIn">
                {observation.stat}
              </div>
            )}

            {feedbackStage >= 2 && (
              <div className="text-sm sm:text-base text-neutral-200 font-mono tracking-wider italic animate-fadeIn">
                "{observation.note}"
              </div>
            )}

            {feedbackStage >= 3 && (
              <div className="text-emerald-400 font-mono text-sm tracking-widest font-bold pt-4 animate-fadeIn flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                DECISION MATRIX ARCHIVED
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Instructions */}
      <div className="border-t border-neutral-800/80 pt-3 text-center text-xs text-neutral-600">
        Evaluation of instinctual altruism, curiosity, and non-linear risk tolerance.
      </div>
    </div>
  );
};
