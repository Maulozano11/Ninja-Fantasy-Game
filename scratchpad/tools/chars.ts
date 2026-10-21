// Saves two idle characters (128x128, feet at 64,120) for the review composites.
import { LEGENDARY_PRESETS } from '../../../../../../home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { renderSprite } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { getAppearance } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/legacy';
import { GRID } from '../../../../../../home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { Canvas } from '../../../../../../home/user/Ninja-Fantasy-Game/tools/world-sprites/kit';
const out = process.argv[2];
const picks = [LEGENDARY_PRESETS.find((p) => p.character.name.startsWith('Solen')) ?? LEGENDARY_PRESETS[0], LEGENDARY_PRESETS.find((p) => !p.character.name.startsWith('Solen')) ?? LEGENDARY_PRESETS[1]];
picks.forEach((p, i) => {
  const f = renderSprite(getAppearance(p.character), 'idle', 0);
  Canvas.fromRgba(GRID, GRID, f.rgba).save(`${out}/char${i}.png`);
  console.log(i, p.character.name);
});
