# Stone drake (earth beast): notes

This is the owner's new four-legged stone drake, copied from the BEAST panel of his earth sheet
(`docs/reference/earth-set-owner-reference.jpg`, the same file as `art2/REF-earth-set-owner.jpg`).
It replaces the old stone serpent. As he asked, the serpent's code is deleted.

- His LEFT picture (the prowl) is fly frame 0.
- His RIGHT picture (the low lunge, with dust kicking up behind the hind legs) is fly frame 5.

This is the third pass. It finishes the fixes for the art director's two reviews
(`review-beast-r1/` and `review-beast-r2/`). What changed for each finding is listed under
"Review findings" below.

## Sprite contract (`vfx_beasts/earth`)

| | |
|---|---|
| Frame | **280 x 163** (the serpent was 150x106) |
| Anchor | **[151, 78]**, the middle of the prowl's torso, between his shoulder and his hip |
| Animation | `fly`, 8 frames, 12 fps, loop, facing right (unchanged) |
| Label / meters | `Stone drake (earth)`, [4.1, 2.5] (the body in frame 0, at 57 px/m) |
| Clear margin | 3 px on every side in every frame (the other beasts keep 1) |
| Colours | 78: his stone, moss, horn and glow colours, his horn highlight, eye amber and far-eye yellow-green, the outline, and his 10 dust colours (opaque, plus two lighter alphas while the dust fades) |
| Outline | `#191519` (25, 21, 25): the median of the dark pixels on his silhouette, a cool deep brown, not black. It sits on the inner ring of the silhouette. |

## Feet line and placement

**Feet line: y = 159** inside the frame, **81 px below the anchor**. This is the lowest claw of
frame 0 and also his ground line. His dust pile's flat bottom sits on it, and no pixel in any frame
goes below it.

To make the drake run on the ground, put the anchor at `groundY - 81` with no lift and no hop.

Today's flight path in `src/components/battle/vfxSprites.ts` (`flight`, with the lift set in
`playback.ts` at line 407) does not do that:

- It lifts the anchor 70 px at the start (120 when cast from a head).
- At the end it lifts it 30 px for a shaped jutsu, or 60 px otherwise.
- It adds a 30 px sine hop in between.

With the feet 81 px below the anchor, they would hang 11 px below the ground at the start and
21–51 px below at the end. For a ground run, give the earth beast a lift of [81, 81] and no sine
hop. I did not touch `src/`.

## The frames

Frame coordinates. "Eye" is his near eye, placed exactly (no search).

| Frame | From | Eye (x, y) | Body top to lowest claw | Dust |
|---|---|---|---|---|
| 0 | his prowl | (244.5, 88.9) | 16 to 159 (on the ground) | none |
| 1 | prowl | (245.0, 82.5) | 12 to 156 | none |
| 2 | prowl | (245.4, 76.0) | 7 to 155 | none |
| 3 | lunge | (244.0, 75.0) | 8 to 129 (airborne) | bursts off the ground, 70% size |
| 4 | lunge | (244.2, 70.5) | 5 to 128 | 88% size |
| 5 | his lunge | (244.5, 66.6) | 3 to 128 | his pile, opaque |
| 6 | lunge | (243.6, 76.5) | 7 to 127 | drifts back and settles, 63% alpha |
| 7 | lunge | (242.9, 86.7) | 15 to 130 (about to land) | low and spread, 37–63% alpha |

- **Eye x** stays within 2.5 px over the whole loop.
- **Eye y** rises 22 px over frames 0–5 and comes down over 5–0. The steps are −6.5, −6.5, −0.9,
  −4.5, −3.9, +9.9, +10.2 and +2.2.
- **The two switches between his drawings** happen at 2→3 and 7→0. The head is held there: it moves
  0.9 and 2.2 px. The body changes pose under a steady head.
- **The fall is faster than the rise**: a heavy body springs up and comes down hard.

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
- **His two heads do not line up on the torso.** On a torso alignment his two eyes are 14 game px
  apart (the first pass claimed otherwise). The head moves on the arc in the table above instead.

## How the key frames are made (`beasts-from-ref.py drake`)

1. **Crop.** Each picture is cropped from the panel. The borders are at x 502–1758 and
   y 1544–1975, and the two pictures split at x = 1118. The panel colour is (34, 34, 44).
2. **Segmentation.**
   - The body is the largest region that differs from the panel. His enclosed seams are filled in.
   - His dark under-body shadow is kept. This is the belly, under the chin and neck, and the far
     legs. These pixels are about (46, 36, 48): barely lighter than the panel, but warmer (red − blue
     about −2, against the panel's −10). The 1–2 px ring of JPEG ringing round his outline is not
     counted as shadow.
   - The dust is the saturated orange-brown pixels in his lunge.
   - Two pieces of loose dirt go with the dust: the clod on the tip of his tallest back spike, and
     the streak that ends on the spikes above the hip.
   - **New:** the clod keeps only its own bright, warm pixels. The dark JPEG ring above the spike tip
     is dropped, and the spike keeps its outline.
   - Dark edging next to the dust goes with the dust.
3. **Downsampling.** The image is area-averaged to game scale. Colours snap to a palette sampled
   from his pixels: 30 stone, 8 moss, 5 horn grey and 5 glow colours, plus his near-white horn
   highlight (162, 157, 153) and the amber (200, 149, 74) of his eye surround.
4. **Outline.** The silhouette's inner ring becomes a 1 px outline in his edge colour (25, 21, 25).
5. **Eyes.**
   - Where his yellow glow covers at least a quarter of a game pixel, that pixel takes his yellow.
   - Pixels next to it that his amber surround covers take his amber.
   - **New:** his far eyes glow a paler yellow-green, (175, 176, 81), sampled from his pixels. Where
     that covers a quarter of a pixel, the pixel takes it.
   - **New:** the pixels round an eye never snap to a moss green. Before, they did, which gave the
     eyes a green rim he did not draw.
6. **Dust.**
   - The pile keeps his own colours, opaque: his cream boulders (luminance about 180–190), tans,
     browns and dark soil, through 10 dust colours sampled from his solid dust.
   - Only streaks and specks thinner than a game pixel get a partial alpha (160).
   - In frame 5, 5,070 of 5,156 dust pixels are opaque. Over his panel colour, the pile's mean
     luminance is 109 against his 107; the top 10% is 181 against his 181.
   - His flat bottom is kept: it is his ground and sits on our feet line.
   - **New:** his 23 loose specks keep only their bright pixels. The dark JPEG ring round each one
     (842 of his px in all) is dropped, so they are his size and have no dark-brown rim.
   - His pile has one straight vertical side (x 1137), where his picture's box cut it. Ours ends along
     his boulders instead: the two cream boulders the line cuts are rounded off, the darker soil
     between them stays a few of his px further in, and the pile's foot spreads to the line on the
     ground.

## How the in-betweens are made

Every in-between uses his own pixels; nothing is redrawn.

- **Pieces.** Each key is cut into pieces: the near and far front legs, the near and far hind legs,
  and the tail. Each piece has a cut line at its joint and a pivot (the `PIECES` table in
  `drake()`). Crumbs smaller than 60 of his px that are not joined to a piece stay on the body.
- **New: his prowl's thigh stays whole.** His big round near-thigh plate is now kept on the body. The
  shin and foot turn behind it, as he drew them, and so does the far hind leg. Before, the leg's cut
  ran through the bottom of the plate, which tore it in frames 1 and 2.
- **New: his lunge's tail and near hind leg part along his gap.** They now part along the dark gap he
  left between them. The tail keeps its whole underside outline, and no sliver of either is left
  behind as a dark stub or whisker when they move apart.
- **Turning a piece.** A piece turns about its pivot, and the turn eases in over 12–26 of his px
  from the cut. So the piece stays joined to the body, and his pixels next to the cut are unchanged.
- **New: smooth joints, not a flat patch.** Under every frame with turned pieces lies the whole body,
  bent by one smooth field. Each piece's own turn blends into the still body across the piece's
  sides, over about 4 of his px for each of 3 box passes. This layer is used only where a piece lay
  within 10 of his px of the body.
  - So whatever a turned piece uncovers at its joint shows his own pixels, stretched a little, as a
    joint does.
  - Before, this was filled with one flat shadow colour, and the review saw it as a flap with a
    sawtooth edge under the tail.
- **Small gaps.** Holes the body surrounds that are under 40 game px are his narrow gaps; they take
  his under-body shadow colour (39, 33, 38). That is 22 px in frame 0, mostly the gap he drew
  between the tail and the shin. An in-between has at most 41 px of it, in frame 2, where the tucked
  far paw meets the jaw.
- **Layers.** Far legs go behind the body and near legs over it. The outline is drawn once, after all
  pieces are combined. A moved near leg keeps a 1 px edge where it crosses the body.
- **Pitch and bob.** The body pitches about the shoulders and is carried along the leap.
- **Dust.**
  - The dust lives on the ground: it does not follow the body's bob.
  - It grows about a ground point behind the hind feet, at ref (1330, 1948), with separate x and y
    scales.
  - Then it drifts back and settles (it spreads out low) as it fades.

| Frame | From | Pitch (deg, + nose down) | Bob (game px, + down) | Legs nf, ff, nh, fh, tail (deg) | Dust (x scale, y scale, dx, alpha) |
|---|---|---|---|---|---|
| 0 | his prowl | – | – | – | – |
| 1 | prowl | −2 | −4.5 | +8, −8, +10, +6, −6 | – |
| 2 | prowl | −4 | −9 | +16, −16, +20, +12, −12 | – |
| 3 | lunge | +4 | +4.6 | −2, +2, −12, −10, +6 | 0.7, 0.7, +2, 1.0 |
| 4 | lunge | +2 | +2 | −1, +1, −6, −5, +3 | 0.88, 0.88, +1, 1.0 |
| 5 | his lunge | – | – | – | his pile |
| 6 | lunge | +6 | +4.2 | −14, −10, −16, −12, +6 | 1.04, 0.9, −5, 0.75 |
| 7 | lunge | +9 | +11.6 | −24, −18, −22, −18, +12 | 1.08, 0.6, −10, 0.4 |

(A + leg angle swings a hanging foot back; a + tail angle lifts the tail.)

The cycle reads as a heavy bounding charge:

1. **0:** his prowl, gathered on the ground.
2. **1–2:** the hind legs push, the front legs tuck, the tail drops and the body rises.
3. **3–4:** his lunge springing off the ground, as his dust bursts up behind the hind feet.
4. **5:** his lunge at the top of the leap.
5. **6:** coming down nose first, front legs reaching, as the dust drifts back.
6. **7:** about to land, nose down and tail up, as the dust settles and fades.
7. **Back to 0:** landed.

**No flashing.** The mean brightness of the opaque pixels per frame is 75.4, 75.6, 75.6, 83.3,
85.3, 86.7, 79.4 and 79.2: no step between neighbours is over 9%. Mean alpha × luminance over the
frame is 30.6, 30.4, 30.3, 27.5, 30.5, 33.9, 28.6 and 24.8. The largest step is 19%, at 7→0, where
the body fills out from his slim lunge to his gathered prowl and the last of the dust is gone. That
is a change of coverage, not of brightness. The dust now fades over two frames (63%, then 37–63%)
instead of dropping from opaque to 37% in one. The beast keeps its 8-frame loop, as the frames
brief asks.

## Review findings: what changed

Review 1 (`review-beast-r1/`). The second pass fixed most of these, and this pass checked each one
again.

| Finding | Status |
|---|---|
| Frame 5 dust see-through, darker, sine fringe (major) | Fixed. His pile is opaque in his colours, with his cream boulders and flat bottom; the luminance matches his (109 vs 107). |
| Dust below the feet line (major) | Fixed. The lunge is placed on his ground, so the pile bottom is the feet line (y 159) in frames 3–7. |
| Dust cut at the left edge in frames 6–7 (major) | Fixed. Nothing is cut: the converter's canvas keeps 20+ px clear, and the sprite now keeps 3 px clear on every side. The border check runs with a 3 px margin for this sprite. |
| Holes in the body (major) | Fixed. His dark under-body shadow is body; small enclosed gaps are closed. The joints of turned pieces show his own pixels, bent (new this pass), so there are no gaps and no flat patches. No frame has a see-through hole inside the body. |
| Head jump at 6→7 (major) | Fixed. The switches are at 2→3 and 7→0, with the head moving 0.9 and 2.2 px. Eye x varies by 2.5 px. The NOTES no longer claim the heads line up on the torso. |
| Frame 2 snout clipped | Fixed. Every frame has at least 20 px clear on the right in the converter. |
| Back-spike stub | Fixed. The clod and streak fly with the dust; the clod no longer carries its dark JPEG ring. |
| Eyes and horns | Fixed. His amber surround, his horn highlight and (new) his far-eye yellow-green are in the palette. |
| Outline | Fixed. His (25, 21, 25), on the inner ring. |
| Size against his label | In the known differences below. |
| In-game placement | In "Feet line and placement" above. |

Review 2 (`review-beast-r2/`), all fixed this pass:

- **Near hind thigh torn at the cut, frames 1 and 2 (major).** The thigh plate is now whole on the
  body. Frame 7 is now from his lunge, where the leg was already clean.
- **Flat joint-fill flap and sawtooth under the tail base, frames 3, 4, 6 and 7 (major).** These came
  from the flat fill and from a sliver of his under-tail shadow left on the body. Fixed by the bent
  body under the joints and by parting the tail and leg along his gap.
- **Eye rim snapped to moss green (minor).** Fixed.
- **Clod bloated by the JPEG halo (minor).** It now keeps only its own bright pixels. It is still
  about 1 px wider than his.
- **Specks with a dark-brown halo, about 1.4x his size (minor).** Fixed.

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

- **Other beasts unchanged.** I built before and after this pass.
  - Water, genjutsu, poison, fire, lightning, wind and chakra are byte-identical (md5).
  - The manifest differs only in the `earth` entry.
  - `beastSprite()` gained a `pad` argument that defaults to 1, so only the drake's crop changes.
- **Converter.**
  - Re-running phoenix, raiju and crane reproduces `vfx-beasts-ref-fire.ts`, `-lightning.ts` and
    `-wind.ts` byte-for-byte.
  - Three drake runs are identical (md5 585b212c…): two from `docs/reference` and one from the
    `art2` copy of the reference.
- **Determinism.** Two sheet builds are identical (`earth.png` md5 a9cca90f…, and the manifest).
  Nothing is random.
- **Border.** No pixel with any alpha touches the frame border in any frame of any `vfx_beasts`
  sprite. The drake keeps at least 3 px clear on every side in every frame.
- **Holes.** Over green, no frame has a see-through hole inside the body. The enclosed clear areas
  left in frames 3–7 lie between the tail, the hind legs and the dust, where his panel shows too.
- **Types.** `npx tsc --noEmit -p .` reports no errors.

## Known differences from his picture

1. **The left side of his dust pile.** He drew a straight vertical side there, where his picture's
   box cut the pile. Ours ends along his boulders: the two boulders the line cuts are rounded off
   (by up to 11 of his px, about 5 game px) and the foot spreads to the line on the ground.
2. **Size against his label.** His panel still says "150×106". His drawing, measured against his
   own character, gives 280×163: the drake is about 4.1 m long, much bigger than the other beasts.
   I followed his drawing. **Please confirm the drawing's scale over the 150×106 label with the
   owner before integrating.**
3. **The switch between his two drawings.**
   - Frames 1 and 2 come from his prowl, and frames 3, 4, 6 and 7 from his lunge.
   - At 2→3 and 7→0 the tail (curled vs straight), the moss cover and the legs change in one
     frame. These are his two drawings, so it is a cut, not a morph. The head is held through it.
   - The claws go from planted (y 155) to tucked (y 129) at 2→3, which reads as the spring. They go
     from y 130 to planted at 7→0, which reads as the landing.
4. **Fading dust.** Frames 6 and 7 are semi-transparent as the dust settles; frames 3–5 are opaque.
5. **Fine detail.** His outlines and finest cracks are thinner than half a game pixel, so some
   cracks between plates come out softer.
6. **The eyes.** Our near eye is a few yellow pixels with his amber; his glow is a touch larger. The
   far eyes are a few of his yellow-green pixels.
7. **The jaw.** It is not animated: opening it would need redrawn mouth pixels.
8. **Small details.**
   - In frame 2 the far front paw tucks up partly behind the jaw.
   - Once the clod has flown off (frames 3, 4 and 6), the tallest spike shows the blunt tip he drew
     under it. The clod is about 1 px wider than his.
   - The bent joints stretch a few of his pixels where a leg or the tail turns most (frames 2 and 7).
9. **The generator guard.** Since the first pass, `vfx-beasts.ts` refuses to run without WORLD_OUT,
   as the generator rule requires. It used to write into `src/assets/world` by default.

## Files

- **Changed:**
  - `tools/refs/beasts-from-ref.py`: drake mode only. Phoenix, raiju and crane are untouched; the
    new `soften()` helper is used only by the drake.
  - `tools/world-sprites/vfx-beasts-ref-earth.ts`: the regenerated data.
  - `tools/world-sprites/vfx-beasts.ts`: the earth section, and `beastSprite()`'s new `pad` argument
    (default 1).
  - `tools/refs/README.md`: the drake paragraph.
- **Deliverables:** `beasts-drake.png`, `beasts-drake.gif`, this file, `beasts-drake-review.py` and
  `beasts-ref-earth.json`.
- **Refreshed by the build:** `staging/vfx_beasts/` and the beasts previews in `art2`.
- **Work and debug images:** `scratchpad/drake/r4/`.
  - `dbg-final/` holds the segmentation, the cut-out pieces, his pictures beside ours and onion skins.
  - `t5-head*.png`, `t6-clod.png`, `t5-specks.png`, `t4-thigh.png`, `t3-tail-5346.png` and
    `t3-hind-0127.png` are zooms of the fixes.
