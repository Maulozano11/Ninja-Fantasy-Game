# Camp poses: lean, sit, read, train

Four new looping poses ("Recargado, Sentado, Leyendo, Entrenando") for any appearance. They face right like the other poses (the game mirrors them) and keep the feet anchor at (64,120). Render them by name: `renderSpriteCached(look, 'sit', frame, eye)`.

| Pose | Frames | fps | What it shows |
|---|---|---|---|
| `lean` | 4 | 2 | Leaning back about 13° against a rock, trunk or pole, arms crossed. The near foot is flat against the support; the far foot stands on the anchor. The chest rises 1 px on half the loop. |
| `sit` | 4 | 2 | On a seat whose top is 26 px above the feet. The feet are on the ground at the anchor, the near hand rests on the knee and the far palm is out to the fire. Breathes 1 px. |
| `read` | 12 | 3 | Same seat. An open book held from below in both hands, eyes lowered to it. Breathes; a page turns over on frames 9 to 11, about every 4 s. |
| `train` | 8 | 8 | A drill chosen from the held item: a sword kata for blades, a polearm drill for the naginata, a strike and kick drill for bare hands (see below). |

The weapon follows the pose:
- **lean, sit, read:** the weapon is put away, in the same places as for hand signs. The katana and kunai go at the belt; the crystal greatsword and naginata go on the back. Held techniques (orb, lightning, palm glow) fade.
- **train:** the weapon is in hand, and held techniques glow in the striking hand.

## Training drills

The drill is picked from `look.slots.held`; a stowed weapon counts as bare hands.

| Held item | Drill |
|---|---|
| katana, crystal greatsword, kunai | **Sword kata:** ready guard, the blade laid back over the head, a downward cut, follow-through, side guard (blade back and low), level cut, rising guard, ready. |
| naginata | **Polearm drill:** guard, thrust, recoil, raise overhead, chop, low sweep, spin upright, guard. |
| bare hands, orb, lightning, palm glow | **Strike and kick drill:** guard, jab, guard, cross, guard, knee up, front kick, chamber. |

All drills have 8 frames, so `frameCount(rigPoseFor('train'))` is right for every weapon. The game has no bows or staves yet; a new one would be mapped in `trainingFor` in `rig.ts`.

## Where the props go

`CAMP_PROPS` in `rig.ts` gives positions in design units, measured from the feet at x 32. Fine (1x) pixels are twice these.

- `SEAT_TOP`: the seat top, 26 px above the feet.
- `SEAT_X`: the middle of the seat, 18 px behind the feet.
- `LEAN_X`: the front face of the leaning support, 32 px behind the feet.

`CampScene.tsx` and `campArt.ts` already read these values and place the camp artist's seat_log, seat_rock and lean_rock from them. The comment in `campArt.ts` that says "measured: 17 and 26" is out of date; the values are now 18 and 32.

## Review files (this folder)

| File | Contents |
|---|---|
| `poses-camp-sheet.png` | At 2x, each pose on Solen, Hana, Kenji, Shiori, Aiden and Raiga. The supports are drawn where the game puts them. |
| `poses-camp-strip-lean.png`, `-sit.png`, `-read.png`, `-train.png` | Every frame, one row per character. |
| `poses-camp-lean.gif`, `-sit.gif`, `-read.gif`, `-train.gif` | The six characters side by side, looping at the game's fps. |
| `poses-camp-scene.png` (1x and `-2x`), `poses-camp-scene.gif` | The night camp with the party at the scene's four spots, built with `tools/scenes/party_sprites.ts` and `camp_preview.py`. Solen sits on the log, Hana reads on the rock, Kenji leans on the rock behind the fire and Aiden trains. The GIF is 3 s with each pose at its own fps. |

I also checked bulky and slender bodies; long, knight, rose, rogue, traveler and scarf capes; the lioness gown; silver and long hair; a shield; the giant shuriken; twin swords; gauntlets; and every held item. No frame touches the canvas edge.

## Code changes

**`src/sprite/`**
- `types.ts`: `CampPose` and `CAMP_POSES`. The new poses are not in `SPRITE_POSES`.
- `rig.ts`:
  - keyframes and `POSE_FPS` for the four poses;
  - `CAMP_PROPS`;
  - hand targets relative to a knee;
  - the rig poses `trainPole` and `trainFist`;
  - `rigPoseFor(pose, style, held?)`, which picks the drill;
  - a negative `lift` now means "lower the body".
- `compose.ts`: passes the held item (none when stowed) to `rigPoseFor` and draws the camp props.
- `campfx.ts` (new): the book and its page turn.
- `grip.ts`: blade and polearm angles for the drills; the weapon is stowed while leaning, sitting or reading.
- `body.ts`: lowered eyelids while reading.
- `items/capes.ts`: capes flare on the cuts and kicks.
- `items/headband.ts`: headband tails trail during training.

**`tools/scenes/party_sprites.ts`**
- accepts `who:pose:frame`;
- finds the mission companions (Hana, Kenji) as well as the presets.

## Checks

- `npx tsc --noEmit -p .` prints nothing.
- `npm test`: 71 tests pass.
- Regression: 2210 existing frames are pixel-identical (`poses-camp-hash.ts`). They cover all old poses including the movement poses, for every preset plus Hana and Kenji, with the weapon stowed and on bulky and slender bodies.

## Known issues

- **Sit and read:**
  - The bodies have short legs, so on a 26 px seat the thighs slope down to the knees. It reads more like a tall stool than a low log.
  - Forearms on the knees doesn't work: the arms are too short to reach the knees without a hunch, so the near hand rests on the knee instead.
- **Read:**
  - The head can't tilt (the face is a fixed template), so the eyelids lower instead.
  - The book is small (21×11 px), in plain leather, and doesn't glow; it is not the grimoire.
- **Lean:**
  - The back meets the support face within about ±3 px depending on body and armour.
  - Capes and the giant shuriken overlap the support, which is fine because the support is drawn behind the character.
  - The weapon is stowed rather than leaning beside the character.
- **Seated clothing:**
  - Long coat tails and war skirts hang over the front of the seat; long gowns rest on the ground.
  - A sheathed hip katana points back and down through the seat area.
- **Long weapons in training:** on the forward cuts the crystal greatsword and naginata are held closer to the body, so they stay inside the 128 px frame.
