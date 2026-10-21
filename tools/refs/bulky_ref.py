"""Shared helpers for lifting parts out of the owner's broad man (docs/reference/bulky-owner-reference.jpg).

His picture (2000x2000, 2026-10-21) is a broad, muscular man drawn by the owner in his own pixels of 20
picture pixels each (a 100 x 100 grid from the picture's corner, measured: pitch 20.00, phase 0): one of
his pixels is one fine pixel of our sprites, and he is 94 px tall, as ours are. His words: "este seria la
base para cuerpo masculino mas grueso y copia todo como aiden". Our bulky body is built to his proportions
(src/sprite/rig.ts BODY_PARAMS.bulky), so at idle frame 0 its joints stand where his do: a pixel of his at
(x, y) sits at (x + OFFSET[0], y + OFFSET[1]) of our 256 x 256 frame. JOINTS are our bulky rig's joints at
that frame and MALE_JOINTS our male's, both in his pixels.

LABELS cuts his figure into what each part is made of, by regions of his picture (polygons in his pixel
corners) and by what each colour of his is (kind): a pixel goes to the first region that holds it and
whose kinds take it. Scripts import this with sys.path.insert(0, os.path.dirname(__file__)), run with
python3 -I from the repo root, and write their modules with roman_ref's helpers (the long palette alphabet).
"""

import colorsys
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

from aiden_ref import background, luma, save  # noqa: E402,F401
from roman_ref import hexc, inside, near4, near8, pack, ts_piece, write  # noqa: E402,F401

REF = 'docs/reference/bulky-owner-reference.jpg'
PITCH = 20.0
OFFSET = (77, 121)
# Our bulky rig at idle frame 0, in his pixels (src/sprite/rig.ts drawRig, fine pixels less OFFSET).
JOINTS = {
    'head': (53.0, 19.0),
    'neck': (50.07, 29.03),
    'pelvis': (50.0, 61.45),
    'shoulderN': (33.36, 36.02),
    'shoulderF': (59.65, 35.1),
    'elbowN': (30.5, 52.67),
    'elbowF': (64.34, 51.33),
    'wristN': (36.57, 62.91),
    'wristF': (68.51, 62.48),
    'handN': (38.77, 66.63),
    'handF': (70.02, 66.53),
    'hipN': (42.78, 61.1),
    'hipF': (56.02, 58.64),
    'kneeN': (43.06, 78.9),
    'kneeF': (60.59, 75.84),
    'ankleN': (39.78, 90.65),
    'ankleF': (60.22, 88.04),
}
# Our face template's anchor on his picture (body.ts faceAnchor on the rig above): the near eye's lash
# start, where his lash line starts.
ANCHOR = (49, 20)


def native(path=REF):
    """His pixels: the median of each 20 x 20 block's middle 10 x 10, as a (100, 100, 3) int array."""
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    n = int(round(a.shape[0] / PITCH))
    blocks = a[: n * 20, : n * 20].reshape(n, 20, n, 20, 3)[:, 5:15, :, 5:15]
    out = np.median(blocks.transpose(0, 2, 1, 3, 4).reshape(n, n, 100, 3), axis=2)
    return np.clip(np.round(out), 0, 255).astype(np.int32)


def hsv(c):
    r, g, b = (int(v) / 255 for v in c)
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    return h * 360, s, v


def kind(c):
    """What a colour of his is, by its colour alone: 'line' (his near-black), 'hair' (his yellows and the
    browns round them), 'skin' (his peach and its rose shadows), 'cool' (his blue-greys and whites: the
    shirt, its seams, the steel, the wraps, the jeans), 'tan' (the pouch), or 'brown' (the leather)."""
    r, g, b = (int(v) for v in c)
    L = 0.299 * r + 0.587 * g + 0.114 * b
    if L < 16 and max(r, g, b) < 24:
        return 'line'
    if min(r, g, b) > 248:
        return 'gap'
    h, s, v = hsv(c)
    if abs(r - g) < 14 and abs(g - b) < 14 and b < r and L < 45:
        return 'brown'
    if b >= r - 6 or (abs(r - g) < 14 and abs(g - b) < 14):
        return 'cool'
    if h >= 36 and s > 0.3 and v > 0.55:
        return 'hair'
    if 24 <= h < 36 and s > 0.45:
        return 'hair'
    if 12 <= h < 36 and s > 0.6 and v < 0.45:
        return 'hair'
    if 28 <= h < 45 and s < 0.35 and v > 0.45:
        return 'tan'
    if r > 120 and v > 0.5:
        return 'skin'
    if h < 12 or h > 340:
        return 'skin' if v > 0.33 else 'brown'
    return 'brown'


# The regions of his picture each part is cut from (polygons in his pixel corners) and the kinds of his
# colours each takes, in the order they claim his pixels. His black line goes to every part whose own
# colours it bounds (see labels).
REGIONS = [
    ('hair', [(35, 3), (68, 3), (68, 26), (35, 26)], ('hair',)),
    ('lock', [(39, 24), (44, 24), (50, 34), (50, 47), (46.5, 52.5), (42.5, 52.5), (45, 46), (45, 40), (39, 31)], ('hair', 'brown')),
    ('face', [(42, 14), (62, 14), (62, 29), (49, 29), (49, 28), (47, 28), (47, 27), (42, 27)], ('skin', 'cool', 'brown', 'tan')),
    ('arm_n', [(24, 42), (38, 42), (38, 56), (24, 56)], ('skin', 'brown')),
    ('arm_f', [(61, 41), (72, 41), (72, 54.5), (61, 54.5)], ('skin', 'brown')),
    ('sleeve_n', [(24, 29), (39.5, 29), (39.5, 50), (24, 50)], ('cool', 'brown')),
    ('sleeve_f', [(59, 29), (70, 29), (70, 50), (62, 50), (59, 44)], ('cool', 'brown')),
    ('steel_n', [(24, 53), (35, 53), (39.5, 57), (39.5, 61), (43, 62.5), (43, 71), (35, 71), (24, 60)], ('cool', 'brown', 'skin')),
    ('wrap_f', [(64.5, 50), (76, 50), (76, 70), (65.5, 70), (64.5, 64)], ('cool', 'skin', 'tan', 'brown')),
    ('shirt', [(35, 27), (62, 27), (64, 44), (64, 56), (35, 56)], ('cool',)),
    ('buckle', [(54, 57), (59, 57), (59, 58), (60, 58), (60, 64), (59, 64), (59, 65), (54, 65), (54, 64), (53, 64), (53, 59), (54, 59)], ('cool', 'brown', 'skin', 'tan')),
    ('belt', [(36, 56.5), (64.5, 56.5), (64.5, 63), (55, 67.5), (44, 69), (36, 69)], ('brown', 'tan', 'skin', 'hair')),
    ('pouch', [(31, 66), (46, 66), (46, 77), (39, 83), (31, 83)], ('tan', 'brown', 'skin', 'hair')),
    ('knife', [(50, 75), (55, 75), (56, 77), (55, 86), (50, 86)], ('brown', 'cool', 'skin')),
    ('boot_n', [(29, 89), (50, 89), (50, 99), (29, 99)], ('brown',)),
    ('boot_f', [(52, 88), (72, 88), (72, 99), (52, 99)], ('brown',)),
    ('jeans', [(28, 54), (70, 54), (70, 99), (28, 99)], ('cool',)),
]

# Single pixels whose colour alone puts them in the wrong part, by where they are: (x, y) -> part. The
# knife's grey tip is the jeans' grey; the pouch's straps end in his tan.
OVERRIDE = {}


def labels(a):
    """{part: mask} of his pixels: each pixel to the first region holding it whose kinds take it; then his
    black line to every part whose colours it touches (8 neighbours) inside that part's region."""
    H, W, _ = a.shape
    bg = background(a)
    K = np.array([[kind(a[y, x]) for x in range(W)] for y in range(H)])
    owned = np.zeros((H, W), bool)
    masks = {}
    regs = {}
    for name, pts, kinds in REGIONS:
        regs[name] = inside(pts, H, W)
        m = regs[name] & ~bg & ~owned & np.isin(K, kinds)
        owned |= m
        masks[name] = m
    for (x, y), name in OVERRIDE.items():
        for n in masks:
            masks[n][y, x] = n == name
    line = (K == 'line') & ~bg
    for name in masks:
        masks[name] = masks[name] | (line & regs[name] & near8(masks[name]))
    # A line pixel of his that no part took (it touches only other lines or a gap he left): the part
    # whose pixels are most of its 8 neighbours takes it.
    taken = np.zeros((H, W), bool)
    for m in masks.values():
        taken |= m
    for y, x in zip(*np.nonzero(line & ~taken)):
        votes = {}
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                q, p = y + dy, x + dx
                if (dy or dx) and 0 <= q < H and 0 <= p < W:
                    for name, m in masks.items():
                        if m[q, p] and K[q, p] != 'line':
                            votes[name] = votes.get(name, 0) + 1
        if votes:
            masks[max(sorted(votes), key=lambda n: votes[n])][y, x] = True
    return masks, K


def joint_angle(a_name, b_name, J=None):
    """The screen angle (degrees) of the limb from joint a to joint b at rest."""
    J = J or JOINTS
    (ax, ay), (bx, by) = J[a_name], J[b_name]
    return float(np.degrees(np.arctan2(by - ay, bx - ax)))


def unit(a_name, b_name):
    """The unit vector from joint a to joint b at rest."""
    (ax, ay), (bx, by) = JOINTS[a_name], JOINTS[b_name]
    d = np.array([bx - ax, by - ay], float)
    return d / np.linalg.norm(d)


def along_t(shape, joint, axis):
    """How far along `axis` from `joint` each pixel's centre lies (px), as a (H, W) array."""
    ys, xs = np.mgrid[0:shape[0], 0:shape[1]]
    return (xs + 0.5 - joint[0]) * axis[0] + (ys + 0.5 - joint[1]) * axis[1]


# Where an upper arm's shoulder cap ends and its tube begins, px down the arm from the shoulder joint
# (the two overlap by CAP_OVERLAP px, so a bent shoulder opens no gap).
CAP_T = 3
CAP_OVERLAP = 2


def continue_along(col, have, want, axis, reach=40):
    """His pixels continued where he could not show them: each pixel of `want` not in `have` takes the
    colour of the first pixel of `have` met walking from it along `axis` (a unit vector, in half-pixel
    steps, up to `reach` px); when none is met it stays empty. Returns (colours, mask)."""
    H, W = have.shape
    out = col.copy()
    got = have.copy()
    for y, x in zip(*np.nonzero(want & ~have)):
        for k in range(1, 2 * reach):
            qx = int(np.floor(x + 0.5 + axis[0] * k * 0.5))
            qy = int(np.floor(y + 0.5 + axis[1] * k * 0.5))
            if not (0 <= qx < W and 0 <= qy < H):
                break
            if have[qy, qx]:
                out[y, x] = col[qy, qx]
                got[y, x] = True
                break
    return out, got


def fill_hidden(a, K, have, want, axis, black, open_edge=None):
    """A part he drew only in part, continued where something of his hides it (`want`): each hidden pixel
    takes the colour of his inside (not his line) met first walking along `axis` from it, then what is
    left takes the colour met first walking across (both ways), and the piece is closed by his black line
    where its edge is not his, except along `open_edge` (where it joins something of ours). His own pixels
    (`have`) stay as he drew them. Returns (colours, mask)."""
    inner = have & (K != 'line')
    hidden = want & ~have
    col, got = continue_along(a, inner, hidden, axis)
    across = np.array([-axis[1], axis[0]])
    for d in (across, -across):
        col, got = continue_along(col, got | inner, hidden & ~got, d, reach=8)
        got &= ~inner
    mask = have | got
    return cap(col, mask, have | (open_edge if open_edge is not None else False), black), mask


def edge_of(mask):
    """The pixels of a mask next to a pixel outside it (4 neighbours)."""
    p = np.pad(mask, 1)
    return mask & ~(p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:])


def cap(col, mask, own, black):
    """Closes a piece with his black line: a pixel on the piece's edge that is not his own (`own`: his
    pixels, kept as he drew them) becomes his line."""
    out = col.copy()
    for y, x in zip(*np.nonzero(edge_of(mask) & ~own)):
        out[y, x] = black
    return out


def his_line(a, K):
    """His black line: the commonest of his line colours."""
    seen = {}
    for c in a[K == 'line']:
        t = tuple(int(v) for v in c)
        seen[t] = seen.get(t, 0) + 1
    return np.array(max(sorted(seen), key=lambda t: seen[t]))


def piece(name, doc, col, mask, joint, ang, at=None):
    """A PaintedPiece as TypeScript with its pivot the cell on `joint` (his pixels), and where its first
    cell lands in our bulky idle frame 0 (`at`: our joint, when the pivot is not on it)."""
    rows, origin, palette = pack(col, mask)
    text = ts_piece(name, doc, rows, origin, palette, joint, ang)
    j = at or joint
    rest = [origin[i] + OFFSET[i] + int(np.floor(j[i])) - int(np.floor(joint[i])) for i in (0, 1)]
    return name, text, rest, palette


def module(doc, imports, header, pieces, kinds=None, rest_name=None):
    """A generated TypeScript module: the header lines (its constants), what each colour of his is
    (`kinds`: (CONST, {hex: kind})), where each piece lands at rest (`rest_name`) and the pieces (from
    piece())."""
    out = [doc, imports, '']
    out += header
    if kinds is not None:
        out.append('/** What each colour of his is (his black line is never recoloured). */')
        out.append(f'export const {kinds[0]}: Record<string, string> = {{')
        for h in sorted(kinds[1]):
            out.append(f"  '{h}': '{kinds[1][h]}',")
        out += ['};', '']
    if rest_name:
        out.append("/** Where each piece lands in our bulky idle frame 0, unturned: the fine pixel of its first row's first cell. */")
        out.append(f'export const {rest_name}: Record<string, [number, number]> = {{')
        for name, _, rest, _ in pieces:
            out.append(f'  {name}: [{rest[0]}, {rest[1]}],')
        out += ['};', '']
    for _, text, _, _ in pieces:
        out.append(text)
    return '\n'.join(out)


def kinds_of(pieces):
    """{hex: kind} for every colour of these pieces."""
    out = {}
    for _, _, _, palette in pieces:
        for h in palette.values():
            out[h] = kind([int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)])
    return out


def study(a, parts, path, box=(20, 0, 80, 100), k=8):
    """His picture beside the pieces lifted out of it (drawn in order, each at its place), at k x."""
    x0, y0, x1, y1 = box
    H, W = y1 - y0, x1 - x0
    lifted = np.zeros((H, W, 4), np.uint8)
    for col, mask in parts:
        for y, x in zip(*np.nonzero(mask)):
            if y0 <= y < y1 and x0 <= x < x1:
                lifted[y - y0, x - x0, :3] = col[y, x]
                lifted[y - y0, x - x0, 3] = 255
    his = np.concatenate([a[y0:y1, x0:x1].astype(np.uint8), np.full((H, W, 1), 255, np.uint8)], axis=2)
    save(np.concatenate([his, np.zeros((H, 2, 4), np.uint8), lifted], axis=1), path, k)
