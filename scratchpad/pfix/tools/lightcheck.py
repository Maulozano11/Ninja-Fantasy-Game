"""lightcheck.py <stageGroupDir> <srcDir> : his green excess vs ours on the blast key frame (frame 4), outside his character/shadow mask, where ours is light (not opaque)."""
import sys, json, os
import numpy as np
from PIL import Image
G, SRC = sys.argv[1:3]
m = json.load(open(os.path.join(G, 'manifest.json')))['sprites']['blast']
sh = np.asarray(Image.open(os.path.join(G, m['file'])).convert('RGBA')).astype(float)
fw, fh = m['frameW'], m['frameH']
k = int(sys.argv[3]) if len(sys.argv) > 3 else 4
f = sh[:fh, k * fw:(k + 1) * fw]
BG = np.array([31, 33, 46.])
comp = f[..., :3] * f[..., 3:] / 255 + BG * (1 - f[..., 3:] / 255)
his = np.asarray(Image.open(os.path.join(SRC, 'his-blast.png')).convert('RGB')).astype(float)
mask = np.asarray(Image.open(os.path.join(SRC, 'mask-blast.png'))) > 0
H = min(his.shape[0], comp.shape[0]); W = min(his.shape[1], comp.shape[1])
lightonly = (f[..., 3] < 250) & (f[..., 3] > 0)
# right of the pool / pillar only, inside his panel (his x <= 579)
rm = json.load(open(os.path.join(SRC, 'refmap.json')))['blast']
x0 = rm['box'][0]
panel = np.zeros(f.shape[:2], bool)
xs = x0 + np.arange(f.shape[1]) * (rm['box'][2] - rm['box'][0]) / f.shape[1]
panel[:, xs <= 579] = True
zone = np.asarray(Image.open(os.path.join(SRC, 'zone-blast.png'))) > 0
sel = lightonly & ~mask & panel & zone
ge_o = comp[..., 1] - 33
ge_h = his[..., 1] - 33
d = np.abs(ge_o - ge_h)[sel]
print('light px compared', sel.sum(), 'mean |green excess diff|', round(d.mean(), 2), 'p90', round(np.percentile(d, 90), 1))
# by region
for nm, (a, b) in {'x<170': (0, 170), '170-210': (170, 210), '210-250': (210, 250), '>250': (250, 999)}.items():
    s2 = sel.copy(); s2[:, :a] = False; s2[:, b:] = False
    if s2.sum(): print('  ', nm, s2.sum(), round(np.abs(ge_o - ge_h)[s2].mean(), 2), 'ours', round(ge_o[s2].mean(), 1), 'his', round(ge_h[s2].mean(), 1))
