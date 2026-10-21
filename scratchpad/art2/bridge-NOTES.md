# River bridge: new sprites (staging, waiting for approval)

The old bridge was painted flat into the map. It is now two sprites, made the same way as the landmarks you liked. Every part is a small low-poly mesh drawn with the battle camera. Light comes from the upper left, with real cast shadows: the front railing throws its post and rail shadows across the deck. Shading uses clustered ramp steps, lit edges get crests, and parts that overlap get dark inner lines. Hand-painted detail sits on top.

## What to look at

- `bridge-preview.png`: the bridge at 2x over the map crop (x 1300..1900, y 520..860). Two characters stand on the deck between the back sprite and the front railing: one mid-deck and one near the front edge, with legs behind the rail. **The map still has the old painted bridge baked in**, so the old posts stick out under the new ones.
- `bridge-preview-river.png`: the same scene over a plain river strip. I painted it with the map's own palettes and formulas and left the old bridge out. This is how the bridge will look in game.
- `bridge-scene-2x.png`, `bridge-zoom-*.png`, `bridge-main-*.png`, `bridge-ripples.png` (the 4 ripple frames), `bridge-rail-zoom.png`, `bridge.png` (kit lineup with the scale character): close-ups for review.

## The sprites (`staging/bridge/`)

| sprite | contents | frames | tags |
|---|---|---|---|
| `bridge` "Wooden Bridge" | deck, back railing, front face (stringers), piers in the water, ripple highlights | `idle`: 4 frames at 4 fps (ripples at the 5 river piers) | walkable, flammable, destructible |
| `bridge_rail_front` "Bridge Front Railing" | the front railing only | `idle`: 1 frame | cover-half |

- Both sprites use the same 422x187 canvas and the same anchor, **[4, 150]**: the front-left corner of the deck top. Column 4 is the deck's first column and row 150 is the front edge row of the deck top. Draw both at the same point, in this order: `bridge`, then the units on the deck, then `bridge_rail_front`.
- `bridge.json`: `{"lengthPx":414,"deckDepthPx":91,"deckTopY":150,"anchor":[4,150]}`.
- On `river_forest` the anchor goes at map pixel **(1391, 720)**, which is the old deck's front-left pixel (`ceil(bridge.x0 - 0.5)`, `floor(bridge.yBot - 0.5)` from map.json). That puts the sprite's top-left at (1387, 570).
- Measurements:
  - Span: 414 px (7.27 m).
  - Deck top: 91 rows (rows 60..150), which is 2.4 m of depth.
  - Front face: 17 rows, made of the plank ends plus two stringers.
  - Railings: about 1.05 m. Posts every 1.2 m (7 per side) with capped tops, a top rail and a mid rail, and rope lashings at every joint. The front rail top is 64 px above the deck edge.
  - Piers: 0.2 m square, with chamfered edges and iron straps. They stand in front of the face and reach 0.4 m down to the water (23 px under the deck top).
- Details:
  - 29 boards of uneven width with dark seams. Each board has long grain lines, a lit left edge and its own tone, including some darker damp boards and one newer board.
  - Rows of nails over the three stringer lines, knots, and splits at the board ends.
  - A lighter worn path down the middle that swings toward the front corners where the map's path arrives.
  - Dark water stains and moss at the edges, the ends and in the seams.
  - Drip stains, a scarf joint with bolts, and green-black algae along the foot of the face. A wet band and algae at the piers' waterline.
- Water is transparent except at the 5 river piers: a light lip, spreading rings and drifting dashes, looping in 4 frames. The two end piers stand on the banks and have no ripples.
- Generator: `tools/world-sprites/bridge.ts`. It is deterministic: two runs gave byte-identical PNGs. Typecheck is clean.
  - Run: `WORLD_OUT=<staging> npx tsx tools/world-sprites/bridge.ts <previewDir>`
  - The review composites come from `bridge-compose.py <repo> <art2>`.

## Things to decide or watch

1. **Pier height.** The brief puts the deck 0.4 m above the water, so only about 12 px of pier shows under the face. The old painting and the mockup showed about 34 px, so the new bridge sits lower and flatter. If you want it taller, change `WATER` in bridge.ts (for example `-m(0.8)`).
2. **No shadow on the water.** The water under and beside the deck is left transparent, as the brief asked, so a bright river shows right up to the face. When the map is rebaked without the old bridge, it should paint a darker band under the deck. This rebake also has to drop the old painted deck, posts and `rail_back.png`/`rail_front.png`.
3. **Railing shadows are part of the deck sprite.** If the front railing can be destroyed separately, its shadows will stay on the deck. A broken or burnt variant would need a deck frame without them.
4. **Pier positions are fixed.** The ripples are placed for this river: the piers at X 71..343 are in the water and the two end piers are on the banks. A wider river elsewhere would need ripples on the end piers too.
5. **`walkable` is a new tag.** It was requested but is not in the kit's documented tag list, so the battle engine needs to learn it.
6. **Colours are ungraded.** The map bakes in a misty colour grade but the world sprites do not, so the bridge is a touch warmer and more saturated than the ground around it. This is the same as all other world sprites.
7. **Ripples are slow.** 4 fps (as requested) makes them gentle. 6 fps would read livelier.
