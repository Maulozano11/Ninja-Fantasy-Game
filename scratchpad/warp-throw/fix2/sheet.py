# python3 -I sheet.py out.png title "name:side:label" ... -- t1 t2 ...
# side: L (thrower on the left of the clip), R (on the right), F (full width), or x0-x1 fractions.
import json, sys
from PIL import Image, ImageDraw, ImageFont

CAP = '/tmp/claude-0/-home-user-Ninja-Fantasy-Game/686daf18-129b-55df-a0e0-8b5389d0083e/scratchpad/warp-throw/fix2/cap'
args = sys.argv[1:]
out, title = args[0], args[1]
i = args.index('--')
rows = [a.split(':', 2) for a in args[2:i]]
times = [int(t) for t in args[i + 1:]]
BIG = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 26)
MID = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 20)
tiles = []
for name, side, label in rows:
    meta = json.load(open(f'{CAP}/{name}/meta.json'))
    step = meta['step']
    ims = []
    for t in times:
        k = min(meta.get('frames', 10**9), t // step)
        im = Image.open(f'{CAP}/{name}/f{k:03d}.png').convert('RGB')
        w, h = im.size
        if side == 'L':
            box = (0, 0, int(w * 0.5), h)
        elif side == 'R':
            box = (int(w * 0.5), 0, w, h)
        elif side == 'F':
            box = (0, 0, w, h)
        else:
            a, b = (float(x) for x in side.split('-'))
            box = (int(w * a), 0, int(w * b), h)
        ims.append((t, im.crop(box)))
    tiles.append((label, ims))
tw = max(im.width for _, ims in tiles for _, im in ims)
th = max(im.height for _, ims in tiles for _, im in ims)
gap, lab, head, rowlab = 6, 28, 50, 34
W = len(times) * tw + (len(times) + 1) * gap
H = head + len(rows) * (rowlab + lab + th + gap) + gap
sheet = Image.new('RGB', (W, H), (14, 16, 24))
d = ImageDraw.Draw(sheet)
d.text((12, 12), title, font=BIG, fill=(226, 236, 255))
for r, (label, ims) in enumerate(tiles):
    y0 = head + r * (rowlab + lab + th + gap)
    d.text((gap + 4, y0 + 4), label, font=BIG, fill=(255, 226, 150))
    for c, (t, im) in enumerate(ims):
        x0 = gap + c * (tw + gap)
        d.text((x0 + 4, y0 + rowlab + 2), f'{t} ms', font=MID, fill=(180, 200, 255))
        sheet.paste(im, (x0, y0 + rowlab + lab))
sheet.save(out, optimize=True)
print(out, sheet.size)
