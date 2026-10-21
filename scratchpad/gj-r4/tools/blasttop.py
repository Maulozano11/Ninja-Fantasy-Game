import sys, json
from PIL import Image
import numpy as np
stage = sys.argv[1]
man = json.load(open(stage + '/manifest.json'))['sprites']['blast']
fw, fh = man['frameW'], man['frameH']
im = np.asarray(Image.open(stage + '/blast.png').convert('RGBA')).astype(int)
amin = int(sys.argv[2]) if len(sys.argv) > 2 else 1
def tops(i, ymin=0):
    f = im[0:fh, i * fw:(i + 1) * fw, 3]
    return [next((y for y in range(ymin, fh) if f[y, x] >= amin), -1) for x in range(fw)]
t4 = tops(4, 85)
for i in range(7, 16):
    t = tops(i, 85)   # below the feathers/bits band: the pool's back and the column stubs
    runs = []; x = 20
    while x <= 250:
        j = x
        while j + 1 <= 250 and t[j + 1] == t[x]: j += 1
        if j - x + 1 >= 5 and t[x] > 85: runs.append((x, j, t[x]))
        x = j + 1
    print(i, 'runs>=5 (x0,x1,y):', runs[:12])
