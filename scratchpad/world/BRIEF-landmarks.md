# World sprite brief: landmarks

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

How to work:
1. Write tools/world-sprites/landmarks.ts. At the bottom it builds the WorldSprite[] list, calls writeGroup('landmarks', sprites) and preview(sprites, join(previewDir(), 'landmarks.png'), { scale: ... }). Import from './kit'.
2. Run: cd /home/user/Ninja-Fantasy-Game && npx tsx tools/world-sprites/landmarks.ts /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/world
   It writes src/assets/world/landmarks/<name>.png plus manifest.json, and the preview into /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/world.
3. LOOK at the results with the Read tool (it displays PNGs). Also save zoomed crops (canvas.scaled(4..6).save(...)) of every sprite and frame strips of every animation into /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/world/landmarks-*.png so you can judge single pixels. Iterate: fix what looks off, re-run, look again. Do at least 4 look-and-fix rounds; stop only when every sprite reads as polished commercial 16-bit art standing next to the character.
4. Typecheck only your file: cd /home/user/Ninja-Fantasy-Game && npx tsc --noEmit -p . 2>&1 | grep 'world-sprites/landmarks' (other artists edit other files at the same time; ignore errors outside your file). It must print nothing.

Hard rules: only create or edit tools/world-sprites/landmarks.ts, files under src/assets/world/landmarks/, and files under /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/world/ named landmarks*. Never touch any other file. Never run git commands that change state (no add, commit, checkout, stash, reset, restore). No new npm packages. Don't cd anywhere else permanently; use absolute paths.

Your group: LANDMARKS AND STONE (roadside shrine pieces, fences and the rocks used as cover).
- stone_lantern "Stone Lantern": a Japanese toro about 1.7 m tall: base, pillar, a firebox with open windows, a wide roof cap with upturned corners, a finial on top, moss and lichen patches, chipped edges (MATERIALS.stone). Anims: lit (loop, 6 frames, 8 fps: the flame flickers in the window and a warm light spill tints the stone around it), unlit (still). Tags: light-source, cover-half, interactable.
- signpost "Signpost": a weathered wooden post about 1.9 m tall with two arrow boards pointing different ways (painted brush marks, abstract, no real text), a tiny roof cap, and a paper charm (ofuda, MATERIALS.paper) tied with rope that flutters. Anims: idle (loop, 6 frames, 8 fps: the charm and rope flutter). Tags: interactable.
- fence "Wooden Fence": a rustic post-and-rail segment about 2 m long and 1 m tall with rope lashings, seen from the front at a slight angle so it tiles side by side. Anims: idle (still), broken (still: a snapped rail and a leaning post). Tags: cover-half, destructible.
- fence_bamboo "Bamboo Fence": a bamboo lattice fence segment about 2 m long and 1.2 m tall with black rope knots. Still. Tags: cover-half, blocks-sight, destructible.
- boulder "Mossy Boulder": about 1.6 m wide and 1.3 m tall, faceted planes (a lit top-left plane, mid side planes, dark lower right), cracks, moss on top, small stones at its foot. Still. Tags: cover-3q, climbable.
- rock "Rock": about 0.9 m wide and 0.6 m tall. Still. Tags: cover-half.
- rocks_small "Pebbles": a cluster of small stones about 0.6 m wide. Still. Tags: ambient.
- river_stones "Stepping Stones": three flat wet stones in water, about 1.4 m wide, with water highlights and a ripple line around them (MATERIALS.water). Anims: idle (loop, 6 frames, 5 fps: the ripples move). Tags: water, climbable.
- hokora "Roadside Shrine": a small wooden hokora shrine about 1.3 m tall on a stone base, with a little gabled roof, a red cloth and a rope (shimenawa) with paper streamers. Still. Tags: interactable.
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
