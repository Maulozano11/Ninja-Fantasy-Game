"""Shared helpers for lifting the owner's princess (docs/reference/princess-owner-reference.jpg).

Provisional "Rosalind, la Princesa del Alba Rosa" / "Rosalind, the Rose Dawn Princess" (he will rename
her). He asked for all of her to be copied for female characters the way Aiden was ("copia para
personajes mujer todo como aiden"): each part its own creator option, his pixels and colours, his
black line, hidden parts filled by continuing his pixels.

His picture (2000 x 2000) is pixel art drawn at our game's scale, blown up 20 times: one of his
pixels is exactly 20 x 20 picture pixels from (0, 0) (PITCH, PHASE; the edges of the whole picture
fall on x and y = 20k and nowhere else), 100 x 100 of them, and one of his pixels is one fine pixel
of our 256 x 256 sprite frame. She stands 97 of them tall from the tiara's tip (row 2) to the near
sole (row 98), 91 from the top of her hair (row 7): our female body is 91 (skull top 128 to near sole
218). So nothing is scaled: each part is his pixels moved onto our rig (OFFSET for the whole figure,
PART_OFFSET per part; limbs later ride the rig as PaintedPieces at his angles, src/sprite/painted.ts).

  native()            his pixels, (100, 100, 3) int: the median of each block's inside
  background(a)       the white round her, reached from the picture's edge
  figure()            her figure; sparkles() the loose sparkles round the sceptre
  PALETTE             his colours (cluster centres of her figure, darkest first); quantize(a)
  family(a)           what kind of colour each pixel is (line, skin, hair, gown, lilac, gold, gem, eye...)
  JOINTS, EYES        her joints and eyes in his pixels
  OUR_JOINTS, OUR_EYES our female rig at idle frame 0 (tools/refs/princess-idle.ts prints it)
  PARTS, LAYERS, HIDES the parts, back-to-front order and what each hides
  part_map()          which part each of his pixels is (-1 the white); part_mask(name)
  placed(name)        a part (or the whole figure) moved onto our 256 x 256 frame, RGBA

Which body: body/female-v2 (the new female body from his heroines) had committed nothing when this
was written, so OUR_JOINTS is our current female body at idle frame 0. Nothing else here depends on
the body: his joints, parts and colours are his. A refit to the new body reruns
`npx tsx tools/refs/princess-idle.ts <out>` on that branch, pastes its print into OUR_JOINTS, and the
part offsets (PART_OFFSET, solved from the joints) follow.

Scripts import this with sys.path.insert(0, os.path.dirname(__file__)) and run with python3 -I from
the repository root. tools/refs/princess-study.py writes the previews.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

from aiden_ref import luma, pack, save, ts_piece  # noqa: E402,F401

REF = 'docs/reference/princess-owner-reference.jpg'
NAME = ('Rosalind, the Rose Dawn Princess', 'Rosalind, la Princesa del Alba Rosa')
# His pixel and where the first boundary falls, picture pixels: the period of her edges over the whole
# picture is 20.000 on both axes (19.995 and 20.005 score lower), and all the edge strength sits on
# x, y = 20k (the columns 20k + 1 .. 20k + 18 inside a block carry under 3% of it).
PITCH = 20.0
PHASE = (0.0, 0.0)
SIZE = 100
# The inside of a block that native() reads: 2 picture pixels in from each edge (JPEG ringing).
INSET = 2


_NATIVE = None


def native():
    """His pixels: the median of each block's inside, as an (100, 100, 3) int array."""
    global _NATIVE
    if _NATIVE is None:
        a = np.asarray(Image.open(REF).convert('RGB')).astype(np.int32)
        p = int(PITCH)
        out = np.zeros((SIZE, SIZE, 3))
        for j in range(SIZE):
            for i in range(SIZE):
                c = a[j * p + INSET:(j + 1) * p - INSET, i * p + INSET:(i + 1) * p - INSET].reshape(-1, 3)
                out[j, i] = np.median(c, axis=0)
        _NATIVE = np.clip(np.round(out), 0, 255).astype(np.int32)
    return _NATIVE.copy()


def background(a, light=236, grey=12):
    """The white round her, reached from the picture's edge through pixels lighter than `light` and
    no more coloured than `grey` (his pale sparkles are coloured, so the flood stops at them)."""
    H, W, _ = a.shape
    L = luma(a)
    flat = (a.max(2) - a.min(2)) <= grey
    ok = (L > light) & flat
    bg = np.zeros((H, W), bool)
    stack = [(y, x) for y in (0, H - 1) for x in range(W)] + [(y, x) for x in (0, W - 1) for y in range(H)]
    while stack:
        y, x = stack.pop()
        if not (0 <= y < H and 0 <= x < W) or bg[y, x] or not ok[y, x]:
            continue
        bg[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    return bg


def _components(mask):
    """4-connected components of a mask: (label array, count); -1 outside."""
    H, W = mask.shape
    lab = np.full((H, W), -1)
    n = 0
    for y in range(H):
        for x in range(W):
            if not mask[y, x] or lab[y, x] >= 0:
                continue
            stack = [(y, x)]
            lab[y, x] = n
            while stack:
                cy, cx = stack.pop()
                for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                    if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and lab[ny, nx] < 0:
                        lab[ny, nx] = n
                        stack.append((ny, nx))
            n += 1
    return lab, n


def figure():
    """Her figure (with the sceptre and the sparkles): every pixel that is not the white round her."""
    return ~background(native())


def sparkles():
    """The loose sparkles round the sceptre's head: the bits of her figure not joined to her body."""
    fig = figure()
    lab, n = _components(fig)
    sizes = np.bincount(lab[lab >= 0], minlength=n)
    return fig & (lab >= 0) & (lab != int(np.argmax(sizes)))


# His colours (93). Her figure's pixels (outside the sparkles) clustered greedily, lightest last, a colour
# joining the first centre within 8 on every channel; centres with at least 4 pixels are his colours,
# the rest (about 1 pixel in 20, mostly where two colours meet) are blends the blow-up and the JPEG
# made, and quantize() moves them to the nearest of his. Rebuilt by
# `python3 -I tools/refs/princess-study.py --palette`.
PALETTE_HEX = [
    '#060317', '#07051b', '#673a4d', '#723c55', '#7c4244', '#7b4059', '#804447', '#814644',
    '#82455d', '#864b46', '#864c44', '#854864', '#8b4962', '#8c4c66', '#944e67', '#905a41',
    '#94526a', '#7d588c', '#96603a', '#816192', '#9a663b', '#a9566d', '#a05c77', '#ab586f',
    '#856699', '#a36a4e', '#88699a', '#8b6d9e', '#b66173', '#ae647d', '#ba6577', '#9172a3',
    '#b46a80', '#9a79a8', '#c86e7f', '#be7287', '#c8758a', '#c18e39', '#a884b4', '#d07988',
    '#ca7b90', '#ce8071', '#c69038', '#d17d8c', '#ca9245', '#ac8cb9', '#d28676', '#cb9446',
    '#d28296', '#ac8fba', '#cc9743', '#ce9749', '#b294c0', '#b497c1', '#db8b9d', '#d4a146',
    '#b599c2', '#d7a24e', '#de9680', '#e092a2', '#dca94c', '#e09d84', '#e495a3', '#daaa58',
    '#e39aaa', '#cca6cc', '#e2b25b', '#f19faa', '#f5a2a9', '#eaba5e', '#f5a6ad', '#ecc062',
    '#fab1bc', '#f2c76e', '#fab6c1', '#f4ca6a', '#f6c8aa', '#e9c4e3', '#f7caad', '#fcc2ca',
    '#fad383', '#fad586', '#ebcae6', '#fdc7d0', '#fdda84', '#fddc8d', '#fdced8', '#fde18e',
    '#fed6dd', '#fdecbb', '#fdeec2', '#fff7dc', '#fdfdfd',
]


def _palette(tol=8, keep=4):
    N = native()
    fig = figure() & ~sparkles()
    cols = N[fig]
    order = np.argsort(luma(cols), kind='stable')
    cents, members = [], []
    for c in cols[order]:
        for k, ref in enumerate(cents):
            if np.abs(ref - c).max() <= tol:
                members[k].append(c)
                break
        else:
            cents.append(c.copy())
            members.append([c])
    pal = [np.round(np.median(np.array(m), axis=0)).astype(int) for m in members if len(m) >= keep]
    pal.sort(key=lambda c: float(luma(c)))
    return np.array(pal)


def rgb(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)])


PALETTE = np.array([rgb(h) for h in PALETTE_HEX])


def rgb_hex(c):
    return '#%02x%02x%02x' % tuple(int(v) for v in c)


def quantize(a, pal=None):
    """Each pixel moved to the nearest of his colours."""
    pal = PALETTE if pal is None else pal
    d = ((a[..., None, :] - pal[None, None, :, :]) ** 2).sum(-1)
    return pal[np.argmin(d, -1)]


# What kind of colour a pixel is, from its channels alone (the parts then say where):
FAMILIES = ('white', 'line', 'skin', 'hair', 'gown', 'lilac', 'gold', 'gem', 'eye', 'pale')


def family(a):
    """(H, W) index into FAMILIES. 'line' his near-black outline; 'skin' her skin and its shades
    (green over blue, warm); 'gold' the tiara, embroidery, sceptre and shoes (yellows and their
    browns); 'gem' the tiara's red; 'eye' her violet irises (blue over red); 'lilac' the underskirt,
    sleeves and embroidery ground (blue at or over green, cool); 'hair' and 'gown' the pinks
    (red well over blue): his hair pinks are lighter and cooler than his gown's, which the parts
    then settle by place; 'pale' a sparkle's light."""
    a = np.asarray(a).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    L = luma(a)
    out = np.zeros(a.shape[:2], int)
    out[:] = FAMILIES.index('gown')
    out[(b > r + 10) & (b > g + 30) & (r < 180)] = FAMILIES.index('eye')
    out[(b >= g) & (r - g < 60) & (r - b < 30)] = FAMILIES.index('lilac')
    out[(r > b + 50) & (g > b + 25)] = FAMILIES.index('gold')
    out[(g > b) & (g - b < 45) & (r > 185) & (r - g > 28)] = FAMILIES.index('skin')
    out[(r > 130) & (g < 70) & (b < 90)] = FAMILIES.index('gem')
    hairish = (b > g) & (r > 225) & (b > 180)
    out[hairish] = FAMILIES.index('hair')
    out[L < 45] = FAMILIES.index('line')
    out[(L >= 236) & ((a.max(-1) - a.min(-1)) <= 12)] = FAMILIES.index('white')
    return out


# Her joints in his pixels (x, y; his pixel (i, j) spans i..i+1, j..j+1), read off his picture (near =
# screen-left, as ours). Much of her body is under the gown: the hips and knees are where her skirt's
# folds and her feet put them.
#   head      the middle of her skull, 1.5 over her eyes as ours
#   neck      under her chin, inside the high gold collar
#   shoulder  the near one at her bare shoulder over the puffed sleeve, the far one under the far puff
#   elbow     the near arm hangs, bent a little forward at the bottom of the lilac puff; the far arm is
#             raised out to the right, the elbow in the far lilac sleeve
#   wrist     the gold cuffs; hand the middle of each hand (the far hand grips the sceptre)
#   pelvis    under the bodice's gold point; hips half a hand to each side
#   knee      under the skirt, between hip and ankle, toward her wide stance
#   ankle     the near foot shows only its shoe's toe under the hem (seen nearly front-on); the far
#             foot steps out to the right in a heeled shoe
JOINTS = {
    'head': (55.0, 17.5),
    'neck': (54.0, 27.0),
    'shoulderN': (44.0, 35.0),
    'shoulderF': (61.5, 36.0),
    'elbowN': (39.0, 46.0),
    'elbowF': (65.5, 45.5),
    'wristN': (35.5, 53.0),
    'wristF': (70.0, 46.5),
    'handN': (34.0, 56.5),
    'handF': (73.0, 46.5),
    'pelvis': (55.5, 54.0),
    'hipN': (51.0, 55.0),
    'hipF': (60.0, 53.0),
    'kneeN': (45.0, 74.0),
    'kneeF': (60.0, 72.0),
    'ankleN': (37.5, 94.0),
    'ankleF': (60.5, 90.5),
}
# Her eyes: the middle of each iris across (near columns 51-52, far 57-58), the middle of the eye from
# its lashes (row 18) to its lower edge (row 20).
EYES = {'near': (52.0, 19.5), 'far': (58.0, 19.5)}
# Her soles' last rows: near 98, far 96.
SOLE = {'near': 98, 'far': 96}

# Our female body at idle frame 0, bare, in fine pixels of our 256 x 256 frame (the print of
# `npx tsx tools/refs/princess-idle.ts <out>`).
OUR_JOINTS = {
    'head': (126.00, 140.00),
    'neck': (127.24, 149.84),
    'shoulderN': (116.52, 154.62),
    'shoulderF': (132.68, 154.05),
    'elbowN': (112.82, 166.03),
    'elbowF': (135.22, 165.78),
    'wristN': (110.46, 176.16),
    'wristF': (140.49, 174.74),
    'handN': (109.75, 179.23),
    'handF': (142.09, 177.46),
    'pelvis': (127.00, 177.47),
    'hipN': (119.88, 177.11),
    'hipF': (132.94, 173.66),
    'kneeN': (120.45, 193.10),
    'kneeF': (139.58, 188.21),
    'ankleN': (116.78, 207.65),
    'ankleF': (137.28, 203.04),
}
# Our female's 'standard' eyes: near iris columns 125-126, far 132, lashes row 139 to lower edge 143.
OUR_EYES = {'near': (126.0, 141.5), 'far': (132.5, 141.5)}
OUR_SOLE = 218


def _mid(a, b):
    return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)


def _shift(her, our):
    """The whole-pixel move that lays the mean of her points on the mean of ours."""
    h = np.mean(np.asarray(her, float), 0)
    o = np.mean(np.asarray(our, float), 0)
    return int(np.round(o[0] - h[0])), int(np.round(o[1] - h[1]))


# The parts, back to front (LAYERS), what each is and what it hides of the others. Hidden pixels are
# not drawn by him: the later lifting jobs fill them by continuing his pixels (as Aiden's).
PARTS = ('hair_back', 'underskirt', 'shoes', 'body', 'overskirt', 'bodice', 'sleeve_far', 'sleeve_near',
         'face', 'eyes', 'hair_front', 'tiara', 'sceptre', 'sparkles')
LAYERS = PARTS
HIDES = {
    'hair_back': 'nothing: the long wavy mass behind her head, back and near shoulder down to her '
                 'waist; the crown, the near shoulder, the near sleeve and the bodice hide its middle',
    'underskirt': 'her legs: the lilac panel in the overskirt\'s opening with its gold hem band, and the '
                  'dark purple petticoat under the hem; the overskirt hides its sides and its top',
    'shoes': 'her feet: the near shoe shows only its toe under the hem (the rest under the skirt), the '
             'far heeled shoe and its lilac stocking step out under the petticoat',
    'body': 'her skin: bare shoulders, the decolletage over the bodice, both hands; the gown hides '
            'the rest of her body (arms in the sleeves, torso, legs)',
    'overskirt': 'the underskirt\'s sides, her hips and legs: the open pink overskirt with its lilac and '
                 'gold embroidered hems, from the waist to the floor',
    'bodice': 'her torso: the gold-embroidered lilac bodice with its point over the skirt and the high '
              'gold collar (hides her neck and the overskirt\'s waist)',
    'sleeve_far': 'the far arm: pink puff, gold band, lilac sleeve and cuff, raised to the right; hides '
                  'the hair falling on that side',
    'sleeve_near': 'the near arm: pink puff with its gold top band, gold band, big lilac puffed sleeve and '
                   'cuff; hides the back hair and the overskirt\'s near side',
    'face': 'the face skin, nose and mouth; the bangs and side locks lie over its edges',
    'eyes': 'her violet eyes with their lashes and lights, on the face',
    'hair_front': 'the crown under the tiara, the bangs, the lock down the far side of the face and the '
                  'strand falling in front of the near shoulder to the bust; hide the face\'s edges, '
                  'the top of the back hair and the bodice\'s near edge',
    'tiara': 'the gold tiara with the red gem, on the hair: hides the top of the head',
    'sceptre': 'the gold sceptre with its pink gem head, held in the far hand: the fingers close over '
               'its shaft; hides a little of the overskirt\'s far side',
    'sparkles': 'the loose sparkles round the sceptre\'s head (an effect, not worn)',
}

# Where each part is, in his pixels: polygons (corner coordinates) a pixel's middle must fall in, with
# the colour families it may be. A pixel goes to the first part (in CLAIM order) that takes it; his
# black line goes to the part it outlines (the front-most of the parts round it).
CLAIM = ('sparkles', 'sceptre', 'tiara', 'eyes', 'face', 'body', 'shoes', 'sleeve_far', 'sleeve_near',
         'hair_front', 'bodice', 'underskirt', 'hair_back', 'overskirt')
REGIONS = {
    'sceptre': ([[(73, 20), (86, 20), (86, 37), (73, 37)], [(74, 36), (78, 36), (73, 61), (68, 61)]],
                ('gold', 'gem', 'gown', 'hair', 'lilac', 'pale', 'eye')),
    'tiara': ([[(43, 1), (62, 1), (62, 13), (43, 13)]], ('gold', 'gem', 'pale')),
    'eyes': ([[(49, 18), (54, 18), (54, 21), (49, 21)], [(56, 18), (60, 18), (60, 21), (56, 21)]],
             ('eye', 'line', 'lilac', 'pale', 'white')),
    'face': ([[(47, 12), (62, 12), (62, 30), (47, 30)]], ('skin',)),
    'body': ([[(25, 25), (80, 25), (80, 62), (25, 62)]], ('skin',)),
    'shoes': ([[(33, 92), (42, 92), (42, 100), (33, 100)], [(56, 86), (64, 86), (64, 90), (68, 91),
                                                             (70, 98), (56, 98)]], None),
    'sleeve_far': ([[(59, 34), (65, 34), (66, 41), (72, 42), (72, 50), (60, 50), (59, 41)]], None),
    'sleeve_near': ([[(36, 33), (46, 33), (46, 42), (45, 42), (45, 54), (31, 54), (30, 46), (32, 42),
                      (35, 41)]], None),
    'bodice': ([[(48, 25), (59, 25), (59, 34), (61, 34), (61, 50), (55, 57), (53, 57), (49, 50), (49, 34)]],
               None),
    'hair_front': ([[(40, 4), (66, 4), (66, 18), (40, 18)], [(45, 18), (50, 18), (50, 34), (49, 42), (46, 42),
                                                             (46, 34)], [(57, 18), (65, 18), (65, 34), (59, 34)]],
                   ('hair', 'gown', 'line', 'skin')),
    'underskirt': ([[(53, 54), (56, 54), (61, 58), (64, 60), (64, 80), (66, 81), (67, 85), (71, 85),
                     (71, 91), (64, 92), (44, 92), (44, 85), (48, 85), (49, 81), (51, 79), (51, 60)]], None),
    'hair_back': ([[(24, 4), (66, 4), (66, 48), (59, 48), (59, 34), (46, 34), (44, 51), (24, 51)]],
                  ('hair', 'gown', 'line', 'skin')),
    'overskirt': ([[(0, 40), (100, 40), (100, 100), (0, 100)]], None),
}
# Parts' order for his black line (a line pixel between two parts belongs to the front one).
FRONT = {p: k for k, p in enumerate(LAYERS)}


def inside(polys, xs, ys):
    """Even-odd test of points against each polygon of a list; True if in any."""
    res = np.zeros(np.broadcast(xs, ys).shape, bool)
    for poly in polys:
        poly = np.asarray(poly, float)
        hit = np.zeros_like(res)
        j = len(poly) - 1
        for i in range(len(poly)):
            xi, yi = poly[i]
            xj, yj = poly[j]
            hit ^= ((yi > ys) != (yj > ys)) & (xs < (xj - xi) * (ys - yi) / (yj - yi + 1e-12) + xi)
            j = i
        res |= hit
    return res


_PART_MAP = None


def part_map():
    """(100, 100) int: the index in PARTS of each of his pixels, -1 for the white round her."""
    global _PART_MAP
    if _PART_MAP is not None:
        return _PART_MAP.copy()
    N = native()
    fig = figure()
    fam = family(N)
    line = fam == FAMILIES.index('line')
    yy, xx = np.mgrid[0:SIZE, 0:SIZE]
    cx, cy = xx + 0.5, yy + 0.5
    out = np.full((SIZE, SIZE), -1)
    out[sparkles()] = PARTS.index('sparkles')
    for name in CLAIM:
        if name == 'sparkles':
            continue
        polys, fams = REGIONS[name]
        ok = inside(polys, cx, cy) & fig & (out < 0)
        if fams is not None:
            ok &= np.isin(fam, [FAMILIES.index(f) for f in fams])
        if name not in ('eyes',):
            # his line is settled after the colours, by the parts round it
            ok &= ~line
        out[ok] = PARTS.index(name)
    # his line: to the front-most part among its 8 neighbours (repeated so thick runs fill inward)
    todo = fig & (out < 0)
    for _ in range(6):
        if not todo.any():
            break
        new = out.copy()
        for y, x in zip(*np.nonzero(todo)):
            best = None
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if (dy or dx) and 0 <= ny < SIZE and 0 <= nx < SIZE and out[ny, nx] >= 0:
                        p = PARTS[out[ny, nx]]
                        if p == 'sparkles':
                            continue
                        if best is None or FRONT[p] > FRONT[best]:
                            best = p
            if best is not None:
                new[y, x] = PARTS.index(best)
        out = new
        todo = fig & (out < 0)
    _PART_MAP = out
    return out.copy()


def part_mask(name):
    return part_map() == PARTS.index(name)


# The whole figure laid on ours: her eyes' middle on our eyes' middle across, her near sole on ours
# down (her eyes-to-sole is 79 of his pixels, ours 77.5, so the head rides 1 high and the soles meet).
OFFSET = (int(np.round(_mid(OUR_EYES['near'], OUR_EYES['far'])[0] - _mid(EYES['near'], EYES['far'])[0])),
          OUR_SOLE - SOLE['near'])
# Each part's own move onto our rig (whole pixels, his pixels never resampled), solved from the joints
# it hangs on: the head group on the eyes, the torso on neck, shoulders and pelvis, each sleeve on its
# shoulder and elbow (the far one on its shoulder alone), the skirts on the pelvis and hips, the shoes
# on the soles, the sceptre with the far arm. Where his body and ours differ (his far arm is raised, his stance wider, his torso a little
# narrower and shorter) these moves leave seams the lifting jobs close by riding the rig (PaintedPiece
# pivots on these joints at his angles).
_HEAD = [_mid(EYES['near'], EYES['far'])], [_mid(OUR_EYES['near'], OUR_EYES['far'])]
_TORSO = [JOINTS[j] for j in ('neck', 'shoulderN', 'shoulderF', 'pelvis')], \
    [OUR_JOINTS[j] for j in ('neck', 'shoulderN', 'shoulderF', 'pelvis')]
_SKIRT = [JOINTS[j] for j in ('pelvis', 'hipN', 'hipF')], [OUR_JOINTS[j] for j in ('pelvis', 'hipN', 'hipF')]
PART_OFFSET = {
    'hair_back': _shift(*_HEAD),
    'face': _shift(*_HEAD),
    'eyes': _shift(*_HEAD),
    'hair_front': _shift(*_HEAD),
    'tiara': _shift(*_HEAD),
    'bodice': _shift(*_TORSO),
    'body': _shift(*_TORSO),
    'sleeve_near': _shift([JOINTS['shoulderN'], JOINTS['elbowN']], [OUR_JOINTS['shoulderN'], OUR_JOINTS['elbowN']]),
    'sleeve_far': _shift([JOINTS['shoulderF']], [OUR_JOINTS['shoulderF']]),
    'overskirt': _shift(*_SKIRT),
    'underskirt': _shift(*_SKIRT),
    'shoes': (OFFSET[0], OFFSET[1]),
    # his far arm is raised to the right holding the sceptre up; ours hangs. Until a lift turns it onto
    # our arm (or a raised-sceptre pose is added), the arm, the sceptre and its sparkles stay one group
    # on the far shoulder, so the hand keeps its grip.
    'sceptre': _shift([JOINTS['shoulderF']], [OUR_JOINTS['shoulderF']]),
    'sparkles': _shift([JOINTS['shoulderF']], [OUR_JOINTS['shoulderF']]),
}

GRID = 256


def placed(name=None, offset=None):
    """His pixels of a part (all of her when name is None) on our 256 x 256 frame, RGBA uint8, moved
    by `offset` (default: OFFSET for the whole figure, PART_OFFSET[name] for a part)."""
    N = native()
    mask = figure() if name is None else part_mask(name)
    dx, dy = offset if offset is not None else (OFFSET if name is None else PART_OFFSET[name])
    out = np.zeros((GRID, GRID, 4), np.uint8)
    ys, xs = np.nonzero(mask)
    ty, tx = ys + dy, xs + dx
    ok = (ty >= 0) & (ty < GRID) & (tx >= 0) & (tx < GRID)
    out[ty[ok], tx[ok], :3] = N[ys[ok], xs[ok]]
    out[ty[ok], tx[ok], 3] = 255
    return out

