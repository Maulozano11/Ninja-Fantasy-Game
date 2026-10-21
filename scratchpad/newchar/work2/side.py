"""His crop (native, cape-free figure) beside the same region of the reduced reference, both scaled to
the same height.  python3 -I side.py name hx0 hy0 hx1 hy1 ox0 oy0 ox1 oy1 [H]"""
import os, sys
sys.path.insert(0, os.path.join(os.getcwd(), 'tools/refs'))
import importlib.util
import numpy as np
from PIL import Image

spec = importlib.util.spec_from_file_location('study', 'tools/refs/scarlet-study.py')
S = importlib.util.module_from_spec(spec)
spec.loader.exec_module(S)
R = S.R
D = os.path.dirname(os.path.abspath(__file__))
name = sys.argv[1]
hx0, hy0, hx1, hy1, ox0, oy0, ox1, oy1 = map(int, sys.argv[2:10])
Ht = int(sys.argv[10]) if len(sys.argv) > 10 else 600
N, Q, M, idx, part = S.build()
keep = np.zeros(Q.shape, bool)
for m in M.values():
    keep |= m
bg = np.array([236, 236, 240])
his = np.where(keep[..., None], N, bg)[hy0:hy1, hx0:hx1].astype(np.uint8)
bx, by = S.REDUCED_BOX[:2]
rgba = S.to_rgba(idx)[oy0 - by:oy1 - by, ox0 - bx:ox1 - bx].astype(float)
al = rgba[..., 3:4] / 255
ours = (rgba[..., :3] * al + bg * (1 - al)).astype(np.uint8)
a = Image.fromarray(his)
a = a.resize((round(a.width * Ht / a.height), Ht), Image.NEAREST)
b = Image.fromarray(ours)
b = b.resize((round(b.width * Ht / b.height), Ht), Image.NEAREST)
c = Image.new('RGB', (a.width + b.width + 20, Ht), (255, 255, 255))
c.paste(a, (0, 0))
c.paste(b, (a.width + 20, 0))
c.save(os.path.join(D, f's-{name}.png'))
