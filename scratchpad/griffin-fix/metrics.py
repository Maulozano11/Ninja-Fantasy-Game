"""metrics of f0 vs his picture: python3 metrics.py <ts> <dbgdir>"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from ts2png import load
fr, size, anc, pal = load(sys.argv[1])
his = np.asarray(Image.open(os.path.join(sys.argv[2], 'griffin-his-game.png')).convert('RGB')).astype(np.float32)
f0 = fr[0].astype(np.float32)
BG = np.array([32, 31, 39], np.float32)
hm = np.abs(his - BG).sum(-1) > 60
om = f0[..., 3] > 0
oo = f0[..., 3] == 255
print('his mask px', hm.sum(), 'ours any alpha', om.sum(), 'ours opaque', oo.sum())
print('IoU (any alpha vs his diff>60)', round((hm & om).sum() / (hm | om).sum(), 3))
print('ours outside his', int((om & ~hm).sum()), ' his outside ours', int((hm & ~om).sum()))
print('opaque outside his', int((oo & ~hm).sum()))
both = hm & oo
print('mean colour on shared: his', his[both].mean(0).round(1).tolist(), 'ours', f0[both][:, :3].mean(0).round(1).tolist())
L = np.array([0.3, 0.55, 0.15])
# near-black / brown dots outside mouth: px with r>g>b and luma<40
c = f0[..., :3]
dark_brown = oo & (c[..., 0] >= c[..., 2]) & ((c @ L) < 45)
ys, xs = np.nonzero(dark_brown)
print('dark brownish px (r>=b, luma<45):', list(zip(xs.tolist(), ys.tolist()))[:40])
