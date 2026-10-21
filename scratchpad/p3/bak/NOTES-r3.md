# Poison set v3: copied from the owner's paint-over

The owner repainted our poison sheet (`REF-poison-set-owner.jpg`, also `docs/reference/poison-set-owner-reference.jpg`) and asked for it to be copied as exactly as possible. Every sprite's key frame in `vfx_poison_v3` is his picture. The other frames are derived from it, with the new, slower timing.

Two exceptions:
- **wall_depth is ours.** He said his end-on wall is not what he wants, so our mist curtain is kept, played with the new frame counts.
- **beast is out of scope.** Another artist does the cobra. `beast.png` and its manifest entry are copied through from `vfx_poison` unchanged (136x96, `fly` 6 frames at 12 fps, byte-identical).

- **Group:** `vfx_poison_v3`, written to `staging/vfx_poison_v3/` (one PNG per sprite plus `manifest.json`). Every sprite is tagged `vfx`.
- **Sprite and anim names:** the same as `vfx_poison`, plus `aura_back` (see the aura below).
- **Staging and source are in sync:** the staged files are exactly what the current repo source builds (two builds byte-identical with the staged ones; the extractor rebuilds the committed refdata byte for byte).

## How it is made

1. **Scale.** His sheet is his paint-over of our 2x sheet, brought back to about 1x. Our character (kit `characterRef()`, 96 px tall) registered on his four characters (beside the blast, the wall, the 3/4 wall and in the aura) fits at 1.00 of his px across and 1.02 down, so one of his pixels is 1.0 x 0.98 game pixels. His characters measure 95 px tall by their bounding boxes. The stream is the exception: his beam repeats every 65.9 of his px (it was our 64 px tile), so the stream and its head are read at 64/65.9 across and one period is exactly one tile.
2. **Extractor: `tools/refs/poison-from-ref.py`.** For each of his panels it:
   - reads only the inside of his panel borders, which removes his labels and borders;
   - removes his characters (our character registered on his, grown by 3 px) and their cast shadows;
   - smooths the JPEG noise before every decision (colours from a lightly sharpened copy, dark rims from the unsmoothed one, chroma smoothed within each colour family, single-pixel specks cleaned);
   - classifies each pixel at his resolution, then box-filters to game scale:
     - opaque body, quantized to one palette for the set from his own pixels (each sprite gets a fair share): 52 greens (slime), 14 violets (venom), 24 neutrals (stone, bone, pale motes);
     - a clean 1 px tinted outline wherever his art has a dark rim: deep green `#10280d` round the slime, dark violet `#25182d` round the venom, dark stone `#191f1b` round the frames, never black;
     - his soft light and the soft edges of his mist, kept semi-transparent (colour-to-alpha against his panel colour): 10 hues from his pixels, 14 alpha steps each;
   - **the blast's light is read straight from his pixels**: his green excess over his panel colour (his light lies on one line from his panel colour, so it is one colour, `#6ce957`) with full 8-bit alpha, stored apart (zlib). Its zone is everything of his light the open light reaches without crossing his slime or its rim, so it runs right up to the pool's rim (no opaque body outside the rim). Only his character and its cast shadow are filled, with the smoothest surface meeting the light round them; where his shadow and the dark rock his character stands on run out to his panel's edge, that surface meets his dark (0) there, so the fill never forms a bright core where his picture is dark. Where his panel cut the light it fades out along the light's own falloff, never along a straight line: past his panel's right edge each row runs on as far as its brightness carries it (16 px on the brightest row, less above and below), with a 24 px soft edge, so the light's right end is rounded; at his panel's bottom each column fades over 8-24 px by its own brightness;
   - **the stone frames are solid**: enclosed see-through pockets in the frame pieces (his dark moulding keyed out with his panel colour) are filled with his stone (400 px in the wall, 706 in the 3/4 wall);
   - behind the aura's figure, his flames are filled in along the flames (each column takes his flame above the hole, folded; the sides run on mirrored), never with a flat colour; his thin flame strands carry no dark rim (no dark specks on grass);
   - cuts each key frame into pieces the generator animates (main, drops, glow, and per sprite: the bolt's and breath's mist, the sphere's ring, the slash's dashes, the hit's streaks, the blast's pool and mist, the walls' stone frame in three blocks: each post and the base beam), and writes `tools/world-sprites/vfx-poison-v3-refdata.ts`.
3. **Generator: `tools/world-sprites/vfx-poison-v3.ts`.** It decodes the pieces and only derives frames from them: turning (the bolt's coil, the sphere's ring), churning his slime inside its own silhouette, swaying, drifting drops, scrolling (the stream), pushing up and sinking, re-rimming, cooling down his own colour ramps in patches, dimming his light and fading. The peak frame is always his picture, pixel for pixel. wall_depth is our mist-curtain code from `vfx-b-poison.ts`, copied into the generator; `vfx-b-poison.ts` was not edited. It refuses to write if any frame has art on its border, any see-through pixel is left in the stone, a post top changes shape during a rise, or a blast frame has a straight violet top (more than 4 neighbouring columns sharing their topmost violet row).
4. **Review: `tools/refs/poison-v3-review.py`.** It makes the compare sheet, the animation strips, the GIFs and the border, see-through-stone, flash and light checks.

## Sprites

Frame sizes are in px; anchors are in px from the frame's top-left; anims are frames@fps.

| sprite | frame | anchor (meaning) | anims | his picture |
|---|---|---|---|---|
| bolt | 74x72 | 49,33 (core of the swirl) | fly 8@10 | His swirling slime glob with its purple venom splash and drops. Only the slime inside the coil turns (nearest pixel, so his dark spiral arms keep their contrast); his rim and its highlight stay put. The cone churns back, the mist sways, the drops stream back. |
| stream | 64x64 | 0,32 (left end, centre line y 32) | fly 8@10 | One 64 px period of his slime beam with its spatter, closed into a loop at a seam where its ends match best. It scrolls 8 px a frame and still tiles. |
| stream_head | 70x72 | 32,36 (beam centre line, 32 px past the tile end) | fly 8@10 | His splashing burst. Frame 0 is his splash as drawn; later frames flow the scrolled beam into the splash up to a seam, and the spray churns and flies. |
| breath | 123x114 | 11,56 (the orb at the apex, the breath's origin) | fly 8@10 | His acid cone with bubbles, purple mist round its edges and the orb at the apex. It churns outward, the mist sways, the drops fly on. |
| sphere | 73x66 | 38,29 (orb centre) | fly 8@10 | His green orb in its purple swirling ring. The ring swings round its own ellipse (far half behind the orb), the slime churns under his highlight, the motes orbit. |
| slash | 64x74 | 33,36 (centre) | fly 8@10 | His green crescent with the bone-white fang edges. Each crescent churns only inside itself (mid tones only): the dark gap between them, the tear lines and the bone tips stay his. The churn has a smooth sub-pixel offset (under half a pixel, so frame 0 is still his), so it changes about as much between every pair of frames; the spatter and dashes bob round small circles (1.4 px), each on its own beat, instead of streaming back and jumping when the loop closes. Frame-to-frame change is even: 41-48 (mean RGBA difference over the drawn pixels) on every step, where it was 2 to 55. |
| multi | 75x63 | 37,31 (centre) | fly 8@10 | His three glob darts with their soft lime halos and yellow-white cores. Each bobs on its own beat and churns; the trails and spatter stream back. |
| hit | 84x81 | 43,41 (hit point) | hit 12@12 once | His spiky green splat with drops and violet streaks. See the timing below. |
| blast | 264x173 | 102,122 (ground centre, under the pillar) | blast 16@12 once | His gushing pillar with purple mist over the bubbling pool, and his green light to the right. His character beside it is removed. The frame is wide because his light runs on to where his panel ended and then fades out (at most 16 px past it). |
| wall | 292x141 | 145,129 (ground centre) | rise 12@12 once, idle 8@10 | His hexagon slime barrier with dripping slime on top in the dark stone frame with green runes. |
| wall_diag | 272x284 | 120,217 (ground centre) | rise 12@12 once, idle 8@10 | The framed barrier along the diagonal, bubbles on top, his green light on the ground with its dark streaks. |
| wall_depth | 112x304 | 56,206 (ground centre) | rise 12@12 once, idle 8@10 | **Ours, kept as he asked** (our mist curtain end-on, unchanged look). |
| aura | 94x145 | 47,123 (feet) | idle 12@10 | **Front layer: draw OVER the character.** The near half of his violet pool, and the soft venom tint his picture lays over the figure. |
| aura_back | 94x145 | 47,123 (feet) | idle 12@10 | **Back layer: draw BEHIND the character**, same frame, anchor and frame index as `aura`. His violet flames and green flame strands rising round the figure, his motes, the far half of the pool. |
| beast | 136x96 | 64,48 | fly 6@12 | Copied through unchanged (out of scope). |

**Anchors** keep their old meaning (projectile centre; ground centre for the blast and walls; feet for the aura; the stream's centre line). They moved with the art where the frames grew.

**The aura tint:** his figure in the aura is violet-tinted, so, as the owner chose for the lightning aura, the front layer carries a soft field over the body (not the shape of any one character): an ellipse 46 x 110 px centred 50 px above the feet, his violet flame colour `#6d3d84` at the strength fitted on his figure (alpha 0.143, his aura figure's mean colour against his plain figure beside the blast), full out to 60 % of its radius and falling to nothing at its edge (smoothstep, full alpha precision). There is no rim, no ring and no green edge, so it never draws a hoop on the ground. It breathes (alpha ±12 %, size ±2 %) twice a loop.

**Sheet widths:** every manifest row is under 8192 px. The widest is the blast at 4224.

## Timing (owner: "too fast, like a flashing star")

| sprite | anim | frames | fps | length | shape |
|---|---|---|---|---|---|
| bolt, sphere, slash, multi, breath, stream, stream_head | fly | 8 | 10 | 0.8 s loop | Frame 0 is his picture; small, continuous motion; seamless. |
| hit | hit | 12 | 12 | 1.0 s | Build 0-2, his picture 3, held 3-6, dissipate 7-11. |
| blast | blast | 16 | 12 | 1.33 s | Anticipation 0-3, his picture 4, held 4-6, settle 7-15. |
| wall, wall_diag | rise | 12 | 12 | 1.0 s | Frame 11 is his picture (idle frame 0). |
| wall, wall_diag | idle | 8 | 10 | 0.8 s loop | Frame 0 is his picture. |
| wall_depth | rise / idle | 12 / 8 | 12 / 10 | 1.0 s / 0.8 s loop | Our frames, re-timed (see below). |
| aura, aura_back | idle | 12 | 10 | 1.2 s loop | Frame-synced; frame 0 is his picture. |
| beast | fly | 6 | 12 | unchanged | Out of scope. |

What each one-shot and wall does, frame by frame:

| sprite | phase | frames | what happens |
|---|---|---|---|
| hit | build | 0-2 | His splat grows out of the core (scale 0.58 at 93 % opacity, then 0.75 and 0.875, revealed from the centre out), his light coming up with it: 24, 50 and 75 % of the peak's light, about a quarter more each frame. |
| hit | peak | 3-6 | Frame 3 is his picture; 4-6 hold it (his cell grid stays: 0.5, 3.5 and 7.0 mean difference from frame 3) while the drops and streaks start to fly out. |
| hit | dissipate | 7-11 | It breaks up from the core outward into drops that fly out and fall, cools down his ramps in patches, the streaks thin away, his light dims, and it fades. |
| blast | anticipation | 0-3 | The pool opens out of the ground. The pillar is cut from the pool along the line where his pillar's flared foot meets the bubbles (a line of rounded bubble tops, each its own height), so the pool is drawn in front of the pillar; that edge has no dark rim while the pillar stands behind it (no seam at the pillar's foot), and takes his slime rim only where nothing of the pillar is behind it any more. The whole pillar is pushed up through the pool's surface (translated, never wiped or stretched), thin at first and filling out; its top is a splashing crown: a low dome with five tongues of his slime licking up, each its own height and swaying from frame to frame, most of them throwing off one of his own drop shapes just above the tip. The round drop clinging to his pillar's left side just under its top is left off while the pillar moves (it read as a single lobe on the head) and is there from frame 4. His violet mist and its soft edges come up beside the pillar; their top fades out along a ragged soft line (9 rows, each column's start from his mist's own top outline plus a little noise) at about the crown's height, so it is never cut straight. His splash drops fly out from the pool's edge to his places (none on frame 0). His light spreads out with the pool. |
| blast | peak | 4-6 | Frame 4 is his picture; 5-6 hold it while the slime churns, the mist sways and the drops are thrown out. |
| blast | settle | 7-15 | The pillar sinks back down through the pool's surface, slumping wider, with the same splashing crown on its falling top, a little lower each frame until only the tongue tips show (frame 13) and it is gone (frame 14). Drops break off the crown, three a frame over frames 7-12, and fall in arcs back into the pool. His drops rain down, the mist rises and thins, his light dims, and the pool breaks up into islands that shrink and cool in patches, from the middle out and from the frame's edges in, with no dark rims round the holes; slivers thinner than 2.5 px or smaller than 12 px are dropped, so nothing floats. The churn and cooling leave no 2 x 2 checkerboard dither (it is cleaned on frames 7-15). |
| walls | rise | 0-11 | The stone frame pushes up out of the ground: each post whole, and the base beam whole out of one straight foot line along its length (along the diagonal for the 3/4 wall), so its top edge comes up unbroken. **Each post top (capital) is his, whole, from the first frame:** every pixel of his picture inside the capital's outline (the straight wall's flat blocks, the 3/4 wall's cubes, outlined on his picture) is the post's stone and moves with the post; his lit stone, rims and highlight lines there had been split off into the slime and are now stone. Only his slime lying over a top (bright slime reaching in from outside the outline) stays slime and comes in with the slime; where it hid the corner of the far 3/4 cube between its top face and the side face under it, the side face runs up to the top face's edge in its own colour, under the slime. A capital's overhang is cut at the ground under its post (not at its own bottom), so the whole capital comes up with the post. The generator checks every rise frame: above the ground each post shows exactly his top's pixels, moved with the post, and nothing else inside the outline (0 faults). Where his slime covered the beam's top and the post necks, the stone is carried on from the stone next to it and ends in his dark stone rim until the slime comes up. His stone's green light from the slime comes in with the slime, in patches (frames 4-10); his runes glow from the start. From frame 2 the slime fills the frame from the ground line at an even pace, riding with the beam while it is still coming up. The bubbling top and the drops come up last (8-10), with his glow round the top only where the top already is. His light on the ground has the slime as its source: it starts on frame 4, once the slime shows, grows with how far the slime has filled and spreads out from the wall's foot line, its reach growing and its front soft (3/4 wall, lit ground pixels per frame: 0 0 0 0 540 2666 4379 5950 6966 7421 7511 7511); his bright streaks lying in that light come with it, not with the slime. Frame 11 is his picture. |
| walls | idle | 0-7 | Frame 0 is his picture. A soft band of light runs across the hexagon cells, the dripping slime on top churns and licks, the bubbles and drops bob, the runes pulse. |
| wall_depth | rise | 0-11 | Frames 0-2 push our old rise frame 0 up out of the ground, its round top carried along (15, 47 and 72 % of its height); frame 3 is our old frame 0; then our old frames 1-5 with halfway in-betweens (4, 6, 8). |
| wall_depth | idle | 0-7 | Even frames 0, 2, 4, 6 are our old idle frames 0-3 pixel for pixel; the odd ones lie halfway in time. |
| aura | idle | 0-11 | The flames lick upward (a rising churn and sway, 2-3 px at the tips, the feet barely moving), the motes drift up, the pool shimmers, the tint breathes. His panel cut his flames and his pool at its sides: from row 80 down both layers fade out over their outer 5 columns along a ragged line (each row's start moved by up to 2 px), so the aura has no straight sides or square corners. |

## Flash check

The light of a frame is its mean alpha × brightness (per mille). The last column is the largest change between neighbouring frames, in percent of the animation's peak; for loops it includes the step from the last frame back to the first. No frame is brighter than both neighbours by more than 10 % of the peak (no pop) anywhere.

| sprite | anim | light per frame | max step |
|---|---|---|---|
| bolt | fly | 172 169 168 165 165 167 167 171 | 2.2 % |
| stream | fly | 138 138 138 138 138 138 138 138 | 0.0 % |
| stream_head | fly | 192 182 180 185 183 181 182 186 | 5.0 % |
| breath | fly | 203 203 203 204 202 202 201 203 | 0.7 % |
| sphere | fly | 126 124 123 124 126 124 125 124 | 1.7 % |
| slash | fly | 210 209 208 208 210 212 212 211 | 1.1 % |
| multi | fly | 125 124 123 122 122 121 123 124 | 1.2 % |
| hit | hit | 28 58 86 115 115 115 115 104 93 72 52 27 | 25.8 % (the build-up ramp: frame 0 is 24 % of the peak, then about a quarter more each frame) |
| blast | blast | 44 87 132 170 200 200 202 192 184 167 146 124 97 66 37 14 | 22.0 % (the anticipation ramp) |
| wall | rise | 12 32 62 107 139 167 195 225 256 293 302 305 | 14.5 % |
| wall | idle | 305 307 308 314 313 312 311 304 | 2.2 % |
| wall_diag | rise | 10 22 32 38 56 85 113 143 172 205 222 225 | 14.6 % |
| wall_diag | idle | 225 225 225 228 228 228 228 224 | 1.6 % |
| wall_depth | rise | 8 32 53 76 80 83 87 91 95 97 98 97 | 24.7 % |
| wall_depth | idle | 95 95 97 99 99 98 97 97 | 2.2 % |
| aura | idle | 33 35 35 33 32 32 33 35 35 33 32 32 | 3.8 % |
| aura_back | idle | 222 222 222 221 221 220 220 220 221 221 219 220 | 0.6 % |

- **Loops:** the worst step is 5.0 % (stream_head). Every loop is at 5 % or less.
- **Hit, blast and rises:** one-way ramps (up to the peak, held, then down) with no up-down flicker. The biggest steps are on the way up from nothing, where 3-4 frames have to reach the peak; every step is 25 % or less.
- **wall_depth** now starts from 8 % of its light (it was 73 % on frame 0) and climbs in steps of 25 % or less.
- **Blast light against his:** his green excess over his panel colour (G - 33) next to ours on frame 4 (composited on his panel colour), over his 5215 light pixels outside his removed character and its shadow: mean difference 3.48, 90th percentile 6.6 (target: mean under 8). It rose from 2.65 because the light's rounded end now starts up to 24 px inside his panel on its dimmer rows.
- The full per-frame numbers are in `vfx-poison-v3-flash.txt`; the generator prints them with `POISON_LIGHT=1`.

## Checks

- **Border:** every frame of every sprite was checked: 168 frames of 14 sprites, 0 with art on the border. The exceptions are the beast (copied through unchanged), the stream tile's left and right edges (they wrap) and the head's left edge (the joint). The generator refuses to write if any frame fails. Bits that would drift onto the border are dropped. See `vfx-poison-v3-border.txt`.
- **Post tops:** the generator checks every rise frame of both walls: above the ground, each post shows exactly his top's pixels (moved with the post) and nothing else inside the top's outline. 0 faults on 22 frames x 2 posts; the build fails on any.
- **No straight violet tops:** the generator checks every blast frame: no more than 4 neighbouring columns may share their topmost violet pixel's row (alpha 48 or more, over the whole frame: mist and violet slime). The longest run is 4 on every frame (it was 9 and 12 on frames 2 and 3); the build fails on more.
- **No checkerboards:** 2 x 2 two-colour checkerboards on the blast's settle frames 7-15: 0-2 per frame (they were 49-100; his own picture has 24).
- **Solid stone:** 0 enclosed see-through pixels (alpha under 128, not reachable from outside) on all 40 rise and idle frames of the wall and the 3/4 wall; the generator refuses to write if any is left in the stone. wall_depth is our mist curtain, not stone: its few thin-gas pinholes (5-10 px a frame) are the same as in our old `vfx_poison` frames, and are listed for information.
- **Determinism:**
  - two generator builds are byte-identical, and match the staged files;
  - two extractor runs write byte-identical refdata, identical to the committed `vfx-poison-v3-refdata.ts`;
  - there is no `Math.random`.
- **Staging only:** the generator refuses to run without `WORLD_OUT`. Files are written whole into a temp folder, then renamed in, PNGs first and the manifest last.
- **Typecheck:** `npx tsc --noEmit -p .` is clean (0 errors).
- **Contract:** every sprite and anim name of `vfx_poison` is kept, plus `aura_back`; the tags stay `vfx`; the beast's PNG and manifest entry are identical to `vfx_poison`'s.

## Rebuild

```bash
ART2=<scratchpad>/art2
# 0. Our character at 1x (kit characterRef(), feet at 64,120)
npx tsx -e "import { characterRef } from './tools/world-sprites/kit.ts'; characterRef().save('$ART2/vfx-poison-v3-character.png')"
# 1. His key frames (only when his reference changes; about 20 s)
python3 -I tools/refs/poison-from-ref.py docs/reference/poison-set-owner-reference.jpg tools/world-sprites/vfx-poison-v3-refdata.ts $ART2/vfx-poison-v3-character.png $ART2/vfx-poison-v3-src
# 2. The group (about 20 s; it copies the beast from $ART2/staging/vfx_poison)
WORLD_OUT=$ART2/staging npx tsx tools/world-sprites/vfx-poison-v3.ts        # POISON_LIGHT=1 also prints the light per frame
# 3. Review images and checks
python3 -I tools/refs/poison-v3-review.py $ART2 $ART2/vfx-poison-v3-src $ART2/vfx-poison-v3-character.png
KIT_KEYS=hit=3,blast=4 npx tsx tools/refs/kit-sheet.ts $ART2/staging/vfx_poison_v3 poison $ART2/vfx-poison-v3.png
```

`$ART2/vfx-poison-v3-src` holds his crops at game scale (`his-<name>.png`, same frame and anchor as ours), before/after previews (`x-<name>.png`), `refmap.json` (where each key frame sits in his image) and the blast's light mask and zone (`mask-blast.png`, `zone-blast.png`, for the light check).

## Deliverables (in `art2/`)

| file | what it shows |
|---|---|
| `vfx-poison-v3.png` | The kit sheet at 2x, with our character for scale. It was made with `KIT_KEYS=hit=3,blast=4`, so it shows his pictures (without it, `kit-sheet.ts` draws hit frame 2 and blast frame 3, which are build-up frames). |
| `vfx-poison-v3-compare.png` | His crop beside our key frame at the same scale (3x), sprite by sprite, also on grass. wall_depth is ours only, labelled "kept ours, as asked". The aura shows ours as back layer + our character + front layer. |
| `vfx-poison-v3-anims.png` | Every animation as frame strips at 2x (yellow dot = anchor). |
| `vfx-poison-v3-blast.gif` | 12 fps, with our character beside it. |
| `vfx-poison-v3-walls.gif` | The three walls: rise at 12 fps, then idle three times at 10 fps, with our character. |
| `vfx-poison-v3-aura.gif` | 10 fps, round our character (back layer, character, front layer). |
| `vfx-poison-v3-border.txt`, `vfx-poison-v3-flash.txt` | The checks (border and solid stone; flash and blast light). |

## Known differences from his picture

- **What his characters hid is not his.** Behind his character beside the blast and beside the 3/4 wall, his green light is the smoothest continuation of the light round it (beside the blast it dims to his dark where his shadow and rock ran out to his panel's edge); his characters' cast shadows (part of the character, not the jutsu) are gone. Behind the aura's figure, his flames are filled in along the flames round it.
- **The aura's tint over the figure** is the soft veil described above, not his redrawn figure; it sits right on any character.
- **Where his panel cut his art:** the blast's pillar runs off the top of his panel, so it fades out over its top 16 rows along a ragged line (and his mist with it); his blast light runs off his panel at the right and bottom, so it fades out there along its own falloff (rounded, at most 16 px past his panel) instead of being cut, which dims his light a little near his panel's edge on its dimmer rows; his aura's flames and pool run off his panel's sides, so they fade out over their outer 5 columns from row 80 down.
- **The moving frames show what his picture hid:** in the walls' rise, the stone his slime covered (the beam's top edge, the post necks) is carried on from the stone next to it and closed with his stone rim until the slime arrives. The capitals are his, whole; only the far 3/4 cube's lower-left corner, where his bubbles lay over it, is his side face carried up a few px under the slime. In the blast's rise and settle, the pool's surface in front of the pillar is a cut along rounded bubble tops, and the pillar's crown and its drops are his pixels re-shaped, not drawn by him; the round drop on his pillar's left side is left off while the pillar moves.
- **His stone's green light** (his mossy, slime-lit stone) is grey until the slime comes up in the rise; it returns in patches over frames 4-10.
- **JPEG clean-up:** his colours are quantized to 90 body colours and his rims to one tinted colour per family; his soft light (other than the blast's) is 10 hues × 14 alpha steps; a few single-pixel JPEG specks and his near-black rims are evened out.
- **The 3/4 wall's dark ground streaks** are gaps in his light (his streaks are no darker than his panel), so on grass they show the grass.
- **The stream tile** is 64 px of his 65.9 px beam period, read at 0.971 across; the seam that closes the loop takes his head's first columns.
- **wall_depth** is ours: old frames reproduced exactly, re-timed to start from the ground, with in-betweens. Our old rise threw its drops to new places on every frame; now each set of drops shows on two frames.
- **beast** is the old cobra copied through; the new cobra is another artist's job.
