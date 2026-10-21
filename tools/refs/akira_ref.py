"""Shared helpers for lifting parts out of the owner's Akira picture (docs/reference/akira-owner-reference.jpg).

His picture (2000x2000) is our Akira (preset_ember, male, idle frame 0) painted over by the owner, in
his own pixels of exactly 20 picture pixels each from the picture's corner (a 100 x 100 grid; the
inside of every cell is one colour): one of his pixels is one fine pixel of our sprites, as in his Aiden
and Roman pictures. Lined up with our Akira (his head, collar, chest, near arm and belt on ours), a
pixel of his at (x, y) sits at (x + OFFSET[0], y + OFFSET[1]) of our 256 x 256 frame. JOINTS are our
male rig's joints at that frame, in his pixels.

His head, torso, near arm and hips stand where ours do, so the hair, the armour's chest and near
shoulder guard, the near arm guard and the tassets hang from our joints exactly where he drew them.
He drew the far arm FAR_OUT from ours (a little nearer the body): its pieces are pinned there, and
follow our far arm's joints from there. His legs stand wider than ours (the near leg splayed out to
the left, the far foot lower): each leg piece is moved onto our leg (LEG_SHIFT), whole, so it bends
at our knee and stands on our ground.

PIECES cuts his figure into the pieces the items stamp (src/sprite/painted.ts): each is a region of
his picture (a polygon in his pixel corners) less what other pieces own there, keeping only the black
line that bounds its own colours. Where a piece is hidden in his picture (the chest under the near
shoulder guard, the tassets and legs behind the katana, the thighs under the tassets, the hilt in his
fist) it is filled by continuing his pixels.

Scripts import this with sys.path.insert(0, os.path.dirname(__file__)) and run with python3 -I.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

from aiden_ref import background, luma, save  # noqa: E402,F401
from roman_ref import hexc, inside, near4, near8, pack, ts_piece, write  # noqa: E402,F401

REF = 'docs/reference/akira-owner-reference.jpg'
PITCH = 20
OFFSET = (73, 120)
# Our male rig at idle frame 0, in his pixels (src/sprite/rig.ts drawRig, fine pixels less OFFSET).
JOINTS = {
    'head': (53.0, 18.0),
    'neck': (54.18, 27.65),
    'pelvis': (54.0, 56.87),
    'shoulderN': (41.01, 32.51),
    'shoulderF': (61.27, 31.81),
    'elbowN': (37.13, 44.50),
    'elbowF': (64.09, 44.08),
    'wristN': (34.62, 55.21),
    'wristF': (69.52, 53.65),
    'handN': (33.80, 58.72),
    'handF': (71.30, 56.78),
    'hipN': (48.58, 56.46),
    'hipF': (58.51, 53.12),
    'kneeN': (49.17, 72.65),
    'kneeF': (65.23, 67.86),
    'ankleN': (45.42, 87.59),
    'ankleF': (62.94, 83.08),
}


def native(path=REF):
    """His pixels: the median of each 20 x 20 cell's inside (3 px in from its edges), as an (H, W, 3) int array."""
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    n = a.shape[0] // PITCH
    out = np.zeros((n, n, 3))
    for j in range(n):
        for i in range(n):
            c = a[j * PITCH + 3:(j + 1) * PITCH - 3, i * PITCH + 3:(i + 1) * PITCH - 3].reshape(-1, 3)
            out[j, i] = np.median(c, axis=0)
    return np.clip(np.round(out), 0, 255).astype(np.int32)


def kind(c):
    """What a colour of his is: 'white' (round him), 'line' (his black), 'hair' (his blue-blacks, and
    the blue-grey shadow of a stud), 'red' (the flames' and tassel's reds), 'gold', 'grey' (steel:
    studs, buckle, blade), 'cream' (the hilt's wrap), 'skin' or 'leather' (his browns)."""
    r, g, b = (int(v) for v in c)
    L = 0.299 * r + 0.587 * g + 0.114 * b
    mx, mn = max(r, g, b), min(r, g, b)
    if L > 228 and mx - mn < 20:
        return 'white'
    if mx < 40:
        return 'line'
    if b > r + 4 and L < 110:
        return 'hair'
    if r > 120 and g < 0.4 * r and b < 0.4 * r:
        return 'red'
    if r > 180 and g > 120 and b < 0.55 * g and r - b > 90:
        return 'gold'
    if mx - mn < 30 and L > 80:
        return 'grey'
    if r > 170 and g > 150 and b > 120:
        return 'cream'
    if r >= 150 and g >= 90 and b >= 70 and r - b < 120:
        return 'skin'
    return 'leather'


def kinds(a):
    return np.array([[kind(a[y, x]) for x in range(a.shape[1])] for y in range(a.shape[0])])


def angle(a_name, b_name):
    (ax, ay), (bx, by) = JOINTS[a_name], JOINTS[b_name]
    return float(np.degrees(np.arctan2(by - ay, bx - ax)))


def his_line(a, K):
    """His black line: the commonest of his line colours."""
    seen = {}
    for y, x in zip(*np.nonzero(K == 'line')):
        t = tuple(int(v) for v in a[y, x])
        seen[t] = seen.get(t, 0) + 1
    return np.array(max(sorted(seen), key=lambda t: seen[t]))


def components(m):
    """Connected (4-way) parts of a mask: a label array and the count."""
    H, W = m.shape
    lab = np.zeros((H, W), int)
    n = 0
    for y, x in zip(*np.nonzero(m)):
        if lab[y, x]:
            continue
        n += 1
        stack = [(y, x)]
        while stack:
            q, p = stack.pop()
            if 0 <= q < H and 0 <= p < W and m[q, p] and not lab[q, p]:
                lab[q, p] = n
                stack += [(q + 1, p), (q - 1, p), (q, p + 1), (q, p - 1)]
    return lab, n


def clone_fill(src, col, hidden, src_ok, shifts):
    """Fills each connected patch of `hidden` (in `col`) by cloning pixels of `src`: one shift (dx, dy)
    for the whole patch, the first of `shifts` that finds the most of the patch in `src_ok` (so his
    texture and lines run on unbroken); a pixel whose source is not there takes the nearest source
    pixel in its row, else in its column, else anywhere."""
    H, W = hidden.shape
    lab, n = components(hidden)
    for k in range(1, n + 1):
        pts = list(zip(*np.nonzero(lab == k)))
        ok = lambda y, x, d: 0 <= y + d[1] < H and 0 <= x + d[0] < W and src_ok[y + d[1], x + d[0]]
        d = max(shifts, key=lambda d: (sum(1 for y, x in pts if ok(y, x, d)), -shifts.index(d)))
        for y, x in pts:
            if ok(y, x, d):
                col[y, x] = src[y + d[1], x + d[0]]
                continue
            xs = np.nonzero(src_ok[y])[0]
            if len(xs):
                col[y, x] = src[y, xs[np.argmin(np.abs(xs - x))]]
                continue
            ys = np.nonzero(src_ok[:, x])[0]
            if len(ys):
                col[y, x] = src[ys[np.argmin(np.abs(ys - y))], x]
                continue
            qy, qx = np.nonzero(src_ok)
            i = int(np.argmin((qy - y) ** 2 + (qx - x) ** 2))
            col[y, x] = src[qy[i], qx[i]]
    return col


def bounding_line(m, K, region, bg):
    """His black line pixels in (or one pixel round) `region` that touch the piece's colours `m` side on."""
    grown = near8(region)
    return (K == 'line') & grown & near4(m) & ~bg & ~m


def pivot_cell(joint, shift=(0, 0)):
    """The cell of his picture that lands on our joint when the piece is moved by `shift` (his pixels)."""
    return (joint[0] - shift[0], joint[1] - shift[1])


def module(doc, consts, bases, kinds_of, prefix, extra=''):
    """A generated TypeScript module: his colours each slot recolours from (`bases`, name -> hex), what
    each of his colours is (`<prefix>_KIND`, hex -> kind), the pieces (`consts`: (CONST, mask, colours,
    doc, pivot in his pixels, angle, shift)) and where each piece lands in our idle frame 0, where he drew it
    (`<prefix>_REST`: the fine pixel of its first row's first cell)."""
    out = [doc, "import type { PaintedPiece } from '../painted';", '']
    out.append('/** His colours the colour slots recolour from (at these, every pixel is his). */')
    for k, v in bases.items():
        out.append(f"export const {k} = '{v}';")
    out.append('')
    if extra:
        out += [extra, '']
    found = {}
    body = []
    rest = []
    for const, mask, col, pdoc, pivot, ang, shift in consts:
        rows, origin, palette = pack(col, mask)
        for h in palette.values():
            found[h] = kinds_of(h)
        body.append(ts_piece(const, pdoc, rows, origin, palette, pivot, ang))
        rest.append((const, [origin[i] + OFFSET[i] for i in (0, 1)]))
    kset = sorted(set(found.values()))
    out.append('/** What each of his colours is, as the script sorts them. */')
    out.append(f"export const {prefix}_KIND: Record<string, {' | '.join(repr(k) for k in kset)}> = {{")
    for h in sorted(found):
        out.append(f"  '{h}': '{found[h]}',")
    out += ['};', '']
    out.append("/** Where each piece lands in Akira's idle frame 0 (male), where he drew it: the fine pixel of its first row's first cell. */")
    out.append(f'export const {prefix}_REST: Record<string, [number, number]> = {{')
    for const, (x, y) in rest:
        out.append(f'  {const}: [{x}, {y}],')
    out += ['};', '']
    out += body
    return "\n".join(out)


def middle(a, pairs, wanted, q=0.5):
    """His colour of middle lightness (with `q`, that fraction darker) among his own pixels of the
    `wanted` kinds in these (mask, colours) pieces: the base a colour slot recolours from."""
    found = []
    for m, col in pairs:
        for y, x in zip(*np.nonzero(m)):
            if (col[y, x] == a[y, x]).all() and kind(col[y, x]) in wanted:
                found.append((float(luma(col[y, x])), hexc(col[y, x])))
    found.sort()
    return found[int(len(found) * q)][1]


def study(a, layers, path, box=(16, 0, 84, 100), k=8):
    """His picture beside the pieces lifted out of it (`layers`: (mask, colours, shift) back to front;
    with `shift`, where they land on our figure), at `k`x."""
    x0, y0, x1, y1 = box
    H, W = y1 - y0, x1 - x0
    lifted = np.zeros((H, W, 4), np.uint8)
    for m, col, shift in layers:
        for y, x in zip(*np.nonzero(m)):
            X, Y = x + int(shift[0]) - x0, y + int(shift[1]) - y0
            if 0 <= Y < H and 0 <= X < W:
                lifted[Y, X, :3] = col[y, x]
                lifted[Y, X, 3] = 255
    his = np.concatenate([a[y0:y1, x0:x1].astype(np.uint8), np.full((H, W, 1), 255, np.uint8)], axis=2)
    save(np.concatenate([his, np.zeros((H, 2, 4), np.uint8), lifted], axis=1), path, k)


def his_background(a, K):
    """The white round him: his white cells reached from the picture's edge (side on). The white
    glints inside his figure (the blade's edge, the buckle, the wrap) are closed in by his line."""
    H, W = K.shape
    white = K == 'white'
    bg = np.zeros((H, W), bool)
    stack = [(y, x) for y in (0, H - 1) for x in range(W)] + [(y, x) for x in (0, W - 1) for y in range(H)]
    while stack:
        y, x = stack.pop()
        if not (0 <= y < H and 0 <= x < W) or bg[y, x] or not white[y, x]:
            continue
        bg[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    return bg


# The katana's blade colours: his steel greys, blue-greys and the white glints on its edge.
BLADE_KINDS = ('grey', 'hair', 'white')
# The regions of his picture each piece is cut from (polygons on his pixels' corners: a cell is in when
# its middle is), in the order they
# claim his colours: a cell goes to the first region that holds it and takes its kind ('all': every
# cell of his there, his black inside it too). Then each piece takes the black line round its colours.
REGIONS = [
    # the katana: the pommel with its red tassel and the wrap up to his forearm; the guard ring and the
    # wrap between his fist and the guard; the blade
    ('katana', [(19, 50), (31, 50), (31, 54), (32, 54), (32, 57), (31, 57), (31, 60), (30, 60), (30, 64), (19, 64)], 'all'),
    ('katana', [(35, 60), (45, 60), (45, 70), (35, 70)], 'all'),
    ('katana', [(41, 64), (47, 64), (84, 91), (84, 95), (78, 95), (39, 68)], BLADE_KINDS),
    # the armour: the near shoulder guard (with the dark band of the upper arm under it), the far one
    # (likewise), the chest from the high collar to the belt
    ('pauldron_n', [(28, 27), (46, 27), (46, 44), (42, 44), (42, 46), (28, 46)], 'colours'),
    ('pauldron_f', [(62, 26), (73, 26), (73, 45), (63, 45), (63, 31), (62, 31)], 'colours'),
    ('chest', [(43, 25), (49, 25), (49, 27), (59, 27), (59, 26), (63, 26), (63, 46), (62, 46), (62, 55), (48, 55),
               (48, 56), (42, 56), (42, 44), (46, 44), (46, 29), (43, 29)], 'colours'),
    # the arm guards, down to the near cuff and the cuff over the back of the far hand
    ('bracer_n', [(28, 46), (42, 46), (42, 59), (39, 59), (39, 60), (31, 60), (31, 59), (28, 59)], 'colours'),
    ('bracer_f', [(63, 45), (73, 45), (73, 59), (68, 59), (68, 56), (62, 56), (62, 46), (63, 46)], 'leather'),
    # his fists (skin): the near one round the katana's grip, the far one under the far cuff
    ('fist_n', [(29, 60), (37, 60), (37, 65), (29, 65)], 'colours'),
    ('fist_f', [(64, 55), (72, 55), (72, 62), (64, 62)], 'colours'),
    # the tassets: the near and far plates with the dark strips between them
    ('tassets', [(42, 55), (66, 55), (66, 62), (67, 62), (67, 69), (54, 69), (54, 66), (42, 66)], 'colours'),
    # the legs: the near thigh to the middle of his knee plate, the near shin to the boot; the far leg
    # from the tassets to the sandal (all of it below our far knee)
    ('thigh_n', [(36, 66), (54, 66), (54, 74), (36, 74)], 'colours'),
    ('shin_n', [(34, 74), (49, 74), (49, 89), (34, 89)], 'colours'),
    ('leg_f', [(54, 69), (68, 69), (68, 88), (54, 88)], 'colours'),
    # the near boot and the far sandal
    ('boot_n', [(33, 89), (48, 89), (48, 100), (33, 100)], 'colours'),
    ('sandal_f', [(54, 88), (74, 88), (74, 98), (54, 98)], 'colours'),
]
# His face (our body's): no piece takes it.
FACE = lambda x, y: (y <= 26 and 49 <= x <= 58) or (y == 27 and 50 <= x <= 57)


def owners(a, K, bg):
    """{piece: mask of the cells of his it owns (its colours)} and the union of regions per piece."""
    H, W = K.shape
    taken = np.zeros((H, W), bool)
    masks, regions = {}, {}
    for name, poly, takes in REGIONS:
        reg = inside(poly, H, W)
        regions[name] = regions.get(name, np.zeros((H, W), bool)) | reg
        if takes == 'all':
            ok = ~bg
        elif takes == 'colours':
            ok = ~bg & (K != 'line')
        elif takes == 'leather':
            ok = ~bg & (K != 'line') & (K != 'skin')
        else:
            ok = ~bg & np.isin(K, takes)
        m = reg & ok & ~taken
        for y, x in zip(*np.nonzero(m)):
            if FACE(x, y):
                m[y, x] = False
        taken |= m
        masks[name] = masks.get(name, np.zeros((H, W), bool)) | m
    return masks, regions




# The glint on the belt's steel buckle: the one white cell of his inside the figure that is not a gap.
BUCKLE_GLINT = (54, 50)


def figure_background(a, K):
    """The white round him and the white gaps he left inside his figure (between the near arm and the
    chest, between the legs): his white, less the glints inside the katana's regions and on the buckle."""
    H, W = K.shape
    bg = his_background(a, K)
    kat = np.zeros((H, W), bool)
    for name, poly, _ in REGIONS:
        if name == 'katana':
            kat |= inside(poly, H, W)
    white = (K == 'white') & ~bg
    # in the katana's regions a white cell is a glint when it touches the katana's colours side on (the
    # blade's steel, the wrap), or such a glint (the blade's edge is up to three cells of white); one
    # between his lines only is a gap, as elsewhere
    steel = np.isin(K, ('grey', 'hair', 'cream', 'gold'))
    glint = kat & white & near4(steel)
    for _ in range(2):
        glint |= kat & white & near4(glint)
    white &= ~glint
    white[BUCKLE_GLINT[1], BUCKLE_GLINT[0]] = False
    return bg | white


# The katana's axis in his picture (his pixels): through the middle of the pommel and of the guard ring.
KATANA_AXIS = ((25.5, 52.0), (40.0, 64.5))
# The wrap hidden in his fist and under his forearm: cells within HILT_HALF of the axis, from x 30.5 to
# x 37 along it, each taking his wrap (and its lines) further up the axis.
HILT_HALF = 2.0
HILT_SPAN = (30.5, 37.0)
# The chest under the near shoulder guard: from his chest's left line (x 46) back to a new left line on
# CHEST_EDGE, rows CHEST_HIDDEN, each cell taking the chest cell 46 - CHEST_EDGE to its right.
CHEST_EDGE = 41
CHEST_HIDDEN = (29, 43)
# The near tassets behind the guard ring and the blade: from their left line (x 41, as above the guard)
# down to the plates' bottom line (row 65).
TASSET_EDGE = 41
TASSET_HIDDEN = (60, 65)
# The tassets go on up under the belt from this row, as far right as the belt's right edge (CHEST_RIGHT;
# past it is the far arm guard, which hangs behind them).
TASSET_UNDER_BELT = 51
CHEST_RIGHT = 61
# The legs as they would show without the katana and the tassets (polygons on his pixels' corners),
# kept inside what his tassets, katana and hand cover (behind the far arm and in the white gap by the
# near arm nothing is added): the near thigh from the hip (row 56) to the middle of his knee plate, the
# far leg from under the tassets to the sandal, and the far thigh above it up to the belt (row 55).
THIGH_N_SHAPE = [(42, 56), (53, 56), (53, 70), (48, 74), (38, 74), (38, 60), (42, 60)]
LEG_F_SHAPE = [(54, 69), (67, 69), (67, 77), (64, 81), (64, 88), (56, 88), (55, 80), (54, 74)]
THIGH_F_SHAPE = [(54, 55), (62, 55), (62, 62), (64, 62), (64, 69), (54, 69)]


def pieces(a):
    """His figure cut into pieces: {name: mask}, {name: colours} (his pixels, and his pixels continued
    where the piece is hidden) and {name: mask of the continued cells}."""
    H, W, _ = a.shape
    K = kinds(a)
    bg = figure_background(a, K)
    own, regions = owners(a, K, bg)
    line = (K == 'line') & ~bg
    taken_all = np.zeros((H, W), bool)
    for name, poly, takes in REGIONS:
        if takes == 'all':
            taken_all |= inside(poly, H, W) & ~bg
    colour = np.zeros((H, W), bool)
    for m in own.values():
        colour |= m
    masks, cols, filled = {}, {}, {}
    for n, m in own.items():
        # his line round its colours (where the blade crosses a leg, the leg's line is the blade's too), and
        # inside its region the line that bounds no colour at all (his thick lines between plates)
        lm = line & near8(regions[n]) & near8(m)
        if n != 'katana':
            lm |= line & regions[n] & ~taken_all & ~near8(colour)
        masks[n] = m | lm
        cols[n] = a.copy()
        filled[n] = np.zeros((H, W), bool)
    # his line cells below the chin no piece took (between two pieces at a corner): to the piece with
    # most of its cells round them (above the chin is his hair's and our face's)
    names = list(masks)
    for y, x in zip(*np.nonzero(line)):
        if y < 28 or any(masks[n][y, x] for n in names):
            continue
        y0, y1, x0, x1 = max(0, y - 1), y + 2, max(0, x - 1), x + 2
        best = max(names, key=lambda n: (int(masks[n][y0:y1, x0:x1].sum()), -names.index(n)))
        if masks[best][y0:y1, x0:x1].any():
            masks[best][y, x] = True
    black = his_line(a, K)
    ys, xs = np.mgrid[0:H, 0:W]

    def fill(n, hidden, shifts, src=None):
        # only where something of his covers it: never over the white he left round and inside his figure
        hidden = hidden & ~masks[n] & ~bg
        if not hidden.any():
            return
        ok = masks[n] & ~filled[n] if src is None else src
        clone_fill(cols[n], cols[n], hidden, ok, shifts)
        masks[n] |= hidden
        filled[n] |= hidden

    def close(n):
        """His black line where a continued cell meets the outside."""
        m = masks[n]
        out = ~m
        edge = filled[n] & (np.roll(out, 1, 0) | np.roll(out, -1, 0) | np.roll(out, 1, 1) | np.roll(out, -1, 1))
        cols[n][edge] = black

    # the wrap hidden in his fist and under his forearm: his wrap and its lines cloned on along the axis
    (x0, y0), (x1, y1) = KATANA_AXIS
    ux, uy = x1 - x0, y1 - y0
    L = np.hypot(ux, uy)
    ux, uy = ux / L, uy / L
    cx, cy = xs + 0.5 - x0, ys + 0.5 - y0
    along = cx * ux + cy * uy
    across = np.abs(-cx * uy + cy * ux)
    s0 = (HILT_SPAN[0] - x0) / ux
    s1 = (HILT_SPAN[1] - x0) / ux
    hilt = (across <= HILT_HALF + 0.5) & (along >= s0) & (along <= s1)
    fill('katana', hilt, [(-int(round(k * ux)), -int(round(k * uy))) for k in range(3, 12)])

    # the chest under the near shoulder guard
    r0, r1 = CHEST_HIDDEN
    fill('chest', (ys >= r0) & (ys <= r1) & (xs >= CHEST_EDGE) & (xs < 46), [(46 - CHEST_EDGE, 0)])

    # the near tassets behind the guard and blade, closed by their left line and their bottom line
    r0, r1 = TASSET_HIDDEN
    t = masks['tassets'].copy()
    hid = np.zeros((H, W), bool)
    for y in range(r0, r1 + 1):
        vis = np.nonzero(t[y] & (xs[y] > 45))[0]
        hid[y, TASSET_EDGE:vis.min() if len(vis) else 50] = True
    fill('tassets', hid, [(d, 0) for d in range(4, 12)] + [(0, -d) for d in range(4, 8)])
    for y in range(r0, r1 + 1):
        if filled['tassets'][y, TASSET_EDGE]:
            cols['tassets'][y, TASSET_EDGE] = black
    for x in range(TASSET_EDGE, 50):
        if filled['tassets'][r1, x]:
            cols['tassets'][r1, x] = black

    # the tassets' top rows go on up under the belt (TASSET_UNDER_BELT rows, his top rows cloned up), so
    # a torso that lifts or stretches (the bulky body's victory) shows tassets under the belt, not a gap
    r0 = TASSET_UNDER_BELT
    top = masks['tassets'] & (ys == 56)
    cols_t = np.nonzero(top.any(axis=0))[0]
    hid = (ys >= r0) & (ys < 55) & (xs >= cols_t.min()) & (xs <= min(cols_t.max(), CHEST_RIGHT))
    fill('tassets', hid, [(0, d) for d in range(55 - r0, 55 - r0 + 6)])

    # the near thigh behind the guard and the blade, then up under the tassets to the hip
    # (nearly all of it is hidden: it takes the layered leather of his near shin below it, not its stud,
    # the one shift that finds the most of it there)
    shape = inside(THIGH_N_SHAPE, H, W)
    shin = masks['shin_n'] & (K != 'line') & (K != 'gold') & (ys >= 76)
    fill('thigh_n', shape, [(dx, dy) for dy in range(8, 24) for dx in range(-6, 3)], src=shin)
    close('thigh_n')

    # the far leg behind the blade
    shape = inside(LEG_F_SHAPE, H, W)
    fill('leg_f', shape, [(0, -d) for d in range(3, 9)] + [(0, d) for d in range(3, 9)] + [(-d, 0) for d in range(3, 7)] + [(d, 0) for d in range(3, 7)])
    close('leg_f')

    # the far thigh, all of it under the tassets: the top of his far leg continued up
    shape = inside(THIGH_F_SHAPE, H, W)
    top = int(np.nonzero(masks['leg_f'].any(axis=1))[0].min())
    masks['thigh_f'] = np.zeros((H, W), bool)
    cols['thigh_f'] = cols['leg_f'].copy()
    filled['thigh_f'] = np.zeros((H, W), bool)
    fill('thigh_f', shape, [(0, d) for d in range(4, 30)], src=masks['leg_f'] & (ys >= top + 1) & (ys < top + 9))
    close('thigh_f')
    return masks, cols, filled


def rgb(h):
    return [int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)]


def hex_luma(h):
    r, g, b = rgb(h)
    return 0.299 * r + 0.587 * g + 0.114 * b


# Where his legs stand against ours (his pixels): each leg's pieces are moved this far, whole, onto our
# leg, so his knee and ankle land on ours and his soles on our ground. His near leg is splayed out to
# the left of ours; his far leg is drawn lower (his far sole 4 px under ours) and further left.
LEG_SHIFT = {'N': (5, 0), 'F': (4, -4)}
# His far arm hangs straighter than ours: his elbow is ours, his fist (the middle of his far fist) is
# nearer the body and lower than our far hand. His far arm guard is drawn at his angle and pinned at
# our elbow, his far fist with it in place of our far hand (turned with the forearm in other poses).
FAR_FIST = (67.5, 58.0)
# The skin of the figure he painted over (our Akira's): his skin pixels are for this skin colour, and
# follow the character's skin from it.
PAINTED_SKIN = '#f0c4a0'


def run(doc, prefix, consts, bases, kinds_of, extra=''):
    """Writes the module (argv[1]) and, with argv[2] (a folder), his figure beside the pieces at 8x."""
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study_dir = sys.argv[2] if len(sys.argv) > 2 else None
    text = module(doc, consts, bases, kinds_of, prefix, extra)
    if out_ts:
        write(out_ts, text)
    if study_dir:
        os.makedirs(study_dir, exist_ok=True)
        study(native(), [(c[1], c[2], (0, 0)) for c in consts], os.path.join(study_dir, prefix.lower() + "@8.png"))
    print('bases', bases)
