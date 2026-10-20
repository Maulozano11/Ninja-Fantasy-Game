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
needs sight, so Kōton walls hide what is behind them; Ryusei's Warp Strike
ignores structures in between; Northstar's aura halves the movement of anyone
who warps or dashes into it.

## Phase 1: base abilities (approved numbers)

Old clan abilities that go: Mirai's bonus-action parry (+1 to +3 AC; replaced
by Premonitory Evasion), Uddo's chakra regeneration (+2 a round), Akkai's
bigger chakra pool (+25 %) and Taki's 360° vision (can't be flanked; crits
seal chakra).

### Mirai: masters of time and flame (+2 DEX, +1 INT)

Focus: control of position, inevitability and bending the dice.

- **Eye of Tomorrow** (*Ojo del Mañana*, passive). Already in the game as
  Future Foresight: a Mirai sees the next move of every enemy within 18 m in
  sight. Now the ground also lights up where each enemy plans to move and what
  it plans to attack.
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
- **Warp Strike** (bonus action, 2 chakra, 18 m). Teleports to a Node in
  sight, even with walls in between. If the Ryusei lands next to an enemy,
  their next attack this turn counts as from behind: advantage, and it can't
  be blocked.
- **Spatial Swap** (*Intercambio Espacial*, action, 3 chakra). Swaps places
  with any unit, ally or enemy, standing on a Node. An enemy can resist with a
  STR save.

### Northstar: the Sovereign's eyes (+2 CHA, +1 WIS)

Focus: breaking the enemy's action economy, control of summons and
psychological disruption.

- **Aura of Sovereignty** (*Aura de Soberanía*, passive, 3 squares = 4.5 m).
  Enemies inside attack with disadvantage. Anyone who enters it by warp or
  dash loses half of their remaining movement at once. (The owner's *High
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
| D2 | Stat bonuses | Set in data and shown on the clan card, marked "(not in effect yet)"; **not applied**, as before. | They were never applied. Applying them shifts every saved character, and an existing rules test pins the default hero's DEX save at +2. It would be a one-helper change later if the owner wants it. |
| D3 | Old traits the doc doesn't list (Uddo +6 HP, Akkai necrotic resistance, Taki "can't be surprised") | All removed. Mirai's unused vs-genjutsu save option stays (dead code; Mirai is unchanged). | The phase-1 lists define each new clan completely. The Taki trait text itself defines "360° vision" as "can't be flanked or surprised". |
| D4 | Saved characters | The clan is renamed (saved runs and imported sheets alike). A sheet of an old clan that built a bonus into its maxima (Uddo's +6 max HP, Akkai's +25 % chakra) has its max HP and chakra worked out again without it, when its numbers came from the creator's formula (its AC, jutsu DC and attack still match it); what it has left is kept under the new maxima. Hand-made numbers (the presets), the look and the jutsu are untouched. Companions defined in code re-derive too (Kenji 28 → 22 max HP, Hana 41 → 34 max chakra). | The removed bonuses go everywhere, as the doc says; the look is kept as the doc requires. |
| D5 | Old signature jutsu and camp activities | Ids and numbers kept. Jutsu names re-prefixed with the new clan. Camp activities re-gated by conversion. | Saves reference the ids. The doc gives no replacement, so the owner can re-flavour them with the Paths. |
| D6 | Enemy clans | Converted like everything else: rogue and Kagero Mirai, hunter Kōton, raider Ryusei. They get their clan abilities. | "Old clans convert the same way". Enemies of these clans must work. Consequence: rogues are immune to Command. |
| D7 | Ranks | Rogue, hunter and raider are Minions; Kagero is a Captain; the hydra (body and heads) is the Boss; the party has no rank. An encounter can override the rank. | Follows the doc's definitions. No Sub-boss exists yet. |
| D8 | Bloodline abilities and the jutsu pipeline | No seals, no discount, not enhanceable, blocked by sealed chakra. Pursuing Flame is a real jutsu. | Seals would stow the blade before a Warp Strike. The old foresight never needed hands. Katon is ninjutsu. |
| D9 | "Saw it coming" | The attacker is within the Eye's reach (18 m, in sight) and not attacking from hiding. The same rule applies to party and enemy Mirai. | It ties Evasion to the Eye, the Kōton counter works through sight, and enemy Mirai can still use it (enemies have no intents to read). |
| D10 | What Evasion covers and its order | Every single-target hit Kawarimi covers. Order: clone → Evasion → Kawarimi; declining offers Kawarimi. The AI uses Kawarimi's threshold. Evading during its own move ends the move. | Reuses tested rules. |
| D11 | Eye ground destination | Planned with a whole turn's movement at plan time (half if the enemy must stand up first), never onto a spot another enemy already plans to stop on. The AI keeps to it while it is still free and reachable and still serves the plan: it acts from there, or no reachable spot does and it still gets closer. | Otherwise the forecast would lie. |
| D12 | Structure range, cap, placement and AC | 6 m in sight (like Earth Wall). The block fills the 3 × 3 cells around the point; the wall stands across the caster's line, centred on the point (like Earth Wall). A third makes the oldest crumble (like Nodes); the block and the wall count together. Not over a unit (the hydra's bulk too) and not off the map; props and terrain underneath are allowed. Earth walls and water barriers are refused over a unit the same way. AC 10 (like props). Areas damage them. Permanent. | Mirrors existing rules and the owner's own "oldest goes" pattern. Never traps a unit. |
| D13 | Full cover | Only Kōton metal walls give it. Nothing passes: sight, attacks, melee, opportunity attacks, flanking, shoves, areas from the far side (lightning running along the water too). Earth and water walls give no full cover, as before. | This is the rule full cover means. It changes nothing for existing jutsu. |
| D14 | Nodes | Weapon attacks only (kunai, hit or miss, and missed blows, opportunity attacks too), at the target's position; on a prop or a Kōton structure, on its face toward the Ryusei. A blow a Mirai steps aside from with Premonitory Evasion is a miss (the doc says "the attack misses"): its Node lands where the Mirai stood. A blow that strikes a clone or a Kawarimi log lands, so it leaves none. Static, visible to both sides, they outlive the owner, and using them doesn't consume them. | "Where the weapon lands". A Node inside a wall would let the warp land on either side. The Paths add moving Nodes and bulk Nodes later. |
| D15 | Warp Strike wording | Sight ignores structures, but trees and tents still block. It lands on the Node, or on the nearest free cell within 1.5 m (the far side of whoever stands on it), never where the Ryusei already stands. "Next to" means a seen foe within weapon reach, with no metal wall between. "From behind" means advantage on the next attack roll this turn (weapon, jutsu, prop or structure). "Can't be blocked" skips clone, Kawarimi and Evasion, but not AC, cover or Dodge. The edge lasts only the turn it was won in: the end of a stealth turn takes it too, and it never carries into the fight. A hidden unit that teleports into the open (Warp, Swap, Body Flicker, Evasion) is seen at once, as if it had walked there; onto a hiding place it stays hidden. | One shared reading for the engine and the preview. "Blocks" are the defensive negations. |
| D16 | Spatial Swap | 18 m to the Node in sight (like Warp). "On a Node" means within 0.75 m. Ninjas only. A resisted swap still costs. Combat only. | The doc gives no range, so this mirrors Warp. The hydra is too big. |
| D17 | Aura | Plain disadvantage (owner-approved) on every attack roll a foe makes from inside (weapons, kunai, jutsu attack rolls, props and structures); saves are untouched, and two auras are no worse than one. The movement penalty applies literally to "anyone" (allies too) except that Northstar, only on the mover's own turn, each time it comes in from outside (coming into two at once costs half once). "Warp" = Warp Strike, Swap (the Ryusei who moves, not the one swapped), Body Flicker; "dash" = walking after Dash (the walk ends where the halved movement runs out), and melee flash-ins. | The owner wrote "anyone" twice, against "enemies" for the attack rule. Outside one's own turn there is no remaining movement to halve. |
| D18 | Command details | Needs sight. Invalid targets are refused before paying, in this order: the fighting has started, a target, not already under command, not a Sub-boss or Boss, a foe with a rank (so not the party), a ninja (beasts are Submission's), not a Mirai, a Minion (a Captain from level 5); then 9 m and sight. It lasts until the end of the target's next N turns (a turn lost to surprise counts) and ends if the target drops. Enemies whose plan was aimed at a unit that changes sides (taken, or let go) plan again at once, so none strikes its own side and the Eye shows the new plan. AI-driven: it plans afresh each step against its former allies, and can't use the party's items or be handed to a player. Victory, defeat and results use the side a unit belongs to: a commanded enemy is still an enemy. Kagero is a Mirai, so no Captain in the game can be commanded yet (D6). | No enemy Northstar exists. Taking a player's ninja away is a big change for the owner to approve. Flipping teams keeps the AI, targeting and pathing correct. |
| D19 | Level-9 Command | The engine accepts a second target. The screen uses a second click. | No unit is above level 6 today. |
| D20 | Natural Submission | 9 m (like Command). Boss and Sub-boss excluded. Joins for the rest of the battle (the screen says so); it is no longer an enemy for victory, but not a party member for defeat or the result either: it falls with no death saves, and nobody takes its reins or opens the party's backpack for it. Carrying it through the mission is deferred. | No beast or summon units exist. Carry-over needs beast party units in missions. |
| D21 | AI scope | Uses Pursuing Flame, Evasion, the Block (for cover), Warp (to close in: for a blow it means to walk in for, to a Node from which a walk reaches; for a kunai or an advance, only to a Node right beside the target, and it strikes from behind at once) and Command. Does not use the full Wall, Swap or Submission. Reacts by routing around structures and breaking a structure that blocks its melee target. The aura gets no AI change. The Block goes right in front of the Kōton (its centre about 1 m away), never 1.5 m out: there it would also shelter the foe from the Kōton's own kunai and jutsu. Command is worth (1 − the target's WIS save chance) × (its weapon's average + 4) to the AI, so a Northstar with strong jutsu mostly casts those. In practice (AI-only battles on the shipped encounters, 2026-10-20: 200 battles of the cedar rogues and the night raid), enemy Mirai evade often and the raiders leave Nodes and warp now and then (12 warps), but the rogues and Kagero always cast Fireball or Chidori rather than Pursuing Flame (it wins only when the Fireball would catch a friend), and Shiori's jutsu always outweigh Command. These paths are tested but rarely or never come up against today's enemies. | Valid and deterministic, with no stalls. Wall and Swap need tactical judgment, so they are deferred. |
| D22 | Stealth phase | Command, Submission and Swap are combat only. The other abilities are allowed; loud ones start the fight. | Flipping an unaware guard's side mid-stealth has no defined meaning. |
| D23 | "Once a round" | The existing reaction, refreshed at the start of the unit's turn. | Nothing new to track. |

Open questions for the owner:

- D2: apply the clan stat bonuses to the ability scores?
- D5: new camp activities and signature jutsu flavour per clan?
- D6: should the common enemies stay Mirai (immune to Command)?
- D17: should the aura's movement penalty spare the Northstar's allies?
- D18: may an enemy Northstar command the party's ninjas?
- D21: should the AI favour the clan signatures more (Pursuing Flame over a
  bigger jutsu, Command over damage, a Ryusei throwing kunai to plant Nodes
  before it closes in), so the player sees them used against the party?

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
