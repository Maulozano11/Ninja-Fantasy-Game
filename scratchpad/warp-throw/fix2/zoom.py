# python3 -I zoom.py out.png title scale "name:x0,y0,x1,y1:label" ... -- t1 t2 ...  (box in capture pixels)
import json, sys
from PIL import Image, ImageDraw, ImageFont

CAP = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/warp-throw/fix2/cap'
args = sys.argv[1:]
out, title, k = args[0], args[1], int(args[2])
i = args.index('--')
rows = [a.split(':', 2) for a in args[3:i]]
times = [int(t) for t in args[i + 1:]]
BIG = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 24)
MID = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 20)
tiles = []
for name, box, label in rows:
    meta = json.load(open(f'{CAP}/{name}/meta.json'))
    step = meta['step']
    b = tuple(int(v) for v in box.split(','))
    ims = []
    for t in times:
        f = t // step
        im = Image.open(f'{CAP}/{name}/f{f:03d}.png').convert('RGB').crop(b)
        ims.append((t, im.resize((im.width * k, im.height * k), Image.NEAREST)))
    tiles.append((label, ims))
tw = max(im.width for _, ims in tiles for _, im in ims)
th = max(im.height for _, ims in tiles for _, im in ims)
gap, lab, head, rowlab = 6, 26, 46, 32
W = len(times) * tw + (len(times) + 1) * gap
H = head + len(rows) * (rowlab + lab + th + gap) + gap
sheet = Image.new('RGB', (W, H), (14, 16, 24))
d = ImageDraw.Draw(sheet)
d.text((12, 10), title, font=BIG, fill=(226, 236, 255))
for r, (label, ims) in enumerate(tiles):
    y0 = head + r * (rowlab + lab + th + gap)
    d.text((gap + 4, y0 + 4), label, font=BIG, fill=(255, 226, 150))
    for c, (t, im) in enumerate(ims):
        x0 = gap + c * (tw + gap)
        d.text((x0 + 4, y0 + rowlab + 2), f'{t} ms', font=MID, fill=(180, 200, 255))
        sheet.paste(im, (x0, y0 + rowlab + lab))
sheet.save(out, optimize=True)
print(out, sheet.size)
