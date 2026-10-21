# Small animals: notes for the owner

Staged for approval (nothing was written into `src/assets/world`):

- Sheets and manifest: `staging/animals/<name>.png` and `staging/animals/manifest.json`
- `animals-lineup.png`: all ten animals at 4x next to the character. Flyers float at a typical height and the koi sits in a pool of river.
- `animals-anims.png`: every animation as a strip of frames at 4x, one row per animation. Animals are in this order: rabbit, deer, crow, sparrow, frog, koi, blue butterfly, yellow butterfly, dragonfly, fireflies.
- `animals-onion.png`: the three one-shots (frog jump, koi jump, dragonfly dart) with all frames overlaid, so you can check the arcs. The red dot is the anchor.
- `animals-<name>-<anim>-x.png`: zoomed frame strips of each animation, for checking single pixels.

Rebuild:

```bash
WORLD_OUT=<scratchpad>/art2/staging npx tsx tools/world-sprites/animals.ts <scratchpad>/art2
```

The output is deterministic: two runs give byte-identical files.

## The six new animals

| Sprite | Frame | Anchor | Animations | Tags | Size |
|---|---|---|---|---|---|
| frog | 42x19 | 7,17 (ground) | idle 8 @ 6 fps loop, jump 6 @ 12 fps once | animal, ambient, water | 0.1 m, drawn about 1.75x (10x8 px) |
| koi | 52x43 | 14,32 (water line) | swim 8 @ 8 fps loop, jump 10 @ 12 fps once | animal, ambient, water | 0.4 m (23 px), real size |
| butterfly_blue | 13x13 | 6,6 (body) | fly 4 @ 12 fps loop, rest 4 @ 4 fps loop | animal, ambient | 8 cm, drawn 2x (9 px wingspan) |
| butterfly_yellow | 13x13 | 6,6 (body) | fly 4 @ 12 fps loop, rest 4 @ 4 fps loop | animal, ambient | 8 cm, drawn 2x |
| dragonfly | 36x16 | 10,7 (thorax) | hover 4 @ 14 fps loop, dart 4 @ 12 fps once | animal, ambient | 0.1 m, drawn about 1.9x (11 px body) |
| fireflies | 66x53 | 32,28 (box center) | idle 12 @ 8 fps loop | ambient, light-source | 1.2 x 1 m box |

- **Koi.** This is the piece in the landmarks look. It is modelled in world space (an undulating chain of ellipsoids, thin fins) and ray-marched through the battle camera (38/57 depth), so you see its back above its near flank, the pectoral paddles and the tail fan side-on. It is lit from the upper left with clustered bands, and parts that overlap get inner lines.
  - The kohaku patches are tied to the body, so they ride the swimming wave.
  - Under the surface the colors sink into the water in depth bands and the outline turns deep teal. Out of the water it is fully saturated with a dark outline.
  - Swim: the body and tail undulate, the fins paddle, and a faint V of ripples drifts back from the nose.
  - Jump: a bulge at the nose, the breach with a splash crown, an arc about 0.4 m high, the entry crown, then rings and droplets.
- **Frog.** A pond frog in the 3/4 view the steep camera gives, so both eye bumps show. It has a pale throat, clustered back spots and a lit thigh.
  - Idle: the throat puffs out and back, then a blink.
  - Jump: crouch, push off, stretched in the air with both hind legs trailing, reaching down, the landing squash, then sitting at the landing spot.
- **Butterflies.**
  - The blue is a swallowtail: electric blue fields, black margins and tails, and a dull underside with red spots that shows when the wings close.
  - The yellow is a lemon sulphur with black forewing tips.
  - Fly: open, half, edge-on, back to half, with a 1 px bob.
  - Rest: wings closed, half, open flat to bask, half, with the antennae spread and the body still.
- **Dragonfly.** A red dragonfly (aka-tombo) with a hand-placed body. Its four glass wings are projected through the camera: the far pair shows above the body and the near pair below, each goes edge-on in turn, and the hind pair leads by a quarter beat. Each wing has a pterostigma, and a white glint appears on whichever wing faces the light.
  - Dart: a pull-back, the dash with a motion smear back to the start, a shorter smear, then hovering at the new spot.
- **Fireflies.** Seven dots, each on its own small looping path with its own blink. The core is warm yellow-green with a 1 px soft glow and no outline. At least four are lit in every frame.

All colors come from `ramp(MATERIALS.*)`: grass and young leaf for the frog, fire and lacquer red for the koi and dragonfly, river water for the tints and splashes, charred for the dark parts. The butterfly blue and yellow are the only new accents.

## Fixes to the approved four

Canvas sizes, anchors, frame counts and manifest entries are unchanged. The crow is byte-identical.

- **Sparrow:** the face is now placed by hand around the eye. It has a chestnut crown, a black eye held off the beak by a chestnut lore pixel, and a white cheek wrapped behind and under the eye. The bib is small. Before, the beak, bib and outline merged into one black mass.
- **Deer:** each spot is a 2x2 dab with a lit top and a softer bottom row. The spots sit on whole body pixels, so the walk's half-pixel bob no longer reshapes them from frame to frame.
- **Rabbit:** in the hop the belly is a thin, steady band along the bottom of the body. It no longer pops on and off as a cream block. Idle and graze are unchanged pixel for pixel.

## For the battle engine

The one-shots travel inside their own canvas. All frames share one canvas and the anchor is the start position. After the last frame, move the animal by the offset below, then resume its loop:

- frog jump: ends sitting 27 px (0.47 m) to the right
- dragonfly dart: ends hovering 20 px (0.35 m) to the right
- koi jump: dives back in 25 px (0.44 m) to the right of the anchor. The last frame is only the fading ring, so resume swim at the new spot.

## Decisions you may want to revisit

1. **Butterfly view.** Both butterflies are drawn from above and behind: symmetric, with the wings toward the camera. A side profile facing right was tried, but at 9 px the closed wings read as a fin or a hat. This view is the classic open, half, edge-on, back flutter the brief lists, and it needs no mirroring. A profile version would mean redrawing the templates.
2. **Sizes.** The frog is about 1.75x (10 px), not exactly 1.6x (9 px), because at 9 px the throat pulse and the jump poses stopped reading. The dragonfly is about 1.9x.
3. **Fireflies in daylight.** They follow the brief (a 1 px core with a 1 px glow), so on a bright daytime stage they are small. They are meant for dusk and night maps. A 2 px core would make them read in daylight.
4. **Sparrow cheek spot.** The tree sparrow's black cheek spot was dropped. At 1x it read as a second eye.
5. **Water tint.** The koi's under-water colors are baked against the shared river color (`MATERIALS.water`). Water of a very different color would need a retint.
