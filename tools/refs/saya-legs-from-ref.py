"""Saya's wrapped leggings and armoured shoes, from the owner's Saya picture at our game's scale
(docs/reference/saya-game-scale-owner-reference.jpg, 2026-10-21).

He drew her at our sprite's scale ("aqui hay otra solo que tiene el arma bugeada quita lo que esta
bugeado"): one of his pixels is one of ours (1024 x 1024, 10.24 picture pixels each, 100 x 100 of his,
phase 0). So her legs are copied pixel for pixel, in his colours only (PALETTE: each one the colour he
painted, read as the median of the middle of his pixel), with his black line:

  the legging top  her darkest navy band;
  the thigh        her navy legging above the knee;
  the knee pad     round, lit navy, rimmed in red;
  the shin         her navy wraps with red bands across, dark lines between;
  the shoe         her navy armoured shoe: red trim over the instep, a lit toe, her brown sole and,
                   on the far foot, a brown heel.

Her bare thighs between her skirt and her leggings are not copied: they are the body's own (the owner's
bare female body, body/female-v2), as his Saya stands as his bare woman does. A bare thigh painted on
her legging rode the leg when it turned and stood off our thigh as a patch of skin by the knee (seated,
and drawing back to throw). The legging top is cut where his skin ends (piece_of's 'skin' cells are left
out).

What his picture hides and is filled here, continuing his pixels: the weapons he drew are bugged (two
crossed blades and a scabbard), and they are taken out. Under them were most of the near thigh and the
top of its knee pad (under the hilt, the blade and the scabbard: filled as his big picture of her shows
that thigh, his bare skin lit across its middle with its shadow under the skirt's hem and down its
edges, over his dark legging band) and, on the far leg, the thigh's lower left and the shin from the
knee pad down to the first band he shows (under the blade: filled with his navy and a red band and dark
line like the near shin's). The far thigh's left side is under her skirt's hem and is filled with his
skin. Everything else is his (check_his() checks it).

The pieces ride our rig as the owner's sabatons do (src/sprite/items/feet.ts): his legs stand where
ours do at idle frame 0 when his picture is moved by OFFSET (the near leg to our ground at row 218; on our
female body, the owner's bare woman, tools/refs/saya_rig.py, his knee pads fall on our knees and his
shoes on our feet: his Saya stands as his bare woman does). On both legs the legging above the knee
turns with the thigh about the knee (RIDES); the knee pads and the wrapped shins turn with the shin
about the ankle, and the shoe stays flat on the ground (our body's leg is taken away below the knee
under them). At rest every pixel is where he drew it.

It writes the pieces as TypeScript (src/sprite/items/sayaLegsArt.ts) and, in <out>, his legs as he drew
them beside them without the weapons at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/saya-legs-from-ref.py src/sprite/items/sayaLegsArt.ts <out>
"""

import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import saya_rig  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PICTURE = os.path.join(ROOT, 'docs', 'reference', 'saya-game-scale-owner-reference.jpg')
PITCH = 10.24  # picture pixels per one of his (1024 / 100), phase 0
INSET = 3  # picture pixels left out at each side of his pixel (the JPEG's blur between pixels)

# His colours (each the colour he painted, read off his pixels), one character each.
PALETTE = {
    'k': '#010102',  # his black line
    'K': '#111420',  # navy: darkest, the legging's top band
    'u': '#222238',  # navy: his main legging
    'U': '#282c49',  # navy: a step lighter
    'g': '#383c48',  # navy: the grey light on the legging
    'e': '#374061',  # navy: lit (knee pads, shoes)
    '3': '#8b8d99',  # the shine on the far toe
    'q': '#74292f',  # red in shade
    'r': '#a63133',  # red
    'z': '#cf856d',  # skin in shade
    'S': '#f4bd97',  # skin lit
    'n': '#3e2a25',  # brown: sole and far heel
}
KIND = {'K': 'cloth', 'u': 'cloth', 'U': 'cloth', 'g': 'cloth', 'e': 'cloth', '3': 'cloth', 'q': 'band', 'r': 'band', 'z': 'skin', 'S': 'skin'}
CLOTH, BAND = 'e', 'r'  # the colours the slots are matched to

# Where his picture sits on our idle frame 0, per leg: our x, y = his + OFFSET (below LIFT's rows,
# that many rows higher).
OFFSET = {'N': (76, 121), 'F': (76, 121)}
# His rows left out of a leg (first, last), inclusive. None: both legs are as long as he drew them (the
# first female body left six of the far shin's out, to bring his far shoe up to its higher far foot).
LIFT = {}

# His legs without the weapons: (his x of the first character, row) -> characters, '.' empty.
LEGS = {
    'N': {
        64: (37, 'kzzzzzzzzzzzzzk'),
        65: (37, 'kzzSSSSSSSSzzzk'),
        66: (37, 'kzzSSSSSSSSzzzk'),
        67: (37, 'kzzSSSSSSSKKKkk'),
        68: (37, 'kKKKKKKKKKKKguuk'),
        69: (37, 'kuuUkqkuuuuugguk'),
        70: (37, 'kukkqkkkkugguuk'),
        71: (38, 'kkrUeeeukuuuk'),
        72: (38, 'krUUeeeeqkuk'),
        73: (37, 'kkueeeeeUUqkk'),
        74: (38, 'kuueeeeeUuk'),
        75: (37, 'kkuueeeeuuuk'),
        76: (37, 'kkruuuuuuuk'),
        77: (37, 'kukruuuuurk'),
        78: (36, 'kqqukrrrrkk'),
        79: (36, 'kurrukkkkuk'),
        80: (36, 'kuurruuuuuk'),
        81: (36, 'kuuurrrrqqk'),
        82: (36, 'krruuuuuuk'),
        83: (36, 'kurrrueuuk'),
        84: (36, 'kuurrruuk'),
        85: (36, 'kueuurqqk'),
        86: (36, 'kUeeeuqk'),
        87: (36, 'kUkkkuuk'),
        88: (36, 'kkrrrkuk'),
        89: (35, 'krrUeerkk'),
        90: (35, 'kuueeeurk'),
        91: (35, 'kurrrruuk'),
        92: (35, 'krkkkkruk'),
        93: (35, 'kkueeukrk'),
        94: (34, 'kuueeeeukk'),
        95: (34, 'kueeeeeuuk'),
        96: (34, 'knnnnnnnk'),
        97: (35, 'kkkkkkk'),
    },
    'F': {
        64: (54, 'kzzzzzzzzk'),
        65: (54, 'kzzzzzzSzzk'),
        66: (54, 'kzzzzzSSSzk'),
        67: (54, 'kzzzSSSSKKk'),
        68: (54, 'kkKKKKKKgkkk'),
        69: (55, 'kuuuuggkrrk'),
        70: (54, 'kkuugggkreekk'),
        71: (55, 'kuuuukrueeek'),
        72: (55, 'kuuuukrUeeek'),
        73: (55, 'kuuuukueeeek'),
        74: (55, 'kuuuukueeeuk'),
        75: (55, 'kuuuuukkeek'),
        76: (55, 'kuuuuuuukkk'),
        77: (55, 'kruuuuuurkk'),
        78: (55, 'kqqukrrrqk'),
        79: (55, 'kuurrkkkuk'),
        80: (55, 'kuuurruuuk'),
        81: (55, 'kqqruuuuuk'),
        82: (56, 'kuurruuk'),
        83: (56, 'kuuuuruk'),
        84: (57, 'kuuurrk'),
        85: (57, 'kuqquek'),
        86: (57, 'kquuukkk'),
        87: (56, 'kquuukrrk'),
        88: (56, 'kkukkrueek'),
        89: (56, 'knkkrueerrk'),
        90: (56, 'kunnkrurkkkk'),
        91: (56, 'kuunnkrkueeekk'),
        92: (56, 'knunnnkueee33ek'),
        93: (56, 'knnnknnuuueeeeek'),
        94: (57, 'kkk.kknnnnnnnnk'),
        95: (63, 'kkkkkkkk'),
    },
}

# Where his picture hides her legs (his x0, y0, x1, y1, inclusive): the only places LEGS is not his.
HIDDEN = {
    'N': [
        (37, 64, 53, 70),  # the near thigh: under the hilt, the blade and the scabbard (lit as in his big picture)
        (37, 71, 50, 72),  # the knee pad's top and the thigh beside it: under the blade and scabbard
    ],
    'F': [
        (54, 64, 60, 65),  # the far thigh's left: under her skirt's hem
        (54, 71, 64, 83),  # the far thigh's lower left and the shin under the blade
    ],
}

# Our female's joints at idle frame 0 in fine pixels (tools/refs/saya_rig.py).
OUR = {j: saya_rig.JOINTS[j] for j in ('hipN', 'kneeN', 'ankleN', 'hipF', 'kneeF', 'ankleF')}


def piece_of(s, x, y):
    """Which piece a pixel of his belongs to: 'skin', 'thigh', 'shin' or 'foot'."""
    if s == 'N':
        if y >= 92:
            return 'foot'
        if y <= 66 or (y == 67 and x <= 46):
            return 'skin'
        # the knee pad rises above the knee: rows 70-72 up to its right outline go with the shin
        if y >= 73 or (70 <= y <= 72 and (39 if y == 70 else 38) <= x <= {70: 45, 71: 46, 72: 47}[y]):
            return 'shin'
        return 'thigh'
    if y >= 88:
        return 'foot'
    if y <= 66 or (y == 67 and x <= 61):
        return 'skin'
    if y >= 73 or (68 <= y <= 72 and x >= {68: 63, 69: 62, 70: 61, 71: 60, 72: 60}[y]):
        return 'shin'
    return 'thigh'


def native():
    """His pixels: the median colour of the middle of each, 100 x 100."""
    a = np.asarray(Image.open(PICTURE).convert('RGB')).astype(np.int32)
    n = int(round(a.shape[0] / PITCH))
    out = np.zeros((n, n, 3), np.int32)
    for y in range(n):
        for x in range(n):
            y0, y1 = int(y * PITCH + INSET), int((y + 1) * PITCH - INSET)
            x0, x1 = int(x * PITCH + INSET), int((x + 1) * PITCH - INSET)
            out[y, x] = np.median(a[y0:y1, x0:x1].reshape(-1, 3), axis=0)
    return out


def rgb(h):
    return [int(h[i:i + 2], 16) for i in (1, 3, 5)]


def nearest(c):
    keys = list(PALETTE)
    d = [sum((p - q) ** 2 for p, q in zip(rgb(PALETTE[k]), c)) for k in keys]
    return keys[int(np.argmin(d))]


def cells(s):
    for y, (x0, row) in sorted(LEGS[s].items()):
        for i, ch in enumerate(row):
            if ch != '.':
                yield x0 + i, y, ch


def placed(s):
    """His cells of a leg as placed: (x, his row, the row it is drawn at, character), LIFT's rows left out."""
    lo, hi = LIFT.get(s, (0, -1))
    for x, y, ch in cells(s):
        if lo <= y <= hi:
            continue
        yield x, y, y - (hi - lo + 1 if y > hi else 0), ch


def check_his(nat):
    """Every pixel outside HIDDEN is his: his colour there is the one in LEGS."""
    for s in ('N', 'F'):
        for x, y, ch in cells(s):
            if any(x0 <= x <= x1 and y0 <= y <= y1 for x0, y0, x1, y1 in HIDDEN[s]):
                continue
            his = nearest(nat[y, x])
            if his != ch:
                raise SystemExit(f'{s} ({x},{y}): LEGS has {ch!r}, his picture {his!r} {list(nat[y, x])}')
            far = max(abs(p - q) for p, q in zip(rgb(PALETTE[ch]), nat[y, x]))
            if far > 40:
                raise SystemExit(f'{s} ({x},{y}): his colour {list(nat[y, x])} is far from {PALETTE[ch]}')


def angle(a, b):
    return math.degrees(math.atan2(OUR[b][1] - OUR[a][1], OUR[b][0] - OUR[a][0]))



# Each piece: the joint it hangs from and the limb whose angle it keeps. On the owner's bare female body
# both legging tops lie above our knees and turn with the thigh (on the earlier body the far knee was
# higher, so the far one turned with the shin). Her bare thighs ('skin') are the body's own: not written.
# Where a bent knee opens a gap between the thigh's piece and the shin's, the body's thigh shows, painted
# in her legging's navy (sayaLegs.ts): the thigh piece no longer carries the top of the knee pad under it
# (turned with the thigh, a sharp bend stood it off the leg as a second pad).
RIDES = {'thigh': ('knee', ('hip', 'knee')), 'shin': ('ankle', ('knee', 'ankle')), 'foot': ('ankle', ('knee', 'ankle'))}
RIDES_OF = {'N': RIDES, 'F': RIDES}
PIECE_NAMES = ('thigh', 'shin', 'foot')
DOCS = {
    'thigh': 'legging above the knee: her darkest navy band at the top',
    'shin': 'round knee pad rimmed in red and her wrapped shin, red bands across',
    'foot': 'armoured shoe: red trim over the instep, her brown sole',
}
SIDE = {'N': 'near', 'F': 'far'}


def pieces():
    out = {}
    for s in ('N', 'F'):
        ox, oy = OFFSET[s]
        for name in PIECE_NAMES:
            px = [(x, yd, ch) for x, y, yd, ch in placed(s) if piece_of(s, x, y) == name]
            x0, y0 = min(p[0] for p in px), min(p[1] for p in px)
            x1, y1 = max(p[0] for p in px), max(p[1] for p in px)
            grid = [['.'] * (x1 - x0 + 1) for _ in range(y1 - y0 + 1)]
            for x, y, ch in px:
                grid[y - y0][x - x0] = ch
            joint, (a, b) = RIDES_OF[s][name]
            jx, jy = OUR[joint + s]
            out[name + s] = {
                'rows': [''.join(r).rstrip('.') for r in grid],
                'pivot': (int(math.floor(jx)) - (x0 + ox), int(math.floor(jy)) - (y0 + oy)),
                'angle': angle(a + s, b + s),
                'origin': (x0 + ox, y0 + oy),
            }
    return out


def write_ts(path, ps):
    used = sorted({ch for p in ps.values() for r in p['rows'] for ch in r if ch != '.'}, key=list(PALETTE).index)
    out = [
        '// Generated by tools/refs/saya-legs-from-ref.py from the owner\'s Saya picture at our scale',
        '// (docs/reference/saya-game-scale-owner-reference.jpg): rerun the script to change it.',
        '',
        "import type { PaintedPiece } from '../painted';",
        '',
        '/** The colours of hers the colour slots are matched to: her lit navy, her red. */',
        f"export const SHADE_CLOTH = '{PALETTE[CLOTH]}';",
        f"export const SHADE_BAND = '{PALETTE[BAND]}';",
        '',
        '/** What each of her colours is: navy cloth (or shoe), red band. Her black line and brown sole stay. */',
        "export const SHADE_KIND: Record<string, 'cloth' | 'band'> = {",
    ]
    out += [f"  '{PALETTE[c]}': '{KIND[c]}'," for c in used if c in KIND]
    out += ['};', '']
    colors = [f"    {c}: '{PALETTE[c]}'," if c.isalpha() else f"    '{c}': '{PALETTE[c]}',"for c in used]
    for s in ('N', 'F'):
        for name in PIECE_NAMES:
            p = ps[name + s]
            here = {ch for r in p['rows'] for ch in r}
            out += [f'/** Her {SIDE[s]} {DOCS[name]}. */', f'export const SHADE_{name.upper()}_{s}: PaintedPiece = {{',
                    f"  pivot: [{p['pivot'][0]}, {p['pivot'][1]}],", f"  angle: {p['angle']:.2f},", '  rows: [']
            out += [f"    '{r}'," for r in p['rows']]
            out += ['  ],', '  colors: {']
            out += [line for line, c in zip(colors, used) if c in here]
            out += ['  },', '};', '']
    text = '\n'.join(out)
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        f.write(text)
    os.replace(tmp, path)


def write_sheet(out, nat):
    """His legs as he drew them (with the bugged weapons) beside them without the weapons, at 8x."""
    os.makedirs(out, exist_ok=True)
    x0, y0, x1, y1, k = 26, 58, 76, 99, 8
    his = nat[y0:y1, x0:x1].astype(np.uint8)
    clean = np.full_like(his, 236)
    for s in ('N', 'F'):
        for x, y, ch in cells(s):
            clean[y - y0, x - x0] = rgb(PALETTE[ch])
    panels = [('Tu dibujo', his), ('Sin las armas', clean)]
    pad, top = 12, 34
    w, h = (x1 - x0) * k, (y1 - y0) * k
    sheet = Image.new('RGB', (len(panels) * (w + pad) + pad, h + top + pad), (40, 40, 48))
    d = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
    except OSError:
        font = ImageFont.load_default()
    for i, (label, im) in enumerate(panels):
        X = pad + i * (w + pad)
        sheet.paste(Image.fromarray(im).resize((w, h), Image.NEAREST), (X, top))
        d.text((X + 4, 6), label, fill=(255, 255, 255), font=font)
    sheet.save(os.path.join(out, 'saya-piernas-sin-armas@8.png'))


def main():
    nat = native()
    check_his(nat)
    ps = pieces()
    if len(sys.argv) > 1:
        write_ts(sys.argv[1], ps)
    if len(sys.argv) > 2:
        write_sheet(sys.argv[2], nat)


if __name__ == '__main__':
    main()
