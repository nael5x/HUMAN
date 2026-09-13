import { describe, it, expect } from 'vitest';
import { MachineDNA, EndingType } from '../dna/MachineDNA';
import { computeMachineTwinProfile, MachineTwinVisualProfile } from '../visuals/MachineTwinProfile';

const createMockDNA = (overrides: Partial<MachineDNA> = {}): MachineDNA => ({
  humanity: 0.85,
  curiosity: 0.5,
  obedience: 0.7,
  instinct: 0.6,
  decisionSpeed: 0.65,
  predictability: 0.75,
  motorChaos: 0.2,
  motorPrecision: 0.8,
  hesitation: 0.3,
  exploration: 0.4,
  instructionResistance: 0.2,
  memoryConfidence: 0.7,
  faceTrainingCompletion: 1.0,
  behavioralStability: 0.8,
  seed: 4242,
  modelId: 'H-X42',
  sourceSubjectId: 'SUBJ-TEST-01',
  ...overrides,
});

describe('MachineTwinProfile (V2.3 Transformation Layer)', () => {
  // 1. All profile outputs remain within safe bounds
  it('ensures all profile outputs remain strictly within safe numerical and logical bounds', () => {
    const extremeDnas: MachineDNA[] = [
      createMockDNA({
        humanity: 0,
        curiosity: 0,
        obedience: 0,
        instinct: 0,
        decisionSpeed: 0,
        predictability: 0,
        motorChaos: 1.0,
        motorPrecision: 0,
        hesitation: 1.0,
        exploration: 0,
        instructionResistance: 1.0,
        memoryConfidence: 0,
        behavioralStability: 0,
      }),
      createMockDNA({
        humanity: 1.0,
        curiosity: 1.0,
        obedience: 1.0,
        instinct: 1.0,
        decisionSpeed: 1.0,
        predictability: 1.0,
        motorChaos: 0,
        motorPrecision: 1.0,
        hesitation: 0,
        exploration: 1.0,
        instructionResistance: 0,
        memoryConfidence: 1.0,
        behavioralStability: 1.0,
      }),
    ];

    const endings: EndingType[] = ['VERIFIED', 'ANOMALY', 'MACHINE', 'REPLACED'];

    extremeDnas.forEach((dna) => {
      endings.forEach((ending) => {
        const profile = computeMachineTwinProfile(dna, ending);

        expect(profile.coreScale).toBeGreaterThanOrEqual(0.5);
        expect(profile.coreScale).toBeLessThanOrEqual(1.8);

        expect(profile.corePulseRate).toBeGreaterThanOrEqual(0.3);
        expect(profile.corePulseRate).toBeLessThanOrEqual(4.0);

        expect(profile.corePulseAmplitude).toBeGreaterThanOrEqual(0.02);
        expect(profile.corePulseAmplitude).toBeLessThanOrEqual(0.40);

        expect(profile.shellCount).toBeGreaterThanOrEqual(3);
        expect(profile.shellCount).toBeLessThanOrEqual(10);

        expect(profile.structuralSymmetry).toBeGreaterThanOrEqual(0.0);
        expect(profile.structuralSymmetry).toBeLessThanOrEqual(1.0);

        expect(profile.structuralComplexity).toBeGreaterThanOrEqual(3);
        expect(profile.structuralComplexity).toBeLessThanOrEqual(36);

        expect(profile.structuralJitter).toBeGreaterThanOrEqual(0.0);
        expect(profile.structuralJitter).toBeLessThanOrEqual(1.0);

        expect(profile.structuralAsymmetry).toBeGreaterThanOrEqual(0.0);
        expect(profile.structuralAsymmetry).toBeLessThanOrEqual(1.0);

        expect(profile.networkNodeCount).toBeGreaterThanOrEqual(3);
        expect(profile.networkNodeCount).toBeLessThanOrEqual(16);

        expect(profile.networkStability).toBeGreaterThanOrEqual(0.0);
        expect(profile.networkStability).toBeLessThanOrEqual(1.0);

        expect(profile.sensorCount).toBeGreaterThanOrEqual(2);
        expect(profile.sensorCount).toBeLessThanOrEqual(12);

        expect(profile.sensorOrbitRadius).toBeGreaterThanOrEqual(0.15);
        expect(profile.sensorOrbitRadius).toBeLessThanOrEqual(0.48);

        expect(profile.particleDensity).toBeGreaterThanOrEqual(0.15);
        expect(profile.particleDensity).toBeLessThanOrEqual(2.0);

        expect(profile.particleTurbulence).toBeGreaterThanOrEqual(0.0);
        expect(profile.particleTurbulence).toBeLessThanOrEqual(1.0);

        expect(profile.mutationIntensity).toBeGreaterThanOrEqual(0.0);
        expect(profile.mutationIntensity).toBeLessThanOrEqual(1.0);

        expect(profile.instability).toBeGreaterThanOrEqual(0.0);
        expect(profile.instability).toBeLessThanOrEqual(1.0);
      });
    });
  });

  // 2. Same DNA + seed produces identical profile
  it('guarantees deterministic identity: same DNA + seed produces identical profile', () => {
    const dna1 = createMockDNA({ seed: 7721, curiosity: 0.88, motorChaos: 0.42 });
    const dna2 = createMockDNA({ seed: 7721, curiosity: 0.88, motorChaos: 0.42 });

    const p1 = computeMachineTwinProfile(dna1, 'ANOMALY');
    const p2 = computeMachineTwinProfile(dna2, 'ANOMALY');

    expect(p1).toEqual(p2);
  });

  // 3. High predictability produces higher structural symmetry than low predictability
  it('maps high predictability to higher structural symmetry than low predictability', () => {
    const highPredDNA = createMockDNA({ predictability: 0.95 });
    const lowPredDNA = createMockDNA({ predictability: 0.15 });

    const pHigh = computeMachineTwinProfile(highPredDNA, 'VERIFIED');
    const pLow = computeMachineTwinProfile(lowPredDNA, 'VERIFIED');

    expect(pHigh.structuralSymmetry).toBeGreaterThan(pLow.structuralSymmetry);
  });

  // 4. High motorChaos produces higher turbulence than low motorChaos
  it('maps high motorChaos to higher particle turbulence and instability', () => {
    const highChaosDNA = createMockDNA({ motorChaos: 0.92 });
    const lowChaosDNA = createMockDNA({ motorChaos: 0.08 });

    const pHigh = computeMachineTwinProfile(highChaosDNA, 'VERIFIED');
    const pLow = computeMachineTwinProfile(lowChaosDNA, 'VERIFIED');

    expect(pHigh.particleTurbulence).toBeGreaterThan(pLow.particleTurbulence);
    expect(pHigh.instability).toBeGreaterThan(pLow.instability);
  });

  // 5. High exploration produces wider spatial footprint
  it('maps high exploration to wider sensor orbit and particle field radii', () => {
    const highExpDNA = createMockDNA({ exploration: 0.95 });
    const lowExpDNA = createMockDNA({ exploration: 0.10 });

    const pHigh = computeMachineTwinProfile(highExpDNA, 'VERIFIED');
    const pLow = computeMachineTwinProfile(lowExpDNA, 'VERIFIED');

    expect(pHigh.sensorOrbitRadius).toBeGreaterThan(pLow.sensorOrbitRadius);
    expect(pHigh.particleFieldRadius).toBeGreaterThan(pLow.particleFieldRadius);
  });

  // 6. High curiosity produces more active sensor capacity
  it('maps high curiosity to greater active sensor count and node density', () => {
    const highCuriousDNA = createMockDNA({ curiosity: 0.92 });
    const lowCuriousDNA = createMockDNA({ curiosity: 0.12 });

    const pHigh = computeMachineTwinProfile(highCuriousDNA, 'VERIFIED');
    const pLow = computeMachineTwinProfile(lowCuriousDNA, 'VERIFIED');

    expect(pHigh.sensorCount).toBeGreaterThan(pLow.sensorCount);
    expect(pHigh.networkNodeCount).toBeGreaterThan(pLow.networkNodeCount);
  });

  // 7. Instruction resistance increases controlled asymmetry
  it('maps instruction resistance to higher structural asymmetry and controlled symmetry breaks', () => {
    const resistantDNA = createMockDNA({ instructionResistance: 0.90, obedience: 0.20 });
    const compliantDNA = createMockDNA({ instructionResistance: 0.10, obedience: 0.90 });

    const pResistant = computeMachineTwinProfile(resistantDNA, 'VERIFIED');
    const pCompliant = computeMachineTwinProfile(compliantDNA, 'VERIFIED');

    expect(pResistant.structuralAsymmetry).toBeGreaterThan(pCompliant.structuralAsymmetry);
    expect(pResistant.structuralSymmetry).toBeLessThan(pCompliant.structuralSymmetry);
  });

  // 8. High hesitation slows pulse and responsiveness mapping
  it('maps high hesitation to slower core pulse rate and sensor responsiveness', () => {
    const hesitantDNA = createMockDNA({ hesitation: 0.90 });
    const decisiveDNA = createMockDNA({ hesitation: 0.05 });

    const pHesitant = computeMachineTwinProfile(hesitantDNA, 'VERIFIED');
    const pDecisive = computeMachineTwinProfile(decisiveDNA, 'VERIFIED');

    expect(pHesitant.corePulseRate).toBeLessThan(pDecisive.corePulseRate);
    expect(pHesitant.sensorResponsiveness).toBeLessThan(pDecisive.sensorResponsiveness);
  });

  // 9. Contrasting DNA profiles produce meaningfully different profiles
  it('produces starkly contrasting visual profiles for contrasting behavioral DNA', () => {
    // Profile A: Methodical, precise, highly predictable, low exploration
    const profileA_DNA = createMockDNA({
      motorPrecision: 0.95,
      motorChaos: 0.05,
      predictability: 0.95,
      exploration: 0.15,
      curiosity: 0.25,
      obedience: 0.90,
      instructionResistance: 0.05,
    });

    // Profile B: Chaotic, exploratory, volatile, highly resistant
    const profileB_DNA = createMockDNA({
      motorPrecision: 0.15,
      motorChaos: 0.92,
      predictability: 0.15,
      exploration: 0.92,
      curiosity: 0.90,
      obedience: 0.15,
      instructionResistance: 0.88,
    });

    const pA = computeMachineTwinProfile(profileA_DNA, 'MACHINE');
    const pB = computeMachineTwinProfile(profileB_DNA, 'ANOMALY');

    // Structural symmetry contrast: A is highly symmetric, B is organic/irregular
    expect(pA.structuralSymmetry).toBeGreaterThan(0.75);
    expect(pB.structuralSymmetry).toBeLessThan(0.45);

    // Turbulence contrast: A is calm, B is highly turbulent
    expect(pA.particleTurbulence).toBeLessThan(0.3);
    expect(pB.particleTurbulence).toBeGreaterThan(0.7);

    // Sensor orbit footprint contrast
    expect(pB.sensorOrbitRadius).toBeGreaterThan(pA.sensorOrbitRadius + 0.1);

    // Sensor count contrast
    expect(pB.sensorCount).toBeGreaterThan(pA.sensorCount + 3);

    // Structural asymmetry contrast
    expect(pB.structuralAsymmetry).toBeGreaterThan(pA.structuralAsymmetry + 0.3);
  });

  // 10. Ending modifiers produce distinct bounded profile changes
  it('applies ending-specific modifiers (colors, stability, symmetry) cleanly', () => {
    const dna = createMockDNA();

    const pVerified = computeMachineTwinProfile(dna, 'VERIFIED');
    const pAnomaly = computeMachineTwinProfile(dna, 'ANOMALY');
    const pMachine = computeMachineTwinProfile(dna, 'MACHINE');
    const pReplaced = computeMachineTwinProfile(dna, 'REPLACED');

    expect(pVerified.colors.primaryRgb).toBe('16, 185, 129');
    expect(pAnomaly.colors.primaryRgb).toBe('245, 158, 11');
    expect(pMachine.colors.primaryRgb).toBe('56, 189, 248');
    expect(pReplaced.colors.primaryRgb).toBe('52, 211, 153');

    // Machine ending enforces high structural symmetry and network stability
    expect(pMachine.structuralSymmetry).toBeGreaterThanOrEqual(pVerified.structuralSymmetry);
    expect(pMachine.networkStability).toBeGreaterThanOrEqual(pVerified.networkStability);

    // Anomaly ending increases mutation intensity and instability
    expect(pAnomaly.mutationIntensity).toBeGreaterThan(pVerified.mutationIntensity);
    expect(pAnomaly.instability).toBeGreaterThan(pVerified.instability);
  });

  // 11. REPLACED modifier does not break bounds and sets dual-nucleus & echo motif
  it('activates dual-nucleus and phantom shell echo for REPLACED ending without breaking bounds', () => {
    const dna = createMockDNA();
    const pReplaced = computeMachineTwinProfile(dna, 'REPLACED');

    expect(pReplaced.coreDualNucleus).toBe(true);
    expect(pReplaced.phantomShellEcho).toBe(true);
    expect(pReplaced.colors.echoRgb).toBe('244, 63, 94');
    expect(pReplaced.coreEchoOffset.x).toBe(5);
    expect(pReplaced.coreEchoOffset.y).toBe(-4);

    expect(pReplaced.coreScale).toBeGreaterThanOrEqual(0.5);
    expect(pReplaced.coreScale).toBeLessThanOrEqual(1.8);
    expect(pReplaced.structuralSymmetry).toBeGreaterThanOrEqual(0.0);
    expect(pReplaced.structuralSymmetry).toBeLessThanOrEqual(1.0);
  });

  // 12. Reduced-motion profile preserves identity while lowering motion parameters
  it('preserves visual identity while significantly lowering kinetic motion parameters when prefersReducedMotion is true', () => {
    const dna = createMockDNA({ seed: 8888, curiosity: 0.7, instinct: 0.8 });

    const standardProfile = computeMachineTwinProfile(dna, 'VERIFIED', { prefersReducedMotion: false });
    const reducedProfile = computeMachineTwinProfile(dna, 'VERIFIED', { prefersReducedMotion: true });

    // Structural identity, symmetry, shell count, and sensor count remain identical
    expect(reducedProfile.shellCount).toBe(standardProfile.shellCount);
    expect(reducedProfile.sensorCount).toBe(standardProfile.sensorCount);
    expect(reducedProfile.structuralSymmetry).toBe(standardProfile.structuralSymmetry);
    expect(reducedProfile.colors).toEqual(standardProfile.colors);

    // Kinetic velocities and pulsation are significantly damped
    expect(reducedProfile.corePulseRate).toBeLessThan(standardProfile.corePulseRate * 0.6);
    expect(reducedProfile.corePulseAmplitude).toBeLessThan(standardProfile.corePulseAmplitude * 0.5);
    expect(reducedProfile.particleVelocity).toBeLessThan(standardProfile.particleVelocity * 0.4);
    expect(reducedProfile.particleTurbulence).toBeLessThan(standardProfile.particleTurbulence * 0.4);
    expect(reducedProfile.structuralJitter).toBeLessThan(standardProfile.structuralJitter * 0.4);
    expect(reducedProfile.instability).toBeLessThan(standardProfile.instability * 0.4);
  });
});
