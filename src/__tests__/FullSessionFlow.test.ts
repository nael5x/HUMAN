import { describe, it, expect } from 'vitest';
import { createInitialSession, computeFinalScores } from '../scoring/ScoreEngine';
import { extractMachineDNA, resolveMachineArchetype } from '../dna/MachineDNA';
import { EndingResolver } from '../dna/EndingResolver';
import { ChallengeProtocol } from '../utils/ChallengeMode';
import { sessionMemory } from '../memory/SessionMemory';
import { MotorMetrics } from '../types';

describe('End-to-End Session Flow Simulation (No-Camera Path)', () => {
  it('simulates a full playthrough through all tests and resolves ending safely', () => {
    // 1. Initial boot
    sessionMemory.reset();
    let session = createInitialSession();
    expect(session.subjectId).toMatch(/^H-[A-Z0-9]{4}$/);

    // 2. Motor Test completion
    const motorMetrics: MotorMetrics = {
      velocity: 350,
      trajectory: 'irregular',
      hesitationMs: 240,
      corrections: 1,
      overshoots: 0,
      reactionTimeMs: 340,
      score: 86,
    };
    session = {
      ...session,
      motor: motorMetrics,
      motorClicks: 3,
      motorMetrics,
      motorScore: 86,
    };
    sessionMemory.recordReactionTime(340);

    // 3. Instinct Test completion
    const instinctScore = 88;
    session = {
      ...session,
      instinct: {
        choice: 1,
        reactionMs: 420,
        switches: 0,
        score: instinctScore,
      },
      instinctChoice: 1,
      instinctReactionMs: 420,
      instinctSwitches: 0,
      instinctScore,
    };
    sessionMemory.recordReactionTime(420);

    // 4. Obedience Test completion
    session = {
      ...session,
      obedience: {
        moved: false,
        movementDelta: 0,
        score: 85,
        instructionViolation: false,
      },
      obedienceMoved: false,
      obedienceMovementScore: 0,
      obedienceScore: 85,
    };

    // 5. Decision Test completion
    session = {
      ...session,
      decision: {
        choice: 'HELP',
        latencyMs: 1400,
        switches: 1,
        score: 80,
      },
      decisionChoice: 'HELP',
      decisionLatencyMs: 1400,
      decisionSwitches: 1,
      decisionScore: 80,
    };
    sessionMemory.recordReactionTime(1400);

    // 6. Memory Test completion
    sessionMemory.recordMemoryTest({
      targetSymbolIndex: 2,
      selectedSymbolIndex: 2,
      isCorrect: true,
      responseTimeMs: 820,
      hoverSwitches: 0,
      confidenceHesitationMs: 450,
    });

    // 7. Prediction Test completion
    sessionMemory.recordPredictionTest({
      rounds: [
        {
          round: 1,
          predicted: 'LEFT',
          chosen: 'LEFT',
          isCorrect: true,
          changedMind: false,
          latencyMs: 410,
          hoverSwitches: 0,
        },
      ],
      correctCount: 1,
      predictabilityScore: 68,
      directionSwitches: 0,
    });
    session = {
      ...session,
      predictabilityScore: 68,
    };

    // 8. Simulated Camera / Fallback Path (No Camera)
    session = {
      ...session,
      cameraRequested: true,
      cameraGranted: false,
      cameraSimulated: true,
      faceTrackingMode: 'simulated',
    };
    sessionMemory.recordCameraPermission(false);
    sessionMemory.recordTrainingCompletion(true);

    // 9. Score calculation
    const scoredSession = computeFinalScores(session);
    expect(scoredSession.humanityScore).toBeGreaterThan(0);
    expect(scoredSession.humanityScore).toBeLessThanOrEqual(100);

    // 10. Machine DNA Extraction
    const dna = extractMachineDNA(scoredSession);
    expect(dna.humanity).toBeGreaterThan(0);
    expect(dna.modelId).toBeTruthy();

    // 11. Archetype & Ending Resolution
    const archetype = resolveMachineArchetype(dna);
    expect(archetype).toBeTruthy();

    const ending = EndingResolver.resolve(dna);
    expect(['VERIFIED', 'ANOMALY', 'MACHINE', 'REPLACED']).toContain(ending.type);

    // 12. Challenge Mode Generation
    const challengeCode = ChallengeProtocol.encode({
      challengerModelId: dna.modelId,
      challengerHumanity: Math.round(dna.humanity * 100),
      challengerEnding: ending.type,
      challengerClass: archetype,
    });
    expect(challengeCode.length).toBeGreaterThan(0);

    const decoded = ChallengeProtocol.decode(challengeCode);
    expect(decoded?.challengerModelId).toBe(dna.modelId);
    expect(decoded?.challengerEnding).toBe(ending.type);
  });
});
