"""usage: python3 -I sheet.py <rawdir> <out.png> <scale> [--joints] [--keys k1,k2] [--frames 0,1] [--crop x0,y0,x1,y1]"""
import json, sys
from PIL import Image, ImageDraw
raw, out, k = sys.argv[1], sys.argv[2], int(sys.argv[3])
joints = '--joints' in sys.argv
keys = None; frames = None; crop = None
for i, a in enumerate(sys.argv):
    if a == '--keys': keys = sys.argv[i + 1].split(',')
    if a == '--frames': frames = [int(x) for x in sys.argv[i + 1].split(',')]
    if a == '--crop': crop = tuple(int(x) for x in sys.argv[i + 1].split(','))
man = json.load(open(raw + '/manifest.json'))
if keys: man = [m for m in man if m['key'] in keys]
if frames is not None: man = [m for m in man if m['frame'] in frames]
ks = []
for m in man:
    if m['key'] not in ks: ks.append(m['key'])
box = None
for m in man:
    m['img'] = Image.open(raw + '/' + m['file']).convert('RGBA')
    b = m['img'].getbbox()
    if b: box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
box = crop or (box[0] - 2, box[1] - 2, box[2] + 2, box[3] + 2)
cw, ch = (box[2] - box[0]) * k, (box[3] - box[1]) * k
fs = sorted({m['frame'] for m in man})
W = 110 + len(fs) * (cw + 4); H = len(ks) * (ch + 16)
S = Image.new('RGB', (W, H), (25, 25, 30)); d = ImageDraw.Draw(S)
for r, key in enumerate(ks):
    d.text((3, r * (ch + 16) + ch // 2), key, fill=(255, 255, 255))
    for c, f in enumerate(fs):
        m = next((m for m in man if m['key'] == key and m['frame'] == f), None)
        if not m: continue
        im = m['img'].crop(box)
        bg = Image.new('RGBA', im.size, (70, 78, 90, 255)); bg.alpha_composite(im)
        bg = bg.resize((cw, ch), Image.NEAREST)
        x0, y0 = 110 + c * (cw + 4), r * (ch + 16) + 14
        if joints:
            dd = ImageDraw.Draw(bg)
            P = lambda n: ((m[n]['x'] * 2 - box[0]) * k, (m[n]['y'] * 2 - box[1]) * k)
            for a, b, col in [('shoulderN', 'elbowN', (255, 80, 80)), ('elbowN', 'handN', (255, 160, 80)), ('shoulderF', 'elbowF', (80, 255, 80)), ('elbowF', 'handF', (160, 255, 160)), ('pelvis', 'neck', (255, 255, 255)), ('neck', 'head', (200, 200, 255)), ('hipN', 'kneeN', (255, 0, 255)), ('kneeN', 'ankleN', (255, 120, 255)), ('hipF', 'kneeF', (0, 200, 255)), ('kneeF', 'ankleF', (120, 230, 255))]:
                dd.line([P(a), P(b)], fill=col, width=max(1, k // 2))
        S.paste(bg, (x0, y0))
        d.text((x0 + 2, y0 - 13), f"{m['frame']}", fill=(220, 220, 220))
S.save(out)
print(out, S.size)
