class CameraManager {
  private stream: MediaStream | null = null;

  isSupported(): boolean {
    return Boolean(navigator.mediaDevices?.getUserMedia);
  }

  isSecure(): boolean {
    return (
      window.isSecureContext ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    );
  }

  getStream(): MediaStream | null {
    if (!this.stream) return null;
    const active = this.stream.getVideoTracks().some((track) => track.readyState === 'live');
    if (!active) {
      this.stream = null;
      return null;
    }
    return this.stream;
  }

  private normalizeCameraError(error: unknown): Error {
    if (error instanceof DOMException) {
      if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
        return new Error('Camera permission was denied. You can continue without camera.');
      }
      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        return new Error('No usable front camera was found on this device.');
      }
      if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        return new Error('The camera is already in use by another application or browser tab.');
      }
      if (error.name === 'OverconstrainedError') {
        return new Error('The requested camera mode is not supported by this device.');
      }
    }
    return error instanceof Error ? error : new Error('Camera could not be initialized.');
  }

  private bindLifecycle(stream: MediaStream) {
    for (const track of stream.getVideoTracks()) {
      track.addEventListener(
        'ended',
        () => {
          if (this.stream === stream) this.stream = null;
        },
        { once: true },
      );
    }
  }

  async start(): Promise<MediaStream> {
    const existing = this.getStream();
    if (existing) return existing;

    if (!this.isSupported()) {
      throw new Error('Camera API is not supported by this browser.');
    }

    if (!this.isSecure()) {
      throw new Error('Camera access requires HTTPS or localhost.');
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 960 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      });
    } catch (error) {
      // Some phones reject ideal constraints despite having a perfectly usable camera.
      if (error instanceof DOMException && error.name === 'OverconstrainedError') {
        try {
          this.stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false,
          });
        } catch (fallbackError) {
          throw this.normalizeCameraError(fallbackError);
        }
      } else {
        throw this.normalizeCameraError(error);
      }
    }

    this.bindLifecycle(this.stream);
    return this.stream;
  }

  async attach(video: HTMLVideoElement): Promise<void> {
    const stream = this.getStream() ?? (await this.start());
    if (video.srcObject !== stream) video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();
  }

  stop(): void {
    if (!this.stream) return;
    for (const track of this.stream.getTracks()) track.stop();
    this.stream = null;
  }
}

export const camera = new CameraManager();
