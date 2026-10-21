import json, sys
import numpy as np
from PIL import Image
pre, sidep = sys.argv[1:3]
fr = np.load(pre + '-frames.npy'); N, H, W, _ = fr.shape
side = json.load(open(sidep)); S = side['scale']; AX, AY = side['oanchor']
ref = Image.open('../../art2/REF-earth-set-owner.jpg').convert('RGB')
R = np.asarray(ref).astype(np.float32)
BG = np.array([34, 34, 44], np.float32)
for k in (0, 5):
    tx, ty = side['keys'][str(k)]['torso']
    box = (tx - AX / S, ty - AY / S, tx + (W - AX) / S, ty + (H - AY) / S)
    his = np.asarray(ref.resize((W, H), Image.BOX, box=box)).astype(np.float32)
    m = (np.abs(R - BG).sum(2) > 12).astype(np.float32)
    # keep his half only
    xs = np.arange(R.shape[1])
    half = (xs < 1118) if k == 0 else (xs >= 1118)
    m *= half[None, :]
    m[:1549] = 0; m[1970:] = 0; m[:, :508] = 0; m[:, 1752:] = 0
    hcov = np.asarray(Image.fromarray(m, 'F').resize((W, H), Image.BOX, box=box))
    f = fr[k]; a = f[..., 3]
    ours = a == 255
    hs = hcov >= 0.5
    print(k, 'ours solid', ours.sum(), 'his >=0.5', hs.sum(), 'ours where his<0.25:', (ours & (hcov < 0.25)).sum(),
          'his>=0.75 where ours clear:', (hs & (hcov >= 0.75) & (a == 0)).sum())
    lum = f[..., :3].astype(float) @ [.3, .55, .15]
    # outline colour count
    cols, cnt = np.unique(f[ours][:, :3], axis=0, return_counts=True)
    dark = cols[(cols @ [.3, .55, .15]) < 32]
    print('  dark cols', dark.tolist())
    amb = (f[..., 0] > 150) & (f[..., 0] - f[..., 1] > 30) & (f[..., 2] < 100) & (np.arange(W)[None] > AX + 60) & ours
    print('  amber-ish px in head', amb.sum(), np.unique(f[amb][:, :3], axis=0).tolist())
