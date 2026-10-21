# usage: strip.py <staging/group> <sprite> <anim> <out.png> [scale] [cols]
import sys, os, json
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
d, name, an, out = sys.argv[1:5]
k = float(sys.argv[5]) if len(sys.argv) > 5 else 1
cols = int(sys.argv[6]) if len(sys.argv) > 6 else 99
s = json.load(open(os.path.join(d, 'manifest.json')))['sprites'][name]
im = Image.open(os.path.join(d, s['file'])).convert('RGBA'); info = s['anims'][an]; fw, fh = s['frameW'], s['frameH']
n = info['frames']; cols = min(cols, n); rows = (n + cols - 1) // cols
c = Image.new('RGB', (cols * (fw + 4), rows * (fh + 4)), (8, 8, 12))
for i in range(n):
    f = im.crop((i * fw, info['row'] * fh, (i + 1) * fw, (info['row'] + 1) * fh))
    g = Image.new('RGBA', f.size, (27, 28, 38, 255)); g.alpha_composite(f)
    c.paste(g.convert('RGB'), ((i % cols) * (fw + 4), (i // cols) * (fh + 4)))
c.resize((round(c.width * k), round(c.height * k)), Image.NEAREST).save(out)
