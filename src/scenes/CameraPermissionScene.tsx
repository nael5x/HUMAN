import React, { useState } from 'react';
import { Camera, ShieldCheck } from 'lucide-react';
import { sound } from '../audio/AudioEngine';
import { camera } from '../tracking/CameraManager';

interface CameraPermissionSceneProps {
  onCameraGranted: () => void;
  onSimulateCamera: () => void;
}

export const CameraPermissionScene: React.FC<CameraPermissionSceneProps> = ({
  onCameraGranted,
  onSimulateCamera,
}) => {
  React.useEffect(() => {
    sound.setAmbienceTension(0.62);
  }, []);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnable = async () => {
    sound.playClick(1300);
    setError(null);
    setIsRequesting(true);

    try {
      await camera.start();
      onCameraGranted();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Camera permission was denied or unavailable.';
      setError(message);
      sound.playWarningPulse();
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSimulate = () => {
    sound.playClick(900);
    camera.stop();
    onSimulateCamera();
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between p-6 sm:p-10 select-none bg-[#020306] text-neutral-300 font-mono">
      <div className="border-b border-neutral-800/80 pb-4">
        <div className="text-xs text-neutral-500 tracking-widest uppercase">OPTICAL SENSORY ACQUISITION</div>
        <div className="text-xs text-neutral-600 mt-0.5">LOCAL VOLUMETRIC FEED</div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center my-6 text-center max-w-lg mx-auto w-full">
        <div className="border border-neutral-800 bg-black/70 p-6 sm:p-8 rounded-sm space-y-6 shadow-2xl relative w-full">
          <div className="flex justify-center text-neutral-400">
            <div className="p-3 border border-neutral-800 rounded-full bg-neutral-900/40">
              <Camera className="w-6 h-6 text-neutral-200" />
            </div>
          </div>

          <div className="space-y-2">
            <h2
              className="text-2xl sm:text-3xl font-bold tracking-tight text-white uppercase"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              FINAL VISUAL TEST
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 font-mono leading-relaxed">
              Optical sensory calibration is required for kinematic expression indexing.
            </p>
          </div>

          <div className="p-3.5 border border-neutral-800/80 bg-neutral-950/60 rounded text-left flex items-start gap-3 text-xs text-neutral-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed space-y-1">
              <div>Camera frames are processed locally on your device.</div>
              <div className="text-neutral-500">No video is uploaded or stored.</div>
            </div>
          </div>

          {error && (
            <div className="border border-red-500/30 bg-red-950/20 px-3 py-2 text-left text-[11px] leading-relaxed text-red-300">
              VISUAL SENSOR UNAVAILABLE // {error}
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button
              id="btn-enable-camera"
              onClick={handleEnable}
              disabled={isRequesting}
              className="w-full py-3.5 px-4 bg-white hover:bg-neutral-200 disabled:bg-neutral-700 disabled:text-neutral-400 text-black font-mono font-bold text-sm tracking-[0.2em] transition-all duration-200 cursor-pointer disabled:cursor-wait uppercase shadow-[0_0_15px_rgba(255,255,255,0.15)] active:scale-98"
            >
              {isRequesting ? 'REQUESTING CAMERA...' : 'ENABLE CAMERA'}
            </button>

            <button
              id="btn-continue-without-camera"
              onClick={handleSimulate}
              disabled={isRequesting}
              className="w-full py-3 px-4 border border-neutral-800 hover:border-neutral-600 text-neutral-500 hover:text-neutral-300 font-mono text-xs tracking-wider transition-colors cursor-pointer disabled:cursor-not-allowed uppercase"
            >
              CONTINUE WITHOUT CAMERA
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-800/80 pt-3 text-center text-xs text-neutral-600">
        Camera access requires HTTPS in production. Localhost is supported during development.
      </div>
    </div>
  );
};
