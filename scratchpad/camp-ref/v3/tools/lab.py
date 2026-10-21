# Hand lab: lab.py art.py out.png -> his crop, then the design book with each variant of HAND_VARIANTS and
# FIST_VARIANTS (lists of rows dicts), at 12x, plus a 3x strip of all.
import sys
import numpy as np
from PIL import Image, ImageDraw

D = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/camp-ref/v3/work/'
H = np.load(D + 'his_sprite.npy')
import os
BG = np.load(os.environ['LABBG']) if os.environ.get('LABBG') else None
DY = int(os.environ.get('LABDY', '0'))
ns = {}
exec(open(sys.argv[1]).read(), ns)
BOOKP = {'o': '#1c0d0a', 'k': '#2b130d', 'g': '#39231b', 'm': '#401714', 'n': '#532d24', 'f': '#664234', 'h': '#79584e',
         'a': '#9e7668', 'q': '#ae8f81', 'c': '#bfa696', 'p': '#d0ccc1', 'P': '#ebe8dd'}
BOOKP.update(ns.get('BOOK_COLORS', {}))
SKIN = {'o': '#2a0f10', 'D': '#9f4c48', 's': '#d5846a', 'b': '#f3c39c', 'l': '#f4d4b3', 'L': '#f3e1cb', 'x': '#9f4c48'}


def grid(rows):
    out = {}
    for y, segs in rows.items():
        if isinstance(segs, str):
            segs = [(ns.get('X0', 115), segs)]
        for x0, s in segs:
            for i, ch in enumerate(s):
                if ch not in '. ':
                    out[(x0 + i, y + DY)] = ch
    return out


def hexrgb(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], float)


def paint(base, layers):
    a = base.copy()
    for g, pal in layers:
        for (x, y), ch in g.items():
            a[y, x] = hexrgb(pal[ch])
    return a


book = grid(ns['BOOK_ROWS'])
hands = ns.get('HAND_VARIANTS', [ns.get('HAND_ROWS', {})])
fists = ns.get('FIST_VARIANTS', [ns.get('FIST_ROWS', {})])
n = max(len(hands), len(fists))
x0, y0, x1, y1 = map(int, sys.argv[3:7]) if len(sys.argv) > 6 else (106, 152, 144, 180)
k = int(sys.argv[7]) if len(sys.argv) > 7 else 10
bg = np.tile(np.array([38, 42, 58.]), (256, 256, 1))
panels = [H]
for i in range(n):
    hd = grid(hands[min(i, len(hands) - 1)])
    fs = grid(fists[min(i, len(fists) - 1)])
    panels.append(paint(H if BG is None else BG, [(fs, SKIN), (book, BOOKP), (hd, SKIN)]))


def pan(a, kk):
    c = np.clip(a[y0:y1, x0:x1], 0, 255).astype(np.uint8)
    return Image.fromarray(c).resize(((x1 - x0) * kk, (y1 - y0) * kk), Image.NEAREST)


ims = [pan(p, k) for p in panels]
cols = 3
rows = (len(ims) + cols - 1) // cols
W = ims[0].width
Hh = ims[0].height
out = Image.new('RGB', (cols * (W + 8), rows * (Hh + 8)), (0, 0, 0))
d = ImageDraw.Draw(out)
for i, im in enumerate(ims):
    X = (i % cols) * (W + 8)
    Y = (i // cols) * (Hh + 8)
    out.paste(im, (X, Y))
    d.text((X + 4, Y + 4), 'his' if i == 0 else 'v%d' % (i - 1), fill=(255, 255, 0))
out.save(sys.argv[2])
small = [pan(p, 3) for p in panels]
s = Image.new('RGB', (len(small) * (small[0].width + 4), small[0].height), (0, 0, 0))
for i, im in enumerate(small):
    s.paste(im, (i * (im.width + 4), 0))
s.save(sys.argv[2].replace('.png', '-3x.png'))
