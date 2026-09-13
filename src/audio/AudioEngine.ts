import { userMemory } from '../memory/UserMemory';

/**
 * Clinical Web Audio synthesizer engine for HUMAN? experience.
 * Fully procedural without external file dependencies.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private ambienceOsc1: OscillatorNode | null = null;
  private ambienceOsc2: OscillatorNode | null = null;
  private ambienceFilter: BiquadFilterNode | null = null;
  private ambienceGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private isStarted: boolean = false;
  private ambienceTension: number = 0;

  constructor() {
    this.isMuted = userMemory.getAudioMutedPref();
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.75, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    } catch {
      // AudioContext unavailable
    }
  }

  public resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    userMemory.setAudioMutedPref(this.isMuted);
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.75, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public reset() {
    this.stopAmbience(0.1);
  }

  public startAmbience() {
    this.resume();
    if (!this.ctx || !this.masterGain || this.isStarted) return;
    this.isStarted = true;

    try {
      const t = this.ctx.currentTime;
      // Sub drone
      this.ambienceOsc1 = this.ctx.createOscillator();
      this.ambienceOsc1.type = 'sawtooth';
      this.ambienceOsc1.frequency.setValueAtTime(45, t);

      this.ambienceOsc2 = this.ctx.createOscillator();
      this.ambienceOsc2.type = 'sine';
      this.ambienceOsc2.frequency.setValueAtTime(48.5, t); // beating binaural effect

      this.ambienceFilter = this.ctx.createBiquadFilter();
      this.ambienceFilter.type = 'lowpass';
      this.ambienceFilter.frequency.setValueAtTime(120 + this.ambienceTension * 420, t);
      this.ambienceFilter.Q.setValueAtTime(3 + this.ambienceTension * 7, t);

      this.ambienceGain = this.ctx.createGain();
      this.ambienceGain.gain.setValueAtTime(0.001, t);
      this.ambienceGain.gain.exponentialRampToValueAtTime(0.10 + this.ambienceTension * 0.09, t + 3);

      this.ambienceOsc1.connect(this.ambienceFilter);
      this.ambienceOsc2.connect(this.ambienceFilter);
      this.ambienceFilter.connect(this.ambienceGain);
      this.ambienceGain.connect(this.masterGain);

      this.ambienceOsc1.start();
      this.ambienceOsc2.start();
    } catch {
      // ignore
    }
  }

  public setAmbienceTension(level: number) {
    this.resume();
    const next = Math.max(0, Math.min(1, level));
    this.ambienceTension = next;
    if (!this.isStarted) this.startAmbience();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    try {
      this.ambienceFilter?.frequency.setTargetAtTime(120 + next * 420, t, 0.35);
      this.ambienceFilter?.Q.setTargetAtTime(3 + next * 7, t, 0.35);
      this.ambienceGain?.gain.setTargetAtTime(0.10 + next * 0.09, t, 0.45);
      this.ambienceOsc1?.frequency.setTargetAtTime(43 + next * 8, t, 0.5);
      this.ambienceOsc2?.frequency.setTargetAtTime(47 + next * 11, t, 0.5);
    } catch {
      // Audio automation unavailable.
    }
  }

  public stopAmbience(fadeDuration: number = 0.5) {
    if (!this.ctx || !this.ambienceGain) return;
    try {
      const t = this.ctx.currentTime;
      this.ambienceGain.gain.setTargetAtTime(0.0001, t, fadeDuration / 3);
      setTimeout(() => {
        try {
          this.ambienceOsc1?.stop();
          this.ambienceOsc2?.stop();
          this.ambienceOsc1?.disconnect();
          this.ambienceOsc2?.disconnect();
          this.ambienceOsc1 = null;
          this.ambienceOsc2 = null;
          this.ambienceFilter = null;
          this.ambienceGain = null;
          this.isStarted = false;
        } catch {
          // ignore
        }
      }, fadeDuration * 1000 + 100);
    } catch {
      // ignore
    }
  }

  public playClick(pitch: number = 1200) {
    this.resume();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(pitch, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.04);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.05);
    } catch {
      // ignore
    }
  }

  public playScanPulse() {
    this.resume();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(680, t);
      osc.frequency.exponentialRampToValueAtTime(320, t + 0.18);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.2);
    } catch {
      // ignore
    }
  }

  public playAcceptedTick() {
    this.resume();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const t = this.ctx.currentTime;
      [587.33, 880].forEach((freq, i) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const delay = i * 0.08;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + delay);

        gain.gain.setValueAtTime(0.14, t + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.12);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t + delay);
        osc.stop(t + delay + 0.15);
      });
    } catch {
      // ignore
    }
  }

  public playWarningPulse() {
    this.resume();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.setValueAtTime(140, t + 0.08);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.26);
    } catch {
      // ignore
    }
  }

  public playGlitch(duration: number = 0.2) {
    this.resume();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const t = this.ctx.currentTime;
      // White noise buffer burst
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.4;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, t);
      filter.Q.setValueAtTime(1.5, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noiseSource.start(t);
      noiseSource.stop(t + duration);
    } catch {
      // ignore
    }
  }

  public playSubDrop() {
    this.resume();
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(95, t);
      osc.frequency.exponentialRampToValueAtTime(28, t + 1.8);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 2.2);
    } catch {
      // ignore
    }
  }
}

export const sound = new SoundEngine();
