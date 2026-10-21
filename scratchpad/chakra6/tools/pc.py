import sys, json, numpy as np
from PIL import Image, ImageDraw
# usage: pc.py piecesdir name out x0,y0,x1,y1 scale piece1+piece2,piece3 ...  (each column = union of pieces)
d, name, out, box, scale = sys.argv[1], sys.argv[2], sys.argv[3], [int(v) for v in sys.argv[4].split(',')], int(sys.argv[5])
meta = json.load(open(f'{d}/{name}.json')); W, H = meta['w'], meta['h']
def load(n): return np.frombuffer(open(f'{d}/{name}-{n}.rgba', 'rb').read(), np.uint8).reshape(H, W, 4).astype(float)
x0, y0, x1, y1 = box
ims = []
for col in sys.argv[6:]:
    acc = np.zeros((H, W, 3)) + (28, 36, 48)
    for n in col.split('+'):
        a = load(n); A = a[..., 3:] / 255; acc = a[..., :3] * A + acc * (1 - A)
    im = Image.fromarray(acc[y0:y1, x0:x1].astype(np.uint8)).resize(((x1-x0)*scale, (y1-y0)*scale), Image.NEAREST)
    ims.append((col, im))
S = Image.new('RGB', (len(ims)*(ims[0][1].width+6), ims[0][1].height+14), (60, 60, 70)); dr = ImageDraw.Draw(S)
for i, (n, im) in enumerate(ims):
    S.paste(im, (i*(im.width+6), 14)); dr.text((i*(im.width+6)+2, 1), n, fill=(255, 255, 0))
# grid ticks every 10 px
S.save(out)
