# kframes.py <staging group dir> <sprite> <anim> <frames comma> <scale> <out.png>  -- frames side by side on a dark bg
import sys, json
from PIL import Image
d, name, anim, frs, k, out = sys.argv[1:7]
m = json.load(open(d + '/manifest.json'))['sprites'][name]
fw, fh = m['frameW'], m['frameH']
row = m['anims'][anim]['row']
im = Image.open(d + '/' + m['file']).convert('RGBA')
fl = [int(x) for x in frs.split(',')]
k = float(k)
o = Image.new('RGBA', (len(fl) * (fw + 4), fh), (40, 36, 52, 255))
for j, f in enumerate(fl):
    bg = Image.new('RGBA', (fw, fh), (29, 26, 38, 255))
    bg.alpha_composite(im.crop((f * fw, row * fh, (f + 1) * fw, (row + 1) * fh)))
    o.paste(bg, (j * (fw + 4), 0))
o = o.resize((int(o.width * k), int(o.height * k)), Image.NEAREST if k >= 1 else Image.LANCZOS)
o.save(out)
