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

- `scarlet_ref.py`, `scarlet-study.py`, `scarlet-idle.mts`: the study of the owner's Scarlet
  (`docs/reference/scarlet-owner-reference.jpg`), the base every Scarlet part builds on. His picture
  is his own pixel art at about 1.8 of his pixels to one of ours (his pixel is 5.33 x 5.31 picture
  pixels; 147 x 219 of them), so his parts are brought down to our scale and fitted to our male rig
  at idle frame 0 part by part (`scarlet_ref.SEGMENTS`: the head at 0.68 with his eyes on ours, the
  coat at 0.57 across, the legs, the arms along our arms, the sword turned a quarter turn to our
  weapons' angle), without his cape, in his colours (`scarlet_ref.PALETTE`). What that reduction
  loses or his picture hides (eyes, chest, gloves, skirts, trousers, boots, the sword's hilt) is
  drawn by hand after his, in his colours. The result, the reduced reference, is in
  `tools/refs/data/scarlet-reduced*.npy` and read with `scarlet_ref.reduced()`, `reduced_parts()`
  (which part each pixel is) and `reduced_layers()` (each part alone, with what the parts in front
  hide).

      npx tsx tools/refs/scarlet-idle.mts <out>
      python3 -I tools/refs/scarlet-study.py <out> <out>/male-idle.png --write

- `scarlet-hair-from-ref.py`: his hair as the `hair_scarlet` hairstyle, lifted out of the reduced
  reference in his eight crimsons (front over the head, back behind it with what his face hides
  filled in, like the Aiden hair). It writes `src/sprite/items/scarletHairArt.ts`.

      python3 -I tools/refs/scarlet-hair-from-ref.py <out> src/sprite/items/scarletHairArt.ts

- `scarlet-head-from-ref.py`, `scarlet-eyes-from-ref.py`: his face as the `noble` face shape and his
  eyes as the `noble` eye shape, lifted out of the reduced reference in his colours. The head is his
  face below the eyes (his warm shading, his smile, his brown jaw line and pointed chin) and his far
  temple, on our male skull's outline where his hair hides his head; the eyes are his line over the
  lash, his lash, his white, amber iris, lower line and glints, with the lowered and shut lids made
  of his pixels. They write `src/sprite/nobleHeadArt.ts` and `src/sprite/nobleEyeArt.ts`.

      python3 -I tools/refs/scarlet-head-from-ref.py docs/reference/scarlet-owner-reference.jpg <out> src/sprite/nobleHeadArt.ts
      python3 -I tools/refs/scarlet-eyes-from-ref.py docs/reference/scarlet-owner-reference.jpg <out> src/sprite/nobleEyeArt.ts

- `scarlet-upper-from-ref.py`, `scarlet-body-map.mts`: his upper clothes as two items, the shirt
  with the red cravat (`top_noble_shirt`) and the long black coat with the gold trim
  (`armor_scarlet_coat`, no cape), cut out of the reduced reference into pieces that ride the rig:
  the coat's body and sleeves (and the shirt's) turn with their segment, the coat's skirts and the
  back between the legs hang from the waist and bend with the legs like our skirts. What his
  picture hides (the shirt under the coat, the coat under the arms, the back behind the legs) is
  filled in his colours on our body's shape, which `scarlet-body-map.mts` maps. It writes
  `src/sprite/items/scarletCoatArt.ts` and `src/sprite/items/nobleShirtArt.ts`.

      npx tsx tools/refs/scarlet-body-map.mts <maps>
      python3 -I tools/refs/scarlet-upper-from-ref.py <out> <maps> src/sprite/items/scarletCoatArt.ts src/sprite/items/nobleShirtArt.ts

- `scarlet-lower-from-ref.py`: his pinstripe trousers (`bottom_pinstripe`) and his belt
  (`waist_noble_belt`). The trousers keep our cloth's shape and take his colours by the tone our light
  gives each pixel, his stripes running along each thigh and shin; the belt is a strap in his blacks
  under the coat, with his ring buckle, gold cross, red tassel and the small gold star inside the
  coat's near edge where the reduced reference has them. It writes `src/sprite/items/scarletLowerArt.ts`.

      python3 -I tools/refs/scarlet-lower-from-ref.py src/sprite/items/scarletLowerArt.ts <study>

- `scarlet-gloves-boots-from-ref.py`: Scarlet's tall black boots (`feet_noble_boots`) and fingerless
  gloves (`hands_noble_fingerless`), cut out of the reduced reference into pieces that ride the rig
  (each boot's shaft turns with the shin, its foot stays flat; each fist hangs from the wrist), with
  his buckles and ankle strap put back from his pixels and the far fist's fingertips narrowed to his.
  It writes `src/sprite/items/nobleBootsGlovesArt.ts` and, in `<study>`, his boots and gloves beside
  ours at the same size.

      python3 -I tools/refs/scarlet-gloves-boots-from-ref.py src/sprite/items/nobleBootsGlovesArt.ts <study>

- `scarlet-sword-from-ref.py`: his Scarlet's sword (`held_scarlet_sword`) at our scale, written to
  `src/sprite/items/scarletSwordArt.ts`. It is his sword mirrored, so it hangs the way our swords do
  (pommel up-left of the fist, blade down-right, his lit edge on top; a quarter turn would put the
  lit edge underneath), drawn at 3 down for 2 across (56.3 degrees, one off his 55) and held at that
  angle at rest. Its blade is one run of pixels per row read off his rows (`BLADE`, 0.6 of his along,
  0.7 across: his line, dark steel edge, black, red core, grey bevel, light edge, line), its hilt
  drawn by hand at our scale after his pixels (`HILT`). `--rows` prints his rows beside ours.

      python3 -I tools/refs/scarlet-sword-from-ref.py docs/reference/scarlet-owner-reference.jpg <out> src/sprite/items/scarletSwordArt.ts
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
- `roman-skin-from-ref.py`, `roman-head-from-ref.py`, `roman-eyes-from-ref.py`: from the same picture, his skin on our
  male bodies (upper arms down to the elbow, fists, and each leg whole for our thigh and our shin, registered as
  his sandals are, the laces taken off across each row; continued along each limb where ours reaches past what
  he shows; his darker shadow tone) and his face as the `roman` face and eye shapes (his head registered on
  ours by its eyes and ear, 3 px lower than he painted it; his skull under the hair is our male skull's cells,
  without his bangs' shadow, its line running into his ear's). Each writes a study at 8x (16x for the eyes)
  into `<out>/study/`. `roman-test-pixels-from-ref.py` writes his skin pixels as he painted them
  (`src/sprite/romanRefPixels.ts`) for `src/sprite/maleSkin.test.ts`, which checks the frames against his
  picture, not against the lifted pieces.

      python3 -I tools/refs/roman-skin-from-ref.py docs/reference/roman-owner-reference.jpg <out> src/sprite/maleSkinArt.ts
      python3 -I tools/refs/roman-head-from-ref.py docs/reference/roman-owner-reference.jpg <out> src/sprite/romanHeadArt.ts
      python3 -I tools/refs/roman-eyes-from-ref.py docs/reference/roman-owner-reference.jpg <out> src/sprite/romanEyeArt.ts
      python3 -I tools/refs/roman-test-pixels-from-ref.py docs/reference/roman-owner-reference.jpg src/sprite/romanRefPixels.ts
- `roman-sit-rock-from-ref.py`: the grey rock from the owner's Roman sit (`docs/reference/roman-sit-owner-reference.jpg`,
  2000/240 picture px per pixel of his) as a seat prop (`src/sprite/seatBoulderArt.ts`, `src/sprite/seats.ts`). His
  figure there is 80% of ours; he chose to build the sit at our scale ("romano sentado a"), so the rock is scaled by
  1.25 (nearest neighbour) with it. Every cell one of his four frames shows is his; what his figure hides is his
  front face 16 (else 8) rows below, else his nearest rock pixel, his line along the new edges. The sit pose
  (`rig.ts` SIT) takes his joints off the same frames, scaled the same way.

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
