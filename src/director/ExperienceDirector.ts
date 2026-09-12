import { sound } from '../audio/AudioEngine';

export type NarrativeState =
  | 'NORMAL'
  | 'OBSERVING'
  | 'PREDICTING'
  | 'LEARNING'
  | 'UNSTABLE'
  | 'REVEALED'
  | 'RECONSTRUCTING'
  | 'RESULT';

type Listener = (state: NarrativeState, tension: number) => void;

/**
 * ExperienceDirector
 * Central coordinator for the psychological tension and narrative progression of HUMAN?
 * Ensures scenes, audio atmosphere, and HUD react consistently without scattered global state.
 */
class ExperienceDirectorService {
  private narrativeState: NarrativeState = 'NORMAL';
  private tensionLevel: number = 0.05;
  private listeners: Set<Listener> = new Set();

  public getNarrativeState(): NarrativeState {
    return this.narrativeState;
  }

  public getTensionLevel(): number {
    return this.tensionLevel;
  }

  public setNarrativeState(state: NarrativeState, tension?: number): void {
    this.narrativeState = state;
    if (tension !== undefined) {
      this.setTensionLevel(tension);
    } else {
      // Default tension progression per narrative state
      switch (state) {
        case 'NORMAL':
          this.setTensionLevel(0.08);
          break;
        case 'OBSERVING':
          this.setTensionLevel(0.24);
          break;
        case 'PREDICTING':
          this.setTensionLevel(0.42);
          break;
        case 'LEARNING':
          this.setTensionLevel(0.55);
          break;
        case 'UNSTABLE':
          this.setTensionLevel(0.78);
          break;
        case 'REVEALED':
          this.setTensionLevel(0.88);
          break;
        case 'RECONSTRUCTING':
          this.setTensionLevel(0.40);
          break;
        case 'RESULT':
          this.setTensionLevel(0.12);
          break;
      }
    }
    this.notify();
  }

  public setTensionLevel(tension: number): void {
    this.tensionLevel = Math.max(0, Math.min(1, tension));
    sound.setAmbienceTension(this.tensionLevel);
    this.notify();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.narrativeState, this.tensionLevel);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public reset(): void {
    this.narrativeState = 'NORMAL';
    this.tensionLevel = 0.05;
    sound.setAmbienceTension(0.05);
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.narrativeState, this.tensionLevel);
      } catch (err) {
        console.error('[ExperienceDirector] listener error:', err);
      }
    }
  }
}

export const director = new ExperienceDirectorService();
