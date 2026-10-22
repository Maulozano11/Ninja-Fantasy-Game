"""Lyra's sword, lifted 1:1 from the owner's picture of her at our game's scale
(docs/reference/lyra-game-scale-owner-reference.jpg), as a painted weapon template.

His picture (1932 x 1932) is Lyra drawn by him at OUR sprite scale: one of his pixels (19.32 picture
pixels, phase 0, the grid of his Aiden) is one fine pixel of ours ("aqui tienes tus referencias
perfectas del modelo de mujer"). Laid on our 256 x 256 frame his pixel (x, y) is at (x + 74, y + 121)
(the same placement as her clothes and hair). Every pixel below is one of his, in his colour: the
median of the block's inside; medians a JPEG step apart (PAL_TOL) become the one he used most.

The sword hangs blade-down across her legs from her near fist: a steel pommel above the fist, a steel
knuckle bow sweeping round the outside of the fist down to a steel cross-guard with gold-tipped ends,
a gold collar and shell with a cyan gem in the middle of the cross, and a long slender blade glowing
cyan (dark teal, cyan and pale cyan in three lines, lighter toward the point) between his black lines,
cyan sparkles round it. What is his and what is filled:

  - POMMEL and CROSS (the cells listed below, row by row) and the blade are his pixels, his black
    line with them. The blade is every cyan pixel of his within BAND of the blade's line and the black
    beside it in the same row; the sparkles are his cyan pixels further out.
  - The grip his hand hides is filled with his pommel's steel: its dark core and light edges carried on
    along the grip's line under the fist.
  - Our female body's fist round a grip is his own near hand on this sword, cut 1:1
    (femaleBodyArt.ts FEMALE_HANDS grip), so the sword is his as he drew it, as long as his: no
    pixel is moved or repeated (STRETCH 0; the old body's bigger fist needed the grip three diagonals
    longer). With his Lyra's long arms (appearance `arms: 'long'`, src/sprite/rig.ts LONG_ARMS) our
    fist at idle stands where he drew his (HAND_SHIFT 0), so the sword does too.

The template is drawn at his blade's angle (the fitted line of his blade, which our idle holds it at:
grip.ts) and pivots on the cell our grip point (grip.ts gripPoint at our female idle with her long
arms) falls on once our fist is laid on his: his grip runs through the top of his fist, so that cell
is beside his grip, under the fist. At rest every pixel of the sword is his, held in our fist as in
his, where he drew it.

It writes, in <out>:

  his@8.png      his picture there (left), his sword pixels taken (middle), the template at rest (right)
  kinds@8.png    what each pixel is: blade glow (cyan), guard gold (orange), steel (grey), grip
                 filled (brown), his line (black), sparkles (white)

and, given a third argument, the game's module (src/sprite/items/lyraSwordArt.ts). The same picture
always gives the same bytes. Run from the repository root with python3 -I:

  python3 -I tools/refs/lyra-sword-from-ref.py docs/reference/lyra-game-scale-owner-reference.jpg <out> [src/sprite/items/lyraSwordArt.ts]
"""

import math
import os
import sys

import numpy as np
from PIL import Image

PITCH = 19.32
OFFSET = (74, 121)  # his pixel (x, y) is our (x + 74, y + 121)
INSET = 4           # picture pixels left out round each block (JPEG bleed)
PAL_TOL = 12        # medians this close (each channel) are one colour of his
BOX = (96, 150, 166, 216)  # our frame: x0, x1, y0, y1 (exclusive) round the sword

# Our female idle with his Lyra's long arms, frame 0 (src/sprite/grip.ts gripPoint, fine pixels; printed
# by tools/refs/heroine-idle.mts; on the owner's bare female body her forearms turn out to his Lyra's at
# rest, rig.ts LONG_ARMS restTurn, so her fist is where he drew it), and where our fist (his near hand, the body's grip template) stands
# there from where he drew his hand: the top left of the hand's cut, his (104, 176), is our (104, 176).
# The template pivots on GRIP_POINT - HAND_SHIFT.
GRIP_POINT = (105.82, 179.28)
HAND_SHIFT = (0, 0)

# His hilt, our frame at his place: row -> columns taken (every cell, his black line with it).
POMMEL = {  # the pommel and the top of the knuckle bow: stays where he drew it
    172: [100, 101, 102],
    173: [100, 101, 102, 103],
    174: [100, 101, 102, 103, 104],
    175: [102, 103, 104, 105],
    176: [101, 103, 104],
    177: [101, 102],
    178: [101, 102],
    179: [101, 102, 103],
    180: [102, 103, 104],
    181: [103, 104, 105],
    182: [104, 105, 106, 107],
    183: [106],
}
CROSS = {  # the cross-guard with its gold tips, the gold collar and shell, the gem, the blade's root
    176: [113, 114, 115],
    177: [111, 112, 113, 114, 115],
    178: [109, 110, 111, 112, 113, 114],
    179: [108, 109, 110, 111, 112, 113, 114],
    180: [106, 107, 108, 109, 110, 111, 112, 113, 114],
    181: [106, 107, 108, 109, 110, 111, 112, 113, 114],
    182: [108, 109, 110, 111, 112, 113, 114, 115],
    183: [107, 108, 109, 110, 111, 112, 113, 114, 115, 116],
    184: [105, 106, 107, 108, 109, 110, 111, 112, 113, 114],
    185: [105, 106, 107, 112, 113],
    186: [106],
}
# The grip under his hand, along the pommel's lines: (x, y) -> which of the pommel's pixels it takes.
GRIP = {
    (105, 177): (103, 175), (106, 178): (103, 175), (107, 179): (103, 175),  # dark core
    (105, 176): (104, 175), (106, 177): (104, 175), (107, 178): (104, 175), (108, 179): (104, 175),  # lit edge
    (105, 178): (101, 174), (106, 179): (101, 174),  # lower edge
}
BLADE_ROWS = (184, 212)
BAND = 2.6          # how far from the blade's line (pixels) his cyan is blade, not sparkle
# His two sparkles that touch the blade's edge (one above, one below it): sparkles, not blade.
EDGE_SPARKS = {(131, 196), (134, 205)}
CUT = 284           # cells with x + y >= CUT would move down the line
STRETCH = 0         # by this many diagonal steps: none, our fist is his
TIP_CUT = 326       # ... and from here on (mid-blade) they stay where he drew them: the blade loses the
                    # STRETCH diagonals before it, so its tip and sparkles end where his do

CHARS = 'abcdefhijklmnpqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'


def sample(path):
    """His pixels in BOX: medians of each block's inside, our frame coordinates -> rgb."""
    im = np.asarray(Image.open(path).convert('RGB')).astype(int)
    x0, x1, y0, y1 = BOX
    out = {}
    for y in range(y0, y1):
        for x in range(x0, x1):
            hx, hy = x - OFFSET[0], y - OFFSET[1]
            a = im[int(round(hy * PITCH + INSET)):int(round((hy + 1) * PITCH - INSET)),
                   int(round(hx * PITCH + INSET)):int(round((hx + 1) * PITCH - INSET))]
            out[(x, y)] = tuple(int(v) for v in np.median(a.reshape(-1, 3), axis=0))
    return out


def cyan(c):
    r, g, b = c
    return g - r > 20 and b - r > 20


def black(c):
    return max(c) < 40


def fit_line(cells):
    """Least squares line through cell centres: (point, unit direction)."""
    p = np.array([(x + 0.5, y + 0.5) for x, y in cells], float)
    m = p.mean(axis=0)
    u, s, vt = np.linalg.svd(p - m)
    d = vt[0] if vt[0][0] > 0 else -vt[0]
    return m, d


def dist(cell, line):
    m, d = line
    v = np.array([cell[0] + 0.5, cell[1] + 0.5]) - m
    return abs(v[0] * d[1] - v[1] * d[0])


def take(px):
    """Which of his pixels are the sword, by kind."""
    kind = {}
    for rows, k in ((POMMEL, 'pommel'), (CROSS, 'cross')):
        for y, xs in rows.items():
            for x in xs:
                kind[(x, y)] = k
    y0, y1 = BLADE_ROWS
    box = [(x, y) for y in range(y0, y1) for x in range(BOX[0], BOX[1]) if (x, y) not in kind]
    # The blade's line: fitted to his cyan near a first guess, then again to what that takes.
    line = (np.array([116.5, 186.5]), np.array([1, 1]) / math.sqrt(2))
    for band in (3.5, BAND):
        cells = [c for c in box if cyan(px[c]) and dist(c, line) <= band]
        line = fit_line(cells)
    near = set(c for c in box if cyan(px[c]) and dist(c, line) <= BAND and c not in EDGE_SPARKS)
    # Only the blade itself: the cyan touching the blade's root (8 ways); a sparkle on the band is not.
    blade, stack = set(), [min(near, key=lambda c: (c[1], c[0]))]
    while stack:
        c = stack.pop()
        if c in blade or c not in near:
            continue
        blade.add(c)
        stack += [(c[0] + dx, c[1] + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if dx or dy]
    for (x, y) in blade:
        kind[(x, y)] = 'blade'
    for (x, y) in list(blade):
        for nx in (x - 1, x + 1):
            if (nx, y) not in kind and black(px[(nx, y)]):
                kind[(nx, y)] = 'line'
    for c in box:
        if c not in kind and cyan(px[c]) and px[c][1] > 180:
            kind[c] = 'spark'
    return kind, line


def palette(px, cells):
    """His colours: medians within PAL_TOL become the one he used most (ties: the darker hex)."""
    count = {}
    for c in cells:
        count[px[c]] = count.get(px[c], 0) + 1
    chosen = []
    snap = {}
    for col in sorted(count, key=lambda c: (-count[c], c)):
        for ref in chosen:
            if max(abs(a - b) for a, b in zip(col, ref)) <= PAL_TOL:
                snap[col] = ref
                break
        else:
            chosen.append(col)
            snap[col] = col
    return snap


def build(px):
    kind, line = take(px)
    snap = palette(px, list(kind) + list(set(GRIP.values())))
    col = {c: snap[px[c]] for c in kind}
    for c, src in GRIP.items():
        col[c], kind[c] = snap[px[src]], 'grip'
    # Stretch the grip under the fist: past the cut, down the line; the two diagonals before it again.
    # From TIP_CUT on the blade is where he drew it again: the blade's STRETCH diagonals before it go
    # (his blade is the same three lines of glow there), so his tip and sparkles are his, where he drew
    # them; a sparkle beside the cut-out stretch stays with the blade above it.
    out, okind = {}, {}
    for (x, y), k in kind.items():
        s = x + y
        if s >= TIP_CUT and (k != 'spark' or s >= TIP_CUT + 2 * STRETCH):
            out[(x, y)], okind[(x, y)] = col[(x, y)], k
        elif s >= TIP_CUT - 2 * STRETCH and k != 'spark':
            continue
        elif s >= CUT:
            out[(x + STRETCH, y + STRETCH)], okind[(x + STRETCH, y + STRETCH)] = col[(x, y)], k
        else:
            out[(x, y)], okind[(x, y)] = col[(x, y)], k
    for (x, y), k in kind.items():
        if CUT - 2 <= x + y < CUT:
            for d in range(1, STRETCH + 1):
                c = (x + d, y + d)
                if c not in out:
                    out[c], okind[c] = col[(x, y)], k
    angle = math.degrees(math.atan2(line[1][1], line[1][0]))
    return kind, col, out, okind, angle


def is_gold(c):
    r, g, b = c
    return r > g > b and r - b > 60 and r > 140 or (r > 150 and g > 90 and b < 70)


def chars_for(out, okind):
    """One character per colour of his, in a fixed order; which are blade glow and guard gold."""
    cols = sorted(set(out.values()), key=lambda c: (sum(c), c))
    ch = {c: CHARS[i] for i, c in enumerate(cols)}
    glow = ''.join(ch[c] for c in cols if cyan(c))
    gold = ''.join(ch[c] for c in cols if not cyan(c) and is_gold(c))
    return ch, glow, gold


def hexs(c):
    return '#%02x%02x%02x' % c


def ts_module(out, okind, angle):
    ch, glow, gold = chars_for(out, okind)
    body = {c: v for c, v in out.items() if okind[c] != 'spark'}
    xs = [x for x, _ in out]
    ys = [y for _, y in out]
    x0, x1, y0, y1 = min(xs), max(xs) + 1, min(ys), max(ys) + 1
    rows = [''.join(ch[body[(x, y)]] if (x, y) in body else '.' for x in range(x0, x1)) for y in range(y0, y1)]
    sparks = sorted((x - x0, y - y0, ch[v]) for (x, y), v in out.items() if okind[(x, y)] == 'spark')
    px = int(math.floor(GRIP_POINT[0])) - HAND_SHIFT[0] - x0
    py = int(math.floor(GRIP_POINT[1])) - HAND_SHIFT[1] - y0
    assert any(rows[py + dy][px + dx] != '.' for dx in (-1, 0, 1) for dy in (-1, 0, 1)), 'the pivot must be on the grip'
    count = {}
    for c, v in body.items():
        count[v] = count.get(v, 0) + 1
    common = lambda pred: hexs(max((v for v in count if pred(v)), key=lambda v: (count[v], v)))
    glow_hex = common(cyan)
    gold_hex = common(lambda v: not cyan(v) and is_gold(v))
    used = sorted(set(out.values()), key=lambda c: (sum(c), c))
    L = [
        "// Lyra's sword, the owner's pixels from his picture of her at our game's scale",
        '// (tools/refs/lyra-sword-from-ref.py from docs/reference/lyra-game-scale-owner-reference.jpg).',
        '// Generated: rerun the script to change it.',
        '',
        "import type { PaintedPiece } from '../painted';",
        '',
        'export interface LyraSword extends PaintedPiece {',
        '  /** The characters of the glowing blade, its sparkles and the gem in the cross. */',
        '  blade: string;',
        '  /** The characters of the guard\'s gold: the collar, the shell and the cross\'s tips. */',
        '  guard: string;',
        '  /** The sparkles round the blade: [x, y, character] in the template\'s cells (not in rows). */',
        '  sparks: [number, number, string][];',
        '}',
        '',
        '/** His commonest blade cyan and guard gold: the colours the two colour slots turn his from. */',
        f"export const LYRA_SWORD_BLADE = '{glow_hex}';",
        f"export const LYRA_SWORD_GUARD = '{gold_hex}';",
        '',
        '/**',
        ' * The sword as he drew it in her near fist, hanging across the legs: drawn at his blade\'s angle and',
        ' * pivoting on the grip under our fist, which is his hand. At rest every pixel is his, held as he',
        ' * held it, where our fist stands.',
        ' */',
        'export const LYRA_RAPIER: LyraSword = {',
        f'  pivot: [{px}, {py}],',
        f'  angle: {angle:.2f},',
        '  rows: [',
    ]
    L += [f"    '{r}'," for r in rows]
    L += ['  ],', '  colors: {']
    L += [f"    {ch[c]}: '{hexs(c)}'," for c in used]
    L += ['  },', f"  blade: '{glow}',", f"  guard: '{gold}',", '  sparks: [']
    L += [f"    [{x}, {y}, '{c}']," for x, y, c in sparks]
    L += ['  ],', '};', '']
    return '\n'.join(L)


def image(cells, k=8, pad=(BOX[0], BOX[1] + 4, BOX[2], BOX[3] + 4)):
    x0, x1, y0, y1 = pad
    a = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    for yy in range(y1 - y0):
        for xx in range(x1 - x0):
            a[yy, xx] = (205, 205, 210, 255) if (xx + yy) % 2 else (228, 228, 232, 255)
    for (x, y), c in cells.items():
        if x0 <= x < x1 and y0 <= y < y1:
            a[y - y0, x - x0, :3] = c
    img = Image.fromarray(a, 'RGBA')
    return img.resize((img.width * k, img.height * k), Image.NEAREST)


def side_by_side(imgs, path):
    gap = 16
    W = sum(i.width for i in imgs) + gap * (len(imgs) - 1)
    out = Image.new('RGBA', (W, max(i.height for i in imgs)), (60, 60, 70, 255))
    x = 0
    for i in imgs:
        out.paste(i, (x, 0))
        x += i.width + gap
    tmp = path + '.tmp.png'
    out.save(tmp)
    os.replace(tmp, path)


def main():
    src, outdir = sys.argv[1], sys.argv[2]
    os.makedirs(outdir, exist_ok=True)
    px = sample(src)
    kind, col, out, okind, angle = build(px)
    everything = {c: v for c, v in px.items() if min(v) < 235}
    side_by_side([image(everything), image({c: col[c] for c in kind if c not in GRIP}), image(out)], os.path.join(outdir, 'his@8.png'))
    kinds = {}
    for c, k in okind.items():
        v = out[c]
        if k == 'spark':
            kinds[c] = (255, 255, 255)
        elif k == 'grip':
            kinds[c] = (140, 90, 50)
        elif black(v):
            kinds[c] = (0, 0, 0)
        elif cyan(v):
            kinds[c] = (60, 220, 230)
        elif is_gold(v):
            kinds[c] = (240, 150, 40)
        else:
            kinds[c] = (150, 150, 160)
    side_by_side([image(kinds)], os.path.join(outdir, 'kinds@8.png'))
    print(f'angle {angle:.2f}, {len(out)} cells, {len(set(out.values()))} colours')
    if len(sys.argv) > 3:
        text = ts_module(out, okind, angle)
        tmp = sys.argv[3] + '.tmp'
        with open(tmp, 'w') as f:
            f.write(text)
        os.replace(tmp, sys.argv[3])


if __name__ == '__main__':
    main()
