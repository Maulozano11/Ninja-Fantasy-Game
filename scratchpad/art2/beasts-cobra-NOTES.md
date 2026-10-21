# Venom cobra (poison beast), copied from the owner's poison sheet

Source: his poison sheet (`docs/reference/poison-set-owner-reference.jpg`), panel
BEAST (COBRA, APPROVED, IN GAME). He did not keep our cobra. He repainted it as a rearing hooded
cobra: green-and-yellow scaled coils on the ground, hood and head raised, open jaws with fangs, a
rosy-amber eye, venom dripping, and purple venom mist around it, in two poses (LEFT and RIGHT). His
two poses are fly frames 0 and 5. The six in-betweens are built from his own pixels.

This job covers only the beast. The rest of the poison set (and its wall) belongs to the set artist.
Everything below describes the build that is staged now (fix pass on art-director review r2, round 2):

| file | md5 |
|---|---|
| `tools/world-sprites/vfx-beasts-ref-poison.ts` | `a33702599e05d1b0c085bb18c782c089` |
| `staging/vfx_beasts_cobra/poison.png` | `d9a1d1fd9eedbccac2471aeedb70b893` |
| `staging/vfx_beasts_cobra/manifest.json` | `7d95d948c2bb86814b755c24cd775409` |

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

## Review r2: what each finding got

The size, anchor, fps, key frames 0 and 5 (pixel for pixel the same as the build before this pass) and
the head, coil and tip-piece work of the earlier r2 pass are unchanged. This pass changed three things.

1. **Tail end (major): fixed.** His tip stays a rigid piece of his own pixels, his LEFT tip on frames 1, 2
   and 7 and his RIGHT tip on frames 3, 4 and 6. It is turned about its joint to an angle that goes one way
   in each half. On every frame it has his thin taper: over its last 3 px it is at most 5.0 px across, rim
   included, against his 4.7 and 5.0. There are no clubs, barbs or hammerheads.
   - **New this pass:** the tail end between the low point and the tip's joint used to be bent by a
     polynomial fit that folded the extra turn into an S at the joint: a wave on frame 4 and hooks on 3 and 6.
     It is now bent by the **smoothest** extra turn that meets the joint and its heading, meaning the least
     added curvature. The turn spreads over the whole tail end, so the tail curves into his tip without a
     kink. Frame 4 is now one arc with the tip lying to the left, between frame 3's raised arc and his RIGHT.
   - How fast the bend changes around the joint (6 px before to 20 px past, deg per 3 px per 3 px):
     **9.9, 9.4, 12.1, 13.4, 14.1, 10.0, 13.5, 11.4**. His are 9.9 and 10.0. The previous build had
     22.3, 26.7, **60.0**, 30.0 and 18.5 on frames 2, 3, 4, 6 and 7.
   - Sharpest bend past the tip piece (deg per 3 px): 24.6, 24.0, 25.5, 29.5, 37.7, 26.7, 31.3, 23.5. His
     sharpest is 26.7. Frame 4's 37.7 is at the U where the tail rises from the ground. His RIGHT bends
     there too, by 26.
   - Tip angle (deg): -55.6, -85.7, -113.2, -140.9, -174.6, **-226.2**, -150.9, -104.1. It turns one way in
     each half.
   - Drawn tip end (its last 3 px, y from the anchor): -11.5, -11.1, -8.0, -2.5, 4.2, **10.7**, -0.5, -9.3.
     It goes down every frame out and up every frame back. Tip steps (px): 8.5, 8.5, 8.4, 8.4, 7.8 out and
     12.6, 13.9, 14.1 back.
   - **New converter checks** (the build fails otherwise):
     - The bend around the joint must change no faster than 1.5 x his.
     - The tail end must bend no more sharply than 1.5 x his.
   - **Kept from before:** the tip is no wider than his over its last 3 and 10 px; its angle, height and
     drawn end move one way within each half; it moves at most 15 px a frame.
2. **Coil texture on the return (minor): already fixed in the earlier r2 pass, checked again.**
   - The hump and the coil under the neck come in whole stretches from the **nearer** picture: frames 1, 2
     and 7 from his LEFT, frames 3, 4 and 6 from his RIGHT. His lattice, yellow saddles and belly band
     stay whole.
   - The great hump cloud stays behind the coil's 1 px rim, so the rim is there on every frame.
   - Silhouette change between neighbours (body XOR / union): 18.4, 21.6, 25.9, 24.2, 26.1 out;
     **26.7, 24.3, 21.6** back. The return is no rougher than the way out; it was 30-35 %.
3. **Hump-top cloud (minor): now fixed.** His great cloud over the hump eases out over the 3-frame
   return: what shows of it drops by a quarter, a half, then a quarter, while his LEFT cloud grows in.
   - The purple mass over the hump top, measured as in the review (the summed alpha of the largest purple
     patch there), goes **150** (his LEFT's own cloud), 216, 245, 316, 385, **499**, 370, 242, then back
     to 150.
   - Steps back: -25.9, -25.7 and -18.3 % of the peak. Before this pass they were -32.9, -13.6 and
     -23.4; before r2 the cloud lost 46 % in one step.
   - Steps out: +13, +6, +14, +14 and +23 %.
4. **Head swap (minor): already fixed in the earlier r2 pass, unchanged.** His other head comes in during
   the recoil after the strike (3 -> 4) and as the head sways back (5 -> 6). It then eases back into his
   LEFT by 1 px a frame (6 -> 7 -> 0). The drops change a frame apart from the head.
5. **Loop timing (minor): 8 frames at 10 fps kept, as the contract and the brief say.** His RIGHT is
   frame 5, so the return has 3 frames. Even so:
   - The return's silhouette steps (21.6-26.7 %) are no larger than the outward ones (18.4-26.1 %).
   - The light steps are about the same both ways: at most 4.5 % out and 4.4 % back.
   - The tail tip steps back are 12.6-14.1 px against 7.8-8.5 px out. That is the one place where the return
     is faster, because his tip has to turn 171 deg back in 3 frames.
   - If the owner allows 10 frames (5 out, 5 back) at 10 fps, the row would be 1760 px wide. That is not
     done.
6. **Report vs files (minor): fixed.** This file, the sheet, the GIF and the report all describe this one
   build (the md5s above).

**Also changed: the mist is aimed at an even amount, not an even light.** Before, the small puffs were
dimmed or boosted to hold the frame's light on a straight ramp. His RIGHT coil is the brighter, so the mist
thinned out on frames 3 and 4 and swelled back by 24 % at his RIGHT. Now the in-betweens aim at an even
ramp in how much mist shows (summed alpha, px): 958, 934, 970, 995, 1021, **1075**, 1010, 945. The largest
step is 6.4 %. The light follows the coil and the mist and stays smooth (below).

## How the frames are made (`tools/refs/cobra-from-ref.py`)

1. **His two pictures, split into his own pixels.**
   - **Head piece:** the head, jaws, fangs, hood and the top of the neck, above a cut across the neck
     (L: y 753, R: y 756 in his sheet).
   - **Coils:** everything below the cut, plus 6 px of neck under the head piece. A hand-placed spine runs
     from the tail tip to the cut, centred between his edges.
   - **Tail tip piece:** the coil pixels within 14 px of the tip along the body (101 px of his LEFT, 78 px
     of his RIGHT).
   - **Mist:** his purple, un-mixed from his panel into colour and alpha, then cut into blobs (16 in L,
     15 in R). Where it lies over the coil, his own pixels are kept. Where mist hides the coil, the coil
     continues with his own scales, one scale period along the body.
2. **Palette:** the body colours and head accents are all sampled from his pixels. The mist has 4 colours
   at 5 alpha levels. The outline is (15,22,22), the median of his own dark rim. 87 colours are used.
3. **Shared anchor:** each picture's body-mass centre (L (304,745), R (477,745) in his sheet).
4. **In-betweens:**

| frame | t | head piece (offset) | drops | coil (L/R stretches) | hump cloud fade | puff gain | cloud trim | mist shown | light (x1000) | opaque px |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | **his LEFT** | L (0, 0) | L | L | - | - | - | 958.1 | 118.04 | 6640 |
| 1 | L->R 0.2 | L (-2, 0) draws back | L | all L | 0.359 | 3.36 | +0.08 | 933.9 | 117.79 | 6821 |
| 2 | L->R 0.4 | L (+1, +1) | L | L, tail end R | 0.555 | 3.96 | +0.08 | 970.0 | 120.55 | 6932 |
| 3 | L->R 0.6 | L (+5, +4) **strike** | R | R (neck L) | 0.760 | 3.29 | 0 | 994.5 | 126.18 | 7032 |
| 4 | L->R 0.8 | **R** (+3, 0) recoil | R | R | 0.895 | 2.83 | +0.08 | 1020.5 | 129.64 | 7169 |
| 5 | **his RIGHT** | R (0, 0) | R | R | 1 | - | - | 1075.2 | 129.69 | 7080 |
| 6 | R->L 1/3 | **L** (-2, +1) sways back | R | R (neck L) | 0.866 | 1.92 | 0 | 1010.1 | 125.77 | 7040 |
| 7 | R->L 2/3 | L (-1, 0) eases in | L | L, tail end R | 0.436 | 3.67 | +0.13 | 944.9 | 120.18 | 6869 |

   - **Body:** both spines are laid on one common parameter using his landmarks: the tail's low point, the
     hump top and the coil under the neck. Each point moves evenly from one of his pictures to the other.
   - **Coil pixels:** carried along the moving spine from the picture named in the table. Nearest pixel:
     each pixel keeps its place along the body, and its place across it as a fraction of his half-width.
   - **Tail:** his rigid tip piece, turned over the top at an even speed in each half. Its joint follows
     the line between his two joints, sunk 5 px at mid-sweep, so the tip never rises above his. The tail
     end from the low point to the joint takes the blend of his two tails' turning plus the smoothest extra
     turn (least added curvature, solved under the joint's place and heading) that carries the tip there.
   - **Head piece:** the named picture's head, moved whole by whole pixels. The neck bends to meet it.
   - **Mist:** his blobs drift back 9 px and up 3 px and shrink out while the other picture's grow in, as
     smaller copies of themselves.
     - His big clouds fade evenly. His great hump cloud eases out on the return.
     - His small puffs fade one after another, faster or slower (gain) so that how much mist shows goes on
       an even ramp. The other big clouds run up to 0.4 of a frame's share ahead or behind (trim).
     - Frames 1, 2, 4 and 7 cannot quite reach their share (the gain has a limit), so they keep the mist
       they have.
     - Blobs he laid over the coil go with the coil.

**Light per frame** (mean alpha x luma x1000 on the 176x105 frame): 118.04, 117.79, 120.55, 126.18,
129.64, **129.69**, 125.77, 120.18.
- Steps between neighbours, as % of the peak: -0.2, +2.1, +4.3, +2.7, 0.0, -3.0, -4.3, -1.7 (7 -> 0).
- Opaque px steps: 2.7, 1.6, 1.4, 1.9, 1.2, 0.6, 2.4, 3.3 %.
- Nothing flashes. The converter now fails the build above 6 % (it was 12 %).

## Checks (all pass; the converter writes nothing if one fails)

- **Border:** no opaque pixel on any frame's border (converter, generator and the staged sheet: 0 px).
- **Holes and specks:** no enclosed gap over 20 px, no body speck of 3 px or less, and no see-through pixel
  with 8 drawn neighbours.
- **Head accents:** red and ochre amounts within 15 % of his on frames 0 and 5. His red / ochre against
  ours: 106.7 / 35.2 against 107.4 / 31.9 on frame 0, and 88.5 / 24.2 against 87.8 / 21.0 on frame 5.
  His eye core stays rosy-amber.
- **Neck-base mist:** 0 of his 477 and 0 of his 312 purple pixels are lost.
- **Tail:**
  - No in-between is higher or further out than his two tails, and the tip is no wider than his.
  - Its angle, height and drawn end each move one way within each half. The tip moves at most 15 px a
    frame (max 14.1).
  - The bend changes no faster than 1.5 x his around the joint, and the tail end bends no more sharply
    than 1.5 x his.
- **No flash:** see above (6 %).
- **Deterministic:** two converter runs give a byte-identical `vfx-beasts-ref-poison.ts` and
  `cobra-ref.json`. Two generator builds give a byte-identical `poison.png` and `manifest.json` (md5s at
  the top).
- **Generator:** it refuses to run without `WORLD_OUT` (exit 1), writes each file whole (temp file, then
  rename) and never touches `src/`.
- **Typecheck:** `npx tsc --noEmit -p .` is clean, and both TypeScript files are in the project.
- **Key frames:** frames 0 and 5 match his crops pixel for pixel, apart from palette snapping and his soft
  JPEG rim, which becomes our 1 px outline.

## Files

- `tools/refs/cobra-from-ref.py`: the converter.
- `tools/world-sprites/vfx-beasts-ref-poison.ts`: the generated data (palette, run-length rows and FPS).
- `tools/world-sprites/vfx-beast-cobra.ts`: the standalone generator (group `vfx_beasts_cobra`, sprite
  `poison`). It exports `cobraFromRef()`. Only its header comment changed.
- Review files in `art2/`:
  - `beasts-cobra.png` has these panels:
    - his poses beside our frames 0 and 5 (x3), with head and neck-base close-ups;
    - all fly frames;
    - the tail end on every frame (x5);
    - the hump on the return (x5);
    - the head across the swaps (x5);
    - the cobra beside our character and the old cobra.
  - `beasts-cobra.gif`: the loop at 10 fps, x3.
  - `beasts-cobra-review.py` makes both, and `beasts-cobra-ref.json` is its input.

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
4. Add a line for `cobra-from-ref.py` to `tools/refs/README.md`. It is a shared file, so I left it alone.

## Known differences from his picture

- **The motion is ours**, built only from his pixels: the draw-back, the strike (+5, +4 px at frame 3) and
  the recoil, the tail tip turning over the top, and the mist drifting back.
- **The tail's in-between shapes are not in his picture.** The tip piece is his own pixels, turned, and the
  tail end is bent smoothly into it. On frame 4 the tail is one long arc with the tip lying to the left.
- **The loop is 5 steps out and 3 back**, because the contract fixes his RIGHT at frame 5. The return's tip
  steps (12.6-14.1 px) are the larger ones.
- **The coil's look changes from his LEFT to his RIGHT in two steps.** The tail end changes at 1 -> 2 out
  and 7 -> 0 back, and the hump at 2 -> 3 out and 6 -> 7 back. Each frame shows whole stretches of one of
  his two pictures.
- **The mist does more than his two pictures.** To keep the amount of mist even, the small puffs fade
  faster or slower, and the mid-size clouds run up to 0.4 of a frame ahead or behind.
- **Colours** are snapped to his sampled colours, and his softest mist edges become 5 alpha steps. A
  half-faded bubble still reads greyish-mauve over green grass; over the dark map it reads purple.
- In the review sheet, his crops show his panel border at the left edge of his LEFT and his picture divider
  at the right edge of his RIGHT. That line is his sheet, not our sprite.
