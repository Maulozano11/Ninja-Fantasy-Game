# Chakra griffin (chakra beast): notes

This is the owner's new chakra beast, copied from the BEAST panel of his chakra sheet
(`docs/reference/chakra-set-owner-reference.jpg`, the same file as `art2/REF-chakra-set-owner.jpg`, panel
x 117-242, y 40-136). He painted it over our old chakra fox: a winged griffin of blue chakra with an eagle
head and wings, a lion body, a gold beak, crest, trims and talons, chakra specks, cyan wisps trailing off the
wing tips, a light streak off the hind foot and a ribbon of chakra under the talons. He painted **one** pose
(wings raised). That pose is fly frame 0. The other 7 frames are derived from it.

It is staged as its own group, so nothing conflicts with `vfx_beasts`:
`staging/vfx_beasts_griffin/chakra.png` and its `manifest.json`.

## Sprite contract (`vfx_beasts_griffin/chakra`, which becomes `vfx_beasts/chakra`)

| | |
|---|---|
| Frame | **127 x 93** (the fox was 155 x 98; round 2 was 128 x 95) |
| Anchor | **[76, 59]**: the middle of his griffin's torso, between the haunch and the chest and between the back and the belly (his sheet: 191, 100). It is the same torso point as in rounds 1 and 2; only the crop moved (the union of the frames is 1 px narrower on the left and 2 px shorter at the bottom, because no wisp is carried down to the hind foot any more). |
| Animation | `fly`: **8 frames, 10 fps, loop** (one slow wing beat in 0.8 s; the fox was 6 frames at 12 fps). Faces right; the renderer mirrors it. |
| Sheet row | 8 x 127 = 1016 px wide (the limit is 8192) |
| Label / meters | `Chakra griffin`, [2.2, 1.6] (the frame at 57 px/m) |
| Tags | `vfx` |
| Colours | 109 RGBA entries: 63 opaque (55 griffin colours from his picture, the 4 outlines, the solid cores of his streak and specks) and 46 semi-transparent (the alpha steps of his streak, 6 colours x 7 steps, and specks, 3 colours x 6 steps). |
| Outline | 1 px **on** his edge: deep blue `#0d2a4d` (13, 42, 77), his own rim colour; **indigo `#122558` (18, 37, 88)**, his own indigo rim colour, where the griffin just inside is his indigo (under the belly, the far legs; new in round 4); mid blue `#1a5772` (26, 87, 114), an entry of his palette, where the griffin is bright just inside the edge (his glowing feather tips and head); dark gold `#463a27` (70, 58, 39) round the gold beak, crest and talons. Never black. His crest's spikes and his throat keep their own colours. |

- **Scale:** 96 / 97.5 = **0.9846**, with an area (box) filter. His character is 98 px tall on his WALL
  panel and 97 px on his WALL_VERT panel (both are plain panels); ours is 96 px.
- **Border check:** every frame passes (in the build and in an independent check of the staged PNG). No
  pixel touches a frame edge.
- **Determinism:** two builds are byte-identical. That covers the data module and the staged PNG and
  manifest.
- **Typecheck:** `npx tsc --noEmit -p .` is clean (round 4; the project config covers `tools/`).

## How frame 0 is made (`tools/refs/griffin-from-ref.py`)

1. **Cut out his panel.** The panel colour is (32, 31, 39). The griffin is the largest shape that differs
   from the panel. Its enclosed dark seams are filled in, and so is his open mouth: its dark red throat opens
   onto the panel, so it is added from the red pixels inside his beak.
2. **Split off the light streak and specks.**
   - His light streak (bottom left) is grey and cream; the hind leg standing on it is blue, so the two
     can be told apart.
   - His specks are small cream or cyan blobs on the panel. This includes the cyan wisps trailing off the
     wing tips.
   - Both are un-mixed from the dark panel into his glow colour plus an alpha. The darker-than-panel JPEG
     ringing around them is dropped.
3. **Area-average to the game scale.** Everything is box-filtered onto our anchor. The silhouette is **his**:
   a game pixel is griffin when half or more of it is his griffin. (His soft dark rim only tints the edge
   pixels; it no longer grows the silhouette by a pixel.)
4. **Snap to his palette**, clustered from his own colours at the game scale, each group on its own:
   - blues (34)
   - his indigo under the belly and the far legs (6), plus his most violet pixels (hue past 228) (2)
   - golds and creams (8)
   - the pale green of his glyphs (3)
   - his mouth (3): the medians of his own mouth pixels, split by brightness: throat (44, 20, 17),
     shadowed tongue (95, 66, 67), lit tongue (132, 102, 94). These may only be used inside his beak, so no
     navy wing or leg pixel can snap to a dark red or brown.

   Matching is done in an opponent colour space with the chroma weighted up, so his vivid cyans and
   indigos do not turn grey. No palette entry is near-black (luma under 18).
5. **Outline his edge.** The 1 px edge of the silhouette gets the outline colour, as in the table above. The
   indigo rim is the darkest quarter of his own indigo pixels on the griffin's edge (median), used where the
   edge pixel's own colour, or most of its neighbours off the edge, are in the indigo group.
6. **Streak and specks.**
   - The streak keeps 7 alpha levels (255 down to 50) in 6 of his colours, from slate blue to cream; its
     breaks along his rays are closed, so it stays one soft fan.
   - The specks keep 6 alpha levels (255 down to 85) in 3 colours.

## How the in-betweens are made

All of these move his own pixels at the game scale. Nothing is redrawn.

- **Pieces.** His picture is split into five pieces:
  - the **near wing**, in front of the body;
  - the **far wing**, behind the body: everything above his near wing's gold trim and left of the head.
    Its part hidden under the near wing is continued 4 px (frame 0 does not show it);
  - the **tail**;
  - the **ribbon** under the talons;
  - the **body**: the head, neck, chest, legs and haunch, which stay his pixels. His pixels at the wing
    roots stay on the body as an underlay, so no slit opens behind the neck.

  Both wings are cut from the body along his back line.
- **Near wing** (cosine timing, so it slows at the top and the bottom of the beat): it turns about the
  shoulder (sheet 191, 84) and swings down 62 degrees at the bottom of the beat. Its tips lag by up to 16
  degrees (they flex up on the way down and down on the way up). The lag grows from 25 px out from the
  shoulder to full 40 px further, so the arm and the gold trim near the root pass the same places on the way
  down and on the way up; only the feathers flex.
- **Far wing.** It pivots high behind the neck (sheet 206, 70), at the top of its own rounded,
  gold-trimmed base, and it eases in over 14 px from there, so the base stays his rounded base in every
  frame and only the wing beyond it swings. It follows the near wing a little less far, one angle per
  frame: **0, -6, -18, -36, -46, -36, -18, -6** degrees (at most 18 degrees a frame), with no lag (frame
  7 = frame 1, 6 = 2, 5 = 3). So it is always there, peeking above the near wing's trim with its pointed
  tip and its own gold trim, the way he painted it, and it never pops in or out. In frames 2 and 6
  (-18 degrees) its leading edge still rises 6 degrees to its tip (24 degrees in his picture), so it never
  reads as a flat slab.
- **The trim's shadow.** In his picture the far wing's px along the near wing's trim are the trim's dark
  shadow, a broken run of dark and mid px. In the beat frames (not frame 0) they are one even band of their
  own commonest colour, and the hidden part continued below them is that colour too. Where the far wing peeks
  out further above the trim, that reads as a soft shadow under the trim instead of a dark comb.
- Each swing eases in from the root (a smoothstep), so the wing bends there instead of shearing off the
  body. At the bottom of the beat the wings are drawn up to 14% (near) and 10% (far) shorter along their
  length, because there they come toward us.
- Swung pieces are sampled through a Scale2x x3 (8x) copy, RotSprite style. His feather lines stay crisp
  and stay in his colours.
- **The near wing's edge over the body.** Where the swung near wing lies over the haunch, the belly, the tail
  or the far wing, it gets its own 1 px edge: one unbroken line in his mid blue `#1a5772` (26, 87, 114),
  his feathers' darker vane colour (dark gold on its gold trim), so it reads as the wing's edge and not as a
  dark crack. Not at its root, and not in frame 0.
- Slivers of 1-5 px that a swing cuts off are dropped.
- **Body bob:** the body rises **0, 1, 1, 1, 2, 1, 1, 1** px (frame 0 is his, lowest; frame 4, the bottom of
  the beat, is highest). The 1 px steps fall on the frames where the wings move least (7-0, 0-1, 3-4, 4-5),
  so the silhouette never jumps twice at once.
- **Tail:** it sways in a wave that runs from the root to the tuft (up to 2.2 px).
- **Ribbon:** it ripples from its right end (up to 1.6 px).
- **Light streak:** it flows along its length (a travelling ripple, up to 1.4 px). It rides with the body.
- **Wing-tip wisps.** His cyan wisps and the specks touching a wing's tip feathers (7 on the near wing, 2
  on the far wing) belong to that wing. Each one's anchor (its px nearest the wing, where it leaves the tip)
  is carried through the wing's main swing (without the tips' lag, so it passes the same places down and
  up), and the whole wisp moves with it in whole px, **never turned**: it stays his horizontal trail leaving
  the tip toward the back, never a slanted needle.
  - The near wing's wisps fade out while its tips are down: **1, 0.7, 0.3, 0, 0, 0, 0.3, 0.7** of their
    light (at most 112 of 255 alpha a frame). So they are gone in frames 3-5, when the tips are by the hind
    leg, and they are never drawn over the light streak.
  - The far wing's two specks fade with how much of the far wing shows (down to 0.55 at frame 4), so none
    floats with no wing under it.
- **Other specks** (16 free sparkles): each streams back (left). It is two copies half a loop apart. Each
  copy drifts 9 px over its life while it fades in and out again (a tent: a quarter of its light per frame).
  The two together always hold the same light, so no speck blinks. At frame 0 (and frame 4), every speck is
  exactly where he painted it, at full strength.
- **Frame 0 is his picture pixel for pixel**, because every move is zero at phase 0 (round 4 changed only the
  rim colour on his indigo underside; nothing else in frame 0 moved).

| Frame | Near wing (deg) | Far wing (deg) | Bob (px) | Light: mean alpha x luma | Step to the next | Mean luma of covered px | Far wing px showing | Silhouette step | Light outside the griffin |
|---|---|---|---|---|---|---|---|---|---|
| 0 (his) | 0 | 0 | 0 | 0.275 | 0.97 | 0.533 | 582 | 0.172 | 0.0314 |
| 1 | -9 | -6 | -1 | 0.267 | 0.92 | 0.529 | 578 | 0.214 | 0.0292 |
| 2 | -31 | -18 | -1 | 0.246 | 0.89 | 0.527 | 557 | 0.232 | 0.0245 |
| 3 | -53 | -36 | -1 | 0.219 | 0.96 | 0.526 | 416 | 0.177 | 0.0236 |
| 4 | -62 | -46 | -2 | 0.210 | 1.04 | 0.527 | 318 | 0.150 | 0.0217 |
| 5 | -53 | -36 | -1 | 0.218 | 1.08 | 0.524 | 416 | 0.219 | 0.0200 |
| 6 | -31 | -18 | -1 | 0.236 | 1.12 | 0.525 | 557 | 0.239 | 0.0226 |
| 7 | -9 | -6 | -1 | 0.265 | 1.04 (wrap) | 0.528 | 579 | 0.187 (wrap) | 0.0278 |

- **Light** is the mean of alpha x luma over the 127 x 93 frame. It dips at the bottom of the beat only
  because the lowered wings overlap the body, so less of the frame is covered. The largest step between
  neighbours is 11% of the peak (frame 6 to 7).
- The brightness of what is drawn stays flat: the mean luma is 0.524-0.533.
- **Light outside the griffin** (his streak, wisps and specks on the panel) steps 0.93, 0.84, 0.97, 0.92,
  0.92, 1.13, 1.23, 1.13 (the limit is x1.3).
- **Far wing px showing** changes by at most 25% a frame (557 to 416). Round 2 went 1456 to 407 above y=30.
- **Silhouette step** (the part of the opaque px that differs from the next frame) is at most 0.239. Round
  2 had 0.31 and 0.35.

### Build checks (`griffin-from-ref.py` fails the build on any)

- The light changes by at most 18-22% between neighbours (x0.82-1.22, the wrap included), the mean luma by at
  most 6%, and the light outside the griffin by at most 30%.
- No speck copy changes by more than half its light (128 of 255 alpha) in a frame. The largest step is 112.
- No see-through tear opens over the back, the wing roots or the neck.
- No straight horizontal or vertical silhouette edge on a wing is longer than 10 px (or his own longest, 8).
  The longest in any frame is 9.
- **New in round 3:** the silhouette changes by at most **25%** between neighbours (it was 35%).
- **New in round 3:** the far wing turns at most 25 degrees a frame (the most is 18), and how much of it
  shows changes by at most 40% of the larger from a frame to the next (the most is 25%).
- No pixel on the frame border.

## Rebuild

```sh
# 1. His sheet -> data module (debug dir optional: the review inputs)
cd tools/refs && python3 -I griffin-from-ref.py \
  /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/REF-chakra-set-owner.jpg \
  ../world-sprites/vfx-beasts-ref-chakra.ts \
  /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/griffin-ref

# 2. Data module -> staged sheet (refuses to run without WORLD_OUT)
cd /home/user/Ninja-Fantasy-Game && WORLD_OUT=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging \
  npx tsx tools/world-sprites/vfx-beast-griffin.ts

# 3. Review sheet + GIF
python3 -I /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/beasts-griffin.py
```

`docs/reference/chakra-set-owner-reference.jpg` is byte-identical to `REF-chakra-set-owner.jpg`, so
either one works as the input.

## How to merge it into `vfx-beasts.ts` (after approval)

1. Add the import: `import { chakraGriffin } from './vfx-beast-griffin';`.
   - `vfx-beast-griffin.ts` only runs its `main()` when it is the script being run, so importing it has
     no side effects.
   - It brings `vfx-beasts-ref-chakra.ts` with it. That module has its own alphabet (ASCII plus Latin-1
     letters, for its 109 colours) and is decoded by `vfx-beast-griffin.ts` itself, so no other decoder
     needs to change.
2. In `BUILDERS`, replace `['chakra', chakraFox]` with `['chakra', chakraGriffin]`.
   - `chakraGriffin()` returns the finished `WorldSprite`: name `chakra`, label, meters, anchor, tags,
     and `fly` at 10 fps.
   - It is cropped to the union of its frames + 1 px, like `beastSprite`.
3. Optionally delete the fox code: `chakraFox`, `CHAKRA`, `Gait` and `GALLOP`, if nothing else uses them.
   Also update the header comment ("chakra fox" -> "chakra griffin").
4. Rebuild `vfx_beasts` with `WORLD_OUT`. Copy the approved sheet into the game as usual.

The sprite name, the `fly` animation and the anchor-at-body-centre convention are unchanged. The renderer
needs no change.

## Round 2 (fix pass): what changed for each review finding

- **f7 far wing as a flat slab (major).** The far wing has no lag now (it was 14 degrees), so frame 7
  is the same as frame 1. It also starts down a moment after the near wing, so frames 1 and 7 keep his pointed
  tip and a 21-degree leading edge. To keep the near wing from opening a slit along its trim, the far wing's
  hidden part is continued 3 px under it. A build check now rejects any straight wing edge over 10 px.
- **Wing-tip wisps left in the sky (major).** His cyan wisps (and the specks touching a wing's tip
  feathers) ride with their wing. The other specks are two cross-fading copies that stream back. Each speck
  copy changes by at most a quarter of its light per frame, and the light outside the griffin stays smooth.
  Both are build checks.
- **Navy pixels snapping to mouth brown-black (minor).** The mouth's colours are restricted to the beak,
  and no palette entry is near-black. No dark brown or red pixel is left outside the beak in any frame. (The
  swung pieces only move his pixels, so they cannot bring in new colours.)
- **Mouth too brown (minor).** The three mouth colours are the medians of his own mouth pixels:
  - throat (44, 20, 17);
  - tongue (95, 66, 67) and (132, 102, 94).

  His throat, which opens onto the panel, is now filled in.
- **Outline 1 px outside his edge (minor).** The silhouette is his own now, and the outline sits on his edge
  pixels. Our opaque pixels outside his silhouette went from 436 to 130, and the IoU against his panel rose
  from 0.915 to 0.945. Where the griffin glows just inside the edge (his feather tips and head), the rim is
  his mid blue (26, 87, 114) instead of the deep blue.
- **Comb-like streak (minor).** The streak now has 7 alpha levels in 6 colours, and the gaps along his rays
  are closed, so it reads as one soft fan.
- **Underside too blue (minor), partly fixed.** His most violet pixels get two palette entries of their own:
  (31, 44, 110) and (54, 69, 143).
  - On the snapped colours alone, the mean hue of his underside is 224 degrees and ours is 222.
  - With the outline included, his is 221 and ours is 218 (it was 217). The deep blue rim on the belly's
    edge keeps it a little bluer than his.

## Round 3 (fix pass): what changed for each review finding

- **The far wing popped instead of beating (major).** It used to swing 96 degrees, jumping 43 degrees
  between frames 1 and 2 and vanishing under the near wing in frames 2-6.
  - Now it follows the near wing a little less far, one angle per frame: 0, -6, -18, -36, -46 and back,
    at most 18 degrees a frame.
  - Its pivot moved up to the top of its rounded base behind the neck (sheet 206, 70; it was 205, 80), with
    a 14 px ease, so the base stays put.
  - It is visible in every frame, peeking above the near wing's trim with its pointed tip and gold trim:
    582, 578, 557, 416, 318, 416, 557, 579 px showing (at most 25% change a frame; round 2 lost 72% in one
    frame).
  - The silhouette step is now at most 0.239 (round 2: 0.31 and 0.35). For that, the body bob was re-timed
    (0, 1, 1, 1, 2, 1, 1, 1 px up) so its 1 px steps fall where the wings move least, and the near wing's
    tip lag now starts 25 px out from the shoulder (so the trim near the root passes the same places down
    and up).
  - New build checks: the far wing turns at most 25 degrees a frame and its visible px change by at most
    40%; the silhouette step limit went from 35% to 25%.
  - Frame 0 is still his pixels (byte-identical to round 2's frame 0).
- **Dark fin behind the neck in frames 2-6 (minor).** That was his far wing's root (on the body underlay),
  left standing when the wing turned away. With the pivot at the top of the rounded base, the base barely
  turns, so in every frame it is his rounded, gold-trimmed wing base, built from his pixels. No pointed slice
  stands above the neck. The floating cream speck is gone too: the far wing is under it now, and the far
  wing's two specks fade with how much of the far wing shows.
- **Wisps turned into needles (minor).** The wisps are now carried with their wing tip in whole px and never
  turned, so they stay his horizontal trails. They fade out over frames 1-3 (1, 0.7, 0.3, 0) and back in
  over frames 6-7 (0.3, 0.7), so they are gone while the tips are by the hind leg. They are never drawn over
  the light streak. The light outside the griffin stays within x1.23 a frame.
- **Near wing's edge over the body read as a crack (minor).** That edge is now one unbroken 1 px line in his
  mid blue (26, 87, 114), dark gold on the trim, where the near wing lies over the haunch, the belly, the tail
  or the far wing. It was dashes of the deep outline blue, broken wherever the wing passed over its own
  frame-0 place. No deep blue is left on it in any frame.
- **Also fixed while there:** with the far wing now showing above the trim, the trim's dark shadow on the
  far wing would have shown as a dark comb (frames 2 and 6). In the beat frames it is now one even shadow
  band in its own commonest colour. Frame 0 keeps his pixels.

## Round 4 (fix pass on the first review): each finding, checked again on this build

The first review (128 x 95, 77 colours) was answered in rounds 2 and 3. This pass re-measured every one of
its findings on the current sheet with an independent script (`art2/griffin-r4/verify.py`, reading only the
staged PNG, the manifest and his picture at the game scale) and fixed what was still open.

- **f7 far wing as a flat slab (major): fixed (round 2-3), confirmed.** The far wing has no lag, so frame 7
  is frame 1 (far wing at -6 degrees, his pointed tip and sloped leading edge). The longest flat run on the
  top silhouette left of the head is 6-9 px in frames 0-4 and 6-7, and 11 px only in frame 5 on the tail's
  top (his tail is a horizontal stroke; not a wing). The build check rejects a straight wing edge over 10 px
  (the most is 9).
- **Wing-tip wisps left in the sky (major): fixed (round 2-3), confirmed.** His cyan wisps belong to the
  wing they trail from and are carried with its tip, never left at his frame-0 spot. They fade 1, 0.7, 0.3,
  0, 0, 0, 0.3, 0.7 (at most 112 of 255 alpha a frame), so nothing pops back in f5. The free light in the
  review's sky box (x 3-28, y 17-42 on its grid) is now 49.8, 19.6, 3.0, 2.1, 2.7, 2.1, 3.0, 17.7: a fade out
  and back in, no pop. The light outside the griffin steps at most x1.23 (it was x2.19 and x2.45).
- **Navy px snapping to the mouth's brown-black (minor): fixed (round 2), confirmed.** Mouth colours are
  only allowed inside his beak and no palette entry is near-black (luma under 25: none). Dark red, brown or
  black px outside the beak, over all 8 frames: **0**.
- **Mouth too brown (minor): fixed (round 2), confirmed.** The three mouth colours are the medians of his own
  mouth pixels: throat (44, 20, 17), tongue (95, 66, 67) and (132, 102, 94). His mouth at the game scale,
  pixel by pixel, has throat px of (30-53, 4-30, 0-26) and tongue px of (116-150, 83-125, 76-120), so these
  are his values; the review's (140, 100, 96) and (55, 24, 22) are within a few levels of them.
- **Outline outside his edge (minor): fixed (round 2), confirmed.** Our opaque px outside his silhouette in
  frame 0: **54** (it was 444). Mean RGB on the shared px: ours (96, 148, 177), his (93, 145, 173).
- **Comb-like streak (minor): fixed (round 2), confirmed.** The streak has 7 alpha levels (50, 78, 108, 142,
  178, 215, 255) in 6 of his colours, its ray breaks closed. A new panel on the review sheet shows it next
  to his.
- **Underside too blue (minor): improved this round.** Most of what was still too blue was the rim: 91 of
  the 202 px where his underside is indigo were the deep blue outline (13, 42, 77, hue 212). The rim there
  is now his own indigo rim colour (18, 37, 88), taken the same way as the deep blue (the darkest quarter of
  his indigo edge px). Mean hue over those 202 px: **222** (it was 218; his is 226), mean RGB ours (23, 45,
  98) against his (30, 47, 102). The rest of the gap is the box filter's mix at the game scale; three
  violet entries instead of two were tried and gained under 1 degree, so the palette was left as it is.
  A new panel on the review sheet shows the belly next to his.

Light per frame (mean alpha x luma over the 127 x 93 frame), unchanged by the rim: 0.275, 0.267, 0.246,
0.219, 0.210, 0.218, 0.236, 0.266; steps 0.97, 0.92, 0.89, 0.96, 1.04, 1.08, 1.12, 1.04 (largest 11% of the
peak); mean luma of the covered px 0.524-0.533. Timing: `fly` 8 frames at 10 fps, loop (GIF: 8 x 100 ms).

## Known differences from his picture

- **Edges.** His edges are soft and glowing in places. Ours has a crisp 1 px rim on his edge: deep blue,
  mid blue where he glows, and dark gold on the gold. That keeps the griffin readable on the grass like the
  other beasts.
- **Colour.** His soft JPEG gradients become stepped pixel-art ramps. His underside is still a few degrees
  more violet than ours (226 against 222).
- **His one pose is all he painted.** The wing beat is our proposal, built from his pixels:
  - At the bottom of the beat (frames 3-5), the near wing covers the haunch and the far wing slopes down
    behind it, still peeking above its trim. The light dips there; see the table.
  - The wing-tip wisps fade out while the tips are down (frames 3-5) and come back as they rise.
  - Under the near wing's trim, the far wing shows an even shadow band in the beat frames instead of his
    broken dark seam (frame 0 keeps his).
  - The head, chest, legs and talons never move. They are his pixels. Only the body bob moves them.
- **Removed as JPEG artefacts:** the dark ringing around his specks and in his crest's gaps, and the panel's
  label and border lines.

## Files

- `tools/refs/griffin-from-ref.py`: the converter, from his JPEG to palette and run-length frames, with the
  build checks.
- `tools/world-sprites/vfx-beasts-ref-chakra.ts`: generated data. Do not edit by hand.
- `tools/world-sprites/vfx-beast-griffin.ts`: the generator, which exports `chakraGriffin()` and
  `GRIFFIN_FPS`.
- `art2/beasts-griffin.png`: the review sheet. It shows:
  - his picture at the game scale on our anchor next to our frame 0 (x3);
  - all 8 fly frames, with both wing angles, the bob and the light;
  - the griffin next to our character and the old fox at flight height;
  - the round-3 views: the far wing in all 8 frames (with how much of it shows), the neck and far-wing root
    in frames 0, 2, 3, 4 and 6, the wing-tip wisps in all frames, the near wing over the body in frames 2,
    3, 5 and 6, and the head next to his;
  - the round-4 views: the underside (belly and far legs) and the light streak, each next to his.
- `art2/beasts-griffin.gif`: the loop at 10 fps, x3 (8 frames, 100 ms each).
- `art2/beasts-griffin.py`: the script that writes the review sheet and the GIF.
- `art2/griffin-ref/`: the converter's debug output:
  - `griffin-seg.png`: the pieces;
  - `griffin-his-game.png`: his picture at the game scale;
  - `griffin-fly.png`: the strip;
  - `griffin-frames.npz`: the frames before the crop (with the piece on top and the near wing's
    over-body edge per frame);
  - `griffin-ref.json`: the numbers (now with `far_deg`, `far_visible`, `wisp_fade` and `outline_indigo`).
- `art2/griffin-r4/verify.py`: the independent check of the first review's findings (reads only the staged
  sheet, the manifest and his picture at the game scale): `python3 -I griffin-r4/verify.py <art2 dir>`.
