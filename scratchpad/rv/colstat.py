import sys
import numpy as np
from PIL import Image
A = sys.argv[1]
sys.argv = [sys.argv[0], A]
exec(open(A + '/../rv/cmp.py').read().split('only = sys.argv')[0])
def his_aligned(name):
    area, s, anim, f, bg = CFG[name]
    m = man[name]; W, H = m['frameW'], m['frameH']
    x0, y0, x1, y1 = area
    hw, hh = int(round((x1 - x0) / s)), int(round((y1 - y0) / s))
    his = np.asarray(ref.resize((hw, hh), Image.BOX, box=area)).astype(float)
    P = 40
    hp = np.ones((hh + 2 * P, hw + 2 * P, 3)) * np.array(bg); hp[P:P + hh, P:P + hw] = his
    k = np.asarray(frame(name, anim, f)).astype(float); ka = k[..., 3:] / 255
    kb = k[..., :3] * ka + np.array(bg) * (1 - ka)
    best = None
    for dy in range(0, hp.shape[0] - H + 1):
        for dx in range(0, hp.shape[1] - W + 1):
            e = np.abs(hp[dy:dy + H, dx:dx + W] - kb).mean()
            if best is None or e < best[0]: best = (e, dx, dy)
    _, dx, dy = best
    return hp[dy:dy + H, dx:dx + W], k, kb
for name in ['wall', 'wall_diag', 'wall_depth', 'sphere', 'slash', 'bolt', 'aura']:
    his, k, kb = his_aligned(name)
    op = k[..., 3] == 255
    g_his = (his[..., 1] > his[..., 0] + 4) & (his[..., 1] > his[..., 2] + 8) & op
    g_our = (k[..., 1] > k[..., 0] + 4) & (k[..., 1] > k[..., 2] + 8) & op
    both = g_his & g_our
    lum = lambda c: (0.299 * c[..., 0] + 0.587 * c[..., 1] + 0.114 * c[..., 2])
    print('%-10s green px his %4d ours %4d | on his-green px: his mean %s ours mean %s | lum his %.1f ours %.1f | overall opaque lum his %.1f ours %.1f' % (
        name, g_his.sum(), g_our.sum(), np.round(his[g_his].mean(0)), np.round(kb[g_his].mean(0)), lum(his[g_his]).mean(), lum(kb[g_his]).mean(),
        lum(his[op]).mean(), lum(kb[op]).mean()))
    # brightest-greens
    hl = np.sort(lum(his[g_his]))[-40:].mean(); ol = np.sort(lum(kb[g_our]))[-40:].mean() if g_our.sum() >= 40 else -1
    print('           brightest 40 green lum: his %.1f ours %.1f' % (hl, ol))
