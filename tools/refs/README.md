# Converters from the owner's reference sheets

The owner wants his reference images copied as exactly as possible (see
`docs/reference/README.md`). These scripts turn his sheets into frame data that the sprite
generators in `tools/world-sprites/` decode, so a normal build needs no image files. Run them by
hand when a reference changes. Use `python3 -I`, and keep the references outside the repo's code
folders.

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
- `ascended_ref.py` + `ascended-hair-from-ref.py`, `ascended-cloak-from-ref.py`, `ascended-kimono-from-ref.py`,
  `ascended-hakama-from-ref.py`, `ascended-sash-from-ref.py`, `ascended-wraps-from-ref.py`, `ascended-feet-from-ref.py`:
  the owner's Ascended paint-over (`docs/reference/ascended-owner-reference.jpg`, pitch 20, our male idle frame 0 at
  offset (74, 117)), one script per item, copied like Aiden and the Roman set: Ascended Spikes, the Rogue Storm Cloak
  (back, collar, the cloak on each shoulder, its front edge), the Wrap Kimono (body and both sleeves), the Wide
  Hakama (the top round the hips, each leg's thigh and shin), the Cloth Sash, the Bandage Wraps (forearms and fists)
  and the Foot Wraps (bandaged shins and feet). `ascended_ref.pieces()` cuts his figure by row spans and colour kinds
  (warm: hair, skin, kimono, bandages; cool: cloak, scarf, hakama), shares his black line between the pieces it
  bounds, and continues each piece where his picture hides it (`from_column`, `from_row`, `tile`: his bandage turns
  and folds repeated). His face and the V of his chest are ours and are not lifted. The feet are moved onto our
  ankles (`FOOT_SHIFT`). The modules export `*_KIND` (what each colour of his is, for the colour slots) and
  `*_REST` (where each piece lands in our idle), which `src/sprite/ascended.test.ts` checks; the items are drawn by
  `src/sprite/items/ascended.ts` (the cloak in `capes.ts`, the hair in `hair.ts`). Each sleeve is lifted whole and
  cut where it falls loose when drawn (`SLEEVE_HANG` in `ascended.ts`: the band rides the upper arm, the bell hangs
  from it like cloth); each forearm is cut where his cuff covers it at rest (`foreParts`). Run alone, `ascended_ref.py
  <out.png> [pieces.png]` draws his picture with the pieces tinted, and every piece with its continued cells crossed.

      python3 -I tools/refs/ascended-hair-from-ref.py src/sprite/items/ascendedHairArt.ts [studyDir]
      python3 -I tools/refs/ascended-cloak-from-ref.py src/sprite/items/rogueCloakArt.ts [studyDir]
      python3 -I tools/refs/ascended-kimono-from-ref.py src/sprite/items/kimonoArt.ts [studyDir]
      python3 -I tools/refs/ascended-hakama-from-ref.py src/sprite/items/hakamaArt.ts [studyDir]
      python3 -I tools/refs/ascended-sash-from-ref.py src/sprite/items/sashArt.ts [studyDir]
      python3 -I tools/refs/ascended-wraps-from-ref.py src/sprite/items/wrapsArt.ts [studyDir]
      python3 -I tools/refs/ascended-feet-from-ref.py src/sprite/items/footWrapsArt.ts [studyDir]
