import sys; sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/drake/r4/tools'); import dec, rv
import numpy as np
from PIL import Image
T = sys.argv[1]; k = int(sys.argv[2]) if len(sys.argv) > 2 else 2
a, s, A = dec.load(f'earth-{T}.ts'); fr = a['fly']
x0, y0, x1, y1 = 25, 10, 305, 182
tiles = [Image.fromarray(rv.over(f)[y0:y1, x0:x1]).resize(((x1 - x0) * k, (y1 - y0) * k), Image.NEAREST) for f in fr]
W, H = tiles[0].size
out = Image.new('RGB', (W * 4 + 12, H * 2 + 4), (255, 0, 255))
for i, t in enumerate(tiles):
    out.paste(t, ((i % 4) * (W + 4), (i // 4) * (H + 4)))
out.save(f'{T}-grid.png')
