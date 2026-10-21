# World sprite brief: camp

You are a senior pixel artist making 16-bit sprites for "Shinobi 5e Chronicles", a commercial ninja tactics RPG. Battles are side-view 2.5D maps (think the look of "A King's Tale: Final Fantasy XV"): a high-quality painted background behind, and everything interactable, destructible or alive in front is a 16-bit sprite. Repo: /home/user/Ninja-Fantasy-Game.

Read first:
- tools/world-sprites/kit.ts: the shared kit (Canvas with set/plot/fillPoly/fillEllipse/line/curve/draw/map/outline/bounds/scaled/save, ramp(), MATERIALS, band(), lambert/sphereLight/cylinderLight, noise/fbm/hash, writeGroup(), preview(), previewDir(), characterRef(), m(), PX_PER_M). Do NOT edit kit.ts: put extra helpers in your own file.
- docs/SPRITE_STYLE_GUIDE.md sections 2 and 3 (outline, light and values): the props must sit in the same world as the character sprites.
- docs/GAMEPLAY_DESIGN.md: how objects are used in battle (cover, stealth, fire, water...).

SCALE IS REAL: 1 m = 57 px (m(meters) converts). A character is about 1.75 m = 100 px tall; preview() draws one next to your sprites so you can check proportions. Sprites are drawn at 1x; the game shows them at 2x on a 1080p screen.


YOUR JOB: the VFX sprites for ranged jutsu and abilities in the new party battles (projectiles that fly from the caster to the target, impacts, area blasts, walls and auras) for these elements: fire, water, wind, lightning.

OWNER'S REFERENCE AND DIRECTION (most important):
- The owner sent example sheets of 16 projectile sprites (about 64 x 64 each). Their LOOK is the target: bold, chunky, very saturated 16-bit FX pixel art; a 1 px dark outline in the darkest color of the effect's own palette (never pure black); a 5-7 step ramp from that dark edge through the body color to a near-white hot core, in hard-edged bands (no smooth gradients); small detached particles (embers, droplets, sparks, pebbles, feathers) and speed lines; dynamic shapes whose tails sweep back (projectiles move to the right, trails go left); transparent background. Example shapes from the sheet: a fireball with a curved tail, a spiral vortex disc, a molten meteor with flames streaming behind, a curling crest wave, a wolf head of flame with open jaws, a long spear with the element wrapping its shaft, a cone-shaped breath burst, an oval ring, three orbs in a fan, two crescent blades, a coiled chain of orbs, a flaming arrow with feathered fletching, a jagged explosive spark burst, a big molten orb with a swirl around it, a phoenix with spread wings, a double helix.
- IMPORTANT, the owner said: "make them different for every element, not just reskin the colors like the example; make its own things for each element". The example sheet reused the same shapes in two palettes; you must NOT do that. Every element has its own forms, materials, particles and silhouettes. Element identities:
- fire: flames with licking tongues, embers and heat shimmer, molten meteors, a phoenix, a fire dragon, fire rings; palette dark red, red, orange, yellow-orange, yellow, cream-white.
- water: droplets, splashes, foam, curling waves, whirlpools, bubbles, spray, a serpentine WATER DRAGON, icy shards for the cold side; palette navy, deep teal, cyan, light cyan, pale aqua, white.
- wind: see-through gusts and pressure rings, crescent air blades with white speed streaks, swirling leaves, tornado funnels, feathers, a crane of wind; palette deep green-teal, sage, mint, pale mint, white-green, white (keep it airy: many semi-transparent strokes).
- lightning: jagged branching bolts, forks, crackling balls of sparks (a chidori-like chirping hand burst), arcs between points, a thunder hound and a thunder bird; palette indigo, royal blue, electric blue, light blue, blue-white, white, with small yellow sparks.

THE ROLES every element needs (each element designs its OWN shape for each role; nothing is a recolor of another element):
1 bolt: a small fast projectile for single-target jutsu (fire: a fireball with a curved tail; lightning: a crackling spark ball; earth: a spinning rock; ...).
2 beast: a big signature creature projectile (fire: dragon or phoenix; water: water dragon; wind: crane; lightning: thunder hound; earth: stone serpent; genjutsu: crow swarm; chakra: fox spirit; poison: venom snake).
3 stream: a line attack drawn as a TILEABLE segment 64 px long that the game repeats along the line, plus a head piece 'stream_head' (fire jet, water torrent, wind blade line, lightning beam, earth spike row, genjutsu ribbon, chakra beam, acid jet).
4 breath: a cone attack spreading to the right from its origin at the left middle of the frame (96 x 64).
5 sphere: a big orb that explodes on arrival (fire: molten core; water: water bomb; wind: compressed air ball; lightning: thunder sphere; earth: boulder; genjutsu: illusion orb with an eye; chakra: spiral sphere; poison: acid bubble).
6 slash: a crescent or blade wave (wind is the star here).
7 multi: three or more small projectiles in a staggered fan.
8 hit: impact burst where a single attack lands (one-shot, 6 frames, 64 x 64).
9 blast: area explosion about 3 m across seen from the battle camera (about 170 x 120 px, ground ellipse 2/3 as tall as wide, with a column of the element and debris; one-shot, 8 frames; anchor at the ground center).
10 wall: a barrier about 4.5 m long and 1.8 m tall rising from the ground (one-shot 'rise', 6 frames, then 'idle' loop of 4 frames): earth wall of stacked rock, water wall, wind wall, fire wall, lightning fence, genjutsu mirror veil, chakra seal barrier, poison mist curtain.
11 aura: a swirl around a standing character (loop 6 frames, about 80 x 120 px, transparent center), for charging and buffs.

How to work:
1. Write tools/world-sprites/vfx-a.ts (helpers allowed in tools/world-sprites/vfx-a-*.ts). For each element call writeGroup with the group name vfx_<element> ('vfx_fire', 'vfx_water', 'vfx_wind', 'vfx_lightning'). Sprite names: <role> (e.g. bolt, beast, stream, stream_head, breath, sphere, slash, multi, hit, blast, wall, aura). Projectiles (bolt, beast, sphere, multi, slash, stream_head): 'fly' loop, 4 frames, 12 fps, facing RIGHT, anchor at the center, the core stays put so the projectile doesn't jitter (the game rotates them toward the target). stream: 'fly' loop 4 frames, tileable left-right. breath: 'fly' loop 4 frames. hit and blast: one-shot as described. wall: 'rise' (one-shot) and 'idle' (loop). aura: 'idle' loop. Tags: 'vfx'. Frame sizes: 64 x 64 for most, 96 x 64 when a projectile needs it, the sizes above for blast, wall and aura (one size per sprite).
2. Run: cd /home/user/Ninja-Fantasy-Game && WORLD_OUT=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging npx tsx tools/world-sprites/vfx-a.ts /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2
3. LOOK at your work with the Read tool, zoomed 3-4x; at least 5 look-and-fix rounds per element. The bar is the owner's example: crisp, bold, readable, exciting, and each element clearly its own.
4. Typecheck: cd /home/user/Ninja-Fantasy-Game && npx tsc --noEmit -p . 2>&1 | grep 'world-sprites/vfx-a' must print nothing.
5. Deliverables for the owner: for each element /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/vfx-<element>.png (all its roles at 2x on a dark background, labeled), /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/vfx-vfx-a-anims.png (animation strips), and /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/vfx-vfx-a-NOTES.md.

Hard rules: only create tools/world-sprites/vfx-a.ts (and its helpers) and files under /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/ whose names start with vfx, plus /tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/vfx_<element>/ for your elements. Another artist does the other elements at the same time in another file: don't touch it. Never touch any other file. No git state changes. No new npm packages. Absolute paths. Deterministic (no Math.random). Scale: 1 m = 57 px; a character is about 100 px tall.
