# Chakra set v3: copied from the owner's paint-over

The owner repainted our chakra sheet (`REF-chakra-set-owner.jpg`, also `docs/reference/chakra-set-owner-reference.jpg`) and asked for it to be copied as exactly as possible. Every sprite's key frame in `vfx_chakra_v3` is his picture. The other frames are derived from it, with the new, slower timing.

Two exceptions:
- **wall_depth is ours.** He said his end-on wall is not right, so our seal barrier is kept, played with the new frame counts.
- **beast is out of scope.** Another artist does the griffin. `beast.png` and its manifest entry are copied through from `vfx_chakra` unchanged (the fox, `fly` 6 frames at 12 fps).

- **Group:** `vfx_chakra_v3`, written to `staging/vfx_chakra_v3/` (one PNG per sprite plus `manifest.json`). Every sprite is tagged `vfx`.
- **Sprite and anim names:** the same as `vfx_chakra`, plus `aura_back` (see the aura below).

This is the second fix pass, for the art director's review `review-chakra-set-r2/` (pass 3); see **What changed in this pass** below. The fixes of the first pass (review r1) are all still in place.

## How it is made

1. **Scale.** His sheet is at game scale, so nothing is resampled:
   - his characters are 96 px tall beside the blast, 97 px beside the wall and 94 px inside the aura; ours (kit `characterRef()`) is 96 px;
   - his straight wall is 261 px between the posts; ours is 257.
2. **Extractor: `tools/refs/chakra-from-ref.py`.** For each of his panels it:
   - crops inside the panel border (removing his labels and borders), removes his characters and fills what they hid from the pixels round them, and smooths the JPEG noise before any decision;
   - classifies each pixel and quantizes it to one palette taken from his image:
     - opaque `blue` chakra (28-colour ramp) and `gold` (16);
     - `cream` (6): his small warm flecks round the bolt and the slash, read from his own pixels (they are greyish cream, not seal gold);
     - a 1 px tinted `outline` where his art ends on the background: deep blue `#162260` round the chakra, dark gold `#56320e` round the gold, never black;
     - his light, kept semi-transparent: `glow` (haze, halos), `warm` (the gold glow at the aura's feet), `barrier` (the hexagon pane, alpha floor 0.7) and `shade` (the 3/4 wall's ground shadow);
   - cuts each key frame into pieces for the animation and writes `tools/world-sprites/vfx-chakra-v3-refdata.ts`. For the blast the pillar piece holds its own 4 px halo, and the haze the pillar hid is rebuilt row by row from his haze beside it, at the level of the haze band in the circle and thinning upward.
3. **Generator: `tools/world-sprites/vfx-chakra-v3.ts`.** It decodes the pieces and only derives frames from them: swirling, travelling-wave ripples, growing, revealing, steps along his own ramps, dissolving and fading. The peak frame is always his picture. wall_depth is our `barrier3d` code from `vfx-b-chakra.ts`, copied in (that file was not edited).
   For the blast it also sorts his seal circle for the frames where it is not all lit (`sealCircle`):
   - his blue light round the gold rings goes with the haze, and the top of his outer ring (which his circle's outline had cut off into the haze) goes with the circle;
   - his third, inner gold ring is rebuilt whole along its own ellipse (fitted to his visible arcs: centre 4.1 px right of and 3.2 px above the anchor, 39.5 x 25.3 px), from his ring's own cross-section;
   - the far arcs are his near arcs turned half a turn about the circle's own centre (fitted to his two outer lines, 2.5 px above the anchor), not about the anchor.
4. **Review sheets: `tools/refs/chakra-v3-review.py`.** It makes the compare sheet, the animation strips and the GIFs.

## Sprites

Frame sizes in px, anchors in px from the frame's top-left, anims as frames@fps.

| sprite | frame | anchor (meaning) | anims | what it does |
|---|---|---|---|---|
| bolt | 80x80 | 40,40 (vortex core) | fly 8@12 | His vortex swirls: a wave runs in along its arms to the core (outer arms move about 2 px a frame) and comes round to his picture, with no seam; his cream flecks circle it (30° per loop) and twinkle. |
| stream | 64x64 | 0,32 (left end, centre line y 32) | fly 8@12 | One 64 px period of his beam, flowing 8 px a frame toward the target; it still tiles. |
| stream_head | 81x71 | 32,32 (32 px past the tile end) | fly 8@12 | His big gold ring holds still with a glint; ripples run out along the spikes; dots twinkle. The joint columns are the flowing tile. |
| breath | 118x108 | 9,54 (cone origin) | fly 8@12 | Ripples run outward along the cone's ragged edges and wisps; the hand and seal marks hold and shimmer; motes drift. |
| sphere | 71x70 | 35,31 (orb centre) | fly 8@12 | The spiral orb swirls the same way inside his gold rope ring, over a still disc of his dark rim colour; the ring holds with a glint; the outer arcs ripple (a pinhole the ripple opens beside the ring is plugged with his pixel there). |
| slash | 66x71 | 34,35 (centre) | fly 8@12 | The crescent ripples gently and shimmers; its four gold seals and the two thin speed arcs inside it hold whole (only their light shimmers); the cream flecks twinkle and drift back. |
| multi | 62x64 | 30,32 (centre) | fly 8@12 | The three seal orbs hold and shimmer; their trails ripple; the dots twinkle whole. |
| hit | 88x89 | 44,44 (hit point) | hit 12@12 once | See the timing below. |
| blast | 190x200 | 93,138 (ground centre, centre of his seal circle) | blast 16@12 once | See the timing below. His character beside it is removed. |
| wall | 279x124 | 138,117 (ground centre) | rise 12@12 once, idle 8@10 | Hexagon barrier in its gold frame. |
| wall_diag | 295x274 | 114,190 (ground centre) | rise 12@12 once, idle 8@10 | The same barrier along the diagonal (near end -87,+59, far end +91,-60), with its soft blue ground shadow. |
| wall_depth | 112x304 | 56,206 (ground centre) | rise 12@12 once, idle 8@10 | **Ours, kept as he asked.** |
| aura | 90x132 | 45,115 (feet) | idle 12@10 | **Front layer: draw OVER the character.** The near half of his gold ring and his sparkles. |
| aura_back | 90x132 | 45,115 (feet) | idle 12@10 | **Back layer: draw BEHIND the character**, same anchor and frame index as `aura`. His two flames, their haze, the gold glow at the feet and the far half of the ring. Beside the head, the flames' glow fades out over 5 px (it ended in two hard-edged discs). |
| beast | 128x96 | 64,48 | fly 6@12 | Copied through unchanged (out of scope). |

- **Aura tint:** his aura does not tint the figure, so there is no veil over the body. His flames pass behind the arms, which is why they are on the back layer.
- **Sheet widths:** every row is under 8192 px; the widest is wall_diag at 3540.

## Timing (owner: "too fast, like a flashing star")

| sprite | anim | frames | fps | length |
|---|---|---|---|---|
| bolt, sphere, slash, multi, breath, stream, stream_head | fly | 8 | 12 | 0.67 s loop; frame 0 is his picture |
| hit | hit | 12 | 12 | 1.0 s |
| blast | blast | 16 | 12 | 1.33 s |
| wall, wall_diag, wall_depth | rise / idle | 12 / 8 | 12 / 10 | 1.0 s / 0.8 s loop |
| aura, aura_back | idle | 12 | 10 | 1.2 s loop |
| beast | fly | 6 | 12 | unchanged |

Frame by frame:

| sprite | phase | frames | what happens |
|---|---|---|---|
| hit | build | 0-2 | His burst grows out of the core (scale 0.5, 0.7, 0.87), a step hot. |
| hit | peak | 3-5 | Frame 3 is his picture; 4-5 hold it while the spikes churn and a glint runs on the seal. |
| hit | dissipate | 6-11 | The spikes fly on, thin and fade. The seal core shrinks a little and goes out like light: by alpha, a step paler, its rim lifted to a mid gold (never stepped down into brown). The motes drift off. |
| blast | anticipation | 0-3 | The seal circle lights at its front and draws itself round both ways to the back (feathered ~3 px fronts, a step hot behind them), all three rings whole, their light coming with them; the hexagram follows (the third ring shows through it as it draws in); the haze gathers by alpha. The pillar stays down until frame 2, then climbs out of the circle with an irregular (a slow swell plus 0-3 px per column), soft (alpha over 4 px), hot front. |
| blast | peak | 4-6 | Frame 4 is his picture (the top of the pillar, where it fades out, cooled toward his blues); 5-6 hold it while the pillar shimmers, a glint runs on the circle and the sparks start to rise. |
| blast | settle | 7-15 | The pillar thins and draws up off the circle, its foot ragged but soft (4 px); for a few frames it leaves a faint glow pool where it stood. It fades by alpha while its chakra and its light cool to cyan and blue (not to grey), and is gone by frame 14. The haze inside the circle stays at the level of the haze round it (no pit), feathered into his haze at the pillar's old edges. The hexagram goes out first, so the third ring shows whole; the gold fades by alpha, the sparks float up and go out. |
| walls | rise | 0-11 | The gold frame rises (0-4), then the pane fills up like water, its crest riding the front; frame 11 is his picture. |
| walls | idle | 0-7 | Frame 0 is his picture; a band of light sweeps across the cells, ripples run along the crest, a glint runs on the gold, the foam twinkles. |
| wall_depth | rise | 0-11 | Frame 0: our first frame sunk 16 px into its base (the glass and its cap go down behind the gold base, which stays) at 60%, its colours held toward our cyan and gold, so frame 1 rises out of it. Odd frames 1-11 are our old 6 frames, even frames lie halfway. |
| wall_depth | idle | 0-7 | Even frames are our old 4, odd frames halfway. Where the glint streaks fell to none (idle 4-5, rise 7) they are whole strokes in a soft colour between our light cyan and ice white. |
| aura | idle | 0-11 | The flames lick upward (a steady travelling wave, more at their tips; the feet hold still), the light shimmers, the gold glow breathes, a glint runs round the ring, the sparkles twinkle and bob. |

## Flash and motion check

The light of a frame is its mean alpha × brightness (per mille). "Max step" is the largest change between neighbouring frames, as a share of the animation's peak (for loops it includes the step from the last frame back to the first). "Motion" is the number of pixels that change (by more than 24 in a channel) at each step, as the lowest and highest step against the loop's mean: an even loop has no freeze and no lurch.

| sprite | anim | light per frame | max step | motion (min / max vs mean) |
|---|---|---|---|---|
| bolt | fly | 111 108 106 109 108 112 111 111 | 3.0% | -6% / +3% |
| stream | fly | 104 104 104 101 102 102 104 104 | 2.2% | -1% / +1% |
| stream_head | fly | 140 138 134 136 138 131 134 137 | 4.5% | -12% / +20% |
| breath | fly | 243 241 240 241 244 245 244 244 | 1.3% | -11% / +8% |
| sphere | fly | 204 203 203 203 202 202 205 202 | 1.5% | -14% / +12% |
| slash | fly | 177 176 174 173 172 170 171 170 | 4.2% (frame 7 to 0) | -23% / +26% |
| multi | fly | 157 154 152 149 152 154 155 155 | 1.7% | -17% / +14% |
| hit | hit | 29 67 100 117 124 126 121 105 86 56 34 17 | 29.7% (build-up) |  |
| blast | blast | 58 121 192 255 285 286 288 281 258 228 188 135 91 54 25 6 | 24.9% (anticipation, frame 1 to 2) |  |
| wall | rise | 44 56 65 86 130 169 204 238 274 307 330 353 | 12.3% |  |
| wall | idle | 353 354 356 357 357 359 357 353 | 1.1% | -58% / +34% |
| wall_diag | rise | 19 30 40 57 80 96 112 127 140 152 173 186 | 12.7% |  |
| wall_diag | idle | 186 186 188 188 187 189 186 186 | 1.1% | -75% / +70% |
| wall_depth | rise | 57 112 119 125 133 140 147 153 157 160 159 158 | 34.2% (frame 0 to 1) |  |
| wall_depth | idle | 160 160 159 160 160 160 159 158 | 1.1% | -56% / +59% |
| aura | idle | 12 12 12 10 9 10 9 10 10 12 12 12 | 17.1% | (sparkles only) |
| aura_back | idle | 144 144 145 149 155 152 147 145 145 145 144 144 | 3.7% | -14% / +31% |

- **Loops:** no light step above 4.5%, and every loop's steps are within about ±30% of each other. In the first pass, aura_back's steps next to frame 0 moved 195 px against ~1,500 elsewhere, and the breath's 693 against 3,592.
- **Hit, blast, rise:** one-way ramps up to the peak and down, with no up-down flicker. The biggest steps are on the way up from nothing.
- **wall_depth rise:** 0 → 57 → 112. The 34% step is the climb from the new sunk frame (60%) to our old first frame, which is already 70% of the peak.
- **Wall idles:** the motion spread is the light band sweeping across and leaving the wall at frame 0, so frame 0 stays his picture. The review accepted this.
- **Aura front layer:** it holds only the near ring half and the sparkles, about 8% of the aura's light; its 17% is a sparkle twinkling.

## What changed in this pass (review r2)

**Major: the blast circle broke into shards in the lead-in and the settle (frames 0-2 and 10-14).** Fixed in the generator (`sealCircle`); his picture (frame 4) is unchanged by it except for the cooled pillar top below.
- **The third ring is whole.** His inner gold ring showed only as about ten dashes between the hexagram lines, each in a boxy patch. It is now rebuilt along its own ellipse, fitted to his visible arcs, from his ring's cross-section (the commonest of his values in each half pixel across it). It is drawn behind the pillar where the pillar of a frame does not hide it, and beside and under the hexagram lines as they fade; his own arcs are kept as they are. Pieces of the third ring per frame (pixels on its line brighter than the haze beside it, 8-connected): 1 1 6 8 6 6 6 4 3 1 1 1 1 1 1 0. The 6 at the peak are his picture (the hexagram crosses it); before, it was 4 4 10 10 6 6 6 4 11 11 11 7 6 8 4 0.
- **No boxy patches.** The blue light round his gold rings (which the extractor gave to the circle) now fades with the haze, at the haze's strength, and arrives with the circle as it draws round (before that, the haze it hides is there). Before, it faded with the gold, so each dash sat in a patch of a different strength.
- **The far arcs meet his ring.** They were his near arcs turned about the anchor, which is 2.5 px below the circle's own centre, so they sat 5 px low and doubled his ring beside the pillar. They are now turned about the centre fitted to his two outer lines. The reflected copies of the third-ring dashes are gone; the rebuilt ring gives its far half.
- **No tan arcs at frame 0.** The top of his outer ring (gold, its dark edge and its pale halo: 162 px that his circle's outline had cut off into the haze) was drawn with the haze from frame 0. It now draws round with the circle, and the haze under it is filled in from the haze round it.
- **No seams.** The haze rebuilt where the pillar stood takes on his haze across the pillar's old edges, dithered over 5 px.
- **Smoothness:** the haze gathers a little sooner (0.2, 0.5, 0.6, 0.8), so the biggest step (frame 1 to 2, where the pillar appears) is 24.9% of the peak (it was 25.5%).

**Minors:**
- **Blast frame 3 front:** irregular and soft (a slow swell plus a random 0-3 px per column, alpha over 4 px), not a row of teeth. The specks beside the pillar were far-arc pieces in the wrong place; with the far arcs re-centred they continue his ring.
- **Blast pillar top and remnant:** where the top fades out (his panel cut it), the pillar's chakra and light cool toward his saturated blues (up to 3 steps: pale to cyan to mid-blue), so faint it reads as blue haze, not a grey cap. This changes 480 px of the peak's top 18 rows. In the settle the pillar's light cools too, and the pillar is gone by frame 14 (strength 0.95 0.81 0.63 0.39 0.20 0.05 0 0 over frames 8-15).
- **Slash:** the crescent's two thin speed arcs (a stroke and a row of dashes) are held whole, only shimmering, and the ripple dies out within 4 px of the gold seals. Bright arc pixels per frame: 90 91 88 85 84 85 84 77 (were 90 92 84 64 67 82 85 83; at most 14% fewer than frame 0). The seals have no dark holes.
- **Sphere:** a see-through pinhole the ripple opens that his frame 0 does not have is plugged with his pixel there (or the art beside it). Enclosed clear pixels per frame: 29 27 24 24 27 25 21 23 (his frame 0: 29; they were up to 63).
- **wall_depth idle:** on the frames where our streaks fell to none (idle 4-5, rise 7) they are now whole strokes (a 40% share of the noise there) in a soft colour between our light cyan and ice white, instead of a 15% share that broke into dots. Every other frame of our wall is unchanged.
- **wall_depth rise frame 0:** our first frame sunk 16 px into its base (the glass and its cap go down behind the gold base, which stays) at 60%, its glass drawn half way toward our sky cyan and its gold two fifths toward our seal gold, so it does not read grey or khaki. Frame 0 to 1 is now a rise, not a fade in place. Light 0 → 57 → 112.
- **aura_back discs:** beside the head, the flames' glow more than 2 px from a flame fades out over 5 px toward its outer edge, so it no longer ends in two hard-edged discs on a bright map (189 px of the back layer's frame 0).
- **Kit sheet:** built with `KIT_KEYS=hit=3,blast=4`, so it shows the true peaks, and `KIT_GROUP=vfx_chakra_v3` (a small option added to `tools/refs/kit-sheet.ts`; without it the header is as before), so the header names the group.

## Checks

- **Border:** 174 frames, 0 with art on the border. The exceptions are the beast (copied through), the stream tile's two sides (they wrap) and the head's left edge (the joint). The generator refuses to write if any frame fails.
- **Key frames:** every peak and frame 0 is pixel-identical to the previous build (review r2), except:
  - the blast peak: 480 px in the top 18 rows of the pillar, where it fades out (cooled toward his blues, as the review asked);
  - aura_back frame 0: 189 px of the flames' glow beside the head (the discs, feathered out as the review asked).
- **What this pass changed** (pixels per frame against the previous build; every other frame of every sprite is byte-identical, including the bolt, stream, stream_head, breath, multi, hit, wall, wall_diag, aura and beast):
  - blast: every frame (frames 4-6 only in the pillar's top rows);
  - slash: frames 1-7 (256-664 px: the arcs and seals held);
  - sphere: frames 1-7 (6-39 px: pinholes plugged);
  - wall_depth: rise 0 (the sunk frame) and 7, idle 4-5 (the soft streaks);
  - aura_back: every frame (150-192 px, beside the head).
- **Stream:** it still tiles. The colour step across the wrap seam stays within the range of the tile's other column-to-column steps in every frame, as in the first pass. The new dither field's cell divides the 64 px period.
- **Determinism:** two generator builds are byte-identical and match the staged files; there is no `Math.random`. The extractor and its refdata are unchanged in this pass (two extractor runs were byte-identical in the last one).
- **Beast:** `beast.png` and its manifest entry are byte-identical to `vfx_chakra`'s.
- **Staging only:** the generator refuses to run without `WORLD_OUT`, and files are written into a temp folder and then renamed in.
- **Typecheck:** `npx tsc --noEmit -p .` is clean (it covers both generator files).

## Rebuild

```bash
ART2=<scratchpad>/art2
# 1. His key frames (only when his reference changes)
python3 -I tools/refs/chakra-from-ref.py docs/reference/chakra-set-owner-reference.jpg tools/world-sprites/vfx-chakra-v3-refdata.ts <reviewDir>
# 2. The group (about 5 s)
WORLD_OUT=$ART2/staging npx tsx tools/world-sprites/vfx-chakra-v3.ts        # CHAKRA_LIGHT=1 also prints the light per frame
# 3. Review images
npx tsx -e "import { characterRef } from './tools/world-sprites/kit.ts'; characterRef().save('<character.png>')"
python3 -I tools/refs/chakra-v3-review.py $ART2 <reviewDir> <character.png>   # compare, anims, blast/walls/aura GIFs
KIT_KEYS=hit=3,blast=4 KIT_GROUP=vfx_chakra_v3 npx tsx tools/refs/kit-sheet.ts $ART2/staging/vfx_chakra_v3 chakra $ART2/vfx-chakra-v3.png
```

`<reviewDir>` is the folder from step 1 (`his-map.json`, his crops, before/after previews); this pass used `chakra5/rev` in the scratchpad (and `chakra6/` for its own checks). `CHAKRA_DEBUG=<dir>` also writes the extractor's class maps.

## Deliverables (in `art2/`)

| file | what it shows |
|---|---|
| `vfx-chakra-v3.png` | The kit sheet, at 2x with our character for scale, headed `GROUP VFX_CHAKRA_V3`. Every card is the key frame: his picture (hit 3 and blast 4 by `KIT_KEYS`; walls idle 0). |
| `vfx-chakra-v3-compare.png` | His panel beside our key frame at the same scale (3x), sprite by sprite. wall_depth is ours only, labelled "kept ours, as asked". The aura shows back layer + our character + front layer. |
| `vfx-chakra-v3-anims.png` | Every animation as numbered frame strips at 2x. |
| `vfx-chakra-v3-blast.gif` | 12 fps, with our character beside it. |
| `vfx-chakra-v3-walls.gif` | The three walls: rise at 12 fps, then the idle three times at 10 fps. |
| `vfx-chakra-v3-aura.gif` | 10 fps, round our character. |

GIF delays are in 1/100 s, so 12 fps plays at 80 ms a frame.

## Known differences from his picture

- **Bolt and sphere motion:** they swirl rather than spin (no frame is a rigid turn of his picture), because his irregular arms never come back to his picture under a turn. The flecks round the bolt do circle it.
- **Bolt:** the dark gaps between the arms are his light (semi-transparent), so the ground shows through them on a bright map.
- **Stream:** the tile is one period of his beam, so only 2 of his 7 link glyphs repeat along a line.
- **Blast:**
  - His pillar ran off the top of his panel, so it fades out over its top 20 px, and the haze fades where his panel and character cut it.
  - Where the pillar fades out at the top, its colour is cooled toward his blues (his pillar is bright up to his panel's edge).
  - What the pillar hid is rebuilt and shows only in the lead-in and settle. The haze there is a soft glow pool, slightly brighter than the band round it. The far arcs of the circle and hexagram are his near halves turned about the circle's centre (their glyphs are upside down) and have no dark rim.
  - His third ring is rebuilt whole along its ellipse from his ring's cross-section, so where the hexagram and the pillar hid it, it is an even gold line (his visible arcs keep their own pixels).
- **Walls:**
  - The pane is a see-through blue (alpha 180-244), as our barrier was.
  - wall_diag's shadow fades where his panel cut it; his character's spot in it is filled in.
- **Aura:**
  - His character is removed and his haze filled in behind him.
  - Our character's cape is wider than his figure, so it covers more of the left flame.
  - Beside the head the flames' glow is feathered out (his picture there is near-dark haze; our fill had left two discs).
- **Our end-on wall:**
  - The glyph band and node twinkles step with the old frame number, so they hold for two frames, and the band steps back 6 px at the loop seam (as in our old loop).
  - Rise frame 0 is new: our first frame sunk 16 px into its base at 60%.
  - On the three frames where our streaks fell to none, they are soft whole strokes (a new colour between our light cyan and ice white).
- **Hit:** while the burst separates from the seal, the gap between them shows the ground (a dark ring on a dark map).
- **Slash:** its thin speed arcs hold still while the crescent ripples (only their light shimmers).
- **Sizes and anchors:** unchanged from the first pass.
