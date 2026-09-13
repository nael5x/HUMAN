import { SessionBehaviorSummary, PredictionRoundData } from '../memory/SessionMemory';
import { SeededRandom } from '../dna/MachineDNA';

export interface SealedPrediction {
  readonly targetId: string;
  readonly round: number;
  readonly predictedChoice: 'LEFT' | 'RIGHT';
  readonly confidence: number; // bounded model confidence [0.0, 1.0]
  readonly committedAt: number;
  readonly evidence: readonly string[];
  readonly sealId: string;
}

export type PredictionOutcome = 'EXACT_MATCH' | 'NEAR_MATCH' | 'FAILURE';
export type PredictionSelectionPhase = 'OBSERVING' | 'SEALED' | 'ANALYZING' | 'REVEALED';

export interface PredictionEvaluation {
  outcome: PredictionOutcome;
  isCorrect: boolean;
  statusText: string;
  subText: string;
  evidenceSummary: string;
}

export interface PredictionContext {
  round: number;
  seed: number;
  sessionSummary: SessionBehaviorSummary;
  priorRounds: PredictionRoundData[];
  initialHeading?: 'LEFT' | 'RIGHT' | null;
  initialHover?: 'LEFT' | 'RIGHT' | null;
  observationTimeMs?: number;
}

function stableHash(input: string): number {
  // FNV-1a style 32-bit identifier. This is a deterministic commitment ID,
  // not a cryptographic proof and is never presented as one in the UI.
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function generateSealId(payload: {
  targetId: string;
  round: number;
  predictedChoice: 'LEFT' | 'RIGHT';
  confidence: number;
  evidence: readonly string[];
}): string {
  const serialized = JSON.stringify(payload);
  const hex = stableHash(serialized).toString(16).toUpperCase().padStart(8, '0');
  return `CMT-${hex}`;
}

/**
 * Pure selection gate shared by the UI and tests.
 * A final choice is valid only after a prediction exists and the scene visibly
 * entered SEALED state.
 */
export function canAcceptPredictionSelection(
  phase: PredictionSelectionPhase,
  sealed: SealedPrediction | null
): boolean {
  return phase === 'SEALED' && sealed !== null;
}

/**
 * PredictionEngine
 * Pure deterministic prediction generator.
 * Uses only local session telemetry, prior trial choices, and seeded variation.
 */
export class PredictionEngine {
  /**
   * Generates an immutable SealedPrediction before user commitment.
   */
  public static generatePrediction(context: PredictionContext): SealedPrediction {
    const { round, seed, sessionSummary, priorRounds, initialHeading, initialHover } = context;
    const rng = new SeededRandom(seed + round * 31337);

    let leftScore = 50;
    let rightScore = 50;
    const evidence: string[] = [];

    // Factor 1: measured session hesitation / reaction cadence.
    if (sessionSummary.hoverHesitations > 2) {
      leftScore += 18;
      evidence.push(`Session hover hesitation count reached ${sessionSummary.hoverHesitations}.`);
    } else if (sessionSummary.averageReactionMs > 1100) {
      leftScore += 18;
      evidence.push(`Mean recorded reaction time exceeded 1100ms (${sessionSummary.averageReactionMs}ms).`);
    } else if (sessionSummary.averageReactionMs > 0 && sessionSummary.averageReactionMs < 550) {
      rightScore += 16;
      evidence.push(`Mean recorded reaction time remained below 550ms (${sessionSummary.averageReactionMs}ms).`);
    }

    // Factor 2: measured path variation / earlier instruction violations.
    if (sessionSummary.directionChanges > 8 || sessionSummary.instructionViolations > 0) {
      rightScore += 12;
      if (sessionSummary.directionChanges > 8) {
        evidence.push(`Pointer path changed direction ${sessionSummary.directionChanges} times earlier in the session.`);
      } else {
        evidence.push('An earlier instruction violation was recorded in this session.');
      }
    } else {
      leftScore += 8;
      evidence.push(`Pointer direction changes remained limited (${sessionSummary.directionChanges}).`);
    }

    // Factor 3: trial-local history and pre-commitment pointer tendency.
    if (round === 1) {
      if (initialHeading === 'RIGHT' || initialHover === 'RIGHT') {
        rightScore += 15;
        evidence.push('Pre-commitment pointer vector favored Vector-02.');
      } else if (initialHeading === 'LEFT' || initialHover === 'LEFT') {
        leftScore += 15;
        evidence.push('Pre-commitment pointer vector favored Vector-01.');
      } else if (rng.next() > 0.48) {
        rightScore += 10;
        evidence.push('No dominant pre-commitment direction was measured; seeded tie-breaker favored Vector-02.');
      } else {
        leftScore += 10;
        evidence.push('No dominant pre-commitment direction was measured; seeded tie-breaker favored Vector-01.');
      }
    } else if (round === 2) {
      const prevChoice = priorRounds[0]?.chosen;
      if (prevChoice === 'LEFT') {
        rightScore += 24;
        evidence.push('Trial 01 selected LEFT; the model tested a directional switch for Trial 02.');
      } else if (prevChoice === 'RIGHT') {
        leftScore += 24;
        evidence.push('Trial 01 selected RIGHT; the model tested a directional switch for Trial 02.');
      }
    } else if (round === 3) {
      const r1 = priorRounds[0]?.chosen;
      const r2 = priorRounds[1]?.chosen;

      if (r1 && r2 && r1 !== r2) {
        if (sessionSummary.instructionViolations === 0 && sessionSummary.decisionSwitches <= 1) {
          const expected = r1;
          if (expected === 'LEFT') leftScore += 26;
          else rightScore += 26;
          evidence.push('The first two prediction choices alternated and earlier decision switching remained limited.');
        } else {
          const expected = r2;
          if (expected === 'LEFT') leftScore += 22;
          else rightScore += 22;
          evidence.push('The first two choices alternated; earlier switch or instruction history favored repetition.');
        }
      } else if (r1 && r2 && r1 === r2) {
        const opposite = r1 === 'LEFT' ? 'RIGHT' : 'LEFT';
        if (opposite === 'LEFT') leftScore += 28;
        else rightScore += 28;
        evidence.push(`The first two prediction choices both selected ${r1}; the model tested inversion.`);
      }
    }

    // Small deterministic variation prevents an unrealistically perfect predictor.
    const seedOffset = (rng.next() - 0.5) * 14;
    rightScore += seedOffset;

    const predictedChoice: 'LEFT' | 'RIGHT' = rightScore > leftScore ? 'RIGHT' : 'LEFT';
    const margin = Math.abs(rightScore - leftScore);
    const confidence = Math.min(0.88, Math.max(0.58, 0.58 + (margin / 100) * 0.3));
    const roundedConfidence = Math.round(confidence * 100) / 100;

    if (evidence.length === 0) {
      evidence.push('No dominant measured tendency was available; seeded tie-breaker applied.');
    }

    const targetId = `ROUND-0${round}`;
    const frozenEvidence = Object.freeze(evidence.slice(0, 2));
    const sealId = generateSealId({
      targetId,
      round,
      predictedChoice,
      confidence: roundedConfidence,
      evidence: frozenEvidence,
    });

    return Object.freeze({
      targetId,
      round,
      predictedChoice,
      confidence: roundedConfidence,
      committedAt: performance.now(),
      evidence: frozenEvidence,
      sealId,
    });
  }

  /**
   * Evaluates the outcome of a sealed prediction against the user's action.
   */
  public static evaluateOutcome(
    sealed: SealedPrediction,
    chosen: 'LEFT' | 'RIGHT',
    changedMind: boolean,
    hoverSwitches: number
  ): PredictionEvaluation {
    const isCorrect = sealed.predictedChoice === chosen;
    const hesitated = changedMind || hoverSwitches > 0;

    let outcome: PredictionOutcome;
    let statusText: string;
    let subText: string;

    if (isCorrect) {
      if (!hesitated) {
        outcome = 'EXACT_MATCH';
        statusText = 'Prediction confirmed.';
        subText = `Predicted: ${sealed.predictedChoice} // Selected: ${chosen}`;
      } else {
        outcome = 'NEAR_MATCH';
        statusText = 'Trajectory stabilized.';
        subText = `Predicted: ${sealed.predictedChoice} // Deliberation recorded before confirmation.`;
      }
    } else {
      outcome = 'FAILURE';
      if (hesitated) {
        statusText = 'You changed your mind.';
        subText = `Predicted: ${sealed.predictedChoice} // Final selection diverged after deliberation.`;
      } else {
        statusText = 'Unexpected divergence.';
        subText = `Predicted: ${sealed.predictedChoice} // Selected: ${chosen}`;
      }
    }

    const evidenceSummary = sealed.evidence[0] || 'Measured interaction history informed the commitment.';

    return {
      outcome,
      isCorrect,
      statusText,
      subText,
      evidenceSummary,
    };
  }
}

/**
 * SealedPredictionManager
 * Enforces strict single-commitment lifecycle for each round.
 */
export class SealedPredictionManager {
  private sealedPrediction: SealedPrediction | null = null;
  private committedRound: number = -1;

  public commit(context: PredictionContext): SealedPrediction {
    if (this.sealedPrediction && this.committedRound === context.round) {
      return this.sealedPrediction;
    }

    const prediction = PredictionEngine.generatePrediction(context);
    this.sealedPrediction = prediction;
    this.committedRound = context.round;
    return prediction;
  }

  public getSealed(): SealedPrediction | null {
    return this.sealedPrediction;
  }

  public isCommittedForRound(round: number): boolean {
    return this.sealedPrediction !== null && this.committedRound === round;
  }

  public resetForRound(): void {
    this.sealedPrediction = null;
    this.committedRound = -1;
  }
}
