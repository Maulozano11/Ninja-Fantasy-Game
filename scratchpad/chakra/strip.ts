// usage: npx tsx strip.ts <out.png> <mode> [bg=dark|light] [scale] [colors csv] [ticks csv] [body]
import { writePng, baseLook } from '../tools/sheet';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { renderChakra, CHAKRA_COLORS, ChakraMode } from '/home/user/Ninja-Fantasy-Game/src/sprite/chakra';
import { GRID } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { POSE_FPS, frameCount } from '/home/user/Ninja-Fantasy-Game/src/sprite/rig';
import type { SpritePose, ChakraColorId, BodyType } from '/home/user/Ninja-Fantasy-Game/src/sprite/types';

const [out, mode = 'charge', bgName = 'dark', scaleS = '2', colorsS = '', ticksS = '0,4,8,12,16,20', bodyS = 'male'] = process.argv.slice(2);
const scale = +scaleS;
const colors = (colorsS ? colorsS.split(',') : CHAKRA_COLORS.map((c) => c.id)) as ChakraColorId[];
const ticks = ticksS.split(',').map(Number);
const bodies = bodyS.split(',') as BodyType[];
const pose: SpritePose = mode === 'aura' ? 'idle' : (mode as SpritePose);
const bg = bgName === 'light' ? [214, 222, 228] : bgName === 'mid' ? [96, 110, 104] : [26, 24, 36];
const slots: any = {
  hair: { id: 'hair_sunburst', colors: [] },
  top: { id: 'top_highcollar', colors: [] },
  bottom: { id: 'bottom_shinobi', colors: [] },
  armor: { id: 'armor_flak', colors: [] },
  feet: { id: 'feet_leather', colors: [] },
};
const rows: { color: ChakraColorId; body: BodyType }[] = [];
for (const body of bodies) for (const color of colors) rows.push({ color, body });
const cols = ticks.length;
const W = cols * GRID * scale, H = rows.length * GRID * scale;
const img = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) { img[i * 4] = bg[0]; img[i * 4 + 1] = bg[1]; img[i * 4 + 2] = bg[2]; img[i * 4 + 3] = 255; }
const blend = (j: number, r: number, g: number, b: number, a: number) => {
  const k = a / 255;
  img[j] = img[j] * (1 - k) + r * k; img[j + 1] = img[j + 1] * (1 - k) + g * k; img[j + 2] = img[j + 2] * (1 - k) + b * k;
};
let ms = 0, calls = 0;
rows.forEach((row, ri) => {
  const look = baseLook({ body: row.body, slots });
  ticks.forEach((tick, ci) => {
    const frame = Math.floor((tick * POSE_FPS[pose]) / 12) % frameCount(pose);
    const f = renderSprite(look, pose, frame);
    const t0 = performance.now();
    const fx = renderChakra(row.color, mode as ChakraMode, tick, f.rgba, f.rig);
    ms += performance.now() - t0; calls++;
    const ox = ci * GRID * scale, oy = ri * GRID * scale;
    for (const buf of [fx.back, f.rgba, fx.front])
      for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
        const i = (y * GRID + x) * 4; const a = buf[i + 3]; if (!a) continue;
        for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) blend(((oy + y * scale + sy) * W + ox + x * scale + sx) * 4, buf[i], buf[i + 1], buf[i + 2], a);
      }
    // cell border
    for (let x = 0; x < GRID * scale; x++) { const j = ((oy) * W + ox + x) * 4; img[j] = img[j + 1] = img[j + 2] = 70; }
    for (let y = 0; y < GRID * scale; y++) { const j = ((oy + y) * W + ox) * 4; img[j] = img[j + 1] = img[j + 2] = 70; }
  });
});
writePng(out, W, H, img);
console.log(`wrote ${out} ${W}x${H}; avg renderChakra ${(ms / calls).toFixed(1)}ms`);
