import { renderSpriteCached } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { getAppearance } from '/home/user/Ninja-Fantasy-Game/src/sprite/legacy';
import { GRID, RES } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { DEFAULT_CHARACTER } from '/home/user/Ninja-Fantasy-Game/src/data/shinobiData';
import { HANA, KENJI } from '/home/user/Ninja-Fantasy-Game/src/data/missions';
for (const c of [DEFAULT_CHARACTER, HANA, KENJI]) {
  const look = getAppearance(c as never);
  for (const pose of ['idle', 'cast'] as const) {
    const s = renderSpriteCached(look, pose, 0);
    const r = s.rig;
    // opaque bbox in torso band
    let minX = 999, maxX = -1, minY = 999, maxY = -1;
    for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (s.rgba[(y * GRID + x) * 4 + 3] > 0) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    const spine = ((r.pelvis.x + r.neck.x) / 2 + 0.5) * RES - 64;
    const head = (r.head.x + 0.5) * RES - 64;
    console.log(c.name, pose, 'grid', GRID, 'spine', spine.toFixed(1), 'head', head.toFixed(1), 'bbox', minX - 64, maxX - 64, 'bboxC', ((minX + maxX) / 2 - 64).toFixed(1), 'y', minY, maxY);
  }
}
console.log('--- centroids');
for (const c of [DEFAULT_CHARACTER, HANA, KENJI]) {
  const look = getAppearance(c as never);
  for (const pose of ['idle', 'cast', 'walk'] as const) {
    const s = renderSpriteCached(look, pose, 0);
    const r = s.rig;
    const y0 = Math.round((r.neck.y + 0.5) * RES), y1 = Math.round((r.pelvis.y + 0.5) * RES) + 20;
    let sw = 0, sx = 0, mn = 999, mx = -1;
    for (let y = y0; y <= y1; y++) for (let x = 0; x < GRID; x++) { const a = s.rgba[(y * GRID + x) * 4 + 3]; if (a > 0) { sw += a; sx += a * x; mn = Math.min(mn, x); mx = Math.max(mx, x); } }
    console.log(c.name, pose, 'band', y0, y1, 'centroid', (sx / sw - 63.5).toFixed(1), 'bandC', ((mn + mx) / 2 - 64).toFixed(1));
  }
}
