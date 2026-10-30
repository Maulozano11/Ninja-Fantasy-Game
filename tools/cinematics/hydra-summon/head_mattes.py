"""Mattes of the five cut heads lying in his dead-hydra picture v2 (1672x941), by their difference
with the battle backdrop (the floor of both is the same), one rectangle per head. The front head E
(the last one cut, it falls in the game) must carry none of its neighbours: the parts of C and D
inside its rectangle are taken out, its own horn tips that reach into theirs are given back to it,
and the loose floor and blood above it are dropped."""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
DEAD, BG, OUT = sys.argv[1:4]
A = np.array(Image.open(DEAD).convert('RGB')).astype(float)
Bg = np.array(Image.open(BG).convert('RGB')).astype(float)
d = ndimage.gaussian_filter(np.abs(A - Bg).mean(-1), 1.5)
R = {1: (540, 480, 165, 100), 2: (728, 476, 210, 104), 4: (546, 574, 256, 118), 8: (836, 574, 222, 116), 16: (630, 654, 316, 165)}
M = {}
for bit, (x, y, w, h) in R.items():
    m = np.zeros(A.shape[:2], bool)
    sub = ndimage.binary_opening(d[y:y + h, x:x + w] > 26, iterations=2)
    lab, n = ndimage.label(ndimage.binary_closing(sub, iterations=3))
    sz = ndimage.sum(sub, lab, range(1, n + 1))
    m[y:y + h, x:x + w] = ndimage.binary_fill_holes(ndimage.binary_closing(lab == 1 + np.argmax(sz), iterations=4))
    M[bit] = m
r, g, b = A[..., 0], A[..., 1], A[..., 2]
gold = (r - b > 55) & (r >= g) & (r > 90)
outline = ((r + g + b) < 110) & (r - np.maximum(g, b) < 20)
teal = (b - r > 6) & (g - r > 0)
others = M[4] | M[8]
# E without its neighbours, then its horn tips (gold and their outline, connected to it) back
e = M[16] & ~ndimage.binary_dilation(others, iterations=3)
lab, n = ndimage.label(ndimage.binary_opening(e, iterations=1))
sz = ndimage.sum(e, lab, range(1, n + 1))
e = lab == 1 + np.argmax(sz)
horn_zone = np.zeros_like(e)
horn_zone[652:712, 695:835] = True
near_gold = ndimage.binary_dilation(gold, iterations=2)
cand = horn_zone & (gold | (outline & near_gold))
lab, n = ndimage.label(cand | e)
keep = np.unique(lab[e])
e = np.isin(lab, keep[keep > 0]) & (cand | e)
# nothing of E above its horns but horn: drop floor and blood there
top = np.zeros_like(e)
top[:712] = True
e &= ~(top & ~(gold | (outline & near_gold) | teal))
lab, n = ndimage.label(e)
sz = ndimage.sum(e, lab, range(1, n + 1))
e = ndimage.binary_fill_holes(lab == 1 + np.argmax(sz))
# his tallest horn on E crosses in front of C's belly: that strip (traced by hand) is E's
from PIL import ImageDraw
_p = Image.new('L', (A.shape[1], A.shape[0]))
ImageDraw.Draw(_p).polygon([(778.5, 657.5), (782, 661), (746, 701), (731, 701), (731, 690)], fill=255)
e |= (np.array(_p) > 0) & (gold | outline | ((r > 120) & (r > b + 30)))
M[16] = e
eg = ndimage.binary_dilation(e, iterations=3)
M[4] &= ~eg
M[8] &= ~eg
# and any of C's or D's pixels that are E's horn (gold in the horn zone, cut off from C or D)
for bit in (4, 8):
    lab, n = ndimage.label(M[bit])
    sz = ndimage.sum(M[bit], lab, range(1, n + 1))
    M[bit] = lab == 1 + np.argmax(sz)
out = np.zeros(A.shape[:2], np.uint8)
for bit, m in M.items():
    out |= m.astype(np.uint8) * bit
np.save(OUT, out)
