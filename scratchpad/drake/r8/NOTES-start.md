# Stone drake (earth beast): notes

This is the owner's new four-legged stone drake, copied from the BEAST panel of his earth sheet
(`docs/reference/earth-set-owner-reference.jpg`, the same file as `art2/REF-earth-set-owner.jpg`).
It replaces the old stone serpent. As he asked, the serpent's code is deleted.

- His LEFT picture (the prowl) is fly frame 0.
- His RIGHT picture (the low lunge, with dust kicking up behind the hind legs) is fly frame 5.

This is the fourth pass. It fixes the art director's third review (`review-beast-r2/REVIEW-drake-r3-findings.png`).
What changed for each finding is listed under "Review 3 findings" below.

## Sprite contract (`vfx_beasts/earth`)

| | |
|---|---|
| Frame | **287 x 167** (last pass 280x163; the serpent was 150x106) |
| Anchor | **[160, 82]**, the middle of the prowl's torso, between his shoulder and his hip (the same point as before; the frame grew around it) |
| Animation | `fly`, 8 frames, 12 fps, loop, facing right (unchanged) |
| Label / meters | `Stone drake (earth)`, [4.1, 2.5] (the body in frame 0, at 57 px/m) |
| Clear margin | 3 px on every side in every frame (the other beasts keep 1) |
| Colours | 76 RGBA entries in the data (66 distinct RGB colours; the dust's lighter alphas reuse dust colours). The last NOTES said 78; the reviewer's 63 counted RGB only. |
| Outline | `#191519` (25, 21, 25): the median of the dark pixels on his silhouette, a cool deep brown, not black. It sits on the inner ring of the silhouette. |

The frame grew by 7x4 px because frames 3 and 7 now show his lunge drawing scaled up toward his prowl's
size (see "The switches" below): the tallest back spike in frame 3 sets the top.

## Feet line and placement

**Feet line: y = 163** inside the frame, **81 px below the anchor** (unchanged). This is the lowest claw
of frame 0 and his ground line. His dust pile's flat bottom sits on it in frames 3-7, the hind claws stand
on it in frames 0-2, and no pixel in any frame goes below it.

To make the drake run on the ground, put the anchor at `groundY - 81` with no lift and no hop.

Today's flight path in `src/components/battle/vfxSprites.ts` (`flight`, with the lift set in
`playback.ts`) does not do that:

- It lifts the anchor 70 px at the start (120 when cast from a head).
- At the end it lifts it 30 px for a shaped jutsu, or 60 px otherwise.
- It adds a 30 px sine hop in between.

With the feet 81 px below the anchor, they would hang 11 px below the ground at the start and
21-51 px below at the end. For a ground run, give the earth beast a lift of [81, 81] and no sine hop.
The dust pile is baked into frames 3-7, so on a moving drake it slides along with it; if that shows, the
pile should become a separate one-shot sprite anchored to the ground at the take-off point. I did not
touch `src/`.

## The frames

Frame coordinates (exact, from the converter). "Eye" is his near eye, "snout" his snout tip, "horn" the
tip of his upright horn.

| Frame | From | Eye (x, y) | Snout | Horn | Lowest claw | Dust |
|---|---|---|---|---|---|---|
| 0 | his prowl | (253.5, 92.9) | (283.9, 103.0) | (248.5, 37.2) | 163 (ground) | none |
| 1 | prowl | (253.5, 85.1) | (282.6, 94.4) | (248.2, 31.8) | 163 (ground) | none |
| 2 | prowl | (253.5, 77.2) | (281.4, 85.8) | (248.0, 26.3) | 163 (ground) | none |
| 3 | lunge | (253.5, 75.5) | (280.1, 84.6) | (247.5, 24.1) | 147 | bursts off the ground, 70% size; clod on the spike |
| 4 | lunge | (253.5, 73.0) | (279.0, 81.5) | (247.3, 23.9) | 140 | 88% size; clod on the spike |
| 5 | his lunge | (253.5, 70.6) | (278.0, 78.5) | (247.1, 23.7) | 132 | his pile, opaque; his clod |
| 6 | lunge | (253.5, 79.1) | (280.1, 88.2) | (247.5, 27.7) | 140 | drifts back and settles, 63% alpha; clod kicked off, 63% |
| 7 | lunge | (253.5, 91.9) | (282.4, 102.4) | (247.9, 35.6) | 151 (about to land) | low and spread, 37% alpha |

- **Eye x** is the same in every frame.
- **Eye y** rises every step from frame 0 to frame 5 (-7.8, -7.9, -1.7, -2.5, -2.4): the front rears up
  while the hind claws push on the ground, then the body springs and floats to the top of the leap. It
  falls +8.5 and +12.8, then +1.0 as it lands in his prowl: a heavy body comes down hard.
- **The two switches between his drawings** (2->3 and 7->0): the snout tip moves 1.8 and 1.6 px, the
  horn tip 2.3 and 1.7 px, the eye 1.7 and 1.0 px. That is the body's own motion; the head shape is the
  same on both sides (the onion skins at the bottom of `beasts-drake.png` show it).

## Scale and placement

- **Scale.** His character on the WALL panel is 228 px tall; ours is 96 px. That gives
  96/228 = 0.4211, applied with an area (box) filter.
- **Placement.** Both pictures stand on his one ground line, ref y 1948. The prowl's lowest claw is
  at 1946 and the lunge's flat dust bottom at 1950. Both eyes keep one x: his near eyes are at
  (1014, 1781) and (1670, 1728).
  - Frame 0 puts the middle of his prowl's torso, (792, 1755), on the anchor.
  - Frame 5 puts (1448, 1755) on the anchor: 656 px to the right, at the same height.
  - So the lunge rises 53 of his px (22 game px) above the prowl, as he drew it, and its dust pile
    sits on the ground.
- **His two heads.** His prowl head is drawn 1.196 times the size of his lunge head and turned 2.2
  degrees, measured on his eye, snout tip (1086, 1805) / (1728, 1747) and horn tip (1002, 1649) /
  (1655, 1617). The fit is within 3.6 of his px.

## How the key frames are made (`beasts-from-ref.py drake`)

1. **Crop.** Each picture is cropped from the panel. The borders are at x 502-1758 and
   y 1544-1975, and the two pictures split at x = 1118. The panel colour is (34, 34, 44).
2. **Segmentation.**
   - The body is the largest region that differs from the panel. His enclosed seams are filled in.
   - His dark under-body shadow is kept. This is the belly, under the chin and neck, and the far legs
     (about (46, 36, 48): barely lighter than the panel, but warmer). The 1-2 px ring of JPEG ringing
     round his outline is not counted as shadow.
   - The dust is the saturated orange-brown pixels in his lunge. The clod on the tip of his tallest back
     spike and the streak that ends on the spikes above the hip go with the dust (the clod keeps only its
     own bright, warm pixels).
3. **Downsampling.** The image is area-averaged to game scale. Colours snap to a palette sampled
   from his pixels: 30 stone, 8 moss, 5 glow colours, his 8 horn colours, his near-white horn highlight
   (162, 157, 153) and the amber (200, 149, 74) of his eye surround.
4. **Outline.** The silhouette's inner ring becomes a 1 px outline in his edge colour (25, 21, 25).
5. **Horns (new).** His horn colours are now a median cut of his own horn pixels (7 greys plus his dark
   seam grey (41, 33, 29)), and inside his horns pixels snap only to them. The last pass used a cool
   grey group that came out bluer than his. Measured against his picture box-filtered to game scale, over
   the same pixels, red minus blue is 15.5 against his 16.9 (frame 0) and 14.7 against his 13.9
   (frame 5); the luminance is 111.4 / 112.6 and 107.0 / 107.7. His near-white highlight is used only
   where his horn is at least 150 in luminance, so no light speckles land on his dark seams (0 pixels).
6. **Eyes.**
   - Where his yellow glow covers at least a quarter of a game pixel, that pixel takes his yellow, and
     the pixels next to it that his amber surround covers take his amber. Nothing round an eye snaps to
     moss.
   - **New: his far eye** is his lemon, (228, 224, 86): the median of the brightest 10% of his far-eye
     pixels (the rest is the olive JPEG halo, which is gone from the palette). It takes as many pixels as
     his oval covers at game scale, the ones it covers most, so it keeps his upright oval (12 px in
     frame 0, 6 in frame 5) instead of the "+" a quarter-coverage threshold gave. It appears nowhere
     else: the stray olive pixels on the shoulder spike and the brow are gone.
7. **Dust.**
   - The pile keeps his own colours, opaque: his cream boulders, tans, browns and dark soil, through 10
     dust colours sampled from his solid dust. His flat bottom is kept: it is his ground and sits on our
     feet line.
   - **New: his spray** (every bit of dust not joined to the pile: the splash fingers, the streaks at the
     near front elbow and along the back spikes, the specks) keeps only his bright stroke. Each of his
     spray pixels counts for how much of it is stroke (by its brightness between his panel and his stroke
     cores), and only his bright orange pixels (red minus blue over 50, luminance at least 110) give the
     colour. A game pixel his strokes cover by half is solid streak orange, by a quarter the same orange
     at alpha 160, less is clear. The spray never takes the dark soil browns, which are the pile's.
     - Frame 5 spray: mean (178.6, 134.1, 85.9) against his (181, 137, 87), within 2%. It covers 365 px
       (827 before), and 14 of them are darker than luminance 85 (422 before).
   - **New: the clod** is drawn from its core, 1 of his px in from its edge (his edge pixels are half
     panel). It is about 6x4 px, like his. It rides the spike in frames 3, 4 and 5 (it comes in with the
     switch to his lunge drawing, not on its own), is kicked off 3.5 px up and back at alpha 160 in
     frame 6, and is gone in frame 7. It no longer blinks on for one frame.
   - His pile's straight left side (x 1137), where his picture's box cut it, ends along his boulders
     instead.

## How the in-betweens are made

Every in-between uses his own pixels; nothing is redrawn.

- **Pieces.** Each key is cut into pieces: the near and far front legs, the near and far hind legs, the
  tail, the tail's outer half and the head. Each has a cut line at its joint and a pivot (the `PIECES`
  table in `drake()`). Far pieces go behind the body, near ones over it. His prowl's round thigh plate
  stays whole on the body; his lunge's tail and near hind leg part along the gap he drew between them;
  **new:** his lunge's two front paws part along the gap between them, so the far paw's claw goes with it.
- **Turning a piece.** A piece turns about its pivot, and the turn eases in from the cut, so it stays
  joined to the body. Under every frame with turned pieces lies the whole body, bent by one smooth field,
  so a joint shows his own pixels stretched a little, never a gap or a flat patch. **New:** that underlay
  is kept to the joints with the body proper; a stray body pixel between his lunge's front paws no
  longer counts as a joint (it bent the paws near it into a detached speck in frames 6 and 7).
- **The body** is scaled about the eye, pitched about the shoulders and carried along the leap.
- **New: the head.** The head piece (cut at the neck, pivoting at the eye) is grown or shrunk and turned
  toward his other drawing's head along powers of the fitted similarity (1.196, 2.2 degrees): frames
  1 and 2 show his prowl head at 1.196^-0.25 and 1.196^-0.5, frames 3 and 4 his lunge head at
  1.196^0.5 and 1.196^0.25, frame 6 his lunge head at 1.196^0.5 and frame 7 at 1.196^1. Its angle is
  held against the body's pitch. So frame 2's head equals frame 3's, frame 7's equals frame 0's, and
  the head size changes a step each frame instead of jumping at the switches. Frames 0 and 5 are his.
- **New: the switches.** The body angles, scales and leg and tail turns of frames 2, 3 and 7 were
  chosen by a coordinate-descent search (frames 1, 4 and 6 are halfway) that minimised the largest
  silhouette change between neighbouring frames, with the eye made to rise every step from frame 0 to
  frame 5. Frame 2 rears up and drops the curled tail; frame 3 is his lunge scaled up 13%, legs pushing
  back and tail lowered; frame 7 is his lunge scaled up 14%, nose down, tail up and legs reaching.
- **Small gaps.** Holes the body surrounds that are under 40 game px are his narrow gaps; they take his
  under-body shadow colour (39, 33, 38) (the slit between the tucked far paw and the jaw in frames 1-2,
  between the hind legs in frame 3).
- **Dust.** The dust lives on the ground: it does not follow the body. It grows about a ground point
  behind the hind feet, ref (1330, 1948), then drifts back and settles as it fades.

| Frame | From | Scale | Head (power of 1.196) | Pitch (deg, + nose down) | Eye (game px below frame 0) | Legs nf, ff, nh, fh, tail (deg) | Dust (x scale, y scale, dx, alpha) |
|---|---|---|---|---|---|---|---|
| 0 | his prowl | - | - | - | 0 | - | - |
| 1 | prowl | 0.995 | -0.25 | -4.5 | claws on the ground (-7.8) | +12.5, -3, +9.5, 0, -6 | - |
| 2 | prowl | 0.99 | -0.5 | -9 | claws on the ground (-15.7) | +25, -6, +19, 0, -12 | - |
| 3 | lunge | 1.13 | +0.5 | +1 | -17.4 | +22, +23, -18, +17, -8 | 0.7, 0.7, +2, 1.0 |
| 4 | lunge | 1.065 | +0.25 | +0.5 | -19.9 | +11, +11.5, -9, +8.5, -4 | 0.88, 0.88, +1, 1.0 |
| 5 | his lunge | - | - | - | -22.3 | - | his pile |
| 6 | lunge | 1.07 | +0.5 | +3.5 | -13.8 | -0.5, -14, -20, +7.5, +10 | 1.04, 0.9, -5, 0.75 |
| 7 | lunge | 1.14 | +1 | +7 | -1 | -1, -28, -40, +15, +20 | 1.08, 0.6, -10, 0.4 |

(A + leg angle swings a hanging foot back; a + tail angle lifts the tail.)

**Silhouette change per step** (body only, without the dust; the share of the two frames' union that
only one of them covers): 17.4, 17.1, **28.2** (2->3), 16.9, 18.4, 28.9, 29.2, **28.4** (7->0). The
switches were 41-43% in the last pass. The body area changes by -1.7, -1.1, -11.0, -10.9, -10.7,
+14.2, +14.3 and +11.2% per step (it was -31% and +45% at the switches).

**No flashing.** The mean brightness of the opaque pixels per frame is 75.4, 75.5, 75.4, 82.8, 84.7,
87.4, 79.6 and 79.8: no step between neighbours is over 9.8% (2->3, where his bright dust bursts up).
Mean alpha x luminance over the frame is 29.1, 28.6, 28.3, 31.1, 30.8, 31.3, 29.8 and 30.0: the largest
step is 9.8% (it was 23% at 7->0). The beast keeps its 8-frame loop, as the frames brief asks.

## Review 3 findings: what changed

| Finding | Status |
|---|---|
| Muddy spray, frames 4-6 (major) | Fixed. The spray is his bright orange strokes with no dark ring; it never takes the soil browns. Frame 5 spray mean (178.6, 134.1, 85.9) against his (181, 137, 87); 365 px against 827. |
| Pop at the 2->3 and 7->0 switches (major) | Fixed within the 8-frame contract. A head piece grows or shrinks along his two heads' similarity, so the head is the same on both sides of each switch (snout tip 1.8 / 1.6 px, horn tip 2.3 / 1.7 px, eye 1.7 / 1.0 px, all of it the body's motion). The searched body poses bring the silhouette change at the switches to 28.2% and 28.4% (from 43% and 41%), no step is over 29.2%, and the body area changes by 11% at the switches (from -31% and +45%). The eye no longer dips at 2->3. I did not lengthen fly to 10 frames: the contract keeps 8. |
| Clod blinks on for frame 5 only, 1.5x his size (minor) | Fixed. It rides the spike in frames 3-5 and is kicked off at alpha 160 in frame 6; it is drawn from its core (about 6x4 px, like his). |
| Far eye olive ring, "+", olive on spike and brow (minor) | Fixed. His lemon (228, 224, 86), his oval's area, no ring; the olive is gone from the palette. |
| Horns warmer than his, speckled seams (minor) | Measured again: the last pass was 3 warmer than his (19.9 vs 16.9 red minus blue, frame 0), the interrupted pass 9 cooler. Now his own horn colours: 15.5 vs 16.9 and 14.7 vs 13.9. No light pixels on his dark seams. |
| Feet in frames 1-2 off the ground (minor) | Fixed. The lowest claw is on the feet line (y 163) in frames 0, 1 and 2. |
| Frame 2 far paw lump; frame 7 forearm stretched (minor) | Fixed. The far front leg turns -6 degrees in frame 2 (was -16), so the paw stays a paw clear of the jaw; the near front leg turns -1 degree in frame 7 (was -24), so the forearm keeps its length. Also fixed: a detached claw speck between the front paws in frames 6-7. |
| Size, placement, colour count (minor) | Colour count corrected above. Size and placement are below and in "Feet line and placement". |

Earlier reviews (`review-beast-r1/`, `review-beast-r2/`): the dust pile is opaque in his colours and on
his ground, nothing is cut at the edges, no holes in the body, the thigh plate and the tail base are clean.
This pass checked them again.

## Switching back to the serpent

On the owner's order, the serpent's code is deleted: there is no switch and no fallback. Its last
version is in git at commit `83fb8d9`, in `tools/world-sprites/vfx-beasts.ts`. It is the
"STONE DRAGON (earth)" section, lines 638 to 827 (`STONE`, `facet`, `litN`, `earthSpine`,
`stoneDragon`). A copy of that file is also at `scratchpad/drake/orig/vfx-beasts.ts`.

To bring the serpent back:

1. Paste that section back into `vfx-beasts.ts`.
2. In `BUILDERS`, set `['earth', stoneDragon]`.
3. Drop the `REF_EARTH` import and `stoneDrake()`, or leave them unused.

The serpent sheet in the game now is still `src/assets/world/vfx_beasts/earth.png` (150x106, anchor
[85, 40]). Nothing in `src/` was touched.

## Rebuild

```
# frame data (deterministic; repeated runs are byte-identical). The debug folder, if given, must exist.
python3 -I tools/refs/beasts-from-ref.py drake docs/reference/earth-set-owner-reference.jpg docs/reference/earth-set-owner-reference.jpg tools/world-sprites/vfx-beasts-ref-earth.ts [debugDir]

# sheets (refuses to run without WORLD_OUT)
WORLD_OUT=<art2>/staging npx tsx tools/world-sprites/vfx-beasts.ts <art2>

# this review sheet and GIF (the json is the converter's sidecar from debugDir)
python3 -I <art2>/beasts-drake-review.py <art2>/staging/vfx_beasts <art2>/REF-earth-set-owner.jpg <art2>/beasts-ref-earth.json <art2>/beasts-character.png <art2>/beasts-drake.png <art2>/beasts-drake.gif
```

To put the drake in the game, copy `staging/vfx_beasts/earth.png` and only the `earth` entry of
`staging/vfx_beasts/manifest.json` into `src/assets/world/vfx_beasts/`. The in-game manifest holds
a different set of beasts.

## Checks

- **Other beasts unchanged.** Built before and after this pass: water, genjutsu, poison, fire,
  lightning, wind and chakra are md5-identical, and the manifest differs only in the `earth` entry.
- **Converter.** Re-running phoenix, raiju and crane reproduces `vfx-beasts-ref-fire.ts`,
  `-lightning.ts` and `-wind.ts` byte-for-byte.
- **Determinism.** Three drake runs are identical (md5 d78a56de...), one of them from the `art2` copy of
  the reference. Two sheet builds are identical (`earth.png` md5 64a5710a..., and the manifest).
  Nothing is random.
- **Border.** No pixel with any alpha touches the frame border in any frame of any `vfx_beasts`
  sprite. The drake keeps at least 3 px clear on every side in every frame.
- **Types.** `npx tsc --noEmit -p .` reports no errors.

## Known differences from his picture

1. **The left side of his dust pile.** He drew a straight vertical side there, where his picture's
   box cut the pile. Ours ends along his boulders.
2. **Size against his label.** His panel still says "150x106". His drawing, measured against his own
   character (228 px against our 96), gives this 287x167 frame: the drake is about 4.1 m long, much
   bigger than the other beasts. His panels measure about 5% larger than his character does, so a
   panel-based scale would give about 5% less. I followed his character. **Please confirm the drawing's
   scale over the 150x106 label with the owner before integrating.**
3. **The switches between his two drawings.** Frames 0-2 are his prowl drawing, frames 3-7 his lunge
   drawing. The head and the outline are brought together at 2->3 and 7->0, but the curled tail turns
   into the straight one, the moss on the back changes and the hind legs go from planted to tucked in
   one frame. These are his two drawings, so it is a cut, not a morph. About 28% of the silhouette
   changes there, as much as at the fall steps 5->6 and 6->7. A bridge frame at each switch would need a
   10-frame loop.
4. **Scaled drawings.** Frames 3, 4, 6 and 7 show his lunge scaled up 6-14% (and his prowl head shrunk
   in frames 1-2), so their finest cracks are a touch softer than in his two key frames.
5. **Fading dust.** Frames 6 and 7 are semi-transparent as the dust settles; frames 3-5 are opaque.
6. **Fine detail.** His outlines and finest cracks are thinner than half a game pixel, so some cracks
   between plates come out softer. His far eye in frame 5 is a slim 6 px oval.
7. **The jaw.** It is not animated: opening it would need redrawn mouth pixels.
8. **Bent joints.** The bent joints stretch a few of his pixels where a leg turns most (the near hind
   leg in frame 7, the near front leg in frames 2 and 3).

## Files

- **Changed:**
  - `tools/refs/beasts-from-ref.py`: drake mode only. Phoenix, raiju and crane are untouched.
  - `tools/world-sprites/vfx-beasts-ref-earth.ts`: the regenerated data.
  - `tools/world-sprites/vfx-beasts.ts`: the earth section's comment (the code is as in the last pass:
    `stoneDrake()` and `beastSprite()`'s `pad` argument, default 1).
  - `tools/refs/README.md`: the drake paragraph.
- **Deliverables:** `beasts-drake.png` (now with onion skins of the two switches), `beasts-drake.gif`,
  this file, `beasts-drake-review.py` and `beasts-ref-earth.json`.
- **Refreshed by the build:** `staging/vfx_beasts/` and the beasts previews in `art2`.
- **Work and debug images:** `scratchpad/drake/r6/` (the search: `tune3.py`, `cfg-*.json`, `log-*.txt`;
  the checks: `checks.py`, `metrics.py`, `measure.py`, `xor.py`; `dbg-final2/` holds the segmentation,
  the cut-out pieces, his pictures beside ours and onion skins).
