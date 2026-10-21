import numpy as np
from PIL import Image
r = np.asarray(Image.open('../art2/REF-wind-set-owner.jpg').convert('RGB')).astype(float)
o = np.asarray(Image.open('../art2/vfx-wind.png').convert('RGB')).astype(float)
fill = np.array([32, 33, 43])
# our wall-panel character at 2x: crop and feet
oc = o[700:910, 615:745]
om = (np.abs(oc - fill).sum(2) > 30)
ys, xs = np.nonzero(om)
print('our char 2x bbox', xs.min() + 615, ys.min() + 700, xs.max() + 615, ys.max() + 700)
# his aura panel: skin / hair / red / brown / blue pixels (not mint)
def his_mask(box):
    x0, y0, x1, y1 = box
    c = r[y0:y1, x0:x1]
    R, G, B = c[..., 0], c[..., 1], c[..., 2]
    skin = (R > G + 20) & (R > 120)
    red = (R > G + 40)
    hair = (B > G + 8) & (B > R + 15) & (B > 60)
    return (skin | red | hair).astype(np.float32)
def tmask(s):
    W, H = round(om.shape[1] * s), round(om.shape[0] * s)
    c = np.asarray(Image.fromarray(oc.astype(np.uint8)).resize((W, H), Image.BOX)).astype(float)
    R, G, B = c[..., 0], c[..., 1], c[..., 2]
    skin = (R > G + 20) & (R > 120); red = (R > G + 40); hair = (B > G + 8) & (B > R + 15) & (B > 60)
    return (skin | red | hair).astype(np.float32), W, H
box = (215, 683, 320, 826)
hm = his_mask(box)
best = (0, None)
for s in np.arange(0.52, 0.57, 0.005):
    t, W, H = tmask(s)
    for dy in range(-10, hm.shape[0] - H + 10):
        for dx in range(0, hm.shape[1] - W + 1):
            y0, y1 = max(0, dy), min(hm.shape[0], dy + H)
            win = hm[y0:y1, dx:dx + W]; tt = t[y0 - dy:y1 - dy]
            inter = (win * tt).sum(); uni = win.sum() + tt.sum() - inter
            if uni and inter / uni > best[0]: best = (inter / uni, (round(s, 3), dx + box[0], dy + box[1], W, H))
print(best)
s, X, Y, W, H = best[1]
# our feet bottom row in the crop: 901 - 700 = 201 at 2x; feet x centre?
print('his feet bottom y', Y + (901 - 700) * s, 'x of our crop left', X)
