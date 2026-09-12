import React, { useEffect, useRef, useState } from 'react';
import { SceneState, SessionData, MotorMetrics } from './types';
import { createInitialSession, computeFinalScores } from './scoring/ScoreEngine';
import { sound } from './audio/AudioEngine';
import { camera } from './tracking/CameraManager';

import { HeaderHUD } from './components/HeaderHUD';
import { ScreenOverlay } from './components/ScreenOverlay';
import { PrivacyModal } from './components/PrivacyModal';
import { ErrorBoundary } from './components/ErrorBoundary';

import { LandingScene } from './scenes/LandingScene';
import { BootScene } from './scenes/BootScene';
import { MotorTestScene } from './scenes/MotorTestScene';
import { InstinctTestScene } from './scenes/InstinctTestScene';
import { ObedienceTestScene } from './scenes/ObedienceTestScene';
import { DecisionTestScene } from './scenes/DecisionTestScene';
import { AnalysisScene } from './scenes/AnalysisScene';
import { CameraPermissionScene } from './scenes/CameraPermissionScene';
import { FaceTrainingScene } from './scenes/FaceTrainingScene';
import { MirrorScene } from './scenes/MirrorScene';
import { TwistScene } from './scenes/TwistScene';
import { ResultScene } from './scenes/ResultScene';

export default function App() {
  const [currentScene, setCurrentScene] = useState<SceneState>('LANDING');
  const [session, setSession] = useState<SessionData>(() => createInitialSession());
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [glitchLevel, setGlitchLevel] = useState<'none' | 'minor' | 'medium' | 'critical'>('none');
  const [isPrivacyOpen, setIsPrivacyOpen] = useState<boolean>(false);
  const glitchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (glitchTimerRef.current !== null) window.clearTimeout(glitchTimerRef.current);
      camera.stop();
      sound.stopAmbience(0.05);
    };
  }, []);

  const triggerTemporaryGlitch = (level: 'minor' | 'medium' | 'critical', duration: number = 300) => {
    if (glitchTimerRef.current !== null) window.clearTimeout(glitchTimerRef.current);
    setGlitchLevel(level);
    glitchTimerRef.current = window.setTimeout(() => {
      setGlitchLevel('none');
      glitchTimerRef.current = null;
    }, duration);
  };

  const handleToggleMute = () => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const handleRestart = () => {
    if (glitchTimerRef.current !== null) {
      window.clearTimeout(glitchTimerRef.current);
      glitchTimerRef.current = null;
    }
    sound.stopAmbience(0.1);
    camera.stop();
    const newSession = createInitialSession();
    setSession(newSession);
    setGlitchLevel('none');
    setCurrentScene('LANDING');
  };

  // 1. Landing -> Boot
  const handleStartLanding = () => {
    triggerTemporaryGlitch('minor', 150);
    setCurrentScene('BOOT');
  };

  // 2. Boot -> Motor Test
  const handleBootComplete = () => {
    setCurrentScene('MOTOR_TEST');
  };

  // 3. Motor Test -> Instinct Test
  const handleMotorComplete = (metrics: MotorMetrics) => {
    setSession((prev) => ({
      ...prev,
      motor: metrics,
      motorClicks: 3,
      motorMetrics: metrics,
      motorScore: metrics.score,
    }));
    triggerTemporaryGlitch('minor', 200);
    setCurrentScene('INSTINCT_TEST');
  };

  // 4. Instinct Test -> Obedience Test
  const handleInstinctComplete = (choice: number, reactionMs: number, switches: number) => {
    const instinctScore = Math.max(50, Math.min(98, 95 - Math.floor(reactionMs / 100)));
    setSession((prev) => ({
      ...prev,
      instinct: {
        choice,
        reactionMs,
        switches,
        score: instinctScore,
      },
      instinctChoice: choice,
      instinctReactionMs: reactionMs,
      instinctSwitches: switches,
      instinctScore,
    }));
    triggerTemporaryGlitch('minor', 200);
    setCurrentScene('OBEDIENCE_TEST');
  };

  // 5. Obedience Test -> Decision Test
  const handleObedienceComplete = (moved: boolean, delta: number) => {
    const obedienceScore = moved ? 32 : 85;
    setSession((prev) => ({
      ...prev,
      obedience: {
        moved,
        movementDelta: delta,
        score: obedienceScore,
        instructionViolation: moved,
      },
      obedienceMoved: moved,
      obedienceMovementScore: delta,
      obedienceScore,
    }));
    triggerTemporaryGlitch('minor', 250);
    setCurrentScene('DECISION_TEST');
  };

  // 6. Decision Test -> Analysis
  const handleDecisionComplete = (
    choice: 'HELP' | 'ASK' | 'IGNORE' | 'LEAVE',
    latencyMs: number,
    switches: number
  ) => {
    const decisionScore = Math.max(45, Math.min(95, 92 - Math.floor(latencyMs / 80)));
    setSession((prev) => {
      const updated: SessionData = {
        ...prev,
        decision: {
          choice,
          latencyMs,
          switches,
          score: decisionScore,
        },
        decisionChoice: choice,
        decisionLatencyMs: latencyMs,
        decisionSwitches: switches,
        decisionScore,
      };
      return computeFinalScores(updated);
    });
    setCurrentScene('ANALYSIS');
  };

  // 7. Analysis -> Camera Permission (Glitch interruption)
  const handleGlitchTriggered = () => {
    triggerTemporaryGlitch('medium', 800);
    setCurrentScene('CAMERA_PERMISSION');
  };

  // 8. Camera Permission -> Face Training
  const handleCameraGranted = () => {
    setSession((prev) => ({
      ...prev,
      cameraRequested: true,
      cameraGranted: true,
      cameraSimulated: false,
    }));
    triggerTemporaryGlitch('minor', 200);
    setCurrentScene('FACE_TRAINING');
  };

  const handleSimulateCamera = () => {
    setSession((prev) => ({
      ...prev,
      cameraRequested: true,
      cameraGranted: false,
      cameraSimulated: true,
      faceTrackingMode: 'simulated',
    }));
    triggerTemporaryGlitch('minor', 200);
    setCurrentScene('FACE_TRAINING');
  };

  // 9. Face Training -> Mirror
  const handleTrainingComplete = (usedRealTracking: boolean) => {
    setSession((prev) => ({
      ...prev,
      trainingStepIndex: 5,
      trainingProgress: 100,
      faceTrackingMode: usedRealTracking
        ? 'real'
        : prev.cameraSimulated
          ? 'simulated'
          : 'fallback',
    }));
    triggerTemporaryGlitch('minor', 250);
    setCurrentScene('MIRROR');
  };

  // 10. Mirror -> Twist
  const handleDesyncTriggered = () => {
    triggerTemporaryGlitch('critical', 400);
    setCurrentScene('TWIST');
  };

  // 11. Twist -> Result
  const handleTwistComplete = () => {
    setSession((prev) => computeFinalScores(prev));
    setCurrentScene('RESULT');
  };

  return (
    <ErrorBoundary>
      <div className="relative min-h-screen w-full bg-[#020306] text-neutral-200 overflow-x-hidden select-none">
        {/* Visual CRT and Scanline Filter Overlays */}
        <ScreenOverlay glitchLevel={glitchLevel} />

        {/* Persistent System Header Bar */}
        <HeaderHUD
          currentScene={currentScene}
          subjectId={session.subjectId}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onReset={handleRestart}
          onOpenPrivacy={() => setIsPrivacyOpen(true)}
        />

        {/* Client-Side Privacy Policy Modal */}
        <PrivacyModal
          isOpen={isPrivacyOpen}
          onClose={() => setIsPrivacyOpen(false)}
        />

        {/* Active Scene Routing */}
        <main className="w-full min-h-screen">
          {currentScene === 'LANDING' && (
            <LandingScene onStart={handleStartLanding} />
          )}

          {currentScene === 'BOOT' && (
            <BootScene subjectId={session.subjectId} onComplete={handleBootComplete} />
          )}

          {currentScene === 'MOTOR_TEST' && (
            <MotorTestScene onComplete={handleMotorComplete} />
          )}

          {currentScene === 'INSTINCT_TEST' && (
            <InstinctTestScene seed={session.seed} onComplete={handleInstinctComplete} />
          )}

          {currentScene === 'OBEDIENCE_TEST' && (
            <ObedienceTestScene onComplete={handleObedienceComplete} />
          )}

          {currentScene === 'DECISION_TEST' && (
            <DecisionTestScene onComplete={handleDecisionComplete} />
          )}

          {currentScene === 'ANALYSIS' && (
            <AnalysisScene
              humanityScore={session.humanityScore}
              onGlitchTriggered={handleGlitchTriggered}
            />
          )}

          {currentScene === 'CAMERA_PERMISSION' && (
            <CameraPermissionScene
              onCameraGranted={handleCameraGranted}
              onSimulateCamera={handleSimulateCamera}
            />
          )}

          {currentScene === 'FACE_TRAINING' && (
            <FaceTrainingScene
              isSimulated={session.cameraSimulated}
              onTrainingComplete={handleTrainingComplete}
            />
          )}

          {currentScene === 'MIRROR' && (
            <MirrorScene
              isSimulated={session.cameraSimulated}
              onDesyncTriggered={handleDesyncTriggered}
            />
          )}

          {currentScene === 'TWIST' && (
            <TwistScene onComplete={handleTwistComplete} />
          )}

          {currentScene === 'RESULT' && (
            <ResultScene session={session} onRestart={handleRestart} />
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}
