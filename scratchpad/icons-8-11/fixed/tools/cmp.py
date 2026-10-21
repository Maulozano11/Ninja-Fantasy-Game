"""cmp.py <out.png> <dirA> <dirB> id [id...]: per icon a row: his 88 | A 88 | B 88 | his 44 | A 44 | B 44 (all x4 for 44, x2 for 88 -> 176)."""
import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fixed/tools')
import numpy as np
from PIL import Image
import m
out, A, B = sys.argv[1:4]
ids = sys.argv[4:]
Z = int(__import__('os').environ.get('Z', '264'))
rows = []
for jid in ids:
    tiles = [m.his(jid, 88), m.ours(jid, 88, A), m.ours(jid, 88, B), m.his(jid, 44), m.ours(jid, 44, A), m.ours(jid, 44, B)]
    row = Image.new('RGB', (6 * Z + 50, Z), (40, 40, 40))
    for i, t in enumerate(tiles):
        row.paste(Image.fromarray(t.astype(np.uint8)).resize((Z, Z), Image.NEAREST), (i * (Z + 10), 0))
    rows.append(row)
o = Image.new('RGB', (rows[0].width, len(rows) * (Z + 10)), (40, 40, 40))
for i, r in enumerate(rows):
    o.paste(r, (0, i * (Z + 10)))
o.save(out)
