import { describe, it, expect, beforeEach } from 'vitest';
import {
  ActiveElapsedClock,
  FaceMovementInput,
  hasSufficientGenuineMirrorSamples,
  MirrorReactiveEngine,
  MIN_GENUINE_MIRROR_SAMPLES,
} from '../mirror/MirrorReactiveEngine';
import { sessionMemory } from '../memory/SessionMemory';
import { extractMachineDNA } from '../dna/MachineDNA';
import { createInitialSession } from '../scoring/ScoreEngine';

describe('MirrorReactiveEngine - Reactive Desynchronization', () => {
  let engine: MirrorReactiveEngine;

  beforeEach(() => {
    engine = new MirrorReactiveEngine();
    sessionMemory.reset();
  });

  it('classifies motion energy thresholds accurately into distinct states', () => {
    expect(engine.classifyMotionState(0.02)).toBe('STILL');
    expect(engine.classifyMotionState(0.18)).toBe('SUBTLE');
    expect(engine.classifyMotionState(0.45)).toBe('MOVING');
    expect(engine.classifyMotionState(0.85)).toBe('RAPID');
  });

  it('keeps smoothed energy strictly bounded between 0 and 1 without producing NaN', () => {
    let state = engine.processInput(null, 100);
    expect(state.smoothedEnergy).toBe(0);
    expect(state.motionState).toBe('STILL');

    const input1: FaceMovementInput = {
      faceCenterX: 0.2,
      faceCenterY: 0.2,
      yaw: 0.1,
      rollDeg: 5,
      timestamp: 100,
    };
    const input2: FaceMovementInput = {
      faceCenterX: 0.9,
      faceCenterY: 0.9,
      yaw: 0.8,
      rollDeg: 35,
      timestamp: 116,
    };

    engine.processInput(input1, 100);
    state = engine.processInput(input2, 116);

    expect(state.smoothedEnergy).toBeGreaterThan(0);
    expect(state.smoothedEnergy).toBeLessThanOrEqual(1.0);
    expect(Number.isNaN(state.smoothedEnergy)).toBe(false);
  });

  it('detects prolonged stillness and triggers subtle drift in Phase 3', () => {
    const startedAt = 0;
    const stillInput: FaceMovementInput = {
      faceCenterX: 0.5,
      faceCenterY: 0.5,
      yaw: 0,
      rollDeg: 0,
      timestamp: 5000,
    };

    engine.update(stillInput, 5000, startedAt);
    engine.update({ ...stillInput, timestamp: 5600 }, 5600, startedAt);
    const output = engine.update({ ...stillInput, timestamp: 6800 }, 6800, startedAt);

    expect(output.escalationPhase).toBe(3);
    expect(output.motionState).toBe('STILL');
    expect(output.isProlongedStillness).toBe(true);
    expect(output.driftOffset.x !== 0 || output.driftOffset.y !== 0).toBe(true);
  });

  it('triggers a single rapid spike transition and a bounded freeze window', () => {
    const startedAt = 0;
    const baseInput: FaceMovementInput = {
      faceCenterX: 0.5,
      faceCenterY: 0.5,
      yaw: 0,
      rollDeg: 0,
      timestamp: 4800,
    };
    engine.update(baseInput, 4800, startedAt);

    const rapidInput: FaceMovementInput = {
      faceCenterX: 0.85,
      faceCenterY: 0.75,
      yaw: 0.6,
      rollDeg: 28,
      timestamp: 4816,
    };

    const spike = engine.update(rapidInput, 4816, startedAt);
    const sustained = engine.update({ ...rapidInput, timestamp: 4832 }, 4832, startedAt);

    expect(spike.isRapidSpike).toBe(true);
    expect(spike.freezeFrame).toBe(true);
    expect(spike.delayMs).toBeGreaterThan(400);
    expect(sustained.isRapidSpike).toBe(false);
  });

  it('transitions through cinematic escalation phases deterministically based on active elapsed time', () => {
    expect(engine.getEscalationPhase(1000)).toBe(1);
    expect(engine.getEscalationPhase(3000)).toBe(2);
    expect(engine.getEscalationPhase(6000)).toBe(3);
    expect(engine.getEscalationPhase(9500)).toBe(4);
    expect(engine.getEscalationPhase(12500)).toBe(5);
  });

  it('generates valid synthetic input for visual fallback mode', () => {
    const inputA = engine.generateSyntheticInput(1000, 1000);
    const inputB = engine.generateSyntheticInput(1050, 1050);

    expect(inputA.faceCenterX).toBeGreaterThan(0.3);
    expect(inputA.faceCenterX).toBeLessThan(0.7);
    expect(inputB.faceCenterY).toBeGreaterThan(0.3);
    expect(inputB.faceCenterY).toBeLessThan(0.7);
    expect(inputA.timestamp).toBe(1000);
    expect(inputB.timestamp).toBe(1050);
  });

  it('returns valid bounded metrics on conclusion', () => {
    const input: FaceMovementInput = {
      faceCenterX: 0.5,
      faceCenterY: 0.5,
      yaw: 0,
      rollDeg: 0,
      timestamp: 1000,
    };
    engine.update(input, 1000, 0);

    const metrics = engine.getMetrics();
    expect(metrics.maxMotionEnergy).toBeGreaterThanOrEqual(0);
    expect(metrics.maxMotionEnergy).toBeLessThanOrEqual(1.0);
    expect(metrics.stillDurationMs).toBeGreaterThanOrEqual(0);
    expect(metrics.rapidSpikes).toBeGreaterThanOrEqual(0);
    expect(metrics.desyncIntensity).toBeGreaterThanOrEqual(0);
    expect(metrics.desyncIntensity).toBeLessThanOrEqual(1.0);
  });

  it('pauses active cinematic time while the document would be hidden', () => {
    const clock = new ActiveElapsedClock(1000, true);
    expect(clock.elapsed(1500)).toBe(500);

    clock.setActive(false, 1500);
    expect(clock.elapsed(9500)).toBe(500);

    clock.setActive(true, 9500);
    expect(clock.elapsed(10000)).toBe(1000);
  });

  it('requires a minimum number of genuine FaceTracker samples before telemetry is eligible', () => {
    expect(hasSufficientGenuineMirrorSamples(MIN_GENUINE_MIRROR_SAMPLES - 1)).toBe(false);
    expect(hasSufficientGenuineMirrorSamples(MIN_GENUINE_MIRROR_SAMPLES)).toBe(true);
    expect(hasSufficientGenuineMirrorSamples(MIN_GENUINE_MIRROR_SAMPLES + 20)).toBe(true);
  });

  it('rejects synthetic mirror metrics from SessionMemory', () => {
    const accepted = sessionMemory.recordMirrorReactionTelemetry(
      {
        maxMotionEnergy: 1,
        stillDurationMs: 5000,
        rapidSpikes: 8,
        desyncIntensity: 1,
        sampleCount: 120,
      },
      'SYNTHETIC'
    );

    expect(accepted).toBe(false);
    expect(sessionMemory.getSummary().mirrorReactionTelemetry).toBeNull();
    expect(sessionMemory.getSummary().mirrorStillnessDetected).toBe(false);
  });

  it('prevents simulated fallback metrics from altering MachineDNA', () => {
    const session = createInitialSession();
    session.seed = 424242;
    session.motor.score = 80;
    session.motorMetrics = session.motor;

    const baseline = extractMachineDNA(session);

    sessionMemory.recordMirrorReactionTelemetry(
      {
        maxMotionEnergy: 1,
        stillDurationMs: 6000,
        rapidSpikes: 10,
        desyncIntensity: 1,
        sampleCount: 200,
      },
      'SYNTHETIC'
    );

    const afterSynthetic = extractMachineDNA(session);
    expect(afterSynthetic.motorChaos).toBe(baseline.motorChaos);
    expect(afterSynthetic.motorPrecision).toBe(baseline.motorPrecision);
  });

  it('stores genuine FaceTracker telemetry and allows measured spikes to influence MachineDNA', () => {
    const session = createInitialSession();
    session.seed = 424242;
    session.motor.score = 80;
    session.motorMetrics = session.motor;

    const baseline = extractMachineDNA(session);
    const accepted = sessionMemory.recordMirrorReactionTelemetry(
      {
        maxMotionEnergy: 0.92,
        stillDurationMs: 1400,
        rapidSpikes: 4,
        desyncIntensity: 0.8,
        sampleCount: 50,
      },
      'FACE_TRACKER'
    );

    const summary = sessionMemory.getSummary();
    const afterMeasured = extractMachineDNA(session);

    expect(accepted).toBe(true);
    expect(summary.mirrorReactionTelemetry?.source).toBe('FACE_TRACKER');
    expect(summary.mirrorReactionTelemetry?.sampleCount).toBe(50);
    expect(summary.mirrorStillnessDetected).toBe(true);
    expect(afterMeasured.motorChaos).toBeGreaterThan(baseline.motorChaos);
  });
});
