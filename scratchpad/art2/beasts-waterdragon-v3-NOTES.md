# Water dragon v3: the water-set BEAST panel

The owner's new four-legged water drake is copied from the BEAST panel of his water set sheet
(`docs/reference/water-set-owner-reference.jpg`). His pixels are the key frames.

## Output

- Group `vfx_beasts_waterdragon`, one sprite `water`, staged in `art2/staging/vfx_beasts_waterdragon/`.
- **Frame 178x95** (the current in-game water dragon is 156x86). The anchor is at (99, 51), the middle of the torso. Tag `vfx`, meters [3.0, 1.6].
- `fly`: 8 frames at 10 fps, looping, facing right.
- The sheet is 1424 px wide. No pixel touches the frame edge.

| frame | source | what happens |
|-------|--------|--------------|
| 0 | his LEFT picture (striding) | his pixels, untouched |
| 1, 2 | striding picture | the near legs reach and push, the far legs swing the other way, the body lengthens a little, the tail sways and the fins lean back; the spray builds and the torso turns toward the leap |
| 3, 4 | leaping picture | frame 3 still leans on the stride (torso turned back toward its angle, legs gathered), then eases out to frame 4 |
| 5 | his RIGHT picture (leaping) | his pixels, untouched, at the 2/3 point |
| 6 | leaping picture | legs gathering, the spray thinning, the torso turning back |
| 7 | striding picture | still leans on the leap (torso turned toward it, leap droplets fading out), back toward frame 0 |

## How it was made

`tools/refs/waterdragon-from-ref.py` does the following:

- **Crop and clean.** It crops each picture and removes the dark background.
- **Scale.** His character in the same sheet is 102 px tall and ours is 96 px, so the scale is 0.941.
- **Pixel grid.** It lays the box filter on his pixel grid at each picture's crispest phase.
- **Colours and outline.** It snaps colours to a 40-colour palette sampled from his dragon. The outline is cleaned to 1 px in his darkest navy. Thin water slivers keep their colour, and droplets keep no outline.
- **Legs.** Each of his four legs below the belly is traced as a polygon along his outline. The polygons never include the tail, the belly or the jaw. Each leg swings almost rigidly about its own joint, so it keeps his outline and shading. The far legs lie behind the body and the near legs over it, as in his picture.
- **The switch between his two drawings.** Around the switch, each picture is turned part of the way toward the other's torso angle (stride +1.9°, leap −7.7°). Its tone eases a few percent toward the other picture's paler or darker paint. The spray is handed over droplet by droplet.
- **Pockets.** Small background pockets closed in where two swung legs meet are filled with his colours from around them. This applies only to the derived frames; frames 0 and 5 are byte-for-byte his.

## Fixes in this round

- **Seams, wedges and slices.** The straight seam into the hip, the pale wedge under the belly and the sliced tail in frames 3, 4 and 6 are gone. They came from the old leg regions, which were x-ranges below a belly line and caught the low tail of the leaping pose. The legs are now traced polygons with their own joints.
- **Far hind leg.** The striding picture's far hind leg is kept whole, with its claws, instead of being bent into a C shape.
- **The 2→3 and 6→7 switches.** These are softened by the torso turn, the tone easing and the spray handover. Frames 3 and 7 lean most on the pose they come from.

## Checks

- Both the converter and the generator give identical output on a second run.
- The typecheck prints nothing for the new files.
- No pixel touches the frame edge.
- No flash. Mean alpha × brightness per frame: 123, 129, 136, 140, 149, 156, 144, 131 (at most 13 per step). Painted area and mean colour both change gradually: mean colour 97 → 98.5 → 99.7 → 100.6 → 102.6 → 99.9 → 98.8.
- The generator refuses to run without `WORLD_OUT`, and writes through a temp folder and rename.
- No git commands were run. Nothing was written to `src/`.

## Known issues

- His two pictures are different drawings, so the switch at 2→3 and 6→7 is still the biggest change in the loop. It now reads as the body turning into the leap and back, rather than a cut.
- The derived legs are his legs swung at the joint, not redrawn.
