# kcheck.py <staging group dir>  -- per frame: enclosed clear pockets (dead holes), isolated single
# pixels (salt and pepper), and the seams impact->sustain, sustain loop, sustain->fade (mean abs diff).
import sys, json
import numpy as np
from PIL import Image
d = sys.argv[1]
man = json.load(open(d + '/manifest.json'))['sprites']

def frames(name, anim):
    s = man[name]
    im = np.asarray(Image.open(d + '/' + s['file']).convert('RGBA')).astype(int)
    fw, fh, r, n = s['frameW'], s['frameH'], s['anims'][anim]['row'], s['anims'][anim]['frames']
    return [im[r * fh:(r + 1) * fh, i * fw:(i + 1) * fw] for i in range(n)]

def shift(m, dx, dy):
    o = np.zeros_like(m)
    H, W = m.shape
    o[max(0, dy):H + min(0, dy), max(0, dx):W + min(0, dx)] = m[max(0, -dy):H + min(0, -dy), max(0, -dx):W + min(0, -dx)]
    return o

def holes(a):
    on = a[..., 3] > 0
    # Clear pixels whose four neighbours are all opaque, and 2x2 clear blocks ringed by opaque.
    n4 = shift(on, 1, 0) & shift(on, -1, 0) & shift(on, 0, 1) & shift(on, 0, -1)
    pin = ~on & n4
    return int(pin.sum())

def specks(a):
    on = a[..., 3] > 0
    n8 = sum(shift(on, dx, dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if dx or dy)
    return int((on & (n8 == 0)).sum())

def diff(a, b):
    return float(np.abs(a.astype(int) - b.astype(int)).mean())

for name in man:
    print(name)
    for anim in man[name]['anims']:
        fr = frames(name, anim)
        h = [holes(f) for f in fr]
        s = [specks(f) for f in fr]
        steps = [round(diff(fr[i], fr[i + 1]), 1) for i in range(len(fr) - 1)]
        print(f'  {anim:8s} pinholes {h}  lone px {s}  step diff {steps}')
    imp, sus, fad = frames(name, 'impact'), frames(name, 'sustain'), frames(name, 'fade')
    print(f'  seams: impact7->sustain0 {diff(imp[-1], sus[0]):.1f}  sustain11->sustain0 {diff(sus[-1], sus[0]):.1f}  sustain11->fade0 {diff(sus[-1], fad[0]):.1f}  (typical sustain step {np.mean([diff(sus[i], sus[i+1]) for i in range(11)]):.1f})')
