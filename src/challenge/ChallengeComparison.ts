/**
 * ChallengeComparison
 * Pure deterministic comparison of compact, share-safe challenge result values.
 * No DOM, network calls, scoring mutation, or ending resolution occurs here.
 */

import { MachineDNA, EndingType } from '../dna/MachineDNA';
import { ChallengePayload } from '../utils/ChallengeMode';

export interface TraitComparison {
  name: string;
  userValue: number;       // [0, 100]
  challengerValue: number; // [0, 100]
  delta: number;           // user - challenger
  interpretation: 'higher' | 'lower' | 'equivalent';
}

export interface ComparisonReport {
  challengerModelId: string;
  userModelId: string;
  challengerClass: string;
  userClass: string;
  challengerEnding: string;
  userEnding: string;
  similarityScore: number;
  divergenceScore: number;
  humanityDelta: number;
  traits: {
    humanity: TraitComparison;
    predictability: TraitComparison;
    curiosity: TraitComparison;
    obedience: TraitComparison;
    instinct: TraitComparison;
    motorRegularity: TraitComparison;
  };
  dominantDivergenceTrait: string;
  verdictTitle: string;
  divergenceSummary: string;
  narrativeObservations: string[];
}

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const pct = (value: number | undefined, fallback = 50): number =>
  Math.max(0, Math.min(100, Math.round(value ?? fallback)));

function deriveSeed(modelId: string): number {
  let seed = 0;
  for (let i = 0; i < modelId.length; i++) {
    seed = (seed * 31 + modelId.charCodeAt(i)) >>> 0;
  }
  return seed || 104729;
}

/**
 * Builds a render-only approximation for the challenger Twin.
 * It is NEVER passed to extractMachineDNA, EndingResolver, scoring, SessionMemory,
 * prediction, or mirror systems. Missing legacy V1 dimensions use neutral values.
 */
export function challengerPayloadToRenderDNA(payload: ChallengePayload): MachineDNA {
  const humanity = clamp01(payload.challengerHumanity / 100);
  const predictability = clamp01(pct(payload.predictability) / 100);
  const curiosity = clamp01(pct(payload.curiosity) / 100);
  const obedience = clamp01(pct(payload.obedience) / 100);
  const instinct = clamp01(pct(payload.instinct) / 100);
  const motorChaos = clamp01(pct(payload.motorChaos) / 100);
  const decisionSpeed = clamp01(pct(payload.decisionSpeed) / 100);
  const seed = payload.seed ?? deriveSeed(payload.challengerModelId);

  return {
    humanity,
    curiosity,
    obedience,
    instinct,
    decisionSpeed,
    predictability,
    motorChaos,
    motorPrecision: clamp01(1 - motorChaos),
    hesitation: clamp01(1 - decisionSpeed),
    // Render-only approximations for dimensions not serialized in challenge links.
    exploration: curiosity,
    instructionResistance: clamp01(1 - obedience),
    memoryConfidence: 0.5,
    faceTrainingCompletion: 0,
    behavioralStability: predictability,
    seed,
    modelId: payload.challengerModelId,
    sourceSubjectId: `challenge:${payload.challengerModelId}`,
  };
}

export function compareMachineTwins(
  userDna: MachineDNA,
  userEnding: EndingType,
  userClass: string,
  challenger: ChallengePayload
): ComparisonReport {
  const userHumanity = Math.round(userDna.humanity * 100);
  const userPred = Math.round(userDna.predictability * 100);
  const userCuriosity = Math.round(userDna.curiosity * 100);
  const userObedience = Math.round(userDna.obedience * 100);
  const userInstinct = Math.round(userDna.instinct * 100);
  const userMotorReg = Math.round(userDna.motorPrecision * 100);

  // Legacy V1 links did not carry these dimensions, so neutral 50-point values
  // are used only for comparison presentation. V2 always validates all fields.
  const chalHumanity = Math.round(challenger.challengerHumanity);
  const chalPred = pct(challenger.predictability);
  const chalCuriosity = pct(challenger.curiosity);
  const chalObedience = pct(challenger.obedience);
  const chalInstinct = pct(challenger.instinct);
  const chalMotorReg = 100 - pct(challenger.motorChaos);

  const makeTrait = (name: string, userValue: number, challengerValue: number): TraitComparison => {
    const delta = userValue - challengerValue;
    return {
      name,
      userValue,
      challengerValue,
      delta,
      interpretation: Math.abs(delta) <= 3 ? 'equivalent' : delta > 0 ? 'higher' : 'lower',
    };
  };

  const traits = {
    humanity: makeTrait('HUMANITY', userHumanity, chalHumanity),
    predictability: makeTrait('PREDICTABILITY', userPred, chalPred),
    curiosity: makeTrait('CURIOSITY', userCuriosity, chalCuriosity),
    obedience: makeTrait('OBEDIENCE', userObedience, chalObedience),
    instinct: makeTrait('INSTINCT', userInstinct, chalInstinct),
    motorRegularity: makeTrait('MOTOR REGULARITY', userMotorReg, chalMotorReg),
  };

  // Score uses only directly comparable numeric result values. Ending differences
  // are narrated separately and never receive an artificial numeric bonus.
  const normalizedDifference =
    (Math.abs(traits.humanity.delta) / 100) * 0.24 +
    (Math.abs(traits.predictability.delta) / 100) * 0.22 +
    (Math.abs(traits.curiosity.delta) / 100) * 0.16 +
    (Math.abs(traits.obedience.delta) / 100) * 0.12 +
    (Math.abs(traits.instinct.delta) / 100) * 0.14 +
    (Math.abs(traits.motorRegularity.delta) / 100) * 0.12;

  const divergenceScore = Math.max(0, Math.min(100, Math.round(Math.min(1, normalizedDifference * 1.1) * 100)));
  const similarityScore = 100 - divergenceScore;

  const candidateTraits = Object.values(traits).map((trait) => ({
    label: trait.name,
    absDelta: Math.abs(trait.delta),
    delta: trait.delta,
  }));
  candidateTraits.sort((a, b) => b.absDelta - a.absDelta);
  const dominant = candidateTraits[0];
  const dominantDivergenceTrait = dominant.absDelta > 3 ? dominant.label : 'OVERALL ALIGNMENT';

  let verdictTitle = 'MODERATE DIVERGENCE';
  if (similarityScore >= 80) verdictTitle = 'PARALLEL MORPHOLOGY';
  else if (similarityScore >= 60) verdictTitle = 'CONVERGENT VARIANT';
  else if (divergenceScore >= 60) verdictTitle = 'RADICAL DIVERGENCE';

  const observations: string[] = [];
  if (userEnding === challenger.challengerEnding) {
    observations.push(`Both sessions resolved to the same ${userEnding} ending.`);
  } else {
    observations.push(`Your session resolved to ${userEnding}; the challenger trace resolved to ${challenger.challengerEnding}.`);
  }

  if (dominant.absDelta <= 3) {
    observations.push('The shared challenge metrics remained closely aligned.');
  } else {
    const userHigher = dominant.delta > 0;
    switch (dominant.label) {
      case 'INSTINCT':
        observations.push(
          userHigher
            ? 'Your recorded response-speed score was higher than the challenger trace.'
            : 'The challenger trace recorded a higher response-speed score.'
        );
        break;
      case 'PREDICTABILITY':
        observations.push(
          userHigher
            ? 'Your recorded choices followed the model prediction pattern more often.'
            : 'Your recorded choices diverged from the model prediction pattern more often.'
        );
        break;
      case 'CURIOSITY':
        observations.push(
          userHigher
            ? 'Your session recorded more exploratory interaction signals.'
            : 'The challenger trace carried more exploratory interaction signals.'
        );
        break;
      case 'OBEDIENCE':
        observations.push(
          userHigher
            ? 'Your session followed the experiment instructions more consistently.'
            : 'The challenger trace followed the experiment instructions more consistently.'
        );
        break;
      case 'MOTOR REGULARITY':
        observations.push(
          userHigher
            ? 'Your pointer-path score was more regular than the challenger trace.'
            : 'Your pointer-path score was less regular than the challenger trace.'
        );
        break;
      case 'HUMANITY':
      default:
        observations.push(
          userHigher
            ? 'Your HUMAN? result score was higher than the challenger trace.'
            : 'The challenger HUMAN? result score was higher than yours.'
        );
        break;
    }
  }

  observations.push(`Shared challenge metrics align at ${similarityScore}%.`);

  const divergenceSummary =
    similarityScore >= 80
      ? `The shared result metrics remain close to ${challenger.challengerModelId}.`
      : divergenceScore >= 60
        ? 'The two challenge traces differ strongly across the shared result metrics.'
        : `Your challenge trace differs moderately from ${challenger.challengerModelId}.`;

  return {
    challengerModelId: challenger.challengerModelId,
    userModelId: userDna.modelId,
    challengerClass: challenger.challengerClass,
    userClass,
    challengerEnding: challenger.challengerEnding,
    userEnding,
    similarityScore,
    divergenceScore,
    humanityDelta: userHumanity - chalHumanity,
    traits,
    dominantDivergenceTrait,
    verdictTitle,
    divergenceSummary,
    narrativeObservations: observations,
  };
}
