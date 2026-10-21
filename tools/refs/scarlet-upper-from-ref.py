"""The owner's Scarlet's upper clothes (docs/reference/scarlet-owner-reference.jpg) as two items: his
white shirt with the red cravat (top_noble_shirt) and his long black coat with the gold trim
(armor_scarlet_coat), without the cape (the owner did not want it).

His picture is his own pixel art at about 1.8 of his pixels to one of ours (scarlet_ref.py), so his
clothes are not copied 1:1: they are the reduced reference's (scarlet-study.py: the coat, shirt and
cravat at 0.57 across, his sleeves along our arms, every pixel one of his colours, his gold trims
unbroken lines). This script cuts them out of it into pieces that ride our rig, each laid on our male
at idle frame 0 as the reduced reference has it, so that there every pixel is the reduced
reference's:

  coat body     collar, lapels with their gold checker, the gold-edged fronts and   torso.armor
                the coat's sides down to the belt (pivot: the neck); with its hull,
                the body with the opening filled, outside which our torso is taken
                away in a pose
  coat skirts   from the waist to the tattered hem, both fronts edged in gold, the  torso.armor
                far one's lining showing inside it; bent to the pose like our
                skirts (columns hung from the waist, src/sprite/items/armor.ts)
  coat back     the back of the coat between the legs (his purple lining), behind   capeBack
                them, bent like the skirts
  coat sleeves  upper arm (pivot: the shoulder) and forearm with its gold-trimmed   nearArm.armor /
                cuff (pivot: the elbow), on each arm (our far arm wears his near     farArm.armor
                sleeve, as in the study)
  shirt body    his shirt and cravat in the coat's opening, and his neck's skin in   torso.top
                the open collar (pivot: the neck)
  shirt sleeves upper arm and forearm with a cuff, on each arm                       nearArm.cloth /
                                                                                     farArm.cloth

What his picture hides is filled in his colours, on our body's shape (<maps>: our male at idle
frame 0 as maps of body parts, tools/refs/scarlet-body-map.mts): the coat body covers our torso and a
pixel round it (his cloth nearest it under the near sleeve; where our torso is drawn over his far
sleeve, his sleeve's pixels), and the far sleeve our far arm and a pixel round it, so a turned piece
never lets our body show past it; the shirt under the coat and the shirt's sleeves (his are under the
coat's) are our body's shape and a pixel round it in his whites, lit as his shirt front is, with the
cravat wrapped round the neck; the coat's back between the legs is his lining, carried on behind the
legs. A piece's edge that his picture hides takes his black line, so it is outlined when another pose
shows it. His belt, its buckle, cross and tassel stay out (they are the trousers'), and so does
whatever lies under what our game draws behind the coat (the far arm and glove, the legs) or in front
of the sleeves (the sword and the near glove): there the reduced reference is the other part's.

Each piece's colours are his; the colour slots retint them (src/sprite/color.ts retintHex): Coat moves
his cloth, Trim his gold, Shirt his whites, Cravat his reds; his black line stays, and the skin in
the open collar follows the skin tone.

It writes, in <out>/:

  pieces@4.png    every piece on its own (what is filled in marked in the second copy)
  coat@8.png      the coat's pieces stacked as the game stacks them, beside the reduced reference
  shirt@8.png     the shirt's pieces stacked

and, with two more arguments, the game's modules (src/sprite/items/scarletCoatArt.ts and
src/sprite/items/nobleShirtArt.ts). The same picture always gives the same bytes. Run from the
repository root with python3 -I:

  npx tsx tools/refs/scarlet-body-map.mts <maps>
  python3 -I tools/refs/scarlet-upper-from-ref.py <out> <maps> [coat.ts shirt.ts]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

import scarlet_ref as R  # noqa: E402

G = R.GRID
J = R.OUR_JOINTS
NONE = 255


def ci(ch):
    """A colour of his by its character (scarlet_ref.CHARS)."""
    return R.CHARS.index(ch)


def kind_set(chars):
    return np.array([ci(c) for c in chars])


# His colours by what they are on him (characters of scarlet_ref.CHARS): his black line; his coat's
# cloth (greys and the dark purples of its lining); his gold trim; his shirt's whites; his cravat's
# reds; his skin.
LINE = 'a'
CLOTH = 'bdefhjnptBH'
GOLD = 'SOJFyvm'
WHITE = '7530YVRN'
RED = 'cikrsulx'
SKIN = 'zUXZMQq246'

# The colour slots' defaults: his most common cloth, his middle gold, his shirt's middle white, his
# cravat's lit red. Recoloured, each of his shades moves as far from the slot's colour as his was
# from this one.
COAT = '#1a191e'
TRIM = '#846542'
SHIRT = '#cfc9c8'
CRAVAT = '#7c1e2c'

# His belt in the coat's opening (x0, y0, x1, y1, inclusive): its strap and buckle between the
# coat's fronts; below it, between the skirts, his belt's cross, its small gold piece and its
# tassel. They are the trousers' (scarlet-study.py), not the coat's.
BELT = (126, 172, 132, 175)
BELT_HANG = (121, 176, 133, 202)
# The coat's body is above this row, its skirts from it down (they overlap on the belt's rows, where
# the skirts hang from the waist): the waist line the skirts hang from, row 172, is where his belt's
# top edge is.
SKIRT_TOP = 172
BODY_BOTTOM = 175
# The open collar: his shirt's whites, his cravat and his neck's skin between the coat's fronts.
OPENING = (119, 144, 135, 171)
# His cravat round his neck, under his chin: the reduced reference has it in the head's part.
CRAVAT_NECK = (119, 145, 135, 150)
# His lit skin (the base his face is drawn on): the skin tone moves his neck's skin from it.
NECK_SKIN = '#f8d4b8'

# Our body parts (src/sprite/raster.ts PARTS).
PART = {'torso': 2, 'upperArmN': 4, 'forearmN': 5, 'handN': 6, 'upperArmF': 7, 'forearmF': 8, 'handF': 9}

N4 = ((1, 0), (-1, 0), (0, 1), (0, -1))


def classes(idx):
    """One letter a cell: L line, C cloth, G gold, W white, R red, S skin, '.' empty."""
    out = np.full(idx.shape, '.', dtype='<U1')
    for letter, chars in (('L', LINE), ('C', CLOTH), ('G', GOLD), ('W', WHITE), ('R', RED), ('S', SKIN)):
        out[np.isin(idx, kind_set(chars))] = letter
    return out


def box(x0, y0, x1, y1):
    m = np.zeros((G, G), bool)
    m[y0:y1 + 1, x0:x1 + 1] = True
    return m


def grow(mask):
    """A mask and its 4-neighbours."""
    out = mask.copy()
    for dx, dy in N4:
        out |= np.roll(np.roll(mask, dy, 0), dx, 1)
    return out


def edge(mask):
    """The cells of a mask with a 4-neighbour outside it."""
    out = np.zeros_like(mask)
    for dx, dy in N4:
        out |= mask & ~np.roll(np.roll(mask, -dy, 0), -dx, 1)
    return out


def nearest_fill(idx, target, donors):
    """Each cell of `target` takes the colour of the nearest cell of `donors` (ties: the higher, then
    the further left): his colours carried in under what covers them."""
    out = idx.copy()
    dy, dx = np.nonzero(donors)
    if not len(dy):
        raise SystemExit('no donors')
    for y, x in zip(*np.nonzero(target)):
        d = (dy - y) ** 2 + (dx - x) ** 2
        k = np.lexsort((dx, dy, d))[0]
        out[y, x] = idx[dy[k], dx[k]]
    return out


class Piece:
    """A piece: PALETTE indices in our frame (NONE where empty) and which of its cells are filled in
    (not the reduced reference's own pixels)."""

    def __init__(self, name, idx, filled):
        self.name = name
        self.idx = idx
        self.filled = filled

    @property
    def mask(self):
        return self.idx != NONE


def seg_angle(a, b):
    return float(np.degrees(np.arctan2(b[1] - a[1], b[0] - a[0])))


def split_arm(mask, s, e, w, r):
    """A sleeve's cells split at the elbow `e` (shoulder `s`, wrist `w`): the upper arm's are those
    before the line across the elbow (halfway between the two segments' normals) and the forearm's
    those past it, and both take the cells within `r` of the elbow, so each runs on under the other
    as the elbow bends."""
    s, e, w = (np.asarray(p, float) for p in (s, e, w))
    u1 = (e - s) / np.hypot(*(e - s))
    u2 = (w - e) / np.hypot(*(w - e))
    axis = (u1 + u2) / np.hypot(*(u1 + u2))
    yy, xx = np.mgrid[0:G, 0:G]
    px, py = xx + 0.5 - e[0], yy + 0.5 - e[1]
    along = px * axis[0] + py * axis[1]
    near = np.hypot(px, py) <= r
    return mask & ((along < 0) | near), mask & ((along >= 0) | near)


# ---------------------------------------------------------------------------------------------
# The coat


def build_coat(fig, parts, layers, body, lay):
    tor = layers['torso']
    tcls = classes(tor)
    yy, xx = np.mgrid[0:G, 0:G]
    # What our game draws behind the coat, and in front of its sleeves: there the reduced reference
    # shows another part, so the coat leaves it alone (the cells it hides there are not the coat's).
    behind = parts['armF'] | parts['handF'] | parts['legN'] | parts['legF']
    opening = box(*OPENING) & np.isin(tcls, ['W', 'R', 'S'])
    belt = box(*BELT) | (box(*BELT_HANG) & (tor != NONE)) | ((xx == BELT_HANG[2] + 1) & (tcls == 'R') & (yy >= BELT_HANG[1]))
    coat = (tor != NONE) & ~opening & ~belt & ~(behind & ~parts['torso'])

    # The body: down to the belt's lower edge. It covers our torso and a pixel round it (so a turned
    # torso never shows past it): where the reduced reference shows his far sleeve there (our torso
    # and far thigh are drawn over our far arm), his sleeve's pixels, as he drew them; under his near
    # sleeve, his coat's cloth nearest it. Its edge that his picture hides takes his line.
    cb = coat & (yy <= BODY_BOTTOM)
    torso_all = grow(lay[..., 1] == PART['torso']) & (yy <= BODY_BOTTOM) & (yy >= 146)
    torso = torso_all & ~box(*OPENING) & ~box(*BELT)
    far_arm = [PART['upperArmF'], PART['forearmF'], PART['handF']]
    idx = np.where(cb, tor, NONE).astype(np.int32)
    sleeve = (yy <= BODY_BOTTOM) & ~cb & parts['armF'] & ((body != 0) & ~np.isin(body, far_arm) | torso)
    idx[sleeve] = fig[sleeve]
    under = torso & ~cb & ~sleeve & ~parts['armF'] & ~parts['handF']
    under |= grow(cb | under) & parts['armN'] & ~cb & ~sleeve
    donors = cb & (tcls == 'C') & parts['torso']
    idx = nearest_fill(idx, under, donors)
    cbm = idx != NONE
    idx[edge(cbm) & ~parts['torso'] & ~sleeve] = ci(LINE)
    body_piece = Piece('body', np.where(cbm, idx, NONE), under | sleeve)
    # Its hull: the body with the opening between the fronts (the shirt) and the belt's rows filled,
    # what the coat stands for over our torso; in a pose our torso shows nowhere outside it.
    hull = cbm | ((box(*OPENING) | box(*BELT)) & torso_all)
    hull_piece = Piece('hull', np.where(hull, ci(LINE), NONE), np.zeros((G, G), bool))

    # The skirts: from the waist down.
    cs = coat & (yy >= SKIRT_TOP)
    skirt_piece = Piece('skirt', np.where(cs, tor, NONE), np.zeros((G, G), bool))

    # The back between the legs: his lining, and where the reduced reference shows his legs (or the
    # sword across them) between the skirts, the lining carried on from under the seat to its hem,
    # his line along its edge: behind the legs, it shows only as they move apart.
    lin = layers['lining']
    back = lin != NONE
    hem = int(np.nonzero(back.any(1))[0].max())
    between = box(119, 176, 137, hem) & (fig != NONE) & ~cs & ~back
    bidx = np.where(back, lin, NONE).astype(np.int32)
    bidx = nearest_fill(bidx, between, back & (classes(lin) == 'C'))
    bm = bidx != NONE
    bidx[edge(bm) & between] = ci(LINE)
    back_piece = Piece('back', np.where(bm, bidx, NONE), between)

    # The sleeves: his near one on our near arm where the reduced reference shows it (the sword and
    # the near glove are over it there and under it in our game, so it leaves them alone); his near
    # one on our far arm, what our torso hides of it included, where the far glove is not, and on
    # over a pixel round our far arm where our torso and legs hide it (his cloth nearest it), so a
    # turned arm never shows past it. Its edge our torso hides takes his line.
    sn = parts['armN'].copy()
    arm_f = layers['armF']
    sf = (arm_f != NONE) & ~parts['handF']
    ours_f = grow(np.isin(lay[..., 0], [PART['upperArmF'], PART['forearmF']])) & ~sf & ~parts['handF']
    ours_f &= (body != 0) & ~np.isin(body, far_arm) & (yy <= BODY_BOTTOM)
    sidx = np.where(sn, fig, NONE).astype(np.int32)
    fidx = np.where(sf, arm_f, NONE).astype(np.int32)
    fidx = nearest_fill(fidx, ours_f, sf & (classes(arm_f) == 'C'))
    sf |= ours_f
    fhid = sf & ~parts['armF']
    fidx[edge(sf) & fhid] = ci(LINE)
    pieces = [body_piece, hull_piece, skirt_piece, back_piece]
    for side, m, src, fill in (('N', sn, sidx, np.zeros((G, G), bool)), ('F', sf, fidx, fhid & ~(arm_f != NONE))):
        s, e, w = J['shoulder' + side], J['elbow' + side], J['wrist' + side]
        up, fo = split_arm(m, s, e, w, 3.5)
        pieces.append(Piece('upper' + side, np.where(up, src, NONE), fill & up))
        pieces.append(Piece('fore' + side, np.where(fo, src, NONE), fill & fo))
    return {p.name: p for p in pieces}


# ---------------------------------------------------------------------------------------------
# The shirt

# His whites, lightest first, and his cravat's reds, darkest first.
WHITES = ['7', '5', '3', '0', 'Y', 'V', 'R', 'N']
REDS = ['c', 'k', 'u', 's']


def shade_across(mask, s, e):
    """For each cell of a limb's mask, where it lies across the limb from its left edge (-1) to its
    right edge (1), along the segment s -> e."""
    s, e = np.asarray(s, float), np.asarray(e, float)
    u = (e - s) / np.hypot(*(e - s))
    n = np.array([-u[1], u[0]])
    yy, xx = np.mgrid[0:G, 0:G]
    px, py = xx + 0.5 - s[0], yy + 0.5 - s[1]
    t = px * u[0] + py * u[1]
    o = px * n[0] + py * n[1]
    out = np.zeros((G, G))
    tb = np.round(t).astype(int)
    for k in np.unique(tb[mask]):
        row = mask & (tb == k)
        lo, hi = o[row].min(), o[row].max()
        out[row] = (o[row] - (lo + hi) / 2) / max(0.5, (hi - lo) / 2)
    # o runs along n, the limb's direction turned a quarter: flip it where n points right
    return -out if n[0] > 0 else out


def build_shirt(fig, parts, layers, lay):
    tor = layers['torso']
    tcls = classes(tor)
    fcls = classes(fig)
    yy, xx = np.mgrid[0:G, 0:G]
    pieces = {}

    # His shirt, cravat and neck in the coat's opening, and his cravat round his neck under his chin.
    vis = box(*OPENING) & np.isin(tcls, ['W', 'R', 'S'])
    neck = box(*CRAVAT_NECK) & (fcls == 'R') & parts['head']
    # A red of his there touching none of the rest by a side is a strand of his hair over the collar, not
    # his cravat: on the shirt it would float free of the hair once the head moves.
    rest = vis | neck
    side = np.zeros_like(rest)
    side[1:] |= rest[:-1]
    side[:-1] |= rest[1:]
    side[:, 1:] |= rest[:, :-1]
    side[:, :-1] |= rest[:, 1:]
    neck &= side
    idx = np.full((G, G), NONE, np.int32)
    idx[vis] = tor[vis]
    idx[neck] = fig[neck]
    # Our torso under the coat: his shirt carried on out to its sides, each side of the cravat in his
    # whites on that side (lit on the near side, in shade on the far side, darker toward the tucked-in
    # hem, as his is), taken as the middle white of his five rows round each row so it falls in soft
    # bands rather than his one-pixel stripes; a shade darker where it turns away at the far side and
    # at the very near edge; the cravat wrapped round the neck at the top (his dark reds under the
    # collar); his line round it, open at the hem (tucked in).
    torso = grow(lay[..., 1] == PART['torso']) & (yy >= 146)
    ours = torso & (yy <= 171) & (idx == NONE)
    rows = np.nonzero(ours.any(1))[0]
    whites = vis & (tcls == 'W')
    wrows = np.nonzero(whites.any(1))[0]
    mid = (OPENING[0] + OPENING[2]) / 2

    def his(y, near):
        y = min(max(y, wrows.min() + 2), wrows.max() - 2)
        ks = []
        for r in range(y - 2, y + 3):
            xs = np.nonzero(whites[r] & ((xx[r] < mid) if near else (xx[r] > mid)))[0]
            ks += [WHITES.index(R.CHARS[tor[r, x]]) for x in xs]
        return WHITES[int(np.median(ks))]

    shirt = np.zeros((G, G), np.int32)
    for y in rows:
        xs = np.nonzero(torso[y])[0]
        x0, x1 = xs.min(), xs.max()
        for x in np.nonzero(ours[y])[0]:
            near = x < mid
            k = WHITES.index(his(y, near)) + (1 if (near and x - x0 <= 1) or (not near and x1 - x <= 3) else 0)
            shirt[y, x] = ci(WHITES[min(k, len(WHITES) - 1)])
    top = int(rows.min())
    wrap = ours & (yy <= top + 4) & box(CRAVAT_NECK[0], 0, CRAVAT_NECK[2], G - 1)
    for y, x in zip(*np.nonzero(wrap)):
        shirt[y, x] = ci(REDS[1] if y - top >= 3 or (x + y) % 3 else REDS[0])
    idx[ours] = shirt[ours]
    full = idx != NONE
    line = edge(full) & ours & ~(yy >= 171)
    idx[line] = ci(LINE)
    pieces['body'] = Piece('body', idx, ours)

    # The sleeves: our arm's shape and a pixel round it in his whites, lit on the left as a round limb
    # is, the far arm a shade darker; a cuff at the wrist (a seam in shade, then his lighter whites),
    # his line round it.
    for side in ('N', 'F'):
        body = lay[..., 2 if side == 'N' else 0]
        arm = grow(np.isin(body, [PART['upperArm' + side], PART['forearm' + side]]))
        s, e, w = J['shoulder' + side], J['elbow' + side], J['wrist' + side]
        a_up = shade_across(arm & (body == PART['upperArm' + side]), s, e)
        a_fo = shade_across(arm & (body == PART['forearm' + side]), e, w)
        across = np.where(body == PART['upperArm' + side], a_up, a_fo)
        dark = 0 if side == 'N' else 1
        sidx = np.full((G, G), NONE, np.int32)
        wv = np.asarray(w, float)
        ev = np.asarray(e, float)
        u = (wv - ev) / np.hypot(*(wv - ev))
        to_wrist = (wv[0] - (xx + 0.5)) * u[0] + (wv[1] - (yy + 0.5)) * u[1]
        for y, x in zip(*np.nonzero(arm)):
            a = across[y, x]
            k = 0 if a < -0.45 else 1 if a < 0.1 else 2 if a < 0.6 else 3
            k = min(len(WHITES) - 1, k + dark)
            if body[y, x] == PART['forearm' + side] and to_wrist[y, x] < 3.2:
                k = 4 + dark if 2.2 <= to_wrist[y, x] else min(3, max(0, k - 1))
            sidx[y, x] = ci(WHITES[k])
        sidx[edge(arm)] = ci(LINE)
        up, fo = split_arm(arm, s, e, w, 3.5)
        pieces['upper' + side] = Piece('upper' + side, np.where(up, sidx, NONE), up)
        pieces['fore' + side] = Piece('fore' + side, np.where(fo, sidx, NONE), fo)
    return pieces


# ---------------------------------------------------------------------------------------------
# Output


def pack(idx):
    """A piece as rows of his colours' characters from its first row and column, its origin and its
    palette (character -> his colour)."""
    m = idx != NONE
    yy, xx = np.nonzero(m)
    x0, x1, y0, y1 = xx.min(), xx.max() + 1, yy.min(), yy.max() + 1
    rows = [''.join(R.CHARS[idx[y, x]] if m[y, x] else '.' for x in range(x0, x1)) for y in range(y0, y1)]
    used = sorted({c for r in rows for c in r if c != '.'}, key=R.CHARS.index)
    return rows, (int(x0), int(y0)), {c: R.PALETTE[ci(c)] for c in used}


def ts_rows(rows, colors):
    out = ['  rows: [']
    out += [f"    '{r}'," for r in rows]
    out += ['  ],', '  colors: {']
    out += [f"    {k if k.isalnum() and not k[0].isdigit() else repr(k)}: '{v}'," for k, v in colors.items()]
    out += ['  },']
    return out


def ts_piece(name, doc, idx, pivot, angle):
    rows, (ox, oy), colors = pack(idx)
    return '\n'.join([f'/** {doc} */', f'export const {name}: PaintedPiece = {{',
                      f'  pivot: [{int(np.floor(pivot[0])) - ox}, {int(np.floor(pivot[1])) - oy}],',
                      f'  angle: {angle:.2f},', *ts_rows(rows, colors), '};', ''])


def ts_sheet(name, doc, idx):
    rows, (ox, oy), colors = pack(idx)
    return '\n'.join([f'/** {doc} */', f'export const {name}: PaintedSheet = {{', f'  origin: [{ox}, {oy}],',
                      *ts_rows(rows, colors), '};', ''])


def write(path, text):
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write(text)
    os.replace(tmp, path)


TORSO = seg_angle(J['pelvis'], J['neck'])


def arm_pieces(prefix, pieces, what):
    out = []
    for side, word in (('N', 'near'), ('F', 'far')):
        s, e, w = J['shoulder' + side], J['elbow' + side], J['wrist' + side]
        out.append(ts_piece(f'{prefix}_UPPER_{side}', f"The {word} upper arm's {what} (pivot: the {word} shoulder).",
                            pieces['upper' + side].idx, s, seg_angle(s, e)))
        out.append(ts_piece(f'{prefix}_FORE_{side}', f"The {word} forearm's {what} (pivot: the {word} elbow).",
                            pieces['fore' + side].idx, e, seg_angle(e, w)))
    return out


def write_coat(coat, path):
    head = [
        "// The owner's Scarlet's coat, the reduced reference's pixels (tools/refs/scarlet-upper-from-ref.py",
        '// from docs/reference/scarlet-owner-reference.jpg): pieces laid on our male at idle frame 0, the',
        "// body and sleeves turned with their segment (pivot on its joint, angle the segment's there), the",
        '// skirts and back bent to the pose. Generated: rerun the script to change it.',
        '',
        "import type { PaintedPiece, PaintedSheet } from '../painted';",
        '',
        '/** His colours the slots retint: his cloth (Coat) and his gold (Trim), each shade by its character. */',
        f"export const SCARLET_COAT = '{COAT}';",
        f"export const SCARLET_TRIM = '{TRIM}';",
        f"export const SCARLET_CLOTH_CHARS = '{CLOTH}';",
        f"export const SCARLET_GOLD_CHARS = '{GOLD}';",
        '',
    ]
    parts = [
        ts_piece('COAT_BODY', 'The body: high collar, lapels with their gold checker, the gold-edged fronts, down to the belt (pivot: the neck).',
                 coat['body'].idx, J['neck'], TORSO),
        ts_piece('COAT_HULL', 'The body with its opening filled: in a pose our torso is taken away outside it (pivot: the neck).',
                 coat['hull'].idx, J['neck'], TORSO),
        ts_sheet('COAT_SKIRTS', 'The skirts, from the waist to the hem: both fronts edged in gold, the far one lined (as on our male at rest).',
                 coat['skirt'].idx),
        ts_sheet('COAT_BACK', 'The back of the coat between the legs, in his lining (as on our male at rest).', coat['back'].idx),
        *arm_pieces('COAT_SLEEVE', coat, 'sleeve'),
    ]
    write(path, '\n'.join(head + parts))


def write_shirt(shirt, path):
    head = [
        "// The owner's Scarlet's shirt and cravat, the reduced reference's pixels in the coat's opening and",
        "// our body's shape under the coat in his whites (tools/refs/scarlet-upper-from-ref.py from",
        '// docs/reference/scarlet-owner-reference.jpg): pieces laid on our male at idle frame 0, turned with',
        "// their segment (pivot on its joint, angle the segment's there). Generated: rerun the script to",
        '// change it.',
        '',
        "import type { PaintedPiece } from '../painted';",
        '',
        '/** His colours the slots retint: his shirt (Shirt), his cravat (Cravat) and his neck (the skin), each shade by its character. */',
        f"export const NOBLE_SHIRT = '{SHIRT}';",
        f"export const NOBLE_CRAVAT = '{CRAVAT}';",
        f"export const NOBLE_NECK_SKIN = '{NECK_SKIN}';",
        f"export const NOBLE_WHITE_CHARS = '{WHITE}';",
        f"export const NOBLE_RED_CHARS = '{RED}';",
        f"export const NOBLE_SKIN_CHARS = '{SKIN}';",
        '',
    ]
    parts = [
        ts_piece('SHIRT_BODY', "The shirt with the cravat, and the neck's skin in its open collar (pivot: the neck).",
                 shirt['body'].idx, J['neck'], TORSO),
        *arm_pieces('SHIRT_SLEEVE', shirt, 'sleeve'),
    ]
    write(path, '\n'.join(head + parts))


def rgba(idx, mark=None):
    out = np.zeros((G, G, 4), np.uint8)
    m = idx != NONE
    out[m, :3] = R.rgb()[idx[m]]
    out[m, 3] = 255
    if mark is not None:
        mm = mark & m
        out[mm, :3] = (out[mm, :3] * 0.4 + np.array([255, 0, 200]) * 0.6).astype(np.uint8)
    return out


def stack(pieces):
    idx = np.full((G, G), NONE, np.int32)
    for p in pieces:
        idx[p.mask] = p.idx[p.mask]
    return idx


def main():
    out_dir, maps = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    body = np.asarray(Image.open(os.path.join(maps, 'male-idle-parts.png')).convert('L')).astype(np.int32)
    lay = np.asarray(Image.open(os.path.join(maps, 'male-idle-layers.png')).convert('RGB')).astype(np.int32)
    fig = R.reduced_index().astype(np.int32)
    parts = R.reduced_parts()
    # Each part alone, his line round the figure included: the finished figure where the part shows,
    # its layer (what is in front of it taken away, but not his line) where it is hidden.
    layers = {k: np.where(parts[k], fig, v).astype(np.int32) for k, v in R.reduced_layers().items()}
    coat = build_coat(fig, parts, layers, body, lay)
    shirt = build_shirt(fig, parts, layers, lay)

    x0, y0, x1, y1 = 96, 136, 160, 208
    ref = rgba(fig)[y0:y1, x0:x1]
    # the coat as the game stacks it: back, far sleeve, skirts, body, near sleeve
    c = coat
    cs = stack([c['back'], c['foreF'], c['upperF'], c['skirt'], c['body'], c['foreN'], c['upperN']])
    s = shirt
    ss = stack([s['foreF'], s['upperF'], s['body'], s['foreN'], s['upperN']])
    gap = np.zeros((y1 - y0, 4, 4), np.uint8)
    R.save(np.concatenate([rgba(cs)[y0:y1, x0:x1], gap, ref], 1), os.path.join(out_dir, 'coat@8.png'))
    R.save(np.concatenate([rgba(ss)[y0:y1, x0:x1], gap, ref], 1), os.path.join(out_dir, 'shirt@8.png'))
    tiles = []
    for p in list(coat.values()) + list(shirt.values()):
        tiles.append(np.concatenate([rgba(p.idx)[y0:y1, x0:x1], rgba(p.idx, p.filled)[y0:y1, x0:x1]], 0))
        tiles.append(np.zeros((2 * (y1 - y0), 2, 4), np.uint8))
    R.save(np.concatenate(tiles, 1), os.path.join(out_dir, 'pieces@4.png'), 4)
    for p in list(coat.values()):
        print('coat', p.name, 'cells', int(p.mask.sum()), 'filled', int((p.filled & p.mask).sum()), 'colours', len(pack(p.idx)[2]))
    for p in list(shirt.values()):
        print('shirt', p.name, 'cells', int(p.mask.sum()), 'filled', int((p.filled & p.mask).sum()), 'colours', len(pack(p.idx)[2]))
    if len(sys.argv) > 4:
        write_coat(coat, sys.argv[3])
        write_shirt(shirt, sys.argv[4])


if __name__ == '__main__':
    main()
