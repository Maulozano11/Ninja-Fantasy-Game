# Sprite Style Standard

Every character sprite in Shinobi Chronicles follows one look. It is defined by the reference sprite in [`reference/reference-sprite.png`](reference/reference-sprite.png) (shown 6x in [`reference/reference-sprite-6x.png`](reference/reference-sprite-6x.png)). New hair, clothes, armor and weapons must match it before they ship.

Check any item against the reference with:

```bash
npm run sprites -- compare out.png            # reference next to the Solen preset, 6x
npm run sprites -- item <itemId> out.png      # an item on 3 bodies x 7 poses
npm run sprites -- preset <presetId> out.png  # a preset in every pose
```

## 1. Canvas and proportions

| | Value |
|---|---|
| Canvas | 256 x 256 px. The figure stands in a 128 x 128 box (`BOX`) at `PAD`, with room around it for big weapons (great swords, scythes, war hammers) and effects; cards and thumbnails show the box. Geometry uses design units (`raster.ts`: `UNITS`, `RES = 2`). |
| Height | About 94 px from the top of the hair to the soles, like the reference. |
| View | 3/4, facing right. The near arm and leg (screen-left) are drawn in front; the far ones are behind and one shade darker. |
| Head | Shrunk by `headScale` (about 0.78). The face from the lash row down is a fixed pixel template. |
| Bodies | Male, female, bulky. Every item must work on all three. |
| Poses | idle, handsigns, attack (3 frames), cast, hurt, victory, charge. Every item must work in all of them. |
| Posture | Upright: chest slightly out, head over the shoulders. Never hunched. In idle the legs are straight under the hips and the arms hang relaxed and nearly straight, fists at hip height. |
| Depth | 3/4 front ground plane: the near foot stands lower on screen, the far hip and foot sit higher (`ANKLE_N`, `FAR_LIFT` in `rig.ts`). |
| Hips and legs | Waist, hips and pelvis line up straight under the torso: the hip sides follow the thighs' outer edges (`torsoPoly`), never wider, so there is no bell. A narrow crotch splits the legs, which read as two separate tapered columns down to the feet. |

## 2. Outline

- 1 px outline, pulled toward near-black (`#07060b`), around every layer. It is added automatically by the layer outline pass.
- Where one layer overlaps another (arm over the chest, hair over the face), its outline shows as an inner line. That separation is part of the look.
- Templates that already carry their own outline set `F_NO_OUTLINE`.
- Outlines never stack into 2 px lines: where a layer's outline runs right next to the outline of a layer in front of it, the back one is dropped (`thinDoubleOutlines` in `compose.ts`).
- No 1-pixel holes (the owner, 2026-10-22: *"si arregla el hueco de 1 pixel a todos"*). Turned pieces leave
  pixels of background between them; once the figure is flat, `closePinholes` (`src/sprite/holes.ts`) closes
  every hole of up to 3 pixels the figure walls in (with the line of the pieces round it, or inside one piece
  with the colour most of its neighbours have), every nick in the silhouette where the line is missing (the
  background with the figure on three sides, one of them not line), and takes away stray specks of 1–2 pixels.
  Real gaps stay: anything bigger or open to the outside, a notch the line goes round, and what an effect
  walls in. **Idle is left exactly as drawn** (it is the frame his pictures were copied into).
- No background in the seam beside a clasp (the owner, 2026-10-22: *"aqui tiene unos aun en la hebilla o
  medallon de la capa"*, then *"1 arreglar igual capa 2 solen rellenar"*). Painted pieces on different joints
  (a mantle on the neck, its shoulder piece on the shoulder, the hair on the head) part as they move; the piece
  says what fills its seam (`addSeam`, `src/sprite/seams.ts`): his cloth drawn beside it (Solen's cowl) or its
  own cloth continued round its studs (`clothSeam`: the Shadow Half-Cloak). Once the figure is drawn it goes
  in behind everything, only where nothing is drawn and the figure stands round it on all four sides. Idle
  only where he left the seam open: Solen's cowl on the bulky body (every other idle frame is byte-identical).

## 3. Light and values

- Light comes from the upper left.
- Each material uses a 6-step hue-shifted ramp: 0 outline, 1 dark, 2 shadow, 3 base, 4 light, 5 highlight. Shadows drift cool and highlights warm.
- **Value budget:** most of an item sits in shades 1-3. Shades 4-5 are short crest lines, lit rims and single glints, never large flat light areas.
- Shading is clustered (2-4 px groups placed like brush strokes), not smooth bands. The compositor adds this automatically (`texture.ts`), kept subtle so there is little contrast scatter. Hand-made templates set `F_NO_TEXTURE` and carry their own clusters.
- Dark materials stay readable: black cloth and dark hair keep their fill well above the outline, with lit folds and soft highlights (no near-black fills, no glaring strands).
- Patterns stay calm: broad bands (about 5 px) with one dark seam row, never high-frequency stripes.

## 4. Face (fixed)

The face is a template copied pixel by pixel from the reference (`FACE_MAIN` and `FACE_LEFT` in `body.ts`). It has a 4 px lash bar, a 2x2 iris (a dark top row over a mid-tone row, never the brightest tone, so the gaze stays focused), a 1 px far eye, a single nose pixel, a 3 px mouth and a tapered 1 px chin. The near cheek and jaw come in three face shapes (`FACE_LEFT`): `tapered` (default) drops straight for only two rows below the eye, then tapers diagonally into the chin, so the lower face stays small; `soft` is a fuller cheek; `square` is the reference's original strong, flat jaw. Behind the jaw the nape (back of the neck) runs from under the skull down to the shoulders, so short or swept-back hair never leaves a gap there: `slim` (default) starts well inside the skull's back edge and stays in shadow; `strong` is flush with the back of the skull, with a lit nape. It recolors by skin tone and eye color, and has female and bulky variants, seven eye shapes (standard, sharp, round, calm, fierce, bright, piercing; `EYE_ROWS`, which may also replace the row under the eye), three face shapes and two necks. Don't change it without comparing at 10x against the reference.

## 5. Skin, arms, hands and feet

- **Skin ramp** (`makeRamp` kind `skin`): the chosen skin color is the broad lit tone. Shadows turn rose and muted (never bright orange); there are no near-white highlights.
- **Limbs** use cylinder bands (`cylShade` in `raster.ts`): a darker rim on the lit edge, a wide base core, a shadow band, and a dark far edge, with jittered band edges so the shading breaks into clusters.
- **Arms are as wide as the reference's and tapered** (`ARM_PROFILE` in `ctx.ts`): about 9 px with the outline through the upper arm and the forearm swell just below the elbow, a slight pinch at the elbow, tapering to about 6 px at the wrist (male body). Never straight, even-width tubes. Forearm and biceps carry a lit muscle crest and a shadow line. Legs follow `LEG_PROFILE` (full thigh, narrower knee, calf swell, slim ankle).
- **Contact shadows:** skin is one shade darker for two rows under any sleeve, hem, collar or chin drawn over it (`castShadows` in `compose.ts`).
- **Hands** are pixel templates (`HAND_*` in `ctx.ts`, about 9-10 px across like the reference's fist) rotated with RotSprite: lit knuckle pixels, shadow on the side away from the light, and near-black finger creases. A weapon hand wraps the grip with distinct 1 px fingers and a thumb crease, with the pommel and guard showing on either side of the fist. A free hand is small and relaxed (`hold` and `relaxed` shapes).
- **Feet** are pixel templates in 3/4 front view (`FootArt`, `footDraw` in `ctx.ts`). The near foot faces the viewer with the toes at the bottom; the far foot points right and is authored a shade darker. Each footwear item supplies its own `FootArt` (legend: `0-5` main, `a-f` sole/straps, `p-u` skin, `v-z` metal or stitching); shafts stay procedural.

**The far (left) shoulder and arm** (the owner, 2026-10-21: "no te olvides de el hombro y brazo izquierdo de el diseño de los personajes masculinos", after the same fix on the heroines). In the 3/4 view facing right the character's left shoulder and arm are the far ones. When copying his picture, read that side cell by cell (bare shoulder, sleeve, bracer, fist): at rest every pixel is his and where he drew it, pinned with an offset that follows the far-arm joints when our joint sits elsewhere (`FAR_OUT`, tools/refs/saya-upper-from-ref.py). Nothing on that side may be cut off or hidden behind the torso in any pose; check throw-prepare, throw-release, cast and handsigns in particular, and report the pixels that still differ.

## 6. Hair

- Hair is a pixel template anchored on the face (`hairTemplate` in `hairkit.ts`). The near-eye iris is at `(nx + 2, ny + 1)` from `faceAnchor`.
- Style: a dark 0 outline with a lit 1 rim, irregular 1-2 px tufts on the silhouette, mostly shades 1-2 with clusters of 3-4 and a few 5 glints.
- Bangs end at the lash row. A few 1-2 px strands may cross the face beside or between the eyes.
- Both irises stay visible. The only exception is a style designed to cover one eye.
- Head width: the hair silhouette stays within about 28 px (the midnight standard), with at most 3-4 px of hair behind the skull and 3-5 px above it. A style whose fringe stays off the face (`FACE_CLEAR_HAIR` in `compose.ts`) frames it with a short side lock over the jaw edge, in front of the ear, so the face doesn't read too wide.
- Parts that follow the body (long hair down the back, ponytails) are drawn procedurally in `hairBack` with the same outline and clusters.

## 7. Weapons

- Rigid weapons are templates drawn once, pointing right, with the pivot on the grip (`items/weapons.ts`). They are rotated per pose with RotSprite (`rotsprite.ts`), so edges stay crisp.
- **Anatomy, readable at 1x:** pommel, wrapped grip, guard, then the blade with a lit top edge, a center ridge or fuller, a darker lower half, and facet or hamon detail.
- The crossguard shows just below the fist. Blades use `metal` materials so they get a dark outline.
- Glow materials are only for energy techniques (spiral orb, lightning, palm glow), never for steel or crystal.
- In idle the blade hangs across the legs about 50° below horizontal, like the reference.
- A weapon stowed on the back (hand signs, the tackle, the combo, camp, or put away in battle) is strapped to
  the back: it turns with the torso's lean in every pose, and nothing of it shows in front of the back below
  the shoulders (the owner, 2026-10-22: *"haz el cambio en espada guardada"*; `clipStowed` in
  `items/accessories.ts`). What would show there is cut away, a painted blade closed with its own black line,
  and no sliver of it is left loose.
- Blades stay slim (about 5 px plus outline) and taper to the tip; shading is a lit bevel, a centre ridge and a darker lower half, with only sparse facet lines.

## 8. Clothes

- Panels are separated by 1 px dark seams.
- Folds are crest and trough lines that follow how the cloth hangs (diagonal on wraps and sashes, vertical on coats and capes). No stripe patterns unless the garment is striped.
- **Trims:** buttons, studs and gold piping are small and muted: 1-2 px each with a single brighter pixel, set in sparse rows. No grids of big bright squares.
- Hems are flat or cut, not round blobs.
- Sleeves, cuffs and boot tops follow the limb (`sleeves`, `trousers`, `boot` in `clothes.ts` and `feet.ts`).
- **Pants** never flare at the hips. They show a dark inseam where the legs split, and each leg is shaded and outlined as its own tapered column (near leg lighter, far leg darker, inner-thigh shadow), never one block across both legs.
- **Skirts, robes and coat tails** hang straight from the waist (hem about as wide as the hips, no bell) and let the leg split read below or through them.
- **Depth target:** the main color of a garment spreads over all five values, like the reference coat: roughly 30% shade 1, 20% shade 2, 25% shade 3, 15% shade 4, 2-4% shade 5 (`shadedist.ts`). Use form shading (the side away from the light and the lower parts darker), occlusion under collars, belts and straps, and folds as a lit crest next to a dark trough.

## 9. Armor

- Each plate has a 1 px lit top rim, a darker lower half and a 1 px dark seam to the next plate.
- Rivets and studs are single pixels with one glint.
- Gold is muted (`#b8913a`-range) with one bright pixel per piece.
- Shoulder guards follow the upper arm only partway, so they never smear across the chest in attack poses.
- Every armor maps to a legacy armor style for AC (`statsArmor`).

## 10. Capes

- A cape hangs behind the near arm. The near forearm and fist always stay visible in idle.
- Over the shoulder, a cape uses only a low, flat cap that never rises above the shoulder line.
- Dark capes stay near-black, with thin highlight lines on fold crests only.
- Hems are cut or pointed, with long vertical folds.
- The visible part of a cloak has a lit outer rim and darkens as it curves in behind the body, with one or two lit fold streaks running down it.

## 11. Names

All item and preset names are original. Never use names, symbols or logos from existing franchises.

The headband is plain cloth only (the owner, 2026-10-22: "deja la pura bandana la pura tela"): no metal plate, no emblem or engraved village symbol, no slash across it (`items/headband.ts`). It replaced his earlier "quita las bandanas". Don't add a plate or symbol back.

## Checklist for a new item

1. Render `npm run sprites -- item <id>` and check every body and pose.
2. Render `npm run sprites -- compare` with the item on the Solen preset, and compare at 6x with the reference.
3. Check outline, value budget, trim size, fold direction, and nothing covering the eyes or the near fist.
4. Run `npx tsc --noEmit`.
