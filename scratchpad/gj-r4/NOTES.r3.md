# Genjutsu jutsu VFX, v3: copied from the owner's paint-over

The owner asked for his examples to be copied as exactly as possible. Every sprite's key frame here is his own picture (`REF-genjutsu-set-owner.jpg`, also `docs/reference/genjutsu-set-owner-reference.jpg`), cut out at game scale and cleaned up into pixel art. The other animation frames are derived from that key frame, so the peak frame is his picture.

- **Group:** `vfx_genjutsu_v3` in `staging/vfx_genjutsu_v3/`: one PNG per sprite plus `manifest.json`, tag `vfx`.
  - Sprite names, anim names and loop flags are the same as in `vfx_genjutsu` (checked). Frame counts and fps are the new shared targets (see "More frames").
  - Anchors mean the same things as before.
  - **One new sprite:** `aura_back`, the aura's back layer, as the fire artist did (see "Renderer").
- **`beast` (the crow swarm) is out of scope.** Its PNG and manifest entry are copied through byte for byte from `staging/vfx_genjutsu/` (checked). Another artist owns it.
- **Merging:** copy the 15 PNGs and the manifest entries into `vfx_genjutsu`. Frame sizes and anchor numbers changed (see the table), so the manifest entries must come along with the PNGs. The renderer must also learn `aura_back`.
- **Eyes:** the bolt, the sphere and the breath carry HIS plain eyes (white sclera, dark lid and pupil), copied from his pixels. There is no tomoe or pinwheel anywhere.

## More frames (owner: "too fast, like a flashing star")

Every anim has more frames with smaller steps, to the targets shared by every element (`frames-brief.md`). His picture is still the key frame, and every in-between comes from his pixels (grow, reveal, displace, cool down his own ramps, fade).

| anim | was | now | his picture |
|---|---|---|---|
| bolt, sphere, slash, multi, breath, stream, stream_head `fly` | 6 @ 12 fps | **8 @ 10 fps** loop | frame 0 |
| hit `hit` | 6 @ 15 | **12 @ 12** once (1.0 s) | frame 3, held on 4-5 |
| blast `blast` | 8 @ 12 | **16 @ 12** once (1.33 s) | frame 4, held on 5-6 |
| wall, wall_diag, wall_depth `rise` | 6 @ 12 | **12 @ 12** once | last frame (= idle frame 0, checked) |
| wall, wall_diag, wall_depth `idle` | 6 @ 8 (wall), 4 @ 8 | **8 @ 10** loop | frame 0 |
| aura, aura_back `idle` | 6 @ 10 | **12 @ 10** loop, frame-synced | frame 0 |
| beast `fly` | 6 @ 12 | unchanged (another artist's, copied through) | - |

- **hit:** builds over frames 0-2 out of a small hot core (each colour 2, then 1 ramp step up, less as it grows; no white flash), his picture on 3, held on 4-5 (the spikes churn a pixel), then it dissipates over 6-11: the spikes fly outward 1.5 to 6.5 px, the burst shrinks back to 85%, the colours cool down their own ramps from the core out, it breaks up from the tips inward and fades.
- **blast:** anticipation 0-3 (the pool opens out of the ground from 34% and turns, the column shoots up in streaks of light from 14% to 90% of its height, narrow at first, white-hot at its ragged front; the feathers burst out on 2-3); his picture on 4; the hold 5-6 is his picture with small motion only (his own pool under the pool turned 2.5 and 5 degrees, the column wavering over his own column, the smoke drifting half a pixel over his own smoke, the feathers and sparkles still); a long settle 7-15 (the column goes out from the top down along ragged streak ends and darkens down its ramps, the pool keeps turning and darkens, the feathers fly out and up and go out one by one, the smoke rises; everything fades over 11-15).
- **walls `rise`:** 12 frames, eased out (quick at first, settling into his picture; the last steps are a pixel or two). The straight wall's pillars rise in clusters, each on its own beat, with their thorns; the 3/4 wall rises in a wave from the near end; the end-on column rises from its base. See "How the other frames are derived".
- **No flash:** `vfx-genjutsu-v3-flash.txt` lists the mean alpha x brightness of every frame and the biggest step between neighbours. Loops and idles step at most 5.5% of their peak, except stream_head (8.9%, see "Known differences"). The one-shots ramp smoothly up and down (hit 29 72 122 **139** 135 141 143 134 107 77 55 28; blast 12 44 86 121 **146** 144 144 137 120 113 98 79 65 46 29 16): no frame is brighter than its neighbours on both sides by a jump. The biggest steps are the 3-frame build-ups the brief asks for.
- Every manifest row is under 8192 px wide (the widest is the blast, 16 x 274 = 4384).

## Fix pass r3 (this pass): the art director's r2 findings

| finding | what changed |
|---|---|
| **bolt** smoke thinned into speckle (major) | The extractor makes his blackest smoke (L < 22) solid (`solid_dark`, still in the smoke piece), and the generator no longer thins it: the smoke is drawn at full strength in every frame. His dense mass behind the tendrils (its parts of 30 px or more) stays where he put it and churns at its edges over itself (so it never opens); only his small flecks stream back. Under the waving tendrils lies their own footprint in his deep violet (their outline colour), so a tendril moving off a pixel never shows the map. Frame 0 is his crop. |
| **blast** holes in his picture's hold (major) | Hold frames 5-6: his own pool lies under the turned pool (turned 2.5 and 5 degrees only), his own column under the wavering one, his own smoke under the drifting smoke, and the feathers and sparkles hold still. Elsewhere: the pool behind the column (cut away in his picture) runs on behind it, each hidden pixel taking the pool's pixel half a turn round the ellipse (his spiral has two arms, so it maps onto itself), so when the column narrows or goes out no map shows there; the column's gaps under his feathers, smoke and sparkles are filled from the column's own nearest pixel in the row (within its own span); the straight line where his pool was cut at its back fades out in ordered alpha steps to a ragged line when the column is gone. Enclosed see-through pixels (the review's measure): 0 in every frame (see the safety net below). |
| **wall** idle slits along the thorns (major) | His crystal is run on under his thorns (each thorn pixel inside the crystal's span takes the nearest crystal pixel), so a thorn swaying a pixel shows his crystal, not the map. The floating bits bob each as a whole, and a bit lying on the wall holds still. Holes before the safety net: 3-4 per frame, as in his picture (3). |
| **wall_depth** / **wall_diag** idle slits (major) | His smoke (with his dark thorns and feathers in it) churns over itself as it lies in his picture; bits lying on the wall hold still, free ones bob whole. Holes before the safety net: end-on 4-9 (his picture 6), 3/4 3 (his picture 3). |
| **wall** rise: notched pillars, floating bars, ruled thorn line (major) | (1) Each pillar cluster is completed: where a neighbour stood in front of it in his picture, its top line runs on from its own open columns and the hidden pixels take its own pixels at the same depth below its top (outline, bevel and faces run on); clusters are drawn back to front and every completion lies under every pillar's own pixels, so in his picture nothing changes. (2) His floating feathers' dark rims (in the crystal piece, touching a feather) and loose chips under 40 px go with the bits, so no dark bar rises with a pillar. (3) The thorns rise with the pillar they lie on (a beat behind it), clipped at the ground like the crystal: no ruled line, no flat cut. |
| **wall_diag** rise: hole of map under the risen crystals (major) | Extractor: his crystal bases and the magenta splash at the foot are crystal (opaque), not shadow (the shadow polygon's top edge now runs along the real feet). Generator: a column's ground follows its crystal down while it runs on unbroken below the straight foot line, so the bases rise with their columns; what lies in front of the foot (brambles, shards) fades in column by column with the wave (ordered alpha steps), not late. The review's box (x 91-158, y 137-177): 46 clear px from frame 4 on (was up to 1078). |
| **stream_head** pasted spinning disc (major) | (done in the earlier, cut-off attempt of this pass, kept) Only his bright inner spiral (r <= 10.5) turns, blended with his still picture out to r 12; his dark rim arcs and the ribbon entry keep his frame-0 pixels; the ribbons flow only inside his own ribbon outline and stop at his boundary with the vortex; the sparks twinkle by a palette step, never cut. |
| **aura** magenta lost, airbrushed back, halo veil (major) | Extractor: his figure is found by laying his plain character (beside the blast) over the aura panel at (-294, +229) his px; every flame pixel outside it is kept as his art (his magenta tongue on the right: mean (139, 66, 141) where his is (141, 64, 141); bright magenta pixels 491, his 597, was 238). What the figure truly hid is filled with vertical flame streaks continued from his flames above and below (`fill_vertical`), not a blur. Generator: the veil has no brighter rim: a flat tint of (114, 55, 126) at 33-37% (breathing), fitted by least squares to his tinted figure against his plain one (3940 px: a = 0.37, C = (114, 55, 126)), fading out only over the outer twelfth of a field round a 96 px figure (head to feet). |
| wall_depth rise jumps into place (minor) | All 3D walls ease out as `1 - (1 - (r + 1) / 12) ** 2`: the last steps are about 4 and 1 px (brightness 154 159 163 162); the front shards are full by frame 9. |
| breath pinholes (minor) | His dark back layer (under the moving arcs and eyes) is now only under his opaque pixels, so his translucent glows stay see-through and no glow turns into a dark ring that closes a speck. Holes before the safety net: 5-12 (his picture 2); after: 0. |
| blast column sawtooth top (minor) | (earlier attempt, kept) On his picture and its hold the column runs up to 2 px below the frame top and ends in a 6-row stepped alpha fade; the ragged ends only when it goes out. |
| blast feathers olive on grass (minor) | His black feathers are their own opaque piece (extractor). The light column pixels the feather ellipses took in stay with the column (L > 40), so no chip of the column flies off with a feather. |
| sphere spikes going grey-lavender (minor) | A tone step now never leaves its family (a saturated colour keeps 60% of its chroma and its hue within 35 degrees, else it does not step; his hot pinks only step to hot pinks), and only the sphere's hot pinks and magentas pulse, a step at most. |
| stream tile wrap (minor) | The tile is now his window [504, 588) (the period just before his head, where his braid repeats most closely), and from a least-error seam in the 16 columns where his two periods match best (columns 41-56, 13-17 apart per column) it continues with the period before it, [420, 504), whose last column runs on into the window's first in his image. Every pixel is his; nothing is painted in. |
| wall_diag shadow hard cut (minor) | The long shadow now stretches out from each column's own foot as that column rises (each shadow pixel belongs to the column its run starts from), its moving end an 8 px ordered (Bayer) alpha ramp. |

**The safety net.** After the structural fixes above, a few specks remain where a moving piece encloses a pixel of map (mostly gaps between thorn branches as they come out of the ground, smoke breaking up while it fades). Every frame then goes through `sealHoles`: an enclosed clear region of up to 12 px whose ring is at least 75% solid (the review's measure) takes, in a derived frame, the commonest solid colour round it (or his panel colour, #1a1525, where his picture is also clear there); in his picture itself it takes his panel colour as an opaque palette entry, so on his panel it looks as he painted it. The build prints how many pixels it sealed per sprite (for example blast 16 px in his picture and 265 over its 15 other frames; wall 6 and 329). Result: 0 enclosed holes in every frame of every sprite.

Also in this pass: the 3/4 and end-on walls' smoke rises with the crystals (moved as they are, so it never parts from them); every wall idle frame moves (the glint now crosses the crystals' own extent once per loop, so no idle frame repeats the one before).

## Fix pass r2

| item | change |
|---|---|
| frame counts | the table above |
| blast column gaps | His dark smoke streaks and a feather lie across the column, so the column had gaps under them that showed the map once the smoke drifted. They are filled from the nearest column pixel in the same row and drawn under the smoke: his deep violet where the smoke still lies (so the smoke composites back to his look, within 2-3 levels on his panel), the column's own colours where it has drifted off. |
| see-through holes in black shapes | Clear regions up to 80 px that do not reach the frame's edge and are rimmed mostly by dark pixels (L < 25) are sealed with the rim's commonest colour, in the piece that owns the rim (so they move with it). |
| blast feathers | They go out one by one and stay out (thinned where they started), instead of blinking on and off per frame. |
| kit sheet | `tools/refs/kit-sheet.ts` draws hit frame 2 and blast frame 3 (the old key frames). `vfx-genjutsu-v3-kitview.py` makes a view of the group with those two anims' first frame dropped, so the sheet shows his picture (hit 3, blast 4). `kit-sheet.ts` itself is not changed. |

## Fix pass r1 (art-director review): what changed

| finding | fix |
|---|---|
| aura anchor 6 px right, 7 px low (major) | Anchor set by registration: our `characterRef` correlated (luminance NCC) over +-14 his px and scales 1.29-1.33 on his figure in the aura panel; best at scale 1.30, his (519.5, 635.5). The aura is cut at 1/1.30. Anchor (47,116) in a 91x134 frame. |
| blast frames torn / grey static (major) | The pool turns inside its own outline (a true rotation in the ellipse's space about the pool's own centre, 4 sub-samples per pixel, majority vote). The dying frames step every colour down its own hue ramp and take the column out from the top down along ragged streak ends in ordered alpha steps. |
| wall_diag rise floats and smears (major) | Each column is translated (no shear, no scale) and clipped at its own ground y on his slanted foot line; the wave runs from the near end to the far end. |
| eyes lost (major) | New `eye` kind in the extractor: hand-set ellipses per eye (sphere 1, bolt 1, breath 6), quantized with lightness weighted 2x over hue onto the body palette plus two fixed sclera whites (#f0e4f8, #fcf4ff) and the deep-violet lid (#28103a). |
| wall cracks gone (major) | New `lines` step in the extractor: his thin bright and dark lines found at his own resolution and written as 1 px lines after quantization. Used on all three walls. |
| others (minor) | speck filter only for JPEG specks in flat planes; blast sparkles through `lines`; breath arcs found by their lit bodies; tone steps along each colour's own hue ramp; 3/4 wall shadow rim part of the stain; hit k = 0.744; multi without outline. |

## Files

| file | what it is |
|---|---|
| `tools/refs/genjutsu-from-ref.py` | Cuts his panels out at game scale and writes the indexed key frames. Only needs re-running to change the cut. |
| `tools/world-sprites/vfx-genjutsu-v3-refdata.ts` | GENERATED by the extract script: one palette (230 entries) and each key frame as run-length pieces. |
| `tools/world-sprites/vfx-genjutsu-v3.ts` | The generator: decodes the key frames, derives every animation and writes the group. |
| `art2/vfx-genjutsu-v3-refmap.json` | Where each key frame sits in his image (origin, scale, size, anchor). The review uses it for the compare crops. |
| `art2/vfx-genjutsu-v3-review.py` | Builds the compare, the animation strips and the GIFs, and runs the border check and the flash check. |
| `art2/vfx-genjutsu-v3-kitview.py` | Makes the view of the group that `kit-sheet.ts` reads, so the kit sheet shows his picture for hit (frame 3) and blast (frame 4). |
| `art2/vfx-genjutsu-v3-character.ts` | Writes `vfx-genjutsu-v3-character.png` (our `characterRef()`, 128x128, feet at 64,120) for the review. |
| `art2/vfx-genjutsu-v3.png` | Key frames at 2x in the kit-sheet layout, labelled, with our character for scale. |
| `art2/vfx-genjutsu-v3-compare.png` | For every sprite: his crop rescaled to game scale, our key frame on his background, our key frame on a grass-toned map, all at 3x. The aura row shows aura_back + our character + aura. |
| `art2/vfx-genjutsu-v3-anims.png` | Every animation as frame strips at 2x (yellow dot = anchor). |
| `art2/vfx-genjutsu-v3-blast.gif`, `art2/vfx-genjutsu-v3-walls.gif` | The blast beside our character, and the three walls (`rise`, then `idle`), at 2x. |
| `art2/vfx-genjutsu-v3-border.txt` | Border-check output. |
| `art2/vfx-genjutsu-v3-flash.txt` | Flash-check output: mean alpha x brightness per frame and the biggest step between neighbouring frames. |

## Rebuild (exact commands)

From the repo root, with `ART2=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2`:

```bash
# 1. only when changing the cut (about 20 s):
python3 -I tools/refs/genjutsu-from-ref.py $ART2/REF-genjutsu-set-owner.jpg \
    tools/world-sprites/vfx-genjutsu-v3-refdata.ts $ART2/vfx-genjutsu-v3-refmap.json [previewDir]
# 2. the sprites (about 30 s); needs $ART2/staging/vfx_genjutsu/ for the beast:
WORLD_OUT=$ART2/staging npx tsx tools/world-sprites/vfx-genjutsu-v3.ts
# 3. the kit sheet (kit-sheet.ts draws hit frame 2 and blast frame 3, so it reads a view of the
#    group in which those are his picture, hit 3 and blast 4):
python3 -I $ART2/vfx-genjutsu-v3-kitview.py $ART2/staging/vfx_genjutsu_v3 $ART2/gj-fix2/kitview
npx tsx tools/refs/kit-sheet.ts $ART2/gj-fix2/kitview genjutsu $ART2/vfx-genjutsu-v3.png
# 4. the review images, the border check and the flash check:
npx tsx $ART2/vfx-genjutsu-v3-character.ts $ART2/vfx-genjutsu-v3-character.png   # once
python3 -I $ART2/vfx-genjutsu-v3-review.py $ART2 $ART2/REF-genjutsu-set-owner.jpg
```

Safeguards:
- The generator refuses to run without `WORLD_OUT`, so it never writes into `src/assets`.
- It writes the group into a temp folder and renames the files in, PNGs first and the manifest last. The extract script writes its outputs to `.part` files and renames them.
- Both are deterministic (no `Math.random`): a fresh extract run gives byte-identical refdata (md5 5f92884b...) and refmap (6afac2ce...); two generator builds give byte-identical PNGs and manifest (16 files, checked).
- The generator throws if any frame has art on its border.
- `npx tsc --noEmit -p .` prints no errors from these files.
- No other artist's file was touched (`kit.ts`, `kit-sheet.ts`, `vfx-a*`, `vfx-b*`, `vfx-sig-*`, `vfx-beasts*`, `beasts-from-ref.py`, the other v3 sets).
- For experiments only, in a scratch folder: `GJ_ONLY=a,b` limits the extractor to some sprites (the palette then comes from those); `GJ_SPRITES=a,b` makes the generator build only those sprites and keep the other entries of the manifest it writes into; `GJ_NOSEAL=1` turns the safety net off (to see the structural holes). `__gjDebug` exports internals for debugging scripts. Never use them for the delivered build.

## How the key frames were made

1. **Scale, measured on his character.** His sheet is our 2x kit sheet re-arranged into a square at about 0.65, so about 1.3 of his pixels make one game pixel. Each panel uses its own factor, from fitting our 96 px `characterRef` onto his character beside it:
   - blast, straight wall and aura 1.30, 3/4 wall 1.27, end-on wall 1.25 (his px per game px);
   - the projectile panels have no character: their inside (86-87 px, the hit's too) is our 64 px frame;
   - the stream: his braid repeats every 84 of his px, so one period is the 64 px tile. The tile is his window [504, 588), the period just before his head (his head starts at 588), continued from the seam described in "Fix pass r3".
2. **Clean-up.** Removed: his panel fill (#20202a), his characters, the labels and the panel borders. The JPEG is smoothed before every decision, so its ringing and blocks are not copied.
3. **Classes** (per pixel of his image):
   - **body:** his painted shapes (violets, magentas, pinks, lavender crystal, whites), opaque; on the 3/4 wall also his crystal bases and the magenta splash at the foot;
   - **dark:** darker than his fill. Next to a body it is his dark rim (opaque). Away from bodies it is smoke, kept semi-transparent (alpha floor 0.85), except where his art is truly black (crow feathers, thorns, vines, the bolt's densest smoke), which stays opaque;
   - **glow:** faint colour over his fill (halos, the column's veils, the aura's flame edges), colour-to-alpha'd off his fill so it composites back to his look;
   - **ground:** the 3/4 wall's long violet shadow, its darker edges and the thin strip of it above, colour-to-alpha'd with an alpha floor of 0.6, so it reads as a stain on any map;
   - **weed:** the olive brambles of the 3/4 wall (their own 5 colours);
   - **eye:** his eyes (see fix pass r1).
4. **To game scale.** Every class is box-filtered to game scale; each game pixel takes its strongest class and that class's mean colour (the blast's column weights its streaks up).
5. **Colour.** Within a body, each pixel's hue (Lab a, b; not its lightness) is averaged with its near-alike neighbours, so the JPEG's colour speckle goes and his flat planes keep one hue. Eyes are left out.
6. **Palette.** One palette for the set, from his own pixels of each class (k-means in Lab): 1 outline, 182 body (150 violets/lavenders/whites + 30 hot pinks/magentas + 2 fixed sclera whites), 5 weed, 6 dark, 4 smoke, 20 glow, 12 ground. Each pixel takes the nearest entry of its class, with hue weighted 1.6x over lightness (eyes and lines: lightness 2x over hue).
7. **Edges.** Where a body meets empty background and his art has a dark edge there, his 1 px deep-violet outline (#28103a) is restored. No pure black, except his truly black feathers and thorns. Sparkles, soft-glowing edges and the multi's darts get no outline.
8. **Thin lines** (walls, blast sparkles): written last, after the palette (see fix pass r1).
9. **Hidden parts.** What his characters hid is filled in: behind the aura's figure (found by laying his plain character over it), vertical flame streaks continued from his flames above and below; the 3/4 wall's shadow and strip, continued along the shadow's own slant.

## How the other frames are derived

The generator works on the indexed key frames, so every frame stays in his palette. Frame 0 of every loop, frame 3 of `hit`, frame 4 of `blast`, the last frame of each wall's `rise` and frame 0 of each wall's `idle` are his picture exactly (with the small additions noted under "Known differences"). A tone step moves each colour one step along its own hue ramp (the entry of its kind and family about 8 L lighter or darker with the nearest hue and chroma, never leaving its family), so lit and dimmed frames keep his violets.

- **`bolt`:** the eye holds still; the orb's rim breathes a step lighter and darker; the tendrils wave more the further back they are, over their own footprint in his deep violet; his dense smoke mass churns at its edges over itself and his small flecks stream back.
- **`sphere`:** the eye and the orbit ring hold; the spikes and sparks crackle round them; only his hot pinks and magentas pulse, a step at most.
- **`slash`:** a light runs down the bright edge; the wisps stream back.
- **`multi`:** each dart bobs a pixel on its own beat; its streak trail waves.
- **`breath`:** each arc (with its rim) and each eye moves a pixel out and back along its ray from the orb (0, 1, 1, 1, 0, -1, -1, -1 over the 8 frames), the wave travelling outward one frame of lag per 13 px of radius, over his dark back layer (under his opaque pixels only); each eye blinks in turn (half-shut, shut, open), never on frame 0; the orb pulses.
- **`stream`:** his 64 px tile scrolled along the line, 8 px a frame (0, 8, ..., 56); every frame tiles seamlessly.
- **`stream_head`:** his head in frame 0; then his inner spiral turns an eighth of a turn a frame while his dark rim arcs hold, his ribbons flow on into the vortex inside his own ribbon outline (the braid following in from the last tile: seamless joint in every frame), the wisp drifts and the sparks twinkle by a palette step.
- **`hit`:** builds 0-2 (40%, 64%, 84% size, stepped up its ramps), his picture 3, held 4-5, dissipates 6-11.
- **`blast`:** see "More frames". The pool turns inside its own outline (a true rotation in the ground ellipse's space) with the part the column hid run on behind it; over the hold, his own pool, column and smoke lie under the moving ones; the column never greys: it darkens down its own ramps and goes out from the top down along ragged streak ends.
- **`wall`:** `rise`: his pillars push up out of the ground in clusters (neighbours that overlap 6 px or more rise as one), each on its own beat, completed where a neighbour hid them and drawn back to front, white-hot at their tops while they climb; the thorns ride up with the pillar they lie on, a beat behind it, clipped at the ground; the loose bits, petals and feathers come last. `idle`: his picture, then a glint runs across the crystals once per loop, the thorn tips sway a pixel over his crystal (run on under them), free bits bob whole.
- **`wall_diag`:** `rise`: the crystals push up out of his slanted foot line in a wave from the near end to the far end (translated column by column, clipped at each column's ground, which follows a crystal's foot where it dips below the line); the brambles and shards in front fade in column by column with the wave; each column's long shadow stretches out from its foot as it rises. `idle`: his picture, then the glint and the free bits.
- **`wall_depth`:** `rise`: the column is pushed up out of the ground with its smoke (translated together, clipped at each column's base), eased out, white-hot at its top while it climbs; the front shards are full by frame 9. `idle`: his picture, then the glint, his smoke churning over itself, free bits bobbing.
- **`aura` / `aura_back`:** over 12 frames the flames lick upward (a rising, time-periodic warp); the veil breathes (33-37%); the petals drift; the ring at the feet glows a ramp step up and down.
- **Safety net:** see "Fix pass r3".

## Sizes, anchors and anims

The manifest has the exact values. The "old" column is `vfx_genjutsu`. Every anchor moved with the art, so placement in game is unchanged.

| sprite | frame | anchor | old frame / anchor | anims | anchor is |
|---|---|---|---|---|---|
| bolt | 67x64 | 49,32 | 64x64 / 32,32 | fly 8@10 loop | the eye orb's centre (the tendrils trail to the left) |
| beast | 128x96 | 64,48 | same (copied) | fly 6@12 loop (unchanged) | another artist's |
| stream | 64x64 | 0,32 | 64x64 / 0,32 | fly 8@10 loop | left edge, centre line y = 32; wraps left to right |
| stream_head | 67x64 | 32,32 | 64x64 / 32,32 | fly 8@10 loop | as before: its left edge joins the last tile |
| breath | 112x110 | 8,54 | 112x104 / 8,52 | fly 8@10 loop | the origin (caster's hands): the glowing orb sits just right of it |
| sphere | 69x66 | 36,33 | 64x64 / 32,32 | fly 8@10 loop | the eye's centre |
| slash | 65x64 | 33,32 | 64x64 / 32,32 | fly 8@10 loop | the crescent's centre |
| multi | 67x64 | 35,32 | 64x64 / 32,32 | fly 8@10 loop | the middle of the three darts |
| hit | 66x67 | 34,33 | 64x64 / 32,32 | hit 12@12 once | the burst's centre |
| blast | 274x181 | 132,137 | 176x176 / 88,120 | blast 16@12 once | the pool's centre on the ground |
| wall | 290x133 | 144,124 | 272x128 / 136,120 | rise 12@12 once, idle 8@10 loop | the wall's centre on the ground |
| aura | 91x134 | 47,116 | 80x128 / 40,112 | idle 12@10 loop | the character's feet (front layer), registered on his figure |
| aura_back | 91x134 | 47,116 | new | idle 12@10 loop | the character's feet (back layer) |
| wall_diag | 312x231 | 118,169 | 240x272 / 120,188 | rise 12@12 once, idle 8@10 loop | the wall's centre on the ground |
| wall_depth | 117x257 | 54,180 | 112x304 / 56,206 | rise 12@12 once, idle 8@10 loop | the wall's centre on the ground |

Extents at his scale (game px from the anchor):
- **blast:** the pool is about 206 px wide (x -99 to +107) and reaches 30 px below the anchor; the column rises to the frame's top (about 135 px).
- **wall:** crystals from x -135 to +140 (about 4.8 m) and 116 px (2.0 m) tall; his wall is a little bigger than the old 4.5 x 1.8 m.
- **wall_diag:** "/" from the near-left foot at about (-95, +45) to the far-right end at about (+95, -55); the shadow runs from the wall's foot to the lower right, up to x +189.
- **wall_depth:** the column rises 168 px above the anchor; its base, shards and feathers reach 68 px below it (toward the camera). It is shorter than the old 304 px frame because his column is shorter at his measured scale; the anchor still marks the wall's centre on the ground.

## Renderer

- **Always place sprites by the manifest anchor;** most frames grew.
- **Projectiles** (`bolt`, `sphere`, `slash`, `multi`, `stream_head`): `fly` loops at 10 fps (8 frames) facing right; the anchor is the core and the core never moves inside the frame, so rotating round the anchor doesn't jitter. (The multi's three darts each bob 1 px on their own beat.)
- **`stream`:** repeat the 64 px tile along the line with the centre line on y = 32; place `stream_head` with its left edge on the last tile's right edge; rotate both together. Use the same frame index for tiles and head.
- **`breath`:** its anchor is the origin (the caster's hands), as before; rotate round it.
- **`aura` is now two layers**, as the fire set: draw `aura_back` BEHIND the caster and `aura` OVER the caster, same anchor (the feet) and the same frame index.
  - `aura_back`: his dark violet flames and smoke all round the figure, with his magenta tongue and flame edges as he painted them, and his flames run on behind the figure (vertical streaks), so no map shows between any figure and the flames.
  - `aura`: the violet veil over the body (the figure seen through the genjutsu, as the owner chose for the lightning aura), plus his petals, feathers and the ring at the feet. The veil is a flat tint of (114, 55, 126) at 33-37% (it breathes), fitted to his tinted figure; it covers a field round a 96 px figure standing on the anchor (centre (-4, -47), radii 24 x 56, head to feet) and fades out only over its outer twelfth in ordered steps. No brighter rim. It is not any character's silhouette, so it sits right on every figure.
- **One-shots:** `hit` lasts 1.0 s (12 @ 12) and `blast` 1.33 s (16 @ 12); the game's pacing (commit 8ef28a9) plays them to the end.
- **Walls:** `rise` (12 @ 12, 1 s) plays once, then `idle` (8 @ 10) loops; the anchor is the wall's centre on the ground. The 3/4 wall's shadow is a translucent stain (alpha 0.6 and darker edges up to about 0.85), so draw the wall on the ground layer order as before.

## Border check

Every frame of every sprite (174 frames): no pixel with any alpha on any frame border, except the stream tile's sides and the head's left joint, which are exempt by design. See `vfx-genjutsu-v3-border.txt`. Enclosed see-through holes (the review's measure, clear <= 12 px, ring >= 75% solid): 0 in every frame.

## Known differences from his picture

- **JPEG detail.** His colours match on average (mean colour difference 4.2-5.4 Lab units per sprite against his crops at the same scale; the stream tile 10.5 against the single window, see below). The thin-line step brings back his cracks, seams and sparkle arms as 1 px lines; where two of his lines are closer than a game pixel they merge into one.
- **Specks of his panel inside his art** (where the cut-out took a pixel as dark as his panel for background) now take his panel colour as an opaque palette entry (#1a1525), so on the map no speck of map shows inside the art: 2-16 px per sprite in his picture (bolt 12, blast 16, end-on wall 16). On his panel they look as he painted them.
- **Cut-offs.** His blast column runs off the top of his panel; ours ends 2 px below the frame top in a short stepped fade. His 3/4 wall shadow runs off his panel's right edge; ours thins out in an ordered alpha ramp over its last 30 px.
- **What his characters hid** is our fill, not his pixels: the 3/4 wall's shadow and strip continued under his character; behind the aura's figure, his flames continued as vertical streaks (behind the caster, so only between arms and legs does it show).
- **The aura's middle** is a fitted flat tint, not his per-pixel tint of his character (that tint followed his figure; ours has to fit any figure).
- **The stream tile** is his window [504, 588) up to a seam in its columns 41-56, then the period before it: against a crop of that single window, its right part differs by his braid's own period-to-period differences (it is his braid, a period earlier).
- **stream_head:** its brightness steps up to 8.9% between frames. That is his braid's own light and dark crossings flowing into the head's 22 px ribbon window (the vortex part varies by about 2%); any 22 px window of the scrolling stream does the same, and the stream as a whole stays steady. It is a slow swell over the loop, not a flash.
- **Rise frames** of the walls are derived: the pillars' hidden parts are run on from their own pixels, and specks between thorn branches as they come out of the ground are closed by the safety net.
- **Unchanged from before:** JPEG softness on the thinnest lines, the slash's dark strokes (2-4 of his px wide, a little softer at game scale), see-through parts looking greyer over green, 230 colours, and in-between frames derived from his key frame rather than painted by him.
