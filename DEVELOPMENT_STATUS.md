# HUMAN? — Development Status

## COMPLETED
- **Milestone 1 Core Systems**:
  - **ExperienceDirector (`/src/director/ExperienceDirector.ts`)**: Centralized narrative and tension coordinator managing progression states (`NORMAL`, `OBSERVING`, `PREDICTING`, `LEARNING`, `UNSTABLE`, `REVEALED`, `RECONSTRUCTING`), syncing Web Audio drone filters and tension parameters across all scenes.
  - **SessionMemory (`/src/memory/SessionMemory.ts`)**: Purely client-side behavioral tracking service capturing first movement latency, path distance, peak velocity, direction changes, longest idle periods, premature actions, instruction violations, non-interactive clicks, decision switches, hover hesitation, camera permission, face acquisition, gesture successes/retries, mirror stillness, and secret discoveries with zero external data exfiltration.
  - **Dynamic Narrative Extension (`/src/behavior/DynamicNarrative.ts`)**: Rule-based, deterministic observation engine analyzing actual recorded telemetry ("You rarely hesitate.", "You reconsider often.", "Instructions appear optional to you.", "You are unusually controlled.", "You moved before I finished.") with history deduplication.
  - **Upgraded Motor Test (`/src/scenes/MotorTestScene.tsx`)**: 3-round kinetic trial featuring static calibration (Round 1), smooth orbital harmonic drift (Round 2), and deceptive approach-triggered micro-dodge (Round 3) to record neuromuscular compensation reflexes.
  - **Upgraded Instinct Test (`/src/scenes/InstinctTestScene.tsx`)**: High-framerate biological procedural specimens (amoeba, crystalline nerve, biocellular rings, harmonic filament wave) that dynamically agitate and excite upon selection.
  - **Upgraded Obedience Test (`/src/scenes/ObedienceTestScene.tsx`)**: Optical decoy blip distraction during the 5-second countdown, yielding authentic behavioral verdicts ("I knew you would." vs "Interesting restraint.").
  - **Upgraded Decision Test (`/src/scenes/DecisionTestScene.tsx`)**: Seed-driven rotation across 4 evocative dilemmas with ethical choice tracking and latency profiling.
  - **New Memory Test Scene (`/src/scenes/MemoryTestScene.tsx`)**: 2.8s sensory presentation of 5 procedural glyphs, glitch masking, 4-choice retrieval, latency and confidence hesitation capture ("Are you certain?" -> "Memory confidence recorded.").
  - **New Prediction Scene (`/src/scenes/PredictionScene.tsx`)**: 3-round LEFT/RIGHT anticipation trial with real-time vector and alternation-bias prediction locked before clicks, context-sensitive feedback ("Prediction confirmed.", "You changed your mind.", "Unexpected."), and transparent predictability scoring.
  - **Hidden Behavior Reactions & Clinical Whispers (`/src/behavior/HiddenBehaviorEvents.ts`, `/src/components/ClinicalWhisper.tsx`)**: Sparse, rate-limited clinical notifications triggered by rapid clicking ("Impatient."), non-interactive text clicks ("That isn't a button.", "Stop."), idle pauses ("Are you still there?"), landing hesitation ("Afraid to begin?"), and corner reticle dwell ("You found something.").
  - **Behavior Reveal Scene (`/src/scenes/BehaviorRevealScene.tsx`)**: Stepped telemetry synthesis archive revealing recorded behavioral traits, culminating in the pivotal narrative shift: "HUMAN MODEL SUFFICIENT".

- **Milestone 2 Cinematic Camera, Face-Training, & Mirror Evolution**:
  - **Visual Test Transition (`/src/scenes/CameraPermissionScene.tsx`)**: "FINAL VISUAL TEST" framing with explicit on-device privacy guarantee, zero-friction simulated fallback ("CONTINUE WITHOUT CAMERA"), and director tension escalation into `LEARNING` state.
  - **Clinical Face Training Interface (`/src/scenes/FaceTrainingScene.tsx`)**: Corner reticle scanner with 9 key landmark projections (no carnival dots), ~1s stable neutral-face baseline calibration, sequential 5-gesture story arc (LOOK LEFT -> LOOK RIGHT -> SMILE -> TILT YOUR HEAD -> BLINK), per-gesture 8s timeout with single retry before graceful partial-sample advancement ("PATTERN INCONCLUSIVE"), evolving training nomenclature ("LEARNING CRANIAL YAW VECTOR", "RECORDING INVERSE ROTATION RESPONSE", "TRAINING FACIAL MOTOR MIMICRY", "ACQUIRING NATURAL ASYMMETRY", "FINALIZING VOLUMETRIC IMITATION MATRIX"), and restrained completion climax ("I think I have enough.").
  - **Mirror Desynchronization Sequence (`/src/scenes/MirrorScene.tsx`)**: Gradual sync degradation (Live -> 90ms -> 240ms frame stutter -> 480ms lag -> autonomous replay of previous movement with subtle directional reversal), "Remain still." prompt followed by chilling "Which one of you moved first?", clinical non-comedic "DISCONNECT SENSOR" escape option yielding "TRANSFER IN PROGRESS // DISCONNECT LOCKED", status escalation (SYNC ERROR -> IDENTITY CONFLICT -> SUBJECT / MODEL COLLISION -> SUBJECT NO LONGER REQUIRED), memory-conscious circular frame buffer with immediate cleanup, and graceful fade into pure blackout.
  - **Climactic Reveal Scene (`/src/scenes/TwistScene.tsx`)**: Absolute silence with paced typography reveal: "You thought this was a test." -> "It was training." -> "You were human." -> "I just needed to learn how." with sub-bass drop into final dossier reconstruction.
  - **Preserved Pipeline Continuity & Resilience**: Full end-to-end traversal works identically and compellingly with live webcam or simulated optical matrix, strictly honoring zero-breakage and client-only privacy invariants.

- **Milestone 3 Machine Reconstruction & Behavioral DNA Engine**:
  - **Behavioral DNA Model (`/src/dna/MachineDNA.ts`)**: Normalized [0.0, 1.0] behavioral profile derived from raw telemetry metrics (humanity, curiosity, obedience, instinct, decision speed, predictability, motor chaos, motor precision, hesitation, exploration, instruction resistance, memory confidence, and face training completion) powered by a deterministic seeded LCG random generator.
  - **Centralized Ending Resolver (`/src/dna/EndingResolver.ts`)**: Evaluates real behavioral conditions and rarity gates to determine exactly 1 of 4 endings: `VERIFIED` (baseline normative variance, ~56%), `ANOMALY` (high exploratory curiosity/resistance with volatile trajectory, ~18%), `MACHINE` (low hesitation, geometric kinematic linearity, ~24%), and the rare `REPLACED` ending (complete facial imitation synthesis & dual-nucleus identity, ~1.2%). Also produces 1–3 non-contradictory clinical commentary statements.
  - **Machine Twin Procedural Organism (`/src/visuals/MachineTwinCanvas.tsx`)**: High-framerate abstract digital organism featuring 5 distinct generative assembly layers (Core nucleus, Structural geometric polygons, Signal network lines, Sensor satellite reticles, and Particle aura field). Deterministically responds to DNA dimensions, endings (emerald/white, amber/red, cold cyan, and phantom rose), quality tiers (desktop/tablet/mobile), `prefers-reduced-motion`, and subtle tactile pointer interaction.
  - **Machine Reconstruction Sequence (`/src/scenes/MachineReconstructionScene.tsx`)**: Post-twist transition moving through paced clinical stages: "RECONSTRUCTION SEQUENCE INITIALIZED" -> "SOURCE SUBJECT [ID]" -> "BUILDING MODEL..." -> stepped matrix compilation logs -> gradual 5-layer visual assembly -> "RECONSTRUCTION COMPLETE" model reveal.
  - **Result Identity V2 (`/src/scenes/ResultScene.tsx`)**: Updated classification dossier integrating the interactive procedural Machine Twin, ending rarity badges, rule-based commentary bullets, granular telemetry bars, and 1080x1920 Story Card export.
  - **Pipeline & State Integration (`/src/App.tsx`, `/src/types.ts`, `/src/director/ExperienceDirector.ts`)**: Seamless orchestration linking Twist -> Reconstruction -> Result with complete backward compatibility and memory preservation.

- **Milestone 4 Productization & Viral Polish**:
  - **Returning User System (`/src/memory/UserMemory.ts`)**: Persists non-sensitive session metadata across visits (`visitCount`, `previousEnding`, `previousMachineClass`, `previousMachineId`, `previousHumanityRange`, `secretsDiscovered`, audio preference) strictly in client-side `localStorage`. Adapts Landing and Boot sequences with subtle clinical recognition cues ("Subject recognized.", "We've met before.", "H-X91?").
  - **Secret Discovery System (`/src/behavior/SecretRegistry.ts`, `/src/behavior/HiddenBehaviorEvents.ts`)**: Comprehensive discovery registry for 6 hidden anomalies (`CORNER_WATCHER`, `IMPATIENT_SUBJECT`, `SYSTEM_TOUCH`, `SILENT_SUBJECT`, `PREDICTION_BREAKER`, `RETURNING_SUBJECT`). Integrated listeners with full unmount cleanup (`destroy()`) preventing memory leaks on restart.
  - **Challenge Protocol (`/src/utils/ChallengeMode.ts`)**: Zero-backend, URL-safe base64 challenge encoding and decoding with strict length, character whitelist, and numeric range sanitization. Displays comparative evaluation blocks on Challenger landing, boot acknowledgment, and final dossier confrontation.
  - **Dossier Polish & Progressive Disclosure (`/src/scenes/ResultScene.tsx`)**: Stepped entry transitions, ending rarity indicators, dual aspect ratio share card generator (9:16 Story + 1:1 Post), ending-specific atmosphere aura (emerald, amber, cyan, rose), "ANOMALIES DISCOVERED: X / ?" counter, and direct challenge link sharing.
  - **Audio Engine Polish & HUD Synchronization (`/src/audio/AudioEngine.ts`, `/src/components/HeaderHUD.tsx`)**: Audio mute state persistence, clean sound toggle with visual status, ambient drone fade-out/reset, and seamless background pause via `visibilitychange`.
  - **Privacy & About Overlays (`/src/components/PrivacyModal.tsx`)**: Dual-tab accessible modal detailing on-device processing, zero facial recognition, in-memory video purging, and spoiler-free artistic statement with non-medical disclaimer.
  - **Adaptive Quality & Tab Sleep (`/src/visuals/MachineTwinCanvas.tsx`)**: Automatic device quality tier selection (desktop, tablet, mobile) adjusting particle density and geometry layers, plus `visibilitychange` loop sleeping to conserve mobile battery.

- **Phase 1 (Build & Typecheck)**: Verified strict TypeScript compilation and Vite production build with zero errors.
- **Phase 2 (Architecture Cleanup & Session Object)**: Implemented unified `SessionData` interface in `types.ts` containing granular test telemetry (`motor`, `instinct`, `obedience`, `decision`), classification archetypes, and clinical commentary.
- **Phase 3 (Behavior Engine)**: Created `BehaviorEngine.ts` to compute genuine physical kinematics (distance, speed, acceleration, corrections, overshoots, trajectory, hesitation) with zero fabricated numbers.
- **Phase 4 (Motor Test)**: Enforced strict 3-round sequence with varying target scales, positions, responsive pointer/touch interaction, and real-time kinematic telemetry overlay.
- **Phase 5 (Instinct Test)**: Seed-driven generative procedural shapes, tracking hover history and reaction latency with staged narrative responses.
- **Phase 6 (Obedience Test)**: Responsive desktop/mobile awareness ("DO NOT MOVE" vs "DO NOT TOUCH"), micromovement detection, and staged suspicious verdicts.
- **Phase 7 (Decision Test)**: 4 ethical choices, reaction latency measurement, and dynamic rule-based narrative observations.
- **Phase 8 (Dynamic System Messages)**: Implemented `DynamicNarrative.ts` generating contextual observations and archetype classifications without LLMs.
- **Phase 9 (Score Engine)**: Refined composite scoring with bounded humanity range (74% - 98%), small seeded variation (±1.4%), and 8 distinct archetype classifications.
- **Phase 10 (Fake Human Verification)**: Stepped Bayesian calculation, first appearance of emerald green, and "COMPLETE SESSION" interaction.
- **Phase 11 (Plot Twist Transition)**: Dramatic pause -> glitch -> "ADDITIONAL SAMPLE REQUIRED" -> "VISUAL TRAINING REQUIRED".
- **Phase 12 (Camera System)**: Privacy disclosure ("Camera frames are processed locally on your device. No video is uploaded or stored"), HTTPS requirement check, and fallback button.
- **Phase 13 & 14 (Face Tracking & Calibration)**: Neutral pose calibration, throttled inference (25 FPS), dynamic gesture checks (LOOK LEFT, LOOK RIGHT, SMILE, TILT YOUR HEAD, BLINK), and 8.5s timeout with fallback.
- **Phase 15 & 16 (Mirror Engine & Desync)**: Progressive delay ladder (0ms -> 500ms), 90-frame in-memory buffer, old motion slice replay anomaly, and immediate buffer destruction upon exit.
- **Phase 17 (Twist)**: Abrupt silence, blackout, and paced typography ("You were human." -> "I just needed to learn how.").
- **Phase 18 (Audio Polish)**: Procedural Web Audio engine with master mute, ambient drone, mechanical clicks, and glitch bursts.
- **Phase 19 (Machine Identity)**: Derived model identifier (e.g. H-X91), archetype classifications, and clinical commentary.
- **Phase 20 (Generative Identity Visual)**: Procedural entity canvas (`GenerativeIdentityCanvas.tsx`) reflecting curiosity, obedience, instinct, and humanity.
- **Phase 21 (Share Card & Actions)**: 1080x1920 Story Card generation with embedded generative entity, Web Share API support, PNG download, and in-memory replay.
- **Phase 22 & 23 (Responsive, Mobile & Performance)**: Touch event support, viewport scaling controls, and canvas cleanup.
- **Phase 24 (Privacy Modal)**: Dedicated `PrivacyModal.tsx` accessible from HUD and landing page detailing local-only processing.
- **Phase 25 (Accessibility & Error Handling)**: `ErrorBoundary.tsx` and keyboard/mute controls.
- **Phase 28 (SEO & Favicon)**: Updated `index.html` with exact meta tags and inline SVG favicon.

## IN PROGRESS
- Continuous end-to-end interactive polish and cross-device testing.

## NEXT
- Optional local bundling of MediaPipe WASM/model assets to eliminate public CDN dependencies if offline support is requested.
- Deploy to production HTTPS hosting (Vercel, Netlify, Cloudflare Pages, etc.).

## KNOWN ISSUES
- None detected. `npm run typecheck` and `npm run build` both pass with code 0.
