import React, { useState, useEffect, useRef } from 'react';
import { sound } from '../audio/AudioEngine';
import { director } from '../director/ExperienceDirector';
import { sessionMemory } from '../memory/SessionMemory';
import { DynamicNarrative } from '../behavior/DynamicNarrative';

interface BehaviorRevealSceneProps {
  onComplete: () => void;
}

interface PhaseItem {
  id: string;
  name: string;
  status: string;
}

const SEQUENCE: PhaseItem[] = [
  { id: 'reaction', name: 'REACTION PROFILE', status: 'COMPLETE' },
  { id: 'motor', name: 'MOTOR PATTERN', status: 'COMPLETE' },
  { id: 'decision', name: 'DECISION MODEL', status: 'COMPLETE' },
  { id: 'predictive', name: 'PREDICTIVE PROFILE', status: 'COMPLETE' },
];

export const BehaviorRevealScene: React.FC<BehaviorRevealSceneProps> = ({ onComplete }) => {
  const [completedPhases, setCompletedPhases] = useState<PhaseItem[]>([]);
  const [observations, setObservations] = useState<string[]>([]);
  const [showObservations, setShowObservations] = useState<boolean>(false);
  const [showConclusion, setShowConclusion] = useState<boolean>(false);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    director.setNarrativeState('PREDICTING', 0.52);

    try {
      const summary = sessionMemory.getSummary();
      const realObservations = DynamicNarrative.getBehavioralObservations(summary, 2);
      setObservations(realObservations.filter(Boolean));
    } catch {
      setObservations(['Kinematic trajectory matches biological variance.']);
    }

    let currentIndex = 0;
    const intervalId = window.setInterval(() => {
      if (currentIndex < SEQUENCE.length) {
        sound.playScanPulse();
        const nextPhase = SEQUENCE[currentIndex];
        currentIndex++;
        setCompletedPhases((prev) => [...prev, nextPhase]);
      } else {
        window.clearInterval(intervalId);

        // Show real observations
        const t1 = window.setTimeout(() => {
          setShowObservations(true);
          sound.playClick(1200);
        }, 800);
        timersRef.current.push(t1);

        // Show HUMAN MODEL SUFFICIENT
        const t2 = window.setTimeout(() => {
          setShowConclusion(true);
          sound.playWarningPulse();
        }, 2400);
        timersRef.current.push(t2);

        // Transition to fake verification / camera prompt
        const t3 = window.setTimeout(() => {
          onComplete();
        }, 4400);
        timersRef.current.push(t3);
      }
    }, 650);

    timersRef.current.push(intervalId);

    return () => {
      timersRef.current.forEach((t) => {
        window.clearInterval(t);
        window.clearTimeout(t);
      });
      timersRef.current = [];
    };
  }, [onComplete]);

  return (
    <div className="min-h-screen w-full flex flex-col justify-between p-6 sm:p-10 select-none bg-[#020306] text-neutral-300 font-mono">
      {/* Top Header */}
      <div className="border-b border-neutral-800/80 pb-4">
        <div className="text-xs text-neutral-500 tracking-widest uppercase">SYSTEM TELEMETRY ARCHIVE</div>
        <h2 className="text-xl font-bold tracking-tight text-white mt-1">BEHAVIORAL SYNTHESIS</h2>
      </div>

      {/* Main Center Terminal Block */}
      <div className="flex-1 flex flex-col items-center justify-center my-6 max-w-xl mx-auto w-full">
        <div className="w-full bg-black/70 border border-neutral-800 rounded p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
          {/* Phase completion lines */}
          <div className="space-y-2.5 text-xs sm:text-sm font-mono tracking-wider">
            {completedPhases.map((phase) => (
              <div key={phase.id} className="flex justify-between items-center text-neutral-300 animate-fadeIn">
                <span>{phase.name}</span>
                <span className="text-neutral-500 hidden sm:inline">........................</span>
                <span className="text-emerald-400 font-bold ml-2">{phase.status}</span>
              </div>
            ))}
          </div>

          {/* Genuine behavioral observations based on SessionMemory */}
          {showObservations && (
            <div className="border-t border-neutral-800 pt-5 space-y-2 animate-fadeIn">
              <div className="text-[10px] text-neutral-500 tracking-widest uppercase">
                RECORDED CHARACTERISTICS
              </div>
              {observations.map((obs, i) => (
                <div key={i} className="text-sm sm:text-base text-neutral-100 font-medium italic">
                  "{obs}"
                </div>
              ))}
            </div>
          )}

          {/* The key narrative moment: HUMAN MODEL SUFFICIENT */}
          {showConclusion && (
            <div className="border-t border-neutral-800 pt-6 text-center space-y-2 animate-fadeIn">
              <div className="text-lg sm:text-2xl font-black tracking-widest text-white uppercase">
                HUMAN <span className="text-emerald-400 underline decoration-emerald-500/50 underline-offset-4">MODEL</span> SUFFICIENT
              </div>
              <p className="text-xs text-neutral-500 tracking-wider">
                Behavioral envelope matches target parameters.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-neutral-800/80 pt-3 text-center text-xs text-neutral-600">
        Phase 1 Profile Extraction Concluded.
      </div>
    </div>
  );
};
