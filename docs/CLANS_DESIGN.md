# Clan design: the four clans and their Paths

Proposed by the owner and agreed on 2026-10-19. This is the source of truth for
the clans; change it here first when a decision changes. It replaces the clan
section of `GAMEPLAY_DESIGN.md`.

The clans are original: they no longer borrow their story from other works.
The owner's terms are kept in Spanish in the game's Spanish text; the English
names below are the English text.

## Decisions

- **Four clans, converted from the old ones.** Each old clan becomes a new one
  and keeps its look and its characters: **Mirai stays Mirai** (with its new
  story), **Taki → Northstar**, **Akkai → Kōton**, **Uddo → Ryusei**. Saved
  characters and companions of the old clans are converted the same way.
- **The clans' eyes stay as they are for now** (Sharingan stages for Mirai,
  Byakugan for Northstar). Original names and designs come later.
- **Classes stay.** The five classes (Ninjutsu Specialist, Taijutsu Master,
  Genjutsu Adept, Medical Specialist, Bukijutsu Master) remain, and a clan's
  **Path of Mastery** is a further layer on top. A Mirai Medical Specialist
  can walk the Path of the Oracle.
- **Progression by level.** A clan's base abilities from level 1; the Path is
  chosen at level 3, and its abilities come at levels 3, 6 and 9; the
  **Ultimate Mutation** comes at level 12 and can be used once per mission.
- **One square (casilla) = 1.5 m.** Battles have no visible grid and are
  measured in meters, so the owner's squares convert at 1.5 m each
  (3 squares = 4.5 m, a 2x2 area = 3 x 3 m, a 3x3 area = 4.5 x 4.5 m).
- **Counters come from the abilities themselves**, with no extra numbers on
  top (see below).
- **Enemy ranks.** Enemies get a rank, which Command and the shadows need:
  **Minion** (bandits and other rank and file), **Captain** (a squad's
  leader), **Sub-boss** and **Boss** (the Hydra). Bosses can't be controlled.
- **Mechanics first, art after.** The new abilities are programmed with
  temporary effects made from what the game already has. Then the owner paints
  a reference sheet for each clan and it is copied exactly, like the element
  sets.
- **Order of work.** First the four clans with their base abilities and the
  counters between them (phase 1). Then the Paths, one clan at a time,
  starting with Mirai.

## The counter cycle

| clan | beats | because | loses to | because |
|---|---|---|---|---|
| Mirai (Fire / Future) | Northstar | immune to mind control | Kōton | walls block the prediction |
| Kōton (Metal / Alchemy) | Mirai | builds cover | Ryusei | they teleport through walls |
| Ryusei (Space / Mobility) | Kōton | ignores structures | Northstar | its aura cancels mobility |
| Northstar (Control / Shadows) | Ryusei | cancels their inertia and movement | Mirai | |

In the rules this means: Mirai are immune to Northstar's mind control (Command
and every Path ability that takes over a mind); a Mirai's Eye of Tomorrow
needs sight, so Kōton walls hide what is behind them; Ryusei's Shooting-Star Thrust
ignores structures in between; Northstar's aura halves the movement of any foe
who warps or dashes into it (its allies are spared: D17, 2026-10-20).

## Phase 1: base abilities (approved numbers)

Old clan abilities that go: Mirai's bonus-action parry (+1 to +3 AC; replaced
by Premonitory Evasion), Uddo's chakra regeneration (+2 a round), Akkai's
bigger chakra pool (+25 %) and Taki's 360° vision (can't be flanked; crits
seal chakra).

### Mirai: masters of time and flame (+2 DEX, +1 INT)

Focus: control of position, inevitability and bending the dice.

- **Eye of Tomorrow** (*Ojo del Mañana*, **bonus action, 1 chakra**; the owner,
  2026-10-28, N14 "c" of `docs/SPACE_DESIGN.md`: it used to be passive). Closed
  at the start of a battle; opened, it stays open **until the Mirai's next turn
  begins**: the Mirai sees the next move of every enemy within 18 m in sight
  (whom it will attack, with what, and where it will move: the ground lights up
  and the marks sit over the enemies), and its Premonitory Evasion can answer a
  blow it saw coming. Closed, it sees no plan and Evasion has nothing to answer.
  An AI Mirai opens it with the bonus action it has left before ending its turn,
  so it is open through the party's turn. (`clans.ts` `openEye`, `closeEye`,
  `eyeOpen`; the hotbar's "Ojo del Mañana" button.)
- **Premonitory Evasion** (*Evasión Premonitoria*, reaction, once a round,
  2 chakra). Against an attack on a single target that the Mirai saw coming,
  the Mirai steps 1 square (1.5 m) aside and the attack misses. The step
  provokes no opportunity attack. It doesn't work against area attacks.
- **Katon: Pursuing Flame** (*Katon: Llama Persecutoria*, action, 3 chakra,
  12 m). 2d6 fire; the target makes its DEX save with disadvantage and takes
  half on a success.

### Kōton: alchemists of matter (+2 CON, +1 INT)

Focus: reshaping the map, adaptable weapons and denying ground.

- **Modular Architecture** (*Arquitectura Modular*). At most two structures
  stand at once, each with 20 HP:
  - bonus action, 2 chakra: a metal block of 1 square, half cover;
  - action, 4 chakra: a metal wall 3 squares long (4.5 m), full cover, blocks
    movement and sight.

### Ryusei: assassins of space (+2 DEX, +1 WIS)

Focus: geometric hypermobility, piercing damage and reshaping the board
through Nodes.

- **Weapon Nodes** (*Nodos de Armas*, passive). Every ranged attack, and every
  melee attack that misses, leaves a Node where the weapon lands. At most
  three; the oldest one goes.
- **Shooting-Star Thrust** (*Estocada Fugaz*; called Warp Strike / *Golpe Warp*
  until 2026-10-21, id `ryusei_warp`; bonus action, 2 chakra, 18 m). The
  Ryusei throws its weapon, which flies to the Node as a shooting star, and
  follows it as light (the screen's choreography). Teleports to a Node in
  sight, even with walls in between. **The owner, 2026-10-28: no Node is
  needed** (*"ponlo más fácil: que se ponga el objetivo enemigo al que se quiere
  hacer el ataque o teletransportarse a donde se indique sin los nodos"*): it
  also goes to a foe aimed at (landing beside it, D15's landing rules) or to
  any spot aimed at, within 18 m and in sight. Nodes still work as before (a
  spot with a Node is the Node), and Spatial Swap still needs them. If the Ryusei lands next to an enemy,
  their next attack this turn counts as from behind: advantage, and it can't
  be blocked.
- **Spatial Swap** (*Intercambio Espacial*, action, 3 chakra). Swaps places
  with any unit, ally or enemy, standing on a Node. An enemy can resist with a
  STR save.
- **Weapon Throw** (*Lanzar arma*, id `ryusei_weapon_throw`; action, 2 chakra,
  12 m; the owner, 2026-10-28: *"una nueva habilidad que sea lanzar arma y que
  se teletransporte a su arma"*; the numbers are ours). The Ryusei throws the
  weapon in its hand at a foe in sight and goes after it as light (the
  Shooting-Star Thrust's comet and phase), catching it where it lands, beside
  the foe (the thrust's landing rules, D15). The weapon's attack roll from where
  it stood: a hit deals its die + the same modifier as its blows. Hit or miss,
  the landing leaves a Node; landing beside the foe gives the thrust's edge (its
  next attack this turn from behind). A Bukijutsu Master can deflect it like a
  kunai. With nowhere to land beside the foe, the weapon comes back and the
  Ryusei stays. Needs a weapon in hand (drawn for free). The AI does not use it
  yet. Unlike the thrust, it needs no Node placed first: it is the Ryusei's
  opening move.

### Northstar: the Sovereign's eyes (+2 CHA, +1 WIS)

Focus: breaking the enemy's action economy, control of summons and
psychological disruption.

- **Aura of Sovereignty** (*Aura de Soberanía*, passive, 3 squares = 4.5 m).
  Enemies inside attack with disadvantage. Anyone who enters it by warp or
  dash loses half of their remaining movement at once. (Owner, 2026-10-20:
  only the Northstar's foes; its allies are spared. See D17.) (The owner's *High
  Disadvantage*, rolling three dice and keeping the worst, is kept for the
  Path of the Sovereign: as a passive from level 1 it is too strong.)
- **Command** (action, 4 chakra, 9 m). A Minion that fails a WIS save acts on
  the Northstar's side for 1 round. From level 5 it also works on Captains;
  from level 9, two targets for 2 rounds.
- **Natural Submission** (*Sumisión Natural*, action, 5 chakra). A
  non-intelligent beast or an enemy summon that fails a WIS save joins the
  party until the end of the mission. Not bosses. With the Shadow Barracks it
  can become permanent later.

## Phase 1 rulings

Where the numbers above leave a question open, phase 1 is built with these
rulings (conservative, each with its reason). The owner approved one
recommendation in particular: the Aura of Sovereignty gives **plain
disadvantage** (two d20, keep the lower); *High Disadvantage* (three dice)
stays reserved for the Path of the Sovereign.

| # | Question | Decision | Why |
|---|---|---|---|
| D1 | Kōton id and Spanish clan names | Id `Koton`, displayed "Kōton". All four names are the same in both languages. | A literal ō can fail to match decomposed Unicode from imported JSON. The names are proper names. |
| D2 | Stat bonuses | **Decided by the owner on 2026-10-20: applied.** Each clan's +2/+1 counts in every number: checks, saves, skills, initiative, weapon attack and damage, AC, max HP and chakra, jutsu DC and attack. The sheet keeps the base scores the player rolled or bought; the bonus is added once, where numbers are derived (`effectiveScores` in `rules/checks.ts`, used by `deriveStats`, saves, skills, rests and the battle units), and is never written onto the scores. The creator shows each score as base + clan bonus. Sheets now carry a version: version 2 counts the bonus in its stored numbers. An older sheet (a saved run, an imported sheet) gets exactly what the bonus adds to each stored number, once, when it loads (`migrateCharacter`); a ninja at full HP or chakra stays full, a hurt one keeps what it had. The presets keep the owner's hand-made numbers plus what the bonus adds (Solen, Akira, Aiden and Ren +1 AC, jutsu DC and attack; Kaien and Raiga +1 AC; Hiro +4 max HP and +1 max chakra). Companions re-derive (Hana 31 → 35 max HP and 34 → 35 max chakra, Kenji +1 AC). Enemies get their clan's bonus too. | The owner wants the bonuses to count for real. Adding them where numbers are derived keeps the base scores as rolled and makes a double bonus impossible; the version mark makes the one-time conversion of older sheets safe to repeat. |
| D3 | Old traits the doc doesn't list (Uddo +6 HP, Akkai necrotic resistance, Taki "can't be surprised") | All removed. Mirai's unused vs-genjutsu save option stays (dead code; Mirai is unchanged). | The phase-1 lists define each new clan completely. The Taki trait text itself defines "360° vision" as "can't be flanked or surprised". |
| D4 | Saved characters | The clan is renamed (saved runs and imported sheets alike). A sheet of an old clan that built a bonus into its maxima (Uddo's +6 max HP, Akkai's +25 % chakra) has its max HP and chakra worked out again without it, when its numbers came from the creator's formula (its AC, jutsu DC and attack still match it); what it has left is kept under the new maxima. Hand-made numbers (the presets), the look and the jutsu are untouched. Companions defined in code re-derive too (Kenji 28 → 22 max HP, Hana 41 → 34 max chakra; with D2 since 2026-10-20, Hana has 35 max HP and 35 max chakra). | The removed bonuses go everywhere, as the doc says; the look is kept as the doc requires. |
| D5 | Old signature jutsu and camp activities | Ids and numbers kept. Jutsu names re-prefixed with the new clan. Camp activities re-gated by conversion. | Saves reference the ids. The doc gives no replacement, so the owner can re-flavour them with the Paths. |
| D6 | Enemy clans | **Decided by the owner on 2026-10-20: mixed.** Each encounter slot names its clan (`src/battle/encounters.ts`), so a battle is always the same; the template keeps its look, build and jutsu, and takes the clan's abilities and bonus and a name of its own. Cedar road: a Mirai Rogue (*Renegado*), a Northstar Lookout (*Vigía*) and a Ryusei Raider (*Asaltante*). Ford patrol: a Ryusei Stalker (*Acechador*), a Mirai Rogue and a Kōton Hunter-nin (*Cazador*). Night raid: a Ryusei Raider, a Kōton Iron Fist (*Puño de hierro*), a Northstar Shade (*Sombra*) and Kagero (Mirai, Captain). Every fight against ninjas has two or more clans; the two road battles bring all four between them, and the night raid all four at once. The hydra fights alone (it has no clan). Enemies that share a name are numbered ("Renegado 1", "Renegado 2"); one alone is not. In a Spanish sentence a generic name takes its article, numbered or not ("Turno del Asaltante", "El Renegado 1 golpea a Akira", "la Sombra"; each template and variant carries its article, `articleEs`), and a participle agrees with it ("la Sombra está desprevenida"); Kagero and the party's ninjas are proper names and never take one (step 3, 2026-10-20). The unit card shows an enemy's clan, class and rank on its turn. An enemy Northstar has its aura; Command and Submission find no target in the party (D18), so it fights with the aura and its jutsu. | So the player meets each clan's abilities and counters, and a party Northstar finds Minions it can command (all but the Mirai). |
| D7 | Ranks | Rogue, hunter and raider are Minions; Kagero is a Captain; the hydra (body and heads) is the Boss; the party has no rank. An encounter can override the rank. | Follows the doc's definitions. No Sub-boss exists yet. |
| D8 | Bloodline abilities and the jutsu pipeline | No seals, no discount, not enhanceable, blocked by sealed chakra. Pursuing Flame is a real jutsu. | Seals would stow the blade before a Shooting-Star Thrust. The old foresight never needed hands. Katon is ninjutsu. |
| D9 | "Saw it coming" | The attacker is within the Eye's reach (18 m, in sight) and not attacking from hiding. The same rule applies to party and enemy Mirai. | It ties Evasion to the Eye, the Kōton counter works through sight, and enemy Mirai can still use it (enemies have no intents to read). |
| D10 | What Evasion covers and its order | Every single-target hit Kawarimi covers. Order: clone → Evasion → Kawarimi; declining offers Kawarimi. The AI uses Kawarimi's threshold. Evading during its own move ends the move. | Reuses tested rules. |
| D11 | Eye ground destination | Planned with a whole turn's movement at plan time (half if the enemy must stand up first), never onto a spot another enemy already plans to stop on. The AI keeps to it while it is still free and reachable and still serves the plan: it acts from there, or no reachable spot does and it still gets closer. A Ryusei that means to Shooting-Star Thrust in beside its target shows where it will land instead (D21, 2026-10-20). Once an enemy has begun its turn (it walked, or spent its action or bonus action) its plan is spent: it shows none until it plans again at the end of that turn, and the other enemies' marks stay on through every animation (step 3, 2026-10-20). | Otherwise the forecast would lie. |
| D12 | Structure range, cap, placement and AC | 6 m in sight (like Earth Wall). The block fills the 3 × 3 cells around the point; the wall stands across the caster's line, centred on the point (like Earth Wall). A third makes the oldest crumble (like Nodes); the block and the wall count together. Not over a unit (the hydra's bulk too) and not off the map; props and terrain underneath are allowed. Earth walls and water barriers are refused over a unit the same way. AC 10 (like props). Areas damage them. Permanent. | Mirrors existing rules and the owner's own "oldest goes" pattern. Never traps a unit. |
| D13 | Full cover | Only Kōton metal walls give it. Nothing passes: sight, attacks, melee, opportunity attacks, flanking, shoves, areas from the far side (lightning running along the water too). Earth and water walls give no full cover, as before. | This is the rule full cover means. It changes nothing for existing jutsu. |
| D14 | Nodes | Weapon attacks only (kunai, hit or miss, and missed blows, opportunity attacks too), at the target's position; on a prop or a Kōton structure, on its face toward the Ryusei. A blow a Mirai steps aside from with Premonitory Evasion is a miss (the doc says "the attack misses"): its Node lands where the Mirai stood. A blow that strikes a clone or a Kawarimi log lands, so it leaves none. Static, visible to both sides, they outlive the owner, and using them doesn't consume them. | "Where the weapon lands". A Node inside a wall would let the warp land on either side. The Paths add moving Nodes and bulk Nodes later. |
| D15 | Shooting-Star Thrust wording | Sight ignores structures, but trees and tents still block. It lands on the Node, or, when someone stands on it (fallen ninjas too), on the nearest free cell within 1.5 m of it and at least 1 m from them (on their far side when two are as near; **owner, 2026-10-20**: so the sprites never overlap), never where the Ryusei already stands; with no such cell it is refused. "Next to" means a seen foe within weapon reach, with no metal wall between. "From behind" means advantage on the next attack roll this turn (weapon, jutsu, prop or structure). "Can't be blocked" skips clone, Kawarimi and Evasion, but not AC, cover or Dodge. The edge lasts only the turn it was won in: the end of a stealth turn takes it too, and it never carries into the fight. A hidden unit that teleports into the open (Shooting-Star Thrust, Swap, Body Flicker, Evasion) is seen at once, as if it had walked there; onto a hiding place it stays hidden. | One shared reading for the engine and the preview. "Blocks" are the defensive negations. |
| D16 | Spatial Swap | 18 m to the Node in sight (like Warp). "On a Node" means within 0.75 m. Ninjas only. A resisted swap still costs. Combat only. | The doc gives no range, so this mirrors Warp. The hydra is too big. |
| D17 | Aura | Plain disadvantage (owner-approved) on every attack roll a foe makes from inside (weapons, kunai, jutsu attack rolls, props and structures); saves are untouched, and two auras are no worse than one. The movement penalty: **decided by the owner on 2026-10-20: it spares the Northstar's allies.** Only a foe of the Northstar (by the side it fights for now: a commanded unit goes by its new side) loses half of its remaining movement, only on its own turn, each time it comes in from outside (coming into two at once costs half once). "Warp" = Shooting-Star Thrust, Swap (the Ryusei who moves, not the one swapped), Body Flicker; "dash" = walking after Dash (the walk ends where the halved movement runs out), and melee flash-ins. | The owner first wrote "anyone"; on 2026-10-20 he chose to spare the allies. Outside one's own turn there is no remaining movement to halve. |
| D18 | Command details | Needs sight. Invalid targets are refused before paying, in this order: the fighting has started, a target, not already under command, not a Sub-boss or Boss, a foe with a rank (so not the party), a ninja (beasts are Submission's), not a Mirai, a Minion (a Captain from level 5); then 9 m and sight. It lasts until the end of the target's next N turns (a turn lost to surprise counts) and ends if the target drops. Enemies whose plan was aimed at a unit that changes sides (taken, or let go) plan again at once, so none strikes its own side and the Eye shows the new plan. AI-driven: it plans afresh each step against its former allies, and can't use the party's items or be handed to a player. Victory, defeat and results use the side a unit belongs to: a commanded enemy is still an enemy. Kagero is a Mirai, so no Captain in the game can be commanded yet (D6). | Taking a player's ninja away is a big change for the owner to approve (still open; enemy Northstars exist since D6, 2026-10-20, and this ruling holds for them). Flipping teams keeps the AI, targeting and pathing correct. |
| D19 | Level-9 Command | The engine accepts a second target. The screen uses a second click. | No unit is above level 6 today. |
| D20 | Natural Submission | 9 m (like Command). Boss and Sub-boss excluded. Joins for the rest of the battle (the screen says so); it is no longer an enemy for victory, but not a party member for defeat or the result either: it falls with no death saves, and nobody takes its reins or opens the party's backpack for it. Carrying it through the mission is deferred. | No beast or summon units exist. Carry-over needs beast party units in missions. |
| D21 | AI scope | **Decided by the owner on 2026-10-20: the enemy AI uses the clan abilities more**, so the player sees them used against the party. **Built on 2026-10-20 (step 2 of 3).** An enemy's clan move takes the place of a jutsu that would reach just one foe, and is worth what that jutsu was (a jutsu that catches two foes or more still comes first). Plans are still made at the end of the enemy's turn, so a Mirai's Eye shows them. **Mirai**: its first jutsu of the fight and every other one after it are Pursuing Flame (at the foe it would have cast the other at), in place of a jutsu worth up to two and a half flames: the rogues' Fireball and Kagero's Lightning Hound, never Kagero's Chidori, which he opens with (the owner, 2026-10-20; he opened with the flame before). Premonitory Evasion as before (Kawarimi's threshold, D10). **Ryusei**: with no Node of its own yet, it opens by throwing a kunai at its target (the Node lands at the target's feet); a Shooting-Star Thrust in beside a foe is planned from any distance when one of its Nodes lands it in reach, and is worth one and a half plain blows (advantage, nothing blocks it); the Eye shows where it will land. While it has no Node near a foe out of its reach, a kunai at that foe counts half a blow from behind more. Spatial Swap only when it clearly helps: a hurt friend (half its HP or less) that a foe can strike, standing on one of its Nodes, while the Ryusei is healthy and out of every foe's reach (they trade places), or a foe on its Node that more likely fails its STR save than not, pulled in among two or more of the Ryusei's friends with none of the foe's own near. **Kōton**: the Block as before (bonus action, right in front of itself, for cover). The Wall (its action) shelters itself or a hurt friend (half HP or less) from the foes that can shoot at it but can't strike it where it stands (none within 3 m or its weapon's reach), when it hides the friend from two or more of them or from all of them; it is worth the share of those foes' harm that would have gone at that friend. A Kōton that walked and has nothing to strike raises it rather than dash on in the open, when it hides it from two or more foes. One wall standing at a time, and a block never makes its own wall crumble. **Northstar**: Command is worth (1 − the target's WIS save chance) × 2 × the harm the target does in a turn (its best blow, kunai or jutsu): it stops striking the Northstar's side and strikes its own. An enemy Northstar commands a target whose save fails at least half the time in place of any attack or jutsu on one foe, while nobody is under its command. The party gives it no valid target (D18), so this waits for the owner's answer on D18; it fights with its aura and its jutsu. The aura gets no AI change. **Allies on the AI** use the same worths (Shooting-Star Thrust, the kunai's Node, Swap, Wall, Command) but not the "clan move first" rule: tried, it cost the party 33 of its 77 wins in 100 hydra fights. Also fixed: the AI no longer strikes a structure that another metal wall shelters from the blow (the engine refused it). Measured in "D21: the enemy AI's clan moves, measured" below. | The owner wants each clan's abilities seen in use against the party. Each rule is a tactic that makes sense (open from range, mark a foe and strike it from behind, shelter the hurt, advance under cover), every move is checked with the engine's own rules so none is refused, and all of it is worked out from the state alone, so battles replay. |
| D22 | Stealth phase | Command, Submission and Swap are combat only. The other abilities are allowed; loud ones start the fight. | Flipping an unaware guard's side mid-stealth has no defined meaning. |
| D23 | "Once a round" | The existing reaction, refreshed at the start of the unit's turn. | Nothing new to track. |
| D24 | Names (2026-10-20) | Warp Strike and Command stayed in English in both languages (the owner wrote them so); **on 2026-10-21 his icon sheets named them in Spanish: *Golpe Warp* and *Comando*** (English unchanged). **Later on 2026-10-21 the owner renamed the warp after the clan's name (Ryusei, a shooting star) and to keep clear of other games' "Warp Strike": *Shooting-Star Thrust*, in Spanish *Estocada Fugaz*** ("mejor estocada fugaz o shooting-star thrust"; he first said "Shooting Star"). Its thrown weapon flies as a shooting star (a comet's tail of the phase's blue light). The id `ryusei_warp` stays, so saves are untouched; the hotbar's short label is *Estocada Fugaz* / *Star thrust*. The base jutsu take the owner's own Spanish names: *Bola de fuego* (`fireball_goukakyu`; enhanced, *Gran bola de fuego*), *Muro de agua* (the water wall), *Muro de tierra* (the earth wall, Doryuheki), *Balas de tierra* (`earth_spear_doryuudan`); Kirin, Chidori and Rasengan keep their names; the other base jutsu drop the "Estilo X:" prefix so their names are short like his ("Fuego del dragón", "Gran ráfaga cortante"). **Built on 2026-10-20 (step 3 of 3).** In sentence case like his: *Proyectil del dragón de agua*, *Sabueso del rayo*, *Chidori* (without "(Mil Pájaros)"). The enhanced Fireball is said by its own name in the log and over the caster ("lanza Gran bola de fuego"; other enhanced jutsu still say "potenciado"); the hotbar's short labels follow (*Bola de fuego*, *Muro de agua*, *Muro de tierra*, *Balas de tierra*, *Fuego del dragón*, *Ráfaga cortante*). **Then decided by the owner on 2026-10-20: every jutsu is "Técnica de <Elemento>: <name>"** (English "<Element> Technique: <name>"), the element being the jutsu's nature (Fuego, Agua, Tierra, Viento, Rayo, Genjutsu, Taijutsu, Kenjutsu): *Técnica de Fuego: Bola de fuego* (enhanced, *Técnica de Fuego: Gran bola de fuego*), *Técnica de Agua: Muro de agua*, *Técnica de Rayo: Kirin*, *Técnica de Fuego: Gran aniquilación*, *Técnica de Fuego: Llama persecutoria*; the clan secrets too (*Técnica de Fuego: Aniquilación de la llama del dragón*; their description says whose secret it is). The clan's bloodline abilities (Shooting-Star Thrust / Estocada Fugaz, Command / Comando, the Block...) are not jutsu and keep their names. Each jutsu has a Spanish description (`descriptionEs`). **The name no longer shows on the action bar** (the owner): the slot shows his painted icon, and hovering it (or aiming it) opens a window with the full name, rank, action, chakra and reach, dice, area and save, the description and what the enhanced cast does. Ids are unchanged, so saves are untouched. | The owner's own names; short names read better on the hotbar and in the log. |

Open questions for the owner:

- D2: apply the clan stat bonuses to the ability scores? **Decided on
  2026-10-20: yes, they count everywhere (built; see D2).**
- D5: new camp activities and signature jutsu flavour per clan?
- D6: should the common enemies stay Mirai (immune to Command)? **Decided on
  2026-10-20: no, enemy clans are mixed (built; see D6).**
- D17: should the aura's movement penalty spare the Northstar's allies?
  **Decided on 2026-10-20: yes, only its foes are slowed (built; see D17).**
- D18: may an enemy Northstar command the party's ninjas? (Enemy Northstars
  exist since D6; until this is answered, they can't.)
- D24: the S-rank jutsu lost their "Definitiva de rango S:" prefix and the
  English names their "X Release:" prefix along with the Spanish "Estilo X:"
  (decided in the build so all names read alike). Keep it so? **Decided on
  2026-10-20: every jutsu is "Técnica de <Elemento>: <name>", and names show
  in a pop-up, not on the bar (built; see D24).**
- D20: no shipped battle has a beast or summon for Natural Submission.
  **Decided on 2026-10-20: more beasts and summons come later; nothing to
  add now.**
- D21: should the AI favour the clan signatures more (Pursuing Flame over a
  bigger jutsu, Command over damage, a Ryusei throwing kunai to plant Nodes
  before it closes in), so the player sees them used against the party?
  **Decided on 2026-10-20: yes. Built on 2026-10-20 (see D21 and its
  measurements below).** One choice is the owner's to confirm: Kagero opens
  the night raid with Pursuing Flame instead of his Chidori, which makes the
  raid easier for a party of three (see below). **Decided on 2026-10-20:
  Kagero opens with his Chidori again** (the opening flame now replaces only
  a jutsu worth up to two and a half flames, like every later one).

## D21: the enemy AI's clan moves, measured

AI-only battles on the four shipped encounters on 2026-10-20, 100 per
encounter (seeds 1 to 100, Normal), before and after step 2. The river patrol
is fought in the open: the AI doesn't play the stealth phase. Party A is step
1's baseline party: Solen, Hana, Kenji and the Northstar legend the owner
discarded on 2026-10-22 (the script now plays Hiro fourth, so a re-run of party
A gives other numbers). Party B is a mission's
party: Solen, Hana and Kenji. Both play on the AI without their S-rank
ultimates, which otherwise end most fights in the first round. Re-run with
`npx tsx scripts/ai-battles.ts 100` (add `--party=3` for party B).

In how many of the 100 battles the enemies used each move, before → after:

| enemy move | river patrol, A | cedar road, A | night raid, A | river patrol, B | cedar road, B | night raid, B |
|---|---|---|---|---|---|---|
| Pursuing Flame | 0 → 100 | 0 → 84 | 0 → 100 | 0 → 100 | 1 → 93 | 2 → 100 |
| a Mirai's other jutsu | 99 → 32 | 83 → 43 | 99 → 86 | 100 → 63 | 93 → 65 | 100 → 100 |
| Premonitory Evasion | 100 → 100 | 100 → 100 | 92 → 95 | 100 → 100 | 99 → 100 | 72 → 88 |
| a Ryusei's kunai (a Node) | 0 → 47 | 98 → 98 | 16 → 93 | 0 → 54 | 100 → 100 | 3 → 97 |
| Shooting-Star Thrust (from behind) | 0 → 0 | 45 → 27 | 9 → 32 | 0 → 0 | 64 → 48 | 6 → 57 |
| Spatial Swap | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 |
| Kōton Block | 73 → 57 | (no Kōton) | 42 → 40 | 60 → 50 | (no Kōton) | 52 → 50 |
| Kōton Wall | 0 → 7 | (no Kōton) | 0 → 4 | 0 → 10 | (no Kōton) | 0 → 19 |
| Command | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 | 0 → 0 |
| party wins | 100 → 100 | 100 → 100 | 100 → 100 | 92 → 98 | 97 → 96 | 29 → 50 |

Refused actions, stalls (a unit acting more than 12 times in one turn) and
battles that never end: 0 in all 1,600 battles, before and after. The hydra
has no clan: party A won 77 → 76 of 100, party B 12 → 18.

What the numbers say:

- Every battle with a Mirai now shows Pursuing Flame. It is about 60 to 75 % of
  the rogues' jutsu (101 flames and 33 Fireballs in the river patrol, A);
  Kagero opens with it once a fight and then keeps to his Chidori (41 % of
  his jutsu in the short raids of party A, 19 % in the long ones of B).
- In the river patrol the Ryusei stalker throws its opening kunai in about
  half the battles but has never lived to warp: it falls in the first round
  or two. On the cedar road the warps went down (45 → 27 with A): the rogue's
  opening flame hurts the party less than its Fireball did, so the party
  walks up and leaves the Node the raider planted at its feet; the raider
  then walks in. In the night raid they went up (9 → 32 with A).
- Spatial Swap never came up: it needs a hurt friend, or a lone foe, on one
  of the Ryusei's Nodes in just the right spot. The tests set both up.
- Command stays at 0: the party's ninjas have no rank (D18).
- The enemies hit a little softer: a flame (2d6) where a Fireball (3d8) or a
  Chidori (5d8) went, a kunai where a blow went. Party A wins every fight
  against ninjas either way. With party B the night raid went from 29 to 50
  party wins; Kagero's opening flame is most of that (if he opened with his
  Chidori, the party won 36; with the flame in place of every other Chidori,
  66). If the owner wants the raid as hard as before, Kagero can open with
  his Chidori: the flame would then replace only jutsu worth up to two and a
  half flames, his first jutsu too (`FLAME_FOR` in `src/battle/intent.ts`).

## Step 3: the screen and the text (2026-10-20)

What the battle check of every clan ability turned up, and the names (D24):

- **The Eye of Tomorrow's marks stay steady and true.** They used to hide
  while an animation played and come back in the gaps between the AI's
  steps, showing the plan an enemy had just carried out. Now they stay on
  through the animations, and an enemy that has begun its turn shows none
  until it plans again (D11; `planSpent` in `src/battle/intent.ts`).
- **Close enemies' marks can't be mixed up.** Each walk ends in an arrowhead
  on its stop marker, so two enemies stopping side by side read as two walks,
  not one walk with two stops. The marks over neighbours' heads never stack:
  one that would is lifted above the other, with a stem down to its own enemy.
  The enemy under the cursor has its lines drawn bold and bright and its mark
  edged in white, while the others' dim.
- **A blow reads as a blade.** The mark for a blow is a small upright sword
  drawn in pixels; the ⚔ glyph read as ✕ at the tactical zoom.
- **Spanish articles** for generic enemy names, and participles that agree
  (D6).
- **Floating words keep clear of the cards and bars** over the map: a word
  that would fall under a panel moves the shortest way out of it.
- **The enemy aura is explained**: the first time an enemy Northstar stands in
  a fight, a tip says what its violet ring does to the party (and that its
  allies are spared, D17).
- **The creator's clan cards** show the clan's bonus as chips ("+2 DEX",
  "+1 INT": added to your scores, counts in every number, D2).
- **Two engine bugs fixed.** A hydra head whose planned roar was aimed at a
  ninja standing right under it had it refused (a cone needs a direction), so
  the head lost its turn: it no longer aims a roar at a foe right under it,
  and picks again when one has walked there. And a walk crossing a cell
  someone else stands or lies on (an ally, the fallen) could pause for an
  opportunity-attack prompt on that cell, or end there when the blow dropped
  the mover: the walk now crosses such cells in one hop, asks before the hop
  from the last cell it can stand on, and never stops on one (a dash cut short
  by an aura finishes the hop; a trap that goes off mid-hop leaves the mover
  on the nearest free cell). Found by fuzzing; tests pin both.

The AI-only battles of D21 were re-run after step 3 with the same seeds:
every number in the table above is unchanged (refused actions, stalls and
unfinished battles still 0), so the fixes changed no outcome there.

## Later phases: the Paths of Mastery (the owner's design)

Not built yet. Numbers will be proposed and approved before each Path is
built.

### Mirai

- **Path of the Oracle** (tactical support)
  - *Shared Vision* (Visión Compartida): cancels surprise attacks and attacks
    from behind against allies.
  - *Rewrite Fate* (Reescritura del Destino): forces any unit in line of sight
    to reroll a die.
  - *Step to the Blind Spot* (Paso al Punto Ciego): moves to a square out of
    enemy sight and becomes Hidden.
  - Ultimate, *Immovable Future* (Futuro Inamovible): fixes an enemy's fate.
    The next attack it takes (from anyone) hits for sure, is an automatic
    critical and pierces all armor.
- **Path of the Infernal Fire** (raw and area damage)
  - *White Flame* (Llama Blanca): ignores elemental resistances and leaves
    Severe Burn on the ground.
  - *Calcination Wall* (Muro de Calcinación): raises fire walls 3 squares long
    to cut routes.
  - *Volcanic Eruption* (Erupción Volcánica): a 2x2 area of delayed damage
    that destroys physical cover.
  - Ultimate, *Emperor Avatar* (Avatar Emperador): a 3x3 avatar. Immune to
    knockdown and push, leaves a trail of magma and makes massive area attacks
    for 3 turns.
- **Path of the Ash Weaver** (traps and interruption)
  - *Mark of Inevitability* (Marca de Inevitabilidad): attacking an enemy
    exactly where it was foreseen is a guaranteed critical.
  - *Ash Trap* (Trampa de Ceniza): invisible mines that deal damage and
    Blindness.
  - *Preventive Combustion* (Combustión Preventiva): interrupts an enemy cast,
    burning their lungs.
  - Ultimate, *Fake Future*: plants a Time Mark. After 2 turns the whole board
    rewinds: allies and enemies go back to their positions and HP, except that
    enemies hurt in the meantime keep the damage from the illusion.

### Kōton

- **Crimson Steel** (Acero Carmesí; dynamic forge, offensive tank)
  - *Reactive Armory* (Armería Reactiva): switches weapon as a bonus action,
    changing role: greatsword to push and stun, scythe to drag enemies out of
    cover, blades to pin and immobilize.
  - *Heavy Structures* (Estructuras Pesadas): the Great Orbiting Shield (full,
    movable cover of 1 square) or a destructible Container Prison around a
    boss that Blinds it.
  - Ultimate, *Siege Fortress* (Fortaleza de Asedio): assembles a massive base
    that gives the whole party a physical advantage.
- **Sacred Platinum** (Platino Sagrado; anti-magic support)
  - *Orbiting Arsenal* (Arsenal Orbitante): floating weapons of pure platinum
    that reflect magic, purge conditions and cancel jutsu.
  - Ultimate, *Absolute Zero Dome* (Cúpula de Cero Absoluto): a huge dome
    where magic and special abilities are silenced completely.
- **Toxic Mercury** (Mercurio Tóxico; infiltration, lasting damage)
  - *Liquid Silver Form* (Forma de Plata Líquida): passes through enemies and
    cracks, ignoring collision, and halves physical damage taken.
  - *Capillary Whip* (Látigo Capilar): medium range; Heavy Poison straight
    into the bloodstream.
  - *Amalgam Lake* (Lago de Amalgama): a 3x3 area of slippery mercury; enemy
    physical attacks have disadvantage.
  - Ultimate, *Heavy Metal Rain* (Lluvia de Metales Pesados): a toxic fog over
    the whole map; sight drops to 1 square, it deals damage over time, and
    enemy STR and DEX are halved.

### Northstar

- **Path of the Sovereign** (pure tactical control)
  - *Forced Castling* (Enroque Forzado): makes an enemy walk to a chosen
    square.
  - *Shield of Loyalty* (Escudo de Lealtad): forces the nearest enemy to take
    a lethal attack in your place.
  - *Friendly Fire* (Fuego Amigo): orders an enemy to attack its own side with
    advantage.
  - Ultimate, *OBEY ME, WORLD*: permanently dominates every lesser troop on
    the map, turns Captains into allies, and stuns bosses and breaks their
    immunities for a while.
  - The aura's *High Disadvantage* (three dice, keep the worst) belongs here.
- **Path of the Mindbreaker** (Rompementes; psychic damage, punishment)
  - *Echo of Pain* (Eco de Dolor): the attacker takes back 50 % of the damage
    the Northstar takes, as true psychic damage.
  - *Synaptic Overload* (Sobrecarga Sináptica): a 3-square cone that silences
    enemy magic.
  - *Mandate of Heresy* (Mandato de Herejía): orders surrender; a target that
    resists (immunity) takes massive direct damage from mental collapse.
- **Path of the Shadow Puppeteer** (Titiritero de Sombras; a lasting army,
  "Arise")
  - *Shadow Extraction* (Extracción de Sombra): raises fallen enemies as Ink
    Shadows. Extracting a Captain grants 3 of its abilities; a Sub-boss, its
    special attack.
  - *Shadow Barracks*: the extracted shadows are kept permanently at the base.
  - *Mission points* (balance): 6 deployment points per mission (Minion 1,
    Captain 3, Sub-boss 4).
  - *Running cost*: shadows share the player's actions (or drain chakra
    passively) and are fragile against magic damage.
  - Ultimate, *Awakening of the Monarch* (Despertar del Monarca): no point
    limit for 2 turns; every enemy killed in this mission rises at once for a
    massive assault.

### Ryusei

- **Path of the Fleeting Edge** (Filo Fugaz; 1v1 hunter)
  - *Hunting Mark* (Marca de Cacería): turns an enemy into a moving Node.
  - *Rupture Warp* (Warp de Ruptura): teleports through walls and obstacles
    if there is line of sight (windows, cracks).
  - *Phase Assassination* (Asesinato de Fase): appears "inside" the enemy's
    square, dealing physical damage that ignores 100 % of armor.
- **Path of the Starfall** (Lluvia de Estrellas; geometric area damage)
  - *Node Scatter* (Dispersión de Nodos): throws daggers that plant 3 Nodes at
    once.
  - *Spatial Guillotine* (Guillotina Espacial): cuts space in a straight line
    between 2 Nodes, hitting everything in between.
  - *Jump Refraction* (Refracción de Salto): leaves an afterimage that
    explodes in an area.
- **Path of the Thread of Fate** (Hilo del Destino; evasion, support)
  - *Inversion Shield* (Escudo de Inversión): teleports an enemy attack to an
    empty square to save an ally.
  - *Isolation Cube* (Cubo de Aislamiento): seals a 2x2 area in 4 Nodes; whoever
    is inside is in untouchable, unmovable stasis for 1 turn.
  - *Nullified Gravity* (Gravedad Anulada): much higher passive evasion and
    immunity to ground traps while several Nodes are active.
- Ultimate (every Ryusei), *Flash Frenzy* (Frenesí del Destello): the whole
  map becomes Nodes; 3 actions and 3 bonus actions for one turn; warps cost
  nothing and deal more damage each time. Severe fatigue the next turn.
