# Sprite item brief (shared by all helper agents)

Project: `/home/user/Ninja-Fantasy-Game` (Vite + React + TS). We are building a layered 16-bit
character sprite system for a commercial ninja-fantasy RPG. Sprites are 64x64, a 3/4 view facing
RIGHT, ~50px tall, chunky 16-bit JRPG pixel art (think SNES-era Final Fantasy / Chrono Trigger)
with dark selective outlines and hue-shifted shading.

## Read these first
- Engine core (do NOT edit these; ask in your final report if you need a change):
  - `src/sprite/raster.ts` — Layer buffers, primitives: `capsule`, `ellipse`, `poly`, `line`, `px`, `seam`, vector helpers `v/add/sub/scale/lerp/norm/perp/along`, `F_NO_OUTLINE`.
  - `src/sprite/ctx.ts` — `DrawCtx`, `ItemDef`, the `DEPTHS` draw order, limb helpers `armSpan`, `legSpan`, `armPoint`, `legPoint`, `armJoints`, `legJoints`, `footPoly`, `torsoPoly`, `fillTorso`, `handDraw`, `armDepth`, `legDepth`.
  - `src/sprite/rig.ts` — rig joints, body params (male / female / bulky), poses.
  - `src/sprite/body.ts` — base body + hand-drawn head template (head-local coords).
  - `src/sprite/compose.ts`, `src/sprite/catalog.ts`, `src/sprite/types.ts`.
- Existing exemplar items (match their quality and conventions):
  - `src/sprite/items/hair.ts` + `src/sprite/items/hairkit.ts` (hair helpers: `hd`, `cap`, `clump`, `hclump`, `shine`, `hpoly`)
  - `src/sprite/items/clothes.ts` (helpers `clothPen`, `sleeves`, `trousers`, `highCollar`)
  - `src/sprite/items/feet.ts` (helpers `boot`, `bootPen`)
  - `src/sprite/items/armor.ts` (helpers `armorPen`, `torsoRect`)
- Reference art (look at them with the Read tool):
  - `/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/images/1.jpg` — base mannequin + a dressed 64x64 sprite (the target style).
  - `.../images/2.jpg` — big pixel-art reference: dark coat, scarf, black half-cape, blue sash, crystal sword, sandals.
  - `.../images/3.jpg` — painted reference: young warrior in dark leather samurai-style armor, katana.
  - `.../scratchpad/sheets/outfit.png` — what the engine currently produces.

## Conventions
- Coordinates: 64x64 grid, y down. Character faces RIGHT (+x). "N" (near) limbs = character's right
  arm/leg on screen-left, drawn in front. "F" (far) limbs = screen-right, drawn behind the torso, one
  shade darker (`bias: -1`).
- Torso-local coords: `g.rig.T(x, y)` — x along the shoulder line (+ toward the facing side / the
  chest), y up from the pelvis (0 = hips, `g.bp.torsoLen` = base of neck). The FRONT of the chest is
  on the +x side; the back is the -x side.
- Head-local coords: `hd(g, dx, dy)` from hairkit; (0,0) = head center. Skull ≈ x -6..+6, y -7..+7.
  Brows at y≈-1, eyes y 0..2 (near eye x -1..+1, far eye x +3..+4), mouth (2..3, 5), chin ≈ y 7.
- Every item is an `ItemDef` `{ id, slot, name, desc, colors: ColorSlot[], draw(g, colors) }`.
  `colors` arrive resolved (defaults filled in), in the order of the `colors` array.
- Draw into depths with `g.L('<depth>')`; see `DEPTHS` in ctx.ts for the back-to-front order and pick
  the right one (e.g. sleeves → `nearArm.cloth`/`farArm.cloth`, boots → `nearLeg.feet`/`farLeg.feet`,
  armor → `torso.armor`, back gear → `backGear`, things in front of everything → `nearArm.over` / `top`).
- Materials: `g.m(hex, kind)` with kind `'cloth' | 'leather' | 'metal' | 'hair' | 'skin' | 'glow' | 'flat'`.
  Pens: `{ mat, part, bias?, flags? }`. `part` must be the body part the pixels move with
  (`'torso'`, `'head'`, `'upperArmN'`, `'forearmF'`, `'handN'`, `'thighN'`, `'shinF'`, `'footN'`, `'back'`, `'held'`...).
- Shades: 0 outline, 1 dark, 2 shadow, 3 base, 4 light, 5 highlight. Light comes from the UPPER-LEFT.
  Each layer gets an automatic dark outline on its silhouette; use `seam(L, a, b, -1)` for folds/seams
  and explicit shade numbers for highlights. Pixels with `F_NO_OUTLINE` are never outlined.
- Everything MUST work on all three bodies (male, female, bulky) and all 7 poses
  (idle, handsigns, attack, cast, hurt, victory, charge) because it is drawn from the rig — never
  hard-code absolute screen coordinates; derive from rig joints / `T()` / `hd()` / body params.
- Keep shapes chunky: anything thinner than 2px becomes all outline. Avoid noisy single pixels.
- Names MUST be original (we are selling the game). Do not use names, symbols or logos from Naruto,
  Final Fantasy, Seven Deadly Sins, Mushoku Tensei, etc. (no "Chunin", "ANBU", "Uchiha", "Akatsuki",
  "Hokage", leaf/sand village symbols, red-cloud cloaks, uchiha fan...). "Inspired by" shapes are fine.
- Give every item sensible default colors.

## Testing (required)
Render sheets and LOOK at them with the Read tool; iterate until they look good.
- Sheet helper: `.../scratchpad/tools/sheet.ts` exports `sheet(outPng, cells, cols, scale)` and
  `baseLook(overrides)`. Example scripts: `.../scratchpad/tools/outfit.ts`, `.../scratchpad/tools/one.ts`.
- Make your own scripts and output folder under `.../scratchpad/<your-agent-name>/` (don't overwrite
  other files). Run with: `cd /home/user/Ninja-Fantasy-Game && npx tsx <script.ts> <out.png>`.
- Always check: all 3 bodies x a few poses (at least idle, attack frame 1, cast, victory, charge),
  plus a 10x close-up of idle male.
- Typecheck with `cd /home/user/Ninja-Fantasy-Game && npx tsc --noEmit` (only fix errors in YOUR files;
  other agents are editing other item files in parallel).

## Rules
- Edit ONLY the files assigned to you. Do not edit core files, other item files, or app components.
- Do not run git commands that change state (no commit/checkout/stash/reset). I will commit.
- Final report: list of item ids + names, anything you could not do, any core change you need
  (as a proposed patch), and the paths of 1-3 final sheet PNGs that show your items.
