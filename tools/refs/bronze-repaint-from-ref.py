"""The owner's repaint of his bronze warrior at our scale (docs/reference/bronze-warrior-repaint-owner-reference.jpg) as his pieces, for both his sets.

He answered our cleaned reduction of his leather-set picture with his own repaint of it at the game's scale
(2026-10-24, "aqui esta tu nueva version"): on the right of his picture, our idle figure drawn again by him,
one of his pixels one fine pixel of ours (about 15.05 picture pixels). It replaces our reduction for the
leather set: every pixel of his is copied as he painted it, in his place. And he chose his repainted pieces for
the bronze set too ("si las usamos si arregla el pixel"): head, hair and braid, diadem, cape and scarf, skirt,
arms and legs; the bronze set keeps its own cuirass, clasp and pauldrons (bronze-armor-from-ref.py,
bronze-pauldrons-from-ref.py).

  - His grid is read off the picture (tools/refs/owner_paintover.py native), each of his pixels the median of
    its cell's middle, and the JPEG's noise snapped to his colours (owner_paintover.merge, within TOL).
  - His figure stands where ours stands: his column 0 on our column HIS_AT[0], his row 0 on HIS_AT[1] (his
    soles on ours; there his body lies on ours to the pixel). His head is his own, smaller than ours: five
    rows lower at the top, his chin where ours is.
  - Each of his pixels is a piece of the set: below his chin the piece our reduction drew there at rest
    (tools/refs/bronze_ref.py figure, the leather order), or the nearest one where ours drew nothing; on his
    head, by his colours: his gold and bronze down to his gold's last row the diadem, his skin, eyes and the
    brown in his face the face, the rest of his head (his line, his near-blacks and blue-greys) the hair.
  - Each piece is continued where the pieces in front of it hide it, so it still shows whole when they move
    or are not worn: below his chin with our reduction's pixels of that piece there (his body lies on ours);
    his face up under his hair to his skull (the skin he painted nearest, his line round it), his hair under
    his diadem (his hair's colour above it). Only where a piece in front of it covers it, so at male idle
    frame 0 his leather set is his repaint pixel for pixel (src/sprite/hoplite.test.ts).
  - With the bronze cuirass his neck shows where the leather collar covered it: what the bronze set leaves
    open inside his figure there (his "pixel") is his neck, the face continued with his nearest skin.
  - His face and eyes are the 'hoplite' face and eye shapes (body.ts), his eyes cell by cell with the lid
    states the game needs (eye_states).
  - HOPLITE_FIGURE is the bronze set at male idle frame 0 as these pieces draw it with the bronze cuirass,
    clasp and pauldrons; HOPLITE_R_FIGURE the leather set, his repaint, his head included (the owner,
    2026-10-30: "simplemente agarra mi repintado y usalo pixel por pixel"); HOPLITE_JOINTS where his figure
    stands (hopliteRig.ts).

The same picture always gives the same bytes. Run from the repository root:

  python3 -I tools/refs/bronze-repaint-from-ref.py src/sprite/items/hopliteRepaintArt.ts [labels.png]
"""

import colorsys
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

import bronze_ref as R  # noqa: E402
import owner_paintover as P  # noqa: E402

SRC = 'docs/reference/bronze-warrior-repaint-owner-reference.jpg'
# His repaint, the right half of his picture (picture pixels), and his pixel's size there.
BOX = (1040, 40, 1900, 1493)
PITCH = 15.05
# His page's colour, how far from it his figure is (any channel), and how near two colours of his must be to
# be one (the JPEG's noise).
PAGE = (235, 231, 230)
PAGE_TOL = 40
TOL = 12
# His last row of the figure (below it the picture's edge), and where his corner (0, 0) lands in our frame.
LAST_ROW = 96
HIS_AT = (91, 123)
# Above this row of our frame his head is his own (his chin's row): below it his body lies on ours.
CHIN = 149
# His face's skull under his hair: from his face up to this many rows under the top of his hair.
SKULL_IN = 2
HEAD = ('hair', 'face', 'diadem')

# The pieces the two sets share (the rest of the bronze set is its cuirass, clasp and pauldrons).
SHARED = ('hair', 'braid', 'diadem', 'face', 'cape', 'scarf', 'skirt', 'arm_n', 'arm_f', 'bracer_n', 'bracer_f', 'fist_n', 'fist_f',
          'thigh_n', 'thigh_f', 'greave_n', 'greave_f', 'shoe_n', 'shoe_f')


def his():
    """His repaint in our frame: (256, 256, 3) his colours and where his figure is."""
    a = P.native(SRC, BOX, PITCH)
    # his page: the cells near its colour reached from the picture's edge (his eyes' whites, near the page's
    # colour, are inside his line, so his)
    near = np.abs(a - np.array(PAGE)).max(2) <= PAGE_TOL
    near[LAST_ROW + 1:] = True
    page = np.zeros(near.shape, bool)
    page[0, :] = near[0, :]
    page[-1, :] = near[-1, :]
    page[:, 0] = near[:, 0]
    page[:, -1] = near[:, -1]
    while True:
        grown = near & P.near8(page) & ~page
        if not grown.any():
            break
        page |= grown
    fg = ~page
    fg[LAST_ROW + 1:] = False
    a = P.merge(a, fg, TOL)
    col = np.zeros((256, 256, 3), np.int32)
    on = np.zeros((256, 256), bool)
    h, w = LAST_ROW + 1, a.shape[1]
    x0, y0 = HIS_AT
    col[y0:y0 + h, x0:x0 + w] = a[:h]
    on[y0:y0 + h, x0:x0 + w] = fg[:h]
    return col, on


def ours():
    """Our reduction of his leather set: each piece whole (continued under what hides it) and which piece each
    pixel is at rest, as the game drew it before his repaint."""
    a, lab = R.load()
    pieces = {n: R.piece(a, lab, n) for _, n in R.GAME_ORDER}
    a2, lab2 = R.load(R.REF_LEATHER)
    for n in R.LEATHER_PIECES:
        pieces[n] = R.piece(a2, lab2, n)
    _, who = R.figure(a, lab, pieces, R.leather_order())
    return pieces, who


def nearest(own, todo):
    """Each pixel of `todo` the owner of its nearest owned pixel (8-way, growing a ring at a time; ties to the
    piece first in the leather order)."""
    order = [n for _, n in R.leather_order()]
    own = own.copy()
    left = todo & (own == '')
    while left.any():
        grew = False
        for n in order:
            add = left & P.near8(own == n)
            if add.any():
                own[add] = n
                left &= ~add
                grew = True
        if not grew:
            break
    return own


def labels(col, on, who):
    """Which piece each of his pixels is (see the file's head)."""
    own = np.full((256, 256), '', object)
    below = np.zeros((256, 256), bool)
    below[CHIN:] = True
    head = on & ~below & (np.isin(who, HEAD) | (who == ''))
    body = on & ~head
    own[body] = who[body]
    mat = np.full((256, 256), '', object)
    for y, x in zip(*np.nonzero(head)):
        mat[y, x] = R.material(col[y, x], 'face')
    gold = np.zeros((256, 256), bool)
    for y, x in zip(*np.nonzero(head)):
        gold[y, x] = R.kind(col[y, x]) == 'gold'
    # (his gold is yellower than his skin, his bronze a deeper, darker brown than its shadows)
    yellow = np.zeros((256, 256), bool)
    for y, x in zip(*np.nonzero(head)):
        h, sat, val = colorsys.rgb_to_hsv(*(col[y, x] / 255))
        h *= 360
        yellow[y, x] = mat[y, x] not in ('line', 'dark') and (GOLD_HUE[0] <= h <= GOLD_HUE[1] or (BRONZE_HUE[0] <= h <= BRONZE_HUE[1] and sat >= BRONZE_SAT and val <= BRONZE_VAL))
    # (his diadem: his gold and bronze on his head down to his gold's last row, its band round the side too)
    low = int(np.nonzero(gold & head)[0].max())
    diadem = head & (gold | yellow)
    diadem[low + 1:] = False
    face = head & ~diadem & np.isin(mat, ('skin', 'red', 'white', 'warm'))
    own[head & diadem] = 'diadem'
    own[face] = 'face'
    own[head & ~diadem & ~face] = 'hair'
    return nearest(own, body & (own == ''))


def build(col, on, pieces, who):
    """The set's pieces from his repaint: {name: (mask, colours, line)} in our frame (see the file's head)."""
    own = labels(col, on, who)
    order = [n for _, n in R.leather_order()]
    rank = {n: i for i, n in enumerate(order)}
    front = lambda n: np.vectorize(lambda o: o != '' and rank[o] > rank[n])(own)
    line = np.zeros((256, 256), bool)
    for y, x in zip(*np.nonzero(on)):
        line[y, x] = R.kind(col[y, x]) == 'line'
    out = {}
    below = np.zeros((256, 256), bool)
    below[CHIN:] = True
    for n in order:
        mine = on & (own == n)
        m = mine.copy()
        c = np.where(mine[..., None], col, 0)
        isl = mine & line
        hidden = on & front(n) & ~mine
        if n not in HEAD or n == 'face':
            # below his chin: our reduction's pixels of the piece there
            pm, pc, pi = pieces[n]
            take = hidden & pm & (below if n == 'face' else True)
            m |= take
            c[take] = pc[take]
            isl |= take & pi
        out[n] = [m, c, isl]
    # his face up under his hair: his skull, the skin he painted nearest, his line round it
    fm, fc, fl = out['face']
    face = on & (own == 'face')
    xs = np.nonzero(face.any(0))[0]
    top = {x: int(np.nonzero(on[:, x])[0].min()) for x in range(256) if on[:, x].any()}
    eye_row = max(y for y, x in zip(*np.nonzero(face)) if R.material(col[y, x], 'face') in ('red', 'white'))
    skull = np.zeros((256, 256), bool)
    for x in range(int(xs.min()) - SKULL_X, int(xs.max()) + 1):
        if x not in top:
            continue
        for y in range(top[x] + SKULL_IN, eye_row + 1):
            if on[y, x] and own[y, x] in ('hair', 'diadem'):
                skull[y, x] = True
    # each skull pixel the colour of his nearest face skin pixel (growing a ring at a time from his face)
    src = face & ~line & np.isin(mat_of(col, face), ('skin',))
    got = src.copy()
    sc = np.where(src[..., None], col, 0)
    while (skull & ~got).any():
        ring = skull & ~got & P.near8(got)
        if not ring.any():
            break
        for y, x in zip(*np.nonzero(ring)):
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (-1, 1), (1, -1), (1, 1)):
                if got[y + dy, x + dx]:
                    sc[y, x] = sc[y + dy, x + dx]
                    break
        got |= ring
    rim = skull & R.near4(~(skull | face | fm))
    fm |= skull
    fc[skull] = sc[skull]
    fc[rim] = R.commonest(list(zip(*np.nonzero(on & line))), col)
    fl |= rim
    # his hair under his diadem: his hair's colour above it
    hm, hc, hl = out['hair']
    dia = on & (own == 'diadem')
    for y, x in sorted(zip(*np.nonzero(dia))):
        yy = y - 1
        while yy >= 0 and not hm[yy, x]:
            yy -= 1
        if yy >= 0:
            hm[y, x] = True
            hc[y, x] = hc[yy, x]
            hl[y, x] = hl[yy, x]
    return {n: tuple(v) for n, v in out.items()}, own


def bronze(rep, pieces):
    """The bronze set at rest with these pieces: (colours, which piece each pixel is), back to front."""
    img = np.zeros((256, 256, 3), np.int32)
    who = np.full((256, 256), '', object)
    for _, n in R.GAME_ORDER:
        m, c, _ = rep[n] if n in SHARED else pieces[n]
        img[m] = c[m]
        who[m] = n
    return img, who


def neck(rep, pieces, own):
    """His neck where the bronze set leaves his figure open (pixels nothing draws that the frame's edge cannot
    reach): the face continued there with his nearest skin, so long as at rest in his leather set a piece in
    front of the face covers it."""
    _, who = bronze(rep, pieces)
    empty = who == ''
    out = np.zeros((256, 256), bool)
    out[0, :], out[-1, :], out[:, 0], out[:, -1] = empty[0, :], empty[-1, :], empty[:, 0], empty[:, -1]
    while True:
        grown = empty & R.near4(out) & ~out
        if not grown.any():
            break
        out |= grown
    hole = empty & ~out
    order = [n for _, n in R.leather_order()]
    m, c, isl = rep['face']
    skin = m & ~isl & (mat_of(c, m) == 'skin')
    for y, x in sorted(zip(*np.nonzero(hole))):
        if own[y, x] == '' or order.index(own[y, x]) < order.index('face'):
            raise SystemExit(f'his neck at {x}, {y} would show in his leather set')
        ys, xs = np.nonzero(skin)
        k = int(np.argmin(np.abs(ys - y) + np.abs(xs - x) + 0.001 * (ys * 256 + xs)))
        m[y, x] = True
        c[y, x] = c[ys[k], xs[k]]
    return rep


SKULL_X = 6
# His gold on his head (hue, degrees), and his bronze (hue, at least this saturated, at most this bright).
GOLD_HUE = (30, 65)
BRONZE_HUE = (18, 45)
BRONZE_SAT = 0.5
BRONZE_VAL = 0.55


def mat_of(col, mask):
    out = np.full((256, 256), '', object)
    for y, x in zip(*np.nonzero(mask)):
        out[y, x] = R.material(col[y, x], 'face')
    return out

# The pieces, front of the module to back: (const, piece, what it is).
CONSTS = [
    ('HOPLITE_R_HEAD', 'face', 'His head, skull to neck: stamped on the face anchor.'),
    ('HOPLITE_R_HAIR', 'hair', 'His hair over the head: stamped on the face anchor, in front of the head.'),
    ('HOPLITE_R_BRAID', 'braid', 'His braid and its bands, behind the head and shoulders: stamped on the face anchor.'),
    ('HOPLITE_R_DIADEM', 'diadem', 'His diadem across the forehead: stamped on the face anchor.'),
    ('HOPLITE_R_LCHEST', 'lchest', 'His leather chest with its belt: rides the neck, leaning with the torso.'),
    ('HOPLITE_R_LCOLLAR', 'lcollar', 'His high navy collar and the square clasp on it, in front of the scarf.'),
    ('HOPLITE_R_LPAULDRON_N', 'lpauldron_n', 'His near iron pauldron: rides the near shoulder.'),
    ('HOPLITE_R_LPAULDRON_F', 'lpauldron_f', 'His far iron pauldron: rides the far shoulder.'),
    ('HOPLITE_R_SLEEVE_N', 'sleeve_n', 'His near navy sleeve and gold cuff: rides the near shoulder.'),
    ('HOPLITE_R_SLEEVE_F', 'sleeve_f', 'His far navy sleeve and gold cuff: rides the far shoulder.'),
    ('HOPLITE_R_CAPE', 'cape', 'His cape behind him: rides the neck, leaning with the torso.'),
    ('HOPLITE_R_SCARF', 'scarf', 'His scarf round the neck, in front of the head and the chest.'),
    ('HOPLITE_R_SKIRT', 'skirt', 'His skirt: rides the pelvis, leaning with the torso.'),
    ('HOPLITE_R_ARM_N', 'arm_n', 'His near bare upper arm: from the near shoulder.'),
    ('HOPLITE_R_ARM_F', 'arm_f', 'His far bare upper arm: from the far shoulder.'),
    ('HOPLITE_R_BRACER_N', 'bracer_n', 'His near bracer on the forearm: from the near elbow.'),
    ('HOPLITE_R_BRACER_F', 'bracer_f', 'His far bracer on the forearm: from the far elbow.'),
    ('HOPLITE_R_FIST_N', 'fist_n', 'His near fist: from the near wrist.'),
    ('HOPLITE_R_FIST_F', 'fist_f', 'His far fist: from the far wrist.'),
    ('HOPLITE_R_THIGH_N', 'thigh_n', 'His near bare thigh: from the near hip.'),
    ('HOPLITE_R_THIGH_F', 'thigh_f', 'His far bare thigh: from the far hip.'),
    ('HOPLITE_R_GREAVE_N', 'greave_n', 'His near greave: from the near knee.'),
    ('HOPLITE_R_GREAVE_F', 'greave_f', 'His far greave: from the far knee.'),
    ('HOPLITE_R_SHOE_N', 'shoe_n', 'His near shoe: from the near ankle.'),
    ('HOPLITE_R_SHOE_F', 'shoe_f', 'His far shoe: from the far ankle.'),
]


def bases(p):
    """His colours the colour slots recolour from (at these every pixel is his): his middle shade of each."""
    m = lambda names, kinds: R.middle_colour(p, names, kinds)
    return {
        'HOPLITE_R_SKIN': m(['face'], ('skin',)),
        'HOPLITE_R_HAIR_BASE': m(['hair'], ('hair', 'navy', 'grey', 'purple')),
        'HOPLITE_R_HAIR_BAND': m(['braid'], ('warm',)),
        'HOPLITE_R_DIADEM_BRONZE': m(['diadem'], ('warm',)),
        'HOPLITE_R_CAPE_CLOTH': m(['cape', 'scarf'], ('purple',)),
        'HOPLITE_R_SKIRT_NAVY': m(['skirt'], ('navy',)),
        'HOPLITE_R_SKIRT_LEATHER': m(['skirt'], ('warm',)),
        'HOPLITE_R_ARMS_BRONZE': m(['bracer_n', 'bracer_f'], ('warm',)),
        'HOPLITE_R_GREAVES_BRONZE': m(['greave_n', 'greave_f'], ('warm',)),
        'HOPLITE_R_GREAVES_SHOE': m(['shoe_n', 'shoe_f'], ('warm',)),
        'HOPLITE_R_LEATHER_MAIN': m(['lchest'], ('warm',)),
        'HOPLITE_R_LEATHER_COLLAR': m(['lcollar', 'sleeve_n', 'sleeve_f'], ('navy',)),
        'HOPLITE_R_LEATHER_IRON': m(['lpauldron_n', 'lpauldron_f'], ('grey',)),
        'HOPLITE_R_LEATHER_GOLD': m(['lpauldron_n', 'lpauldron_f', 'sleeve_n', 'sleeve_f'], ('warm',)),
    }


def figure_ts(name, doc, col, on):
    rows, origin, palette = R.pack(col, on)
    t = [f'/** {doc} */', f'export const {name}_AT: [number, number] = [{origin[0]}, {origin[1]}];']
    t.append(f'export const {name}: {{ rows: string[]; colors: Record<string, string> }} = {{')
    t.append('  rows: [')
    t += [f"    '{r}'," for r in rows]
    t += ['  ],', '  colors: {']
    t += [f"    '{k}': '{v}'," for k, v in palette.items()]
    t += ['  },', '};', '']
    return t


def main(out, study=None):
    col, on = his()
    pieces, who = ours()
    rep, own = build(col, on, pieces, who)
    rep = neck(rep, pieces, own)
    head = ("// The owner's repaint of his bronze warrior at our scale: his pixels, in his place, for both his sets.\n"
            f'// Lifted from docs/reference/{os.path.basename(SRC)} by tools/refs/bronze-repaint-from-ref.py.\n'
            f'// Generated: rerun the script to change it:\n//   python3 -I tools/refs/bronze-repaint-from-ref.py {out}\n')
    text = R.module(head, [(c, rep[n], d, n) for c, n, d in CONSTS], 'HOPLITE_R', bases(rep))
    text = text.replace("import type { PaintedPiece } from '../painted';", "import type { PaintedEye } from '../eyeArt';\nimport type { PaintedPiece } from '../painted';")
    m, c, _ = rep['face']
    t = [text] + R.eyes_ts('HOPLITE_R', *R.eye_states(m, c))
    t.append('/** His joints at our scale, where his figure stands them at male idle frame 0 (fine pixels; hopliteRig.ts). */')
    t.append('export const HOPLITE_JOINTS = {')
    for k in ('neck', 'pelvis', 'shoulderN', 'shoulderF', 'elbowN', 'elbowF', 'wristN', 'wristF', 'handN', 'handF', 'hipN', 'hipF', 'kneeN', 'kneeF', 'ankleN', 'ankleF'):
        x, y = R.fine_joint(k)
        t.append(f'  {k}: [{x:.4f}, {y:.4f}],')
    t += ['} as const;', '']
    img, bwho = bronze(rep, pieces)
    t += figure_ts('HOPLITE_FIGURE', 'The bronze set whole at male idle frame 0, as the game draws its preset: the first row\'s first cell at HOPLITE_FIGURE_AT.', img, bwho != '')
    t += figure_ts('HOPLITE_R_FIGURE', 'His repaint whole, the leather set at male idle frame 0 as the game draws its preset: the first row\'s first cell at HOPLITE_R_FIGURE_AT.', col, on)
    R.write(out, '\n'.join(t))
    if study:
        names = sorted(set(own[on]))
        rng = np.random.RandomState(7)
        pal = {n: rng.randint(40, 255, 3) for n in names}
        img = np.full((256, 256, 3), 255, np.uint8)
        for y, x in zip(*np.nonzero(on)):
            img[y, x] = pal[own[y, x]]
        Image.fromarray(img[110:230, 80:160]).resize((80 * 8, 120 * 8), Image.NEAREST).save(study)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
