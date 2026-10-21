# Sample the owner's first "leer" (top-left of his webp) at our fine-pixel grid.
# Registration (register.py): fine pixel (i, j) of our sheet's grid (origin orig px (103, 23), 3 px per
# fine px) has its centre at webp (U + (i + 0.5) P, V + (j + 0.5) P).
import numpy as np
from PIL import Image
S = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/'
P, U, V = 2.1482, 66.37, 17.10
W = np.asarray(Image.open(S + 'camp-ref/owner-camp-poses.webp').convert('RGB')).astype(float)
O = np.asarray(Image.open(S + 'camp-peek/campamento-avance.png').convert('RGB')).astype(float)
FX, FY = 69, 95


def sample_box(img, cx, cy, r=0.55):
    # area mean over the central r-radius box (in webp px) with bilinear weights
    xs = np.linspace(cx - r, cx + r, 5)
    ys = np.linspace(cy - r, cy + r, 5)
    acc = np.zeros(3)
    for y in ys:
        for x in xs:
            x0 = int(np.floor(x)); y0 = int(np.floor(y)); fx = x - x0; fy = y - y0
            c = img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x0 + 1] * fx * (1 - fy) + img[y0 + 1, x0] * (1 - fx) * fy + img[y0 + 1, x0 + 1] * fx * fy
            acc += c
    return acc / 25


his = np.zeros((FY, FX, 3))
for j in range(FY):
    for i in range(FX):
        his[j, i] = sample_box(W, U + (i + 0.5) * P, V + (j + 0.5) * P)
ours = O[23:23 + FY * 3, 103:103 + FX * 3].reshape(FY, 3, FX, 3, 3)[:, 1, :, 1, :]
np.save(S + 'camp-ref/v3/work/his_leer1.npy', his)
np.save(S + 'camp-ref/v3/work/ours_antes_leer1.npy', ours)
k = 8
a = Image.fromarray(np.clip(his, 0, 255).astype(np.uint8)).resize((FX * k, FY * k), Image.NEAREST)
b = Image.fromarray(ours.astype(np.uint8)).resize((FX * k, FY * k), Image.NEAREST)
sheet = Image.new('RGB', (FX * k * 2 + 20, FY * k), (20, 20, 20))
sheet.paste(a, (0, 0)); sheet.paste(b, (FX * k + 20, 0))
sheet.save(S + 'camp-ref/v3/work/his-vs-ours-fine.png')
# grid crop of book region
c = a.crop((20 * k, 20 * k, 60 * k, 50 * k))
from PIL import ImageDraw
d = ImageDraw.Draw(c)
for t in range(0, 40):
    d.line([(t * k, 0), (t * k, 30 * k)], fill=(60, 60, 60) if t % 5 else (120, 120, 0))
for t in range(0, 30):
    d.line([(0, t * k), (40 * k, t * k)], fill=(60, 60, 60) if t % 5 else (120, 120, 0))
c = c.resize((c.width * 2, c.height * 2), Image.NEAREST)
c.save(S + 'camp-ref/v3/work/his-book-grid.png')
