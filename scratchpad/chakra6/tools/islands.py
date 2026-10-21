import numpy as np
def label(m):
    H, W = m.shape; lab = np.zeros((H, W), int); n = 0; sizes = []
    for y in range(H):
        for x in range(W):
            if m[y, x] and not lab[y, x]:
                n += 1; st = [(y, x)]; lab[y, x] = n; c = 0
                while st:
                    a, b = st.pop(); c += 1
                    for da, db in ((1,0),(-1,0),(0,1),(0,-1)):
                        p, q = a+da, b+db
                        if 0 <= p < H and 0 <= q < W and m[p, q] and not lab[p, q]:
                            lab[p, q] = n; st.append((p, q))
                sizes.append(c)
    return lab, sizes
def islands(f, maxpx=3, amin=200):
    _, s = label(f[..., 3] >= amin)
    return sum(1 for v in s if v <= maxpx)
def holes(f, amin=1):
    m = f[..., 3] >= amin
    lab, s = label(~m)
    H, W = m.shape
    border = set(lab[0, :]) | set(lab[-1, :]) | set(lab[:, 0]) | set(lab[:, -1])
    return sum(s[i-1] for i in range(1, len(s)+1) if i not in border)
