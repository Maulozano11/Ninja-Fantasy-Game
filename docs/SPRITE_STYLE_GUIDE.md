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
| Bodies | Male, female, bulky, slender. Every item must work on all of them. The female and slender bodies follow the owner's heroines drawn at our scale (proposal on `body/female-v2`, waiting for his approval): 92 px tall without hair, a longer torso and neck with the waist higher (`waistY`), narrow shoulders, a slim knee and fuller calf, his hands (5-7 px, cut 1:1 from his pictures) and Aurelia's bare shoulder (`femaleBodyArt.ts`), feet 4 rows shorter (the ankles stand lower, `ankleLift`; every foot template and boot is shortened by `shortFoot`), flat skin with a one-pixel shadow rim inside his near-black line (`skinF` ramp, `flatSkin`). Slender keeps narrower shoulders and waist and fuller hips. |
| Poses | idle, handsigns, attack (3 frames), cast, hurt, victory, charge. Every item must work in all of them. |
| Posture | Upright: chest slightly out, head over the shoulders. Never hunched. In idle the legs are straight under the hips and the arms hang relaxed and nearly straight, fists at hip height. |
| Depth | 3/4 front ground plane: the near foot stands lower on screen, the far hip and foot sit higher (`ANKLE_N`, `FAR_LIFT` in `rig.ts`). |
| Hips and legs | Waist, hips and pelvis line up straight under the torso: the hip sides follow the thighs' outer edges (`torsoPoly`), never wider, so there is no bell. A narrow crotch splits the legs, which read as two separate tapered columns down to the feet. |

## 2. Outline

- 1 px outline, pulled toward near-black (`#07060b`), around every layer. It is added automatically by the layer outline pass.
- Where one layer overlaps another (arm over the chest, hair over the face), its outline shows as an inner line. That separation is part of the look.
- Templates that already carry their own outline set `F_NO_OUTLINE`.
- Outlines never stack into 2 px lines: where a layer's outline runs right next to the outline of a layer in front of it, the back one is dropped (`thinDoubleOutlines` in `compose.ts`).

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

### The female standard (bodies, animations and sprites)

**The female body is his bare female body** (`docs/reference/female-base-owner-reference.jpg`, 2026-10-21). The owner, verbatim: "sigue teniendo las manos separadas en arrojada, en arrojada preparar falta el hombro, sentada, caida y varios mas tienes bugeada las piernas y estas poniendo 3 piernas o 3 botas corrige eso aqui tienes una base del cuerpo femenino sin ropa para que entiendas la base del cuerpo". On the female and slender bodies (slender is his body too until he draws a slender one), in every pose and frame:

- **His body, piece by piece.** Chest (neck, shoulders and his sports top), pelvis (belly and his briefs), each upper arm, forearm and hand, each thigh, shin and foot are his pixels (`src/sprite/femaleBaseArt.ts`, from `tools/refs/female-base-body-from-ref.py`): his skin and shading, his proportions, his arm and hand shapes and his black line. They ride the rig the way Aiden's plate does (`body.ts` `drawBaseBody`): at his angle every pixel is his, turned with RotSprite as the limb turns. His skin follows the character's skin (in his own skin, `#f6d1b0`, his colours exactly); his line never changes.
- **The rig is fitted to his joints** (`rig.ts` `BodyFit`, `solveFit`): at idle every joint is his, so frame 0 of idle is his picture, every pixel of the body below the head (`femaleBase.test.ts`). In every other pose the torso keeps his neck, shoulders and hips and each limb his length on its side (his far arm and leg are drawn shorter on screen, so the far foot stands higher without a lift of its own). His thigh is much longer than his shin: a foot asked to come in under the hip goes forward until the knee can fold over it.
- **One piece per limb, never twice.** Each leg is one piece with its foot, each arm one piece with its hand, on its own layer: never a leg, a foot or a boot drawn a second time (a heroine's skirt or boots must not carry painted legs of their own that stay put while the legs move). `femaleBase.test.ts` checks every pose and frame: one connected near leg and far leg (with and without boots), one connected arm with its hand on each side, no part drawn with more pixels than his piece.
- **No hand apart from its arm.** A hand turns with its forearm, exactly, and carries a round cap of the wrist, so it never comes away from the wrist (the throw's release). His closed fists are his hands; his heroines' small hands (`femaleBodyArt.ts` `FEMALE_HANDS`) hold a weapon, point, open and cradle on his wrist.
- **The shoulder is always there.** The upper arm piece carries his shoulder's round and turns about its middle, so a raised arm (the throw's wind-up) keeps its shoulder; the chest under it is continued from his pixels.
- **Joints stay whole.** The lower piece of every joint carries a round cap of the upper piece over the joint (elbow, wrist, knee, ankle), drawn over it; what he hides (the thigh tops under the briefs, the chest's near side under the arm, the far upper arm behind the chest, the neck under the head, the belly under the top) is continued from his pixels and stays hidden at rest.
- **No pixel cut off.** At rest every pixel is his. In any other pose a pixel of a piece left on its layer's edge becomes his line, so a piece moved apart from the next one, or a pixel of his line lost turning it, never leaves the body cut open.
- **His sports top and briefs** are part of the body (it always wears them, in his black) and two items, the sports top and the briefs, that recolour them.
- **His painted shades stay his**: the compositor's drop shadows leave every hand-painted pixel alone on the female bodies (`F_NO_TEXTURE`).
- **Sitting** sets the seat of his briefs on the camp seat's top (`FIT_SEAT_SINK`).
- Male and bulky stay byte-identical when the female standard changes.

The earlier review (2026-10-21), on the body built from his heroines at our scale, verbatim: "en las animaciones tienes errores en el hombro en arrojar (preparar) probablemente se arregle cuando arregles los hombros en el personaje mujer que le estas arreglando el hombro y brazo izquierdo y la mano en arrojada se ve cortada y tambien unos pixeles de la espalda se ven cortados en general en las animaciones y posturas los errores estan en ese brazo y hombro izquierdo que estas agregando entonces haz estos cambios el standard de el cuerpo animaciones y sprites femeninos para verse de la calidad que buscamos". His heroines at our scale (`docs/reference/*-game-scale-owner-reference.jpg`) still give the female faces' skin ramp and the small hands.

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

## Checklist for a new item

1. Render `npm run sprites -- item <id>` and check every body and pose.
2. Render `npm run sprites -- compare` with the item on the Solen preset, and compare at 6x with the reference.
3. Check outline, value budget, trim size, fold direction, and nothing covering the eyes or the near fist.
4. Run `npx tsc --noEmit`.
