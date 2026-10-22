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
  Sunburst Hero, Raiga the Warlord of Ash, Shiori the Gentle Fist, Ren the Night Prince.
- Companions: Hana (Kōton, Medical), Kenji (Ryusei, Genjutsu), and every preset.
- 5 classes (Ninjutsu, Taijutsu, Genjutsu, Medical, Bukijutsu) and 9 feats.
- Appearance (`src/sprite/catalog.ts`):

| Group | Options |
|---|---|
| Bodies | 4 (male, female, bulky, slender) |
| Hair | 35 (plus `hair_none`) |
| Eyes / face shapes / necks | 8 (incl. the owner's "valiant") / 4 / 2 |
| Face marks and masks | 7 |
| Tops / bottoms / skirts / waist | 9 / 5 / 4 / 5 |
| Armor | 16 (plus `armor_none`) |
| Feet / hands | 7 / 5 |
| Capes | 8 |
| Held | 9 (plus `held_none`): katana built from parts, crystal, ice crystal, flame longsword, kunai, naginata, spiral, lightning, palm |
| Accessories | 13 |
| Headband | 5 positions, 7 emblems, slashed or not, tails or not |
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
  Fireball / Great Fireball, Great Fire Annihilation (normal and enhanced), Kirin.
- Hotbar icons from the owner's sheets 1–7 and 12 (`src/assets/ui_icons/`): 10 jutsu, 3 for jutsu
  not built yet (Rasengan, Venom Surge, Water Stream), 17 actions, great_fireball.

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
| `camp/owner-ref` | `70293ba` | Read, lean and sit camp poses from his picture (`camp-poses-owner-reference.webp` on that branch); touches `rig.ts`, `compose.ts`, `ctx.ts`, `campfx.ts` | **WIP, being redone**: copy his book and both hands exactly; show Aiden reading |
| `camp/hands-book` | `a3ae184` | Earlier pass, already inside `camp/owner-ref` | Superseded |
| `ryusei/phase` | `1bd38c9` | Warp Strike (now Shooting-Star Thrust) and Spatial Swap carry the ninja as a see-through electric-blue light body (`src/sprite/phase.ts` + tests, renderer, playback) | **Waiting for approval.** The Shooting-Star Thrust choreography is on `ryusei/warp-throw`. Swap stays |
| `ryusei/warp-throw` | local, not pushed (the comet, the rename and a merge of the integration branch on top of `999cb29`) | `ryusei/phase` + `poses/throw-pierce` + the Shooting-Star Thrust (Estocada Fugaz, once Warp Strike) choreography (the owner, 2026-10-21): the throw, the weapon flying point first, the phase starting in his release pose, the landing in the `pierce` thrust. Review fixes: the weapon is first drawn clear of his face; empty hands, a technique in the palm or a stowed weapon throw a kunai from the pouch (the stowed weapon stays on the back, the kunai fades out as light after the thrust); a short warp's weapon hangs in the air for the catch; the frames are made ahead for every Ryusei, Node or not, weapon drawn or stowed. Then (2026-10-21, his "shooting star"): the flying weapon is a shooting star, a white-hot head with a twinkling star at its point and a long comet's tail of the phase's blues that tapers along the curve of the flight, sheds sparkles and lights the night (`src/sprite/comet.ts` + tests, `warpFlight.ts`, `renderer.ts` drawNight); and the rename is applied everywhere players see it, with D24. Review fixes: a deep blue line round the tail so it reads over the light body and pale ground; the sparkles flung out of the tail's sides as a stardust wake that outlasts it; the night light round it blue, not the grass's green; the comet about 4x cheaper to make and made once per moment; captures of diagonal and up-the-map flights, where the tail follows the curve. Spatial Swap unchanged | **Merged** (approved 2026-10-21 under the owner's 24-hour delegation: "estas aprovado para aprovar cosas como las que me estas pidiendo permiso por 24 horas") |
| `poses/throw-pierce` | `f722aee` | `throw` (4 frames, release copied from his Warp Strike picture, now the Shooting-Star Thrust) and `pierce` (5-frame lunge) poses, in the creator stance bar; `src/sprite/strike.test.ts` | **Waiting for approval**; `ryusei/phase` needs it |
| `icons/sheets-8-11` | `e413f5f` | His sheets 8–11 (14 icons): adamantine chains, dragon fire bomb, dragon fire stream, Kōton block and wall, Mirai evasion, Northstar Command and Submission, Ryusei swap and warp, shadow clone, 64 palms, water dragon, wood dragon | **WIP**: fixes, plus phase-style ninjas in Intercambio / Golpe Warp (now Estocada Fugaz) |
| `scarlet/study` | `3b5dfe9` | His new character picture (`scarlet-owner-reference.jpg`) and study scripts `tools/refs/scarlet*`; nothing in `src` | **WIP**. Provisional name "Valen, the Scarlet Duke", no cape: **the owner must choose the name** |
| `chakra/jutsu-tint` | not pushed (local) | Elemental jutsu, their beasts and walls in the caster's chakra colour (`src/sprite/vfxTint.ts`, `src/components/battle/vfxTint*.ts`; `docs/GAMEPLAY_DESIGN.md`, "The chakra colour colours the elemental jutsu") | **The owner approved the colours** (2026-10-21); wired into the battle (checked in the browser), review fixes done (no recolouring on the screen's thread, memory capped); answered 2026-10-21: the black Kirin stays (pink and violet kanji), other colours stay as they look, "la curación siempre se verá verde" (the green heal is on `jutsu/d-c-set`); not merged |
| `chakra/decisions` | not pushed (local) | The owner's four answers on the chakra types (saved legends updated, Shadow and Spirit pending, Cinder Nova kept) and the nature gating the elemental jutsu in the creator | **For review** |
| `chakra/progression` | `51b44c0` on origin (WIP); the finished work is local, not pushed | His jutsu answers: D/C + clan for a new ninja (S-rank slot locked), the explosive tag as an item (throw / hide, save migration), the chakra type fixed once made; the taijutsu, kenjutsu and genjutsu jutsu gated by class; level 5: a second element or a higher rank, Kaien and Raiga's second natures | **For review** |
| `jutsu/d-c-set` | not pushed yet (merged with the integration branch at `26371c4`) | 12 rank D and C jutsu (data, rules, AI, log; `docs/GAMEPLAY_DESIGN.md`, "Rank D and C jutsu"), then their effects (three projectile paths, the joined Spark Fan, the white Bleeding Cut, the Rush's tackle pose), in the caster's chakra colour; review fixes (sword arts need a blade, charges stop at deep water and cliffs); his answers 4–8 (Numb 2 rounds, silent Mirage and Bleeding Cut, the water aura on the Mystical Palm); healing always green (the Palm and the Dew never take the chakra colour) | **Merged** (the owner approved 11 of 12; the Bleeding Cut waits for its blood spray on `jutsu/bleeding-blood`). Every element gains D/C jutsu in the nature filter's and the class gate's offers (their tests updated) |
| `chakra/progression-2` | on origin | His answer "feat del tercer elemento opcion a nivel 5 esta bien al subir al nivel 7 te un rango A y al 10 un rango S": rank A at level 7 and S at 10 for every ninja, the feat Tres naturalezas (requirements in the creator, third element pick, battle discount), kenjutsu and level 5 confirmed in the docs | **Merged** (his decisions) |
| `chakra/lightning-crackle` | on origin | Lightning's second burst, *Estática de batalla* / Battle Static (his name; id `cyan`): small bolts crackling all the time, more and longer while empowered (an enhanced jutsu's cast, the creator's chakra aura), no aura, on a 10 s loop (`src/sprite/chakra.ts`, `chakraNature.ts`, `chakraInfo.ts`, `src/sprite/chakra.test.ts`, `creator/words.ts`; the callers take the loop from `chakraLoop()` and pass `empowered`: `ShinobiSpriteCanvas.tsx`, `battle/unitArt.ts`, `battle/renderer.ts`, `battle/playback.ts`) | **Merged** (approved under his 24-hour delegation) |
| `jutsu/bleeding-blood` | pushed | The Bleeding Cut's blood (his answer "apruebo los 12 jutsus con excepcion del de tajo sangrante..." and "las gotas de sangre manchan la pantalla..."): a spray thrown toward the side the cut travels, drops on the screen when Bleeding takes hold, a drip when it hurts (`tools/world-sprites/vfx-blood.ts` → `src/assets/world/vfx_blood/`, `src/components/battle/bloodPlan.ts` + tests, `seq.blood` in `src/battle/jutsu.ts`; touches `playback.ts`, `vfxSprites.ts`, `renderer.ts`) | **Merged** (approved under his 24-hour delegation) |
| `jutsu/gap-set` | on origin (merged into the integration branch) | The owner's answers on the gaps proposal: the Devouring Tide (Water S), the Whirlwind Tower (Wind A), the Gale Curtain made a gale on the ground that fans fire (+1 die to a fire jutsu through it, whoever casts it), the Thunder Beam and the Rubble Gust (Lightning and Earth C); knock-down, sweep and drag on a failed save (ninjas only), water puts out flames; their effects from his sheets (the running wave, the tornado tower, the gale on the ground, the fanned fire's glow and vortex); `docs/GAMEPLAY_DESIGN.md`, "Jutsu for the gaps", and his rule that the elemental beasts are summons | **Merged** (approved under his 24-hour delegation; his open questions stay below) |
| `vfx/ideas-round1` | merged into the integration branch | The owner's first round of jutsu effect answers (`docs/GAMEPLAY_DESIGN.md`, "Jutsu effects, round 1"): Llama Dragón (his Annihilation dragon head over his flame wall, a fan of fireballs), Fuego del dragón (half head, the stream to the line's end), Cadenas selladoras (chain and seal circle), Dragón de agua (no beast: his dragon head in water on his stream, a varied path), Balas de tierra (three volleys of rock bullets on varied paths), Luna creciente (three chakra crescents), Templo del Nirvana (crows out of the vortex), Huracán de la hoja (weapon stowed, a new unarmed `combo` pose, wind crescents); new group `vfx_dragon` (`tools/world-sprites/vfx-round1.ts`); pieces P1–P6 in the battle screen; then the two new effects: Dragón de madera (his dragon out of his icon rising behind the target after a row of roots, `vfx_wood`) and Chidori (his lightning in the bare hand, then a thrust, `vfx_hand`; the weapon stowed), by `tools/refs/wood-dragon-from-ref.py` and `tools/world-sprites/vfx-new-r1.ts` | **Merged** (approved under his 24-hour delegation; his open questions stay below) |
| `armor/roman-paintover` | merged into the integration branch | The owner's Roman paint-over (`roman-owner-reference.jpg`): `armor_bronze` and `skirt_imperial` now his pixels (same ids; drapes as a part, hanging from the hip and ending above the ground), new `hands_bronze_bracers` and `feet_gladiator_sandals`; the old default colours of the two items now mean his; the female bodies keep the fitted cuirass; Solen (`preset_founder`) wears the skirt without drapes; `tools/refs/roman*`; `src/sprite/roman.test.ts`. Touches `armor.ts`, `clothes.ts`, `feet.ts`, `words.ts`, `shinobiData.ts` (Solen's skirt) | **Merged** (the owner approved the cuirass, skirt, bracers and sandals, 2026-10-21) |
| `sets/ascended-kimono` | on origin | The owner's Ascended paint-over (`ascended-owner-reference.jpg`) on seven items, ids kept: `hair_ascended`, `cape_rogue`, `top_kimono`, `bottom_hakama`, `waist_sash`, `hands_wraps`, `feet_wraps`; his pieces on the rig in every pose (sleeves, bandaged forearms and fists, hakama legs turned about our joints; our bare arm and legs give way under them); the feet moved onto our ankles; old default colours read as his; the female bodies keep the drawn items (but for the hair); Kagero's cloak lining now his red (`src/battle/units.ts`). `tools/refs/ascended*`, `src/sprite/items/ascended.ts` and seven `*Art.ts`, `src/sprite/ascended.test.ts`. Touches `capes.ts` (`crimsonBack` became `hungBack`, same output), `clothes.ts`, `feet.ts`, `hair.ts` | **Waiting for approval** |
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

## 3. Waiting for the owner

- Approve or correct: `ryusei/phase`, `poses/throw-pierce`, the Shooting-Star Thrust choreography
  and its comet on `ryusei/warp-throw`, the icons on `icons/sheets-8-11`, the camp poses once redone.
- Two Ryusei names now share *Fugaz*: the ability *Estocada Fugaz* and the planned path *Filo Fugaz*
  (Path of the Fleeting Edge, `docs/CLANS_DESIGN.md`). Keep both, or rename the path?
- Name the Scarlet character (`scarlet/study`).
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
  Medical learning none of the three; Hana (medic) keeping Yasaka no Magatama, marked.
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
- Decided 2026-10-21 (later): **a new female standard** from the owner's four heroine pictures. He said our base bodies look "muy feos" next to his pictures: "sube la calidad de nuestro sprite para que se vea mas parecido aun a la referencia". The new female body (proportions, hands, feet, skin from his pixels) is being built on `body/female-v2` for his approval. He also said: "las piezas de armadura y ropa femeninas no las rehagas porque muy problablemente las borremos por no estar al nuevo stadard" - the existing female armour and clothing are NOT refitted to the new body; they will probably be deleted. Hairstyles, heads, eyes, weapons, capes and the heroines' parts do follow it. The male body stays (approved through the Aiden paint-over).
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

## 4. Backlog

### 4a. Replace Naruto-derived names and designs (before any public release)

Counted on the integration branch as lines in `src` (without `src/assets`) that match the term,
case-insensitive. A two-word term also matches with `_` or `-` between the words (`body_flicker`).
Generated art in `src/assets` adds more (icon files and manifests such as `rasengan.png`).

| Term | Lines | Where |
|---|---|---|
| sharingan | 31 | shinobiData 13, types/shinobi 5, CharacterCreator 3, campActivities 2, rules/rest 2, battle.test, ArenaSandbox, CampaignMode, RestCamp, ruleText, legacy |
| byakugan | 15 | CharacterCreator 4, RestCamp 2, campActivities 2, shinobiData 2, types 2, CampaignMode, rest, legacy |
| mangekyo / kamui / amaterasu / susanoo | 7 / 2 / 4 / 4 | shinobiData, types, legacy, CharacterCreator |
| rasengan / rasenshuriken | 5 / 7 | shinobiData, types, legacy, units, BattleScreen, jutsu.ts |
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
  Hakke 64 Palms, Mokuton, Kirin, Rasenshuriken, Gouka Mekkyaku, Mokujin, Yasaka no Magatama,
  Night Guy).
- Feats and class text: Eight Gates, Tenketsu Lockout, feat id `sharingan_precog`.
- Camp: "Sharingan reading", "Byakugan watch", "Close tenketsu", Ryusei's "Wood shelter" and
  "Wood skin".
- Presets copying characters: Hiro (Naruto), Kaien (Sasuke), Raiga (Madara), Shiori (Hinata),
  Solen (Hashirama-style founder).
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
later Shadow and Spirit). A Water S-rank (the Devouring Tide) and more Wind jutsu (the Gale Curtain,
the Whirlwind Tower) are built on `jutsu/gap-set`; Earth A, Water D and a third Fire D/C are still
gaps.

### 4d. Missions (not built)
Branching road, road traps and curios, votes, cinematics and decisions, the AI choosing camp
activities, more missions and maps, local and online multiplayer. See `docs/MISSION_DESIGN.md`.

### 4e. Steam (nothing done)
Desktop wrapper (Electron or Tauri) and Steamworks; file saves or Steam Cloud with versioning;
gamepad, Steam Deck (1280×800) and phone layouts; store page art and text. First: finish 4a and
remove the AI Studio leftovers (`README.md`, `metadata.json`, package name, unused `@google/genai`,
`express`, `dotenv`).

### 4f. Other
- Battle abilities with no owner icon even after sheets 8–11: body flicker, explosive tag, mystical
  palm, Kawarimi, wind blade, leaf hurricane, Rasenshuriken, wood golem, Yasaka, Night Guy,
  Pursuing Flame.
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
