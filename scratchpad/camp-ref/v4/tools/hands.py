# hands.py: his hands and forearm as cleaned step maps (his coordinates), the mean of his samples per
# step (interior cells first), and a check image: his picture at our grid | the cleaned maps in his
# colours | the difference, at 12x.
import sys
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/camp-ref/v4/tools')
from sample import fine

# rows: (x0, y0, [rows])
CHIN_HAND = (119, 158, [
    'oooooooo',
    'oDDbhlbso',
    'obbllllbDo',
    '.Doooooooo',
])
CHIN_FORE = (108, 160, [
    '..........o',
    '.........oDs',
    '........oDo',
    '......ooDbo',
    '....ooDshbo',
    '..ooDDbhhbo',
    '..osssllhbo',
    '.osbbbllho',
    'ossbblllho',
    'oosbblllho',
    '.oDsbllhDo',
    '..oDsbbbo',
    '...oDsDso',
    '....ooooo',
])
BOOK_HAND = (131, 170, [
    '...D.t.D',
    '...m.m.D',
    '.D.t.D.D',
    'oDmmmmDD',
    'okmmmtto',
    '.okDmmko',
    '.okDmko',
    '.ooooo',
])


def cells(spec):
    x0, y0, rows = spec
    out = {}
    for j, r in enumerate(rows):
        for i, ch in enumerate(r):
            if ch != '.':
                out[(x0 + i, y0 + j)] = ch
    return out


def means(groups, line='o'):
    res = {}
    for spec_cells in groups:
        pass
    return res


def palette(cs):
    by = {}
    for (x, y), ch in cs.items():
        inner = all(cs.get((x + dx, y + dy), '.') not in '.o' for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
        by.setdefault(ch, {'in': [], 'all': []})
        c = fine(x, y, 0.25)
        by[ch]['all'].append(c)
        if inner:
            by[ch]['in'].append(c)
    pal = {}
    for ch, d in by.items():
        src = d['in'] if len(d['in']) >= 2 and ch != 'o' else d['all']
        m = np.mean(src, 0)
        if ch == 'o':
            # the line: the darker half of its samples (the rest is blurred into what it borders)
            s = sorted(d['all'], key=lambda c: c.sum())
            m = np.mean(s[:max(1, len(s) // 2)], 0)
        elif ch in 'Dk' and not d['in']:
            # an edge shade: the lighter half of its samples (the rest is blurred into the line)
            s = sorted(d['all'], key=lambda c: c.sum())
            m = np.mean(s[len(s) // 2:], 0)
        pal[ch] = '#%02x%02x%02x' % tuple(int(round(v)) for v in m)
        print(ch, pal[ch], len(d['in']), len(d['all']))
    return pal


if __name__ == '__main__':
    arm = {**cells(CHIN_FORE), **cells(CHIN_HAND)}
    book = cells(BOOK_HAND)
    print('chin arm')
    pa = palette(arm)
    print('book hand')
    pb = palette(book)
    k = 12
    x0, y0, x1, y1 = 104, 154, 142, 180
    W, H = (x1 - x0) * k, (y1 - y0) * k
    left = Image.new('RGB', (W, H))
    right = Image.new('RGB', (W, H), (38, 42, 58))
    dl, dr = ImageDraw.Draw(left), ImageDraw.Draw(right)
    for y in range(y0, y1):
        for x in range(x0, x1):
            c = tuple(int(round(v)) for v in fine(x, y, 0.25))
            dl.rectangle([(x - x0) * k, (y - y0) * k, (x - x0 + 1) * k - 1, (y - y0 + 1) * k - 1], fill=c)
            dr.rectangle([(x - x0) * k, (y - y0) * k, (x - x0 + 1) * k - 1, (y - y0 + 1) * k - 1], fill=c)
    hexrgb = lambda h: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
    for cs, pal in ((arm, pa), (book, pb)):
        for (x, y), ch in cs.items():
            dr.rectangle([(x - x0) * k, (y - y0) * k, (x - x0 + 1) * k - 1, (y - y0 + 1) * k - 1], fill=hexrgb(pal[ch]))
    im = Image.new('RGB', (W * 2 + 10, H))
    im.paste(left, (0, 0))
    im.paste(right, (W + 10, 0))
    im.save(sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/camp-ref/v4/work/hands-check.png')
