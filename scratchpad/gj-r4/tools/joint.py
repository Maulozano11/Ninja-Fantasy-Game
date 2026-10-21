# joint.py groupDir out.png [zoom]: tile frame i + head frame i side by side for all 8 frames (2 tiles + head), on his panel colour
import sys, json
from PIL import Image, ImageDraw
import numpy as np
stage, out = sys.argv[1], sys.argv[2]
z = int(sys.argv[3]) if len(sys.argv) > 3 else 4
man = json.load(open(stage + '/manifest.json'))['sprites']
t, h = man['stream'], man['stream_head']
T = Image.open(stage + '/stream.png').convert('RGBA'); Hh = Image.open(stage + '/stream_head.png').convert('RGBA')
n = t['anims']['fly']['frames']
W = 64 * 2 + h['frameW']
O = Image.new('RGB', (W * z, n * (64 * z + 4)), (0, 0, 0))
for i in range(n):
    B = Image.new('RGBA', (W, 64), (32, 32, 42, 255))
    tf = T.crop((i * 64, 0, i * 64 + 64, 64))
    B.alpha_composite(tf, (0, 0)); B.alpha_composite(tf, (64, 0))
    B.alpha_composite(Hh.crop((i * h['frameW'], 0, (i + 1) * h['frameW'], 64)), (128, 0))
    O.paste(B.convert('RGB').resize((W * z, 64 * z), Image.NEAREST), (0, i * (64 * z + 4)))
    d = ImageDraw.Draw(O); d.text((2, i * (64 * z + 4) + 2), str(i), fill=(255, 255, 0))
    d.line([(128 * z, i * (64 * z + 4)), (128 * z, i * (64 * z + 4) + 6)], fill=(0, 255, 255))
O.save(out)
# joint metric: rows where tile col 63 vs head col 0 differ by > 110 (premultiplied RGB sum abs), and the tile's own wrap
Ta = np.asarray(T).astype(float); Ha = np.asarray(Hh).astype(float)
def pm(a): return a[..., :3] * a[..., 3:] / 255
for i in range(n):
    tf = pm(Ta[:, i * 64:(i + 1) * 64]); hf = pm(Ha[:, i * h['frameW']:(i + 1) * h['frameW']])
    jd = np.abs(tf[:, 63] - hf[:, 0]).sum(-1); wd = np.abs(tf[:, 63] - tf[:, 0]).sum(-1)
    # vertical edges of >= 6 rows in head columns 0-30: a column x where |col x - col x-1| > 110 for a run of >= 6 rows
    edges = []
    for x in range(1, 31):
        dd = np.abs(hf[:, x] - hf[:, x - 1]).sum(-1) > 110
        run = best = 0
        for v in dd:
            run = run + 1 if v else 0; best = max(best, run)
        if best >= 6: edges.append((x, best))
    lum = (hf[..., :3] @ np.array([0.299, 0.587, 0.114])).mean()
    print(f'frame {i}: joint rows>110 {int((jd > 110).sum())}  tile wrap rows>110 {int((wd > 110).sum())}  head edges>=6rows {edges}  head mean lum {lum:.1f}')
