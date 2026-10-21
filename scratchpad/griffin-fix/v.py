"""quick views: python3 v.py <ts> <out> zoom frames... [--box x0 y0 x1 y1] [--bg dark|grass]"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from ts2png import load
args = sys.argv[1:]
box = None; bg = (0x5d, 0x6b, 0x57)
if '--box' in args:
    i = args.index('--box'); box = [int(v) for v in args[i+1:i+5]]; del args[i:i+5]
if '--bg' in args:
    i = args.index('--bg'); bg = (32, 31, 39) if args[i+1] == 'dark' else bg; del args[i:i+2]
ts, out, z = args[0], args[1], int(args[2])
ks = [int(v) for v in args[3:]]
fr, size, anc, pal = load(ts)
tiles = []
for k in ks:
    b = Image.new('RGBA', (size[0], size[1]), bg + (255,))
    b.alpha_composite(Image.fromarray(fr[k], 'RGBA'))
    b = b.convert('RGB')
    if box: b = b.crop(box)
    tiles.append(b.resize((b.width * z, b.height * z), Image.NEAREST))
cols = min(4, len(tiles))
w, h = tiles[0].size
rows = (len(tiles) + cols - 1) // cols
o = Image.new('RGB', (cols * (w + 6), rows * (h + 6)), (255, 0, 255))
for i, t in enumerate(tiles):
    o.paste(t, ((i % cols) * (w + 6), (i // cols) * (h + 6)))
o.save(out)
print(o.size)
