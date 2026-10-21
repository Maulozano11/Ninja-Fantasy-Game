import os, sys
import numpy as np
sys.path.insert(0, os.path.join(os.getcwd(), 'tools/refs'))
import scarlet_ref as R
from PIL import Image

a = np.asarray(Image.open(R.REF).convert('RGB')).astype(np.float64)
L = R.luma(a)
xs, ys = R.grid()
print(len(xs), len(ys), xs[:6], ys[:6], xs[-3:], ys[-3:])
print('widths x', np.bincount(np.diff(xs)), 'y', np.bincount(np.diff(ys)))


def flat(xs, ys, inset=1):
    s = []
    for j in range(len(ys) - 1):
        for i in range(len(xs) - 1):
            b = L[ys[j] + inset:ys[j + 1] - inset, xs[i] + inset:xs[i + 1] - inset]
            s.append(b.std())
    s = np.array(s)
    return np.median(s), np.percentile(s, 90), np.percentile(s, 99)


print('snapped interior std med/90/99', flat(xs, ys))
ex = [int(np.floor(R.PHASE[0] + k * R.PITCH[0])) for k in range(len(xs))]
ey = [int(np.floor(R.PHASE[1] + k * R.PITCH[1])) for k in range(len(ys))]
print('even interior std', flat(ex, ey))
print('max snap offset', np.max(np.abs(np.array(xs) - np.array(ex))), np.max(np.abs(np.array(ys) - np.array(ey))))
# off-by-half grid for contrast (should be much worse)
hx = [int(np.floor(R.PHASE[0] + R.PITCH[0] / 2 + k * R.PITCH[0])) for k in range(len(xs) - 1)]
hy = [int(np.floor(R.PHASE[1] + R.PITCH[1] / 2 + k * R.PITCH[1])) for k in range(len(ys) - 1)]
print('half-shifted interior std', flat(hx, hy))
# pitch scan on edge spectrum
g = np.abs(np.diff(L, axis=1)).sum(0)
for p in np.arange(5.25, 5.42, 0.01):
    ph = np.arange(len(g)) / p * 2 * np.pi
    print(round(p, 3), round(abs((g * np.exp(1j * ph)).sum()) / g.sum(), 4), end=' | ')
print()
g = np.abs(np.diff(L, axis=0)).sum(1)
for p in np.arange(5.25, 5.42, 0.01):
    ph = np.arange(len(g)) / p * 2 * np.pi
    print(round(p, 3), round(abs((g * np.exp(1j * ph)).sum()) / g.sum(), 4), end=' | ')
print()


def flat_fig(xs, ys, inset=1):
    s = []
    for j in range(len(ys) - 1):
        for i in range(len(xs) - 1):
            b = L[ys[j]:ys[j + 1], xs[i]:xs[i + 1]]
            if b.mean() > 225:
                continue
            c = L[ys[j] + inset:ys[j + 1] - inset, xs[i] + inset:xs[i + 1] - inset]
            s.append(c.std())
    s = np.array(s)
    return len(s), np.median(s), np.percentile(s, 75), np.percentile(s, 90)


print('FIG snapped', flat_fig(xs, ys))
print('FIG even', flat_fig(ex, ey))
print('FIG half', flat_fig(hx, hy))
