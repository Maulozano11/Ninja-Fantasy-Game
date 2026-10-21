"""The princess's hair and tiara, from the owner's picture of her (docs/reference/princess-owner-reference.jpg),
as a hairstyle (hair_rose_dawn) and a separate tiara (acc_rose_tiara).

His picture is drawn at our game's scale (tools/refs/princess_ref.py: one of his pixels is one fine pixel of
our sprite), so every pixel is lifted one for one, as Aiden's and Lyra's hair were. His colours are his
palette's (princess_ref.quantize: the cluster centres of his figure); the tiara's red gem is too small to
have made a cluster, so its reds are his own medians, near-equal ones merged.

The hair is five pieces (his pixel (x, y) at our female idle frame 0 goes to (x + 74, y + 122), his near
eye's lashes on ours, as princess_ref.PART_OFFSET['hair_front']):

  HEAD    over the head (hairFront), on our face anchor: the crown, the bangs, the lock beside the near
          cheek down to the jaw, the hair beside and behind the ear, the ear itself (drawn in the
          player's skin) and the long lock down the far side of the face to the far shoulder. Not his
          face (forehead between the bangs, eyes, cheeks, jaw): ours shows there. The crown under his
          tiara is hidden: it is filled by running each of his strands below it on up, under a dome
          that carries his line on from both sides (the left top at row 6, the right side's diagonal).
  BARE    the row under the tiara band where its shadow falls on the hair (his darks): without the tiara
          those pixels take the strands run up instead (hairFront, drawn over HEAD).
  BACK    behind the head (hairBack), on the face anchor: his face's place filled with his strands run
          down (it shows only where our face does not cover his), and the dark hair seen behind the
          neck between the chin and the far lock, carried left behind the neck.
  LONG    behind the body (hairBack), hung from our neck and turned with the torso: the long wavy mass
          down the near side to the waist with its curled tip. What the shoulder, the puffed sleeve and
          the body hide (to the right of the mass, down to the curl's foot) is filled with his mass
          itself carried on to the right (a hidden pixel takes his pixel PERIOD to the left in its row),
          with his black line at its foot and its back edge.
  STRAND  the near lock's lower end, over the near shoulder and down the chest to the bust (hairFront,
          behind the near arm), hung from our neck and turned with the torso.

The tiara (head.gear, on the face anchor): his gold tiara with its red gem, its line, and the white light.
Its golds follow the gold colour, its reds and the gem's pink light the gem colour (his line and white stay).

Writes, in <out>: pieces@8.png (his crop, the hair pieces and the tiara laid out as in his picture, Spanish
labels) and, with a second argument, the game's module (src/sprite/items/princessHairArt.ts). The same picture
always gives the same bytes. From the repository root:

  python3 -I tools/refs/princess-hair-from-ref.py <out> [src/sprite/items/princessHairArt.ts]
"""

import os
import re
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw, ImageFont  # noqa: E402

import princess_ref as P  # noqa: E402

FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

# His near eye's lash start (49, 18) lands on our near eye's top lash row (one over our face anchor, body.ts
# faceAnchor (ex, ny), which is the lash row under it): the cell (49, 19) is each face piece's pivot. That is
# princess_ref.PART_OFFSET['hair_front'] (74, 122) at our female idle frame 0.
FACE_PIVOT = (49, 19)
# His eyes: the near lash starts at column 49, the far one at 57 (row 18; tools/refs/princess-eyes-from-ref.py
# EX, FX), 8 apart as on her own face shape ('noble', body.ts faceAnchor fx = nx + 8), so on her face the far
# side stays where he drew it; on our standard faces (9 apart) it moves out one column.
EYES_APART = 8
# Where the far side of the face pieces moves out (or in) when our eyes are further apart (or closer) than
# his: from his row 13 down (the forehead between the bangs), his columns from 56 on (past the nose).
FAR_FROM, FAR_COL = 13, 56

# The tiara, rows and columns (inclusive) of its pixels and its line.
TIARA_ROWS = {2: [(55, 55)], 3: [(54, 56)], 4: [(53, 56)], 5: [(50, 58)], 6: [(49, 59)], 7: [(49, 59)], 8: [(47, 59)],
              9: [(46, 50), (59, 59)], 10: [(46, 47)], 11: [(45, 46)], 12: [(45, 45)]}
# The gem's pink light (its reds are found by colour).
GEM_LIGHT = [(55, 6)]
# The crown under the tiara: the row of his hair's top line in each column (his own at 44-49, carried on
# under the tiara as a dome down the right side's diagonal to his (59, 9)). Below it is hair.
DOME_TOP = {44: 7, 45: 7, 46: 6, 47: 6, 48: 6, 49: 6, 50: 5, 51: 5, 52: 5, 53: 5, 54: 5, 55: 5, 56: 6, 57: 7, 58: 8, 59: 9}
# The tiara band's shadow on his hair (under the band, and under its left end).
SHADOW = [(x, 9) for x in range(51, 59)] + [(48, 10), (49, 10), (50, 10), (47, 11), (46, 12)]

# His face (forehead between the bangs, eyes, cheeks, jaw and chin with their line), inclusive.
FACE = {13: (56, 56), 14: (56, 57), 15: (55, 58), 16: (54, 57), 17: (52, 58), 18: (49, 58), 19: (48, 58), 20: (48, 58),
        21: (48, 58), 22: (48, 58), 23: (48, 58), 24: (49, 58), 25: (49, 57), 26: (49, 56), 27: (53, 55)}
EAR = [(44, 20), (44, 21)]
# HEAD: his rows 6-33, the columns of each (inclusive) where his hair is (the face is then taken out): all of
# the head to row 25, then the near lock to the neck and the far lock to the far shoulder.
HEAD_ROWS = {y: [(30, 66)] for y in range(6, 26)}
HEAD_ROWS.update({26: [(43, 48), (59, 63)], 27: [(43, 48), (59, 63)], 28: [(59, 62)], 29: [(59, 62)], 30: [(59, 63)],
                  31: [(60, 63)], 32: [(61, 63)], 33: [(61, 63)]})
# BACK: his dark hair behind the neck (between the chin, the collar and the far lock), and where it is
# carried on behind the neck (rows 24-29, columns 48-58), his three dark columns repeated.
NECK_DARK = [(57, 26), (58, 26), (56, 27), (57, 27), (58, 27), (56, 28), (57, 28), (58, 28), (58, 29)]
NECK_FILL = {y: (48, 58) for y in range(24, 30)}
# LONG: his rows 18-50, the columns of each (inclusive) of the mass left of the ear, the near shoulder and
# the puffed sleeve (their line is not hair).
LONG_ROWS = {18: [(39, 43)], 19: [(38, 43)], 20: [(38, 43)], 21: [(37, 43)], 22: [(36, 43)], 23: [(34, 43)], 24: [(32, 43)],
             25: [(31, 43)], 26: [(30, 43)], 27: [(29, 43)], 28: [(29, 44)], 29: [(29, 42)], 30: [(29, 41)], 31: [(30, 40)],
             32: [(31, 38)], 33: [(30, 38)], 34: [(28, 38)], 35: [(27, 37)], 36: [(26, 36)], 37: [(25, 35)], 38: [(25, 35)],
             39: [(25, 35)], 40: [(25, 36)], 41: [(26, 37)], 42: [(27, 36)], 43: [(28, 35)], 44: [(29, 34)],
             45: [(25, 25), (28, 32)], 46: [(25, 31)], 47: [(25, 30)], 48: [(26, 30)], 49: [(27, 30)], 50: [(30, 30)]}
# The hidden mass: from row 26, from the right of his mass to column 56 (behind the neck, the shoulder, the
# sleeve and the back). Its foot takes his line: row 50 under his own at (30, 50), rising a row every
# FOOT_STEP columns toward the back (the inner strands fall shorter than the outer curl), as does its back
# edge (column 56).
LONG_FILL = (26, 50, 56)
FOOT_STEP = 6
PERIOD = 7
# STRAND: his rows 28-40 (inclusive columns), the near lock's lower end with its line.
STRAND_ROWS = {28: (44, 48), 29: (46, 49), 30: (46, 50), 31: (47, 50), 32: (47, 50), 33: (47, 50), 34: (46, 50), 35: (46, 49),
               36: (46, 49), 37: (47, 50), 38: (48, 50), 39: (48, 50), 40: (48, 49)}

CHARS = 'kabcdefghijlmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'


def spans(rows):
    return {(x, y) for y, ss in rows.items() for a, b in (ss if isinstance(ss, list) else [ss]) for x in range(a, b + 1)}


def lift():
    N = P.native()
    fig = P.figure()
    fam = P.family(N)
    Q = P.quantize(N)
    is_line = fam == P.FAMILIES.index('line')
    col = lambda x, y: tuple(int(v) for v in Q[y, x])
    line = col(*next((x, y) for y in range(100) for x in range(100) if fig[y, x] and is_line[y, x]))

    tiara_mask = {p for p in spans(TIARA_ROWS) if fig[p[1], p[0]]}
    face = spans(FACE)
    hair_ok = lambda x, y: fig[y, x] and (x, y) not in tiara_mask and (x, y) not in face

    def run_up(x, y, skip=()):
        """The colour of the first of his hair pixels under (x, y) in its column (not his line)."""
        for q in range(y + 1, y + 20):
            if hair_ok(x, q) and not is_line[q, x] and (x, q) not in skip and (x, q) not in EAR:
                return col(x, q)
        return None

    # HEAD: his hair in its rows, not his face, the tiara's place filled under the dome.
    head = {}
    for (x, y) in sorted(spans(HEAD_ROWS), key=lambda p: (p[1], p[0])):
        if (x, y) in face or not fig[y, x]:
            continue
        if (x, y) in tiara_mask:
            continue
        head[x, y] = col(x, y)
    for (x, y) in sorted(tiara_mask, key=lambda p: (p[1], p[0])):
        top = DOME_TOP.get(x)
        if top is None or y < top:
            continue
        head[x, y] = line if y == top else run_up(x, y, SHADOW)
    # the dome's top line where the tiara's band covers it but the mask does not reach (none today; kept
    # so a different mask cannot leave the crown open)
    for x, top in DOME_TOP.items():
        if (x, top) not in head and (x, top) in tiara_mask:
            head[x, top] = line
    bare = {p: run_up(*p, SHADOW) for p in SHADOW}
    ear = {p: head[p] for p in EAR}

    # BACK: his face's place filled by running the strands above it down; the chin and below take the dark
    # behind the neck.
    back = {}
    for (x, y) in sorted(face, key=lambda p: (p[1], p[0])):
        if y >= 24:
            continue
        src = next((head[x, q] for q in range(y - 1, 4, -1) if (x, q) in head and (x, q) not in EAR and head[x, q] != line), None)
        if src is not None:
            back[x, y] = src
    dark = {p: col(*p) for p in NECK_DARK}
    for p in NECK_DARK:
        back[p] = dark[p]
    for (x, y) in spans(NECK_FILL):
        if (x, y) in back or (x, y) in head:
            continue
        yy = min(max(y, 27), 28)
        xx = 56 + (x - 56) % 3
        back[x, y] = dark[(xx, yy)]

    # LONG: his mass, then the hidden mass carried on to the right of it.
    long_ = {}
    for (x, y) in spans(LONG_ROWS):
        if fig[y, x]:
            long_[x, y] = col(x, y)
    y0, y1, right = LONG_FILL
    foot = lambda x: y1 - max(0, x - 31) // FOOT_STEP
    for y in range(y0, y1 + 1):
        xs = {x for (x, yy) in long_ if yy == y}
        if not xs:
            continue
        for x in range(max(xs) + 1, right + 1):
            if (x, y) in long_ or y > foot(x):
                continue
            if y == foot(x) or x == right:
                long_[x, y] = line
                continue
            src = None
            for k in range(1, 8):
                q = x - k * PERIOD
                if q in xs and not is_line[y, q]:
                    src = col(q, y)
                    break
            if src is None:
                src = next((long_[x, q] for q in range(y - 1, y0 - 12, -1) if (x, q) in long_ and long_[x, q] != line), None)
            if src is not None:
                long_[x, y] = src
    strand = {p: col(*p) for p in spans(STRAND_ROWS) if fig[p[1], p[0]]}

    # The tiara: his pixels; the gem's reds are his medians (merged within 12), not the palette's.
    tiara = {}
    reds = {}
    for (x, y) in tiara_mask:
        r, g, b = (int(v) for v in N[y, x])
        if r - g > 80 and not is_line[y, x]:
            reds[x, y] = (r, g, b)
        else:
            tiara[x, y] = col(x, y)
    merged = []
    for c in sorted(set(reds.values()), key=lambda c: (P.luma(np.array(c)), c)):
        for m in merged:
            if max(abs(a - b) for a, b in zip(c, m[0])) <= 12:
                m.append(c)
                break
        else:
            merged.append([c])
    rep = {}
    for m in merged:
        mid = tuple(int(v) for v in np.round(np.median(np.array(m), axis=0)))
        for c in m:
            rep[c] = mid
    for p, c in reds.items():
        tiara[p] = rep[c]
    gem = {tiara[p] for p in reds} | {tiara[p] for p in GEM_LIGHT}
    lines = {col(x, y) for y in range(100) for x in range(100) if fig[y, x] and is_line[y, x]}
    return dict(N=N, line=line, lines=lines, head=head, bare=bare, ear=ear, back=back, long=long_, strand=strand, tiara=tiara, gem=gem,
                reds=set(reds), tiara_line={tiara[p] for p in tiara_mask if is_line[p[1], p[0]]})


# Our female rig at idle frame 0 (princess_ref.OUR_JOINTS): his cell under our neck (floor of the joint)
# is the long pieces' pivot, and they turn with the torso (neck to pelvis).
OFF = (74, 122)
NECK = tuple(int(np.floor(v)) - o for v, o in zip(P.OUR_JOINTS['neck'], OFF))
TORSO_ANGLE = round(float(np.degrees(np.arctan2(P.OUR_JOINTS['pelvis'][1] - P.OUR_JOINTS['neck'][1],
                                                P.OUR_JOINTS['pelvis'][0] - P.OUR_JOINTS['neck'][0]))), 1)


def rows_of(p, ch, pivot):
    xs = [x for x, _ in p]
    ys = [y for _, y in p]
    x0, y0 = min(xs), min(ys)
    rows = [''.join(ch[p[x, y]] if (x, y) in p else '.' for x in range(x0, max(xs) + 1)) for y in range(y0, max(ys) + 1)]
    return x0, y0, rows, (pivot[0] - x0, pivot[1] - y0)


def hexs(c):
    return '#%02x%02x%02x' % tuple(c)


def font(size, bold=False):
    try:
        return ImageFont.truetype(BOLD if bold else FONT, size)
    except OSError:
        return ImageFont.load_default()


def preview(L, path):
    """His crop beside the pieces as they lie in his picture, and each piece alone, at 8x, Spanish labels."""
    x0, y0, x1, y1 = 22, 0, 68, 52
    W, H = x1 - x0, y1 - y0
    k = 8
    N = L['N']
    fig = P.figure()

    def canvas(pixels):
        im = np.full((H, W, 3), 236, np.uint8)
        for (x, y), c in pixels.items():
            if x0 <= x < x1 and y0 <= y < y1:
                im[y - y0, x - x0] = c
        return Image.fromarray(im).resize((W * k, H * k), Image.NEAREST)

    his = {(x, y): tuple(int(v) for v in N[y, x]) for y in range(y0, y1) for x in range(x0, x1) if fig[y, x]}
    together = {}
    for name in ('long', 'back', 'strand', 'head'):
        together.update(L[name])
    together.update(L['tiara'])
    bare = {}
    for name in ('long', 'back', 'strand', 'head'):
        bare.update(L[name])
    bare.update(L['bare'])
    panels = [
        ('Tu dibujo', 'tus píxeles', canvas(his)),
        ('Pelo + tiara', 'como en tu dibujo', canvas(together)),
        ('Pelo sin tiara', 'la coronilla rellenada', canvas(bare)),
    ]
    parts = [
        ('Cabeza', 'delante, sobre la cara', canvas(L['head'])),
        ('Detrás de la cabeza', 'relleno, tras la cara y el cuello', canvas(L['back'])),
        ('Melena larga', 'detrás del cuerpo, gira con el torso', canvas(L['long'])),
        ('Mechón delantero', 'sobre el hombro y el pecho', canvas(L['strand'])),
        ('Tiara', 'accesorio aparte', canvas(L['tiara'])),
    ]
    pad, top = 16, 62
    pw = W * k
    rows = [panels, parts[:3], parts[3:]]
    width = pad + 3 * (pw + pad)
    height = sum(top + H * k + pad for _ in rows) + 10
    out = Image.new('RGB', (width, height), (248, 246, 240))
    d = ImageDraw.Draw(out)
    y = 8
    for row in rows:
        x = pad
        for title, sub, im in row:
            d.text((x, y), title, fill=(30, 25, 35), font=font(24, True))
            d.text((x, y + 30), sub, fill=(80, 70, 90), font=font(16))
            out.paste(im, (x, y + top))
            x += pw + pad
        y += top + H * k + pad
    out.save(path)


def module(L):
    key = lambda k: k if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', k) else "'" + k + "'"
    hair_pieces = ('head', 'bare', 'back', 'long', 'strand')
    used = sorted({c for n in hair_pieces for c in L[n].values()}, key=lambda c: (float(P.luma(np.array(c))), c))
    used = [c for c in used if c in L['lines']] + [c for c in used if c not in L['lines']]
    assert len(used) <= len(CHARS)
    ch = {c: CHARS[i] for i, c in enumerate(used)}
    ear = {ch[c]: (3 if P.luma(np.array(c)) > 190 else 2 if P.luma(np.array(c)) > 140 else 1) for c in sorted(set(L['ear'].values()))}
    common = Counter(c for n in ('head', 'long', 'strand') for c in L[n].values() if c not in L['lines'] and c not in set(L['ear'].values()))
    base = common.most_common(1)[0][0]
    tused = sorted(set(L['tiara'].values()), key=lambda c: (float(P.luma(np.array(c))), c))
    tch = {c: CHARS[i] for i, c in enumerate(tused)}
    gold = [c for c in tused if c not in L['gem'] and c not in L['tiara_line'] and min(c) < 240]
    tcommon = Counter(c for p, c in L['tiara'].items() if c in gold).most_common(1)[0][0]
    gcommon = Counter(c for p, c in L['tiara'].items() if p in L['reds']).most_common(1)[0][0]

    out = [
        "// The princess's hair and tiara, the owner's picture at our game scale, his pixels (tools/refs/",
        '// princess-hair-from-ref.py from docs/reference/princess-owner-reference.jpg). Generated: rerun the script to change it.',
        '',
        "import type { PaintedPiece } from '../painted';",
        '',
        '/** A piece riding the face anchor: `pivot` is the cell on it (body.ts faceAnchor (ex, ny)). */',
        'export interface PrincessFacePart {',
        '  pivot: [number, number];',
        '  rows: string[];',
        '  colors: Record<string, string>;',
        '}',
        '',
        '/** One character per colour of his (all the hair pieces share them). */',
        'export const PRINCESS_HAIR_COLORS: Record<string, string> = {',
    ]
    out += [f"  {key(ch[c])}: '{hexs(c)}'," for c in used]
    out += ['};', '']
    docs = {
        'head': ('PRINCESS_HAIR_HEAD', 'Over the head (hairFront): the crown (filled under the tiara), the bangs, the near lock to the jaw, the hair by the ear, her ear and the far lock to the shoulder.', 'face'),
        'bare': ('PRINCESS_HAIR_BARE', "Without the tiara, over HEAD: the row under the tiara's band without its shadow.", 'face'),
        'back': ('PRINCESS_HAIR_BACK', 'Behind the head (hairBack): his face filled with his strands, and the dark hair behind the neck.', 'face'),
        'long': ('PRINCESS_HAIR_LONG', 'Behind the body (hairBack): the long wavy mass, its hidden part carried on. Pivot on our neck; it turns with the torso.', 'neck'),
        'strand': ('PRINCESS_HAIR_STRAND', 'The near lock over the shoulder and down the chest (hairFront, behind the near arm). Pivot on our neck; it turns with the torso.', 'neck'),
    }
    for name in hair_pieces:
        const, doc, anchor = docs[name]
        pivot = FACE_PIVOT if anchor == 'face' else NECK
        x0, y0, rows, pv = rows_of(L[name], ch, pivot)
        kind = 'PaintedPiece' if anchor == 'neck' else 'PrincessFacePart'
        out += [f'/** {doc} */', f'export const {const}: {kind} = {{', f'  pivot: [{pv[0]}, {pv[1]}],']
        if anchor == 'neck':
            out.append(f'  angle: {TORSO_ANGLE},')
        out.append('  rows: [')
        out += [f"    '{r}'," for r in rows]
        out += ['  ],', '  colors: PRINCESS_HAIR_COLORS,', '};', '']
    out += [
        '/** His line: kept as he drew it when the hair is recoloured. */',
        f"export const PRINCESS_HAIR_LINE = '{''.join(ch[c] for c in used if c in L['lines'])}';",
        "/** Her ear (in HEAD), in our skin ramp's shades. */",
        'export const PRINCESS_HAIR_EAR: Record<string, number> = { ' + ', '.join(f'{key(k)}: {v}' for k, v in ear.items()) + ' };',
        "/** The hair colour slot's default: his commonest pink. */",
        f"export const PRINCESS_HAIR_BASE = '{hexs(base)}';",
        '/** His eyes are this far apart (lash start to lash start); where ours are not, the far side of the face pieces follows our far eye. */',
        f'export const PRINCESS_EYES_APART = {EYES_APART};',
        "/** A face piece's pixels this many rows from its pivot on down, this many columns right of it on, are its far side. */",
        f'export const PRINCESS_FAR_FROM = {FAR_FROM - FACE_PIVOT[1]};',
        f'export const PRINCESS_FAR_COL = {FAR_COL - FACE_PIVOT[0]};',
        '',
        '/** One character per colour of the tiara. */',
        'export const PRINCESS_TIARA_COLORS: Record<string, string> = {',
    ]
    out += [f"  {key(tch[c])}: '{hexs(c)}'," for c in tused]
    out += ['};', '']
    x0, y0, rows, pv = rows_of(L['tiara'], tch, FACE_PIVOT)
    out += ['/** The tiara (head.gear), on the face anchor as HEAD. */', 'export const PRINCESS_TIARA: PrincessFacePart = {', f'  pivot: [{pv[0]}, {pv[1]}],', '  rows: [']
    out += [f"    '{r}'," for r in rows]
    out += ['  ],', '  colors: PRINCESS_TIARA_COLORS,', '};', '']
    out += [
        "/** The gem's reds and its pink light (they follow the gem colour); his line and white stay; the rest is gold. */",
        f"export const PRINCESS_TIARA_GEM = '{''.join(tch[c] for c in tused if c in L['gem'])}';",
        f"export const PRINCESS_TIARA_FIXED = '{''.join(tch[c] for c in tused if c in L['tiara_line'] or min(c) >= 240)}';",
        "/** The colour slots' defaults: his commonest gold and his gem's red. */",
        f"export const PRINCESS_TIARA_GOLD = '{hexs(tcommon)}';",
        f"export const PRINCESS_TIARA_RED = '{hexs(gcommon)}';",
        '',
    ]
    return '\n'.join(out)


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    L = lift()
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    preview(L, os.path.join(out, 'pieces@8.png'))
    if len(sys.argv) > 2:
        tmp = sys.argv[2] + '.tmp'
        with open(tmp, 'w') as f:
            f.write(module(L))
        os.replace(tmp, sys.argv[2])
    print({k: len(L[k]) for k in ('head', 'bare', 'back', 'long', 'strand', 'tiara')}, 'neck pivot', NECK, 'angle', TORSO_ANGLE)


if __name__ == '__main__':
    main()
