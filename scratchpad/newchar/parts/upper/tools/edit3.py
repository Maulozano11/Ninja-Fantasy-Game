p = 'src/sprite/painted.ts'
s = open(p).read()
old = '''export function pieceCover(piece: PaintedPiece, at: Vec, deg: number): Uint8Array {
  const L = new Layer(false);
  const pal: TemplatePalette = {};
  for (const ch of Object.keys(piece.colors)) pal[ch] = [0, 3];
  stampTemplate(L, piece, at, deg - piece.angle, pal, 'none');
  return Uint8Array.from(L.mat, (m) => (m >= 0 ? 1 : 0));
}'''
new = '''export function pieceCover(piece: PaintedPiece, at: Vec, deg: number): Uint8Array {
  const out = new Uint8Array(GRID * GRID);
  const ax = Math.floor(at.x * RES);
  const ay = Math.floor(at.y * RES);
  for (const p of rotateTemplate(piece, deg - piece.angle)) {
    const x = ax + p.dx;
    const y = ay + p.dy;
    if (x >= 0 && y >= 0 && x < GRID && y < GRID) out[y * GRID + x] = 1;
  }
  return out;
}'''
assert old in s
s = s.replace(old, new)
old = '''  const ids = new Set(parts.map(partIndex));
  for (const d of depths) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && ids.has(L.part[i]) && !keep(i, L.part[i])) L.mat[i] = -1;
  }'''
new = '''  const ids = new Uint8Array(256);
  for (const p of parts) ids[partIndex(p)] = 1;
  for (const d of depths) {
    const L = g.L(d);
    if (!L.used) continue;
    for (let i = 0; i < GRID * GRID; i++) if (L.mat[i] >= 0 && ids[L.part[i]] && !keep(i, L.part[i])) L.mat[i] = -1;
  }'''
assert old in s
s = s.replace(old, new)
s = s.replace("import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, Layer, partIndex, PartId, RES, v, Vec } from './raster';",
              "import { F_NO_OUTLINE, F_NO_TEXTURE, GRID, Layer, partIndex, PartId, RES, v, Vec } from './raster';")
s = s.replace("import { PixelTemplate, stampTemplate, TemplatePalette } from './rotsprite';",
              "import { PixelTemplate, rotateTemplate, stampTemplate, TemplatePalette } from './rotsprite';")
open(p, 'w').write(s)

p = 'src/sprite/items/armor.ts'
s = open(p).read()
old = '''    if (Math.abs(det) < 1e-9) break;
    u -= (rx * wy - ry * wx) / det;
    w -= (ux * ry - uy * rx) / det;
  }
  return [u, w];'''
new = '''    if (Math.abs(det) < 1e-9) break;
    const du = (rx * wy - ry * wx) / det;
    const dw = (ux * ry - uy * rx) / det;
    u -= du;
    w -= dw;
    if (Math.abs(du) + Math.abs(dw) < 1e-12) break;
  }
  return [u, w];'''
assert old in s
s = s.replace(old, new)
open(p, 'w').write(s)
