import React, { useState, useEffect, useRef } from 'react';
import { sound } from '../audio/AudioEngine';
import { MotorMetrics } from '../types';
import { PointerTracker } from '../tracking/PointerTracker';
import { BehaviorEngine } from '../behavior/BehaviorEngine';
import { sessionMemory } from '../memory/SessionMemory';

interface MotorTestSceneProps {
  onComplete: (metrics: MotorMetrics) => void;
}

export const MotorTestScene: React.FC<MotorTestSceneProps> = ({ onComplete }) => {
  const [clickCount, setClickCount] = useState<number>(0);
  const [targetPos, setTargetPos] = useState<{ x: number; y: number }>({ x: 32, y: 42 });
  const [targetScale, setTargetScale] = useState<number>(1);
  const [instructionHint, setInstructionHint] = useState<string>('ACQUIRE CALIBRATION TARGET');
  const [metrics, setMetrics] = useState<MotorMetrics>({
    velocity: 0.0,
    trajectory: 'linear',
    hesitationMs: 0,
    corrections: 0,
    overshoots: 0,
    reactionTimeMs: 0,
    score: 75,
  });
  const [isAccepted, setIsAccepted] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const pointerTrackerRef = useRef(new PointerTracker(60));
  const targetSpawnTimeRef = useRef<number>(performance.now());
  const reactionsRef = useRef<number[]>([]);
  const roundMetricsRef = useRef<MotorMetrics[]>([]);
  const targetScales = [1.0, 0.9, 1.1];

  // 3 calibrated base target coordinates (% of container)
  const targetBaseLocations = [
    { x: 32, y: 42 },
    { x: 68, y: 58 },
    { x: 48, y: 36 },
  ];

  // Round 2 continuous subtle movement offset
  const animFrameRef = useRef<number | null>(null);

  // Round 3 deceptive dodge flag
  const hasDodgedRef = useRef<boolean>(false);

  useEffect(() => {
    setTargetPos(targetBaseLocations[0]);
    setTargetScale(targetScales[0]);
    targetSpawnTimeRef.current = performance.now();
    setInstructionHint('TARGET 01: CALIBRATE STATIC VELOCITY');

    return () => {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Round 2 continuous subtle drift loop
  useEffect(() => {
    if (clickCount === 1) {
      setInstructionHint('TARGET 02: DYNAMIC DRIFT TRACKING');
      let startT = performance.now();
      const base = targetBaseLocations[1];

      const drift = (now: number) => {
        const elapsed = (now - startT) / 1000;
        // Subtle, smooth harmonic oscillation (±3.5% horizontal, ±2.5% vertical)
        const dx = Math.sin(elapsed * 1.8) * 3.8;
        const dy = Math.cos(elapsed * 1.4) * 2.8;
        setTargetPos({ x: base.x + dx, y: base.y + dy });
        animFrameRef.current = requestAnimationFrame(drift);
      };

      animFrameRef.current = requestAnimationFrame(drift);
      return () => {
        if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
      };
    } else if (clickCount === 2) {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
      setInstructionHint('TARGET 03: COMPENSATION REFLEX TEST');
      setTargetPos(targetBaseLocations[2]);
      hasDodgedRef.current = false;
    }
  }, [clickCount]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || isAccepted) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const t = performance.now();

    pointerTrackerRef.current.push(x, y, e.pointerType, t);

    const targetPixel = {
      x: (targetPos.x / 100) * rect.width,
      y: (targetPos.y / 100) * rect.height,
    };

    // Round 3: Subtle deceptive movement (micro-dodge once when pointer gets close)
    if (clickCount === 2 && !hasDodgedRef.current) {
      const distToPointer = Math.hypot(x - targetPixel.x, y - targetPixel.y);
      if (distToPointer < 65 && distToPointer > 10) {
        hasDodgedRef.current = true;
        sound.playScanPulse();
        // Shift target subtly by ~4% to induce biological correction
        const dodgeX = x < targetPixel.x ? 5 : -5;
        const dodgeY = y < targetPixel.y ? 4.5 : -4.5;
        setTargetPos((prev) => ({
          x: Math.max(15, Math.min(85, prev.x + dodgeX)),
          y: Math.max(18, Math.min(82, prev.y + dodgeY)),
        }));
      }
    }

    // Live telemetry update
    const samples = pointerTrackerRef.current.getSamples();
    if (samples.length >= 3) {
      const telemetry = BehaviorEngine.analyzePointerStream(samples, 0, targetPixel);
      setMetrics((prev) => ({
        ...prev,
        velocity: telemetry.averageSpeed,
        trajectory: telemetry.trajectory,
        corrections: telemetry.corrections,
        overshoots: telemetry.overshoots,
      }));
    }
  };

  const handleTargetClick = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (isAccepted) return;

    sound.playClick(1500);
    const now = performance.now();
    const reaction = Math.round(now - targetSpawnTimeRef.current);
    reactionsRef.current.push(reaction);
    sessionMemory.recordReactionTime(reaction);

    const rect = containerRef.current?.getBoundingClientRect();
    const targetPixel = rect
      ? { x: (targetPos.x / 100) * rect.width, y: (targetPos.y / 100) * rect.height }
      : undefined;

    const telemetry = BehaviorEngine.analyzePointerStream(
      pointerTrackerRef.current.getSamples(),
      reaction,
      targetPixel
    );
    const roundScore = BehaviorEngine.calculateMotorScore(telemetry);

    const nextCount = clickCount + 1;
    setClickCount(nextCount);

    const currentMetrics: MotorMetrics = {
      velocity: telemetry.averageSpeed,
      trajectory: telemetry.trajectory,
      hesitationMs: telemetry.hoverHesitationMs,
      corrections: telemetry.corrections,
      overshoots: telemetry.overshoots,
      reactionTimeMs: reaction,
      score: roundScore,
      totalDistance: telemetry.totalDistance,
      maxVelocity: telemetry.maxSpeed,
      directionChanges: telemetry.directionChanges,
      idleTimeMs: telemetry.idleTimeMs,
    };
    roundMetricsRef.current.push(currentMetrics);

    const aggregateMetrics = BehaviorEngine.aggregateMotorRounds(roundMetricsRef.current);
    setMetrics(aggregateMetrics);

    if (nextCount < 3) {
      targetSpawnTimeRef.current = performance.now();
      setTargetPos(targetBaseLocations[nextCount]);
      setTargetScale(targetScales[nextCount]);
      pointerTrackerRef.current.clear();
    } else {
      setIsAccepted(true);
      sound.playAcceptedTick();
      setTimeout(() => {
        onComplete(aggregateMetrics);
      }, 1500);
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      className="relative min-h-screen w-full flex flex-col justify-between p-6 sm:p-10 select-none bg-[#020306] overflow-hidden font-mono"
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-800/80 pb-4">
        <div>
          <div className="text-xs text-neutral-500 tracking-widest uppercase">TEST 01 // KINEMATICS</div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
            CLICK LIKE A HUMAN
          </h2>
          <div className="text-[11px] text-neutral-400 mt-0.5 tracking-wider">{instructionHint}</div>
        </div>
        <div className="mt-2 sm:mt-0 text-xs text-neutral-400">
          TARGET SAMPLE: <span className="text-emerald-400 font-bold">{Math.min(3, clickCount + 1)} / 3</span>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="relative flex-1 w-full my-6 flex items-center justify-center touch-none">
        {/* Real-time Cinematic Telemetry Overlay */}
        <div className="absolute top-2 left-2 p-3.5 bg-black/75 border border-neutral-800 rounded font-mono text-xs space-y-2 w-48 z-20 backdrop-blur-md shadow-lg">
          <div className="text-neutral-500 pb-1.5 border-b border-neutral-800/80 text-[10px] tracking-wider uppercase font-semibold">
            MOTOR TELEMETRY
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">VELOCITY</span>
            <span className="text-neutral-200">{metrics.velocity.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">TRAJECTORY</span>
            <span
              className={`text-xs font-bold ${
                metrics.trajectory === 'erratic'
                  ? 'text-amber-400'
                  : metrics.trajectory === 'irregular'
                  ? 'text-neutral-300'
                  : 'text-emerald-400'
              }`}
            >
              {metrics.trajectory.toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">HESITATION</span>
            <span className="text-neutral-200">{metrics.hesitationMs}ms</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">CORRECTIONS</span>
            <span className="text-neutral-200">+{metrics.corrections}</span>
          </div>
        </div>

        {/* Center Crosshair Target */}
        {!isAccepted ? (
          <div
            onPointerDown={handleTargetClick}
            id="motor-target"
            className="absolute transition-transform duration-100 ease-out cursor-crosshair transform -translate-x-1/2 -translate-y-1/2 p-4 group"
            style={{
              left: `${targetPos.x}%`,
              top: `${targetPos.y}%`,
              transform: `translate(-50%, -50%) scale(${targetScale})`,
            }}
          >
            <div className="relative w-10 h-10 flex items-center justify-center">
              {/* Outer pulse ring */}
              <div className="absolute inset-0 rounded-full border border-neutral-500 group-hover:border-emerald-400 animate-ping opacity-25" />
              {/* Target reticle border */}
              <div className="absolute inset-1 rounded-full border border-neutral-400 group-hover:border-white transition-colors" />
              {/* Center pip */}
              <div className="w-1.5 h-1.5 bg-red-400 rounded-full group-hover:bg-emerald-400 transition-colors" />
            </div>
          </div>
        ) : (
          <div className="text-center space-y-2 animate-fadeIn z-20">
            <div className="text-emerald-400 font-mono text-sm sm:text-base tracking-widest font-bold flex items-center justify-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              MOTOR SAMPLE ACCEPTED
            </div>
            <p className="text-xs text-neutral-500 font-mono tracking-wider">
              Pattern matches biological neuromuscular irregularity.
            </p>
          </div>
        )}
      </div>

      {/* Footer Instructions */}
      <div className="border-t border-neutral-800/80 pt-3 text-center text-xs text-neutral-500 font-mono">
        Acquiring neuromuscular feedback and pointer acceleration curve.
      </div>
    </div>
  );
};
