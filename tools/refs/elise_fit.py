"""Elise on the female body v2: where each part of her lands at the owner's game scale.

The female body v2 (src/sprite/rig.ts 'female', tools/refs/female-body-from-ref.py) was rebuilt from
the owner's heroines drawn at our game scale (docs/reference/{lyra,aurelia,saya}-game-scale-owner-
reference.jpg). Elise has no game-scale picture. But her big picture and Lyra's are one body in one
pose, pixel for pixel (heroine_ref.TEMPLATE), and the owner brought Lyra's down to our scale himself:
so the map from that template to his game scale, measured on Lyra, is the map for Elise too.

Measured (measure(), `python3 -I tools/refs/elise_fit.py`): each row of his Lyra at our scale is
matched to the row of her big picture it was brought down from (her big picture sampled across at
GAME_SX, each of his rows against every row of hers, the rows kept in order). Across she is brought
down at 0.41 everywhere (the old study's 0.40 to 0.44); down, her head and torso at about 0.39, her
skirt at 0.35 and her legs at 0.31 (the old study squeezed her torso to 0.31 and gave her a head half
again as big): GAME_ROWS. Laid on his Lyra at (x + 74, y + 121), as the body was, the figure lands on
the new body: eyes, chin, waist, knees, ankles and soles. A reduction of Lyra's big picture by this
map (heroine-study.py's sampler) has his Lyra's outline to a pixel or two on every row.

The study's reduced reference (heroine_ref.reduced('elise')) is her picture at our scale on the old
female body, hand-cleaned at our scale (heroine_paint.PAINT), and her part scripts cut their pieces
out of it. Across it is already at his scale (0.40 to 0.44); down, his map puts each part of hers on
the new body here (game_y), and each part script re-lays its pieces there:
  - her belts, pouch, skirt and the coat's front edges fall on the same rows as before (her belts on
    our rows 168-173, her hem on 184): they stay, pinned to the new pelvis;
  - the coat body runs from under the new chin to under the belts: three rows longer, a plain row of
    hers shown twice where his scale has more of hers than the study had (double_rows: her collar
    under the choker and two rows of her breastplate);
  - the coat's tails reach two rows lower (her rows 148-219 are our 184-206): two rows of the folds
    shown twice;
  - the sleeves ride the shoulders and elbows (the arms are as long as before): moved with them
    (joint_step); her gloves are the new body's own small hands (his) in her glove;
  - the boots: the cuff's top on row 186 (her row 157), the greaves spread down to the ankle guard,
    the guard on the new ankle, the sabatons as short as the body's new feet, the cops on the knees
    (elise-boots-from-ref.py);
  - her head, hair, eyes and sword ride the face and the hand as before (the new body's head is the
    old one; the sword at his scale is as long as the study's).

  NEW_JOINTS        our female at idle frame 0 on the body v2 (tools/refs/heroine-idle.mts)
  OLD_JOINTS        the same on the old body (heroine_ref.OUR_JOINTS, the study's)
  GAME_ROWS         her row -> our row at his game scale (knots; straight between them)
  game_y(y)         her row(s) -> our row(s)
  double_rows(a, y0, y1, twice, top, fill)  the rows laid from `top`, the rows `twice` shown twice
  move(a, dx, dy, fill)              `a` moved whole
  joint_step(name)  how far (whole fine pixels) a piece pinned to that joint moves with it
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np  # noqa: E402

import heroine_ref as R  # noqa: E402

OLD_JOINTS = R.OUR_JOINTS
# Our female rig at idle frame 0 on the body v2, fine pixels (npx tsx tools/refs/heroine-idle.mts).
NEW_JOINTS = {
    'head': (126.00, 138.00),
    'neck': (126.94, 146.23),
    'shoulderN': (117.54, 150.96),
    'shoulderF': (131.50, 150.48),
    'elbowN': (113.84, 162.38),
    'elbowF': (133.72, 162.27),
    'wristN': (111.48, 172.51),
    'wristF': (139.28, 171.06),
    'handN': (110.91, 174.96),
    'handF': (140.63, 173.19),
    'pelvis': (127.00, 182.25),
    'hipN': (120.58, 181.88),
    'hipF': (132.35, 178.47),
    'kneeN': (121.27, 196.06),
    'kneeF': (141.04, 189.70),
    'ankleN': (117.56, 211.62),
    'ankleF': (136.58, 205.06),
}
# Her row (her big picture, heroine_ref.native) -> our row at the owner's game scale, measured on his
# Lyra (measure()): the hair's top, her chin, her belt, her skirt's hem, her ankle, her sole.
GAME_ROWS = [(4.0, 129.0), (51.0, 147.0), (112.0, 171.0), (146.0, 183.0), (234.0, 210.0), (256.0, 219.0)]
GAME_SX = 0.41
# His Lyra at our scale on our frame (the body's fit): his pixel (0, 0) is our (74, 121).
GAME_AT = (74, 121)


def game_y(y):
    """Her row(s) -> our row(s) at his game scale."""
    return R._lin(y, [a for a, _ in GAME_ROWS], [b for _, b in GAME_ROWS])


def double_rows(a, y0, y1, twice, top, fill):
    """The rows y0..y1 of `a` laid from row `top` down, the rows in `twice` shown twice (where his
    scale has more rows of hers than the study: a plain row of hers there, shown again)."""
    out = np.full_like(a, fill)
    y = top
    for k in range(y0, y1 + 1):
        for _ in range(2 if k in twice else 1):
            out[y] = a[k]
            y += 1
    return out


def move(a, dx, dy, fill):
    """`a` moved whole by (dx, dy) whole pixels."""
    out = np.full_like(a, fill)
    H, W = a.shape[:2]
    ys, yd = (slice(0, H - dy), slice(dy, H)) if dy >= 0 else (slice(-dy, H), slice(0, H + dy))
    xs, xd = (slice(0, W - dx), slice(dx, W)) if dx >= 0 else (slice(-dx, W), slice(0, W + dx))
    out[yd, xd] = a[ys, xs]
    return out


def joint_step(name):
    """How far a piece pinned to joint `name` moves with it from the old body to the new one, in whole
    fine pixels (the cell the joint is in): pinned there, it sits on the new joint as on the old."""
    (ox, oy), (nx, ny) = OLD_JOINTS[name], NEW_JOINTS[name]
    return int(np.floor(nx) - np.floor(ox)), int(np.floor(ny) - np.floor(oy))


def measure(sx=GAME_SX):
    """Measures GAME_ROWS on Lyra: each of the owner's rows at our scale against every row of her big
    picture (sampled across at sx, shifted by tx), the rows kept in order (dynamic programming over
    each step of 1 to 5 of her rows). Prints the best shift and his row -> her row."""
    from PIL import Image
    B = R.native('lyra').astype(float)
    fig = R.figure('lyra')
    a = np.asarray(Image.open('docs/reference/lyra-game-scale-owner-reference.jpg').convert('RGB')).astype(int)
    p = a.shape[0] / 100
    G = np.zeros((100, 100, 3))
    for j in range(100):
        for i in range(100):
            G[j, i] = np.median(a[int(j * p + p * .25):int(j * p + p * .75) + 1, int(i * p + p * .25):int(i * p + p * .75) + 1].reshape(-1, 3), 0)
    rows = range(4, 99)
    YS = np.arange(-6, 262, 0.5)
    best = None
    for tx in np.arange(10, 18, 0.5):
        bx = ((np.arange(100) + 0.5 - tx) / sx).astype(int)
        okx = (bx >= 0) & (bx < B.shape[1])
        bxc = np.clip(bx, 0, B.shape[1] - 1)
        cost = np.zeros((len(rows), len(YS)))
        for i, j in enumerate(rows):
            g = G[j]
            for k, y in enumerate(YS):
                by = int(np.floor(y))
                inb = 0 <= by < B.shape[0]
                samp = np.where(okx[:, None], B[by, bxc], 255) if inb else np.full((100, 3), 255.)
                fb = okx & fig[by, bxc] if inb else np.zeros(100, bool)
                fg = (g.sum(1) < 720) | fb
                cost[i, k] = np.abs(samp - g).sum(1)[fg].sum() / 100
        n, m = cost.shape
        D = np.full((n, m), np.inf)
        P = np.zeros((n, m), int)
        D[0] = cost[0]
        for i in range(1, n):
            for k in range(m):
                lo, hi = max(0, k - 10), k - 2
                if hi < lo:
                    continue
                q = lo + int(np.argmin(D[i - 1, lo:hi + 1]))
                D[i, k] = D[i - 1, q] + cost[i, k]
                P[i, k] = q
        k = int(np.argmin(D[-1]))
        if best is None or D[-1, k] < best[0]:
            path = [k]
            for i in range(n - 1, 0, -1):
                k = P[i, k]
                path.append(k)
            best = (D[-1, path[0]], tx, [YS[q] for q in path[::-1]])
    _, tx, ys = best
    print(f'tx {tx} (her x 0 -> our x {GAME_AT[0] + tx})')
    for j, y in zip(rows, ys):
        print(f'his row {j} (our {j + GAME_AT[1]}) <- her row {y}')


if __name__ == '__main__':
    measure()
