# Venom cobra (poison beast), copied from the owner's poison sheet

Source: his poison sheet (`docs/reference/poison-set-owner-reference.jpg`), panel
BEAST (COBRA, APPROVED, IN GAME). He did not keep our cobra. He repainted it as a rearing hooded
cobra: green-and-yellow scaled coils on the ground, hood and head raised, open jaws with fangs, a
rosy-amber eye, venom dripping, and purple venom mist around it, in two poses (LEFT and RIGHT). His
two poses are fly frames 0 and 5. The six in-betweens are built from his own pixels.

This job covers only the beast. The rest of the poison set (and its wall) belongs to the set artist.
Everything below describes the build that is staged now (review r2 fixes): data module md5
`f6d62358fc5bb11ecb808ac74fee66ee`, `poison.png` md5 `457b88fd8aa07763e85f078113ebc65d`,
`manifest.json` md5 `7d95d948c2bb86814b755c24cd775409`.

## The sprite

| | before (in game, `vfx_beasts/poison`) | now (`vfx_beasts_cobra/poison`, staging) |
|---|---|---|
| frame | 156 x 93 | **176 x 105** (the union of all 8 frames + 1 px) |
| anchor | [95, 32] (neck base) | **[98, 58]**: the centre of the body's mass, the same point in both of his poses |
| meters | [2.6, 1.8] | [3.1, 1.8] |
| fly | 8 frames, 12 fps, loop | **8 frames, 10 fps, loop** (0.8 s per loop; brief: "Beasts: no change") |
| sheet row | 1248 px | **1408 px** wide (under 8192) |

The sprite faces right, and the renderer mirrors it. Its tag is `vfx`, as before. At the same flight
height the head sits about 26 px higher than the old cobra's (the anchor is the body's mass centre).

## Scale

His character measures 99 px (blast), 98 (wall), 97 (wall_diag) and 96 (wall_depth). The median is
97.5 px against our 96 (0.985). A JPEG edge moves each end by about a pixel, so the scale is 1.00
within what can be measured, and his pixels are taken **one to one** (nothing is resampled). If a new
reference measures more than 3 % away from 1, the converter stops and says so.

## What changed in this pass (review r2)

1. **Tail tip (major).** The tip is no longer resampled pixel by pixel. The last 14 px of his tail (101 px
   of his LEFT tip, 78 px of his RIGHT tip) is cut as one rigid piece of his pixels. Frames 1, 2 and 7 carry
   his LEFT tip, frames 3, 4 and 6 his RIGHT tip (the nearer picture). The piece is turned about its joint
   (each frame pixel sampled 4 x 4 times back into his picture, nearest pixel, kept where half the samples
   land on his tip, in the colour most of them land on), so every frame shows his own thin taper.
   - The tip turns one way, over the top: his curled LEFT tip (-55.6 deg) rises, leans over to the left and
     lies down as his long RIGHT point (133.8 deg = -226.2 deg), and comes back the same way.
   - Its joint goes along the line between his two joints, sunk 5 px at mid-sweep, so the tip never rises.
     The tail from its low point to the joint bends to carry the joint there with the heading the piece needs
     (the smallest smooth extra turn, solved by damped minimum-norm Newton steps).
   - The tip travels its path at an even speed in each half: 8.5, 8.5, 8.4, 8.4, 7.8 px per frame out, and
     12.6, 13.9, 14.1 back (was 7.0 out and 11.6 back, with its height zigzagging).
   - Tip angle per frame (deg): -55.6, -85.7, -113.2, -140.9, -174.6, **-226.2**, -150.9, -104.1. It only
     turns one way within each half. The steps are not equal (27-52 deg out, 47-75 back), because I timed
     the tip by distance travelled instead. Equal angle steps would make the tip move 5.0 to 10.6 px out and
     up to 16.6 px back.
   - Drawn tip end (its last 3 px, y from the anchor): -11.5, -11.1, -8.0, -2.5, 4.2, **10.7**, -0.5, -9.3.
     It goes down every frame out and up every frame back.
   - Width of the tail end (px per px of length, 3 px windows, from the tip, rim included): over the last
     3 px the in-betweens are at most 4.3-5.0 px across, against his 4.7 and 5.0. Over the last 10 px they are
     at most 7.0, against his widest 6.3 (turning a thin shape on a slant adds up to about a pixel).
     There are no clubs, barbs or hammerheads (the converter fails above his widest + 1 px over 10 px, or
     + 0.5 px over 3 px).
   - New converter checks: the tip's angle, the tip's height and the drawn tip end must each move one way
     within each half (0->5 and 5->0, 0.5 px slack for rounding); the tail tip must not be wider than his;
     the tip step must be 15 px or less.
2. **Coil texture on the return (minor).** Each in-between's coil now comes in whole stretches cut at his
   landmarks: the hump and the coil under the neck always from the **nearer** of his pictures (frames 1-2
   and 7 his LEFT, 3-4 and 6 his RIGHT). His lattice, yellow saddles and belly band stay whole and are
   carried the shortest way. Before, frame 7's hump right flank came from his RIGHT carried 2/3 of the way
   and turned to mottle. Only the tail end changes over a frame apart (frame 2 takes his RIGHT's tail end,
   frame 7 keeps it), because his RIGHT is brighter only in the tail end and the hump's left flank. This
   spreads the change in light.
   - His great hump cloud no longer covers the coil's rim. It touched the coil with only 16 of its 693 pixels,
     so it now counts as lying behind the coil, as in his picture. Only blobs that he painted over the coil
     (10 % or more of the blob) cover it in the in-betweens: the neck-base puffs and a few bubbles. Between
     81 % and 90 % of the silhouette edge is in the outline colour on every in-between, against 82.5 % and 87 %
     on his two pictures, so the rim no longer blinks.
   - Silhouette change between neighbours: 18.3, 21.4, 25.6, 29.5, 20.4, **26.6, 23.8, 21.3** % (return was
     30-35 %).
3. **Hump-top cloud (minor).** His big clouds now grow and shrink evenly over the whole move, not staggered.
   His great cloud over the hump is timed by how much of it shows beside the coil (a shrunk copy behind the hump
   hides more of itself than its area says). It shows 20/40/60/80 % of what shows on his RIGHT going out, and
   67/33 % coming back (its area fades 0.359, 0.555, 0.760, 0.895 | 0.797, 0.514). It is never trimmed for light.
   Measured over the hump top, the summed mist opacity is 172, 206, 268, 290, 354, **441**, 319, 252, then 172.
   The largest step back is 27 % of the peak, then 15 % and 18 %. Before, it collapsed 46 % in one step.
4. **Head swap (minor).** His other head now comes in inside the largest head move. Going out it changes during
   the recoil after the strike (3 -> 4: the eye moves -2.2, -3.8). Coming back it changes as the head sways back
   (5 -> 6: -1.8, +0.8). It then eases 1 px a frame into his LEFT (6 -> 7: +1, -1; 7 -> 0: +1, 0) instead of
   holding and twitching. The drops change a frame apart from the head (at 2 -> 3 and 6 -> 7).
5. **Timing (minor).** I kept 8 frames at 10 fps with his RIGHT at frame 5, as the contract and the brief
   require, so the return is 3 frames. To make the return less abrupt, the tail tip travels at an even speed
   within each half and the return's silhouette steps (21-27 %) are no larger than the outward ones (18-30 %).
   If the owner allows 10 frames (5 out, 5 back) at 10 fps, the row would be 1760 px wide. That is not done.
6. **Report and files (minor).** This file, the sheet, the GIF and the report all describe this one build
   (numbers above and below).

## How the frames are made (`tools/refs/cobra-from-ref.py`)

1. **His two pictures, split into his own pixels** (sheet coordinates in the tables at the top).
   - **Head piece:** the head, jaws, fangs, hood and the top of the neck, above a cut across the neck
     (L: y 753, R: y 756).
   - **Coils:** everything below the cut, plus 6 px of neck under the head piece. A hand-placed spine
     (from tail tip to cut) is centred between his edges.
   - **Tail tip piece:** the coil pixels within 14 px of the tip along the body.
   - **Mist:** his purple, un-mixed from his panel into colour and alpha, then cut into blobs (16 in L, 15 in R).
     Where it lies over the coil, his own pixels are kept. Coil hidden by mist continues with his own scales,
     one scale period along the body.
2. **Palette:** body colours and head accents all sampled from his pixels. The mist has 4 colours at 5 alpha
   levels. The outline is (15,22,22), the median of his own dark rim. 87 colours are used.
3. **Shared anchor:** each picture's body-mass centre (L (304,745), R (477,745) in his sheet).
4. **In-betweens:**

| frame | t | head piece (offset) | drops | coil (L/R stretches) | hump cloud fade | puff gain | cloud trim | light (x1000) | opaque px |
|---|---|---|---|---|---|---|---|---|---|
| 0 | **his LEFT** | L (0, 0) | L | L | - | - | - | 118.04 | 6640 |
| 1 | L->R 0.2 | L (-2, 0) draws back | L | all L | 0.359 | 3.36 | +0.08 | 117.75 | 6822 |
| 2 | L->R 0.4 | L (+1, +1) | L | L, tail end R | 0.555 | 3.96 | +0.08 | 120.66 | 6930 |
| 3 | L->R 0.6 | L (+5, +4) **strike** | R | R (neck L) | 0.760 | 1.35 | 0 | 123.65 | 6970 |
| 4 | L->R 0.8 | **R** (+3, 0) recoil | R | R | 0.895 | 0.85 | 0 | 126.67 | 7067 |
| 5 | **his RIGHT** | R (0, 0) | R | R | 1 | - | - | 129.69 | 7080 |
| 6 | R->L 1/3 | **L** (-2, +1) sways back | R | R (neck L) | 0.797 | 2.38 | 0 | 125.23 | 7024 |
| 7 | R->L 2/3 | L (-1, 0) eases in | L | L, tail end R | 0.514 | 3.67 | +0.13 | 120.82 | 6901 |

   - **Body:** both spines are placed on one common parameter using his landmarks (the tail's low point, the hump top and the coil under the neck). Each point moves evenly from one of his pictures to the other.
   - **Coil pixels:** carried along the moving spine (nearest pixel, keeping each pixel's place along the body
     and across it as a fraction of his half-width), from the picture named in the table.
   - **Tail:** rigid tip piece and bent tail end (see change 1).
   - **Head piece:** the named picture's head, moved whole by whole pixels; the neck bends to meet it.
   - **Mist:** his blobs drift back 9 px and up 3 px and shrink out while the other picture's grow in, as smaller
     copies of themselves. His big clouds fade evenly and his small puffs one after another. Blobs he laid over
     the coil go with the coil.
   - **Light:** each frame aims at an even ramp between his two pictures. The small puffs fade faster or slower
     (gain), and the other big clouds run up to 0.4 of a frame's share ahead of or behind (trim). Frames 1, 2 and
     7 cannot reach their share, so they keep their light, and the frames between them are re-aimed on the line
     between them.

**Light per frame** (mean alpha x luma x1000 on the 176x105 frame): 118.04, 117.75, 120.66, 123.65,
126.67, **129.69**, 125.23, 120.82. Steps between neighbours, as % of the peak: -0.2, +2.2, +2.3, +2.3, +2.3,
-3.4, -3.4, -2.1 (7 -> 0). Opaque px steps: +2.6, +1.5, +0.6, +1.4, +0.2, -0.8, -1.7, -3.7 %. Nothing
flashes, and the converter fails the build above 12 %.

## Checks (all pass; the converter writes nothing if one fails)

- No opaque pixel on any frame's border (converter, generator and the staged sheet: 0 px).
- No enclosed gap over 20 px, no body speck of 3 px or less, and no see-through pixel with 8 drawn neighbours.
- Head red and ochre amounts within 15 % of his on frames 0 and 5 (his 106.7 / 35.2 against ours 107.4 /
  31.9; his 88.5 / 24.2 against ours 87.8 / 21.0), and his eye core rosy-amber.
- Neck-base mist: 0 of his 477 and 0 of his 312 purple pixels are lost.
- Tail: no in-between higher or further out than his two tails. The tip is no wider than his. Its angle,
  height and drawn end each move one way within each half. The tip moves at most 15 px a frame (max 14.1).
- No flash (above).
- Deterministic: two converter runs give a byte-identical `vfx-beasts-ref-poison.ts`, and two generator builds
  give a byte-identical `poison.png` and `manifest.json` (md5s at the top).
- The generator refuses to run without `WORLD_OUT` (exit 1), writes each file whole (temp file, then
  rename) and never touches `src/`. `npx tsc --noEmit -p .` is clean, and both files are in the project.
- Key frames match his crops pixel for pixel, apart from palette snapping and his soft JPEG rim, which
  becomes our 1 px outline.

## Files

- `tools/refs/cobra-from-ref.py`: the converter.
- `tools/world-sprites/vfx-beasts-ref-poison.ts`: the generated data (palette and run-length rows, FPS).
- `tools/world-sprites/vfx-beast-cobra.ts`: the standalone generator (group `vfx_beasts_cobra`, sprite
  `poison`), which exports `cobraFromRef()`. Only its header comment changed.
- Review: `art2/beasts-cobra.png` shows his poses beside our frames 0 and 5 (x3), head and neck-base
  close-ups, all fly frames, the tail end on every frame (x5), the hump on the return (x5), the head
  across the swaps (x5), and the cobra beside our character and the old cobra. Also `art2/beasts-cobra.gif`
  (the loop at 10 fps, x3), `art2/beasts-cobra-review.py`, which makes both, and `art2/beasts-cobra-ref.json`,
  its input.

## Rebuild

    # his sheet -> data module (a third argument, a folder, also writes debug images and cobra-ref.json)
    python3 -I tools/refs/cobra-from-ref.py docs/reference/poison-set-owner-reference.jpg tools/world-sprites/vfx-beasts-ref-poison.ts [debugDir]

    # the staged group
    WORLD_OUT=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging npx tsx tools/world-sprites/vfx-beast-cobra.ts

    # review sheet + gif (needs the sidecar json from debugDir and our character at 1x)
    python3 -I <art2>/beasts-cobra-review.py <repo> <art2>/staging <art2> <art2>/beasts-cobra-ref.json <art2>/beasts-character.png

## Merging into vfx-beasts.ts (after approval)

1. In `tools/world-sprites/vfx-beasts.ts`, add `import { cobraFromRef } from './vfx-beast-cobra';`.
2. In `BUILDERS`, replace `['poison', venomCobra]` with `['poison', cobraFromRef]`. The old procedural
   `venomCobra` (with `cobraSpine` and `VENOM`) can then be deleted.
3. Rebuild `vfx_beasts` with WORLD_OUT and copy the approved sheet into the game as usual. The manifest
   carries the new frame size, anchor and fps (10), and the renderer reads them from there.
4. Add a line for `cobra-from-ref.py` to `tools/refs/README.md` (a shared file, which I left alone).

## Known differences from his picture

- **The motion is ours**, built only from his pixels: the draw-back, strike (+5, +4 px at frame 3) and recoil;
  the tail tip turning over the top; and the mist drifting back.
- **The tail tip's in-between angles are not in his picture.** The piece is his own pixels, turned. At frame 4
  his RIGHT point lies flat to the left, so the tail looks long, with a slight wave at the joint.
- **The loop is 5 steps out and 3 back**, because the contract fixes his RIGHT at frame 5. The return's tip
  steps (12.6-14.1 px) and light steps (3.4 %) are the larger ones.
- **The coil's look changes from his LEFT to his RIGHT in two steps** (tail end at 1 -> 2 out and 7 -> 0 back,
  hump at 2 -> 3 out and 6 -> 7 back). Each frame shows whole stretches of one of his two pictures.
- **The mist does more than his two pictures.** To keep the light ramp even, the small puffs fade faster or slower
  and the mid-size clouds run up to 0.4 of a frame ahead or behind. The total mist dips at frames 3-4 and comes
  back at frame 5.
- **Colours** are snapped to his sampled colours, and his softest mist edges become 5 alpha steps. A half-faded
  bubble still reads greyish-mauve over green grass; over the dark map it reads purple.
- In the review sheet, his crops show his panel border at the left edge of his LEFT and his picture divider
  at the right edge of his RIGHT. That line is his sheet, not our sprite.
