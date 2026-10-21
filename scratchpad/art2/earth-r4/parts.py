"""parts.py <refdata.ts> <sprite> <scale> <out.png> : every piece of a key frame, kind-coloured
(body as is, outline red, dust as is on dark, shade blue), one panel per piece."""
import base64
import json
import re
import sys

import numpy as np
from PIL import Image, ImageDraw

src = open(sys.argv[1]).read()
name, sc, out = sys.argv[2], int(sys.argv[3]), sys.argv[4]
m = re.search(r'export const EV3_REF: Record<string, EarthRef> = (\{.*\});', src, re.S)
ref = json.loads(m.group(1))[name]
W, H = ref['w'], ref['h']
pal = ref['pal']


def dec(pc):
    a = np.zeros((H, W), np.int32)
    b = base64.b64decode(pc['rle'])
    i = 0
    for k in range(0, len(b) - 1, 2):
        n, v = b[k], b[k + 1]
        if v:
            for j in range(n):
                a[pc['y'] + (i + j) // pc['w'], pc['x'] + (i + j) % pc['w']] = v
        i += n
    return a


def render(a, mark=True):
    img = np.zeros((H, W, 4), np.uint8)
    img[...] = (34, 34, 45, 255)
    for y in range(H):
        for x in range(W):
            v = a[y, x]
            if not v:
                continue
            p = pal[v - 1]
            c = [int(p['rgba'][1 + 2 * i:3 + 2 * i], 16) for i in range(4)]
            if mark and p['kind'] == 'outline':
                c = [255, 0, 0, 255]
            if mark and p['kind'] == 'shade':
                c = [60, 60, 255, 255]
            al = c[3] / 255
            img[y, x, :3] = (np.array(c[:3]) * al + img[y, x, :3] * (1 - al)).astype(np.uint8)
    return Image.fromarray(img).resize((W * sc, H * sc), Image.NEAREST)


names = list(ref['pieces'].keys())
tiles = [(n, render(dec(ref['pieces'][n]))) for n in names]
cols = 4
rows = (len(tiles) + cols - 1) // cols
o = Image.new('RGBA', (cols * (W * sc + 4), rows * (H * sc + 14)), (0, 0, 0, 255))
d = ImageDraw.Draw(o)
for k, (n, t) in enumerate(tiles):
    x, y = (k % cols) * (W * sc + 4), (k // cols) * (H * sc + 14)
    o.paste(t, (x, y + 12))
    d.text((x + 2, y), n, fill=(255, 255, 0))
o.save(out)
print(W, H, ref['anchor'], names)
