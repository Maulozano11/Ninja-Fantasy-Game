"""The owner's bare broad man (docs/reference/bulky-base-owner-reference.jpg), piece by piece: the bulky body.

He sent it on 2026-10-21 as the base of the bulky body: "cuerpo fornido base sin camisa", the broad man of
bulky-owner-reference.jpg without his clothes, in dark boxer briefs. The picture is on the same grid as
the clothed one (100 x 100 of his pixels, 20 picture pixels each, phase 0) and his figure stands where it
stands there (his head is the same, pixel for pixel), so his joints are the bulky rig's (bulky_ref.JOINTS)
and one of his pixels is one fine pixel of ours, at the same offset.

Every piece is his pixels round one bone of our rig, cut where one part of his body meets the next, and
rides that bone (src/sprite/bulkyBody.ts drawBulkyBase) the way his clothes do: at his angle every pixel
is his, turned with RotSprite as the limb turns:

  chest      neck, shoulders, pecs and upper abs to his row SPLIT; it rides the torso about the neck.
  pelvis     lower abs, his boxer briefs' waistband and seat; it rides the torso about the pelvis, over
             the far leg and under the near leg (a raised near knee comes in front of it).
  arms       each upper arm (its shoulder's round too) about the shoulder, forearm about the elbow, fist
             about the wrist turning with the forearm.
  legs       each thigh (with its leg of the briefs, from his row BRIEFS_LEG) about the hip, shin about
             the knee, bare foot on the ankle, flat on the ground.

A pixel goes to the limb it lies nearest (each limb a capsule round its bone, bigger for bigger limbs),
his briefs above BRIEFS_LEG to the pelvis, and within a limb to the bone on its side of the cut through the joint. What he
does not show is continued from his pixels (each hidden pixel takes the colour of his pixel met first
walking from it the way given, never a new colour): the neck up under the head, the chest under his long
lock and under the near arm, the belly up under the chest (for breathing), the far thigh up under the briefs,
the far upper arm in under the chest. Each lower piece carries a round cap of the upper piece's pixels over
the joint, so a bent elbow, knee or ankle stays whole. The script checks that at idle the pieces put
together are his picture, every pixel of his body below the head. Every piece marks its open edge
(bulky_ref.seal_rows, against this picture's background) for the renderer to close in other poses.

His briefs are the colour kind 'cloth' (the boxer-briefs item recolours them); his black line never
changes; every other colour is his skin, which follows the character's skin. It writes
src/sprite/bulkyBaseArt.ts and, with a second argument, a folder with his picture beside the pieces and a
map of the pieces at 8x. The same picture always gives the same bytes:

  python3 -I tools/refs/bulky-base-body-from-ref.py src/sprite/bulkyBaseArt.ts [studyDir]
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import bulky_ref as R  # noqa: E402

BARE = 'docs/reference/bulky-base-owner-reference.jpg'
DOC = (
    "// The owner's bare broad man, the bulky body, his pixels (tools/refs/bulky-base-body-from-ref.py from\n"
    '// docs/reference/bulky-base-owner-reference.jpg). Generated: rerun the script to change it.\n'
)
J = R.JOINTS
# The chest above this row, the pelvis from it; below this row nothing but his briefs is the torso's.
SPLIT = 51
BRIEFS_TO = 64
# His briefs from this row down are the legs of the briefs: each goes with its thigh (so a raised knee
# lifts its leg of the briefs, as his jeans do), the waistband and seat above it with the pelvis.
BRIEFS_LEG = 63
# His hidden parts: the chest under the near arm, the belly under the chest, the far thigh under the briefs
# (a disc round its hip, not across the groin to the other thigh). The near thigh needs none: it is drawn
# over the pelvis (a raised knee comes in front of his belly and briefs), so nothing of it is hidden.
UNDER_NEAR_ARM = (36, 30, 44, 50)
BELLY_UP = (40, 46, 62, 51)
THIGH_UP = {'F': 5.0}
GROIN = [(48.5, 60), (51.5, 60), (51.5, 72), (48.5, 72)]
# Each limb as a capsule round its bones (joint names; '>x,y' a point of his) and its radius (his pixels).
LIMBS = {
    'torso': ([(50.0, 30.0), (50.0, 57.0)], 11.0),
    'armN': (['shoulderN', 'elbowN', 'wristN', 'handN'], 6.0),
    'armF': (['shoulderF', 'elbowF', 'wristF', 'handF'], 5.0),
    'legN': (['hipN', 'kneeN', 'ankleN', (37.5, 96.0)], 6.0),
    'legF': (['hipF', 'kneeF', 'ankleF', (66.0, 93.0)], 5.5),
}
# The bones of each limb: (piece, from joint, to joint); a pixel past a joint's cut is the next bone's.
BONES = {
    'armN': [('upperArmN', 'shoulderN', 'elbowN'), ('forearmN', 'elbowN', 'wristN'), ('handN', 'wristN', 'handN')],
    'armF': [('upperArmF', 'shoulderF', 'elbowF'), ('forearmF', 'elbowF', 'wristF'), ('handF', 'wristF', 'handF')],
    'legN': [('thighN', 'hipN', 'kneeN'), ('shinN', 'kneeN', 'ankleN'), ('footN', 'ankleN', None)],
    'legF': [('thighF', 'hipF', 'kneeF'), ('shinF', 'kneeF', 'ankleF'), ('footF', 'ankleF', None)],
}
# Where the feet's cut runs: the ankle's row (the foot is everything of the leg below it).
FOOT_FROM = {'N': 91, 'F': 89}
# The pieces' joints, the bone each turns with ('up': the torso's), and the order they are drawn in at rest
# (back to front, as bulkyBody.ts drawBulkyBase draws them).
PIVOT = {
    'chest': ('neck', 'up'), 'pelvis': ('pelvis', 'up'),
    'upperArmN': ('shoulderN', 'elbowN'), 'forearmN': ('elbowN', 'wristN'), 'handN': ('wristN', 'forearmN'),
    'upperArmF': ('shoulderF', 'elbowF'), 'forearmF': ('elbowF', 'wristF'), 'handF': ('wristF', 'forearmF'),
    'thighN': ('hipN', 'kneeN'), 'shinN': ('kneeN', 'ankleN'), 'footN': ('ankleN', None),
    'thighF': ('hipF', 'kneeF'), 'shinF': ('kneeF', 'ankleF'), 'footF': ('ankleF', None),
}
ORDER = ['upperArmF', 'forearmF', 'handF', 'thighF', 'shinF', 'footF', 'pelvis', 'thighN', 'shinN', 'footN', 'chest', 'upperArmN', 'forearmN', 'handN']
# Joint caps: the lower piece carries the upper piece's pixels this far round the joint.
CAPS = {
    'forearmN': ('upperArmN', 'elbowN', 4.0), 'forearmF': ('upperArmF', 'elbowF', 3.5),
    'handN': ('forearmN', 'wristN', 3.0), 'handF': ('forearmF', 'wristF', 2.8),
    'shinN': ('thighN', 'kneeN', 4.5), 'shinF': ('thighF', 'kneeF', 4.0),
    'footN': ('shinN', 'ankleN', 3.5), 'footF': ('shinF', 'ankleF', 3.5),
}


def pt(p):
    return J[p] if isinstance(p, str) else p


def seg_dist(xs, ys, a, b):
    (ax, ay), (bx, by) = a, b
    dx, dy = bx - ax, by - ay
    t = np.clip(((xs - ax) * dx + (ys - ay) * dy) / (dx * dx + dy * dy), 0, 1)
    return np.hypot(xs - ax - dx * t, ys - ay - dy * t)


def disc(c, r, shape):
    ys, xs = np.mgrid[0:shape[0], 0:shape[1]]
    return (xs + 0.5 - c[0]) ** 2 + (ys + 0.5 - c[1]) ** 2 <= r * r


def side_of(xs, ys, joint, a, b):
    """Past the cut through `joint` (perpendicular to the bisector of the bones a-joint and joint-b): True on
    b's side."""
    j = np.array(pt(joint))
    u = j - np.array(pt(a))
    u = u / np.linalg.norm(u)
    if b is None:
        n = u
    else:
        w = np.array(pt(b)) - j
        w = w / np.linalg.norm(w)
        n = u + w
        n = n / np.linalg.norm(n)
    return (xs - j[0]) * n[0] + (ys - j[1]) * n[1] >= 0


# What his picture hides, continued from his pixels: (piece, region (x0, y0, x1, y1 in his pixel corners,
# or a joint and a radius), which of his pixels it takes the place of, the way walked to his pixel).
NECK_UP = (45, 21, 56, 30)


def cut():
    """His picture cut into the pieces: (picture, kinds, page, body, lock, {piece: mask})."""
    a = R.native(BARE)
    H, W, _ = a.shape
    K = np.array([[R.kind(a[y, x]) for x in range(W)] for y in range(H)])
    outside = R.background(a) | (K == 'gap')
    regs = {n: R.inside(p, H, W) for n, p, _ in R.REGIONS}
    head = regs['hair'] | regs['face']
    lock = regs['lock'] & np.isin(K, ('hair', 'brown')) & ~outside
    body = ~outside & ~head & ~lock
    ys, xs = np.mgrid[0:H, 0:W]
    xs = xs + 0.5
    ys = ys + 0.5
    # Each pixel of his body to the limb it lies nearest (in radii).
    score = {}
    for limb, (pts, r) in LIMBS.items():
        P = [pt(p) for p in pts]
        d = np.min([seg_dist(xs, ys, P[i], P[i + 1]) for i in range(len(P) - 1)], axis=0)
        score[limb] = d / r
    names = list(LIMBS)
    stack = np.stack([score[n] for n in names])
    best = np.argmin(stack, axis=0)
    limb_of = {n: body & (best == i) for i, n in enumerate(names)}
    # His briefs are the pelvis's; below them nothing is the torso's (the line between the thighs goes to
    # the nearer leg).
    briefs = body & (K == 'cool') & (ys > 54)
    for n in names:
        limb_of[n] &= ~briefs
    low = (limb_of['torso'] & (ys > BRIEFS_TO)) | (briefs & (ys > BRIEFS_LEG))
    limb_of['torso'] = (limb_of['torso'] | briefs) & ~low
    legs = np.argmin(np.stack([score['legN'], score['legF']]), axis=0)
    limb_of['legN'] |= low & (legs == 0)
    limb_of['legF'] |= low & (legs == 1)
    pieces = {}
    pieces['chest'] = limb_of['torso'] & (ys < SPLIT)
    pieces['pelvis'] = limb_of['torso'] & (ys >= SPLIT)
    for limb, bones in BONES.items():
        m = limb_of[limb].copy()
        for k, (name, j0, j1) in enumerate(bones):
            if name.startswith('foot'):
                pieces[name] = m & (ys >= FOOT_FROM[name[-1]])
                continue
            nxt = bones[k + 1] if k + 1 < len(bones) else None
            if nxt is None:
                pieces[name] = m
                continue
            if nxt[0].startswith('foot'):
                here = m & (ys < FOOT_FROM[name[-1]])
            else:
                here = m & ~side_of(xs, ys, j1, j0, nxt[2])
            pieces[name] = here
            m = m & ~here
    # Every pixel of his body is in one piece.
    every = np.zeros((H, W), bool)
    for n, m in pieces.items():
        assert not (every & m).any(), f'{n} overlaps'
        every |= m
    assert (every == body).all(), 'pixels of his in no piece'
    return a, K, outside, body, lock, head, pieces


def box(b, shape):
    x0, y0, x1, y1 = b
    return R.inside([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], *shape)


def build():
    """Each piece's colours and mask, his hidden parts continued and his joint caps added."""
    a, K, outside, body, lock, head, cuts = cut()
    H, W, _ = a.shape
    black = R.his_line(a, K)
    shape = (H, W)
    ys, xs = np.mgrid[0:H, 0:W]
    out = {}
    hidden = {}
    # the neck up under the head, his neck met first below
    hidden['chest'] = [(box(NECK_UP, shape) & head, np.array([0.0, 1.0]))]
    # the chest under his long lock, his chest met first beside it
    hidden['chest'].append((lock, np.array([1.0, 0.0])))
    hidden['chest'].append((lock, np.array([-1.0, 0.0])))
    # the chest's near side under the near arm, his chest met first toward the middle
    hidden['chest'].append((cuts['upperArmN'] & box(UNDER_NEAR_ARM, shape), np.array([1.0, 0.0])))
    # the belly up under the chest (it rises as he breathes), his belly met first below
    hidden['pelvis'] = [(cuts['chest'] & box(BELLY_UP, shape), np.array([0.0, 1.0]))]
    # the far thigh up under the briefs, round the hip, his thigh met first down the thigh
    for s in THIGH_UP:
        axis = R.unit('hip' + s, 'knee' + s)
        hidden['thigh' + s] = [(cuts['pelvis'] & disc(J['hip' + s], THIGH_UP[s], shape) & ~R.inside(GROIN, H, W), axis)]
    # the far upper arm in under the chest, his far arm met first outward
    near_f = np.zeros(shape, bool)
    yy, xx = np.nonzero(cuts['upperArmF'])
    for y, x in zip(yy, xx):
        near_f[max(0, y - 2):y + 3, max(0, x - 3):x + 1] = True
    hidden['upperArmF'] = [(cuts['chest'] & near_f, np.array([1.0, 0.0]))]
    for name, m in cuts.items():
        col = a.copy()
        have = m.copy()
        got = np.zeros(shape, bool)
        for want, axis in hidden.get(name, []):
            inner = have & (K != 'line')
            col, more = R.continue_along(col, inner, want & ~have & ~got, axis)
            got |= more & ~have
        mask = have | got
        col = R.cap(col, mask, have, black)
        out[name] = [col, mask, have]
    # joint caps: the upper piece's own pixels round the joint, carried by the lower piece
    for low, (up, j, r) in CAPS.items():
        col, mask, have = out[low]
        ucol, umask, uhave = out[up]
        add = uhave & disc(J[j], r, shape) & ~mask
        col = col.copy()
        col[add] = ucol[add]
        out[low] = [col, mask | add, have]
    return a, K, outside, body, lock, head, out


CONST = {p: 'BASE_' + ''.join('_' + c if c.isupper() else c.upper() for c in p) for p in ORDER}
DOCS = {
    'chest': 'His neck, shoulders, pecs and upper abs (going on under his head, his long lock and the near arm). It rides the torso about the neck.',
    'pelvis': 'His lower abs and his boxer briefs (going on up under the chest). It rides the torso about the pelvis.',
    'upperArmN': 'The near upper arm with its shoulder round. It turns with the upper arm about the shoulder.',
    'forearmN': 'The near forearm, with a cap of the upper arm round the elbow. It turns about the elbow.',
    'handN': 'The near fist, with a cap of the forearm round the wrist. It turns with the forearm about the wrist.',
    'upperArmF': 'The far upper arm with its shoulder round (going on in under the chest). It turns about the shoulder.',
    'forearmF': 'The far forearm, with a cap of the upper arm round the elbow. It turns about the elbow.',
    'handF': 'The far fist, with a cap of the forearm round the wrist. It turns with the forearm about the wrist.',
    'thighN': 'The near thigh with its leg of the briefs, drawn over the pelvis. It turns about the hip.',
    'shinN': 'The near shin, with a cap of the thigh round the knee. It turns about the knee.',
    'footN': 'The near bare foot, with a cap of the shin round the ankle. It stands on the ankle, flat on the ground.',
    'thighF': 'The far thigh with its leg of the briefs (going on up under the briefs). It turns about the hip.',
    'shinF': 'The far shin, with a cap of the thigh round the knee. It turns about the knee.',
    'footF': 'The far bare foot, with a cap of the shin round the ankle. It stands on the ankle, flat on the ground.',
}


def angle_of(p):
    j, k = PIVOT[p]
    if k == 'up':
        return R.joint_angle('pelvis', 'neck')
    if k is None:
        return 0.0
    if k.startswith('forearm'):
        s = k[-1]
        return R.joint_angle('elbow' + s, 'wrist' + s)
    return R.joint_angle(j, k)


def kind_of(h):
    c = [int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)]
    k = R.kind(c)
    if k == 'line':
        return 'line'
    if k == 'cool':
        return 'cloth'
    return 'skin'


def main():
    out_ts = sys.argv[1] if len(sys.argv) > 1 else None
    study = sys.argv[2] if len(sys.argv) > 2 else None
    a, K, outside, body, lock, head, built = build()
    H, W, _ = a.shape
    # At idle the pieces put together, back to front, are his picture: every pixel of his body below
    # the head (his lock is the hair's) is the colour he gave it, and nothing else of the body shows.
    comp = np.full((H, W, 3), -1)
    for p in ORDER:
        col, mask, _ = built[p]
        comp[mask] = col[mask]
    shown = ~head & ~lock
    bad = [(x, y) for y in range(H) for x in range(W)
           if shown[y, x] and (body[y, x] != (comp[y, x, 0] >= 0) or (body[y, x] and (comp[y, x] != a[y, x]).any()))]
    made = [R.piece(CONST[p], DOCS[p], built[p][0], built[p][1], J[PIVOT[p][0]], angle_of(p), seal=True, outside=outside) for p in ORDER]
    kinds = {}
    count = {}
    for p in ORDER:
        col, mask, have = built[p]
        for y, x in zip(*np.nonzero(mask)):
            h = R.hexc(col[y, x])
            kinds[h] = kind_of(h)
            if have[y, x]:
                count[h] = count.get(h, 0) + 1
    pick = lambda k: max((h for h in kinds if kinds[h] == k), key=lambda h: (count.get(h, 0), h))
    header = [
        "/** His commonest skin and briefs colours: the character's skin and the briefs' colour slot stand for them. */",
        f"export const BULKY_BASE_SKIN = '{pick('skin')}';",
        f"export const BULKY_BASE_BRIEFS = '{pick('cloth')}';",
        '',
    ]
    text = R.module(DOC, "import type { PaintedPiece } from './painted';", header, made, kinds=('BULKY_BASE_KIND', kinds), rest_name='BULKY_BASE_REST')
    text += '\n/** Every piece of his body by the part of our rig it rides. */\n'
    text += 'export const BULKY_BASE = {\n' + ''.join(f'  {p}: {CONST[p]},\n' for p in ORDER) + '};\n'
    if study:
        os.makedirs(study, exist_ok=True)
        tint = {'chest': (255, 80, 80), 'pelvis': (80, 160, 255), 'upperArmN': (80, 220, 80), 'forearmN': (220, 220, 60),
                'handN': (255, 140, 0), 'upperArmF': (160, 80, 255), 'forearmF': (0, 200, 200), 'handF': (255, 80, 200),
                'thighN': (120, 255, 160), 'shinN': (60, 120, 255), 'footN': (255, 200, 120), 'thighF': (200, 120, 60),
                'shinF': (120, 60, 200), 'footF': (60, 200, 120)}
        # his picture, the pieces put together at idle, and the pieces' map (hidden and cap pixels pale)
        img = np.zeros((H, W * 3 + 4, 3), np.uint8) + 255
        img[:, :W] = a
        sel = comp[..., 0] >= 0
        img[:, W + 2:2 * W + 2][sel] = comp[sel]
        m3 = img[:, 2 * W + 4:]
        for p in ORDER:
            col, mask, have = built[p]
            c = np.array(tint[p])
            m3[have] = (a[have] * 0.4 + c * 0.6).astype(np.uint8)
            m3[mask & ~have] = (c * 0.35 + 255 * 0.65).astype(np.uint8)
        for x, y in bad:
            img[y, W + 2 + x] = [255, 0, 255]
        R.save(img, os.path.join(study, 'base-idle-and-pieces.png'), 8)
    assert not bad, f'the pieces at idle differ from his picture at {bad[:12]}'
    if out_ts:
        R.write(out_ts, text)
    print('pieces', {p: int(built[p][1].sum()) for p in ORDER}, 'skin', pick('skin'), 'briefs', pick('cloth'))


if __name__ == '__main__':
    main()
