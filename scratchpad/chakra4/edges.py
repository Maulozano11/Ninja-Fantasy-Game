"""Hard straight alpha edges that his key frame does not have: runs (> 6 px) of an alpha step of 96+
between neighbours, not within 1 px of such a step in the key frame (argv[4])."""
import json, os, sys
import numpy as np
from PIL import Image
stage, name, anim, keyf = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
m = json.load(open(os.path.join(stage, 'manifest.json')))['sprites'][name]
im = np.array(Image.open(os.path.join(stage, m['file'])).convert('RGBA')).astype(int)
fw, fh = m['frameW'], m['frameH']; a = m['anims'][anim]
F = [im[a['row'] * fh:(a['row'] + 1) * fh, i * fw:(i + 1) * fw, 3] for i in range(a['frames'])]
def edges(A):
    return np.abs(A[:-1, :-1] - A[1:, :-1]) >= 96, np.abs(A[:-1, :-1] - A[:-1, 1:]) >= 96
def dil(m):
    o = m.copy(); o[1:] |= m[:-1]; o[:-1] |= m[1:]; o[:, 1:] |= m[:, :-1]; o[:, :-1] |= m[:, 1:]; return o
def runs(mask):
    best = cnt = 0
    for row in mask:
        r = 0
        for v in row:
            r = r + 1 if v else 0
            if r == 7: cnt += 1
            best = max(best, r)
    return best, cnt
kh, kv = edges(F[keyf])
out = []
for i, A in enumerate(F):
    h, v = edges(A)
    bh, ch = runs(h & ~dil(kh)); bv, cv = runs((v & ~dil(kv)).T)
    out.append('%d:%d/%d' % (i, max(bh, bv), ch + cv))
print('new straight edges (frame:longest px/runs>6):', ' '.join(out))
