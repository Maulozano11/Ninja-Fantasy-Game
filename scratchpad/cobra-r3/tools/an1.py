import runpy, sys, pickle, numpy as np
from PIL import Image, ImageDraw
W = sys.argv[1]
sys.argv = ['x', '/home/user/Ninja-Fantasy-Game/docs/reference/poison-set-owner-reference.jpg', W + '/an.ts']
g = runpy.run_path('/home/user/Ninja-Fantasy-Game/tools/refs/cobra-from-ref.py', run_name='cobra')
C = g['C']; M = g['M']; TAIL_J = g['TAIL_J']
print('TAIL_J', TAIL_J, 'AX AY', g['AX'], g['AY'])
for k in 'LR':
    c = C[k]
    P = c['Pm']
    seg = np.hypot(*np.diff(P, axis=0).T)
    cum = np.concatenate([[0], np.cumsum(seg)])
    print(k, 'segm', c['segm'], 'tail len to TAIL_J', cum[TAIL_J])
    for i in range(0, 40, 2):
        print('  ', i, np.round(P[i], 1), round(cum[i], 1), 'w', round(c['wlm'][i], 1), round(c['wrm'][i], 1))
# big zoom of each key tail with spine
for fi, k in ((0, 'L'), (5, 'R')):
    f = g['fly'][fi]
    x0, y0, x1, y1 = 20, 50, 90, 110
    sc = 12
    b = Image.new('RGBA', (x1 - x0, y1 - y0), (31, 33, 46, 255))
    b.alpha_composite(Image.fromarray(f[y0:y1, x0:x1], 'RGBA'))
    img = b.convert('RGB').resize(((x1 - x0) * sc, (y1 - y0) * sc), Image.NEAREST)
    d = ImageDraw.Draw(img)
    P = C[k]['Pm']
    d.line([((p[0] - x0 + .5) * sc, (p[1] - y0 + .5) * sc) for p in P[:80]], fill=(255, 255, 255), width=1)
    for i in range(0, 80, 5):
        p = P[i]
        d.text(((p[0] - x0 + .5) * sc + 3, (p[1] - y0 + .5) * sc), str(i), fill=(255, 255, 0))
    for x in range(x0, x1, 5):
        d.line([((x - x0) * sc, 0), ((x - x0) * sc, 4)], fill=(255, 0, 0))
        d.text(((x - x0) * sc + 1, 4), str(x), fill=(255, 80, 80))
    for y in range(y0, y1, 5):
        d.text((1, (y - y0) * sc), str(y), fill=(255, 80, 80))
    img.save(f'{W}/z-key-tail-{k}.png')
with open(W + '/an1.pkl', 'wb') as fh:
    pickle.dump({k: {kk: C[k][kk] for kk in ('Pm', 'Nm', 'wlm', 'wrm', 'segm', 'coil_src', 'coil_col', 'P', 'lower')} for k in 'LR'}, fh)
