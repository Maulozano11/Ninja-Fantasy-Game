"""Her face's outline (her native pixels brought down by the head's map with her lash on our lash row)
over our three face shapes, at 12x: faceshape.py <repo> <out.png> <tapered.png> <soft.png> <square.png>"""
import os
import sys

repo = sys.argv[1]
sys.path.insert(0, os.path.join(repo, 'tools/refs'))
import numpy as np
from PIL import Image, ImageDraw, ImageFont

import heroine_ref as H

N = H.native('lyra')
q = H.quantize(N, 'lyra')
P = H.PALETTES['lyra']
skin = {P.index(h) for h in ['#fdceb0', '#eea692', '#df9180', '#d88674', '#c8756a', '#fbfdfd', '#a85a53', '#c06960']}
# her face: the skin-coloured pixels inside x 86-112, rows 20-48 (her face, neck cut at 47)
face = np.zeros(N.shape[:2], bool)
for y in range(20, 48):
    for x in range(86, 113):
        face[y, x] = int(q[y, x]) in skin
# eyes, brows, mouth and lashes inside the face count as face
def fill_holes(m):
    Hh, Ww = m.shape
    out = np.zeros_like(m)
    stack = [(y, x) for y in range(Hh) for x in (0, Ww - 1)] + [(y, x) for x in range(Ww) for y in (0, Hh - 1)]
    while stack:
        y, x = stack.pop()
        if not (0 <= y < Hh and 0 <= x < Ww) or out[y, x] or m[y, x]:
            continue
        out[y, x] = True
        stack += [(y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)]
    return ~out
sub = fill_holes(face[18:50, 84:115])
face[18:50, 84:115] = sub
# our cells: x = 125.5 + (hx - 99) * 0.56 ; y = 141 + (hy - 27) * 0.51 (her lash top on our lash row)
x0, y0, w, h = 112, 128, 30, 28
ours = np.zeros((h, w), float)
S = 8
for j in range(h):
    for i in range(w):
        cnt = 0
        for a in range(S):
            for b in range(S):
                X = x0 + i + (b + 0.5) / S
                Y = y0 + j + (a + 0.5) / S
                hx = 99 + (X - 126.0) / 0.56
                hy = 27 + (Y - 141.0) / 0.51
                if 0 <= int(hy) < N.shape[0] and 0 <= int(hx) < N.shape[1] and face[int(hy), int(hx)]:
                    cnt += 1
        ours[j, i] = cnt / (S * S)
mask = ours >= 0.5
k = 12
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
panels = []
for path, label in zip(sys.argv[3:6], ['Afilada', 'Suave', 'Cuadrada']):
    a = np.asarray(Image.open(path).convert('RGBA'))[y0:y0 + h, x0:x0 + w]
    bg = np.full((h, w, 3), 230, np.uint8)
    m = a[..., 3] > 0
    bg[m] = a[m, :3]
    im = Image.fromarray(bg).resize((w * k, h * k), Image.NEAREST)
    d = ImageDraw.Draw(im)
    for j in range(h):
        for i in range(w):
            if not mask[j, i]:
                continue
            for dj, di, seg in ((-1, 0, [(i * k, j * k), ((i + 1) * k, j * k)]), (1, 0, [(i * k, (j + 1) * k), ((i + 1) * k, (j + 1) * k)]),
                                (0, -1, [(i * k, j * k), (i * k, (j + 1) * k)]), (0, 1, [((i + 1) * k, j * k), ((i + 1) * k, (j + 1) * k)])):
                jj, ii = j + dj, i + di
                if not (0 <= jj < h and 0 <= ii < w) or not mask[jj, ii]:
                    d.line(seg, fill=(30, 200, 255), width=3)
    panels.append((im, label))
W = sum(p.width for p, _ in panels) + 16 * (len(panels) + 1)
sheet = Image.new('RGB', (W, h * k + 80), (40, 38, 48))
d = ImageDraw.Draw(sheet)
x = 16
for im, label in panels:
    sheet.paste(im, (x, 40))
    d.text((x, 8), label, fill=(255, 240, 200), font=font)
    x += im.width + 16
d.text((16, h * k + 48), 'Celeste: el contorno de su cara (Tu dibujo) a nuestra escala, ojos sobre ojos', fill=(150, 220, 255), font=font)
sheet.save(sys.argv[2])
