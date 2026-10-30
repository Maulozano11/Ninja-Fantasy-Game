# World sprites

Generators for the battle-map sprites: trees, plants, camp props, landmarks and animals. Each
group is one script built on the shared kit (`kit.ts`) that writes a sheet per object plus a
manifest to `src/assets/world/<group>/`:

```bash
npx tsx tools/world-sprites/<group>.ts [previewDir]
```

Each manifest lists, per sprite:

- frame size and anchor, where the anchor is the ground contact point;
- real size in meters;
- animations as sheet rows, with frames, fps and loop;
- gameplay tags: cover, hide spot, flammable, explosive, light source and so on.

Scale is real: 1 m = 57 px across and 38 px per meter of depth, so a character (1.75 m) is about
100 px tall. Re-running a generator gives byte-identical PNGs.

## Status (paused on 2026-10-13 to focus on gameplay)

The owner approved the **landmarks** look. They want the foliage to follow their two reference
images: a few big lobes, painted dabs of colour and a dark green ragged outline. The sampled
colours are kept in `trees.ts` and `plants.ts`.

| Group | Done | Still to do |
|---|---|---|
| landmarks | All 9 sprites: stone_lantern (lit/unlit), signpost, fence (and broken), fence_bamboo, boulder, rock, rocks_small, river_stones, hokora. | Polish only: the shrine roof reads a little like a straw hat, the signpost ink marks repeat, the fence rope lashings are bright, and edge pixels are speckly. |
| trees | All 5: oak (idle, burning, burnt), pine (idle, burnt), maple (idle, burnt), bamboo, stump. Oak, pine and maple canopies are in the owner's reference style. | Bamboo culms and the stump are only partly restyled, and the burnt states keep the first style. The burning oak's flames line up like candles, and the pine tiers are very regular. The stump is 1 m tall on screen (target 0.5 m: decide whether that includes the cut top). |
| plants | All 9. bush_round, bush_wide and bush_flower are in the reference style; tall_grass and fern have the new greens. | reeds, flowers, lily_pads and mushroom_log are in the first style. The lily pads' old green clashes with the new foliage; the log's bark reads like bricks; the lotus is a blob. |
| camp | All 9 in the first style: campfire (burning, smoldering, out), smoke, tent (and burnt), barrel (hit, broken), barrel_explosive (lit, explode), crate (broken), crate_stack, sacks, weapon_rack. | The owner asked to rebuild the whole set in the landmarks style: copy the mesh pipeline from `landmarks.ts`, keep the flames, smoke and explosion. The tent is the weakest piece. |
| animals | rabbit (idle, graze, hop), deer (idle, graze, walk, alert), crow (perch, fly), sparrow (perch, fly). | Not started: butterfly_blue, butterfly_yellow, dragonfly, frog, koi, fireflies. Polish: the sparrow's face, single-pixel deer spots, and the rabbit belly in the hop frames. |
