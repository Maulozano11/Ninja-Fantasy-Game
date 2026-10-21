# Blueness of the light bodies in a capture: each after-image's box (from the playback timing),
# pixels that changed from the frame before the click, red overlay lines left out.
import sys, json, math
import numpy as np
from PIL import Image
mode = sys.argv[1]
m = json.load(open(f'cap/{mode}/meta.json'))
cx, cy = m['clip']['x'], m['clip']['y']
step = m['step']
a = m.get('a'); b = m.get('b')
a = [float(v) for v in sys.argv[2].split(',')]; b = [float(v) for v in sys.argv[3].split(',')]
base = np.asarray(Image.open(f'cap/{mode}/f000.png').convert('RGB')).astype(int)
IN, DASH = 150, 300
T0 = int(sys.argv[4]) if len(sys.argv) > 4 else 90   # the beat before the phase
def dashk(ms):
    t = min(1, max(0, (ms - IN) / DASH)); return 1 - (1 - t) ** 2.2
for i in range(1, m['frames'] + 1):
    ms = i * step - T0
    im = np.asarray(Image.open(f'cap/{mode}/f{i:03d}.png').convert('RGB')).astype(int)
    out = []
    for j, kk in [(3, 0.27), (2, 0.46), (1, 0.65)]:
        t = ms - j * 48
        if t < IN or t >= IN + DASH: continue
        k = dashk(t)
        X = a[0] + (b[0] - a[0]) * k; Y = a[1] + (b[1] - a[1]) * k
        x0, x1 = int((X - cx - 14) * 2), int((X - cx + 14) * 2)
        y1 = int((Y - cy - 6) * 2); y0 = int((Y - cy - 58) * 2)
        x0, y0 = max(0, x0), max(0, y0)
        reg = im[y0:y1, x0:x1]; bg = base[y0:y1, x0:x1]
        if reg.size == 0: continue
        diff = np.abs(reg - bg).sum(-1) > 30
        red = (reg[..., 0] > reg[..., 2] + 30) & (reg[..., 0] > reg[..., 1] + 30)
        msk = diff & ~red
        if msk.sum() < 30: continue
        px = reg[msk]
        out.append(f'ghost{j}(k{kk}) n{msk.sum()} blue>green {(px[:,2] > px[:,1]).mean()*100:4.0f}% mean {px.mean(0).round(0).astype(int).tolist()}')
    if out: print(f'f{i:03d} {i*step}ms', ' | '.join(out))
