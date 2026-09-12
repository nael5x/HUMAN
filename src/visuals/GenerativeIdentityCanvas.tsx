import React, { useEffect, useRef } from 'react';
import { SessionData } from '../types';

interface GenerativeIdentityCanvasProps {
  session: SessionData;
  size?: number;
  interactive?: boolean;
}

export const GenerativeIdentityCanvas: React.FC<GenerativeIdentityCanvasProps> = ({
  session,
  size = 280,
  interactive = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const interactionRef = useRef({ x: 0, y: 0, energy: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let t = 0;

    const curiosity = session.curiosity ?? session.curiosityScore ?? 75;
    const obedience = session.obedienceScoreValue ?? session.obedienceMetric ?? 50;
    const instinct = session.instinctScoreValue ?? session.instinctMetric ?? 70;
    const humanity = session.humanity ?? session.humanityScore ?? 85;
    const seed = session.seed;
    const classification = session.classification ?? 'ADAPTIVE OBSERVER';

    const complexity = Math.max(5, Math.min(12, Math.floor(4 + curiosity / 12)));
    const asymmetry = Math.max(0.08, (100 - obedience) / 100);
    const speed = 0.012 + (instinct / 100) * 0.035;
    const stability = Math.max(0.25, humanity / 100);

    const render = () => {
      t += speed;
      const interaction = interactionRef.current;
      interaction.energy *= 0.94;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2 + interaction.x * 4;
      const cy = canvas.height / 2 + interaction.y * 4;
      const baseRadius = canvas.width * 0.105;
      const green = '16, 185, 129';

      // Classification-specific structural grammar. Each result is visibly different,
      // while still using the same deterministic session DNA.
      const isLogical = classification === 'LOGICAL SUBJECT';
      const isCurious = classification === 'CURIOUS ANOMALY' || classification === 'UNSTABLE EXPLORER';
      const isNonCompliant = classification === 'NON-COMPLIANT UNIT';
      const isInstinctive = classification === 'INSTINCTIVE MODEL';
      const isEmotional = classification === 'EMOTIONAL PROCESSOR';
      const isPassive = classification === 'PASSIVE ANALYST';

      for (let r = 0; r < complexity; r++) {
        const radius = baseRadius + r * canvas.width * 0.028;
        const points = isLogical ? 6 + (seed % 3) * 2 : 42 + r * 4;
        const waveFreq = 2 + (seed % 4) + (isInstinctive ? r * 2 : r);
        const wobbleStrength =
          (isLogical ? 0.8 : 2.5 + r * 1.5 * asymmetry) *
          (1 + interaction.energy * 0.25) *
          (isNonCompliant ? 1.55 : 1);

        ctx.beginPath();
        const maxPoint = isNonCompliant && r % 3 === 1 ? Math.floor(points * 0.78) : points;
        for (let i = 0; i <= maxPoint; i++) {
          const angle = (i / points) * Math.PI * 2;
          const wave = Math.sin(angle * waveFreq + t * (r % 2 === 0 ? 1 : -1) + r + seed * 0.001);
          const emotionalPulse = isEmotional ? Math.sin(t * 2.6 + r * 0.6) * (3 + r * 0.35) : 0;
          const instinctSpike = isInstinctive && i % 5 === 0 ? 5 + r * 0.8 : 0;
          const wobble = wave * wobbleStrength + emotionalPulse + instinctSpike;
          const px = cx + Math.cos(angle) * (radius + wobble);
          const py = cy + Math.sin(angle) * (radius + wobble);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        if (!isNonCompliant || r % 3 !== 1) ctx.closePath();

        const opacity = Math.min(0.82, 0.12 + (r / complexity) * (0.45 + stability * 0.2));
        ctx.strokeStyle = r === complexity - 1 ? `rgba(${green}, ${opacity})` : `rgba(235, 238, 245, ${opacity})`;
        ctx.lineWidth = r === complexity - 1 ? 1.7 : 1;
        ctx.stroke();
      }

      if (isCurious) {
        const satellites = 3 + (seed % 4);
        for (let i = 0; i < satellites; i++) {
          const angle = t * (0.8 + i * 0.09) + (i / satellites) * Math.PI * 2;
          const orbit = canvas.width * (0.24 + (i % 2) * 0.05);
          const x = cx + Math.cos(angle) * orbit;
          const y = cy + Math.sin(angle * 1.07) * orbit;
          ctx.beginPath();
          ctx.arc(x, y, 1.8 + interaction.energy * 1.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${green}, 0.75)`;
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.08)';
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
      }

      if (isPassive) {
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(cx, cy, canvas.width * (0.31 + i * 0.045), 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      const pulse = 7 + Math.sin(t * (isEmotional ? 3.2 : 2)) * (2.5 + interaction.energy * 3);
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(3, pulse), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${green}, ${0.58 + stability * 0.25})`;
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 1;
      const arm = 12 + curiosity * 0.035;
      ctx.beginPath();
      ctx.moveTo(cx - arm, cy);
      ctx.lineTo(cx + arm, cy);
      ctx.moveTo(cx, cy - arm);
      ctx.lineTo(cx, cy + arm);
      ctx.stroke();

      if (interactive) animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [session, interactive]);

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    const rect = event.currentTarget.getBoundingClientRect();
    interactionRef.current.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    interactionRef.current.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    interactionRef.current.energy = Math.min(1, interactionRef.current.energy + 0.12);
  };

  const handlePointerLeave = () => {
    interactionRef.current.x = 0;
    interactionRef.current.y = 0;
  };

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="max-w-full h-auto aspect-square"
    />
  );
};
