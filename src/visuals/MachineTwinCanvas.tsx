import React, { useEffect, useRef } from 'react';
import { MachineDNA, SeededRandom, EndingType } from '../dna/MachineDNA';

interface MachineTwinCanvasProps {
  dna: MachineDNA;
  ending: EndingType;
  interactive?: boolean;
  qualityTier?: 'desktop' | 'tablet' | 'mobile';
  assemblyProgress?: number; // 0.0 to 1.0 (for gradual layer reveal)
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRadius: number;
  alpha: number;
  orbitAngle: number;
  orbitDist: number;
  orbitSpeed: number;
  seedOffset: number;
}

/**
 * MachineTwinCanvas
 * Procedural biological-mechanical organism assembled deterministically from MachineDNA.
 * Respects performance tiers, reduced-motion preferences, and subtle tactile pointer interaction.
 */
export const MachineTwinCanvas: React.FC<MachineTwinCanvasProps> = ({
  dna,
  ending,
  interactive = true,
  qualityTier = 'desktop',
  assemblyProgress = 1.0,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mouseRef = useRef({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    isHovering: false,
    clickEnergy: 0,
    speed: 0,
    lastX: 0,
    lastY: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let cancelled = false;
    let isTabVisible = !document.hidden;

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible && !cancelled) {
        cancelAnimationFrame(animId);
        animId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Auto-detect tier if not explicitly specified
    const detectedTier = qualityTier || (
      typeof window !== 'undefined' && window.innerWidth < 640 ? 'mobile' :
      typeof window !== 'undefined' && window.innerWidth < 1024 ? 'tablet' : 'desktop'
    );

    // Check prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Quality tier constants
    const particleMultiplier =
      detectedTier === 'mobile' ? 0.35 : detectedTier === 'tablet' ? 0.65 : 1.0;
    const shellLayersCount =
      detectedTier === 'mobile' ? 4 : detectedTier === 'tablet' ? 6 : 8;

    // Seeded random initialization for deterministic geometry
    const rng = new SeededRandom(dna.seed);

    // Assembly thresholds:
    // CORE: 0.0 -> 0.25
    // STRUCTURE: 0.2 -> 0.50
    // SIGNAL LINES: 0.45 -> 0.70
    // SENSORS: 0.65 -> 0.85
    // PARTICLES / AURA: 0.80 -> 1.0
    const p = Math.max(0, Math.min(1, assemblyProgress));
    const showCore = p > 0.05;
    const showStructure = p > 0.2;
    const showSignals = p > 0.45;
    const showSensors = p > 0.65;
    const showParticles = p > 0.8;

    // Generate deterministic particles based on DNA
    const baseParticleCount = Math.floor(
      (25 + dna.curiosity * 55 + dna.motorChaos * 30) * particleMultiplier
    );
    const particles: Particle[] = [];

    for (let i = 0; i < baseParticleCount; i++) {
      const angle = rng.range(0, Math.PI * 2);
      const dist = rng.range(28, 145);
      particles.push({
        x: 0,
        y: 0,
        vx: rng.range(-0.4, 0.4),
        vy: rng.range(-0.4, 0.4),
        baseRadius: rng.range(1.0, 2.4),
        alpha: rng.range(0.2, 0.75),
        orbitAngle: angle,
        orbitDist: dist,
        orbitSpeed: (rng.range(0.003, 0.012) + dna.instinct * 0.008) * (rng.next() > 0.5 ? 1 : -1),
        seedOffset: rng.range(0, 1000),
      });
    }

    // Colors according to Ending
    // VERIFIED: clinical emerald + crisp titanium white
    // ANOMALY: violet/amber + subtle warning crimson
    // MACHINE: cold sharp cyan + stark white
    // REPLACED: dual-phase pale emerald + phantom crimson echo
    const getEndingColors = () => {
      switch (ending) {
        case 'ANOMALY':
          return {
            primary: '245, 158, 11',    // amber
            accent: '239, 68, 68',      // red
            aura: 'rgba(245, 158, 11, 0.08)',
          };
        case 'MACHINE':
          return {
            primary: '56, 189, 248',    // sky/cyan
            accent: '240, 249, 255',    // cold white
            aura: 'rgba(56, 189, 248, 0.07)',
          };
        case 'REPLACED':
          return {
            primary: '52, 211, 153',    // emerald
            accent: '244, 63, 94',      // rose echo
            aura: 'rgba(52, 211, 153, 0.09)',
          };
        case 'VERIFIED':
        default:
          return {
            primary: '16, 185, 129',    // emerald
            accent: '228, 228, 231',    // titanium neutral
            aura: 'rgba(16, 185, 129, 0.06)',
          };
      }
    };

    const colors = getEndingColors();
    let t = dna.seed * 0.01;

    // Movement responsiveness derived from Session DNA:
    // High motor speed -> snappier mouse follow
    // High hesitation -> slight sluggish easing
    const mouseFollowEase = Math.max(
      0.03,
      Math.min(0.18, 0.08 + dna.instinct * 0.06 - dna.hesitation * 0.04)
    );

    const render = () => {
      if (cancelled) return;

      const timeIncrement = prefersReducedMotion
        ? 0.004
        : 0.012 + dna.instinct * 0.022 * (dna.predictability > 0.7 ? 1 : 0.85);
      t += timeIncrement;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const m = mouseRef.current;
      m.x += (m.targetX - m.x) * mouseFollowEase;
      m.y += (m.targetY - m.y) * mouseFollowEase;
      m.clickEnergy *= 0.92;
      m.speed *= 0.88;

      const cx = w / 2 + m.x * 0.35;
      const cy = h / 2 + m.y * 0.35;

      // 1. AURA / FIELD (Assembly Layer 5)
      if (showParticles) {
        const auraRadius = Math.min(w, h) * (0.34 + dna.curiosity * 0.12);
        const auraGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, auraRadius);
        auraGrad.addColorStop(0, colors.aura);
        auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, auraRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. SHELL / STRUCTURAL GEOMETRIC LAYERS (Assembly Layer 2)
      if (showStructure) {
        const baseRadius = Math.min(w, h) * 0.12;
        const asymmetryOffset = (1 - dna.obedience) * 16;
        const organicPulse = dna.humanity * Math.sin(t * 1.8) * 3;

        for (let r = 0; r < shellLayersCount; r++) {
          const layerNorm = r / (shellLayersCount - 1);
          const currentRadius =
            baseRadius +
            r * (Math.min(w, h) * 0.032) +
            (dna.motorChaos * Math.sin(t * 3.5 + r) * 4);

          // Predictability: High predictability -> round symmetric polygon; Low -> distorted harmonic
          const pointsCount = dna.predictability > 0.7 ? 6 + (r % 3) * 2 : 28 + r * 4;
          const wobble =
            (2.2 + r * 1.2) *
            (1 + (1 - dna.obedience) * 0.8) *
            (1 + m.clickEnergy * 0.5);

          ctx.beginPath();
          for (let i = 0; i <= pointsCount; i++) {
            const angle = (i / pointsCount) * Math.PI * 2;
            const wave = Math.sin(
              angle * (3 + (r % 2)) +
                t * (r % 2 === 0 ? 1 : -1) +
                r * 0.8 +
                dna.seed * 0.001
            );
            const rOffset =
              wave * wobble +
              organicPulse +
              (i % 2 === 0 ? asymmetryOffset * (r % 2 === 0 ? 1 : -1) * 0.2 : 0);
            const px = cx + Math.cos(angle) * (currentRadius + rOffset);
            const py = cy + Math.sin(angle) * (currentRadius + rOffset);

            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();

          const opacity = Math.max(
            0.12,
            Math.min(0.85, 0.18 + layerNorm * 0.55 * (0.5 + dna.humanity * 0.5))
          );
          ctx.strokeStyle =
            r === shellLayersCount - 1
              ? `rgba(${colors.primary}, ${opacity})`
              : `rgba(${colors.accent}, ${opacity * 0.7})`;
          ctx.lineWidth = r === shellLayersCount - 1 ? 1.8 : 1.0;
          ctx.stroke();

          // Rare REPLACED ending: phantom duplicate shell echo
          if (ending === 'REPLACED' && r % 2 === 0) {
            ctx.beginPath();
            ctx.arc(cx + 4, cy - 3, currentRadius * 0.94, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${colors.accent}, ${opacity * 0.35})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // 3. SIGNAL LINES / NETWORK NODES (Assembly Layer 3)
      if (showSignals) {
        const signalNodesCount = Math.floor(4 + dna.curiosity * 8);
        const signalRadius = Math.min(w, h) * 0.24;

        ctx.strokeStyle = `rgba(${colors.primary}, 0.28)`;
        ctx.lineWidth = 0.8;

        for (let i = 0; i < signalNodesCount; i++) {
          const angle =
            (i / signalNodesCount) * Math.PI * 2 +
            t * (0.4 + (i % 2) * 0.2) * (prefersReducedMotion ? 0.3 : 1);
          const nodeDist = signalRadius + Math.sin(t * 2 + i) * (dna.motorChaos * 12);
          const nx = cx + Math.cos(angle) * nodeDist;
          const ny = cy + Math.sin(angle) * nodeDist;

          // Connect to core center
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(nx, ny);
          ctx.stroke();

          // Connect adjacent signals
          if (i > 0 && dna.predictability > 0.4) {
            const prevAngle =
              ((i - 1) / signalNodesCount) * Math.PI * 2 +
              t * (0.4 + ((i - 1) % 2) * 0.2) * (prefersReducedMotion ? 0.3 : 1);
            const prevDist = signalRadius + Math.sin(t * 2 + (i - 1)) * (dna.motorChaos * 12);
            ctx.beginPath();
            ctx.moveTo(nx, ny);
            ctx.lineTo(cx + Math.cos(prevAngle) * prevDist, cy + Math.sin(prevAngle) * prevDist);
            ctx.strokeStyle = `rgba(${colors.primary}, 0.15)`;
            ctx.stroke();
          }
        }
      }

      // 4. SENSORS / SATELLITES (Assembly Layer 4)
      if (showSensors) {
        const sensorCount = Math.floor(3 + dna.curiosity * 9);
        for (let i = 0; i < sensorCount; i++) {
          const speed = (0.3 + i * 0.08) * (i % 2 === 0 ? 1 : -1);
          const orbit =
            Math.min(w, h) * (0.22 + (i % 3) * 0.05 + dna.exploration * 0.08);
          const angle =
            t * speed +
            (i / sensorCount) * Math.PI * 2 +
            dna.seed * 0.01;
          const sx = cx + Math.cos(angle) * orbit;
          const sy = cy + Math.sin(angle * 1.05) * orbit;

          ctx.beginPath();
          ctx.arc(sx, sy, 2.2 + m.clickEnergy * 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${colors.primary}, 0.85)`;
          ctx.fill();

          // Sensor targeting reticle tick
          if (i % 2 === 0) {
            ctx.beginPath();
            ctx.arc(sx, sy, 5.5, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${colors.primary}, 0.35)`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // 5. PARTICLES FIELD (Assembly Layer 5)
      if (showParticles) {
        particles.forEach((pt) => {
          pt.orbitAngle += pt.orbitSpeed;
          const distMod = Math.sin(t * 1.5 + pt.seedOffset) * 8 * dna.motorChaos;
          const targetDist = pt.orbitDist + distMod + m.speed * 15;
          pt.x = cx + Math.cos(pt.orbitAngle) * targetDist;
          pt.y = cy + Math.sin(pt.orbitAngle) * targetDist;

          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.baseRadius * (1 + m.clickEnergy * 0.6), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${colors.primary}, ${pt.alpha})`;
          ctx.fill();
        });
      }

      // 6. CORE / NUCLEUS (Assembly Layer 1)
      if (showCore) {
        const corePulse =
          (1 + Math.sin(t * (2.4 + dna.instinct * 2.8)) * 0.18) *
          (1 + m.clickEnergy * 0.7);
        const coreRadius = Math.min(w, h) * 0.045 * corePulse;

        // Core glow
        const coreGrad = ctx.createRadialGradient(cx, cy, 1, cx, cy, coreRadius * 2.2);
        coreGrad.addColorStop(0, `rgba(${colors.primary}, 0.95)`);
        coreGrad.addColorStop(0.5, `rgba(${colors.primary}, 0.35)`);
        coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, coreRadius * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Inner nucleus
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, coreRadius * 0.55, 0, Math.PI * 2);
        ctx.fill();

        // Rare REPLACED ending: double interior nucleus
        if (ending === 'REPLACED') {
          ctx.fillStyle = `rgba(${colors.accent}, 0.85)`;
          ctx.beginPath();
          ctx.arc(cx + 6, cy - 4, coreRadius * 0.45, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelled = true;
      cancelAnimationFrame(animId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      particles.length = 0;
    };
  }, [dna, ending, qualityTier, assemblyProgress]);

  // Pointer and Touch Interaction Handlers
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    const m = mouseRef.current;
    const dx = x - m.lastX;
    const dy = y - m.lastY;
    m.speed = Math.min(2.5, Math.hypot(dx, dy) * 0.05);
    m.lastX = x;
    m.lastY = y;
    m.targetX = x * 0.45;
    m.targetY = y * 0.45;
    m.isHovering = true;
  };

  const handlePointerLeave = () => {
    const m = mouseRef.current;
    // Obedience influence on return behavior:
    // High obedience: quickly returns to center
    // Low obedience: drifts slowly
    m.targetX = 0;
    m.targetY = 0;
    m.isHovering = false;
    m.speed = 0;
  };

  const handlePointerDown = () => {
    if (!interactive) return;
    mouseRef.current.clickEnergy = 1.0;
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      className={`relative flex items-center justify-center select-none overflow-hidden touch-none ${className}`}
    >
      <canvas
        ref={canvasRef}
        width={420}
        height={420}
        className="w-full h-full object-contain cursor-crosshair"
      />
    </div>
  );
};
