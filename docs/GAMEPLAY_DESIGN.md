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
  in the rules: it will decide which elemental jutsu the ninja can learn
  (backlog 4c, not built yet). There is no other nature picker.
- **The colour is only a look.** Any type takes any colour (its natural one,
  another chakra colour or any hex): green fire is still Fire, black or blue
  lightning is still Lightning. The colour never changes the nature.

**As built, proposed and waiting for the owner's approval** (the builder's
choices, not his decisions; see Open questions):

- **The types are the bursts.** Each burst belongs to one type. Fire (the
  flames) and Lightning (the electric burst) are his words; the rest of the
  table is proposed:

| Type | Burst(s) | Natural colour | State |
|---|---|---|---|
| Fire (Fuego) | Pyre Crown (flames), Cinder Nova (embers and a fiery shockwave) | red, orange | Pyre Crown: his rule. Cinder Nova as a second Fire burst: proposed |
| Water (Agua) | Rising Tide | blue | Proposed |
| Wind (Viento) | Leafwind Spiral | green | Proposed |
| Lightning (Rayo) | Storm Lash; Living Sparks (no aura and no glow, only small jagged bolts now and then on the hair, shoulders, arms and round the legs) | yellow, cyan | Storm Lash: his rule. A second burst: his request (2026-10-21); Living Sparks is **new art**, its name provisional |
| Earth (Tierra) | Shattered Earth (the ground cracks, stone spikes, rocks tear loose and float up) | brown | **New art**, proposed |
| Shadow (Sombra), no element | Nightveil Mist | indigo | Proposed |
| Spirit (Espíritu), no element | Spectral Guardian | violet | Proposed |
| Light (Luz), no element | Heaven Pillar | white | Proposed |
| Void (Vacío), no element | Abyss Orbit | black | Proposed |

- **Earth** had no burst, so one was drawn for it (Shattered Earth, with an
  Earth emblem, orb and word for the grimoire casts). It is new art and waits
  for his approval; without it Earth can't be picked.
- **Lightning's second burst** (the owner, 2026-10-21: *"hazle una segunda
  aura a electricidad [...] sin el aura solo los rayos ocacionales"*, and by
  aura he means the ki burst round the body: *"sin eso"*). Living Sparks (id
  `cyan`, natural colour the cyan and white of his lightning set): no rim, no
  halo and nothing rising round the body in any mode, only small, sharp,
  jagged bolts that crackle for one to three frames on the hair, the
  shoulders, the arms or round the legs, with a pinpoint flicker where one
  strikes. Its loop is 10 s (the other bursts loop every 2 s), so the bolts
  don't come back in the same places. Rare while empowered, frequent in a
  charge, loose bolts off the casting arm and palm in a cast (never over the
  face, and behind the body when that arm is), a burst of bolts all over the
  body once at the start of a victory. It takes any colour (black: a black
  bolt in a thin bright edge) and reuses Lightning's grimoire emblem, orb and
  word. Its cyan is not added to the colour swatches (it sat beside the water
  blue). Lightning offers both bursts in the creator, like Fire. Names
  proposed for him to choose: *Chispas vivas* / Living Sparks (used for now),
  *Relámpago latente* / Latent Lightning, *Estática salvaje* / Wild Static. New
  art: waits for his approval.
- **The four types without an element** (Shadow, Spirit, Light, Void) are kept
  because their bursts were approved as bursts; whether they stay as natures,
  and what they may learn, is his call. No jutsu has their nature.
- **The legends' types follow their jutsu**, in the colour they always had:
  Kaien and Ren Lightning (violet, blue), Hiro Wind (orange), Raiga Fire
  (violet); of the companions, Hana Water (green) and Kenji Earth (violet).
  Solen, Akira, Aiden and Shiori already matched. Proposed: Kaien, Raiga and
  Kenji lose the ghost-warrior burst.
- **Legends and companions saved before this change keep the burst they were
  saved with**, so a saved copy of Kaien reads Spirit, Ren Water, Hiro Fire
  (embers), Raiga Spirit, and Hana and Kenji inside a mission under way Wind and
  Spirit, against their own jutsu and the new presets. Saves were not touched:
  moving those copies to the new burst is a save change and needs his decision
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

- Chakra types ("Chakra type" above): approve or change the burst-to-type
  table (is Cinder Nova a second Fire burst?), and approve or redo the Earth
  burst (Shattered Earth), drawn because Earth had none.
- Lightning's second burst (Living Sparks, his request of 2026-10-21): approve
  or redo the art, and choose its name (*Chispas vivas*, *Relámpago latente*
  or *Estática salvaje*, or his own).
- Chakra types without an element (Shadow, Spirit, Light, Void): keep them as
  natures or not, and which jutsu may they learn once the nature gates the
  jutsu (all non-elemental ones only? Shadow as Genjutsu, Spirit or Light as
  pure chakra?).
- The legends' new types (Kaien, Ren, Hiro, Raiga, Hana, Kenji follow their
  jutsu): approve or keep their old bursts.
- Legends and companions saved before the change keep their old burst (a saved
  Kaien reads Spirit, Ren Water, Hiro Fire, Raiga Spirit; Hana and Kenji in a
  mission under way Wind and Spirit). Once the nature gates the jutsu they would
  lose their own jutsu. Move saved copies with a legend's id to the legend's new
  type on load (a save change), or leave them as saved?
- Legends with a jutsu of a second element (Kaien's Fireball, Raiga's Earth
  Wall): allowed as legends, or changed, once the nature gates the jutsu?

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
