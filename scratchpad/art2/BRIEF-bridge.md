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
- The owner said the river bridge "looks very low quality" (it was painted flat into the map: /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/../mapq/crop-g94.png shows it at 2x). Rebuild it as proper sprites in the LANDMARKS look the owner loved (tools/world-sprites/landmarks.ts: low-poly meshes rasterised with the battle camera's projection, a G-buffer, Lambert light from the upper left with real cast shadows, the kit's clustered band(), crests on lit facet edges, dark inner lines, hand-painted details on top). Look at the landmarks sheets in src/assets/world/landmarks/ and the mockup panorama /home/user/Ninja-Fantasy-Game/docs/mockups/battle-map-panorama.png (the bridge over the river in the middle) before you start.
- The owner approves art BEFORE it goes into the game: write to the staging folder only.

How to work:
1. Write a NEW generator tools/world-sprites/bridge.ts (group 'bridge'; you may copy code from landmarks.ts, do not import from it, and do not edit landmarks.ts). It calls writeGroup('bridge', sprites) and preview(...).
2. Run: cd /home/user/Ninja-Fantasy-Game && WORLD_OUT=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging npx tsx tools/world-sprites/bridge.ts /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2
3. LOOK at every result with the Read tool, zoomed (canvas.scaled(3..4).save(...) into /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/bridge-*.png), at least 4 look-and-fix rounds.
4. Typecheck: cd /home/user/Ninja-Fantasy-Game && npx tsc --noEmit -p . 2>&1 | grep 'world-sprites/bridge' must print nothing.
5. Deliverables for the owner: /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/bridge-preview.png: the bridge composited at 2x over the river crop of the map (/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/../mapq/ has the baked map; use /home/user/Ninja-Fantasy-Game/src/assets/maps/river_forest/ground.webp cropped to x 1300..1900, y 520..860, NOTE: that image still contains the old painted bridge, so ALSO make a version over a plain river strip you paint yourself), with the character reference standing ON the deck between the back sprite and the front rail; and /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/bridge-NOTES.md.

Hard rules: only create tools/world-sprites/bridge.ts and files under /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/ whose names start with bridge, plus /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/bridge/. Never touch any other file. No git state changes. No new npm packages. Absolute paths.

THE BRIDGE (a Japanese-style wooden footbridge, flat, weathered, sturdy):
- It spans the river along X: 7.27 m long (414 px), the deck is 2.4 m deep (from the back edge to the front edge, so with the steep camera the deck top shows 2.4 x 38 = 91 px tall), the deck top sits about 0.4 m above the water, the river is below it.
- Planks run front-to-back (across the deck depth) with gaps and seams, nail heads, worn lighter paths where people walk, some moss and dark water stains at the edges; two long side beams (stringers) show as the deck's front face (about 16 px); square posts go down into the water in front of the face with small ripples where they enter the water (the water itself is NOT part of the sprite except those ripple highlights, keep the rest transparent so the map's river shows).
- Railings about 1 m tall on both long sides: posts every ~1.2 m with capped tops, a top rail and a mid rail, rope or iron lashings at the joints. The back railing is part of the main sprite; the FRONT railing is a separate sprite because units standing on the deck are drawn between them.
- Sprites:
  - bridge "Wooden Bridge": the deck, the back railing, the front face, the posts in the water. Anchor = the FRONT-LEFT corner of the deck top surface (x at the deck's left end, y = the front edge row of the deck top). Still (idle, 1 frame), plus an optional 'idle' loop of 4 frames at 4 fps only if you animate the ripples at the posts (then make it 4 frames). Tags: walkable, flammable, destructible.
  - bridge_rail_front "Bridge Front Railing": only the front railing, same canvas size and SAME anchor as bridge so both sprites line up when drawn at the same point. Still. Tags: cover-half.
- Write /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/bridge/bridge.json: { "lengthPx": ..., "deckDepthPx": 91, "deckTopY": <row of the front edge of the deck top in the frame>, "anchor": [x, y] } so the game can line it up with the river.

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
