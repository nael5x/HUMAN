import { describe, it, expect } from 'vitest';
import { ChallengeProtocol, ChallengePayload } from '../utils/ChallengeMode';

describe('ChallengeProtocol Encode / Decode & Validation', () => {
  it('encodes and decodes a valid challenge payload with full parity', () => {
    const original: ChallengePayload = {
      challengerModelId: 'H-X77',
      challengerHumanity: 89.4,
      challengerEnding: 'VERIFIED',
      challengerClass: 'ADAPTIVE OBSERVER',
      token: 'SEC123',
    };

    const encoded = ChallengeProtocol.encode(original);
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(10);

    const decoded = ChallengeProtocol.decode(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.challengerModelId).toBe(original.challengerModelId);
    expect(decoded?.challengerHumanity).toBe(original.challengerHumanity);
    expect(decoded?.challengerEnding).toBe(original.challengerEnding);
    expect(decoded?.challengerClass).toBe(original.challengerClass);
    expect(decoded?.token).toBe(original.token);
  });

  it('safely handles null, empty string, and whitespace input', () => {
    expect(ChallengeProtocol.decode(null)).toBeNull();
    expect(ChallengeProtocol.decode('')).toBeNull();
    expect(ChallengeProtocol.decode('   ')).toBeNull();
  });

  it('safely handles corrupted base64 or invalid JSON strings', () => {
    expect(ChallengeProtocol.decode('not-valid-base64-content!!')).toBeNull();
    // Valid base64 encoding of non-JSON text
    const badJsonBase64 = btoa('just a raw string');
    expect(ChallengeProtocol.decode(badJsonBase64)).toBeNull();
  });

  it('strictly validates and normalizes ending types to whitelist', () => {
    const payloadWithInvalidEnding: ChallengePayload = {
      challengerModelId: 'H-X12',
      challengerHumanity: 72.1,
      challengerEnding: 'SUPER_HUMAN_GOD_MODE',
      challengerClass: 'LOGICAL SUBJECT',
    };

    const encoded = ChallengeProtocol.encode(payloadWithInvalidEnding);
    const decoded = ChallengeProtocol.decode(encoded);

    // Should fall back safely to 'VERIFIED'
    expect(decoded?.challengerEnding).toBe('VERIFIED');
  });

  it('rejects payloads with out-of-range humanity values', () => {
    const outOfBoundsData = btoa(
      JSON.stringify({
        m: 'H-X01',
        h: 9999, // Impossible humanity score
        e: 'VERIFIED',
        c: 'TEST',
      })
    );

    expect(ChallengeProtocol.decode(outOfBoundsData)).toBeNull();
  });

  it('rejects payloads with invalid or injection-laden model IDs', () => {
    const injectionData = btoa(
      JSON.stringify({
        m: '<script>alert(1)</script>',
        h: 85.0,
        e: 'VERIFIED',
        c: 'TEST',
      })
    );

    expect(ChallengeProtocol.decode(injectionData)).toBeNull();
  });
});
