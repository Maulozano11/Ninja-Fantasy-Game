"""The broad man's far hand when seated: the owner's open hand, palm up, from his Roman sit picture
(docs/reference/roman-sit-owner-reference.jpg, "Cuadro 1" to "Cuadro 4"), one hand per frame of the sit loop
(src/sprite/items/broadSitPalmArt.ts).

The owner on the broad man seated on the normal male body: "aqui todo esta bien menos en sentado se ve muy
buggeado su mano extendida necesitamos pulirla creo que en mi referencia estaba pulida checala". In his Roman
sit picture the far arm reaches forward, a bracer on the forearm and the hand bare and open, palm up, the thumb
up: the broad man's far arm seated (his wrappings on the forearm, the hand bare). So the hand is his, every
pixel, his black line kept and his skin following the character's in the game; the forearm, with the broad
man's wrappings, is ours up to the wrist.

His cells are read as roman-sit-rock-from-ref.py reads them (PITCH, PHASE; his frames STARTS cells apart). The
hand is every cell of his figure right of his bracer (from column CUT of the frame, in his rows ROWS), with
his black line (LINE: darker than that) and his skin (the rest); JPEG noise is taken off by merging each
colour within TOL of one he used more (his line within LINE_TOL). His cells are one fine pixel each: his figure is drawn at 80% of ours,
but the hand at our scale would be 1.25 of his pixels to one of ours, and his hand at one to one is the size of
our hand on the sit's far arm. The piece's pivot is his wrist (the cell of the cut on his forearm's line) and
its angle his forearm's (fitted through the middle of his bracer's columns, FOREARM), so in the game it turns
with our forearm about our wrist as his forearm turns.

  python3 -I tools/refs/broad-sit-palm-from-ref.py [src/sprite/items/broadSitPalmArt.ts] [studyDir]

The same picture always gives the same bytes.
"""

import importlib.util
import math
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import owner_paintover as P  # noqa: E402

_spec = importlib.util.spec_from_file_location('roman_sit_rock', os.path.join(HERE, 'roman-sit-rock-from-ref.py'))
ROCK = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(ROCK)

OUT = 'src/sprite/items/broadSitPalmArt.ts'
STARTS = ROCK.STARTS
# His far hand in each frame (cells from the frame's start): right of the bracer's end, in these rows.
CUT = 50
ROWS = (42, 56)
RIGHT = 63
# His far forearm, the bracer on it (columns from the frame's start, rows): its line fixes the hand's angle.
FOREARM = ((42, 49), (42, 54))
# His black line: every channel below this.
LINE = 60
TOL = 10
# His black line is one colour of his (the JPEG brings it back in many dark steps): merged as one.
LINE_TOL = LINE


def background(c):
    """His grey ground round the figure (the picture's background), and the JPEG's grey between it and his line."""
    r, g, b = (int(v) for v in c)
    return abs(r - b) < 24 and abs(r - g) < 24 and (r + g + b) / 3 > LINE


def is_line(c):
    return max(int(v) for v in c) < LINE


def hand(a, st):
    """His hand in the frame starting at column `st`: (mask, line mask) over the box (rows ROWS, columns CUT..RIGHT)."""
    y0, y1 = ROWS
    box = a[y0:y1, st + CUT:st + RIGHT]
    fg = np.array([[not background(c) for c in row] for row in box])
    # only his figure joined to the hand: what touches the cut's skin, through his figure
    H, W = fg.shape
    seen = np.zeros_like(fg)
    stack = [(y, x) for y in range(H) for x in range(min(3, W)) if fg[y, x] and not is_line(box[y, x])]
    for p in stack:
        seen[p] = True
    while stack:
        y, x = stack.pop()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (y + dy, x + dx)
            if 0 <= q[0] < H and 0 <= q[1] < W and fg[q] and not seen[q]:
                seen[q] = True
                stack.append(q)
    line = np.array([[is_line(c) for c in row] for row in box]) & seen
    return seen, line, box


def forearm(a, st):
    """His forearm's line (slope, intercept) in the frame's cells: the middle row of his figure in each column."""
    (x0, x1), (y0, y1) = FOREARM
    xs, ys = [], []
    for x in range(x0, x1 + 1):
        col = [y for y in range(y0, y1 + 1) if not background(a[y, st + x])]
        if col:
            xs.append(x + 0.5)
            ys.append((min(col) + max(col) + 1) / 2)
    k, c = np.polyfit(xs, ys, 1)
    return float(k), float(c)


def lifted(a):
    """Each frame's hand: (rows, palette, kinds, pivot, angle, box crop for the study)."""
    out = []
    for st in STARTS:
        mask, line, box = hand(a, st)
        col = P.merge(box, mask & ~line, TOL)
        col = P.merge(col, mask & line, LINE_TOL)
        k, c = forearm(a, st)
        y = int(math.floor(k * (CUT + 0.5) + c)) - ROWS[0]
        # the wrist: the cut's cell on his forearm's line, or the nearest of his hand in that column
        ys = [j for j in range(mask.shape[0]) if mask[j, 0]]
        wy = min(ys, key=lambda j: (abs(j - y), j))
        ang = math.degrees(math.atan(k))
        out.append((col, mask, line, (0, wy), ang, box))
    return out


def hexc(c):
    return '#%02x%02x%02x' % tuple(int(v) for v in c)


CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'


def module(frames):
    colours = sorted({hexc(col[y, x]) for col, mask, *_ in frames for y, x in zip(*np.nonzero(mask))})
    if len(colours) > len(CHARS):
        raise ValueError(f'{len(colours)} colours')
    ch = {h: CHARS[n] for n, h in enumerate(colours)}
    kinds = {}
    for col, mask, line, *_ in frames:
        for y, x in zip(*np.nonzero(mask)):
            kinds[hexc(col[y, x])] = 'line' if line[y, x] else 'skin'
    skin = [hexc(col[y, x]) for col, mask, line, *_ in frames for y, x in zip(*np.nonzero(mask & ~line))]
    base = sorted(set(skin), key=lambda h: (-skin.count(h), h))[0]
    lines = [
        "// The broad man's far hand when seated: the owner's open hand, palm up, his pixels from his Roman sit picture",
        '// (tools/refs/broad-sit-palm-from-ref.py from docs/reference/roman-sit-owner-reference.jpg), one per sit frame.',
        '// Generated: rerun the script to change it.',
        '',
        "import type { PaintedPiece } from '../painted';",
        '',
        '/** His skin the character\'s recolours from (in it, every pixel is his). */',
        f"export const BROAD_SIT_PALM_SKIN = '{base}';",
        '',
        "/** What each of his colours is: his black line or his skin (it follows the character's). */",
        "export const BROAD_SIT_PALM_KIND: Record<string, 'line' | 'skin'> = {",
        *[f"  '{h}': '{kinds[h]}'," for h in colours],
        '};',
        '',
        '/** The far hand open, palm up, reaching forward, in each frame of the sit loop: it rides the wrist, turned with the forearm. */',
        'export const BROAD_SIT_PALM: PaintedPiece[] = [',
    ]
    for col, mask, line, pivot, ang, _ in frames:
        H, W = mask.shape
        ys, xs = np.nonzero(mask)
        y0, y1, x1 = ys.min(), ys.max(), xs.max()
        rows = [''.join(ch[hexc(col[y, x])] if mask[y, x] else '.' for x in range(0, x1 + 1)) for y in range(y0, y1 + 1)]
        used = sorted({c for r in rows for c in r if c != '.'})
        lines += [
            '  {',
            f'    pivot: [{pivot[0]}, {pivot[1] - y0}],',
            f'    angle: {ang:.2f},',
            '    rows: [',
            *[f"      '{r}'," for r in rows],
            '    ],',
            '    colors: {',
            *[f"      {c}: '{colours[CHARS.index(c)]}'," for c in used],
            '    },',
            '  },',
        ]
    lines += ['];', '']
    return '\n'.join(lines)


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else OUT
    study = sys.argv[2] if len(sys.argv) > 2 else None
    frames = lifted(ROCK.native())
    with open(out, 'w', newline='\n') as f:
        f.write(module(frames))
    if study:
        os.makedirs(study, exist_ok=True)
        for n, (col, mask, line, pivot, ang, box) in enumerate(frames):
            H, W = mask.shape
            his = np.zeros((H, W * 2 + 1, 3), np.uint8) + 255
            his[:, :W] = box
            for y, x in zip(*np.nonzero(mask)):
                his[y, W + 1 + x] = col[y, x]
            Image.fromarray(his).resize(((W * 2 + 1) * 12, H * 12), Image.NEAREST).save(os.path.join(study, f'palm-{n + 1}@12.png'))
    print(out, [(f[3], round(f[4], 2), int(f[1].sum())) for f in frames])


if __name__ == '__main__':
    main()
