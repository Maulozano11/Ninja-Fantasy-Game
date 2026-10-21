# vs.py ours.rgba out.png [k] [x0 y0 x1 y1]: his first leer (lifted at our fine grid: his (i, j) = sprite
# (81 + i, 129 + j)) next to ours, both on our background, zoomed k, with a grid every 5 px.
import sys
import numpy as np
from PIL import Image, ImageDraw
G = 256
D = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/camp-ref/v3/work/'
OX, OY = 81, 129
his = np.load(D + 'his_leer1.npy')
k = int(sys.argv[3]) if len(sys.argv) > 3 else 8
x0, y0, x1, y1 = map(int, sys.argv[4:8]) if len(sys.argv) > 7 else (95, 135, 150, 185)
bg = np.array([38, 42, 58.])
im = np.frombuffer(open(sys.argv[1], 'rb').read(), np.uint8).reshape(G, G, 4).astype(float)
a = im[..., 3:] / 255
ours = im[..., :3] * a + bg * (1 - a)
H = np.tile(bg, (G, G, 1))
H[OY:OY + his.shape[0], OX:OX + his.shape[1]] = his


def panel(arr):
    c = np.clip(arr[y0:y1, x0:x1], 0, 255).astype(np.uint8)
    img = Image.fromarray(c).resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST)
    d = ImageDraw.Draw(img)
    for x in range(x0, x1):
        if x % 5 == 0:
            d.line([((x - x0) * k, 0), ((x - x0) * k, 3)], fill=(255, 255, 0))
            d.text(((x - x0) * k + 1, 2), str(x), fill=(255, 255, 0))
    for y in range(y0, y1):
        if y % 5 == 0:
            d.line([(0, (y - y0) * k), (3, (y - y0) * k)], fill=(255, 255, 0))
            d.text((2, (y - y0) * k + 1), str(y), fill=(255, 255, 0))
    return img


A = panel(H)
B = panel(ours)
out = Image.new('RGB', (A.width * 2 + 10, A.height), (0, 0, 0))
out.paste(A, (0, 0))
out.paste(B, (A.width + 10, 0))
out.save(sys.argv[2])
