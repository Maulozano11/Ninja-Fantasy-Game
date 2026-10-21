import numpy as np
from PIL import Image
ref = Image.open('../art2/REF-water-set-owner.jpg').convert('RGB')
ch = Image.open('look/ourchar.png').convert('RGBA')
ch = ch.resize((128, 128), Image.NEAREST)
ca = np.asarray(ch).astype(np.float32)
mask = ca[..., 3] > 0
bg = np.array([25, 26, 34], np.float32)
def best(region, label):
    x0, y0, x1, y1 = region
    res = []
    for s in np.arange(0.90, 1.10, 0.005):
        # his crop resampled to game scale by s (his px * s = game px)
        crop = ref.crop((x0, y0, x1, y1))
        W, H = round(crop.width * s), round(crop.height * s)
        g = np.asarray(crop.resize((W, H), Image.BILINEAR)).astype(np.float32)
        # our char composited on bg
        comp = np.where(mask[..., None], ca[..., :3], bg)
        bx0, by0, bx1, by1 = 27, 27, 83, 123
        tpl = comp[by0:by1, bx0:bx1]; tm = mask[by0:by1, bx0:bx1]
        th, tw = tpl.shape[:2]
        bestv = None
        for dy in range(0, H - th):
            for dx in range(0, W - tw):
                win = g[dy:dy + th, dx:dx + tw]
                e = np.abs(win - tpl).sum(2)[tm].mean()
                if bestv is None or e < bestv[0]:
                    bestv = (e, dx, dy)
        res.append((bestv[0], s, bestv[1], bestv[2]))
    res.sort()
    print(label, [(round(e, 1), round(s, 3), dx, dy) for e, s, dx, dy in res[:4]])
best((295, 375, 385, 498), 'wall')
best((45, 790, 135, 915), 'depth')
