# Reference + phase bodies over black, over grass, and as after-images (k) over grass, at S x.
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from PIL import Image
from comp import composite
d, out = sys.argv[1], sys.argv[2]
names = sys.argv[3].split(',')
ks = [float(x) for x in (sys.argv[4] if len(sys.argv) > 4 else '1,0.46,0.27').split(',')]
S = 3
ref = Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/phase-ref/owner-phase-ref.jpg').convert('RGB')
ground = np.asarray(Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/phase-fix/src/assets/maps/river_forest/ground.webp').convert('RGB')).astype(float)
ims = [np.frombuffer(open(os.path.join(d, 'p' + n + '.raw'), 'rb').read(), dtype=np.uint8).reshape(256, 256, 4) for n in names]
ys, xs = np.where(np.any(np.stack([im[:, :, 3] for im in ims]) > 0, axis=0))
x0, x1, y0, y1 = xs.min() - 2, xs.max() + 3, ys.min() - 2, ys.max() + 3
w, h = x1 - x0, y1 - y0
grass = ground[800:800+h, 600:600+w]
rows = [('black', np.zeros((h, w, 3)), 1.0)] + [('grass', grass, k) for k in ks]
H = h * S
sheet = Image.new('RGB', (H + w * S * len(ims), H * len(rows)), (0, 0, 0))
sheet.paste(ref.resize((H, H), Image.LANCZOS), (0, 0))
for r, (nm, bg, k) in enumerate(rows):
    for i, im in enumerate(ims):
        body = im[y0:y1, x0:x1]
        o = composite(body, bg, k=k, hue=min(1, 4 * k))
        sheet.paste(Image.fromarray(o.astype(np.uint8)).resize((w * S, h * S), Image.NEAREST), (H + i * w * S, r * H))
sheet.save(out)
print(sheet.size)
