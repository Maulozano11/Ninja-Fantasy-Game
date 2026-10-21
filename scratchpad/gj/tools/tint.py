import json, numpy as np
from PIL import Image
ART2 = 'art2'
REF = Image.open(ART2 + '/REF-genjutsu-set-owner.jpg').convert('RGB')
CH = np.asarray(Image.open(ART2 + '/vfx-genjutsu-v3-character.png').convert('RGBA'), np.float64)
RM = json.load(open(ART2 + '/vfx-genjutsu-v3-refmap.json'))
def his(name, W, H):
    r = RM[name]; k = r['k']; ox, oy = r['origin']
    return np.asarray(REF.resize((W, H), Image.BOX, box=(ox, oy, ox + W / k, oy + H / k)), np.float64), r['anchor']
for name in ('aura',):
    W, H = 91, 137
    h, (ax, ay) = his(name, W, H)
    best = None
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            # character feet (64,120) at anchor + (dx,dy)
            C = np.zeros((H, W, 4))
            x0, y0 = ax + dx - 64, ay + dy - 120
            for y in range(128):
                for x in range(128):
                    X, Y = x0 + x, y0 + y
                    if 0 <= X < W and 0 <= Y < H: C[Y, X] = CH[y, x]
            m = C[..., 3] > 250
            # erode the mask 1px to avoid edges
            mm = m.copy()
            for s in ((0,1),(0,-1),(1,0),(-1,0)): mm &= np.roll(m, s, (0, 1))
            c = C[mm][:, :3]; t = h[mm]
            A = np.zeros((len(c) * 3, 4)); bvec = np.zeros(len(c) * 3)
            for ch in range(3):
                A[ch::3, 0] = c[:, ch]; A[ch::3, 1 + ch] = 1; bvec[ch::3] = t[:, ch]
            sol, res, *_ = np.linalg.lstsq(A, bvec, rcond=None)
            err = np.sqrt(((A @ sol - bvec) ** 2).mean())
            if best is None or err < best[0]: best = (err, dx, dy, sol, mm.sum())
    err, dx, dy, sol, n = best
    b = sol[0]; a = 1 - b; T = sol[1:] / max(a, 1e-6)
    print(name, 'offset', dx, dy, 'rms', round(err, 1), 'n', n, 'alpha', round(a, 3), 'tint', np.round(T, 1))
    # the background just around the body inside the flames
    np.save('gj/aura-his.npy', h)
