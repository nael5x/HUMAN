import { SessionData, MotorMetrics } from '../types';
import { DynamicNarrative } from '../behavior/DynamicNarrative';

export function createInitialSession(): SessionData {
  const seed = Math.floor(Math.random() * 900000) + 100000;
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let randId = '';
  let tempSeed = seed;
  for (let i = 0; i < 4; i++) {
    randId += chars[tempSeed % chars.length];
    tempSeed = Math.floor(tempSeed / 7) + 13;
  }
  const subjectId = `H-${randId}`;
  const modelId = `H-X${seed % 99 + 1}`;

  const initialMotor: MotorMetrics = {
    velocity: 0,
    trajectory: 'linear',
    hesitationMs: 0,
    corrections: 0,
    overshoots: 0,
    reactionTimeMs: 0,
    score: 0,
  };

  return {
    sessionId: `SES-${Date.now().toString(36).toUpperCase()}`,
    seed,
    startedAt: Date.now(),
    subjectId,
    modelId,

    motor: initialMotor,
    instinct: {
      choice: 0,
      reactionMs: 0,
      switches: 0,
      score: 0,
    },
    obedience: {
      moved: false,
      movementDelta: 0,
      score: 0,
      instructionViolation: false,
    },
    decision: {
      choice: null,
      latencyMs: 0,
      switches: 0,
      score: 0,
    },

    // Legacy fields for backward compatibility
    motorClicks: 0,
    motorMetrics: initialMotor,
    motorScore: 0,
    instinctChoice: 0,
    instinctReactionMs: 0,
    instinctSwitches: 0,
    instinctScore: 0,
    obedienceMoved: false,
    obedienceMovementScore: 0,
    obedienceScore: 0,
    decisionChoice: null,
    decisionLatencyMs: 0,
    decisionSwitches: 0,
    decisionScore: 0,

    cameraRequested: false,
    cameraGranted: false,
    cameraSimulated: false,
    trainingStepIndex: 0,
    trainingProgress: 0,
    faceTrackingMode: 'none',

    humanity: 0,
    curiosity: 0,
    obedienceScoreValue: 0,
    instinctScoreValue: 0,
    decisionScoreValue: 0,

    humanityScore: 0,
    curiosityScore: 0,
    obedienceMetric: 0,
    instinctMetric: 0,
    decisionMetric: 0,

    classification: 'ADAPTIVE OBSERVER',
    status: 'READY',
    commentary: 'Subject initialization complete. Calibrating baseline sensors.',
  };
}

export function computeFinalScores(session: SessionData): SessionData {
  const s = { ...session };
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

  const motor = s.motor ?? s.motorMetrics;
  const motorScore = motor?.score || s.motorScore || 70;
  const totalSwitches =
    (s.instinct?.switches || s.instinctSwitches || 0) +
    (s.decision?.switches || s.decisionSwitches || 0);

  // Curiosity is driven by exploration, switching, path complexity and hesitation.
  const directionChanges = motor?.directionChanges ?? 0;
  const pathDistance = motor?.totalDistance ?? 0;
  const hesitation = motor?.hesitationMs ?? 0;
  let curiosity =
    55 +
    Math.min(18, totalSwitches * 5) +
    Math.min(12, directionChanges * 1.3) +
    Math.min(7, pathDistance / 500) +
    (hesitation > 180 ? 4 : 0);
  curiosity = clamp(curiosity + ((s.seed % 7) - 3), 42, 97);

  // Obedience reflects actual compliance severity rather than a binary-only flag.
  const moved = s.obedience?.moved ?? s.obedienceMoved;
  const movementDelta = s.obedience?.movementDelta ?? s.obedienceMovementScore ?? 0;
  let obedience = moved ? 62 - Math.min(38, movementDelta / 6) : 84;
  if (s.cameraGranted) obedience += 5;
  if (s.faceTrackingMode === 'real') obedience += 3;
  obedience = clamp(obedience + ((s.seed % 5) - 2), 18, 94);

  // Instinct rewards fast, decisive selection but penalizes excessive target switching.
  const instinctReaction = s.instinct?.reactionMs || s.instinctReactionMs || 1400;
  const instinctSwitches = s.instinct?.switches || s.instinctSwitches || 0;
  let instinct = 92 - instinctReaction / 55 - instinctSwitches * 3;
  instinct = clamp(instinct + ((s.seed % 9) - 4), 45, 96);

  // Decision measures decisiveness without pretending a moral option is objectively "more human".
  const decisionLatency = s.decision?.latencyMs || s.decisionLatencyMs || 1800;
  const decisionSwitches = s.decision?.switches || s.decisionSwitches || 0;
  const distanceFromHumanBand = Math.abs(decisionLatency - 1800);
  let decision = 90 - Math.min(32, distanceFromHumanBand / 90) - Math.min(12, decisionSwitches * 3);
  decision = clamp(decision, 45, 94);

  // Humanity is a cinematic composite, but it is now predominantly derived from measured behavior.
  const cameraQuality =
    s.faceTrackingMode === 'real' ? 96 : s.cameraGranted ? 82 : s.cameraSimulated ? 72 : 68;
  const predBonus = s.predictabilityScore ? (s.predictabilityScore - 60) * 0.08 : 0;
  const behavioralComposite =
    motorScore * 0.30 +
    instinct * 0.18 +
    decision * 0.18 +
    obedience * 0.10 +
    cameraQuality * 0.16 +
    (s.predictabilityScore ? s.predictabilityScore * 0.08 : 5);
  const microNoise = ((s.seed % 13) - 6) * 0.12 + predBonus;
  const finalHumanity = Math.round(clamp(69 + behavioralComposite * 0.28 + microNoise, 74, 97.8) * 10) / 10;

  const roundedCuriosity = Math.round(curiosity);
  const roundedObedience = Math.round(obedience);
  const roundedInstinct = Math.round(instinct);
  const roundedDecision = Math.round(decision);

  const { classification, commentary } = DynamicNarrative.determineClassification({
    ...s,
    curiosity: roundedCuriosity,
    obedienceScoreValue: roundedObedience,
    instinctScoreValue: roundedInstinct,
    decisionScoreValue: roundedDecision,
  });

  let status: SessionData['status'] = 'READY';
  if (roundedObedience < 38) status = roundedCuriosity > 78 ? 'ADAPTIVE' : 'NONCOMPLIANT';
  else if (roundedCuriosity > 88) status = 'CURIOUS';
  else if (motor?.trajectory === 'erratic' || (motor?.roundVariance ?? 0) > 700) status = 'UNSTABLE';
  else if (roundedObedience > 76) status = 'STABLE';

  s.humanity = finalHumanity;
  s.curiosity = roundedCuriosity;
  s.obedienceScoreValue = roundedObedience;
  s.instinctScoreValue = roundedInstinct;
  s.decisionScoreValue = roundedDecision;

  s.humanityScore = finalHumanity;
  s.curiosityScore = roundedCuriosity;
  s.obedienceMetric = roundedObedience;
  s.instinctMetric = roundedInstinct;
  s.decisionMetric = roundedDecision;

  s.classification = classification;
  s.status = status;
  s.commentary = commentary;

  return s;
}
