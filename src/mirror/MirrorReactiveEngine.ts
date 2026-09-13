export type MotionState = 'STILL' | 'SUBTLE' | 'MOVING' | 'RAPID';
export type EscalationPhase = 1 | 2 | 3 | 4 | 5;

export interface FaceMovementInput {
  faceCenterX: number;
  faceCenterY: number;
  yaw: number;
  rollDeg: number;
  timestamp: number;
}

export interface MirrorFrameOutput {
  delayMs: number;
  freezeFrame: boolean;
  motionState: MotionState;
  motionEnergy: number; // smoothed 0.0 -> 1.0
  driftOffset: { x: number; y: number };
  escalationPhase: EscalationPhase;
  statusLog: string;
  phaseLabel: string;
  syncAlert: string | null;
  instructionText?: string;
  isProlongedStillness: boolean;
  isRapidSpike: boolean;
}

export interface MirrorEngineMetrics {
  maxMotionEnergy: number;
  stillDurationMs: number;
  rapidSpikes: number;
  desyncIntensity: number;
}

export const MIN_GENUINE_MIRROR_SAMPLES = 5;

export function hasSufficientGenuineMirrorSamples(sampleCount: number): boolean {
  return Number.isFinite(sampleCount) && sampleCount >= MIN_GENUINE_MIRROR_SAMPLES;
}

/**
 * Tracks active scene time independently from wall-clock time.
 * Hidden-tab duration is excluded, so cinematic escalation cannot jump forward
 * while the page is not visible.
 */
export class ActiveElapsedClock {
  private accumulatedMs = 0;
  private activeStartedAt: number | null;

  constructor(now: number, startsActive = true) {
    this.activeStartedAt = startsActive ? now : null;
  }

  public setActive(active: boolean, now: number): void {
    if (active) {
      if (this.activeStartedAt === null) {
        this.activeStartedAt = now;
      }
      return;
    }

    if (this.activeStartedAt !== null) {
      this.accumulatedMs += Math.max(0, now - this.activeStartedAt);
      this.activeStartedAt = null;
    }
  }

  public elapsed(now: number): number {
    if (this.activeStartedAt === null) {
      return this.accumulatedMs;
    }
    return this.accumulatedMs + Math.max(0, now - this.activeStartedAt);
  }
}

function clamp01(val: number): number {
  if (Number.isNaN(val)) return 0;
  return Math.max(0, Math.min(1, val));
}

/**
 * MirrorReactiveEngine
 * Pure deterministic controller for the time-bounded, behavior-reactive mirror.
 * A caller may use one instance for visual fallback motion and a separate instance
 * for genuine FaceTracker telemetry so synthetic frames never contaminate metrics.
 */
export class MirrorReactiveEngine {
  private prevInput: FaceMovementInput | null = null;
  private smoothedEnergy = 0;
  private currentMotionState: MotionState = 'STILL';

  private stillStartTime: number | null = null;
  private prolongedStillnessMs = 0;
  private readonly prolongedStillnessThresholdMs = 1200;

  private rapidSpikeCount = 0;
  private freezeUntilTime = 0;
  private maxObservedEnergy = 0;

  // Used only by the visual fallback generator. Metrics from an engine fed with
  // synthetic input must never be persisted as user telemetry.
  private syntheticPhase = 0;

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.prevInput = null;
    this.smoothedEnergy = 0;
    this.currentMotionState = 'STILL';
    this.stillStartTime = null;
    this.prolongedStillnessMs = 0;
    this.rapidSpikeCount = 0;
    this.freezeUntilTime = 0;
    this.maxObservedEnergy = 0;
    this.syntheticPhase = 0;
  }

  /**
   * Updates motion energy from one input sample.
   */
  public processInput(input: FaceMovementInput | null, now: number): {
    smoothedEnergy: number;
    motionState: MotionState;
    rapidSpikeTriggered: boolean;
  } {
    if (!input) {
      this.smoothedEnergy = clamp01(this.smoothedEnergy * 0.85);
      this.currentMotionState = this.classifyMotionState(this.smoothedEnergy);
      return {
        smoothedEnergy: this.smoothedEnergy,
        motionState: this.currentMotionState,
        rapidSpikeTriggered: false,
      };
    }

    let instantEnergy = 0;

    if (this.prevInput && input.timestamp > this.prevInput.timestamp) {
      const dt = Math.max(1, input.timestamp - this.prevInput.timestamp);
      const dx = input.faceCenterX - this.prevInput.faceCenterX;
      const dy = input.faceCenterY - this.prevInput.faceCenterY;
      const dyaw = input.yaw - this.prevInput.yaw;
      const droll = (input.rollDeg - this.prevInput.rollDeg) / 45;

      const spatialVelocity = (Math.hypot(dx, dy) / dt) * 1000;
      const angularVelocity = (Math.hypot(dyaw, droll) / dt) * 1000;
      instantEnergy = clamp01(spatialVelocity * 0.85 + angularVelocity * 0.35);
    }

    this.prevInput = { ...input };

    const alpha = instantEnergy > 0.7 ? 0.75 : 0.35;
    this.smoothedEnergy = clamp01((1 - alpha) * this.smoothedEnergy + alpha * instantEnergy);
    this.maxObservedEnergy = Math.max(this.maxObservedEnergy, this.smoothedEnergy);

    const previousState = this.currentMotionState;
    this.currentMotionState = this.classifyMotionState(this.smoothedEnergy);

    if (this.currentMotionState === 'STILL') {
      if (this.stillStartTime === null) {
        this.stillStartTime = now;
      } else {
        this.prolongedStillnessMs = Math.max(this.prolongedStillnessMs, now - this.stillStartTime);
      }
    } else {
      this.stillStartTime = null;
    }

    const rapidSpikeTriggered = this.currentMotionState === 'RAPID' && previousState !== 'RAPID';
    if (rapidSpikeTriggered) {
      this.rapidSpikeCount++;
      this.freezeUntilTime = now + 160;
    }

    return {
      smoothedEnergy: this.smoothedEnergy,
      motionState: this.currentMotionState,
      rapidSpikeTriggered,
    };
  }

  public classifyMotionState(energy: number): MotionState {
    const clamped = clamp01(energy);
    if (clamped < 0.08) return 'STILL';
    if (clamped < 0.28) return 'SUBTLE';
    if (clamped < 0.65) return 'MOVING';
    return 'RAPID';
  }

  /**
   * The mirror keeps a deterministic cinematic backbone so the story always
   * completes, while delay/freeze/drift inside those phases reacts to motion.
   */
  public getEscalationPhase(elapsedMs: number): EscalationPhase {
    if (elapsedMs < 2200) return 1;
    if (elapsedMs < 4500) return 2;
    if (elapsedMs < 8000) return 3;
    if (elapsedMs < 11600) return 4;
    return 5;
  }

  public update(
    input: FaceMovementInput | null,
    now: number,
    startedAt: number
  ): MirrorFrameOutput {
    const elapsed = Math.max(0, now - startedAt);
    const phase = this.getEscalationPhase(elapsed);
    const { smoothedEnergy, motionState, rapidSpikeTriggered } = this.processInput(input, now);

    const isStillExtended =
      motionState === 'STILL' &&
      this.stillStartTime !== null &&
      now - this.stillStartTime >= this.prolongedStillnessThresholdMs;

    const freezeFrame = now < this.freezeUntilTime;

    let delayMs = 0;
    let driftOffset = { x: 0, y: 0 };
    let statusLog = '';
    let phaseLabel = '';
    let syncAlert: string | null = null;
    let instructionText: string | undefined;

    switch (phase) {
      case 1: {
        delayMs = 0;
        statusLog = 'LATENCY: 0ms [CALIBRATED]';
        phaseLabel = 'MIRROR_STATE: SYNCHRONOUS';
        instructionText = 'Observe optical reflection. Verify parity with physical motor intention.';
        break;
      }

      case 2: {
        delayMs = 75;
        statusLog = 'SYNC DELAY: 75ms // CALIBRATION ACTIVE';
        phaseLabel = 'MIRROR_STATE: CALIBRATING LATENCY';
        break;
      }

      case 3: {
        phaseLabel = 'MIRROR_STATE: BEHAVIORAL DELAY';

        if (motionState === 'STILL') {
          if (isStillExtended) {
            const driftAngle = (elapsed / 600) * Math.PI;
            driftOffset = {
              x: Math.sin(driftAngle) * 3.5,
              y: Math.cos(driftAngle * 0.7) * 2.0,
            };
            delayMs = 140;
            statusLog = 'SUBJECT MOTION: STILL // LATENT DRIFT DETECTED';
          } else {
            delayMs = 90;
            statusLog = 'SYNC DELAY: 90ms // MOTOR EQUILIBRIUM';
          }
        } else if (motionState === 'SUBTLE') {
          delayMs = 180;
          statusLog = 'SYNC DELAY: 180ms // MICRO-TRACKING';
        } else if (motionState === 'MOVING') {
          delayMs = 340;
          statusLog = 'SYNC DELAY: 340ms // KINETIC BUFFER LAG';
        } else {
          delayMs = 580;
          statusLog = 'SYNC DELAY: 580ms // VELOCITY BUFFER SPIKE';
        }

        if (elapsed > 6400) {
          syncAlert = 'SYNC ERROR // REFLECTION DRIFT DETECTED';
          instructionText = 'Remain still.';
        }
        break;
      }

      case 4: {
        delayMs = 650;
        phaseLabel = 'REPROJECTION SOURCE: UNKNOWN';
        syncAlert = 'IDENTITY CONFLICT // MULTIPLE SIGNALS';
        instructionText = 'Which one of you moved first?';

        const autonomousAngle = (elapsed / 450) * Math.PI;
        driftOffset = {
          x: Math.sin(autonomousAngle) * 5.0,
          y: Math.cos(autonomousAngle * 0.8) * 3.5,
        };

        statusLog =
          motionState === 'STILL'
            ? 'SUBJECT MOTION: ZERO // OBSERVED MOTION: DETECTED'
            : 'SIGNAL COLLISION // DUAL ACTOR DETECTED';
        break;
      }

      case 5: {
        delayMs = 800;
        phaseLabel = 'TRANSFER IN PROGRESS';
        syncAlert = 'SUBJECT NO LONGER REQUIRED';
        statusLog = 'TRANSFER COMPLETE // DISCONNECTING INPUT';
        instructionText = 'Training complete.';
        break;
      }
    }

    return {
      delayMs: Math.max(0, Math.min(1200, delayMs)),
      freezeFrame,
      motionState,
      motionEnergy: this.smoothedEnergy,
      driftOffset,
      escalationPhase: phase,
      statusLog,
      phaseLabel,
      syncAlert,
      instructionText,
      isProlongedStillness: isStillExtended,
      isRapidSpike: rapidSpikeTriggered,
    };
  }

  /**
   * Visual fallback only. Callers must not persist metrics produced by an engine
   * fed with these synthetic samples as observed user behavior.
   */
  public generateSyntheticInput(now: number, elapsed: number): FaceMovementInput {
    this.syntheticPhase += 0.03;
    const baseSway = Math.sin(this.syntheticPhase * 0.6) * 0.04;
    const headTilt = Math.sin(this.syntheticPhase * 0.8) * 4;

    let suddenShift = 0;
    if (elapsed > 4800 && elapsed < 5400) {
      suddenShift = 0.12;
    }

    return {
      faceCenterX: 0.5 + baseSway + suddenShift,
      faceCenterY: 0.45 + Math.cos(this.syntheticPhase * 0.4) * 0.02,
      yaw: baseSway * 3,
      rollDeg: headTilt,
      timestamp: now,
    };
  }

  public getMetrics(): MirrorEngineMetrics {
    return {
      maxMotionEnergy: Math.round(this.maxObservedEnergy * 100) / 100,
      stillDurationMs: Math.round(this.prolongedStillnessMs),
      rapidSpikes: this.rapidSpikeCount,
      desyncIntensity: Math.min(
        1.0,
        this.rapidSpikeCount * 0.2 + (this.prolongedStillnessMs / 6000) * 0.4
      ),
    };
  }
}
