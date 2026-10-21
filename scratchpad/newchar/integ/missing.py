"""List reference pixels whose colour differs in our render inside a box, with their part.
python3 -I missing.py <repo> <render.png> x0 y0 x1 y1"""
import sys
import os
repo, ren = sys.argv[1:3]
x0, y0, x1, y1 = map(int, sys.argv[3:7])
sys.path.insert(0, os.path.join(repo, 'tools/refs'))
os.chdir(repo)
import numpy as np
from PIL import Image
import scarlet_ref as S

red = S.reduced()
ours = np.asarray(Image.open(ren).convert('RGBA'))
parts = S.reduced_parts()
hx = lambda p: '#%02x%02x%02x' % tuple(p[:3]) if p[3] else '----'
for y in range(y0, y1):
    for x in range(x0, x1):
        if red[y, x, 3] and (not ours[y, x, 3] or tuple(red[y, x, :3]) != tuple(ours[y, x, :3])):
            part = [n for n, m in parts.items() if m[y, x]]
            print(x, y, hx(red[y, x]), '->', hx(ours[y, x]), part)
