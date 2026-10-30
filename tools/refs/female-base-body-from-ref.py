"""The owner's bare female body, piece by piece, from his picture -> src/sprite/femaleBaseArt.ts.

His picture (docs/reference/female-base-owner-reference.jpg, see female_base_ref.py) is the standard
for the female body: "aqui tienes una base del cuerpo femenino sin ropa para que entiendas la base del
cuerpo" (2026-10-21). Every piece here is his pixels, cut where one part of the body meets the next,
and rides one bone of our rig (src/sprite/body.ts drawBaseBody) the way Aiden's plate does: at his
angle every pixel is his, turned with RotSprite as the limb turns.

- JOINTS: his joints, read off his picture (his pixels): the shoulders are the middle of the shoulder's
  round, the elbows, wrists, knees and ankles the middle of the limb where it bends, the hips the middle
  of the thigh's top under the briefs, the neck the middle of the neck's foot. The female rig is fitted
  to them (rig.ts BodyFit): at idle frame 0 every joint is his, so the body is his picture.
- The pieces: the chest (the neck's foot, shoulders and the sports top), the neck above its foot, the
  pelvis (belly and briefs), each upper arm, forearm and hand, each thigh, shin and foot. A pixel belongs to the part it is painted on (REGIONS
  below, row by row); a line he draws between two parts goes to both, so each keeps its own line when
  they move apart.
- What his picture hides is continued from his pixels, every hidden pixel taking the colour of the
  nearest pixel of his in that piece (never a new colour): the neck under the head, the chest's near side
  under the near arm, the belly under the chest (for breathing), the thigh tops under the briefs, and the
  far upper arm behind the chest (he shows only a sliver of it: it is continued as a band of his far
  skin from the far shoulder to the elbow). At idle every hidden pixel is under a piece in front of it;
  the script checks that the pieces put together at idle are his picture, pixel for pixel.
- Joints: the lower piece of a joint carries a round cap of the upper piece's pixels round the joint (his
  pixels where they are), drawn over it, so a bent elbow, knee or ankle stays whole. At rest every pixel
  is his as drawn; in any other pose a pixel of a piece left on its layer's edge (a cut where the piece
  met the next part of him, or a pixel of his line lost turning it) becomes his line (body.ts), so no
  piece ever shows a cut edge. --check marks the cuts in white on the piece map.
- His black sports top and briefs are cloth colours in the chest and pelvis pieces (`cloth`); the
  creator's sports top and briefs items recolour them.

Run from the repo root:
    python3 -I tools/refs/female-base-body-from-ref.py            # writes src/sprite/femaleBaseArt.ts
    python3 -I tools/refs/female-base-body-from-ref.py --check <dir>  # also writes check images
Generated output says so: rerun the script to change it, never edit the module.
"""
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import female_base_ref as R  # noqa: E402

OUT = os.path.join(R.REPO, 'src', 'sprite', 'femaleBaseArt.ts')
N = R.native()
BG = R.background(N)
IDX, COLS = R.palette(N, BG)

# ---------------------------------------------------------------------------
# His joints (his pixels; a pixel (x, y) covers x..x+1, y..y+1).
# ---------------------------------------------------------------------------
JOINTS = {
    'neck': (50.5, 26.5),
    'shoulderN': (42.5, 31.5),
    'shoulderF': (58.5, 31.5),
    'elbowN': (38.5, 44.5),
    'elbowF': (62.5, 44.5),
    'wristN': (36.5, 53.5),
    'wristF': (66.0, 54.5),
    'hipN': (47.5, 53.0),
    'hipF': (61.0, 53.0),
    'kneeN': (44.0, 74.5),
    'kneeF': (60.5, 74.0),
    'ankleN': (40.0, 89.0),
    'ankleF': (61.0, 88.5),
}
JOINTS['pelvis'] = ((JOINTS['hipN'][0] + JOINTS['hipF'][0]) / 2, JOINTS['hipN'][1])
# The head stays where our female head was at idle (his face lies under it): its centre, design units
# in our frame, is (63, 69); in his pixels (63 * 2 - 73, 69 * 2 - 120).
JOINTS['head'] = (53.0, 18.0)

# ---------------------------------------------------------------------------
# Regions: which of his pixels each piece is painted with, row by row ('y: x0-x1 ...').
# ---------------------------------------------------------------------------
REGIONS = {
    # neck, shoulders and the sports top down to its band (the near shoulder's round is the arm's)
    'chest': R.spans('''
        26: 45-54
        27: 45-56
        28: 46-59
        29: 47-60
        30: 47-61
        31: 48-61
        32: 48-61
        33: 46-61
        34: 45-62
        35: 45-62
        36: 45-62
        37: 45-62
        38: 45-61
        39: 46-60
    '''),
    # belly, waist and briefs
    'pelvis': R.spans('''
        40: 46-60
        41: 47-60
        42: 47-60
        43: 48-60
        44: 48-60
        45: 47-61
        46: 46-61
        47: 46-62
        48: 45-62
        49: 44-63
        50: 44-63
        51: 43-63
        52: 43-64
        53: 42-64
        54: 48-61
        55: 50-60
        56: 52-58
        57: 53-57
    '''),
    'upperArmN': R.spans('''
        27: 42-44
        28: 41-45
        29: 40-46
        30: 39-46
        31: 39-47
        32: 39-47
        33: 39-46
        34: 38-45
        35: 38-45
        36: 38-44
        37: 37-44
        38: 37-43
        39: 37-43
        40: 37-43
        41: 37-42
        42: 36-42
        43: 36-41
        44: 35-41
    '''),
    'forearmN': R.spans('''
        45: 35-41
        46: 35-41
        47: 35-40
        48: 34-40
        49: 34-40
        50: 34-39
        51: 34-39
        52: 34-38
        53: 34-38
    '''),
    'handN': R.spans('''
        54: 33-38
        55: 33-38
        56: 32-39
        57: 32-40
        58: 32-40
        59: 32-40
        60: 33-40
        61: 34-39
        62: 35-38
    '''),
    # the sliver of the far upper arm he shows between the chest and the waist
    'upperArmF': R.spans('''
        39: 61-62
        40: 60-62
        41: 60-62
        42: 60-62
        43: 60-63
        44: 60-63
    '''),
    'forearmF': R.spans('''
        45: 61-64
        46: 61-64
        47: 62-65
        48: 62-65
        49: 63-65
        50: 63-66
        51: 63-66
        52: 64-67
        53: 64-67
        54: 64-68
    '''),
    'handF': R.spans('''
        55: 64-69
        56: 65-69
        57: 65-69
        58: 65-69
        59: 65-68
        60: 65-67
    '''),
    'thighN': R.spans('''
        54: 42-47
        55: 42-49
        56: 41-51
        57: 41-53
        58: 41-54
        59: 41-54
        60: 41-53
        61: 41-53
        62: 41-52
        63: 41-52
        64: 41-52
        65: 41-51
        66: 41-51
        67: 41-50
        68: 41-50
        69: 41-49
        70: 41-49
        71: 41-49
        72: 41-48
        73: 40-48
        74: 40-47
    '''),
    'shinN': R.spans('''
        75: 39-47
        76: 39-46
        77: 38-46
        78: 38-46
        79: 38-46
        80: 38-45
        81: 38-45
        82: 38-44
        83: 38-44
        84: 38-43
        85: 38-43
        86: 38-42
        87: 38-42
        88: 37-42
    '''),
    'footN': R.spans('''
        89: 37-42
        90: 37-42
        91: 36-42
        92: 36-42
        93: 36-42
        94: 35-42
        95: 35-43
        96: 35-43
        97: 35-43
        98: 36-42
    '''),
    'thighF': R.spans('''
        54: 61-64
        55: 60-64
        56: 59-65
        57: 58-65
        58: 54-65
        59: 54-65
        60: 55-65
        61: 55-65
        62: 55-65
        63: 55-65
        64: 56-65
        65: 56-65
        66: 56-65
        67: 57-64
        68: 57-64
        69: 57-64
        70: 57-64
        71: 57-64
        72: 57-64
        73: 57-63
    '''),
    'shinF': R.spans('''
        74: 56-63
        75: 56-63
        76: 56-63
        77: 56-63
        78: 56-63
        79: 56-63
        80: 56-62
        81: 57-62
        82: 57-62
        83: 57-62
        84: 58-62
        85: 58-62
        86: 58-62
        87: 58-63
        88: 58-63
    '''),
    'footF': R.spans('''
        89: 57-64
        90: 57-65
        91: 57-66
        92: 57-68
        93: 58-69
        94: 61-69
        95: 63-68
    '''),
}

# Which layer each piece is drawn on, back to front, and the pieces of each layer in drawing order
# (body.ts drawBaseBody draws them the same way).
LAYERS = [
    ('farArm', ['upperArmF', 'forearmF', 'handF']),
    ('farLeg', ['thighF', 'shinF', 'footF']),
    ('nearLeg', ['thighN', 'shinN', 'footN']),
    ('torso', ['pelvis', 'chest', 'neck']),
    ('nearArm', ['upperArmN', 'forearmN', 'handN']),
]
LAYER_OF = {p: l for l, ps in LAYERS for p in ps}

# The bone each piece rides: its pivot joint and the joint its angle points at ('up' = the torso's up).
BONES = {
    'chest': ('neck', 'up'),
    # The neck rides the bone from its foot to the head: it turns with the head, not the chest, so a head
    # hung forward (the throw's release and follow-through) carries the neck with it.
    'neck': ('neck', 'head'),
    'pelvis': ('pelvis', 'up'),
    'upperArmN': ('shoulderN', 'elbowN'),
    'forearmN': ('elbowN', 'wristN'),
    'handN': ('wristN', 'wristN+'),
    'upperArmF': ('shoulderF', 'elbowF'),
    'forearmF': ('elbowF', 'wristF'),
    'handF': ('wristF', 'wristF+'),
    'wristN': ('wristN', 'wristN+'),
    'wristF': ('wristF', 'wristF+'),
    'thighN': ('hipN', 'kneeN'),
    'shinN': ('kneeN', 'ankleN'),
    'footN': ('ankleN', None),
    'thighF': ('hipF', 'kneeF'),
    'shinF': ('kneeF', 'ankleF'),
    'footF': ('ankleF', None),
}
# The torso's up at idle: our idle leans back 2 degrees (rig.ts IDLE.lean), its up points at -92.
UP_ANGLE = -92.0


def seg_angle(a, b):
    return math.degrees(math.atan2(b[1] - a[1], b[0] - a[0]))


def bone_angle(piece):
    j, k = BONES[piece]
    if k == 'up':
        return UP_ANGLE
    if k is None:
        return 0.0
    if k.endswith('+'):  # a hand turns with its forearm
        side = k[-2]
        return seg_angle(JOINTS['elbow' + side], JOINTS['wrist' + side])
    return seg_angle(JOINTS[j], JOINTS[k])


# ---------------------------------------------------------------------------
# What his picture hides, continued from his pixels.
# ---------------------------------------------------------------------------
def disc(c, r):
    cx, cy = c
    return {(x, y) for y in range(int(cy - r - 1), int(cy + r + 2)) for x in range(int(cx - r - 1), int(cx + r + 2))
            if (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r}


def band(a, b, ra, rb):
    """Pixels whose centre is within the tapering radius of the segment a-b (a capsule)."""
    out = set()
    ax, ay = a
    bx, by = b
    for y in range(int(min(ay, by) - max(ra, rb) - 1), int(max(ay, by) + max(ra, rb) + 2)):
        for x in range(int(min(ax, bx) - max(ra, rb) - 1), int(max(ax, bx) + max(ra, rb) + 2)):
            px, py = x + 0.5, y + 0.5
            dx, dy = bx - ax, by - ay
            t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
            r = ra + (rb - ra) * t
            if (px - ax - dx * t) ** 2 + (py - ay - dy * t) ** 2 <= r * r:
                out.add((x, y))
    return out


HIDDEN = {
    # the neck goes on up under the head (the head and hair cover it)
    'chest': R.spans('''
        21: 46-54
        22: 46-54
        23: 46-54
        24: 46-54
        25: 46-54
        26: 45-54
    ''')
    # the chest's near side under the near arm: the shoulder's slope and the side of the sports top
    | R.spans('''
        27: 44-45
        28: 43-46
        29: 43-47
        30: 43-47
        31: 43-48
        32: 43-48
        33: 44-46
        34: 44-45
        35: 44-45
        36: 44-45
        37: 44-45
    '''),
    # the belly under the sports top's band, for the chest rising as she breathes
    'pelvis': R.spans('''
        36: 47-60
        37: 47-60
        38: 47-60
        39: 47-60
    '''),
    # the thigh tops under the briefs (round the hip joint)
    'thighN': disc(JOINTS['hipN'], 5.5),
    'thighF': disc(JOINTS['hipF'], 4.5),
    # the far upper arm behind the chest: his far shoulder's round down to the sliver he shows
    'upperArmF': band(JOINTS['shoulderF'], JOINTS['elbowF'], 2.6, 1.9) | disc(JOINTS['shoulderF'], 2.8),
}
# Hidden pixels that take one colour of his instead of the nearest: the chest's near side under the
# arm is his shoulder's skin in shade down to the sports top, then the top's dark side (his pixels at
# the top's near edge, rows 33 and 37).
FILL = {
    'chest': [
        (R.spans('''
            27: 44-45
            28: 43-46
            29: 43-47
            30: 43-47
            31: 43-48
            32: 43-48
        '''), (47, 33)),
        (R.spans('''
            33: 44-46
            34: 44-45
            35: 44-45
            36: 44-45
            37: 44-45
        '''), (46, 37)),
    ],
}
# Joint caps: the lower piece carries the upper piece's pixels this far round the joint. A hand turns
# with its forearm, but turned they can still part by a pixel: its cap of the wrist closes that.
CAPS = {
    'forearmN': ('upperArmN', 'elbowN', 3.6),
    'forearmF': ('upperArmF', 'elbowF', 2.6),
    'handN': ('forearmN', 'wristN', 2.6),
    'handF': ('forearmF', 'wristF', 2.2),
    'shinN': ('thighN', 'kneeN', 4.0),
    'shinF': ('thighF', 'kneeF', 3.8),
    'footN': ('shinN', 'ankleN', 3.2),
    'footF': ('shinF', 'ankleF', 3.0),
}


def build():
    owned = {p: {q for q in REGIONS[p] if not BG[q[1], q[0]]} for p in REGIONS}
    for p, s in REGIONS.items():
        lost = [q for q in s if BG[q[1], q[0]]]
        assert not lost, f'{p}: page pixels in its region {lost[:5]}'
    # every pixel of his body below the head is in some piece
    body = {(x, y) for y in range(26, R.CELLS) for x in range(R.CELLS) if not BG[y, x]}
    every = set().union(*owned.values())
    missing = sorted(body - every)
    assert not missing, f'pixels of his in no piece: {missing[:12]}'

    # A hidden pixel stays hidden: it is kept only where a piece drawn after it (or the head, above the
    # neck's foot) covers it at idle.
    order = [p for _, ps in LAYERS for p in ps]
    head = {(x, y) for y in range(0, 26) for x in range(R.CELLS)}
    pieces = {}
    for p in REGIONS:
        later = set().union(head, *(owned.get(o, set()) for o in order[order.index(p) + 1:]))
        px = {q: IDX[q[1], q[0]] for q in owned[p]}
        kind = {q: 'his' for q in owned[p]}
        if p in CAPS:
            up, j, r = CAPS[p]
            for q in disc(JOINTS[j], r) & owned[up]:
                if q not in px:
                    px[q] = IDX[q[1], q[0]]
                    kind[q] = 'cap'
        hidden = HIDDEN.get(p, set()) & later
        mine = [q for q in owned[p] if not R.is_line(COLS[IDX[q[1], q[0]]])]
        for q in sorted(hidden):
            if q in px:
                continue
            # the colour FILL gives it, or the nearest pixel of his in this piece that is not his line
            src = next((c for area, c in FILL.get(p, []) if q in area), None)
            if src is None:
                src = min(mine, key=lambda m: ((m[0] - q[0]) ** 2 + (m[1] - q[1]) ** 2, m[1], m[0]))
            px[q] = IDX[src[1], src[0]]
            kind[q] = 'hidden'
        pieces[p] = (px, kind)
    if 'upperArmF' in pieces:
        # his far arm is in shadow: the hidden band is his far shadow, its back edge his deep shadow
        px, kind = pieces['upperArmF']
        shadow = IDX[47, 63]   # his far forearm's skin
        deep = IDX[41, 61]     # the sliver of far upper arm he shows
        for q in list(px):
            if kind[q] == 'hidden':
                px[q] = deep if (q[0] + 1, q[1]) not in px else shadow
    # The neck above its foot (the rows the head covers at idle) on its own: it turns toward the head, and
    # the neck's foot, where it meets his shoulders' line, stays on the chest.
    px, kind = pieces['chest']
    up = {q for q in px if q[1] < int(JOINTS['neck'][1])}
    pieces['neck'] = ({q: px[q] for q in up}, {q: kind[q] for q in up})
    pieces['chest'] = ({q: i for q, i in px.items() if q not in up}, {q: k for q, k in kind.items() if q not in up})
    # The wrists: a hand's cap on its own, stamped under his heroines' small hands (a weapon's grip,
    # pointing, open, cradling) so they too stay on the forearm.
    for side in 'NF':
        px, kind = pieces['hand' + side]
        pieces['wrist' + side] = ({q: i for q, i in px.items() if kind[q] == 'cap'}, {q: 'cap' for q, k in kind.items() if k == 'cap'})
    return owned, pieces


def seams(p, px, kind, owned):
    """Pixels of a piece on a cut: next to a pixel of his body that is not in the piece (hidden and cap
    pixels: next to anything not in the piece), and not his line."""
    out = set()
    for q, i in px.items():
        if R.is_line(COLS[i]):
            continue
        for d in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (q[0] + d[0], q[1] + d[1])
            if n in px:
                continue
            inside = 0 <= n[0] < R.CELLS and 0 <= n[1] < R.CELLS and not BG[n[1], n[0]]
            if kind[q] != 'his' or inside:
                out.add(q)
                break
    return out


def compose(pieces):
    """The pieces put together at idle, back to front: (100, 100) colour indices, -1 empty."""
    out = np.full((R.CELLS, R.CELLS), -1)
    for _, ps in LAYERS:
        for p in ps:
            for (x, y), i in pieces[p][0].items():
                out[y, x] = i
    return out


CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&()*+,-/:;<=>?@[]^_{|}~'


def straps(px):
    """The sports top's straps over his shoulders (its cloth above the bust, his rows 26-32), each with
    the colour of the nearest pixel of his shoulder's skin: under a top or armour the straps are taken off
    and his shoulder goes on there."""
    skin = [q for q, i in px.items() if not R.is_cloth(COLS[i]) and not R.is_line(COLS[i]) and q in REGIONS['chest']]
    out = {}
    for q, i in px.items():
        if q[1] <= 32 and R.is_cloth(COLS[i]):
            n = min(skin, key=lambda m: ((m[0] - q[0]) ** 2 + (m[1] - q[1]) ** 2, m[1], m[0]))
            out[q] = COLS[px[n]]
    return out


def ts_piece(name, p, px, kind):
    xs = [q[0] for q in px]
    ys = [q[1] for q in px]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    keys = {}
    strap = straps(px) if p == 'chest' else {}
    key = lambda q: (COLS[px[q]], kind[q] == 'cap', strap.get(q))
    for q in sorted(px, key=lambda q: (q[1], q[0])):
        if key(q) not in keys:
            keys[key(q)] = CHARS[len(keys)]
    rows = []
    for y in range(y0, y1 + 1):
        rows.append(''.join(keys[key((x, y))] if (x, y) in px else '.' for x in range(x0, x1 + 1)))
    j = BONES[p][0]
    jx, jy = JOINTS[j]
    pivot = (int(math.floor(jx)) - x0, int(math.floor(jy)) - y0)
    q = lambda s: "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"
    lines = [f'  {name}: {{', f'    pivot: [{pivot[0]}, {pivot[1]}],', f'    angle: {bone_angle(p):.2f},', '    rows: [']
    lines += [f'      {q(r)},' for r in rows]
    lines += ['    ],', '    colors: {']
    lines += [f'      {q(c)}: \'{h}\',' for (h, _, _), c in keys.items()]
    lines += ['    },']
    lines.append(f'    cloth: {q("".join(c for (h, _, _), c in keys.items() if R.is_cloth(h)))},')
    lines.append(f'    cap: {q("".join(c for (_, cap, _), c in keys.items() if cap))},')
    if strap:
        lines.append('    straps: {')
        lines += [f'      {q(c)}: \'{st}\',' for (_, _, st), c in keys.items() if st]
        lines.append('    },')
    lines.append('  },')
    return '\n'.join(lines)


def main():
    owned, pieces = build()
    # At idle the pieces put together are his picture, every pixel of his body below the head.
    comp = compose(pieces)
    head = {(x, y) for y in range(R.CELLS) for x in range(R.CELLS) if y <= 25 and (x, y) not in owned['chest']}
    bad = [(x, y) for y in range(R.CELLS) for x in range(R.CELLS)
           if (x, y) not in head and (comp[y, x] if comp[y, x] >= 0 else -1) != (IDX[y, x] if not BG[y, x] else -1)]
    assert not bad, f'the pieces at idle differ from his picture at {bad[:12]}'
    cuts = {p: seams(p, *pieces[p], owned) for p in pieces}

    if '--check' in sys.argv:
        d = sys.argv[sys.argv.index('--check') + 1]
        os.makedirs(d, exist_ok=True)
        img = np.zeros((R.CELLS, R.CELLS * 2, 4), np.uint8)
        for y in range(R.CELLS):
            for x in range(R.CELLS):
                if not BG[y, x]:
                    img[y, x] = list(R.hex_rgb(COLS[IDX[y, x]])) + [255]
                if comp[y, x] >= 0:
                    img[y, x + R.CELLS] = list(R.hex_rgb(COLS[comp[y, x]])) + [255]
        R.save(img, os.path.join(d, 'base-idle-check.png'), 6)
        tint = {'chest': (255, 80, 80), 'neck': (255, 160, 160), 'pelvis': (80, 160, 255), 'upperArmN': (80, 220, 80), 'forearmN': (220, 220, 60),
                'handN': (255, 140, 0), 'upperArmF': (160, 80, 255), 'forearmF': (0, 200, 200), 'handF': (255, 80, 200),
                'thighN': (120, 255, 160), 'shinN': (60, 120, 255), 'footN': (255, 200, 120), 'thighF': (200, 120, 60),
                'shinF': (120, 60, 200), 'footF': (60, 200, 120)}
        img = np.zeros((R.CELLS, R.CELLS, 4), np.uint8)
        for _, ps in LAYERS:
            for p in ps:
                px, kind = pieces[p]
                for (x, y), i in px.items():
                    c = np.array(tint[p])
                    if kind[(x, y)] != 'his':
                        c = c // 2
                    if (x, y) in cuts[p]:
                        c = np.array([255, 255, 255])
                    img[y, x] = list(c) + [255]
        R.save(img, os.path.join(d, 'base-pieces.png'), 8)

    out = ['// Generated by tools/refs/female-base-body-from-ref.py from the owner\'s bare female body',
           '// (docs/reference/female-base-owner-reference.jpg): rerun the script to change it.',
           '',
           "import type { PaintedPiece } from './painted';",
           '',
           '/**',
           ' * A piece of his body: his pixels round one bone. `cloth` are the characters of his sports top and',
           ' * briefs; `cap` the characters of its round cap over the joint above it (the upper piece\'s pixels);',
           ' * `straps` (the chest) the sports top\'s straps over the shoulders, with his shoulder\'s skin under them.',
           ' */',
           'export interface BasePiece extends PaintedPiece {',
           '  cloth: string;',
           '  cap: string;',
           '  straps?: Record<string, string>;',
           '}',
           '']
    skin = COLS[IDX[45, 52]]   # his belly's base skin
    cloth_count = {}
    for p in ('chest', 'pelvis'):
        for i in pieces[p][0].values():
            if R.is_cloth(COLS[i]):
                cloth_count[COLS[i]] = cloth_count.get(COLS[i], 0) + 1
    cloth = max(cloth_count, key=lambda h: (cloth_count[h], h))
    line = COLS[IDX[30, 39]]
    out += ['/** His base skin, the main grey of his sports top and briefs, and his line. */',
            f"export const FEMALE_BASE_SKIN = '{skin}';",
            f"export const FEMALE_BASE_CLOTH = '{cloth}';",
            f"export const FEMALE_BASE_LINE = '{line}';",
            '',
            '/** His joints at rest, fine pixels of our frame (his pixel (x, y) is our (x + 73, y + 120)). */',
            'export const FEMALE_BASE_JOINTS = {']
    for k, (x, y) in JOINTS.items():
        out.append(f'  {k}: [{x + R.OFFSET[0]}, {y + R.OFFSET[1]}],')
    out += ['} as const;', '',
            '/** His body piece by piece; each piece\'s pivot is the cell over its joint, `angle` its bone at rest. */',
            'export const FEMALE_BASE: Record<' + ' | '.join(f"'{p}'" for p in pieces) + ', BasePiece> = {']
    for p in pieces:
        out.append(ts_piece(p, p, *pieces[p]))
    out += ['};', '']
    open(OUT, 'w').write('\n'.join(out))
    print('wrote', os.path.relpath(OUT, R.REPO), 'colours', len(COLS))


if __name__ == '__main__':
    main()
