"""cells.py <id> <N> <x0> <y0> <x1> <y1> [dir]: per cell his box | our reduced picture (ref) | our base (quantized) | ours final.
dir defaults to fix4/debug (reads <id>-ref<N>.png, <id>-base<N>.png, <id>-<N>.png)."""
import sys
sys.path.insert(0, '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fixed/tools')
import numpy as np
from PIL import Image
import m

jid, N = sys.argv[1], int(sys.argv[2])
x0, y0, x1, y1 = map(int, sys.argv[3:7])
D = sys.argv[7] if len(sys.argv) > 7 else '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/icons-8-11/fix4/debug'


def ld(p):
    return np.asarray(Image.open(p).convert('RGB')).astype(float)


his = m.his(jid, N)
ref = ld(f'{D}/{jid}-ref{N}.png')
base = ld(f'{D}/{jid}-base{N}.png')
fin = ld(f'{D}/{jid}-{N}.png')
for name, a in (('his box', his), ('ref', ref), ('base', base), ('final', fin)):
    m.dump(a, x0, y0, x1, y1, name)
