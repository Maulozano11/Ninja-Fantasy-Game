"""crop.py which x0 y0 x1 y1 k out.png : native crop with a ruler every 5 px (labels) and faint grid."""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
S = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/cuerpo-v2/study/work/'
w, x0, y0, x1, y1, k = sys.argv[1], *map(int, sys.argv[2:7])
out = sys.argv[7]
if w.endswith('.png'):
    a = np.asarray(Image.open(w).convert('RGBA'))
    N = a[..., :3].copy(); F = a[..., 3] > 0
else:
    N = np.load(S + w + '-native.npy').astype(np.uint8); F = np.load(S + w + '-fig.npy')
N = N.copy(); N[~F] = (235, 235, 240)
c = N[y0:y1, x0:x1]
H, W = c.shape[:2]
m = 30
img = Image.new('RGB', (W * k + m, H * k + m), 'white')
img.paste(Image.fromarray(c.astype(np.uint8)).resize((W * k, H * k), Image.NEAREST), (m, m))
d = ImageDraw.Draw(img)
f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 10)
for i in range(W + 1):
    x = m + i * k
    if (x0 + i) % 5 == 0:
        d.line((x, m, x, m + H * k), fill=(255, 0, 255) if (x0 + i) % 10 == 0 else (150, 150, 255), width=1)
        if (x0 + i) % 10 == 0: d.text((x - 6, 2), str(x0 + i), fill=(0, 0, 0), font=f)
for j in range(H + 1):
    y = m + j * k
    if (y0 + j) % 5 == 0:
        d.line((m, y, m + W * k, y), fill=(255, 0, 255) if (y0 + j) % 10 == 0 else (150, 150, 255), width=1)
        if (y0 + j) % 10 == 0: d.text((0, y - 6), str(y0 + j), fill=(0, 0, 0), font=f)
img.save(out)
print(img.size)
