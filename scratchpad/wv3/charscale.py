import numpy as np
from PIL import Image
r = np.asarray(Image.open('../art2/REF-wind-set-owner.jpg').convert('RGB')).astype(float)
o = np.asarray(Image.open('../art2/vfx-wind.png').convert('RGB')).astype(float)
fill = np.array([32, 33, 43])
oc = o[700:910, 615:745]
om = (np.abs(oc - fill).sum(2) > 30).astype(np.float32)
def his_mask(box):
    x0, y0, x1, y1 = box
    c = r[y0:y1, x0:x1]
    g = (c[..., 1] > c[..., 0] + 25) & (c[..., 1] > c[..., 2] + 5)
    return ((np.abs(c - np.array([32, 32, 42])).sum(2) > 45) & ~g).astype(np.float32)
def match(box):
    hm = his_mask(box)
    best = (0, None)
    for s in np.arange(0.48, 0.60, 0.005):
        W, H = round(om.shape[1] * s), round(om.shape[0] * s)
        t = np.asarray(Image.fromarray(om * 255).resize((W, H), Image.BOX)) / 255 > 0.5
        t = t.astype(np.float32)
        for dy in range(0, hm.shape[0] - H + 1):
            for dx in range(0, hm.shape[1] - W + 1):
                win = hm[dy:dy + H, dx:dx + W]
                inter = (win * t).sum(); uni = win.sum() + t.sum() - inter
                iou = inter / uni
                if iou > best[0]:
                    best = (iou, (round(s, 3), dx + box[0], dy + box[1], W, H))
    return best
for name, box in [('wall', (330, 380, 405, 505)), ('blast', (525, 222, 622, 340)), ('diag', (640, 455, 738, 585)), ('depth', (70, 785, 150, 915))]:
    print(name, match(box))
