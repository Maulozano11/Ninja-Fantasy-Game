"""Lyra's thigh-high boots and the bare thigh above them, from the owner's picture of her at our game's
scale (docs/reference/lyra-game-scale-owner-reference.jpg), as painted pieces that ride the rig.

His picture (1932 x 1932) is Lyra drawn by him at OUR sprite scale: one of his pixels (19.32 picture
pixels, phase 0) is one fine pixel of ours ("aqui tienes tus referencias perfectas del modelo de
mujer"). Laid on our 256 x 256 frame his pixel (x, y) is at (x + 74, y + 121), as for her blouse and
corset (tools/refs/lyra-upper-from-ref.py). Every pixel below is one of his, in his colour (the median
of the block's inside, snapped to the colours he used round her legs, PAL_BOX / PAL_TOL):

  the bare thigh  between her skirt's hem and the cuff (his skin, the shade under the hem)
  the cuff        her gold band round the top of the boot, its rims standing up at the ends
  the shaft       her dark brown leather down the thigh and shin, a small round knee guard on its
                  left with a reddish light at the top
  the strap       the ankle strap with its two gold studs (the Buckle slot)
  the foot        the near one seen from the front, the far one pointing right with its heel

NEAR and FAR draw each leg in our frame at idle frame 0: '=' takes his pixel there (it must be one of
the colours in LEGEND, so nothing of her skirt, coat or sword slips in), 'U' and 'V' take his gold
studs, and any other LEGEND letter is a pixel filled here, continuing his. What his picture hides and
is filled: her sword lies across the near cuff and the top of the near shaft (rows 186-192) and
across the far shaft below the knee guard (rows 196-205), with its black edges and its sparks; there
the cuff goes on in the far cuff's gold pattern (dark at the ends, bright in the middle) and the
shaft in his dark leather with its lighter right side; the thigh under her skirt's hem (near rows
181-183, far rows 182-184) continues his skin up to where our thigh is cut.

His legs do not stand where ours do at idle (his far leg is straight and its foot six rows lower, his
near foot steps further out), so the boots ride their own leg (src/sprite/items/lyraBoots.ts): from
our hip, a thigh as long as his to his knee and a shin as long as his to his ankle, bent at the knee
so that the ankle goes where ours goes, turned and stretched as his ankle is from ours at idle. At
idle frame 0 that leg is exactly his, so every pixel is where he drew it; in other poses the thigh
piece turns with that thigh about its knee, the shin piece (shaft and strap) with its shin about its
ankle, and the foot stays flat under the ankle like our feet. Our leg (skin and trousers) is taken
off below the thigh piece's top row, so his boot is the leg.

It writes the pieces as TypeScript (src/sprite/items/lyraBootsArt.ts) and, in <out>, his legs beside
the pieces at idle at 8x (hers-vs-pieces@8.png). The same picture always gives the same bytes. Run
from the repository root:

  python3 -I tools/refs/lyra-boots-from-ref.py docs/reference/lyra-game-scale-owner-reference.jpg <out> [src/sprite/items/lyraBootsArt.ts]
"""

import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

PITCH = 19.32
OFFSET = (74, 121)  # his pixel (x, y) is our (x + 74, y + 121)
# His colours: the box of the picture her legs are in (our frame), and how close two medians must be
# to be one colour of his.
PAL_BOX = (104, 180, 150, 220)
PAL_TOL = 12

# The colours of his these pieces use, by what they are (every one is one of his, checked).
LEGEND = {
    '0': '#010101',  # his black line
    '2': '#301f25',  # leather: his darkest, the main of the boot
    'i': '#3d282a',  # leather: dark
    '8': '#4b3333',  # leather: shade
    '7': '#5b3e3b',  # leather: lit
    's': '#6c4b48',  # leather: light
    'l': '#4a2925',  # leather: the knee guard's shade
    'n': '#583025',  # leather: the knee guard
    'r': '#6b3b2b',  # leather: the knee guard's light
    'd': '#d58771',  # skin: in shade under the hem
    'J': '#fbc9aa',  # skin: lit
    'B': '#945a29',  # gold: shade
    'E': '#b47831',  # gold: the rim's side
    'c': '#cc8e3b',  # gold: his gold
    'I': '#fbc65c',  # gold: lit
    'K': '#fccc69',  # gold: glint
    'U': '#da9a42',  # buckle: the strap's stud
    'V': '#cc8e3b',  # buckle: the strap's stud in shade
}
KIND = {'0': 'line', 'd': 'skin', 'J': 'skin', 'U': 'buckle', 'V': 'buckle'}
KIND.update({c: 'leather' for c in '2i87slnr'})
KIND.update({c: 'gold' for c in 'BEcIK'})
# The slots' colours (the colour each slot moves the others from): his main leather, his gold, the stud.
BASE = {'leather': '2', 'gold': 'c', 'buckle': 'U', 'skin': 'J'}

# The near leg (first x, first row, rows) in our frame at idle frame 0.
NEAR = (108, 181, [
    '..........0ddddd0...',  # 181 under the skirt: his skin continued up to our cut
    '..........0ddddd0...',
    '..........==dddd0...',
    '.........========...',  # 184 his bare thigh under the hem
    '..........=========.',
    '..........0========.',  # 186 the cuff's top
    '........00cKI======.',  # 187-189 the cuff, the sword over its left half
    '.......=0BcKKI====..',
    '.......==BccKKK===..',
    '........===0000==...',  # 190 the cuff's foot
    '........===2220.....',  # 191 the shaft, its right side under the sword
    '.......======20.....',
    '.......========.....',  # 193-198 the knee guard on the left of the shaft
    '......=========.....',
    '......=========.....',
    '......=========.....',
    '.....=========......',
    '.....========.......',
    '....=========.......',  # 199-209 the shaft down the shin
    '....========........',
    '....========........',
    '....========........',
    '...========.........',
    '...========.........',
    '...=======..........',
    '...=======..........',
    '...======...........',
    '..=======...........',
    '..=======...........',
    '..======............',  # 210-213 the strap and its studs
    '.==U==U=............',
    '.=======............',
    '.=======............',
    '.=======............',  # 214-218 the foot, seen from the front
    '=========...........',
    '=========...........',
    '=========...........',
    '.=======............',
])
# The far leg.
FAR = (126, 182, [
    '..0dddddddd0........',  # 182-184 under the skirt: his skin continued up to our cut
    '..0dddddddd0........',
    '..0ddddddd==........',
    '..==========........',  # 185-186 his bare thigh
    '..===========.......',
    '..===========.......',  # 187-190 the cuff
    '..===========.......',
    '..===========.......',
    '...=========........',
    '...=========........',  # 191 the cuff's foot
    '...=========........',  # 192-196 the shaft and the knee guard on its left
    '...=========........',
    '...=========........',
    '...=========........',
    '...==0======........',
    '...022=====.........',  # 197-205 the shaft below the guard, the sword over it
    '....022===..........',
    '....0222==..........',
    '....=222i0..........',
    '...==22880..........',
    '...=2=2880..........',
    '...====80...........',
    '....====80..........',
    '....====8=..........',
    '....======..........',  # 206-209 the shaft to the ankle
    '.....=====..........',
    '.....======.........',
    '.....======.........',
    '....====U===........',  # 210-211 the strap and its studs
    '....=====V===.......',
    '....==========......',  # 212-216 the heel and the foot pointing right
    '....=============...',
    '....==============..',
    '.....===.=========..',
    '..........========..',
])
# Each leg's pieces: (first row, last row). The thigh's (bare thigh, cuff, shaft to below the knee)
# overlaps the shin's by a few rows at the knee; the shin's (shaft and strap) overlaps the foot's.
CUTS = {
    'N': {'thigh': (181, 196), 'shin': (194, 213), 'foot': (211, 218)},
    'F': {'thigh': (182, 197), 'shin': (195, 211), 'foot': (210, 216)},
}
# Our female rig at idle frame 0, fine pixels: the hip and the ankle of each leg of the female body
# rebuilt from his heroines at our scale (tools/refs/female-body-from-ref.py; printed by
# `npx tsx tools/refs/heroine-idle.mts <out>`). Its near ankle is a row below his, its far ankle four
# rows above his (his far leg is straight).
OUR = {
    'N': {'hip': (120.58, 181.88), 'ankle': (117.56, 211.62)},
    'F': {'hip': (132.35, 178.47), 'ankle': (136.58, 205.06)},
}
# His knee and ankle on each leg (fine pixels in our frame): the ankle in the middle of the shaft above
# the strap, the knee by the knee guard, a little in front of the line from our hip to his ankle (so
# the leg always bends forward).
HIS = {
    'N': {'knee': (117.5, 195.5), 'ankle': (112.5, 210.5)},
    'F': {'knee': (134.5, 195.5), 'ankle': (133.5, 209.5)},
}

OUT_DOC = (
    "// Lyra's thigh-high boots and the bare thigh above them: the owner's pixels from his picture of her at\n"
    "// our game's scale (docs/reference/lyra-game-scale-owner-reference.jpg, one of his pixels is one of\n"
    '// ours), cut by tools/refs/lyra-boots-from-ref.py. Generated: rerun the script to change it.\n'
)
DOCS = {
    'thighN': 'The near bare thigh, the gold cuff and the shaft to below the knee guard: they turn with her thigh about her knee.',
    'shinN': 'The near shaft down the shin and the ankle strap with its studs: they turn with her shin about her ankle.',
    'footN': 'The near foot, seen from the front: it stays flat under her ankle.',
    'thighF': 'The far bare thigh, the gold cuff and the shaft to below the knee guard: they turn with her thigh about her knee.',
    'shinF': 'The far shaft down the shin and the ankle strap with its studs: they turn with her shin about her ankle.',
    'footF': 'The far foot pointing right, with its heel: it stays flat under her ankle.',
}
CONST = {k: 'LYRA_BOOT_' + k[:-1].upper() + '_' + k[-1] for k in DOCS}


def native(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    n = int(round(a.shape[0] / PITCH))
    out = np.zeros((n, n, 3), np.int32)
    for j in range(n):
        for i in range(n):
            y0, y1 = int(round(j * PITCH)), int(round((j + 1) * PITCH))
            x0, x1 = int(round(i * PITCH)), int(round((i + 1) * PITCH))
            out[j, i] = np.median(a[y0 + 4:y1 - 4, x0 + 4:x1 - 4].reshape(-1, 3), axis=0)
    return out


class Hers:
    """His pixels in our frame, each snapped to one of the colours he used round her legs."""

    def __init__(self, path):
        self.nat = native(path)
        x0, y0, x1, y1 = PAL_BOX
        cnt = {}
        for y in range(y0, y1):
            for x in range(x0, x1):
                c = tuple(int(v) for v in self.at_raw(x, y))
                cnt[c] = cnt.get(c, 0) + 1
        reps = []
        for c in sorted(cnt, key=lambda c: (-cnt[c], c)):
            if not any(max(abs(c[k] - r[k]) for k in range(3)) <= PAL_TOL for r in reps):
                reps.append(c)
        self.reps = reps
        self.hexes = ['#%02x%02x%02x' % r for r in reps]

    def at_raw(self, x, y):
        return self.nat[y - OFFSET[1], x - OFFSET[0]]

    def hex(self, x, y):
        """His colour at our (x, y)."""
        c = self.at_raw(x, y)
        i = min(range(len(self.reps)), key=lambda i: (max(abs(int(c[k]) - self.reps[i][k]) for k in range(3)), i))
        return self.hexes[i]


def leg(h, spec):
    """A leg drawing in our frame: {(x, y): LEGEND letter}, and the cells taken from him."""
    x0, y0, rows = spec
    letter = {hx: c for c, hx in LEGEND.items() if c not in 'UV'}
    out, taken = {}, set()
    for j, row in enumerate(rows):
        assert len(row) == 20, (y0 + j, row)
        for i, ch in enumerate(row):
            x, y = x0 + i, y0 + j
            if ch == '.':
                continue
            if ch == '=':
                hx = h.hex(x, y)
                assert hx in letter, ('not a colour of her boots', (x, y), hx)
                out[(x, y)] = letter[hx]
                taken.add((x, y))
            elif ch in 'UV':
                assert h.hex(x, y) == LEGEND[ch], ('not his stud', (x, y), h.hex(x, y))
                out[(x, y)] = ch
                taken.add((x, y))
            else:
                assert ch in LEGEND, ch
                out[(x, y)] = ch
    return out, taken


def pieces(h):
    """The pieces in our frame: name -> {(x, y): letter}; and every leg's cells taken from him."""
    out, taken = {}, {}
    for s, spec in (('N', NEAR), ('F', FAR)):
        cells, his = leg(h, spec)
        taken[s] = (cells, his)
        for part, (a, b) in CUTS[s].items():
            out[f'{part}{s}'] = {c: v for c, v in cells.items() if a <= c[1] <= b}
    return out, taken


def at_rest(P):
    """Everything as it stands at idle frame 0, in the game's order (far leg, near leg; on each the
    foot, the shin, the thigh)."""
    top = {}
    for s in 'FN':
        for part in ('foot', 'shin', 'thigh'):
            top.update(P[f'{part}{s}'])
    return top


def check(P, taken):
    """Every pixel taken from him comes out his at idle, and every colour is one of his."""
    top = at_rest(P)
    for s, (cells, his) in taken.items():
        for c in his:
            assert top[c] == cells[c], ('not his at idle', s, c)
    for hx in LEGEND.values():
        assert hx in HERS_HEXES, ('not his colour', hx)


HERS_HEXES = set()


def deg(a, b):
    return float(np.degrees(np.arctan2(b[1] - a[1], b[0] - a[0])))


def packed(cells):
    xs = [x for x, _ in cells]
    ys = [y for _, y in cells]
    x0, y0 = min(xs), min(ys)
    W, H = max(xs) - x0 + 1, max(ys) - y0 + 1
    grid = [['.'] * W for _ in range(H)]
    for (x, y), v in cells.items():
        grid[y - y0][x - x0] = v
    used = [c for c in LEGEND if c in set(cells.values())]
    return [''.join(r) for r in grid], (x0, y0), {c: LEGEND[c] for c in used}


def write_ts(P, path):
    out = [OUT_DOC, "import type { PaintedPiece } from '../painted';", '']
    out += ["/** Her colours the colour slots move the others from (at these, every pixel is his). */"]
    out += [f"export const LYRA_BOOT_{k.upper()} = '{LEGEND[c]}';" for k, c in BASE.items()]
    out += ['']
    out += ["/** What each letter of these pieces is: his black line (it stays), her skin, leather, gold or the strap's studs. */",
            "export const LYRA_BOOT_KIND: Record<string, 'line' | 'skin' | 'leather' | 'gold' | 'buckle'> = {"]
    out += [f"  '{c}': '{KIND[c]}'," for c in LEGEND]
    out += ['};', '']
    out += ['/**',
            ' * Each leg at our female idle frame 0, fine pixels: our hip and ankle, and his knee and ankle. The',
            ' * boots ride a leg from our hip to his knee and his ankle (src/sprite/items/lyraBoots.ts).',
            ' */',
            'export const LYRA_BOOT_LEGS = {']
    for s in 'NF':
        o, hs = OUR[s], HIS[s]
        out += [f'  {s}: {{ hip: [{o["hip"][0]}, {o["hip"][1]}], ankle: [{o["ankle"][0]}, {o["ankle"][1]}], '
                f'hisKnee: [{hs["knee"][0]}, {hs["knee"][1]}], hisAnkle: [{hs["ankle"][0]}, {hs["ankle"][1]}] }},']
    out += ['} as const;', '']
    for name in DOCS:
        rows, (ox, oy), palette = packed(P[name])
        part, s = name[:-1], name[-1]
        o, hs = OUR[s], HIS[s]
        if part == 'thigh':
            pivot, ang = hs['knee'], deg(o['hip'], hs['knee'])
        else:
            pivot, ang = hs['ankle'], deg(hs['knee'], hs['ankle'])
        out += [f'/** {DOCS[name]} */', f'export const {CONST[name]}: PaintedPiece = {{',
                f'  pivot: [{int(np.floor(pivot[0])) - ox}, {int(np.floor(pivot[1])) - oy}],', f'  angle: {ang:.4f},', '  rows: [']
        out += [f"    '{r}'," for r in rows]
        out += ['  ],', '  colors: {']
        out += [f"    {c}: '{hx}'," if c.isalpha() else f"    '{c}': '{hx}'," for c, hx in palette.items()]
        out += ['  },', '};', '']
    text = '\n'.join(out)
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write(text)
    os.replace(tmp, path)


def rgb(hx):
    return [int(hx[i:i + 2], 16) for i in (1, 3, 5)]


def picture(h, P, taken, path, k=8):
    """His legs (all of his pixels there), the pixels taken from him, and the pieces at idle, side by
    side at 8x with Spanish labels."""
    x0, y0, x1, y1 = 104, 178, 150, 220
    W, H = x1 - x0, y1 - y0
    bg = (236, 236, 236)

    def tile(cells):
        a = np.zeros((H, W, 3), np.uint8)
        a[:] = bg
        for (x, y), c in cells.items():
            if x0 <= x < x1 and y0 <= y < y1:
                a[y - y0, x - x0] = rgb(LEGEND[c])
        return a
    allhis = np.zeros((H, W, 3), np.uint8)
    for y in range(y0, y1):
        for x in range(x0, x1):
            c = rgb(h.hex(x, y))
            allhis[y - y0, x - x0] = c if min(c) < 245 else bg
    his = {}
    for s, (cells, mine) in taken.items():
        his.update({c: cells[c] for c in mine})
    panels = [('Tu dibujo', allhis), ('Lo tomado de ti', tile(his)), ('Las piezas (reposo)', tile(at_rest(P)))]
    pad, top = 12, 34
    ims = [Image.fromarray(a).resize((W * k, H * k), Image.NEAREST) for _, a in panels]
    sheet = Image.new('RGB', (sum(i.width for i in ims) + pad * (len(ims) + 1), H * k + top + pad), (40, 40, 48))
    d = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
    except OSError:
        font = ImageFont.load_default()
    X = pad
    for (label, _), im in zip(panels, ims):
        sheet.paste(im, (X, top))
        d.text((X + 4, 6), label, fill=(255, 255, 255), font=font)
        X += im.width + pad
    sheet.save(path)


def main():
    src, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    h = Hers(src)
    HERS_HEXES.update(h.hexes)
    P, taken = pieces(h)
    check(P, taken)
    picture(h, P, taken, os.path.join(out_dir, 'hers-vs-pieces@8.png'))
    for name in DOCS:
        print(name, 'cells', len(P[name]))
    if len(sys.argv) > 3:
        write_ts(P, sys.argv[3])


if __name__ == '__main__':
    main()
