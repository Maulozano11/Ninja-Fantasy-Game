"""Lyra below the waist, from the owner's picture of her at our game scale: her skirt, tabard and belt.

His picture docs/reference/lyra-game-scale-owner-reference.jpg (1932x1932, "tus referencias perfectas
del modelo de mujer") is drawn at our sprite scale: one of his pixels (19.32 picture pixels, the grid
starting at the picture's corner) is one fine pixel of ours. So these pieces are his pixels one for
one, as Aiden's were, not reduced from her big picture (docs/reference/lyra-owner-reference.jpg only
helps to read what his pixels show). Every colour is his: the median of each of his pixels, his JPEG's
near-equal shades of one colour merged into the commonest of them (the same reading as
lyra-hair-from-ref.py, so the pieces share its colours). Four pieces:

  SKIRT   (bottom_striped_pleats) his charcoal knife pleats with the red stripe in the folds, the red
          hem and his line under it. What his tabard and the belt's flap hide (the near side under
          the near panel, the top under the flap) is his pleats run on: a hidden pixel takes the
          skirt pixel one pleat further on (PLEAT columns), and the near side gets his line.
  FRONT   (skirt_gilded_tabard, over the skirt and the near leg) the near panel from the belt to its
          pointed hem: his cream, the gold and red band down its front edge, the red and gold hem;
          and the far panel's top down the far hip. His sword's hilt and his hand lie over the near
          panel under the belt: that stretch is his cream run on, from his outer line (continued
          from where it shows above and below the hilt) to his front band; his blade's top end is
          cream too, closed by his inner line.
  BACK    (skirt_gilded_tabard, behind the legs) the tabard's grey-brown lining seen between the
          legs and beside them, its hem line, and the far tail with its cream, gold and red edge.
          His boots, thighs, cuffs and blade lie over it: each hidden pixel takes the nearest pixel
          of his lining in its row (his stripes run on), and his hem line runs on under the boots.
  BELT    (waist_pouch_belt) his dark leather belts slung across the hips with the steel buckle
          on the near side, the small gold-edged flap under them at the front, and the red pouch
          with its steel cap at the far hip.

Placing: his pixel (x, y) goes to (x + 74, y + 121) of our 256 x 256 frame at the female idle frame 0,
where her blouse, corset and boots are (lyra-upper-from-ref.py, lyra-boots-from-ref.py) and where her
hair and face are with her long neck (src/sprite/neck.ts): his belt under his corset, his tabard's
hems over his boots. Our hips are wider than his on the far side (our far leg stands further out), so
his far side (his columns FAR_FROM and on) goes FAR_SHIFT pixels further right, and the skirt's pleat
before FAR_FROM is repeated to fill the gap. src/sprite/items/lyraLower.ts
carries the pieces onto any body and pose (drape()).

Writes, in <out>: pieces@8.png (his crop beside the four pieces, at 8x) and, with a second argument,
the game's module (src/sprite/items/lyraLowerArt.ts). The same picture always gives the same bytes.
From the repo root:

  python3 -I tools/refs/lyra-lower-from-ref.py <out> [src/sprite/items/lyraLowerArt.ts]
"""

import os
import sys
from collections import Counter

import numpy as np
from PIL import Image

REF = 'docs/reference/lyra-game-scale-owner-reference.jpg'
PITCH = 19.32
PHASE = (-0.14, 0.05)
N = 100
MERGE = 10
OFFSET = (74, 121)
# His columns from FAR_FROM on go FAR_SHIFT further right (our far hip is wider than his).
FAR_FROM, FAR_SHIFT = 59, 0
# A pleat of his skirt, in columns: the run-on of a hidden pleat, and the pleat repeated at FAR_FROM.
PLEAT = 6
# A fold of his lining, in columns (between his legs: dark, light, dark): the run-on of its hidden folds.
FOLD = 7

# His black line (every colour used is checked to be one of his).
LINE = (1, 1, 1)


def native():
    """His pixels: the median of each pixel's interior, as an (N, N, 3) int array."""
    a = np.asarray(Image.open(REF).convert('RGB')).astype(np.int32)
    out = np.zeros((N, N, 3), np.int32)
    for j in range(N):
        for i in range(N):
            x0 = int(round(PHASE[0] + i * PITCH))
            y0 = int(round(PHASE[1] + j * PITCH))
            b = a[max(y0 + 4, 0):y0 + 15, max(x0 + 4, 0):x0 + 15].reshape(-1, 3)
            out[j, i] = np.median(b, axis=0)
    return out


def palette(nat):
    """Each of his pixels as one of his colours (None for the white around her)."""
    count = Counter(tuple(int(v) for v in p) for p in nat.reshape(-1, 3))
    reps = []
    for k, n in count.most_common():
        if min(k) > 235:
            continue
        for r in reps:
            if max(abs(a - b) for a, b in zip(k, r)) <= MERGE:
                break
        else:
            reps.append(k)
    col = {}
    for y in range(N):
        for x in range(N):
            p = tuple(int(v) for v in nat[y, x])
            col[x, y] = None if min(p) > 235 else min(reps, key=lambda r: sum(abs(a - b) for a, b in zip(p, r)))
    return col, reps


hexs = lambda c: '#%02x%02x%02x' % c
luma = lambda c: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


# His colours by what they are on her (hex as palette() reads them).
CREAM = {'#f3e3c2', '#cbad8d', '#9d7e6a', '#c49d79'}
TRIM_RED = {'#73182d', '#681d24', '#821c32', '#902132', '#bb4d32', '#b65054', '#9e2739'}
GOLD = {'#da9a42', '#cc8e3b', '#b3752d', '#a4682c', '#fdcc5e', '#fdcc69', '#e2a545', '#c0853d'}
LINING = {'#7e5d54', '#ac8e71'}
SKIRT_CLOTH = {'#454350', '#282834', '#2b313f'}
SKIRT_RED = {'#902132', '#821c32', '#3b1023', '#5a1723', '#4e1524'}
LEATHER = {'#301f25', '#5b3e3b', '#4d3635', '#674a47', '#40302f', '#cbad8d'}
STEEL = {'#8f929c', '#939aa9', '#2b313f', '#9e9fa1'}
POUCH = {'#73182d', '#821c32', '#3b1023'}

# --- the pieces' outlines in his pixels (x, y), inclusive -----------------------------------------
# SKIRT: rows 52-63, from our near hip (his near side is under his tabard) to his far edge.
SKIRT_ROWS = {52: (43, 60), 53: (43, 60), 54: (43, 60), 55: (43, 60), 56: (43, 63), 57: (43, 63),
              58: (43, 64), 59: (43, 64), 60: (43, 65), 61: (43, 65), 62: (43, 65), 63: (43, 61)}
# Hidden in the skirt rows: the near panel (to its front line, FRONT_EDGE) and the belt's flap.
FLAP = {(55, 51), (56, 51), (57, 51), (58, 51), (54, 51), (59, 51), (55, 52), (56, 52), (57, 52), (58, 52)}
# His thigh below the skirt's near hem (row 62-63) is not the skirt.
SKIRT_NOT = {(45, 62), (44, 63), (45, 63), (46, 63), (47, 63), (48, 63), (49, 63), (62, 63)}

# FRONT, near panel: per row its outer line (hidden rows: run on from where it shows) and its front
# line (his).
NEAR_OUT = {51: 43, 52: 42, 53: 41, 54: 40, 55: 39, 56: 38, 57: 37, 58: 36, 59: 35, 60: 34, 61: 33,
            62: 32, 63: 31, 64: 31, 65: 32, 66: 31, 67: 30, 68: 29, 69: 28, 70: 27, 71: 26, 72: 25,
            73: 24, 74: 24, 75: 23, 76: 23, 77: 23, 78: 23, 79: 24, 80: 24, 81: 25, 82: 25, 83: 26,
            84: 27, 85: 28, 86: 30}
FRONT_EDGE = {51: 54, 52: 53, 53: 52, 54: 52, 55: 48, 56: 48, 57: 47, 58: 47, 59: 46, 60: 45, 61: 45,
              62: 44, 63: 43, 64: 41, 65: 40, 66: 41, 67: 40, 68: 39, 69: 38, 70: 38, 71: 37, 72: 36,
              73: 36, 74: 35, 75: 35, 76: 34, 77: 34, 78: 34, 79: 33, 80: 33, 81: 33, 82: 32, 83: 32,
              84: 32, 85: 32, 86: 32}
# Where his own pixels of the panel start in the rows his hilt and hand cover (left of it: run on).
NEAR_HIS_FROM = {55: 43, 56: 42, 57: 41, 58: 41, 59: 41, 60: 41, 61: 42, 62: 43, 63: 44, 64: 34}
# His blade's top end over the panel (row 64): cream, closed by his inner line.
NEAR_BLADE = {(38, 64), (39, 64), (40, 64)}
# FRONT, far panel's top down the far hip: his pixels.
FAR_TOP = {51: (59, 63), 52: (60, 63), 53: (60, 64), 54: (60, 64), 55: (61, 66), 56: (63, 65),
           57: (63, 65), 58: (64, 66), 59: (64, 66), 60: (64, 66), 61: (65, 67), 62: (65, 67)}
FAR_TOP_FIX = {(65, 60): '#f3e3c2', (66, 60): '#010101', (64, 60): '#010101'}

# BACK: rows 60-85, from a little inside the near panel to the far tail's outer line.
FAR_OUT = {60: 67, 61: 67, 62: 67, 63: 67, 64: 68, 65: 68, 66: 68, 67: 69, 68: 69, 69: 70, 70: 70,
           71: 70, 72: 71, 73: 71, 74: 72, 75: 72, 76: 72, 77: 72, 78: 73, 79: 73, 80: 73, 81: 73,
           82: 73, 83: 73, 84: 72, 85: 71}
# The far tail's cream edge starts here (left of it, the lining): his pixels from it to FAR_OUT.
FAR_EDGE = {60: 65, 61: 65, 62: 65, 63: 65, 64: 66, 65: 66, 66: 66, 67: 67, 68: 67, 69: 68, 70: 68,
            71: 68, 72: 68, 73: 69, 74: 69, 75: 69, 76: 69, 77: 69, 78: 70, 79: 70, 80: 70, 81: 70,
            82: 70, 83: 70, 84: 70, 85: 70}
# The lining's hem line, per column: its row (the lining runs down to the row above).
HEM = {}
for x in range(30, 36):
    HEM[x] = 79
for x in range(36, 39):
    HEM[x] = 80
for x in range(39, 50):
    HEM[x] = 81
for x in range(50, 56):
    HEM[x] = 80
for x in range(56, 65):
    HEM[x] = 79
for x in range(65, 68):
    HEM[x] = 80
HEM[68] = 81
HEM[69] = 82

# BELT: his belts across the hips, the pouch at the far hip, the flap under them.
BELT_ROWS = {46: (46, 63), 47: (45, 63), 48: (45, 63), 49: (44, 62), 50: (44, 62), 51: (43, 53)}
POUCH_ROWS = {47: (63, 66), 48: (62, 67), 49: (62, 67), 50: (62, 67), 51: (63, 66), 52: (63, 67)}
# his long hair's wine reds over the belt's near end are not the belt
HAIR = {'#681d24', '#3b1023', '#73182d'}


def lift():
    col, reps = palette(native())
    his = lambda x, y: col.get((x, y))
    H = lambda x, y: hexs(col[x, y]) if col.get((x, y)) else None

    # FRONT: near panel
    front = {}
    for y in range(51, 87):
        a, b = NEAR_OUT[y], FRONT_EDGE[y]
        start = NEAR_HIS_FROM.get(y, a)
        for x in range(a, b + 1):
            if x == a:
                front[x, y] = LINE
            elif x < start or (x, y) in NEAR_BLADE:
                # run on: his outer line, two pixels of his shade, then his cream
                front[x, y] = rgb('#cbad8d') if x - a <= 2 else rgb('#f3e3c2')
            elif his(x, y) is not None:
                front[x, y] = his(x, y)
        if y == 64:
            front[41, 64] = LINE
    # at row 51 only his line along the belt and the front band's top
    for x in range(NEAR_OUT[51], FRONT_EDGE[51] + 1):
        front[x, 51] = his(x, 51)
    # the far panel's top
    for y, (a, b) in FAR_TOP.items():
        for x in range(a, b + 1):
            c = H(x, y)
            if c is None:
                continue
            if c in CREAM | TRIM_RED | GOLD or c == '#010101':
                front[x, y] = col[x, y]
    for (x, y), c in FAR_TOP_FIX.items():
        front[x, y] = rgb(c)

    # SKIRT
    skirt = {}
    hidden = set()
    for y, (a, b) in SKIRT_ROWS.items():
        for x in range(a, b + 1):
            if (x, y) in SKIRT_NOT:
                continue
            c = H(x, y)
            under_panel = y in FRONT_EDGE and x <= FRONT_EDGE[y]
            if under_panel or (x, y) in FLAP or c is None or not (c in SKIRT_CLOTH | SKIRT_RED or c == '#010101'):
                hidden.add((x, y))
            else:
                skirt[x, y] = col[x, y]
    for (x, y) in sorted(hidden, key=lambda p: (-p[0], p[1])):
        q = x + PLEAT
        while q <= 66 and (q, y) not in skirt:
            q += PLEAT
        if (q, y) in skirt:
            skirt[x, y] = skirt[q, y]
    for y in SKIRT_ROWS:
        skirt[SKIRT_ROWS[y][0], y] = LINE
    # the near side's hem: his line under it, as at his hem; and his belt's lower line closes its top
    for x in range(43, 50):
        skirt[x, 63] = LINE
    for x in range(43, 61):
        skirt[x, 51] = LINE

    # BACK
    back = {}
    for y in range(60, 86):
        a = FRONT_EDGE[y] - 3 if y in FRONT_EDGE else 40
        for x in range(a, FAR_OUT[y] + 1):
            if x < FAR_EDGE[y] and x in HEM and y > HEM[x]:
                continue
            if x < FAR_EDGE[y] and x not in HEM:
                continue
            c = H(x, y)
            if x >= FAR_EDGE[y]:
                # the far tail's edge (his far hand over its top is not it)
                if c is not None and (c in CREAM | TRIM_RED | GOLD | LINING or col[x, y] == LINE):
                    back[x, y] = col[x, y]
                continue
            if y == HEM.get(x) or x == a:
                back[x, y] = LINE
            elif c in LINING:
                back[x, y] = col[x, y]
            else:
                back[x, y] = None
    lining = {p for p, c in back.items() if c is not None and hexs(c) in LINING}
    for (x, y) in sorted(back):
        if back[x, y] is not None:
            continue
        # his lining a fold further on (FOLD columns) in its row, nearest first; else his nearest
        best = None
        for d in range(FOLD, 40, FOLD):
            for q in (x + d, x - d):
                if (q, y) in lining:
                    best = back[q, y]
                    break
            if best:
                break
        for d in range(1, 30):
            if best:
                break
            for q in (x - d, x + d):
                if (q, y) in lining:
                    best = back[q, y]
                    break
        if best is None:
            for d in range(1, 30):
                if (x, y + d) in lining:
                    best = back[x, y + d]
                    break
        back[x, y] = best or rgb('#7e5d54')

    # BELT
    belt = {}
    for y, (a, b) in BELT_ROWS.items():
        for x in range(a, b + 1):
            c = H(x, y)
            if c is None or (x < 47 and c in HAIR):
                continue
            if y == 51 and x > 51:
                continue
            belt[x, y] = col[x, y]
    for y, (a, b) in POUCH_ROWS.items():
        for x in range(a, b + 1):
            if H(x, y) is not None:
                belt[x, y] = col[x, y]
    for (x, y) in FLAP:
        if H(x, y) is not None:
            belt[x, y] = col[x, y]
    return col, {'SKIRT': skirt, 'FRONT': front, 'BACK': back, 'BELT': belt}


def place(piece, name):
    """His pixels moved into our frame; his far side FAR_SHIFT further right, the skirt's pleat
    before FAR_FROM repeated into the gap (the other pieces stretch their pixel before it)."""
    out = {}
    for (x, y), c in piece.items():
        dx = OFFSET[0] + (FAR_SHIFT if x >= FAR_FROM else 0)
        out[x + dx, y + OFFSET[1]] = c
    for (x, y), c in piece.items():
        if x != FAR_FROM - 1:
            continue
        for k in range(1, FAR_SHIFT + 1):
            src = (x - PLEAT + ((k - 1) % PLEAT) + 1, y) if name == 'SKIRT' else (x, y)
            if src in piece:
                out[x + k + OFFSET[0], y + OFFSET[1]] = piece[src]
    return out


def main():
    col, pieces = lift()
    placed = {k: place(v, k) for k, v in pieces.items()}
    for k, p in placed.items():
        for c in p.values():
            assert c in col.values(), f'{k}: {c} is not one of his colours'
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    preview(col, placed, os.path.join(out, 'pieces@8.png'))
    if len(sys.argv) > 2:
        tmp = sys.argv[2] + '.tmp'
        with open(tmp, 'w', newline='\n') as f:
            f.write(module(placed))
        os.replace(tmp, sys.argv[2])
    print({k: len(v) for k, v in placed.items()}, len({c for p in placed.values() for c in p.values()}), 'colours')


# Each item's colour slots: the colours of his each one moves (his line never), and the one it
# starts from (picking it keeps every pixel his).
ROLES = {
    'SKIRT': [('CLOTH', SKIRT_CLOTH, '#454350'), ('STRIPES', SKIRT_RED, '#902132')],
    'TABARD': [('CLOTH', CREAM | LINING, '#f3e3c2'), ('TRIM', TRIM_RED, '#821c32'), ('GOLD', GOLD, '#da9a42')],
    'BELT': [('LEATHER', LEATHER, '#5b3e3b'), ('STEEL', STEEL, '#8f929c'), ('POUCH', POUCH, '#73182d'), ('GOLD', GOLD, '#da9a42')],
}
# His darkest brown, a line where it edges his tabard: kept, like his black.
DARK_LINE = {'#301f25'}
ITEM_OF = {'SKIRT': 'SKIRT', 'FRONT': 'TABARD', 'BACK': 'TABARD', 'BELT': 'BELT'}
CHARS = 'kabcdefghijlmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
DOCS = {
    'SKIRT': 'The skirt (bottom_striped_pleats, torso.bottom): his pleats, stripes and hem.',
    'FRONT': "The tabard's near panel and the far panel's top (skirt_gilded_tabard, over the skirt and the near leg).",
    'BACK': "The tabard's lining and far tail (skirt_gilded_tabard, backGear: behind the legs).",
    'BELT': 'The belts, the flap and the pouch (waist_pouch_belt, waist).',
}


def module(placed):
    used = sorted({c for p in placed.values() for c in p.values()}, key=lambda c: (luma(c), c))
    assert len(used) <= len(CHARS)
    used.remove(LINE)
    used.insert(0, LINE)
    ch = {c: CHARS[i] for i, c in enumerate(used)}
    lines = [
        "// Lyra's skirt, tabard and belt: the owner's picture of her at our game scale, his pixels one for one",
        '// (tools/refs/lyra-lower-from-ref.py from docs/reference/lyra-game-scale-owner-reference.jpg). Each',
        '// piece sits in our 256 x 256 frame on the female body at idle frame 0; lyraLower.ts carries it onto',
        '// the rig. Generated: rerun the script to change it.',
        '',
        "import type { DrapedPiece } from './lyraLower';",
        '',
        '/** One character per colour of his (all the pieces share them). */',
        'export const LYRA_LOWER_COLORS: Record<string, string> = {',
    ]
    lines += [f"  {ch[c] if ch[c].isalpha() else repr(ch[c])}: '{hexs(c)}'," for c in used]
    lines += ['};', '']
    for name, p in placed.items():
        xs = [x for x, _ in p]
        ys = [y for _, y in p]
        x0, y0 = min(xs), min(ys)
        rows = [''.join(ch[p[x, y]] if (x, y) in p else '.' for x in range(x0, max(xs) + 1)) for y in range(y0, max(ys) + 1)]
        lines += [f'/** {DOCS[name]} */', f'export const LYRA_{name}: DrapedPiece = {{', f'  x: {x0},', f'  y: {y0},', '  rows: [']
        lines += [f"    '{r}'," for r in rows]
        lines += ['  ],', '  colors: LYRA_LOWER_COLORS,', '};', '']
    lines.append('/** The characters each colour slot moves, and the colour of his it starts from. */')
    for item, roles in ROLES.items():
        mine = {c for name, p in placed.items() if ITEM_OF[name] == item for c in p.values()} - {LINE} - {rgb(h) for h in DARK_LINE}
        seen = set()
        for role, hexes, base in roles:
            cs = sorted((c for c in mine if hexs(c) in hexes and c not in seen), key=lambda c: ch[c])
            seen |= set(cs)
            assert rgb(base) in mine, f'{item} {role}: {base} is not in it'
            lines.append(f"export const LYRA_{item}_{role} = '{''.join(ch[c] for c in cs)}';")
            lines.append(f"export const LYRA_{item}_{role}_BASE = '{base}';")
        assert mine <= seen, f'{item}: {[hexs(c) for c in mine - seen]} move with no slot'
    return '\n'.join(lines) + '\n'


def preview(col, placed, path):
    """His crop beside the pieces on our frame (BACK, SKIRT, FRONT, BELT drawn in that order), 8x."""
    x0, y0, x1, y1 = 18, 42, 78, 98
    W, Hh = x1 - x0, y1 - y0
    im = np.full((Hh, 2 * W + 2, 3), 226, np.uint8)
    for y in range(y0, y1):
        for x in range(x0, x1):
            c = col[x, y]
            im[y - y0, x - x0] = c if c is not None else (255, 255, 255)
    for name in ('BACK', 'SKIRT', 'FRONT', 'BELT'):
        for (x, y), c in placed[name].items():
            X, Y = x - OFFSET[0] - x0 + W + 2, y - OFFSET[1] - y0
            if 0 <= Y < Hh and W + 2 <= X < 2 * W + 2:
                im[Y, X] = c
    Image.fromarray(im).resize((im.shape[1] * 8, im.shape[0] * 8), Image.NEAREST).save(path)


if __name__ == '__main__':
    main()
