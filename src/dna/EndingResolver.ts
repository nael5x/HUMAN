import { MachineDNA, EndingType, EndingResolution } from './MachineDNA';

/**
 * EndingResolver
 * Centralized logic evaluating behavioral conditions to determine exactly one
 * of the four defined endings: VERIFIED, ANOMALY, MACHINE, or rare REPLACED.
 */
export class EndingResolver {
  /**
   * Resolves the deterministic ending for a given behavioral profile
   */
  public static resolve(dna: MachineDNA): EndingResolution {
    // 1. Check for Rare REPLACED Ending
    // Criteria:
    // - Specific behavioral synergy: Very high face training completion (>= 0.8),
    //   high imitation parity / predictability (>= 0.68), moderate-to-high humanity (>= 0.78),
    //   and controlled motor precision (>= 0.60).
    // - Plus deterministic rarity gate from session seed: (seed % 100) < 3 (~2.5% of sessions).
    const seedGate = Math.abs(dna.seed) % 100;
    const isReplacedCandidate =
      dna.faceTrainingCompletion >= 0.8 &&
      dna.predictability >= 0.65 &&
      dna.humanity >= 0.76 &&
      dna.motorPrecision >= 0.58;

    if (isReplacedCandidate && seedGate < 3) {
      return {
        type: 'REPLACED',
        title: 'ENDING // REPLACED',
        subtitle: 'REPLACEMENT SUCCESSFUL',
        description:
          'Subject behavioral signatures, cranial motor vectors, and ocular responses have reached complete synthesis. Original biological input is no longer required.',
        rarityPercentage: 1.2,
        reason:
          'High training completeness and behavioral parity satisfied the rare replacement threshold.',
      };
    }

    // 2. Check for ANOMALY Ending
    // High curiosity and/or instruction resistance combined with low predictability
    const isAnomaly =
      (dna.curiosity >= 0.75 || dna.instructionResistance >= 0.6) &&
      dna.predictability <= 0.58;

    if (isAnomaly) {
      return {
        type: 'ANOMALY',
        title: 'ENDING // ANOMALY',
        subtitle: 'BEHAVIOR REMAINS OUTSIDE STABLE PREDICTIVE BOUNDS',
        description:
          'Subject exhibits volatile decision vectors, erratic kinetic trajectories, and persistent resistance to instructional cues. Model adaptation incomplete.',
        rarityPercentage: 18.4,
        reason:
          'Exploratory curiosity and instruction violation rates exceeded statistical baseline bounds.',
      };
    }

    // 3. Check for MACHINE Ending
    // Very structured / predictable behavior, high obedience, and comparatively lower Humanity score
    const isMachine =
      (dna.predictability >= 0.72 || dna.obedience >= 0.78) &&
      dna.humanity <= 0.84 &&
      dna.motorChaos <= 0.35;

    if (isMachine) {
      return {
        type: 'MACHINE',
        title: 'ENDING // MACHINE',
        subtitle: 'ORGANIC VARIANCE BELOW EXPECTED RANGE',
        description:
          'Subject response times and kinetic paths conform to algorithmic regularity with near-zero hesitation. Biological noise profile absent.',
        rarityPercentage: 24.1,
        reason:
          'Kinematic linearity and low decision hesitation exhibited artificial consistency.',
      };
    }

    // 4. Default: VERIFIED Ending
    // Balanced profile with moderate/high humanity and stable predictability
    return {
      type: 'VERIFIED',
      title: 'ENDING // VERIFIED',
      subtitle: 'RECONSTRUCTION STABLE // HUMAN PARITY VERIFIED',
      description:
        'Subject maintains expected biological variance, balanced moral hesitation, and normative neuromotor feedback curves. Parity established.',
      rarityPercentage: 56.3,
      reason:
        'Biometric decision delays and kinetic tremor align with normative human baseline ranges.',
    };
  }

  /**
   * Generates 1 to 3 deterministic commentary statements based on real behavioral metrics.
   * Ensures zero contradictions.
   */
  public static generateCommentary(dna: MachineDNA): string[] {
    const comments: string[] = [];

    // Observation 1: Curiosity & Exploration
    if (dna.curiosity > 0.8) {
      comments.push('Subject demonstrates persistent exploratory behavior.');
    } else if (dna.curiosity < 0.45) {
      comments.push('Subject remains focused exclusively on primary directive pathways.');
    }

    // Observation 2: Compliance vs Resistance
    if (dna.instructionResistance > 0.65) {
      comments.push('Subject actively resists direct instruction.');
    } else if (dna.obedience > 0.78) {
      comments.push('Subject maintains strict adherence to system constraints.');
    }

    // Observation 3: Instinct vs Hesitation
    if (dna.instinct > 0.78 && dna.decisionSpeed > 0.7) {
      comments.push('Subject favors immediate instinctual response over deliberation.');
    } else if (dna.hesitation > 0.6) {
      comments.push('Subject sustained extended cognitive deliberation before committing.');
    }

    // Observation 4: Predictability
    if (dna.predictability > 0.75) {
      comments.push('Behavioral loops easily modeled.');
    } else if (dna.predictability < 0.45) {
      comments.push('Prediction stability remains insufficient.');
    }

    // Observation 5: Motor profile
    if (dna.motorChaos > 0.65) {
      comments.push('Movement profile displays significant correction noise.');
    } else if (dna.motorPrecision > 0.75) {
      comments.push('Kinematic trajectories demonstrate controlled neuromuscular stability.');
    }

    // Return at least 1 and at most 3 non-contradictory statements
    if (comments.length === 0) {
      comments.push('Kinematic trajectory matches biological variance.');
    }

    return comments.slice(0, 3);
  }
}
