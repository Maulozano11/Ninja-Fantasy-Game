import { readFileSync, readdirSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
const R = '/home/user/Ninja-Fantasy-Game/.claude/worktrees/wf_e42ad7ec-457-2';
const { tintVfx, VFX_ELEMENTS, vfxTintIsNatural } = await import(R + '/src/sprite/vfxTint.ts');
const { rgbToHsl } = await import(R + '/src/sprite/color.ts');

function readPng(path: string) {
  const buf = readFileSync(path);
  let p = 8, w = 0, h = 0, ct = 0, bd = 0, il = 0;
  const idat: Buffer[] = [];
  while (p < buf.length) {
    const n = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + n);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); bd = data[8]; ct = data[9]; il = data[12]; }
    else if (type === 'IDAT') idat.push(data);
    p += 12 + n;
  }
  if (ct !== 6 || bd !== 8 || il !== 0) throw new Error(`${path}: ct ${ct} bd ${bd} il ${il}`);
  const raw = inflateSync(Buffer.concat(idat));
  const s = w * 4;
  const px = new Uint8Array(s * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (s + 1)];
    for (let x = 0; x < s; x++) {
      const v = raw[y * (s + 1) + 1 + x];
      const a = x >= 4 ? px[y * s + x - 4] : 0;
      const b = y > 0 ? px[(y - 1) * s + x] : 0;
      const c = x >= 4 && y > 0 ? px[(y - 1) * s + x - 4] : 0;
      const q = a + b - c;
      const pred = f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : f === 4 ? (Math.abs(q - a) <= Math.abs(q - b) && Math.abs(q - a) <= Math.abs(q - c) ? a : Math.abs(q - b) <= Math.abs(q - c) ? b : c) : 0;
      px[y * s + x] = (v + pred) & 255;
    }
  }
  return { w, h, rgba: px };
}
const hex = (r: number, g: number, b: number) => `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
const OUTL: Record<string, string[]> = {
  lightning: ['#1c3aa8', '#262268'],
};
const NAT: Record<string, { set: string[]; beast: string[] }> = {
  fire: { set: ['red', 'orange', '#e8321e', '#F27C18'], beast: ['red', 'orange'] },
  water: { set: ['blue', '#36a0f0'], beast: ['blue'] },
  wind: { set: ['green', '#3dbc48'], beast: ['green'] },
  lightning: { set: ['blue'], beast: ['yellow', '#f0c818'] },
  earth: { set: [], beast: [] },
};
const COLS = ['red', 'orange', 'yellow', 'green', 'blue', 'indigo', 'violet', 'white', 'black', '#ff00aa', '#120a08', '#808080', '#000000', '#ffffff', '#f8f8f8', '#2a2a2a'];
const only = process.argv[2];
let totalMs = 0;
for (const el of VFX_ELEMENTS as string[]) {
  if (only && only !== el) continue;
  const dir = `${R}/src/assets/world/vfx_${el}`;
  const man = JSON.parse(readFileSync(`${dir}/manifest.json`, 'utf8'));
  const files: [string, string, boolean, number, number][] = readdirSync(dir).filter((f) => f.endsWith('.png')).map((f) => [f, `${dir}/${f}`, false, man.sprites[f.slice(0, -4)]?.frameW, man.sprites[f.slice(0, -4)]?.frameH]);
  const bm = JSON.parse(readFileSync(`${R}/src/assets/world/vfx_beasts/manifest.json`, 'utf8'));
  files.push([`beast`, `${R}/src/assets/world/vfx_beasts/${el}.png`, true, bm.sprites[el].frameW, bm.sprites[el].frameH]);
  for (const [name, path, beast, fw, fh] of files) {
    const s = readPng(path);
    const sheet = { width: s.w, height: s.h, frameW: fw, frameH: fh, beast };
    const own = NAT[el][beast ? 'beast' : 'set'];
    for (const c of [undefined, ...own, 'brown', 'nope', '#abc']) {
      if (tintVfx(s.rgba, el, c, sheet) !== s.rgba) console.log('NOT IDENTITY', el, name, c);
    }
    const before = s.rgba.slice();
    const issues: string[] = [];
    let worst = 0;
    const darkEdge = new Map<string, number>();
    for (const c of COLS) {
      if (vfxTintIsNatural(el, c, beast)) continue;
      const t0 = performance.now();
      const out = tintVfx(s.rgba, el, c, sheet);
      const dt = performance.now() - t0;
      totalMs += dt;
      worst = Math.max(worst, dt);
      let alpha = 0, outl = 0, changed = 0, transRgb = 0;
      for (let i = 0; i < out.length; i += 4) {
        if (out[i + 3] !== s.rgba[i + 3]) alpha++;
        const same = out[i] === s.rgba[i] && out[i + 1] === s.rgba[i + 1] && out[i + 2] === s.rgba[i + 2];
        if (!s.rgba[i + 3]) { if (!same) transRgb++; continue; }
        if (!same) changed++;
        const hx = hex(s.rgba[i], s.rgba[i + 1], s.rgba[i + 2]);
        if (!same && (OUTL[el] ?? []).includes(hx) && !beast) outl++;
        // dark pixel next to air that changed
        if (!same && c === 'red' && s.rgba[i + 3] >= 200) {
          const l = rgbToHsl(s.rgba[i], s.rgba[i + 1], s.rgba[i + 2])[2];
          const px = (i / 4) % s.w, py = ((i / 4) / s.w) | 0;
          const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const x = px + dx, y = py + dy; return x >= 0 && y >= 0 && x < s.w && y < s.h && s.rgba[(y * s.w + x) * 4 + 3] === 0; });
          if (nb && l < 0.2) darkEdge.set(hx, (darkEdge.get(hx) ?? 0) + 1);
        }
      }
      if (alpha) issues.push(`${c}: alpha changed ${alpha}`);
      if (transRgb) issues.push(`${c}: transparent rgb changed ${transRgb}`);
      if (outl) issues.push(`${c}: palette outline changed ${outl}`);
      if (!changed) issues.push(`${c}: nothing changed`);
    }
    for (let i = 0; i < before.length; i++) if (before[i] !== s.rgba[i]) { issues.push('SOURCE WRITTEN'); break; }
    const de = [...darkEdge.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k}x${v}`).join(' ');
    console.log(`${el}/${name} ${s.w}x${s.h} (${(s.w * s.h / 1e6).toFixed(2)} Mpx) worst ${worst.toFixed(0)} ms ${issues.join('; ')}${de ? ' | dark edge px recoloured (red): ' + de : ''}`);
  }
}
console.log('total ms', totalMs.toFixed(0));
