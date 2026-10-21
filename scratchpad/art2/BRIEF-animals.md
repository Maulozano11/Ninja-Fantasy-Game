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
1. Edit or write tools/world-sprites/animals.ts. At the bottom it builds the WorldSprite[] list, calls writeGroup('animals', sprites) and preview(...). Import from './kit'.
2. Run with the staging output (IMPORTANT, never write into src/assets/world):
   cd /home/user/Ninja-Fantasy-Game && WORLD_OUT=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging npx tsx tools/world-sprites/animals.ts /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2
   It writes /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/animals/<name>.png plus manifest.json, and the preview into /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2.
3. LOOK at the results with the Read tool (it displays PNGs). Save zoomed crops (canvas.scaled(4..6).save(...)) of every sprite and frame strips of every animation into /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/animals-*.png so you can judge single pixels. Iterate: fix what looks off, re-run, look again. Do at least 4 look-and-fix rounds; stop only when every sprite reads as polished commercial 16-bit art standing next to the character.
4. Typecheck only your file: cd /home/user/Ninja-Fantasy-Game && npx tsc --noEmit -p . 2>&1 | grep 'world-sprites/animals' (other people edit other files at the same time; ignore errors outside your file). It must print nothing.
5. Final deliverables for the owner: /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/animals-lineup.png (all ten animals side by side at 4x with the character reference), /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/animals-anims.png (frame strips of every animation at 4x), and /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/animals-NOTES.md.

Hard rules: only create or edit tools/world-sprites/animals.ts (plus a helper file tools/world-sprites/animals-*.ts if you need one) and files under /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/ whose names start with animals, plus /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/animals/. Never touch any other file (not kit.ts, not src/). Never run git commands that change state (no add, commit, checkout, stash, reset, restore). No new npm packages. Use absolute paths.

Your group: SMALL ANIMALS. tools/world-sprites/animals.ts already has rabbit, deer, crow and sparrow (keep their names and animations; they are approved). ADD the six missing ones, at the same quality, in the same file:
- butterfly_blue "Blue Swallowtail" and butterfly_yellow "Yellow Butterfly": fly (loop, 4 frames, 12 fps: wings open, half, edge-on, back) and rest (loop, 4 frames, 4 fps: perched with wings slowly opening and closing). Real size is about 8 cm; draw them up to 2x bigger than real so they read, keep meters real. Anchor at the body center. Tags: animal, ambient.
- dragonfly "Dragonfly": hover (loop, 4 frames, 14 fps, translucent wings with a glint) and dart (one-shot, 4 frames, a quick forward dash with a motion smear). Anchor at the body center. Tags: animal, ambient.
- frog "Frog": green with a pale throat, about 0.1 m (draw up to 1.6x). Anims: idle (loop, 8 frames, 6 fps: throat pulse, a blink), jump (one-shot, 6 frames: crouch, leap in an arc to the right, land; every frame the same canvas, anchor at the start position's ground). Tags: animal, ambient, water.
- koi "Koi": orange and white koi about 0.4 m, seen from above at the battle camera's angle swimming in the river. Anims: swim (loop, 8 frames, 8 fps: the body and tail undulate, a faint wake), jump (one-shot, 10 frames: rises from the water line in an arc and dives back with a splash ring and droplets; anchor on the water line; every frame the same canvas). Tags: animal, ambient, water.
- fireflies "Fireflies": a group of 6-8 glowing dots drifting and blinking in a box about 1.2 m wide and 1 m tall (loop, 12 frames, 8 fps), warm yellow-green with a 1 px soft glow, no outline. Anchor at the box center. Tags: ambient, light-source.
If you have time left after the six are polished, fix these small issues the owner noticed on the old four (keep their canvas sizes, anchors and frame counts): the sparrow's face reads poorly, the deer's spots are single pixels (make them small clusters), the rabbit's belly flickers in the hop frames.
Use preview scale 4.

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
