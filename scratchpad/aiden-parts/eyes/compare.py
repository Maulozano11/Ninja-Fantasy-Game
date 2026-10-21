"""Compares the rendered face (valiant face + valiant eyes, idle 0) with his picture at OFFSET.

argv: render dir, job name, out png. Prints, for every cell of his eyes (MAP letters that are his
pixels) and every cell of the face box, whether our pixel equals his.
"""
import os
import sys

sys.path.insert(0, 'tools/refs')
import numpy as np

import aiden_ref as R

rdir, name, outpng = sys.argv[1], sys.argv[2], sys.argv[3]
spec = {}
exec(open('tools/refs/aiden-eyes-from-ref.py').read().split('FEATURES =')[0].split('import aiden_ref as R')[1], spec)
NEAR_AT, FAR_AT, MAP = spec['NEAR_AT'], spec['FAR_AT'], spec['MAP']
a = np.load('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/aiden-parts/eyes/native.npy')
ours = np.fromfile(os.path.join(rdir, name + '.rgba'), np.uint8).reshape(256, 256, 4).astype(np.int32)
ox, oy = R.OFFSET

bad = 0
total = 0
for nm, (x0, y0) in (('near', NEAR_AT), ('far', FAR_AT)):
    for r, row in enumerate(MAP[nm]):
        for c, ch in enumerate(row):
            x, y = x0 + c, y0 + r
            his = a[y, x]
            o = ours[y + oy, x + ox]
            same = o[3] == 255 and np.abs(o[:3] - his).max() <= 3
            if ch not in "BLhwdi":
                continue
            total += 1
            if not same:
                bad += 1
            print(nm, r, c, ch, '#%02x%02x%02x' % tuple(his), '#%02x%02x%02x' % tuple(o[:3]), 'ok' if same else 'DIFF')
print('eye cells', total, 'differ', bad)

# face box: his head rows 7..29, x 38..62
x0, x1, y0, y1 = 38, 63, 8, 30
hisbox = a[y0:y1, x0:x1]
ourbox = ours[y0 + oy:y1 + oy, x0 + ox:x1 + ox]
diff = np.zeros_like(hisbox)
eye = np.zeros(hisbox.shape[:2], bool)
for nm, (ex, ey) in (('near', NEAR_AT), ('far', FAR_AT)):
    for r, row in enumerate(MAP[nm]):
        for c, ch in enumerate(row):
            eye[ey + r - y0, ex + c - x0] = ch in "BLhwdi"
for y in range(y1 - y0):
    for x in range(x1 - x0):
        o = ourbox[y, x]
        same = o[3] == 255 and np.abs(o[:3] - hisbox[y, x]).max() <= 3
        diff[y, x] = (60, 200, 60) if same and eye[y, x] else (230, 230, 230) if same else (220, 40, 40) if eye[y, x] else (90, 90, 90)
ob = ourbox[..., :3].copy()
ob[ourbox[..., 3] == 0] = 255
sep = np.full((y1 - y0, 1, 3), 255)
R.save(np.concatenate([hisbox, sep, ob, sep, diff], axis=1), outpng, k=8)
