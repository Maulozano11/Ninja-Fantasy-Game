// Katana parts in the style of Demon Slayer's nichirin blades: a steel colour, a blade, a guard
// (tsuba) and a hilt (tsuka), each with three versions (a, b, c), built from Japanese sword history,
// culture and religion. The sword is drawn pointing right with its edge down, the pivot on the grip
// just behind the guard. Every part paints its own characters; the black line goes round the whole.

export type Part = 'a' | 'b' | 'c';
export interface KatanaChoice {
  steel: Part;
  blade: Part;
  guard: Part;
  hilt: Part;
  /** Steel 'c' (nichirin): the colour of the wielder's nature. */
  nature?: string;
}

const W = 67;
const H = 25;
const C = 12; // centre row
// x layout
const KASHIRA = [1, 2];
const TSUKA = [3, 17];
const FUCHI = 18;
const TSUBA = [19, 22];
const HABAKI = [23, 24];
const BLADE = [25, 64];
const KISSAKI = 58; // the yokote: where the point begins
const FRONT = 45; // Kogarasu-maru: where the back edge begins

type Grid = string[][];

function grid(): Grid {
  return Array.from({ length: H }, () => Array.from({ length: W }, () => '.'));
}
const put = (g: Grid, x: number, y: number, ch: string) => {
  if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = ch;
};

// --- colour helpers -------------------------------------------------------------------------------
function hex2rgb(h: string): [number, number, number] {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}
function rgb2hex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
function mix(a: string, b: string, t: number): string {
  const A = hex2rgb(a);
  const B = hex2rgb(b);
  return rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}

// --- the blade -------------------------------------------------------------------------------------
/**
 * The blade's rise toward the point (sori): its back rises 3 px and its edge 4, so the two step up at
 * different places and the blade reads as one curve, narrowing a little toward the point.
 */
const tAt = (x: number) => (x - BLADE[0]) / (BLADE[1] - BLADE[0]);
const backY = (x: number) => C - 2 - Math.round(3.2 * tAt(x) ** 1.5);
const edgeY = (x: number) => C + 2 - Math.round(4.3 * tAt(x) ** 1.5);
/** Rows of the blade by width: back, flat, ridge, temper, edge (the middle ones go first). */
const BAND: Record<number, number[]> = { 5: [0, 1, 2, 3, 4], 4: [0, 2, 3, 4], 3: [0, 3, 4], 2: [0, 4], 1: [4] };

/** Rows (0 = the back, 4 = the edge) the blade covers at x: the point narrows from below. */
function bladeRows(x: number, kind: Part): [number, number] {
  if (kind === 'b') {
    // Kogarasu-maru: double-edged at the front, its point in the middle like a spear's.
    const t = BLADE[1] - x;
    if (t >= 3) return [0, 4];
    if (t >= 1) return [1, 3];
    return [2, 2];
  }
  const t = x - KISSAKI;
  if (t < 2) return [0, 4];
  if (t < 4) return [0, 3];
  if (t < 5) return [0, 2];
  if (t < 6) return [0, 1];
  return [0, 0];
}

/** The point (kissaki): the back, the small ridge running to the tip, the temper, the edge. */
function pointCh(x: number, r: number, r1: number): string {
  if (x === BLADE[1]) return 'W';
  if (r === r1) return 'E';
  if (r === 0) return 'M';
  if (x === KISSAKI) return 'k';
  return r === 1 ? 'R' : 'N';
}

function paintBlade(g: Grid, kind: Part): void {
  for (let x = BLADE[0]; x <= BLADE[1]; x++) {
    const [p0, p1] = bladeRows(x, kind);
    const y0 = backY(x);
    const width = edgeY(x) - y0 + 1;
    const band = BAND[Math.max(1, Math.min(5, width))];
    const i = x - BLADE[0];
    // the point's own narrowing (from the edge up, or from both sides for Kogarasu-maru)
    const rows = band.map((r, k) => ({ r, y: y0 + k })).filter(({ r }) => r >= p0 && r <= p1);
    const r0 = rows.length ? rows[0].r : 0;
    const r1 = rows.length ? rows[rows.length - 1].r : 0;
    for (const { r, y } of rows) {
      let ch: string;
      if (kind === 'a') {
        // Shinogi-zukuri with a straight temper line (suguha), the classic blade since the Kamakura
        // period: the back, the flat above the ridge, the ridge catching the light, the tempered band
        // and the bright edge.
        ch = ['M', 'J', 'R', 'N', 'E'][r];
        if (x >= KISSAKI) ch = pointCh(x, r, r1);
        else if (r === 4 && i % 9 === 4) ch = 'W';
      } else if (kind === 'b') {
        // Kogarasu-maru ("little crow"), forged by Amakuni in the 8th century, the bridge between the
        // old straight double-edged sword and the curved tachi: a groove (hi) on its back half, then
        // edged on both sides, the ridge down the middle.
        if (x < FRONT) {
          ch = ['M', 'B', 'b', 'N', 'E'][r];
          if (r === 3 && i % 8 === 5) ch = 'H'; // a gentle wave in the temper (notare)
          if (r === 4 && i % 9 === 4) ch = 'W';
        } else {
          ch = ['E', 'N', 'J', 'N', 'E'][r];
          if (r === r0 && r0 > 0) ch = 'E';
          if (r === r1 && r1 < 4) ch = 'E';
          if (r1 === r0) ch = 'W';
          if ((r === 0 || r === 4) && (i + r) % 7 === 2) ch = 'W';
        }
      } else {
        // Sōshū style after Masamune (Kamakura period): a groove (bo-hi) along the back, a wild
        // temper line (midare) with bright crystals (nie), and Kurikara - Fudō Myōō's sword with the
        // dragon around it - carved by the guard.
        ch = ['M', 'B', 'R', 'N', 'E'][r];
        const wave = [0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0, 0, 1, 0][i % 14];
        if (r === 2 && wave && x < KISSAKI - 1) ch = 'N';
        if (r === 3 && (i % 14 === 3 || i % 14 === 10)) ch = 'H';
        if ((r === 3 || r === 4) && i % 11 === 6) ch = 'W';
        if (x < BLADE[0] + 8 && r === 1) ch = 'J'; // the groove starts past the carving
        if (x >= KISSAKI) ch = pointCh(x, r, r1);
      }
      put(g, x, y, ch);
    }
  }
  if (kind === 'c') {
    // Kurikara: the sword (gold) with the dragon (dark) coiled round it, its head at the point.
    const y0 = backY(BLADE[0]);
    const x0 = BLADE[0] + 1;
    for (let k = 0; k < 5; k++) put(g, x0 + k, y0 + 2, 'G');
    put(g, x0 + 0, y0 + 1, 'g');
    put(g, x0 + 1, y0 + 3, 'g');
    put(g, x0 + 2, y0 + 1, 'g');
    put(g, x0 + 3, y0 + 3, 'g');
    put(g, x0 + 5, y0 + 1, 'G');
    put(g, x0 + 5, y0 + 2, 'g');
  }
}

function paintHabaki(g: Grid): void {
  for (let x = HABAKI[0]; x <= HABAKI[1]; x++)
    for (let y = C - 3; y <= C + 3; y++) put(g, x, y, x === HABAKI[0] ? (y < C ? 'A' : 'a') : y === C - 3 ? 'A' : 'a');
}

// --- the guard (tsuba), seen a little from the side -----------------------------------------------
function paintGuard(g: Grid, kind: Part): void {
  const [x0, x1] = TSUBA;
  const rim = (x: number, y: number, light: boolean) => put(g, x, y, light ? 'U' : 'u');
  const face = (x: number, y: number, light: boolean) => put(g, x, y, light ? 'T' : 't');
  if (kind === 'a' || kind === 'c') {
    // a: Mokkō, four-lobed like a cut melon (a court shape since the Heian period): iron with a gold
    // rim, notched where the lobes meet. c: round (maru), with the triple tomoe of Hachiman, the
    // kami of war, inlaid in gold.
    for (let y = C - 6; y <= C + 6; y++) {
      const d = Math.abs(y - C);
      let a = x0;
      let b = x1;
      if (d === 6) {
        a = x0 + 1;
        b = x1 - 1;
      }
      if (kind === 'a' && d === 3) a = x0 + 1; // the notches between the lobes
      for (let x = a; x <= b; x++) {
        const edge = d === 6 || x === a || (d === 5 && x === x0);
        if (x === x1) face(x, y, false);
        else if (edge) rim(x, y, y < C);
        else face(x, y, y < C - 1 && x === x0 + 1);
      }
    }
    if (kind === 'c') {
      const V = (x: number, y: number, ch = 'V') => put(g, x, y, ch);
      // three commas chasing each other round the centre
      V(x0 + 1, C - 4);
      V(x0 + 2, C - 3);
      V(x0 + 1, C - 3, 'v');
      V(x0 + 2, C);
      V(x0 + 1, C + 1);
      V(x0 + 2, C + 1, 'v');
      V(x0 + 1, C + 3);
      V(x0 + 2, C + 4);
      V(x0 + 1, C + 4, 'v');
    }
  } else {
    // Kaen: flames, the fire round Fudō Myōō that burns away evil (karura-en), licking toward the
    // blade - the guard of a sword that cuts demons.
    for (let y = C - 5; y <= C + 5; y++)
      for (let x = x0; x <= x1; x++) {
        const d = Math.abs(y - C);
        put(g, x, y, d >= 4 ? 'f' : x <= x0 + 1 ? (y < C ? 'F' : 'f') : 'Z');
      }
    // three tongues on each side, curling toward the blade, yellow at the tips
    const tongues: [number, number, string][] = [
      [x0 + 1, C - 6, 'F'],
      [x0 + 2, C - 7, 'F'],
      [x0 + 3, C - 8, 'Z'],
      [x0 + 4, C - 9, 'z'],
      [x0 + 2, C - 6, 'Z'],
      [x0 + 3, C - 7, 'z'],
      [x1 + 1, C - 5, 'Z'],
      [x1 + 2, C - 6, 'z'],
      [x1 + 1, C - 2, 'Z'],
      [x1 + 2, C - 3, 'z'],
      [x0 + 1, C + 6, 'f'],
      [x0 + 2, C + 7, 'f'],
      [x0 + 3, C + 8, 'F'],
      [x0 + 4, C + 9, 'Z'],
      [x0 + 2, C + 6, 'F'],
      [x0 + 3, C + 7, 'Z'],
      [x1 + 1, C + 5, 'F'],
      [x1 + 2, C + 6, 'Z'],
      [x1 + 1, C + 2, 'Z'],
      [x1 + 2, C + 3, 'z'],
    ];
    for (const [x, y, ch] of tongues) put(g, x, y, ch);
    put(g, x0 + 2, C - 2, 'z');
    put(g, x0 + 3, C - 1, 'z');
    put(g, x0 + 2, C + 1, 'z');
  }
  // the collar (fuchi) between the hilt and the guard
  for (let y = C - 3; y <= C + 3; y++) put(g, FUCHI, y, y < C ? 'Y' : 'y');
}

// --- the hilt (tsuka) ------------------------------------------------------------------------------
function paintHilt(g: Grid, kind: Part): void {
  const [x0, x1] = TSUKA;
  if (kind === 'a') {
    // Hineri-maki: silk cord crossed over white ray skin, the diamonds (hishigami) showing it between
    // the crossings, a gold ornament (menuki) under the middle diamond, a black lacquered pommel.
    const P = ['IIiIII', 'IdSSiI', 'dSSSSi', 'IdSSiI', 'IIdIII'];
    for (let x = x0; x <= x1; x++)
      for (let r = 0; r < 5; r++) {
        // whole diamonds from the guard back; the pommel end takes what is left
        const u = (x1 - x + 1) % 6;
        let ch = P[r][5 - u];
        const mid = Math.floor((x1 - x + 1) / 6) === 1;
        if (mid && ch === 'S') ch = r === 2 ? 'Y' : 'y';
        put(g, x, C - 2 + r, ch);
      }
    for (const x of KASHIRA) for (let y = C - 2; y <= C + 2; y++) put(g, x, y, y < C ? 'C' : 'c');
  } else if (kind === 'b') {
    // Tachi of the Heian court: the ray skin bare and white, gold fittings - the helmet-shaped
    // pommel (kabuto-gane), a band and an ornament - and a red silk tassel from the pommel loop.
    for (let x = x0; x <= x1; x++)
      for (let r = 0; r < 5; r++) {
        const node = (x * 3 + r * 5) % 7 === 0;
        let ch = r === 4 ? 's' : node ? 's' : 'S';
        if (x === x0 + 8 && r >= 1 && r <= 3) ch = r === 2 ? 'Y' : 'y';
        if (x === x0 || x === x1) ch = r < 2 ? 'Y' : 'y';
        put(g, x, C - 2 + r, ch);
      }
    for (let y = C - 2; y <= C + 2; y++) {
      put(g, KASHIRA[1], y, y < C ? 'Y' : 'y');
      put(g, KASHIRA[0], y, y === C - 2 || y === C + 2 ? 'y' : y < C ? 'Y' : 'y');
    }
    put(g, 0, C - 1, 'Y');
    put(g, 0, C, 'y');
    put(g, 0, C + 1, 'y');
    // the loop (sarute) and the tassel (fusa) hanging from it
    put(g, 1, C + 3, 'y');
    put(g, 1, C + 4, 'X');
    put(g, 2, C + 5, 'X');
    for (let y = C + 6; y <= C + 9; y++) {
      put(g, 1, y, y === C + 9 ? 'x' : 'X');
      put(g, 2, y, 'x');
      put(g, 3, y, y === C + 9 ? 'x' : 'X');
    }
  } else {
    // Shimenawa: wrapped in a twisted red and white cord like the rope that marks a sacred place at a
    // shrine, and hung with folded paper (shide) that purifies: a blade consecrated against demons.
    for (let x = x0; x <= x1; x++)
      for (let r = 0; r < 5; r++) {
        const band = Math.floor((x - x0 + r) / 2) % 2;
        let ch = band ? 'Q' : 'q';
        if (r === 4) ch = band ? 'w' : 'p';
        put(g, x, C - 2 + r, ch);
      }
    for (const x of KASHIRA) for (let y = C - 2; y <= C + 2; y++) put(g, x, y, y < C ? 'C' : 'c');
    // one strip of shide, folded in a zigzag (two rows to each fold), hanging from the pommel
    for (let k = 0; k < 6; k++) {
      const x = Math.floor(k / 2) % 2 ? 3 : 2;
      put(g, x, C + 3 + k, 'P');
      put(g, x + 1, C + 3 + k, k % 2 ? 'p' : 'P');
    }
  }
}

// --- the outline -------------------------------------------------------------------------------------
function outline(g: Grid): void {
  const add: [number, number][] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (g[y][x] !== '.') continue;
      const n = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ].some(([a, b]) => a >= 0 && a < W && b >= 0 && b < H && g[b][a] !== '.');
      if (n) add.push([x, y]);
    }
  for (const [x, y] of add) g[y][x] = 'o';
}

// --- palettes ------------------------------------------------------------------------------------------
export const NATURES: Record<string, string> = {
  fire: '#e2452b',
  water: '#2f86d9',
  lightning: '#f2c41c',
  wind: '#36b25a',
  earth: '#c48a3c',
};

function steelColors(steel: Part, nature = NATURES.water): Record<string, string> {
  if (steel === 'b') {
    // Kurogane: black steel, rare and of ill omen among slayers; a cold violet sheen on the ridge.
    return { M: '#0b0a10', J: '#1c1924', R: '#5f5870', H: '#272330', N: '#2f2a3a', E: '#9b92ab', W: '#d9d2e3', k: '#4a4458', B: '#08070b', b: '#2a2633' };
  }
  const silver = { M: '#454d5c', J: '#8a94a6', R: '#eef3f9', H: '#aab4c4', N: '#d3dbe6', E: '#f6f9fc', W: '#ffffff', k: '#c4ccd8', B: '#323946', b: '#6b7486' };
  if (steel === 'a') return silver;
  // Nichirin: the blade takes the colour of its wielder's nature, strongest toward the edge.
  return {
    ...silver,
    J: mix(silver.J, nature, 0.3),
    R: mix(nature, '#ffffff', 0.62),
    H: mix(nature, silver.H, 0.35),
    N: nature,
    E: mix(nature, '#ffffff', 0.45),
    W: mix(nature, '#ffffff', 0.8),
    b: mix(silver.b, nature, 0.4),
  };
}

function guardColors(kind: Part): Record<string, string> {
  if (kind === 'b') return { F: '#d8322a', f: '#8e1b1f', Z: '#f28a1e', z: '#ffd34a', Y: '#d9a63a', y: '#8c6420' };
  if (kind === 'c') return { T: '#2a2830', t: '#16151b', U: '#6d6a78', u: '#3f3c47', V: '#e9b84a', v: '#9a6f22', Y: '#d9a63a', y: '#8c6420' };
  return { T: '#3a3640', t: '#1d1b22', U: '#f0c45a', u: '#a5781f', Y: '#d9a63a', y: '#8c6420' };
}

function hiltColors(kind: Part): Record<string, string> {
  if (kind === 'b') return { S: '#efe9da', s: '#bdb4a0', Y: '#e2b043', y: '#94691d', X: '#c8282e', x: '#7c1419' };
  if (kind === 'c') return { Q: '#cf2b2f', q: '#f2ece0', w: '#8a1a1e', p: '#c7bfae', P: '#ffffff', C: '#26232b', c: '#121016' };
  return { I: '#23305a', i: '#4a62a3', d: '#121933', S: '#efe9da', Y: '#f0c14b', y: '#a2771f', C: '#26232b', c: '#121016' };
}

export interface Built {
  rows: string[];
  pivot: [number, number];
  colors: Record<string, string>;
}

export function buildKatana(k: KatanaChoice): Built {
  const g = grid();
  paintHilt(g, k.hilt);
  paintGuard(g, k.guard);
  paintHabaki(g);
  paintBlade(g, k.blade);
  outline(g);
  const colors: Record<string, string> = {
    o: '#0c0a10',
    A: '#f1c766',
    a: '#a57a28',
    G: '#e9b84a',
    g: '#3a2f20',
    ...steelColors(k.steel, k.nature),
    ...hiltColors(k.hilt),
    // the guard's gold collar (fuchi) wins over the hilt's own gold where both use 'Y'/'y'
    ...guardColors(k.guard),
  };
  return { rows: g.map((r) => r.join('')), pivot: [12, C], colors };
}
