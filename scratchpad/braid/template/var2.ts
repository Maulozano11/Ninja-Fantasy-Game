// Renders the female idle (and optionally other poses) zoomed for several braid art variants side by side.
// usage: tsx var.ts variants.json out.png [pose] [body]
import { deflateSync } from 'node:zlib';
import { writeFileSync, readFileSync } from 'node:fs';
function crc32(b: Uint8Array) { let c, r = 0xffffffff; for (let n = 0; n < b.length; n++) { c = (r ^ b[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; r = (r >>> 8) ^ c; } return (r ^ 0xffffffff) >>> 0; }
function chunk(t: string, d: Uint8Array) { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), Buffer.from(d)]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); }
function writePng(p: string, w: number, h: number, rgba: Uint8Array) { const raw = Buffer.alloc((w * 4 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1); } const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6; writeFileSync(p, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', ih), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array())])); }
const variants: any[] = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const pose = process.argv[4] || 'idle';
const body = process.argv[5] || 'female';
const look = { version: 1, body, skin: '#f6d2b4', eyeShape: 'bright', eyeColor: '#3a7bd5', slots: { hair: { id: 'hair_charlotte', colors: ['#f2cb52'] }, top: { id: 'top_highcollar', colors: ['#2c3448'] }, bottom: { id: 'bottom_shinobi', colors: ['#252b3a', '#252b3a'] }, feet: { id: 'feet_sandals', colors: [] } }, accessories: [], headband: { position: 'none', slashed: false, tails: false, emblem: 'crescent', cloth: '#1e3a8a', plate: '#cbd5e1' }, chakra: { color: 'blue', onCharge: true, onCast: true, onVictory: false }, pixelEdits: [] } as any;
const Z = +(process.env.Z || 8), CW = +(process.env.CW || 22), CH = +(process.env.CH || 40), S = 3, SW = 40, SH = 64, DX = +(process.env.DX || 14), DY = +(process.env.DY || 6);
const cellW = CW * Z + SW * S + 16;
const W = variants.length * cellW + 8, H = Math.max(CH * Z, SH * S) + 16;
const o = new Uint8Array(W * H * 4); for (let i = 0; i < W * H; i++) o.set([40, 42, 54, 255], i * 4);
(async () => {
  const { renderSprite } = await import('/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_bed1fab7-89e-3/src/sprite/compose');
  variants.forEach((art, n) => {
    process.env.BRAID_ART = JSON.stringify(art);
    const f = renderSprite(look, pose as any, 0);
    const hx = Math.round(f.rig.head.x * 2), hy = Math.round(f.rig.head.y * 2);
    const put = (x0: number, y0: number, w: number, h: number, z: number, ox: number, oy: number) => {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const sx = x0 + x, sy = y0 + y;
        if (sx < 0 || sy < 0 || sx >= 128 || sy >= 128) continue;
        const i = (sy * 128 + sx) * 4;
        if (!f.rgba[i + 3]) continue;
        for (let j = 0; j < z; j++) for (let q = 0; q < z; q++) o.set([f.rgba[i], f.rgba[i + 1], f.rgba[i + 2], 255], ((oy + y * z + j) * W + ox + x * z + q) * 4);
      }
    };
    const ox = 8 + n * cellW;
    put(hx - DX, hy - DY, CW, CH, Z, ox, 8);
    put(hx - 20, hy - 14, SW, SH, S, ox + CW * Z + 8, 8);
  });
  delete process.env.BRAID_ART;
  writePng(process.argv[3], W, H, o);
})();
