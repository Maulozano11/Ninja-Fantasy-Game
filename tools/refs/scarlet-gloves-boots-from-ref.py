"""The owner's tall black boots and fingerless gloves from his Scarlet picture (docs/reference/scarlet-owner-reference.jpg).

His picture is not at our scale (tools/refs/scarlet_ref.py): the study (tools/refs/scarlet-study.py) brought
his figure down onto our male rig at idle frame 0 and drew his boots and gloves there at our scale after
his, in his colours (scarlet_ref.reduced_layers()). This script cuts them into the pieces that ride our
rig, every pixel one of his colours:

  the boots   on each leg the shaft (his black line round its top, the cuff with his strap across it and
              its bronze buckle, his shine down the shin), which turns with the shin about the ankle, and
              the foot (his toe with its shine, his black sole), which stays flat on the ground like our
              feet. The study left out his buckles and the far boot's ankle strap, a pixel or two at our
              scale each: they are put back from his pixels (BUCKLES), in his bronze. Each shaft runs on
              two rows under the foot's top (inside the foot), so the shin can turn without a gap at the
              ankle.
  the gloves  the near fist round a grip and the far fist hanging closed: his black leather over the back
              of the hand, lit on the side the light comes from, his skin on the fingertips (the far
              fist's narrowed to his, MENDS). The fist without a weapon is the same fist; the open,
              pointing, relaxed and cradling hands are our hand pictures in his leather (GLOVE_TONES),
              the fingertips bare in his skin (TIP_TONES).

His legs and hands in the study already stand on ours (his boots cover our feet, his fists our fists),
so each piece hangs from our joint as it is: at rest every pixel is where the study put it.

It writes the pieces as TypeScript (src/sprite/items/nobleBootsGlovesArt.ts) and, in <study>, his
boots and gloves (his pixels, at the height of ours) beside the pieces at 8x. The same picture always
gives the same bytes:

  python3 -I tools/refs/scarlet-gloves-boots-from-ref.py src/sprite/items/nobleBootsGlovesArt.ts <study>
"""

import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

import scarlet_ref as R  # noqa: E402

# Each piece: (layer of the study, first row, last row) in our frame. The near boot's shaft is its top
# line to the row over his ankle's jog, the foot from there to his sole's line; the far boot's foot
# starts where it widens toward the toe.
PIECES = {
    'shinN': ('legN', 196, 206),
    'footN': ('legN', 207, 218),
    'shinF': ('legF', 189, 200),
    'footF': ('legF', 201, 210),
    'gloveN': ('handN', 0, 255),
    'gloveF': ('handF', 0, 255),
}
# The joint each piece hangs from (the shafts turn with the shin about the ankle, the feet stay flat
# under it; the fists hang from the wrist) and the limb whose angle it was drawn at.
JOINT = {
    'shinN': ('ankleN', ('kneeN', 'ankleN')),
    'footN': ('ankleN', ('kneeN', 'ankleN')),
    'shinF': ('ankleF', ('kneeF', 'ankleF')),
    'footF': ('ankleF', ('kneeF', 'ankleF')),
    'gloveN': ('wristN', ('wristN', 'handN')),
    'gloveF': ('wristF', ('wristF', 'handF')),
}
# Each shaft's run-on under the foot: (piece, its row they copy, first row, last row, first x, last x),
# inside his line; the foot covers them at rest.
RUN_ON = [('shinN', 206, 207, 208, 116, 122), ('shinF', 200, 201, 202, 133, 140)]

# His buckles and the far boot's ankle strap, which the study left out: {(x, y): colour character
# (scarlet_ref.CHARS)} in our frame. Near: his buckle sits on the outer end of the strap, a row under its
# shine (his #5e4a33 at (60, 159), on the boot's edge); far: on the inner end, inside the boot's right
# edge (his #4e3c2b over #332a1e at (93, 157-158)); the far ankle strap: his lit strap across the front
# of the ankle (his #504e52 and #39383c at (93-95, 175-176)) to his buckle on the outside (#332a1e at
# (96, 174-175)).
BUCKLES = {
    'shinN': {(117, 199): 'y'},
    'shinF': {(139, 192): 'v', (139, 193): 'm'},
    'footF': {(137, 201): 't', (138, 201): 'B', (139, 201): 't', (140, 201): 'm'},
}

# His leather for our hand pictures' shades (line, crease, shadow, base, light), in scarlet_ref.CHARS: his
# black line, his darkest leather for the creases, and the three greys the back of his near glove is lit
# in, from its shaded side to the side the light comes from (#252328, #2e2d33, #39383c). A far hand takes
# them a shade down, as our bare far hand does.
GLOVE_TONES = 'adjnt'

# His skin for the bare fingertips of those hands, by our hand pictures' shades (line, shadow, base, light),
# in scarlet_ref.CHARS: his black line, then the three skins of his near fist's fingertips from its
# shaded side to its lit one (#b27758, #ca9c75, #f2c8aa), so they read as his fingers and not as ours.
TIP_TONES = 'aQX4'

# Mends by hand, in our frame: (piece, x0, y0, rows); '.' keeps the pixel, any other character is that
# colour of his. The far fist: the study's shows a whole row of fingers more than his and fingers across
# its whole width; his glove covers the fist down to its last rows and his fingertips are a small patch
# curled under it (his (103-106, 116-121): #b27758 and #be8867 over his browns #9e654b and #6f442a), so
# the leather goes on a row and the fingertips narrow to his.
MENDS = [
    ('gloveF', 138, 176, [
        '.adjfjfda',
        'aadfQUfda',
        '..aMzUba.',
        '...aQUa..',
    ]),
]

LINE = {'#040405', '#0f0407'}
BRONZE = {'#332a1e', '#4e3c2b', '#5e4a33', '#70583c'}
# The skin his face is painted in (the noble face's NOBLE_SKIN): the fingertips follow the character's
# skin from it as his head does.
SKIN = '#f8d4b8'

OUT_DOC = (
    "// The owner's tall black boots and fingerless gloves, from his Scarlet picture brought down to our scale\n"
    '// (tools/refs/scarlet-gloves-boots-from-ref.py from docs/reference/scarlet-owner-reference.jpg).\n'
    '// Generated: rerun the script to change it.\n'
)


def kind(h):
    """What a colour of his is here: his black line, his bronze, skin (the warm colours of his
    fingertips) or leather (his blacks and greys)."""
    if h in LINE:
        return 'line'
    if h in BRONZE:
        return 'bronze'
    r, g, b = (int(h[i:i + 2], 16) for i in (1, 3, 5))
    return 'skin' if r > b + 30 else 'leather'


def lum(h):
    r, g, b = (int(h[i:i + 2], 16) for i in (1, 3, 5))
    return 0.299 * r + 0.587 * g + 0.114 * b


def cut(lay, y0, y1):
    """A layer's pixels in rows y0..y1 as a (GRID, GRID) array of PALETTE indices (255 empty)."""
    out = np.full_like(lay, 255)
    out[y0:y1 + 1] = lay[y0:y1 + 1]
    return out


def pieces():
    """The pieces in our frame: name -> (GRID, GRID) PALETTE indices, 255 where empty."""
    lays = R.reduced_layers()
    ci = {c: i for i, c in enumerate(R.CHARS[:len(R.PALETTE)])}
    out = {name: cut(lays[lay], y0, y1) for name, (lay, y0, y1) in PIECES.items()}
    for name, src, y0, y1, x0, x1 in RUN_ON:
        p = out[name]
        for y in range(y0, y1 + 1):
            p[y, x0 + 1:x1] = p[src, x0 + 1:x1]
            p[y, x0] = p[y, x1] = ci['a']
    for name, px in BUCKLES.items():
        for (x, y), ch in px.items():
            assert out[name][y, x] != 255, (name, x, y)
            out[name][y, x] = ci[ch]
    for name, x0, y0, rows in MENDS:
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch != '.':
                    out[name][y0 + j, x0 + i] = ci[ch]
    return out


def packed(idx):
    """A piece as rows of colour characters (scarlet_ref.CHARS), its origin and palette."""
    yy, xx = np.nonzero(idx != 255)
    x0, x1, y0, y1 = xx.min(), xx.max() + 1, yy.min(), yy.max() + 1
    rows, used = [], set()
    for y in range(y0, y1):
        row = ''
        for x in range(x0, x1):
            v = idx[y, x]
            row += '.' if v == 255 else R.CHARS[v]
            if v != 255:
                used.add(int(v))
        rows.append(row)
    palette = {R.CHARS[i]: R.PALETTE[i] for i in sorted(used)}
    return rows, (int(x0), int(y0)), palette


def angle(a, b):
    (ax, ay), (bx, by) = R.OUR_JOINTS[a], R.OUR_JOINTS[b]
    return float(np.degrees(np.arctan2(by - ay, bx - ax)))


def key(k):
    return k if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', k) else "'" + k + "'"


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    P = pieces()
    packs = {name: packed(idx) for name, idx in P.items()}

    # The bases the colour slots recolour from: his leather of middle lightness in the boots and in the
    # gloves (half of his leather pixels are lighter, half darker), his buckle's bronze.
    def middle(names):
        cols = sorted((lum(R.PALETTE[v]), R.PALETTE[v]) for n in names for v in P[n][P[n] != 255] if kind(R.PALETTE[v]) == 'leather')
        return cols[len(cols) // 2][1]

    boots = ['shinN', 'footN', 'shinF', 'footF']
    gloves = ['gloveN', 'gloveF']
    bases = {'NOBLE_BOOT_LEATHER': middle(boots), 'NOBLE_BUCKLE': '#5e4a33', 'NOBLE_GLOVE_LEATHER': middle(gloves)}

    # His leather in tones for the hands he did not paint (GLOVE_TONES).
    tones = [R.PALETTE[R.CHARS.index(c)] for c in GLOVE_TONES]
    tips = [R.PALETTE[R.CHARS.index(c)] for c in TIP_TONES]

    kinds = {}
    for name in P:
        for h in packs[name][2].values():
            kinds[h] = kind(h)

    docs = {
        'shinN': ('NOBLE_SHAFT_N', 'The near boot\'s shaft: his black line round its top, the cuff with his strap across it and its bronze buckle on the outside, his shine down the shin. It turns with the shin about the ankle.'),
        'footN': ('NOBLE_FOOT_N', 'The near boot\'s foot, seen from the front: his toe with its shine, his black sole.'),
        'shinF': ('NOBLE_SHAFT_F', 'The far boot\'s shaft: his black line round its top, the strap with its bronze buckle, his shine down the shin. It turns with the shin about the ankle.'),
        'footF': ('NOBLE_FOOT_F', 'The far boot\'s foot pointing right: his ankle strap and its buckle, the shine over the toe, his black sole.'),
        'gloveN': ('NOBLE_GLOVE_N', 'The near fist round a grip: his black leather over the back of the hand, lit on the side the light comes from, his skin on the fingertips.'),
        'gloveF': ('NOBLE_GLOVE_F', 'The far fist hanging closed: his black leather, his skin on the curled fingertips.'),
    }

    out = [OUT_DOC, "import type { PaintedPiece } from '../painted';", '']
    out += ['/** His colours the colour slots recolour from (at these, every pixel is his). */']
    out += [f"export const {k} = '{v}';" for k, v in bases.items()]
    out += [
        '',
        "/** The skin he painted the fingertips in (his face's): the character's skin moves them as far. */",
        f"export const NOBLE_HAND_SKIN = '{SKIN}';",
        '',
        "/** His leather for the hands he did not paint, by our hand pictures' shades: line, crease, shadow, base, light. */",
        'export const NOBLE_GLOVE_TONES = [' + ', '.join(f"'{t}'" for t in tones) + '] as const;',
        '',
        "/** His skin for the bare fingertips of those hands, by our hand pictures' shades: line, shadow, base, light. */",
        'export const NOBLE_TIP_TONES = [' + ', '.join(f"'{t}'" for t in tips) + '] as const;',
        '',
        '/** What each colour of his in these pieces is: his black line (it stays), leather, his bronze or skin. */',
        "export const NOBLE_KIND: Record<string, 'line' | 'leather' | 'bronze' | 'skin'> = {",
    ]
    out += [f"  '{h}': '{k}'," for h, k in sorted(kinds.items(), key=lambda hk: lum(hk[0]))]
    out += ['};', '']
    for name, (const, doc) in docs.items():
        rows, (ox, oy), palette = packs[name]
        jname, (a, b) = JOINT[name]
        jx, jy = R.OUR_JOINTS[jname]
        out += [f'/** {doc} */', f'export const {const}: PaintedPiece = {{',
                f'  pivot: [{int(np.floor(jx)) - ox}, {int(np.floor(jy)) - oy}],', f'  angle: {angle(a, b):.2f},', '  rows: [']
        out += [f"    '{r}'," for r in rows]
        out += ['  ],', '  colors: {']
        out += [f"    {key(k)}: '{v}'," for k, v in palette.items()]
        out += ['  },', '};', '']
    text = '\n'.join(out)
    if out_ts:
        tmp = out_ts + '.tmp'
        with open(tmp, 'w') as f:
            f.write(text)
        os.replace(tmp, out_ts)

    if study:
        os.makedirs(study, exist_ok=True)
        write_study(P, study)
    for name, (rows, origin, palette) in packs.items():
        print(name, 'origin', origin, len(rows), 'rows', len(palette), 'colours')
    print('bases', bases, 'tones', tones)


def write_study(P, study):
    """His boots and gloves beside the pieces at rest, at the same size on screen: his pixels at 9x,
    ours at 16x (one of his is about 1.8 of ours): boots.png and gloves.png."""
    N = R.native().astype(np.uint8)
    bg = R.background(N.astype(np.int32))
    rgb = R.rgb().astype(np.uint8)
    paper = [235, 235, 240, 255]

    def ours(names, box):
        x0, y0, x1, y1 = box
        a = np.full((y1 - y0, x1 - x0, 4), paper, np.uint8)
        for n in names:
            idx = P[n][y0:y1, x0:x1]
            m = idx != 255
            a[m, :3] = rgb[idx[m]]
        return Image.fromarray(a, 'RGBA').resize(((x1 - x0) * 16, (y1 - y0) * 16), Image.NEAREST)

    def his(box):
        x0, y0, x1, y1 = box
        a = np.concatenate([N[y0:y1, x0:x1], np.full((y1 - y0, x1 - x0, 1), 255, np.uint8)], 2)
        a[bg[y0:y1, x0:x1]] = paper
        return Image.fromarray(a, 'RGBA').resize(((x1 - x0) * 9, (y1 - y0) * 9), Image.NEAREST)

    for fname, pairs in (
        ('boots.png', [((52, 146, 108, 192), (108, 186, 150, 220), ['shinF', 'footF', 'shinN', 'footN'])]),
        ('gloves.png', [((46, 104, 62, 126), (100, 172, 114, 186), ['gloveN']), ((98, 106, 112, 124), (136, 170, 150, 183), ['gloveF'])]),
    ):
        tiles = []
        for his_box, our_box, names in pairs:
            tiles += [his(his_box), ours(names, our_box)]
        w = sum(t.width for t in tiles) + 24 * (len(tiles) - 1)
        sheet = Image.new('RGBA', (w, max(t.height for t in tiles)), (255, 255, 255, 255))
        x = 0
        for t in tiles:
            sheet.paste(t, (x, 0))
            x += t.width + 24
        tmp = os.path.join(study, fname + '.tmp.png')
        sheet.save(tmp)
        os.replace(tmp, os.path.join(study, fname))


if __name__ == '__main__':
    main()
