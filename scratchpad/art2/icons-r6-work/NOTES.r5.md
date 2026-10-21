# Skill icons, sheet 1: rebuilt from the owner's picture (round 5)

Source: `docs/reference/icons-owner-reference-1.jpg` (1024x765). Left to right he painted Fireball, Kirin, Great Fire Annihilation and Water Wall. Each sits in his steel slot with gold corner brackets and rivets.

His rule: "todos los ejemplos que te mande necesito que los intentes copiar con la mayor exactitud posible."

Round 5 fixes the major and every minor from review round 4:

- **Kirin at 44 (major):** it now reads as his dragon's head in profile.
  - The mane is his own reduction again.
  - The head is redrawn as a navy-outlined profile with an open mouth.
- **Kirin at 88:** triangular fangs on a curved gum, a nostril, and pointed lower teeth.
- **Great Fire Annihilation:** his swirl at his size, his second small curl, and his dark gaps on the left flank.
- **Water Wall at 44:** a blue hollow with three separate drops, his near-white foam, and crisper bands.
- **Fireball:** a white-hot core with streaks curling in, a softer rim, and irregular sparks.
- **Frame:** 2 px gold arms with his step, rivets in dark sockets, and all four brackets lit on their outer edges.

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
    - The 44x44 window is at 6,6. It is transparent except its 4 corner pixels (`#1a1206`).
  - `manifest.json` (round 5).
  - `ref/`: his crops. I ran the crop script again into a new folder and every file came out byte-identical.
- `ui-icons-1-compare.png`: the comparison sheet, drawn at 2x.
  - For each icon: his crop at 88, ours at 88, ours at 44 shown at 2x, his own box reduction to 44 shown at 2x, and ours at 1x.
  - Then his row of slots, and our four icons in our frame in a row at 4x, 1x and 2x, plus the selected frame.
- Tools. Nothing in `src/` or `staging/ui_battle/` was touched, and no git command that changes anything was run.
  - `tools/refs/icons-from-ref.py`: unchanged.
  - `tools/ui/ui-icons.ts`: changed as described below.
    - It still refuses to run without `UI_OUT` (exit 2).
    - Every file is still written under a temporary name and then renamed.
    - I ran it twice into two new folders and got byte-identical icons, frames, manifest and sheet. The staging files match them.
    - It type-checks clean under `--strict --noUnusedLocals --noUnusedParameters`. Helpers that nothing used any more were removed.

  Commands:

      python3 -I tools/refs/icons-from-ref.py docs/reference/icons-owner-reference-1.jpg <staging>/ui_icons
      UI_OUT=<staging>/ui_icons UI_SHEETS=<art2> npx tsx tools/ui/ui-icons.ts

## The findings, one by one

### Kirin at 44 (major)

**The mane is his own reduction.**

- At 44 his crop is no longer smoothed along his strokes (`flow44: [0, 0]`). His box reduction goes on the palette with every step of his ramp.
- Only 1–2 px areas are merged. The round-4 posterising is gone: every other ramp step, 6 px merges, the forced darkening and the pale-to-bright recolour.
- Only his deepest gaps between strands (darker than their blur by 0.09 or more) go one step down. His bright strands radiate up and left on his navy, as in his value map.
- The five drawn mane spikes are removed, since his strands now carry the mane.

**The head** is redrawn whole by hand (`KIRIN_HEAD44`, traced on his crop with a 44 grid). It is a profile facing right:

- **Outline:** a 1 px tinted navy line (`#1a2351`, `#1a3269` at the back of the skull) runs all round the head:
  - the back of the skull where his crest rises;
  - the brow top;
  - the snout top, sloping down to the nose;
  - the rounded nose front;
  - under the lower jaw to the chin.

  The light mane pixels touching it are one step darker, so it reads against them.
- **Brow and snout:** lit in his pale `#96f3f8`, with his near-white `#d3fbfb` along the brow ridge and the snout top. The snout tapers from the brow to the nose.
- **Nostril:** a navy pixel just behind the top of the nose.
- **Eye:** a bright `#d3fbfb` slit, 2 px, at (34–35, 18) under a dark brow, with a navy pixel at each end.
- **Horn:** a curved hook 2 px wide at x 36–41, y 8–15. It rises from the snout top behind the nose, bows back and turns up to a white tip, as his reads at this size. It is navy on its back edge and lit on its front.
  - His top peach spark moved to (41–43, 8–10) to clear it.
- **Gum and fangs:** a navy gum from the mouth corner sloping down to the nose. Four fangs hang from it, each 2 px wide at the root and pointed (a `#d3fbfb` root, a white tip):
  - two of 3 rows, at x 29–30 and x 35–36;
  - two of 2 rows, at x 32–33 and x 38–39;
  - with `#1a3269` navy in every gap.
- **Open mouth:** a dark wedge widening to the right between the fangs and the lower jaw:
  - `#1d3f82` toward the back, `#1a3269` toward the opening at the right;
  - his white and `#d3fbfb` glow only at its back (x 23–28, y 22–27), in three rings round his white core;
  - his bolt leaving the mouth thin: 1 px of his pale cyan joining his outer bolt.
- **Lower jaw:** a navy line under it from the mouth corner round the chin, a lit band 2 px wide (3 at the chin), and three white teeth on its inner edge pointing into the mouth, at (28, 29), (30, 30) and (32, 29).

**Value:**

| Kirin at 44 | Round 4 | Round 5 | His box |
|---|---|---|---|
| Lightness, 10th / 25th percentile | 0.22 / 0.28 | 0.277 / 0.332 | 0.309 / 0.426 |
| Blurred OKLab difference to his box (our check) | 6.30 | 3.92 | 1.34 for his box on our palette |

The remaining dark share is the drawn outline and the open mouth the review asked for:

- L < 0.3: 17% of ours against 9% of his;
- L < 0.4: 33% against 21%.

**At 1x and 3x on the dark bar beside his row:** a blue dragon's head roaring to the right, with:

- a horn;
- a bright snout and an eye slit;
- a dark open mouth with white fangs over it;
- a lit lower jaw with teeth;
- his glow at the back of the mouth.

### Kirin at 88 (minor)

- **Gum:** a smooth curve (`KIRIN_GUM88`, a quadratic through his line) from the mouth corner down to the snout front. It is ink with navy under it, and replaces the stepped line.
- **Upper fangs:** six plump triangles, 3 px at the root tapering to a 1 px tip (rows of 3, 3, 2, 1 and 1 for the longest).
  - They are his white with a `#d3fbfb` front edge.
  - Navy fills every gap, and before the first fang too, so it stands apart from his glow.
- **Nostril:** a small navy and ink curl near the top of the nose.
- **Crease:** the brow crease is now a short curve, and the long straight navy line over the brow ridge is gone.
- **Lower teeth:** five small pointed shapes at his places on the jaw's inner edge. Each points into the mouth (right, up-right, up or up-left, by the jaw's direction there), with a `#d3fbfb` tip.

### Great Fire Annihilation (minor)

**Swirl, at both sizes (`swirlField`):** one spiral field at his size replaces the round-4 hand-drawn 1 px hook and the 88 line.

- It is 11 x 9 px at 44 and 22 x 17 at 88, on his oval centred at (29.2, 70.8) of 88.
- **The dark-red band** is two tones deep: `#7c3127` on its outer side, `#67191c` inside.
- **Between the turns** is his orange `#e2691f`, lit `#f49933` at 88 (`#ee8029` at 44) just inside each dark turn, with his `#ee8029` at the eye.
- **Turns and opening:** about 1.7 turns, clockwise, open at the top right where it runs into his flames.
- **Second curl:** his small curl at its lower right, centred at (41.6, 81.2) of 88, which is (20.6, 40.4) at 44.

**Left flank at 88:** his dark-red gaps between the flame tongues are restored.

- They are found on his own box reduction: darker than their blur by 0.025 or more, in x < 34, y 6–62.
- Each steps one or two steps down his crimson ramp, from `#fff2a2` down to `#361f27`, so it never falls into his smoke greys.
- 1–2 px leftovers are cleaned up as usual.
- Edge energy on the flank is 0.0565 against his 0.0563. Over the whole icon it is 0.0377 against his 0.044 (it was 0.036), because his smoke texture is softer in ours.

**Smoke at 88:**

- 12 ember streaks instead of 20, with less push from the ground.
- The ash flakes' glowing pixel is his `#b74320` instead of the bright `#ee8029`.

### Water Wall at 44 (minor)

- **Crispness:** the 44 uses a shorter stroke smoothing (σ 2, 6 px instead of σ 3, 10 px) and a lighter bilateral filter (0.6, 0.03).
  - Edge energy is 0.082 against his box's 0.091.
  - The share of edges over 0.1 in lightness is 0.30 against his 0.33.
- **Hollow:** lifted one step toward his blue, at both sizes:
  - `#233850` where it is deepest, at the top of the dome;
  - then `#164c71`;
  - then `#1b5c7c` toward his lower left.

  It was `#192538`, `#233850` and `#164c71`. His teal glow right under the lip (x ≥ 13.5, y ≤ 15.5) is no longer recoloured.
- **Drops:** at 44 every hollow pixel takes the hollow tone, and his foam comes back as three separate drops.
  - They sit at his own brightest peaks there: (12, 20), (13, 23), and (11, 26–27), the lowest 2 px long.
  - Each is at least 2 px of hollow away from the others. The connected squiggle is gone.
- **Foam:**
  - His near-white `#d8feff`, sampled from his crest's whitest 3%, is a new palette entry.
  - The crest foam takes it where at least half of his pixels in the cell are near-white, and along its top edge.
  - His bottom-left foam crests (x ≤ 22, y ≥ 26) are restated in his two lightest tones: `#ccf5f8` where 30% of his pixels are white, `#d8feff` where 50% are.

### Fireball (minor)

**Core:**

- His whitest (`#fefffa`, sampled from his core, a new palette entry) fills radius 2.6 of 44, inside `#fdfde2` out to radius 4.
- Chroma within radius 4 is 0.024 at 44 and 0.023 at 88, against 0.04 in round 4 and his 0.016 / 0.015. Within radius 2 it is 0.007, his is 0.008.
- Three thin bright streaks (`#fdf7ab`, then `#fded8e`) curl into the white, between three gaps (`#f9ce5d`, then `#f7ab3b`).
  - The streaks follow a three-armed spiral fitted to his picture between radius 4 and 16: his bright arms leave the core at about 90, 210 and 330 degrees and turn clockwise by about 0.05 of a turn per pixel.
  - The round-4 "gap" lines turned out to lie on his bright arms; they are swapped now.

**Rim:**

- The fade beyond his arm tips steps down once from radius 21.5. Round 4 stepped three times, from radius 18.
- Where his arm tips reach past the rim (radius 18.5–22.5, his box lightness over 0.3), they keep his mid-dark `#8b2916`, so the rim breaks as his does.
- The 25th percentile of lightness is 0.242 at 44 against his 0.249 (round 4 had 0.18). The blurred difference to his box fell from 3.42 / 3.66 to 1.69 / 1.74.

**Sparks:** his specks beyond radius 15 (round 4: 18), the most visible first, at least 2 apart (round 4: 2.5). Each one varies:

- **Length:** 1 to 3 px, by his speck's size.
- **Colour:** his `#f7ab3b`, `#f38a2f` or `#cf5218` core, by his own brightness there.
- **Far ones:** past radius 23 they are dim (`#b73f19`, with a `#8b2916` tail).

### Frame (minor)

The bracket is now drawn as one picture (`BRACKET`) and mirrored into all four corners:

- **Arms:**
  - 2 px of gold for their full 10 px: his pale `#ebd8a9` outer edge, then his gold `#a6875b` inside.
  - A 45-degree tip at pixel 11.
  - His step on the inner edge near the block, where the arm is 3 px thick for 2 px (x 7–8).
- **Rivets:** a 2x2 grey ball (`#b4b7bf`, `#78787c`, `#555251`) in a 1 px dark socket (`#15161a`), 4 px across. They are lit from the top left in every corner.
- **Lighting:** every bracket is pale on its outer edges. His shadow `#584429` is only on the inner edges: the block's diagonal and the end of the step.
- **Selected variant:** the same shape in its brighter golds.
- **Border:** the 6 px border against his roughly 3.5 px is still the kit's 44-in-56 constraint (see below).

## Check results

A 1–2 px cluster is an 8-connected area of one colour. "Left over" means left over from the reduction; none are.

| Icon | Size | 1–2 px clusters (his sparks / drawn / left over) | Blurred colour diff: ours (his box on our palette) | Hue: ours / his | Longest thin straight run |
|---|---|---|---|---|---|
| Fireball | 44 | 21 (21 / 0 / 0) | 1.69 (0.55) | 41 / 36 | 7 |
| Fireball | 88 | 31 (31 / 0 / 0) | 1.74 (0.52) | 41 / 35 | 12 |
| Kirin | 44 | 26 (5 / 21 / 0) | 3.92 (1.34) | 245 / 241 | 7 |
| Kirin | 88 | 28 (8 / 20 / 0) | 2.05 (1.32) | 240 / 242 | 12 |
| Great Fire Annihilation | 44 | 28 (24 / 4 / 0) | 1.50 (0.93) | 37 / 35 | 5 |
| Great Fire Annihilation | 88 | 14 (13 / 1 / 0) | 1.61 (0.96) | 37 / 35 | 7 |
| Water Wall | 44 | 15 (11 / 4 / 0) | 1.97 (1.00) | 228 / 229 | 6 |
| Water Wall | 88 | 26 (24 / 2 / 0) | 1.80 (0.88) | 228 / 229 | 12 |

- The 21 drawn small clusters on the Kirin at 44 are its fangs, teeth, eye, nostril and horn tip. Round 4 had 45.
- The 12 px thin runs at 88 are his own strands and band edges, not drawn lines:
  - the Kirin's is a pale mane strand on row 38 at x 19–30;
  - the water's is a band edge in column 42.

## Known differences

- **Kirin at 44:**
  - The head is drawn, not reduced, so it stays the furthest of the four from his box reduction (3.92).
  - His mouth is lit by a large glow. Ours keeps the dark open mouth the review asked for, with the glow only at its back.
- **Kirin horn:** at 44 the hook includes the white stroke that his bolt draws over his horn tip, as it reads at this size. At 88 his horn and his bolt stay separate, as he painted them.
- **Fireball at 88:** the corners are a little darker than his (25th percentile of lightness 0.21 against 0.25). At 44 they match (0.242 against 0.249).
- **Fire wave at 88:** away from the left flank, his smoke is a little softer in ours (edge energy 0.0377 against 0.044 over the whole icon).
- **Frame:** our border is 6 px against his roughly 3.5 px, because the kit's 44 window in a 56 slot sets it.

## For his review

1. **Kirin at 44:** a navy-outlined profile head with a dark open mouth, drawn over his own mane. Is this his dragon at 1x, or should the mouth be filled with his bright glow, as he painted it?
2. **Kirin horn at 44:** a hook rising and turning up to a white tip. Is that his horn?
3. **Fire wave swirl:** a dark-red spiral band on his lit orange, with his second small curl. Is that his swirl?
4. **Frame:** brackets lit pale on all four corners, rivets in dark sockets. Keep the kit's 6 px border, or widen the window (for example 48 in a 56 slot) so the frame is as thin as his?
