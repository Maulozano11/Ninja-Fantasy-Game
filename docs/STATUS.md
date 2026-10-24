# Status (snapshot of 2026-10-21)

What exists, which branch holds what, what is waiting for the owner, and what is left. Update the
lines your pull request changes (see `CLAUDE.md`, "Working in parallel").

Integration branch: `claude/eloquent-noether-ix51z1` at `8dfd107`, 359 commits on top of `main`
(2026-10-12 to 2026-10-21). On it, `npm test` passes all 161 tests and `npx tsc --noEmit -p .` is
clean.

## 1. What is in the game (integration branch)

**Screens and flow** (`src/App.tsx`)
- Title screen over the owner's animated burning forest: Start game (continue), New game (opens
  the creator), Load game (mission under way, ninjas made on this device, or a JSON sheet),
  Practice (practice battles, arena, campaign arcs).
- No web navigation: every screen has a "Main menu" button. `#creator`, `#missions` and `#combat`
  open a screen directly, for testing.
- Saves in localStorage only: `shinobi5e.hero.v1`, `shinobi5e.roster.v1` (up to 12 ninjas),
  `shinobi5e.mission.v1` (one autosave), `shinobi.lang` and `shinobi.dice` (the dice style).

**Character creator** (`src/components/CharacterCreator.tsx`, laid out like Baldur's Gate 3)
- Steps: Origin, Clan, Class, Appearance, Abilities, Jutsu. Plus a pixel-paint editor.
- 8 legend presets (`LEGENDARY_PRESETS`): Solen the Founder King (default sheet), Akira the Ember
  Ronin, **Aiden the Crimson Knight (the owner's art standard)**, Kaien the Storm Avenger, Hiro the
  Sunburst Hero, Raiga the Warlord of Ash, Ren the Night Prince, **Lyra the Gilded Blade (the owner's first
  heroine, on his bare female body)**.
- Companions: Hana (Kōton, Medical), Kenji (Ryusei, Genjutsu), and every preset.
- 5 classes (Ninjutsu, Taijutsu, Genjutsu, Medical, Bukijutsu) and 9 feats.
- Appearance (`src/sprite/catalog.ts`):

| Group | Options |
|---|---|
| Bodies | 3 (male, female, bulky) |
| Hair | 35 (plus `hair_none`) |
| Eyes / face shapes | 10 / 7 (incl. the owner's "valiant", Lyra's "keen" and "fine", Solen's "founder" and his "roman", the default male head, on his own neck) |
| Face marks and masks | 7 |
| Tops / bottoms / skirts / waist | 9 / 5 / 4 / 5 |
| Armor | 16 (plus `armor_none`) |
| Feet / hands | 7 / 5 |
| Capes | 8 |
| Held | 9 (plus `held_none`): katana built from parts, crystal, ice crystal, flame longsword, kunai, naginata, spiral, lightning, palm |
| Accessories | 13 |
| Headband | Plain cloth (no plate, emblem or slash since 2026-10-22, `headband/plain-cloth`): none, forehead, neck, arm, waist; tails or not; cloth colour |
| Chakra | 9 types, which are the ninja's elemental nature: 7 offered (Fire and Lightning with 2 bursts each, Water, Wind, Earth; Light and Void without element) and 2 pending, out of the selection (Shadow, Spirit); any colour for any type; 8 cast styles ("eye" hidden) |
| Poses | 7 creator, 5 moving, 4 camp |

**Clans** (phase 1; source of truth `docs/CLANS_DESIGN.md`)

| Clan | Bonus | Abilities |
|---|---|---|
| Mirai | +2 DEX +1 INT | Eye of Tomorrow (enemy intents), Premonitory Evasion (reaction), Pursuing Flame |
| Kōton | +2 CON +1 INT | Modular Architecture: metal Block (bonus action) and Wall (action), with HP, 2 at most |
| Ryusei | +2 DEX +1 WIS | Weapon Nodes, Shooting-Star Thrust (Estocada Fugaz, once Warp Strike), Spatial Swap |
| Northstar | +2 CHA +1 WIS | Aura of Sovereignty, Command, Natural Submission |

Counter cycle Mirai > Northstar > Ryusei > Kōton > Mirai. Enemy ranks Minion, Captain, Sub-boss,
Boss. Paths of Mastery: designed, not built.

**Jutsu**
- 26 creator jutsu (`JUTSUS_DATA`; the explosive tag is an item since `chakra/progression`); 5 slots: Utility, Element I, Element II, Clan secret (fixed),
  S-rank. Battle-only: 8 clan abilities and the hydra's Venom spit and Roar.
- The nature gates the elemental jutsu in the creator (`chakra/decisions`, 2026-10-21): the Element
  and S-rank slots offer only the ninja's own element plus the jutsu with no element; Utility and
  the clan secret are free; Light and Void get no elemental jutsu yet (`src/rules/jutsuNature.ts`).
  How it gates is the builder's proposal, waiting for the owner's approval (section 3).
- His jutsu answers (2026-10-21, on `chakra/progression`): a new ninja picks rank D and C jutsu and
  its clan's (the S-rank slot shows locked, "Se desbloquea más adelante"; legends and made ninjas
  keep theirs); the explosive tag is a consumable item (battle item slots: throw, or hide on the
  ground against the hider's jutsu DC; old sheets with the jutsu get 2 tags in their pouch, refilled
  every mission); the chakra type is fixed once the ninja is made
  (`src/rules/progression.ts`, `src/rules/pouch.ts`). The taijutsu, kenjutsu and genjutsu jutsu
  belong to their class (his answer "9 los que elijan de clase genjutsu kenjutsu o taijutsu"):
  Taijutsu Master, Bukijutsu Master (kenjutsu) and Genjutsu Adept; Ninjutsu and Medical learn none;
  utility and clan jutsu stay open; a class change in the creator swaps them, with a note
  (`src/rules/jutsuClass.ts`). Level 5 (his answer "nivel 5 suena bien para segundo elemento o
  subir de rango tu elemento principal"): a ninja chooses a second element (its rank D and C jutsu)
  or a higher rank of its main element (its rank B jutsu), for good; every ninja is offered the
  ranks of its level; Kaien is Rayo + Fuego and Raiga Fuego + Tierra ("ok con kaien y raiga"),
  saved copies updated on load (`src/rules/natureGrowth.ts`). No level-up screen yet: the choice is
  made in the creator. The ladder (his answer "feat del tercer elemento opcion a nivel 5 esta bien al
  subir al nivel 7 te un rango A y al 10 un rango S", on `chakra/progression-2`): rank A at level 7,
  the S-rank slot at 10, for every ninja; the feat **Tres naturalezas** (level 9 and a second
  element: a third element, and once per long rest 1 chakra off a jutsu of one of its elements cast
  right after one of another), its requirements enforced in the creator and its discount tracked in
  battle (`src/rules/feats.ts`).
- VFX for 8 elements (fire, water, wind, lightning, earth, genjutsu, chakra, poison), all from the
  owner's v3 sheets: full effect set, walls in 3 orientations, a beast each. Signature effects:
  Fireball / Great Fireball, Great Fire Annihilation (normal and enhanced), Kirin. Solid effects
  (beasts, rock, crystal, the poison and chakra walls' frames, wood, dragon heads) carry the
  characters' black line, energy none (2026-10-22, `vfx/solid-outline-apply`).
- Hotbar icons from the owner's sheets 1–7 and 12 (`src/assets/ui_icons/`): 10 jutsu, 3 for jutsu
  not built yet (Rasengan, Venom Surge, Water Stream), 17 actions, great_fireball. Sheets 13–22
  (2026-10-22, on `icons/sheet-13`): 27 more jutsu, the four item buttons (pill, bandage, antidote,
  explosive tag, which now sit in the steel skill slots) and Hide Tag, Throw Stone and Drag Body;
  `tools/refs/icons-from-ref-13.py`, manifests `manifest_13.json` to `manifest_22.json`.

**Battle** (engine `src/battle/`, screen `src/components/battle/`)
- 2.5D side view in metres, no visible grid. River Forest map, 60 × 20 m (river, bridge, stepping
  stones, hill camp, lookout). 2 zoom levels, minimap, speed 1×/2×/3×.
- 5e turns: action, bonus action, movement, reaction; opportunity attacks, half and three-quarters
  cover, elevation (3 levels), shove, prone, mercy knock-outs, death saves.
- Stealth phase in turns: vision cones, suspicion, silent takedowns, bodies, thrown stones, noise.
- AI: ally orders (Aggressive, Defensive, Support); enemies commit to intents and use clan moves
  (D21).
- Hydra boss: 7 heads with their own HP; a cut head grows back unless the stump is burned,
  electrified or blown up.
- Walls and structures, water (shallow, deep, conducts lightning), fire spreading through foliage,
  wind, explosive barrels and tags, traps and wires. Kawarimi reaction, hand seals need free
  hands, items (soldier pills, bandages, antidotes).
- HUD from the owner's kit, tutorial tips, generated sound. Mouse plus keyboard.

**Missions and camp** (`src/data/missions.ts`, `src/game/missionRun.ts`, `src/rules/`)
- One mission, River Forest Patrol (rank C): Cedar Road (`cedar_rogues`), short stop, River Ford
  (`river_patrol`, stealth), camp at Shrine Clearing (possible `night_raid`), then `hydra`.
- Enemy templates: Rogue, Hunter-nin, Raider, Kagero (captain); mixed clans per slot (D6).
- Camp: 3 incense sticks each, 30 activities, fire, dinner, moon, night roll, ambush, morning;
  Tension, Exhaustion, status effects; painted night scene with camp poses.
- Difficulty: Story, Normal, Legend (permadeath), plus a no-randomness mode.

**Languages**: Spanish and English on title, creator, battle, missions and camp. The old Practice
screens (`CampaignMode.tsx`, `ArenaSandbox.tsx`) are English only.

## 2. Branches

| Branch | Tip on origin | Holds | State |
|---|---|---|---|
| `main` | `6e2e8dc` | AI Studio scaffold | Nothing goes there yet |
| `claude/eloquent-noether-ix51z1` | `8dfd107` | Everything approved | **Integration**, live |
| `aiden/*` (8 branches) | `aiden/integration` `995be5d`; parts `armor` `dee8d17`, `boots-gloves` `c5dec79`, `cape` `ad183d4`, `eyes` `313d514`, `flame-sword` `4052fef`, `hair` `201cb44`, `head-shape` `930d3ad` | The owner's Aiden, part by part | Merged (`c2b84f5`) |
| `icons/sheet-12`, `icons/sheet-12-fix` | `cd8e07b`, `b8dd15c` | Sabueso rayo, Luna creciente, Nirvana | Merged (`8dfd107`) |
| `icons/sheet-13` | see the branch | His icon sheets 13–22 (34 icons: earth, fire, lightning, water, wind, taijutsu and genjutsu jutsu, the items, Hide Tag and the stealth actions); copies of his pictures | **Pushed, to merge** |
| `camp/owner-ref` | `70293ba` | Read, lean and sit camp poses from his picture (`camp-poses-owner-reference.webp` on that branch); touches `rig.ts`, `compose.ts`, `ctx.ts`, `campfx.ts` | **WIP, being redone**: copy his book and both hands exactly; show Aiden reading |
| `camp/hands-book` | `a3ae184` | Earlier pass, already inside `camp/owner-ref` | Superseded |
| `ryusei/phase` | `1bd38c9` | Warp Strike (now Shooting-Star Thrust) and Spatial Swap carry the ninja as a see-through electric-blue light body (`src/sprite/phase.ts` + tests, renderer, playback) | **Waiting for approval.** The Shooting-Star Thrust choreography is on `ryusei/warp-throw`. Swap stays |
| `ryusei/warp-throw` | local, not pushed (the comet, the rename and a merge of the integration branch on top of `999cb29`) | `ryusei/phase` + `poses/throw-pierce` + the Shooting-Star Thrust (Estocada Fugaz, once Warp Strike) choreography (the owner, 2026-10-21): the throw, the weapon flying point first, the phase starting in his release pose, the landing in the `pierce` thrust. Review fixes: the weapon is first drawn clear of his face; empty hands, a technique in the palm or a stowed weapon throw a kunai from the pouch (the stowed weapon stays on the back, the kunai fades out as light after the thrust); a short warp's weapon hangs in the air for the catch; the frames are made ahead for every Ryusei, Node or not, weapon drawn or stowed. Then (2026-10-21, his "shooting star"): the flying weapon is a shooting star, a white-hot head with a twinkling star at its point and a long comet's tail of the phase's blues that tapers along the curve of the flight, sheds sparkles and lights the night (`src/sprite/comet.ts` + tests, `warpFlight.ts`, `renderer.ts` drawNight); and the rename is applied everywhere players see it, with D24. Review fixes: a deep blue line round the tail so it reads over the light body and pale ground; the sparkles flung out of the tail's sides as a stardust wake that outlasts it; the night light round it blue, not the grass's green; the comet about 4x cheaper to make and made once per moment; captures of diagonal and up-the-map flights, where the tail follows the curve. Spatial Swap unchanged | **Merged** (approved 2026-10-21 under the owner's 24-hour delegation: "estas aprovado para aprovar cosas como las que me estas pidiendo permiso por 24 horas") |
| `poses/throw-pierce` | `f722aee` | `throw` (4 frames, release copied from his Warp Strike picture, now the Shooting-Star Thrust) and `pierce` (5-frame lunge) poses, in the creator stance bar; `src/sprite/strike.test.ts` | **Waiting for approval**; `ryusei/phase` needs it |
| `icons/sheets-8-11` | `e413f5f` | His sheets 8–11 (14 icons): adamantine chains, dragon fire bomb, dragon fire stream, Kōton block and wall, Mirai evasion, Northstar Command and Submission, Ryusei swap and warp, shadow clone, 64 palms, water dragon, wood dragon | **WIP**: fixes, plus phase-style ninjas in Intercambio / Golpe Warp (now Estocada Fugaz) |
| `scarlet/study` | `3b5dfe9` | His new character picture (`scarlet-owner-reference.jpg`) and study scripts `tools/refs/scarlet*`; nothing in `src` | **Removed from the game** (2026-10-24, the owner: *"scarlet lo vas a borrar del juego completamente"*); the branches stay on origin only as a record, never to be merged |
| `chakra/jutsu-tint` | not pushed (local) | Elemental jutsu, their beasts and walls in the caster's chakra colour (`src/sprite/vfxTint.ts`, `src/components/battle/vfxTint*.ts`; `docs/GAMEPLAY_DESIGN.md`, "The chakra colour colours the elemental jutsu") | **The owner approved the colours** (2026-10-21); wired into the battle (checked in the browser), review fixes done (no recolouring on the screen's thread, memory capped); answered 2026-10-21: the black Kirin stays (pink and violet kanji), other colours stay as they look, "la curación siempre se verá verde" (the green heal is on `jutsu/d-c-set`); not merged |
| `chakra/decisions` | not pushed (local) | The owner's four answers on the chakra types (saved legends updated, Shadow and Spirit pending, Cinder Nova kept) and the nature gating the elemental jutsu in the creator | **For review** |
| `chakra/progression` | `51b44c0` on origin (WIP); the finished work is local, not pushed | His jutsu answers: D/C + clan for a new ninja (S-rank slot locked), the explosive tag as an item (throw / hide, save migration), the chakra type fixed once made; the taijutsu, kenjutsu and genjutsu jutsu gated by class; level 5: a second element or a higher rank, Kaien and Raiga's second natures | **For review** |
| `jutsu/d-c-set` | not pushed yet (merged with the integration branch at `26371c4`) | 12 rank D and C jutsu (data, rules, AI, log; `docs/GAMEPLAY_DESIGN.md`, "Rank D and C jutsu"), then their effects (three projectile paths, the joined Spark Fan, the white Bleeding Cut, the Rush's tackle pose), in the caster's chakra colour; review fixes (sword arts need a blade, charges stop at deep water and cliffs); his answers 4–8 (Numb 2 rounds, silent Mirage and Bleeding Cut, the water aura on the Mystical Palm); healing always green (the Palm and the Dew never take the chakra colour) | **Merged** (the owner approved 11 of 12; the Bleeding Cut waits for its blood spray on `jutsu/bleeding-blood`). Every element gains D/C jutsu in the nature filter's and the class gate's offers (their tests updated) |
| `chakra/progression-2` | on origin | His answer "feat del tercer elemento opcion a nivel 5 esta bien al subir al nivel 7 te un rango A y al 10 un rango S": rank A at level 7 and S at 10 for every ninja, the feat Tres naturalezas (requirements in the creator, third element pick, battle discount), kenjutsu and level 5 confirmed in the docs | **Merged** (his decisions) |
| `chakra/lightning-crackle` | on origin | Lightning's second burst, *Estática de batalla* / Battle Static (his name; id `cyan`): small bolts crackling all the time, more and longer while empowered (an enhanced jutsu's cast, the creator's chakra aura), no aura, on a 10 s loop (`src/sprite/chakra.ts`, `chakraNature.ts`, `chakraInfo.ts`, `src/sprite/chakra.test.ts`, `creator/words.ts`; the callers take the loop from `chakraLoop()` and pass `empowered`: `ShinobiSpriteCanvas.tsx`, `battle/unitArt.ts`, `battle/renderer.ts`, `battle/playback.ts`) | **Merged** (approved under his 24-hour delegation) |
| `jutsu/bleeding-blood` | pushed | The Bleeding Cut's blood (his answer "apruebo los 12 jutsus con excepcion del de tajo sangrante..." and "las gotas de sangre manchan la pantalla..."): a spray thrown toward the side the cut travels, drops on the screen when Bleeding takes hold, a drip when it hurts (`tools/world-sprites/vfx-blood.ts` → `src/assets/world/vfx_blood/`, `src/components/battle/bloodPlan.ts` + tests, `seq.blood` in `src/battle/jutsu.ts`; touches `playback.ts`, `vfxSprites.ts`, `renderer.ts`) | **Merged** (approved under his 24-hour delegation) |
| `jutsu/gap-set` | on origin (merged into the integration branch) | The owner's answers on the gaps proposal: the Devouring Tide (Water S), the Whirlwind Tower (Wind A), the Gale Curtain made a gale on the ground that fans fire (+1 die to a fire jutsu through it, whoever casts it), the Thunder Beam and the Rubble Gust (Lightning and Earth C); knock-down, sweep and drag on a failed save (ninjas only), water puts out flames; their effects from his sheets (the running wave, the tornado tower, the gale on the ground, the fanned fire's glow and vortex); `docs/GAMEPLAY_DESIGN.md`, "Jutsu for the gaps", and his rule that the elemental beasts are summons | **Merged** (approved under his 24-hour delegation; his open questions stay below) |
| `jutsu/gap-set-2` | merged 2026-10-22 | His second round on the gaps: the Devouring Tide made rank A (Element slot, 8 chakra +4, 9 m cone, 5d8; a saved one in the S-rank slot moves to an Element slot) with a wider wave combining his horizontal water wall and his columns; the Whirlwind Tower as a funnel (his column widened toward the top) with six small whirlwinds running round it on wavy paths; the elements on the ground (`src/battle/ground.ts`): every water jutsu puts flames out and soaks the ground (the rest of the round and two more), wet ground carries lightning across the patch it touches, fire on wet ground makes steam (the rest of the round and one more, blocks sight both ways: the foes outside vanish from the sight of a ninja in it, 1d6 fire a turn, every wind attack blows it away), the AI knows; his answers to the eleven questions built; `docs/GAMEPLAY_DESIGN.md`, "The gaps' jutsu, second round" | **Waiting for his approval** of the captures (his answers on the numbers are built; not merged) |
| `vfx/ideas-round1` | merged into the integration branch | The owner's first round of jutsu effect answers (`docs/GAMEPLAY_DESIGN.md`, "Jutsu effects, round 1"): Llama Dragón (his Annihilation dragon head over his flame wall, a fan of fireballs), Fuego del dragón (half head, the stream to the line's end), Cadenas selladoras (chain and seal circle), Dragón de agua (no beast: his dragon head in water on his stream, a varied path), Balas de tierra (three volleys of rock bullets on varied paths), Luna creciente (three chakra crescents), Templo del Nirvana (crows out of the vortex), Huracán de la hoja (weapon stowed, a new unarmed `combo` pose, wind crescents); new group `vfx_dragon` (`tools/world-sprites/vfx-round1.ts`); pieces P1–P6 in the battle screen; then the two new effects: Dragón de madera (his dragon out of his icon rising behind the target after a row of roots, `vfx_wood`) and Chidori (his lightning in the bare hand, then a thrust, `vfx_hand`; the weapon stowed), by `tools/refs/wood-dragon-from-ref.py` and `tools/world-sprites/vfx-new-r1.ts` | **Merged** (approved under his 24-hour delegation; his open questions stay below) |
| `armor/roman-paintover` | merged into the integration branch | The owner's Roman paint-over (`roman-owner-reference.jpg`): `armor_bronze` and `skirt_imperial` now his pixels (same ids; drapes as a part, hanging from the hip and ending above the ground), new `hands_bronze_bracers` and `feet_gladiator_sandals`; the old default colours of the two items now mean his; the female bodies keep the fitted cuirass; Solen (`preset_founder`) wears the skirt without drapes; `tools/refs/roman*`; `src/sprite/roman.test.ts`. Touches `armor.ts`, `clothes.ts`, `feet.ts`, `words.ts`, `shinobiData.ts` (Solen's skirt) | **Merged** (the owner approved the cuirass, skirt, bracers and sandals, 2026-10-21) |
| `solen/owner-standard` | pushed | The owner's Solen paint-over (`solen-owner-reference.jpg`, "es el nuevo estandar"): Solen (`preset_founder`, same id) is every pixel his at rest (2 of his 3210 pixels differ). New creator options: `hair_founder_spikes` (not `hair_founder`, the old Founder's Locks, which `cleanup/remove-pieces` deletes), face shape `founder` (his head, eyes and mouth), `acc_founder_cowl`, `cape_founder`, `armor_founder` (female bodies wear the Legion plate), `top_founder` (navy tunic, his bare arms and fists in his skin), `hands_steel_bracers`, `skirt_founder`, `bottom_founder`; upgraded from his pixels, same ids: `held_ice_crystal` (his repaint with a steel cross-guard, held at the hand joint at 35 degrees) and `feet_gladiator_sandals` (Paint part: his Solen repaint, the default, or his Roman one). His far arm and legs are pinned where he drew them and our limbs moved under them at rest (`src/sprite/items/founderOut.ts`, the owner: "no te olvides de el hombro y brazo izquierdo"). In every other pose both arms and legs are his pieces turned rigidly about our joints (the owner on Ren, built the same way: "en la mayoria tiene los brazos diferentes al diseño en las poses"): our arm, trouser leg and shin are taken away, every hand but a pointing one or one holding a book is his fist, his own cells fill a bent shoulder, elbow, hip and knee (`stampBent`, `src/sprite/painted.ts`), a moving limb takes only itself (`limbOnly`), and where he drew none of a limb (the far upper arm under the cuirass, the thighs under the skirt, the far shin) his pixels are continued (`continuedTo`). Where the far arm reaches out (cast, the throw's pointing arm, the combo's cross, the camp sit) it is his near arm mirrored, as thick as he drew that one (the owner's repaint of Ren casting: "tambien en los de solen copia los brazos de mi dibujo"; `founderFarReach`, `tools/refs/solen-reach-from-ref.py`). His far calf is a pixel thicker, his own column of the laced shin repeated, tapering to the ankle (the owner on the combo: "le falta más pantorrilla a la pierna izquierda ponla un poco más gruesa solo un poco"; idle changes 14-15 pixels on male, slender and female, beside the blade; on bulky the calf is hidden and 1 pixel of the far bracer's line changes). Turned, his pieces keep their black line whole (`rotateLined`, `src/sprite/rotsprite.ts`: the near fist no longer runs into the far arm in the combo, no hole at the reaching elbow), the sandal turns with a shin lifted well off the ground (it hung apart from it in the run and the combo's kicks) and his line closes the ankle of a moving leg. `tools/refs/solen*`, `src/sprite/solen.test.ts`. Touches `armor.ts`, `capes.ts`, `clothes.ts`, `feet.ts`, `hair.ts`, `painted.ts`, `rotsprite.ts`, `weapons.ts`, `accessories.ts`, `body.ts`, `types.ts`, `grip.ts`, `thrown.ts`, `shinobiData.ts`, `words.ts`, `AppearanceEditor.tsx`, `random.ts`; meets `cleanup/remove-pieces` in `grip.ts` and `thrown.ts` (held_crystal) and in Solen's preset (the same held and feet lines) | **Waiting for the owner's approval**. Item names are provisional ("Founder's ...", Spanish labels in `words.ts`): the owner names them. Solen's battle weapon is now the Ice crystal sword (1d8) instead of the Crystal blade (1d10) |
| `fix/boots-aiden` | pushed | The owner: "arregla las botas de ren y aiden". Aiden's sabaton hung apart from his greave when the shin turned (26 frames on the four bodies: the slender attack, pierce, tackle and run, every body's pierce, kneel and camp lean): his ankle is now carried round with the shin (`shinCarried`) and the sabaton turns with a shin far from rest. The Roman sandals turn with a shin lifted off the ground as Solen's do (28 frames: train 6, combo 3, run 3, lean). One shared helper, `src/sprite/items/ankle.ts` (`footTurn`, `shinCarried`, `closeAnkle`), used by Solen's and the Roman sandals and Aiden's sabatons; `body/male-skin-face` has its own copy for the Roman sandals and should switch to it when it merges. Idle and Solen are byte-identical. `renderSprite` takes `depths` (tests look at one leg alone); `src/sprite/boots.test.ts`. Touches `feet.ts`, `founderOut.ts`, `compose.ts` | **Fix he asked for**: show him the before/after |
| `fix/holes-stowed-sword` | pushed | The owner's two fixes for every character (2026-10-22, *"si arregla el hueco de 1 pixel a todos si haz el cambio en espada guardada"*). **Holes:** once a frame is flat, `closePinholes` (`src/sprite/holes.ts`) closes every hole of up to 3 px the figure walls in (between pieces with their line, inside one piece with its colour), every nick where the silhouette's line is missing, and takes away 1–2 px specks floating off the figure; real gaps, a notch the line goes round and what an effect walls in stay; **idle is left exactly as drawn** (byte-identical for every preset). **Stowed weapon:** a weapon stowed on the back turns with the torso's lean in every pose, and `clipStowed` (`items/accessories.ts`) cuts away whatever of it would show in front of the back below the shoulders (Solen's tip in the tackle, the blade past the chest in the combo, Aiden's flame sword), a painted blade closed with its own line, and no sliver left loose. `SpriteFrame.fx` marks effect pixels. Tests `src/sprite/holes.test.ts`. Merges `fix/cloth-dead-pixels` (seal.ts seals the cloth where it is drawn; this pass runs after it on the whole flat frame); the seal also leaves idle as drawn, so idle is byte-identical to the integration branch for every preset, companion and enemy on every body. Open question for him: the 1 px slits at rest in our own items that the seal had closed and that stay open at idle now (Lamellar Tassets about 63 px, Wide Hakama 15-23 px, Battle Apron 4, Shadow Half-Cloak 2-4 on female and slender, Royal Long Coat 3 on female and slender, Traveler's Cape 3 and Blue Rose Captain Cape 1 on bulky, Crimson Knight Cape 2 on male, Founder's War Skirt 1 on bulky). **Cowl clasp** (his review, *"aqui tiene unos aun en la hebilla o medallon de la capa"*): Solen's cowl round the neck rides the torso, its near end and white stud ride the shoulders, so the seam beside the gold stud opened as a shoulder moved (Sigilo, and many poses on the bulky body). `tools/refs/solen-cowl-from-ref.py` now also lifts what he drew beside each of them (`FOUNDER_COWL_SEAM_N`/`_F`: his cowl, and under the white stud the cuirass's top, gold replaced by his cloth), riding with that piece; `fillSeams` (`accessories.ts`) puts it behind everything, only where the background would show walled in by the figure. Idle left as drawn (the bulky idle keeps its 1-2 px seam). Test in `solen.test.ts`. Found, not fixed: the Shadow Half-Cloak has 1-3 px gaps next to its studs (near-shoulder top against the hair) in some throw, combo, lean and sneak frames. Touches `compose.ts` (hot file: an import, the `fx` mask, three calls), `accessories.ts`; `docs/SPRITE_STYLE_GUIDE.md` | **Fixes he asked for**; images to show him. Found, not fixed: Aiden's sabaton comes loose under a shin turned back (slender attack 1, pierce 2, tackle 2, run 1–2; male pierce 2) |
| `fix/cape-clasp-2` | pushed | The owner's answer on the clasp gaps (2026-10-22, *"1 arreglar igual capa 2 solen rellenar"*). The seam fill moves to `src/sprite/seams.ts` (`addSeam`, `clothSeam`, `fillSeams`). **Shadow Half-Cloak:** the background beside its studs (between the near shoulder's top and the hair, the mantle and the far plate) is filled with his own cloth of the mantle and shoulder piece continued, only within 5 px of a stud, where nothing is drawn and the figure walls it in; not at rest. **Solen, bulky idle:** the seam at the near stud (11 px) and beside the white stud (3 px) is filled at rest too; every other idle frame of every preset, companion and enemy is byte-identical. Tests: `src/sprite/seams.test.ts` (the cloak, default look and Aiden, three bodies), `solen.test.ts` now checks idle too. Open: the cloak's 2 px gap at rest on the female body (left as drawn: idle); on Solen's bulky idle a 1 px notch between hair and cowl, open to the outside, left as drawn. Touches `compose.ts` (hot file: the import and the `fillSeams` call), `accessories.ts`, `capes.ts`; `docs/SPRITE_STYLE_GUIDE.md` | **Fixes he asked for**; images to show him |
| `jutsu/tide-s` | pushed | The **Dragon Tsunami** (*Técnica de Agua: Dragón Tsunami*, `water_tide_s`), Water's S-rank, from his paint-over of our widest wave (`docs/reference/tide-s-owner-reference.jpg`: "a la ola pasame el sprite donde se ven mas olas para agregarle un kanji y una bestia animada que sera el jutsu en version mejorada clase s"): his curl wave, water dragon (head, horns, whiskers, jaw as pieces), kanji 水 with its glow and spray, lifted at 2x2 game px per pixel of his (`tools/refs/tide-s-from-ref.py` → `tools/world-sprites/vfx-tide-s-refdata.ts` → `vfx-tide-s.ts` → `src/assets/world/vfx_tide_s/`); the curl rises with the wave, the dragon surges out of it, roars and dives at the break, the kanji fades in, pulses and flashes (3.1 s wave). In `JUTSUS_DATA` as Water's S-rank (S-rank slot, level 10; 12 chakra +4, 6d8 STR half, 11.25 m 80-degree cone, sweep 3 m and knock-down, douses, ground wet one round longer: `wetRounds`); the rank-A Tide renamed *Técnica de Agua: Tsunami* (same id). Every water ninja can cast it in practice (`#combat`); `src/battle/tideS.test.ts`. Touches `jutsu.ts`, `ground.ts`, `engine.ts`, `shinobiData.ts`, `playback.ts`, `vfxSprites.ts`, `vfxTintPlan.ts`, `BattleScreen.tsx`, `BattleDemo.tsx`, the tests that pinned "Water has no S-rank" | **Approved by the owner** (2026-10-22: the animation, rank S, the names, and the numbers "por ahora"); ready to merge |
| `jutsu/chidori-active` | pushed | The owner's activated Chidori (`docs/GAMEPLAY_DESIGN.md`, "The Chidori becomes an activated state"): a bonus action charges the hand for 3 rounds, the blow (a melee jutsu attack roll, 5d8) goes off by itself within reach of the first foe the ninja moves to, the ground cracks under its steps into difficult terrain for 1 turn; generic charged hand for the Rasengan later (`src/battle/charged.ts` + tests); the AI uses it; his lightning hand from his two paint-overs (`tools/refs/chidori-hand-from-ref.py`, `tools/world-sprites/vfx-chidori.ts` → `src/assets/world/vfx_charged/`), the aura, Battle Static's crackle and the ground cracks. Touches `engine.ts`, `shinobiData.ts` (the Chidori's cast time, range, save, description), `playback.ts`, `renderer.ts` | **Waiting for approval** (new art, and the rules' open points) |
| `jutsu/rename-remove` | pushed | The owner's jutsu decisions of 2026-10-22: Rasenshuriken → *Técnica de Viento: Estrella Huracán* / Hurricane Star, Espejismo → *Técnica de Genjutsu: Mente retorcida* / Mind Twist (ids unchanged, Japanese names of their own), Yasaka no Magatama removed (data, battle spec, short name; Hana gets the Dragon Tsunami); a saved sheet with it loads with a replacement (`refitRemoved` in `src/rules/progression.ts`, `REMOVED_JUTSUS` in `jutsuNature.ts`, through `migrateCharacter`); `src/rules/jutsuRemoved.test.ts`. Touches `shinobiData.ts`, `missions.ts`, `jutsu.ts`, `BattleScreen.tsx` (SHORT), `ninja.ts`, the tests that pinned the old names | **His decisions**; not merged (no PR yet) |
| `items/senbon` | pushed | The owner's senbon, weapon poison and healing senbon (2026-10-23/24; `docs/GAMEPLAY_DESIGN.md`, "Senbon, weapon poison and the healing senbon"): senbon thrown from a case of 10 (1d4, +1, 6/18 m) in the throw pose with the weapon stowed, *Veneno para armas* (bonus action, own weapons only, 3 coated hits, CON DC 12 or 1d4 poison and Poisoned; each rogue carries a vial), *Senbon curativo* (action, an ally within 6 m heals 2d4+2, a medic adds WIS), *Beber poción* (bonus action, 2d4+2 on oneself), AI for all; two new backpack items (2 vials, 2 potions; old saves load with none). `src/battle/senbon.ts` + tests. Art: the needle in flight (`vfx_senbon`, **approved**), the coated weapon (`src/sprite/coat.ts`), his hotbar icons (sheet 24); no aura on coating. Touches `engine.ts`, `ai.ts`, `intent.ts`, `combat.ts`, `types.ts`, `units.ts`, `BattleScreen.tsx`, `playback.ts`, `renderer.ts`, `unitArt.ts`, `sprite/types.ts`, `sprite/items/{weapons,accessories}.ts`, `battleText.ts`, `battleLog.ts`, the mission backpack | **His numbers, bag and art decided** (2026-10-24); the throw fix and his icons in the bar wait for his look; not merged (no PR) |
| `vfx/solid-outline`, `vfx/solid-outline-apply` | pushed | The characters' black line on solid jutsu (`tools/world-sprites/solid-outline.ts`, default on, `SOLID_OUTLINE=0` turns it off): every beast, the earth set's rock (walls, thrown rocks, spikes, the hit's, blast's and aura's rocks, the D/C rock bullets), the crystal walls, the poison walls' stone frame, the chakra barriers' gold frame, the wood dragon, the dragon heads and the Dragon Tsunami's dragon; never dust, mist, slime, panes, glow, shadows or a cut where a head comes out of the fire. The raiju's brown and the crane's teal line recoloured to black. Generators changed and rerun; 34 sheets in `src/assets/world/` changed (only line pixels; frames and anchors unchanged); `src/sprite/solidOutline.test.ts` | **Approved** by the owner (2026-10-22, *"1 si 2 cambia 3 si"*); `-apply` is ready to merge |
| `body/male-skin-face` | merged into the integration branch (2026-10-23, through `merge/roman-approved`) | The owner's answers to the Roman proposal, "2 si 3 si copia la cara": every male body (male, bulky) takes his skin from the Roman paint-over (his upper arms and elbows, fists, thighs, knees and shins as painted pieces that turn with each limb and recolour only our limb's skin, the body's shape and joints unchanged; at rest in his outfit his skin pixels exact, tested against his picture; his darker shadow tone in the male skin ramp; the bulky body widened by repeating his columns; female bodies byte for byte unchanged), and his face as the new `roman` face shape and eye shape (Spanish "Romano"), his pixels 1:1 (`tools/refs/roman-skin-from-ref.py`, `roman-head-from-ref.py`, `roman-eyes-from-ref.py`, `roman-test-pixels-from-ref.py` → `src/sprite/maleSkinArt.ts`, `romanHeadArt.ts`, `romanEyeArt.ts`, `romanRefPixels.ts`; `src/sprite/maleSkin.ts`; `src/sprite/maleSkin.test.ts`). Touches `compose.ts` (two calls), `body.ts` (painted heads and eyes generalised; his black line never tinted), `color.ts` (`retintSkin`, `retintSkinLifted`), `items/feet.ts` (the sandals' skin between the laces from his painted skin), `types.ts`, `random.ts`, `AppearanceEditor.tsx`, `words.ts`, `tools/refs/roman_ref.py` (`sandal_pivot` shared, outputs unchanged). Then his answer on the sandals' legs, "copia la referencia con exactitud en la rodilla izquierda": on the male bodies his knees are painted pieces too (his shape and line, not only his colours), our leg takes the shape of his whole leg below the skirt, and his far leg reaches 6 px further down, to where he drew it (`roman_ref.knees`, `sandal_reach`; `legToHisLeg` in `items/feet.ts`; at rest every pixel below the skirt is his, `roman.test.ts`). Then his "tienes la falda buggeada en muchas como si fuera capa y no es": the skirt's red drapes are cut into panels down his leg lines that hang from the waist, lie on the thighs to the knees and hang from there, swept through the folds and between the legs, ending on the ground line on his black line; no wind, never trailing (`drapeStamps` in `items/armor.ts`; at rest every drape pixel is his in every idle frame, tested). Then his mark beside the near fist, "en mi dibujo la mano está ahí y no te deja ver cómo está la capa detrás, arréglalo", and "pixeles blancos muertos" in the skirt in many poses: the script continues his drape behind his fist (each column in his shadow red below it, his black line on top and along a flared left edge; `drape_under_fist` in `roman-skirt-from-ref.py`, his own cells unchanged), and once the whole figure is drawn the skirt closes what the figure leaves open in front of the drape (holes inside the drape's outline, pinholes and nicks beside the skirt, and the slit between a hand and the strips below the hand's top) with his nearest cloth or line; a gap between an arm and the body above that stays open, as in his picture (`skirtHoles`/`closeSkirtHoles` in `items/armor.ts`, through a new `DrawCtx.after` hook in `ctx.ts` and `compose.ts`; no hole in any pose or frame of male, bulky or slender, tested). Then his "hiciste muy cuadrado donde rellenaste la capa ... cortes diagonalmente para que siga esa forma que tiene la falda": the cloth behind his fist is cut on his drape's own slant, its left edge going on up from his drape's top left corner one column a row (his line below moves one column a row, keeping its column once in ten) to the strips, his 1 px black line along it (a triangle of 15 cells, was a 33-cell block; his 875 drape cells unchanged); at rest the slit left between the arm and the strips just above that slant, and the cloth beside the hand below its top, take his cloth below them, so no background shows by the fist (`drape_under_fist`, `skirtHoles` in `items/armor.ts`; tested). He approved the diagonal cut on 2026-10-22: "la tela me gusta quedo bien el corte en diagonal". Then his "el pie en combo con el que patea esta separado y cortado": a sandal now turns with its laced shin about the ankle once the leg swings the foot well off the ground (the shin past 45 degrees from rest, the ankle lifted past 3 px; the same rule as his Solen's sandal on the integration branch), and the ankle's open corners take his line (`footTurns`/`closeAnkle` in `items/feet.ts`); fixes the combo's kicks and knee-up frame, the train kick, the bulky and slender run and the sneak (every sandal touches its shin and the figure is one piece in every pose and frame, tested). His repaint of the Roman `sit` (`docs/reference/roman-sit-owner-reference.jpg`, on a rock, the new standard sit) is drawn at 80% of our scale (one of his pixels is 1.25 of ours). His answer "romano sentado a": his pose as the guide at our scale. `sit` is now his four frames for every body (`rig.ts`: `PoseAt` and 'frame' hand targets, the same design as `heroine/lyra-v2`'s read): pelvis, neck, hands and ankles where he drew them, scaled by 1.25. His legs are a fifth longer than ours at that scale; he chose "romano sentado opcion a" (2026-10-22): seated, the thighs lengthen so the knees come to his (`PoseAt` `kneeN`/`kneeF`, `kneeLeg` in `rig.ts`; 20 to 25 px on the male, ours 16.2), the seat is his again (`SIT_SEAT_TOP` 184, was 190), and his thigh skin and the drape's thigh panels lengthen with the thigh by repeating his rows (`stretchPiece` in `painted.ts`; `maleSkin.ts`, `drapeStamps` in `items/armor.ts`), so the drape falls over the rock as he drew it; every other pose byte for byte unchanged. Our shins stay ours (15.4 px, his 18 to 19.4), so the male's near knee is 2.1 to 2.6 px from his and the far knee 3.6 to 4.0 px, a little low on his shin's line (pelvis 0.4, ankles 0.5); frame 3's open mouth waits for a face that opens it; his sword is not drawn. His rock is a seat prop, `seat_boulder` (`src/sprite/seats.ts`, ported from `heroine/lyra-v2`'s seats; `tools/refs/roman-sit-rock-from-ref.py` → `seatBoulderArt.ts`, scaled by 1.25), drawn by the camp under the sit spot in place of the log (`CampScene.tsx`, `campArt.ts`, from `heroine/lyra-v2`); `src/sprite/seats.test.ts`. Then his look at the Roman GIFs (2026-10-22), "victoria se corta el cuerpo por la mitad arregla eso y leer mira la referencia de trunks y copiala a leer de romano": (1) victory's second frame lifts the chest 2 px off the hips (`chestDy` -1); his cuirass rides the neck and the torso under it is taken away while the strips hang from the pelvis, so a 2 px gap opened at the waist. His chest now lengthens with the torso by repeating rows of his abdomen (`cuirassChest` in `items/armor.ts`; only where the torso is longer than at rest, so only that frame changes), and `roman.test.ts` checks the waist for a gap in every pose and frame of every body. (2) The male bodies' read is his two Trunks frames (`docs/reference/trunks-read-owner-reference.jpg`, painted over our read at our scale): his joints (`rig.ts` `READ_JOINTS`, `READ_MALE` through `MALE_POSES`; the female bodies keep their read until `heroine/lyra-v2`'s), his book and his hands' shape where he drew them, his gloves' tones matched to his Roman fists' (the Roman's hands are bare; his option A, chosen 2026-10-23 over B, his Roman fists), his line kept (`tools/refs/roman-read-from-ref.py` → `src/sprite/maleReadArt.ts`, `campfx.ts`; `tools/refs/owner_paintover.py` copied from `heroine/lyra-v2`); his hips where he drew them (row 190 seat line), on his Roman sit rock (`seatFor` takes the body; `CampScene.tsx`), the rock's top behind the hips. Every other pose and frame byte for byte unchanged (1860 frames of 20 looks hashed). Then his decision on that read (2026-10-23), "pon como estas poniendo (libro cerrado) en todas las poses de leer esa es la idea": every read frame is his frame 2 (the book raised in one hand toward his face, the other forearm across; its pages face him, so he is reading it), held still over the loop as his Lyra's sit holds her one frame (`READ_KEYS` all 1); his frame 1 (the open book in both hands) stays in the script and `maleReadArt.ts`, unused, for a later pose; the male read standard in `docs/SPRITE_STYLE_GUIDE.md`. Only the male and bulky looks' read frames change (1860 frames hashed). Then his "porque no tenemos la forma de cabeza y cuello de romano en el juego ? cambialo inmediatamente me gusta mas el de mi dibujo" (2026-10-23, a fix he asked for): his Roman head is the male standard. With the `roman` face on a male body (male, bulky) the head is raised 3 px (`ROMAN_HEAD_UP`, `romanRig` in `src/sprite/romanNeck.ts`, through `compose.ts`) so his face, eyes, hair and every head item stand where he drew them, on his neck: his skin between the chin and the collar, riding the head, drawn above the neck joint (`tools/refs/roman-neck-from-ref.py` → `romanNeckArt.ts`; `drawRomanNeck` from `body.ts`), and below it only filling what the figure leaves open about the raised neck (between chin and collar in a turned pose, the nape under the hair). His dark spiky hair is the new `hair_roman` (`tools/refs/roman-hair-from-ref.py` → `items/romanHairArt.ts`: his hair, his line over the face, the shadow his locks cast on the forehead in the character's skin; recoloured from his middle blue, his line kept). At rest in his outfit his whole head, hair, eyes and neck are his 422 pixels exactly (`ROMAN_HEAD_PIXELS`; `src/sprite/romanHead.test.ts`), whole in every pose and frame of the male and bulky bodies. `defaultAppearance` (`legacy.ts`) now has face and eyes `roman` and his red (`ROMAN_IRIS`); characters saved before the layered look and imported sheets without a face shape keep our default face (`appearanceFromLegacy`, `characterFromImport`). No preset changed. Touches `compose.ts` (one call), `body.ts` (one call), `items/hair.ts`, `legacy.ts`, `CharacterCreator.tsx` | **Approved complete** (2026-10-23, "romano con mi cabeza aprovado set completo"): the skin, face, eyes, neck, hair, cuirass, skirt, bracers, sandals, sit (option A) and read |
| `class/weapon-element` | merged into the integration branch (2026-10-23) | The owner's *Weapon Element Enhancement* for the Bukijutsu Master (`docs/GAMEPLAY_DESIGN.md`, "Class abilities in battle"): a bonus action (2 chakra, 3 turns) that puts the ninja's element (no genjutsu) on the weapon in hand, +1d4 of it a blow, per element a rider (fire burns on a crit, lightning numbs, wind blows back, **water +1.5 m reach**, obsidian crits on 19); AI, HUD, log; the animated effect on the weapon in every pose (`src/battle/imbue.ts`, `src/sprite/imbue.ts` + tests; touches `engine.ts`, `turns.ts`, `ai.ts`, `intent.ts`, `units.ts`, `jutsu.ts`, `types.ts`, `BattleScreen.tsx`, `playback.ts`, `renderer.ts`, `unitArt.ts`, `grip.ts`, `battleText.ts`, `battleLog.ts`, `shinobiData.ts` (the class text), `scripts/ai-battles.ts`) | **Approved** except water (2026-10-23, *"me gusta las armas con mejora elemental metelas en el juego menos la de agua"*): lightning, wind, fire and earth in the game; water held back (`IMBUE_PENDING`: no button for a Water Bukijutsu Master) and redone on `vfx/weapon-water-v2` for his approval. The hotbar icons (our element icons on the button) he did not like: **he will paint them**; ours are placeholders until then. The numbers, the riders and the Spanish name decided by him (2026-10-23; see `class/weapon-element-2nd`) |
| `class/weapon-element-2nd` | merged into the integration branch (2026-10-23) | His answers to the four questions (*"1 si me gusta dime que haria cada elemento ... 2 aprovado 3 tambien segundo elemento al momento de desbloquear , 4 no"*): the numbers and the riders decided, the Spanish name approved, thrown weapons no; **the second element too, once unlocked**: a button per element on the hotbar ("Arma elemental · Fuego" / "· Rayo"), the action carries the element (`element` on the jutsu action), one at a time; the AI chooses (`imbueChoice`). Touches `imbue.ts`, `engine.ts`, `ai.ts`, `units.ts`, `types.ts`, `BattleScreen.tsx` (the jutsu buttons; hot file); tests `src/battle/imbue.test.ts` | **His decisions** |
| `class/weapon-element-3rd` | merged into the integration branch (2026-10-23) | His *"si el triple naturaleza tambien cuenta"*: the third element that Triple Nature opens goes on the weapon too (a third button, the same rules; the AI chooses among the three). `imbueNaturesOf` in `src/battle/imbue.ts`; tests `src/battle/imbue.test.ts` | **His decision** |
| `vfx/weapon-water-v2` | merged into the integration branch (2026-10-23) | From `class/weapon-element`. His *"mejorala para que se ve mas epica y proporcional"*: the water on the weapon redone as a torrent in his water sheet's style (his blues, a light strand, foam caps on the wave crests of its upper edge, a rounded foam head, his spray dots, falling drops, his dark water line), past the tip about half the blade again; then his *"hazlo unos 1.35 mas largo"*: the whole water 1.35 times as long (past the tip about the blade again, short of the frame's edge, one length over a steady pose); water offered again (`IMBUE_PENDING` empty). Only the water in `src/sprite/imbue.ts` changes (`drawWater`, `waterReachPx`, `waterReach`, `steadyReach`), and the water tests | **Approved** (2026-10-23, *"me gusta agua aprovado"*): water offered again (`IMBUE_PENDING` empty), as a main, second or third element |
| `worktree-*` | not on origin (local `6e2e8dc`) | Agent worktree leftovers | Stale |

The tips are the pushed ones; fetch to see the latest. At this snapshot the owner's checkout had
one more commit, not pushed yet, on three branches: `camp/owner-ref` `07b3a25` (read pose: his
book and hands), `icons/sheets-8-11` `3cae1ea` (Swap and Warp Strike, now Shooting-Star Thrust, icons with phase ninjas) and
`scarlet/study` `399f59f` (his picture brought down to our scale).

Merge checks (`git merge-tree` on the origin tips, nothing changed):
- `camp/owner-ref`, `ryusei/phase`, `poses/throw-pierce` and `scarlet/study` merge cleanly into
  integration; `icons/sheets-8-11` conflicts only in `docs/reference/README.md`.
- `camp/owner-ref` and `poses/throw-pierce` conflict with each other in `src/sprite/rig.ts`;
  `camp/owner-ref` and `ryusei/phase` in `docs/reference/README.md`.
- `ryusei-phase-owner-reference.jpg` and `poses/warp-throw-owner-reference.jpg` (on those branches)
  are the same image.

- Decided 2026-10-23: the owner approved the Fireball / Great Fireball core animation and smoke trail (`vfx/fireball-core-smoke`, "aprovado") and the Chidori ground cracks ("me gusta ese efecto electrico en la tierra aprovado"); both are in the game.

- Decided 2026-10-23: the map quality standard is `docs/reference/map-quality-owner-reference.png` ("el standard de calidad que quiero llegar del mapa es este"); his paint-over of our camp battle (`map-height-owner-reference.jpg`, on `battle/height-test`) shows how height and depth go in: terraces with rock cliff faces and stairs between levels. He will edit the world himself.

- Decided 2026-10-23: the owner approved Lyra's sit pose ("lyra pose sentada aprovada": his sit picture on his sit rock, `heroine/lyra-v2` 6646042), then the rest of her.

- Decided 2026-10-23: Lyra approved 100% ('lyra aprovada 100%'); merged (`heroine/lyra-v2` at `6646042`,
  through `merge/lyra-approved`). What came in: the legend preset `preset_lyra` (Lyra, the Gilded Blade), every
  part lifted from his game-scale picture (hair `hair_copper_braid`, eyes `keen`, face `fine`, blouse, corset,
  skirt, tabard, pouch belt, thigh-high boots, the Gilded Rapier with its long blade); the owner's bare female
  body (`body/female-v2` as Lyra's branch has it, 7fbba79: his pieces on a rig fitted to his joints, the sports
  top and briefs as items, the Messy Ponytail hair); her long arms (`arms: 'long'`, "Brazos: Largos" in the
  creator); her long neck (`neck: 'long'`, on her preset only: the neck picker stays removed, so she keeps the
  neck she has today, and `migrateAppearance` keeps it while it drops the old slim and strong ones); his read
  (three frames), sit (one frame) and throw frames 3-4 painted on her, every pixel his (`ownerFrames.ts`); her
  far leg whole in read; the fitted female bodies' sit is his Lyra sit (`rig.ts` FIT_SIT; male and bulky keep
  theirs); his two rocks as seat props for every character (`seats.ts`: `seat_rock` under read, `seat_rock_sit`
  under sit; the camp shows the rocks under its read and sit spots). The neck fix he approved on
  `body/female-v2` (f84e80e, the head on the neck through the throw) is not on Lyra's branch and is not in
  yet. His read pose is now every body's read (male and bulky too); male and bulky keep their own sit. The
  integration's later checks find four small things on the new female body, named in the tests as known and
  open (the owner said the old women's clothing and armour are not refitted to it): the Shadow Half-Cloak's
  slit (2 px, tackle 4) and 2 px beside its stud in Aiden's downed 0; Solen's cowl clasp, 1 px in combo 0 and
  7; Aiden's sabaton a pixel short of the thigh in the throw's and the combo's back kick. Still open from her
  branch: the male and bulky feet hang above his rock when they read; whether the other characters' throw
  should follow his release.

- Decided 2026-10-23: the Roman set is approved complete (*"romano con mi cabeza aprovado set completo"*);
  merged (`body/male-skin-face` at `19aea42`, through `merge/roman-approved`). What came in: the male skin
  standard from his Roman paint-over (every male character's skin, male and bulky, Aiden included: that is the
  approved male standard), the `roman` face and eyes ("Romano" in the creator), his neck and his `hair_roman`,
  the male default head = his head (`defaultAppearance`), the Bronze Cuirass, the Imperial War Skirt with its
  drapes, the bronze bracers, the gladiator sandals with his Roman paint (its option now reads "Roman paint" /
  "Romana", so the face's "Romano" has a key of its own), the Roman sit (option A) and the male read (his
  Trunks frame 2, book closed in one hand, hands option A). Where it met the integration branch: the male sit
  and read sit on the integration's two rocks (`seat_rock_sit` to sit and talk, `seat_rock` to read, as he
  decided for every character), and his Roman sit rock (`seat_boulder`, `seatBoulderArt.ts`), used by nothing
  after that, was removed (its script stays); the fitted female body keeps Lyra's read and sit; Lyra's frames
  (idle, read, sit, throw 3-4) and the plain female look are byte for byte the integration branch's.

- Decided 2026-10-23: his answers on where his Roman head goes, *"1 si 2 no 3 si"*: (1) a new game's hero
  (Solen's sheet, `freshNinja` in `App.tsx`) starts with his Roman head: face and eyes `roman` in his red, his
  neck and `hair_roman` (`withRomanHead` in `src/sprite/legacy.ts`), the rest of Solen's look kept; the Solen
  preset itself is unchanged. (2) No legend preset takes his head. (3) The default male look
  (`defaultAppearance`, the creator's default) has `hair_roman` and no headband in place of the blond spikes
  and forehead headband; saved characters, imported sheets and presets keep their hair and headband.

## 3. Waiting for the owner

- `items/senbon` (2026-10-24): look at the senbon thrown in the throw pose with the weapon stowed, his
  icons in the bar, coating with no aura, and the *Beber poción* button (its icon is a placeholder:
  his to paint).
- `items/senbon` (2026-10-24): the medic's kit (Quick First Aid, the antidote senbon, the Steady Hand
  feat) and Seal Needles (platinum senbon; *Estudiar anatomía* at camp; the old doctor on the road):
  his look at the numbers (our proposal), the platinum needle (a placeholder) and four placeholder
  icons (*Beber poción*, *Primeros auxilios rápidos*, *Senbon antídoto*, *Agujas de sello*).

- `jutsu/tide-s` (2026-10-22): the Dragon Tsunami is approved (look, rank S, names, numbers for now).
  Still open, small:
  - Hana (Water, medic) has the Dragon Tsunami in her S-rank slot since he removed Yasaka no
    Magatama (2026-10-22, `jutsu/rename-remove`): the only rank S her nature and class allow. Confirm.
  - His curl stands with its foot cut straight where his canvas ended (bottom left); and where his
    dragon and kanji covered the curl, the curl is continued with his own rings turned about the
    spiral's eye (seen while the dragon rises and dives and before the kanji shows).

- Weapon Element Enhancement (in the game since 2026-10-23; his numbers, name, second element and "no" to
  thrown weapons decided the same day): approve the new water on `vfx/weapon-water-v2` (his "mejorala para que
  se ve mas epica y proporcional", then "hazlo unos 1.35 mas largo"); his own hotbar icons for it (he will
  paint them).

- Approve or correct: `ryusei/phase`, `poses/throw-pierce`, the Shooting-Star Thrust choreography
  and its comet on `ryusei/warp-throw`, the icons on `icons/sheets-8-11`, the camp poses once redone.
- Two Ryusei names now share *Fugaz*: the ability *Estocada Fugaz* and the planned path *Filo Fugaz*
  (Path of the Fleeting Edge, `docs/CLANS_DESIGN.md`). Keep both, or rename the path?
- `jutsu/d-c-set` (2026-10-21): the 12 rank D and C jutsu he asked for, built with his answers and
  the proposal's defaults (`docs/GAMEPLAY_DESIGN.md`, "Rank D and C jutsu"). Approve the in-game
  captures (new art: the tackle pose, the white cut, the turned projectiles). His later answers to
  questions 4 to 9 are built too: Numb for 2 rounds (P5), the Rush at 6 m, the water aura on the
  Mystical Palm, Pebble Shot as it is, the Mirage and the Bleeding Cut silent (P6); the class gate
  (9) is on the integration branch. Then "la curacion siempre se vera verde": the Palm's and the
  Healing Dew's water sheets play in the heals' green, never the chakra colour (captured in battle
  with a violet ninja).
- `vfx/ideas-round1` (2026-10-21): his answers 1A, 2A, 5A, 7 (his dragon head in water on the
  stream, varied path), 8A (varied paths), 9A, 10A (read from his second "9 a") and 12A with the
  unarmed combo pose are built; approve the in-game captures (new art: `vfx_dragon`, the `combo`
  pose). Pending by his answer: 3 (Night Guy) and 6 (64 palms, a character animation later). The
  new art for 4 (Wood Dragon: his dragon from his icon, `vfx_wood`) and 11 (Chidori: his lightning
  in the hand and a bare-hand thrust, `vfx_hand`, the weapon stowed) is built too, waiting for his
  yes. Question: 10A plays his crow swarm, which is the genjutsu beast; with his new rule that
  the elemental beasts become summons, is that fine for a genjutsu? Nine defects found playing
  them in the game are fixed (seal circle on a resisted seal, water body in the ground, crescents
  in the wind-up, effects over the caster, Chidori hit a frame early, the Llama Dragón name in the
  HUD). The integration branch (the merged `jutsu/d-c-set`, the dice, `jutsu/gap-set`) is merged
  into it; on it the Water Dragon and the Wood Dragon already show no beast (see the summons
  question below). The saves' d20s land with each staged jutsu's first blow; where that blow
  would come sooner than a die can fly (the Chidori after its run, the crescents, the Leaf
  Hurricane) the blow waits that beat for the die (about 0.2 to 0.6 s).
- `jutsu/bleeding-blood` (2026-10-21): the Bleeding Cut's blood, the one jutsu of the twelve he
  held back. Approve the spray (it bursts from the chest the way the cut goes, falls and fades on
  the ground), the drops that splash the screen when Bleeding takes hold, and the drip when it
  hurts (`docs/GAMEPLAY_DESIGN.md`, "Bleeding Cut's blood"); merged only after his yes.
- `jutsu/gap-set` (2026-10-21): his answer to the gaps proposal (*"1 no 2 ola devoradora si 3 grulla
  no todos los elemtantales seran invocaciones que te ayudaran en el combate no ataques , 4 si 5 si
  modifcar para hacerlo area y que potencie las tecnicas de fuego que pasen por ahi y se vea como
  efecto 6 no 7 si8 si"*), built: 2, 4, 5 (as an area), 7, 8. Approve the in-game captures and the
  gale's numbers (2.25 m round, the rest of the round and two more, +1 damage die to fire through
  it). **Still his** (`docs/GAMEPLAY_DESIGN.md`, "Open questions on the gaps"): two per gap or two in
  all; the Tide without a 水 kanji; the gaps left (Earth A, Water D, a third Fire D/C); keep the name
  "Cortina" for an area; only ninjas knocked down and swept; a caster inside a gale fans its fire
  any way it fires; bludgeoning (Taijutsu Masters take half); earth dust in a chakra colour; the
  shared "potenciado" log line. Review fixes on the branch: the beam drawn the line's whole length,
  "+2 dados" for a rank S, a cone fans only the gales it reaches, the wave sweeps each one as its
  crest goes over them, the gale drawn behind the ninjas in it, the dust in front of the caster and
  across the cone, swept ninjas stop 1.2 m from others, the fanned Fireball's blast its own size.
- `jutsu/gap-set-2` (2026-10-21): his second round (*"ola devoradora es rango a ... el agua apaga
  el fuego, el agua también pone el suelo donde pasa mojado por 2 turnos que conduce electricidad y
  si se usa un jutsu de fuego se genera vapor ... Torre de torbellino ... más ancho mediante se va más
  arriba ..."*, verbatim in `docs/GAMEPLAY_DESIGN.md`). Approve the in-game captures (the Tide's
  wider wave, the Tower's funnel and wavy whirlwinds, wet ground, lightning across it, steam) and our
  numbers. After an in-game review: wet bushes no longer burn, the AI no longer walks in and out of
  steam or ends its turn in it, burning ninjas show his fire aura and a puff of steam when water puts
  it out, the steam is drawn as a wide curtain, the Tide's crest columns no longer stick up like a pole.
  **His answers to the eleven questions are built** (*"1 vacio por ahora 2 mas chakra como 8
  minimo ... 4 dura resto de la ronda y 1 mas puede ser eliminada con ataques elementales de aire
  ... 10 mas bien que los enemigos desaparezcan de la vision de ese personaje ..."*, verbatim and
  as decisions in `docs/GAMEPLAY_DESIGN.md`, "His answers on the second round"): the Tide costs 8
  chakra (+4); steam lasts the rest of the round and one more, every wind attack blows it away
  (seen drifting off); from inside steam the foes outside vanish from that ninja's sight (drawn as
  hidden foes); a saved Tide in the S-rank slot moves to an Element slot on load. Left for him:
  approve the captures (`juego-3`: the steam blown away, a ninja in the steam, the Tide's cost).
- **The elemental beasts are summons** (his rule, 2026-10-21: *"todos los elementales seran
  invocaciones que te ayudaran en el combate no ataques"*): the summon itself is to design (what it
  does, how long, its cost, who calls it). Jutsu that still show a beast as their attack: the Water
  Dragon Bullet (water dragon), the Lightning Hound (lightning beast), the Wood Dragon (stone drake)
  and Night Guy (griffin); change them now or when summons exist? Do the S-rank signatures' dragons
  (Annihilation, Kirin) count?
- Chakra types (`docs/GAMEPLAY_DESIGN.md`, "Chakra type" and Open questions). **Decided
  2026-10-21** (his answers, built on `chakra/decisions`): the legends keep their new types; saved
  copies of the legends and companions move to their new type when they load; Shadow and Spirit
  are pending (out of the creator and the random ninja), Light and Void stay with their jutsu pending
  (Light: deity, angel and god; Void, Shadow and Spirit: demonic); Cinder Nova stays as a second Fire
  burst. **Still his** (as built, proposed): (the Earth burst art, Shattered Earth, is approved: "me gusta tierra quebrada");
  the burst-to-type rows his answers did not settle (Water = Rising Tide, Wind = Leafwind Spiral,
  the Light and Void bursts); saved legend copies are moved only while they carry the legend's own
  jutsu (so a player's own Ren as Water stays); the jutsu gate itself (S-rank gated, Utility and
  clan secret not, the type change swaps the jutsu, Light and Void only jutsu with no element, the
  random ninja's picks); Kaien's Fireball and Raiga's Earth Wall (kept; proposed: a formal second
  nature, Kaien Rayo + Fuego, Raiga Fuego + Tierra).
- Decided 2026-10-24: **Aurelia is approved complete** (`heroine/aurelia-v2`): every pose and the standard fixes, Arrojar included once he saw it has his face, neck and hair: *"ok aprueba a aurelia completa si en arrojar ya tiene mi cara y cuello y peinado"*. Her pockets stay as drawn but where he left a fill (Carga 1 at the elbow, Agacharse 1: `keptFills.ts`). His answer to question (1) below: the women read with his Lyra's open book (*"si esta bien la pose de lyra"*); no closed-book read for them. Question (2), her jutsu, is still his.
- Decided 2026-10-23: **Aurelia's face, neck and hair are his, pixel for pixel**: seeing "Tu dibujo" (his game-scale picture) beside our idle, *"igual que romano copia la forma de cara cuello y peinado pixel a pixel me gusta mas la de mi dibujo"*. Built on `heroine/aurelia-v2` (waiting for his look): a new face shape **"Serena" ("La cara de Aurelia", `aurelia`)**, her ear, cheeks, blush, mouth (his two dark pinks, no red open mouth), jaw and chin with his black line (`tools/refs/aurelia-face-from-ref.py` -> `src/sprite/aureliaFaceArt.ts`), her 'dawn' eyes where he drew them (the far eye 7 columns from the near one), her hair as he drew it on her own face (`aurelia-hair-from-ref.py`: `AURELIA_HAIR_FRONT_HIS`/`BACK_HIS`; on a wider face it still moves its far side out), and on a female body her head stands where he drew it over her body, 3 px higher and 1 ahead, her chin right on her high collar (`src/sprite/aureliaHead.ts`; the neck is drawn on up to it and stops behind her near lock; his bare far shoulder past the collar joins her bodice). At rest every pixel of her head, eyes, hair and the collar under her chin is his at his place (`src/sprite/aureliaHead.test.ts`); the only colours that are not exactly his are her skin pixels, drawn in the character's skin as every face is (his lit skin #f5c7a6 becomes her #f4c6a5), and his bare shoulders' skin in the body's skin shades, as before. Also on the branch: the integration merged in (Lyra, the seats, the slender body gone); her sit and read are Lyra's standard as Saya's are (his hands, the book from her own neck, his two rocks); the tackle and the spinning kick keep the head on the neck on the female bodies (Lyra's frames change there too); her staff's sparkles survive the 1-pixel pass; her walk is re-pinned with the 1-pixel fills and her new head (her legs unchanged). **Questions for him:** (1) his read standard "libro cerrado" (the Trunks read on `body/male-skin-face`) is built for the male bodies only; the female read is still his Lyra's open book: should the women read with the closed book too? (2) Yasaka no Magatama left the game, and Aurelia (provisional sheet: a Light medic) has nothing else of rank S or of her class for her Element slots under the class rules: her S slot is empty and her two Element jutsu (Nirvana, Leaf Hurricane) are other classes', marked. Which jutsu (or class or nature) should she have?
- Decided 2026-10-22: the owner approved Aurelia's walk (ae89802): "en caminar esta bien esta hoja esta aprovada", all 8 walk frames with and without her skirt (`heroine/aurelia-v2`). They stay pixel for pixel (`src/sprite/aureliaLegs.test.ts` pins them); the leg fixes after it leave walk alone. Then (2026-10-23) "aurelia falta arreglarle el cuello y cabeza como los otros arreglalo en arrojar": her throw's release and follow-through hung her head ahead of the chest and below the shoulders, 17 px from the neck's foot. The female body's throw-neck fix (`42c22cc` + `f84e80e` from `body/female-v2`, cherry-picked: his neck as its own piece, `rig.ts` `PoseFrame.neckPitch`) puts her head, hair and collar back on her neck at its length, above the shoulders; her turned bodice no longer leaves a pixel of background under her collar (`aureliaVestment.ts` `fillDents`, bodice only). Idle and walk unchanged; throw 0 and 2-4, attack 1-2, run 3 and train 5 change. Test: `aureliaVestment.test.ts`. Waiting for his look.
- Decided 2026-10-22 (`jutsu/rename-remove`): **Rasenshuriken → "Estrella Huracán"** (Hurricane Star,
  `rasenshuriken_wind`), **Espejismo/Mirage → "Mind Twist"** (`genjutsu_mirage`; Spanish "Mente
  retorcida", our proposal, one line to change if he wants "Mind Twist" in Spanish too), ids
  unchanged; **Yasaka no Magatama removed**: *"quitala del juego"* (he will make something else).
  Hana gets the Dragon Tsunami in its place; a saved sheet with it loads with the best jutsu its
  nature, class and clan allow in that slot, same rank or lower, or the slot empty
  (`docs/GAMEPLAY_DESIGN.md`, "Jutsu names, and a removed jutsu"). Night Guy: he renames it later.
- Decided 2026-10-22: the neck option was removed from the creator; every character keeps the slim nape (his Aiden's). Saved 'strong' necks load as slim.
- Decided 2026-10-22: **Solen approved and merged** (`solen/owner-standard`): *"me encanta la pantorilla aprovado"*. He also said yes to filling the 1-pixel holes for every character and to fixing the stowed sword that pokes out (*"si arregla el hueco de 1 pixel a todos si haz el cambio en espada guardada"*); both are built on `fix/holes-stowed-sword` (idle left as drawn).
- Decided 2026-10-22: **Aurelia stays in our format; small hands become a creator option for women.** He first said *"la referencia es una version nueva copiala las manos mas pequeñas ponlas como opcion en el juego para personajes femeninos"*, then, seeing that his new picture is about 4 rows taller than the female base body, cancelled the re-scale: *"no esta bien deja tu diseño a nuestro formato esta bien cancela la reescala esta bien como esta"*. So Aurelia keeps the pieces from the game-scale picture on the female base body; "Manos: Normales / Pequeñas" is offered on the female and slender bodies, Pequeñas from her picture. Being built on `heroine/aurelia-v2` with the skirt and far-knee fixes.
- Decided 2026-10-22: **the S-rank Tide is approved, and the names**: *"rango S ola si me gusta la animacion la ola normal se llama tsunami y la rango s es dragon tsunami"*. The rank-A Tide is now *Técnica de Agua: Tsunami* / *Water Technique: Tsunami*; his dragon-and-kanji version is Water's S-rank jutsu *Técnica de Agua: Dragón Tsunami* / *Water Technique: Dragon Tsunami* (Water S is no longer empty: this replaces his "vacio por ahora"). Ids unchanged. Its numbers approved by the owner for now: *"aprovado los numeros de la ola por ahora"* (12 chakra +4; 6d8, STR half, enhanced 8d8; 11.25 m 80-degree cone; knock-down and 3 m sweep; douses; ground wet one round longer). Built on `jutsu/tide-s` (`docs/GAMEPLAY_DESIGN.md`, "The Tsunami and the Dragon Tsunami").
- Decided 2026-10-22: **the Roman sit is built at game scale from his pose** (*"romano sentado a"*). His sit picture is drawn at 0.80 of our scale; option A keeps his pose as the exact guide (legs, arms, drape, rock, frame by frame) built with the Roman set's own pieces at our size, so a seated character is as tall as a standing one. His rock is the seat prop, scaled to fit. On `body/male-skin-face`.
- Decided 2026-10-22: **his Lyra sitting and reading pictures are the new standard sit and read poses** for every character: *"copialo exacto me encanta estas poses nuevas de sentado y leyendo es el nuevo standard"*. She sits on a rock that is its own object and changes with the scene (*"puedes usar la piedra tambien como objeto pero ese objeto cambiara dependiendo del escenario"*); her hands are copied exactly (*"mira como estan sus manos se ven excelentes copialo igual"*). Copied on `heroine/lyra-v2` (read in 3 frames, sit in 1, his throw frames 3-4, his two rocks as the read and sit seats) and merged with Lyra (2026-10-23, above).
- Decided 2026-10-22: **the gap round 2 is approved and merged** (`jutsu/gap-set-2`): *"la ola torre suelo mojado ,vapor se ve bien aprovado"*. He will paint an S-rank upgraded Tide over our widest wave frame: *"a la ola pasame el sprite donde se ven mas olas para agregarle un kanji y una bestia animada que sera el jutsu en version mejorada clase s"*.
- Decided 2026-10-22: **the slender body is removed** (`cleanup/remove-slender`): *"elimina el tipo de cuerpo delgado se ve horrible y ya no cumple nuestros standares y para que ya no gastes recursos en ese estilo"*. The creator offers male, female and bulky; no preset, companion or enemy used it. A saved look on it loads on the female body (`migrateAppearance`, `src/sprite/bodies.test.ts`). Male, female and bulky renders are byte-identical to before. Don't build or test new art for it; the open branches that still test it drop those cases when they merge.
- Decided 2026-10-22: **Shiori is discarded, with everything about her** (`cleanup/remove-shiori`): *"shiori desechala esta horrible ese diseño"*, then *"todo lo que tenga que ver con ella"*. Her legend preset (`preset_gentle`, "Shiori, el Puño Suave") is gone, so 7 legends remain; this also drops one of the Naruto-derived designs (a Hinata copy, 4a). Hana, who was built on her sheet, keeps her own legacy fields and is unchanged in play. The items, feats and jutsu she wore are everyone's creator options and stay. A saved hero, roster entry or mission member made from her loads as a normal made ninja with its own data (test in `rules.test.ts`). `scripts/ai-battles.ts` plays Hiro fourth instead, so party A has no Northstar member now (D21's numbers were measured with her).
- Decided 2026-10-22: **solid jutsu get the characters' black line; energy gets none** (*"1 si 2 cambia 3 si"*). 1: every effect that is solid gets the line: all the beasts, the earth walls (3 orientations) and the crystal walls, the wood dragon and its roots, the Dragon Tsunami's dragon, the Water Dragon and Dragon Fire/Flame heads, the earth's thrown rocks and spikes (on the rock, not its dust), the D/C rock bullets. 2: the raiju's brown and the crane's teal outlines become the characters' black (this replaces "they stay his" in `docs/GAMEPLAY_DESIGN.md`); no line on the lightning streaks or wind wisps. 3: the poison walls and the chakra barriers get it round their solid frame, never round the slime, pane or glow. Fire, lightning, wind, water, chakra, poison and genjutsu projectiles, auras, blasts, smoke and dust stay without a line. Built on `vfx/solid-outline-apply` (`docs/SPRITE_STYLE_GUIDE.md`, "Outline").
- Decided 2026-10-22: **the headband stays, as plain cloth** (approved and merged the same day: *"si me gusta asi la bandana"*). The owner: *"deja la bandana pero quitale el diseño de puntitos referenciando un simbolo deja la pura bandana la pura tela"*. This replaces his earlier "quita las bandanas del juego ya no estara ninguna" (same day; the headband removal on `cleanup/remove-pieces`, "quitar bandanas", is replaced too). Built on `headband/plain-cloth`: the metal plate, its 7 emblems and the slash are gone from the drawing, the creator (Emblem picker, Plate colour, Slashed toggle) and the random ninja; position, tails and cloth colour stay, and every preset, companion and enemy keeps its band. Old saves drop `slashed`, `emblem` and `plate` on load (`migrateAppearance`, `sprite/legacy.ts`). Kaien's tag "Rogue Headband / Bandana de renegado" (the scratched plate) is now "Dark Headband / Bandana oscura". Waiting for his look at the before/after.
- Decided 2026-10-23: read uses his frame-2 pose (book raised in one hand) for all frames. His words: *"pon como estas poniendo (libro cerrado) en todas las poses de leer esa es la idea"*. Built on `body/male-skin-face` (held still; his frame 1 kept unused).
- Decided 2026-10-23: read hands option A (his hand shapes, the character's skin). Already the one in the game on `body/male-skin-face`.
- Decided 2026-10-23: his Roman head and neck are the male standard. Seeing his Roman look in the game with our default head (spiky blond hair, headband, our face on our short neck), his words: *"porque no tenemos la forma de cabeza y cuello de romano en el juego ? cambialo inmediatamente me gusta mas el de mi dibujo"*. Built on `body/male-skin-face` as a fix he asked for: with the `roman` face on a male body the head stands 3 px higher on his neck, where he drew it; his neck (`roman-neck-from-ref.py`) and his hair (`hair_roman`, `roman-hair-from-ref.py`) are his pixels; the default look (`defaultAppearance`) now has his face, his eyes and his red iris. **Still his**: whether a new game's hero (a copy of Solen, `freshNinja`) and the legends should take his head; whether the default look should also take his hair instead of the blond spikes and headband.
- Decided 2026-10-21 (later still), his jutsu answers: *"1 d y c y los de su clan 2 propuestas 3
  sello explosivo es un item o herramienta consumible palma curativa es un jutsu de utilidad 4 si
  pero no se puede cambiar de tipo lo que se va poder es tener 2ndo elemento en nivel mas alto y 3
  elementos si tienes el feat especial para eso"*. Built on `chakra/progression` (1, 3, 4); 2 (jutsu
  proposals for the Water S-rank and Wind gaps) is a separate job. **Still his**: the S-rank slot
  shown locked rather than removed, and when it opens; whether a changed legend becomes a new ninja;
  2 tags in the pouch (refilled every mission) for an old sheet with the tag jutsu; see
  `docs/GAMEPLAY_DESIGN.md` Open questions. (The second element's level and Kaien and Raiga: his
  next answer, below.)
- Decided 2026-10-21 (later still), who learns the genjutsu, kenjutsu and taijutsu jutsu: *"9 los
  que elijan de clase genjutsu kenjutsu o taijutsu"*. Built on `chakra/progression`. Kenjutsu to
  the Maestro de Bukijutsu confirmed ("si bukijutsu sera kenjutsu"). **Still his**: Ninjutsu and
  Medical learning none of the three. (Hana, medic, kept Yasaka no Magatama, marked, until he
  removed it on 2026-10-22; she has the Dragon Tsunami now.)
- Decided 2026-10-21 (later still), the second and third element: *"nivel 5 suena bien para segundo
  elemento o subir de rango tu elemento principal proponme el feat ok con kaien y raiga"*. Built on
  `chakra/progression`: at level 5 a second element or a higher rank of the main element; Kaien
  Rayo + Fuego, Raiga Fuego + Tierra. Approved as built ("nivel 5 esta bien", below). **Still
  his**: a new ninja starting at its sheet's level (6) and so choosing at creation; Light and Void
  without the choice; see `docs/GAMEPLAY_DESIGN.md` Open questions.
- Decided 2026-10-21 (later still), the ladder: *"si bukijutsu sera kenjutsu feat del tercer
  elemento opcion a nivel 5 esta bien al subir al nivel 7 te un rango A y al 10 un rango S"*. Built
  on `chakra/progression-2`: rank A at level 7, the S-rank slot at 10, for every ninja (a sheet's
  own higher jutsu stay, marked; no save migration; enemies untouched); the feat Tres naturalezas
  (option A). **Still his** (as built): rank A and S open for the class's kind and the second and
  third elements too, with no count limit; rank B still only through the level-5 higher rank; the
  third element fixed once made; the discount automatic, a Kawarimi counting as "the previous
  jutsu"; see `docs/GAMEPLAY_DESIGN.md` "The ladder" and Open questions.
- Decided 2026-10-21 (later still), the chakra colours: *"kirin negro dejar asi rosa y violeta y
  como se vea en otros colores dejalo asi se ve muy bien la curacion siempre se vera verde"*: the
  black Kirin stays, the other colours stay, a heal is always green (built on `jutsu/d-c-set`).
- Decided 2026-10-21 (later still), his answers to the Roman proposal: *"1 apruevo coraza falda brazaletes y sandalias 2 si 3 si copia la cara"*. 1 is merged (`armor/roman-paintover`). 2 and 3 are built on `body/male-skin-face` (his skin on every male body; his face as the `roman` face and eye shape), waiting for him to see the images before merging. **Still his**: his forearms are under his bracers, so ours keep our shading (in his darker tone) until he paints bare ones; a bare shin is his skin between the laces with the laces taken off; his far upper arm is only the strip he shows; he painted the head 3 px higher than ours (a longer neck), and the `roman` face sits on our head with his eyes on ours instead; no preset uses the new face yet.
- Decided 2026-10-21 (later): **a new female standard** from the owner's four heroine pictures. He said our base bodies look "muy feos" next to his pictures: "sube la calidad de nuestro sprite para que se vea mas parecido aun a la referencia". The new female body (proportions, hands, feet, skin from his pixels) is being built on `body/female-v2` for his approval. He also said: "las piezas de armadura y ropa femeninas no las rehagas porque muy problablemente las borremos por no estar al nuevo stadard" - the existing female armour and clothing are NOT refitted to the new body; they will probably be deleted. Hairstyles, heads, eyes, weapons, capes and the heroines' parts do follow it. The male body stays (approved through the Aiden paint-over).
- Decided 2026-10-23: the owner approved the female throw neck fix on `body/female-v2` (f84e80e, "aprovado" on the Lanzar 2-4 sheet: the head stays on the neck at its length). It goes into the game with the heroines, which are built on that body.
- Decided 2026-10-23: **the bulky base body is approved** (`body/bulky-v2`, his bare broad man): *"hombre corpulento base aprovado"*. The broad man's shirt on the normal male looks buggy: *"copia el estilo que tiene romano y pasa los colores de pixel a ese y pasa los brazos de romano a ese ya que tambien esta sin mangas"* (rebuilt on `body/brawler-roman`, waiting for his approval).
- Decided 2026-10-23: **Ren is approved except two fixes** (`fix/throw-neck-forearm`, all-poses sheets): *"apruevo todo lo demas de ren menos esos errores"*. The fixes, in progress on that branch: the far (left) arm and hand in the throw, to be his casting arm or the combo jab (*"en arrojar el brazo y mano izquierdo del personaje se ve mal copia el que tiene para lanzar jutsu o el jab en el combo"*); the sit pose and his far arm when seated, to the standard the others got (*"lo mismo hay que corregir que en los demas la pose de sentado y su brazo izquierdo cunado esta sentado"*), with the standard read. Ren is merged after he sees those.
- Decided 2026-10-23: **the hotbar with his icons of sheets 13–22 is approved** (`icons/sheet-13`, merged): *"aprovado"* on the six bars in the game.
- Decided 2026-10-23: **the Bleeding Cut's blood stays** (`jutsu/bleeding-blood`, merged under the withdrawn delegation): *"la sangre se ve bien"*.
- Decided 2026-10-23: **the Ascended set gets every fix the other characters got** (cast forearm, the strike's forearm, the throw's head "muy abajo", the standard read pose): *"ascendido necesita hacer todos los cambios y correciones que le hicimos a los demas"* (`sets/ascended-standard`). He will send an improved read picture showing the bandaged arms.
- Decided 2026-10-24: **the noble swordsman keeps his caped look; only the no-cape version is dropped** (`hero/noble-swordsman`): first *"desecha este y usa los nuevo"*, then, correcting, *"el sin capa nadamas con capa no lo deseches"*. The plain no-cape shirt is not used; without a cape, his new officer pictures (`hero/navy-officer`) are the tops to wear.
- Decided 2026-10-24: **Scarlet (Valen) is removed from the game completely**: *"scarlet lo vas a borrar del juego completamente"*. Nothing of him is in the integration branch's code; the `scarlet/*` branches (`study`, `standard`, `face`, `hair`, `upper`, `lower`, `gloves-boots`, `sword`, `integration`) are abandoned and must not be merged. This replaces the decision of 2026-10-23 below.
- Decided 2026-10-23: **Scarlet stays and is rebuilt to the standard** of Roman, Ren and Aiden: *"scarlet lo dejaremos tenemos que reconfigurar al estandar se ve muy mal hecho comparado con romano o ren o aiden"* (`scarlet/standard`). His name is still open.
- Decided 2026-10-21 (later that night): of the gaps' jutsu the owner approved the **Gale Curtain, Thunder Beam and Rubble Gust** ("los demas jutsus aprovados de esa seccion"). The Devouring Tide (now rank A) and the Whirlwind Tower get a second round on `jutsu/gap-set-2`, with his new element dynamic (water puts out fire, wet ground for 2 turns that conducts lightning, fire on wet ground makes steam that blocks vision and burns).
- Decided 2026-10-21 (later that night): **the delegation is withdrawn**. The owner: "deja de autorizar cosas y dime que autorizaste". From now on nothing is approved or merged without his own yes. Merged under the delegation, and still open to his review or a revert: `ryusei/warp-throw` (Shooting-Star Thrust comet, phase body, throw/thrust poses), the critical animation of `ui/dice-d20`, `chakra/lightning-crackle` (Battle Static), `jutsu/bleeding-blood` (blood spray and screen drops), `jutsu/gap-set` (the five gap jutsu, the Gale Curtain's +1/+2 dice rule, swept units stopping 1.2 m from others), `vfx/ideas-round1` (round 1 effects, the new wood dragon and Chidori art, the pauses before melee blows so the die lands with the hit).
- Decided 2026-10-21 (night): **a 24-hour delegation**. The owner: "estas aprovado para aprovar cosas como las que me estas pidiendo permiso por 24 horas" - until about 2026-10-22 night, his sessions may approve and merge the kind of work they were asking him to approve (finished art and features he requested, after the checks and a look at the images), and show him the result afterwards. Irreversible changes (save formats, renaming saved ids, deleting art), new dependencies, names and anything franchise-related still go to him.
- Decided 2026-10-21 (evening): **every character is raised to the detail level of the owner's Roman paint-over** (bronze cuirass and Roman skirt): "vamos a cambiar a todos los personajes para que esten a este nivel de detalle entonces todas las ropas cabezas ropa y armaduras se tienen que ajustar a este nivel de detalle". Valen (`scarlet/*`) is included: "valen va necesitar rework como todos nuestros personajes". How (his paint-overs vs our rework) is still open.
- Decided 2026-10-21 (night): **Lyra keeps her own long forearms** ("lyra se queda con sus brazos largos"). Her picture's forearms are 2–3 px longer than the female standard; the appearance option `arms: 'long'` ("Brazos: Largos", branch `heroine/lyra-v2`) stays on her preset only, and the female standard keeps its own length for everyone else. When Lyra is re-pinned on the rebuilt female body, she keeps the long arms.
- Decided 2026-10-21 (later): Warp Strike is renamed **"Shooting-Star Thrust"** (Spanish **"Estocada Fugaz"**; the owner first said "Shooting Star", then chose these), after the clan's name (Ryusei = shooting star) and to stay clear of other games' "Warp Strike". The id `ryusei_warp` stays. **Applied on `ryusei/warp-throw`** (2026-10-21, after `icons/sheets-8-11` was merged): the names in both languages, the hotbar button's tooltip (the slot shows only its icon; its short label *Estocada Fugaz* / *Star thrust* is the button's accessible name), the name shown over the ninja and the log, the clan texts in the creator and the battle, D24 and `docs/GAMEPLAY_DESIGN.md`. With it, his "shooting star" look for the flying weapon (a comet's tail).
- Decided 2026-10-21: **d20 dice on screen** in three styles the player picks in the main menu
  (Gema, Marfil y oro, Obsidiana rúnica), and **a natural 20 on an attack = automatic critical with
  maximum damage** and an extra animation (`docs/GAMEPLAY_DESIGN.md`, "Dice"). He asked for more
  realistic dice than the first draft; the realistic art is on `ui/dice-d20` (generator
  `tools/ui/dice-d20.ts`, sheets in `src/assets/ui_dice/`), approved (styles liked, Gema the default; merged under his 24-hour delegation).
  Decided later the same day (his answer "a3, b3, c3"): on a save a natural 20 resists completely
  (no damage, no effect) and a natural 1 takes the caster's critical (maximum damage, the same
  animation); on a check a natural 20 succeeds with an extra and a natural 1 fails (the extras per
  check in `docs/GAMEPLAY_DESIGN.md` "Dice" and `docs/MISSION_DESIGN.md`). On `ui/dice-d20` it is
  all wired in: the rules in `src/battle` and `src/rules` (with tests), the dice in battle
  (`src/components/dice/`, `battle/diceLayer.ts`, paced by `playback.ts`, a skip button), the
  "Opciones" panel in the main menu (`shinobi.dice`, default Gema in the chakra colour, his choice) and the camp log's die.
- Decided 2026-10-21: the Spanish names are **"Golpe Warp"** and **"Comando"** (the owner: "los dos"); `icons/sheets-8-11` brings them and updates D24 in `docs/CLANS_DESIGN.md`. (Golpe Warp was later renamed Estocada Fugaz, above.)
- Jutsu pacing (owner: too fast, "like a flashing star"): a first pass is merged (`8ef28a9`: 560 ms
  cast beat, about 115 ms/m for projectiles and 150 ms/m for beasts, longer impacts, the next turn
  waits, speed 1×/2×/3×). Not signed off.
- Clan rulings D5 (camp activities and jutsu flavour per clan) and D18 (may an enemy Northstar
  command the party's ninjas?).
- When to start the clan eyes (he said later).
- Pictures to send again (none is in `docs/reference/` yet): the body shape from his no-skirt
  picture (slim torso, baggy pants into leg wraps); the red cape with gold trim (Crimson Knight
  Cape); the royal fur cape (ermine collar, gold medallions, fleur-de-lis, front tabard); the
  Zero-style noble set (black cape with red lining and high gold-trimmed collar, black-and-gold
  suit, rapier with gold guard and red jewel). (His icon sheets 8–11 are on `icons/sheets-8-11`.)

- `jutsu/chidori-active` (2026-10-21): the activated Chidori built with his answers. Approve his
  lightning in the hand (copied from both paint-overs), the crackle, the cracks (new art; redone
  deeper and heavier on 2026-10-22 after "se ven muy debiles ahora"), and the
  points left open: the blow is an attack roll (it was a CON save); the cracks slow their own ninja
  too; only the ninja's own moves set it off (`docs/GAMEPLAY_DESIGN.md`).

## 4. Backlog

- Healing at camp for the medic (the owner, 2026-10-24: idea 6, *"ok implementaremos algo"*): later.

### 4a. Replace Naruto-derived names and designs (before any public release)

Counted on the integration branch as lines in `src` (without `src/assets`) that match the term,
case-insensitive. A two-word term also matches with `_` or `-` between the words (`body_flicker`).
Generated art in `src/assets` adds more (icon files and manifests such as `rasengan.png`).

| Term | Lines | Where |
|---|---|---|
| sharingan | 31 | shinobiData 13, types/shinobi 5, CharacterCreator 3, campActivities 2, rules/rest 2, battle.test, ArenaSandbox, CampaignMode, RestCamp, ruleText, legacy |
| byakugan | 15 | CharacterCreator 4, RestCamp 2, campActivities 2, shinobiData 2, types 2, CampaignMode, rest, legacy |
| mangekyo / kamui / amaterasu / susanoo | 7 / 2 / 4 / 4 | shinobiData, types, legacy, CharacterCreator |
| rasengan / rasenshuriken | 5 / 13 | shinobiData, types, legacy, units; rasenshuriken is only the id `rasenshuriken_wind` now (the Hurricane Star), in data and tests |
| chidori / raikiri | 22 / 1 | shinobiData 8, battle.test 6, units 2, others |
| kirin | 16 | shinobiData 6, battle.test 5, vfxSprites 2, others |
| hokage / akatsuki / konoha | 3 / 3 / 3 | types, legacy, shinobiData (Konoha Senpuu) |
| kage (whole word) | 1 | shinobiData (Kage Bunshin) |
| eight gates | 6 | shinobiData (Taijutsu class text, feat `eight_gates_initiate`) |
| shadow clone | 7 | shinobiData 4, BattleScreen, battle/types, jutsu |
| kawarimi | 66 | engine 20, battle.test 10, shinobiData 7, battle/types 6, others (a core reaction) |
| shunshin / body flicker | 3 / 20 | shinobiData, battle.test, units, jutsu, BattleScreen (ids `body_flicker`) |
| goukakyu / suiryuudan / doryuudan / doryuheki / suijinheki / mikazuki | 33 / 6 / 5 / 11 / 9 / 1 | jutsu ids such as `fireball_goukakyu` |
| uchiha / hyuga / senju / uzumaki | 3 / 3 / 4 / 3 | old-clan migration in `rules/ninja.ts` + tests (Uddo and Akkai there are not Naruto names) |
| taki (whole word or `taki_`) | 11 | `taki_sixtyfour_palms` and the old clan Taki |
| Naruto character names (whole words: naruto, sasuke, kakashi, itachi, madara, hashirama, tobirama, hinata, neji, gaara, jiraiya, tsunade, orochimaru, minato, obito, shisui, kushina, nagato, kisame, deidara) | 28 | shinobiData 13, types 7, legacy 7, units 1 |
| tomoe / pinwheel / pale eye(s) | 26 | shinobiData 8, sprite/body 7, types 3, legacy 3, others (`katana.ts` 2 and `words.ts` 1 are a heraldic guard, fine) |
| sage eye(s) | 5 | shinobiData, types, CharacterCreator |
| kurama / tailed beast(s) | 5 | CampaignMode 3, ArenaSandbox, shinobiData |
| chunin / genin / jonin / ANBU | 10 / 3 / 23 / 6 | rules.test, Arena, Campaign, battle.test and units (`jonin` enemy kind id), armor, legacy |
| tenketsu | 11 | shinobiData, campActivities, rest, effects, RestCamp |

What players see:
- Creator eyes: Sharingan 1/2/3-Tomoe, Mangekyo (Kamui / Amaterasu), Byakugan, Sage Eyes
  (**wait for the owner**).
- All 27 jutsu are Naruto techniques (Kage Bunshin, Shunshin, Kawarimi, Goukakyu, Suiryuudan,
  Doryuheki, Chidori, Raijuu Tsuiga, Konoha Senpuu, Mikazuki no Mai, Nehan Shouja, Kongou Fuusa,
  Hakke 64 Palms, Mokuton, Kirin, Gouka Mekkyaku, Mokujin, Night Guy).
  - Decided 2026-10-22 (the owner, naming his icon sheets): Shunshin → **Desvanecer** ("Vanish",
    `body_flicker`) and Konoha Senpuu → **Patada huracán** ("Hurricane Kick", `leaf_hurricane_senpuu`);
    ids unchanged. He will rename Rasenshuriken and Night Guy himself, and plans to remove
    Yasaka no Magatama and make something else.
  - Decided 2026-10-22 (later): Rasenshuriken → **Estrella Huracán** ("Hurricane Star",
    `rasenshuriken_wind`), Espejismo/Mirage → **Mind Twist** ("Mente retorcida" in Spanish,
    `genjutsu_mirage`), ids unchanged; Yasaka no Magatama removed from the game. Night Guy is left
    for him to rename.
- Feats and class text: Eight Gates, Tenketsu Lockout, feat id `sharingan_precog`.
- Camp: "Sharingan reading", "Byakugan watch", "Close tenketsu", Ryusei's "Wood shelter" and
  "Wood skin".
- Presets copying characters: Hiro (Naruto), Kaien (Sasuke), Raiga (Madara), Solen (Hashirama-style
  founder). (Shiori, a Hinata copy, is gone: the owner discarded her on 2026-10-22.)
- Items: hair `hair_sunburst`, `hair_raven`, `hair_flash`, `hair_gravity`, `hair_warlord`,
  `hair_lowtail`; capes `cape_haori`, `cape_rogue`; held `held_spiral`, `held_lightning`,
  `held_palm`; face `face_beast` whiskers, fox and cat masks.
- Old Practice screens: "Chunin Trials", "Genin Rival Skirmish (Leaf & Sand)", "Mist vests",
  "Orochi Hydra", "Kurama Avatar".
- Metadata: `metadata.json` and `index.html` say "Naruto 5e…"; `package.json` is "react-example".

Legacy-only (kept to load old saves): the old type lists in `types/shinobi.ts`, `shinobiData.ts`,
`sprite/legacy.ts`, the presets' legacy fields, unused `COLOR_PALETTES` labels, the old-clan
migration. Renaming what players see is cheap; changing ids needs a save migration
(`RENAMED_JUTSUS` in `CharacterCreator.tsx`).

### 4b. Rasengan, Venom Surge and Water Stream
Designed in `docs/GAMEPLAY_DESIGN.md` ("Three new jutsu", 2026-10-20), icons on integration, not in
`JUTSUS_DATA`. `ElementalNature` needs Chakra and Poison first.

### 4c. Elemental nature gates jutsu
Built on `chakra/decisions` (2026-10-21; how it gates is the builder's proposal, waiting for the
owner's approval, section 3): the chakra type picked in Appearance > Chakra is the
nature (`natureOf`, `src/rules/ninja.ts`), and in the creator's Jutsu step the Element I, Element II
and S-rank slots offer only jutsu of the ninja's element plus the ones with no element (taijutsu,
kenjutsu, genjutsu); Utility and the clan secret are not gated; Light and Void get no elemental
jutsu until their own exist. Changing the type swaps the jutsu of another element (lowest rank of
the new element first) and says which; a sheet's own off-nature jutsu (Kaien's Fireball, Raiga's
Earth Wall, older or imported sheets) stay, marked. The random ninja picks jutsu of its nature.
Enemies and battles are untouched. The rank cap (D, C and the clan's) and the fixed type are built
on `chakra/progression`, and so are the class gate for the taijutsu, kenjutsu and genjutsu jutsu
and the level-5 choice (a second element or a higher rank; Kaien and Raiga's second natures). The
ladder (rank A at 7, S at 10) and the feat Tres naturalezas are on `chakra/progression-2`. Left: a
level-up screen (the choices are made in the creator for now), the jutsu of Light and Void (and
later Shadow and Spirit). More Wind jutsu (the Gale Curtain, the Whirlwind Tower) and a Water rank A
(the Devouring Tide, rank S until his second round on `jutsu/gap-set-2`; the Tsunami since
2026-10-22) are built, and Water S (the Dragon Tsunami, `jutsu/tide-s`); Earth A, Water D and a
third Fire D/C are still gaps.

### 4d. Missions (not built)
Branching road, road traps and curios, votes, cinematics and decisions, the AI choosing camp
activities, more missions and maps, local and online multiplayer. See `docs/MISSION_DESIGN.md`.

### 4e. Steam (nothing done)
Desktop wrapper (Electron or Tauri) and Steamworks; file saves or Steam Cloud with versioning;
gamepad, Steam Deck (1280×800) and phone layouts; store page art and text. First: finish 4a and
remove the AI Studio leftovers (`README.md`, `metadata.json`, package name, unused `@google/genai`,
`express`, `dotenv`).

### 4f. Other
- Jutsu with no owner icon after sheets 13–22: Night Guy (`night_guy_dragon`, he renames it later).
  Yasaka no Magatama is removed from the game. The icons he turned down are not used: his first golem
  (sheet 13), his first Espejismo (sheet 15), his first Whirlwind Tower (sheet 18) and his first
  Rasenshuriken (sheet 21); each was replaced by a later one of his (golem sheet 14, Mind Twist as
  Espejismo sheet 21, tower sheet 21, Rasenshuriken sheet 22).
- His labels on sheets 20–21 are now our names: "Desvanecer" (Body Flicker), "Patada huracán" (Leaf
  Hurricane), "Estrella Huracán" (Rasenshuriken); "Mind Twist" is the Espejismo.
- Clan Paths of Mastery; clan reference pictures (CLANS_DESIGN: mechanics first, art after).
- World sprites are paused (`tools/world-sprites/README.md`); the hydra art (`world/creatures/`)
  is not in the repo yet.
- Doc gaps: `docs/reference/README.md` has no row for `aiden-owner-reference.jpg`;
  `tools/refs/README.md` covers only the VFX converters (Aiden, sword, cape and icon scripts are
  documented in their own headers).

## 5. Who works where (suggestion: the owner decides)

| Area | Suggested owner | Main paths |
|---|---|---|
| Art, characters, creator, sprites, VFX, icons, HUD art | Owner's sessions | `src/sprite/`, `src/components/creator/`, `tools/`, `src/assets/`, `docs/reference/` |
| Maps, missions, encounters, story and dialogue, balance | Collaborator | `src/battle/maps/`, `src/battle/encounters.ts`, `src/data/missions.ts`, `src/game/`, `src/rules/`, `scripts/ai-battles.ts`, `docs/MISSION_DESIGN.md` |
| Shared: battle engine core, jutsu data, battle screen | Ask first, small PRs | `src/battle/engine.ts`, `src/data/shinobiData.ts`, `src/components/battle/BattleScreen.tsx` |

A collaborator's new map or mission still needs the owner's approval for any new art it brings.
