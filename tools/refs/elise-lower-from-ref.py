"""Elise's lower clothes from the owner's picture (docs/reference/elise-owner-reference.jpg), at our scale.

Her picture is not at our scale (tools/refs/heroine_ref.py: one of our fine pixels is about 2.4 of
hers across and 2.7 down). The study (tools/refs/heroine-study.py) laid her figure on our female idle
and redrew everything below her head there by hand in her colours (heroine_ref.reduced()). This
script draws her skirt, her coat's tails, her belts and her gloves on that layout once more, a pixel
at a time after her own pixels (heroine_ref.native('elise')), in her colours only (every colour is one
of heroine_ref.PALETTES['elise']), and cuts them into the pieces that ride our rig:

  skirt     her dark navy pleated skirt with its gold hem: pleats lit toward the light, creased in her
            darkest navy, the hem in her gold over her black line. It hangs from the pelvis: its top
            turns with the torso, the pleats below hang part of the way back toward plumb.
  coat      her blue coat from the waist down, open at the front: the two front edges over the hips
            (her gold trim, her blue, her gold meander), and behind the legs the near tail that flares
            back to a point (her black line, her shadowed gold along its outer edge, her bright gold
            along its opening edge, a gold line inside the hem, her diagonal folds in three blues), her
            pale grey lining between the legs (smooth, softly shaded) and the far tail's edge at the
            right. It hangs from the pelvis: its top turns with the torso, the cloth below hangs part
            of the way back toward plumb (eliseLower.ts hangPixels).
  belt      her two brown belts across the hips, the lower one with its steel buckle at the near side,
            and the small leather box pouch with its steel lid at the far hip. It rides the pelvis.
  gloves    her blue fingerless gloves: the near fist round a grip (her glove over the back of the
            hand, her fingers bare under it) and the far hand hanging (the glove over the palm, her
            fingers bare). The other hand pictures are ours, in her glove blues with bare fingertips
            (GLOVE_TONES).

The hidden parts are continued from what shows: the near tail behind her hand and hilt, the lining
behind her boots, the skirt's sides under the coat (so it stands on its own), the belts behind the
near arm. The fists sit on our grip, where every weapon's handle passes.

It writes the pieces as TypeScript (src/sprite/items/eliseLowerArt.ts) and, in <study>, her crop
beside ours at the same size (eliselower-compare.png). The same picture always gives the same bytes:

  python3 -I tools/refs/elise-lower-from-ref.py src/sprite/items/eliseLowerArt.ts <study>
"""

import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

import heroine_ref as H  # noqa: E402

WHICH = 'elise'

# Her colours by character (every one is in heroine_ref.PALETTES['elise']).
KEY = {
    'k': '#080613',  # her black line
    # coat blues, lit to shadowed, and her navy
    '4': '#4068ac', '3': '#3662af', '5': '#2d5090', '2': '#263d7d', '1': '#1b2858',
    # gold trim: highlight, lit, base, shadowed, darkest
    'y': '#fce89e', 'h': '#dcb06e', 'Y': '#ddac5a', 'o': '#a47043', 'O': '#9e6637',
    # lining greys, shadow to light
    'a': '#525368', 'g': '#6a6b80', 'G': '#8d8ea0', 'I': '#9f9fac', 'm': '#c4c4ce', 'i': '#ced0dc',
    # skirt navies and the pleats' sheen
    'j': '#385c9e', 'e': '#354566', 'X': '#26263e', 'K': '#181b37',
    # hem gold
    'H': '#e6b75e', 'J': '#b27b44',
    # belt leathers
    'L': '#804936', 'f': '#614a48', 'n': '#4e3739', 'N': '#342325',
    # steel of the buckle and the pouch's lid
    'W': '#eaeaf3', 'S': '#b6b6bd', 't': '#787782', 'p': '#686771', 'w': '#fefef9', 'v': '#a8a8b9',
    # the pouch's leathers
    'c': '#683c30', 'd': '#865339',
    # skin of her fingers (her hand's)
    's': '#facdac', 'z': '#e59580', 'Z': '#d68271', 'r': '#f3ae92',
}
PALETTE = set(H.PALETTES[WHICH])
assert set(KEY.values()) <= PALETTE, sorted(set(KEY.values()) - PALETTE)

# ---------------------------------------------------------------------------------------------
# The art, in our 256 x 256 frame at the female idle (heroine_ref.OUR_JOINTS): blocks (x0, y0, rows),
# '.' empty. Each piece is one or more blocks painted in order.
# ---------------------------------------------------------------------------------------------


def blank():
    return np.full((H.GRID, H.GRID), '.', dtype='<U1')


def paint(grid, x0, y0, rows):
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != '.':
                grid[y0 + j, x0 + i] = ch


# The pleated skirt: rows 173 (its top, under the belts) to 183 (her black line under the hem), as
# wide as our hips (the coat's front edges cover its sides in her picture). Her pleats are about two
# of our pixels each: a lit face, a shadowed fold and a crease, the far half turning away into her
# darker navies; the top row in the belts' shadow; the hem one row of her gold with her darker gold
# in the creases, the gold's lower half below it.
SKIRT = (112, 173, [
    '.kkkkkkkkkkkkkkkkkkkkkkkkkkkkk.',
    '.kXXKXXKXXKXXKXXKXXKXXKXXKXXKk.',
    '.kjeXjeXjeXjeXeeXeeXeXKeXKeXKk.',
    '.keeXjeXjeXjeXeeXeeXeXKeXKeXKk.',
    '.keeXeeXeeXjeXeeXeeXeXKeXKeXKk.',
    '.keeXeeXeeXeeXeeXeeXeXKeXKeXKk.',
    '.keeXeeXeeXeeXeeXeeXeXKeXKeXKk.',
    'keeXeeXeeXeeXeeXeeXeeXKeXKeXKKk',
    'keeXeeXeeXeeXeeXeeXeeXKeXKeXKKk',
    'kHHJHHJHHJHHJHHJHHJHHJHHJHHJHHk',
    'kJJJJJJJJJJJJJJJJJJJJJJJJJJJJJk',
    'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
])

# Her coat from the waist down, open at the front. Drawn row by row from its edges (where her black
# line, her gold trims and her folds fall), after her picture:
#   the hips      the coat's two front panels over the hips, over the skirt (in front of the body): the
#                 near one from her shadowed gold outer edge to her bright gold opening edge, with her
#                 gold line inside it; the far one narrowing round the hip.
#   the near tail below the hips it flares back behind the near leg: her black fold line across its
#                 top with her navy under it, her shadowed gold down its outer edge, her gold along the
#                 hem rising to the back and along the opening edge, a gold line inside the hem and up
#                 the opening edge, and her diagonal folds (light, mid, navy) running with the opening.
#   the lining    her greys between and behind the legs, in shadow under the skirt, her lighter folds
#                 running down, its hem a little above the tails'.
#   the far tail  the far front edge seen from the side, from the hip down past the far leg: her gold
#                 opening edge, her blues, her gold line, her gold outer edge and black line.
# Rows are (row, left, right) extents in our frame, both ends included (the outline pixels).
HIP_N = [(173, 111, 119), (174, 111, 119), (175, 110, 119), (176, 110, 119), (177, 109, 119), (178, 108, 119),
         (179, 107, 119), (180, 106, 119), (181, 105, 118), (182, 104, 118), (183, 103, 118)]
HIP_F = [(173, 133, 137), (174, 133, 138), (175, 133, 138), (176, 134, 139), (177, 134, 139), (178, 134, 139),
         (179, 135, 140), (180, 135, 140), (181, 135, 140), (182, 136, 141), (183, 136, 141)]
FLAP_N = [(184, 102, 118), (185, 101, 117), (186, 100, 117), (187, 99, 116), (188, 99, 116), (189, 99, 115),
          (190, 99, 115), (191, 99, 114), (192, 99, 114), (193, 99, 113), (194, 99, 113), (195, 99, 112),
          (196, 99, 112), (197, 99, 112), (198, 100, 111), (199, 101, 111), (200, 102, 111), (201, 103, 110),
          (202, 104, 110), (203, 105, 110), (204, 106, 109)]
TAIL_F = [(184, 136, 142), (185, 137, 142), (186, 137, 143), (187, 137, 143), (188, 138, 143), (189, 138, 144),
          (190, 138, 144), (191, 139, 144), (192, 139, 145), (193, 139, 145), (194, 140, 145), (195, 140, 146),
          (196, 140, 146), (197, 141, 146), (198, 141, 147), (199, 141, 147), (200, 142, 147), (201, 142, 148),
          (202, 142, 148), (203, 143, 148), (204, 143, 148)]
# Her lining is smooth and pale, shaded softly in broad planes: her soft grey over most of it, her
# pale grey where it turns to the light between the legs (LINING_LIT, from a few rows below the
# skirt down), her lightest grey where light catches it over the hem, and toward the tails' edges and
# up into the skirt's shadow it darkens a step at a time through her greys (LINING_RAMP, darkest at
# the edge), never a hard line.
LINING_LIT = range(123, 132)
LINING_LIGHT = {125, 126, 127}
LINING_RAMP = 'aagG'
# The lining's hem: the row of its black line under each column (it falls a little to the far side).
LINING_HEM = {x: 199 + (x - 110) // 12 for x in range(108, 146)}

# Her folds on the near tail, by how far a pixel is from the opening edge (its gold is 1): light
# next to the gold, a mid fold, her navy, light again, mid, navy toward the outer edge.
FOLDS_N = {2: '3', 3: '3', 4: '3', 5: '2', 6: '3', 7: '3', 8: '3', 9: '2', 10: '1', 11: '2', 12: '3', 13: '3', 14: '2', 15: '1', 16: '1'}
# ...and by how far it is from the outer edge (her gold is 1): her navy along it, then a mid fold.
EDGE_N = {2: '1', 3: '2'}


def coat_hips():
    g = blank()
    for y, L, R in HIP_N:
        g[y, L] = 'k'
        g[y, L + 1] = 'O'
        for x in range(L + 2, R):
            d = R - x
            # her opening edge's gold, her light blue beside it, her gold line inside, her blues out
            # to the outer edge in its shadow
            g[y, x] = {1: 'Y', 2: '3', 3: 'Y', 4: '3', 5: '3'}.get(d, '1' if x == L + 2 else '2' if x == L + 3 else '3')
        g[y, R] = 'k'
    for y, L, R in HIP_F:
        g[y, L] = 'k'
        g[y, L + 1] = 'Y'
        for x in range(L + 2, R - 1):
            g[y, x] = '3' if x == L + 2 else '2' if x < R - 2 else '1'
        g[y, R - 1] = 'Y'
        g[y, R] = 'k'
    # her gold meander on the near panel: the inner line steps out and back
    for (x, y) in [(114, 175), (114, 176), (114, 180), (114, 181)]:
        g[y, x] = 'h'
    for (x, y) in [(115, 175), (115, 176), (115, 180), (115, 181)]:
        g[y, x] = '3'
    return g


def coat_back():
    g = blank()
    # the lining first, from the near tail's opening edge to the far tail's
    flap = {y: (L, R) for y, L, R in FLAP_N}
    tail = {y: (L, R) for y, L, R in TAIL_F}
    for y in range(184, 206):
        lo = flap[y][1] + 1 if y in flap else 108
        hi = tail[y][0] - 1 if y in tail else 142
        for x in range(lo, hi + 1):
            hem = LINING_HEM[x]
            if y > hem:
                continue
            if y == hem:
                g[y, x] = 'k'
                continue
            ch = 'I'
            if y >= 189 and x in LINING_LIT:
                ch = 'm'  # its pale plane turned to the light
            if y >= hem - 3 and x in LINING_LIGHT:
                ch = 'i'  # light over the hem
            # how near the tails' edges or the skirt's shadow it is: there it darkens a step at a time
            d = min(x - lo, hi - x, max(0, y - 185))
            if d < len(LINING_RAMP):
                ch = LINING_RAMP[d]
            g[y, x] = ch
    # the near tail
    for i, (y, L, R) in enumerate(FLAP_N):
        prevL = FLAP_N[i - 1][1] if i else HIP_N[-1][1]
        last = y == FLAP_N[-1][0]
        for x in range(L, R + 1):
            d = R - x
            e = x - L
            if last or x == L or x == R or x < prevL:
                g[y, x] = 'k'
                continue
            if y >= 198 and e == 1:
                g[y, x] = 'Y'  # the hem's gold rising to the back
                continue
            if y < 198 and e == 1:
                g[y, x] = 'O'  # her shadowed gold down the outer edge
                continue
            if d == 1:
                g[y, x] = 'Y'
                continue
            if x <= prevL + 1 and y <= 189:
                g[y, x] = '1'  # navy under the fold line
                continue
            # the gold line inside the hem and up the opening edge
            if (y >= 197 and e == 3) or (y >= 195 and d == 3):
                g[y, x] = 'Y' if (x + y) % 5 else 'h'
                continue
            g[y, x] = EDGE_N.get(e) or FOLDS_N.get(d, '1')
    # the far tail
    for i, (y, L, R) in enumerate(TAIL_F):
        last = y == TAIL_F[-1][0]
        for x in range(L, R + 1):
            if last or x == L or x == R:
                g[y, x] = 'k'
                continue
            e = x - L
            d = R - x
            if y == TAIL_F[-2][0]:
                g[y, x] = 'Y'
                continue
            if e == 1 or d == 1:
                g[y, x] = 'Y'
                continue
            if d == 2 and y >= 193:
                g[y, x] = 'h' if y % 4 == 0 else 'Y'  # her gold line inside the outer edge
                continue
            g[y, x] = '3' if e == 2 else '2' if d > 2 else '1'
    return g


# Her two belts across the hips, as narrow as hers at our scale (a row of leather each, the lower one
# two): the upper one from the coat's near opening edge to the far hip, the lower one from behind the
# near arm to the far hip with its steel buckle at the near side; both end under the pouch. Her small
# leather pouch hangs on them at the far hip as the reduced reference has it: a box with her steel lid
# (her white and grey) over her browns, her line round it.
BELT = (112, 168, [
    '.......kkkkkkkkkkkkkkkkk.',
    '......kLLfLLLfLLLfLLLfLLk',
    '.kkkkkkkkkkkkkkkkkkkkkkkk',
    'kfLLLfLLLfLLLfLLLfLLLfLLk',
    'kNNnNNNnNNNnNNNnNNNnNNNnk',
    '.kkkkkkkkkkkkkkkkkkkkkkk.',
])
# the buckle on the lower belt, taller than it
BUCKLE = (116, 170, [
    'WSt',
    'SNt',
    'SNp',
    'tpp',
])
POUCH = (135, 166, [
    'kkkkkkkk',
    'kWwwWvkk',
    'kvvvvWkk',
    'knccdnkk',
    'kncdcnk.',
    'kncccnkk',
    'kncdcnkk',
    'knnnnnk.',
    '.kkkkk..',
])


def belt():
    g = blank()
    paint(g, *BELT)
    paint(g, *BUCKLE)
    paint(g, *POUCH)
    return g


# The gloves. The near fist round a grip, drawn as our grip fist stands at idle (ctx.ts HAND_GRIP on
# the near wrist, which is its pivot): her blue glove over the wrist and the back of the hand, lit
# along its top, her fingers bare under it with her darker skin between them. The far hand hanging
# open at her side (our far fist's place, the far wrist its pivot): the glove over the palm, her
# fingers bare below it.
GLOVE_N = (104, 173, [
    '....k55k...',
    '...k5555k..',
    '..k55555k..',
    '.k555551k..',
    'k5555511k..',
    'k5551111k..',
    'k5111111k..',
    'kszszszZk..',
    'kszszszZk..',
    '.kzkzkzk...',
    '..k.k.k....',
])
GLOVE_F = (137, 174, [
    'k5551k..',
    'k55111k.',
    'k51111k.',
    'kssszZk.',
    'kszszZk.',
    'kzszZZ.k',
    '.kZkZk..',
    '..k.k...',
])

# Our hand pictures (open, pointing, relaxed, cradling) in her glove, by their shades (line, crease,
# shadow, base, light): her black line, her navy, her darker and lighter glove blues.
GLOVE_TONES = ['#080613', '#1b2858', '#1b2858', '#2d5090', '#345ea9']
for t in GLOVE_TONES:
    assert t in PALETTE, t
# The skin her fingers are painted in (her face's base): the character's skin moves them as far.
HAND_SKIN = '#facdac'
# The bare fingertips of our hand pictures in her glove, by the same shades: her fingers' skin (the
# shadow between her fingers, its lighter tone, her base), so no colour of ours shows past her glove.
FINGER_TONES = ['#d68271', '#d68271', '#e59580', '#facdac', '#facdac']
for t in FINGER_TONES:
    assert t in PALETTE, t

OUT_DOC = (
    "// Elise's skirt, coat tails, belts and gloves from the owner's picture, brought down to our scale\n"
    '// (tools/refs/elise-lower-from-ref.py from docs/reference/elise-owner-reference.jpg).\n'
    '// Generated: rerun the script to change it.\n'
)


def piece_grid(blocks):
    g = blank()
    for x0, y0, rows in blocks:
        paint(g, x0, y0, rows)
    return g


def pieces():
    """Every piece in our frame: name -> (GRID, GRID) array of KEY characters ('.' empty)."""
    out = {'skirt': piece_grid([SKIRT])}
    out['coatBack'] = coat_back()
    out['coatFront'] = coat_hips()
    out['belt'] = belt()
    out['gloveN'] = piece_grid([GLOVE_N])
    out['gloveF'] = piece_grid([GLOVE_F])
    return out


def packed(grid):
    """A piece as its rows (trimmed to the painted box), origin and palette."""
    yy, xx = np.nonzero(grid != '.')
    x0, x1, y0, y1 = xx.min(), xx.max() + 1, yy.min(), yy.max() + 1
    rows = [''.join(grid[y, x0:x1]) for y in range(y0, y1)]
    used = sorted(set(''.join(rows)) - {'.'})
    return rows, (int(x0), int(y0)), {c: KEY[c] for c in used}


def angle(a, b):
    (ax, ay), (bx, by) = H.OUR_JOINTS[a], H.OUR_JOINTS[b]
    return float(np.degrees(np.arctan2(by - ay, bx - ax)))


def key(k):
    return k if re.match(r'^[A-Za-z_$][A-Za-z0-9_$]*$', k) else "'" + k + "'"


# Each piece: its constant, the joint it hangs from, the limb whose angle it was drawn at, its doc.
PIECES = {
    'skirt': ('ELISE_SKIRT', 'pelvis', ('pelvis', 'neck'),
              'Her pleated skirt with its gold hem, hung from the pelvis.'),
    'coatBack': ('ELISE_COAT_BACK', 'pelvis', ('pelvis', 'neck'),
                 "Her coat's tails behind the legs: the near tail flaring back to a point, the lining, the far tail's edge."),
    'coatFront': ('ELISE_COAT_FRONT', 'pelvis', ('pelvis', 'neck'),
                  "Her coat's front edges over the hips, over the skirt."),
    'belt': ('ELISE_BELT', 'pelvis', ('pelvis', 'neck'),
             'Her two belts across the hips, the steel buckle at the near side, the box pouch at the far hip.'),
    'gloveN': ('ELISE_GLOVE_N', 'wristN', ('wristN', 'handN'),
               'The near fist round a grip: her blue glove over the back of the hand, her fingers bare.'),
    'gloveF': ('ELISE_GLOVE_F', 'wristF', ('wristF', 'handF'),
               'The far hand hanging: her glove over the palm, her fingers bare.'),
}

# What each colour is, for the colour slots: her black line (it stays), her coat's blue, its gold,
# its lining, the skirt's navy, the hem's gold, the belts' leather, the buckle's steel, the pouch's
# gold, skin.
KIND = {
    '#080613': 'line',
    '#4068ac': 'coat', '#3662af': 'coat', '#263d7d': 'coat', '#1b2858': 'coat',
    '#fce89e': 'trim', '#dcb06e': 'trim', '#ddac5a': 'trim', '#a47043': 'trim', '#9e6637': 'trim',
    '#525368': 'lining', '#6a6b80': 'lining', '#8d8ea0': 'lining', '#9f9fac': 'lining', '#c4c4ce': 'lining', '#ced0dc': 'lining',
    '#385c9e': 'cloth', '#354566': 'cloth', '#26263e': 'cloth', '#181b37': 'cloth',
    '#e6b75e': 'hem', '#b27b44': 'hem',
    '#804936': 'leather', '#614a48': 'leather', '#4e3739': 'leather', '#342325': 'leather',
    '#eaeaf3': 'steel', '#b6b6bd': 'steel', '#787782': 'steel', '#686771': 'steel', '#fefef9': 'steel', '#a8a8b9': 'steel',
    '#683c30': 'leather', '#865339': 'leather',
    '#cf9b48': 'gold',
    '#2d5090': 'glove', '#345ea9': 'glove',
    '#facdac': 'skin', '#e59580': 'skin', '#d68271': 'skin', '#f3ae92': 'skin',
}
# The colours each slot recolours from (at these, every pixel is hers): her middle tone of each.
BASES = {
    'ELISE_COAT_BLUE': '#3662af',
    'ELISE_COAT_TRIM': '#ddac5a',
    'ELISE_COAT_LINING': '#9f9fac',
    'ELISE_SKIRT_CLOTH': '#354566',
    'ELISE_SKIRT_HEM': '#e6b75e',
    'ELISE_BELT_LEATHER': '#4e3739',
    'ELISE_BELT_STEEL': '#b6b6bd',
    'ELISE_GLOVE': '#2d5090',
}


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    P = pieces()
    packs = {name: packed(g) for name, g in P.items()}
    for name, (rows, _, pal) in packs.items():
        assert all(len(r) == len(rows[0]) for r in rows), name
        for h in pal.values():
            assert h in KIND, (name, h)
    # glove blues the hands we did not paint take
    for t in GLOVE_TONES[1:]:
        KIND.setdefault(t, 'glove')
    for t in FINGER_TONES:
        assert KIND[t] == 'skin', t

    out = [OUT_DOC, "import type { PaintedPiece } from '../painted';", '']
    out += ['/** Her colours the colour slots recolour from (at these, every pixel is hers). */']
    out += [f"export const {k} = '{v}';" for k, v in BASES.items()]
    out += [
        '',
        "/** The skin her fingers are painted in (her face's): the character's skin moves them as far. */",
        f"export const ELISE_HAND_SKIN = '{HAND_SKIN}';",
        '',
        "/** Her glove blues for the hands she did not paint, by our hand pictures' shades: line, crease, shadow, base, light. */",
        'export const ELISE_GLOVE_TONES = [' + ', '.join(f"'{t}'" for t in GLOVE_TONES) + '] as const;',
        '',
        "/** Her fingers' skin for the bare fingertips of the hands she did not paint, by the same shades. */",
        'export const ELISE_FINGER_TONES = [' + ', '.join(f"'{t}'" for t in FINGER_TONES) + '] as const;',
        '',
        "/** The tails' hem row in our frame at rest (the female idle): crouched or seated it hangs no lower above the ground. */",
        f'export const ELISE_COAT_HEM_Y = {packs["coatBack"][1][1] + len(packs["coatBack"][0]) - 1};',
        '',
        '/** What each colour of hers in these pieces is (her black line stays; the others follow their colour slot). */',
        "export const ELISE_KIND: Record<string, 'line' | 'coat' | 'trim' | 'lining' | 'cloth' | 'hem' | 'leather' | 'steel' | 'gold' | 'glove' | 'skin'> = {",
    ]
    out += [f"  '{h}': '{k}'," for h, k in KIND.items()]
    out += ['};', '']
    for name, (const, joint, (a, b), doc) in PIECES.items():
        rows, (ox, oy), palette = packs[name]
        jx, jy = H.OUR_JOINTS[joint]
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
        print(name, 'origin', origin, f'{len(rows[0])}x{len(rows)}', len(palette), 'colours')


def write_study(P, study):
    """Her picture's crop beside our pieces laid out at rest, the same size on screen: her pixels at
    8x, ours at 20x (one of ours is about 2.5 of hers)."""
    N = H.native(WHICH).astype(np.uint8)
    fig = H.figure(WHICH)
    paper = (235, 235, 240)
    x0, y0, x1, y1 = 8, 92, 152, 232
    a = N[y0:y1, x0:x1].copy()
    a[~fig[y0:y1, x0:x1]] = paper
    his = Image.fromarray(a, 'RGB').resize(((x1 - x0) * 8, (y1 - y0) * 8), Image.NEAREST)
    order = ['coatBack', 'skirt', 'coatFront', 'belt', 'gloveN', 'gloveF']
    bx0, by0, bx1, by1 = 94, 164, 152, 208
    o = np.full((by1 - by0, bx1 - bx0, 3), paper, np.uint8)
    for name in order:
        g = P[name][by0:by1, bx0:bx1]
        for (y, x), ch in np.ndenumerate(g):
            if ch != '.':
                o[y, x] = [int(KEY[ch][i:i + 2], 16) for i in (1, 3, 5)]
    ours = Image.fromarray(o, 'RGB').resize(((bx1 - bx0) * 20, (by1 - by0) * 20), Image.NEAREST)
    sheet = Image.new('RGB', (his.width + ours.width + 24, max(his.height, ours.height) + 30), (255, 255, 255))
    sheet.paste(his, (0, 30))
    sheet.paste(ours, (his.width + 24, 30))
    d = ImageDraw.Draw(sheet)
    d.text((6, 8), 'Tu dibujo', fill=(0, 0, 0))
    d.text((his.width + 30, 8), 'Nuestras piezas (a nuestra escala)', fill=(0, 0, 0))
    tmp = os.path.join(study, 'eliselower-compare.tmp.png')
    sheet.save(tmp)
    os.replace(tmp, os.path.join(study, 'eliselower-compare.png'))


if __name__ == '__main__':
    main()
