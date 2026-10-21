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
  shove and knock prone.
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

## Language, sound and tips

- Battle, missions and camp in **Spanish and English** with a toggle; the game
  starts in the browser's language and remembers the choice. The character
  creator and the older screens follow later.
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

- None for now.

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
