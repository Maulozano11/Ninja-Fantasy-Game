# chain.py <group> <out> [frame]: 3 stream tiles + head on his bg at 4x, above his strip (rescaled)
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
G2 = sys.argv[1]; out = sys.argv[2]; i = int(sys.argv[3]) if len(sys.argv) > 3 else 0
M = json.load(open(G2 + '/manifest.json'))['sprites']
def fr(n):
    s = M[n]; a = s['anims']['fly']; sh = Image.open(G2 + '/' + s['file']).convert('RGBA')
    return sh.crop((i * s['frameW'], a['row'] * s['frameH'], (i + 1) * s['frameW'], (a['row'] + 1) * s['frameH']))
t, h = fr('stream'), fr('stream_head')
W = 64 * 3 + h.width
c = Image.new('RGBA', (W, 64), HISBG + (255,))
for k in range(3): c.alpha_composite(t, (64 * k, 0))
c.alpha_composite(h, (192, 0))
k = 64 / 84
hs = REF.resize((W, 64), Image.LANCZOS, box=(588 - 3 * 84, 97 - 32 / k, 588 - 3 * 84 + W / k, 97 + 32 / k))
col([up(hs, 4), up(c.convert('RGB'), 4)]).save(out)
