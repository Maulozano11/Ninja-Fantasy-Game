# Chakra set v3: copied from the owner's paint-over

The owner repainted our chakra sheet (`REF-chakra-set-owner.jpg`, also `docs/reference/chakra-set-owner-reference.jpg`) and asked for it to be copied as exactly as possible. Every sprite's key frame in `vfx_chakra_v3` is his picture. The other frames are derived from it, with the new, slower timing.

Two exceptions:
- **wall_depth is ours.** He said his end-on wall is not right, so our seal barrier is kept, played with the new frame counts.
- **beast is out of scope.** Another artist does the griffin. `beast.png` and its manifest entry are copied through from `vfx_chakra` unchanged (the fox, `fly` 6 frames at 12 fps).

- **Group:** `vfx_chakra_v3`, written to `staging/vfx_chakra_v3/` (one PNG per sprite plus `manifest.json`). Every sprite is tagged `vfx`.
- **Sprite and anim names:** the same as `vfx_chakra`, plus `aura_back` (see the aura below).

This is the fix pass for the art director's review (`review-chakra-set-r1/`); see **What changed in this pass** below.

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
4. **Review sheets: `tools/refs/chakra-v3-review.py`.** It makes the compare sheet, the animation strips and the GIFs.

## Sprites

Frame sizes in px, anchors in px from the frame's top-left, anims as frames@fps.

| sprite | frame | anchor (meaning) | anims | what it does |
|---|---|---|---|---|
| bolt | 80x80 | 40,40 (vortex core) | fly 8@12 | His vortex swirls: a wave runs in along its arms to the core (outer arms move about 2 px a frame) and comes round to his picture, with no seam; his cream flecks circle it (30° per loop) and twinkle. |
| stream | 64x64 | 0,32 (left end, centre line y 32) | fly 8@12 | One 64 px period of his beam, flowing 8 px a frame toward the target; it still tiles. |
| stream_head | 81x71 | 32,32 (32 px past the tile end) | fly 8@12 | His big gold ring holds still with a glint; ripples run out along the spikes; dots twinkle. The joint columns are the flowing tile. |
| breath | 118x108 | 9,54 (cone origin) | fly 8@12 | Ripples run outward along the cone's ragged edges and wisps; the hand and seal marks hold and shimmer; motes drift. |
| sphere | 71x70 | 35,31 (orb centre) | fly 8@12 | The spiral orb swirls the same way inside his gold rope ring, over a still disc of his dark rim colour; the ring holds with a glint; the outer arcs ripple. |
| slash | 66x71 | 34,35 (centre) | fly 8@12 | The crescent ripples gently and shimmers; the cream flecks twinkle and drift back. |
| multi | 62x64 | 30,32 (centre) | fly 8@12 | The three seal orbs hold and shimmer; their trails ripple; the dots twinkle whole. |
| hit | 88x89 | 44,44 (hit point) | hit 12@12 once | See the timing below. |
| blast | 190x200 | 93,138 (ground centre, centre of his seal circle) | blast 16@12 once | See the timing below. His character beside it is removed. |
| wall | 279x124 | 138,117 (ground centre) | rise 12@12 once, idle 8@10 | Hexagon barrier in its gold frame. |
| wall_diag | 295x274 | 114,190 (ground centre) | rise 12@12 once, idle 8@10 | The same barrier along the diagonal (near end -87,+59, far end +91,-60), with its soft blue ground shadow. |
| wall_depth | 112x304 | 56,206 (ground centre) | rise 12@12 once, idle 8@10 | **Ours, kept as he asked.** |
| aura | 90x132 | 45,115 (feet) | idle 12@10 | **Front layer: draw OVER the character.** The near half of his gold ring and his sparkles. |
| aura_back | 90x132 | 45,115 (feet) | idle 12@10 | **Back layer: draw BEHIND the character**, same anchor and frame index as `aura`. His two flames, their haze, the gold glow at the feet and the far half of the ring. |
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
| blast | anticipation | 0-3 | The seal circle lights at its front and draws itself round both ways to the back (feathered ~3 px fronts, a step hot behind them); the hexagram follows; the haze gathers by alpha. The pillar stays down until frame 2, then climbs out of the circle with a ragged, soft (alpha over 4 px), hot front. |
| blast | peak | 4-6 | Frame 4 is his picture; 5-6 hold it while the pillar shimmers, a glint runs on the circle and the sparks start to rise. |
| blast | settle | 7-15 | The pillar thins and draws up off the circle, its foot ragged but soft (4 px); for a few frames it leaves a faint glow pool where it stood. It fades by alpha while cooling to cyan and blue (not to grey). The haze inside the circle stays at the level of the haze round it (no pit). The lines go out, the gold fades by alpha, the sparks float up and go out. |
| walls | rise | 0-11 | The gold frame rises (0-4), then the pane fills up like water, its crest riding the front; frame 11 is his picture. |
| walls | idle | 0-7 | Frame 0 is his picture; a band of light sweeps across the cells, ripples run along the crest, a glint runs on the gold, the foam twinkles. |
| wall_depth | rise | 0-11 | Frame 0: our barrier just above its gold base (glass pane and streaks showing) at half strength, so it comes up out of the light. Odd frames 1-11 are our old 6 frames, even frames lie halfway. |
| wall_depth | idle | 0-7 | Even frames are our old 4, odd frames halfway; the glint streaks never drop below a 15% share. |
| aura | idle | 0-11 | The flames lick upward (a steady travelling wave, more at their tips; the feet hold still), the light shimmers, the gold glow breathes, a glint runs round the ring, the sparkles twinkle and bob. |

## Flash and motion check

The light of a frame is its mean alpha × brightness (per mille). "Max step" is the largest change between neighbouring frames, as a share of the animation's peak (for loops it includes the step from the last frame back to the first). "Motion" is the number of pixels that change (by more than 24 in a channel) at each step, as the lowest and highest step against the loop's mean: an even loop has no freeze and no lurch.

| sprite | anim | light per frame | max step | motion (min / max vs mean) |
|---|---|---|---|---|
| bolt | fly | 111 108 106 109 108 112 111 111 | 3.0% | -6% / +3% |
| stream | fly | 104 104 104 101 102 102 104 104 | 2.2% | -1% / +1% |
| stream_head | fly | 140 138 134 136 138 131 134 137 | 4.5% | -12% / +20% |
| breath | fly | 243 241 240 241 244 245 244 244 | 1.3% | -11% / +8% |
| sphere | fly | 204 203 202 203 202 201 204 202 | 1.5% | -13% / +10% |
| slash | fly | 177 178 172 168 166 172 171 172 | 3.3% | -21% / +26% |
| multi | fly | 157 154 152 149 152 154 155 155 | 1.7% | -17% / +14% |
| hit | hit | 29 67 100 117 124 126 121 105 86 56 34 17 | 29.7% (build-up) |  |
| blast | blast | 58 119 192 256 286 286 288 282 265 239 205 148 100 58 26 6 | 25.5% (anticipation) |  |
| wall | rise | 44 56 65 86 130 169 204 238 274 307 330 353 | 12.3% |  |
| wall | idle | 353 354 356 357 357 359 357 353 | 1.1% | -58% / +34% |
| wall_diag | rise | 19 30 40 57 80 96 112 127 140 152 173 186 | 12.7% |  |
| wall_diag | idle | 186 186 188 188 187 189 186 186 | 1.1% | -75% / +70% |
| wall_depth | rise | 55 112 119 125 133 140 147 154 157 160 159 158 | 35.4% (frame 0 to 1) |  |
| wall_depth | idle | 160 160 159 160 160 160 159 158 | 1.1% | -49% / +86% |
| aura | idle | 12 12 12 10 9 10 9 10 10 12 12 12 | 17.1% | (sparkles only) |
| aura_back | idle | 145 145 146 150 156 153 148 146 146 146 146 145 | 3.7% | -14% / +29% |

- **Loops:** no light step above 4.5%, and every loop's steps are within about ±30% of each other. In the first pass, aura_back's steps next to frame 0 moved 195 px against ~1,500 elsewhere, and the breath's 693 against 3,592.
- **Hit, blast, rise:** one-way ramps up to the peak and down, with no up-down flicker. The biggest steps are on the way up from nothing.
- **wall_depth rise:** 0 → 55 → 112, as the review asked (0 → 40-60 → 111). The 35% step is the climb from the new half-strength frame to our old first frame, which is already 70% of the peak.
- **Wall idles:** the motion spread is the light band sweeping across and leaving the wall at frame 0, so frame 0 stays his picture. The review accepted this.
- **Aura front layer:** it holds only the near ring half and the sparkles, about 8% of the aura's light; its 17% is a sparkle twinkling.

## What changed in this pass (review r1)

**Majors:**
- **wall_depth rise frame 0** was a flat gold slab. It is now our barrier at a height where its glass pane and streaks just show above the gold base, drawn at half strength. Light goes 0 → 55 → 112.
- **Blast lead-in tearing:**
  - No rectangular masks are left.
  - The circle lights at its front and draws itself round both ways: two fronts feathered over ~3 px, and no start line cutting across the ring.
  - The hexagram follows the circle, and the haze fades in by alpha.
  - The pillar and its foot are hidden until frame 2, then climb with their own ragged, soft front.
  - The far arcs show through the pillar's see-through front. They sit IN the haze: only their solid gold hides it, and their faint warm glow lies over it. Before, the haze was cut away under that glow too, which left a near-clear band between the far gold lines that read as a dark crown over the pillar's front on frame 2, and as dark specks beside the pillar on frame 3.
  - No straight alpha edge longer than 6 px appears in frames 0-1 that his picture does not have. Frames 2-3 add only the ring's own curved rims, seen against the thinner haze.
- **Blast settle pit:**
  - The haze the pillar hid is rebuilt in the extractor, row by row from his haze beside the pillar, at the level of the ring band and thinning upward. Inside the circle it is now 79, against 69 for the band round it (it was 57). A slightly brighter glow pool is left where the pillar stood.
  - The pillar's 4 px halo now belongs to the pillar and leaves with it.
  - The lifting foot is soft (4 px) with a short-lived glow pool.
  - The pillar fades by alpha while cooling to his saturated cyans and blues (no grey column), and the gold fades by alpha.
- **Bolt:**
  - It no longer turns as a rigid picture. It swirls: every point moves round the core by a wave that runs in along the arms toward the core, `2.5·[sin(2πr/30 + 2πt) − sin(2πr/30)]` px along its circle (none at the core). On a spiral, arms running inward is what a turn looks like.
  - The outer arms move about 2 px a frame. The changed pixels per step stay within −6% / +3% of the mean, against 32 a frame and a crisp/blocky alternation before.
  - Every frame is moved the same way, RotSprite-like: Scale2x three times, warped, the commonest of 16 samples, then his 1 px rim put back. So all 8 frames keep his crisp rim.
  - The wave comes back to zero at the end of the loop, so frame 7 leads straight into his picture. No frame is a mix of two pictures. (In the earlier version of this pass, a 60° turn needed a two-frame cross-fade, which read as a double exposure on frames 6-7.)
  - The flecks move 2-3 px a frame.
- **Aura black dashes:** the back layer's holes under the near ring are filled with the warm glow round them. Inside the glow, back alpha 0 with front alpha 0 now happens on no pixel in any of the 12 frames (it was up to 6). The composite of frame 0 is unchanged.
- **Loops freezing then lurching (aura_back, breath, and the other churned loops):**
  - Ripples are now a steady travelling wave, `A·[sin(phase − 2πt) − sin(phase)]`, so frame 0 is exact.
  - A smooth dither field is added before rounding. The old dead zone (nothing moves until the change passes half a pixel) froze the frames next to frame 0.
  - The shimmer uses the same dithering, with its phases spread evenly round the cycle.
  - The fields are kept smooth enough that thin strokes do not tear.

**Minors:**
- **Sphere:**
  - The orb swirls the same way as the bolt (2 px, a 26 px wave), so it keeps its round shape against the ring on every frame, and the white streak bends instead of turning like a clock hand. There is no cross-faded seam.
  - A still disc of his rim colour `#07152d` sits under the orb, only where his key frame is opaque, so frame 0 is unchanged. Nothing shows through between the orb and the ring.
- **Hollow rims (slash, multi, stream_head):**
  - Small dots are kept whole and never pulled apart by the ripples.
  - Each dot or fleck twinkles out together with its glow.
  - Rims are put back after any displacement, using his rule exactly (his key frames are unchanged by it), and a rim left without its fill goes.
- **Stream head joint:** outside the beam band, the tile hands over to his head art across columns 6-9, so its marks fade instead of popping off. The joint at column 0 is still the tile. His big ring is now kept still (the spike ripples no longer reach it).
- **Hit seal burning brown:** it now fades by alpha, a step paler, with its rim lifted to a mid gold.
- **Hit hold frames:** the churn on frames 4-5 left 7 and 23 rim pixels without their fill at the spike edges. Those stray rims now go, as in the dissipate frames.
- **Flecks too gold (bolt, slash):** they now use the cream ramp. On average they are (177,166,154) and (168,157,146), against his (178,167,153) and (166,157,147); they were (202,196,158) and (195,187,150).
- **wall_depth streak blink:** the streaks keep at least a 15% share. Only our two plain frames change (rise 7, idle 4-5); every other frame of our wall is byte-identical to before.
- **wall_diag rise pinholes:** the cells now reach 2 px up under the rising crest, so the seam stays covered.
- **Pinholes under the sparkles (wall, wall_diag):** his sparkles over the pane are a separate, opaque piece. Wherever one twinkled out in the idle, or was not up yet in the rise, it left a see-through pinhole in the pane: up to 246 enclosed clear pixels on wall_diag rise frame 9 and 147 on its idle, and up to 50 on the straight wall. The pane under them is now filled from the light round them. His key frames are byte-identical (the sparkles are opaque), and every frame is now at his own count: 47 on wall_diag (his foam) and 0-10 on the straight wall.

## Checks

- **Border:** 174 frames, 0 with art on the border. The exceptions are the beast (copied through), the stream tile's two sides (they wrap) and the head's left edge (the joint). The generator refuses to write if any frame fails.
- **Key frames:** every peak and frame 0 is pixel-identical to the previous build of this pass. That build matched the first pass except:
  - the cream fleck pixels (80 on the bolt, 59 on the slash);
  - aura_back's 102 pixels under the near ring, which the front layer covers, so the composite is unchanged.
- **What the last fixes changed** (pixels per frame against the previous build; every other frame of every sprite is byte-identical):
  - bolt and sphere: frames 1-7 (the swirl);
  - blast: frames 0-3 and 6-9 (the haze under the far arcs);
  - hit: frames 4-5 (stray rims);
  - wall and wall_diag: the rise and idle in-betweens (the pane under the sparkles).
- **Stream:** it still tiles. The colour step across the wrap seam stays within the range of the tile's other column-to-column steps in every frame, as in the first pass. The new dither field's cell divides the 64 px period.
- **Determinism:** two generator builds are byte-identical and match the staged files; two extractor runs write byte-identical refdata; there is no `Math.random`.
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
npx tsx tools/refs/kit-sheet.ts $ART2/staging/vfx_chakra_v3 chakra $ART2/vfx-chakra-v3.png
```

`<reviewDir>` is the folder from step 1 (`his-map.json`, his crops, before/after previews); this pass used `chakra5/rev` in the scratchpad. `CHAKRA_DEBUG=<dir>` also writes the extractor's class maps.

## Deliverables (in `art2/`)

| file | what it shows |
|---|---|
| `vfx-chakra-v3.png` | The kit sheet, at 2x with our character for scale. `kit-sheet.ts` always picks hit frame 2 and blast frame 3 (build-up frames); the peaks are hit 3 and blast 4, which the compare sheet shows. |
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
  - What the pillar hid is rebuilt and shows only in the lead-in and settle. The haze there is a soft glow pool, slightly brighter than the band round it. The far arcs of the circle and hexagram are his near halves turned round (their glyphs are upside down) and have no dark rim.
- **Walls:**
  - The pane is a see-through blue (alpha 180-244), as our barrier was.
  - wall_diag's shadow fades where his panel cut it; his character's spot in it is filled in.
- **Aura:**
  - His character is removed and his haze filled in behind him.
  - Our character's cape is wider than his figure, so it covers more of the left flame.
- **Our end-on wall:**
  - The glyph band and node twinkles step with the old frame number, so they hold for two frames, and the band steps back 6 px at the loop seam (as in our old loop).
  - Rise frame 0 is new, our barrier lower down at half strength.
- **Hit:** while the burst separates from the seal, the gap between them shows the ground (a dark ring on a dark map).
- **Sizes and anchors:** unchanged from the first pass.
