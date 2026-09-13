import { describe, it, expect } from 'vitest';
import {
  extractMachineDNA,
  resolveMachineArchetype,
  SeededRandom,
  MachineDNA,
} from '../dna/MachineDNA';
import { createInitialSession } from '../scoring/ScoreEngine';

describe('MachineDNA & Archetype Resolution', () => {
  it('extracts normalized [0.0, 1.0] behavioral DNA metrics from session data', () => {
    const session = createInitialSession();
    const dna = extractMachineDNA(session);

    expect(dna.humanity).toBeGreaterThanOrEqual(0);
    expect(dna.humanity).toBeLessThanOrEqual(1);

    expect(dna.curiosity).toBeGreaterThanOrEqual(0);
    expect(dna.curiosity).toBeLessThanOrEqual(1);

    expect(dna.obedience).toBeGreaterThanOrEqual(0);
    expect(dna.obedience).toBeLessThanOrEqual(1);

    expect(dna.instinct).toBeGreaterThanOrEqual(0);
    expect(dna.instinct).toBeLessThanOrEqual(1);

    expect(dna.decisionSpeed).toBeGreaterThanOrEqual(0);
    expect(dna.decisionSpeed).toBeLessThanOrEqual(1);

    expect(dna.predictability).toBeGreaterThanOrEqual(0);
    expect(dna.predictability).toBeLessThanOrEqual(1);

    expect(dna.motorChaos).toBeGreaterThanOrEqual(0);
    expect(dna.motorChaos).toBeLessThanOrEqual(1);

    expect(dna.motorPrecision).toBeGreaterThanOrEqual(0);
    expect(dna.motorPrecision).toBeLessThanOrEqual(1);

    expect(dna.sourceSubjectId).toBe(session.subjectId);
    expect(dna.seed).toBe(session.seed);
  });

  it('is deterministic: identical session produces identical DNA', () => {
    const session = createInitialSession();
    const dna1 = extractMachineDNA(session);
    const dna2 = extractMachineDNA(session);

    expect(dna1).toEqual(dna2);
  });

  it('SeededRandom produces identical pseudorandom streams for identical seeds', () => {
    const rng1 = new SeededRandom(48291);
    const rng2 = new SeededRandom(48291);

    const values1 = Array.from({ length: 10 }, () => rng1.next());
    const values2 = Array.from({ length: 10 }, () => rng2.next());

    expect(values1).toEqual(values2);
  });

  const baseDna: MachineDNA = {
    humanity: 0.85,
    curiosity: 0.5,
    obedience: 0.5,
    instinct: 0.5,
    decisionSpeed: 0.5,
    predictability: 0.5,
    motorChaos: 0.2,
    motorPrecision: 0.5,
    hesitation: 0.3,
    exploration: 0.3,
    instructionResistance: 0.2,
    memoryConfidence: 0.6,
    faceTrainingCompletion: 0.8,
    behavioralStability: 0.7,
    seed: 12345,
    modelId: 'H-X42',
    sourceSubjectId: 'SUB-999',
  };

  it('resolves CURIOUS ANOMALY archetype when curiosity or exploration is exceptionally high', () => {
    const archetype = resolveMachineArchetype({
      ...baseDna,
      curiosity: 0.88,
    });
    expect(archetype).toBe('CURIOUS ANOMALY');
  });

  it('resolves NON-COMPLIANT UNIT archetype on high instruction resistance or low obedience', () => {
    const archetype = resolveMachineArchetype({
      ...baseDna,
      curiosity: 0.5,
      instructionResistance: 0.75,
      obedience: 0.2,
    });
    expect(archetype).toBe('NON-COMPLIANT UNIT');
  });

  it('resolves UNSTABLE EXPLORER on high motor chaos or low behavioral stability', () => {
    const archetype = resolveMachineArchetype({
      ...baseDna,
      curiosity: 0.5,
      instructionResistance: 0.2,
      obedience: 0.6,
      motorChaos: 0.85,
    });
    expect(archetype).toBe('UNSTABLE EXPLORER');
  });

  it('resolves INSTINCTIVE MODEL on high instinct and high decision speed', () => {
    const archetype = resolveMachineArchetype({
      ...baseDna,
      curiosity: 0.5,
      instructionResistance: 0.2,
      obedience: 0.6,
      motorChaos: 0.2,
      instinct: 0.85,
      decisionSpeed: 0.8,
    });
    expect(archetype).toBe('INSTINCTIVE MODEL');
  });

  it('resolves LOGICAL SUBJECT on high predictability, high obedience and precision', () => {
    const archetype = resolveMachineArchetype({
      ...baseDna,
      curiosity: 0.5,
      instructionResistance: 0.2,
      motorChaos: 0.2,
      instinct: 0.5,
      predictability: 0.8,
      obedience: 0.75,
      motorPrecision: 0.7,
    });
    expect(archetype).toBe('LOGICAL SUBJECT');
  });

  it('resolves PASSIVE ANALYST on low decision speed or high hesitation', () => {
    const archetype = resolveMachineArchetype({
      ...baseDna,
      curiosity: 0.5,
      instructionResistance: 0.2,
      motorChaos: 0.2,
      instinct: 0.5,
      predictability: 0.5,
      obedience: 0.5,
      decisionSpeed: 0.25,
      hesitation: 0.75,
    });
    expect(archetype).toBe('PASSIVE ANALYST');
  });

  it('resolves ADAPTIVE OBSERVER for balanced baseline profiles', () => {
    const archetype = resolveMachineArchetype({
      ...baseDna,
      curiosity: 0.6,
      instructionResistance: 0.3,
      motorChaos: 0.3,
      instinct: 0.6,
      decisionSpeed: 0.55,
      predictability: 0.6,
      obedience: 0.6,
      hesitation: 0.3,
    });
    expect(archetype).toBe('ADAPTIVE OBSERVER');
  });
});
