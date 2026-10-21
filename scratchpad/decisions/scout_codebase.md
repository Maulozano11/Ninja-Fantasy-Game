# Scouting report: where missions, decision scenes and rest camps would plug in

Repo: `/home/user/Ninja-Fantasy-Game`, read-only scouting. I changed no files. The working tree already has untracked world-sprite work (`src/assets/world/`, `tools/world-sprites/plants.ts`, `tools/world-sprites/trees.ts`) that someone else is doing.

**Short answer:** there is no mission, rest, save, trap or status-effect system yet. The only "decision" feature is a menu of story choices with no lasting effect. Every battle starts from full HP and chakra, and nothing comes back from a battle. Neither the player character nor the app state is saved anywhere, and nothing calls Gemini.

---

## 0. Agreed design (`docs/GAMEPLAY_DESIGN.md`)

- The document only covers battles: side-view 2.5D, no visible grid, movement in meters, initiative d20+DEX, the four D&D action types, elevation, cover, a stealth phase, and elements and weather including night.
- Points that matter for missions:
  - "A party of up to 4", each ally played by a person or by the AI.
  - Mission objectives: defeat everyone, stealth assassination, escape, protect someone, survive N turns.
  - "At 0 HP a character is **downed** and makes death saving throws; allies can revive them."
- Art direction lists interactable sprites: "campfire, tent, lanterns, signposts…" and the mockup has a "hill camp". Camp art is therefore expected, and `tools/world-sprites/kit.ts:119` already has a `canvas` material for tents and a `fire` material.
- The document says nothing about missions, story, rest, morale or stress. The only open question is multiplayer (online or local).
- **The current code does not follow this design**: `TacticalCombat.tsx` uses a 10x8 tile grid (`GRID_WIDTH = 10`, `GRID_HEIGHT = 8`), turn order is just the order of the entities array (no initiative roll), and there are no saving throws or melee attacks.

## 1. Screens and how they are wired

**`src/App.tsx`**
- `type AppView = 'creator' | 'campaign' | 'combat' | 'arena'` is switched with a header nav. There is no router.
- All app state is held in three `useState` calls:
  - `activeView`, which defaults to `'combat'` (or `'creator'` when the URL ends in `#creator`).
  - `character: ShinobiCharacter`, which defaults to `preset_founder`.
  - `activeEncounter`, an object `{title, description, enemyType, weather}`. This object shape is written out again in four files and has no shared type.
- `handleLaunchCombat(enc)` sets the encounter and switches to `'combat'`.
- `onBattleEnd` is wired but does nothing:
  ```tsx
  onBattleEnd={(victory) => { /* Battle completed */ }}
  ```
- The "Launch Battle" button in the header calls `handleLaunchCombat()` with no encounter, which falls back to `giant_beast`.

**`src/components/CampaignMode.tsx`** (319 lines). This is the closest thing to a decision scene.
- `interface CampaignNode { id, arcTitle, chapterTitle, imageKey: 'forest'|'titan'|'creator', narrativeText, choices: {label, consequenceText, bonusEffect?, weather, enemyType, encounterTitle}[] }`
- `CAMPAIGN_STORY_NODES` holds 3 hard-coded arcs (`arc1_forest`, `arc2_fortress`, `arc3_titan`), each with 3 choices.
- Its only state is `selectedNodeIndex` and `chosenOption`. Every arc is selectable freely, nothing records progress, and no choice leads to another scene.
- `handleProceedToBattle` passes only `{title, description, enemyType, weather}`. **`bonusEffect` is shown as text only** (for example "Your starting Chakra is increased by +10.") and never reaches combat.
- The layout already fits a decision scene: a backdrop image, a narrative panel, choice cards, and a deploy button.

**`src/components/ArenaSandbox.tsx`** (263 lines)
- A battle-setup screen: a PvE/PvP toggle, `enemyType` presets and `weather`, then `onLaunchBattle`.
- It shows the character's HP, chakra and AC using the `ShinobiSpriteCanvas` sprite preview. A camp screen could reuse this card.

**`src/components/TacticalCombat.tsx`** (1478 lines). Details are in section 3.
- Props:
  ```ts
  { playerCharacter; campaignEncounter?: {title, description, enemyType, weather};
    onBattleEnd?: (victory: boolean, expGained: number) => void; onBackToCreator? }
  ```
- `initBattlefield()` runs from `useEffect(..., [campaignEncounter])`.
- The victory and defeat overlay only offers "Battle Again" / "Retry Encounter", which both call `initBattlefield`. There is no way to continue to a next scene.

**`src/components/CharacterCreator.tsx`** (1054 lines)
- Tabs: identity, appearance, stats, jutsus.
- `calculateDerived(stats, clan, cls, armor, feats)` is a local closure, not exported (lines 92–134).
- JSON import and export goes through `characterFromImport()`, which merges the input into `DEFAULT_CHARACTER` and renames old clans and jutsus. This is the only persistence in the game, and it is manual copy and paste.
- `onSave(updatedChar)` → App `setCharacter` → straight into a test battle.

**`src/components/DiceRollModal.tsx`**
- Props: `{ rollResult: DiceRollResult | null; onClose; isOpen }`.
- `DiceRollResult` already has `targetDC` and `isSuccess`, so the modal can be reused for skill checks in decision scenes and camp events.

**Other files**
- `ShinobiSpriteCanvas.tsx` takes `stance?: SpritePose` and `size?`.
- `SpritePose = 'idle'|'handsigns'|'attack'|'cast'|'hurt'|'victory'|'charge'`. There is no sitting, resting or downed pose for a camp scene.
- `src/utils/audio.ts` (`soundManager`) has `playSelect`, `playDiceRoll`, `playCriticalHit`, `playJutsuCast(nature)`, `playDestruction`, `playChakraSurge` and `playHit`. There are no camp or ambient sounds.

**Existing systems:**

| System | Exists? |
|---|---|
| Mission | No |
| Dialogue | No |
| Choices with consequences | Text only |
| Rest | No |
| Camp | No |
| Inventory | No |
| Currency | No |
| XP or level-up | No |

## 2. Character model

**`src/types/shinobi.ts`**
- `ShinobiCharacter`: `id, name, title, level, clan: ClanType, shinobiClass: ShinobiClassType, stats: AbilityScores {str,dex,con,int,wis,cha}`, cosmetics (`palette, hairstyle, armorStyle, headbandPosition, weaponStyle?, capeStyle?, ribbonStyle?, lowerStyle?, dojutsu, appearance?`), `selectedFeats: string[]`, `selectedJutsus {slot1Utility, slot2Elemental, slot3Elemental, slot4Clan, slot5Ultimate}`, and derived stats `maxHp, currentHp, maxChakra, currentChakra, armorClass, speed (tiles), jutsuSaveDC, jutsuAttackBonus, isEnhancedMode?`.
- **Missing fields:** XP, hit dice remaining, exhaustion, stress, morale, hunger, fatigue, skill proficiencies (Stealth and Perception are needed by the design), inventory, equipment beyond cosmetics, money, any lasting status effect, and death-save counters.
- `CombatEntity.conditions` is a closed union that lives only on the combat entity, not on the character:
  ```ts
  conditions: Array<'Burning' | 'Paralyzed' | 'Stunned' | 'InCover' | 'ChakraSurge' | 'IllusionConfused'>;
  ```
  It has no duration, source or stack count. `'Poisoned'` is missing even though `mystical_palm`'s enhancement text mentions it.
- `JutsuDefinition`: `chakraCost`, `enhancementChakraCost`, `castTime`, `range` (tiles), `areaOfEffect`, `damageDice`, `damageType` (includes `'Healing'`), `savingThrow`, `saveEffect`, `environmentalEffect` (includes `'Sets Trap'`), and `enhancementEffect` as free text.
- `BattlefieldTile` has `trapArmingPlayerId?` and the terrain value `'explosive_tag'`, which is the only trap concept so far.
- `WeatherType = 'Clear' | 'Downpour' | 'Scorching Drought' | 'Sandstorm'`. There is no night value, although the design wants one.

**`src/data/shinobiData.ts`**
- `CLANS_DATA`, `Record<ClanType, {lineageTraits, statBonuses, availableDojutsu, signatureJutsuId…}>`. Traits are text, and only some are implemented:

  | Clan | Trait (text) | Implemented? |
  |---|---|---|
  | Mirai | advantage vs Genjutsu | No |
  | Uddo | +6 max HP | Yes, in the creator |
  | Uddo | +2 chakra per round | Yes, in combat |
  | Akkai | +25% max chakra | Yes, in the creator |
  | Akkai | necrotic resistance | No |
  | Taki | 360° vision | No |
  | Taki | crits seal chakra | No |

- `SHINOBI_CLASSES` has `hitDie` (6, 8 or 10), `chakraDie` (8, 10 or 12), `castingStat`, `savingProficiencies` and `classFeatures` (text). **`hitDie` and `chakraDie` would map naturally onto spending hit dice and chakra dice during a short rest.**
- `SHINOBI_FEATS` has 8 feats. Several are relevant to buffs and traps (`tactical_trapper`, `eight_gates_initiate` "for 2 turns", `chakra_prodigy`), but all are text only.
- `JUTSUS_DATA` has 30 jutsus.
  - Healing: `mystical_palm` (2d8+3, enhancement removes Burning, Poisoned or Paralyzed).
  - Trap: `trap_setter_tag` (3d6 fire, DEX save).
  - Buff-like utility: `shadow_clone`, `body_flicker`, `substitution_kawarimi`, `water_shield_suijinheki`, `earth_wall_doryuheki`, and `wood_golem_titan` (30 temp HP).
  - Status effects (paralyze, sleep, chakra drain) appear only in `enhancementEffect` text.
- `ARMOR_STYLES` maps each style to `acBonus` 1–5. Sprite armor items link to it through `ItemDef.statsArmor` in `src/sprite/ctx.ts:116`. This is the only link between equipment and stats.
- `LEGENDARY_PRESETS` has 8 presets, all `level: 6` with fixed derived numbers (for example the founder has 56 HP, 44 chakra, AC 19). `DEFAULT_CHARACTER = LEGENDARY_PRESETS[0].character`.
- Derived formulas in `CharacterCreator.tsx:112-122`:
  ```ts
  maxHp = hitDie + conMod + (level-1)*(floor(hitDie/2)+1+conMod); // +6 Uddo
  maxChakra = level*(floor(chakraDie/2)+2) + max(1,conMod);       // *1.25 Akkai, +4 chakra_prodigy
  const profBonus = 2; // hard-coded
  ```
  `level` cannot be edited anywhere, and the creator sets `currentHp` and `currentChakra` equal to the maximums.

## 3. Combat rules relevant to buffs, healing and chakra (`TacticalCombat.tsx`)

- **HP and chakra reset every battle.** This is the main blocker for any system that carries damage between fights:
  ```ts
  character: { ...playerCharacter, currentHp: playerCharacter.maxHp, currentChakra: playerCharacter.maxChakra },
  ```
  The line appears twice, at line 131 (the initial state) and line 275 (`initBattlefield`). It ignores the incoming `currentHp` and `currentChakra`, and `conditions: []` is always empty.
- **Chakra regeneration** happens only in `handleEndTurn()` (lines 485–502), and only for Uddo: `if (ent.character.clan === 'Uddo') chakraRegen += 2;`. There is no general regeneration and no meditate action.
- **Chakra cost:** `jutsu.chakraCost + (isEnhancedCast ? jutsu.enhancementChakraCost : 0)` is checked in `handleSelectJutsu` and `handleCastJutsu`, and is also used by the jutsu deck UI (around line 1308).
- **Healing** (lines 949–966): when `jutsu.damageType === 'Healing'`, the caster heals `baseDamage + 8`, capped at `maxHp`, and only the caster. The roll's own `+3` is ignored, because the dice parser `/(\d+)d(\d+)/` drops modifiers. The heal also passes through the damage branch, so an enemy standing on the target tile would take "Healing" damage.
- **Damage** is applied whether or not the d20 hits. The d20 result and `isSuccess` only feed the dice modal, and `savingThrow` and `saveEffect` are never rolled. Enhanced casts add a flat +12, and crits double the damage. Weather modifiers are at lines 886–888.
- **Conditions are never applied by any rule.** The only reads are `conditions.includes('ChakraSurge')`, which is visual (lines 1208 and 1375). There is no tick, duration or cleanup step to attach buffs and debuffs to.
- **Traps:** the `'Sets Trap'` effect turns a tile into `explosive_tag`. Only the player triggers it, in `handleTileClick` (lines 651–671), for 6–17 damage, and that damage never checks for defeat. Enemies ignore trap tiles.
- **Terrain hazards are visual only:** `fire_blaze` and `isElectrified` water deal no damage.
- **Enemy AI** (`executeEnemyAITurn` and `executeEnemyAttack`) always attacks the player for a flat 6–15 damage (10–25 for a titan). Defeat is instant at 0 HP, with no downed state or death saves. The AI runs on `setTimeout` chains that read `entities` and `grid` from stale closures, so adding per-turn status ticks would be fragile.
- Enemy builds copy `playerCharacter` (`...playerCharacter`) and override some fields. There is no separate enemy data file.
- **Battle end:** victory calls `onBattleEnd(true, 1200)`; defeat never calls `onBattleEnd`. Nothing returns the survivor's final HP, chakra or conditions.

## 4. AI integration (`@google/genai`)

- `package.json` lists `"@google/genai": "^2.4.0"` (v2.28.0 is installed), plus `express` and `dotenv`. `metadata.json` declares `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`, and `.env.example` has `GEMINI_API_KEY`.
- **No code imports or calls it.** There is no `server.js`, even though the `clean` script removes one, and `vite.config.ts` does not inject the key.
- For AI narration or dialogue:
  - A new server proxy (Express) would be needed so the key never reaches the client.
  - The game is already published as a static private Artifact, where no server runs.
  - So hand-written scene data should be the main content, with AI narration as an optional extra and static text as the fallback.

## 5. Gaps and risks

1. **Persistence**
   - Gaps:
     - No `localStorage` or `IndexedDB` anywhere. The character, campaign progress and party all live in App `useState` and are lost on reload.
     - There is no save schema or version. The `characterFromImport` merge-with-defaults pattern could be reused as a save migrator.
   - Risks: the published Artifact's browser storage can be empty or blocked, so it needs try/catch and an export-save fallback.
2. **State carried across battles**
   - Gaps:
     - `TacticalCombat` must stop resetting HP and chakra, accept starting HP, chakra and status effects (for example an `initialState` prop), and return results such as `onBattleEnd({victory, survivors:[{id,currentHp,currentChakra,effects}], xp, loot})`.
     - App must handle the result.
3. **Status effects**
   - Gaps:
     - A data-driven `StatusEffect {id, kind:'buff'|'debuff', stat mods, durationTurns|durationFights|untilRest, source}` is needed on the character, not only on `CombatEntity`.
     - Combat needs a start-of-turn and end-of-turn tick in `handleEndTurn`.
     - Saving throws must actually be rolled.
   - Risks: today `enhancementEffect` and `bonusEffect` are free text with no machine-readable effects.
4. **Rest and camp**
   - Gaps:
     - No short or long rest.
     - No hit dice remaining. `SHINOBI_CLASSES.hitDie` and `chakraDie` exist to build on.
     - No camp screen, camp actions, camp skills or supplies.
     - No ambush or trap events at camp.
     - No sit or rest sprite pose.
     - Camp art (tent, campfire) is still being made in task #44.
5. **Decision scenes**
   - Gaps:
     - `CampaignNode` has no scene graph (`next` node ids), flags or variables.
     - Choices have no requirements, costs or skill checks.
     - There is no resource track like Gods Will Be Watching's (for example morale, suspicion or supplies), and no mission-failure state outside combat.
     - Choices should become typed effects, for example `{type:'chakra', delta:+10}`, `{type:'status', id}`, `{type:'flag', key}`, `{type:'battle', encounterId}`.
   - Risks:
     - The encounter object shape is written out in four files (App, CampaignMode, ArenaSandbox, TacticalCombat) and needs one shared `EncounterDef` type.
     - `enemyType` has only four hard-coded values.
6. **Party**
   - Gaps:
     - Combat has one player entity, and the AI targets only that entity.
     - The design wants up to 4 party members, which camp roles and the Darkest Dungeon-style stress and relationship mechanics depend on.
     - App holds a single `character`, not a roster.
7. **Progression**
   - Gaps:
     - XP is ignored (`expGained` is passed but unused), `level` is fixed, `profBonus` is hard-coded at 2, and `calculateDerived` is stuck inside the creator.
     - `calculateDerived` should move to a shared `src/rules/` module so camps and level-ups can recompute stats.
     - No inventory, consumables (food, bandages, soldier pills) or money, all of which Darkest Dungeon-style camping and Gods Will Be Watching-style supply management rely on.
8. **Rules debt that would distort a balanced rest economy**
   - Risks:
     - Every jutsu hits automatically.
     - The heal formula drops the dice modifier, and the heal can also hit an enemy on the target tile.
     - Trap damage does not trigger defeat.
     - Fire and electrified water tiles do nothing.
     - There are no initiative or death saves.
9. **AI narration**
   - Gaps: there is no server, the key is not wired, and a static host cannot keep the key secret.
   - Risks: AI narration must stay optional, with static text as the fallback.

## Suggested places to plug in

- **New files:**
  - `src/types/mission.ts`: `MissionDef`, `SceneNode`, `Choice`, `Effect`, `StatusEffect`, `CampState`, `SaveData`.
  - `src/data/missions.ts`: scene content.
  - `src/rules/` with `derived.ts` (moved from the creator), `rest.ts`, `effects.ts` and `checks.ts` (d20 + modifier vs DC, reusing `DiceRollResult` and `DiceRollModal`).
  - `src/utils/save.ts`: `localStorage` with try/catch, a schema version, and migration in the style of `characterFromImport`.
  - Components: `MissionRunner.tsx` (state machine: scene → check → battle → camp → scene), `DecisionScene.tsx` (reusing the `CampaignMode` layout) and `RestCamp.tsx` (reusing the sprite card from `ArenaSandbox`).
- **Edits:**
  - `App.tsx`: add a `'mission'` view and hold the roster and save data.
  - `TacticalCombat.tsx`: take starting HP, chakra and effects; return a result; tick effects in `handleEndTurn`; let enemies trigger traps.
  - `shinobi.ts`: add `effects`, `hitDiceRemaining`, `stress` or `morale`, `inventory`, and the `'Poisoned'` condition.
  - `CampaignMode.tsx`: either migrate it to the new scene data or keep it as an arc selector.