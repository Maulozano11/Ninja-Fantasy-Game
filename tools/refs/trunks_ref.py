"""Shared helpers for lifting the owner's two Trunks paint-overs (docs/reference/trunks2-owner-reference.jpg
and trunks3-owner-reference.jpg) into the clothes and hair they show.

Each picture (2000x2000) is our male in one look (idle frame 0, Solen's skin and face) painted over by
the owner in his own pixels of exactly 20 picture pixels (a 100 x 100 grid from the picture's corner,
measured: the edges between his pixels fall on every 20th picture column and row). One of his pixels is
one fine pixel of our sprites. Lined up with our male at idle frame 0 (his eyes on ours, his chest and
arms on ours), a pixel of his at (x, y) sits at (x + OFFSET[0], y + OFFSET[1]) of our 256 x 256 frame:

  trunks2   lilac hair, the traveller's hood-cape, the dark-blue short-sleeved shirt, the belt with its
            H buckle and pouches, black fingerless gloves, green cargo trousers, brown laced boots.
            OFFSET (75, 119).
  trunks3   golden spiky hair, the open blue jacket over a dark-grey shirt, dark purple trousers with
            a grey-buckled belt, tan open-toed boots. OFFSET (75, 117).

Both hold the ice-blue sword of our render (the ice crystal sword), which no piece takes.

His figure is ours from the head to the hips. His legs are a little shorter and stand a little wider
(his near foot about 3 px further back), and his far arm hangs where ours does give or take a pixel or
two. Every piece is pinned to our rig's joints where it lies at rest: its pivot is the cell of his
picture that our joint falls on (JOINTS), so at rest every pixel is his, where he drew it, and in other
poses it turns about our joint as our limb turns (src/sprite/painted.ts stampPiece).

T2 and T3 cut his figure into regions: each is a polygon of his picture (in his pixel corners) and the
kinds of colour it takes there (kind()), less what regions claimed before it took; it keeps only the
black line that bounds its own colours. trunks2() and trunks3() turn them into the pieces the items
stamp: where a piece is hidden in his picture (under the sword, the cape, the belt, a sleeve) it is
filled by continuing his pixels (fill()), and its new edge is closed with his black line. hair() lifts
his hair. One script per part (tools/refs/trunks-*-from-ref.py) writes its module.

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

PITCH = 20
REFS = {
    'trunks2': 'docs/reference/trunks2-owner-reference.jpg',
    'trunks3': 'docs/reference/trunks3-owner-reference.jpg',
}
OFFSET = {'trunks2': (75, 119), 'trunks3': (75, 117)}
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


def joints(pic):
    """Our male rig's joints at idle frame 0, in his pixels."""
    ox, oy = OFFSET[pic]
    return {k: (x - ox, y - oy) for k, (x, y) in FRAME_JOINTS.items()}


def face_anchor(pic):
    ox, oy = OFFSET[pic]
    return (FRAME_FACE_ANCHOR[0] - ox, FRAME_FACE_ANCHOR[1] - oy)


def native(pic):
    """His pixels: the median of each 20 x 20 block's interior (3 picture pixels in from its edges)."""
    a = np.asarray(Image.open(REFS[pic]).convert('RGB')).astype(np.int32)
    n = a.shape[0] // PITCH
    out = np.zeros((n, n, 3))
    for j in range(n):
        for i in range(n):
            c = a[j * PITCH + 3:(j + 1) * PITCH - 3, i * PITCH + 3:(i + 1) * PITCH - 3].reshape(-1, 3)
            out[j, i] = np.median(c, axis=0)
    return np.clip(np.round(out), 0, 255).astype(np.int32)


def kind(c):
    """What a colour of his is, by its hue: 'bg' (the white round him), 'line' (his black: every channel
    under 20), 'skin', 'grey' or 'pale' (no colour to speak of), 'red', 'brown', 'gold', 'green', 'cyan',
    'blue', 'violet' or 'purple'."""
    r, g, b = (int(v) for v in c)
    L = 0.299 * r + 0.587 * g + 0.114 * b
    if L > 235 and min(r, g, b) > 220:
        return 'bg'
    if max(r, g, b) < 20:
        return 'line'
    h, s, _v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    if s < 0.18:
        return 'pale' if L > 150 else 'grey'
    # His skin: lit or shaded, redder than his tans and browns (hue under 27 degrees) and not dark.
    if r > 150 and g > 90 and b > 70 and r - b > 40 and g < r - 20 and h * 360 < 27 and L > 118:
        return 'skin'
    hd = h * 360
    if hd < 15 or hd > 340:
        return 'red' if r > 120 and s > 0.6 else 'brown'
    if hd < 50:
        return 'gold' if (r > 170 and g > 110 and s > 0.6) else 'brown'
    if hd < 160:
        return 'green'
    if hd < 205:
        return 'cyan'
    if hd < 245:
        return 'blue' if L < 140 or s > 0.45 else 'cyan'
    if hd < 290:
        return 'violet'
    return 'purple'


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


def region(pts, shape=(100, 100)):
    """A union of polygons (a list of point lists) or one polygon, as a mask."""
    if pts and isinstance(pts[0][0], (int, float)):
        pts = [pts]
    m = np.zeros(shape, bool)
    for p in pts:
        m ^= inside(p, *shape)
    return m


def cut(a, K, spec, claimed, extra_line=None):
    """A piece's mask: in its region, the pixels of the kinds it takes that no piece took before, and his
    black line where it bounds them (inside the region, or within `extra_line` when given)."""
    reg = region(spec['region'])
    if 'not' in spec:
        reg &= ~region(spec['not'])
    m = reg & np.isin(K, spec['take']) & ~claimed
    zone = reg if extra_line is None else (reg | extra_line)
    line = (K == 'line') & zone & near8(m)
    return m | line


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
            q = min(cand)[1]
            out[y, x] = col[q, x]
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


def module(pic, doc, pieces, prefix, base_names, quantile=None):
    """A generated TypeScript module of one part's pieces.

    `pieces`: (CONST, mask, colours, doc, joint, rest angle, slot_of[, shift]): the piece hangs from the
    named rig joint (its pivot is the cell of his picture our joint falls on at rest, moved by `shift`
    fine pixels when given), `rest angle` is the angle its limb has in our idle (so at rest it is not
    turned), and slot_of(hex) names the colour slot that recolours each of its colours ('line' for his
    black line and whatever else stays as he drew it).

    It exports, for each slot in `base_names` (slot -> constant name), his colour the slot recolours
    from: his colour of middle lightness among that slot's pixels (or at `quantile[slot]`), counting only
    his own pixels, not those continued where a piece is hidden; with the slot at that colour every pixel
    is his. Then <prefix>_SLOT (each colour -> its slot) and <prefix>_REST (where each piece lands in our
    male idle frame 0, unturned: the fine pixel of its first row's first cell), which the tests check.
    """
    a = native(pic)
    J = joints(pic)
    ox, oy = OFFSET[pic]
    quantile = quantile or {}
    body, rest, slots, found = [], [], {}, {}
    for const, mask, col, pdoc, joint, ang, slot_of, *shift in pieces:
        # A pixel touching none of its piece's others (only a corner of them) would come loose as a stray
        # dot when the piece turns: it is left to the pieces round it.
        nb = np.zeros_like(mask)
        nb[1:] |= mask[:-1]
        nb[:-1] |= mask[1:]
        nb[:, 1:] |= mask[:, :-1]
        nb[:, :-1] |= mask[:, 1:]
        mask = mask & nb
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
        rest.append((const, (origin[0] + ox, origin[1] + oy)))
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
    out.append("/** Which colour slot recolours each of his colours ('line': his black line and what else stays as he drew it). */")
    out.append(f"export const {prefix}_SLOT: Record<string, {' | '.join(repr(n) for n in names)}> = {{")
    for h in sorted(slots):
        out.append(f"  '{h}': '{slots[h]}',")
    out += ['};', '']
    out.append("/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */")
    out.append(f'export const {prefix}_REST: Record<string, [number, number]> = {{')
    for const, (x, y) in rest:
        out.append(f'  {const}: [{x}, {y}],')
    out += ['};', '']
    out += body
    return '\n'.join(out), bases


def by_kind(table, default):
    """A slot_of: the slot named for his colour's kind in `table`, else `default` (his line stays)."""
    def slot_of(h):
        k = kind([int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)])
        return 'line' if k == 'line' else table.get(k, default)
    return slot_of


def run(pic, out_ts, doc, pieces, prefix, base_names, quantile=None, extra=''):
    """Writes the module (when `out_ts`; `extra` is more TypeScript put after the bases), prints the bases."""
    text, bases = module(pic, doc, pieces, prefix, base_names, quantile)
    if extra:
        i = text.index('/** Which colour slot')
        text = text[:i] + extra + '\n' + text[i:]
    if out_ts:
        write(out_ts, text)
    print('bases', bases)


def tones(mask, col, black, take=None):
    """His colours in tones for our hand pictures' shades (line, crease, shadow, base, light): his black
    line, then his darkest colour of the piece and those at a fifth, half and five sixths of its lightness."""
    found = sorted((float(luma(col[y, x])), hexc(col[y, x])) for y, x in zip(*np.nonzero(mask))
                   if kind(col[y, x]) != 'line' and (take is None or kind(col[y, x]) in take))
    return [hexc(black), found[0][1]] + [found[int(len(found) * q)][1] for q in (0.2, 0.5, 5 / 6)]


def angle(pic, a_name, b_name):
    J = joints(pic)
    (ax, ay), (bx, by) = J[a_name], J[b_name]
    return float(np.degrees(np.arctan2(by - ay, bx - ax)))


def study(a, layers, path, box=(14, 0, 86, 100)):
    """His picture beside the pieces lifted out (`layers`: (mask, colours), back to front), at 8x."""
    x0, y0, x1, y1 = box
    H, W = y1 - y0, x1 - x0
    lifted = np.full((H, W, 4), 0, np.uint8)
    for m, c in layers:
        for y, x in zip(*np.nonzero(m)):
            if y0 <= y < y1 and x0 <= x < x1:
                lifted[y - y0, x - x0, :3] = c[y, x]
                lifted[y - y0, x - x0, 3] = 255
    his = np.concatenate([a[y0:y1, x0:x1].astype(np.uint8), np.full((H, W, 1), 255, np.uint8)], axis=2)
    save(np.concatenate([his, np.zeros((H, 2, 4), np.uint8), lifted], axis=1), path)


# ---------------------------------------------------------------------------------------------------
# Trunks 2: the regions of his picture each piece is cut from (polygons in his pixel corners; a list of
# polygons is their even-odd union), the kinds of colour each takes, in the order they claim his
# pixels: a pixel goes to the first piece whose region holds it and whose kinds take it.
# ---------------------------------------------------------------------------------------------------

def box(x0, y0, x1, y1):
    """The pixels x0..x1-1, y0..y1-1 as a polygon."""
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


SKIN = ('skin', 'brown', 'red', 'purple')  # his skin and its shadows (inside an arm's region)
GLOVE = ('grey', 'skin', 'red', 'purple', 'pale')
BROWNS = ('brown', 'gold', 'red', 'purple', 'pale')

# name: (region, kinds it takes, region of the piece with what is hidden filled in or None, way to fill)
T2 = {
    'glove_n': ([(28, 51), (39, 51), (39, 61), (37, 61), (37, 66), (28, 66)], GLOVE + ('violet',), None, None),
    # The ice sword (our ice crystal sword, which he kept): no piece takes it.
    'sword': ([(21, 52), (29, 52), (29, 57), (38, 57), (44, 60), (77, 86), (77, 94), (66, 94), (40, 74), (30, 72), (29, 60), (21, 58)],
              ('cyan', 'blue', 'grey', 'pale', 'violet'), None, None),
    'belt': ([(40, 49), (62, 49), (62, 52), (65, 52), (65, 62), (60, 62), (60, 56), (48, 56), (48, 61), (40, 61)], BROWNS, None, None),
    'glove_f': ([(62, 50), (73, 50), (73, 63), (62, 63)], GLOVE + ('violet', 'blue', 'brown'), None, None),
    'cape_front': ([(33, 20), (43, 20), (43, 25), (46, 30), (56, 30), (56, 28), (57, 28), (57, 24), (61, 24), (61, 29), (63, 29), (63, 31), (58, 31),
                    (58, 32), (55, 34), (54, 35), (52, 36), (51, 37), (50, 38), (48, 39), (46, 40), (44, 41), (22, 41), (22, 35), (27, 30), (30, 25)],
                   ('brown', 'gold', 'purple', 'pale', 'grey'), None, None),
    'sleeve_n': ([(30, 38), (41, 38), (41, 43), (30, 43)], ('blue', 'violet', 'grey'), None, None),
    'sleeve_f': ([(59, 29), (66, 29), (66, 42), (59, 42)], ('blue', 'violet', 'grey'), None, None),
    # His bare arms down to the gloves' cuffs (rows 51 and 50 are the cuffs' line).
    'arm_n': ([(31, 41), (40, 41), (40, 45), (39, 45), (39, 51), (31, 51)], SKIN, None, None),
    'arm_f': ([(59, 38), (71, 38), (71, 50), (59, 50)], SKIN, None, None),
    'shirt': ([(40, 28), (60, 28), (60, 42), (62, 42), (62, 50), (61, 50), (61, 60), (40, 60)], ('blue', 'violet', 'grey'), None, None),
    'cape_back': ([(21, 40), (42, 40), (42, 62), (37, 62), (37, 90), (21, 90)], BROWNS + ('grey',),
                  [(22, 39), (41, 39), (41, 62), (37, 62), (37, 88), (30, 88), (24, 86), (21, 80), (21, 44)], 'near'),
    'pants': ([(30, 58), (70, 58), (70, 84), (30, 84)], ('green',), None, None),
    # The dark browns in the crotch between his legs are the inseam's shadow: the trousers take them.
    'seam': ([(52, 65), (56, 65), (56, 72), (55, 79), (56, 79), (56, 83), (47, 83), (47, 76), (52, 72)], ('brown', 'purple', 'red'), None, None),
    # The boots (the dark cloth between them, under the crotch, is the cape's inside: no piece takes it).
    'boots': ([box(30, 78, 48, 99), box(54, 79, 76, 99)], BROWNS + ('grey',), None, None),
}


def label_map(pic, spec):
    """Each piece's mask, cut in the table's order (the debug view's input)."""
    a = native(pic)
    K = kinds(a)
    claimed = np.zeros(K.shape, bool)
    masks = {}
    for n, (reg, take, _f, _w) in spec.items():
        m = cut(a, K, {'region': reg, 'take': take}, claimed)
        masks[n] = m
        claimed |= m & (K != 'line')
    return a, K, masks


def split(mask, poly):
    return mask & region(poly)


def grown(a, K, black, m, col, poly, way, close=True, gaps=None):
    """A piece with what is hidden inside `poly` (his figure there, not the white round him nor the white
    `gaps` he left inside it) filled in."""
    hidden = region(poly) & ~background(a)
    if gaps is not None:
        hidden &= ~gaps
    return fill(a, m, col, hidden, black, way, close)


# Trunks 2: where the pieces part and what is hidden that they continue (his pixel corners). A limb's two
# pieces overlap at the joint: at rest they are the same pixels of his, and when the joint bends the upper
# piece's end (drawn over the lower one) covers its outer corner, so no notch opens there.
T2_ELBOW = {'N': 46, 'F': 46}   # the upper arm's pieces end 2 rows under this row, the forearm's start 2 rows above
T2_NEAR_LEG = [(30, 58), (53, 58), (53, 72), (51, 80), (51, 84), (30, 84)]  # the near leg's side of his inseam
T2_KNEE = {'N': 75, 'F': 71}    # the thigh's pieces end 2 rows under this row, the shin's start 2 rows above
T2_HIP = 61                     # the seat's piece ends on this row, the thighs' start 3 rows above
T2_FOOT = {'N': 90, 'F': 88}    # the boot's shaft ends 2 rows under this row, its foot starts here


def trunks2():
    """His Trunks 2 picture cut into its pieces: {name: (mask, colours)}, with what is hidden filled in."""
    a, K, M = label_map('trunks2', T2)
    black = his_line(a)

    def G(m, col, poly, way, close=True):
        return grown(a, K, black, m, col, poly, way, close)

    # The sword's own black line (round its blade, guard and pommel) is not the cloth's under it: the
    # pieces it crosses are continued there.
    blade = M['sword'] & (K != 'line')
    for n in ('cape_back', 'pants', 'seam', 'boots'):
        M[n] = M[n] & ~((K == 'line') & near8(blade))
    M['pants'] = M['pants'] | M['seam']
    P = {}
    # The near fist keeps the sword's grip where it shows through his fingers (the same fist closes on
    # nothing); the far fist is as he drew it.
    P['glove_n'] = (M['glove_n'] | (M['sword'] & region(T2['glove_n'][0])), a)
    P['glove_f'] = (M['glove_f'], a)
    # The belt, with the buckle's white glint (as white as the paper round him, but inside his figure).
    P['belt'] = (M['belt'] | (region(T2['belt'][0]) & (K == 'bg') & ~background(a)), a)
    # The mantle: over the near shoulder (left of x 41) and round the neck as a hood.
    P['cape_shoulder'] = (split(M['cape_front'], box(0, 0, 41, 100)), a)
    P['cape_hood'] = (split(M['cape_front'], box(41, 0, 100, 100)), a)
    # The cloth behind the near arm, the near fist and the sword, continued up and down its folds.
    P['cape_back'] = G(M['cape_back'], a, T2['cape_back'][2], 'near')
    # The near sleeve: his hem under the mantle's edge, continued up over our near upper arm to the
    # shoulder (each column the colour of his hem below it), closed by his line.
    P['sleeve_n'] = G(M['sleeve_n'], a, [(33, 30), (41, 30), (41, 41), (31, 41), (31, 37), (33, 34)], 'up')
    # The far sleeve: its top under the hood continued up to our far shoulder.
    P['sleeve_f'] = G(M['sleeve_f'], a, box(58, 29, 64, 33), 'up')
    # His line down the sleeve's outer edge, where it touches none of the sleeve's colours.
    P['sleeve_f'] = (P['sleeve_f'][0] | ((K == 'line') & region(box(66, 37, 67, 39))), P['sleeve_f'][1])
    # His bare arms: upper arm and forearm, each forearm continued down to our wrist under his glove.
    for s, down in (('n', box(31, 51, 37, 57)), ('f', [(62, 50), (69, 50), (69, 56), (64, 56)])):
        m = M['arm_' + s]
        e = T2_ELBOW[s.upper()]
        P['arm_up_' + s] = (split(m, box(0, 0, 100, e + 3)), a)
        P['arm_fore_' + s] = G(split(m, box(0, e - 2, 100, 100)), a, down, 'down', close=False)
    # The shirt: under the belt and its pouches continued from above and below, then under the mantle
    # continued up to our neck and shoulders, closed there by his line (the neckline).
    m, c = G(M['shirt'], a, box(41, 49, 60, 58), 'near')
    m, c = G(m, c, [(40, 30), (44, 29), (58, 29), (58, 42), (40, 42)], 'up')
    # Our torso is broader than his under the far sleeve: the shirt takes his sleeve's pixels there too
    # (columns 59 and 60), so our skin never shows past it while the far arm hangs.
    m |= M['sleeve_f'] & region(box(59, 31, 61, 42))
    P['shirt'] = (m, c)
    # The trousers: each leg's side of his inseam, filled in under the sword (up and down his folds),
    # then cut into the seat, the thighs and the shins. The cape's inside he drew beside the near leg,
    # and his browns over the boots (outside the sword), stay his: the legs are not filled over them.
    legs = {}
    near = region(T2_NEAR_LEG)
    for s, poly in (('N', [(37, 59), (53, 59), (53, 72), (51, 80), (51, 83), (36, 83), (35, 81), (37, 70)]),
                    ('F', [(53, 59), (65, 59), (65, 63), (68, 63), (68, 80), (66, 81), (55, 81), (51, 83), (51, 80), (53, 72)])):
        legs[s] = grown(a, K, black, M['pants'] & (near if s == 'N' else ~near), a, poly, 'near', gaps=(M['cape_back'] | (np.isin(K, ('brown', 'gold', 'red', 'purple')) & ~region(T2['sword'][0]))) & ~M['pants'])
    seat = (legs['N'][0] | legs['F'][0]) & region(box(0, 0, 100, T2_HIP + 1))
    # The waist goes on up 3 rows under the shirt's hem (continued up his folds), so a bending body
    # never opens a gap between them.
    P['seat'] = G(seat, np.where(legs['N'][0][..., None], legs['N'][1], legs['F'][1]), box(41, 56, 61, 59), 'up', close=False)
    for s in 'NF':
        m, c = legs[s]
        k = T2_KNEE[s]
        P['thigh_' + s.lower()] = (split(m, box(0, T2_HIP - 3, 100, k + 3)), c)
        P['shin_' + s.lower()] = (split(m, box(0, k - 2, 100, 100)), c)
    # The boots: the far shaft's front under the sword continued up from below; each boot cut into its
    # shaft (turning with the shin) and its foot (flat on the ground).
    nb = split(M['boots'], box(0, 0, 52, 100))
    fb = G(split(M['boots'], box(52, 0, 100, 100)), a, box(56, 81, 66, 89), 'up')
    for s, (m, c) in (('n', (nb, a)), ('f', fb)):
        f = T2_FOOT[s.upper()]
        P['boot_shaft_' + s] = (split(m, box(0, 0, 100, f + 3)), c)
        P['boot_foot_' + s] = (split(m, box(0, f, 100, 100)), c)
    return a, K, M, P, black


# ---------------------------------------------------------------------------------------------------
# Trunks 3, as Trunks 2 above.
# ---------------------------------------------------------------------------------------------------
JACKET = ('blue', 'violet', 'cyan', 'grey', 'pale', 'purple')
T3 = {
    # His bare fists (the near one round the sword's grip).
    'fist_n': ([(26, 57), (39, 57), (39, 67), (26, 67)], SKIN, None, None),
    'fist_f': ([(64, 54), (74, 54), (74, 64), (64, 64)], SKIN, None, None),
    # The belt under the jacket's hem: its grey buckle and its dark leather (the trousers' waist).
    'belt': ([(44, 55), (62, 55), (62, 59), (44, 59)], ('grey', 'pale', 'violet', 'blue', 'purple'), None, None),
    # The sleeves (the near one left of his line at x 39-40, the far one right of his line at x 60-61).
    'sleeve_n': ([(26, 31), (41, 31), (41, 37), (40, 37), (40, 58), (26, 58)], JACKET, None, None),
    'sleeve_f': ([(61, 30), (75, 30), (75, 58), (61, 58)], JACKET, None, None),
    # The jacket's body and the grey shirt in its open front, the high collar round the neck.
    'jacket': ([(40, 28), (61, 28), (61, 59), (40, 59)], JACKET, None, None),
    # The ice sword (our crystal greatsword, repainted by him): no piece takes it.
    'sword': ([(20, 53), (30, 53), (31, 58), (40, 58), (47, 62), (81, 90), (81, 97), (70, 97), (42, 76), (32, 74), (30, 62), (20, 58)],
              ('cyan', 'blue', 'grey', 'pale'), None, None),
    'pants': ([(33, 57), (70, 57), (70, 82), (33, 82)], ('violet', 'purple', 'blue', 'grey'), None, None),
    # The darkest shadow on the far shin, over the boot, is a brown.
    'seam': (box(62, 74, 67, 77), ('brown',), None, None),
    # The boots, his toes bare in their open fronts.
    'boots': ([box(30, 77, 50, 99), box(54, 77, 76, 99)], BROWNS + ('grey', 'skin'), None, None),
}
T3_ELBOW = {'N': 48, 'F': 47}
T3_NEAR_LEG = [(30, 57), (53, 57), (53, 66), (50, 72), (50, 84), (30, 84)]
T3_KNEE = {'N': 76, 'F': 72}
T3_HIP = 60
T3_FOOT = {'N': 91, 'F': 89}


def trunks3():
    """His Trunks 3 picture cut into its pieces: {name: (mask, colours)}, with what is hidden filled in."""
    a, K, M = label_map('trunks3', T3)
    black = his_line(a)
    blade = M['sword'] & (K != 'line')
    # The white he left between the legs and between the arms and the body (not the blade's white
    # glints, inside the sword's outline): a gap, never filled.
    white = (luma(a) > 210) & np.isin(K, ('bg', 'pale'))
    gaps = white & ~(near8(blade) & region(T3['sword'][0]))

    def G(m, col, poly, way, close=True):
        return grown(a, K, black, m, col, poly, way, close, gaps)

    for n in ('pants', 'boots'):
        M[n] = M[n] & ~((K == 'line') & near8(blade))
    M['pants'] = M['pants'] | M['seam']
    P = {}
    # The fists: the near one keeps the sword's grip where it shows between his fingers (an empty near
    # fist is the far one, drawn by the jacket).
    P['fist_n'] = (M['fist_n'] | (M['sword'] & region(T3['fist_n'][0])), a)
    P['fist_f'] = (M['fist_f'], a)
    # The jacket's near side under the near sleeve, continued from his jacket beside it (our torso is a
    # little broader there, and shows when the near arm swings away).
    P['jacket'] = G(M['jacket'], a, box(38, 33, 42, 58), 'near')
    # Each sleeve's shoulder (its rows above our shoulder joint) stays with the jacket, as a shoulder
    # does: the upper sleeve starts a row above the joint, under it, and turns with the arm. The jacket
    # also keeps the far sleeve's inner edge down the side (columns 61 and 62), so a swinging far arm
    # never opens a slit between them.
    J = joints('trunks3')
    keep = M['sleeve_f'] & region(box(61, 30, 63, 58))
    for s in 'nf':
        m = M['sleeve_' + s]
        e = T3_ELBOW[s.upper()]
        sh = int(J['shoulder' + s.upper()][1])
        keep |= split(m, box(0, 0, 100, sh))
        P['sleeve_up_' + s] = (split(m, box(0, sh - 1, 100, e + 3)), a)
        P['sleeve_fore_' + s] = (split(m, box(0, e - 2, 100, 100)), a)
    jm, jc = P['jacket']
    P['jacket'] = (jm | keep, np.where(keep[..., None], a, jc))
    # Two bits of his black line touch no colour of a piece, so no piece took them: the collar's corner
    # over the near shoulder (with the jacket) and the far cuff's hem over the fist (with its sleeve).
    line = K == 'line'
    P['jacket'] = (P['jacket'][0] | (line & region(box(41, 31, 42, 32))), P['jacket'][1])
    P['sleeve_fore_f'] = (P['sleeve_fore_f'][0] | (line & region(box(62, 57, 64, 58))), a)
    # The trousers, filled in under the sword, cut as Trunks 2's; the belt rides the seat.
    legs = {}
    near = region(T3_NEAR_LEG)
    for s, poly in (('N', [(38, 59), (53, 59), (53, 66), (49, 72), (49, 80), (38, 80)]),
                    ('F', [(53, 59), (64, 59), (64, 63), (67, 63), (67, 79), (55, 79), (53, 72), (53, 66)])):
        legs[s] = G(M['pants'] & (near if s == 'N' else ~near), a, poly, 'near')
    seat = (legs['N'][0] | legs['F'][0]) & region(box(0, 0, 100, T3_HIP + 1))
    # The waist goes on up under the jacket's hem, 3 rows over the belt's top (continued up his folds),
    # so the jacket and the seat, each set on its own joint, never open a gap between them; not past the
    # jacket (his far sleeve's line is there).
    m, c = G(seat | M['belt'], np.where(legs['N'][0][..., None], legs['N'][1], legs['F'][1]), box(39, 52, 62, 58), 'up', close=False)
    P['seat'] = (m, c)
    for s in 'NF':
        m, c = legs[s]
        k = T3_KNEE[s]
        P['thigh_' + s.lower()] = (split(m, box(0, T3_HIP - 3, 100, k + 3)), c)
        P['shin_' + s.lower()] = (split(m, box(0, k - 2, 100, 100)), c)
    nb = split(M['boots'], box(0, 0, 52, 100))
    fb = G(split(M['boots'], box(52, 0, 100, 100)), a, box(57, 79, 67, 89), 'up')
    for s, (m, c) in (('n', (nb, a)), ('f', fb)):
        f = T3_FOOT[s.upper()]
        P['boot_shaft_' + s] = (split(m, box(0, 0, 100, f + 3)), c)
        P['boot_foot_' + s] = (split(m, box(0, f, 100, 100)), c)
    return a, K, M, P, black


# ---------------------------------------------------------------------------------------------------
# Hair: (box it lies in, a pixel in the middle of the crown, his hair's kinds, polygons where his hair
# is not taken (his eyes and brows: our face draws its own), the near ear (left of his face, which his
# hair frames) as a box, lightness under which his hair's own colours are its line).
# ---------------------------------------------------------------------------------------------------
HAIR = {
    # Lilac, drawn in navy shades with a navy-black line; his fringe ends at our lash row.
    'trunks2': (box(36, 1, 67, 26), (50, 8), ('violet', 'blue', 'pale', 'purple', 'cyan', 'grey'),
                [box(46, 21, 60, 26)], box(41, 19, 46, 25), 45),
    # Gold, drawn in oranges with a dark-brown line; his brows (the dark browns over his eyes) are not
    # hair, nor anything under our lash row between the eyes.
    'trunks3': (box(32, 1, 72, 28), (50, 10), ('gold', 'brown', 'pale'),
                [box(46, 22, 60, 28), [(47, 20), (57, 20), (57, 23), (47, 23)]], box(40, 21, 46, 27), 45),
}


def hair(pic):
    """His hair lifted out: (front mask, back mask, colours, line mask). The front is every pixel of his
    hair (his colours joined to the crown, and his black line round them); the back is the same with
    what his face hides filled in (each hidden pixel takes the colour of his nearest strand above it, so
    his strands run on down), drawn behind the head (it shows only where a head is narrower than ours,
    and our skull is trimmed to it)."""
    a = native(pic)
    K = kinds(a)
    H, W, _ = a.shape
    bx, seed, take, not_hair, ear, dark = HAIR[pic]
    inbox = region(bx)
    off = np.zeros((H, W), bool)
    for p in not_hair:
        off |= region(p)
    L = luma(a)
    # His skin's shadows round the ear are reddish browns: never hair (his hair's browns are oranges).
    hue = np.array([[colorsys.rgb_to_hsv(*(a[y, x] / 255))[0] * 360 for x in range(W)] for y in range(H)])
    reddish = ((hue < 18) | (hue > 330)) & (L > 40)
    colour = inbox & ~off & np.isin(K, take) & ~reddish
    hairm = np.zeros((H, W), bool)
    stack = [(seed[1], seed[0])]
    while stack:
        y, x = stack.pop()
        if not (0 <= y < H and 0 <= x < W) or hairm[y, x] or not colour[y, x]:
            continue
        hairm[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    line = (K == 'line') & inbox & near4(hairm) & ~off
    front = hairm | line
    # Behind his face: from the top down to our lash row, between his hair's sides, and his ear.
    ny = face_anchor(pic)[1]
    hidden = np.zeros((H, W), bool)
    for y in range(H):
        if y > ny:
            break
        cols = np.nonzero(front[y])[0]
        if len(cols):
            hidden[y, cols[0]:cols[-1] + 1] = True
    hidden |= region(ear)
    hidden &= ~front & ~background(a)
    back, col = fill(a, front, a, hidden, his_line(a), 'down', close=False)
    dline = front & (L < dark)
    return front, back, col, dline


def hair_module(pic, doc, prefix, front, back, col, dline, base_q=0.5):
    """The hair as the game's module, in the shape of src/sprite/items/valiantHairArt.ts: the front and the
    back sharing one palette, the pivot on our face anchor, his line's characters and his base colour."""
    import re
    rows, (ox, oy), palette = pack(col, back)
    fx, fy = face_anchor(pic)
    grid = [list(r) for r in rows]
    front_rows = [''.join(ch if front[oy + j, ox + i] else '.' for i, ch in enumerate(r)) for j, r in enumerate(grid)]
    line_chars = ''.join(sorted({rows[y - oy][x - ox] for y, x in zip(*np.nonzero(dline))}))
    a = native(pic)
    own = sorted((float(luma(a[y, x])), hexc(a[y, x])) for y, x in zip(*np.nonzero(front & ~dline)))
    want = own[int(len(own) * base_q)][1]
    dist = lambda h: sum(abs(int(h[i:i + 2], 16) - int(want[i:i + 2], 16)) for i in (1, 3, 5))  # noqa: E731
    base = min(sorted(v for k, v in palette.items() if k not in line_chars), key=dist)
    key = lambda k: k if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', k) else "'" + k + "'"  # noqa: E731
    out = [doc, "import type { PaintedPart } from './capeArt';", '',
           '/** One character per colour of his (both parts share them). */', f'const {prefix}_COLORS: Record<string, string> = {{']
    out += [f"  {key(k)}: '{v}'," for k, v in palette.items()]
    out += ['};', '']
    for part, name, pdoc in (
        (front_rows, f'{prefix}_FRONT', "Every pixel of his hair, over the head: his colours and his line. Its pivot is the cell on our face anchor (the near eye's lash start)."),
        (rows, f'{prefix}_BACK', 'His hair with what his face hides filled in, drawn behind the head; also his head\'s outline at the top.'),
    ):
        out += [f'/** {pdoc} */', f'export const {name}: PaintedPart = {{', f'  pivot: [{fx - ox}, {fy - oy}],', '  rows: [']
        out += [f"    '{r}'," for r in part]
        out += ['  ],', f'  colors: {prefix}_COLORS,', '};', '']
    out += ["/** His line's characters (his darkest colours): they keep their colour when the hair is recoloured. */",
            f"export const {prefix}_LINE = '{line_chars}';", '',
            '/** His colour of middle lightness: the colour slot\'s default; his other colours follow it. */',
            f"export const {prefix}_BASE = '{base}';", '']
    return '\n'.join(out), base


def hair_script(pic, prefix, what, script, argv):
    """What each hair script does: `argv` is [out.ts, study dir], both optional."""
    out_ts = argv[0] if len(argv) > 0 else None
    study_dir = argv[1] if len(argv) > 1 else None
    front, back, col, dline = hair(pic)
    doc = (f'// {what}, his pixels (tools/refs/{script} from\n'
           f'// {REFS[pic]}). Generated: rerun the script to change it.\n')
    text, base = hair_module(pic, doc, prefix, front, back, col, dline)
    if out_ts:
        write(out_ts, text)
    if study_dir:
        os.makedirs(study_dir, exist_ok=True)
        a = native(pic)
        study(a, [(back, np.where(front[..., None], col, col // 2)), (front, col)], os.path.join(study_dir, f'{prefix.lower()}@8.png'), (30, 0, 74, 32))
    print(prefix, 'front', int(front.sum()), 'back', int(back.sum()), 'base', base)
