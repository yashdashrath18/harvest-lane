# Harvest Lane: platform compatibility notes

## Standalone browser mode (validated)
- Runs from any static host or local server with no backend.
- Verified viewports: 360x640, 390x844, 540x960, 768x1024,
  1280x800, and landscape 844x390 (pillarboxed, playable).
- Inputs verified: WASD and arrow keys, mouse click and
  tap-to-move, touch joystick drag (emulated Android).
- Progress saves to localStorage (versioned schema, corrupt
  payload backed up and discarded safely).
- The game boots and plays even when the Playables SDK script
  fails to load or is blocked.

## YouTube Playables (implemented from official docs; environment
validation pending programme access)
Implemented against the SDK reference and integration requirements
at developers.google.com/youtube/gaming/playables, checked
2026-10-30:
- SDK script (https://www.youtube.com/game_api/v1) loads in the
  document head before the game bundle.
- firstFrameReady at first render; gameReady from the main menu
  once interactable; order verified with a mock SDK.
- Cloud save through loadData and saveData only; loadData is
  awaited before the first saveData. In the environment, no
  progress is written to localStorage (verified with the mock).
- Platform audio state (isAudioEnabled, onAudioEnabledChange)
  overrides in-game volume sliders, as required.
- Pause and resume handled only via onPause and onResume in the
  environment; onPause saves progress before freezing.
- Mock-SDK run (Phase 8) verified call order, cloud restore,
  platform mute, pause-save-resume, and audio re-enable.

Not yet validated:
- Behaviour inside the real Playables runtime and the official
  SDK Test Suite (programme access is still pending).
- The rewarded-ad API against the real SDK (wrapper exists, no
  gameplay placement uses it).
- Real-device frame rate, touch feel, and audio quality (headless
  tests cannot measure these; they need a device playtest).

## Known limitations
- Portrait-first design; landscape shows a centred, smaller
  pillarboxed view.
- Crop growth timers, queued customers, and animal timers reset
  on load (fields replant with staggered growth); all durable
  progress (money, upgrades, unlocks, missions, inventory, stock,
  player position, volumes) is saved.
- English only.
