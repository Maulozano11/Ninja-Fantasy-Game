import sys; sys.path.insert(0, '.')
from partial import run
import numpy as np
from PIL import Image
g = run('if FAILS:\n    raise SystemExit')
frames, solids, pieces = g['frames'], g['solids'], g['pieces_at']
tiles = []
for k in [0, 1, 2, 6, 7]:
    so = solids[k]; g_ = pieces[k]
    wing = ((g_['near'] > 0) | (g_['far'] > 0)) & ~(g_['body'] > 0) | (g_['near'] > 0)
    f = frames[k]
    b = Image.new('RGBA', (f.shape[1], f.shape[0]), (32, 31, 39, 255)); b.alpha_composite(Image.fromarray(f, 'RGBA'))
    a = np.asarray(b.convert('RGB')).copy()
    for oy, ox, horiz in ((-1, 0, True), (1, 0, True), (0, -1, False), (0, 1, False)):
        e = so & ~np.roll(np.roll(so, -oy, 0), -ox, 1) & wing
        L = e if horiz else e.T
        for yi, row in enumerate(L):
            run_ = 0
            for xi, v in enumerate(row):
                run_ = run_ + 1 if v else 0
                if run_ >= 9:
                    for q in range(run_):
                        if horiz: a[yi, xi - q] = (255, 0, 0)
                        else: a[xi - q, yi] = (255, 0, 255)
                    if run_ >= 9: print(k, 'horiz' if horiz else 'vert', (oy, ox), 'at', (xi, yi) if horiz else (yi, xi), 'run', run_)
    im = Image.fromarray(a).crop((0, 0, 110, 80))
    tiles.append(im.resize((im.width * 5, im.height * 5), Image.NEAREST))
o = Image.new('RGB', (sum(t.width + 6 for t in tiles[:3]), tiles[0].height * 2 + 6), (255, 0, 255))
for i, t in enumerate(tiles):
    o.paste(t, ((i % 3) * (t.width + 6), (i // 3) * (t.height + 6)))
o.save(sys.argv[1] if len(sys.argv) > 1 else 'runs.png')
