import React, { useEffect, useMemo, useRef, useState } from 'react';
import { sound } from '../audio/AudioEngine';
import { camera } from '../tracking/CameraManager';
import { FaceTracker, type FaceSignals } from '../tracking/FaceTracker';

interface FaceTrainingSceneProps {
  isSimulated: boolean;
  onTrainingComplete: (usedRealTracking: boolean) => void;
}

interface TrainingPrompt {
  instruction: string;
  subtext: string;
  progress: number;
}

type Phase = 'loading' | 'acquiring' | 'training' | 'completed';

const LANDMARK_INDICES = [10, 33, 263, 1, 61, 291, 234, 454, 152];
const CALIBRATION_SAMPLE_COUNT = 25;
const ACQUISITION_TIMEOUT_MS = 12000;
const GESTURE_TIMEOUT_MS = 8500;

export const FaceTrainingScene: React.FC<FaceTrainingSceneProps> = ({
  isSimulated,
  onTrainingComplete,
}) => {
  const [phase, setPhase] = useState<Phase>(isSimulated ? 'acquiring' : 'loading');
  const [acquisitionStep, setAcquisitionStep] = useState(0);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [patternLearnedFlash, setPatternLearnedFlash] = useState(false);
  const [trackerError, setTrackerError] = useState<string | null>(null);
  const [attemptTimeout, setAttemptTimeout] = useState(false);
  const [gestureAttempt, setGestureAttempt] = useState(0);
  const [retryNonce, setRetryNonce] = useState(0);
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

  const trainingSteps = useMemo<TrainingPrompt[]>(
    () => [
      { instruction: 'LOOK LEFT', subtext: 'Capturing horizontal head rotation vector...', progress: 20 },
      { instruction: 'LOOK RIGHT', subtext: 'Validating inverse rotation symmetry...', progress: 40 },
      { instruction: 'SMILE', subtext: 'Reading bilateral zygomatic curvature...', progress: 60 },
      { instruction: 'TILT YOUR HEAD', subtext: 'Mapping cranial roll angle...', progress: 80 },
      { instruction: 'BLINK', subtext: 'Synchronizing ocular closure timing...', progress: 100 },
    ],
    [],
  );

  useEffect(() => {
    sound.setAmbienceTension(0.7);
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

  const finishCurrentStep = () => {
    if (gestureLockedRef.current || phaseRef.current !== 'training') return;
    gestureLockedRef.current = true;
    setPatternLearnedFlash(true);
    sound.playAcceptedTick();

    window.setTimeout(() => {
      setPatternLearnedFlash(false);
      const index = promptIndexRef.current;
      if (index + 1 < trainingSteps.length) {
        setCurrentPromptIndex(index + 1);
        gestureLockedRef.current = false;
      } else {
        setPhase('completed');
        sound.playScanPulse();
        window.setTimeout(() => {
          onTrainingComplete(!isSimulated && !trackerError);
        }, 1700);
      }
    }, 700);
  };

  const evaluateGesture = (signals: FaceSignals) => {
    if (phaseRef.current !== 'training' || gestureLockedRef.current) return;

    const baseline = baselineRef.current;
    const yawDelta = signals.yaw - baseline.yaw;
    const rollDelta = signals.rollDeg - baseline.roll;
    const index = promptIndexRef.current;

    // Require the signal to remain beyond threshold for a few inference frames.
    // This dramatically reduces one-frame false positives from camera noise.
    const confirm = (condition: boolean, requiredFrames = 3) => {
      gestureFramesRef.current = condition ? gestureFramesRef.current + 1 : 0;
      if (gestureFramesRef.current >= requiredFrames) {
        gestureFramesRef.current = 0;
        finishCurrentStep();
        return true;
      }
      return false;
    };

    if (index === 0) {
      // LOOK LEFT: accept either physical orientation as "left" for mirrored camera,
      // then require the inverse direction for the next instruction.
      if (Math.abs(yawDelta) > 0.052) {
        leftDirectionSignRef.current = Math.sign(yawDelta) || 1;
        confirm(true);
      } else {
        confirm(false);
      }
      return;
    }

    if (index === 1) {
      const leftSign = leftDirectionSignRef.current || 1;
      confirm(yawDelta * leftSign < -0.043);
      return;
    }

    if (index === 2) {
      const smileThreshold = Math.max(0.32, baseline.smile + 0.20);
      confirm(signals.smile > smileThreshold, 2);
      return;
    }

    if (index === 3) {
      confirm(Math.abs(rollDelta) > 6.5);
      return;
    }

    if (index === 4) {
      const blinkThreshold = Math.max(0.48, baseline.blink + 0.32);
      confirm(signals.blink > blinkThreshold, 2);
    }
  };

  // Camera + MediaPipe initialization
  useEffect(() => {
    let cancelled = false;

    if (isSimulated) return;

    const initialize = async () => {
      try {
        if (!videoRef.current) return;
        await camera.attach(videoRef.current);

        const tracker = new FaceTracker();
        trackerRef.current = tracker;
        await Promise.race([
          tracker.initialize(),
          new Promise<never>((_, reject) =>
            window.setTimeout(() => reject(new Error('Local face model loading timed out.')), 10000),
          ),
        ]);
        if (!cancelled) setPhase('acquiring');
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Face tracking could not be initialized.';
        setTrackerError(message);
        setPhase('acquiring');
      }
    };

    initialize();

    return () => {
      cancelled = true;
      trackerRef.current?.close();
      trackerRef.current = null;
    };
  }, [isSimulated]);

  // Simulated fallback mode automatic progression
  useEffect(() => {
    if (!isSimulated && !trackerError) return;

    if (phase === 'acquiring') {
      const timers = [
        window.setTimeout(() => setAcquisitionStep(1), 600),
        window.setTimeout(() => setAcquisitionStep(2), 1200),
        window.setTimeout(() => setAcquisitionStep(3), 1800),
        window.setTimeout(() => setAcquisitionStep(4), 2400),
        window.setTimeout(() => setPhase('training'), 3000),
      ];
      return () => timers.forEach(window.clearTimeout);
    }

    if (phase === 'training') {
      const timer = window.setTimeout(finishCurrentStep, 2200);
      return () => window.clearTimeout(timer);
    }
  }, [isSimulated, trackerError, phase, currentPromptIndex]);

  // Per-gesture timeout (8-10 seconds per Section 50)
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

  // If the local model loads but no stable face can be acquired, continue with an explicit fallback
  // instead of trapping the user indefinitely on the acquisition screen.
  useEffect(() => {
    if (phase !== 'acquiring' || isSimulated || trackerError) return;
    const timer = window.setTimeout(() => {
      setTrackerError('Stable face acquisition timed out.');
      signalsRef.current = null;
      baselineAccumulatorRef.current = { yaw: 0, roll: 0, smile: 0, blink: 0, count: 0 };
    }, ACQUISITION_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [phase, isSimulated, trackerError]);

  // Camera canvas + detection loop (Throttled per Section 41)
  useEffect(() => {
    let animationId = 0;
    let lastInferenceAt = 0;
    let syntheticTime = 0;

    const drawScanner = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
      const boxX = w * 0.22;
      const boxY = h * 0.15;
      const boxW = w * 0.56;
      const boxH = h * 0.7;
      const len = 20;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
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

      const scanY = (Math.sin(t * 1.5) * 0.5 + 0.5) * h;
      ctx.strokeStyle = 'rgba(0, 255, 200, 0.4)';
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
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 75, 100, 0, 0, Math.PI * 2);
      ctx.stroke();

      const eyeTilt = Math.sin(t * 1.8) * 3;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.arc(cx - 28, cy - 15 + eyeTilt, 5, 0, Math.PI * 2);
      ctx.arc(cx + 28, cy - 15 - eyeTilt, 5, 0, Math.PI * 2);
      ctx.fill();

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

      // Throttle MediaPipe inference to ~25 FPS (every 40ms)
      const canRunInference = !isSimulated && trackerRef.current && video && time - lastInferenceAt >= 40;

      if (canRunInference && video.readyState >= 2) {
        lastInferenceAt = time;
        const signals = trackerRef.current.detect(video);
        if (signals) {
          signalsRef.current = signals;
          setTelemetry({
            yaw: signals.yaw,
            roll: signals.rollDeg,
            smile: signals.smile,
            blink: signals.blink,
          });

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
                setAcquisitionStep(4);
                setPhase('training');
                sound.playScanPulse();
              } else if (acc.count >= 17) {
                setAcquisitionStep(3);
              } else if (acc.count >= 8) {
                setAcquisitionStep(2);
              } else {
                setAcquisitionStep(1);
              }
            } else if (phaseRef.current === 'training') {
              evaluateGesture(signals);
            }
          } else if (phaseRef.current === 'acquiring') {
            // Require a continuous neutral-face sample; partial detections separated by dropouts
            // should not be averaged together into a misleading baseline.
            baselineAccumulatorRef.current = { yaw: 0, roll: 0, smile: 0, blink: 0, count: 0 };
            setAcquisitionStep(0);
          }
        }
      }

      if (video && video.readyState >= 2 && !isSimulated && !trackerError) {
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, w, h);
        ctx.restore();
      } else {
        drawSyntheticFace(ctx, w, h, syntheticTime);
      }

      // Draw subtle landmarks
      const currentSignals = signalsRef.current;
      if (currentSignals?.detected && currentSignals.landmarks.length > 0 && !isSimulated && !trackerError) {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.85)';
        for (const idx of LANDMARK_INDICES) {
          const point = currentSignals.landmarks[idx];
          if (!point) continue;
          const x = (1 - point.x) * w;
          const y = point.y * h;
          ctx.beginPath();
          ctx.arc(x, y, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      drawScanner(ctx, w, h, syntheticTime);
      animationId = requestAnimationFrame(draw);
    };

    animationId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationId);
  }, [isSimulated, trackerError]);

  const currentStep = trainingSteps[currentPromptIndex];
  const fallbackMode = isSimulated || Boolean(trackerError);

  return (
    <div className="min-h-screen w-full flex flex-col justify-between p-4 sm:p-8 select-none bg-[#020306] text-neutral-300 font-mono">
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />

      <div className="border-b border-neutral-800/80 pb-3 flex justify-between items-center">
        <div>
          <div className="text-xs text-neutral-500 tracking-widest uppercase">
            {phase === 'loading'
              ? 'LOADING LOCAL VISION MODEL'
              : phase === 'acquiring'
                ? 'ACQUISITION PHASE'
                : 'IMITATION MODEL'}
          </div>
          <div className="text-xs text-neutral-400 font-semibold mt-0.5">
            {phase === 'training' || phase === 'completed'
              ? `IMITATION MODEL: ${phase === 'completed' ? 100 : currentStep.progress}%`
              : 'CALIBRATING OPTICAL STREAM'}
          </div>
        </div>

        <div className="text-right">
          <span className={`text-xs font-bold tracking-widest uppercase ${fallbackMode ? 'text-amber-400' : 'text-emerald-400'}`}>
            {fallbackMode ? 'SIMULATED VISUAL TEST' : phase === 'completed' ? 'SYNTHESIS 100%' : 'LOCAL TRACKING'}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center my-4 relative">
        <div className="relative border border-neutral-800 rounded overflow-hidden max-w-lg w-full aspect-[4/3] bg-black shadow-2xl">
          <canvas ref={canvasRef} width={640} height={480} className="w-full h-full object-cover" />

          {patternLearnedFlash && (
            <div className="absolute inset-0 bg-emerald-500/15 border-2 border-emerald-400/60 flex items-center justify-center pointer-events-none animate-fadeIn">
              <div className="bg-black/90 px-5 py-2.5 text-emerald-400 font-bold text-xs tracking-[0.25em] border border-emerald-500/50">
                Pattern learned. Training model...
              </div>
            </div>
          )}

          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end text-[11px] text-neutral-400 pointer-events-none">
            <div className="space-y-0.5">
              {phase === 'loading' && <div className="text-neutral-300">VISION MODEL: INITIALIZING...</div>}
              {phase === 'acquiring' && (
                <>
                  <div className={acquisitionStep >= 1 ? 'text-white font-bold' : 'text-neutral-600'}>
                    FACE ACQUISITION: {acquisitionStep >= 1 ? 'LOCKED' : 'SEARCHING...'}
                  </div>
                  <div className={acquisitionStep >= 2 ? 'text-emerald-400' : 'text-neutral-600'}>
                    HEAD GEOMETRY: {acquisitionStep >= 2 ? 'OK' : '...'}
                  </div>
                  <div className={acquisitionStep >= 3 ? 'text-emerald-400' : 'text-neutral-600'}>
                    NEUTRAL CALIBRATION: {acquisitionStep >= 3 ? 'OK' : '...'}
                  </div>
                </>
              )}
              {(phase === 'training' || phase === 'completed') && (
                <div className="text-emerald-300 font-bold tracking-wider">LEARNING HUMAN EXPRESSION MATRIX</div>
              )}
            </div>

            {!fallbackMode && (
              <div className="text-right text-[9px] text-neutral-500 leading-relaxed">
                YAW {telemetry.yaw.toFixed(3)}<br />
                ROLL {telemetry.roll.toFixed(1)}°<br />
                SMILE {telemetry.smile.toFixed(2)} / BLINK {telemetry.blink.toFixed(2)}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 text-center max-w-md w-full">
          {phase === 'loading' && (
            <div className="text-xs text-neutral-400 tracking-widest uppercase animate-pulse">
              Loading on-device face landmark model...
            </div>
          )}

          {phase === 'acquiring' && (
            <div className="space-y-2">
              <div className="text-xs text-neutral-300 tracking-widest uppercase animate-pulse font-bold">
                {fallbackMode ? 'Calibrating synthetic optical matrix...' : 'FACE ACQUIRED // CALIBRATING NEUTRAL POSE...'}
              </div>
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
                      : '[ PATTERN INCONCLUSIVE — CONTINUE WITH PARTIAL SAMPLE ]'}
                  </div>
                  {gestureAttempt === 0 ? (
                    <button
                      onClick={retryCurrentGesture}
                      className="text-[10px] text-neutral-300 hover:text-white border border-neutral-700 bg-neutral-900/80 px-3 py-1.5 uppercase tracking-widest cursor-pointer transition-colors"
                    >
                      RETRY GESTURE
                    </button>
                  ) : (
                    <button
                      onClick={finishCurrentStep}
                      className="text-[10px] text-neutral-400 hover:text-white border border-neutral-700 bg-neutral-900/80 px-3 py-1.5 uppercase tracking-widest cursor-pointer transition-colors"
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
              <div className="text-xl sm:text-2xl font-bold text-emerald-400 tracking-widest uppercase font-mono">
                TRAINING COMPLETE
              </div>
              <p className="text-xs text-neutral-400">
                {fallbackMode
                  ? 'Synthetic kinematic profile prepared.'
                  : 'Live facial movement patterns acquired locally.'}
              </p>
            </div>
          )}

          {trackerError && (
            <div className="mt-3 text-[10px] text-amber-400/90 border border-amber-500/20 bg-amber-950/10 px-3 py-2">
              LOCAL TRACKER UNAVAILABLE // USING SIMULATED OPTICAL MATRIX
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-neutral-800/80 pt-3 text-center text-xs text-neutral-600">
        {fallbackMode
          ? 'Synthetic fallback active. No biometric interpretation is performed.'
          : 'Landmarks and expression coefficients are processed locally in browser memory.'}
      </div>
    </div>
  );
};
