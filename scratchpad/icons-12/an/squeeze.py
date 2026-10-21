"""Box reductions to 88x88 of the wolf's square and of wider sources (squeezed), beside his window at its own proportions."""
import sys
import numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
cands = [(25, 140), (20, 140), (15, 140), (0, 140)]
k = 3
tiles = [im.resize((round(144 * 88 / 115), 88), Image.BOX)]
for x0, x1 in cands:
    tiles.append(im.crop((x0, 0, x1, 115)).resize((88, 88), Image.BOX))
W = sum(t.size[0] * k + 12 for t in tiles)
c = Image.new('RGB', (W, 88 * k), (20, 20, 26))
x = 0
for t in tiles:
    c.paste(t.resize((t.size[0] * k, t.size[1] * k), Image.NEAREST), (x, 0))
    x += t.size[0] * k + 12
c.save(out)
