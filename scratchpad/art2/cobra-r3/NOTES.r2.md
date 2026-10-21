# Venom cobra (poison beast), copied from the owner's poison sheet

Source: his poison sheet (`docs/reference/poison-set-owner-reference.jpg`), panel
BEAST (COBRA, APPROVED, IN GAME). He did not keep our cobra. He repainted it as a rearing hooded
cobra: green-and-yellow scaled coils on the ground, hood and head raised, open jaws with fangs, a
rosy-amber eye, venom dripping, and purple venom mist around it, in two poses (LEFT and RIGHT). His
two poses are fly frames 0 and 5. The six in-betweens are built from his own pixels.

This job covers only the beast. The rest of the poison set (and its wall) belongs to the set artist.

## The sprite

| | before (in game, `vfx_beasts/poison`) | now (`vfx_beasts_cobra/poison`, staging) |
|---|---|---|
| frame | 156 x 93 | **172 x 107** (the union of all 8 frames + 1 px) |
| anchor | [95, 32] (neck base) | **[96, 58]**: the centre of the body's mass, the same point in both of his poses |
| meters | [2.6, 1.8] | [3, 1.9] |
| fly | 8 frames, 12 fps, loop | **8 frames, 10 fps, loop** (0.8 s per loop; brief: "Beasts: no change") |
| sheet row | 1248 px | 1376 px wide (under 8192) |

The sprite faces right, and the renderer mirrors it. Its tag is `vfx`, as before.

## Scale

His character measures 99 px (blast), 98 (wall), 97 (wall_diag) and 96 (wall_depth). The median is
97.5 px against our 96 (0.985). A JPEG edge moves each end by about a pixel, so the scale is 1.00
within what can be measured, and his pixels are taken **one to one** (nothing is resampled). If a new
reference measures more than 3 % away from 1, the converter stops and says so.

## What changed in this pass (review r1)

1. **Head colours (major).** The head's warm accents now have their own colours: every head pixel with
   hue 330-50 deg that is saturated (or a warm near-black) snaps only to accent colours of its own hue
   (11 rosy/crimson, 7 ochre, 5 warm near-blacks, all sampled from his pixels in light/mid/dark and
   saturation bands, chroma weighted 2.5x). Every other head pixel snaps only to the body's colours,
   so no green or grey eye and no maroon speck he did not paint.
   - His eye stays rosy-amber: its 3x3 core is (168,135,126) / (140,111,96) / (124,97,90) on both poses.
   - Red / ochre amount on the head (each pixel counted by how clearly it is red or ochre, so a pixel on a
     threshold does not flip the count): frame 0 his 106.7 / 35.2, ours 107.4 / 31.9; frame 5 his
     88.5 / 24.2, ours 87.8 / 21.0. All within 15 %; the build fails otherwise.
2. **Neck-base mist (major).** Where he painted his mist over the coil (the two-lobed puff at the neck
   base, a few bubbles), his own pixels are kept there, his purple over his scales, including the soft rim
   that tints the coil. No more straight cut and no squared block. Purple pixels of his at the neck base
   lost: 0 of 477 (frame 0), 0 of 312 (frame 5); the build fails at 10.
3. **Loop timing (minor).** The contract keeps his RIGHT at frame 5, so the loop is 5 steps out and
   3 back. It is now even within each half: the body moves a fifth of the way per frame out and a
   third back (was smoothstep, which put 48 % of the return into 6->7). Body silhouette change between
   neighbours: 17, 20, 26, 23, 21, 24, 23, 22 % (was up to 34 %). The tail tip moves 7.0 px per frame
   out and 11.6 px per frame back (was up to 25 px). The venom drops (and the little green bubble at
   the neck) change over one frame before the head piece does (frames 4 and 7), so the head swap no longer
   changes everything at once.
4. **Tail stalk (minor).** The tail tip is now led on the straight line between his two tips and the
   bend is solved back from it (the smallest extra turn, spread toward the tip), so it opens from his
   curl to his long point without standing up. Checked: no in-between tail pixel is higher or further
   left than his two tails (2 px slack).
5. **Lilac bubble (minor).** Pale lilac specks among the drops are classed as mist: his bubble beside the
   RIGHT neck base keeps its light core and mauve rim, no outline, no hole. The build fails on any
   see-through pixel walled in by 8 drawn neighbours; pinholes inside mist take its faintest level.
6. **Specks in the mist (minor).** A body speck of 3 px or less left inside or at the edge of the mist
   takes the mist colour round it; a drop mostly covered by a drifting blob goes behind it. Blobs he laid
   over the coil travel with the coil and are drawn in front of it whole, so the coil's rim no longer
   cuts through them.
7. **Hump rim and fading cloud (minor).** Coil pixels are carried at the same fraction of his half-width
   (his dark rim stays on the rim when the body is wider or narrower), and the tidy runs 3 passes on
   every frame. A fading blob is now a smaller copy of itself about its centre (his core and soft rim
   kept), not a global alpha drop and not an edge erosion (which left a thin streak of the big RIGHT cloud).

## How the frames are made (`tools/refs/cobra-from-ref.py`)

1. **His two pictures, split into his own pixels** (sheet coordinates in the tables at the top).
   - **Head piece:** head, jaws, fangs, hood and the top of the neck, above a cut across the neck
     (L: y 753, R: y 756). Below the cut and right of the neck there are only drops and bubbles: they
     belong to the drops.
   - **Coils:** everything below the cut, plus 6 px of neck under the head piece. A hand-placed spine
     (tail tip to cut) is centred between his edges.
   - **Mist:** his purple, un-mixed from his panel into colour and alpha (solid from 190), cut into his
     blobs (16 in L, 15 in R; 4 of each lie over the coil). Over the coil, his own pixels.
   - **Coil hidden or tinted by mist:** continues with his own scales one or more scale periods (6 px)
     along the body (167 + 139 px in L, 72 + 119 px in R); used under his mist and in the in-betweens.
2. **Palette:** 46 body colours (34 mid, 9 dark, 3 highlight) + 23 head accents, all from his pixels;
   4 mist colours at 5 alpha levels (255/190/130/75/36); 5 mist-over-coil colours; outline (15,22,22),
   the median of his own dark rim (deep teal-green, not black). 88 colours used.
3. **Shared anchor:** each picture is placed with the centre of its body mass on the anchor (L (304,745),
   R (477,745) in his sheet).
4. **In-betweens:**

| frame | from | t | head offset | drops from | body from the other pose up to | mist gain | light (frame, x1000) | opaque px |
|---|---|---|---|---|---|---|---|---|
| 0 | **his LEFT** | 0 | 0, 0 | L | - | 1.00 | 118.53 | 6640 |
| 1 | L -> R | 0.2 | -2, -1 (draws back) | L | 0.30 | 3.98 | 120.34 | 6780 |
| 2 | L -> R | 0.4 | +2, 0 | L | 0.50 | 1.40 | 123.21 | 6944 |
| 3 | L -> R | 0.6 | **+6, +2 (strike)** | L | 0.52 | 0.94 | 125.57 | 7037 |
| 4 | L -> R | 0.8 | +3, +1 | **R** | 0.67 | 0.95 | 127.92 | 7061 |
| 5 | **his RIGHT** | 0 | 0, 0 | R | - | 1.00 | 130.29 | 7080 |
| 6 | R -> L | 1/3 | -1, -1 (sways back) | R | 0.33 | 0.95 | 126.36 | 7075 |
| 7 | R -> L | 2/3 | -1, 0 | **L** | 0.53 | 2.05 | 122.46 | 6889 |

   - **Body:** both spines on one parameter by his landmarks (tail low point, hump top, coil under the
     neck), each point moving evenly from one picture to the other.
   - **Tail end:** bends (turning and step lengths blended) with its tip led on the line between his tips.
   - **Coil pixels:** carried along the moving spine, nearest pixel, at their place along the body and
     their fraction across it. From the tail end up to the "body from the other pose" fraction they come
     from the pose being moved to; that fraction is chosen so the body's light is the even step between
     his two pictures (his RIGHT is 10 % brighter).
   - **Head piece:** the starting pose's, moved by whole pixels; the neck bends to meet the cut square.
   - **Mist:** his blobs drift back 9 px / up 3 px and shrink out one after another while the other
     pose's grow in; blobs over the coil go with the coil. The "mist gain" scales how far they have faded
     (bisection) so the frame's light is the even step between his two pictures.

**Light per frame** (mean alpha x luma x1000 on the 172x107 frame, loop included):
+1.5 %, +2.4 %, +1.9 %, +1.9 %, +1.9 %, -3.0 %, -3.1 %, -3.2 % (7 -> 0). Opaque mass changes 3.6 % at
most (7 -> 0). The converter fails the build above 12 %.

## Checks (all pass; the converter writes nothing if one fails)

- No opaque pixel on any frame's border (converter, generator and the staged sheet).
- No enclosed gap over 20 px, no body speck of 3 px or less, no see-through pixel with 8 drawn neighbours.
- Head red/ochre amounts within 15 % of his and his eye core rosy-amber, on frames 0 and 5.
- Neck-base mist: fewer than 10 of his purple pixels lost (0 and 0).
- Tail: no in-between higher or further out than his two tails; tip step at most 13 px (max 11.6).
- No flash (above). Deterministic: two converter runs give a byte-identical `vfx-beasts-ref-poison.ts`
  (md5 73ee32ce5bd0e76d7b5688ad1b90bbec); two generator builds give byte-identical `poison.png`
  (cfba91710f40a3676686805d98e61238) and `manifest.json` (8a465122a46ac57ba273e3596df8d6ec).
- The generator refuses to run without `WORLD_OUT`, writes each file whole (temp, then rename), and never
  touches `src/`. `npx tsc --noEmit -p .` is clean.
- Key frames against his crops: mean error 7.7 / 8.0 per channel over opaque pixels (frames 0 / 5),
  mostly his soft JPEG rim against our crisp 1 px outline.

## Files

- `tools/refs/cobra-from-ref.py`: the converter.
- `tools/world-sprites/vfx-beasts-ref-poison.ts`: the generated data (palette, run-length rows, FPS). The
  alphabet now runs past ASCII (Latin-1 letters) because 88 colours are used; the generator's decoder
  handles it unchanged.
- `tools/world-sprites/vfx-beast-cobra.ts`: the standalone generator (group `vfx_beasts_cobra`, sprite
  `poison`); exports `cobraFromRef()`. Only its header comment changed.
- Review: `art2/beasts-cobra.png` (his poses beside our frames 0 and 5 x3, head and neck-base close-ups
  x6, all fly frames, the cobra beside our character and the old cobra), `art2/beasts-cobra.gif` (the loop
  at 10 fps, x3), `art2/beasts-cobra-review.py` (makes both), `art2/beasts-cobra-ref.json` (sidecar).

## Rebuild

    # his sheet -> data module (a third argument, a folder, also writes debug images and cobra-ref.json)
    python3 -I tools/refs/cobra-from-ref.py docs/reference/poison-set-owner-reference.jpg tools/world-sprites/vfx-beasts-ref-poison.ts [debugDir]

    # the staged group
    WORLD_OUT=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging npx tsx tools/world-sprites/vfx-beast-cobra.ts

    # review sheet + gif (needs the sidecar json and our character at 1x)
    python3 -I <art2>/beasts-cobra-review.py <repo> <art2>/staging <art2> <art2>/beasts-cobra-ref.json <art2>/beasts-character.png

## Merging into vfx-beasts.ts (after approval)

1. In `tools/world-sprites/vfx-beasts.ts`, add `import { cobraFromRef } from './vfx-beast-cobra';`.
2. In `BUILDERS`, replace `['poison', venomCobra]` with `['poison', cobraFromRef]`. The old procedural
   `venomCobra` (with `cobraSpine` and `VENOM`) can then be deleted.
3. Rebuild `vfx_beasts` with WORLD_OUT and copy the approved sheet into the game as usual. The manifest
   carries the new frame size, anchor and fps (10); the renderer reads them from there.
4. Add a line for `cobra-from-ref.py` to `tools/refs/README.md` (shared file, left alone).

## Known differences from his picture

- **The motion is ours**, built only from his pixels: the strike (+6, +2 px at frame 3), draw-back and
  sway, the tail opening, the mist shrinking and growing.
- **The loop is 5 steps out and 3 back** because the contract fixes his RIGHT at frame 5 in an 8-frame
  loop; each half is even, and the return's steps (tail tip 11.6 px, light 3.1 %) are the larger ones.
- **The head piece still changes from his LEFT to his RIGHT drawing in one frame** (4 -> 5, 7 -> 0); his
  two heads are nearly one drawing, and the drops change a frame earlier.
- **The tail tip in frames 1-3 and 6-7** curls between his two shapes; those curls are in neither picture.
- **The coil under his mist** is rebuilt from his own scales one period along the body; it shows only in
  the in-betweens as the blobs shrink.
- **Colours** are snapped to his sampled colours; his softest mist edges are 5 alpha steps. A half-faded
  bubble still reads greyish-mauve over green grass; over the dark map it reads purple.
- **Outline:** his soft JPEG rim becomes a crisp 1 px rim in his own darkest teal-green. Where the coil's
  rim meets his mist at the hump top, a few rim pixels stay between two mist patches (frame 2).
- **The frame is larger than before** (172 x 107 vs 156 x 93); the anchor is the body's mass centre, so at
  the same flight height the head sits about 26 px higher than the old cobra's.
- In the review sheet, his crops show his panel's border line at the left edge of his LEFT and his picture
  divider at the right edge of his RIGHT. That line is his sheet, not our sprite.
