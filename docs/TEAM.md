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

- **Five only.** On 2026-10-28 the owner said to use nobody but Solen, Romano, Aiden, Lyra and
  Aurelia (Ren kept). `cleanup/five-only` (#3) moved Akira, Kaien, Hiro and Raiga to
  `RETIRED_PRESETS` and retired 29 hairs (`RETIRED_HAIR`). Your branches add presets (samurai,
  navy officer, noble swordsman). Should those become outfits for the five instead of new
  presets? Ask the owner before merging, and check your hairs against `RETIRED_HAIR`.
- **`shinobiData.ts` / `catalog.ts` / `words.ts`.** #3 changes the preset list in
  `shinobiData.ts`. Your branches were made before it (from `7bb10c3`). Please merge the
  integration branch into yours *after* #2–#4 are merged, rather than now, to avoid solving the
  same conflict twice.

## Questions for the owner

- Do Bob's new characters stay as their own presets, or become outfits and sets for the five?
- Merge order: Steve's stack (#2 → #3 → #4 …) first, then Bob's branches merged on top?

## Log (newest first, one line each)

- 2026-10-29 Steve: board created; Steve's lane and open PRs listed; Bob's branches listed for him
  to confirm; two questions for Bob (five-only presets, merge order); PR #17 (pointer in `CLAUDE.md`) for Bob
  to review first.
