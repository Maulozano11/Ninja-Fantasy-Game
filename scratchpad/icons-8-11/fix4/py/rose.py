"""rose.py <out.png>: prototypes of the Command rose at 44 on the 44 before its art (base44 + radiant iris), shown x24 beside his box."""
import sys, math
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fixed/tools')
import numpy as np
from PIL import Image, ImageDraw
import m

D = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fix4/debug'
base = np.asarray(Image.open(f'{D}/northstar_command-base44.png').convert('RGB')).astype(float)
INK = {'centre': 'ffc5c8', 'ridge': 'ffb4bc', 'pale': 'dc112d', 'light': 'dc112d', 'bright': 'a0001e', 'dark': '6a0418', 'ink': '4c031e'}
mx, my = 60 * 44 / 127, 59 * 44 / 127
R, top = 14.5 * 44 / 127, 52 * 44 / 127
iris = base.copy()
L, C, H = m.lch(base)
for y in range(44):
    for x in range(44):
        if y < top or math.hypot(x + .5 - mx, y + .5 - my) > R:
            continue
        if L[y, x] >= 0.55 and C[y, x] >= 0.2 and H[y, x] < 40:
            iris[y, x] = m.hx('fe1020')


def compass(cx, cy, Ll, w, l, wl, centre, Ln):
    light = (-math.sqrt(.5), -math.sqrt(.5))
    arms = []
    for ux, uy in ((0, -1), (1, 0), (0, 1), (-1, 0)):
        arms.append(((ux, uy), Ln if uy < 0 else Ll, w, True))
    for ux, uy in ((1, -1), (1, 1), (-1, 1), (-1, -1)):
        arms.append(((ux * math.sqrt(.5), uy * math.sqrt(.5)), l, wl, False))

    def level(b):
        return 'pale' if b >= .5 else 'light' if b >= 0 else 'bright' if b >= -.5 else 'dark'

    def sample(px, py):
        dx, dy = px - cx, py - cy
        if math.hypot(dx, dy) <= centre:
            return 'centre'
        best, bs = None, -1e9
        for u, ln, hw, lg in arms:
            v = (-u[1], u[0])
            s = dx * u[0] + dy * u[1]
            t = dx * v[0] + dy * v[1]
            if s < -1e-9 or s > ln or abs(t) > hw * (1 - s / ln):
                continue
            al = s / ln
            if al <= bs:
                continue
            bs = al
            side = v if t >= 0 else (-v[0], -v[1])
            b = .6 * (side[0] * light[0] + side[1] * light[1]) + .4 * (u[0] * light[0] + u[1] * light[1])
            best = level(b)
        return best
    out = {}
    Rr = math.ceil(max(Ll, Ln, l) + 1)
    for y in range(math.floor(cy - Rr), math.ceil(cy + Rr) + 1):
        for x in range(math.floor(cx - Rr), math.ceil(cx + Rr) + 1):
            n = {}
            inside = 0
            for j in range(4):
                for i in range(4):
                    k = sample(x + (i + .5) / 4, y + (j + .5) / 4)
                    if not k:
                        continue
                    inside += 1
                    n[k] = n.get(k, 0) + 1
            if inside < 8:
                continue
            k, kn = 'bright', -1
            for key in ('centre', 'pale', 'light', 'bright', 'dark'):
                if n.get(key, 0) > kn:
                    kn, k = n.get(key, 0), key
            out[(x, y)] = k
    for u, ln, hw, lg in arms:
        if not lg or u[0] * light[0] + u[1] * light[1] <= 0:
            continue
        s = 1
        while s <= ln - 1.5:
            p = (math.floor(cx + u[0] * s), math.floor(cy + u[1] * s))
            if p in out and out[p] != 'centre':
                out[p] = 'ridge'
            s += 1
    for (x, y) in list(out):
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if (x + dx, y + dy) not in out:
                out[(x + dx, y + dy)] = 'ink'
    return out


def paint(img, rose, cols, ink=True):
    a = img.copy()
    inkL = m.lch(m.hx(cols['ink']))[0]
    for (x, y), k in rose.items():
        if k == 'ink':
            if not ink or m.lch(a[y, x])[0] <= inkL + 0.02:
                continue
        a[y, x] = m.hx(cols[k])
    return a


ax, ay = int(mx), int(my)
variants = []
variants.append(('old (l2.6 wl.9)', paint(iris, compass(ax + .5, ay + .5, 4.5, 1.8, 2.6, .9, .5, 3.5), INK)))
variants.append(('l3.6 wl1.3', paint(iris, compass(ax + .5, ay + .5, 4.5, 1.8, 3.6, 1.3, .5, 3.5), INK)))
dark = dict(INK, pale='a0001e', light='a0001e', bright='6a0418', dark='4c031e')
variants.append(('l3.6 wl1.3 dark facets no ink', paint(iris, compass(ax + .5, ay + .5, 4.5, 1.8, 3.6, 1.3, .5, 3.5), dark, ink=False)))
variants.append(('l3.2 wl1.2 dark, no ink', paint(iris, compass(ax + .5, ay + .5, 4.5, 1.6, 3.2, 1.2, .5, 3.5), dark, ink=False)))
variants.append(('l3.6 wl1.3 crimson, no ink', paint(iris, compass(ax + .5, ay + .5, 4.5, 1.8, 3.6, 1.3, .5, 3.5), INK, ink=False)))
his = m.his('northstar_command', 44)
tiles = [('his box', his)] + variants
z, x0, y0, x1, y1 = 20, 12, 12, 30, 30
w, h = (x1 - x0) * z, (y1 - y0) * z
img = Image.new('RGB', (len(tiles) * (w + 10) + 10, h + 30 + 60), (21, 23, 29))
d = ImageDraw.Draw(img)
for k, (name, a) in enumerate(tiles):
    t = Image.fromarray(a.astype(np.uint8))
    img.paste(t.crop((x0, y0, x1, y1)).resize((w, h), Image.NEAREST), (10 + k * (w + 10), 20))
    img.paste(t, (10 + k * (w + 10), h + 30))
    img.paste(t.resize((88, 88), Image.NEAREST), (70 + k * (w + 10), h + 30 - 20))
    d.text((10 + k * (w + 10), 4), name, fill=(233, 223, 196))
img.save(sys.argv[1])
print('ok')


def ascii(img, x0, y0, rows, leg):
    a = img.copy()
    for dy, row in enumerate(rows):
        for dx, ch in enumerate(row):
            if ch in '. ':
                continue
            a[y0 + dy, x0 + dx] = m.hx(leg[ch])
    return a


LEG = {'P': 'ffb4bc', 'c': 'ffc5c8', 'l': 'dc112d', 'a': 'a0001e', 'b': '6a0418', 'd': '4c031e'}
D1 = ['...b.P.b...',
      '....aPa....',
      '.llPPcabbd.',
      '....aab....',
      '...b.a.b...',
      '.....b.....',
      '.....d.....']
D2 = ['...b.P.b...',
      '....lPab...',
      '.alPPcaabd.',
      '...blaab...',
      '...b.ab.b..',
      '.....ab....',
      '.....d.....']
D3 = ['..b..P..b..',
      '...a.Pa.b..',
      '.alPPcaabd.',
      '...a.ab.b..',
      '..b..ab..b.',
      '.....b.....',
      '.....d.....']
v2 = [('his box', his)]
for name, rows in (('D1', D1), ('D2', D2), ('D3', D3)):
    v2.append((name, ascii(iris, 15, 18, rows, LEG)))
img = Image.new('RGB', (len(v2) * (w + 10) + 10, h + 30 + 60), (21, 23, 29))
d = ImageDraw.Draw(img)
for k, (name, a) in enumerate(v2):
    t = Image.fromarray(a.astype(np.uint8))
    img.paste(t.crop((x0, y0, x1, y1)).resize((w, h), Image.NEAREST), (10 + k * (w + 10), 20))
    img.paste(t, (10 + k * (w + 10), h + 30))
    img.paste(t.resize((88, 88), Image.NEAREST), (70 + k * (w + 10), h + 30 - 20))
    d.text((10 + k * (w + 10), 4), name, fill=(233, 223, 196))
img.save(sys.argv[1].replace('.png', '-b.png'))
print('ok2')
