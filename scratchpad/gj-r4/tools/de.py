# de.py groupDir : mean Lab error of each key frame (on his panel colour) against his crop (box-resampled), over his art pixels
import sys, json
from PIL import Image
import numpy as np
S='/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad'
G = sys.argv[1]
man = json.load(open(G + '/manifest.json'))['sprites']
rmap = json.load(open(S + '/art2/vfx-genjutsu-v3-refmap.json'))
ref = Image.open(S + '/art2/REF-genjutsu-set-owner.jpg').convert('RGB')
def lab(rgb):
    c = rgb / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ M.T / np.array([0.95047, 1, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)
KEY = {'hit': ('hit', 3), 'blast': ('blast', 4)}
out = []
for n, s in man.items():
    if n not in rmap: continue
    rm = rmap[n]
    an, fi = KEY.get(n, ('idle' if 'idle' in s['anims'] else list(s['anims'])[0], 0))
    sh = Image.open(G + '/' + s['file']).convert('RGBA')
    fw, fh = s['frameW'], s['frameH']; r = s['anims'][an]['row']
    fr = np.asarray(sh.crop((fi * fw, r * fh, (fi + 1) * fw, (r + 1) * fh))).astype(float)
    room = (s['anchor'][0] - rm['anchor'][0], s['anchor'][1] - rm['anchor'][1])
    k = rm['k']; ox, oy = rm['origin']
    if rm.get('tile'):
        tx, tw = rm['tile']
        his = np.asarray(ref.resize((fw, fh), Image.BOX, box=(tx, oy, tx + tw, oy + fh / k))).astype(float)
    else:
        his = np.asarray(ref.resize((fw, fh), Image.BOX, box=(ox - room[0] / k, oy - room[1] / k, ox + (fw - room[0]) / k, oy + (fh - room[1]) / k))).astype(float)
    a = fr[..., 3:] / 255
    ob = fr[..., :3] * a + np.array([32, 32, 42.0]) * (1 - a)
    art = np.abs(his - np.array([32, 32, 42])).sum(-1) > 45
    dE = np.sqrt(((lab(his) - lab(ob)) ** 2).sum(-1))
    out.append('%-12s meanDE %5.2f  p90 %5.1f' % (n, dE[art].mean(), np.percentile(dE[art], 90)))
print('\n'.join(out))
