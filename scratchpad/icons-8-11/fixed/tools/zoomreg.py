"""zoomreg.py <out.png> <id> <n> x0 y0 x1 y1 <zoom> <dir>...: his reduction and each dir's icon, cropped to a region, zoomed, with a pixel grid every 4."""
import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fixed/tools')
import numpy as np
from PIL import Image, ImageDraw
import m
out, jid, n = sys.argv[1], sys.argv[2], int(sys.argv[3])
x0, y0, x1, y1, z = map(int, sys.argv[4:9])
dirs = sys.argv[9:]
tiles = [m.his(jid, n)] + [m.ours(jid, n, d) for d in dirs]
w, h = (x1 - x0) * z, (y1 - y0) * z
img = Image.new('RGB', (len(tiles) * (w + 8), h + 14), (255, 255, 255))
dr = ImageDraw.Draw(img)
for i, t in enumerate(tiles):
    c = Image.fromarray(t[y0:y1, x0:x1].astype(np.uint8)).resize((w, h), Image.NEAREST)
    d = ImageDraw.Draw(c)
    for gx in range(x0, x1):
        if gx % 4 == 0:
            d.line([((gx - x0) * z, 0), ((gx - x0) * z, h)], fill=(90, 90, 90))
    for gy in range(y0, y1):
        if gy % 4 == 0:
            d.line([(0, (gy - y0) * z), (w, (gy - y0) * z)], fill=(90, 90, 90))
    img.paste(c, (i * (w + 8), 14))
    dr.text((i * (w + 8), 0), ('his' if i == 0 else dirs[i - 1].split('/')[-1]) + ' x%d..%d y%d..%d (grid every 4)' % (x0, x1, y0, y1), fill=(0, 0, 0))
img.save(out)
