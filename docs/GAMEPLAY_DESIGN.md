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
- **The elemental beasts are summons, not attacks** (the owner, 2026-10-21:
  *"todos los elementales seran invocaciones que te ayudaran en el combate no
  ataques"*): the water dragon, the stone drake, the wind crane, the lightning
  beast, the phoenix, the griffin, the crows and the cobra will help in battle
  as summons; no new jutsu uses one as its attack (the summon itself is
  designed later: Open questions).
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

## Class abilities in battle

### Weapon Element Enhancement (the owner, 2026-10-23; in the game since 2026-10-23, every element)

**His answer on the effects (2026-10-23), verbatim:** *"me gusta las armas con mejora elemental metelas en el
juego menos la de agua se ve mal y no de calidad mejorala para que se ve mas epica y proporcional y los iconos
que hiciste para la hotbar no me gustaron los mejorare"*.
- Lightning, wind, fire and earth on the weapon are **approved** and in the game.
- Water: the first one was **not approved**; redone on `vfx/weapon-water-v2` as a torrent drawn as his water
  stream is (his water sheet: his blues, a light strand running along it, white foam caps breaking on the
  crests of waves that run along its upper edge, a rounded head of foam, his spray dots, drops falling), his
  dark water line round it. Then his *"al de agua hazlo mas largo para que se entienda la extension de alcance
  hazlo unos 1.35 mas largo"*: the whole water 1.35 times as long, past the tip about the blade again (46 to
  48 px on Solen's and Ren's blades), short of the frame's edge where the blade points near it (the lunge, a
  cut, hurt), one length over a pose where the blade barely turns (at rest, walking, running). **Approved**
  (2026-10-23, *"me gusta agua aprovado"*) and in the game: water is offered again (`IMBUE_PENDING` in
  `src/battle/imbue.ts` is empty), as a main or a second element.
- The hotbar icons: he did not like ours (the element icons the button shows); **he will paint them himself**.
  Ours stay on the button only until his arrive.

**His answers to the four open questions (2026-10-23), verbatim:** *"1 si me gusta dime que haria cada elemento
(ejemplo: fuego efecto Burn o quemado ) 2 aprovado 3 tambien segundo elemento al momento de desbloquear , 4 no"*.
1. The numbers are **decided** as proposed below: a bonus action, 2 chakra, 3 turns, +1d4 a blow, and each
   element's rider in the table (fire's crit burns, lightning's crit numbs 2 rounds, wind's crit blows the foe
   back 1.5 m, water +1.5 m reach and puts out flames, earth's obsidian crits on a natural 19).
2. The Spanish name *Potenciación elemental del arma*, button *Arma elemental*: **approved**.
3. **The second element too, once it is unlocked** (the level-5 choice of a second element,
   `rules/natureGrowth.ts`): a Bukijutsu Master with a second element can put either of its elements on the
   weapon, one at a time. Then his *"si el triple naturaleza tambien cuenta"* (2026-10-23): the third
   element that Triple Nature opens (the feat, level 9 and a second element) counts too, a third button,
   the same rules. The hotbar shows a button for each ("Arma
   elemental · Fuego", "Arma elemental · Rayo"), in its element's colour; with one element, one button as
   before. A ninja whose type has no element (Light, Void) but whose second element is one has it for that
   one. The AI picks among them: water when only its longer reach brings the foe within a blow this turn;
   not fire at a foe already burning or standing in the wet, nor water at a burning foe; otherwise the first
   left of its chakra type's, its second, its third (`imbueChoice` in
   `src/battle/ai.ts`; `unitImbueElements`, `imbueNaturesOf` in `src/battle/imbue.ts`).
4. Thrown weapons: **no** (as built).

The owner, verbatim: *"ok ahora para la clase de maestro de armas , agregale weapon
element enhacement como habilidad y le pondra un efecto de animacion a las armas (si
es rayo , electricidad alredor del arma , si es viento , vfx de viento alrededor del
arma , si es fuego el arma prende en llamas , si es agua se extiende el alcance del
arma con agua vfx , si es tierra se ponen obsdiana filosa en tu arma , no aplica para
genjutsu, solo elemental )"*.

**Decided by him:**
- The weapon class (the Maestro de Bukijutsu, `Bukijutsu Master`) has the ability
  *Weapon Element Enhancement*; it puts the ninja's element on its weapon, with an
  animated effect on the weapon.
- Lightning: electricity round the weapon. Wind: wind effects round the weapon. Fire:
  the weapon bursts into flames. Water: the weapon's **reach grows**, with water
  effects. Earth: sharp obsidian forms on the weapon.
- Only the five elements; never genjutsu.

**The rules (proposed by the builder, decided by him on 2026-10-23 as above; constants in `src/battle/imbue.ts`):**
- Spanish name *Potenciación elemental del arma* (his own English name, translated);
  the button reads *Arma elemental* (approved). Id `weapon_element`.
- Who: a Bukijutsu Master whose chakra type is Fire, Water, Wind, Lightning or Earth
  (its main element, the one its chakra type says; Light and Void, and the pending
  Shadow and Spirit, have none to give), or whose unlocked second element is one (his
  answer 3 above). From level 1, as
  the class's own ability, after the clan's on the hotbar. The rogues (Fire Bukijutsu
  Masters) have it too.
- How: a **bonus action, 2 chakra**, no hand seals (chakra worked into the weapon in
  hand, like a clan ability: the weapon stays in hand, sealed chakra stops it). A
  weapon put away is drawn for it (free, once a turn, as a sword art draws it). Fists
  and palm techniques have nothing to hold it: not available. Once at a time.
- How long: **3 of the ninja's own turns**, the one it is cast in counted (as the
  activated Chidori). It ends early if the ninja falls or its chakra is sealed. Put
  away, the weapon keeps it (it shows again when drawn), but the fists strike without it.
- Every melee weapon blow that hits adds **1d4** of the element (a critical hit makes
  it the maximum of two dice, 8, the owner's crit rule), landed right after the blow's
  damage (a clone, Kawarimi or Evasion that stops the blow stops it too). Water, wind
  and earth deal what their jutsu deal, as the game has no such damage types:
  | Element | Damage | And (decided) |
  |---|---|---|
  | Fire | fire | a critical hit sets the foe **burning** (not on wet ground); a fire blade seals a hydra stump it has just cut |
  | Lightning | lightning | a critical hit leaves the foe **Numb** (2 rounds); a lightning blade seals a hydra stump too; Downpour makes it hit harder, as all lightning |
  | Wind | slashing | a critical hit **blows the foe back 1.5 m** (a ninja; big creatures stand firm) |
  | Water | bludgeoning | **+1.5 m melee reach** (his rule; the 1.5 m is ours): a sword reaches 3 m, a naginata 4.5 m, for attacks, opportunity attacks and the AI; and it puts out the flames of the foe it strikes ("el agua apaga el fuego") |
  | Earth | piercing (obsidian) | the obsidian edge makes a **natural 19** a critical hit too |
- Thrown weapons: **no**. The element is on the weapon in hand; a kunai thrown from the
  pouch is another weapon. Kenjutsu jutsu (the Crescent Moon Dance, the Bleeding Cut)
  are jutsu with their own damage, and don't add it either.
- The AI: a Bukijutsu Master whose plan is a blow of its weapon at a foe it can reach
  this turn (water's longer reach counted) puts its element on first. It doesn't plan
  differently because it could (the plans are as before).
- The log: "El arma de Aki se prende en llamas", "La electricidad chisporrotea
  alrededor del arma de Aki", "El viento gira alrededor del arma de Aki", "El agua
  recorre el arma de Aki: +1.5 m de alcance", "Obsidiana filosa cubre el arma de Aki",
  and a line when it leaves the weapon. The class panel in the creator names it.

**The activation (approved 2026-10-24, *"apruevo animacion de activar y corte elemetal"*; in the game).** His words
(2026-10-23): *"hazle una animacion para activar la mejora de elemento con la pose de victoria"*. When the
element goes onto the weapon the ninja holds the victory pose (the weapon raised) for 1 s (`ACTIVATE_MS`,
10 frames) while it plays: the element gathers into the hand (motes of its light drawn in from round it),
surges up the blade from the hand to the tip (the loop's own pixels up to a bright front), flares off the
point (a flash over the whole effect, rays and sparks off the tip, a halo round it) and settles into the
loop; then back to rest. Each element in its own tones, the energy in the ninja's chakra colour, obsidian in
its own (`renderImbueActivation` in `src/sprite/imbue.ts`; `playback.ts`, `renderer.ts`, `unitArt.ts`). It
replaces the cast pose and the aura burst of the first build. The log is as before.

**How it looks (approved: lightning, wind, fire and earth, then the redone water; `src/sprite/imbue.ts`):** drawn on the
weapon's own pixels in every frame that holds it (idle, walk, run, attack, thrust,
charge, cast, victory, the camp kata), so it follows the weapon's angle (`grip.ts`).
None where the weapon is not in the hand (hand seals, the unarmed combo, the tackle,
stowed, knocked out). Each element loops over 8 ticks at 10 a second. The colours are
his: each ramp is taken from his effect sheets (fire, lightning, wind, water). Fire:
tongues of flame rise off the blade's upper edge and sway, the steel glows under them,
embers fly up. Lightning: two bolts fork along the blade and crackle off it, new forks
every tick, his deep-blue ring and glow. Wind: two strands turn round the blade like a
helix (the far half behind the figure), dashes running to the tip, small crescents
flicked off it. Water (approved after its redo, above): a torrent along the blade and a longer blade of water
past the tip (the longer reach, not to scale), with his water line. Earth: teeth
of black obsidian along both edges and a point past the tip, glass catching the light
on their edges, a glint running along them. Energy carries his element's darkest tone
at its edge, no black line; the obsidian is solid and carries the characters' black
line. The energy takes the ninja's chakra colour like his jutsu; the obsidian keeps
its own.

### Elemental Slash (the owner, 2026-10-23; approved 2026-10-24, *"apruevo animacion de activar y corte elemetal"*; in the game)

The owner, verbatim: *"ahora pon en el juego una habilidad para maestro de armas que si tienes la mejora de
arma que dura 3 turnos puedes tambien tener una opcion de lanzar la habilidad en un slash del elemento que
tengas para usarlo como habilidad de largo alcance para maestro de armas"*, and then *"el tajo sera un bonus
action y elimina la mejora del arma"*.

**Decided by him:**
- The Bukijutsu Master has a second class ability: **while Weapon Element Enhancement is on its weapon**, it can
  throw that element off the weapon in a slash, an attack **at long range**.
- It is a **bonus action** (the action stays free: the master can still strike that turn).
- It **ends the enhancement**: the element leaves the weapon with the slash.
- Water: *"el de agua apaga las llamas y pone mojado abajo del objetivo"*: a water slash puts out the target's
  flames **and leaves the ground under the target wet**: the same wet ground a water jutsu leaves (`soak` in
  `src/battle/ground.ts`: a 1 m circle round the target, as a water jutsu thrown at one target soaks, for
  WET_ROUNDS; its art, and what fire and lightning do on it, are the ones the game has), with its log line ("El
  suelo queda mojado"). On every water slash that hits, not only a critical hit (his *"si asi lo quiero"*,
  2026-10-24); a miss leaves the ground dry.
- *"y en este jutsu el efecto se aplica si o si no solo en critico"*: in the slash **the element's effect
  applies on every hit**, not only on a critical hit (on the blade it stays a critical's): fire sets the foe
  **burning**, lightning leaves it **Numb** (2 rounds), wind **blows it back 1.5 m**, water puts out its flames
  and wets the ground under it.
- Earth: *"derribar"*: an earth slash **knocks the target down** (prone) on every hit, the game's own knock-down
  (a ninja; big creatures stand firm), with its log line ("… cae derribado"). It replaces the obsidian's 19–20
  critical range in the slash; on the blade the obsidian keeps it.

**The rest is the builder's proposal, approved with the slash** (constants in `src/battle/imbue.ts`):
- Name *Corte elemental* (*Elemental Slash*), the same on the button. Id `elemental_slash`.
- Who: whoever has Weapon Element Enhancement (it comes with it, `classAbilities`); usable only with an element
  on the weapon ("Solo con tu elemento en el arma"). It throws the element on the weapon now, whichever of its
  elements that is.
- **2 chakra**, decided: asked *"¿2 de chakra y alcance como un jutsu de rango C?"*, he answered *"15 si"*
  (2026-10-24). No hand seals; sealed chakra stops it; a weapon put away is drawn for it (free, once a turn, as
  a sword art draws it).
- The economy: the enhancement is itself a bonus action, so the slash comes on a later turn of it (its second or
  third). A blow struck before the slash in the same turn still carries the element; one after it doesn't.
- Range **9 m**, decided (the same answer: as a rank C jutsu thrown at one target; the rank C ones are 9 m, the
  Pursuing Flame's 12 m apart), **10.5 m with water** (its 1.5 m longer reach). One foe in sight; not at a
  friend. *Open:* whether his "15" meant 15 m.
- The roll: **the weapon's attack** (proficiency and STR, or the better of STR and DEX with a finesse weapon), at
  range like a jutsu thrown at one target: cover counts, a foe within 1.5 m gives disadvantage, the height
  (±2), steam, a prone target (disadvantage). A Ryusei's warp edge goes with it.
- A hit deals **the weapon's die + 1d4 of the element** (the damage types of the table above), no ability
  modifier (a bonus-action blow, like an off-hand one in 5e), and the element's effect (his rules, above). A
  critical hit: the dice at their maximum, doubled (his crit rule); it crits on a natural 20 only, earth too.
  Only water does anything to the ground (fire sets none alight, lightning doesn't run through water).
- The AI keeps the element on the blade while the blade can reach a foe this turn (walking there counted), and
  throws it at the foe it is likeliest to hit (the most wounded on a tie) when none can be reached, or, its blow
  struck, on the element's last turn, before it fades anyway (`slashAway` in `src/battle/ai.ts`).
- The hotbar: a *Corte elemental* button after *Arma elemental*, in the colour of the element on the weapon; a
  crescent icon until he paints one. Aiming shows the reach (10.5 m with water) and, over a foe, the chance and
  the dice ("1d8+1d4").
- The log: "Aki lanza Corte elemental", then the element leaving the weapon ("Las llamas salen del arma de Aki
  en un corte", "El rayo sale…", "El viento sale…", "El agua sale…", "La obsidiana sale…"), then the roll's miss
  or the damage.

**How it looks (approved; `elementSlash` in `src/components/battle/playback.ts`):** the attack
pose's cut, the element still on the blade as it rises; on the strike frame the element leaves the blade (its
loop is gone) as his crescent of that element (`vfx_<element>/slash`, the crescents of his element sheets) flying
from the blade at blade height to the target, 75 ms a metre (300 ms at least), where his hit of that element
bursts (`vfx_<element>/hit`) with a small shake; a miss flies on 2 m past the target and fades. The attack's die
lands as the crescent arrives. In the ninja's chakra colour, as on the weapon; earth in its own.

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
   Kaien, Raiga and Kenji lose the ghost-warrior burst. Solen, Akira and Aiden
   already matched.
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
| Lightning (Rayo) | Storm Lash; Battle Static (*Estática de batalla*: no aura and no glow, only small jagged bolts crackling all the time on the hair, shoulders, arms and round the legs, more while empowered) | yellow, cyan | Storm Lash: his rule. A second burst: his request (2026-10-21), its name his; Battle Static is **new art** |
| Earth (Tierra) | Shattered Earth (the ground cracks, stone spikes, rocks tear loose and float up) | brown | Kenji Earth: his answer 1. The burst art is **approved** (2026-10-21: "me gusta tierra quebrada") |
| Shadow (Sombra), no element | Nightveil Mist | indigo | **Pending** (answer 3): not offered; jutsu later, demonic |
| Spirit (Espíritu), no element | Spectral Guardian | violet | **Pending** (answer 3): not offered; jutsu later, demonic |
| Light (Luz), no element | Heaven Pillar | white | The type stays (answer 3), its jutsu later: deity, angel and god. The burst: proposed |
| Void (Vacío), no element | Abyss Orbit | black | The type stays (answer 3), its jutsu later: demonic. The burst: proposed |

- **Lightning's second burst** (the owner, 2026-10-21: *"hazle una segunda
  aura a electricidad [...] sin el aura solo los rayos ocacionales"*, and by
  aura he means the ki burst round the body: *"sin eso"*). **Its name is his:
  *Estática de batalla*** (English *Battle Static*; id `cyan`, natural colours
  all five taken from his lightning set: navy, deep blue, his mid blue, pale
  cyan and white). Seeing the first version (then
  *Chispas vivas*, bolts now and then) he asked for more: *"quiero que se vea
  mas rayos, lo de ocacionalmente quitalo y ponlo mas regularmente y mas en
  potenciado que se vea mas"*. As built now: no rim, no halo and nothing
  rising round the body in any mode, only small, sharp, jagged bolts that
  crackle for two to four frames on the hair, the shoulders, the arms or
  round the legs, with a pinpoint flicker where one strikes, and **never a
  frame without them**: at least four on the body in a charge or a cast (up
  to five), three or four in a victory after its opening burst of bolts all
  over the body. **Empowered (potenciado)** it crackles harder: six or seven
  bolts in a charge, six or seven in a cast (more of them off the palm), five
  to seven in a victory, each about a third longer and forking more. Empowered means an
  enhanced jutsu in battle (the cast plays empowered) and the creator's chakra
  aura switched on (the idle aura, which only plays empowered, and the
  charge, cast and victory with it on). The other bursts look the same either
  way. In a cast the bolts jump along the casting arm and off its palm, behind the
  body when that arm is. Where a bolt may go: never on or in front of the
  face, never below the soles, never up into the battle's health bar (the
  hair's bolts crackle off its sides, short, never across the top of the
  head), and a bolt behind the body mostly shows, so the bolts counted are
  bolts seen. Its loop is 10 s (the
  other bursts loop every 2 s), so the bolts don't come back in the same
  places. It takes any colour (black: a black bolt in a thin bright edge) and
  reuses Lightning's grimoire emblem, orb and word. Its cyan is not added to
  the colour swatches (it sat beside the water blue). Lightning offers both
  bursts in the creator, like Fire. New art: waits for his approval.

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
  | Genjutsu | Adepto del Genjutsu (`Genjutsu Adept`) | Mente retorcida (C), Templo del Nirvana (A); no rank S since the owner removed Yasaka no Magatama (2026-10-22: "quitala del juego"; he will make something else) |
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
  does (an older or imported sheet) keeps it, marked "no es de tu clase" in the
  Jutsu step. Saves are not changed. Enemies and battles are not touched. (The
  companion Hana, a medic, had Yasaka no Magatama, a genjutsu, until the owner
  removed it on 2026-10-22; she has the Dragon Tsunami now, "Removed jutsu"
  below.)
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
  aniquilación (a Genjutsu Adept had Yasaka no Magatama too, until the owner
  removed it on 2026-10-22). A second (and third)
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
  fire. Outlines that are not black in his sheets (the lightning's blue ring)
  stay his. The raiju's brown and the crane's teal were his too until the
  owner changed them to the characters' black line (2026-10-22, *"2 cambia"*:
  solid jutsu get the characters' black line, energy none; see
  `docs/SPRITE_STYLE_GUIDE.md`, "Outline"). Like his other dark lines, the
  black line is never tinted.
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
- Lightning's second burst (*Estática de batalla* / Battle Static, his request
  and his name, 2026-10-21): approve or redo the art, now with bolts at every
  frame and more while empowered.
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
  ninja's elements **and its class's kind** (Templo del Nirvana at 7 for a
  Genjutsu Adept, Night Guy at 10 for a Taijutsu Master; no genjutsu of rank S
  since Yasaka no Magatama was removed, 2026-10-22), and
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
- Gaps the gate shows: Water had no S-rank jutsu and Wind few Element jutsu.
  **Answered 2026-10-21** ("Jutsu for the gaps" below): the Devouring Tide is
  Water's rank S; Wind gets the Gale Curtain (C) and the Whirlwind Tower (A).
  Still open there: two per gap or two in all, the 水 kanji, the gaps left.
  **His second round the same day** ("The gaps' jutsu, second round" below):
  the Devouring Tide is **rank A**, so **Water has no rank S again** (open).
  **Answered 2026-10-22**: Water's rank S is the **Dragón Tsunami**, and the
  Devouring Tide is renamed **Tsunami** ("The Tsunami and the Dragon Tsunami"
  below).
- **The elemental beasts as summons** (his rule, 2026-10-21: *"todos los
  elementales seran invocaciones que te ayudaran en el combate no ataques"*):
  how a summon works is to design (what it does on the field, how long it
  stays, its chakra, who may call it, the AI). **Jutsu that still show a beast
  as their attack** (`vfx: 'beast'`): the Water Dragon Bullet (water dragon,
  `water_dragon_suiryuudan`, B), the Lightning Hound (lightning beast,
  `lightning_hound_raidon`, B), the Wood Dragon (stone drake,
  `wood_dragon_jutsu`, the clan's A) and Night Guy (griffin, `night_guy_dragon`,
  S). Should they change now (another of his effects) or when summons exist?
  And do the creature forms woven into the S-rank signatures (the Great Fire
  Annihilation's fire dragon, the Kirin's dragon-headed bolt) count as beasts,
  or are they the S-rank art bar's "creature or form woven through the
  element"? The crane, the phoenix, the crows and the cobra have sheets that no
  jutsu uses.
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
  companion **Hana** (medic) kept Yasaka no Magatama (genjutsu), marked; since
  the owner removed it (2026-10-22) she has the Dragon Tsunami, Water's rank S
  (the builder's pick: the only rank S her nature and class allow; his to
  confirm).

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

**Approved in the game (2026-10-21):** "apruebo los 12 jutsus con excepcion del de tajo sangrante ya que hay que añadir algun sprite de sangre explotando hacia el lado donde se hace el corte para efecto de sangrado". All twelve are merged. The Bleeding Cut got its blood spray and the drops on the screen (`jutsu/bleeding-blood`, approved under his 24-hour delegation).

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
| **Mente retorcida** / Mind Twist (`genjutsu_mirage`; *Espejismo* / Mirage until the owner renamed it, 2026-10-22) | Genjutsu, C, Element | action, 2 chakra, one target at 9 m | WIS save, nothing on a success; on a failure 2d6 psychic and **Confused** for 2 rounds (one turn in four lost); **silent** | +2: 3d6 |
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
  P6; the owner made the Mind Twist and the Bleeding Cut silent): it doesn't start
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
- **Bleeding Cut's blood** (the owner, 2026-10-21: "hay que añadir algun sprite
  de sangre explotando hacia el lado donde se hace el corte para efecto de
  sangrado", then "las gotas de sangre manchan la pantalla cuando exitosamente
  se consigue el sangrado"); built on `jutsu/bleeding-blood`, **waiting for his
  approval**: on a hit, as the crescent crosses the target (150 ms after the
  blade comes down), a stylised spray of blood bursts from the chest toward the
  side the cut travels (mirrored when it goes left), its drops arc, fall and lie
  on the ground a moment, then fade (`vfx_blood/spray`, 12 frames at 12 fps,
  from `tools/world-sprites/vfx-blood.ts`; dark-red ramp with his dark line and
  a bright glint; drawn in front, kept below the face). When the cut leaves
  Bleeding (not on a miss, not if the foe falls), three drops splash onto the
  screen itself near the edge the cut went toward, clear of the HUD panels,
  scaled with the screen and not the zoom; they hold, run down and fade in
  1.7 s at speed 1 (faster at 2× and 3×), and nothing waits for them
  (`vfx_blood/screen`). When Bleeding hurts at the start of the ninja's turn a
  few drops fall from the wound (`vfx_blood/spray` drip). Blood has no element:
  the chakra colour never touches it (`seq.blood`, `bloodPlan.ts`).
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
  light shake); Mind Twist flies the eye-sphere half again as slow; Whirl as it was.
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
8. Mind Twist (then the Mirage) and Bleeding Cut: **his answer: silent** (piece P6): built (the
   rule above).
9. Who learns the Genjutsu, Kenjutsu and Taijutsu ones: his answer, *"9 los que
   elijan de clase genjutsu kenjutsu o taijutsu"*: the class gates them (built
   on the integration branch; the Mind Twist, the Bleeding Cut and the Rush are
   gated like the others).
Also not built (optional in the proposal): a style of cast per jutsu (P1), and
the Geyser putting out burning units in its circle.

## Jutsu for the gaps (proposed and answered 2026-10-21)

The nature gate showed gaps: Water had no rank S jutsu and Wind few. Asked
"¿Hago propuestas para llenar esos huecos?", the owner answered "2 propuestas";
the Spanish proposal (eight jutsu, all from his sprites, with mockups) was shown
to him and he answered (verbatim): *"luego en la creacion de jutsus para
rellenar 1 no 2 ola devoradora si 3 grulla no todos los elemtantales seran
invocaciones que te ayudaran en el combate no ataques , 4 si 5 si modifcar para
hacerlo area y que potencie las tecnicas de fuego que pasen por ahi y se vea
como efecto 6 no 7 si8 si"*.

So: 1 (Dragón de las mil fuentes) no; **2 (Ola devoradora) yes, Water's rank
S**; 3 (Grulla del vendaval) no; **4 (Torre del torbellino) yes**; **5 (Cortina
de vendaval) yes, made an area that empowers the fire techniques passing
through it, shown as an effect**; 6 (Fénix del ocaso) no; **7 (Haz de trueno)
and 8 (Polvareda de cascotes) yes**. Built on the branch `jutsu/gap-set` (made
from `jutsu/d-c-set`), **waiting for his approval of the in-game captures**.

### The elemental beasts are summons (decided 2026-10-21)

His rule, verbatim: *"todos los elementales seran invocaciones que te ayudaran
en el combate no ataques"*. The elemental beasts (the water dragon, the stone
drake, the wind crane, the lightning beast, the phoenix, the griffin, the crows,
the cobra) will be **summons that help in battle, not attack effects**. No new
jutsu uses a beast as its attack. How a summon works (what it does, how long it
stays, what it costs, who may call it) is designed later (Open questions).

### The five jutsu

Ranges convert at 1 square = 1.5 m. Names follow D24 ("Técnica de <Elemento>:
<nombre>"); the Japanese names were made up for the proposal and are not
franchise names.

| jutsu (id) | nature, rank, slot | use | effect | enhanced |
|---|---|---|---|---|
| **Ola devoradora** / Devouring Tide (`water_devouring_tide`; named **Tsunami** since 2026-10-22, below) | Water, **A**, Element (rank S and the S-rank slot until his second round: see below) | action, 5 chakra, **9 m cone** | STR save, half on a success: 5d8 bludgeoning to everyone in the cone, friends too; on a failure the wave **sweeps the target 3 m away from the caster** and **knocks it down**; it **puts out the flames** of everyone it reaches, saved or not, and **soaks the ground** it runs over | +3: 6d8, the cone reaches 11.25 m and opens wider |
| **Torre del torbellino** / Whirlwind Tower (`wind_whirlwind_tower`) | Wind, **A**, Element | action, 5 chakra, a 3 m circle up to 9 m away | STR save, half on a success: 5d8 bludgeoning to everyone in the circle, friends too; on a failure the tornado **drags the target 1.5 m toward its middle** (never past it) and **knocks it down**; it cuts the grass and bushes | +3: 6d8, 4.5 m |
| **Cortina de vendaval** / Gale Curtain (`wind_gale_curtain`) | Wind, **C**, Element | action, 2 chakra, a gale **2.25 m round** up to 6 m away | no save, no damage, silent: a **gale on the ground** (see below) that **fans the fire jutsu passing through it** | +2: 3.4 m round |
| **Haz de trueno** / Thunder Beam (`lightning_thunder_beam`) | Lightning, **C**, Element | action, 2 chakra, **9 m line** | DEX save, half on a success: 2d8 lightning to everyone in the line, friends too; lightning in water runs through it | +2: 3d8, the line reaches 11.25 m and runs wider |
| **Polvareda de cascotes** / Rubble Gust (`earth_rubble_gust`) | Earth, **C**, Element | action, 2 chakra, **4.5 m cone** | DEX save, **nothing on a success**; on a failure 2d6 bludgeoning and **knocked down**; friends in the cone too | +2: 3d6, the cone reaches 5.6 m and opens wider |

With them, the nature's offers (`src/rules/jutsuNature.ts`) grow: a Water
ninja's S-rank slot has its own jutsu at last (when it opens; a new ninja's is
locked), Wind has the Whirl (D), the Great Breakthrough Blade and the Gale
Curtain (C) and the Whirlwind Tower (A), Lightning and Earth a third rank C.

### The rules they brought

- **Knocked down on a failed save** (the Tide, the Tower, the Rubble Gust): the
  target is prone, like a shove's trip. Melee attacks against it have
  advantage and ranged attacks (kunai, Three Embers) disadvantage; standing up
  costs half its movement. **Only ninjas fall**: big creatures (the hydra) don't.
- **Swept or dragged on a failed save** (the Tide 3 m away from the caster, the
  Tower 1.5 m toward its middle): it moves 1.5 m at a time and stops where
  something stands in the way (a wall, a tree, a structure, another unit, the
  edge of the map), going as far as it can (half a metre less at a time) and
  staying where it hits (a shove that is blocked doesn't move at all). **It
  stops at least 1.2 m from any other unit, standing or lying**, so two ninjas
  swept or dragged together don't end up on top of each other. Off a ledge it falls (1d6 a level, and prone); into water its
  flames go out; into a river the usual water rules apply. **Only ninjas
  move**: big creatures don't. The move happens after the damage, then the fall.
- **Water puts out the flames**: the Tide takes *Burning* off everyone it
  reaches, saved or not.
- **The gale on the ground** (the Gale Curtain made an area, the owner's
  modification; **the numbers are the builder's proposal**):
  - It turns where it is cast, 2.25 m round (3.4 m enhanced), for **the rest of
    the round and two more** (it dies down as the third new round begins, like
    a water barrier fades). It hurts nobody, blocks nothing (not sight, not
    movement, not attacks) and is silent. Several gales may turn at once.
  - **"Potencia" (empowers), in 5e terms: a fire jutsu that passes through a
    gale deals one more damage die (two for a rank S), the same die as its
    own** (Fireball 3d8 → 4d8, Great Fire Annihilation 7d12 → 9d12): the
    damage half of an enhanced cast, with its area as it was aimed (it grows
    nobody into it the caster didn't aim at). It stacks with an enhanced cast
    (Fireball enhanced and fanned: 5d8). Why this rule: it is simple to read
    ("+1 dado"), it reuses the game's own idea of empowering, it is the same for
    every fire jutsu, and it never changes who is hit after the player aimed.
  - **Passes through**: the fire's flight from its caster to its target or
    point goes through the gale (Three Embers, Pursuing Flame, a Fireball on
    its way), or its area reaches into it (a Fireball bursting over it, the
    Dragon Fire Stream's line, a cone like the Dragon Fire Bomb or the Great
    Fire Annihilation), or its caster stands in it. A cone or a line counts
    only as far as it reaches: aimed past its length, a gale beyond its end is
    not fanned. Two gales fan it once.
  - **Whoever casts the fire**, friend or foe of the gale's maker: the wind
    doesn't choose. A Wind ninja can set it up for a Fire friend, and an enemy
    Fire ninja can use the party's gale too.
  - What it does not do (the earlier curtain's rule, dropped with the wall):
    give disadvantage to shots crossing it.
  - The AI doesn't cast the Gale Curtain (it plans attacks); enemy fire is
    fanned when it happens to cross one.

### How they look (his option A, from his sheets; nothing redrawn)

Each plays in its caster's chakra colour, like every elemental jutsu.
- **Devouring Tide**: the water aura round the caster, then the wave runs out
  along the cone (it holds 0.7 s at the end of the cone as it fades; each one
  it reaches is rolled for, hurt, swept and knocked down as the crest goes over
  them, nearest first): a row of his water columns (`wall_depth`, his water wall seen
  from the front) across the cone at its crest, spreading as the cone opens, two
  fainter rows behind it and his spray (`breath`) before it; a splash on each
  one as the crest goes over them, and a heavy shake (6) as it breaks at the
  end. Pointed mostly into the depth, the wave is seen from the side: his water
  wall (`wall`) along the crest. The columns stand among the ninjas (some in
  front, some behind).
- **Whirlwind Tower**: his leaf X (`hit`) warns at the point, his tornado column
  (wind `wall_depth`) rises there and turns while four of his small whirlwinds
  (`multi`) circle it, two behind and two in front; his leaf X on each one
  reached, a light shake (2), and the column fades.
- **Gale Curtain**: his low wind wall (`wall`, the one running across the
  screen) laid on the ground as two faint bands (42 %), one at the back and
  one at the front of the circle, rising when it starts and fading when it
  dies down, with a faint dashed ring showing its reach. It is drawn behind
  whoever stands in the circle or in front of it, so the ninjas in the wind
  stay in sight.
- **The fanned fire** ("que se vea como efecto"): from where the fire meets the
  wind it **burns brighter** (his frames drawn again over themselves as light),
  **a flying Fireball grows into his Great Fireball** there (its blast stays
  the Fireball's, only brighter: the area is the one aimed), **his wind
  vortex** (wind `bolt`) swirls round the fire at that spot in the gale's
  colour, and "¡Avivado!" floats over it; the log says "El vendaval aviva el
  fuego de …: un dado de daño más" ("dos dados" for a rank S). Aiming a fire
  through a gale says so before casting ("+1 dado", "+2 dados").
- **Thunder Beam**: his lightning beam (`stream` + `stream_head`) runs along
  the whole line (9 m, wherever the point was aimed: the beam drawn is the area
  that hits; the Dragon Fire Stream's line too), and a spark (`hit`) bursts on
  each one as the beam's head gets there.
- **Rubble Gust**: the earth aura rises while the ninja casts, his dust and
  stones (earth `breath`) roll out across the cone (one near the caster, then
  rows across it as it opens, each whole inside the cone: the dust starts in
  front of the caster's hand and ends where the cone ends) and a rock impact
  (`hit`) falls on each one reached.

### Open questions on the gaps

1. "2 propuestas": two per gap (as the proposal read it) or two jutsu in all?
   (Not answered.)
2. The Devouring Tide is a rank S without a giant 水 kanji (the S-rank art bar
   asks for one; there is no painted 水): approve it without, or will he paint
   a Water signature sheet? (Answered by the second round and 2026-10-22: the
   Tide is rank A, now the Tsunami; he painted the 水 and a water dragon for
   Water's rank S, the Dragon Tsunami.)
3. The gaps still open: Earth rank A (the Wood Dragon is the clan's), Water
   rank D, a third Fire D/C for a new ninja. Another short list (free pieces:
   the rock sphere, the water crescents, the fire wall)? (Not answered.)
4. The Gale Curtain's name: it is an area now, not a curtain. Keep "Cortina de
   vendaval" or rename it (for example "Campo de vendaval")?
5. The gale's numbers (2.25 m round, the rest of the round and two more, +1
   die to the fire that passes through, 2 chakra): confirm or change.
   **Answered (2026-10-21):** the +1 die (+2 for a rank S) "si me gusta".
6. Knocking down and sweeping only ninjas (big creatures stand firm): confirm.
7. A caster standing in a gale fans its fire whichever way it fires (as
   written above, "or its caster stands in it"): keep, or only fire that
   flies through the wind? **Answered (2026-10-21): keep** ("si").
8. The Tide, the Tower and the Rubble Gust deal bludgeoning damage, so a
   Taijutsu Master takes half (in a test battle the raider took 20 where the
   others took 40). Keep, or give them no resistance? **Answered
   (2026-10-21): keep** ("daño contundente si dejalo asi los maestros de
   taijutsu").
9. With a green chakra colour, the Rubble Gust's aura turns green but his
   earth dust stays mostly brown with green specks: that is how the shared
   chakra-colour recolour treats every earth sheet (not this branch). Fine,
   or should earth dust take the colour more?
10. The Spanish log says "¡… lanza Técnica de Agua: Ola devoradora
    potenciado!" for every enhanced jutsu (a shared line, pinned by tests on
    the integration branch): change it to "potenciada" (agreeing with
    "Técnica") for all of them?

## The gaps' jutsu, second round (the owner's answer of 2026-10-21; built on `jutsu/gap-set-2`)

He saw the Tide, the Tower and the Gale Curtain in the game and answered
(verbatim):

> *"ola devoradora es rango a hay que agregarle mas animacion como en el muro
> horizontal para que se vea mas ancho y bonita la animacion el sprite de el
> muro horizantal se ve muy bien entonces piensa como puedes combinar los dos
> muros para hacer algo mas contundente , y ahora va ver una dinamica como asi
> el viento potencia el fuego con el muro y el agua apaga el fuego , el agua
> tambien pone el suelo donde pasa mojado por 2 turnos que conduce electricidad
> y si se usa un jutsu de fuego se genera vapor que es como una cortina de humo
> que nubla la vision y hace daño por turno si estas en el area , Torre de
> torbellino me gusta pero tambien hay que hacerlo mas contundente pon el
> torbellino central mas ancho mediante se va mas arriba mas ancho esta el
> torbellino y pon alguna animacion que se separe un poco los vientos que
> pusiste alrededor para que corran alrededor en forma ondulada como el
> viento"*

So: the Devouring Tide is **rank A** with a wider, prettier wave that combines
his two water walls; a **new dynamic of the elements on the ground** (below);
and a more forceful Whirlwind Tower. Built on `jutsu/gap-set-2`, **waiting for
his approval of the in-game captures**.

### The Devouring Tide is rank A (his decision)

- Rank **A**, an **Element** slot's jutsu of Water (no longer the S-rank slot):
  like the other rank A (the Whirlwind Tower, the Dragon Flame Annihilation),
  a **9 m cone**, **5d8** bludgeoning, STR save for half; enhanced 6d8, an
  11.25 m cone that opens a third wider. The sweep (3 m), the fall and putting the
  flames out stay. It costs **8 chakra (+4 enhanced)**, more than the other rank A
  (his answer: *"mas chakra como 8 minimo"*; the enhanced cost as every 8-chakra
  jutsu's).
- Water has **no rank S jutsu, for now** (his answer: *"vacio por ahora"*;
  **replaced on 2026-10-22**: Water's rank S is the Dragón Tsunami, below). A new
  ninja picks rank D and C, so the Tide opens at level 7 like every rank A; the
  nature filter offers it to a Water ninja's Element slots.
- **A sheet saved with the Tide in its S-rank slot** (it was rank S before) gets it
  in an Element slot when it loads (his answer: *"si"*; `ultimateToElement` in
  `rules/jutsuNature.ts`, run by `migrateCharacter`): an empty Element slot if
  there is one; with both full, it takes the place of the **lower-ranked** of the
  two (the second slot's on a tie), and that jutsu is dropped. The S-rank slot is
  left empty for the player to fill.

### The elements on the ground (his dynamic; the numbers are our proposal)

His words: *"el viento potencia el fuego con el muro y el agua apaga el fuego,
el agua también pone el suelo donde pasa mojado por 2 turnos que conduce
electricidad y si se usa un jutsu de fuego se genera vapor que es como una
cortina de humo que nubla la visión y hace daño por turno si estás en el
área"*. In the engine: `src/battle/ground.ts` (pure and seeded); the state keeps
`wet` and `steam` by navigation cell (0.5 m).

- **Wind fans fire**: the gale on the ground (the Gale Curtain, above), kept as
  built.
- **Water puts out fire**: **every water jutsu that strikes** (the Tide, the
  Geyser, the Water Dragon Bullet) takes *Burning* off everyone it reaches,
  saved or not; and **wet ground puts flames out like a river**: a ninja who
  starts a turn on it stops burning, a fire jutsu's *Burning* doesn't catch on
  someone standing on it, bushes on it don't burn (the fire turns their water to
  steam instead). (There is no burning ground
  in the game: fire burns bushes and trees away at once.) A heal or a wall is no
  strike: the Healing Dew and the Water Wall soak nothing.
- **Water soaks the ground it passes over** "por 2 turnos": the cells of the
  water jutsu's area (a single target's 1 m round), not a river or a pond (water
  already) nor a tree's or a wall's cell. **Wet for the rest of the round and two
  more** (it dries as the third new round begins, like the gale; his answer: *"el
  resto de la ronda y dos mas"*), so everyone has at least two turns with it.
  Soaked again, it starts over.
- **Wet ground conducts electricity**: a lightning jutsu that **touches wet
  ground** (its area reaches a wet cell, or it is aimed at someone standing on
  one: hit or miss it lands there, as fire that misses still burns and steams
  where its target stands) runs across **the whole
  wet patch it touched** (the wet cells joined to it, diagonals included; a
  separate patch, or dry ground between, stops it). **Everyone else standing on
  that patch** makes a DEX save against **half the lightning's damage, halved
  again on a success** (the same numbers as lightning in a river), friends too,
  **and the caster himself if he stands on it** (as in a river; kept: *"si"*).
  Lightning in a river still reaches 4.5 m through the water, as before.
- **Fire on wet ground makes steam**: a fire jutsu (or an explosion) whose area
  reaches wet cells turns them to steam (the water is used up there; the rest of
  the patch stays wet). Explosions (tags, barrels) do it too (kept: *"si"*). The
  steam:
  - it hangs **the rest of the round and one more** (it thins away as the second
    new round begins; his answer: *"dura resto de la ronda y 1 mas"*);
  - **seeing into it** (as built): nobody outside sees a ninja in it (unless right
    beside it, 1.6 m), nor through it, so nobody throws a kunai or aims a
    single-target jutsu at a ninja in it, nor through it; a blast (a circle) can
    still be aimed at a point in the cloud (its surface is seen), not past it.
    **A blow into it from outside has disadvantage** (the target can't be seen;
    from inside out, or both inside, it evens out). A ninja in the steam is out
    of every watcher's sight, so it can Hide there;
  - **seeing out of it** (his answer: *"mas bien que los enemigos desaparezcan de
    la vision de ese personaje"*): for a ninja standing in the steam, **the foes
    outside it vanish from its sight**, as a hidden foe does (`steamHides` in
    `battle/map.ts`), except one right beside it (1.6 m). It can't aim anything
    that needs to see its target at them: no kunai, no single-target jutsu, no
    blast at a point outside. A cone or a line needs no target and can still be
    sent out blind; it hits whoever is on it. A ninja on the AI in it knows only
    the plan it had made (an enemy's committed plan goes on); with no plan it
    walks out first. On the screen, while the acting ninja stands in steam, the
    foes outside are drawn as a hidden foe is (faint, no health bar, not on the
    minimap), and aiming at one says "Sin línea de visión: el vapor tapa la
    vista". A Mirai standing in it foresees nothing out of it either (the Eye of
    Tomorrow needs sight);
  - **it burns: 1d6 fire, no save, to whoever starts a turn in it** (its burns
    are the fire's caster's);
  - **wind blows it away** (his answer: *"puede ser eliminada con ataques
    elementales de aire"*): **every wind attack** clears the steam its area
    reaches: a cone's or a line's area and the caster's own cell (so a ninja can
    blow the steam off from inside it), a circle's area (the Whirlwind Tower, the
    Hurricane Star), a gale starting to turn (the Gale Curtain); a single-target
    one along its path to its target. A wind jutsu that is no attack (the Breeze
    Mantle) doesn't. On the screen the steam it touched is carried off away from
    where the wind came from (the caster, or a circle's middle), stretching out,
    with streaks of wind through it, and thins out in about a second; the log
    says "El viento se lleva el vapor" ("The wind blows the steam away").
- **The AI knows**: a ninja on the AI never stops in steam (it may walk
  through); standing in it, it walks out before acting, or, when it can do its
  plan from right there (a blow at a foe beside it), acts first and walks out
  after; with its action spent in it (a charge that landed there) it walks out
  with the movement it has left before ending its turn. It doesn't see a foe lost
  in the steam, nor, standing in it, a foe outside it (unless right beside it),
  and weighs lightning on a wet group
  (each foe on the patch it would reach counts half, a friend there against it).
- **How it looks** (wet ground and steam are never in a chakra colour):
  - wet ground: a dark sheen over the soaked cells, its edge softened, with a
    few glints of light; under the Tide it darkens as the crest goes over;
  - the lightning across it: jagged arcs run out over the patch from where it
    struck, in the caster's chakra colour, his lightning spark (`hit`) bursting
    along it, the water lit up;
  - steam, a curtain: the camp's smoke (`campsite/smoke_tall`, `camp/smoke`: no
    element sheet has grey smoke) on every steaming cell, at different frames,
    some turned round, spread wider than tall so the columns run together into
    a bank; a white veil of overlapping billows over each row of it, in front of
    whoever stands in that row; it rises in as it forms;
  - a ninja on fire (*Burning*): his fire aura burns round the ninja, faint,
    while it lasts; when water or wet ground puts it out, the flames go and a
    puff of steam (the camp's small smoke) rises off the ninja, so "el agua
    apaga el fuego" shows on the map, not only in the log;
  - a bush that burns stands until the fire reaches it (it used to vanish as
    the jutsu was cast);
  - aiming at someone the steam hides says so: "Sin línea de visión: el vapor
    tapa la vista";
  - the log: "El suelo queda mojado", "¡El rayo corre por el suelo mojado!",
    "Fuego sobre suelo mojado: sube vapor y ciega a quien esté dentro", "El
    vapor quema a …", "El viento se lleva el vapor", "El vapor se disipa", "El
    suelo mojado se seca"; a blow into the steam says "dentro del vapor".

### How they look now (his pieces moved, scaled, layered and timed; nothing redrawn)

- **Devouring Tide** ("combinar los dos muros"): his horizontal water wall
  (`wall`, the one he likes) laid along the run in lanes across the whole
  width of the cone, a wide body of water with its front at the crest, rising
  as it sets off; his water columns (`wall_depth`) stand along the near half of
  the crest as its face, his spray (`breath`) before it; what it leaves behind
  settles low and fades; at the end of the cone the water sinks back (his rise
  played backwards) and his spouts (`blast`) burst along the crest as it breaks.
  Pointed into the depth, the two swap: his wall stands along the crest as the
  face (two rows) and his columns trail behind it as the body. The wet ground
  darkens under it as the crest goes over.
- **Whirlwind Tower** ("más ancho mediante se va más arriba"): his tornado
  column (wind `wall_depth`) rises as a **funnel**: his frame cut into 2 px
  strips, each stretched across by how high it is, from as wide as his column at
  the foot to 2.6 times as wide at the top (wider for the enhanced tower), with a
  second turn of it behind, mirrored and fainter; **six** of his small
  whirlwinds (`multi`) come off it, spread out and **run round it on wavy paths**
  ("en forma ondulada"): each speeds up and slows, swings in and out and rides up
  and down, at three heights, in front of and behind whoever stands there.

### His answers on the second round (2026-10-21)

To the eleven questions we asked (the Tide's numbers, the ground's numbers, the
steam), verbatim:

> *"1 vacio por ahora 2 mas chakra como 8 minimo 3 el resto de la ronda y dos
> mas , 4 dura resto de la ronda y 1 mas puede ser eliminada con ataques
> elementales de aire 5 si me gusta , 6 si 7 me vale 8 si 9 lo dejamos 10 mas
> bien que los enemigos desaparezcan de la vision de ese personaje 11 las
> dejamos"*

So (built on `jutsu/gap-set-2`, the rules above say each one in full):

1. **Water's rank S stays empty for now.** (Replaced on 2026-10-22: it is the
   Dragón Tsunami, below.)
2. **The Tide costs 8 chakra (+4 enhanced)**, up from 5 (+3); the rest of its
   rank A numbers (9 m cone, 5d8, enhanced 6d8 and 11.25 m) as built.
3. **Wet ground: the rest of the round and two more**, as built.
4. **Steam: the rest of the round and one more** (was two more), 1d6 fire with
   no save at the start of a turn as built, and **every wind attack blows it
   away** (its area, the caster's own cell for a cone or a line, a single
   target's path, a gale), seen drifting off on the screen, with a log line.
5. **Lightning across wet ground** (half the damage, DEX save for a quarter,
   friends on the patch too): kept.
6. **Explosions make steam on wet ground**: kept.
7. **Steam drawn with the camp's grey smoke**: kept.
8. **A sheet with the Tide in its S-rank slot gets it in an Element slot** when it
   loads (an empty one, else in place of the lower-ranked of the two).
9. **The caster on his own wet patch is shocked too**: kept.
10. **From inside the steam, the foes outside vanish from that ninja's sight**
    (unless right beside it), instead of the old rule (no circle aimed out, cones
    and lines allowed): nothing that needs to see its target can be aimed at
    them, the AI knows only the plan it had, and the screen draws them as hidden
    foes for that ninja. Seeing into the steam stays as it was. A cone or a line
    can still be sent out blind.
11. **The saves' dice windows over the Tower**: kept.

## The Tsunami and the Dragon Tsunami (the owner's decisions of 2026-10-22)

He painted a kanji and a water dragon over our widest wave frame for an S-rank
version of the Tide (`docs/reference/tide-s-owner-reference.jpg`: *"a la ola
pasame el sprite donde se ven mas olas para agregarle un kanji y una bestia
animada que sera el jutsu en version mejorada clase s"*). Seeing it animated in
the game he answered (verbatim, 2026-10-22):

> *"rango S ola si me gusta la animacion la ola normal se llama tsunami y la
> rango s es dragon tsunami"*

and then, on the numbers we proposed:

> *"aprovado los numeros de la ola por ahora"*

So:

- **The rank-A Tide is the Tsunami**: *Técnica de Agua: Tsunami* / *Water
  Technique: Tsunami* (D24's "Técnica de <Elemento>: <name>"; the hotbar's short
  label *Tsunami*). Same id (`water_devouring_tide`), same rules (above), so
  saves are untouched.
- **Water's rank S is the Dragon Tsunami**: *Técnica de Agua: Dragón Tsunami* /
  *Water Technique: Dragon Tsunami* (short label *Dragón Tsunami* / *Dragon
  Tsunami*), id `water_tide_s`. This replaces his earlier *"vacio por ahora"*:
  Water's S-rank slot is no longer empty. It is a jutsu of its own in the
  S-rank slot (category Ultimate, like the Great Fire Annihilation and the
  Kirin), learnt through the usual rules: the nature filter offers it to a Water
  ninja's S-rank slot (first, before the genjutsu and taijutsu S-rank), and the
  slot opens at level 10. A sheet that held the Tide in its S-rank slot still
  gets the Tide moved to an Element slot (`ultimateToElement`), with its S-rank
  slot left empty for the player to fill (now possibly with the Dragon Tsunami).
- **Its numbers, approved by the owner for now (2026-10-22): «aprovado los
  numeros de la ola por ahora»**:
  - action, **12 chakra** (the Tsunami's 8 plus its enhancement's 4), **+4** to
    enhance;
  - an **11.25 m cone, 80 degrees wide** (the enhanced Tsunami's);
  - **6d8 bludgeoning**, STR save for half; enhanced **8d8** (an S-rank's two more
    dice) and the cone reaches farther (14 m) and opens wider (about 107
    degrees);
  - on a failed save the wave **sweeps the target 3 m away** and **knocks it
    down** (a ninja; big creatures stand firm); it **puts out the flames** of
    everyone it reaches;
  - it **soaks the ground** it runs over, which stays wet **one round longer than
    the Tsunami's**: the rest of the round and three more (`wetRounds` in
    `src/battle/jutsu.ts`; soaked again by a shorter water jutsu, a cell keeps
    the longer count).
- **Its look** (his art, approved: *"si me gusta la animacion"*): the Tsunami's
  wave with his curl, his water dragon (surges out of the curl, roars, dives at
  the break) and his kanji 水 with its glow riding the crest
  (`tools/refs/tide-s-from-ref.py` → `vfx_tide_s`), run a little slower (2.2 s
  and the 0.9 s break).
- **Practice**: every water ninja in the practice battles (`#combat`) can cast it
  whatever its level, so it can be tried; missions are untouched. Hana has it in
  her S-rank slot since the owner removed her Yasaka no Magatama (2026-10-22;
  "Removed jutsu" below).

## Jutsu effects, round 1 (proposed 2026-10-21; the owner's answer the same day)

The owner asked for the effects of the jutsu already in the game to fit what
each one is, mostly by combining his VFX pieces (*"por ejemplo al jutsu que son
llama del dragon puede salir una cabeza de dragon como la de fire annihiliation
y disparar los proyectiles de fuego ... tu dandome ideas y opciones y yo
aprovandolas"*). A Spanish proposal with options for 12 jutsu was shown to him.
His answer (verbatim):

> *"1 a 2a3 pendiente 4 vamos a crear un nuevo vfx para este 5a 6 vamos a crear
> una animacion de personaje para este pendiente 7  no quiero usar la bestia
> elemental quiero agarrar la cabeza de dragon del fuego o del kirin para
> cambiarla a agua y ponerla en la punta del chorro y que sea como los otros
> proyectiles que sigue una trayectoria aletoria el proyectil antes de pegar al
> objetivo haz lo mismo con este 8a 9 a 9 a 11 vamos a crear un nuevo vfx para
> que sea en la mano como en el casting de chidori y que haga una estocada con
> este 12 a y hay que agregar animacion al personaje porque este ataque no es
> con arma es un combo cuerpo a cuerpo que debeberia tener animacion"*

In the same message, about new jutsu: *"todos los elemtantales seran
invocaciones que te ayudaran en el combate no ataques"*: the elemental beasts
(water dragon, stone drake, wind crane, lightning beast, phoenix...) are to
become summons that help in battle, not attack effects. So no beast is added to
an attack here, and the Water Dragon no longer flies the water beast.

How his answer was read (he can correct it): 1 A, 2 A, 5 A, 8 A, 9 A, 12 A; he
wrote "9 a" twice and no 10, read as 10 A (the recommended one); 3 (Night Guy)
and 6 (64 palms, a character animation later) pending; 4 (Wood Dragon) and 11
(a new effect in the hand, as the lightning cast style, with a thrust) need new
art (built after, see the two rows at the end of the table); "haz lo mismo con
este" after 7 read as 8's bullets flying varied paths too.

Built on `vfx/ideas-round1` (on top of `jutsu/d-c-set`), **waiting for his
approval of the in-game captures**. Only his pixels: his sheets moved, scaled,
turned, layered, timed and recoloured (`tools/world-sprites/vfx-round1.ts`
makes the new group `vfx_dragon`; `tools/world-sprites/vfx-new-r1.ts` makes
`vfx_wood` and `vfx_hand` for 4 and 11). The fire, water, earth and lightning
ones still take the caster's chakra colour.

| nº | jutsu (id) | what plays |
|---|---|---|
| 1 | Llama Dragón (`dragon_fire_bomb`) | His flame wall rises behind the ninja (0.56 s); his Great Annihilation dragon head (his pixels, 1x) rises out of it with a fireball in its mouth (0.95 s) and spits 5 fireballs (7 enhanced) in a fan over the cone (1.35–1.75 s), each bursting on the one it reaches or at the cone's end; the head burns away with the Annihilation's own burn (1.7 s) and the wall goes down with its frames backwards. The name floats at the usual height (higher, it ran into the round counter and the initiative bar). |
| 2 | Fuego del dragón (`dragon_fire_stream`) | His wall and head at half size behind the ninja; his stream leaves the mouth (1.1 s) and reaches the **end of the line** in 0.4 s (not the clicked point), his fire hit on each one as it gets there, at the height the stream passes it; the head burns at 2 s. |
| 5 | Cadenas selladoras (`adamantine_sealing_chains`) | His chain (the chakra stream without its head) leaves the chest and stretches to the target in 0.4 s; his chakra star on it (0.96 s) and his gold seal circle opens under its feet (only its opening and closing frames, no pillar, drawn under the target); the chain stays taut to 1.9 s, then fades. The seal circle opens only on a target that is sealed: one that resists takes the star and the damage, no circle. |
| 7 | Dragón de agua (`water_dragon_suiryuudan`) | No beast. His fire dragon head (no neck), in his water colours (each of his colours placed by brightness among his water stream's), at half size, turned along its flight, on the tip of his water stream: the stream leaves the hands and the head forms on its tip 1.3 m out (so it is never drawn over the caster), then flies a varied path (seeded, bending before it hits; a bend that would dip the body into the ground swings up instead), the stream laid behind it all the way as its body; his splash on the hit, and the body fades whole in 0.3 s. |
| 8 | Balas de tierra (`earth_spear_doryuudan`) | His rock explosion bursts 1.5 m before the ninja; three volleys of his rock bullets (three each, 0.7 / 0.85 / 1 s) fly the whole line in 0.9 s, each bullet on its own varied path through the ones it reaches; his bullet burst on each one as a volley passes, the last volley breaking at the line's end. |
| 9 | Danza de la luna creciente (`crescent_moon_dance`) | Three blows (L, L+0.25, L+0.5 s; L = arriving), each sending his chakra crescent out of the blade on the cut itself (the sword's strike frame, never its wind-up) through the target and 1 m on, high, middle and low; his chakra star at L+0.81 s. Enhanced: five. |
| 10 | Templo del Nirvana (`temple_of_nirvana`) | His vortex opens beside the circle on the caster's side, or on the far side when that would put it within 2.5 m of the caster (any cast closer than about 6.7 m with his 3 m circle), and his crows come out of it (his summon row, never seen before); the flock dives on a diagonal to the middle (1.06–1.66 s), his pillar with feathers rises there, his genjutsu hit on each one at 1.99 s. The eye orb no longer flies. |
| 12 | Huracán de la hoja (`leaf_hurricane_senpuu`) | Not a weapon attack: the weapon is put away (like the Rush) and the ninja throws an unarmed combo, a new pose (`combo`, 8 frames: guard, jab, cross, the spin shown turned away, a spinning back kick, coming round, a finishing kick, guard); on each kick and half turn one of his wind crescents goes out to one of those it reaches, setting off 0.8 m out toward it (not on the ninja's body), and his wind X with leaves bursts on it. The creator's pose bar shows the spin turned away too. |
| 4 | Dragón de madera (`wood_dragon_jutsu`) | **New effect, a proposal.** No beast (the stone drake no longer flies). His wood dragon lifted out of his own hotbar icon (`tools/refs/wood-dragon-from-ref.py`: his pixels as the icon converter takes them, his green ground left out, his colours de-noised from the JPEG into 40 of his, his dark line added where the cut edge met the air), each of his pixels 2x2 (about 2.5 m tall). From 0.56 s roots break out of the ground in a row from the ninja toward the target, 90 ms apart (the near half of his left coil and its mirror, rising and sinking); his dragon rises out of the ground just behind the target, facing it (behind it on screen), with his loose leaves flung up; it sways on its root (RotSprite, ±3°), rears back and brings its head down (to −30°); his rock bullet burst and his rock explosion on the target, his leaves again, a shake; it falls apart from the top down (pieces of 3x3 of his pixels dropping). Enhanced (it constricts): it holds on 0.6 s instead of 0.16 s. In the chakra colour like the earth (his leaves stay green, as the earth's moss does; brown and green chakra keep it his). |
| 11 | Chidori (`chidori_lightning_blade`) | **New effect, a proposal.** The weapon is put away (like the Rush and the combo: a rule, it waits with the free interaction spent) and the lightning gathers in the bare hand before the ninja runs in (0.76 s): the hand drawn back low behind the hip (the sword's wind-up frame, held, the hand empty: the pierce's chamber held the lightning over the chest), his lightning hit's two smallest frames flickering there, flipped a different way each frame (bigger frames enhanced); it is carried in the hand on the run with his lightning bolt's trailing spark behind it; on arriving the ninja thrusts the hand (straight into the pierce's lunge, bare-handed), and his lightning hit lands on the target on that same frame, the ball gone. Already beside the target, it gathers there first. In the caster's chakra colour. No bird, no symbol. |

The pieces this needed (the proposal's P1–P6), all in the screen
(`playback.ts`, `vfxSprites.ts`, `renderer.ts`, `paths.ts`): a piece of a sheet
held and moved at a point, rising out of a wall (P1); effects that start from any
point, as the dragon's mouth (P2); volleys of projectiles each with its own time
and path (P3, the varied paths seeded per cast); a beam that grows to its end
and stays (P4, and a line's beam reaching the line's end); blows and effects
timed after a melee jutsu arrives (P5); and an effect drawn behind or in front
of a unit by depth (P6). The battle engine is not touched, only each jutsu's
data for the screen (`JutsuSeq.stage`) and the Leaf Hurricane stowing the
weapon, which is a rule: with the free interaction spent and a weapon in hand it
waits, like a jutsu with seals.

### The Chidori becomes an activated state (decided 2026-10-21; built on `jutsu/chidori-active`, waiting for his yes)

The owner, after sending his silver-haired paint-over (a tactical vest shown with
and without the long coat, and lightning crackling in the near hand): *"quiero que
copies el sprite de la mano de rayo para ponersela al efecto de chidori porque
chidori sera una habilidad que actives y que mientras esta activada tiene tu
personaje el chido y efectos vfx (aura , algunos sprites alredor de rayos
alrededor y cuando camina el personaje se va rompiendo el piso )"*.

- The Chidori (`chidori_lightning_blade`) is no longer a one-shot thrust: the
  ninja activates it, and while it is active the lightning is held in the hand.
- The lightning in the hand is his sprite from that paint-over, copied 1:1 (his
  pixels, in the caster's chakra colour like the other lightning).
- While active: an aura, small lightning sprites crackling around the ninja, and
  the ground cracks under his steps as he walks.
- How it plays, his answers the same day to our proposal (*"1si 2B pero al
  momento de acercarte al primer enemigo en rango ataca automaticamente lo mismo
  para el rasengan 3 si 4 terreno dificil 1 turno para aplicar ese efecto"*):
  1. Activating it is a bonus action and costs its chakra (5, as before).
  2. It stays charged for up to 3 rounds. The moment the ninja moves within
     reach of the first enemy, the blow goes off by itself: one melee jutsu
     attack, 5d8 lightning as before, and then the Chidori ends. The Rasengan
     will work the same way when it is built (it is not a battle jutsu yet).
  3. While charged: his lightning hand, an aura, small lightning sprites around
     the ninja, and the ground cracking under each step.
  4. The cracked ground is difficult terrain for 1 turn.

How it is built (`jutsu/chidori-active`, waiting for his approval; `src/battle/charged.ts`, generic
for any jutsu with `handCharge`, so the Rasengan can use it as it is):

- **Activating** (`chidori_lightning_blade`, now a *Bonus Action*): pays its chakra (5; enhanced, as
  Raikiri, 8 and one more damage die on the blow), puts the weapon away for free (the hand holds the
  lightning), and charges the hand. One charge at a time. It is loud (it starts the fight in the
  stealth phase). Already within reach of a foe, the blow goes off at once.
- **The blow**: one melee jutsu attack, an attack roll (jutsu attack bonus against AC; it used to be
  a CON save for half), 5d8 lightning, lightning through the water as before. It goes off the moment
  one of the ninja's own moves (a walk, a dash, a flash-in, a Shooting-Star Thrust or a swap landing
  it there; the AI's moves too) brings it within reach (1.5 m; a hydra's head 2.5 m more) of a foe it
  knows about (not hidden from it, no metal wall between): the nearest, ties to the first id. The
  walk stops there (on a cell it can stand on), the movement not walked is kept, and the action stays
  free (a weapon blow can follow). A foe walking up to the charged ninja does not set it off, nor
  does being pushed.
- **How long**: the activation turn is the first of its 3 rounds; at the start of the ninja's third
  turn after it, the charge fades unused.
- **What ends it early** (the builders' choice): the ninja falls (any 0 HP state); its chakra is
  sealed; it lets the hand go, by weaving hand seals for another jutsu (Kawarimi too) or by drawing
  the weapon. Each end is told in the log.
- **Cracked ground**: every 0.5 m cell the charged ninja steps on in the fight cracks (not water).
  It is difficult terrain (a step into it costs double), for everyone, the ninja too, until the
  start of the ninja's next turn, so every other unit has one turn with it (a round later in any
  case, should the ninja take no more turns). Kept as `cracks` on the battle state, by cell "c,r".
  The elements on the ground being built on `jutsu/gap-set-2` (wet ground, steam) are kept the same
  way (`wet`, `steam`): merged, the two can share map.ts's `cellKey` and its 'ground' event.
- **The AI**: charges the hand when a foe is within this turn's walk plus reach, then walks into
  reach (dashing when the walk runs out); while charged it neither throws kunai nor weaves seals
  (both are worth little then), and a long weapon's reach doesn't stop it short of the hand's.
- **On the screen**: his lightning in the near hand, copied from both paint-overs
  (`tools/refs/chidori-hand-from-ref.py` → `vfx_charged/chidori_hand`, flickering between the vest's
  ring and bolts and the coat's burst, mirrored when the ninja faces left), the lightning aura round
  the ninja, Battle Static's small bolts crackling on and round the body (in the charge's colour,
  whatever the ninja's own burst), and a crack under each step (`vfx_charged/ground_crack`, new art,
  four variants). The owner on the first cracks (2026-10-22): *"las grietas en el piso deben ser mas
  contundentes profundas se ven muy debiles ahora"*. So each is a heavy fracture about a metre
  across: deep black fissures 2–4 px wide forking out of the pit, a shadowed upper lip and a lit
  lower one (cut into the ground), torn soil and lifted slabs of ground; it splits open in 3 frames
  with a dust puff and thrown chips (`vfx_charged/ground_crack_dust`) and lightning flickering out
  in its depths, holds, and fades when it mends. All in the caster's chakra colour but the cracks;
  his colours at the default.
  The blow is his thrust of round 1 (answer 11) with the charged hand.
- **Open for him**: the attack roll in place of the old save; whether the cracks slow the ninja who
  made them; whether a foe walking into the charged ninja's reach should set it off too; the HUD's
  button charges it plain (enhanced through the engine only, for now).

The vest and coat in the same picture are not a new character: *"el chaleco no es
de jonin parece mas como tactico militar solo cambiale los colores y no lo hagas
personaje es parte de los sets"*. They become clothing pieces in the sets, with
new colours.

## Jutsu names, and a removed jutsu (the owner's decisions of 2026-10-22)

Renamed (the ids stay, so saves need nothing):
- `rasenshuriken_wind` (Wind, S): **Técnica de Viento: Estrella Huracán** /
  Wind Technique: Hurricane Star, 旋風星 (Senpūsei). Was the Rasenshuriken.
- `genjutsu_mirage` (Genjutsu, C): **Técnica de Genjutsu: Mente retorcida** /
  Genjutsu Technique: Mind Twist, 心捩じりの術 (Kokoro Nejiri no Jutsu). Was
  *Espejismo* / Mirage. He named it "Mind Twist"; "Mente retorcida" is the
  builder's Spanish (if he wants "Mind Twist" in Spanish too, it is one line).
- Earlier the same day: `body_flicker` **Desvanecer** / Vanish and
  `leaf_hurricane_senpuu` **Patada huracán** / Hurricane Kick.
- Night Guy keeps its name: he will rename it himself.

### Removed jutsu

Yasaka no Magatama (`yasaka_magatama`, Genjutsu, S): *"quitala del juego"*. He
will make something else later. So the Genjutsu Adept has no rank S of its own
for now; its S-rank slot offers its element's (and nothing for Light or Void).
- **Hana** (Water, medic), the only sheet that had it, has the **Dragon
  Tsunami** (`water_tide_s`) in her S-rank slot: the only rank S her nature and
  class allow (builder's pick, his to confirm).
- **Saved sheets** (the hero, the roster, a mission under way, an imported
  sheet) that still name it load with a replacement (`refitRemoved`,
  `src/rules/progression.ts`, called by `migrateCharacter`): the slot gets the
  best jutsu the ninja may learn there (what its nature and growth's elements,
  clan and class allow), of the removed jutsu's rank or lower, not one another
  slot holds; a genjutsu first, then its own elements', then the rest, the
  highest rank first. A saved sheet is a made ninja and keeps its ranks (as on
  a type change), so a lost rank S becomes a rank S: a Fire genjutsu adept gets
  the Great Annihilation, a Light taijutsu master Night Guy. With nothing to
  offer (a Light or Void genjutsu adept) the slot is left empty, as a type
  change leaves it. Its projectile sheet (`vfx_chakra/multi`) stays in the
  repo: it is one sheet of the generated chakra set (every element's set has a
  `multi`), no other jutsu flies it today, and deleting art is his call.

### The colossal hydra, guardian of the fortress (the owner, 2026-10-28; not built)

His: *"una hydra colosal que esté adentro de una fortaleza, va a ser el guardia de la fortaleza...
cada cabeza estaría separada para que incluso si le pegas con una bola de fuego solo le des a una
cabeza... mide 2.5x del personaje... cada cabeza está saliendo del cuerpo con su cuello largo en
horizontal volteando a la izquierda, ataca haciendo mordidas y lanza ácido, misma dinámica que este
pequeño; el pequeño sería como la versión introductoria"*. Approved basic version:
`docs/mockups/colossal-hydra-concept.png` (after his two cuts: nothing of the body comes forward,
and no body along the back wall; only the body on the right).

- **Five heads** (the owner, 2026-10-28, with his third backdrop: *"lo pondremos ahora con 5
  cabezas para que no abarque todo el mapa"*; first seven). His design:
  `docs/reference/colossal-hydra-backdrop-v3-owner-reference.png`, the fortress courtyard with the
  body on the right and five long necks painted in, cut horizontally at five heights, and his head
  poses `docs/reference/colossal-hydra-head-poses-owner-reference.png`. The body and the painted
  necks are never a target.
- Each head is **2.4 m** long, facing left toward the gate (the owner, 2026-10-28: *"a 2.4 m"*).
  At 2.4 m his heads' necks match the necks painted in his third backdrop
  (`docs/mockups/colossal-hydra-five-heads-2.4m.png`); at 3.3 m they came out about 40 % thicker
  (`-3.3m.png`). Before: 4.4 m (his first "2.5x del personaje"), then 3.3 m (*"las cabezas las
  bajamos a 3.3"*).
- Each head is a unit in its own lane, as far from the others as the backdrop allows: with five
  heads in his third backdrop the nearest two are about 7 m apart, so a Fireball (1.5 m) only
  ever catches one. (The game's biggest area, 4.5 m enhanced, could catch two heads less than 9 m
  apart; that was true at 8 m too.) The necks take no damage.
- The small hydra's rules (`battle/hydra.ts`): each head has its own HP, bites and spits (acid
  instead of venom), is cut at 0 HP and grows back unless the stump is burnt, electrified or
  blown up; the hydra dies when every head is down at once. Ours until he says otherwise: a bite
  reaches about 6 m in front of the head (the neck stretches), the acid about 12 m.
- The art: card 11 of `tools/refs/template/TARJETA_DE_PROMPT.md`, the casino's style and quality
  (his words). A neck is horizontal on screen at its painted neck's height, so each head's lane
  (depth) and height over the floor trade off. In his third backdrop the floor starts halfway down
  (about 14 m of depth) and the top two necks run along the wall, so those heads are in the air
  (about 4 m and 2.3 m or more over the floor): reaching them in melee needs a jump or height. The
  long neck is the head frame's own last stretch, repeated up to the painted neck. His first two
  backdrops and the bite strip v2 (seven heads) stay as references.

