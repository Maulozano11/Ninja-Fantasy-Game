"""His eyes vs ours, tight crop at 16x: his picture | ours (render) | match map (green = his eye
pixel matched, red = eye pixel differs, light = other pixel matches, dark = other pixel differs)."""
import sys
sys.path.insert(0, 'tools/refs')
import numpy as np
import aiden_ref as R

D = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/aiden-parts/eyes/'
a = np.load(D + 'native.npy')
ours = np.fromfile(sys.argv[1], np.uint8).reshape(256, 256, 4).astype(np.int32)
x0, x1, y0, y1 = 45, 62, 16, 24
MAP = {(49, 19): ['sBBBb', 'LhLLL', 'swdis'], (56, 19): ['sBo', 'LLL', 'hdL']}
eye = np.zeros((y1 - y0, x1 - x0), bool)
for (ex, ey), rows in MAP.items():
    for r, row in enumerate(rows):
        for c, ch in enumerate(row):
            eye[ey + r - y0, ex + c - x0] = ch in 'BLhwdi'
h = a[y0:y1, x0:x1]
o = ours[y0 + 120:y1 + 120, x0 + 75:x1 + 75]
same = (o[..., 3] == 255) & (np.abs(o[..., :3] - h).max(-1) <= 3)
m = np.zeros_like(h)
m[same & eye] = (60, 200, 60)
m[~same & eye] = (220, 40, 40)
m[same & ~eye] = (230, 230, 230)
m[~same & ~eye] = (90, 90, 90)
ob = o[..., :3].copy()
ob[o[..., 3] == 0] = 255
sep = np.full((y1 - y0, 1, 3), 255)
R.save(np.concatenate([h, sep, ob, sep, m], axis=1), sys.argv[2], k=16)
print('eye pixels', int(eye.sum()), 'matched', int((same & eye).sum()), '; other pixels in the crop matched', int((same & ~eye).sum()), 'of', int((~eye).sum()))
