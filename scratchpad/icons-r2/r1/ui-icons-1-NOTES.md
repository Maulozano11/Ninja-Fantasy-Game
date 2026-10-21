# Skill icons, sheet 1: rebuilt from the owner's picture (round 1)

Source: `docs/reference/icons-owner-reference-1.jpg` (1024x765). Left to right he painted Fireball, Kirin, Great Fire Annihilation and Water Wall, each in his steel slot with gold corner brackets and rivets.

His rule: "todos los ejemplos que te mande necesito que los intentes copiar con la mayor exactitud posible."

## Deliverables

All paths are under `/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/`.

- `staging/ui_icons/`
  - Icons, named by jutsu id. Each comes at 44x44 (the slot window, shown at 1x on a 1600x900 screen) and at 88x88 (`@2x`):
    - `fireball_goukakyu.png`
    - `kirin_thunder.png`
    - `great_fire_annihilation.png`
    - `water_shield_suijinheki.png`
  - `skill_slot_steel.png` (56x56): his slot frame.
  - `skill_slot_steel_active.png` (56x56): the selected or hovered version of the frame.
  - `manifest.json`: for each icon, its files, sizes and palette. For each frame, its 9-slice insets (16 16 16 16), its window (6,6,44,44), its layer order, the colour to fill an empty slot, and how to use it on a 2x screen.
  - `ref/`: his crops, written by the crop script (see below).
- `ui-icons-1-compare.png` is the comparison sheet, drawn at 2x. It has two parts:
  - For each icon: his crop scaled to 88, ours at 88, ours at 44 shown at 2x, and ours at 1x.
  - His row of four slots, then our four icons in our frame in the same kind of row: at 4x, at 1x (true size) and at 2x. Last, the selected frame on the first slot.
- Tools (new files; nothing in `src/` or in `staging/ui_battle/` was touched):
  - `tools/refs/icons-from-ref.py` crops his four art windows (201x206 of his pixels, between his black inner lines), his four whole slots and his row. It also writes the crops at 88 and 44 (Lanczos) for the sheet, 4x study crops, `crops.json`, and `palette.json` (each icon's main colours, and his frame colours measured on all four slots).
  - `tools/ui/ui-icons.ts` is the generator. It refuses to run without `UI_OUT`. Every file is written to a temporary name and then renamed. I ran both tools twice and got byte-identical output each time.

  Commands:

      python3 -I tools/refs/icons-from-ref.py docs/reference/icons-owner-reference-1.jpg <staging>/ui_icons
      UI_OUT=<staging>/ui_icons UI_SHEETS=<art2> npx tsx tools/ui/ui-icons.ts

  `tools/refs/README.md` has no entry for these yet, because the brief asked for new files only.

## How the icons are made

Every icon starts from his own pixels; none is repainted from scratch.

1. His art window is trimmed by one pixel (the JPEG seam against his black line). The gold bracket tips that cover its corners are painted over from the pixels next to them. A 3x3 median then removes the JPEG noise without moving his edges.
2. His specks are found on his picture and painted out of the base: sparks around the fireball, glowing embers and dark flakes in the fire wave's smoke, foam flecks around the wave, and the peach sparks among the Kirin's bolts. Each one is put back at the end as one clean pixel or a short 1-pixel dash, in his colour. These marks are deliberate, so the clean-up never removes them.
3. Each icon gets one palette sampled from his picture, 14 to 16 colours. Every entry is a colour that occurs in his picture.
   - The palette comes from k-means in OKLab, with every lightness weighted equally, so his bright ramps get as many steps as his dark backgrounds.
   - For the water, hue counts for more and the colours are snapped slightly richer, to keep his turquoise.
   - For the fire wave, hue counts for more, to keep his grey-mauve smoke apart from the red shadows of the fire.
4. The 88 version is sharpened slightly with an unsharp mask kept inside his local range, so there are no halos. It is then reduced with Lanczos and put on the palette. Any lone pixel that does not stand out is merged into its surroundings.
5. The 44 version is made from his area mean at 88, halved. Each 2x2 block keeps its pixel nearest the block's mean. When a stroke in the block stands out from its surroundings (a bright stroke, a tooth, a bolt or a dark gap), the block keeps that stroke's pixel instead, so thin strokes survive. Areas of up to two pixels that do not stand out are then merged.
6. Details traced on his picture are drawn last (see Kirin and the fire wave below).

### Clean-up check on the final files

A lone pixel here means no same-coloured pixel among its 8 neighbours. Low-contrast lone pixels are the stray ones.

| Icon | Colours | Lone pixels at 44 | Lone pixels at 88 | Low-contrast lone (44 / 88) |
|---|---|---|---|---|
| Fireball | 14 | 23 | 26 | 0 / 1 |
| Kirin | 15 used of 16 | 79 | 161 | 2 / 2 |
| Great Fire Annihilation | 16 | 26 | 23 | 0 / 3 |
| Water Wall | 15 | 68 | 122 | 0 / 2 |

The other lone pixels are his sparks, embers, foam flecks and bolt fragments.

## Per icon

### Fireball (`fireball_goukakyu`)

What we kept:
- His white-hot core, with the ramp running out through pale yellow, yellow, orange and red to near-black.
- His spiral arms with their dark gaps.
- His sparks, scattered around the edge.

Known differences:
- At 44, the core is a slightly larger flat white-cream blob than in his picture, and the arms only separate cleanly in the outer ring. His Lanczos reduction to 44 behaves the same way.
- Our sparks are single pixels. His are small soft streaks.

### Kirin (`kirin_thunder`)

At 44 the plain reduction does not read: his picture is full of fine strokes of nearly one value. So these details were traced on his picture (in his crop coordinates) and drawn over it:
- a 1-pixel navy outline along the snout, the horn on the nose and the upper jaw tip;
- the dark upper gum line, with white teeth and dark gaps between them;
- the lower jaw line, with its teeth;
- his dark eye slit under a lit brow.

At 88 his own pixels already show the head. Only the gum line and the eye slit are restated there, and his teeth are drawn as small white wedges: 8 upper and 5 lower, at his positions.

Known differences:
- At 44, the mane and the background bolts are busier and more broken than his long, smooth spikes. The head, the open jaws, the teeth and the bright mouth read at 1x; the separate mane spikes do not.
- His orange-peach sparks are single pale peach pixels.
- Our 88 is a touch darker and less glowing in the mouth than his.

### Great Fire Annihilation (`great_fire_annihilation`)

What we kept:
- His big curl of fire, and the dark hollow inside it.
- His grey-mauve smoke, with glowing embers and dark flakes.
- The small swirl low on the left.

At 44, the swirl's lit spiral line did not survive the reduction, so his line is traced and drawn back into the dark disk.

Known differences:
- At 44 the swirl is a rough "@", and the long flame tongues at the bottom merge into one band.

### Water Wall (`water_shield_suijinheki`)

What we kept:
- His cresting wave: its foam lip and the curl with its dark hollow.
- The teal-to-turquoise bands.
- The foam spray, as flecks.

Known differences:
- His turquoise glow inside the curl is a little less vivid in ours.
- At 44, the bands inside the curl are blockier than his smooth stripes.
- The foam spray at 44 is a scatter of single pale pixels.

## His slot frame (`skill_slot_steel`, `skill_slot_steel_active`)

- Size and window: 56x56 with a 44x44 window at 6,6, as the kit's `skill_slot`. 9-slice insets are 16 on every side; the generator checks that the centre repeats.
- From the outside in, with his colours measured on all four slots and each side keeping his own shade:
  - a black line;
  - his dark steel bar, with a lit outer edge (lightest on top);
  - a dark gap;
  - his thin gold line (lightest on top and bottom, darker on the right);
  - a black line.
- Over each corner sits his gold bracket:
  - a block that holds a 4x4 steel rivet;
  - two arms along the bar, ending in a 45-degree cut;
  - a small barb under each arm;
  - all lit from the top left.
- The window is transparent. Draw the frame over the icon and the brackets overlap the icon's corners, as in his picture. Drawn under the icon, it also works.
- `skill_slot_steel_active` is our addition; his picture has no selected state. It is the same frame in gold (as the kit pairs `skill_slot` and `skill_slot_active`), with the rivets glinting.

Known differences:
- His border is about 3.7 px at this size. Ours is 6 px, because the kit's 44x44 window in a 56x56 slot sets it. So our steel bar and brackets are proportionally heavier than his, and his art fills more of his slot.
- His brackets have a finer notch-and-barb outline than 1-pixel art can hold. Ours keeps the block, rivet, arms, 45-degree ends and one barb per arm.
- His slots are slightly taller than wide (234x240 of his pixels). Ours are square, and his art windows (201x206) were fitted to square.
- The icons and this frame use one art pixel per screen pixel. The rest of the `ui_battle` kit uses 2x2. That was chosen so the 44-px icons keep their detail, and so the frame matches them; the kit's own `skill_slot` stays the chunkier option.

## For his review

1. At 44 the Kirin can only be simplified. Should the mane spikes and bolts be thinned further, so the head stands out more, or kept as busy as his picture?
2. Is the selected or hovered frame in gold right, or should selection be a glow around the steel frame instead?
3. Should we keep the 6-px border, which the kit's 44 window sets, or make the window larger (for example 48 in a 56 slot) so the frame is as thin as his?
