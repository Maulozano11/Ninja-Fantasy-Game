"""his game-scale picture vs our frame 0 (on his bg and on grass): python3 cmp.py <ts> <dbgdir> <out> x0 y0 x1 y1 zoom [frames...]"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from PIL import Image
from ts2png import load, on
ts, dbg, out = sys.argv[1:4]
x0, y0, x1, y1, z = [int(v) for v in sys.argv[4:9]]
ks = [int(v) for v in sys.argv[9:]] or [0]
fr, size, anc, pal = load(ts)
his = Image.open(os.path.join(dbg, 'griffin-his-game.png')).convert('RGB')
tiles = [his.crop((x0, y0, x1, y1))]
for k in ks:
    tiles.append(on(fr[k], (32, 31, 39)).crop((x0, y0, x1, y1)))
    tiles.append(on(fr[k]).crop((x0, y0, x1, y1)))
tiles = [t.resize((t.width * z, t.height * z), Image.NEAREST) for t in tiles]
W = sum(t.width + 6 for t in tiles)
o = Image.new('RGB', (W, tiles[0].height), (255, 0, 255))
x = 0
for t in tiles:
    o.paste(t, (x, 0)); x += t.width + 6
o.save(out)
