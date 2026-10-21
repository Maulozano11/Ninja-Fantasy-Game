"""His reference beside our frames at the same body height (head top to soles).
usage: python3 -I compare.py <ref.jpg> <out.png> <label> <png> [<png> ...]
Each png is a full 256x256 sprite frame; its manifest (same dir) gives the head centre.
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

ref_path, out, label = sys.argv[1], sys.argv[2], sys.argv[3]
pngs = sys.argv[4:]
FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 16)
H = 520  # body height on the sheet (head top to soles)
# his figure: hair top 62, soles 235 (measured on the 256 px picture)
REF_TOP, REF_SOLE = 62, 235
ref = Image.open(ref_path).convert('RGBA')
k = H / (REF_SOLE - REF_TOP)
refs = ref.resize((round(ref.width * k), round(ref.height * k)), Image.LANCZOS)
cells = [(refs, round(REF_SOLE * k), 'Referencia del dueño')]
for p in pngs:
    im = Image.open(p).convert('RGBA')
    man = json.load(open(os.path.join(os.path.dirname(p), 'manifest.json')))
    m = next(x for x in man if x['file'] == os.path.basename(p))
    a = im.getchannel('A')
    bbox = im.getbbox()
    sole = bbox[3]
    # hair top: highest opaque pixel within 9 px of the head centre column
    hx = round(m['head']['x'] * 2)
    top = None
    for y in range(256):
        if any(a.getpixel((x, y)) for x in range(max(0, hx - 9), min(256, hx + 10))):
            top = y
            break
    kk = H / (sole - top)
    big = im.crop(bbox).resize((round((bbox[2] - bbox[0]) * kk), round((bbox[3] - bbox[1]) * kk)), Image.NEAREST)
    cells.append((big, round((sole - bbox[1]) * kk), f"{label} f{m['frame']}"))
pad = 40
W = sum(c[0].width for c in cells) + pad * (len(cells) + 1)
base = max(c[1] for c in cells) + 60
Hh = base + max(c[0].height - c[1] for c in cells) + 30
sheet = Image.new('RGBA', (W, Hh), (14, 16, 24, 255))
d = ImageDraw.Draw(sheet)
x = pad
for im, sole, cap in cells:
    sheet.alpha_composite(im, (x, base - sole))
    d.text((x, 10), cap, font=FONT, fill=(240, 220, 170, 255))
    x += im.width + pad
d.line([(0, base), (W, base)], fill=(70, 70, 90, 255))
d.line([(0, base - H), (W, base - H)], fill=(70, 70, 90, 255))
sheet.convert('RGB').save(out)
print(out, sheet.size)
