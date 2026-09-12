/**
 * UserMemory
 * Lightweight, privacy-preserving returning user memory using localStorage.
 * Strictly persists non-sensitive experience metadata across sessions.
 * Never persists raw pointer paths, camera frames, face landmarks, or behavioral telemetry.
 */

export interface UserMemoryData {
  visitCount: number;
  lastVisitTimestamp: number;
  previousEnding?: string;
  previousMachineClass?: string;
  previousMachineId?: string;
  previousHumanity?: number;
  secretsDiscovered: string[];
}

const STORAGE_KEY = 'human_user_memory_v2';
const AUDIO_PREF_KEY = 'human_audio_muted_pref';

class UserMemoryManager {
  private memory: UserMemoryData;

  constructor() {
    this.memory = this.load();
  }

  private load(): UserMemoryData {
    if (typeof window === 'undefined') {
      return { visitCount: 0, lastVisitTimestamp: 0, secretsDiscovered: [] };
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return { visitCount: 0, lastVisitTimestamp: 0, secretsDiscovered: [] };
      }

      const parsed = JSON.parse(raw);
      // Validate schema and types safely
      return {
        visitCount: typeof parsed.visitCount === 'number' && parsed.visitCount >= 0 ? Math.floor(parsed.visitCount) : 0,
        lastVisitTimestamp: typeof parsed.lastVisitTimestamp === 'number' ? parsed.lastVisitTimestamp : Date.now(),
        previousEnding: typeof parsed.previousEnding === 'string' ? parsed.previousEnding.slice(0, 20) : undefined,
        previousMachineClass: typeof parsed.previousMachineClass === 'string' ? parsed.previousMachineClass.slice(0, 40) : undefined,
        previousMachineId: typeof parsed.previousMachineId === 'string' ? parsed.previousMachineId.slice(0, 20) : undefined,
        previousHumanity: typeof parsed.previousHumanity === 'number' ? Math.max(0, Math.min(100, parsed.previousHumanity)) : undefined,
        secretsDiscovered: Array.isArray(parsed.secretsDiscovered)
          ? parsed.secretsDiscovered.filter((s: unknown): s is string => typeof s === 'string').slice(0, 30)
          : [],
      };
    } catch {
      return { visitCount: 0, lastVisitTimestamp: 0, secretsDiscovered: [] };
    }
  }

  private save(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.memory));
    } catch {
      // quota or private mode fallback
    }
  }

  public getMemory(): UserMemoryData {
    return { ...this.memory };
  }

  public incrementVisitCount(): void {
    this.memory.visitCount += 1;
    this.memory.lastVisitTimestamp = Date.now();
    this.save();
  }

  public recordSessionCompletion(data: {
    ending: string;
    machineClass: string;
    machineId: string;
    humanity: number;
    secrets: string[];
  }): void {
    this.memory.previousEnding = data.ending;
    this.memory.previousMachineClass = data.machineClass;
    this.memory.previousMachineId = data.machineId;
    this.memory.previousHumanity = data.humanity;

    // Merge discovered secrets uniquely
    const currentSecrets = new Set(this.memory.secretsDiscovered);
    data.secrets.forEach((s) => currentSecrets.add(s));
    this.memory.secretsDiscovered = Array.from(currentSecrets);

    this.save();
  }

  public recordDiscoveredSecret(secretId: string): boolean {
    if (!this.memory.secretsDiscovered.includes(secretId)) {
      this.memory.secretsDiscovered.push(secretId);
      this.save();
      return true;
    }
    return false;
  }

  public getAudioMutedPref(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(AUDIO_PREF_KEY) === 'true';
    } catch {
      return false;
    }
  }

  public setAudioMutedPref(muted: boolean): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(AUDIO_PREF_KEY, muted ? 'true' : 'false');
    } catch {
      // ignore
    }
  }
}

export const userMemory = new UserMemoryManager();
