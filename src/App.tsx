import React, { useEffect, useRef, useState } from 'react';
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
import { FaceTrainingScene } from './scenes/FaceTrainingScene';
import { MirrorScene } from './scenes/MirrorScene';
import { TwistScene } from './scenes/TwistScene';
import { MachineReconstructionScene } from './scenes/MachineReconstructionScene';
import { ResultScene } from './scenes/ResultScene';

export default function App() {
  const [currentScene, setCurrentScene] = useState<SceneState>('LANDING');
  const [session, setSession] = useState<SessionData>(() => createInitialSession());
  const [challenge] = useState<ChallengePayload | null>(() => ChallengeProtocol.parseChallengeFromUrl());
  const [isMuted, setIsMuted] = useState<boolean>(() => sound.getMuted());
  const [glitchLevel, setGlitchLevel] = useState<'none' | 'minor' | 'medium' | 'critical'>('none');
  const [isPrivacyOpen, setIsPrivacyOpen] = useState<boolean>(false);
  const [infoTab, setInfoTab] = useState<'privacy' | 'about'>('privacy');
  const glitchTimerRef = useRef<number | null>(null);
  const currentSceneRef = useRef<SceneState>('LANDING');

  useEffect(() => {
    currentSceneRef.current = currentScene;
  }, [currentScene]);

  const goToScene = (next: SceneState) => {
    currentSceneRef.current = next;
    setCurrentScene(next);
  };

  const isCurrentScene = (expected: SceneState) => currentSceneRef.current === expected;

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
    director.reset();
    sessionMemory.reset();
    hiddenBehaviors.reset();
    DynamicNarrative.resetHistory();

    const newSession = createInitialSession();
    setSession(newSession);
    setGlitchLevel('none');
    goToScene('LANDING');
  };

  // 1. Landing -> Boot
  const handleStartLanding = () => {
    if (!isCurrentScene('LANDING')) return;
    director.setNarrativeState('NORMAL', 0.08);
    triggerTemporaryGlitch('minor', 150);
    goToScene('BOOT');
  };

  // 2. Boot -> Motor Test
  const handleBootComplete = () => {
    if (!isCurrentScene('BOOT')) return;
    director.setNarrativeState('OBSERVING', 0.22);
    goToScene('MOTOR_TEST');
  };

  // 3. Motor Test -> Instinct Test
  const handleMotorComplete = (metrics: MotorMetrics) => {
    if (!isCurrentScene('MOTOR_TEST')) return;
    setSession((prev) => ({
      ...prev,
      motor: metrics,
      motorClicks: 3,
      motorMetrics: metrics,
      motorScore: metrics.score,
    }));
    triggerTemporaryGlitch('minor', 200);
    goToScene('INSTINCT_TEST');
  };

  // 4. Instinct Test -> Obedience Test
  const handleInstinctComplete = (choice: number, reactionMs: number, switches: number) => {
    if (!isCurrentScene('INSTINCT_TEST')) return;
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
    goToScene('OBEDIENCE_TEST');
  };

  // 5. Obedience Test -> Decision Test
  const handleObedienceComplete = (moved: boolean, delta: number) => {
    if (!isCurrentScene('OBEDIENCE_TEST')) return;
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
    goToScene('DECISION_TEST');
  };

  // 6. Decision Test -> Memory Test (Milestone 1 Upgrade)
  const handleDecisionComplete = (
    choice: 'HELP' | 'ASK' | 'IGNORE' | 'LEAVE',
    latencyMs: number,
    switches: number
  ) => {
    if (!isCurrentScene('DECISION_TEST')) return;
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
    goToScene('MEMORY_TEST');
  };

  // 7. Memory Test -> Prediction Scene
  const handleMemoryComplete = (_metrics: MemoryTestMetrics) => {
    if (!isCurrentScene('MEMORY_TEST')) return;
    director.setNarrativeState('PREDICTING', 0.45);
    triggerTemporaryGlitch('minor', 250);
    goToScene('PREDICTION');
  };

  // 8. Prediction Scene -> Behavior Reveal
  const handlePredictionComplete = (metrics: PredictionMetrics) => {
    if (!isCurrentScene('PREDICTION')) return;
    setSession((prev) => ({
      ...prev,
      predictabilityScore: metrics.predictabilityScore,
    }));
    triggerTemporaryGlitch('medium', 350);
    goToScene('BEHAVIOR_REVEAL');
  };

  // 9. Behavior Reveal -> Fake Verification (Analysis Scene)
  const handleBehaviorRevealComplete = () => {
    if (!isCurrentScene('BEHAVIOR_REVEAL')) return;
    setSession((prev) => computeFinalScores(prev));
    triggerTemporaryGlitch('minor', 200);
    goToScene('ANALYSIS');
  };

  // 10. Analysis -> Camera Permission (Glitch interruption)
  const handleGlitchTriggered = () => {
    if (!isCurrentScene('ANALYSIS')) return;
    director.setNarrativeState('LEARNING', 0.58);
    triggerTemporaryGlitch('medium', 800);
    goToScene('CAMERA_PERMISSION');
  };

  // 11. Camera Permission -> Face Training
  const handleCameraGranted = () => {
    if (!isCurrentScene('CAMERA_PERMISSION')) return;
    setSession((prev) => ({
      ...prev,
      cameraRequested: true,
      cameraGranted: true,
      cameraSimulated: false,
    }));
    triggerTemporaryGlitch('minor', 200);
    goToScene('FACE_TRAINING');
  };

  const handleSimulateCamera = () => {
    if (!isCurrentScene('CAMERA_PERMISSION')) return;
    setSession((prev) => ({
      ...prev,
      cameraRequested: true,
      cameraGranted: false,
      cameraSimulated: true,
      faceTrackingMode: 'simulated',
    }));
    triggerTemporaryGlitch('minor', 200);
    goToScene('FACE_TRAINING');
  };

  // 12. Face Training -> Mirror
  const handleTrainingComplete = (usedRealTracking: boolean) => {
    if (!isCurrentScene('FACE_TRAINING')) return;
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
    goToScene('MIRROR');
  };

  // 13. Mirror -> Twist
  const handleDesyncTriggered = () => {
    if (!isCurrentScene('MIRROR')) return;
    triggerTemporaryGlitch('critical', 400);
    goToScene('TWIST');
  };

  // 14. Twist -> Machine Reconstruction
  const handleTwistComplete = () => {
    if (!isCurrentScene('TWIST')) return;
    setSession((prev) => computeFinalScores(prev));
    goToScene('RECONSTRUCTION');
  };

  // 15. Reconstruction -> Result
  const handleReconstructionComplete = (updatedSession: SessionData) => {
    if (!isCurrentScene('RECONSTRUCTION')) return;
    setSession(updatedSession);
    goToScene('RESULT');
  };

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
          onOpenPrivacy={() => {
            setInfoTab('privacy');
            setIsPrivacyOpen(true);
          }}
        />

        {/* Client-Side Privacy / About Modal */}
        <PrivacyModal
          isOpen={isPrivacyOpen}
          initialTab={infoTab}
          onClose={() => setIsPrivacyOpen(false)}
        />

        {/* Active Scene Routing */}
        <main className="w-full min-h-screen">
          {currentScene === 'LANDING' && (
            <LandingScene
              challenge={challenge}
              seed={session.seed}
              onStart={handleStartLanding}
              onOpenPrivacy={() => {
                setInfoTab('privacy');
                setIsPrivacyOpen(true);
              }}
              onOpenAbout={() => {
                setInfoTab('about');
                setIsPrivacyOpen(true);
              }}
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
        </main>
      </div>
    </ErrorBoundary>
  );
}
