"""His dead hydra v2 with four of the five stumps burnt (the owner, 2026-10-30: the hydra dies when
its last head is cut, so four stumps were already sealed with fire and one is freshly cut). Each
of the four red stump faces is recoloured from his own pixels into char: dark where they were
dark, ember-orange where his flesh lines were light; the scales round it are his, untouched."""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
SRC, OUT = sys.argv[1], sys.argv[2]
a = np.array(Image.open(SRC).convert('RGB')).astype(np.float32)
YY, XX = np.mgrid[0:a.shape[0], 0:a.shape[1]]
FACES = [(970, 532, 14, 30), (1030, 558, 14, 30), (1083, 603, 18, 36), (1142, 678, 19, 42)]  # (cx, cy, rx, ry); the front one (1108, 787) stays raw
r, g, b = a[..., 0], a[..., 1], a[..., 2]
lum = a.mean(-1)
light = np.clip((np.minimum(g, b) - 70) / 110, 0, 1)  # his pale flesh lines
flesh = np.clip((r - np.maximum(g, b) - 10) / 40, 0, 1)  # his red
out = a.copy()
rng = np.random.default_rng(2)
crack = ndimage.gaussian_filter(rng.random(a.shape[:2]), 1.2)
crack = np.clip((crack - crack.mean()) / crack.std() * 0.5 + 0.2, 0, 1)
for cx, cy, rx, ry in FACES:
    d = ((XX - cx) / rx) ** 2 + ((YY - cy) / ry) ** 2
    m = np.clip((1.45 - d) / 0.3, 0, 1) * np.maximum(flesh, light * (d < 1.1))
    m = ndimage.gaussian_filter(m, 0.7)
    char = np.stack([14 + lum * 0.12, 11 + lum * 0.08, 10 + lum * 0.07], -1)
    emb = np.clip(light * 1.6 + (crack - 0.35) * 1.2 * (d < 0.8), 0, 1) * (d < 1.05)
    hot = np.array([255, 150, 40], np.float32) * (0.6 + 0.4 * light[..., None])
    col = hot * emb[..., None] + char * (1 - emb[..., None])
    out = out * (1 - m[..., None]) + col * m[..., None]
Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(OUT)
