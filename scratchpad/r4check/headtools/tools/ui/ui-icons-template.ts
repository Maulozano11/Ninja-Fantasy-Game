// The owner's skill-icon template: every ability that needs an icon (tools/ui/ui-icons-list.ts)
// as an empty slot in the battle UI kit's skill slot frame, at 3x, with the Spanish name under it,
// grouped (Básicas, Objetos, Jutsu por elemento, Clanes), plus his six painted icons from his
// battle UI reference in a row of their own with the ability each one most likely is.
//
//   UI_OUT=<stagingDir> python3 -I tools/ui/ui-icons-ref.py docs/reference/ui-battle-owner-reference.jpg
//   UI_OUT=<stagingDir> npx tsx tools/ui/ui-icons-template.ts
//
// <stagingDir> is the kit's staging folder (tools/ui/ui-battle-kit.ts): the frame is its
// skill_slot.png and the icon window comes from its manifest.json (a plain frame and the 44 x 44
// window when they are missing). Writes <stagingDir>/icons_template/:
//   ui-icons-template.png   the template
//   ui-icons-list.md        the same list as a table (id, Spanish, English, group, use, notes)
//   ui-icons-list.json      the list with each slot's window in the template (template pixels),
//                           so a painted-over template can be cut back into icons
// With UI_SHEETS=<dir> it also writes <dir>/ui-icons-template.png and <dir>/ui-icons-list.md.
// It refuses to run without UI_OUT. Every file is written under a temporary name and renamed into
// place, and the same inputs always give the same bytes.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Img, RGBA, hex, loadPng, savePng, writeAtomic } from './ui-img';
import { FONTS, FontName, renderText, textWidth } from './ui-font';
import { GROUPS, IconEntry, OWNER_ICONS, buildList } from './ui-icons-list';

if (!process.env.UI_OUT) {
  console.error('ui-icons-template: set UI_OUT to the staging folder (nothing is written to src/ by this tool).');
  process.exit(2);
}
const OUT: string = process.env.UI_OUT;
const DIR = join(OUT, 'icons_template');
const SHEETS = process.env.UI_SHEETS;

// --- the kit's slot ---------------------------------------------------------------------------

const S = 3; // the template shows every screen pixel 3x3
const ICON = 44; // the kit's icon window (screen pixels)

interface Win {
  x: number;
  y: number;
  w: number;
  h: number;
}
function kitSlot(): { frame: Img; win: Win; from: string } {
  const file = join(OUT, 'skill_slot.png');
  let win: Win = { x: 6, y: 6, w: ICON, h: ICON };
  const man = join(OUT, 'manifest.json');
  if (existsSync(man)) {
    const w = JSON.parse(readFileSync(man, 'utf8'))?.pieces?.skill_slot?.window;
    if (w) win = { x: w.x, y: w.y, w: w.w, h: w.h };
  }
  if (existsSync(file)) return { frame: loadPng(file), win, from: 'skill_slot.png of the kit' };
  // No kit yet: a plain bronze frame with the same outer size and window.
  const f = new Img(win.w + 2 * win.x, win.h + 2 * win.y);
  const rim = hex('#a88a58'), lit = hex('#d8bf88'), dark = hex('#3a2c1a');
  f.rect(0, 0, f.w, f.h, rim);
  f.rect(0, 0, f.w, 2, lit);
  f.rect(0, 0, 2, f.h, lit);
  f.rect(win.x - 1, win.y - 1, win.w + 2, win.h + 2, dark);
  for (let y = win.y; y < win.y + win.h; y++) for (let x = win.x; x < win.x + win.w; x++) f.set(x, y, [0, 0, 0, 0]);
  return { frame: f, win, from: 'a plain frame (the kit was not built yet)' };
}
const slot = kitSlot();
if (slot.win.w !== ICON || slot.win.h !== ICON) console.warn(`ui-icons-template: the kit's icon window is ${slot.win.w}x${slot.win.h}, not ${ICON}x${ICON}`);
const FRAME = slot.frame.scaled(S);
const WIN: Win = { x: slot.win.x * S, y: slot.win.y * S, w: slot.win.w * S, h: slot.win.h * S };

// --- colours and text -------------------------------------------------------------------------

const BG = hex('#121016');
const PANEL = hex('#16120c'); // the kit's dark backing under an icon (its manifest: panel #16120c)
const GOLD = hex('#d9b96a');
const CREAM = hex('#ece0c4');
const DIM = hex('#8c8270');
const ROWC = hex('#b9a888');
const RULE = hex('#4a3f2c');

// The fonts have no "ō" (Kōton): the "o" with a bar over it, in this process only.
for (const f of [FONTS.title, FONTS.label] as unknown as { glyphs: Record<string, string[]> }[]) {
  if (f.glyphs['ō']) continue;
  const o = [...f.glyphs.o];
  o[0] = o[0].length === 5 ? '.###.' : '#'.repeat(o[0].length);
  f.glyphs['ō'] = o;
}

const text = (s: string, font: FontName, color: RGBA, k: number): Img => renderText(s, font, { color }).scaled(k);
/** Splits `s` into lines no wider than `max` art pixels (a word longer than that keeps its line). */
function wrap(s: string, font: FontName, max: number): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const word of s.split(' ')) {
    const next = cur ? `${cur} ${word}` : word;
    if (cur && textWidth(next, font) > max) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

// --- layout -----------------------------------------------------------------------------------

const M = 40; // outer margin
const LW = 200; // the row names' column
const CW = 208; // one slot's cell
const COLS = 8;
const W = M + LW + COLS * CW + M;
const LINE2 = 24; // a 2x label line
const SLOT_X = Math.floor((CW - FRAME.w) / 2);

type Op = (img: Img) => void;
const ops: Op[] = [];
let y = M;

function put(t: Img, x: number, yy: number): void {
  ops.push((img) => img.draw(t, x, yy));
}
function putCentered(t: Img, cx: number, yy: number): void {
  put(t, Math.round(cx - t.w / 2), yy);
}
function rule(yy: number): void {
  ops.push((img) => img.rect(M, yy, W - 2 * M, 2, RULE));
}

interface Placed {
  id: string;
  window: [number, number, number, number];
}
const placed: Placed[] = [];

function slotAt(x: number, yy: number, art?: Img): void {
  ops.push((img) => {
    img.rect(x + WIN.x, yy + WIN.y, WIN.w, WIN.h, PANEL);
    if (art) img.draw(art, x + WIN.x, yy + WIN.y);
    img.draw(FRAME, x, yy);
  });
}

/** One row of slots: the row's name on the left, then the cells; returns the row's height. */
function slotRow(rowName: string | null, cells: { art?: Img; lines: { s: string; color: RGBA; k: number }[]; id?: string }[]): void {
  if (rowName) {
    const names = wrap(rowName, 'label', (LW - 24) / 2);
    const top = y + Math.round(FRAME.h / 2 - (names.length * LINE2) / 2);
    names.forEach((s, i) => put(text(s, 'label', ROWC, 2), M, top + i * LINE2));
  }
  let tallest = 0;
  cells.forEach((c, i) => {
    const x = M + LW + i * CW;
    slotAt(x + SLOT_X, y, c.art);
    if (c.id) placed.push({ id: c.id, window: [x + SLOT_X + WIN.x, y + WIN.y, WIN.w, WIN.h] });
    let ly = y + FRAME.h + 6;
    for (const l of c.lines) {
      const t = text(l.s, 'label', l.color, l.k);
      putCentered(t, x + CW / 2, ly);
      ly += l.k === 2 ? LINE2 : 14;
    }
    tallest = Math.max(tallest, ly - y);
  });
  y += tallest + 22;
}

function header(title: string, count: string): void {
  y += 20;
  const t = text(title, 'title', GOLD, 3);
  put(t, M, y);
  put(text(count, 'title', DIM, 3), M + t.w + 18, y);
  y += t.h + 6;
  rule(y);
  y += 22;
}

// --- the list ---------------------------------------------------------------------------------

const list = buildList();
const byId = new Map(list.map((e) => [e.id, e]));
const refOf = new Map(OWNER_ICONS.map((o) => [o.likely, o.pos]));
const counts = GROUPS.map((g) => ({ ...g, n: list.filter((e) => e.group === g.id).length }));

// Title.
put(text('Plantilla de íconos de habilidad', 'title', GOLD, 3), M, y);
y += 44;
for (const [s, c] of [
  [`Cada marco es el marco de habilidad del kit (56 x 56 px en el juego) con su ventana de ${ICON} x ${ICON} px para el ícono. Aquí todo va a 3x.`, CREAM],
  [`Pinta cada ícono dentro de su ventana (${WIN.w} x ${WIN.h} aquí). Las esquinas del marco tapan un poco las puntas. Debajo va el nombre que muestra el juego.`, CREAM],
  [`${list.length} habilidades: ${counts.map((g) => `${g.es} ${g.n}`).join(' · ')}. Al final, tus 6 íconos de la referencia.`, DIM],
] as [string, RGBA][]) {
  put(text(s, 'label', c, 2), M, y);
  y += LINE2 + 4;
}

const nameW = (CW - 12) / 2; // art pixels of a 2x line in a cell
function cellLines(e: IconEntry): { s: string; color: RGBA; k: number }[] {
  const lines = wrap(e.es, 'label', nameW).map((s) => ({ s, color: CREAM, k: 2 }));
  if (e.tag) lines.push(...wrap(e.tag, 'label', nameW).map((s) => ({ s, color: DIM, k: 2 })));
  const ref = refOf.get(e.id);
  if (ref) lines.push({ s: `tu ícono ${ref}`, color: GOLD, k: 2 });
  lines.push({ s: e.id, color: DIM, k: 1 });
  return lines;
}

for (const g of GROUPS) {
  const items = list.filter((e) => e.group === g.id);
  header(g.es, `· ${items.length}`);
  const rows: string[] = [];
  for (const e of items) if (!rows.includes(e.row)) rows.push(e.row);
  for (const r of rows) {
    const inRow = items.filter((e) => e.row === r);
    for (let i = 0; i < inRow.length; i += COLS)
      slotRow(
        i === 0 ? r : null,
        inRow.slice(i, i + COLS).map((e) => ({ id: e.id, lines: cellLines(e) })),
      );
  }
}

// His six icons.
const refDir = join(DIR, 'ref');
header('Tus íconos (referencia)', '· 6');
for (const s of [
  'Recortados de tu imagen de la interfaz (ui-battle-owner-reference.jpg) y puestos en el marco del kit, del mismo tamaño que las ranuras de arriba.',
  'Debajo de cada uno: la habilidad que más probablemente es (en dorado) y otras que podría ser.',
]) {
  put(text(s, 'label', DIM, 2), M, y);
  y += LINE2 + 4;
}
y += 10;
const refCells = OWNER_ICONS.map((o) => {
  const file = join(refDir, `owner_icon_${o.pos}@x3.png`);
  let art: Img | undefined;
  if (existsSync(file)) {
    art = loadPng(file);
    if (art.w !== WIN.w || art.h !== WIN.h) art = art.resized(WIN.w, WIN.h);
  } else console.warn(`ui-icons-template: ${file} missing (run tools/ui/ui-icons-ref.py first); slot ${o.pos} left empty`);
  const likely = byId.get(o.likely)!;
  const lines = [
    ...wrap(`${o.pos}. ${likely.es}`, 'label', nameW).map((s) => ({ s, color: GOLD, k: 2 })),
    ...wrap(o.alt.length ? `o bien: ${o.alt.map((a) => byId.get(a)!.es).join(', ')}` : '', 'label', nameW).map((s) => ({ s, color: DIM, k: 2 })),
  ];
  return { art, lines };
});
slotRow('Tu barra', refCells);
y += M - 22;

// --- draw and write ---------------------------------------------------------------------------

const H = y;
const img = new Img(W, H);
img.fill(BG);
for (const op of ops) op(img);

const md = markdown();
const json = JSON.stringify(
  {
    template: 'ui-icons-template.png',
    size: [W, H],
    scale: S,
    icon: [ICON, ICON],
    frame: slot.from,
    counts: Object.fromEntries(counts.map((g) => [g.id, g.n])),
    entries: list.map((e) => ({ ...e, window: placed.find((p) => p.id === e.id)?.window })),
    ownerIcons: OWNER_ICONS,
  },
  null,
  1,
);

savePng(join(DIR, 'ui-icons-template.png'), img);
writeAtomic(join(DIR, 'ui-icons-list.md'), md);
writeAtomic(join(DIR, 'ui-icons-list.json'), json + '\n');
if (SHEETS) {
  savePng(join(SHEETS, 'ui-icons-template.png'), img);
  writeAtomic(join(SHEETS, 'ui-icons-list.md'), md);
}
console.log(`ui-icons-template: ${list.length} slots (${counts.map((g) => `${g.en} ${g.n}`).join(', ')}) + 6 of his, ${W}x${H} -> ${DIR}${SHEETS ? ` and ${SHEETS}` : ''}`);

function markdown(): string {
  const esc = (s: string) => s.replace(/\|/g, '\\|');
  const out: string[] = [];
  out.push('# Skill icons: the full list');
  out.push('');
  out.push(
    `Every ability that needs a skill icon, in the order of the template \`ui-icons-template.png\`. Built by \`tools/ui/ui-icons-template.ts\` from the game's own tables (jutsu: \`src/data/shinobiData.ts\` and \`src/battle/jutsu.ts\`; buttons and their Spanish labels: \`src/components/battle/BattleScreen.tsx\` and \`battleText.ts\`; clan abilities: phase 1 of \`docs/CLANS_DESIGN.md\`). The hydra's attacks are left out (no ninja uses them).`,
  );
  out.push('');
  out.push(
    `Icon size: ${ICON} x ${ICON} px, the window of the kit's skill slot frame (56 x 56 px on a 1600 x 900 screen). The template shows everything at ${S}x (a ${WIN.w} x ${WIN.h} window per icon). "Spanish name" is the name the game shows: for jutsu that is the button's label (the game has no other Spanish name for them; their tooltip shows the English name).`,
  );
  out.push('');
  out.push(
    'In his bar the four items sit in greyed item slots (the kit\'s `item_slot`, a 40 x 40 window with a dim glyph and the name); the template shows them at the skill icon size like the rest, so one painted icon can serve both. Passives have no button; they are listed because the clan card and the tips can show their icon.',
  );
  out.push('');
  out.push(`**${list.length} icons:** ${counts.map((g) => `${g.en} (${g.es}) ${g.n}`).join(', ')}.`);
  out.push('');
  for (const g of counts) {
    out.push(`## ${g.en} (${g.es}): ${g.n}`);
    out.push('');
    out.push('| # | id | Spanish name | English name | group | row | use | notes |');
    out.push('|---|---|---|---|---|---|---|---|');
    list
      .filter((e) => e.group === g.id)
      .forEach((e, i) => {
        const notes = [e.esButton ? `Button label "${e.esButton}".` : '', e.note ?? '', refOf.has(e.id) ? `Most likely his painted icon ${refOf.get(e.id)}.` : ''].filter(Boolean).join(' ');
        out.push(`| ${i + 1} | \`${e.id}\` | ${esc(e.es)} | ${esc(e.en)} | ${g.es} | ${esc(e.row)} | ${e.use} | ${esc(notes)} |`);
      });
    out.push('');
  }
  out.push('## His painted icons (Tus íconos, referencia)');
  out.push('');
  out.push(
    'The six icons he painted on the action bar of `docs/reference/ui-battle-owner-reference.jpg`, left to right (cropped by `tools/ui/ui-icons-ref.py`). The number is the one on its tag in his picture (they do not run in order there).',
  );
  out.push('');
  out.push('| position | his tag | what he painted | most likely | could also be |');
  out.push('|---|---|---|---|---|');
  for (const o of OWNER_ICONS) {
    const l = byId.get(o.likely)!;
    out.push(`| ${o.pos} | ${o.tag} | ${esc(o.why)} | ${l.es} (\`${l.id}\`) | ${o.alt.map((a) => `${byId.get(a)!.es} (\`${a}\`)`).join(', ') || '-'} |`);
  }
  out.push('');
  return out.join('\n');
}
