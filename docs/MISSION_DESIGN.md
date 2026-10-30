# Mission design: rests, decisions and cinematics

Agreed with the owner on 2026-10-13 from the proposal in
`rest-and-cinematics-proposal.md` (Spanish, with the reasoning, the references to
*Gods Will Be Watching* and *Darkest Dungeon*, and the story ideas).

The owner's answers are `1b 2b 3b 4a 5a 6b 7b 8b 9b 10b 11b 12b 13b 14b 15b 16b 17b
18b 19b 20a 21a H1c H2b H3a H4b H5c`. This file is the source of truth for
missions, rests, traps, status effects, decisions and cinematics. Battle rules
stay in `GAMEPLAY_DESIGN.md`; the ones these systems need were added there. The
clans and their abilities are in `CLANS_DESIGN.md` (the old clans converted on
2026-10-19: Uddo is now Ryusei, Akkai is Kōton, Taki is Northstar).
Change it here first when a decision changes. All numbers are a starting point
for playtesting.

## Mission flow

**Village → road → short stops and camps → objective → mission Chronicle.**

- **Village:** pick the party (1–4 ninjas) and, among them, the **mission
  leader**, who breaks ties in votes. Buy supplies. The backpack has limited
  room.
- **Road:** a branching map of 4–6 nodes. Each node shows its type (battle,
  trap, curio, scene or camp) and its danger.
- **Zone:** a stretch of the road with several nodes and one terrain (forest,
  swamp…). A mission has 2–3 zones.
- **Where to rest:**
  - At most one **short stop** per zone, taken between zones.
  - **Camps** only at nodes marked with a campfire (clearing, cave, ruin);
    usually 1–2 per mission.
- **Hours:**
  - Some missions have a **deadline in hours**, always shown. Each leg costs
    hours, a short stop 1 h and a camp 8 h.
  - Without a deadline, every 4 hours spent on the road (legs, stops, detours,
    getting lost) adds 5 % to the next camp's night danger.
- HP, chakra and effects **no longer refill between battles**: the party
  carries them along the road. Only the village restores everything.

## What each ninja carries

| Resource | What it is | How it comes back |
|---|---|---|
| HP | Life | Healing jutsu, bandages, Hit Dice, camp, village |
| Chakra | Fuel for jutsu | Focus chakra, soldier pills, Chakra Dice, meditation, camp, village |
| Hit Dice | As many as the level; each heals its die + CON | A camp gives back half of the spent ones, rounded up (at least 1); the village all |
| Chakra Dice | As many as the level; each gives its chakra die, no modifier | Like Hit Dice |
| Tension | Mental stress, 0–10 | Hot food, talks, victories, shrines, village |
| Exhaustion | Physical fatigue, levels 1–6 | A camp with food, stretching |
| Effects | Buffs and debuffs with a duration | Expire, or are removed by activities |

Giving back only half the dice at a camp is harsher than 5e on purpose.

## Chakra and healing

| When | HP | Chakra |
|---|---|---|
| Battle | Healing jutsu and bandages | No passive regeneration. **Focus chakra** and **soldier pills** (see `GAMEPLAY_DESIGN.md`) |
| Short stop | Hit Dice | Chakra Dice |
| Camp | Half of max + food + activities | Half of max + meditation |
| Village | 100 % | 100 % |

Healing jutsu can be cast at camp, paying their chakra. A Ryusei can give HP or
chakra of their own to an ally (Shared vitality).

## Short stop (short rest)

- Between zones, at most one per zone; 1 hour; no camp kit.
- Each ninja spends any number of Hit Dice and Chakra Dice.
- Each ninja may do **one** 1-stick activity that heals HP by spending something:
  Bandage (uses 1 bandage) or Heal with jutsu (pays its chakra). Nothing that
  restores chakra, Tension or Exhaustion, and no buff-only activities.
- No ambush.

## Camp (long rest), step by step

1. **Set up:** spend 1 camp kit. The party checks the clearing for free with
   passive Perception, in case of an enemy trap.
2. **Fire:** voted first (no fire, low fire, bonfire). A bonfire needs an extra
   kit or a Mirai who commits to Katon fire, paid later as an activity.
3. **Activities:** each ninja has **3 incense sticks**, shown burning. An
   activity costs 1–3 sticks, some also chakra or materials. Each ninja does
   each activity once per camp. Activities that change the ambush (guard, Wood
   shelter, Seal barrier, Camp illusion) count once even if two ninjas do them.
   Looking at the party and talking are free.
4. **Food:** one level for the whole party. If the hunt failed, there is no
   feast.
5. **Night:** the ambush is rolled with the % the moon shows.
6. **Morning:** each ninja recovers half of max HP and half of max chakra (never
   above max), half of the spent Hit Dice and Chakra Dice (rounded up, at least
   1), plus what food and activities add. "Until camp" effects brought from
   before this camp expire; those gained at this camp last until the next one.
   An interrupted night gives half of the morning recovery.

## Food and fire

| Food | Cost | Effect |
|---|---|---|
| No food | 0 | +1 Exhaustion, +2 Tension, debuff Hungry |
| Dry ration | 1 ration per ninja | None |
| Hot meal | 1 ration per ninja, needs fire | Recover 1 more spent Hit Die, −1 Tension |
| Feast | 1 ration per ninja + the hunt or fishing, needs fire | Hot meal, another −1 Tension and buff Well fed |

| Fire | Cost | Ambush | Effect |
|---|---|---|---|
| No fire | Nothing | −10 % | Cold food only and +1 Tension to all; in cold zones, debuff Numb |
| Low fire | Included in the kit | ±0 | Allows hot food |
| Bonfire | 1 extra kit, or a Mirai's Katon fire | +10 % | Allows hot food and −1 Tension to all |

The campfire sprite already has the three states: burning, smoldering, out.

## Activities

Everyone:

| Activity | Sticks | Effect |
|---|---|---|
| Hunt or fish | 2 | Survival (WIS) check, DC 12; success allows the feast; a natural 20 also brings back 2 rations |
| Bandage | 1 + 1 bandage | Heals 1d8 + WIS, removes Bleeding |
| Heal with jutsu | 1 + its chakra | Casts a healing jutsu out of battle |
| Meditate | 2 | +25 % of max chakra |
| Sharpen blades | 1 | Buff Sharpened |
| Train a jutsu | 2 | Buff Centered chakra |
| Keep watch | 2 | Ambush % halved; the guard gets Watchful |
| Perimeter traps | 2 + 1 explosive tag or 1 wire roll | If ambushed, the trap is on the map |
| Wire with bells | 1 + 1 wire roll | If ambushed, nobody starts surprised |
| Scout | 2 | Reveals the traps of the next zone |
| Pray at a shrine | 1 | Only where there is a shrine: −2 Tension |
| Fireside talk | 1 | −1 Tension to another ninja and +1 Bond between them; played as a short dialogue scene |
| Encourage | 1 | Buff Encouraged on another ninja |

Clan and class only (the old clans' activities went to the clans that replaced
them, with the same numbers, until the owner gives each clan its own;
`CLANS_DESIGN.md`, D5):

| Who | Activity | Sticks | Effect |
|---|---|---|---|
| Mirai | Sharingan reading | 1 | Reveals genjutsu traps and disguised NPCs |
| Mirai | Katon fire | 1 | Makes the bonfire without a kit (committed when the fire is voted) |
| Ryusei | Wood shelter | 2 | −15 % ambush, shelter from the weather |
| Ryusei | Shared vitality | 1 | Gives up to 10 of own HP (keeping 1) or chakra to an ally (the chakra part is new) |
| Ryusei | Wood skin | 1 | Buff Wood skin on an ally |
| Kōton | Seal barrier | 1 + a quarter of max chakra | −20 % ambush |
| Kōton | Seal poison | 1 | Removes Poisoned or a curse |
| Kōton | Warding seal | 1 | Buff Warding seal on an ally |
| Northstar | Byakugan watch | 3 | Ambush 0 % |
| Northstar | Close tenketsu | 1 | Removes Bleeding |
| Medical | Field surgery | 2 | Medicine (WIS) check, DC 13: removes Grave wound and cures Fever; on a failure the wound becomes a scar; a natural 20 also heals 1d6 HP |
| Medical | Make pills | 2 | 1 soldier pill or 1 antidote |
| Taijutsu | Stretching | 1 | −1 Exhaustion |
| Genjutsu | Peaceful sleep | 2 | −3 Tension |
| Genjutsu | Camp illusion | 2 | −15 % ambush |
| Bukijutsu | Make materials | 1 | 1 explosive tag or 1 wire roll |
| Ninjutsu | Elemental meditation | 2 | Like Meditate, plus resistance to one element until the next camp |

Tactical Trapper sets 2 traps with one activity and its tags deal +1d6 fire.

**Bond:** a number for each pair of ninjas, 0–10, starting at 0. +1 for each
fireside talk, and at most +1 per mission when one heals or protects the other.
From 5, the pair has Comrades' bond in every mission.

## Night ambush and perimeter traps

- Each zone shows a base %, for example 30 %, as a moon with its number. Fire,
  Wood shelter, Seal barrier, Camp illusion and (without a deadline) the hours
  change it. Keeping watch halves it at the end; Byakugan watch makes it 0 %.
  Example: 30 % + bonfire 10 % − Wood shelter 15 % = 25 %; with a guard, 12 %.
- If ambushed, a night battle starts on the camp's own map (clearing, campfire,
  tents and the party's traps); enemies come in from the edges, with no
  stealth phase. Night rules apply.
- The guard cannot be surprised; the others can, unless there were bells. If
  nobody watched and there were no bells, the whole party starts **surprised**.
- The ambush counts as a battle for effects that last battles.
- In Story and Normal an ambush is never a game over: if the whole party falls,
  it wakes up with Fall aftermath and loses half of the supplies. In Legend see
  *Difficulty and death*.
- **Perimeter traps** sit at the clearing's edge. An enemy walking over one sets
  it off: explosive tag 3d6 fire (DEX save), wire 2d6 + Bleeding. Each enemy can
  spot it with Perception against the trap's DC: 8 + proficiency + DEX modifier
  of whoever set it (also the DC of the tag's DEX save). Bells deal no damage;
  they only wake the party in time. Unused material is picked up in the morning.

## Tension

- 0–10 per ninja, always visible.
- **+1:** taking a critical hit, an ally falling, an unseen trap, a night with no
  fire, a decision against the ninja's conviction. **+2:** no food. Criticals taken
  and landed in one battle move Tension by at most ±2 together.
- **−1:** hot meal, feast (another −1), bonfire, a fireside talk received, a
  victory, a critical hit of one's own, disarming a trap. **−2:** praying at a
  shrine. **−3:** Peaceful sleep. The village clears it.
- **At 10:** a WIS save, DC 12.
  - Failure: **Breakdown** (Panic, Paranoia, Blind rage or Despair) until the
    village. The ninja announces it with a line; whoever controls the ninja keeps
    controlling it.
  - Success: **Awakening**, for example Will of Fire.
  - Then Tension goes back to 5.
  - Reaching 10 again while in Breakdown or Awakening gives 1 Exhaustion level
    instead (never above level 5 this way) and back to 5.
- Shrine's blessing gives advantage on that save; Encouraged takes 1 off the next
  Tension gain.
- A Breakdown never raises the others' Tension by itself. In each camp, a ninja
  in Breakdown refuses one random activity, crossed out before choosing, so no
  stick is wasted on it. Tension never kills.
- Back at the village, Breakdown or Awakening goes away but leaves one small
  trait, good or bad.

## Exhaustion

- 5e (2024): −2 to d20 rolls and −1.5 m of speed per level.
- Caused by no food, cold, forced march, more than one soldier pill between two
  camps (+1 per extra pill), opening the Gates, and Tension as above.
- At level 6 the ninja is **unconscious** and cannot act until back at level 5;
  no death saves and healing does not wake them. In Legend the ninja dies.
- −1 level at each camp with food.

## Traps and curios on the road

- **Hidden** until beaten by passive Perception or revealed by scouting
  (Investigation when searching actively). Byakugan gives advantage; Sharingan
  sees genjutsu seals without a roll.
- Once found, the trap's DC and each option's % are shown:
  - **Disarm** (DEX + ninja tools): success gives −1 Tension and the material;
    failure sets it off on whoever touched it, with the normal save.
  - **Set it off from afar** with a kunai: no damage, but the noise alerts the
    zone and the next battle starts without a stealth phase.
  - **Go around:** costs hours.
  - **Send a clone:** costs chakra.
- **Unseen:** it goes off on a ninja, who makes the save and gains +1 Tension.
- Each zone has its own mix of traps.

| Trap | Effect |
|---|---|
| Explosive tag | 3d6 fire, DEX save; the noise gives the party away |
| Wire trap | Kunai rain: 2d6 + Bleeding |
| Genjutsu seal | WIS save or Lost: −2 hours wandering |
| Poisoned needles | 1d4 + Poisoned until camp |
| Spiked pit | 2d6 + Wounded leg |
| Drain seal | −2d6 chakra |
| Alarm bell | No damage; the next battle starts without a stealth phase |
| Doton quicksand | Restrained |

**Curios:** Inari shrine (offer a ration: Shrine's blessing; pray once per ninja
and shrine: −2 Tension; desecrate: loot and Shrine's curse), abandoned camp
(Investigation: supplies, maybe a trap), wounded stranger (help with bandages
and time; may be a spy, Sharingan or Byakugan tells; ignoring gives +1 Tension to
ninjas whose conviction is protecting innocents), shinobi corpse (scrolls,
tags), hot spring (an extra short stop that does not count against the limit and
costs no hours), sealed chest (a Kōton opens it safely), village messenger hawk
(choose 1 of 3: bandages, soldier pills or the next zone's trap map). Using the
right item gives a guaranteed result, and there is always a hint on screen.
Investigating without an item is a roll with its % shown.

## Status effects

Durations: **R** rounds · **B** battles (the ambush counts) · **Z** while in this
zone · **C** until the next camp (short stops don't clear them) · **T** until
treated · **M** until the mission ends · **P** permanent.

| Buff | Duration | Effect |
|---|---|---|
| Well fed | C | +5 temporary HP at the start of each battle |
| Sharpened | 3B | +2 damage on melee weapon attacks |
| Centered chakra | C | The first jutsu of each battle costs 3 less |
| Watchful | 1B | Cannot be surprised, +2 initiative |
| Open eyes | Z | Traps revealed |
| Hidden in mist | 3R | Advantage on Stealth |
| Gates open | 2R | +1d8 taijutsu damage and more movement (Eight Gates Initiate); +1 Exhaustion when it ends |
| Shrine's blessing | C | Advantage on the next WIS save for reaching 10 Tension |
| Warding seal | C | Resistance to one element |
| Wood skin | 2B | +5 temporary HP |
| Comrades' bond | M | +1 AC within 3 m of the partner; back every mission while Bond is 5+ |
| Encouraged | C | The next Tension gain is 1 lower, then it is lost |
| Will of Fire (Awakening) | M | +2 to saves, immune to fear |

| Debuff | Duration | Effect |
|---|---|---|
| Bleeding | T | 1d4 per round in battle and per road leg; Bandage or Close tenketsu |
| Burning | 2R | 1d6 per round; water or an action puts it out |
| Chakra sealed (Kōton's Adamantine Sealing Chains) | 2R | No jutsu |
| Confused (genjutsu) | 2R | 25 % chance to attack a random target |
| Marked | 3R | Visible even when hidden |
| Poisoned | C | Disadvantage on attacks and checks; antidote or Seal poison |
| Wounded leg | C | −3 m speed |
| Numb (cold) | C | −2 DEX |
| Hungry | T | Disadvantage on CON saves; eating removes it |
| Crash | C | −2 to all rolls (after a soldier pill) |
| Fever | T | No HP back from rests; caught by camping while Bleeding untreated; Field surgery cures it |
| Fall aftermath | M | −2 AC, death saves with disadvantage |
| Shrine's curse | M | −1 to all saves |
| Breakdown | M | Panic, Paranoia, Blind rage or Despair |
| Grave wound | M | −10 % max HP; badly treated it leaves a scar (P); gained when dropped to 0 HP by a critical |

Breakdowns: **Panic** (disadvantage attacking with an enemy within 3 m),
**Paranoia** (refuses healing from allies), **Blind rage** (advantage attacking,
disadvantage on WIS saves), **Despair** (−2 to all saves).

## Difficulty, death and saves

- **Modes:** Story, Normal and Legend. Only Legend has permanent death and a
  single save slot.
- **Saves:** automatic when entering each road node, at the start of each camp,
  right before each decision and right after its consequence. In Story and Normal
  you can reload and choose differently: the same option gives the same roll, and
  the same camp the same ambush roll. In Legend the single slot is also written at
  each battle turn, when a vote closes, when a ninja dies, at the end of each
  battle and on quitting; loading never goes back before a death.
- **Whole party falls:** in Story and Normal the battle repeats from that node's
  entry (in an ambush, see above). In Legend each fallen ninja rolls death saves
  until stable or dead; survivors wake up with Fall aftermath. **If everyone dies
  in Legend, the game is over and the campaign starts again** (owner's choice).
- **Seeds:** the dice seed is in the save. Decision rolls come from seed +
  decision id + option id + roll number; road and camp rolls from seed + node id +
  roll number, so they don't depend on what was chosen.
- **No-randomness mode** (optional, outside battle): a check is worth 10 +
  modifier; % rolls become a counter (the ambush comes when the camps' % add up to
  100); a curio succeeds when its % is 50 or more.
- **After a mission:** scars stay, plus one small trait for each Breakdown or
  Awakening. The village restores everything else.

## Playing together

| | Solo | Local (pass the device) | Online |
|---|---|---|---|
| Each ninja's activities | You pick all | Each player picks theirs in secret, in turn, behind the cover screen | Each player picks theirs at the same time, 90 s; on timeout the AI picks |
| Fire and food | You decide | Secret vote, one vote per player | Vote at the same time, 60 s |
| Rolls and ambush | On the device, seeded | On the device, seeded | Rolled by the server |

- Talking before choosing and looking at the party are free; who keeps watch is
  agreed before choosing.
- AI-controlled ninjas pick activities with simple rules (heal whoever is below
  50 % HP…). On fire and food they don't vote; they show their stance and break
  ties. The AI prefers a hot meal with low fire if anyone has 5+ Tension; else no
  fire and dry rations when the ambush is above 25 %; else low fire and dry
  rations.
- If someone disconnects, the AI plays their ninjas until they return, and in
  votes they count as AI allies.

## Countdown scenes

A reusable pressure scene type, without story of its own, inspired by GWBW's
chapters: a fixed number of turns (8–12), a goal bar and 2–3 failure meters, one
of them double-edged. Free actions (look, ask) are clearly told apart from those
that cost a turn, and every roll shows its %. Failing doesn't end the game; the
story goes on with a consequence. Each turn every party character takes one
costly action, in initiative order, whoever controls it. Turns and meters are
tuned for 4 characters and scale down for fewer. Written with the same script as
cinematics (`meter` and `turns` commands).

## Cinematics and dialogue

**On screen:**
- The same stage as battles: painted backdrop, real-scale 16-bit world sprites
  and the characters as the players made them. No videos.
- Letterbox bars while nobody has control; camera that follows the speaker with
  the battle zooms (1×, 2×) and a 4× close-up for key lines; shake; slow push-in
  before a decision.
- Characters walk in, stop on marks measured in meters, turn and change pose.
- Emotes as pixel balloons with a sound each: !, ?, …, sweat drop, anger vein,
  heart, grey cloud, light bulb.
- Light: night, dusk, campfire glow, lightning, fades (the battle night and
  weather are reused).
- A painted still only when sprites can't carry it (something huge, a memory,
  the instant of a big decision), at most one or two per mission.
- Before deciding, touching a character or object to ask or look is free and can
  unlock options.

**Dialogue:**
- Text box with the speaker's name in their clan colour and a portrait cut from
  their own sprite (head and shoulders, ×4). Party on the left, others on the
  right.
- Typewriter text with adjustable speed, a voice blip per character, Auto,
  Fast-forward (read text only), Skip (asks before skipping unread text, always
  stops at a decision) and a 100-line backlog.
- Choice cards (2–4). Locked ones are grey with the reason ("Needs Byakugan").
- A timer (a burning fuse) only in pressure scenes; on timeout the writer's
  default happens. It can be lengthened or removed in Accessibility.
- d20 checks show the % before rolling and use the quick d20 over the character;
  failing opens another branch, never a dead end.
- **Natural 20 and natural 1 on mission checks** (owner's rule, his answer
  "c3", 2026-10-21; the battle side is in `docs/GAMEPLAY_DESIGN.md`, "Dice"): a
  natural 20 is an automatic success with an extra, a natural 1 an automatic
  failure, whatever the modifier and the DC. Today's mission checks and their
  extras: Hunt or fish (Survival, DC 12): +2 rations; Field surgery (Medicine,
  DC 13): the patient also heals 1d6 HP. The road events and short stops have
  no d20 checks yet (their dangers are percentages); each new check gets its
  own small extra written here when it is made (the best outcome of the event
  plus a small bonus the event defines). The Tension save at 10 Tension is a
  save, not a check: a natural 20 always awakens, a natural 1 always breaks
  down. The camp log throws the quick d20 beside each check's line.
- **"X will remember that":** a discreet notice with the portrait when a decision
  changes what a character thinks of you. Fireside talks use the same system.
- Texts live outside the script, one file per language, with slots for names and
  gender.

**Sprites needed** (priority 1 is the minimum):

| Priority | Poses | Expressions |
|---|---|---|
| 1 | Walk, talk gesture, arms crossed, surprised, sad, downed, sitting | Blink, talking mouth, angry, sad, surprised, smile |
| 2 | Point, bow, kneel, sleep, laugh | Eyes closed, pained |
| 3 | Run, look back, hug, cry | Tears, blush, dojutsu activating |

Expressions change a few pixels of the fixed face template (eyes, brows, mouth),
so they work with every eye type and every created character. Sprites also need
mirroring to face left.

**Script:** one command per line, turned into data by the game: `escena`/`fin`,
`entra`, `mover`, `mira`, `pose`, `dice` (with the expression), `emote`,
`camara`, `espera`, `fundido`, `musica`, `sonido`, `eleccion`/`opcion`/`prueba`
(each option has an id; `prueba: Atletismo CD 12 quien: elegido|mejor|grupo|LIDER`,
`grupo` passes when at least half succeed), `marca`/`si`/`ir a`, `batalla`,
`descanso`, `efecto`, `medidor`, `turnos`. See section 3.4 of the proposal for an
example.

**The world remembers:** every choice stores its option id
(`ejemplo.ruta = vado`); `marca` stores yes/no, numbers (an NPC's trust, a clan's
reputation) or text, for the scene, the mission or the campaign. The
**Chronicle** screen lists each mission's decisions: what was chosen, who voted
what and each AI ally's stance, the consequences already seen and the pending
ones. Online it can later show the % of players who chose the same.

## Decisions in the three modes

- **Conviction:** every character has one. NPCs get it from the writer (with a
  main value); each player's ninja picks 1 or 2 values from a closed list in the
  creator (protect innocents, loyalty to the village, complete the mission, clan
  honour…), the first being the main one. Each option says which values it
  appeals to and which it goes against. A character is **for** an option that
  appeals to one of its values, **against** one that goes against any, and
  **unsure** when both or neither.
- **Solo:** you decide; the allies' portraits show for, against or unsure over
  each card as advice.
- **Who votes (local and online):** each player votes once, even with several
  ninjas; their other ninjas count as AI allies. AI allies don't vote: they show
  their stance and break ties. Ties go to the tied option with more AI allies for
  it, then to the leader.
- **Two steps:** a public debate where each player may spend **one argument**
  (some unlock from what was learned in the mission), then a **secret vote**. In
  local play each player votes alone behind the cover screen ("Pass the device to
  Player 2"); online everyone votes at once with 60 s (the host can remove it),
  and a player who doesn't vote counts as an AI ally. Votes are revealed at once
  over each player's portrait.
- **Persuasion:** in the debate, d20 + CHA + proficiency against DC 10 (the option
  doesn't touch the target's conviction), 15 (goes against it) or 20 (goes against
  its main value). It only changes an AI ally's stance; another player is only
  argued with.
- **Disagreement:** every character whose conviction goes against the chosen
  option gets +1 Tension, voted or not. The dissenting player's character says a
  line, the Chronicle keeps who disagreed, and a later scene can prove them right.
- **The group may decide the fate of another player's character** (owner's
  choice): the vote rules, with no veto.
- **Secret disobedience** is allowed only with your own things (your ration, your
  chakra); the Chronicle reveals it.
- **The scene timer** and the online 60 s vote are separate; in local play the
  fuse stops on the cover screen and each player gets the full fuse.

## The hydra's fortress (the owner, 2026-10-29; not built)

**The mission's goal:** recover valuable information from the enemy's base (probably Kōton's; not
decided), by stealth or head-on. Arriving, the party finds **the gates open and no guards**, for
some strange reason, and chooses how to get in.

**The choice screen.** A background painted by his generator (the fortress from outside), with
two choice buttons in the colour of our gems: *By the front gate* and *Through the drain*. While a
choice is selected, part of the scene changes (the path it takes lights up), and a confirm asks
before committing.

**By the front gate (the hydra).** Into the courtyard of the colossal hydra (`GAMEPLAY_DESIGN.md`,
"The colossal hydra"), empty at first. The story's villain waits there with a monologue: proud of
them for coming in by the big gate, he expected no less; now let's see how they deal with *this*,
a beast nobody can control, only the Northstar king could. He **summons the hydra with an
alchemical sigil on the floor** and the boss summon animation plays; the battle starts. After the
hydra, the party fights its way in through several enemies to the commander's office, and may
also find the storeroom with the loot.

**The villain: Barrabás** (the owner, 2026-10-29). A Kōton, and the Kōton are allied with the
Northstar. Most Kōton wear heavy armour like Aiden's; the good ones wear respectable knight's
armour, the corrupt ones a darker, more gothic version: that is his. Dark green hair. (Our own
design; no franchise look.) On the **bulky** body (the owner, 2026-10-29). His design and his
sprite at our scale: `docs/reference/barrabas-design-owner-reference.png`,
`docs/reference/barrabas-paintover-bulky-owner-reference.png`.

**His welcome (draft, the owner's lines refined; his words to approve):**
- The party walks in; Barrabás stands in the middle of the courtyard. *"¡Ja! Sabía que vendrían.
  Solo alguien tan orgulloso como tú entraría por la puerta grande... Insolente."*
- **The gates slam shut** behind the party.
- **A choice.** The colour of the gem says the kind of answer, from here on: **red = pride**
  (most proud answers), **blue = the clever, wise one** (almost always).
  - Red: laugh it off, *he is one and we are N* (N = the party's size: up to 5 playable
    characters per player, more with reinforcements, allies, summons or clones). His reply:
    *"¿Solo? ¿Y quién te dijo que estoy solo?"* (the owner asked for natural words).
  - Blue, the Mirai answer: see that something is wrong; the party gets priority in the
    battle's initiative.
  - Provoke him about the Northstar (his pick 3b): *a Kōton playing the Northstar's dog*. He
    loses his temper and sends the hydra first at whoever said it: that ninja draws its attacks.
  - Attack mid-sentence (his pick 4a): a kunai before he finishes. The summon is broken: the
    hydra comes out with 3 of its 5 heads the first round; Barrabás gets away swearing revenge
    (he will remember it).
- Then, whatever was answered: *a beast nobody can control, only the Northstar king could*; the
  alchemical sigil, the summon, the battle.

**Through the drain (stealth, XCOM 2 style).**
- **A narrow map.** In the tunnels **rank S jutsu and summons can't be used** (nothing large:
  summoned beasts, mechas, the giant spirit-armour form when active counts as a mecha; they don't
  fit). Only small abilities or lines, and those can hit the party in the tight space.
- **The fork.** After several tunnels the map splits: **left is a dead end**, reached after
  spending resources, time and small fights, and the party has to turn back; **right** leads to a
  grate into the castle's **storeroom**, where the loot is.
- **Loot or not.** If they loot, a patrol passes, finds them and the battle starts. If they don't,
  they get **1 turn to set up an ambush** on the patrol.
- **The alarm.** Once found, one guard attacks and another runs to sound the alarm; there is time
  to reach him and kill him before he does. If he sounds it, more enemies arrive over the next turns.
- **The objective.** Reach the commander's office, take the documents (a **bonus action**), and
  go back out through the grate to escape.

**The loot.** A unique sword that can **send magic attacks back** at the caster (his example is
an anime counter move; the name and the look must be our own), and other random, cool items that
are sold for gold back at home or the base (his ToME decision: random loot becomes gold, weapons
are hand-made).

**Summons, from here on.** Boss summons get their own animation (this one: the villain's
alchemical sigil); ordinary summons get a simpler one inside the battle (the mechas too).
**Mecha size:** a mecha is as big as the river battle's hydra (the medium hydra we have now).

Open: the villain's portrait, the welcome's final lines and its other two answers, the drain's and the castle's maps, the
sword's numbers and name.

## Story notes (for the story session)

- 6 or more endings (owner's choice), unlocked by marks and clan reputation.
- A story decision can kill a player's ninja only in Legend; in Story and Normal it
  leaves Fall aftermath and a serious scar.
- Clan reputation is shown as a 5-level emblem (Hostile, Cold, Neutral, Friend,
  Ally) plus the world's reactions.
- The proposal's annex has the branching structure and six example decisions.

## Build order

The proposal's section 4 lists the code to change. Recommended first prototype:
party state and status effects, the rules modules, one full camp without ambush,
and the minimum cinematics (stage with bars, walk pose, priority-1 poses and
expressions, portraits with Auto/Skip/backlog, cards with % and d20, marks,
Chronicle as a list, saves around decisions, solo and local secret vote). Then the
ambush, the traps and the local vote.

## Prototype status

Playable in the app under **Missions**: the *River Forest Patrol* (rank C), two
zones, three battles, a short stop between the zones and a camp at the Shrine
Clearing with a night raid. Rules in `src/rules`, the mission flow in
`src/game/missionRun.ts`, the screens in `src/components/mission`; `npm test`
covers both.

- **Done:** party state carried between battles; status effects with durations;
  the short stop; the whole camp (fire, incense sticks and activities with their %,
  dinner, the moon and its breakdown, the night roll, the raid, the morning); falls,
  death saves in Legend and game over; difficulty and the no-randomness mode;
  autosave in one slot; mission log.
- **Party battles** (`src/battle`, screen in `src/components/battle`): the whole
  party fights each node's battle on the river forest map (`src/battle/encounters.ts`
  names which). The player controls all four and can hand any ninja to the AI.
  Soldier pills, bandages, antidotes and explosive tags are used in battle and
  spent from the supplies. The night raid reads the camp: bells mean nobody starts
  surprised, otherwise whoever wasn't on watch loses the first turn; perimeter tags
  and wires wait on the raiders' paths (a wire trips whoever walks into it). A
  retreat by the map edge gives up the node (or the mission, at the objective). A
  battle can't be saved halfway: reloading starts it over.
- **Small rules filled in while building** (change them here if they're wrong):
  - If anyone is still standing after a battle, the fallen are stabilized and wake
    up with 1 HP.
  - Bleeding on the road never drops a ninja below 1 HP.
  - A lost ambush in Story or Normal loses half of each supply, rounded down.
  - In Legend, a lost battle with survivors passes the node (the enemy left them
    for dead); losing the objective battle fails the mission.
- **Not yet:** branching road, traps and curios, votes, cinematics and decisions,
  the AI picking activities, local and online play.
