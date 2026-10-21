# Stone drake (earth beast): notes

This is the owner's new four-legged stone drake, copied from the BEAST panel of his earth sheet
(`docs/reference/earth-set-owner-reference.jpg`, the same file as `art2/REF-earth-set-owner.jpg`).
It replaces the old stone serpent. As he asked, the serpent's code is deleted.

- His LEFT picture (the prowl) is fly frame 0.
- His RIGHT picture (the low lunge, with dust kicking up behind the hind legs) is fly frame 5.

This is the fifth pass. It fixes the art director's fourth review (`review-beast-r3/REVIEW-drake-r4-findings.png`).
What changed for each finding is listed under "Review 4 findings" below.

The owner approved this drake with one change, "cierra ese polvo": the dust under the hind legs ended in a
straight horizontal line, where his panel cut it. That is now closed, and so is the straight vertical left side
the burst showed in frames 3-4 (see "The dust's bottom and left side, closed" below). Nothing else in the drake
changed.

## The dust's bottom and left side, closed (owner: "cierra ese polvo")

His panel cut his dust pile off flat along the ground, so frames 3-7 showed a straight line under the dust (in frames 3-5
an unbroken run of 106-150 px on row 163). It is closed the way the fire 3/4 wall's ends were closed: from his
own pixels, along a ragged edge.

- **Rounded puffs.** The pile's bottom is a row of 14 rounded puffs (`FOOT_PUFFS` in `beasts-from-ref.py`, his
  coordinates). Each puff is his own pile; two of them are his cream boulders that sat on the cut, rounded off
  underneath. Between the puffs the soil stays 3-6 game px further up. The puffs get smaller and stay further off
  the ground toward both ends, so both bottom corners round off and the thin soil tail on the right breaks into
  small puffs. A slow wobble (about half a game px) keeps the arcs ragged rather than drawn with a compass.
- **Thinning out.** Each puff thins out over its last 5 of his px (about 2 game px) into partly clear dust, in his
  partly clear dust colours. No new colour was added: the frames use the same 87 colours as before.
- **All dust frames.** The cut is applied to his pile itself, so the burst (frames 3-4, scaled about the ground)
  and frame 5 end the same way.
- **Settling (frames 6-7).** The settling keeps his boulder clusters, their fade order and his soil tones exactly
  as before, worked out on his uncut pile. The pile still wears down from the top, so the settling dust sinks
  onto the same puffs and thins out with them. Frame 7's low band ends in small, rounded, partly clear bits,
  not flat-bottomed patches.
- **The left side (second step).** His box line also cut the pile's left side. The last pass only rounded it where
  it cut a cream boulder; between those it stayed one straight vertical line 15 of his px in. The burst (frames
  3-4, his pile scaled about the ground) showed that as a vertical wipe: 10 rows straight at x 57 in frame 3 and
  14 at x 42 in frame 4. Frame 5 had the same line, 16 rows at x 32, recessed between two boulders, and frame 6
  had 10 rows. The side is now a column of five rounded puffs (`SIDE_PUFFS`):
  - his top and bottom cream boulders, out on the line;
  - the cream boulder between them, a puff 15 px in;
  - a small soil puff under it, and one above the foot.
  The side curls in 3-5 game px between the puffs. Each puff thins out over its last 5 px like the bottom's, and
  the same slow wobble keeps the edge ragged. The cut only takes pixels away from the last pass's side, so his
  palette and his pile and spray stay as they were. Frames 3 and 4 are his pile scaled up about the ground, so the
  burst grows into frame 5's side puff by puff, with no straight edge sweeping across. In the settling frames the
  spreading boulders keep their own left sides: they already fade out as clusters, and frame 7's leftmost boulder
  still sets the frame's left edge. Frame 5's left side changes too: its straight recess is now puffs. This is
  the shape that frames 3-4 grow into.
- **What changed in the pixels.** Only frames 3-7 changed: their bottom 9 rows (y 155-163) and, on the left side,
  x 4-64 from y 118 down. Frames 0-2 and the rest of frames 3-7 (the body, the spray, the clod and the rest of the
  pile) are pixel-identical to the last pass. The frame is still 284x167 with anchor [157, 82], 8 frames at 12 fps.
- **The flat check.**
  - The longest run of dust pixels on row 163 is now 3-5 px in every frame (it was 106, 132, 150, 58 and 14 in
    frames 3-7).
  - The longest level stretch of the dust's lower edge is now 6-8 px, a puff's rounded bottom.
  - The longest vertical stretch of the dust's left edge is now 4-5 rows in every frame, a puff's rounded side
    (it was 10, 14, 16, 10 and 4 in frames 3-7).
- **Before and after:** `scratchpad/pw/drake-dust-fix.png`. At the top, frames 3-7 at 3x. Below, the left side at
  5x, frames 3-6.

## Sprite contract (`vfx_beasts/earth`)

| | |
|---|---|
| Frame | **284 x 167** (last pass 287x167; the serpent was 150x106). The frame is the union of all 8 frames plus 3 px; it lost 3 px on the left because frame 7's tail now curls up instead of reaching out flat. |
| Anchor | **[157, 82]**: the same point as before, the middle of the prowl's torso (the frame's left edge moved, so x went from 160 to 157) |
| Animation | `fly`, 8 frames, 12 fps, loop, facing right (unchanged) |
| Label / meters | `Stone drake (earth)`, [4.1, 2.5] (the body in frame 0, at 57 px/m) |
| Clear margin | 3 px on every side in every frame (the other beasts keep 1) |
| Colours | 87 RGBA entries in the data (72 distinct RGB colours). New: his near-eye socket brown, his far eye's three colours, his three pebble greys, and partly clear alphas for the settling dust. The drake now has more colours than the shared 78-symbol alphabet, so its data module carries a longer alphabet of its own. The phoenix, raiju and crane modules keep the shared one, byte for byte. |
| Outline | `#191519` (25, 21, 25): the median of the dark pixels on his silhouette, a cool deep brown, not black. |

## Feet line and placement

**Feet line: y = 163** inside the frame, **81 px below the anchor** (unchanged). This is the lowest claw of
frame 0 and his ground line. His dust pile's rounded puffs come down to it in frames 3-7, the hind claws stand
on it in frames 0-2, and no pixel in any frame goes below it.

To make the drake run on the ground, put the anchor at `groundY - 81` with no lift and no hop.

Today's flight path in `src/components/battle/vfxSprites.ts` (`flight`, with the lift set in `playback.ts`) does
not do that:

- It lifts the anchor 70 px at the start (120 when cast from a head).
- At the end it lifts it 30 px for a shaped jutsu, or 60 px otherwise.
- It adds a 30 px sine hop in between.

With the feet 81 px below the anchor, they would hang 11 px below the ground at the start and 21-51 px below at
the end. For a ground run, give the earth beast a lift of [81, 81] and no sine hop. The dust pile is baked into
frames 3-7, so on a moving drake it slides along with it; if that shows, the pile should become a separate
one-shot sprite anchored to the ground at the take-off point. I did not touch `src/`.

## Open question for the owner: size

His panel label still says "150x106", but his drawing, measured against his own character (228 px against our
96), gives this 284x167 frame: the drake is about 4.1 m long, about 1.5 times the hero's height and about twice
the other beasts. Every other panel on his sheet matches its label at his character's scale, so the label is
probably stale. **Please confirm the drawing's scale over the label before integrating.**

A second question goes with it: his lunge is drawn smaller than his prowl (his prowl head is 1.196 times his
lunge head; the lunge body covers about 70% of the prowl's area). Frames 0 and 5 are his pictures at his scale,
so the in-betweens have to change size: the body area changes -1.7, -1.2, -11.1, -10.7, -10.4, +14.1, +13.8 and
+11.5% per step. The reviewer reads that as a zoom pulse. Two ways out, both the owner's call:

1. Show his lunge at his prowl's scale (frame 5 about 1.13-1.2 times his drawing). There would be no pulse, but
   frame 5 would no longer be his picture at game scale.
2. Keep both pictures at his scale (as now). The pulse stays.

I kept option 2, because the owner's rule is that his pictures are the key frames. The reviewer's fallback
(hold one scale over frames 3-6, change size only at the switches) brings back the 31-45% area jumps at the
switches that the last pass removed, so I did not use it.

## The frames

Frame coordinates are exact, from the converter. "Eye" is his near eye, "snout" his snout tip, "horn" the tip of
his upright horn, "tail" the end of his tail's centre line (new).

| Frame | From | Eye (x, y) | Snout | Horn | Tail tip | Lowest claw | Dust |
|---|---|---|---|---|---|---|---|
| 0 | his prowl | (250.5, 92.9) | (280.9, 103.0) | (245.5, 37.2) | (68.2, 55.1) | 163 (ground) | none |
| 1 | prowl | (250.5, 85.1) | (279.6, 94.4) | (245.2, 31.8) | (31.0, 74.9) | 163 (ground) | none |
| 2 | prowl | (250.5, 77.2) | (278.4, 85.8) | (245.0, 26.3) | (24.3, 119.5) | 163 (ground) | none |
| 3 | lunge | (250.5, 75.5) | (277.1, 84.6) | (244.5, 24.1) | (25.4, 121.2) | 147 | bursts off the ground at 70% size; clod on the spike |
| 4 | lunge | (250.5, 73.0) | (276.0, 81.5) | (244.3, 23.9) | (35.0, 125.6) | 140 | 88% size; clod on the spike |
| 5 | his lunge | (250.5, 70.6) | (275.0, 78.5) | (244.1, 23.7) | (48.3, 126.2) | 132 | his pile, opaque; his clod |
| 6 | lunge | (250.5, 79.1) | (277.1, 88.2) | (244.5, 27.7) | (37.3, 68.9) | 138 | breaking up: dark soil going, boulders spreading; clod kicked off at 63% |
| 7 | lunge | (250.5, 91.9) | (279.4, 102.4) | (244.9, 35.6) | (65.3, 52.5) | 144 (about to land) | a low, broken band, mostly partly clear |

- **Tail tip steps:** 42.2, 45.1, **2.0** (2->3), 10.6, 13.3, 58.3, 32.5, **3.9** (7->0). At the two switches
  between his drawings the tip used to jump 71 and 77 px. Now the tail moves the whole way round the loop: his
  curl opens and swings down in frames 1-2, the spear swings up and curls in frames 6-7.
- **Head:** the eye keeps one x; the eye, snout tip and horn tip move 1.0-2.3 px across the switches (unchanged
  from the last pass).

## How the key frames are made (`beasts-from-ref.py drake`)

1. **Crop.** Each picture is cropped from the panel. The borders are at x 502-1758 and y 1544-1975, and the
   two pictures split at x = 1118. The panel colour is (34, 34, 44).
2. **Segmentation.**
   - The body is the largest region that differs from the panel. His enclosed seams are filled in.
   - His dark under-body shadow is kept, but the 1-2 px ring of JPEG ringing round his outline is not.
   - The dust is the saturated orange-brown pixels in his lunge. The clod on his tallest back spike and the
     streak on the spikes above the hip go with the dust.
3. **Downsampling.** The image is area-averaged to game scale (96/228 = 0.4211). Colours snap to a palette
   sampled from his pixels: 30 stone, 8 moss, 5 glow colours, his 8 horn colours, his horn highlight and his
   eye amber.
4. **Outline.** The silhouette's inner ring becomes a 1 px outline in his edge colour.
5. **Horns.** Inside his horns, pixels snap only to his own horn greys (unchanged).
6. **Eyes (new this pass).**
   - **Near eye:** his yellow glow and his amber as before. **New:** his dark burnt-orange socket rim,
     (102, 70, 26), the median of his rim pixels within 24 px of the eye. It is carried as its own layer through
     every warp, and a pixel next to the glow that his rim covers by a quarter takes it. So the eye sits in his
     dark socket (left and under the glow) as he drew it.
   - **Far eye:** stamped whole from his own picture box-filtered onto our grid. It has his bright lemon
     (217, 214, 90) where it glows (4 px in frame 0), his shaded olive-yellow (160, 160, 69) (7 px in frame 0,
     5 px in frame 5) and his olive rim (126, 124, 59) on the cells next to it, but never on the outline.
     The stone round it takes only his stone and horn greys: no moss, amber or glow.
     - Frame 5's far eye is dim olive-yellow like his, not lemon.
     - In the in-betweens the stamp sits at the far eye's transformed place and only its height follows the
       head's size (nearest rows: 5-7 rows). It is never resampled, so no "+" or zigzag.
7. **Dust.**
   - The pile keeps his own colours, opaque, on his ground (unchanged).
   - **His spray (new):**
     - The darker parts of his strokes (still clearly orange) now say where a stroke is. The colour still
       comes from his bright stroke cores, where a pixel has one.
     - The wide streak between the hind paws is solid again: gating by the bright cores alone had left its
       middle see-through.
     - Along the middle line of a thin streak a sixth of coverage is enough for the partly clear orange (a
       quarter elsewhere), and a one-pixel break between two streak pixels is closed. So thin streaks stay
       unbroken lines.
   - **His pale pebble specks (new):** small, light, unsaturated specks off the body (bits of stone flung up)
     are kept in his own three pebble greys. Before, they were dropped.
   - The clod is drawn from its core, rides the spike in frames 3-5 and is kicked off in frame 6 (unchanged).
8. **Pinholes (new).** After each frame is drawn, a clear pixel with three or four drawn 4-neighbours, or a
   clear hole under 8 px that the frame closes in, takes its darkest drawn neighbour (an outline or a streak,
   as he drew it). This closes the slit between the elbow streak and the forearm in frame 5 and the pinholes
   by the clod in frames 3 and 5. It repeats until none is left (at most 8 passes), so a hole split by the first
   fill closes too.

## How the in-betweens are made

Every in-between uses his own pixels; nothing is redrawn.

- **Pieces.** Each key is cut into pieces: the near and far front legs, the near and far hind legs, the tail and
  the head (the `PIECES` table). **New:** the lunge's near hind foot, cut at the ankle, is a child of the hind leg.
  The old "tip" child pieces of the tails are gone: no frame used them, and the tail now bends as a whole.
- **Turning a piece.** A piece turns about its pivot, easing in from its cut, over a bent copy of the whole body,
  so a joint shows his own pixels stretched a little, never a gap (unchanged).
- **The tail bends along its centre line (new, the major fix).**
  - Each tail has a centre line (`TAIL_AXIS`, his coordinates, checked on his crops). The prowl's runs from the
    hip into the hook; the lunge's runs down the spear.
  - `curl` w bends a tail toward his other drawing's tail. From a fifth of the way out, its turning along the
    line moves w of the way to the other tail's turning (0 = his own tail, 1 = bent just like the other).
  - Every tail pixel (4 x 4 samples per pixel) keeps its place along the line and its signed distance from it,
    and is laid down on the bent line. So the tail bends without stretching and keeps his plates and spikes.
    - The plates on top of the prowl's tail stay with the tail, not with the hook beside them (an inner-side
      reach limit), and the tall plates by the hip stay with the root.
  - Then the tail's base turns about the hip as before.
  - **Frames 1-2:** his prowl's curl opens (0.5, then 0.9) as the tail drops (-10, -15 degrees), so by frame 2 it
    is a spear pointing down and back, where frame 3's spear is.
  - **Frames 3-4:** the lunge's spear is still bent a little toward the curl (0.4, 0.18).
  - **Frames 6-7:** the spear curls back up (0.65, then 1.15) while its base lifts (+8, +31), so frame 7's hook
    lies on frame 0's (tip 3.9 px apart).
- **Bare outline (new).** In the in-betweens, a thread of outline with no stone next to it (a seam drawn out of a
  joint as a leg or the tail turned away) is dropped (up to 17 px per frame).
- **The body** is scaled about the eye, pitched about the shoulders and carried along the leap; **the head**
  grows or shrinks along his two heads' similarity (1.196, 2.2 degrees), so both sides of each switch show the
  same head (unchanged).
- **Small gaps.** Holes under 40 game px that the body surrounds take his under-body shadow (unchanged).
- **Dust.**
  - The dust lives on the ground, not on the body. It grows about a ground point behind the hind feet
    (frames 3-4).
  - **New: it breaks up as it settles (frames 6-7)** instead of fading as one stretched sheet:
    - his darkest soil goes first (the darkest 36%, then 68%);
    - the pile wears down from the top (to 78%, then 59% of its height);
    - his 10 cream boulder clusters (each with its shaded rim) spread apart from the burst point and fade one by
      one, the small ones first, each at its own alpha.
  - The flung streaks fade with the frame's alpha (0.75, 0.4).

| Frame | From | Scale | Head (power of 1.196) | Pitch (deg, + nose down) | Eye (game px from frame 0) | Legs nf, ff, nh, nhf, fh (deg) | Tail base (deg), curl | Dust (x scale, y scale, dx, alpha, settle) |
|---|---|---|---|---|---|---|---|---|
| 0 | his prowl | - | - | - | 0 | - | - | - |
| 1 | prowl | 0.995 | -0.25 | -4.5 | claws on the ground (-7.8) | +12.5, -3, +9.5, -, 0 | -10, 0.5 | - |
| 2 | prowl | 0.99 | -0.5 | -9 | claws on the ground (-15.7) | +25, -6, +19, -, 0 | -15, 0.9 | - |
| 3 | lunge | 1.13 | +0.5 | +1 | -17.4 | +22, +23, -18, 0, +17 | -15, 0.4 | 0.7, 0.7, +2, 1.0, - |
| 4 | lunge | 1.065 | +0.25 | +0.5 | -19.9 | +11, +11.5, -9, 0, +8.5 | -7, 0.18 | 0.88, 0.88, +1, 1.0, - |
| 5 | his lunge | - | - | - | -22.3 | - | - | his pile |
| 6 | lunge | 1.07 | +0.5 | +3.5 | -13.8 | -0.5, -14, **-12** (was -20), **+12**, +7.5 | +8, 0.65 | 1.04, 0.9, -5, 0.75, **0.4** |
| 7 | lunge | 1.14 | +1 | +7 | -1 | -1, -28, **-25** (was -40), **+25**, +15 | +31, 1.15 | 1.08, **0.7**, -10, 0.4, **0.75** |

A + leg angle swings a hanging foot back; a + tail angle lifts the tail.

**Silhouette change per step** (body and tail, without the dust; the share of the two frames' union that only
one of them covers): 20.1, 19.2, **27.1** (2->3), 16.8, 17.8, 29.2, 29.3, **28.2** (7->0). No step is over
29.3% (last pass 29.2%). The steps in frames 0-2 and 5-7 grew a little, because the tail now moves there
instead of swapping at the switches.

**No flashing.**
- The mean brightness of the opaque pixels per frame is 75.4, 75.4, 75.4, 82.6, 84.4, 87.1, 84.6 and 79.5.
- The mean alpha x luminance over the frame is 29.4, 28.9, 28.6, 30.8, 30.4, 30.8, 30.6 and 29.5. Closing the
  dust's bottom and left side took 1-4% off frames 3-7.
- No step between neighbours is over 9.5% on either measure: 2->3, where his bright dust bursts up. That step is
  7.9% on the second measure, down from 9.8%. The next largest step is 6.0% / 3.6% (6->7).
- The beast keeps its 8-frame loop, as the frames brief asks.

## Review 4 findings: what changed

| Finding | Status |
|---|---|
| Tail swaps shape and jumps 71 / 77 px at 2->3 and 7->0 (major) | **Fixed** within 8 frames. The tail bends along its own centre line toward his other tail. The prowl's curl opens into a spear in frames 1-2, and the spear curls back up into his hook in frames 6-7. The tail tip moves 2.0 px at 2->3 and 3.9 px at 7->0. The reviewer's plan, turning the existing "tip" child pieces, could not go past about 60 degrees: the warp's inverse stops converging there, and the tip vanished in tests. Turning about a fixed pivot also stretches a tail badly. So the tail bends along its line instead, and the unused "tip" pieces are gone. Onion skins with the tail tip marked are at the bottom of `beasts-drake.png`. |
| Spray: hollow streak, broken thin streaks, missing pebbles, fat elbow tip (minor) | **Fixed.** The streak between the hind paws is solid, (124, 116-117) included. Thin streaks keep a partly clear middle line, and 1 px breaks are closed. His pale pebble specks are back in his greys. The elbow streak now touches the forearm and tapers to its point. Frame 5 spray: 444 px (105 partly clear), mean (176.8, 131.8, 83.9), and 14 px darker than luminance 85, as before. |
| Far eye too bright, amber/moss rim, "+" shapes (minor) | **Fixed.** His own game-scale far eye, stamped whole: his lemon only where his glows (frame 0), his shaded olive-yellow (160, 160, 69) in frame 5, his olive rim, and no moss or amber round it. Clean 2 px upright ovals in all 8 frames. |
| Near eye missing his burnt-orange rim (minor) | **Fixed.** His socket brown (102, 70, 26) is now on the pixels next to the glow that his rim covers, in every frame. |
| Frame 7 hind leg a stretched pillar (minor) | **Fixed.** The leg turns -25 (was -40) and -12 in frame 6 (was -20). Its foot, a new child piece cut at the ankle, bends back +25 / +12. So the leg reaches forward with his bent shape, and the cracks no longer smear. |
| Transparent slits and pinholes (minor) | **Fixed.** The slit at (179-186, 92-94) and the pinholes by the clod in frames 3 and 5 are filled with their darkest neighbour. The frame now has no clear pixel with 3 or more drawn neighbours. |
| Size pulse over the leap (minor) | **Not changed; it needs the owner's decision** (see "Open question for the owner"). Holding one scale over frames 3-6 would bring back the 31-45% jumps at the switches. |
| Ghost-pile dust fade (minor) | **Fixed.** In frames 6-7 the pile breaks up: the dark soil goes first, the top wears down, and the boulders spread apart and fade one by one. |
| Size and integration unconfirmed (minor) | Written up above. Nothing in `src/` was touched. |

## Switching back to the serpent

On the owner's order, the serpent's code is deleted: there is no switch and no fallback. Its last version is in
git at commit `83fb8d9`, in `tools/world-sprites/vfx-beasts.ts`. It is the "STONE DRAGON (earth)" section, lines
638 to 827 (`STONE`, `facet`, `litN`, `earthSpine`, `stoneDragon`). A copy of that file is also at
`scratchpad/drake/orig/vfx-beasts.ts`.

To bring the serpent back:

1. Paste that section back into `vfx-beasts.ts`.
2. In `BUILDERS`, set `['earth', stoneDragon]`.
3. Drop the `REF_EARTH` import and `stoneDrake()`, or leave them unused.

The serpent sheet in the game now is still `src/assets/world/vfx_beasts/earth.png` (150x106, anchor [85, 40]).

## Rebuild

```
# frame data (deterministic; repeated runs are byte-identical). The debug folder, if given, must exist.
python3 -I tools/refs/beasts-from-ref.py drake docs/reference/earth-set-owner-reference.jpg docs/reference/earth-set-owner-reference.jpg tools/world-sprites/vfx-beasts-ref-earth.ts [debugDir]

# sheets (refuses to run without WORLD_OUT)
WORLD_OUT=<art2>/staging npx tsx tools/world-sprites/vfx-beasts.ts <art2>

# this review sheet and GIF (the json is the converter's sidecar from debugDir; it now carries the tail tips)
python3 -I <art2>/beasts-drake-review.py <art2>/staging/vfx_beasts <art2>/REF-earth-set-owner.jpg <art2>/beasts-ref-earth.json <art2>/beasts-character.png <art2>/beasts-drake.png <art2>/beasts-drake.gif
```

To put the drake in the game, copy `staging/vfx_beasts/earth.png` and only the `earth` entry of
`staging/vfx_beasts/manifest.json` into `src/assets/world/vfx_beasts/`. The in-game manifest holds a different
set of beasts.

## Checks

- **Other beasts unchanged.** Built before and after this pass: water, genjutsu, poison, fire, lightning, wind
  and chakra are md5-identical, and the manifest differs only in the `earth` entry.
- **Converter.** Re-running phoenix, raiju and crane reproduces `vfx-beasts-ref-fire.ts`, `-lightning.ts` and
  `-wind.ts` byte-for-byte. The shared `write_module` takes an optional alphabet; theirs is the default.
- **Determinism.** Three drake runs are identical (md5 40a464d1..., was afd75f4d... before the dust was closed),
  one of them from the `art2` copy of the reference. Two sheet builds are identical (`earth.png` md5
  bfa5273c..., was edf7e43e...; the manifest is unchanged). Nothing is random.
- **Dust fix.** In `staging/vfx_beasts` only `earth.png` changed. The manifest and the other seven beast PNGs are
  md5-identical to the build before the fix.
- **Border.** No pixel with any alpha touches the frame border in any frame of any `vfx_beasts` sprite. The drake
  keeps at least 3 px clear on every side in every frame.
- **Types.** `npx tsc --noEmit -p .` reports no errors.

## Known differences from his picture

1. **The left side and the bottom of his dust pile.** He drew a straight vertical side and a flat bottom there,
   where his picture's box cut the pile. Ours ends in rounded puffs that thin out, a column of them up the left
   side and a row along the bottom (the owner's "cierra ese polvo").
2. **Size against his label** and **the size change over the leap**: see "Open question for the owner".
3. **The tail's shape at the switches.** The tip and the line of the tail now meet at both switches, but frame
   2's tail is his prowl's slimmer tail straightened, and frame 3's is his spikier spear. So the tail thickens and
   gains spikes at 2->3, and the reverse at 7->0. The moss on the back and the hind legs (planted, then tucked)
   still change at the switches; these are his two drawings.
4. **Scaled drawings.** Frames 3, 4, 6 and 7 show his lunge scaled up 6-14% (and his prowl head is shrunk in
   frames 1-2), so their finest cracks are a touch softer than in his two key frames.
5. **The far eye's brightness at the switches.** His prowl's far eye is lit and his lunge's is shaded, so the far
   eye dims from lemon to olive at 2->3 and brightens at 7->0, as in his two drawings.
6. **Landing.** Frame 7's lowest claw is 19 px above the ground (it was 12). The bent hind foot sits higher,
   and frame 0 plants all four feet.
7. **The jaw** is not animated: opening it would need redrawn mouth pixels.
8. **Bent joints** stretch a few of his pixels where a leg turns most (the near front leg in frames 2 and 3).
   Where frame 7's tail lifts from the hip, a 2-3 px dark stub is left under it.

## Files

- **Changed:**
  - `tools/refs/beasts-from-ref.py`: drake mode, plus an optional alphabet argument (default unchanged) and
    UTF-8 output in the shared `write_module`. Phoenix, raiju and crane output is byte-identical.
  - `tools/world-sprites/vfx-beasts-ref-earth.ts`: the regenerated data.
  - `tools/world-sprites/vfx-beasts.ts`: the earth section's comment only.
  - `tools/refs/README.md`: the drake paragraph.
- **Deliverables:**
  - `beasts-drake.png`: now with onion skins of 1->2, 2->3, 6->7 and 7->0, with the tail tip marked.
  - `beasts-drake.gif`.
  - This file.
  - `beasts-drake-review.py` and `beasts-ref-earth.json` (now with the tail tips).
- **Refreshed by the build:** `staging/vfx_beasts/` and the beasts previews in `art2`.
- **Dust fix work:** `scratchpad/dustfix/`: the old sheet and data (`before/`, `*.orig.*`), the tools
  (`tools/decode.py`, `view.py`, `flat.py` (the flat-bottom check), `leftedge.py` (the straight-side
  check), `beforeafter.py`, `run.sh`, `run2.sh`) and
  `dbg-final/`.
- **Work and debug images:** `scratchpad/drake/r8/`.
  - Tools: the tuning harness `tools/run.sh` and `tools/run8.py`, the tail-tip grids `tools/tipgrid*.py`, the
    viewers `tools/view.py` and `tools/cmp.py`, `tools/metrics.py` and `tools/onion.py`.
  - `dbg-final/`: the segmentation, the cut-out pieces, his pictures beside ours and the onion skins.
