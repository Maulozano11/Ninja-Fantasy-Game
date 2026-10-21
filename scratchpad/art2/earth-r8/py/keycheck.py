"""keycheck.py <refdata.ts> <group>: each built key frame against his extracted key frame (refdata
pieces composited, 'under' only where nothing else is), aligned by anchors. Prints differing px."""
import base64, json, re, sys
import numpy as np
from PIL import Image
src = open(sys.argv[1]).read()
REF = json.loads(re.search(r'export const EV3_REF: Record<string, EarthRef> = (\{.*\});', src, re.S).group(1))
G = sys.argv[2]
MAN = json.load(open(G + '/manifest.json'))['sprites']
KEY = {'hit': ('hit', 3), 'multi_hit': ('hit', 3), 'blast': ('blast', 4)}
def dec(r, pc):
    a = np.zeros((r['h'], r['w']), np.int32); b = base64.b64decode(pc['rle']); i = 0
    for k in range(0, len(b) - 1, 2):
        n, v = b[k], b[k + 1]
        if v:
            for j in range(n):
                a[pc['y'] + (i + j) // pc['w'], pc['x'] + (i + j) % pc['w']] = v
        i += n
    return a
for name, r in REF.items():
    m = MAN[name]
    pal = np.array([[int(p['rgba'][1 + 2 * i:3 + 2 * i], 16) for i in range(4)] for p in r['pal']])
    idx = np.zeros((r['h'], r['w']), np.int32)
    for pn, pc in r['pieces'].items():
        if pn == 'under':
            continue
        a = dec(r, pc); idx = np.where(a > 0, a, idx)
    if 'under' in r['pieces']:
        a = dec(r, r['pieces']['under']); idx = np.where((idx == 0) & (a > 0), a, idx)
    exp = np.zeros((r['h'], r['w'], 4), np.uint8); on = idx > 0; exp[on] = pal[idx[on] - 1]
    an, fi = KEY.get(name, ('idle' if 'idle' in m['anims'] else 'fly', 0))
    d = m['anims'][an]
    sheet = np.asarray(Image.open(G + '/' + m['file']).convert('RGBA'))
    W, H = m['frameW'], m['frameH']
    f = sheet[d['row'] * H:(d['row'] + 1) * H, fi * W:(fi + 1) * W]
    ox, oy = m['anchor'][0] - r['anchor'][0], m['anchor'][1] - r['anchor'][1]
    big = np.zeros((H + 400, W + 400, 4), np.uint8)
    big[200 + oy:200 + oy + r['h'], 200 + ox:200 + ox + r['w']] = exp
    e2 = big[200:200 + H, 200:200 + W]
    lost = big.copy(); lost[200:200 + H, 200:200 + W] = 0
    diff = (e2 != f).any(-1)
    if name == 'stream_head':
        diff[:, :m['anchor'][0]] = False   # (its first columns are the last tile's, by design)
    print('%-11s %s %s[%d]  differing px: %d  (ref px outside the frame: %d)' % (name, m['frameW'], an, fi, int(diff.sum()), int((lost[..., 3] > 0).sum())))
