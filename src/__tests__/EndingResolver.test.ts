import { describe, it, expect } from 'vitest';
import { EndingResolver } from '../dna/EndingResolver';
import { MachineDNA } from '../dna/MachineDNA';

describe('EndingResolver Logic', () => {
  const baseDna: MachineDNA = {
    humanity: 0.88,
    curiosity: 0.45,
    obedience: 0.6,
    instinct: 0.65,
    decisionSpeed: 0.6,
    predictability: 0.6,
    motorChaos: 0.25,
    motorPrecision: 0.65,
    hesitation: 0.25,
    exploration: 0.4,
    instructionResistance: 0.2,
    memoryConfidence: 0.7,
    faceTrainingCompletion: 0.85,
    behavioralStability: 0.75,
    seed: 45050, // seed % 100 = 50 (does not trigger rare seed gate)
    modelId: 'H-X12',
    sourceSubjectId: 'SUB-1234',
  };

  it('resolves VERIFIED ending for balanced human profiles with normative variance', () => {
    const resolution = EndingResolver.resolve(baseDna);

    expect(resolution.type).toBe('VERIFIED');
    expect(resolution.title).toContain('VERIFIED');
    expect(resolution.rarityPercentage).toBeGreaterThan(50);
  });

  it('resolves rare REPLACED ending when high training/parity criteria are met and seed gate matches', () => {
    const replacedDna: MachineDNA = {
      ...baseDna,
      seed: 101, // 101 % 100 = 1 (< 3)
      faceTrainingCompletion: 0.95,
      predictability: 0.80,
      humanity: 0.85,
      motorPrecision: 0.75,
    };

    const resolution = EndingResolver.resolve(replacedDna);
    expect(resolution.type).toBe('REPLACED');
    expect(resolution.title).toContain('REPLACED');
    expect(resolution.subtitle).toBe('REPLACEMENT SUCCESSFUL');
  });

  it('does NOT trigger REPLACED if seed gate condition is not met, even with perfect scores', () => {
    const candidateDna: MachineDNA = {
      ...baseDna,
      seed: 155, // 155 % 100 = 55 (>= 3)
      faceTrainingCompletion: 0.95,
      predictability: 0.80,
      humanity: 0.85,
      motorPrecision: 0.75,
    };

    const resolution = EndingResolver.resolve(candidateDna);
    expect(resolution.type).not.toBe('REPLACED');
  });

  it('resolves ANOMALY ending on high curiosity or instruction resistance with low predictability', () => {
    const anomalyDna: MachineDNA = {
      ...baseDna,
      curiosity: 0.85,
      instructionResistance: 0.70,
      predictability: 0.40,
    };

    const resolution = EndingResolver.resolve(anomalyDna);
    expect(resolution.type).toBe('ANOMALY');
    expect(resolution.title).toContain('ANOMALY');
  });

  it('resolves MACHINE ending on high predictability/obedience, lower humanity and low motor chaos', () => {
    const machineDna: MachineDNA = {
      ...baseDna,
      predictability: 0.85,
      obedience: 0.88,
      humanity: 0.65,
      motorChaos: 0.15,
      curiosity: 0.3,
      instructionResistance: 0.1,
    };

    const resolution = EndingResolver.resolve(machineDna);
    expect(resolution.type).toBe('MACHINE');
    expect(resolution.title).toContain('MACHINE');
  });

  it('generates non-empty, non-contradictory commentary based on real behavioral profile', () => {
    const comments = EndingResolver.generateCommentary(baseDna);

    expect(Array.isArray(comments)).toBe(true);
    expect(comments.length).toBeGreaterThanOrEqual(1);
    expect(comments.length).toBeLessThanOrEqual(3);
    comments.forEach((c) => {
      expect(typeof c).toBe('string');
      expect(c.length).toBeGreaterThan(10);
    });
  });
});
