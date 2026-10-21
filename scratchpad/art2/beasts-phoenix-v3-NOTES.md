# Phoenix v3: the fire-set BEAST panel

The owner asked for the fire beast to look like the phoenix in the BEAST panel of his fire set sheet
(`docs/reference/fire-set-owner-reference.jpg`). It is copied from his pixels, the same way as the
earlier phoenix, raijū and crane.

## Output

- Group `vfx_beasts_phoenix`, one sprite `fire`, staged in `art2/staging/vfx_beasts_phoenix/`.
- Frame 127x105 with the anchor at (82, 63), the middle of the chest. Tag `vfx`, meters [2.0, 1.7].
- The sheet is 1016 px wide, well under 8192. No pixel touches the frame edge.

| anim   | frames | fps | loop | what it is |
|--------|--------|-----|------|------------|
| fly    | 8      | 10  | yes  | His picture is frame 0. Both wings swing back and down (the far wing behind the body) and come back up. The tail sways and his embers drift up and back. |
| dive   | 5      | 10  | yes  | The whole bird tilted 30° nose down with both wings swept back. The wings flutter and the tail sways. |
| attack | 6      | 10  | no   | Draws back, flares the wings, lunges forward with the talons swung forward, then settles back to his picture (the held last frame). |

All three animations were at 12 fps before; they are now at 10 fps because the owner finds the jutsu
too fast. The anim names are unchanged.

## How it was made

`tools/refs/phoenix-fire-from-ref.py` does the following:

- **Crop and clean.** It crops his BEAST panel and removes the dark background.
- **Scale.** His character in the same sheet is 249 px tall and ours is 96 px, so the scale is 0.3855. One game pixel is one of his art pixels.
- **Pixel grid.** It lays the box filter on his pixel grid, at the phase that gives the crispest copy.
- **Colours and outline.** It snaps colours to a 40-colour palette sampled from his phoenix. The outline is cleaned to 1 px in his darkest red, (47, 14, 19). The embers keep no outline.
- **In-betweens.**
  - His near wing, far wing and legs are traced as polygons along his outlines.
  - Each wing swings about its shoulder, easing in near the root so it bends instead of shearing off. The far wing goes behind the body.
  - The legs swing about the hip for the attack.
  - The whole bird is tilted or moved for the dive and the lunge.
  - The tail sways with a wave that grows away from the rump.
- **Output.** The result is a data module, `tools/world-sprites/vfx-beasts-ref-fire2.ts`. `tools/world-sprites/vfx-beast-phoenix.ts` decodes it and exports `buildPhoenix()` for the later merge.
- **Safety.** The generator refuses to run without `WORLD_OUT`, so it can never write into `src/assets`.

## Checks

- Both the converter and the generator give identical output on a second run.
- The typecheck prints nothing for the new files.
- No flash: the per-frame mean of alpha × brightness changes gradually.
  - fly: 115, 112, 108, 91, 85, 93, 110, 113. It dips while the wings fold back over the body, which covers less area.
  - dive: 88 to 92.
  - attack: 111 to 115.
- No git commands were run. Nothing was written to `src/`.

## Known issues

- **Scale.** At his sheet's scale the phoenix is smaller than the current in-game `vfx_beasts/fire`:
  - frame 127x105 against 199x121;
  - the bird is about 100 px wide and 92 px tall.
  - That is his BEAST panel at the same scale as his character. Say if it should be enlarged.
- **Wing beat.** The beat is cut from his one picture, so the down-swept wings are his raised wings turned. In frames 3–5 the near wing lies back over the tail as a broad mass.
- **Dive.** The far wing stays raised behind the head.
- **Brightness step.** The fly brightness step between frames 2 and 3 (108 to 91) is the largest in the loop. It comes from the wings overlapping the body, not from a brightness change.
