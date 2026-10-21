import sys, numpy as np
from PIL import Image
p, out = sys.argv[1], sys.argv[2]
W, H = 1016, 968
sheet = np.asarray(Image.open(p).convert('RGBA'))
rows = {'surge': (0, 8), 'burn': (1, 6), 'fade': (2, 6)}
X0, X1, Y0, Y1 = 150, 960, 440, 900
tiles = []
for name, (r, n) in rows.items():
    for i in range(n):
        f = sheet[r*H:(r+1)*H, i*W:(i+1)*W]
        a = f[..., 3]
        tr = a < 8
        # outside = transparent reachable from frame border (4-conn), by iterative dilation
        out_m = np.zeros_like(tr)
        out_m[0, :] = tr[0, :]; out_m[-1, :] = tr[-1, :]; out_m[:, 0] = tr[:, 0]; out_m[:, -1] = tr[:, -1]
        while True:
            g = out_m.copy()
            g[1:, :] |= out_m[:-1, :]; g[:-1, :] |= out_m[1:, :]; g[:, 1:] |= out_m[:, :-1]; g[:, :-1] |= out_m[:, 1:]
            g &= tr
            if (g == out_m).all(): break
            out_m = g
        enclosed = tr & ~out_m
        lum = (0.3*f[..., 0] + 0.59*f[..., 1] + 0.11*f[..., 2])
        dark = (a > 128) & (lum < 35)
        roi = np.zeros_like(tr); roi[Y0:Y1, X0:X1] = True
        # transparent below wall top: per column, below first fire-coloured px (r>180,g>80) inside ROI rows 560..860
        fire = (a > 128) & (f[..., 0] > 170) & (f[..., 1] > 70)
        below = np.zeros_like(tr)
        for x in range(200, 940):
            col = fire[560:860, x]
            ys = np.where(col)[0]
            if len(ys) == 0: continue
            top = 560 + ys.min(); bot = 560 + ys.max()
            below[top:bot+1, x] = True
        gap = tr & below
        print(f'{name}{i}: enclosed_roi={int((enclosed&roi).sum())} transparent_inside_wall_span={int(gap.sum())} dark_roi={int((dark&roi).sum())}')
        vis = np.zeros((H, W, 3), np.uint8); vis[:] = (30, 32, 48)
        al = a[..., None] / 255.0
        vis = (f[..., :3]*al + vis*(1-al)).astype(np.uint8)
        vis[gap] = (255, 0, 255)
        vis[enclosed] = (0, 255, 255)
        vis[dark & ~tr] = (0, 255, 0)
        t = Image.fromarray(vis[Y0:Y1, X0:X1]).resize(((X1-X0)//2, (Y1-Y0)//2), Image.NEAREST)
        tiles.append((f'{name}{i}', t))
tw, th = tiles[0][1].size
cols = 4
sheetim = Image.new('RGB', (cols*(tw+6), ((len(tiles)+cols-1)//cols)*(th+6)), (0, 0, 0))
for k, (n, t) in enumerate(tiles):
    sheetim.paste(t, ((k % cols)*(tw+6), (k//cols)*(th+6)))
sheetim.save(out)
