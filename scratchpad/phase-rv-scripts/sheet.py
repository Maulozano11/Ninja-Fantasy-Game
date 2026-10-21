import sys, json
from PIL import Image, ImageDraw
d = sys.argv[1]; out = sys.argv[2]; idx = [int(x) for x in sys.argv[3].split(',')]; scale = float(sys.argv[4]) if len(sys.argv) > 4 else 1
crop = tuple(int(v) for v in sys.argv[5].split(',')) if len(sys.argv) > 5 and sys.argv[5] else None
m = json.load(open(f'{d}/meta.json'))
ims = []
for i in idx:
    im = Image.open(f'{d}/f{i:03d}.png').convert('RGB')
    if crop: im = im.crop(crop)
    if scale != 1: im = im.resize((int(im.width*scale), int(im.height*scale)), Image.NEAREST)
    dr = ImageDraw.Draw(im); dr.rectangle([0,0,70,14], fill=(0,0,0)); dr.text((2,1), f'{i*m["step"]} ms', fill=(255,255,255))
    ims.append(im)
cols = int(sys.argv[6]) if len(sys.argv) > 6 else 4
w, h = ims[0].size
rows = (len(ims)+cols-1)//cols
S = Image.new('RGB', (cols*w + (cols-1)*4, rows*h + (rows-1)*4), (20,20,20))
for k, im in enumerate(ims): S.paste(im, ((k%cols)*(w+4), (k//cols)*(h+4)))
S.save(out); print(S.size)
