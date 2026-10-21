"""The owner's Elise's upper clothes (docs/reference/elise-owner-reference.jpg, provisional "Elise, la
Espada Celeste") as one item, armor_azure_coat: her sleeveless royal-blue coat with the high
gold-trimmed collar, open over the white breastplate and the dark corset with its two steel buckles,
and her detached sleeves (the blue band with its gold trims on the upper arm, the white sleeve, the
blue at the elbow, the white forearm guard with its gold edge).

Her picture is his own pixel art at about 2.4 of her pixels to one of ours, so nothing is copied 1:1:
the bar is the study's reduced reference (heroine_ref.reduced('elise'): her figure at our scale on
our female at idle frame 0, every pixel one of her colours, everything below her head drawn by hand
at our scale in heroine_paint.PAINT). This script cuts her upper clothes out of it into pieces that
ride our rig, each laid on our female at idle frame 0 as the reduced reference has it, so that there
every pixel is the reduced reference's; then re-laid on the female body v2 (refit, elise_fit.py):

  coat body     the high collar with the neck and the choker in it, the gold-edged  torso.armor
                fronts, the white breastplate and the corset with its straps and
                buckles, down to the belt (pivot: the neck); under the belt the
                fronts and the corset carried on three rows and closed by her line,
                so the coat meets the belt and the coat's tails (the lower part's)
                in every pose
  sleeves       upper arm (pivot: the shoulder): the gold-trimmed blue band, the     nearArm.armor /
                white sleeve and the blue at the elbow; forearm (pivot: the elbow):  farArm.armor
                the white guard, its gold edge and the blue cuff, on each arm (the
                far one as the study drew it after the near one)

What the reduced reference hides of a piece is taken from the study's own hand-drawn part
(heroine_paint.PAINT: each part drawn whole, what the parts in front of it hide included): the coat
under the near sleeve's band, the far sleeve under the pouch and behind the far edge of the coat, the
near sleeve under the hilt and the near hand. Her belt, its buckle, the pouch at her far hip, the
coat's tails below the belt, the gloves and the bare shoulders are not this item's (the lower part,
the gloves and our body's skin). Each sleeve is cut at our elbow, each half taking the cells within a
few pixels of it too, so each runs on under the other as the elbow bends.

Her colours are kept; the colour slots retint them (src/sprite/color.ts retintHex): Coat her blues,
Trim her golds, Plate her whites (the breastplate, the buckles, the sleeves and the guards), Corset
the corset's navy and the choker; the straps stay her leather, her line stays, and her skin in the
collar follows the skin tone.

It writes, in <out>/:

  pieces@4.png    every piece on its own (what is filled in marked in magenta in the second copy)
  coat@8.png      the pieces stacked as the game stacks them, beside the reduced reference

and, with one more argument, the game's module (src/sprite/items/eliseUpperArt.ts). The same picture
always gives the same bytes. Run from the repository root with python3 -I:

  python3 -I tools/refs/elise-upper-from-ref.py <out> [src/sprite/items/eliseUpperArt.ts]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import elise_fit as F  # noqa: E402
import heroine_paint as HP  # noqa: E402
import heroine_ref as R  # noqa: E402

W = 'elise'
G = R.GRID
# The study's reduced reference is on our old female body (OLD_JOINTS): the pieces are cut there, then
# re-laid on the body v2 (refit, elise_fit.py) and pinned to its joints (NEW_JOINTS).
J = F.OLD_JOINTS
NJ = F.NEW_JOINTS
NONE = 255
PAL = R.PALETTES[W]
LINE_HEX = '#080613'

# Her colours by what they are on her (hex, darkest first within each).
BLUE = ['#181b37', '#1b2858', '#2d5090', '#345ea9', '#4068ac', '#5e7faa']
GOLD = ['#a47043', '#cf9b48', '#e6b75e', '#f8dc92']
WHITE = ['#787782', '#a8a8b9', '#c4c4ce', '#eaeaf3', '#fefef9']
LEATHER = ['#342325', '#4e3739', '#683c30', '#865339', '#a0765a']
SKIN = ['#d68271', '#e59580', '#f3ae92', '#facdac']

# The colour slots' defaults: her coat's main blue, her trims' main gold, her breastplate's white, her
# corset's navy, and her lit skin (the base the skin tone moves her neck's skin from).
COAT = '#345ea9'
TRIM = '#e6b75e'
PLATE = '#eaeaf3'
CORSET = '#1b2858'
SKIN_BASE = '#facdac'

# The corset between the coat's fronts, with the choker at the collar (x0, y0, x1, y1, inclusive):
# its navy is Corset's, the coat's own blues round it Coat's.
CORSET_BOX = (124, 151, 131, 172)
# The coat body: the reduced reference's rows down to the corset's lower edge (her belt's top line is
# the next row); then UNDER_BELT more rows like LIKE_ROW, carried on under the belt, and her line.
BODY_LAST = 169
LIKE_ROW = 168
UNDER_BELT = 3
# The pouch at her far hip (the lower part's): from the coat's far edge out, from its top line down.
POUCH = lambda x, y: (y >= 166 and x >= 137) or (y >= 167 and x >= 136)  # noqa: E731
# The near sleeve from its band down (the bare shoulder above it is our body's skin), the far sleeve
# from its top line to its gold edge (the glove below it is the gloves').
NEAR_TOP = 156
FAR_ROWS = (155, 170)
# How far round the elbow each half of a sleeve runs on under the other (fine pixels).
ELBOW_R = 3.5


def ci(hexc):
    return PAL.index(hexc)


def block(part):
    """The study's hand-drawn part (heroine_paint.PAINT), whole, in our frame: PALETTES indices."""
    blocks = [b for b in HP.PAINT[W] if b[0] == part]
    if len(blocks) != 1:
        raise SystemExit(f'expected one {part} block, got {len(blocks)}')
    _, x0, y0, rows = blocks[0]
    out = np.full((G, G), NONE, np.int32)
    for dy, row in enumerate(rows):
        for dx, ch in enumerate(row):
            if ch in '._':
                continue
            out[y0 + dy, x0 + dx] = ci(HP.KEY[W][ch])
    return out


def seg_angle(a, b):
    return float(np.degrees(np.arctan2(b[1] - a[1], b[0] - a[0])))


def split_arm(mask, s, e, w, r):
    """A sleeve's cells split at the elbow `e` (shoulder `s`, wrist `w`): the upper arm's are those
    before the line across the elbow (halfway between the two segments' normals) and the forearm's
    those past it, and both take the cells within `r` of the elbow."""
    s, e, w = (np.asarray(p, float) for p in (s, e, w))
    u1 = (e - s) / np.hypot(*(e - s))
    u2 = (w - e) / np.hypot(*(w - e))
    axis = (u1 + u2) / np.hypot(*(u1 + u2))
    yy, xx = np.mgrid[0:G, 0:G]
    px, py = xx + 0.5 - e[0], yy + 0.5 - e[1]
    along = px * axis[0] + py * axis[1]
    near = np.hypot(px, py) <= r
    return mask & ((along < 0) | near), mask & ((along >= 0) | near)


def along(p, a, b):
    """Where point p lies along the segment a -> b (0 at a, 1 at b)."""
    p, a, b = (np.asarray(q, float) for q in (p, a, b))
    d = b - a
    return float((p - a) @ d / (d @ d))


class Piece:
    """A piece: PALETTES indices in our frame (NONE where empty), the role of each cell ('line',
    'coat', 'trim', 'plate', 'corset', 'leather', 'skin') and which cells are filled in (not shown as
    this part in the reduced reference)."""

    def __init__(self, name, idx, role, filled):
        self.name = name
        self.idx = idx
        self.role = role
        self.filled = filled

    @property
    def mask(self):
        return self.idx != NONE


def roles(idx, corset_box=None):
    hexes = np.array(PAL + ['#000000'] * (256 - len(PAL)))
    h = hexes[np.clip(idx, 0, 255)]
    out = np.full(idx.shape, '', dtype='<U7')
    out[np.isin(h, BLUE)] = 'coat'
    out[np.isin(h, GOLD)] = 'trim'
    out[np.isin(h, WHITE)] = 'plate'
    out[np.isin(h, LEATHER)] = 'leather'
    out[np.isin(h, SKIN)] = 'skin'
    out[h == LINE_HEX] = 'line'
    if corset_box:
        x0, y0, x1, y1 = corset_box
        yy, xx = np.mgrid[0:G, 0:G]
        inb = (xx >= x0) & (xx <= x1) & (yy >= y0) & (yy <= y1)
        out[inb & np.isin(h, ['#181b37', '#1b2858'])] = 'corset'
    out[idx == NONE] = ''
    bad = (idx != NONE) & (out == '')
    if bad.any():
        raise SystemExit('colours without a role: ' + ', '.join(sorted({PAL[i] for i in idx[bad]})))
    return out


def build(fig, parts):
    yy, xx = np.mgrid[0:G, 0:G]
    pieces = {}

    # The coat body: the study's torso down to the corset's lower edge, without the pouch; the
    # reduced reference's own pixels where it shows the torso.
    tor = block('torso')
    pouch = np.vectorize(POUCH)(xx, yy)
    keep = (tor != NONE) & (yy <= BODY_LAST) & ~pouch
    idx = np.where(keep, np.where(parts['torso'], fig, tor), NONE).astype(np.int32)
    idx[keep & (fig == NONE)] = tor[keep & (fig == NONE)]
    filled = keep & ~parts['torso']
    # Under the belt: the fronts and the corset carried on as LIKE_ROW has them, then her line.
    cols = np.nonzero(idx[LIKE_ROW] != NONE)[0]
    for k in range(1, UNDER_BELT + 2):
        y = BODY_LAST + k
        for x in cols:
            idx[y, x] = idx[LIKE_ROW, x] if k <= UNDER_BELT else ci(LINE_HEX)
            filled[y, x] = True
    pieces['body'] = Piece('body', idx, roles(idx, CORSET_BOX), filled)

    # The sleeves: the study's arms, the reduced reference's own pixels where they show.
    for side, top, bot in (('N', NEAR_TOP, G - 1), ('F',) + FAR_ROWS):
        b = block('arm' + side)
        m = (b != NONE) & (yy >= top) & (yy <= bot)
        src = np.where(m & parts['arm' + side] & (fig != NONE), fig, b)
        sidx = np.where(m, src, NONE).astype(np.int32)
        fil = m & ~parts['arm' + side]
        s, e, w = J['shoulder' + side], J['elbow' + side], J['wrist' + side]
        up, fo = split_arm(m, s, e, w, ELBOW_R)
        for name, mm in (('upper' + side, up), ('fore' + side, fo)):
            pidx = np.where(mm, sidx, NONE).astype(np.int32)
            pieces[name] = Piece(name, pidx, roles(pidx), fil & mm)
    return pieces


# On the body v2 the coat body runs from under the chin (three rows higher) to under the belt, which
# stays on its row (elise_fit.py: her belt is on rows 168-173 at the owner's game scale as before):
# three rows longer. Where his scale gives her more rows than the study did, a plain row of hers is shown
# twice: the collar under the choker (her neck and collar, her rows 44-60, are six of our rows at his
# scale, four and a half in the study) and two of the breastplate's (her rows 60-80: eight at his
# scale, six in the study); her corset (her rows 80-104) has as many rows at both.
COLLAR_TWICE = (152, 154, 157)


def refit(pieces):
    """The pieces re-laid on the body v2 (elise_fit.py): the coat body from under the new chin to the
    belt, three rows longer (COLLAR_TWICE); each sleeve moved with the joint it is pinned to (the arms
    are as long as before)."""
    out = {}
    for name, p in pieces.items():
        ys = np.nonzero(p.mask.any(1))[0]
        if name == 'body':
            # (a row lower than the neck's step: the new body's chin is a row lower under its neck)
            top = ys.min() + F.joint_step('neck')[1] + 1
            f = lambda a, fill: F.double_rows(a, ys.min(), ys.max(), COLLAR_TWICE, top, fill)  # noqa: E731
        else:
            dx, dy = F.joint_step(('shoulder' if name.startswith('upper') else 'elbow') + name[-1])
            f = lambda a, fill, dx=dx, dy=dy: F.move(a, dx, dy, fill)  # noqa: E731
        out[name] = Piece(name, f(p.idx, NONE), f(p.role, ''), f(p.filled, False))
    return out


# ---------------------------------------------------------------------------------------------
# Output

CHARS = 'abcdefghijlmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
ROLE_ORDER = ['coat', 'trim', 'plate', 'corset', 'leather', 'skin']


def char_table(pieces):
    """One character per (role, colour) used: 'k' her line, then each role's colours darkest first."""
    used = set()
    for p in pieces.values():
        for y, x in zip(*np.nonzero(p.mask)):
            used.add((p.role[y, x], int(p.idx[y, x])))
    table = {('line', ci(LINE_HEX)): 'k'}
    n = 0
    for role in ROLE_ORDER:
        for i in sorted({i for r, i in used if r == role}, key=lambda i: R.luma(R.rgb(W)[i])):
            table[(role, i)] = CHARS[n]
            n += 1
    return table


def pack(p, table):
    m = p.mask
    ys, xs = np.nonzero(m)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    rows = [''.join(table[(p.role[y, x], int(p.idx[y, x]))] if m[y, x] else '.' for x in range(x0, x1)) for y in range(y0, y1)]
    used = {c for r in rows for c in r if c != '.'}
    colors = {c: PAL[i] for (role, i), c in table.items() if c in used}
    colors = dict(sorted(colors.items(), key=lambda kv: (kv[0] != 'k', list(table.values()).index(kv[0]))))
    return rows, (int(x0), int(y0)), colors


def ts_piece(name, doc, p, table, pivot, angle):
    rows, (ox, oy), colors = pack(p, table)
    out = [f'/** {doc} */', f'export const {name}: PaintedPiece = {{',
           f'  pivot: [{int(np.floor(pivot[0])) - ox}, {int(np.floor(pivot[1])) - oy}],',
           f'  angle: {angle:.2f},', '  rows: [']
    out += [f"    '{r}'," for r in rows]
    out += ['  ],', '  colors: {']
    out += [f"    {k}: '{v}'," for k, v in colors.items()]
    out += ['  },', '};', '']
    return '\n'.join(out)


def write(path, text):
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write(text)
    os.replace(tmp, path)


def write_ts(pieces, path):
    table = char_table(pieces)
    by_role = {role: ''.join(c for (r, _), c in table.items() if r == role) for role in ROLE_ORDER}
    torso = seg_angle(NJ['pelvis'], NJ['neck'])
    body = pieces['body']
    # Where the coat body ends: its last row's lower edge, as a height above the pelvis along the
    # torso (design units) at rest; below it our torso is left to what is worn there.
    bottom = int(np.nonzero(body.mask.any(1))[0].max()) + 1
    from_h = (NJ['pelvis'][1] - bottom) / 2
    # The near sleeve's band: its top edge across the arm's middle, as a point along our upper arm
    # (0 the shoulder, 1 the elbow); our arm above it is the bare shoulder.
    band = along(((NJ['shoulderN'][0] + NJ['elbowN'][0]) / 2, NEAR_TOP + F.joint_step('shoulderN')[1]), NJ['shoulderN'], NJ['elbowN'])
    # Each sleeve's lower edge along our forearm (0 the elbow, 1 the wrist): past it is the wrist.
    cuffs = {}
    for side in 'NF':
        fo = pieces['fore' + side]
        ys, xs = np.nonzero(fo.mask)
        last = ys.max()
        mid = xs[ys == last].mean() + 0.5
        cuffs[side] = along((mid, last + 1), NJ['elbow' + side], NJ['wrist' + side])
    head = [
        "// The owner's Elise's coat and sleeves, the reduced reference's pixels (tools/refs/elise-upper-from-ref.py",
        '// from docs/reference/elise-owner-reference.jpg, at our scale by tools/refs/heroine-study.py): pieces',
        "// laid on our female at idle frame 0, each turned with its segment (pivot on its joint, angle the",
        "// segment's there). Generated: rerun the script to change it.",
        '',
        "import type { PaintedPiece } from '../painted';",
        '',
        '/** Her colours the slots retint (each shade by its character): her coat, trims, whites and corset. */',
        f"export const ELISE_COAT = '{COAT}';",
        f"export const ELISE_TRIM = '{TRIM}';",
        f"export const ELISE_PLATE = '{PLATE}';",
        f"export const ELISE_CORSET = '{CORSET}';",
        '/** Her lit skin: the skin tone moves her neck\'s skin from it. */',
        f"export const ELISE_SKIN = '{SKIN_BASE}';",
        f"export const ELISE_COAT_CHARS = '{by_role['coat']}';",
        f"export const ELISE_TRIM_CHARS = '{by_role['trim']}';",
        f"export const ELISE_PLATE_CHARS = '{by_role['plate']}';",
        f"export const ELISE_CORSET_CHARS = '{by_role['corset']}';",
        f"export const ELISE_SKIN_CHARS = '{by_role['skin']}';",
        '',
        "/** Where the coat body ends at rest: a height above the pelvis along the torso (design units). */",
        f'export const ELISE_COAT_FROM = {from_h:.2f};',
        "/** The near sleeve's band's top, along the upper arm (0 the shoulder, 1 the elbow): above it, the bare shoulder. */",
        f'export const ELISE_BAND_TOP = {band:.3f};',
        "/** Each sleeve's lower edge along the forearm (0 the elbow, 1 the wrist): past it, the wrist. */",
        f"export const ELISE_CUFF = {{ N: {cuffs['N']:.3f}, F: {cuffs['F']:.3f} }};",
        '',
    ]
    parts = [ts_piece('ELISE_COAT_BODY', 'The coat body: high collar with the neck and choker, gold-edged fronts, breastplate and corset, down to the belt (pivot: the neck).',
                      body, table, NJ['neck'], torso)]
    for side, word in (('N', 'near'), ('F', 'far')):
        s, e, w = NJ['shoulder' + side], NJ['elbow' + side], NJ['wrist' + side]
        parts.append(ts_piece(f'ELISE_SLEEVE_UPPER_{side}', f"The {word} upper arm's sleeve: the gold-trimmed band, the white sleeve and the blue at the elbow (pivot: the {word} shoulder).",
                              pieces['upper' + side], table, s, seg_angle(s, e)))
        parts.append(ts_piece(f'ELISE_SLEEVE_FORE_{side}', f"The {word} forearm's guard, its gold edge and cuff (pivot: the {word} elbow).",
                              pieces['fore' + side], table, e, seg_angle(e, w)))
    write(path, '\n'.join(head + parts))


def rgba(idx, mark=None):
    out = np.zeros((G, G, 4), np.uint8)
    m = idx != NONE
    out[m, :3] = R.rgb(W)[idx[m]]
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
    out_dir = sys.argv[1]
    os.makedirs(out_dir, exist_ok=True)
    fig = R.reduced_index(W).astype(np.int32)
    parts = R.reduced_parts(W)
    pieces = refit(build(fig, parts))

    x0, y0, x1, y1 = 100, 140, 150, 186
    ref = rgba(fig)[y0:y1, x0:x1]
    p = pieces
    st = stack([p['foreF'], p['upperF'], p['body'], p['foreN'], p['upperN']])
    gap = np.zeros((y1 - y0, 4, 4), np.uint8)
    R.save(np.concatenate([rgba(st)[y0:y1, x0:x1], gap, ref], 1), os.path.join(out_dir, 'coat@8.png'))
    tiles = []
    for q in pieces.values():
        tiles.append(np.concatenate([rgba(q.idx)[y0:y1, x0:x1], rgba(q.idx, q.filled)[y0:y1, x0:x1]], 0))
        tiles.append(np.zeros((2 * (y1 - y0), 2, 4), np.uint8))
    R.save(np.concatenate(tiles, 1), os.path.join(out_dir, 'pieces@4.png'), 4)
    for q in pieces.values():
        print(q.name, 'cells', int(q.mask.sum()), 'filled', int((q.filled & q.mask).sum()),
              'differs from the reduced reference', int((q.mask & ~q.filled & (q.idx != fig)).sum()))
    if len(sys.argv) > 2:
        write_ts(pieces, sys.argv[2])


if __name__ == '__main__':
    main()
