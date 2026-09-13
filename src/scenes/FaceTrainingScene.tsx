import React, { useEffect, useMemo, useRef, useState } from 'react';
import { sound } from '../audio/AudioEngine';
import { camera } from '../tracking/CameraManager';
import { FaceTracker, type FaceSignals } from '../tracking/FaceTracker';
import { director } from '../director/ExperienceDirector';
import { sessionMemory } from '../memory/SessionMemory';

interface FaceTrainingSceneProps {
  isSimulated: boolean;
  onTrainingComplete: (usedRealTracking: boolean) => void;
}

interface GestureStep {
  instruction: string;
  subtext: string;
  learningLabel: string;
  progress: number;
}

type Phase = 'loading' | 'acquiring' | 'training' | 'completed';

// Subset of 9 key landmarks to project minimal clinical reticle overlay (no carnival dots)
const LANDMARK_INDICES = [10, 33, 263, 1, 61, 291, 234, 454, 152];
const CALIBRATION_SAMPLE_COUNT = 25; // ~1 second of stable frames at 25 FPS
const ACQUISITION_TIMEOUT_MS = 10000;
const GESTURE_TIMEOUT_MS = 8000;

export const FaceTrainingScene: React.FC<FaceTrainingSceneProps> = ({
  isSimulated,
  onTrainingComplete,
}) => {
  const [phase, setPhase] = useState<Phase>(isSimulated ? 'acquiring' : 'loading');
  const [acquisitionStep, setAcquisitionStep] = useState(0);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [patternLearnedFlash, setPatternLearnedFlash] = useState(false);
  const [flashMessage, setFlashMessage] = useState<string>('Pattern learned. Training model...');
  const [trackerError, setTrackerError] = useState<string | null>(null);
  const [attemptTimeout, setAttemptTimeout] = useState(false);
  const [gestureAttempt, setGestureAttempt] = useState(0);
  const [retryNonce, setRetryNonce] = useState(0);
  const [completionPhrase, setCompletionPhrase] = useState(false);
  const [telemetry, setTelemetry] = useState({ yaw: 0, roll: 0, smile: 0, blink: 0 });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackerRef = useRef<FaceTracker | null>(null);
  const signalsRef = useRef<FaceSignals | null>(null);
  const baselineAccumulatorRef = useRef({ yaw: 0, roll: 0, smile: 0, blink: 0, count: 0 });
  const baselineRef = useRef({ yaw: 0, roll: 0, smile: 0, blink: 0 });
  const leftDirectionSignRef = useRef(0);
  const gestureLockedRef = useRef(false);
  const gestureFramesRef = useRef(0);
  const phaseRef = useRef<Phase>(phase);
  const promptIndexRef = useRef(currentPromptIndex);

  // Gesture Training Story: Left -> Right -> Smile -> Tilt -> Blink
  // With evolving psychological narrative language
  const trainingSteps = useMemo<GestureStep[]>(
    () => [
      {
        instruction: 'LOOK LEFT',
        subtext: 'Align ocular axis to primary lateral vector...',
        learningLabel: 'LEARNING CRANIAL YAW VECTOR',
        progress: 20,
      },
      {
        instruction: 'LOOK RIGHT',
        subtext: 'Mirroring bilateral rotational reflex...',
        learningLabel: 'RECORDING INVERSE ROTATION RESPONSE',
        progress: 40,
      },
      {
        instruction: 'SMILE',
        subtext: 'Indexing bilateral zygomatic tension...',
        learningLabel: 'TRAINING FACIAL MOTOR MIMICRY',
        progress: 60,
      },
      {
        instruction: 'TILT YOUR HEAD',
        subtext: 'Calibrating cranial angular compensation...',
        learningLabel: 'ACQUIRING NATURAL ASYMMETRY',
        progress: 80,
      },
      {
        instruction: 'BLINK',
        subtext: 'Synchronizing ocular reflex closure latency...',
        learningLabel: 'FINALIZING VOLUMETRIC IMITATION MATRIX',
        progress: 100,
      },
    ],
    [],
  );

  useEffect(() => {
    director.setNarrativeState('LEARNING', 0.64);
  }, []);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    promptIndexRef.current = currentPromptIndex;
    setAttemptTimeout(false);
    setGestureAttempt(0);
    setRetryNonce(0);
    gestureFramesRef.current = 0;
  }, [currentPromptIndex]);

  // Evolving system acknowledgments as gestures progress
  const getLearnedMessage = (stepIdx: number): string => {
    switch (stepIdx) {
      case 0:
        return 'Vector registered. Model adapting...';
      case 1:
        return 'Rotational symmetry learned.';
      case 2:
        return 'Affective motor pattern replicated.';
      case 3:
        return 'Geometric drift mapped to subject.';
      case 4:
        return 'Expression matrix synchronized.';
      default:
        return 'Pattern learned. Training model...';
    }
  };

  const finishCurrentStep = (inconclusive: boolean = false) => {
    if (gestureLockedRef.current || phaseRef.current !== 'training') return;
    gestureLockedRef.current = true;
    const index = promptIndexRef.current;

    sessionMemory.recordGestureOutcome(!inconclusive, gestureAttempt > 0);

    const msg = inconclusive ? 'PATTERN INCONCLUSIVE // PARTIAL SAMPLE LOGGED' : getLearnedMessage(index);
    setFlashMessage(msg);
    setPatternLearnedFlash(true);

    if (inconclusive) {
      sound.playWarningPulse();
    } else {
      sound.playAcceptedTick();
    }

    window.setTimeout(() => {
      setPatternLearnedFlash(false);
      if (index + 1 < trainingSteps.length) {
        setCurrentPromptIndex(index + 1);
        gestureLockedRef.current = false;
      } else {
        // Training sequence finished
        sessionMemory.recordTrainingCompletion(true);
        setPhase('completed');
        sound.playScanPulse();

        // Restrained psychological pacing:
        // First show "TRAINING COMPLETE", then transition to "I think I have enough."
        window.setTimeout(() => {
          setCompletionPhrase(true);
          sound.playClick(600);
        }, 1400);

        window.setTimeout(() => {
          onTrainingComplete(!isSimulated && !trackerError);
        }, 3400);
      }
    }, inconclusive ? 900 : 750);
  };

  const evaluateGesture = (signals: FaceSignals) => {
    if (phaseRef.current !== 'training' || gestureLockedRef.current) return;

    const baseline = baselineRef.current;
    const yawDelta = signals.yaw - baseline.yaw;
    const rollDelta = signals.rollDeg - baseline.roll;
    const index = promptIndexRef.current;

    // Condition must hold for at least 3 consecutive frames to discard momentary noise
    const confirm = (condition: boolean, requiredFrames = 3) => {
      gestureFramesRef.current = condition ? gestureFramesRef.current + 1 : 0;
      if (gestureFramesRef.current >= requiredFrames) {
        gestureFramesRef.current = 0;
        finishCurrentStep(false);
        return true;
      }
      return false;
    };

    if (index === 0) {
      // LOOK LEFT: support mirrored video perspective
      if (Math.abs(yawDelta) > 0.052) {
        leftDirectionSignRef.current = Math.sign(yawDelta) || 1;
        confirm(true);
      } else {
        confirm(false);
      }
      return;
    }

    if (index === 1) {
      // LOOK RIGHT: inverse direction
      const leftSign = leftDirectionSignRef.current || 1;
      confirm(yawDelta * leftSign < -0.043);
      return;
    }

    if (index === 2) {
      // SMILE
      const smileThreshold = Math.max(0.30, baseline.smile + 0.18);
      confirm(signals.smile > smileThreshold, 2);
      return;
    }

    if (index === 3) {
      // TILT HEAD
      confirm(Math.abs(rollDelta) > 6.0);
      return;
    }

    if (index === 4) {
      // BLINK
      const blinkThreshold = Math.max(0.46, baseline.blink + 0.30);
      confirm(signals.blink > blinkThreshold, 2);
    }
  };

  // Camera + MediaPipe initialization
  useEffect(() => {
    let cancelled = false;
    let initTimeoutId: number | null = null;

    if (isSimulated) return;

    const initialize = async () => {
      try {
        if (!videoRef.current) return;
        await camera.attach(videoRef.current);

        const tracker = new FaceTracker();
        trackerRef.current = tracker;
        await Promise.race([
          tracker.initialize(),
          new Promise<never>((_, reject) => {
            initTimeoutId = window.setTimeout(
              () => reject(new Error('Local face model initialization timed out.')),
              10000,
            );
          }),
        ]).finally(() => {
          if (initTimeoutId !== null) {
            window.clearTimeout(initTimeoutId);
            initTimeoutId = null;
          }
        });
        if (!cancelled) setPhase('acquiring');
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Face tracking unavailable.';
        setTrackerError(message);
        camera.stop();
        setPhase('acquiring');
      }
    };

    initialize();

    return () => {
      cancelled = true;
      if (initTimeoutId !== null) {
        window.clearTimeout(initTimeoutId);
        initTimeoutId = null;
      }
      trackerRef.current?.close();
      trackerRef.current = null;
    };
  }, [isSimulated]);

  // Simulated fallback mode automatic progression
  useEffect(() => {
    if (!isSimulated && !trackerError) return;

    if (phase === 'acquiring') {
      const timers = [
        window.setTimeout(() => setAcquisitionStep(1), 500),
        window.setTimeout(() => setAcquisitionStep(2), 1100),
        window.setTimeout(() => setAcquisitionStep(3), 1700),
        window.setTimeout(() => setAcquisitionStep(4), 2300),
        window.setTimeout(() => {
          sessionMemory.recordFaceAcquired(true);
          setPhase('training');
        }, 2900),
      ];
      return () => timers.forEach(window.clearTimeout);
    }

    if (phase === 'training') {
      const timer = window.setTimeout(() => finishCurrentStep(false), 2100);
      return () => window.clearTimeout(timer);
    }
  }, [isSimulated, trackerError, phase, currentPromptIndex]);

  // Per-gesture timeout (8 seconds)
  useEffect(() => {
    if (phase !== 'training' || isSimulated || trackerError) return;
    const timer = window.setTimeout(() => {
      setAttemptTimeout(true);
    }, GESTURE_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [phase, currentPromptIndex, isSimulated, trackerError, retryNonce]);

  const retryCurrentGesture = () => {
    setGestureAttempt((attempt) => attempt + 1);
    setAttemptTimeout(false);
    setRetryNonce((nonce) => nonce + 1);
    gestureFramesRef.current = 0;
    sound.playClick(900);
  };

  // If face acquisition stalls, fall back smoothly
  useEffect(() => {
    if (phase !== 'acquiring' || isSimulated || trackerError) return;
    const timer = window.setTimeout(() => {
      setTrackerError('Stable face acquisition timed out.');
      signalsRef.current = null;
      baselineAccumulatorRef.current = { yaw: 0, roll: 0, smile: 0, blink: 0, count: 0 };
    }, ACQUISITION_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [phase, isSimulated, trackerError]);

  // Camera canvas + detection loop (Throttled to 25 FPS inference, 5 FPS telemetry state updates)
  useEffect(() => {
    let animationId = 0;
    let lastInferenceAt = 0;
    let lastTelemetryAt = 0;
    let syntheticTime = 0;
    let isTabVisible = !document.hidden;

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible) {
        cancelAnimationFrame(animationId);
        animationId = requestAnimationFrame(draw);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const drawScanner = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
      const boxX = w * 0.22;
      const boxY = h * 0.14;
      const boxW = w * 0.56;
      const boxH = h * 0.72;
      const len = 20;

      // Clinical reticle corners
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 1.5;
      const corners = [
        [[boxX, boxY + len], [boxX, boxY], [boxX + len, boxY]],
        [[boxX + boxW - len, boxY], [boxX + boxW, boxY], [boxX + boxW, boxY + len]],
        [[boxX, boxY + boxH - len], [boxX, boxY + boxH], [boxX + len, boxY + boxH]],
        [[boxX + boxW - len, boxY + boxH], [boxX + boxW, boxY + boxH], [boxX + boxW, boxY + boxH - len]],
      ];
      corners.forEach((corner) => {
        ctx.beginPath();
        ctx.moveTo(corner[0][0], corner[0][1]);
        ctx.lineTo(corner[1][0], corner[1][1]);
        ctx.lineTo(corner[2][0], corner[2][1]);
        ctx.stroke();
      });

      // Subtle horizontal scan line
      const scanY = (Math.sin(t * 1.6) * 0.5 + 0.5) * h;
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(boxX, scanY);
      ctx.lineTo(boxX + boxW, scanY);
      ctx.stroke();
    };

    const drawSyntheticFace = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
      ctx.fillStyle = '#06080e';
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2 - 10;

      // Outer cranial contour
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 75, 100, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Eye markers
      const eyeTilt = Math.sin(t * 1.8) * 3;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(cx - 28, cy - 15 + eyeTilt, 4.5, 0, Math.PI * 2);
      ctx.arc(cx + 28, cy - 15 - eyeTilt, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Mouth contour
      ctx.beginPath();
      ctx.moveTo(cx - 16, cy + 42);
      ctx.lineTo(cx + 16, cy + 42);
      ctx.stroke();
    };

    const draw = (time: number) => {
      syntheticTime += 0.03;
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;

      // Throttle inference to ~25 FPS (40ms)
      const canRunInference = !isSimulated && trackerRef.current && video && time - lastInferenceAt >= 40;

      if (canRunInference && video.readyState >= 2) {
        lastInferenceAt = time;
        const signals = trackerRef.current.detect(video);
        if (signals) {
          signalsRef.current = signals;
          if (time - lastTelemetryAt >= 200) {
            lastTelemetryAt = time;
            setTelemetry({
              yaw: signals.yaw,
              roll: signals.rollDeg,
              smile: signals.smile,
              blink: signals.blink,
            });
          }

          if (signals.detected) {
            if (phaseRef.current === 'acquiring') {
              const acc = baselineAccumulatorRef.current;
              acc.yaw += signals.yaw;
              acc.roll += signals.rollDeg;
              acc.smile += signals.smile;
              acc.blink += signals.blink;
              acc.count += 1;

              if (acc.count >= CALIBRATION_SAMPLE_COUNT) {
                baselineRef.current = {
                  yaw: acc.yaw / acc.count,
                  roll: acc.roll / acc.count,
                  smile: acc.smile / acc.count,
                  blink: acc.blink / acc.count,
                };
                sessionMemory.recordFaceAcquired(true);
                setAcquisitionStep(4);
                setPhase('training');
                sound.playScanPulse();
              } else if (acc.count >= 18) {
                setAcquisitionStep(3);
              } else if (acc.count >= 9) {
                setAcquisitionStep(2);
              } else {
                setAcquisitionStep(1);
              }
            } else if (phaseRef.current === 'training') {
              evaluateGesture(signals);
            }
          } else if (phaseRef.current === 'acquiring') {
            // Require a continuous stable face sample (~1 sec)
            baselineAccumulatorRef.current = { yaw: 0, roll: 0, smile: 0, blink: 0, count: 0 };
            setAcquisitionStep(0);
          }
        }
      }

      // Draw camera feed or synthetic silhouette
      if (video && video.readyState >= 2 && !isSimulated && !trackerError) {
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, w, h);
        ctx.restore();
      } else {
        drawSyntheticFace(ctx, w, h, syntheticTime);
      }

      // Draw subtle key landmarks
      const currentSignals = signalsRef.current;
      if (currentSignals?.detected && currentSignals.landmarks.length > 0 && !isSimulated && !trackerError) {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.85)';
        for (const idx of LANDMARK_INDICES) {
          const point = currentSignals.landmarks[idx];
          if (!point) continue;
          const x = (1 - point.x) * w;
          const y = point.y * h;
          ctx.beginPath();
          ctx.arc(x, y, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      drawScanner(ctx, w, h, syntheticTime);
      animationId = requestAnimationFrame(draw);
    };

    animationId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animationId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isSimulated, trackerError]);

  const currentStep = trainingSteps[currentPromptIndex];
  const fallbackMode = isSimulated || Boolean(trackerError);

  return (
    <div className="min-h-screen w-full flex flex-col justify-between p-4 sm:p-8 select-none bg-[#020306] text-neutral-300 font-mono">
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />

      {/* Header bar */}
      <div className="border-b border-neutral-800/80 pb-3 flex justify-between items-center text-xs">
        <div>
          <div className="text-neutral-500 tracking-widest uppercase">
            {phase === 'loading'
              ? 'LOADING OPTICAL INFERENCE MODEL'
              : phase === 'acquiring'
                ? 'CALIBRATION // NEUTRAL ACQUISITION'
                : 'TRAINING EXPRESSION MODEL'}
          </div>
          <div className="text-neutral-300 font-bold mt-0.5">
            {phase === 'training' || phase === 'completed'
              ? currentStep.learningLabel
              : 'VOLUMETRIC SURFACE REGISTRATION'}
          </div>
        </div>

        <div className="text-right">
          <span
            className={`font-bold tracking-widest uppercase ${
              fallbackMode ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {fallbackMode
              ? 'SIMULATED OPTICAL MATRIX'
              : phase === 'completed'
                ? 'ACQUISITION 100%'
                : `TRAINING PROGRESS: ${currentStep.progress}%`}
          </span>
        </div>
      </div>

      {/* Center Viewport */}
      <div className="flex-1 flex flex-col items-center justify-center my-4 relative">
        <div className="relative border border-neutral-800 rounded-sm overflow-hidden max-w-lg w-full aspect-[4/3] bg-black shadow-2xl">
          <canvas ref={canvasRef} width={640} height={480} className="w-full h-full object-cover" />

          {/* Flash Feedback */}
          {patternLearnedFlash && (
            <div className="absolute inset-0 bg-emerald-500/10 border-2 border-emerald-400/70 flex items-center justify-center pointer-events-none animate-fadeIn">
              <div className="bg-black/90 px-5 py-2.5 text-emerald-400 font-bold text-xs tracking-[0.2em] border border-emerald-500/50 uppercase">
                {flashMessage}
              </div>
            </div>
          )}

          {/* Bottom Feed HUD Overlay */}
          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end text-[11px] text-neutral-400 pointer-events-none">
            <div className="space-y-0.5 font-mono">
              {phase === 'loading' && <div className="text-neutral-300">LANDMARK MODEL: MOUNTING...</div>}
              {phase === 'acquiring' && (
                <>
                  <div className={acquisitionStep >= 1 ? 'text-white font-bold' : 'text-neutral-600'}>
                    FACE ACQUISITION: {acquisitionStep >= 1 ? 'LOCKED' : 'SEARCHING...'}
                  </div>
                  <div className={acquisitionStep >= 2 ? 'text-emerald-400' : 'text-neutral-600'}>
                    CRANIAL ORIENTATION: {acquisitionStep >= 2 ? 'CALIBRATED' : '...'}
                  </div>
                  <div className={acquisitionStep >= 3 ? 'text-emerald-400' : 'text-neutral-600'}>
                    NEUTRAL POSE: {acquisitionStep >= 3 ? 'RECORDING (~1s)' : '...'}
                  </div>
                </>
              )}
              {(phase === 'training' || phase === 'completed') && (
                <div className="text-emerald-300 font-bold tracking-wider">
                  LEARNING FACIAL KINEMATIC COEFFICIENTS
                </div>
              )}
            </div>

            {!fallbackMode && (
              <div className="text-right text-[9px] text-neutral-500 leading-relaxed font-mono">
                YAW {telemetry.yaw.toFixed(3)}<br />
                ROLL {telemetry.roll.toFixed(1)}°<br />
                SMILE {telemetry.smile.toFixed(2)} / BLINK {telemetry.blink.toFixed(2)}
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Instructions Below Video */}
        <div className="mt-5 text-center max-w-md w-full">
          {phase === 'loading' && (
            <div className="text-xs text-neutral-400 tracking-widest uppercase animate-pulse">
              Mounting local face landmark inference pipeline...
            </div>
          )}

          {phase === 'acquiring' && (
            <div className="space-y-1.5">
              <div className="text-sm text-neutral-200 tracking-widest uppercase animate-pulse font-bold font-mono">
                {fallbackMode
                  ? 'Calibrating synthetic optical profile...'
                  : 'HOLD NEUTRAL EXPRESSION // ACQUIRING BASELINE...'}
              </div>
              <p className="text-xs text-neutral-500">Remain still for 1 second while your face is mapped.</p>
            </div>
          )}

          {phase === 'training' && (
            <div className="space-y-2 animate-fadeIn">
              <h3
                className="text-2xl sm:text-4xl font-black text-white tracking-widest uppercase font-mono"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {currentStep.instruction}
              </h3>
              <p className="text-xs text-neutral-400 tracking-wider">{currentStep.subtext}</p>

              {attemptTimeout && !fallbackMode && (
                <div className="pt-2 space-y-2 animate-fadeIn">
                  <div className="text-[11px] text-amber-400/90 font-mono tracking-wider">
                    {gestureAttempt === 0
                      ? '[ GESTURE NOT DETECTED — RECALIBRATE AND TRY AGAIN ]'
                      : '[ PATTERN INCONCLUSIVE — ADVANCE WITH PARTIAL TELEMETRY ]'}
                  </div>
                  {gestureAttempt === 0 ? (
                    <button
                      onClick={retryCurrentGesture}
                      className="text-[10px] text-neutral-300 hover:text-white border border-neutral-700 bg-neutral-900/90 px-3 py-1.5 uppercase tracking-widest cursor-pointer transition-colors"
                    >
                      RETRY GESTURE
                    </button>
                  ) : (
                    <button
                      onClick={() => finishCurrentStep(true)}
                      className="text-[10px] text-neutral-400 hover:text-white border border-neutral-700 bg-neutral-900/90 px-3 py-1.5 uppercase tracking-widest cursor-pointer transition-colors"
                    >
                      PATTERN INCONCLUSIVE // ADVANCE
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {phase === 'completed' && (
            <div className="space-y-2 animate-fadeIn">
              {!completionPhrase ? (
                <>
                  <div className="text-xl sm:text-2xl font-bold text-emerald-400 tracking-widest uppercase font-mono">
                    TRAINING COMPLETE
                  </div>
                  <p className="text-xs text-neutral-400">
                    {fallbackMode
                      ? 'Synthetic behavioral imitation profile compiled.'
                      : 'Facial kinematic expression patterns successfully logged.'}
                  </p>
                </>
              ) : (
                <div
                  className="text-2xl sm:text-3xl font-extrabold text-white tracking-widest uppercase font-mono animate-fadeIn"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  "I think I have enough."
                </div>
              )}
            </div>
          )}

          {trackerError && (
            <div className="mt-3 text-[10px] text-amber-400/90 border border-amber-500/20 bg-amber-950/20 px-3 py-2">
              LOCAL CAMERA MODEL TIMED OUT // CONTINUING VIA SIMULATED OPTICAL MATRIX
            </div>
          )}
        </div>
      </div>

      {/* Footer Disclaimer */}
      <div className="border-t border-neutral-800/80 pt-3 text-center text-xs text-neutral-600">
        {fallbackMode
          ? 'Synthetic fallback active. No biometric data is interpreted or stored.'
          : 'Landmarks and expression coefficients are computed locally in browser memory.'}
      </div>
    </div>
  );
};
