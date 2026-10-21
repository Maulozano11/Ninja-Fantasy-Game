# Wind set v3: copied from the owner's paint-over

The wind set rebuilt to match the owner's paint-over of our wind sheet (`REF-wind-set-owner.jpg`) as exactly as possible. The key frame of every sprite is his picture. The other frames are derived from it.

- **Group:** `vfx_wind_v3` in `staging/vfx_wind_v3/`: one PNG per sprite (a row per animation) and `manifest.json`. Every sprite is tagged `vfx`.
- **Files:**
  - `tools/refs/wind-from-ref.py`: cuts his sheet into game-scale key frames and writes `tools/world-sprites/vfx-wind-v3-refdata.ts`.
  - `tools/world-sprites/vfx-wind-v3.ts`: the generator. It derives the animations and writes the group.
  - `tools/refs/wind-v3-review.py`: makes the review sheets below from the built group.
  - `kit.ts` and the other artists' files are not modified.
- **Build:**

  ```bash
  # only when his reference changes:
  python3 -I tools/refs/wind-from-ref.py <art2>/REF-wind-set-owner.jpg tools/world-sprites/vfx-wind-v3-refdata.ts [previewDir]
  WORLD_OUT=<art2>/staging npx tsx tools/world-sprites/vfx-wind-v3.ts
  python3 -I tools/refs/wind-v3-review.py <art2>
  ```

- **Safe writes:**
  - The generator refuses to run without `WORLD_OUT`.
  - The group is built in `<WORLD_OUT>/.vfx_wind_v3.tmp`. Each file is then copied to a `.part` name and renamed into place, PNGs first and `manifest.json` last. The temp folder is removed afterwards.
  - The refdata and every review file are also written whole under a temp name, then renamed.
- **Deterministic:** there is no `Math.random`. Two runs of the extractor give a byte-identical refdata. Two builds give byte-identical PNGs and manifest. Two review runs give byte-identical sheets and GIFs.
- **Checks:**
  - `npx tsc --noEmit -p . | grep vfx-wind-v3` prints nothing.
  - The border check runs at the end of every build: "no pixel on any frame border (stream tiles and the head joint excepted)".
  - The check is stricter than asked: it counts see-through pixels too, not only opaque ones.
  - **Flash check.** Each build prints every frame's mean alpha x brightness, as a % of the animation's brightest frame. It also prints the biggest step between neighbouring frames, and for loops from the last frame back to the first.
    - Loops change by at most 7%.
    - The biggest step anywhere is 28%: the hit's 3-frame build-up (18 45 72 100).
    - There is no single-frame flash.
  - Every sheet row is under 8192 px; the widest is 3516 (`wall` rise). The build stops if one is not.

## Timing (owner request: slower, more frames, no flashes)

Every new in-between comes from his pixels. They are made by turning, scrolling, small travelling waves, growing, revealing, cooling, scattering and fading. His picture stays the key frame:
- frame 1 of every loop;
- frame 4 of `hit`;
- frame 6 of `blast`;
- the last frame of `rise` (= `idle` frame 1).

Each step stays as small as before (1-2 px waves), so the motion is longer and smoother rather than bigger.

| sprite | anims now (was) |
|---|---|
| bolt, stream, stream_head, breath, sphere, slash, multi | fly **8 @ 10 fps** (4 @ 12) |
| hit | hit **12 @ 12** once (6 @ 12) |
| blast | blast **16 @ 12** once (8 @ 12) |
| wall, wall_diag, wall_depth | rise **12 @ 12** once (6 @ 12), idle **8 @ 10** (4 @ 12) |
| aura, aura_back | idle **12 @ 10**, same frame index (6 @ 12) |
| beast | unchanged: fly 6 @ 12 (copied from `vfx_wind`) |

## Review files (in art2)

| file | what |
|---|---|
| `vfx-wind-v3.png` | Every key frame at 2x in his layout and order, labelled with size, anchor and animations. Our character (cropped from `vfx-wind.png`) stands beside the blast and walls, inside the aura between `aura_back` and `aura`. |
| `vfx-wind-v3-compare.png` | His panel, box-resampled to game scale, beside our key frame at the same scale (2x), with anchors aligned. The stream compares his whole jet with two tiles plus the head, placed so the head starts where his head starts. |
| `vfx-wind-v3-anims.png` | Every animation of every sprite as frame strips at 2x. |
| `vfx-wind-v3-blast.gif` | The blast at 2x and 12 fps (16 frames), our character beside it, then a pause. |
| `vfx-wind-v3-walls.gif` | The three walls at 2x: `rise` at 12 fps, then `idle` three times at 10 fps, our character beside each. |

## How his picture becomes the key frame

1. **Scale.** His sheet is our 2x sheet redrawn at 0.544 of its size. So each of his panels is our sprite frame at **S = 1.0875 of his pixels per game pixel**:
   - his bolt panel is 74x70 for our 68x64;
   - his aura panel is 87x141 for our 80x128;
   - his character is 104-105 px tall for our 96 px.

   The inside top-left of each of his panels is our frame's (0, 0), so his art lands on our anchors. Everything is area-averaged (box filter) to game scale.
2. **Clean-up.**
   - His panel fill (#20202a), the sheet background, the panel border lines (where no art covers them), his characters and the labels are removed.
   - The JPEG is smoothed (gaussian 0.6 px) only to decide what is what. The colours come from his unsmoothed pixels, which keeps his contrast.
3. **Opacity.** Composited back over his panel fill, every sprite gives his picture. Each of his pixels is split into what he painted and the fill under it:
   - **Solid (opaque):** his strokes, leaves and dust, with their shading and the dark outline round them.
   - **See-through veils:** soft wind lighter than his fill, such as the breath cone, faint wisps and glows. They use colour-to-alpha (the least alpha that gives his pixel back).
   - **Dark veil:** dark teal fill well away from any stroke, at 72% alpha.
   - **Small gaps:** see-through gaps enclosed by strokes become opaque in the colour they show.
4. **Palette.** Each sprite has its own palette sampled from its own panel, because his panels differ in hue: the bolt is emerald, the breath pale aqua, the walls grey-teal. Each palette has:
   - 31-44 opaque colours, per family (wind, leaves, dust). Each family is refined with k-means in Lab, with his darkest, brightest and most saturated shades pinned so they are not averaged away. Each pixel takes the nearest colour of its own family, so leaves stay yellow-green.
   - 6 see-through colours at 6 alpha steps.
   - 9 alpha steps of his glow green, for the glows.
5. **Outline.** Silhouette edges that are dark become a 1 px outline tinted by what they surround, never black:
   - deep teal (20,38,37) round wind;
   - deep green round leaves;
   - dark grey-brown round dust.

   Bright edges, where his art has no outline, stay as he painted them. Lone dark JPEG specks are dropped.
6. **Pieces.** Each key frame is cut into the parts that move separately:
   - the bolt's swirl;
   - the four cones of `multi`;
   - the blast's funnel, ground spiral and glow;
   - the walls' dust;
   - the stream head's big crescent;
   - loose leaves, one by one. These are leaves floating clear of the strokes; leaves lying on a stroke stay part of it.

## Sprites

Frames are sized to the art of all their frames plus 1 clear pixel all round, and the anchor moves with the art. The table compares each sprite with `vfx_wind`.

| sprite | frame (was) | anchor (was) | anims | his picture / how it moves |
|---|---|---|---|---|
| bolt | 73x62 (68x64) | 42,30 (36,32) | fly 8@10 | **His spiral vortex ball.** The swirl turns a quarter turn counter-clockwise each frame, twice round per loop. That turn is exact, with no resampling. With his five arms, each frame advances them a fifth of their spacing, the way they trail, so it reads as a small, steady spin. The trail streaks ripple and the leaves bob and tumble. The anchor is the vortex eye. |
| beast | 128x100 | 64,50 | fly 6@12 | **Out of scope.** Copied byte for byte from `staging/vfx_wind` (the old crane). The new crane is in `vfx_beasts`. |
| stream | 64x64 (64x64) | 32,32 (32,32) | fly 8@10 | **His braided jet.** The tile is his jet from x 64 to 132 (panel px), the stretch round his second crescent. It is pressed to 64 px (x0.94) so a crescent comes every 64 px. Its last 8 columns are blended into its first 8 (braid rows only), so it wraps. It scrolls 8 px forward each frame. |
| stream_head | 91x66 (64x64) | 32,33 (32,32) | fly 8@10 | **His flaring head:** the big crescent, the head crescent, the spray and leaves. Left of the big crescent it shows the scrolling tile, so it joins the tile in every frame, and the crescent hides the seam. The crescent swells forward 1 px and back, the spray flutters and the leaves bob. |
| breath | 97x69 (96x64) | 48,33 (48,32) | fly 8@10 | **His cone-shaped vortex funnel** of see-through bands, with leaves inside and around it. A wave rolls out along it from the mouth. The origin (mouth) is 48 px left of the anchor, at (0, 33). |
| sphere | 72x65 (64x64) | 37,33 (32,32) | fly 8@10 | **His ball of wind with orbiting rings.** The bands inside the ball churn with a wave rolling down through them. The rings outside the ball hold, and the leaves bob. The anchor is the ball's centre. |
| slash | 64x68 (64x68) | 31,31 (32,32) | fly 8@10 | **His crescent of swept strokes.** The strokes behind the blade ripple along their length. The blade holds. |
| multi | 67x69 (68x64) | 31,33 (32,32) | fly 8@10 | **His small tornado cones.** He drew four, not three: three upright and one on its side. Each cone's bands ripple round it, and each cone bobs 1 px out of step with the others. The trails ripple. |
| hit | 87x96 (72x78) | 40,41 (36,36) | hit 12@12 once | **His X of wind blades with leaves.** See the hit notes below. The anchor is the crossing. |
| blast | 213x156 (176x140) | 113,125 (88,84) | blast 16@12 once | **His tornado over a spiral of wind on the ground,** with leaves and a soft green glow. See the blast notes below. |
| wall | 293x117 (300x120) | 146,109 (150,112) | rise 12@12 once, idle 8@10 | **His bank of thick swirling ribbons over a dust and dirt base,** with a small twister and leaves. See the walls notes below. |
| wall_diag | 226x250 (236x255) | 119,177 (118,179) | rise 12@12 once, idle 8@10 | **The same along the diagonal:** tall sweeping strands with his swirl eddies, dust along the base, leaves and a soft green glow round the wall. For "\\" mirror it horizontally. |
| wall_depth | 86x287 (60x298) | 30,195 (30,200) | rise 12@12 once, idle 8@10 | **His tall rotating tornado column on a dust base.** The base is at the near end of the end-on footprint, as before. The column writhes with a wave climbing it, stronger higher up. |
| aura | 101x124 (80x128) | 51,113 (40,112) | idle 12@10 | **Front layer, drawn over the character.** See the aura notes below. |
| aura_back | 101x124 (new) | 51,113 | idle 12@10 | **Back layer, drawn behind the character:** a soft green glow round the figure that breathes. It has the same frame size and anchor as `aura`, and the frames are in step. |

**hit** (12 frames at 12 fps, 1 s):
- **Build-up (frames 1-3):** it grows from the hit point and fills in (scale 52, 70 and 86%; alpha 72, 86 and 95%). The leaves come out with it.
- **Peak (frames 4-6):** frame 4 is his picture. It holds for 3 frames with only a faint shimmer along one diagonal and a 1.5% swell, while the leaves start out.
- **Dissipation (frames 7-12):** it spreads a little (to 113%), cools toward a deep teal from his palette, scatters in 2x2 clumps and fades (alpha 90 down to 22%). The leaves fly on outward, drop and fade over the last two frames.
- Brightness runs 18 45 72 100 97 98 91 79 64 50 34 19 (% of the peak).

**blast** (16 frames at 12 fps, about 1.3 s):
- **Anticipation (frames 1-3):** the spiral winds up on the ground and spreads (scale 36 to 72%, turning 20° a frame), the glow grows, and the funnel's tip touches down.
- **Growth (frames 4-5):** the funnel builds from its tip up. It is squashed toward the ground, thinner and fainter while young.
- **Peak (frames 6-8):** frame 6 is his picture. It holds for 3 frames while the spiral keeps turning (10° a frame) and the funnel starts to writhe.
- **Settle (frames 9-16):** the funnel writhes, lifts off the ground from the tip up and fades. The spiral scatters and fades, the glow dies, and the leaves are swept round the funnel and rise, fading over the last three frames.
- Brightness runs 3 9 31 55 78 100 98 97 91 84 76 66 55 43 32 21 (% of the peak).
- The anchor is the centre of his ground spiral.

**Walls:**
- `rise` (12 frames at 12 fps) grows the wall up out of its dust over 11 even steps. The dust gathers over the first four frames, and the wall is squashed toward the ground and cut at the height reached so far. Its last frame is `idle` frame 1.
- In `idle` (8 frames at 10 fps), the tops lean with a long wave running along the wall, the dust churns, and the leaves are carried round. The glow breathes 12%.
- The anchor is the wall's centre on the ground.

**aura** (12 frames at 10 fps, `aura` and `aura_back` frame-synced):
- His tall wind ribbons spiral round the figure, a few passing in front of the chest, with leaves.
- A wave climbs the ribbons over the 12 frames, mirrored left and right, and the leaves circle.
- **The veil:** a soft field of his wind colour over the body, so the figure is seen through the wind, as in his picture. The owner chose this for the lightning aura too.
  - It is 30% in the middle and rises to 45% near its rim.
  - It is mid teal inside and mint at the rim, both from his aura palette, in three bands.
  - It is an ellipse round the body (24 x 56 px, centred 49 px above the feet), not a silhouette, so it fits any figure.
  - It breathes 8% over the loop, and the back glow breathes 15%.
- The anchor is the feet.

## Notes for the renderer

- **Place everything by the manifest anchor.** Most frames changed size, and every anchor kept its meaning.
- **Projectiles** (`bolt`, `stream_head`, `breath`, `sphere`, `slash`, `multi`) face right. The core never moves inside the frame.
- **`stream`:**
  - The tile is still 64x64, with the centreline on y = 32. It tiles seamlessly in every frame.
  - `stream_head` (91x66) goes at the far end with its left edge on the last tile. Its anchor (32, 33) is where the next tile's anchor would be: the same line as the tile's (32, 32), because the head frame has one extra row on top.
  - The head reaches 58 px past its anchor, with his two big crescents and spray. Rotate tile and head together.
- **`breath`:** the origin is 48 px left of the anchor on the anchor's row: (0, 33).
- **`hit`:** one-shot, anchored on the hit point. The frame is bigger because his leaves fly out.
- **`blast`:**
  - One-shot, anchored on the ground centre of his spiral.
  - His ground spiral is about 150 x 46 px. That is flatter than the 3 m footprint ellipse of the other sets (164 x 108); it is drawn as he painted it.
  - The funnel rises about 108 px above the ground.
  - The glow is see-through: alpha up to 48% at the middle.
- **Walls:** play `rise` once, then loop `idle`. The anchors are the wall's centre on the ground, with the same meaning as before. `wall_diag` is "/"; mirror it for "\\".
- **`aura`:** draw `aura_back` behind the caster and `aura` over it, both at the feet anchor with the same frame index. `aura` is a one-layer fallback: it holds the ribbons, the leaves and the veil.
- **See-through pixels.** Veils, wisps and glows are semi-transparent, so they pick up the map under them. Strokes, leaves, dust and outlines are opaque, as he painted them.

## Known differences from his picture

- **The stream.**
  - A tile has to repeat, so his three crescents of growing size become one crescent every 64 px. The tile is his middle stretch pressed 6% narrower, with an 8 px blend at the wrap (braid rows only).
  - His thin tail at the start of the jet (his first 64 px) is not used: the renderer has no piece for it.
  - In every frame, the head's braid left of the big crescent (its first 10-20 px) is the scrolling tile, not his braid there, so that it joins the tile.
- **The glows.**
  - His glow in the blast and wall_diag panels is drawn round OUR character standing next to the effect: the character lit by the jutsu. The character was removed, and the glow was re-centred on the effect so it travels with it:
    - **blast:** an ellipse of light on the ground under the spiral;
    - **wall_diag:** a haze along the wall.
  - The glow uses his glow colour and falloff, in 9 alpha steps, so it shows soft bands rather than his smooth JPEG gradient.
- **The aura.**
  - Inside his character's outline, only his ribbons and leaves passing in front are kept. His green-tinted character is replaced by our figure under the veil.
  - What was hidden behind his character is not invented. The ribbons that end at the body read as passing behind it.
- **Colour.** Each palette has 31-44 opaque colours. His smooth JPEG gradients become small clusters, and a few of his brightest yellow-green highlights land on the nearest pale mint.
- **Leaves.**
  - Only leaves floating clear of the strokes move on their own: 0-11 per sprite.
  - Leaves he painted over a stroke move with that stroke.
  - Some of his pale leaves read as mint and stay with the wind.
- **Motion is deliberately small.** His strokes are 2-4 px wide at game scale, and bigger warps tore them. So the waves are long and the moves are 1-2 px, except the bolt's quarter turns and the stream's scroll. The longer loops (8, 12 and 16 frames) make the motion last longer, not move further. The bands of the funnels writhe; they do not truly rotate round their axis.
- **The bolt** keeps quarter turns. They are exact, and with his five arms they read as a forward spin of 18° a frame. Finer true turns would need resampled pixels: 45° steps would look like the arms going backwards, and 9° steps would not loop back to his picture.
- **`multi`** has four cones, as he drew it. The brief said three.
- **Frame sizes** follow his art. For example, the bolt's swirl reaches his panel's right edge, the hit's leaves fly out, and the aura's ribbons run past his panel on both sides. So several frames are bigger or smaller than before; the anchors moved with the art.
