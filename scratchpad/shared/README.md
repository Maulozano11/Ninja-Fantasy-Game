# Shared sprite review tools (run from /home/user/Ninja-Fantasy-Game)

S=/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/shared

## Gallery of every item in a slot (male, idle unless given)
  mkdir -p /tmp/gal-<you>/<slot>
  npx tsx $S/gallery.ts <slot> /tmp/gal-<you>/<slot> [male|female|bulky] [idle|handsigns|attack|cast|hurt|victory|charge]
  python3 $S/galcompose.py /tmp/gal-<you>/<slot> out.png <x0> <y0> <w> <h> <zoom> <cols>
    crops (x0 y0 w h on the 128 canvas):  hair: 36 16 56 46 · tops/armor: 24 28 80 80 · bottoms: 30 66 64 58 · skirts: 28 60 70 50
  slots: hair top bottom armor skirt waist hands

## Shade distribution of each item's MAIN color (shades 1..5, % of its pixels)
  npx tsx $S/shadedist.ts <slot>

  Target, measured on the reference coat (docs/reference/reference-sprite.png):
    deep shadow ~30-35% · shadow ~15-20% · base ~25% · light ~15% · highlight ~2-4%
    i.e. roughly shade 1: 28-35%, 2: 18-25%, 3: 22-30%, 4: 12-18%, 5: 1-4%
  Target for hair = the reference-derived hair_midnight: 34% 31% 22% 9% 4%

## Reference next to one of our looks, zoomed
  npx tsx $S/pair.ts out.png <refX> <refY> <ourX> <ourY> <w> <h> <zoom> [founder|base|<preset id fragment>] [pose]
  full body: 0 0 32 26 70 98 6 founder

## Item on 3 bodies x 7 poses
  npm run sprites -- item <itemId> out.png
