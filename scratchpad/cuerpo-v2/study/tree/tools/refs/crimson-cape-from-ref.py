"""The owner's red cape on his Aiden (docs/reference/aiden-owner-reference.jpg) as a cape.

His picture is our Aiden painted over in his own pixels (aiden_ref.py: one of his pixels is one fine
pixel of our sprites). His cape is red cloth with dark-red folds inside his black line: a mantle over
both shoulders (his pauldrons sit over it on the near side) that goes on behind the neck, and the
cloth falling behind the body on both sides to the calves: on the near side a wide flap, its lit
outer face cut in a long point and the dark inside cut shorter with a notch between them, on the far
side a narrower flap, its outer face hanging past the dark inside. His sword crosses it, his arms and
legs stand in front of it. This script lifts it out of his pixels:

  back    everything of his cape, behind the body: his pixels (cloth and line), and where his body,
          arms and sword hide it, the cloth carried on from his own (each hidden pixel takes the
          cloth below it, so his folds run on up, or beside it), inside the cape's outline drawn on
          across the hidden stretches (behind the near arm, behind the grip, behind the far arm,
          behind the neck, the hem behind the legs); where that outline is hidden his black line is
          carried along it. Our body is a little elsewhere than his, so this never shows a hole.
  near    the mantle over the near shoulder, his pixels: in front of the arm, under the armour (his
          pauldron sits over it)
  far     the mantle over the far shoulder, his pixels: in front of the far arm and the torso,
          behind the head

and writes, in <out>:

  cape.json           rows and palette (one character per colour of his, shared by the parts), the
                      pivots (the base of the neck for the back, the shoulders for the mantles), his
                      line's characters (and the one carried along hidden edges), his base red, and
                      which of the back's pixels are his own
  study/cape@8.png    the parts lifted out, at 8x (back, then the mantles over it)
  study/back@8.png    the back, with the pixels carried on under his body marked
  study/his@8.png     his figure there, at 8x

and, with a second argument, the game's module (src/sprite/items/crimsonCapeArt.ts). The same
picture always gives the same bytes. Run from the repo root with python3 -I:

  python3 -I tools/refs/crimson-cape-from-ref.py <out> [src/sprite/items/crimsonCapeArt.ts]
"""

import json
import os
import re
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import aiden_ref as R  # noqa: E402

# Where his cape is (x0, y0, x1, y1 exclusive): from the top of the mantle to the hem.
BOX = (10, 22, 86, 94)
# His face and neck between the two mantles (the gorget, the jaw): not the cape.
NECK_BOX = (46, 22, 58, 35)
# His sword's pommel and its red jewel, left of the cape: not the cape.
POMMEL_BOX = (20, 47, 27, 54)
# His blade, from the guard to the tip, crosses the cape: a straight band along its axis (a point on
# it, its angle, how far it reaches across and along), the blade and his line round it. The dark red
# relief of the blade is the cape's own reds, so it is told apart by where it is.
BLADE_AT = (59.64, 77.20)
BLADE_DEG = 35.87
BLADE_ACROSS = (-3.0, 3.7)
BLADE_ALONG = (-26.0, 24.0)
# The red jewel in the middle of the guard: not the cape.
GUARD_JEWEL = [(38, 62)]
# The white between the far flap's dark inside, its outer face and the blade, closed in by them.
HOLE_SEED = (73, 81)
# The cape's outline, his pixels (points on pixel centres), drawn on where it is hidden; where it is
# his own it runs in the white around him (which is never cape). Clockwise from the near mantle's tip.
OUTLINE = [
    # over the near mantle, in the white and under his hair
    (33.4, 29.0), (35.4, 26.6), (37.6, 25.6), (39.6, 24.6), (43.6, 24.6),
    # behind the neck, from mantle to mantle (hidden)
    (58.6, 25.6),
    # over the far mantle, in the white
    (59.4, 26.6), (61.6, 26.6), (63.6, 27.6), (65.4, 29.4),
    # behind the far arm and hand, inside their outline (hidden), to where the far flap comes out
    (66.0, 36.0), (67.0, 60.0), (69.6, 62.4),
    # down the far flap (white) and round the point of its outer face
    (84.0, 78.0), (84.0, 87.0), (77.6, 87.0), (77.6, 83.5), (76.6, 82.5), (75.6, 80.5),
    # under its dark inside's hem, over the white closed in there, then behind the blade and the far
    # leg (hidden)
    (68.0, 80.6), (54.5, 84.5),
    # between the legs (white)
    (54.5, 86.5), (44.0, 86.5),
    # behind the near leg (hidden)
    (35.6, 86.0),
    # up the hem of the near flap's dark inside, down the notch and round the point of its outer face
    # (white)
    (25.5, 80.5), (25.5, 93.5), (8.0, 93.5), (8.0, 70.0),
    # up its edge (white) to where it goes under the grip
    (24.6, 54.6),
    # behind the grip (hidden), to where it comes out above it beside the arm
    (28.6, 49.6),
    # behind the near arm, inside its outline (hidden), up to the mantle's tip
    (34.0, 30.4),
]
# The near mantle (over the near shoulder) and the far one (over the far shoulder): his cape there.
NEAR_BOX = (33, 22, 47, 36)
FAR_BOX = (57, 22, 68, 35)
# The joints the parts hang from, in his pixels (aiden_ref.JOINTS): the back from the base of the
# neck (it hangs round it, over both shoulders), each mantle from its shoulder.
PIVOTS = {'back': 'neck', 'near': 'shoulderN', 'far': 'shoulderF'}
# His line: darker than this (luma). His darkest red, inside the folds, is lighter.
LINE_LUMA = 24
# His base red, the lit outer face of the near flap: the colour slot's default. Recoloured, every
# other red of his moves the way it does (his line stays).
BASE = '#be2730'
# His darkest red, inside the folds: a hidden pixel with no cloth of his around it takes it.
INSIDE = (0x47, 0x0D, 0x23)


def inside(poly, xs, ys):
    """Even-odd test of pixel centres against a polygon."""
    out = np.zeros(xs.shape, bool)
    n = len(poly)
    for i in range(n):
        x0, y0 = poly[i]
        x1, y1 = poly[(i + 1) % n]
        if y0 == y1:
            continue
        cross = ((ys >= min(y0, y1)) & (ys < max(y0, y1)))
        xc = x0 + (ys - y0) * (x1 - x0) / (y1 - y0)
        out ^= cross & (xs < xc)
    return out


def n4(m):
    p = np.pad(m, 1)
    return [p[:-2, 1:-1], p[2:, 1:-1], p[1:-1, :-2], p[1:-1, 2:]]


def n8(m):
    """Pixels with one of `m` among their eight neighbours."""
    p = np.pad(m, 1)
    H, W = m.shape
    return np.logical_or.reduce([p[1 + dy:1 + dy + H, 1 + dx:1 + dx + W] for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx])


def main():
    out = sys.argv[1]
    os.makedirs(os.path.join(out, 'study'), exist_ok=True)
    a = R.native()
    H, W, _ = a.shape
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    L = R.luma(a)
    ys, xs = np.mgrid[0:H, 0:W]

    def box(bx):
        x0, y0, x1, y1 = bx
        return (xs >= x0) & (xs < x1) & (ys >= y0) & (ys < y1)

    # The white around him, and the white closed in under the far flap.
    bg = R.background(a)
    stack = [(HOLE_SEED[1], HOLE_SEED[0])]
    while stack:
        y, x = stack.pop()
        if bg[y, x] or L[y, x] <= 225:
            continue
        bg[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]

    # His blade's band.
    ux, uy = np.cos(np.radians(BLADE_DEG)), np.sin(np.radians(BLADE_DEG))
    along = (xs - BLADE_AT[0]) * ux + (ys - BLADE_AT[1]) * uy
    across = -(xs - BLADE_AT[0]) * uy + (ys - BLADE_AT[1]) * ux
    blade = (across >= BLADE_ACROSS[0]) & (across <= BLADE_ACROSS[1]) & (along >= BLADE_ALONG[0]) & (along <= BLADE_ALONG[1])
    notcape = blade | box(NECK_BOX) | box(POMMEL_BOX) | ~box(BOX)
    for x, y in GUARD_JEWEL:
        notcape[y, x] = True

    # His cape's reds: crimson, the blue over the green (his skin, hair, gold and the sword's glow keep
    # the green over the blue), from the lit outer face down to the darkest red inside the folds.
    red = ~bg & ~notcape & (r > g + 25) & (b > g + 4)
    # His line: the near-black round the reds and between them, a little purple (the red in it, the
    # green lowest), at the reds or at the corners of the line round them. The line of what stands in
    # front of the cape (his armour, the leg wraps, the grip) is a neutral black, his armour's dark
    # greys greener. Along the top of the mantles his line is the one the hair or the jaw above
    # shares, near-black of any tint: there it is the black over his reds.
    shape = inside(OUTLINE, xs.astype(float), ys.astype(float)) & ~bg & box(BOX)
    purple = ~bg & ~notcape & ~red & (L < LINE_LUMA) & (r >= g + 3) & (b >= g + 3) & ((L < 16) | (g < 0.5 * r))
    line = purple & n8(red)
    line |= purple & n8(line)
    below = np.zeros((H, W), bool)
    below[:-1] = (red | line)[1:]
    line |= ~bg & ~notcape & ~red & (L < LINE_LUMA) & below & (box(NEAR_BOX) | box(FAR_BOX))
    seen = (red | line) & shape
    assert not (red & ~shape).any(), 'a red of his is outside the outline'

    # The cape's outline: what is hidden inside it is the cape behind his body, arms and sword.
    hidden = shape & ~seen
    back = seen | hidden
    # Where the outline is hidden, his line goes on along it: the hidden pixels on its edge.
    edge = hidden & np.logical_or.reduce(n4(~back))
    col = a.copy()
    line_hex = {}
    for y, x in zip(*np.nonzero(line)):
        h = '#%02x%02x%02x' % tuple(col[y, x])
        line_hex[h] = line_hex.get(h, 0) + 1
    # His most common line colour.
    lc = max(sorted(line_hex), key=lambda h: line_hex[h])
    lc_rgb = np.array([int(lc[1:3], 16), int(lc[3:5], 16), int(lc[5:7], 16)])
    for y, x in zip(*np.nonzero(edge)):
        col[y, x] = lc_rgb
    # Inside, each hidden pixel takes the cloth below it (filled first, from the hem up), else beside
    # it, else above it: his folds run on up behind the body.
    done = seen | edge
    x0b, y0b, x1b, y1b = BOX
    for y in range(y1b - 1, y0b - 1, -1):
        for x in range(x0b, x1b):
            if not hidden[y, x] or done[y, x]:
                continue
            for qy, qx in ((y + 1, x), (y, x - 1), (y, x + 1), (y - 1, x)):
                if done[qy, qx] and not line[qy, qx] and not edge[qy, qx]:
                    col[y, x] = col[qy, qx]
                    break
            else:
                col[y, x] = INSIDE
            done[y, x] = True

    near = seen & box(NEAR_BOX)
    far = seen & box(FAR_BOX)

    # One palette for every part: one character per colour of his. The picture's compression leaves a
    # colour of his a few steps off here and there: colours within 3 of one he used more often are
    # that one (taken from the most used down), so each character holds the value he painted most.
    CHARS = 'abcdefhijklmnpqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&()*+,-/:;<=>?@[]^_{|}~'
    count = {}
    for y, x in zip(*np.nonzero(back)):
        k = tuple(int(v) for v in col[y, x])
        count[k] = count.get(k, 0) + 1
    refs = []
    for c in sorted(count, key=lambda k: (-count[k], k)):
        if not any(max(abs(c[i] - q[i]) for i in range(3)) <= 3 for q in refs):
            refs.append(c)
    # Characters in order of first use (top to bottom, left to right), each its group's value.
    palette = {}
    group = {}

    def char(c):
        k = tuple(int(v) for v in c)
        q = next(q for q in refs if max(abs(k[i] - q[i]) for i in range(3)) <= 3)
        if q not in group:
            group[q] = CHARS[len(group)]
            palette[group[q]] = '#%02x%02x%02x' % q
        return group[q]

    def pack(mask):
        yy, xx = np.nonzero(mask)
        x0, x1, y0, y1 = xx.min(), xx.max() + 1, yy.min(), yy.max() + 1
        rows = [''.join(char(col[y, x]) if mask[y, x] else '.' for x in range(x0, x1)) for y in range(y0, y1)]
        return {'rows': rows, 'origin': [int(x0), int(y0)]}

    parts = {'back': pack(back), 'near': pack(near), 'far': pack(far)}
    # Which of the back's pixels are his own (the others are carried on under his body).
    ox, oy = parts['back']['origin']
    parts['back']['his'] = [''.join(ch if ch != '.' and seen[oy + j, ox + i] else '.' for i, ch in enumerate(row)) for j, row in enumerate(parts['back']['rows'])]
    for name, p in parts.items():
        jx, jy = R.JOINTS[PIVOTS[name]]
        p['pivot'] = [int(np.floor(jx)) - p['origin'][0], int(np.floor(jy)) - p['origin'][1]]
        p['joint'] = PIVOTS[name]
    lum = lambda h: 0.299 * int(h[1:3], 16) + 0.587 * int(h[3:5], 16) + 0.114 * int(h[5:7], 16)
    line_chars = ''.join(ch for ch, h in palette.items() if lum(h) < LINE_LUMA)
    assert BASE in palette.values(), 'the base red is not one of his colours'
    meta = {'source': R.REF, 'palette': palette, 'line': line_chars, 'edge': char(lc_rgb), 'base': BASE, **parts}
    tmp = os.path.join(out, 'cape.json.tmp')
    with open(tmp, 'w') as f:
        json.dump(meta, f, indent=1)
        f.write('\n')
    os.replace(tmp, os.path.join(out, 'cape.json'))
    if len(sys.argv) > 2:
        write_ts(meta, sys.argv[2])

    def paint(rgba, p):
        ox, oy = p['origin']
        for j, row in enumerate(p['rows']):
            for i, ch in enumerate(row):
                if ch != '.':
                    h = palette[ch]
                    rgba[oy + j, ox + i] = [int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16), 255]

    rgba = np.zeros((H, W, 4), np.uint8)
    for name in ('back', 'near', 'far'):
        paint(rgba, parts[name])
    crop = (slice(18, 96), slice(8, 88))
    R.save(rgba[crop], os.path.join(out, 'study', 'cape@8.png'))
    marked = np.zeros((H, W, 4), np.uint8)
    paint(marked, parts['back'])
    marked[hidden & ~edge, :3] = (marked[hidden & ~edge, :3] * 0.55 + np.array([60, 140, 255]) * 0.45).astype(np.uint8)
    R.save(marked[crop], os.path.join(out, 'study', 'back@8.png'))
    R.save(a[crop], os.path.join(out, 'study', 'his@8.png'))
    print('palette', len(palette), 'colours; back', len(parts['back']['rows']), 'rows; hidden', int(hidden.sum()), 'px; line', line_chars)


def write_ts(meta, path):
    """The parts as the game's module (src/sprite/items/crimsonCapeArt.ts)."""
    def key(k):
        return k if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', k) else "'" + k + "'"

    out = [
        "// The owner's red cape on his Aiden, his pixels (tools/refs/crimson-cape-from-ref.py from",
        '// docs/reference/aiden-owner-reference.jpg). Generated: rerun the script to change it.',
        '',
        "import type { PaintedPart } from './capeArt';",
        '',
        '/** One character per colour of his (the parts share them). */',
        'const CRIMSON_CAPE_COLORS: Record<string, string> = {',
    ]
    out += [f"  {key(k)}: '{v}'," for k, v in meta['palette'].items()]
    out += ['};', '']
    out += ["/** His line's characters: they keep their colour when the cape is recoloured. */", f"export const CRIMSON_CAPE_LINE = '{meta['line']}';", '']
    out += ["/** His most common line colour: his line carried along the cape's outline where his body hides it, and along a cut. */", f"export const CRIMSON_CAPE_EDGE = '{meta['edge']}';", '']
    out += ["/** His base red (the lit outer face of the near flap): the colour slot's default. */", f"export const CRIMSON_CAPE_BASE = '{meta['base']}';", '']
    for part, name, doc in (
        ('back', 'CRIMSON_CAPE_BACK', 'The whole cape behind the body, from the mantle over the shoulders and behind the neck to the hems; what his body, arms and sword hide is his cloth carried on. Its pivot is the cell on the base of the neck.'),
        ('near', 'CRIMSON_CAPE_NEAR', 'The mantle over the near shoulder, in front of the arm and under the armour (his pauldron sits over it). Its pivot is the cell on the near shoulder.'),
        ('far', 'CRIMSON_CAPE_FAR', 'The mantle over the far shoulder, in front of the far arm and the torso, behind the head. Its pivot is the cell on the far shoulder.'),
    ):
        p = meta[part]
        out += [f'/** {doc} */', f'export const {name}: PaintedPart = {{', f"  pivot: [{p['pivot'][0]}, {p['pivot'][1]}],", '  rows: [']
        out += [f"    '{r}'," for r in p['rows']]
        out += ['  ],', '  colors: CRIMSON_CAPE_COLORS,', '};', '']
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        f.write('\n'.join(out))
    os.replace(tmp, path)


if __name__ == '__main__':
    main()
