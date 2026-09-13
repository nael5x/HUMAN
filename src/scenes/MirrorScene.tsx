import React, { useEffect, useRef, useState } from 'react';
import { sound } from '../audio/AudioEngine';
import { camera } from '../tracking/CameraManager';
import { director } from '../director/ExperienceDirector';
import { sessionMemory } from '../memory/SessionMemory';

interface MirrorSceneProps {
  isSimulated: boolean;
  onDesyncTriggered: () => void;
}

interface BufferedFrame {
  image: ImageData;
  capturedAt: number;
}

export const MirrorScene: React.FC<MirrorSceneProps> = ({
  isSimulated,
  onDesyncTriggered,
}) => {
  const [statusMessage, setStatusMessage] = useState<string>('LATENCY: 0ms [CALIBRATED]');
  const [phaseLabel, setPhaseLabel] = useState<string>('MIRROR_STATE: SYNCHRONOUS');
  const [syncAlert, setSyncAlert] = useState<string | null>(null);
  const [instructionText, setInstructionText] = useState<string>('Observe optical reflection. Verify parity with physical motor intention.');
  const [showExitButton, setShowExitButton] = useState<boolean>(false);
  const [exitClicked, setExitClicked] = useState<boolean>(false);
  const [isBlackout, setIsBlackout] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onDesyncTriggeredRef = useRef(onDesyncTriggered);
  onDesyncTriggeredRef.current = onDesyncTriggered;

  useEffect(() => {
    // Elevate tension to UNSTABLE
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
    let animId = 0;
    let cancelled = false;
    let isTabVisible = !document.hidden;

    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      if (isTabVisible && !cancelled) {
        cancelAnimationFrame(animId);
        animId = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

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

    let cameraAvailable = !isSimulated;
    if (!isSimulated && videoRef.current) {
      camera.attach(videoRef.current).catch(() => {
        cameraAvailable = false;
      });
    }

    // Circular rolling buffer: max 60 frames (~2.5s at ~24fps). Memory-conscious, cleaned on unmount.
    const frameBuffer: BufferedFrame[] = [];
    const maxBufferFrames = 60;
    const captureIntervalMs = 42;
    let lastCaptureAt = 0;
    let replayFrames: BufferedFrame[] = [];
    let replayCursor = 0;
    let replayDirection = 1;
    let t = 0;
    const startedAt = performance.now();

    const drawSyntheticMirror = (time: number) => {
      ctx.fillStyle = '#05070d';
      ctx.fillRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2 - 6;
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

    const drawLiveSource = () => {
      const video = videoRef.current;
      if (cameraAvailable && video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, w, h);
        ctx.restore();
      } else {
        drawSyntheticMirror(t);
      }
    };

    const captureCurrentFrame = (now: number) => {
      if (now - lastCaptureAt < captureIntervalMs) return;
      lastCaptureAt = now;
      frameBuffer.push({ image: ctx.getImageData(0, 0, w, h), capturedAt: now });
      if (frameBuffer.length > maxBufferFrames) frameBuffer.shift();
    };

    const drawFrame = (frame: BufferedFrame, jitterX = 0, scale = 1) => {
      scratchCtx.putImageData(frame.image, 0, 0);
      ctx.save();
      ctx.translate(w / 2 + jitterX, h / 2);
      ctx.scale(scale, scale);
      ctx.drawImage(scratch, -w / 2, -h / 2, w, h);
      ctx.restore();
    };

    const findDelayedFrame = (now: number, delayMs: number) => {
      const target = now - delayMs;
      for (let i = frameBuffer.length - 1; i >= 0; i--) {
        if (frameBuffer[i].capturedAt <= target) return frameBuffer[i];
      }
      return frameBuffer[0];
    };

    const render = (now: number) => {
      if (cancelled) return;
      t += 0.03;
      const elapsed = now - startedAt;

      drawLiveSource();
      captureCurrentFrame(now);

      // Stages:
      // 0 - 2000ms: Live (0ms delay)
      // 2000 - 3400ms: Subtle delay (90ms)
      // 3400 - 4800ms: Stutter & increased delay (240ms)
      // 4800 - 6400ms: Noticeable lag (480ms)
      // 6400 - 9000ms: "Remain still" + replay of previous movement
      // 9000 - 12000ms: Reversal / autonomous drift / identity collision
      // 12000ms+: Subject no longer required -> Blackout

      let delayMs = 0;
      let replayMode = false;

      if (elapsed < 2000) {
        delayMs = 0;
      } else if (elapsed < 3400) {
        delayMs = 90;
      } else if (elapsed < 4800) {
        // Stutter: drop every 3rd frame or hold
        delayMs = 240;
      } else if (elapsed < 6400) {
        delayMs = 480;
      } else {
        // Replay of previous movement
        replayMode = true;
      }

      if (replayMode) {
        if (replayFrames.length === 0 && frameBuffer.length > 18) {
          // Clone a previous 1-second segment captured earlier when user was moving
          replayFrames = frameBuffer.slice(
            Math.max(0, frameBuffer.length - 34),
            Math.max(1, frameBuffer.length - 6),
          );
          replayCursor = 0;
          replayDirection = 1;
        }

        if (replayFrames.length > 0) {
          const index = Math.max(0, Math.min(replayFrames.length - 1, Math.round(replayCursor)));
          const frame = replayFrames[index];
          const jitter = Math.round(Math.sin(elapsed * 0.016) * 2.0);
          const scale = 1.005 + Math.sin(elapsed * 0.005) * 0.004;
          drawFrame(frame, jitter, scale);

          // After elapsed > 9000, alternate playback direction and slow down so it looks autonomous
          replayCursor += replayDirection * (elapsed > 9000 ? 0.65 : 0.9);
          if (replayCursor >= replayFrames.length - 1) replayDirection = -1;
          if (replayCursor <= 0) replayDirection = 1;

          // Subtle reddish tinting during identity conflict
          if (elapsed > 8800) {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.04)';
            ctx.fillRect(0, 0, w, h);
          }
        }
      } else if (delayMs > 0 && frameBuffer.length > 2) {
        const delayed = findDelayedFrame(now, delayMs);
        if (delayed) {
          // Stutter effect around 3400-4800ms
          const jitter = elapsed > 3400 && elapsed < 4800 && Math.random() < 0.15 ? 3 : 0;
          drawFrame(delayed, jitter);
        }
      }

      // Minimal scanlines / subtle split bars at high drift
      if (elapsed > 6000) {
        ctx.fillStyle = `rgba(0, 220, 255, ${0.015 + Math.sin(t * 3) * 0.008})`;
        ctx.fillRect(0, Math.round(h * 0.25), w, 1.5);
        ctx.fillStyle = 'rgba(255, 30, 80, 0.02)';
        ctx.fillRect(0, Math.round(h * 0.70), w, 2);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    // Staged progression timeline
    const timers = [
      // 1. First subtle delay
      window.setTimeout(() => {
        setStatusMessage('SYNC DELAY: 90ms // CALIBRATION ACTIVE');
      }, 2100),

      // 2. Stutter
      window.setTimeout(() => {
        setStatusMessage('SYNC DELAY: 240ms // FRAME DROP');
        setPhaseLabel('MIRROR_STATE: FRAME LATENCY');
        sound.playGlitch(0.08);
      }, 3500),

      // 3. Sync Error escalation
      window.setTimeout(() => {
        setSyncAlert('SYNC ERROR // REFLECTION DRIFT DETECTED');
        setStatusMessage('SYNC DELAY: 480ms // BUFFER DRIFT');
        setPhaseLabel('LATENCY ANOMALY DETECTED');
        sound.playWarningPulse();
      }, 4900),

      // 4. "Remain still." moment
      window.setTimeout(() => {
        sessionMemory.recordMirrorStillness(true);
        setInstructionText('Remain still.');
        setStatusMessage('SUBJECT MOTION: ZERO // OBSERVED MOTION: DETECTED');
        sound.playClick(600);
      }, 6400),

      // 5. "Which one of you moved first?"
      window.setTimeout(() => {
        setSyncAlert('IDENTITY CONFLICT // MULTIPLE SIGNALS');
        setPhaseLabel('REPROJECTION SOURCE: UNKNOWN');
        setInstructionText('Which one of you moved first?');
        setShowExitButton(true);
        sound.playGlitch(0.18);
        sound.playWarningPulse();
      }, 8200),

      // 6. Escalation to SUBJECT / MODEL COLLISION
      window.setTimeout(() => {
        setSyncAlert('SUBJECT / MODEL COLLISION');
        setStatusMessage('DISCONNECTING INPUT STREAM...');
      }, 10000),

      // 7. Sudden Cold Notification: "SUBJECT NO LONGER REQUIRED"
      window.setTimeout(() => {
        setSyncAlert('SUBJECT NO LONGER REQUIRED');
        setStatusMessage('TRANSFER COMPLETE');
        setInstructionText('Training complete.');
        sound.playWarningPulse();
      }, 11600),

      // 8. Clean up camera and audio BEFORE blackout
      window.setTimeout(() => {
        cancelAnimationFrame(animId);
        frameBuffer.length = 0;
        replayFrames.length = 0;
        if (!isSimulated) camera.stop();
        sound.stopAmbience(0.05); // Fade to absolute silence
        sessionMemory.recordMirrorSequenceCompleted(true);
        setIsBlackout(true);
      }, 13200),

      // 9. Blackout hold -> Advance to TwistScene
      window.setTimeout(() => {
        if (!cancelled) {
          onDesyncTriggeredRef.current();
        }
      }, 15000),
    ];

    return () => {
      cancelled = true;
      cancelAnimationFrame(animId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      timers.forEach(window.clearTimeout);
      frameBuffer.length = 0;
      replayFrames.length = 0;
      if (!isSimulated) camera.stop();
    };
  }, [isSimulated]);

  if (isBlackout) {
    // Cinematic blackout: pure silence, pure darkness
    return <div className="fixed inset-0 z-50 bg-black" />;
  }

  return (
    <div className="min-h-screen w-full flex flex-col justify-between p-4 sm:p-8 select-none bg-[#010204] text-neutral-300 font-mono">
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />

      {/* Top Header */}
      <div className="border-b border-neutral-800/60 pb-3 flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between sm:items-center text-xs">
        <div className="text-neutral-500 tracking-widest uppercase">
          OPTICAL REFLECTION // KINEMATIC SYNCHRONIZATION
        </div>
        <div className={syncAlert ? 'text-red-400 font-bold animate-pulse' : 'text-neutral-400'}>
          {phaseLabel}
        </div>
      </div>

      {/* Center Viewport */}
      <div className="flex-1 flex flex-col items-center justify-center my-4 max-w-lg mx-auto w-full">
        <div className="relative border border-neutral-800/80 rounded-sm overflow-hidden w-full aspect-[4/3] bg-black shadow-[0_0_35px_rgba(0,0,0,0.85)]">
          <canvas ref={canvasRef} width={400} height={300} className="w-full h-full object-cover" />

          {/* Sync Escalation Alert Banner */}
          {syncAlert && (
            <div className="absolute top-3 left-3 right-3 bg-red-950/85 border border-red-500/70 p-2.5 text-center text-[10px] sm:text-xs font-mono font-bold text-red-200 tracking-widest uppercase animate-fadeIn shadow-lg">
              {syncAlert}
            </div>
          )}

          {/* Bottom HUD inside canvas */}
          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end gap-3 text-[9px] sm:text-[10px] text-neutral-500 font-mono">
            <span className="truncate">{statusMessage}</span>
            <span className={syncAlert ? 'text-red-400/90 font-bold' : 'text-neutral-600'}>
              {syncAlert ? 'PARITY: CORRUPTED' : 'BUFFER // LOCAL'}
            </span>
          </div>
        </div>

        {/* Dynamic Instructional Text / Chilling Dialogue */}
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

          {/* Non-comedic clinical "EXIT" button when desynchronization worsens */}
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

      {/* Footer Info */}
      <div className="border-t border-neutral-800/60 pt-3 text-center text-xs text-neutral-600">
        In-memory buffer automatically purges upon sequence termination. No video is recorded.
      </div>
    </div>
  );
};
