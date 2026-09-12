/**
 * SecretRegistry
 * Centralized secret discovery system and behavioral anomaly tracker.
 * Discovered anomalies feel emergent, never spoiled during gameplay.
 * Recorded in session memory and persisted across repeat visits.
 */

export interface SecretDefinition {
  id: string;
  name: string; // In-world clinical name (revealed only in final code/counters)
  triggerHint: string;
}

export const SECRETS: Record<string, SecretDefinition> = {
  CORNER_WATCHER: {
    id: 'CORNER_WATCHER',
    name: 'Reticle Dwell Anomaly',
    triggerHint: 'Sustained optical fixation on boundary coordinates.',
  },
  IMPATIENT_SUBJECT: {
    id: 'IMPATIENT_SUBJECT',
    name: 'Hyper-Kinetic Cadence',
    triggerHint: 'Repetitive asynchronous input stimulation.',
  },
  SYSTEM_TOUCH: {
    id: 'SYSTEM_TOUCH',
    name: 'Frame Boundary Touch',
    triggerHint: 'Interactive probe targeting non-functional labels.',
  },
  SILENT_SUBJECT: {
    id: 'SILENT_SUBJECT',
    name: 'Protracted Motor Stasis',
    triggerHint: 'Extended catatonic suspension of kinetic output.',
  },
  RETURNING_SUBJECT: {
    id: 'RETURNING_SUBJECT',
    name: 'Persistent Consciousness',
    triggerHint: 'Recognition of recursive experimental iterations.',
  },
  PREDICTION_BREAKER: {
    id: 'PREDICTION_BREAKER',
    name: 'Prediction Divergence',
    triggerHint: 'Systematic subversion of local predictive heuristics.',
  },
};

export class SecretResolver {
  private static sessionSecrets: Set<string> = new Set();

  public static recordDiscovery(secretId: string): boolean {
    if (this.sessionSecrets.has(secretId)) {
      return false; // already discovered in this session
    }
    this.sessionSecrets.add(secretId);
    return true;
  }

  public static getDiscoveredCount(): number {
    return this.sessionSecrets.size;
  }

  public static getDiscoveredIds(): string[] {
    return Array.from(this.sessionSecrets);
  }

  public static reset(): void {
    this.sessionSecrets.clear();
  }
}
