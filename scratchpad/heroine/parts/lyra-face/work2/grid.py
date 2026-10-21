"""A labelled grid of the pose crops: grid.py <dir> <tag> <out.png> <k>  (rows: bodies, columns: poses)"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

d, tag, out, k = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
names = json.load(open(os.path.join(d, f'{tag}-list.json')))
POSE_ES = {'idle': 'Quieta', 'attack': 'Ataque', 'cast': 'Lanzar', 'hurt': 'Herida', 'victory': 'Victoria', 'charge': 'Cargar',
           'handsigns': 'Sellos', 'walk': 'Caminar', 'run': 'Correr', 'crouch': 'Agachada', 'sneak': 'Sigilo', 'downed': 'Caida',
           'sit': 'Sentada', 'read': 'Leyendo', 'lean': 'Apoyada', 'train': 'Entrena'}
BODY_ES = {'female': 'Mujer', 'male': 'Hombre', 'bulky': 'Corpulento', 'slender': 'Esbelta'}
rows = {}
for n in names:
    _, body, pose, frame = n[:-4].split('-')
    rows.setdefault(body, []).append((pose, frame, n))
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 13)
cw, ch = 30 * k, 26 * k
left, top, pad = 110, 24, 6
ncol = max(len(v) for v in rows.values())
sheet = Image.new('RGB', (left + ncol * (cw + pad), top + len(rows) * (ch + pad)), (40, 38, 48))
dr = ImageDraw.Draw(sheet)
for r, (body, items) in enumerate(rows.items()):
    y = top + r * (ch + pad)
    dr.text((6, y + ch // 2 - 7), BODY_ES[body], fill=(255, 240, 200), font=font)
    for c, (pose, frame, n) in enumerate(items):
        a = np.asarray(Image.open(os.path.join(d, n)).convert('RGBA'))
        bg = np.zeros(a.shape[:2] + (3,), np.uint8)
        yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
        bg[:] = 236
        bg[((yy + xx) % 2) == 0] = 222
        m = a[..., 3] > 0
        bg[m] = a[m, :3]
        x = left + c * (cw + pad)
        sheet.paste(Image.fromarray(bg).resize((cw, ch), Image.NEAREST), (x, y))
        if r == 0:
            dr.text((x, 4), f'{POSE_ES[pose]} {frame}', fill=(255, 240, 200), font=font)
sheet.save(out)
