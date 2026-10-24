"""Shared helpers for lifting parts out of the owner's noble swordsman (docs/reference/noble-swordsman-owner-reference.jpg).

His picture (2000x2000, on white) is a new male character drawn by him in his own pixel art: a 200 x 200
grid of his pixels, 10 picture pixels each, from the picture's corner (the block edges of his line fall
every 10 picture pixels, phase 0). His figure stands about 190 of his pixels tall, twice our sprite's.
The owner's answer on the new sets drawn bigger than our sprite (2026-10-24, "Reducir y limpiar yo"):

  * the body is shrunk evenly at the scale that fits our male rig: BODY_SCALE (2) of his pixels to one
    fine pixel. At that scale his wrists, shoulders and soles fall on our male idle frame 0's (his wrists
    35 fine px apart, ours 34.9; his neck to his near sole 71.5 fine px, ours 70.4), so every 2 x 2 block
    of his is one fine pixel, at BODY_AT;
  * the head (hair, headband, face, eyes) is shrunk evenly at HEAD_SCALE, the scale that makes it our
    Roman head's size (the male standard: the hair's top to the chin about 24 fine px), pinned at his
    chin (HEAD_PIN) under the Roman head's chin;
  * then what the shrinking left blurry or muddy is cleaned with his palette only (clean()): every fine
    pixel is one of HIS pixels from the block it shrinks (never a colour of ours, never a new motif),
    chosen for the cleanest reading: his 1 px black line round the figure, his thin gold piping, the
    cravat, chains and cuffs, the sword's red jewel and his red eyes before the cloth they cross.

game() is that cleaned reduction: his figure at our scale, a pixel of it at (x, y) on our male idle frame
0's pixel (x + OFFSET[0], y + OFFSET[1]) (the same offset as tools/refs/ren_ref.py, so JOINTS are our
rig's in that frame). The part scripts cut it into pieces as ren_ref cuts his Ren; the idle tests check
the game against it pixel for pixel. reduced(clean=False) is the same reduction before the cleaning (the
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

REF = 'docs/reference/noble-swordsman-owner-reference.jpg'
PITCH = 10
CELLS = 200
# Our frame: a pixel of the game picture at (x, y) is our male idle frame 0's (x + OFFSET[0], y + OFFSET[1]).
OFFSET = (75, 120)
SIZE = 100
# Body: his pixel (X, Y) lands on the game picture's ((X - BODY_AT[0]) / BODY_SCALE, (Y - BODY_AT[1]) / BODY_SCALE).
BODY_SCALE = 2.0
BODY_AT = (4.0, -2.0)
# Head: his pixel (X, Y) lands on HEAD_TO + ((X, Y) - HEAD_PIN) / HEAD_SCALE.
HEAD_SCALE = 1.7
HEAD_PIN = (109.0, 48.0)
HEAD_TO = (51.5, 26.0)
# Our male rig at idle frame 0, in the game picture's pixels (as tools/refs/ren_ref.py).
JOINTS = {
    'head': (51.0, 18.0),
    'neck': (52.18, 27.65),
    'shoulderN': (39.01, 32.51),
    'shoulderF': (59.27, 31.81),
    'elbowN': (35.13, 44.50),
    'elbowF': (62.09, 44.08),
    'wristN': (32.62, 55.21),
    'wristF': (67.52, 53.65),
    'handN': (31.80, 58.72),
    'handF': (69.30, 56.78),
    'pelvis': (52.0, 56.87),
    'hipN': (46.58, 56.46),
    'hipF': (56.51, 53.12),
    'kneeN': (47.17, 72.65),
    'kneeF': (63.23, 67.86),
    'ankleN': (43.42, 87.59),
    'ankleF': (60.94, 83.08),
}
# His black line: darker than this (luma). His darkest cloth and hair are lighter (about 16 and up).
LINE_LUMA = 10
# Colours of his within this (largest channel difference) are one colour of his palette: the JPEG's noise.
SNAP = 7
_CACHE = {}

# The head in his picture (polygon in his pixel corners): his hair, headband with its tails, face and eyes,
# above the collar. Everything else is the body.
HEAD_REGION = [
    (93, 5), (118, 5), (128, 12), (132, 20), (130, 30), (127, 37), (121, 38), (118, 40), (117, 46), (111, 48),
    (101, 48), (97, 46), (96, 40), (92, 38), (83, 38), (81, 40), (81, 47), (72, 47), (70, 40), (76, 33), (80, 28),
    (84, 20), (88, 12),
]


def luma(a):
    return 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]


def native(path=REF):
    """His pixels: the median of each block's interior, as a (200, 200, 3) int array."""
    if ('native', path) in _CACHE:
        return _CACHE[('native', path)].copy()
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    out = np.zeros((CELLS, CELLS, 3))
    for j in range(CELLS):
        for i in range(CELLS):
            c = a[j * PITCH + 2:(j + 1) * PITCH - 2, i * PITCH + 2:(i + 1) * PITCH - 2].reshape(-1, 3)
            out[j, i] = np.median(c, axis=0)
    _CACHE[('native', path)] = np.clip(np.round(out), 0, 255).astype(np.int32)
    return _CACHE[('native', path)].copy()


def background(a):
    """The white round him, reached from the picture's edge, and the pale grey of the shadow he drew
    under him and the soft greys his edges fade into there (light greys reached from that white)."""
    H, W, _ = a.shape
    L = luma(a)
    grey = (L > 150) & (a.max(axis=2) - a.min(axis=2) < 30)
    bg = np.zeros((H, W), bool)
    stack = [(y, x) for y in (0, H - 1) for x in range(W)] + [(y, x) for x in (0, W - 1) for y in range(H)]
    # and the white he left inside his figure (between the blade and the far leg under the cape's hem): pure
    # white patches of GAP_LEAST pixels or more; his glints are smaller or tinted
    pure = (a.min(axis=2) >= 250) & ~bg
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
    """What a colour of his is: 'line' (his black), 'gold', 'skin', 'red' (the cape's lining, the collar,
    his eyes, the jewel), 'purple' (the cuffs), 'white' (the cravat, glints), 'blue' (the blade), 'brown'
    (the headband, the belt) or 'dark' (his black cloth and hair, greys and blue-greys)."""
    r, g, b = (int(v) for v in c)
    L = 0.299 * r + 0.587 * g + 0.114 * b
    mx, mn = max(r, g, b), min(r, g, b)
    if L < LINE_LUMA:
        return 'line'
    if r > b + 8 and r > 2.5 * g and L < 60:
        # the darkest wine of his red lining
        return 'red'
    if L > 215 and (b > r + 15 or g > r + 15):
        # the blade's light core
        return 'core'
    if L > 200 and (b > r + 15 or g > r + 15):
        return 'blue'
    if L > 200 and mx - mn < 40 and r - b < 25:
        return 'white'
    if b > r + 40 and g > r + 20 and b > 120:
        return 'blue'
    if r > 120 and g > 0.5 * r and b < 0.45 * r:
        return 'gold'
    if r > b + 25 and r > g + 25:
        if g > 0.55 * r and r > 120:
            return 'skin'
        if g < 0.35 * r:
            return 'red'
        return 'brown'
    if b > r + 15 and r > g + 12 and b > 60:
        return 'purple'
    if L > 120 and r > g > b and r - b >= 25:
        return 'skin'
    if L > 120 and mx - mn < 50:
        return 'white'
    return 'dark'


def kinds(a):
    H, W, _ = a.shape
    return np.array([[kind(a[y, x]) for x in range(W)] for y in range(H)])


def snapped(a, bg):
    """His pixels with the JPEG's noise taken off: colours within SNAP of one another (and of one kind)
    are his one colour, the commonest of them (so every colour is one he painted). His line is his one
    commonest line colour."""
    K = kinds(a)
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
    return out, np.array(line), K


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


# What the cleaning brings back, in this order, where the even reduction lost it: the sword's red jewel
# and his red eyes, the cravat's and the glints' white, the gold piping, the cuffs' purple, then his black
# line where it is thin (a run of at most THIN of his pixels across or down: a line between two parts, not
# the dark of his cloth and hair). A kind brought back never takes a pixel an earlier one brought back, nor
# his outline, nor makes a 2 x 2 square of itself (his thin lines stay 1 px).
THIN = 2
KEEP_ORDER = ('red', 'white', 'core', 'purple', 'line')


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


# His accent kinds, in the order they win a block of which they fill half (reduce_region).
ACCENTS = ('red', 'white', 'core', 'purple', 'blue')
# The shortest of his thin details of each kind brought back (his pixels): his black line only where it runs
# on as a line between parts (shorter specks are the shading of his cloth and hair).
MIN_RUN = {'red': 1, 'white': 1, 'core': 3, 'gold': 3, 'purple': 2, 'line': 8}


def reduce_region(a, K, own, region, clean=True, line=None, accent=None):
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
    for x0, y0, rows in MOTIF_MAPS.get(region, []):
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                fx, fy = x0 + i, y0 + j
                if ch == '.' or not mask[fy, fx]:
                    continue
                p = motif_pick(a, K, own, region, fx, fy, ch, line)
                if p is not None:
                    col[fy, fx] = a[p[1], p[0]]
                    src[fy, fx] = p
    for (fx, fy), (X, Y) in MOTIFS.get(region, {}).items():
        if mask[fy, fx]:
            col[fy, fx] = a[Y, X]
            src[fy, fx] = (X, Y)
    return mask, col, src


def despeckle(a, mask, col, src):
    """His big areas clean (the cape's lining and black outside, his black cloth): a pixel of them whose colour
    none of its 8 neighbours has, all 4 of them his cloth too, takes the colour most of its neighbours have (his
    pixel of it there); and a light speck of a cloth colour of his standing out from all round it goes too. His
    fold lines stay: each pixel of a line has its colour beside it along the line. Gold, white, purple and
    blue (his piping, the cravat, the cuffs, the blade) are left as they are."""
    H, W = mask.shape
    cloth = ('dark', 'red', 'brown')
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
    middle, G his brightest gold, w his brightest white, W his greyest white (a fold), r his red or brown (a
    jewel's or a buckle's middle), p his purple, d his commonest cloth (not gold, not line), # his line. If the
    block has none of it, the nearest block round it that has."""
    want = {'g': ('gold',), 'G': ('gold',), 'w': ('white',), 'W': ('white',), 'r': ('red', 'brown'), 'p': ('purple',),
            'd': ('dark', 'red', 'purple', 'brown', 'blue', 'skin'), '#': ('line',)}[ch]
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
                if ch == 'G' or ch == 'w':
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
MOTIF_MAPS = {
    'body': [
        # the two gold studs at the collar's foot, his white glint on each, and the two gold chains across the
        # chest between them (each one gold line), the cravat's lower tail between the chains
        (43, 30, [
            '.Ggg#........#gGg.',
            '#gggggg#....#gggg.',
            '.####gggggggggg###',
            '.....#g##www#g#...',
            '......#gggggg#....',
        ]),
        # the round gold buckle: a ring of his gold, his light gold at its top left, his dark red middle
        (52, 45, [
            '#Gg#',
            'Grrg',
            'grrg',
            '#gg#',
        ]),
    ],
    'head': [
        # the headband's tail hangs from its knot behind the head as he drew it: his red runs on from the knot
        # into the tail (the shrinking had left a row of his line between them) and the tail is two of his
        # pixels wide where it leaves the knot
        (35, 13, [
            '...r',
            '...r',
            '...r',
            'r...',
        ]),
    ],
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
    'body': {
        # the sabre's red jewel: 2 x 2 of his red with his white highlight at its top left (as he drew it), in
        # his gold ring
        (33, 62): (71, 122), (34, 62): (72, 122), (33, 63): (70, 123), (34, 63): (72, 124),
        (32, 62): (68, 122), (32, 63): (68, 123), (35, 62): (74, 122), (35, 63): (74, 123),
        (33, 61): (70, 120), (34, 61): (72, 120), (33, 64): (70, 126), (34, 64): (72, 126),
    },
}
# A block with at least this many of his gold pixels is a gold area of his (a stud, the buckle, the guard),
# kept whole; fewer, his piping, drawn 1 px.
GOLD_SOLID = 3


def piping(a, K, own, region, mask, col, src):
    """His gold piping as continuous 1 px lines of his gold: every fine pixel whose block holds his gold is on
    his piping's course; that course is thinned to 1 px (thin()), his solid gold kept whole, and each pixel of
    it shows his gold nearest its block's middle. A pixel of the course left out shows his commonest other
    colour of its block. Every colour is his."""
    H, W = mask.shape
    course = np.zeros((H, W), bool)
    solid = np.zeros((H, W), bool)
    blocks = {}
    for fy in range(H):
        for fx in range(W):
            if not mask[fy, fx]:
                continue
            cells, (mx, my) = footprint(fx, fy, region)
            mine = [(X, Y) for X, Y in cells if 0 <= X < CELLS and 0 <= Y < CELLS and own[Y, X]]
            gold = [p for p in mine if K[p[1], p[0]] == 'gold']
            if gold:
                course[fy, fx] = True
                solid[fy, fx] = len(gold) >= GOLD_SOLID
                blocks[(fx, fy)] = (mine, gold, (mx, my))
    keep = thin(course) | solid
    for (fx, fy), (mine, gold, (mx, my)) in blocks.items():
        if keep[fy, fx]:
            pick = min(gold, key=lambda p: ((p[0] - mx) ** 2 + (p[1] - my) ** 2, p[1], p[0]))
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


def regions(a, bg):
    """His figure split into the head and the body: {name: mask of his pixels}."""
    head = inside(HEAD_REGION, CELLS, CELLS) & ~bg
    return {'head': head, 'body': ~bg & ~head}


def outline(mask, col, line):
    """His 1 px black line round the figure: every pixel of it beside the white round him is his line."""
    p = np.pad(mask, 1)
    edge = mask & ~(p[:-2, 1:-1] & p[2:, 1:-1] & p[1:-1, :-2] & p[1:-1, 2:])
    out = col.copy()
    out[edge] = line
    return out




# His head's parts: the headband (his brown cloth, its knot and tails), his face (his skin, eyes, mouth and
# the line round them, inside FACE_BOX) and his hair (everything else on his head).
FACE_BOX = [(92, 27), (100, 27), (104, 30), (119, 29), (121, 27), (124, 30), (123, 40), (119, 47), (110, 50), (101, 48), (95, 43), (92, 36)]


def head_labels(a, K, R):
    """His head split into 'headband', 'face' and 'hair' (his pixels)."""
    H, W = K.shape
    lab = np.full((H, W), '', dtype='<U10')
    head = R['head']
    face = inside(FACE_BOX, H, W)
    line = K == 'line'
    lab[head & ~face & (K == 'brown')] = 'headband'
    # (the tails' and the knot's dark red shading is the band's too: there is no other red on his head but
    # his eyes)
    lab[head & ~face & (K == 'red')] = 'headband'
    # (in his face his browns are the shading of his skin and eyes)
    lab[head & face & np.isin(K, ('brown', 'gold'))] = 'face'
    lab[head & face & np.isin(K, ('skin', 'red', 'white'))] = 'face'
    lab[head & (lab == '') & ~line] = 'hair'
    # his line: inside the face's box beside his skin, the face's; beside his band only, the band's;
    # else the hair's
    for y, x in zip(*np.nonzero(head & line)):
        near = [lab[q, w] for q in range(max(0, y - 1), min(H, y + 2)) for w in range(max(0, x - 1), min(W, x + 2))]
        if face[y, x] and 'face' in near:
            lab[y, x] = 'face'
        elif 'headband' in near and 'hair' not in near:
            lab[y, x] = 'headband'
        else:
            lab[y, x] = 'hair'
    return lab


def game(clean=True):
    """His figure at our scale (the cleaned reduction, or with clean=False the even one): (rgb, mask, part
    of each pixel, kinds of each pixel), 100 x 100 at OFFSET in our male idle frame 0. Head over body."""
    if clean in _CACHE:
        return _CACHE[clean]
    raw = native()
    bg = background(raw)
    a, line, _ = snapped(raw, bg)
    R = regions(a, bg)
    K = kinds(a)
    # his face's warm shadows are skin, not gold (there is no gold on his head)
    K[R['head'] & (K == 'gold')] = 'skin'
    lab = labels(a, K, bg, R)
    hl = head_labels(a, K, R)
    out = np.zeros((SIZE, SIZE, 3), np.int32)
    mask = np.zeros((SIZE, SIZE), bool)
    part = np.full((SIZE, SIZE), '', dtype='<U10')
    # (his red is an accent only on his sword's jewel and his eyes: the cape's lining is an area)
    def accent(X, Y, k):
        return k != 'red' or lab[Y, X] in ('hilt', 'head')

    for name in ('body', 'head'):
        m, c, src = reduce_region(a, K, R[name], name, clean, line, accent)
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
    _CACHE[clean] = (out, mask, part, GK)
    return _CACHE[clean]


HEAD_PARTS = ('face', 'hair', 'headband')
# How far from its bones (game picture pixels) a limb piece reaches: the sleeves round the arm, the cuffs round
# the forearm, the fists round the hand.
LIMB_REACH = [
    ('sleeve_n', [('shoulderN', 'elbowN'), ('elbowN', 'wristN')], 4.6),
    ('sleeve_f', [('shoulderF', 'elbowF'), ('elbowF', 'wristF')], 4.2),
    ('cuff_n', [('elbowN', 'wristN')], 4.8),
    ('cuff_f', [('elbowF', 'wristF')], 4.8),
    ('glove_n', [('wristN', 'handN')], 6.0),
    ('glove_f', [('wristF', 'handF')], 6.2),
]


def tidy_parts(part, mask, GK):
    """At our scale a part keeps only what is of it: a pixel of his line with none of the part's own colours
    beside it, or a speck of the part of 2 pixels or fewer apart from the rest, goes to the part most of its
    neighbours are (the cape's first): shrinking his picture can leave a bit of a neighbour's line or trim on
    a part, which would hang loose once that part moves or the cape is taken off."""
    H, W = mask.shape
    # each limb piece only near its bones: what lies farther from them is the cape's black or trim beside it
    ys, xs = np.mgrid[0:H, 0:W]
    for n, bones, reach in LIMB_REACH:
        near = np.zeros((H, W), bool)
        for a_, b_ in bones:
            near |= band(JOINTS[a_], JOINTS[b_], reach)
        part[(part == n) & ~near] = CAPE
    for _ in range(3):
        changed = False
        sizes = {}
        for n in set(part[mask].tolist()) - {'', CAPE} - set(HEAD_PARTS):
            sz = components(part == n)
            for y, x in zip(*np.nonzero(part == n)):
                sizes[(y, x)] = sz[y, x]
        for y, x in zip(*np.nonzero(mask)):
            n = part[y, x]
            if n in ('', CAPE) or n in HEAD_PARTS:
                continue
            nb = [(y + dy, x + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and 0 <= y + dy < H and 0 <= x + dx < W and mask[y + dy, x + dx]]
            own = [q for q in nb if part[q] == n and GK[q] != 'line']
            loose = (GK[y, x] == 'line' and not own) or sizes.get((y, x), 99) <= 2
            if not loose:
                continue
            others = [part[q] for q in nb if part[q] != n and part[q] not in HEAD_PARTS and GK[q] != 'line'] or [part[q] for q in nb if part[q] != n and part[q] not in HEAD_PARTS]
            if not others:
                continue
            to = CAPE if CAPE in others else max(sorted(set(others)), key=others.count)
            part[y, x] = to
            changed = True
        if not changed:
            break
    # A thin strip of the tails apart from the rest of them (side by side: it may touch them corner to corner;
    # at most 2 pixels across in every row) beside a
    # trouser leg is that leg's outer line: it goes with the leg, so it moves with it and does not hang loose
    # on the tail once the leg moves off.
    for patch in patches(part == 'tails', four=True):
        rows_ = {}
        for y, x in patch:
            rows_[y] = rows_.get(y, 0) + 1
        if len(patch) < 3 or max(rows_.values()) > 2 or len(rows_) < 3:
            continue
        legs = [part[y + dy, x + dx] for y, x in patch for dy in (-1, 0, 1) for dx in (-1, 0, 1)
                if 0 <= y + dy < H and 0 <= x + dx < W and part[y + dy, x + dx] in ('trousers_n', 'trousers_f')]
        if legs:
            to = max(sorted(set(legs)), key=legs.count)
            for y, x in patch:
                part[y, x] = to
    # A bit of a mantle apart from the rest of it (his cape's edge beside the far cuff) is the cape's: it stays
    # with the cape when the arm under the mantle moves.
    for n in ('mantle_f', 'mantle_n'):
        ps = sorted(patches(part == n), key=len)
        for patch in ps[:-1]:
            if len(patch) > MANTLE_BIT:
                continue
            nb = [part[y + dy, x + dx] for y, x in patch for dy in (-1, 0, 1) for dx in (-1, 0, 1)
                  if 0 <= y + dy < H and 0 <= x + dx < W and mask[y + dy, x + dx] and part[y + dy, x + dx] not in (n, '')]
            to = CAPE if CAPE in nb or not nb else max(sorted(set(nb)), key=nb.count)
            for y, x in patch:
                part[y, x] = to


# The largest bit of a mantle apart from the rest of it that goes to the cape.
MANTLE_BIT = 6


def patches(m, four=False):
    """The 8-connected patches of a mask (with `four`, 4-connected), each as a list of its (y, x) cells."""
    H, W = m.shape
    seen = np.zeros((H, W), bool)
    out = []
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
                    if (not four or not (dq and dp)) and 0 <= u < H and 0 <= w < W and m[u, w] and not seen[u, w]:
                        seen[u, w] = True
                        stack.append((u, w))
        out.append(comp)
    return out


def part_study(path, k=8):
    """The game picture with each part in its own colour (his line darker), at k x."""
    g, m, part, GK = game()
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
    # python3 -I tools/refs/noble_ref.py <dir>: his picture, the even reduction and the cleaned one.
    if sys.argv[1] == '--labels':
        label_study(sys.argv[2])
        return
    if sys.argv[1] == '--parts':
        part_study(sys.argv[2])
        return
    d = sys.argv[1]
    os.makedirs(d, exist_ok=True)
    raw = native()
    save(np.concatenate([raw.astype(np.uint8), np.full(raw.shape[:2] + (1,), 255, np.uint8)], axis=2), os.path.join(d, 'his@4.png'), 4)
    for c, n in ((False, 'unclean'), (True, 'clean')):
        g, m, _, _ = game(c)
        save(rgba(g, m), os.path.join(d, f'{n}@8.png'), 8)


# ---------------------------------------------------------------------------------------------------
# His figure cut into the parts each item draws, on HIS picture (where his shapes are clear): polygons
# in his pixel corners, in the order they claim his pixels (a pixel goes to the first part whose polygon
# holds it and whose kinds take it; his line goes to the part beside it). The reduction carries the
# parts down to our scale: each fine pixel is the part of his pixel it shows.
# ---------------------------------------------------------------------------------------------------
DARK = ('dark', 'line')
BODY_PARTS = [
    # the sabre: the blade from the guard to the point, the gold guard with the red jewel
    ('blade', [(76, 123), (84, 123), (119, 189), (118, 199), (109, 199), (73, 131)], ('blue', 'white', 'line')),
    ('hilt', [(57, 124), (66, 118), (74, 112), (84, 112), (87, 117), (82, 124), (79, 129), (72, 132), (64, 134), (57, 131)], ('gold', 'white', 'line', 'dark', 'brown')),
    # (his red there is only the jewel's: the lining beside the guard is the cape's)
    ('jewel', [(69, 120), (74, 120), (74, 126), (69, 126)], ('red',)),
    # the fists: his near glove round the grip, his far fingerless glove
    # (his gold trim on the back of the near glove stands out above-left of the fist)
    ('glove_n', [(53, 101), (60, 100), (64, 104), (72, 104), (78, 109), (78, 116), (73, 121), (64, 122), (58, 118), (53, 108)], ('dark', 'line', 'skin', 'gold', 'purple', 'brown')),
    ('glove_f', [(125, 108), (141, 107), (142, 125), (127, 126), (125, 117)], ('dark', 'line', 'skin', 'gold')),
    # the cuffs: purple with gold bands, from the forearm to the wrist
    ('cuff_n', [(58, 90), (65, 88), (73, 94), (80, 98), (80, 105), (73, 107), (64, 106), (58, 105)], ('purple', 'gold', 'line', 'dark')),
    ('cuff_f', [(123, 96), (132, 92), (139, 92), (142, 107), (136, 110), (125, 109)], ('purple', 'gold', 'line', 'dark')),
    # the high collar, its two wings (black outside, red lining, gold edge) round the neck
    ('collar_n', [(85, 37), (93, 37), (99, 44), (100, 57), (96, 58), (90, 56), (86, 50)], ('dark', 'gold', 'line', 'red')),
    ('collar_f', [(112, 38), (124, 38), (133, 40), (131, 50), (125, 56), (120, 58), (114, 52)], ('dark', 'gold', 'line', 'red')),
    # the gold studs that fasten the cape at the collar's foot
    ('stud_n', [(90, 55), (97, 55), (97, 62), (90, 62)], ('gold', 'line', 'brown', 'white')),
    ('stud_f', [(118, 56), (125, 56), (125, 63), (118, 63)], ('gold', 'line', 'brown', 'white')),
    # the chest's front: the cravat, the chains across it and the front panel between the two gold lines
    ('front', [(102, 47), (117, 47), (118, 57), (122, 60), (122, 88), (99, 88), (97, 60), (101, 57)], ('white', 'gold', 'dark', 'line', 'brown')),
    ('belt', [(95, 86), (127, 86), (127, 96), (95, 96)], ('brown', 'gold', 'dark', 'line', 'white', 'red')),
    # the mantles: the cape's black over each shoulder, to its gold edge
    ('mantle_n', [(97, 40), (99, 56), (93, 63), (85, 68), (76, 75), (66, 82), (58, 88), (51, 95), (45, 104), (36, 104), (52, 70), (70, 52), (85, 42)], ('dark', 'gold', 'line', 'white')),
    ('mantle_f', [(119, 48), (130, 46), (138, 55), (146, 75), (153, 96), (146, 98), (141, 96), (136, 88), (130, 80), (125, 72), (122, 64), (119, 60)], ('dark', 'gold', 'line', 'white')),
    # the coat's sleeves (his dark plum cloth) from under the mantles to the cuffs
    ('sleeve_n', [(56, 86), (66, 78), (79, 72), (84, 80), (82, 95), (78, 98), (66, 90), (58, 92)], ('dark', 'line', 'brown')),
    ('sleeve_f', [(121, 64), (125, 72), (130, 80), (134, 88), (136, 94), (128, 99), (122, 97), (120, 80)], ('dark', 'line', 'brown')),
    # his trousers (navy, a gold seam) where the coat's tails show them, each leg; his boots
    ('boot_n', [(64, 168), (84, 168), (85, 197), (64, 197)], ('dark', 'line', 'gold', 'brown', 'white', 'skin')),
    ('boot_f', [(107, 168), (126, 166), (142, 184), (142, 194), (107, 194)], ('dark', 'line', 'gold', 'brown', 'white', 'skin')),
    ('trousers_n', [(88, 116), (104, 112), (107, 122), (101, 140), (92, 158), (86, 170), (70, 170), (74, 150), (84, 128)], ('dark', 'line', 'gold')),
    ('trousers_f', [(104, 112), (118, 112), (122, 125), (122, 170), (106, 170), (104, 150), (101, 140), (107, 122)], ('dark', 'line', 'gold')),
    # the coat: the torso round the front, and its tails below the belt (the front flaps, the long near
    # tail with its gold ornament, the long far tail)
    ('coat', [(84, 56), (100, 56), (120, 56), (132, 62), (133, 92), (127, 97), (95, 97), (85, 97), (83, 70)], ('dark', 'line', 'gold', 'brown', 'purple')),
    ('tails', [(78, 96), (132, 96), (138, 100), (139, 166), (119, 166), (119, 125), (107, 112), (88, 126), (86, 168), (58, 168), (58, 124), (76, 110)], ('dark', 'line', 'gold', 'purple', 'brown')),
]
# Whatever is left of his figure below the head is the cape's: the cloth behind the body (his red lining
# and black outside, its gold trim) from the shoulders to the ground.
CAPE = 'cape'


def labels(a, K, bg, R):
    """His figure split into parts: an array of part names per his pixel ('' outside him)."""
    H, W = K.shape
    lab = np.full((H, W), '', dtype='<U10')
    lab[R['head']] = 'head'
    body = R['body']
    line = K == 'line'
    polys = {n: inside(p, H, W) for n, p, _ in BODY_PARTS}
    for n, p, takes in BODY_PARTS:
        m = polys[n] & body & (lab == '') & ~line & np.isin(K, takes)
        lab[m] = n
    # his line: to the part beside it whose polygon holds it, in the parts' order, else any part beside it
    colour = lab.copy()
    for y, x in zip(*np.nonzero(line & body & (lab == ''))):
        near = {colour[q, w] for q in range(max(0, y - 1), min(H, y + 2)) for w in range(max(0, x - 1), min(W, x + 2))} - {'', 'head'}
        for n, _, _ in BODY_PARTS:
            if n in near and polys[n][y, x]:
                lab[y, x] = n
                break
    # what no part took (a colour of his it does not take, as a speck of red in its shading) goes to the
    # first part whose polygon holds it, unless it is red: his red lining is the cape's
    for n, _, _ in BODY_PARTS:
        lab[polys[n] & body & (lab == '') & (K != 'red')] = n
    # what is left is the cape's
    lab[body & (lab == '')] = CAPE
    lab[lab == 'jewel'] = 'hilt'
    return lab


def label_study(path):
    """His picture with each part tinted, at 4x (python3 -I tools/refs/noble_ref.py --labels out.png)."""
    raw = native()
    bg = background(raw)
    a, _, _ = snapped(raw, bg)
    R = regions(a, bg)
    K = kinds(a)
    K[R['head'] & (K == 'gold')] = 'skin'
    lab = labels(a, K, bg, R)
    names = sorted(set(lab[lab != ''].tolist()))
    pal = [(230, 25, 75), (60, 180, 75), (255, 225, 25), (0, 130, 200), (245, 130, 48), (145, 30, 180), (70, 240, 240),
           (240, 50, 230), (210, 245, 60), (250, 190, 212), (0, 128, 128), (220, 190, 255), (170, 110, 40), (255, 250, 200),
           (128, 0, 0), (170, 255, 195), (128, 128, 0), (255, 215, 180), (0, 0, 128), (128, 128, 128), (90, 200, 120),
           (200, 90, 120), (120, 90, 200), (60, 60, 60)]
    tint = {n: np.array(pal[k % len(pal)]) for k, n in enumerate(names)}
    out = np.full(a.shape, 255, np.int32)
    for n in names:
        m = lab == n
        out[m] = tint[n]
    out[(K == 'line') & (lab != '')] = (out[(K == 'line') & (lab != '')] * 0.5).astype(np.int32)
    img = Image.fromarray(out.astype(np.uint8)).resize((800, 800), Image.NEAREST)
    from PIL import ImageDraw
    d = ImageDraw.Draw(img)
    for n in names:
        ys, xs = np.nonzero(lab == n)
        d.text((int(xs.mean()) * 4 - 10, int(ys.mean()) * 4), n, fill=(0, 0, 0))
    img.save(path)


if __name__ == '__main__':
    _main()


# ---------------------------------------------------------------------------------------------------
# The pieces at our scale, with what his picture hides of each continued from his own pixels.
# ---------------------------------------------------------------------------------------------------
# The order the game draws them in, back to front (the layers they go into, items/noble.ts): a piece's
# hidden cells are filled only where a piece later in this order (or his head) covers them at rest, so put
# together at rest they are his figure pixel for pixel.
DEPTH_ORDER = [
    'cape', 'hair_back', 'sleeve_f', 'glove_f', 'cuff_f', 'trousers_f', 'boot_f', 'trousers_n', 'boot_n', 'seat',
    'coat', 'tails', 'front', 'belt', 'mantle_f', 'collar_n', 'collar_f', 'stud_n', 'stud_f', 'face', 'hair',
    'headband', 'hilt', 'blade', 'sleeve_n', 'glove_n', 'cuff_n', 'mantle_n',
]


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
            # nothing along the axis nor in the row: the nearest source cell
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
    """Where a piece is drawn among the others (DEPTH_ORDER): a boot's shin and foot where the boot is, the
    sabre where its blade is (a name not in it: in the order given)."""
    base = {'sabre': 'blade', 'back': 'hair_back', 'front': 'hair', 'band': 'headband', 'seat_whole': 'seat'}.get(n, n.replace('_shin', '').replace('_foot', ''))
    if base not in DEPTH_ORDER:
        return 1000
    return DEPTH_ORDER.index(base) + (0.5 if n.endswith('_foot') else 0)


def front_of(part, name, extra=()):
    """The cells his picture covers with pieces drawn after `name` (DEPTH_ORDER), or with `extra` parts."""
    k = DEPTH_ORDER.index(name)
    later = set(DEPTH_ORDER[k + 1:]) | set(extra)
    return np.isin(part, list(later))


# His joints at rest, where his limbs are in his picture at our scale (game picture pixels). His arms hang
# on our joints (his wrists and shoulders are ours); his legs stand wider and his far foot lower than our
# rig's: the leg pieces are cut about these joints (the game stands his legs on them, items/noble.ts).
HIS_JOINTS = {
    **JOINTS,
    'hipN': (46.0, 56.5),
    'kneeN': (40.6, 72.4),
    'ankleN': (36.2, 89.0),
    'hipF': (55.2, 55.5),
    'kneeF': (56.3, 72.2),
    'ankleF': (56.6, 88.6),
}
# The coat's torso where the front, the mantles, the collar, the belt and the near arm hide it: from the
# collar's foot to the hips, its sides at his line under the arms, its shoulders round to our shoulders.
COAT_SHAPE = [(43, 26), (57, 26), (61, 29), (62.5, 33), (62, 47), (59, 50), (44, 50), (40.5, 47), (39.5, 33), (40.5, 29)]
# Each sleeve's half width about the arm's line where it runs on under the mantle (up to the shoulder) and
# under the cuff (down to the wrist).
SLEEVE_HALF = {'N': 3.6, 'F': 3.1}
# Each trouser leg's half width about his leg's line, from the hip down into the boot.
TROUSER_HALF = {'N': 4.4, 'F': 3.9}
TROUSER_TO = {'N': 87, 'F': 86}
# The trousers' seat between his hips (worn without the coat's tails): from the belt to where his legs part.
SEAT_SHAPE = [(42.5, 45.5), (60.5, 45.5), (60, 55), (57, 58), (52, 59.5), (47, 58), (43, 55)]
# The first row of each boot's foot (the shaft above it turns with the shin).
BOOT_FOOT_FROM = {'N': 91, 'F': 90}
# How far across the sword the coat's tails run on behind it.
TAIL_GAP = 4
# The sword's grip in his near fist: on the blade's line (his blade runs from the guard at his (78, 126) to
# the point at (114, 195)), from inside the fist to where it comes out at the guard.
GRIP = ((32.6, 54.6), (37.0, 63.0))
GRIP_HALF = 1.0


def joint(name):
    return HIS_JOINTS[name]


def pieces():
    """His figure at our scale cut into pieces, with what his picture hides of each continued from his own
    pixels: {name: (mask, colours)} in game picture pixels."""
    if 'pieces' not in _CACHE:
        _CACHE['pieces'] = _pieces()
    return {n: (m.copy(), c.copy()) for n, (m, c) in _CACHE['pieces'].items()}


def _pieces():
    g, mask, part, GK = game()
    line = his_line()
    H, W = mask.shape
    rows = np.arange(H)[:, None]
    out = {}
    names = sorted(set(part[mask].tolist()))
    for n in names:
        out[n] = (part == n, g.copy())
    isline = GK == 'line'

    def grow(n, hid, col):
        m, _ = out[n]
        out[n] = (m | hid, col)

    # The coat's torso: under the front, the mantles, the collar, the belt and the near arm his cloth runs
    # on down each column (his folds run down), then across what is left; its sides close on his line.
    shape = poly(COAT_SHAPE)
    m = out['coat'][0]
    hid = shape & ~m & front_of(part, 'coat', ['head', 'face', 'hair', 'headband'])
    edge = edge4(shape) & hid
    plain = m & (GK == 'dark')
    c = continue_along(g, plain, hid & ~edge, (0, 1), 1)
    c = continue_along(c, plain | (hid & ~edge), hid & edge, (0, 1), 1, edge, line)
    grow('coat', hid, c)

    # Each sleeve: up under its mantle to the shoulder and down under its cuff to the wrist, his cloth run on
    # along the arm, its sides on his line.
    for s in ('N', 'F'):
        n = 'sleeve_' + s.lower()
        m = out[n][0]
        sh, el, wr = joint('shoulder' + s), joint('elbow' + s), joint('wrist' + s)
        arm = band(sh, el, SLEEVE_HALF[s]) | band(el, wr, SLEEVE_HALF[s] - 0.4)
        hid = arm & ~m & front_of(part, n, ['head', 'face', 'hair', 'headband'])
        edge = edge4(arm) & hid
        src = m & ~isline
        c = continue_along(g, src, hid, (el[0] - sh[0], el[1] - sh[1]), 1, edge, line)
        grow(n, hid, c)

    # The trousers: each leg's band about his leg's line, his cloth continued up each column from his pixels
    # below (his creases run on up the leg), its sides on his line, down into the boot.
    for s in ('N', 'F'):
        n = 'trousers_' + s.lower()
        m = out[n][0]
        hip, knee, ankle = joint('hip' + s), joint('knee' + s), joint('ankle' + s)
        leg = (band(hip, knee, TROUSER_HALF[s]) | band(knee, ankle, TROUSER_HALF[s])) & (rows <= TROUSER_TO[s]) & (rows >= 47)
        hid = leg & ~m & front_of(part, n, ['head'])
        edge = edge4(leg) & hid
        src = m & ~isline
        c = continue_along(g, src, hid, (0, 1), 1, edge, line)
        grow(n, hid, c)

    # The trousers' seat: between his hips, from the belt down to where his legs part, his cloth continued up
    # from both legs (worn without his coat's tails, the trousers are whole up to the belt).
    shape = poly(SEAT_SHAPE)
    legs = out['trousers_n'][0] | out['trousers_f'][0]
    hid = shape & ~legs & front_of(part, 'seat', ['head'])
    edge = edge4(shape) & hid & ~near8(legs)
    src = legs & ~isline
    cl = g.copy()
    for n in ('trousers_n', 'trousers_f'):
        lm, lc = out[n]
        cl[lm] = lc[lm]
    c = continue_along(cl, src, hid & ~edge, (0, 1), 1)
    c[hid & edge] = line
    out['seat'] = (hid, c)
    # (without the cape, the whole seat: also where his cape's lining shows between his legs at rest)
    whole = shape & ~legs
    edge = edge4(shape) & whole & ~near8(legs)
    c = continue_along(cl, src, whole & ~edge, (0, 1), 1)
    c[whole & edge] = line
    out['seat_whole'] = (whole, c)

    # The boots: the shaft runs on two rows under the foot's top (his two rows above it again), so the shin
    # can turn without a gap at the ankle; where the blade hides the boot his leather runs on across.
    for s in ('N', 'F'):
        n = 'boot_' + s.lower()
        m = out[n][0]
        top = BOOT_FOOT_FROM[s]
        ys, xs = np.nonzero(m)
        span = np.zeros((H, W), bool)
        for y in range(ys.min(), ys.max() + 1):
            r = np.nonzero(m[y])[0]
            if len(r):
                span[y, r.min():r.max() + 1] = True
        hid = span & ~m & front_of(part, n)
        c = continue_along(g, m & ~isline, hid, (1, 0), 1)
        m = m | hid
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

    # The coat's tails, the front, the belt: where the sword, the fists and the cuffs hide them, his cloth
    # runs on down each column (between his outermost cells on each row).
    for n, axis in (('front', (0, 1)), ('belt', (1, 0))):
        m = out[n][0]
        span = np.zeros((H, W), bool)
        for y in range(H):
            r = np.nonzero(m[y])[0]
            if len(r):
                span[y, r.min():r.max() + 1] = True
        hid = span & ~m & front_of(part, n, ['head'])
        c = continue_along(g, m & ~isline, hid, axis, 1)
        grow(n, hid, c)
    # The tails run on behind the sword where it crosses them: a cell the sword covers with his tails within
    # TAIL_GAP on both sides of it in its row takes his cloth from the column (his folds run down).
    m = out['tails'][0]
    sword = np.isin(part, ['blade', 'hilt'])
    hid = np.zeros((H, W), bool)
    for y, x in zip(*np.nonzero(sword & ~m)):
        left = m[y, max(0, x - TAIL_GAP):x].any()
        right = m[y, x + 1:x + 1 + TAIL_GAP].any()
        hid[y, x] = left and right
    c = continue_along(g, m & (GK == 'dark'), hid, (0, 1), 1)
    grow('tails', hid, c)

    # The sword: his guard and blade, and the grip in his fist (his gold run on along the blade's line from
    # where it goes in by the guard, his line on its sides) as one piece.
    blade = out['blade'][0] | out['hilt'][0]
    grip = band(*GRIP, GRIP_HALF + 0.8) & ~blade & front_of(part, 'blade')
    core = band(*GRIP, GRIP_HALF) & grip
    src = blade & (GK == 'gold')
    c = continue_along(g, src, core, (GRIP[1][0] - GRIP[0][0], GRIP[1][1] - GRIP[0][1]), 1)
    c[grip & ~core] = line
    out['sabre'] = (blade | grip, c)
    for n in ('blade', 'hilt'):
        del out[n]

    # The collar's inside behind the neck (his black between the two wings, above the studs) goes with the
    # collar: it stands in front of the neck.
    wings = out['collar_n'][0] | out['collar_f'][0]
    m = out['cape'][0]
    inner = np.zeros((H, W), bool)
    for y in range(H):
        r = np.nonzero(wings[y])[0]
        if len(r):
            inner[y, r.min():r.max() + 1] = True
    inner &= m & (rows <= 28)
    if inner.any():
        cm, cc = out['collar_n']
        cc = cc.copy()
        cc[inner] = g[inner]
        out['collar_n'] = (cm | inner, cc)
        out['cape'] = (m & ~inner, out['cape'][1])

    # The cape: behind everything, his cloth continued inside its outline from the shoulders down (each
    # column takes his cape below or above it: his red lining runs on up behind the body, his black outside
    # down its sides), so as the body moves the cape shows behind it, never the background.
    m = out['cape'][0]
    shape = np.zeros((H, W), bool)
    for y in range(26, H):
        r = np.nonzero(mask[y])[0]
        if len(r):
            shape[y, r.min():r.max() + 1] = True
    shape &= mask
    # (down to his hem: in each column no lower than his lowest cape there, between columns where the body
    # hides it all the hem runs straight across)
    cols = [x for x in range(W) if m[:, x].any()]
    low = np.interp(np.arange(W), cols, [np.nonzero(m[:, x])[0].max() for x in cols])
    # (where the sword or a fist hides its lower part, a column's lowest cape is above them: the hem there is
    # as low as the deeper hems on both sides of it, the lower of the two, so the cape is whole behind them)
    left = np.maximum.accumulate(low)
    right = np.maximum.accumulate(low[::-1])[::-1]
    low = np.maximum(low, np.minimum(left, right))
    shape &= rows <= np.floor(low)[None, :]
    hid = shape & ~m
    c = continue_along(g, m & ~isline & (GK == 'red'), hid, (0, 1), 1)
    # (the continued cloth's hem ends on his line, as his hem does)
    hem = shape.copy()
    hem[:-1] &= ~shape[1:]
    c[hid & hem] = line
    grow('cape', hid, c)
    return out


def compose(pcs, names=None):
    """The pieces drawn back to front (DEPTH_ORDER), as (rgb, mask)."""
    out = np.zeros((SIZE, SIZE, 3), np.int32)
    mask = np.zeros((SIZE, SIZE), bool)
    for n in sorted(pcs, key=rank):
        if (names is not None and n not in names) or (names is None and n.endswith('_whole')):
            continue
        m, c = pcs[n]
        out[m] = c[m]
        mask |= m
    return out, mask


# ---------------------------------------------------------------------------------------------------
# Writing the pieces as TypeScript.
# ---------------------------------------------------------------------------------------------------
def split(mask, a, j, b, past=None):
    """A limb piece cut at its joint j (between the bones a-j and j-b): the cells before the cut (toward a)
    and after it. The cut runs across the limb through j, square to the line halfway between both bones. With
    `past`, a cell more than that far beyond j along a-j goes after the cut too (the outside of the bend, which
    would poke out past the bent joint)."""
    H, W = mask.shape
    u1 = np.array([j[0] - a[0], j[1] - a[1]], float)
    u2 = np.array([b[0] - j[0], b[1] - j[1]], float)
    nrm = u1 / np.hypot(*u1) + u2 / np.hypot(*u2)
    ys, xs = np.mgrid[0:H, 0:W]
    d = (xs + 0.5 - j[0]) * nrm[0] + (ys + 0.5 - j[1]) * nrm[1]
    after = d >= 0
    if past is not None:
        e = ((xs + 0.5 - j[0]) * u1[0] + (ys + 0.5 - j[1]) * u1[1]) / np.hypot(*u1)
        after |= e > past
    return mask & ~after, mask & after


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
    out.append("/** What each of his colours is, as the script sorts them (tools/refs/noble_ref.py kind). */")
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


def header(script, what):
    return (f"// {what}, the owner's pixels at our scale (tools/refs/{script} from\n"
            "// docs/reference/noble-swordsman-owner-reference.jpg, reduced and cleaned by tools/refs/noble_ref.py).\n"
            "// Generated: rerun the script to change it.\n")


def study(path, names, pcs, k=8):
    """The pieces put together back to front beside his figure at our scale (the cleaned reduction), at k x."""
    g, m, _, _ = game()
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
# His near eye's lash row starts here at our scale: our face anchor raised as his Roman head is (HEAD_UP: the
# cell on his Ren picture, tools/refs/ren_ref.py ANCHOR, 3 rows up), so his head stands where his picture has
# it, above his high collar, as high as our male standard's (src/sprite/romanNeck.ts headUp).
HEAD_UP = 3
ANCHOR = (48, 19 - HEAD_UP)
# His eyes at our scale: the near eye's 5 columns from x 48 and the far eye's 3 from x 55, the lash row
# and the row under it (ex 0 and fx 7 from the anchor, body.ts PAINTED_HEADS).
EYES = {'near': (48, ANCHOR[1], 5, 2), 'far': (55, ANCHOR[1], 3, 2)}


def eye_letter(c):
    """Our face template's letter for a pixel of his eye: L his lash line, w his white, d / i his dark and
    bright red, s his skin (no pixel of the eye: the face's own skin shows)."""
    k = kind(c)
    if k == 'line' or (k == 'dark' and luma(np.array(c)) < 30):
        return 'L'
    if k == 'white':
        return 'w'
    if k == 'red':
        return 'i' if luma(np.array(c)) > 40 else 'd'
    return 's'


def run_part(script, what, out_ts, study, consts, bases, prefix, kinds_of=None, extra='', names=None):
    """A part script's work: writes the module and (with a study folder) its pieces beside his figure."""
    write(out_ts, module(header(script, what), consts, bases, prefix, kinds_of, extra))
    if study:
        os.makedirs(study, exist_ok=True)
        pcs = {c[0]: (c[1], c[2]) for c in consts}
        g, m, _, _ = game()
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
