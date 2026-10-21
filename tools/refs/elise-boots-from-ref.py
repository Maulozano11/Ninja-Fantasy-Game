"""Elise's thigh-high white steel boots, from the owner's Elise picture (docs/reference/elise-owner-reference.jpg).

His picture is not at our scale (tools/refs/heroine_ref.py): the study brought her figure down onto our
female rig at idle frame 0 (heroine_ref.reduced('elise')). Her boots there are drawn here again at our
scale, after her own pixels (heroine_ref.native('elise')), in her colours only, every pixel one of
heroine_ref.PALETTES['elise']:

  the cuff        her brown leather band round the top of the thigh: a dark top row against the bare
                  thigh, lit on the left, her gold rim along its foot;
  the greave      her steel down the thigh and shin: a bright stripe on the lit side, her pale steel,
                  her blue-grey shade on the right, and on the near leg the dark ridge of the plate;
  the knee cop    her round cop rimmed in gold, the steel inside lit at the top left;
  the ankle guard her round guard over the ankle: brown leather in a gold rim;
  the sabaton     her white steel foot: the near one seen from the front with a lame across the toe,
                  the far one pointing right, a shoe with a heel and a rounded toe; her dark sole.

What her picture hides and is filled here, after the parts of hers that show: the near cuff's left half
and most of the near knee cop are under her blade's light (filled as the far cuff and cop are drawn);
the right edge of the near greave and the far heel are under the blade (continued from the edge above
them). Her gold band at the near sole in the study is not in her picture (her sole is dark), so it is
not here.

The pieces ride our rig as the owner's sabatons do (src/sprite/items/feet.ts): on each leg the cuff and
the greave over the thigh turn with the thigh about the knee, the greave over the shin with its ankle
guard turns with the shin about the ankle, the sabaton stays flat on the ground like our feet, and the
knee cop, stamped last, turns with the shin about the knee and covers the joint. At rest every pixel is
where it is drawn here.

They are drawn on our old female body and re-laid on the female body v2 (elise_fit.py, LEG_ROWS):
the cuffs under the skirt, the greaves down to the new ankle, the sabatons as short as its feet.

It writes the pieces as TypeScript (src/sprite/items/eliseGreavesArt.ts) and, in <study>, her boots
(the study's reduced reference and her own pixels at the same height) beside ours at 8x. The same
picture always gives the same bytes:

  python3 -I tools/refs/elise-boots-from-ref.py src/sprite/items/eliseGreavesArt.ts <study>
"""

import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw, ImageFont  # noqa: E402

import elise_fit as F  # noqa: E402
import heroine_ref as R  # noqa: E402

WHICH = 'elise'

# Her colours by what they are here (every one is in PALETTES['elise']).
LEGEND = {
    '0': '#080613',  # her black line
    's': '#181b37',  # her dark sole
    'w': '#fefef9',  # steel: the glint
    'e': '#efeff9',  # steel: lit
    'L': '#ced0dc',  # steel: her pale steel, the main of the plate
    'M': '#8d8ea0',  # steel: shade
    'd': '#6a6b80',  # steel: deep shade
    'X': '#525368',  # steel: the plate's ridge
    'b': '#a0765a',  # leather: lit
    'B': '#7d564c',  # leather: her brown
    'k': '#4e3739',  # leather: shade
    'K': '#342325',  # leather: the dark top row
    'h': '#f8dc92',  # gold: glint
    'g': '#e6b75e',  # gold: her gold
    'G': '#cf9b48',  # gold: shade
    'o': '#905f3c',  # gold: deep shade
}
KIND = {'0': 'line', 's': 'line'}
KIND.update({c: 'steel' for c in 'weLMdX'})
KIND.update({c: 'leather' for c in 'bBkK'})
KIND.update({c: 'gold' for c in 'hgGo'})

# The near leg in our frame at idle frame 0: (first x, first row, rows). The cuff (185-188), the greave
# (189-204), the ankle guard (205-208).
NEAR = (110, 185, [
    '....0KKKKKKKKKKK0.',
    '....0gbbbBBBBBBk0.',
    '....0gbBBBBBBBkk0.',
    '....0GggggggggGG0.',
    '.....0wLLLLLLMd0..',
    '.....0wLLLLLLMd0..',
    '.....0wLLLLLLMd0..',
    '.....0wLLLLLLMd0..',
    '.....0wLLLLLLMd0..',
    '.....0wLLLLLLMd0..',
    '......0wLLLLLMd0..',
    '......0wLLLLLMd0..',
    '......0wLXLLMd0...',
    '......0wLXLLMd0...',
    '......0wLXLLMd0...',
    '......0wLXLLMd0...',
    '......0wLXLMd0....',
    '......0wLXLMd0....',
    '......0wLXLMd0....',
    '.....0wLXLMd0.....',
    '....0ggggggG0.....',
    '...0gbBBBBkG0.....',
    '...0gbBBBkkG0.....',
    '....0GgggGoo0.....',
])
# The near sabaton seen from the front (209-218), its top two rows under the ankle guard so the shin can
# turn without a gap at the ankle: a lame across the toe, her dark sole.
NEAR_FOOT = (110, 207, [
    '...0wLLLLMd0......',
    '...0wLLLLMd0......',
    '...0wLLLLMd0......',
    '..0weLLLLMd0......',
    '.0weLLLLLMd0......',
    '.0weLLLLLMd0......',
    '.0LMMMMMMMd0......',
    '.0wweLLLLMd0......',
    '.0weLLLLMMd0......',
    '.0eLLLLLMdd0......',
    '.0sssssssss0......',
    '..000000000.......',
])
# The far leg, a shade darker than the near as our far limbs are: the cuff (184-187), the greave
# (188-202), the ankle guard (203-206).
FAR = (128, 184, [
    '....0KKKKKKKKKK0......',
    '....0gbBBBBBBkk0......',
    '....0gBBBBBBkkK0......',
    '....0GggggggggG0......',
    '.......0eLLLLMd0......',
    '.......0eLLLLMd0......',
    '.......0eLLLLMd0......',
    '.......0eLLLLMd0......',
    '.......0eLLLMd0.......',
    '.......0eLLLMd0.......',
    '.......0eLLLMd0.......',
    '.......0eLLLMd0.......',
    '.......0eLLLMd0.......',
    '......0eLXLMd0........',
    '......0eLXLMd0........',
    '......0eLXLMd0........',
    '......0eLXLMd0........',
    '......0eLXMd0.........',
    '......0eLXMd0.........',
    '......0ggggG0.........',
    '.....0gBBBkkG0........',
    '.....0GBBkkKG0........',
    '......0GgggGo0........',
])
# The far sabaton pointing right (205-210), its instep under the ankle guard: her shoe, a heel at the
# back under the ankle (her dark sole, the arch open behind the ball of the foot) and a rounded toe
# no further out than hers, the instep rising to the ankle.
FAR_FOOT = (128, 205, [
    '....0wLLLLe0..........',
    '....0MLLLLLLew0.......',
    '....0MLLLLLLLLew0.....',
    '....0dMMLLLLLLLMd0....',
    '....0ss00ssssssss0....',
    '....000..00000000.....',
])
# Her round knee cops: (first x, first row, rows).
COP = {
    'N': (115, 189, [
        '..0gggG0..',
        '.0gweLMG0.',
        '.0gwLLMo0.',
        '.0GLLMMo0.',
        '.0GLMMdo0.',
        '..0Gooo0..',
        '...0000...',
    ]),
    'F': (135, 187, [
        '.0gggG0.',
        '0gwLLMG0',
        '0gLLLMo0',
        '0GLLMMo0',
        '.0GGoo0.',
        '..0000..',
    ]),
}
# Each leg's pieces: (first row, last row) of its drawing. The thigh's (the cuff and the greave down to
# the knee) overlaps the shin's by two rows behind the cop.
CUTS = {
    'N': {'thigh': (185, 194), 'shin': (193, 208)},
    'F': {'thigh': (184, 190), 'shin': (189, 206)},
}

OUT_DOC = (
    "// Elise's thigh-high white steel boots, from the owner's Elise picture brought down to our scale\n"
    '// (tools/refs/elise-boots-from-ref.py from docs/reference/elise-owner-reference.jpg).\n'
    '// Generated: rerun the script to change it.\n'
)


def grid(spec):
    """A drawing in our frame: (GRID, GRID) array of LEGEND characters ('' empty)."""
    x0, y0, rows = spec
    out = np.full((R.GRID, R.GRID), '', dtype='<U1')
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch != '.':
                assert ch in LEGEND, ch
                out[y0 + j, x0 + i] = ch
    return out


def rows_of(a, y0, y1):
    out = np.full_like(a, '')
    out[y0:y1 + 1] = a[y0:y1 + 1]
    return out


def old_pieces():
    """The pieces in our frame on the old female body: name -> (GRID, GRID) LEGEND characters."""
    out = {}
    for s, leg, foot in (('N', NEAR, NEAR_FOOT), ('F', FAR, FAR_FOOT)):
        a = grid(leg)
        out[f'thigh{s}'] = rows_of(a, *CUTS[s]['thigh'])
        out[f'shin{s}'] = rows_of(a, *CUTS[s]['shin'])
        out[f'foot{s}'] = grid(foot)
        out[f'cop{s}'] = grid(COP[s])
    return out


# ---------------------------------------------------------------------------------------------
# On the body v2 (elise_fit.py). The boots above are drawn on our old female body; the new one has a
# shorter thigh, a longer shin and a smaller foot, the ankle four rows lower (the far one two). At
# the owner's game scale her cuffs' top is her row 157, our row 186 (three rows of bare thigh under
# the skirt's hem, as she has nine of hers); her greaves run down to the ankle guard, which sits on our
# ankle as before; her sabatons stand on our soles. So, on each leg (old rows -> new rows):
#   the cuff       as drawn, its top on row 186 (the far one on 185: the new far thigh is three
#                  rows shorter, so its cop covers the cuff's foot);
#   the greave     spread evenly from under the cuff to the ankle guard (her plates are long and
#                  plain: a row of them shown twice where the leg is longer);
#   the ankle guard as drawn, on the ankle as before (the far one a row shorter: the far foot is two
#                  rows shorter);
#   the sabaton    the rows of it kept that the body's own shorter foot keeps (the repeated rows under
#                  the guard and of the instep go), its sole on our sole;
#   the knee cop   as drawn, on the knee as before.
# Each row is moved across with the leg's line (hip, knee, ankle), old to new.
LEG_ROWS = {
    'N': [((185, 188), (186, 189)), ((189, 204), (190, 208)), ((205, 208), (209, 212))],
    'F': [((184, 187), (185, 188)), ((188, 202), (189, 204)), ((203, 203), (205, 205)), ((205, 206), (206, 207))],
}
# The thigh's and the shin's rows on the new body (as CUTS: the thigh down past the knee behind the
# cop, the shin from there to the ankle guard's foot).
NEW_CUTS = {
    'N': {'thigh': (186, 197), 'shin': (196, 212)},
    'F': {'thigh': (185, 191), 'shin': (190, 207)},
}
# The sabatons' rows kept, top to bottom; the last one is the sole's line, on the new body's.
FOOT_KEEP = {'N': [207, 210, 211, 213, 215, 216, 217, 218], 'F': [206, 207, 208, 209, 210]}
SOLE = {'N': 218, 'F': 210}


def leg_x(J, s, y):
    """The middle line of leg s at row y (fine pixels): through the hip, the knee and the ankle."""
    ys = [J['hip' + s][1], J['knee' + s][1], J['ankle' + s][1]]
    xs = [J['hip' + s][0], J['knee' + s][0], J['ankle' + s][0]]
    return float(R._lin(y + 0.5, ys, xs))


def relay_leg(a, s):
    """A leg drawing (old frame) on the new body by LEG_ROWS, each row moved across with the leg."""
    out = np.full_like(a, '')
    for (o0, o1), (n0, n1) in LEG_ROWS[s]:
        for Y in range(n0, n1 + 1):
            y = o0 + int(round((Y - n0) * (o1 - o0) / max(1, n1 - n0)))
            dx = int(round(leg_x(F.NEW_JOINTS, s, Y) - leg_x(F.OLD_JOINTS, s, y)))
            out[Y] = np.roll(a[y], dx)
    return out


def pieces():
    """The pieces in our frame on the body v2: name -> (GRID, GRID) LEGEND characters, '' empty."""
    out = {}
    for s, leg, foot in (('N', NEAR, NEAR_FOOT), ('F', FAR, FAR_FOOT)):
        a = relay_leg(grid(leg), s)
        out[f'thigh{s}'] = rows_of(a, *NEW_CUTS[s]['thigh'])
        out[f'shin{s}'] = rows_of(a, *NEW_CUTS[s]['shin'])
        f = grid(foot)
        dx = F.joint_step('ankle' + s)[0]
        g = np.full_like(f, '')
        keep = FOOT_KEEP[s]
        for k, y in enumerate(keep):
            g[SOLE[s] - (len(keep) - 1 - k)] = np.roll(f[y], dx)
        out[f'foot{s}'] = g
        dx, dy = F.joint_step('knee' + s)
        out[f'cop{s}'] = F.move(grid(COP[s]), dx, dy, '')
    return out


def at_rest():
    """Everything as it stands at idle frame 0, back to front (far leg, near leg; on each the foot,
    the shin, the thigh, the cop): (GRID, GRID) LEGEND characters."""
    P = pieces()
    out = np.full((R.GRID, R.GRID), '', dtype='<U1')
    for s in 'FN':
        for part in ('foot', 'shin', 'thigh', 'cop'):
            p = P[f'{part}{s}']
            m = p != ''
            out[m] = p[m]
    return out


def packed(a):
    yy, xx = np.nonzero(a != '')
    x0, x1, y0, y1 = xx.min(), xx.max() + 1, yy.min(), yy.max() + 1
    rows = [''.join(a[y, x] or '.' for x in range(x0, x1)) for y in range(y0, y1)]
    used = sorted(set(''.join(rows)) - {'.'}, key=lambda c: list(LEGEND).index(c))
    return rows, (int(x0), int(y0)), {c: LEGEND[c] for c in used}


def angle(a, b):
    (ax, ay), (bx, by) = F.NEW_JOINTS[a], F.NEW_JOINTS[b]
    return float(np.degrees(np.arctan2(by - ay, bx - ax)))


# The joint each piece hangs from and the limb whose angle it is drawn at.
JOINT = {
    'thigh': ('knee', ('hip', 'knee')),
    'shin': ('ankle', ('knee', 'ankle')),
    'foot': ('ankle', ('knee', 'ankle')),
    'cop': ('knee', ('knee', 'ankle')),
}
DOCS = {
    'thighN': 'The near cuff and the greave over the thigh: they turn with the thigh about the knee.',
    'shinN': 'The near greave over the shin and the ankle guard: they turn with the shin about the ankle.',
    'footN': 'The near sabaton, seen from the front: it stays flat under the ankle.',
    'copN': 'The near knee cop, rimmed in gold: it turns with the shin about the knee, over the joint.',
    'thighF': 'The far cuff and the greave over the thigh: they turn with the thigh about the knee.',
    'shinF': 'The far greave over the shin and the ankle guard: they turn with the shin about the ankle.',
    'footF': 'The far sabaton pointing right: it stays flat under the ankle.',
    'copF': 'The far knee cop, rimmed in gold: it turns with the shin about the knee, over the joint.',
}
CONST = {k: 'AZURE_' + re.sub(r'([NF])$', r'_\1', k).upper() for k in DOCS}


def check_palette():
    pal = set(R.PALETTES[WHICH])
    for c, h in LEGEND.items():
        assert h in pal, (c, h)


def write_ts(path):
    P = pieces()
    out = [OUT_DOC, "import type { PaintedPiece } from '../painted';", '']
    out += ['/** Her colours the colour slots recolour from (at these, every pixel is hers). */']
    out += [f"export const AZURE_STEEL = '{LEGEND['L']}';", f"export const AZURE_LEATHER = '{LEGEND['B']}';", f"export const AZURE_TRIM = '{LEGEND['g']}';", '']
    out += ["/** What each colour of hers in these pieces is: her black line and sole (they stay), steel, leather or gold. */",
            "export const AZURE_KIND: Record<string, 'line' | 'steel' | 'leather' | 'gold'> = {"]
    out += [f"  '{LEGEND[c]}': '{KIND[c]}'," for c in LEGEND]
    out += ['};', '']
    for name in DOCS:
        rows, (ox, oy), palette = packed(P[name])
        part, s = name[:-1], name[-1]
        jname, (a, b) = JOINT[part]
        jx, jy = F.NEW_JOINTS[jname + s]
        out += [f'/** {DOCS[name]} */', f'export const {CONST[name]}: PaintedPiece = {{',
                f'  pivot: [{int(np.floor(jx)) - ox}, {int(np.floor(jy)) - oy}],', f'  angle: {angle(a + s, b + s):.2f},', '  rows: [']
        out += [f"    '{r}'," for r in rows]
        out += ['  ],', '  colors: {']
        out += [f"    {c}: '{h}'," if re.match(r'^[A-Za-z_]', c) else f"    '{c}': '{h}',"for c, h in palette.items()]
        out += ['  },', '};', '']
    text = '\n'.join(out)
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        f.write(text)
    os.replace(tmp, path)


def rgba_of(a):
    out = np.zeros(a.shape + (4,), np.uint8)
    for c, h in LEGEND.items():
        m = a == c
        out[m, :3] = [int(h[i:i + 2], 16) for i in (1, 3, 5)]
        out[m, 3] = 255
    return out


def on_white(rgba, bg=(236, 236, 236)):
    al = rgba[..., 3:4] / 255.0
    return (rgba[..., :3] * al + np.array(bg) * (1 - al)).astype(np.uint8)


def write_study(study):
    """Her boots in the study's reduced reference, her own pixels brought to the same height, and ours,
    side by side at 8x with Spanish labels."""
    os.makedirs(study, exist_ok=True)
    x0, y0, x1, y1 = 104, 178, 152, 222
    k = 8
    red = R.reduced(WHICH)
    lay = R.reduced_layers(WHICH)
    legs = np.full((R.GRID, R.GRID), 255, np.uint8)
    for n in ('legF', 'legN'):
        m = lay[n] != 255
        legs[m] = lay[n][m]
    legs_rgba = np.zeros((R.GRID, R.GRID, 4), np.uint8)
    m = legs != 255
    legs_rgba[m, :3] = R.rgb(WHICH)[legs[m]]
    legs_rgba[m, 3] = 255
    ours = rgba_of(at_rest())
    # Her own pixels from her cuffs' top (row 156) to her soles (row 255), at the height of ours.
    nat = R.native(WHICH).astype(np.uint8)
    fig = R.figure(WHICH)
    crop = np.where(fig[156:256, 40:140, None], nat[156:256, 40:140], 236).astype(np.uint8)
    h = (y1 - y0) * k
    w = int(round(crop.shape[1] * h / crop.shape[0]))
    nat_im = Image.fromarray(crop).resize((w, h), Image.NEAREST)
    panels = [('Tu dibujo', nat_im)]
    for label, im in (('Estudio reducido', red), ('Sus botas (estudio)', legs_rgba), ('En el juego', ours)):
        c = on_white(im[y0:y1, x0:x1])
        panels.append((label, Image.fromarray(c).resize(((x1 - x0) * k, h), Image.NEAREST)))
    pad, top = 12, 34
    W = sum(p.width for _, p in panels) + pad * (len(panels) + 1)
    sheet = Image.new('RGB', (W, h + top + pad), (40, 40, 48))
    d = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
    except OSError:
        font = ImageFont.load_default()
    X = pad
    for label, p in panels:
        sheet.paste(p, (X, top))
        d.text((X + 4, 6), label, fill=(255, 255, 255), font=font)
        X += p.width + pad
    sheet.save(os.path.join(study, 'elise-boots-compare@8.png'))


def main():
    check_palette()
    if len(sys.argv) > 1:
        write_ts(sys.argv[1])
    if len(sys.argv) > 2:
        write_study(sys.argv[2])


if __name__ == '__main__':
    main()
