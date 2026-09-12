export interface TrackedPointerSample {
  x: number;
  y: number;
  time: number;
  pointerType: string;
}

export class PointerTracker {
  private samples: TrackedPointerSample[] = [];
  private readonly maxSamples: number;

  constructor(maxSamples = 90) {
    this.maxSamples = maxSamples;
  }

  push(x: number, y: number, pointerType = 'mouse', time = performance.now()): TrackedPointerSample {
    const sample = { x, y, pointerType, time };
    this.samples.push(sample);
    if (this.samples.length > this.maxSamples) this.samples.shift();
    return sample;
  }

  getSamples(): readonly TrackedPointerSample[] {
    return this.samples;
  }

  getLast(): TrackedPointerSample | null {
    return this.samples[this.samples.length - 1] ?? null;
  }

  getPrevious(): TrackedPointerSample | null {
    return this.samples[this.samples.length - 2] ?? null;
  }

  clear(): void {
    this.samples = [];
  }

  pathLength(): number {
    let length = 0;
    for (let i = 1; i < this.samples.length; i += 1) {
      const a = this.samples[i - 1];
      const b = this.samples[i];
      length += Math.hypot(b.x - a.x, b.y - a.y);
    }
    return length;
  }

  straightDistance(): number {
    if (this.samples.length < 2) return 0;
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    return Math.hypot(last.x - first.x, last.y - first.y);
  }
}
