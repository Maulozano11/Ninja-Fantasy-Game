"""The princess's hands from the owner's picture of her (docs/reference/princess-owner-reference.jpg), his
pixels one for one, as painted pieces that ride the rig in place of our body's hands:

  HAND_N  her near hand, open on her skirt with the fingers down and back (top_rose_bodice draws it, on the
          near cuff: src/sprite/items/princessTop.ts)
  FIST_F  her far fist round the sceptre's shaft (held_rose_sceptre draws it over the sceptre:
          src/sprite/items/princessSceptre.ts)

His picture is drawn at our game's scale (tools/refs/princess_ref.py: one of his pixels is one fine pixel of
ours). Each cell is his pixel moved to the nearest of his colours (princess_ref.quantize).

HAND_N is his hand (princess_ref's part 'body' below the near cuff) and his line round it: the line pixels
next to it, which princess_ref gives to the skirt or the cuff (the front-most part beside them) and which
tools/refs/princess-skirt-from-ref.py leaves to the hand by the same rule. It rides the near cuff: its pivot
and angle are the cuff's (tools/refs/princess-top-from-ref.py CUFF_N: the cell of our near elbow at idle,
the angle of our forearm there), so where the cuff is as he drew it the hand is too, every pixel his.

FIST_F is his fist round the shaft (his rows 42-49): his skin, his line, and the bits of the shaft he shows
between and under the fingers, in his browns. It pivots on the sceptre's grip (tools/refs/princess-sceptre-
from-ref.py PIVOT, his (72, 46)) at the sceptre's angle, so drawn over the sceptre at the sceptre's grip and
angle every pixel of both is his.

Colour kinds: his skin tones follow the player's skin (from SKIN_BASE, his commonest skin, the bodice's);
the shaft's golds and browns in the fist follow the sceptre's gold; his black line stays.

Writes <ts> (src/sprite/items/princessHandsArt.ts) and, with --preview <dir>, his crop beside the pieces at
12x (manos@12.png, Spanish labels). The same picture always gives the same bytes. From the repository root:

  python3 -I tools/refs/princess-hands-from-ref.py [src/sprite/items/princessHandsArt.ts] [--preview <dir>]
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw, ImageFont  # noqa: E402

import princess_ref as P  # noqa: E402

# Where the near hand is, in his pixels (inclusive): below his near cuff's frill, on the skirt.
NEAR_BOX = (26, 53, 40, 61)
# The cuff's pivot and angle (princess-top-from-ref.py): his near elbow's cell at the top piece's offset
# (74, 122), and our forearm's angle at idle (princess_ref.OUR_JOINTS elbowN to wristN).
TOP_OFF = (74, 122)
J = P.OUR_JOINTS
CUFF_N_PIVOT = (int(np.floor(J['elbowN'][0])) - TOP_OFF[0], int(np.floor(J['elbowN'][1])) - TOP_OFF[1])
CUFF_N_ANGLE = float(np.degrees(np.arctan2(J['wristN'][1] - J['elbowN'][1], J['wristN'][0] - J['elbowN'][0])))

# His far fist round the shaft: every cell he drew in these rows and columns (inclusive), and his fist's
# line just outside them: its top knuckle (72, 42), the corner by the cuff (70, 48) and its bottom (74, 49).
FIST_BOX = (71, 43, 76, 48)
FIST_MORE = [(72, 42), (70, 48), (74, 49)]
# The sceptre's grip and angle (princess-sceptre-from-ref.py PIVOT, SHAFT_BOTTOM, SHAFT_TOP).
GRIP = (72, 46)
SHAFT_BOTTOM = (70.5, 55.5)
SHAFT_TOP = (76.5, 36.5)
FIST_ANGLE = math.degrees(math.atan2(SHAFT_TOP[1] - SHAFT_BOTTOM[1], SHAFT_TOP[0] - SHAFT_BOTTOM[0]))

# His commonest skin tone: the colour the player's skin turns his from (the bodice's, PRINCESS_TOP_SKIN[0]).
SKIN_BASE = '#f6c8aa'

CHARS = 'kabcdefghijlmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'


def is_line(c):
    return P.luma(np.asarray(c)[None, :])[0] < 45


def hexs(c):
    return '#%02x%02x%02x' % tuple(int(v) for v in c)


def near_cells(Q, pm):
    """His near hand: the 'body' cells in NEAR_BOX and the line pixels next to them (8 ways)."""
    hand = pm == P.PARTS.index('body')
    x0, y0, x1, y1 = NEAR_BOX
    cells = {(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1) if hand[y, x]}
    for (x, y) in list(cells):
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                q = (x + dx, y + dy)
                if q not in cells and x0 <= q[0] <= x1 and y0 <= q[1] <= y1 and is_line(Q[q[1], q[0]]):
                    cells.add(q)
    return cells


def fist_cells(Q, white):
    """His far fist: every cell he drew in FIST_BOX, and FIST_MORE."""
    x0, y0, x1, y1 = FIST_BOX
    cells = {(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1) if not white[y, x]}
    for p in FIST_MORE:
        if not is_line(Q[p[1], p[0]]):
            raise SystemExit(f'{p} is not his line')
        cells.add(p)
    return cells


def kind(c, fam):
    if is_line(c):
        return 'line'
    return 'skin' if P.FAMILIES[fam] == 'skin' else 'gold'


def piece(cells, Q, fams, pivot_his, angle):
    xs = [x for x, _ in cells]
    ys = [y for _, y in cells]
    bx0, by0 = min(xs), min(ys)
    cols = sorted({hexs(Q[y, x]) for x, y in cells}, key=lambda h: (not is_line(P.rgb(h)), -float(P.luma(P.rgb(h)[None, :])[0]), h))
    ch = {h: CHARS[i] for i, h in enumerate(cols)}
    kinds = {}
    for x, y in cells:
        kinds.setdefault(hexs(Q[y, x]), set()).add(kind(Q[y, x], fams[y, x]))
    for h, k in kinds.items():
        if len(k) > 1:
            raise SystemExit(f'{h} is of two kinds: {k}')
    rows = [''.join(ch[hexs(Q[y, x])] if (x, y) in cells else '.' for x in range(bx0, max(xs) + 1)) for y in range(by0, max(ys) + 1)]
    pivot = (pivot_his[0] - bx0, pivot_his[1] - by0)
    return {'rows': rows, 'pivot': pivot, 'angle': angle, 'colors': {ch[h]: h for h in cols},
            'skin': ''.join(ch[h] for h in cols if kinds[h] == {'skin'}),
            'gold': ''.join(ch[h] for h in cols if kinds[h] == {'gold'}), 'origin': (bx0, by0)}


def main():
    args = sys.argv[1:]
    preview = None
    if '--preview' in args:
        i = args.index('--preview')
        preview = args[i + 1]
        del args[i:i + 2]
    path = args[0] if args else 'src/sprite/items/princessHandsArt.ts'
    N = P.native()
    Q = P.quantize(N.astype(int))
    pm = P.part_map()
    fams = P.family(N)
    white = P.background(N)

    near = piece(near_cells(Q, pm), Q, fams, CUFF_N_PIVOT, CUFF_N_ANGLE)
    fist = piece(fist_cells(Q, white), Q, fams, GRIP, FIST_ANGLE)
    if near['gold']:
        raise SystemExit('the near hand has gold in it')
    write_ts(path, near, fist)
    for name, p in (('HAND_N', near), ('FIST_F', fist)):
        print(name, len(p['rows']), 'x', len(p['rows'][0]), 'origin', p['origin'], 'pivot', p['pivot'], 'angle %.2f' % p['angle'],
              'colours', len(p['colors']), 'skin', p['skin'], 'gold', p['gold'])

    if preview:
        os.makedirs(preview, exist_ok=True)
        k = 12
        panels = []
        for p, a in ((near, 'Mano cercana'), (fist, 'Mano lejana')):
            (bx0, by0), rows = p['origin'], p['rows']
            H, W = len(rows) + 2, len(rows[0]) + 2
            his = N[by0 - 1:by0 + H - 1, bx0 - 1:bx0 + W - 1].astype(np.uint8)
            ours = np.full((H, W, 3), 255, np.uint8)
            for y, r in enumerate(rows):
                for x, c in enumerate(r):
                    if c != '.':
                        ours[y + 1, x + 1] = P.rgb(p['colors'][c])
            panels += [(his, a, 'Tu dibujo'), (ours, a, 'La pieza')]
        gap, top = 24, 46
        Wt = sum(img.shape[1] * k + gap for img, _, _ in panels) - gap
        Ht = max(img.shape[0] for img, _, _ in panels) * k + top
        sheet = Image.new('RGB', (Wt, Ht), 'white')
        d = ImageDraw.Draw(sheet)
        font = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
        font = ImageFont.truetype(font, 14) if os.path.exists(font) else None
        x = 0
        for img, a, b in panels:
            sheet.paste(Image.fromarray(img).resize((img.shape[1] * k, img.shape[0] * k), Image.NEAREST), (x, top))
            d.text((x + 4, 6), a, fill=(0, 0, 0), font=font)
            d.text((x + 4, 24), b, fill=(0, 0, 0), font=font)
            x += img.shape[1] * k + gap
        sheet.save(os.path.join(preview, 'manos@12.png'))


def write_ts(path, near, fist):
    def lit(v):
        return "'" + v.replace('\\', '\\\\').replace("'", "\\'") + "'"

    def block(name, p, doc):
        out = ['/**'] + [f' * {line}' for line in doc] + [f" * Its cell (0, 0) is his pixel {p['origin']}.", ' */']
        out += [f'export const {name}: PaintedPiece = {{', f"  pivot: [{p['pivot'][0]}, {p['pivot'][1]}],", f"  angle: {p['angle']:.2f},", '  rows: [']
        out += [f'    {lit(r)},' for r in p['rows']]
        out += ['  ],', '  colors: {']
        out += [f'    {c}: {lit(h)},' for c, h in p['colors'].items()]
        out += ['  },', '};', '']
        return out

    out = [
        "// The princess's hands, the owner's pixels at our game's scale (tools/refs/princess-hands-from-ref.py from",
        '// docs/reference/princess-owner-reference.jpg). Generated: rerun the script to change it.',
        '',
        "import type { PaintedPiece } from '../painted';",
        '',
        '/** His commonest skin tone: the player\'s skin moves his skin tones from it. */',
        f"export const PRINCESS_HAND_SKIN_BASE = '{SKIN_BASE}';",
        '',
    ]
    out += block('PRINCESS_HAND_N', near, [
        'Her near hand, open on her skirt, the fingers down and back, with his line round it. It rides the near',
        "cuff (PRINCESS_CUFF_N's pivot and angle: our near elbow, our forearm), so where the cuff is as he drew it",
        'the hand is too.'])
    out += [f"/** The characters of PRINCESS_HAND_N's skin tones (the rest is his line). */",
            f"export const PRINCESS_HAND_N_SKIN = {lit(near['skin'])};", '']
    out += block('PRINCESS_FIST_F', fist, [
        "Her far fist round the sceptre's shaft, with the bits of the shaft he shows between and under the",
        "fingers: pivot on the sceptre's grip, at the sceptre's angle, drawn over it."])
    out += [f"/** The characters of PRINCESS_FIST_F's skin tones, and of the shaft's golds and browns in it. */",
            f"export const PRINCESS_FIST_F_SKIN = {lit(fist['skin'])};",
            f"export const PRINCESS_FIST_F_GOLD = {lit(fist['gold'])};", '']
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write('\n'.join(out))
    os.replace(tmp, path)


if __name__ == '__main__':
    main()
