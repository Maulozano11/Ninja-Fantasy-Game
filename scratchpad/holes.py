import sys
import numpy as np
from PIL import Image
path = sys.argv[1]
im = np.array(Image.open(path).convert('RGBA'))
fw, fh = 1016, 968
rows = {'surge': 8, 'burn': 6, 'fade': 6}
for r, (name, n) in enumerate(rows.items()):
    for i in range(n):
        f = im[r*fh:(r+1)*fh, i*fw:(i+1)*fw]
        a = f[..., 3]
        # region of interest: under the dragon, x 200-940, y 560-860 (wall + body roots)
        sub = f[560:860, 200:940]
        sa = sub[..., 3]
        clear = sa < 128
        reach = np.zeros_like(clear)
        reach[0, :] = clear[0, :]; reach[:, 0] |= clear[:, 0]; reach[:, -1] |= clear[:, -1]; reach[-1, :] |= clear[-1, :]
        while True:
            g = reach.copy()
            g[1:, :] |= reach[:-1, :]; g[:-1, :] |= reach[1:, :]; g[:, 1:] |= reach[:, :-1]; g[:, :-1] |= reach[:, 1:]
            g &= clear
            if (g == reach).all(): break
            reach = g
        holemask = clear & ~reach
        holes = [0] * 0
        hole_px = int(holemask.sum())
        holes = [hole_px]
        rgb = sub[..., :3].astype(int)
        lum = 0.299*rgb[..., 0] + 0.587*rgb[..., 1] + 0.114*rgb[..., 2]
        dark = int(((sa >= 128) & (lum < 40)).sum())
        semi = int(((sa > 0) & (sa < 255)).sum())
        print(f'{name}{i}: enclosed transparent px: {hole_px}, opaque near-black px: {dark}, semi px: {semi}')
