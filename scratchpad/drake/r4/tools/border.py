import sys, json, numpy as np
from PIL import Image
d = sys.argv[1]
m = json.load(open(f'{d}/manifest.json'))
bad = 0
for name, sp in m['sprites'].items():
    im = np.asarray(Image.open(f"{d}/{sp['file']}").convert('RGBA'))
    W, H = sp['frameW'], sp['frameH']
    mins = []
    for anim, a in sp['anims'].items():
        for i in range(a['frames']):
            f = im[a['row'] * H:(a['row'] + 1) * H, i * W:(i + 1) * W, 3]
            ys, xs = np.nonzero(f > 0)
            if not len(ys):
                continue
            mg = min(xs.min(), ys.min(), W - 1 - xs.max(), H - 1 - ys.max())
            mins.append(mg)
            if mg < 1:
                bad += 1
                print('TOUCH', name, anim, i)
    print(f'{name:10s} {W}x{H} min clear margin {min(mins)} px over {len(mins)} frames')
print('border check:', 'FAIL' if bad else 'PASS')
