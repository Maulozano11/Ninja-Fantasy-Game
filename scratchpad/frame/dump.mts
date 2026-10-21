// Renders a fixed set of looks x poses x frames from the repo at argv[2], writing the figure's box
// (128 x 128 at BOX, or the whole frame when there is no BOX) to argv[3]/<n>.rgba.
const root = process.argv[2];
const out = process.argv[3];
const { renderSprite } = await import(`${root}/src/sprite/compose.ts`);
const raster = await import(`${root}/src/sprite/raster.ts`);
const { LEGENDARY_PRESETS, DEFAULT_CHARACTER } = await import(`${root}/src/data/shinobiData.ts`);
const { COMPANIONS } = await import(`${root}/src/data/missions.ts`);
const { getAppearance, dojutsuToEye } = await import(`${root}/src/sprite/legacy.ts`);
const { frameCount, rigPoseFor } = await import(`${root}/src/sprite/rig.ts`);
const { writeFileSync } = await import('node:fs');
const GRID = raster.GRID;
const BOX = raster.BOX ?? { x: 0, y: 0, w: 128, h: 128 };
const chars = [DEFAULT_CHARACTER, ...LEGENDARY_PRESETS.map((p: any) => p.character), ...COMPANIONS];
const poses = ['idle', 'handsigns', 'attack', 'cast', 'hurt', 'victory', 'charge', 'walk', 'run', 'crouch', 'sneak', 'downed', 'lean', 'sit', 'read', 'train'];
let n = 0;
for (const c of chars) {
  const look = c.appearance ?? getAppearance(c);
  for (const body of ['male', 'female', 'bulky', 'slender']) {
    if (body !== look.body && c !== chars[0] && c !== chars[3]) continue; // every body only for two characters
    const l = { ...look, body };
    for (const pose of poses) {
      const fc = frameCount(rigPoseFor(pose, l.cast?.style));
      for (let f = 0; f < fc; f += Math.max(1, Math.floor(fc / 3))) {
        const a = renderSprite(l, pose, f, dojutsuToEye(c.dojutsu)).rgba;
        const w = new Uint8Array(128 * 128 * 4);
        for (let y = 0; y < 128; y++) w.set(a.subarray(((BOX.y + y) * GRID + BOX.x) * 4, ((BOX.y + y) * GRID + BOX.x + 128) * 4), y * 512);
        writeFileSync(`${out}/${String(n).padStart(4, '0')}_${(c.name || 'x').replace(/\W+/g, '')}_${body}_${pose}${f}.rgba`, w);
        n++;
      }
    }
  }
}
console.log('frames', n);
