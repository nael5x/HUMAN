export interface MemoryTestMetrics {
  targetSymbolIndex: number;
  selectedSymbolIndex: number;
  isCorrect: boolean;
  responseTimeMs: number;
  hoverSwitches: number;
  confidenceHesitationMs: number;
}

export interface PredictionRoundData {
  round: number;
  predicted: 'LEFT' | 'RIGHT';
  chosen: 'LEFT' | 'RIGHT';
  isCorrect: boolean;
  changedMind: boolean;
  latencyMs: number;
  hoverSwitches: number;
}

export interface PredictionMetrics {
  rounds: PredictionRoundData[];
  correctCount: number;
  predictabilityScore: number;
  directionSwitches: number;
}

export interface SessionBehaviorSummary {
  firstMoveLatencyMs: number;
  totalDistance: number;
  maxSpeed: number;
  directionChanges: number;
  longestIdleMs: number;
  prematureMovements: number;
  instructionViolations: number;
  unnecessaryClicks: number;
  systemTextClicks: number;
  decisionSwitches: number;
  hoverHesitations: number;
  averageReactionMs: number;
  secretsFound: string[];

  // Milestone 2 Camera & Mirror Telemetry
  cameraGranted: boolean;
  cameraDenied: boolean;
  faceAcquired: boolean;
  gestureSuccessCount: number;
  gestureRetryCount: number;
  trainingCompletion: boolean;
  mirrorStillnessDetected: boolean;
  mirrorSequenceCompleted: boolean;

  // Milestone 3 Final Session Outputs
  machineId?: string;
  machineClass?: string;
  ending?: string;
  predictabilityScore?: number;
  resultStatus?: string;
}

/**
 * SessionMemory
 * Tracks genuine, fine-grained behavioral signals throughout the current browser session.
 * Zero external calls, zero telemetry exfiltration. Purely local to this tab.
 */
class SessionMemoryService {
  private sessionStartTime: number = performance.now();
  private firstPointerMoveTime: number | null = null;
  private totalPointerDistance: number = 0;
  private lastPointerPos: { x: number; y: number; time: number } | null = null;
  private maxPointerSpeed: number = 0;
  private directionChanges: number = 0;
  private lastHeading: number | null = null;

  // Inactivity tracking
  private lastActivityTime: number = performance.now();
  private longestIdleMs: number = 0;

  // Friction and behavioral flags
  private prematureMovements: number = 0;
  private instructionViolations: number = 0;
  private unnecessaryClicks: number = 0;
  private systemTextClicks: number = 0;
  private decisionSwitches: number = 0;
  private hoverHesitations: number = 0;
  private reactionTimes: number[] = [];

  // Memory & Prediction test metrics
  private memoryTest: MemoryTestMetrics | null = null;
  private predictionTest: PredictionMetrics | null = null;

  // Secret discoveries
  private secretsFound: Set<string> = new Set();

  // Milestone 2 Camera & Mirror Telemetry
  private cameraGranted: boolean = false;
  private cameraDenied: boolean = false;
  private faceAcquired: boolean = false;
  private gestureSuccessCount: number = 0;
  private gestureRetryCount: number = 0;
  private trainingCompletion: boolean = false;
  private mirrorStillnessDetected: boolean = false;
  private mirrorSequenceCompleted: boolean = false;

  // Milestone 3 Final Session Outputs
  private machineId?: string;
  private machineClass?: string;
  private ending?: string;
  private predictabilityScore?: number;
  private resultStatus?: string;

  public reset(): void {
    this.sessionStartTime = performance.now();
    this.firstPointerMoveTime = null;
    this.totalPointerDistance = 0;
    this.lastPointerPos = null;
    this.maxPointerSpeed = 0;
    this.directionChanges = 0;
    this.lastHeading = null;
    this.lastActivityTime = performance.now();
    this.longestIdleMs = 0;
    this.prematureMovements = 0;
    this.instructionViolations = 0;
    this.unnecessaryClicks = 0;
    this.systemTextClicks = 0;
    this.decisionSwitches = 0;
    this.hoverHesitations = 0;
    this.reactionTimes = [];
    this.memoryTest = null;
    this.predictionTest = null;
    this.secretsFound.clear();

    this.cameraGranted = false;
    this.cameraDenied = false;
    this.faceAcquired = false;
    this.gestureSuccessCount = 0;
    this.gestureRetryCount = 0;
    this.trainingCompletion = false;
    this.mirrorStillnessDetected = false;
    this.mirrorSequenceCompleted = false;

    this.machineId = undefined;
    this.machineClass = undefined;
    this.ending = undefined;
    this.predictabilityScore = undefined;
    this.resultStatus = undefined;
  }

  public recordPointerMove(x: number, y: number): void {
    const now = performance.now();

    // Check idle duration since last activity
    const idleDuration = now - this.lastActivityTime;
    if (idleDuration > this.longestIdleMs) {
      this.longestIdleMs = Math.round(idleDuration);
    }
    this.lastActivityTime = now;

    if (this.firstPointerMoveTime === null) {
      this.firstPointerMoveTime = Math.round(now - this.sessionStartTime);
    }

    if (this.lastPointerPos) {
      const dx = x - this.lastPointerPos.x;
      const dy = y - this.lastPointerPos.y;
      const dt = Math.max(1, now - this.lastPointerPos.time);
      const dist = Math.hypot(dx, dy);

      if (dist > 1) {
        this.totalPointerDistance += dist;
        const speed = dist / dt;
        if (speed > this.maxPointerSpeed) {
          this.maxPointerSpeed = Math.round(speed * 100) / 100;
        }

        const currentHeading = Math.atan2(dy, dx);
        if (this.lastHeading !== null) {
          let angleDiff = Math.abs(currentHeading - this.lastHeading);
          if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
          if (angleDiff > 1.0) {
            this.directionChanges++;
          }
        }
        this.lastHeading = currentHeading;
      }
    }

    this.lastPointerPos = { x, y, time: now };
  }

  public recordClick(isInteractive: boolean, targetClassOrTag?: string): void {
    this.lastActivityTime = performance.now();
    if (!isInteractive) {
      this.unnecessaryClicks++;
      const lower = (targetClassOrTag || '').toLowerCase();
      if (
        lower.includes('h1') ||
        lower.includes('h2') ||
        lower.includes('title') ||
        lower.includes('terminal') ||
        lower.includes('header') ||
        lower.includes('hud') ||
        lower.includes('subtext')
      ) {
        this.systemTextClicks++;
      }
    }
  }

  public recordPrematureMovement(): void {
    this.prematureMovements++;
  }

  public recordInstructionViolation(): void {
    this.instructionViolations++;
  }

  public recordDecisionSwitch(): void {
    this.decisionSwitches++;
  }

  public recordHoverHesitation(): void {
    this.hoverHesitations++;
  }

  public recordReactionTime(ms: number): void {
    if (ms > 0) {
      this.reactionTimes.push(ms);
    }
  }

  public recordMemoryTest(metrics: MemoryTestMetrics): void {
    this.memoryTest = metrics;
    this.recordReactionTime(metrics.responseTimeMs);
  }

  public getMemoryTest(): MemoryTestMetrics | null {
    return this.memoryTest;
  }

  public recordPredictionTest(metrics: PredictionMetrics): void {
    this.predictionTest = metrics;
    metrics.rounds.forEach((r) => this.recordReactionTime(r.latencyMs));
  }

  public getPredictionTest(): PredictionMetrics | null {
    return this.predictionTest;
  }

  public recordSecret(secretKey: string): boolean {
    if (this.secretsFound.has(secretKey)) return false;
    this.secretsFound.add(secretKey);
    return true;
  }

  public recordCameraPermission(granted: boolean): void {
    if (granted) {
      this.cameraGranted = true;
      this.cameraDenied = false;
    } else {
      this.cameraGranted = false;
      this.cameraDenied = true;
    }
  }

  public recordFaceAcquired(acquired: boolean = true): void {
    this.faceAcquired = acquired;
  }

  public recordGestureOutcome(success: boolean, wasRetry: boolean): void {
    if (success) this.gestureSuccessCount++;
    if (wasRetry) this.gestureRetryCount++;
  }

  public recordTrainingCompletion(completed: boolean = true): void {
    this.trainingCompletion = completed;
  }

  public recordMirrorStillness(detected: boolean = true): void {
    this.mirrorStillnessDetected = detected;
  }

  public recordMirrorSequenceCompleted(completed: boolean = true): void {
    this.mirrorSequenceCompleted = completed;
  }

  public recordFinalOutputs(outputs: {
    machineId: string;
    machineClass: string;
    ending: string;
    predictabilityScore?: number;
    resultStatus?: string;
  }): void {
    this.machineId = outputs.machineId;
    this.machineClass = outputs.machineClass;
    this.ending = outputs.ending;
    this.predictabilityScore = outputs.predictabilityScore;
    this.resultStatus = outputs.resultStatus;
  }

  public getSummary(): SessionBehaviorSummary {
    const avgReaction =
      this.reactionTimes.length > 0
        ? Math.round(this.reactionTimes.reduce((sum, v) => sum + v, 0) / this.reactionTimes.length)
        : 0;

    return {
      firstMoveLatencyMs: this.firstPointerMoveTime ?? 0,
      totalDistance: Math.round(this.totalPointerDistance),
      maxSpeed: this.maxPointerSpeed,
      directionChanges: this.directionChanges,
      longestIdleMs: this.longestIdleMs,
      prematureMovements: this.prematureMovements,
      instructionViolations: this.instructionViolations,
      unnecessaryClicks: this.unnecessaryClicks,
      systemTextClicks: this.systemTextClicks,
      decisionSwitches: this.decisionSwitches,
      hoverHesitations: this.hoverHesitations,
      averageReactionMs: avgReaction,
      secretsFound: Array.from(this.secretsFound),
      cameraGranted: this.cameraGranted,
      cameraDenied: this.cameraDenied,
      faceAcquired: this.faceAcquired,
      gestureSuccessCount: this.gestureSuccessCount,
      gestureRetryCount: this.gestureRetryCount,
      trainingCompletion: this.trainingCompletion,
      mirrorStillnessDetected: this.mirrorStillnessDetected,
      mirrorSequenceCompleted: this.mirrorSequenceCompleted,
      machineId: this.machineId,
      machineClass: this.machineClass,
      ending: this.ending,
      predictabilityScore: this.predictabilityScore,
      resultStatus: this.resultStatus,
    };
  }
}

export const sessionMemory = new SessionMemoryService();
