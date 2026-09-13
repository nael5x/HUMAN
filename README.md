# HUMAN?

**You say you are. PROVE IT.**

HUMAN? is a short cinematic browser experiment. The user completes six behavioral evaluations (Motor, Instinct, Obedience, Decision, Memory, and Prediction), receives a clinical analysis breakdown, then enters a camera-based local face-training sequence and a deliberately desynchronized mirror before the final plot twist and machine reconstruction dossier.

## Stack

- React 19 + TypeScript
- Vite + Tailwind CSS
- MediaPipe Tasks Vision / Face Landmarker
- Web Audio API
- Canvas 2D frame buffering for the mirror effect

There is no backend, database, Gemini API, account system, or admin panel in the MVP.

## Run locally

Requirements: Node.js 20+ recommended.

```bash
npm install
npm run dev
```

Then open the local Vite URL. `localhost` is treated as a secure camera context by browsers.

Production check:

```bash
npm run typecheck
npm run test
npm run build
npm run preview
```

## Automated Test Suite

Deterministic modules and core runtime protocols are verified using Vitest:

```bash
npm run test
```

Included unit and integration test coverage:
- **`src/__tests__/MachineDNA.test.ts`**: Normalized metric clamping in `[0.0, 1.0]`, deterministic session seed generation via `SeededRandom`, and archetype classification mapping (e.g., `CURIOUS ANOMALY`, `NON-COMPLIANT UNIT`, `UNSTABLE EXPLORER`, `INSTINCTIVE MODEL`, `LOGICAL SUBJECT`, `PASSIVE ANALYST`, `ADAPTIVE OBSERVER`).
- **`src/__tests__/EndingResolver.test.ts`**: Verifies all 4 deterministic endings (`VERIFIED`, `ANOMALY`, `MACHINE`, `REPLACED`), boundary edge cases, rarity thresholds, and non-contradictory clinical commentary synthesis.
- **`src/__tests__/ChallengeProtocol.test.ts`**: Round-trip encode/decode parity, input sanitization, whitelist ending fallback, and injection rejection.
- **`src/__tests__/UserMemory.test.ts`**: Storage key schema migration (`human_user_memory` to `human_user_memory_v2`), strict session visit count deduplication against React re-renders, and corruption recovery.
- **`src/__tests__/FullSessionFlow.test.ts`**: End-to-end simulated playthrough from initial boot through every test stage to machine reconstruction and challenge card generation.

## Continuous Integration (CI)

A GitHub Actions workflow is provided in `.github/workflows/ci.yml` that automatically runs on every push and pull request:
1. Clean dependency installation via `npm ci`
2. Strict TypeScript typechecking (`npm run typecheck`)
3. Unit and integration test suite (`npm run test`)
4. Production bundle compilation (`npm run build`)

## Camera and face tracking

The camera permission is requested only after the user presses **ENABLE CAMERA**. A successful browser permission is required before the session records `cameraGranted=true`.

When camera mode is active, MediaPipe Face Landmarker is loaded in the browser and used to detect:

- face presence / landmarks
- left and right head rotation
- smile blendshapes
- head tilt
- blink blendshapes

The experience does not implement identity recognition, age/gender inference, or emotion diagnosis. Camera frames are not uploaded or recorded by this application.

MediaPipe WASM/model assets are currently loaded from pinned public URLs. The actual video inference runs on-device. If the face tracker cannot load, the experience falls back to the clearly-labelled simulated optical matrix instead of breaking the flow.

## Mirror effect

The mirror keeps a rolling in-memory frame buffer. It gradually displays older frames to create latency, then replays a short earlier motion slice to produce the final desynchronization illusion. The buffer is discarded when the scene ends.

## Main source layout

```text
src/
  behavior/
    DynamicNarrative.ts      # Contextual clinical observations
    HiddenBehaviorEvents.ts  # Secret anomaly watcher & unmount cleanup
    SecretRegistry.ts        # 6 hidden anomalies definitions & tracker
  components/
    ClinicalWhisper.tsx      # Ambient sparse narrative feedback
    ErrorBoundary.tsx        # In-world crash protection
    HeaderHUD.tsx            # Stage indicator, audio toggle, reset & privacy
    PrivacyModal.tsx         # Local processing statement & artistic about modal
    ScreenOverlay.tsx        # CRT scanline, flicker, and aberration filter
  director/
    ExperienceDirector.ts    # Centralized tension & audio-drone coordinator
  dna/
    EndingResolver.ts        # 4 deterministic endings (VERIFIED, ANOMALY, MACHINE, REPLACED)
    MachineDNA.ts            # Normalized behavioral chromosome & SeededRandom
  memory/
    SessionMemory.ts         # In-memory runtime telemetry capture
    UserMemory.ts            # Safe client-only persistence for returning users
  scenes/
    LandingScene.tsx         # Entry gate with challenge detection & returning whisper
    BootScene.tsx            # Terminal calibration sequence
    MotorTestScene.tsx       # 3-round kinetic compliance trial
    InstinctTestScene.tsx    # Procedural organism attraction trial
    ObedienceTestScene.tsx   # Micromovement restraint trial
    DecisionTestScene.tsx    # Seeded ethical dilemma trial
    MemoryTestScene.tsx      # Glyphic recall confidence trial
    PredictionScene.tsx      # Anticipation engine trial with breaker secret
    BehaviorRevealScene.tsx  # Telemetry synthesis breakdown
    AnalysisScene.tsx        # Fake verification & glitch pivot
    CameraPermissionScene.tsx# On-device visual sensor opt-in
    FaceTrainingScene.tsx    # Real local MediaPipe cranial training sequence
    MirrorScene.tsx          # Memory-buffered desync & identity transfer
    TwistScene.tsx           # Narrative blackout & plot revelation
    MachineReconstructionScene.tsx # Stepped procedural organism assembly
    ResultScene.tsx          # Dossier, procedural twin, challenge comparison, dual card export
  tracking/
    CameraManager.ts         # Local stream lifecycle & canvas buffer
    FaceTracker.ts           # MediaPipe Vision local inference
    PointerTracker.ts        # Micro-kinematic telemetry sampler
  utils/
    ChallengeMode.ts         # URL-safe, zero-backend challenge protocol
  visuals/
    MachineTwinCanvas.tsx    # 5-layer procedural organism with adaptive quality & sleep
  audio/
    AudioEngine.ts           # Procedural Web Audio synthesizer drone & click generator
  App.tsx                    # Main state coordinator & visibility watcher
```

## Current development status

Milestones 1, 2, 3, and 4 are completely implemented and verified. The application operates entirely client-side with zero external data transmission, delivering a complete cinematic and viral narrative experience.
