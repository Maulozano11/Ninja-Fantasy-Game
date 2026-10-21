## What this pass changed (review r5-3)

Only the generator changed. The extractor and the refdata are as they were (refdata md5 `98087f7e0e3e30e46e42465d592aa70f`). Sprites changed: breath, stream, stream_head, bolt, slash, multi, sphere, aura, aura_back, blast. hit, multi_hit, wall, wall_diag, wall_depth and beast are byte-identical to the group before this pass.

Coordinates below are in the new frames. The breath's frame gained a row at the top, and the stream's and the stream head's lost two (their pebbles no longer fly 5 px up). So my y values are the review's plus 1 for the breath, and minus 2 for the stream and the stream head.

**Rigid pieces in the loops (findings 1-5).** One rule for every loop now. Nothing drifts and wraps any more.
- **Closed paths:** each rigid piece runs round a small ellipse of its own (`ellipse`), on its own phase, and is back on his picture at frame 0. The radii are 2 px or less, so no step between two frames is over 2 px, the step back to frame 0 included.
- **Whole pieces (`rigidGroups`):** a piece is his rock or pebble with the dark dust hugging it (`withHalo`) and the light face its rim encloses. The dust closes over where the face was, from the dust round it.
- **Kept apart (`keepApart`, new):** two pieces whose paths would bring them onto or against each other in any frame move as one. A piece that stays put holds the other still; otherwise the bigger leads. Before, a piece drawn over another tore a pixel or a few out of it. Merged: bolt 5 of 22 pieces, breath 4 of 31, slash 0 of 8.
- **Untouched by the guards:** the slit guards below change nothing inside a rigid piece, only the soft rim of the dust it carries.
- **Measured:** each piece is tracked as the offset where it is found whole (0 differing px). The paths below run from frame 0 to frame 7.

1. **breath (major).**
   - **Paths:** every rock runs round an ellipse 2 px along the cone's flow and 1 px across it (1.6 by 1 for rocks over 30 px). The specks at the tip and on the cloud's edge stay.
   - **Rock 1** (28 px, at 126,87): (0,0) (1,1) (0,1) (-1,2) (-2,1) (-3,1) (-2,0) (-1,0). Largest step 1. Before: a 5 px jump back at 1→2.
   - **Rock 2** (41 px, at 43,22): (0,0) (1,-1) (2,-1) (3,-1) (3,0) (2,1) (1,1) (0,1). Largest step 1. Before: 4-5 px at 2→3.
   - **Rock 3** (36 px, at 40,80): (0,0) (1,0) (2,1) (2,2) (1,2) (0,2) (-1,1) (-1,0). Largest step 1. Before: 4 px at 2→3.
   - **The rest:** the 30 px rock at 123,19 has a largest step of 2. All 32 dark pieces of 3-60 px (rims and specks) are whole in every frame and never step over 2 px (`earth-r8/py/darkrigid.py`).
2. **stream_head (minor).**
   - **Pebbles:** each flying pebble runs round an ellipse 1.5 px up and down and 0.8 px across. The big chunk keeps its eased dip (0-3 px).
     - A (30 px, at 102,21) and C (19 px, at 124,14): (0,0) (-1,0) (-1,0) (-1,-1) (-1,-2) (0,-3) (0,-2) (0,-1).
     - B (29 px, at 133,1): (0,0) (1,0) (1,1) (1,3) (0,3) (-1,3) (-1,2) (-1,0), largest step 2.
     - The pieces at 148,28, 143,32 and 78,30 and pebble D (at 40,50): largest step 1.
     - Before: drops of 6 px and jumps of 3-4 px.
   - **Pebble E** (10 px, at 88,34) is one rigid piece with its outline and fill: (0,0) (-1,0) (-1,-1) (-1,-2) (0,-3) (0,-3) (1,-2) (1,-1). It is whole in all 8 frames.
   - **Tile slit (`plugUncovered`, on the tile's frames too):** a clear pixel where his tile has art, lying between two solid things or enclosed, takes the dust beside it, or his rim where there is none. The review's pixels (tile 61-63,56-58 and 50,62) went from alpha 0 in frames 4-7 to 255. Every tile frame now has 0 clear pixels between two solid ones that frame 0 lacks (`earth-r8/tile-slit.png`). The head's first 32 columns are still the tile's own, so no tile of the line shows it.
3. **bolt (minor).**
   - **Paths:** each piece of debris runs round an ellipse 2 px along the trail and 1 px across it, carrying its face.
   - **Measured:** the piece at 63,64 (25 px): (0,0) (-1,0) (-3,0) (-4,0) (-3,-1) (-2,-1) (-1,-1) (0,-1). The pieces at 40,3, 41,61 and 27,40 have a largest step of 2. All are whole in all 8 frames. Before: +7 or +8 px snaps forward.
4. **multi / slash (minor).**
   - **multi:** the fleck at 14,66 goes (0,0) (-1,0) (-2,-1) (-2,-2) (-2,-3) (-2,-3) (-1,-2) (0,-1), whole in every frame. Before: a 6 px jump.
   - **slash:** the 19 px piece at 40,39 goes (0,0) (-1,0) (-1,-1) (-1,-1) (1,-2) (2,-1) (2,-1) (1,0), largest step 2, whole. Before: a +5 px snap.
5. **aura_back (minor).**
   - **Flecks:** each dark fleck carries its dark halo and bobs whole, 1 px each way, in step with the columns (the same wave).
     - The fleck at 40-41, 11-13: its top row goes 11 11 11 11 11 10 10 9 9 10 10 11.
     - The fleck at 79-80, 33-36: its top row goes 33 33 33 32 31 31 31 31 31 32 33 33.
     - Both are whole in all 12 frames (4 and 5 dark px). Before: rises of 6 px and a snap back, and a split.
   - **Ground pebbles:** a small rimmed piece lying on the ground at his feet is now a pebble among the rocks, not a bit of the ring's rim. A bobbing rock that would come down onto it rests with it, instead of being drawn over it.
   - **Measured:** all 17 dark pieces of aura_back are whole in every frame, with steps of 1 px or less.

**6. Loop dust grain (minor).**
- **Slit guard on the loops (`guardLoop`):** each loop's derived frames get the one-shots' slit guard (`guardSlits`, then `fillDips`). His own fine gaps are left alone (the pixels the guards would change in his key frame), and so is the inside of every rigid piece.
- **Rim band (`churn`, `band`):** within 3 px of the cloud's outline a dust pixel takes another's value only from one lying about as deep in the cloud as itself (within 1 px), else it keeps its own.
  - Before, the band kept its alpha but took the colour of dust 2-3 px further in. That was the breath's striped ghost edge: a row of lit specks one pixel inside the rim.
  - This applies to bolt, sphere, slash, multi, breath and the aura.
  - The breath's right edge is clean in every frame now (`earth-r8/br-edge.png`).
- **Measured:** 1-px slits are pixels 50 or more alpha below both neighbours along a row or column. Dips are pixels 50 or more below all four. Counts are for frame 0 / the worst derived frame now / the worst derived frame before:

| sprite | slits | dips |
|---|---|---|
| breath | 54 / 81 / 177 | 10 / 22 / 68 |
| sphere | 38 / 68 / 110 | 1 / 7 / 19 |
| bolt | 74 / 71 / 125 | 6 / 14 / 24 |
| multi | 62 / 57 / 132 | 2 / 7 / 22 |
| slash | 41 / 53 / 90 | 4 / 7 / 23 |
| stream_head | 84 / 121 / 169 | 14 / 25 / 43 |
| aura_back | 78 / 102 / 184 | 6 / 14 / 40 |
| aura | 15 / 22 / 45 | 2 / 3 / 11 |

- **What is left:** most of the slits left in the stream head lie in the joints between two stones, filled with his thickest dust (alpha 204, so 51 below the rock). Counting only see-through ones (alpha under 150): frame 0 33, now at most 58, before 102.

**7. blast settle (minor).**
- **Hidden dust (`evenUnder`, new):** the dust behind his crystals and rocks is never seen in his picture; the extractor reads it from the cloud round them. Behind the big crystal right of centre it held a pocket three to five steps thinner than the cloud, and a checker of alternate steps.
  - Each pixel of it is now raised to the level of the cloud round it, in its own colour.
  - The sinking crystal uncovers a whole cloud, which fades as the rest does. His picture is unchanged (0 differing px).
- **Last five frames:** the faint cloud's alpha is smoothed. A slit or speck even one alpha step thinner than the cloud on either side of it is raised to it (`guardSlits` with `minStep` 1, then `raiseDips` and `fillDips`).
- **Measured, grey area (x 110-180, y 50-115):** pixels 20 or more alpha thinner than at least three of their four neighbours, frames 11-15: before 103, 77, 89, 83, 67; now 5, 0, 0, 0, 0. In the whole frame, pixels thinner than all four: before 21, 9, 10, 7, 2; now 2, 0, 0, 0, 0 (`earth-r8/bl-grey.png`).
- **Streak (`streaksOf`):** the test now allows a streak 4 px thick, rim included. His streak behind the upper-right pebble (72 px) was 4.2 px thick and was wearing like stone.
  - It now fades through alpha as a dash, laid over the dust under it, keeping its diagonal.
  - It is solid in frames 9-11, then translucent. Its highest alpha in frames 14 and 15 is 88 and 29. Before: a solid 4x5 block in frame 14 (`earth-r8/bl-streak.png`).
  - The pebble ahead of it still wears as a stone and pales out.
- **Light:** blast light per frame: 2711 5091 7087 8254 8847 9037 9185 9105 8048 7111 5945 4997 3617 2741 2009 1354. The settle falls in steps of 1-33%, as before.

**Renderer (stream tiles).** Not changed here, as asked. The art still tiles, and the head's first 32 columns equal the tile's opaque pixels in all 8 frames. The stream and the stream head now have anchor y 61 (frame height 81), where they had 63 (83). Place them by the manifest anchor.
