import React, { useState, useEffect, useRef } from 'react';
import { sound } from '../audio/AudioEngine';
import { MotorMetrics } from '../types';
import { PointerTracker } from '../tracking/PointerTracker';
import { BehaviorEngine } from '../behavior/BehaviorEngine';

interface MotorTestSceneProps {
  onComplete: (metrics: MotorMetrics) => void;
}

export const MotorTestScene: React.FC<MotorTestSceneProps> = ({ onComplete }) => {
  const [clickCount, setClickCount] = useState<number>(0);
  const [targetPos, setTargetPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [targetScale, setTargetScale] = useState<number>(1);
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
  const targetScales = [1.0, 0.85, 1.15];

  // 3 distinct calibrated target locations (percentage coords)
  const targetLocations = [
    { x: 32, y: 42 },
    { x: 68, y: 62 },
    { x: 48, y: 35 },
  ];

  useEffect(() => {
    setTargetPos(targetLocations[0]);
    setTargetScale(targetScales[0]);
    targetSpawnTimeRef.current = performance.now();
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || isAccepted) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const t = performance.now();

    pointerTrackerRef.current.push(x, y, e.pointerType, t);

    // Live telemetry update
    const samples = pointerTrackerRef.current.getSamples();
    if (samples.length >= 3) {
      const targetPixel = {
        x: (targetPos.x / 100) * rect.width,
        y: (targetPos.y / 100) * rect.height,
      };
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

    const avgReaction = Math.round(
      reactionsRef.current.reduce((sum, val) => sum + val, 0) / reactionsRef.current.length
    );

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

    /* Aggregate the three rounds through the behavior engine so downstream
       scoring receives one genuine session-level motor profile. */
    const aggregateMetrics = BehaviorEngine.aggregateMotorRounds(roundMetricsRef.current);

    setMetrics(aggregateMetrics);

    if (nextCount < 3) {
      // Advance to next target round
      targetSpawnTimeRef.current = performance.now();
      setTargetPos(targetLocations[nextCount]);
      setTargetScale(targetScales[nextCount]);
      pointerTrackerRef.current.clear();
    } else {
      // Completed exactly 3 rounds
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
            className="absolute transition-all duration-300 ease-out cursor-crosshair transform -translate-x-1/2 -translate-y-1/2 p-4 group"
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
