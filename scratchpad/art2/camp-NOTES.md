# Camp props: rebuild in the landmarks style

Generator: `tools/world-sprites/camp.ts` (rewritten; no other repo file touched).
Run: `WORLD_OUT=<art2>/staging npx tsx tools/world-sprites/camp.ts <art2>`.
`CAMP_ONLY=tent,barrel` builds only some sprites (review crops only, no sheets).

Review files:
- `camp-lineup.png`: every sprite at 3x on the stage green, with the stone lantern and the boulder (read from the approved landmarks sheets) and the character.
- `camp-anims.png`: every animation as a labelled strip, 3x.
- `camp-<name>-zoom.png` and `camp-<name>-<anim>.png`: per-sprite zooms and strips.

Staged sheets and manifest: `staging/camp/`. Same names, animation names, frame counts, fps, loop flags, tags and meters as before, so the game needs no changes.

## What changed
- **Pipeline.** The landmarks mesh renderer is copied into camp.ts (camera, G-buffer, Lambert light with cast shadows, `band()` clusters, crests, inner lines, despeckle, kit outline). I added four things:
  - per-pixel uv for seams, patches, staves and paint;
  - two-sided cloth;
  - burn-through holes that show what lies behind;
  - a fold-normal gain, so creases show on cloth that faces the light. I also added a small-cluster cleanup (`declump`) for cloth and crate tops.
- **Campfire.** Faceted stones and crossed tube logs with bark, cut ends and charcoal. The charcoal has irregular cracks, so it never reads as bricks.
  - Burning: v1-style flames in hard bands (dark-red rim, red tips, orange body, small yellow core, a few white pixels) and embers. Fire light falls on whatever faces the flames (back stones, log tops, ash).
  - Smoldering: clumps of glowing coals, a few glowing cracks and a thin wisp.
  - Out: charred, shorter logs and ash.
- **Smoke.** Lit puffs with soft separation between them, alpha 170 at the foot fading to about 100 at the top. No outline. Anchor at the foot.
- **Tent.** The near slope is a cloth grid with sag, tension creases from the pole tops, curtain folds between the pegs, scalloped hem, panel seams, a ridge crest, two stitched patches and mud at the hem.
  - The front is open: you see the dark inside (inner far slope, back gable, floor) with the pole in the doorway.
  - The door flap is thrown back and sways (4 frames). Pole ends, pegs and guy ropes are drawn with a depth test, and the ropes cast a 1 px shadow.
  - Burnt: real holes into the dark inside, charred rims, soot streaks, a broken sagging ridge pole, a leaning front pole, a burnt flap remnant and a snapped front rope.
- **Barrel.**
  - Built from 16 staves, each one flat facet, with seams and grain, iron hoops with lit edges and rivets, and a recessed lid with boards and a bung.
  - Hit: it rocks off its edge and settles with a split stave, splinters and dust.
  - Broken: bulge, burst, staves tip over and twist into a heap, hoops drop and scatter, the lid flips. Every piece is re-rendered as a lit mesh each frame.
- **Explosive barrel.** Red lacquer, a painted flame mark that follows the curve, three rope coils, two hoops and a rising fuse.
  - Lit: 4 frames of fuse sparks.
  - Explode: swell with fire leaking through the seams, then a white flash, a banded fireball rolling into dark then grey smoke, and a ground skirt of dust. Charred staves, hoops and the lid fly out and land as planks around the scorch mark, with embers. Every frame uses the big canvas, with the barrel at the same anchor.
- **Crates.**
  - Recessed boards with seams, raised battens (inner lines, cast shadows), a diagonal or X brace, nails, and lid boards with a lit lip.
  - Broken: squash with a crack, then the boards burst off and fall into a pile of planks.
  - The stack is two crates plus a smaller one turned on top.
- **Sacks.** Three lofted burlap sacks: two lying side by side and one draped across them. Each has gathers into a rope-tied neck, a frayed tuft, ears at the sewn end, a stitched seam, and one has a red seal (a ring and a dot, no characters).
- **Weapon rack.** Feet, posts, base board, a rail and a top beam with upturned ends. It holds two spears (one leaf blade, one cross blade) with red cord at the sockets and a bo staff with iron caps, all with cord ties.

## Sizes (opaque px; character = 100 px)
| Sprite | Size | Note |
|---|---|---|
| campfire | 56 x 76 | ring 1 m wide; the flames reach about 0.75 m |
| smoke | 33 x 102 | |
| tent | 204 x 181 | ropes included; the body is about 2.6 m long with a 1.75 m ridge |
| barrel | 36 x 73 | 0.6 x 0.9 m plus the top ellipse |
| crate | 64 x 88 | 0.8 m cube |
| crate_stack | 110 x 134 | |
| sacks | 71 x 46 | |
| weapon_rack | 78 x 101 | tallest blade about 1.6 m |

Screen heights are larger than meters x 57 because the camera shows the tops and footprints at 38 px per meter of depth, like the landmarks.

## Unsure / for the owner
- **Tent size.** The tent is 181 px tall on screen (about 1.8 x the character), like v1. It is big because of the 2 m ridge plus its deep footprint. If it dominates the camp scene, I can shrink the base or turn it more side-on.
- **Tent entrance.** I opened the whole front (both door halves), so the entrance reads as a dark triangle at game scale. The near flap folds back over the slope and sways. If you want one closed door half instead, the opening becomes a thin sliver at this angle.
- **Explosion debris.** The 16 charred staves land as planks around the scorch and stay there. Tell me if you prefer fewer pieces.
- **Canvas colour.** The canvas is the light `MATERIALS.canvas`, so the tent's step 2 shadow reads slightly pink. That is the shared ramp's hue shift; I didn't override it.
- **Explosive barrel fuse.** It is small (about 8 px of cord). The sparks read at 2x, but the unlit fuse is subtle.
- **Smoke anchor.** The anchor is the foot of the column, and the column drifts right as it rises. CampScene still places it with the old offset above the fire, which still lines up.
