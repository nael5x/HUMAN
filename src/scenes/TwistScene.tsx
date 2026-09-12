import React, { useState, useEffect } from 'react';
import { sound } from '../audio/AudioEngine';

interface TwistSceneProps {
  onComplete: () => void;
}

export const TwistScene: React.FC<TwistSceneProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<number>(0);

  useEffect(() => {
    // Cut all audio into absolute silence
    sound.stopAmbience(0.05);

    // Sequence of the climactic twist
    const t1 = setTimeout(() => {
      setStage(1); // "You were human."
      sound.playClick(350);
    }, 1800);

    const t2 = setTimeout(() => {
      setStage(2); // Fade out to darkness
    }, 4200);

    const t3 = setTimeout(() => {
      setStage(3); // "I just needed to learn how."
      sound.playSubDrop();
    }, 5400);

    const t4 = setTimeout(() => {
      setStage(4); // Fade out to silence
    }, 8800);

    const t5 = setTimeout(() => {
      onComplete();
    }, 10000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black select-none text-center px-6">
      {stage === 1 && (
        <div className="text-xl sm:text-3xl text-neutral-300 font-mono tracking-widest transition-opacity duration-1000 ease-in-out animate-fadeIn">
          You were human.
        </div>
      )}

      {stage === 3 && (
        <div className="max-w-3xl space-y-4 animate-fadeIn transition-opacity duration-1000">
          <h1
            className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white uppercase leading-tight drop-shadow-[0_0_35px_rgba(255,255,255,0.25)] font-mono"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            I just needed to learn how.
          </h1>
        </div>
      )}
    </div>
  );
};
