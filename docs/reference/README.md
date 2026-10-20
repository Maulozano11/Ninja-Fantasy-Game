# The owner's art references

Rule from the owner: every reference image he sends is the quality bar, and must be copied as
exactly as possible. It is not reinterpreted. The usual way to do that:

1. Scale his panel so his character matches ours (about 96–100 px tall at 1x).
2. Build the key frame from his pixels:
   - crop the effect;
   - downsample it with an area or box filter;
   - quantize it to a palette sampled from his image;
   - remove the background and his character;
   - clean the edges to a 1 px tinted outline.
3. Derive the other frames of the animation from that key frame. The peak frame is his picture.

Every deliverable puts his crop and our frame side by side at the same scale.

| File | What it is the reference for |
|---|---|
| `s-tier-jutsu-standard.jpg` | The enhanced Great Fire Annihilation, and the bar for every rank S jutsu. |
| `fire-set-owner-reference.jpg` | Every fire effect: bolt, phoenix, stream, breath, sphere, slash, multi, hit, mushroom blast, walls (3 orientations), engulfing aura, fireball, great fireball. |
| `lightning-set-owner-reference.jpg` | Every lightning effect: bolt, stream, breath, sphere, slash, multi, hit, the sky-strike blast, walls (3 orientations), aura. |
| `wind-set-owner-reference.jpg` | Every wind effect (spiral bolt, braided stream, vortex breath, orbit sphere, slash, mini-tornado multi, cross hit, tornado blast, walls in 3 orientations, wind aura) and the wind crane (bottom right). |
| `water-set-owner-reference.jpg` | Every water effect: orb bolt, wave stream with a crest head, fan breath, bubble sphere, crescent slash, triple-droplet multi, splash hit, geyser blast, walls (3 orientations), water aura. The beast stays the approved water dragon already in the game. |
| `earth-set-owner-reference.jpg` | Every earth effect: dusty boulder bolt, spike-row stream with dust, dust-cloud breath with rocks, ringed boulder sphere, rock crescent slash, three rock bullets with dust trails, a side dust burst (unlabelled, between multi and hit: the owner says it is the impact of the rock bullets, sprite `multi_hit`), rock-burst hit, spike eruption blast in a dust cloud, the stone walls (3 orientations, with grass, vines and rubble), the orbiting-rock aura with a dust ring, and a new four-legged stone drake (bottom), which replaces the old stone serpent for good (the owner: delete the old one). |
| `genjutsu-set-owner-reference.jpg` | Every genjutsu effect: eye-orb bolt with dark tendrils, braided ribbon stream with a spiral head, ripple breath full of watching eyes, eye sphere with spikes and an orbit, dark crescent slash, feather-dart multi, star-burst hit, violet pillar over a vortex pool with crow feathers (blast), amethyst crystal walls wrapped in black thorns (3 orientations), dark-flame aura with petals, and a new crow-swarm beast (a vortex of crows, then the flock). |
| `chakra-set-owner-reference.jpg` | Every chakra effect: vortex bolt, seal-chain stream with a starburst head, open-hand breath, ringed spiral sphere, crescent slash, three seal orbs, seal starburst hit, light pillar over a gold seal circle (blast), hexagon barrier walls with gold frames (straight and 3/4), blue flame aura, and a new chakra griffin beast. The owner said his end-on wall (wall_depth) is not right: keep ours for that one. |
| `poison-set-owner-reference.jpg` | Every venom (poison) effect: slime vortex bolt with purple mist, slime stream with a splash head, acid cone breath, orb in a purple ring, fang crescent slash, three glob darts, spiky splat hit, slime pillar over a bubbling pool (blast), slime barrier walls in dark stone rune frames (straight and 3/4), violet-flame aura, and a repainted rearing cobra with purple venom mist (two poses). As with chakra, the owner keeps our end-on wall (wall_depth). |
| `phoenix-owner-reference.jpg` | The fire phoenix: 8-frame flight loop, dive, attack, variant forms. |
| `raiju-owner-reference.jpg` | The lightning beast (raijū): 8-frame pounce loop, plus the phoenix at scale. |
| `kirin-owner-reference.jpg` | Kirin: the normal lightning bolt and the enhanced lightning dragon. |
| `poses/back-view-fighting-stance.png` | A ninja seen from behind, for a special scene or animation later. |
| `ui-battle-owner-reference.jpg` | The new battle interface (2026-10-19): no top navigation bar; ornate bronze frames with gems; a chained boss/target bar at the top centre ("Soberano Northstar - Nv 10"); the round medallion and initiative portraits beside it; a round ornate minimap top right; a tile grid on the ground with the reachable squares tinted; dotted yellow intent lines with small icons; yellow rings under every unit; the action bar at the bottom centre with the active character's portrait medallion, HP bar and chakra gems above it, painted skill icons numbered 1–6 and greyed item slots; Action / Bonus / Reaction pips and the movement bar on its left; the party's four portraits with HP bars at the bottom left. |
| `icons-owner-reference-1.jpg` | The first hotbar skill icons (2026-10-20), left to right: Fireball (a fire spiral), Kirin (a roaring lightning dragon head), Great Fire Annihilation (a curling wave of fire) and Water Wall (a cresting wave). Each sits in his skill-slot frame: dark steel with gold corner brackets and rivets. |
| `icons-owner-reference-2.jpg` | More hotbar skill icons (2026-10-20), left to right: Chidori (a white-blue lightning burst), Rasengan (a blue spiral of chakra), Venom Surge (a green slime stream with purple smoke) and Earth Wall / Muro de tierra (a cracked stone wall with roots and dust), in the same steel-and-gold slot frame. |
