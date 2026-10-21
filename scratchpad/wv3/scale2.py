import numpy as np
from PIL import Image
ref = Image.open('../art2/REF-water-set-owner.jpg').convert('RGB')
ch = Image.open('look/ourchar.png').convert('RGBA').resize((128, 128), Image.NEAREST)
ca = np.asarray(ch).astype(np.float32)
mask = ca[..., 3] > 0
bg = np.array([25, 26, 34], np.float32)
comp = np.where(mask[..., None], ca[..., :3], bg)
def lumi(a): return a @ np.array([0.3, 0.59, 0.11], np.float32)
bx0, by0, bx1, by1 = 27, 27, 83, 123
tpl = lumi(comp[by0:by1, bx0:bx1]); tm = mask[by0:by1, bx0:bx1]
th, tw = tpl.shape
def best(region, label):
    x0, y0, x1, y1 = region
    crop = ref.crop((x0, y0, x1, y1))
    res = []
    for sx in np.arange(0.88, 1.08, 0.01):
        for sy in np.arange(0.88, 1.04, 0.01):
            W, H = round(crop.width * sx), round(crop.height * sy)
            g = lumi(np.asarray(crop.resize((W, H), Image.BOX)).astype(np.float32))
            bestv = None
            for dy in range(0, H - th):
                for dx in range(0, W - tw):
                    win = g[dy:dy + th, dx:dx + tw]
                    a = win[tm] - win[tm].mean(); b = tpl[tm] - tpl[tm].mean()
                    cc = (a * b).sum() / np.sqrt((a * a).sum() * (b * b).sum())
                    if bestv is None or cc > bestv[0]:
                        bestv = (cc, dx, dy)
            res.append((-bestv[0], sx, sy, bestv[1], bestv[2]))
    res.sort()
    print(label, [(round(-e, 3), round(sx, 3), round(sy, 3), dx, dy) for e, sx, sy, dx, dy in res[:5]])
best((295, 375, 385, 498), 'wall')
best((45, 790, 135, 915), 'depth')
