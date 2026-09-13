import React, { useState, useEffect, useRef } from 'react';
import { sound } from '../audio/AudioEngine';
import { sessionMemory } from '../memory/SessionMemory';

interface InstinctTestSceneProps {
  seed: number;
  onComplete: (choice: number, reactionMs: number, switches: number) => void;
}

export const InstinctTestScene: React.FC<InstinctTestSceneProps> = ({ seed, onComplete }) => {
  const [hoveredShape, setHoveredShape] = useState<number | null>(null);
  const [selectedShape, setSelectedShape] = useState<number | null>(null);
  const [feedbackStage, setFeedbackStage] = useState<number>(0);

  const startTimeRef = useRef<number>(Date.now());
  const switchesCountRef = useRef<number>(0);
  const prevHoverRef = useRef<number | null>(null);

  const canvas1Ref = useRef<HTMLCanvasElement>(null);
  const canvas2Ref = useRef<HTMLCanvasElement>(null);
  const canvas3Ref = useRef<HTMLCanvasElement>(null);
  const canvas4Ref = useRef<HTMLCanvasElement>(null);

  // Reaction multiplier for selected specimen
  const excitationRef = useRef<number>(1.0);

  useEffect(() => {
    startTimeRef.current = Date.now();

    let animId: number;
    let frame = 0;

    const render = () => {
      frame++;
      // If a shape was selected, accelerate the excitation
      if (selectedShape !== null && excitationRef.current < 2.8) {
        excitationRef.current += 0.04;
      }
      const speedMult = excitationRef.current;
      const t = frame * 0.035 * speedMult;

      // 1. Amoeba Blob with Organic Pseudopods
      const c1 = canvas1Ref.current;
      if (c1) {
        const ctx = c1.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, c1.width, c1.height);
          const cx = c1.width / 2;
          const cy = c1.height / 2;
          ctx.beginPath();
          const baseR = 44 + (selectedShape === 0 ? Math.sin(t * 3) * 6 : 0);
          const points = 36;
          for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const wave1 = Math.sin(angle * 4 + t * 1.6) * (6 * (selectedShape === 0 ? 1.8 : 1));
            const wave2 = Math.cos(angle * 3 - t * 1.2) * (5 * (selectedShape === 0 ? 1.5 : 1));
            const r = baseR + wave1 + wave2;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fillStyle = selectedShape === 0 ? 'rgba(52, 211, 153, 0.12)' : 'rgba(255, 255, 255, 0.04)';
          ctx.fill();
          ctx.strokeStyle = selectedShape === 0 ? 'rgba(52, 211, 153, 0.9)' : 'rgba(255, 255, 255, 0.75)';
          ctx.lineWidth = selectedShape === 0 ? 2.5 : 1.5;
          ctx.stroke();

          // Internal nucleus
          ctx.beginPath();
          const nR = (selectedShape === 0 ? 12 : 8) + Math.sin(t * 3.5) * 3;
          ctx.arc(cx + Math.cos(t * 1.2) * 5, cy + Math.sin(t * 1.5) * 5, Math.max(3, nR), 0, Math.PI * 2);
          ctx.fillStyle = selectedShape === 0 ? 'rgba(52, 211, 153, 0.7)' : 'rgba(255, 255, 255, 0.5)';
          ctx.fill();
        }
      }

      // 2. Crystalline Synaptic Nerve Cluster
      const c2 = canvas2Ref.current;
      if (c2) {
        const ctx = c2.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, c2.width, c2.height);
          const cx = c2.width / 2;
          const cy = c2.height / 2;
          const nodes = 7;
          ctx.strokeStyle = selectedShape === 1 ? 'rgba(52, 211, 153, 0.9)' : 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = selectedShape === 1 ? 2 : 1.2;

          for (let i = 0; i < nodes; i++) {
            const angle = (i / nodes) * Math.PI * 2 + Math.sin(t * 0.9 + i) * 0.2;
            const r = (selectedShape === 1 ? 48 : 40) + Math.sin(t * 2.5 + i * 2) * (selectedShape === 1 ? 16 : 12);
            const nx = cx + Math.cos(angle) * r;
            const ny = cy + Math.sin(angle) * r;

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(nx, ny);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(nx, ny, selectedShape === 1 ? 4.5 : 3, 0, Math.PI * 2);
            ctx.fillStyle = selectedShape === 1 ? 'rgba(52, 211, 153, 0.95)' : 'rgba(255, 255, 255, 0.8)';
            ctx.fill();
          }
        }
      }

      // 3. Pulsing Biocellular Concentric Rings
      const c3 = canvas3Ref.current;
      if (c3) {
        const ctx = c3.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, c3.width, c3.height);
          const cx = c3.width / 2;
          const cy = c3.height / 2;
          const rings = 4;
          for (let i = 0; i < rings; i++) {
            const phaseShift = i * 0.8;
            const r = 20 + i * 12 + Math.sin(t * 2.2 + phaseShift) * (selectedShape === 2 ? 10 : 6);
            ctx.beginPath();
            ctx.arc(cx, cy, Math.max(5, r), 0, Math.PI * 2);
            ctx.strokeStyle =
              selectedShape === 2
                ? `rgba(52, 211, 153, ${0.4 + (i / rings) * 0.6})`
                : `rgba(255, 255, 255, ${0.2 + (i / rings) * 0.5})`;
            ctx.lineWidth = selectedShape === 2 ? 2 : 1.2;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }

      // 4. Undulating Filament Wave
      const c4 = canvas4Ref.current;
      if (c4) {
        const ctx = c4.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, c4.width, c4.height);
          const cy = c4.height / 2;
          ctx.beginPath();
          ctx.strokeStyle = selectedShape === 3 ? 'rgba(52, 211, 153, 0.95)' : 'rgba(255, 255, 255, 0.75)';
          ctx.lineWidth = selectedShape === 3 ? 2.5 : 1.5;
          const w = c4.width;
          const waveAmp = selectedShape === 3 ? 28 : 20;
          for (let x = 20; x < w - 20; x += 3) {
            const normX = (x - 20) / (w - 40);
            const y = cy + Math.sin(normX * 8 + t * 2.8) * waveAmp * Math.sin(normX * Math.PI);
            if (x === 20) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          // Particle tracking along wave
          const headX = 20 + ((Math.sin(t * 1.8) + 1) / 2) * (w - 40);
          const normHead = (headX - 20) / (w - 40);
          const headY = cy + Math.sin(normHead * 8 + t * 2.8) * waveAmp * Math.sin(normHead * Math.PI);
          ctx.beginPath();
          ctx.arc(headX, headY, selectedShape === 3 ? 5.5 : 4, 0, Math.PI * 2);
          ctx.fillStyle = selectedShape === 3 ? 'rgba(52, 211, 153, 1)' : 'rgba(255, 255, 255, 0.9)';
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [seed, selectedShape]);

  const handleShapeHover = (index: number) => {
    if (selectedShape !== null) return;
    if (prevHoverRef.current !== null && prevHoverRef.current !== index) {
      switchesCountRef.current += 1;
      sessionMemory.recordDecisionSwitch();
    }
    prevHoverRef.current = index;
    setHoveredShape(index);
    sound.playClick(900);
  };

  const handleSelect = (index: number) => {
    if (selectedShape !== null) return;
    const latency = Date.now() - startTimeRef.current;
    setSelectedShape(index);
    sound.playAcceptedTick();
    sessionMemory.recordReactionTime(latency);

    // Narrative timing steps
    setFeedbackStage(1); // "Selection recorded."
    setTimeout(() => {
      setFeedbackStage(2); // "You recognized something."
      sound.playScanPulse();
    }, 1100);

    setTimeout(() => {
      setFeedbackStage(3); // "...We don't know what."
    }, 2200);

    setTimeout(() => {
      setFeedbackStage(4); // "INSTINCT SAMPLE ACCEPTED"
      sound.playAcceptedTick();
    }, 3400);

    setTimeout(() => {
      onComplete(index, latency, switchesCountRef.current);
    }, 4500);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between p-6 sm:p-10 select-none bg-[#020306] overflow-hidden font-mono">
      {/* Top Header */}
      <div className="border-b border-neutral-800/80 pb-4">
        <div className="text-xs text-neutral-500 tracking-widest uppercase">TEST 02 // INTUITION PATTERN</div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
          DO NOT THINK. WHICH ONE IS ALIVE?
        </h2>
      </div>

      {/* 4 Shapes Grid */}
      <div className="flex-1 flex flex-col items-center justify-center my-6">
        <div className="grid grid-cols-2 gap-4 sm:gap-8 max-w-xl w-full">
          {[canvas1Ref, canvas2Ref, canvas3Ref, canvas4Ref].map((ref, idx) => {
            const isSelected = selectedShape === idx;
            const isOther = selectedShape !== null && !isSelected;

            return (
              <button
                key={idx}
                id={`instinct-shape-${idx}`}
                disabled={selectedShape !== null}
                onPointerEnter={() => handleShapeHover(idx)}
                onClick={() => handleSelect(idx)}
                className={`relative group aspect-square flex flex-col items-center justify-center border transition-all duration-500 rounded p-4 bg-neutral-950/70 cursor-pointer ${
                  isSelected
                    ? 'border-emerald-400 bg-emerald-950/20 shadow-[0_0_35px_rgba(52,211,153,0.3)] scale-105 z-10'
                    : isOther
                    ? 'opacity-20 border-neutral-900 scale-95 pointer-events-none'
                    : hoveredShape === idx
                    ? 'border-white shadow-[0_0_20px_rgba(255,255,255,0.1)] scale-102'
                    : 'border-neutral-800 hover:border-neutral-600'
                }`}
              >
                <div
                  className={`absolute top-2 left-2 text-[10px] font-mono tracking-widest ${
                    isSelected ? 'text-emerald-400 font-bold' : 'text-neutral-600'
                  }`}
                >
                  {isSelected ? 'STIMULUS REACTING' : `PATTERN 0${idx + 1}`}
                </div>
                <canvas ref={ref} width={180} height={180} className="w-full h-full max-w-[150px] max-h-[150px]" />
                <div className="absolute bottom-2 right-2 text-[9px] text-neutral-600 uppercase tracking-widest group-hover:text-neutral-300 transition-colors">
                  {isSelected ? '[EXCITED]' : '[SELECT]'}
                </div>
              </button>
            );
          })}
        </div>

        {/* Narrative progression after choice */}
        {selectedShape !== null && (
          <div className="mt-8 text-center space-y-3 max-w-md w-full animate-fadeIn">
            {feedbackStage >= 1 && (
              <div className="text-sm text-neutral-400 font-mono tracking-wider">
                Selection recorded. Pattern 0{selectedShape + 1} logged.
              </div>
            )}

            {feedbackStage >= 2 && (
              <div className="text-base sm:text-lg text-white font-mono tracking-widest font-semibold animate-fadeIn">
                You recognized something.
              </div>
            )}

            {feedbackStage >= 3 && (
              <div className="text-sm text-neutral-500 italic tracking-wider animate-fadeIn">
                ...We don't know what.
              </div>
            )}

            {feedbackStage >= 4 && (
              <div className="text-emerald-400 font-mono text-sm tracking-widest font-bold pt-2 animate-fadeIn flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                INSTINCT SAMPLE ACCEPTED
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Instructions */}
      <div className="border-t border-neutral-800/80 pt-3 text-center text-xs text-neutral-500">
        Non-rational perceptual classification test. Response speed measured in milliseconds.
      </div>
    </div>
  );
};
