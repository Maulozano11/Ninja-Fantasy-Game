"""The owner's broad man's shirt for the normal male body, in the Roman's style.

His shirt (docs/reference/bulky-owner-reference.jpg, lifted by seam-shirt-from-ref.py) is drawn on his broad
man. Fitted to the normal male by leaving out his columns and rows it looked broken there; the owner
(2026-10-23): "la camisa que trae el ejemplo en hombre normal se ve buggeado copia el estilo que tiene romano y
pasa los colores de pixel a ese y pasa los brazos de romano a ese ya que tambien esta sin mangas". Then, on the
first try (the Roman's chest and shoulder guards): "quitale la hombrera y solo ponle la camisa pegada al cuerpo
base", "si quiero el cuello alto de la camisa", and "si tiene mangas la camisa no te confundas simplemente es una
camisa pegada al cuerpo entonces se ve como la musculatura del cuerpo bien definida pero del color y con las
detalles de la camisa". So on the male the shirt takes the shape and the shading of his Roman
(docs/reference/roman-owner-reference.jpg, the normal male he painted over, lifted by roman_ref.py and
roman-skin-from-ref.py), with no shoulder guard:

  chest    his bronze cuirass's chest, every pixel where he drew it; under his far shoulder guard its right
           line runs on down the column it runs above and below the guard, the cells beside it taking his
           colour from the chest below (as roman_ref continues it under the near guard)
  collar   the broad man's high collar, every pixel his (his rows round the neck, his neck on the Roman's),
           in place of the Roman's neckline up to the collar's far end on each row
  sleeves  the Roman's upper arms (his skin pieces, his muscle shading) where the broad man's sleeve covers
           the arm: each cell measured along the arm from the shoulder (a share of the upper arm's length)
           and across it (a share of its width) in both pictures; over his sleeve's cloth it is the sleeve,
           down to his hem; every cell of the arm above the hem is the sleeve's

and onto that, his shirt's own pixel colours:

  shading  each colour of the Roman's piece takes the shirt colour of the same lightness rank: the Roman's
           pixels sorted from dark to light, his shirt's (torso or sleeve, without his black line or his
           seams) sorted the same way, the k-th darkest of the one giving the colour of the k-th darkest of
           the other. So the chest's relief (the pectorals, the six plates of the belly, the darker sides)
           and the arms' muscles are drawn in his shirt's blacks and blue-greys, and every colour is one of
           his shirt's.
  seams    his silver seams (the line down the chest, the line under the near pectoral, the sides of the
           belly) are carried onto the Roman's chest: the shirt's piece and the Roman's are each measured
           along the bone (neck to pelvis) and across it, and each seam pixel goes to the same place within
           the Roman's piece; two seam pixels that touch stay joined. A seam stops at the Roman's black line
           (his relief's lines and outline stay); a seam pixel left alone there goes back to the cloth. On
           the sleeves a cell over his seams or his black line (the band and the line at his hem) takes his
           colour there.
  line     the Roman's black line stays as he drew it; the chest's open edge (where it was cut from his
           guards and arms) is marked (PaintedPiece.seal), closed with the line in a pose that bares it.

The chest hangs where the Roman's does (from the neck), so the item draws it as the Bronze Cuirass draws its
chest; each sleeve turns with our upper arm about the shoulder, as his skin does, and recolours our arm
(src/sprite/items/brawler.ts). It writes src/sprite/items/seamShirtMaleArt.ts and, with a second argument, a
folder for his shirt, the Roman's chest and arms and the new shirt side by side at 10x. The same pictures
always give the same bytes:

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
_spec = importlib.util.spec_from_file_location('roman_skin', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'roman-skin-from-ref.py'))
SKIN = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(SKIN)

DOC = (
    "// The owner's broad man's shirt on the normal male, in his Roman's style (tools/refs/seam-shirt-male-from-ref.py\n"
    '// from docs/reference/bulky-owner-reference.jpg and docs/reference/roman-owner-reference.jpg). Generated: rerun\n'
    '// the script to change it.\n'
)

# The Roman's chest under his far shoulder guard: rows (first, last) and the column his right line runs down.
FAR_HIDDEN = (27, 36)
FAR_EDGE = 60
# His high collar: his rows (first, last) and columns (first, last) round the neck in his broad man's
# picture, and how far they move onto the Roman's (his neck's columns are the Roman's, a row lower).
COLLAR = (26, 30, 43, 58)
COLLAR_SHIFT = (0, -1)

CHEST_DOC = "The shirt's body: the Roman's chest in the shirt's colours, the shirt's seams carried over, his high collar round the neck. It rides the torso about the neck."
SLEEVE_DOC = "The {side} sleeve, skin-tight: the Roman's {side} upper arm (his skin piece) where the broad man's sleeve covers the arm, his muscle shading in the shirt's colours, the band and line at the hem. It recolours our upper arm, turned with it about the shoulder."


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


def chest_under_far_guard(a, mask, col):
    """The Roman's chest under his far shoulder guard (FAR_HIDDEN rows): its right line goes on at FAR_EDGE,
    as it runs above and below the guard, and each cell between takes his colour from the first chest pixel
    below it. Returns the mask and colours."""
    m, c = mask.copy(), col.copy()
    black = R.his_line(a)
    solid = m & np.array([[R.kind(c[y, x]) != 'line' for x in range(m.shape[1])] for y in range(m.shape[0])])
    for y in range(FAR_HIDDEN[0], FAR_HIDDEN[1] + 1):
        last = np.nonzero(m[y])[0].max()
        for x in range(last + 1, FAR_EDGE + 1):
            m[y, x] = True
            below = [q for q in range(y + 1, m.shape[0]) if solid[q, x]]
            c[y, x] = black if x == FAR_EDGE or not below else c[below[0], x]
    return m, c


def collar(mask, col, kinds, S):
    """His high collar on the Roman's chest: his shirt's rows round the neck (COLLAR, every pixel his,
    moved by COLLAR_SHIFT so his neck sits on the Roman's) in place of the Roman's neckline there, up to
    the collar's far end on each row; past it the Roman's chest goes on to its far shoulder as he drew it."""
    y0, y1, x0, x1 = COLLAR
    dx, dy = COLLAR_SHIFT
    for y in range(y0, y1 + 1):
        xs = [x for x in range(x0, x1 + 1) if S['tm'][y, x]]
        for x in range(x0, (max(xs) if xs else x0 - 1) + 1):
            X, Y = x + dx, y + dy
            if S['tm'][y, x]:
                mask[Y, X] = True
                col[Y, X] = S['col'][y, x]
                h = R.hexc(S['col'][y, x])
                kinds[h] = SHIRT.shirt_kind(h)
            else:
                mask[Y, X] = False


def sleeve(S, skin, s, kinds):
    """The sleeve on side `s`: the Roman's upper arm (his skin piece, roman-skin-from-ref.py) where his
    broad man's sleeve covers the arm, each cell measured along the arm from the shoulder (as a share of the
    upper arm's length) and across it (as a share of the arm's width) in both pictures. A cell over his
    sleeve's cloth takes the shirt colour of the same lightness rank as the Roman's skin there (his
    muscle shading in the shirt's colours); over his seams and his black line (the band and the line
    at the hem), his colour there. Returns the mask, colours and the piece's pivot and angle."""
    mask_r, col_r, pivot, ang, joint, shift = skin['UPPER_ARM_' + s]
    a = S['a']
    sl = S['masks']['sleeve_' + s.lower()]
    fr = bone({'a': pivot, 'b': (R.JOINTS['elbow' + s][0] - shift[0], R.JOINTS['elbow' + s][1] - shift[1])}, 'a', 'b')
    fb = bone(B.JOINTS, 'shoulder' + s, 'elbow' + s)
    LR = float(np.hypot(*(np.array(R.JOINTS['elbow' + s]) - np.array(R.JOINTS['shoulder' + s]))))
    LB = float(np.hypot(*(np.array(B.JOINTS['elbow' + s]) - np.array(B.JOINTS['shoulder' + s]))))
    # across: each piece's width over the length the sleeve covers
    tb0, tb1, sb0, sb1 = extents(sl, fb)
    ys, xs = np.nonzero(mask_r)
    o, u, v = fr
    P = np.stack([xs + 0.5, ys + 0.5], 1) - o
    t, w = P @ u, P @ v
    near = t <= tb1 * LR / LB
    sr0, sr1 = w[near].min(), w[near].max()
    m = np.zeros(mask_r.shape, bool)
    kind = {}
    ob, ub, vb = fb
    for y, x, tt, ww in zip(ys, xs, t, w):
        q = ob + tt * LB / LR * ub + (sb0 + (ww - sr0) * (sb1 - sb0) / (sr1 - sr0)) * vb
        qx, qy = int(np.floor(q[0])), int(np.floor(q[1]))
        if 0 <= qy < sl.shape[0] and 0 <= qx < sl.shape[1] and sl[qy, qx]:
            m[y, x] = True
            kind[(y, x)] = (SHIRT.shirt_kind(R.hexc(a[qy, qx])), a[qy, qx])
    # Measured so, his sleeve's edges fall a cell short of the Roman's arm here and there (his sleeve is
    # wider over the shoulder than his arm): every cell of the arm above the hem is the sleeve's. The hem,
    # across the arm, is the lowest sleeve cell in each column of the arm's width (a column with none takes
    # its neighbour's).
    bins = np.floor(w).astype(int)
    hem = {}
    for (y, x), tt, bb in zip(zip(ys, xs), t, bins):
        if m[y, x]:
            hem[bb] = max(hem.get(bb, -1e9), tt)
    for bb in sorted(set(bins)):
        if bb not in hem:
            hem[bb] = hem[min(hem, key=lambda k: (abs(k - bb), k))]
    for y, x, tt, bb in zip(ys, xs, t, bins):
        if not m[y, x] and tt <= hem[bb]:
            m[y, x] = True
            kind[(y, x)] = ('cloth', None)
    cloth = [a[y, x] for y, x in zip(*np.nonzero(sl)) if SHIRT.shirt_kind(R.hexc(a[y, x])) == 'cloth']
    cloth_cells = np.zeros(m.shape, bool)
    for (y, x), (k, _c) in kind.items():
        cloth_cells[y, x] = k == 'cloth'
    cmap = shading(cloth_cells, col_r, cloth)
    out = col_r.copy()
    for (y, x), (k, c) in kind.items():
        out[y, x] = rgb(cmap[R.hexc(col_r[y, x])]) if k == 'cloth' else c
        kinds[R.hexc(out[y, x])] = k
    return m, out, pivot, ang, shift


def open_edge(rows, palette, kinds):
    """The chest's open edge (PaintedPiece.seal): each cell of it but the black line with an 8-neighbour
    outside it, where it was cut from his guards, his arms or his collar's rim. In a pose that bares it, the
    game closes it with the black line (compose.ts sealOpenEdges), so no seam or collar pixel of the shirt
    stands on the figure's edge."""
    h, w = len(rows), max(len(r) for r in rows)
    cell = lambda x, y: 0 <= y < h and 0 <= x < len(rows[y]) and rows[y][x] != '.'
    out = []
    for y in range(h):
        r = ''
        for x in range(w):
            edge = cell(x, y) and kinds.get(palette[rows[y][x]]) != 'line' and any(not cell(x + dx, y + dy) for dy in (-1, 0, 1) for dx in (-1, 0, 1))
            r += 'x' if edge else '.'
        out.append(r.rstrip('.'))
    return out


def with_seal(ts, seal):
    """A ts_piece with its seal rows."""
    head, tail = ts.rsplit('};', 1)
    return head + '  seal: [\n' + ''.join(f"    '{r}',\n" for r in seal) + '  ],\n};' + tail


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    S = SHIRT.lift()
    shirt = {'torso': (S['tm'], S['col']), 'sleeve_n': (S['masks']['sleeve_n'], S['a']), 'sleeve_f': (S['masks']['sleeve_f'], S['a'])}
    a = R.native(R.REF)
    masks, cols = R.pieces(a)
    masks['chest'], cols['chest'] = chest_under_far_guard(a, masks['chest'], cols['chest'])
    J = R.JOINTS
    kinds = {}
    sm, sc = shirt['torso']
    f = mapper(sm, bone(B.JOINTS, 'neck', 'pelvis'), masks['chest'], bone(J, 'neck', 'pelvis'))
    chest_col, k = transfer(masks['chest'], cols['chest'], sm, sc, f)
    kinds.update(k)
    chest_mask = masks['chest'].copy()
    collar(chest_mask, chest_col, kinds, S)
    skin, _K = SKIN.lift(a)
    out = [DOC, "import type { PaintedPiece } from '../painted';", '']
    body, rest, joints = [], [], []
    rows, origin, palette = R.pack(chest_col, chest_mask)
    body.append(with_seal(R.ts_piece('SHIRT_MALE_CHEST', CHEST_DOC, rows, origin, palette, J['neck'], R.angle('pelvis', 'neck')), open_edge(rows, palette, kinds)))
    rest.append(('SHIRT_MALE_CHEST', [origin[i] + R.OFFSET[i] for i in (0, 1)]))
    joints.append(('SHIRT_MALE_CHEST', 'neck'))
    sleeves = {}
    for s in ('N', 'F'):
        m, c, pivot, ang, shift = sleeve(S, skin, s, kinds)
        sleeves[s] = (m, c, shift)
        rows, origin, palette = R.pack(c, m)
        const = 'SHIRT_MALE_SLEEVE_' + s
        body.append(R.ts_piece(const, SLEEVE_DOC.format(side='near' if s == 'N' else 'far'), rows, origin, palette, pivot, ang))
        rest.append((const, [origin[i] + R.OFFSET[i] + shift[i] for i in (0, 1)]))
        joints.append((const, 'shoulder' + s))
    for b in body:
        for h in re.findall(r"'(#[0-9a-f]{6})'", b):
            # pack keeps the first of the colours within 3 of each other: their kind is the first's.
            kinds.setdefault(h, 'cloth')
    out.append("/** What each colour is: the black line (never recoloured), the shirt's cloth and its seams (the colour slots). */")
    out.append('export const SHIRT_MALE_KIND: Record<string, string> = {')
    used = {h for b in body for h in re.findall(r"'(#[0-9a-f]{6})'", b)}
    for h in sorted(used):
        out.append(f"  '{h}': '{kinds[h]}',")
    out += ['};', '']
    out.append("/** The Roman's black line: the sleeves' outline over our arm's (the arm's own outline takes it where the sleeve is). */")
    out.append(f"export const SHIRT_MALE_LINE = '{R.hexc(R.his_line(a))}';")
    out.append('')
    out.append('/** The joint of our rig each piece\'s pivot lands on. */')
    out.append('export const SHIRT_MALE_JOINT: Record<string, string> = {')
    out += [f"  {c}: '{j}'," for c, j in joints]
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
        # his shirt, the Roman's chest and arms (his skin pieces), the new shirt; each where it lands at rest
        X0, Y0, X1, Y1 = 26, 18, 72, 52

        def canvas():
            return np.full((Y1 - Y0, X1 - X0, 4), 255, np.uint8)

        def put(im, m, c, sx=0, sy=0):
            for y, x in zip(*np.nonzero(m)):
                X, Y = x + sx - X0, y + sy - Y0
                if 0 <= X < X1 - X0 and 0 <= Y < Y1 - Y0:
                    im[Y, X, :3] = c[y, x]

        his = canvas()
        for m, c in (shirt['sleeve_f'], shirt['torso'], shirt['sleeve_n']):
            put(his, m, c, 3, -1)
        roman = canvas()
        put(roman, skin['UPPER_ARM_F'][0], skin['UPPER_ARM_F'][1], *skin['UPPER_ARM_F'][5])
        put(roman, masks['chest'], cols['chest'])
        put(roman, skin['UPPER_ARM_N'][0], skin['UPPER_ARM_N'][1], *skin['UPPER_ARM_N'][5])
        new = canvas()
        put(new, skin['UPPER_ARM_F'][0], skin['UPPER_ARM_F'][1], *skin['UPPER_ARM_F'][5])
        put(new, sleeves['F'][0], sleeves['F'][1], *sleeves['F'][2])
        put(new, chest_mask, chest_col)
        put(new, skin['UPPER_ARM_N'][0], skin['UPPER_ARM_N'][1], *skin['UPPER_ARM_N'][5])
        put(new, sleeves['N'][0], sleeves['N'][1], *sleeves['N'][2])
        gap = np.zeros((Y1 - Y0, 2, 4), np.uint8)
        save(np.concatenate([his, gap, roman, gap, new], 1), os.path.join(study, 'shirt-male@10.png'), 10)
    print('pieces', [c for c, _ in rest], 'colours', len(used))


if __name__ == '__main__':
    main()
