import { describe, it, expect } from 'vitest';
import { ChallengeProtocol, ChallengePayload } from '../utils/ChallengeMode';

function rawDecode(encoded: string): Record<string, unknown> {
  let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return JSON.parse(atob(base64)) as Record<string, unknown>;
}

describe('ChallengeProtocol Encode / Decode & Validation', () => {
  it('preserves a valid legacy challenge payload', () => {
    const original: ChallengePayload = {
      challengerModelId: 'H-X77',
      challengerHumanity: 89.4,
      challengerEnding: 'VERIFIED',
      challengerClass: 'ADAPTIVE OBSERVER',
      token: 'SEC123',
    };

    const decoded = ChallengeProtocol.decode(ChallengeProtocol.encode(original));
    expect(decoded).toEqual(original);
  });

  it('safely handles null, empty, whitespace, corrupted base64, and invalid JSON', () => {
    expect(ChallengeProtocol.decode(null)).toBeNull();
    expect(ChallengeProtocol.decode('')).toBeNull();
    expect(ChallengeProtocol.decode('   ')).toBeNull();
    expect(ChallengeProtocol.decode('not-valid-base64-content!!')).toBeNull();
    expect(ChallengeProtocol.decode(btoa('just a raw string'))).toBeNull();
  });

  it('rejects invalid ending and class values instead of silently inventing replacements', () => {
    const invalidEnding = btoa(JSON.stringify({ m: 'H-X12', h: 72.1, e: 'GOD_MODE', c: 'LOGICAL SUBJECT' }));
    const invalidClass = btoa(JSON.stringify({ m: 'H-X12', h: 72.1, e: 'VERIFIED', c: '<script>' }));

    expect(ChallengeProtocol.decode(invalidEnding)).toBeNull();
    expect(ChallengeProtocol.decode(invalidClass)).toBeNull();
  });

  it('rejects out-of-range humanity values', () => {
    const encoded = btoa(JSON.stringify({ m: 'H-X01', h: 9999, e: 'VERIFIED', c: 'TEST' }));
    expect(ChallengeProtocol.decode(encoded)).toBeNull();
  });

  it('rejects invalid or injection-laden model IDs', () => {
    const encoded = btoa(JSON.stringify({
      m: '<script>alert(1)</script>',
      h: 85,
      e: 'VERIFIED',
      c: 'TEST',
    }));
    expect(ChallengeProtocol.decode(encoded)).toBeNull();
  });

  it('round-trips a complete V2 payload with deterministic result fields', () => {
    const original: ChallengePayload = {
      version: 2,
      challengerModelId: 'H-X88',
      challengerHumanity: 91.2,
      challengerEnding: 'REPLACED',
      challengerClass: 'PHANTOM VARIANT',
      seed: 98124,
      predictability: 74,
      curiosity: 82,
      obedience: 44,
      instinct: 68,
      motorChaos: 19,
      decisionSpeed: 77,
    };

    const encoded = ChallengeProtocol.encode(original);
    expect(encoded.length).toBeGreaterThan(10);
    expect(encoded.length).toBeLessThan(300);
    expect(ChallengeProtocol.decode(encoded)).toEqual(original);
  });

  it('rejects invalid V2 numeric fields and invalid seeds', () => {
    const badPredictability = btoa(JSON.stringify({
      v: 2, m: 'H-X01', h: 80, e: 'VERIFIED', c: 'TEST',
      s: 12, p: 9999, cu: 50, o: 50, i: 50, mc: 50, ds: 50,
    }));
    const badSeed = btoa(JSON.stringify({
      v: 2, m: 'H-X01', h: 80, e: 'VERIFIED', c: 'TEST',
      s: -1, p: 50, cu: 50, o: 50, i: 50, mc: 50, ds: 50,
    }));

    expect(ChallengeProtocol.decode(badPredictability)).toBeNull();
    expect(ChallengeProtocol.decode(badSeed)).toBeNull();
  });

  it('rejects unsupported payload versions', () => {
    const encoded = btoa(JSON.stringify({ m: 'H-X01', h: 80, e: 'VERIFIED', c: 'TEST', v: 99 }));
    expect(ChallengeProtocol.decode(encoded)).toBeNull();
  });

  it('rejects oversized payload values before decoding', () => {
    expect(ChallengeProtocol.decode('A'.repeat(513))).toBeNull();
  });

  it('requires every V2 comparison field instead of inventing missing values', () => {
    const incomplete = btoa(JSON.stringify({
      v: 2,
      m: 'H-X01',
      h: 80,
      e: 'VERIFIED',
      c: 'TEST',
      s: 123,
      p: 50,
      // curiosity intentionally missing
      o: 50,
      i: 50,
      mc: 50,
      ds: 50,
    }));
    expect(ChallengeProtocol.decode(incomplete)).toBeNull();
  });

  it('serializes only the V2 allowlist and excludes extra telemetry-like properties', () => {
    const payload = {
      version: 2,
      challengerModelId: 'H-X42',
      challengerHumanity: 84,
      challengerEnding: 'ANOMALY',
      challengerClass: 'ADAPTIVE OBSERVER',
      seed: 4242,
      predictability: 61,
      curiosity: 77,
      obedience: 42,
      instinct: 65,
      motorChaos: 31,
      decisionSpeed: 73,
      faceLandmarks: [[0.1, 0.2]],
      rawPointerTelemetry: [{ x: 1, y: 2 }],
      sessionMemory: { hidden: 'nope' },
      cameraFrame: 'binary-ish-data',
    } as ChallengePayload & Record<string, unknown>;

    const raw = rawDecode(ChallengeProtocol.encode(payload));
    expect(Object.keys(raw).sort()).toEqual(['c', 'cu', 'ds', 'e', 'h', 'i', 'm', 'mc', 'o', 'p', 's', 'v'].sort());
    expect(JSON.stringify(raw)).not.toContain('faceLandmarks');
    expect(JSON.stringify(raw)).not.toContain('rawPointerTelemetry');
    expect(JSON.stringify(raw)).not.toContain('sessionMemory');
    expect(JSON.stringify(raw)).not.toContain('cameraFrame');
  });

  it('does not serialize legacy token data into V2 links', () => {
    const payload: ChallengePayload = {
      version: 2,
      challengerModelId: 'H-X42',
      challengerHumanity: 84,
      challengerEnding: 'ANOMALY',
      challengerClass: 'ADAPTIVE OBSERVER',
      token: 'LEGACY123',
      seed: 4242,
      predictability: 61,
      curiosity: 77,
      obedience: 42,
      instinct: 65,
      motorChaos: 31,
      decisionSpeed: 73,
    };

    expect(rawDecode(ChallengeProtocol.encode(payload)).t).toBeUndefined();
  });

  it('accepts explicit V1 links without growing them into V2', () => {
    const encoded = btoa(JSON.stringify({ v: 1, m: 'SUB-404', h: 78, e: 'ANOMALY', c: 'IRREGULAR SUBJECT' }));
    const decoded = ChallengeProtocol.decode(encoded);
    expect(decoded).toEqual({
      challengerModelId: 'SUB-404',
      challengerHumanity: 78,
      challengerEnding: 'ANOMALY',
      challengerClass: 'IRREGULAR SUBJECT',
    });
  });
});
