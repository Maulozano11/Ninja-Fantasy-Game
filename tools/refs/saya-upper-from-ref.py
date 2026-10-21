"""Saya's ninja top, arm guards and fingerless gloves from the owner's Saya picture.

His picture (docs/reference/saya-owner-reference.jpg, tools/refs/heroine_ref.py) is his own pixel art at
about two of his pixels to one of ours, in proportions that are not ours (she is 5.1 heads tall, ours
4.1). Her clothes are brought down to our scale and fitted to our female rig at idle frame 0
(heroine_ref.OUR_JOINTS), drawn by hand after her picture and the reduced reference
(heroine_ref.reduced('saya')), every pixel one of her colours (heroine_ref.PALETTES['saya']):

  the top         a sleeveless navy ninja top to the hips, high at the neck: her cream chest plate
                  over the bust (a light rim along its two rounded tops, shaded grey toward its lower
                  edge, her gold rim under it), her red piping down the edge of the armhole, two
                  maroon straps from the plate down to the belt with a gold fitting each. It rides the
                  torso about the neck. The near shoulder stays bare, as hers.
  the arm guards  her navy detached sleeves: on each upper arm a guard from under the shoulder to
                  the elbow, its top edged in red and a red band at the elbow (riding the upper arm
                  about the shoulder); on each forearm a guard from the elbow to the wrist, navy
                  outside and maroon inside with a red stripe between (her two-tone forearm guards)
                  and a red cuff at the wrist (riding the forearm about the elbow). Each forearm
                  guard reaches on under the upper guard, so a bent elbow opens no gap.
  the gloves      her fingerless gloves: a brown strap round the wrist, the back of the hand in her
                  navy (the far hand's in her maroon) with a red band over the knuckles, the fingers
                  bare. Our hand pictures (src/sprite/ctx.ts handDraw) are kept for every pose (grip,
                  fist, open, pointing, relaxed, cradling) and painted in her glove colours by how
                  far each pixel is from the wrist along the hand (GLOVE_ZONES), each picture shade
                  one of her tones (GLOVE_TONES); the fingers stay the body's own hand.

The navy, the red and the cream are the item's colour slots (Cloth, Trim, Plate; KIND says which of
her colours each is): at her colours every pixel is hers; another colour shifts each of her shades as
far from it as hers was from her base (src/sprite/color.ts retintHex). Her black line, her gold and the
brown strap stay.

It writes the pieces as TypeScript (src/sprite/items/sayaUpperArt.ts) and, in <study>, each piece at 8x
with the joint it hangs from ringed (saya-upper-pieces@8.png). The same input always gives the same bytes:

  python3 -I tools/refs/saya-upper-from-ref.py src/sprite/items/sayaUpperArt.ts <study>
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

import heroine_ref as R  # noqa: E402

# Her colours the pieces use, one character each (every one is in heroine_ref.PALETTES['saya']).
KEY = {
    # her line
    'k': '#02010d', 'K': '#14101f',
    # navy, darkest to lightest
    'U': '#1d1d32', 'u': '#1f2241', 'X': '#2e3e5d', 'e': '#314161', 'E': '#3f5177', 'M': '#647299',
    # red and maroon
    'Q': '#4b0f30', 'q': '#6e1c38', 'm': '#7c1d36', 'n': '#842b3c', 'r': '#ad333f', 'R': '#bb2e3e',
    # the cream plate and its rims
    'c': '#eae3cb', 'L': '#c1b3a1', 'D': '#a8927c', 'w': '#8d7768', 'W': '#fbe499', 'Y': '#feeeb5',
    'G': '#e6c486', 'C': '#c9a880',
    # gold
    'y': '#f6d886', 'j': '#e8ba58', 'o': '#c48e42', 'O': '#9d6e44', 'J': '#d8a84c',
    # the brown leather strap
    'b': '#302525', 'B': '#453631', 'l': '#604f46', 'N': '#534239',
}
# What each colour is: the colour slot that recolours it, or None (her line, her gold, the strap).
KIND = {
    'k': None, 'K': None,
    'U': 'cloth', 'u': 'cloth', 'X': 'cloth', 'e': 'cloth', 'E': 'cloth', 'M': 'cloth',
    'Q': 'trim', 'q': 'trim', 'm': 'trim', 'n': 'trim', 'r': 'trim', 'R': 'trim',
    'c': 'plate', 'L': 'plate', 'D': 'plate', 'w': 'plate', 'W': 'plate', 'Y': 'plate', 'G': None, 'C': 'plate',
    'y': None, 'j': None, 'o': None, 'O': None, 'J': None,
    'b': None, 'B': None, 'l': None, 'N': None,
}
# The base of each slot (its default): her main navy, her red, her cream.
BASE = {'cloth': '#314161', 'trim': '#ad333f', 'plate': '#eae3cb'}

# The pieces, drawn in our 256 x 256 frame at idle frame 0 (x0, y0 of the first row): name, what it
# is, the joint it hangs from and the limb it rides (its angle at idle is the piece's angle).
PIECES = [
    ('SAYA_TOP', 'The top: high navy collar, the cream plate with its rims, the red piping and the straps; rides the torso about the neck.',
     'neck', ('pelvis', 'neck'), 115, 150, [
         '....kkkkkkkkkkkkkk.......',  # 150
         '....kEeeXXXXXuuuUk.......',  # 151
         '....kEeeXXXXXXuuuUk......',  # 152
         '....kreeekkkkkekkkkk.....',  # 153
         '....kreekYYWWDkDWWDk.....',  # 154
         '....kreekWYcccDcccck.....',  # 155
         '....kreekcYccccccccck....',  # 156
         '....kreekcccccccccccLk...',  # 157
         '...kreeekccccccccccLLk...',  # 158
         '...kreeekLccccccccLLLk...',  # 159
         '..kreeeekLLLccLLLLLLwwk..',  # 160
         '..kreeeekkyGGGGGGGGGjjk..',  # 161
         '..kreeeeekkkkkkkkkkkkkk..',  # 162
         '...kreeXXXqXXeeXquuuUk...',  # 163
         '....kreeXXqXeeXXquuUk....',  # 164
         '.....kreXXqXeXXXqUk......',  # 165
         '.....kreXXjXXXXujk.......',  # 166
         '.....kreXXoXXXXuok.......',  # 167
         '....kreeXXqXXXXuqUk......',  # 168
         '...kreeXXXqXeXXuquUk.....',  # 169
         '..kreeeXXXqXeeXuquuUk....',  # 170
         '..kreeeXXXqXXeXuquuuUk...',  # 171
         '.kreeeeXXXqXXXXuquuuUk...',  # 172
         'kkkkkkkkkkkkkkkkkkkkkkkk.',  # 173
     ]),
    ('SAYA_UPPER_N', 'The near upper arm guard: red top edge, navy, the red elbow band; rides the upper arm about the shoulder.',
     'shoulderN', ('shoulderN', 'elbowN'), 109, 157, [
         '..kkkkkkkkkk',  # 157
         '..kRRrrrrqk.',  # 158
         '.kEMMEeeXuk.',  # 159
         '.kEMMEeeXk..',  # 160
         '.kEMMEeeXk..',  # 161
         '.kEMEEeeXk..',  # 162
         'kEMMEeeXk...',  # 163
         'kRRrrrrqk...',  # 164
         'kkkkkkkkk...',  # 165
     ]),
    ('SAYA_FORE_N', 'The near forearm guard: navy outside, a red stripe, maroon inside, the red cuff; rides the forearm about the elbow.',
     'elbowN', ('elbowN', 'wristN'), 107, 164, [
         '..kEMeXrqk..',  # 164
         '..kEMeXrqk..',  # 165
         '.kEMeXrqqk..',  # 166
         '.kEMeXrqqk..',  # 167
         '.kEMeXrqqk..',  # 168
         '.kEMeXrqQk..',  # 169
         '.kEMeXrqk...',  # 170
         'kEMeeXrqk...',  # 171
         'kEMeXrqk....',  # 172
         'kEMeXrqk....',  # 173
         'kRRrrrqk....',  # 174
         'kkkkkkkk....',  # 175
     ]),
    ('SAYA_UPPER_F', 'The far upper arm guard, in the far side\'s darker navy; rides the upper arm about the shoulder.',
     'shoulderF', ('shoulderF', 'elbowF'), 129, 157, [
         '.kkkkkkkk..',  # 157
         'kRrrrqqQk..',  # 158
         'kEeeXXuUk..',  # 159
         'kEeeXXuUk..',  # 160
         '.kEeeXXuUk.',  # 161
         '.kEeeXXuUk.',  # 162
         '.kEeeXXuUk.',  # 163
         '.kRrrrqqQk.',  # 164
         '.kkkkkkkkk.',  # 165
     ]),
    ('SAYA_FORE_F', 'The far forearm guard: maroon inside (toward the body), the red stripe, navy outside, the red cuff; rides the forearm about the elbow.',
     'elbowF', ('elbowF', 'wristF'), 130, 164, [
         'kqqreXXuk......',  # 164
         '.kqqreXXuk.....',  # 165
         '.kqqreXXuk.....',  # 166
         '..kqqreXXuk....',  # 167
         '..kqqreXXuk....',  # 168
         '...kqqreXXuk...',  # 169
         '....kqreXXuk...',  # 170
         '....kqqreXXuk..',  # 171
         '.....kqreXXuk..',  # 172
         '......kqreXXuk.',  # 173
         '......krrrrqqk.',  # 174
         '.......kkkkkkk.',  # 175
     ]),
]

# The gloves. Zones along the hand from the wrist, in fine pixels from the middle of the hand
# picture's wrist cell (its pivot) toward the fingers: the strap, the back of the hand, the red band
# over the knuckles; from the last on, the fingers are bare. Her near glove: a pixel of strap, two and
# a half of navy, one of red, the fingers (her picture: 2, 5, 2 and 4 of her pixels).
GLOVE_ZONES = [(-0.5, 'strap'), (0.5, 'back'), (2.5, 'band'), (3.5, None)]
# Her tones for each shade of our hand pictures: line, crease, shadow, base, light.
GLOVE_TONES = {
    'strap': ['k', 'b', 'B', 'N', 'l'],
    'backN': ['k', 'u', 'X', 'e', 'E'],
    'bandN': ['k', 'Q', 'q', 'r', 'R'],
    # the far glove is her maroon, its knuckle band her red
    'backF': ['k', 'Q', 'q', 'm', 'n'],
    'bandF': ['k', 'Q', 'q', 'r', 'r'],
}

OUT_DOC = (
    "// Saya's ninja top, arm guards and fingerless gloves (tools/refs/saya-upper-from-ref.py from\n"
    "// docs/reference/saya-owner-reference.jpg). Generated: rerun the script to change it.\n"
)


def check():
    pal = set(R.PALETTES['saya'])
    for ch, h in KEY.items():
        assert h in pal, f'{ch} {h} is not one of her colours'
    for name, _doc, _j, _limb, _x0, _y0, rows in PIECES:
        for r in rows:
            assert len(r) == len(rows[0]), (name, r)
            for ch in r:
                assert ch == '.' or ch in KEY, (name, ch)
    for tones in GLOVE_TONES.values():
        assert all(t in KEY for t in tones)


def angle(limb):
    a, b = (R.OUR_JOINTS[j] for j in limb)
    return math.degrees(math.atan2(b[1] - a[1], b[0] - a[0]))


def ts_piece(name, doc, joint, limb, x0, y0, rows):
    jx, jy = R.OUR_JOINTS[joint]
    used = sorted({ch for r in rows for ch in r if ch != '.'}, key=lambda c: list(KEY).index(c))
    out = [f'/** {doc} */', f'export const {name}: PaintedPiece = {{',
           f'  pivot: [{int(math.floor(jx)) - x0}, {int(math.floor(jy)) - y0}],',
           f'  angle: {angle(limb):.2f},', '  rows: [']
    out += [f"    '{r}'," for r in rows]
    out += ['  ],', '  colors: {']
    out += [f"    {ch}: '{KEY[ch]}'," for ch in used]
    out += ['  },', '};', '']
    return '\n'.join(out)


def write_ts(path):
    lines = [OUT_DOC, "import type { PaintedPiece } from '../painted';", '',
             '/** Her colours the colour slots recolour from (at these, every pixel is hers). */',
             f"export const SAYA_CLOTH = '{BASE['cloth']}';",
             f"export const SAYA_TRIM = '{BASE['trim']}';",
             f"export const SAYA_PLATE = '{BASE['plate']}';", '',
             '/** Which slot recolours each of her colours (her line, her gold and the brown strap stay). */',
             "export const SAYA_KIND: Record<string, 'cloth' | 'trim' | 'plate'> = {"]
    for ch, h in KEY.items():
        if KIND[ch]:
            lines.append(f"  '{h}': '{KIND[ch]}',")
    lines += ['};', '']
    for p in PIECES:
        lines.append(ts_piece(*p))
    lines += ['/**',
              ' * The gloves: from `from` fine pixels along the hand (from the middle of the hand picture\'s wrist',
              ' * cell toward the fingers) each zone takes over; `null` leaves the fingers bare.',
              ' */',
              'export const SAYA_GLOVE_ZONES: [number, \'strap\' | \'back\' | \'band\' | null][] = [']
    for at, z in GLOVE_ZONES:
        lines.append(f"  [{at}, {('null' if z is None else repr(z))}],")
    lines += ['];', '',
              '/** Her tones for our hand pictures\' shades (line, crease, shadow, base, light), per zone and side. */',
              'export const SAYA_GLOVE_TONES = {']
    for k, tones in GLOVE_TONES.items():
        lines.append(f"  {k}: [{', '.join(repr(KEY[t]) for t in tones)}],")
    lines += ['} as const;', '']
    text = '\n'.join(lines)
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        f.write(text)
    os.replace(tmp, path)


def rgb(h):
    return [int(h[i:i + 2], 16) for i in (1, 3, 5)]


def sheet(study):
    """Each piece at 8x on grey, the joint it hangs from ringed."""
    k = 8
    ims = []
    for name, _doc, joint, _limb, x0, y0, rows in PIECES:
        H, W = len(rows), len(rows[0])
        a = np.full((H, W, 3), 214, np.uint8)
        for j, r in enumerate(rows):
            for i, ch in enumerate(r):
                if ch != '.':
                    a[j, i] = rgb(KEY[ch])
        im = Image.fromarray(a).resize((W * k, H * k), Image.NEAREST)
        d = ImageDraw.Draw(im)
        jx, jy = R.OUR_JOINTS[joint]
        cx, cy = (math.floor(jx) - x0 + 0.5) * k, (math.floor(jy) - y0 + 0.5) * k
        d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], outline=(0, 200, 0))
        ims.append(im)
    W = sum(i.width for i in ims) + 12 * len(ims)
    H = max(i.height for i in ims)
    out = Image.new('RGB', (W, H), (255, 255, 255))
    x = 0
    for im in ims:
        out.paste(im, (x, 0))
        x += im.width + 12
    out.save(os.path.join(study, 'saya-upper-pieces@8.png'))


def main():
    check()
    write_ts(sys.argv[1])
    if len(sys.argv) > 2:
        os.makedirs(sys.argv[2], exist_ok=True)
        sheet(sys.argv[2])


if __name__ == '__main__':
    main()
