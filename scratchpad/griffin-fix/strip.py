"""python3 strip.py out.png zoom bg(dark|grass) [box x0 y0 x1 y1] -- renders the converter's pre-crop frames (no checks)"""
import sys; sys.path.insert(0, '.')
args = list(sys.argv[1:])
from partial import run
import numpy as np
from PIL import Image
g = run('if FAILS:\n    raise SystemExit')
out, z, bgname = args[0], int(args[1]), args[2]
box = [int(v) for v in args[3:7]] if len(args) >= 7 else None
bg = (32, 31, 39) if bgname == 'dark' else (0x5d, 0x6b, 0x57)
tiles = []
for f in g['frames']:
    b = Image.new('RGBA', (f.shape[1], f.shape[0]), bg + (255,)); b.alpha_composite(Image.fromarray(f, 'RGBA'))
    b = b.convert('RGB')
    if box: b = b.crop(box)
    tiles.append(b.resize((b.width * z, b.height * z), Image.NEAREST))
w, h = tiles[0].size
o = Image.new('RGB', (4 * (w + 6), 2 * (h + 6)), (255, 0, 255))
for i, t in enumerate(tiles):
    o.paste(t, ((i % 4) * (w + 6), (i // 4) * (h + 6)))
o.save(out)
