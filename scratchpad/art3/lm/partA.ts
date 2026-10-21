// Landmarks and stone for the battle maps: a stone lantern, a signpost, wooden and bamboo fences,
// boulders, rocks, pebbles, stepping stones and a roadside shrine.
//
//   npx tsx tools/world-sprites/landmarks.ts [previewDir]
//
// Solid parts (stone tiers, boulders, posts, boards, rails, roofs) are modelled as small low-poly
// meshes and rasterised with the battle camera's projection (1 m = 57 px across and up, 38 px per
// meter of depth), so tops of stones and lantern tiers show at the right steepness. Every pixel
// keeps the facet it came from, its normal and world position (a G-buffer). Light is Lambert from
// the upper left plus real cast shadows (rays against the meshes); the light picks a step of a
// 7-tone hue-shifted ramp (landmarks-paint.ts) through the kit's clustered band(), so facets read
// as planes broken into 2-4 px strokes. Facet edges facing the light get a crest, parts that
// overlap get a dark inner line.
//
// Then the hand pass, all in the same step buffer so it stays on the ramps:
//   stone  - carved lotus petals and inscriptions, rain streaks under ledges and moss, chipped
//            edges with lit fresh breaks, branching cracks with a lit lip, lichen rosettes;
//   moss   - cushions stacked back to front (lit crest, dark under-edge), sprigs on top, strands
//            hanging over front edges;
//   wood   - grain, knots, checks, worn corners, nails with rust, twisted rope lashings;
//   bamboo - slats of mixed age with nodes, splits and ground stains, black palm-rope ties.
// Outlines are 1 px and tinted by the material (landmarks-paint.ts outlineTinted).

import { join } from 'node:path';
import { Anim, Canvas, Color, WorldSprite, band, fbm, hash, hex, lambert, m, mix, noise, preview, previewDir } from './kit';
import {
  BAMBOO_DK_R,
  BAMBOO_G_R,
  BAMBOO_GREY_R,
  BAMBOO_R,
  BARK_R,
  BLACK_R,
  CEDAR_R,
  EMBER_R,
  FLAME,
  GOLD_R,
  GRASS_R,
  INK_R,
  IRON_R,
  LICHEN_O_R,
  LICHEN_R,
  MOSS_R,
  PAPER_R,
  QUARTZ_R,
  RED_R,
  ROPE_R,
  RUST,
  SLATE_R,
  STAIN_R,
  STONE_R,
  STONE_SUB_R,
  STONE_WARM_R,
  STONE_WET_R,
  WATER_R,
  WOOD_DK_R,
  WOOD_OLD_R,
  WOOD_R,
  drawRope,
  drawShide,
  grassTuft,
  outlineTinted,
  rampOf,
} from './landmarks-paint';
import { writeGroup } from './kit';

// --- camera ---------------------------------------------------------------------------------

