# HUMAN?

**You say you are. PROVE IT.**

HUMAN? is a short cinematic browser experiment. The user completes four behavioral tests, receives a fake human-verification result, then enters a camera-based local face-training sequence and a deliberately desynchronized mirror before the final plot twist.

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
npm run build
npm run preview
```

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
  scenes/
    LandingScene.tsx
    BootScene.tsx
    MotorTestScene.tsx
    InstinctTestScene.tsx
    ObedienceTestScene.tsx
    DecisionTestScene.tsx
    AnalysisScene.tsx
    CameraPermissionScene.tsx
    FaceTrainingScene.tsx
    MirrorScene.tsx
    TwistScene.tsx
    ResultScene.tsx
  tracking/
    CameraManager.ts
    FaceTracker.ts
    PointerTracker.ts
  scoring/ScoreEngine.ts
  audio/AudioEngine.ts
  App.tsx
```

## Current development status

The complete experience route exists. The current milestone upgrades the Google AI Studio prototype from simulated camera behavior to real local gesture detection, correct camera lifecycle handling, real pointer measurements, and a stronger mirror desync effect.
