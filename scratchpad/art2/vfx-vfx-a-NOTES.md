# Jutsu VFX, set A: fire, water, wind, lightning

These are the staging sprites for ranged jutsu and abilities. The other elements are in set B.

- **Generator:** `tools/world-sprites/vfx-a.ts`. The element designs are in `vfx-a-fire.ts`, `vfx-a-fire-kit.ts`, `vfx-a-fire-sig.ts`, `vfx-a-fire-s.ts` (the S-rank enhanced annihilation), `vfx-a-fire-dragon.ts`, `vfx-a-water.ts`, `vfx-a-wind.ts` and `vfx-a-lightning.ts`, and the shared helpers in `vfx-a-lib.ts`. `kit.ts` is not modified.
- **Groups:** `vfx_fire`, `vfx_water`, `vfx_wind`, `vfx_lightning` in `staging/vfx_<element>/` (one PNG per sprite plus `manifest.json`). Every sprite is tagged `vfx`.
- **Build:**

  ```bash
  WORLD_OUT=<art2>/staging npx tsx tools/world-sprites/vfx-a.ts <art2>
  ```

  A full build takes about 5 minutes, mostly for the two annihilation sheets. The output is deterministic (no `Math.random`). These environment variables help while iterating:
  - `VFX_ONLY=water,wind` builds only some elements.
  - `VFX_SIG=fireball` builds only some of the fire signature sprites.
  - `VFX_WORK=1` also writes zoomed strips to `vfx-a-work/`.

  Building a subset rewrites that group's manifest with only those sprites, and the walls sheets with only those elements, so always finish with a full build.
- **Safe writes.**
  - The generator refuses to run without `WORLD_OUT`, so it can never write into `src/assets`.
  - Every file is written whole under a temp name and then renamed into place, so a job reading the staging folders or the review images never sees a half-written file.
  - Group sheets go through `vfx-a-tmp/`, which is removed at the end. In each group, the PNGs move in first and `manifest.json` last.
- **Review images:**
  - `vfx-fire.png`, `vfx-water.png`, `vfx-wind.png`, `vfx-lightning.png`: every role's key frame at 2x on a dark background, labeled with its size and animations.
    - The stream is shown tiled 3 times with its head attached.
    - The aura has a character standing in it. The blast and the three walls have a character beside them for scale.
  - `vfx-vfx-a-anims.png`: every animation of every sprite as labeled frame strips at 2x.
  - `vfx-a-walls.png`: each element's wall in its three orientations (horizontal, 3/4 and end-on), idle frame at 2x, with a character beside it and the anchor marked.
  - `vfx-a-walls-anims.png`: every wall's `rise` and `idle`, frame by frame at 2x.
  - `vfx-fire-phoenix-4x.png`: the approved phoenix flap at 4x.
  - `vfx-fire-fireball-compare.png` and `vfx-fire-annihilation-compare.png`: normal and enhanced versions side by side, with a character for scale.
  - `vfx-fire-dragon-head.png`: the dragon head's earlier rounds at 4x (first version, first redo, second redo). The second redo's head is the one the S-rank dragon now wears, enlarged and given Eastern features.
  - `vfx-fire-annihilation-s.png`: the S-rank standard. The owner's reference beside the enhanced annihilation's burn frame at the same scale, then its surge, burn and fade key frames at 2x, and the normal annihilation (with its kanji) at 2x beside them, each with the caster for scale.
  - `vfx-fire-annihilation-s.gif` and `vfx-fire-annihilation-normal.gif`: each annihilation's full play at 1x on a dark background (the 20 surge frames, burn twice, fade; 40 frames at 12 fps), caster included.
  - `vfx-fire-annihilation-surge.png`: every surge frame of both annihilations.
  - `vfx-fire-annihilation-s-v2.png` and `-s-v3.png`: his picture against our burn frame (dragon; the dead gaps under the dragon, before and after the fix).
  - `vfx-fire-v3.png`: the owner's fire sheet with our frames in his panels. `vfx-fire-v3-compare.png`: each of his panels beside our frame at the same scale. `vfx-fire-v3-blast.gif`, `vfx-fire-v3-hit.gif`, `vfx-fire-v3-aura.gif` (each at its own fps).

## How it is drawn

- **Heat fields.** Each effect is painted as a heat field (flame tongues, tapered paths, blobs) and quantized into the element's own 7-color palette with hard band edges:
  - step 0 is a 1 px outline in the palette's darkest color (never black);
  - steps 1-6 run from the dark rim to a near-white core.
- **Layers.** Parts are rendered separately and stacked, so a front part keeps an inner line over the part behind it. On the beasts and the dragon, these inner lines are lighter "seams", so feathers, plates and limbs read without heavy black lines.
- **Particles.** Particles sit on their own layer and get their own outline: embers, droplets, bubbles, leaves, feathers and sparks.
- **Each element has its own forms and particles.** No shape is reused across elements as a recolor.
  - **Fire:** radial heat and licking flame tongues. Particles: embers and smoke.
  - **Water:** lit tubes and balls with a bright line on the lit edge and navy undersides. Particles: foam, droplets, hollow bubbles and faceted ice.
  - **Wind:** see-through strokes that taper at both ends. Particles: white speed streaks, spinning leaves and feathers. Most pixels are semi-transparent.
  - **Lightning:** jagged, forked strokes re-rolled every frame, with a soft blue glow and yellow sparks.
- **Loops are seamless.** Phases wrap after the last frame. Noise is periodic in time, and the stream tiles use noise that repeats every 64 px.
- **Nothing is cut by its frame.** No frame of any sprite has opaque pixels on its border, with two kinds of exception:
  - the `stream` tiles (which wrap by design) and the left edge of `stream_head` (which joins the last tile);
  - the `beast` sprites, which are left exactly as they are (see the deviations below);
  - the enhanced annihilation's breath jet, which roars out of the frame's right edge on purpose (only in the rows of the jet, at the end of `surge` and through `burn`).

  Particles that would land on the border are dropped. Bigger shapes got bigger frames, and every anchor moved with its art, so placement in game is unchanged. Where a frame grew left or up, the noise is still read at the old coordinates, so the art inside the old frame is the same pixel for pixel (checked frame by frame; at most a few edge embers differ). The exceptions are the lightning `blast` and `wall`, which were redrawn as asked.

## Conventions for the renderer

**Always place sprites by the manifest anchor.** Several frames are no longer 64x64 or centred, because they grew to stop their art being cut.

- **Projectiles** (`bolt`, `beast`, `sphere`, `multi`, `slash`, `stream_head`):
  - A `fly` loop at 12 fps, facing right.
  - The anchor is the projectile's core, and the core never moves inside the frame, so rotating around the anchor doesn't jitter.
- **`stream`** is a 64 px tile (64x64) with a `fly` loop (4 frames, 12 fps; fire: 8 frames) whose content scrolls along the line.
  - Repeat it along the line with the centerline on y = 32; it tiles seamlessly left to right in every frame.
  - Place `stream_head` at the far end with its left edge touching the last tile. Its anchor (32, 32) is where the next tile's anchor would be. It is wider than 64 px on the right, for its spray, in water (72) and lightning (74). Its left 20-30 px continue the stream's cross-section.
  - Rotate both together.
- **`breath`**: the origin (the caster's mouth or hands) is 48 px left of the anchor on the anchor's row:
  - water (4, 32);
  - fire (2, 32);
  - wind (0, 32);
  - lightning (10, 56).

  Either put that point on the caster and rotate around it, or use the anchor offset by 48 px along the aim.
- **`hit`**: one-shot of 6 frames (fire: 12), anchored on the hit point.
- **`blast`**: one-shot of 8 frames (fire: 16), anchored on the ground centre of a 3 m circle. The ground ellipse is 164 x 108 px (2/3 as tall as wide); the column of the element rises above it.
  - The lightning strike now comes down from about 3.3 m above the ground: it opens out of a small crack of light high in the frame and ends in the middle of the circle. That frame is 200x286.
- **`aura`**: an `idle` loop of 6 frames anchored at the character's feet. Water, wind and lightning: 80x128, anchor (40, 112), drawn over the character (its middle is open). **Fire:** two layers, 115x160, anchor (55, 139): `aura_back` behind the character and `aura` over it, same frame index.

## Walls in three orientations

Every element has its wall in three orientations, as three sprites with the same animations:
- `rise` plays once (6 frames, 12 fps), then `idle` loops (4 frames, 12 fps); `rise` ends at full height, ready for `idle`. Fire: `rise` 12 frames at 12 fps, `idle` 8 frames at 10 fps.
- The anchor is the wall's centre on the ground in all three.

All three are 4.5 m long and 1.8 m high (`wall`'s own heights are unchanged).

| sprite | what it is | ground line (px from the anchor) |
|---|---|---|
| `wall` | **Horizontal:** across the screen, as before. Its art is unchanged; only its frame grew where the art was cut. | from (-128, 0) to (+128, 0) |
| `wall_diag` | **3/4:** the wall turned 45° on the ground, drawn as "/". For "\" mirror it horizontally; its light is mirror-safe (top-lit, with no left or right bias). | near-left end (-91, +60) to far-right end (+91, -60); every ground point rises 103 px |
| `wall_depth` | **End-on:** running straight into the screen, a solid column 23-36 px thick. | near end (0, +86) to far end (0, -86); every ground point rises 103 px |

- **Re-painted, not squashed.** Each element's own wall was re-painted along the new ground line:
  - **Fire:** the same two rows of flames, standing a little apart across the wall, drawn in depth slices (far first) so nearer flames overlap farther ones, on an ember bed that follows the footprint.
  - **Water:** the sheet now has a body. Its near face carries the rising streaks and the lit crest band; the top is pale and foamed along the crest; the end facing the viewer is darker. Foam churns at the foot on both sides (the far side behind the sheet).
  - **Wind:** the veil becomes a body of moving air. The swirls are rings turning round it, with their far halves behind the veil and near halves in front. The streaks race up its near face, wisps curl off the top, and a dust skirt follows the footprint.
  - **Lightning:** the same fence: five pylons, arcs at three heights and a charged ground line. End-on, the pylons step from side to side so the fence has body.
- **Rise.** Each `rise` spreads along the wall the same way as on the horizontal one: fire catches at the middle and runs out to both ends while it climbs; water, wind and lightning grow over their whole length.
- **Room around the art.** Far parts are drawn first and near parts last. Every frame has room around the art, so nothing touches its border.

Frame sizes and anchors:

| element | `wall` | `wall_diag` | `wall_depth` |
|---|---|---|---|
| fire | 264x128, anchor 132,112 | 233x268, anchor 117,192 | 66x315, anchor 33,215 |
| water | 280x128, anchor 140,120 | 221x266, anchor 110,191 | 46x306, anchor 23,210 |
| wind | 300x120, anchor 150,112 | 236x255, anchor 118,179 | 60x298, anchor 30,200 |
| lightning | 300x128, anchor 150,118 | 229x255, anchor 115,183 | 66x304, anchor 33,206 |

## Sprites

The tables below list, for every element: frame size, anchor, and animations (frames at fps, `once` = one-shot).

### vfx_fire (19 sprites)

**Fire set v3: copied from the owner's paint-over** (`REF-fire-set-owner.jpg`), except the phoenix. Each key frame is his own drawing:
- `art2/vfx-a-extract.py` cuts his panels at game scale (his 237 px character = our 95 px). For each panel it:
  - traces a polygon;
  - keys out the panel background, the night sky and his character;
  - box-resamples;
  - quantizes to a palette sampled from his pixels;
  - cleans to a 1 px dark outline.
- The pieces go into `tools/world-sprites/vfx-a-fire-refdata.ts`.
- `vfx-a-fire-v3.ts` derives the other frames from them (grown, revealed, flickered, cooled into smoke), so the peak frame is his picture.
- **More frames (owner: "too fast, like a flashing star").** Fly loops are 8 frames at 12 fps, and frame 0 is his picture. `hit` is 12 frames: 3 to build, his picture held for 3 (frames 3-5), then 6 to dissipate. `blast` is 16 frames: 4 of anticipation, his picture held for 3 (frames 4-6), then 9 to settle and fade. Walls `rise` in 12 frames at 12 fps and `idle` in 8 at 10 fps. `aura` and `aura_back` `idle` in 12 at 10 fps. Every loop is seamless. The mean alpha x brightness changes smoothly frame to frame: there is no one-frame flash.

The earlier procedural fire sprites stay in `vfx-a-fire.ts` (`FIRE_V2`) for reference but are no longer built.

| sprite | frame | anchor | anims | look |
|---|---|---|---|---|
| bolt | 75x73 | 52,33 | fly 8@12 | His spiralling fireball with a comet tail of licking flames and embers; the tail flickers. |
| beast | 128x104 | 64,52 | fly 6@12 | **Phoenix, unchanged** (the animal artist is redoing it from the owner's own phoenix sheet). |
| stream | 64x64 | 32,32 | fly 8@12 | His jet: a white-hot core line with flame tongues raking back along both edges, made into a seamless 64 px tile that scrolls 8 px a frame. |
| stream_head | 74x64 | 32,32 | fly 8@12 | His jet flaring into a bright ragged mouth; its left part is the scrolling stream. |
| breath | 102x75 | 56,34 | fly 8@12 | His cone of flame with a white-yellow core, wrapped in dark smoke puffs; it churns more toward its far end. The origin (mouth) is 48 px left of the anchor. |
| sphere | 75x73 | 37,33 | fly 8@12 | His burning orb with elliptical rings of fire orbiting it; it pulses and the rings shimmer. |
| slash | 75x76 | 37,38 | fly 8@12 | His thick fire crescent with inner flame strokes and trailing embers. |
| multi | 75x76 | 37,38 | fly 8@12 | His three comet flames in a staggered volley. |
| hit | 96x80 | 45,40 | hit 12@12 once | His starburst of flame spikes round a white core with debris. It grows out of the impact over 3 frames. Frame 3 is his picture, held with a shimmer through frame 5. Then it shrinks back, its spikes thin from the tips, it cools into smoke from the tips inward and sparks fly off. |
| blast | 220x170 | 110,128 | blast 16@12 once | His mushroom cloud: the scorched glowing ground, the ring of fire (far half behind the stem, near half in front), the white-hot stem with its flaring root, his cumulus cap. Frames 0-3: a small dome flares on the ground and climbs the rising stem, the cap blooms and the ring spreads. Frame 4 is his picture, held with small motion to frame 6. Frames 7-15: the cap rises and spreads as it cools into smoke from the top; the stem burns down; the ring burns low; the smoke thins away. |
| wall | 339x161 | 163,133 | rise 12@12 once, idle 8@10 | His wall of tall flame tongues with grey smoke behind, a glowing ember line and scorched ground; `rise` reveals it from the ground up and from the middle out. |
| wall_diag | 285x196 | 146,112 | rise 12@12 once, idle 8@10 | His 3/4 wall over its long strip of glowing scorched ground, with smoke behind. |
| wall_depth | 140x255 | 33,186 | rise 12@12 once, idle 8@10 | His end-on column of flames with smoke curling off the top. |
| aura | 115x160 | 55,139 | idle 12@10 | **Front layer: draw OVER the character.** His flames round the legs and a warm glow that lights the figure. |
| aura_back | 115x160 | 55,139 | idle 12@10 | **Back layer: draw BEHIND the character** (same anchor and frame index as `aura`). His full body of flame rising all round and past the head. |
| fireball | 276x162 | 180,96 | fly 8@12, burst 8@12 once | `fly` is his ball with its big dark smoke trail and debris; `burst` is the approved burst, unchanged. The frame grew to hold both round the shared anchor. |
| fireball_great | 306x284 | 166,160 | fly 8@12, burst 10@12 once | `fly` is his blazing sun with a huge smoke cloud behind it; `burst` is unchanged. |
| annihilation | 800x544 | 12,454 | surge 10@12 once, surge2 10@12 once, burn 6@12, fade 8@12 once | Great Fire Annihilation, 12 m cone (60°), with the giant kanji 火. See below. |
| annihilation_enh | 1016x968 | 12,780 | surge 8, surge2 8, surge3 4 (all @12, once), burn 6@12, fade 8@12 once | **S-rank**, built from the owner's own picture: 15 m cone (80°), his dragon, his fire wall, his smoke, the kanji. See below. |

### vfx_water (14 sprites)

Palette: navy, deep blue, deep teal, cyan, light cyan, pale aqua, white. Foam uses the light end; ice uses a colder ramp.

| sprite | frame | anchor | anims | look |
|---|---|---|---|---|
| bolt | 68x64 | 36,32 | fly 4@12 | Water bullet: a lit ball 23 px across with a glint, a tapering wake with a white twist line, spray crescents drifting back, falling droplets. |
| beast | 128x80 | 64,40 | fly 6@12 | Serpentine water dragon. **Left as is:** another artist is redrawing it in `vfx_beasts`. |
| stream | 64x64 | 32,32 | fly 4@12 | Tileable torrent: a lit top edge with broken highlights, a navy underside, flow streaks, curling foam caps, bubbles and spray. |
| stream_head | 72x64 | 32,32 | fly 4@12 | The torrent swelling into a frothing front that bursts into droplets. |
| breath | 100x64 | 52,32 | fly 4@12 | High-pressure spray fan: seven lit jets from a white core at the mouth, foam where they break, then long droplets flying on. |
| sphere | 64x64 | 32,32 | fly 4@12 | Water bomb: a whirlpool spiral inside, a specular crescent, rising bubbles, droplets orbiting on a tilted ring. |
| slash | 64x68 | 32,36 | fly 4@12 | A curling crest wave climbing into a lip, with a lumpy foam band on the leading edge and spray. |
| multi | 68x64 | 32,32 | fly 4@12 | Ice shards (the cold side): four faceted crystals with a moving glint, frost trails and sparkles. |
| hit | 72x72 | 36,36 | hit 6@12 once | A splash: a flash, curved petals of water bursting out, then breaking into droplets, a ring and bubbles. |
| blast | 176x150 | 88,88 | blast 8@12 once | A geyser: ripples racing over the ellipse (the leading one breaks into foam), a jet column with a foam crown, falling droplets, splash crowns and a puddle. |
| wall | 280x128 | 140,120 | rise 6@12 once, idle 4@12 | A standing sheet of water: streaks rising, a lit band and rolling foam along a wavy crest, curling lips, churning foam at the base. |
| wall_diag | 221x266 | 110,191 | rise 6@12 once, idle 4@12 | The water wall at 3/4. |
| wall_depth | 46x306 | 23,210 | rise 6@12 once, idle 4@12 | The water wall end-on. |
| aura | 80x128 | 40,112 | idle 6@12 | A see-through water sheath: bright streaks wind up it like a helix, foam rides the wave crests on its edge, with a spout over the head, a whirlpool at the feet, droplets and bubbles. |

### vfx_wind (14 sprites)

Palette: deep green-teal, sage, mint, pale mint, white-green, white. Most of it is semi-transparent; leaves use their own greens.

| sprite | frame | anchor | anims | look |
|---|---|---|---|---|
| bolt | 68x64 | 36,32 | fly 4@12 | A spinning vortex disc (3 arms, a white eye), a pressure ring, gust trails, a leaf and white speed streaks. |
| beast | 128x100 | 64,50 | fly 6@12 | A crane of wind. **Left as is:** another artist is redrawing it in `vfx_beasts`. |
| stream | 64x64 | 32,32 | fly 4@12 | Tileable line of crescent air blades and dashed gust strokes. |
| stream_head | 64x64 | 32,32 | fly 4@12 | A big crescent pressure front with curls at its tips and streaks. |
| breath | 96x64 | 48,32 | fly 4@12 | A gust cone: pressure arcs rolling out from the mouth, streamlines and tumbling leaves. |
| sphere | 64x64 | 32,32 | fly 4@12 | Compressed air ball: a see-through shell, orbit strokes at three tilts (behind and in front), a white core, leaves orbiting. |
| slash | 64x68 | 32,32 | fly 4@12 | **The star of the set:** twin crescent air blades with white leading edges fading to see-through, plus speed streaks. |
| multi | 68x64 | 32,32 | fly 4@12 | Four spinning leaf blades in a staggered fan, each with a curling wind trail. |
| hit | 72x78 | 36,36 | hit 6@12 once | Crossing cuts (an X, then a third cut), an expanding pressure ring, leaves bursting out. |
| blast | 176x140 | 88,84 | blast 8@12 once | A tornado: a funnel of stacked turning strokes rising from the ground center, a dust swirl and puffs on the ellipse, leaves and pebbles orbiting. |
| wall | 300x120 | 150,112 | rise 6@12 once, idle 4@12 | A wall of turning air: a faint veil, rows of swirling arcs climbing, slanted streaks, wisps curling off the top, a dust skirt and leaves carried up. |
| wall_diag | 236x255 | 118,179 | rise 6@12 once, idle 4@12 | The wind wall at 3/4. |
| wall_depth | 60x298 | 30,200 | rise 6@12 once, idle 4@12 | The wind wall end-on. |
| aura | 80x128 | 40,112 | idle 6@12 | Strokes climbing the sides, rings of wind wrapping round (only their ends show beside the body), a faint veil, leaves and streaks, a swirl over the head, gust rings at the feet. |

### vfx_lightning (14 sprites)

Palette: indigo, royal blue, electric blue, sky blue, light blue, blue-white, white. Sparks are yellow.

Bolts are drawn chunky, matching the fire set: a white core stepping out through each blue to the indigo edge, with a soft glow. The hound keeps its original thinner strokes.

| sprite | frame | anchor | anims | look |
|---|---|---|---|---|
| bolt | 74x64 | 38,32 | fly 4@12 | A crackling spark ball: short arcs out of it, a zigzag tail with forks, yellow sparks; the bolts re-roll every frame. |
| beast | 128x80 | 64,40 | fly 6@12 | A thunder hound. **Left as is:** another artist is redrawing it in `vfx_beasts`. |
| stream | 64x64 | 32,32 | fly 4@12 | Tileable beam: a white-hot core with jagged arcs coiling round it (they repeat every 64 px), sparks. |
| stream_head | 74x64 | 32,32 | fly 4@12 | A discharge ball at the beam's end with forks spraying forward. |
| breath | 106x112 | 58,56 | fly 4@12 | A cone of five forked bolts fanned from the hands; the frame is tall enough for the outer forks. |
| sphere | 76x76 | 38,38 | fly 4@12 | Thunder sphere: a dark plasma globe with filaments from the core to the shell and arcs jumping off it. |
| slash | 64x72 | 32,36 | fly 4@12 | An electric crescent with a jagged edge and a thinner after-image arc behind it, a white zigzag running along it, forks at the tips. |
| multi | 72x64 | 32,32 | fly 4@12 | Thunder needles: four arrowheads of charge in a staggered fan, each with a crackling trail. |
| hit | 76x76 | 38,38 | hit 6@12 once | A jagged spark burst: a flash, a jagged star, forks, then thin forks and sparks. |
| blast | 200x286 | 100,218 | blast 8@12 once | A thunder strike from about 3.3 m up: a leader opening out of a crack of light, then a thick bolt to the ground center, a flash pool, arcs racing out to the ellipse and crawling along its rim, rocks, sparks and a scorch. |
| wall | 300x128 | 150,118 | rise 6@12 once, idle 4@12 | Lightning fence: five pylons with charge balls on top, jagged arcs between them at three heights, a charged ground line. The pylons hold their shape from frame to frame (only their crackle and the arcs re-roll). In `rise`, the pylons grow first and then the arcs connect. |
| wall_diag | 229x255 | 115,183 | rise 6@12 once, idle 4@12 | The fence at 3/4. |
| wall_depth | 66x304 | 33,206 | rise 6@12 once, idle 4@12 | The fence end-on. |
| aura | 80x128 | 40,112 | idle 6@12 | A faint charged sheath, bolts crawling up both sides with forks reaching out, an arc over the head, chirping bursts, sparks and a static ring at the feet. |

## Fire signature jutsu (normal and enhanced)

The renderer picks the `_great` / `_enh` sprite when the jutsu event carries `enhanced`.

**`fireball` / `fireball_great` (Great Fireball).**
- **One anchor for both anims:** the ball's centre while flying, and the ground centre of the burst. Swap `fly` for `burst` at the impact point and keep the anchor there.
- **Edge fixes only.** Both frames grew so the smoke tail, the rising fireball and the burst's edges are no longer cut, with the anchors moved to match. Inside the old frames the art is unchanged.
- **`fireball`** (192x158, anchor 96,96):
  - `fly`: a rolling ball 46 px across with a churning surface (the bands turn with it), a corona of short tongues, a fire tail, a light smoke trail and embers.
  - `burst` (8 frames) fills the 1.5 m circle (ground ellipse 172 x 114 px): a flash, a ring of tall flames racing out to the edge, the fireball rising through the middle and cooling into smoke, then patches of fire dying down on a scorch.
- **`fireball_great`** (300x264, anchor 160,160):
  - `fly`: the ball is twice the size (88 px), with a white-hot core, a longer and denser corona, a pale wavy heat-shimmer ring, a heavier smoke tail and twice the embers.
  - `burst` (10 frames) fills the 2.25 m circle (256 x 172 px), with a shock ring racing over the ground, a darker scorched ellipse, more debris and a bigger fireball.

**`annihilation` / `annihilation_enh` (Great Fire Annihilation).**
- **Right-facing.** Both sprites are pre-assembled and face right. The anchor is the caster's feet, at the cone's apex on the ground; the cone's axis runs right along the anchor's row.
- **Playing it** (both):
  1. Draw the sprite at the caster anchor, mirrored for casts to the left.
  2. Play the surge rows once, **in order**: `surge`, `surge2` (and `surge3` on the enhanced one). The surge is 20 frames (1.7 s) at the owner's request. A sheet row may be at most 8192 px wide, so it is split into rows of 8 (enhanced, 1016 px frames) or 10 (normal, 800 px frames).
  3. Loop `burn`. Its frame 0 follows the last surge frame seamlessly.
  4. Play `fade` once (8 frames; it starts slowly, so the fire dies down over the whole fade instead of losing half its light in one frame). Its last frame is almost empty.
- **Surge (both):**
  - It ignites at the caster's hands: a small lick of flame, sparks and a puff of smoke.
  - The fire rolls out along the cone a little more each frame, reaching full length by frame 15; its front is ragged and burning, and the flames behind it keep rising as it moves on.
  - The smoke starts thin at the caster and billows up and out.
  - The 火 lights up stroke by stroke in the second half, in writing order, a bright brush head leading each stroke.
- **`annihilation`** (800x544): the procedural wave (12 m, 60°) with its breaking crest and the giant 火 above it (no dragon); the fire burns down from the caster outward in `fade`.
- **`annihilation_enh`** (1016x968): **the owner's own picture.**
  - **Pieces.** It is built from his pixels (`REF-s-tier-fire-annihilation.jpg`, placed 1.08x so his caster matches ours):
    - his fire wall as one opaque mass (only the night sky keyed out; where his dragon passed in front of it, the fire is filled in from the same row);
    - his dragon (the flame-tipped tail, the hump, the neck with the head, the claw);
    - his breath, his warm brown-grey smoke, and his dark backdrop between the flames and the dragon.
  - **Surge.** Each dragon part rises up out of the flames as the wall grows under it: the tail and the hump first, then the neck and head, then the claw. It breathes in the last frames.
  - **Burn.** His picture, alive: his flames flicker, the dragon's parts bob 1 px, the tail flame flickers, the breath churns and throws sparks, and the smoke churns.
  - **Fade.**
    - The wall sinks into its glowing bed, everywhere and in a long sweep from the caster outward, with no wipe edge, and its far end slopes down. The bed breaks into embers where the flames have gone.
    - The dragon sinks with the wall, so night never opens under it, and it burns out as fire dies: it darkens to embers, thins from its edges and cools into smoke from the top.
    - The 火 thins, darkens and drifts up into smoke.
    - The smoke clears along its diagonal.
  - **Breath.** The jet roars out of the frame's right edge on purpose; it is the only thing that touches a border.
  - **Rendering.** The full fire ramp, dark-red outlines and his colours throughout.
- **Texture size.** One row per animation, at most 8 x 1016 = 8128 px wide.

## Deviations from the brief (owner feedback during the work)

- **Beasts.**
  - The fire phoenix was reworked at the owner's request (128x104, 6-frame flap). The owner approved it, and it is byte-for-byte unchanged since. It has a single ember pixel on the top row of `fly` frame 1. It was left there so the approved sheet doesn't change; dropping it is a one-line change.
  - The water dragon (128x80), wind crane (128x100) and thunder hound (128x80) were raised to the same standard. The owner then moved them to another artist (`vfx_beasts`), so they are left exactly as they were then. That is why their trailing tails still touch the frame's left edge.
- **Signature sprites.** The four fire sprites (`fireball`, `fireball_great`, `annihilation`, `annihilation_enh`) were added on request.
  - The dragon head was redone twice on owner feedback.
  - `annihilation_enh` was then rebuilt to the owner's S-rank reference, which sets the bar for ultimate S-tier jutsu. Its cone is now 80° wide (the game rule).
  - The normal `annihilation` gained the giant kanji (no dragon), on the owner's request.
- **Walls.** `wall_diag` and `wall_depth` were added on request, for every element.
- **Auras.** The owner approved the auras' approach. The fire aura is unchanged, and the other three were built to the same silhouette scheme.
- **Frame sizes.** Projectiles started at 64x64 (`breath` 96x64). Several grew a few pixels in the edge fixes, so their art isn't cut. The beasts, blasts, walls and signature sprites are larger, as listed.

## Still looks off / ideas for a next pass

- **Fire:**
  - The generic `blast` column reads a little like a keyhole at its peak.
  - The `stream` tongues repeat every 21 px, so a long beam looks a bit regular.
  - The S-rank smoke is mostly cool grey; the reference's is a warmer brown-grey throughout.
  - The S-rank dragon is a little slimmer than the reference's, which fills more of the wall.
- **Water:**
  - The `blast` ripples are still fairly graphic (clean rings).
  - The `stream`'s foam caps repeat every 32 px.
  - End-on, the `wall_depth` reads as a foamy pillar.
- **Wind:**
  - The `wall`'s swirling arcs read busy at 1x.
  - End-on, the rings stack like a chain.
  - The see-through parts (the `sphere` shell, the wall veils) depend on the background behind them.
- **Lightning:**
  - Every bolt re-rolls each frame, which flickers by design; at 12 fps this may be too busy for some players.
  - With the chunkier strokes, the `breath` and walls are very bright masses of white; they may need toning down next to other effects.
- **All:** projectiles use 4-frame loops as briefed; the beasts and auras use 6.
