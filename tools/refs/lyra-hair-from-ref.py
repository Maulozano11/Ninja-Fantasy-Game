"""Lyra's hair, from the owner's picture of her at our game scale, as a hairstyle.

His picture docs/reference/lyra-game-scale-owner-reference.jpg (1932x1932, "tus referencias perfectas
del modelo de mujer") is drawn at our sprite scale: one of his pixels (19.32 picture pixels, the grid
starting at the picture's corner) is one fine pixel of ours, and she is 92 of them tall, as ours is.
So her hair is lifted pixel for pixel, as Aiden's was (valiant-hair-from-ref.py), not reduced from
her big picture. Every colour is his (the median of each of his pixels, his JPEG's near-equal shades
of one colour merged into the commonest of them). Three pieces, each a set of his pixels:

  HEAD   over the head (hairFront): the crown, the fringe swept over the brow, the far lock beside the
         cheek with its loose curl tip, the hair over the back of the head and down past the ear, the
         gold pin (a ring on a stick) and the small black bow at the back of the head, and her ear
         (drawn in the player's skin). Not his face: forehead, brows, eyes, cheek and jaw are ours.
  LONG   behind the body (hairBack): her wavy hair to the waist, the lit outer lock with its curled
         tip (its lit auburns, which the head does not have, are hair too: is_auburn), and the hair
         seen between her arm and her body. What his shoulder, scarf, blouse and
         sleeve hide is filled by running each of his strands on down (a hidden pixel takes the
         colour of the nearest hair pixel above it); the filled mass gets his dark line on its outer
         side and at its foot.
  BRAID  over the near shoulder onto the chest (hairFront, behind the near arm): the dark braid from
         behind the ear to the neckline. Where the pauldron strap and the neckline cross it, it runs
         on, with his line down its sides.

Placing: his pixel (x, y) goes to (x + 72, y + 123) of our 256 x 256 frame at the female idle frame 0:
his near eye's lash start lands on our face anchor (body.ts faceAnchor, the near eye's lash start, at
(123, 141)), and his neck and near shoulder land on ours. Our face is wider than his between the eyes
(our far eye's lash is 9 pixels from the near one, his 6), so the far side of his head (his columns 56
and on) goes 2 pixels further right and his crown's column 55 is repeated twice to close the gap: his
far lock then sits beside our far eye as it sits beside his. Each piece rides our face anchor; LONG and
BRAID also turn with the torso (their angle is our idle torso's). The colour slots: his mid auburn
moves every auburn of his (his line stays), the bow's greys follow the ribbon colour and the pin's
golds the ornament colour.

Her own face (face shape 'fine', lyra-face-from-ref.py) is his, as narrow as he drew it: over it the
head goes in unmoved, HEAD_FINE, every pixel where he drew it. With her long neck (src/sprite/neck.ts,
which carries the head two pixels higher and two further forward) the face anchor is at (125, 139) at
idle, so all three pieces land on his picture laid at (x + 74, y + 121), where her clothes are. On his
row 27 the slim neck leaves his hair under the jaw showing, past column 48 and one pixel past the
neck's far side: LONG takes it (LONG_NAPE, LONG_PAST_NECK).

Writes, in <out>: pieces@8.png (the three pieces on his crop, side by side, at 8x) and with a second
argument the game's module (src/sprite/items/lyraHairArt.ts). The same picture always gives the same
bytes. From the repo root:

  python3 -I tools/refs/lyra-hair-from-ref.py <out> [src/sprite/items/lyraHairArt.ts]
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
# His pixel (x, y) is our (x + 72, y + 123); his columns from FAR_FROM on go FAR_SHIFT further right.
OFFSET = (72, 123)
FAR_FROM, FAR_SHIFT = 56, 2
# Our face anchor and our torso's angle (pelvis to neck, screen degrees) at the female idle frame 0.
ANCHOR = (123, 141)
TORSO_ANGLE = -89.5
# Two of his colours within this (per channel) are one colour (his JPEG's shades of it).
MERGE = 10
LINE_LUMA = 22

# HEAD: his rows 6-26. Columns of each row taken (inclusive), and his face in it (forehead, brows,
# eyes, cheek, jaw; ours shows there), also inclusive.
HEAD_ROWS = {y: (40, 63) for y in range(6, 13)}
HEAD_ROWS.update({y: (36, 63) for y in range(13, 24)})
HEAD_ROWS.update({24: (35, 49), 25: (35, 49), 26: (38, 50)})
FACE = {13: (54, 57), 14: (53, 58), 15: (53, 58), 16: (52, 58), 17: (51, 58), 18: (51, 58), 19: (51, 58),
        20: (50, 58), 21: (49, 58), 22: (49, 58), 23: (50, 59)}
EAR = [(46, 19), (47, 19), (46, 20)]
# LONG: his rows 20-51, the columns of each (inclusive). Right of 48 is behind our torso.
LONG_ROWS = {20: 36, 21: 36, 22: 36, 23: 36, 24: 35, 25: 34, 26: 33, 27: 32, 28: 32, 29: 32, 30: 31, 31: 30,
             32: 29, 33: 28, 34: 28, 35: 28, 36: 28, 37: 28, 38: 29, 39: 30, 40: 30, 41: 26, 42: 26, 43: 27,
             44: 28, 45: 31, 46: 31, 47: 33, 48: 35, 49: 37, 50: 38, 51: 39}
LONG_RIGHT = 48
# ... but on his row 27, under the jaw, his hair shows past column 48 up to his slim neck, and one
# pixel of it past the neck's far side (the long neck, src/sprite/neck.ts, leaves them showing).
LONG_NAPE = {27: 50}
LONG_PAST_NECK = {(55, 27)}
# BRAID: his rows 28-39, the columns of each (inclusive).
BRAID_ROWS = {28: (46, 51), 29: (47, 51), 30: (47, 52), 31: (47, 52), 32: (46, 51), 33: (50, 52), 34: (50, 53),
              35: (50, 53), 36: (50, 53), 37: (50, 53), 38: (50, 53), 39: (51, 52)}

CHARS = 'kabcdefghijlmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'


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
    return col


luma = lambda c: 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
is_line = lambda c: c is not None and luma(c) < LINE_LUMA
is_grey = lambda c: c is not None and not is_line(c) and abs(c[0] - c[1]) < 25 and abs(c[1] - c[2]) < 25 and c[2] >= c[0] - 5
is_auburn = lambda c: c is not None and luma(c) < 130 and c[0] > 2 * c[1] and c[1] >= c[2]
is_gold = lambda c: c is not None and c[0] > 150 and c[1] > 100 and c[2] < 100 and c[1] / c[0] > 0.55


def lift():
    col = palette(native())
    # HEAD: his pixels in its rows, not his face, not the white around her.
    head = {}
    for y, (a, b) in HEAD_ROWS.items():
        fa, fb = FACE.get(y, (99, -1))
        for x in range(a, b + 1):
            if col[x, y] is not None and not fa <= x <= fb:
                head[x, y] = col[x, y]
    hair = {c for p, c in head.items() if p not in EAR and not is_line(c) and not is_grey(c) and not is_gold(c)}
    # ... and the auburns only the long hair has: the lit outer lock over her near shoulder (dark,
    # red well over green, not the scarf's crimson nor the skin's or the blouse's light tones).
    hair |= {c for y, a in LONG_ROWS.items() for x in range(a, LONG_RIGHT + 1) if is_auburn(c := col[x, y])}

    def run_down(piece, region, keep):
        """His pixels of the region that `keep` keeps; the rest of the region (but the white around
        her) his strands run on into: each takes the nearest hair colour above it, else to its left."""
        filled = set()
        for (x, y) in sorted(region, key=lambda p: (p[1], p[0])):
            c = col[x, y]
            if c is None:
                continue
            if keep(x, y, c):
                piece[x, y] = c
                continue
            src = next((piece[x, q] for q in range(y - 1, y - 40, -1) if (x, q) in piece and not is_line(piece[x, q])), None)
            if src is None:
                src = next((piece[q, y] for q in range(x - 1, x - 40, -1) if (q, y) in piece and not is_line(piece[q, y])), None)
            if src is None:
                continue
            piece[x, y] = src
            filled.add((x, y))
        return filled

    def touches_cloth(x, y):
        return any(col.get(q) is not None and col[q] not in hair and not is_line(col[q]) for q in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))

    # LONG: his hair and the line between and round his strands (not the line round his sleeve).
    long_ = {}
    region = {(x, y) for y, a in LONG_ROWS.items() for x in range(a, LONG_NAPE.get(y, LONG_RIGHT) + 1)} | LONG_PAST_NECK
    filled = run_down(long_, region, lambda x, y, c: c in hair or (is_line(c) and not touches_cloth(x, y)))
    line = next(c for c in head.values() if is_line(c))
    for (x, y) in sorted(filled):
        if (x - 1, y) not in long_ or (x, y + 1) not in long_:
            long_[x, y] = line
    # BRAID: his hair in its rows; where the strap and the neckline cross it, it runs on, his line
    # down its sides and at its tip.
    braid = {}
    region = {(x, y) for y, (a, b) in BRAID_ROWS.items() for x in range(a, b + 1)}
    filled = run_down(braid, region, lambda x, y, c: c in hair or is_line(c))
    for (x, y) in filled:
        a, b = BRAID_ROWS[y]
        if x in (a, b) or y == max(BRAID_ROWS):
            braid[x, y] = line
    return col, head, long_, braid, hair


def place(piece, stretch=False):
    """His pixels moved into our frame (the far side of the head stretched onto ours)."""
    out = {}
    for (x, y), c in piece.items():
        dx = OFFSET[0] + (FAR_SHIFT if stretch and x >= FAR_FROM else 0)
        out[x + dx, y + OFFSET[1]] = c
        if stretch and x == FAR_FROM - 1:
            for k in range(1, FAR_SHIFT + 1):
                out[x + k + OFFSET[0], y + OFFSET[1]] = c
    return out


def main():
    col, head, long_, braid, hair = lift()
    ear = {head[p] for p in EAR}
    H, L, B = place(head, True), place(long_), place(braid)
    HF = place(head)
    used = sorted({c for p in (H, HF, L, B) for c in p.values()}, key=lambda c: (luma(c), c))
    assert len(used) <= len(CHARS)
    line = [c for c in used if is_line(c)]
    used = line + [c for c in used if c not in line]
    ch = {c: CHARS[i] for i, c in enumerate(used)}
    hexs = lambda c: '#%02x%02x%02x' % c
    gold = [c for c in used if is_gold(c) and c not in ear]
    grey = [c for c in used if is_grey(c)]
    common = lambda cs, piece: Counter(c for c in piece.values() if c in cs).most_common(1)[0][0]
    meta = {
        'colors': {ch[c]: hexs(c) for c in used},
        'line': ''.join(ch[c] for c in line),
        'bow': ''.join(ch[c] for c in grey),
        'pin': ''.join(ch[c] for c in gold),
        # her ear in our skin ramp's shades (body.ts: 1 dark, 2 shade, 3 base, 4 light)
        'ear': {ch[c]: (3 if luma(c) > 190 else 2 if luma(c) > 140 else 1) for c in sorted(ear)},
        'base': {'hair': hexs(common(hair, head)), 'ribbon': hexs(common(set(grey), head)), 'ornament': hexs(common(set(gold), head))},
        'pieces': {name: rows_of(p, ch) for name, p in (('HEAD', H), ('HEAD_FINE', HF), ('LONG', L), ('BRAID', B))},
    }
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    preview(col, (H, L, B), os.path.join(out, 'pieces@8.png'))
    if len(sys.argv) > 2:
        tmp = sys.argv[2] + '.tmp'
        with open(tmp, 'w') as f:
            f.write(module(meta))
        os.replace(tmp, sys.argv[2])
    print({k: len(v) for k, v in (('HEAD', H), ('LONG', L), ('BRAID', B))}, len(used), 'colours')


def rows_of(p, ch):
    xs = [x for x, _ in p]
    ys = [y for _, y in p]
    x0, y0 = min(xs), min(ys)
    rows = [''.join(ch[p[x, y]] if (x, y) in p else '.' for x in range(x0, max(xs) + 1)) for y in range(y0, max(ys) + 1)]
    return x0, y0, rows


def preview(col, pieces, path):
    """His crop beside the three pieces (LONG, HEAD, BRAID drawn in that order), at 8x."""
    x0, y0, x1, y1 = 24, 3, 66, 55
    W, Hh = x1 - x0, y1 - y0
    im = np.full((Hh, 2 * W + 2, 3), 226, np.uint8)
    for y in range(y0, y1):
        for x in range(x0, x1):
            c = col[x, y]
            im[y - y0, x - x0] = c if c is not None else (255, 255, 255)
    H, L, B = pieces
    for p in (L, H, B):
        for (x, y), c in p.items():
            X, Y = x - OFFSET[0] - x0 + W + 2, y - OFFSET[1] - y0
            if 0 <= Y < Hh and W + 2 <= X < 2 * W + 2:
                im[Y, X] = c
    Image.fromarray(im).resize((im.shape[1] * 8, im.shape[0] * 8), Image.NEAREST).save(path)


def module(meta):
    import re

    key = lambda k: k if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', k) else "'" + k + "'"
    out = [
        "// Lyra's hair, the owner's picture of her at our game scale, his pixels (tools/refs/lyra-hair-from-ref.py",
        '// from docs/reference/lyra-game-scale-owner-reference.jpg). Generated: rerun the script to change it.',
        '',
        "import type { PaintedPiece } from '../painted';",
        "import type { PaintedPart } from './capeArt';",
        '',
        '/** One character per colour of his (all the pieces share them). */',
        'export const LYRA_HAIR_COLORS: Record<string, string> = {',
    ]
    out += [f"  {key(k)}: '{v}'," for k, v in meta['colors'].items()]
    out += ['};', '']
    docs = {
        'HEAD': ('LYRA_HAIR_HEAD', 'Over the head (hairFront): crown, fringe, far lock, the back of the head, the pin, the bow and her ear. Its pivot is the cell on our face anchor.', None),
        'HEAD_FINE': ('LYRA_HAIR_HEAD_FINE', "The same over her own face (face shape 'fine', lyraFaceArt.ts): his pixels where he drew them, the far side not moved out.", None),
        'LONG': ('LYRA_HAIR_LONG', "Behind the body (hairBack): her wavy hair to the waist. Pivot on our face anchor; it turns with the torso (angle: our idle torso's).", TORSO_ANGLE),
        'BRAID': ('LYRA_HAIR_BRAID', 'Over the near shoulder onto the chest (hairFront, behind the near arm): her braid. Pivot on our face anchor; it turns with the torso.', TORSO_ANGLE),
    }
    for part, (name, doc, angle) in docs.items():
        x0, y0, rows = meta['pieces'][part]
        kind = 'PaintedPiece' if angle is not None else 'PaintedPart'
        out += [f'/** {doc} */', f'export const {name}: {kind} = {{', f'  pivot: [{ANCHOR[0] - x0}, {ANCHOR[1] - y0}],']
        if angle is not None:
            out.append(f'  angle: {angle},')
        out.append('  rows: [')
        out += [f"    '{r}'," for r in rows]
        out += ['  ],', '  colors: LYRA_HAIR_COLORS,', '};', '']
    out += [
        '/** His dark line: kept as he drew it when the hair is recoloured. */',
        f"export const LYRA_HAIR_LINE = '{meta['line']}';",
        '/** The bow (its greys follow the ribbon colour) and the pin (its golds follow the ornament colour). */',
        f"export const LYRA_HAIR_BOW = '{meta['bow']}';",
        f"export const LYRA_HAIR_PIN = '{meta['pin']}';",
        "/** Her ear, in our skin ramp's shades. */",
        'export const LYRA_HAIR_EAR: Record<string, number> = { ' + ', '.join(f'{key(k)}: {v}' for k, v in meta['ear'].items()) + ' };',
        "/** The colour slots' defaults: his mid auburn, the bow's grey, the pin's gold. */",
        f"export const LYRA_HAIR_BASE = '{meta['base']['hair']}';",
        f"export const LYRA_RIBBON_BASE = '{meta['base']['ribbon']}';",
        f"export const LYRA_PIN_BASE = '{meta['base']['ornament']}';",
        '',
    ]
    return '\n'.join(out)


if __name__ == '__main__':
    main()
