# Battle UI kit — rebuilt from the owner's reference (review round 4)

Source: `docs/reference/ui-battle-owner-reference.jpg` (1024x576). His rule: copy his examples as exactly as possible.
His decisions applied: no web navigation bar in battle and a **menu button at the top left** in the same style; **no tile grid**; the chained bar at the top centre shows the **targeted / hovered enemy, or the boss**; skill icons will be painted by him later (the kit has the empty slot frames and number tags); everything else follows his picture.

Deliverables (this folder):

- `ui-battle-kit.png`: every piece at 2x, labelled (name, size, 9-slice insets).
- `ui-battle-compare.png`: each crop of his (scaled to our size) beside our piece, both at 3x (new this round: `medallion_crown_left` beside `medallion_active`, `bar_corner_bottom` beside `bar_frame`). At the end, "as placed": his regions (top centre, minimap, crest, bar, party) beside the same regions of our mockup, at 2x.
- `ui-battle-mockup.png` (1600x900): the kit over a real battle frame from the published build (canvas only, every HTML overlay and the web header hidden), at his positions.
- `staging/ui_battle/`: the pieces (`*.png`), `manifest.json`, `layout.json` (where the mockup put each piece), `ref/` (his crops), `capture/` (frame, HUD shot and minimap used by the mockup).

## What changed in round 4

- **Active medallion, big bosses (the major)**: the values now match his dark knobs. Each big boss is a dark dome:
  - interior `#2e2010`, with a darker crescent `#16120c` just inside the rim toward the lower right (no hard diagonal split, which read as a mouth);
  - a clean 1-art-px rim (the disc's edge pixels) lit from the upper left (`#d3c6a5` / `#b3a383` / `#918063`);
  - his pale twin highlight just above the centre: a 5 x 2 art-px glint, two bright bumps (`#efe7cf`) with a dark notch in the top row only and a dimmer row under them (`#d3c6a5` / `#b3a383`), so it reads as one two-lobed glint, not two eyes.

  The dark ovals that read as "Z" and "K" are gone. Checked at 1x and 6x against his crop (`medallion_crown_left` in the compare sheet, and the mockup against his picture).
- **Active medallion, crown and pearl**: the crown now steps down on each side to a third small dark boss: a 1-px pale rim round a round dark core with a pale centre dot (it no longer reads as a cross-hair), sitting on the trough rail at his (729, 728). A short wire tail runs out along the rail and ends in an upturned curl. The bottom pearl is a 6.5-art-px gem (13 px on screen, his about 14) in a thin bezel. The piece is wider for this: **200 x 112**, ring centre at (100, 54). The manifest now gives that centre as `anchor`, and the mockup places the piece by it (still 806, 728).
- **Target plaque** (`target_bar`, now 400 x 40, caps 80 px):
  - Only his thin silver rail runs along the bar: outline, a pale line `#9d9384`, a mid line `#5f5649`, then the channel. The full-length cream and khaki lines are gone. The rail is 2 px thinner per side, like his.
  - The channel has his rounded bullet nose at both ends, and the rail follows it round.
  - The finial is redrawn in his warm bronze (`#cdbf9c` / `#a4936f` / `#7f6b4b` / `#56462e`). It has a pale lozenge tip, a muted rose stone `#c47e88` / `#843d4c`, and an open lyre of two small loops with dark eyes. A thin wire arm rises over the nose, runs along the rail and ends in a small curl 37 art px (74 px) from the tip. The stepped collars and black notches are gone.
- **Lower plaque brackets**: a triangular gusset of clean 1-px curves in his warm khaki gold (`#ab9c7c`), wide along the bar and pointed at the plaque's lower corner, laid out as in his picture:
  - a two-wire band along the bar (no full-length pale line) and a small curl at the outer tip;
  - the long edge, nearly straight from the tip to about (20, 13) art px, lit along its top (`#d2c4a4` over `#8c7d60`) and ending in an upturned curl;
  - an S-scroll holding his eye (10 px, two dark dots in a pale ring) at his spot;
  - the X of two crossing C-curves, crossing at about (26, 6), its outer leg reaching the plaque's lower corner.

  Measured on his picture, the inside of his triangle is mostly metal, not grass (median luminance 85, 16 % pale, 20 % dark). So the gaps away from the scrolls are a mid bronze `#5a4c35`, each scroll keeps its dark outline, and the grass shows only under the X. Ours now measures median 78 and 14 % pale; the all-open wire measured median 40. The plaque ends are rounded (radius 6 art px) with a thin dark edge, no black bars.
- **Bar frame**:
  - The zipper cord is replaced by his sparse lace: a scalloped wire with one small C-curl every 8 px, touching the rail between curls, with the grass showing through each curl.
  - Each corner gem has a wire arm of 28 px along the outside of the rail, ending in a curl. The bottom arms end in a clear scroll.
  - The corners are now 44 px wide, so the arms stay in the corner slices: **104 x 80, slice 24 44 24 44**, outset 6. The lace repeats every 8 px down the ends, so the seam rule for the height is now **(height - 48) % 16 == 0**. The width rule is unchanged, (width - 48) % 8 == 0. The bar box 920 x 112 passes both, and the generator checked every placement.
- **Minimap ring**:
  - The band is shaded pearl grey, lit from the upper left. It runs from `#e2ded4` at the upper left through `#cbc7bc` at the top and left to `#8f8b82` at the right and bottom.
  - The ring-and-bead chain is replaced by a running scroll: one wave every 7 px that rolls over and curls into an eye, on a dark backing between two gold lines.
  - The diagonal gems sit in pointed lozenge mounts, long along the radius, standing a little outside the ring (as in his picture). The cardinal mounts are narrower and more pointed.
- **Round medallion**: a true circle with a fine rim. From the outside in: outline, a thin metal line lit at the upper left, a row of 1-art-px pale beads with dark separators, a thin inner line, and an inner outline. The four gems sit on the bead line in thin bezels, with only their points reaching a pixel past the rim, so it no longer reads as a diamond.
- **Small pieces**:
  - `skill_tag`: dark fill with a dim bronze rim (`#85755a` to `#3f3527`) instead of bright silver.
  - `party_frame`: slightly rounded corners (the outer line cuts each corner on the diagonal) and a small gold curl in each top corner. The bottom corners, where the bar wells are, get a bright knot on the inner line. The old dark corner squares are gone.
  - `init_ally` / `init_enemy` (now 36 x 40): the base is a thin strip, two rows of the team colour in an outline, 24 px wide under the 34-px circle.
- **Mockup text and movement bar**:
  - The pips sit at x 386, 436 and 486 (his 388, 436, 482). The outer two moved 2 and 4 px out so each caption, still centred on its pip, keeps a clear gap from the next.
  - `move_trough` has his small pointed left end (a chevron), and the teal fill starts just after it. The trough starts at x 400, right after "Mov.".
- **Generator**:
  - The manifest gives each sliced piece's `repeat` period (screen px) and the medallion's `anchor`.
  - The slice check accepts centres that repeat every 1, 2 or 4 art px. The CSS check still draws every placement both ways and refuses a seam.
  - New helpers in `ui-battle-pieces.ts`: `pixelPath` and `strokeMap` (clean 1-px curves for wire maps, no doubled stair steps) and `openLace` (wire with only a drop shadow, so the gaps stay open).
- **Extractor**: new crops `medallion_crown_left` and `bar_corner_bottom`.

Earlier rounds (still true): open wire crest shoulders, the CSS seam check, his thin bar rails and spacing inside the bar, the chain tones and paths, the end-turn gem inside the panel, the warm gold skill slots with open windows.

## Scale and pixel grid

- Game window 1600x900. His picture is 1024 wide, so his pieces scale by 1600/1024 = 1.5625.
- Every piece is drawn in **art pixels** and written with each art pixel as **2x2 screen pixels**. One of his detail pixels is about one art pixel, so the pieces keep his chunky look.
- All sizes, insets and mockup positions are even numbers. Keep pieces on even screen coordinates and draw them with `image-rendering: pixelated`. For other window sizes, scale the whole HUD layer by a whole number, or by one CSS `transform: scale()` with pixelated rendering.

## Pieces (screen pixels)

Slice order is top, right, bottom, left. "Window" is where a portrait, map, icon or fill shows through or sits (x, y, w, h).

| Piece | Size | 9-slice | Window | Use |
|---|---|---|---|---|
| `menu_button` | 40x40 | — | — | Menu button, top left. His thin-rimmed dark square with small corner curls, red gem set into the top rim, three bars. |
| `button_small` | 24x24 | 8 8 8 8 | 6,6,12,12 | His small square button above the party frames (flat centre); `glyph_emblem` inside. |
| `target_bar` | 400x40 | 0 80 0 80 | 36,14,328,12 | Chained plaque for the targeted/hovered enemy or the boss. Only his thin silver rail along the bar; bronze finials (lozenge tip, rose stone, lyre of two loops with dark eyes) and thin wire arms along the rails ending in a curl; the channel has rounded bullet ends. Any width from 160; the mockup uses 390. |
| `target_fill` | 32x12 | 0 6 0 6 | — | Red fill for the plaque channel (width = HP fraction); its rounded ends follow the channel's nose. |
| `chain_left` | 76x108 | — | — | Chain from the top edge down to the round medallion's left gem. |
| `chain_right` | 104x116 | — | — | Chain from the end circle: flat at first, then curving up to the top edge. |
| `chain_sag` | 116x32 | — | — | Chain hanging under the turn row; draw it before the bells so its ends tuck behind their bases. |
| `chain_link` | 16x10 | — | — | The short link between the last bell and the end circle. |
| `round_medallion` | 80x80 | — | 20,20,40,40 | "RONDA" over the round number (no box). Round rim of fine 1-art-px beads between two thin lines; four oval gems set on the bead line (red top/left, green right/bottom, as he painted them). |
| `init_active` | 44x44 | — | 6,6,32,32 | Turn row: the acting unit, gold square with rounded corners. Portrait goes under it. |
| `init_ally` / `init_enemy` | 36x40 | — | 4,4,28,28 (circle) | Turn row: muted steel-blue (allies) and rose (enemies) rims, with a thin base strip narrower than the circle. |
| `init_end` | 40x40 | — | 4,4,32,32 (circle) | The dark, hatched circle that closes the round. |
| `minimap_ring` | 200x200 | — | 24,24,152,152 (circle) | Round minimap frame: pearl band lit from the upper left, a gold line on each edge, a running gold scroll between two gold lines; cardinal gems in pointed lozenge mounts (red at S), diagonal gems in pointed lozenge mounts standing a little outside the ring (red at SW). |
| `bar_frame` | 104x80 | 24 44 24 44, outset 6 | — | Action bar frame: his thin grey-silver rails, dotted inner line, dark panel, his sparse scalloped lace down both ends (a C-curl every 8 px), a wire arm from each corner gem along the rail (scroll at the bottom ones), gem studs (red top, green bottom). Keep (width - 48) a multiple of 8 and (height - 48) a multiple of 16. |
| `crest_strip` | 208x44 | 0 96 0 96 | 84,22,40,12 | Raised crest over the bar: the trough (HP left, chakra right) and his open wire shoulders. Stretch to 512 (x 550 in the mockup); its bottom row sits on the bar's top rail. Keep (width - 192) a multiple of 8. |
| `medallion_active` | 200x112 | — | 67,21,66,66 (circle); anchor 100,54 | Acting character medallion: gold rim, beaded ring, red gem on top, calm crown stepping down on each side: a small boss, his big dark dome boss with a pale twin highlight, a third small dark boss on the trough rail and a wire tail. His 13-px pale pearl at the bottom. Its anchor (ring centre) goes on (806, 728). |
| `hp_fill` | 32x12 | 0 6 0 6 | — | Red HP fill in the trough window (it runs under the medallion). |
| `chakra_line` | 16x6 | 0 4 0 4 | — | The thin line through the chakra half of the trough; the gems sit centred on it. |
| `chakra_red` / `_orange` / `_blue` / `_empty` | 18x22 | — | — | His rhombus chakra gems; `_empty` is a spent socket. |
| `pip_action` / `pip_bonus` / `pip_reaction` / `pip_spent` | 22x22 | — | — | Green / orange / magenta glossy orbs; dark when used. |
| `move_trough` | 48x12 | 0 6 0 16 | 12,2,32,8 | Movement bar trough: his small pointed left end, rounded right end; the fill starts just after the point. |
| `move_fill` | 32x8 | 0 4 0 4 | — | Teal movement fill. |
| `skill_slot` | 56x56 | 16 16 16 16 | 6,6,44,44 (open) | His warm gold slot: two-step bevel lit at the top left, rounded corners, small corner curls. The window is open: dark backing and icon (his, later) go under the frame. |
| `skill_slot_active` | 56x56 | 16 16 16 16 | 6,6,44,44 (open) | The same frame in bright gold, for the selected or hovered skill. |
| `skill_tag` | 22x24 | — | 4,4,14,14 | His dark hexagonal shield number tag with a dim bronze rim; 6 px under the dotted line, overlapping the slot top by 10. |
| `item_slot` | 52x52 | 10 10 10 10 | 6,6,40,40 | Greyed item slot (double faint outline, rounded corners). |
| `item_badge` | 18x18 | — | — | His dim blue count dot (digit `#93a6b8`), at the slot's bottom-right corner. |
| `end_turn_gem` | 14x14 | — | — | His small pink gem inside the panel, 10 px down and left of the top-right corner gem. |
| `lower_plaque` | 192x32 | 0 88 0 88 | 74,2,44,22 | Dark plaque under the bar with rounded ends and his triangular brackets of curved wire (tip curl, lit long edge ending in a curl, S-scroll holding the 10-px eye, X of two crossing C-curves; mid bronze between the scrolls, grass only under the X), for a hint line or the log. |
| `party_frame` | 60x80 | 16 16 28 16 | 6,6,48,50 | Party portrait frame: his olive-gold double line with slightly rounded corners and small gold corner curls; two bar wells below the portrait. |
| `party_hp_fill` | 32x8 | 0 4 0 4 | — | Party HP fill (red), at 6,58 in the frame, 48 wide. |
| `party_ch_fill` | 32x6 | 0 4 0 4 | — | Party second bar, his green (we read it as chakra), at 6,68, 48 wide. |
| `gem_red` / `gem_green` | 22x22 | — | — | Loose gem studs in gold bezels. |
| `glyph_placeholder` | 22x22 | — | — | Faint placeholder (alpha 70) for empty skill slots until he paints the icons. |
| `glyph_pills` / `_bandage` / `_antidote` / `_seal` / `_more` | 18x18 | — | — | Dim line icons for the item slots (Píldoras, Vendas, Antídoto, Sello expl., +). |
| `glyph_emblem` | 14x14 | — | — | His gold trefoil for `button_small`. |

48 pieces. The only partly transparent pixels are in the placeholder glyph.

## Palette

Sampled from his picture (`staging/ui_battle/ref/palette.json` has k-means clusters for every crop) and reduced to ramps, dark to light. Outlines are the darkest step of each material's own ramp, never pure black.

- Metal (antique gold: chains, minimap lace, bezels, frames): `#140c05 #2e2010 #4c3b23 #6e5d40 #918063 #b3a383 #d3c6a5 #efe7cf`
- Rail (his dim, cool grey-silver: bar rails, trough rails): `#15150f #33352e #53574e #71766c #8f978c #a1a49b #b9bcb1 #d2d4ca`
- Silver (number tags): `#17171a #34333a #57555a #7d7a7a #a29d97 #c4bdb3 #e2dbd0 #f3f0e9`
- Khaki (buttons): `#15120d #2d281f #4a4334 #695f4c #8a7d66 #a99475 #bfae92 #d6cab2`
- Olive gold (party frames): `#121109 #2a281b #47442f #66624a #857d66 #aea989 #c9c4a3 #e1dcc0`
- Gold (active slot, acting frames, medallion rim): `#1a1004 #3e2c0c #6b5420 #958035 #bca659 #dcc87e #f0e2a6 #fff6d6`
- Panel (bar interior, wells): `#0d0a06 #16120c #1e1a13 #28231b #332d23 #3f382c`
- Medallion brown: `#1d130c #2b1e15 #36271c #433123 #4f3b2b`
- HP red: `#2c0d0b #5a1d19 #87302a #ad453c #c9625a #e38c80`
- Movement teal: `#0f2224 #1d3d3e #2b5d60 #3d7f84 #55a1a6 #86cbcc`
- Party green: `#0f2412 #1e4a25 #2f6f37 #46944b #68b864 #9ad88e`
- Wire (crest shoulders, lower brackets, bar lace): highlight `#e0d3b7`, light `#bcaf9e`, light-mid `#9c8e74`, mid `#7a6d58`, outline `#2c2316`; his bead rim `#cfc4b2`, centre `#5e5c4d` / `#535740`; lower bracket fill (between its scrolls) `#5a4c35`
- Finials (target plaque): `#e8dfcf #cec2ad #a19480 #756856`, rose stone `#e7a3b1` / `#b14f68`
- Slot gold (skill slots): `#17110a #3a2c18 #5e4a2c #86703f #a88f5c #c8ad78 #e2cb98 #f4e6c2`
- Pearl (minimap band): `#3e3a33 #77736a #a9a59a #cfcbc0 #e6e2d8 #f6f3ec`
- Gems (outline, dark, mid, light, highlight, sparkle): red `#2a0709 #62121a #9e2430 #cf4652 #ef8a90 #fff0f0`, green `#062012 #0f4826 #1d7a40 #36a65d #86dca0 #f0fff4`, orange `#2e1504 #6e3a0a #b26a14 #e89a26 #ffd27a #fffbe8`, blue `#07163a #13337a #2457b8 #4b8cee #a6cdff #f4faff`, magenta `#260a2a #55195c #8f3196 #cf55d6 #f2a6f6 #fff2ff`, rose (end-turn gem) `#2a0a16 #5e1832 #a03a5e #d06a8c #f2acc2 #fff2f6`, pearl (medallion bottom stone) `#1c221d #465046 #77857a #a6b3a3 #d2dccd #f5f9f2`
- Turn row rims: allies `#111a21 #243442 #395064 #567087 #7c94a6 #aebfca`, enemies `#1f1214 #40252a #613a3f #86565a #a87b7b #cca9a4`
- Count badge: `#0a1219 #152638 #203c56 #2f5574 #4f7697 #8eaac2`
- Text: cream `#efe6cf`, dim `#cfc3a6`, white `#fbf8ee`, outline `#0b0805`

Light comes from the upper left, as in his picture and the game's sprites.

## Using the pieces in the HUD

Put the HUD in one layer over the canvas: `image-rendering: pixelated`, every element on even pixels.

9-slice frames (`bar_frame`, `skill_slot`, `item_slot`, `party_frame`, `button_small`) with CSS `border-image`. The slice and width are the manifest's `slice`, and the outset is the manifest's `outset`:

```css
.action-bar {
  /* 908 x 100 element = 920 x 112 image area with the 6-px outset: (920 - 48) % 8 == 0 and (112 - 48) % 16 == 0 */
  width: 908px; height: 100px; box-sizing: border-box;
  border-style: solid;
  border-width: 24px 44px;
  border-image: url(ui_battle/bar_frame.png) 24 44 fill / 24px 44px / 6px repeat; /* slice fill / width / outset repeat */
  image-rendering: pixelated;
}
.skill-slot { width: 56px; height: 56px; border: 16px solid; border-image: url(ui_battle/skill_slot.png) 16 fill / 16px repeat; }
```

**The seam rule.** CSS `repeat` centres the tiles in each run (one tile sits in the middle), so the run's length decides where the tiles meet the corners. A run seams unless (run - tile) / 2 is a multiple of the centre's repeat period (the manifest's `repeat`, screen px). The bar's centre tile is 16 x 32 px. Across, its dotted line repeats every 4 px; down the ends, the lace repeats every 8 px. With the 44-px side slices, the 24-px top and bottom slices and the image area (element + 2 x outset), that means:

- `bar_frame`: **(width - 48) % 8 == 0 and (height - 48) % 16 == 0**. 920 x 112 is fine.
- `crest_strip`: (width - 192) % 8 == 0 (512 is fine).
- The other sliced pieces have uniform centres (one repeating column or row), so any even size works.

The generator draws every sliced placement in `layout.json` the way CSS does and refuses to build if one would seam, so check a new size there before using it. Use `repeat`, never `stretch` or `round`, because `round` rescales the tiles and makes the dots uneven.

3-slice pieces (`target_bar`, `crest_strip`, `lower_plaque`, `chakra_line`, `move_trough`, and the `*_fill` strips) have zero top and bottom slices. Give the element the image's height and stretch only its width:

```css
.target-bar { width: 390px; height: 40px; min-width: 160px; border-style: solid; border-width: 0 80px; border-image: url(ui_battle/target_bar.png) 0 80 fill / 0 80px repeat; }
.target-fill { height: 12px; border-style: solid; border-width: 0 6px; border-image: url(ui_battle/target_fill.png) 0 6 fill / 0 6px repeat; width: calc(var(--hp) * 318px); } /* the channel is the plaque width - 72, starting 36 px in */
```

Windows: draw the portrait, the minimap canvas or the skill icon in a child positioned at the manifest's `window` (`border-radius: 50%` for circle windows), with the frame image above it (`pointer-events: none`). The frames that hold portraits or icons (`init_*`, `medallion_active`, `party_frame`, `minimap_ring`, `skill_slot*`) have transparent windows. Put a dark backing (panel `#1e1a13`, or `#16120c` for skill slots) under the portrait or icon, because the game's portraits have a transparent background and an empty skill slot shows the backing.

Fixed pieces (medallions, chains, gems, pips, glyphs) are plain `<img>` tags at their own size. Place `medallion_active` by its `anchor` (the ring centre, 100,54 in the image). `layout.json` lists where the mockup put each piece at 1600x900 (screen pixels, from his positions times 1.5625, snapped to even pixels). The main ones:

- menu 16,12 · round medallion 554,62 · chains 488,2 (left) / 968,-6 (right, its top runs off the screen) / 738,120 (sag) · turn row 640,82, then bells at x 686, 726, 764, 806, 844, 884 (y 82) · chain link 920,100 · end circle 932,84
- target plaque 612,30 390x40 (name centred above it at y 12; fill 648,44, 318 wide at full HP; HP numbers in the 1x font on the channel) · minimap 1404,4
- bar box 338,762 920x112 (with the outset; the element is 344,768 908x100) · crest 550,724 512x44 · HP fill 634,746 · chakra line 846,750 132x6 with gems at x 872 / 906 / 940 (y 742) · active medallion 706,674 (anchor on 806,728) · end-turn gem 1222,776
- pips centred on x 386 / 436 / 486 (y 794, captions centred under them) · "Mov." at 364 · movement trough 400,834 116 wide (fill 412,836, 100 wide) · "9,0/9 m" at 522
- skill slots x 560 + 62·i, y 796 (tags at y 782) · item slots x 932 + 62·i, y 798 · lower plaque 516,868 578x32 (hanging from the bar's bottom)
- small button 16,780 · party frames x 10 + 64·i, y 812

Text: the mockup uses the kit's own pixel fonts (`tools/ui/ui-font.ts`) only as stand-ins. **The target name is meant to be his smooth, light font** (a clean sans with a soft shadow, as in "Soberano Northstar - Nv 10"), not the heavy-outlined pixel font the mockup draws. It is HTML text in the game, so use a smooth webfont there; the same goes for the captions. Names and numbers use 2x pixels. The small captions (Acción, Adicional, Reacción, Mov., 9,0/9 m with his decimal comma, item names) and the plaque's HP numbers use 1x pixels, because his spacing is too tight for them at 2x. In the HUD these are HTML text: use a pixel webfont (or the kit font as a bitmap font) at the same sizes, cream with a dark 1-pixel outline. The HP and chakra numbers are not drawn on the crest (he shows only the bar and the gems); show them on hover until he decides.

## Rebuilding

```sh
# 1. his crops, study zooms and palette (for the compare sheet only; the pieces don't need them)
python3 -I tools/refs/ui-from-ref.py docs/reference/ui-battle-owner-reference.jpg <art2>/staging/ui_battle

# 2. (only to refresh the mockup's battle frame) serve the published build and capture it
python3 -m http.server 5430 --directory <scratchpad>/webbuild/pub8 &
PLAYWRIGHT=<pw>/node_modules/playwright/index.mjs node tools/ui/ui-battle-capture.mjs 5430 <art2>/staging/ui_battle/capture
kill %1

# 3. pieces + manifest (+ sheets, mockup and layout.json when the inputs are given)
UI_OUT=<art2>/staging/ui_battle UI_SHEETS=<art2> \
UI_CAPTURE=<art2>/staging/ui_battle/capture UI_SHOTS=<scratchpad>/pw/ui \
npx tsx tools/ui/ui-battle-kit.ts
```

- `tools/ui/ui-battle-pieces.ts` draws every piece (sizes, slices, windows). The wire ornaments are character maps: `CREST_SHOULDER`, `FINIAL_TOP` (the target plaque's finial; its bottom half is the mirror), `END_LACE`, `ARM_TOP` and `ARM_BOTTOM` (bar frame) are hand-placed; the lower bracket is built from curves by `strokeMap` (clean 1-px lines via `pixelPath`). The minimap scroll is one wave repeated round the ring. `ui-draw.ts` has the palette and the shading: banded metal, embossed metal, the wirework (`wire`: strokes plus a 1-pixel outline, open elsewhere), gems, orbs and chains. `ui-font.ts` has the pixel fonts. `ui-img.ts` has the image, the PNG reader and the atomic PNG writer. `ui-battle-mockup.ts` builds the mockup.
- The generator refuses to run without `UI_OUT`. It also refuses to build in two cases: if a sliced piece's centre does not repeat every 2, 4 or 8 px, or if a sliced placement in the layout would seam under CSS `repeat` (centred tiles). It writes every file under a temporary name and renames it. Nothing goes to `src/`.
- Determinism: two clean builds (extractor and kit) gave byte-identical results for all 178 files, and both matched the delivered files. That count covers 48 pieces, the manifest, the layout, the three sheets and the extractor's 41 crops x 3 plus `crops.json` and `palette.json`. The capture is not deterministic: the game rolls the turn order and the enemies' start each time. The capture script reloads until Akira acts first. The kit and mockup are built from the capture saved in `capture/`.
- Portraits are the game's own, cropped from the screenshots:
  - Akira's 56 px card portrait in `1-turno.png`, turned back into its 40x40 pixels and shown at 2x in the active medallion.
  - The 36 px party-list portraits, at 2x in the party frames.
  - The turn-row portraits from `capture/hud.png` (the same battle as the frame), at 1x.

  The minimap window shows the game's own minimap canvas at 2x, centred on the camera box.

## Known differences from his picture

1. **Added by his decisions**: the menu button at the top left (not in his picture, made in his small-square style). The grid on the ground is gone. The skill slots are empty, with a faint placeholder, until he paints the icons.
2. **Numbers are ours**:
   - The target is "Bandido - Nv 3" at 25/25. A rogue has 25 HP at normal difficulty, and it is round 1, so the bar is full. His showed 10/10 with a part-filled bar.
   - The skill tags read 1 to 6. His read 1, 2, 3, 3, 4, 5.
   - The turn row shows this battle's real order: Akira acting, then 6 units (3 allies, 3 enemies).
3. **Scrollwork is symmetric and simpler**:
   - His crest shoulders, lower brackets and finials differ slightly left and right; ours mirror the left one.
   - His painted lace has more sub-pixel detail than 2-px pixel art can hold. Our wire keeps his silhouettes and main curls; the lace at the bar ends is a 3-art-px scalloped wire with a curl every 8 px.
4. **Shapes**:
   - His bar's top-right corner has two gems. The small one is `end_turn_gem`, now inside the panel where he put it.
   - The target plaque cannot be narrower than 160 px (its two finials and arms).
   - Our bar is 4 px taller than his (768 to 868 against 767 to 864). This keeps the CSS seam rule and his spacing inside: tags 6 px under the dotted line, slots 6 px above the bottom one.
   - The movement trough's point is 2 art px tall (the trough is 6 rows), so it reads as a short chevron; his is finer.
   - The pip row is 4 px wider than his (x 386 to 486 against 388 to 482), to keep a gap between the captions.
5. **Portraits** are the game's sprite heads (pixel art), not his painted busts. They are larger pixels in the party frames and the medallion, and 1x in the turn row.
6. **Minimap content** is the game's minimap (river, camera box), not his painted close-up.
7. **Text** in the mockup is the kit's pixel font: small captions at 1x (his spacing is too tight for 2x letters) and the target name at 2x. His names are a smooth light font; in the game this is HTML text, so use his smooth style there.

Open questions for him:

- Is the small pink gem inside the bar's top right the end-turn control? His picture has no "Fin" button.
- Is the green bar on the party frames chakra? The current game shows chakra in blue.
- Should the HP and chakra numbers show on the crest (on hover, or always)?
- What should the small button above the party frames do?
