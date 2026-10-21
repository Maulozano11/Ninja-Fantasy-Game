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
- This is the boss of the first mission: a seven-headed HYDRA. The owner sent a reference image for the design: /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/REF-hydra-owner.jpg (Read it). Keep its design: a serpentine body coiled on the ground with two strong clawed legs and a curling tail, seven long necks fanning out with dragon-like heads (open jaws, rows of white teeth, purple-pink mouths, glowing green eyes), golden-ochre dorsal spikes, horns and belly plates over deep teal-green scales, and glowing green venom.
- Match the game's sprite style and the LANDMARKS look the owner loved (tools/world-sprites/landmarks.ts: low-poly meshes rasterised with the battle camera's projection, a G-buffer, Lambert light from the upper left with cast shadows, the kit's clustered band(), crests on lit edges, dark inner lines). Organic parts (necks, tail) work well as TUBES along curves: a bezier spine with a tapering radius, scale rows as clustered bands along the tube (arcs, not noise), belly plates on the inner side, dorsal spikes along the top. Glows (eyes, venom) can be semi-transparent halos without outline, like fire.
- The owner approves art BEFORE it goes into the game: write your output to the staging folder (below), never into src/assets/world.

How to work:
1. Write tools/world-sprites/creatures.ts (a new group 'creatures'). At the bottom it builds the WorldSprite[] list, calls writeGroup('creatures', sprites), writes the rig file hydra.json next to the manifest (same folder writeGroup uses: process.env.WORLD_OUT ?? src/assets/world, then /creatures/hydra.json) and calls preview(...). Import from './kit'.
2. Run with the staging output (IMPORTANT, never write into src/assets/world):
   cd /home/user/Ninja-Fantasy-Game && WORLD_OUT=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging npx tsx tools/world-sprites/creatures.ts /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2
3. LOOK at the results with the Read tool. Save zoomed crops and frame strips into /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/hydra-*.png. Iterate at least 5 look-and-fix rounds; stop only when it reads as polished commercial 16-bit boss art standing next to the 100 px character.
4. Typecheck only your file: cd /home/user/Ninja-Fantasy-Game && npx tsc --noEmit -p . 2>&1 | grep 'world-sprites/creatures' must print nothing.
5. Final deliverables for the owner: /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/hydra-assembled.png (the whole hydra ASSEMBLED from its parts through hydra.json, at 2x, on the painted-forest green, with the character reference beside it), /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/hydra-anims.png (strips of every animation at 2x), /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/hydra-sever.png (a head bitten off: sever, then the stump raw and burnt, then a regrow), and /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/hydra-NOTES.md. Write the assembling script in your own file (tools/world-sprites/creatures.ts or a helper creatures-*.ts) so it proves the rig data is right.

Hard rules: only create or edit tools/world-sprites/creatures.ts (plus helper files tools/world-sprites/creatures-*.ts) and files under /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/ whose names start with hydra or creatures, plus /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/creatures/. Never touch any other file (not kit.ts, not src/). Never run git commands that change state. No new npm packages. Use absolute paths.

THE SPRITES (real scale: about 6.5 m tall to the top head, about 6 m wide; heads about 0.9-1.1 m long). All face right (the game mirrors).
- hydra_body "Hydra Body": the coiled body, two clawed legs, tail, golden belly plates and dorsal spikes, WITHOUT the necks (the necks are separate). About 5.5 m wide and 2.6 m tall. Anchor = ground contact center. Anims: idle (loop, 8 frames, 6 fps: breathing, the tail tip sways), hurt (one-shot, 3 frames: recoil), death (one-shot, 10 frames: collapses and slumps). Tags: creature, boss.
- hydra_neck_1 ... hydra_neck_7 "Hydra Head 1..7": each is ONE neck rising from its attachment point on the body with its head at the end. Different lengths and curves so the seven heads fan out like the reference: a tall center head, two high side heads, two middle ones and two low ones in front. Anchor = the neck base (where it joins the body). Animations, the same set for every head: idle (loop, 8 frames, 6 fps: slow sway, the jaw opens a little), bite (one-shot, 6 frames: rear back, lunge forward-right and down about 1.5-2 m, snap shut, recover), spit (one-shot, 6 frames: rear, the mouth opens with a bright green glow, spits), roar (one-shot, 6 frames), hurt (one-shot, 3 frames: recoil), sever (one-shot, 8 frames: the cut neck goes limp and drops; the LAST frame is EMPTY), regrow (one-shot, 8 frames: from nothing a new neck pushes out of the stump and unfolds into the idle pose). Every frame of a head uses the same canvas, big enough for the bite lunge, with the same anchor. Tags: creature, boss.
- hydra_stump "Severed Stump": a cut neck stump about 0.6 m that sits at an attachment point. Anims: raw (loop, 4 frames, 6 fps: oozing green), burnt (loop, 4 frames, 6 fps: charred black with a thin smoke wisp: fire seals it and the head can't grow back). Anchor = its base.
- hydra_venom "Venom Gob": a glowing green gob (loop, 4 frames, 12 fps), about 0.4 m, anchor at its center. Tags: ambient.
- hydra_splash "Venom Splash": one-shot, 6 frames: a splat on the ground that leaves a bubbling puddle about 1.5 m wide. Anchor = ground center. Tags: ambient.

hydra.json (the rig the battle engine uses):
{
  "body": "hydra_body",
  "stump": "hydra_stump",
  "heads": [
    { "sprite": "hydra_neck_1", "attach": [dx, dy], "layer": "back" or "front", "head": [hx, hy], "mouth": [mx, my] },
    ... 7 entries
  ]
}
- attach: the neck base relative to the body's anchor, in px (x right, y down), so neck anchor = body anchor + attach.
- layer: drawn behind or in front of the body.
- head: the head's center in the neck sprite's idle frame 0, relative to the neck's anchor (the engine aims attacks at it).
- mouth: the mouth tip in idle frame 0, relative to the neck's anchor (where the venom starts).
Use preview scale 2.

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
