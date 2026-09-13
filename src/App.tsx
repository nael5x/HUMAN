import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SceneState, SessionData, MotorMetrics } from './types';
import { createInitialSession, computeFinalScores } from './scoring/ScoreEngine';
import { sound } from './audio/AudioEngine';
import { camera } from './tracking/CameraManager';
import { director } from './director/ExperienceDirector';
import { sessionMemory, MemoryTestMetrics, PredictionMetrics } from './memory/SessionMemory';
import { hiddenBehaviors } from './behavior/HiddenBehaviorEvents';
import { DynamicNarrative } from './behavior/DynamicNarrative';
import { ChallengeProtocol, ChallengePayload } from './utils/ChallengeMode';

import { HeaderHUD } from './components/HeaderHUD';
import { ScreenOverlay } from './components/ScreenOverlay';
import { PrivacyModal } from './components/PrivacyModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ClinicalWhisper } from './components/ClinicalWhisper';

import { LandingScene } from './scenes/LandingScene';
import { BootScene } from './scenes/BootScene';
import { MotorTestScene } from './scenes/MotorTestScene';
import { InstinctTestScene } from './scenes/InstinctTestScene';
import { ObedienceTestScene } from './scenes/ObedienceTestScene';
import { DecisionTestScene } from './scenes/DecisionTestScene';
import { MemoryTestScene } from './scenes/MemoryTestScene';
import { PredictionScene } from './scenes/PredictionScene';
import { BehaviorRevealScene } from './scenes/BehaviorRevealScene';
import { AnalysisScene } from './scenes/AnalysisScene';
import { CameraPermissionScene } from './scenes/CameraPermissionScene';
import { TwistScene } from './scenes/TwistScene';

// Heavy late-stage scenes loaded asynchronously to keep initial landing bundle light
const FaceTrainingScene = React.lazy(() =>
  import('./scenes/FaceTrainingScene').then((m) => ({ default: m.FaceTrainingScene })),
);
const MirrorScene = React.lazy(() =>
  import('./scenes/MirrorScene').then((m) => ({ default: m.MirrorScene })),
);
const MachineReconstructionScene = React.lazy(() =>
  import('./scenes/MachineReconstructionScene').then((m) => ({
    default: m.MachineReconstructionScene,
  })),
);
const ResultScene = React.lazy(() =>
  import('./scenes/ResultScene').then((m) => ({ default: m.ResultScene })),
);

// Cinematic in-world fallback matching dark CRT / terminal aesthetic without layout shift
const SceneSuspenseFallback: React.FC = () => (
  <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#020306] text-neutral-400 font-mono select-none">
    <div className="space-y-3 text-center animate-pulse">
      <div className="text-[11px] tracking-[0.3em] text-neutral-500 uppercase">
        SYSTEM BUFFER // MOUNTING SUBSYSTEM
      </div>
      <div className="text-sm font-bold text-neutral-300 tracking-widest uppercase">
        SYNCHRONIZING ENVIRONMENT...
      </div>
    </div>
  </div>
);

export default function App() {
  const [currentScene, setCurrentScene] = useState<SceneState>('LANDING');
  const [session, setSession] = useState<SessionData>(() => createInitialSession());
  const [challenge] = useState<ChallengePayload | null>(() => ChallengeProtocol.parseChallengeFromUrl());
  const [isMuted, setIsMuted] = useState<boolean>(() => sound.getMuted());
  const [glitchLevel, setGlitchLevel] = useState<'none' | 'minor' | 'medium' | 'critical'>('none');
  const [isPrivacyOpen, setIsPrivacyOpen] = useState<boolean>(false);
  const [infoTab, setInfoTab] = useState<'privacy' | 'about'>('privacy');
  const glitchTimerRef = useRef<number | null>(null);

  // Scene state ref to ensure callbacks are idempotent and guard against stale scene executions
  const currentSceneRef = useRef<SceneState>(currentScene);
  currentSceneRef.current = currentScene;

  // Sync hidden behaviors watcher with current scene
  useEffect(() => {
    hiddenBehaviors.setScene(currentScene);
  }, [currentScene]);

  // Visibility change handling for tab switching
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        sound.stopAmbience(0.2);
      } else {
        if (!sound.getMuted()) {
          sound.startAmbience();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (glitchTimerRef.current !== null) window.clearTimeout(glitchTimerRef.current);
      camera.stop();
      sound.stopAmbience(0.05);
    };
  }, []);

  const triggerTemporaryGlitch = useCallback((level: 'minor' | 'medium' | 'critical', duration: number = 300) => {
    if (glitchTimerRef.current !== null) window.clearTimeout(glitchTimerRef.current);
    setGlitchLevel(level);
    glitchTimerRef.current = window.setTimeout(() => {
      setGlitchLevel('none');
      glitchTimerRef.current = null;
    }, duration);
  }, []);

  const handleToggleMute = useCallback(() => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  }, []);

  const handleRestart = useCallback(() => {
    currentSceneRef.current = 'LANDING';
    if (glitchTimerRef.current !== null) {
      window.clearTimeout(glitchTimerRef.current);
      glitchTimerRef.current = null;
    }
    sound.stopAmbience(0.1);
    camera.stop();
    director.reset();
    sessionMemory.reset();
    hiddenBehaviors.reset();
    DynamicNarrative.resetHistory();

    const newSession = createInitialSession();
    setSession(newSession);
    setGlitchLevel('none');
    setCurrentScene('LANDING');
  }, []);

  // 1. Landing -> Boot
  const handleStartLanding = useCallback(() => {
    if (currentSceneRef.current !== 'LANDING') return;
    director.setNarrativeState('NORMAL', 0.08);
    triggerTemporaryGlitch('minor', 150);
    setCurrentScene('BOOT');
  }, [triggerTemporaryGlitch]);

  // 2. Boot -> Motor Test
  const handleBootComplete = useCallback(() => {
    if (currentSceneRef.current !== 'BOOT') return;
    director.setNarrativeState('OBSERVING', 0.22);
    setCurrentScene('MOTOR_TEST');
  }, []);

  // 3. Motor Test -> Instinct Test
  const handleMotorComplete = useCallback((metrics: MotorMetrics) => {
    if (currentSceneRef.current !== 'MOTOR_TEST') return;
    setSession((prev) => ({
      ...prev,
      motor: metrics,
      motorClicks: 3,
      motorMetrics: metrics,
      motorScore: metrics.score,
    }));
    triggerTemporaryGlitch('minor', 200);
    setCurrentScene('INSTINCT_TEST');
  }, [triggerTemporaryGlitch]);

  // 4. Instinct Test -> Obedience Test
  const handleInstinctComplete = useCallback((choice: number, reactionMs: number, switches: number) => {
    if (currentSceneRef.current !== 'INSTINCT_TEST') return;
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
  }, [triggerTemporaryGlitch]);

  // 5. Obedience Test -> Decision Test
  const handleObedienceComplete = useCallback((moved: boolean, delta: number) => {
    if (currentSceneRef.current !== 'OBEDIENCE_TEST') return;
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
  }, [triggerTemporaryGlitch]);

  // 6. Decision Test -> Memory Test (Milestone 1 Upgrade)
  const handleDecisionComplete = useCallback((
    choice: 'HELP' | 'ASK' | 'IGNORE' | 'LEAVE',
    latencyMs: number,
    switches: number
  ) => {
    if (currentSceneRef.current !== 'DECISION_TEST') return;
    const decisionScore = Math.max(45, Math.min(95, 92 - Math.floor(latencyMs / 80)));
    setSession((prev) => ({
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
    }));
    triggerTemporaryGlitch('minor', 200);
    setCurrentScene('MEMORY_TEST');
  }, [triggerTemporaryGlitch]);

  // 7. Memory Test -> Prediction Scene
  const handleMemoryComplete = useCallback((_metrics: MemoryTestMetrics) => {
    if (currentSceneRef.current !== 'MEMORY_TEST') return;
    director.setNarrativeState('PREDICTING', 0.45);
    triggerTemporaryGlitch('minor', 250);
    setCurrentScene('PREDICTION');
  }, [triggerTemporaryGlitch]);

  // 8. Prediction Scene -> Behavior Reveal
  const handlePredictionComplete = useCallback((metrics: PredictionMetrics) => {
    if (currentSceneRef.current !== 'PREDICTION') return;
    setSession((prev) => ({
      ...prev,
      predictabilityScore: metrics.predictabilityScore,
    }));
    triggerTemporaryGlitch('medium', 350);
    setCurrentScene('BEHAVIOR_REVEAL');
  }, [triggerTemporaryGlitch]);

  // 9. Behavior Reveal -> Fake Verification (Analysis Scene)
  const handleBehaviorRevealComplete = useCallback(() => {
    if (currentSceneRef.current !== 'BEHAVIOR_REVEAL') return;
    setSession((prev) => computeFinalScores(prev));
    triggerTemporaryGlitch('minor', 200);
    setCurrentScene('ANALYSIS');
  }, [triggerTemporaryGlitch]);

  // 10. Analysis -> Camera Permission (Glitch interruption)
  const handleGlitchTriggered = useCallback(() => {
    if (currentSceneRef.current !== 'ANALYSIS') return;
    director.setNarrativeState('LEARNING', 0.58);
    triggerTemporaryGlitch('medium', 800);
    setCurrentScene('CAMERA_PERMISSION');
  }, [triggerTemporaryGlitch]);

  // 11. Camera Permission -> Face Training
  const handleCameraGranted = useCallback(() => {
    if (currentSceneRef.current !== 'CAMERA_PERMISSION') return;
    setSession((prev) => ({
      ...prev,
      cameraRequested: true,
      cameraGranted: true,
      cameraSimulated: false,
    }));
    triggerTemporaryGlitch('minor', 200);
    setCurrentScene('FACE_TRAINING');
  }, [triggerTemporaryGlitch]);

  const handleSimulateCamera = useCallback(() => {
    if (currentSceneRef.current !== 'CAMERA_PERMISSION') return;
    setSession((prev) => ({
      ...prev,
      cameraRequested: true,
      cameraGranted: false,
      cameraSimulated: true,
      faceTrackingMode: 'simulated',
    }));
    triggerTemporaryGlitch('minor', 200);
    setCurrentScene('FACE_TRAINING');
  }, [triggerTemporaryGlitch]);

  // 12. Face Training -> Mirror
  const handleTrainingComplete = useCallback((usedRealTracking: boolean) => {
    if (currentSceneRef.current !== 'FACE_TRAINING') return;
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
  }, [triggerTemporaryGlitch]);

  // 13. Mirror -> Twist
  const handleDesyncTriggered = useCallback(() => {
    if (currentSceneRef.current !== 'MIRROR') return;
    triggerTemporaryGlitch('critical', 400);
    setCurrentScene('TWIST');
  }, [triggerTemporaryGlitch]);

  // 14. Twist -> Machine Reconstruction
  const handleTwistComplete = useCallback(() => {
    if (currentSceneRef.current !== 'TWIST') return;
    setSession((prev) => computeFinalScores(prev));
    setCurrentScene('RECONSTRUCTION');
  }, []);

  // 15. Reconstruction -> Result
  const handleReconstructionComplete = useCallback((updatedSession: SessionData) => {
    if (currentSceneRef.current !== 'RECONSTRUCTION') return;
    setSession(updatedSession);
    setCurrentScene('RESULT');
  }, []);

  const handleOpenPrivacy = useCallback(() => {
    setInfoTab('privacy');
    setIsPrivacyOpen(true);
  }, []);

  const handleOpenAbout = useCallback(() => {
    setInfoTab('about');
    setIsPrivacyOpen(true);
  }, []);

  const handleClosePrivacy = useCallback(() => {
    setIsPrivacyOpen(false);
  }, []);

  return (
    <ErrorBoundary>
      <div className="relative min-h-screen w-full bg-[#020306] text-neutral-200 overflow-x-hidden select-none">
        {/* Visual CRT and Scanline Filter Overlays */}
        <ScreenOverlay glitchLevel={glitchLevel} />

        {/* Clinical Whispers (Sparse Hidden Reactions & Secrets) */}
        <ClinicalWhisper />

        {/* Persistent System Header Bar */}
        <HeaderHUD
          currentScene={currentScene}
          subjectId={session.subjectId}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onReset={handleRestart}
          onOpenPrivacy={handleOpenPrivacy}
        />

        {/* Client-Side Privacy / About Modal */}
        <PrivacyModal
          isOpen={isPrivacyOpen}
          initialTab={infoTab}
          onClose={handleClosePrivacy}
        />

        {/* Active Scene Routing */}
        <main className="w-full min-h-screen">
          {currentScene === 'LANDING' && (
            <LandingScene
              challenge={challenge}
              seed={session.seed}
              onStart={handleStartLanding}
              onOpenPrivacy={handleOpenPrivacy}
              onOpenAbout={handleOpenAbout}
            />
          )}

          {currentScene === 'BOOT' && (
            <BootScene
              subjectId={session.subjectId}
              seed={session.seed}
              challenge={challenge}
              onComplete={handleBootComplete}
            />
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
            <DecisionTestScene seed={session.seed} onComplete={handleDecisionComplete} />
          )}

          {currentScene === 'MEMORY_TEST' && (
            <MemoryTestScene seed={session.seed} onComplete={handleMemoryComplete} />
          )}

          {currentScene === 'PREDICTION' && (
            <PredictionScene onComplete={handlePredictionComplete} />
          )}

          {currentScene === 'BEHAVIOR_REVEAL' && (
            <BehaviorRevealScene onComplete={handleBehaviorRevealComplete} />
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

          <React.Suspense fallback={<SceneSuspenseFallback />}>
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

            {currentScene === 'RECONSTRUCTION' && (
              <MachineReconstructionScene
                session={session}
                onReconstructionComplete={handleReconstructionComplete}
              />
            )}

            {currentScene === 'RESULT' && (
              <ResultScene
                session={session}
                challenge={challenge}
                onRestart={handleRestart}
              />
            )}
          </React.Suspense>
        </main>
      </div>
    </ErrorBoundary>
  );
}
