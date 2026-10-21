# Quick look: every row's key frames of one ability, stacked, at 1x, with the times written in.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mockups, vfxlib
vfxlib.STILL[0] = True
from vfxlib import *
n = int(sys.argv[1])
a = mockups.ABIL[n]()
rows = []
for r in a['rows']:
    sc = r['scene']
    fr = []
    for t, _ in r['keys']:
        im = sc.render(t).convert('RGB')
        ImageDraw.Draw(im).text((4, 4), sc.label(t), font=font(16, True), fill=(255, 230, 120))
        fr.append(im)
    w, h = fr[0].size
    row = Image.new('RGB', (w * len(fr) + 4 * (len(fr) - 1), h), (0, 0, 0))
    for i, f in enumerate(fr):
        row.paste(f, (i * (w + 4), 0))
    rows.append(row)
W = max(r.width for r in rows)
out = Image.new('RGB', (W, sum(r.height + 6 for r in rows)), (0, 0, 0))
y = 0
for r in rows:
    out.paste(r, (0, y)); y += r.height + 6
k = float(sys.argv[2]) if len(sys.argv) > 2 else 1
if k != 1:
    out = out.resize((int(out.width * k), int(out.height * k)), Image.NEAREST if k > 1 else Image.LANCZOS)
out.save(f'{os.path.dirname(os.path.abspath(__file__))}/look/k{n}.png')
print(out.size)
