"""Hair specs for the example sprites. Run: python3 specs.py out.json"""
import json, sys
from convert import native, hexc, scale2x

SPECS = [
    dict(id='hair_drifter', name="Drifter's Part", color='#938fc0', src='ex0.png', scale=2, phase=(1, 0),
         crop=(26, 12, 42, 26), iris=(33, 22),
         hair={'#615097': 1, '#938fc0': 3, '#c0c2df': 4},
         desc='Straight lilac hair parted in the middle, falling over the ears with bangs to the eyes.'),
    dict(id='hair_surge', name='Golden Surge', color='#f8ac01', src='ex0.png', scale=2, phase=(1, 0),
         crop=(68, 10, 92, 26), iris=(78, 22),
         hair={'#a05f12': 1, '#b4701e': 2, '#f8ac01': 3, '#faf4b4': 4},
         desc='Blazing golden hair standing straight up in sharp spikes.'),
    dict(id='hair_youth', factor=1.6, cap=True, name='Wild Youth', color='#33333d', src='ex1.png', scale=1, phase=(0, 0),
         crop=(148, 56, 178, 74), iris=(164, 72),
         hair={'#000000': 1, '#0a0a0a': 1, '#1e1e1e': 2, '#272727': 2, '#373737': 3},
         # black is also the face outline: below the brow keep only the hair beside the face
         keep=lambda x, y, c: y <= 68 or x <= 160 or x >= 169 or c != '#000000',
         desc='Short, messy black spikes that fall over the forehead.'),
    dict(id='hair_ascended', factor=1.6, cap=True, name='Ascended Spikes', color='#e6c020', src='ex1.png', scale=1, phase=(0, 0),
         crop=(194, 54, 218, 75), iris=(206, 72),
         hair={'#854a00': 1, '#c07c00': 2, '#e6c020': 3, '#ffff78': 4, '#ffffe1': 5},
         desc='Golden spikes swept up and back, with one lone lock over the brow.'),
    dict(id='hair_storm2', factor=1.4, cap=True, name='Storm Ascension', color='#e6c020', src='ex1.png', scale=1, phase=(0, 0),
         crop=(228, 49, 256, 74), iris=(243, 69),
         hair={'#854a00': 1, '#c07c00': 2, '#e6c020': 3, '#ffff78': 4, '#ffffe1': 5},
         desc='Taller, sharper golden spikes crackling upward, with a lock over the brow.'),
]


def convert(spec):
    g = native(spec['src'], spec['scale'], spec['phase'])
    x0, y0, x1, y1 = spec['crop']
    keep = spec.get('keep', lambda x, y, c: True)
    crop = []
    for y in range(y0, y1):
        row = []
        for x in range(x0, x1):
            c = hexc(g[y][x])
            row.append(spec['hair'][c] if c in spec['hair'] and keep(x, y, c) else None)
        crop.append(row)
    # drop specks: a hair pixel with no hair neighbour
    for y in range(len(crop)):
        for x in range(len(crop[0])):
            if crop[y][x] is None:
                continue
            nb = [crop[y + dy][x + dx] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= y + dy < len(crop) and 0 <= x + dx < len(crop[0])]
            if all(n is None for n in nb):
                crop[y][x] = None
    # keep connected parts of at least 15% of the biggest one (drops stray outline bits)
    Hc, Wc = len(crop), len(crop[0])
    comp = [[-1] * Wc for _ in range(Hc)]
    sizes = []
    for y in range(Hc):
        for x in range(Wc):
            if crop[y][x] is None or comp[y][x] >= 0:
                continue
            k = len(sizes)
            stack = [(x, y)]
            comp[y][x] = k
            n = 0
            while stack:
                cx, cy = stack.pop()
                n += 1
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < Wc and 0 <= ny < Hc and crop[ny][nx] is not None and comp[ny][nx] < 0:
                            comp[ny][nx] = k
                            stack.append((nx, ny))
            sizes.append(n)
    big_k = max(range(len(sizes)), key=lambda i: sizes[i])
    for y in range(Hc):
        for x in range(Wc):
            if crop[y][x] is not None and sizes[comp[y][x]] < 0.15 * sizes[big_k]:
                crop[y][x] = None
    f = spec.get('factor', 2)
    if f == 2:
        big = scale2x(crop)
    else:
        # smooth to 8x with Scale2x three times, then take the majority value per target pixel
        s8 = scale2x(scale2x(scale2x(crop)))
        H8, W8 = len(s8), len(s8[0])
        Ht, Wt = int(round(H8 / 8 * f)), int(round(W8 / 8 * f))
        big = []
        for ty in range(Ht):
            row = []
            for tx in range(Wt):
                ya, yb = int(ty * 8 / f), max(int(ty * 8 / f) + 1, int((ty + 1) * 8 / f))
                xa, xb = int(tx * 8 / f), max(int(tx * 8 / f) + 1, int((tx + 1) * 8 / f))
                votes = {}
                for yy in range(ya, min(yb, H8)):
                    for xx in range(xa, min(xb, W8)):
                        v = s8[yy][xx]
                        votes[v] = votes.get(v, 0) + 1
                tot = sum(votes.values())
                empty = votes.get(None, 0)
                if empty * 2 >= tot:
                    row.append(None)
                else:
                    votes.pop(None, None)
                    # darker shades win ties so thin dark lines survive the shrink
                    row.append(max(votes, key=lambda k: (votes[k], -k)))
            big.append(row)
    H, W = len(big), len(big[0])
    rows = []
    for y in range(H):
        r = ''
        for x in range(W):
            v = big[y][x]
            if v is None:
                r += '.'
                continue
            edge = any(not (0 <= x + dx < W and 0 <= y + dy < H) or big[y + dy][x + dx] is None for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            r += '0' if edge else str(v)
        rows.append(r)
    top = next(i for i, r in enumerate(rows) if set(r) != {'.'})
    bot = len(rows) - next(i for i, r in enumerate(reversed(rows)) if set(r) != {'.'})
    rows = rows[top:bot]
    left = min(len(r) - len(r.lstrip('.')) for r in rows)
    right = max(len(r.rstrip('.')) for r in rows)
    rows = [r[left:right] for r in rows]
    ix, iy = spec['iris']
    f = spec.get('factor', 2)
    fa = [int(round((ix - x0) * f)) - left, int(round((iy - y0) * f)) - top]
    if spec.get('cap'):
        rows, fa = add_cap(rows, fa)
    return {'id': spec['id'], 'name': spec['name'], 'desc': spec['desc'], 'color': spec['color'], 'f': rows, 'fa': fa}


def add_cap(rows, fa):
    """Merges cap.json under the hair (anchors aligned): cap pixels fill only where the hair is
    empty, and the cap's own outline stays only on the outside of the union."""
    cap = json.load(open('cap.json'))
    crows, cfa = cap['f'], cap['fa']
    # canvas origin so that both anchors land on the same cell
    ox = max(fa[0], cfa[0])
    oy = max(fa[1], cfa[1])
    hx, hy = ox - fa[0], oy - fa[1]
    cx, cy = ox - cfa[0], oy - cfa[1]
    W = max(hx + len(rows[0]), cx + len(crows[0]))
    H = max(hy + len(rows), cy + len(crows))
    g = [['.'] * W for _ in range(H)]
    for r, row in enumerate(crows):
        for c, ch in enumerate(row):
            if ch != '.':
                g[cy + r][cx + c] = 'c' + ch
    for r, row in enumerate(rows):
        for c, ch in enumerate(row):
            if ch != '.':
                g[hy + r][hx + c] = ch
    out = []
    for y in range(H):
        line = ''
        for x in range(W):
            ch = g[y][x]
            if ch.startswith('c'):
                v = ch[1]
                border = any(not (0 <= x + dx < W and 0 <= y + dy < H) or g[y + dy][x + dx] == '.' for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
                if v == '0' and not border:
                    v = '1'
                line += v
            else:
                line += ch
        out.append(line)
    return out, [ox, oy]


if __name__ == '__main__':
    out = {}
    for s in SPECS:
        c = convert(s)
        out[c['id']] = c
        print(c['id'], len(c['f'][0]), 'x', len(c['f']), 'anchor', c['fa'])
    json.dump(out, open(sys.argv[1], 'w'), indent=1)
