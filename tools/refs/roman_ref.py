"""Shared helpers for lifting parts out of the owner's Roman picture (docs/reference/roman-owner-reference.jpg).

His picture (1024x1024) is our male in the Bronze Cuirass and the Imperial War Skirt (idle frame 0)
painted over by the owner, in his own pixels of 10.24 picture pixels each (a 100 x 100 grid from the
picture's corner): one of his pixels is one fine pixel of our sprites, as in his Aiden picture
(tools/refs/aiden_ref.py). Lined up with our male at idle frame 0 (his head, collar and chest on ours),
a pixel of his at (x, y) sits at (x + OFFSET[0], y + OFFSET[1]) of our 256 x 256 frame. JOINTS are our
male rig's joints at that frame, in his pixels.

His figure stands wider than ours: his near leg is about 6 px further back and his far foot 6 px lower.
His chest, near arm and hips are where ours are, so the cuirass, its shoulder guards, the near bracer and
the skirt hang from our joints exactly where he drew them. He tucked the far arm in (FAR_ARM_IN), so the
far bracer is moved out onto our far forearm, and the sandals are moved onto our legs and feet.

PIECES cuts his figure into the pieces the items stamp (src/sprite/painted.ts): each is a region of his
picture (a polygon in his pixel corners) less what other pieces or his skin own there, keeping only the
black line that bounds its own colours. Where a piece is hidden in his picture (the chest under the near
shoulder guard, the long drape behind his legs, which shows behind our legs) it is filled by continuing
his pixels.

Scripts import this with sys.path.insert(0, os.path.dirname(__file__)) and run with python3 -I.
"""

import colorsys
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

from aiden_ref import background, luma, pack, save  # noqa: E402,F401

REF = 'docs/reference/roman-owner-reference.jpg'
PITCH = 10.24
PHASE = (0.0, 0.0)
OFFSET = (74, 120)
# Our male rig at idle frame 0, in his pixels (src/sprite/rig.ts drawRig, fine pixels less OFFSET).
JOINTS = {
    'head': (52.0, 18.0),
    'neck': (53.18, 27.65),
    'pelvis': (53.0, 56.87),
    'shoulderN': (40.01, 32.51),
    'shoulderF': (60.27, 31.81),
    'elbowN': (36.13, 44.50),
    'elbowF': (63.09, 44.08),
    'wristN': (33.62, 55.21),
    'wristF': (68.52, 53.65),
    'handN': (32.80, 58.72),
    'handF': (70.30, 56.78),
    'hipN': (47.58, 56.46),
    'hipF': (57.51, 53.12),
    'kneeN': (48.17, 72.65),
    'kneeF': (64.23, 67.86),
    'ankleN': (44.42, 87.59),
    'ankleF': (61.94, 83.08),
}
# The skin of the sprite he painted over (Solen's, the default sheet's): our male in it is what he painted
# on, so a character in this skin shows his skin pixels exactly; other skins move them as far.
PAINTED_SKIN = '#f3c39c'
# His ankles (the middle of each sandal where the shin meets the foot), read off his picture.
HIS_ANKLES = {'N': (38.5, 91.0), 'F': (59.5, 89.5)}
# Our feet's soles at idle frame 0 (the last row of each foot), in his pixels: his far foot is drawn 6 px
# lower than ours.
OUR_SOLES = {'N': 98, 'F': 90}
# How far nearer the body than ours he drew the far forearm (his bracer's edges against our forearm's,
# rows 45 to 52): the far bracer is moved this far out onto ours.
FAR_ARM_IN = 3


def native(path=REF):
    """His pixels: the median of each block's interior, as an (H, W, 3) int array."""
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    H, W, _ = a.shape
    nx = int(round((W - PHASE[0]) / PITCH))
    ny = int(round((H - PHASE[1]) / PITCH))
    xs = [int(round(PHASE[0] + k * PITCH)) for k in range(nx + 1)]
    ys = [int(round(PHASE[1] + k * PITCH)) for k in range(ny + 1)]
    out = np.zeros((ny, nx, 3))
    for j in range(ny):
        for i in range(nx):
            c = a[ys[j] + 3:ys[j + 1] - 3, xs[i] + 3:xs[i + 1] - 3].reshape(-1, 3)
            out[j, i] = np.median(c, axis=0)
    return np.clip(np.round(out), 0, 255).astype(np.int32)


def kind(c):
    """What a colour of his is: 'line' (his black), 'skin', 'hair', 'red' (cloth), 'stud' (grey),
    'bronze' (the metal's yellows and oranges) or 'leather' (his browns)."""
    r, g, b = (int(v) for v in c)
    L = 0.299 * r + 0.587 * g + 0.114 * b
    if r < 30 and g < 30 and b < 40:
        return 'line'
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    if b > r + 5:
        return 'hair'
    if r > 60 and g < 0.33 * r:
        return 'red'
    if abs(r - g) < 25 and abs(g - b) < 25 and L > 90:
        return 'stud'
    if r >= 135 and b >= 0.42 * r and r > b + 25 and g - b < 0.5 * (r - b):
        return 'skin'
    if h > 0.07 and r > 100:
        return 'bronze'
    return 'leather'


def inside(pts, H=100, W=100):
    """The pixels whose centres lie inside a polygon of his pixel corners (even-odd rule)."""
    m = np.zeros((H, W), bool)
    n = len(pts)
    for y in range(H):
        cy = y + 0.5
        xs = []
        for i in range(n):
            (x0, y0), (x1, y1) = pts[i], pts[(i + 1) % n]
            if (y0 <= cy < y1) or (y1 <= cy < y0):
                xs.append(x0 + (cy - y0) * (x1 - x0) / (y1 - y0))
        xs.sort()
        for k in range(0, len(xs) - 1, 2):
            for x in range(W):
                if xs[k] <= x + 0.5 < xs[k + 1]:
                    m[y, x] = True
    return m


def angle(a_name, b_name):
    (ax, ay), (bx, by) = JOINTS[a_name], JOINTS[b_name]
    return float(np.degrees(np.arctan2(by - ay, bx - ax)))


def ts_piece(name, doc, rows, origin, palette, pivot, ang):
    """A PaintedPiece (src/sprite/painted.ts) as TypeScript: `pivot` the cell (his pixels) that lands on
    the joint, `ang` the limb's angle at rest."""
    ox, oy = origin
    key = lambda k: k if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', k) else "'" + k + "'"
    out = [f'/** {doc} */', f'export const {name}: PaintedPiece = {{',
           f'  pivot: [{int(np.floor(pivot[0])) - ox}, {int(np.floor(pivot[1])) - oy}],',
           f'  angle: {ang:.2f},', '  rows: [']
    out += [f"    '{r}'," for r in rows]
    out += ['  ],', '  colors: {']
    out += [f"    {key(k)}: '{v}'," for k, v in palette.items()]
    out += ['  },', '};', '']
    return '\n'.join(out)


def write(path, text):
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        f.write(text)
    os.replace(tmp, path)


# The regions of his picture each piece is cut from (polygons in his pixel corners), in the order they
# claim his colours: a pixel goes to the first piece whose region holds it and whose kinds take it.
REGIONS = {
    'guard_n': [(33, 23.5), (47.2, 23.5), (47.2, 36), (33, 36)],
    'guard_f': [(59.6, 25), (65, 25), (65, 38), (59.6, 38)],
    'bracer_n': [(30, 43), (40, 43), (40, 54), (30, 54)],
    'bracer_f': [(60.6, 44.6), (69.5, 44.6), (69.5, 53), (60.6, 53)],
    'chest': [(42.6, 26), (61, 26), (61, 52), (53, 52), (53, 51), (50, 51), (50, 50), (49, 50), (49, 49), (42.6, 49)],
    'front': [(39.6, 48), (66, 48), (66, 52), (64.6, 52), (64.6, 62), (66, 62), (66, 69), (39.6, 69)],
    'shin_n': [(35.6, 77.5), (46, 77.5), (46, 80), (42.6, 80), (42.6, 92), (35.6, 92)],
    'foot_n': [(33, 92), (44, 92), (44, 99), (33, 99)],
    'shin_f': [(55.6, 77.5), (63.4, 77.5), (63.4, 90), (55.6, 90)],
    'foot_f': [(54, 90), (73, 90), (73, 98), (54, 98)],
    'drape': [(19, 61), (40, 61), (40, 58), (74, 58), (74, 93), (19, 93)],
}
CHEST_HIDDEN = (27, 35)  # the rows of the chest the near shoulder guard covers
CHEST_EDGE = 43          # the column of the chest's left line below the guard
DRAPE_FILL_FROM = 66     # the drape is filled behind his legs from this row down
METAL = ('leather', 'stud', 'bronze', 'red')
TAKES = {n: METAL + (('skin',) if n.startswith(('shin', 'foot')) else ()) for n in REGIONS}
TAKES['drape'] = ('red',)


def his_line(a):
    """His black line: the commonest of his line colours."""
    seen = {}
    for c in a.reshape(-1, 3):
        if kind(c) == 'line':
            t = tuple(int(v) for v in c)
            seen[t] = seen.get(t, 0) + 1
    return np.array(max(sorted(seen), key=lambda t: seen[t]))


def near8(m):
    g = m.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            g |= np.roll(np.roll(m, dy, 0), dx, 1)
    return g


def pieces(a):
    """His figure cut into pieces: {name: mask}, {name: colours} (his pixels, and his pixels continued
    where the piece is hidden)."""
    H, W, _ = a.shape
    # The white around him, and the white gaps he left inside his figure (between the near arm and the chest).
    bg = background(a) | (luma(a) > 225)
    K = np.array([[kind(a[y, x]) for x in range(W)] for y in range(H)])
    line = (K == 'line') & ~bg
    owned = np.zeros((H, W), bool)
    masks, cols = {}, {}
    for n, pts in REGIONS.items():
        m = inside(pts, H, W) & ~bg & ~owned & np.isin(K, TAKES[n])
        owned |= m
        masks[n] = m
        cols[n] = a.copy()
    for n, pts in REGIONS.items():
        masks[n] = masks[n] | (line & inside(pts, H, W) & near8(masks[n]))
    black = his_line(a)

    # The chest under the near shoulder guard: its left line goes on up at x = 43 to its top line on row
    # 27, and inside it each column takes his colour from the first chest pixel below.
    m, c = masks['chest'], cols['chest']
    solid = m & (K != 'line')
    for y in range(CHEST_HIDDEN[0], CHEST_HIDDEN[1] + 1):
        xs = np.nonzero(solid[y])[0]
        first = xs.min() if len(xs) else CHEST_EDGE + 1
        for x in range(CHEST_EDGE, first):
            if m[y, x]:
                continue
            m[y, x] = True
            if x == CHEST_EDGE or y == CHEST_HIDDEN[0]:
                c[y, x] = black
                continue
            below = [q for q in range(y + 1, H) if solid[q, x]]
            c[y, x] = a[below[0], x] if below else a[y, first]

    masks['drape'], cols['drape'] = drape_behind_legs(a, K, bg, masks, black)
    return masks, cols


def near4(m):
    g = m.copy()
    g[1:] |= m[:-1]
    g[:-1] |= m[1:]
    g[:, 1:] |= m[:, :-1]
    g[:, :-1] |= m[:, 1:]
    return g


def drape_behind_legs(a, K, bg, masks, black):
    """The drape with what his legs hide continued (our legs stand elsewhere, so it shows there).

    His legs (their skin, the sandals and the black line round them) are not the drape's: the drape keeps
    its red and only his black that bounds the red and touches no leg. Behind each leg the cloth is the
    shadowed inside of the drape, so each hidden patch is cloned whole from the visible inside next to it
    (one shift for the whole patch, his folds running down unbroken), and closed below by his black line
    on a hem drawn straight from the drape's hem on one side of the leg to the other.
    """
    H, W, _ = a.shape
    rows = np.arange(H)[:, None]
    region = inside(REGIONS['drape'], H, W)
    low = rows >= DRAPE_FILL_FROM
    solid = masks['drape'] & (K != 'line')
    leg = (K == 'skin') & low
    for n in ('shin_n', 'shin_f', 'foot_n', 'foot_f'):
        leg |= masks[n] & (K != 'line')
    leg_line = (K == 'line') & near8(leg) & low & ~bg
    edge = (K == 'line') & region & near8(solid) & ~leg_line & ~bg
    # A black pixel is the drape's only where it touches the red side on (not just at a corner).
    edge &= near4(solid)
    outside = background(a)
    cloth = solid | edge
    # Behind the legs: what is neither the drape's cloth nor the strips nor the white round him.
    behind = region & low & ~cloth & ~masks['front'] & ~outside
    hidden = behind & (leg | leg_line)

    # Each leg's patch (connected), its columns those of the leg's upper part (the thigh behind which the
    # cloth hangs), down to the hem.
    lab = np.zeros((H, W), int)
    n_lab = 0
    for y, x in zip(*np.nonzero(hidden)):
        if lab[y, x]:
            continue
        n_lab += 1
        stack = [(y, x)]
        while stack:
            q, p = stack.pop()
            if 0 <= q < H and 0 <= p < W and hidden[q, p] and not lab[q, p]:
                lab[q, p] = n_lab
                stack += [(q + 1, p), (q - 1, p), (q, p + 1), (q, p - 1)]
    bottom = lambda x: int(np.nonzero(cloth[:, x])[0].max())
    has = lambda x: 0 <= x < W and cloth[DRAPE_FILL_FROM:, x].any()
    middle_x = np.nonzero(solid & low)[1].mean()
    src_ok = solid & ~hidden
    m = cloth.copy()
    c = a.copy()
    filled = np.zeros((H, W), bool)
    for k in range(1, n_lab + 1):
        ys, xs = np.nonzero(lab == k)
        if len(ys) < 20:
            continue
        top = ys.min()
        upper = xs[ys < top + 10]
        x0, x1 = int(upper.min()), int(upper.max())
        left = next(x for x in range(x0 - 1, -1, -1) if has(x))
        right = next(x for x in range(x1 + 1, W) if has(x))
        bl, br = bottom(left), bottom(right)
        hem = {x: int(round(bl + (br - bl) * (x - left) / (right - left))) for x in range(left + 1, right)}
        P = np.zeros((H, W), bool)
        for x in range(left + 1, right):
            P[top:hem[x], x] = behind[top:hem[x], x]
        # One shift for the whole patch, toward the middle of the drape (its shadowed inside), the one
        # that finds the most of the patch in his visible red; the nearest of equals.
        way = 1 if (x0 + x1) / 2 < middle_x else -1
        pts = list(zip(*np.nonzero(P)))
        d = max(range(1, 17), key=lambda t: (sum(1 for y, x in pts if 0 <= x + way * t < W and src_ok[y, x + way * t]), -t)) * way
        for y, x in pts:
            sx = x + d
            if not src_ok[y, sx]:
                # Past his own hem there: his nearest red up or down that column, else in the row.
                cand = [q for q in range(H) if src_ok[q, sx]]
                if cand:
                    y_src = min(cand, key=lambda q: (abs(q - y), q))
                    c[y, x] = a[y_src, sx]
                else:
                    xr = np.nonzero(src_ok[y])[0]
                    c[y, x] = a[y, xr[np.argmin(np.abs(xr - x))]]
            else:
                c[y, x] = a[y, sx]
            filled[y, x] = True
        for x in range(left + 1, right):
            if not cloth[hem[x], x]:
                c[hem[x], x] = black
                filled[hem[x], x] = True
    return m | filled, c


# His pictures here are JPEGs with many near colours, more than aiden_ref.pack's alphabet: this one goes
# on with Latin-1, Greek and Cyrillic letters (one UTF-16 unit each, as rotsprite.ts reads the rows).
CHARS = (
    'abcdefhijklmnpqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&()*+,-/:;<=>?@[]^_{|}~'
    + ''.join(chr(c) for c in range(0xC0, 0x100) if c not in (0xD7, 0xF7))
    + ''.join(chr(c) for c in range(0x391, 0x3CA) if c != 0x3A2)
    + ''.join(chr(c) for c in range(0x410, 0x450))
)


def pack(col, mask):
    """aiden_ref.pack with the longer alphabet: rows of palette characters (colours of his within 3
    share one), the origin (x0, y0) in his pixels and the palette."""
    from aiden_ref import pack as pack0
    return pack0(col, mask, CHARS)


def hexc(c):
    return '#%02x%02x%02x' % tuple(int(v) for v in c)


def middle(a, masks, cols, names, kinds, q=0.5):
    """His colour of middle lightness among the pixels of these kinds in these pieces (half of them are
    lighter, half darker; with `q`, that fraction of them darker): the base a colour slot recolours from.
    Only his own pixels count, not those continued where the piece is hidden."""
    found = []
    for n in names:
        for y, x in zip(*np.nonzero(masks[n])):
            if (cols[n][y, x] == a[y, x]).all() and kind(cols[n][y, x]) in kinds:
                found.append((float(luma(cols[n][y, x])), hexc(cols[n][y, x])))
    found.sort()
    return found[int(len(found) * q)][1]


def module(a, masks, cols, doc, consts, bases, kind_name=None):
    """A generated TypeScript module: his colours each slot recolours from (`bases`, name -> hex), what
    each of his colours is (`<PREFIX>_KIND`, hex -> kind), the pieces (`consts`: (CONST, piece, doc,
    pivot in his pixels, angle[, joint in his pixels when the pivot is not on our joint])) and where each
    piece lands in our idle frame 0 (`<PREFIX>_REST`: the fine pixel of its first row's first cell)."""
    out = [doc, "import type { PaintedPiece } from '../painted';", '']
    out.append('/** His colours the colour slots recolour from (at these, every pixel is his). */')
    for k, v in bases.items():
        out.append(f"export const {k} = '{v}';")
    out.append('')
    kinds = {}
    body = []
    rest = []
    for const, n, pdoc, pivot, ang, *joint in consts:
        rows, origin, palette = pack(cols[n], masks[n])
        for h in palette.values():
            kinds[h] = kind([int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)])
        body.append(ts_piece(const, pdoc, rows, origin, palette, pivot, ang))
        j = joint[0] if joint else pivot
        rest.append((const, [origin[i] + OFFSET[i] + int(np.floor(j[i])) - int(np.floor(pivot[i])) for i in (0, 1)]))
    prefix = kind_name or consts[0][0].split('_')[0]
    out.append("/** What each of his colours is, as the script sorts them: his black line, skin, red cloth, a grey stud, bronze or leather. */")
    out.append(f"export const {prefix}_KIND: Record<string, 'line' | 'skin' | 'red' | 'stud' | 'bronze' | 'leather' | 'hair'> = {{")
    for h in sorted(kinds):
        out.append(f"  '{h}': '{kinds[h]}',")
    out += ['};', '']
    out.append("/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */")
    out.append(f'export const {prefix}_REST: Record<string, [number, number]> = {{')
    for const, (x, y) in rest:
        out.append(f'  {const}: [{x}, {y}],')
    out += ['};', '']
    out += body
    return '\n'.join(out)


def study(a, masks, cols, names, path, box=(18, 20, 76, 100)):
    """His picture beside the pieces lifted out of it (drawn back to front in `names` order), at 8x."""
    x0, y0, x1, y1 = box
    H, W = y1 - y0, x1 - x0
    lifted = np.full((H, W, 4), 0, np.uint8)
    for n in names:
        m = masks[n]
        for y, x in zip(*np.nonzero(m)):
            if y0 <= y < y1 and x0 <= x < x1:
                lifted[y - y0, x - x0, :3] = cols[n][y, x]
                lifted[y - y0, x - x0, 3] = 255
    his = np.concatenate([a[y0:y1, x0:x1].astype(np.uint8), np.full((H, W, 1), 255, np.uint8)], axis=2)
    save(np.concatenate([his, np.zeros((H, 2, 4), np.uint8), lifted], axis=1), path)
