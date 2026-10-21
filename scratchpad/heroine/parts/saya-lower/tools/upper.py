"""Saya's top (heroine/saya-upper's SAYA_TOP, from its generated sayaUpperArt.ts) stamped over a body
render at idle, for context: python3 -I upper.py <sayaUpperArt.ts> <body.png> <out.png>"""
import re
import sys
import numpy as np
from PIL import Image

src = open(sys.argv[1]).read()


def piece(name):
    m = re.search(r'export const ' + name + r': PaintedPiece = \{(.*?)\n\};', src, re.S)
    body = m.group(1)
    rows = re.findall(r"^\s+'([^']*)',$", body.split('colors')[0], re.M)
    cols = dict(re.findall(r"^\s+(\w): '(#[0-9a-f]{6})',", body, re.M))
    return rows, cols


a = np.asarray(Image.open(sys.argv[2]).convert('RGBA')).copy()
for name, x0, y0 in [('SAYA_TOP', 115, 150), ('SAYA_UPPER_N', 109, 157), ('SAYA_FORE_N', 107, 164), ('SAYA_UPPER_F', 129, 157), ('SAYA_FORE_F', 130, 164)]:
    rows, cols = piece(name)
    for j, r in enumerate(rows):
        for i, ch in enumerate(r):
            if ch == '.':
                continue
            h = cols[ch]
            a[y0 + j, x0 + i, :3] = [int(h[k:k + 2], 16) for k in (1, 3, 5)]
            a[y0 + j, x0 + i, 3] = 255
Image.fromarray(a).save(sys.argv[3])
