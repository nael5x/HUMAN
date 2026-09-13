import React, { useEffect, useState, useMemo, useRef } from 'react';
import { sound } from '../audio/AudioEngine';
import { director } from '../director/ExperienceDirector';
import { SessionData } from '../types';
import { extractMachineDNA, resolveMachineArchetype, MachineDNA, MachineArchetype } from '../dna/MachineDNA';
import { EndingResolver } from '../dna/EndingResolver';
import { MachineTwinCanvas } from '../visuals/MachineTwinCanvas';
import { sessionMemory } from '../memory/SessionMemory';

interface MachineReconstructionSceneProps {
  session: SessionData;
  onReconstructionComplete: (updatedSession: SessionData) => void;
}

type ReconstructionStage =
  | 'INIT_NOTICE'
  | 'SUBJECT_ID'
  | 'BUILDING_MODEL'
  | 'ASSEMBLING_TEXT'
  | 'ASSEMBLING_VISUAL'
  | 'COMPLETE_REVEAL';

export const MachineReconstructionScene: React.FC<MachineReconstructionSceneProps> = ({
  session,
  onReconstructionComplete,
}) => {
  const [stage, setStage] = useState<ReconstructionStage>('INIT_NOTICE');
  const [assemblyProgress, setAssemblyProgress] = useState<number>(0);
  const [textLogs, setTextLogs] = useState<string[]>([]);
  const [revealStep, setRevealStep] = useState<number>(0);

  const onReconstructionCompleteRef = useRef(onReconstructionComplete);
  onReconstructionCompleteRef.current = onReconstructionComplete;

  // Compute MachineDNA and Ending deterministically once for this session
  const machineDNARef = useRef<MachineDNA | null>(null);
  if (!machineDNARef.current) {
    machineDNARef.current = extractMachineDNA(session);
  }
  const machineDNA = machineDNARef.current;

  const resolvedEndingRef = useRef<ReturnType<typeof EndingResolver.resolve> | null>(null);
  if (!resolvedEndingRef.current) {
    resolvedEndingRef.current = EndingResolver.resolve(machineDNA);
  }
  const resolvedEnding = resolvedEndingRef.current;

  const machineArchetypeRef = useRef<MachineArchetype | null>(null);
  if (!machineArchetypeRef.current) {
    machineArchetypeRef.current = resolveMachineArchetype(machineDNA);
  }
  const machineArchetype = machineArchetypeRef.current;

  useEffect(() => {
    // Narrative state: RECONSTRUCTING
    director.setNarrativeState('RECONSTRUCTING', 0.45);
    sound.startAmbience();

    // Ending-specific subtle audio color
    if (resolvedEnding.type === 'MACHINE') {
      sound.setAmbienceTension(0.25);
    } else if (resolvedEnding.type === 'ANOMALY') {
      sound.setAmbienceTension(0.55);
    } else if (resolvedEnding.type === 'REPLACED') {
      sound.setAmbienceTension(0.65);
    } else {
      sound.setAmbienceTension(0.35);
    }

    // Sequence timeline:
    // 1. RECONSTRUCTION SEQUENCE INITIALIZED (0 - 1800ms)
    // 2. SOURCE / SUBJECT [SESSION ID] (1800ms - 3600ms)
    // 3. BUILDING MODEL... (3600ms - 5200ms)
    // 4. ASSEMBLING_TEXT (5200ms - 8600ms):
    //    ANALYZING BEHAVIORAL DNA...
    //    CORE ................. GENERATED
    //    MOTOR PROFILE ........ MAPPED
    //    DECISION MODEL ....... MAPPED
    //    PREDICTIVE LAYER ..... MAPPED
    //    IMITATION MATRIX ..... MAPPED
    // 5. ASSEMBLING_VISUAL (8600ms - 13500ms): Twin layers build gradually: Core -> Structure -> Signals -> Sensors -> Particles
    // 6. COMPLETE_REVEAL (13500ms+): Twin settles, Model ID & Class & Source revealed

    const t1 = setTimeout(() => {
      setStage('SUBJECT_ID');
      sound.playClick(900);
    }, 2000);

    const t2 = setTimeout(() => {
      setStage('BUILDING_MODEL');
      sound.playClick(1100);
    }, 3800);

    const t3 = setTimeout(() => {
      setStage('ASSEMBLING_TEXT');
      sound.playScanPulse();
    }, 5400);

    // Text assembly logs stepped additions
    const logTimers = [
      setTimeout(() => {
        setTextLogs((prev) => [...prev, 'ANALYZING BEHAVIORAL DNA...']);
        sound.playClick(1200);
      }, 5500),
      setTimeout(() => {
        setTextLogs((prev) => [...prev, 'CORE ................. GENERATED']);
        sound.playClick(1250);
      }, 6200),
      setTimeout(() => {
        setTextLogs((prev) => [...prev, 'MOTOR PROFILE ........ MAPPED']);
        sound.playClick(1300);
      }, 6800),
      setTimeout(() => {
        setTextLogs((prev) => [...prev, 'DECISION MODEL ....... MAPPED']);
        sound.playClick(1350);
      }, 7400),
      setTimeout(() => {
        setTextLogs((prev) => [...prev, 'PREDICTIVE LAYER ..... MAPPED']);
        sound.playClick(1400);
      }, 8000),
      setTimeout(() => {
        setTextLogs((prev) => [...prev, 'IMITATION MATRIX ..... MAPPED']);
        sound.playScanPulse();
      }, 8600),
    ];

    // Transition to gradual visual assembly
    const t4 = setTimeout(() => {
      setStage('ASSEMBLING_VISUAL');
      sound.playSubDrop();
    }, 9400);

    // Assembly progress increments:
    // Core (0.2) -> Structure (0.45) -> Signal Lines (0.65) -> Sensors (0.85) -> Particles/Aura (1.0)
    const visualTimers = [
      setTimeout(() => {
        setAssemblyProgress(0.2);
        sound.playClick(600);
      }, 9800),
      setTimeout(() => {
        setAssemblyProgress(0.48);
        sound.playClick(750);
      }, 10700),
      setTimeout(() => {
        setAssemblyProgress(0.70);
        sound.playClick(900);
      }, 11600),
      setTimeout(() => {
        setAssemblyProgress(0.88);
        sound.playClick(1100);
      }, 12500),
      setTimeout(() => {
        setAssemblyProgress(1.0);
        sound.playScanPulse();
      }, 13400),
    ];

    // Transition to Reveal stage
    const t5 = setTimeout(() => {
      setStage('COMPLETE_REVEAL');
      setRevealStep(1); // "RECONSTRUCTION COMPLETE"
      sound.playAcceptedTick();
    }, 14400);

    const t6 = setTimeout(() => {
      setRevealStep(2); // MODEL H-X.. / CLASS / SOURCE: YOU
      sound.playClick(1000);
    }, 16200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
      logTimers.forEach(clearTimeout);
      visualTimers.forEach(clearTimeout);
    };
  }, []);

  const handleProceedToDossier = () => {
    sound.playClick(1400);
    // Record final outputs into SessionMemory
    sessionMemory.recordFinalOutputs({
      machineId: machineDNA.modelId,
      machineClass: machineArchetype,
      ending: resolvedEnding.type,
      predictabilityScore: Math.round(machineDNA.predictability * 100),
      resultStatus:
        resolvedEnding.type === 'ANOMALY'
          ? 'UNSTABLE'
          : resolvedEnding.type === 'MACHINE'
            ? 'STABLE'
            : resolvedEnding.type === 'REPLACED'
              ? 'CURIOUS'
              : 'READY',
    });

    const updated: SessionData = {
      ...session,
      modelId: machineDNA.modelId,
      classification: machineArchetype,
      predictabilityScore: Math.round(machineDNA.predictability * 100),
      status:
        resolvedEnding.type === 'ANOMALY'
          ? 'UNSTABLE'
          : resolvedEnding.type === 'MACHINE'
            ? 'STABLE'
            : resolvedEnding.type === 'REPLACED'
              ? 'CURIOUS'
              : 'READY',
      commentary: resolvedEnding.description,
    };

    onReconstructionCompleteRef.current(updated);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between p-4 sm:p-8 select-none bg-[#010204] text-neutral-300 font-mono">
      {/* Top Header HUD */}
      <div className="border-b border-neutral-800/80 pb-3 flex justify-between items-center text-xs">
        <div>
          <div className="text-neutral-500 tracking-widest uppercase">
            NEURAL RECONSTRUCTION // ARCHETYPE SYNTHESIS
          </div>
          <div className="text-neutral-300 font-bold mt-0.5">
            {stage === 'COMPLETE_REVEAL'
              ? `MODEL: ${machineDNA.modelId} // ACTIVE`
              : 'SYNTHETIC ENTITY FORMATION'}
          </div>
        </div>

        <div className="text-right">
          <span
            className={`font-bold tracking-widest uppercase ${
              resolvedEnding.type === 'REPLACED'
                ? 'text-rose-400 animate-pulse'
                : resolvedEnding.type === 'ANOMALY'
                  ? 'text-amber-400'
                  : 'text-emerald-400'
            }`}
          >
            {stage === 'COMPLETE_REVEAL' ? resolvedEnding.title : 'RECONSTRUCTING...'}
          </span>
        </div>
      </div>

      {/* Center Dynamic Area */}
      <div className="flex-1 flex flex-col items-center justify-center my-4 relative max-w-xl mx-auto w-full">
        {/* Phase 1: RECONSTRUCTION SEQUENCE INITIALIZED */}
        {stage === 'INIT_NOTICE' && (
          <div className="text-center space-y-3 animate-fadeIn">
            <div className="text-xs text-neutral-500 tracking-[0.25em] uppercase">
              RECONSTRUCTION PROTOCOL
            </div>
            <h2
              className="text-2xl sm:text-4xl font-bold tracking-widest text-white uppercase font-mono"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              RECONSTRUCTION SEQUENCE INITIALIZED
            </h2>
          </div>
        )}

        {/* Phase 2: SOURCE SUBJECT */}
        {stage === 'SUBJECT_ID' && (
          <div className="text-center space-y-2 animate-fadeIn">
            <div className="text-xs text-neutral-500 tracking-widest uppercase">SOURCE</div>
            <div
              className="text-xl sm:text-3xl font-black text-white uppercase font-mono tracking-widest"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              SUBJECT [{session.subjectId || machineDNA.sourceSubjectId}]
            </div>
          </div>
        )}

        {/* Phase 3: BUILDING MODEL... */}
        {stage === 'BUILDING_MODEL' && (
          <div className="text-center space-y-3 animate-fadeIn">
            <div className="text-xs text-neutral-500 tracking-widest uppercase">MODEL GENERATION</div>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-400 tracking-widest uppercase animate-pulse">
              BUILDING MODEL...
            </div>
          </div>
        )}

        {/* Phase 4: ASSEMBLING_TEXT */}
        {stage === 'ASSEMBLING_TEXT' && (
          <div className="w-full max-w-md border border-neutral-800/90 bg-black/85 p-6 rounded-sm space-y-3 shadow-2xl animate-fadeIn font-mono">
            <div className="text-xs text-neutral-500 tracking-widest uppercase border-b border-neutral-800 pb-2">
              BEHAVIORAL COMPILATION MATRIX
            </div>
            <div className="space-y-1.5 text-xs sm:text-sm text-neutral-300">
              {textLogs.map((log, index) => (
                <div
                  key={index}
                  className={`tracking-wider ${
                    log.includes('MAPPED') || log.includes('GENERATED')
                      ? 'text-emerald-400 font-bold'
                      : 'text-neutral-400'
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Phase 5 & 6: VISUAL ASSEMBLY & REVEAL */}
        {(stage === 'ASSEMBLING_VISUAL' || stage === 'COMPLETE_REVEAL') && (
          <div className="w-full flex flex-col items-center animate-fadeIn">
            {/* Visual Assembly Stage Marker */}
            {stage === 'ASSEMBLING_VISUAL' && (
              <div className="text-xs text-neutral-500 tracking-[0.2em] uppercase mb-4 animate-pulse">
                ASSEMBLING STRUCTURE //{' '}
                {assemblyProgress < 0.3
                  ? 'CORE NUCLEUS'
                  : assemblyProgress < 0.6
                    ? 'STRUCTURAL SHELL'
                    : assemblyProgress < 0.8
                      ? 'SIGNAL NETWORK'
                      : 'SENSOR PARTICLES'}
              </div>
            )}

            {/* The Machine Twin Interactive Canvas */}
            <div className="relative border border-neutral-800/80 rounded-sm overflow-hidden w-72 h-72 sm:w-96 sm:h-96 bg-black shadow-[0_0_50px_rgba(0,0,0,0.9)] flex items-center justify-center">
              <MachineTwinCanvas
                dna={machineDNA}
                ending={resolvedEnding.type}
                assemblyProgress={stage === 'COMPLETE_REVEAL' ? 1.0 : assemblyProgress}
                interactive={stage === 'COMPLETE_REVEAL'}
                className="w-full h-full"
              />

              {/* In-canvas corner telemetry */}
              <div className="absolute bottom-2 left-3 right-3 flex justify-between text-[9px] text-neutral-500 pointer-events-none font-mono">
                <span>DNA SEED // {machineDNA.seed}</span>
                <span>{stage === 'COMPLETE_REVEAL' ? 'STATE: SYNTHESIZED' : 'ASSEMBLING'}</span>
              </div>
            </div>

            {/* Stage: COMPLETE_REVEAL */}
            {stage === 'COMPLETE_REVEAL' && (
              <div className="mt-6 text-center space-y-4 max-w-md w-full animate-fadeIn">
                {revealStep >= 1 && (
                  <div className="text-xs text-neutral-400 tracking-[0.25em] uppercase animate-fadeIn">
                    RECONSTRUCTION COMPLETE
                  </div>
                )}

                {revealStep >= 2 && (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="border-t border-b border-neutral-800 py-3 space-y-1">
                      <div className="text-[11px] text-neutral-500 tracking-widest uppercase">MODEL</div>
                      <div
                        className="text-3xl sm:text-4xl font-black text-white tracking-wider font-mono"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        {machineDNA.modelId}
                      </div>

                      <div className="text-[11px] text-neutral-500 tracking-widest uppercase pt-2">
                        CLASS
                      </div>
                      <div className="text-base sm:text-lg font-bold text-emerald-400 tracking-wide font-mono">
                        {machineArchetype}
                      </div>

                      <div className="text-[11px] text-neutral-500 tracking-widest uppercase pt-1">
                        SOURCE
                      </div>
                      <div className="text-xs text-neutral-400 tracking-widest uppercase font-mono">
                        YOU
                      </div>
                    </div>

                    <button
                      id="btn-inspect-dossier"
                      onClick={handleProceedToDossier}
                      className="w-full py-3.5 px-4 bg-white hover:bg-neutral-200 text-black font-mono font-bold text-xs sm:text-sm tracking-[0.2em] transition-all duration-200 cursor-pointer uppercase shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-98"
                    >
                      INSPECT DOSSIER & ENDING
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="border-t border-neutral-800/80 pt-3 text-center text-xs text-neutral-600">
        Constructed deterministically from in-memory behavioral kinematics. Zero biometric images stored.
      </div>
    </div>
  );
};
