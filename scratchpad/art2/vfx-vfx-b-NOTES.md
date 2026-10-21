# VFX set B: earth, genjutsu, chakra, poison

Generator: `tools/world-sprites/vfx-b.ts`. Element files are `vfx-b-earth.ts`, `vfx-b-genjutsu.ts`, `vfx-b-chakra.ts` and `vfx-b-poison.ts`. Shared painting helpers are in `vfx-b-lib.ts`, and the 3D wall projection is in `vfx-b-wall3d.ts`. `kit.ts` is not modified. The earth wall imports `MOSS_R` and `outlineTinted` from `landmarks-paint.ts` but does not change that file.

```bash
WORLD_OUT=<art2>/staging npx tsx tools/world-sprites/vfx-b.ts <art2>
VFX_ONLY=earth,poison ...   # build only some elements (the border-check file is written only by a full build)
VFX_LOOK=all ...            # also write zoomed review strips to <art2>/vfx-b-look/
```

Output is staged only: `staging/vfx_<element>/<sprite>.png` plus a `manifest.json` per group, in the kit format (one sheet row per animation). The generator never uses `Math.random`. Two full builds produce byte-identical files.

## Deliverables

- `vfx-earth.png`, `vfx-genjutsu.png`, `vfx-chakra.png`, `vfx-poison.png`: every role at 2x, labeled. Each sheet also shows:
  - the stream tiled 3 times with the head attached;
  - the aura behind and in front of the character;
  - the horizontal wall next to the character.
- `vfx-vfx-b-anims.png`: every animation strip for the four elements, at 2x.
- `vfx-b-beast-<element>-4x.png`: the 6-frame beast loops at 4x.
- `vfx-b-walls.png`: per element, `wall`, `wall_diag` and `wall_depth` (idle frame 0) side by side at 2x. Every anchor is on one ground line, with a character standing on that ground beside each wall.
- `vfx-b-walls-anims.png`: `rise` and `idle` strips of all 12 walls, at 1x (2x would be about 7000 px tall; the 2x strips are also in `vfx-vfx-b-anims.png`).
- `vfx-b-earth-wall.png`: the old stacked-rock earth wall next to the new stone wall, at 2x, each with a character.
- `vfx-b-genjutsu-eye.png`: the old three-tomoe sphere loop above the new sigil sphere loop, at 4x.
- `vfx-b-border-check.txt`: output of the automatic frame-border check (see below).

## Sprites, sizes, anchors, timing

| sprite | frame | anchor | animation |
|---|---|---|---|
| bolt, sphere, slash, multi | 64x64 | 32,32 (center) | `fly` loop, 6 frames, 12 fps, facing right |
| stream_head | 64x64 | 32,32 | `fly` loop, 6 frames, 12 fps (see the attachment rule below) |
| stream | 64x64, tileable left-right | 0,32 (left end of the line) | `fly` loop, 6 frames, 12 fps |
| beast | earth and poison 136x96; genjutsu and chakra 128x96 | 64,48 | `fly` loop, 6 frames, 12 fps |
| breath | 112x104 | 8,52 (cone origin) | `fly` loop, 6 frames, 12 fps |
| hit | 64x64 | 32,32 | `hit` one-shot, 6 frames, 15 fps |
| blast | earth and poison 176x144, anchor 88,88; genjutsu and chakra 176x176, anchor 88,120 | ground center | `blast` one-shot, 8 frames, 12 fps |
| wall (horizontal) | earth 288x152, anchor 144,128; others 272x128, anchor 136,120 | ground center | `rise` once, 6 frames, 12 fps; `idle` loop, 8 fps: 4 frames for earth, 6 frames for the others |
| wall_diag (3/4) | 240x272 | 120,188 | `rise` once, 6 frames, 12 fps; `idle` loop, 4 frames, 8 fps |
| wall_depth | 112x304 | 56,206 | `rise` once, 6 frames, 12 fps; `idle` loop, 4 frames, 8 fps |
| aura | 80x128 | 40,112 (feet) | `idle` loop, 6 frames, 10 fps |

Every sprite is tagged `vfx`.

**Stream head attachment:** draw the head so that its frame's left edge (x = 0) sits on the end of the last stream tile. Its anchor (32,32) is therefore 32 px beyond the end of the line. The head carries the beam (or chain, ribbons or jet) over its first 64 px with the same 64 px period as the tile, so the joint is seamless. The earth line runs along y = 42 in both the tile and the head (its spikes rise above y = 32). The other elements run along y = 32.

**Size changes in this pass:**
- **Breath:** 96x64 with anchor 0,32 became 112x104 with anchor 8,52, so the cone and its particles are no longer cut by the frame.
- **Beasts:** the earth and poison beasts became 136 wide; the extra 8 px are on the right, so the anchor stays at 64,48.
- **Blasts:** the genjutsu and chakra blasts became 176x176 with anchor 88,120, to make room for the pillar.
- **Auras:** gained 8 rows at the bottom (80x120 became 80x128, anchor unchanged).

## Walls in three orientations

All twelve walls show the same wall: 4.5 m long, 1.8 m (103 px) high, re-painted in each orientation rather than squashed.

- **`wall`:** runs along x.
- **`wall_diag`:** turned 45°, from near-left (-91,+60) to far-right (+91,-60) px from the anchor. Lighting on this view is soft or from the top, because the renderer mirrors it for "\".
- **`wall_depth`:** runs straight into the screen, from +86 to -86 px. Its thickness on screen is about 23 to 34 px depending on the element.

The anchor is the wall's centre on the ground. In the 3D views every pixel casts its view ray through the solid in wall-local coordinates (`march` in `vfx-b-wall3d.ts`), so the top cap, the front face and the near end overlap correctly. The far third is a touch darker and the near end is crisper. Rise spreads along the whole wall in the same way as the horizontal one.

- **Earth:** fitted stone slabs to the landmarks stone standard, in three courses plus two tall slabs, with:
  - wobbly joints, faceted faces, fresh chips, cracks and a damp foot;
  - moss cushions and sprigs on the crown, rubble at the foot, and tinted outlines (`outlineTinted`).

  Dust churns along the foot while the wall rises and settles to separate low drifts at rest. In the depth view the dust rolls out as billows down both sides, because a continuous band read as a rail.
- **Genjutsu:** staggered mirror-glass panels with glass end faces, smoke at the foot and pink sparkles.
- **Chakra:** a honeycomb barrier slab between gold seal posts, with:
  - a gold glyph base band and a shimmering crest with chakra tongues;
  - seal tags and sparks.

  The posts have collars and a glyph slot that glows on their outer end, so the depth view shows a carved seal pillar at the near end.
- **Poison:** a gas volume. Each pixel takes the densest point on its view ray. The volume is thick and pooling at the ground and thins to a crest of tongues, with the same height profile as the horizontal curtain. It has purple fumes, drops running down the face and bubbles along the foot.

## Genjutsu sigil (replaces every tomoe)

The original sigil is a ring with four small outward triangles at N/E/S/W around a pupil (`sigil` and `sigilMask` in `vfx-b-genjutsu.ts`). Every place that changed:

1. **Bolt:** the magatama comet became a sigil comet (a spinning sigil of light with a dark inner sigil). Label: "Genjutsu bolt: sigil comet".
2. **Sphere:** the three tomoe in the iris became the turning sigil. Label: "Genjutsu sphere: sigil eye orb".
3. **Aura:** the orbiting tomoe became small orbiting sigils, each with a pupil. Label: "Genjutsu aura: smoke tongues and sigils". This and the 8 extra bottom rows are the only changes to any aura.
4. **Code:** the `magatama` and `tomoeTube` helpers were removed. The only remaining mention of "tomoe" is the header comment, which says the sigil is original.

No other set-B sprite had a tomoe or Sharingan-like motif.

## Border check

`vfx-b.ts` checks every frame of every sprite and animation, the new walls included, for opaque pixels on the frame border. Stream tiles are exempt because they tile. Stream heads may touch their left edge, which is the joint with the tile. Current output:

```
Border check (opaque pixels on the frame border; stream tiles exempt): earth: 92 frames, genjutsu: 94 frames, chakra: 94 frames, poison: 94 frames
no frame touches its border
```

Fixes, without redesigning:
- **Breaths:** bigger frames, as listed above.
- **Blasts:** bigger genjutsu and chakra frames, and clamped debris.
- **Trails:** bolt, sphere, slash, multi and beast trails are shortened, and their last columns fade out (`fadeLeft`).
- **Chakra hit:** the seal fades over the last two frames, and its ring and sparks are capped inside the frame.
- **Earth hit:** chunks and grit are clamped.
- **Earth stream head:** rocks and rubble are pulled in.
- **Genjutsu wall:** the base smoke is pulled in.
- **Stream joints:** the head continues the tile's pattern over the joint.

## Look rules applied

- **Outlines:** 1 px in the darkest colour of the effect's own ramp, never pure black. Each part is its own layer with its own outline.
- **Ramps:** 9 steps per element (outline, then 8 tones from dark to a near-white core).
- **Energy:** drawn in hard bands by inset distance from the edge.
- **Solids:** rocks, fangs, crows and glass use flat facet shading.
- **Particles:** every sprite has secondary particles.
- **Motion:** speed lines and trails sweep back to the left. Projectile cores stay still; only trails, particles and spin move. Loops are seamless.

## Still to improve

- **Earth:** the palette stays close to monochrome tan. A few blast rim-dust clusters still read as round balls.
- **Genjutsu:** the crows read closer to swallows than to heavy crows. The depth veil reads as a column of staggered glass blocks seen from above, which is the honest view of panels edge-on.
- **Chakra:** the barrier honeycomb is quite regular.
- **Poison:**
  - The 3/4 mist curtain reads more like a slab of gas than a curtain.
  - The purple fumes over green gas look greyish.
  - In the depth view the far end tapers to a point.
- **Depth views in general:** with this projection a wall that runs into the screen shows only its top and its near end. Its long faces are edge-on.
- **Idle frame counts:** the horizontal genjutsu, chakra and poison walls keep 6-frame idles; every new wall (and the rebuilt earth wall) uses 4.
