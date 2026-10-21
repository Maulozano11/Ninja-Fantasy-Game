// The owner's sample: his elemental jutsu effects in every chakra colour (src/sprite/vfxTint.ts).
// Nothing goes into the game: this only writes pictures next to this script. No chakra burst
// (aura) anywhere: the owner asked for the jutsu colour without it.
//
// Run from the worktree root:  npx tsx <this folder>/make.mts
// 1. Recolours the frames with the game's own module and writes them (1x PNG) into work/frames/,
//    with a plan (work/plan.json).
// 2. Runs compose.py (Pillow), which lays them out with Spanish labels:
//    muestra-<elemento>-<n>.png, destacados.png, en-el-mapa-<n>.png and the GIFs.

import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const HERE = dirname(fileURLToPath(import.meta.url));
const WORK = join(HERE, 'work');
const FRAMES = join(WORK, 'frames');
const imp = (p: string) => import(pathToFileURL(join(ROOT, p)).href);

const { tintVfx, vfxTintIsNatural } = await imp('src/sprite/vfxTint.ts');
const { writePng } = await imp('tools/world-sprites/kit.ts');
const { CHAKRA_COLORS } = await imp('src/sprite/chakra.ts');
const { renderSprite } = await imp('src/sprite/compose.ts');
const { LEGENDARY_PRESETS } = await imp('src/data/shinobiData.ts');
const { dojutsuToEye } = await imp('src/sprite/legacy.ts');
const { GRID } = await imp('src/sprite/raster.ts');
const { FEET } = await imp('src/sprite/rig.ts');

type El = 'fire' | 'water' | 'wind' | 'lightning' | 'earth';

// --- PNG ----------------------------------------------------------------------------------

function readPng(path: string): { w: number; h: number; rgba: Uint8Array } {
  const buf = readFileSync(path);
  let p = 8;
  let w = 0;
  let h = 0;
  let ct = 6;
  const idat: Buffer[] = [];
  while (p < buf.length) {
    const n = buf.readUInt32BE(p);
    const type = buf.toString('ascii', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + n);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      if (data[8] !== 8 || data[12] !== 0) throw new Error(`${path}: only 8-bit non-interlaced PNG`);
      ct = data[9];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + n;
  }
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : 0;
  if (!bpp) throw new Error(`${path}: colour type ${ct}`);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const px = new Uint8Array(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x];
      const a = x >= bpp ? px[y * stride + x - bpp] : 0;
      const b = y > 0 ? px[(y - 1) * stride + x] : 0;
      const c = x >= bpp && y > 0 ? px[(y - 1) * stride + x - bpp] : 0;
      let r = v;
      if (f === 1) r = v + a;
      else if (f === 2) r = v + b;
      else if (f === 3) r = v + ((a + b) >> 1);
      else if (f === 4) {
        const q = a + b - c;
        const pa = Math.abs(q - a);
        const pb = Math.abs(q - b);
        const pc = Math.abs(q - c);
        r = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      }
      px[y * stride + x] = r & 255;
    }
  }
  if (bpp === 4) return { w, h, rgba: px };
  const rgba = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) rgba.set([px[i * 3], px[i * 3 + 1], px[i * 3 + 2], 255], i * 4);
  return { w, h, rgba };
}

// --- sheets and frames ----------------------------------------------------------------------

const sheets = new Map<string, { w: number; h: number; rgba: Uint8Array }>();
const manifests = new Map<string, any>();
function spec(group: string, name: string) {
  if (!manifests.has(group)) manifests.set(group, JSON.parse(readFileSync(join(ROOT, 'src/assets/world', group, 'manifest.json'), 'utf8')).sprites);
  return manifests.get(group)[name];
}
function sheet(group: string, name: string) {
  const key = `${group}/${name}`;
  if (!sheets.has(key)) sheets.set(key, readPng(join(ROOT, 'src/assets/world', group, spec(group, name).file)));
  return sheets.get(key)!;
}
/** One frame cut from its sheet: the game recolours the big sheets a frame at a time too. */
function cut(group: string, name: string, anim: string, f: number): { w: number; h: number; rgba: Uint8Array } {
  const s = spec(group, name);
  const sh = sheet(group, name);
  const row = s.anims[anim].row;
  const { frameW: w, frameH: h } = s;
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) out.set(sh.rgba.subarray(((row * h + y) * sh.w + f * w) * 4, ((row * h + y) * sh.w + f * w + w) * 4), y * w * 4);
  return { w, h, rgba: out };
}

/** One effect: an element's sprite (or its beast). */
interface Fx {
  el: El;
  sprite?: string;
  beast?: boolean;
  anim: string;
}
const groupOf = (fx: Fx) => (fx.beast ? 'vfx_beasts' : `vfx_${fx.el}`);
const nameOf = (fx: Fx) => (fx.beast ? fx.el : fx.sprite!);
const sheetOf = (fx: Fx) => ({ beast: !!fx.beast, sprite: fx.beast ? undefined : fx.sprite });
const natural = (fx: Fx, color: string) => vfxTintIsNatural(fx.el, color, sheetOf(fx));

let written = 0;
/** Writes one frame of an effect in a colour ('orig' = his) and returns its file. */
function frameFile(fx: Fx, f: number, color: string): string {
  const g = groupOf(fx);
  const n = nameOf(fx);
  const file = join(FRAMES, `${g}.${n}.${fx.anim}.${f}.${color.replace('#', 'x')}.png`);
  const fr = cut(g, n, fx.anim, f);
  const rgba = color === 'orig' ? fr.rgba : tintVfx(fr.rgba, fx.el, color, { width: fr.w, height: fr.h, ...sheetOf(fx) });
  if (color !== 'orig' && natural(fx, color) && rgba !== fr.rgba) throw new Error(`${g}/${n} ${color}: natural but changed`);
  writePng(file, fr.w, fr.h, rgba);
  written++;
  return file;
}
function fxInfo(fx: Fx) {
  const s = spec(groupOf(fx), nameOf(fx));
  return { frameW: s.frameW, frameH: s.frameH, anchor: s.anchor, frames: s.anims[fx.anim].frames, fps: s.anims[fx.anim].fps };
}

// --- colours, with their Spanish names ---------------------------------------------------------

const ES: Record<string, string> = { red: 'Rojo', orange: 'Naranja', yellow: 'Amarillo', green: 'Verde', blue: 'Azul', indigo: 'Índigo', violet: 'Violeta', white: 'Blanco', black: 'Negro', brown: 'Marrón' };
const COLORS: [string, string][] = CHAKRA_COLORS.map((c: any) => [c.id, ES[c.id]]);
const HEX: Record<string, string> = Object.fromEntries(CHAKRA_COLORS.map((c: any) => [c.id, c.hex]));
const lower = (es: string) => es.toLowerCase();
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`);

// --- 1. the sheets per element ---------------------------------------------------------------

interface Col extends Fx {
  label: string;
  frame: number;
}
/** A page: rows = colours, columns = effects; or a grid of one big effect, one cell per colour. */
interface Page {
  file: string;
  title: string;
  mode: 'rows' | 'grid';
  cols: Col[];
  notes: string[];
}
const fx = (el: El, label: string, sprite: string, anim: string, frame: number, beast = false): Col => ({ el, label, sprite: beast ? undefined : sprite, beast, anim, frame });
const FIRE_NOTE = 'Tu contorno oscuro y el humo no cambian de color.';
const WATER_NOTE = 'Tu contorno oscuro no cambia de color.';
const PAGES: Page[] = [
  {
    file: 'muestra-fuego-1.png',
    title: 'FUEGO (1 de 3)',
    mode: 'rows',
    cols: [fx('fire', 'Proyectil', 'bolt', 'fly', 3), fx('fire', 'Impacto', 'hit', 'hit', 4), fx('fire', 'Aliento', 'breath', 'fly', 3), fx('fire', 'Fénix', '', 'fly', 2, true)],
    notes: [FIRE_NOTE],
  },
  {
    file: 'muestra-fuego-2.png',
    title: 'FUEGO (2 de 3)',
    mode: 'rows',
    cols: [fx('fire', 'Bola de fuego', 'fireball', 'fly', 3), fx('fire', 'Explosión', 'blast', 'blast', 7), fx('fire', 'Muro', 'wall', 'idle', 2)],
    notes: [FIRE_NOTE],
  },
  { file: 'muestra-fuego-3.png', title: 'FUEGO (3 de 3): Aniquilación', mode: 'grid', cols: [fx('fire', 'Aniquilación', 'annihilation', 'burn', 2)], notes: ['Un cuadro de la animación, a tamaño real (1x).', FIRE_NOTE] },
  {
    file: 'muestra-agua-1.png',
    title: 'AGUA (1 de 2)',
    mode: 'rows',
    cols: [fx('water', 'Proyectil', 'bolt', 'fly', 3), fx('water', 'Impacto', 'hit', 'hit', 4), fx('water', 'Chorro', 'stream_head', 'fly', 2), fx('water', 'Dragón de agua', '', 'fly', 2, true)],
    notes: ['La espuma más clara queda casi blanca en todos los colores.', WATER_NOTE],
  },
  { file: 'muestra-agua-2.png', title: 'AGUA (2 de 2)', mode: 'rows', cols: [fx('water', 'Géiser', 'blast', 'blast', 7), fx('water', 'Muro', 'wall', 'idle', 2)], notes: [WATER_NOTE] },
  {
    file: 'muestra-viento-1.png',
    title: 'VIENTO (1 de 2)',
    mode: 'rows',
    cols: [fx('wind', 'Proyectil', 'bolt', 'fly', 3), fx('wind', 'Impacto', 'hit', 'hit', 4), fx('wind', 'Esfera', 'sphere', 'fly', 2), fx('wind', 'Grulla', '', 'fly', 2, true)],
    notes: ['El viento sigue pálido y suave en todos los colores.', 'El contorno verde azulado de la grulla es tu línea y no cambia.'],
  },
  { file: 'muestra-viento-2.png', title: 'VIENTO (2 de 2)', mode: 'rows', cols: [fx('wind', 'Tornado', 'blast', 'blast', 7), fx('wind', 'Muro', 'wall', 'idle', 2)], notes: ['Tu contorno oscuro y el polvo bajo el muro no cambian de color.'] },
  {
    file: 'muestra-rayo-1.png',
    title: 'RAYO (1 de 3)',
    mode: 'rows',
    cols: [fx('lightning', 'Proyectil', 'bolt', 'fly', 3), fx('lightning', 'Impacto', 'hit', 'hit', 4), fx('lightning', 'Descarga', 'breath', 'fly', 3), fx('lightning', 'Muro', 'wall', 'idle', 2)],
    notes: ['Tu contorno azul del rayo es tu línea: no cambia en ningún color.'],
  },
  { file: 'muestra-rayo-2.png', title: 'RAYO (2 de 3): el sabueso', mode: 'rows', cols: [fx('lightning', 'Sabueso del rayo', '', 'fly', 2, true)], notes: ['El sabueso es amarillo; su contorno café es tu línea y no cambia.'] },
  { file: 'muestra-rayo-3.png', title: 'RAYO (3 de 3): el rayo que cae', mode: 'grid', cols: [fx('lightning', 'Rayo', 'blast', 'blast', 5)], notes: ['El cuadro del destello, al 2x.'] },
  { file: 'muestra-kirin.png', title: 'RAYO: Kirin', mode: 'grid', cols: [fx('lightning', 'Kirin', 'kirin', 'impact', 0)], notes: ['El cuadro del impacto, a tamaño real (1x).', 'La nube de tormenta es nube: queda casi como tu dibujo.'] },
  {
    file: 'muestra-tierra-1.png',
    title: 'TIERRA (1 de 2)',
    mode: 'rows',
    cols: [fx('earth', 'Proyectil', 'bolt', 'fly', 3), fx('earth', 'Impacto', 'hit', 'hit', 4), fx('earth', 'Lanzas', 'stream_head', 'fly', 2), fx('earth', 'Explosión', 'blast', 'blast', 7)],
    notes: ['El polvo (lo semitransparente), el musgo y tu contorno no cambian: solo la roca.'],
  },
  { file: 'muestra-tierra-2.png', title: 'TIERRA (2 de 2)', mode: 'rows', cols: [fx('earth', 'Muro', 'wall', 'idle', 2), fx('earth', 'Dragón de piedra', '', 'fly', 2, true)], notes: ['Los ojos amarillos del dragón y el musgo no cambian.'] },
];

rmSync(FRAMES, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });
// The pictures of the last run go; this run writes them all again.
for (const f of readdirSync(HERE)) if (/\.(png|gif)$/.test(f)) rmSync(join(HERE, f));
const plan: any = { out: HERE, frames: FRAMES, root: ROOT, hex: HEX, pages: [], destacados: [], mapas: [], gifs: [] };

for (const pg of PAGES) {
  // A row (or cell) for every colour that changes at least one effect on the page.
  const rows = COLORS.filter(([id]) => pg.cols.some((c) => !natural(c, id)));
  const same = COLORS.filter(([id]) => !rows.some(([r]) => r === id)).map(([, es]) => lower(es));
  const head = `Sin color (Natural) queda tu dibujo, sin tocar ni un píxel${same.length ? `; con ${list(same)}, también` : ''}.`;
  const notes = [head, ...pg.notes];
  if (pg.cols.every((c) => c.el === 'earth')) notes.splice(1, 0, 'Marrón es el color del chakra de Tierra.');
  plan.pages.push({
    file: pg.file,
    title: pg.title,
    mode: pg.mode,
    notes,
    rows: [['orig', 'Tu dibujo'], ...rows],
    cols: pg.cols.map((c) => ({
      label: c.label,
      info: fxInfo(c),
      cells: Object.fromEntries([['orig', frameFile(c, c.frame, 'orig')], ...rows.filter(([id]) => !natural(c, id)).map(([id]) => [id, frameFile(c, c.frame, id)])]),
      natural: rows.filter(([id]) => natural(c, id)).map(([id]) => id),
    })),
  });
}

// --- 2. highlights: his drawing and the new colour, no aura -----------------------------------------

const HIGHLIGHTS: (Fx & { title: string; frame: number; color: string })[] = [
  { title: 'Bola de fuego en verde', el: 'fire', sprite: 'fireball', anim: 'fly', frame: 3, color: 'green' },
  { title: 'Dragón de agua en rojo', el: 'water', beast: true, anim: 'fly', frame: 2, color: 'red' },
  { title: 'Tornado en violeta', el: 'wind', sprite: 'blast', anim: 'blast', frame: 7, color: 'violet' },
  { title: 'Muro de tierra en blanco', el: 'earth', sprite: 'wall', anim: 'idle', frame: 2, color: 'white' },
  { title: 'Rayo en negro', el: 'lightning', sprite: 'blast', anim: 'blast', frame: 5, color: 'black' },
];
for (const h of HIGHLIGHTS) plan.destacados.push({ title: h.title, es: ES[h.color], color: h.color, info: fxInfo(h), orig: frameFile(h, h.frame, 'orig'), tinted: frameFile(h, h.frame, h.color) });

// --- 3. on the battle map, at the game's scale -------------------------------------------------

const presetChar = (id: string) => LEGENDARY_PRESETS.find((p: any) => p.character.id === id)!.character;
/** A character frame (GRID x GRID), no chakra burst. */
function character(id: string, pose: string, frame: number, mirror = false): { w: number; h: number; rgba: Uint8Array; feet: [number, number] } {
  const c = presetChar(id);
  const spr = renderSprite(c.appearance, pose, frame, dojutsuToEye(c.dojutsu));
  const out = new Uint8Array(spr.rgba);
  if (mirror) {
    const m = new Uint8Array(out.length);
    for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) m.set(out.subarray((y * GRID + x) * 4, (y * GRID + x) * 4 + 4), (y * GRID + (GRID - 1 - x)) * 4);
    return { w: GRID, h: GRID, rgba: m, feet: [GRID - 1 - FEET.x, FEET.y] };
  }
  return { w: GRID, h: GRID, rgba: out, feet: [FEET.x, FEET.y] };
}
{
  const map = JSON.parse(readFileSync(join(ROOT, 'src/assets/maps/river_forest/map.json'), 'utf8'));
  const at = (x: number, z: number) => [Math.round(x * map.pxPerM), Math.round(map.backY + z * map.pxPerMDepth)];
  let tag = 0;
  const char = (id: string, pose: string, frame: number, x: number, z: number, mirror: boolean) => {
    const c = character(id, pose, frame, mirror);
    const file = join(FRAMES, `char.${tag++}.png`);
    writePng(file, c.w, c.h, c.rgba);
    const [X, Y] = at(x, z);
    return { file, X, Y, ax: c.feet[0], ay: c.feet[1], ground: Y };
  };
  /** An effect frame placed by its anchor at (x, z), `lift` px above the ground (things that fly). */
  const put = (f: Fx, frame: number, color: string, x: number, z: number, lift: number, label: string) => {
    const info = fxInfo(f);
    const [X, Y] = at(x, z);
    return { file: frameFile(f, frame, color), X, Y: Y - lift, ax: info.anchor[0], ay: info.anchor[1], ground: Y, label };
  };
  const fireball: Fx = { el: 'fire', sprite: 'fireball', anim: 'fly' };
  // Left: grass and the dirt path. Aiden (the owner's knight) and Akira against Ren.
  plan.mapas.push({
    file: 'en-el-mapa-1.png',
    title: 'En el mapa (1 de 2): pasto y camino de tierra',
    crop: [at(2, 0)[0], at(0, 4.5)[1], at(17, 0)[0], at(0, 17.5)[1]],
    chars: [char('preset_reference_aiden', 'cast', 2, 4.2, 9.5, false), char('preset_ember', 'idle', 0, 5, 15.5, false), char('preset_night', 'hurt', 1, 15.6, 9, true)],
    fx: [
      put(fireball, 3, 'green', 9.2, 9.5, 52, 'Bola de fuego · verde'),
      put({ el: 'earth', sprite: 'wall', anim: 'idle' }, 2, 'white', 9.5, 13.2, 0, 'Muro de tierra · blanco'),
      put({ el: 'wind', sprite: 'blast', anim: 'blast' }, 7, 'violet', 14.9, 16.6, 0, 'Tornado · violeta'),
    ],
  });
  // Right: the river and the dark back of the forest.
  plan.mapas.push({
    file: 'en-el-mapa-2.png',
    title: 'En el mapa (2 de 2): el río y su sombra',
    crop: [at(18.4, 0)[0], at(0, -2.2)[1], at(34.2, 0)[0], at(0, 16.8)[1]],
    chars: [char('preset_reference_aiden', 'cast', 2, 20.2, 11.8, false), char('preset_night', 'hurt', 1, 33.2, 12.6, true)],
    fx: [
      put({ el: 'lightning', sprite: 'blast', anim: 'blast' }, 5, 'black', 29.4, 14.2, 0, 'Rayo · negro'),
      put(fireball, 3, 'black', 27.6, 10.2, 62, 'Bola de fuego · negro'),
      put({ el: 'water', beast: true, anim: 'fly' }, 2, 'red', 28.6, 4.6, 30, 'Dragón de agua · rojo'),
      put({ el: 'fire', sprite: 'wall', anim: 'idle' }, 2, 'white', 21.6, 5.4, 0, 'Muro de fuego · blanco'),
    ],
  });
}

// --- 4. animations: his and the new colour side by side -----------------------------------------

const seq = (f: Fx, color: string, loops = 1) => {
  const info = fxInfo(f);
  const files = Array.from({ length: info.frames }, (_, i) => frameFile(f, i, color));
  return { files: Array.from({ length: loops }, () => files).flat(), fps: info.fps, info };
};
const gif = (file: string, title: string, es: string, parts: { fx: Fx; loops: number }[], color: string) => ({
  file,
  title,
  es,
  parts: parts.map((p) => ({ orig: seq(p.fx, 'orig', p.loops), tinted: seq(p.fx, color, p.loops) })),
});
plan.gifs.push(gif('fuego-verde.gif', 'Bola de fuego en verde', 'Verde', [{ fx: { el: 'fire', sprite: 'fireball', anim: 'fly' }, loops: 2 }, { fx: { el: 'fire', sprite: 'fireball', anim: 'burst' }, loops: 1 }], 'green'));
plan.gifs.push(gif('rayo-negro.gif', 'Rayo en negro', 'Negro', [{ fx: { el: 'lightning', sprite: 'blast', anim: 'blast' }, loops: 1 }], 'black'));
plan.gifs.push(gif('agua-roja.gif', 'Dragón de agua en rojo', 'Rojo', [{ fx: { el: 'water', beast: true, anim: 'fly' }, loops: 2 }, { fx: { el: 'water', sprite: 'hit', anim: 'hit' }, loops: 1 }], 'red'));

writeFileSync(join(WORK, 'plan.json'), JSON.stringify(plan, null, 1));
console.log(`${written} frames written`);
execFileSync('python3', ['-I', join(HERE, 'compose.py'), join(WORK, 'plan.json')], { stdio: 'inherit' });
