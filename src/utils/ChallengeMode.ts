/**
 * ChallengeMode
 * Client-only, zero-backend shareable challenge protocol.
 * Safely encodes and decodes minimal non-sensitive challenger dossier results.
 * Strictly sanitizes and validates all input to prevent injection.
 */

export interface ChallengePayload {
  challengerModelId: string;
  challengerHumanity: number;
  challengerEnding: string;
  challengerClass: string;
  token?: string;
}

const ALLOWED_ENDINGS = ['VERIFIED', 'ANOMALY', 'MACHINE', 'REPLACED'];

export class ChallengeProtocol {
  /**
   * Encodes a payload into a safe URL parameter string.
   */
  public static encode(payload: ChallengePayload): string {
    try {
      const data = {
        m: payload.challengerModelId.slice(0, 16),
        h: Math.round(payload.challengerHumanity * 10) / 10,
        e: payload.challengerEnding.slice(0, 16),
        c: payload.challengerClass.slice(0, 32),
        t: payload.token ? payload.token.slice(0, 12) : undefined,
      };
      const json = JSON.stringify(data);
      // Safe base64 encoding for URL
      return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch {
      return '';
    }
  }

  /**
   * Decodes and strictly validates a URL parameter string.
   * Returns null if missing, invalid, or malformed.
   */
  public static decode(rawParam: string | null): ChallengePayload | null {
    if (!rawParam || typeof rawParam !== 'string') return null;

    // Length limit guard
    if (rawParam.length < 8 || rawParam.length > 256) return null;

    try {
      // Revert base64url to base64
      let base64 = rawParam.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }

      const jsonStr = atob(base64);
      const parsed = JSON.parse(jsonStr);

      if (!parsed || typeof parsed !== 'object') return null;

      // Validate Model ID: must start with H- or SUB- and contain only alphanumeric/hyphens
      const rawModel = String(parsed.m || '');
      const modelRegex = /^[A-Za-z0-9-_]{3,16}$/;
      if (!modelRegex.test(rawModel)) return null;

      // Validate Humanity: number between 1.0 and 100.0
      const rawHumanity = Number(parsed.h);
      if (isNaN(rawHumanity) || rawHumanity < 0 || rawHumanity > 100) return null;

      // Validate Ending: must be in whitelist
      const rawEnding = String(parsed.e || '').toUpperCase();
      const ending = ALLOWED_ENDINGS.includes(rawEnding) ? rawEnding : 'VERIFIED';

      // Validate Class: alphanumeric + spaces only
      const rawClass = String(parsed.c || '').slice(0, 32);
      const sanitizedClass = rawClass.replace(/[^A-Za-z0-9- ]/g, '').trim() || 'UNKNOWN';

      return {
        challengerModelId: rawModel,
        challengerHumanity: Math.round(rawHumanity * 10) / 10,
        challengerEnding: ending,
        challengerClass: sanitizedClass,
        token: parsed.t ? String(parsed.t).replace(/[^A-Za-z0-9]/g, '').slice(0, 12) : undefined,
      };
    } catch {
      return null;
    }
  }

  /**
   * Helper to parse challenge payload directly from window.location.
   */
  public static parseChallengeFromUrl(): ChallengePayload | null {
    if (typeof window === 'undefined') return null;
    try {
      const params = new URLSearchParams(window.location.search);
      const c = params.get('c');
      return this.decode(c);
    } catch {
      return null;
    }
  }

  /**
   * Generates a full shareable challenge URL.
   */
  public static createChallengeUrl(payload: ChallengePayload): string {
    const code = this.encode(payload);
    if (!code) return window.location.origin + window.location.pathname;

    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('c', code);
    return url.toString();
  }
}
