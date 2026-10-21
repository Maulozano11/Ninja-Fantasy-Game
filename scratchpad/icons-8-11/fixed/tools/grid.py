"""grid.py <out.png> <n> <zoom> <dir>... [-- ids]: for each icon a row of his reduction then each dir's icon at size n, zoomed."""
import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fixed/tools')
import numpy as np
from PIL import Image
import m
args = sys.argv[1:]
ids = list(m.SHEET)
if '--' in args:
    i = args.index('--')
    ids = args[i + 1:]
    args = args[:i]
out, n, z = args[0], int(args[1]), int(args[2])
dirs = args[3:]
Z = n * z
cols = 1 + len(dirs)
img = Image.new('RGB', (cols * (Z + 6), len(ids) * (Z + 6)), (40, 40, 40))
for r, jid in enumerate(ids):
    tiles = [m.his(jid, n)] + [m.ours(jid, n, d) for d in dirs]
    for c, t in enumerate(tiles):
        img.paste(Image.fromarray(t.astype(np.uint8)).resize((Z, Z), Image.NEAREST), (c * (Z + 6), r * (Z + 6)))
img.save(out)
