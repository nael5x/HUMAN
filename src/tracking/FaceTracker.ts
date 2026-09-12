import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export interface FacePoint {
  x: number;
  y: number;
  z: number;
}

export interface FaceSignals {
  detected: boolean;
  landmarks: FacePoint[];
  yaw: number;
  rollDeg: number;
  smile: number;
  blink: number;
}

const WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export class FaceTracker {
  private landmarker: FaceLandmarker | null = null;
  private initPromise: Promise<void> | null = null;
  private lastVideoTime = -1;

  async initialize(): Promise<void> {
    if (this.landmarker) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
      const sharedOptions = {
        runningMode: 'VIDEO' as const,
        numFaces: 1,
        minFaceDetectionConfidence: 0.55,
        minFacePresenceConfidence: 0.55,
        minTrackingConfidence: 0.55,
        outputFaceBlendshapes: true,
      };

      try {
        this.landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: 'GPU',
          },
          ...sharedOptions,
        });
      } catch {
        // Some mobile/Safari/WebGL combinations reject the GPU delegate even though
        // the local model can still run acceptably on CPU/WASM. Fall back before
        // degrading the experience to the synthetic mode.
        this.landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
          },
          ...sharedOptions,
        });
      }
    })();

    try {
      await this.initPromise;
    } catch (error) {
      this.initPromise = null;
      throw error;
    }
  }

  isReady(): boolean {
    return Boolean(this.landmarker);
  }

  detect(video: HTMLVideoElement): FaceSignals | null {
    if (!this.landmarker || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;
    if (video.currentTime === this.lastVideoTime) return null;
    this.lastVideoTime = video.currentTime;

    let result;
    try {
      result = this.landmarker.detectForVideo(video, performance.now());
    } catch {
      return null;
    }
    const rawLandmarks = result.faceLandmarks?.[0];
    if (!rawLandmarks || rawLandmarks.length < 455) {
      return {
        detected: false,
        landmarks: [],
        yaw: 0,
        rollDeg: 0,
        smile: 0,
        blink: 0,
      };
    }

    const landmarks: FacePoint[] = rawLandmarks.map((point) => ({
      x: point.x,
      y: point.y,
      z: point.z,
    }));

    // MediaPipe face mesh reference points.
    const nose = landmarks[1];
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];
    const leftEyeOuter = landmarks[33];
    const rightEyeOuter = landmarks[263];

    const faceCenterX = (leftCheek.x + rightCheek.x) / 2;
    const faceWidth = Math.max(0.001, Math.abs(rightCheek.x - leftCheek.x));
    const yaw = (nose.x - faceCenterX) / faceWidth;

    const eyeDx = rightEyeOuter.x - leftEyeOuter.x;
    const eyeDy = rightEyeOuter.y - leftEyeOuter.y;
    const rollDeg = (Math.atan2(eyeDy, eyeDx) * 180) / Math.PI;

    const categories = result.faceBlendshapes?.[0]?.categories ?? [];
    const shape = new Map<string, number>();
    for (const category of categories) {
      shape.set(category.categoryName, category.score);
    }

    const smile = clamp01(
      ((shape.get('mouthSmileLeft') ?? 0) + (shape.get('mouthSmileRight') ?? 0)) / 2,
    );
    const blink = clamp01(
      ((shape.get('eyeBlinkLeft') ?? 0) + (shape.get('eyeBlinkRight') ?? 0)) / 2,
    );

    return {
      detected: true,
      landmarks,
      yaw,
      rollDeg,
      smile,
      blink,
    };
  }

  close(): void {
    this.landmarker?.close();
    this.landmarker = null;
    this.initPromise = null;
    this.lastVideoTime = -1;
  }
}
