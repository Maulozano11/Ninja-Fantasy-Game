import sys, os
import numpy as np
from PIL import Image
d, out = sys.argv[1], sys.argv[2]
names = sys.argv[3].split(',')
ADD = float(sys.argv[4]) if len(sys.argv) > 4 else 0.4
S = 3
ref = Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/phase-ref/owner-phase-ref.jpg').convert('RGB')
ground = np.asarray(Image.open('/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/phase-fix/src/assets/maps/river_forest/ground.webp').convert('RGB')).astype(float)
ims = [np.frombuffer(open(os.path.join(d, 'p' + n + '.raw'), 'rb').read(), dtype=np.uint8).reshape(256, 256, 4) for n in names]
ys, xs = np.where(np.any(np.stack([im[:, :, 3] for im in ims]) > 0, axis=0))
x0, x1, y0, y1 = xs.min() - 2, xs.max() + 3, ys.min() - 2, ys.max() + 3
w, h = x1 - x0, y1 - y0
grass = ground[800:800+h, 600:600+w]
print('grass mean', grass.reshape(-1,3).mean(0).round(0))
H = h * S
def comp(im, bg):
    c = im[y0:y1, x0:x1, :3].astype(float)
    a = im[y0:y1, x0:x1, 3:4].astype(float) / 255
    b = bg if isinstance(bg, np.ndarray) else np.ones_like(c) * np.array(bg, float)
    o = b * (1 - a) + c * a * (1 + ADD)
    return Image.fromarray(np.clip(o, 0, 255).astype(np.uint8)).resize((w * S, h * S), Image.NEAREST)
bgs = [(0, 0, 0), grass]
sheet = Image.new('RGB', (H + w * S * len(ims), H * 2), (0, 0, 0))
sheet.paste(ref.resize((H, H), Image.LANCZOS), (0, 0))
for r, bg in enumerate(bgs):
    for i, im in enumerate(ims):
        sheet.paste(comp(im, bg), (H + i * w * S, r * H))
sheet.save(out)
print(sheet.size)
