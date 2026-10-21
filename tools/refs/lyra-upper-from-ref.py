"""Lyra's blouse and her corset, pauldron and bracers, from the owner's picture of her at our game's
scale (docs/reference/lyra-game-scale-owner-reference.jpg), as painted pieces that ride the rig.

His picture (1932 x 1932) is Lyra drawn by him at OUR sprite scale: one of his pixels (19.32 picture
pixels, phase 0, the grid of his Aiden) is one fine pixel of ours ("aqui tienes tus referencias
perfectas del modelo de mujer"). So nothing is brought down: every pixel below is one of his, in his
colour (the median of the block's inside; colours a JPEG step apart become the one he used most in
this part of the picture, PAL_BOX / PAL_TOL). Laid on our 256 x 256 frame his pixel (x, y) is at
(x + 74, y + 121): there his torso sits on ours, his near arm on our near arm.

She wears an off-the-shoulder cream blouse with puffed sleeves, a red scarf band round the near
shoulder and a red V at the neckline edged in gold, a leather band with a steel buckle round the near
puff; over it a brown leather corset with gold bands and filigree and steel buckles, one gold pauldron
on the far shoulder with its strap, and brown leather bracers with gold studs over long sleeves that
show a cream cuff at the wrist. Each part becomes one piece per segment of our female rig with his
Lyra's long arms (appearance `arms: 'long'`, src/sprite/rig.ts LONG_ARMS: her elbows where the female
body's are, her wrists where his are), pivot on its joint at idle (idle frame 0, holding her sword;
printed by tools/refs/heroine-idle.mts) and angle that segment's angle there, so at idle every piece is
exactly where he drew it and in other poses it turns with its limb (src/sprite/painted.ts stampPiece):

  top_offshoulder_blouse (src/sprite/items/lyraUpper.ts)
    BLOUSE_TORSO      neckline, red V, scarf on the chest, the body to the waist,  neck       torso.top
                      and her neck under the jaw
    BLOUSE_SLEEVE_N   bare shoulder, red scarf band, the puff and its leather band shoulderN nearArm.cloth
                      (BLOUSE_SLEEVE_N_CUT: where it takes our body's shoulder off)
    BLOUSE_FOREARM_N  the fitted sleeve under the bracer and the cuff             wristN     nearArm.body (with the arm:
                      (BLOUSE_FOREARM_N_CUT: where it takes our forearm off)          no cast shadow on his fist)
    BLOUSE_SLEEVE_F   the far puff, its top under the pauldron                    shoulderF  farArm.cloth
    BLOUSE_SIDE_F     its columns by the corset, over our torso's edge            shoulderF  torso.top (under the blouse)
    BLOUSE_FOREARM_F  the far fitted sleeve and its cuff                          wristF     farArm.cloth
                      (BLOUSE_FOREARM_F_CUT: where it takes our far forearm off)
  armor_gilded_corset
    CORSET            the corset                                                  neck       torso.armor
    CORSET_PAULDRON   the gold pauldron and its strap                             shoulderF  torso.armor
    CORSET_BRACER_N   the near bracer                                             wristN     nearArm.armor
    CORSET_BRACER_F   the far bracer                                              wristF     farArm.armor

The forearm pieces pivot on the wrist, so the cuff always ends at the wrist and the fist comes out of
it: on a body without her long arms (the body's own, two or three pixels shorter) the bracer's top goes
over the puff's foot instead of the cuff over the fist.

OWN says, per row of our frame, which of his pixels each piece takes (capital letters). His picture
hides parts of these clothes, and the game needs them when the braid, the hair or the arm moves away
or the other item is not worn; those cells (small letters, and the rules in build()) are filled by
continuing his pixels: each takes the colour of the nearest pixel of his in the same piece, the same
row first (black lines skipped), and the piece's edge there gets his black line:

  - under the braid: the corset (x 116-124, rows 160-168) and the blouse's neckline (x 124-127);
  - the blouse's body under the corset (rows 160-171), for the blouse worn alone: his cream, lit from
    the near side, his line round it;
  - the fitted sleeves under the bracers (his cream, light to dark as his leather is);
  - the far forearm between his bracer's top (rows 166-168) and its foot (row 174), which his pouch
    hides: the far bracer in his near bracer's pattern, between his edges (FAR_BRACER);
  - the far puff's top under the pauldron (the arm lifts the pauldron only halfway).

Her far arm, cell by cell ("no te olvides de el hombro y brazo izquierdo"): the pauldron (P), the far
puff under it and down to the elbow (F), the bracer's top under the puff (D, rows 166-168), its foot
under the pouch (D, row 174), the cuff and its line (G, rows 175-176) are his, where he drew them; his
far hand under the cuff is the female body's (his Lyra's open far hand, femaleBodyArt.ts relaxedFar).

Her bare near shoulder, the skin in the V and her neck under the jaw (K, V) are his skin, drawn in the
player's. Not his to take here: the rest of her skin (the body's), her hair and braid, the belt
with its buckle, the pouch, the tabard, the sword. Where our body's arm comes out from under his
sleeves, bracers and cuffs at idle (NEAR_UPPER_ARM, NEAR_FOREARM, FAR_FOREARM: the body's arm cells),
the pieces take it off (the *_CUT masks), so the arm's outline is his.

check() lays the pieces in the game's order at idle and makes sure every pixel taken from him comes
out his where it is laid. The same picture always gives the same bytes. Run from the repository
root:

  python3 -I tools/refs/lyra-upper-from-ref.py docs/reference/lyra-game-scale-owner-reference.jpg <out> [src/sprite/items/lyraUpperArt.ts]

It writes hers-vs-pieces@8.png (his pixels taken | the pieces stacked at idle | each piece alone) into
<out>.
"""

import os
import sys

import numpy as np
from PIL import Image

PITCH = 19.32
OFFSET = (74, 121)  # his pixel (x, y) is our (x + 74, y + 121)
# His colours: the box of the picture these clothes are in (our frame), and how close two medians
# must be to be one colour of his.
PAL_BOX = (100, 144, 146, 186)
PAL_TOL = 12

# Our female rig at idle frame 0 with his Lyra's long arms, holding her sword, fine pixels: the female
# body rebuilt from his heroines at our scale (tools/refs/female-body-from-ref.py), its forearms his
# Lyra's (rig.ts LONG_ARMS; printed by `npx tsx tools/refs/heroine-idle.mts <out>`). His picture laid at
# OFFSET stands on it: his shoulders, elbows, wrists, waist, knees and soles on ours.
J = {
    'neck': (126.94, 146.23),
    'shoulderN': (117.54, 150.96),
    'shoulderF': (131.50, 150.48),
    'elbowN': (111.05, 165.15),
    'elbowF': (134.04, 165.87),
    'wristN': (107.35, 175.30),
    'wristF': (141.59, 177.18),
    'pelvis': (127.00, 182.25),
}

# Which piece takes what, per row: (letter, x0, x1) inclusive. Capitals take his pixel, small letters
# are filled.
#   T/t blouse torso   S/s near sleeve   U/u near cuff and fitted sleeve   F/f far sleeve
#   C/c corset         P/p pauldron      B/b near bracer                    D/d far bracer
#   G   the far cuff below his pouch, and its line over the far hand
#   K   the bare top of the near shoulder, his skin and line round it (in the near sleeve piece)
#   V   the skin in the V of the neckline and of her neck under the jaw (in the blouse's body; the
#       neck's far line is a T: his line)
OWN = {
    147: [('P', 132, 133)],
    148: [('K', 117, 119), ('V', 125, 127), ('T', 128, 128), ('P', 130, 134)],
    149: [('K', 116, 119), ('V', 126, 128), ('T', 129, 129), ('P', 130, 135)],
    150: [('K', 115, 120), ('V', 126, 126), ('P', 127, 136)],
    151: [('K', 114, 120), ('P', 127, 137)],
    152: [('K', 114, 118), ('P', 127, 128), ('V', 129, 130), ('P', 131, 137), ('f', 133, 135)],
    153: [('S', 113, 120), ('T', 121, 127), ('V', 128, 131), ('T', 132, 133), ('P', 134, 138), ('f', 132, 135)],
    154: [('S', 113, 120), ('T', 121, 134), ('P', 135, 138), ('f', 133, 135)],
    155: [('S', 113, 119), ('T', 121, 133), ('F', 134, 136), ('P', 137, 138)],
    156: [('S', 113, 119), ('T', 121, 123), ('t', 124, 127), ('T', 128, 133), ('F', 134, 136), ('P', 137, 138)],
    157: [('S', 112, 120), ('T', 121, 123), ('t', 124, 127), ('T', 128, 133), ('F', 134, 136)],
    158: [('S', 112, 118), ('T', 119, 123), ('t', 124, 127), ('T', 128, 133), ('F', 134, 136)],
    159: [('S', 112, 119), ('T', 120, 124), ('t', 125, 126), ('T', 127, 128), ('C', 129, 132), ('T', 133, 133), ('F', 134, 136), ('t', 129, 132)],
    160: [('S', 111, 117), ('c', 119, 119), ('C', 120, 124), ('c', 125, 126), ('C', 127, 134), ('F', 135, 136)],
    161: [('S', 110, 117), ('c', 118, 120), ('C', 121, 134), ('F', 135, 136)],
    162: [('S', 109, 116), ('c', 118, 121), ('C', 122, 134), ('F', 135, 136)],
    163: [('S', 108, 116), ('c', 118, 121), ('C', 122, 134), ('F', 135, 137)],
    164: [('S', 108, 116), ('c', 118, 122), ('C', 123, 134), ('F', 135, 137)],
    165: [('S', 109, 116), ('c', 118, 121), ('C', 122, 134), ('F', 135, 137)],
    166: [('B', 109, 111), ('S', 112, 115), ('c', 117, 124), ('C', 125, 134), ('D', 135, 137)],
    167: [('B', 108, 113), ('c', 117, 120), ('C', 121, 134), ('D', 135, 138)],
    168: [('B', 107, 112), ('c', 117, 118), ('C', 119, 134), ('D', 135, 138)],
    169: [('B', 108, 112), ('T', 120, 122)],
    170: [('B', 107, 112)],
    171: [('B', 107, 111)],
    172: [('B', 106, 111)],
    173: [('U', 106, 113)],
    174: [('U', 105, 111), ('D', 138, 141)],
    175: [('U', 105, 111), ('G', 138, 142)],
    176: [('G', 139, 142)],
}
PIECE_OF = {'T': 'BLOUSE_TORSO', 'S': 'BLOUSE_SLEEVE_N', 'K': 'BLOUSE_SLEEVE_N', 'V': 'BLOUSE_TORSO', 'U': 'BLOUSE_FOREARM_N', 'F': 'BLOUSE_SLEEVE_F',
            'G': 'BLOUSE_FOREARM_F', 'C': 'CORSET', 'P': 'CORSET_PAULDRON',
            'B': 'CORSET_BRACER_N', 'D': 'CORSET_BRACER_F'}

# Our female body's arms at idle frame 0 with his Lyra's long arms (rows: first and last column,
# inclusive), as the body draws them under her clothes: the near shoulder (Aurelia's bare shoulder,
# femaleBodyArt.ts) and upper arm, and both forearms. Where they come out from under his sleeves,
# bracers and cuffs the pieces take them off (the *_CUT masks): our shoulder stands two rows higher
# than his, so his bare shoulder is the shoulder and his hair round it shows; our forearms are a
# column or two wider than his bracers.
NEAR_UPPER_ARM = {146: (117, 119), 147: (115, 120), 148: (114, 121), 149: (113, 121), 150: (113, 121),
                  151: (112, 121), 152: (113, 121), 153: (112, 120), 154: (112, 119), 155: (112, 118),
                  156: (111, 118), 157: (111, 117), 158: (110, 117), 159: (110, 116), 160: (110, 116),
                  161: (109, 115), 162: (113, 115), 163: (114, 114), 164: (114, 114)}
NEAR_FOREARM = {162: (109, 112), 163: (108, 113), 164: (108, 113), 165: (107, 113), 166: (107, 113),
                167: (107, 113), 168: (106, 112), 169: (106, 112), 170: (106, 112), 171: (106, 111),
                172: (106, 111), 173: (105, 110), 174: (105, 109)}
FAR_FOREARM = {163: (133, 135), 164: (132, 136), 165: (132, 137), 166: (132, 138), 167: (133, 138),
               168: (133, 139), 169: (134, 139), 170: (134, 140), 171: (135, 140), 172: (135, 141),
               173: (136, 141), 174: (137, 142), 175: (137, 142), 176: (138, 143)}
# The far forearm's cut starts at the bracer's top: above it the puff covers the forearm at idle (and
# in a bent arm the elbow must stay whole). The near forearm's is where his sleeve leaves it bare.
CUT_FROM = 166

# The far forearm his pouch hides, between his bracer's top (rows 166-168) and its foot (row 174):
# the far bracer in his near bracer's pattern, its edges running from his on to his.
FAR_BRACER = {169: (135, 139), 170: (136, 140), 171: (136, 140), 172: (137, 140), 173: (137, 141)}
# The blouse's body under the corset: rows, and the near edge per row (our torso's edge, a column out).
BODY_ROWS = range(160, 172)
BODY_NEAR = {160: 118, 161: 117, 162: 117, 163: 117, 164: 117, 165: 117, 166: 116, 167: 116, 168: 116,
             169: 117, 170: 117, 171: 117}
BODY_FAR = 134
# The corset's near edge under the braid: the corset's line there.
CORSET_LINE_X = {160: 118, 161: 117, 162: 117, 163: 117, 164: 117, 165: 117, 166: 116, 167: 116, 168: 116}

DOCS = {
    'BLOUSE_TORSO': 'The blouse: the red V edged in gold and the skin in it (in the player\'s skin), the red scarf across the chest, the cream bust and the body to the waist (pivot: the base of the neck).',
    'BLOUSE_SLEEVE_N': 'The near sleeve: the bare top of the shoulder above it (in the player\'s skin), the red scarf band round the shoulder, the puff, its leather band with a steel buckle (pivot: the near shoulder).',
    'BLOUSE_FOREARM_N': 'The near fitted sleeve under the bracer and its cream cuff at the wrist (pivot: the near wrist).',
    'BLOUSE_SLEEVE_F': 'The far puff, its top under the pauldron (pivot: the far shoulder).',
    'BLOUSE_SIDE_F': "The far puff's columns by the corset, drawn over the body's edge under the blouse; it moves with the far arm (pivot: the far shoulder).",
    'BLOUSE_FOREARM_F': 'The far fitted sleeve and its cuff, behind the pouch at her hip (pivot: the far wrist).',
    'CORSET': 'The corset: gold bands and filigree, steel buckles (pivot: the base of the neck).',
    'CORSET_PAULDRON': 'The gold pauldron on the far shoulder and its strap, down across the chest to the braid (pivot: the far shoulder).',
    'CORSET_BRACER_N': 'The near bracer: leather with gold studs (pivot: the near wrist).',
    'CORSET_BRACER_F': "The far bracer, in his near bracer's pattern, behind the pouch at her hip (pivot: the far wrist).",
}
CUT_DOCS = {
    'BLOUSE_SLEEVE_N': "Where our body's near shoulder and upper arm come out from under the near sleeve at idle: the sleeve takes them off",
    'BLOUSE_FOREARM_N': "Where our body's near forearm comes out from under the bracer and cuff at idle: the fitted sleeve takes it off",
    'BLOUSE_FOREARM_F': "Where our body's far forearm comes out from under the far bracer and cuff at idle: the fitted sleeve takes it off",
}
JOINT = {'BLOUSE_TORSO': ('neck', ('pelvis', 'neck')), 'CORSET': ('neck', ('pelvis', 'neck')),
         'BLOUSE_SLEEVE_N': ('shoulderN', ('shoulderN', 'elbowN')), 'BLOUSE_FOREARM_N': ('wristN', ('elbowN', 'wristN')),
         'CORSET_BRACER_N': ('wristN', ('elbowN', 'wristN')), 'BLOUSE_SLEEVE_F': ('shoulderF', ('shoulderF', 'elbowF')),
         'BLOUSE_SIDE_F': ('shoulderF', ('shoulderF', 'elbowF')), 'CORSET_PAULDRON': ('shoulderF', ('shoulderF', 'elbowF')),
         'BLOUSE_FOREARM_F': ('wristF', ('elbowF', 'wristF')), 'CORSET_BRACER_F': ('wristF', ('elbowF', 'wristF'))}
# The far puff's columns our torso's edge covers.
SIDE_TO = 136
# The game's drawing order (src/sprite/ctx.ts DEPTHS; within a depth, in the order drawn).
ORDER = ['BLOUSE_FOREARM_F', 'BLOUSE_SLEEVE_F', 'CORSET_BRACER_F', 'BLOUSE_SIDE_F', 'BLOUSE_TORSO', 'CORSET',
         'CORSET_PAULDRON', 'BLOUSE_FOREARM_N', 'BLOUSE_SLEEVE_N', 'CORSET_BRACER_N']


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
    """His pixels in our frame, each snapped to one of his colours."""

    def __init__(self, path):
        self.nat = native(path)
        x0, y0, x1, y1 = PAL_BOX
        cols = [tuple(int(v) for v in self.at_raw(x, y)) for y in range(y0, y1) for x in range(x0, x1)]
        cnt = {}
        for c in cols:
            cnt[c] = cnt.get(c, 0) + 1
        reps = []
        for c in sorted(cnt, key=lambda c: (-cnt[c], c)):
            if not any(max(abs(c[k] - r[k]) for k in range(3)) <= PAL_TOL for r in reps):
                reps.append(c)
        self.reps = reps

    def at_raw(self, x, y):
        return self.nat[y - OFFSET[1], x - OFFSET[0]]

    def at(self, x, y):
        """His colour at our (x, y), as an index into reps."""
        c = self.at_raw(x, y)
        return min(range(len(self.reps)), key=lambda i: (max(abs(int(c[k]) - self.reps[i][k]) for k in range(3)), i))

    def hex(self, i):
        return '#%02x%02x%02x' % self.reps[i]


def lum(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def build(h):
    """Each piece as {(x, y): colour index} in our frame at idle, and the cells taken from him."""
    line = h.at(111, 160)  # his black
    assert lum(h.reps[line]) < 10
    dark = lambda i: lum(h.reps[i]) < 30
    out = {n: {} for n in PIECE_OF.values()}
    taken = {n: set() for n in PIECE_OF.values()}
    fills = {n: [] for n in PIECE_OF.values()}
    for y, spans in OWN.items():
        for ch, a, b in spans:
            name = PIECE_OF[ch.upper()]
            for x in range(a, b + 1):
                if ch.isupper():
                    out[name][(x, y)] = h.at(x, y)
                    taken[name].add((x, y))
                else:
                    fills[name].append((x, y))

    def nearest(name, x, y):
        """The nearest of his pixels in the piece, not black: the same row first, then by distance."""
        best = None
        for (px, py) in sorted(taken[name]):
            v = out[name][(px, py)]
            if dark(v):
                continue
            d = (abs(py - y) * 4 + abs(px - x), px < x, px, py)
            if best is None or d < best[0]:
                best = (d, v)
        return best[1]

    for name, cells in fills.items():
        for (x, y) in cells:
            out[name][(x, y)] = nearest(name, x, y)

    # The corset's line where its near edge is, under the braid.
    for y, x in CORSET_LINE_X.items():
        out['CORSET'][(x, y)] = line
        for xx in range(x + 1, 125):
            if (xx, y) not in out['CORSET']:
                out['CORSET'][(xx, y)] = nearest('CORSET', xx, y)

    # The near bracer's and cuff's far edge (out to our forearm), in his line.
    for name in ('CORSET_BRACER_N', 'BLOUSE_FOREARM_N'):
        for y in sorted({y for (_, y) in out[name]}):
            xr = max(x for (x, yy) in out[name] if yy == y)
            if (xr, y) not in taken[name]:
                out[name][(xr, y)] = line

    # The blouse's body under the corset: his cream, lit from the near side (his light cream, then his
    # mid, his tan towards the far side), his line round it and under it.
    light, mid, tan = h.at(112, 163), h.at(114, 163), h.at(121, 158)
    for y in BODY_ROWS:
        for x in range(BODY_NEAR[y], BODY_FAR + 1):
            if (x, y) in out['BLOUSE_TORSO']:
                continue
            if x == BODY_NEAR[y] or x == BODY_FAR or y == BODY_ROWS[-1]:
                v = line
            elif x <= BODY_NEAR[y] + 2:
                v = mid
            elif x >= BODY_FAR - 3 or x in (124, 129):
                v = tan
            elif x >= BODY_FAR - 6:
                v = mid
            else:
                v = light
            out['BLOUSE_TORSO'][(x, y)] = v

    # The near fitted sleeve under the bracer: the bracer's cells, his leather turned to his cream (the
    # darker the leather, the darker the cream), his line kept; and the cuff (his) under it.
    creams = sorted({light, mid, tan}, key=lambda i: -lum(h.reps[i]))
    leathers = sorted({v for v in out['CORSET_BRACER_N'].values() if not dark(v)}, key=lambda i: -lum(h.reps[i]))
    for (x, y), v in out['CORSET_BRACER_N'].items():
        if dark(v):
            out['BLOUSE_FOREARM_N'][(x, y)] = line
        else:
            k = leathers.index(v) * len(creams) // max(1, len(leathers))
            out['BLOUSE_FOREARM_N'][(x, y)] = creams[min(k, len(creams) - 1)]

    # The far bracer over the far forearm, in his near bracer's pattern (rows 168-171 of it, mirrored
    # in no way: the same order of his leather from the near edge), and a cuff and fitted sleeve under it.
    pattern = [[out['CORSET_BRACER_N'][(x, y)] for x in range(108, 112)] for y in (169, 170)]
    for i, (y, (a, b)) in enumerate(sorted(FAR_BRACER.items())):
        row = pattern[i % 2]
        for x in range(a, b + 1):
            if x in (a, b):
                v = line
            else:
                v = row[min(x - a - 1, len(row) - 1)]
            out['CORSET_BRACER_F'][(x, y)] = v
    for (x, y), v in out['CORSET_BRACER_F'].items():
        if (x, y) not in out['BLOUSE_FOREARM_F']:
            if dark(v):
                out['BLOUSE_FOREARM_F'][(x, y)] = line
            else:
                k = leathers.index(v) * len(creams) // max(1, len(leathers)) if v in leathers else 1
                out['BLOUSE_FOREARM_F'][(x, y)] = creams[min(k, len(creams) - 1)]
    f = out['BLOUSE_SLEEVE_F']
    # The far puff's top under the pauldron gets his line round it (shown when the arm lifts).
    tops = [(x, y) for (x, y) in f if y < 155]
    y0 = min(y for _, y in tops)
    for (x, y) in tops:
        if y == y0 or x == max(xx for (xx, yy) in tops if yy == y) or x == min(xx for (xx, yy) in tops if yy == y):
            f[(x, y)] = line
    # Our torso's edge is drawn over the far arm: the far puff's columns there are drawn again over the
    # body, under the blouse (BLOUSE_SIDE_F), so they show; it moves with the far arm.
    out['BLOUSE_SIDE_F'] = {(x, y): v for (x, y), v in f.items() if x <= SIDE_TO and y >= 155}
    # Where the body's shoulder and upper arm come out from under the near sleeve, and its forearms
    # from under the bracers, fitted sleeves and cuffs (from the bracer's top down), the pieces take
    # them off (BLOUSE_SLEEVE_N_CUT, BLOUSE_FOREARM_N_CUT, BLOUSE_FOREARM_F_CUT).
    cells = lambda spans, y0=0: {(x, y) for y, (a, b) in spans.items() if y >= y0 for x in range(a, b + 1)}
    cut = {
        'BLOUSE_SLEEVE_N': cells(NEAR_UPPER_ARM) - set(out['BLOUSE_SLEEVE_N']),
        'BLOUSE_FOREARM_N': cells(NEAR_FOREARM) - set(out['BLOUSE_FOREARM_N']) - set(out['CORSET_BRACER_N']) - set(out['BLOUSE_SLEEVE_N']),
        'BLOUSE_FOREARM_F': cells(FAR_FOREARM, CUT_FROM) - set(out['BLOUSE_FOREARM_F']) - set(out['CORSET_BRACER_F']),
    }
    return out, taken, line, cut


def stack(out):
    top = {}
    for name in ORDER:
        top.update(out[name])
    return top


def check(out, taken):
    """Every pixel taken from him comes out his at idle. Returns the pixels that do not."""
    top = stack(out)
    owner = {}
    for name in ORDER:
        for c in out[name]:
            owner[c] = name
    bad = []
    for name, cells in taken.items():
        for c in cells:
            if top.get(c) != out[name][c]:
                bad.append((name, c, owner.get(c)))
    return bad


CHARS = 'abcdefhijklmnpqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'


def pack(cells, h):
    xs = [x for x, _ in cells]
    ys = [y for _, y in cells]
    x0, y0 = min(xs), min(ys)
    W, H = max(xs) - x0 + 1, max(ys) - y0 + 1
    used = sorted(set(cells.values()))
    ch = {v: CHARS[i] for i, v in enumerate(used)}
    grid = [['.'] * W for _ in range(H)]
    for (x, y), v in cells.items():
        grid[y - y0][x - x0] = ch[v]
    return [''.join(r) for r in grid], (x0, y0), {ch[v]: h.hex(v) for v in used}


def angle_of(a, b):
    return float(np.degrees(np.arctan2(J[b][1] - J[a][1], J[b][0] - J[a][0])))


def kind_of(c):
    """What a colour of his is, for the colour slots."""
    import colorsys
    r, g, b = c
    hh, ll, ss = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    hh *= 360
    if ll < 0.1:
        return 'line'
    if ss < 0.12 and ll > 0.3:
        return 'steel'
    if (hh >= 330 or hh < 10) and ss > 0.45:
        return 'lining'
    if 20 <= hh <= 50 and ll > 0.7 and ss < 0.7:
        return 'blouse'
    if 28 <= hh <= 50 and ss > 0.55 and ll > 0.4:
        return 'gold'
    if 20 <= hh <= 50 and ll > 0.5:
        return 'blouse'
    return 'leather'


def _skin_cells():
    """The K and V cells as (piece, x, y)."""
    out = set()
    for y, spans in OWN.items():
        for ch, a, b in spans:
            if ch in 'KV':
                out |= {(PIECE_OF[ch], x, y) for x in range(a, b + 1)}
    return out


SKIN = _skin_cells()


def skin_of(out):
    """His skin colours: those of the bare shoulder (K) and the V (V) that no other cell uses (his
    line is in the clothes, and his light on the shoulder snaps to the blouse's light cream, which
    stays the blouse's)."""
    on = {v for name, cells in out.items() for (x, y), v in cells.items() if (name, x, y) in SKIN}
    off = {v for name, cells in out.items() for (x, y), v in cells.items() if (name, x, y) not in SKIN}
    return on - off


def write_ts(out, h, path, cut):
    used = sorted({v for cells in out.values() for v in cells.values()})
    kinds = {v: kind_of(h.reps[v]) for v in used}
    # His skin is the player's skin, not a slot's: it is only on the bare shoulder.
    for v in skin_of(out):
        kinds[v] = 'skin'
    lines = [
        "// Lyra's blouse, corset, pauldron and bracers: the owner's pixels from his picture of her at our game's",
        '// scale (docs/reference/lyra-game-scale-owner-reference.jpg, one of his pixels is one of ours), cut by',
        '// tools/refs/lyra-upper-from-ref.py into one piece per segment of the rig, pivot on its joint at our',
        "// female idle, angle the segment's there. Generated: rerun the script to change it.",
        '',
        "import type { PaintedPiece } from '../painted';",
        '',
    ]
    for name in DOCS:
        rows, (ox, oy), pal = pack(out[name], h)
        jn, seg = JOINT[name]
        px, py = J[jn]
        lines += [f'/** {DOCS[name]} */', f'export const {name}: PaintedPiece = {{',
                  f'  pivot: [{int(np.floor(px)) - ox}, {int(np.floor(py)) - oy}],',
                  f'  angle: {angle_of(*seg):.2f},', '  rows: [']
        lines += [f"    '{r}'," for r in rows]
        lines += ['  ],', '  colors: {']
        lines += [f"    {k}: '{v}'," for k, v in pal.items()]
        lines += ['  },', '};', '']
        if name in cut:
            # The cells of our body's arm it takes off, laid as the piece is (its pivot and angle).
            xs = [x for x, _ in cut[name]]
            ys = [y for _, y in cut[name]]
            cx0, cy0 = min(xs), min(ys)
            rows = [''.join('x' if (x, y) in cut[name] else '.' for x in range(cx0, max(xs) + 1)) for y in range(cy0, max(ys) + 1)]
            what = CUT_DOCS[name]
            lines += [f"/** {what} (pivot and angle as the piece's). */",
                      f'export const {name}_CUT: PaintedPiece = {{',
                      f'  pivot: [{int(np.floor(px)) - cx0}, {int(np.floor(py)) - cy0}],',
                      f'  angle: {angle_of(*seg):.2f},', '  rows: [']
            lines += [f"    '{r}'," for r in rows]
            lines += ['  ],', "  colors: { x: '#000000' },", '};', '']
    docs = {
        'blouse': "Her blouse's creams, the one he used most first, then light to dark; the Blouse slot moves them from the first.",
        'lining': 'Her reds (the scarf band, the scarf and the V), the one he used most first, then light to dark; the Lining slot moves them from the first.',
        'leather': 'Her leathers, the one he used most first, then light to dark; the Leather slot moves them from the first.',
        'gold': 'Her golds, the one he used most first, then light to dark; the Gold slot moves them from the first.',
        'steel': 'Her steels (the buckles), the one he used most first, then light to dark; the Steel slot moves them from the first.',
    }
    for kind in ('blouse', 'lining', 'leather', 'gold', 'steel'):
        vs = sorted([v for v in used if kinds[v] == kind], key=lambda v: (-lum(h.reps[v]), v))
        # The slot's colour is the one he used most in these clothes.
        cnt = {v: sum(1 for cells in out.values() for c in cells.values() if c == v) for v in vs}
        main = max(vs, key=lambda v: (cnt[v], -v))
        vs.remove(main)
        vs.insert(0, main)
        lines.append(f'/** {docs[kind]} */')
        lines.append(f"export const LYRA_{kind.upper()} = [{', '.join(repr(h.hex(v)) for v in vs)}];".replace('"', "'"))
        lines.append('')
    vs = sorted([v for v in used if kinds[v] == 'skin'], key=lambda v: (-lum(h.reps[v]), v))
    cnt = {v: sum(1 for cells in out.values() for c in cells.values() if c == v) for v in vs}
    main = max(vs, key=lambda v: (cnt[v], -v))
    vs.remove(main)
    vs.insert(0, main)
    lines.append("/** His skin on the bare top of the near shoulder and in the V, the one he used most first: the player's skin moves them from the first. */")
    lines.append(f"export const LYRA_SKIN = [{', '.join(repr(h.hex(v)) for v in vs)}];".replace('"', "'"))
    lines.append('')
    line = [v for v in used if kinds[v] == 'line']
    lines.append('/** His black line and his near-blacks: no slot moves them. */')
    lines.append(f"export const LYRA_LINE = [{', '.join(repr(h.hex(v)) for v in line)}];".replace('"', "'"))
    lines.append('')
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    os.replace(tmp, path)
    return kinds


def picture(out, taken, h, path, k=8):
    x0, y0, x1, y1 = 100, 144, 148, 184
    W, H = x1 - x0, y1 - y0
    bg = (205, 205, 215)

    def tile(cells):
        a = np.zeros((H, W, 3), np.uint8)
        a[:] = bg
        for (x, y), v in cells.items():
            if x0 <= x < x1 and y0 <= y < y1:
                a[y - y0, x - x0] = h.reps[v]
        return a
    his = tile({c: out[n][c] for n in taken for c in taken[n]})
    allhis = np.zeros((H, W, 3), np.uint8)
    for y in range(y0, y1):
        for x in range(x0, x1):
            c = h.at_raw(x, y)
            allhis[y - y0, x - x0] = c if min(c) < 235 else bg
    tiles = [allhis, his, tile(stack(out))] + [tile(out[n]) for n in ORDER]
    gap = np.zeros((H, 2, 3), np.uint8)
    row1 = np.concatenate(sum([[t, gap] for t in tiles[:3]], []), 1)
    row2 = np.concatenate(sum([[t, gap] for t in tiles[3:8]], []), 1)
    row3 = np.concatenate(sum([[t, gap] for t in tiles[8:]], []), 1)
    w = max(r.shape[1] for r in (row1, row2, row3))
    pad = lambda r: np.concatenate([r, np.zeros((H, w - r.shape[1], 3), np.uint8)], 1)
    img = np.concatenate([pad(row1), np.zeros((2, w, 3), np.uint8), pad(row2), np.zeros((2, w, 3), np.uint8), pad(row3)], 0)
    Image.fromarray(img).resize((img.shape[1] * k, img.shape[0] * k), Image.NEAREST).save(path)


def main():
    src, out_dir = sys.argv[1], sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    h = Hers(src)
    out, taken, line, cut = build(h)
    bad = check(out, taken)
    for b in bad:
        print('not his at idle:', b)
    picture(out, taken, h, os.path.join(out_dir, 'hers-vs-pieces@8.png'))
    for name in DOCS:
        print(name, 'cells', len(out[name]), 'his', len(taken.get(name, ())), 'colours', len(set(out[name].values())))
    if bad:
        raise SystemExit('pieces are not his picture at idle')
    if len(sys.argv) > 3:
        kinds = write_ts(out, h, sys.argv[3], cut)
        for v, kd in sorted(kinds.items(), key=lambda t: t[1]):
            print(kd, h.hex(v))


if __name__ == '__main__':
    main()
