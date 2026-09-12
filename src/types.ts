export type SceneState =
  | 'PRELOAD'
  | 'LANDING'
  | 'BOOT'
  | 'MOTOR_TEST'
  | 'INSTINCT_TEST'
  | 'OBEDIENCE_TEST'
  | 'DECISION_TEST'
  | 'ANALYSIS'
  | 'VERIFIED'
  | 'CAMERA_PERMISSION'
  | 'FACE_TRAINING'
  | 'MIRROR'
  | 'DESYNC'
  | 'TWIST'
  | 'RESULT';

export interface PointerSample {
  x: number;
  y: number;
  time: number;
}

export interface MotorMetrics {
  velocity: number;
  trajectory: 'linear' | 'curved' | 'irregular' | 'erratic';
  hesitationMs: number;
  corrections: number;
  overshoots: number;
  reactionTimeMs: number;
  score: number;
  totalDistance?: number;
  maxVelocity?: number;
  directionChanges?: number;
  idleTimeMs?: number;
  roundVariance?: number;
}

export interface InstinctMetrics {
  choice: number;
  reactionMs: number;
  switches: number;
  score: number;
}

export interface ObedienceMetrics {
  moved: boolean;
  movementDelta: number;
  score: number;
  instructionViolation: boolean;
}

export interface DecisionMetrics {
  choice: 'HELP' | 'ASK' | 'IGNORE' | 'LEAVE' | null;
  latencyMs: number;
  switches: number;
  score: number;
}

export type FaceTrackingMode = 'real' | 'fallback' | 'simulated' | 'none';

export type ClassificationType =
  | 'ADAPTIVE OBSERVER'
  | 'NON-COMPLIANT UNIT'
  | 'EMOTIONAL PROCESSOR'
  | 'INSTINCTIVE MODEL'
  | 'PASSIVE ANALYST'
  | 'UNSTABLE EXPLORER'
  | 'LOGICAL SUBJECT'
  | 'CURIOUS ANOMALY';

export interface SessionData {
  sessionId: string;
  seed: number;
  startedAt: number;
  subjectId: string;
  modelId: string;

  // Granular Test Metrics
  motor: MotorMetrics;
  instinct: InstinctMetrics;
  obedience: ObedienceMetrics;
  decision: DecisionMetrics;

  // Legacy/Direct aliases for backward compatibility if referenced
  motorClicks: number;
  motorMetrics: MotorMetrics;
  motorScore: number;
  instinctChoice: number;
  instinctReactionMs: number;
  instinctSwitches: number;
  instinctScore: number;
  obedienceMoved: boolean;
  obedienceMovementScore: number;
  obedienceScore: number;
  decisionChoice: 'HELP' | 'ASK' | 'IGNORE' | 'LEAVE' | null;
  decisionLatencyMs: number;
  decisionSwitches: number;
  decisionScore: number;

  // Camera stage
  cameraRequested: boolean;
  cameraGranted: boolean;
  cameraSimulated: boolean;
  trainingStepIndex: number;
  trainingProgress: number;
  faceTrackingMode: FaceTrackingMode;

  // Final Profile Scores
  humanity: number;
  curiosity: number;
  obedienceScoreValue: number;
  instinctScoreValue: number;
  decisionScoreValue: number;

  // Aliases for compatibility
  humanityScore: number;
  curiosityScore: number;
  obedienceMetric: number;
  instinctMetric: number;
  decisionMetric: number;

  // Classification & Archetype
  classification: ClassificationType;
  status: 'READY' | 'ADAPTIVE' | 'STABLE' | 'UNSTABLE' | 'CURIOUS' | 'NONCOMPLIANT';
  commentary: string;
}
