"""The owner's skin shading on our male body, from his Roman paint-over (docs/reference/roman-owner-reference.jpg).

He painted our male's arms, hands and legs with more muscle and darker shadows than our body draws. The
owner approved (2026-10-21) giving every male character his skin: his skin as painted pieces per limb,
turning with each limb, plus his darker shadow tone in the skin ramp; the male body's shape and joints
stay ours (Aiden's fit depends on them). This script lifts his skin, limb by limb, out of his pixels
(tools/refs/roman_ref.py has the grid and our male rig's joints in his pixels):

  upper arms   near: rows 35-44 under his shoulder guard, down to the bracer (his elbow above it too);
               far: the strip of the far upper arm and elbow he shows beside the chest (his far arm is
               drawn FAR_ARM_IN nearer the body)
  hands        both, under the bracers (his fists)
  legs         each leg whole, from under the skirt to the ankle: his lower thigh and knee above the
               sandal's strap, and his shin's skin between the laces; one piece for our thigh, one for
               our shin, cut from the same pixels

His skin there is every pixel of his skin colours inside the limb's region, and the dark pixels inside it
that touch his skin on two sides (his finger creases and muscle lines); not his black line, which our
outline draws, nor the sandal's straps and laces. His forearms are under his bracers, so there is no skin
of his to lift there: our forearms keep our shading, with his darker tone.

Each limb is registered on ours: his upper arms and hands are moved onto ours as the bracers were, his
legs as his sandals were (roman_ref.sandal_pivot: his ankle on ours across, his sole on ours up and down),
so his skin meets his laces and at rest every pixel of his that lands on our limb is where he painted it.
Under the laces each pixel of a lace takes his skin from beside it in its row (between_laces), so the
shading across his shin runs on under it. Where our limb reaches past what he shows (the upper arm under
his shoulder guard, the thigh under his skirt, the ends at the joints) his pixels are continued along the
limb: each
such pixel takes the colour of his nearest skin pixel along the limb's axis, so his shading runs on down
the limb as a cylinder's does. The game recolours only our own limb's pixels with them (and an upper
arm's piece the forearm's next to the elbow; src/sprite/maleSkin.ts), so the body's shape is ours.

Writes, in <out>:

  study/skin@8.png    his picture beside the skin pieces lifted out of it (moved onto our limbs), at 8x

and, with a third argument, the game's module (src/sprite/maleSkinArt.ts): one PaintedPiece per limb
(its pivot the cell that lands on our joint, its angle our limb's at rest), the skin he painted over
(MALE_SKIN_BASE: a character in it shows his pixels exactly), his darker shadow tone (MALE_SKIN_DARK)
and where each piece lands in our idle frame 0. The same picture always gives the same bytes. Run from
the repo root with python3 -I:

  python3 -I tools/refs/roman-skin-from-ref.py docs/reference/roman-owner-reference.jpg <out> src/sprite/maleSkinArt.ts
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import roman_ref as R  # noqa: E402

# The skin of the sprite he painted over: a character in it shows his pixels exactly.
MALE_SKIN_BASE = R.PAINTED_SKIN

# Our male's limb radii (src/sprite/rig.ts BODY_PARAMS.male, armR and legR), in fine pixels: at the
# limb's root and at its far joint. His pixels are continued along the limb within these (and a pixel).
ARM_R = (4.7, 4.0)
LEG_R = (5.3, 4.0)
SHIN_R = (4.0, 2.8)
# Past the ends of what he shows, his pixels are continued from this far inside it, so the shadows his
# guard and skirt cast on the skin are not carried along the limb.
SKIP = 2

# His legs, from under the skirt to the ankle (the sandal's foot is not skin of his to lift).
LEG_N = [(34, 66.5), (50, 66.5), (50, 92), (34, 92)]
LEG_F = [(54, 67.5), (66, 67.5), (66, 92), (54, 92)]

# name: (his region (polygon in his pixel corners), how it is registered on ours, our joints a -> b (the
#        limb's direction), radii to continue his pixels within, or None for no continuing).
# Registered 'shift': his limb moved onto ours by whole pixels, the pivot on our joint a, turned as our
# limb turns from its rest angle (at rest every pixel is his). Registered 'sandal': the same, the whole
# pixels those his sandal on that leg is moved by (roman_ref.sandal_pivot).
LIMBS = {
    # His near arm is drawn 2 px further out than ours (the middle of his upper arm against ours, rows
    # 36 to 40); his near hand 2 px further in and a row higher than ours.
    'UPPER_ARM_N': ([(31, 34.5), (45, 34.5), (45, 45), (31, 45)], ('shift', (2, 0)), 'shoulderN', 'elbowN', ARM_R),
    'UPPER_ARM_F': ([(61, 37.5), (66, 37.5), (66, 46), (61, 46)], ('shift', (R.FAR_ARM_IN, 0)), 'shoulderF', 'elbowF', ARM_R),
    'HAND_N': ([(31, 53.5), (42, 53.5), (42, 61), (31, 61)], ('shift', (-2, 1)), 'wristN', 'handN', None),
    'HAND_F': ([(62, 52.5), (70, 52.5), (70, 59), (62, 59)], ('shift', (R.FAR_ARM_IN, 0)), 'wristF', 'handF', None),
    'THIGH_N': (LEG_N, ('sandal', 'N'), 'hipN', 'kneeN', LEG_R),
    'THIGH_F': (LEG_F, ('sandal', 'F'), 'hipF', 'kneeF', LEG_R),
    'SHIN_N': (LEG_N, ('sandal', 'N'), 'kneeN', 'ankleN', SHIN_R),
    'SHIN_F': (LEG_F, ('sandal', 'F'), 'kneeF', 'ankleF', SHIN_R),
}
DOCS = {
    'UPPER_ARM_N': 'His near upper arm: his skin under the shoulder guard down to his elbow, continued up to the shoulder. Pivot on our near shoulder.',
    'UPPER_ARM_F': 'His far upper arm: the strip he shows beside the chest down to his elbow, continued up and down the limb. Pivot on our far shoulder.',
    'HAND_N': 'His near fist, under the bracer. Pivot on our near wrist.',
    'HAND_F': 'His far fist, under the bracer. Pivot on our far wrist.',
    'THIGH_N': 'His near leg for our thigh: his lower thigh and knee under the skirt, continued up to the hip. Pivot on our near hip.',
    'THIGH_F': 'His far leg for our thigh: his lower thigh and knee under the skirt, continued up to the hip. Pivot on our far hip.',
    'SHIN_N': 'His near leg for our shin: his knee, and his skin between the laces with the laces taken off (each row\'s skin carried across them). Pivot on our near knee.',
    'SHIN_F': 'His far leg for our shin: his knee, and his skin between the laces with the laces taken off (each row\'s skin carried across them). Pivot on our far knee.',
}


def skin_of(a, K, region, other=None):
    """His skin inside a region: his skin colours, and the dark pixels touching his skin on two sides (not
    those of `other`, a mask of what is not his skin there: the sandals' straps and laces, the skirt)."""
    H, W, _ = a.shape
    m = region & (K == 'skin')
    out = m.copy()
    for y, x in zip(*np.nonzero(region & ~m)):
        if K[y, x] in ('line', 'hair', 'stud') or (other is not None and other[y, x]):
            continue
        r, g = int(a[y, x][0]), int(a[y, x][1])
        nb = sum(1 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= y + dy < H and 0 <= x + dx < W and m[y + dy, x + dx])
        if nb >= 2 and r > g + 20:
            out[y, x] = True
    return out


def continued(a, mask, ja, jb, length, radii):
    # `a`: his colours (with any laces already taken off)
    """His skin continued along the limb (axis from ja toward jb, `length` long, his pixels): every pixel
    within the radius of the limb, from the root's ball to the far joint, that is not his skin takes the
    colour of his nearest skin pixel along the axis (SKIP pixels further in, where his skin goes on)."""
    H, W, _ = a.shape
    ax, ay = ja
    dx, dy = jb[0] - ja[0], jb[1] - ja[1]
    n = float(np.hypot(dx, dy))
    ux, uy = dx / n, dy / n
    col = a.copy()
    m = mask.copy()
    at = lambda x, y, k, sgn: (int(np.floor(x + 0.5 + sgn * k * ux)), int(np.floor(y + 0.5 + sgn * k * uy)))
    on = lambda q: 0 <= q[0] < W and 0 <= q[1] < H and mask[q[1], q[0]]
    for y in range(H):
        for x in range(W):
            if mask[y, x]:
                continue
            px, py = x + 0.5 - ax, y + 0.5 - ay
            t = px * ux + py * uy
            d = abs(px * uy - py * ux)
            r = radii[0] + (radii[1] - radii[0]) * min(1.0, max(0.0, t / length))
            if not (-radii[0] <= t <= length + radii[1]) or d > r + 1:
                continue
            hits = []
            for sgn in (1, -1):
                k = next((k for k in range(1, 40) if on(at(x, y, k, sgn))), None)
                if k is not None:
                    hits.append((k, sgn))
            if not hits:
                continue
            k, sgn = min(hits)
            while k < min(hits)[0] + SKIP and on(at(x, y, k + 1, sgn)):
                k += 1
            qx, qy = at(x, y, k, sgn)
            col[y, x] = a[qy, qx]
            m[y, x] = True
    return m, col


def between_laces(a, mask, lace):
    """His shin's skin with the laces taken off: each pixel of a lace (or of its black line) with his skin on
    both sides of it in its row takes the colour of the nearest of them (the left one when both are as near),
    so the shading across his shin, lit side to shadowed side, runs on under the lace."""
    H, W, _ = a.shape
    col = a.copy()
    m = mask.copy()
    for y, x in zip(*np.nonzero(lace & ~mask)):
        left = next((k for k in range(1, 6) if x - k >= 0 and mask[y, x - k]), None)
        right = next((k for k in range(1, 6) if x + k < W and mask[y, x + k]), None)
        if left is None or right is None:
            continue
        q = x - left if left <= right else x + right
        col[y, x] = a[y, q]
        m[y, x] = True
    return m, col


def sandal_shift(masks, s):
    """The whole pixels his sandal on leg `s` is moved by onto ours (as roman_ref.module places it)."""
    px, py = R.sandal_pivot(masks, s)
    ax, ay = R.JOINTS['ankle' + s]
    return (int(np.floor(ax)) - int(np.floor(px)), int(np.floor(ay)) - int(np.floor(py)))


def lift(a):
    """Each limb's piece: {name: (mask, colours, pivot in his pixels, angle, joint the pivot lands on, his
    pixel -> our fine pixel at rest)}."""
    K = np.array([[R.kind(a[y, x]) for x in range(a.shape[1])] for y in range(a.shape[0])])
    masks, _cols = R.pieces(a)
    # Not his skin on the legs: the sandals' straps and laces, and the skirt's strips and drapes.
    other = np.zeros(K.shape, bool)
    for n in ('shin_n', 'shin_f', 'foot_n', 'foot_f'):
        other |= masks[n] & (K != 'skin')
    other |= masks['front'] | masks['drape']
    out = {}
    for name, (poly, (how, arg), ja, jb, radii) in LIMBS.items():
        sx, sy = arg if how == 'shift' else sandal_shift(masks, arg)
        mask = skin_of(a, K, R.inside(poly, *a.shape[:2]), other if how == 'sandal' else None)
        col = a.copy()
        if how == 'sandal':
            mask, col = between_laces(a, mask, masks['shin_' + arg.lower()] & (K != 'skin'))
        # his limb's own axis: our joints less the shift that moves his limb onto ours
        his = lambda j: (R.JOINTS[j][0] - sx, R.JOINTS[j][1] - sy)
        if radii:
            (x0, y0), (x1, y1) = his(ja), his(jb)
            mask, col = continued(col, mask, his(ja), his(jb), float(np.hypot(x1 - x0, y1 - y0)), radii)
        out[name] = (mask, col, his(ja), R.angle(ja, jb), ja, (sx, sy))
    return out, K


# Where his darker tone is read: his bare skin, the upper arms, hands and the legs above the sandals' straps
# (not the skin between the laces, shaded by them).
DARK_REGIONS = [LIMBS[n][0] for n in ('UPPER_ARM_N', 'UPPER_ARM_F', 'HAND_N', 'HAND_F')] + [
    [(37, 66.5), (48, 66.5), (48, 79), (37, 79)],
    [(55, 67.5), (64, 67.5), (64, 79), (55, 79)],
]


def dark_tone(a, K):
    """His darker shadow tone: the colour a tenth of the way up his limbs' bare skin, darkest first."""
    found = []
    for poly in DARK_REGIONS:
        m = skin_of(a, K, R.inside(poly, *a.shape[:2])) & (K == 'skin')
        for y, x in zip(*np.nonzero(m)):
            found.append((float(R.luma(a[y, x])), R.hexc(a[y, x])))
    found.sort()
    return found[len(found) // 10][1]


def main():
    ref, out = sys.argv[1], sys.argv[2]
    os.makedirs(os.path.join(out, 'study'), exist_ok=True)
    a = R.native(ref)
    pieces, K = lift(a)
    dark = dark_tone(a, K)

    if len(sys.argv) > 3:
        src = [
            "// The owner's skin on our male body, his pixels (tools/refs/roman-skin-from-ref.py from",
            '// docs/reference/roman-owner-reference.jpg). Generated: rerun the script to change it.',
            '',
            "import type { PaintedPiece } from './painted';",
            '',
            "/** The skin of the sprite he painted over: a character in it shows his pixels exactly; other skins move them as far. */",
            f"export const MALE_SKIN_BASE = '{MALE_SKIN_BASE}';",
            '',
            "/** His darker shadow tone (a tenth of the way up his limbs' skin), the male skin ramp's dark tone. */",
            f"export const MALE_SKIN_DARK = '{dark}';",
            '',
        ]
        body = []
        rest = []
        for name, (mask, col, pivot, ang, joint, shift) in pieces.items():
            rows, origin, palette = R.pack(col, mask)
            body.append(R.ts_piece('SKIN_' + name, DOCS[name], rows, origin, palette, pivot, ang))
            rest.append((name, joint, origin[0] + R.OFFSET[0] + shift[0], origin[1] + R.OFFSET[1] + shift[1]))
        src.append("/** The joint of our rig each piece's pivot lands on. */")
        src.append("export const MALE_SKIN_JOINT: Record<string, string> = {")
        src += [f"  SKIN_{n}: '{j}'," for n, j, _x, _y in rest]
        src += ['};', '']
        src.append("/** Where each piece lands in our male idle frame 0 before it is turned: the fine pixel of its first row's first cell. */")
        src.append('export const MALE_SKIN_REST: Record<string, [number, number]> = {')
        src += [f'  SKIN_{n}: [{x}, {y}],' for n, _j, x, y in rest]
        src += ['};', '']
        src += body
        R.write(sys.argv[3], '\n'.join(src))

    # The study: his picture, and the pieces moved onto our limbs as they land at rest.
    box = (18, 26, 76, 84)
    x0, y0, x1, y1 = box
    lifted = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    for name, (mask, col, _p, _a, _j, (sx, sy)) in pieces.items():
        for y, x in zip(*np.nonzero(mask)):
            X, Y = x + sx - x0, y + sy - y0
            if 0 <= X < x1 - x0 and 0 <= Y < y1 - y0:
                lifted[Y, X, :3] = col[y, x]
                lifted[Y, X, 3] = 255
    his = np.concatenate([a[y0:y1, x0:x1].astype(np.uint8), np.full((y1 - y0, x1 - x0, 1), 255, np.uint8)], axis=2)
    R.save(np.concatenate([his, np.zeros((y1 - y0, 2, 4), np.uint8), lifted], axis=1), os.path.join(out, 'study', 'skin@8.png'))
    print('dark', dark, {n: (int(v[0].sum()), round(v[3], 1), v[5]) for n, v in pieces.items()})


if __name__ == '__main__':
    main()
