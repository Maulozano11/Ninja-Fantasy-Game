# zoom.py out.png k x0 y0 x1 y1 a.rgba [b.rgba ...]: our renders side by side on our background, zoomed k,
# with tick labels every 5 px.
import sys
import numpy as np
from PIL import Image, ImageDraw
G = 256
out = sys.argv[1]
k = int(sys.argv[2])
x0, y0, x1, y1 = map(int, sys.argv[3:7])
files = sys.argv[7:]
bg = np.array([38, 42, 58.])


def panel(path):
    im = np.frombuffer(open(path, 'rb').read(), np.uint8).reshape(G, G, 4).astype(float)
    a = im[..., 3:] / 255
    arr = im[..., :3] * a + bg * (1 - a)
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


ps = [panel(f) for f in files]
W = sum(p.width for p in ps) + 10 * (len(ps) - 1)
o = Image.new('RGB', (W, ps[0].height), (0, 0, 0))
x = 0
for p in ps:
    o.paste(p, (x, 0))
    x += p.width + 10
o.save(out)
