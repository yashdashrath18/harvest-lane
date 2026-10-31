# Third-party assets used in Harvest Lane 3D

Everything below is CC0 (public domain dedication): usable commercially,
including in a YouTube Playables submission, with no attribution required.
Credit is recorded here anyway, because it is good practice.

## Used in the game

### Sound effects: Kenney audio packs (CC0)
Source: https://kenney.nl — packs: Interface Sounds, RPG Audio,
Impact Sounds, Casino Audio, Music Jingles. Downloaded 2026-10-31.
Files in `assets/audio/`, renamed for the game. All binary assets are
embedded into the JS bundle as base64 at build time
(`scripts/embed-assets.mjs`), so the game ships self-contained:

| Game file | Original | Pack |
| --- | --- | --- |
| click.ogg | click_001.ogg | Interface Sounds |
| confirm.ogg | confirmation_001.ogg | Interface Sounds |
| error.ogg | error_001.ogg | Interface Sounds |
| pluck.ogg | pluck_001.ogg | Interface Sounds |
| chop.ogg | chop.ogg | RPG Audio |
| chips1.ogg | chips-collide-1.ogg | Casino Audio |
| chips2.ogg | chips-stack-1.ogg | Casino Audio |
| jingle.ogg | jingles_STEEL10.ogg | Music Jingles |
| step0-4.ogg | footstep_grass_000-004.ogg | Impact Sounds |

The AudioSystem plays these when loaded and falls back to the game's
original synthesized effects when they are not. Music stays synthesized
(original composition in code). Chicken and cow sounds stay synthesized:
no CC0 animal recordings were in the packs.

### Cow model: Quaternius (CC0)
`assets/models/Cow.glb`, from the Quaternius animals set, converted to
GLB by the Quaternius showcase project
(https://github.com/trebeljahr/quaternius-showcase, models themselves
CC0 by Quaternius). Skeletal clips used: Walk, Eating, Idle_Headlow,
Idle. The procedural cow remains in code as a fallback.

### Carrot models: Quaternius Ultimate Crops (CC0)
`assets/models/Carrot_1.glb` to `Carrot_4.glb` (four growth stages),
same source as above. Converted at load time into the game's merged
vertex-coloured geometry format; the pack palette is lifted 1.45x
because it is authored for a tone-mapped viewer and read too dark
under this game's lighting.

## Evaluated and NOT used

- **Quaternius corn (Ultimate Crops)**: tested in-game at the correct
  scale on 2026-10-31. The ripe stage reads as thin weeds with no
  visible cobs; the game's procedural corn (chunky stalk, wide leaves,
  three gold cobs) reads better on a phone. Corn stays procedural.
- **Quaternius Farmer (modular men)**: the GLB ships with no animation
  clips, so swapping would lose the farmer's walk cycle. The procedural
  farmer stays.
- **Quaternius chicken**: the Farm Animals pack contains no chicken
  (cow, horse, llama, pig, pug, sheep, zebra only). Chickens stay
  procedural.
- **Kenney Pattern Pack / Poly Haven / ambientCG textures**: the
  patterns are decorative, not ground textures, and the photo libraries
  are photorealistic and heavy (about 8-10 MB per texture at 1K),
  clashing with the game's bright flat look and size budget. The
  procedural grass and soil stay.
- **Assetsmith Cute Farming SFX ($1.99, CC0)**: would add real chicken
  and cow recordings; not purchased. Candidate if animal sounds are
  wanted later.
