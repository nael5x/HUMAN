import { SessionData, MotorMetrics, ClassificationType } from '../types';
import { sessionMemory, SessionBehaviorSummary } from '../memory/SessionMemory';

/**
 * MachineDNA
 * Normalized [0.0, 1.0] behavioral profile derived from actual telemetry.
 * Powers deterministic procedural reconstruction of the Machine Twin organism.
 */
export interface MachineDNA {
  // Core Dimensions [0.0 -> 1.0]
  humanity: number;
  curiosity: number;
  obedience: number;
  instinct: number;
  decisionSpeed: number;
  predictability: number;
  motorChaos: number;
  motorPrecision: number;
  hesitation: number;
  exploration: number;
  instructionResistance: number;
  memoryConfidence: number;
  faceTrainingCompletion: number;
  realFaceTraining: boolean;
  behavioralStability: number;

  // Metadata
  seed: number;
  modelId: string;
  sourceSubjectId: string;
}

export type MachineArchetype = ClassificationType;

export type EndingType = 'VERIFIED' | 'ANOMALY' | 'MACHINE' | 'REPLACED';

export interface EndingResolution {
  type: EndingType;
  title: string;
  subtitle: string;
  description: string;
  rarityPercentage: number;
  reason: string;
}

const clamp01 = (val: number): number => Math.max(0, Math.min(1, val));

/**
 * Seeded pseudo-random generator (LCG)
 * Guarantees that the exact same session seed produces the exact same random stream.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = Math.abs(seed) || 123456789;
  }

  public next(): number {
    this.state = (this.state * 1664525 + 1013904223) % 4294967296;
    return this.state / 4294967296;
  }

  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  public int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
}

/**
 * Extracts and normalizes MachineDNA directly from the SessionData and SessionMemory
 */
export function extractMachineDNA(session: SessionData): MachineDNA {
  const summary: SessionBehaviorSummary = sessionMemory.getSummary();
  const motor: MotorMetrics = session.motor ?? session.motorMetrics;

  const humanityVal = (session.humanity ?? session.humanityScore ?? 86) / 100;
  const curiosityVal = (session.curiosity ?? session.curiosityScore ?? 75) / 100;
  const obedienceVal = (session.obedienceScoreValue ?? session.obedienceMetric ?? 50) / 100;
  const instinctVal = (session.instinctScoreValue ?? session.instinctMetric ?? 70) / 100;
  const decisionLatency = session.decision?.latencyMs || session.decisionLatencyMs || 1800;

  // decisionSpeed: faster response -> closer to 1.0 (clamped between 400ms and 4500ms)
  const decisionSpeed = clamp01(1 - (decisionLatency - 400) / 3800);

  // predictability: from prediction test or predictabilityScore
  const predScore = session.predictabilityScore ?? (sessionMemory.getPredictionTest()?.predictabilityScore ?? 66);
  const predictability = clamp01(predScore / 100);

  // motorChaos: driven by direction changes, overshoots, corrections, trajectory
  const trajectoryFactor =
    motor.trajectory === 'erratic' ? 0.4 : motor.trajectory === 'irregular' ? 0.25 : 0.05;
  const motorChaos = clamp01(
    (motor.corrections * 0.12) +
    (motor.overshoots * 0.14) +
    (summary.directionChanges * 0.02) +
    trajectoryFactor
  );

  // motorPrecision: inverse of chaos, weighted by score
  const motorPrecision = clamp01((motor.score / 100) * 0.6 + (1 - motorChaos) * 0.4);

  // hesitation: motor hesitation + hover hesitations + longest idle
  const hesitation = clamp01(
    ((motor.hesitationMs ?? 0) / 1000) * 0.35 +
    summary.hoverHesitations * 0.2 +
    (summary.longestIdleMs / 6000) * 0.2
  );

  // exploration: total distance + decision switches + system text clicks
  const exploration = clamp01(
    (summary.totalDistance / 5000) * 0.5 +
    summary.decisionSwitches * 0.15 +
    summary.systemTextClicks * 0.12
  );

  // instructionResistance: obedience failures, violations, premature movements
  const violations = summary.instructionViolations + (summary.prematureMovements > 0 ? 1 : 0);
  const instructionResistance = clamp01(
    (1 - obedienceVal) * 0.55 + violations * 0.25 + (summary.unnecessaryClicks > 0 ? 0.15 : 0)
  );

  // memoryConfidence: memory test score and hesitation
  const memoryTest = sessionMemory.getMemoryTest();
  const memoryConfidence = memoryTest
    ? clamp01(
        (memoryTest.isCorrect ? 0.7 : 0.2) +
        (memoryTest.confidenceHesitationMs > 1800 ? -0.2 : 0.25)
      )
    : 0.6;

  // faceTrainingCompletion: only real MediaPipe completion can reach full imitation parity.
  // Simulated/fallback paths remain valid narratively, but cannot unlock camera-dependent endings.
  const realFaceTraining =
    session.faceTrackingMode === 'real' && summary.trainingCompletion && summary.faceAcquired;
  const faceTrainingCompletion = realFaceTraining
    ? 1.0
    : summary.trainingCompletion
      ? 0.55
      : 0.35;

  // behavioralStability: consistency across tests
  const behavioralStability = clamp01(
    (1 - motorChaos) * 0.4 +
    (1 - instructionResistance) * 0.3 +
    humanityVal * 0.3
  );

  return {
    humanity: clamp01(humanityVal),
    curiosity: clamp01(curiosityVal),
    obedience: clamp01(obedienceVal),
    instinct: clamp01(instinctVal),
    decisionSpeed: clamp01(decisionSpeed),
    predictability: clamp01(predictability),
    motorChaos: clamp01(motorChaos),
    motorPrecision: clamp01(motorPrecision),
    hesitation: clamp01(hesitation),
    exploration: clamp01(exploration),
    instructionResistance: clamp01(instructionResistance),
    memoryConfidence: clamp01(memoryConfidence),
    faceTrainingCompletion: clamp01(faceTrainingCompletion),
    realFaceTraining,
    behavioralStability: clamp01(behavioralStability),
    seed: session.seed,
    modelId: session.modelId || `H-X${(session.seed % 99) + 1}`,
    sourceSubjectId: session.subjectId,
  };
}

/**
 * Resolves Machine Archetype based strictly on behavioral DNA dimensions
 */
export function resolveMachineArchetype(dna: MachineDNA): MachineArchetype {
  if (dna.curiosity > 0.82 || (dna.exploration > 0.75 && dna.predictability < 0.55)) {
    return 'CURIOUS ANOMALY';
  }

  if (dna.instructionResistance > 0.68 || dna.obedience < 0.35) {
    return 'NON-COMPLIANT UNIT';
  }

  if (dna.motorChaos > 0.72 || dna.behavioralStability < 0.35) {
    return 'UNSTABLE EXPLORER';
  }

  if (dna.instinct > 0.78 && dna.decisionSpeed > 0.7) {
    return 'INSTINCTIVE MODEL';
  }

  if (dna.predictability > 0.72 && dna.obedience > 0.65 && dna.motorPrecision > 0.6) {
    return 'LOGICAL SUBJECT';
  }

  if (dna.decisionSpeed < 0.35 || dna.hesitation > 0.65) {
    return 'PASSIVE ANALYST';
  }

  return 'ADAPTIVE OBSERVER';
}
