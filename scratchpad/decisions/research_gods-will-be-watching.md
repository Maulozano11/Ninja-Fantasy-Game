# Gods Will Be Watching (Deconstructeam / Devolver Digital, 2014): research report for adapting its mechanics

## 0. Method and how reliable this is

- **What went wrong with the tools.** WebFetch could not resolve any domain. Bash `curl` was refused by the egress proxy (403, organization policy) for the Steam store and Fandom. That means I could not open any page directly.
- **What the facts rest on.** Everything below comes from WebSearch result extracts. Each extract names its source URL, and source keys like [S1] map to the list at the end.
- **Labels used:**
  - **[V]** means a search extract attributed this fact to the cited source.
  - **[C]** means sources conflict. I give both values.
  - **[I]** means my own inference or design recommendation, not a sourced fact.
- **Exact numbers are tentative.** Most mechanic numbers come from fan wikis and 2014–2015 Steam guides. They may describe pre-patch builds. Treat exact numbers as approximate.
- **The "40-day desert trek" in the brief mixes up three different things:**
  - **The 2013 Ludum Dare prototype:** a single-screen camp, 40 days, fix the radio.
  - **Retail Chapter 4, "Gods Will Be Watching":** a camp on the planet Sineicos lasting about 21–23 days. It has fire, food, a dog, hunting and a radio.
  - **Retail Chapter 5, "Legend":** a desert trek on the planet Legin with a deadline of about 150–200 hours. It has water, scouting and navigation.

  Section 3 covers all three.

---

## 1. Core loop and structure

**Identity [V]**
- Released 24 July 2014 on PC, Mac and Linux, published by Devolver Digital [S1][S2].
- Steam calls it a minimalistic "point and click thriller" about despair, commitment and sacrifice, where "decisions will affect your entire crew's wellbeing" [S2].
- The press kit calls it "a game about hard decisions and moral dilemmas in order to survive". Its feature list names an **"Empathy System: player actions affect the whole group's attitude"** [S3][S47].
- A retailer blurb poses the dilemma: should you "kill the weakest member of your party to save on food for the strong?" [S51].
- An iPad port came out on 17 Dec 2015 [S1][S48].

**Origin [V]**
- It began as a Ludum Dare 26 jam entry (theme "Minimalism"), built in under 72 hours. Niche Gamer says two days [C] [S1][S28][S29].
- The jam version was one screen: survive **40 days**, repair a radio, and keep the crew fed and sane. The crew was a soldier, psychiatrist, doctor, engineer, robot and dog [S13][S26].

**Structure [V]**
- Wikipedia says six chapters, "each of which acts as a resource and time management puzzle" [S1].
- The Fandom wiki and NamuWiki list seven, because the final duel "Nemesis" counts separately. There is also a free epilogue chapter added in May 2015 [S4][S10][S24].
- Each chapter is a self-contained crisis. Resources do not carry over between chapters [S9].
- Characters who die usually come back in the next chapter because the story is linear. GameSpot says this removes the weight of their deaths [S31].
- A few injuries do persist. Jack can lose his arm in Chapter 2, and one soldier is already missing a leg by Chapter 5. The story is framed as a time loop [S13].

**Turn and time model [V]**
- **Green vs red actions.** You click a character or object and pick from a short list of actions.
  - **Green actions** are free and unlimited: questions, checking someone's state, asking for hints.
  - **Red actions** spend one turn and move every system forward.
  - Reviewers note that the game never explains this rule [S9][S31][S44].
- **The unit of a "turn" changes per chapter:** a turn of the siege (Ch1), a day (Ch2), an hour of digging (Ch3), one of about 5 actions per day (Ch4), hours of marching (Ch5) [S5][S11][S14][S16][S19].
- **Win and lose.** Each chapter has a goal bar or deadline plus one or more fail thresholds. Any fail state restarts the whole chapter. There are no mid-chapter checkpoints, and saves happen only at chapter boundaries. A stage can last "well over an hour" [S1][S37][S40].
- **End-of-chapter screen.** It shows how players worldwide chose [S44].

**Difficulty: the "Mercy Update" (August 2014) [V] [S30]**

| Mode | What it does |
|---|---|
| **Original** | The launch difficulty, unchanged. |
| **Puzzle Mode** | "All the challenge of Original Mode, but without random factors." |
| **Puzzle Mode Light** | No randomness and easier puzzles. |
| **Narrative Mode** | The easiest. Lets you enjoy the game "as a narrative experience" with minimal obstacles. |

- Jordi de Paco said the studio liked how the challenge was received but wanted the game open to more players after feedback from fans and critics [S30].
- In another interview he called the people who hated the difficulty "a good thing too", proof that they had made a hard game that doesn't hold your hand [S46].

---

## 2. Every chapter

### Overview

| # | Title | Setting | Goal | Main meters | How you fail |
|---|---|---|---|---|---|
| 1 | Self-Justified Sacrifices | Constellar lab, hostage siege | Finish the hack | Hack progress (2 bars), security %, hack-boost success %, guard distance, each hostage's attitude | Guards reach the breach point; all hostages lost; a security breach |
| 2 | 20 Days of Empty Words | Torture cell | Survive until rescue (about 8 days played) | Burden HP, Jack HP, confession count, lie chance % | Death, or too many confessions (4 or 5 [C]) |
| 3 | Everdusk | Sealed cave lab | Dig out and synthesize the cure within about 27.5 h | Rubble kg, digger fatigue, robot durability %, defibrillator charge, antidote formula | Time runs out; deaths |
| 4 | Gods Will Be Watching | Stranded camp on Sineicos | Repair the radio before the ship passes (about 21–23 days [C]) | Day count, 5 actions/day, fire/wood, raw/cooked food, medicine, spears, ammo, radio %, morale per person | Fire out at night; crew dead or fled; ship missed |
| 5 | Legend | Desert of Legin, tile map | Lead the platoon to base within about 150–200 h [C] | Hours left, water, per-soldier hydration and rest, signal strength | Deadline missed; deaths |
| 6 | Suicide Mission to Save the World | Xenolifer ship *The Matriarch* | Extract 4 password pieces for the Medusa cure | Oxygen %, each hostage's willpower %, rebellion level, password attempts | Oxygen at 0; rebellion over 100; lockout |
| 7 | Nemesis (+ Epilogue / "The Last Chapter" DLC) | Duel with Liam | Out-guess Liam | Ground / position | Lose the duel |

### Chapter 1: Self-Justified Sacrifices (hostage siege)

**Setup [V]**
- A flashback. Burden, Jack, Shaman and Liam (agents of the group Xenolifer) take **three researchers and one research leader** hostage in a lab of Constellar (the antagonist faction) while the team hacks a computer [S10][S5].

**Systems [V] [S6][S7][S8][S9]**
- **Hack:** two progress bars on the left fill only on red actions.
  - "Hack Boost" is a gamble that jumps progress. Guides charge its success rate to about 80% before firing it.
  - Shaman's "Reinforce Security" refills the security bar to 100%. Use it when the bar drops to about 70%.
  - Shaman's "Hack Camera to Corridor" is a free green action.
- **Guards:** they advance on every red action and blow up the team when they reach the breach point.
  - Jack can **attack**, which pushes them back. Firing also "kills everyone's hopes of running".
  - Jack can **negotiate**, which freezes them for a few turns.
  - You can **trade a hostage**, which also buys a few turns.
- **Hostages:** each one sits on a two-sided scale. **Too brave → they attack. Too frightened → they flee.**
  - You read the state from posture, not a number. Sitting with legs folded means balanced. Legs straight and relaxed means shout or kick them. Shaking legs or a hand on the head means calm them by talking.
  - The bald leader in the brown blazer spreads his mood to the others.
  - The "break room" isolates one hostage. That hostage stops reacting to events but can become calm enough to run.
  - **If you lose every hostage, the guards storm in.** Guides advise letting a runner go or executing an over-relaxed hostage.

**Moral choices [V]**
- Spend a hostage as a bargaining chip.
- Execute a hostage to keep the others in line [S6][S7].
- An achievement, "F\*\*k the police", rewards never negotiating with the guards [S8].

### Chapter 2: 20 Days of Empty Words (torture)

**Setup [V]**
- Burden and Jack are captured and tortured. Despite the title, you play only about **8 days** before soldiers of E.C.U.K. rescue them [S11].
- Torture methods escalate on a **fixed schedule** that dialogue hints at. One guide lists: fists on day 1, then pliers, a blowtorch, a rack, a gun, and an axe on day 9 [S12].
- **Russian roulette** happens on day 6 with a seven-chamber revolver. Each empty click lowers the odds of surviving the next pull [S11][S13].

**Actions per day [V] [S10][S11][S12]**

| Action | Effect |
|---|---|
| Provoke | Only the provoker is tortured, which protects a weakened partner. |
| Beg | Restores some health, but only when both are low (or one is near death). Otherwise you are tortured. |
| Think | Raises tomorrow's lie chance, but both are tortured once. |
| Lie | Base success is about **10%**. |
| Confess | Skips the torture, but each confession counts toward a cap. Hitting the cap means execution: **4 or 5 confessions [C]**. |

**Nightly visit [V]**
- **Each night, Liam smuggles in ONE of three items** [S11]:
  - **Painkillers.**
  - **Medicine:** full heal for both at the end of the next day.
  - **Information:** a 100% lie chance tomorrow.

**Consequences [V]**
- Jack can lose an arm unless you lie and confess through a particular day [S13].

### Chapter 3: Everdusk (sealed cave lab)

**Setup [V]**
- Burden and Jack guard scientists researching an antidote. Liam blows up the cave entrance to force them to find the cure in about **27.5 hours** [S4][S14].

**Systems [V] [S14][S15][S18]**
- **Digging:** just under **4000 kg** of rubble. Human diggers tire the longer they work, so you balance work and rest.
- **Robot BR4ND-0N:**
  - It never tires.
  - Plugged into the power lines, it loses about **10% durability per turn**. At 0 it fuses to the wires and dies.
  - Guides pull it off at about 10% and have **Donald** repair it.
- **Infection:** everyone in the cave is infected and randomly becomes paralysed. **Defibrillator charges** revive them. One walkthrough says charging takes two rounds.
- **The cure is a deduction loop:** synthesize a dose (compounds narrowed to five), **inject a person**, and if they survive, analyze their blood to see which parts were right.
  - The formula has two parts. The second needs one more letter out of four.
  - Jack and Donald are the usual test subjects because they tolerate injections best.
  - Once you know the right mix, making the dose "100% lethal" speeds things up, because the correct mix is not actually lethal.
- Guides call it luck-heavy and advise restarting bad openings.

**Moral choices [V]**
- Using teammates as human test subjects.

### Chapter 4: Gods Will Be Watching (stranded camp) — see section 3

### Chapter 5: Legend (desert trek) — see section 3

### Chapter 6: Suicide Mission to Save the World (hostages on the Xenolifer ship)

**Setup [V]**
- Burden flies into ***The Matriarch***, the Xenolifer ship. He must make hostages reveal **4 password pieces** for the **Medusa virus** cure to save the planet **Gactus VII (about 4 billion people)**.
- The virus kills the elderly and children first [S4][S10].

**Systems [V] [S8][S22]**
- **Oxygen is falling.** Guides keep it above 18%. Hostages die at 0.
- **Each hostage has a willpower %.** The named hostages are Shaman, Claire and her child Eddie, Ford, Wouter and Frank.
- **Verbs:** persuade, threaten, forgive, offer freedom, shoot.
  - Example: persuade Shaman until his willpower stops falling, then alternate threats and forgiveness.
  - Example: persuade Claire to about 20% and offer to free Eddie.
- **Rebellion level:** too many threats push it past 100, the hostages attack, and you lose.
- **Shooting the central Medusa container** drains oxygen faster but drops everyone's willpower.
- **Final guess:** about a 3/5 chance on the last password before the terminal locks.
- A guide calls this the chapter with the least randomness.

**Moral choices [V]**
- Threaten a mother with her child.
- Free some hostages to get passwords.
- Shoot hostages to cow the others.
- A zero-death route exists [S22].

### Chapter 7: Nemesis, the Epilogue and the DLC

**The duel [V] [S23]**
- Liam crashes through the window in a xenosuit.
- Burden must **predict Liam's moves** with **Block / Duck / Jump Back**. Each counter matches some attacks; Duck is neutral only against "Blue Fist". Jump Back always loses ground but survives one-shot moves.

**The ending [V] [S23][S24][S13][S25]**
- After winning, you choose: throw the antidote to the planet ("Everdusk") or to Liam ("Xenolifer").
- In the epilogue, Burden wakes in the Legin desert and puts on a cloak. The **time loop** begins again.

**The free DLC "The Last Chapter" (May 2015) [V] [S24][S50]**
- Set **20 years later**. Liam leads what is left of Burden's unit and tries to change the past.

---

## 3. The survival chapters in detail

### 3a. Ludum Dare prototype (2013) [V] [S26][S27][S13]
- One screen.
- A 40-day countdown to rescue.
- **5 actions per day**: talk to the crew, fix the radio, light the fire, hunt, pet the dog.
- Crew: soldier, psychiatrist, doctor, engineer, robot, dog.
- Resources: food, medicine, warmth, ammunition, sanity.
- Kotaku's reviewer lost most of his crew to madness while concentrating on the radio. He also notes the puppy survives if you pet it [S26].

### 3b. Retail Chapter 4: the camp on Sineicos

**Goal and clock [V]**
- Repair the radio and call the ship, or wait **six more months** [S16].
- Length: Fandom says 22 days; other sources say 21 or 23 [C] [S16][S17].
- **Five tasks per day** [S16].

**Crew [V]**
- Burden; Cpl. Jack Maslow; Dr. Zenész; Sarah (the psychologist role); Donald (the engineer, who customized the robot); the robot **BR4ND-0N**; a dog [S16].
- One guide implies the dog may be named "Marvin" [I].

**Resources and actions [V] [S16][S17][S18]**
- **Fire / wood:** light it on day 1 and never let it go out. Running out of wood at night ends the run. Players keep at least 2 wood in reserve.
- **Food:**
  - Raw meat comes from hunting.
  - **Cooking it is the main morale lever.**
  - Keep at least a day ahead on food.
- **Dog:** needs **raw meat about every third night** and can skip a night or two.
- **Hunting** has three options:
  - **Rifle:** effective but uses ammo. Night hunts use even more.
  - **Spears:** one wood makes 1–3 spears. Cheaper, less reliable, and also used for camp defense.
  - **Hunting with the dog:** a gamble.
  - Sending Jack to hunt at night costs morale.
  - A failed hunt can waste the whole day's actions.
- **Medicine:** the doctor makes doses. Guides stockpile 4–5.
  - One forum post, possibly about Chapter 3 [C], says the first remedy Sarah and the doctor develop is "unstable (20% mortality)".
  - If antidotes run out and someone is infected, guides advise mercy-killing them.
- **Radio:**
  - BR4ND-0N repairs about 4–5% per action, so about 20 actions in total.
  - Having Donald repair it **drains his morale.**
  - Once the radio works, **morale stops falling.** Some players delay finishing it until morale is low, to get the boost.
- **Morale (per person, partly hidden):**
  - Raised by cooked meals and Sarah's pep talk.
  - The pep talk was "Group Therapy" for all 5 actions; it was later changed to "Prepare Pep Talk" for 3 actions.
  - A special pep talk is unlocked only after a **predator attack.**
  - Lowered by predator attacks, night hunts and bad work.
  - BR4ND-0N doubles as a way to read morale.
  - Low morale makes people **leave the camp**. One player says the doctor "usually runs away anyway". One review mentions a crew member who "ran away after their morale plummeted" [S17][S31].
- **The darkest choice:** TV Tropes notes you can turn crew members "from consumers of food to a source of food" [S13].

**Story beat [V]**
- Liam blows up the E.C.U.K. ship in front of the survivors. Jack's mental state collapses after a certain death [S10].

### 3c. Retail Chapter 5: Legend (the actual desert trek)

**Setup [V] [S19][S21][S4]**
- Burden wakes with amnesia in the desert of **Legin**. He finds a **platoon of nine soldiers** and agrees to lead them to their camp.

**Clock [V]**
- About **150 hours** [S19], or "about 200 hours or the ships leave" [S8] [C].

**Map [V]**
- Tile-based and **randomly generated every restart.** Guides call it the most luck-dependent and least forgiving chapter [S8][S20].

**Navigation [V]**
- Burden's **"Signal Strength"** ability says whether your last move took you closer to base.
- Method: go east, check after every move, step back when the signal weakens [S19][S20].

**Scouting [V]**
- Send one scout **one tile ahead**. If they don't return, they found an **enemy base**. You then wait, attack and take it [S20].

**Water [V]**
- Sources: cacti, damp ground, captured bases, corpses.
- Digging for water costs **3 hours**.
- Ration it, but **hand it out at once** so thirsty soldiers don't slow you down.
- **Rest in shade, not in the sun** [S19][S20].

**Pace [V]**
- **The group moves at the speed of its slowest member** [S20].

**Moral choice [V]**
- **Abraham** is a soldier who lost a leg, so each move takes him 2 hours. The sources disagree on what killing him does [C] [S20][S8][S13]:
  - "Twice as easy".
  - Two other soldiers desert you in disgust.
  - Left alive, he may take his own life after a rest.

**Not found:** sickness, temperature, sandstorms or ammo in Chapter 5. These are unconfirmed. Rock Paper Shotgun reportedly found the desert screens repetitive by this chapter (search summary only).

---

## 4. How decisions are presented, and how the game builds tension and guilt

**Presentation [V]**
- **Minimal pixel-art scenes on one screen.** You click a character or object and get a short action menu. The color of each option tells you its turn cost. Green options let you probe for information at no cost before committing [S9][S31][S44].
- **Visible numbers** show the systems: hack and security bars, guard distance, oxygen %, willpower %, robot durability %, radio %, day and hour counters, stock counts [S5][S14][S16][S22].
- **Some state is shown, not numbered.**
  - Hostage fear or bravery is read from body posture [S6].
  - Morale shows through dialogue and a robot's reading [S17].
  - The torture schedule is hinted in dialogue [S12].
- **Percentages on risky actions** make the gamble explicit: Hack Boost success, lie chance, the roulette, the final password guess [S6][S11][S22].
- **The end-of-chapter statistics screen** compares your choices with other players' [S44].
- **The Empathy System** means one act (an execution, a meal, a threat) shifts the whole group, not just one person [S3].

**Tension and guilt mechanisms**
- **Every useful action costs a turn, and the clock always runs** [V] [S31].
  - [I] This makes every act of kindness a price paid in progress: a pep talk instead of radio work, feeding the dog instead of a person.
- **People are spent as resources** [V] [S6][S13][S14][S20][S22]:
  - Trading or executing hostages.
  - Using teammates as test subjects.
  - Killing the slow soldier.
  - Eating the dead.
  - Threatening a child.
- **Two-sided meters** [V] [S7][S22]: too calm and too scared are both failures (Ch1 hostages, Ch6 rebellion vs willpower).
  - [I] This stops brute-force spamming of one action.
- **Weaknesses critics named** [V]:
  - Because the dead return in the next chapter, deaths lose their weight [S31].
  - PopMatters argues that restarting erases failure, giving an "unearned perfection" that the player still remembers [S41].

---

## 5. Reception

**Scores [V]**
- Metacritic **64** from 45 critics (14 positive, 24 mixed, 7 negative). User score 6.4 [S33].
- OpenCritic about 69 (unverified figure) [S34].
- IGN 8/10 (Rowan Kaiser): "takes adventure games to new, dark, and strategic places" [S34].
- PC Gamer 81: "An inspired take on survival, where you get to bring your own horror" [S35].
- Destructoid 85: more strategy and planning than a classic point-and-click [S33][S36].
- Gamers' Temple 58% [S44].
- Steam: about 64% positive of 1,445 reviews, as captured in a search snippet; the current figure may differ [S2].

**Praise [V]**
- The tense, simple interface and the time pressure [S45].
- The strategic and moral originality [S34][S36].
- Morally grey sacrifices: "sometimes sacrificing a few is not only inevitable, but necessary" [S31].
- Some critics defend the cruelty as fitting the theme: Kotaku's "Why failing is as good as winning" [S42], GameGrin [S39], and a Game Developer essay arguing that by not trying to be fun, the game can do interesting things [S43].

**Criticism [V]**
- **Trial and error with no checkpoints:** the main complaint according to Wikipedia [S1][S37][S38].
- **RNG:** one bad Russian-roulette roll can wipe 15–20 minutes [S38]. "Randomized levels and irritating glitches... diminish the emotional impact" [S31]. Chance "can really ramp up frustration" [S36]. "Challenge comes from nothing more than trial and error" [S32][S54].
- **Story:** called disjointed, and it goes the same way regardless of choices [S34][S44].
- **What the developer did:** the Mercy Update, which added no-RNG modes and a story mode [S30].

---

## 6. Lessons for adapting these mechanics [I]

These are my inferences and recommendations. They are written for a ninja RPG that wants decision scenes and rest camps with chakra.

1. **Use a fixed action budget per rest.**
   - For example, 4–5 actions per night or per camp phase, like GWBW's five actions a day.
   - Make every useful action (heal, regenerate chakra, cook, repair gear, train, keep watch) compete for the same slots.
   - This creates hard choices without any branching story.
2. **Copy the green/red split, and explain it.**
   - Make talking and inspecting free.
   - Mark actions that cost a slot clearly: icon, color, and the cost shown in the tooltip.
   - GWBW's failure to explain this was a real complaint.
3. **Let one resource protect another, and show the exchange rate.**
   - Examples: spend food to raise morale (cooked vs raw); spend wood for spears; let a character absorb harm (Provoke); give up healing for safety.
   - For a chakra game: spend chakra on a barrier seal against night traps or ambushes instead of regenerating it; burn HP to force chakra regeneration; pick one of three supplies from a contact, like Liam's painkillers / medicine / information.
4. **Use two-sided meters** (panic vs. recklessness) for stress or morale, so neither extreme is safe and players can't spam one action.
5. **Show risk numbers before the gamble** (GWBW's 10% lie, the roulette odds, the 80% Hack Boost).
6. **Limit randomness:**
   - Use seeds or "smoothed" randomness.
   - Offer a no-RNG mode from launch, as the Mercy Update eventually did.
   - **Add checkpoints at every rest or day boundary.** Restarting a whole 20–60 minute scenario was the most criticized design choice.
7. **Make consequences persist.**
   - GWBW lost emotional weight because the dead came back.
   - Carry injuries, scars, permanent debuffs, trauma and dead companions into later missions, the way GWBW occasionally did with Jack's arm and the one-legged soldier.
   - This also gives a Darkest Dungeon–style afflictions/quirks system a reason to exist.
8. **Design "bad" options that are mechanically good.**
   - Leaving the slow ally behind, using a prisoner as bait, or interrogating by threat should be efficient.
   - Their cost should be social (party morale, an ally deserting, reputation) and, ideally, delayed.
9. **Mix readable cues with hidden state.**
   - Show the critical meters as numbers (HP, chakra, supplies).
   - Show morale and enemy alertness through posture, dialogue and portraits.
   - Give one character a "read the room" skill (the GWBW robot measured morale).
10. **Make night threats, traps and ambushes real but answerable.**
    - Pair each one with a preparation action: keep watch, set traps, craft weapons, maintain the fire.
    - Let unprepared nights cause a debuff (no rest bonus, injury, lost supplies) rather than an instant game over.
11. **Show players' choices at the end of each chapter.**
    - A summary of who lived, what was spent, and what percentage of players chose the same.
    - It reinforces guilt and is cheap to build. It needs telemetry; a local summary also works.
12. **Keep scenarios short (15–25 minutes) and themed around one crisis**, each with a single headline goal bar and 2–3 fail meters.

---

## 7. Unverified or conflicting points to check before relying on them

- Chapter count: 6 (Wikipedia) vs 7 (Fandom / NamuWiki).
- Chapter 4 length: 21, 22 or 23 days.
- Chapter 2: 4 vs 5 confessions; the exact torture schedule.
- Chapter 5 deadline: 150 vs 200 hours; the effect of killing Abraham.
- Whether the "20% mortality remedy" belongs to Chapter 3 or 4.
- The dog's name.
- Exact hunting success rates and firewood use per night: no source found.
- Night temperature, sickness and sandstorms in Chapter 5: not found.

---

## Sources
- S1 https://en.wikipedia.org/wiki/Gods_Will_Be_Watching
- S2 https://store.steampowered.com/app/274290/Gods_Will_Be_Watching/
- S3 https://www.deconstructeam.com/press/sheet.php?p=gods-will-be-watching
- S4 https://gods-will-be-watching.fandom.com/wiki/Chapters
- S5 https://gods-will-be-watching.fandom.com/wiki/Chapter_1:_Self-Justified_Sacrifices
- S6 https://gamequiche.com/2014/07/29/gods-will-be-watching-walkthrough-chapter-one-self-justified-sacrifices/
- S7 https://steamcommunity.com/app/274290/discussions/0/620700960397130607/ ; https://steamcommunity.com/app/274290/discussions/0/37470848148058586/
- S8 https://steamcommunity.com/sharedfiles/filedetails/?id=315985481
- S9 https://steamcommunity.com/sharedfiles/filedetails/?id=291108248
- S10 https://en.namu.wiki/w/Gods%20Will%20Be%20Watching
- S11 https://gods-will-be-watching.fandom.com/wiki/Chapter_2:_20_Days_Of_Empty_Words
- S12 https://steamcommunity.com/app/274290/discussions/0/34093781549933436/ ; https://steamcommunity.com/app/274290/discussions/0/37470847931281933/
- S13 https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/GodsWillBeWatching
- S14 https://gods-will-be-watching.fandom.com/wiki/Chapter_3:_Everdusk ; https://gods-will-be-watching.fandom.com/wiki/Chapter_3:_Everdusk/Dialogues
- S15 https://steamcommunity.com/app/274290/discussions/0/37470848152876440/
- S16 https://gods-will-be-watching.fandom.com/wiki/Chapter_4:_Gods_Will_Be_Watching
- S17 https://steamcommunity.com/app/274290/discussions/0/37470848473516489/ ; https://steamcommunity.com/app/274290/discussions/0/451848855016379807/ ; https://steamcommunity.com/app/274290/discussions/0/37470848282736924
- S18 https://www.dtgre.com/2014/07/gods-will-be-watching-walkthrough.html
- S19 https://gods-will-be-watching.fandom.com/wiki/Chapter_5:_Legend
- S20 https://steamcommunity.com/app/274290/discussions/0/611701999532788404/ ; https://steamcommunity.com/app/274290/discussions/0/37470848128549726/ ; https://steamcommunity.com/app/274290/discussions/0/37470848359821574/
- S21 https://www.gameswelt.de/gods-will-be-watching/komplettloesung/das-unmoegliche-schaffen-225956/17
- S22 https://steamcommunity.com/app/274290/discussions/0/352792037321027066/ ; https://steamcommunity.com/app/274290/discussions/0/34093781804008193/
- S23 https://gods-will-be-watching.fandom.com/wiki/Chapter_7:_Nemesis
- S24 https://gods-will-be-watching.fandom.com/wiki/Epilogue ; https://www.pcgamer.com/gods-will-be-watching-adds-free-epilogue-chapter/ ; https://www.cosmocover.com/newsroom/gods-will-be-watching-free-expansion-now-available/ ; https://www.savingcontent.com/2015/05/28/gods-will-be-watching-updates-with-free-dlc-the-last-chapter/
- S25 https://steamcommunity.com/app/274290/discussions/0/615085406656444278/
- S26 https://kotaku.com/a-survival-sim-that-mostly-takes-place-on-a-single-sc-486358684
- S27 https://www.j1studios.com/gods-will-be-watching-can-you-survive-this-simplistic-survival-sim/
- S28 https://godswillbewatching.com/
- S29 https://www.gamingnexus.com/Article/4480/Gods-Will-Be-Watching/ ; https://nichegamer.com/2013/10/13/gods-will-be-watching-will-test-your-sanity
- S30 https://www.pcgamer.com/gods-will-be-watching-mercy-update-adds-kinder-gentler-difficulty-levels/ ; https://www.destructoid.com/so-long-rng-gods-will-be-watching-update-adds-new-difficulty-options/ ; https://www.dsogaming.com/news/gods-will-be-watching-update-brings-new-difficulty-setting-option-to-remove-elements-of-chance/ ; https://www.gog.com/forum/gods_will_be_watching/the_mercy_update_for_gods_will_be_watching_is_available_for_windows_linux ; https://giantbomb.com/articles/gods-will-be-watching-but-theyve-chilled-out ; https://www.eurogamer.es/gods-will-be-watching-ofrece-nuevas-opciones-de-dificultad
- S31 https://www.gamespot.com/reviews/gods-will-be-watching-review/1900-6415829/
- S32 https://gamecritics.com/sparky-clarkson/gods-will-be-watching-review/
- S33 https://www.metacritic.com/game/gods-will-be-watching/
- S34 https://opencritic.com/game/639/gods-will-be-watching
- S35 https://www.pcgamer.com/gods-will-be-watching-review/
- S36 https://www.destructoid.com/reviews/review-gods-will-be-watching/
- S37 https://www.tweaktown.com/gaming/6558/gods-will-be-watching-gwbw-pc-game-review/index.html
- S38 https://attackofthefanboy.com/reviews/gods-will-watching-review/
- S39 https://www.gamegrin.com/reviews/gods-will-be-watching-review/
- S40 https://www.engadget.com/2014-08-05-gods-will-be-watching-review-morality-after-math.html
- S41 https://www.popmatters.com/195783-gods-will-be-watching-both-loves-and-fears-death-2495504029.html
- S42 https://kotaku.com/why-failing-in-gods-will-be-watching-is-as-good-as-winn-1615144212
- S43 https://www.gamedeveloper.com/design/gods-will-be-watching-and-the-question-of-fun
- S44 https://www.gamerstemple.com/game-reviews/pc/2912/gods-will-be-watching-review
- S45 https://www.techspot.com/products/pc-games/gods-will-be-watching.105099/
- S46 https://www.gamereactor.eu/deconstructeam-happy-with-reactions-to-gods-will-be-watching/ ; https://twinfinite.net/pc/pax-east-gods-will-watching-interview-developer-jordi-de-paco/
- S47 https://www.droidgamers.com/news/more-details-released-about-the-gods-will-be-watching-android-game/
- S48 https://www.cosmocover.com/newsroom/critically-acclaimed-dropsy-and-gods-will-be-watching-now-available-on-app-store-not-a-hero-lands-on-amazon-fire-tv
- S50 https://www.shacknews.com/article/89723/gods-will-be-watching-the-last-chapter-review-the-gods-have-a-cold-sense-of-humor
- S51 https://www.play-asia.com/gods-will-be-watching/13/70b7yn
- S54 https://therefinedgeek.com.au/index.php/2014/08/01/gods-will-be-watching-rngesus-is-a-cruel-god/