import React, { useEffect, useRef, useState } from 'react';
import { sound } from '../audio/AudioEngine';
import { camera } from '../tracking/CameraManager';

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
  const [syncError, setSyncError] = useState<boolean>(false);
  const [phaseLabel, setPhaseLabel] = useState<string>('MIRROR_STATE: SYNCHRONOUS');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let animId = 0;
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    sound.setAmbienceTension(0.9);

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

    // ~2.7s rolling buffer at ~22fps. Kept only in memory and destroyed on exit.
    const frameBuffer: BufferedFrame[] = [];
    const maxBufferFrames = 60;
    const captureIntervalMs = 45;
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

      let delayMs = 0;
      let replayMode = false;

      if (elapsed < 1800) {
        delayMs = 0;
      } else if (elapsed < 3000) {
        delayMs = 70;
      } else if (elapsed < 4300) {
        delayMs = 170;
      } else if (elapsed < 5700) {
        delayMs = 310;
      } else if (elapsed < 7200) {
        delayMs = 520;
      } else {
        replayMode = true;
      }

      if (replayMode) {
        if (replayFrames.length === 0 && frameBuffer.length > 18) {
          // Copy a previous ~1 second movement fragment. The user's live feed keeps being captured,
          // but the screen intentionally shows this old fragment instead.
          replayFrames = frameBuffer.slice(Math.max(0, frameBuffer.length - 32), Math.max(1, frameBuffer.length - 8));
          replayCursor = 0;
          replayDirection = 1;
        }

        if (replayFrames.length > 0) {
          const index = Math.max(0, Math.min(replayFrames.length - 1, Math.round(replayCursor)));
          const frame = replayFrames[index];
          const jitter = Math.round(Math.sin(elapsed * 0.018) * 2.2);
          const scale = 1.006 + Math.sin(elapsed * 0.006) * 0.004;
          drawFrame(frame, jitter, scale);

          // Uneven playback + brief reversal makes the old movement feel autonomous instead of simply delayed.
          replayCursor += replayDirection * (elapsed > 8300 ? 0.62 : 0.85);
          if (replayCursor >= replayFrames.length - 1) replayDirection = -1;
          if (replayCursor <= 1) replayDirection = 1;

          ctx.fillStyle = 'rgba(255, 24, 64, 0.035)';
          ctx.fillRect(0, 0, w, h);
        }
      } else if (delayMs > 0 && frameBuffer.length > 2) {
        const delayed = findDelayedFrame(now, delayMs);
        if (delayed) drawFrame(delayed);
      }

      if (elapsed > 5700) {
        // Very subtle split-channel bars instead of a full-screen cheap glitch.
        ctx.fillStyle = `rgba(0, 220, 255, ${0.018 + Math.sin(t * 4) * 0.008})`;
        ctx.fillRect(0, Math.round(h * 0.22), w, 2);
        ctx.fillStyle = 'rgba(255, 30, 80, 0.025)';
        ctx.fillRect(0, Math.round(h * 0.72), w, 3);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    const timers = [
      window.setTimeout(() => setStatusMessage('SYNC DELAY: 70ms'), 1900),
      window.setTimeout(() => setStatusMessage('SYNC DELAY: 170ms'), 3150),
      window.setTimeout(() => setStatusMessage('SYNC DELAY: 310ms'), 4450),
      window.setTimeout(() => {
        setSyncError(true);
        setPhaseLabel('LATENCY ANOMALY DETECTED');
        setStatusMessage('SYNC DELAY: 520ms // DRIFT INCREASING');
        sound.playWarningPulse();
        sound.playGlitch(0.1);
      }, 5750),
      window.setTimeout(() => {
        setStatusMessage('MIRROR RESPONSE DOES NOT MATCH SUBJECT');
        setPhaseLabel('REPROJECTION SOURCE: UNKNOWN');
        sound.playGlitch(0.16);
      }, 7350),
      window.setTimeout(() => {
        cancelAnimationFrame(animId);
        frameBuffer.length = 0;
        replayFrames.length = 0;
        if (!isSimulated) camera.stop();
        sound.stopAmbience(0.15);
        if (!cancelled) onDesyncTriggered();
      }, 9800),
    ];

    return () => {
      cancelled = true;
      cancelAnimationFrame(animId);
      timers.forEach(window.clearTimeout);
      frameBuffer.length = 0;
      replayFrames.length = 0;
    };
  }, [isSimulated, onDesyncTriggered]);

  return (
    <div className="min-h-screen w-full flex flex-col justify-between p-4 sm:p-8 select-none bg-[#010204] text-neutral-300 font-mono">
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />

      <div className="border-b border-neutral-800/60 pb-3 flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between sm:items-center text-xs">
        <div className="text-neutral-500 tracking-widest uppercase">OPTICAL REFLECTION // CALIBRATION</div>
        <div className={syncError ? 'text-red-400 font-bold animate-pulse' : 'text-neutral-400'}>
          {phaseLabel}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center my-4">
        <div className="relative border border-neutral-800/80 rounded-sm overflow-hidden max-w-lg w-full aspect-[4/3] bg-black shadow-[0_0_35px_rgba(0,0,0,0.85)]">
          <canvas ref={canvasRef} width={400} height={300} className="w-full h-full object-cover" />

          {syncError && (
            <div className="absolute top-3 left-3 right-3 bg-red-950/75 border border-red-500/60 p-2 text-center text-[10px] sm:text-xs font-mono font-bold text-red-300 tracking-widest uppercase animate-fadeIn">
              SYNC ERROR // REFLECTION PARITY LOST
            </div>
          )}

          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end gap-3 text-[9px] sm:text-[10px] text-neutral-500 font-mono">
            <span>{statusMessage}</span>
            <span className={syncError ? 'text-red-400/80' : 'text-neutral-600'}>{syncError ? 'BUFFER // UNSTABLE' : 'BUFFER // LOCAL'}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-800/60 pt-3 text-center text-xs text-neutral-600">
        Observe optical reflection. Verify parity with physical motor intention.
      </div>
    </div>
  );
};
