"""Compose rendered frames into labelled sheets.
usage: python3 -I sheet.py <rawdir> <out.png> <scale> <rowspec.json>
rowspec: [{"label": str, "cells": [[file, caption], ...]}]
Crops every frame to the union bounding box of all frames used (plus margin).
"""
import json, sys
from PIL import Image, ImageDraw, ImageFont

raw, out, scale, spec = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
rows = json.load(open(spec))
FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
FONTB = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 14)
ims = {}
box = None
for r in rows:
    for f, _ in r['cells']:
        im = Image.open(f'{raw}/{f}').convert('RGBA')
        ims[f] = im
        b = im.getbbox()
        if b:
            box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
m = 4
box = (max(0, box[0] - m), max(0, box[1] - m), min(256, box[2] + m), min(256, box[3] + m))
cw, ch = (box[2] - box[0]) * scale, (box[3] - box[1]) * scale
lab_w = 150
cap_h = 18
W = lab_w + max(len(r['cells']) for r in rows) * (cw + 6)
H = sum(ch + cap_h + 8 for r in rows) + 4
sheet = Image.new('RGBA', (W, H), (34, 36, 44, 255))
d = ImageDraw.Draw(sheet)
y = 4
for r in rows:
    d.text((6, y + ch // 2 - 8), r['label'], font=FONTB, fill=(240, 220, 170, 255))
    x = lab_w
    for f, cap in r['cells']:
        im = ims[f].crop(box).resize((cw, ch), Image.NEAREST)
        bg = Image.new('RGBA', (cw, ch), (58, 62, 74, 255))
        # ground line
        bd = ImageDraw.Draw(bg)
        gy = (216 - box[1]) * scale  # GROUND*RES
        bd.line([(0, gy), (cw, gy)], fill=(90, 96, 110, 255), width=1)
        bg.alpha_composite(im)
        sheet.alpha_composite(bg, (x, y + cap_h))
        d.text((x + 2, y + 1), cap, font=FONT, fill=(220, 220, 230, 255))
        x += cw + 6
    y += ch + cap_h + 8
sheet.convert('RGB').save(out)
print(out, sheet.size, 'box', box)
