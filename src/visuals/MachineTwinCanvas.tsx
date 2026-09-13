import React, { useEffect, useRef } from 'react';
import { MachineDNA, EndingType, SeededRandom } from '../dna/MachineDNA';
import { computeMachineTwinProfile, MachineTwinVisualProfile } from './MachineTwinProfile';

export interface MachineTwinCanvasProps {
  dna: MachineDNA;
  ending: EndingType;
  profile?: MachineTwinVisualProfile; // Optional pre-computed visual profile
  interactive?: boolean;
  qualityTier?: 'desktop' | 'tablet' | 'mobile';
  assemblyProgress?: number; // 0.0 to 1.0 (for gradual layer reveal in reconstruction)
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
 * Encodes behavioral traits via MachineTwinVisualProfile into geometry, symmetry,
 * orbital reticles, network topology, and particle dynamics.
 * Respects performance quality tiers, reduced-motion preferences, and subtle tactile pointer interaction.
 */
export const MachineTwinCanvas: React.FC<MachineTwinCanvasProps> = ({
  dna,
  ending,
  profile: customProfile,
  interactive = true,
  qualityTier,
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

    // Auto-detect tier if not explicitly specified
    const detectedTier =
      qualityTier ||
      (typeof window !== 'undefined' && window.innerWidth < 640
        ? 'mobile'
        : typeof window !== 'undefined' && window.innerWidth < 1024
          ? 'tablet'
          : 'desktop');

    // Check prefers-reduced-motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Compute or use provided visual profile
    const profile =
      customProfile ||
      computeMachineTwinProfile(dna, ending, {
        qualityTier: detectedTier,
        prefersReducedMotion,
      });

    // Handle tab visibility changes without erratic time jumps or duplicate RAF loops
    let lastFrameTime = performance.now();
    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible && !cancelled) {
        lastFrameTime = performance.now();
        cancelAnimationFrame(animId);
        animId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Seeded random for deterministic particle field
    const rng = new SeededRandom(dna.seed);

    // Assembly thresholds:
    // CORE: 0.05
    // STRUCTURE: 0.20
    // SIGNAL LINES: 0.45
    // SENSORS: 0.65
    // PARTICLES / AURA: 0.80
    const p = Math.max(0, Math.min(1, assemblyProgress));
    const showCore = p > 0.05;
    const showStructure = p > 0.2;
    const showSignals = p > 0.45;
    const showSensors = p > 0.65;
    const showParticles = p > 0.8;

    // Pre-allocate deterministic particles according to profile density
    const particleCount = Math.floor(25 + profile.particleDensity * 45);
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = rng.range(0, Math.PI * 2);
      const dist = rng.range(28, 150);
      particles.push({
        x: 0,
        y: 0,
        vx: rng.range(-0.4, 0.4),
        vy: rng.range(-0.4, 0.4),
        baseRadius: rng.range(1.0, 2.4),
        alpha: rng.range(0.2, 0.75),
        orbitAngle: angle,
        orbitDist: dist,
        orbitSpeed:
          (rng.range(0.003, 0.012) + (1 - dna.hesitation) * 0.006) *
          (rng.next() > 0.5 ? 1 : -1),
        seedOffset: rng.range(0, 1000),
      });
    }

    const colors = profile.colors;
    let t = (dna.seed % 1000) * 0.01;

    // Pointer follow easing
    const mouseFollowEase = Math.max(
      0.03,
      Math.min(0.20, profile.sensorResponsiveness + 0.04)
    );

    const render = (nowTime: number) => {
      if (cancelled || !isTabVisible) return;

      // Delta time calculation with clamp to prevent skips after tab reactivation
      const dt = Math.min(0.064, (nowTime - lastFrameTime) / 1000 || 0.016);
      lastFrameTime = nowTime;

      const timeIncrement =
        dt *
        (prefersReducedMotion ? 0.35 : 1.0) *
        (0.6 + profile.corePulseRate * 0.4);
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
        const auraRadius = Math.min(w, h) * profile.particleFieldRadius;
        const auraGrad = ctx.createRadialGradient(cx, cy, 8, cx, cy, auraRadius);
        auraGrad.addColorStop(0, colors.auraRgba);
        auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, auraRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. SHELL / STRUCTURAL GEOMETRIC LAYERS (Assembly Layer 2)
      if (showStructure) {
        const shellCount = profile.shellCount;
        const baseRadius = Math.min(w, h) * 0.12;
        const isHighSymmetry = profile.structuralSymmetry > 0.68;
        const asymmetryOffset = profile.structuralAsymmetry * 18;
        const organicPulse =
          (1 - profile.structuralSymmetry) * Math.sin(t * 1.8) * 3;

        for (let r = 0; r < shellCount; r++) {
          const layerNorm = r / (shellCount - 1 || 1);
          const currentRadius =
            baseRadius +
            r * (Math.min(w, h) * profile.shellSpacing) +
            (profile.structuralJitter * Math.sin(t * 3.2 + r) * 4);

          // Points count & topology:
          // High symmetry -> crisp regular polygon (e.g. 6 or 8 vertices)
          // Low symmetry -> organic wave modes
          const pointsCount = isHighSymmetry
            ? profile.structuralComplexity
            : Math.floor(24 + r * 4);

          const wobble =
            (2.0 + r * 1.2) *
            (1 - profile.structuralSymmetry * 0.75) *
            (1 + profile.structuralJitter * 0.8) *
            (1 + m.clickEnergy * 0.4);

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
              (i % 2 === 0 ? asymmetryOffset * (r % 2 === 0 ? 1 : -1) * 0.25 : 0);
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
            r === shellCount - 1
              ? `rgba(${colors.primaryRgb}, ${opacity})`
              : `rgba(${colors.accentRgb}, ${opacity * 0.75})`;
          ctx.lineWidth = r === shellCount - 1 ? 1.8 : 1.0;
          ctx.stroke();

          // REPLACED ending: phantom duplicate shell echo
          if (profile.phantomShellEcho && r % 2 === 0) {
            ctx.beginPath();
            ctx.arc(
              cx + profile.coreEchoOffset.x * 0.8,
              cy + profile.coreEchoOffset.y * 0.8,
              currentRadius * 0.94,
              0,
              Math.PI * 2
            );
            ctx.strokeStyle = `rgba(${colors.accentRgb}, ${opacity * 0.35})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // 3. SIGNAL NETWORK FILAMENTS (Assembly Layer 3)
      if (showSignals) {
        const signalNodesCount = profile.networkNodeCount;
        const signalRadius = Math.min(w, h) * profile.networkRadius;

        ctx.strokeStyle = `rgba(${colors.primaryRgb}, 0.28)`;
        ctx.lineWidth = 0.8;

        const nodeCoords: Array<{ x: number; y: number }> = [];

        for (let i = 0; i < signalNodesCount; i++) {
          const angle =
            (i / signalNodesCount) * Math.PI * 2 +
            t * (0.3 + (i % 2) * 0.15) * (prefersReducedMotion ? 0.3 : 1);
          const nodeDist =
            signalRadius +
            Math.sin(t * profile.networkPulseSpeed + i) *
              (profile.instability * 14);
          const nx = cx + Math.cos(angle) * nodeDist;
          const ny = cy + Math.sin(angle) * nodeDist;
          nodeCoords.push({ x: nx, y: ny });

          // Center-to-node radial line
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(nx, ny);
          ctx.stroke();

          // Signal pulse marker traveling along line
          const pulsePhase = (t * profile.networkPulseSpeed * 0.5 + i * 0.2) % 1;
          const px = cx + (nx - cx) * pulsePhase;
          const py = cy + (ny - cy) * pulsePhase;
          ctx.beginPath();
          ctx.arc(px, py, 1.4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${colors.primaryRgb}, 0.65)`;
          ctx.fill();
        }

        // Inter-node connections (geodesic if stable, crossing chords if unstable)
        if (profile.networkStability > 0.45) {
          for (let i = 0; i < nodeCoords.length; i++) {
            const nextNode = nodeCoords[(i + 1) % nodeCoords.length];
            ctx.beginPath();
            ctx.moveTo(nodeCoords[i].x, nodeCoords[i].y);
            ctx.lineTo(nextNode.x, nextNode.y);
            ctx.strokeStyle = `rgba(${colors.primaryRgb}, 0.16)`;
            ctx.stroke();
          }
        } else {
          // Turbulent crossing filaments
          for (let i = 0; i < nodeCoords.length; i += 2) {
            const targetIdx = (i + 3) % nodeCoords.length;
            ctx.beginPath();
            ctx.moveTo(nodeCoords[i].x, nodeCoords[i].y);
            ctx.lineTo(nodeCoords[targetIdx].x, nodeCoords[targetIdx].y);
            ctx.strokeStyle = `rgba(${colors.primaryRgb}, 0.12)`;
            ctx.stroke();
          }
        }
      }

      // 4. SENSOR SATELLITES & RETICLES (Assembly Layer 4)
      if (showSensors) {
        const sensorCount = profile.sensorCount;
        for (let i = 0; i < sensorCount; i++) {
          const speed =
            (0.25 + i * 0.07) *
            profile.sensorResponsiveness *
            8 *
            (i % 2 === 0 ? 1 : -1);
          const orbit =
            Math.min(w, h) *
            (profile.sensorOrbitRadius + (i % 3) * 0.03);
          const angle =
            t * speed +
            (i / sensorCount) * Math.PI * 2 +
            dna.seed * 0.01;

          const ecc = profile.sensorOrbitEccentricity;
          const sx = cx + Math.cos(angle) * orbit;
          const sy = cy + Math.sin(angle) * orbit * (1 - ecc);

          // Sensor dot
          ctx.beginPath();
          ctx.arc(sx, sy, 2.2 + m.clickEnergy * 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${colors.primaryRgb}, 0.88)`;
          ctx.fill();

          // Reticle ring
          if (profile.sensorReticleComplexity >= 2) {
            ctx.beginPath();
            ctx.arc(sx, sy, 5.5, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${colors.primaryRgb}, 0.38)`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }

          // Reticle crosshair ticks
          if (profile.sensorReticleComplexity >= 3) {
            ctx.beginPath();
            ctx.moveTo(sx - 7, sy);
            ctx.lineTo(sx + 7, sy);
            ctx.moveTo(sx, sy - 7);
            ctx.lineTo(sx, sy + 7);
            ctx.strokeStyle = `rgba(${colors.accentRgb}, 0.35)`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }

      // 5. PARTICLES FIELD (Assembly Layer 5)
      if (showParticles) {
        particles.forEach((pt) => {
          pt.orbitAngle += pt.orbitSpeed * profile.particleVelocity;
          const distMod =
            Math.sin(t * 1.5 + pt.seedOffset) * 8 * profile.particleTurbulence;
          const targetDist =
            pt.orbitDist * (profile.particleFieldRadius / 0.38) +
            distMod +
            m.speed * 12;
          pt.x = cx + Math.cos(pt.orbitAngle) * targetDist;
          pt.y = cy + Math.sin(pt.orbitAngle) * targetDist;

          ctx.beginPath();
          ctx.arc(
            pt.x,
            pt.y,
            pt.baseRadius * (1 + m.clickEnergy * 0.5),
            0,
            Math.PI * 2
          );
          const alpha = pt.alpha * profile.particlePersistence;
          ctx.fillStyle = `rgba(${colors.primaryRgb}, ${alpha})`;
          ctx.fill();
        });
      }

      // 6. CORE / NUCLEUS (Assembly Layer 1)
      if (showCore) {
        const corePulse =
          (1 +
            Math.sin(t * profile.corePulseRate * 2.2) *
              profile.corePulseAmplitude) *
          (1 + m.clickEnergy * 0.6);
        const coreRadius =
          Math.min(w, h) * 0.045 * profile.coreScale * corePulse;

        // Core ambient glow
        const coreGrad = ctx.createRadialGradient(
          cx,
          cy,
          1,
          cx,
          cy,
          coreRadius * 2.2
        );
        coreGrad.addColorStop(0, `rgba(${colors.primaryRgb}, 0.95)`);
        coreGrad.addColorStop(0.5, `rgba(${colors.primaryRgb}, 0.35)`);
        coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, coreRadius * 2.2, 0, Math.PI * 2);
        ctx.fill();

        // Inner nucleus
        ctx.fillStyle = colors.coreHex;
        ctx.beginPath();
        ctx.arc(cx, cy, coreRadius * 0.55, 0, Math.PI * 2);
        ctx.fill();

        // REPLACED ending dual nucleus
        if (profile.coreDualNucleus && colors.echoRgb) {
          ctx.fillStyle = `rgba(${colors.echoRgb}, 0.85)`;
          ctx.beginPath();
          ctx.arc(
            cx + profile.coreEchoOffset.x,
            cy + profile.coreEchoOffset.y,
            coreRadius * 0.45,
            0,
            Math.PI * 2
          );
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
  }, [dna, ending, customProfile, qualityTier, assemblyProgress]);

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
