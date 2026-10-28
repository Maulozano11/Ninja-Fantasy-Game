# Shinobi 5e Chronicles

A 16-bit pixel-art ninja tactics RPG with D&D 5e-style rules: a character creator, missions with
road, short stops and camp, and turn-based battles in a 2.5D side view. Spanish and English UI.
Vite + React 19 + TypeScript + Tailwind 4. No server: the whole game runs in the browser and saves
to localStorage.

**At the start of every session:**
1. Read `docs/STATUS.md`: what is done, what is waiting for the owner, which branch holds what,
   and who works on which area.
2. Fetch, then work on your own feature branch made from the latest integration branch (see
   "Git, branches and pull requests").
3. `npm install` if there is no `node_modules`.

## Who you work for

- **The owner** is the repo owner (Maulozano11 on GitHub). He is the art director and has the last
  word on design, art, names and what goes into the game.
- **A collaborator** (his friend) runs his own Claude sessions on the same repo. The rules below
  apply to his sessions too: new art still needs the owner's approval.
- If you can't tell whose session you are in, ask.

## Working with the owner (most important)

- **Answer in Spanish.** He writes in Spanish, sometimes English. Code, comments, docs and commit
  messages stay in English. (In the collaborator's sessions, answer in the language he writes in.)
- **Show, don't describe.** Every visual change is shown as an image: a preview, or a before/after
  or side-by-side sheet with **Spanish labels** drawn on the image. Send the PNG itself.
- **New art needs his approval before it goes into the game.** Show it as before/after or
  side-by-side images first, then integrate after he says yes. Until then it lives on a feature
  branch, in a staging folder (`WORLD_OUT` / `UI_OUT`), or as `proposals/<name>.patch` plus a
  preview (`proposals/README.md`). Exception: fixes he asked for, and copies of his own pictures,
  can be integrated first and then shown.
- **Copy his pictures "con la mayor exactitud posible".** When he sends a paint-over, sprite, icon
  sheet or effect: use his pixels and his exact colours. Never redraw, reinterpret or approximate
  what is visible. Fill hidden parts by continuing his pixels. Keep his black outline. Always show
  his crop and our result side by side at the same scale.
- **Mocks and examples use only his five: Solen, Romano, Aiden, Lyra and Aurelia** (the owner,
  2026-10-28: "no uses nunca más a nadie que no sea Solen, Romano, Aiden, Lyra y Aurelia para los
  ejemplos"). Romano is the default Roman look with `armor_legion`, `skirt_imperial`,
  `hands_bronze_bracers` and `feet_sandals`.
- **His characters are the standard.** Aiden (`docs/reference/aiden-owner-reference.jpg`) was
  copied part by part (head shape, eyes, hair, armour, cape, sword, boots, gloves), each part its
  own creator option. Build new characters the same way.
- **No copyrighted material.** No franchise names, symbols or logos (he had the Sharingan removed
  from icons "para evitar el copyright de naruto"). Many Naruto-derived names and designs remain
  (list in `docs/STATUS.md`) and must be replaced with original ones before any public release.
  Don't add new ones. **The clan eyes come later: don't start on them without asking him.**
- **His decisions go into the docs.** The design docs are the source of truth. When he decides
  something, write it into the right doc (`docs/GAMEPLAY_DESIGN.md`, `docs/CLANS_DESIGN.md`,
  `docs/MISSION_DESIGN.md`, `docs/SPRITE_STYLE_GUIDE.md`). Don't change an agreed rule on your own;
  ask, and quote the doc.
- Ask before big or irreversible changes (save formats, renaming ids, deleting art, new
  dependencies). Open questions waiting for him are listed in `docs/STATUS.md`.

## Setup and commands

Node 22, npm 10. There is no `package-lock.json`: run `npm install` after cloning.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on http://localhost:3000. If 3000 is taken: `npx vite --port <free> --strictPort` |
| `npx tsc --noEmit -p .` | Type check (same as `npm run lint`; there is no ESLint) |
| `npm test` | node:test via tsx over `src/{rules,game,battle,sprite}/*.test.ts` (161 tests, ~15 s) |
| `npm run sprites -- item <itemId> [out.png]` | One item on 3 bodies x 7 poses |
| `npm run sprites -- preset <presetId> [out.png]` | A preset in every creator pose, e.g. `preset_reference_aiden` |
| `npm run sprites -- compare [out.png]` | `docs/reference/reference-sprite.png` next to Solen, 6x |
| `npm run build:publish` | The playable build, in `dist-publish/` (see "Publishing a preview build") |
| `npx tsx scripts/ai-battles.ts [N] [--party=3] [--only=cedar_rogues,night_raid]` | AI-vs-AI battles on the shipped encounters, for balance |

- `npm run build` writes `dist/` (minified). It is not the build used for the playable link.
- Open a screen directly with a URL hash: `#creator`, `#missions`, `#combat` (practice battles).
- Python art tools need Python 3 with Pillow and numpy. Run them as `python3 -I tools/...` from
  the repo root.
- `express`, `dotenv`, `@google/genai`, `.env.example`, `metadata.json`, `README.md` and the
  package name `react-example` are leftovers of the AI Studio template. Nothing uses them. The game
  reads no environment variables at runtime.
- If your `node_modules` is a symlink to another checkout's, Vite's cache (`node_modules/.vite`) is
  shared with it. Prefer your own `npm install`.

## Every change: the checks

1. `npx tsc --noEmit -p .` is clean.
2. `npm test` passes.
3. A visual change is rendered and **you look at the image** before you say it is done (recipes
   below). Then show it to the owner.

Add or update tests with the code you change. `npm test` only runs `*.test.ts` directly in
`src/rules`, `src/game`, `src/battle` and `src/sprite`; a test anywhere else must be added to the
script. `src/rules/rules.test.ts` pins the preset ids and the owner's numbers, and
`src/battle/battle.test.ts` checks the battle log text.

## Architecture

| Path | What it is | Open first |
|---|---|---|
| `src/main.tsx`, `src/App.tsx` | Mount + `Crash` boundary; the screen switch (title, creator, mission, combat, arena, campaign) | `src/App.tsx` |
| `src/components/` | Screens: `TitleScreen.tsx`, `CharacterCreator.tsx` (+ `creator/`), `mission/`, `battle/`, `scene/`, `world/`, `ui/` | the screen you touch |
| `src/components/battle/` | `BattleScreen.tsx` (main loop), `playback.ts` (paces events), `renderer.ts` (canvas), `vfxSprites.ts`, `unitArt.ts`, HUD in `hudKit.tsx`, `kit.tsx`, `hud.tsx`; text in `battleText.ts`, `battleLog.ts` | `BattleScreen.tsx` |
| `src/battle/` | Battle engine: pure TS, no React, no images, deterministic (seed + counter). `createBattle(setup)`, `applyAction(state, action)` gives `{state, events}` | `engine.ts`, `types.ts` |
| `src/rules/` | 5e rules engine: pure functions, English text only. Dice, checks, `deriveStats`, effects, ninja state, road, rests | `derived.ts`, `ninja.ts` |
| `src/game/` | Saves (`saves.ts`), the mission in progress (`missionRun.ts`), rule text in Spanish (`ruleText.ts`, `eventText.ts`) | `missionRun.ts` |
| `src/data/` | `shinobiData.ts` (clans, classes, feats, `JUTSUS_DATA`, `LEGENDARY_PRESETS`), `missions.ts`, `campActivities.ts` | `shinobiData.ts` |
| `src/sprite/` | Layered pixel sprite engine: pure TS giving RGBA buffers | `types.ts`, `compose.ts`, `catalog.ts` |
| `src/i18n/` | `strings()`, `useLang()`, `pick()`, `LangToggle.tsx` | `index.ts` |
| `src/types/` | `ShinobiCharacter` (`shinobi.ts`), mission types | `shinobi.ts` |
| `src/assets/` | Generated art (by `tools/`), loaded by import or `import.meta.glob` | |
| `tools/` | Offline art generators (`refs/`, `world-sprites/`, `ui/`, `scenes/`, `maps/`). Never run by the game | `tools/refs/README.md` |
| `scripts/` | `sprite-sheet.ts`, `ai-battles.ts`, `publish/` | |
| `docs/` | Design docs (source of truth), `reference/` (his pictures), `mockups/` | `docs/STATUS.md` |
| `proposals/` | Patches waiting for his approval | `proposals/README.md` |

Data flow: creator → `ShinobiCharacter` (sheet + `appearance: SpriteAppearance`) → `saveHero`
(localStorage) → `MissionMode` runs a `MissionRun` (saved on every change) → a party battle runs
`createBattle(encounterSetup(...))`, then `BattleScreen` drives `applyAction` and the AI
(`aiAction`) → `battleResult(state)` → `resolvePartyBattle` applies HP, effects and falls → at the
mission's end only scars and traits go back to the hero.

Keep these true:
- `src/battle` and `src/rules` never import React, the DOM or images, and never use
  `Math.random` (use the seeded `src/rules/rng.ts`; the battle draws its rolls through `rngFor` in
  `src/battle/combat.ts`). Map images are loaded in `components/battle/mapArt.ts`.
- `src/sprite` returns buffers; only components touch the DOM or canvas.
- Saves: keys `shinobi5e.hero.v1`, `shinobi5e.roster.v1`, `shinobi5e.mission.v1`, `shinobi.lang`.
  Old characters go through `migrateCharacter` (`rules/ninja.ts`). Changing a saved id (jutsu,
  item, preset) needs a migration: see `RENAMED_JUTSUS` in `CharacterCreator.tsx`.
- `world/creatures/` (hydra art) is not in the repo yet (waiting for approval); `renderer.ts` falls
  back to drawing the hydra itself.

## Text and languages

- **All player-facing text goes through `strings()` with `en` and `es`**: `const T = strings({key:
  {en, es}})`, then `T('key', params)`, and call `useLang()` in the component so it re-renders.
  Strings live next to the screen (`missionText.ts`, `campText.ts`, `battleText.ts`, …).
- Data pairs (`name` / `nameEs`) are chosen with `pick(en, es)`.
- Creator labels go through `L()`, with the Spanish in the `ES` map in
  `src/components/creator/words.ts`.
- Rules text in `src/rules` is English; its Spanish is added in `src/game/ruleText.ts`.
- Spanish is the owner's language: use his own words and names where he gave them (CLANS_DESIGN
  D24). The old Practice screens (`CampaignMode.tsx`, `ArenaSandbox.tsx`) are English only.

## Sprites and art pipeline

Read `docs/SPRITE_STYLE_GUIDE.md` before touching character art.

**Frame.** 256x256 fine px (`src/sprite/raster.ts`: `GRID=256`, `PAD={x:32,y:48}`, `BOX` = the old
128x128 figure box). The figure is about 94 px tall, 3/4 view facing right, light from the upper
left, 1 px outline toward `#07060b` added automatically (never 2 px). Bodies: male, female, bulky
(the slender body was removed). Poses: `SPRITE_POSES` (creator), `MOVE_POSES`, `CAMP_POSES` in `src/sprite/types.ts`.

**Items.** `ItemDef` (`src/sprite/ctx.ts`): `id`, `slot`, `name`, `desc`, `colors` (colour slots),
optional `parts` + `partsPreview`, `draw()`, `statsArmor` (every armor), `hidesHair`, `bodies`.
To add one:
1. Add an entry to the slot's array in `src/sprite/items/*.ts`. Ids are `<slot>_<name>`; a `_none`
   suffix keeps it out of pickers and random. `catalog.ts` and `random.ts` pick it up.
2. Colour slots with the module's `col(key, label, default, kind)` helper; parts follow
   `items/katana.ts` (`KATANA_PARTS` + `partsPreview`).
3. Spanish for colour, part and option labels in `ES` in `creator/words.ts`.
4. A new eye or face shape must be added in four places: `types.ts`, `EYE_SHAPES`/`FACE_SHAPES` in
   `creator/AppearanceEditor.tsx`, the lists in `random.ts`, and `words.ts`.
5. Check: `npm run sprites -- item <id> out.png` and look at it.

**His pixels on the rig.** Parts copied from his pictures are `PaintedPiece`s (`rows`, `colors`,
`pivot`, `angle`) stamped by `stampPiece()` in `src/sprite/painted.ts` (RotSprite, no texture, no
auto outline). At his angle every pixel is his. Recolouring uses `retintHex()` (`color.ts`): if the
player keeps his base colour, his pixels stay exactly his. His black line is never tinted. Examples:
`drawCrimsonPlate` in `items/armor.ts`, boots in `items/feet.ts`.

**Lifting his pictures.** His pictures live in `docs/reference/` (named `*-owner-reference.*`; add
a row to its `README.md` for each new one). Reproducible Python converters in `tools/refs/` turn
them into TypeScript art modules:
- Aiden: `tools/refs/aiden_ref.py` holds the shared grid (one of his pixels = about 19.32
  picture px = one fine sprite px) and the rig joints. One script per part:
  `aiden-head-from-ref.py` → `src/sprite/headArt.ts`, `aiden-eyes-from-ref.py` → `eyeArt.ts`;
  `valiant-hair-from-ref.py`, `crimson-plate-from-ref.py`, `crimson-cape-from-ref.py`,
  `flame-sword-from-ref.py`, `aiden-boots-gloves-from-ref.py` → `src/sprite/items/*Art.ts`.
  Exact command lines are in each script's docstring.
- Generated modules say "Generated: rerun the script to change it". **Fix the script, never the
  output.** Same input gives the same bytes; check that a rerun of an untouched script is
  byte-identical before you change it.
- New character from his picture: same method as Aiden. One script per part, each part its own
  creator option, his crop beside our render for every part.

**Hotbar icons.** Crop his sheet with `tools/refs/icons-from-ref*.py` into a staging folder, then
reduce to 44 and 88 px with
`UI_OUT=<stg> UI_FRAME=src/assets/ui_icons npx tsx tools/ui/ui-icons-<n>.ts` (`ui-icons-23.ts`
for sheets 2–7, `ui-icons-12.ts` for sheet 12). `UI_FRAME` is needed: without it the script looks
for the slot frame in `<parent of stg>/ui_icons/` and stops. Copy into `src/assets/ui_icons/` by
hand: `<id>.png`, `<id>@2x.png` and the sheet's manifest as `manifest_<n>.json`
(`ui-icons-23.ts` writes it as `manifest.json`; rename it, because `manifest.json` in
`src/assets/ui_icons/` is sheet 1's). Icons are named by jutsu id; `hudKit.tsx` maps buttons to
icons (`ICON_OF`). `UI_SHEETS=<dir>` writes his-vs-ours sheets. Commands per sheet are in the
scripts' headers.

**Jutsu VFX, world sprites, scenes.** `tools/world-sprites/kit.ts` `writeGroup()` writes
`src/assets/world/<group>/` (sheet + `manifest.json`), or `$WORLD_OUT/<group>/` when set. Scale:
1 m = 57 px, a character about 100 px. Element sets come from his sheets via
`tools/refs/<element>-from-ref.py` → `tools/world-sprites/vfx-<el>-v3-refdata.ts` → `vfx-<el>-v3.ts`
(details in `tools/refs/README.md`). Fire is the exception: `fire-from-ref.py` writes
`vfx-a-fire-refdata.ts`, animated by `vfx-a-fire-v3.ts`, which runs through `vfx-a.ts`. Scenes:
`tools/scenes/`; battle map ground: `tools/maps/`.

**Warnings.**
- **Always set `WORLD_OUT=<staging dir>`** when running a world or VFX generator in
  `tools/world-sprites/`. These have no guard: without `WORLD_OUT` they write into
  `src/assets/world/`, over approved art: `vfx-b.ts`, `vfx-sig-kirin.ts`, `trees.ts`, `plants.ts`,
  `landmarks.ts`, `animals.ts`, `bridge.ts`, `camp.ts`, `campsite.ts`, `creatures.ts`. The others
  (`vfx-a.ts`, `vfx-beasts.ts`, `vfx-beast-*.ts`, the `vfx-<el>-v3.ts` sets) refuse to run without
  it.
- `tools/scenes/camp_night.py` ignores `WORLD_OUT`: give it `SCENE_OUT=<dir>` or `--out <dir>`, or
  it writes into `src/assets/scenes/camp_night/`.
- `tools/maps/river_forest.py` has no output option: it always overwrites the map art in
  `src/assets/maps/river_forest/`. Run it only to change that art, and look at the diff.
- Some comments still name old off-repo paths (`art2/REF-*.jpg`, `art3/STYLE.md`); his pictures are
  now `docs/reference/*-owner-reference.*`.

## Verification recipes

**Sprite sheet:** `npm run sprites -- preset preset_reference_aiden <scratch>/aiden.png`, then open
the PNG and look. It shows only the preset's own body and the creator poses; for other bodies or
move/camp poses, render directly:

```ts
// <scratch>/render.ts, run from the repo root: npx tsx <scratch>/render.ts out.png
// (import from your checkout's absolute path)
import { LEGENDARY_PRESETS } from '<repo>/src/data/shinobiData';
import { renderSprite } from '<repo>/src/sprite/compose';
import { dojutsuToEye } from '<repo>/src/sprite/legacy';
import { GRID } from '<repo>/src/sprite/raster';
import { writePng } from '<repo>/tools/world-sprites/kit';
const c = LEGENDARY_PRESETS.find((p) => p.character.id === 'preset_reference_aiden')!.character;
// any SpritePose, frame; the eye argument is what the game passes (unitArt.ts), so the eyes match
const f = renderSprite(c.appearance!, 'idle', 0, dojutsuToEye(c.dojutsu));
const k = 4, W = GRID * k, out = new Uint8Array(W * W * 4);
for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
  const s = (((y / k) | 0) * GRID + ((x / k) | 0)) * 4;
  out.set(f.rgba.subarray(s, s + 4), (y * W + x) * 4);
}
writePng(process.argv[2], W, W, out);
```

**Compare with his reference:** crop his picture and our render to the same subject, scale both to
the same size with nearest-neighbour, put them side by side with Spanish labels ("Tu dibujo" /
"En el juego", "Antes" / "Después") using Pillow, and look at it at 4x or more before sending.

**In the browser (Playwright):** start the dev server in the background, then drive Chromium.
Playwright is not a dependency of the project.
- Cloud sessions: it is installed globally (`/opt/node-tools/node_modules/playwright`, browser at
  `/opt/pw-browsers/chromium`). Use the two lines below as written.
- Your own machine: `npm install --no-save playwright && npx playwright install chromium`
  (`--no-save` keeps it out of `package.json`: no new dependencies without asking; a later
  `npm install` removes it, so rerun it then). Import it from
  `<repo>/node_modules/playwright/index.mjs` and call `chromium.launch()` with no
  `executablePath`.

```js
const { chromium } = await import('/opt/node-tools/node_modules/playwright/index.mjs'); // own machine: '<repo>/node_modules/playwright/index.mjs'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); // own machine: chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.addInitScript(() => {
  localStorage.setItem('shinobi.lang', 'es');        // or 'en'
  localStorage.setItem('shinobi.battleSpeed', '1');
  localStorage.setItem('shinobi.tips.off', '1');
});
await page.goto('http://127.0.0.1:<port>/#combat');  // practice battles
await page.getByText('Pelear').first().click();      // start the first one
await page.waitForFunction(() => typeof window.__battle === 'object');
await page.screenshot({ path: '<scratch>/battle.png' });
```

`window.__battle` (dev only, `BattleScreen.tsx`) exposes `state`, `act`, `busy`, `centerOn`,
`screenOf` and more, to drive a battle. Stop the dev server when done.

## Code conventions

- Match the surrounding code: its style (2 spaces, single quotes, semicolons, long lines are fine),
  naming, and comment density. Comments say why, in plain English.
- Don't reformat or reorganize code you are not changing, and don't rename things in passing.
- Keep pure modules pure (see Architecture).
- No new dependencies without asking the owner.
- Don't write AI model identifiers (ids like `claude-…`) into code, comments, docs, branch names,
  commit messages or PR text. The attribution lines your environment asks you to end commits and
  PRs with are fine: add them as instructed.

## Git, branches and pull requests

- **Integration branch: `claude/eloquent-noether-ix51z1`.** Everything approved is there. `main`
  is the untouched template; nothing goes into it until the owner says so.
- **One feature branch per task**, from the latest integration branch, named `<area>/<topic>`
  (e.g. `icons/sheet-12`, `camp/owner-ref`, `poses/throw-pierce`).
- **Small, focused commits** whose message says what changed and why, e.g. `Throw and thrust
  poses: the owner's weapon-throwing pose and a piercing attack`. Unfinished work pushed at the end
  of a session starts with `WIP:` and says what is left.
- Run the checks before every commit. Commit only the files of your change; never commit secrets,
  `.env`, `node_modules`, `dist*/` or staging folders.
- **Open a pull request into the integration branch.** For art, include the before/after images
  and say whether the owner has approved them. It is merged after review (and his approval for
  art), with a merge commit.
- **Never rewrite shared history**: no force-push, no rebase of pushed branches, no amending pushed
  commits. Bring the integration branch into yours with `git merge`.

## Working in parallel (owner's sessions and the collaborator's)

- **Claim an area** before you start: check the split in `docs/STATUS.md` and the open branches
  (`git fetch && git branch -r`). If someone already works there, ask first.
- **Pull and merge often**: `git fetch` and `git merge origin/claude/eloquent-noether-ix51z1` into
  your branch at the start of each session and before opening a PR.
- **Keep PRs small** so they merge quickly and conflict little.
- **Shared hot files** (touch only what you need, and say so in the PR): `src/sprite/rig.ts`,
  `ctx.ts`, `compose.ts`, `src/data/shinobiData.ts`, `src/components/battle/BattleScreen.tsx`,
  `src/battle/engine.ts`, `docs/reference/README.md`.
- Generated files (`src/assets/**`, `*Art.ts`, `*-refdata.ts`) change only by rerunning their
  script. If two branches regenerate the same file, rerun the script after merging instead of
  hand-merging the output.
- When your PR finishes or starts something listed in `docs/STATUS.md`, update those lines in the
  same PR (only your lines).

## Publishing a preview build

The playable link is a claude.ai artifact. **The owner's link is his: only his sessions update
it.** A collaborator publishes his own preview builds as his own artifacts.

1. `npm run build:publish` (config `scripts/publish/vite.publish.config.ts`; it copies the
   hand-written page `scripts/publish/index.html` over Vite's). Output `dist-publish/`:
   `index.html` + `assets/` (`game.js` unminified, `libs.js`, `index.css`, every image; about 165
   files, 25 MB; gitignored).
2. Check it: `python3 -m http.server <port> --directory dist-publish`, open it in Playwright, see
   the title screen, check for console errors (the only expected one is a 404 for `/favicon.ico`),
   then stop the server.
3. Publish with the Artifact tool: `file_path` = `dist-publish/index.html`, `files` = a map of
   every asset. Print it with:
   `node -e "const fs=require('fs');console.log(JSON.stringify(Object.fromEntries(fs.readdirSync('dist-publish/assets').sort().map(f=>['assets/'+f,'dist-publish/assets/'+f]))))"`
   Limits: 255 files and 64 MB per publish, 15 MB per binary file. To update an existing artifact,
   pass its `url`.

## Docs

| Doc | For |
|---|---|
| `docs/STATUS.md` | What exists, branches, work waiting for the owner, backlog, who works where |
| `docs/GAMEPLAY_DESIGN.md` | Battle system (source of truth) |
| `docs/CLANS_DESIGN.md` | The four clans, decisions D1–D24 (replaces GAMEPLAY_DESIGN's clan section) |
| `docs/MISSION_DESIGN.md` | Missions, rests, camp, tension, death, cinematics |
| `docs/SPRITE_STYLE_GUIDE.md` | Character sprite standard and new-item checklist |
| `docs/reference/README.md` | His pictures, his copy rule and what each picture is the bar for |
| `docs/rest-and-cinematics-proposal.md` | The original Spanish proposal (answered; rules moved to MISSION_DESIGN) |
| `docs/WORLD_DESIGN.md` | The Spanish proposal for the campaign layer between missions: origin, people, social events, love, reputation, wealth, base, time, lineage, campaign generator, setting packs; answered, W13–W15 open; rules not yet moved to the English docs |
| `docs/SPACE_DESIGN.md` | The Spanish code-structure proposal for the space game (mechas, ships, cadets) from the owner's master design: a second, deterministic tactics engine `src/tactics/`, the ship as the space pack's base, questions S1–S8 open |
| `docs/scene-art-plan.md` | The Spanish plan for producing scene, base and prop art: template, generic converter, prompt cards, inventory, batches (A1–A5 open) |
| `tools/refs/README.md`, `tools/world-sprites/README.md` | Converter and generator details |
