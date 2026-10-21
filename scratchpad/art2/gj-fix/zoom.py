# zoom.py <prevdir> <name> x0 y0 x1 y1 Z [panels]  -> <prevdir>/z_<name>.png  (his | ours on his bg | ours on green)
import sys, json
from PIL import Image
pd, name = sys.argv[1], sys.argv[2]
x0, y0, x1, y1, Z = map(int, sys.argv[3:8])
panels = [int(c) for c in (sys.argv[8] if len(sys.argv) > 8 else '012')]
im = Image.open(f'{pd}/{name}.png')
W = None
# find frame width: image width = 3*W*z + 20
H = im.height
for z in (4, 2):
    if H % z == 0 and (im.width - 20) % (3 * z) == 0 and (im.width - 20) // (3 * z) * z * 0 == 0:
        Wg = (im.width - 20) // (3 * z); Hg = H // z
        if Wg > 0: break
tiles = []
for p in panels:
    t = im.crop((p * (Wg * z + 10) + x0 * z, y0 * z, p * (Wg * z + 10) + x1 * z, y1 * z))
    t = t.resize(((x1 - x0) * Z, (y1 - y0) * Z), Image.NEAREST)
    tiles.append(t)
out = Image.new('RGB', (sum(t.width + 6 for t in tiles), tiles[0].height), (255, 0, 255))
x = 0
for t in tiles: out.paste(t, (x, 0)); x += t.width + 6
out.save(f'{pd}/z_{name}.png')
print(Wg, Hg, z)
