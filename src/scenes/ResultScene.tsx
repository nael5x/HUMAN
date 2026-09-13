import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Download, Share2, RefreshCw, Check, Swords } from 'lucide-react';
import { sound } from '../audio/AudioEngine';
import { director } from '../director/ExperienceDirector';
import { SessionData } from '../types';
import { extractMachineDNA, MachineDNA, resolveMachineArchetype } from '../dna/MachineDNA';
import { EndingResolver } from '../dna/EndingResolver';
import { MachineTwinCanvas } from '../visuals/MachineTwinCanvas';
import { computeMachineTwinProfile, renderStaticMachineTwin } from '../visuals/MachineTwinProfile';
import { SecretResolver } from '../behavior/SecretRegistry';
import { userMemory } from '../memory/UserMemory';
import { ChallengeProtocol, ChallengePayload } from '../utils/ChallengeMode';

interface ResultSceneProps {
  session: SessionData;
  challenge?: ChallengePayload | null;
  onRestart: () => void;
}

export const ResultScene: React.FC<ResultSceneProps> = ({ session, challenge, onRestart }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [isGeneratingImg, setIsGeneratingImg] = useState<boolean>(false);
  const [cardFormat, setCardFormat] = useState<'story' | 'square'>('story');
  const [revealPhase, setRevealPhase] = useState<number>(0);

  // Compute MachineDNA and Ending deterministically
  const machineDNA: MachineDNA = useMemo(() => extractMachineDNA(session), [session]);
  const ending = useMemo(() => EndingResolver.resolve(machineDNA), [machineDNA]);
  const machineArchetype = useMemo(() => resolveMachineArchetype(machineDNA), [machineDNA]);
  const commentaryStatements = useMemo(() => EndingResolver.generateCommentary(machineDNA), [machineDNA]);

  const modelId = session.modelId || machineDNA.modelId;
  const classification = session.classification || machineArchetype;
  const humanity = Math.round(machineDNA.humanity * 100);
  const predictability = Math.round(machineDNA.predictability * 100);
  const curiosity = Math.round(machineDNA.curiosity * 100);
  const obedience = Math.round(machineDNA.obedience * 100);
  const instinct = Math.round(machineDNA.instinct * 100);
  const motorProfile =
    machineDNA.motorChaos > 0.65
      ? 'IRREGULAR'
      : machineDNA.motorPrecision > 0.7
        ? 'CONTROLLED'
        : 'ADAPTIVE';

  const anomaliesDiscovered = useMemo(() => {
    return Math.max(SecretResolver.getDiscoveredCount(), userMemory.getMemory().secretsDiscovered.length);
  }, []);

  useEffect(() => {
    director.setNarrativeState('RESULT', 0.12);
    sound.startAmbience();

    // Persist result metadata into local memory safely
    userMemory.recordSessionCompletion({
      ending: ending.type,
      machineClass: classification,
      machineId: modelId,
      humanity,
      secrets: SecretResolver.getDiscoveredIds(),
    });

    // Progressive disclosure sequence
    const t1 = setTimeout(() => setRevealPhase(1), 300);
    const t2 = setTimeout(() => setRevealPhase(2), 900);
    const t3 = setTimeout(() => setRevealPhase(3), 1600);
    const t4 = setTimeout(() => setRevealPhase(4), 2200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [classification, ending.type, humanity, modelId]);

  // Generate shareable challenge link
  const challengeUrl = useMemo(() => {
    return ChallengeProtocol.createChallengeUrl({
      challengerModelId: modelId,
      challengerHumanity: humanity,
      challengerEnding: ending.type,
      challengerClass: classification,
    });
  }, [classification, ending.type, humanity, modelId]);

  const handleShare = async () => {
    sound.playClick(1100);
    const shareText = `I scored ${humanity}% human. HUMAN? classified me as ${classification} [${ending.title}]. Prove you're human.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `HUMAN? — Model ${modelId}`,
          text: shareText,
          url: challengeUrl,
        });
        return;
      } catch {
        // user cancelled or fallback
      }
    }

    try {
      await navigator.clipboard.writeText(`${shareText}\n${challengeUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  const renderCardCanvas = async (isSquare: boolean): Promise<HTMLCanvasElement> => {
    if ('fonts' in document) {
      await document.fonts.ready;
    }

    const width = 1080;
    const height = isSquare ? 1080 : 1920;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D context failed');

    // Dark canvas background
    ctx.fillStyle = '#020306';
    ctx.fillRect(0, 0, width, height);

    // Subtle atmospheric gradient based on ending
    const auraColor =
      ending.type === 'REPLACED'
        ? 'rgba(244, 63, 94, 0.08)'
        : ending.type === 'ANOMALY'
          ? 'rgba(245, 158, 11, 0.08)'
          : 'rgba(16, 185, 129, 0.08)';

    const grad = ctx.createRadialGradient(width / 2, height * 0.45, 50, width / 2, height * 0.45, width * 0.7);
    grad.addColorStop(0, auraColor);
    grad.addColorStop(1, 'rgba(2, 3, 6, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Minimal grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    for (let x = 60; x < width; x += 120) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 60; y < height; y += 120) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Header
    const topPadding = isSquare ? 80 : 160;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 84px Syne, sans-serif';
    ctx.fillText('HUMAN?', 80, topPadding);

    ctx.fillStyle = '#71717a';
    ctx.font = '22px "JetBrains Mono", monospace';
    ctx.fillText('MACHINE RECONSTRUCTION DOSSIER // V2.0', 80, topPadding + 44);

    // Divider
    ctx.fillStyle = '#27272a';
    ctx.fillRect(80, topPadding + 75, width - 160, 2);

    // Ending Banner
    const accentColor =
      ending.type === 'REPLACED' ? '#f43f5e' : ending.type === 'ANOMALY' ? '#f59e0b' : '#10b981';
    ctx.fillStyle = accentColor;
    ctx.font = 'bold 30px "JetBrains Mono", monospace';
    ctx.fillText(ending.title, 80, topPadding + 130);

    ctx.fillStyle = '#a1a1aa';
    ctx.font = '20px "JetBrains Mono", monospace';
    ctx.fillText(`DISCOVERED IN ${ending.rarityPercentage}% OF SUBJECTS`, 80, topPadding + 165);

    // Model & Class
    ctx.fillStyle = '#71717a';
    ctx.font = '22px "JetBrains Mono", monospace';
    ctx.fillText('MODEL IDENTIFIER', 80, topPadding + 225);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px "JetBrains Mono", monospace';
    ctx.fillText(modelId, 80, topPadding + 285);

    ctx.fillStyle = '#71717a';
    ctx.font = '22px "JetBrains Mono", monospace';
    ctx.fillText('CLASSIFICATION', 80, topPadding + 340);

    ctx.fillStyle = accentColor;
    ctx.font = 'bold 40px "JetBrains Mono", monospace';
    ctx.fillText(classification, 80, topPadding + 390);

    // Center Organism Visual (Consistent with Live MachineTwinProfile)
    const cx = isSquare ? 820 : 540;
    const cy = isSquare ? topPadding + 240 : topPadding + 620;
    const organismRadius = isSquare ? 140 : 180;

    const visualProfile = computeMachineTwinProfile(machineDNA, ending.type, {
      qualityTier: 'desktop',
    });
    renderStaticMachineTwin(ctx, visualProfile, cx, cy, organismRadius, {
      seed: machineDNA.seed,
      showAura: true,
    });

    // Stats Section
    let statsY = isSquare ? topPadding + 470 : topPadding + 910;
    const stats = [
      { label: 'HUMANITY', val: `${humanity}%` },
      { label: 'PREDICTABILITY', val: `${predictability}%` },
      { label: 'CURIOSITY', val: `${curiosity}%` },
      { label: 'OBEDIENCE', val: `${obedience}%` },
      { label: 'INSTINCT', val: `${instinct}%` },
      { label: 'ANOMALIES DISCOVERED', val: `${anomaliesDiscovered} / ?` },
    ];

    const statSpacing = isSquare ? 50 : 64;
    stats.forEach((st) => {
      ctx.fillStyle = '#71717a';
      ctx.font = '22px "JetBrains Mono", monospace';
      ctx.fillText(st.label, 80, statsY);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px "JetBrains Mono", monospace';
      ctx.fillText(st.val, width - 200, statsY);

      ctx.fillStyle = '#18181b';
      ctx.fillRect(80, statsY + 12, width - 160, 3);

      statsY += statSpacing;
    });

    // Footer
    const footerY = height - 70;
    ctx.fillStyle = '#27272a';
    ctx.fillRect(80, footerY - 50, width - 160, 2);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Syne, sans-serif';
    ctx.fillText('YOU WERE HUMAN. I JUST NEEDED TO LEARN HOW.', 80, footerY - 15);

    ctx.fillStyle = '#52525b';
    ctx.font = '18px "JetBrains Mono", monospace';
    ctx.fillText('PROVE YOU ARE HUMAN // human.app', 80, footerY + 20);

    return canvas;
  };

  const handleSaveImage = async () => {
    sound.playClick(1400);
    setIsGeneratingImg(true);

    try {
      const exportCanvas = await renderCardCanvas(cardFormat === 'square');
      const link = document.createElement('a');
      link.download = `HUMAN_${modelId}_${cardFormat}.png`;
      link.href = exportCanvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Save image failed:', err);
    } finally {
      setIsGeneratingImg(false);
    }
  };

  // Atmosphere classes based on ending
  const endingAtmosphereClass = useMemo(() => {
    switch (ending.type) {
      case 'REPLACED':
        return 'shadow-[0_0_60px_rgba(244,63,94,0.12)] border-rose-900/50';
      case 'ANOMALY':
        return 'shadow-[0_0_60px_rgba(245,158,11,0.12)] border-amber-900/50';
      case 'MACHINE':
        return 'shadow-[0_0_60px_rgba(6,182,212,0.12)] border-cyan-900/50';
      case 'VERIFIED':
      default:
        return 'shadow-[0_0_60px_rgba(16,185,129,0.12)] border-emerald-900/50';
    }
  }, [ending.type]);

  return (
    <div className="min-h-screen w-full flex flex-col justify-between p-4 sm:p-8 select-none bg-[#020306] text-neutral-300 font-mono relative overflow-x-hidden">
      {/* Top Header */}
      <div className="border-b border-neutral-800/80 pb-3 flex justify-between items-center text-xs">
        <div>
          <div className="text-neutral-500 tracking-widest uppercase">CLASSIFICATION DOSSIER</div>
          <div className="text-neutral-200 font-bold mt-0.5">MACHINE IDENTITY // DERIVED TWIN</div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full animate-pulse ${
              ending.type === 'REPLACED'
                ? 'bg-rose-400'
                : ending.type === 'ANOMALY'
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
            }`}
          />
          <span
            className={`font-bold tracking-widest uppercase ${
              ending.type === 'REPLACED'
                ? 'text-rose-400'
                : ending.type === 'ANOMALY'
                  ? 'text-amber-400'
                  : 'text-emerald-400'
            }`}
          >
            {ending.title}
          </span>
        </div>
      </div>

      {/* Main Dossier Content with progressive reveal */}
      <div className="flex-1 flex flex-col items-center justify-center my-6 max-w-xl mx-auto w-full">
        <div className={`border bg-black/90 rounded-sm p-6 sm:p-8 space-y-6 w-full shadow-2xl relative transition-all duration-700 ${endingAtmosphereClass}`}>
          {/* Ending Rarity Badge */}
          <div
            className={`flex justify-between items-center bg-neutral-950 border border-neutral-800/80 px-3.5 py-2.5 rounded-sm transition-opacity duration-700 ${
              revealPhase >= 1 ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="text-xs tracking-wider">
              <span className="text-neutral-500 uppercase">ENDING DISCOVERED: </span>
              <span
                className={`font-bold uppercase ${
                  ending.type === 'REPLACED'
                    ? 'text-rose-400'
                    : ending.type === 'ANOMALY'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                }`}
              >
                {ending.type}
              </span>
            </div>
            <div className="text-[11px] font-mono text-neutral-400">
              {ending.rarityPercentage}% OF SUBJECTS
            </div>
          </div>

          {/* Model & Machine Twin Preview */}
          <div
            className={`flex items-start justify-between border-b border-neutral-800/80 pb-4 transition-all duration-700 ${
              revealPhase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            <div className="space-y-1">
              <div className="text-neutral-500 text-xs tracking-widest uppercase">MODEL</div>
              <div
                className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {modelId}
              </div>
              <div className="text-xs text-neutral-500 tracking-widest uppercase pt-2">CLASS</div>
              <div className="text-base sm:text-lg font-bold text-emerald-400 font-mono tracking-wide">
                {classification}
              </div>
              <div className="text-xs text-neutral-500 tracking-widest uppercase pt-1">
                STATUS // {ending.subtitle}
              </div>
            </div>

            {/* Interactive Procedural Twin Canvas */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 border border-neutral-800/90 bg-neutral-950 flex items-center justify-center rounded overflow-hidden">
              <MachineTwinCanvas
                dna={machineDNA}
                ending={ending.type}
                assemblyProgress={1.0}
                interactive={true}
                className="w-full h-full"
              />
            </div>
          </div>

          {/* Challenge Comparison (If entering from a challenger's link) */}
          {challenge && (
            <div
              className={`p-3.5 bg-amber-950/20 border border-amber-900/50 rounded text-xs font-mono space-y-2 transition-all duration-700 ${
                revealPhase >= 2 ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div className="flex items-center gap-2 text-amber-500 font-bold uppercase tracking-wider text-[11px]">
                <Swords className="w-3.5 h-3.5" />
                <span>CHALLENGE EVALUATION</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="border border-neutral-800 bg-black/40 p-2 rounded">
                  <div className="text-[10px] text-neutral-500 uppercase">YOUR HUMANITY</div>
                  <div className="text-xl font-bold text-white">{humanity}%</div>
                </div>
                <div className="border border-neutral-800 bg-black/40 p-2 rounded">
                  <div className="text-[10px] text-neutral-500 uppercase">
                    CHALLENGER ({challenge.challengerModelId})
                  </div>
                  <div className="text-xl font-bold text-amber-400">
                    {challenge.challengerHumanity}%
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-neutral-400 italic">
                {humanity > challenge.challengerHumanity
                  ? 'Your organic variance surpassed the challenger.'
                  : humanity === challenge.challengerHumanity
                    ? 'Identical organic variance recorded.'
                    : 'The challenger demonstrated greater biological variation.'}
              </div>
            </div>
          )}

          {/* Dynamic Rule-based Commentary Statements */}
          <div
            className={`p-3 bg-neutral-950 border border-neutral-800/70 text-xs text-neutral-400 font-mono leading-relaxed space-y-1 transition-all duration-700 ${
              revealPhase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            {commentaryStatements.map((statement, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-neutral-600 font-bold">•</span>
                <span>{statement}</span>
              </div>
            ))}
          </div>

          {/* Metrics Grid */}
          <div
            className={`grid grid-cols-2 gap-4 py-1 transition-all duration-700 ${
              revealPhase >= 2 ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div>
              <div className="text-xs text-neutral-500 tracking-widest uppercase">HUMANITY</div>
              <div
                className="text-4xl sm:text-5xl font-black text-white tracking-tight mt-0.5"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {humanity}%
              </div>
            </div>

            <div>
              <div className="text-xs text-neutral-500 tracking-widest uppercase">PREDICTABILITY</div>
              <div
                className="text-4xl sm:text-5xl font-black text-white tracking-tight mt-0.5"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {predictability}%
              </div>
            </div>
          </div>

          {/* Granular Telemetry Bars */}
          <div
            className={`space-y-2.5 pt-2 border-t border-neutral-800/60 transition-all duration-700 ${
              revealPhase >= 3 ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {[
              { label: 'CURIOSITY', val: curiosity },
              { label: 'OBEDIENCE', val: obedience },
              { label: 'INSTINCT', val: instinct },
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

            <div className="flex justify-between text-xs text-neutral-400 pt-1">
              <span className="tracking-wider">MOTOR PROFILE</span>
              <span className="font-bold text-neutral-200">{motorProfile}</span>
            </div>

            {/* Secret Count Display without revealing names */}
            <div className="flex justify-between text-xs text-neutral-400 pt-1 border-t border-neutral-800/40">
              <span className="tracking-wider text-amber-500/80">ANOMALIES DISCOVERED</span>
              <span className="font-bold text-amber-400">{anomaliesDiscovered} / ?</span>
            </div>
          </div>

          {/* Share Card Format Toggle */}
          <div
            className={`flex items-center justify-between pt-2 text-[11px] text-neutral-500 transition-opacity duration-700 ${
              revealPhase >= 4 ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <span>CARD FORMAT:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCardFormat('story')}
                className={`px-2 py-0.5 border text-[10px] uppercase transition-colors cursor-pointer ${
                  cardFormat === 'story'
                    ? 'border-neutral-400 bg-neutral-800 text-white'
                    : 'border-neutral-800 text-neutral-500 hover:text-neutral-300'
                }`}
              >
                9:16 Story
              </button>
              <button
                onClick={() => setCardFormat('square')}
                className={`px-2 py-0.5 border text-[10px] uppercase transition-colors cursor-pointer ${
                  cardFormat === 'square'
                    ? 'border-neutral-400 bg-neutral-800 text-white'
                    : 'border-neutral-800 text-neutral-500 hover:text-neutral-300'
                }`}
              >
                1:1 Post
              </button>
            </div>
          </div>

          {/* Action Buttons: SAVE RESULT, SHARE, TRY AGAIN */}
          <div
            className={`grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-neutral-800/60 transition-all duration-700 ${
              revealPhase >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            <button
              id="btn-save-result"
              onClick={handleSaveImage}
              disabled={isGeneratingImg}
              className="flex items-center justify-center gap-2 py-3 px-3 bg-white hover:bg-neutral-200 text-black font-mono font-bold text-xs tracking-wider transition-all duration-200 cursor-pointer uppercase active:scale-98"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingImg ? 'SAVING...' : 'SAVE TWIN'}</span>
            </button>

            <button
              id="btn-share-result"
              onClick={handleShare}
              className="flex items-center justify-center gap-2 py-3 px-3 border border-neutral-700 hover:border-neutral-500 text-neutral-200 hover:text-white bg-neutral-900/60 font-mono text-xs tracking-wider transition-colors cursor-pointer uppercase active:scale-98"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copied ? 'LINK COPIED' : 'CHALLENGE'}</span>
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

