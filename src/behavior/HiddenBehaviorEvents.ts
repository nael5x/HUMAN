import { sound } from '../audio/AudioEngine';
import { sessionMemory } from '../memory/SessionMemory';
import { SecretResolver } from './SecretRegistry';
import { userMemory } from '../memory/UserMemory';

export interface WhisperEvent {
  id: string;
  text: string;
  tone?: 'neutral' | 'curious' | 'warning';
  timestamp: number;
}

type WhisperListener = (whisper: WhisperEvent | null) => void;

class HiddenBehaviorManager {
  private activeScene: string = 'LANDING';
  private listeners: Set<WhisperListener> = new Set();
  private currentWhisper: WhisperEvent | null = null;
  private whisperTimer: number | null = null;

  // Rate-limiting & cooldowns
  private lastTriggerTimes: Record<string, number> = {};
  private rapidClicksCount: number = 0;
  private lastClickTime: number = 0;
  private impatientPhase: number = 0;
  private systemTextClickCount: number = 0;
  private lastSystemTextClickTime: number = 0;

  // Idle timer
  private idleCheckInterval: number | null = null;
  private lastActivityTime: number = Date.now();

  // Landing hesitation
  private landingHesitationTriggered: boolean = false;
  private landingTimer: number | null = null;

  // Corner dwell detection
  private cornerDwellStart: number | null = null;
  private cornerDwellTriggered: boolean = false;

  // Event handlers for clean unbinding
  private onPointerMoveHandler: ((e: PointerEvent) => void) | null = null;
  private onPointerDownHandler: ((e: MouseEvent) => void) | null = null;

  constructor() {
    this.initGlobalListeners();
  }

  public setScene(scene: string): void {
    this.activeScene = scene;
    this.lastActivityTime = Date.now();

    if (scene === 'LANDING' && !this.landingHesitationTriggered) {
      if (this.landingTimer) window.clearTimeout(this.landingTimer);
      this.landingTimer = window.setTimeout(() => {
        if (this.activeScene === 'LANDING' && !this.landingHesitationTriggered) {
          this.landingHesitationTriggered = true;
          this.emitWhisper('Afraid to begin?', 'curious', 3000);
        }
      }, 7500);
    } else {
      if (this.landingTimer) {
        window.clearTimeout(this.landingTimer);
        this.landingTimer = null;
      }
    }
  }

  public subscribe(listener: WhisperListener): () => void {
    this.listeners.add(listener);
    listener(this.currentWhisper);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public emitWhisper(text: string, tone: 'neutral' | 'curious' | 'warning' = 'neutral', duration = 2600): void {
    if (this.whisperTimer !== null) {
      window.clearTimeout(this.whisperTimer);
      this.whisperTimer = null;
    }

    const whisper: WhisperEvent = {
      id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text,
      tone,
      timestamp: Date.now(),
    };

    this.currentWhisper = whisper;
    sound.playScanPulse();
    this.notify();

    this.whisperTimer = window.setTimeout(() => {
      this.currentWhisper = null;
      this.whisperTimer = null;
      this.notify();
    }, duration);
  }

  public triggerPredictionBreaker(): void {
    if (this.canTrigger('prediction_breaker', 60000)) {
      SecretResolver.recordDiscovery('PREDICTION_BREAKER');
      userMemory.recordDiscoveredSecret('PREDICTION_BREAKER');
      sessionMemory.recordSecret('PREDICTION_BREAKER');
      this.emitWhisper('Prediction stability lost.', 'warning', 3200);
    }
  }

  public triggerPredictionMatch(exact: boolean): void {
    if (exact && this.canTrigger('pred_exact', 20000)) {
      this.emitWhisper('Every choice was anticipated.', 'neutral', 2800);
    } else if (!exact && this.canTrigger('pred_near', 20000)) {
      this.emitWhisper('Deliberation noted.', 'curious', 2800);
    }
  }

  public triggerPredictionDivergence(): void {
    if (this.canTrigger('pred_divergence', 20000)) {
      this.emitWhisper('Anomalous divergence recorded.', 'warning', 2800);
    }
  }

  public triggerMirrorProlongedStillness(): void {
    if (this.canTrigger('mirror_stillness', 25000)) {
      this.emitWhisper("Don't look away.", 'curious', 3000);
    }
  }

  public triggerMirrorRapidMotion(): void {
    if (this.canTrigger('mirror_rapid', 20000)) {
      this.emitWhisper('Desynchronization spike.', 'warning', 2600);
    }
  }

  public triggerMirrorDesync(): void {
    if (this.canTrigger('mirror_desync', 25000)) {
      this.emitWhisper('Which one moved first?', 'warning', 3200);
    }
  }

  public triggerReturningWhisper(): void {
    if (this.canTrigger('returning_subject', 60000)) {
      SecretResolver.recordDiscovery('RETURNING_SUBJECT');
      userMemory.recordDiscoveredSecret('RETURNING_SUBJECT');
      sessionMemory.recordSecret('RETURNING_SUBJECT');
      this.emitWhisper("We've met before.", 'curious', 3400);
    }
  }

  public reset(): void {
    if (this.whisperTimer !== null) {
      window.clearTimeout(this.whisperTimer);
      this.whisperTimer = null;
    }
    if (this.landingTimer !== null) {
      window.clearTimeout(this.landingTimer);
      this.landingTimer = null;
    }
    this.currentWhisper = null;
    this.lastTriggerTimes = {};
    this.rapidClicksCount = 0;
    this.impatientPhase = 0;
    this.systemTextClickCount = 0;
    this.landingHesitationTriggered = false;
    this.cornerDwellStart = null;
    this.cornerDwellTriggered = false;
    SecretResolver.reset();
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentWhisper);
      } catch (err) {
        console.error('[HiddenBehaviorManager] listener error:', err);
      }
    }
  }

  private initGlobalListeners(): void {
    if (typeof window === 'undefined') return;

    this.onPointerMoveHandler = (e: PointerEvent) => {
      const now = Date.now();
      this.lastActivityTime = now;
      sessionMemory.recordPointerMove(e.clientX, e.clientY);

      // Corner secret detection (e.g. top-left corner <= 36px or bottom-right corner)
      const isCorner =
        (e.clientX < 36 && e.clientY < 36) ||
        (e.clientX > window.innerWidth - 36 && e.clientY > window.innerHeight - 36);

      if (isCorner && !this.cornerDwellTriggered) {
        if (this.cornerDwellStart === null) {
          this.cornerDwellStart = now;
        } else if (now - this.cornerDwellStart > 2500) {
          this.cornerDwellTriggered = true;
          this.cornerDwellStart = null;
          SecretResolver.recordDiscovery('CORNER_WATCHER');
          userMemory.recordDiscoveredSecret('CORNER_WATCHER');
          sessionMemory.recordSecret('CORNER_WATCHER');
          sound.playAcceptedTick();
          this.emitWhisper('You found something.', 'curious', 3200);
        }
      } else {
        this.cornerDwellStart = null;
      }
    };

    this.onPointerDownHandler = (e: MouseEvent) => {
      const now = Date.now();
      this.lastActivityTime = now;

      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Check if target is interactive
      const isInteractive = Boolean(
        target.closest('button') ||
        target.closest('a') ||
        target.closest('input') ||
        target.closest('canvas') ||
        target.getAttribute('role') === 'button' ||
        target.hasAttribute('data-interactive')
      );

      const targetTag = target.tagName;
      const targetClass = target.className ? String(target.className) : '';
      sessionMemory.recordClick(isInteractive, `${targetTag} ${targetClass}`);

      // 1. Check clicking system text (SYSTEM_TOUCH secret)
      const isSystemText = Boolean(
        target.closest('h1') ||
        target.closest('h2') ||
        target.closest('header') ||
        targetClass.includes('tracking-widest') ||
        targetClass.includes('SYS_') ||
        targetClass.includes('TERMINAL')
      );

      if (!isInteractive && isSystemText) {
        const timeSinceLast = now - this.lastSystemTextClickTime;
        this.lastSystemTextClickTime = now;

        if (timeSinceLast < 4000) {
          this.systemTextClickCount++;
        } else {
          this.systemTextClickCount = 1;
        }

        if (this.systemTextClickCount >= 3) {
          if (this.canTrigger('sys_stop', 12000)) {
            SecretResolver.recordDiscovery('SYSTEM_TOUCH');
            userMemory.recordDiscoveredSecret('SYSTEM_TOUCH');
            sessionMemory.recordSecret('SYSTEM_TOUCH');
            this.emitWhisper('Stop.', 'warning', 2200);
          }
        } else if (this.systemTextClickCount === 1) {
          if (this.canTrigger('sys_not_button', 16000)) {
            this.emitWhisper("That isn't a button.", 'neutral', 2400);
          }
        }
        return;
      }

      // 2. Rapid unnecessary clicking on background (IMPATIENT_SUBJECT secret)
      if (!isInteractive) {
        const timeSinceClick = now - this.lastClickTime;
        this.lastClickTime = now;

        if (timeSinceClick < 600) {
          this.rapidClicksCount++;
        } else {
          this.rapidClicksCount = 1;
        }

        if (this.rapidClicksCount >= 3) {
          this.rapidClicksCount = 0;
          this.impatientPhase++;

          if (this.impatientPhase === 1) {
            if (this.canTrigger('impatient_1', 12000)) {
              this.emitWhisper('Impatient.', 'curious', 2200);
            }
          } else {
            if (this.canTrigger('impatient_2', 14000)) {
              SecretResolver.recordDiscovery('IMPATIENT_SUBJECT');
              userMemory.recordDiscoveredSecret('IMPATIENT_SUBJECT');
              sessionMemory.recordSecret('IMPATIENT_SUBJECT');
              this.emitWhisper("You don't like waiting.", 'warning', 2600);
            }
          }
        }
      }
    };

    window.addEventListener('pointermove', this.onPointerMoveHandler, { passive: true });
    window.addEventListener('pointerdown', this.onPointerDownHandler, { passive: true });

    // Periodic check for prolonged inactivity (SILENT_SUBJECT secret)
    this.idleCheckInterval = window.setInterval(() => {
      const now = Date.now();
      const idleTime = now - this.lastActivityTime;

      const activeTestScenes = [
        'MOTOR_TEST',
        'INSTINCT_TEST',
        'OBEDIENCE_TEST',
        'DECISION_TEST',
        'MEMORY_TEST',
        'PREDICTION',
      ];

      if (activeTestScenes.includes(this.activeScene) && idleTime > 12000) {
        if (this.canTrigger('inactivity_silent', 30000)) {
          SecretResolver.recordDiscovery('SILENT_SUBJECT');
          userMemory.recordDiscoveredSecret('SILENT_SUBJECT');
          sessionMemory.recordSecret('SILENT_SUBJECT');
          this.emitWhisper('Are you still there?', 'curious', 2800);
          sessionMemory.recordHoverHesitation();
        }
      }
    }, 3000);
  }

  public destroy(): void {
    if (typeof window !== 'undefined') {
      if (this.onPointerMoveHandler) {
        window.removeEventListener('pointermove', this.onPointerMoveHandler);
      }
      if (this.onPointerDownHandler) {
        window.removeEventListener('pointerdown', this.onPointerDownHandler);
      }
    }
    if (this.idleCheckInterval !== null) {
      window.clearInterval(this.idleCheckInterval);
      this.idleCheckInterval = null;
    }
    if (this.whisperTimer !== null) {
      window.clearTimeout(this.whisperTimer);
      this.whisperTimer = null;
    }
    if (this.landingTimer !== null) {
      window.clearTimeout(this.landingTimer);
      this.landingTimer = null;
    }
    this.listeners.clear();
  }

  private canTrigger(key: string, cooldownMs: number): boolean {
    const now = Date.now();
    const last = this.lastTriggerTimes[key] || 0;
    if (now - last > cooldownMs) {
      this.lastTriggerTimes[key] = now;
      return true;
    }
    return false;
  }
}

export const hiddenBehaviors = new HiddenBehaviorManager();

