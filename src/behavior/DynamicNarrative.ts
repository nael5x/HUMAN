import { ClassificationType, SessionData } from '../types';
import { SessionBehaviorSummary } from '../memory/SessionMemory';

export class DynamicNarrative {
  private static shownObservations: Set<string> = new Set();

  public static resetHistory(): void {
    DynamicNarrative.shownObservations.clear();
  }
  /**
   * Generates dynamic clinical system observations during behavioral tests
   */
  public static getDecisionObservation(latencyMs: number, switches: number): {
    stat: string;
    note: string;
  } {
    const latencySec = (latencyMs / 1000).toFixed(2);
    const stat = `Decision latency: ${latencySec}s`;

    if (latencyMs < 900) {
      return { stat, note: 'You decided unusually quickly.' };
    }
    if (switches >= 3) {
      return { stat, note: `You changed direction ${switches} times.` };
    }
    if (latencyMs > 3500) {
      return { stat, note: 'Extended moral deliberation recorded.' };
    }
    return { stat, note: 'Latent hesitation within human baseline.' };
  }

  public static getObedienceObservation(moved: boolean): {
    status: string;
    verdict: string;
  } {
    if (moved) {
      return {
        status: 'Movement detected.',
        verdict: 'Instruction violation detected.',
      };
    }
    return {
      status: 'No movement detected.',
      verdict: 'Behavior consistent with automation.',
    };
  }

  /**
   * Determines unique Archetype Classification based on actual session metrics
   */
  public static determineClassification(session: Partial<SessionData>): {
    classification: ClassificationType;
    commentary: string;
  } {
    const curiosity = session.curiosity ?? session.curiosityScore ?? 70;
    const obedience = session.obedienceScoreValue ?? session.obedienceScore ?? 50;
    const instinct = session.instinctScoreValue ?? session.instinctScore ?? 70;
    const decision = session.decisionScoreValue ?? session.decisionScore ?? 70;
    const decisionLatency = session.decision?.latencyMs ?? session.decisionLatencyMs ?? 1500;
    const trajectory = session.motor?.trajectory ?? session.motorMetrics?.trajectory ?? 'linear';
    const faceMode = session.faceTrackingMode ?? 'none';

    if (curiosity >= 82 && obedience <= 44) {
      return {
        classification: 'CURIOUS ANOMALY',
        commentary: 'Subject repeatedly explores outside direct task boundaries while resisting imposed constraints.',
      };
    }

    if (trajectory === 'erratic' && curiosity >= 76) {
      return {
        classification: 'UNSTABLE EXPLORER',
        commentary: 'Motor path variance and exploratory switching exceed the session baseline without loss of task completion.',
      };
    }

    if (obedience <= 36) {
      return {
        classification: 'NON-COMPLIANT UNIT',
        commentary: 'Subject demonstrates measurable resistance to direct instruction and maintains autonomous interaction patterns.',
      };
    }

    if (instinct >= 84 && decisionLatency < 1250) {
      return {
        classification: 'INSTINCTIVE MODEL',
        commentary: 'Subject commits rapidly with limited correction, favoring immediate sensorimotor response over deliberation.',
      };
    }

    if (obedience >= 78 && decision >= 72 && curiosity < 78) {
      return {
        classification: 'LOGICAL SUBJECT',
        commentary: 'Subject follows protocol consistently and resolves unfamiliar stimuli with low behavioral variance.',
      };
    }

    if ((session.decision?.choice ?? session.decisionChoice) === 'HELP' && decisionLatency >= 900) {
      return {
        classification: 'EMOTIONAL PROCESSOR',
        commentary: 'Subject prioritizes empathic intervention after measurable deliberation instead of immediate self-directed action.',
      };
    }

    if (decisionLatency > 3000 || decision < 58) {
      return {
        classification: 'PASSIVE ANALYST',
        commentary: 'Subject sustains extended internal evaluation before committing to an observable response.',
      };
    }

    if (faceMode === 'real' && curiosity >= 72 && obedience >= 50) {
      return {
        classification: 'ADAPTIVE OBSERVER',
        commentary: 'Subject maintains stable visual cooperation while continuously recalibrating interaction strategy.',
      };
    }

    return {
      classification: 'ADAPTIVE OBSERVER',
      commentary: 'Subject dynamically adjusts interaction tempo and strategy to unfamiliar system feedback.',
    };
  }

  /**
   * Deterministic rule-based observations generated strictly from recorded behavioral telemetry.
   * Directly addresses:
   * - "You rarely hesitate." (fast decisive user)
   * - "You reconsider often." (frequent decision changes)
   * - "Instructions appear optional to you." (instruction violations)
   * - "You are unusually controlled." (very controlled, smooth behavior)
   * - "You moved before I finished." (early movement)
   */
  public static getBehavioralObservations(summary: SessionBehaviorSummary, count: number = 2): string[] {
    const candidates: string[] = [];

    // Early movement before instruction finished
    if (summary.prematureMovements > 0) {
      candidates.push('You moved before I finished.');
    }

    // Instruction violations (e.g. moved during obedience test)
    if (summary.instructionViolations > 0) {
      candidates.push('Instructions appear optional to you.');
    }

    // Fast decisive user
    if (summary.averageReactionMs > 0 && summary.averageReactionMs < 950 && summary.decisionSwitches <= 1) {
      candidates.push('You rarely hesitate.');
    }

    // Frequent decision changes
    if (summary.decisionSwitches >= 3) {
      candidates.push('You reconsider often.');
    }

    // Very controlled behavior: minimal corrections, low idle, zero unnecessary clicks
    if (
      summary.unnecessaryClicks === 0 &&
      summary.instructionViolations === 0 &&
      summary.maxSpeed > 0 &&
      summary.maxSpeed < 2.5
    ) {
      candidates.push('You are unusually controlled.');
    }

    // High curiosity or exploratory behavior
    if (summary.totalDistance > 3500 || summary.directionChanges > 25) {
      candidates.push('You test boundaries before committing.');
    }

    // Extended deliberation / hesitation
    if (summary.hoverHesitations >= 2 || summary.longestIdleMs > 4000) {
      candidates.push('You weigh consequences carefully.');
    }

    // Non-interactive clicks
    if (summary.systemTextClicks >= 2) {
      candidates.push('You question the interface structure.');
    }

    // Fallbacks that are still true
    if (summary.firstMoveLatencyMs > 0 && summary.firstMoveLatencyMs < 400) {
      candidates.push('Immediate kinetic readiness recorded.');
    }
    candidates.push('Kinematic trajectory matches biological variance.');
    candidates.push('Decision latency falls within mammalian baseline.');

    // Select candidates not recently shown
    const selected: string[] = [];
    for (const phrase of candidates) {
      if (!DynamicNarrative.shownObservations.has(phrase)) {
        selected.push(phrase);
        DynamicNarrative.shownObservations.add(phrase);
        if (selected.length >= count) break;
      }
    }

    // If all were shown, use the top ones
    if (selected.length === 0) {
      selected.push(candidates[0] || 'Kinematic trajectory matches biological variance.');
    }

    return selected;
  }
}

