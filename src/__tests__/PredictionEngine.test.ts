import { describe, it, expect, beforeEach } from 'vitest';
import {
  PredictionEngine,
  SealedPredictionManager,
  PredictionContext,
  canAcceptPredictionSelection,
} from '../prediction/PredictionEngine';
import { SessionBehaviorSummary } from '../memory/SessionMemory';

const mockSummary: SessionBehaviorSummary = {
  firstMoveLatencyMs: 240,
  totalDistance: 1200,
  maxSpeed: 450,
  directionChanges: 2,
  longestIdleMs: 800,
  prematureMovements: 0,
  instructionViolations: 0,
  unnecessaryClicks: 0,
  systemTextClicks: 0,
  decisionSwitches: 0,
  hoverHesitations: 0,
  averageReactionMs: 650,
  secretsFound: [],
  cameraGranted: false,
  cameraDenied: false,
  faceAcquired: false,
  gestureSuccessCount: 0,
  gestureRetryCount: 0,
  trainingCompletion: false,
  mirrorStillnessDetected: false,
  mirrorSequenceCompleted: false,
  predictionExactMatches: 0,
  predictionNearMatches: 0,
  predictionFailures: 0,
};

describe('PredictionEngine - Sealed Prediction System', () => {
  let manager: SealedPredictionManager;

  beforeEach(() => {
    manager = new SealedPredictionManager();
  });

  it('seals a prediction deterministically for the same seed and context', () => {
    const context1: PredictionContext = {
      round: 1,
      seed: 42000,
      sessionSummary: mockSummary,
      priorRounds: [],
    };

    const context2: PredictionContext = {
      round: 1,
      seed: 42000,
      sessionSummary: mockSummary,
      priorRounds: [],
    };

    const p1 = PredictionEngine.generatePrediction(context1);
    const p2 = PredictionEngine.generatePrediction(context2);

    expect(p1.predictedChoice).toBe(p2.predictedChoice);
    expect(p1.confidence).toBe(p2.confidence);
    expect(p1.sealId).toBe(p2.sealId);
    expect(p1.evidence).toEqual(p2.evidence);
  });

  it('returns frozen/immutable sealed predictions', () => {
    const context: PredictionContext = {
      round: 1,
      seed: 55112,
      sessionSummary: mockSummary,
      priorRounds: [],
    };

    const sealed = PredictionEngine.generatePrediction(context);
    expect(Object.isFrozen(sealed)).toBe(true);

    // Attempting mutation should throw or fail in strict mode
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sealed as any).predictedChoice = 'RIGHT';
    }).toThrow();
  });

  it('guarantees single-commitment per round in SealedPredictionManager', () => {
    const contextA: PredictionContext = {
      round: 1,
      seed: 12345,
      sessionSummary: mockSummary,
      priorRounds: [],
      initialHeading: 'LEFT',
    };

    const sealed1 = manager.commit(contextA);
    expect(manager.isCommittedForRound(1)).toBe(true);

    // Subsequent call with different heading must return the EXACT same sealed prediction
    const contextB: PredictionContext = {
      round: 1,
      seed: 12345,
      sessionSummary: mockSummary,
      priorRounds: [],
      initialHeading: 'RIGHT',
    };

    const sealed2 = manager.commit(contextB);
    expect(sealed2).toBe(sealed1);
    expect(sealed2.predictedChoice).toBe(sealed1.predictedChoice);
    expect(sealed2.sealId).toBe(sealed1.sealId);
  });

  it('evaluates exact matches when user makes predicted choice without hesitating', () => {
    const sealed = PredictionEngine.generatePrediction({
      round: 1,
      seed: 99999,
      sessionSummary: mockSummary,
      priorRounds: [],
    });

    const evalResult = PredictionEngine.evaluateOutcome(
      sealed,
      sealed.predictedChoice,
      false, // did not change mind
      0 // 0 switches
    );

    expect(evalResult.isCorrect).toBe(true);
    expect(evalResult.outcome).toBe('EXACT_MATCH');
    expect(evalResult.statusText).toBe('Prediction confirmed.');
  });

  it('evaluates near matches when user hesitated before confirming predicted choice', () => {
    const sealed = PredictionEngine.generatePrediction({
      round: 1,
      seed: 99999,
      sessionSummary: mockSummary,
      priorRounds: [],
    });

    const evalResult = PredictionEngine.evaluateOutcome(
      sealed,
      sealed.predictedChoice,
      true, // hesitated / changed mind back
      2 // switches
    );

    expect(evalResult.isCorrect).toBe(true);
    expect(evalResult.outcome).toBe('NEAR_MATCH');
    expect(evalResult.statusText).toBe('Trajectory stabilized.');
  });

  it('evaluates divergence when user chose opposite choice', () => {
    const sealed = PredictionEngine.generatePrediction({
      round: 1,
      seed: 99999,
      sessionSummary: mockSummary,
      priorRounds: [],
    });

    const opposite = sealed.predictedChoice === 'LEFT' ? 'RIGHT' : 'LEFT';
    const evalResult = PredictionEngine.evaluateOutcome(sealed, opposite, false, 0);

    expect(evalResult.isCorrect).toBe(false);
    expect(evalResult.outcome).toBe('FAILURE');
  });

  it('adapts round 2 prediction based on round 1 alternation bias', () => {
    const r1Choice = 'LEFT';
    const contextR2: PredictionContext = {
      round: 2,
      seed: 7777,
      sessionSummary: mockSummary,
      priorRounds: [
        {
          round: 1,
          predicted: 'LEFT',
          chosen: r1Choice,
          isCorrect: true,
          changedMind: false,
          latencyMs: 500,
          hoverSwitches: 0,
        },
      ],
    };

    const predR2 = PredictionEngine.generatePrediction(contextR2);
    // Alternation bias strongly favors 'RIGHT' after 'LEFT'
    expect(predR2.predictedChoice).toBe('RIGHT');
    expect(predR2.evidence.some((e) => e.includes('Trial 01 selected LEFT'))).toBe(true);
  });

  it('rejects final selection until a visible sealed prediction exists', () => {
    const sealed = manager.commit({
      round: 1,
      seed: 13579,
      sessionSummary: mockSummary,
      priorRounds: [],
    });

    expect(canAcceptPredictionSelection('OBSERVING', sealed)).toBe(false);
    expect(canAcceptPredictionSelection('SEALED', null)).toBe(false);
    expect(canAcceptPredictionSelection('SEALED', sealed)).toBe(true);
    expect(canAcceptPredictionSelection('ANALYZING', sealed)).toBe(false);
    expect(canAcceptPredictionSelection('REVEALED', sealed)).toBe(false);
  });

  it('produces meaningfully different commitments for different measured contexts', () => {
    const leftContext: PredictionContext = {
      round: 1,
      seed: 24680,
      sessionSummary: {
        ...mockSummary,
        hoverHesitations: 4,
        averageReactionMs: 1450,
        directionChanges: 1,
      },
      priorRounds: [],
      initialHeading: 'LEFT',
    };

    const rightContext: PredictionContext = {
      round: 1,
      seed: 24680,
      sessionSummary: {
        ...mockSummary,
        hoverHesitations: 0,
        averageReactionMs: 320,
        directionChanges: 12,
      },
      priorRounds: [],
      initialHeading: 'RIGHT',
    };

    const leftPrediction = PredictionEngine.generatePrediction(leftContext);
    const rightPrediction = PredictionEngine.generatePrediction(rightContext);

    expect(leftPrediction.predictedChoice).toBe('LEFT');
    expect(rightPrediction.predictedChoice).toBe('RIGHT');
    expect(leftPrediction.sealId).not.toBe(rightPrediction.sealId);
  });

  it('uses session-derived evidence without fabricated population probabilities or biometric claims', () => {
    const prediction = PredictionEngine.generatePrediction({
      round: 2,
      seed: 7777,
      sessionSummary: mockSummary,
      priorRounds: [
        {
          round: 1,
          predicted: 'LEFT',
          chosen: 'LEFT',
          isCorrect: true,
          changedMind: false,
          latencyMs: 500,
          hoverSwitches: 0,
        },
      ],
    });

    const evidenceText = prediction.evidence.join(' ');
    expect(evidenceText).not.toMatch(/probability estimated|biometric|correlat/i);
    expect(prediction.sealId).toMatch(/^CMT-[0-9A-F]{8}$/);
  });

});
