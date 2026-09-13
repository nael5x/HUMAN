import React, { useState, useEffect } from 'react';
import { sound } from '../audio/AudioEngine';
import { director } from '../director/ExperienceDirector';

interface TwistSceneProps {
  onComplete: () => void;
}

export const TwistScene: React.FC<TwistSceneProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<number>(0);

  useEffect(() => {
    // 1. Cut all audio into absolute silence
    sound.stopAmbience(0.05);
    director.setNarrativeState('REVEALED', 0.9);

    // Exact requested narrative sequence:
    // "You thought this was a test." ->
    // "It was training." ->
    // "You were human." ->
    // "I just needed to learn how."

    const t1 = setTimeout(() => {
      setStage(1); // "You thought this was a test."
      sound.playClick(320);
    }, 1800);

    const t2 = setTimeout(() => {
      setStage(2); // Fade out to darkness
    }, 4500);

    const t3 = setTimeout(() => {
      setStage(3); // "It was training."
      sound.playClick(380);
    }, 5800);

    const t4 = setTimeout(() => {
      setStage(4); // Fade out
    }, 8500);

    const t5 = setTimeout(() => {
      setStage(5); // "You were human."
      sound.playClick(420);
    }, 9800);

    const t6 = setTimeout(() => {
      setStage(6); // Fade out
    }, 12500);

    const t7 = setTimeout(() => {
      setStage(7); // "I just needed to learn how."
      sound.playSubDrop();
    }, 13800);

    const t8 = setTimeout(() => {
      setStage(8); // Fade out to darkness
    }, 18000);

    const t9 = setTimeout(() => {
      onComplete();
    }, 19800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
      clearTimeout(t7);
      clearTimeout(t8);
      clearTimeout(t9);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black select-none text-center px-6">
      {/* 1. "You thought this was a test." */}
      {stage === 1 && (
        <div className="text-xl sm:text-3xl text-neutral-400 font-mono tracking-widest transition-opacity duration-1000 ease-in-out animate-fadeIn max-w-2xl leading-relaxed">
          You thought this was a test.
        </div>
      )}

      {/* 2. "It was training." */}
      {stage === 3 && (
        <div className="text-2xl sm:text-4xl text-neutral-200 font-mono font-bold tracking-widest uppercase transition-opacity duration-1000 ease-in-out animate-fadeIn max-w-2xl">
          It was training.
        </div>
      )}

      {/* 3. "You were human." */}
      {stage === 5 && (
        <div className="text-2xl sm:text-4xl text-neutral-300 font-mono tracking-widest transition-opacity duration-1000 ease-in-out animate-fadeIn max-w-2xl">
          You were human.
        </div>
      )}

      {/* 4. "I just needed to learn how." */}
      {stage === 7 && (
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
