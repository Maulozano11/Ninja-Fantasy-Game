"""Review sheet and GIF for the owner's water drake (staging/vfx_beasts_waterdragon/water).

    python3 -I beasts-waterdragon-v3.py     (paths relative to this file)

His two BEAST pictures (REF-water-set-owner.jpg) at the game scale on our anchor next to our key
frames 0 and 5, every frame of the loop, and the dragon next to our character for scale. Files are
written to a temp name and renamed.
"""
import json
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
K = 3
BG = (0x5D, 0x6B, 0x57, 255)
SHEET = (0x2A, 0x2E, 0x36, 255)
GROUND = (0x4A, 0x5A, 0x3C, 255)
INK = (0xE8, 0xE0, 0xC0, 255)
FONT = ImageFont.load_default(size=22)
SMALL = ImageFont.load_default(size=18)


def save_whole(img, name, **kw):
    path = os.path.join(HERE, name)
    tmp = path + '.part'
    img.save(tmp, **kw)
    os.replace(tmp, path)


meta = json.load(open(os.path.join(HERE, 'staging', 'vfx_beasts_waterdragon', 'manifest.json')))['sprites']['water']
sheet = Image.open(os.path.join(HERE, 'staging', 'vfx_beasts_waterdragon', meta['file'])).convert('RGBA')
fw, fh = meta['frameW'], meta['frameH']
fly = [sheet.crop((i * fw, 0, (i + 1) * fw, fh)) for i in range(meta['anims']['fly']['frames'])]
info = json.load(open(os.path.join(HERE, 'beasts-ref-water2.json')))
ref = Image.open(os.path.join(HERE, 'REF-water-set-owner.jpg')).convert('RGBA')


def panel(f, bg=BG):
    c = Image.new('RGBA', f.size, bg)
    c.alpha_composite(f)
    return c.resize((f.width * K, f.height * K), Image.NEAREST)


def his(name, cell):
    """One of his two pictures at the game scale (x K), placed so his anchor sits on ours."""
    x0, y0, x1, y1 = info['panel']
    if name == 'stride':
        x1 = info['split']
    else:
        x0 = info['split']
    s = info['scale'] * K
    crop = ref.crop((x0, y0, x1, y1)).resize((round((x1 - x0) * s), round((y1 - y0) * s)), Image.LANCZOS)
    c = Image.new('RGBA', cell, (0x1E, 0x1E, 0x28, 255))
    ax, ay = info['keys'][name]['anchor']
    c.paste(crop, (round(meta['anchor'][0] * K - (ax - x0) * s), round(meta['anchor'][1] * K - (ay - y0) * s)))
    return c


cell = (fw * K, fh * K)
cols = 4
W = 40 + cols * (cell[0] + 8)
out = Image.new('RGBA', (W, 4000), SHEET)
d = ImageDraw.Draw(out)
y = 16
d.text((20, y), f"Water dragon from the owner's WATER SET BEAST panel (vfx_beasts_waterdragon / water): {fw}x{fh}, anchor {meta['anchor']}, fly {len(fly)}@{meta['anims']['fly']['fps']} loop", font=FONT, fill=INK)
y += 40
d.text((20, y), 'His two pictures (left of each pair, at the game scale, on our anchor) and our key frames 0 and 5, x3', font=FONT, fill=INK)
y += 32
for col, (name, k) in enumerate((('stride', 0), ('leap', 5))):
    x = 20 + col * (2 * cell[0] + 24)
    out.paste(his(name, cell), (x, y))
    d.text((x + 6, y + 4), f'his {"left (striding)" if name == "stride" else "right (leaping)"}', font=SMALL, fill=INK)
    out.paste(panel(fly[k]), (x + cell[0] + 8, y))
    d.text((x + cell[0] + 14, y + 4), f'ours, frame {k}', font=SMALL, fill=INK)
y += cell[1] + 24
d.text((20, y), 'The loop: 0 = his striding picture, 5 = his leaping picture; 1-2 and 7 are cut from the striding one, 3-4 and 6 from the leaping one', font=FONT, fill=INK)
y += 32
for i, f in enumerate(fly):
    x = 20 + (i % cols) * (cell[0] + 8)
    yy = y + (i // cols) * (cell[1] + 8)
    out.paste(panel(f), (x, yy))
    d.text((x + 6, yy + 4), str(i) + (' (his)' if i in (0, 5) else ''), font=SMALL, fill=INK)
y += ((len(fly) + cols - 1) // cols) * (cell[1] + 8) + 16
d.text((20, y), 'Scale: our character and the dragon (frames 0 and 5) at flight height', font=FONT, fill=INK)
y += 32
char = Image.open(os.path.join(HERE, 'beasts-character.png')).convert('RGBA')
feet, lift = (64, 120), 64
above = max(feet[1] + 6, lift + meta['anchor'][1] + 6)
h = (above + 14) * K
out.paste(Image.new('RGBA', (W - 40, h), BG), (20, y))
gy = y + above * K
out.paste(Image.new('RGBA', (W - 40, 14 * K), GROUND), (20, gy))
out.alpha_composite(char.resize((char.width * K, char.height * K), Image.NEAREST), (20 + 8 * K, gy - feet[1] * K))
x = 20 + (8 + 128 + 10) * K
for f in (fly[0], fly[5]):
    out.alpha_composite(f.resize((fw * K, fh * K), Image.NEAREST), (x, gy - (lift + meta['anchor'][1]) * K))
    x += (fw + 12) * K
y += h + 20
save_whole(out.crop((0, 0, W, y)), 'beasts-waterdragon-v3.png', format='PNG')

seq = []
for f in fly:
    c = Image.new('RGBA', f.size, BG)
    c.alpha_composite(f)
    seq.append(c.resize((fw * K, fh * K), Image.NEAREST).convert('RGB'))
pal = seq[0].quantize(colors=255, method=Image.Quantize.MEDIANCUT)
q = [s.quantize(palette=pal, dither=Image.Dither.NONE) for s in seq]
dur = round(1000 / meta['anims']['fly']['fps'])
save_whole(q[0], 'beasts-waterdragon-v3.gif', format='GIF', save_all=True, append_images=q[1:], duration=[dur] * len(q), loop=0, disposal=1, optimize=False)
print('ok', W, y)
