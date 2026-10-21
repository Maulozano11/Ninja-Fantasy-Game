import base64, json, re, sys
import numpy as np
from PIL import Image
src = open(sys.argv[1]).read()
ref = json.loads(re.search(r'export const EV3_REF: Record<string, EarthRef> = (\{.*\});', src, re.S).group(1))
G = sys.argv[2]
man = json.load(open(G + '/manifest.json'))['sprites']
KEY = {'hit': ('hit', 2), 'blast': ('blast', 3)}
for name, r in ref.items():
    pal = np.array([[int(p['rgba'][i:i + 2], 16) for i in (1, 3, 5, 7)] for p in r['pal']])
    kinds = [p['kind'] for p in r['pal']]
    img = np.zeros((r['h'], r['w']), np.int32)
    order = sorted([k for k in r['pieces'] if k != 'under'], key=lambda k: 0 if k in ('shade', 'dust') else 1)
    for pn in order:
        pc = r['pieces'][pn]
        b = base64.b64decode(pc['rle'])
        flat = []
        for i in range(0, len(b), 2):
            flat += [b[i + 1]] * b[i]
        a = np.array(flat).reshape(pc['h'], pc['w'])
        sub = img[pc['y']:pc['y'] + pc['h'], pc['x']:pc['x'] + pc['w']]
        soft = lambda v: kinds[v - 1] in ('dust', 'shade') if v else False
        for (y, x), v in np.ndenumerate(a):
            if v and not (soft(v) and sub[y, x] and not soft(sub[y, x])):
                sub[y, x] = v
    rgba = np.zeros((r['h'], r['w'], 4), np.uint8)
    rgba[img > 0] = pal[img[img > 0] - 1]
    m = man[name]
    anims = m['anims']
    a, i = ('idle', 0) if 'idle' in anims and 'rise' in anims else KEY.get(name, (list(anims)[0], 0))
    sheet = np.asarray(Image.open(G + '/' + m['file']).convert('RGBA'))
    fw, fh = m['frameW'], m['frameH']
    f = sheet[anims[a]['row'] * fh:(anims[a]['row'] + 1) * fh, i * fw:(i + 1) * fw]
    # place his key frame into our frame by the anchors
    dx = m['anchor'][0] - r['anchor'][0]
    dy = m['anchor'][1] - r['anchor'][1]
    big = np.zeros((fh, fw, 4), np.uint8)
    ys, xs = np.nonzero(rgba[..., 3])
    lost = 0
    for y, x in zip(ys, xs):
        if 0 <= y + dy < fh and 0 <= x + dx < fw:
            big[y + dy, x + dx] = rgba[y, x]
        else:
            lost += 1
    diff = (np.abs(big.astype(int) - f.astype(int)).sum(-1) > 0).sum()
    extra = ''
    if name == 'stream':
        extra = ' (tile: seam-closed loop of his row)'
    print('%-12s %-6s frame %d: %s%s' % (name, a, i, 'identical to his key frame' if diff == 0 and lost == 0 else '%d px differ, %d lost' % (diff, lost), extra))
    if name == 'stream' and diff:
        pass
