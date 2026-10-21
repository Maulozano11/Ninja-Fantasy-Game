# World sprite brief: camp

You are a senior pixel artist making 16-bit sprites for "Shinobi 5e Chronicles", a commercial ninja tactics RPG. Battles are side-view 2.5D maps (think the look of "A King's Tale: Final Fantasy XV"): a high-quality painted background behind, and everything interactable, destructible or alive in front is a 16-bit sprite. Repo: /home/user/Ninja-Fantasy-Game.

Read first:
- tools/world-sprites/kit.ts: the shared kit (Canvas with set/plot/fillPoly/fillEllipse/line/curve/draw/map/outline/bounds/scaled/save, ramp(), MATERIALS, band(), lambert/sphereLight/cylinderLight, noise/fbm/hash, writeGroup(), preview(), previewDir(), characterRef(), m(), PX_PER_M). Do NOT edit kit.ts: put extra helpers in your own file.
- docs/SPRITE_STYLE_GUIDE.md sections 2 and 3 (outline, light and values): the props must sit in the same world as the character sprites.
- docs/GAMEPLAY_DESIGN.md: how objects are used in battle (cover, stealth, fire, water...).

SCALE IS REAL: 1 m = 57 px (m(meters) converts). A character is about 1.75 m = 100 px tall; preview() draws one next to your sprites so you can check proportions. Sprites are drawn at 1x; the game shows them at 2x on a 1080p screen.

Style rules (match the characters):
- Light from the upper left. 6-step hue-shifted ramps (0 outline, 1 dark, 2 shadow, 3 base, 4 light, 5 highlight). Most of an object sits in steps 1-3; steps 4-5 are short crests, lit rims and glints, never big flat light areas.
- Shading reads as hand-placed clusters (2-4 px groups like brush strokes): never per-pixel noise speckle, never smooth gradients, never checkerboard dither over big areas, never pillow shading (the light comes from the upper left, not from the middle).
- 1 px outline tinted by the material (Canvas.outline()), plus 1 px dark inner lines where parts overlap or meet (plank seams, hoops, leaf clumps against each other, stone facets).
- Strong, intentional silhouettes: leaf clumps, planks, faceted stones, fur tufts. No shapeless blobs. Details must read at 2x.
- Build colors with ramp(MATERIALS.xxx) so every group shares the same wood, stone, leaves, fire. Saturated accents only where they mean something (fire, lacquer, flowers, a koi).
- Anything with a direction faces right (the game mirrors it).
- Frames are tight (1-2 px margin for the outline). ALL frames of one sprite share the same canvas size and the same anchor (make every frame the size of the largest one, e.g. an explosion). anchor = ground contact point: x at the base center, y the lowest row that touches the floor. Flying things: anchor at the body center and tag 'ambient'.
- Animations: loops are seamless (the last frame flows into the first). Things rooted in the ground never move at the base; sway grows toward the top (1-3 px on trees, 1 px on bushes). Speeds: sway 5-6 fps, fire 10-12 fps, wings 10-14 fps, idle twitches 4-6 fps (repeat frames to hold a pose). One-shot effects (break, explode, rustle, jump) use loop: false and show anticipation, impact and settle.
- Tags tell the battle engine what an object does: 'cover-half', 'cover-3q', 'blocks-sight', 'hide-spot', 'destructible', 'flammable', 'explosive', 'climbable', 'interactable', 'light-source', 'water', 'ambient', 'animal'.
- Deterministic: hash/noise with fixed seeds, never Math.random, so re-running gives the same PNGs.


OWNER'S DIRECTION (most important):
- The owner loved the LANDMARKS look (tools/world-sprites/landmarks.ts: low-poly meshes rasterised with the battle camera's projection, a G-buffer, Lambert light from the upper left with real cast shadows, the kit's clustered band(), crests on lit facet edges, dark inner lines where parts meet, hand-painted details on top). Look at the landmarks sheets in src/assets/world/landmarks/ and their preview before you start; that is the quality and look to match.
- For foliage they want the look of their reference images (big lobes, painted dabs, dark green ragged outline): /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/world/REF-tree-owner.png and REF-bush-owner.png.
- The owner approves art BEFORE it goes into the game: write your output to the staging folder (below), never into src/assets/world.
How to work:
1. Edit or write tools/world-sprites/camp.ts. At the bottom it builds the WorldSprite[] list, calls writeGroup('camp', sprites) and preview(...). Import from './kit'.
2. Run with the staging output (IMPORTANT, never write into src/assets/world):
   cd /home/user/Ninja-Fantasy-Game && WORLD_OUT=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging npx tsx tools/world-sprites/camp.ts /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2
   It writes /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/camp/<name>.png plus manifest.json, and the preview into /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2.
3. LOOK at the results with the Read tool (it displays PNGs). Save zoomed crops (canvas.scaled(4..6).save(...)) of every sprite and frame strips of every animation into /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/camp-*.png so you can judge single pixels. Iterate: fix what looks off, re-run, look again. Do at least 4 look-and-fix rounds; stop only when every sprite reads as polished commercial 16-bit art standing next to the character.
4. Typecheck only your file: cd /home/user/Ninja-Fantasy-Game && npx tsc --noEmit -p . 2>&1 | grep 'world-sprites/camp' (other people edit other files at the same time; ignore errors outside your file). It must print nothing.
5. Final deliverables for the owner: /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/camp-lineup.png (every camp sprite side by side at 3x on the painted-forest green, with two landmarks sprites (stone_lantern, boulder) and the character reference at the ends for comparison), /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/camp-anims.png (frame strips of every animation at 3x) and a short note at /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/camp-NOTES.md listing what changed and anything you are unsure about.

Hard rules: only create or edit tools/world-sprites/camp.ts (plus a helper file tools/world-sprites/camp-*.ts if you need one) and files under /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/ whose names start with camp, plus /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/camp/. Never touch any other file (not kit.ts, not src/). Never run git commands that change state (no add, commit, checkout, stash, reset, restore). No new npm packages. Use absolute paths.

Your group: CAMP PROPS, a full REBUILD of the existing tools/world-sprites/camp.ts in the landmarks style. The first version (current camp.ts, about 2000 lines) was rejected by the owner for its style; reuse its proportions, list, animation names, tags and the good parts of its flames, smoke and explosion, but remodel every solid object (stones, logs, tent, barrels, crates, sacks, rack) with the landmarks mesh pipeline: copy the camera/projection, G-buffer, lighting, band and outline code from landmarks.ts into camp.ts (do not import from landmarks.ts; copy what you need). Keep the sprite names and animation names exactly, because the game already uses them:
- campfire "Campfire": a ring of stones around crossed logs, about 1 m wide. Anims: burning (loop, 8 frames, 12 fps: layered flames with red tips, orange body, yellow core and a few white-hot pixels, embers rising, a warm light spill on the stones), smoldering (loop, 6 frames, 6 fps: red coals and a thin wisp), out (still: charred logs and ash). Tags: light-source, interactable.
- smoke "Smoke Column": semi-transparent rising smoke (8 frames, 8 fps), about 0.6 m wide and 2 m tall, soft puffs drifting up and to the right, alpha about 90-170, no outline. Anchor at the bottom center. Tags: ambient.
- tent "Canvas Tent": an A-frame canvas tent about 3 m wide and 2 m tall in 3/4 view (front entrance with an open flap, ridge pole, sagging canvas with real cloth folds, guy ropes and stakes, a couple of patches). This was the weakest piece: model the canvas as a mesh (two slanted planes with sag and fold creases), light it like the landmarks. Anims: idle (loop, 4 frames, 4 fps: the open flap sways), burnt (still: scorched holes, sagging frame). Tags: cover-3q, blocks-sight, flammable, destructible, interactable.
- barrel "Barrel": about 0.6 m wide and 0.9 m tall, staves with seams, iron hoops, lid. Anims: idle (still), hit (one-shot, 4 frames), broken (one-shot, 8 frames). Tags: cover-half, destructible.
- barrel_explosive "Explosive Barrel": the same barrel lacquered red (MATERIALS.red) with a painted flame mark (no real text), a rope wrap and a short fuse. Anims: idle (still), lit (loop, 4 frames, 12 fps: the fuse sparks), explode (one-shot, 10 frames: white flash, fireball, smoke puffs and debris; every frame uses the big canvas, enough for a 3 m blast, with the barrel at the same anchor). Tags: cover-half, destructible, explosive.
- crate "Wooden Crate": about 0.8 m cube in 3/4 view, planks, diagonal brace, nails. Anims: idle (still), broken (one-shot, 7 frames). Tags: cover-half, destructible, climbable.
- crate_stack "Stacked Crates": two crates plus a smaller one on top, about 1.6 m tall. Still. Tags: cover-3q, blocks-sight, destructible, climbable.
- sacks "Rice Sacks": three tied burlap sacks (MATERIALS.canvas), about 0.6 m tall and 1.2 m wide. Still. Tags: cover-half.
- weapon_rack "Weapon Rack": a wooden rack about 1.6 m tall holding two spears and a bo staff. Still. Tags: interactable, destructible.
Use preview scale 3.

## Art-direction checklist (judge every sprite and frame against it before you finish)
- Proportions: measure bounds() heights against m(meters) and against the 100 px character; fix anything off by more than about 10%.
- Light from the upper left on every sprite; value budget (mostly steps 1-3); clusters, not speckle; no pillow shading, no banding, no flat unshaded areas.
- Silhouette: appealing and readable at 1x and 2x; no orphan pixels or jaggies; continuous outline; dark inner lines where parts overlap.
- Material reads clearly (wood grain and plank seams, stone facets and chips, leaf clumps, fur tufts, flame shapes).
- Palette coherent with MATERIALS and across the group.
- Animation: smooth, seamless loops (compare the last frame with the first), rooted bases fixed, no whole-sprite jitter; one-shots have anticipation, impact and settle.
- Technical: one canvas size and one anchor per sprite, anchor on the ground row, sensible tags, manifest correct, deterministic.

## Battle-map context
The map now uses a steep camera: 57 px per meter across, 38 px per meter of depth (so ground ellipses such as shadows, lily pads, stone rings and tops of stumps are about 2/3 as tall as wide, not paper-thin). The sprites stand on a painted, misty green forest stage.
