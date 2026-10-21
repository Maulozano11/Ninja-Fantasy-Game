"""His full windows at x4 with a tick every 10 of his pixels (window coordinates) on the edges."""
import sys
import numpy as np
from PIL import Image, ImageDraw

d = sys.argv[1]
out = sys.argv[2]
WINS = {
    '8': [('swap', (14, 64, 158, 191)), ('command', (179, 64, 307, 191)), ('submission', (331, 64, 466, 191))],
    '11': [('clone', (16, 61, 150, 191)), ('firedragon', (173, 61, 307, 191)), ('waterdragon', (330, 61, 464, 191))],
    '9': [('mirai', (14, 83, 112, 179))],
}
Z = 5
for s, wins in WINS.items():
    nat = np.load('%s/native-%s.npy' % (d, s))
    for name, (x0, y0, x1, y1) in wins:
        win = np.clip(np.round(nat[y0:y1, x0:x1]), 0, 255).astype(np.uint8)
        img = Image.fromarray(win).resize(((x1 - x0) * Z, (y1 - y0) * Z), Image.NEAREST)
        can = Image.new('RGB', (img.size[0] + 40, img.size[1] + 40), (20, 20, 20))
        can.paste(img, (20, 20))
        dr = ImageDraw.Draw(can)
        for x in range(0, x1 - x0 + 1, 10):
            dr.line([(20 + x * Z, 0), (20 + x * Z, 18)], fill=(255, 255, 0))
            dr.text((22 + x * Z, 2), str(x), fill=(255, 255, 0))
        for y in range(0, y1 - y0 + 1, 10):
            dr.line([(0, 20 + y * Z), (18, 20 + y * Z)], fill=(255, 255, 0))
            dr.text((0, 22 + y * Z), str(y), fill=(255, 255, 0))
        can.save('%s/win-%s.png' % (out, name))
