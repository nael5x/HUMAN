import React, { useEffect, useRef, useState } from 'react';
import { sound } from '../audio/AudioEngine';
import { camera } from '../tracking/CameraManager';
import { director } from '../director/ExperienceDirector';
import { sessionMemory } from '../memory/SessionMemory';
import { hiddenBehaviors } from '../behavior/HiddenBehaviorEvents';
import { FaceTracker } from '../tracking/FaceTracker';
import {
  ActiveElapsedClock,
  FaceMovementInput,
  hasSufficientGenuineMirrorSamples,
  MirrorFrameOutput,
  MirrorReactiveEngine,
} from '../mirror/MirrorReactiveEngine';

interface MirrorSceneProps {
  isSimulated: boolean;
  onDesyncTriggered: () => void;
}

interface BufferedFrame {
  image: ImageData;
  capturedAt: number;
}

function makeFallbackOutputSafe(output: MirrorFrameOutput): MirrorFrameOutput {
  if (output.escalationPhase === 3) {
    return {
      ...output,
      statusLog: `LOCAL FALLBACK BUFFER // DELAY ${Math.round(output.delayMs)}ms`,
      instructionText: output.syncAlert ? 'Observe local replay.' : output.instructionText,
      isProlongedStillness: false,
      isRapidSpike: false,
    };
  }

  if (output.escalationPhase === 4) {
    return {
      ...output,
      statusLog: 'LOCAL REPLAY // BUFFER DISAGREEMENT DETECTED',
      isProlongedStillness: false,
      isRapidSpike: false,
    };
  }

  return {
    ...output,
    isProlongedStillness: false,
    isRapidSpike: false,
  };
}

export const MirrorScene: React.FC<MirrorSceneProps> = ({
  isSimulated,
  onDesyncTriggered,
}) => {
  const [statusMessage, setStatusMessage] = useState<string>('LATENCY: 0ms [CALIBRATED]');
  const [phaseLabel, setPhaseLabel] = useState<string>('MIRROR_STATE: SYNCHRONOUS');
  const [syncAlert, setSyncAlert] = useState<string | null>(null);
  const [instructionText, setInstructionText] = useState<string>(
    'Observe optical reflection. Verify parity with physical motor intention.'
  );
  const [showExitButton, setShowExitButton] = useState<boolean>(false);
  const [exitClicked, setExitClicked] = useState<boolean>(false);
  const [isBlackout, setIsBlackout] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onDesyncTriggeredRef = useRef(onDesyncTriggered);
  onDesyncTriggeredRef.current = onDesyncTriggered;

  useEffect(() => {
    director.setNarrativeState('UNSTABLE', 0.82);
  }, []);

  const handleFakeExit = () => {
    if (exitClicked) return;
    setExitClicked(true);
    sound.playWarningPulse();
    sound.playGlitch(0.18);
    setSyncAlert('TRANSFER IN PROGRESS // SENSOR LOCKED');
    setStatusMessage('TRANSFER IN PROGRESS // CANNOT ABORT');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const scratch = document.createElement('canvas');
    scratch.width = w;
    scratch.height = h;
    const scratchCtx = scratch.getContext('2d');
    if (!scratchCtx) return;

    let animId = 0;
    let cancelled = false;
    let isTabVisible = !document.hidden;
    const activeClock = new ActiveElapsedClock(performance.now(), isTabVisible);

    // Visual behavior and measured behavior deliberately use separate engines.
    // Synthetic samples may animate the fallback engine but can never contaminate
    // the genuine FaceTracker telemetry engine.
    const visualEngine = new MirrorReactiveEngine();
    const measuredEngine = new MirrorReactiveEngine();
    const faceTracker = new FaceTracker();
    let trackerInitialized = false;
    let genuineSampleCount = 0;
    let previousVisualSource: 'SYNTHETIC' | 'FACE_TRACKER' | null = null;
    let lastRealVisualInput: FaceMovementInput | null = null;
    let lastRealDetectionAt = -Infinity;

    let cameraAvailable = !isSimulated;
    if (!isSimulated && videoRef.current) {
      camera
        .attach(videoRef.current)
        .then(() => {
          if (cancelled) {
            camera.stop();
            return;
          }
          return faceTracker
            .initialize()
            .then(() => {
              if (cancelled) {
                faceTracker.close();
                return;
              }
              trackerInitialized = true;
            })
            .catch(() => {
              trackerInitialized = false;
            });
        })
        .catch(() => {
          cameraAvailable = false;
        });
    }

    const frameBuffer: BufferedFrame[] = [];
    const maxBufferFrames = 60;
    const captureIntervalMs = 42;
    let lastCaptureAt = 0;
    let replayFrames: BufferedFrame[] = [];
    let replayCursor = 0;
    let replayDirection = 1;
    let t = 0;

    let lastStatusMsg = 'LATENCY: 0ms [CALIBRATED]';
    let lastPhaseLabel = 'MIRROR_STATE: SYNCHRONOUS';
    let lastSyncAlert: string | null = null;
    let lastInstruction = 'Observe optical reflection. Verify parity with physical motor intention.';
    let lastAnnouncedPhase = 1;
    let exitShown = false;
    let completedSequence = false;
    let blackoutStartedAt: number | null = null;
    let handoffTriggered = false;

    const drawSyntheticMirror = (time: number, drift: { x: number; y: number }) => {
      ctx.fillStyle = '#05070d';
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2 + drift.x;
      const cy = h / 2 - 6 + drift.y;
      const sway = Math.sin(time * 0.9) * 4;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(cx + sway, cy, 66, 88, sway * 0.001, 0, Math.PI * 2);
      ctx.stroke();

      const eyeTilt = Math.sin(time * 1.8) * 2.5;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
      ctx.beginPath();
      ctx.arc(cx - 25 + sway, cy - 13 + eyeTilt, 4.5, 0, Math.PI * 2);
      ctx.arc(cx + 25 + sway, cy - 13 - eyeTilt, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.moveTo(cx - 15 + sway, cy + 37);
      ctx.lineTo(cx + 15 + sway, cy + 37);
      ctx.stroke();
    };

    const drawLiveSource = (drift: { x: number; y: number }) => {
      const video = videoRef.current;
      if (cameraAvailable && video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        ctx.save();
        ctx.translate(w + drift.x, drift.y);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, w, h);
        ctx.restore();
      } else {
        drawSyntheticMirror(t, drift);
      }
    };

    const captureCurrentFrame = (activeNow: number) => {
      if (activeNow - lastCaptureAt < captureIntervalMs) return;
      lastCaptureAt = activeNow;
      frameBuffer.push({ image: ctx.getImageData(0, 0, w, h), capturedAt: activeNow });
      if (frameBuffer.length > maxBufferFrames) frameBuffer.shift();
    };

    const drawFrame = (frame: BufferedFrame, jitterX = 0, scale = 1, offsetY = 0) => {
      scratchCtx.putImageData(frame.image, 0, 0);
      ctx.save();
      ctx.translate(w / 2 + jitterX, h / 2 + offsetY);
      ctx.scale(scale, scale);
      ctx.drawImage(scratch, -w / 2, -h / 2, w, h);
      ctx.restore();
    };

    const findDelayedFrame = (activeNow: number, delayMs: number): BufferedFrame | null => {
      if (frameBuffer.length === 0) return null;
      const target = activeNow - delayMs;
      for (let i = frameBuffer.length - 1; i >= 0; i--) {
        if (frameBuffer[i].capturedAt <= target) return frameBuffer[i];
      }
      return frameBuffer[0];
    };

    const render = (wallNow: number) => {
      if (cancelled || !isTabVisible) return;

      const activeNow = activeClock.elapsed(wallNow);
      const elapsed = activeNow;

      if (completedSequence) {
        if (
          blackoutStartedAt !== null &&
          activeNow - blackoutStartedAt >= 1800 &&
          !handoffTriggered
        ) {
          handoffTriggered = true;
          onDesyncTriggeredRef.current();
          return;
        }
        animId = requestAnimationFrame(render);
        return;
      }

      t += 0.03;

      let realInput: FaceMovementInput | null = null;
      const video = videoRef.current;

      if (
        trackerInitialized &&
        cameraAvailable &&
        video &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      ) {
        try {
          const signals = faceTracker.detect(video);
          if (signals && signals.detected && signals.landmarks.length > 0) {
            const nose = signals.landmarks[1];
            realInput = {
              faceCenterX: nose.x,
              faceCenterY: nose.y,
              yaw: signals.yaw,
              rollDeg: signals.rollDeg,
              timestamp: activeNow,
            };
            lastRealVisualInput = realInput;
            lastRealDetectionAt = activeNow;
          } else if (signals && !signals.detected) {
            lastRealVisualInput = null;
            lastRealDetectionAt = -Infinity;
          }
        } catch {
          realInput = null;
        }
      }

      let measuredOutput: MirrorFrameOutput | null = null;
      if (realInput) {
        genuineSampleCount++;
        measuredOutput = measuredEngine.update(realInput, activeNow, 0);
      }

      // FaceTracker can return null between video frames. Briefly hold the latest
      // genuine pose for visual continuity without counting it as a new measured sample.
      const heldRealVisualInput =
        !realInput && lastRealVisualInput && activeNow - lastRealDetectionAt <= 250
          ? { ...lastRealVisualInput, timestamp: activeNow }
          : null;
      const visualRealInput = realInput ?? heldRealVisualInput;
      const visualSource: 'SYNTHETIC' | 'FACE_TRACKER' = visualRealInput
        ? 'FACE_TRACKER'
        : 'SYNTHETIC';

      if (previousVisualSource !== null && previousVisualSource !== visualSource) {
        // Prevent a source handoff itself from looking like a user velocity spike.
        visualEngine.reset();
      }
      previousVisualSource = visualSource;

      const visualInput =
        visualRealInput ?? visualEngine.generateSyntheticInput(activeNow, elapsed);
      const rawVisualOutput = visualEngine.update(visualInput, activeNow, 0);
      const output = visualRealInput ? rawVisualOutput : makeFallbackOutputSafe(rawVisualOutput);

      if (output.statusLog !== lastStatusMsg) {
        lastStatusMsg = output.statusLog;
        setStatusMessage(output.statusLog);
      }
      if (output.phaseLabel !== lastPhaseLabel) {
        lastPhaseLabel = output.phaseLabel;
        setPhaseLabel(output.phaseLabel);
      }
      if (output.syncAlert !== lastSyncAlert) {
        lastSyncAlert = output.syncAlert;
        setSyncAlert(output.syncAlert);
      }
      if (output.instructionText && output.instructionText !== lastInstruction) {
        lastInstruction = output.instructionText;
        setInstructionText(output.instructionText);
      }

      if (output.escalationPhase !== lastAnnouncedPhase) {
        lastAnnouncedPhase = output.escalationPhase;
        if (output.escalationPhase === 3) {
          sound.playClick(600);
        } else if (output.escalationPhase === 4) {
          sound.playGlitch(0.18);
          sound.playWarningPulse();
          if (!exitShown) {
            exitShown = true;
            setShowExitButton(true);
          }
          hiddenBehaviors.triggerMirrorDesync();
        } else if (output.escalationPhase === 5) {
          sound.playWarningPulse();
        }
      }

      // Only genuine FaceTracker samples may trigger user-behavior whispers.
      if (measuredOutput?.isProlongedStillness) {
        hiddenBehaviors.triggerMirrorProlongedStillness();
      }
      if (measuredOutput?.isRapidSpike) {
        hiddenBehaviors.triggerMirrorRapidMotion();
      }

      drawLiveSource(output.driftOffset);
      captureCurrentFrame(activeNow);

      if (output.escalationPhase >= 4) {
        if (replayFrames.length === 0 && frameBuffer.length > 16) {
          replayFrames = frameBuffer.slice(
            Math.max(0, frameBuffer.length - 34),
            Math.max(1, frameBuffer.length - 6)
          );
          replayCursor = 0;
          replayDirection = 1;
        }

        if (replayFrames.length > 0) {
          const index = Math.max(0, Math.min(replayFrames.length - 1, Math.round(replayCursor)));
          const frame = replayFrames[index];
          const jitter = Math.round(Math.sin(elapsed * 0.016) * 2.0);
          const scale = 1.005 + Math.sin(elapsed * 0.005) * 0.004;
          drawFrame(frame, jitter + output.driftOffset.x, scale, output.driftOffset.y);

          replayCursor += replayDirection * (elapsed > 9000 ? 0.65 : 0.9);
          if (replayCursor >= replayFrames.length - 1) replayDirection = -1;
          if (replayCursor <= 0) replayDirection = 1;

          if (elapsed > 8800) {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.04)';
            ctx.fillRect(0, 0, w, h);
          }
        }
      } else if (output.freezeFrame && frameBuffer.length > 2) {
        const frozen = frameBuffer[frameBuffer.length - 1];
        drawFrame(frozen, 0, 1);
      } else if (output.delayMs > 0 && frameBuffer.length > 2) {
        const delayed = findDelayedFrame(activeNow, output.delayMs);
        if (delayed) {
          const jitter = output.motionState === 'RAPID' ? 2 : 0;
          drawFrame(delayed, jitter + output.driftOffset.x, 1, output.driftOffset.y);
        }
      }

      if (elapsed > 6000) {
        ctx.fillStyle = `rgba(0, 220, 255, ${0.015 + Math.sin(t * 3) * 0.008})`;
        ctx.fillRect(0, Math.round(h * 0.25), w, 1.5);
        ctx.fillStyle = 'rgba(255, 30, 80, 0.02)';
        ctx.fillRect(0, Math.round(h * 0.70), w, 2);
      }

      if (elapsed >= 13200) {
        completedSequence = true;
        blackoutStartedAt = activeNow;
        frameBuffer.length = 0;
        replayFrames.length = 0;
        if (!isSimulated) {
          camera.stop();
          faceTracker.close();
        }
        sound.stopAmbience(0.05);

        if (hasSufficientGenuineMirrorSamples(genuineSampleCount)) {
          sessionMemory.recordMirrorReactionTelemetry(
            {
              ...measuredEngine.getMetrics(),
              sampleCount: genuineSampleCount,
            },
            'FACE_TRACKER'
          );
        }
        sessionMemory.recordMirrorSequenceCompleted(true);
        setIsBlackout(true);

        animId = requestAnimationFrame(render);
        return;
      }

      animId = requestAnimationFrame(render);
    };

    const handleVisibilityChange = () => {
      const now = performance.now();
      isTabVisible = !document.hidden;
      activeClock.setActive(isTabVisible, now);
      cancelAnimationFrame(animId);
      if (isTabVisible && !cancelled) {
        animId = requestAnimationFrame(render);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    if (isTabVisible) {
      animId = requestAnimationFrame(render);
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(animId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      frameBuffer.length = 0;
      replayFrames.length = 0;
      if (!isSimulated) {
        camera.stop();
        faceTracker.close();
      }
    };
  }, [isSimulated]);

  if (isBlackout) {
    return <div className="fixed inset-0 z-50 bg-black" />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-between p-4 sm:p-8 select-none bg-[#010204] text-neutral-300 font-mono">
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />

      <div className="border-b border-neutral-800/60 pb-3 flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between sm:items-center text-xs">
        <div className="text-neutral-500 tracking-widest uppercase">
          OPTICAL REFLECTION // KINEMATIC SYNCHRONIZATION
        </div>
        <div className={syncAlert ? 'text-red-400 font-bold animate-pulse' : 'text-neutral-400'}>
          {phaseLabel}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center my-4 max-w-lg mx-auto w-full">
        <div className="relative border border-neutral-800/80 rounded-sm overflow-hidden w-full aspect-[4/3] bg-black shadow-[0_0_35px_rgba(0,0,0,0.85)]">
          <canvas ref={canvasRef} width={400} height={300} className="w-full h-full object-cover" />

          {syncAlert && (
            <div className="absolute top-3 left-3 right-3 bg-red-950/85 border border-red-500/70 p-2.5 text-center text-[10px] sm:text-xs font-mono font-bold text-red-200 tracking-widest uppercase animate-fadeIn shadow-lg">
              {syncAlert}
            </div>
          )}

          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end gap-3 text-[9px] sm:text-[10px] text-neutral-500 font-mono">
            <span className="truncate">{statusMessage}</span>
            <span className={syncAlert ? 'text-red-400/90 font-bold' : 'text-neutral-600'}>
              {syncAlert ? 'PARITY: CORRUPTED' : 'BUFFER // LOCAL'}
            </span>
          </div>
        </div>

        <div className="mt-5 text-center space-y-3 w-full">
          <p
            className={`text-base sm:text-xl font-bold font-mono tracking-wider transition-all duration-500 ${
              instructionText.includes('Which one')
                ? 'text-red-300'
                : instructionText.includes('Remain still')
                  ? 'text-white font-mono uppercase tracking-[0.2em]'
                  : 'text-neutral-300'
            }`}
          >
            {instructionText}
          </p>

          {showExitButton && (
            <div className="pt-2 animate-fadeIn">
              <button
                id="btn-mirror-exit"
                onClick={handleFakeExit}
                disabled={exitClicked}
                className="px-4 py-2 border border-red-900/60 bg-red-950/20 hover:bg-red-950/50 text-red-400/90 hover:text-red-200 text-xs font-mono tracking-widest uppercase cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exitClicked ? 'TRANSFER IN PROGRESS // DISCONNECT LOCKED' : 'DISCONNECT SENSOR'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-neutral-800/60 pt-3 text-center text-xs text-neutral-600">
        In-memory buffer automatically purges upon sequence termination. No video is recorded.
      </div>
    </div>
  );
};
