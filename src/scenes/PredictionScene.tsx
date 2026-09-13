import React, { useState, useEffect, useRef } from 'react';
import { sound } from '../audio/AudioEngine';
import { director } from '../director/ExperienceDirector';
import { sessionMemory, PredictionRoundData, PredictionMetrics } from '../memory/SessionMemory';
import { hiddenBehaviors } from '../behavior/HiddenBehaviorEvents';

interface PredictionSceneProps {
  onComplete: (metrics: PredictionMetrics) => void;
}

export const PredictionScene: React.FC<PredictionSceneProps> = ({ onComplete }) => {
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [feedback, setFeedback] = useState<{
    statusText: string;
    subText: string;
    isCorrect: boolean;
  } | null>(null);

  const [finished, setFinished] = useState<boolean>(false);
  const [finalPredictability, setFinalPredictability] = useState<number>(68);

  const roundsDataRef = useRef<PredictionRoundData[]>([]);
  const roundStartTimeRef = useRef<number>(performance.now());
  const roundHoverSwitchesRef = useRef<number>(0);
  const hoveredChoiceRef = useRef<'LEFT' | 'RIGHT' | null>(null);
  const pointerHeadingRef = useRef<'LEFT' | 'RIGHT' | null>(null);
  const secretPredictionRef = useRef<'LEFT' | 'RIGHT'>('LEFT');
  const changedMindRef = useRef<boolean>(false);

  const advanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const completeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    director.setNarrativeState('PREDICTING', 0.45);
    prepareRound(1);
    return () => {
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
      if (completeTimeoutRef.current) clearTimeout(completeTimeoutRef.current);
    };
  }, []);

  const prepareRound = (roundNum: number) => {
    setCurrentRound(roundNum);
    setFeedback(null);
    roundStartTimeRef.current = performance.now();
    roundHoverSwitchesRef.current = 0;
    hoveredChoiceRef.current = null;
    changedMindRef.current = false;

    // Generate initial baseline prediction based on cognitive tendencies:
    // Round 1: Default to slight bias (e.g. RIGHT or based on initial pointer)
    // Round 2: Human tendency to alternate after first round (gambler's fallacy / alternation bias)
    // Round 3: Dependent on round 1 & 2
    let basePred: 'LEFT' | 'RIGHT' = 'LEFT';
    const prevRounds = roundsDataRef.current;

    if (prevRounds.length === 1) {
      // If user picked LEFT in round 1, humans alternate 62% of the time
      basePred = prevRounds[0].chosen === 'LEFT' ? 'RIGHT' : 'LEFT';
    } else if (prevRounds.length === 2) {
      // If user alternated, they often repeat or alternate again
      if (prevRounds[0].chosen !== prevRounds[1].chosen) {
        basePred = prevRounds[1].chosen; // repeat
      } else {
        basePred = prevRounds[1].chosen === 'LEFT' ? 'RIGHT' : 'LEFT'; // alternate
      }
    } else {
      basePred = 'LEFT';
    }

    secretPredictionRef.current = basePred;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (feedback !== null || finished) return;

    // Real-time kinematic prediction refinement:
    const viewportHalf = window.innerWidth / 2;
    const currentSide: 'LEFT' | 'RIGHT' = e.clientX < viewportHalf ? 'LEFT' : 'RIGHT';
    pointerHeadingRef.current = currentSide;

    // If pointer is well into one hemisphere and moving there, update live prediction
    if (Math.abs(e.clientX - viewportHalf) > 80) {
      secretPredictionRef.current = currentSide;
    }
  };

  const handleChoiceHover = (side: 'LEFT' | 'RIGHT') => {
    if (feedback !== null || finished) return;

    if (hoveredChoiceRef.current && hoveredChoiceRef.current !== side) {
      roundHoverSwitchesRef.current++;
      sessionMemory.recordDecisionSwitch();
      // If hovered away from the predicted choice, flag mind change potential
      if (hoveredChoiceRef.current === secretPredictionRef.current) {
        changedMindRef.current = true;
      }
    }
    hoveredChoiceRef.current = side;
    sound.playClick(1000);
  };

  const handleSelect = (chosen: 'LEFT' | 'RIGHT') => {
    if (feedback !== null || finished) return;

    const now = performance.now();
    const latency = Math.round(now - roundStartTimeRef.current);
    const predicted = secretPredictionRef.current;
    const isCorrect = predicted === chosen;

    // Context-sensitive wrong response: did user hover over predicted option then click other?
    const didChangeMind =
      !isCorrect && (changedMindRef.current || roundHoverSwitchesRef.current > 0);

    const roundData: PredictionRoundData = {
      round: currentRound,
      predicted,
      chosen,
      isCorrect,
      changedMind: didChangeMind,
      latencyMs: latency,
      hoverSwitches: roundHoverSwitchesRef.current,
    };
    roundsDataRef.current.push(roundData);

    let statusText = '';
    let subText = '';

    if (isCorrect) {
      sound.playAcceptedTick();
      statusText = 'Prediction confirmed.';
      subText = `Predicted: ${predicted} // Selected: ${chosen}`;
    } else {
      sound.playScanPulse();
      if (didChangeMind) {
        statusText = 'You changed your mind.';
        subText = 'Trajectory recalibration detected prior to commitment.';
      } else {
        statusText = 'Unexpected.';
        subText = `Predicted: ${predicted} // Selected: ${chosen}`;
      }
    }

    setFeedback({
      statusText,
      subText,
      isCorrect,
    });

    if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
    advanceTimeoutRef.current = setTimeout(() => {
      if (currentRound < 3) {
        prepareRound(currentRound + 1);
      } else {
        // Complete all 3 rounds
        finishPredictionStage();
      }
    }, 2200);
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

    // Transparent predictability score calculation:
    // Base on correct predictions (e.g. 1/3 = 54%, 2/3 = 71%, 3/3 = 84%, 0/3 = 42%)
    let baseScore = 64;
    if (correctCount === 3) baseScore = 84;
    else if (correctCount === 2) baseScore = 71;
    else if (correctCount === 1) baseScore = 52;
    else baseScore = 39;

    // Modulate slightly by latency stability
    const totalSwitches = rounds.reduce((sum, r) => sum + r.hoverSwitches, 0);
    const finalScore = Math.max(38, Math.min(88, baseScore - totalSwitches * 3));
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
      onComplete(metrics);
    }, 3800);
  };

  return (
    <div
      onPointerMove={handlePointerMove}
      className="min-h-screen w-full flex flex-col justify-between p-6 sm:p-10 select-none bg-[#020306] text-neutral-300 font-mono"
    >
      {/* Top Header */}
      <div className="border-b border-neutral-800/80 pb-4 flex justify-between items-center">
        <div>
          <div className="text-xs text-neutral-500 tracking-widest uppercase">TEST 06 // INTENT PROJECTION</div>
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
          feedback === null ? (
            <div className="space-y-8 w-full animate-fadeIn">
              <div className="space-y-2">
                <p className="text-xs text-neutral-500 tracking-widest uppercase">
                  THE SYSTEM HAS PREDICTED YOUR NEXT INPUT.
                </p>
                <h3
                  className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  MAKE YOUR CHOICE
                </h3>
              </div>

              {/* Two Option Buttons */}
              <div className="grid grid-cols-2 gap-6 sm:gap-10 max-w-md mx-auto pt-6">
                <button
                  id="predict-left"
                  onPointerEnter={() => handleChoiceHover('LEFT')}
                  onClick={() => handleSelect('LEFT')}
                  className="h-28 sm:h-32 border border-neutral-800 rounded bg-neutral-950/70 hover:border-white hover:bg-neutral-900 transition-all duration-200 flex flex-col items-center justify-center cursor-pointer active:scale-95 group"
                >
                  <span className="text-xl sm:text-2xl font-bold tracking-wider text-neutral-300 group-hover:text-white transition-colors">
                    LEFT
                  </span>
                  <span className="text-[10px] text-neutral-600 group-hover:text-neutral-400 mt-2 tracking-widest uppercase">
                    [01]
                  </span>
                </button>

                <button
                  id="predict-right"
                  onPointerEnter={() => handleChoiceHover('RIGHT')}
                  onClick={() => handleSelect('RIGHT')}
                  className="h-28 sm:h-32 border border-neutral-800 rounded bg-neutral-950/70 hover:border-white hover:bg-neutral-900 transition-all duration-200 flex flex-col items-center justify-center cursor-pointer active:scale-95 group"
                >
                  <span className="text-xl sm:text-2xl font-bold tracking-wider text-neutral-300 group-hover:text-white transition-colors">
                    RIGHT
                  </span>
                  <span className="text-[10px] text-neutral-600 group-hover:text-neutral-400 mt-2 tracking-widest uppercase">
                    [02]
                  </span>
                </button>
              </div>

              <div className="text-[11px] text-neutral-600 tracking-widest">
                VECTOR SCANNING VELOCITY & LATENT REPETITION BIAS
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-md mx-auto animate-fadeIn">
              <div
                className={`text-xl sm:text-2xl font-bold tracking-wider ${
                  feedback.isCorrect ? 'text-emerald-400' : 'text-neutral-200'
                }`}
              >
                "{feedback.statusText}"
              </div>
              <p className="text-xs text-neutral-500 font-mono tracking-wider">{feedback.subText}</p>
            </div>
          )
        ) : (
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
                Cognitive entropy and behavioral variance indexed.
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
        Continuous Bayesian modeling of user choice patterns. Variance is expected and recorded.
      </div>
    </div>
  );
};
