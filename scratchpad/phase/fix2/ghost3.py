# Ghost colours: pixels that differ from the frame after the phase ended (same overlays, no light bodies).
import sys, json
from PIL import Image
import numpy as np
mode, frames, regions = sys.argv[1], [int(v) for v in sys.argv[2].split(',')], sys.argv[3:]
m = json.load(open(f'cap/{mode}/meta.json'))
base = np.asarray(Image.open(f'cap/{mode}/f{m["frames"]:03d}.png').convert('RGB')).astype(int)
for i in frames:
    im = np.asarray(Image.open(f'cap/{mode}/f{i:03d}.png').convert('RGB')).astype(int)
    for r in regions:
        x0, y0, x1, y1 = [int(v) for v in r.split(',')]
        reg = im[y0:y1, x0:x1]; bg = base[y0:y1, x0:x1]
        msk = np.abs(reg - bg).sum(-1) > 30
        px = reg[msk]
        if len(px) < 30: print(f'f{i:03d} {r}: -'); continue
        print(f'f{i:03d} {r}: n {msk.sum()} blue>green {(px[:,2]>px[:,1]).mean()*100:.0f}% mean {px.mean(0).round(0).astype(int).tolist()}')
