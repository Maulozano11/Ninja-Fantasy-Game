"""The owner's broad man's shirt for the normal male body, in the Roman's style.

His shirt (docs/reference/bulky-owner-reference.jpg, lifted by seam-shirt-from-ref.py) is drawn on his broad
man. Fitted to the normal male by leaving out his columns and rows it looked broken there; the owner
(2026-10-23): "la camisa que trae el ejemplo en hombre normal se ve buggeado copia el estilo que tiene romano y
pasa los colores de pixel a ese y pasa los brazos de romano a ese ya que tambien esta sin mangas". So on the
male the shirt takes the shape and the shading of his Roman (docs/reference/roman-owner-reference.jpg, the
normal male he painted over, lifted by roman_ref.py): his bronze cuirass's chest and its two shoulder guards,
every pixel where he drew it, and the arms below them are the Roman's bare arms (the male body's skin). Onto
that, his shirt's own pixel colours:

  shading  each colour of the Roman's piece takes the shirt colour of the same lightness rank: the Roman's
           pixels sorted from dark to light, his shirt's (torso or sleeve, without his black line or his
           seams) sorted the same way, the k-th darkest of the one giving the colour of the k-th darkest of
           the other. So his chest's relief (the pectorals, the six plates of the belly, the darker sides)
           is drawn in his shirt's blacks and blue-greys, and every colour is one of his shirt's.
  seams    his silver seams (the collar's, the line down the chest, the line under the near pectoral, the
           sides of the belly, the bands at the sleeves' hems) are carried onto the Roman's piece: the
           shirt's piece and the Roman's are each measured along their bone (neck to pelvis, shoulder to
           elbow) and across it, and each seam pixel goes to the same place within the Roman's piece; two
           seam pixels that touch stay joined. A seam stops at the Roman's black line (his relief's lines
           and outline stay); a seam pixel left alone there goes back to the cloth.
  line     the Roman's black line stays as he drew it.

Each piece hangs where the Roman's does (chest from the neck, guards from the shoulders), so the item draws it
as the Bronze Cuirass draws its pieces. It writes src/sprite/items/seamShirtMaleArt.ts and, with a second
argument, a folder for his shirt, the Roman's pieces and the new pieces side by side at 10x. The same
pictures always give the same bytes:

  python3 -I tools/refs/seam-shirt-male-from-ref.py src/sprite/items/seamShirtMaleArt.ts [studyDir]
"""

import importlib.util
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import bulky_ref as B  # noqa: E402
import roman_ref as R  # noqa: E402
from aiden_ref import luma, save  # noqa: E402

_spec = importlib.util.spec_from_file_location('seam_shirt', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'seam-shirt-from-ref.py'))
SHIRT = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(SHIRT)

DOC = (
    "// The owner's broad man's shirt on the normal male, in his Roman's style (tools/refs/seam-shirt-male-from-ref.py\n"
    '// from docs/reference/bulky-owner-reference.jpg and docs/reference/roman-owner-reference.jpg). Generated: rerun\n'
    '// the script to change it.\n'
)

# The Roman's pieces the shirt takes the shape of, the shirt's pieces whose colours and seams go onto each,
# and the bone each is measured along (in the Roman's picture and in the broad man's).
PIECES = [
    ('SHIRT_MALE_GUARD_F', 'guard_f', 'sleeve_f', ('shoulderF', 'elbowF'),
     'The far sleeve: the far shoulder guard of the Roman in the shirt\'s colours, its seam band carried over. It rides the far shoulder.'),
    ('SHIRT_MALE_CHEST', 'chest', 'torso', ('neck', 'pelvis'),
     'The shirt\'s body: the Roman\'s chest in the shirt\'s colours, the shirt\'s seams carried over. It rides the torso about the neck.'),
    ('SHIRT_MALE_GUARD_N', 'guard_n', 'sleeve_n', ('shoulderN', 'elbowN'),
     'The near sleeve: the near shoulder guard of the Roman in the shirt\'s colours, its seam band carried over. It rides the near shoulder.'),
]


def bone(J, a, b):
    """A bone's frame: its start, the unit along it and the unit across it."""
    o = np.array(J[a], float)
    u = np.array(J[b], float) - o
    u /= np.linalg.norm(u)
    return o, u, np.array([-u[1], u[0]])


def extents(mask, frame):
    """How far a piece reaches along and across its bone (pixel centres)."""
    o, u, v = frame
    ys, xs = np.nonzero(mask)
    p = np.stack([xs + 0.5, ys + 0.5], 1) - o
    t, s = p @ u, p @ v
    return t.min(), t.max(), s.min(), s.max()


def mapper(src_mask, src_frame, dst_mask, dst_frame):
    """Each pixel of the shirt's piece to the pixel at the same place within the Roman's piece: as far
    along its bone and across it, each measured from the piece's one end to its other."""
    st0, st1, ss0, ss1 = extents(src_mask, src_frame)
    dt0, dt1, ds0, ds1 = extents(dst_mask, dst_frame)
    so, su, sv = src_frame
    do, du, dv = dst_frame

    def f(x, y):
        p = np.array([x + 0.5, y + 0.5]) - so
        t, s = p @ su, p @ sv
        t2 = dt0 + (t - st0) * (dt1 - dt0) / (st1 - st0)
        s2 = ds0 + (s - ss0) * (ds1 - ds0) / (ss1 - ss0)
        q = do + t2 * du + s2 * dv
        return int(np.floor(q[0])), int(np.floor(q[1]))

    return f


def shading(dst_mask, dst_col, cloth):
    """Each colour of the Roman's piece (not his line) -> the shirt colour of the same lightness rank among
    `cloth` (the shirt's pixels), the rank of a colour of his being the middle of its pixels' ranks."""
    src = sorted((float(luma(c)), R.hexc(c)) for c in cloth)
    his = sorted((float(luma(dst_col[y, x])), R.hexc(dst_col[y, x])) for y, x in zip(*np.nonzero(dst_mask)) if R.kind(dst_col[y, x]) != 'line')
    first, last = {}, {}
    for i, (_, h) in enumerate(his):
        first.setdefault(h, i)
        last[h] = i
    return {h: src[min(len(src) - 1, int((first[h] + last[h] + 1) / 2 / len(his) * len(src)))][1] for h in first}


def rgb(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)])


def transfer(dst_mask, dst_col, src_mask, src_col, f):
    """The Roman's piece in the shirt's colours with the shirt's seams carried over; and each new colour's
    kind ('line', 'cloth', 'seam')."""
    cloth = [src_col[y, x] for y, x in zip(*np.nonzero(src_mask)) if SHIRT.shirt_kind(R.hexc(src_col[y, x])) == 'cloth']
    cmap = shading(dst_mask, dst_col, cloth)
    out = dst_col.copy()
    kinds = {}
    for y, x in zip(*np.nonzero(dst_mask)):
        h = R.hexc(dst_col[y, x])
        if R.kind(dst_col[y, x]) == 'line':
            kinds[h] = 'line'
        else:
            out[y, x] = rgb(cmap[h])
            kinds[cmap[h]] = 'cloth'
    H, W = src_mask.shape
    seam = np.zeros((H, W), bool)
    for y, x in zip(*np.nonzero(src_mask)):
        seam[y, x] = SHIRT.shirt_kind(R.hexc(src_col[y, x])) == 'seam'

    seam_at = np.zeros(dst_mask.shape, bool)
    cloth_at = out.copy()

    def put(x, y, c):
        if 0 <= y < dst_mask.shape[0] and 0 <= x < dst_mask.shape[1] and dst_mask[y, x] and R.kind(dst_col[y, x]) != 'line':
            out[y, x] = c
            seam_at[y, x] = True
            kinds[R.hexc(c)] = 'seam'

    for y, x in zip(*np.nonzero(seam)):
        x2, y2 = f(x, y)
        put(x2, y2, src_col[y, x])
        # Two seam pixels that touch stay joined: the pixels between where they land take the first's colour.
        for dy, dx in ((0, 1), (1, 0), (1, 1), (1, -1)):
            if 0 <= y + dy < H and 0 <= x + dx < W and seam[y + dy, x + dx]:
                x3, y3 = f(x + dx, y + dy)
                n = max(abs(x3 - x2), abs(y3 - y2))
                for k in range(1, n):
                    put(int(round(x2 + (x3 - x2) * k / n)), int(round(y2 + (y3 - y2) * k / n)), src_col[y, x])
    # A seam pixel left alone (its neighbours along the seam fell on the Roman's black line or outside his
    # piece) is no seam: it goes back to the cloth.
    lone = [(y, x) for y, x in zip(*np.nonzero(seam_at)) if not any(seam_at[y + dy, x + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and 0 <= y + dy < seam_at.shape[0] and 0 <= x + dx < seam_at.shape[1])]
    for y, x in lone:
        out[y, x] = cloth_at[y, x]
    return out, kinds


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    S = SHIRT.lift()
    shirt = {'torso': (S['tm'], S['col']), 'sleeve_n': (S['masks']['sleeve_n'], S['a']), 'sleeve_f': (S['masks']['sleeve_f'], S['a'])}
    a = R.native(R.REF)
    masks, cols = R.pieces(a)
    J = R.JOINTS
    new_cols, kinds, consts = {}, {}, []
    for const, his, src, (j0, j1), pdoc in PIECES:
        sm, sc = shirt[src]
        f = mapper(sm, bone(B.JOINTS, j0, j1), masks[his], bone(J, j0, j1))
        new_cols[his], k = transfer(masks[his], cols[his], sm, sc, f)
        kinds.update(k)
        consts.append((const, his, pdoc, J[j0], R.angle(j0, j1) if his != 'chest' else R.angle('pelvis', 'neck')))
    out = [DOC, "import type { PaintedPiece } from '../painted';", '']
    out.append("/** What each colour is: the Roman's black line (never recoloured), the shirt's cloth and its seams (the colour slots). */")
    out.append('export const SHIRT_MALE_KIND: Record<string, string> = {')
    body, rest = [], []
    for const, his, pdoc, pivot, ang in consts:
        rows, origin, palette = R.pack(new_cols[his], masks[his])
        for h in palette.values():
            # pack keeps the first of the colours within 3 of each other: their kind is the first's.
            kinds.setdefault(h, 'cloth')
        body.append(R.ts_piece(const, pdoc, rows, origin, palette, pivot, ang))
        rest.append((const, [origin[i] + R.OFFSET[i] for i in (0, 1)]))
    used = {h for b in body for h in re.findall(r"'(#[0-9a-f]{6})'", b)}
    for h in sorted(used):
        out.append(f"  '{h}': '{kinds[h]}',")
    out += ['};', '']
    out.append("/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */")
    out.append('export const SHIRT_MALE_REST: Record<string, [number, number]> = {')
    for const, (x, y) in rest:
        out.append(f'  {const}: [{x}, {y}],')
    out += ['};', '']
    out += body
    text = '\n'.join(out)
    if out_ts:
        R.write(out_ts, text)
    if study:
        os.makedirs(study, exist_ok=True)
        x0, y0, x1, y1 = 28, 20, 70, 56
        order = ['guard_f', 'chest', 'guard_n']

        def img(cs):
            im = np.full((y1 - y0, x1 - x0, 4), 255, np.uint8)
            for n in order:
                for y, x in zip(*np.nonzero(masks[n])):
                    if y0 <= y < y1 and x0 <= x < x1:
                        im[y - y0, x - x0, :3] = cs[n][y, x]
            return im

        X0, Y0, X1, Y1 = 22, 24, 70, 60
        his = np.full((Y1 - Y0, X1 - X0, 4), 255, np.uint8)
        for m, c in (shirt['sleeve_f'], shirt['torso'], shirt['sleeve_n']):
            for y, x in zip(*np.nonzero(m)):
                if Y0 <= y < Y1 and X0 <= x < X1:
                    his[y - Y0, x - X0, :3] = c[y, x]
        Hh = max(his.shape[0], y1 - y0)
        pad = lambda im: np.pad(im, ((0, Hh - im.shape[0]), (0, 0), (0, 0)), constant_values=255)
        gap = np.zeros((Hh, 2, 4), np.uint8)
        save(np.concatenate([pad(his), gap, pad(img(cols)), gap, pad(img(new_cols))], 1), os.path.join(study, 'shirt-male@10.png'), 10)
    print('pieces', [c[0] for c in consts], 'colours', len(used))


if __name__ == '__main__':
    main()
