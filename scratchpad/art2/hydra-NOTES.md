# Hydra (boss of mission 1): notes for the owner

Staged for approval; nothing was written to `src/assets/world`.

## What to look at

| File | What it shows |
|---|---|
| `hydra-assembled.png` | The whole hydra at 2x, built from its parts through `hydra.json`, on a painted forest green, with the 1.75 m character beside it. |
| `hydra-anims.png` | Strips of every animation at 2x: body, stump, venom, splash, and the full set for heads 1 (tall, back) and 7 (low, front). |
| `hydra-anims-neck1.png` … `neck7.png` | Every animation of each of the seven heads at 2x. |
| `hydra-sever.png` | Head 7 bitten off: sever (the stump shows from frame 0), the stump raw, then burnt, then a regrow from the raw stump. |
| `hydra-states.png` | All heads; all stumps raw; all stumps burnt; the death with burnt stumps riding the collapsing chest. |
| `hydra-zoom-heads.png`, `hydra-zoom-body.png`, `hydra-zoom-fx.png` | 4x crops for judging pixels. |
| `creatures.png` | The kit preview (scale 2): body, head 1 and the effects. A preview of all seven heads' strips would be about 250 megapixels, so the per-head files above cover them. |
| `staging/creatures/` | The sheets, `manifest.json` and `hydra.json`, exactly as the game would load them. |

Every picture except `creatures.png` is built by reading the written sheets, manifest and `hydra.json` back from disk (`tools/world-sprites/creatures-assemble.ts`). If the rig data were wrong, the pictures would show it.

Rebuild into staging:

```bash
cd /home/user/Ninja-Fantasy-Game && WORLD_OUT=<art2>/staging npx tsx tools/world-sprites/creatures.ts <art2>
```

Without `WORLD_OUT` the script writes to `src/assets/world/creatures/`. Use that only after approval. It takes about 40 s, gives byte-identical output on every run, and prints the checks listed at the end of these notes.

## Design (from the owner's reference)

- **Body.** A serpentine body coiled on the ground: a broad chest with golden belly plates, the coil running round the back and out to a curling tail with plates on its inner side, and two strong clawed legs. The near leg is on the left, in front; the far leg is on the right, one shade darker, reaching forward. Golden dorsal spikes run along the coil and the tail, and a soft contact shadow sits under the body.
- **Seven necks fan out like the reference.**
  - Head 1 is the tall center head.
  - Heads 2 and 3 are the high side heads.
  - Heads 4 and 5 are the middle heads, swinging out wide.
  - Heads 6 and 7 are the low heads in front of the chest.

  The left necks make an S-curve out and back, so every head faces right; the game mirrors the whole rig.
- **Heads.** Faceted dragon skulls about 1.03 m long (59 px; the horns add more). Each has a hinged jaw, a purple-pink mouth, rows of white teeth, glowing green eyes under an angry brow, a nostril, and a golden crown: a big swept-back horn, a far horn and a fan of spikes. The throat glows faintly green.
- **Colors.** Deep teal-green scales (6-step hue-shifted ramp: shadows go blue-teal, lights go olive). Golden-ochre spikes, horns and claws come from the rope, fire and old-wood materials. The olive belly plates are that gold pulled toward leaf green. Glowing green venom.
- **Look.** Built like the landmarks the owner approved (`creatures-mesh.ts`): meshes rasterised with the battle camera (57 px/m across, 38 px/m of depth), a G-buffer, Lambert light from the upper left with cast shadows (shadow map), the kit's clustered `band()`, crests on lit facet edges, dark inner lines where parts overlap (including a tube folding over itself), and the kit outline.
  - Necks, tail and legs are tubes along curves with a tapering radius.
  - Scale rows are overlapping arcs; belly plates have a lit top rim, a darker lower half and a dark seam.
  - Both are anchored to the skin, so they ride along with a moving neck instead of shimmering.
  - Glows (eyes, venom) are translucent halos without outline.

## Measurements

- Assembled: **6.49 m tall** from the ground row to the top of head 1, and **6.02 m wide** (370 x 343 px).
- Body: 326 px wide solid, about 5.7 m (brief: 5.5 m). The chest top is about 2.4 m above the ground. The sprite is 196 px tall on screen because the coil's depth (about 1.5 m front to back) shows with the steep camera.
- Heads: skull and jaw are 59 x 24 px (about 1.0 m long).
- Stump: 0.6 m from the root to the cut.
- Venom gob: about 0.4 m with its glow.
- Splash puddle: about 1.5 m wide (84 px; ground ellipse 0.62 as tall as wide).

## Sprites (group `creatures`)

| Sprite | Frame | Anchor | Animations (frames @ fps) | Tags |
|---|---|---|---|---|
| hydra_body | 334x212 | 184,204 (ground row under the chest axis) | idle 8@6 loop, hurt 3@10, death 10@8 | creature, boss |
| hydra_neck_1 | 238x343 | 77,197 (neck root) | idle 8@6 loop, bite 6@10, spit 6@10, roar 6@8, hurt 3@10, sever 8@10, regrow 8@8 | creature, boss |
| hydra_neck_2 | 202x303 | 156,166 | same set | creature, boss |
| hydra_neck_3 | 197x308 | 31,170 | same set | creature, boss |
| hydra_neck_4 | 193x253 | 161,128 | same set | creature, boss |
| hydra_neck_5 | 208x255 | 31,128 | same set | creature, boss |
| hydra_neck_6 | 193x230 | 124,119 | same set | creature, boss |
| hydra_neck_7 | 186x222 | 31,111 | same set | creature, boss |
| hydra_stump | 46x87 | 23,67 (its root) | raw 4@6 loop, burnt 4@6 loop | creature, boss |
| hydra_venom | 32x24 | 20,12 (gob center) | fly 4@12 loop | ambient |
| hydra_splash | 107x72 | 52,44 (ground center) | splash 6@12 once | ambient |

### Animations

- **Neck idle.** A slow sway that grows toward the head while the jaw opens a little. Each head has its own phase, so the seven never move in unison. The root never moves.
- **Bite.**
  - Frames 0-1: rear back, jaws wide.
  - Frames 2-3: a cobra strike; the neck arches over the head as it dives about 1.7 m forward-right and down.
  - Frame 3: snap shut (the impact frame).
  - Frames 4-5: recover.
- **Spit.**
  - Frames 0-2: rear back while the mouth fills with bright green.
  - Frame 3: the gob leaves the mouth; spawn `hydra_venom` here.
  - Frame 4: drips.
  - Frame 5: recover.
- **Roar.** A dip, then the head rears up with the jaws wide, a tremor, and it settles.
- **Hurt.** The head snaps back with the eye squeezed shut, recoils further, then recovers.
- **Sever.** The neck is cut 0.6 m above its root, with a bright slash and green blood. The piece goes limp, drops and lies along the ground: right necks and the center one toward the right, left necks toward the left, belly down. It melts into green mist, and the last frame is empty.
- **Regrow.** It starts from a wet bud on the stump. A glistening new neck pushes out, coiled like a fern, unfolds with a small overshoot and roar, and its last frame is exactly idle frame 0.
- **Body.**
  - Idle: breathing, with the tail tip swaying.
  - Hurt: the chest flinches a few pixels while the tail lashes.
  - Death: a last heave, then the chest collapses forward onto the ground (impact, a small bounce, settle) and the tail curl goes slack.
- **Stump.**
  - Raw: venom bubbling in the cut and drips running down.
  - Burnt: a charred, sealed crust with an ember and a thin smoke wisp.

  The cut is a slanted sword cut facing up and left, so the raw face catches the light.

## The rig: `staging/creatures/hydra.json`

```json
{"body": "hydra_body", "stump": "hydra_stump", "venom": "hydra_venom", "splash": "hydra_splash",
 "heads": [
  {"sprite": "hydra_neck_1", "attach": [8, -179], "layer": "back", "head": [-4, -153], "mouth": [21, -140]},
  {"sprite": "hydra_neck_2", "attach": [-22, -175], "layer": "back", "head": [-62, -119], "mouth": [-35, -111]},
  {"sprite": "hydra_neck_3", "attach": [36, -173], "layer": "back", "head": [63, -126], "mouth": [89, -114]},
  {"sprite": "hydra_neck_4", "attach": [-40, -165], "layer": "back", "head": [-82, -78], "mouth": [-54, -75]},
  {"sprite": "hydra_neck_5", "attach": [52, -163], "layer": "back", "head": [77, -77], "mouth": [100, -60]},
  {"sprite": "hydra_neck_6", "attach": [-30, -125], "layer": "front", "head": [-38, -73], "mouth": [-11, -66]},
  {"sprite": "hydra_neck_7", "attach": [42, -123], "layer": "front", "head": [57, -58], "mouth": [78, -38]}],
 "follow": {"idle": [[0,0],[0,-1],[0,-1],[0,-1],[0,0],[0,1],[0,1],[0,1]],
            "hurt": [[-4,0],[-6,3],[-2,0]],
            "death": [[-8,-4],[-13,-7],[4,2],[20,23],[42,55],[52,67],[51,66],[52,67],[52,67],[52,68]]}}
```

- **Coordinates.** `attach` is the neck root relative to the body anchor: neck anchor = body anchor + attach. `head` and `mouth` are relative to the neck anchor in idle frame 0. All are in px, x right, y down; mirror x when the boss faces left.
- **Draw order.** Draw the `back` necks in list order, then the body, then the `front` necks in list order. A stump is drawn in its neck's layer and slot, under the neck.
- **Extra fields.** Beyond the brief's format there are three extra fields:
  - `venom` and `splash` name the projectile and impact sprites.
  - `follow[anim][frame]` is how far the neck roots move with each body frame. Add it to every `attach` while the body plays that frame. It is tiny for idle, at most 6 px for hurt (kept small so heads stay seated even if it is ignored), and large for death.
- **Venom.** On spit frame 3, spawn `hydra_venom` at neck anchor + mouth and fly it to the target. Play `hydra_splash` at the impact point on the ground; its last frame (the puddle) holds.
- **Cutting a head.**
  - Start the neck's `sever` and show `hydra_stump` (`raw`) at the same attach point, under the neck, from sever frame 0.
  - The last sever frame is empty: hide the neck after it. Switch the stump to `burnt` when fire seals it.
  - For `regrow`, keep the raw stump drawn under the neck. The new neck pushes out of its cut face, and the final regrow frame is idle 0, which fully covers the stump, so remove the stump when regrow ends.
- **Death.** Stumps and heads should ride `follow.death`. The back-layer stumps end up hidden behind the slumped chest, which is intended. Live heads at death can play `sever` from frame 1 (the limp drop without the slash).

## Checks (printed by the script)

- **Canvas and anchors.** One canvas size per sprite. Every neck's root rows and the body's ground rows are pixel-identical through the idle loop.
- **Loops.** Each loop's seam (last frame to first) is no bigger than its ordinary steps.
- **One-shot ends.** Sever ends on an empty frame; every other one-shot ends drawn.
- **Value budget** (steps 1-5, first frame):
  - Body: 37 / 27 / 21 / 14 / 1 %.
  - Necks: 17-27 / 27-40 / 27-31 / 8-25 / 1-2 %.
- **Determinism.** Two runs give identical checksums.
- **Typecheck.** `npx tsc --noEmit -p . | grep world-sprites/creatures` prints nothing.

## Still to judge or improve

- **Identical heads.** All seven heads share one head model. They differ only in angle, jaw and phase. A second or third head variant (different horns, a scar, a broken tooth) would add character.
- **Left severs.** At sever frame 3 a severed left head turns to face its own way while it falls. At 10 fps this reads as a twist, but it is a one-frame change.
- **Cut mismatch.** The falling piece's flat cut does not match the slanted stump cut on sever frame 0. That frame is covered by the slash.
- **Regrow frame 0** is a small wet bud, not a literally empty frame.
- **Bare dome.** The chest top only shows when heads are cut, and its coarse scale arcs can read a little like drips.
- **Front neck roots.** The roots of front heads 6 and 7 are drawn over the chest with an outline, so the join shows as a dark crease.
- **Body width.** The body is about 4% wider than the brief's 5.5 m. Its screen height includes the coil's depth.
- **Neck canvases** are large (up to 238 x 343) because a severed neck falls all the way to the ground.
- **Backdrop.** The painted forest behind the assembled preview is a quick placeholder, not game art.
