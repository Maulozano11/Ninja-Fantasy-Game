# One row per element: frame of each basic sheet. python3 -I elements.py <world_dir> <out.png>
import json, sys
from PIL import Image, ImageDraw
W = sys.argv[1]; out = sys.argv[2]
els = 'fire water wind lightning earth genjutsu chakra poison'.split()
names = ['bolt', 'stream', 'stream_head', 'breath', 'sphere', 'slash', 'multi', 'multi_hit', 'hit', 'blast', 'aura_back', 'aura']
CW, CH = 150, 150
sheet = Image.new('RGBA', (90 + len(names) * (CW + 4), 20 + len(els) * (CH + 4)), (30, 32, 38, 255))
d = ImageDraw.Draw(sheet)
for j, n in enumerate(names): d.text((90 + j * (CW + 4), 4), n, fill=(255, 240, 200, 255))
for i, el in enumerate(els):
    m = json.load(open(f'{W}/vfx_{el}/manifest.json'))['sprites']
    y = 20 + i * (CH + 4)
    d.text((4, y + 60), el, fill=(255, 240, 200, 255))
    for j, n in enumerate(names):
        x = 90 + j * (CW + 4)
        bg = Image.new('RGBA', (CW, CH), (70, 78, 90, 255))
        if n in m:
            s = m[n]; a = next(iter(s['anims'].values()))
            f = a['frames'] // 2
            img = Image.open(f'{W}/vfx_{el}/{s["file"]}').convert('RGBA')
            fr = img.crop((f * s['frameW'], a['row'] * s['frameH'], (f + 1) * s['frameW'], (a['row'] + 1) * s['frameH']))
            k = min(CW / fr.width, CH / fr.height, 1.5)
            fr = fr.resize((max(1, int(fr.width * k)), max(1, int(fr.height * k))), Image.NEAREST)
            bg.alpha_composite(fr, ((CW - fr.width) // 2, (CH - fr.height) // 2))
        else:
            ImageDraw.Draw(bg).text((40, 70), '(no hay)', fill=(200, 120, 120, 255))
        sheet.paste(bg, (x, y))
sheet.save(out); print(out, sheet.size)
