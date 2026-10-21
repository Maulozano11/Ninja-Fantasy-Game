"""auraview.py <revdir> <out.png>: his aura | back+char+front on his panel | front only on light | back+char+front on light (waist zoom)"""
import sys, numpy as np
from PIL import Image
d, out = sys.argv[1], sys.argv[2]
ch = np.asarray(Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/earth-v3-work/character.png').convert('RGBA')).astype(float)
def load(n):
    z = np.load(d + '/k-' + n + '.npz'); idx, pal = z['idx'], z['pal']
    r = np.zeros(idx.shape + (4,)); on = idx > 0; r[on] = pal[idx[on] - 1]; return r
F, B = load('aura'), load('aura_back')
his = np.asarray(Image.open(d + '/his-aura.png').convert('RGB')).astype(float)
H, W = F.shape[:2]
ax, ay = 60, 121
def over(dst, src):
    A = src[..., 3:] / 255; return src[..., :3] * A + dst * (1 - A)
def place_char(bg):
    o = bg.copy(); cx, cy = 64, 120
    for y in range(128):
        for x in range(128):
            X, Y = x - cx + ax, y - cy + ay
            if 0 <= X < W and 0 <= Y < H and ch[y, x, 3] > 0:
                a = ch[y, x, 3] / 255; o[Y, X] = ch[y, x, :3] * a + o[Y, X] * (1 - a)
    return o
def scene(bg, char=True, back=True):
    o = np.zeros((H, W, 3)) + bg
    if back: o = over(o, B)
    if char: o = place_char(o)
    return over(o, F)
x0, y0, x1, y1 = 15, 50, 105, 100
k = 6
ims = [his, scene([34, 34, 45]), scene([200, 190, 160], char=False, back=False), scene([200, 190, 160])]
o = Image.new('RGB', (((x1 - x0) * k + 8) * 2, ((y1 - y0) * k + 8) * 2))
for i, a in enumerate(ims):
    t = Image.fromarray(np.clip(a[y0:y1, x0:x1], 0, 255).astype(np.uint8)).resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST)
    o.paste(t, ((i % 2) * ((x1 - x0) * k + 8), (i // 2) * ((y1 - y0) * k + 8)))
o.save(out)
