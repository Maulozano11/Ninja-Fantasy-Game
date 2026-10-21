"""Frames of a sprite's row in a grid. usage: strip.py <art2> <out> <sprite> <row> <k> <cols> <bg> [frames] [x0 y0 x1 y1]"""
import json, os, sys
from PIL import Image, ImageDraw
A, OUTP, name, row, k, cols, bg = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6]), sys.argv[7]
G = os.path.join(A, 'staging/vfx_earth_v3')
M = json.load(open(os.path.join(G, 'manifest.json')))['sprites']
m = M[name]
W, H = m['frameW'], m['frameH']
sheet = Image.open(os.path.join(G, m['file'])).convert('RGBA')
n = sheet.width // W
frames = [int(v) for v in sys.argv[8].split(',')] if len(sys.argv) > 8 and sys.argv[8] != 'all' else list(range(n))
reg = [int(v) for v in sys.argv[9:13]] if len(sys.argv) > 12 else [0, 0, W, H]
COL = {'bg': (34, 34, 45), 'light': (196, 186, 150), 'grass': (92, 128, 64), 'mag': (255, 0, 255), 'white': (255, 255, 255)}
cw, ch = (reg[2] - reg[0]) * k, (reg[3] - reg[1]) * k
rows = (len(frames) + cols - 1) // cols
out = Image.new('RGB', (cols * (cw + 4), rows * (ch + 14)), (0, 0, 0))
d = ImageDraw.Draw(out)
ax, ay = m['anchor']
for j, f in enumerate(frames):
    fr = sheet.crop((f * W, row * H, (f + 1) * W, (row + 1) * H))
    base = Image.new('RGBA', (W, H), COL[bg] + (255,))
    base.alpha_composite(fr)
    t = base.convert('RGB').crop(reg).resize((cw, ch), Image.NEAREST)
    ox, oy = (j % cols) * (cw + 4), (j // cols) * (ch + 14)
    out.paste(t, (ox, oy + 14))
    d.text((ox + 2, oy + 1), '%s r%d f%d' % (name, row, f), fill=(255, 255, 0))
    cx, cy = ox + (ax - reg[0]) * k + k // 2, oy + 14 + (ay - reg[1]) * k + k // 2
    d.line([(cx - 3, cy), (cx + 3, cy)], fill=(0, 255, 0))
    d.line([(cx, cy - 3), (cx, cy + 3)], fill=(0, 255, 0))
out.save(OUTP)
print(out.size, 'frames in sheet', n, 'rows', sheet.height // H)
