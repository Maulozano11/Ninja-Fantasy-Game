import json, os, sys
import numpy as np
from PIL import Image
ART2 = sys.argv[1]
REF = Image.open(os.path.join(ART2, 'REF-genjutsu-set-owner.jpg')).convert('RGB')
G = os.path.join(ART2, 'staging', 'vfx_genjutsu_v3')
MAN = json.load(open(os.path.join(G, 'manifest.json')))['sprites']
RM = json.load(open(os.path.join(ART2, 'vfx-genjutsu-v3-refmap.json')))
BG = np.array([32, 32, 42.])
def lab(c):
    c = np.asarray(c, np.float64) / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    X = (c[..., 0] * 0.4124 + c[..., 1] * 0.3576 + c[..., 2] * 0.1805) / 0.95047
    Y = c[..., 0] * 0.2126 + c[..., 1] * 0.7152 + c[..., 2] * 0.0722
    Z = (c[..., 0] * 0.0193 + c[..., 1] * 0.1192 + c[..., 2] * 0.9505) / 1.08883
    f = lambda t: np.where(t > 0.008856, np.cbrt(t), 7.787 * t + 16 / 116)
    fx, fy, fz = f(X), f(Y), f(Z)
    return np.stack([116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)], -1)
KEY = {'hit': ('hit', 2), 'blast': ('blast', 3)}
for name, s in MAN.items():
    if name in ('beast', 'aura', 'aura_back') or name not in RM: continue
    an, i = KEY.get(name, ('idle' if 'idle' in s['anims'] else next(iter(s['anims'])), 0))
    a = s['anims'][an]
    sheet = Image.open(os.path.join(G, s['file'])).convert('RGBA')
    f = np.asarray(sheet.crop((i * s['frameW'], a['row'] * s['frameH'], (i + 1) * s['frameW'], (a['row'] + 1) * s['frameH'])), np.float64)
    W, H = s['frameW'], s['frameH']
    r = RM[name]; k = r['k']
    ox = r['origin'][0] - (s['anchor'][0] - r['anchor'][0]) / k
    oy = r['origin'][1] - (s['anchor'][1] - r['anchor'][1]) / k
    if r.get('tile'): continue
    his = np.asarray(REF.resize((W, H), Image.BOX, box=(ox, oy, ox + W / k, oy + H / k)), np.float64)
    A = f[..., 3:] / 255
    ours = f[..., :3] * A + BG * (1 - A)
    m = f[..., 3] > 200
    L1, L2 = lab(his[m]), lab(ours[m])
    d = np.sqrt(((L1 - L2) ** 2).sum(-1))
    c1 = np.hypot(L1[:, 1], L1[:, 2]); c2 = np.hypot(L2[:, 1], L2[:, 2])
    print('%-11s dE mean %5.1f  L his %5.1f ours %5.1f  chroma his %5.1f ours %5.1f' % (name, d.mean(), L1[:, 0].mean(), L2[:, 0].mean(), c1.mean(), c2.mean()))

print('--- local roughness (mean |L - median3x3(L)|) over opaque px')
from PIL import ImageFilter
for name, s in MAN.items():
    if name in ('beast', 'aura', 'aura_back') or name not in RM or RM[name].get('tile'): continue
    an, i = KEY.get(name, ('idle' if 'idle' in s['anims'] else next(iter(s['anims'])), 0))
    a = s['anims'][an]
    sheet = Image.open(os.path.join(G, s['file'])).convert('RGBA')
    f = np.asarray(sheet.crop((i * s['frameW'], a['row'] * s['frameH'], (i + 1) * s['frameW'], (a['row'] + 1) * s['frameH'])), np.float64)
    W, H = s['frameW'], s['frameH']
    r = RM[name]; k = r['k']
    ox = r['origin'][0] - (s['anchor'][0] - r['anchor'][0]) / k
    oy = r['origin'][1] - (s['anchor'][1] - r['anchor'][1]) / k
    his = np.asarray(REF.resize((W, H), Image.BOX, box=(ox, oy, ox + W / k, oy + H / k)), np.float64)
    A = f[..., 3:] / 255
    ours = f[..., :3] * A + BG * (1 - A)
    m = f[..., 3] > 200
    def rough(img):
        L = np.hypot(*np.moveaxis(lab(img)[..., 1:], -1, 0)) if os.environ.get("CH") else lab(img)[..., 0]
        Li = Image.fromarray(L.astype(np.float32), 'F')
        med = np.asarray(Li.filter(ImageFilter.MedianFilter(3)), np.float64)
        return np.abs(L - med)[m].mean()
    print('%-11s his %.2f ours %.2f' % (name, rough(his), rough(ours)))
