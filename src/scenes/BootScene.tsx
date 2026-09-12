import React, { useEffect, useState } from 'react';
import { sound } from '../audio/AudioEngine';

interface BootSceneProps {
  subjectId: string;
  onComplete: () => void;
}

export const BootScene: React.FC<BootSceneProps> = ({ subjectId, onComplete }) => {
  const [lines, setLines] = useState<string[]>([]);
  const [isDetected, setIsDetected] = useState<boolean>(false);

  useEffect(() => {
    const sequence = [
      { text: 'INITIALIZING VERIFICATION PROTOCOL...', delay: 200, sound: 'click' },
      { text: 'Behavior monitor ........ READY', delay: 800, sound: 'click' },
      { text: 'Motor analysis .......... READY', delay: 1400, sound: 'click' },
      { text: 'Response capture ........ READY', delay: 2000, sound: 'click' },
      { text: 'Pattern engine .......... READY', delay: 2600, sound: 'pulse' },
      { text: 'SUBJECT DETECTED', delay: 3300, sound: 'detected' },
    ];

    const timeouts: NodeJS.Timeout[] = [];

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
    }, 4600);
    timeouts.push(completionTimeout);

    return () => {
      timeouts.forEach((t) => clearTimeout(t));
    };
  }, [onComplete]);

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
