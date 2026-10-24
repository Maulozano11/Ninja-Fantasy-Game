# Converters from the owner's reference sheets

The owner wants his reference images copied as exactly as possible (see
`docs/reference/README.md`). These scripts turn his sheets into frame data that the sprite
generators in `tools/world-sprites/` decode, so a normal build needs no image files. Run them by
hand when a reference changes. Use `python3 -I`, and keep the references outside the repo's code
folders.

- `female-base-body-from-ref.py` (with `female_base_ref.py`): **the female body**, his bare female
  body (`docs/reference/female-base-owner-reference.jpg`, 100x100 of his pixels at 20 picture pixels,
  phase 0; his pixel (x, y) at our (x + 73, y + 120)) cut into pieces, one per bone: chest (the neck's
  foot, shoulders, sports top), the neck above its foot (on the bone to the head), pelvis (belly, briefs), each upper arm, forearm, hand, thigh, shin and foot,
  every pixel his (the regions are written row by row in the script). It reads his joints off the
  picture (`JOINTS`; the female rig is fitted to them, `rig.ts` `BodyFit`), continues what he hides
  from his own pixels (the neck under the head, the chest's near side under the arm, the belly under
  the top, the thigh tops under the briefs, the far upper arm behind the chest), gives each lower piece
  a round cap of the upper piece over the joint, and checks that the pieces put together at rest are
  his picture pixel for pixel. It writes `src/sprite/femaleBaseArt.ts`; `--check <dir>` also writes
  his picture beside the pieces put together and a map of the pieces.

      python3 -I tools/refs/female-base-body-from-ref.py

- `female-base-hair-from-ref.py`: the same woman's hair, his pixels, for the hair option 'Messy
  Ponytail' (`items/hair.ts`): every non-skin pixel of his over the head, the lock before the near
  cheek and the fringe over the far eye (not his near eye, his face's line or his ear), on our face
  anchor where it sits at idle (his pixel (50, 19)), and his head above the eyes for trimming our
  skull to it. It writes `src/sprite/items/baseHairArt.ts`.

      python3 -I tools/refs/female-base-hair-from-ref.py

- `female-body-from-ref.py`: his heroines' small hands, from his heroines drawn at our scale
  (`docs/reference/{lyra,aurelia,saya}-game-scale-owner-reference.jpg`; the female body itself is
  `female-base-body-from-ref.py` now, the hands here hold a weapon, point, open and cradle on it, and
  the skin ramp here colours the female faces): his skin ramp, his hands
  (Aurelia's near hand relaxed, Lyra's far hand, Lyra's near hand on her sword's grip, Saya's far
  fist, each cut 1:1; the open, pointing and cradling hands, which he has not drawn at this size,
  are his crystal-sword hands with their most repeated rows and columns left out) and Aurelia's
  bare near shoulder. It writes `src/sprite/femaleBodyArt.ts`; `--show` prints every piece as text.
  The female feet are not lifted here (he drew none bare): `src/sprite/ctx.ts` `shortFoot` makes
  every foot template shorter for the female bodies' lower ankles.

      python3 -I tools/refs/female-body-from-ref.py

- `saya-game-scale-clean.py`: Saya at our game scale without her bugged swords and scabbard (the
  owner: "quita lo que esta bugeado"): outside her and between her legs the weapon pixels go, over
  her legs and hip her armour is continued with her own colours. A 100x100 PNG for comparisons and
  for the Saya part jobs; her sword comes back from her big picture there.

      python3 -I tools/refs/saya-game-scale-clean.py OUT.png [ZOOM.png]

- `beasts-from-ref.py`: the phoenix and the raijū for `vfx_beasts`. It writes
  `tools/world-sprites/vfx-beasts-ref-fire.ts` and `vfx-beasts-ref-lightning.ts`.

      python3 -I tools/refs/beasts-from-ref.py phoenix docs/reference/phoenix-owner-reference.jpg docs/reference/raiju-owner-reference.jpg tools/world-sprites/vfx-beasts-ref-fire.ts
      python3 -I tools/refs/beasts-from-ref.py raiju docs/reference/raiju-owner-reference.jpg docs/reference/raiju-owner-reference.jpg tools/world-sprites/vfx-beasts-ref-lightning.ts

  Its `crane` mode copies the wind crane from his wind sheet (BEAST (WIND CRANE, NEWER), two frames
  that become frames 0 and 3; the in-betweens swing his raised wings back) into
  `tools/world-sprites/vfx-beasts-ref-wind.ts`:

      python3 -I tools/refs/beasts-from-ref.py crane <wind-sheet.jpg> <wind-sheet.jpg> tools/world-sprites/vfx-beasts-ref-wind.ts

  Its `drake` mode copies the stone drake (the earth beast; it replaced the old serpent) from his
  earth sheet's BEAST panel into `tools/world-sprites/vfx-beasts-ref-earth.ts`. His left picture
  (prowl) is fly frame 0 and his right one (lunge, dust kicking up) is frame 5. Both stand on his one
  ground line (y 1948 in his sheet) with the eye at one x, so the lunge is a leap and the dust pile
  sits on the ground; the anchor is the middle of the prowl's torso. The scale comes from his
  character on the WALL panel (228 px tall against our 96). The drake keeps his dark under-body
  shadow (warmer than his panel), and his dust is kept opaque in his own colours (only streaks and
  specks thinner than a game pixel get a partial alpha). Where his picture's box cut the pile (a straight
  left side and a flat bottom along the ground) it ends instead in rounded puffs of his own pile: a column
  of them up the side (`SIDE_PUFFS`; his top and bottom boulders out on the line, the others further in)
  and a row along the bottom (`FOOT_PUFFS`; two are his cream boulders that sat on the cut), smaller and
  further off the ground toward both ends. Each puff thins out over its last few px into his partly clear
  dust colours, and the burst grows into that shape as his pile is scaled up. His loose specks and the clod on the back spike keep only
  their own bright pixels (not the dark JPEG ring around them). The in-betweens turn his own legs and
  tail about their joints (the turn eases in from the cut, so each piece stays joined; under them the
  whole body is bent by one smooth field, so whatever a turned piece uncovers along its sides shows his
  own pixels, stretched a little, never a gap or a flat patch). In his prowl the big round near-thigh
  plate stays whole on the body and the shin and far hind leg turn behind it; in his lunge the tail and
  near hind leg part along the dark gap he left between them, and the near hind foot bends at the
  ankle. Each tail also bends along its own centre line (`TAIL_AXIS`) toward his other drawing's tail
  (`curl`: every tail pixel keeps its place along the line and its distance from it, laid down on the
  bent line, so it bends without stretching): his prowl's curl opens into a spear before the leap and
  the lunge's spear curls back up into his hook as the drake lands, so the tail never swaps shape in one
  frame. His far eye is stamped whole from his own game-scale pixels (his lemon, his shaded
  olive-yellow, his olive rim), and his near eye keeps his dark burnt-orange socket rim. The body pitches, is scaled about the
  eye and is carried along the leap. His prowl head is drawn about 20% larger than his lunge head: the
  in-betweens grow or shrink the head toward his other drawing's (a similarity fitted on his eye, snout
  tip and horn tip), so at the two switches between his drawings (2->3 and 7->0) both sides show the
  same head, and the eye rises steadily from the prowl to the top of the leap. The body angles, scales
  and leg turns around the switches were chosen so that no step changes more than about 30% of the
  silhouette. His dust grows off the ground behind the hind feet around the lunge, then breaks up as it
  settles: the darkest soil goes first, the pile wears down from the top, and his cream boulders spread
  apart and fade one by one, the small ones first. His flung dirt keeps his orange strokes (no dark JPEG
  rim; thin streaks stay unbroken lines) and his pale pebble specks (in their own greys), and the clod
  rides the back spike in frames 3-5 and is kicked off in frame 6. A pinhole or slit left between pieces
  takes its darkest neighbour. The drake has more colours than the shared alphabet holds, so its data
  module carries a longer alphabet of its own (Latin-1 letters after the shared symbols). The pieces, joints, loose dirt and placement points are the tables at the top of `drake()`;
  the frame table (pitch, bob, leg angles, dust) is at its end. With a fifth argument, a folder (it
  must exist), it writes the cut-out pieces, the segmentation, his pictures beside ours and onion
  skins.

      python3 -I tools/refs/beasts-from-ref.py drake docs/reference/earth-set-owner-reference.jpg docs/reference/earth-set-owner-reference.jpg tools/world-sprites/vfx-beasts-ref-earth.ts [debugDir]

- `fire-from-ref.py`: the fire set (`vfx_fire`, all but the phoenix) and the S-rank Great Fire
  Annihilation (`annihilation_enh`) from his fire sheet and his S-rank picture. It writes
  `tools/world-sprites/vfx-a-fire-refdata.ts`, which `vfx-a-fire-v3.ts` (the fire set) and
  `vfx-a-fire-s.ts` (the annihilation) animate. With a fourth argument it also writes a preview
  of every piece.

      python3 -I tools/refs/fire-from-ref.py docs/reference/s-tier-jutsu-standard.jpg docs/reference/fire-set-owner-reference.jpg tools/world-sprites/vfx-a-fire-refdata.ts [preview.png]

  (`vfx-fire-extract.py`, when present, is an older copy of it.)

- `fire-hit-from-ref.py`: the fire hit (`vfx_fire/hit`) from his repaint of our 12-frame sheet of the
  practice rogue hit by fire (`docs/reference/fire-hit-owner-reference.jpg`, 2026-10-24). His picture is our
  4x sheet scaled by 2000/3072 (about 2.6 picture pixels a game pixel); each game pixel is read at its
  block's centre, told from the rogue under it (our rogue from `tools/refs/data/fire-hit-base.png`, our
  sheet scaled down as he scaled it, and his own retouched rogue where he left it), snapped to his palette
  (40 of his colours, the means of his effect's pixels where nothing is under it), his smoke see-through
  where it shows the rogue through. It checks the lift by putting it back over our rogue, and writes
  `tools/world-sprites/vfx-fire-hit-refdata.ts`, which `vfx-a-fire-v3.ts` `hit()` turns into the sheet; the
  frame is the box round his effect, the anchor where the old hit's was on the target. `--check DIR` writes
  his picture, ours over the rogue and the effect alone at 4x. `fire-hit-base.ts` wrote the base strip (the
  cells he painted over, without the old hit); keep that strip as it is, since it is the rogue he painted over
  (rerun the script to a scratch file only to check the rogue has not changed).

      python3 -I tools/refs/fire-hit-from-ref.py [--check DIR]
      npx tsx tools/refs/fire-hit-base.ts /tmp/base.png   # the check: the same bytes as tools/refs/data/fire-hit-base.png

- `water-from-ref.py`: the whole water set (`vfx_water_v3`) from his water sheet. It writes
  `tools/world-sprites/vfx-water-v3-refdata.ts`, which `vfx-water-v3.ts` animates. The third
  argument is our character at 1x (kit `characterRef()` saved as a PNG; it splits the aura into
  the layers behind and over the figure). With a fourth, a review folder, it also writes his crops
  at game scale and before/after previews.

      python3 -I tools/refs/water-from-ref.py docs/reference/water-set-owner-reference.jpg tools/world-sprites/vfx-water-v3-refdata.ts <character.png> [reviewDir]

- `tide-s-from-ref.py`: the S-rank Devouring Tide from his paint-over of our widest wave
  (`docs/reference/tide-s-owner-reference.jpg`; a proposal). His picture is one 320x240 pixel-art
  canvas at 3.2x; each of his pixels is 2x2 game px (his trailing lanes match ours at 2.04 x 1.95,
  IoU 0.967). It lifts his new layers: the curl wave (what the dragon and the kanji's strokes hide of
  it continued by turning his own curl about the spiral's eye), the dragon's head, horns, whiskers and
  jaw (separate, to animate), the kanji 水 and its glow, and his loose spray; one palette of 64 of
  his colours. It writes `tools/world-sprites/vfx-tide-s-refdata.ts` (with probes of his pixels for
  `src/battle/tideS.test.ts`), which `vfx-tide-s.ts` animates (`vfx_tide_s`: curl, dragon, kanji).
  With a third argument, a folder, it also writes his canvas, every layer and the masks over his
  picture.

      python3 -I tools/refs/tide-s-from-ref.py docs/reference/tide-s-owner-reference.jpg tools/world-sprites/vfx-tide-s-refdata.ts [reviewDir]
      WORLD_OUT=<staging dir> npx tsx tools/world-sprites/vfx-tide-s.ts

- `wind-from-ref.py`: the whole wind set (`vfx_wind_v3`) from his wind sheet. It writes
  `tools/world-sprites/vfx-wind-v3-refdata.ts` (his key frames cut into the pieces that
  `vfx-wind-v3.ts` animates, one palette per sprite from his pixels). With a third argument, a
  folder, it also writes before/after previews.

      python3 -I tools/refs/wind-from-ref.py <REF-wind-set-owner.jpg> tools/world-sprites/vfx-wind-v3-refdata.ts [previewDir]

  `wind-v3-review.py <art2>` then makes the review sheets from the built group (his layout, his
  panels beside ours, every animation, the blast and walls GIFs).

- `earth-from-ref.py`: the whole earth set (`vfx_earth_v3`, all but the beast) from his earth
  sheet. It writes `tools/world-sprites/vfx-earth-v3-refdata.ts` (his key frames, one palette per
  sprite from his pixels, cut into the pieces that `vfx-earth-v3.ts` animates). The third argument
  is our character at 1x (kit `characterRef()` saved as a PNG). With a fourth, a review folder, it
  also writes his crops at game scale (`his-<name>.png`, `his-anchors.json`) and before/after
  previews. With `EARTH_DEBUG=<dir>` it only writes his class maps (rock, rim, dust, shadow) with
  the hand-drawn masks over them.

      python3 -I tools/refs/earth-from-ref.py docs/reference/earth-set-owner-reference.jpg tools/world-sprites/vfx-earth-v3-refdata.ts <character.png> [reviewDir]

  `earth-v3-review.py <art2> <reviewDir> <character.png>` then makes the review sheets from the
  built group (his panels beside ours, every animation, the blast and walls GIFs).

- `chakra-from-ref.py`: the chakra set (`vfx_chakra_v3`, all but the beast and the end-on wall, which stays ours) from his chakra sheet. It writes `tools/world-sprites/vfx-chakra-v3-refdata.ts` (his key frames at 1:1, one palette from his pixels, cut into the pieces `vfx-chakra-v3.ts` animates); the optional third argument is a review folder (his crops, before/after previews, `his-map.json`). `chakra-v3-review.py <art2> <reviewDir> <character.png>` (our character at 1x: kit `characterRef()` saved as a PNG) then makes the compare sheet, the animation strips and the blast, walls and aura GIFs.

      python3 -I tools/refs/chakra-from-ref.py docs/reference/chakra-set-owner-reference.jpg tools/world-sprites/vfx-chakra-v3-refdata.ts [reviewDir]

- `poison-from-ref.py`: the poison set (`vfx_poison_v3`, all but the beast and the end-on wall, which stays ours) from his poison sheet. It writes `tools/world-sprites/vfx-poison-v3-refdata.ts` (his key frames at game scale, one palette from his pixels, cut into the pieces `vfx-poison-v3.ts` animates; the blast's green light is read straight from his green excess with full alpha and stored apart); the third argument is our character at 1x (kit `characterRef()` saved as a PNG), the optional fourth a review folder (his crops at game scale, before/after previews, `refmap.json`). `poison-v3-review.py <art2> <reviewDir> <character.png>` then makes the compare sheet, the animation strips, the blast, walls and aura GIFs and the border, see-through-stone, flash and light checks.

      python3 -I tools/refs/poison-from-ref.py docs/reference/poison-set-owner-reference.jpg tools/world-sprites/vfx-poison-v3-refdata.ts <character.png> [reviewDir]

- `wood-dragon-from-ref.py`: his wood dragon out of his Wood Dragon hotbar icon (sheet 10), for the Wood Dragon's battle effect (a proposal, waiting for his yes). It takes his pixels with the same grid functions as `icons-from-ref-23.py`, keeps his dragon and his leaves without his green ground (his loose leaves apart), groups his colours into 40 of his (the JPEG gives each pixel a slightly different one) and adds his dark line where the cut edge meets the air. It writes `tools/world-sprites/vfx-wood-refdata.ts`, which `tools/world-sprites/vfx-new-r1.ts` animates (`vfx_wood`, with `vfx_hand` for the Chidori's lightning in the hand); a third argument writes a check sheet (his window, our cut, his leaves at 6x).

      python3 -I tools/refs/wood-dragon-from-ref.py docs/reference/icons-owner-reference-10.jpg tools/world-sprites/vfx-wood-refdata.ts [check.png]

- `chidori-hand-from-ref.py`: his lightning in the hand out of his two silver-haired paint-overs
  (the tactical vest's ring and thin bolts, the coat's burst of sparks), for the activated Chidori (a
  proposal, waiting for his yes). It finds each picture's grid from his black outline (the vest's
  pixel is about 17.9 x 18.0 picture px, the coat's 20), takes each of his pixels as its cell's
  median, and keeps only the lightning in a box round the near forearm and fist (not the white
  around him, nor his white seen between the arm and the vest, his skin, green cloth or anything
  darker than luma 115). It writes `tools/world-sprites/vfx-chidori-refdata.ts`, which
  `tools/world-sprites/vfx-chidori.ts` (WORLD_OUT only) turns into `vfx_charged/chidori_hand` (his
  two drawings flickering, one of his pixels each, anchored on his fist) with the new
  `vfx_charged/ground_crack`; a fourth argument writes a check sheet (his box, the kept lightning, at 8x).

      python3 -I tools/refs/chidori-hand-from-ref.py docs/reference/tactico-chaleco-owner-reference.jpg docs/reference/tactico-abrigo-owner-reference.jpg tools/world-sprites/vfx-chidori-refdata.ts [check.png]
      WORLD_OUT=<staging dir> npx tsx tools/world-sprites/vfx-chidori.ts
      WORLD_OUT=<staging dir> npx tsx tools/world-sprites/vfx-new-r1.ts
- `roman_ref.py` + `roman-cuirass-from-ref.py`, `roman-skirt-from-ref.py`, `roman-bracers-sandals-from-ref.py`: the
  owner's Roman paint-over (`docs/reference/roman-owner-reference.jpg`, pitch 10.24, our male idle frame 0 at
  offset (74, 120)), copied like Aiden: each script writes painted pieces (`src/sprite/painted.ts`) that ride the
  rig. `roman_ref.pieces()` cuts his figure into pieces by region polygons (`REGIONS`) and colour kinds, keeps only
  the black line next to each piece's own colours, continues the chest under the near shoulder guard and fills the
  red drape behind each of his legs by cloning the visible inside of the drape next to it (one shift per leg, so
  his folds run on), closed by his black line on a hem drawn across the leg. He tucked the far arm in, so the far
  bracer is moved `FAR_ARM_IN` (3) px out onto our forearm; the sandals are moved onto our legs. His JPEG has many
  near colours, so the modules use a longer palette alphabet (Latin-1, Greek, Cyrillic letters). Each module also
  exports what every colour of his is (`*_KIND`: line, skin, red, stud, bronze, leather), which the items use to
  follow the colour slots, and where each piece lands in our idle (`*_REST`), which `src/sprite/roman.test.ts`
  checks. With a second argument, a folder, each writes his figure beside the pieces at 8x.

      python3 -I tools/refs/roman-cuirass-from-ref.py src/sprite/items/bronzeCuirassArt.ts [studyDir]
      python3 -I tools/refs/roman-skirt-from-ref.py src/sprite/items/pterugesArt.ts [studyDir]
      python3 -I tools/refs/roman-bracers-sandals-from-ref.py src/sprite/items/bracersSandalsArt.ts [studyDir]
- `ren_ref.py` + `ren-face-from-ref.py`, `ren-eyes-from-ref.py`, `ren-hair-from-ref.py`, `ren-jacket-from-ref.py`,
  `ren-belt-skirt-from-ref.py`, `ren-trousers-from-ref.py`, `ren-boots-gloves-from-ref.py`, `ren-katana-from-ref.py`: the
  owner's Ren paint-over (`docs/reference/ren-owner-reference.jpg`, "el nuevo estandar"; pitch 20, our male idle frame 0 at
  offset (75, 120), the same as his Aiden), copied like Aiden, one script per part, each part its own creator option.
  `ren_ref.pieces()` sorts his colours into kinds (`kind()`: his navy line under luma 8, skin, gold, blue, silver, dark
  cloth and hair, white), cuts his figure into pieces by region polygons (`REGIONS`, claimed in order: the gloves and the
  sword in front), gives his line to the pieces it bounds, and continues each piece where something in front of it hides
  it (`continue_along`): the skirt's panels and studs down their columns under the fist, guard and blade; the chest under
  the near sleeve and the belt; the grip in the fist along the sword; the forearms under the gloves; the trousers up each
  leg under the skirt; only cells that something hides are filled, so where he shows white it stays white. The skin
  (and his warm line) round the top of each glove, above the wrist, is the forearm's, so a fist turned at the wrist
  leaves it on the arm. In the game every arm piece turns whole about our joints (`nightArmStamps` in
  `src/sprite/items/night.ts`: his sleeve and the end of his upper arm with the upper arm, his forearm with the forearm,
  his elbow swept through a bend; `nightFistStamps` in `items/clothes.ts`: his cuff with the forearm, his fist on the
  wrist), and his skirt lies on the thighs to the knees in panels cut down his seams and hangs from there
  (`nightSkirtStamps`). His legs stand
  wider than our rig's (`LEG_SHIFT`: near foot 5 px back, far foot 5 px lower): the leg pieces hang from our joints, and
  worn together his trousers and boots move the whole leg back by it (`NIGHT_LEG_SHIFT`, `src/sprite/items/night.ts`), so
  at rest every pixel of his figure is his, in his place (`src/sprite/ren.test.ts` pins it). The face (`MAP`: his skin
  and line as he painted them, his skull continued under his hair in our male skull's outline, his eyes taken out) and
  the eyes (his lashes, whites and blues over our template's eye cells, with lowered and closed lids made of his pixels)
  are the `night` face and eye shapes (`src/sprite/nightHeadArt.ts`, `nightEyeArt.ts`); the katana is the Katana v2
  (`src/sprite/items/katanaV2Art.ts`: its blade, gold, wrap and steel characters; his blade is painted in Ren's chakra
  blue, so a nichirin blade moves from there). Each module also exports what each of his colours is (`*_KIND`) and where
  each piece lands at rest (`*_REST`). With a last argument, a folder, each script writes his figure beside its pieces
  at 8x. The same picture always gives the same bytes (checked by rerunning).

      python3 -I tools/refs/ren-face-from-ref.py src/sprite/nightHeadArt.ts [studyDir]
      python3 -I tools/refs/ren-eyes-from-ref.py src/sprite/nightEyeArt.ts [studyDir]
      python3 -I tools/refs/ren-hair-from-ref.py src/sprite/items/nightHairArt.ts [studyDir]
      python3 -I tools/refs/ren-jacket-from-ref.py src/sprite/items/nightJacketArt.ts [studyDir]
      python3 -I tools/refs/ren-belt-skirt-from-ref.py src/sprite/items/nightBeltArt.ts src/sprite/items/nightSkirtArt.ts [studyDir]
      python3 -I tools/refs/ren-trousers-from-ref.py src/sprite/items/nightTrousersArt.ts [studyDir]
      python3 -I tools/refs/ren-boots-gloves-from-ref.py src/sprite/items/nightBootsGlovesArt.ts [studyDir]
      python3 -I tools/refs/ren-katana-from-ref.py src/sprite/items/katanaV2Art.ts [studyDir]

- `noble_ref.py` + `noble-*-from-ref.py`: the owner's noble swordsman (`docs/reference/noble-swordsman-owner-reference.jpg`,
  2026-10-24, a new male character in his own pixel art at twice our scale: 200x200 of his pixels at 10 picture
  pixels each). His choice for the sets drawn bigger than our sprite, "Reducir y limpiar yo": `noble_ref.py`
  shrinks the body evenly by 2 (`BODY_SCALE`: his wrists, shoulders and soles fall on our male idle frame 0's) and
  the head by 1.7 (`HEAD_SCALE`: our Roman head's size), raised 3 px as his Roman head is (`HEAD_UP`), then cleans
  it with his palette only (`game()`): every fine pixel is one of his pixels of its block (his commonest colour,
  his accents first where they fill half the block), his 1 px line round the figure, his gold piping thinned to
  continuous 1 px lines (`piping`), his thin details joined again where the shrinking broke them (`bridge`:
  his eyes, the cravat, the blade's light core, the cuffs, his inner line), his big areas without specks
  (`despeckle`), and a few motifs read cell by cell (`MOTIFS`, `MOTIF_MAPS`: the jewel, the studs and chains,
  the buckle). `game(False)` is the even reduction before the cleaning. His figure is cut into parts on his
  own picture (`BODY_PARTS`, `head_labels`), carried down through the reduction, and `pieces()` continues
  what each part hides from his own pixels (the coat under the front and the mantles, the sleeves to the
  shoulder and the wrist, the trousers under the tails, the cape behind the body). Each script writes one
  part's module; at rest the preset is the cleaned reduction pixel for pixel (`src/sprite/noble.test.ts`,
  against `src/sprite/nobleRefPixels.ts`). `python3 -I tools/refs/noble_ref.py <dir>` writes his picture, the
  even reduction and the cleaned one; `--labels out.png` and `--parts out.png` show the parts.

      python3 -I tools/refs/noble-head-from-ref.py src/sprite/nobleHeadArt.ts [studyDir]
      python3 -I tools/refs/noble-eyes-from-ref.py src/sprite/nobleEyeArt.ts
      python3 -I tools/refs/noble-hair-from-ref.py src/sprite/items/nobleHairArt.ts [studyDir]
      python3 -I tools/refs/noble-coat-from-ref.py src/sprite/items/nobleCoatArt.ts [studyDir]
      python3 -I tools/refs/noble-front-from-ref.py src/sprite/items/nobleFrontArt.ts [studyDir]
      python3 -I tools/refs/noble-belt-from-ref.py src/sprite/items/nobleBeltArt.ts [studyDir]
      python3 -I tools/refs/noble-trousers-from-ref.py src/sprite/items/nobleTrousersArt.ts [studyDir]
      python3 -I tools/refs/noble-boots-from-ref.py src/sprite/items/nobleBootsArt.ts [studyDir]
      python3 -I tools/refs/noble-hands-from-ref.py src/sprite/items/nobleHandsArt.ts [studyDir]
      python3 -I tools/refs/noble-cape-from-ref.py src/sprite/items/royalCapeArt.ts [studyDir]
      python3 -I tools/refs/noble-sabre-from-ref.py src/sprite/items/jewelSabreArt.ts [studyDir]
      python3 -I tools/refs/noble-test-pixels-from-ref.py src/sprite/nobleRefPixels.ts

- `solen_ref.py` + `solen-*-from-ref.py`: the owner's Solen (`docs/reference/solen-owner-reference.jpg`, the new
  standard, 2026-10-21; pitch 20, our male idle frame 0 at offset (74, 120), the Roman picture's window). It is a
  repaint of his Roman picture. `solen_ref.pieces()` cuts his figure by region polygons (`REGIONS`) and colour kinds
  (`kind`: line, skin, red, gold, leather, steel, stud, white, grey, navy, ice; regions tell his hair's navy from his
  trousers' and his cowl's grey from his cape's), keeps the black line that bounds each piece (a piece behind the
  others, the cape, only the line that bounds it alone), and continues what he hid with his own pixels: the cape
  behind his arm, sword, legs and body (`fill_cape`: folds followed up and down, the hem drawn straight across
  behind each leg, the back edge behind the bracer and the hilt), the skirt, trousers and far sandal behind the
  sword and the hand (`clone_fill`: cloned from his visible pixels one shift away, his studs never cloned). Inside
  his figure every white is his (no paper gaps). He drew the far arm thinner and nearer the body than ours
  (`FAR_OUT`) and the legs wider (`LEG_OUT`, measured on his sandals): those pieces stay where he drew them and
  turn about our joints moved that far; `src/sprite/items/founderOut.ts` moves our limbs under them while they
  hang or stand as at rest (`src/sprite/solen.test.ts`). One script per creator option, each writing a module with
  `*_KIND`, `*_REST` and the bases its colour slots recolour from (at those, every pixel is his):

      python3 -I tools/refs/solen-hair-from-ref.py src/sprite/items/founderHairArt.ts [studyDir]
      python3 -I tools/refs/solen-face-from-ref.py src/sprite/founderFaceArt.ts [studyDir]
      python3 -I tools/refs/solen-cowl-from-ref.py src/sprite/items/founderCowlArt.ts [studyDir]
      python3 -I tools/refs/solen-cape-from-ref.py src/sprite/items/founderCapeArt.ts [studyDir]
      python3 -I tools/refs/solen-cuirass-from-ref.py src/sprite/items/founderCuirassArt.ts [studyDir]
      python3 -I tools/refs/solen-tunic-from-ref.py src/sprite/items/founderTunicArt.ts [studyDir]
      python3 -I tools/refs/solen-bracers-from-ref.py src/sprite/items/steelBracersArt.ts [studyDir]
      python3 -I tools/refs/solen-skirt-from-ref.py src/sprite/items/founderSkirtArt.ts [studyDir]
      python3 -I tools/refs/solen-trousers-from-ref.py src/sprite/items/founderTrousersArt.ts [studyDir]
      python3 -I tools/refs/solen-sandals-from-ref.py src/sprite/items/founderSandalsArt.ts [studyDir]
      python3 -I tools/refs/solen-sword-from-ref.py src/sprite/items/iceSwordArt.ts [studyDir]

  With a study folder each writes his picture, the piece and the continued pixels (magenta) at 8x.

  His far laced shin is a pixel thicker at the calf than he drew it (the owner, 2026-10-21: "le falta más
  pantorrilla a la pierna izquierda ponla un poco más gruesa solo un poco"): `solen-sandals-from-ref.py` draws
  his column `CALF_COL` twice on the calf's rows (`CALF_ROWS`), his back line and the laces behind it moved
  1 px back, so every pixel is still one of his and it tapers to the ankle as he drew it.

  His far arm hangs in shadow and thin (a 2 px strip of skin, a thin bracer, a small fist): stretched out it reads
  as a line. His repaint of Ren casting shows the far arm stretched out as thick as the near one, so while Solen's
  far arm reaches out (straight and near level: the cast, the throw's pointing arm, the combo's cross, the camp
  sit; `founderFarReach` in `src/sprite/items/founderOut.ts`) it is his near sleeve, upper arm, bracer and fist
  mirrored left to right (rows reversed, joint and angle mirrored: his pixels and colours, his lit side up):

      python3 -I tools/refs/solen-reach-from-ref.py src/sprite/items/founderReachArt.ts

- `lyra-upper-from-ref.py` → `src/sprite/items/lyraUpperArt.ts`: Lyra's blouse (`top_offshoulder_blouse`)
  and her corset, pauldron and bracers (`armor_gilded_corset`), lifted 1:1 from the owner's picture of her
  at our game's scale (`docs/reference/lyra-game-scale-owner-reference.jpg`: 19.32 picture pixels to one of
  ours, phase 0; his pixel (x, y) is our (x + 74, y + 121)). `OWN` says per row which of his pixels each
  piece takes; the parts his picture hides (under the braid, the blouse under the corset, the sleeves under
  the bracers, the far forearm behind the pouch) continue his pixels. The bare top of the near shoulder and
  the skin in the V (`K`, `V`) are his skin, drawn in the player's (`LYRA_SKIN`). One painted piece per segment of our
  female rig with his Lyra's long arms (appearance `arms: 'long'`, `rig.ts` LONG_ARMS: on the owner's bare
  female body his bare woman's elbows, her forearms longer and turned out at rest to his Lyra's wrists), pivot
  on its joint at idle (the forearm pieces on the wrist, so on the body's own shorter
  arms the cuff still ends at the wrist). Every piece is where he drew it, her far arm cell by cell: the
  pauldron, the far puff, the far bracer's top under the puff and its foot under the pouch, the far cuff
  and its line over his far hand; only the far forearm behind his pouch is run on (`FAR_BRACER`). Where
  our body's arm comes out from under his sleeves, bracers and cuffs at idle the pieces take it off
  (`BLOUSE_SLEEVE_N_CUT`, `BLOUSE_FOREARM_N_CUT`, `BLOUSE_FOREARM_F_CUT`, from `NEAR_UPPER_ARM`,
  `NEAR_FOREARM`, `FAR_FOREARM`, which `heroine-idle.mts` prints), and the chest's shoulder round above her
  bare shoulder (`BLOUSE_SHOULDER_CUT`). Under the blouse the body's sports top is her skin. It checks that every pixel of his is where it is laid at idle and
  writes `hers-vs-pieces@8.png` into `<out>`.

      python3 -I tools/refs/lyra-upper-from-ref.py docs/reference/lyra-game-scale-owner-reference.jpg <out> src/sprite/items/lyraUpperArt.ts

- `owner_paintover.py`, `owner_frames.py`: shared helpers for the owner's paint-overs of our frames. His
  2000 px pictures have a pixel grid that drifts over the picture; `native()` finds it per panel (a cubic
  fit of his pixel edges plus a local correction) and reads each of his pixels. `keep()` brings a figure he
  drew larger than ours down to our scale by keeping his least repeated rows and columns. `owner_frames.py`
  cuts a frame by owner (the option of hers that draws it) and part into pieces pinned to rig joints
  (`src/sprite/ownerFrames.ts`), and checks the pieces laid together are his frame pixel for pixel.
- `lyra-read-from-ref.py` (with `lyra_read_ref.py`) → `src/sprite/items/lyraReadArt.ts`: Lyra reading, his
  three frames (`docs/reference/lyra-read-owner-reference.jpg`, at our scale, one for one), the read pose's
  keys; the book for every reader is his. `seat-rock-from-ref.py` → `src/sprite/seatRockArt.ts`: his rock as
  a seat prop of its own (`src/sprite/seats.ts`), what she hides continued from his pixels.
  `lyra-throw-from-ref.py` (with `lyra_throw_ref.py`) → `src/sprite/items/lyraThrowArt.ts`: her throw frames
  3 and 4 (`docs/reference/lyra-throw-owner-reference.jpg`, his figure 1.35 times ours, brought down).
  `lyra_sit_ref.py` → `src/sprite/items/lyraSitArt.ts`: Lyra sitting, his one frame
  (`docs/reference/lyra-sit-owner-reference.jpg`, 20 picture pixels to one of ours, phase 0, at our scale, one
  for one), every frame of the sit pose; the rock and the earth round her boots are not hers (the seat prop is
  under her). It also gives the read frames their blade: `lyra_read_ref.sword_blade()` keeps each read
  frame's guard and grip and lays his sit blade, whole and unturned, where his sit guard falls on the frame's.
  `seat-rock-sit-from-ref.py` → `src/sprite/seatRockSitArt.ts`: his sit rock as the sit seat prop (his read
  rock is the read seat), what she hides continued from his pixels.
  `lyra-pose-joints.mts` prints the joints the pieces are pinned to; paste them into the scripts' `JOINTS`
  when the rig changes.

      python3 -I tools/refs/lyra-read-from-ref.py
      python3 -I tools/refs/seat-rock-from-ref.py
      python3 -I tools/refs/lyra-throw-from-ref.py
      python3 -I tools/refs/lyra_sit_ref.py
      python3 -I tools/refs/seat-rock-sit-from-ref.py

- `heroine_ref.py`, `heroine-study.py`, `heroine_paint.py`, `heroine-proportions.py`,
  `heroine-idle.mts`: the study of the owner's four heroines (`docs/reference/{lyra,elise,saya,aurelia}-owner-reference.jpg`),
  the base every heroine part builds on. His pictures are his own pixel art at 2.2 to 2.8 of his
  pixels to one of ours (Lyra and Elise: 7.81 picture pixels, one body in one pose, 256 of them
  tall; Saya: exactly 10, Aurelia: 9.66, 198 tall), in proportions that are not ours (5.1 to 5.4
  heads tall, ours 4.1). `heroine_ref.py` holds each picture's grid (`native(which)`), its colours
  (`PALETTES`), her joints and eyes, our female rig at idle frame 0, and how each part of her lands
  on it (`SEGMENTS[which]`: the head about the eyes, the torso, long hair and coat as columns, the
  limbs as chains along our limbs, the weapon at her own angle about our hand). `heroine-study.py`
  cuts her into parts, brings each down in her colours, paints the hand-drawn part
  (`heroine_paint.py`: everything below the head, the eyes, the weapons) and lays her line round the
  figure. The result, the reduced reference, is in `tools/refs/data/heroine-<which>-*.npy` and read
  with `heroine_ref.reduced(which)`, `reduced_parts(which)` (which part each pixel is) and
  `reduced_layers(which)` (each part alone). `heroine-proportions.py` draws `proporciones.png`: the
  template at our height beside its reduced reference and our female body, with the measurements.

      npx tsx tools/refs/heroine-idle.mts <out>     (also prints the joints with Lyra's long arms)
      python3 -I tools/refs/heroine-study.py <out> <out>/female-idle.png --write
      python3 -I tools/refs/heroine-proportions.py <out> <out>/female-idle.png

- `lyra-eyes-from-ref.py` → `src/sprite/lyraEyeArt.ts`: Lyra's eyes and brows as the `keen` eye
  shape, lifted 1:1 from his picture of her at our game's scale (19.32 picture pixels to one of ours,
  phase 0, the same grid as his Aiden): her two-row eye (black lash over her lash's brown corner, white,
  green and dark green) on the template's eye cells, her brows on the row over the lash. The lowered and
  closed lids are made of his pixels. Writes `eyes@16.png` (open, lowered, closed) and `hers@16.png`.

      python3 -I tools/refs/lyra-eyes-from-ref.py docs/reference/lyra-game-scale-owner-reference.jpg <out> src/sprite/lyraEyeArt.ts

- `lyra-sword-from-ref.py` → `src/sprite/items/lyraSwordArt.ts`: Lyra's sword (`held_gilded_rapier`),
  lifted 1:1 from the owner's picture of her at our game's scale
  (`docs/reference/lyra-game-scale-owner-reference.jpg`, 19.32 picture pixels to one of ours, his
  pixel (x, y) at our (x + 74, y + 121)): his steel pommel, knuckle bow and cross-guard with gold
  tips, gold collar and shell and cyan gem, his cyan blade (every cyan pixel within 2.6 px of its
  fitted line, with the black beside it) and his sparkles (the cyan further out, twinkling in the
  game). The grip his hand hides is his pommel's steel carried on. The female body's fist round a grip
  is his own near hand on this sword, and with her long arms (`arms: 'long'`) our fist at idle is where
  he drew his, so the sword is his as he drew it, no pixel moved (`STRETCH` 0, `HAND_SHIFT` 0); it pivots
  on the cell our grip point (`grip.ts` gripPoint, printed by `heroine-idle.mts`) falls on, beside his
  grip under the fist. Drawn at his blade's angle (42.7) at rest. Writes `his@8.png` and `kinds@8.png`
  into `<out>`.

      python3 -I tools/refs/lyra-sword-from-ref.py docs/reference/lyra-game-scale-owner-reference.jpg <out> src/sprite/items/lyraSwordArt.ts

- `lyra-hair-from-ref.py` → `src/sprite/items/lyraHairArt.ts`: Lyra's hair (`hair_copper_braid`), lifted
  1:1 from his picture of her at our scale (same grid and colour merge as her face, lower body): `HEAD`
  over the head (crown, fringe, far lock, pin, bow, her ear in the player's skin), `HEAD_FINE` the same
  unmoved for her own face (face shape `fine`; `HEAD` moves its far side 2 px out for our wider face
  template), `LONG` behind the body (hidden strands run on down) and `BRAID` over the near shoulder (with
  the hair over its root, his row 27, which the female body's higher shoulders would hide). The pieces
  ride the face anchor; with her long neck (`src/sprite/neck.ts`, on the female bodies one unit forward)
  they land on his picture laid at (x + 74, y + 121). Writes `pieces@8.png`.

      python3 -I tools/refs/lyra-hair-from-ref.py <out> src/sprite/items/lyraHairArt.ts

- `lyra-face-from-ref.py` → `src/sprite/lyraFaceArt.ts`: Lyra's face as the face shape `fine`
  (`src/sprite/lyraFace.ts`): his forehead, cheeks, nose shade, mouth, chin and line, narrower than our
  face template (his far eye 6 columns after the near one, ours 9), with the skin under his eyes and
  brows run on from below (the eye shapes draw those). Drawn in the player's skin (his colours in his
  skin). Writes `face@12.png` (his crop | the piece | the piece with his eyes back on).

      python3 -I tools/refs/lyra-face-from-ref.py <out> src/sprite/lyraFaceArt.ts

- `lyra-lower-from-ref.py` → `src/sprite/items/lyraLowerArt.ts`: Lyra's skirt (`bottom_striped_pleats`),
  tabard (`skirt_gilded_tabard`) and belt with pouch (`waist_pouch_belt`), his pixels laid at
  (x + 74, y + 121) with her blouse and boots; what his tabard, hand and sword hide is run on from his
  pixels. `src/sprite/items/lyraLower.ts` drapes them onto any pose (above the attach line on the torso,
  below it hanging as our skirts do, never past her soles). Writes `pieces@8.png`.

      python3 -I tools/refs/lyra-lower-from-ref.py <out> src/sprite/items/lyraLowerArt.ts

- `lyra-boots-from-ref.py` → `src/sprite/items/lyraBootsArt.ts`: Lyra's thigh-high boots
  (`feet_gilded_thigh_boots`) and the bare thigh above them, his pixels at (x + 74, y + 121) riding a
  leg of his proportions from our hip to his ankle, which stands off ours as at idle so his soles keep to
  our feet (`src/sprite/items/lyraBoots.ts`; `OUR` holds the female body's hips and ankles at idle); what
  her sword hides continues his gold and leather. Writes
  `hers-vs-pieces@8.png`.

      python3 -I tools/refs/lyra-boots-from-ref.py docs/reference/lyra-game-scale-owner-reference.jpg <out> src/sprite/items/lyraBootsArt.ts
- `roman-skin-from-ref.py`, `roman-head-from-ref.py`, `roman-eyes-from-ref.py`: from the same picture, his skin on our
  male bodies (upper arms down to the elbow, fists, and each leg whole for our thigh and our shin, registered as
  his sandals are, the laces taken off across each row; continued along each limb where ours reaches past what
  he shows; his darker shadow tone) and his face as the `roman` face and eye shapes (his head registered on
  ours by its eyes and ear; on the male bodies the head is raised 3 px to where he painted it; his skull under the hair is our male skull's cells,
  without his bangs' shadow, its line running into his ear's). Each writes a study at 8x (16x for the eyes)
  into `<out>/study/`. `roman-test-pixels-from-ref.py` writes his skin pixels as he painted them
  (`src/sprite/romanRefPixels.ts`) for `src/sprite/maleSkin.test.ts`, which checks the frames against his
  picture, not against the lifted pieces.

      python3 -I tools/refs/roman-skin-from-ref.py docs/reference/roman-owner-reference.jpg <out> src/sprite/maleSkinArt.ts
      python3 -I tools/refs/roman-head-from-ref.py docs/reference/roman-owner-reference.jpg <out> src/sprite/romanHeadArt.ts
      python3 -I tools/refs/roman-eyes-from-ref.py docs/reference/roman-owner-reference.jpg <out> src/sprite/romanEyeArt.ts
      python3 -I tools/refs/roman-test-pixels-from-ref.py docs/reference/roman-owner-reference.jpg src/sprite/romanRefPixels.ts
- `roman-neck-from-ref.py`, `roman-hair-from-ref.py`: his Roman head as the male standard (2026-10-23, "me gusta mas el
  de mi dibujo"). On the male bodies the game raises the head 3 px under his face (`ROMAN_HEAD_UP`, written by
  `roman-head-from-ref.py`), so the face stands where he painted it; the neck script lifts his skin between the chin
  and the collar (and continues each column below it, behind the collar) and the hair script his dark spiky hair
  (`hair_roman`: front, back with what his face hides filled in, and the shadow his locks cast on the forehead), both
  registered on the face anchor. `roman-test-pixels-from-ref.py` also writes every pixel of his head, hair and neck
  (`ROMAN_HEAD_PIXELS`) for `src/sprite/romanHead.test.ts`.

      python3 -I tools/refs/roman-neck-from-ref.py docs/reference/roman-owner-reference.jpg <out> src/sprite/romanNeckArt.ts
      python3 -I tools/refs/roman-hair-from-ref.py docs/reference/roman-owner-reference.jpg <out> src/sprite/items/romanHairArt.ts
- `roman-sit-rock-from-ref.py`: the grey rock from the owner's Roman sit (`docs/reference/roman-sit-owner-reference.jpg`,
  2000/240 picture px per pixel of his) as a seat prop (`src/sprite/seatBoulderArt.ts`, `src/sprite/seats.ts`). His
  figure there is 80% of ours; he chose to build the sit at our scale ("romano sentado a"), so the rock is scaled by
  1.25 (nearest neighbour) with it. Every cell one of his four frames shows is his; what his figure hides is his
  front face 16 (else 8) rows below, else his nearest rock pixel, his line along the new edges. The sit pose
  (`rig.ts` SIT) takes his joints off the same frames, scaled the same way. His rock is not in the game: the owner
  chose two seat rocks for every character (`seat_rock_sit` to sit and talk, `seat_rock` to read, `src/sprite/seats.ts`),
  so `seatBoulderArt.ts` was removed when `body/male-skin-face` was merged; the script still writes it where it is told.

      python3 -I tools/refs/roman-sit-rock-from-ref.py [src/sprite/seatBoulderArt.ts] [study.png]
- `roman-read-from-ref.py`: the book and hands of the owner's two frames of his Trunks reading
  (`docs/reference/trunks-read-owner-reference.jpg`, about 17.3 picture px across and 16.8 down per pixel of his)
  for the male read (`src/sprite/maleReadArt.ts`, drawn by `campfx.ts`), his answer "leer mira la referencia de
  trunks y copiala a leer de romano". He painted over our read at our scale (one of his pixels is one fine pixel),
  so every piece lands where he drew it. The book is his pixels; the hands are his hands' shape (gloved) with their
  tones matched by brightness to his Roman fists' tones (the Roman's hands are bare), his black line kept. The
  read pose (`rig.ts` READ_JOINTS) takes his joints off the same frames. His grid is found by
  `owner_paintover.py` (copied byte for byte from `heroine/lyra-v2`), with a pitch per axis.

      python3 -I tools/refs/roman-read-from-ref.py [src/sprite/maleReadArt.ts] [study.png]
- `ren-sit-palm-from-ref.py` (with `trunks_sit_ref.py` and `trunks_read_ref.py`, from `trunks/read-pose`): Ren's far hand when
  seated, the owner's open palm up from his Trunks sit picture (`docs/reference/trunks-sit-owner-reference.jpg`, brought down to
  our scale by `trunks_sit_ref.frame`), the hands' standard: his far hand without the bit of bare forearm his frame gives with it,
  every pixel his; his line kept, his skin and glove recoloured in the game (`src/sprite/items/nightSitPalmArt.ts`; `clothes.ts`
  Fingerless Gloves). Its angle is his bare forearm's, fitted on its columns; its pivot his wrist on that line.

      python3 -I tools/refs/ren-sit-palm-from-ref.py src/sprite/items/nightSitPalmArt.ts [studyDir]
- `ren-sit-from-ref.py` (with `ren_sit_painted_over.py`, written once by `ren-sit-painted-over.mts`): Ren seated on the male
  body, the owner's repaint (`docs/reference/ren-sit-owner-reference.jpg`, the lower row of our sit sheet), his four frames pixel
  for pixel: each cell found on his picture and brought onto our fine pixels by its scale and offset (fitted on the rock he did
  not repaint), each fine pixel the median of its middle, his colours snapped to one palette of his; his figure off his page and
  off our rock (over it, where the figure he painted over was), the page's blend round his edge peeled off, and the holes and
  notches the game closes in every frame closed with his own pixel there. Cut by body part (nearest bone), pinned to the male
  pelvis (`src/sprite/items/renSitArt.ts`, drawn by `src/sprite/renSit.ts` in place of our drawing on Ren's figure).

      python3 -I tools/refs/ren-sit-from-ref.py [src/sprite/items/renSitArt.ts] [studyDir]
