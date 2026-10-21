# Skill icons, sheet 1: rebuilt from the owner's picture (round 6, polish)

Source: `docs/reference/icons-owner-reference-1.jpg` (1024x765). Left to right he painted Fireball, Kirin, Great Fire Annihilation and Water Wall. Each sits in his steel slot with gold corner brackets and rivets.

His rule: "todos los ejemplos que te mande necesito que los intentes copiar con la mayor exactitud posible."

Round 5 passed review. Round 6 polishes the five points still off before he sees it. Each point follows the fidelity rule: start from his pixels (his reduction on a palette sampled from his picture), clean up, and restate by hand only what the reduction loses, traced on his crop.

1. **Kirin (major):** rebuilt from his pixels at 44 and at 88. The r5 cartoon head is gone: no hand-drawn skull outline, no square fangs on a straight gum, no antenna horn, no dark mouth.
2. **Frame:** the resting gold is moved to his antique gold. The selected frame stays one step brighter.
3. **Water Wall:** the hollow is his own misty grey-blue reduction with his teal fading in. The hard ring is gone. At 88 his chunky white foam and his left-side spray are restated as his own shapes.
4. **Fireball:** his arms curl on into the white-hot core, and the outer sparks are dimmer.
5. **Great Fire Annihilation at 44:** only 5 bright embers stay, near the crest. The next 5 became dark ash flakes with one glowing pixel.

## Deliverables

All paths are under `/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/`.

- `staging/ui_icons/`
  - The icons, named by jutsu id. Each is 44x44 (the slot window, shown at 1x on a 1600x900 screen), with an 88x88 `@2x` version:
    - `fireball_goukakyu.png`
    - `kirin_thunder.png`
    - `great_fire_annihilation.png`
    - `water_shield_suijinheki.png`
  - `skill_slot_steel.png` and `skill_slot_steel_active.png`: his frame, 56x56.
    - The 9-slice insets are 16 on every side, and the slice check passes.
    - The 44x44 window is at 6,6. It is transparent except its 4 corner pixels (`#1a1206`). This was checked again on both frames.
  - `manifest.json`: round 6. The water lists two new sampled entries.
  - `ref/`: his crops, unchanged. I ran the crop script again into a new folder and every file came out byte-identical.
- `ui-icons-1-compare.png`: the comparison sheet, refreshed and titled round 6. It is drawn at 2x.
  - For each icon: his crop at 88, ours at 88, ours at 44 shown at 2x, his box reduction to 44 shown at 2x, and ours at 1x.
  - Then his row of slots, and our four icons in our frame in a row at 4x, 1x and 2x, plus the selected frame.
- Tools. Nothing in `src/`, `staging/ui_battle/` or `docs/reference/` was touched, and no git command that changes anything was run.
  - `tools/refs/icons-from-ref.py`: unchanged.
  - `tools/ui/ui-icons.ts`: changed as described below.
    - It still refuses to run without `UI_OUT` (exit 2).
    - Every file is still written under a temporary name and then renamed.
    - I ran it twice into two new folders and got byte-identical icons, frames, manifest and sheet. The staging files match them.
    - It type-checks clean under `--strict --noUnusedLocals --noUnusedParameters`. Helpers that nothing used any more were removed: the r5 Kirin head tables, `curvePixels`, `arcPixels`, and the unused water and Kirin colours.

  Commands:

      python3 -I tools/refs/icons-from-ref.py docs/reference/icons-owner-reference-1.jpg <staging>/ui_icons
      UI_OUT=<staging>/ui_icons UI_SHEETS=<art2> npx tsx tools/ui/ui-icons.ts

Note for sheets 2 and 3: `tools/ui/ui-icons-23.ts` reads this frame from `staging/ui_icons`. Its sheet will pick up the new gold the next time it runs.

## 1. Kirin, rebuilt from his pixels (44 and 88)

### The base is his own reduction

A new icon option, `sharp`, covers his head: the rectangle 40–84 x 22–76 in 88 coordinates, feathered over 4 px. Over that rectangle:

- the base is his box reduction of the crop, without the stroke smoothing, with his peach sparks painted out;
- it is unsharp-masked at the icon size: sigma 0.9, amount 0.4 at 44; sigma 1.5, amount 0.5 at 88;
- it then goes through the usual bilateral filter, palette and clean-up.

The amounts were chosen by measurement. A stronger mask moved the result away from his picture (at 88: 3.56 with amount 0.5, 4.35 with 1.0, 5.24 with 1.5).

This base already carries:

- his crescent horn;
- his snout dipping from the brow to the nose;
- his nostril slit;
- his glowing mouth;
- his lower jaw with teeth.

The mane outside the head keeps the round-5 treatment that passed review.

### What is restated by hand

Only what the reduction loses is restated. Every feature was traced on his crop, using his box reduction and, under each icon pixel, the share of his pixels that are light or dark.

- **Glow:** where his box lightness is 0.975 or more at the back of the open mouth, the pixel is his white (`#feffff`); 0.93 or more gives his near-white. That makes 6 white pixels at 44. The mouth is now the brightest part of the icon; no other pixel uses his white.
- **Gum:** a tinted line that steps down from the mouth corner to the nose.
  - At 44: row 20 at x 24–30, row 21 at x 31–36, and row 22 at x 37–38 next to the nose.
  - At 88 it follows his darkest pixels: (49,41) (51,40) (58,40) (62,41) (64,43) (74,43) (77,45).
  - At 44 it uses `#225da1`, one step darker than his box there (about 0.55, because his navy averages with his lit lip at that size). It is not a navy outline.
- **Upper fangs:** long, pointed and uneven, each ending in a 1 px tip.
  - At 88: all eight of his fangs at his places, `KIRIN_FANGS88`.
    - Most are 2 px wide at the root.
    - Lengths are 3 to 5 rows. The longest is at x 66–67, rows 44–48.
    - The front fang tips sit a pixel back.
    - His dark blue fills the gaps at the roots.
  - At 44: five fangs at his box's light peaks, with his blue in the gaps.
    - The fangs: (28,21); (30,21–22); the long middle fang at (33,22–24), where his box reads 0.89 / 0.87 / 0.77; the front fang at (35–36,22) with its tip at (35,23); and the fang at the nose at (37,23–24).
    - The gaps are at (29,21), (32,22), (34,22) and (36,23), where his box reads 0.57–0.66.
- **Horn:** the crescent itself is his own reduction, at (37,14)–(38–39,17) at 44, with his darker notch at (36,16). Only its tip at (37,14) is restated, in his pale.
- **Nostril slit:** (35,18) and (36,19) at 44.
- **Lower teeth:**
  - At 88: 15 pixels along the inner edge of his lower jaw, at the pixels where most of his pixels are his near-white.
  - At 44: one tooth at (28,32), where his box reads 0.88 and the reduction had lost it.
- **Kept from round 5:** his bolts at 44 and his peach sparks.

### How close it is to his picture

The measure: the mean OKLab difference (x100) to his crop, both blurred to the icon's resolution, over the head (x 20–42, y 10–36 of 44).

| Kirin head | Round 5 | Round 6 | His box on our palette | His box |
|---|---|---|---|---|
| 44 | 12.13 | 3.67 | 2.59 | 1.58 |
| 88 | 7.25 | 3.56 | 2.79 | 1.54 |

Over the whole icon, the blurred difference to his box fell from 3.92 to 2.24 at 44, and from 2.05 to 1.53 at 88.

At 1x and 3x on the dark bar, ours now reads the way his box does: a blue dragon roaring to the right, with his short horn, his glowing mouth and his fangs. It is crisper than his box, with no JPEG noise.

## 2. Frame: his antique gold

I measured his gold on all four of his slots:

- his brackets: median (144,117,85), saturation 0.38, brighter half (171,143,107);
- his gold line on each side: median and brighter half, about (190,172,134) on top down to (145,122,95) on the right.

I moved our ramp onto his gold. Every tone is darker and warmer than in round 5:

| Part | Round 6 | Round 5 |
|---|---|---|
| Outer edge | `#bc9c6c` | `#ebd8a9` (pale cream) |
| Round the socket | `#a4835c` | — |
| Arms' inner row | `#8c6d4c` | — |
| Body | `#6e5437` | — |
| Shadow | `#4f3c26` | — |
| Line, top / right / bottom / left | `#b8a27a` / `#83684c` / `#967c5a` / `#8c7253` | — |

The selected frame uses the same ramp one step up: the edge is `#dcbc84`, and so on down. Its amber outline is unchanged.

Gold pixels of the frame (the same measure the review used):

| Frame | Median | Saturation |
|---|---|---|
| Resting, round 6 | (150,124,90) | 0.40 |
| Resting, round 5 | (175,156,126) | 0.28 |
| His (review's target) | (150,121,87) | 0.39 |
| Selected, round 6, without its outline | (174,148,108) | 0.38 |

The brackets are still lit on their outer edges, now in his lighter gold instead of cream.

## 3. Water Wall: his misty hollow

- **Hollow recolour removed:** the three-tone recolour of the hollow is gone at both sizes. The hollow is now his own reduction:
  - a grey-blue gradient from under the lip down to his lower left;
  - his splash rising in it;
  - his teal fading in at its right.
- **Two new palette entries,** sampled from his hollow at the 25–40% and 45–60% lightness quantiles:
  - `#284e65`, his misty grey-blue;
  - `#26647b`, his lighter grey-teal.

  The k-means palette had jumped straight from navy to saturated blue there.
- **Ring removed:** the drawn turquoise ring at 44 (an arc round the hollow) and the turquoise band hugging the hollow at 88 are gone.
- **Spray at 88 as his own shapes:** each of his flecks (his coarser spray and his finer flecks, at the top left and over the hollow) goes on every pixel it covers by a third or more. This replaces the round-5 one-pixel streaks.
  - His bigger drops on the left side come out as chunky clumps of 2 to 4 pixels at his places.
  - The colour is his, pushed to stand out from the ground.
- **Chunky white foam at 88:**
  - where at least 55% of his pixels under a pixel are near-white (L > 0.9), the pixel is his near-white `#d8feff`;
  - where at least a third are, it is his `#ccf5f8`.

  This brings back his white clumps on the crest, on the splash in the hollow, on the bottom crests and on the right crest.
- **The 44** keeps his three brightest drops in the hollow, the lip, the crest foam and the splash at the lower left.

Blurred difference to his picture over the hollow (x 4–20, y 12–32):

| Water hollow | Round 5 | Round 6 | His box on our palette |
|---|---|---|---|
| 44 | 6.59 | 2.86 | 2.27 |
| 88 | 6.93 | 4.19 | 2.21 |

The 88 is further from his box because of the restated spray. Over the whole icon the difference fell from 1.97 to 1.44 at 44, and from 1.80 to 1.66 at 88.

## 4. Fireball: arms into the core, dimmer outer sparks

- **Arms into the core:**
  - The white core is laid first: his white to radius 2.6, his near-white to radius 4.
  - His three-armed spiral then runs on inside the core along the same turn rate: 1.5 px further in at 44 (to radius 2.5) and 3.5 px further at 88.
  - Inside radius 4, the gaps between the arms are his pale yellow `#fded8e`, cutting into the white, so the core reads as his pinwheel rather than a round disc.
- **Sparks:**
  - Bright, in his `#f7ab3b` or `#f38a2f` by his own brightness, only within radius 18 (of 44).
  - From 18 to 23 they are his dim `#cf5218` with a `#a0321a` tail.
  - Beyond 23 they are `#b73f19` with a `#8b2916` tail, as before.
- **Effect on the whole-icon difference:** 1.77 at 44 and 1.79 at 88 (round 5 had 1.69 and 1.74). The small rise is the dimmer rim sparks; his are softer still.

## 5. Great Fire Annihilation at 44: embers to ash

- Only his embers in the smoke count: those above his fire's base, y ≤ 30 of 44. The bright specks lower down are highlights in his flames and swirl, and the base keeps them. In round 5 they were drawn as bright dots in the swirl.
- Of his ten strongest embers in the smoke:
  - the five nearest the crest (25,9) stay bright streaks, at about (24,7), (28,15), (31,5), (16,2) and (23,24);
  - the next five become dark ash flakes like his others (`#361f27`), each with one glowing pixel on its upper-left rim.
- The glowing pixel of every ash flake at 44 is now his `#b74320`, as at 88, instead of the bright `#ee8029`. Bright orange is left only on the 4–5 embers near the crest.
- The 88 is unchanged.

## Check results

A 1–2 px cluster is an 8-connected area of one colour. "Left over" means left over from the reduction; none are.

| Icon | Size | 1–2 px clusters (his sparks / drawn / left over) | Blurred colour diff: ours (his box on our palette) | Hue: ours / his | Longest thin straight run |
|---|---|---|---|---|---|
| Fireball | 44 | 23 (21 / 2 / 0) | 1.77 (0.55) | 41 / 36 | 7 |
| Fireball | 88 | 32 (32 / 0 / 0) | 1.79 (0.52) | 41 / 35 | 12 |
| Kirin | 44 | 22 (6 / 16 / 0) | 2.24 (1.34) | 240 / 241 | 7 |
| Kirin | 88 | 16 (7 / 9 / 0) | 1.53 (1.32) | 245 / 242 | 13 |
| Great Fire Annihilation | 44 | 27 (23 / 4 / 0) | 1.61 (0.93) | 37 / 35 | 5 |
| Great Fire Annihilation | 88 | 14 (13 / 1 / 0) | 1.61 (0.96) | 37 / 35 | 7 |
| Water Wall | 44 | 15 (11 / 4 / 0) | 1.44 (0.93) | 228 / 229 | 5 |
| Water Wall | 88 | 25 (15 / 10 / 0) | 1.66 (0.83) | 228 / 229 | 12 |

- The 16 drawn small clusters on the Kirin at 44 are its fang tips, the horn tip, the nostril slit, the lower tooth and the bolt cores. Round 5 had 21.
- The 13 px thin run on the Kirin at 88 (row 58) is his own lightning breath in the base, not a drawn line.

## Known differences

- **Kirin:**
  - The restated gum and fangs add contrast his box averages away, so over the head ours is a little further from his picture than his box on our palette (3.67 against 2.59 at 44).
  - At 44 only five of his eight upper fangs fit at one pixel each. I kept the long middle one, the two front ones and the two back ones, at his places.
- **Water at 88:** his spray in the hollow is finer and denser than ours. Ours keeps his drops that cover a third of a pixel.
- **Fireball:** the rim sparks are now dimmer than round 5. His are softer still (JPEG blur), so the blurred difference rose slightly.
- **Frame:** our border is 6 px against his roughly 3.5 px, because the kit's 44 window in a 56 slot sets it.

## For his review

1. **Kirin at 44 and 88:** his own pixels with his fangs, gum and glow restated. Is this his roaring dragon? Are the fangs long enough at 44?
2. **Frame:** is this his antique gold, or should the outer edge of the brackets be a touch lighter?
3. **Water hollow:** his misty grey-blue with his spray. Is the spray at 88 chunky enough?
