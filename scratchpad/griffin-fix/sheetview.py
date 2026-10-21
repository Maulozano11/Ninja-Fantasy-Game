"""python3 sheetview.py out.png zoom bg frames(comma) x0 y0 x1 y1"""
import sys, json, os
import numpy as np
from PIL import Image
ST = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/art2/staging/vfx_beasts_griffin'
man = json.load(open(os.path.join(ST, 'manifest.json')))['sprites']['chakra']
sheet = Image.open(os.path.join(ST, 'chakra.png')).convert('RGBA')
FW, FH = man['frameW'], man['frameH']
out, z, bgn, ks = sys.argv[1], int(sys.argv[2]), sys.argv[3], [int(v) for v in sys.argv[4].split(',')]
box = [int(v) for v in sys.argv[5:9]] if len(sys.argv) > 8 else [0, 0, FW, FH]
bg = {'dark': (32, 31, 39), 'grass': (0x5d, 0x6b, 0x57)}[bgn]
tiles = []
for k in ks:
    f = sheet.crop((k * FW, 0, (k + 1) * FW, FH))
    b = Image.new('RGBA', f.size, bg + (255,)); b.alpha_composite(f)
    b = b.convert('RGB').crop(box)
    tiles.append(b.resize((b.width * z, b.height * z), Image.NEAREST))
cols = min(4, len(tiles)); rows = (len(tiles) + cols - 1) // cols
w, h = tiles[0].size
o = Image.new('RGB', (cols * (w + 6), rows * (h + 6)), (255, 0, 255))
for i, t in enumerate(tiles):
    o.paste(t, ((i % cols) * (w + 6), (i // cols) * (h + 6)))
o.save(out)
