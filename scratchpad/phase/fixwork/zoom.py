import sys, os
import numpy as np
from PIL import Image
d, out = sys.argv[1], sys.argv[2]
names = sys.argv[3].split(',')
S = int(sys.argv[4]) if len(sys.argv) > 4 else 5
ims = [np.frombuffer(open(os.path.join(d, n + '.raw'), 'rb').read(), dtype=np.uint8).reshape(256, 256, 4) for n in names]
ys, xs = np.where(np.any(np.stack([im[:, :, 3] for im in ims]) > 0, axis=0))
x0, x1, y0, y1 = xs.min() - 2, xs.max() + 3, ys.min() - 2, ys.max() + 3
w, h = x1-x0, y1-y0
sheet = Image.new('RGB', (w*S*len(ims), h*S))
for i, (n, im) in enumerate(zip(names, ims)):
    c = im[y0:y1, x0:x1, :3].astype(float); a = im[y0:y1, x0:x1, 3:4].astype(float)/255
    o = c*a*(1.4 if n.startswith('p') else 1) + (1-a)*np.array([0,0,0] if n.startswith('p') else [40,40,40])
    sheet.paste(Image.fromarray(np.clip(o,0,255).astype(np.uint8)).resize((w*S,h*S), Image.NEAREST), (i*w*S, 0))
sheet.save(out); print(sheet.size)
