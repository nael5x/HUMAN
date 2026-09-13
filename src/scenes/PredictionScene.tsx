import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sound } from '../audio/AudioEngine';
import { director } from '../director/ExperienceDirector';
import { sessionMemory, PredictionRoundData, PredictionMetrics } from '../memory/SessionMemory';
import { hiddenBehaviors } from '../behavior/HiddenBehaviorEvents';
import {
  SealedPrediction,
  PredictionEngine,
  SealedPredictionManager,
  PredictionEvaluation,
  PredictionSelectionPhase,
  canAcceptPredictionSelection,
} from '../prediction/PredictionEngine';

interface PredictionSceneProps {
  seed?: number;
  onComplete: (metrics: PredictionMetrics) => void;
}

export const PredictionScene: React.FC<PredictionSceneProps> = ({
  seed = 48291,
  onComplete,
}) => {
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [roundPhase, setRoundPhase] = useState<PredictionSelectionPhase>('OBSERVING');
  const [sealedPrediction, setSealedPrediction] = useState<SealedPrediction | null>(null);
  const [userChoice, setUserChoice] = useState<'LEFT' | 'RIGHT' | null>(null);
  const [evaluation, setEvaluation] = useState<PredictionEvaluation | null>(null);

  const [finished, setFinished] = useState<boolean>(false);
  const [finalPredictability, setFinalPredictability] = useState<number>(68);

  const roundsDataRef = useRef<PredictionRoundData[]>([]);
  const roundStartTimeRef = useRef<number>(performance.now());
  const roundHoverSwitchesRef = useRef<number>(0);
  const hoveredChoiceRef = useRef<'LEFT' | 'RIGHT' | null>(null);
  const initialHeadingRef = useRef<'LEFT' | 'RIGHT' | null>(null);
  const initialHoverRef = useRef<'LEFT' | 'RIGHT' | null>(null);
  const changedMindRef = useRef<boolean>(false);
  const choiceWindowStartedAtRef = useRef<number>(performance.now());

  const predictionManagerRef = useRef<SealedPredictionManager>(new SealedPredictionManager());
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const observationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const analysisTimerRef = useRef<NodeJS.Timeout | null>(null);
  const advanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const completeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear all pending timeouts safely
  const clearAllTimers = useCallback(() => {
    if (observationTimerRef.current) clearTimeout(observationTimerRef.current);
    if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current);
    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    if (completeTimeoutRef.current) clearTimeout(completeTimeoutRef.current);
  }, []);

  const commitSealedPrediction = useCallback((roundNum: number) => {
    if (predictionManagerRef.current.isCommittedForRound(roundNum)) return;

    const summary = sessionMemory.getSummary();
    const prediction = predictionManagerRef.current.commit({
      round: roundNum,
      seed,
      sessionSummary: summary,
      priorRounds: roundsDataRef.current,
      initialHeading: initialHeadingRef.current,
      initialHover: initialHoverRef.current,
      observationTimeMs: performance.now() - roundStartTimeRef.current,
    });

    setSealedPrediction(prediction);
    choiceWindowStartedAtRef.current = performance.now();
    setRoundPhase('SEALED');
    sound.playClick(1400);
  }, [seed]);

  const prepareRound = useCallback((roundNum: number) => {
    setCurrentRound(roundNum);
    setRoundPhase('OBSERVING');
    setSealedPrediction(null);
    setUserChoice(null);
    setEvaluation(null);

    roundStartTimeRef.current = performance.now();
    roundHoverSwitchesRef.current = 0;
    hoveredChoiceRef.current = null;
    initialHeadingRef.current = null;
    initialHoverRef.current = null;
    changedMindRef.current = false;

    predictionManagerRef.current.resetForRound();

    // Observation window: silent kinematic sampling before sealing (550ms)
    if (observationTimerRef.current) clearTimeout(observationTimerRef.current);
    observationTimerRef.current = setTimeout(() => {
      commitSealedPrediction(roundNum);
    }, 550);
  }, [commitSealedPrediction]);

  useEffect(() => {
    director.setNarrativeState('PREDICTING', 0.45);
    prepareRound(1);
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers, prepareRound]);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (finished || roundPhase === 'ANALYZING' || roundPhase === 'REVEALED') return;

    const viewportHalf = window.innerWidth / 2;
    const currentSide: 'LEFT' | 'RIGHT' = e.clientX < viewportHalf ? 'LEFT' : 'RIGHT';

    // During the observation window, capture only pre-commitment tendency.
    // The prediction is sealed by the dedicated observation timer, never by the final choice.
    if (roundPhase === 'OBSERVING') {
      initialHeadingRef.current = currentSide;
    }

    // Notice: pointer changes after commitment DO NOT alter the sealed prediction
    sessionMemory.recordPointerMove(e.clientX, e.clientY);
  };

  const handleChoiceHover = (side: 'LEFT' | 'RIGHT') => {
    if (finished || roundPhase === 'ANALYZING' || roundPhase === 'REVEALED') return;

    if (roundPhase === 'OBSERVING') {
      initialHoverRef.current = side;
      return;
    }

    if (hoveredChoiceRef.current && hoveredChoiceRef.current !== side) {
      roundHoverSwitchesRef.current++;
      sessionMemory.recordDecisionSwitch();
      if (sealedPrediction && hoveredChoiceRef.current === sealedPrediction.predictedChoice) {
        changedMindRef.current = true;
      }
    }
    hoveredChoiceRef.current = side;
    sound.playClick(1000);
  };

  const handleSelect = (chosen: 'LEFT' | 'RIGHT') => {
    if (finished) return;

    const sealed = predictionManagerRef.current.getSealed();
    if (!canAcceptPredictionSelection(roundPhase, sealed)) {
      // A choice can never create its own prediction. The visible SEALED state must exist first.
      return;
    }

    const now = performance.now();
    const latency = Math.round(now - choiceWindowStartedAtRef.current);
    setUserChoice(chosen);
    setRoundPhase('ANALYZING');
    sound.playScanPulse();

    // Cinematic tension: brief pause before revealing the sealed prediction
    if (analysisTimerRef.current) clearTimeout(analysisTimerRef.current);
    analysisTimerRef.current = setTimeout(() => {
      const isMindChanged =
        changedMindRef.current || roundHoverSwitchesRef.current > 0;

      const evalResult = PredictionEngine.evaluateOutcome(
        sealed,
        chosen,
        isMindChanged,
        roundHoverSwitchesRef.current
      );

      setEvaluation(evalResult);
      setRoundPhase('REVEALED');

      const roundData: PredictionRoundData = {
        round: currentRound,
        predicted: sealed.predictedChoice,
        chosen,
        isCorrect: evalResult.isCorrect,
        changedMind: isMindChanged && !evalResult.isCorrect,
        latencyMs: latency,
        hoverSwitches: roundHoverSwitchesRef.current,
      };
      roundsDataRef.current.push(roundData);

      // Audio and hidden behaviors feedback
      if (evalResult.isCorrect) {
        sound.playAcceptedTick();
        sessionMemory.recordPredictionOutcome(evalResult.outcome);
        hiddenBehaviors.triggerPredictionMatch(evalResult.outcome === 'EXACT_MATCH');
      } else {
        sound.playWarningPulse();
        sessionMemory.recordPredictionOutcome('FAILURE');
        hiddenBehaviors.triggerPredictionDivergence();
      }

      // Schedule next round or finish
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = setTimeout(() => {
        if (currentRound < 3) {
          prepareRound(currentRound + 1);
        } else {
          finishPredictionStage();
        }
      }, 2400);
    }, 700);
  };

  const finishPredictionStage = () => {
    setFinished(true);
    sound.playAcceptedTick();

    const rounds = roundsDataRef.current;
    const correctCount = rounds.filter((r) => r.isCorrect).length;

    // If user consistently defeated prediction (<= 1 predicted correctly out of 3), trigger secret
    if (correctCount <= 1) {
      hiddenBehaviors.triggerPredictionBreaker();
    }

    // Transparent predictability score calculation
    let baseScore = 64;
    if (correctCount === 3) baseScore = 84;
    else if (correctCount === 2) baseScore = 72;
    else if (correctCount === 1) baseScore = 52;
    else baseScore = 38;

    const totalSwitches = rounds.reduce((sum, r) => sum + r.hoverSwitches, 0);
    const finalScore = Math.max(36, Math.min(90, baseScore - totalSwitches * 3));
    setFinalPredictability(finalScore);

    const metrics: PredictionMetrics = {
      rounds,
      correctCount,
      predictabilityScore: finalScore,
      directionSwitches: totalSwitches,
    };

    sessionMemory.recordPredictionTest(metrics);

    if (completeTimeoutRef.current) clearTimeout(completeTimeoutRef.current);
    completeTimeoutRef.current = setTimeout(() => {
      onCompleteRef.current(metrics);
    }, 3600);
  };

  return (
    <div
      onPointerMove={handlePointerMove}
      className="min-h-screen w-full flex flex-col justify-between p-6 sm:p-10 select-none bg-[#020306] text-neutral-300 font-mono"
    >
      {/* Top Header */}
      <div className="border-b border-neutral-800/80 pb-4 flex justify-between items-center">
        <div>
          <div className="text-xs text-neutral-500 tracking-widest uppercase">
            TEST 06 // INTENT PROJECTION
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
            ANTICIPATION TRIAL
          </h2>
        </div>
        <div className="text-xs text-neutral-400">
          ROUND: <span className="text-emerald-400 font-bold">{currentRound} / 3</span>
        </div>
      </div>

      {/* Center Stage */}
      <div className="flex-1 flex flex-col items-center justify-center my-6 text-center max-w-xl mx-auto w-full">
        {!finished ? (
          <div className="space-y-6 w-full animate-fadeIn">
            {/* Sealed State Indicator */}
            <div className="h-10 flex items-center justify-center">
              {roundPhase === 'OBSERVING' && (
                <div className="text-[11px] text-neutral-500 tracking-[0.2em] uppercase flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-ping" />
                  CALIBRATING KINEMATIC VECTOR...
                </div>
              )}

              {(roundPhase === 'SEALED' || roundPhase === 'ANALYZING') && sealedPrediction && (
                <div className="px-3.5 py-1 bg-neutral-950 border border-neutral-800 rounded text-[10px] text-neutral-400 tracking-[0.2em] uppercase flex items-center gap-2.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>MODEL LOCKED</span>
                  <span className="text-neutral-600">//</span>
                  <span className="text-emerald-400">{sealedPrediction.sealId}</span>
                  <span className="text-neutral-600">//</span>
                  <span>CONFIDENCE: {Math.round(sealedPrediction.confidence * 100)}%</span>
                </div>
              )}

              {roundPhase === 'REVEALED' && sealedPrediction && (
                <div className="text-[11px] text-neutral-500 tracking-[0.2em] uppercase">
                  COMMITMENT ID [{sealedPrediction.sealId}]
                </div>
              )}
            </div>

            {/* Instruction Title */}
            <div className="space-y-2">
              <p className="text-xs text-neutral-500 tracking-widest uppercase">
                {roundPhase === 'ANALYZING'
                  ? 'COMPARING REGISTERED INTENT...'
                  : roundPhase === 'REVEALED'
                    ? 'PREDICTION RESULT'
                    : roundPhase === 'OBSERVING'
                      ? 'MODELING PRE-COMMITMENT VECTOR...'
                      : 'PREDICTION SEALED BEFORE SELECTION.'}
              </p>
              <h3
                className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {roundPhase === 'ANALYZING'
                  ? 'EVALUATING...'
                  : roundPhase === 'REVEALED'
                    ? evaluation?.statusText
                    : roundPhase === 'OBSERVING'
                      ? 'HOLD POSITION'
                      : 'MAKE YOUR CHOICE'}
              </h3>
            </div>

            {/* Choice Buttons or Reveal Card */}
            {roundPhase !== 'REVEALED' ? (
              <div className="space-y-6 pt-2">
                <div className="grid grid-cols-2 gap-6 sm:gap-10 max-w-md mx-auto">
                  <button
                    id="predict-left"
                    disabled={roundPhase !== 'SEALED'}
                    onPointerEnter={() => handleChoiceHover('LEFT')}
                    onClick={() => handleSelect('LEFT')}
                    className={`h-28 sm:h-32 border rounded transition-all duration-200 flex flex-col items-center justify-center cursor-pointer group active:scale-95 ${
                      userChoice === 'LEFT'
                        ? 'border-emerald-400 bg-neutral-900 text-white'
                        : 'border-neutral-800 bg-neutral-950/70 hover:border-white hover:bg-neutral-900 text-neutral-300'
                    } ${roundPhase !== 'SEALED' ? 'cursor-not-allowed opacity-55' : ''}`}
                  >
                    <span className="text-xl sm:text-2xl font-bold tracking-wider group-hover:text-white transition-colors">
                      LEFT
                    </span>
                    <span className="text-[10px] text-neutral-600 group-hover:text-neutral-400 mt-2 tracking-widest uppercase">
                      [VECTOR 01]
                    </span>
                  </button>

                  <button
                    id="predict-right"
                    disabled={roundPhase !== 'SEALED'}
                    onPointerEnter={() => handleChoiceHover('RIGHT')}
                    onClick={() => handleSelect('RIGHT')}
                    className={`h-28 sm:h-32 border rounded transition-all duration-200 flex flex-col items-center justify-center cursor-pointer group active:scale-95 ${
                      userChoice === 'RIGHT'
                        ? 'border-emerald-400 bg-neutral-900 text-white'
                        : 'border-neutral-800 bg-neutral-950/70 hover:border-white hover:bg-neutral-900 text-neutral-300'
                    } ${roundPhase !== 'SEALED' ? 'cursor-not-allowed opacity-55' : ''}`}
                  >
                    <span className="text-xl sm:text-2xl font-bold tracking-wider group-hover:text-white transition-colors">
                      RIGHT
                    </span>
                    <span className="text-[10px] text-neutral-600 group-hover:text-neutral-400 mt-2 tracking-widest uppercase">
                      [VECTOR 02]
                    </span>
                  </button>
                </div>

                <div className="text-[11px] text-neutral-600 tracking-widest uppercase">
                  {roundPhase === 'ANALYZING'
                    ? 'COMPARING SEALED MODEL WITH REGISTERED SELECTION'
                    : roundPhase === 'OBSERVING'
                      ? 'OBSERVING PRE-COMMITMENT POINTER TENDENCY'
                      : 'MODEL LOCKED // FINAL SELECTION ENABLED'}
                </div>
              </div>
            ) : (
              /* Revealed Prediction Comparison Card */
              <div className="space-y-4 max-w-md mx-auto animate-fadeIn pt-2">
                <div className="border border-neutral-800 bg-neutral-950/90 p-5 rounded space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-center border-b border-neutral-800/80 pb-3 font-mono">
                    <div>
                      <div className="text-[10px] text-neutral-500 uppercase tracking-widest">
                        PREDICTED BEFORE CHOICE
                      </div>
                      <div className="text-lg sm:text-xl font-bold text-white mt-0.5">
                        {sealedPrediction?.predictedChoice}
                      </div>
                      <div className="text-[10px] text-emerald-400">
                        CONFIDENCE: {Math.round((sealedPrediction?.confidence ?? 0.7) * 100)}%
                      </div>
                    </div>

                    <div className="border-l border-neutral-800/80 pl-3">
                      <div className="text-[10px] text-neutral-500 uppercase tracking-widest">
                        YOUR SELECTION
                      </div>
                      <div
                        className={`text-lg sm:text-xl font-bold mt-0.5 ${
                          evaluation?.isCorrect ? 'text-emerald-400' : 'text-neutral-300'
                        }`}
                      >
                        {userChoice}
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        {evaluation?.outcome === 'EXACT_MATCH'
                          ? 'DIRECT CONFIRMATION'
                          : evaluation?.outcome === 'NEAR_MATCH'
                            ? 'POST-DELIBERATION'
                            : 'DIVERGENCE'}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-400 font-mono tracking-wide">
                    {evaluation?.subText}
                  </p>

                  {evaluation?.evidenceSummary && (
                    <div className="text-[10px] text-neutral-500 font-mono italic border-t border-neutral-800/60 pt-2">
                      Telemetry Evidence: "{evaluation.evidenceSummary}"
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Final Stage Summary */
          <div className="space-y-6 max-w-md mx-auto animate-fadeIn">
            <div className="text-xs text-neutral-500 tracking-widest uppercase">
              TRIAL 06 SUMMARY COMPLETE
            </div>

            <div className="border border-neutral-800 bg-neutral-950/80 p-6 rounded space-y-4 shadow-xl">
              <div className="text-xs text-neutral-500 tracking-wider uppercase">
                PREDICTIVE PROFILE SYNTHESIS
              </div>
              <div className="text-4xl sm:text-5xl font-mono font-black text-white tracking-tight">
                PREDICTABILITY: <span className="text-emerald-400">{finalPredictability}%</span>
              </div>
              <p className="text-xs text-neutral-400 font-mono">
                Observed choice consistency and interaction variance summarized across sealed trials.
              </p>
            </div>

            <div className="text-emerald-400 font-mono text-sm tracking-widest font-bold flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              ANTICIPATION CALIBRATION STORED
            </div>
          </div>
        )}
      </div>

      {/* Footer Instructions */}
      <div className="border-t border-neutral-800/80 pt-3 text-center text-xs text-neutral-600">
        Deterministic local modeling of measured interaction patterns. Final selection unlocks only after sealing.
      </div>
    </div>
  );
};
