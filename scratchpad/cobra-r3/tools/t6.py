import sys; sys.path.insert(0, sys.argv[1])
import numpy as np, io, contextlib
from pre import load
with contextlib.redirect_stdout(io.StringIO()):
    g = load("FRAMES = [")
C = g['C']
# his eye in each picture: from the EYE check logic
eyes = {}
for k in 'LR':
    c = C[k]
    h, s_, _ = g['hsv'](c['col'])
    head = c['upper'] | c['drips']
    cand = head & ((h >= 330) | (h < 30)) & (s_ > 0.15) & (c['col'] @ g['LUMA'] > 100)
    eye = min(g['components'](cand), key=lambda p: (p[:, 0].mean(), -len(p)))
    eyes[k] = np.array([eye[:, 1].mean(), eye[:, 0].mean()])
print('eyes', eyes, 'neck tops', {k: C[k]['P'][-1].round(1) for k in 'LR'})
specs = [('L','R',0.0,'L',(0,0)),('L','R',0.2,'L',(-2,-1)),('L','R',0.4,'L',(2,0)),('L','R',0.6,'L',(6,2)),('L','R',0.8,'R',(3,1)),('R','L',0.0,'R',(0,0)),('R','L',1/3,'L',(-1,-1)),('R','L',2/3,'L',(-1,0))]
prev = None
for i, (a, b, t, src, st) in enumerate(specs):
    base = C[a]['P'][-1] + (C[b]['P'][-1] - C[a]['P'][-1]) * t
    off = g['head_offset'](src, base, st)
    e = eyes[src] + off
    print(i, src, 'offset', off, 'eye', e.round(1), 'move', None if prev is None else (e - prev).round(1))
    prev = e
