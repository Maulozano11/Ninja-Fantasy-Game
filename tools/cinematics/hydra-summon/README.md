# The hydra summon cinematic (Steve 1's pipeline, as it ran)

The boss summon of the colossal hydra in the fortress courtyard (`docs/MISSION_DESIGN.md`, "The
hydra's fortress"; prompt card 12). **v6 is approved by the owner** (2026-10-29); **v7** adds
Barrabás in the sigil, the bolts before it fires, his line and his ninja leap (the owner's ask,
2026-10-29 22:54; waiting for his look).

Method: **"his steps, the code moves between them".** The owner's generator painted the courtyard
empty and then each step of the summon *as an edit of that same picture* (steps 1, 2, 3, 3b, 4, 4b,
4c, 5), so they register pixel for pixel. The code never repaints them; it animates the
difference between one step and the next:

| Part | How (in `cinematic7.py`) |
|---|---|
| Cracks spread (step 1) | `S1 - E` revealed by a growing elliptical radius with a noise edge |
| Barrabás, bolts, his line (v7) | his sprite in the circle; procedural jagged bolts (glow + core) over a charging circle; his line box with portrait 3 mirrored |
| The circle fires, he leaps (v7) | flash; crouch (squash), dust puff, flip arc over the wall with an afterimage trail |
| Rune rings rise (step 2) | the air part of `S2 - S1` slid up into place, the floor part faded in |
| The column (step 3) | rocks found and lifted out as sprites (`rocks.py`), the hole inpainted; bolts split from the plate (`NOBOLT`) and flickered; light streaming up the core |
| Dust wave, cloud, eyes (3b, 4, 4b) | masks of each step's difference; the cloud grown from its base (outline only), warped with noise; eyes ramp up and glow |
| Tunnels and the heads (4c, 5) | `derived/step4c_fixed.png` is his 4c v3 with the 5th tunnel added by us; the heads come out of the tunnels with a back-easing stretch |
| Hand-off | ends on the live battle scene (`mount9.py`: the battle camera, 57 px/m, 38 px/m depth, breathing body, steady necks), so the cinematic's last frame is the battle's first |

Inputs: the owner's pictures in `docs/reference/` (`colossal-hydra-courtyard-empty`,
`summon-courtyard-step*`, `colossal-hydra-heads-grid`), plus `derived/` (the backdrop without its
painted heads, the body mask, the stump anchors, the fixed 4c) and `sprites/` (the party, Barrabás
and his portrait). `layout.py` puts them where the scripts look.
