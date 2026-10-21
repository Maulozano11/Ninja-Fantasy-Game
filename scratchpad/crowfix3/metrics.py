import sys
import numpy as np
sys.path.insert(0, '.')
from decode import load
size, anchor, frames = load(sys.argv[1])
print('size', size, 'anchor', anchor)
L = np.array([0.3, 0.55, 0.15])
for anim, fr in frames.items():
    light = []; opq = []
    for f in fr:
        a = f[..., 3] / 255.0
        lu = f[..., :3] @ L
        light.append(float((a * lu).sum()))
        opq.append(int((f[..., 3] > 0).sum()))
    n = len(fr)
    ratios = [light[(i + 1) % n] / light[i] for i in range(n)] if anim == 'fly' else [light[i + 1] / light[i] for i in range(n - 1)]
    mean_ab = [round(l / (size[0] * size[1]), 2) for l in light]
    print(anim, 'opaque', opq)
    print(anim, 'mean alpha*luma', mean_ab, 'ratios', [round(r, 2) for r in ratios])
    # mean brightness of covered pixels
    print(anim, 'mean luma of covered', [round(light[i] / max(1, (fr[i][..., 3] > 0).sum()), 1) for i in range(n)])
