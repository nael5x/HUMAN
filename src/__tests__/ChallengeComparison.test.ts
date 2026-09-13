import { describe, it, expect } from 'vitest';
import { compareMachineTwins, challengerPayloadToRenderDNA } from '../challenge/ChallengeComparison';
import { MachineDNA } from '../dna/MachineDNA';
import { ChallengePayload } from '../utils/ChallengeMode';

const baseDNA: MachineDNA = {
  humanity: 0.88,
  curiosity: 0.75,
  obedience: 0.50,
  instinct: 0.70,
  decisionSpeed: 0.72,
  predictability: 0.66,
  motorChaos: 0.22,
  motorPrecision: 0.78,
  hesitation: 0.28,
  exploration: 0.75,
  instructionResistance: 0.50,
  memoryConfidence: 0.75,
  faceTrainingCompletion: 1.0,
  behavioralStability: 0.66,
  seed: 42091,
  modelId: 'M-8821',
  sourceSubjectId: 'M-8821',
};

const identicalChallenge: ChallengePayload = {
  version: 2,
  challengerModelId: 'M-8821',
  challengerHumanity: 88,
  challengerEnding: 'VERIFIED',
  challengerClass: 'ADAPTIVE OBSERVER',
  seed: 42091,
  predictability: 66,
  curiosity: 75,
  obedience: 50,
  instinct: 70,
  motorChaos: 22,
  decisionSpeed: 72,
};

describe('ChallengeComparison Engine', () => {
  it('computes 100% similarity for identical shared result values', () => {
    const report = compareMachineTwins(baseDNA, 'VERIFIED', 'ADAPTIVE OBSERVER', identicalChallenge);
    expect(report.similarityScore).toBe(100);
    expect(report.divergenceScore).toBe(0);
    expect(report.humanityDelta).toBe(0);
    expect(report.verdictTitle).toBe('PARALLEL MORPHOLOGY');
  });

  it('computes strong divergence for strongly contrasting shared result values', () => {
    const opposite: ChallengePayload = {
      version: 2,
      challengerModelId: 'H-X01',
      challengerHumanity: 20,
      challengerEnding: 'MACHINE',
      challengerClass: 'KINETIC AUTOMATON',
      seed: 11111,
      predictability: 98,
      curiosity: 10,
      obedience: 95,
      instinct: 15,
      motorChaos: 2,
      decisionSpeed: 95,
    };

    const report = compareMachineTwins(baseDNA, 'VERIFIED', 'ADAPTIVE OBSERVER', opposite);
   expect(report.divergenceScore).toBeGreaterThan(50);
expect(report.similarityScore).toBeLessThan(50);
  });

  it('identifies the dominant shared-metric difference', () => {
    const challenger = { ...identicalChallenge, instinct: 10 };
    const report = compareMachineTwins(baseDNA, 'VERIFIED', 'ADAPTIVE OBSERVER', challenger);
    expect(report.dominantDivergenceTrait).toBe('INSTINCT');
    expect(report.traits.instinct.delta).toBe(60);
  });

  it('does not add an artificial numeric bonus just because endings differ', () => {
    const differentEnding = { ...identicalChallenge, challengerEnding: 'ANOMALY' };
    const report = compareMachineTwins(baseDNA, 'VERIFIED', 'ADAPTIVE OBSERVER', differentEnding);
    expect(report.similarityScore).toBe(100);
    expect(report.divergenceScore).toBe(0);
    expect(report.narrativeObservations[0]).toContain('VERIFIED');
    expect(report.narrativeObservations[0]).toContain('ANOMALY');
  });

  it('keeps all comparison outputs bounded at metric extremes', () => {
    const zero: ChallengePayload = {
      version: 2,
      challengerModelId: 'Z-00',
      challengerHumanity: 0,
      challengerEnding: 'MACHINE',
      challengerClass: 'NULL SUBJECT',
      seed: 0,
      predictability: 0,
      curiosity: 0,
      obedience: 0,
      instinct: 0,
      motorChaos: 0,
      decisionSpeed: 0,
    };
    const report = compareMachineTwins(baseDNA, 'VERIFIED', 'ADAPTIVE OBSERVER', zero);
    expect(report.divergenceScore).toBeGreaterThanOrEqual(0);
    expect(report.divergenceScore).toBeLessThanOrEqual(100);
    expect(report.similarityScore).toBeGreaterThanOrEqual(0);
    expect(report.similarityScore).toBeLessThanOrEqual(100);
  });

  it('builds a deterministic render-only challenger approximation', () => {
    const a = challengerPayloadToRenderDNA(identicalChallenge);
    const b = challengerPayloadToRenderDNA(identicalChallenge);
    expect(a).toEqual(b);
    expect(a.seed).toBe(42091);
    expect(a.modelId).toBe('M-8821');
    expect(a.faceTrainingCompletion).toBe(0);
    expect(a.memoryConfidence).toBe(0.5);
  });

  it('derives a deterministic render seed for legacy links without a seed', () => {
    const legacy: ChallengePayload = {
      challengerModelId: 'SUB-404',
      challengerHumanity: 78,
      challengerEnding: 'ANOMALY',
      challengerClass: 'IRREGULAR SUBJECT',
    };
    const a = challengerPayloadToRenderDNA(legacy);
    const b = challengerPayloadToRenderDNA(legacy);
    expect(a.seed).toBeGreaterThan(0);
    expect(a.seed).toBe(b.seed);
  });

  it('uses neutral defaults for legacy dimensions that were never shared', () => {
    const legacy: ChallengePayload = {
      challengerModelId: 'SUB-404',
      challengerHumanity: 78,
      challengerEnding: 'ANOMALY',
      challengerClass: 'IRREGULAR SUBJECT',
    };
    const renderDna = challengerPayloadToRenderDNA(legacy);
    expect(renderDna.predictability).toBe(0.5);
    expect(renderDna.curiosity).toBe(0.5);
    expect(renderDna.obedience).toBe(0.5);
    expect(renderDna.instinct).toBe(0.5);
  });

  it('uses grounded comparison language without neurological or personality claims', () => {
    const report = compareMachineTwins(baseDNA, 'VERIFIED', 'ADAPTIVE OBSERVER', {
      ...identicalChallenge,
      instinct: 10,
    });
    const text = `${report.narrativeObservations.join(' ')} ${report.divergenceSummary}`.toLowerCase();
    for (const forbidden of [
      'neurological',
      'neuromuscular',
      'brain',
      'personality',
      'biological variance',
      'scientifically proven',
      'clinical analysis',
    ]) {
      expect(text).not.toContain(forbidden);
    }
  });

  it('maps equivalent, higher, and lower deltas consistently', () => {
    const challenger: ChallengePayload = {
      ...identicalChallenge,
      challengerHumanity: 89,
      predictability: 85,
      curiosity: 50,
    };
    const report = compareMachineTwins(baseDNA, 'VERIFIED', 'ADAPTIVE OBSERVER', challenger);
    expect(report.traits.humanity.interpretation).toBe('equivalent');
    expect(report.traits.predictability.interpretation).toBe('lower');
    expect(report.traits.curiosity.interpretation).toBe('higher');
  });

  it('is pure: comparing a challenge does not mutate either input', () => {
    const userBefore = JSON.stringify(baseDNA);
    const challengeBefore = JSON.stringify(identicalChallenge);
    compareMachineTwins(baseDNA, 'VERIFIED', 'ADAPTIVE OBSERVER', identicalChallenge);
    expect(JSON.stringify(baseDNA)).toBe(userBefore);
    expect(JSON.stringify(identicalChallenge)).toBe(challengeBefore);
  });
});
