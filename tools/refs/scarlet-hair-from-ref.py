"""The owner's hair on his Scarlet (docs/reference/scarlet-owner-reference.jpg) as a hairstyle.

His picture is his own pixel art at about 1.8 of his pixels to one of ours (scarlet_ref.py), so his
hair is not copied 1:1: it is the reduced reference's (scarlet-study.py), his head brought down at
0.68 about his eyes, which land on ours (scarlet_ref.SEGMENTS['head']), one sample of his a pixel (so
his dark partings and thin strand ends stay), in his eight crimsons (RAMP) inside his darkest one
as his line. His hair is crimson and messy: a rounded crown lit from the upper left, locks parted by
dark lines, a heavy fringe over the forehead that ends between his eyes and over the near one, a
side lock over the near cheek to the jaw, a dark lock framing the face on the far side, and thin
strand ends sticking out on both sides. This script lifts it out of the reduced reference:

  hair     what of the reduced reference's head joins his crown through his crimsons (and his line
           at the ends of his strands, above his eyes): not his face, lashes or chin, in the same
           darks. The strand ends the study bends down by hand on the near side (its PATCHES, which
           belong to no part of his) are hair too.
  speckle  a single pixel of his whose crimson is in none of its neighbours and two or more steps
           from their middle one (the median) takes that middle one: one sample a pixel drops a pixel
           of a light strand into a dark parting here and there, which reads as noise at our size;
           his partings and strands, two pixels or more, stay (a smoothing along his strands was
           tried and dropped: it wipes out his one-pixel partings and the hair goes flat)

His line round the hair and his strand ends drooping on the near side are the reduced reference's
own (the study draws them).

and splits it like the owner's Aiden hair (valiant-hair-from-ref.py):

  front   every pixel of his hair, over the head. Where his picture shows forehead between the
          strands of his fringe, our head shows.
  back    the same hair with what his face hides filled in: behind the forehead between the strands
          of his fringe (each hidden pixel takes the crimson of the nearest strand above it, so his
          strands run on down), and behind his cheeks and jaw between his side locks (in his darkest
          crimson but the line: his hair behind his face is in shadow, as his far lock is). Only what
          his face covers: the white between his strand ends round the hair stays open, so they
          stand apart as he drew them. Drawn behind the head, it shows only where a head is narrower
          than his; it is also his head's outline at the top (the game trims our skull to it).

It writes, in <out>:

  hair.json             rows and palette (one character per colour of his, scarlet_ref.CHARS), the
                        pivot (the cell on our face anchor), his line's character and his base crimson
  study/hair@8.png      the front, at 8x
  study/back@8.png      the back, with the filled-in pixels marked
  study/ref@8.png       the reduced reference's head there, at 8x

and, with a third argument, the game's module (src/sprite/items/scarletHairArt.ts). The same picture
always gives the same bytes. Run from the repo root with python3 -I:

  python3 -I tools/refs/scarlet-hair-from-ref.py <out> [src/sprite/items/scarletHairArt.ts]
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import scarlet_ref as R  # noqa: E402

# His crimsons, darkest first: the hair ramp of the reduced reference (scarlet-study.py HAIR). The
# darkest is his hair's line.
RAMP = ['#26060d', '#3a0f1e', '#4e172a', '#601f35', '#70273e', '#87324c', '#9a3e58', '#ac5068']
# His black line: the reduced reference has it at two of his strand ends (where his pixel was a dark
# gold or a cold black); it becomes his hair's line.
LINE = '#040405'
# Where his hair is in our frame (x0, y0, x1, y1; exclusive): from the crown (row 126) to the lower
# ends of his side locks on his collar (row 146).
BOX = (108, 122, 144, 150)
# A pixel in the middle of his crown: his hair is what joins it.
SEED = (126, 130)
# Our face anchor (body.ts faceAnchor: the near eye's lash start) at idle frame 0 on our male, where
# the reduced reference was laid: floor((head.x - 1.9 k) RES), floor((head.y + k) RES) with our head
# at scarlet_ref.OUR_JOINTS['head'] and the male head scale k.
HEAD_SCALE = 0.78
ANCHOR = (int(np.floor(R.OUR_JOINTS['head'][0] - 3.8 * HEAD_SCALE)), int(np.floor(R.OUR_JOINTS['head'][1] + 2 * HEAD_SCALE)))
# His forehead shows between the strands of his fringe down to this row (the row above his lashes);
# below it his side locks frame his cheeks and jaw down to JAW_TO.
FOREHEAD_TO = 139
JAW_TO = 145
# His crimson on the lit face of most of his locks: the colour slot's default. Recoloured, every other
# crimson of his moves the way it does (his line stays).
BASE = '#87324c'


def ci(h):
    return R.PALETTE.index(h)


def build():
    """The hair in our frame: (front, back) as (GRID, GRID) PALETTE indices (255 empty) and the mask of
    the back's filled-in pixels."""
    fig = R.reduced_index()
    parts = R.reduced_parts()
    # his head, and the study's mends on the finished figure (its PATCHES, of no part): his strand
    # ends bent down on the near side
    head = parts['head'] | ((fig < 255) & ~np.logical_or.reduce(list(parts.values())))
    G = fig.shape[0]
    ramp = [ci(h) for h in RAMP]
    level = {i: k for k, i in enumerate(ramp)}
    level[ci(LINE)] = 0
    x0, y0, x1, y1 = BOX
    inbox = np.zeros(fig.shape, bool)
    inbox[y0:y1, x0:x1] = True
    rows = np.arange(G)[:, None]
    # his crimsons joined to the crown (diagonals too: his thin strands run on the slant), and his
    # line at his strand ends above his eyes (lower down his lashes and his face's line are as dark)
    walk = head & inbox & (np.isin(fig, ramp) | ((fig == ci(LINE)) & (rows < FOREHEAD_TO)))
    hair = np.zeros(fig.shape, bool)
    stack = [SEED[::-1]]
    while stack:
        y, x = stack.pop()
        if hair[y, x] or not walk[y, x]:
            continue
        hair[y, x] = True
        stack += [(y + dy, x + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx]

    lv = np.full(fig.shape, -1)
    for y, x in zip(*np.nonzero(hair)):
        lv[y, x] = level[fig[y, x]]
    # his line (the study's, round the hair) stays; inside it, the speckle goes
    inner = hair & (lv > 0)
    out = lv.copy()
    for y, x in zip(*np.nonzero(inner)):
        nb = [lv[y + dy, x + dx] for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and inner[y + dy, x + dx]]
        if len(nb) >= 3 and lv[y, x] not in nb and abs(lv[y, x] - np.median(nb)) >= 2:
            out[y, x] = int(np.round(np.median(nb)))

    front = np.full(fig.shape, 255, np.uint8)
    front[hair] = np.asarray(ramp)[out[hair]]

    # the back: the front, and what his face hides, from his hair's first column to its last in
    # each row (not the white between his strand ends: they stand apart): above his eyes each pixel
    # the crimson of the nearest strand above it (his line left out), below them his darkest crimson
    # but the line (his hair behind his cheeks is in shadow)
    on = front < 255
    hidden = np.zeros(fig.shape, bool)
    for y in range(y0, JAW_TO + 1):
        cols = np.nonzero(on[y])[0]
        if len(cols):
            hidden[y, cols[0]:cols[-1] + 1] = True
    hidden &= ~on & (fig < 255)
    back = front.copy()
    line = ci(RAMP[0])
    crimson = lambda v: v < 255 and v != line
    SHADOW = ci(RAMP[1])
    for y in range(y0, JAW_TO + 1):
        for x in range(x0, x1):
            if not hidden[y, x]:
                continue
            src = SHADOW
            if y <= FOREHEAD_TO:
                src = next((back[q, x] for q in range(y - 1, y0 - 1, -1) if crimson(back[q, x])), None)
            if src is None:
                src = next(front[y, q] for d in range(1, G) for q in (x + d, x - d) if 0 <= q < G and crimson(front[y, q]))
            back[y, x] = src
    return front, back, hidden


def rows_of(a, box):
    x0, y0, x1, y1 = box
    return [''.join(R.CHARS[v] if v < 255 else '.' for v in a[y, x0:x1]) for y in range(y0, y1)]


def main():
    out = sys.argv[1]
    os.makedirs(os.path.join(out, 'study'), exist_ok=True)
    front, back, hidden = build()
    yy, xx = np.nonzero(back < 255)
    box = (int(xx.min()), int(yy.min()), int(xx.max()) + 1, int(yy.max()) + 1)
    ox, oy = box[:2]
    palette = {R.CHARS[i]: R.PALETTE[i] for i in sorted(set(back[back < 255].tolist()))}
    assert BASE in palette.values(), 'the base crimson is not one of his colours in the hair'
    meta = {
        'source': R.REF,
        'origin': [ox, oy],
        'pivot': [ANCHOR[0] - ox, ANCHOR[1] - oy],
        'front': rows_of(front, box),
        'back': rows_of(back, box),
        'palette': palette,
        'line': R.CHARS[ci(RAMP[0])],
        'base': BASE,
    }
    tmp = os.path.join(out, 'hair.json.tmp')
    with open(tmp, 'w') as f:
        json.dump(meta, f, indent=1)
        f.write('\n')
    os.replace(tmp, os.path.join(out, 'hair.json'))
    if len(sys.argv) > 2:
        write_ts(meta, sys.argv[2])

    P = R.rgb()

    def rgba(a, mark=None):
        x0, y0, x1, y1 = BOX
        im = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
        for y in range(y0, y1):
            for x in range(x0, x1):
                if a[y, x] < 255:
                    im[y - y0, x - x0] = [*P[a[y, x]], 255]
                    if mark is not None and mark[y, x] and (x + y) % 2:
                        im[y - y0, x - x0] = [0, 200, 255, 255]
        return im

    head = np.where(R.reduced_parts()['head'], R.reduced_index(), 255)
    R.save(rgba(front), os.path.join(out, 'study', 'hair@8.png'))
    R.save(rgba(back, hidden), os.path.join(out, 'study', 'back@8.png'))
    R.save(rgba(head), os.path.join(out, 'study', 'ref@8.png'))
    print('front', int((front < 255).sum()), 'px; back', int((back < 255).sum()), 'px;', len(palette), 'colours; pivot', meta['pivot'])


def write_ts(meta, path):
    """The hair as the game's module (src/sprite/items/scarletHairArt.ts)."""
    import re

    key = lambda k: k if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', k) else "'" + k + "'"
    px, py = meta['pivot']
    out = [
        "// The owner's hair on his Scarlet, brought down to our scale in his colours",
        '// (tools/refs/scarlet-hair-from-ref.py from docs/reference/scarlet-owner-reference.jpg).',
        '// Generated: rerun the script to change it.',
        '',
        "import type { PaintedPart } from './capeArt';",
        '',
        '/** One character per colour of his (both parts share them). */',
        'const SCARLET_HAIR_COLORS: Record<string, string> = {',
    ]
    out += [f"  {key(k)}: '{v}'," for k, v in meta['palette'].items()]
    out += ['};', '']
    for part, name, doc in (
        ('front', 'SCARLET_HAIR_FRONT', 'Every pixel of his hair, over the head: his crimsons and his line. Its pivot is the cell on our face anchor (the near eye\'s lash start).'),
        ('back', 'SCARLET_HAIR_BACK', 'His hair with what his face hides filled in (his forehead between the strands of his fringe, his cheeks and jaw between his side locks), drawn behind the head; also his head\'s outline at the top.'),
    ):
        out += [f'/** {doc} */', f'export const {name}: PaintedPart = {{', f'  pivot: [{px}, {py}],', '  rows: [']
        out += [f"    '{rw}'," for rw in meta[part]]
        out += ['  ],', '  colors: SCARLET_HAIR_COLORS,', '};', '']
    out += [
        '/** His line, his darkest crimson: kept as he drew it when the hair is recoloured. */',
        f"export const SCARLET_HAIR_LINE = '{meta['line']}';",
        '',
        "/** His crimson on the lit face of most locks: the colour slot's default; his other crimsons follow it. */",
        f"export const SCARLET_HAIR_BASE = '{meta['base']}';",
        '',
    ]
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        f.write('\n'.join(out))
    os.replace(tmp, path)


if __name__ == '__main__':
    main()
