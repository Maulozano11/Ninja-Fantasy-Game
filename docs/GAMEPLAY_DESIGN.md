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
  - The dice are a real d20 (20 faces, opposite faces sum to 21) in three
    styles the player picks in the main menu (owner's decision): A "Gema" (a
    crystal in the caster's chakra colour, the default), B "Marfil y oro"
    (ivory with gold), C "Obsidiana rúnica" (black glass with glowing
    numbers). The dice only show the roll the engine already made and land on
    that number. Art: `tools/ui/dice-d20.ts` → `src/assets/ui_dice/`.
    The owner (2026-10-21): "me gustan los estilos el por defecto va ser el
    del color del chakra"; the Gema taking the chakra colour: "si"; the
    natural-20 extras of the checks: no changes "por ahora". The critical
    animation is waiting for his second look.
  - How it plays (built on `ui/dice-d20`, the look waiting for his approval):
    the quick die is thrown over whoever rolls (the attacker; the one saving,
    at the target; the one checking) and lands on the engine's exact d20; with
    advantage or disadvantage both dice land and the one not kept dims. A
    readout beside it says "17 + 5 = 22 ✓ CA 14". The action plays when the die
    clicks onto its face; everyone a blast reaches saves at once, and both sides
    of a shove roll together. The saves against a jutsu are thrown while it
    flies, so they land as it hits and the damage shows with the blast. Dice
    thrown together spread out so none covers another or a head, a bar or a
    mark; one moved off its ninja has a thin gold stem down to them, and each
    readout goes on the side where it covers nothing. The battle speed
    (1×/2×/3×) speeds the dice too, and a "Saltar dados" button (or Space) lands
    them at once; a Space or Enter pressed within 0.7 s after the dice only
    skips, so a late press never ends the turn. The big window
    opens for a natural 20 on an attack ("¡CRÍTICO!"), a natural 1 on a save
    ("¡FALLO CRÍTICO!") and a natural 20 on a save, a check or a death save
    ("¡20 NATURAL!"). Sounds: the throw (whoosh, bounces, the click on the face),
    a chime for a 20, a thud and crack for a 1, the critical's sting; they
    follow the game's mute switch. Mission checks (camp) throw the same die
    beside their line in the log.
  - **A natural 20 on an attack roll is an automatic critical hit with maximum
    damage** (owner's decision: "un 20 en dado haria impacto critico
    automatico y el daño maximo y deberiamos ponerle una animacion de extra
    cuando suceda eso"): every damage die counts as its highest face,
    including the extra dice the critical adds (2d6+3 → 4×6+3 = 27; a katana's
    1d8+3 → 8+8+3 = 19), the bonus once. This covers weapon blows, kunai,
    opportunity attacks, the hydra's bite, props and Kōton walls, and any jutsu
    that rolls to hit. A natural 1 on an attack still always misses. The log
    says "¡20 natural! ¡X asesta un crítico a Y!" and "¡Crítico! Daño máximo:
    19 de cortante a Y". The extra animation: the big window with the gold d20
    and the "¡CRÍTICO!" banner; on the blow a short hit-stop, a white-gold bloom
    of light on the target, an impact burst, a camera kick, and the damage in
    big gold digits marked "MÁX", with its own sound sting. (A critical's
    other effects stay: two death-save failures on a downed ninja, Tension,
    Grave wounds, Legend's massive damage.)
  - **Saving throws** (owner's rule, his answer "a3, b3"): **a natural 20
    resists completely**: automatic success, no damage at all (not even the
    half a save usually leaves) and none of the jutsu's effect on that target.
    **A natural 1 fails and takes it as a critical**: automatic failure,
    maximum damage exactly like an attack's critical (every damage die at its
    highest, doubled; a Fireball's 4d6 → 48) and the full effect; it plays the
    same critical animation at the target ("¡FALLO CRÍTICO!", "MÁX"). This is
    how jutsu get their critical moment, since every damaging jutsu uses a
    save. It also covers explosions (tags, barrels, traps) and electrified
    water (half of the maximum). A save with no damage (Spatial Swap, Command,
    Natural Submission) just succeeds or fails on the natural. The Tension
    save at 10 Tension follows the automatic success and failure too.
  - **Ability checks** (owner's rule, his answer "c3"): a natural 20 is an
    automatic success **with an extra**, a natural 1 an automatic failure.
    The checks in battle and their extras:

    | Check | Natural 20 extra |
    |---|---|
    | Hide (Stealth) | A perfect hide: no one can find the ninja until its next turn, crouched or not (attacking or leaving cover still gives it away) |
    | Shove (Athletics) | It knocks the target prone **and** pushes it (3 m when pushing, 1.5 m when knocking down) |
    | Resisting a shove (Athletics/Acrobatics) | The shove fails and the shover falls prone |
    | Stabilize (Medicine, DC 10) | The ally does more than stabilize: it gets back up with 1 HP |

    In a contest (a shove) a natural 20 wins and a natural 1 loses; if both
    sides roll a natural 20 the one resisting keeps its ground. Mission checks
    are in `docs/MISSION_DESIGN.md`. **Death saves are not checks** and stay as
    they were (a 20 brings the ninja back at 1 HP, a 1 counts as two failures);
    initiative only counts its total.
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
- **Shooting-Star Thrust** (*Estocada Fugaz*, once Warp Strike) to a Node someone stands on lands 1 to 1.5 m from them,
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
- **Not gated by the nature:** the jutsu with no element in those slots
  (taijutsu, kenjutsu, genjutsu: **the class gates them**, his answer below,
  "Jutsu of a class"); everything in the **Utility** slot (the mystical palm,
  Water healing, is a utility jutsu open to every nature: his answer 3 below);
  the **clan secret**, whatever its element (it comes with the clan).
- **Light and Void** (and a ninja that still has Shadow or Spirit) are offered
  no elemental jutsu: only their class's kind of jutsu with no element, until
  their own exist.
- **Changing the type** swaps each chosen jutsu of another element for one of
  the new type: its own element first, the lowest rank first, never the one
  the other Element slot holds; if the type has none left, one of its class's
  kind; if there is none either, the slot is left empty (never the same jutsu
  in two slots). A note under the type tiles and at the top of the Jutsu step lists
  the swaps ("Ahora Rayo: se cambiaron los jutsus de otro elemento. Bola de
  fuego → Sabueso del rayo; Gran aniquilación → Kirin."); a slot the player
  picks again drops out of it, and on a short screen the note sticks to the
  bottom of the panel so it is seen right after the click. (Swapping, not just
  marking, keeps a player from keeping another element's jutsu by changing
  type afterwards, and it is what tells a player's own type from an old copy
  of a legend, answer 2.)
- **A sheet keeps what it has:** an older sheet or an imported one keeps its
  jutsu; the Jutsu step marks one of none of its elements "no es de tu
  naturaleza", and it stays until the player changes that slot or the type.
  (Kaien's Fireball and Raiga's Earth Wall are their second element's since his
  level-5 answer, below: no longer marked.)
- **The random ninja** picks jutsu of its own nature at a new ninja's ranks
  (Element I of its element when there is one) and its clan's secret; its
  S-rank slot stays empty (his answer 1 below).
- **Enemies and battles** are not touched: the gate is the creator's.

**His answers on the jutsu** (2026-10-21, later still), to four questions (which
ranks a new ninja may pick; the gaps; the explosive tag and the healing palm;
the swap on a type change): *"1 d y c y los de su clan 2 propuestas 3 sello
explosivo es un item o herramienta consumible palma curativa es un jutsu de
utilidad 4 si pero no se puede cambiar de tipo lo que se va poder es tener 2ndo
elemento en nivel mas alto y 3 elementos si tienes el feat especial para eso"*.

1. **A new ninja learns rank D and C jutsu, and its clan's** ("d y c y los de
   su clan"). In the creator every slot offers only jutsu of rank D or C (of
   the ninja's nature where the slot is gated), plus the jutsu of its own clan
   whatever their rank (the clan secrets are all rank A). The creator's sheet
   for a new ninja (a new game, a copy made from a legend, the random ninja)
   is fitted to that: a jutsu above C is swapped for one it may learn, lowest
   rank first. **The S-rank slot** has nothing to offer a new ninja, so it is
   shown **locked, in its place** ("Se desbloquea al nivel 10 · Rango S · no
   es para un ninja nuevo", with a lock), and the slot is empty on the sheet
   (in battle the ninja simply has no S-rank jutsu). *As built (the builder's
   choice):* locked rather than removed, so the approved Jutsu layout keeps its
   five rows and the slot is there when it opens. A line at the top of the
   Jutsu step says the rule. **The legends keep their sheets** (they are
   presets, not creator picks): their jutsu above C stay, marked "rango S: se
   queda en su hoja", and a legend picked as a starting point whose type is
   changed gets its S-rank swapped for one of the new element's (or one of its
   class's kind), emptied only when its nature and class have none (Solen as
   Water); its slots offer only D and C (and what its level-5 choice opens,
   below). **A made ninja** keeps its own jutsu (marked where they are above
   its ranks) and "Ninja al azar" keeps them (the clan secret follows the new
   clan, and the ones of another class are swapped as a class change does).
   Since his level-5 answer ("Level 5" below) a made ninja is offered the same
   ranks as every ninja of its level, no longer every rank: ranks above C are
   earned at level 5 (the builder's reading, for his approval). The S-rank slot
   opens at level 10, rank A at 7 (his answer: "The ladder" below).
2. **The gaps** (Water has no S-rank jutsu, Wind one Element jutsu): he wants
   **proposals** ("propuestas"). A separate job.
3. **The explosive tag is an item** ("sello explosivo es un item o herramienta
   consumible"), **the healing palm a utility jutsu** ("palma curativa es un
   jutsu de utilidad"). The jutsu "Explosive Tag Ambush" (`trap_setter_tag`) is
   gone from the jutsu lists; the tag is a consumable tool like the soldier
   pill, in the party's backpack (`supplies.explosiveTags`: 2 per mission, 2 in
   practice battles). In battle the item slots have two buttons for it:
   **Sello explosivo** throws one up to 9 m (it blows up where it lands, as
   before) and **Esconder sello** hides one on the ground up to 4.5 m (it blows
   up when an enemy steps on it, or when fire or lightning reaches it: the
   jutsu's old effect, 3d6 fire in 1.5 m, DEX save for half against **the
   hider's jutsu DC** (as the jutsu's was; a thrown tag stays DC 13, as
   before); quiet, so it doesn't give the ninja away while sneaking). Each use takes the action and
   one tag. The creator's Jutsu step shows it under **Herramientas** as
   "Objeto consumible · no es un jutsu". *Old saves:* a sheet that had the jutsu
   gets the starting sheet's jutsu in that slot (Utility: Shunshin) and **2
   tags in its own pouch** (`pouch.explosiveTags`), once (`migrateCharacter`);
   the pouch joins the backpack at the start of every mission and practice
   battle, and **is never used up**: the pouch is refilled for every mission,
   as the jutsu could be used in every one, so such a ninja always sets out with
   2 tags more. A mission saved halfway gets the converted tags in its backpack
   when it loads. (The 2 tags, the refill and the starting jutsu in its place
   are the builder's choice.) The palm stays in the Utility slot, open to every nature.
4. **The swap on a type change in the creator is fine** ("si"), **but the type
   can't be changed afterwards** ("pero no se puede cambiar de tipo"): once a
   ninja is made (the creator's Accept; every ninja saved on the device or
   imported counts as made, also those saved before this rule) its chakra type
   is fixed. Editing a saved ninja (title screen > a saved ninja > edit, which
   opens the creator) shows Appearance > Chakra with the other types greyed out
   and locked, and a note: "Tu tipo de chakra quedó fijo al crear a este ninja:
   ya no puede cambiar. Un segundo elemento llegará a un nivel más alto." The
   burst and the colour within the type can still change (the colour is only a
   look), and "Ninja al azar" keeps the type. A new ninja and a legend picked as a
   starting point can still change it.
   **His rule:** a ninja gets a **second element at a higher level** ("tener
   2ndo elemento en nivel mas alto"), and a **third element only with a special
   feat** ("3 elementos si tienes el feat especial para eso"). The level is
   decided (level 5, "Level 5" below), and so is the feat (Tres naturalezas,
   "The ladder" below).

**Jutsu of a class: his answer** (2026-10-21, later still), to "¿quién aprende
los de Genjutsu, Kenjutsu y Taijutsu?": *"9 los que elijan de clase genjutsu
kenjutsu o taijutsu"*. The jutsu with no element in the Element and S-rank
slots belong to a class: only a ninja of that class learns them. Built:

- **The game's classes, mapped** (the builder's mapping; the nearest class,
  nothing wider). **Kenjutsu to the Maestro de Bukijutsu is confirmed** (his
  answer, 2026-10-21, later still: *"si bukijutsu sera kenjutsu"*):

  | Kind of jutsu | Class that learns it | Jutsu today |
  |---|---|---|
  | Taijutsu | Maestro de Taijutsu (`Taijutsu Master`) | Huracán de la hoja (D), Night Guy (S) |
  | Kenjutsu | Maestro de Bukijutsu (`Bukijutsu Master`: the weapon class, whose own text names "kenjutsu katana forms") | Danza de la luna creciente (B) |
  | Genjutsu | Adepto del Genjutsu (`Genjutsu Adept`) | Templo del Nirvana (A), Yasaka no Magatama (S) |
  | none | Especialista en Ninjutsu, Especialista médico | they learn their element's jutsu, the utility jutsu and their clan's |

- **Open to all, as before:** the **Utility** jutsu (Shunshin, Sustitución and
  Clon de sombra are taijutsu by kind, the healing palm is Water: all utility,
  open to every class and nature), and **the clan's jutsu** to its clan (the 64
  Palms is taijutsu, open to every Northstar ninja).
- **In the creator's Jutsu step** the class gate works together with the
  nature gate and the D/C rank cap of a new ninja: an Element or S-rank slot
  offers the jutsu of the ninja's element plus its class's kind, at the ranks
  it may take. A line under the nature note says it ("Clase: Adepto del
  Genjutsu. También aprende jutsus de genjutsu: el taijutsu, el kenjutsu y el
  genjutsu son de su clase."; for Ninjutsu and Medical: "esta clase no aprende
  ninguno"), and each class's panel in the Class step has a "Jutsus de clase"
  line.
- **Changing the class in the creator** swaps the jutsu of another class's kind
  as a type change does (its own element first, the lowest rank first, at a new
  ninja's ranks while it is one) and says so in the Class step and at the top
  of the Jutsu step ("Ahora Maestro de Taijutsu: se cambiaron los jutsus de otra
  clase. Danza de la luna creciente → Huracán de la hoja (Konoha Senpuu)."). A
  slot with nothing left is emptied.
- **The random ninja** picks its jutsu for its class too.
- **The sheets keep what they have:** no legend breaks the rule today (each
  one's taijutsu, kenjutsu or genjutsu jutsu is its own class's). A sheet that
  does (the companion Hana, a medic, has Yasaka no Magatama; an older or
  imported sheet) keeps it, marked "no es de tu clase" in the Jutsu step. Saves
  are not changed. Enemies and battles are not touched.
- **An empty slot** (as built): a slot with nothing for the nature and class
  shows "Nada que aprender aún · nada para tu naturaleza y clase" with a lock;
  the S-rank slot of a new ninja whose nature and class do have S-rank jutsu
  still shows "Se desbloquea al nivel 10". When only one jutsu fits the two
  Element slots, the second is left empty rather than holding the same jutsu
  twice (until the rank D and C set on its own branch is merged, a Fire
  Bukijutsu Master's Element II, for one, is empty).

**Level 5: a second element or a higher rank** (his answer, 2026-10-21, later
still), to "a second element at level 5? a feat for the third? a formal second
nature for Kaien and Raiga?": *"nivel 5 suena bien para segundo elemento o subir
de rango tu elemento principal proponme el feat ok con kaien y raiga"*.

**Decided by the owner:**

- **At level 5 a ninja chooses one**: a **second element**, or **a higher rank
  of its main element** ("segundo elemento o subir de rango tu elemento
  principal"). The chakra type, the main element, never changes.
- **A third element** comes only with a special feat ("3 elementos si tienes el
  feat especial para eso"); he asked for **proposals** for the feat ("proponme
  el feat") and chose option A, **Tres naturalezas** ("The ladder" below).
- **Kaien is Rayo + Fuego and Raiga Fuego + Tierra** ("ok con kaien y raiga"):
  a formal second nature, so their Fireball and Earth Wall are their nature.

**As built, approved by the owner** (*"nivel 5 esta bien"*, 2026-10-21, later
still; see "The ladder" below):

- **What each choice opens.** *Second element:* one of the other four elements
  (any; Light and Void ninjas don't get the choice, below); its **rank D and C**
  jutsu open in the Element slots, as the main element's do. Today that is
  Agua: Muro de agua; Viento: Gran ráfaga cortante; Fuego: Bola de fuego; Rayo
  and Tierra: nothing yet (their D and C jutsu come with the rank D and C set on
  its own branch). *Higher rank:* the main element's **rank B** jutsu open in
  the Element slots: Fuego: Fuego del dragón; Agua: Proyectil del dragón de agua; Tierra:
  Muro de tierra and Balas de tierra; Rayo: Sabueso del rayo; Viento: none yet.
  Neither opens the S-rank slot, rank A (those come with the level: "The
  ladder" below), the rank B jutsu of a class (Danza de la luna creciente) or of
  Utility (Clon de sombra).
- **For good.** The choice is made once: while the ninja is created or edited
  it can change (the jutsu it no longer opens are swapped, as on a type change,
  and a note says which), and once the ninja is made with it, it is fixed
  ("Elegido al crear a este ninja: ya no cambia.").
- **The ranks follow the level, for every ninja.** A new ninja, a legend
  picked as a starting point and a made ninja are all offered rank D and C and
  their clan's, plus what their level-5 choice opens. (Before this answer a made
  ninja was offered every rank; that was the builder's choice, now replaced,
  see the Open question.) A sheet's own higher jutsu stay, marked "rango X: se
  queda en su hoja".
- **The creator's Jutsu step** shows it under the five slots, in a "Nivel 5:
  crecer en el chakra" block: below level 5 a locked line says what comes ("Al
  nivel 5 elige una: un segundo elemento, o subir de rango su elemento principal
  (Fuego). Su tipo de chakra no cambia nunca."); from level 5 the two choices,
  each saying what it opens ("Abre: Fuego del dragón"), and under "Segundo
  elemento" the four elements, each with what it opens. The nature note names
  both elements ("Naturaleza: Fuego + Agua"), the rank note the higher rank, and
  the sheet's "Naturaleza" box both. Light and Void ninjas see no block (their
  own jutsu are pending).
- **No level-up screen yet.** The game has no XP and no level-up: a ninja's
  level is its sheet's (the legends' 4 to 6), and the creator has no level
  picker, so a new ninja starts at the level of the sheet it is made from
  (Solen's, 6). The choice is therefore made in the creator, by any ninja of
  level 5 or more: a legend picked as a starting point, a new ninja made from
  one, or a made ninja that has not chosen yet (editing it). A level-up screen
  will call the same rule (`growthPending`, `chooseGrowth`).
- **Kaien and Raiga.** Raiga (level 5) has made his level-5 choice: Tierra.
  Kaien (level 4) has Fuego as a legend's own second element before level 5
  (the exception the proposal named); it counts as his choice. A new ninja made
  from Kaien does not keep it (it hasn't earned it). Saved copies of the two
  (the hero, the roster, a mission under way, an import) get the second nature
  once when they load (`addLegendNatures` in `migrateCharacter`), if they still
  have the legend's type and have no level-5 choice of their own. Their Jutsu
  steps no longer mark Bola de fuego or Muro de tierra "no es de tu
  naturaleza"; rank B and S jutsu of their sheets stay marked as every legend's
  are ("rango B: se queda en su hoja").
- **Battles and enemies** are not touched: the second element is the creator's
  (which jutsu a ninja may learn).

**The ladder: levels 5, 7, 9 and 10 (decided 2026-10-21, later still).** His
answer to the level-5 proposal and the third-element feat
(`feat-propuesta.md`), verbatim: *"si bukijutsu sera kenjutsu feat del tercer
elemento opcion a nivel 5 esta bien al subir al nivel 7 te un rango A y al 10 un
rango S"*.

**Decided by the owner:**

- **Kenjutsu belongs to the Maestro de Bukijutsu** ("si bukijutsu sera
  kenjutsu"), as built.
- **Level 5 is approved as built** ("nivel 5 esta bien"): a second element (its
  rank D and C jutsu) or a higher rank of the main element (its rank B jutsu).
- **Level 7: rank A. Level 10: rank S** ("al subir al nivel 7 te un rango A y al
  10 un rango S"), for every ninja.
- **The third element's feat is option A, "Tres naturalezas" / "Triple
  Nature"** ("feat del tercer elemento opcion a"), as proposed: it needs **level
  9 and a second element** chosen at level 5; it gives **a third element**, whose
  rank D and C jutsu open in the Element slots as the second's do; and **once per
  long rest** a jutsu of one of the ninja's elements costs **1 chakra less** when
  the previous jutsu it cast that battle was of another of its elements.

So the ladder, one step per level:

| Level | What opens |
|---|---|
| 1 | Rank D and C jutsu of its chakra type (and of its class's kind), and its clan's |
| 5 | One, for good: a second element (its D and C) or a higher rank of the main element (its B) |
| 7 | Rank A jutsu |
| 9 | The feat Tres naturalezas, for a ninja with a second element: a third element |
| 10 | The S-rank slot: rank S jutsu |

**As built** (the builder's reading where his words leave room, for his
approval):

- **Rank A and S are of the ninja's elements and of its class's kind**: what the
  nature and class gates already allow (rules/jutsuNature.ts, rules/jutsuClass.ts),
  now at every rank its level opens. So at level 7 a Lightning ninja learns
  Chidori, a Genjutsu Adept Templo del Nirvana; at level 10 a Fire ninja Gran
  aniquilación, a Genjutsu Adept also Yasaka no Magatama. A second (and third)
  element's rank A and S open too ("de sus elementos"). The level opens no rank
  B: those stay the level-5 higher rank's (the main element's). No count limit:
  "un rango A" is read as "the rank A", not "one rank A jutsu".
- **Every ninja** (a new one, a legend picked as a starting point, a made one) is
  offered what its level opens. The legends are levels 4 to 6, so none of them
  reaches 7 today: their own rank A and S jutsu stay on their sheets, marked
  "rango S: se queda en su hoja", as before.
- **The creator** says the ladder under the rank line ("Rango A al nivel 7; la
  ranura de Rango S, al nivel 10."; from level 7 "Desde el nivel 7, también
  rango A..."), and a locked slot names the level that opens it ("Se desbloquea
  al nivel 10" for the S-rank slot; "al nivel 7" for the Element slots of a type
  whose jutsu are all above C, such as Lightning).
- **Tres naturalezas in the creator:** the feat list shows "Requiere nivel 9 y
  un segundo elemento" under it (orange while unmet, with a lock) and won't take
  it until both are met; its panel says what is missing ("Le falta: nivel 9").
  Taken, the Jutsu step's **"Nivel 9: tercer elemento"** block offers the three
  other elements, each with what it opens ("Abre: Muro de agua"); the first is
  picked for the player. Like the level-5 choice it is fixed once the ninja is
  made with it (the feat too). Leaving the second element for the higher rank
  drops the feat and its third element (their jutsu are swapped, with a note); an
  imported sheet that doesn't meet the requirements loses the feat. Below level
  9 the block says what comes ("Al nivel 9, la dote Tres naturalezas ... le da
  un tercer elemento a quien tiene un segundo.").
- **The third element's jutsu** open as the second element's: D and C, and A
  from level 7 (a ninja with the feat is level 9). The feat's text says so.
- **The discount in battle** is automatic: the first jutsu of one of its
  elements cast right after a jutsu of another of its elements costs 1 chakra
  less (never below 0; not when the Centered chakra discount already made it
  free), the log says "Raiden entrelaza sus naturalezas: 1 de chakra menos (Tres
  naturalezas)", and the hotbar shows the lower cost. "The previous jutsu" is
  the last jutsu the ninja cast that battle, a Kawarimi included; a jutsu with
  no element (taijutsu) or of another element breaks the chain; clan abilities
  don't count. "Once per long rest": spent, it stays spent through the
  mission's next battles until a camp's morning (also an interrupted one) or the
  return to the village. In practice battles it is ready in every battle.
- **Saves and enemies.** Nothing saved changes, so there is no migration: saved
  heroes, the roster and a mission under way load as they were. Enemies are not
  built in the creator and keep their kits (the jonin's Chidori); the ladder
  gates the player's choices only.
- **No level-up screen yet**: a ninja's level is its sheet's, so in play today
  only an imported sheet reaches level 7, 9 or 10.

**In the code**: `RANK_A_LEVEL`, `RANK_S_LEVEL`, `levelRanks`, `rankOpen(j, clan,
rankUp, level)` and `slotOpensAt` in `src/rules/progression.ts` (`Growth.level`
carries the level); the feat is `triple_nature` in `SHINOBI_FEATS` with
`requires: { level: 9, secondElement: true }`; `src/rules/feats.ts` (`featNeeds`,
`featOpen`, `keepEarnedFeats`, `tripleNatureDiscount`); the third element is
`thirdElementOpen`, `hasSecondElement`, `chooseThirdElement`, `fitThirdElement`
in `src/rules/natureGrowth.ts`. In battle a unit has `tripleNature` (its
elements, spent) and `lastNature`; `jutsuCostParts` in `src/battle/engine.ts`
applies it; the battle result's `tripleNatureSpent` sets the sheet's
`tripleNatureSpent` (cleared in `morning`, `src/rules/rest.ts`, and
`returnToVillage`).

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
The ranks a new ninja may take and the fixed type are `src/rules/progression.ts`
(`NEW_NINJA_RANKS`, `rankOpen`, `creatorChoices`, `fitNewNinja`, `aboveRank`,
`learnsAsNew`, `slotChoices`, `fitToType`, `typeFixed`, `asMade`; a made ninja
has `created: true`); the class gate is `src/rules/jutsuClass.ts`
(`STYLE_CLASS`, `classGated`, `jutsuFitsClass`, `offClassJutsus`) with
`learnable` and `fitToClass` in `progression.ts`; the explosive tag's
move to the pouch is `src/rules/pouch.ts` (`tagJutsuToItem`, `withPouches`); in
battle the `item` action takes `tag` (throw) or `tagTrap` (hide,
`plantTag` in `src/battle/hazards.ts`). The level-5 choice is
`src/rules/natureGrowth.ts` (`GROWTH_LEVEL`, `growthOf`, `naturesOf`,
`chooseGrowth`, `earnedGrowth`, `growthFixed`, `growthPending`, and
`THIRD_ELEMENT_FEAT`, the hook for the proposed feat); a sheet keeps it in
`natureGrowth` ('element' or 'rank') and `extraNatures` (both optional: a sheet
without them has its type alone); the ranks it opens are `rankOpen(j, clan,
rankUp)` in `progression.ts`, and `fitToGrowth` swaps the jutsu a new choice no
longer opens.

### The chakra colour colours the elemental jutsu (decided 2026-10-21)

The owner asked for it (*"que del color que pongas tu elemento de chakra [...]
haga que tus habilidades o jutsus sean de ese tono de color"*), wanted only the
elemental ones (*"solo los elementales tendrian este cambio"*), saw the sample
and approved it: *"me encanto el color nuevo y aura de los jutsus que me
enseñaste ejecuta el cambio de color para todos las habilidades elementales y
para las bestias elementales"*.

**Decided by the owner:**

- Every **elemental** jutsu (fire, water, wind, lightning, earth) plays in its
  caster's chakra colour (`appearance.chakra.tint`): projectiles, hits, blasts,
  breaths, streams, spheres, walls, the signatures (Fireball and Great Fireball,
  the Great Fire Annihilation, Kirin) and the **elemental beasts**.
- Genjutsu, poison and chakra effects and their beasts (crows, cobra, griffin)
  keep their colours.
- With no colour picked (Natural), or the effect's own colour, his pixels play
  exactly as he drew them. Recolouring never redraws: alpha, his dark line,
  smoke, dust, rock debris, moss and the stone drake's eyes stay his.
- **His answer on the review** (2026-10-21, later still), verbatim: *"kirin
  negro dejar asi rosa y violeta y como se vea en otros colores dejalo asi se ve
  muy bien la curacion siempre se vera verde"*. So: **the black Kirin stays as it
  is**, with its pink and violet kanji ("kirin negro dejar asi rosa y violeta");
  **the other colours stay as they look** ("como se vea en otros colores dejalo
  asi se ve muy bien"); and **a heal is always green** ("la curacion siempre se
  vera verde"), whatever the caster's chakra colour. (The green heal is built on
  its own branch, `jutsu/d-c-set`.)

**As built** (the builder's reading, not his decisions):

- What a jutsu throws keeps its caster's colour (a projectile in flight, an
  earth or water wall that stays on the map). Enemies use their own chakra
  colour if their look has one; today's enemy templates have none, so theirs
  are his colours.
- The beasts a jutsu summons today are the water dragon (Water Dragon), the
  raiju (Lightning Hound) and the stone drake (Wood Dragon); they take the
  colour. The phoenix and the crane have sheets and would take it too, but no
  jutsu summons them yet.
- "Elemental" is the jutsu's nature: a sword art that borrows the wind's slash
  (Crescent Moon Dance, Kenjutsu) and the Adamantine Chains (Water, drawn as
  chakra) keep their colours; Pursuing Flame (Mirai, a Katon jutsu) takes it.
  The explosive tag (Fire, drawn as a paper tag and its blast) has nothing
  drawn in its element, so it keeps its colours. The Mystical Palm (Water) used
  to be drawn as a green heal; on `jutsu/d-c-set` it wraps the friend in the
  water aura (the owner's answer 6 on the rank D and C proposal). The old open
  question (should a heal of an elemental nature glow in the chakra colour) is
  answered **no** (the owner, 2026-10-21): "la curacion siempre se vera verde".
  The Palm and the Healing Dew play their water sheets in the heals' green,
  whatever the caster's colour ("Rank D and C jutsu").
- The flare when fire or lightning seals a hydra stump and the lightning that
  runs through water take the caster's colour too.
- White is a cool silver on water, wind, lightning and earth, a faint gold on
  fire. Outlines that are not black in his sheets (the raiju's brown, the
  crane's teal, the lightning's blue ring) stay his.
- In the code: `src/sprite/vfxTint.ts` recolours (pure); the battle recolours
  each sheet once per colour, frame by frame, in workers while the battle opens
  and for any ninja who joins later (`src/components/battle/vfxTintCache.ts`,
  `vfxTintPlan.ts`). A frame never gets made on the screen's own thread while it
  plays: if it is not ready the effect holds its last ready frame a moment, and
  before its first frames are ready its drawn stand-in plays in the colour. At
  most about 200 MB of recoloured frames are kept (sheets unused for a while go
  and are made again when cast); everything, workers included, goes when the
  battle ends. In a browser without workers the big signatures (Annihilation,
  Kirin) play in his colours instead of stuttering.

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
  de Agua: Chorro de agua*). The clans' bloodline abilities are not jutsu
  and keep their own names: Command (*Comando*) and the Ryusei's
  Shooting-Star Thrust (*Estocada Fugaz*; the owner, 2026-10-21, once Warp
  Strike / *Golpe Warp*; CLANS_DESIGN D24).
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
  - the **Utility** slot is not gated (settled for the palm by his answer 3:
    "palma curativa es un jutsu de utilidad");
  - the **clan secret** is not gated (it comes with the clan, whatever its
    element);
  - **changing the type swaps** the jutsu of another element for ones of the
    new type, lowest rank first, and says which (instead of only marking
    them);
  - **Light and Void** (and a ninja still on Shadow or Spirit) learn only the
    jutsu with no element until their own exist;
  - **the random ninja** takes Element I from its own element when there is
    one, and its clan's secret.
- The ranks a new ninja may take (his answer 1, built): the S-rank slot is
  shown locked in its place ("Se desbloquea al nivel 10") rather than removed.
  Confirm. (When it opens is decided: level 10, rank A at 7: "The ladder".)
- **The ladder as built** ("The ladder" above): rank A and S open for the
  ninja's elements **and its class's kind** (Templo del Nirvana at 7 and Yasaka
  no Magatama at 10 for a Genjutsu Adept, Night Guy for a Taijutsu Master), and
  for its second and third elements too; **no count limit** ("un rango A" read
  as the rank, not one jutsu of it). Rank B still opens only with the level-5
  higher rank, so a ninja that took a second element never learns its main
  element's B (nor anyone the class B Danza de la luna creciente or the Utility
  B Clon de sombra), though it learns A at 7. Confirm, or say when B opens for
  the rest.
- **Editing a legend** (his answer 1): a legend picked in the creator keeps its
  sheet, so a player can pick one, rename it, change its look and stats, accept,
  and play it with its rank B and S jutsu. Should a legend that is changed
  become a new ninja (held to D, C and its clan's), or is playing a legend with
  its own jutsu fine?
- **A made ninja** (his answer 1 was about creation): it was offered every rank
  its nature allows. Since his level-5 answer ("subir de rango tu elemento
  principal" means ranks are earned) it is held to the same ranks as every
  ninja of its level (D, C, its clan's, and what its level-5 choice opens); its
  own higher jutsu stay, marked. Confirm.
- The explosive tag as an item (his answer 3, built): a sheet that had the
  jutsu gets 2 tags in its own pouch and Shunshin in its Utility slot; the
  backpack carries 2 per mission. The pouch's 2 tags are **refilled for every
  mission** (never used up), so such a ninja always has 4. Confirm the numbers
  and the refill (or should the pouch's tags be spent for good?). Should tags be
  bought or found later (a shop, loot)? The hidden tag's save is the hider's
  jutsu DC, as the jutsu's was; a thrown one stays DC 13: confirm.
- **Level 5** is approved as built ("nivel 5 esta bien"). Still open from it:
  **Light and Void** ninjas don't get the choice until their own jutsu exist
  (or may they take a second element?).
- **A new ninja's level**: the creator has no level picker, so a new ninja has
  the level of the sheet it is made from (Solen's, 6) and can make the level-5
  choice while it is created, so a new ninja that takes the higher rank learns
  its element's rank B jutsu (his answer 1 said D and C). Should a new ninja
  start at a lower level (1, or 4), or make the choice only in play once a
  level-up screen exists?
- **Tres naturalezas as built** (he chose option A: "The ladder"): the third
  element is fixed once the ninja is made with it, and the feat with it; the
  discount is automatic, a Kawarimi counts as "the previous jutsu", and it is
  ready again at a camp's morning (an interrupted one too) or back at the
  village. Confirm.
- Kaien and Raiga's second natures (his "ok", built): **Kaien's Fuego comes
  before level 5** (he is level 4), as a legend's own exception, and counts as
  his level-5 choice; Raiga's Tierra is his level-5 choice. A second element
  opens rank D and C only, so Raiga's **Muro de tierra (rank B)** stays marked
  "rango B: se queda en su hoja", as his Fuego del dragón (B) and every legend's
  higher jutsu are. Confirm.
- Gaps the gate shows: Water has no S-rank jutsu (a Water ninja's S-rank slot
  offers only Yasaka no Magatama and Night Guy); Wind has one Element jutsu
  (Great Breakthrough Blade), so its second Element slot takes a jutsu with no
  element (two once the rank D and C jutsu go in: Whirl joins it).
- The jutsu of Light (deity, angel and god) and of Void, Shadow and Spirit
  (demonic): to design when he says.
- **Jutsu of a class** (his answer: "los que elijan de clase genjutsu kenjutsu
  o taijutsu"), as built: **kenjutsu goes to the Maestro de Bukijutsu** (there
  is no kenjutsu class; Bukijutsu is the weapon class): **confirmed** ("si
  bukijutsu sera kenjutsu"). **Especialista en Ninjutsu and Especialista médico** learn
  none of the three: confirm. Consequences to decide: a **Light or Void** ninja
  of those two classes has nothing at all for its Element and S-rank slots
  until Light and Void get their jutsu; a ninja with one fitting jutsu for two
  Element slots gets the second slot empty (not the same jutsu twice). The
  companion **Hana** (medic) keeps Yasaka no Magatama (genjutsu), marked: give
  her another S-rank jutsu? (Water has none yet.)

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

**Approved in the game (2026-10-21):** "apruebo los 12 jutsus con excepcion del de tajo sangrante ya que hay que añadir algun sprite de sangre explotando hacia el lado donde se hace el corte para efecto de sangrado". All twelve are merged; the Bleeding Cut plays as built until its blood spray (a burst of blood thrown toward the side the cut travels) is made and approved.

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
| **Calambre** / Jolt (`lightning_jolt`) | Lightning, D, Element | action, 1 chakra, one target at 7.5 m | CON save, nothing on a success; on a failure 1d6 lightning and **Numb for 2 rounds** (its own effect, `jolted`, "Entumecido": −2 to DEX rolls: DEX saves, ranged attacks, DEX checks; it ends after two of the target's turns and never outlasts the battle; with a cold night's Numb as well the −2 counts once); lightning runs through water | +1: 2d6 |
| **Abanico de chispas** / Spark Fan (`lightning_spark_fan`) | Lightning, C, Element | action, 2 chakra, 4.5 m cone | DEX save, half on a success: 2d8 lightning to everyone in the cone, friends too | +2: 3d8, the cone reaches 5.6 m and opens wider |
| **Guijarros** / Pebble Shot (`earth_pebble_shot`) | Earth, D, Element | **bonus action**, 1 chakra, one target at 9 m | jutsu attack roll: 1d6 bludgeoning. Strike first and it still flies (the blade is stowed for free); cast it first and the weapon stays stowed (drawing it again takes the bonus action, already spent) | +1: 2d6 |
| **Corona de púas** / Spike Crown (`earth_spike_crown`) | Earth, C, Element | action, 2 chakra, everyone within 3 m of you | DEX save, half on a success: 2d8 piercing to all within 3 m, friends too, not the caster; a stomp: no seals, the weapon stays in hand | +2: 3d8 within 4.5 m |
| **Rocío sanador** / Healing Dew (`water_healing_dew`) | Water, D, Utility | action, 2 chakra, a friend within 6 m or yourself | heals 1d8, and a fallen friend gets back up; no Medic bonus (as the Mystical Palm); silent; the AI doesn't use it (its healing is the Palm) | +1: 2d8 |
| **Géiser** / Geyser (`water_geyser`) | Water, C, Element | action, 2 chakra, 1.5 m circle at 9 m | STR save, half on a success: 3d6 bludgeoning to everyone in the circle, friends too | +2: 4d6, 2.25 m |
| **Espejismo** / Mirage (`genjutsu_mirage`) | Genjutsu, C, Element | action, 2 chakra, one target at 9 m | WIS save, nothing on a success; on a failure 2d6 psychic and **Confused** for 2 rounds (one turn in four lost); **silent** | +2: 3d6 |
| **Tajo sangrante** / Bleeding Cut (`kenjutsu_bleeding_cut`) | Kenjutsu, D, Element | action, 1 chakra, melee, leaps in from up to 3 m | the blade is drawn for free; jutsu attack roll struck as a blow: 1d8 slashing and **Bleeding** on a hit (1d4 a turn until bandaged; 1d4 a road leg); **silent** | +1: 2d8 |
| **Embestida** / Rush (`taijutsu_rush`) | Taijutsu, C, Element | action, 2 chakra, melee, charges up to 6 m | **the weapon is stowed** (free, like for seals) and the ninja **tackles**: a straight run to the target (nothing may stand in the way: a wall, a tree, a structure, deep water or a cliff edge), no opportunity attacks, no movement spent, then a jutsu attack roll struck as a blow: 2d8 bludgeoning. You end up beside the foe | +2: 3d8 |

Rules that came with them (2026-10-21):
- **A melee jutsu with an attack roll is struck as a blow** (Bleeding Cut,
  Rush): the caster's jutsu attack bonus, but no cover, no disadvantage for a
  foe close by, advantage against a prone target, flanking counts.
- **Sword arts draw the blade** by themselves (free, once a turn). They need
  a blade: a ninja with none in hand (a palm technique, the fists) can't cast
  them, and with the blade stowed and the free draw spent the jutsu waits ("draw
  the weapon first"); the AI doesn't plan them without a blade. This also fixes
  the Dance of the Crescent Moon, which used to strike with the fists after a
  jutsu stowed the blade.
- **The Rush stows the weapon** (free, once a turn; with that spent and the
  weapon in hand, it waits, like a jutsu with seals).
- **A silent jutsu that wounds counts as an attack** (the proposal's piece
  P6; the owner made the Mirage and the Bleeding Cut silent): it doesn't start
  the fight in the stealth phase by itself. Like a blade, the caster gives
  itself away once it has struck (a hidden caster still rolls from hiding), and
  in the stealth phase the target that survives (or saves, or is missed) shouts
  and the fight begins with the other unaware guards surprised, while one that
  falls unseen leaves a body. No surprise damage: that is the blade's. A silent
  jutsu that reaches several foes would be loud (none exists).
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
- **Spark Fan**: one trunk of his forked lightning from the hand, branching
  to each one reached (the last fork cut off at the target, the branches a little
  see-through so the targets stay in sight); it fades as a spark bursts on each
  one hit, 80 ms apart, and the next turn waits for the last spark.
- **Bleeding Cut**: its own effect, the wind's crescent cut in white, as a
  sword art has no element (`vfx_neutral`).
- **Rush**: a flash of chakra where the ninja sets off, a run at twice the
  speed and a shoulder tackle (a new pose: the head tucked down behind the
  leading shoulder; a katana stowed at the hip hangs back along the leg, a blade
  on the back turns with the body only part of the way).
- What a jutsu of this set throws leaves the casting hand (before the body, at
  chest height), not the head; elemental ones play in the caster's chakra colour
  like every elemental jutsu (the volleys' and the fan's own sheets too, and the
  Mantle's lingering aura). The movement overlay and the next order wait until
  a jutsu's last impact has played.
- The others, the proposal's recommended option A: the Breeze Mantle's aura
  stays faint (40 %) around the ninja until its next turn (its own mark,
  `mantle`, so a plain Dodge shows no wind); Spike Crown in the charge pose with
  the earth aura for 0.4 s, then a rock burst on each one reached; Healing Dew
  flies the water orb to the friend and wraps it in the water aura for 0.8 s;
  Geyser rises from the ground with no projectile (a 0.3 s warning splash, a
  light shake); Mirage flies the eye-sphere half again as slow; Whirl as it was.
- **Mystical Palm** (the owner's answer 6): the Healing Dew's water aura wraps
  the friend for 0.8 s as it heals, with no orb (a touch), instead of the old
  green glow.
- **Healing is always green** (the owner, 2026-10-21): "la curacion siempre se
  vera verde". The heals never take the chakra colour: the Palm's water aura
  and the Healing Dew's orb and aura are his water pixels recoloured to the
  heals' green (`#4ade80`, the old Palm glow's and the healed number's), his
  dark line kept, whoever casts them (Natural and enemies too). Any later heal
  drawn in an element does the same (`HEAL_TINT`, `jutsuTint` in
  `src/components/battle/vfxTintPlan.ts`).

The proposal's nine open questions. The branch was built with the proposal's
defaults; the owner then answered 4 to 9 (2026-10-21), and his answers are
built:
1. Which ones go in: all twelve (he asked for all of them to be done).
2. Names: as proposed.
3. Animation: as above (his answers, and option A for the rest).
4. Jolt: **his answer: Numb for 2 rounds** (piece P5): built, as its own
   effect (`jolted`, shown as "Entumecido" like the cold night's Numb, which
   still lasts until camp).
5. Rush: **6 m** (his answer too).
6. Healing Dew: **his answer: yes, the water aura on the Mystical Palm too**:
   built (above).
7. Pebble Shot looking more like "earth bullets" than *Balas de tierra*: kept
   (his answer: yes).
8. Mirage and Bleeding Cut: **his answer: silent** (piece P6): built (the
   rule above).
9. Who learns the Genjutsu, Kenjutsu and Taijutsu ones: his answer, *"9 los que
   elijan de clase genjutsu kenjutsu o taijutsu"*: the class gates them (built
   on the integration branch; the Mirage, the Bleeding Cut and the Rush are
   gated like the others).
Also not built (optional in the proposal): a style of cast per jutsu (P1), and
the Geyser putting out burning units in its circle.
