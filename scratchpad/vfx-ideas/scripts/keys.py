# Quick look: renders one row's key frames side by side at 1x (for checking placement).
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mockups
from vfxlib import *
n, row = int(sys.argv[1]), int(sys.argv[2])
a = mockups.ABIL[n]()
r = a['rows'][row]
sc = r['scene']
ts = [int(x) for x in sys.argv[3].split(',')] if len(sys.argv) > 3 else [t for t, _ in r['keys']]
fr = [sc.render(t) for t in ts]
w, h = fr[0].size
out = Image.new('RGB', (w * len(fr) + 4 * (len(fr) - 1), h), (0, 0, 0))
for i, f in enumerate(fr):
    out.paste(f, (i * (w + 4), 0))
k = int(sys.argv[4]) if len(sys.argv) > 4 else 1
out = out.resize((out.width * k, out.height * k), Image.NEAREST)
out.save(f'{os.path.dirname(os.path.abspath(__file__))}/tmp/keys_{n}_{row}.png')
print(out.size)
