import json, sys, numpy as np
from PIL import Image
G, name = sys.argv[1], sys.argv[2]
x0, x1 = int(sys.argv[3]), int(sys.argv[4])
man = json.load(open(G + '/manifest.json'))['sprites'][name]
sh = np.asarray(Image.open(G + '/' + man['file']).convert('RGBA')).astype(int)
fw, fh = man['frameW'], man['frameH']; r = man['anims']['rise']['row']
for i in range(2, 9):
    f = sh[r * fh:(r + 1) * fh, i * fw:(i + 1) * fw]
    # slime: greenish opaque pixels
    sl = (f[..., 3] >= 200) & (f[..., 1] > f[..., 0] + 30) & (f[..., 1] > f[..., 2] + 30)
    tops = []
    for x in range(x0, x1):
        ys = np.nonzero(sl[:, x])[0]
        tops.append(ys.min() if len(ys) else -1)
    t = np.array(tops); ok = t >= 0; xs = np.arange(x0, x1)[ok]; ts = t[ok]
    A = np.vstack([xs, np.ones_like(xs)]).T; c = np.linalg.lstsq(A, ts, rcond=None)[0]
    dev = np.abs(ts - A @ c).mean()
    run = best = 1
    for k in range(1, len(ts)):
        run = run + 1 if ts[k] == ts[k - 1] else 1; best = max(best, run)
    print('rise %d: top rows span %d px, line-fit deviation %.1f px, longest flat run %d px' % (i, ts.max() - ts.min(), dev, best))
