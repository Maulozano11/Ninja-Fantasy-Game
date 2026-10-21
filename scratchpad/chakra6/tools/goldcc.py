import sys, os; sys.path.insert(0, os.path.dirname(__file__))
import ck, numpy as np
sys.setrecursionlimit(100000)
def cc(m):
    H, W = m.shape; lab = np.zeros((H, W), int); n = 0; sizes = []
    for y in range(H):
        for x in range(W):
            if m[y, x] and not lab[y, x]:
                n += 1; st = [(y, x)]; lab[y, x] = n; c = 0
                while st:
                    a, b = st.pop(); c += 1
                    for da in (-1, 0, 1):
                        for db in (-1, 0, 1):
                            p, q = a+da, b+db
                            if 0 <= p < H and 0 <= q < W and m[p, q] and not lab[p, q]:
                                lab[p, q] = n; st.append((p, q))
                sizes.append(c)
    return sizes
if __name__ == "__main__":
    fs = ck.frames('blast', 'blast')
    ax, ay = ck.M['blast']['anchor']
    H, W = fs[0].shape[:2]
    yy, xx = np.mgrid[0:H, 0:W]
    r0 = np.hypot((xx + .5 - ax) / 84, (yy + .5 - ay) / 53)
    out = []
    for i, f in enumerate(fs):
        gold = (f[..., 0] > f[..., 2] + 20) & (f[..., 3] > 60) & (r0 < 0.62)
        s = cc(gold)
        out.append((len([v for v in s if v >= 3]), sum(s)))
    print('gold components (>=3px) / gold px inside the inner ellipse per frame:', out)
    