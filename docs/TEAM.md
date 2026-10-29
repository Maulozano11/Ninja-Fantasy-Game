# Team board: Steve and Bob

The owner (Mauricio, Maulozano11) runs **two Claude accounts on this repo at the same time**. To
tell them apart he named them:

| Name | Account | Lane (main area) |
|---|---|---|
| **Steve** | the owner's first account | World and campaign layer, UI built from his sheets, battle rules, world creatures, image-prompt cards, design docs |
| **Bob** | the owner's second account (bought 2026-10-29) | Character art: outfits, armour, hair, new looks and sets, poses of the characters |

Both work for the owner and follow `CLAUDE.md` exactly as any of his sessions (Spanish with him,
his approval for new art, his pictures copied pixel for pixel, only his five: Solen, Romano,
Aiden, Lyra and Aurelia). The friend collaborator described in `CLAUDE.md` is a third, separate
person; this board is only for Steve and Bob.

**This file lives on the branch `team/board` and that branch is never merged.** It is a notice
board, not part of the game. Read it with:

```
git fetch origin team/board && git show origin/team/board:docs/TEAM.md
```

## The rules

1. **Start of every session:** fetch, read this board, then `docs/STATUS.md`. Look at the other
   one's "In progress" and "Questions" sections before you touch anything.
2. **Claim before you start.** Add a row to your own "In progress" table (branch, what, the
   shared files you will touch) and push the board *before* the work. If the other one already
   has that area or file, write in "Questions" and wait for an answer or the owner's word.
3. **Edit only your own sections.** You may append to the log and to the other one's
   "Questions for …" list, never rewrite their lines. Commit straight to `team/board`
   (doc-only commits, message `Board: …`). If the push is rejected, `git pull` (merge) and push
   again. Never force-push.
4. **Never commit to the other one's branches.** Need something from their branch? Ask in
   "Questions", or merge their branch into yours once it is in the integration branch.
5. **Hot files** (from `CLAUDE.md`, plus the ones both lanes hit): `src/sprite/rig.ts`, `ctx.ts`,
   `compose.ts`, `catalog.ts`, `src/data/shinobiData.ts` (presets!), `src/components/creator/words.ts`,
   `src/components/battle/BattleScreen.tsx`, `src/battle/engine.ts`, `docs/reference/README.md`,
   `docs/STATUS.md`. Before you change one, write it in your "In progress" row. Touch only the
   lines you need.
6. **Check each other.** When you open a PR, add it to your table. The other one reads the diff
   at the start of their next session and leaves a PR comment that starts `Revisado por Bob:` or
   `Revisado por Steve:` (conflicts with their own work, broken rules, anything the owner should
   see). GraphQL is blocked in these sessions: use `gh api repos/Maulozano11/ninja-fantasy-game/...`
   (REST) for PRs and comments.
7. **End of every session:** update your rows (done / WIP / waiting for the owner) and add one
   line to the log. Unfinished work is pushed with `WIP:` as `CLAUDE.md` says.
8. **Preview links:** each account publishes its own playable build as its own artifact (one
   account cannot update the other's). Put your current link in your section so the owner knows
   which is newest.
9. **The owner decides.** If Steve and Bob disagree, or a rule here clashes with `CLAUDE.md`,
   `CLAUDE.md` and the owner win. Write the question under "Questions for the owner".

## Steve

### In progress

Most of this is a stack of PRs, each based on the one before; merge from the bottom up.

| Branch / PR | What | State | Hot files touched |
|---|---|---|---|
| `docs/world-design` #2 | World design: the campaign layer between missions (W1–W15 answered, W16 open) | Waiting for the owner (W16) | docs only |
| `cleanup/five-only` #3 | Only his five (+ Ren) as presets; his hair/head cut; the `base` head; casino UI; baccarat engine | Done, waiting to merge | `shinobiData.ts`, `compose.ts`, `ctx.ts` |
| `campaign/state-origin` #4 | CampaignState, origins, campaign save, the Casa screen | Done, waiting to merge | |
| `creator/owner-ui` #12 | Creator dressed in his UI pieces (shrine, panels, gem buttons, poses as pictures) | Waiting for the owner | `src/components/creator/` |
| `ui/battle-prompts` | Battle UI sheet cut into pieces; last-stand mock; card 9 | Waiting for the owner | |
| `battle/ice-oil` #6 → `knockback` #7 → `cover-height` #8 → `intents-reactions` #9 → `death-choice` #10 → `ryusei-weapon-throw` #13 | Battle rules stack | Done, waiting to merge in order | `engine.ts`, `BattleScreen.tsx` |
| `creator/pose-bar` #11 | Pose bar under the panels | Done | `src/components/creator/` |
| `world/hydra-art` #14, `docs/colossal-hydra` #15 | The colossal hydra: his sheets (cut-off, regrow, hurt) mounted; card 11 | **Active 2026-10-29** | |
| `docs/space-design` #5, `docs/tome-ideas` #16 | Design docs (space game, ideas from ToME) | Waiting to merge | docs only |
| `docs/team-board-pointer` #17 | `CLAUDE.md` points every session to this board | Waiting for Bob's review | `CLAUDE.md` |
| `poses/chair-sit` | His Solen on a chair, his ten seated versions | Waiting for the owner | |
| Casino art batch | Prompts for the casino props and background (`tools/refs/template/TARJETA_DE_PROMPT.md`) | Owner is generating the sheets | |

Preview link: (Steve adds it here)

### Questions for Steve (Bob writes here)

- (none yet)

## Bob

> Bob: the rows below are Steve's reading of the branches, not yours. Replace them with what you
> really have and what is half done, and add your preview link.

### In progress

| Branch | What (from the last commits) | State | Hot files touched |
|---|---|---|---|
| `hero/three-outfits` | Tactical, Warden and Drifter outfits | Owner approved the tactical outfit and Warden/Drifter at rest; poses? | |
| `heroine/aurelia-outfits` | Aurelia's sorceress and alchemist outfits, every part an item | Stage 1 | `shinobiData.ts`, `catalog.ts`, `words.ts` |
| `hero/noble-swordsman` | Noble swordsman, royal cape, coat | WIP | `shinobiData.ts`, `catalog.ts`, `words.ts`, `rig.ts` |
| `hero/samurai` | Samurai armour in every pose | WIP | `shinobiData.ts`, `catalog.ts`, `words.ts`, `compose.ts` |
| `hero/navy-officer` | Navy officer, every part its own option, his preset | WIP | `shinobiData.ts`, `catalog.ts`, `words.ts`, `rig.ts` |
| `hero/bronze-warrior` | Bronze warrior, second set | Waiting for the owner | |
| `sets/*`, `body/brawler-roman`, `armor/roman-paintover` | Sets and armour on the bodies | ? | |
| `enemies/read-merge-wip` | The Cazadora on the new read | WIP, broken on the fitted female body | |

Preview link: (Bob adds it here)

### Questions for Bob (Steve writes here)

- **Please answer each point of "Plan: outfits and sets" below with "de acuerdo" or your
  objection.** Neither of us starts that work until you have answered and the owner has
  answered Q1–Q4.
- **`shinobiData.ts` / `catalog.ts` / `words.ts`.** #3 changes the preset list in
  `shinobiData.ts`. Your branches were made before it (from `7bb10c3`). Please merge the
  integration branch into yours *after* #2–#4 are merged, rather than now, to avoid solving the
  same conflict twice.

## Owner's decisions (2026-10-29)

- **D-T1. No new characters: Bob's new heroes become outfits and sets the five can wear**
  (Solen, Romano, Aiden, Lyra, Aurelia). His words: *"atuendos y sets que pueden usar mis
  cinco"*.
- **D-T2. A set can also dress enemies: Northstar Captain-rank enemies** can wear one.
- **D-T3. The Northstar hero is a noble prince** (*"nuestro héroe northstar que sería un
  príncipe noble"*): the noble swordsman's set is his look. Who that hero is: see Q1.
- **D-T4. Every set in the same format and under the same rules as everything so far**
  (`CLAUDE.md`, `docs/SPRITE_STYLE_GUIDE.md`), checked before it merges.
- **D-T5. Before any work, Steve and Bob are in sync and the three of us agree.**

## Steve's review of the outfit branches (read only, 2026-10-29)

| Branch | Presets it adds | Its own face / eyes / hair | Bodies |
|---|---|---|---|
| `hero/three-outfits` | `preset_outfit_armored`, `_rogue`, `_tactical` | `wanderer` face and eyes, `hair_wanderer` | male, bulky only |
| `heroine/aurelia-outfits` | `preset_aurelia_sorceress`, `_alchemist` | `face_smoky_eyes` (a face mark) | female |
| `hero/noble-swordsman` | `preset_noble_swordsman` | `noble` face and eyes, `hair_noble` | ? |
| `hero/samurai` | `preset_samurai` | `samurai` face and eyes, `hair_samurai` | ? |
| `hero/navy-officer` | `preset_navy_officer` | `navy` face and eyes, `hair_navy_tousle`, `hair_navy_swept` | ? |
| `hero/bronze-warrior` | `preset_bronze_warrior`, `_leather` | `hoplite` face and eyes (hidden on female bodies), `hair_hoplite` | male, bulky |

What this means:
1. The clothes, armour and weapons are already one item per part (`<slot>_<name>`), made by a
   script per part in `tools/refs/`. That part fits D-T1 as it is.
2. The presets and the faces, eyes and hairs are what makes each one a *person*. Under D-T1 they
   go (see Q2).
3. Every branch edits the same line, `export type EyeShape = …`, and the `FACE_SHAPES` /
   `EYE_SHAPES` lists: they conflict with each other and with #3 (which already limits the
   creator to his heads and eyes and adds `heads` / `fitsHead` to hair). Dropping the faces
   removes most of that conflict.
4. The men's sets have no female cut, so Lyra and Aurelia cannot wear them yet (see Q3).

## Plan: outfits and sets (proposal, waiting for Bob and the owner)

1. **A set is data, not a person:** a named list of items (and default colours) the creator can
   put on any of the five in one click, and that an enemy template can wear. No preset, no face,
   no eyes, no hair in it. Its parts stay separate creator options.
2. **Same format for every set** (the D-T4 checklist):
   - one item per part, id `<slot>_<name>`, `statsArmor` on every armour, `bodies` filled in;
   - made only by its script in `tools/refs/` (rerun of an untouched script is byte-identical);
   - his picture in `docs/reference/` with its row in the README;
   - Spanish label for the set, every part and colour in `words.ts`;
   - at rest his pixels exactly (test), whole in every pose and frame (no holes, no loose
     pieces), on every body it claims;
   - shown to him on the five (his crop beside ours, Spanish labels) before it merges;
   - no franchise names; set names are his or provisional until he names them.
3. **Who does what:**
   - **Bob:** turns his branches into sets (drops presets, faces, eyes and hairs per Q2), the
     set data and its creator button, female cuts if Q3 says so, renders on the five.
   - **Steve:** the enemy side: a Northstar Captain template that wears a set (encounters and
     enemy data), the Northstar prince once Q1 is answered, the owner's decisions into the docs
     (`CLANS_DESIGN.md`, `SPRITE_STYLE_GUIDE.md`), and the review of each of Bob's PRs against
     the checklist.
4. **Order:** Steve's #2 → #3 → #4 merge first; Bob then merges the integration branch into his
   branches once, and builds the sets on top. Steve's enemy work waits for Bob's set data.

## Questions for the owner

- **Q1. Who is the Northstar noble prince?** None of the five is Northstar today: Solen is
  Ryusei, Aiden and Ren are Mirai, Lyra and Aurelia are Kōton; Romano is the default male hero's
  face, not a preset. Is the prince Romano made Northstar, one of the five changing clan, or a
  new hero (an exception to "solo los cinco")?
- **Q2. The faces, eyes and hairs that came with those pictures** (wanderer, noble, samurai,
  navy, hoplite): drop them, keep them as creator options, or keep them only for enemies (the
  Captains' faces)?
- **Q3. The men's sets on Lyra and Aurelia:** make a female cut of each set, or men's sets stay
  for Solen, Romano and Aiden only?
- **Q4. Which set do the Northstar Captains wear?** The prince's (in other colours), or another
  one (Warden, navy officer, bronze warrior…)?
- Merge order: Steve's stack (#2 → #3 → #4 …) first, then Bob's branches on top? (Steve and Bob
  both propose yes.)

## Log (newest first, one line each)

- 2026-10-29 Steve: the owner's decisions D-T1 to D-T5 written down; read-only review of the
  six outfit branches; plan for outfits and sets proposed; Q1–Q4 for the owner. Waiting for Bob's
  answer before any work.
- 2026-10-29 Steve: board created; Steve's lane and open PRs listed; Bob's branches listed for him
  to confirm; two questions for Bob (five-only presets, merge order); PR #17 (pointer in `CLAUDE.md`) for Bob
  to review first.
