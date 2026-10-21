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
  `shinobi5e.mission.v1` (one autosave) and `shinobi.lang`.

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
| Chakra | 9 types, which are the ninja's elemental nature: 7 offered (Fire with 2 bursts, Water, Wind, Lightning, Earth; Light and Void without element) and 2 pending, out of the selection (Shadow, Spirit); any colour for any type; 8 cast styles ("eye" hidden) |
| Poses | 7 creator, 5 moving, 4 camp |

**Clans** (phase 1; source of truth `docs/CLANS_DESIGN.md`)

| Clan | Bonus | Abilities |
|---|---|---|
| Mirai | +2 DEX +1 INT | Eye of Tomorrow (enemy intents), Premonitory Evasion (reaction), Pursuing Flame |
| Kōton | +2 CON +1 INT | Modular Architecture: metal Block (bonus action) and Wall (action), with HP, 2 at most |
| Ryusei | +2 DEX +1 WIS | Weapon Nodes, Warp Strike, Spatial Swap |
| Northstar | +2 CHA +1 WIS | Aura of Sovereignty, Command, Natural Submission |

Counter cycle Mirai > Northstar > Ryusei > Kōton > Mirai. Enemy ranks Minion, Captain, Sub-boss,
Boss. Paths of Mastery: designed, not built.

**Jutsu**
- 27 creator jutsu (`JUTSUS_DATA`); 5 slots: Utility, Element I, Element II, Clan secret (fixed),
  S-rank. Battle-only: 8 clan abilities and the hydra's Venom spit and Roar.
- The nature gates the elemental jutsu in the creator (`chakra/decisions`, 2026-10-21): the Element
  and S-rank slots offer only the ninja's own element plus the jutsu with no element; Utility and
  the clan secret are free; Light and Void get no elemental jutsu yet (`src/rules/jutsuNature.ts`).
  How it gates is the builder's proposal, waiting for the owner's approval (section 3).
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
| `ryusei/phase` | `1bd38c9` | Warp Strike and Spatial Swap carry the ninja as a see-through electric-blue light body (`src/sprite/phase.ts` + tests, renderer, playback) | **Waiting for approval.** Next: Warp Strike choreography (throw the weapon in his throw pose, it flies to the target with sparkle trails, the ninja phases and reappears with a piercing thrust). Swap stays |
| `poses/throw-pierce` | `f722aee` | `throw` (4 frames, release copied from his Warp Strike picture) and `pierce` (5-frame lunge) poses, in the creator stance bar; `src/sprite/strike.test.ts` | **Waiting for approval**; `ryusei/phase` needs it |
| `icons/sheets-8-11` | `e413f5f` | His sheets 8–11 (14 icons): adamantine chains, dragon fire bomb, dragon fire stream, Kōton block and wall, Mirai evasion, Northstar Command and Submission, Ryusei swap and warp, shadow clone, 64 palms, water dragon, wood dragon | **WIP**: fixes, plus phase-style ninjas in Intercambio / Golpe Warp |
| `scarlet/study` | `3b5dfe9` | His new character picture (`scarlet-owner-reference.jpg`) and study scripts `tools/refs/scarlet*`; nothing in `src` | **WIP**. Provisional name "Valen, the Scarlet Duke", no cape: **the owner must choose the name** |
| `chakra/decisions` | not pushed (local) | The owner's four answers on the chakra types (saved legends updated, Shadow and Spirit pending, Cinder Nova kept) and the nature gating the elemental jutsu in the creator | **For review** |
| `worktree-*` | not on origin (local `6e2e8dc`) | Agent worktree leftovers | Stale |

The tips are the pushed ones; fetch to see the latest. At this snapshot the owner's checkout had
one more commit, not pushed yet, on three branches: `camp/owner-ref` `07b3a25` (read pose: his
book and hands), `icons/sheets-8-11` `3cae1ea` (Swap and Warp Strike icons with phase ninjas) and
`scarlet/study` `399f59f` (his picture brought down to our scale).

Merge checks (`git merge-tree` on the origin tips, nothing changed):
- `camp/owner-ref`, `ryusei/phase`, `poses/throw-pierce` and `scarlet/study` merge cleanly into
  integration; `icons/sheets-8-11` conflicts only in `docs/reference/README.md`.
- `camp/owner-ref` and `poses/throw-pierce` conflict with each other in `src/sprite/rig.ts`;
  `camp/owner-ref` and `ryusei/phase` in `docs/reference/README.md`.
- `ryusei-phase-owner-reference.jpg` and `poses/warp-throw-owner-reference.jpg` (on those branches)
  are the same image.

## 3. Waiting for the owner

- Approve or correct: `ryusei/phase`, `poses/throw-pierce`, the icons on `icons/sheets-8-11`, the
  camp poses once redone.
- Name the Scarlet character (`scarlet/study`).
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
  random ninja's picks); which ranks a new ninja may take ("low-rank ones only", not built); Kaien's
  Fireball and Raiga's Earth Wall (kept); Water has no S-rank jutsu and Wind one Element jutsu.
- Decided 2026-10-21 (later): **a new female standard** from the owner's four heroine pictures. He said our base bodies look "muy feos" next to his pictures: "sube la calidad de nuestro sprite para que se vea mas parecido aun a la referencia". The new female body (proportions, hands, feet, skin from his pixels) is being built on `body/female-v2` for his approval. He also said: "las piezas de armadura y ropa femeninas no las rehagas porque muy problablemente las borremos por no estar al nuevo stadard" - the existing female armour and clothing are NOT refitted to the new body; they will probably be deleted. Hairstyles, heads, eyes, weapons, capes and the heroines' parts do follow it. The male body stays (approved through the Aiden paint-over).
- Decided 2026-10-21 (later): Warp Strike is renamed **"Shooting-Star Thrust"** (Spanish **"Estocada Fugaz"**; the owner first said "Shooting Star", then chose these), after the clan's name (Ryusei = shooting star) and to stay clear of other games' "Warp Strike". The id `ryusei_warp` stays. To apply once `icons/sheets-8-11` is merged (it touches the same strings): names, hotbar label, help text, log, clan texts, D24.
- Decided 2026-10-21: the Spanish names are **"Golpe Warp"** and **"Comando"** (the owner: "los dos"); `icons/sheets-8-11` brings them and updates D24 in `docs/CLANS_DESIGN.md`.
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
Enemies and battles are untouched. Left: the rank cap for a new ninja ("low-rank ones only"; the
owner decides which ranks), the jutsu of Light and Void (and later Shadow and Spirit), a Water
S-rank, a second Wind jutsu.

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
