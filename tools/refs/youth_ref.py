"""Shared helpers for lifting the owner's Joven salvaje paint-over (docs/reference/joven-salvaje-owner-reference.jpg)
into the hair, eyes and clothes it shows.

His picture (2000x2000) is our male in one look (idle frame 0, Solen's skin and face; hair_youth,
top_bomber, bottom_shinobi, waist_pouches, feet_sandals, red eyes) painted over by the owner in his own
pixels of exactly 20 picture pixels (a 100 x 100 grid from the picture's corner, measured from his black
outline: the edges between his pixels fall on every 20th picture column and row). One of his pixels is
one fine pixel of our sprites. Lined up with our male at idle frame 0 (his chest, arms and belt on ours),
a pixel of his at (x, y) sits at (x + OFFSET[0], y + OFFSET[1]) of our 256 x 256 frame.

He painted: spiky black hair with navy lights, his own eyes (scowling brows, red irises with a pink
light), an open blue jacket with long sleeves over a dark-grey shirt, a belt of three khaki pouches with a
grey buckle, slate trousers with cream leg wraps at the shins, black strapped sandals over bare toes, and
bare fists.

His figure is ours from the head to the hips. His legs are shorter than ours: his near sole is 5 px and
his far sole 3 px above our ground (LEG_SHIFT). The thighs stay where he drew them; each shin (with its
wrap) and each sandal hangs from our knee and ankle that much lower, so his feet stand on our ground, and
each thigh runs on down over the shin's top in his own pixels (his trousers there), so no gap opens. Every
other piece is pinned to our rig's joints where it lies at rest: its pivot is the cell of his picture that
our joint falls on, so at rest every pixel is his, where he drew it, and in other poses it turns about our
joint as our limb turns (src/sprite/painted.ts stampPiece).

PIECES cuts his figure into regions: each is a polygon of his picture (in his pixel corners) and the kinds
of colour it takes there (kind()), less what regions claimed before it; it keeps only the black line that
bounds its own colours. youth() turns them into the pieces the items stamp: where a piece is hidden in his
picture (the jacket and trousers under the pouches) it is filled by continuing his pixels (fill()), and its
new edge is closed with his black line. hair() lifts his hair. One script per part
(tools/refs/youth-*-from-ref.py) writes its module.

Scripts import this with sys.path.insert(0, os.path.dirname(__file__)) and run with python3 -I.
"""

import colorsys
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

from aiden_ref import background, luma, save  # noqa: E402,F401
from roman_ref import CHARS, hexc, inside, near4, near8, ts_piece, write  # noqa: E402,F401

REF = 'docs/reference/joven-salvaje-owner-reference.jpg'
PITCH = 20
OFFSET = (75, 116)
# Our male rig at idle frame 0, in fine pixels of the 256 x 256 frame (src/sprite/rig.ts buildRig('male',
# 'idle', 0), each joint times RES).
FRAME_JOINTS = {
    'head': (126.0, 138.0),
    'neck': (127.18, 147.65),
    'pelvis': (127.0, 176.874),
    'shoulderN': (114.006, 152.513),
    'shoulderF': (134.27, 151.805),
    'elbowN': (110.131, 164.502),
    'elbowF': (137.094, 164.084),
    'wristN': (107.622, 175.212),
    'wristF': (142.523, 173.652),
    'handN': (106.801, 178.717),
    'handF': (144.299, 176.783),
    'hipN': (121.582, 176.463),
    'hipF': (131.512, 173.116),
    'kneeN': (122.171, 192.652),
    'kneeF': (138.233, 187.856),
    'ankleN': (118.422, 207.589),
    'ankleF': (135.936, 203.084),
}
# Our face template's anchor (src/sprite/body.ts faceAnchor: the near eye's lash start) at male idle
# frame 0, in fine pixels of the frame.
FRAME_FACE_ANCHOR = (123, 139)
# How far below where he drew them his shins, wraps and sandals hang (fine pixels), so his soles stand on
# our ground: his near sole's black line is on his row 97, ours on 102; his far one on 91, ours on 94.
LEG_SHIFT = {'N': 5, 'F': 3}
# The skin he painted over (Solen's, which our render wore): in it, his skin pixels are his.
SKIN = '#f3c39c'


def joints():
    """Our male rig's joints at idle frame 0, in his pixels."""
    ox, oy = OFFSET
    return {k: (x - ox, y - oy) for k, (x, y) in FRAME_JOINTS.items()}


def face_anchor():
    return (FRAME_FACE_ANCHOR[0] - OFFSET[0], FRAME_FACE_ANCHOR[1] - OFFSET[1])


def native(path=REF):
    """His pixels: the median of each 20 x 20 block's interior (3 picture pixels in from its edges)."""
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    n = a.shape[0] // PITCH
    out = np.zeros((n, n, 3))
    for j in range(n):
        for i in range(n):
            c = a[j * PITCH + 3:(j + 1) * PITCH - 3, i * PITCH + 3:(i + 1) * PITCH - 3].reshape(-1, 3)
            out[j, i] = np.median(c, axis=0)
    return np.clip(np.round(out), 0, 255).astype(np.int32)


def kind(c):
    """What a colour of his is: 'white' (his white, and the white round him), 'line' (his black, and the
    near-black dark brown he outlined the pouches and lashes with: lightness under 21), 'skin', 'grey' or
    'pale' (no colour to speak of: the shirt, the buckle), 'slate' (the trousers' dull dark blues), 'blue'
    (the jacket's), 'brown' (the pouches' khakis, the wraps' tans), 'red', 'cream' (the wraps' light), or
    'violet' (the sandals' and the hair's navy-violets)."""
    r, g, b = (int(v) for v in c)
    L = 0.299 * r + 0.587 * g + 0.114 * b
    if L > 235 and min(r, g, b) > 220:
        return 'white'
    if L < 21:
        return 'line'
    h, s, _v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    hd = h * 360
    if r > 150 and g > 90 and b > 70 and r - b > 40 and g < r - 20 and hd < 27 and L > 118:
        return 'skin'
    if s < 0.18:
        return 'pale' if L > 150 else 'grey'
    if 25 <= hd < 60 and L > 150 and s < 0.3:
        return 'cream'
    if hd < 15 or hd > 330:
        return 'red' if r > 120 and s > 0.6 else 'brown'
    if hd < 60:
        return 'brown'
    if 205 <= hd < 222 or (222 <= hd < 245 and s >= 0.56):
        return 'blue'
    if 222 <= hd < 245:
        return 'slate'
    if hd < 205:
        return 'blue'
    return 'violet'


def kinds(a):
    H, W, _ = a.shape
    return np.array([[kind(a[y, x]) for x in range(W)] for y in range(H)])


def his_line(a):
    """His black line: the commonest of his line colours."""
    seen = {}
    for c in a.reshape(-1, 3):
        if kind(c) == 'line':
            t = tuple(int(v) for v in c)
            seen[t] = seen.get(t, 0) + 1
    return np.array(max(sorted(seen), key=lambda t: seen[t]))


def box(x0, y0, x1, y1):
    """The pixels x0..x1-1, y0..y1-1 as a polygon."""
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def region(pts, shape=(100, 100)):
    """A union of polygons (a list of point lists) or one polygon, as a mask (disjoint ones: even-odd)."""
    if pts and isinstance(pts[0][0], (int, float)):
        pts = [pts]
    m = np.zeros(shape, bool)
    for p in pts:
        m ^= inside(p, *shape)
    return m


def split(mask, poly):
    return mask & region(poly)


def fill(a, mask, col, hidden, black, way='down', close=True):
    """Fills `hidden` (pixels the piece lacks) by continuing his pixels: each takes the colour of the
    nearest of the piece's own non-line pixels in its column (`way` 'down': from above, his folds running
    on down; 'up': from below; 'near': whichever is nearer, above first), else in its row. Where the
    filled area meets nothing of the piece, its edge is closed with his black line."""
    H, W = mask.shape
    lin = np.array([[kind(col[y, x]) == 'line' for x in range(W)] for y in range(H)])
    own = mask & ~lin
    out = col.copy()
    todo = hidden & ~mask
    for y, x in zip(*np.nonzero(todo)):
        above = [q for q in range(y - 1, -1, -1) if own[q, x]]
        below = [q for q in range(y + 1, H) if own[q, x]]
        cand = []
        if way in ('down', 'near') and above:
            cand.append((y - above[0], above[0]))
        if way in ('up', 'near') and below:
            cand.append((below[0] - y, below[0]))
        if cand:
            out[y, x] = col[min(cand)[1], x]
            continue
        xs = np.nonzero(own[y])[0]
        if len(xs):
            out[y, x] = col[y, xs[np.argmin(np.abs(xs - x))]]
        else:
            ys, xx = np.nonzero(own)
            k = np.argmin(np.abs(ys - y) + np.abs(xx - x))
            out[y, x] = col[ys[k], xx[k]]
    m = mask | todo
    if close:
        edge = todo & ~(np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1))
        out[edge] = black
    return m, out


def pack(col, mask):
    """roman_ref.pack: rows of palette characters (colours of his within 3 share one), origin, palette."""
    from aiden_ref import pack as pack0
    return pack0(col, mask, CHARS)


def slot_by_kind(table, default):
    """A slot_of: the slot named for his colour's kind in `table`, else `default` (his line stays)."""
    def slot_of(h):
        k = kind([int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)])
        return 'line' if k == 'line' else table.get(k, default)
    return slot_of


def module(doc, pieces, prefix, base_names, quantile=None):
    """A generated TypeScript module of one part's pieces.

    `pieces`: (CONST, mask, colours, doc, joint, rest angle, slot_of[, shift]): the piece hangs from the
    named rig joint (its pivot is the cell of his picture our joint falls on at rest, moved by `shift`
    (dx, dy) fine pixels when given: a shift of (0, -5) hangs the piece 5 px lower than he drew it),
    `rest angle` is the angle its limb has in our idle (so at rest it is not turned), and slot_of(hex)
    names the colour slot that recolours each of its colours ('line' for his black line and whatever else
    stays as he drew it, 'skin' for his skin, which follows the character's).

    It exports, for each slot in `base_names` (slot -> constant name), his colour the slot recolours from:
    his colour of middle lightness among that slot's pixels (or at `quantile[slot]`), counting only his own
    pixels, not those continued where a piece is hidden; with the slot at that colour every pixel is his.
    Then <prefix>_SLOT (each colour -> its slot) and <prefix>_REST (where each piece's first row's first
    cell lands in our male idle frame 0, unturned), which the tests check.
    """
    a = native()
    J = joints()
    ox, oy = OFFSET
    quantile = quantile or {}
    body, rest, slots, found = [], [], {}, {}
    for const, mask, col, pdoc, joint, ang, slot_of, *shift in pieces:
        rows, origin, palette = pack(col, mask)
        for h in palette.values():
            sl = slot_of(h)
            assert slots.get(h, sl) == sl, f'{h} is in two slots'
            slots[h] = sl
        for y, x in zip(*np.nonzero(mask)):
            if (col[y, x] == a[y, x]).all():
                found.setdefault(slot_of(hexc(col[y, x])), []).append((float(luma(col[y, x])), hexc(col[y, x])))
        sx, sy = shift[0] if shift else (0, 0)
        jx, jy = J[joint]
        body.append(ts_piece(const, pdoc, rows, origin, palette, (jx + sx, jy + sy), ang))
        rest.append((const, (origin[0] + ox - sx, origin[1] + oy - sy)))
    out = [doc, "import type { PaintedPiece } from '../painted';", '']
    out.append('/** His colours the colour slots recolour from (at these, every pixel is his). */')
    bases = {}
    dist = lambda h, k: sum(abs(int(h[i:i + 2], 16) - int(k[i:i + 2], 16)) for i in (1, 3, 5))  # noqa: E731
    for sl, name in base_names.items():
        f = sorted(found[sl])
        want = f[int(len(f) * quantile.get(sl, 0.5))][1]
        # The palettes keep the first of colours within 3 of each other: the base is the one standing for it.
        bases[sl] = min(sorted(h for h in slots if slots[h] == sl), key=lambda h: dist(h, want))
        out.append(f"export const {name} = '{bases[sl]}';")
    out.append('')
    names = sorted(set(slots.values()))
    out.append("/** Which colour slot recolours each of his colours ('line': his black line, which stays as he drew it; 'skin': the character's skin). */")
    out.append(f"export const {prefix}_SLOT: Record<string, {' | '.join(repr(n) for n in names)}> = {{")
    for h in sorted(slots):
        out.append(f"  '{h}': '{slots[h]}',")
    out += ['};', '']
    out.append("/** Where each piece's first row's first cell lands in our male idle frame 0, unturned. */")
    out.append(f'export const {prefix}_REST: Record<string, [number, number]> = {{')
    for const, (x, y) in rest:
        out.append(f'  {const}: [{x}, {y}],')
    out += ['};', '']
    out += body
    return '\n'.join(out), bases


def run(out_ts, doc, pieces, prefix, base_names, quantile=None, extra=''):
    """Writes the module (when `out_ts`; `extra` is more TypeScript put after the bases), prints the bases."""
    text, bases = module(doc, pieces, prefix, base_names, quantile)
    if extra:
        i = text.index('/** Which colour slot')
        text = text[:i] + extra + '\n' + text[i:]
    if out_ts:
        write(out_ts, text)
    print('bases', bases)


def angle(a_name, b_name):
    J = joints()
    (ax, ay), (bx, by) = J[a_name], J[b_name]
    return float(np.degrees(np.arctan2(by - ay, bx - ax)))


def study(a, layers, path, bx=(20, 0, 80, 100)):
    """His picture beside the pieces lifted out (`layers`: (mask, colours), back to front), at 8x."""
    x0, y0, x1, y1 = bx
    H, W = y1 - y0, x1 - x0
    lifted = np.full((H, W, 4), 0, np.uint8)
    for m, c in layers:
        for y, x in zip(*np.nonzero(m)):
            if y0 <= y < y1 and x0 <= x < x1:
                lifted[y - y0, x - x0, :3] = c[y, x]
                lifted[y - y0, x - x0, 3] = 255
    his = np.concatenate([a[y0:y1, x0:x1].astype(np.uint8), np.full((H, W, 1), 255, np.uint8)], axis=2)
    save(np.concatenate([his, np.zeros((H, 2, 4), np.uint8), lifted], axis=1), path)


def argv_out():
    """What each part script takes: [out.ts, study dir], both optional."""
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study_dir = sys.argv[2] if len(sys.argv) > 2 else None
    if study_dir:
        os.makedirs(study_dir, exist_ok=True)
    return out_ts, study_dir


# ---------------------------------------------------------------------------------------------------
# The regions of his picture each piece is cut from (polygons in his pixel corners; a list of polygons is
# their union), the kinds of colour each takes, in the order they claim his pixels: a pixel goes to the
# first piece whose region holds it and whose kinds take it.
# ---------------------------------------------------------------------------------------------------

SKINS = ('skin', 'brown', 'red')
CLOTH = ('blue', 'slate', 'grey', 'violet', 'pale')
PIECES = {
    # His bare fists under the cuffs.
    'fist_n': (box(27, 57, 38, 67), SKINS),
    'fist_f': (box(64, 54, 73, 64), SKINS),
    # The belt and its pouches and buckle, over the jacket's hem and the trousers' seat (not the shirt
    # above the buckle on row 52).
    'belt': ([box(38, 53, 64, 64), box(38, 52, 54, 53), box(57, 52, 64, 53)], ('brown', 'pale', 'grey', 'red', 'cream', 'white')),
    # The sleeves, each up to his line between it and the jacket's body (the near one's runs from the
    # shoulder seam down the inside of the arm; the far one's from under the far shoulder).
    'sleeve_n': ([(26, 32), (42, 32), (42, 35), (43, 35), (43, 36), (44, 36), (44, 44), (43, 44), (43, 45), (42, 45),
                  (42, 48), (41, 48), (41, 50), (40, 50), (40, 55), (39, 55), (39, 59), (26, 59)], CLOTH),
    'sleeve_f': ([(62, 38), (75, 38), (75, 58), (61, 58), (61, 45), (62, 45)], CLOTH),
    # The jacket's body: its panels, the collar and the shirt in its open front, the far shoulder.
    'jacket': ([(43, 29), (66, 29), (66, 38), (62, 38), (62, 45), (61, 45), (61, 58), (40, 58), (40, 31), (43, 31)], CLOTH),
    # The trousers (each leg's side of his inseam is cut in youth()).
    'pants': ([box(36, 55, 53, 85), box(53, 55, 70, 82)], ('slate', 'blue', 'violet', 'grey')),
    # The cream wraps round the shins over the trousers' hems.
    'wrap_n': (box(39, 80, 50, 86), ('cream', 'brown', 'pale', 'white', 'grey')),
    'wrap_f': (box(56, 77, 67, 83), ('cream', 'brown', 'pale', 'white', 'grey')),
    # The sandals: straps round the ankles and over the bare toes.
    'sandal_n': (box(36, 84, 49, 99), ('violet', 'slate', 'blue', 'grey', 'skin', 'brown', 'red')),
    'sandal_f': (box(55, 82, 74, 94), ('violet', 'slate', 'blue', 'grey', 'skin', 'brown', 'red')),
}

# Where the pieces part (his pixel rows).
FAR_SHOULDER = box(58, 33, 66, 39)  # the jacket's far shoulder, over the top of the far sleeve
ELBOW = {'N': 48, 'F': 48}     # the upper sleeve ends on this row, the forearm's starts 2 rows above
NEAR_LEG = [(30, 55), (53, 55), (53, 100), (30, 100)]  # the near leg's side of his inseam
HIP = 63                       # the seat ends on this row, the thighs start 3 rows above
KNEE = {'N': 72, 'F': 68}      # the shins start 2 rows above this row; the thighs end a row under it plus the
                               # leg's shift (so at rest, the shin hung lower, they overlap by 4 rows)
ANKLE = {'N': 88, 'F': 85}     # the sandal's straps end 1 row under this row, its foot starts here
JACKET_HEM = 57                # the jacket and shirt, continued under the belt, end on this row


def label_map(a):
    """Each piece's mask, cut in the table's order."""
    K = kinds(a)
    bg = background(a)
    claimed = np.zeros(K.shape, bool)
    masks = {}
    for n, (reg, take) in PIECES.items():
        r = region(reg)
        m = r & np.isin(K, take) & ~claimed & ~bg
        # His line round it, two pixels thick where he drew it doubled (not the line of a neighbour's colours).
        line = (K == 'line') & r & near8(m)
        others = ~m & (K != 'line') & (K != 'white') & ~bg
        line |= (K == 'line') & r & near8(line) & ~near8(others)
        masks[n] = m | line
        claimed |= m
    return K, bg, masks


def youth():
    """His picture cut into its pieces: {name: (mask, colours)}, with what is hidden filled in."""
    a = native()
    K, bg, M = label_map(a)
    black = his_line(a)

    def G(m, col, poly, way, close=True):
        hidden = region(poly) & ~bg
        return fill(a, m, col, hidden, black, way, close)

    P = {}
    P['fist_n'] = (M['fist_n'], a)
    P['fist_f'] = (M['fist_f'], a)
    P['belt'] = (M['belt'], a)
    # The jacket under the belt: continued down his panels and his shirt to its hem, closed there by his
    # line (worn without the belt, that is where it ends). Its near side under the near sleeve is
    # continued from his jacket beside it (our torso is a little broader there and shows when the near arm
    # swings away).
    # (The belt's top line, which the jacket's region holds, is the belt's: the jacket runs on under it.)
    m = M['jacket'] & ~((K == 'line') & near8(M['belt'] & (K != 'line')))
    m, c = G(m, a, box(40, 52, 62, JACKET_HEM + 1), 'down')
    m, c = G(m, c, box(40, 34, 45, 52), 'near')
    P['jacket'] = (m, c)
    # The far sleeve's top is under the jacket's far shoulder in his picture: the upper sleeve takes his
    # shoulder's pixels too (they are the same at rest), so a far arm swung forward is a whole sleeve up to
    # the shoulder, never cut off at the jacket's edge.
    M['sleeve_f'] = M['sleeve_f'] | (P['jacket'][0] & region(FAR_SHOULDER))
    for s in 'nf':
        m = M['sleeve_' + s]
        e = ELBOW[s.upper()]
        P['sleeve_up_' + s] = (split(m, box(0, 0, 100, e + 1)), a)
        P['sleeve_fore_' + s] = (split(m, box(0, e - 2, 100, 100)), a)
    # The trousers: each leg's side of his inseam, filled in under the belt (up from below, so his folds
    # run on up), then cut into the seat, the thighs and the shins; each wrap joins its shin.
    # (The pouches' outlines, which the trousers' region holds, are the belt's: the trousers run on under.)
    near = region(NEAR_LEG)
    pants = M['pants'] & ~((K == 'line') & near8(M['belt'] & (K != 'line')))
    legs = {}
    for s, poly in (('N', box(40, 53, 53, 66)), ('F', box(53, 53, 63, 66))):
        legs[s] = G(pants & (near if s == 'N' else ~near), a, poly, 'up')
    seat = (legs['N'][0] | legs['F'][0]) & region(box(0, 0, 100, HIP + 1))
    P['seat'] = (seat, np.where(legs['N'][0][..., None], legs['N'][1], legs['F'][1]))
    for s in 'NF':
        m, c = legs[s]
        k, sh = KNEE[s], LEG_SHIFT[s]
        thigh = split(m, box(0, HIP - 3, 100, k + 2 + sh))
        P['thigh_' + s.lower()] = (thigh, c)
        # The shin's top rows lie under the thigh at rest (hung `sh` lower): there they keep only what the
        # thigh covers, so at rest none of them shows past it; bent, they fill the knee.
        shin = split(m, box(0, k - 2, 100, 100))
        top = split(shin, box(0, 0, 100, k + 2))
        shin &= ~top | np.roll(thigh, -sh, 0)
        P['shin_' + s.lower()] = (shin | M['wrap_' + s.lower()], c)
    for s in 'NF':
        m = M['sandal_' + s.lower()]
        f = ANKLE[s]
        P['strap_' + s.lower()] = (split(m, box(0, 0, 100, f + 1)), a)
        P['foot_' + s.lower()] = (split(m, box(0, f, 100, 100)), a)
    return a, K, M, P, black


# ---------------------------------------------------------------------------------------------------
# Hair: the box it lies in, a pixel in the middle of the crown, his hair's kinds, where his hair is not
# taken (his brows: his eyes bring them), the near ear (left of his face, which his hair frames).
# ---------------------------------------------------------------------------------------------------
HAIR_BOX = box(30, 1, 66, 33)
HAIR_SEED = (50, 10)
HAIR_TAKE = ('violet', 'slate', 'blue', 'grey', 'pale')
NOT_HAIR = [box(46, 22, 54, 24), box(56, 23, 59, 24)]
EAR = box(39, 22, 46, 30)


def hair():
    """His hair lifted out: (front mask, back mask, colours, line mask). The front is every pixel of his
    hair (his colours joined to the crown, and his black line round them); the back is the same with what
    his face hides filled in (each hidden pixel takes the colour of his nearest strand above it, so his
    strands run on down), drawn behind the head (it shows only where a head is narrower than ours, and our
    skull is trimmed to it)."""
    a = native()
    K = kinds(a)
    H, W, _ = a.shape
    inbox = region(HAIR_BOX)
    off = np.zeros((H, W), bool)
    for p in NOT_HAIR:
        off |= region(p)
    colour = inbox & ~off & np.isin(K, HAIR_TAKE)
    hairm = np.zeros((H, W), bool)
    stack = [(HAIR_SEED[1], HAIR_SEED[0])]
    while stack:
        y, x = stack.pop()
        if not (0 <= y < H and 0 <= x < W) or hairm[y, x] or not colour[y, x]:
            continue
        hairm[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    line = (K == 'line') & inbox & near4(hairm) & ~off
    # His line doubled at the spikes' tips: the black touching his line goes too.
    for _ in range(2):
        line |= (K == 'line') & inbox & near8(line) & ~off
    front = hairm | line
    # Behind his face: from the top down to our lash row, between his hair's sides, and his ear.
    ny = face_anchor()[1]
    hidden = np.zeros((H, W), bool)
    for y in range(H):
        if y > ny:
            break
        cols = np.nonzero(front[y])[0]
        if len(cols):
            hidden[y, cols[0]:cols[-1] + 1] = True
    hidden |= region(EAR)
    hidden &= ~front & ~background(a)
    back, col = fill(a, front, a, hidden, his_line(a), 'down', close=False)
    dline = front & (K == 'line')
    return front, back, col, dline
