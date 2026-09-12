import React from 'react';
import { Volume2, VolumeX, RefreshCw, Shield } from 'lucide-react';
import { SceneState } from '../types';

interface HeaderHUDProps {
  currentScene: SceneState;
  subjectId: string;
  isMuted: boolean;
  onToggleMute: () => void;
  onReset: () => void;
  onOpenPrivacy?: () => void;
}

export const HeaderHUD: React.FC<HeaderHUDProps> = ({
  currentScene,
  subjectId,
  isMuted,
  onToggleMute,
  onReset,
  onOpenPrivacy,
}) => {
  // Hide HUD during intense cinematic blackout/twist
  if (currentScene === 'PRELOAD' || currentScene === 'TWIST') {
    return null;
  }

  if (currentScene === 'LANDING') {
    return (
      <header className="fixed top-4 right-4 z-50 flex items-center gap-3">
        {onOpenPrivacy && (
          <button
            onClick={onOpenPrivacy}
            className="p-2 text-neutral-500 hover:text-neutral-200 transition-colors rounded border border-neutral-800/60 bg-black/40 backdrop-blur-sm cursor-pointer"
            title="Local Privacy Protocol"
            aria-label="Privacy Protocol"
          >
            <Shield className="w-4 h-4" />
          </button>
        )}
        <button
          id="btn-sound-toggle-minimal"
          onClick={onToggleMute}
          className="p-2 text-neutral-500 hover:text-neutral-200 transition-colors rounded border border-neutral-800/60 bg-black/40 backdrop-blur-sm cursor-pointer"
          title={isMuted ? 'Unmute' : 'Mute'}
          aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </header>
    );
  }

  const getStageLabel = () => {
    switch (currentScene) {
      case 'BOOT': return 'INIT_STAGE';
      case 'MOTOR_TEST': return 'SAMPLE_01 [MOTOR]';
      case 'INSTINCT_TEST': return 'SAMPLE_02 [INSTINCT]';
      case 'OBEDIENCE_TEST': return 'SAMPLE_03 [COMPLIANCE]';
      case 'DECISION_TEST': return 'SAMPLE_04 [DECISION]';
      case 'ANALYSIS':
      case 'VERIFIED': return 'EVALUATION';
      case 'CAMERA_PERMISSION':
      case 'FACE_TRAINING': return 'TRAINING [VISUAL]';
      case 'MIRROR':
      case 'DESYNC': return 'MIRROR_ANALYSIS';
      case 'RESULT': return 'FINAL_CLASSIFICATION';
      default: return 'MONITORING';
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 px-4 py-3 sm:px-6 flex items-center justify-between border-b border-neutral-800/40 bg-black/60 backdrop-blur-md text-xs tracking-wider uppercase font-mono">
      <div className="flex items-center gap-3">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-neutral-400 font-semibold tracking-widest">SYS_MONITOR</span>
        <span className="text-neutral-600 hidden sm:inline">|</span>
        <span className="text-neutral-300 hidden sm:inline">{getStageLabel()}</span>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="text-neutral-400 text-[11px] sm:text-xs">
          <span className="text-neutral-600 mr-1.5">ID:</span>
          <span className="text-neutral-200 font-semibold">{subjectId}</span>
        </div>

        <div className="h-4 w-[1px] bg-neutral-800" />

        {onOpenPrivacy && (
          <button
            onClick={onOpenPrivacy}
            className="p-1.5 text-neutral-500 hover:text-neutral-200 transition-colors rounded border border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 cursor-pointer"
            title="Local Privacy Protocol"
            aria-label="Privacy Protocol"
          >
            <Shield className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          id="btn-sound-toggle"
          onClick={onToggleMute}
          className="p-1.5 text-neutral-400 hover:text-neutral-100 transition-colors rounded border border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 cursor-pointer"
          title={isMuted ? 'Unmute sound' : 'Mute sound'}
          aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
        </button>

        <button
          id="btn-reset-session"
          onClick={onReset}
          className="p-1.5 text-neutral-500 hover:text-neutral-200 transition-colors rounded border border-neutral-800 hover:border-neutral-700 bg-neutral-900/40 cursor-pointer"
          title="Restart Verification"
          aria-label="Restart Verification"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
