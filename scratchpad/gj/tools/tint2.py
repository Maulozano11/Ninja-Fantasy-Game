import numpy as np
from PIL import Image
R = np.asarray(Image.open('art2/REF-genjutsu-set-owner.jpg').convert('RGB'), np.float64)
BG = np.array([32, 32, 42.])
# his plain character beside the blast: head-to-feet box (no cape: x >= 785)
P = R[285:412, 785:840]
mask = np.sqrt(((P - BG) ** 2).sum(-1)) > 30
# erode
m = mask.copy()
for s in ((0, 1), (0, -1), (1, 0), (-1, 0)): m &= np.roll(mask, s, (0, 1))
best = None
for oy in range(495, 535):
    for ox in range(470, 515):
        A_ = R[oy:oy + P.shape[0], ox:ox + P.shape[1]]
        c = P[m]; t = A_[m]
        A = np.zeros((len(c) * 3, 4)); b = np.zeros(len(c) * 3)
        for ch in range(3):
            A[ch::3, 0] = c[:, ch]; A[ch::3, 1 + ch] = 1; b[ch::3] = t[:, ch]
        sol = np.linalg.lstsq(A, b, rcond=None)[0]
        err = np.sqrt(((A @ sol - b) ** 2).mean())
        if best is None or err < best[0]: best = (err, ox, oy, sol)
err, ox, oy, sol = best
a = 1 - sol[0]; T = sol[1:] / a
print('aligned at', ox, oy, '(plain at 785,285) rms', round(err, 1), 'alpha', round(a, 3), 'tint', np.round(T, 1), 'v', np.round(sol[1:], 1))
# per-channel separate fits
A_ = R[oy:oy + P.shape[0], ox:ox + P.shape[1]]
for ch in range(3):
    c = P[m][:, ch]; t = A_[m][:, ch]
    k, v = np.polyfit(c, t, 1)
    print('ch', ch, 'gain', round(k, 3), 'offset', round(v, 1))
# the haze round the body: aura panel pixels where the plain panel is his fill, inside the flame frame
bgm = (~mask) & (np.sqrt(((P - BG) ** 2).sum(-1)) < 8)
print('haze around body (median):', np.median(A_[bgm], 0), 'n', bgm.sum())
np.save('gj/tint-align.npy', np.array([ox, oy]))
