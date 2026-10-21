import sys
from collections import deque
import numpy as np
from PIL import Image
fr = np.load(sys.argv[1] + '-frames.npy'); N, H, W, _ = fr.shape
tiles = []
for i, f in enumerate(fr):
    a = f[..., 3]
    # body = opaque non-dust: dust colours are saturated orange; approximate body as opaque & (r-b < 0.4r)
    r, g, b = [f[..., c].astype(int) for c in range(3)]
    solid = a > 0
    out = np.zeros_like(solid)
    q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if not solid[y, x]: out[y, x] = 1; q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if not solid[y, x] and not out[y, x]: out[y, x] = 1; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < H and 0 <= nx < W and not solid[ny, nx] and not out[ny, nx]:
                out[ny, nx] = 1; q.append((ny, nx))
    holes = ~solid & ~out
    vis = np.zeros((H, W, 3), np.uint8) + 60
    vis[solid] = (150, 150, 150)
    dustish = solid & (r - b > 0.38 * r) & (r > 90)
    vis[dustish] = (200, 170, 90)
    vis[holes] = (255, 0, 255)
    print(i, 'holes', holes.sum())
    tiles.append(vis)
sheet = np.zeros((H * 2 + 4, W * 4 + 12, 3), np.uint8)
for i, t in enumerate(tiles):
    sheet[(i // 4) * (H + 4):(i // 4) * (H + 4) + H, (i % 4) * (W + 4):(i % 4) * (W + 4) + W] = t
Image.fromarray(sheet).resize((sheet.shape[1] * 2, sheet.shape[0] * 2), Image.NEAREST).save(sys.argv[1] + '-holes.png')
