# Converters from the owner's reference sheets

The owner wants his reference images copied as exactly as possible (see
`docs/reference/README.md`). These scripts turn his sheets into frame data that the sprite
generators in `tools/world-sprites/` decode, so a normal build needs no image files. Run them by
hand when a reference changes. Use `python3 -I`, and keep the references outside the repo's code
folders.

- `female-base-body-from-ref.py` (with `female_base_ref.py`): **the female body**, his bare female
  body (`docs/reference/female-base-owner-reference.jpg`, 100x100 of his pixels at 20 picture pixels,
  phase 0; his pixel (x, y) at our (x + 73, y + 120)) cut into pieces, one per bone: chest (neck,
  shoulders, sports top), pelvis (belly, briefs), each upper arm, forearm, hand, thigh, shin and foot,
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

- `water-from-ref.py`: the whole water set (`vfx_water_v3`) from his water sheet. It writes
  `tools/world-sprites/vfx-water-v3-refdata.ts`, which `vfx-water-v3.ts` animates. The third
  argument is our character at 1x (kit `characterRef()` saved as a PNG; it splits the aura into
  the layers behind and over the figure). With a fourth, a review folder, it also writes his crops
  at game scale and before/after previews.

      python3 -I tools/refs/water-from-ref.py docs/reference/water-set-owner-reference.jpg tools/world-sprites/vfx-water-v3-refdata.ts <character.png> [reviewDir]

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
