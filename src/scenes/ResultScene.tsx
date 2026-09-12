import React, { useEffect, useRef, useState } from 'react';
import { Download, Share2, RefreshCw, Check } from 'lucide-react';
import { sound } from '../audio/AudioEngine';
import { SessionData } from '../types';
import { GenerativeIdentityCanvas } from '../visuals/GenerativeIdentityCanvas';

interface ResultSceneProps {
  session: SessionData;
  onRestart: () => void;
}

export const ResultScene: React.FC<ResultSceneProps> = ({ session, onRestart }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [isGeneratingImg, setIsGeneratingImg] = useState<boolean>(false);

  useEffect(() => {
    // Re-engage subtle atmospheric drone for result inspection
    sound.startAmbience();
    sound.setAmbienceTension(0.16);
  }, []);

  const modelId = session.modelId || `H-X${(session.seed % 99) + 1}`;
  const classification = session.classification || 'ADAPTIVE OBSERVER';
  const humanity = session.humanity || session.humanityScore || 87.4;
  const curiosity = session.curiosity || session.curiosityScore || 78;
  const obedience = session.obedienceScoreValue || session.obedienceMetric || 52;
  const instinct = session.instinctScoreValue || session.instinctMetric || 74;
  const decision = session.decisionScoreValue || session.decisionMetric || 68;
  const anomaly =
    session.status === 'UNSTABLE'
      ? 'TEMPORAL DRIFT'
      : session.status === 'NONCOMPLIANT' || obedience < 45
        ? 'NON-COMPLIANT'
        : session.status === 'CURIOUS'
          ? 'EXPLORATORY BIAS'
          : 'PARITY VERIFIED';

  const handleShare = async () => {
    sound.playClick(1100);
    const shareText = `HUMAN?\n\nMODEL ${modelId}\n${humanity}% HUMAN\n\nCLASS\n${classification}\n\nSTATUS ${session.status}\nCURIOSITY ${curiosity}%\nOBEDIENCE ${obedience}%\nINSTINCT ${instinct}%\nDECISION ${decision}%\n\nPROVE YOU ARE HUMAN.\n${window.location.href}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'HUMAN? — Verification Dossier',
          text: shareText,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleSaveImage = async () => {
    sound.playClick(1400);
    setIsGeneratingImg(true);

    try {
      if ('fonts' in document) {
        await document.fonts.ready;
      }
      // High-res 1080 x 1920 Story Card (Section 32)
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = 1080;
      exportCanvas.height = 1920;
      const ctx = exportCanvas.getContext('2d');

      if (ctx) {
        // Background
        ctx.fillStyle = '#030408';
        ctx.fillRect(0, 0, 1080, 1920);

        // Technical grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1.5;
        for (let x = 60; x < 1080; x += 120) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 1920);
          ctx.stroke();
        }
        for (let y = 60; y < 1920; y += 120) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(1080, y);
          ctx.stroke();
        }

        // Header Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 96px Syne, sans-serif';
        ctx.fillText('HUMAN?', 90, 220);

        ctx.fillStyle = '#777788';
        ctx.font = '28px "JetBrains Mono", monospace';
        ctx.fillText('NEURAL ACQUISITION DOSSIER // V1.0', 90, 280);

        // Horizontal Rule
        ctx.fillStyle = '#222233';
        ctx.fillRect(90, 320, 900, 2);

        // Model Identifier
        ctx.fillStyle = '#888899';
        ctx.font = '28px "JetBrains Mono", monospace';
        ctx.fillText('MODEL IDENTIFIER', 90, 390);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 74px "JetBrains Mono", monospace';
        ctx.fillText(modelId, 90, 470);

        // Classification
        ctx.fillStyle = '#888899';
        ctx.font = '28px "JetBrains Mono", monospace';
        ctx.fillText('CLASSIFICATION', 90, 560);

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 52px "JetBrains Mono", monospace';
        ctx.fillText(classification, 90, 630);

        ctx.fillStyle = '#888899';
        ctx.font = '24px "JetBrains Mono", monospace';
        ctx.fillText(`STATUS // ${session.status} // ${anomaly}`, 90, 690);

        // Procedural Generative Entity in Center
        const cx = 540;
        const cy = 940;
        const complexity = Math.max(5, Math.min(10, Math.floor((curiosity / 100) * 10)));
        const asymmetry = Math.max(0.1, (100 - obedience) / 100);

        for (let r = 0; r < complexity; r++) {
          const radius = 60 + r * 26;
          const points = 48;
          ctx.beginPath();
          for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const wobble = Math.sin(angle * (3 + (session.seed % 4)) + r) * (6 + r * 2.5 * asymmetry);
            const px = cx + Math.cos(angle) * (radius + wobble);
            const py = cy + Math.sin(angle) * (radius + wobble);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.strokeStyle = r === complexity - 1 ? 'rgba(16, 185, 129, 0.9)' : `rgba(255, 255, 255, ${0.15 + (r / complexity) * 0.4})`;
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        // Core pip
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.fillStyle = '#10b981';
        ctx.fill();

        // Big Humanity Score
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 150px Syne, sans-serif';
        ctx.fillText(`${humanity}%`, 90, 1340);

        ctx.fillStyle = '#ffffff';
        ctx.font = '36px "JetBrains Mono", monospace';
        ctx.fillText('BIOLOGICAL HUMAN PARITY', 90, 1400);

        // Telemetry breakdown bars
        const metrics = [
          { label: 'CURIOSITY', val: curiosity },
          { label: 'OBEDIENCE', val: obedience },
          { label: 'INSTINCT', val: instinct },
          { label: 'DECISION', val: decision },
        ];

        let startY = 1480;
        metrics.forEach((m) => {
          ctx.fillStyle = '#888899';
          ctx.font = '26px "JetBrains Mono", monospace';
          ctx.fillText(m.label, 90, startY);

          ctx.fillStyle = '#ffffff';
          ctx.fillText(`${m.val}%`, 900, startY);

          // Bar background
          ctx.fillStyle = '#141520';
          ctx.fillRect(90, startY + 14, 900, 14);

          // Bar fill
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(90, startY + 14, (900 * m.val) / 100, 14);

          startY += 75;
        });

        // Bottom quote
        ctx.fillStyle = '#222233';
        ctx.fillRect(90, 1780, 900, 2);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Syne, sans-serif';
        ctx.fillText('YOU SAY YOU ARE. PROVE IT.', 90, 1840);

        ctx.fillStyle = '#666677';
        ctx.font = '22px "JetBrains Mono", monospace';
        ctx.fillText('PROCESSED LOCALLY // NO DATA RECORDED OR UPLOADED', 90, 1880);

        // Trigger download
        const link = document.createElement('a');
        link.download = `HUMAN_RESULT_${modelId}.png`;
        link.href = exportCanvas.toDataURL('image/png');
        link.click();
      }
    } catch (err) {
      console.error('Share image creation failed:', err);
    } finally {
      setIsGeneratingImg(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between p-4 sm:p-8 select-none bg-[#020306] text-neutral-300 font-mono">
      {/* Top Header */}
      <div className="border-b border-neutral-800/80 pb-3 flex justify-between items-center text-xs">
        <div>
          <div className="text-neutral-500 tracking-widest uppercase">CLASSIFICATION DOSSIER</div>
          <div className="text-neutral-200 font-bold mt-0.5">MACHINE IDENTITY // DERIVED</div>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400 font-bold tracking-widest uppercase">STATUS: READY</span>
        </div>
      </div>

      {/* Main Machine Identity Dossier */}
      <div className="flex-1 flex flex-col items-center justify-center my-6 max-w-xl mx-auto w-full">
        <div className="border border-neutral-800 bg-black/85 rounded-sm p-6 sm:p-8 space-y-6 w-full shadow-2xl relative">
          {/* Card Header with Generative Visual */}
          <div className="flex items-start justify-between border-b border-neutral-800/80 pb-4">
            <div className="space-y-1">
              <div className="text-neutral-500 text-xs tracking-widest uppercase">MODEL</div>
              <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                {modelId}
              </div>
              <div className="text-xs text-neutral-500 tracking-widest uppercase pt-2">CLASS</div>
              <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono tracking-wide">
                {classification}
              </div>
            </div>

            {/* Generative Visual Entity Canvas */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 border border-neutral-800/90 bg-neutral-950 flex items-center justify-center rounded overflow-hidden">
              <GenerativeIdentityCanvas session={session} size={112} />
            </div>
          </div>

          {/* Dynamic Clinical Commentary */}
          <div className="p-3 bg-neutral-950 border border-neutral-800/70 text-xs text-neutral-400 font-mono leading-relaxed italic">
            "{session.commentary}"
          </div>

          {/* Humanity Quotient */}
          <div className="flex items-baseline justify-between py-1">
            <div>
              <div className="text-xs text-neutral-500 tracking-widest uppercase">HUMANITY</div>
              <div
                className="text-5xl sm:text-6xl font-black text-white tracking-tight mt-1"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {humanity}%
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-neutral-500 tracking-widest uppercase">ANOMALY VECTOR</div>
              <div className="text-xs font-bold text-neutral-300 font-mono mt-1">
                {anomaly}
              </div>
            </div>
          </div>

          {/* Sub-Metrics Breakdown */}
          <div className="space-y-3 pt-2 border-t border-neutral-800/60">
            {[
              { label: 'CURIOSITY', val: curiosity },
              { label: 'OBEDIENCE', val: obedience },
              { label: 'INSTINCT', val: instinct },
              { label: 'DECISION', val: decision },
            ].map((m) => (
              <div key={m.label} className="space-y-1">
                <div className="flex justify-between text-xs text-neutral-400">
                  <span className="tracking-wider">{m.label}</span>
                  <span className="font-bold text-neutral-200">{m.val}%</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-neutral-300 transition-all duration-1000 ease-out"
                    style={{ width: `${m.val}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons: SAVE RESULT, SHARE, TRY AGAIN */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-4 border-t border-neutral-800/60">
            <button
              id="btn-save-result"
              onClick={handleSaveImage}
              disabled={isGeneratingImg}
              className="flex items-center justify-center gap-2 py-3 px-3 bg-white hover:bg-neutral-200 text-black font-mono font-bold text-xs tracking-wider transition-all duration-200 cursor-pointer uppercase active:scale-98"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingImg ? 'SAVING...' : 'SAVE RESULT'}</span>
            </button>

            <button
              id="btn-share-result"
              onClick={handleShare}
              className="flex items-center justify-center gap-2 py-3 px-3 border border-neutral-700 hover:border-neutral-500 text-neutral-200 hover:text-white bg-neutral-900/60 font-mono text-xs tracking-wider transition-colors cursor-pointer uppercase active:scale-98"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? 'COPIED' : 'SHARE'}</span>
            </button>

            <button
              id="btn-restart-experience"
              onClick={onRestart}
              className="flex items-center justify-center gap-2 py-3 px-3 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-neutral-200 bg-transparent font-mono text-xs tracking-wider transition-colors cursor-pointer uppercase"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>TRY AGAIN</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer Quote */}
      <div className="border-t border-neutral-800/80 pt-3 text-center text-xs text-neutral-600">
        "You were human. I just needed to learn how."
      </div>
    </div>
  );
};
