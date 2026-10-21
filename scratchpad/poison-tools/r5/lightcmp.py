"""lightcmp.py <refdata.ts> <srcdir> <out.png> [label]: his G excess vs our light (game scale), heat + composite."""
import re, json, zlib, base64, sys
import numpy as np
from PIL import Image, ImageDraw
ts, src, out = sys.argv[1:4]
s = open(ts).read()
L = json.loads(re.search(r'export const PV3_LIGHT[^=]*= (\{.*?\n\});', s, re.S).group(1))['blast']
R = json.loads(re.search(r'export const PV3_REF[^=]*= (\{.*?\n\});', s, re.S).group(1))['blast']
W, H = R['w'], R['h']
a = np.frombuffer(zlib.decompress(base64.b64decode(L['a'])), np.uint8).reshape(L['h'], L['w']).astype(float)
A = np.zeros((H, W)); A[L['y']:L['y'] + L['h'], L['x']:L['x'] + L['w']] = a
np.save(out.replace('.png', '.npy'), A)
his = np.asarray(Image.open(src + '/his-blast.png').convert('RGB')).astype(float)
M = np.asarray(Image.open(src + '/mask-blast.png').convert('L')) > 127
rgb = np.array([int(L['rgb'][i:i + 2], 16) for i in (1, 3, 5)], float)
BG = np.array([33, 33, 45.0])
def comp(bg):
    al = A[..., None] / 255
    return rgb * al + np.asarray(bg) * (1 - al)
x0 = 130
tiles = []
hisG = np.clip(his[..., 1] - 33, 0, None)
ourG = A / 255 * (rgb[1] - 33)
for img in (np.repeat(hisG[..., None], 3, -1) * [0.3, 1.4, 0.4], np.repeat(ourG[..., None], 3, -1) * [0.3, 1.4, 0.4], comp(BG), comp([84, 110, 70])):
    im = img[:, x0:].copy()
    tiles.append(Image.fromarray(np.clip(im, 0, 255).astype(np.uint8)).resize(((W - x0) * 3, H * 3), Image.NEAREST))
# mask outline on the heat
can = Image.new('RGB', (sum(t.width for t in tiles) + 30, H * 3), (0, 0, 0))
x = 0
for t in tiles:
    can.paste(t, (x, 0)); x += t.width + 10
d = ImageDraw.Draw(can)
ys, xs = np.nonzero(M & ~np.roll(M, 1, 0) | M & ~np.roll(M, 1, 1))
for y, xx in zip(ys, xs):
    if xx >= x0:
        for k in (0, 1):
            px = k * (tiles[0].width + 10) + (xx - x0) * 3 + 1
            d.point((px, y * 3 + 1), fill=(255, 0, 255))
can.save(out)
for y in range(96, 172, 4):
    print('%3d' % y, ' '.join('%3d' % A[y, x] for x in range(170, W, 4)))
