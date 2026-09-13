import { describe, it, expect, beforeEach } from 'vitest';
import { userMemory } from '../memory/UserMemory';

// In-memory localStorage mock for consistent unit test execution across environments
class MockLocalStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

describe('UserMemory Storage, Migration & Recovery', () => {
  const mockStorage = new MockLocalStorage();

  beforeEach(() => {
    mockStorage.clear();
    // Attach to global window/globalThis
    Object.defineProperty(globalThis, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
    userMemory.reload();
  });

  it('initializes with zero visits when storage is empty', () => {
    const mem = userMemory.getMemory();
    expect(mem.visitCount).toBe(0);
    expect(Array.isArray(mem.secretsDiscovered)).toBe(true);
    expect(mem.lastVisitTimestamp).toBe(0);
  });

  it('correctly manages first-visit vs returning-user semantics', () => {
    // A. fresh storage + first recordVisitForSession() => visitCount === 1
    // B. first visit => returning === false (visitCount > 1 is false)
    const freshMemBefore = userMemory.getMemory();
    expect(freshMemBefore.visitCount).toBe(0);

    userMemory.recordVisitForSession('SUBJECT-001');
    const firstVisitMem = userMemory.getMemory();
    expect(firstVisitMem.visitCount).toBe(1);
    const isReturningFirst = firstVisitMem.visitCount > 1;
    expect(isReturningFirst).toBe(false);

    // E. duplicate call with the same subject/session ID does not increment
    userMemory.recordVisitForSession('SUBJECT-001');
    const duplicateMem = userMemory.getMemory();
    expect(duplicateMem.visitCount).toBe(1);
    expect(duplicateMem.visitCount > 1).toBe(false);

    // C. second distinct session => visitCount === 2
    // D. second visit => returning === true (visitCount > 1 is true)
    userMemory.recordVisitForSession('SUBJECT-002');
    const secondVisitMem = userMemory.getMemory();
    expect(secondVisitMem.visitCount).toBe(2);
    const isReturningSecond = secondVisitMem.visitCount > 1;
    expect(isReturningSecond).toBe(true);
  });

  it('deduplicates visit count increments within the same session ID across component re-renders', () => {
    const sessionId = 'SESSION-ABC-123';

    expect(userMemory.getMemory().visitCount).toBe(0);
    userMemory.recordVisitForSession(sessionId);
    expect(userMemory.getMemory().visitCount).toBe(1);

    // Call again with same session ID (simulating React StrictMode double mount or component re-render)
    userMemory.recordVisitForSession(sessionId);
    expect(userMemory.getMemory().visitCount).toBe(1); // Should NOT increment again
  });

  it('increments visit count for distinct session IDs', () => {
    expect(userMemory.getMemory().visitCount).toBe(0);
    userMemory.recordVisitForSession('SESSION-ALPHA');
    expect(userMemory.getMemory().visitCount).toBe(1);

    userMemory.recordVisitForSession('SESSION-BETA');
    expect(userMemory.getMemory().visitCount).toBe(2);
  });

  it('migrates legacy human_user_memory (v1) storage key seamlessly', () => {
    // Populate legacy storage
    mockStorage.setItem(
      'human_user_memory',
      JSON.stringify({
        visitCount: 3,
        lastVisitTimestamp: 1690000000000,
        previousEnding: 'MACHINE',
        previousMachineClass: 'LOGICAL SUBJECT',
        previousMachineId: 'H-X88',
        previousHumanity: 81.5,
        secretsDiscovered: ['SECRET_FOUND'],
      })
    );

    const reloaded = userMemory.reload();
    expect(reloaded.visitCount).toBe(3);
    expect(reloaded.previousEnding).toBe('MACHINE');
    expect(reloaded.previousMachineClass).toBe('LOGICAL SUBJECT');
    expect(reloaded.previousMachineId).toBe('H-X88');
    expect(reloaded.secretsDiscovered).toEqual(['SECRET_FOUND']);

    // Ensure migrated key exists in modern key
    expect(mockStorage.getItem('human_user_memory_v2')).not.toBeNull();
  });

  it('recovers gracefully from corrupted or invalid JSON in storage', () => {
    mockStorage.setItem('human_user_memory_v2', 'corrupted!{{bad-json');

    const reloaded = userMemory.reload();
    expect(reloaded.visitCount).toBe(0);
    expect(Array.isArray(reloaded.secretsDiscovered)).toBe(true);
  });

  it('records session completion metadata safely', () => {
    userMemory.recordSessionCompletion({
      ending: 'ANOMALY',
      machineClass: 'CURIOUS ANOMALY',
      machineId: 'H-X99',
      humanity: 74.2,
      secrets: ['SECRET_PROMPT'],
    });

    const mem = userMemory.getMemory();
    expect(mem.previousEnding).toBe('ANOMALY');
    expect(mem.previousMachineClass).toBe('CURIOUS ANOMALY');
    expect(mem.previousMachineId).toBe('H-X99');
    expect(mem.previousHumanity).toBe(74.2);
  });
});
