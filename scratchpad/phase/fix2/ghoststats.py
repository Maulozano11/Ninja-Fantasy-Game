import sys, json
import numpy as np
from PIL import Image
mode = sys.argv[1]
m = json.load(open(f'cap/{mode}/meta.json'))
cx, cy = m['clip']['x'], m['clip']['y']
base = np.asarray(Image.open(f'cap/{mode}/f000.png').convert('RGB')).astype(int)
for i in range(1, m['frames'] + 1):
    im = np.asarray(Image.open(f'cap/{mode}/f{i:03d}.png').convert('RGB')).astype(int)
    diff = np.abs(im - base).sum(-1) > 40
    # columns split into thirds of the travel: report each band
    ys, xs = np.where(diff)
    if len(xs) < 50: continue
    px = im[diff]
    blue = (px[:,2] > px[:,1]).mean()*100
    print(f'f{i:03d} {i*m["step"]:4d}ms changed {diff.sum():6d} blue>green {blue:5.1f}% mean {px.mean(0).round(0)}')
