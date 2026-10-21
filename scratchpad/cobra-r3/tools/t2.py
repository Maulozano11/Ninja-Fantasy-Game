import sys; sys.path.insert(0, sys.argv[1])
import numpy as np, io, contextlib
from pre import load
with contextlib.redirect_stdout(io.StringIO()):
    g = load()
C = g['C']; J = g['TAIL_J']; PIECE = g['PIECE']; seg_geom = g['seg_geom']; heading = g['heading']; wrap = g['wrap']
for k in 'LR':
    P = C[k]['Pm']; th, ln = seg_geom(P)
    j = PIECE[k]['j']
    print(k, 'lowpt', P[J].round(1), 'joint', P[j].round(1), 'arc', ln[j:J].sum().round(1), 'dist', np.hypot(*(P[J]-P[j])).round(1), 'heading', np.degrees(heading(P, j)).round(1))
a, w = 'L', 0.2
P = C['L']['Pm'] * (1 - w) + C['R']['Pm'] * w
tha, la = seg_geom(C['L']['Pm']); thb, lb = seg_geom(C['R']['Pm']); thp, _ = seg_geom(P)
th = thp[J] + (tha[:J] - tha[J]) * (1 - w) + (thb[:J] - thb[J]) * w
ln = la[:J] * (1 - w) + lb[:J] * w
src, theta, phi, jt = g['tip_plan'](a, w)
j = PIECE[src]['j']
print('blend lowpt', P[J].round(1), 'target joint', jt.round(1), 'arc', ln[j:J].sum().round(1), 'dist', np.hypot(*(P[J]-jt)).round(1), 'phi', np.degrees(phi).round(1))
Q = P.copy()
for i in range(J - 1, -1, -1):
    Q[i] = Q[i + 1] - ln[i] * np.array([np.cos(th[i]), np.sin(th[i])])
print('plain blend joint', Q[j].round(1), 'heading', np.degrees(heading(Q, j)).round(1))
print('turning L from low to joint', np.degrees(tha[J] - tha[j]).round(1), 'R', np.degrees(thb[J] - thb[j]).round(1))
x = np.clip((J - np.arange(J)) / float(J - j), 0.0, 1.0)
basis = np.stack([x, x ** 2, x ** 3], 0)
def build(c3):
    Q = P.copy()
    th_ = th + c3 @ basis
    for i in range(J - 1, -1, -1):
        Q[i] = Q[i + 1] - ln[i] * np.array([np.cos(th_[i]), np.sin(th_[i])])
    return Q
def resid(c3):
    Q = build(c3)
    return np.array([Q[j][0] - jt[0], Q[j][1] - jt[1], wrap(heading(Q, j) - phi) * 10.0])
c3 = np.zeros(3)
for it in range(10):
    r = resid(c3)
    Jm = np.stack([(resid(c3 + e) - r) / 1e-4 for e in np.eye(3) * 1e-4], 1)
    step = np.linalg.lstsq(Jm, -r, rcond=None)[0]
    print(it, r.round(3), step.round(3), np.linalg.cond(Jm).round(1))
    c3 = c3 + np.clip(step, -0.5, 0.5)
