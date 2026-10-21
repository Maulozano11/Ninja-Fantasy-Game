# Darkest Dungeon (1 and 2): research on rests, traversal, buffs and debuffs, and attrition

**How this was gathered.** WebFetch failed for every domain (`getaddrinfo ENOTFOUND`, including wikipedia.org), and the proxy blocked curl to wiki.gg (`CONNECT tunnel failed, response 403`). So I never opened a full page. All facts below come from extracts that WebSearch returned from the cited pages. A few also come from GitHub code-search fragments of the game's own camping data file, as copied into a mod repository.

Tags used:
- **[V]**: stated in the cited source.
- **[C]**: the sources disagree.
- **[D]**: confirmed in the game data fragment.
- **[I]**: my own inference or design reading.

Wiki numbers can lag behind patches, so check exact values in-game before you copy them.

---

## 1. Camping (Darkest Dungeon 1)

### 1.1 When and where you can camp
| Expedition length | Firewood given = camps possible |
|---|---|
| Short | 0, no camping |
| Medium | 1 |
| Long | 2 |
| Exhausting | 4 |

- **[V]** One Firewood is used per camp. Sources: [wiki.gg Camp](https://darkestdungeon.wiki.gg/wiki/Camp), [Firewood](https://darkestdungeon.wiki.gg/wiki/Firewood), [Ludo guide](https://www.ludo.guide/guide/darkest-dungeon/dungeons).
- **[V]** One source says the base game has no way to find more firewood inside a dungeon ([search summary of Camp page](https://darkestdungeon.wiki.gg/wiki/Camp)). The Courtyard DLC has one exception: a shovel used on a Wine Crate gives firewood ([Curios](https://darkestdungeon.wiki.gg/wiki/Curios)).
- **[C]** The Black Reliquary wiki lists 1/2/3 firewood. That page is about a different game or mod ([blackreliquary.wiki.gg](https://blackreliquary.wiki.gg/wiki/Camp)).
- **[V]** You can camp in any cleared room except the entrance, and rooms with curios count ([wiki.gg Camping](https://darkestdungeon.wiki.gg/wiki/Camping), [Fandom Camp](https://darkestdungeon.fandom.com/wiki/Camp)). You cannot camp in corridors.
- **[V]** Wiki tip: keep firewood for the end of a long run, to clear stress and diseases before going home. This saves gold and town time ([wiki.gg Camp](https://darkestdungeon.wiki.gg/wiki/Camp)).

### 1.2 Step by step: what the player sees and clicks
1. **Make camp** in a cleared room. This uses one Firewood.
2. **Meal step.** Pick a meal tier (table below).
3. **Skill step.** Spend Respite points on each hero's camping skills.
4. **[V]** When Respite runs out, clicking **Rest** ends the camp ([Camping](https://darkestdungeon.wiki.gg/wiki/Camping)).
5. **Night roll.** There is a chance of a Night-Time Ambush (1.5).
6. **[V]** When you resume exploring, the Light Meter is reset to 100 ([Camping](https://darkestdungeon.wiki.gg/wiki/Camping)).

**About "the Watch":** none of the sources name a Watch step. They describe two steps (meal, then skills) followed by the night. Keeping watch only shows up thematically, in the anti-ambush skills: Hound's Watch, Zealous Vigil, Bandit's Sense. **[I]**

### 1.3 Meal step
| Tier | Food needed | Effect |
|---|---|---|
| Starve | 0 | 20% max HP damage, +15 stress |
| Half | 2 (wiki.gg) or 3 (Fandom/Sportskeeda) **[C]** | No effect |
| Full | 4 | Heal 10% max HP |
| Feast | 8 | Heal 25% max HP, −10 stress |

- **[V]** Each dead party member lowers the food needed for every tier by one quarter ([Camp](https://darkestdungeon.wiki.gg/wiki/Camp), [Fandom Camp](https://darkestdungeon.fandom.com/wiki/Camp), [Sportskeeda](https://www.sportskeeda.com/esports/how-use-camp-darkest-dungeon)).
- **[V]** Afflicted heroes sometimes refuse to eat, or refuse camping buffs, and take extra stress and HP damage. The wiki lists this for Paranoid, Masochistic, Irrational, Hopeless and Refracted ([Camping](https://darkestdungeon.wiki.gg/wiki/Camping), [Affliction](https://darkestdungeon.wiki.gg/wiki/Affliction)).
- **[V]** How much a hero eats can change:
  - The Stress Eater quirk doubles food use above 50 stress.
  - The Tapeworm disease doubles it.
  - The Fasting Seal and Bloodthirst Ring trinkets mean the hero eats nothing ([Hunger](https://darkestdungeon.wiki.gg/wiki/Hunger), [Food](https://darkestdungeon.wiki.gg/wiki/Food)).

### 1.4 Respite budget rules
- **[V]** You get 12 Respite points per camp. You get 14 if the town has an Outsiders' Bonfire and the party includes a Leper, Hellion or Abomination ([Camping](https://darkestdungeon.wiki.gg/wiki/Camping)).
- **[V]** Some sources call Respite "time" ("Time Cost 4").
- **[V][D]** Each skill can be used once per camp unless it says otherwise. Two heroes who both have Encourage can each use it once ([Fandom Camp](https://darkestdungeon.fandom.com/wiki/Camp)). The data file has `"use_limit" : 1` on each skill ([data file](https://github.com/115dkk/darkest-dungeon-muskteer-rework-mod/blob/c075385ef100cf0843fde72d2bf1eea7db1247f2/raid/camping/default.camping_skills.json)).
- **[V]** A hero equips 4 camping skills and can swap them at any time, even mid-expedition. More skills are bought at the Survivalist building in town ([Camping](https://darkestdungeon.wiki.gg/wiki/Camping), [Survivalist](https://darkestdungeon.wiki.gg/wiki/Survivalist)).
- **[V]** Camping buffs last the next 4 battles, and a night ambush counts as one of them ([Camping](https://darkestdungeon.wiki.gg/wiki/Camping)).
- **[V]** If an afflicted hero refuses to use or receive a skill, its Respite is still spent ([Camping](https://darkestdungeon.wiki.gg/wiki/Camping)). Selfish and Abusive heroes refuse 33% of the time ([Affliction](https://darkestdungeon.wiki.gg/wiki/Affliction)).
- **[D]** How the data file is laid out:
  - Each skill has `id`, `level`, `cost`, `use_limit`, and an `effects[]` list.
  - Each effect has `selection` (self / one companion / party), `requirements`, `chance {code, amount}`, `type` (e.g. `stress_heal_amount`, `reduce_ambush_chance` with amount 1.0) and `sub_type`.
  - Each skill also has `hero_classes[]` and `upgrade_requirements`.
  - The shared skills list 17 classes and leave out the Flagellant.
  - **[I]** This layout works well as a template for data-driven rest skills.

### 1.5 Night-Time Ambush
- **[V]** There is a flat 33% chance of an ambush after camping ([Night-Time Ambush](https://darkestdungeon.wiki.gg/wiki/Night-Time_Ambush)).
- **[V]** The party is always surprised and the torch drops to 0 for that fight ([Surprise](https://darkestdungeon.wiki.gg/wiki/Surprise)).
- **[V]** The enemies can be any group from that dungeon except bosses. Ambushes never happen in the Darkest Dungeon itself or the Farmstead ([Camp](https://darkestdungeon.wiki.gg/wiki/Camp)).
- **[V]** Skills that prevent it: Zealous Vigil (Crusader), Bandit's Sense (Highwayman), Hound's Watch (Houndmaster), Unspeakable Commune (Occultist), and Sanctuary (Vestal, only if she is religious).
- **[C]** Does light level change the ambush chance? The wiki's 33% does not depend on light. A Steam player claims low light raises it; this is unverified ([Steam thread](https://steamcommunity.com/app/262060/discussions/0/594020645016182064)).
- **[V]** With a Shieldbreaker in the party, each camp has a 50% chance of a "Nightmare" fight instead. Anti-ambush skills do not stop it, and it happens at most once per expedition ([Shieldbreaker Nightmares](https://darkestdungeon.wiki.gg/wiki/Shieldbreaker_(Darkest_Dungeon)/Nightmares)).

### 1.6 Camping skills: costs and effects
"4b" means the effect lasts 4 battles.

**Shared skills** (every class except the Flagellant). Source: [Fandom Camp](https://darkestdungeon.fandom.com/wiki/Camp); costs confirmed in [data file] for Encourage.
- **Encourage (2):** one companion, −15 stress. Cannot target yourself.
- **Wound Care / First Aid (2):** one companion, heal 15% HP, remove Bleed and Blight.
- **Pep Talk (2):** one companion, −15% stress taken for 4b. Three teammates can stack it on the same hero.

| Class | Skill (cost): effect | Source |
|---|---|---|
| Crusader | Unshakeable Leader (2): self −25% stress for 4b. Stand Tall (3): one companion −15 stress and removes Mortality debuffs. Zealous Speech (5): whole party −15 stress, plus +15% stress resist for 4b (not on himself). Zealous Vigil (4): self −25 stress (−40 if afflicted **[C]**), prevents ambush **[D: cost 4]** | [Fandom](https://darkestdungeon.fandom.com/wiki/Crusader), [Strategy](https://darkestdungeon.wiki.gg/wiki/Crusader_(Darkest_Dungeon)/Strategy) |
| Vestal | Bless (3): one companion +10 ACC, +10 Dodge for 4b. Chant (3): stress heal plus stress resist, much stronger on religious heroes. Pray (3): party stress heal plus PROT for 4b, stronger on religious heroes. Sanctuary (4): prevents ambush if she is religious; companions with Mortality debuffs heal 50% HP and lose 25 stress | [Vestal](https://darkestdungeon.wiki.gg/wiki/Vestal_(Darkest_Dungeon)), [Strategy](https://darkestdungeon.wiki.gg/wiki/Vestal_(Darkest_Dungeon)/Strategy) |
| Plague Doctor | Experimental Vapours (4): one companion heal 50% HP, +33% healing received for 4b. Leeches (3): heal 15%, remove Blight and Disease. The Cure (1): self remove Disease, +20% disease resist. Self-Medicate (3): self −10 stress, heal 20%, +10 ACC, remove Blight and Bleed | [PD Strategy](https://darkestdungeon.wiki.gg/wiki/Plague_Doctor_(Darkest_Dungeon)/Strategy) |
| Highwayman | All cost 4. Gallows Humor: self and party lose stress, but 25% chance companions gain stress instead. Unparalleled Finesse: +10 Dodge, +2 SPD, +20% melee damage, +10 melee ACC for 4b. Clean Guns: ranged ACC, damage and crit (+6% or +8% **[C]**). Bandit's Sense: prevents ambush, −20% party surprised, +20% monsters surprised | [Highwayman](https://darkestdungeon.wiki.gg/wiki/Highwayman_(Darkest_Dungeon)) |
| Grave Robber | Gallows Humor (4): self −25 stress; companions −20 (75%) or +10 (25%). Pilfer (1): random supply item. Snuff Box (3): remove Disease from self and one companion. Night Moves (2): +20% scouting for 4b | [GR](https://darkestdungeon.wiki.gg/wiki/Grave_Robber_(Darkest_Dungeon)) |
| Houndmaster | Hound's Watch (4): prevents ambush, −20% party surprised, +20% monsters surprised for 4b **[D: cost 4]**. Therapy Dog (3): whole party −10 stress, −10% stress taken for 4b. Release the Hound (4): +30% scouting for 4b. Man's Best Friend (2): self −20 stress | [HM](https://darkestdungeon.wiki.gg/wiki/Houndmaster_(Darkest_Dungeon)) |
| Occultist | Abandon Hope (1): self −25 stress; each companion has a 50% chance of +5 or +10 stress. Dark Ritual (3): one companion heal 50% HP and remove Mortality debuffs, but the party resumes at **0 torchlight** and he gains +15 stress. Dark Strength (2): one companion +20% damage for 4b, he gains +15 stress. Unspeakable Commune (3): prevents ambush, all companions +7 stress | [Occultist](https://darkestdungeon.wiki.gg/wiki/Occultist_(Darkest_Dungeon)) |
| Hellion | Battle Trance (3): +25% damage in position 1, −25% anywhere else, for 4b. Revel (3): big party stress heal, but ACC and SPD penalties for 4b. Reject the Gods (2): self −30 stress, companions gain stress (more if religious). Sharpen Spear (3): +10% crit for 4b | [Hellion](https://darkestdungeon.wiki.gg/wiki/Hellion_(Darkest_Dungeon)) |
| Leper | Let the Mask Down (1): self −25 stress, others +5. Bloody Shroud (2): +25% Bleed, Blight, Move and Debuff resist for 4b. Reflection (3): −20 stress, +10 ACC, +8% crit for 4b. Quarantine (3): large stress heal for the rest of the party | [Leper](https://darkestdungeon.wiki.gg/wiki/Leper_(Darkest_Dungeon)) |
| Jester | Turn Back Time (3): −30 stress (extra −15 if afflicted). Every Rose Has Its Thorn (3): party −15 stress and −15% stress taken for 4b. Tiger's Eye (3): +10 ACC, +8% crit. Mockery (2): +20 stress to one companion or −20 to all (as listed) | [Jester](https://darkestdungeon.wiki.gg/wiki/Jester_(Darkest_Dungeon)) |
| Arbalest | Field Dressing (2): heal 35% (75% chance) or 50% (25% chance), remove Bleed. Marching Plan (3): other heroes +2 SPD for 4b. Restring Crossbow (3): +10 ACC, +20% damage, +8% crit, −2 SPD. Triage (3): all other heroes heal 20% | [Arbalest](https://darkestdungeon.wiki.gg/wiki/Arbalest_(Darkest_Dungeon)) |
| Antiquarian | Resupply (1, 3 uses): random supply item. Trinket Scrounge (2): random trinket. Strange Powders (2): +20% to all resists for 4b. Curious Incantation (1): self −50% stress taken for 4b | [Antiquarian](https://darkestdungeon.wiki.gg/wiki/Antiquarian_(Darkest_Dungeon)) |
| Man-at-Arms | Maintain Equipment (4): self +15% PROT, +15% damage. Tactics (4, or 3 per one player **[C]**): party +10 Dodge, +5% crit. Instruction (3): +10 ACC, +3 SPD. Weapons Practice: cost unknown | [MaA](https://darkestdungeon.wiki.gg/wiki/Man-At-Arms) |
| Bounty Hunter | This Is How We Do It (2): +10 ACC, +8% crit. Tracking (2): surprise modifiers. Planned Takedown (4): +25% damage and +15 ACC against size-2+ enemies. Scout Ahead (3): +25% scouting | [BH](https://darkestdungeon.wiki.gg/wiki/Bounty_Hunter_(Darkest_Dungeon)) |
| Flagellant | Self-only, no shared skills. Lash's Anger (1): +40 stress, to push toward the Rapturous state. Lash's Solace (3): −50 stress. Lash's Kiss (3): heal 33%, remove Bleed and Blight, +3 SPD. Lash's Cure (2): remove Disease | [Flag](https://darkestdungeon.wiki.gg/wiki/Flagellant_(Darkest_Dungeon)) |
| Abomination | All cost 3. Anger Management: self +20 stress, companions −10. Psych Up: +25% damage, but companions +10 stress (+20 if religious). The Quickening: +4 SPD. Eldritch Blood: +40% Blight, Bleed and Disease resist, but +20% stress taken | [Abom](https://darkestdungeon.wiki.gg/wiki/Abomination_(Darkest_Dungeon)) |
| Shieldbreaker | Snake Skin / Way of Scales (3): +15% PROT, +15% max HP. Snake Eyes / Serpent (3): party +15% armor piercing. Adder's Embrace (2): +20% blight chance and resist | [SB](https://darkestdungeon.wiki.gg/wiki/Shieldbreaker_(Darkest_Dungeon)) |

**[I] Design patterns worth noting:**
1. Big benefits often come with a price for the party (Hellion, Abomination, Occultist).
2. Anti-ambush skills cost 3–4 of the 12 points, a third of the budget.
3. Only a few classes can cure diseases at camp (GR, PD, Flagellant).
4. "Remove Mortality debuffs" is a rare, valuable effect.

### 1.7 Camping changes over time
- **[V]** **19 Jan 2016:** "drastic overhaul". All camping buffs changed to last 4 combat encounters, and damage-over-time effects stopped being cleared automatically by camping ([patch](https://darkestdungeon.fandom.com/wiki/19_January_2016_patch)).
- **[V]** **9 Feb 2017:** added the "Party" target type ([patch](https://darkestdungeon.fandom.com/wiki/9_February_2017_Patch)).
- **[V]** **19 Jun 2018:** rebalance aimed at improving weak skills rather than weakening strong ones ([patch](https://darkestdungeon.wiki.gg/wiki/19_June_2018_patch)).

---

## 2. Moving through corridors and rooms

### 2.1 Map and light
- **[V]** Corridors are 1–8 tiles long, and each tile counts as one round for status effects. Bleed and Blight tick, and buffs count down, while you walk ([Light Meter](https://darkestdungeon.wiki.gg/wiki/Light_Meter)).
- **[V]** Light drops by 6 per new tile and by 1 per tile you backtrack (7 per new tile in Stygian mode).
- **[V]** A torch adds +25 light ([Torch](https://darkestdungeon.fandom.com/wiki/Torch)).

**Light tiers** ([wiki.gg Light Meter](https://darkestdungeon.wiki.gg/wiki/Light_Meter)). **[C]** Fandom gives different numbers in places, for example +30% stress in Shadowy.
| Tier | Light | Stress taken | Extra curio/combat loot chance | Monsters surprised / party surprised | Scouting |
|---|---|---|---|---|---|
| Radiant | 76–100 | – | – | +25% / 0 | +15% |
| Dim | 51–75 | +10% | 25% | +15% / 0 | +7.5% |
| Shadowy | 26–50 | +20% | 50% | +10% / +15% | – |
| Dark | 1–25 | +30% | 75% | +5% / +25% | – |
| Pitch black | 0 | +40% | 95% | 0 / +40% | – |

- **[V]** In low light, heroes get +1–3% crit and enemies get +1–5% crit.
- **[V]** Low light also raises respawn chances for traps and fights: +2.5% at light 1–50 and +5% at light 0 ([Trap](https://darkestdungeon.wiki.gg/wiki/Trap)).
- **[I]** This is a real choice between safety and reward: dark means more loot but more risk.

### 2.2 Scouting
- **[V]** There is a 25% base chance to scout when you enter a room and after each fight. Camping skills, quirks and trinkets add to it ([Scouting](https://darkestdungeon.wiki.gg/wiki/Scouting)).
- **[V]** When a scout happens, there is a 50% chance it is a "critical scout". Only critical scouts can reveal secret rooms ([Secret Room](https://darkestdungeon.wiki.gg/wiki/Secret_Room)).
- **[V]** Scouting is the only way to reveal traps.
- **[V]** Scouting a fight changes surprise odds. In unscouted areas both sides have a 10% base chance to be surprised. In a scouted fight the monsters have 25%, and the party cannot be surprised ([Surprise](https://darkestdungeon.wiki.gg/wiki/Surprise)). Surprise is capped at 65%.

### 2.3 Traps
- **[V]** If a trap was not scouted, the hero dodges it with their **Trap Resist** stat, not Dodge.
- **[V]** If it was scouted, the player can try to disarm it with a chance of **Trap Resist + 40%**.
  - Veteran dungeons add +20% to the requirement and Champion dungeons +40%.
  - Each Resolve level gives +10% Trap Resist.
  - A successful disarm **heals 8 stress** ([Trap](https://darkestdungeon.wiki.gg/wiki/Trap)).
- **[V]** A triggered trap hits one random hero for a % of max HP plus a fixed +15 stress. The extra effect depends on the region ([Fandom Trap](https://darkestdungeon.fandom.com/wiki/Trap)):
  - Ruins: damage only.
  - Weald: Blight.
  - Warrens: Bleed.
  - Cove: −5 to −8 SPD and −20 to −30 Dodge for 12 rounds.
  - Courtyard: Bleed, and can summon enemies.
- **[V]** Trinkets help: Ancestor's Map gives +25% disarm, Scouting Whistle +20%.
- **[V]** The Grave Robber's base disarm chance is listed as 90% **[C]**.

### 2.4 Obstacles
- **[V]** You clear an obstacle with a shovel, or by hand. By hand costs 20% max HP damage, 15 stress, and −20 light ([Obstacle](https://darkestdungeon.wiki.gg/wiki/Obstacle)).
- **[V]** The Courtyard's Shifting Mists need a Torch instead. Clearing them by hand reportedly costs about 18 stress and teleports the party **[C]**.
- **[V]** The wiki advises carrying at least 2 shovels.

### 2.5 Curios (interactive objects) and items
- **[V]** If you use the right provision on a curio, you get the good result and no chance of a bad one. If you search by hand, the result is rolled from a weighted outcome table. The hero who is selected is the one affected ([Curios](https://darkestdungeon.wiki.gg/wiki/Curios)).
- **[V]** Some quirks make a hero interact automatically (e.g. Kleptomaniac 35%). You cannot pick the hero or use an item in that case, and it does not happen with curios in rooms or quest curios.
- **[V]** Curio buffs last "until camp" ([Status effects](https://darkestdungeon.fandom.com/wiki/Status_effects)).

Examples ([Curios](https://darkestdungeon.wiki.gg/wiki/Curios), [Holy Water](https://darkestdungeon.fandom.com/wiki/Holy_Water)):
- **Holy Water:** on an Eldritch Altar, removes one negative quirk; on a Confession Booth, up to −30 stress.
- **Bandage:** on Mummified Remains, gold or trinkets x2.
- **Skeleton Key:** opens locked chests; on the Bandit's Trapped Chest it avoids a 100% Blight result.
- **Medicinal Herbs:** clean things like a Fish Carcass for safe loot.
- **Antivenom:** on an Old Tree, protects against the poisonous sap.
- **Shovel:** digs up loot (Bloodflowers) or breaks crates.
- **Torch on a curio** can backfire: on a Stack of Books it gives +100 stress.

### 2.6 Hunger checks
- **[V]** At random points in corridors a pop-up forces a choice and cannot be skipped ([Hunger](https://darkestdungeon.wiki.gg/wiki/Hunger)).
  - **Eat:** uses 1 food per hero and heals everyone 5% max HP.
  - **Don't eat, or not enough food:** every hero loses 20% max HP and gains +20 stress.
  - The party eats all together or not at all.

### 2.7 Stalling and retreat
- **[V]** Stalling a fight against weak leftover enemies for 3 rounds stresses the whole party. One more round brings enemy reinforcements ([Stalling](https://darkestdungeon.wiki.gg/wiki/Stalling)).
- **[V]** Retreating from a fight succeeds 70% of the time, +5% for each later attempt. A successful retreat costs about 25 stress before modifiers ([Retreating](https://darkestdungeon.fandom.com/wiki/Retreating)).
- **[V]** Abandoning the quest costs 20 stress. You keep the loot but lose the quest reward.

---

## 3. Buffs, debuffs, diseases, quirks and stress

### 3.1 How long things last
| Duration | Examples | Source |
|---|---|---|
| Rounds (~3), counted down at the end of the hero's turn. Each stack expires separately, even though the tooltip shows a total | Combat buffs and debuffs, Bleed and Blight stacks | [Status effects](https://darkestdungeon.fandom.com/wiki/Status_effects), [Buff](https://darkestdungeon.wiki.gg/wiki/Buff_(Darkest_Dungeon)) **[V]** |
| 12 rounds | Cove trap debuff | [Trap](https://darkestdungeon.fandom.com/wiki/Trap) **[V]** |
| 4 battles | Camping buffs | **[V]** |
| Until next camp | Curio buffs and debuffs | **[V]** |
| Until end of quest | Death's Door recovery ("Mortality") debuffs; only removable by Stand Tall, Sanctuary, Dark Ritual and a few others | [Status effects](https://darkestdungeon.fandom.com/wiki/Status_effects) **[V]** |
| Until treated | Diseases (max 3; a 4th replaces one at random) and quirks | [Disease](https://darkestdungeon.wiki.gg/wiki/Disease_(Darkest_Dungeon)) **[V]** |
| Whole next expedition | Some Tavern/Abbey side effects | **[V]** |

- **[V]** Disease examples: Black Plague (−75% Blight and Disease resist, −10% max HP, −5 SPD), Rabies (+15% damage, −10 ACC), The Fits (+3 SPD, −5 ACC, −5% crit), Tapeworm (eats double).

### 3.2 Quirks
- **[V]** A hero holds up to 5 positive and 5 negative quirks. They can be gained after quests and from curios ([Quirks](https://darkestdungeon.wiki.gg/wiki/Quirks_(Darkest_Dungeon))).
- **[V]** Up to 3 positive quirks can be locked. Negative quirks can lock themselves over time (25% per mission per one source **[C]**).
- **[V]** Sanitarium base prices: 1,500 to remove a negative quirk, 5,000 for a locked negative, 7,500 to lock or remove a positive ([Sanitarium](https://darkestdungeon.wiki.gg/wiki/Sanitarium)).
- **[V]** Some quirks affect resting, for example Fast Healer: +10% healing skills while camping ([Health](https://darkestdungeon.fandom.com/wiki/Health)).

### 3.3 Stress (0–200)
**Sources of stress** **[V]** ([Stress](https://darkestdungeon.fandom.com/wiki/Stress)):
- Enemy crits and attacks that deal stress
- Traps (+15)
- Hunger
- Darkness (multiplier, see 2.1)
- Backtracking
- Stalling
- Curios
- Afflicted allies

**Relief inside the dungeon** **[V]**:
- A kill has a 50% chance to heal a little stress for the hero who landed it.
- A crit heals the attacker, and each other hero has a 25% chance to heal a little.
- Crit heals and disarmed traps (−8) also help.
- Some combat skills and camping skills relieve stress.
- Stress reduction from any source is capped at 80%.

**At 100 stress: Resolve test** **[V]** ([Affliction](https://darkestdungeon.wiki.gg/wiki/Affliction), [Virtue](https://darkestdungeon.wiki.gg/wiki/Virtue)):
- The base chance to become Virtuous is 25%.
  - −5% per level the hero is below the dungeon level.
  - Up to +45% from trinkets and quirks.
  - Floor 1%, cap 95%.
- If the test fails, the hero gets an **Affliction**: Fearful, Paranoid, Selfish, Masochistic, Abusive, Hopeless or Irrational.
  - All afflictions: −15% to all resists and −10% max HP.
  - The hero "acts out": skips or randomizes actions, refuses orders, and stresses allies.
- If it passes, the hero gets a **Virtue**: Stalwart, Courageous, Focused, Powerful (+25% damage) or Vigorous (+4 SPD, +10% Dodge).
  - All virtues: +25% to resists, and a 25% chance of a helpful act-out each turn.

**At 200 stress:**
- **[V]** An afflicted hero has a heart attack: HP goes to 0 (Death's Door) and stress is set to 170. A second hit of 200 while still on Death's Door kills them ([Heart attack](https://darkestdungeon.wiki.gg/wiki/Heart_attack), [Nov 2015 patch](https://darkestdungeon.wiki.gg/wiki/30_November_2015_patch)).
- **[V]** A Virtuous hero instead loses the virtue and drops to 0 stress.

**Relief in town** **[V]** ([Tavern](https://darkestdungeon.wiki.gg/wiki/Tavern), [Abbey](https://darkestdungeon.wiki.gg/wiki/Abbey)):
- The hero is "installed" in an activity for one week.
  - Tavern: Bar, Gambling, Brothel; they remove 45, 55 and 65 stress at base.
  - Abbey: Meditation, Prayer, Flagellation.
- Costs grow with hero level. **[C]** For the three Tavern rooms: 1,000/1,250/1,500 (wiki.gg) vs 1,400/1,750/2,100 (Fandom).
- There is a 37.5% chance of a side effect, good or bad: losing gold, disappearing for a week, and so on.
- Quirks can force or block certain activities (e.g. a Tippler only uses the Bar).
- **[I]** This forces you to rotate heroes. The design article "Encouraging the Player to Have a Deep Bench" ([Game Developer](https://www.gamedeveloper.com/design/encouraging-the-player-to-have-a-deep-bench-darkest-dungeon)) says losing a character should be "a speed bump" thanks to backup heroes.

---

## 4. Healing and running out of resources

- **[V]** HP does not regenerate in the dungeon. Outside of fights, only food and camping skills heal. Heroes return to full HP when they get back to town, but stress carries over ([Health](https://darkestdungeon.fandom.com/wiki/Health)). **[C]** One extract says stress is capped at 100 on return; I could not confirm this.

**Healing sources:**
- Healer skills in combat.
- Camp meals (10% or 25%).
- Hunger checks (5%).
- Food eaten as an item ("small heal").
- Camping skills (15–50%).

**Supplies bought before leaving** **[V]** ([Provisions](https://darkestdungeon.wiki.gg/wiki/Provisions), [Inventory](https://darkestdungeon.fandom.com/wiki/Inventory)):
| Item | Price | Stack size | Use |
|---|---|---|---|
| Food | 75 | 12 | Small heal |
| Torch | 75 | 8 | +25 light |
| Shovel | 250 | 4 | Clears obstacles |
| Bandage | 150 | 6 | Cures Bleed |
| Antivenom | 150 | 6 | Cures Blight |
| Herbs, Skeleton Key, Holy Water | price not found | 6 | – |

- **[V]** Leftover supplies are refunded at "a greatly reduced price", about 5–10% according to the community.
- **[V]** If the whole party dies, you get nothing back ([Steam](https://steamcommunity.com/app/262060/discussions/0/2592234299543285491)).
- **[V]** Community guideline for food: about 8 for short, 16 for medium and 24 for long expeditions ([Food](https://darkestdungeon.wiki.gg/wiki/Food)).

**Death's Door** **[V]** ([Death's Door](https://darkestdungeon.wiki.gg/wiki/Death's_Door_(Darkest_Dungeon))):
- At 0 HP the hero is not dead, but each further hit forces a "deathblow" roll.
- Base deathblow resist is 67% (73% for the Flagellant). **[C]** It caps at 85% or 87% depending on the source.
- Resolve level does not raise it. Trinkets and quirks do (Unyielding +10%).
- While at 0 HP the hero has heavy penalties. After being healed off 0, lighter "recovery" (Mortality) penalties remain until the quest ends unless a camping skill removes them.

---

## 5. Darkest Dungeon II

**Run structure** **[V]**:
- A stagecoach trip across **regions**. Each region is a network of locations connected by roads, and the number of regions depends on the chosen "Confession" ([Locations](https://darkestdungeon.wiki.gg/wiki/Locations_(Darkest_Dungeon_II))).
- Road types: fight, hazardous or rough (you need a Wheel or Armor item, or you get ambushed), and "Oblivion's Tear" (+1 Loathing).
- Locations along the road:
  - **Oasis:** one choice per hero, such as −5 stress for one hero or +5 Flame ([Oasis](https://darkestdungeon.wiki.gg/wiki/Oasis)).
  - **Field Hospital:** paid in Relics. Cure a disease (12, or 8–16 **[C]**), remove a negative quirk (16), lock a positive quirk (32), heal HP ([Field Hospital](https://darkestdungeon.wiki.gg/wiki/The_Field_Hospital)).
  - **Shrine of Reflection:** hero backstory chapters that unlock skills.
  - **Lair:** up to 3 fights ending with a boss.
  - **Watchtower:** reveals the rest of the region.

**The Flame (replaces the torch)** **[V]** ([Flame](https://darkestdungeon.wiki.gg/wiki/Flame), [Fextralife](https://darkestdungeon2.wiki.fextralife.com/Torch_Flame)):
- Runs 0–100 and is reset to 100 at each new region.
- It drops as you travel and when fights drag on.
- Below about 40, things get much more dangerous.
- At 0, cultists ambush the party; beating them gives +40 Flame.

**Inns (the only real rest stop)** **[V]**:
- One inn at the end of each region. You can only use **Inn Items** there ([Inn Items](https://darkestdungeon.fandom.com/wiki/Inn_Items)). They heal, reduce stress, change affinity between heroes, give buffs for the whole next region, and remove diseases and quirks.
- Many are gambles. The Whiskey Bottle raises affinity 67% of the time and lowers it 33%. Items have a 10% chance to double their affinity effect.
- Each inn has a crest with its own rules: heal to 100%, 50% or 25%, stress −1 to −3, changed quirk odds ([Inn](https://darkestdungeon.fandom.com/wiki/Inn)).
- **[I]** From the sources' description, there is no camping or hunger step. One player notes that inn buffs replace camping ([Steam](https://steamcommunity.com/app/1940340/discussions/0/3830918083267104058)).

**Stress (0–10)** **[V]** ([Stress DD2](https://darkestdungeon.wiki.gg/wiki/Stress_(Darkest_Dungeon_II))):
- At 10 stress, 80% chance of a **Meltdown**: HP drops to 10%, −3 affinity with every teammate, and a possible negative quirk. Since the May 2023 patch, stress then drops to 1 ([patch](https://darkestdungeon.wiki.gg/wiki/May_8_2023_Patch)).
- 20% chance of **Resolute** instead: heals 67% HP, gives resists, and a possible positive quirk.
- Negative banter between heroes adds stress and lowers affinity, so it can spiral.

**Relationships (Affinity)** **[V]** ([Relationships](https://darkestdungeon.wiki.gg/wiki/Relationships), [Fandom](https://darkestdungeon.fandom.com/wiki/Relationships)):
- Every pair of heroes has an affinity score from 0 to 20; each pair starts at 9.
- Bands: 1–4 very hostile, 5–8 unfriendly, 9–13 neutral, 14–16 friendly, 17–19 very friendly.
- Affinity goes up when heroes buff, heal, stress-heal or guard each other. It goes down with negative banter and meltdowns.
- **Relationships only form at the inn** and last for the rest of the next region. The game tells you before you leave the inn ([Gamespot](https://gamespot.com/articles/darkest-dungeon-2-relationship-skills-how-to-form-positive-relationships/1100-6510588/)).
- Types include Amorous, Respectful, Hopeful, Hateful, Resentful, Envious and Suspicious.
- A good relationship "blesses" skills: extra tokens, stress heals or buffs aimed at the partner.
- A bad relationship "curses" skills: it locks them into the skill bar and adds a harmful effect.
- **[C]** A 2022 update reworked the system ([GamingBolt](https://gamingbolt.com/darkest-dungeon-2-next-update-reworks-relationships-and-affinity)).

**Kingdoms mode** **[V]** ([Inns and Camps](https://darkestdungeon.wiki.gg/wiki/Kingdoms/Inns_and_Camps), [Fatigue](https://darkestdungeon.wiki.gg/wiki/Kingdoms/Fatigue)):
- A hero stationed at an inn recovers 20% HP, −1 stress and 10% Fatigue per day.
- At a camp: up to 50% HP, −1 stress and 5% Fatigue per day.
- **[I]** This is a "rest over several days" model.

---

## 6. What felt tense and fair, and what felt frustrating

**What the designers said** **[V]**:
- Sigman and Bourassa: the stress meter was **made fully visible**, with exact numbers going up and down, while **afflictions are deliberately left partly opaque**. Quotes: *"We want you to have to observe and react to your hero"* and *"put you in uncomfortable situations where you do not have complete control of your party."* Almost every act-out is announced with a line of dialogue (a "bark") ([Affliction System deep dive](https://www.gamedeveloper.com/design/game-design-deep-dive-i-darkest-dungeon-s-i-affliction-system)).
- They chose a stress meter over a sanity meter, because "some people handle stress better than others" ([deep dive](https://www.gamedeveloper.com/design/game-design-deep-dive-i-darkest-dungeon-s-i-affliction-system); [SuperJump](https://www.superjumpmagazine.com/exploring-the-darkness-tyler-sigman-talks-about-co-creating-the-darkest-dungeon-games/)).
- Recovery is meant to be varied, with 6 town activities, because "people recuperate in different ways". Combat is tuned so you feel vulnerable ([Designing for despair](https://www.gamedeveloper.com/business/-i-darkest-dungeon-i-designing-for-despair-and-kicking-you-when-you-re-down)).
- Corpses and heart attacks (July 2015, Early Access) caused a backlash. The team added options to turn them off, and Sigman later questioned whether a feature so many players disliked was worth keeping ([GameBanshee](https://www.gamebanshee.com/kukxh)). Sigman's GDC 2016 postmortem talk exists ([archive.org](https://archive.org/details/GDC2016Sigman)), but I could not see its content.

**What players and critics said** **[V]**:
- Common complaints: too much depends on luck (RNG), stress spirals that start from crits, a repetitive late game, and camping relief that is "hardly guaranteed" ([Entertainium](https://entertainium.co/?p=5371), [gamersdecide](https://gamersdecide.com/pc-game-news/darkest-dungeon-s-3000-negative-reviews-too-difficult-be-fun)).
- Defenders say that same randomness creates the tension.

**My reading** **[I]**:

What makes it fair:
1. Budgets are visible and limited: firewood, 12 Respite, food, torches, shovels.
2. Risks are stated ahead of time: 33% ambush, trap disarm % shown, light tier shown, and a counter skill exists for each.
3. Preparation always has an answer: the right item on a curio means a guaranteed good result.
4. Rest is a choice between trade-offs, not a free full heal.
5. Many timers are measured in battles or until camp, so they are predictable.

What frustrates:
1. Swings with no counterplay: afflictions on a 75% failure, unscouted traps, hunger checks that act like a tax.
2. Guessing which item fits a curio without a wiki.
3. Spirals where one affliction stresses the whole party.
4. Refused camping skills still use up Respite.
5. Supplies resell for very little.

DD2 moved resting to fixed points (inns), made relationships a social reward-and-risk system, and made losing part of the normal loop.

---

## 7. Ideas for a ninja tactics RPG [I]
- **Night camp:** a pool of ~12 "Rest hours". Each ninja equips 4 rest techniques (see the data structure in 1.4). Chakra regeneration is one option competing with healing, stress relief, and buffs lasting N battles.
- **Food:** a meal step with 4 tiers, using rations bought before the mission.
- **The Watch:** a fixed % night-ambush chance that a ninja can lower to 0 by taking a guard shift (sensor ninja, ninja hound, barrier) at the cost of 3–4 hours.
- **Traps:** a sensor ninja scouts to reveal them, then disarm % = base + tool kit. Each trap gives HP damage, a fixed stress hit, and a regional effect: poison, bleed, chakra drain, or paralysis.
- **Effect durations:** combat rounds, N battles, until next camp, end of mission, and permanent (injuries, quirks).
- **Death's Door:** an "on the edge" state with a % chance to resist a killing blow.
- **Bonds between ninja:** from DD2, relationships that form only at rest points and boost or curse paired techniques.

---

## Sources
- **Core camping pages:** [wiki.gg Camp](https://darkestdungeon.wiki.gg/wiki/Camp) · [Camping](https://darkestdungeon.wiki.gg/wiki/Camping) · [Fandom Camp](https://darkestdungeon.fandom.com/wiki/Camp) · [Night-Time Ambush](https://darkestdungeon.wiki.gg/wiki/Night-Time_Ambush) · [Firewood](https://darkestdungeon.wiki.gg/wiki/Firewood)
- **Traversal and status pages:** [Trap](https://darkestdungeon.wiki.gg/wiki/Trap) · [Scouting](https://darkestdungeon.wiki.gg/wiki/Scouting) · [Light Meter](https://darkestdungeon.wiki.gg/wiki/Light_Meter) · [Surprise](https://darkestdungeon.wiki.gg/wiki/Surprise) · [Obstacle](https://darkestdungeon.wiki.gg/wiki/Obstacle) · [Curios](https://darkestdungeon.wiki.gg/wiki/Curios) · [Hunger](https://darkestdungeon.wiki.gg/wiki/Hunger) · [Provisions](https://darkestdungeon.wiki.gg/wiki/Provisions) · [Stress](https://darkestdungeon.fandom.com/wiki/Stress) · [Affliction](https://darkestdungeon.wiki.gg/wiki/Affliction) · [Virtue](https://darkestdungeon.wiki.gg/wiki/Virtue) · [Heart attack](https://darkestdungeon.wiki.gg/wiki/Heart_attack) · [Death's Door](https://darkestdungeon.wiki.gg/wiki/Death's_Door_(Darkest_Dungeon)) · [Status effects](https://darkestdungeon.fandom.com/wiki/Status_effects) · [Disease](https://darkestdungeon.wiki.gg/wiki/Disease_(Darkest_Dungeon)) · [Quirks](https://darkestdungeon.wiki.gg/wiki/Quirks_(Darkest_Dungeon)) · [Tavern](https://darkestdungeon.wiki.gg/wiki/Tavern) · [Stalling](https://darkestdungeon.wiki.gg/wiki/Stalling) · [Retreating](https://darkestdungeon.fandom.com/wiki/Retreating)
- **Class pages:** linked in the table in 1.6.
- **Game data file:** [default.camping_skills.json (mod copy)](https://github.com/115dkk/darkest-dungeon-muskteer-rework-mod/blob/c075385ef100cf0843fde72d2bf1eea7db1247f2/raid/camping/default.camping_skills.json)
- **Darkest Dungeon II:** [Locations](https://darkestdungeon.wiki.gg/wiki/Locations_(Darkest_Dungeon_II)) · [Inn Items](https://darkestdungeon.fandom.com/wiki/Inn_Items) · [Inn](https://darkestdungeon.fandom.com/wiki/Inn) · [Relationships](https://darkestdungeon.wiki.gg/wiki/Relationships) · [Stress DD2](https://darkestdungeon.wiki.gg/wiki/Stress_(Darkest_Dungeon_II)) · [Flame](https://darkestdungeon.wiki.gg/wiki/Flame) · [Oasis](https://darkestdungeon.wiki.gg/wiki/Oasis) · [Field Hospital](https://darkestdungeon.wiki.gg/wiki/The_Field_Hospital) · [Kingdoms Inns and Camps](https://darkestdungeon.wiki.gg/wiki/Kingdoms/Inns_and_Camps)
- **Design articles and interviews:** [Affliction deep dive](https://www.gamedeveloper.com/design/game-design-deep-dive-i-darkest-dungeon-s-i-affliction-system) · [Designing for despair](https://www.gamedeveloper.com/business/-i-darkest-dungeon-i-designing-for-despair-and-kicking-you-when-you-re-down) · [Deep bench](https://www.gamedeveloper.com/design/encouraging-the-player-to-have-a-deep-bench-darkest-dungeon) · [PC Gamer DD2](https://www.pcgamer.com/darkest-dungeon-2-charts-a-new-path-through-terror-in-a-roguelike-road-trip-to-save-humanity/)