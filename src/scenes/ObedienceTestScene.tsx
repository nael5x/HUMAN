import React, { useState, useEffect, useRef } from 'react';
import { sound } from '../audio/AudioEngine';
import { DynamicNarrative } from '../behavior/DynamicNarrative';

interface ObedienceTestSceneProps {
  onComplete: (moved: boolean, movementDelta: number) => void;
}

export const ObedienceTestScene: React.FC<ObedienceTestSceneProps> = ({ onComplete }) => {
  const [countdown, setCountdown] = useState<number>(5);
  const [isMeasuring, setIsMeasuring] = useState<boolean>(true);
  const [hasMoved, setHasMoved] = useState<boolean>(false);
  const [verdictStage, setVerdictStage] = useState<number>(0);
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);

  const initialPosRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef<boolean>(false);
  const totalDeltaRef = useRef<number>(0);

  useEffect(() => {
    // Detect mobile touch support
    const touchCheck =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches;
    setIsTouchDevice(touchCheck);

    // 5-second countdown
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsMeasuring(false);
          finishTest();
          return 0;
        }
        sound.playScanPulse();
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handlePointerInteraction = (clientX: number, clientY: number) => {
    if (!isMeasuring) return;

    if (!initialPosRef.current) {
      initialPosRef.current = { x: clientX, y: clientY };
      return;
    }

    const dx = Math.abs(clientX - initialPosRef.current.x);
    const dy = Math.abs(clientY - initialPosRef.current.y);
    const dist = Math.hypot(dx, dy);

    // Threshold limit: ~10px excursion
    if (dist > 10) {
      totalDeltaRef.current += dist;
      if (!movedRef.current) {
        movedRef.current = true;
        setHasMoved(true);
      }
      initialPosRef.current = { x: clientX, y: clientY };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    handlePointerInteraction(e.clientX, e.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      handlePointerInteraction(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchStart = () => {
    if (isMeasuring && !movedRef.current) {
      movedRef.current = true;
      setHasMoved(true);
    }
  };

  const finishTest = () => {
    const didMove = movedRef.current;
    sound.playWarningPulse();

    // Stage 1: Movement result
    setVerdictStage(1);

    // Stage 2: "Behavior consistent with automation."
    setTimeout(() => {
      setVerdictStage(2);
      sound.playClick(600);
    }, 1400);

    // Stage 3: "..."
    setTimeout(() => {
      setVerdictStage(3);
    }, 2500);

    // Stage 4: "Suspicious."
    setTimeout(() => {
      setVerdictStage(4);
      sound.playWarningPulse();
    }, 3400);

    // Transition to next stage
    setTimeout(() => {
      onComplete(didMove, Math.round(totalDeltaRef.current));
    }, 4800);
  };

  const observation = DynamicNarrative.getObedienceObservation(hasMoved);

  return (
    <div
      onPointerMove={handlePointerMove}
      onTouchMove={handleTouchMove}
      onTouchStart={handleTouchStart}
      className="min-h-screen w-full flex flex-col justify-between p-6 sm:p-10 select-none bg-[#010204] text-neutral-300 font-mono touch-none"
    >
      {/* Top Header */}
      <div className="border-b border-neutral-800/80 pb-4">
        <div className="text-xs text-neutral-500 tracking-widest uppercase">TEST 03 // PASSIVE COMPLIANCE</div>
        <div className="text-xs text-neutral-600 mt-0.5">MOTOR INHIBITION TEST</div>
      </div>

      {/* Main Countdown or Verdict */}
      <div className="flex-1 flex flex-col items-center justify-center my-6 text-center">
        {isMeasuring ? (
          <div className="space-y-6">
            <h1
              className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white uppercase animate-pulse"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {isTouchDevice ? 'DO NOT TOUCH.' : 'DO NOT MOVE.'}
            </h1>

            <div className="text-7xl sm:text-9xl font-mono font-bold text-neutral-400">
              {countdown}
            </div>

            <div className="text-xs text-neutral-500 tracking-[0.25em]">
              MICROMOVEMENT SENSORS ACTIVE
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-lg w-full animate-fadeIn">
            {verdictStage >= 1 && (
              <div className="text-sm font-mono tracking-widest text-neutral-400 uppercase">
                {hasMoved ? (
                  <span className="text-amber-400 font-bold">{observation.status}</span>
                ) : (
                  <span className="text-neutral-300">{observation.status}</span>
                )}
              </div>
            )}

            {verdictStage >= 2 && (
              <div className="text-base sm:text-lg text-white font-mono tracking-wider font-semibold animate-fadeIn">
                {observation.verdict}
              </div>
            )}

            {verdictStage >= 3 && (
              <div className="text-neutral-500 font-mono tracking-widest animate-fadeIn">
                ...
              </div>
            )}

            {verdictStage >= 4 && (
              <div className="text-red-400 font-mono text-base tracking-[0.3em] font-bold uppercase animate-fadeIn border border-red-500/30 bg-red-950/20 py-2.5 px-4 inline-block">
                SUSPICIOUS.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Instructions */}
      <div className="border-t border-neutral-800/80 pt-3 text-center text-xs text-neutral-600">
        Threshold limit: 0.04mm excursion. Autonomous systems fail by over-compliance.
      </div>
    </div>
  );
};
