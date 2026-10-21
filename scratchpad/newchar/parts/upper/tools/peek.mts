// peek.mts <out.png> <slots-json> <bodies,comma> [poses]: a sheet of renders where pixels of our body's
// skin on the torso, upper arms and forearms (found by rendering twice with two skins) are marked
// green, so skin showing past the clothes stands out. Also prints the count per cell.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { renderSprite } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-4/src/sprite/compose';
import { GRID, PARTS } from '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_1badeb4b-71d-4/src/sprite/raster';

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    let c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Uint8Array): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), Buffer.from(data)]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function writePng(path: string, w: number, h: number, rgba: Uint8Array): void {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array())]));
}

const [out, slotsJ, bodiesJ, posesJ, cropJ] = process.argv.slice(2);
const ALL = 'idle:0,attack:0,attack:1,attack:2,cast:0,hurt:0,victory:0,charge:0,walk:0,walk:1,walk:2,walk:3,run:0,run:1,run:2,run:3,crouch:0,sneak:0,downed:0,sit:0,read:0,train:0,train:2,lean:0,handsigns:0';
const poses = (posesJ || ALL).split(',').map((p) => p.split(':'));
const bodies = bodiesJ.split(',');
const look = (body: string, skin: string) => ({
  version: 1,
  body,
  skin,
  faceShape: 'valiant',
  eyeShape: 'valiant',
  eyeColor: '#d97706',
  slots: JSON.parse(slotsJ),
  accessories: [],
  headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' },
  chakra: { color: 'red', onCharge: false, onCast: false, onVictory: false },
  pixelEdits: [],
});
const watch = new Set(['torso', 'pelvis', 'upperArmN', 'forearmN', 'upperArmF', 'forearmF'].map((p) => PARTS.indexOf(p as never)));
const [x0, y0, x1, y1, kk] = cropJ ? cropJ.split(',').map(Number) : [80, 104, 176, 228, 3];
const cw = x1 - x0;
const ch = y1 - y0;
const k = kk;
const cols = cropJ ? 4 : 7;
const cells = bodies.flatMap((b) => poses.map((p) => [b, p[0], +p[1]] as const));
const rows = Math.ceil(cells.length / cols);
const W = cols * (cw * k + 4) + 4;
const H = rows * (ch * k + 4) + 4;
const img = new Uint8Array(W * H * 4).fill(255);
cells.forEach(([body, pose, frame], n) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = renderSprite(look(body, '#f6bb96') as any, pose as any, frame);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = renderSprite(look(body, '#5aa0f0') as any, pose as any, frame);
  let count = 0;
  const ox = 4 + (n % cols) * (cw * k + 4);
  const oy = 4 + Math.floor(n / cols) * (ch * k + 4);
  for (let y = 0; y < ch; y++)
    for (let x = 0; x < cw; x++) {
      const i = ((y + y0) * GRID + x + x0) * 4;
      let c = [236, 236, 240];
      if (a.rgba[i + 3]) c = [a.rgba[i], a.rgba[i + 1], a.rgba[i + 2]];
      const differs = a.rgba[i] !== b.rgba[i] || a.rgba[i + 1] !== b.rgba[i + 1] || a.rgba[i + 2] !== b.rgba[i + 2];
      if (differs && a.rgba[i + 3] && watch.has(a.part[(y + y0) * GRID + x + x0])) {
        c = [0, 230, 0];
        count++;
        if (process.env.LIST) console.log('  ', x + x0, y + y0, PARTS[a.part[(y + y0) * GRID + x + x0]]);
      }
      for (let yy = 0; yy < k; yy++)
        for (let xx = 0; xx < k; xx++) {
          const j = ((oy + y * k + yy) * W + ox + x * k + xx) * 4;
          img[j] = c[0];
          img[j + 1] = c[1];
          img[j + 2] = c[2];
          img[j + 3] = 255;
        }
    }
  console.log(body, pose, frame, count);
});
writePng(out, W, H, img);
