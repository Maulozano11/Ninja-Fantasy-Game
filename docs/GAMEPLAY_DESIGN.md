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
- **Maps are 2–3 screens wide**; the camera follows the active character and
  pans to targets and effects.
- **No visible grid.** Movement is free and measured in meters, like
  *Baldur's Gate 3*. While a turn is planned, the reachable ground is softly
  highlighted and the path shows its cost.

## Turns and dice

- **Individual initiative**: d20 + DEX; allies and enemies take turns in that
  order.
- **Each turn**: Action, Bonus Action, Movement and Reaction (D&D 5e). Hiding,
  shoving, jumping and climbing are actions too.
- **Dice**: every roll shows as a quick d20 over the acting character, with a
  button to speed it up. The big dice window is kept for criticals and
  important checks.

## Elevation (at most 3 levels)

- +2 to hit from higher ground, −2 from lower ground.
- Ranged attacks reach further from high ground.
- Falling deals damage; enemies can be shoved off ledges.
- Climbing: ramps, stairs and vines, plus ninja jumps and wall runs paid with
  movement or chakra.

## Cover

- Half cover (+2 AC) and three-quarters cover (+5 AC), judged from the
  attacker's line of sight.
- Cover can be destroyed: trees burn, earth walls break.
- Crouching behind cover helps you hide; it costs a Bonus Action.

## Stealth

- Battles open with a **stealth phase**: enemies patrol with visible vision
  cones and the party moves hidden. When someone is spotted, initiative is
  rolled and the turns begin.
- Bushes, tall grass, smoke and shadow let a character hide: a Stealth roll
  against the enemies' passive Perception.
- Attacking from hiding gives advantage and extra surprise damage.

## Water and elements

- **Shallow water** doubles the movement cost, puts out fire and conducts
  lightning. **Deep water** must be swum, or walked on by spending chakra.
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
- **Animated attacks**: the attacker runs in and strikes, with damage numbers,
  screen shake and the jutsu effects from the sprite system.

## Party, missions and defeat

- A party of up to 4. Each ally is played by a person or by the AI, depending
  on how many players are in the session.
- Usually 3–6 enemies; missions can use more or fewer.
- Objectives: defeat everyone, stealth assassination, escape, protect someone,
  survive N turns.
- At 0 HP a character is **downed** and makes death saving throws; allies can
  revive them.

## Controls

- Mouse and touch.

## First map

- A forest with a river, a bridge, hills, bushes and a clearing.

## Mockups

First map (forest, river, bridge, hill camp), approved as the visual direction
when the owner signs it off:

- `mockups/battle-stealth.png`: stealth phase (party hidden in bushes, vision
  cones, suspicion meter, interactable tags).
- `mockups/battle-combat.png`: a combat turn (initiative bar, reachable area
  without a grid, path in meters, cone preview with hit chances and cover,
  last roll, action bar, ability tooltip).

Art direction from the owner: high-quality painted backgrounds behind the
battlefield; everything destructible or interactable (trees, bushes, rocks,
barrels, crates, campfire, tent, lanterns, signposts, fences) is a 16-bit
sprite, plus ambient life (birds, butterflies, fireflies, smoke, lily pads).

## Open questions

- Multiplayer: online (each player on their own device) or local (one screen,
  passing turns)?
