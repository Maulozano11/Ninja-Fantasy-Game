import json, os, sys
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from holes import label4
G, name, anim, out = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
frames_ = [int(v) for v in sys.argv[5].split(',')]
crop = tuple(int(v) for v in sys.argv[6].split(',')) if len(sys.argv) > 6 else None
K = 4
man = json.load(open(os.path.join(G, 'manifest.json')))['sprites'][name]
a = man['anims'][anim]
sheet = np.asarray(Image.open(os.path.join(G, man['file'])).convert('RGBA'))
tiles = []
for i in frames_:
    f = sheet[a['row'] * man['frameH']:(a['row'] + 1) * man['frameH'], i * man['frameW']:(i + 1) * man['frameW']]
    op = f[..., 3] < 128
    lab, n = label4(op)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])).tolist())
    enc = op & ~np.isin(lab, list(border))
    bg = np.zeros(f.shape[:2] + (3,), np.float64) + (21, 21, 29)
    al = f[..., 3:4] / 255.0
    comp = f[..., :3] * al + bg * (1 - al)
    comp[enc] = (255, 0, 255)
    im = Image.fromarray(comp.astype(np.uint8))
    if crop: im = im.crop(crop)
    im = im.resize((im.width * K, im.height * K), Image.NEAREST)
    d = ImageDraw.Draw(im); d.text((3, 3), f'f{i} enc {int(enc.sum())}', fill=(255, 80, 80))
    tiles.append(im)
W = sum(t.width for t in tiles) + 4 * (len(tiles) - 1)
can = Image.new('RGB', (W, max(t.height for t in tiles)), (0, 0, 0))
x = 0
for t in tiles:
    can.paste(t, (x, 0)); x += t.width + 4
can.save(out)
