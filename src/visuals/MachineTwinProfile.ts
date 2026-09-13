import { MachineDNA, EndingType, MachineArchetype, resolveMachineArchetype, SeededRandom } from '../dna/MachineDNA';

/**
 * MachineTwinVisualProfile
 * Pure, deterministic visual parameter model derived from MachineDNA.
 * Encodes behavioral traits into structural geometry, signal topology, orbital satellites,
 * and particle field kinetics.
 */
export interface MachineTwinVisualProfile {
  // Core / Nucleus
  coreScale: number;              // [0.5, 1.8] - base core size factor
  corePulseRate: number;          // [0.4, 4.0] - frequency of heartbeat / pulsation
  corePulseAmplitude: number;     // [0.03, 0.40] - dilation magnitude
  coreDualNucleus: boolean;       // true for REPLACED ending or rare dual-identity motif
  coreEchoOffset: { x: number; y: number };

  // Structural Geometry & Shells
  shellCount: number;             // [3, 10] - concentric geometric layers
  structuralSymmetry: number;     // [0.0, 1.0] - 0 = irregular harmonic wave; 1 = crisp polygon
  structuralComplexity: number;   // [3, 36] - vertices count or wave modes
  structuralJitter: number;       // [0.0, 1.0] - boundary micro-perturbation / wobble
  structuralAsymmetry: number;    // [0.0, 1.0] - directional offset / lateral skew
  shellSpacing: number;           // [0.015, 0.06] - normalized distance between shells
  phantomShellEcho: boolean;      // true for REPLACED ending

  // Signal Network
  networkDensity: number;         // [0.1, 1.0] - nodal link density
  networkNodeCount: number;       // [3, 16] - active vertices
  networkRadius: number;          // [0.15, 0.40] - normalized reach of nodal routes
  networkStability: number;       // [0.0, 1.0] - 1 = direct geodesic links; 0 = chaotic crossing paths
  networkPulseSpeed: number;      // [0.3, 3.5] - signal propagation speed

  // Sensor Satellites
  sensorCount: number;            // [2, 12] - orbiting sensor reticles
  sensorOrbitRadius: number;      // [0.15, 0.48] - spatial footprint of orbits
  sensorResponsiveness: number;   // [0.02, 0.30] - agility of tracking and rotation
  sensorReticleComplexity: number;// [1, 3] - 1: dot, 2: ring, 3: crosshair + outer ring
  sensorOrbitEccentricity: number;// [0.0, 0.45] - 0 = circular, >0 = elliptical/tilted

  // Particle Field & Aura
  particleDensity: number;        // [0.2, 2.0] - particle count scalar
  particleVelocity: number;       // [0.1, 2.5] - orbital speed scalar
  particleTurbulence: number;     // [0.0, 1.0] - chaotic perturbation scalar
  particleFieldRadius: number;    // [0.22, 0.58] - spatial spread of particle aura
  particlePersistence: number;    // [0.15, 0.95] - trail lingering / alpha retention

  // Morphological State
  mutationIntensity: number;      // [0.0, 1.0] - divergence from normative morphology
  instability: number;            // [0.0, 1.0] - phase oscillation and drift

  // Color & Palette Tokens
  colors: {
    primaryRgb: string;           // e.g. "16, 185, 129"
    accentRgb: string;            // e.g. "228, 228, 231"
    auraRgba: string;             // e.g. "rgba(16, 185, 129, 0.08)"
    coreHex: string;              // e.g. "#ffffff"
    echoRgb?: string;             // e.g. "244, 63, 94"
  };
}

export interface ProfileComputeOptions {
  qualityTier?: 'desktop' | 'tablet' | 'mobile';
  prefersReducedMotion?: boolean;
  archetypeOverride?: MachineArchetype;
}

const clamp = (val: number, min: number, max: number): number => Math.max(min, Math.min(max, val));

/**
 * Transforms normalized MachineDNA into a concrete, deterministic MachineTwinVisualProfile.
 * Pure function: same DNA + seed + options = identical visual profile.
 */
export function computeMachineTwinProfile(
  dna: MachineDNA,
  ending: EndingType,
  options: ProfileComputeOptions = {}
): MachineTwinVisualProfile {
  const qualityTier = options.qualityTier || 'desktop';
  const prefersReducedMotion = Boolean(options.prefersReducedMotion);
  const archetype = options.archetypeOverride || resolveMachineArchetype(dna);
  const rng = new SeededRandom(dna.seed);

  // 1. Core / Nucleus Mappings
  // Humanity: high humanity -> organic breathing cadence (~1.2 - 1.8), softer pulse
  // Low humanity -> mechanical staccato pulse (~2.4 - 3.4)
  const basePulseRate = 1.0 + (1 - dna.humanity) * 1.5 + dna.instinct * 0.8;
  const hesitationPulseDampen = 1.0 - dna.hesitation * 0.45;
  const corePulseRate = basePulseRate * hesitationPulseDampen;
  const corePulseAmplitude = 0.08 + dna.instinct * 0.12 + (1 - dna.predictability) * 0.08;
  const coreScale = 0.8 + (1 - dna.obedience) * 0.25 + dna.curiosity * 0.15;

  // 2. Structural Geometry & Shells
  // Predictability: High -> high symmetry (0.75 - 1.0); Low -> low symmetry (0.1 - 0.45)
  let structuralSymmetry = 0.2 + dna.predictability * 0.65 - (1 - dna.obedience) * 0.15;
  // Instruction Resistance & Obedience: Asymmetry breaking
  let structuralAsymmetry = (1 - dna.obedience) * 0.4 + dna.instructionResistance * 0.4;
  
  // Complexity: High predictability prefers clean polygonal vertices (6, 8, 12)
  // Low predictability prefers dense continuous harmonic modes
  let structuralComplexity = dna.predictability > 0.65
    ? (dna.predictability > 0.85 ? 6 : 8)
    : Math.floor(16 + (1 - dna.predictability) * 16);

  // Motor Precision vs Chaos: Jitter on boundary
  let structuralJitter = 0.10 + dna.motorChaos * 0.65 + (1 - dna.motorPrecision) * 0.25;
  let shellCount = Math.floor(5 + dna.humanity * 3 + dna.curiosity * 2);
  let shellSpacing = 0.025 + dna.exploration * 0.015;

  // 3. Signal Network Topology
  // Curiosity & Exploration drive reach and node density
  let networkNodeCount = Math.floor(4 + dna.curiosity * 7 + dna.exploration * 3);
  let networkDensity = 0.25 + dna.curiosity * 0.55;
  let networkRadius = 0.20 + dna.exploration * 0.14;
  // Predictability & Motor Precision drive stability
  let networkStability = 0.15 + dna.predictability * 0.55 + dna.motorPrecision * 0.30 - dna.motorChaos * 0.35;
  let networkPulseSpeed = (1.0 + dna.decisionSpeed * 1.2) * (1.0 - dna.hesitation * 0.45);

  // 4. Sensor Satellites
  // Curiosity: high curiosity -> more active sensors with advanced reticles
  let sensorCount = Math.floor(3 + dna.curiosity * 7);
  let sensorOrbitRadius = 0.20 + dna.exploration * 0.18;
  let sensorResponsiveness = 0.06 + dna.instinct * 0.12 - dna.hesitation * 0.05;
  let sensorReticleComplexity = dna.curiosity > 0.72 ? 3 : dna.curiosity > 0.4 ? 2 : 1;
  let sensorOrbitEccentricity = (1 - dna.motorPrecision) * 0.25 + (1 - dna.predictability) * 0.15;

  // 5. Particle Field Kinetics
  let particleDensity = 0.4 + dna.curiosity * 0.6 + dna.motorChaos * 0.4;
  let particleVelocity = 0.4 + dna.instinct * 0.8 + (1 - dna.hesitation) * 0.5;
  let particleTurbulence = 0.08 + dna.motorChaos * 0.70;
  let particleFieldRadius = 0.30 + dna.exploration * 0.20;
  let particlePersistence = 0.30 + dna.memoryConfidence * 0.40 + dna.hesitation * 0.20;

  // 6. Morphological State
  let mutationIntensity = 0.05 + dna.instructionResistance * 0.45 + (1 - dna.predictability) * 0.30;
  let instability = 0.05 + dna.motorChaos * 0.50 + (1 - dna.behavioralStability) * 0.35;

  // 7. Apply Archetype Modifiers
  switch (archetype) {
    case 'CURIOUS ANOMALY':
      sensorOrbitRadius += 0.06;
      sensorCount += 2;
      networkDensity += 0.16;
      structuralSymmetry -= 0.12;
      networkNodeCount += 2;
      break;

    case 'NON-COMPLIANT UNIT':
      structuralAsymmetry += 0.28;
      structuralSymmetry -= 0.22;
      mutationIntensity += 0.22;
      sensorOrbitEccentricity += 0.15;
      break;

    case 'UNSTABLE EXPLORER':
      particleTurbulence += 0.26;
      instability += 0.24;
      particleFieldRadius += 0.07;
      networkStability -= 0.22;
      structuralJitter += 0.18;
      break;

    case 'INSTINCTIVE MODEL':
      sensorResponsiveness += 0.07;
      sensorOrbitRadius -= 0.03;
      networkPulseSpeed += 0.5;
      break;

    case 'LOGICAL SUBJECT':
      structuralSymmetry += 0.32;
      networkStability += 0.32;
      structuralJitter -= 0.18;
      structuralComplexity = 6;
      sensorOrbitEccentricity = 0.02;
      break;

    case 'PASSIVE ANALYST':
      particleVelocity -= 0.35;
      sensorResponsiveness -= 0.04;
      sensorCount = Math.max(3, sensorCount - 1);
      particleTurbulence -= 0.12;
      break;

    case 'ADAPTIVE OBSERVER':
    default:
      // Balanced baseline
      break;
  }

  // 8. Apply Ending Modifiers
  let coreDualNucleus = false;
  let phantomShellEcho = false;
  let coreEchoOffset = { x: 0, y: 0 };
  let colors = {
    primaryRgb: '16, 185, 129',
    accentRgb: '228, 228, 231',
    auraRgba: 'rgba(16, 185, 129, 0.06)',
    coreHex: '#ffffff',
    echoRgb: undefined as string | undefined,
  };

  switch (ending) {
    case 'ANOMALY':
      mutationIntensity += 0.22;
      instability += 0.18;
      structuralSymmetry -= 0.14;
      networkStability -= 0.16;
      colors = {
        primaryRgb: '245, 158, 11',
        accentRgb: '239, 68, 68',
        auraRgba: 'rgba(245, 158, 11, 0.08)',
        coreHex: '#ffffff',
        echoRgb: undefined,
      };
      break;

    case 'MACHINE':
      structuralSymmetry += 0.30;
      networkStability += 0.30;
      structuralJitter -= 0.20;
      colors = {
        primaryRgb: '56, 189, 248',
        accentRgb: '240, 249, 255',
        auraRgba: 'rgba(56, 189, 248, 0.07)',
        coreHex: '#ffffff',
        echoRgb: undefined,
      };
      break;

    case 'REPLACED':
      coreDualNucleus = true;
      phantomShellEcho = true;
      coreEchoOffset = { x: 5, y: -4 };
      mutationIntensity += 0.15;
      instability += 0.12;
      colors = {
        primaryRgb: '52, 211, 153',
        accentRgb: '244, 63, 94',
        auraRgba: 'rgba(52, 211, 153, 0.09)',
        coreHex: '#ffffff',
        echoRgb: '244, 63, 94',
      };
      break;

    case 'VERIFIED':
    default:
      colors = {
        primaryRgb: '16, 185, 129',
        accentRgb: '228, 228, 231',
        auraRgba: 'rgba(16, 185, 129, 0.06)',
        coreHex: '#ffffff',
        echoRgb: undefined,
      };
      break;
  }

  // 9. Reduced Motion Scaling
  let finalPulseRate = corePulseRate;
  let finalPulseAmplitude = corePulseAmplitude;
  let finalParticleVelocity = particleVelocity;
  let finalTurbulence = particleTurbulence;
  let finalJitter = structuralJitter;
  let finalInstability = instability;
  let finalSensorResponsiveness = sensorResponsiveness;
  let finalNetworkPulseSpeed = networkPulseSpeed;

  if (prefersReducedMotion) {
    finalPulseRate *= 0.45;
    finalPulseAmplitude *= 0.35;
    finalParticleVelocity *= 0.25;
    finalTurbulence *= 0.20;
    finalJitter *= 0.20;
    finalInstability *= 0.20;
    finalSensorResponsiveness *= 0.35;
    finalNetworkPulseSpeed *= 0.35;
  }

  // 10. Quality Tier Scaling
  let finalShellCount = shellCount;
  let finalSensorCount = sensorCount;
  let finalNetworkNodeCount = networkNodeCount;
  let finalParticleDensity = particleDensity;

  if (qualityTier === 'mobile') {
    finalShellCount = Math.min(finalShellCount, 4);
    finalSensorCount = Math.min(finalSensorCount, 5);
    finalNetworkNodeCount = Math.min(finalNetworkNodeCount, 6);
    finalParticleDensity *= 0.35;
  } else if (qualityTier === 'tablet') {
    finalShellCount = Math.min(finalShellCount, 6);
    finalSensorCount = Math.min(finalSensorCount, 8);
    finalNetworkNodeCount = Math.min(finalNetworkNodeCount, 9);
    finalParticleDensity *= 0.65;
  } else {
    finalShellCount = Math.min(9, Math.max(4, finalShellCount));
    finalSensorCount = Math.min(12, Math.max(2, finalSensorCount));
  }

  // 11. Safe Bounded Output Construction
  return {
    coreScale: clamp(coreScale, 0.5, 1.8),
    corePulseRate: clamp(finalPulseRate, 0.3, 4.0),
    corePulseAmplitude: clamp(finalPulseAmplitude, 0.02, 0.40),
    coreDualNucleus,
    coreEchoOffset,

    shellCount: Math.round(clamp(finalShellCount, 3, 10)),
    structuralSymmetry: clamp(structuralSymmetry, 0.0, 1.0),
    structuralComplexity: Math.round(clamp(structuralComplexity, 3, 36)),
    structuralJitter: clamp(finalJitter, 0.0, 1.0),
    structuralAsymmetry: clamp(structuralAsymmetry, 0.0, 1.0),
    shellSpacing: clamp(shellSpacing, 0.015, 0.06),
    phantomShellEcho,

    networkDensity: clamp(networkDensity, 0.1, 1.0),
    networkNodeCount: Math.round(clamp(finalNetworkNodeCount, 3, 16)),
    networkRadius: clamp(networkRadius, 0.15, 0.40),
    networkStability: clamp(networkStability, 0.0, 1.0),
    networkPulseSpeed: clamp(finalNetworkPulseSpeed, 0.2, 3.5),

    sensorCount: Math.round(clamp(finalSensorCount, 2, 12)),
    sensorOrbitRadius: clamp(sensorOrbitRadius, 0.15, 0.48),
    sensorResponsiveness: clamp(finalSensorResponsiveness, 0.02, 0.30),
    sensorReticleComplexity: Math.round(clamp(sensorReticleComplexity, 1, 3)),
    sensorOrbitEccentricity: clamp(sensorOrbitEccentricity, 0.0, 0.45),

    particleDensity: clamp(finalParticleDensity, 0.15, 2.0),
    particleVelocity: clamp(finalParticleVelocity, 0.08, 2.5),
    particleTurbulence: clamp(finalTurbulence, 0.0, 1.0),
    particleFieldRadius: clamp(particleFieldRadius, 0.22, 0.58),
    particlePersistence: clamp(particlePersistence, 0.15, 0.95),

    mutationIntensity: clamp(mutationIntensity, 0.0, 1.0),
    instability: clamp(finalInstability, 0.0, 1.0),

    colors,
  };
}

/**
 * Deterministic static renderer for the Machine Twin.
 * Used for high-fidelity share cards, dossier exports, and static previews.
 * Faithfully mirrors live MachineTwinCanvas geometry, symmetry, core scale, and ending modifiers.
 */
export function renderStaticMachineTwin(
  ctx: CanvasRenderingContext2D,
  profile: MachineTwinVisualProfile,
  cx: number,
  cy: number,
  radius: number,
  options: { seed?: number; showAura?: boolean } = {}
): void {
  const seed = options.seed ?? 1337;
  const showAura = options.showAura ?? true;
  const rng = new SeededRandom(seed);
  const primary = profile.colors.primaryRgb;
  const accent = profile.colors.accentRgb;
  const aura = profile.colors.auraRgba;

  // 1. Aura Field
  if (showAura) {
    const auraRadius = radius * (1.1 + profile.particleFieldRadius);
    const grad = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, auraRadius);
    grad.addColorStop(0, aura);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, auraRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Structural Shells
  const shellCount = Math.min(profile.shellCount, 8);
  const baseRadius = radius * 0.28;
  const isHighSymmetry = profile.structuralSymmetry > 0.68;

  for (let r = 0; r < shellCount; r++) {
    const layerNorm = r / (shellCount - 1 || 1);
    const currentRadius = baseRadius + r * (radius * profile.shellSpacing * 3.5);
    const pointsCount = isHighSymmetry
      ? profile.structuralComplexity
      : Math.floor(20 + r * 4);
    const wobble = (1 - profile.structuralSymmetry) * 8 * (1 + profile.structuralJitter);
    const asymmetryOffset = profile.structuralAsymmetry * 14 * (r % 2 === 0 ? 1 : -1);

    ctx.beginPath();
    for (let i = 0; i <= pointsCount; i++) {
      const angle = (i / pointsCount) * Math.PI * 2;
      const wave = Math.sin(angle * (3 + (r % 2)) + r * 0.9 + seed * 0.002);
      const rOffset = wave * wobble + (i % 2 === 0 ? asymmetryOffset * 0.2 : 0);
      const px = cx + Math.cos(angle) * (currentRadius + rOffset);
      const py = cy + Math.sin(angle) * (currentRadius + rOffset);

      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    const opacity = 0.18 + layerNorm * 0.55;
    ctx.strokeStyle =
      r === shellCount - 1
        ? `rgba(${primary}, ${opacity})`
        : `rgba(${accent}, ${opacity * 0.75})`;
    ctx.lineWidth = r === shellCount - 1 ? 2.0 : 1.2;
    ctx.stroke();

    // Rare REPLACED ending phantom shell echo
    if (profile.phantomShellEcho && r % 2 === 0) {
      ctx.beginPath();
      ctx.arc(cx + profile.coreEchoOffset.x * 0.8, cy + profile.coreEchoOffset.y * 0.8, currentRadius * 0.95, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${accent}, ${opacity * 0.4})`;
      ctx.lineWidth = 1.0;
      ctx.stroke();
    }
  }

  // 3. Signal Network Filaments
  const nodeCount = profile.networkNodeCount;
  const netRadius = radius * (0.55 + profile.networkRadius * 0.6);
  ctx.strokeStyle = `rgba(${primary}, 0.32)`;
  ctx.lineWidth = 1.0;

  const nodePositions: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < nodeCount; i++) {
    const angle = (i / nodeCount) * Math.PI * 2 + seed * 0.01;
    const distMod = (1 - profile.networkStability) * Math.sin(i * 1.7) * 12;
    const nx = cx + Math.cos(angle) * (netRadius + distMod);
    const ny = cy + Math.sin(angle) * (netRadius + distMod);
    nodePositions.push({ x: nx, y: ny });

    // Center connection
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.stroke();

    // Node vertex dot
    ctx.beginPath();
    ctx.arc(nx, ny, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${primary}, 0.85)`;
    ctx.fill();
  }

  // Connect adjacent nodes
  if (profile.networkStability > 0.4) {
    for (let i = 0; i < nodePositions.length; i++) {
      const nextIdx = (i + 1) % nodePositions.length;
      ctx.beginPath();
      ctx.moveTo(nodePositions[i].x, nodePositions[i].y);
      ctx.lineTo(nodePositions[nextIdx].x, nodePositions[nextIdx].y);
      ctx.strokeStyle = `rgba(${primary}, 0.20)`;
      ctx.stroke();
    }
  }

  // 4. Sensor Satellites
  const sensorCount = profile.sensorCount;
  for (let i = 0; i < sensorCount; i++) {
    const angle = (i / sensorCount) * Math.PI * 2 + seed * 0.02;
    const orbitR = radius * (0.65 + profile.sensorOrbitRadius * 0.7);
    const ecc = profile.sensorOrbitEccentricity;
    const sx = cx + Math.cos(angle) * orbitR;
    const sy = cy + Math.sin(angle) * orbitR * (1 - ecc);

    // Sensor dot
    ctx.beginPath();
    ctx.arc(sx, sy, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${primary}, 0.95)`;
    ctx.fill();

    // Reticle details
    if (profile.sensorReticleComplexity >= 2) {
      ctx.beginPath();
      ctx.arc(sx, sy, 6.5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${primary}, 0.45)`;
      ctx.lineWidth = 1.0;
      ctx.stroke();
    }
    if (profile.sensorReticleComplexity >= 3) {
      ctx.beginPath();
      ctx.moveTo(sx - 8, sy);
      ctx.lineTo(sx + 8, sy);
      ctx.moveTo(sx, sy - 8);
      ctx.lineTo(sx, sy + 8);
      ctx.strokeStyle = `rgba(${accent}, 0.35)`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }

  // 5. Core / Nucleus
  const coreRadius = radius * 0.14 * profile.coreScale;
  const coreGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, coreRadius * 2.2);
  coreGrad.addColorStop(0, `rgba(${primary}, 0.95)`);
  coreGrad.addColorStop(0.5, `rgba(${primary}, 0.40)`);
  coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, coreRadius * 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = profile.colors.coreHex;
  ctx.beginPath();
  ctx.arc(cx, cy, coreRadius * 0.55, 0, Math.PI * 2);
  ctx.fill();

  // Dual nucleus for REPLACED
  if (profile.coreDualNucleus && profile.colors.echoRgb) {
    ctx.fillStyle = `rgba(${profile.colors.echoRgb}, 0.85)`;
    ctx.beginPath();
    ctx.arc(cx + profile.coreEchoOffset.x, cy + profile.coreEchoOffset.y, coreRadius * 0.48, 0, Math.PI * 2);
    ctx.fill();
  }
}
