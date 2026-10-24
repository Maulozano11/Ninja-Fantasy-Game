"""Shared helpers for lifting parts out of the owner's navy officer (docs/reference/navy-officer-*-owner-reference.jpg).

His four pictures of the officer (2000x2000, on white; 2026-10-24) are one new male character drawn by him in
his own pixel art, in one pose, framing and grid: a 200 x 200 grid of his pixels, 10 picture pixels each, from
the picture's corner (the block edges of his line fall every 10 picture pixels, phase 0). He stands about 194
of his pixels tall, twice our sprite. The pictures (PICS) differ only in the chest:

  high      his first (his favourite): the long coat with a high gold-trimmed collar lined in burgundy, ornate
            embroidered shoulder pieces, gold frogging down the chest
  folded    the same coat with a folded-down collar open at the throat and plain shoulders seamed in gold
  open      the coat open, wide embroidered lapels over a cream shirt and a burgundy vest (no frogging), black
            trousers, plain tails
  buttoned  the coat with notched lapels buttoned across a green waistcoat and a cream cravat, a flap pocket,
            embroidered tails, black trousers, no belt (his near hand open there: only the pose)
  dark      a dark plum open coat with gold-edged lapels embroidered in gold and red over a black shirt and a
            red brocade waistcoat, a burgundy sash for a belt, red flames on the cuffs and along the tails, black
            trousers, and his black hair swept back

Everything else (head, his first hair, the navy sleeves, cuffs, gloves, belt, trousers' shape, boots, sabre, scabbard) is lifted
from the first. The owner's answer on the sets drawn bigger than our sprite (2026-10-24, "Reducir y limpiar yo"):

  * the body is shrunk evenly at the scale that fits our male rig: BODY_SCALE (2.09) of his pixels to one fine
    pixel, at BODY_AT: his soles on our male idle frame 0's sole row, his shoulders, chin and torso on ours (at
    2 his shoulders and chin would stand 3 px above ours, his near wrist 4 px above ours; his
    near arm hangs a little nearer the body than ours, his far arm is bent, the hand on the sabre's hilt at
    his hip: those limbs are pinned where he drew them at rest);
  * the head (hair, face, eyes) is shrunk evenly at HEAD_SCALE, the scale that makes it our Roman head's size
    (the male standard: the hair's top to the chin about 24 fine px), pinned at his chin (HEAD_PIN) where the
    body's scale puts it (HEAD_TO);
  * then what the shrinking left blurry or muddy is cleaned with his palette only (reduce_region): every fine
    pixel is one of HIS pixels from the block it shrinks (never a colour of ours, never a new motif), chosen
    for the cleanest reading: his 1 px black line round the figure, his gold piping, frogging and trim as
    continuous 1 px lines, his eyes, the jewels, his big areas without specks.

game(pic) is that cleaned reduction of one picture: his figure at our scale, a pixel of it at (x, y) on our
male idle frame 0's pixel (x + OFFSET[0], y + OFFSET[1]) (OFFSET and JOINTS as tools/refs/noble_ref.py on the
noble swordsman's branch, whose method this follows). The part scripts cut it into pieces; the idle tests check
the game against it pixel for pixel. game(pic, clean=False) is the same reduction before the cleaning (the
pixel under each fine pixel's middle), for the "sin limpiar / limpio" sheet.

Scripts import this with sys.path.insert(0, os.path.dirname(__file__)) and run with python3 -I.
"""

import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

from aiden_ref import save  # noqa: E402,F401
from roman_ref import CHARS, hexc, inside, near4, near8, write  # noqa: E402,F401

PICS = {
    'high': 'docs/reference/navy-officer-owner-reference.jpg',
    'folded': 'docs/reference/navy-officer-variant-owner-reference.jpg',
    'open': 'docs/reference/navy-officer-open-coat-owner-reference.jpg',
    'buttoned': 'docs/reference/navy-officer-green-vest-owner-reference.jpg',
    'dark': 'docs/reference/navy-officer-dark-coat-owner-reference.jpg',
}
REF = PICS['high']
PITCH = 10
CELLS = 200
# Our frame: a pixel of the game picture at (x, y) is our male idle frame 0's (x + OFFSET[0], y + OFFSET[1]).
OFFSET = (75, 116)
SIZE = 104
# Body: his pixel (X, Y) lands on the game picture's ((X - BODY_AT[0]) / BODY_SCALE, (Y - BODY_AT[1]) / BODY_SCALE).
BODY_SCALE = 2.09
BODY_AT = (-3.0, -15.36)
# Head: his pixel (X, Y) lands on HEAD_TO + ((X, Y) - HEAD_PIN) / HEAD_SCALE.
HEAD_SCALE = 1.7
HEAD_PIN = (108.0, 46.0)
HEAD_TO = (53.1, 29.4)
# Our male rig at idle frame 0, in the game picture's pixels (src/sprite/rig.ts drawRig, fine pixels less OFFSET).
JOINTS = {
    'head': (51.0, 22.00),
    'neck': (52.18, 31.65),
    'shoulderN': (39.01, 36.51),
    'shoulderF': (59.27, 35.81),
    'elbowN': (35.13, 48.50),
    'elbowF': (62.09, 48.08),
    'wristN': (32.62, 59.21),
    'wristF': (67.52, 57.65),
    'handN': (31.80, 62.72),
    'handF': (69.30, 60.78),
    'pelvis': (52.0, 60.87),
    'hipN': (46.58, 60.46),
    'hipF': (56.51, 57.12),
    'kneeN': (47.17, 76.65),
    'kneeF': (63.23, 71.86),
    'ankleN': (43.42, 91.59),
    'ankleF': (60.94, 87.08),
}
# His black line: darker than this (luma). His darkest navy is lighter (about 15 and up).
LINE_LUMA = 10
# Colours of his within this (largest channel difference) are one colour of his palette: the JPEG's noise.
SNAP = 7
_CACHE = {}

# The head in his picture (polygon in his pixel corners): his hair, face and eyes, above the collar (the same
# in every picture). Everything else is the body.
HEAD_REGION = [
    (91, 3), (123, 3), (130, 10), (134, 19), (131, 28), (127, 33), (123, 36), (121, 41), (116, 45), (111, 47),
    (104, 47), (99, 42), (96, 38), (91, 37), (87, 35), (84, 30), (82, 23), (85, 15), (88, 8),
]


def luma(a):
    return 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]


def native(pic='high'):
    """His pixels: the median of each block's interior, as a (200, 200, 3) int array."""
    path = PICS.get(pic, pic)
    if ('native', path) not in _CACHE:
        a = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
        b = a.reshape(CELLS, PITCH, CELLS, PITCH, 3)[:, 2:PITCH - 2, :, 2:PITCH - 2, :].transpose(0, 2, 1, 3, 4)
        out = np.median(b.reshape(CELLS, CELLS, -1, 3), axis=2)
        _CACHE[('native', path)] = np.clip(np.round(out), 0, 255).astype(np.int32)
    return _CACHE[('native', path)].copy()


def background(a):
    """The white round him, reached from the picture's edge, and the soft light greys his edges fade into
    there; and the pure white he left inside his figure (between his legs, between the far arm and the body),
    patches of GAP_LEAST pixels or more (his glints are smaller or tinted)."""
    H, W, _ = a.shape
    L = luma(a)
    grey = (L > 150) & (a.max(axis=2) - a.min(axis=2) < 30)
    bg = np.zeros((H, W), bool)
    stack = [(y, x) for y in (0, H - 1) for x in range(W)] + [(y, x) for x in (0, W - 1) for y in range(H)]
    pure = (a.min(axis=2) >= 245) & ~bg
    sizes = components(pure)
    stack += [(y, x) for y, x in zip(*np.nonzero(pure & (sizes >= GAP_LEAST)))]
    while stack:
        y, x = stack.pop()
        if not (0 <= y < H and 0 <= x < W) or bg[y, x] or not (L[y, x] > 232 or grey[y, x]):
            continue
        bg[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    return bg


GAP_LEAST = 6


def kind(c):
    """What a colour of his is: 'line' (his black), 'gold', 'skin', 'red' (his eyes, the scabbard's jewel),
    'wine' (the burgundy lining and vest), 'blue' (the sabre's jewel), 'white' (glints, his eyes' whites),
    'cream' (the shirt, the cravat), 'green' (the waistcoat), 'brown' (his hair, the belt, the boots' cuffs
    and feet), 'grey' (the gloves) or 'dark' (his navy and black cloth)."""
    r, g, b = (int(v) for v in c)
    L = 0.299 * r + 0.587 * g + 0.114 * b
    mx, mn = max(r, g, b), min(r, g, b)
    if L < LINE_LUMA:
        return 'line'
    if L > 205 and mx - mn < 40:
        return 'white'
    if b > r + 30 and b > 95 and b > g + 10:
        return 'blue'
    if g > r + 8 and g >= b - 4:
        return 'green'
    if r > 110 and b < 0.62 * r and g > 0.5 * r and r - b > 75:
        # (his skin is redder: r - g wide, g under three quarters of r)
        if g < 0.74 * r and r - g > 50 and b > 0.4 * r:
            return 'skin'
        return 'gold'
    if L > 110 and r >= g >= b and r - b <= 85 and g > 0.72 * r:
        return 'cream'
    if r > 100 and g < 0.45 * r:
        return 'red'
    if r > b + 4 and g < 0.5 * r and r > 25:
        return 'wine'
    if r > 90 and r > g > b:
        return 'skin'
    if r > b + 3 and r > g:
        return 'brown'
    if b - r < 18 and L > 30:
        return 'grey'
    return 'dark'


def kinds(a):
    H, W, _ = a.shape
    return np.array([[kind(a[y, x]) for x in range(W)] for y in range(H)])


def snapped(a, bg):
    """His pixels with the JPEG's noise taken off: colours within SNAP of one another (and of one kind)
    are his one colour, the commonest of them (so every colour is one he painted). His line is his one
    commonest line colour."""
    counts = {}
    for y, x in zip(*np.nonzero(~bg)):
        t = tuple(int(v) for v in a[y, x])
        counts[t] = counts.get(t, 0) + 1
    order = sorted(counts, key=lambda t: (-counts[t], t))
    pal = []
    to = {}
    line = None
    for t in order:
        k = kind(t)
        if k == 'line':
            line = line or t
            to[t] = line
            continue
        for p in pal:
            if kind(p) == k and max(abs(p[i] - t[i]) for i in range(3)) <= SNAP:
                to[t] = p
                break
        else:
            pal.append(t)
            to[t] = t
    out = a.copy()
    for y, x in zip(*np.nonzero(~bg)):
        out[y, x] = to[tuple(int(v) for v in a[y, x])]
    return out, np.array(line), kinds(out)


def runs(m):
    """For each cell of a mask, the length of its run across (x) and down (y)."""
    H, W = m.shape
    rx = np.zeros((H, W), int)
    ry = np.zeros((H, W), int)
    for y in range(H):
        x = 0
        while x < W:
            if not m[y, x]:
                x += 1
                continue
            e = x
            while e < W and m[y, e]:
                e += 1
            rx[y, x:e] = e - x
            x = e
    for x in range(W):
        y = 0
        while y < H:
            if not m[y, x]:
                y += 1
                continue
            e = y
            while e < H and m[e, x]:
                e += 1
            ry[y:e, x] = e - y
            y = e
    return rx, ry


# What the cleaning brings back, in this order, where the even reduction lost it: his red eyes and the
# scabbard's red stone, the glints' and his eyes' white, the sabre's blue jewel (his gold piping is brought
# back by piping() first), then his black line where it is thin (a run of at most THIN of his pixels across or down: a line between two parts, not
# the dark of his cloth and hair). A kind brought back never takes a pixel an earlier one brought back, nor
# his outline, nor makes a 2 x 2 square of itself (his thin lines stay 1 px).
THIN = 2
KEEP_ORDER = ('red', 'white', 'blue', 'line')


def footprint(fx, fy, region):
    """His pixels (X, Y) that the fine pixel (fx, fy) of the game picture shrinks, for the body or the head,
    and the one under its middle (the even reduction's pick)."""
    if region == 'body':
        s = BODY_SCALE
        X0, X1 = fx * s + BODY_AT[0], (fx + 1) * s + BODY_AT[0]
        Y0, Y1 = fy * s + BODY_AT[1], (fy + 1) * s + BODY_AT[1]
    else:
        s = HEAD_SCALE
        X0, X1 = HEAD_PIN[0] + (fx - HEAD_TO[0]) * s, HEAD_PIN[0] + (fx + 1 - HEAD_TO[0]) * s
        Y0, Y1 = HEAD_PIN[1] + (fy - HEAD_TO[1]) * s, HEAD_PIN[1] + (fy + 1 - HEAD_TO[1]) * s
    xs = [X for X in range(int(np.floor(X0)), int(np.ceil(X1))) if X0 <= X + 0.5 < X1]
    ys = [Y for Y in range(int(np.floor(Y0)), int(np.ceil(Y1))) if Y0 <= Y + 0.5 < Y1]
    mid = (int(np.floor((X0 + X1) / 2)), int(np.floor((Y0 + Y1) / 2)))
    return [(X, Y) for Y in ys for X in xs], mid


def fine_of(X, Y, region):
    """The fine pixel of the game picture that his pixel (X, Y) shrinks into."""
    if region == 'body':
        return int(np.floor((X + 0.5 - BODY_AT[0]) / BODY_SCALE)), int(np.floor((Y + 0.5 - BODY_AT[1]) / BODY_SCALE))
    return (int(np.floor(HEAD_TO[0] + (X + 0.5 - HEAD_PIN[0]) / HEAD_SCALE)),
            int(np.floor(HEAD_TO[1] + (Y + 0.5 - HEAD_PIN[1]) / HEAD_SCALE)))


def components(m):
    """The 8-connected patches of a mask: an array of patch sizes per cell (0 outside)."""
    H, W = m.shape
    size = np.zeros((H, W), int)
    seen = np.zeros((H, W), bool)
    for y, x in zip(*np.nonzero(m)):
        if seen[y, x]:
            continue
        comp, stack = [], [(y, x)]
        seen[y, x] = True
        while stack:
            q, p = stack.pop()
            comp.append((q, p))
            for dq in (-1, 0, 1):
                for dp in (-1, 0, 1):
                    u, w = q + dq, p + dp
                    if 0 <= u < H and 0 <= w < W and m[u, w] and not seen[u, w]:
                        seen[u, w] = True
                        stack.append((u, w))
        for q, p in comp:
            size[q, p] = len(comp)
    return size


# His accent kinds, in the order they win a block of which they fill half (reduce_region): his eyes, glints
# and jewels.
ACCENTS = ('red', 'white', 'blue')
# The shortest of his thin details of each kind brought back (his pixels): his black line only where it runs
# on as a line between parts (shorter specks are the shading of his cloth and hair).
MIN_RUN = {'red': 1, 'white': 1, 'blue': 1, 'gold': 3, 'line': 8}


def reduce_region(a, K, own, region, clean=True, line=None, accent=None, pic='high'):
    """One region (his pixels in `own`) shrunk onto the game picture: (mask, colours, which of his pixels
    each fine pixel shows). Unclean: the pixel under each fine pixel's middle (shrunk evenly). Clean: the
    figure where most of each block is his, each fine pixel his commonest colour in its block (a tie: the
    pixel under the middle), his 1 px line round it, and what that lost of his thin details brought back
    (KEEP_ORDER, MIN_RUN): every fine pixel is one of his own pixels of its block."""
    H, W = SIZE, SIZE
    mask = np.zeros((H, W), bool)
    col = np.zeros((H, W, 3), np.int32)
    src = np.full((H, W, 2), -1, np.int32)
    inb = lambda X, Y: 0 <= X < CELLS and 0 <= Y < CELLS
    for fy in range(H):
        for fx in range(W):
            cells, (mx, my) = footprint(fx, fy, region)
            cells = [(X, Y) for X, Y in cells if inb(X, Y)]
            mine = [(X, Y) for X, Y in cells if own[Y, X]]
            at_mid = inb(mx, my) and own[my, mx]
            if not clean:
                if at_mid:
                    mask[fy, fx] = True
                    col[fy, fx] = a[my, mx]
                    src[fy, fx] = (mx, my)
                continue
            # his figure where most of the block is his (a tie: the pixel under the middle decides)
            if not mine or 2 * len(mine) < len(cells) or (2 * len(mine) == len(cells) and not at_mid):
                continue
            cnt = {}
            for X, Y in mine:
                t = tuple(int(v) for v in a[Y, X])
                cnt[t] = cnt.get(t, 0) + 1
            best = max(cnt.values())
            if at_mid and cnt[tuple(int(v) for v in a[my, mx])] == best:
                pick = (mx, my)
            else:
                pick = next(p for p in mine if cnt[tuple(int(v) for v in a[p[1], p[0]])] == best)
            # his details first: a block half of whose pixels are one of his accent kinds shows that kind (his
            # pixel of it nearest the middle), so a 1 px line of his gold across a block stays a line
            for k in ACCENTS:
                acc = [p for p in mine if K[p[1], p[0]] == k and (accent is None or accent(p[0], p[1], k))]
                if 2 * len(acc) >= len(cells) and len(acc) >= 2:
                    pick = min(acc, key=lambda p: ((p[0] - mx) ** 2 + (p[1] - my) ** 2, p[1], p[0]))
                    break
            mask[fy, fx] = True
            col[fy, fx] = a[pick[1], pick[0]]
            src[fy, fx] = pick
    if not clean:
        return mask, col, src
    piping(a, K, own, region, mask, col, src)
    # his 1 px line round the figure (beside the white round him), in his line colour
    p = np.pad(mask, 1)
    edge = mask & ~(p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:])
    col[edge] = line
    kept = edge.copy()
    fk = np.array([[kind(col[y, x]) if mask[y, x] else '' for x in range(W)] for y in range(H)])
    for k in KEEP_ORDER:
        bridge(a, K, own, region, k, mask, col, src, fk, kept)
    if region == 'body':
        despeckle(a, mask, col, src)
    for x0, y0, rows in MOTIF_MAPS.get((pic, region), MOTIF_MAPS.get(region, [])):
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                fx, fy = x0 + i, y0 + j
                if ch == '.' or not mask[fy, fx]:
                    continue
                p = motif_pick(a, K, own, region, fx, fy, ch, line)
                if p is not None:
                    col[fy, fx] = a[p[1], p[0]]
                    src[fy, fx] = p
    for (fx, fy), (X, Y) in MOTIFS.get((pic, region), MOTIFS.get(region, {})).items():
        if mask[fy, fx]:
            col[fy, fx] = a[Y, X]
            src[fy, fx] = (X, Y)
    return mask, col, src


# The kinds of his cloth cleaned of lone specks (despeckle): his navy and black cloth, his gloves, belt and
# boots. His patterned waistcoats (green, wine) and his shirts keep their pattern as he drew it.
DESPECKLE = ('dark', 'grey', 'brown')


def despeckle(a, mask, col, src):
    """His big areas clean (his navy and black cloth, the gloves, belt and boots): a pixel of them whose colour
    none of its 8 neighbours has, all 4 of them his cloth too, takes the colour most of its neighbours have (his
    pixel of it there); and a light speck of a cloth colour of his standing out from all round it goes too. His
    fold lines stay: each pixel of a line has its colour beside it along the line. His gold, whites, blues and
    patterned cloth (his piping, glints, the jewel, the waistcoats) are left as they are."""
    H, W = mask.shape
    cloth = DESPECKLE
    kk = np.array([[kind(col[y, x]) if mask[y, x] else '' for x in range(W)] for y in range(H)])
    L = luma(col.astype(float))
    changes = []
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if not mask[y, x] or kk[y, x] not in cloth:
                continue
            n8 = [(y + dy, x + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx)]
            if not all(mask[q, p] for q, p in n8):
                continue
            n4 = [(y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)]
            mine = tuple(int(v) for v in col[y, x])
            same = any(tuple(int(v) for v in col[q, p]) == mine for q, p in n8)
            lone = not same and all(kk[q, p] in cloth for q, p in n4)
            speck = all(L[y, x] > L[q, p] + 45 for q, p in n8)
            if not (lone or speck):
                continue
            cnt = {}
            for q, p in n8:
                if kk[q, p] in cloth:
                    t = tuple(int(v) for v in col[q, p])
                    cnt[t] = cnt.get(t, 0) + 1
            if not cnt:
                continue
            top = max(cnt.values())
            q, p = next((q, p) for q, p in n8 if kk[q, p] in cloth and cnt[tuple(int(v) for v in col[q, p])] == top)
            changes.append((y, x, q, p))
    for y, x, q, p in changes:
        col[y, x] = col[q, p]
        src[y, x] = src[q, p]


def motif_pick(a, K, own, region, fx, fy, ch, line):
    """The pixel of his a motif map's letter takes in the block of fine pixel (fx, fy): g his gold nearest the
    middle, G his brightest gold, w his brightest white, W his greyest white (a fold), r his red, b his blue,
    L his brightest white or blue (a jewel's light), d his commonest cloth (not gold, not line), # his line. If
    the block has none of it, the nearest block round it that has."""
    want = {'g': ('gold',), 'G': ('gold',), 'w': ('white',), 'W': ('white',), 'r': ('red', 'wine'), 'b': ('blue',),
            'L': ('white', 'blue'), 'd': ('dark', 'grey', 'brown', 'wine', 'green', 'cream', 'skin'), '#': ('line',)}[ch]
    for ring in range(0, 3):
        best = None
        for dy in range(-ring, ring + 1):
            for dx in range(-ring, ring + 1):
                if max(abs(dx), abs(dy)) != ring:
                    continue
                cells, (mx, my) = footprint(fx + dx, fy + dy, region)
                mine = [(X, Y) for X, Y in cells if 0 <= X < CELLS and 0 <= Y < CELLS and own[Y, X] and K[Y, X] in want]
                if not mine:
                    continue
                if ch in ('G', 'w', 'L'):
                    p = max(mine, key=lambda p: (luma(a[p[1], p[0]]), -p[1], -p[0]))
                elif ch == 'W':
                    p = min(mine, key=lambda p: (luma(a[p[1], p[0]]), p[1], p[0]))
                elif ch == 'd':
                    cnt = {}
                    for X, Y in mine:
                        t = tuple(int(v) for v in a[Y, X])
                        cnt[t] = cnt.get(t, 0) + 1
                    top = max(cnt.values())
                    p = min((q for q in mine if cnt[tuple(int(v) for v in a[q[1], q[0]])] == top), key=lambda q: ((q[0] - mx) ** 2 + (q[1] - my) ** 2, q[1], q[0]))
                else:
                    p = min(mine, key=lambda p: ((p[0] - mx) ** 2 + (p[1] - my) ** 2, p[1], p[0]))
                d = dx * dx + dy * dy
                if best is None or d < best[0]:
                    best = (d, p)
        if best:
            return best[1]
    return None


# His motifs as maps of letters over the fine pixels (motif_pick), (x0, y0, rows): where the shrinking left them
# muddy, the cleanest reading of his own pixels.
# The frogging down his chest (his first two pictures): his two gold piping lines down each side of the
# closure (x 50 and 58, where his lines fall), the closure's line down the middle (x 54) and his four frogs
# across it, each a bar of his gold five pixels wide (rows 38, 41, 44, 47, where his bars fall), clear of the
# side lines by one pixel of his cloth as he drew them (at our scale his twin closure lines are one line).
FROGGING = (50, 38, [
    'GdGGGGGdG',
    'GdddGdddG',
    'GdddGdddG',
    'GdGGGGGdG',
    'GdddGdddG',
    'GdddGdddG',
    'GdGGGGGdG',
    'GdddGdddG',
    'GdddGdddG',
    'GdGGGGGdG',
])
# The round gold buckle: a ring of his gold, his darker gold at its corners, his dark middle with his gold
# curl in it.
BUCKLE = (53, 49, [
    'gGGg',
    'GdGG',
    'GddG',
    'gGGg',
])
# The sabre's hilt in his far fist: his gold quillon from the upper left to the grip, his dark grip up into the
# fist, his gold knuckle bow down the right and across under the grip, the blue jewel (two by two of his blue,
# his light at its top right) in the gold at the guard's middle, and the lower quillon to the lower right; his
# line round each.
HILT = (61, 54, [
    '#Gg#..#d#.#G#',
    '.#G#.#d#..#G#',
    '..#G#d#..#g#.',
    '...#Gd#.#G#..',
    '.#gWGgggG#...',
    '.gbLg#gg#....',
    '.gbbg#g#.....',
    '.#gg#.#g#....',
])
# The high collar's foot (his first picture): the collar's two gold front edges down to the yoke (x 50 and 53),
# the gold button at each side of it (two by two, his brightest gold on top), the far wing's front edge (x 57)
# and the gold yoke line across under them (row 35), each where his falls.
COLLAR_FOOT = (46, 30, [
    '....gddgd.......',
    '....gddgd..g....',
    '....gddgd..g....',
    '..GGgddgd..GG...',
    '..gggddgd..gg...',
    'gggggggggggggg..',
])
# His near cuff (his first, second and third pictures): his gold line round its top and the gold wave of its
# embroidery under it.
CUFF_N = (33, 53, [
    '#gGGGg#',
    '#gdgdg#',
    '#dgdgd#',
])
# The scrolled gold band along the near shoulder piece's lower edge: his curls as a wave of his gold over two
# rows, his gold edge at its foot.
EPAULET_BAND = (35, 37, [
    '#dgdgdgd',
    '#gdgdgdg',
    '#gggg...',
])
MOTIF_MAPS = {
    ('high', 'body'): [FROGGING, BUCKLE, HILT, COLLAR_FOOT, CUFF_N, EPAULET_BAND],
    ('folded', 'body'): [FROGGING, BUCKLE, HILT, CUFF_N],
    ('open', 'body'): [BUCKLE, HILT, CUFF_N],
    ('buttoned', 'body'): [HILT],
    ('dark', 'body'): [HILT],
}


def thin(m):
    """Zhang-Suen thinning of a mask to 1 px lines, its shape and joins kept."""
    m = m.copy()
    H, W = m.shape
    while True:
        changed = False
        for step in (0, 1):
            kill = []
            for y, x in zip(*np.nonzero(m)):
                if y == 0 or x == 0 or y == H - 1 or x == W - 1:
                    continue
                P = [m[y - 1, x], m[y - 1, x + 1], m[y, x + 1], m[y + 1, x + 1], m[y + 1, x], m[y + 1, x - 1], m[y, x - 1], m[y - 1, x - 1]]
                B = sum(P)
                A = sum(1 for i in range(8) if not P[i] and P[(i + 1) % 8])
                if not (2 <= B <= 6 and A == 1):
                    continue
                if step == 0 and not (P[0] and P[2] and P[4]) and not (P[2] and P[4] and P[6]):
                    kill.append((y, x))
                if step == 1 and not (P[0] and P[2] and P[6]) and not (P[0] and P[4] and P[6]):
                    kill.append((y, x))
            for y, x in kill:
                m[y, x] = False
            changed |= bool(kill)
        if not changed:
            return m


# His small motifs read cell by cell where the shrinking cannot keep them (his "Reducir y limpiar yo": the
# cleanest reading of his own pixels, never a new motif): each fine pixel -> the pixel of his it shows.
MOTIFS = {
    # his far eye: his white and, against his far cheek, his bright red iris (the shrinking put his cheek's line
    # over the red)
    'head': {(59, 21): (117, 32)},
}



# A block more than this much of whose pixels are his gold is his embroidery there: gold, so his dense
# embroidery keeps its weight at our scale (his thin piping fills less of a block and stays a line).
GOLD_DENSE = 0.55


def piping(a, K, own, region, mask, col, src):
    """His gold piping, frogging and trim as continuous 1 px lines of his gold. His gold is thinned to its
    middle lines on HIS picture (thin(): each of his gold strokes becomes a line one of his pixels wide, its
    joins and ends kept), and each pixel of those lines marks the fine pixel it shrinks into: so the course
    follows his strokes, unbroken (two of his pixels side by side shrink into the same or neighbouring fine
    pixels), and his strokes far enough apart stay apart. Where his gold is a solid area (a button, the buckle,
    the chape: GOLD_SOLID of the block) it is kept whole. The course is thinned again at our scale, and each of
    its pixels shows his gold nearest its block's middle; a fine pixel his gold touches off the course shows
    his commonest other colour of its block. Every colour is his."""
    H, W = mask.shape
    gold = own & (K == 'gold')
    course = np.zeros((H, W), bool)
    for Y, X in zip(*np.nonzero(thin(gold))):
        fx, fy = fine_of(X, Y, region)
        if 0 <= fx < W and 0 <= fy < H and mask[fy, fx]:
            course[fy, fx] = True
    # (his solid gold: a gold pixel of his with gold all round it; his strokes two pixels thick have none)
    gp = np.pad(gold, 1)
    inner = gold.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            inner &= gp[1 + dy:1 + dy + gold.shape[0], 1 + dx:1 + dx + gold.shape[1]]
    solid = np.zeros((H, W), bool)
    dense = np.zeros((H, W), bool)
    blocks = {}
    for fy in range(H):
        for fx in range(W):
            if not mask[fy, fx]:
                continue
            cells, (mx, my) = footprint(fx, fy, region)
            mine = [(X, Y) for X, Y in cells if 0 <= X < CELLS and 0 <= Y < CELLS and own[Y, X]]
            g = [p for p in mine if K[p[1], p[0]] == 'gold']
            if g:
                solid[fy, fx] = any(inner[Y, X] for X, Y in g)
                dense[fy, fx] = len(g) > GOLD_DENSE * len(mine)
                blocks[(fx, fy)] = (mine, g, (mx, my))
    keep = (thin(course) | solid | dense) & np.isin(np.arange(H * W).reshape(H, W), [fy * W + fx for fx, fy in blocks])
    for (fx, fy), (mine, g, (mx, my)) in blocks.items():
        if keep[fy, fx]:
            pick = min(g, key=lambda p: ((p[0] - mx) ** 2 + (p[1] - my) ** 2, p[1], p[0]))
        else:
            other = [p for p in mine if K[p[1], p[0]] != 'gold']
            if not other:
                continue
            cnt = {}
            for X, Y in other:
                t = tuple(int(v) for v in a[Y, X])
                cnt[t] = cnt.get(t, 0) + 1
            best = max(cnt.values())
            pick = min((p for p in other if cnt[tuple(int(v) for v in a[p[1], p[0]])] == best), key=lambda p: ((p[0] - mx) ** 2 + (p[1] - my) ** 2, p[1], p[0]))
        col[fy, fx] = a[pick[1], pick[0]]
        src[fy, fx] = pick


def bridge(a, K, own, region, k, mask, col, src, fk, kept):
    """His thin details of kind k (each a patch of his pixels at most THIN across, MIN_RUN long or more)
    joined again where the reduction broke them: a fine pixel his detail runs through (and that shows
    something else) takes his pixel there when it joins two broken pieces of it, or (a gap of two) when it
    and the next one do; a detail the reduction lost whole keeps the fine pixel most of it falls in. Nothing
    is added that his detail does not run through, so his piping stays as thin as the reduction allows."""
    H, W = mask.shape
    m = own & (K == k)
    rx, ry = runs(m)
    thin = m & (np.minimum(rx, ry) <= THIN)
    size = components(thin)
    seen = np.zeros(m.shape, bool)
    for Y0, X0 in zip(*np.nonzero(thin)):
        if seen[Y0, X0] or size[Y0, X0] < MIN_RUN[k]:
            continue
        comp, stack = [], [(Y0, X0)]
        seen[Y0, X0] = True
        while stack:
            q, w = stack.pop()
            comp.append((q, w))
            for dq in (-1, 0, 1):
                for dw in (-1, 0, 1):
                    u, v = q + dq, w + dw
                    if 0 <= u < m.shape[0] and 0 <= v < m.shape[1] and thin[u, v] and not seen[u, v]:
                        seen[u, v] = True
                        stack.append((u, v))
        # the fine pixels it runs through, and his pixel nearest each one's middle
        cells = {}
        for Y, X in sorted(comp):
            f = fine_of(X, Y, region)
            if not (0 <= f[0] < W and 0 <= f[1] < H) or not mask[f[1], f[0]]:
                continue
            cells.setdefault(f, []).append((X, Y))
        if not cells:
            continue
        has = lambda f: fk[f[1], f[0]] == k
        free = lambda f: not kept[f[1], f[0]] and not has(f)

        def put(f):
            X, Y = cells[f][len(cells[f]) // 2]
            col[f[1], f[0]] = a[Y, X]
            src[f[1], f[0]] = (X, Y)
            fk[f[1], f[0]] = k
            kept[f[1], f[0]] = True

        # every fine pixel it runs through shows it, or one beside it on its course does (4-neighbours),
        # without a 2 x 2 square of it
        def square(f):
            x, y = f
            K8 = lambda dx, dy: 0 <= x + dx < W and 0 <= y + dy < H and fk[y + dy, x + dx] == k
            # nor a checker: two of it touching it only at corners that are not in line
            diag = [(dx, dy) for dx in (-1, 1) for dy in (-1, 1) if K8(dx, dy)]
            if not any(K8(dx, dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))) and len(diag) >= 2:
                if not (len(diag) == 2 and diag[0][0] == -diag[1][0] and diag[0][1] == -diag[1][1]):
                    return True
            for dy in (-1, 0):
                for dx in (-1, 0):
                    if all((x + dx + i, y + dy + j) == f or (0 <= x + dx + i < W and 0 <= y + dy + j < H and fk[y + dy + j, x + dx + i] == k) for j in (0, 1) for i in (0, 1)):
                        return True
            return False

        for f in sorted(cells, key=lambda f: (-len(cells[f]), f[1], f[0])):
            near = [(f[0] + 1, f[1]), (f[0] - 1, f[1]), (f[0], f[1] + 1), (f[0], f[1] - 1)]
            if free(f) and not any(g in cells and has(g) for g in near) and not square(f):
                put(f)
        for _ in range(64):
            # the pieces of it the reduction shows (8-connected, among the fine pixels it runs through)
            lab = {}
            n = 0
            for f in sorted(cells):
                if not has(f) or f in lab:
                    continue
                n += 1
                st = [f]
                lab[f] = n
                while st:
                    x, y = st.pop()
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            g = (x + dx, y + dy)
                            if g in cells and has(g) and g not in lab:
                                lab[g] = n
                                st.append(g)
            if n <= 1:
                break
            touch = lambda f: {lab[(f[0] + dx, f[1] + dy)] for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (f[0] + dx, f[1] + dy) in lab}
            done = False
            for f in sorted(cells, key=lambda f: (-len(cells[f]), f[1], f[0])):
                if free(f) and len(touch(f)) >= 2 and not square(f):
                    put(f)
                    done = True
                    break
            if not done:
                for f in sorted(cells, key=lambda f: (-len(cells[f]), f[1], f[0])):
                    if not free(f) or len(touch(f)) != 1 or square(f):
                        continue
                    t = touch(f)
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            g = (f[0] + dx, f[1] + dy)
                            if not done and g in cells and free(g) and touch(g) - t:
                                put(f)
                                put(g)
                                done = True
                    if done:
                        break
            if not done:
                break


def regions(a, bg, pic='high'):
    """His figure split into the head and the body: {name: mask of his pixels}."""
    head = inside(HEAD_REGIONS.get(pic, HEAD_REGION), CELLS, CELLS) & ~bg
    return {'head': head, 'body': ~bg & ~head}


# His black-haired head in the dark coat's picture reaches lower beside the ear (loose strands at the temple)
# and its collar stands lower: its own head region.
HEAD_REGIONS = {
    'dark': [
        (91, 0), (113, 0), (125, 6), (131, 14), (133, 22), (131, 30), (127, 33), (123, 36), (121, 41), (116, 45),
        (111, 47), (104, 47), (99, 43), (95, 43), (90, 42), (86, 36), (84, 30), (82, 23), (85, 15), (88, 8),
    ],
}


def outline(mask, col, line):
    """His 1 px black line round the figure: every pixel of it beside the white round him is his line."""
    p = np.pad(mask, 1)
    edge = mask & ~(p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:])
    out = col.copy()
    out[edge] = line
    return out


# His head's parts: his face (his skin, eyes, brows, nose and mouth and the line round them, inside FACE_BOX,
# below his fringe's FACE_TOP) and his hair (everything else on his head).
FACE_BOX = [(89, 27), (97, 25), (100, 19), (118, 19), (122, 24), (122, 35), (120, 41), (114, 46), (104, 47), (99, 42), (94, 38), (89, 35)]
FACE_TOP = 25
# (his black hair's loose strands hang beside the ear in the dark coat's picture)
FACE_BOXES = {'dark': [(96, 27), (100, 19), (118, 19), (122, 24), (122, 35), (120, 41), (114, 46), (104, 47), (99, 42), (96, 36)]}


def head_labels(a, K, R, pic='high'):
    """His head split into 'face' and 'hair' (his pixels)."""
    H, W = K.shape
    lab = np.full((H, W), '', dtype='<U10')
    head = R['head']
    face = inside(FACE_BOXES.get(pic, FACE_BOX), H, W)
    rows = np.arange(H)[:, None]
    line = K == 'line'
    lab[head & face & np.isin(K, ('skin', 'red', 'white'))] = 'face'
    # (below his fringe his browns and darks are his brows and the shading of his nose and mouth)
    lab[head & face & (rows > FACE_TOP) & np.isin(K, ('brown', 'dark', 'wine', 'gold', 'grey'))] = 'face'
    lab[head & (lab == '') & ~line] = 'hair'
    # his line: inside the face's box beside his skin, the face's; else the hair's
    for y, x in zip(*np.nonzero(head & line)):
        near = [lab[q, w] for q in range(max(0, y - 1), min(H, y + 2)) for w in range(max(0, x - 1), min(W, x + 2))]
        lab[y, x] = 'face' if face[y, x] and 'face' in near else 'hair'
    return lab


# His throat where each picture's collar opens (his pixel corners): the only skin on his body.
THROATS = {
    'folded': [(98, 42), (114, 42), (112, 60), (104, 62), (98, 52)],
    'open': [(99, 40), (115, 40), (113, 56), (106, 58), (100, 50)],
    'buttoned': [(99, 40), (116, 40), (114, 50), (101, 50)],
    'dark': [(98, 42), (116, 42), (114, 64), (106, 66), (99, 56)],
}


def prepared(pic='high'):
    """His picture `pic` ready to reduce: (his pixels snapped to his palette, his line colour, kinds, the
    white round him, the head and body regions)."""
    if ('prep', pic) not in _CACHE:
        raw = native(pic)
        bg = background(raw)
        a, line, K = snapped(raw, bg)
        R = regions(a, bg, pic)
        # (there is no gold on his head: his face's warm shadows are skin; and no skin on his body but his throat
        # where a collar opens: elsewhere his gold's warm shadows are gold)
        K[R['head'] & (K == 'gold')] = 'skin'
        throat = inside(THROATS[pic], CELLS, CELLS) if pic in THROATS else np.zeros(K.shape, bool)
        K[R['body'] & (K == 'skin') & ~throat] = 'gold'
        _CACHE[('prep', pic)] = (a, line, K, bg, R)
    return _CACHE[('prep', pic)]


def game(pic='high', clean=True):
    """His figure in picture `pic` at our scale (the cleaned reduction, or with clean=False the even one):
    (rgb, mask, part of each pixel, kinds of each pixel), 100 x 100 at OFFSET in our male idle frame 0. Head
    over body."""
    if isinstance(pic, bool):
        pic, clean = 'high', pic
    key = ('game', pic, clean)
    if key in _CACHE:
        return _CACHE[key]
    disk = _disk(f'game-{pic}-{int(clean)}')
    if disk and os.path.exists(disk):
        z = np.load(disk)
        _CACHE[key] = (z['out'], z['mask'], z['part'], z['GK'])
        return _CACHE[key]
    a, line, K, bg, R = prepared(pic)
    lab = labels(a, K, bg, R, pic)
    hl = head_labels(a, K, R, pic)
    out = np.zeros((SIZE, SIZE, 3), np.int32)
    mask = np.zeros((SIZE, SIZE), bool)
    part = np.full((SIZE, SIZE), '', dtype='<U12')

    # (his red is an accent only in his eyes and the scabbard's stone)
    def accent(X, Y, k):
        return k != 'red' or lab[Y, X] in ('head', 'scabbard')

    for name in ('body', 'head'):
        m, c, src = reduce_region(a, K, R[name], name, clean, line, accent, pic)
        out[m] = c[m]
        mask |= m
        for y, x in zip(*np.nonzero(m)):
            X, Y = src[y, x]
            part[y, x] = hl[Y, X] if name == 'head' else lab[Y, X]
    GK = np.full((SIZE, SIZE), '', dtype='<U6')
    for y, x in zip(*np.nonzero(mask)):
        GK[y, x] = kind(out[y, x])
    if clean:
        tidy_parts(part, mask, GK)
    _CACHE[key] = (out, mask, part, GK)
    if disk:
        np.savez(disk, out=out, mask=mask, part=part, GK=GK)
    return _CACHE[key]


def _disk(name):
    """With NAVY_CACHE set to a folder (outside the repository), the reductions are kept there between runs,
    keyed by this file's text and his pictures' bytes (the same inputs give the same bytes either way)."""
    d = os.environ.get('NAVY_CACHE')
    if not d:
        return None
    import hashlib
    h = hashlib.sha1(open(os.path.abspath(__file__), 'rb').read())
    for path in PICS.values():
        h.update(open(path, 'rb').read())
    os.makedirs(d, exist_ok=True)
    return os.path.join(d, f'{name}-{h.hexdigest()[:16]}.npz')


HEAD_PARTS = ('face', 'hair')


def tidy_parts(part, mask, GK):
    """At our scale a part keeps only what is of it: a pixel of his line with none of the part's own colours
    beside it, or a speck of the part of 2 pixels or fewer apart from the rest, goes to the part most of its
    neighbours are: shrinking his picture can leave a bit of a neighbour's line or trim on a part, which would
    hang loose once that part moves or is taken off."""
    H, W = mask.shape
    # (a speck of his hair apart from the rest, by his chin, is his face's line)
    sz = components(part == 'hair')
    part[(part == 'hair') & (sz <= 3)] = 'face'
    for _ in range(3):
        changed = False
        sizes = {}
        for n in set(part[mask].tolist()) - {''} - set(HEAD_PARTS):
            sz = components(part == n)
            for y, x in zip(*np.nonzero(part == n)):
                sizes[(y, x)] = sz[y, x]
        for y, x in zip(*np.nonzero(mask)):
            n = part[y, x]
            if n == '' or n in HEAD_PARTS:
                continue
            nb = [(y + dy, x + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and 0 <= y + dy < H and 0 <= x + dx < W and mask[y + dy, x + dx]]
            own = [q for q in nb if part[q] == n and GK[q] != 'line']
            loose = (GK[y, x] == 'line' and not own) or sizes.get((y, x), 99) <= 2
            if not loose:
                continue
            others = [part[q] for q in nb if part[q] != n and part[q] not in HEAD_PARTS and GK[q] != 'line'] or [part[q] for q in nb if part[q] != n and part[q] not in HEAD_PARTS]
            if not others:
                continue
            part[y, x] = max(sorted(set(others)), key=others.count)
            changed = True
        if not changed:
            break


def part_study(path, pic='high', k=8):
    """The game picture with each part in its own colour (his line darker), at k x."""
    g, m, part, GK = game(pic)
    names = sorted(set(part[m].tolist()))
    pal = [(230, 25, 75), (60, 180, 75), (255, 225, 25), (0, 130, 200), (245, 130, 48), (145, 30, 180), (70, 240, 240),
           (240, 50, 230), (210, 245, 60), (250, 190, 212), (0, 128, 128), (220, 190, 255), (170, 110, 40), (255, 250, 200),
           (128, 0, 0), (170, 255, 195), (128, 128, 0), (255, 215, 180), (0, 0, 128), (128, 128, 128), (90, 200, 120),
           (200, 90, 120), (120, 90, 200), (60, 60, 60), (200, 200, 0), (0, 200, 200), (200, 0, 200)]
    out = np.full((SIZE, SIZE, 3), 255, np.int32)
    for i, n in enumerate(names):
        out[part == n] = pal[i % len(pal)]
    ln = m & (GK == 'line')
    out[ln] = (out[ln] * 0.45).astype(np.int32)
    img = Image.fromarray(out.astype(np.uint8)).resize((SIZE * k, SIZE * k), Image.NEAREST)
    from PIL import ImageDraw
    d = ImageDraw.Draw(img)
    for x in range(0, SIZE, 5):
        c = (255, 0, 0) if x % 10 == 0 else (150, 150, 150)
        d.line([(x * k, 0), (x * k, SIZE * k)], fill=c)
        d.line([(0, x * k), (SIZE * k, x * k)], fill=c)
        if x % 10 == 0:
            d.text((x * k + 2, 2), str(x), fill=(255, 0, 255))
            d.text((2, x * k + 2), str(x), fill=(255, 0, 255))
    for n in names:
        ys, xs = np.nonzero(part == n)
        d.text((int(xs.mean() * k) - 10, int(ys.mean() * k)), n, fill=(0, 0, 0))
    img.save(path)


def rgba(col, mask):
    out = np.zeros(mask.shape + (4,), np.uint8)
    out[mask, :3] = col[mask]
    out[mask, 3] = 255
    return out


def his_line(a=None):
    """His black line: the commonest of his line colours."""
    if 'line' not in _CACHE:
        raw = native()
        _CACHE['line'] = snapped(raw, background(raw))[1]
    return _CACHE['line']


def pack(col, mask):
    """Rows of palette characters (one per colour of his, exactly: the reduction already took his JPEG's noise
    off), the origin (x0, y0) and the palette."""
    H, W = mask.shape
    grid = np.full((H, W), '.', dtype='<U1')
    palette, seen = {}, {}
    for y in range(H):
        for x in range(W):
            if not mask[y, x]:
                continue
            t = tuple(int(v) for v in col[y, x])
            if t not in seen:
                seen[t] = CHARS[len(seen)]
                palette[seen[t]] = hexc(t)
            grid[y, x] = seen[t]
    yy, xx = np.nonzero(grid != '.')
    x0, x1, y0, y1 = xx.min(), xx.max() + 1, yy.min(), yy.max() + 1
    return [''.join(grid[y, x0:x1]) for y in range(y0, y1)], (int(x0), int(y0)), palette


def ts_piece(name, doc, rows, origin, palette, pivot, ang):
    """A PaintedPiece (src/sprite/painted.ts) as TypeScript: `pivot` the cell (game picture) that lands on
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


def _main():
    # python3 -I tools/refs/navy_ref.py <dir> [pic]: his picture, the even reduction and the cleaned one;
    # --labels out.png [pic] his parts on his picture; --parts out.png [pic] the parts at our scale.
    pic = sys.argv[3] if len(sys.argv) > 3 else 'high'
    if sys.argv[1] == '--labels':
        label_study(sys.argv[2], pic)
        return
    if sys.argv[1] == '--parts':
        part_study(sys.argv[2], pic)
        return
    d = sys.argv[1]
    pic = sys.argv[2] if len(sys.argv) > 2 else 'high'
    os.makedirs(d, exist_ok=True)
    raw = native(pic)
    save(np.concatenate([raw.astype(np.uint8), np.full(raw.shape[:2] + (1,), 255, np.uint8)], axis=2), os.path.join(d, f'his-{pic}@4.png'), 4)
    for c, n in ((False, 'unclean'), (True, 'clean')):
        g, m, _, _ = game(pic, c)
        save(rgba(g, m), os.path.join(d, f'{n}-{pic}@8.png'), 8)


# ---------------------------------------------------------------------------------------------------
# His figure cut into the parts each item draws, on HIS picture (where his shapes are clear): polygons
# in his pixel corners, in the order they claim his pixels (a pixel goes to the first part whose polygon
# holds it and whose kinds take it; his line goes to the part beside it). The reduction carries the
# parts down to our scale: each fine pixel is the part of his pixel it shows.
# ---------------------------------------------------------------------------------------------------
ALL = ('dark', 'line', 'gold', 'grey', 'brown', 'white', 'wine', 'red', 'blue', 'cream', 'green', 'skin')
# The scabbard in his near fist: a straight band from its gold chape at the lower left up through the fist to
# its gold throat beside the belt (its middle line, his pixel corners, and its half width).
SCABBARD = ((42.0, 160.5), (90.5, 96.0), 3.6)
SCABBARD_THROAT = [(83, 95), (95, 95), (96, 111), (90, 114), (83, 110)]
BODY_PARTS = [
    # the sabre's hilt at his far hip: the gold guard and knuckle bow with the blue jewel, the dark grip
    ('hilt', [(127, 96), (135, 95), (146, 91), (152, 95), (151, 103), (146, 110), (143, 118), (138, 121), (130, 120), (127, 112)], ALL),
    # his black gloves, the far one on the grip, the near one round the scabbard
    ('glove_f', [(135, 83), (143, 82), (150, 85), (153, 92), (151, 101), (146, 104), (140, 100), (136, 95)], ('grey', 'dark', 'line', 'brown', 'white', 'gold')),
    ('glove_n', [(68, 104), (84, 104), (87, 110), (85, 121), (78, 125), (70, 123), (67, 112)], ('grey', 'dark', 'line', 'brown', 'white')),
    # the coat's cuffs: navy with gold bands and embroidery, from the forearm to the wrist
    ('cuff_f', [(124, 76), (131, 73), (138, 77), (140, 85), (138, 93), (132, 95), (125, 90)], ('gold', 'dark', 'line', 'grey', 'red', 'wine')),
    ('cuff_n', [(61, 93), (82, 93), (82, 105), (62, 105)], ('gold', 'dark', 'line', 'grey', 'red', 'wine')),
    ('scabbard', 'scabbard', ALL),
    # the ornate gold-embroidered shoulder pieces over his shoulders (his first picture)
    ('epaulet_n', [(64, 62), (69, 54), (78, 49), (90, 49), (98, 54), (101, 59), (96, 64), (88, 68), (78, 69), (68, 69), (64, 67)], ('dark', 'gold', 'line', 'grey')),
    ('epaulet_f', [(117, 49), (125, 49), (131, 54), (134, 62), (133, 71), (127, 71), (121, 66), (118, 58)], ('dark', 'gold', 'line', 'grey')),
    # the high collar round the neck, navy outside and burgundy inside, gold-edged, with its gold buttons
    ('collar', [(87, 35), (96, 36), (101, 44), (104, 48), (110, 48), (113, 44), (117, 38), (125, 39), (124, 52), (121, 58), (112, 56), (100, 57), (94, 56), (88, 50)], ('dark', 'gold', 'line', 'wine', 'grey', 'white', 'red')),
    ('belt', [(89, 86), (127, 86), (127, 96), (89, 96)], ('brown', 'gold', 'dark', 'line', 'white', 'grey', 'red', 'wine')),
    # the sleeves from the shoulders to the cuffs
    ('sleeve_n', [(60, 64), (66, 54), (76, 48), (88, 48), (92, 60), (89, 70), (88, 82), (87, 93), (60, 93)], ('dark', 'line', 'grey', 'gold')),
    ('sleeve_f', [(118, 46), (128, 48), (134, 58), (138, 70), (143, 80), (138, 82), (128, 80), (124, 76), (120, 66)], ('dark', 'line', 'grey', 'gold')),
    # the coat's body from the collar to the belt (his frogging, piping and scrollwork)
    ('coat', [(84, 44), (127, 42), (129, 60), (127, 88), (88, 88), (86, 70)], ALL),
    # the boots: the folded brown cuffs with gold trim, the black shafts and feet
    # (the near tail's tip hangs beside the near boot's cuff, x 67-76: the tail's)
    ('boot_n', [(77, 146), (93, 146), (93, 176), (91, 200), (64, 200), (66, 178), (76, 160)], ('dark', 'line', 'gold', 'brown', 'grey', 'white', 'wine')),
    ('boot_f', [(100, 146), (128, 146), (128, 180), (146, 185), (146, 200), (104, 200), (101, 178)], ('dark', 'line', 'gold', 'brown', 'grey', 'white', 'wine')),
    # the coat's tails below the belt: the front flaps with their scrolls, the long near tail down to the
    # scabbard's side, the far tail, and the burgundy lining between the legs
    ('tails_front', [(88, 96), (128, 96), (129, 112), (124, 116), (108, 115), (100, 117), (92, 122)], ALL),
    ('tails_n', [(80, 96), (92, 96), (93, 118), (86, 134), (81, 150), (78, 161), (64, 161), (60, 150), (62, 140), (72, 126), (79, 110)], ALL),
    ('tails_f', [(117, 100), (128, 98), (131, 120), (137, 140), (138, 160), (127, 160), (124, 146), (121, 126)], ALL),
    # the burgundy lining of the tails' back panel, seen between and beside the legs
    ('tails_back', [(60, 112), (132, 112), (134, 162), (58, 162)], ('wine',)),
    ('trousers_n', [(78, 110), (101, 112), (104, 130), (101, 147), (92, 150), (68, 150), (73, 128)], ('dark', 'line', 'grey', 'gold')),
    ('trousers_f', [(101, 110), (123, 110), (126, 150), (101, 150), (104, 130)], ('dark', 'line', 'grey', 'gold')),
]
# Whatever is left of his figure below the head is the coat's tails (their burgundy lining behind his legs).
LEFT = 'tails_n'
# The other pictures' own parts, claimed before BODY_PARTS (pic -> parts); a name listed here with None
# drops that part of BODY_PARTS in that picture (his plain shoulders have no shoulder pieces).
# (the other pictures' coats have plain shoulders, and their collar or lapels are the coat's own)
NO_EPAULETS = [('epaulet_n', None, ()), ('epaulet_f', None, ()), ('collar', None, ()),
               ('coat', [(84, 34), (127, 34), (129, 60), (127, 88), (88, 88), (86, 70)], ALL)]
# (his open hand hangs elsewhere in these two pictures, the scabbard lower: what the first picture's scabbard
# covers is their coat's tails, and their own scabbard, lower, is left out: the game keeps the first picture's)
NO_SCABBARD = [('scabbard', None, ())]
# Their own scabbard (a band as SCABBARD: its middle line from the chape up to where it goes behind the tails)
OTHER_SCABBARD = {'buttoned': ((52.0, 166.5), (79.5, 140.5), 3.4), 'dark': ((53.0, 166.5), (69.5, 147.0), 3.4)}
PIC_PARTS = {
    # his plain shoulders seamed in gold, the folded collar open at the throat
    'folded': NO_EPAULETS,
    # the open coat: the cream shirt and the burgundy vest between the lapels (its points below the belt)
    'open': NO_EPAULETS + [
        ('tails_front', None, ()),
        ('vest', [(98, 44), (116, 44), (116, 58), (115, 64), (117, 66), (117, 87), (102, 87), (101, 72), (104, 66), (101, 58), (99, 52)], ALL),
        ('vest', [(100, 96), (119, 96), (120, 104), (110, 107), (101, 104)], ALL),
    ],
    # the buttoned coat: the cream cravat at the throat, the green waistcoat under the gold frog bars (no belt)
    'buttoned': NO_EPAULETS + NO_SCABBARD + [
        ('scabbard_x', ('band', 'buttoned'), ALL),
        ('belt', None, ()),
        ('tails_front', None, ()),
        ('vest', [(100, 44), (115, 44), (115, 52), (112, 62), (107, 65), (103, 59), (100, 50)], ('cream', 'skin', 'white', 'brown', 'line', 'grey', 'gold', 'dark')),
        ('vest', [(104, 74), (119, 74), (119, 98), (118, 103), (110, 105), (103, 102), (103, 90)], ('green', 'line', 'dark', 'grey')),
    ],
    # the dark coat: the black shirt open at the throat, the red brocade waistcoat, the burgundy sash with its
    # hanging end and the gold chain below it; his flame-embroidered cuffs sit a little higher on the near arm
    'dark': NO_EPAULETS + NO_SCABBARD + [
        ('scabbard_x', ('band', 'dark'), ALL),
        ('belt', None, ()),
        ('tails_front', None, ()),
        ('sash', [(97, 86), (124, 86), (125, 98), (124, 120), (117, 120), (116, 99), (98, 99)], ALL),
        ('sash', [(95, 99), (101, 99), (101, 117), (95, 117)], ('gold', 'line', 'brown')),
        ('vest', [(99, 45), (116, 45), (117, 55), (117, 87), (102, 87), (101, 70), (99, 55)], ALL),
        ('cuff_n', [(60, 88), (81, 88), (82, 104), (61, 104)], ('gold', 'dark', 'line', 'grey', 'red', 'wine', 'brown')),
    ],
}


def body_parts(pic='high'):
    # (a picture's under-layers and sash claim their pixels before its coat)
    own = sorted(PIC_PARTS.get(pic, []), key=lambda q: q[0] not in ('scabbard_x', 'vest', 'sash'))
    # (a part a picture draws its own way, or not at all, replaces the first picture's)
    gone = {n for n, p, _ in own}
    return [q for q in own if q[1] is not None] + [q for q in BODY_PARTS if q[0] not in gone]


def part_mask(p, H, W):
    if p == 'scabbard' or (isinstance(p, tuple) and p[0] == 'band'):
        (x0, y0), (x1, y1), half = SCABBARD if p == 'scabbard' else OTHER_SCABBARD[p[1]]
        ys, xs = np.mgrid[0:H, 0:W]
        px, py = xs + 0.5, ys + 0.5
        vx, vy = x1 - x0, y1 - y0
        t = np.clip(((px - x0) * vx + (py - y0) * vy) / (vx * vx + vy * vy), 0, 1)
        band_ = np.hypot(px - (x0 + t * vx), py - (y0 + t * vy)) <= half
        return band_ | inside(SCABBARD_THROAT, H, W) if p == 'scabbard' else band_
    return inside(p, H, W)


def labels(a, K, bg, R, pic='high'):
    """His figure split into parts: an array of part names per his pixel ('' outside him)."""
    H, W = K.shape
    lab = np.full((H, W), '', dtype='<U12')
    lab[R['head']] = 'head'
    body = R['body']
    line = K == 'line'
    parts = body_parts(pic)
    polys = [(n, part_mask(p, H, W), takes) for n, p, takes in parts]
    for n, pm, takes in polys:
        m = pm & body & (lab == '') & ~line & np.isin(K, takes)
        lab[m] = n
    # his line: to the part beside it whose polygon holds it, in the parts' order, else any part beside it
    colour = lab.copy()
    for y, x in zip(*np.nonzero(line & body & (lab == ''))):
        near = {colour[q, w] for q in range(max(0, y - 1), min(H, y + 2)) for w in range(max(0, x - 1), min(W, x + 2))} - {'', 'head'}
        for n, pm, _ in polys:
            if n in near and pm[y, x]:
                lab[y, x] = n
                break
    # what no part took goes to the first part whose polygon holds it
    for n, pm, _ in polys:
        lab[pm & body & (lab == '')] = n
    # what is left (a speck between parts) goes to the part beside it, the commonest round it
    for _ in range(6):
        left = list(zip(*np.nonzero(body & (lab == ''))))
        if not left:
            break
        put = []
        for y, x in left:
            near = [lab[q, w] for q in range(max(0, y - 1), min(H, y + 2)) for w in range(max(0, x - 1), min(W, x + 2))]
            near = [n for n in near if n not in ('', 'head')]
            if near:
                put.append((y, x, max(sorted(set(near)), key=near.count)))
        for y, x, n in put:
            lab[y, x] = n
    lab[body & (lab == '')] = LEFT
    return lab


PALETTE_STUDY = [(230, 25, 75), (60, 180, 75), (255, 225, 25), (0, 130, 200), (245, 130, 48), (145, 30, 180), (70, 240, 240),
                 (240, 50, 230), (210, 245, 60), (250, 190, 212), (0, 128, 128), (220, 190, 255), (170, 110, 40), (255, 250, 200),
                 (128, 0, 0), (170, 255, 195), (128, 128, 0), (255, 215, 180), (0, 0, 128), (128, 128, 128), (90, 200, 120),
                 (200, 90, 120), (120, 90, 200), (60, 60, 60)]


def label_study(path, pic='high', k=5):
    """His picture with each part tinted over his pixels, at k x (python3 -I tools/refs/navy_ref.py --labels out.png [pic])."""
    a, line, K, bg, R = prepared(pic)
    lab = labels(a, K, bg, R, pic)
    hl = head_labels(a, K, R, pic)
    lab = np.where(R['head'], np.char.add('head:', hl), lab)
    names = sorted(set(lab[lab != ''].tolist()))
    tint = {n: np.array(PALETTE_STUDY[i % len(PALETTE_STUDY)]) for i, n in enumerate(names)}
    out = np.full(a.shape, 255.0)
    for n in names:
        m = lab == n
        out[m] = 0.45 * tint[n] + 0.55 * a[m]
    out[(K == 'line') & (lab != '')] *= 0.4
    img = Image.fromarray(out.astype(np.uint8)).resize((200 * k, 200 * k), Image.NEAREST)
    from PIL import ImageDraw
    d = ImageDraw.Draw(img)
    for x in range(0, 200, 10):
        d.line([(x * k, 0), (x * k, 200 * k)], fill=(200, 200, 255))
        d.line([(0, x * k), (200 * k, x * k)], fill=(200, 200, 255))
        d.text((x * k + 1, 1), str(x), fill=(255, 0, 255))
        d.text((1, x * k + 1), str(x), fill=(255, 0, 255))
    for n in names:
        ys, xs = np.nonzero(lab == n)
        d.text((int(np.median(xs)) * k - 10, int(np.median(ys)) * k), n, fill=(0, 0, 0))
    img.save(path)


if __name__ == '__main__':
    _main()


# ---------------------------------------------------------------------------------------------------
# The pieces at our scale, with what his picture hides of each continued from his own pixels.
# ---------------------------------------------------------------------------------------------------
# The order the game draws them in, back to front (the layers they go into, items/navy.ts): a piece's hidden
# cells are filled only where a piece later in this order covers them at rest, so put together at rest they
# are his figure pixel for pixel.
DEPTH_ORDER = [
    'tails_back', 'sleeve_f', 'trousers_f', 'boot_f', 'trousers_n', 'boot_n', 'seat', 'vest', 'coat', 'tails', 'belt',
    'sash', 'epaulet_f', 'hilt', 'glove_f', 'hair_back', 'face', 'hair', 'scabbard', 'sleeve_n', 'glove_n', 'epaulet_n',
]
# Which of his labelled parts each piece gathers.
PIECE_OF = {
    'coat': 'coat', 'collar': 'coat', 'sleeve_n': 'sleeve_n', 'cuff_n': 'sleeve_n', 'sleeve_f': 'sleeve_f', 'cuff_f': 'sleeve_f',
    'tails_front': 'tails', 'tails_n': 'tails', 'tails_f': 'tails',
}



def continue_along(col, src, hidden, axis, period, line_edge=None, black=None):
    """Fills the cells of `hidden` from the source cells: each takes the colour of the first source cell
    `period`, 2 `period`... cells back along `axis` (dx, dy), else that far the other way, else the nearest
    source cell in its row, so his folds, seams and piping run on through it. Filled cells become sources
    for the next ones. Cells of `line_edge` take his black line (the hidden part's outline)."""
    H, W = src.shape
    dx, dy = axis
    n = float(np.hypot(dx, dy))
    dx, dy = dx / n, dy / n
    s = src.copy()
    c = col.copy()
    todo = sorted(zip(*np.nonzero(hidden & ~src)))
    while todo:
        rest, done = [], []
        for y, x in todo:
            if line_edge is not None and line_edge[y, x]:
                c[y, x] = black
                continue
            got = None
            for sign in (-1, 1):
                for k in range(1, 60):
                    q = int(np.floor(y + 0.5 + sign * dy * period * k))
                    p = int(np.floor(x + 0.5 + sign * dx * period * k))
                    if not (0 <= q < H and 0 <= p < W):
                        break
                    if s[q, p]:
                        got = c[q, p]
                        break
                if got is not None:
                    break
            if got is None:
                xs = np.nonzero(s[y])[0]
                if len(xs):
                    got = c[y, xs[np.argmin(np.abs(xs - x))]]
            if got is None:
                rest.append((y, x))
                continue
            c[y, x] = got
            done.append((y, x))
        for y, x in done:
            s[y, x] = True
        if rest and len(rest) == len(todo):
            ys, xs = np.nonzero(s)
            if not len(ys):
                raise ValueError('cells with nothing to continue from: %r' % rest[:5])
            for y, x in rest:
                k = int(np.argmin((ys - y) ** 2 + (xs - x) ** 2))
                c[y, x] = c[ys[k], xs[k]]
            rest = []
        todo = rest
    return c


def edge4(shape):
    """The cells of a shape with a 4-neighbour outside it."""
    p = np.pad(shape, 1)
    return shape & ~(p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:])


def band(p0, p1, half, H=SIZE, W=SIZE):
    """The cells whose centres lie within `half` of the segment p0-p1."""
    ys, xs = np.mgrid[0:H, 0:W]
    px, py = xs + 0.5, ys + 0.5
    (x0, y0), (x1, y1) = p0, p1
    vx, vy = x1 - x0, y1 - y0
    t = np.clip(((px - x0) * vx + (py - y0) * vy) / (vx * vx + vy * vy), 0, 1)
    return np.hypot(px - (x0 + t * vx), py - (y0 + t * vy)) <= half


def poly(pts):
    return inside(pts, SIZE, SIZE)


def rank(n):
    """Where a piece is drawn among the others (DEPTH_ORDER): a limb's pieces where the limb is."""
    base = n
    for suffix in ('_upper', '_lower', '_shin', '_foot', '_whole'):
        base = base.replace(suffix, '')
    if base not in DEPTH_ORDER:
        return 1000
    return DEPTH_ORDER.index(base) + (0.5 if n.endswith('_foot') or n.endswith('_lower') else 0)


def front_of(pmap, name):
    """The cells his picture covers with pieces drawn after `name` (DEPTH_ORDER)."""
    k = DEPTH_ORDER.index(name)
    return np.isin(pmap, DEPTH_ORDER[k + 1:])


def row_span(m):
    """Each row of a mask filled from its first cell to its last."""
    out = np.zeros(m.shape, bool)
    for y in range(m.shape[0]):
        r = np.nonzero(m[y])[0]
        if len(r):
            out[y, r.min():r.max() + 1] = True
    return out


# His joints at rest, where his limbs are in his picture at our scale (game picture pixels, each in the middle
# of its cell, so the game puts every piece on the cell it was cut about). His near arm hangs
# straighter and nearer the body than ours, his far arm is bent with the hand on the hilt at his hip, and his
# legs stand wider than ours, the far one straighter: the limb pieces are cut about these joints.
HIS_JOINTS = {
    **JOINTS,
    'shoulderN': (38.5, 36.5),
    'elbowN': (37.5, 46.5),
    'wristN': (37.5, 57.5),
    'handN': (37.5, 61.5),
    'shoulderF': (59.5, 35.5),
    'elbowF': (62.5, 45.5),
    'wristF': (67.5, 49.5),
    'handF': (70.5, 51.5),
    'hipN': (46.5, 60.5),
    'kneeN': (44.5, 75.5),
    'ankleN': (40.5, 92.5),
    'hipF': (55.5, 59.5),
    'kneeF': (56.5, 75.5),
    'ankleF': (57.5, 91.5),
}
# The coat's body from the collar to the bottom of the belt (game picture pixels): what the belt, the sash and
# the shoulder pieces hide of it is continued.
COAT_TO = 51
# Each sleeve's half width about his arm's line where it runs on under the glove to the wrist.
SLEEVE_HALF = {'N': 3.4, 'F': 2.6}
# Each trouser leg's half width about his leg's line, from the hip down into the boot, and the row it ends on.
TROUSER_HALF = {'N': 4.2, 'F': 3.9}
TROUSER_TO = {'N': 85, 'F': 85}
# The trousers' seat between his hips (worn without the coat's tails): from the belt to where his legs part.
SEAT_SHAPE = [(44, 49), (60, 49), (60, 60), (57, 64), (52, 65), (47, 64), (44, 60)]
# The first row of each boot's foot (the shaft above it turns with the shin).
BOOT_FOOT_FROM = {'N': 93, 'F': 92}
# How far across the scabbard, fists and hilt the coat's tails run on behind them.
TAIL_GAP = 4
# The front of the torso the under-layers (shirt and vest) cover, so any coat's opening shows them whole.
VEST_SHAPE = [(46, 26), (58, 26), (59, 34), (58, 52), (57, 56), (52, 57.5), (46, 56), (45, 52), (45, 34)]


def joint(name):
    return HIS_JOINTS[name]


def pieces(pic='high'):
    """His figure in picture `pic` at our scale cut into pieces, with what his picture hides of each continued
    from his own pixels: {name: (mask, colours)} in game picture pixels."""
    if ('pieces', pic) not in _CACHE:
        _CACHE[('pieces', pic)] = _pieces(pic)
    return {n: (m.copy(), c.copy()) for n, (m, c) in _CACHE[('pieces', pic)].items()}


def piece_map(pic='high'):
    """Which piece each pixel of his figure at our scale is (DEPTH_ORDER names, '' outside him)."""
    g, mask, part, GK = game(pic)
    pm = np.full(mask.shape, '', dtype='<U12')
    for y, x in zip(*np.nonzero(mask)):
        pm[y, x] = PIECE_OF.get(part[y, x], part[y, x])
    return pm


def _pieces(pic):
    g, mask, part, GK = game(pic)
    line = his_line()
    H, W = mask.shape
    rows = np.arange(H)[:, None]
    pm = piece_map(pic)
    isline = GK == 'line'
    out = {}
    for n in sorted(set(pm[mask].tolist())):
        out[n] = (pm == n, g.copy())

    def grow(n, hid, col):
        m, _ = out[n]
        out[n] = (m | hid, col)

    # What his shoulder pieces hide (his first picture): his plain shoulders under them are in his second
    # picture, the same coat in the same pose: the coat's body and sleeves take his pixels there.
    plain = None
    if pic == 'high':
        pg, pmask, _, _ = game('folded')
        plain = (pg, piece_map('folded'))

    # The coat's body: down each column under the belt or sash to COAT_TO, his cloth run on from above; under
    # his shoulder pieces, his plain shoulders.
    if 'coat' in out:
        m, c = out['coat']
        c = c.copy()
        if plain is not None:
            pg, ppm = plain
            under = ~m & (ppm == 'coat') & np.isin(pm, ('epaulet_n', 'epaulet_f'))
            c[under] = pg[under]
            m = m | under
        shape = row_span(m | np.isin(pm, ('belt', 'sash'))) & (rows <= COAT_TO)
        shape &= row_span(m)
        hid = shape & ~m & front_of(pm, 'coat')
        c = continue_along(c, m & ~isline, hid, (0, 1), 1)
        out['coat'] = (m | hid, c)

    # Each sleeve: under his shoulder piece his plain shoulder (his second picture), under the glove his cloth
    # and cuff run on along the arm to the wrist, its sides on his line.
    for s in ('N', 'F'):
        n = 'sleeve_' + s.lower()
        if n not in out:
            continue
        m, c = out[n]
        c = c.copy()
        if plain is not None:
            pg, ppm = plain
            under = ~m & (ppm == n) & np.isin(pm, ('epaulet_n', 'epaulet_f'))
            c[under] = pg[under]
            m = m | under
        sh, el, wr = joint('shoulder' + s), joint('elbow' + s), joint('wrist' + s)
        # (the whole upper arm too: his far upper arm is mostly behind his chest, and shows when the arm moves)
        upper = band(sh, el, SLEEVE_HALF[s] + 0.4) & ~m & front_of(pm, n)
        cu = continue_along(c, m & ~isline, upper, (el[0] - sh[0], el[1] - sh[1]), 1, edge4(band(sh, el, SLEEVE_HALF[s] + 0.4) | m) & upper, line)
        c[upper] = cu[upper]
        m = m | upper
        arm = band(el, wr, SLEEVE_HALF[s])
        hid = arm & ~m & np.isin(pm, ('glove_n', 'glove_f', 'hilt', 'scabbard'))
        edge = edge4(arm | m) & hid
        c = continue_along(c, m & ~isline, hid, (wr[0] - el[0], wr[1] - el[1]), 1, edge, line)
        out[n] = (m | hid, c)

    # The tails: where the scabbard, the fists, the hilt and the sash's end cross them, his cloth runs on behind
    # them down each column (a cell with his tails within TAIL_GAP on both sides of it in its row); up under the
    # belt or sash to the coat's body, so they meet it as the torso turns.
    if 'tails' in out:
        m, c = out['tails']
        cover = np.isin(pm, ('scabbard', 'scabbard_x', 'glove_n', 'hilt', 'glove_f', 'sash'))
        hid = np.zeros((H, W), bool)
        for y, x in zip(*np.nonzero(cover & ~m)):
            hid[y, x] = m[y, max(0, x - TAIL_GAP):x].any() and m[y, x + 1:x + 1 + TAIL_GAP].any()
        top = np.nonzero(m.any(axis=1))[0].min()
        belt = np.isin(pm, ('belt', 'sash')) & (rows < top + 1) & (rows >= top - 3) & row_span(m)[top][None, :]
        hid |= belt & ~m
        c = continue_along(c, m & ~isline, hid, (0, 1), 1)
        out['tails'] = (m | hid, c)

    # The under-layers (shirt and vest): over the front of the torso (VEST_SHAPE), his cloth run on down each
    # column under the coat and across what is left, so any coat's opening shows them whole.
    if 'vest' in out:
        m, c = out['vest']
        shape = poly(VEST_SHAPE)
        hid = shape & ~m & front_of(pm, 'vest')
        hid &= ~np.isin(pm, ('face', 'hair'))
        c = continue_along(c, m & ~isline, hid, (0, 1), 1)
        out['vest'] = (m | hid, c)

    # The trousers: each leg's band about his leg's line, his cloth continued up each column from his pixels
    # below (his creases run on up the leg), its sides on his line, down into the boot; the seat between the
    # hips under the tails.
    legs = np.zeros((H, W), bool)
    for s in ('N', 'F'):
        n = 'trousers_' + s.lower()
        if n not in out:
            continue
        m, c = out[n]
        hip, knee, ankle = joint('hip' + s), joint('knee' + s), joint('ankle' + s)
        leg = (band(hip, knee, TROUSER_HALF[s]) | band(knee, ankle, TROUSER_HALF[s])) & (rows <= TROUSER_TO[s]) & (rows >= 50)
        hid = leg & ~m & front_of(pm, n)
        edge = edge4(leg | m) & hid
        c = continue_along(c, m & ~isline, hid, (0, 1), 1, edge, line)
        out[n] = (m | hid, c)
        legs |= m | hid
    if 'trousers_n' in out and 'trousers_f' in out:
        shape = poly(SEAT_SHAPE)
        hid = shape & ~legs & front_of(pm, 'seat')
        edge = edge4(shape) & hid & ~near8(legs)
        cl = g.copy()
        for n in ('trousers_n', 'trousers_f'):
            lm, lc = out[n]
            cl[lm] = lc[lm]
        c = continue_along(cl, legs & ~isline, hid & ~edge, (0, 1), 1)
        c[hid & edge] = line
        out['seat'] = (hid, c)

    # The boots: the shaft and its cuff turn with the shin, the foot stands flat under it; the shaft runs on two
    # rows under the foot's top so the shin can turn without a gap at the ankle.
    for s in ('N', 'F'):
        n = 'boot_' + s.lower()
        if n not in out:
            continue
        m, c = out[n]
        span = row_span(m)
        hid = span & ~m & front_of(pm, n)
        c = continue_along(c, m & ~isline, hid, (1, 0), 1)
        m = m | hid
        top = BOOT_FOOT_FROM[s]
        shaft = m & (rows < top)
        run = np.zeros((H, W), bool)
        cc = c.copy()
        for x in np.nonzero(shaft[top - 1])[0]:
            for k in (0, 1):
                if m[top + k, x]:
                    run[top + k, x] = True
                    cc[top + k, x] = c[top - 2 + k, x]
        out[n + '_shin'] = (shaft | run, cc)
        out[n + '_foot'] = (m & (rows >= top), c)
        del out[n]

    # The scabbard runs on through his near fist along its line.
    if 'scabbard' in out:
        m, c = out['scabbard']
        (x0, y0), (x1, y1), half = SCABBARD
        S = BODY_SCALE
        a = ((x0 - BODY_AT[0]) / S, (y0 - BODY_AT[1]) / S)
        b = ((x1 - BODY_AT[0]) / S, (y1 - BODY_AT[1]) / S)
        hid = band(a, b, half / S) & ~m & np.isin(pm, ('glove_n',))
        edge = edge4(band(a, b, half / S) | m) & hid
        c = continue_along(c, m & ~isline, hid, (b[0] - a[0], b[1] - a[1]), 1, edge, line)
        out['scabbard'] = (m | hid, c)
    return out


def compose(pcs, names=None):
    """The pieces drawn back to front (DEPTH_ORDER), as (rgb, mask)."""
    out = np.zeros((SIZE, SIZE, 3), np.int32)
    mask = np.zeros((SIZE, SIZE), bool)
    for n in sorted(pcs, key=rank):
        if names is not None and n not in names:
            continue
        m, c = pcs[n]
        out[m] = c[m]
        mask |= m
    return out, mask


# ---------------------------------------------------------------------------------------------------
# Writing the pieces as TypeScript.
# ---------------------------------------------------------------------------------------------------
def split(mask, a, j, b):
    """A limb piece cut at its joint j (between the bones a-j and j-b): the cells before the cut (toward a)
    and after it. The cut runs across the limb through j, square to the line halfway between both bones."""
    H, W = mask.shape
    u1 = np.array([j[0] - a[0], j[1] - a[1]], float)
    u2 = np.array([b[0] - j[0], b[1] - j[1]], float)
    nrm = u1 / np.hypot(*u1) + u2 / np.hypot(*u2)
    ys, xs = np.mgrid[0:H, 0:W]
    d = (xs + 0.5 - j[0]) * nrm[0] + (ys + 0.5 - j[1]) * nrm[1]
    return mask & (d < 0), mask & (d >= 0)


def angle_of(a, b):
    return float(np.degrees(np.arctan2(b[1] - a[1], b[0] - a[0])))


def middle(names, pcs, want, q=0.5):
    """His colour of middle lightness among his own pixels of these kinds in these pieces (with `q`, that
    fraction of them darker): the base a colour slot recolours from. Continued cells count too (they are
    his colours)."""
    found = []
    for n in names:
        m, c = pcs[n]
        for y, x in zip(*np.nonzero(m)):
            if kind(c[y, x]) in want:
                found.append((float(luma(c[y, x])), hexc(c[y, x])))
    found.sort()
    return found[int(len(found) * q)][1]


def module(doc, consts, bases, prefix, kinds_of=None, extra=''):
    """A generated TypeScript module: the colours each slot recolours from (`bases`, name -> hex), what each
    of his colours is (`<PREFIX>_KIND`, hex -> kind), the pieces (`consts`: (CONST, mask, colours, doc, pivot
    in game picture pixels, angle)) and where each piece lands in our male idle frame 0 (`<PREFIX>_REST`:
    the fine pixel of its first row's first cell, unturned)."""
    out = [doc, "import type { PaintedPiece } from '../painted';", '']
    if bases:
        out.append('/** His colours the colour slots recolour from (at these, every pixel is his). */')
        for k, v in bases.items():
            out.append(f"export const {k} = '{v}';")
        out.append('')
    found = {}
    body = []
    rest = []
    for const, mask, col, pdoc, pivot, ang in consts:
        rows, origin, palette = pack(col, mask)
        for h in palette.values():
            rgb = [int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)]
            k = kinds_of(rgb, const) if kinds_of else kind(rgb)
            if found.get(h, k) != k:
                raise ValueError(f'{h} is {found[h]} in one piece and {k} in {const}')
            found[h] = k
        body.append(ts_piece(const, pdoc, rows, origin, palette, pivot, ang))
        rest.append((const, [origin[0] + OFFSET[0], origin[1] + OFFSET[1]]))
    names = sorted(set(found.values()))
    out.append("/** What each of his colours is, as the script sorts them (tools/refs/navy_ref.py kind). */")
    out.append(f"export const {prefix}_KIND: Record<string, {' | '.join(repr(n) for n in names)}> = {{")
    for h in sorted(found):
        out.append(f"  '{h}': '{found[h]}',")
    out += ['};', '']
    out.append("/** Where each piece lands in our male idle frame 0, unturned: the fine pixel of its first row's first cell. */")
    out.append(f'export const {prefix}_REST: Record<string, [number, number]> = {{')
    for const, (x, y) in rest:
        out.append(f'  {const}: [{x}, {y}],')
    out += ['};', '']
    if extra:
        out += [extra, '']
    out += body
    return '\n'.join(out)


def header(script, what, pic='high'):
    return (f"// {what}, the owner's pixels at our scale (tools/refs/{script} from\n"
            f"// {PICS[pic]}, reduced and cleaned by tools/refs/navy_ref.py).\n"
            "// Generated: rerun the script to change it.\n")


def study(path, names, pcs, k=8, pic='high'):
    """The pieces put together back to front beside his figure at our scale (the cleaned reduction), at k x."""
    g, m, _, _ = game(pic)
    c, cm = compose({n: pcs[n] for n in names})
    ys, xs = np.nonzero(cm)
    y0, y1, x0, x1 = max(0, ys.min() - 2), min(SIZE, ys.max() + 3), max(0, xs.min() - 2), min(SIZE, xs.max() + 3)
    a = rgba(g, m)[y0:y1, x0:x1]
    b = rgba(c, cm)[y0:y1, x0:x1]
    gap = np.zeros((y1 - y0, 2, 4), np.uint8)
    save(np.concatenate([a, gap, b], axis=1), path, k)


# ---------------------------------------------------------------------------------------------------
# His head: the face anchor (body.ts faceAnchor: the near eye's lash row) and his eyes on it.
# ---------------------------------------------------------------------------------------------------
# His near eye's lash row: our face anchor's row (23 in the game picture) raised HEAD_UP rows, so his head
# stands where his picture has it, his chin on his high collar (src/sprite/romanNeck.ts headUp). The anchor's
# column is ours (48).
HEAD_UP = 3
ANCHOR = (48, 23 - HEAD_UP)
# His eyes at our scale: the near eye's 5 columns from x 50 and the far eye's 3 from x 57 (ex 2 and fx 9 from
# the anchor: body.ts PAINTED_HEADS), the lash row and the row under it.
EYES = {'near': (50, ANCHOR[1], 5, 2), 'far': (57, ANCHOR[1], 3, 2)}


def eye_letter(c):
    """Our face template's letter for a pixel of his eye: L his lash line, w his white (and its pale grey
    shade), d / i his dark and bright red, s his skin (no pixel of the eye: the face's own skin shows)."""
    k = kind(c)
    L = luma(np.array(c, float))
    if k == 'line' or (k in ('dark', 'brown') and L < 30):
        return 'L'
    if k == 'white' or (k == 'grey' and L > 150):
        return 'w'
    if k in ('red', 'wine'):
        return 'i' if L > 40 else 'd'
    return 's'


def run_part(script, what, out_ts, study, consts, bases, prefix, kinds_of=None, extra='', names=None, pic='high'):
    """A part script's work: writes the module and (with a study folder) its pieces beside his figure."""
    write(out_ts, module(header(script, what, pic), consts, bases, prefix, kinds_of, extra))
    if study:
        os.makedirs(study, exist_ok=True)
        pcs = {c[0]: (c[1], c[2]) for c in consts}
        g, m, _, _ = game(pic)
        c, cm = np.zeros((SIZE, SIZE, 3), np.int32), np.zeros((SIZE, SIZE), bool)
        for n in (names or pcs):
            pm, pc = pcs[n]
            c[pm] = pc[pm]
            cm |= pm
        ys, xs = np.nonzero(cm)
        y0, y1, x0, x1 = max(0, ys.min() - 2), min(SIZE, ys.max() + 3), max(0, xs.min() - 2), min(SIZE, xs.max() + 3)
        a = rgba(g, m)[y0:y1, x0:x1]
        b = rgba(c, cm)[y0:y1, x0:x1]
        save(np.concatenate([a, np.zeros((y1 - y0, 2, 4), np.uint8), b], axis=1), os.path.join(study, script.replace('-from-ref.py', '') + '@8.png'))
    print(prefix, bases)


def joints_ts(name, names):
    """His joints at rest as TypeScript (fine pixels of our male idle frame 0)."""
    out = [f'/** His joints at rest, where his picture has them (fine pixels of our male idle frame 0). */',
           f'export const {name}: Record<string, [number, number]> = {{']
    for n in names:
        x, y = HIS_JOINTS[n]
        out.append(f'  {n}: [{x + OFFSET[0]:.2f}, {y + OFFSET[1]:.2f}],')
    out.append('};')
    return '\n'.join(out)


# ---------------------------------------------------------------------------------------------------
# His hair: over the head, and behind it with what his face hides filled in.
# ---------------------------------------------------------------------------------------------------
def lift_hair(pic):
    """His hair in picture `pic` at our scale: {'front': every pixel of his hair over the head, his line
    included; 'back': the same with what his face hides filled in (his locks run on down behind the forehead
    to the lash row between his outermost hair cells on each row, or the last row's below his fringe, each
    hidden cell taking his nearest hair above it), drawn behind the head, showing only where a head is narrower than his}."""
    g, m, part, GK = game(pic)
    hair = part == 'hair'
    col = g.copy()
    hidden = np.zeros(hair.shape, bool)
    span = None
    for y in range(ANCHOR[1] + 1):
        r = np.nonzero(hair[y])[0]
        if len(r):
            span = (r.min(), r.max())
        # (on the rows between his fringe and the lash row, the last row of hair's width)
        if span:
            hidden[y, span[0]:span[1] + 1] = True
    hidden &= ~hair & m
    back = continue_along(col, hair & (GK != 'line'), hidden, (0, 1), 1)
    return {'front': (hair, col), 'back': (hair | hidden, back)}


def hair_module(script, pic, out_ts, prefix, what, study_dir=None):
    """Writes a hair option's module: <PREFIX>_BACK, <PREFIX>_FRONT pivoted on the face anchor, <PREFIX>_BASE
    (his middle hair colour, which the hair colour moves) and <PREFIX>_KIND (his line, or hair)."""
    P = lift_hair(pic)
    bases = {prefix + '_BASE': middle(['front'], P, ('brown', 'dark', 'grey', 'white'))}
    consts = [
        (prefix + '_BACK', *P['back'], 'His hair with what his face hides filled in, drawn behind the head. Its pivot is the cell on the face anchor.', ANCHOR, 0),
        (prefix + '_FRONT', *P['front'], 'His hair over the head, his line included. Its pivot is the cell on the face anchor.', ANCHOR, 0),
    ]
    write(out_ts, module(header(script, what, pic), consts, bases, prefix, lambda rgb, c: 'line' if kind(rgb) == 'line' else 'hair'))
    if study_dir:
        os.makedirs(study_dir, exist_ok=True)
        study(os.path.join(study_dir, script.replace('-from-ref.py', '') + '@8.png'), ['back', 'front'], P, pic=pic)
    print(bases)


# ---------------------------------------------------------------------------------------------------
# The body's parts as modules: the colour slots each recolours (his colours at their bases are his).
# ---------------------------------------------------------------------------------------------------
def kinds_by(table):
    """A module's kinds_of: his line stays his line, his skin the character's skin, every other kind of his
    colour as `table` names it ('cloth' when it does not)."""
    def of(rgb, const):
        k = kind(rgb)
        if k in ('line', 'skin'):
            return k
        return table.get(k, 'cloth')
    return of


def base_of(pcs, names, want):
    """His middle colour of these kinds in these pieces, or None when they have none."""
    try:
        return middle(names, pcs, want)
    except IndexError:
        return None


TORSO_ANGLE = angle_of(JOINTS['pelvis'], JOINTS['neck'])


def torso_piece(const, pcs, name, doc, pivot='neck'):
    m, c = pcs[name]
    return (const, m, c, doc, JOINTS[pivot], TORSO_ANGLE)


def limb_pieces(prefix, pcs, name, s, docs):
    """A sleeve or a trouser leg cut at its middle joint: (upper, lower) consts, each pivoted on its joint at
    his angle there."""
    m, c = pcs[name]
    a, j, b = (('shoulder', 'elbow', 'wrist') if name.startswith('sleeve') else ('hip', 'knee', 'ankle'))
    A, J, B = joint(a + s), joint(j + s), joint(b + s)
    up, lo = split(m, A, J, B)
    return [(prefix + '_UPPER', up, c, docs[0], A, angle_of(A, J)), (prefix + '_LOWER', lo, c, docs[1], J, angle_of(J, B))]


def _run_on(m, c, start, u, extra, line):
    """The piece (m, c) run on past `start` along `u` by `extra` cells: his cloth continued along the limb across
    the piece's width there, his line on its sides."""
    if extra <= 0.5:
        return m, c
    H, W = m.shape
    ys, xs = np.mgrid[0:H, 0:W]
    px, py = xs + 0.5, ys + 0.5
    # the piece's half width where it is cut: its cells within a cell of the cut, across the limb
    along = (px - start[0]) * u[0] + (py - start[1]) * u[1]
    across = (px - start[0]) * -u[1] + (py - start[1]) * u[0]
    near = m & (np.abs(along) <= 1.2)
    if not near.any():
        return m, c
    lo, hi = across[near].min(), across[near].max()
    run = (along > 0) & (along <= extra + 0.5) & (across >= lo - 0.01) & (across <= hi + 0.01) & ~m
    edge = run & ((across <= lo + 0.99) | (across >= hi - 0.99))
    plain = m & np.isin(np.array([[kind(c[y, x]) for x in range(W)] for y in range(H)]), ('dark', 'grey', 'brown', 'wine', 'green'))
    c = continue_along(c, plain, run, (u[0], u[1]), 1, edge, line)
    return m | run, c


def sleeve_pieces(prefix, pcs, name, s, docs):
    """A sleeve cut at his elbow (as limb_pieces), each half run on to OUR arm's length: his sleeves rest on our
    arms (the owner on the five outfits, 2026-10-24: "ponlo en nuestra pose"). The upper arm, pivoted on his
    shoulder, runs on past his elbow to as far as our elbow is from it; the forearm, pivoted on his elbow, runs
    on back up past it as far as our forearm is longer than his (his far arm was bent toward us, foreshortened),
    his cuff kept at the wrist. His cloth is continued along the arm there, his line on its sides."""
    m, c = pcs[name]
    A, J, B = joint('shoulder' + s), joint('elbow' + s), joint('wrist' + s)
    up, lo = split(m, A, J, B)
    line = his_line()
    u = np.array([J[0] - A[0], J[1] - A[1]]); Lh = float(np.hypot(*u)); u = u / Lh
    ours = float(np.hypot(JOINTS['elbow' + s][0] - A[0], JOINTS['elbow' + s][1] - A[1]))
    um, uc = _run_on(up, c, J, u, ours - Lh, line)
    v = np.array([B[0] - J[0], B[1] - J[1]]); Lv = float(np.hypot(*v)); v = v / Lv
    ours2 = float(np.hypot(JOINTS['wrist' + s][0] - JOINTS['elbow' + s][0], JOINTS['wrist' + s][1] - JOINTS['elbow' + s][1]))
    lm, lc = _run_on(lo, c, J, -v, ours2 - Lv, line)
    return [(prefix + '_UPPER', um, uc, docs[0], A, angle_of(A, J)), (prefix + '_LOWER', lm, lc, docs[1], J, angle_of(J, B))]


COAT_KINDS = {'gold': 'gold', 'white': 'gold', 'wine': 'lining', 'red': 'accent', 'cream': 'gold'}


def coat_module(script, pic, out_ts, prefix, what, study_dir=None):
    """A coat's module: its body (the collar or lapels, the chest and its gold, down under the belt), each sleeve
    in two (upper arm and forearm with the cuff), its tails (in front of the legs) and the back panel's lining
    (behind them). Slots: the cloth, the gold, the lining and his red accents."""
    pcs = pieces(pic)
    names = ['coat', 'sleeve_n', 'sleeve_f', 'tails'] + (['tails_back'] if 'tails_back' in pcs else [])
    bases = {}
    flames = pic == 'dark'
    for key, want in (('CLOTH', ('dark', 'grey', 'brown', 'green')), ('GOLD', ('gold',)), ('LINING', ('wine',) if flames else ('wine', 'red')), ('ACCENT', ('red',) if flames else ())):
        if not want:
            continue
        b = base_of(pcs, names, want)
        if b:
            bases[f'{prefix}_{key}'] = b
    consts = [torso_piece(prefix + '_BODY', pcs, 'coat', "The coat's body: the collar, the chest and its gold, down under the belt. Its pivot is the cell on the neck joint, at the torso's angle.")]
    for s in ('N', 'F'):
        side = 'near' if s == 'N' else 'far'
        consts += sleeve_pieces(f'{prefix}_SLEEVE_{s}', pcs, 'sleeve_' + s.lower(), s,
                              (f'The {side} sleeve from the shoulder to the elbow, pivoted on his {side} shoulder at his angle.',
                               f'The {side} forearm and its cuff, pivoted on his {side} elbow at his angle.'))
    consts.append(torso_piece(prefix + '_TAILS', pcs, 'tails', "The coat's tails below the belt, in front of the legs. Its pivot is the cell on the pelvis joint, at the torso's angle.", 'pelvis'))
    if 'tails_back' in pcs:
        consts.append(torso_piece(prefix + '_TAILS_BACK', pcs, 'tails_back', "The tails' back panel, its lining behind the legs. Its pivot is the cell on the pelvis joint.", 'pelvis'))
    table = dict(COAT_KINDS, red='accent' if pic == 'dark' else 'lining')
    run_part(script, what, out_ts, study_dir, consts, bases, prefix, kinds_by(table), joints_ts(prefix + '_JOINTS', ['shoulderN', 'elbowN', 'wristN', 'handN', 'shoulderF', 'elbowF', 'wristF', 'handF']), pic=pic)


# What each picture's under-layer is made of: the shirt (or cravat) and the vest.
VEST_KINDS = {
    'open': {'cream': 'shirt', 'white': 'shirt', 'gold': 'gold', 'wine': 'vest', 'red': 'vest', 'brown': 'shirt'},
    'buttoned': {'cream': 'shirt', 'white': 'shirt', 'brown': 'shirt', 'gold': 'gold', 'green': 'vest'},
    'dark': {'dark': 'shirt', 'grey': 'shirt', 'gold': 'gold', 'wine': 'vest', 'red': 'vest', 'brown': 'vest'},
}


def vest_module(script, pic, out_ts, prefix, what, study_dir=None):
    """An under-layer's module: the shirt (or cravat) and the vest over the front of the torso, continued under
    the coat so any coat's opening shows them whole. Slots: the shirt, the vest and its gold."""
    pcs = pieces(pic)
    table = VEST_KINDS[pic]
    of = kinds_by(table)
    bases = {}
    for key, k in (('SHIRT', 'shirt'), ('VEST', 'vest'), ('GOLD', 'gold')):
        want = [kk for kk, v in table.items() if v == k]
        b = base_of(pcs, ['vest'], want) if want else None
        if b:
            bases[f'{prefix}_{key}'] = b
    consts = [torso_piece(prefix, pcs, 'vest', 'The shirt and the vest over the front of the torso, continued under the coat. Its pivot is the cell on the neck joint, at the torso\'s angle.')]
    run_part(script, what, out_ts, study_dir, consts, bases, prefix, of, pic=pic)


def simple_module(script, pic, out_ts, prefix, what, items, slots, table, study_dir=None, extra=''):
    """A module of whole pieces (no cut): `items` is [(CONST suffix, piece name, doc, pivot (x, y) or joint name,
    angle)], `slots` [(base suffix, kinds)], `table` how his kinds map to the item's slots."""
    pcs = pieces(pic)
    names = [n for _, n, _, _, _ in items]
    bases = {}
    for key, want in slots:
        b = base_of(pcs, names, want)
        if b:
            bases[f'{prefix}_{key}'] = b
    consts = []
    for suffix, n, doc, pivot, ang in items:
        m, c = pcs[n]
        P = joint(pivot) if isinstance(pivot, str) else pivot
        consts.append((f'{prefix}_{suffix}' if suffix else prefix, m, c, doc, P, ang))
    run_part(script, what, out_ts, study_dir, consts, bases, prefix, kinds_by(table), extra, pic=pic)


def leg_consts(prefix, pcs, docs_side):
    """Each trouser leg cut at his knee (thigh pivoted on his hip, shin on his knee) and the seat."""
    consts = []
    for s in ('N', 'F'):
        side = docs_side[s]
        consts += limb_pieces(f'{prefix}_{s}', pcs, 'trousers_' + s.lower(), s,
                              (f'The {side} thigh, pivoted on his {side} hip at his angle.', f'The {side} shin down into the boot, pivoted on his {side} knee at his angle.'))
    consts.append(torso_piece(prefix + '_SEAT', pcs, 'seat', "The seat between his hips, up to the belt (under the coat's tails at rest). Its pivot is the cell on the pelvis joint.", 'pelvis'))
    return consts


# ---------------------------------------------------------------------------------------------------
# The sabre and its scabbard.
# ---------------------------------------------------------------------------------------------------
# The sabre's line at our scale: from the top of his grip in the far fist down through the guard's middle (the
# way the blade points from the hilt).
SABRE_AXIS = ((69.0, 53.0), (65.0, 58.0))
# He drew no blade: his sabre's blade is behind his body. The blade the game shows when the sabre is drawn is
# made of his own pixels: as long as his scabbard (BLADE_LENGTH), straight, two pixels wide, his pale grey
# (the light of his eyes' white) along the edge, his eyes' white along the back, his black line round it, its
# point closed by his line. At rest it stays behind his body, as in his picture.
BLADE_LENGTH = 30.0
BLADE_LIGHT = (234, 229, 239)
BLADE_STEEL = (192, 181, 195)


def sabre_pieces():
    """The hilt (his pixels at our scale) and the blade made of his colours, in game picture pixels."""
    pcs = pieces('high')
    hm, hc = pcs['hilt']
    (x0, y0), (x1, y1) = SABRE_AXIS
    ux, uy = (x1 - x0), (y1 - y0)
    n = float(np.hypot(ux, uy))
    ux, uy = ux / n, uy / n
    start = (x1, y1)
    tip = (x1 + ux * BLADE_LENGTH, y1 + uy * BLADE_LENGTH)
    core = band(start, tip, 1.05)
    outer = band(start, (tip[0] + ux, tip[1] + uy), 1.9)
    ys, xs = np.mgrid[0:SIZE, 0:SIZE]
    side = (xs + 0.5 - start[0]) * (-uy) + (ys + 0.5 - start[1]) * ux
    col = np.zeros((SIZE, SIZE, 3), np.int32)
    col[core & (side >= 0)] = BLADE_STEEL
    col[core & (side < 0)] = BLADE_LIGHT
    rim = outer & ~core
    col[rim] = his_line()
    blade = (core | rim) & ~hm
    return {'hilt': (hm, hc), 'blade': (blade, col)}


# ---------------------------------------------------------------------------------------------------
# His officers at rest as the game puts them together: each picture's own chest (its coat with its sleeves and
# tails, its under-layer, its sash, the dark coat's hair) on his first picture's head, gloves, belt, boots,
# sabre and scabbard, and the trousers in the paint that picture wears.
# ---------------------------------------------------------------------------------------------------
OWN = {
    'high': ('coat', 'sleeve_n', 'sleeve_f', 'tails', 'tails_back'),
    'folded': ('coat', 'sleeve_n', 'sleeve_f', 'tails', 'tails_back'),
    'open': ('coat', 'sleeve_n', 'sleeve_f', 'tails', 'tails_back', 'vest'),
    'buttoned': ('coat', 'sleeve_n', 'sleeve_f', 'tails', 'tails_back', 'vest'),
    'dark': ('coat', 'sleeve_n', 'sleeve_f', 'tails', 'tails_back', 'vest', 'sash', 'hair'),
}
TROUSERS_FROM = {'high': 'high', 'folded': 'high', 'open': 'open', 'buttoned': 'open', 'dark': 'open'}
LEGS = ('trousers_n', 'trousers_f', 'seat')


def outfit(pic):
    """The pieces of the officer in picture `pic` as the game wears them: {name: (mask, colours)}."""
    out = {}
    first = pieces('high')
    legs = pieces(TROUSERS_FROM[pic])
    own = pieces(pic)
    for n, v in first.items():
        if n in ('epaulet_n', 'epaulet_f') and pic != 'high':
            continue
        if n == 'belt' and pic in ('buttoned', 'dark'):
            continue
        out[n] = v
    for n in LEGS:
        if n in legs:
            out[n] = legs[n]
    for n in OWN[pic]:
        if n in own:
            out[n] = own[n]
        elif n in out:
            del out[n]
    return out


def dressed(pic):
    """The officer in picture `pic` at rest as the game draws him: (rgb, mask, piece of each pixel)."""
    pcs = outfit(pic)
    # his head as the game draws it: his face with our skull continued under his first picture's hair, and the
    # hair worn (its back behind the face, its front over it)
    hm, hc, _ = head_piece()
    hair = lift_hair('dark' if 'hair' in OWN[pic] else 'high')
    # (his eyes drawn on it by the eye option: his own pixels; above the lash row the head is trimmed to the
    # hair's back, as the hair options do: hair.ts trimSkull)
    g0, m0, _, _ = game('high')
    for name, (x0, y0, w, h) in EYES.items():
        for y in range(y0, y0 + h):
            for x in range(x0, x0 + w):
                if hm[y, x] and eye_letter(g0[y, x]) != 's':
                    hc[y, x] = g0[y, x]
    hm = hm & ~((np.arange(SIZE)[:, None] < ANCHOR[1]) & ~hair['back'][0])
    pcs['face'] = (hm, hc)
    pcs['hair_back'] = hair['back']
    pcs['hair'] = hair['front']
    rgb = np.zeros((SIZE, SIZE, 3), np.int32)
    mask = np.zeros((SIZE, SIZE), bool)
    which = np.full((SIZE, SIZE), '', dtype='<U14')
    for n in sorted(pcs, key=rank):
        m, c = pcs[n]
        rgb[m] = c[m]
        mask |= m
        which[m] = n
    return rgb, mask, which


# Our male skull's outline (rows of the game picture from x 40, raised with his head): o the line, s the skull.
SKULL_X, SKULL_Y = 40, 11 - HEAD_UP
SKULL = [
    '......oooooooo........',
    '....oossssssssoo......',
    '...osssssssssssso.....',
    '..osssssssssssssso....',
    '..osssssssssssssso....',
    '.osssssssssssssssso...',
    '.osssssssssssssssso...',
    '.osssssssssssssssso...',
    '.osssssssssssssssso...',
    '.ossssssssssssssssso..',
    '.ossssssssssssssssso..',
    '.ossssssssssssssssso..',
]


def skin_base(g, mask):
    """His base skin: the commonest skin colour of his face."""
    seen = {}
    for y, x in zip(*np.nonzero(mask)):
        if kind(g[y, x]) == 'skin':
            h = hexc(g[y, x])
            seen[h] = seen.get(h, 0) + 1
    return max(sorted(seen), key=lambda h: seen[h])


def head_piece():
    """His head (the 'navy' face shape) at our scale: (mask, colours, base skin). His face, ear, jaw, brows and
    mouth as the reduction gives them; his eyes taken out (his skin carried over them from the row above: the eye
    options draw them); under his hair, our skull continued in his skin inside our male skull's outline, with his
    black line round it, only where his hair covers it at rest."""
    g, m, part, GK = game('high')
    face, col = pieces('high')['face']
    base = skin_base(g, face)
    bc = np.array([int(base[k:k + 2], 16) for k in (1, 3, 5)])
    for name, (x0, y0, w, h) in EYES.items():
        for y in range(y0, y0 + h):
            for x in range(x0, x0 + w):
                if face[y, x] and eye_letter(g[y, x]) != 's':
                    col[y, x] = col[y - 1, x] if kind(col[y - 1, x]) == 'skin' else bc
    hair = part == 'hair'
    for j, row in enumerate(SKULL):
        for i, ch in enumerate(row):
            y, x = SKULL_Y + j, SKULL_X + i
            if ch == '.' or face[y, x] or not hair[y, x]:
                continue
            face[y, x] = True
            col[y, x] = his_line() if ch == 'o' else bc
    return face, col, base
