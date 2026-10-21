# Crow swarm (genjutsu beast), copied from the owner's genjutsu sheet

The source is his paint-over, `docs/reference/genjutsu-set-owner-reference.jpg` (the same file as `REF-genjutsu-set-owner.jpg` here). Under "BEAST (CROW, APPROVED, IN GAME)" he replaced our single crow with a swarm in two pictures:
- **Left:** crows with red eyes circle a dark violet vortex.
- **Right:** the flock streams right, with black smoke and feathers trailing.

Both pictures are copied pixel for pixel at game scale as the new genjutsu beast.

This is fix pass 4. It answers review r2; the changes are listed at the end (the last item, L4's trim, was added on the final check of this pass).

## Sprite

| | |
|---|---|
| Group / sprite | `vfx_beasts_crows` / `genjutsu`. Staged for approval; it becomes `vfx_beasts/genjutsu` after the merge |
| Frame | **212 x 167** (3.7 x 2.9 m at 57 px/m). The old crow was 144 x 121. The size follows his swarm at game scale, plus the room the in-between frames move in |
| Anchor | **[116, 82]**: the centre of the swarm's mass. It is the same point in both of his pictures |
| `fly` | 6 frames, 12 fps, loop. The frame count is unchanged, because beasts keep theirs. **Frame 0 is his left picture and frame 4 his right picture** (FRAMES 0 and 4 in our kit) |
| `summon` | 6 frames, 12 fps, plays once. **Our proposal, not in his sheet**: his label lists only FLY. It plays at the caster before the swarm flies and ends on his left picture (the same as fly 0). Not wired up yet |
| Facing | Right. The renderer mirrors it when the swarm flies left |
| Colours | 91 in all: 72 opaque and 19 translucent. Alpha is 0, 170 or 255, and alpha 170 appears only on the swarm's outer edge |

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
- **Palette.** It is sampled from his pixels at game scale, in brightness bands, so his few light colours keep entries of their own:
  - Crows and feathers: 16 / 9 / 6 / 4 / 3 colours for luma < 60, 60-85, 85-98, 98-112 and 112+. The brightest is (134,129,150).
  - Veil: 8 / 8 / 7 / 3 / 4 colours for luma < 40, 40-70, 70-92, 92-104 and 104+. Its brightest magentas are (136,110,158) and (135,94,160).
  - In the snap to the palette, a brightness difference weighs about three times a hue difference. That way his glints stay glints and his darks stay dark.
- **Highlights against his picture.** "His" here is a plain box downscale of his JPEG on our anchor, inside his picture box. Rec. 601 luma, eyes left out. The build fails if the counts above luma 90 or 100 are more than 20 % off his.

  | | his left | fly 0 | his right | fly 4 |
  |---|---|---|---|---|
  | px above luma 90 | 127 | 138 | 104 | 101 |
  | px above luma 100 | 56 | 63 | 45 | 47 |
  | px above luma 110 | 24 | 27 | 16 | 16 |
  | brightest pixel | 147 | 133 | 131 | 133 |

- **Outline.** Dark crow and feather edges on open air get a 1 px outline in **(17,13,30)**. That colour is the median of his own dark crow edges. Lit edges keep his colour.
- **Eyes.** The same round stamp on every crow, centred on the traced eye and in his hue:
  - a 4 x 4 dark crimson ring, (85,25,55);
  - round a 2 x 2 dim mauve core, (180,105,135) on top and (140,60,95) below.

  Plain eyes, as he painted them, with no pattern added.
- **Solid inside, soft only at the edge.**
  1. Gaps shut in by the swarm are closed. In his pictures they get his own pixel there; in the frames we make, the pixels round the gap.
  2. Only then is the open air worked out: the clear pixels that reach the frame's edge.
  3. Every soft (alpha 170) pixel more than 2 px from that open air is made solid, in the colour it shows on his background (in his pictures, his own pixel).

  So the ground never shows through his dark smoke, between his crows or at the vortex's eye.

## The in-betweens

Everything is built from his pixels. Nothing is redrawn.

- **Crows as pieces.**
  - Each crow is lifted off his picture at sheet scale, with its enclosed holes closed from its own pixels. It is then shrunk and snapped like the key frames.
  - It moves by whole pixels, and is mirrored about its eye to turn round.
  - Where his vortex's purple showed between its feathers, that gap stays see-through when the crow flies over the vortex or another crow, and is solid over open ground.
  - One-pixel hairs and crumbs under 10 px are left out.
  - L2 sits on L3's raised wing, so its belly under the head was cut along that wing. That cut edge (a drip under the throat) is trimmed off L2 when it is lifted.
  - L4's outline stops at the lower edge of its raised near wing. The dark round eye of the vortex under that wing, and the violet ring round it, belong to the vortex, so they stay with it instead of flying off with L4.
- **Whole crows away from the flock.** Two of his flock crows are partly hidden in his right picture: R2 is a wing and a head, and R5 is a body cut by R6's wing. Away from the flock, the whole crow from his left picture flies their place: L2 and L4 in frame 3, and the left crows again from frame 5 on.
- **Wing beats.**
  - The raised wings are turned by **30 degrees ('mid') or 60 degrees ('down')**, nearest neighbour at sheet scale, about a traced shoulder joint.
  - The far wing goes behind the body and the near wing in front.
  - The far wings of L3 and L2 rise up over their heads, so they sweep back when they beat. They never sweep down across the beak.
  - There are two flights. A goes up, mid, down, mid, up, down; B goes up, down, mid, up, up, mid. His pictures are the 'up' pose.
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
  | fly 1 to 2 | R4 comes into sight | 0 to 9 % | 21 % in fly 2 |
  | fly 2 to 3 | R3 comes into sight | 0 to 72 % | 77 % in fly 2 |
  | fly 4 to 5 | R3 goes out of sight | 100 to 0 % | 38 % in fly 5 |
  | fly 5 to 0 | R6 goes out of sight | 19 to 0 % | 53 % in fly 5 |

- **Crow travel per frame (game px).** The limit is 25, and 32 for R1's swoop.

  | Step | 0-1 | 1-2 | 2-3 | 3-4 | 4-5 | 5-0 |
  |---|---|---|---|---|---|---|
  | Furthest move | 18.0 | 16.2 | 14.9 | 21.9 | 22.9 (R1's swoop: 31.2) | 22.2 (L1's swoop: 31.6) |

  The swoop has to be long: L1's place in his left picture is 63 px from R1's place in his flock, and every other crow is further away. The loop has two frames to cover it.
- **Vortex.**
  - **Unwrapping.** His vortex is unwrapped into polar space about its eye (radius 104 sheet px, 0.5 px by 0.25 degrees). The sampling is nearest neighbour both ways, so unturned it gives his pixels back, and turned it moves them without blurring his stripes.
  - **Hidden parts.** Where his crows and feathers hid the vortex, each band of rings (4 sheet px) is filled with **his own stripes**:
    - the visible arc at the same radius is copied across by the smallest angular offset whose source he painted;
    - the next band keeps that offset while it fits, so a stripe runs on across radii;
    - the copy is cross-faded into his pixels over about 3 sheet px at each end;
    - a hole longer than any visible arc is filled in overlapping pieces;
    - only the rings round the dark eye, which he hid almost entirely, take the ring's own average.
  - **Spin and size.** It spins by shifting the angle and closes by scaling the radius. Small loose scratches (under 25 px) that a spin turns out over open ground are dropped.
    - fly: his picture (f0); f1 1.0 size, +15 degrees; f2 0.85, +30; f3 0.72, +45, dimmed; none in f4 (his flock); f5 0.82, -30 (reopening). So the reopening splits over two steps in what shows: 0, then 2961 px, then 6068.
    - summon: 0.6, 0.7, 0.82, 0.92, 1.0, then his picture.
  - **No flash.** Its lit violet (blue minus green above 45) and bright violet (above 70) cover about the same share of what shows of it as in his picture. The build fails if fly 1, 2 or 5 is more than 30 % off fly 0.

    | | fly 0 | fly 1 | fly 2 | fly 3 | fly 4 | fly 5 |
    |---|---|---|---|---|---|---|
    | vortex px showing | 6068 | 5032 | 3545 | 1465 | 0 | 2961 |
    | violet | 1040 | 752 | 555 | 163 | 0 | 427 |
    | bright violet | 244 | 222 | 140 | 35 | 0 | 131 |

- **Smoke.** His smoke wisps, biggest first and each kept whole:
  - 70 % of it trails in behind the flock in frame 3;
  - in frame 5, the wisps behind the anchor drift 8 px back and stay.
- **Feathers.** His feathers ride round the vortex and drift back. Loose black scratches of wisp under 25 px are left out of the frames we make.
- **Mass and light** (the build fails above 1.25x mass, 1.5x light or 20 % mean luma from one frame to the next, the wrap included):

  | | f0 | f1 | f2 | f3 | f4 | f5 |
  |---|---|---|---|---|---|---|
  | Opaque px | 15030 | 12622 | 11323 | 9772 | 10175 | 12302 |
  | Light (alpha x luma, thousands) | 425.3 | 348.9 | 325.0 | 257.1 | 238.9 | 329.4 |
  | Mean luma | 28.3 | 27.6 | 28.7 | 26.3 | 23.5 | 26.8 |

- **Summon (our proposal).**
  - The vortex opens at 0.6 size and grows a step each frame, spinning.
  - The crows come out of it **head first**, each on its own side: the right-facing L3 and L2 from its right half in frame 1, and the left-facing L4 and L1 from its left half in frame 2. Their beaks and red eyes come past the rim while their bodies are still behind its swirl, darkened 30 %.
  - Then they rise round it, wings mid and up. Frame 5 is his left picture.
  - Mass: 3836, 6640, 10011, 12059, 14102, 15030 (at most 1.73x a step). Mean luma: 23.3, 24.1, 26.2, 26.0, 27.7, 28.3.

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
  - the highlight counts on fly 0 and 4 within 20 % of his picture;
  - crow travel at most 25 px a frame (32 for R1's swoop).
- **Border check** over all 12 frames of the staged sheet: 0 opaque pixels on any frame border. The staged PNG frames equal the data module, decoded independently.
- **Typecheck.** `npx tsc --noEmit -p .` prints nothing.
- **Determinism.** There is no randomness:
  - three converter runs give a byte-identical `vfx-beasts-ref-genjutsu.ts` (sha256 c2f0389e...c599);
  - two generator runs give a byte-identical `genjutsu.png` (b7a6f55f...7103) and `manifest.json` (f11137f0...acc4).
- Nothing is written to `src/`.

## Known differences from his pictures

1. **Scale and palette.** His pictures are about 1.29x game scale. They are box-averaged down by 0.774 and snapped to 72 opaque and 19 translucent colours sampled from his pixels. The finest feather striations are softer than in his JPEG. His single brightest pixel (luma 147, a beak glint in the left picture) tops out at 133 here; the counts of light pixels match within 20 %.
2. **Edges.** His edges are soft and ringed by the JPEG. Ours are a clean 1 px (17,13,30) outline where his edge is dark, on open air only.
3. **Eyes.** One 4 x 4 stamp on every crow, in his dim crimson-mauve. It is a touch crisper than his washed JPEG eye.
4. **Solid swarm.** His vortex eye, his smoke and the gaps between his crows are close to his background colour. Here they are solid in the colour they show on his background, so the ground does not show through. Translucency stays only on the swarm's outer edge.
5. **Hidden parts.**
   - The parts of the back crows that his crows hide were never painted. His half-hidden flock crows (R2, R5) only appear in his flock; away from it, the whole crows of his left picture fly their places.
   - R3, a sliver of a head, shows only in frames 3 and 4.
   - The parts of the vortex his crows hid are filled with his own stripes, copied round from the same radius. They are his pixels, but not where he put them, so the vortex reads a little more concentric there than his spiral.
6. **Turned wings.** A wing turned 60 degrees keeps his pixels and his light, so its lit edge faces a new way.
7. **R1's swoop.** R1 flies back to L1's place in two strokes of 31 px, longer than any other crow's move, because the two places are 63 px apart.
8. **Derived frames.** He painted only frames 0 and 4. Fly 1-3 and 5 and all of `summon` are built from them.

## Fix pass 4: what changed (review r2)

- **Ground showing through his solid art (major).** After the shut gaps are closed, the open air is now recomputed: the clear pixels that reach the frame's edge. Every translucent pixel more than 2 px from it is made solid, in the colour it shows on his background (in his pictures, his own pixel). This covers his dark smoke between the flock's crows, the vortex's eye and the vortex stripes dimmed while it reforms. A new check fails the build on any such pixel: 0 in all 12 frames (it was 84-178).
- **Highlights compressed (major).**
  - The downscale is now a true box filter. Before, it was PIL's bilinear filter, whose wider triangle averaged his glints away.
  - The palette bands reach up to his brightest crow and vortex colours: crows to (134,129,150), the vortex to (136,110,158) and (135,94,160).
  - The snap weighs brightness about three times as much as hue.
  - The reference for the check is now a plain box downscale of his JPEG on our anchor, inside his picture, without his label. Before, it was the layered reconstruction.
  - The counts are within 20 % (table above), and the build fails otherwise. The vortex's brightest pixel is luma 123 (his 131), up from 99.
- **Vortex flash and bullseye (major).**
  - The ring-median fill of the hidden spans is replaced by his own stripes, copied round at the same radius by the smallest offset he painted, band by band and cross-faded at the seams.
  - The polar sampling is nearest neighbour both ways, so the stripes keep their brightness.
  - The spin is +15 degrees a frame on the way out.
  - Bright violet per fly frame is now 244, 222, 140, 35, 0, 128 (it was 293, 126, 90, 33, 0, 86). As a share of what shows of the vortex, fly 1, 2 and 5 are within 30 % of fly 0, and a new check fails the build otherwise.
- **Fly 4 to 5 was a cut (major).**
  - The vortex reopens at 0.82 size in fly 5 and is whole in fly 0. In what shows (0, then 2662 px, then 5711), that splits the reopening over the two steps; at 0.55-0.6 size, the crows over it hid most of it and the step into fly 0 failed the mass check.
  - R1 no longer vanishes: it swoops back as L1, which therefore no longer appears out of empty space.
  - R6 sinks only 6 px and still shows. R3 goes behind the vortex and the returning L3.
  - A new check fails the build when a crow comes into or goes out of sight without going behind the vortex.
  - Visible crows per fly frame are now 4, 4, 5, 6, 6, 5.
- **Eyes too saturated (minor).** The stamp is now in his hue: ring (85,25,55), core (180,105,135) over (140,60,95).
- **L2's drip and talon (minor).** The cut edge under L2's throat is trimmed off the lifted crow. L2's far wing sweeps back instead of down across its beak, which removes the long "beak" in fly 1 and the hook in fly 5. A new check fails the build on any loose bit of crow under 150 px.
- **Loose wisp crumbs (minor).** In the frames we make, loose black scratches under 25 px are left out, and so are scratches of the spun vortex under 25 px. The only small loose bits left are his own feathers.
- **Summon (minor).**
  - The crows come out head first: beak and red eye past the rim, body behind the swirl, each crow on its own side. They are no longer headless wing chunks.
  - The vortex starts at 0.6 size, so the largest mass step is 1.73x (it was 2.7x).
  - L3's raised far wing sweeps back, so no forked tip shows.
  - The wisp column above the rim in summon 4 is gone with the solid-inside fix.
- **L4's flat dark block (found on the final check, same kind as L2's drip).** L4's traced outline took in the vortex's dark round eye under its raised near wing. In fly 1-3 and summon 2 that eye flew with L4 as a flat dark-violet block with no feathers under the crow. The outline now stops at the wing's lower edge, so the eye stays in the vortex (spinning with it) and L4 flies clean. Fly 0 and fly 4 are unchanged to the eye: their mean colour error against his box-averaged pictures went from 4.65 to 4.61 (left) and 3.83 to 3.82 (right) levels.
