"""aura_back + character + aura per frame, plus a check: pixels inside the glow where both layers are clear."""
import json, sys
import numpy as np
from PIL import Image
stage, out = sys.argv[1], sys.argv[2]
man = json.load(open(stage + '/manifest.json'))['sprites']
def frames(n):
    m = man[n]; im = np.array(Image.open(stage + '/' + m['file']).convert('RGBA')).astype(float)
    a = m['anims']['idle']; return [im[a['row'] * m['frameH']:(a['row'] + 1) * m['frameH'], i * m['frameW']:(i + 1) * m['frameW']] for i in range(a['frames'])], m
B, mb = frames('aura_back'); Fr, mf = frames('aura')
ch = np.array(Image.open('char.png').convert('RGBA')).astype(float)
ax, ay = mb['anchor']; fx, fy = 64, 120
def over(dst, src):
    a = src[..., 3:4] / 255; dst[..., :3] = src[..., :3] * a + dst[..., :3] * (1 - a); return dst
tiles = []; holes = []
glow0 = (B[0][..., 3] > 0) | (Fr[0][..., 3] > 0)
for i in range(len(B)):
    c = np.zeros(B[i].shape[:2] + (4,)); c[..., :3] = [21, 21, 29]
    over(c, B[i])
    cc = np.zeros_like(c); x0, y0 = ax - fx, ay - fy
    H, W = ch.shape[:2]
    for y in range(H):
        for x in range(W):
            X, Y = x + x0, y + y0
            if 0 <= X < c.shape[1] and 0 <= Y < c.shape[0] and ch[y, x, 3] > 0: cc[Y, X] = ch[y, x]
    over(c, cc); over(c, Fr[i])
    both = (B[i][..., 3] == 0) & (Fr[i][..., 3] == 0)
    # inside the glow: all 4 neighbours have some alpha in either layer
    al = (B[i][..., 3] > 0) | (Fr[i][..., 3] > 0)
    inner = np.zeros_like(both); inner[1:-1, 1:-1] = both[1:-1, 1:-1] & al[:-2, 1:-1] & al[2:, 1:-1] & al[1:-1, :-2] & al[1:-1, 2:]
    holes.append(int(inner[ay - 14:, :].sum()))
    tiles.append(np.kron(c[ay - 22:ay + 14, 10:80, :3], np.ones((6, 6, 1))))
    tiles.append(np.full((tiles[-1].shape[0], 4, 3), 200.))
print('feet holes (both layers clear inside the glow, ring area) per frame:', holes)
Image.fromarray(np.concatenate(tiles[:8], 1).astype(np.uint8)).save(out)
