# Movement poses: walk, run, crouch, sneak, downed

These poses are for approval. They are not in `SPRITE_POSES`, so the character creator doesn't show them. They play through the usual API: `renderSpriteCached(look, 'walk', frame, eye)`, with the existing `POSE_FPS` and `frameCount`.

## What's in the review files

| File | Contents |
|---|---|
| `poses-walk.gif`, `poses-run.gif`, `poses-sneak.gif` | Four presets side by side at 3x, looping at the game's frame rates. Left to right: **Solen** (Founder King: half-cloak, legion plate and war skirt, crystal greatsword), **gentle** preset (female body, long hair, kimono, palm glow), **warlord** preset (wild long hair, lamellar armor and tassets, naginata), **Aiden** (reference preset: long crimson knight cape, plate armor, katana). |
| `poses-still.png` | The same four presets. Top row: crouch. Bottom row: downed. |
| `poses-sheet.png` | Every frame of every new pose for Aiden at 4x. |

None of the presets uses the bulky or slender body. I checked both on preset variants that are not in the review files. I also checked every cape (shadow, haori, knight, rogue, traveler, scarf, rose), every held item (katana, crystal greatsword, kunai, naginata, spiral orb, lightning, palm glow, empty hands), female-only armors (rose, lioness), the four skirts, ponytail/buns/ribbon/long hair, headband tails, a shield, twin swords, the giant back shuriken, gauntlets and a fox mask.

## The poses

| Pose | Frames, fps | Description |
|---|---|---|
| walk | 8, 10 | Contact, down, passing and up for each leg. The arms swing against the legs. The body is exactly 1 px lower on contact and down. Upright, leaning 1.5° forward. A held blade is carried low at the side, angled back. A naginata is carried upright with the blade behind the head. |
| run | 6, 12 | Contact, down and flight for each leg. The flight frames lift both feet 3 px off the ground. Leans 10° forward. The free arm pumps with the elbow bent. The weapon arm swings low and back, so blades trail behind and a naginata points forward and up. Capes, the scarf, headband tails and long hair trail behind. |
| crouch | 2, 3 | Low behind cover: knees deeply bent, leaning 30° in. The weapon is held forward and ready, and the free palm is out as if against the cover. Breathes 1 px. A long gown or tabard rests on the ground instead of sinking into it. |
| sneak | 6, 8 | A crouched creeping walk with lifted knees, leaning 15°. The weapon is held low and forward, the free hand forward for balance. |
| downed | 2, 2 | Knocked out, lying on the ground with the head toward the back, eyes closed. The near arm flops down in front of the body and the near knee is drawn up. Very slow breathing: the back rises 1 px. A katana, greatsword, kunai or naginata lies dropped on the ground in front of the body. Held techniques (orb, lightning, palm glow) fade. Capes lie flat along the back. |

Held techniques stay in the near hand in every movement pose.

### How "downed" is made

The rig only does upright poses, so the figure is drawn upright as a limp keyframe. The finished 128x128 frame is then transposed, which is an exact pixel move with no resampling. A transpose keeps the upper-left light where it is, which a 90° rotation would not. Its position comes from the body type and doesn't move between frames:

- the front of the chest rests on the ground line;
- the body is centered in the frame;
- the lowest pixels land around rows 118 to 123, and the shadow centre is row 119.

## New PoseFrame fields (rig.ts)

- `hip`: pelvis height above the ankle line, in leg lengths. It replaces the ground solve, and the feet then hang from level hips, so a lean no longer lifts one foot and sinks the other. The step cycles use it, along with a small 3/4 depth slope: a foot further forward stands slightly lower, nearer the viewer.
- `lift`: raises the whole body this many design units, for the run's flight frames.
- `sink`: lowers the pelvis this many design units while the feet stay planted and the knees bend. This is the "down" of a step.
- `snap`: puts the pelvis and the head on the fine pixel grid, with the head on half design units. Cycles then move in clean 1 px steps instead of shimmering.
- `lie`: draw upright, then lay the figure on the ground (the transpose above).

Existing poses use none of these fields, so their arithmetic is unchanged.

## Notes for the battle renderer

1. **API unchanged.**
   - `renderSpriteCached(look, pose, frame, eye)`, `frameCount(rigPoseFor(pose, style))` and `POSE_FPS` work as before. The move poses have 8, 6, 2, 6 and 2 frames.
   - `buildRig` returns the rig as the sprite shows it. For `'downed'` the joints (pelvis, head and so on) are where they land in the lying sprite, so labels anchored to `rig.head` follow the body.
   - New exports: `drawRig` (the upright drawing rig that `compose.ts` uses), `layRig` and the `Lay` type.
2. **Shadow under a downed body.**
   - `rig.lay` is set only for `'downed'`. Draw its shadow at `rig.lay.cx` instead of `rig.pelvis.x`, and wider: the lying body is about 95 px long, and I used a 44 px half-width in the previews.
   - The current `ShinobiSpriteCanvas.drawShadow(pelvis.x)` still works but sits about 9 px toward the feet.
   - `rig.lay.groundX` is the line in the upright drawing that lands on the ground. Items use it to drop weapons.
3. **Ground speed that keeps the feet from sliding**, in pixels of the 128 px sprite at 1x (multiply by your zoom):

   | Pose | Speed |
   |---|---|
   | walk | about 32 px/s (3.2 px per frame) |
   | run | about 87 px/s |
   | sneak | about 30 px/s |

   Crouch and downed don't move.
4. **The body doesn't move between poses.** The pelvis stays at the same x in every pose (crouch only lowers it), so switching from idle to walk to run doesn't jump.
5. **Chakra effects aren't designed for downed.** `renderChakra` (aura or burst) was never meant for a lying body, so skip it for downed units.
6. **Flipping.** If the renderer mirrors sprites for units facing left, a downed body's head ends up toward its old facing and the light comes from the upper right. That is the same compromise as every other mirrored pose.

## Files changed (all in `src/sprite/`)

| File | Change |
|---|---|
| `rig.ts` | The new PoseFrame fields; the walk, run, crouch, sneak and downed keyframes (built from step-cycle tables); `buildRig` split into `drawRig` (drawing) and `layRig` (display), plus `Lay`. |
| `compose.ts` | Draws with `drawRig`, then lays a `lie` frame down: rgba and the part map are transposed after pixel edits, and the lying rig is returned. |
| `grip.ts` | Blade and polearm angles for the move poses; `handsLimp` (downed: no grip). |
| `items/accessories.ts` | Weapons are dropped on the ground when downed; techniques hidden when downed; techniques stay in the near hand while moving; the neck scarf trails in the run. |
| `items/capes.ts` | Cape wind for walk, run, sneak and crouch. When downed, cloaks hug the body and the scarf tail lies along the back. |
| `items/headband.ts` | Headband tails trail when walking, sneaking and running. |
| `items/armor.ts` | Hanging skirt and gown hems stop at the soles, so they rest on the ground in a deep crouch. |
| `body.ts` | Closed eyes for downed, with no iris specials under the lids. |

`types.ts` is untouched (MovePose and MOVE_POSES as given).

## Regression check

`poses-hash.ts` saved a hash per frame before any change. It covers:

- all 8 legendary presets plus Hana and Kenji;
- idle, handsigns, attack, every cast style (all 9, including eye), hurt, victory and charge;
- each look with no eye special and with its own dojutsu eye;
- the pixels, the part map and every rig joint.

All 656 frames are still identical (`npx tsx poses-hash.ts check`). The looks were frozen in `poses-hash-looks.json`, so other people's edits to the preset data can't cause false alarms.

Typecheck: `npx tsc --noEmit -p . | grep src/sprite` prints nothing.

To re-render the review files: `poses-render.ts` writes the frames and `poses-compose.py` lays them out. The exact commands are in the scripts' headers.

## What still looks off

- **Downed is a transposed upright drawing.**
  - The face is seen sideways, with the closed-eye lines vertical.
  - Long coat tails (royal coat) and the haori's white front panel lie as flat, rather boxy blocks.
  - Big back gear such as the giant shuriken sticks up from the body.
  - On a bulky body, the dread armor's far pauldron reaches the frame's bottom pixel row (row 126 of 0-127).
  - It reads as a knocked-out body at 1x, but a hand-drawn lying sprite would look better.
- **The 3/4 view makes the legs cross.** When the near foot is forward (walk frames 0-1, run frame 5), the near leg crosses in front of the far leg. It reads in motion, but those single frames look crossed. The small depth slope helps a little.
- **Feet don't roll.** The foot templates are fixed, so there is no heel-strike or toe-off. In the run, the near foot kicked up behind uses the front-view foot.
- **Weapon-arm side effects.**
  - The near (weapon) arm swings less than the free arm on purpose. Empty-handed characters therefore also swing the near arm less.
  - In the crouch and sneak, the near forearm crosses the chest to hold the weapon forward. Large pauldrons then cover part of the chest.
- **Crystal greatsword in the run.** It is very long: its tip comes within about 3 px of the left frame edge when the arm swings back. Nothing is clipped on any body.
- **Sneak speed.** At the fixed 8 fps, the sneak's foot speed (about 30 px/s) is about the same as the walk's (about 32 px/s). If sneaking should look slower on the map, lower its fps or its map speed.
