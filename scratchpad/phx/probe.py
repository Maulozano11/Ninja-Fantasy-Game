import sys
import numpy as np
from PIL import Image
from collections import deque
ref = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(np.float32)
COLS = [(11, 256), (263, 509), (516, 761), (768, 1013)]
ROWS = {'top': (25, 178), 'r1': (210, 348), 'r2': (355, 493), 'scale': (526, 746)}

def classify(crop):
    r, g, b = crop[..., 0], crop[..., 1], crop[..., 2]
    ring = np.concatenate([crop[3:6, 20:-20].reshape(-1, 3), crop[-6:-3, 40:-20].reshape(-1, 3)])
    bg = np.median(ring, 0)
    diff = np.abs(crop - bg).sum(2)
    warm = (r - b > 45) & (diff > 45)
    darkred = (r > g + 18) & (r > b + 18) & (diff > 40)
    return warm | darkred, bg

def comps(mask):
    H, W = mask.shape
    lab = -np.ones((H, W), int)
    out = []
    for y in range(H):
        for x in range(W):
            if mask[y, x] and lab[y, x] < 0:
                q = deque([(y, x)]); lab[y, x] = len(out); pts = []
                while q:
                    cy, cx = q.popleft(); pts.append((cy, cx))
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and lab[ny, nx] < 0:
                                lab[ny, nx] = len(out); q.append((ny, nx))
                out.append(pts)
    return out, lab

for row in ('top', 'r1', 'r2'):
    y0, y1 = ROWS[row]
    for ci, (x0, x1) in enumerate(COLS):
        crop = ref[y0:y1, x0:x1]
        m, bg = classify(crop)
        m[-22:, :24] = False
        if row == 'top': m[:16, :160] = False
        cs, lab = comps(m)
        cs.sort(key=len, reverse=True)
        big = cs[0]
        ys = [p[0] for p in big]; xs = [p[1] for p in big]
        print(row, ci, 'bg', bg.astype(int), 'main', len(big), 'bbox x', min(xs), max(xs), 'y', min(ys), max(ys), 'h', max(ys) - min(ys) + 1, 'w', max(xs) - min(xs) + 1, 'others', [len(c) for c in cs[1:8]])
