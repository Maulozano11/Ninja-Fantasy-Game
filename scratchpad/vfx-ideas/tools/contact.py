# Contact sheet of chosen frames of a VFX sprite: python3 -I contact.py <group_dir> <name> <out.png> [scale] [maxframes]
import json, sys
from PIL import Image, ImageDraw
gdir, name, out = sys.argv[1], sys.argv[2], sys.argv[3]
scale = float(sys.argv[4]) if len(sys.argv) > 4 else 1
maxf = int(sys.argv[5]) if len(sys.argv) > 5 else 99
m = json.load(open(f'{gdir}/manifest.json'))
sp = m['sprites']
s = sp[name] if isinstance(sp, dict) else next(x for x in sp if x.get('name') == name)
img = Image.open(f'{gdir}/{s.get("file", name + ".png")}').convert('RGBA')
fw, fh = s['frameW'], s['frameH']
rows = []
for an, a in s['anims'].items():
    n = a['frames']
    idx = list(range(n)) if n <= maxf else [round(i * (n - 1) / (maxf - 1)) for i in range(maxf)]
    rows.append((an, a['row'], idx))
W = int(fw * scale); H = int(fh * scale)
cols = max(len(r[2]) for r in rows)
sheet = Image.new('RGBA', (cols * (W + 4) + 4, len(rows) * (H + 18) + 4), (40, 44, 52, 255))
d = ImageDraw.Draw(sheet)
for ri, (an, row, idx) in enumerate(rows):
    y = 4 + ri * (H + 18)
    d.text((4, y), f'{name}/{an}', fill=(255, 255, 200, 255))
    for ci, f in enumerate(idx):
        fr = img.crop((f * fw, row * fh, f * fw + fw, row * fh + fh))
        if scale != 1: fr = fr.resize((W, H), Image.NEAREST)
        x = 4 + ci * (W + 4)
        bg = Image.new('RGBA', (W, H), (70, 78, 90, 255)); bg.alpha_composite(fr)
        sheet.paste(bg, (x, y + 14))
sheet.save(out)
print(out, sheet.size)
