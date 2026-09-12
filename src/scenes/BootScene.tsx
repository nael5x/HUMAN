import React, { useEffect, useState } from 'react';
import { sound } from '../audio/AudioEngine';
import { userMemory } from '../memory/UserMemory';
import { ChallengePayload } from '../utils/ChallengeMode';
import { hiddenBehaviors } from '../behavior/HiddenBehaviorEvents';

interface BootSceneProps {
  subjectId: string;
  seed: number;
  challenge: ChallengePayload | null;
  onComplete: () => void;
}

export const BootScene: React.FC<BootSceneProps> = ({ subjectId, seed, challenge, onComplete }) => {
  const [lines, setLines] = useState<string[]>([]);
  const [isDetected, setIsDetected] = useState<boolean>(false);

  useEffect(() => {
    // Record visit in local memory
    userMemory.incrementVisitCount();
    const userMem = userMemory.getMemory();
    const isReturning = userMem.visitCount > 1;

    const timeouts: ReturnType<typeof setTimeout>[] = [];

    // Trigger returning whisper if applicable
    if (isReturning) {
      const returningWhisperTimer = setTimeout(() => {
        hiddenBehaviors.triggerReturningWhisper();
      }, 1500);
      timeouts.push(returningWhisperTimer);
    }

    // Build adaptive sequence based on returning history and challenge
    const sequence: { text: string; delay: number; sound: string }[] = [
      { text: 'INITIALIZING VERIFICATION PROTOCOL...', delay: 200, sound: 'click' },
      { text: 'Behavior monitor ........ READY', delay: 700, sound: 'click' },
      { text: 'Motor analysis .......... READY', delay: 1200, sound: 'click' },
      { text: 'Response capture ........ READY', delay: 1700, sound: 'click' },
    ];

    let currentDelay = 2200;

    // Challenge acknowledgement
    if (challenge) {
      sequence.push({
        text: `CHALLENGE KEY VALIDATED // REF: ${challenge.challengerModelId}`,
        delay: currentDelay,
        sound: 'pulse',
      });
      currentDelay += 550;
    }

    // Returning user diagnostic callback
    if (isReturning) {
      let returningLine = 'Subject recognized.';
      if (userMem.previousEnding === 'ANOMALY') {
        returningLine = 'Previous session flagged: BEHAVIORAL ANOMALY.';
      } else if (userMem.previousEnding === 'MACHINE') {
        returningLine = 'Previous session flagged: LOW ORGANIC VARIANCE.';
      } else if (userMem.previousEnding === 'REPLACED') {
        returningLine = 'Previous session flagged: REPLACEMENT RECORDED.';
      } else if (userMem.previousMachineId && Math.abs(seed) % 3 === 0) {
        returningLine = `Prior archetype [${userMem.previousMachineId}] archived.`;
      }

      sequence.push({
        text: returningLine,
        delay: currentDelay,
        sound: 'pulse',
      });
      currentDelay += 600;
    }

    sequence.push(
      { text: 'Pattern engine .......... READY', delay: currentDelay, sound: 'pulse' },
      { text: 'SUBJECT DETECTED', delay: currentDelay + 650, sound: 'detected' }
    );

    const totalDuration = currentDelay + 1700;

    sequence.forEach((item) => {
      const t = setTimeout(() => {
        setLines((prev) => [...prev, item.text]);
        if (item.sound === 'pulse') {
          sound.playScanPulse();
        } else if (item.sound === 'detected') {
          sound.playAcceptedTick();
          setIsDetected(true);
        } else {
          sound.playClick(1000 + Math.random() * 300);
        }
      }, item.delay);
      timeouts.push(t);
    });

    const completionTimeout = setTimeout(() => {
      onComplete();
    }, totalDuration);
    timeouts.push(completionTimeout);

    return () => {
      timeouts.forEach((t) => clearTimeout(t));
    };
  }, [onComplete, challenge, seed]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#020306] p-6 text-neutral-300 font-mono select-none">
      <div className="max-w-xl w-full border border-neutral-800/80 bg-black/60 p-6 sm:p-8 rounded-sm shadow-2xl relative">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3 mb-6 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-neutral-600" />
            <span>TERMINAL // SYS_INITIALIZER</span>
          </div>
          <span>SECURE CHANNEL</span>
        </div>

        {/* Terminal Output */}
        <div className="space-y-3 text-sm sm:text-base leading-relaxed tracking-wide min-h-[220px]">
          {lines.map((line, idx) => {
            const isLast = idx === lines.length - 1;
            const isReady = line.includes('READY');
            const isSubject = line.includes('SUBJECT DETECTED');

            return (
              <div
                key={idx}
                className={`flex items-center justify-between ${
                  isSubject
                    ? 'text-amber-300 font-bold tracking-widest pt-2'
                    : isReady
                    ? 'text-neutral-300'
                    : 'text-neutral-400'
                }`}
              >
                <span>{line}</span>
                {isReady && <span className="text-emerald-400 text-xs">[OK]</span>}
              </div>
            );
          })}

          {isDetected && (
            <div className="mt-4 pt-4 border-t border-neutral-800/60 flex items-center justify-between text-xs text-neutral-400 animate-fadeIn">
              <span>ASSIGNED IDENTIFIER:</span>
              <span className="text-white font-bold tracking-widest text-sm bg-neutral-900/80 px-2.5 py-1 border border-neutral-700">
                {subjectId}
              </span>
            </div>
          )}

          {!isDetected && <div className="terminal-cursor text-neutral-500 text-sm">_</div>}
        </div>
      </div>
    </div>
  );
};
