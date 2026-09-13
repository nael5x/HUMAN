/**
 * ChallengeMode
 * Client-only, zero-backend shareable challenge protocol.
 * Encodes only a compact allowlist of non-sensitive result values.
 */

export interface ChallengePayload {
  version?: 1 | 2;
  challengerModelId: string;
  challengerHumanity: number;
  challengerEnding: string;
  challengerClass: string;
  token?: string; // legacy V1 only

  // V2 compact comparison fields. These are derived result values, never raw telemetry.
  seed?: number;
  predictability?: number; // [0, 100]
  curiosity?: number;      // [0, 100]
  obedience?: number;      // [0, 100]
  instinct?: number;       // [0, 100]
  motorChaos?: number;     // [0, 100]
  decisionSpeed?: number;  // [0, 100]
}

const ALLOWED_ENDINGS = new Set(['VERIFIED', 'ANOMALY', 'MACHINE', 'REPLACED']);
const MODEL_RE = /^[A-Za-z0-9-_]{3,16}$/;
const CLASS_RE = /^[A-Za-z0-9 _-]{1,32}$/;
const MAX_ENCODED_LENGTH = 512;
const MAX_SEED = 0xffffffff;

function isPercent(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}

function normalizePercent(value: number): number {
  return Math.round(value);
}

function isSeed(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= MAX_SEED
  );
}

function isValidEnding(value: unknown): boolean {
  return typeof value === 'string' && ALLOWED_ENDINGS.has(value.toUpperCase());
}

function isValidClass(value: unknown): value is string {
  return typeof value === 'string' && CLASS_RE.test(value.trim());
}

function hasAnyV2Field(payload: ChallengePayload): boolean {
  return (
    payload.seed !== undefined ||
    payload.predictability !== undefined ||
    payload.curiosity !== undefined ||
    payload.obedience !== undefined ||
    payload.instinct !== undefined ||
    payload.motorChaos !== undefined ||
    payload.decisionSpeed !== undefined
  );
}

/**
 * Strict V2 completeness keeps comparison behavior deterministic and prevents
 * partially edited links from silently inventing missing challenger metrics.
 */
function hasCompleteV2Fields(payload: ChallengePayload): boolean {
  return (
    isSeed(payload.seed) &&
    isPercent(payload.predictability) &&
    isPercent(payload.curiosity) &&
    isPercent(payload.obedience) &&
    isPercent(payload.instinct) &&
    isPercent(payload.motorChaos) &&
    isPercent(payload.decisionSpeed)
  );
}

export class ChallengeProtocol {
  /** Encodes a payload into a compact base64url query value. */
  public static encode(payload: ChallengePayload): string {
    try {
      if (payload.version !== undefined && payload.version !== 1 && payload.version !== 2) return '';
      if (payload.version === 1 && hasAnyV2Field(payload)) return '';
      if (!MODEL_RE.test(payload.challengerModelId)) return '';
      if (!isPercent(payload.challengerHumanity)) return '';
      if (!isValidEnding(payload.challengerEnding)) return '';
      if (!isValidClass(payload.challengerClass)) return '';

      const isV2 = payload.version === 2 || hasAnyV2Field(payload);
      if (isV2 && !hasCompleteV2Fields(payload)) return '';

      const data: Record<string, string | number> = {
        m: payload.challengerModelId,
        h: Math.round(payload.challengerHumanity * 10) / 10,
        e: payload.challengerEnding.toUpperCase(),
        c: payload.challengerClass.trim(),
      };

      if (isV2) {
        data.v = 2;
        data.s = payload.seed!;
        data.p = normalizePercent(payload.predictability!);
        data.cu = normalizePercent(payload.curiosity!);
        data.o = normalizePercent(payload.obedience!);
        data.i = normalizePercent(payload.instinct!);
        data.mc = normalizePercent(payload.motorChaos!);
        data.ds = normalizePercent(payload.decisionSpeed!);
      } else if (payload.token) {
        const token = payload.token.replace(/[^A-Za-z0-9]/g, '').slice(0, 12);
        if (token) data.t = token;
      }

      const json = JSON.stringify(data);
      return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch {
      return '';
    }
  }

  /**
   * Decodes and validates a challenge value. Unsupported versions, incomplete
   * V2 payloads, malformed values, and oversized inputs are rejected.
   */
  public static decode(rawParam: string | null): ChallengePayload | null {
    if (!rawParam || typeof rawParam !== 'string') return null;
    if (rawParam.length < 8 || rawParam.length > MAX_ENCODED_LENGTH) return null;

    try {
      let base64 = rawParam.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) base64 += '=';

      const parsed: unknown = JSON.parse(atob(base64));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

      const data = parsed as Record<string, unknown>;
      const versionRaw = data.v === undefined ? 1 : Number(data.v);
      if (versionRaw !== 1 && versionRaw !== 2) return null;

      const modelId = String(data.m ?? '');
      if (!MODEL_RE.test(modelId)) return null;

      const humanity = Number(data.h);
      if (!isPercent(humanity)) return null;

      const ending = String(data.e ?? '').toUpperCase();
      if (!ALLOWED_ENDINGS.has(ending)) return null;

      const challengerClass = String(data.c ?? '').trim();
      if (!isValidClass(challengerClass)) return null;

      const result: ChallengePayload = {
        challengerModelId: modelId,
        challengerHumanity: Math.round(humanity * 10) / 10,
        challengerEnding: ending,
        challengerClass,
      };

      if (versionRaw === 1) {
        if (data.t !== undefined) {
          const token = String(data.t).replace(/[^A-Za-z0-9]/g, '').slice(0, 12);
          if (token) result.token = token;
        }
        return result;
      }

      const seed = Number(data.s);
      const predictability = Number(data.p);
      const curiosity = Number(data.cu);
      const obedience = Number(data.o);
      const instinct = Number(data.i);
      const motorChaos = Number(data.mc);
      const decisionSpeed = Number(data.ds);

      if (
        !isSeed(seed) ||
        !isPercent(predictability) ||
        !isPercent(curiosity) ||
        !isPercent(obedience) ||
        !isPercent(instinct) ||
        !isPercent(motorChaos) ||
        !isPercent(decisionSpeed)
      ) {
        return null;
      }

      return {
        ...result,
        version: 2,
        seed,
        predictability: normalizePercent(predictability),
        curiosity: normalizePercent(curiosity),
        obedience: normalizePercent(obedience),
        instinct: normalizePercent(instinct),
        motorChaos: normalizePercent(motorChaos),
        decisionSpeed: normalizePercent(decisionSpeed),
      };
    } catch {
      return null;
    }
  }

  public static parseChallengeFromUrl(): ChallengePayload | null {
    if (typeof window === 'undefined') return null;
    try {
      return this.decode(new URLSearchParams(window.location.search).get('c'));
    } catch {
      return null;
    }
  }

  public static createChallengeUrl(payload: ChallengePayload): string {
    if (typeof window === 'undefined') return '';
    const code = this.encode(payload);
    const base = window.location.origin + window.location.pathname;
    if (!code) return base;

    const url = new URL(base);
    url.searchParams.set('c', code);
    return url.toString();
  }
}
