import { readFileSync } from 'node:fs';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/src/sprite/compose';
import { GRID } from '/home/user/Ninja-Fantasy-Game/src/sprite/raster';
import { writePng, baseLook } from '../tools/sheet';
// usage: solen.ts out.png mode(ref|grid) [scale] [overrides json]
const [out, mode, sc, extra] = process.argv.slice(2);
const it = (id: string, ...colors: string[]) => ({ id, colors });
const ov = extra ? JSON.parse(extra) : {};
export const SOLEN = (body: any) => baseLook({
  body,
  skin: '#f3c39c', eyeShape: 'sharp', eyeColor: '#d81b2a',
  slots: {
    hair: it('hair_midnight', '#2f3c54'),
    top: it('top_royalcoat', '#1f2a4a', '#e2b04a', '#131a30'),
    bottom: it('bottom_shinobi', '#1f2a4a', '#1f2a4a'),
    armor: it('armor_legion', '#aeb7c2', '#b3202a', '#d4a531'),
    skirt: it('skirt_imperial', '#b3202a', '#6b4226', '#d4a531'),
    feet: it('feet_sandals', '#1f1e26', '#c9a46c'),
    cape: it('cape_shadow', '#2e2d35', '#d9a93a'),
    held: it('held_crystal'),
    ...ov,
  },
  accessories: [it('acc_scarf', '#1f1e26'), it('acc_chest_strap')],
} as any);
const scale = +(sc || 3);
const bg = [236, 236, 240];
if (mode === 'zoom') {
  // zoom: cells "body:pose:frame,..." in env CELLS, crop torso
  const cells = (process.env.CELLS || 'male:idle:0').split(',').map((c) => c.split(':'));
  const X0 = 30, Y0 = 34, CW = 68, CH = 70;
  const W = cells.length * CW * scale, H = CH * scale;
  const buf = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) { buf[i*4] = bg[0]; buf[i*4+1] = bg[1]; buf[i*4+2] = bg[2]; buf[i*4+3] = 255; }
  cells.forEach(([body, pose, fr], c) => {
    const f = renderSprite(SOLEN(body), pose as any, +fr);
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
      const k = ((Y0 + y) * GRID + X0 + x) * 4; if (!f.rgba[k + 3]) continue;
      for (let j = 0; j < scale; j++) for (let i = 0; i < scale; i++) { const o = ((y * scale + j) * W + (c * CW + x) * scale + i) * 4; buf[o] = f.rgba[k]; buf[o+1] = f.rgba[k+1]; buf[o+2] = f.rgba[k+2]; }
    }
  });
  writePng(out, W, H, buf);
} else if (mode === 'ref') {
  const raw = readFileSync('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/main/sample.raw');
  const sw = raw.readUInt16LE(0), sh = raw.readUInt16LE(2);
  const spx = raw.subarray(4);
  const f = renderSprite(SOLEN('male'), 'idle', 0);
  let x0 = GRID, y0 = GRID, x1 = 0, y1 = 0;
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) if (f.rgba[(y * GRID + x) * 4 + 3]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const w = x1 - x0 + 1, h = y1 - y0 + 1, gap = 10;
  const W = (sw + gap + w) * scale, H = Math.max(sh, h) * scale;
  const buf = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) { buf[i*4] = bg[0]; buf[i*4+1] = bg[1]; buf[i*4+2] = bg[2]; buf[i*4+3] = 255; }
  const put = (x: number, y: number, r: number, g: number, b: number) => { for (let j = 0; j < scale; j++) for (let i = 0; i < scale; i++) { const k = ((y * scale + j) * W + x * scale + i) * 4; buf[k] = r; buf[k+1] = g; buf[k+2] = b; } };
  const H0 = Math.max(sh, h);
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { const k = (y * sw + x) * 3; put(x, y + H0 - sh, spx[k], spx[k+1], spx[k+2]); }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const k = ((y0 + y) * GRID + x0 + x) * 4; if (f.rgba[k + 3]) put(sw + gap + x, y + H0 - h, f.rgba[k], f.rgba[k+1], f.rgba[k+2]); }
  writePng(out, W, H, buf);
} else {
  const poses: [string, number][] = [['idle', 0], ['attack', 1], ['cast', 0], ['victory', 0], ['charge', 0], ['hurt', 0], ['handsigns', 0]];
  const bodies = ['male', 'female', 'bulky'];
  const X0 = 8, Y0 = 10, CW = 112, CH = 114;
  const W = poses.length * CW * scale, H = bodies.length * CH * scale;
  const buf = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) { buf[i*4] = bg[0]; buf[i*4+1] = bg[1]; buf[i*4+2] = bg[2]; buf[i*4+3] = 255; }
  bodies.forEach((body, r) => poses.forEach(([pose, fr], c) => {
    const f = renderSprite(SOLEN(body), pose as any, fr);
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
      const k = ((Y0 + y) * GRID + X0 + x) * 4; if (!f.rgba[k + 3]) continue;
      for (let j = 0; j < scale; j++) for (let i = 0; i < scale; i++) { const o = (((r * CH + y) * scale + j) * W + (c * CW + x) * scale + i) * 4; buf[o] = f.rgba[k]; buf[o+1] = f.rgba[k+1]; buf[o+2] = f.rgba[k+2]; }
    }
  }));
  writePng(out, W, H, buf);
}
