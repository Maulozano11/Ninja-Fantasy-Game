"""view.py <groupdir> <sprite> <anim> <frames e.g. 0,1,2> <out.png> [scale] [bg: dark|grass|parch|all] [crop x0,y0,x1,y1] [cols]"""
import json, os, sys
from PIL import Image
G, name, anim, frs, out = sys.argv[1:6]
k = int(sys.argv[6]) if len(sys.argv) > 6 else 2
bgs = sys.argv[7] if len(sys.argv) > 7 else 'dark'
crop = tuple(int(v) for v in sys.argv[8].split(',')) if len(sys.argv) > 8 and sys.argv[8] != '-' else None
cols = int(sys.argv[9]) if len(sys.argv) > 9 else 0
BG = {'dark': (31, 33, 46), 'grass': (84, 110, 70), 'parch': (214, 196, 160), 'black': (0, 0, 0)}
bgl = list(BG) if bgs == 'all' else bgs.split('+')
m = json.load(open(os.path.join(G, 'manifest.json')))['sprites'][name]
sh = Image.open(os.path.join(G, m['file'])).convert('RGBA')
a = m['anims'][anim]
idx = [int(v) for v in frs.split(',')] if frs != 'all' else list(range(a['frames']))
fw, fh = m['frameW'], m['frameH']
cw, ch = (crop[2] - crop[0], crop[3] - crop[1]) if crop else (fw, fh)
ncol = cols or len(idx)
nrow = (len(idx) + ncol - 1) // ncol
can = Image.new('RGBA', ((cw + 2) * ncol, (ch + 2) * nrow * len(bgl)), (0, 0, 0, 255))
for b, bg in enumerate(bgl):
    for j, i in enumerate(idx):
        f = sh.crop((i * fw, a['row'] * fh, (i + 1) * fw, (a['row'] + 1) * fh))
        if crop: f = f.crop(crop)
        t = Image.new('RGBA', f.size, BG[bg] + (255,)); t.alpha_composite(f)
        r, c = j // ncol, j % ncol
        can.alpha_composite(t, (c * (cw + 2), (b * nrow + r) * (ch + 2)))
can.resize((can.width * k, can.height * k), Image.NEAREST).save(out)
print(out, can.width * k, can.height * k)
