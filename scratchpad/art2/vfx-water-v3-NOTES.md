# Water jutsu VFX, v3: copied from the owner's paint-over

The water set rebuilt to the owner's paint-over of our water sheet (`docs/reference/water-set-owner-reference.jpg`, also `art2/REF-water-set-owner.jpg`). He asked for his examples to be copied as exactly as possible, so **every key frame is his picture**: his pixels, scaled to game size, cleaned and quantized to a palette sampled from his image. The generator only derives the other animation frames from those key frames.

- **Group:** `vfx_water_v3` in `staging/vfx_water_v3/` (one PNG per sprite plus `manifest.json`, every sprite tagged `vfx`). Merge it at integration in place of `vfx_water`.
- **Same contract as `vfx_water`:**
  - every sprite name is kept;
  - every animation keeps its name, frame count, fps and loop flag;
  - every anchor keeps its meaning: the projectile core; the breath origin + 48 px; the ground centre for the blast and walls; the feet for the aura; the stream tile is 64 px with the line on y = 32.
  - Frames were resized to his art, and the anchors moved with it.
- **One addition:** `aura_back`. The aura is split in two layers (see the aura section below).
- **`beast` is out of scope.** His sheet keeps the approved water dragon, so `beast.png` and its manifest entry are copied through from `vfx_water` byte for byte.

## Files

| file | what |
|---|---|
| `tools/refs/water-from-ref.py` | Cuts his sheet into game-scale key frames. Writes the refdata, plus (with a review folder) his crops at game scale and before/after previews. |
| `tools/world-sprites/vfx-water-v3-refdata.ts` | GENERATED. One palette for the set (24 water colours, his rim, 6 haze colours × 7 alphas), the aura veil's two colours from his picture, and each sprite's key frame as run-length pieces. |
| `tools/world-sprites/vfx-water-v3.ts` | The generator: decodes the key frames, animates them, writes the group. |
| `art2/vfx-water-v3-review.py` | Review images and the border check. |
| `art2/vfx-water-v3-character.png` | Our character at 1x (kit `characterRef()`), used to split the aura. |
| `art2/vfx-water-v3-character-2x.png` | Our character at 2x, cut from `vfx-water.png` (the wall panel's character), used on the review sheets. |
| `art2/vfx-water-v3-src/` | His crops at game scale (`his-*.png`, same frame and anchor as ours) and the extractor's previews (`x-*.png`: his / ours on dark / ours on grass; the aura's also shows back + character + front). |

## Build

```bash
# 1. His sheet -> key frames (only when the reference changes; the build itself needs no images)
python3 -I tools/refs/water-from-ref.py docs/reference/water-set-owner-reference.jpg \
    tools/world-sprites/vfx-water-v3-refdata.ts <art2>/vfx-water-v3-character.png <art2>/vfx-water-v3-src

# 2. Key frames -> the staging group (refuses to run without WORLD_OUT; reads beast.png from WORLD_OUT/vfx_water)
WORLD_OUT=<art2>/staging npx tsx tools/world-sprites/vfx-water-v3.ts

# 3. Review images + border check
python3 -I <art2>/vfx-water-v3-review.py <art2>
```

Both steps are deterministic: no `Math.random`, and no randomness in the extractor. Two runs of each are byte-identical (checked).

Every file is written whole. The group is written into a temp folder inside `WORLD_OUT` and moved in, PNGs first and `manifest.json` last. The refdata is written as `.part` and renamed.

## How his sheet became key frames

- **Scale.** His sheet is a paint-over of our 2x sheet, brought down to about 1x, slightly more in height than in width.
  - Our character fits his best at **0.925 across and 0.912 down** (a template match on his characters).
  - His panels give the same factors against our frame sizes.
  - So 1 px of his = 0.925 × 0.912 game px, area-averaged (box filter).
- **Placement.** Each sprite is placed by an anchor measured on his art:
  - bolt: his orb's centre;
  - sphere: his bubble's centre;
  - hit: his burst's centre;
  - slash, multi: the centre of his art;
  - breath: his cone's tip;
  - blast: the centre of his pool;
  - walls and aura: the ground line his character stands on (matched to our character's feet).
- **Clean-up.**
  - Removed: his panel background, his characters, the teal light round them, the labels and the panel borders.
  - Art that spills over a panel border is read against his page colour, and the border line is filled from both sides.
  - JPEG noise is smoothed before every decision. Colours are read from a lightly sharpened copy, because the JPEG softens his crisp edges and washes out his saturated cyans.
  - A last speck pass removes single-pixel JPEG noise but keeps real highlights.
- **Classes**, decided at his resolution:
  - **water** is opaque, quantized to one palette of 24 of his colours (median cut of his pixels inside the water);
  - **his navy rims** become one clean 1 px outline, `#0e263b` (his rim colour, never black), wherever his art has a rim;
  - **his haze** stays semi-transparent: colour-to-alpha against his background, so it composites back to his look on any map. This covers the aura's halo, the hit's bloom and the multi's pale trails.
- **Pieces for animation:**
  - `drops`: loose droplets standing clear of the rest;
  - `glow`;
  - the blast's `pool` and `crown`;
  - `main`: the rest.

## Sprites, sizes, anchors, animations

**Frame counts.** The owner found the jutsu too fast, so the set has more frames with smaller steps between them, using the targets shared by every element:
- flying loops: 8 frames at 10 fps;
- hit: 12 at 12;
- blast: 16 at 12;
- wall `rise`: 12 at 12, and `idle`: 8 at 10;
- aura and aura_back: 12 at 10, frame-synced.

Every in-between still comes from his pixels (grown, revealed, displaced, darkened by his own shades, faded). The widest sheet row is the blast's, 3248 px.

| sprite | frame | anchor | anims | his picture → our animation |
|---|---|---|---|---|
| bolt | 80x62 | 58,33 (orb centre) | fly 8@10 | Glowing orb with a swirl and a tail of streaks. The swirl inside the orb turns (a vortex); the tail's streaks slide back row by row (the thin lines stay whole); droplets stream back and fall. |
| stream | 64x64 | 32,32 | fly 8@10 | His rushing jet: the 64 px that end where his crest begins, closed into a loop by a seam where its ends match best. It scrolls 8 px a frame (64 px a loop) and still tiles. |
| stream_head | 72x72 | 32,36 | fly 8@10 | His crested wave head. Frame 0 is his crest exactly. On frames 2-8 the scrolled jet flows into the crest up to a best-match seam, the crest churns and the spray flies out. |
| breath | 114x80 | 54,39 (origin 6,39) | fly 8@10 | His fan of jets from a point. The jets churn outward from a still origin; spray flies on along the fan and falls. |
| sphere | 69x66 | 35,33 (bubble centre) | fly 8@10 | Glossy bubble with a highlight and a swirl band. The water inside and the band churn gently; droplets orbit. |
| slash | 69x70 | 36,36 | fly 8@10 | His clean crescent. The water runs along the blade and its tips lick. |
| multi | 70x62 | 35,30 | fly 8@10 | His fan of water blades (his picture has **four**, not three) with pale see-through trails. Each blade bobs on its own beat and churns; the trails flicker back. |
| hit | 94x94 | 49,46 (centre) | hit 12@12 once | Star-burst splash. It builds out of a small core over frames 1-3 (revealed and grown from his picture); **his picture (4)**, held with only churning (5-6); then it slowly empties from the core outward into flying fragments over 6 frames (7-12): the fragments spread, the droplets fly out and fall, the water darkens by his own shades and fades out over the last frames. |
| blast | 203x152 | 104,117 (pool centre) | blast 16@12 once | Geyser from a splash pool with ripple rings. Anticipation over frames 1-4: ripples spread and the column shoots up out of the pool, with the crown growing on top. **His picture (5)**, held with small churning (6-7). Then a long settle (8-16): the crown breaks into falling spray, the column drops back from the top down, the ripples spread and break up, and the last frames fade. A soft teal light (his teal, un-blended) glows round it and fades with it. |
| wall | 278x133 | 140,122 | rise 12@12 once, idle 8@10 | His bank of crashing crests over a thin water base. `rise` surges up from the ground line, fast at first and settling into his picture (the last rise frame = idle frame 0 = his). `idle` churns the water inside its silhouette, the crests lick and the spray bobs. |
| wall_diag | 222x272 | 111,195 | rise 12@12 once, idle 8@10 | His tall slab along the diagonal, with swirling currents and foam on the top edge, plus a soft teal light hugging it. `rise` grows each column up from its own foot, so it climbs along the diagonal footprint. |
| wall_depth | 66x301 | 21,206 | rise 12@12 once, idle 8@10 | His tall narrow column with the foam curls at the top and the ribbon and spirals on its side. It rises from its foot. Same geometry as before: the foot is 86 px below the anchor (the near end). |
| aura | 114x134 | 58,114 (feet) | idle 12@10 | **Front layer: draw OVER the character.** The water the figure is seen through, as in his panel (the owner chose the tint over a clear middle, as for lightning), with his bright streaks crossing the legs and the splash at the feet on top. The veil is a soft field, not our character's silhouette, so it sits right on any figure: an ellipse centred 50 px above the feet, 46 × 110 px, about 42 % in the middle rising to 55 % toward the rim, stepped. Its colour runs from his water tint fitted over the body (`#5591c2`) to his bright water round the figure (`#a0f6ff`) toward the rim. It breathes with the 12 frames (alpha ±10 %, size ±2 %). His own tint fits to about 73 %. |
| aura_back | 114x134 | 58,114 (feet) | idle 12@10 | **Back layer: draw BEHIND the character.** All his rising water sheets, the spray and his blue halo (semi-transparent). The part our character hid in his picture is filled with his own texture, mirrored in from the sides. |
| beast | 128x80 | 64,40 | fly 6@12 | Unchanged copy of `vfx_water/beast.png`. |

All loops start on his picture. The churn is a displacement that runs round a small circle and returns, so frame 0 is exact and the loop closes seamlessly. It moves water colours only inside the water's own silhouette, so the rims stay clean.

## Renderer notes

- **Always place by the manifest anchor.** Several frames are no longer centred, because they were sized to his art.
- **Projectiles** (`bolt`, `sphere`, `slash`, `multi`): `fly` loops facing right. The anchor is the core and does not move inside the frame, so rotating around it does not jitter.
- **`stream`:**
  - Repeat the 64x64 tile along the line with the centre line on its anchor row (y = 32). It tiles seamlessly in every frame, scrolling 8 px a frame (64 px a loop).
  - Place `stream_head` with its left edge touching the last tile. Its anchor (32, 36) is where the next tile's anchor would be: the head is 72 px tall, so its centre line is y = 36, 4 px lower in its own frame than the tile's.
  - Play both on the same frame index; the head's jet continues the tile's scroll.
- **`breath`:** the origin (the caster's mouth or hands) is 48 px left of the anchor on its row, at (6, 39).
- **`hit`, `blast`:** one-shots. The blast's anchor is the centre of his splash pool on the ground. His pool is flatter than the old 164 × 108 px ellipse: about 166 px wide and 40 px deep, its rings spreading to about 183 px wide as they fade.
- **Walls:** play `rise` once, then loop `idle`. The anchor is the wall's centre on the ground, in all three orientations.
  - `wall`: the thin water base sits on the anchor row and splashes about 4 px in front of it.
  - `wall_diag`: his slab's near foot runs from about (-106, +73) to (+105, -44) relative to the anchor. That is the same footprint as before, and the anchor (the footprint's centre) is about 14 px behind the near foot. Mirror it horizontally for the other diagonal; its light has no left/right bias.
  - `wall_depth`: its foot is 86 px below the anchor (the near end), as before.
- **Aura:**
  - Draw `aura_back`, then the character, then `aura`, all at the same anchor (the feet) and on the same frame index.
  - Drawn alone, `aura_back` still reads as the aura (the water mass and the halo).
  - The front layer tints the whole figure (about 42–55 %), as in his panel, so the character is seen through the water.
- **Glows** are semi-transparent pixels in stepped alpha bands (the blast's and the 3/4 wall's teal light, and the aura's halo). They brighten whatever map is under them.

## Checks

- **Border check:** `vfx-water-v3-review.py` checks all 168 frames of the 14 animated sprites, and none has an opaque pixel on its frame border.
  - Exempt: the stream tile (it wraps) and the stream head's left edge (the joint).
  - `beast` is an unchanged copy, and its tail touches its left edge as it always has.
- **No flash:** the review also checks the mean of alpha × brightness frame by frame.
  - The loops change by at most 6.5 % of their brightest frame between neighbours, including the wrap.
  - The hit and blast build up and settle monotonically, with no frame brighter than both of its neighbours. Their biggest step is 27 % of the peak, in the 3- and 4-frame build-ups.
  - The wall rises step by step, about 10 % per frame.
- **Determinism:** two builds are byte-identical, and two extractor runs give the identical refdata.
- **Types:** `npx tsc --noEmit -p . | grep vfx-water-v3` prints nothing.

## Known differences from his picture

- **Aura:** in his panel the figure is tinted about 50–90 % (his tint fits to about 73 %). Ours is a smooth 42–55 % field in his two water colours, the same approach as the lightning aura, rather than his exact per-pixel tint, so it sits right on any figure and pose. The part of the back layer behind the figure is reconstructed (his texture mirrored in), not his pixels. A notch of haze above the head (where his character's hair was) stays clear; the character's head covers it.
- **Teal glow:** in his blast, 3/4 wall and end-on wall panels, the teal light is a spotlight round his character, not round the effect. It was removed with his character.
  - The blast and the 3/4 wall get a soft teal light of their own: his colour, about 16 % and 14 % at peak.
  - The end-on wall gets none, since the brief does not ask for one there and his column has none round it.
- **Multi:** his panel has four blades, not three; his four are kept. His grey trail streaks are kept as see-through haze, without the dark rims they have on his dark panel, so they don't read as heavy lines on a map.
- **Stream:** a tile can repeat only one 64 px period. Ours is the period just before his head, so the line shows that segment repeated instead of his three slightly different segments. His period was about 57 game px; ours is 64.
- **Fine detail:** at 0.92 scale and through his JPEG, his 1 px internal highlights and dark swirl lines are slightly softer and simplified in places, for example the breath's inner swirl and the bubble's inner reflections.
- **Frame sizes:**
  - Frames grew where his art or the animation needs room: the hit and blast throw spray further than his peak frame, and the stream head is 72x72.
  - Some frames shrank a little where his art is smaller than the old frame (wall 278x133, wall_depth anchor x 21).
- **Partial art:** where his art ran into his panel edge (the breath's last droplets, the top of the 3/4 slab), it is kept as cut, with a clean outline.
