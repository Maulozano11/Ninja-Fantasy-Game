# Gameplay design: tactical battles

Agreed with the owner on 2026-10-13. This is the source of truth for the battle
system; change it here first when a decision changes.

Inspiration: the look and feel of *A King's Tale: Final Fantasy XV*, with the
turns and d20 dice of *Baldur's Gate*, plus stealth, elevation and natural
elements.

## Look and camera

- **Side-view 2.5D**: a wide stage seen from the side, with depth. Characters
  face left or right (sprites are mirrored). Elevation is shown as terraces and
  platforms whose cliff faces turn toward the camera.
- **Real proportions**: 1 m = 57 px across (a character is about 1.75 m =
  100 px), so barrels, tents, lanterns and trees have their real size.
- **Steep camera with lots of depth** (more than *A King's Tale*): 1 m of depth
  is 38 px on screen, so the ground fills most of the screen and there is room
  to flank, hide and spread out.
- **Big maps**: the first map is 60 m wide and 20 m deep. Two zoom levels: the
  normal view (2×) follows the active character and pans to targets and
  effects; the tactical view (1×) shows half the map at once. A minimap shows
  the whole map, the units and the camera.
- **No visible grid.** Movement is free and measured in meters, like
  *Baldur's Gate 3*. While a turn is planned, the reachable ground is softly
  highlighted and the path shows its cost.

## Turns and dice

- **Individual initiative**: d20 + DEX; allies and enemies take turns in that
  order.
- **Each turn**: Action, Bonus Action, Movement and Reaction (D&D 5e). Hiding,
  shoving, jumping and climbing are actions too.
- **Basic actions** (besides attacks and jutsu): Dash (double movement),
  Disengage (move without opportunity attacks), Dodge (attacks against you have
  disadvantage until your next turn), Shove (knock prone or push 1.5 m, for
  example off a ledge or into the river), Hide, Focus chakra, items (soldier
  pill, bandage, antidote).
- **Kunai and shuriken for everyone**: besides their weapon, any ninja can throw
  (1d4, up to 9 m).
- **Hands for seals**: ninjutsu and genjutsu are woven with hand seals and need
  both hands free (the sprite stows the blade at the belt or on the back while
  casting). Drawing or stowing the weapon is free once a turn; a second time
  takes the Bonus Action. With the weapon stowed, blows are struck with the
  fists (opportunity attacks too); with it drawn, Kawarimi can't be cast.
  Taijutsu and sword arts need no seals. The feat **One-Handed Seals** lets a
  ninja cast with a one-handed weapon drawn (two-handed weapons must still be
  stowed). Palm techniques (gentle fist, lightning and spiral palms) keep the
  hands free.
- **Movement can't be undone** once made.
- **Reactions** (opportunity attacks and reaction jutsu) always ask the player
  who controls the character; AI characters decide by themselves.
- **Kawarimi** (Body Replacement) is a reaction: when a hit lands, pay its
  chakra and your reaction, the blow strikes a log and you reappear a few meters
  away.
- **Dice**: every roll shows as a quick d20 over the acting character, with a
  button to speed it up. The big dice window is kept for criticals and
  important checks. Checks and attacks show their % before rolling.
- **Chakra in battle** does not come back by itself:
  - **Focus chakra** (action): recover 1d6 + casting modifier; attacks against
    you have advantage until your next turn.
  - **Soldier pill** (bonus action): +2d6 chakra; after the battle it leaves
    Crash (−2 to all rolls until the next camp). More than one pill between two
    camps gives +1 Exhaustion per extra pill.
- **Surprised** (5e 2014 rule, on purpose): a surprised character can't act or
  react on its first turn. A character with Watchful can never be surprised.
- **Status effects** have a duration: rounds, battles, the zone, until the next
  camp, until treated, the mission, or permanent. The catalog is in
  `MISSION_DESIGN.md`; durations tick at the start and end of each turn and at
  the end of each battle.
- HP, chakra and effects carry over from battle to battle during a mission (see
  `MISSION_DESIGN.md`).

## Elevation (at most 3 levels)

- +2 to hit from higher ground, −2 from lower ground.
- Ranged attacks reach further from high ground.
- Falling deals damage; enemies can be shoved off ledges.
- Climbing: ramps, stairs and vines, plus ninja jumps and wall runs paid with
  movement or chakra.

## Cover

- Half cover (+2 AC) and three-quarters cover (+5 AC), judged from the
  attacker's line of sight.
- What gives cover:
  - **Half:** big tree trunks, stumps, fallen logs, bushes, barrels, crates,
    rocks, fences and stone lanterns.
  - **Three-quarters:** boulders, stacked crates and tents.
  - Each world sprite's manifest lists its cover in its tags.
- Cover can be destroyed: trees burn, earth walls break.
- Crouching behind cover helps you hide; it costs a Bonus Action.

## Stealth

- Battles open with a **stealth phase played by turns** (like *XCOM*): the
  player moves each ninja in short turns, then every enemy walks its patrol.
  Each enemy shows only its **vision cone** (not its route). A ninja inside a
  cone with line of sight raises that enemy's **suspicion** (faster when close,
  slower when crouched or hidden); when it fills, the enemy raises the alarm,
  initiative is rolled and the turns begin.
- Some battles start **without a stealth phase**: a night ambush at camp, an
  alarm bell, or a trap set off from afar with a kunai (the zone is alerted).
- Bushes, tall grass, smoke and shadow let a character hide: a Stealth roll
  against the enemies' passive Perception.
- Attacking from hiding gives advantage and extra surprise damage.
- **Silent takedowns**: an enemy nobody else can see can be attacked from
  hiding. If it drops from that attack, nobody notices; if it survives, it
  shouts and the battle begins.
- **Bodies**: a guard who sees a body raises the alarm. Bodies can be dragged
  into a bush or tall grass, spending movement.
- **Throwing a stone** makes a noise at a point; guards who hear it turn and go
  to look.
- **Running is noisy**: animals near a running ninja flee (birds take off, the
  deer bolts), and that raises the suspicion of the guards nearby. Moving
  slowly doesn't startle them. In battle, animals flee from the noise.

## Water and elements

- **Shallow water** doubles the movement cost, puts out fire and conducts
  lightning. **Deep water** is swum at half speed, or walked on for 2 chakra a
  turn.
- Interactions:
  - fire burns grass and trees and spreads with the wind;
  - lightning on water electrocutes the whole area;
  - earth raises walls and cover;
  - wind pushes, fans or snuffs out fire and clears smoke;
  - smoke and fog block sight (good for stealth);
  - water plus cold makes slippery ice.
- Weather stays (rain, drought, sandstorm) and **night** is added: advantage
  on stealth and shorter sight.

## Abilities and attacks

- **Areas of effect**: circle (radius), cone (60–90°) and straight line. They
  hit allies too and are stopped by walls. While aiming, a preview shows who is
  hit and the chance to hit.
- **Melee**: move next to the target and attack. Leaving an enemy's reach
  provokes an opportunity attack; flanking gives advantage; characters can
  shove and knock prone. A ninja may walk through an ally's spot or a fallen
  unit's, but never stops on one: such spots are crossed in one hop, and an
  opportunity attack for leaving reach on the way is made before the hop,
  where the mover can stand (2026-10-20).
- **Enhanced jutsu**: when casting, the player can pay extra chakra for the
  jutsu's enhanced version. It does more damage (one more die; two for rank S)
  and reaches further: circles grow by half (Kirin), cones reach a quarter
  further and open a third wider (the Great Fire Annihilation), lines reach a
  quarter further and run half as wide again, and walls are half as long again.
- **Ultimate (rank S) jutsu** have no use limit: only their chakra cost.
- **Mercy**: a character who drops an enemy to 0 HP with a melee attack can
  knock it out instead of killing it (it matters later for the story:
  interrogate, spare or hand over).
- **Animated attacks**: the attacker runs in and strikes, with damage numbers,
  screen shake and the jutsu effects from the sprite system. Some jutsu have a
  signature effect of their own, with a clearly bigger enhanced version (the
  Great Fireball, the Great Fire Annihilation).
- **Art bar for ultimate (rank S) jutsu**: every rank S jutsu gets a signature
  effect at the standard of the owner's reference
  (`docs/reference/s-tier-jutsu-standard.jpg`, the enhanced Great Fire
  Annihilation):
  - massive on screen next to the 1.75 m caster;
  - layered in depth, with parts passing in front of and behind each other;
  - a creature or form woven through the element (the fire dragon);
  - a giant kanji of the element written in that element (火 for fire, 雷 for
    lightning);
  - huge billowing smoke, cloud or dust volumes;
  - a full colour ramp with tinted outlines.
  It plays in phases (build-up, strike or loop, fade) and ends clean. Kirin
  (lightning) is a dragon-headed thunderbolt in blue and purple falling from a
  storm cloud onto the target.

## Clan abilities in battle

The clans and their abilities are designed in `CLANS_DESIGN.md`, the source of
truth for them: the four clans (Mirai, Kōton, Ryusei, Northstar), the counters
between them, their Paths, and the rulings phase 1 is built with. Phase 1 (each
clan's base abilities) is in the game; the Paths come later.

Decided with the owner on 2026-10-20 (the details are rulings D2, D6, D15, D17,
D21 and D24 there):

- **Clan ability bonuses count** (+2/+1 per clan) in every number: checks,
  saves, initiative, attacks, AC, jutsu DC, HP and chakra. The sheet keeps the
  base scores; the creator shows each one as base + clan bonus, and older
  saves and imported sheets get the bonus counted once when they load.
- **Enemy clans are mixed**: every fight against ninjas brings two or more
  clans, and a mission's road brings all four, so the party meets each clan's
  abilities and counters. Each encounter fixes the clan of each enemy.
- **The enemy AI uses the clan abilities more** (built 2026-10-20): an
  enemy's clan move takes the place of a jutsu that would hit just one foe. A
  Mirai opens with Pursuing Flame and casts it every other jutsu after; a
  Ryusei opens with a kunai that leaves a Node at its target, then warps in
  and strikes from behind; it swaps places only when that clearly helps (a
  hurt friend out of a foe's reach, a foe pulled in among its friends); a
  Kōton raises blocks for cover and its wall to shelter itself or a hurt
  friend, or rather than dash on in the open; a Northstar commands a valid
  target when it has one (the party gives it none until D18 is answered).
  Allies on the AI just play their best move. Measurements in D21.
- **The Northstar's aura slows only its foes**; its allies are spared. The
  first time an enemy Northstar stands in a fight, a tip explains its violet
  ring to the player.
- **What the screen shows** (2026-10-20): an enemy's card shows its clan,
  class and rank on its turn. The Eye of Tomorrow's marks stay steady through
  the animations; an enemy that has begun its turn shows no plan until it
  plans again. Close enemies' marks don't stack, each walk ends in an
  arrowhead, and the enemy under the cursor has its plan drawn bright while
  the others dim.
- **Warp Strike** to a Node someone stands on lands 1 to 1.5 m from them,
  never on top of them.

## Party, missions and defeat

- A party of up to 4. Each ally is played by a person or by the AI, depending
  on how many players are in the session. In solo play the player controls all
  four and can switch any ally to the AI, with a general order: **Aggressive**
  (goes for the weakest enemy), **Defensive** (protects the party and seeks
  cover) or **Support** (heals and helps).
- Usually 3–6 enemies; missions can use more or fewer.
- Objectives: defeat everyone, stealth assassination, escape, protect someone,
  survive N turns.
- At 0 HP a character is **downed** and makes death saving throws; allies can
  revive them. Back on their feet they carry **Fall aftermath** (−2 AC, death
  saves with disadvantage) until the mission ends; dropped by a critical hit,
  also a **Grave wound** (−10 % max HP).
- **Tension** (stress, 0–10): +1 for taking a critical hit or an ally falling,
  −1 for a critical of one's own or a victory. At 10, a WIS save: Breakdown or
  Awakening. Details in `MISSION_DESIGN.md`.
- **Death:** only in Legend mode is it permanent; if the whole party dies in
  Legend, the campaign is over.
- **Fleeing**: if every ninja still standing leaves by a map edge, the battle
  ends in a retreat: the party loses that road node (or the mission, if it was
  the objective) and the fallen are rescued.
- **Story difficulty**: enemies have 25 % less HP and deal 25 % less damage.
  In Story and Normal a lost battle repeats and nobody dies.

## Bosses

- **The Hydra** (boss of the first mission), designed from the owner's
  reference: seven heads, each a separate target with its own HP and attack
  (bite, venom spit, roar). A head at 0 HP is cut off; then its stump must be
  burned (fire), electrified (lightning) or blown up (explosive tag or barrel),
  or the head grows back after 2 of the hydra's turns. Cutting a head with fire
  is not enough: the stump needs its own hit. The hydra dies when every head is
  cut at once or its body falls.

## Controls

- Mouse and touch. Computer and tablet first; a layout for small phone screens
  comes later.

## Title screen and character creator (approved 2026-10-20)

- **No web navigation.** The game opens on its title screen: the owner's
  burning forest (his creator mockup, `docs/reference/creator-scene-owner-reference.jpg`,
  built into an animated scene by `tools/scenes/creator_forest.py`: his flames
  lick in a loop of 16 frames, embers rise, smoke drifts behind the trunks).
  Menu: **Start game** (continues the mission under way, or the saved ninja),
  **New game** (the creator; once the new ninja is finished it replaces the
  mission under way, after a warning), **Load game** (the mission under way,
  the ninjas made on this device, importing a sheet as JSON) and **Practice**
  (practice battles, arena, campaign arcs). Every other screen has a Main menu
  button; the battle menu offers it too.
- **The creator is laid out like Baldur's Gate 3's**: the ninja stands big in
  the forest's clearing; the steps run across the top (Origin, Clan, Class,
  Appearance, Abilities, Jutsu); the choices are listed on the left (a clan's
  eyes open under it, as a race's subraces do; a jutsu slot opens its options
  under it); the details sit on parchment on the right and follow the
  pointer; the name plate, the poses and Back / Next / Accept are at the
  bottom. Accept saves the ninja on the device and goes into the game.
- The panels are the owner's iron, bronze and parchment look (his mockup);
  his own banner, card and rune-bar art from the mockup is the next step.

## Chakra type: the elemental nature (decided 2026-10-21)

The owner: *"lo de la naturaleza elemental significa el tipo de chakra que
eligen los jugadores [...] si es chakra tipo fuego no importa el color que
eligan es naturaleza fuego si eligen el electrico entonces son naturaleza
rayo"*.

**Decided by the owner:**

- **One choice.** In Appearance > Chakra the player picks the **chakra type**
  (Fuego, Agua, Viento, Rayo...). That type is the ninja's **elemental nature**
  in the rules: it decides which elemental jutsu the ninja can learn ("The
  nature decides the elemental jutsu" below). There is no other nature picker.
- **The colour is only a look.** Any type takes any colour (its natural one,
  another chakra colour or any hex): green fire is still Fire, black or blue
  lightning is still Lightning. The colour never changes the nature.

**His answers to the four questions** (2026-10-21, later): *"1 si 2 actualiza
3 sombra se quedara pendiente y espiritu tambien quitalos de la seleccion y luz
y vacio hay que hacerles justsus pero dejalo pendiente porque van a ser jutsus
de tipo deidad angel y dios y el de vacio sombra y espiritu va ser demoniaco
4 si"*. All four are built (where the builder had to choose how, it says so):

1. **The legends keep their new types** ("si"), each in the colour it always
   had: Kaien and Ren Lightning (violet, blue), Hiro Wind (orange), Raiga Fire
   (violet); of the companions, Hana Water (green) and Kenji Earth (violet).
   Kaien, Raiga and Kenji lose the ghost-warrior burst. Solen, Akira, Aiden and
   Shiori already matched.
2. **Saved copies are updated** ("actualiza"). A copy of a legend or companion
   (the hero, the roster, the party and the fallen of a mission under way, an
   import; matched by its id) that still has the burst it had before (Kaien,
   Raiga and Kenji the violet Spectral Guardian, Ren the blue Rising Tide, Hiro
   the orange Cinder Nova, Hana the green Leafwind Spiral) loads with the
   legend's burst of today, in the colour it showed (its own colour, else the
   old burst's natural one). Nothing else changes. A copy whose player picked
   another burst keeps it.
   *As built (the builder's choice, for his approval):* only a copy that still
   carries the legend's own jutsu is moved, that is, its Element and S-rank
   jutsu fit the legend's type of today better than the old burst's type. The
   id and the burst alone can't tell an old copy from a player's own choice:
   picking a legend keeps its id, and Ren as Water or Hiro with Cinder Nova are
   choices a player can make today. Those copies had their jutsu fitted to the
   type by the creator (below), so they are left alone on every load. A moved
   copy no longer has the old burst, so the move happens once. Two cases this
   rule decides: a copy saved in the hours between the chakra-type change and
   this one (a legend turned to its old type before the creator fitted the
   jutsu) is moved, once; an old copy whose player had already changed its
   jutsu so they fit the old type keeps the old type.
3. **Shadow and Spirit are pending** ("se quedara pendiente... quitalos de la
   seleccion"): the creator and the random ninja no longer offer them. Their
   art stays in the game: a ninja that already has one keeps it, draws it and
   reads it as its nature; the creator shows its tile marked "Pendiente" and
   lets the player pick another type. **Light and Void stay**; their own jutsu
   are pending ("dejalo pendiente"): **Light** will get **deity, angel and god**
   jutsu (*"deidad angel y dios"*); **Void**, and later **Shadow and Spirit**,
   **demonic** ones (*"demoniaco"*). Until then they learn no elemental jutsu;
   the creator says so ("Sus jutsus llegarán más adelante"). (That they learn
   no elemental jutsu meanwhile is the builder's reading, for his approval.)
4. **Cinder Nova stays as a second Fire burst** ("si").

The types and their bursts. Which burst stands for which type was proposed
by the builder; his answers settle the rows marked so, the rest is still
**proposed** (Open questions):

| Type | Burst(s) | Natural colour | State |
|---|---|---|---|
| Fire (Fuego) | Pyre Crown (flames), Cinder Nova (embers and a fiery shockwave) | red, orange | His rule; Cinder Nova as a second burst: his answer 4 |
| Water (Agua) | Rising Tide | blue | Proposed (Hana is Water: his answer 1, on this table) |
| Wind (Viento) | Leafwind Spiral | green | Proposed (Hiro is Wind: his answer 1, on this table) |
| Lightning (Rayo) | Storm Lash | yellow | His rule |
| Earth (Tierra) | Shattered Earth (the ground cracks, stone spikes, rocks tear loose and float up) | brown | Kenji Earth: his answer 1. The burst art is **approved** (2026-10-21: "me gusta tierra quebrada") |
| Shadow (Sombra), no element | Nightveil Mist | indigo | **Pending** (answer 3): not offered; jutsu later, demonic |
| Spirit (Espíritu), no element | Spectral Guardian | violet | **Pending** (answer 3): not offered; jutsu later, demonic |
| Light (Luz), no element | Heaven Pillar | white | The type stays (answer 3), its jutsu later: deity, angel and god. The burst: proposed |
| Void (Vacío), no element | Abyss Orbit | black | The type stays (answer 3), its jutsu later: demonic. The burst: proposed |

**The nature decides the elemental jutsu.** That the nature decides which
elemental jutsu a ninja can learn is the owner's ("One choice" above). The
backlog item it comes from reads "Elemental nature decides the elemental jutsu
available; a new ninja starts with low-rank ones only": that is a paraphrase
of his request, not his words. How the gate works is **as built, proposed and
waiting for the owner's approval** (the builder's choices, not his decisions;
each is in Open questions). In the creator's Jutsu step:

- **Gated:** a jutsu of one of the five elements (Fire, Water, Wind,
  Lightning, Earth) in the **Element I, Element II and S-rank** slots is
  offered only to a ninja of that element.
- **Not gated:** the jutsu with no element in those slots (taijutsu,
  kenjutsu, genjutsu); everything in the **Utility** slot (including the
  explosive tag, a Fire tool, and the mystical palm, Water healing); the **clan
  secret**, whatever its element (it comes with the clan).
- **Light and Void** (and a ninja that still has Shadow or Spirit) are offered
  no elemental jutsu: only the ones with no element, until their own exist.
- **Changing the type** swaps each chosen jutsu of another element for one of
  the new type: its own element first, the lowest rank first, never the one
  the other Element slot holds; if the type has none left, one with no
  element. A note under the type tiles and at the top of the Jutsu step lists
  the swaps ("Ahora Rayo: se cambiaron los jutsus de otro elemento. Bola de
  fuego → Sabueso del rayo; Gran aniquilación → Kirin."); a slot the player
  picks again drops out of it, and on a short screen the note sticks to the
  bottom of the panel so it is seen right after the click. (Swapping, not just
  marking, keeps a player from keeping another element's jutsu by changing
  type afterwards, and it is what tells a player's own type from an old copy
  of a legend, answer 2.)
- **A sheet keeps what it has:** a legend's jutsu of a second element (Kaien's
  Fireball, Raiga's Earth Wall), an older sheet or an imported one keep their
  jutsu; the Jutsu step marks such a jutsu "no es de tu naturaleza", and it
  stays until the player changes that slot or the type. Saves are not changed.
- **The random ninja** picks jutsu of its own nature (Element I and the S-rank
  of its element when there is one) and its clan's secret.
- **Enemies and battles** are not touched: the gate is the creator's.
- **Not built yet:** "a new ninja starts with low-rank ones only". No rank cap
  is written down, and the creator's S-rank slot is part of the approved
  layout, so which ranks a new ninja may take is a question for the owner
  (Open questions).

**In the code** there is one source: the look's burst
(`appearance.chakra.color`, an id named after the colour the bursts were first
picked by) gives the nature through `BURST_NATURE`
(`src/sprite/chakraNature.ts`); the rules read it with `natureOf(character)`
(`src/rules/ninja.ts`). The colour is `appearance.chakra.tint`. A burst id the
game does not know is drawn, cast and described as Rising Tide and reads as
Water. A sheet older than the sprite look draws its burst from its old aura
colour (`palette.chakraAuraColor`); the creator's clan change no longer writes
that colour, so such a ninja's type only changes when the player picks one.
Pending types are marked `pending` in `CHAKRA_TYPES`; `OFFERED_TYPES` is what
the creator and the random ninja offer. The saved copies are moved by
`updateLegendChakra` (in `migrateCharacter`, so `loadHero`, `loadRoster`, the
mission load and imports all do it), from `LEGEND_BURST_CHANGE` (old and new
burst per id; a test keeps it equal to the presets). The jutsu gate is
`src/rules/jutsuNature.ts` (`jutsuChoices`, `fitLoadout`, `offNatureJutsus`).

## Language, sound and tips

- Battle, missions, camp, the title screen and the character creator in
  **Spanish and English** with a toggle; the game starts in the browser's
  language and remembers the choice. The older screens (village, campaign
  arcs, arena) follow later.
- **Ability names** (the owner, 2026-10-20): every jutsu is "Técnica de
  <Elemento>: <name>" in Spanish and "<Element> Technique: <name>" in English,
  with the owner's own names after the prefix (*Técnica de Fuego: Bola de
  fuego*, enhanced *Técnica de Fuego: Gran bola de fuego*; *Técnica de Agua:
  Muro de agua*, *Técnica de Tierra: Muro de tierra*, *Técnica de Tierra:
  Balas de tierra*, *Técnica de Rayo: Kirin*). New jutsu follow the rule
  (*Técnica de Chakra: Rasengan*, *Técnica de Veneno: Venom Surge*, *Técnica
  de Agua: Chorro de agua*). The clans' bloodline abilities are not jutsu:
  Warp Strike and Command stay in English, as the owner wrote them.
- **The action bar** (the owner's kit, 2026-10-20): the skill slots show his
  painted icons and no name; hovering a slot (or aiming its jutsu) opens a
  window with the full name, rank, action, chakra and reach, dice, area and
  save, the description, and what the enhanced cast does.
- **Names in Spanish sentences**: a generic enemy name takes its article
  ("Turno del Asaltante", "El Renegado 1 golpea a Akira", "la Sombra"), and a
  participle agrees with the one it is about ("Hana está desprevenida"); the
  party's ninjas and named enemies (Kagero) never take an article.
- **Sound**: forest ambience (river, birds, crickets at night), footsteps, the
  guard's alert, hits and jutsu, generated in the game (no audio files).
- **Tips**: short tutorial tips the first time each thing appears (moving,
  cover, stealth, the %…), which can be turned off.

## Multiplayer

Three ways to play, decided on 2026-10-13:

- **Solo**: one player controls every playable character in the party.
- **Local, passing control**: several people share one device. When a
  character's turn comes, the screen asks for its owner ("Turn of Saber:
  pass the device to Player 2"). Secret choices (camp activities, votes) are
  made one person at a time behind a cover screen.
- **Online**: each player on their own device.

Every character has a controller: the local player, another local player,
a remote player or the AI. The battle engine only sees actions, so all three
modes share the same rules and the same code; a party can also mix them (two
friends online plus AI allies).

- **The server decides.** Players send only what they want to do ("move
  here", "cast this jutsu at that point"). The server checks it against the
  rules, rolls the dice (so nobody can cheat) and sends everyone the events
  that happened; each screen animates them.
- **Turn-based**, so a fraction of a second of lag does not matter and there is
  no real-time sync.
- **Now: an online-ready battle engine.** The rules live in plain TypeScript,
  apart from the UI, and the same code runs on the server and in the client
  (the client uses it to preview reach and hit chances). Everything is an
  action or an event, the dice use a seed, and the whole battle state can be
  saved and sent. The current `TacticalCombat.tsx` mixes rules and screen and
  gets rebuilt this way for the new maps.
- **Phase 2: the network.** Rooms with an invite code over WebSockets (Cloud
  Run or Firebase/Supabase), accounts and a database for characters,
  inventory and campaign progress. If a player drops, the AI plays their
  character until they come back. Group decisions use a vote or a leader.
- Until then, battles are played locally with AI allies, so the design can be
  tested quickly.

## First map

- A forest with a river, a bridge, hills, bushes and a clearing.
- The bridge is a world sprite (`tools/world-sprites/bridge.ts`, approved): a
  plank deck with rope-lashed rails, drawn in two parts so ninjas walk between
  the back rail and the front one. Other maps will have more elaborate bridges.

## Mockups

First map (forest, river, bridge, hill camp), approved as the visual direction
when the owner signs it off:

- `mockups/battle-stealth.png`: stealth phase (party hidden in bushes, vision
  cones, suspicion meter, interactable tags).
- `mockups/battle-combat.png`: a combat turn (initiative bar, reachable area
  without a grid, path in meters, cone preview with hit chances and cover,
  last roll, action bar, ability tooltip).

Second round, at real scale with the steep camera and the generated world
sprites (60 × 20 m map):

- `mockups/battle-map-panorama.png`: the whole map at 1×: the forest edge with
  a shrine, the clearing, the river with its bridge and stepping stones, the
  hill camp (level 2) and the lookout (level 3).
- `mockups/battle-map-tactical.png`: the tactical view (1×, half the map) with
  the compact HUD: active unit card, initiative, minimap with the camera
  frame, zoom toggle, party frames with who controls each ally, action bar
  with hotkeys and chakra costs, the ability tooltip above its button, last
  roll.
- `mockups/battle-map-close.png`: the same moment in the normal view (2×).

Art direction from the owner: high-quality painted backgrounds behind the
battlefield; everything destructible or interactable (trees, bushes, rocks,
barrels, crates, campfire, tent, lanterns, signposts, fences) is a 16-bit
sprite, plus ambient life (birds, butterflies, fireflies, smoke, lily pads).

World sprites (trees, plants, camp props, landmarks, animals) are generated
at real scale by `tools/world-sprites/` into `src/assets/world/<group>/`, one
sheet per object plus a manifest with frame size, anchor, animations and
gameplay tags.

## Art waiting for approval

The owner approves new art before it goes into the game: the hydra, the
movement poses (walk, run, crouch, sneak, downed), the camp props rebuilt in
the landmarks style, the missing animals (butterflies, dragonfly, frog,
koi, fireflies) and the jutsu effects. Generators write them to a staging
folder (`WORLD_OUT`) until then. Approved so far: the river bridge.

## Open questions

  It was drawn because Earth had none; Kenji is Earth (his answer 1), but the
  art itself waits for his yes.
- The burst-to-type table ("Chakra type" above): approve or change the rows
  that are still proposed: Water = Rising Tide, Wind = Leafwind Spiral, and the
  bursts of Light (Heaven Pillar) and Void (Abyss Orbit). His answers settled
  the legends' types, Cinder Nova and which types stay, not these rows.
- Saved copies of the legends (his answer 2, "actualiza"): as built, a copy is
  moved only while it carries the legend's own jutsu, so that a player who
  picks the old type today (Ren as Water, Hiro with Cinder Nova) keeps it.
  Confirm. A copy saved in the few hours between the two changes with a legend
  turned to its old type is moved once; an old copy whose jutsu the player had
  already changed to fit the old type keeps the old type.
- The jutsu gate as built ("The nature decides the elemental jutsu" above),
  each the builder's choice:
  - the **S-rank** slot is gated like the Element slots;
  - the **Utility** slot is not gated, so the explosive tag (Fire) and the
    mystical palm (Water) are open to every nature;
  - the **clan secret** is not gated (it comes with the clan, whatever its
    element);
  - **changing the type swaps** the jutsu of another element for ones of the
    new type, lowest rank first, and says which (instead of only marking
    them);
  - **Light and Void** (and a ninja still on Shadow or Spirit) learn only the
    jutsu with no element until their own exist;
  - **the random ninja** takes Element I and the S-rank from its own element
    when there is one, and its clan's secret.
- "A new ninja starts with low-rank ones only": which ranks may a new ninja
  take (D and C? up to B?), and what happens to the creator's S-rank slot, the
  A-rank picks (Chidori, Temple of Nirvana) and the clan secrets (all A)? Not
  built: today the nature gates the element, not the rank.
- Legends with a jutsu of a second element (Kaien's Fireball, Raiga's Earth
  Wall): kept as they are (a legend is a preset, not a creator pick; the Jutsu
  step marks the jutsu "no es de tu naturaleza"). Keep, or change them?
- Gaps the gate shows: Water has no S-rank jutsu (a Water ninja's S-rank slot
  offers only Yasaka no Magatama and Night Guy); Wind has one Element jutsu
  (Great Breakthrough Blade), so its second Element slot takes a jutsu with no
  element (two once the rank D and C jutsu go in: Whirl joins it).
- The jutsu of Light (deity, angel and god) and of Void, Shadow and Spirit
  (demonic): to design when he says.

## Three new jutsu (agreed 2026-10-20)

Made for the owner's skill icons. Their effects come from the approved
element sets, and each one carries his icon in the hotbar. They are learnt
in the creator like any jutsu of their nature. Ranges convert at
1 square = 1.5 m.

| jutsu | nature, rank | use | effect | enhanced (+2 chakra) |
|---|---|---|---|---|
| **Rasengan** | Chakra, B | action, 4 chakra, touch (1.5 m) | 4d8 force; DEX save for half; on a failed save the target is pushed 1 square (1.5 m) | Great Rasengan: 6d8, pushes 3 squares and knocks prone |
| **Venom Surge** | Poison, B | action, 4 chakra, line of 7 squares (10.5 m) | 3d6 poison; CON save for half and no poison; on a failed save, Poisoned for 2 rounds | 5d6, Poisoned for 3 rounds |
| **Water Stream** (*Chorro de agua*) | Water, C | action, 3 chakra, line of 6 squares (9 m) | 3d6 bludgeoning; STR save for half; on a failed save the target is pushed 2 squares (3 m), into the river or off a ledge if that is where it goes; puts out burning ground and burning units it touches | 5d6, pushes 4 squares and knocks prone |

Visuals: Rasengan uses the chakra sphere, Venom Surge the poison stream,
Water Stream the water stream.

## Rank D and C jutsu (proposed 2026-10-21; the owner's answer the same day)

Twelve low-rank jutsu for the creator, all drawn with the owner's approved
element sets. The Spanish proposal (with its previews) was shown to him; he
answered (verbatim): *"en 1 , 4 , 6 que son proyectiles separa los proyectiles
y dales 3 trayectorias diferentes para que lleguen al objetivo de diferentes
angulos 5 me gustaria conectar los rayos mejor para que se vea mejor el
abanico, tajo sangrante sea va ser su propio vfx para que salga el corte de
viento pero en blanco como si no tuviera elemento porque se supone que es asi
, embestida haz que guarde el arma y que sea como una takleada y haz todos los
cambios recomendados en todas las demas y enseñamelos"*. Built on the branch
`jutsu/d-c-set` (rules and engine, then the effects), **waiting for his
approval of the in-game captures**: nothing is merged before he says yes.

Ranges convert at 1 square = 1.5 m. D costs 1 chakra, C costs 2 (the Dew is
a D that costs 2, because it gets a fallen friend up from 6 m). Enhancing
adds one die and grows the area (the general rule above).

| jutsu (id) | nature, rank, slot | use | effect | enhanced |
|---|---|---|---|---|
| **Tres brasas** / Three Embers (`fire_three_embers`) | Fire, D, Element | action, 1 chakra, one target at 9 m | jutsu attack roll: 2d6 fire; like all fire it burns the bushes and sets off barrels and tags within 1 m of the target, even on a miss | +1 chakra: 3d6 |
| **Remolino** / Whirl (`wind_whirl`) | Wind, D, Element | action, 1 chakra, one target at 9 m | STR save, half on a success: 1d8 bludgeoning; cuts the grass and bushes around the target (no hiding there any more) | +1: 2d8 |
| **Manto de brisa** / Breeze Mantle (`wind_breeze_mantle`) | Wind, D, Utility | bonus action, 1 chakra, on yourself | until the start of your next turn, attacks against you have disadvantage (the Dodge action as a bonus action); no help against jutsu with a save; silent | cannot be enhanced |
| **Calambre** / Jolt (`lightning_jolt`) | Lightning, D, Element | action, 1 chakra, one target at 7.5 m | CON save, nothing on a success; on a failure 1d6 lightning and **Numb** (−2 to DEX rolls: DEX saves, ranged attacks, DEX checks and Stealth); lightning runs through water | +1: 2d6 |
| **Abanico de chispas** / Spark Fan (`lightning_spark_fan`) | Lightning, C, Element | action, 2 chakra, 4.5 m cone | DEX save, half on a success: 2d8 lightning to everyone in the cone, friends too | +2: 3d8, the cone reaches 5.6 m and opens wider |
| **Guijarros** / Pebble Shot (`earth_pebble_shot`) | Earth, D, Element | **bonus action**, 1 chakra, one target at 9 m | jutsu attack roll: 1d6 bludgeoning. Strike first and it still flies (the blade is stowed for free); cast it first and the weapon stays stowed (drawing it again takes the bonus action, already spent) | +1: 2d6 |
| **Corona de púas** / Spike Crown (`earth_spike_crown`) | Earth, C, Element | action, 2 chakra, everyone within 3 m of you | DEX save, half on a success: 2d8 piercing to all within 3 m, friends too, not the caster; a stomp: no seals, the weapon stays in hand | +2: 3d8 within 4.5 m |
| **Rocío sanador** / Healing Dew (`water_healing_dew`) | Water, D, Utility | action, 2 chakra, a friend within 6 m or yourself | heals 1d8, and a fallen friend gets back up; no Medic bonus (as the Mystical Palm); silent; the AI doesn't use it (its healing is the Palm) | +1: 2d8 |
| **Géiser** / Geyser (`water_geyser`) | Water, C, Element | action, 2 chakra, 1.5 m circle at 9 m | STR save, half on a success: 3d6 bludgeoning to everyone in the circle, friends too | +2: 4d6, 2.25 m |
| **Espejismo** / Mirage (`genjutsu_mirage`) | Genjutsu, C, Element | action, 2 chakra, one target at 9 m | WIS save, nothing on a success; on a failure 2d6 psychic and **Confused** for 2 rounds (one turn in four lost); loud | +2: 3d6 |
| **Tajo sangrante** / Bleeding Cut (`kenjutsu_bleeding_cut`) | Kenjutsu, D, Element | action, 1 chakra, melee, leaps in from up to 3 m | the blade is drawn for free; jutsu attack roll struck as a blow: 1d8 slashing and **Bleeding** on a hit (1d4 a turn until bandaged; 1d4 a road leg); loud | +1: 2d8 |
| **Embestida** / Rush (`taijutsu_rush`) | Taijutsu, C, Element | action, 2 chakra, melee, charges up to 6 m | **the weapon is stowed** (free, like for seals) and the ninja **tackles**: a straight run to the target (nothing may stand in the way: a wall, a tree, a structure), no opportunity attacks, no movement spent, then a jutsu attack roll struck as a blow: 2d8 bludgeoning. You end up beside the foe | +2: 3d8 |

Rules that came with them (2026-10-21):
- **A melee jutsu with an attack roll is struck as a blow** (Bleeding Cut,
  Rush): the caster's jutsu attack bonus, but no cover, no disadvantage for a
  foe close by, advantage against a prone target, flanking counts.
- **Sword arts draw the blade** by themselves (free, once a turn; with the
  free draw spent they strike with the fists). This also fixes the Dance of the
  Crescent Moon, which used to strike with the fists after a jutsu stowed the
  blade.
- **The Rush stows the weapon** (free, once a turn; with that spent and the
  weapon in hand, it waits, like a jutsu with seals).
- **The AI plans again after a bonus action**: after Pebble Shot it still
  uses its action; with the action spent, a ninja that knows a damage jutsu
  cast as a bonus action casts it at a foe in reach.
- Enemies only cast what their template gives them; none of the shipped
  enemies has these jutsu yet.

How they look (the owner's answers; the screen reads them from each jutsu's
`seq`, `pose` and `vfxSet` in `src/battle/jutsu.ts`):
- **Three Embers, Jolt, Pebble Shot**: the projectiles fly apart, each one on
  its own path (a high arc, a straight line, a low curve), so they reach the
  target from different angles, a little apart in time, each with its own
  impact. Pebble Shot also raises the earth aura during the cast beat and hits
  with the rock-bullet impact.
- **Spark Fan**: the bolts join from the hand to each one reached, one
  branching fan; a spark on each one hit, 80 ms apart.
- **Bleeding Cut**: its own effect, the wind's crescent cut in white, as a
  sword art has no element (`vfx_neutral`).
- **Rush**: a flash of chakra where the ninja sets off, a run at twice the
  speed and a shoulder tackle (a new pose).
- The others, the proposal's recommended option A: the Breeze Mantle's aura
  stays faint (40 %) around the ninja until its next turn (its own mark,
  `mantle`, so a plain Dodge shows no wind); Spike Crown in the charge pose with
  the earth aura for 0.4 s, then a rock burst on each one reached; Healing Dew
  flies the water orb to the friend and wraps it in the water aura for 0.8 s;
  Geyser rises from the ground with no projectile (a 0.3 s warning splash, a
  light shake); Mirage flies the eye-sphere half again as slow; Whirl as it was.

Open questions of the proposal the owner didn't answer, with the default the
proposal gave (to confirm with him):
1. Which ones go in: all twelve (he asked for all of them to be done).
2. Names: as proposed.
3. Animation: as above (his answers, and option A for the rest).
4. Jolt: **Numb lasts until camp** (the existing effect, data only). A
   two-round Numb (piece P5) is not built.
5. Rush: **6 m** (4.5 m was the other choice).
6. Healing Dew: the Mystical Palm keeps its own look (the water aura on the
   Palm would be a separate yes).
7. Pebble Shot looking more like "earth bullets" than *Balas de tierra*: kept.
8. Mirage and Bleeding Cut: **loud**, like every damage jutsu (a silent one
   with damage, piece P6, is not built).
9. Who learns the Genjutsu, Kenjutsu and Taijutsu ones once the nature decides
   the jutsu: for later; today anyone may (they have no element, so the nature
   doesn't gate them).
Also not built (optional in the proposal): a style of cast per jutsu (P1), and
the Geyser putting out burning units in its circle.
