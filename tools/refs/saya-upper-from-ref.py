"""Saya's ninja top, arm guards and fingerless gloves, copied 1:1 from the owner's Saya at our scale.

His game-scale Saya (docs/reference/saya-game-scale-owner-reference.jpg, "aquí hay otra": the picture he
drew at our sprite scale) is 1024 x 1024 picture pixels for 100 x 100 of hers, the grid from the
picture's corner: one of her pixels is 10.24 picture pixels and one of ours. Her picture is laid on our
256 x 256 frame at (+76, +122), her soles on ours (tools/refs/saya_rig.py), so every row below is written
in our frame's coordinates as he drew it. On our female body her hips are where ours are, while our neck,
shoulders and arms stand three or four rows higher than hers (our torso is longer): each piece is laid
on its joint by how far her picture is moved there (UPPER, NEAR_ARM, FAR_ARM below), so at idle frame 0
every piece is his pixels, unturned. (The weapons in that picture are the bugged ones he mentioned; none
of their pixels is used here.)

Her pixels: each cell's colour is the median of its middle (a JPEG), and her colours are the cells'
colours gathered into tones (one tone per colour of hers: colours within 14 of each other in every
channel are one tone, its colour their mean; a tone of fewer than 4 cells is noise and is dropped).
PIECES are rows of those tones, one character per tone (KEY, printed by --key). Every character is her
pixel there, except the cells listed by the script as filled (fill() below; the preview marks them):
what her hair, her scarf, her belts and her skin hide, continued from her pixels, and the few cells
where our body is a pixel wider than hers.

  the top          two pieces, both turned with the torso. SAYA_TOP rides the neck, UPPER rows higher than
                   he drew it: her cream chest plate with its gold-brown rim, the dark navy of her top
                   with its two red pipings down the front and the red piping at the near armhole, down
                   to her row 169; the near shoulder stays bare, as hers. SAYA_TOP_LOW rides the pelvis
                   where he drew it: her rows 164-180, the navy and pipings over her hips under her
                   belts. At rest the upper piece lies over the lower one's first rows, so her rows
                   167-169 show twice: that is how our longer torso is covered, with her rows and no
                   new ones. Filled: a navy high collar under her scarf (rows 151-155) and the plate's
                   top under it, the top's near side under her hair lock, and the top under her belts
                   down to the hips (navy, its two pipings continued straight down) with a dark hem.
  the near arm     SAYA_SHOULDER_N rides the upper arm about the shoulder: her bare shoulder, a round
                   patch of her light skin with its shadow down the far side, in her black line (our
                   body's shoulder is shaded darker and its line falls elsewhere). Her skin follows the
                   player's skin (SAYA_SKIN).
                   SAYA_UPPER_N rides the upper arm about the shoulder: her guard's navy top, the red
                   band slanting round the arm, the red on its inner side and the red elbow band.
                   SAYA_FORE_N rides the forearm about the elbow: the red at the elbow, the navy guard
                   with its red stripe, the red cuff. All three are four rows higher than he drew them
                   (NEAR_ARM), on our near arm.
  the far arm      SAYA_UPPER_F rides the upper arm about the shoulder: her bare far shoulder (rows
                   155-158: her skin in its shadow, two pixels wide, in her black line, beside her
                   plate's edge), then her guard's navy top, the red band and the red elbow band.
                   SAYA_FORE_F rides the forearm about the elbow: the red elbow band, the navy guard
                   with its red stripe outside, the red cuff. Both are UPPER rows higher than he drew
                   them, as her top is, so her bare shoulder meets her plate as he drew it. He drew her
                   far arm further from the body than our far arm hangs: the pieces are pinned to our
                   far arm's joints moved FAR_OUT, so at rest every pixel of it is his, where he drew
                   it (her forearm, two rows longer than ours, kept whole), and it turns as our far arm
                   turns (src/sprite/items/sayaUpper.ts sayaFarOut). Below her far forearm her top's
                   side shows as he drew it (SAYA_TOP_LOW, x 139-140).
  the fists        her own fists, her pixels, on the female bodies, riding the forearm under its cuff:
                   SAYA_GLOVE_N, her near glove (rows 178-183: the dark navy row under the cuff, three
                   navy rows, the red band over the knuckles, her line under it), the fist that holds
                   her sword (its grip passes through GRIP_N, tools/refs/saya_rig.py); SAYA_HAND_F,
                   her far fist (rows 178-184: the brown strap, then her bare fist in her skin, lit on
                   its knuckles). They take the place of our hand when it is a fist (holding or not);
                   our hand under them is taken away. Filled: on the near glove the bugged sword's
                   brown grip (x 111-113, rows 179-183) is her navy and her line continued.
  the gloves       for the other hands (open, pointing, relaxed, cradling) and on the other bodies, our
                   hand pictures painted in her glove by how far each pixel lies from the wrist along
                   the hand, as she wears it: on the near hand a dark strap row, navy and the red band
                   over the knuckles, the fingers bare; on the far hand the brown strap, then the hand
                   bare in her own skin. Each picture shade is one of her tones (GLOVE_TONES); her skin
                   follows the player's.

Our body's own skin, where it shows beside her pieces (the far shoulder, the neck, a hand), is painted
in her skin's two tones and her line (SAYA_LINE, SAYA_SKIN_SHADOW): our body shades skin in three tones
of its own, hers in two. Her forearms are sleeved in her guards, which lie a pixel or two off ours: what
shows of our forearm beside them is painted in her guards' darkest navy (SAYA_SLEEVE).

The navy, the red and the cream are the item's colour slots (Cloth, Trim, Plate; KIND says which tone is
which): at her colours every pixel is hers; another colour shifts each of her shades as far from it as
hers was from her base (src/sprite/color.ts retintHex). Her black line, the gold-brown rim and the brown
strap stay.

Writes the pieces as TypeScript (src/sprite/items/sayaUpperArt.ts) and, in <out>, saya-upper-pieces@8.png
(each piece at 8x, filled cells crossed, the joint it hangs from ringed). The same picture always gives
the same bytes. Run from the repo root:

  python3 -I tools/refs/saya-upper-from-ref.py docs/reference/saya-game-scale-owner-reference.jpg src/sprite/items/sayaUpperArt.ts <out>
  python3 -I tools/refs/saya-upper-from-ref.py docs/reference/saya-game-scale-owner-reference.jpg --key
"""

import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import saya_rig  # noqa: E402

# Her grid: one of her pixels in picture pixels, her grid's size, and where her picture lies on our frame.
PITCH = 10.24
SIZE = 100
AT = saya_rig.AT
# Tones: colours within TH in every channel are one tone; a tone of fewer than MIN cells is dropped.
TH, MIN = 14, 4
CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

# Our female rig at idle frame 0 (tools/refs/saya_rig.py), fine pixels.
JOINTS = saya_rig.JOINTS

# How far each part of her picture is moved to land on our rig (tools/refs/saya_rig.py). Our neck and
# shoulders stand UPPER rows higher than hers (her top rides the neck, so its plate stays under her
# scarf), and our near arm four rows higher (her near guards on our near arm as she drew them on hers,
# her bare shoulder's line on our shoulder's). Her far arm is moved as her top is (UPPER rows), so her
# bare far shoulder meets her plate as he drew it. Her skirt, belts and the top under them stay where
# she drew them, on our hips.
UPPER = 3
NEAR_ARM = (0, -4)
FAR_ARM = (0, -UPPER)
# Her far elbow in her picture (the middle of her far elbow band, between her upper and forearm guards).
# Her far pieces are pinned to our far arm's joints: at rest every piece lands where he drew it, whatever
# our joints, and turns about them as our far arm turns. When our far elbow (saya_rig.JOINTS, moved as
# her far arm is) is not where hers is, they turn about our joints moved FAR_OUT (fine pixels), so they
# turn about her own elbow and shoulder; src/sprite/items/sayaUpper.ts (SAYA_FAR_OUT) hangs them there
# and our far hand with them. On our female body of 2026-10-21 her far arm hangs about six pixels
# further out than ours: FAR_OUT is (6, 1). Once our far arm hangs where hers does (the female body's
# far arm laid where his heroines draw it), rerun tools/refs/heroine-idle.mts into saya_rig.JOINTS and
# this script: FAR_OUT comes out (0, 0), and her pieces ride our far arm's joints as they are.
HER_ELBOW_F = (139.5, 166.5)
FAR_OUT = tuple(int(round(h + m - j)) for h, m, j in zip(HER_ELBOW_F, FAR_ARM, JOINTS['elbowF']))
FAR_PIECES = ('SAYA_UPPER_F', 'SAYA_FORE_F', 'SAYA_HAND_F')

# The pieces: name, what it is, the joint it hangs from, the limb whose idle angle is its angle, the
# frame position (x, y) of its first row's first cell, how far her picture is moved to land on our rig,
# the rows of her picture left out (frame rows), and the rows (one per frame row, from y).
PIECES = [
    ('SAYA_TOP', 'The top: her collar, plate, navy and red pipings down to her waist; under her scarf and hair, filled.',
     'neck', ('pelvis', 'neck'), (116, 151), (0, -UPPER), (), [
         # x 116.................138
         '...000000000000000.....',  # 151 the collar's top (under her scarf)
         '....02ccccccccccc20....',  # 152
         '.....02ccccccccccc20...',  # 153
         '.....02ccccccccccc20...',  # 154
         '.....020000000000000...',  # 155 the plate's top edge (under her scarf)
         '.....02kBMBMMMMMMMMM0..',  # 156 her plate's top, its middle under her scarf
         '.....00nMMMMBBBBBMMMB0.',  # 157
         '....00kBMMMMMMMMMMMMM0.',  # 158
         '...020kBMMMMMMMMMMMMM0.',  # 159
         '..2020kBBMMMMMMMMMMMB0.',  # 160
         '..200d2BBBBBBkkkkkBBB0.',  # 161
         '..00a2b2BBBkk00000kBB0.',  # 162
         '..00222b2kk00229220k0..',  # 163
         '...0222ab0022cci2c20...',  # 164 x 119-120: under her hair lock
         '....0dd0092eccci2cci0..',  # 165
         '....00022922icci2cii0..',  # 166
         '....0022c2ic2ici2i2i0..',  # 167
         '...0002222iccc2222ci0..',  # 168
         '..000022c2icccci2cc0...',  # 169
     ]),
    ('SAYA_TOP_LOW', 'The top from her waist down to her hips, under her belts: her navy and red pipings as he drew them over her hips.',
     'pelvis', ('pelvis', 'neck'), (116, 164), (0, 0), (), [
         # x 116...................140
         '...0222ab0022cci2c20.....',  # 164 x 119-120: under her hair lock
         '....0dd0092eccci2cci0....',  # 165
         '....00022922icci2cii0....',  # 166
         '....0022c2ic2ici2i2i0....',  # 167
         '...0002222iccc2222ci0....',  # 168
         '..000022c2icccci2cc00....',  # 169 x 136: her line behind her far arm
         '.0000222cc6iccci2ci0.....',  # 170 x 120-124 and on: under her belts
         '.2cccccccccc2ici2icc2....',  # 171
         '2ccccccccccc2ici2ic22....',  # 172
         '2ccccccccccc2ici2ic22222.',  # 173 x 139-140, rows 173-178: her top's side behind her far arm, her pixels there
         '2ccccccccccc2ici2ic2222..',  # 174
         '2ccccccccccc2ici2ic2222.2',  # 175
         '2ccccccccccc2ici2ic222220',  # 176
         '2ccccccccccc2ici2ic222260',  # 177
         '2ccccccccccc2ici2ic222260',  # 178
         '0000000000000000000......',  # 179 the hem
         '....00000000000..........',  # 180
     ]),
    ('SAYA_SHOULDER_N', 'The near shoulder, bare: her round light skin, its shadow down the far side, in her black line.',
     'shoulderN', ('shoulderN', 'elbowN'), (113, 152), NEAR_ARM, (), [
         # x 113...121
         '..000....',  # 152 the line over it (her scarf's end beside it)
         '00vHH00..',  # 153
         '0vHHHHv00',  # 154
         '0HHHHHHv0',  # 155
         '0HHHHHHv0',  # 156
         '.00HHHvv0',  # 157 (the guard's top from here: drawn over it)
         '.....Hv..',  # 158
     ]),
    ('SAYA_UPPER_N', 'The near upper arm guard: navy, the red band slanting round it, red inside, the red elbow band.',
     'shoulderN', ('shoulderN', 'elbowN'), (108, 157), NEAR_ARM, (), [
         # x 108......118
         '....0200...',  # 157
         '....06cc00.',  # 158
         '...0000ccc0',  # 159
         '...0iii00c.',  # 160
         '..000iii70.',  # 161
         '..02c00ii9.',  # 162
         '.006ccc099.',  # 163
         '09i00cc200.',  # 164
         '00iii0220..',  # 165
     ]),
    ('SAYA_FORE_N', 'The near forearm guard: the red at the elbow, navy with a red stripe, the red cuff.',
     'elbowN', ('elbowN', 'wristN'), (106, 166), NEAR_ARM, (), [
         # x 106.....115
         '..0200ii00',  # 166
         '.0000c0b90',  # 167
         '.09jj00090',  # 168
         '.0222ij000',  # 169
         '.02cccib0.',  # 170
         '.02ccci20.',  # 171
         '.02ccci20.',  # 172
         '.02cci280.',  # 173
         '02ccci20..',  # 174
         '02ccc420..',  # 175
         '0biii420..',  # 176
         '00000i90..',  # 177
     ]),
    ('SAYA_UPPER_F', 'The far shoulder, bare, and the far upper arm guard: her skin in its shadow in her black line, then navy, the red band, the red elbow band.',
     'shoulderF', ('shoulderF', 'elbowF'), (135, 155), FAR_ARM, (), [
         # x 135..142
         '....00..',  # 155 the line over her shoulder (her hair lock's tip beside it)
         '...vv0..',  # 156 her bare shoulder, in her skin's shadow
         '..0vv0..',  # 157
         '..0vv0..',  # 158
         '..0000..',  # 159 the guard's top
         '..0220..',  # 160
         '..00000.',  # 161
         '..09i90.',  # 162
         '.099000.',  # 163
         '.000220.',  # 164
         '.0222000',  # 165
         '.0000990',  # 166
     ]),
    ('SAYA_FORE_F', 'The far forearm guard: the red elbow band, navy with its red stripe outside, the red cuff.',
     'elbowF', ('elbowF', 'wristF'), (136, 167), FAR_ARM, (), [
         # x 136.......147
         '09bb0000....',  # 167
         '090022000...',  # 168
         '002200i20...',  # 169
         '.000ii220...',  # 170
         '.00b422i20..',  # 171
         '.0022cci80..',  # 172
         '..022cc2i0..',  # 173
         '...022cci20.',  # 174
         '...0222c2i0.',  # 175
         '....022ii00.',  # 176
         '....0bb00620',  # 177
     ]),
    ('SAYA_GLOVE_N', 'Her near glove, the fist that holds her sword: dark navy under the cuff, navy, the red band over the knuckles.',
     'elbowN', ('elbowN', 'wristN'), (105, 178), NEAR_ARM, (), [
         # x 105...112
         '.066c60.',  # 178 under her cuff
         '026ccc60',  # 179 x 111-112: the bugged grip, filled
         '0i6ccc60',  # 180 x 111-112: the bugged grip, filled
         '00iccc60',  # 181 x 111: the bugged grip, filled
         '000iii0.',  # 182 the red band; x 106: the bugged grip, filled
         '.0000060',  # 183 her line under it; x 107: the bugged grip, filled
     ]),
    ('SAYA_HAND_F', 'Her far fist: the brown strap, then her bare fist in her skin, lit on its knuckles.',
     'elbowF', ('elbowF', 'wristF'), (141, 178), FAR_ARM, (), [
         # x 141...148
         '0055ec0.',  # 178 the strap
         '055g0c20',  # 179
         '00D10ai0',  # 180 her fist
         '0vD0v080',  # 181
         '0v0rrD0.',  # 182
         '.0vkD0..',  # 183
         '.0000...',  # 184
     ]),
]
# The middle of her near fist, where her sword's grip passes (tools/refs/saya_rig.py GRIP_N).
GRIP_N = saya_rig.GRIP_N

# The gloves, per hand: from `from` fine pixels along the hand (from the middle of the hand picture's
# wrist cell toward the fingers) each zone takes over; None leaves the fingers bare. Her near glove under
# her wrist (176): row 177 her dark strap, rows 178-181 navy, row 182 the red band, the fingers from 183,
# on a hand seven rows long. Our female's hands are his small ones (tools/refs/female-body-from-ref.py),
# the fist five rows: her strap row, two of her navy rows, her red band and the fingers below it, in her
# order. Her far glove under her wrist (177): rows 178-179 the brown strap, then her fist in her skin
# (rows 180-183: her lit tone D on the knuckles, her shadow v round them), so it is drawn in her skin
# ('skin'); on our far hand, four or five pixels long, one strap row and the fist below it, as her fist
# is twice as long as her strap.
# An open or pointing near hand on a female body (her small hands, seven rows from the wrist to the
# fingertips) wears it as her big picture shows her glove: one row of strap, one of navy and one of the
# red band, the fingers below them bare, so the hand still reads as a hand ('Nopen').
GLOVE_ZONES = {
    'N': [(0.5, 'strap'), (1.5, 'back'), (3.5, 'band'), (4.5, None)],
    'F': [(0.5, 'strap'), (1.5, 'skin')],
    'Nopen': [(0.5, 'strap'), (1.5, 'back'), (2.5, 'band'), (3.5, None)],
}
# Her tones for each shade of our hand pictures: line, crease, shadow, base, light.
GLOVE_TONES = {
    'strapN': ['0', '0', '5', '5', 'e'],
    'backN': ['0', '2', '6', 'c', 'c'],
    'bandN': ['0', '7', '9', 'i', 'j'],
    'strapF': ['0', '5', '5', 'e', 'g'],
    'skinF': ['0', 'v', 'v', 'D', 'D'],
}

# Which colour slot recolours each of her tones (by its colour; the rest stay): navy, red, cream.
SLOT_OF = {
    'cloth': ['#222338', '#272c48', '#374061', '#373b49'],
    'trim': ['#3f1e30', '#431527', '#5f1a29', '#6e212c', '#6f2f32', '#772930', '#7e3232', '#a73234', '#b63133'],
    'plate': ['#bfb2a7', '#ebe5d7'],
    'skin': ['#d28771', '#eaac8c', '#f3bf9c'],
}
BASE = {'cloth': '#374061', 'trim': '#a73234', 'plate': '#ebe5d7', 'skin': '#f3bf9c'}
# Her black line and the shadow of her skin: where our body's own skin shows beside her pieces (the far
# shoulder, the arms' edges, the neck), it is painted in her two skin tones and her line, as hers is.
LINE, SKIN_SHADOW = '#020102', '#d28771'
# Her guards' darkest navy: what shows of our forearm beside her forearm guards is painted in it.
SLEEVE = '#222338'

OUT_DOC = (
    "// Saya's ninja top, arm guards and fingerless gloves, the owner's pixels 1:1 (tools/refs/saya-upper-from-ref.py\n"
    "// from docs/reference/saya-game-scale-owner-reference.jpg). Generated: rerun the script to change it.\n"
)


def native(path):
    """Her pixels: the median colour of each cell's middle (5 x 5 picture pixels), SIZE x SIZE x 3."""
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int32)
    assert a.shape[:2] == (round(PITCH * SIZE),) * 2, a.shape
    out = np.zeros((SIZE, SIZE, 3), np.int32)
    for y in range(SIZE):
        for x in range(SIZE):
            y0, x0 = int(round(y * PITCH + 2.5)), int(round(x * PITCH + 2.5))
            out[y, x] = np.median(a[y0:y0 + 5, x0:x0 + 5].reshape(-1, 3), 0).round()
    return out


def tones(N):
    """Her tones, darkest first: {char: hex}. White (her background) is not a tone."""
    cols, counts = np.unique(N.reshape(-1, 3), axis=0, return_counts=True)
    order = sorted(range(len(cols)), key=lambda i: (-counts[i], tuple(cols[i])))
    centres, members = [], []
    for i in order:
        c = cols[i]
        if (c > 235).all():
            continue
        for j, ce in enumerate(centres):
            if np.abs(c - ce).max() <= TH:
                members[j].append((c, counts[i]))
                break
        else:
            centres.append(c)
            members.append([(c, counts[i])])
    pal = []
    for m in members:
        tot = sum(n for _, n in m)
        if tot >= MIN:
            pal.append(tuple(int(v) for v in (sum(c * n for c, n in m) / tot).round()))
    pal.sort(key=lambda c: (sum(c), c))
    assert len(pal) <= len(CHARS)
    return {CHARS[i]: '#%02x%02x%02x' % c for i, c in enumerate(pal)}


def rgb(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)])


def hers(N, key):
    """Her picture on our frame as tone characters: {(x, y): char}; her white is left out."""
    P = np.array([rgb(h) for h in key.values()])
    chars = list(key)
    out = {}
    for y in range(SIZE):
        for x in range(SIZE):
            c = N[y, x]
            if (c > 235).all():
                continue
            out[(x + AT[0], y + AT[1])] = chars[int(np.argmin(((P - c) ** 2).sum(1)))]
    return out


def fill(piece, H):
    """The cells of a piece that are not her pixel there (filled), as a set of frame (x, y)."""
    _name, _doc, _joint, _limb, (x0, y0), _move, _drop, rows = piece
    out = set()
    for j, r in enumerate(rows):
        for i, ch in enumerate(r):
            if ch != '.' and H.get((x0 + i, y0 + j)) != ch:
                out.add((x0 + i, y0 + j))
    return out


def kept(piece):
    """The rows the game gets (the left-out rows removed) and the frame row of each."""
    _name, _doc, _joint, _limb, (x0, y0), _move, drop, rows = piece
    out = [(y0 + j, r) for j, r in enumerate(rows) if y0 + j not in drop]
    return out


def check(key):
    for piece in PIECES:
        name, rows = piece[0], piece[-1]
        for r in rows:
            assert len(r) == len(rows[0]), (name, r)
            for ch in r:
                assert ch == '.' or ch in key, (name, ch)
    for ts in GLOVE_TONES.values():
        assert all(t in key for t in ts)
    for hexes in SLOT_OF.values():
        assert all(h in key.values() for h in hexes), hexes
    for b in list(BASE.values()) + [LINE, SKIN_SHADOW, SLEEVE]:
        assert b in key.values()


def angle(limb):
    a, b = (JOINTS[j] for j in limb)
    return math.degrees(math.atan2(b[1] - a[1], b[0] - a[0]))


def pivot(piece):
    """The pivot cell in the piece: the joint's cell (moved FAR_OUT for her far arm), moved onto her picture."""
    name, _doc, joint, _limb, (x0, y0), (mx, my), _drop, _rows = piece
    jx, jy = JOINTS[joint]
    ox, oy = FAR_OUT if name in FAR_PIECES else (0, 0)
    return math.floor(jx) + ox - mx - x0, math.floor(jy) + oy - my - y0


def ts_piece(piece, key):
    name, doc, _joint, limb = piece[:4]
    rows = [r for _, r in kept(piece)]
    used = sorted({ch for r in rows for ch in r if ch != '.'}, key=list(key).index)
    px, py = pivot(piece)
    out = [f'/** {doc} */', f'export const {name}: PaintedPiece = {{', f'  pivot: [{px}, {py}],',
           f'  angle: {angle(limb):.2f},', '  rows: [']
    out += [f"    '{r}'," for r in rows]
    out += ['  ],', '  colors: {']
    out += [f"    '{ch}': '{key[ch]}'," for ch in used]
    out += ['  },', '};', '']
    return '\n'.join(out)


def write_ts(path, key):
    lines = [OUT_DOC, "import type { PaintedPiece } from '../painted';", '',
             '/** Her colours the colour slots recolour from (at these, every pixel is hers). */',
             f"export const SAYA_CLOTH = '{BASE['cloth']}';",
             f"export const SAYA_TRIM = '{BASE['trim']}';",
             f"export const SAYA_PLATE = '{BASE['plate']}';",
             "/** Her skin on the bare shoulder: the player's skin moves it as far. */",
             f"export const SAYA_SKIN = '{BASE['skin']}';",
             "/** Her black line and her skin's shadow: our body's own skin, where it shows, is painted in them and her skin. */",
             f"export const SAYA_LINE = '{LINE}';",
             f"export const SAYA_SKIN_SHADOW = '{SKIN_SHADOW}';",
             "/** Her guards' darkest navy: what shows of our forearm beside her forearm guards is painted in it. */",
             f"export const SAYA_SLEEVE = '{SLEEVE}';",
             "/** How far her far arm hangs from ours at rest (fine pixels): her far pieces hang from our far arm's joints moved this far. */",
             f'export const SAYA_FAR_OUT: [number, number] = [{FAR_OUT[0]}, {FAR_OUT[1]}];', '',
             '/** Which slot recolours each of her colours (her line, the gold-brown rim and the strap stay; her skin follows the skin). */',
             "export const SAYA_KIND: Record<string, 'cloth' | 'trim' | 'plate' | 'skin'> = {"]
    for slot, hexes in SLOT_OF.items():
        for h in hexes:
            lines.append(f"  '{h}': '{slot}',")
    lines += ['};', '']
    for p in PIECES:
        lines.append(ts_piece(p, key))
    lines += ['/**',
              ' * The gloves, per hand: from `from` fine pixels along the hand (from the middle of the hand',
              " * picture's wrist cell toward the fingers) each zone takes over; `null` leaves the fingers bare,",
              " * 'skin' paints them in her skin (the player's skin moves it).",
              ' */',
              "export const SAYA_GLOVE_ZONES: Record<'N' | 'F' | 'Nopen', [number, 'strap' | 'back' | 'band' | 'skin' | null][]> = {"]
    for side, zones in GLOVE_ZONES.items():
        lines.append(f'  {side}: [' + ', '.join(f"[{at}, {('null' if z is None else repr(z))}]" for at, z in zones) + '],')
    lines += ['};', '',
              "/** Her tones for our hand pictures' shades (line, crease, shadow, base, light), per zone and side. */",
              'export const SAYA_GLOVE_TONES = {']
    for k, ts in GLOVE_TONES.items():
        lines.append(f"  {k}: [{', '.join(repr(key[t]) for t in ts)}],")
    lines += ['} as const;', '']
    glove = next(p for p in PIECES if p[0] == 'SAYA_GLOVE_N')
    gx, gy = pivot(glove)
    x0, y0 = glove[4]
    mx, my = glove[5]
    lines += ['/**',
              " * Where her sword's grip passes through SAYA_GLOVE_N: the cell of the middle of her fist, from the",
              " * piece's pivot (the near elbow's cell), at the piece's angle.",
              ' */',
              f'export const SAYA_GRIP_N: [number, number] = [{GRIP_N[0] - mx - x0 - gx}, {GRIP_N[1] - my - y0 - gy}];', '']
    text = '\n'.join(lines)
    tmp = path + '.tmp'
    with open(tmp, 'w') as f:
        f.write(text)
    os.replace(tmp, path)


def sheet(out, key, H):
    """Each piece at 8x on grey as the game gets it, its filled cells crossed, its pivot ringed."""
    k = 8
    ims = []
    for piece in PIECES:
        x0 = piece[4][0]
        rows = kept(piece)
        F = fill(piece, H)
        Wd, Ht = len(rows[0][1]), len(rows)
        im = Image.new('RGB', (Wd * k, Ht * k), (214, 214, 214))
        d = ImageDraw.Draw(im)
        for j, (y, r) in enumerate(rows):
            for i, ch in enumerate(r):
                if ch == '.':
                    continue
                d.rectangle([i * k, j * k, i * k + k - 1, j * k + k - 1], fill=tuple(int(v) for v in rgb(key[ch])))
                if (x0 + i, y) in F:
                    d.line([i * k + 2, j * k + 2, i * k + k - 3, j * k + k - 3], fill=(0, 220, 0))
        px, py = pivot(piece)
        cx, cy = (px + 0.5) * k, (py + 0.5) * k
        d.ellipse([cx - 3, cy - 3, cx + 3, cy + 3], outline=(255, 0, 255))
        ims.append(im)
    Wt = sum(i.width for i in ims) + 12 * len(ims)
    o = Image.new('RGB', (Wt, max(i.height for i in ims) + 8), (255, 255, 255))
    x = 0
    for im in ims:
        o.paste(im, (x, 4))
        x += im.width + 12
    o.save(os.path.join(out, 'saya-upper-pieces@8.png'))


def main():
    N = native(sys.argv[1])
    key = tones(N)
    if sys.argv[2] == '--key':
        for ch, h in key.items():
            print(ch, h)
        return
    check(key)
    H = hers(N, key)
    write_ts(sys.argv[2], key)
    for p in PIECES:
        F = sorted(fill(p, H), key=lambda c: (c[1], c[0]))
        total = sum(ch != '.' for r in p[-1] for ch in r)
        print(f'{p[0]}: {total - len(F)} of {total} cells hers, {len(F)} filled')
    if len(sys.argv) > 3:
        os.makedirs(sys.argv[3], exist_ok=True)
        sheet(sys.argv[3], key, H)


if __name__ == '__main__':
    main()
