# skin.py: his skin shades on the chin arm and on the book hand: k-means over the fine-pixel samples,
# printed as a map (one letter per cluster, '.' not skin).
import sys
import numpy as np
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/camp-ref/v4/tools')
from sample import fine


def kmeans(X, k, seed=1, it=80):
    rng = np.random.default_rng(seed)
    # init: spread over luminance
    lum = X @ np.array([0.299, 0.587, 0.114])
    order = np.argsort(lum)
    C = X[order[np.linspace(0, len(X) - 1, k).astype(int)]].copy()
    for _ in range(it):
        L = ((X[:, None] - C[None]) ** 2).sum(2).argmin(1)
        for c in range(k):
            if (L == c).any():
                C[c] = X[L == c].mean(0)
    C = C[np.argsort(C @ np.array([0.299, 0.587, 0.114]))]
    L = ((X[:, None] - C[None]) ** 2).sum(2).argmin(1)
    return C, L


def region(x0, y0, x1, y1, k, r=0.25):
    S = {}
    for y in range(y0, y1):
        for x in range(x0, x1):
            S[(x, y)] = fine(x, y, r)
    keys = list(S)
    X = np.array([S[q] for q in keys])
    C, L = kmeans(X, k)
    lab = dict(zip(keys, L))
    chars = 'abcdefghijklmnopqrstuvwxyz'
    print('     ' + ''.join(str(x % 10) for x in range(x0, x1)))
    for y in range(y0, y1):
        print('%4d ' % y + ''.join(chars[lab[(x, y)]] for x in range(x0, x1)))
    for c in range(k):
        n = int((L == c).sum())
        print(chars[c], '#%02x%02x%02x' % tuple(int(round(v)) for v in C[c]), n)


if __name__ == '__main__':
    x0, y0, x1, y1, k = map(int, sys.argv[1:6])
    region(x0, y0, x1, y1, k)
