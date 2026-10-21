
// --- palettes -------------------------------------------------------------------------------

/** Every ramp has 7 steps: 0 outline, 1 deep, 2 shadow, 3 base, 4 light, 5 bright, 6 glint. */
const PAL: Color[][] = [];
function pal(r: Color[]): number {
  PAL.push(r);
  return PAL.length - 1;
}
const STONE = pal(STONE_R);
const STONE_W = pal(STONE_WARM_R);
const SLATE = pal(SLATE_R);
const QUARTZ = pal(QUARTZ_R);
const STAIN = pal(STAIN_R);
const MOSS = pal(MOSS_R);
const LICHEN = pal(LICHEN_R);
const LICHEN_O = pal(LICHEN_O_R);
const WOOD = pal(WOOD_R);
const WOOD_DK = pal(WOOD_DK_R);
const WOOD_OLD = pal(WOOD_OLD_R);
const BARK = pal(BARK_R);
const CEDAR = pal(CEDAR_R);
const ROPE = pal(ROPE_R);
const PAPER = pal(PAPER_R);
const RED = pal(RED_R);
const BLACK = pal(BLACK_R);
const GOLD = pal(GOLD_R);
const IRON = pal(IRON_R);
const INK = pal(INK_R);
const EMBER = pal(EMBER_R);
const GRASS = pal(GRASS_R);
const STONE_WET = pal(STONE_WET_R);
const STONE_SUB = pal(STONE_SUB_R);
const WATER = pal(WATER_R);
/** Hinoki bark roofing of the shrine: dark warm brown so the black bargeboards still read. */
const HIWADA = pal(rampOf(['#140d10', '#261a1c', '#382824', '#4d382f', '#654b3b', '#80624b', '#9d7d5f']));
const BAMBOO = pal(BAMBOO_R);
const BAMBOO_G = pal(BAMBOO_G_R);
const BAMBOO_GREY = pal(BAMBOO_GREY_R);
const BAMBOO_DK = pal(BAMBOO_DK_R);
void WATER;
void GRASS;

