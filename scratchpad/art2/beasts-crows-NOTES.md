# Crow swarm (genjutsu beast), copied from the owner's genjutsu sheet

The source is his paint-over, `docs/reference/genjutsu-set-owner-reference.jpg` (the same file as `REF-genjutsu-set-owner.jpg` here). Under "BEAST (CROW, APPROVED, IN GAME)" he replaced our single crow with a swarm in two pictures:
- **Left:** crows with red eyes circle a dark violet vortex.
- **Right:** the flock streams right, with black smoke and feathers trailing.

Both pictures are copied pixel for pixel at game scale as the new genjutsu beast.

This is fix pass 5. It answers review r3; the changes are listed at the end.

## Sprite

| | |
|---|---|
| Group / sprite | `vfx_beasts_crows` / `genjutsu`. Staged for approval; it becomes `vfx_beasts/genjutsu` after the merge |
| Frame | **212 x 167** (3.7 x 2.9 m at 57 px/m). The old crow was 144 x 121. The size follows his swarm at game scale, plus the room the in-between frames move in |
| Anchor | **[116, 82]**: the centre of the swarm's mass. It is the same point in both of his pictures |
| `fly` | 6 frames, 12 fps, loop. The frame count is unchanged, because beasts keep theirs. **Frame 0 is his left picture and frame 4 his right picture** (FRAMES 0 and 4 in our kit) |
| `summon` | 6 frames, 12 fps, plays once. **Our proposal, not in his sheet**: his label lists only FLY. It plays at the caster before the swarm flies and ends on his left picture (the same as fly 0). Not wired up yet |
| Facing | Right. The renderer mirrors it when the swarm flies left |
| Colours | 122 in all: 101 opaque and 21 translucent. Alpha is 0, 170 or 255, and alpha 170 appears only on the swarm's outer edge |

| Anim | Frames | fps | Loop | Length |
|---|---|---|---|---|
| fly | 6 | 12 | yes | 0.5 s per loop |
| summon | 6 | 12 | no | 0.5 s |

## How his pictures became frames (`tools/refs/crows-from-ref.py`)

- **Scale.** His character measures 124, 124, 120 and 132 px beside the blast and the walls (median 124 px). Ours is 96 px, from `characterRef()`. The scale is **0.774**.
- **Crop.** His BEAST panel, inside its border. The left picture is sheet x 262-522, y 798-1009; the right picture is x 522-785. His labels, the border and the panel background (31,31,41) are removed.
- **Layers, all in his pixels:**
  - **Crows.** Each crow (4 on the left, 6 on the right) is cut along a hand-traced outline. Where crows overlap, the later one is in front.
  - **Feathers and wisps.** Small loose pieces.
  - **Veil.** The vortex and the smoke, un-mixed from his background into colour plus alpha.
- **To game scale.** Each layer is averaged down with a true **box (area) filter** (PIL `BOX`), so each game pixel is the mean of the 1.29 x 1.29 sheet pixels under it. Both pictures share one grid, with each picture's centre of mass on the anchor: sheet (384.7, 905.5) for the left one and (665.2, 902.6) for the right one.
- **Palette.** It is sampled from his pixels at game scale, in brightness bands, so his few light colours keep entries of their own. Inside each band it is also sampled separately in **tiers of chroma** (max minus min channel; on his crows that is blue minus green), so his blue-violet (indigo) sheen has colours of its own instead of being averaged into the grey-violets:
  - Crows and feathers, 59 colours:
    - chroma under 25: 12 / 6 / 4 / 3 / 3 for luma < 60, 60-85, 85-98, 98-112 and 112+;
    - chroma 25-32: 3 / 2 / 2 / 2 / 1 for luma < 45, 45-60, 60-75, 75-95, 95+;
    - chroma 32-40: 2 / 2 / 2 / 2 / 2 / 1 for luma < 30, 30-45, 45-60, 60-70, 70-85, 85+;
    - chroma 40 and up: 2 / 2 / 2 / 2 / 2 for luma < 40, 40-55, 55-70, 70-85, 85+.
    - The brightest is (139,134,155). His indigo mid-tones such as (81,64,119) and (114,96,154) now snap to indigo entries, not grey-mauve ones.
  - Veil (vortex and smoke), 38 colours: chroma under 25 (3 / 2 / 1), 25-35 (1 / 1 / 1 / 1), 35-45 (1 / 1 / 1 / 1 / 1) and 45 up (2 / 2 / 5 / 7 / 3 / 4), each over its own luma bands. Its brightest magenta is (136,107,164).
  - The snap to the palette is the RGB distance plus 2x the squared brightness difference (`SNAP_W`; it was 8x). Brightness still weighs a little more than hue, so his glints stay glints, and his sheen keeps its hue.
- **Highlights and sheen against his picture.** "His" here is a plain box downscale of his JPEG on our anchor, inside his picture box. Rec. 601 luma, eyes left out; ours laid on his background for the chroma. The build fails if the counts above luma 90 or 100, or above chroma 30 or 40, are more than 20 % off his.

  | | his left | fly 0 | his right | fly 4 |
  |---|---|---|---|---|
  | px above luma 90 | 127 | 146 | 104 | 108 |
  | px above luma 100 | 56 | 64 | 45 | 50 |
  | px above luma 110 | 24 | 24 | 16 | 16 |
  | brightest pixel | 147 | 138 | 131 | 126 |
  | px above chroma 30 | 4403 | 4258 | 1114 | 1025 |
  | px above chroma 40 | 2019 | 1697 | 271 | 254 |

  Measured independently the reviewer's way (his panel box-downscaled at 96/124 and pasted at the best-matching offset, eyes included): chroma above 30, his 4450 / ours 4328 (left) and 1177 / 1130 (right); above 40, 2020 / 1756 and 285 / 328. Before this pass ours were 3412, 1282, 513 and 124. Mean colour error per channel: 3.15 (left, was 3.34) and 2.05 (right, was 2.09).

- **Outline.** Dark crow and feather edges on open air get a 1 px outline in **(17,13,30)**. That colour is the median of his own dark crow edges. Lit edges keep his colour.
- **Eyes.** The same round stamp on every crow, centred on the traced eye, in his hue and at his level:
  - a 4 x 4 dark crimson ring, (85,25,55);
  - round a 2 x 2 dim mauve core, (150,95,125) on top and (120,55,88) below.

  His brightest eye pixels at sheet scale are about (146,99,117) to (156,109,143). Our brightest eye pixel is luma 115-116, under his brightest at game scale (123 left, 135 right), and the build fails if an eye of ours is brighter than his. Plain eyes, as he painted them, with no pattern added.
- **Solid inside, soft only at the edge.**
  1. Gaps shut in by the swarm are closed. In his pictures they get his own pixel there; in the frames we make, the pixels round the gap.
  2. Only then is the open air worked out: the clear pixels that reach the frame's edge.
  3. Every soft (alpha 170) pixel more than 2 px from that open air is made solid, in the colour it shows on his background (in his pictures, his own pixel).

  So the ground never shows through his dark smoke, between his crows or at the vortex's eye.

## The in-betweens

Everything is built from his pixels. Nothing is redrawn.

- **Crows as pieces.**
  - Each crow is lifted off his picture at sheet scale, with its enclosed holes closed from its own pixels. It is then shrunk and snapped like the key frames.
  - It moves by whole pixels, and is mirrored about its eye to turn round. L1 and L4 (who look left in his picture) turn round in fly 1, as they set off to the right, so no crow flies backwards.
  - Where his vortex's purple showed between its feathers, that gap stays see-through when the crow flies over the vortex or another crow, and is solid over open ground.
  - One-pixel hairs and crumbs under 10 px are left out.
  - L2 sits on L3's raised wing, so its belly under the head was cut along that wing. That cut edge (a drip under the throat) is trimmed off L2 when it is lifted.
  - L4's outline stops at the lower edge of its raised near wing. The dark round eye of the vortex under that wing, and the violet ring round it, belong to the vortex, so they stay with it instead of flying off with L4.
- **Whole crows away from the flock.** Two of his flock crows are partly hidden in his right picture: R2 is a wing and a head, and R5 is a body cut by R6's wing. Away from the flock, the whole crow from his left picture flies their place: L2 and L4 in frame 3, and the left crows again from frame 5 on.
- **Wing beats.** His pictures are the 'up' pose.
  - The near wing turns about a traced shoulder joint by **30 degrees ('mid') or 60 degrees ('down')**, nearest neighbour at sheet scale, drawn in front of the body.
  - The far wing goes down behind the body, so it is mostly hidden by it. At 'mid' it sinks toward its shoulder by 45 % of its length, along its own line; only what is still above the shoulder line shows, which is his wing tip over the back. At 'down' it is hidden. It is never turned, so it can't stand up as a blade behind the head (L2's) or stick out past the beak like a lance (L1's).
  - There are two flights. A goes up, mid, down, mid, up, down; B goes up, down, mid, up, up, mid.
- **Out (frames 0 to 4).**
  - L1 becomes R1, L2 becomes R2, L3 becomes R6 and L4 becomes R5.
  - Frames 1-3 are at 25, 50 and 75 % of the way, bowed 8 degrees round the swarm's centre.
  - R4 comes out of the vortex's rim in frame 2, still partly behind it. R3 is behind the vortex in frame 2 and in the flock from frame 3.
- **Back (frame 5).** The flock curls back round the reopening vortex:
  - R1 swoops back to L1's place: it turns round and flies as L1, half way there.
  - R2, R4 and R5 head half way back to L2's, L3's and L4's places, as those crows.
  - R6 sinks 6 px toward the vortex's eye, tucked behind its swirl and darkened 30 %. About a fifth of it still shows, and it is gone into the vortex by frame 0.
  - R3, a sliver of a head, sinks 10 px behind the vortex and the returning L3.
- **No crow pops.** A crow comes into or goes out of sight (5 % of it showing) only from behind something. In one of the two frames it is drawn at least 40 % hidden, with at least 10 % of it behind the vortex itself. The build fails otherwise.

  | Step | Crow | How much shows | Behind the vortex |
  |---|---|---|---|
  | fly 1 to 2 | R4 comes into sight | 0 to 14 % | 55 % in fly 2 |
  | fly 2 to 3 | R3 comes into sight | 0 to 72 % | 88 % in fly 2 |
  | fly 4 to 5 | R3 goes out of sight | 100 to 0 % | 38 % in fly 5 |
  | fly 5 to 0 | R6 goes out of sight | 14 to 0 % | 58 % in fly 5 |

- **Crow travel per frame (game px).** The limit is 25, and 32 for R1's swoop.

  | Step | 0-1 | 1-2 | 2-3 | 3-4 | 4-5 | 5-0 |
  |---|---|---|---|---|---|---|
  | Furthest move | 18.0 | 16.2 | 14.9 | 21.9 | 22.9 (R1's swoop: 31.2) | 22.2 (L1's swoop: 31.6) |

  The swoop has to be long: L1's place in his left picture is 63 px from R1's place in his flock, and every other crow is further away. The loop has two frames to cover it.
- **Vortex.**
  - **Unwrapping.** His vortex is unwrapped into polar space about its eye (radius 104 sheet px, 0.5 px by 0.25 degrees). The sampling is nearest neighbour both ways, so unturned it gives his pixels back, and turned it moves them without blurring his stripes.
  - **Hidden parts.** What his crows hid is filled with **his own vortex turned rigidly about its eye** (at sheet scale, nearest neighbour). A spiral turned is still the same spiral, so his arms run on through the filled part instead of stacking up as rings.
    - What is filled: the crows' and feathers' cut-outs, the whole outline of each crow (the gaps between its feathers, where his vortex shows in pieces shaped like the crow) and a 2 px fringe round them (their dark halo). So no ghost of a crow stays in the vortex when the crows fly off.
    - For each hidden part, the turn (24 to 180 degrees either way, in 2-degree steps) is the one whose pixels best match his own all round its edge, so his stripes meet at the seam, among the turns that fill most of it with pixels he painted. What that turn can't fill (its source is hidden too) takes the next best turn, up to six times.
    - Only what no turn reaches would take the median of its ring. In this build every hidden pixel (14633 at sheet scale) is filled by a turn.
  - **Spin and size.** It spins by shifting the angle and closes by scaling the radius. Small loose scratches (under 25 px) that a spin turns out over open ground are dropped.
    - fly: his picture (f0); f1 0.95 size, +15 degrees; f2 0.85, +30; f3 0.72, +45, dimmed; none in f4 (his flock); f5 0.88, -30 (reopening). So the reopening splits over two steps in what shows: 0, then 3878 px, then 5891.
    - summon: 0.6, 0.7, 0.82, 0.92, 1.0, then his picture.
  - **His faint glow streak.** Right of L3 he has a faint violet streak barely above his panel's colour. Un-mixed as a glow of the vortex's own lit violet it is under half strength, so it is left out: on any ground but his panel it would read as an opaque violet bar. The rule: loose strips of such faint glow outside the vortex's outer ring, 4 px wide or less, on open air (the fringe hugging a lit stripe or feather stays), and the one-pixel hairs left along them.
  - **No flash.** Its lit violet (blue minus green above 45) and bright violet (above 70) cover about the same share of what shows of it as in his picture. The build fails if fly 1, 2 or 5 is more than 30 % off fly 0.

    | | fly 0 | fly 1 | fly 2 | fly 3 | fly 4 | fly 5 |
    |---|---|---|---|---|---|---|
    | vortex px showing | 5891 | 5949 | 4207 | 1513 | 0 | 3878 |
    | violet | 1384 | 1069 | 795 | 248 | 0 | 756 |
    | bright violet | 400 | 333 | 213 | 78 | 0 | 236 |

- **Smoke.** His smoke wisps, biggest first and each kept whole:
  - 70 % of it trails in behind the flock in frame 3;
  - in frame 5, the wisps behind the anchor drift 8 px back and stay.
- **Feathers.** His feathers ride round the vortex and drift back. In the frames we make, these are left out:
  - loose black scratches of wisp under 25 px;
  - a feather or wisp partly tucked behind a crow when it would show only a sliver, or sits at the crow's head. That was the dark hook under L2's beak in fly 1 and 5: one of his black wisps (Lf12), tucked behind L2's head, showing as a 1 px curl under the beak. L2's own beak is his, curling down 2-3 px.
- **Mass and light** (the build fails above 1.25x mass, 1.5x light or 20 % mean luma from one frame to the next, the wrap included):

  | | f0 | f1 | f2 | f3 | f4 | f5 |
  |---|---|---|---|---|---|---|
  | Opaque px | 14819 | 13431 | 11112 | 9847 | 10175 | 12050 |
  | Light (alpha x luma, thousands) | 418.2 | 372.1 | 313.1 | 260.0 | 239.6 | 323.5 |
  | Mean luma | 28.2 | 27.7 | 28.2 | 26.4 | 23.5 | 26.8 |

  Mean alpha x brightness over the whole frame, measured on the staged sheet: 11.40, 10.14, 8.55, 7.12, 6.57, 8.83. The largest step is 1.34x (fly 4 to 5, where the vortex reopens). No frame is a flash.

- **Summon (our proposal).**
  - The vortex opens at 0.6 size and grows a step each frame, spinning.
  - The crows come out of it **head first**, each on its own side: the right-facing L3 and L2 from its right half in frame 1, and the left-facing L4 and L1 from its left half in frame 2. Their beaks and red eyes come past the rim while their bodies are still behind its swirl, darkened 30 %.
  - Then they rise round it, wings mid and up. Frame 5 is his left picture.
  - Mass: 3730, 6182, 9832, 11983, 14160, 14819 (at most 1.66x a step). Mean luma: 22.6, 24.3, 25.5, 26.6, 27.2, 28.2.

## Rebuild

```sh
# 1. His JPEG -> palette + RLE frame data. Exits 1 if any check fails. The 3rd argument (a debug dir) is optional
python3 -I tools/refs/crows-from-ref.py docs/reference/genjutsu-set-owner-reference.jpg \
  tools/world-sprites/vfx-beasts-ref-genjutsu.ts <scratchpad>/art2/crows-ref
# 2. The group vfx_beasts_crows. Refuses to run without WORLD_OUT; each file is written whole
WORLD_OUT=<scratchpad>/art2/staging npx tsx tools/world-sprites/vfx-beast-crows.ts
# 3. This review sheet and the GIFs (reads staging/ and crows-ref/)
python3 -I <scratchpad>/art2/beasts-crows.py
```

With `CROWS_DEV=1`, the converter keeps going past a failed check (it still prints it), so the debug images can be looked at. It is never used for the real build.

## Merge into vfx-beasts.ts

```ts
import { crowSwarm } from './vfx-beast-crows';
// in BUILDERS:
['genjutsu', crowSwarm],   // replaces ['genjutsu', illusionCrow]
```

`crowSwarm()` returns the whole `WorldSprite`: the name `genjutsu`, `fly` and `summon` cropped to their union plus 1 px, and the anchor. Importing it does not run the standalone `main()`.

After the merge, `illusionCrow`, `CROW_FLAP` and `crowFeather` can be deleted from vfx-beasts.ts if nothing else uses them. The renderer (`vfxSprites.ts`) already plays `fly` and mirrors it for leftward flights, so only `summon` needs new wiring.

## Checks (this build)

- **The converter's own checks**, on all 12 frames of the work canvas:
  - no opaque pixel on the edge;
  - 0 enclosed transparent pixels (limit 20);
  - 0 specks of 3 px or less;
  - **0 translucent pixels more than 2 px inside the swarm**;
  - no loose bit of crow under 150 px;
  - no crow coming into or going out of sight without going behind the vortex;
  - fly mass within 0.80-1.25x from frame to frame, the wrap included;
  - fly light within 0.67-1.5x, and mean luma within 20 %, from frame to frame (summon: mean luma only);
  - the vortex's violet and bright violet shares in fly 1, 2 and 5 within 30 % of fly 0;
  - the highlight counts (luma above 90 and 100) and **the sheen counts (chroma above 30 and 40)** on fly 0 and 4 within 20 % of his picture;
  - **no eye pixel brighter than his brightest eye**;
  - crow travel at most 25 px a frame (32 for R1's swoop).
- **Border check** over all 12 frames of the staged sheet: 0 opaque pixels on any frame border. The staged PNG frames equal the data module, decoded independently.
- **Typecheck.** `npx tsc --noEmit -p .` prints nothing.
- **Determinism.** There is no randomness:
  - three converter runs give a byte-identical `vfx-beasts-ref-genjutsu.ts` (sha256 6fedfd75...285a);
  - two generator runs give a byte-identical `genjutsu.png` (34452917...3be1) and `manifest.json` (f11137f0...acc4).
- Nothing is written to `src/`.

## Known differences from his pictures

1. **Scale and palette.** His pictures are about 1.29x game scale. They are box-averaged down by 0.774 and snapped to 101 opaque and 21 translucent colours sampled from his pixels. The finest feather striations are softer than in his JPEG. His single brightest pixel (luma 147, a beak glint in the left picture) tops out at 138 here; the counts of light and of saturated pixels match within 20 %. His vortex's most saturated violets are a little short (chroma above 40: 1697 against 2019, eyes left out).
2. **Edges.** His edges are soft and ringed by the JPEG. Ours are a clean 1 px (17,13,30) outline where his edge is dark, on open air only.
3. **Eyes.** One 4 x 4 stamp on every crow, in his dim crimson-mauve and no brighter than his. It is a touch crisper and a little more saturated than his washed JPEG eye (its ring keeps his crimson).
4. **Solid swarm.** His vortex eye, his smoke and the gaps between his crows are close to his background colour. Here they are solid in the colour they show on his background, so the ground does not show through. Translucency stays only on the swarm's outer edge.
5. **Hidden parts.**
   - The parts of the back crows that his crows hide were never painted. His half-hidden flock crows (R2, R5) only appear in his flock; away from it, the whole crows of his left picture fly their places.
   - R3, a sliver of a head, shows only in frames 3 and 4.
   - The parts of the vortex his crows hid (over half of it) are filled with his own vortex turned about its eye. They are his pixels and his arms, but not where he put them. His top band carries short dark notches; spun round to the left of the vortex in summon 2, it reads as a few stripes beside L4's head.
6. **Wing beats.** A near wing turned 60 degrees keeps his pixels and his light, so its lit edge faces a new way. A far wing at 'mid' is his wing tip, sunk behind the back, so it shows shorter than he painted it; at 'down' it is hidden.
7. **His faint streak.** The faint violet glow streak right of L3 in his left picture is left out (see Vortex), so fly 0 differs from his picture there.
8. **R1's swoop.** R1 flies back to L1's place in two strokes of 31 px, longer than any other crow's move, because the two places are 63 px apart.
9. **Derived frames.** He painted only frames 0 and 4. Fly 1-3 and 5 and all of `summon` are built from them.

## Fix pass 5: what changed (review r3)

- **No colours for his blue-violet sheen (major).** The palette is now sampled in tiers of chroma inside each brightness band (Palette, above), for the crows and for the vortex. The brightness weight in the snap is 2 instead of 8. R5, the lower-left crow of his flock, now reads lavender-indigo as in his picture, and the sheen on R1, R2 and L1's wings is back. Pixels above chroma 30 / 40, measured the reviewer's way: right picture 1130 / 328 against his 1177 / 285 (were 513 / 124); left picture 4328 / 1756 against his 4450 / 2020 (were 3412 / 1282). A new build check holds both counts within 20 % of his on fly 0 and 4.
- **Far wings as a horn or a lance (minor).** A far wing is no longer turned. At 'mid' it sinks behind the body along its own line and only his tip shows over the back; at 'down' it is hidden. L2 has no blade behind its head and L1 no lance in front of its beak (fly 1, 2, 5; summon 1, 2).
- **L1 and L4 flying backwards in fly 1 (minor).** They turn round in fly 1, as they set off to the right, instead of in fly 2.
- **Concentric ribs where his crows hid the vortex (minor).** The ring-by-ring stripe copy is replaced by his whole vortex turned rigidly about its eye, the turn chosen to match his pixels round each hidden part. His arms now run on through the filled part. The crows' outlines and dark halos are filled too, so no crow-shaped ghost stays behind.
- **Eyes too bright and pink (minor).** Core (150,95,125) over (120,55,88), ring (85,25,55) as before. Our brightest eye pixel is luma 115-116 against his 123 / 135, and a new check fails the build if an eye of ours is brighter than his.
- **Dark hook under L2's beak (minor).** It was not L2's: it was one of his black wisps (Lf12), tucked behind L2's head and showing as a 1 px curl under the beak. Feathers and wisps tucked behind a crow's head, or showing only a sliver, are now left out of the frames we make. L2's beak curls down 2-3 px, as his does.
- **Faint glow streak became an opaque violet bar (minor).** It is left out (Vortex, above). It is at most half strength as a glow, and his panel's colour is not our ground.
- **Mass after these changes.** The far wings at 'down' and the turn-round in fly 1 shifted the opaque mass, so the vortex is a little bigger in fly 1 (0.95 instead of 1.0, so it closes over three steps) and fly 5 (0.88 instead of 0.82). All the steps are within the 0.80-1.25x limit again.
