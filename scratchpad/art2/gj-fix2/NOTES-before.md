# Genjutsu jutsu VFX, v3: copied from the owner's paint-over

The owner asked for his examples to be copied as exactly as possible. Every sprite's key frame here is his own picture (`REF-genjutsu-set-owner.jpg`, also `docs/reference/genjutsu-set-owner-reference.jpg`), cut out at game scale and cleaned up into pixel art. The other animation frames are derived from that key frame, so the peak frame is his picture.

- **Group:** `vfx_genjutsu_v3` in `staging/vfx_genjutsu_v3/`: one PNG per sprite plus `manifest.json`, tag `vfx`.
  - Sprite names, anim names, frame counts, fps and loop flags are the same as in `vfx_genjutsu` (checked).
  - Anchors mean the same things as before.
  - **One new sprite:** `aura_back`, the aura's back layer, as the fire artist did (see "Renderer").
- **`beast` (the crow swarm) is out of scope.** Its PNG and manifest entry are copied through byte for byte from `staging/vfx_genjutsu/` (checked). Another artist owns it.
- **Merging:** copy the 15 PNGs and the manifest entries into `vfx_genjutsu`. Frame sizes and anchor numbers changed (see the table), so the manifest entries must come along with the PNGs. The renderer must also learn `aura_back`.
- **Eyes:** the bolt, the sphere and the breath carry HIS plain eyes (white sclera, dark lid and pupil), copied from his pixels. There is no tomoe or pinwheel anywhere.

## Fix pass r1 (art-director review): what changed

| finding | fix |
|---|---|
| aura anchor 6 px right, 7 px low (major) | Anchor now set by registration: our `characterRef` correlated (luminance NCC) over +-14 his px and scales 1.29-1.33 on his figure in the aura panel; best at scale 1.30, his (519.5, 635.5). The aura is now cut at 1/1.30. Anchor (47,116) in a 91x134 frame. Re-checked on the output: best offset (0, 0), r = 0.705. The veil is re-centred on it. |
| blast frames 4-7 torn / grey static (major) | The pool turns 8 degrees a frame inside its own outline: a true rotation in the ellipse's space about the pool's own centre, sampled only from the pool's pixels and written only where it has pixels (4 sub-samples per pixel, majority vote). Frames 6-7 step every colour down its own hue ramp and take the column out from the top down along ragged streak ends in ordered alpha steps; the column stays opaque (no grey from white over the pool), no dissolve, no holes. |
| wall_diag rise floats and smears (major) | Each column is translated (no shear, no scale) and clipped at its own ground y on his slanted foot line (near-left foot (-95,+45), far end (+95,-55) from the anchor, plus 6 px of base). It rises by the height of the tallest column within 8 px, so a pillar moves as one; the wave runs from the near end to the far end. Brambles, shards and the splash in front of the foot line fade in after. The shadow grows from the foot along its own run (down-right) and shows nothing behind the foot line until the wall stands. |
| eyes lost (major) | New `eye` kind in the extractor: hand-set ellipses per eye (sphere 1, bolt 1, breath 6). Left out of the hue smoothing and the speck filter, quantized with lightness weighted 2x over hue onto the body palette plus two fixed sclera whites (#f0e4f8, #fcf4ff) and the deep-violet lid (#28103a). The bolt's eye is downscaled lightness-aware (a pixel a third or more his dark takes his darkest: pupil and lid; one half or more his light takes his lightest: sclera). The old speck filter (which replaced any pixel unlike its 4 neighbours) was what erased the pupils; see below. |
| wall cracks gone (major) | New `lines` step in the extractor: his thin lines are found at his own resolution (ridge test 2 px each side across 4 directions, thinned to the crest), both bright (crack cores, highlight lines, sparkle arms) and dark (a crack's dark edges, the face seams), mapped to game pixels by their crest and written AFTER quantization (1 px, his colour by lightness), so neither the box filter nor the hue smoothing can soften them. Used on all three walls. |
| speck filter | Now only replaces a pixel that is a small JPEG speck in a flat plane (its 4 neighbours alike within 12 Lab, and it within 16 Lab of them). His 1 px details stay. |
| blast sparkles / column (minor) | Sparkles go through `lines` (bright, may add over clear): crisp white stars with 1 px arms. The column's polygon weights streak pixels up (body 2.2, glow 0.45), so it keeps distinct streaks. Its top ends streak by streak at its own height with a 3 px stepped end (no shared soft band). |
| stream_head (minor) | The spiral turns inside its own disc (r 15.5, 4 sub-samples, majority vote), sampled only from the disc. The ribbons slide in from the tile up to the disc and his dark rim colour covers the cut. His white wisp stays in every frame (drifts 1 px). Frame 0's first 2 columns are the tile's. |
| breath (minor) | His arcs touch through their rims, so each arc is now found by its lit body and every other pixel (rim, outline, dashes) goes with the arc within 3 px. The ripple has an equal phase step: changed pixels per frame step 1809-2586 (was 700-3400). |
| bolt (minor) | Tone steps follow each colour's own hue ramp (all sprites): the rim lightens to (116,48,141), saturation 0.68 (was a grey-lilac). Smoke: a third of its pixels open up and it renders at 0.75: fine speckle. |
| 3/4 wall shadow rim (minor) | Dark dull pixels in his shadow polygon (lum < 95) are part of the stain (translucent), not an opaque rim. Ground palette 8 -> 12 entries; the shadow's end is an ordered (Bayer 4x4) alpha ramp of 8 levels. |
| aura fill and veil (minor) | aura_back: what his figure hid is filled fully, from his flame colours only (normalised diffusion), no 5 px band, no disc blobs; no map shows between the flames and any figure. Veil fitted to a 96 px body on the anchor: ellipse centre (-4,-46), radii 22 x 49, full to r 0.78, gone by r 1.0. |
| hit scale (minor) | k = 0.744 (his hit panel is the bolt's 87 px box): 66x67, anchor (34,33). |
| multi (minor) | No outline restored on the darts (his heads glow, no dark edge). |
| slash streaks, 3/4 splash drips, multi magenta (minor) | Not changed: tried the dark-line step on the slash (his strokes are 2-4 px wide, too wide for it: no visible change, reverted). Mean multi body colour already matches his (L 38.8 vs 39.7, C 38.9 vs 39.4). |

## Files

| file | what it is |
|---|---|
| `tools/refs/genjutsu-from-ref.py` | Cuts his panels out at game scale and writes the indexed key frames. Only needs re-running to change the cut. |
| `tools/world-sprites/vfx-genjutsu-v3-refdata.ts` | GENERATED by the extract script: one palette (230 entries) and each key frame as run-length pieces. |
| `tools/world-sprites/vfx-genjutsu-v3.ts` | The generator: decodes the key frames, derives every animation and writes the group. |
| `art2/vfx-genjutsu-v3-refmap.json` | Where each key frame sits in his image (origin, scale, size, anchor). The review uses it for the compare crops. |
| `art2/vfx-genjutsu-v3-review.py` | Builds the compare, the animation strips and the GIFs, and runs the border check. |
| `art2/vfx-genjutsu-v3-character.ts` | Writes `vfx-genjutsu-v3-character.png` (our `characterRef()`, 128x128, feet at 64,120) for the review. |
| `art2/vfx-genjutsu-v3.png` | Key frames at 2x in the kit-sheet layout, labelled, with our character for scale. |
| `art2/vfx-genjutsu-v3-compare.png` | For every sprite: his crop rescaled to game scale, our key frame on his background, our key frame on a grass-toned map, all at 3x. The aura row shows aura_back + our character + aura. |
| `art2/vfx-genjutsu-v3-anims.png` | Every animation as frame strips at 2x (yellow dot = anchor). |
| `art2/vfx-genjutsu-v3-blast.gif`, `art2/vfx-genjutsu-v3-walls.gif` | The blast beside our character, and the three walls (`rise`, then `idle`), at 2x. |
| `art2/vfx-genjutsu-v3-border.txt` | Border-check output. |

## Rebuild (exact commands)

From the repo root, with `ART2=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2`:

```bash
# 1. only when changing the cut (about 25 s):
python3 -I tools/refs/genjutsu-from-ref.py $ART2/REF-genjutsu-set-owner.jpg \
    tools/world-sprites/vfx-genjutsu-v3-refdata.ts $ART2/vfx-genjutsu-v3-refmap.json [previewDir]
# 2. the sprites (about 10 s); needs $ART2/staging/vfx_genjutsu/ for the beast:
WORLD_OUT=$ART2/staging npx tsx tools/world-sprites/vfx-genjutsu-v3.ts
# 3. the review images:
npx tsx tools/refs/kit-sheet.ts $ART2/staging/vfx_genjutsu_v3 genjutsu $ART2/vfx-genjutsu-v3.png
npx tsx $ART2/vfx-genjutsu-v3-character.ts $ART2/vfx-genjutsu-v3-character.png   # once
python3 -I $ART2/vfx-genjutsu-v3-review.py $ART2 $ART2/REF-genjutsu-set-owner.jpg
```

Safeguards:
- The generator refuses to run without `WORLD_OUT`, so it never writes into `src/assets`.
- It writes the group into a temp folder and renames the files in, PNGs first and the manifest last. The extract script writes its outputs to `.part` files and renames them.
- Both are deterministic (no `Math.random`): two extract runs give byte-identical refdata (md5 48a42433...) and refmap (ce8705cb...); two generator builds give byte-identical PNGs and manifest (16 files, checked).
- The generator throws if any frame has art on its border.
- `npx tsc --noEmit -p .` prints no errors.
- No other artist's file was touched (`kit.ts`, `vfx-a*`, `vfx-b*`, `vfx-sig-*`, `vfx-beasts*`, `beasts-from-ref.py`, the other v3 sets).
- `GJ_ONLY=a,b` limits the extractor to some sprites, for experiments only (the palette then comes from those).

## How the key frames were made

1. **Scale, measured on his character.** His sheet is our 2x kit sheet re-arranged into a square at about 0.65, so about 1.3 of his pixels make one game pixel. Each panel uses its own factor, from fitting our 96 px `characterRef` onto his character beside it:
   - blast, straight wall and aura 1.30, 3/4 wall 1.27, end-on wall 1.25 (his px per game px);
   - the projectile panels have no character: their inside (86-87 px, the hit's too) is our 64 px frame;
   - the stream: his braid repeats every 84 of his px, so one period is the 64 px tile. His head starts exactly two periods after the tile window, so the head runs on from the tile's end.
2. **Clean-up.** Removed: his panel fill (#20202a), his characters, the labels and the panel borders. The JPEG is smoothed before every decision, so its ringing and blocks are not copied.
3. **Classes** (per pixel of his image):
   - **body:** his painted shapes (violets, magentas, pinks, lavender crystal, whites), opaque;
   - **dark:** darker than his fill. Next to a body it is his dark rim (opaque). Away from bodies it is smoke, kept semi-transparent (alpha floor 0.85), except where his art is truly black (crow feathers, thorns, vines), which stays opaque;
   - **glow:** faint colour over his fill (halos, the column's veils, the aura's flame edges), colour-to-alpha'd off his fill so it composites back to his look;
   - **ground:** the 3/4 wall's long violet shadow, its darker edges and the thin strip of it above, colour-to-alpha'd with an alpha floor of 0.6, so it reads as a stain on any map;
   - **weed:** the olive brambles of the 3/4 wall (their own 5 colours);
   - **eye:** his eyes (see the fix table).
4. **To game scale.** Every class is box-filtered to game scale; each game pixel takes its strongest class and that class's mean colour (the blast's column weights its streaks up).
5. **Colour.** Within a body, each pixel's hue (Lab a, b; not its lightness) is averaged with its near-alike neighbours, so the JPEG's colour speckle goes and his flat planes keep one hue. Eyes are left out.
6. **Palette.** One palette for the set, from his own pixels of each class (k-means in Lab): 1 outline, 182 body (150 violets/lavenders/whites + 30 hot pinks/magentas + 2 fixed sclera whites), 5 weed, 6 dark, 4 smoke, 20 glow, 12 ground. Each pixel takes the nearest entry of its class, with hue weighted 1.6x over lightness (eyes and lines: lightness 2x over hue).
7. **Edges.** Where a body meets empty background and his art has a dark edge there, his 1 px deep-violet outline (#28103a) is restored. No pure black, except his truly black feathers and thorns. Sparkles, soft-glowing edges and the multi's darts get no outline.
8. **Thin lines** (walls, blast sparkles): written last, after the palette (see the fix table).
9. **Hidden parts.** What his characters hid is filled in: the aura's flames behind the whole figure (from his flame colours only), and the 3/4 wall's shadow and strip, continued along the shadow's own slant.

## How the other frames are derived

The generator works on the indexed key frames, so every frame stays in his palette. Frame 0 of every loop, frame 2 of `hit`, frame 3 of `blast` and frame 0 of each wall's `idle` are his picture exactly. A tone step moves each colour one step along its own hue ramp (the entry of its kind about 8 L lighter or darker with the nearest hue and chroma), so lit and dimmed frames keep his violets.

- **`bolt`:** the eye holds still; the orb's rim breathes a step lighter and darker; the tendrils wave more the further back they are; the fine dark smoke streams back.
- **`sphere`:** the eye and the orbit ring hold; the spikes and sparks crackle round them and pulse.
- **`slash`:** a light runs down the bright edge; the wisps stream back.
- **`multi`:** each dart bobs a pixel on its own beat; its streak trail waves.
- **`breath`:** each arc (with its rim) and each eye moves a pixel out and back along its ray from the orb, the wave travelling outward one frame of lag per 13 px of radius; the eyes blink in turn; the orb pulses.
- **`stream`:** his 64 px tile scrolled along the line (0, 11, 21, 32, 43, 53 px); every frame tiles seamlessly.
- **`stream_head`:** his head in frame 0; then the spiral turns a sixth of a turn a frame inside its disc and his ribbons slide on into it with the stream, the braid following in from the last tile (seamless joint in every frame); the wisp drifts; the sparks twinkle.
- **`hit`:** 0: white-hot at 34% size; 1: at 72%; 2: his picture; 3: the spikes fly out; 4-5: they dim and break up.
- **`blast`:** 0-2: the pool opens and turns (8 degrees a frame inside its outline); the column shoots up out of it in streaks of light, narrow at first, white-hot at its ragged front; the feathers and sparkles burst out at 2. 3: his picture. 4-5: the pool keeps turning, the column wavers, the feathers fly out and up, the smoke rises. 6-7: the column goes out from the top down along ragged streak ends and darkens down its hue ramp; the pool darkens and fades.
- **`wall`:** `rise`: his pillars push up out of the ground, each on its own beat, white-hot at their tops while they climb; the thorns climb after them; the petals and feathers come last. `idle`: his picture, then a glint runs across the crystals, the thorn tips sway and the bits bob.
- **`wall_diag`:** `rise`: the crystals push up out of his slanted foot line in a wave from the near end to the far end (translated column by column, clipped at the ground); the brambles and shards in front come up after; the long shadow stretches out from the foot along its run. `idle`: his picture, then the glint, drifting bits and smoke.
- **`wall_depth`:** `rise`: the column is pushed up out of the ground (translated, clipped at each column's base), white-hot at its top while it climbs; the smoke comes up with it. `idle`: as above.
- **`aura` / `aura_back`:** the flames lick upward (a rising, time-periodic warp) and their glow pulses; the veil breathes (+-12%); the petals drift; the ring at the feet flickers.

## Sizes, anchors and anims

The manifest has the exact values. The "old" column is `vfx_genjutsu`. Every anchor moved with the art, so placement in game is unchanged.

| sprite | frame | anchor | old frame / anchor | anims | anchor is |
|---|---|---|---|---|---|
| bolt | 67x64 | 49,32 | 64x64 / 32,32 | fly 6@12 loop | the eye orb's centre (the tendrils trail to the left) |
| beast | 128x96 | 64,48 | same (copied) | fly 6@12 loop | another artist's |
| stream | 64x64 | 0,32 | 64x64 / 0,32 | fly 6@12 loop | left edge, centre line y = 32; wraps left to right |
| stream_head | 67x64 | 32,32 | 64x64 / 32,32 | fly 6@12 loop | as before: its left edge joins the last tile |
| breath | 112x110 | 8,54 | 112x104 / 8,52 | fly 6@12 loop | the origin (caster's hands): the glowing orb sits just right of it |
| sphere | 69x66 | 36,33 | 64x64 / 32,32 | fly 6@12 loop | the eye's centre |
| slash | 65x64 | 33,32 | 64x64 / 32,32 | fly 6@12 loop | the crescent's centre |
| multi | 67x64 | 35,32 | 64x64 / 32,32 | fly 6@12 loop | the middle of the three darts |
| hit | 66x67 | 34,33 | 64x64 / 32,32 | hit 6@15 once | the burst's centre |
| blast | 274x181 | 132,137 | 176x176 / 88,120 | blast 8@12 once | the pool's centre on the ground |
| wall | 290x133 | 144,124 | 272x128 / 136,120 | rise 6@12 once, idle 6@8 loop | the wall's centre on the ground |
| aura | 91x134 | 47,116 | 80x128 / 40,112 | idle 6@10 loop | the character's feet (front layer), registered on his figure |
| aura_back | 91x134 | 47,116 | new | idle 6@10 loop | the character's feet (back layer) |
| wall_diag | 312x231 | 118,169 | 240x272 / 120,188 | rise 6@12 once, idle 4@8 loop | the wall's centre on the ground |
| wall_depth | 117x257 | 54,180 | 112x304 / 56,206 | rise 6@12 once, idle 4@8 loop | the wall's centre on the ground |

Extents at his scale (game px from the anchor):
- **blast:** the pool is about 206 px wide (x -99 to +107) and reaches 30 px below the anchor; the column rises to the frame's top (about 135 px).
- **wall:** crystals from x -135 to +140 (about 4.8 m) and 116 px (2.0 m) tall; his wall is a little bigger than the old 4.5 x 1.8 m.
- **wall_diag:** "/" from the near-left foot at about (-95, +45) to the far-right end at about (+95, -55); the shadow runs from the wall's foot to the lower right, up to x +189.
- **wall_depth:** the column rises 168 px above the anchor; its base, shards and feathers reach 68 px below it (toward the camera). It is shorter than the old 304 px frame because his column is shorter at his measured scale; the anchor still marks the wall's centre on the ground.

## Renderer

- **Always place sprites by the manifest anchor;** most frames grew.
- **Projectiles** (`bolt`, `sphere`, `slash`, `multi`, `stream_head`): `fly` loops at 12 fps facing right; the anchor is the core and the core never moves inside the frame, so rotating round the anchor doesn't jitter. (The multi's three darts each bob 1 px on their own beat.)
- **`stream`:** repeat the 64 px tile along the line with the centre line on y = 32; place `stream_head` with its left edge on the last tile's right edge; rotate both together. Use the same frame index for tiles and head.
- **`breath`:** its anchor is the origin (the caster's hands), as before; rotate round it.
- **`aura` is now two layers**, as the fire set: draw `aura_back` BEHIND the caster and `aura` OVER the caster, same anchor (the feet) and the same frame index.
  - `aura_back`: his dark violet flames and smoke all round the figure, and his flame colours filled in behind the whole figure, so no map shows between any figure and the flames.
  - `aura`: the violet veil over the body (the figure seen through the genjutsu, as the owner chose for the lightning aura), plus his petals, feathers and the ring at the feet. The veil is a soft elliptical field fitted to a 96 px figure standing on the anchor (centre (-4, -46), radii 22 x 49), not any character's silhouette, so it sits right on every figure: about 18% violet (112, 54, 124) in the middle, rising to about 34% magenta-violet toward its rim and gone at the ellipse's edge, stepped in 6% alpha steps. Measured on his sheet by laying his plain character (beside the blast) over his character in the aura panel.
- **Walls:** `rise` plays once, then `idle` loops; the anchor is the wall's centre on the ground. The 3/4 wall's shadow is a translucent stain (alpha 0.6 and darker edges up to about 0.85), so draw the wall on the ground layer order as before.

## Border check

Every frame of every sprite (106 frames): no pixel with any alpha on any frame border, except the stream tile's sides and the head's left joint, which are exempt by design. See `vfx-genjutsu-v3-border.txt`.

## Known differences from his picture

- **JPEG detail.** His colours match on average (mean colour difference 5-8 Lab units per sprite against his crops at the same scale). The thin-line step brings back his cracks, seams and sparkle arms as 1 px lines; where two of his lines are closer than a game pixel they merge into one.
- **Cut-offs.** His blast column runs off the top of his panel; ours ends streak by streak over its top 16 px. His 3/4 wall shadow runs off his panel's right edge; ours thins out in an ordered alpha ramp over its last 30 px.
- **What his characters hid** is our fill, not his pixels: the 3/4 wall's shadow and its thin strip are continued along the shadow's slant under his character; behind the aura's figure is a smooth fill of his flame colours (it is behind the caster, so only its edges show). The aura's petals that sat on his character keep only their pink.
- **The aura's middle** is the measured veil, not his per-pixel tint of his character (that tint followed his figure; ours has to fit any figure). His figure reads a touch pinker than ours under it.
- **The slash's dark strokes** are 2-4 of his px wide, so at game scale they are a little softer than his.
- **Translucency on light ground.** His smoke, glows and the long shadow are translucent, so over the green map they turn greyer-violet than on his dark panel. That is what a translucent violet does over green; the opaque parts keep his colours.
- **Palette size.** 230 colours for the set, more than a hand-made pixel-art palette, so that his hues survive.
- **Frames between key frames** are derived (rotations, translations, tone steps, warps) from his key frame, not painted by him.
