import json, sys
from PIL import Image, ImageDraw
v = json.load(open('out/variants.json'))
def img(b, k):
    rows = b['rows']; H = len(rows); W = len(rows[0])
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != '.':
                h = b['colors'].get(ch)
                if h is None:
                    print('missing colour', ch); h = '#ff00ff'
                im.putpixel((x, y), tuple(int(h[i:i+2], 16) for i in (1, 3, 5)) + (255,))
    return im.resize((W * k, H * k), Image.NEAREST)
names = sys.argv[1].split(',')
k = int(sys.argv[2]); cols = int(sys.argv[3]); outp = sys.argv[4]
ims = [img(v[n], k) for n in names]
w = ims[0].width; h = ims[0].height
sheet = Image.new('RGB', (cols * (w + 20), ((len(ims) + cols - 1) // cols) * (h + 30)), (236, 232, 224))
d = ImageDraw.Draw(sheet)
for i, (n, im) in enumerate(zip(names, ims)):
    x = (i % cols) * (w + 20); y = (i // cols) * (h + 30)
    sheet.paste(im, (x, y + 24), im); d.text((x + 4, y + 6), n, fill=(0, 0, 0))
sheet.save(outp)
