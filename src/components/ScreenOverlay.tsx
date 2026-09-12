import React from 'react';

interface ScreenOverlayProps {
  glitchLevel?: 'none' | 'minor' | 'medium' | 'critical';
}

export const ScreenOverlay: React.FC<ScreenOverlayProps> = ({ glitchLevel = 'none' }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden">
      {/* Scanline pattern */}
      <div className="absolute inset-0 scanlines opacity-65" />

      {/* Fine film grain prevents flat digital gradients without becoming a visible effect. */}
      <div className="absolute inset-0 film-grain opacity-25" />

      {/* Radial vignette */}
      <div className="absolute inset-0 crt-vignette opacity-80" />

      {/* Glitch layer if triggered */}
      {glitchLevel !== 'none' && (
        <div
          className={`absolute inset-0 mix-blend-screen pointer-events-none ${
            glitchLevel === 'minor'
              ? 'bg-cyan-500/5 animate-glitch'
              : glitchLevel === 'medium'
              ? 'bg-red-500/10 animate-glitch backdrop-invert-10'
              : 'bg-emerald-500/15 animate-glitch backdrop-invert-25 chromatic-glow'
          }`}
        />
      )}
    </div>
  );
};
