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
| Canvas | 128 x 128 px. Geometry uses a 64-unit design space (`raster.ts`: `UNITS`, `RES = 2`). |
| Height | About 94 px from the top of the hair to the soles, like the reference. |
| View | 3/4, facing right. The near arm and leg (screen-left) are drawn in front; the far ones are behind and one shade darker. |
| Head | Shrunk by `headScale` (about 0.78). The face from the lash row down is a fixed pixel template. |
| Bodies | Male, female, bulky. Every item must work on all three. |
| Poses | idle, handsigns, attack (3 frames), cast, hurt, victory, charge. Every item must work in all of them. |
| Posture | Upright: chest slightly out, head over the shoulders. Never hunched. |

## 2. Outline

- 1 px outline, pulled toward near-black (`#07060b`), around every layer. It is added automatically by the layer outline pass.
- Where one layer overlaps another (arm over the chest, hair over the face), its outline shows as an inner line. That separation is part of the look.
- Templates that already carry their own outline set `F_NO_OUTLINE`.

## 3. Light and values

- Light comes from the upper left.
- Each material uses a 6-step hue-shifted ramp: 0 outline, 1 dark, 2 shadow, 3 base, 4 light, 5 highlight. Shadows drift cool and highlights warm.
- **Value budget:** most of an item sits in shades 1-3. Shades 4-5 are short crest lines, lit rims and single glints, never large flat light areas.
- Shading is clustered (2-4 px groups placed like brush strokes), not smooth bands. The compositor adds this automatically (`texture.ts`). Hand-made templates set `F_NO_TEXTURE` and carry their own clusters.

## 4. Face (fixed)

The face is a template copied pixel by pixel from the reference (`FACE_MAIN` and `FACE_LEFT` in `body.ts`). It has a 4 px lash bar, a 2x2 iris with one light pixel, a 1 px far eye, a single nose pixel, a 3 px mouth and a tapered 1 px chin. It recolors by skin tone and eye color, and has female and bulky variants and four eye shapes. Don't change it without comparing at 10x against the reference.

## 5. Hair

- Hair is a pixel template anchored on the face (`hairTemplate` in `hairkit.ts`). The near-eye iris is at `(nx + 2, ny + 1)` from `faceAnchor`.
- Style: a dark 0 outline with a lit 1 rim, irregular 1-2 px tufts on the silhouette, mostly shades 1-2 with clusters of 3-4 and a few 5 glints.
- Bangs end at the lash row. A few 1-2 px strands may cross the face beside or between the eyes.
- Both irises stay visible. The only exception is a style designed to cover one eye.
- Parts that follow the body (long hair down the back, ponytails) are drawn procedurally in `hairBack` with the same outline and clusters.

## 6. Weapons

- Rigid weapons are templates drawn once, pointing right, with the pivot on the grip (`items/weapons.ts`). They are rotated per pose with RotSprite (`rotsprite.ts`), so edges stay crisp.
- **Anatomy, readable at 1x:** pommel, wrapped grip, guard, then the blade with a lit top edge, a center ridge or fuller, a darker lower half, and facet or hamon detail.
- The crossguard shows just below the fist. Blades use `metal` materials so they get a dark outline.
- Glow materials are only for energy techniques (spiral orb, lightning, palm glow), never for steel or crystal.
- In idle the blade hangs steeply (about 70° below horizontal) across the legs, like the reference.

## 7. Clothes

- Panels are separated by 1 px dark seams.
- Folds are crest and trough lines that follow how the cloth hangs (diagonal on wraps and sashes, vertical on coats and capes). No stripe patterns unless the garment is striped.
- **Trims:** buttons, studs and gold piping are small and muted: 1-2 px each with a single brighter pixel, set in sparse rows. No grids of big bright squares.
- Hems are flat or cut, not round blobs.
- Sleeves, cuffs and boot tops follow the limb (`sleeves`, `trousers`, `boot` in `clothes.ts` and `feet.ts`).

## 8. Armor

- Each plate has a 1 px lit top rim, a darker lower half and a 1 px dark seam to the next plate.
- Rivets and studs are single pixels with one glint.
- Gold is muted (`#b8913a`-range) with one bright pixel per piece.
- Shoulder guards follow the upper arm only partway, so they never smear across the chest in attack poses.
- Every armor maps to a legacy armor style for AC (`statsArmor`).

## 9. Capes

- A cape hangs behind the near arm. The near forearm and fist always stay visible in idle.
- Over the shoulder, a cape uses only a low, flat cap that never rises above the shoulder line.
- Dark capes stay near-black, with thin highlight lines on fold crests only.
- Hems are cut or pointed, with long vertical folds.

## 10. Names

All item and preset names are original. Never use names, symbols or logos from existing franchises.

## Checklist for a new item

1. Render `npm run sprites -- item <id>` and check every body and pose.
2. Render `npm run sprites -- compare` with the item on the Solen preset, and compare at 6x with the reference.
3. Check outline, value budget, trim size, fold direction, and nothing covering the eyes or the near fist.
4. Run `npx tsc --noEmit`.
